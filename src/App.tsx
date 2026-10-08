import { useState, useEffect, useRef } from 'react';
import { dbService, isDemoWeb } from './services/db';
import type { ProfessionalConfig } from './services/db';
import { LockScreen } from './components/LockScreen';
import { Dashboard } from './components/Dashboard';
import { Patients } from './components/Patients';
import { Kanban } from './components/Kanban';
import { DailyTracker } from './components/DailyTracker';
import { Agenda } from './components/Agenda';
import { Finance } from './components/Finance';
import { Documents } from './components/Documents';
import { Settings } from './components/Settings';
import { TourGuide } from './components/TourGuide';
import { Notas } from './components/Notas';
import { DotField } from './components/DotField';
import { NotificationMenu } from './components/NotificationMenu';
import { gsapAnimations } from './utils/gsapAnimations';

import { 
  LayoutDashboard, Users, Calendar, DollarSign, FileText, Settings as SettingsIcon, 
  Lock, ChevronRight, Menu, X, Kanban as KanbanIcon, ListTodo,
  Play, Pause, RotateCcw, Keyboard, StickyNote
} from 'lucide-react';

function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [splashProgress, setSplashProgress] = useState(0);
  const [splashMessage, setSplashMessage] = useState('Inicializando cofre de segurança...');
  const [professional, setProfessional] = useState<ProfessionalConfig | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);
  
  // Mobile sidebar toggle
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Bottom Profile Dropdown state
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  // Main content container ref for GSAP tab transitions
  const mainContentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (mainContentRef.current) {
      gsapAnimations.animatePageTransition(mainContentRef.current);
    }
  }, [activeTab]);

  // Auto-lock timer ref
  const timerRef = useRef<any>(null);

  // --- SESSION TIMER STATE & EFFECT ---
  const [seconds, setSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerMenuOpen, setTimerMenuOpen] = useState(false);

  // --- KEYBOARD SHORTCUTS MODAL ---
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [customShortcuts, setCustomShortcuts] = useState(() => {
    const saved = localStorage.getItem('acaua_custom_shortcuts') || localStorage.getItem('psi_crm_custom_shortcuts');
    if (saved) {
      try { return JSON.parse(saved); } catch(e) {}
    }
    return {
      timer: 'Space',
      lock: 'Ctrl + L',
      shortcuts: '?',
      tab1: 'Ctrl + 1',
      tab2: 'Ctrl + 2',
      tab3: 'Ctrl + 3',
      tab4: 'Ctrl + 4',
      tab5: 'Ctrl + 5',
      tab6: 'Ctrl + 6',
      tab7: 'Ctrl + 7',
      tab8: 'Ctrl + 8',
    };
  });

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('acaua_custom_shortcuts') || localStorage.getItem('psi_crm_custom_shortcuts');
      if (saved) {
        try { setCustomShortcuts(JSON.parse(saved)); } catch(e) {}
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // --- TOUR GUIDE STATE ---
  const [showTour, setShowTour] = useState(false);
  const [tourDone, setTourDone] = useState(() => (localStorage.getItem('acaua_tour_done') || localStorage.getItem('psi_crm_tour_done')) === '1');

  useEffect(() => {
    let interval: any = null;
    if (timerRunning) {
      interval = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (interval) clearInterval(interval);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timerRunning]);

  // Efeito para sincronizar classe .dark no HTML de acordo com a preferência do usuário e cache local
  useEffect(() => {
    const cachedTheme = localStorage.getItem('acaua_theme') || localStorage.getItem('psi_crm_theme') || 'dark';
    const activeTheme = professional?.theme || cachedTheme;
    if (activeTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [professional?.theme]);

  // Carrega configuração caso o banco seja desbloqueado
  const loadConfig = async () => {
    try {
      const res = await dbService.query<any>('SELECT * FROM config');
      if (res.length > 0) {
        const dbTheme = res[0].theme || 'dark';
        setProfessional({
          name: res[0].name,
          crp: res[0].crp,
          contact: res[0].contact,
          autoLockTime: res[0].auto_lock_time || 5,
          theme: dbTheme
        });
        localStorage.setItem('acaua_theme', dbTheme);
      } else {
        setProfessional(null); // Vai acionar a tela de setup
      }
    } catch (err) {
      console.error('Erro ao ler configuração:', err);
    }
  };

  const handleUnlock = () => {
    setShowSplash(true);
    setSplashProgress(0);
    setSplashMessage('Inicializando cofre de segurança e chaves AES-256...');
    
    const startTime = Date.now();
    const duration = isDemoWeb() ? 800 : 6000; // 6s padrão sincronizado ao motion, 800ms apenas na demo pública web

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, Math.floor((elapsed / duration) * 100));
      setSplashProgress(progress);

      if (progress < 20) {
        setSplashMessage('Inicializando cofre de segurança e chaves AES-256...');
      } else if (progress < 40) {
        setSplashMessage('Desencriptando banco de dados local SQLite...');
      } else if (progress < 65) {
        setSplashMessage('Verificando assinaturas digitais de prontuários...');
      } else if (progress < 85) {
        setSplashMessage('Carregando agenda, consultas e histórico clínico...');
      } else if (progress < 100) {
        setSplashMessage('Sincronizando ambiente clínico seguro...');
      } else {
        setSplashMessage('Acesso autorizado. Iniciando espaço...');
      }

      if (elapsed >= duration) {
        clearInterval(interval);
        setSplashProgress(100);
        setIsFadingOut(true);
        setTimeout(() => {
          setIsUnlocked(true);
          setShowSplash(false);
          setIsFadingOut(false);
          loadConfig();
        }, 300); // Wait for the fade-out CSS animation (300ms)
      }
    }, 50);
  };

  const handleLock = async () => {
    setIsUnlocked(false);
    setProfessional(null);
    setProfileMenuOpen(false);
    await dbService.close();
  };

  // --- AUTO-LOCK (INATIVIDADE) IMPLEMENTATION ---
  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    
    if (!isUnlocked || !professional) return;

    const lockTimeMs = professional.autoLockTime * 60 * 1000;
    
    timerRef.current = setTimeout(() => {
      console.log('Bloqueio automático por inatividade acionado.');
      handleLock();
    }, lockTimeMs);
  };

  useEffect(() => {
    if (isUnlocked && professional) {
      const events = ['mousemove', 'mousedown', 'keypress', 'touchstart', 'scroll'];
      
      const handleActivity = () => {
        resetTimer();
      };

      events.forEach(evt => window.addEventListener(evt, handleActivity));
      
      resetTimer();

      return () => {
        events.forEach(evt => window.removeEventListener(evt, handleActivity));
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }
  }, [isUnlocked, professional]);

  // --- KEYBOARD SHORTCUTS ---
  useEffect(() => {
    if (!isUnlocked) return;

    const matchShortcut = (e: KeyboardEvent, shortcutStr: string): boolean => {
      if (!shortcutStr) return false;
      const parts = shortcutStr.toLowerCase().split('+').map(p => p.trim());
      const needsCtrl = parts.includes('ctrl');
      const needsAlt = parts.includes('alt');
      const needsShift = parts.includes('shift');
      
      if (needsCtrl && !e.ctrlKey) return false;
      if (needsAlt && !e.altKey) return false;
      if (needsShift && !e.shiftKey) return false;
      
      const keyPart = parts.find(p => !['ctrl', 'alt', 'shift'].includes(p));
      if (!keyPart) return false;
      
      let pressedKey = e.key.toLowerCase();
      if (pressedKey === ' ') pressedKey = 'space';
      if (pressedKey === 'arrowup') pressedKey = 'up';
      if (pressedKey === 'arrowdown') pressedKey = 'down';
      if (pressedKey === 'arrowleft') pressedKey = 'left';
      if (pressedKey === 'arrowright') pressedKey = 'right';
      
      return pressedKey === keyPart;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(tag);

      // Escape -> fecha popovers/modais
      if (e.key === 'Escape') {
        setTimerMenuOpen(false);
        setProfileMenuOpen(false);
        setSidebarOpen(false);
        setShowShortcuts(false);
        return;
      }

      // '?' -> abre lista de atalhos
      if (matchShortcut(e, customShortcuts.shortcuts) && !isInput) {
        setShowShortcuts(prev => !prev);
        return;
      }

      // Space -> play/pause cronômetro (fora de inputs)
      if (matchShortcut(e, customShortcuts.timer) && !isInput) {
        e.preventDefault();
        setTimerRunning(prev => !prev);
        return;
      }

      // Ctrl+L -> bloquear app
      if (matchShortcut(e, customShortcuts.lock)) {
        e.preventDefault();
        handleLock();
        return;
      }

      // Tab mapping Ctrl+1..8 -> trocar aba
      const tabKeys = ['tab1', 'tab2', 'tab3', 'tab4', 'tab5', 'tab6', 'tab7', 'tab8'];
      const tabs = ['dashboard', 'pacientes', 'agenda', 'financeiro', 'tarefas', 'kanban', 'notas', 'documentos'];
      for (let i = 0; i < tabKeys.length; i++) {
        const keyConfig = customShortcuts[tabKeys[i] as keyof typeof customShortcuts];
        if (matchShortcut(e, keyConfig)) {
          e.preventDefault();
          handleTabChange(tabs[i]);
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isUnlocked, timerRunning, customShortcuts]);

  // --- AUTO-SHOW TOUR ON FIRST LOGIN ---
  useEffect(() => {
    if (isUnlocked && !tourDone) {
      const t = setTimeout(() => setShowTour(true), 800);
      return () => clearTimeout(t);
    }
  }, [isUnlocked, tourDone]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    setSelectedPatientId(null);
    setSidebarOpen(false);
    setProfileMenuOpen(false);
  };

  const handleSelectPatientFromDashboard = (patientId: number) => {
    setSelectedPatientId(patientId);
    setActiveTab('pacientes');
  };

  const renderContent = () => {
    if (!professional) return null;

    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            onNavigate={handleTabChange}
            onSelectPatient={handleSelectPatientFromDashboard}
          />
        );
      case 'pacientes':
        return (
          <Patients 
            selectedPatientId={selectedPatientId}
            onClearPatientSelection={() => setSelectedPatientId(null)}
            professionalName={professional.name}
            professionalCrp={professional.crp}
            professionalContact={professional.contact}
          />
        );
      case 'kanban':
        return <Kanban onSelectPatient={handleSelectPatientFromDashboard} />;
      case 'tarefas':
        return (
          <DailyTracker 
            onNavigate={handleTabChange} 
            onSelectPatient={handleSelectPatientFromDashboard} 
          />
        );
      case 'agenda':
        return <Agenda />;
      case 'financeiro':
        return <Finance />;
      case 'notas':
        return <Notas />;
      case 'documentos':
        return (
          <Documents 
            professionalName={professional.name}
            professionalCrp={professional.crp}
            professionalContact={professional.contact}
          />
        );
      case 'configuracoes':
        return (
          <Settings 
            config={professional}
            onUpdateConfig={(newConf) => setProfessional(newConf)}
            onRestartTour={() => { setTourDone(false); setShowTour(true); }}
            onShowShortcuts={() => setShowShortcuts(true)}
          />
        );
      default:
        return <Dashboard onNavigate={handleTabChange} onSelectPatient={handleSelectPatientFromDashboard} />;
    }
  };

  if (!isUnlocked) {
    if (showSplash) {
      return (
        <div className={`fixed inset-0 z-[999] w-screen h-screen bg-black overflow-hidden select-none flex flex-col justify-end transition-all duration-300 ${isFadingOut ? 'animate-fadeOut' : ''}`}>
          {/* Fullscreen Motion Video */}
          <video
            src={`${import.meta.env.BASE_URL}vid/motion2.mp4`}
            autoPlay
            muted
            playsInline
            className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
          />

          {/* Bottom subtle dark gradient overlay for crystal clear contrast */}
          <div className="absolute inset-x-0 bottom-0 h-52 bg-gradient-to-t from-black/90 via-black/40 to-transparent pointer-events-none" />

          {/* Bottom Floating Progress Bar HUD */}
          <div className="relative z-10 w-full max-w-xl mx-auto p-6 sm:p-8 pb-10 sm:pb-12 space-y-3.5">
            <div className="h-2 w-full bg-white/15 backdrop-blur-md rounded-full overflow-hidden relative border border-white/10 shadow-2xl">
              <div 
                className="h-full bg-gradient-to-r from-teal-600 via-teal-300 to-white rounded-full transition-all duration-150 ease-out shadow-[0_0_15px_rgba(114,176,176,0.9)]"
                style={{ width: `${splashProgress}%` }}
              ></div>
            </div>
            
            <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-wider text-white drop-shadow-md">
              <span className="animate-pulse text-left pr-2 font-sans tracking-widest text-white/90">{splashMessage}</span>
              <span className="text-teal-300 shrink-0 font-mono font-bold text-xs">{splashProgress}%</span>
            </div>
          </div>
        </div>
      );
    }
    return <LockScreen onUnlock={handleUnlock} />;
  }

  const tabTitles: { [key: string]: string } = {
    dashboard: 'Painel Geral',
    pacientes: 'Pacientes e Prontuários',
    kanban: 'Jornada Clínica',
    tarefas: 'Tarefas do Dia',
    agenda: 'Agenda',
    financeiro: 'Financeiro',
    notas: 'Bloco de Notas',
    documentos: 'Documentos',
    configuracoes: 'Configurações'
  };

  const menuItems = [
    { id: 'dashboard', label: 'Painel Geral', icon: <LayoutDashboard className="h-5 w-5 shrink-0" /> },
    { id: 'pacientes', label: 'Pacientes', icon: <Users className="h-5 w-5 shrink-0" /> },
    { id: 'agenda', label: 'Agenda', icon: <Calendar className="h-5 w-5 shrink-0" /> },
    { id: 'financeiro', label: 'Financeiro', icon: <DollarSign className="h-5 w-5 shrink-0" /> },
    { id: 'tarefas', label: 'Tarefas do Dia', icon: <ListTodo className="h-5 w-5 shrink-0" /> },
    { id: 'kanban', label: 'Jornada Clínica', icon: <KanbanIcon className="h-5 w-5 shrink-0" /> },
    { id: 'notas', label: 'Bloco de Notas', icon: <StickyNote className="h-5 w-5 shrink-0" /> },
    { id: 'documentos', label: 'Documentos', icon: <FileText className="h-5 w-5 shrink-0" /> }
  ];

  return (
    <div className="min-h-screen bg-primary flex text-charcoal-800 dark:text-charcoal-100 font-sans antialiased overflow-hidden relative transition-colors duration-300">
      {/* React Bits Interactive Canvas Dot Field Background */}
      <DotField />

      {/* Tour Guide */}
      {showTour && (
        <TourGuide
          onClose={() => {
            setShowTour(false);
            setTourDone(true);
            localStorage.setItem('acaua_tour_done', '1');
          }}
          onNavigate={handleTabChange}
        />
      )}

      {/* Keyboard Shortcuts Modal */}
      {showShortcuts && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setShowShortcuts(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-cream-200 dark:bg-teal-900 border border-teal-200/60 dark:border-teal-700/50 rounded-3xl p-6 shadow-2xl w-full max-w-sm animate-scaleIn" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <Keyboard className="h-4 w-4 text-teal-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-teal-900 dark:text-cream-300">Atalhos de Teclado</span>
              </div>
              <button onClick={() => setShowShortcuts(false)} className="text-stone-400 hover:text-stone-700 dark:hover:text-cream-200 transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-1.5">
              {[
                { keys: [customShortcuts.tab1.replace('1', '1-8')], desc: 'Navegar entre módulos' },
                { keys: [customShortcuts.timer], desc: 'Play / Pause do cronômetro' },
                { keys: [customShortcuts.lock], desc: 'Bloquear o app' },
                { keys: ['Esc'], desc: 'Fechar popovers e modais' },
                { keys: [customShortcuts.shortcuts], desc: 'Abrir/fechar esta lista' },
              ].map(({ keys, desc }) => (
                <div key={desc} className="flex items-center justify-between py-1.5 border-b border-teal-200/40 dark:border-teal-800/40 last:border-0">
                  <span className="text-[10px] font-semibold text-teal-600 dark:text-white font-sans">{desc}</span>
                  <div className="flex items-center gap-1">
                    {keys.flatMap(k => k.split('+').map((part: string) => part.trim())).map((k, idx) => (
                      <kbd key={idx} className="px-2 py-0.5 text-[9px] font-black font-mono bg-teal-100 dark:bg-teal-800 text-teal-800 dark:text-cream-400 rounded-md border border-teal-200 dark:border-teal-700">{k}</kbd>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile Menu Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/75 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* --- SIDEBAR NAV (PERMANENT w-20 SIDEBAR) --- */}
      <aside 
        className={`fixed inset-y-0 left-0 w-20 bg-[#f5f0e8] dark:bg-[#112424] border-r border-teal-200/50 dark:border-teal-800/50 p-4 flex flex-col justify-between z-50 transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo Header (Top) com Central de Notificações */}
        <div className="flex items-center justify-center w-full relative shrink-0">
          <NotificationMenu 
            onNavigate={handleTabChange}
            onSelectPatient={handleSelectPatientFromDashboard}
          />

          {/* Mobile close button */}
          {sidebarOpen && (
            <button 
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden absolute -right-2 top-1 p-2 text-teal-700 dark:text-white hover:text-teal-900 dark:hover:text-cream-200"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Navigation Links & Timer (Centered in the middle) */}
        <nav className="my-auto py-2 space-y-2 text-[11px] font-bold uppercase tracking-wider w-full flex flex-col items-center justify-center">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`nav-${item.id}`}
                onClick={() => handleTabChange(item.id)}
                className={`w-full flex items-center justify-center py-3 rounded-xl transition-all group relative ${
                  isActive
                    ? 'bg-teal-gradient text-cream-100 font-black shadow-lg shadow-teal-500/20'
                    : 'text-teal-700 dark:text-white hover:text-teal-900 dark:hover:text-cream-300 hover:bg-teal-100/50 dark:hover:bg-teal-800/40'
                }`}
              >
                {item.icon}

                {/* Delayed CSS Tooltip */}
                <div className="absolute left-16 bg-[#f5f0e8] dark:bg-[#0a1717] border border-teal-400/25 text-teal-900 dark:text-cream-300 text-[10px] font-bold uppercase tracking-wider px-3.5 py-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-0 group-hover:delay-300 pointer-events-none z-50 shadow-2xl whitespace-nowrap">
                  {item.label}
                </div>
              </button>
            );
          })}

          {/* Session Timer Widget */}
          <div id="session-timer" className="relative flex flex-col items-center w-full pt-1">
            <button
              onClick={() => setTimerMenuOpen(!timerMenuOpen)}
              className={`w-11 rounded-xl border flex flex-col items-center justify-center py-1.5 transition-all cursor-pointer ${
                timerRunning
                  ? seconds >= 3600
                    ? 'bg-red-500/5 border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.12)]'
                    : 'bg-teal-500/15 border-teal-400/40 shadow-[0_0_12px_rgba(77,150,150,0.15)]'
                  : 'bg-[#fcfbf9] dark:bg-[#0a1717] border-teal-200/60 dark:border-teal-800/60 hover:border-teal-400/30'
              }`}
            >
              {(() => {
                const hrs = Math.floor(seconds / 3600);
                const mins = Math.floor((seconds % 3600) / 60);
                const secs = seconds % 60;
                const pad = (n: number) => String(n).padStart(2, '0');
                const isOverHour = hrs > 0;
                if (isOverHour) {
                  return (
                    <>
                      <span className={`text-lg font-black font-mono leading-none ${timerRunning ? 'text-red-500' : 'text-stone-500 dark:text-white'}`}>{pad(hrs)}</span>
                      <span className={`text-[8px] font-bold font-mono leading-none mt-0.5 ${timerRunning ? 'text-red-400/70' : 'text-stone-400 dark:text-white'}`}>{pad(mins)}:{pad(secs)}</span>
                    </>
                  );
                }
                return (
                  <>
                    <span className={`text-lg font-black font-mono leading-none ${timerRunning ? 'text-teal-600 dark:text-teal-300' : 'text-stone-500 dark:text-white'}`}>{pad(mins)}</span>
                    <span className={`text-lg font-black font-mono leading-none ${timerRunning ? 'text-teal-600/70 dark:text-teal-300/70' : 'text-stone-400 dark:text-white'}`}>{pad(secs)}</span>
                  </>
                );
              })()}
            </button>

            {timerMenuOpen && (
              <div className="absolute left-14 bottom-0 bg-[#f5f0e8] dark:bg-[#0a1717] border border-teal-400/25 rounded-xl p-1.5 shadow-2xl z-50 animate-scaleIn w-28 flex flex-col gap-1 text-left">
                <button
                  type="button"
                  onClick={() => {
                    setTimerRunning(!timerRunning);
                    setTimerMenuOpen(false);
                  }}
                  className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-teal-800 dark:text-cream-300 hover:text-teal-950 hover:bg-teal-100/60 dark:hover:text-cream-200 dark:hover:bg-teal-800/45 rounded-lg transition-all"
                >
                  {timerRunning ? (
                    <>
                      <Pause className="h-3 w-3 text-teal-600 dark:text-teal-300" />
                      Pausar
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 text-teal-600 dark:text-teal-300" />
                      Iniciar
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSeconds(0);
                    setTimerRunning(false);
                    setTimerMenuOpen(false);
                  }}
                  className="w-full text-left flex items-center gap-2 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-wider text-teal-700 dark:text-white hover:text-teal-950 hover:bg-teal-100/60 dark:hover:text-cream-200 dark:hover:bg-teal-800/45 rounded-lg transition-all"
                >
                  <RotateCcw className="h-3 w-3 text-stone-400" />
                  Zerar
                </button>
              </div>
            )}
          </div>
        </nav>

        {/* --- BOTTOM PROFILE DROPDOWN MENU --- */}
        <div className="relative pt-2 border-t border-teal-200/50 dark:border-teal-800/50 w-full flex justify-center shrink-0">
          
          {/* Popover options list */}
          {profileMenuOpen && (
            <div className="absolute bottom-16 left-0 bg-[#f5f0e8] dark:bg-[#0a1717] border border-teal-400/25 rounded-2xl p-2.5 shadow-2xl z-50 animate-scaleIn w-44">
              <button
                onClick={() => handleTabChange('configuracoes')}
                className="w-full text-left flex items-center gap-2.5 px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-teal-800 dark:text-cream-300 hover:text-teal-950 hover:bg-teal-100/60 dark:hover:text-cream-200 dark:hover:bg-teal-800/45 rounded-xl transition-all"
              >
                <SettingsIcon className="h-4 w-4 text-teal-600 dark:text-teal-300" />
                Configurações
              </button>
              
              <button
                onClick={handleLock}
                className="w-full text-left flex items-center gap-2.5 px-3.5 py-2.5 text-[10px] font-extrabold uppercase tracking-wider text-red-600 dark:text-red-400 hover:bg-red-500/10 dark:hover:bg-red-950/15 rounded-xl transition-all"
              >
                <Lock className="h-4 w-4 animate-pulse" />
                Bloquear App
              </button>
            </div>
          )}

          {/* Profile selector trigger button */}
          <button
            id="profile-trigger"
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
            className="w-11 h-11 bg-[#fcfbf9] hover:bg-[#f5f0e8] dark:bg-[#0a1717] dark:hover:bg-[#163232] border border-teal-200/60 dark:border-teal-800/60 rounded-xl transition-all flex items-center justify-center relative group"
          >
            <div className="w-8 h-8 bg-teal-500/20 border border-teal-400/30 text-teal-700 dark:text-cream-300 rounded-lg flex items-center justify-center font-black text-xs shrink-0 font-sans">
              {professional?.name?.[0]?.toUpperCase() || 'P'}
            </div>

            {/* Profile Tooltip */}
            <div className="absolute left-16 bg-[#f5f0e8] dark:bg-[#0a1717] border border-teal-400/25 text-teal-900 dark:text-cream-300 text-[10px] font-bold uppercase tracking-wider px-3.5 py-2.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-0 group-hover:delay-300 pointer-events-none z-50 shadow-2xl whitespace-nowrap">
              {professional?.name || 'Perfil'}
            </div>
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-primary transition-colors duration-300">

        {/* Top Header */}
        <header className="h-16 border-b border-teal-200/40 dark:border-teal-800/40 bg-[#f5f0e8]/50 dark:bg-[#112424]/50 px-6 flex items-center justify-between shrink-0 transition-colors">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 text-teal-700 hover:text-teal-900 dark:text-white dark:hover:text-cream-200 hover:bg-teal-800/10 rounded-xl"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="lg:hidden flex items-center">
              <NotificationMenu 
                onNavigate={handleTabChange}
                onSelectPatient={handleSelectPatientFromDashboard}
              />
            </div>
            <div className="hidden sm:flex items-center gap-2 text-xs font-black text-teal-700 dark:text-white uppercase tracking-widest">
              <span className="font-heading tracking-wider">Acauã</span>
              <ChevronRight className="h-3 w-3 text-teal-500 dark:text-white" />
              <span className="text-teal-600 dark:text-teal-300">
                {tabTitles[activeTab] || 'Painel Geral'}
              </span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col text-right">
              <span className="text-[10px] text-teal-700 dark:text-white font-bold uppercase tracking-wider">Olá, {professional?.name || 'Profissional'}</span>
              <span className="text-[9px] text-teal-600 dark:text-teal-300 font-black uppercase tracking-widest mt-0.5">Modo Clínico Local - Acauã Offline</span>
            </div>
          </div>
        </header>

        {/* Dynamic Area with GSAP Tab Transition */}
        <div ref={mainContentRef} className="flex-1 overflow-y-auto p-4 md:p-5 bg-[#f5f0e8]/85 dark:bg-[#163232]/85 backdrop-blur-sm transition-colors duration-300 relative z-10">
          <div key={activeTab} className="h-full">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
