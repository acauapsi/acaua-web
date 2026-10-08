import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import type { Appointment, DailyTask, Patient } from '../services/db';
import { 
  Plus, 
  Trash2, 
  Clock, 
  CheckCircle2, 
  Calendar, 
  MessageSquare, 
  Sparkles, 
  CheckCircle, 
  Star, 
  AlertTriangle,
  ArrowUpRight,
  User,
  DollarSign,
  StickyNote,
  FileText
} from 'lucide-react';

interface UnifiedItem {
  uid: string; // único para chaves React (ex: APPT-1, TASK-4)
  type: 'APPT' | 'TASK';
  id: number;
  title: string;
  time: string;
  date: string;
  done: boolean;
  important: boolean;
  notes?: string;
  phone?: string;
  patient_name?: string;
  patient_id?: number;
}

interface TaskReference {
  target: 'pacientes' | 'financeiro' | 'agenda' | 'notas' | 'documentos';
  label: string;
  patientId?: number;
}

interface DailyTrackerProps {
  onNavigate?: (tab: string) => void;
  onSelectPatient?: (patientId: number) => void;
}

export const DailyTracker: React.FC<DailyTrackerProps> = ({ onNavigate, onSelectPatient }) => {
  const [todayItems, setTodayItems] = useState<UnifiedItem[]>([]);
  const [weekItems, setWeekItems] = useState<UnifiedItem[]>([]);
  const [patientsList, setPatientsList] = useState<Patient[]>([]);
  const [linkedEntity, setLinkedEntity] = useState<string>('');
  
  const [taskTitle, setTaskTitle] = useState('');
  const [taskTime, setTaskTime] = useState('10:00');
  const [taskImportant, setTaskImportant] = useState(false);
  
  const getLocalDateString = (date: Date) => {
    return date.getFullYear() + '-' + 
      String(date.getMonth() + 1).padStart(2, '0') + '-' + 
      String(date.getDate()).padStart(2, '0');
  };

  const today = new Date();
  const todayStr = getLocalDateString(today);

  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = getLocalDateString(tomorrow);

  const endOfWeek = new Date();
  endOfWeek.setDate(today.getDate() + 7);
  const endOfWeekStr = getLocalDateString(endOfWeek);

  const nowObj = new Date();
  const currentHourMin = String(nowObj.getHours()).padStart(2, '0') + ':' + String(nowObj.getMinutes()).padStart(2, '0');

  const [taskDate, setTaskDate] = useState(todayStr);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    type: 'danger' | 'warning' | 'info';
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info'
  });

  const triggerConfirm = (title: string, message: string, onConfirm: () => void, type: 'danger' | 'warning' | 'info' = 'info') => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      onConfirm,
      type
    });
  };

  useEffect(() => {
    loadTrackerData();
  }, []);

  const loadTrackerData = async () => {
    setLoading(true);
    try {
      // 1. Busca todos os dados de forma compatível com o simulador e SQLite real
      const allAppts = await dbService.query<Appointment>('SELECT * FROM appointments');
      const allPatients = await dbService.query<Patient>('SELECT * FROM patients');
      const allTasks = await dbService.query<DailyTask>('SELECT * FROM daily_tasks');

      // Mapeia telefones de pacientes para acesso rápido
      const patientPhoneMap = new Map<number, string>();
      allPatients.forEach(p => {
        if (p.phone) {
          patientPhoneMap.set(p.id, p.phone);
        }
      });

      // 2. Filtra e mapeia consultas/atendimentos
      const mappedAppts: UnifiedItem[] = allAppts.map(a => ({
        uid: `APPT-${a.id}`,
        type: 'APPT',
        id: a.id,
        title: `Atendimento: ${a.patient_name}`,
        time: a.time,
        date: a.date,
        done: a.status === 'CONFIRMED',
        important: false, // atendimentos padrão não recebem flag "importante" do formulário livre, mas podemos tratar visualmente
        notes: a.notes || undefined,
        phone: a.patient_id ? patientPhoneMap.get(a.patient_id) : undefined,
        patient_name: a.patient_name || undefined,
        patient_id: a.patient_id || undefined
      }));

      // 3. Filtra e mapeia tarefas diárias
      const mappedTasks: UnifiedItem[] = allTasks.map(t => ({
        uid: `TASK-${t.id}`,
        type: 'TASK',
        id: t.id,
        title: t.title,
        time: t.time,
        date: t.date,
        done: t.done === 1,
        important: t.important === 1
      }));

      const combined = [...mappedAppts, ...mappedTasks];

      // 4. Separa os itens de Hoje (inclui atrasados que não foram concluídos!)
      const todayFiltered = combined
        .filter(i => i.date === todayStr || (i.date < todayStr && !i.done))
        .sort((a, b) => {
          const aOverdue = (a.date < todayStr || (a.date === todayStr && a.time < currentHourMin)) && !a.done;
          const bOverdue = (b.date < todayStr || (b.date === todayStr && b.time < currentHourMin)) && !b.done;
          if (aOverdue && !bOverdue) return -1;
          if (!aOverdue && bOverdue) return 1;

          // Se ambos forem atrasados ou ambos de hoje, ordena por dia e horário
          const dateComp = a.date.localeCompare(b.date);
          if (dateComp !== 0) return dateComp;
          return a.time.localeCompare(b.time);
        });

      // 5. Separa os itens dos próximos 7 dias (Semana)
      const weekFiltered = combined
        .filter(i => i.date >= tomorrowStr && i.date <= endOfWeekStr)
        .sort((a, b) => {
          const dateComp = a.date.localeCompare(b.date);
          if (dateComp !== 0) return dateComp;
          return a.time.localeCompare(b.time);
        });

      setPatientsList(allPatients);
      setTodayItems(todayFiltered);
      setWeekItems(weekFiltered);
    } catch (err) {
      console.error('Erro ao carregar Daily Tracker:', err);
    } finally {
      setLoading(false);
    }
  };

  const resolveItemReference = (item: UnifiedItem, patients: Patient[]): TaskReference | null => {
    if (item.type === 'APPT') {
      if (item.patient_id) {
        return {
          target: 'pacientes',
          label: item.patient_name || 'Paciente',
          patientId: item.patient_id
        };
      }
      return {
        target: 'agenda',
        label: 'Agenda'
      };
    }

    const titleLower = item.title.toLowerCase();

    // 1. Procura paciente correspondente pelo nome completo ou primeiro nome
    for (const p of patients) {
      const fullNameLower = p.name.toLowerCase();
      const firstNameLower = p.name.split(' ')[0].toLowerCase();
      
      if (fullNameLower && titleLower.includes(fullNameLower)) {
        return {
          target: 'pacientes',
          label: p.name.split(' ')[0],
          patientId: p.id
        };
      }
      if (firstNameLower.length > 2 && titleLower.includes(firstNameLower)) {
        return {
          target: 'pacientes',
          label: p.name.split(' ')[0],
          patientId: p.id
        };
      }
    }

    // 2. Termos financeiros
    if (['recibo', 'financeiro', 'pagamento', 'cobrança', 'cobranca', 'faturamento', 'nota fiscal', 'valor', 'reembolso'].some(k => titleLower.includes(k))) {
      return {
        target: 'financeiro',
        label: 'Financeiro'
      };
    }

    // 3. Termos de anotações / supervisão / protocolos / estudos
    if (['nota', 'notas', 'anotação', 'anotacao', 'supervisão', 'supervisao', 'protocolo', 'rascunho', 'estudo', 'leitura', 'livro'].some(k => titleLower.includes(k))) {
      return {
        target: 'notas',
        label: 'Bloco de Notas'
      };
    }

    // 4. Termos de agenda / consultas / atendimentos
    if (['sessão', 'sessao', 'consulta', 'atendimento', 'agenda', 'horário', 'horario', 'agendamento'].some(k => titleLower.includes(k))) {
      return {
        target: 'agenda',
        label: 'Agenda'
      };
    }

    // 5. Termos de documentos
    if (['declaração', 'declaracao', 'atestado', 'laudo', 'relatório', 'relatorio', 'documento', 'termo', 'contrato'].some(k => titleLower.includes(k))) {
      return {
        target: 'documentos',
        label: 'Documentos'
      };
    }

    return null;
  };

  const handleItemClick = (item: UnifiedItem) => {
    const ref = resolveItemReference(item, patientsList);
    if (ref) {
      if (ref.target === 'pacientes' && ref.patientId && onSelectPatient) {
        onSelectPatient(ref.patientId);
      } else if (onNavigate) {
        onNavigate(ref.target);
      }
    } else {
      handleToggleItem(item);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;

    let finalTitle = taskTitle.trim();
    if (linkedEntity) {
      if (linkedEntity.startsWith('patient:')) {
        const parts = linkedEntity.split(':');
        const pName = parts[2];
        if (pName && !finalTitle.toLowerCase().includes(pName.toLowerCase())) {
          finalTitle = `${finalTitle} (${pName})`;
        }
      } else if (linkedEntity.startsWith('module:')) {
        const mod = linkedEntity.split(':')[1];
        const modName = mod === 'financeiro' ? 'Financeiro' : mod === 'notas' ? 'Bloco de Notas' : mod === 'agenda' ? 'Agenda' : 'Documentos';
        if (!finalTitle.toLowerCase().includes(mod.toLowerCase())) {
          finalTitle = `${finalTitle} [${modName}]`;
        }
      }
    }

    try {
      await dbService.execute(
        'INSERT INTO daily_tasks (title, time, done, date, important) VALUES (?, ?, ?, ?, ?)',
        [finalTitle, taskTime, 0, taskDate, taskImportant ? 1 : 0]
      );
      setTaskTitle('');
      setLinkedEntity('');
      setTaskImportant(false);
      setShowAddModal(false);
      loadTrackerData();
    } catch (err) {
      console.error('Erro ao adicionar tarefa avulsa:', err);
    }
  };

  const handleToggleItem = async (item: UnifiedItem) => {
    const nextDone = !item.done;
    
    // Otimista
    if (item.date === todayStr || (item.date < todayStr && !item.done)) {
      setTodayItems(prev => prev.map(i => i.uid === item.uid ? { ...i, done: nextDone } : i));
    } else {
      setWeekItems(prev => prev.map(i => i.uid === item.uid ? { ...i, done: nextDone } : i));
    }

    try {
      if (item.type === 'TASK') {
        await dbService.execute(
          'UPDATE daily_tasks SET done = ? WHERE id = ?',
          [nextDone ? 1 : 0, item.id]
        );
      } else {
        // Obter status atual antes de atualizar para verificar transições
        const apptData = await dbService.query<Appointment>('SELECT status, patient_id, patient_name, date, time FROM appointments WHERE id = ?', [item.id]);
        if (apptData.length > 0) {
          const previousStatus = apptData[0].status;
          
          await dbService.execute(
            'UPDATE appointments SET status = ? WHERE id = ?',
            [nextDone ? 'CONFIRMED' : 'PENDING', item.id]
          );

          // Somente faturar/descontar se transicionando de outro status para CONFIRMED
          if (nextDone && previousStatus !== 'CONFIRMED') {
            if (apptData[0].patient_id) {
              const patRes = await dbService.query<Patient>('SELECT id, name, billing_model, sessions_remaining, package_price, session_price FROM patients WHERE id = ?', [apptData[0].patient_id]);
              if (patRes.length > 0) {
                const pat = patRes[0];
                
                // 1. Desconto ou Faturamento
                if (pat.billing_model === 'PACOTE') {
                  const remaining = Math.max(0, (pat.sessions_remaining || 0) - 1);
                  await dbService.execute('UPDATE patients SET sessions_remaining = ? WHERE id = ?', [remaining, pat.id]);
                } else {
                  const price = pat.session_price || 150;
                  await dbService.execute(
                    'INSERT INTO finance (patient_id, type, category, description, amount, date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [pat.id, 'INCOME', 'Sessão Clínica', `Consulta Avulsa (Pendente) - ${pat.name}`, price, apptData[0].date, 'PENDING']
                  );
                }

                // 2. Cria automaticamente tarefa de evolução clínica
                const checkTask = await dbService.query<any>(
                  "SELECT id FROM daily_tasks WHERE title = ? AND date = ?",
                  [`Escrever evolução: ${pat.name}`, apptData[0].date]
                );
                
                if (checkTask.length === 0) {
                  await dbService.execute(
                    'INSERT INTO daily_tasks (title, time, done, date, important) VALUES (?, ?, ?, ?, ?)',
                    [`Escrever evolução: ${pat.name}`, apptData[0].time, 0, apptData[0].date, 1] // Marcado como importante!
                  );
                }
              }
            }
          } 
          // Somente desfazer se transicionando de CONFIRMED para outro status
          else if (!nextDone && previousStatus === 'CONFIRMED') {
            if (apptData[0].patient_id) {
              const patRes = await dbService.query<Patient>('SELECT id, name, billing_model, sessions_remaining, package_price, session_price FROM patients WHERE id = ?', [apptData[0].patient_id]);
              if (patRes.length > 0) {
                const pat = patRes[0];
                
                if (pat.billing_model === 'PACOTE') {
                  // Restaurar sessão que foi descontada
                  const restored = (pat.sessions_remaining || 0) + 1;
                  await dbService.execute('UPDATE patients SET sessions_remaining = ? WHERE id = ?', [restored, pat.id]);
                } else {
                  // Deletar a receita PENDING que foi auto-criada para essa data/paciente
                  const pendingTxs = await dbService.query<any>(
                    "SELECT id FROM finance WHERE patient_id = ? AND date = ? AND status = ? AND category = ?",
                    [pat.id, apptData[0].date, 'PENDING', 'Sessão Clínica']
                  );
                  if (pendingTxs.length > 0) {
                    // Remove apenas a mais recente para não afetar outras
                    await dbService.execute('DELETE FROM finance WHERE id = ?', [pendingTxs[pendingTxs.length - 1].id]);
                  }
                }
              }
            }
          }
        }
      }
      loadTrackerData();
    } catch (err) {
      console.error('Erro ao alternar estado do item:', err);
      loadTrackerData();
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      await dbService.execute('DELETE FROM daily_tasks WHERE id = ?', [taskId]);
      loadTrackerData();
    } catch (err) {
      console.error('Erro ao deletar tarefa livre:', err);
    }
  };

  const formatTodayHeader = () => {
    const options: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    const dateStr = today.toLocaleDateString('pt-BR', options);
    return dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
  };

  const formatWeekRange = () => {
    const opt: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
    const startStr = tomorrow.toLocaleDateString('pt-BR', opt);
    const endStr = endOfWeek.toLocaleDateString('pt-BR', opt);
    return `${startStr} a ${endStr}`;
  };

  const formatDayHeader = (dateStr: string) => {
    if (dateStr === todayStr) return 'Hoje';
    if (dateStr === tomorrowStr) return 'Amanhã';

    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    
    const dayOfWeek = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
    const formattedDate = dateObj.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
    
    const capitalizedDay = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1).replace('-feira', '');
    return `${capitalizedDay}, ${formattedDate}`;
  };

  // Agrupa itens da semana por data
  const groupedWeekItems = weekItems.reduce((groups, item) => {
    if (!groups[item.date]) {
      groups[item.date] = [];
    }
    groups[item.date].push(item);
    return groups;
  }, {} as Record<string, UnifiedItem[]>);

  const sortedWeekDates = Object.keys(groupedWeekItems).sort();

  const totalTodayDone = todayItems.filter(i => i.done).length;
  const totalWeekDone = weekItems.filter(i => i.done).length;

  if (loading && todayItems.length === 0 && weekItems.length === 0) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-80px)]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-teal-500"></div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn space-y-4 h-full relative">
      
      {/* Dual Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-90px)] items-start overflow-hidden pt-2">
        
        {/* COLUMN 1: HOJE */}
        <div className="glass-panel-teal rounded-2xl p-5 border border-[#e7e4dc] dark:border-teal-700/40 flex flex-col h-full overflow-hidden">
          <div className="flex justify-between items-center pb-3 border-b border-[#e7e4dc] dark:border-charcoal-800 mb-4">
            <div className="text-left flex items-baseline gap-2">
              <h2 className="text-xs font-black uppercase tracking-widest text-teal-700 dark:text-white">
                Hoje
              </h2>
              <span className="text-[10px] font-bold text-stone-400 dark:text-white font-sans">
                {formatTodayHeader()}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Progress inside the line */}
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border border-teal-500/20 bg-teal-500/5 text-teal-700 dark:text-teal-300">
                Concluído: {totalTodayDone}/{todayItems.length}
              </span>
              
              {/* Integrated Add Button */}
              <button
                onClick={() => {
                  setTaskDate(todayStr);
                  setTaskTitle('');
                  setTaskImportant(false);
                  setShowAddModal(true);
                }}
                className="p-1 bg-teal-500/10 hover:bg-teal-600/20 border border-teal-500/20 text-teal-500 rounded-lg transition-all"
                title="Adicionar tarefa para hoje"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {todayItems.length === 0 ? (
              <div className="h-full border border-dashed border-[#e7e4dc] dark:border-charcoal-800/80 rounded-xl flex flex-col items-center justify-center p-8 text-center">
                <CheckCircle className="h-8 w-8 text-stone-300 dark:text-charcoal-700 mb-2" />
                <span className="text-[10px] italic text-stone-400 dark:text-white font-semibold uppercase tracking-wider">
                  Tudo livre por hoje!
                </span>
                <p className="text-[9px] text-stone-400 dark:text-charcoal-600 uppercase tracking-widest mt-1">
                  Nenhum atendimento ou tarefa agendada.
                </p>
              </div>
            ) : (
              todayItems.map((item) => {
                const isOverdue = (item.date < todayStr || (item.date === todayStr && item.time < currentHourMin)) && !item.done;
                const ref = resolveItemReference(item, patientsList);
                return (
                  <div
                    key={item.uid}
                    onClick={() => handleItemClick(item)}
                    className={`border transition-all rounded-xl p-3.5 flex items-center justify-between shadow-sm hover:shadow-md cursor-pointer select-none group ${
                      item.done 
                        ? 'bg-[#faf9f6]/30 dark:bg-charcoal-950/20 border-[#e7e4dc]/70 dark:border-[#131317] opacity-40' 
                        : isOverdue
                          ? 'border-red-500/30 dark:border-red-500/20 bg-red-500/[0.02] dark:bg-red-500/[0.04]'
                          : item.important
                            ? 'border-amber-500/35 bg-amber-500/[0.01] dark:bg-amber-500/[0.03]'
                            : item.type === 'APPT'
                              ? 'bg-white dark:bg-charcoal-900 border-emerald-500/20 hover:border-emerald-500/30'
                              : 'bg-white dark:bg-charcoal-900 border-[#e7e4dc] dark:border-teal-800/60 hover:border-teal-500/25'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      {/* Checkbox button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleItem(item);
                        }}
                        className={`w-5 h-5 rounded-lg border transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                          item.done
                            ? 'bg-teal-600 border-teal-500 text-charcoal-950'
                            : isOverdue
                              ? 'border-red-400 dark:border-red-700 hover:border-red-500'
                              : 'border-[#c5c3b9] dark:border-[#3f3f46] hover:border-teal-500'
                        }`}
                        title={item.done ? 'Marcar como não concluído' : 'Marcar como concluído'}
                      >
                        {item.done && <CheckCircle2 className="h-3.5 w-3.5" />}
                      </button>

                      <div className="min-w-0 text-left flex-1">
                        <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-wider font-sans">
                          <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-500' : 'text-teal-600 dark:text-white'}`}>
                            <Clock className="h-3 w-3" />
                            {item.time}
                          </span>
                          
                          {isOverdue && (
                            <span className="bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 px-1.5 py-0.5 rounded text-[7px] font-black uppercase shrink-0 flex items-center gap-0.5">
                              <AlertTriangle className="h-2 w-2" />
                              Atrasado
                            </span>
                          )}

                          {item.type === 'APPT' && (
                            <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded text-[7px] font-black uppercase shrink-0">
                              Consulta
                            </span>
                          )}
                          {item.type === 'TASK' && (
                            <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded text-[7px] font-black uppercase shrink-0">
                              Tarefa
                            </span>
                          )}
                          {item.important && !isOverdue && (
                            <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded text-[7px] font-black uppercase shrink-0 flex items-center gap-0.5">
                              <Star className="h-2 w-2 fill-current" />
                              Importante
                            </span>
                          )}
                        </div>
                        
                        <h4 className={`text-xs font-bold mt-1 font-sans ${
                          item.done 
                            ? 'line-through text-stone-400 dark:text-white font-medium' 
                            : isOverdue
                              ? 'text-red-950 dark:text-red-200'
                              : 'text-charcoal-800 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-300'
                        } truncate transition-colors`}>
                          {item.title}
                        </h4>

                        {/* Tag/Badge de Destino da Referência */}
                        {ref && (
                          <div className="flex items-center gap-1.5 mt-1.5">
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[8.5px] font-black uppercase tracking-wider bg-teal-500/10 dark:bg-teal-500/20 text-teal-700 dark:text-cream-300 border border-teal-500/25 group-hover:border-teal-500/50 transition-all"
                              title={`Clique para ir para ${ref.label}`}
                            >
                              {ref.target === 'pacientes' && <User className="w-2.5 h-2.5" />}
                              {ref.target === 'financeiro' && <DollarSign className="w-2.5 h-2.5" />}
                              {ref.target === 'notas' && <StickyNote className="w-2.5 h-2.5" />}
                              {ref.target === 'agenda' && <Calendar className="w-2.5 h-2.5" />}
                              {ref.target === 'documentos' && <FileText className="w-2.5 h-2.5" />}
                              <span>{ref.label}</span>
                              <ArrowUpRight className="w-2.5 h-2.5 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                            </span>
                          </div>
                        )}

                        {item.notes && !item.done && (
                          <p className="text-[10px] text-stone-400 dark:text-white italic mt-0.5 font-sans truncate max-w-[280px]">
                            Obs: {item.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {item.type === 'TASK' ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            triggerConfirm(
                              'Excluir Tarefa',
                              'Tem certeza de que deseja excluir permanentemente esta tarefa de sua lista?',
                              () => handleDeleteTask(item.id),
                              'danger'
                            );
                          }}
                          className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all shrink-0"
                          title="Excluir Tarefa"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        item.phone && (
                          <a
                            href={`https://web.whatsapp.com/send?phone=${item.phone.replace(/\D/g, '')}&text=${encodeURIComponent(`Olá! Lembrando da nossa sessão de psicoterapia agendada para hoje à s ${item.time}. Até logo!`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shrink-0"
                            title="Enviar Lembrete"
                          >
                            <MessageSquare className="h-3 w-3" />
                            Avisar
                          </a>
                        )
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* COLUMN 2: SEMANA */}
        <div className="glass-panel-teal rounded-2xl p-5 border border-[#e7e4dc] dark:border-teal-700/40 flex flex-col h-full overflow-hidden">
          <div className="flex justify-between items-center pb-3 border-b border-[#e7e4dc] dark:border-charcoal-800 mb-4">
            <div className="text-left flex items-baseline gap-2">
              <h2 className="text-xs font-black uppercase tracking-widest text-teal-700 dark:text-white">
                Esta Semana
              </h2>
              <span className="text-[10px] font-bold text-stone-400 dark:text-white font-sans">
                {formatWeekRange()}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Progress inside the line */}
              <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-lg border border-teal-500/20 bg-teal-500/5 text-teal-700 dark:text-teal-300">
                Concluído: {totalWeekDone}/{weekItems.length}
              </span>
              
              {/* Integrated Add Button */}
              <button
                onClick={() => {
                  setTaskDate(tomorrowStr);
                  setTaskTitle('');
                  setTaskImportant(false);
                  setShowAddModal(true);
                }}
                className="p-1 bg-teal-500/10 hover:bg-teal-600/20 border border-teal-500/20 text-teal-500 rounded-lg transition-all"
                title="Adicionar tarefa para esta semana"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {weekItems.length === 0 ? (
              <div className="h-full border border-dashed border-[#e7e4dc] dark:border-charcoal-800/80 rounded-xl flex flex-col items-center justify-center p-8 text-center">
                <Calendar className="h-8 w-8 text-stone-300 dark:text-charcoal-700 mb-2" />
                <span className="text-[10px] italic text-stone-400 dark:text-white font-semibold uppercase tracking-wider">
                  Nenhum compromisso
                </span>
                <p className="text-[9px] text-stone-400 dark:text-charcoal-600 uppercase tracking-widest mt-1">
                  para o restante da semana.
                </p>
              </div>
            ) : (
              sortedWeekDates.map(dateKey => (
                <div key={dateKey} className="space-y-2 text-left">
                  {/* Day Divider Label */}
                  <div className="flex items-center gap-2 pt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-500/40"></span>
                    <span className="text-[10px] font-black uppercase tracking-widest text-teal-700 dark:text-white">
                      {formatDayHeader(dateKey)}
                    </span>
                    <span className="flex-1 h-px bg-[#e7e4dc]/60 dark:bg-charcoal-800/60"></span>
                  </div>

                  <div className="space-y-2">
                    {groupedWeekItems[dateKey].map((item) => {
                      const ref = resolveItemReference(item, patientsList);
                      return (
                        <div
                          key={item.uid}
                          onClick={() => handleItemClick(item)}
                          className={`border transition-all rounded-xl p-3 flex items-center justify-between shadow-sm cursor-pointer select-none group ${
                            item.done 
                              ? 'bg-[#faf9f6]/30 dark:bg-charcoal-950/20 border-[#e7e4dc]/70 dark:border-[#131317] opacity-40' 
                              : item.important
                                ? 'border-amber-500/35 bg-amber-500/[0.01] dark:bg-amber-500/[0.03]'
                                : item.type === 'APPT'
                                  ? 'bg-white dark:bg-charcoal-900 border-emerald-500/20 hover:border-emerald-500/30'
                                  : 'bg-white dark:bg-charcoal-900 border-[#e7e4dc] dark:border-teal-800/60 hover:border-teal-500/25'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            {/* Checkbox button */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleItem(item);
                              }}
                              className={`w-5 h-5 rounded border transition-all flex items-center justify-center shrink-0 cursor-pointer ${
                                item.done
                                  ? 'bg-teal-600 border-teal-500 text-charcoal-950'
                                  : 'border-[#c5c3b9] dark:border-[#3f3f46] hover:border-teal-500'
                              }`}
                              title={item.done ? 'Marcar como pendente' : 'Marcar como concluído'}
                            >
                              {item.done && <CheckCircle2 className="h-3 w-3" />}
                            </button>

                            <div className="min-w-0 text-left flex-1">
                              <div className="flex items-center gap-1.5 text-[8px] font-black uppercase tracking-wider font-sans">
                                <span className="text-stone-400 dark:text-white flex items-center gap-1">
                                  <Clock className="h-2.5 w-2.5" />
                                  {item.time}
                                </span>
                                {item.type === 'APPT' && (
                                  <span className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-1 py-px rounded text-[6px] font-black uppercase">
                                    Consulta
                                  </span>
                                )}
                                {item.type === 'TASK' && (
                                  <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-1 py-px rounded text-[6px] font-black uppercase">
                                    Tarefa
                                  </span>
                                )}
                                {item.important && (
                                  <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1 py-px rounded text-[6px] font-black uppercase flex items-center gap-0.5">
                                    <Star className="h-2 w-2 fill-current" />
                                    Importante
                                  </span>
                                )}
                              </div>
                              
                              <h4 className={`text-xs font-bold mt-0.5 font-sans ${
                                item.done 
                                  ? 'line-through text-stone-400 dark:text-white font-medium' 
                                  : 'text-charcoal-800 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-300'
                              } truncate transition-colors`}>
                                {item.title}
                              </h4>

                              {/* Tag/Badge de Destino da Referência */}
                              {ref && (
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-teal-500/10 dark:bg-teal-500/20 text-teal-700 dark:text-cream-300 border border-teal-500/25 group-hover:border-teal-500/50 transition-all"
                                    title={`Clique para ir para ${ref.label}`}
                                  >
                                    {ref.target === 'pacientes' && <User className="w-2 h-2" />}
                                    {ref.target === 'financeiro' && <DollarSign className="w-2 h-2" />}
                                    {ref.target === 'notas' && <StickyNote className="w-2 h-2" />}
                                    {ref.target === 'agenda' && <Calendar className="w-2 h-2" />}
                                    {ref.target === 'documentos' && <FileText className="w-2 h-2" />}
                                    <span>{ref.label}</span>
                                    <ArrowUpRight className="w-2 h-2 opacity-70 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                        {item.type === 'TASK' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              triggerConfirm(
                                'Excluir Tarefa',
                                'Tem certeza de que deseja excluir permanentemente esta tarefa de sua lista?',
                                () => handleDeleteTask(item.id),
                                'danger'
                              );
                            }}
                            className="p-1 text-stone-400 hover:text-red-400 hover:bg-red-500/5 rounded transition-all shrink-0"
                            title="Excluir Tarefa"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Floating Add Task Modal (Independent position, z-50, no background layout shifting) */}
      {showAddModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          {/* Transparent click catcher to close modal */}
          <div className="fixed inset-0 z-40 bg-transparent pointer-events-auto" onClick={() => setShowAddModal(false)} />
          
          <div className="relative z-50 bg-[#ffffff] dark:bg-[#0c0c0e] border border-[#e7e4dc] dark:border-teal-500/20 rounded-2xl p-6 shadow-2xl w-full max-w-md pointer-events-auto transition-all animate-slideUp text-left">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="h-5 w-5 text-teal-500" />
              <h3 className="font-black text-charcoal-900 dark:text-white text-xs uppercase tracking-wider">
                Novo Afazer / Atividade
              </h3>
            </div>
            
            <form onSubmit={handleAddTask} className="space-y-4 text-xs font-bold text-stone-500 dark:text-charcoal-350 uppercase tracking-wider">
              <div className="space-y-1.5">
                <label className="block text-[10px] tracking-widest text-stone-400">Descrição da Tarefa</label>
                <input
                  type="text"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  className="w-full glass-input rounded-xl py-2.5 px-4 text-charcoal-900 dark:text-white text-sm outline-none font-sans font-medium"
                  placeholder="Ex: Mandar e-mail de laudo..."
                  required
                  autoFocus
                />
              </div>

              {/* Vínculo / Referência Opcional */}
              <div className="space-y-1.5 text-left">
                <label className="block text-[10px] tracking-widest text-stone-400">Vincular a (Opcional)</label>
                <select
                  value={linkedEntity}
                  onChange={(e) => setLinkedEntity(e.target.value)}
                  className="w-full glass-input rounded-xl py-2.5 px-4 text-charcoal-900 dark:text-white text-xs outline-none font-sans font-medium bg-white dark:bg-[#112424]"
                >
                  <option value="">Geral / Sem vínculo específico</option>
                  {patientsList.length > 0 && (
                    <optgroup label="Pacientes">
                      {patientsList.map(p => (
                        <option key={p.id} value={`patient:${p.id}:${p.name}`}>
                          👤 Paciente: {p.name}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="Módulos Clínicos">
                    <option value="module:financeiro">💰 Módulo Financeiro</option>
                    <option value="module:notas">📝 Bloco de Notas</option>
                    <option value="module:agenda">📅 Agenda</option>
                    <option value="module:documentos">📄 Documentos</option>
                  </optgroup>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] tracking-widest text-stone-400">Data</label>
                  <input
                    type="date"
                    value={taskDate}
                    onChange={(e) => setTaskDate(e.target.value)}
                    className="w-full glass-input rounded-xl py-2.5 px-4 text-charcoal-900 dark:text-white text-sm outline-none font-sans font-medium"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] tracking-widest text-stone-400">Horário Previsto</label>
                  <input
                    type="time"
                    value={taskTime}
                    onChange={(e) => setTaskTime(e.target.value)}
                    className="w-full glass-input rounded-xl py-2.5 px-4 text-charcoal-900 dark:text-white text-sm outline-none font-sans font-medium"
                    required
                  />
                </div>
              </div>

              {/* Tag Importante Button Selector */}
              <div className="flex flex-col gap-1.5 pt-1 text-left">
                <span className="text-[10px] tracking-widest text-stone-400">Prioridade da Tarefa</span>
                <button
                  type="button"
                  onClick={() => setTaskImportant(!taskImportant)}
                  className={`w-full py-2.5 px-4 rounded-xl border text-xs font-black uppercase tracking-wider transition-all duration-200 flex items-center justify-center gap-2 ${
                    taskImportant
                      ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-400 shadow-[0_0_12px_rgba(77,150,150,0.15)] bg-amber-500/5'
                      : 'bg-[#faf9f6] dark:bg-charcoal-900 border-[#e7e4dc] dark:border-charcoal-800 text-stone-500 dark:text-white hover:border-stone-300 dark:hover:border-charcoal-700'
                  }`}
                >
                  <Star className={`h-4 w-4 transition-transform duration-200 ${taskImportant ? 'text-amber-500 fill-amber-500 scale-110' : 'text-stone-400 dark:text-white'}`} />
                  {taskImportant ? 'Tarefa Importante (Destaque Ativo)' : 'Marcar como Importante'}
                </button>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#e7e4dc] dark:border-charcoal-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-teal-800/60 text-stone-600 dark:text-charcoal-350 hover:text-charcoal-900 dark:text-white rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-teal-gradient text-charcoal-950 rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 uppercase"
                >
                  <Plus className="h-4 w-4" />
                  Gravar Tarefa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmState.isOpen && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="fixed inset-0 z-40 bg-transparent pointer-events-auto" onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))} />
          <div className="relative z-50 bg-[#ffffff] dark:bg-[#0c0c0e] border border-[#e7e4dc] dark:border-teal-500/20 rounded-2xl p-6 shadow-2xl w-full max-w-sm pointer-events-auto transition-all animate-slideUp text-left">
            <h3 className={`text-sm font-black uppercase tracking-wider ${confirmState.type === 'danger' ? 'text-red-500' : 'text-amber-500'}`}>
              {confirmState.title}
            </h3>
            <p className="text-xs text-stone-500 dark:text-white font-medium font-sans mt-2 leading-relaxed">
              {confirmState.message}
            </p>
            <div className="flex justify-end gap-3 mt-5 pt-3 border-t border-[#e7e4dc] dark:border-charcoal-800">
              <button
                type="button"
                onClick={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
                className="px-3.5 py-2 bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-teal-800/60 text-stone-600 dark:text-charcoal-350 hover:text-charcoal-900 dark:text-white rounded-xl text-xs font-bold transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmState.onConfirm();
                  setConfirmState(prev => ({ ...prev, isOpen: false }));
                }}
                className={`px-4 py-2 rounded-xl text-xs font-black uppercase transition-all shadow-md ${
                  confirmState.type === 'danger'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-teal-gradient text-charcoal-950'
                }`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
