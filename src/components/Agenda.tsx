import React, { useState, useEffect } from 'react';
import { dbService } from '../services/db';
import type { Appointment, Patient } from '../services/db';
import { ConfirmModal } from './ConfirmModal';
import { 
  Plus, Trash2, CheckCircle2, 
  XCircle, AlertCircle, HelpCircle, ChevronLeft, ChevronRight,
  Lock, Unlock, Sparkles, UserPlus, X, AlertTriangle
} from 'lucide-react';

export const Agenda: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  
  // Date Navigation State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().slice(0, 10));

  // Hourly Booking Modal State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [selectedHour, setSelectedHour] = useState('');
  
  // Form Fields
  const [patientId, setPatientId] = useState<number | ''>('');
  const [customPatientName, setCustomPatientName] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Appointment['status']>('PENDING');
  const [customPrice, setCustomPrice] = useState('');
  // Recurring session
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [repeatWeeks, setRepeatWeeks] = useState(4);
  const [showRecurrenceChoice, setShowRecurrenceChoice] = useState(false);

  // Unschedule confirmation state (supports bulk deletion)
  const [unscheduleState, setUnscheduleState] = useState<{
    isOpen: boolean;
    apptId: number;
    patientId: number | null;
    patientName: string;
    apptDate: string;
    hasFuture: boolean;
  } | null>(null);

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
    loadAppointments();
    loadPatients();
  }, []);

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

  const loadAppointments = async () => {
    try {
      const data = await dbService.query<Appointment>('SELECT * FROM appointments');
      setAppointments(data);
    } catch (err) {
      console.error('Erro ao carregar consultas:', err);
    }
  };

  const loadPatients = async () => {
    try {
      const data = await dbService.query<Patient>('SELECT id, name, phone FROM patients');
      setPatients(data);
    } catch (err) {
      console.error('Erro ao buscar pacientes:', err);
    }
  };

  const handleBookSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      let resolvedName = customPatientName.trim();
      if (patientId) {
        const selectedPat = patients.find(p => p.id === patientId);
        if (selectedPat) {
          resolvedName = selectedPat.name;
        }
      }

      if (!resolvedName) {
        alert('Selecione ou digite o nome do paciente.');
        return;
      }

      const timeStr = `${selectedHour}:00`;
      const parsedPrice = customPrice.trim() ? parseFloat(customPrice) : null;
      const totalOccurrences = repeatWeekly ? repeatWeeks : 1;

      for (let i = 0; i < totalOccurrences; i++) {
        // Calculate date for this occurrence (add i * 7 days)
        const baseDate = new Date(selectedDateStr + 'T12:00:00');
        baseDate.setDate(baseDate.getDate() + i * 7);
        const occurrenceDate = baseDate.toISOString().slice(0, 10);

        await dbService.execute(
          'INSERT INTO appointments (patient_id, patient_name, date, time, duration, status, notes, custom_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [patientId || null, resolvedName, occurrenceDate, timeStr, 50, status, notes, parsedPrice]
        );
      }

      // NOTA: Não faturamos na criação do agendamento. O faturamento automático
      // acontece exclusivamente quando o status muda para CONFIRMED via
      // handleQuickStatusChange ou DailyTracker, evitando cobrança duplicada.

      // Reset
      setShowBookingModal(false);
      setPatientId('');
      setCustomPatientName('');
      setNotes('');
      setStatus('PENDING');
      setCustomPrice('');
      setRepeatWeekly(false);
      setRepeatWeeks(4);
      
      loadAppointments();
    } catch (err) {
      console.error('Erro ao gravar consulta:', err);
    }
  };

  const handleLockSlotDirectly = async (hourStr: string) => {
    try {
      const timeStr = `${hourStr}:00`;
      await dbService.execute(
        'INSERT INTO appointments (patient_id, patient_name, date, time, duration, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [null, 'LOCKED', selectedDateStr, timeStr, 60, 'CANCELLED', 'Horário trancado pelo profissional']
      );
      
      setShowBookingModal(false);
      setPatientId('');
      setCustomPatientName('');
      setNotes('');
      setStatus('PENDING');

      loadAppointments();
    } catch (err) {
      console.error('Erro ao trancar horário:', err);
    }
  };

  const handleQuickStatusChange = async (id: number, newStatus: Appointment['status']) => {
    try {
      const appt = appointments.find(a => a.id === id);
      if (!appt) return;

      // Se o status novo for idêntico ao atual, ignora
      if (appt.status === newStatus) return;

      await dbService.execute('UPDATE appointments SET status = ? WHERE id = ?', [newStatus, id]);
      
      // Se mudou para CONFIRMED (Presente) e antes não era CONFIRMED
      if (newStatus === 'CONFIRMED' && appt.status !== 'CONFIRMED') {
        if (appt.patient_id) {
          const patRes = await dbService.query<Patient>('SELECT id, name, billing_model, sessions_remaining, package_price, session_price FROM patients WHERE id = ?', [appt.patient_id]);
          if (patRes.length > 0) {
            const pat = patRes[0];
            if (pat.billing_model === 'PACOTE') {
              const remaining = Math.max(0, (pat.sessions_remaining || 0) - 1);
              await dbService.execute('UPDATE patients SET sessions_remaining = ? WHERE id = ?', [remaining, pat.id]);
            } else {
              const price = appt.custom_price || pat.session_price || 150;
              await dbService.execute(
                'INSERT INTO finance (patient_id, type, category, description, amount, date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [pat.id, 'INCOME', 'Sessão Clínica', `Consulta Avulsa (Pendente) - ${pat.name}`, price, selectedDateStr, 'PENDING']
              );
            }
          }
        }
      }
      // Se mudou DE CONFIRMED (Presente) para outro status
      else if (newStatus !== 'CONFIRMED' && appt.status === 'CONFIRMED') {
        if (appt.patient_id) {
          const patRes = await dbService.query<Patient>('SELECT id, name, billing_model, sessions_remaining FROM patients WHERE id = ?', [appt.patient_id]);
          if (patRes.length > 0) {
            const pat = patRes[0];
            if (pat.billing_model === 'PACOTE') {
              const restored = (pat.sessions_remaining || 0) + 1;
              await dbService.execute('UPDATE patients SET sessions_remaining = ? WHERE id = ?', [restored, pat.id]);
            } else {
              // Deletar a receita PENDING que foi auto-criada para essa data/paciente
              const pendingTxs = await dbService.query<any>(
                "SELECT id FROM finance WHERE patient_id = ? AND date = ? AND status = ? AND category = ?",
                [pat.id, appt.date, 'PENDING', 'Sessão Clínica']
              );
              if (pendingTxs.length > 0) {
                // Remove apenas a mais recente para não afetar outras
                await dbService.execute('DELETE FROM finance WHERE id = ?', [pendingTxs[pendingTxs.length - 1].id]);
              }
            }
          }
        }
      }

      loadAppointments();
    } catch (err) {
      console.error('Erro ao alterar status:', err);
    }
  };

  const handleUnlockSlot = (apptId: number) => {
    triggerConfirm(
      'Liberar Horário',
      'Deseja realmente destrancar este horário e torná-lo disponível para novos agendamentos?',
      async () => {
        try {
          await dbService.execute('DELETE FROM appointments WHERE id = ?', [apptId]);
          loadAppointments();
        } catch (err) {
          console.error('Erro ao destrancar horário:', err);
        }
      },
      'warning'
    );
  };

  const handleUnscheduleAppointment = (apptId: number) => {
    const appt = appointments.find(a => a.id === apptId);
    if (appt) {
      let hasFuture = false;
      if (appt.patient_id) {
        hasFuture = appointments.some(a => 
          a.id !== appt.id && 
          a.patient_id === appt.patient_id && 
          (a.date > appt.date || (a.date === appt.date && a.time > appt.time))
        );
      } else {
        hasFuture = appointments.some(a => 
          a.id !== appt.id && 
          a.patient_name === appt.patient_name && 
          (a.date > appt.date || (a.date === appt.date && a.time > appt.time))
        );
      }

      setUnscheduleState({
        isOpen: true,
        apptId: appt.id,
        patientId: appt.patient_id || null,
        patientName: appt.patient_name,
        apptDate: appt.date,
        hasFuture
      });
    }
  };


  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }
    for (let i = 1; i <= totalDays; i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + (direction === 'next' ? 1 : -1), 1);
    setCurrentDate(newDate);
  };

  const getStatusBadgeClass = (status: Appointment['status']) => {
    switch (status) {
      case 'CONFIRMED': return 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20';
      case 'PENDING': return 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20';
      case 'ABSENT': return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
      case 'CANCELLED': return 'bg-stone-500/10 text-stone-600 dark:text-white border-stone-500/20';
    }
  };

  const getStatusIcon = (status: Appointment['status']) => {
    switch (status) {
      case 'CONFIRMED': return <CheckCircle2 className="h-3 w-3" />;
      case 'PENDING': return <AlertCircle className="h-3 w-3" />;
      case 'ABSENT': return <XCircle className="h-3 w-3" />;
      case 'CANCELLED': return <HelpCircle className="h-3 w-3" />;
    }
  };

  const days = getDaysInMonth(currentDate);
  const selectedDateAppts = appointments.filter(appt => appt.date === selectedDateStr);

  // Lista de slots horários das 07:00 à s 22:00
  const hourlySlots = [
    '07', '08', '09', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20', '21', '22'
  ];

  const getSlotAppointment = (hourStr: string) => {
    return selectedDateAppts.find(appt => {
      const apptHour = appt.time.split(':')[0];
      return apptHour.padStart(2, '0') === hourStr;
    });
  };

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col lg:flex-row gap-6 overflow-hidden animate-fadeIn">
      {/* Custom Confirm modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        type={confirmState.type}
      />

      {/* --- CALENDAR PANEL (Left) --- */}
      <div className="lg:w-2/3 bg-white dark:bg-[#112424] border border-teal-200/50 dark:border-teal-800/60 shadow-lg rounded-3xl p-5 border border-teal-200/50 dark:border-teal-800/60 shadow-xl flex flex-col h-full overflow-hidden">
        
        {/* Navigation Header */}
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h2 className="font-extrabold text-charcoal-900 dark:text-white text-base tracking-widest uppercase font-sans">
            {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex gap-2">
            <button 
              onClick={() => navigateMonth('prev')}
              className="p-2 bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-teal-800/60 hover:border-teal-500/40 text-stone-600 dark:text-charcoal-350 hover:text-teal-600 dark:hover:text-teal-300 rounded-xl transition-all"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button 
              onClick={() => {
                const now = new Date();
                setCurrentDate(now);
                setSelectedDateStr(now.toISOString().slice(0, 10));
              }}
              className="px-3 py-1 bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-teal-800/60 hover:border-teal-500/40 text-stone-600 dark:text-charcoal-350 hover:text-teal-600 dark:hover:text-teal-300 rounded-xl transition-all text-xs font-bold uppercase tracking-wider"
            >
              Hoje
            </button>
            <button 
              onClick={() => navigateMonth('next')}
              className="p-2 bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-teal-800/60 hover:border-teal-500/40 text-stone-600 dark:text-charcoal-350 hover:text-teal-600 dark:hover:text-teal-300 rounded-xl transition-all"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Days of Week Header */}
        <div className="grid grid-cols-7 text-center font-black text-[9px] text-stone-500 dark:text-white uppercase tracking-widest border-b border-[#e7e4dc] dark:border-charcoal-800 pb-2 mb-2 shrink-0">
          <div>Dom</div>
          <div>Seg</div>
          <div>Ter</div>
          <div>Qua</div>
          <div>Qui</div>
          <div>Sex</div>
          <div>Sáb</div>
        </div>

        {/* Days Grid - Stretching to fill remaining space */}
        <div className="grid grid-cols-7 auto-rows-fr gap-1.5 flex-1 overflow-hidden min-h-0">
          {days.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} className="h-full rounded-xl bg-transparent"></div>;

            const dateStr = day.toISOString().slice(0, 10);
            const isSelected = dateStr === selectedDateStr;
            const hasAppts = appointments.some(appt => appt.date === dateStr);
            const isToday = dateStr === new Date().toISOString().slice(0, 10);

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDateStr(dateStr)}
                className={`h-full rounded-xl flex flex-col items-center justify-between p-2 transition-all relative border ${
                  isSelected 
                    ? 'bg-teal-500/10 border-teal-400 text-teal-600 dark:text-teal-300 font-extrabold shadow-[0_0_12px_rgba(77,150,150,0.2)]' 
                    : isToday
                      ? 'bg-[#f0ede6] dark:bg-charcoal-900/65 border-teal-500/40 text-charcoal-900 dark:text-white font-bold'
                      : 'bg-white dark:bg-charcoal-950 border-[#e7e4dc] dark:border-[#131317] text-stone-600 dark:text-charcoal-350 hover:border-teal-400/40 hover:bg-[#faf9f6] dark:hover:bg-charcoal-900/30'
                }`}
              >
                <span className="text-xs font-semibold">{day.getDate()}</span>
                
                {hasAppts && (
                  <span className="w-1.5 h-1.5 bg-teal-500 rounded-full shadow-[0_0_8px_rgba(77,150,150,0.5)]"></span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* --- HOURLY SLOTS LIST PANEL (Right) --- */}
      <div className="lg:w-1/3 bg-white dark:bg-[#112424] border border-teal-200/50 dark:border-teal-800/60 shadow-lg rounded-3xl p-5 border border-teal-200/50 dark:border-teal-800/60 flex flex-col h-full overflow-hidden">
        
        {/* Day Header */}
        <div className="pb-3 border-b border-[#e7e4dc] dark:border-charcoal-800 mb-4 shrink-0 text-left">
          <span className="text-[9px] text-teal-600 dark:text-teal-300 font-extrabold uppercase tracking-widest">Cronograma Horário</span>
          <h3 className="font-extrabold text-charcoal-900 dark:text-white text-sm font-sans tracking-wide mt-0.5">
            {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          </h3>
        </div>

        {/* Scrollable Slots Container */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 min-h-0">
          {hourlySlots.map(hour => {
            const appt = getSlotAppointment(hour);
            const isLocked = appt && appt.patient_name === 'LOCKED';

            if (isLocked) {
              return (
                <div 
                  key={hour}
                  className="h-[72px] bg-red-500/[0.01] dark:bg-red-500/[0.03] border border-dashed border-red-500/25 rounded-2xl px-4 flex items-center justify-between gap-3 text-left transition-all"
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    {/* Time Block */}
                    <div className="w-12 h-12 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-center shrink-0 text-red-500/70 font-black text-lg font-sans">
                      {hour}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-red-950 dark:text-red-300 uppercase tracking-wider">Horário Trancado</h4>
                      <p className="text-[9px] text-stone-400 dark:text-charcoal-600 font-semibold font-sans mt-0.5">Indisponível para agendamento</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnlockSlot(appt.id)}
                    className="px-2.5 py-1.5 bg-stone-100 hover:bg-stone-200 dark:bg-charcoal-900 dark:hover:bg-charcoal-800 border border-stone-200 dark:border-teal-800/60 text-stone-500 dark:text-charcoal-350 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shrink-0"
                  >
                    <Unlock className="h-3 w-3" />
                    Liberar
                  </button>
                </div>
              );
            }

            if (appt) {
              return (
                <div 
                  key={hour}
                  className={`h-[72px] border transition-all rounded-2xl px-4 flex items-center justify-between gap-3 text-left select-none ${
                    appt.status === 'CONFIRMED'
                      ? 'bg-emerald-500/[0.02] dark:bg-emerald-500/[0.04] border-emerald-500/20'
                      : appt.status === 'PENDING'
                        ? 'bg-amber-500/[0.02] dark:bg-amber-500/[0.04] border-amber-500/20'
                        : appt.status === 'ABSENT'
                          ? 'bg-red-500/[0.02] dark:bg-red-500/[0.04] border-red-500/20'
                          : 'bg-[#faf9f6]/30 dark:bg-charcoal-950/20 border-[#e7e4dc] dark:border-[#131317]'
                  }`}
                >
                  <div className="flex items-center gap-3.5 flex-1 min-w-0">
                    {/* Time Block */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border font-sans ${
                      appt.status === 'CONFIRMED'
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-black text-lg'
                        : appt.status === 'PENDING'
                          ? 'bg-amber-500/5 border-amber-500/20 text-amber-600 dark:text-amber-400 font-black text-lg'
                          : appt.status === 'ABSENT'
                            ? 'bg-red-500/5 border-red-500/20 text-red-600 dark:text-red-400 font-black text-lg'
                            : 'bg-stone-100 dark:bg-charcoal-900 border-[#e7e4dc] dark:border-charcoal-800 text-stone-600 dark:text-charcoal-300 font-black text-lg'
                    }`}>
                      {hour}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-black text-charcoal-900 dark:text-white truncate font-sans tracking-wide">
                          {appt.patient_name}
                        </h4>
                        <span className={`inline-flex items-center gap-1 text-[7px] border px-1.5 py-0.5 rounded-full font-black uppercase tracking-wider shrink-0 ${getStatusBadgeClass(appt.status)}`}>
                          {getStatusIcon(appt.status)}
                          {appt.status === 'CONFIRMED' ? 'Confirmada' : appt.status === 'PENDING' ? 'Pendente' : appt.status === 'CANCELLED' ? 'Cancelada' : 'Faltou'}
                        </span>
                        
                        {/* Custom Price Badge */}
                        {appt.custom_price !== undefined && appt.custom_price !== null && (
                          <span className="inline-flex items-center text-[7.5px] font-extrabold text-amber-600 dark:text-amber-400 bg-amber-500/5 px-1 rounded border border-amber-500/10">
                            R$ {appt.custom_price}
                          </span>
                        )}
                      </div>

                      {appt.notes && (
                        <p className="text-[10px] text-stone-400 dark:text-white italic mt-0.5 font-sans truncate max-w-[280px]">
                          Obs: {appt.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions on the Right */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button 
                      onClick={() => handleQuickStatusChange(appt.id, 'CONFIRMED')}
                      className="px-2 py-1.5 bg-emerald-500/5 hover:bg-emerald-500/15 border border-emerald-500/15 text-emerald-600 dark:text-emerald-400 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                      title="Confirmar presença"
                    >
                      Presente
                    </button>
                    <button 
                      onClick={() => handleQuickStatusChange(appt.id, 'ABSENT')}
                      className="px-2 py-1.5 bg-stone-100 dark:bg-charcoal-800 hover:bg-stone-200 dark:hover:bg-charcoal-705 border border-stone-200 dark:border-charcoal-700/60 text-stone-500 dark:text-charcoal-350 rounded-lg text-[8px] font-black uppercase tracking-wider transition-all"
                      title="Marcar falta"
                    >
                      Falta
                    </button>

                    {(() => {
                      const pat = patients.find(p => p.id === appt.patient_id);
                      if (pat && pat.phone) {
                        const msg = `Olá, ${pat.name.split(' ')[0]}! Lembrete da nossa sessão de psicoterapia marcada para dia ${new Date(appt.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric' })} à s ${appt.time}. Aguardo você!`;
                        const waUrl = `https://web.whatsapp.com/send?phone=${pat.phone.replace(/\D/g, '')}&text=${encodeURIComponent(msg)}`;
                        return (
                          <a
                            href={waUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2 py-1.5 bg-[#25D366]/5 hover:bg-[#25D366]/15 border border-[#25D366]/20 text-[#25D366] rounded-lg text-[8px] font-black uppercase tracking-wider transition-colors flex items-center justify-center shrink-0"
                            title="Enviar lembrete WhatsApp"
                          >
                            Zap
                          </a>
                        );
                      }
                      return null;
                    })()}

                    <button
                      onClick={() => handleUnscheduleAppointment(appt.id)}
                      className="p-1.5 text-stone-400 hover:text-red-400 hover:bg-red-500/5 rounded-lg transition-all border border-[#e7e4dc] dark:border-charcoal-800"
                      title="Desmarcar consulta"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div 
                key={hour}
                onClick={() => {
                  setSelectedHour(hour);
                  setPatientId('');
                  setCustomPatientName('');
                  setNotes('');
                  setStatus('PENDING');
                  setShowBookingModal(true);
                }}
                className="h-[72px] bg-[#faf9f6]/20 hover:bg-white dark:bg-charcoal-950/10 dark:hover:bg-charcoal-900/30 border border-dashed border-[#e7e4dc] dark:border-charcoal-800 hover:border-teal-500/30 rounded-2xl px-4 flex items-center justify-between cursor-pointer transition-all select-none group"
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  {/* Time Block */}
                  <div className="w-12 h-12 rounded-xl bg-stone-100 dark:bg-charcoal-900/30 flex items-center justify-center shrink-0 border border-stone-200/50 dark:border-charcoal-800/40 text-stone-600 dark:text-charcoal-350 font-black text-lg font-sans">
                    {hour}
                  </div>
                  <span className="text-xs text-stone-400 dark:text-white font-bold uppercase tracking-wider font-sans group-hover:text-charcoal-700 dark:group-hover:text-stone-300 transition-colors">
                    Livre / Disponível
                  </span>
                </div>
                <button
                  className="p-1.5 bg-stone-100 dark:bg-charcoal-900 border border-stone-200 dark:border-teal-800/60 text-stone-400 group-hover:text-teal-600 dark:hover:text-teal-300 group-hover:border-teal-500/30 rounded-lg transition-all"
                  title="Agendar neste horário"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* --- SCHEDULING POPUP MODAL (z-50, no layout shifting) --- */}
      {showBookingModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          {/* Transparent click catcher to close modal */}
          <div className="fixed inset-0 z-40 bg-transparent pointer-events-auto" onClick={() => setShowBookingModal(false)} />
          
          <div className="relative z-50 bg-[#ffffff] dark:bg-[#0c0c0e] border border-[#e7e4dc] dark:border-teal-500/30 rounded-2xl p-6 shadow-2xl w-full max-w-md pointer-events-auto transition-all animate-slideUp text-left">
            <div className="flex items-center gap-2 mb-4 justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-teal-600" />
                <h3 className="font-black text-charcoal-900 dark:text-white text-xs uppercase tracking-wider">
                  Agendar Horário: {selectedHour}:00h
                </h3>
              </div>
              
              {/* Quick Lock Button */}
              <button
                type="button"
                onClick={() => handleLockSlotDirectly(selectedHour)}
                className="px-2.5 py-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-500 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 shadow-sm"
              >
                <Lock className="h-3 w-3" />
                Trancar Horário
              </button>
            </div>
            
            <form onSubmit={handleBookSlot} className="space-y-4 text-xs font-bold text-stone-500 dark:text-charcoal-350 uppercase tracking-wider">
              <div className="space-y-4">
                
                <div className="space-y-1.5">
                  <label className="block text-[10px] tracking-widest text-stone-400">Paciente Cadastrado</label>
                  <select
                    value={patientId}
                    onChange={(e) => {
                      const id = e.target.value;
                      setPatientId(id ? Number(id) : '');
                      if (id) setCustomPatientName('');
                    }}
                    className="w-full glass-input rounded-xl py-2.5 px-4 text-charcoal-900 dark:text-white text-sm outline-none font-sans font-medium"
                  >
                    <option value="">-- Ou digite um paciente avulso abaixo --</option>
                    {patients.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {!patientId && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] tracking-widest text-stone-400">Nome do Paciente Avulso</label>
                    <input
                      type="text"
                      value={customPatientName}
                      onChange={(e) => setCustomPatientName(e.target.value)}
                      className="w-full glass-input rounded-xl py-2.5 px-4 text-charcoal-900 dark:text-white text-sm outline-none font-sans font-medium"
                      placeholder="Nome do Paciente Avulso"
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] tracking-widest text-stone-400">Duração (Minutos)</label>
                    <input
                      type="number"
                      defaultValue={50}
                      disabled
                      className="w-full glass-input rounded-xl py-2.5 px-4 text-stone-400 dark:text-charcoal-600 text-sm outline-none font-sans font-medium bg-stone-100 dark:bg-charcoal-900/60"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] tracking-widest text-stone-400">Status Inicial</label>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as Appointment['status'])}
                      className="w-full glass-input rounded-xl py-2.5 px-4 text-charcoal-900 dark:text-white text-sm outline-none font-sans font-medium"
                    >
                      <option value="PENDING">Pendente</option>
                      <option value="CONFIRMED">Confirmada</option>
                      <option value="CANCELLED">Cancelada</option>
                      <option value="ABSENT">Faltou</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] tracking-widest text-stone-400">Valor da Consulta (R$)</label>
                    <input
                      type="number"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      className="w-full glass-input rounded-xl py-2.5 px-4 text-charcoal-900 dark:text-white text-sm outline-none font-sans font-medium"
                      placeholder="Ex: 150 (opcional)"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] tracking-widest text-stone-400">Anotações / Obs</label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full glass-input rounded-xl py-2.5 px-4 text-charcoal-900 dark:text-white text-sm outline-none font-sans font-medium"
                      placeholder="Ex: Trazer ficha..."
                    />
                  </div>
                </div>

                {/* Recurring Toggle Switch */}
                <div className="border border-[#e7e4dc] dark:border-charcoal-800 rounded-xl p-3 flex items-center justify-between">
                  <div className="space-y-0.5 text-left">
                    <span className="text-[10px] font-black uppercase tracking-wider text-stone-600 dark:text-charcoal-300 block">Repetir Semanalmente</span>
                    <span className="text-[8px] font-medium text-stone-400 dark:text-white block normal-case">
                      {repeatWeekly ? `Ativo (${repeatWeeks} sessões programadas)` : 'Agendar sequência de sessões'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    {repeatWeekly && (
                      <button
                        type="button"
                        onClick={() => setShowRecurrenceChoice(true)}
                        className="px-2 py-1 bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-charcoal-800 text-[8px] font-black uppercase tracking-wider rounded-lg hover:text-teal-600 dark:hover:text-teal-300 transition-colors"
                      >
                        Alterar
                      </button>
                    )}
                    <div
                      onClick={() => {
                        if (repeatWeekly) {
                          setRepeatWeekly(false);
                        } else {
                          setShowRecurrenceChoice(true);
                        }
                      }}
                      className={`w-9 h-5 rounded-full transition-colors relative cursor-pointer shrink-0 ${repeatWeekly ? 'bg-teal-500' : 'bg-stone-300 dark:bg-charcoal-700'}`}
                    >
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${repeatWeekly ? 'translate-x-4' : 'translate-x-0'}`} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-[#e7e4dc] dark:border-charcoal-800">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="px-4 py-2 bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-teal-800/60 text-stone-600 dark:text-charcoal-350 hover:text-charcoal-900 dark:text-white rounded-xl text-xs font-bold transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 uiverse-btn-gold text-charcoal-950 rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 uppercase"
                >
                  <UserPlus className="h-5 w-5" />
                  {repeatWeekly ? `Confirmar Agendamento (${repeatWeeks}x)` : 'Confirmar Agendamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- RECURRENCE SELECTION OVERLAY MODAL --- */}
      {showRecurrenceChoice && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-[99999] animate-fadeIn">
          <div className="max-w-xs w-full bg-white dark:bg-[#0c0c0e] border border-teal-500/30 dark:border-gold-500/25 rounded-3xl p-5 shadow-2xl animate-scaleIn text-left">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#e7e4dc] dark:border-charcoal-800 mb-4">
              <span className="text-[10px] font-black uppercase tracking-widest text-charcoal-900 dark:text-white">Período de Recorrência</span>
              <button 
                type="button" 
                onClick={() => setShowRecurrenceChoice(false)}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="space-y-2">
              {[
                { weeks: 4, label: '1 Mês (4 sessões)' },
                { weeks: 12, label: '3 Meses (12 sessões)' },
                { weeks: 24, label: '6 Meses (24 sessões)' },
                { weeks: 48, label: '1 Ano (48 sessões)' }
              ].map(preset => (
                <button
                  key={preset.weeks}
                  type="button"
                  onClick={() => {
                    setRepeatWeeks(preset.weeks);
                    setRepeatWeekly(true);
                    setShowRecurrenceChoice(false);
                  }}
                  className={`w-full py-2.5 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all ${
                    repeatWeekly && repeatWeeks === preset.weeks
                      ? 'uiverse-btn-gold border-gold-500 text-charcoal-950 shadow-md scale-[1.01]'
                      : 'bg-[#faf9f6]/20 dark:bg-[#112424] border-[#e7e4dc] dark:border-charcoal-800 hover:border-gold-550/20 text-stone-600 dark:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-[#e7e4dc] dark:border-charcoal-800/60">
              <button
                type="button"
                onClick={() => setShowRecurrenceChoice(false)}
                className="w-full py-2 bg-stone-100 hover:bg-stone-200 dark:bg-charcoal-900 dark:hover:bg-charcoal-800 border border-stone-200 dark:border-charcoal-800 text-stone-500 dark:text-white rounded-xl text-[9px] font-extrabold uppercase tracking-wider transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CUSTOM UNSCHEDULE OPTIONS MODAL (BULK CANCEL) --- */}
      {unscheduleState && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fadeIn">
          <div className="max-w-md w-full glass-panel rounded-3xl p-6 relative border border-teal-500/30 dark:border-gold-500/25 shadow-2xl animate-scaleIn text-left">
            <button 
              onClick={() => setUnscheduleState(null)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-teal-800/60 text-stone-600 dark:text-white hover:text-charcoal-900 dark:hover:text-white transition-all animate-none"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex gap-4 items-start">
              <div className="p-3 rounded-xl shrink-0 bg-red-500/10 border border-red-500/25 text-red-500">
                <AlertTriangle className="h-6 w-6" />
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-black uppercase tracking-wider text-charcoal-900 dark:text-white font-sans">
                  Desmarcar Atendimento
                </h3>
                <p className="text-xs text-stone-600 dark:text-charcoal-350 leading-relaxed font-sans normal-case font-medium">
                  Como deseja prosseguir com a desmarcação da sessão de <strong>{unscheduleState.patientName}</strong>?
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-6 pt-4 border-t border-[#e7e4dc] dark:border-charcoal-800">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await dbService.execute('DELETE FROM appointments WHERE id = ?', [unscheduleState.apptId]);
                    setUnscheduleState(null);
                    loadAppointments();
                  } catch (err) {
                    console.error('Erro ao desmarcar consulta:', err);
                  }
                }}
                className="w-full py-3 bg-[#f0ede6] hover:bg-[#faf9f6] dark:bg-charcoal-900 dark:hover:bg-charcoal-800 text-charcoal-900 dark:text-white font-extrabold border border-[#e7e4dc] dark:border-charcoal-800 rounded-xl text-[10px] transition-all uppercase tracking-wider"
              >
                Desmarcar apenas esta sessão
              </button>
              
              {unscheduleState.hasFuture && (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      if (unscheduleState.patientId) {
                        await dbService.execute(
                          'DELETE FROM appointments WHERE patient_id = ? AND date >= ?',
                          [unscheduleState.patientId, unscheduleState.apptDate]
                        );
                      } else {
                        await dbService.execute(
                          'DELETE FROM appointments WHERE patient_name = ? AND date >= ?',
                          [unscheduleState.patientName, unscheduleState.apptDate]
                        );
                      }
                      setUnscheduleState(null);
                      loadAppointments();
                    } catch (err) {
                      console.error('Erro ao desmarcar consultas em lote:', err);
                    }
                  }}
                  className="w-full py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/25 text-red-500 font-extrabold rounded-xl text-[10px] transition-all uppercase tracking-wider shadow-inner"
                >
                  Desmarcar esta e todas as sessões futuras
                </button>
              )}

              <button
                type="button"
                onClick={() => setUnscheduleState(null)}
                className="w-full py-2 bg-stone-100 hover:bg-stone-200 dark:bg-charcoal-950 dark:hover:bg-charcoal-900 border border-stone-200 dark:border-charcoal-800 text-stone-500 dark:text-white rounded-xl text-[9px] font-extrabold transition-all uppercase tracking-wider"
              >
                Voltar / Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
