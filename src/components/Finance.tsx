import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import type { Transaction, Patient } from '../services/db';
import { ConfirmModal } from './ConfirmModal';
import { 
  DollarSign, ArrowUpRight, ArrowDownRight, Plus, Trash2, User, Tag, 
  TrendingUp, Calendar, Sparkles, X, ChevronLeft, ChevronRight, FileDown
} from 'lucide-react';
import { gsapAnimations } from '../utils/gsapAnimations';

export const Finance: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  
  // Totals State
  const [summary, setSummary] = useState({ income: 0, expense: 0, net: 0 });

  // Filter States
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'INCOME' | 'EXPENSE'>('ALL');
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Custom Month Picker dropdown states
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(parseInt(monthFilter.split('-')[0]));

  // Interactive Chart Hover State
  const [hoveredDayIdx, setHoveredDayIdx] = useState<number | null>(null);

  // Chart rise-up animation multiplier
  const [chartMultiplier, setChartMultiplier] = useState(0);

  useEffect(() => {
    setChartMultiplier(0);
    const timer = setTimeout(() => {
      setChartMultiplier(1);
      gsapAnimations.animateBarChart('.finance-bar');
    }, 50);
    return () => clearTimeout(timer);
  }, [monthFilter, transactions]);

  // Form states
  const [showAddForm, setShowAddForm] = useState(false);
  const [type, setType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [patientId, setPatientId] = useState<number | ''>('');
  const [category, setCategory] = useState('Sessão Clínica');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const getMonthName = (dateStr: string) => {
    const [year, month] = dateStr.split('-');
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const monthIdx= parseInt(month || '1') - 1;
    return `${months[monthIdx]} ${year}`;
  };

  // Custom Confirm Modal State
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type?: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    loadTransactions();
    loadPatients();
  }, [monthFilter, typeFilter]);

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'info') => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmState(prev => ({ ...prev, isOpen: false }));
      },
      type
    });
  };

  const loadTransactions = async () => {
    try {
      const currentMonthPattern = `${monthFilter}%`;
      let queryStr = 'SELECT * FROM finance WHERE date LIKE ?';
      const params: any[] = [currentMonthPattern];

      if (typeFilter !== 'ALL') {
        queryStr += ' AND type = ?';
        params.push(typeFilter);
      }

      queryStr += ' ORDER BY date DESC, id DESC';

      const data = await dbService.query<Transaction>(queryStr, params);
      setTransactions(data);

      const allMonthTxs = await dbService.query<Transaction>(
        'SELECT * FROM finance WHERE date LIKE ?',
        [currentMonthPattern]
      );

      let income = 0;
      let expense = 0;
      allMonthTxs.forEach(t => {
        const val = Number(t.amount || 0);
        if (t.type === 'INCOME') {
          income += val;
        } else {
          expense += val;
        }
      });

      setSummary({
        income,
        expense,
        net: income - expense
      });
    } catch (err) {
      console.error('Erro ao buscar lançamentos financeiros:', err);
    }
  };

  const loadPatients = async () => {
    try {
      const data = await dbService.query<Patient>('SELECT id, name FROM patients');
      setPatients(data);
    } catch (err) {
      console.error('Erro ao carregar pacientes no financeiro:', err);
    }
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      alert('Insira um valor maior que zero.');
      return;
    }

    try {
      let resolvedDesc = description;
      
      if (type === 'INCOME' && patientId) {
        const p = patients.find(pat => pat.id === patientId);
        if (p) {
          resolvedDesc = resolvedDesc || `Sessão clínica de ${p.name}`;
        }
      }

      await dbService.execute(
        'INSERT INTO finance (patient_id, type, category, description, amount, date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [patientId || null, type, category, resolvedDesc || category, Number(amount), date, 'CONFIRMED']
      );

      setShowAddForm(false);
      setPatientId('');
      setDescription('');
      setAmount('');
      setCategory(type === 'INCOME' ? 'Sessão Clínica' : 'Aluguel de sala');
      
      loadTransactions();
    } catch (err) {
      console.error('Erro ao salvar transação:', err);
    }
  };

  const handleDeleteTransaction = (id: number) => {
    triggerConfirm(
      'Remover Lançamento Financeiro',
      'Tem certeza de que deseja apagar permanentemente este lançamento do fluxo de caixa?',
      async () => {
        try {
          await dbService.execute('DELETE FROM finance WHERE id = ?', [id]);
          loadTransactions();
        } catch (err) {
          console.error('Erro ao deletar lançamento financeiro:', err);
        }
      },
      'danger'
    );
  };

  const exportToCSV = () => {
    const header = ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor (R$)', 'Status'];
    const rows = transactions.map(t => [
      t.date,
      t.type === 'INCOME' ? 'Receita' : 'Despesa',
      t.category || '',
      t.description || '',
      t.amount.toFixed(2).replace('.', ','),
      t.status || 'CONFIRMED'
    ]);
    const csvContent = [header, ...rows].map(r => r.map(c => `"${c}"`).join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financeiro_${monthFilter}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const monthName = getMonthName(monthFilter);
    const formatMoney = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;    
    const rows = transactions.map(t => `
      <tr style="border-bottom:1pxsolid #eee">
        <td style="padding:6px8px;color:#555;font-size:11px">${t.date}</td>
        <td style="padding:6px8px;font-size:11px;color:${t.type === 'INCOME' ? '#10b981' : '#ef4444'}">${t.type === 'INCOME' ? 'Receita' : 'Despesa'}</td>
        <td style="padding:6px8px;font-size:11px;color:#555">${t.category || '-'}</td>
        <td style="padding:6px8px;font-size:11px;color:#555">${t.description || '-'}</td>
        <td style="padding:6px8px;font-weight:bold;font-size:11px;color:${t.type === 'INCOME' ? '#10b981' : '#ef4444'};text-align:right">${formatMoney(t.amount)}</td>
      </tr>
    `).join('');

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Relatório Financeiro</title>
    <style>body{font-family:Arial,sans-serif;margin:40px;color:#222}h1{font-size:20px;margin-bottom:4px}table{width:100%;border-collapse:collapse;margin-top:16px}th{background:#1a1a2e;color:#e5c158;padding:8px;font-size:10px;text-transform:uppercase;text-align:left}tr:nth-child(even){background:#f9f9f9}.summary{display:flex;gap:32px;margin-top:16px}.summary div{padding:12px20px;border-radius:8px;font-size:13px}.income{background:#d1fae5;color:#065f46}.expense{background:#fee2e2;color:#991b1b}.net{background:#fef3c7;color:#92400e}</style>
    </head><body>
    <h1>Relatório Financeiro Ã¢â‚¬" ${monthName}</h1>
    <p style="color:#888;font-size:11px">Gerado em ${new Date().toLocaleDateString('pt-BR')} à s ${new Date().toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})}</p>
    <div class="summary">
      <div class="income"><strong>Receitas</strong><br>${formatMoney(summary.income)}</div>
      <div class="expense"><strong>Despesas</strong><br>${formatMoney(summary.expense)}</div>
      <div class="net"><strong>Saldo</strong><br>${formatMoney(summary.net)}</div>
    </div>
    <table><thead><tr><th>Data</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th style="text-align:right">Valor</th></tr></thead>
    <tbody>${rows}</tbody></table>
    </body></html>`;

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
  };

  const getChartData = () => {
    const [yearStr, monthStr] = monthFilter.split('-');
    const year = parseInt(yearStr || '2026');
    const month = parseInt(monthStr || '07');
    const totalDays = new Date(year, month, 0).getDate();

    const dailyIncome = Array(totalDays).fill(0);
    const dailyExpense = Array(totalDays).fill(0);

    transactions.forEach(t => {
      const tDate = new Date(t.date + 'T00:00:00');
      if (tDate.getFullYear() === year && (tDate.getMonth() + 1) === month) {
        const day = tDate.getDate();
        if (day >= 1 && day <= totalDays) {
          if (t.type === 'INCOME') {
            dailyIncome[day - 1] += t.amount;
          } else {
            dailyExpense[day - 1] += t.amount;
          }
        }
      }
    });

    return {
      days: Array.from({ length: totalDays }, (_, i) => i + 1),
      income: dailyIncome,
      expense: dailyExpense
    };
  };

  const chartData = getChartData();
  const maxIncome = Math.max(...chartData.income, 10);
  const maxExpense = Math.max(...chartData.expense, 10);
  const maxVal = Math.max(maxIncome, maxExpense);
  const totalDays = chartData.days.length;

  // Gerar caminhos das linhas e áreas do gráfico SVG
  let incomePoints = '';
  let incomeAreaPoints = '';
  let expensePoints = '';
  let expenseAreaPoints = '';

  chartData.days.forEach((_, i) => {
    const x= (i / (totalDays - 1)) * 450 + 25;
    const incomeY = 160 - (chartData.income[i] / maxVal) * 120 * chartMultiplier;
    const expenseY = 160 - (chartData.expense[i] / maxVal) * 120 * chartMultiplier;

    if (i === 0) {
      incomePoints = `M ${x} ${incomeY}`;
      incomeAreaPoints = `M ${x} 160 L ${x} ${incomeY}`;
      expensePoints = `M ${x} ${expenseY}`;
      expenseAreaPoints = `M ${x} 160 L ${x} ${expenseY}`;
    } else {
      incomePoints += ` L ${x} ${incomeY}`;
      incomeAreaPoints += ` L ${x} ${incomeY}`;
      expensePoints += ` L ${x} ${expenseY}`;
      expenseAreaPoints += ` L ${x} ${expenseY}`;
    }

    if (i === totalDays - 1) {
      incomeAreaPoints += ` L ${x} 160 Z`;
      expenseAreaPoints += ` L ${x} 160 Z`;
    }
  });

  return (
    <div className="space-y-5 animate-fadeIn pb-10">
      {/* Custom Confirm Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        type={confirmState.type}
      />

      {/* ── 4 METRIC CARDS ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

        {/* Receitas */}
        <div className="bg-white dark:bg-[#0d2020] border border-teal-100 dark:border-teal-800/50 rounded-2xl p-5 relative overflow-hidden group hover:border-emerald-400/40 dark:hover:border-emerald-500/30 transition-all duration-300 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/60 to-transparent dark:from-emerald-900/10 dark:to-transparent pointer-events-none" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[9px] font-black text-teal-500 dark:text-teal-400 uppercase tracking-widest mb-2">Receitas</p>
              <p className="text-2xl font-black text-teal-900 dark:text-white font-sans tabular-nums">
                R$&nbsp;{summary.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mt-2 flex items-center gap-1">
                <ArrowUpRight className="h-3 w-3" /> entradas do período
              </p>
            </div>
            <div className="w-10 h-10 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Despesas */}
        <div className="bg-white dark:bg-[#0d2020] border border-teal-100 dark:border-teal-800/50 rounded-2xl p-5 relative overflow-hidden group hover:border-red-400/40 dark:hover:border-red-500/30 transition-all duration-300 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-red-50/60 to-transparent dark:from-red-900/10 dark:to-transparent pointer-events-none" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[9px] font-black text-teal-500 dark:text-teal-400 uppercase tracking-widest mb-2">Despesas</p>
              <p className="text-2xl font-black text-teal-900 dark:text-white font-sans tabular-nums">
                R$&nbsp;{summary.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className="text-[9px] text-red-500 dark:text-red-400 font-bold mt-2 flex items-center gap-1">
                <ArrowDownRight className="h-3 w-3" /> saídas do período
              </p>
            </div>
            <div className="w-10 h-10 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
              <ArrowDownRight className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Saldo */}
        <div className="bg-white dark:bg-[#0d2020] border border-teal-100 dark:border-teal-800/50 rounded-2xl p-5 relative overflow-hidden group transition-all duration-300 shadow-sm">
          <div className={`absolute inset-0 pointer-events-none bg-gradient-to-br ${summary.net >= 0 ? 'from-teal-50/60 dark:from-teal-900/10' : 'from-red-50/60 dark:from-red-900/10'} to-transparent`} />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[9px] font-black text-teal-500 dark:text-teal-400 uppercase tracking-widest mb-2">Saldo do Período</p>
              <p className={`text-2xl font-black font-sans tabular-nums ${summary.net >= 0 ? 'text-teal-600 dark:text-teal-300' : 'text-red-500 dark:text-red-400'}`}>
                R$&nbsp;{summary.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
              <p className={`text-[9px] font-bold mt-2 ${summary.net >= 0 ? 'text-teal-500 dark:text-teal-400' : 'text-red-400'}`}>
                {summary.net >= 0 ? 'resultado positivo ✓' : 'resultado negativo'}
              </p>
            </div>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 border ${summary.net >= 0 ? 'bg-teal-500/10 border-teal-500/20 text-teal-500 dark:text-teal-400' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* Novo Lançamento — card clicável */}
        <div
          onClick={() => {
            setType('INCOME');
            setCategory('Sessão Clínica');
            setAmount('');
            setDescription('');
            setShowAddForm(true);
          }}
          className="bg-white dark:bg-[#0d2020] border border-teal-200 dark:border-teal-700/60 rounded-2xl p-5 relative overflow-hidden group hover:border-teal-400 dark:hover:border-teal-500 hover:shadow-md transition-all duration-300 shadow-sm cursor-pointer"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-teal-50/80 to-transparent dark:from-teal-800/10 dark:to-transparent pointer-events-none group-hover:from-teal-100/60 dark:group-hover:from-teal-700/15 transition-all duration-300" />
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-[9px] font-black text-teal-500 dark:text-teal-400 uppercase tracking-widest mb-2">Novo Lançamento</p>
              <p className="text-base font-black text-teal-700 dark:text-teal-200 leading-snug">
                Registrar<br />entrada ou saída
              </p>
              <p className="text-[9px] text-teal-400 dark:text-teal-500 font-bold mt-2 flex items-center gap-1 group-hover:text-teal-600 dark:group-hover:text-teal-300 transition-colors">
                <Plus className="h-3 w-3" /> clique para adicionar
              </p>
            </div>
            <div className="w-10 h-10 bg-teal-600/10 border border-teal-500/25 text-teal-600 dark:text-teal-400 rounded-xl flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-teal-600/20 group-hover:border-teal-500/50 transition-all">
              <Plus className="h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
            </div>
          </div>
        </div>
      </div>

      {/* ── BAR CHART + MONTH PICKER ────────────────────────────── */}
      <div className="bg-white dark:bg-[#0d2020] border border-teal-100 dark:border-teal-800/50 rounded-2xl shadow-sm overflow-hidden">
        {/* Chart Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-teal-100 dark:border-teal-800/50">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-teal-500 dark:text-teal-400" />
            <span className="text-[10px] font-black text-teal-800 dark:text-white uppercase tracking-widest">Fluxo Diário</span>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" /> Receitas
            </span>
            <span className="flex items-center gap-1.5 text-[9px] font-black text-red-500 dark:text-red-400 uppercase tracking-wider">
              <span className="w-2.5 h-2.5 rounded-sm bg-red-500 inline-block" /> Despesas
            </span>

            {/* Month Picker */}
            <div className="relative select-none z-30">
              <div
                onClick={() => {
                  setPickerYear(parseInt(monthFilter.split('-')[0]));
                  setShowMonthPicker(!showMonthPicker);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-teal-200 dark:border-teal-700/60 bg-teal-50 dark:bg-teal-900/30 cursor-pointer hover:border-teal-400 dark:hover:border-teal-500 transition-colors text-[9px] font-black text-teal-700 dark:text-teal-300 uppercase tracking-wider"
              >
                <Calendar className="h-3 w-3" />
                <span>{getMonthName(monthFilter)}</span>
                {monthFilter === new Date().toISOString().slice(0, 7) && (
                  <span className="px-1 py-0.5 bg-emerald-500/15 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 text-[7.5px] font-black rounded">
                    Atual
                  </span>
                )}
              </div>

              {showMonthPicker && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowMonthPicker(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-[#0c1a1a] border border-teal-200 dark:border-teal-800/60 rounded-2xl p-3 shadow-2xl z-40 animate-fadeIn">
                    <div className="flex items-center justify-between border-b border-teal-100 dark:border-teal-800/50 pb-2 mb-2">
                      <button type="button" onClick={(e) => { e.stopPropagation(); setPickerYear(prev => prev - 1); }} className="p-1 hover:bg-teal-100 dark:hover:bg-teal-800/40 rounded-lg text-teal-600 dark:text-teal-300 transition-colors">
                        <ChevronLeft className="h-3.5 w-3.5" />
                      </button>
                      <span className="font-black text-teal-900 dark:text-white text-[10px] tracking-wider">{pickerYear}</span>
                      <button type="button" onClick={(e) => { e.stopPropagation(); setPickerYear(prev => prev + 1); }} className="p-1 hover:bg-teal-100 dark:hover:bg-teal-800/40 rounded-lg text-teal-600 dark:text-teal-300 transition-colors">
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].map((m, idx) => {
                        const monthStr = String(idx + 1).padStart(2, '0');
                        const isSelected = monthFilter === `${pickerYear}-${monthStr}`;
                        const isCurrent = new Date().toISOString().slice(0, 7) === `${pickerYear}-${monthStr}`;
                        return (
                          <button
                            key={m} type="button"
                            onClick={(e) => { e.stopPropagation(); setMonthFilter(`${pickerYear}-${monthStr}`); setShowMonthPicker(false); }}
                            className={`py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg border transition-all ${
                              isSelected
                                ? 'bg-teal-600 text-white border-teal-600 shadow-sm'
                                : isCurrent
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-teal-50/50 dark:bg-teal-900/20 border-teal-200 dark:border-teal-800/50 text-teal-700 dark:text-teal-300 hover:border-teal-400'
                            }`}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div className="px-5 pb-4 pt-3">
          <div className="relative w-full min-h-[200px] flex flex-col justify-between">
            {/* Grid lines */}
            <div className="absolute inset-x-0 top-0 h-[160px] flex flex-col justify-between pointer-events-none">
              {[0,1,2,3].map(i => (
                <div key={i} className="border-b border-dashed border-teal-200/60 dark:border-teal-800/40 w-full" />
              ))}
            </div>

            {/* Bars */}
            <div className="flex items-end justify-between gap-0.5 px-1 h-[160px] relative z-10">
              {chartData.days.map((day, idx) => {
                const incVal = chartData.income[idx];
                const expVal = chartData.expense[idx];
                const incHeight = maxVal > 0 ? (incVal / maxVal) * 100 : 0;
                const expHeight = maxVal > 0 ? (expVal / maxVal) * 100 : 0;
                return (
                  <div
                    key={day}
                    className="flex-1 flex flex-col items-center justify-end h-full relative group/day cursor-pointer"
                    onMouseEnter={() => setHoveredDayIdx(idx)}
                    onMouseLeave={() => setHoveredDayIdx(null)}
                  >
                    <div className="absolute -inset-x-0.5 inset-y-0 bg-teal-100/40 dark:bg-teal-800/20 rounded opacity-0 group-hover/day:opacity-100 transition-all duration-150" />
                    <div className="flex items-end gap-0.5 w-full justify-center h-[90%] relative z-10">
                      <div
                        style={{ height: `${Math.max(incVal > 0 ? 6 : 0, incHeight)}%` }}
                        className="finance-bar w-1 sm:w-1.5 bg-emerald-500/70 dark:bg-emerald-500/60 group-hover/day:bg-emerald-500 rounded-t transition-all duration-150"
                      />
                      <div
                        style={{ height: `${Math.max(expVal > 0 ? 6 : 0, expHeight)}%` }}
                        className="finance-bar w-1 sm:w-1.5 bg-red-500/70 dark:bg-red-500/60 group-hover/day:bg-red-500 rounded-t transition-all duration-150"
                      />
                    </div>

                    {/* Tooltip */}
                    {hoveredDayIdx === idx && (
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-teal-950/95 dark:bg-[#071212]/97 border border-teal-700/40 text-white rounded-xl p-3 shadow-2xl z-50 min-w-[148px] animate-fadeIn pointer-events-none">
                        <p className="text-teal-300 text-[8.5px] font-black uppercase tracking-widest text-center border-b border-teal-800/60 pb-1.5 mb-1.5">
                          Dia {day} · {getMonthName(monthFilter)}
                        </p>
                        <div className="space-y-1 text-[9px] font-bold">
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1 text-teal-300"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />Entrada</span>
                            <span className="text-emerald-400 font-black">R$ {incVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="flex items-center gap-1 text-teal-300"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />Saída</span>
                            <span className="text-red-400 font-black">R$ {expVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3 border-t border-teal-800/60 pt-1 mt-1">
                            <span className="text-white">Saldo</span>
                            <span className={`font-black ${incVal - expVal >= 0 ? 'text-teal-300' : 'text-red-400'}`}>
                              R$ {(incVal - expVal).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* X Axis */}
            <div className="flex justify-between px-1 pt-2 border-t border-teal-100 dark:border-teal-800/50 text-[8px] font-black text-teal-400 dark:text-teal-500 uppercase tracking-widest select-none">
              <span>1</span><span>5</span><span>10</span><span>15</span><span>20</span><span>25</span><span>{chartData.days.length}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── TRANSACTION TABLE ──────────────────────────────────── */}
      <div className="bg-white dark:bg-[#0d2020] border border-teal-100 dark:border-teal-800/50 rounded-2xl shadow-sm overflow-hidden">
        {/* Table Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-b border-teal-100 dark:border-teal-800/50">
          <span className="text-[10px] font-black text-teal-800 dark:text-white uppercase tracking-widest">
            Histórico de Lançamentos
          </span>
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-start sm:justify-end">
            {/* Type Filter */}
            <div className="flex gap-0.5 bg-teal-50 dark:bg-teal-900/30 p-0.5 rounded-lg border border-teal-200 dark:border-teal-800/50">
              {(['ALL','INCOME','EXPENSE'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setTypeFilter(f)}
                  className={`px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-wider transition-all ${
                    typeFilter === f
                      ? f === 'ALL'
                        ? 'bg-teal-700 text-white shadow-sm'
                        : f === 'INCOME'
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shadow-sm'
                          : 'bg-red-500/15 text-red-600 dark:text-red-400 shadow-sm'
                      : 'text-teal-500 dark:text-teal-400 hover:text-teal-800 dark:hover:text-white'
                  }`}
                >
                  {f === 'ALL' ? 'Tudo' : f === 'INCOME' ? 'Receitas' : 'Despesas'}
                </button>
              ))}
            </div>

            {/* Export Buttons */}
            <div className="flex gap-0.5 bg-teal-50 dark:bg-teal-900/30 p-0.5 rounded-lg border border-teal-200 dark:border-teal-800/50">
              <button onClick={exportToPDF} className="px-2.5 py-1 text-teal-500 dark:text-teal-400 hover:text-teal-800 dark:hover:text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors">
                <FileDown className="h-3.5 w-3.5" /> PDF
              </button>
              <button onClick={exportToCSV} className="px-2.5 py-1 text-teal-500 dark:text-teal-400 hover:text-teal-800 dark:hover:text-white text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors">
                <FileDown className="h-3.5 w-3.5" /> CSV
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-teal-100 dark:border-teal-800/50 bg-teal-50/60 dark:bg-teal-900/20 text-[9px] font-black text-teal-500 dark:text-teal-400 uppercase tracking-widest">
                <th className="py-3 px-5">Data</th>
                <th className="py-3 px-5">Categoria</th>
                <th className="py-3 px-5">Descrição</th>
                <th className="py-3 px-5">Paciente</th>
                <th className="py-3 px-5 text-right">Valor</th>
                <th className="py-3 px-5 text-center w-16">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-teal-100/70 dark:divide-teal-800/40">
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-teal-400 dark:text-teal-600">
                      <DollarSign className="h-8 w-8 opacity-40" />
                      <p className="text-[10px] font-black uppercase tracking-widest">Nenhum lançamento neste mês</p>
                    </div>
                  </td>
                </tr>
              ) : (
                transactions.map(t => {
                  const patient = patients.find(p => p.id === t.patient_id);
                  return (
                    <tr key={t.id} className="hover:bg-teal-50/40 dark:hover:bg-teal-900/20 transition-colors group">
                      <td className="py-3.5 px-5 text-[10px] font-bold text-teal-700 dark:text-teal-300 font-sans">
                        {new Date(t.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black border uppercase tracking-wider ${
                          t.type === 'INCOME'
                            ? 'bg-emerald-500/8 border-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                            : 'bg-red-500/8 border-red-500/20 text-red-600 dark:text-red-400'
                        }`}>
                          <Tag className="h-2.5 w-2.5" />
                          {t.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-[11px] text-teal-800 dark:text-white font-medium font-sans max-w-[180px] truncate" title={t.description}>
                        {t.description || <span className="text-teal-400 dark:text-teal-600">—</span>}
                      </td>
                      <td className="py-3.5 px-5">
                        {patient ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-teal-100/60 dark:bg-teal-900/40 border border-teal-200 dark:border-teal-700/50 rounded-md text-[9px] font-bold text-teal-700 dark:text-teal-300">
                            <User className="h-3 w-3 shrink-0" />
                            <span className="truncate max-w-[100px]">{patient.name}</span>
                          </span>
                        ) : (
                          <span className="text-teal-300 dark:text-teal-700 text-[10px] font-bold">—</span>
                        )}
                      </td>
                      <td className={`py-3.5 px-5 text-right font-black font-sans text-sm tabular-nums ${
                        t.type === 'INCOME' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'
                      }`}>
                        {t.type === 'INCOME' ? '+' : '−'}&nbsp;R$&nbsp;{t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="py-3.5 px-5 text-center">
                        <button
                          onClick={() => handleDeleteTransaction(t.id)}
                          className="p-1.5 text-teal-300 dark:text-teal-600 hover:text-red-500 hover:bg-red-500/8 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Remover lançamento"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ADD TRANSACTION MODAL ──────────────────────────────── */}
      {showAddForm && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
          <div className="relative z-50 bg-white dark:bg-[#0c1a1a] border border-teal-200 dark:border-teal-700/50 rounded-2xl p-6 shadow-2xl w-full max-w-md text-left animate-fadeIn">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-teal-600/10 border border-teal-500/20 rounded-lg flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-teal-500" />
                </div>
                <h3 className="font-black text-teal-900 dark:text-white text-xs uppercase tracking-widest">Novo Lançamento</h3>
              </div>
              <button onClick={() => setShowAddForm(false)} className="p-1.5 text-teal-400 hover:text-teal-700 dark:hover:text-white hover:bg-teal-100 dark:hover:bg-teal-800/40 rounded-lg transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSaveTransaction} className="space-y-4">
              {/* Type selector */}
              <div>
                <label className="block mb-2 text-[9px] font-black text-teal-500 dark:text-teal-400 uppercase tracking-widest">Direção Financeira</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => { setType('INCOME'); setCategory('Sessão Clínica'); }}
                    className={`py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wide transition-all ${
                      type === 'INCOME'
                        ? 'bg-emerald-500/12 border-emerald-500/35 text-emerald-600 dark:text-emerald-400'
                        : 'bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-700/50 text-teal-600 dark:text-teal-400 hover:border-teal-400'
                    }`}
                  >
                    <ArrowUpRight className="h-3.5 w-3.5 inline mr-1" />Receita (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => { setType('EXPENSE'); setCategory('Aluguel de sala'); }}
                    className={`py-2.5 rounded-xl border text-[10px] font-black uppercase tracking-wide transition-all ${
                      type === 'EXPENSE'
                        ? 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400'
                        : 'bg-teal-50 dark:bg-teal-900/30 border-teal-200 dark:border-teal-700/50 text-teal-600 dark:text-teal-400 hover:border-teal-400'
                    }`}
                  >
                    <ArrowDownRight className="h-3.5 w-3.5 inline mr-1" />Despesa (−)
                  </button>
                </div>
              </div>

              {/* Patient (income only) */}
              {type === 'INCOME' && (
                <div>
                  <label className="block mb-1.5 text-[9px] font-black text-teal-500 dark:text-teal-400 uppercase tracking-widest">Paciente Relacionado</label>
                  <select
                    value={patientId}
                    onChange={(e) => setPatientId(e.target.value ? Number(e.target.value) : '')}
                    className="w-full glass-input rounded-xl py-2.5 px-4 text-teal-900 dark:text-white text-sm outline-none font-sans font-medium"
                  >
                    <option value="">— Geral / Sem vínculo —</option>
                    {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1.5 text-[9px] font-black text-teal-500 dark:text-teal-400 uppercase tracking-widest">Categoria</label>
                  {type === 'INCOME' ? (
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full glass-input rounded-xl py-2.5 px-4 text-teal-900 dark:text-white text-sm outline-none font-sans font-medium">
                      <option>Sessão Clínica</option>
                      <option>Laudos e Relatórios</option>
                      <option>Supervisão</option>
                      <option>Outros</option>
                    </select>
                  ) : (
                    <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full glass-input rounded-xl py-2.5 px-4 text-teal-900 dark:text-white text-sm outline-none font-sans font-medium">
                      <option>Aluguel de sala</option>
                      <option>Materiais e Testes</option>
                      <option>Internet / Telefone</option>
                      <option>Marketing</option>
                      <option>Impostos / CRP</option>
                      <option>Outros</option>
                    </select>
                  )}
                </div>
                <div>
                  <label className="block mb-1.5 text-[9px] font-black text-teal-500 dark:text-teal-400 uppercase tracking-widest">Valor (R$)</label>
                  <input
                    type="number" step="0.01" value={amount}
                    onChange={(e) => setAmount(e.target.value ? Number(e.target.value) : '')}
                    className="w-full glass-input rounded-xl py-2.5 px-4 text-teal-900 dark:text-white text-sm outline-none font-sans font-medium"
                    placeholder="150,00" required
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1.5 text-[9px] font-black text-teal-500 dark:text-teal-400 uppercase tracking-widest">Data</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full glass-input rounded-xl py-2.5 px-4 text-teal-900 dark:text-white text-sm outline-none font-sans font-medium" required />
              </div>

              <div>
                <label className="block mb-1.5 text-[9px] font-black text-teal-500 dark:text-teal-400 uppercase tracking-widest">Descrição</label>
                <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="w-full glass-input rounded-xl py-2.5 px-4 text-teal-900 dark:text-white text-sm outline-none font-sans font-medium" placeholder="Ex: Sessão avulsa, pagamento PIX..." />
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-teal-100 dark:border-teal-800/50">
                <button type="button" onClick={() => setShowAddForm(false)} className="px-4 py-2.5 bg-teal-50 dark:bg-teal-900/30 border border-teal-200 dark:border-teal-700/50 text-teal-600 dark:text-teal-400 hover:text-teal-900 dark:hover:text-white rounded-xl text-[10px] font-black uppercase tracking-wide transition-all">
                  Cancelar
                </button>
                <button type="submit" className="uiverse-btn-gold px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wide">
                  Confirmar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
