import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../services/db';
import type { Appointment, Patient } from '../services/db';
import { ConfirmModal } from './ConfirmModal';
import {
  Trash2, CheckCircle2,
  XCircle, AlertCircle, HelpCircle, ChevronLeft, ChevronRight,
  Lock, Unlock, UserPlus, X, AlertTriangle,
  Calendar, Clock
} from 'lucide-react';

type CalendarView = 'day' | 'week' | 'month';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
const todayStr = () => toDateStr(new Date());

const addDays = (dateStr: string, n: number) => {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return toDateStr(d);
};

const getWeekStart = (dateStr: string) => {
  const d = new Date(dateStr + 'T12:00:00');
  const day = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - day);
  return toDateStr(d);
};

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 07-22
const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAYS_FULL = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// Cores 100% integradas à paleta Acauã (Teal, Amber/Gold, Emerald, Charcoal)
const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  CONFIRMED: {
    bg: 'bg-emerald-500/10 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-300 font-semibold',
    border: 'border-emerald-500/40 dark:border-emerald-400/50',
    dot: 'bg-emerald-500',
  },
  PENDING: {
    bg: 'bg-amber-500/10 dark:bg-amber-500/15',
    text: 'text-amber-700 dark:text-amber-300 font-semibold',
    border: 'border-amber-500/40 dark:border-amber-400/50',
    dot: 'bg-amber-500',
  },
  ABSENT: {
    bg: 'bg-red-500/10 dark:bg-red-500/15',
    text: 'text-red-700 dark:text-red-300 font-semibold',
    border: 'border-red-500/40 dark:border-red-400/50',
    dot: 'bg-red-500',
  },
  CANCELLED: {
    bg: 'bg-stone-500/10 dark:bg-charcoal-800/40',
    text: 'text-stone-600 dark:text-charcoal-400',
    border: 'border-stone-400/40 dark:border-charcoal-700/50',
    dot: 'bg-stone-400',
  },
};

