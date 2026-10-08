import React, { useState, useEffect, useRef } from 'react';
import { dbService } from '../services/db';
import type { Patient } from '../services/db';
import { AcauaLogo } from './AcauaLogo';
import { Bell, Gift, AlertTriangle, X, CheckCheck, MessageSquare, ChevronRight } from 'lucide-react';

interface NotificationItem {
  id: string; // Ex: bday-1-2026-10-08 ou pkg-3-2
  type: 'BIRTHDAY' | 'PACKAGE';
  title: string;
  message: string;
  patientId: number;
  patientName: string;
  phone?: string;
  remainingSessions?: number;
}

interface NotificationMenuProps {
  onNavigate: (tab: string) => void;
  onSelectPatient: (patientId: number) => void;
}

export const NotificationMenu: React.FC<NotificationMenuProps> = ({ onNavigate, onSelectPatient }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [dismissedIds, setDismissedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('acaua_dismissed_notifications');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const menuRef = useRef<HTMLDivElement>(null);

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Carrega notificações (aniversários e pacotes expirando)
  const loadNotifications = async () => {
    try {
      const patients = await dbService.query<Patient>('SELECT id, name, birth_date, phone, billing_model, sessions_remaining FROM patients');
      const today = new Date();
      const todayStr = today.toISOString().slice(0, 10);
      const todayDay = today.getDate();
      const todayMonth = today.getMonth() + 1;

      const items: NotificationItem[] = [];

      patients.forEach(p => {
        // 1. Alerta de Aniversário
        if (p.birth_date) {
          const cleanDate = p.birth_date.replace(/\//g, '-');
          const parts = cleanDate.split('-');
          let isBday = false;
          if (parts.length === 3) {
            if (parts[0].length === 4) {
              isBday = Number(parts[1]) === todayMonth && Number(parts[2]) === todayDay;
            } else {
              isBday = Number(parts[1]) === todayMonth && Number(parts[0]) === todayDay;
            }
          }

          if (isBday) {
            items.push({
              id: `bday-${p.id}-${todayStr}`,
              type: 'BIRTHDAY',
              title: `Aniversário de ${p.name.split(' ')[0]} 🎉`,
              message: `Hoje é aniversário de ${p.name}! Envie uma mensagem com seus votos.`,
              patientId: p.id,
              patientName: p.name,
              phone: p.phone
            });
          }
        }

        // 2. Alerta de Pacote Expirando (<= 2 sessões restantes)
        if (p.billing_model === 'PACOTE' && p.sessions_remaining !== undefined && p.sessions_remaining <= 2) {
          const remaining = p.sessions_remaining;
          const remainingText = remaining === 0 
            ? 'Pacote encerrado (0 sessões restantes)' 
            : remaining === 1 
              ? 'Resta apenas 1 sessão no pacote' 
              : 'Restam apenas 2 sessões no pacote';

          items.push({
            id: `pkg-${p.id}-${remaining}`,
            type: 'PACKAGE',
            title: `Pacote Expirando: ${p.name.split(' ')[0]}`,
            message: `${remainingText}. Alinhe a renovação do plano.`,
            patientId: p.id,
            patientName: p.name,
            phone: p.phone,
            remainingSessions: remaining
          });
        }
      });

      setNotifications(items);
    } catch (err) {
      console.error('Erro ao buscar notificações:', err);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // atualiza a cada 30 segundos
    return () => clearInterval(interval);
  }, []);

  // Notificações ativas (que não foram dispensadas)
  const activeNotifications = notifications.filter(n => !dismissedIds.includes(n.id));
  const unreadCount = activeNotifications.length;

  const dismissNotification = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    localStorage.setItem('acaua_dismissed_notifications', JSON.stringify(updated));
  };

  const dismissAll = () => {
    const allIds = notifications.map(n => n.id);
    const updated = Array.from(new Set([...dismissedIds, ...allIds]));
    setDismissedIds(updated);
    localStorage.setItem('acaua_dismissed_notifications', JSON.stringify(updated));
  };

  const handleNotificationClick = (item: NotificationItem) => {
    // Ao clicar na notificação, leva ao paciente e a dispensa
    dismissNotification(item.id);
    onSelectPatient(item.patientId);
    setIsOpen(false);
  };

  return (
    <div className="relative shrink-0" ref={menuRef}>
      {/* Botão Interativo com Símbolo do Acauã e Badge de Alerta */}
      <button
        onClick={() => setIsOpen(prev => !prev)}
        className={`relative w-12 h-12 rounded-xl flex items-center justify-center transition-all group ${
          isOpen
            ? 'bg-teal-500/30 border border-teal-400 shadow-[0_0_20px_rgba(77,150,150,0.4)]'
            : 'bg-teal-500/20 hover:bg-teal-500/30 border border-teal-400/30 hover:border-teal-400/60 shadow-[0_0_15px_rgba(77,150,150,0.2)]'
        } p-2`}
        title={`Notificações e Alertas (${unreadCount})`}
      >
        <AcauaLogo className="w-8 h-8 text-teal-800 dark:text-white drop-shadow-[0_0_8px_rgba(114,176,176,0.6)] group-hover:scale-105 transition-transform" />

        {/* Ícone de Sininho / Badge de Alerta flutuante no canto */}
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-5 h-5 px-1 bg-amber-500 text-charcoal-950 font-black text-[10px] rounded-full shadow-lg ring-2 ring-[#f5f0e8] dark:ring-[#112424] animate-pulse">
            {unreadCount}
          </span>
        ) : (
          <span className="absolute -bottom-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-teal-600/80 text-white p-1 rounded-full text-[8px]">
            <Bell className="w-2.5 h-2.5" />
          </span>
        )}
      </button>

      {/* Dropdown Menu Flutuante de Notificações */}
      {isOpen && (
        <div className="absolute left-16 top-0 w-80 sm:w-96 bg-white dark:bg-[#112424] border border-teal-200/80 dark:border-teal-700/70 rounded-2xl shadow-2xl z-50 overflow-hidden animate-scaleIn text-left font-sans">
          {/* Cabeçalho */}
          <div className="p-4 border-b border-teal-200/50 dark:border-teal-800/50 flex items-center justify-between bg-teal-500/5 dark:bg-teal-900/30">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-teal-500/20 text-teal-700 dark:text-teal-300 rounded-lg">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-teal-900 dark:text-cream-300">
                  Notificações
                </h3>
                <span className="text-[10px] text-teal-700 dark:text-teal-400 font-bold">
                  {unreadCount === 0 ? 'Tudo em dia' : `${unreadCount} alerta${unreadCount > 1 ? 's' : ''} ativo${unreadCount > 1 ? 's' : ''}`}
                </span>
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={dismissAll}
                className="text-[10px] font-bold text-teal-600 dark:text-teal-400 hover:text-teal-800 dark:hover:text-cream-200 flex items-center gap-1 transition-colors px-2 py-1 rounded-lg hover:bg-teal-500/10"
                title="Limpar todas as notificações"
              >
                <CheckCheck className="w-3 h-3" />
                Limpar todas
              </button>
            )}
          </div>

          {/* Lista de Notificações */}
          <div className="max-h-96 overflow-y-auto p-3 space-y-2.5 divide-y divide-teal-100 dark:divide-teal-900/50">
            {activeNotifications.length === 0 ? (
              <div className="py-8 px-4 text-center space-y-2">
                <div className="w-10 h-10 bg-teal-500/10 border border-teal-500/20 text-teal-500 rounded-full flex items-center justify-center mx-auto">
                  <CheckCheck className="w-5 h-5 text-teal-400" />
                </div>
                <p className="text-xs font-bold text-teal-900 dark:text-white">
                  Nenhuma notificação no momento!
                </p>
                <p className="text-[10px] text-teal-700 dark:text-white">
                  Aniversários e avisos de renovação de pacotes aparecerão aqui.
                </p>
              </div>
            ) : (
              activeNotifications.map(item => (
                <div
                  key={item.id}
                  onClick={() => handleNotificationClick(item)}
                  className={`pt-2.5 first:pt-0 p-3 rounded-xl transition-all cursor-pointer group border ${
                    item.type === 'BIRTHDAY'
                      ? 'bg-emerald-500/5 hover:bg-emerald-500/10 border-emerald-500/20'
                      : 'bg-amber-500/5 hover:bg-amber-500/10 border-amber-500/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className={`p-2 rounded-xl shrink-0 mt-0.5 ${
                        item.type === 'BIRTHDAY'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : 'bg-amber-500/15 text-amber-500'
                      }`}>
                        {item.type === 'BIRTHDAY' ? (
                          <Gift className="w-4 h-4" />
                        ) : (
                          <AlertTriangle className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-[11px] font-black uppercase tracking-wider text-teal-900 dark:text-cream-300 truncate">
                          {item.title}
                        </h4>
                        <p className="text-[10.5px] text-teal-700 dark:text-white font-medium leading-relaxed mt-0.5">
                          {item.message}
                        </p>
                      </div>
                    </div>

                    {/* Botão de Dispensar (X) */}
                    <button
                      onClick={(e) => dismissNotification(item.id, e)}
                      className="p-1 text-stone-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors shrink-0"
                      title="Dispensar notificação"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Ações Rápidas na Notificação */}
                  <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-teal-100/60 dark:border-teal-800/40">
                    <span className="text-[9px] font-black uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                      Ver Paciente <ChevronRight className="w-3 h-3" />
                    </span>

                    {item.type === 'BIRTHDAY' && item.phone && (
                      <a
                        href={`https://web.whatsapp.com/send?phone=${item.phone.replace(/\D/g, '')}&text=${encodeURIComponent(`Olá, ${item.patientName.split(' ')[0]}! Passando para te desejar um feliz aniversário! Muita saúde, paz e realizações. Um abraço!`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                          dismissNotification(item.id);
                        }}
                        className="px-2 py-1 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1"
                      >
                        <MessageSquare className="w-2.5 h-2.5" />
                        Parabenizar
                      </a>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Rodapé com link para todos os pacientes */}
          <div className="p-2.5 bg-teal-500/5 dark:bg-teal-900/20 border-t border-teal-200/40 dark:border-teal-800/40 text-center">
            <button
              onClick={() => {
                onNavigate('pacientes');
                setIsOpen(false);
              }}
              className="text-[10px] font-black uppercase tracking-wider text-teal-700 dark:text-cream-300 hover:text-teal-900 dark:hover:text-cream-100 flex items-center justify-center gap-1.5 w-full py-1 hover:underline transition-all"
            >
              <span>Ver Prontuários e Pacientes</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
