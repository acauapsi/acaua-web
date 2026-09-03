import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import type { Appointment, Patient, Transaction } from '../services/db';
import { Calendar, DollarSign, ArrowUpRight, ArrowDownRight, Gift, Activity, TrendingUp, AlertTriangle } from 'lucide-react';
import { gsapAnimations } from '../utils/gsapAnimations';

interface DashboardProps {
  onNavigate: (tab: string) => void;
  onSelectPatient: (patientId: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, onSelectPatient }) => {
  const [todayAppts, setTodayAppts] = useState<Appointment[]>([]);
  const [financeSummary, setFinanceSummary] = useState({ income: 0, expense: 0, net: 0 });
  const [birthdayPatients, setBirthdayPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  // Advanced States
  const [financialTrend, setFinancialTrend] = useState<{ label: string; key: string; income: number; expense: number; net: number }[]>([]);
  const [sessionDistribution, setSessionDistribution] = useState({ confirmed: 0, pending: 0, cancelled: 0, absent: 0 });
  const [packageAlertPatients, setPackageAlertPatients] = useState<Patient[]>([]);

  // Chart Interactive Tooltip State
  const [activeBarIdx, setActiveBarIdx] = useState<number | null>(null);

  // Mount/Load Count-Up and Draw Animations
  const [animationProgress, setAnimationProgress] = useState(0);

  useEffect(() => {
    if (loading) return;
    setAnimationProgress(0);
    
    // Bar chart smooth height fill without card jumping
    setTimeout(() => {
      gsapAnimations.animateBarChart('.chart-bar');
    }, 50);

    let start = 0;
    const duration = 600; // ms
    const stepTime = 16;
    const steps = duration / stepTime;
    const increment = 100 / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= 100) {
        setAnimationProgress(1);
        clearInterval(timer);
      } else {
        setAnimationProgress(start / 100);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [loading]);

  const loadDashboardData = async () => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      const currentMonthStr = new Date().toISOString().slice(0, 7); // YYYY-MM

      // 1. Consultas de hoje
      const appts = await dbService.query<Appointment>(
        'SELECT * FROM appointments WHERE date = ?',
        [todayStr]
      );
      setTodayAppts(appts);

      // 3. Resumo financeiro do mês corrente
      const monthTxs = await dbService.query<Transaction>('SELECT * FROM finance');
      const currentMonthTxs = monthTxs.filter(t => t.date.startsWith(currentMonthStr));
      
      let income = 0;
      let expense = 0;
      currentMonthTxs.forEach(t => {
        if (t.type === 'INCOME') income += t.amount;
        else expense += t.amount;
      });

      setFinanceSummary({
        income,
        expense,
        net: income - expense
      });

      // 4. Aniversariantes de hoje
      const allPatients = await dbService.query<Patient>('SELECT id, name, birth_date, phone FROM patients');
      const today = new Date();
      const todayDay = today.getDate();
      const todayMonth = today.getMonth() + 1;

      const bdays = allPatients.filter(p => {
        if (!p.birth_date) return false;
        const cleanDate = p.birth_date.replace(/\//g, '-');
        const parts = cleanDate.split('-');
        if (parts.length === 3) {
          if (parts[0].length === 4) {
            return Number(parts[1]) === todayMonth && Number(parts[2]) === todayDay;
          } else {
            return Number(parts[1]) === todayMonth && Number(parts[0]) === todayDay;
          }
        }
        return false;
      });
      setBirthdayPatients(bdays);

      // 5. Tendência Financeira (Últimos 6 meses)
      const monthsBack: { label: string; key: string; income: number; expense: number; net: number }[] = [];
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      
      for (let i = 5; i >= 0; i--) {
        const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const key = `${y}-${m}`;
        const label = `${monthNames[d.getMonth()]}`;

        const monthIncome = monthTxs
          .filter(t => t.date.startsWith(key) && t.type === 'INCOME')
          .reduce((acc, curr) => acc + curr.amount, 0);

        const monthExpense = monthTxs
          .filter(t => t.date.startsWith(key) && t.type === 'EXPENSE')
          .reduce((acc, curr) => acc + curr.amount, 0);

        monthsBack.push({
          label,
          key,
          income: monthIncome,
          expense: monthExpense,
          net: monthIncome - monthExpense
        });
      }
      setFinancialTrend(monthsBack);

      // 6. Distribuição de Sessões do Mês Corrente
      const allMonthAppts = await dbService.query<Appointment>(
        'SELECT * FROM appointments WHERE strftime("%Y-%m", date) = ?',
        [currentMonthStr]
      );
      
      let confirmed = 0;
      let pending = 0;
      let cancelled = 0;
      let absent = 0;

      allMonthAppts.forEach(a => {
        if (a.status === 'CONFIRMED') confirmed++;
        else if (a.status === 'PENDING') pending++;
        else if (a.status === 'CANCELLED') cancelled++;
        else if (a.status === 'ABSENT') absent++;
      });

      setSessionDistribution({ confirmed, pending, cancelled, absent });

      // 7. Alerta de Pacotes Prestes a Vencer (<= 2 sessões restantes)
      const pkgAlerts = allPatients.filter(p => p.billing_model === 'PACOTE' && p.sessions_remaining !== undefined && p.sessions_remaining <= 2);
      setPackageAlertPatients(pkgAlerts);

    } catch (err) {
      console.error('Erro ao carregar Dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const getStatusColor = (status: Appointment['status']) => {
    switch (status) {
      case 'CONFIRMED':
        return 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
      case 'CANCELLED':
        return 'bg-red-500/10 border-red-500/20 text-red-400';
      case 'ABSENT':
        return 'bg-stone-500/10 border-stone-500/20 text-stone-400';
      default:
        return 'bg-amber-500/10 border-amber-500/20 text-amber-400';
    }
  };

  const translateStatus = (status: Appointment['status']) => {
    switch (status) {
      case 'CONFIRMED': return 'Confirmado';
      case 'CANCELLED': return 'Cancelado';
      case 'ABSENT': return 'Falta';
      default: return 'Pendente';
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-teal-400"></div>
          <span className="text-xs font-bold text-teal-700 dark:text-white tracking-wider uppercase">Carregando Indicadores...</span>
        </div>
      </div>
    );
  }

  // Calculate MaxValue for Trend Bars Height Normalization
  const maxFinanceVal = Math.max(
    ...financialTrend.map(m => Math.max(m.income, m.expense)),
    100
  );

  // Calculate Donut Segments
  const totalSessions = sessionDistribution.confirmed + sessionDistribution.pending + sessionDistribution.cancelled + sessionDistribution.absent;
  const segments = [
    { label: 'Confirmadas/Realizadas', value: sessionDistribution.confirmed, color: '#10b981' },
    { label: 'Pendentes', value: sessionDistribution.pending, color: '#f59e0b' },
    { label: 'Faltas', value: sessionDistribution.absent, color: '#78716c' },
    { label: 'Canceladas', value: sessionDistribution.cancelled, color: '#ef4444' }
  ].filter(s => s.value > 0);

  const radius = 54;
  const circumference = 2 * Math.PI * radius; // ~339.3

  return (
    <div className="h-full flex flex-col gap-4 overflow-hidden animate-fadeIn">
      {/* Birthday Alert Notification Banner */}
      {birthdayPatients.length > 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="p-3 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 rounded-xl">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-black text-teal-900 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                Aniversariantes de Hoje! 🎉
              </h4>
              <p className="text-[10px] text-teal-700 dark:text-white mt-0.5 normal-case font-medium leading-relaxed">
                {birthdayPatients.length === 1 
                  ? `Hoje é aniversário de ${birthdayPatients[0].name}. Envie uma mensagem carinhosa!` 
                  : `Hoje é aniversário de ${birthdayPatients.map(p => p.name).join(', ')}. Envie os parabéns!`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            {birthdayPatients.map(p => {
              const bdayMsg = `Olá, ${p.name.split(' ')[0]}! Passando para te desejar um feliz aniversário! Muita saúde, paz, felicidades e realizações no seu novo ciclo. Um grande abraço!`;
              const waLink = `https://web.whatsapp.com/send?phone=${p.phone.replace(/\D/g, '')}&text=${encodeURIComponent(bdayMsg)}`;
              
              return (
                <a
                  key={p.id}
                  href={waLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="uiverse-btn-gold text-white font-black text-[9px] uppercase tracking-wider px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-md"
                >
                  Felicitar {p.name.split(' ')[0]}
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Package Alert Banner */}
      {packageAlertPatients.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex items-start gap-3.5 shrink-0">
          <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-xl shrink-0 mt-0.5">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-[10px] font-black text-teal-900 dark:text-white uppercase tracking-wider">
              Pacotes Expirando
            </h4>
            <p className="text-[9.5px] text-teal-700 dark:text-white mt-0.5 normal-case font-medium mb-2.5">
              {packageAlertPatients.length === 1
                ? 'Há 1 paciente com 2 sessões ou menos restantes.'
                : `Há ${packageAlertPatients.length} pacientes com 2 sessões ou menos restantes.`}
            </p>
            <div className="flex flex-wrap gap-2">
              {packageAlertPatients.map(p => (
                <button
                  key={p.id}
                  onClick={() => onSelectPatient(p.id)}
                  className={`uiverse-btn-glass px-3 py-1.5 text-[8.5px] font-black uppercase tracking-wider transition-all ${
                    p.sessions_remaining === 0
                      ? 'border-red-500/30 text-red-400 hover:bg-red-500/15'
                      : 'border-amber-500/30 text-amber-400 hover:bg-amber-500/15'
                  }`}
                >
                  {p.name.split(' ')[0]} — {p.sessions_remaining} {p.sessions_remaining === 1 ? 'sessão' : 'sessões'}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards Row — Unified Dark Card Background */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
        {/* Income Card */}
        <div 
          onClick={() => onNavigate('financeiro')}
          className="bg-white dark:bg-[#112424] border border-teal-200/50 dark:border-teal-800/60 shadow-sm rounded-2xl p-5 relative overflow-hidden group cursor-pointer transition-all duration-200"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-all duration-350"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[9px] font-black text-teal-700 dark:text-white uppercase tracking-widest mb-1.5">Faturamento (Mês)</p>
              <h3 className="text-xl font-black text-teal-900 dark:text-white font-sans">
                R$ {(financeSummary.income * animationProgress).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2 bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 rounded-xl">
              <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[9.5px] text-teal-700 dark:text-white relative z-10 font-sans">
            <span className="text-emerald-400 font-extrabold uppercase text-[8.5px] tracking-wider">Entradas</span> acumuladas no mês corrente
          </div>
        </div>

        {/* Expenses Card */}
        <div 
          onClick={() => onNavigate('financeiro')}
          className="bg-white dark:bg-[#112424] border border-teal-200/50 dark:border-teal-800/60 shadow-sm rounded-2xl p-5 relative overflow-hidden group cursor-pointer transition-all duration-200"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-red-500/5 rounded-full blur-2xl group-hover:bg-red-500/10 transition-all duration-350"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[9px] font-black text-teal-700 dark:text-white uppercase tracking-widest mb-1.5">Despesas (Mês)</p>
              <h3 className="text-xl font-black text-teal-900 dark:text-white font-sans">
                R$ {(financeSummary.expense * animationProgress).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2 bg-red-500/15 border border-red-500/25 text-red-400 rounded-xl">
              <ArrowDownRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:translate-y-0.5 transition-transform" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[9.5px] text-teal-700 dark:text-white relative z-10 font-sans">
            <span className="text-red-400 font-extrabold uppercase text-[8.5px] tracking-wider">Despesas</span> pagas no mês atual
          </div>
        </div>

        {/* Balance Card */}
        <div 
          onClick={() => onNavigate('financeiro')}
          className="bg-white dark:bg-[#112424] border border-teal-200/50 dark:border-teal-800/60 shadow-sm rounded-2xl p-5 relative overflow-hidden group cursor-pointer transition-all duration-200"
        >
          <div className="absolute top-0 right-0 w-24 h-24 bg-teal-500/8 rounded-full blur-2xl group-hover:bg-teal-500/15 transition-all duration-350"></div>
          <div className="flex justify-between items-start relative z-10">
            <div>
              <p className="text-[9px] font-black text-teal-700 dark:text-white uppercase tracking-widest mb-1.5">Saldo Líquido</p>
              <h3 className={`text-xl font-black font-sans ${(financeSummary.net * animationProgress) >= 0 ? 'text-teal-600 dark:text-white' : 'text-red-400'}`}>
                R$ {(financeSummary.net * animationProgress).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-2 bg-teal-500/15 border border-teal-400/25 text-teal-400 rounded-xl">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[9.5px] text-teal-700 dark:text-white relative z-10 font-sans">
            <span className="text-teal-500 dark:text-teal-300 font-extrabold uppercase text-[8.5px] tracking-wider">Fluxo Líquido</span> consolidado de caixa
          </div>
        </div>
      </div>

      {/* Interactive Charts & Appointments Row */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
        {/* Trend Bar Chart (Cash Flow) */}
        <div 
          onClick={() => onNavigate('financeiro')}
          className="bg-white dark:bg-[#112424] border border-teal-200/50 dark:border-teal-800/60 shadow-sm rounded-2xl p-5 flex flex-col justify-between h-full cursor-pointer hover:border-teal-400/30 transition-all duration-200"
        >
          <div className="flex justify-between items-center mb-4 shrink-0">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="h-5 w-5 text-teal-500 dark:text-teal-300" />
              <h3 className="font-extrabold text-teal-900 dark:text-white text-xs uppercase tracking-wider">Fluxo de Caixa</h3>
            </div>
            <div className="flex gap-2 text-[8px] font-black uppercase tracking-widest text-teal-700 dark:text-white">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span> Rec</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span> Des</span>
            </div>
          </div>

          {/* Chart Columns Area */}
          <div className="flex-1 flex items-end justify-between px-2 gap-4 pb-2 border-b border-teal-200/50 dark:border-teal-800/50 min-h-[140px] relative">
            {financialTrend.map((m, idx) => {
              const incomeHeight = maxFinanceVal > 0 ? (m.income / maxFinanceVal) * 100 * animationProgress : 0;
              const expenseHeight = maxFinanceVal > 0 ? (m.expense / maxFinanceVal) * 100 * animationProgress : 0;

              return (
                <div 
                  key={idx}
                  className="flex-1 flex flex-col items-center h-full justify-end relative group/col"
                  onMouseEnter={() => setActiveBarIdx(idx)}
                  onMouseLeave={() => setActiveBarIdx(null)}
                >
                  {/* Columns Highlight Background */}
                  <div className="absolute -inset-x-2 -inset-y-1 bg-teal-500/5 dark:bg-teal-500/10 rounded-xl opacity-0 group-hover/col:opacity-100 transition-all duration-200"></div>

                  {/* Double Bars Container */}
                  <div className="flex items-end gap-1 w-full justify-center h-[90%] relative z-10">
                    {/* Income Bar (Green) */}
                    <div 
                      style={{ height: `${Math.max(3, incomeHeight)}%` }}
                      className="chart-bar w-2.5 sm:w-3 bg-emerald-500 group-hover/col:bg-emerald-400 rounded-t-sm transition-all duration-200"
                    />
                    {/* Expense Bar (Red) */}
                    <div 
                      style={{ height: `${Math.max(3, expenseHeight)}%` }}
                      className="chart-bar w-2.5 sm:w-3 bg-red-500 group-hover/col:bg-red-400 rounded-t-sm transition-all duration-200"
                    />
                  </div>

                  {/* Month Label */}
                  <span className="text-[8.5px] font-black text-teal-700 dark:text-white mt-2 uppercase tracking-wider relative z-10 select-none">
                    {m.label}
                  </span>

                  {/* Tooltip centered over the column */}
                  {activeBarIdx=== idx&& (
                    <div className="absolute bottom-full mb-3 bg-[#0a1717] border border-teal-400/30 text-white rounded-xl p-3 shadow-2xl z-30 min-w-[145px] transition-all">
                      <div className="space-y-1.5 font-sans text-[10px] font-bold uppercase tracking-wider select-none text-left">
                        <span className="text-teal-400 text-[9px] block tracking-widest font-black mb-1 text-center">{m.label}</span>
                        
                        <p className="flex items-center justify-between gap-6 normal-case text-slate-200">
                          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>Entradas</span>
                          <span className="font-extrabold text-white">R$ {m.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </p>
                        
                        <p className="flex items-center justify-between gap-6 normal-case text-slate-200">
                          <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>Despesas</span>
                          <span className="font-extrabold text-white">R$ {m.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                        </p>
                        
                        <div className="h-px bg-teal-800/80 my-1"></div>
                        
                        <p className="flex items-center justify-between gap-6 normal-case text-white">
                          <span className="flex items-center gap-1.5 font-extrabold">Saldo</span>
                          <span className={`font-black ${m.net >= 0 ? 'text-teal-400' : 'text-red-400'}`}>
                            R$ {m.net.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Sessions Donut Chart */}
        <div 
          onClick={() => onNavigate('agenda')}
          className="bg-white dark:bg-[#112424] border border-teal-200/50 dark:border-teal-800/60 shadow-sm rounded-2xl p-5 flex flex-col justify-between h-full cursor-pointer hover:border-teal-400/30 transition-all duration-200"
        >
          <div className="flex items-center gap-1.5 mb-2 shrink-0">
            <Activity className="h-5 w-5 text-teal-500 dark:text-teal-300" />
            <h3 className="font-extrabold text-teal-900 dark:text-white text-xs uppercase tracking-wider">Sessões do Mês</h3>
          </div>

          {/* STRICT SQUARE CONTAINER TO PREVENT STRETCHING */}
          <div className="relative w-[250px] h-[250px] mx-auto flex items-center justify-center my-2 shrink-0">
            <svg width="100%" height="100%" viewBox="0 0 120 120" className="select-none overflow-visible">
              {/* Background Track Ring */}
              <circle
                cx="60"
                cy="60"
                r={radius}
                fill="transparent"
                stroke="#e7e4dc"
                strokeWidth="8"
                className="dark:stroke-teal-900/60 opacity-60"
              />
              {totalSessions > 0 ? (
                (() => {
                  let accum = 0;
                  return segments.map((seg, idx) => {
                    const percent = seg.value / totalSessions;
                    const strokeLength = percent * circumference * animationProgress;
                    const strokeOffset = circumference - (accum * circumference * animationProgress);
                    accum += percent;
                    return (
                      <circle
                        key={idx}
                        cx="60"
                        cy="60"
                        r={radius}
                        fill="transparent"
                        stroke={seg.color}
                        strokeWidth="8"
                        strokeDasharray={`${strokeLength} ${circumference}`}
                        strokeDashoffset={strokeOffset}
                        transform="rotate(-90 60 60)"
                        className="transition-all duration-300 hover:stroke-[10px] cursor-pointer"
                      >
                        <title>{`${seg.label}: ${seg.value}`}</title>
                      </circle>
                    );
                  });
                })()
              ) : (
                <circle
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="transparent"
                  stroke="#57534e"
                  strokeWidth="8"
                  strokeDasharray={`${circumference} ${circumference}`}
                  transform="rotate(-90 60 60)"
                />
              )}

              {/* Text inside the ring */}
              <text x="60" y="62" textAnchor="middle" className="text-[23px] font-black fill-teal-900 dark:fill-white font-sans leading-none">
                {Math.round(totalSessions * animationProgress)}
              </text>
              <text x="60" y="74" textAnchor="middle" className="text-[7.5px] font-black uppercase tracking-[0.2em] fill-teal-700 dark:fill-white">
                Sessões
              </text>
            </svg>
          </div>

          {/* Legend aligned */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-[9px] font-black uppercase tracking-wider border-t border-teal-200/50 dark:border-teal-800/50 pt-3 shrink-0 text-teal-900 dark:text-white">
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Conf: {sessionDistribution.confirmed}</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Pend: {sessionDistribution.pending}</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-[#78716c]"></span> Falta: {sessionDistribution.absent}</span>
            <span className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-red-500"></span> Canc: {sessionDistribution.cancelled}</span>
          </div>
        </div>

        {/* Today's Appointments (Clean Agenda Cards) */}
        <div 
          onClick={() => onNavigate('tarefas')}
          className="bg-white dark:bg-[#112424] border border-teal-200/50 dark:border-teal-800/60 shadow-sm rounded-2xl p-5 flex flex-col h-full overflow-hidden cursor-pointer hover:border-teal-400/30 transition-all duration-200"
        >
          <div className="flex justify-between items-center mb-3 pb-2 border-b border-teal-200/50 dark:border-teal-800/50 shrink-0">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-5 w-5 text-teal-500 dark:text-teal-300" />
              <h3 className="font-extrabold text-teal-900 dark:text-white text-xs uppercase tracking-wider">Agenda de Hoje</h3>
            </div>
            <span className="bg-teal-500/15 text-teal-600 dark:text-white border border-teal-400/30 px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider">
              {todayAppts.length}
            </span>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3.5 min-h-0">
            {todayAppts.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-teal-700 dark:text-white">
                <Calendar className="h-10 w-10 text-teal-300 dark:text-teal-600 mb-2 opacity-50" />
                <p className="text-sm font-semibold text-teal-900 dark:text-white">Nenhuma consulta hoje.</p>
                <p className="text-xs text-teal-600 dark:text-white mt-1">Sua agenda está livre.</p>
              </div>
            ) :
              todayAppts.map((appt) => (
                <div 
                  key={appt.id} 
                  className="bg-[#fcfbf9]/60 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800/40 hover:border-teal-400/30 rounded-xl p-3 flex justify-between items-center transition-all group cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); appt.patient_id && onSelectPatient(appt.patient_id); }}
                >
                  <div className="space-y-0.5">
                    <span className="text-[9px] text-teal-600 dark:text-teal-300 font-extrabold tracking-widest uppercase">{appt.time} ({appt.duration} min)</span>
                    <h4 className="text-xs font-bold text-teal-950 dark:text-white group-hover:text-teal-500 dark:group-hover:text-teal-300 transition-colors font-sans">{appt.patient_name}</h4>
                  </div>
                  <span className={`text-[8px] border px-2 py-0.5 rounded-lg font-black uppercase tracking-wider ${getStatusColor(appt.status)}`}>
                    {translateStatus(appt.status)}
                  </span>
                </div>
              ))
            }
          </div>
        </div>
      </div>
    </div>
  );
};