const STATUS_LABELS: Record<string, string> = {
  CONFIRMED: 'Confirmada',
  PENDING: 'Pendente',
  ABSENT: 'Faltou',
  CANCELLED: 'Cancelada',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const ApptChip: React.FC<{
  appt: Appointment;
  isLocked?: boolean;
  onStatusChange: (id: number, s: Appointment['status']) => void;
  onDelete: (id: number) => void;
  patients: Patient[];
}> = ({ appt, isLocked, onStatusChange, onDelete, patients }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const style = isLocked ? STATUS_STYLES.CANCELLED : STATUS_STYLES[appt.status];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (isLocked) {
    return (
      <div className="rounded-lg px-2 py-1 text-xs border-l-2 border-red-400/60 bg-red-500/5 dark:bg-red-950/20 text-red-500/80 dark:text-red-400/80 italic flex items-center gap-1 select-none">
        <Lock className="h-3 w-3 shrink-0" />
        <span className="truncate">Trancado</span>
      </div>
    );
  }

  const pat = patients.find(p => p.id === appt.patient_id);
  const waMsg = pat?.phone
    ? `https://web.whatsapp.com/send?phone=${pat.phone.replace(/\D/g, '')}&text=${encodeURIComponent(`Olá, ${pat.name.split(' ')[0]}! Lembrete da nossa sessão marcada para ${new Date(appt.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric' })} às ${appt.time}.`)}`
    : null;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full rounded-lg px-2 py-1 text-left text-xs border-l-2 ${style.bg} ${style.text} ${style.border} hover:brightness-95 dark:hover:brightness-110 transition-all select-none shadow-sm`}
      >
        <div className="font-bold truncate">{appt.patient_name}</div>
        <div className="opacity-80 text-[10px]">{appt.time} · {STATUS_LABELS[appt.status]}</div>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-[#0c1a1a] border border-teal-200/60 dark:border-teal-700/60 rounded-xl shadow-2xl w-52 p-2 text-xs space-y-1 animate-fadeIn">
          <div className="px-2 py-1 font-bold text-charcoal-900 dark:text-white border-b border-teal-100 dark:border-teal-800/60 mb-1 truncate">
            {appt.patient_name}
          </div>
          <button onClick={() => { onStatusChange(appt.id, 'CONFIRMED'); setOpen(false); }} className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="h-3.5 w-3.5" /> Confirmar presença
          </button>
          <button onClick={() => { onStatusChange(appt.id, 'ABSENT'); setOpen(false); }} className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-red-500/10 text-red-600 dark:text-red-400 flex items-center gap-2">
            <XCircle className="h-3.5 w-3.5" /> Marcar falta
          </button>
          <button onClick={() => { onStatusChange(appt.id, 'CANCELLED'); setOpen(false); }} className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-stone-500/10 text-stone-600 dark:text-charcoal-350 flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5" /> Cancelar
          </button>
          {waMsg && (
            <a href={waMsg} target="_blank" rel="noopener noreferrer" className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-[#25D366]/10 text-[#25D366] flex items-center gap-2">
              <HelpCircle className="h-3.5 w-3.5" /> Lembrete WhatsApp
            </a>
          )}
          <div className="border-t border-teal-100 dark:border-teal-800/60 pt-1 mt-1">
            <button onClick={() => { onDelete(appt.id); setOpen(false); }} className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-red-500/10 text-red-500 flex items-center gap-2">
              <Trash2 className="h-3.5 w-3.5" /> Desmarcar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Booking Modal ────────────────────────────────────────────────────────────

const BookingModal: React.FC<{
  hour: string;
  date: string;
  patients: Patient[];
  onClose: () => void;
  onSave: (data: {
    patientId: number | '';
    customName: string;
    status: Appointment['status'];
    notes: string;
    customPrice: string;
    repeatWeekly: boolean;
    repeatWeeks: number;
  }) => void;
  onLock: (hour: string) => void;
}> = ({ hour, date, patients, onClose, onSave, onLock }) => {
  const [patientId, setPatientId] = useState<number | ''>('');
  const [customName, setCustomName] = useState('');
  const [status, setStatus] = useState<Appointment['status']>('PENDING');
  const [notes, setNotes] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [repeatWeekly, setRepeatWeekly] = useState(false);
  const [repeatWeeks, setRepeatWeeks] = useState(4);
  const [showRecurrence, setShowRecurrence] = useState(false);

  const label = new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-50 bg-white dark:bg-[#0c1a1a] rounded-3xl shadow-2xl w-full max-w-md border border-teal-200/50 dark:border-teal-800/60">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-teal-100 dark:border-teal-800/60">
          <div>
            <p className="text-xs text-teal-600 dark:text-teal-400 capitalize font-bold">{label}</p>
            <h3 className="text-base font-extrabold text-charcoal-900 dark:text-white flex items-center gap-2 mt-0.5 font-sans">
              <Clock className="h-4 w-4 text-teal-600 dark:text-teal-400" />
              {hour}:00 — Novo Agendamento
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onLock(hour)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-red-500/30 text-red-500 rounded-full hover:bg-red-500/10 transition-colors font-bold"
            >
              <Lock className="h-3 w-3" /> Trancar
            </button>
            <button onClick={onClose} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1 rounded-full hover:bg-stone-100 dark:hover:bg-teal-900/40 transition-colors">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-600 dark:text-charcoal-350 mb-1.5 uppercase tracking-wider text-[10px]">Paciente cadastrado</label>
            <select
              value={patientId}
              onChange={e => { setPatientId(e.target.value ? Number(e.target.value) : ''); if (e.target.value) setCustomName(''); }}
              className="w-full text-sm border border-[#e7e4dc] dark:border-teal-800/80 bg-[#fcfbf9] dark:bg-teal-900/30 text-charcoal-900 dark:text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="">— ou digite um nome avulso abaixo —</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {!patientId && (
            <div>
              <label className="block text-xs font-bold text-stone-600 dark:text-charcoal-350 mb-1.5 uppercase tracking-wider text-[10px]">Nome avulso</label>
              <input
                type="text"
                value={customName}
                onChange={e => setCustomName(e.target.value)}
                placeholder="Nome do paciente"
                className="w-full text-sm border border-[#e7e4dc] dark:border-teal-800/80 bg-[#fcfbf9] dark:bg-teal-900/30 text-charcoal-900 dark:text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-600 dark:text-charcoal-350 mb-1.5 uppercase tracking-wider text-[10px]">Status</label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as Appointment['status'])}
                className="w-full text-sm border border-[#e7e4dc] dark:border-teal-800/80 bg-[#fcfbf9] dark:bg-teal-900/30 text-charcoal-900 dark:text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="PENDING">Pendente</option>
                <option value="CONFIRMED">Confirmada</option>
                <option value="CANCELLED">Cancelada</option>
                <option value="ABSENT">Faltou</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-stone-600 dark:text-charcoal-350 mb-1.5 uppercase tracking-wider text-[10px]">Valor (R$)</label>
              <input
                type="number"
                value={customPrice}
                onChange={e => setCustomPrice(e.target.value)}
                placeholder="Ex: 150 (opcional)"
                className="w-full text-sm border border-[#e7e4dc] dark:border-teal-800/80 bg-[#fcfbf9] dark:bg-teal-900/30 text-charcoal-900 dark:text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-600 dark:text-charcoal-350 mb-1.5 uppercase tracking-wider text-[10px]">Observações</label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Ex: Trazer ficha..."
              className="w-full text-sm border border-[#e7e4dc] dark:border-teal-800/80 bg-[#fcfbf9] dark:bg-teal-900/30 text-charcoal-900 dark:text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          {/* Recorrência */}
          <div className="flex items-center justify-between py-2.5 border border-[#e7e4dc] dark:border-teal-800/60 rounded-xl px-3.5">
            <div>
              <p className="text-xs font-bold text-charcoal-900 dark:text-white">Repetir semanalmente</p>
              <p className="text-[11px] text-stone-400 dark:text-charcoal-400">
                {repeatWeekly ? `${repeatWeeks} sessões programadas` : 'Agendamento único'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {repeatWeekly && (
                <button
                  type="button"
                  onClick={() => setShowRecurrence(true)}
                  className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:underline"
                >
                  Alterar
                </button>
              )}
              <button
                type="button"
                onClick={() => { if (repeatWeekly) setRepeatWeekly(false); else setShowRecurrence(true); }}
                className={`relative w-10 h-5 rounded-full transition-colors ${repeatWeekly ? 'bg-teal-600' : 'bg-stone-300 dark:bg-charcoal-700'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${repeatWeekly ? 'translate-x-5' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 flex justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-stone-600 dark:text-charcoal-350 hover:bg-[#f0ede6] dark:hover:bg-charcoal-900 rounded-xl transition-colors border border-[#e7e4dc] dark:border-teal-800/60"
          >
            Cancelar
          </button>
          <button
            onClick={() => onSave({ patientId, customName, status, notes, customPrice, repeatWeekly, repeatWeeks })}
            className="px-5 py-2 text-xs font-black bg-teal-600 hover:bg-teal-500 text-white rounded-xl transition-all shadow-md flex items-center gap-2 uppercase tracking-wider"
          >
            <UserPlus className="h-4 w-4" />
            {repeatWeekly ? `Agendar (${repeatWeeks}x)` : 'Confirmar Agendamento'}
          </button>
        </div>
      </div>

      {/* Recurrence picker */}
      {showRecurrence && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRecurrence(false)} />
          <div className="relative z-[61] bg-white dark:bg-[#0c1a1a] rounded-3xl shadow-2xl w-64 border border-teal-200/50 dark:border-teal-800/60 p-5">
            <div className="flex items-center justify-between mb-3 border-b border-teal-100 dark:border-teal-800/60 pb-2">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-charcoal-900 dark:text-white">Recorrência</h4>
              <button onClick={() => setShowRecurrence(false)} className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              {[
                { weeks: 4, label: '1 mês — 4 sessões' },
                { weeks: 12, label: '3 meses — 12 sessões' },
                { weeks: 24, label: '6 meses — 24 sessões' },
                { weeks: 48, label: '1 ano — 48 sessões' },
              ].map(p => (
                <button
                  key={p.weeks}
                  onClick={() => { setRepeatWeeks(p.weeks); setRepeatWeekly(true); setShowRecurrence(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all ${repeatWeeks === p.weeks && repeatWeekly ? 'bg-teal-600 text-white shadow' : 'hover:bg-teal-50 dark:hover:bg-teal-900/30 text-stone-600 dark:text-charcoal-350'}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export const Agenda: React.FC = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(todayStr());
  const [view, setView] = useState<CalendarView>('week');

  const [showBooking, setShowBooking] = useState(false);
  const [selectedHour, setSelectedHour] = useState('');
  const [bookingDate, setBookingDate] = useState('');

  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean; title: string; message: string;
    onConfirm: () => void; type?: 'danger' | 'warning' | 'info';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const [unscheduleState, setUnscheduleState] = useState<{
    isOpen: boolean; apptId: number; patientId: number | null;
    patientName: string; apptDate: string; hasFuture: boolean;
  } | null>(null);

  useEffect(() => { loadAppointments(); loadPatients(); }, []);

  // ── Data ──────────────────────────────────────────────────────────────────

  const loadAppointments = async () => {
    try {
      const data = await dbService.query<Appointment>('SELECT * FROM appointments');
      setAppointments(data);
    } catch (err) { console.error('Erro ao carregar consultas:', err); }
  };

  const loadPatients = async () => {
    try {
      const data = await dbService.query<Patient>('SELECT id, name, phone FROM patients');
      setPatients(data);
    } catch (err) { console.error('Erro ao buscar pacientes:', err); }
  };

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleSaveBooking = async (data: {
    patientId: number | ''; customName: string; status: Appointment['status'];
    notes: string; customPrice: string; repeatWeekly: boolean; repeatWeeks: number;
  }) => {
    try {
      let name = data.customName.trim();
      if (data.patientId) {
        const p = patients.find(p => p.id === data.patientId);
        if (p) name = p.name;
      }
      if (!name) { alert('Selecione ou digite o nome do paciente.'); return; }

      const parsedPrice = data.customPrice.trim() ? parseFloat(data.customPrice) : null;
      const total = data.repeatWeekly ? data.repeatWeeks : 1;
      const timeStr = `${selectedHour}:00`;

      for (let i = 0; i < total; i++) {
        const base = new Date(bookingDate + 'T12:00:00');
        base.setDate(base.getDate() + i * 7);
        await dbService.execute(
          'INSERT INTO appointments (patient_id, patient_name, date, time, duration, status, notes, custom_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [data.patientId || null, name, toDateStr(base), timeStr, 50, data.status, data.notes, parsedPrice]
        );
      }
      setShowBooking(false);
      loadAppointments();
    } catch (err) { console.error('Erro ao gravar consulta:', err); }
  };

  const handleLockSlot = async (hour: string) => {
    try {
      await dbService.execute(
        'INSERT INTO appointments (patient_id, patient_name, date, time, duration, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [null, 'LOCKED', bookingDate, `${hour}:00`, 60, 'CANCELLED', 'Horário trancado pelo profissional']
      );
      setShowBooking(false);
      loadAppointments();
    } catch (err) { console.error('Erro ao trancar horário:', err); }
  };

  const handleQuickStatusChange = async (id: number, newStatus: Appointment['status']) => {
    try {
      const appt = appointments.find(a => a.id === id);
      if (!appt || appt.status === newStatus) return;

      await dbService.execute('UPDATE appointments SET status = ? WHERE id = ?', [newStatus, id]);

      if (newStatus === 'CONFIRMED' && appt.status !== 'CONFIRMED') {
        if (appt.patient_id) {
          const patRes = await dbService.query<Patient>(
            'SELECT id, name, billing_model, sessions_remaining, package_price, session_price FROM patients WHERE id = ?',
            [appt.patient_id]
          );
          if (patRes.length > 0) {
            const pat = patRes[0];
            if (pat.billing_model === 'PACOTE') {
              await dbService.execute('UPDATE patients SET sessions_remaining = ? WHERE id = ?', [Math.max(0, (pat.sessions_remaining || 0) - 1), pat.id]);
            } else {
              const price = appt.custom_price || pat.session_price || 150;
              await dbService.execute(
                'INSERT INTO finance (patient_id, type, category, description, amount, date, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [pat.id, 'INCOME', 'Sessão Clínica', `Consulta Avulsa (Pendente) - ${pat.name}`, price, appt.date, 'PENDING']
              );
            }
          }
        }
      } else if (newStatus !== 'CONFIRMED' && appt.status === 'CONFIRMED') {
        if (appt.patient_id) {
          const patRes = await dbService.query<Patient>(
            'SELECT id, name, billing_model, sessions_remaining FROM patients WHERE id = ?',
            [appt.patient_id]
          );
          if (patRes.length > 0) {
            const pat = patRes[0];
            if (pat.billing_model === 'PACOTE') {
              await dbService.execute('UPDATE patients SET sessions_remaining = ? WHERE id = ?', [(pat.sessions_remaining || 0) + 1, pat.id]);
            } else {
              const txs = await dbService.query<{ id: number }>(
                'SELECT id FROM finance WHERE patient_id = ? AND date = ? AND status = ? AND category = ?',
                [pat.id, appt.date, 'PENDING', 'Sessão Clínica']
              );
              if (txs.length > 0) await dbService.execute('DELETE FROM finance WHERE id = ?', [txs[txs.length - 1].id]);
            }
          }
        }
      }
      loadAppointments();
    } catch (err) { console.error('Erro ao alterar status:', err); }
  };

  const handleUnlockSlot = (apptId: number) => {
    setConfirmState({
      isOpen: true, title: 'Liberar Horário',
      message: 'Deseja realmente destrancar este horário?',
      onConfirm: async () => {
        await dbService.execute('DELETE FROM appointments WHERE id = ?', [apptId]);
        loadAppointments();
        setConfirmState(p => ({ ...p, isOpen: false }));
      }, type: 'warning',
    });
  };

  const handleDeleteAppt = (apptId: number) => {
    const appt = appointments.find(a => a.id === apptId);
    if (!appt) return;
    const hasFuture = appt.patient_id
      ? appointments.some(a => a.id !== apptId && a.patient_id === appt.patient_id && (a.date > appt.date || (a.date === appt.date && a.time > appt.time)))
      : appointments.some(a => a.id !== apptId && a.patient_name === appt.patient_name && (a.date > appt.date || (a.date === appt.date && a.time > appt.time)));
    setUnscheduleState({ isOpen: true, apptId, patientId: appt.patient_id || null, patientName: appt.patient_name, apptDate: appt.date, hasFuture });
  };

  // ── Navigation helpers ────────────────────────────────────────────────────

  const navigateMonth = (dir: 1 | -1) => {
    setCurrentDate(d => new Date(d.getFullYear(), d.getMonth() + dir, 1));
  };

  const navigatePeriod = (dir: 1 | -1) => {
    if (view === 'month') {
      navigateMonth(dir);
    } else if (view === 'week') {
      const ws = getWeekStart(selectedDateStr);
      const next = addDays(ws, dir * 7);
      setSelectedDateStr(next);
      setCurrentDate(new Date(next + 'T12:00:00'));
    } else {
      const next = addDays(selectedDateStr, dir);
      setSelectedDateStr(next);
      setCurrentDate(new Date(next + 'T12:00:00'));
    }
  };

  const goToday = () => {
    const t = todayStr();
    setSelectedDateStr(t);
    setCurrentDate(new Date());
  };

  // ── Calendar data ─────────────────────────────────────────────────────────

  const getDaysInMonth = () => {
    const y = currentDate.getFullYear();
    const m = currentDate.getMonth();
    const first = new Date(y, m, 1).getDay();
    const total = new Date(y, m + 1, 0).getDate();
    const days: (Date | null)[] = [];
    for (let i = 0; i < first; i++) days.push(null);
    for (let i = 1; i <= total; i++) days.push(new Date(y, m, i));
    return days;
  };

  const getWeekDays = () => {
    const ws = getWeekStart(selectedDateStr);
    return Array.from({ length: 7 }, (_, i) => addDays(ws, i));
  };

  const getApptForCell = (dateStr: string, hour: number) =>
    appointments.find(a => a.date === dateStr && parseInt(a.time.split(':')[0]) === hour);

  const getApptCountForDate = (dateStr: string) =>
    appointments.filter(a => a.date === dateStr && a.patient_name !== 'LOCKED').length;

  // ── Header label ──────────────────────────────────────────────────────────

  const headerLabel = (() => {
    if (view === 'month') {
      return currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    }
    if (view === 'week') {
      const days = getWeekDays();
      const first = new Date(days[0] + 'T12:00:00');
      const last = new Date(days[6] + 'T12:00:00');
      if (first.getMonth() === last.getMonth()) {
        return `${first.toLocaleDateString('pt-BR', { day: 'numeric' })} – ${last.toLocaleDateString('pt-BR', { day: 'numeric' })} de ${first.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`;
      }
      return `${first.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} – ${last.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
    }
    return new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  })();

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER (Acauã Dark Petrol & Cream Theme)
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col bg-white dark:bg-[#112424] text-charcoal-900 dark:text-cream-300 border border-teal-200/50 dark:border-teal-800/60 shadow-xl rounded-3xl animate-fadeIn overflow-hidden">
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(p => ({ ...p, isOpen: false }))}
        type={confirmState.type}
      />

      {/* ── TOP BAR ── */}
      <div className="flex items-center gap-3 px-5 py-3 border-b border-[#e7e4dc] dark:border-teal-800/60 shrink-0 bg-white dark:bg-[#112424]">
        <div className="flex items-center gap-2.5 flex-1">
          <div className="w-8 h-8 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
            <Calendar className="h-4 w-4 text-teal-600 dark:text-teal-400" />
          </div>
          <h2 className="text-base font-extrabold text-charcoal-900 dark:text-white capitalize font-sans tracking-wide">
            {headerLabel}
          </h2>
        </div>

        {/* View switcher (Dia, Semana, Mês) */}
        <div className="flex items-center bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-teal-800/60 rounded-xl p-0.5">
          {(['day', 'week', 'month'] as CalendarView[]).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${view === v ? 'bg-white dark:bg-teal-700 text-teal-800 dark:text-white shadow-sm' : 'text-stone-500 dark:text-charcoal-350 hover:text-teal-600 dark:hover:text-teal-300'}`}
            >
              {v === 'day' ? 'Dia' : v === 'week' ? 'Semana' : 'Mês'}
            </button>
          ))}
        </div>

        {/* Nav arrows + hoje */}
        <div className="flex items-center gap-1.5">
          <button onClick={() => navigatePeriod(-1)} className="p-1.5 bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-teal-800/60 hover:border-teal-500/40 text-stone-600 dark:text-charcoal-350 hover:text-teal-600 dark:hover:text-teal-300 rounded-xl transition-all">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={goToday} className="px-3 py-1.5 bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-teal-800/60 hover:border-teal-500/40 text-stone-600 dark:text-charcoal-350 hover:text-teal-600 dark:hover:text-teal-300 rounded-xl text-xs font-bold uppercase tracking-wider transition-all">
            Hoje
          </button>
          <button onClick={() => navigatePeriod(1)} className="p-1.5 bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-teal-800/60 hover:border-teal-500/40 text-stone-600 dark:text-charcoal-350 hover:text-teal-600 dark:hover:text-teal-300 rounded-xl transition-all">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* ── BODY: sidebar + main ── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* ── MINI CALENDAR SIDEBAR ── */}
        <aside className="w-60 shrink-0 border-r border-[#e7e4dc] dark:border-teal-800/60 p-4 flex flex-col gap-5 overflow-y-auto bg-[#faf9f6]/40 dark:bg-[#0e1f1f]/50">
          {/* Mini calendar */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-charcoal-900 dark:text-white capitalize">
                {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
              <div className="flex gap-1">
                <button onClick={() => navigateMonth(-1)} className="p-1 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/40 text-stone-400 hover:text-teal-600 dark:hover:text-teal-300 transition-colors">
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => navigateMonth(1)} className="p-1 rounded-lg hover:bg-teal-50 dark:hover:bg-teal-900/40 text-stone-400 hover:text-teal-600 dark:hover:text-teal-300 transition-colors">
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Mini grid header */}
            <div className="grid grid-cols-7 text-center mb-1.5">
              {WEEKDAYS_SHORT.map(d => (
                <span key={d} className="text-[9px] font-black uppercase tracking-wider text-stone-400 dark:text-teal-400/80">{d[0]}</span>
              ))}
            </div>

            {/* Mini grid days */}
            <div className="grid grid-cols-7 gap-y-1">
              {getDaysInMonth().map((day, idx) => {
                if (!day) return <div key={`e-${idx}`} />;
                const ds = toDateStr(day);
                const isToday = ds === todayStr();
                const isSel = ds === selectedDateStr;
                const hasAppts = getApptCountForDate(ds) > 0;
                return (
                  <button
                    key={ds}
                    onClick={() => { setSelectedDateStr(ds); setCurrentDate(day); if (view === 'month') setView('week'); }}
                    className={`relative flex items-center justify-center text-[11px] w-7 h-7 mx-auto rounded-xl transition-all font-bold ${
                      isSel 
                        ? 'bg-teal-600 dark:bg-teal-500 text-white shadow-sm font-extrabold' 
                        : isToday 
                          ? 'bg-teal-500/15 dark:bg-teal-500/25 text-teal-700 dark:text-teal-300 border border-teal-500/30' 
                          : 'text-stone-600 dark:text-charcoal-350 hover:bg-teal-50 dark:hover:bg-teal-900/40 hover:text-teal-600 dark:hover:text-teal-300'
                    }`}
                  >
                    {day.getDate()}
                    {hasAppts && !isSel && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-teal-500 dark:bg-teal-400 shadow-sm" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick day list */}
          <div className="flex-1 min-h-0 pt-3 border-t border-[#e7e4dc] dark:border-teal-800/60">
            <p className="text-[10px] font-black uppercase tracking-widest text-teal-600 dark:text-teal-300 mb-2.5">
              Agenda — {new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
            </p>
            <div className="space-y-1.5">
              {appointments
                .filter(a => a.date === selectedDateStr && a.patient_name !== 'LOCKED')
                .sort((a, b) => a.time.localeCompare(b.time))
                .map(appt => {
                  const s = STATUS_STYLES[appt.status];
                  return (
                    <div key={appt.id} className={`rounded-xl px-2.5 py-1.5 border-l-2 ${s.bg} ${s.border}`}>
                      <p className={`text-xs font-bold truncate ${s.text}`}>{appt.patient_name}</p>
                      <p className="text-[10px] text-stone-400 dark:text-charcoal-400 font-medium">{appt.time} · {STATUS_LABELS[appt.status]}</p>
                    </div>
                  );
                })
              }
              {appointments.filter(a => a.date === selectedDateStr && a.patient_name !== 'LOCKED').length === 0 && (
                <p className="text-[11px] text-stone-400 dark:text-charcoal-400 italic">Nenhum atendimento</p>
              )}
            </div>
          </div>
        </aside>

        {/* ── MAIN CALENDAR AREA ── */}
        <main className="flex-1 min-w-0 overflow-auto bg-white dark:bg-[#112424]">

          {/* ─ MONTH VIEW ─ */}
          {view === 'month' && (
            <div className="h-full flex flex-col">
              <div className="grid grid-cols-7 border-b border-[#e7e4dc] dark:border-teal-800/60 shrink-0 bg-[#faf9f6]/30 dark:bg-[#0e1f1f]/30">
                {WEEKDAYS_FULL.map(d => (
                  <div key={d} className="py-2.5 text-center text-[10px] font-black uppercase tracking-wider text-stone-500 dark:text-teal-400/80">{d}</div>
                ))}
              </div>
              <div className="flex-1 grid grid-cols-7 auto-rows-fr">
                {getDaysInMonth().map((day, idx) => {
                  if (!day) return <div key={`em-${idx}`} className="border-b border-r border-[#e7e4dc]/60 dark:border-teal-900/40 bg-[#fbf9f6]/20 dark:bg-charcoal-950/20" />;
                  const ds = toDateStr(day);
                  const isToday = ds === todayStr();
                  const isSel = ds === selectedDateStr;
                  const dayAppts = appointments.filter(a => a.date === ds && a.patient_name !== 'LOCKED').sort((a, b) => a.time.localeCompare(b.time));
                  return (
                    <div
                      key={ds}
                      onClick={() => { setSelectedDateStr(ds); setCurrentDate(day); }}
                      className={`border-b border-r border-[#e7e4dc]/60 dark:border-teal-900/40 p-1.5 cursor-pointer transition-colors hover:bg-teal-50/40 dark:hover:bg-teal-900/20 ${isSel ? 'bg-teal-50/60 dark:bg-teal-900/20' : ''}`}
                    >
                      <div className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-lg mb-1 ${isToday ? 'bg-teal-600 dark:bg-teal-500 text-white font-black' : isSel ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 font-black' : 'text-stone-600 dark:text-charcoal-350'}`}>
                        {day.getDate()}
                      </div>
                      <div className="space-y-1">
                        {dayAppts.slice(0, 3).map(appt => {
                          const s = STATUS_STYLES[appt.status];
                          return (
                            <div key={appt.id} className={`rounded-md px-1.5 py-0.5 text-[9px] truncate border-l-2 ${s.bg} ${s.text} ${s.border}`}>
                              {appt.time.slice(0, 5)} {appt.patient_name}
                            </div>
                          );
                        })}
                        {dayAppts.length > 3 && (
                          <div className="text-[9px] font-bold text-teal-600 dark:text-teal-400 pl-1">+{dayAppts.length - 3} mais</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─ WEEK VIEW ─ */}
          {view === 'week' && (
            <div className="h-full flex flex-col">
              <div className="grid border-b border-[#e7e4dc] dark:border-teal-800/60 shrink-0 bg-[#faf9f6]/30 dark:bg-[#0e1f1f]/30" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
                <div className="border-r border-[#e7e4dc] dark:border-teal-800/60" />
                {getWeekDays().map(ds => {
                  const d = new Date(ds + 'T12:00:00');
                  const isToday = ds === todayStr();
                  const isSel = ds === selectedDateStr;
                  return (
                    <button
                      key={ds}
                      onClick={() => setSelectedDateStr(ds)}
                      className={`py-2 text-center transition-colors hover:bg-teal-50/50 dark:hover:bg-teal-900/30 border-r border-[#e7e4dc] dark:border-teal-800/60 ${isSel ? 'bg-teal-50/60 dark:bg-teal-900/20' : ''}`}
                    >
                      <div className="text-[10px] font-black uppercase tracking-wider text-stone-400 dark:text-teal-400/80">{WEEKDAYS_SHORT[d.getDay()]}</div>
                      <div className={`text-sm font-extrabold w-8 h-8 flex items-center justify-center rounded-xl mx-auto mt-0.5 ${isToday ? 'bg-teal-600 dark:bg-teal-500 text-white shadow-sm' : isSel ? 'bg-teal-500/20 text-teal-700 dark:text-teal-300 font-black' : 'text-charcoal-900 dark:text-white'}`}>
                        {d.getDate()}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Time grid */}
              <div className="flex-1 overflow-y-auto">
                <div className="grid" style={{ gridTemplateColumns: '52px repeat(7, 1fr)' }}>
                  {HOURS.map(hour => (
                    <React.Fragment key={hour}>
                      <div className="border-r border-b border-[#e7e4dc]/60 dark:border-teal-900/40 py-1.5 pr-2.5 text-right text-[10px] font-bold text-stone-400 dark:text-teal-400/70 select-none sticky left-0 bg-white dark:bg-[#112424] z-10">
                        {hour}:00
                      </div>
                      {getWeekDays().map(ds => {
                        const appt = getApptForCell(ds, hour);
                        const isLocked = appt?.patient_name === 'LOCKED';
                        const isTodayCol = ds === todayStr();
                        return (
                          <div
                            key={ds}
                            onClick={() => { if (!appt) { setSelectedHour(String(hour).padStart(2, '0')); setBookingDate(ds); setShowBooking(true); } }}
                            className={`border-r border-b border-[#e7e4dc]/60 dark:border-teal-900/40 p-1 min-h-[54px] relative transition-colors ${!appt ? 'cursor-pointer hover:bg-teal-50/40 dark:hover:bg-teal-900/20' : ''} ${isTodayCol ? 'bg-teal-500/[0.03] dark:bg-teal-500/[0.04]' : ''}`}
                          >
                            {appt && (
                              isLocked ? (
                                <div className="h-full flex items-center gap-1 px-1.5 py-1 bg-red-500/5 dark:bg-red-950/20 rounded-lg text-[10px] text-red-500/80 dark:text-red-400/80 italic border border-dashed border-red-500/20">
                                  <Lock className="h-3 w-3 shrink-0" />
                                  <span>Trancado</span>
                                  <button onClick={e => { e.stopPropagation(); handleUnlockSlot(appt.id); }} className="ml-auto text-[9px] text-red-400 hover:text-red-600 flex items-center gap-0.5">
                                    <Unlock className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              ) : (
                                <ApptChip
                                  appt={appt}
                                  onStatusChange={handleQuickStatusChange}
                                  onDelete={handleDeleteAppt}
                                  patients={patients}
                                />
                              )
                            )}
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─ DAY VIEW ─ */}
          {view === 'day' && (
            <div className="h-full flex flex-col">
              <div className="border-b border-[#e7e4dc] dark:border-teal-800/60 py-3 px-6 shrink-0 bg-[#faf9f6]/30 dark:bg-[#0e1f1f]/30">
                <p className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">
                  {WEEKDAYS_FULL[new Date(selectedDateStr + 'T12:00:00').getDay()]}
                </p>
                <p className="text-xl font-extrabold text-charcoal-900 dark:text-white font-sans mt-0.5">
                  {new Date(selectedDateStr + 'T12:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>

              {/* Time slots */}
              <div className="flex-1 overflow-y-auto">
                <div className="grid" style={{ gridTemplateColumns: '64px 1fr' }}>
                  {HOURS.map(hour => {
                    const appt = getApptForCell(selectedDateStr, hour);
                    const isLocked = appt?.patient_name === 'LOCKED';
                    return (
                      <React.Fragment key={hour}>
                        <div className="border-r border-b border-[#e7e4dc]/60 dark:border-teal-900/40 py-2.5 pr-3 text-right text-[11px] font-bold text-stone-400 dark:text-teal-400/70 select-none bg-white dark:bg-[#112424]">
                          {hour}:00
                        </div>
                        <div
                          onClick={() => { if (!appt) { setSelectedHour(String(hour).padStart(2, '0')); setBookingDate(selectedDateStr); setShowBooking(true); } }}
                          className={`border-b border-[#e7e4dc]/60 dark:border-teal-900/40 p-1.5 min-h-[58px] ${!appt ? 'cursor-pointer hover:bg-teal-50/40 dark:hover:bg-teal-900/20' : ''}`}
                        >
                          {appt && (
                            isLocked ? (
                              <div className="h-full flex items-center gap-2 px-3.5 py-1.5 bg-red-500/5 dark:bg-red-950/20 border border-dashed border-red-500/20 rounded-xl text-xs text-red-500/80 italic">
                                <Lock className="h-3.5 w-3.5" />
                                <span>Horário trancado pelo profissional</span>
                                <button onClick={e => { e.stopPropagation(); handleUnlockSlot(appt.id); }} className="ml-auto flex items-center gap-1 text-red-400 hover:text-red-600 text-[10px] font-bold uppercase tracking-wider">
                                  <Unlock className="h-3 w-3" /> Liberar
                                </button>
                              </div>
                            ) : (
                              <div className={`rounded-xl px-3.5 py-2.5 border-l-4 ${STATUS_STYLES[appt.status].bg} ${STATUS_STYLES[appt.status].border} shadow-sm`}>
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <p className={`text-sm font-extrabold ${STATUS_STYLES[appt.status].text}`}>{appt.patient_name}</p>
                                    <p className="text-xs text-stone-500 dark:text-charcoal-400 mt-0.5 font-medium">
                                      {appt.time} · {STATUS_LABELS[appt.status]}
                                      {appt.custom_price ? ` · R$ ${appt.custom_price}` : ''}
                                    </p>
                                    {appt.notes && <p className="text-xs text-stone-400 dark:text-charcoal-400 italic mt-0.5 font-sans">Obs: {appt.notes}</p>}
                                  </div>
                                  <div className="flex gap-1.5 shrink-0">
                                    <button onClick={() => handleQuickStatusChange(appt.id, 'CONFIRMED')} title="Confirmar" className="px-2 py-1 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-xs font-bold transition-all">
                                      Presente
                                    </button>
                                    <button onClick={() => handleQuickStatusChange(appt.id, 'ABSENT')} title="Falta" className="px-2 py-1 text-red-600 dark:text-red-400 hover:bg-red-500/10 border border-red-500/20 rounded-lg text-xs font-bold transition-all">
                                      Falta
                                    </button>
                                    <button onClick={() => handleDeleteAppt(appt.id)} title="Desmarcar" className="p-1.5 text-stone-400 hover:text-red-500 hover:bg-red-500/10 border border-[#e7e4dc] dark:border-teal-800/60 rounded-lg transition-colors">
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                                {/* WhatsApp link */}
                                {(() => {
                                  const pat = patients.find(p => p.id === appt.patient_id);
                                  if (!pat?.phone) return null;
                                  const msg = `Olá, ${pat.name.split(' ')[0]}! Lembrete da nossa sessão marcada para ${new Date(appt.date + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'numeric' })} às ${appt.time}. Aguardo você!`;
                                  return (
                                    <a
                                      href={`https://web.whatsapp.com/send?phone=${pat.phone.replace(/\D/g, '')}&text=${encodeURIComponent(msg)}`}
                                      target="_blank" rel="noopener noreferrer"
                                      className="mt-2 inline-flex items-center gap-1.5 text-[11px] font-bold text-[#25D366] hover:underline"
                                    >
                                      Lembrete WhatsApp →
                                    </a>
                                  );
                                })()}
                              </div>
                            )
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── BOOKING MODAL ── */}
      {showBooking && (
        <BookingModal
          hour={selectedHour}
          date={bookingDate}
          patients={patients}
          onClose={() => setShowBooking(false)}
          onSave={handleSaveBooking}
          onLock={handleLockSlot}
        />
      )}

      {/* ── UNSCHEDULE MODAL ── */}
      {unscheduleState && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-[#0c1a1a] rounded-3xl shadow-2xl w-full max-w-sm border border-teal-200/50 dark:border-teal-800/60 p-6">
            <div className="flex gap-3.5 items-start mb-5">
              <div className="p-2.5 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-charcoal-900 dark:text-white text-sm font-sans">Desmarcar Atendimento</h3>
                <p className="text-xs text-stone-500 dark:text-charcoal-350 mt-1">
                  Como deseja prosseguir com a desmarcação da sessão de <strong>{unscheduleState.patientName}</strong>?
                </p>
              </div>
            </div>
            <div className="space-y-2">
              <button
                onClick={async () => {
                  await dbService.execute('DELETE FROM appointments WHERE id = ?', [unscheduleState.apptId]);
                  setUnscheduleState(null);
                  loadAppointments();
                }}
                className="w-full py-2.5 text-xs font-bold border border-[#e7e4dc] dark:border-teal-800/60 rounded-xl hover:bg-[#f0ede6] dark:hover:bg-teal-900/30 text-charcoal-900 dark:text-white transition-colors uppercase tracking-wider"
              >
                Desmarcar apenas esta sessão
              </button>
              {unscheduleState.hasFuture && (
                <button
                  onClick={async () => {
                    if (unscheduleState.patientId) {
                      await dbService.execute('DELETE FROM appointments WHERE patient_id = ? AND date >= ?', [unscheduleState.patientId, unscheduleState.apptDate]);
                    } else {
                      await dbService.execute('DELETE FROM appointments WHERE patient_name = ? AND date >= ?', [unscheduleState.patientName, unscheduleState.apptDate]);
                    }
                    setUnscheduleState(null);
                    loadAppointments();
                  }}
                  className="w-full py-2.5 text-xs font-bold bg-red-500/10 border border-red-500/25 rounded-xl hover:bg-red-500/20 text-red-500 transition-colors uppercase tracking-wider"
                >
                  Desmarcar esta e todas as futuras
                </button>
              )}
              <button
                onClick={() => setUnscheduleState(null)}
                className="w-full py-2 text-xs text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 transition-colors font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
