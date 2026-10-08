import React, { useState, useEffect } from 'react';
import { dbService, isDemoWeb } from '../services/db';
import { DotField } from './DotField';
import { AcauaLogo } from './AcauaLogo';
import { 
  Unlock, Sparkles, Shield, CloudOff, FileCheck, Check, Moon, Sun, ChevronRight 
} from 'lucide-react';

interface LockScreenProps {
  onUnlock: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState(isDemoWeb() ? 'acaua2026' : '');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isFirstRun, setIsFirstRun] = useState<boolean | null>(null);
  const [dbExists, setDbExists] = useState(false);
  
  // Onboarding Setup Steps:
  // 1: Welcome (Intro)
  // 2: Theme Selection (Claro vs Escuro)
  // 3: Password (Senha Mestra)
  // 4: Profile Details (Nome & CRP)
  // 5: Final Terms & Initialization
  const [setupStep, setSetupStep] = useState(1);

  // Professional setup fields
  const [name, setName] = useState('');
  const [crp, setCrp] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const json = JSON.parse(reader.result as string);
        if (json.config && json.patients) {
          localStorage.setItem('acaua_config', JSON.stringify(json.config));
          localStorage.setItem('acaua_patients', JSON.stringify(json.patients));
          localStorage.setItem('acaua_evolutions', JSON.stringify(json.evolutions || []));
          localStorage.setItem('acaua_attachments', JSON.stringify(json.attachments || []));
          localStorage.setItem('acaua_clinical_tools', JSON.stringify(json.clinical_tools || []));
          localStorage.setItem('acaua_appointments', JSON.stringify(json.appointments || []));
          localStorage.setItem('acaua_finance', JSON.stringify(json.finance || []));
          localStorage.setItem('acaua_daily_tasks', JSON.stringify(json.daily_tasks || []));
          
          const dbTheme = json.config.theme || 'dark';
          localStorage.setItem('acaua_theme', dbTheme);
          toggleTheme(dbTheme);

          if (!localStorage.getItem('acaua_master_password') && !localStorage.getItem('psi_crm_master_password')) {
            localStorage.setItem('acaua_master_password', '123456');
          }
          
          setIsFirstRun(false);
          setDbExists(true);
          setError('');
          alert('Backup importado com sucesso! Utilize sua senha mestra de acesso para entrar.');
        } else {
          setError('Arquivo de backup inválido.');
        }
      } catch (err) {
        setError('Erro ao ler o arquivo de backup.');
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    const checkDb = async () => {
      const exists = await dbService.checkDatabaseExists();
      setIsFirstRun(!exists);
      setDbExists(exists);
      
      const cachedTheme = ((localStorage.getItem('acaua_theme') || localStorage.getItem('psi_crm_theme')) as 'dark' | 'light') || 'dark';
      setTheme(cachedTheme);
      toggleTheme(cachedTheme);

      if (isDemoWeb()) {
        setPassword('acaua2026');
      }
    };
    checkDb();
  }, []);

  const toggleTheme = (selectedTheme: 'dark' | 'light') => {
    setTheme(selectedTheme);
    localStorage.setItem('acaua_theme', selectedTheme);
    if (selectedTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const success = await dbService.init(password);
      if (success) {
        onUnlock();
      } else {
        setError('Senha incorreta. Tente novamente.');
      }
    } catch (err: any) {
      setError(err?.message || 'Erro de criptografia ao acessar o cofre.');
    } finally {
      setLoading(false);
    }
  };

  // Loader screen on boot
  if (isFirstRun === null) {
    return (
      <div className="min-h-screen bg-[#f5f0e8] dark:bg-[#163232] flex items-center justify-center transition-colors duration-300">
        <div className="relative">
          <div className="animate-spin rounded-full h-14 w-14 border-t-2 border-b-2 border-teal-500 dark:border-teal-400"></div>
          <div className="absolute inset-0 m-auto h-6 w-6 rounded-full bg-teal-500/10 dark:bg-teal-500/20 border border-teal-400/40 dark:border-teal-400/35 flex items-center justify-center animate-ping"></div>
        </div>
      </div>
    );
  }

  // --- FULL SCREEN ONBOARDING EXPERIENCE (COMPACT HEIGHT - NO SCROLL) ---
  if (isFirstRun) {
    return (
      <div className="h-screen w-full bg-[#f5f0e8] dark:bg-[#163232] flex flex-col justify-between p-6 sm:p-8 relative overflow-hidden transition-colors duration-300 animate-fadeIn text-left font-sans">
        {/* React Bits Interactive Canvas Dot Field Background */}
        <DotField />

        {/* Glow backgrounds */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-teal-400/8 rounded-full blur-[120px] pointer-events-none"></div>

        {/* Header */}
        <div className="flex justify-between items-center relative z-20 w-full max-w-2xl mx-auto">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-500/20 border border-teal-400/40 rounded-xl flex items-center justify-center shadow-md p-1">
              <AcauaLogo className="w-6 h-6 text-teal-800 dark:text-white drop-shadow-[0_0_8px_rgba(114,176,176,0.6)]" />
            </div>
            <span className="text-base font-black text-teal-900 dark:text-cream-300 font-heading uppercase tracking-wider">Acauã</span>
          </div>
          <span className="text-[9px] font-black text-teal-600 dark:text-white uppercase tracking-widest">
            Etapa {setupStep} de 5
          </span>
        </div>

        {/* MAIN COMPACT CONTENT CONTAINER */}
        <div className="max-w-2xl w-full mx-auto flex-1 flex flex-col justify-center py-2 relative z-20 overflow-hidden">
          
          {/* STEP 1: WELCOME SLIDE */}
          {setupStep === 1 && (
            <div className="space-y-5 animate-scaleUp">
              <div className="space-y-3 text-center">
                <div className="w-16 h-16 bg-white dark:bg-[#112424] border border-teal-400/30 dark:border-teal-400/40 rounded-2xl flex items-center justify-center mx-auto shadow-md dark:shadow-[0_0_25px_rgba(77,150,150,0.3)] p-2">
                  <AcauaLogo className="w-12 h-12 text-teal-800 dark:text-white drop-shadow-[0_0_10px_rgba(114,176,176,0.6)]" />
                </div>

                <div className="space-y-1">
                  <h1 className="text-5xl lg:text-6xl font-black text-teal-900 dark:text-cream-300 tracking-[0.15em] uppercase select-none font-heading">
                    Acauã
                  </h1>
                  <h2 className="text-teal-700 dark:text-cream-400 font-extrabold text-[11px] uppercase tracking-wider">
                    Bem-vindo ao seu Espaço Clínico Seguro
                  </h2>
                  <p className="text-teal-600 dark:text-white text-[10px] max-w-lg mx-auto normal-case font-medium leading-relaxed">
                    O Acauã funciona de forma 100% offline. Todos os prontuários, evoluções clínicas e dados financeiros são criptografados localmente e nunca saem do seu computador, garantindo conformidade absoluta com a LGPD e o sigilo profissional do CFP.
                  </p>
                </div>
              </div>

              {/* Features list (Compact) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 text-left">
                <div className="bg-white dark:bg-teal-800/70 border border-teal-200/60 dark:border-teal-700/60 p-3.5 rounded-2xl space-y-1 shadow-sm">
                  <div className="text-teal-600 dark:text-teal-300"><Shield className="h-5 w-5" /></div>
                  <span className="text-[9px] font-black text-teal-900 dark:text-cream-300 uppercase tracking-wider block">Criptografia Local</span>
                  <span className="text-[8px] text-teal-700 dark:text-white block normal-case leading-snug font-medium">Bases protegidas por chaves militares SQLCipher AES-256.</span>
                </div>

                <div className="bg-white dark:bg-teal-800/70 border border-teal-200/60 dark:border-teal-700/60 p-3.5 rounded-2xl space-y-1 shadow-sm">
                  <div className="text-teal-600 dark:text-teal-300"><CloudOff className="h-5 w-5" /></div>
                  <span className="text-[9px] font-black text-teal-900 dark:text-cream-300 uppercase tracking-wider block">Privacidade Local</span>
                  <span className="text-[8px] text-teal-700 dark:text-white block normal-case leading-snug font-medium">Seus dados clínicos residem apenas na sua máquina física.</span>
                </div>

                <div className="bg-white dark:bg-teal-800/70 border border-teal-200/60 dark:border-teal-700/60 p-3.5 rounded-2xl space-y-1 shadow-sm">
                  <div className="text-teal-600 dark:text-teal-300"><FileCheck className="h-5 w-5" /></div>
                  <span className="text-[9px] font-black text-teal-900 dark:text-cream-300 uppercase tracking-wider block">Padrão CFP / LGPD</span>
                  <span className="text-[8px] text-teal-700 dark:text-white block normal-case leading-snug font-medium">Formatado sob a normativa CFP 06/2019 e a legislação civil.</span>
                </div>
              </div>

              {/* Step 1 Actions */}
              <div className="pt-2 space-y-3">
                <button
                  type="button"
                  onClick={() => setSetupStep(2)}
                  className="w-full bg-teal-gradient hover:opacity-95 text-cream-100 font-black py-3 px-4 rounded-xl transition-all shadow-md text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1.5"
                >
                  Iniciar Configuração
                  <ChevronRight className="h-4 w-4 shrink-0" />
                </button>

                <div className="text-center">
                  {dbExists ? (
                    <button
                      type="button"
                      onClick={() => setIsFirstRun(false)}
                      className="text-teal-600 hover:text-teal-900 dark:text-white dark:hover:text-cream-200 text-[9px] font-extrabold uppercase tracking-wider underline transition-all bg-transparent border-none cursor-pointer"
                    >
                      Voltar ao Login
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-teal-600 hover:text-teal-900 dark:text-white dark:hover:text-cream-200 text-[9px] font-extrabold uppercase tracking-wider underline transition-all bg-transparent border-none cursor-pointer"
                    >
                      Restaurar Backup Existente
                    </button>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImportDatabase}
                  accept=".json"
                  className="hidden"
                />
              </div>
            </div>
          )}

          {/* STEP 2: THEME SELECTION */}
          {setupStep === 2 && (
            <div className="space-y-4 animate-scaleUp">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-teal-900 dark:text-cream-300 uppercase tracking-wider font-heading">Escolha a Aparência</h3>
                <p className="text-teal-600 dark:text-white text-[10px] normal-case font-medium leading-relaxed">
                  Personalize o visual do Acauã. O tema selecionado pode ser alterado a qualquer momento nas configurações.
                </p>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                {/* Dark theme card */}
                <button
                  type="button"
                  onClick={() => toggleTheme('dark')}
                  className={`p-5 rounded-2xl border text-left flex flex-col justify-between h-auto min-h-[140px] space-y-4 transition-all ${
                    theme === 'dark'
                      ? 'bg-teal-500/15 border-teal-400 shadow-md shadow-teal-500/10'
                      : 'bg-white dark:bg-teal-800/60 border-teal-200/60 dark:border-teal-700/60 hover:border-teal-400/40'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-300">
                    <Moon className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-teal-900 dark:text-cream-300 uppercase tracking-wider block">Tema Escuro</span>
                    <span className="text-[9px] text-teal-700 dark:text-white normal-case block mt-0.5 leading-snug font-medium">Estética floresta profunda Acauã com alto contraste e menor fadiga ocular (Recomendado).</span>
                  </div>
                </button>

                {/* Light theme card */}
                <button
                  type="button"
                  onClick={() => toggleTheme('light')}
                  className={`p-5 rounded-2xl border text-left flex flex-col justify-between h-auto min-h-[140px] space-y-4 transition-all ${
                    theme === 'light'
                      ? 'bg-teal-500/15 border-teal-400 shadow-md shadow-teal-500/10'
                      : 'bg-[#f5f0e8] dark:bg-teal-800/60 border-teal-200/60 dark:border-teal-700/60 hover:border-teal-400/40'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-teal-500/20 flex items-center justify-center text-teal-600 dark:text-teal-300">
                    <Sun className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black text-teal-900 dark:text-cream-300 uppercase tracking-wider block">Tema Claro</span>
                    <span className="text-[9px] text-teal-700 dark:text-white normal-case block mt-0.5 leading-snug font-medium">Design clean em tons suaves de creme e off-white para ambientes iluminados.</span>
                  </div>
                </button>
              </div>
              </div>

              {/* Navigation */}
              <div className="flex gap-3 pt-4 border-t border-teal-200/60 dark:border-teal-700/80 w-full">
                <button
                  type="button"
                  onClick={() => setSetupStep(3)}
                  className="flex-1 py-3 bg-teal-gradient text-cream-100 font-black rounded-xl text-xs uppercase tracking-wider text-center"
                >
                  Avançar
                </button>
                <button
                  type="button"
                  onClick={() => setSetupStep(1)}
                  className="px-5 py-3 bg-teal-100/60 dark:bg-teal-800 hover:bg-teal-200/60 dark:hover:bg-teal-700 border border-teal-200/60 dark:border-teal-700 text-teal-800 dark:text-cream-400 rounded-xl text-xs font-bold uppercase tracking-wider"
                >
                  Voltar
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: MASTER PASSWORD */}
          {setupStep === 3 && (
            <div className="space-y-4 animate-scaleUp">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-teal-900 dark:text-cream-300 uppercase tracking-wider font-heading">Definir Senha Mestra</h3>
                <p className="text-teal-600 dark:text-white text-[10px] mt-0.5 normal-case font-medium leading-relaxed">
                  Escolha a senha mestra para desbloquear o cofre digital do seu consultório. Essa senha criptografa a base local e protege a intimidade dos prontuários.
                </p>
              </div>

              <div className="space-y-3.5 my-auto">
                <div className="bg-teal-500/10 border border-teal-400/30 dark:border-teal-400/30 rounded-2xl p-3 text-[10px] text-teal-800 dark:text-cream-400 leading-relaxed font-sans normal-case">
                  <span className="font-extrabold block text-[8.5px] uppercase tracking-wider mb-0.5 text-teal-600 dark:text-teal-300">
                    Aviso de Segurança Crítico:
                  </span>
                  Como os dados residem integralmente de forma local e offline, <strong>se você esquecer ou perder esta senha mestra, seus dados clínicos não poderão ser recuperados sob nenhuma hipótese.</strong>
                </div>

                <div className="space-y-1 text-xs font-bold text-teal-800 dark:text-cream-400 uppercase tracking-wider">
                  <label className="block text-[8.5px] font-black text-teal-700 dark:text-white">Senha Mestra de Desbloqueio</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#eae5db] dark:bg-teal-800 border border-teal-200/60 dark:border-teal-700 focus:border-teal-400/40 rounded-xl py-2.5 px-3.5 text-teal-900 dark:text-cream-300 text-xs outline-none font-sans font-bold"
                    placeholder="Mínimo de 8 caracteres (A-Z, a-z, 0-9, @#$)"
                    required
                  />
                </div>

                <div className="space-y-1 text-xs font-bold text-teal-800 dark:text-cream-400 uppercase tracking-wider">
                  <label className="block text-[8.5px] font-black text-teal-700 dark:text-white">Confirme a Senha Mestra</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#eae5db] dark:bg-teal-800 border border-teal-200/60 dark:border-teal-700 focus:border-teal-400/40 rounded-xl py-2.5 px-3.5 text-teal-900 dark:text-cream-300 text-xs outline-none font-sans font-bold"
                    placeholder="Repita a senha definida acima"
                    required
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-[10px] text-center font-bold bg-red-500/10 border border-red-500/20 rounded-xl py-1.5 px-3 animate-pulse normal-case font-sans">
                    {error}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-teal-200/60 dark:border-teal-700/80 w-full">
                <button
                  type="button"
                  onClick={() => {
                    const hasUppercase = /[A-Z]/.test(password);
                    const hasLowercase = /[a-z]/.test(password);
                    const hasNumber = /[0-9]/.test(password);
                    const hasSpecial = /[^A-Za-z0-9]/.test(password);

                    if (password.length < 8) {
                      setError('A senha deve ter pelo menos 8 caracteres.');
                      return;
                    }
                    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
                      setError('A senha deve conter pelo menos uma letra maiúscula, uma minúscula, um número e um caractere especial.');
                      return;
                    }
                    if (password !== confirmPassword) {
                      setError('As senhas não coincidem.');
                      return;
                    }
                    setError('');
                    setSetupStep(4);
                  }}
                  className="flex-1 py-3 bg-teal-gradient text-cream-100 font-black rounded-xl text-xs uppercase tracking-wider text-center"
                >
                  Avançar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setSetupStep(2);
                  }}
                  className="px-5 py-3 bg-teal-100/60 dark:bg-teal-800 hover:bg-teal-200/60 dark:hover:bg-teal-700 border border-teal-200/60 dark:border-teal-700 text-teal-800 dark:text-cream-400 rounded-xl text-xs font-bold uppercase tracking-wider"
                >
                  Voltar
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: PROFESSIONAL PROFILE */}
          {setupStep === 4 && (
            <div className="space-y-4 animate-scaleUp">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-teal-900 dark:text-cream-300 uppercase tracking-wider font-heading">Cadastro Profissional</h3>
                <p className="text-teal-600 dark:text-white text-[10px] mt-0.5 normal-case font-medium leading-relaxed">
                  Informe os seus dados profissionais básicos. Estes dados serão utilizados exclusivamente na confecção automática de laudos, declarações e recibos do Acauã local.
                </p>
              </div>

              <div className="space-y-3.5 my-auto">
                <div className="space-y-1.5 text-xs font-bold text-teal-800 dark:text-cream-400 uppercase tracking-wider">
                  <label className="block text-[8.5px] font-black text-teal-700 dark:text-white">Nome Completo do Profissional</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#eae5db] dark:bg-teal-800 border border-teal-200/60 dark:border-teal-700 focus:border-teal-400/40 rounded-xl py-3 px-4 text-teal-900 dark:text-cream-300 text-xs outline-none font-sans font-bold"
                    placeholder="Ex: Luiz Henrique de Souza"
                    required
                    autoFocus
                  />
                </div>

                <div className="space-y-1.5 text-xs font-bold text-teal-800 dark:text-cream-400 uppercase tracking-wider">
                  <label className="block text-[8.5px] font-black text-teal-700 dark:text-white">Inscrição CRP / Região</label>
                  <input
                    type="text"
                    value={crp}
                    onChange={(e) => setCrp(e.target.value)}
                    className="w-full bg-[#eae5db] dark:bg-teal-800 border border-teal-200/60 dark:border-teal-700 focus:border-teal-400/40 rounded-xl py-3 px-4 text-teal-900 dark:text-cream-300 text-xs outline-none font-sans font-bold"
                    placeholder="Ex: CRP 06/12345"
                    required
                  />
                </div>

                {error && (
                  <p className="text-red-500 text-[10px] text-center font-bold bg-red-500/10 border border-red-500/20 rounded-xl py-1.5 px-3 animate-pulse normal-case font-sans">
                    {error}
                  </p>
                )}
              </div>

              {/* Navigation */}
              <div className="flex gap-3 pt-4 border-t border-teal-200/60 dark:border-teal-700/80 w-full">
                <button
                  type="button"
                  onClick={() => {
                    if (!name.trim() || !crp.trim()) {
                      setError('Por favor, preencha todos os campos do perfil profissional.');
                      return;
                    }
                    setError('');
                    setSetupStep(5);
                  }}
                  className="flex-1 py-3 bg-teal-gradient text-cream-100 font-black rounded-xl text-xs uppercase tracking-wider text-center"
                >
                  Avançar
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setSetupStep(3);
                  }}
                  className="px-5 py-3 bg-teal-100/60 dark:bg-teal-800 hover:bg-teal-200/60 dark:hover:bg-teal-700 border border-teal-200/60 dark:border-teal-700 text-teal-800 dark:text-cream-400 rounded-xl text-xs font-bold uppercase tracking-wider"
                >
                  Voltar
                </button>
              </div>
            </div>
          )}

          {/* STEP 5: FINAL POLICIES & FINALIZE */}
          {setupStep === 5 && (
            <div className="space-y-4 animate-scaleUp">
              <div className="space-y-1">
                <h3 className="text-2xl font-black text-teal-900 dark:text-cream-300 uppercase tracking-wider font-heading">Políticas & Responsabilidade</h3>
                <p className="text-teal-600 dark:text-white text-[10px] mt-0.5 normal-case font-medium leading-relaxed">
                  Revise as normativas legais de custódia e clique em "Iniciar Acauã" para gerar seu espaço seguro.
                </p>
              </div>

              <div className="space-y-3.5 my-auto">
                {/* Details */}
                <div className="bg-[#eae5db]/60 dark:bg-teal-800/50 border border-teal-200/60 dark:border-teal-700 rounded-2xl p-4 space-y-2 text-[9px] text-teal-800 dark:text-white leading-relaxed font-sans normal-case">
                  <div>
                    <span className="font-extrabold text-teal-700 dark:text-teal-300 uppercase tracking-wider block text-[8.5px] mb-0.5">1. Custódia Exclusiva de Registros (CFP 01/2009)</span>
                    A obrigação de guarda (por no mínimo 5 anos), sigilo e integridade de todos os prontuários e evoluções é exclusiva do profissional de psicologia (CRP), conforme o Código de Ética e resoluções do CFP.
                  </div>
                  <div>
                    <span className="font-extrabold text-teal-700 dark:text-teal-300 uppercase tracking-wider block text-[8.5px] mb-0.5">2. Ausência de Servidores & LGPD</span>
                    O Acauã funciona 100% offline. O Desenvolvedor não coleta dados e não possui backups em nuvem. O psicólogo atua como único Controlador sob a LGPD, sendo responsável pela segurança física e lógica de seu computador.
                  </div>
                  <div>
                    <span className="font-extrabold text-teal-700 dark:text-teal-300 uppercase tracking-wider block text-[8.5px] mb-0.5">3. Cópias de Segurança & Contrato de Licença</span>
                    A perda da Senha Mestra acarreta em perda irreversível dos dados. O Contrato de Licença de Usuário Final (EULA) completo encontra-se salvo no arquivo TERMOS.md no diretório raiz do aplicativo.
                  </div>
                </div>

                {/* PREMIUM CUSTOM SELECTABLE CHECKBOX CARD */}
                <div 
                  onClick={() => setAcceptedTerms(!acceptedTerms)}
                  className={`border rounded-2xl p-3 cursor-pointer transition-all duration-300 flex items-start gap-3 select-none ${
                    acceptedTerms 
                      ? 'border-teal-400 bg-teal-500/15 shadow-md shadow-teal-500/10' 
                      : 'border-teal-200/60 dark:border-teal-700 hover:border-teal-400/40 bg-white dark:bg-teal-800/40'
                  }`}
                >
                  <div 
                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all mt-0.5 ${
                      acceptedTerms 
                        ? 'border-teal-400 bg-teal-500 text-cream-50' 
                        : 'border-teal-300 dark:border-teal-600 bg-transparent'
                    }`}
                  >
                    {acceptedTerms && <Check className="h-3 w-3 stroke-[3]" />}
                  </div>
                  <span className="text-[9.5px] font-bold text-teal-800 dark:text-cream-400 leading-relaxed uppercase tracking-wide">
                    Estou ciente e aceito os termos de responsabilidade ética e custódia local de dados clínicos.
                  </span>
                </div>

                {error && (
                  <p className="text-red-500 text-[10px] text-center font-bold bg-red-500/10 border border-red-500/20 rounded-xl py-1.5 px-3 animate-pulse normal-case font-sans">
                    {error}
                  </p>
                )}
              </div>

              {/* Navigation */}
              <div className="flex gap-3 pt-4 border-t border-teal-200/60 dark:border-teal-700/80 w-full">
                <button
                  type="button"
                  disabled={loading || !acceptedTerms}
                  onClick={async () => {
                    if (!acceptedTerms) {
                      setError('Você precisa concordar com os termos de responsabilidade.');
                      return;
                    }
                    setError('');
                    setLoading(true);
                    try {
                      const success = await dbService.init(password, true);
                      if (success) {
                        try {
                          await dbService.execute('DELETE FROM config');
                        } catch (e) {}
                        await dbService.execute(
                          'INSERT INTO config (name, crp, contact, auto_lock_time, theme) VALUES (?, ?, ?, ?, ?)',
                          [name.trim(), crp.trim(), '', 5, theme]
                        );
                        onUnlock();
                      } else {
                        setError('Erro ao criar o banco de dados.');
                      }
                    } catch (err: any) {
                      setError(err?.message || 'Erro de criptografia ao configurar o banco.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="flex-1 py-3 bg-teal-gradient text-cream-100 font-black rounded-xl text-xs uppercase tracking-wider text-center flex items-center justify-center gap-1.5 disabled:opacity-30 disabled:pointer-events-none shadow-md shadow-teal-500/15"
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-cream-100 border-t-transparent"></div>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4" />
                      Iniciar Acauã
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setError('');
                    setSetupStep(4);
                  }}
                  className="px-5 py-3 bg-teal-100/60 dark:bg-teal-800 hover:bg-teal-200/60 dark:hover:bg-teal-700 border border-teal-200/60 dark:border-teal-700 text-teal-800 dark:text-cream-400 rounded-xl text-xs font-bold uppercase tracking-wider"
                >
                  Voltar
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer info */}
        <div className="w-full max-w-2xl mx-auto flex justify-between text-[8px] text-teal-600 dark:text-white font-extrabold uppercase tracking-widest relative z-20 pt-2">
          <span>Modo Onboarding</span>
          <span>Acauã v0.1</span>
        </div>
      </div>
    );
  }

  // --- STANDARD SPLIT LOGIN VIEW ---
  return (
    <div className="min-h-screen w-full bg-[#f5f0e8] dark:bg-[#163232] relative overflow-hidden flex flex-col font-sans animate-fadeIn transition-colors duration-300 text-left">
      {/* React Bits Interactive Canvas Dot Field Background */}
      <DotField />

      {/* Background radial glow */}
      <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[140px] pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-teal-400/8 rounded-full blur-[120px] pointer-events-none"></div>

      {/* Main split-screen container - Full screen grid */}
      <div className="w-full min-h-screen grid grid-cols-1 md:grid-cols-12 relative transition-all z-10">

        {/* LEFT COLUMN: Login Form (Full height with glass translucency for DotField visibility) */}
        <div className="md:col-span-5 lg:col-span-4 flex flex-col justify-center p-8 sm:p-12 md:p-16 lg:p-20 bg-white/90 dark:bg-[#112424]/90 backdrop-blur-md border-r border-teal-200/50 dark:border-teal-800/50 relative z-20 min-h-screen transition-colors">
          
          <div className="mb-8">
            <div className="w-12 h-12 bg-teal-500/15 dark:bg-teal-800/80 border border-teal-400/30 dark:border-teal-400/40 rounded-2xl flex items-center justify-center mb-4 shadow-lg md:hidden p-1.5">
              <AcauaLogo className="w-9 h-9 text-teal-800 dark:text-white drop-shadow-[0_0_8px_rgba(114,176,176,0.6)]" />
            </div>
            <h2 className="text-3xl font-black text-teal-900 dark:text-cream-300 font-heading tracking-wider uppercase md:normal-case lg:text-4xl">
              Acessar
            </h2>
            <p className="text-teal-700 dark:text-white text-xs font-bold uppercase tracking-widest mt-2">
              Digite a senha do banco de dados local
            </p>
          </div>

          <form onSubmit={handleUnlock} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-[10px] font-bold text-teal-800 dark:text-white uppercase tracking-widest mb-1">
                  Senha Mestra de Desbloqueio
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#f5f0e8] dark:bg-[#091717] border border-teal-200/60 dark:border-teal-700 focus:border-teal-400 rounded-xl py-4 px-4 text-teal-900 dark:text-cream-300 text-base outline-none font-sans font-bold tracking-[0.4em] transition-all"
                  placeholder="⬢⬢⬢⬢⬢⬢"
                  required
                  autoFocus
                />
              </div>

              {isDemoWeb() && (
                <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-3 text-teal-900 dark:text-cream-200 text-left space-y-1">
                  <div className="flex items-center gap-1.5 font-black text-[11px] uppercase tracking-wider text-teal-800 dark:text-cream-300">
                    <Sparkles className="w-3.5 h-3.5 text-teal-500" />
                    <span>Versão Demonstrativa Online</span>
                  </div>
                  <p className="text-[11px] opacity-85 leading-relaxed font-medium">
                    Senha mestra pré-preenchida (<code className="font-mono bg-teal-500/20 px-1 py-0.5 rounded font-bold">acaua2026</code>) e base clínica simulada pronta. Clique em <strong>Desbloquear Acesso</strong> abaixo para entrar imediatamente!
                  </p>
                </div>
              )}
            </div>

            {error && (
              <p className="text-red-400 text-xs text-center font-bold bg-red-950/20 border border-red-900/30 rounded-xl py-2.5 px-4 animate-pulse font-sans normal-case">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full uiverse-btn-gold text-cream-100 font-black py-4 px-4 rounded-xl transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2 uppercase tracking-wider text-xs"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-cream-100"></div>
              ) : (
                <>
                  <Unlock className="h-4 w-4" />
                  Desbloquear Acesso
                </>
              )}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-teal-200/60 dark:border-teal-700/60 space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 py-2.5 bg-teal-100/60 dark:bg-teal-800/80 hover:bg-teal-200/60 dark:hover:bg-teal-700 border border-teal-200/60 dark:border-teal-700 text-teal-800 dark:text-cream-300 rounded-xl text-[10px] font-bold uppercase tracking-wider text-center transition-all"
              >
                Escolher Arquivo
              </button>
              <button
                type="button"
                onClick={async () => {
                  await dbService.deleteDatabase();
                  setPassword('');
                  setConfirmPassword('');
                  setName('');
                  setCrp('');
                  setSetupStep(1);
                  setAcceptedTerms(false);
                  setError('');
                  setDbExists(false);
                  setIsFirstRun(true);
                }}
                className="flex-1 py-2.5 bg-teal-100/60 dark:bg-teal-800/80 hover:bg-teal-200/60 dark:hover:bg-teal-700 border border-teal-200/60 dark:border-teal-700 text-teal-800 dark:text-cream-300 rounded-xl text-[10px] font-bold uppercase tracking-wider text-center transition-all"
              >
                Criar Novo Banco
              </button>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportDatabase}
              accept=".json"
              className="hidden"
            />
          </div>

          {/* Copyright overlay on mobile */}
          <div className="mt-12 text-center md:hidden">
            <span className="text-[9px] text-teal-700 dark:text-white font-bold uppercase tracking-wider">⬢ Acauã Offline v0.1</span>
          </div>
        </div>

        {/* RIGHT COLUMN: Premium Graphic & Brand Showcase */}
        <div className="md:col-span-7 lg:col-span-8 hidden md:flex flex-col justify-between p-12 lg:p-16 bg-white/70 dark:bg-[#163232]/85 backdrop-blur-md relative overflow-hidden z-20 min-h-screen animate-fadeIn transition-colors duration-300">
          
          {/* Radial backgrounds inside right panel */}
          <div className="absolute top-[-20%] right-[-20%] w-[450px] h-[450px] bg-teal-500/15 rounded-full blur-[100px] pointer-events-none animate-pulse"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[350px] h-[350px] bg-teal-400/8 rounded-full blur-[80px] pointer-events-none"></div>
          
          {/* Decorative Dotted Grid pattern */}
          <div className="absolute inset-0 opacity-[0.05] bg-[radial-gradient(rgba(77,150,150,0.5)_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none"></div>

          {/* Top tagline */}
          <div className="flex items-center gap-2 text-teal-700 dark:text-cream-400 uppercase tracking-[0.2em] text-[9px] font-black relative z-10 select-none">
            <Sparkles className="h-4 w-4 text-teal-500 dark:text-teal-300" />
            Modo Clínico Local Criptografado
          </div>

          {/* Center visual: Large glowing logo and branding */}
          <div className="my-auto relative z-10">
            <div className="relative w-48 h-48 mx-auto flex items-center justify-center mb-8">
              {/* Ring animations */}
              <div className="absolute inset-0 bg-teal-500/10 dark:bg-teal-500/20 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute w-40 h-40 border border-dashed border-teal-400/30 dark:border-teal-400/30 rounded-full animate-[spin_60s_linear_infinite]"></div>
              <div className="absolute w-32 h-32 border border-teal-400/40 dark:border-teal-400/50 rounded-full animate-[spin_30s_linear_infinite]"></div>
              {/* Outer neon shell */}
              <div className="absolute w-24 h-24 bg-white dark:bg-[#112424] border border-teal-400/40 dark:border-teal-400/50 rounded-3xl flex items-center justify-center shadow-lg dark:shadow-[0_0_40px_rgba(77,150,150,0.4)] p-3">
                <AcauaLogo className="w-18 h-18 text-teal-800 dark:text-white drop-shadow-[0_0_14px_rgba(114,176,176,0.6)]" />
              </div>
            </div>

            <div className="text-center space-y-2">
              <h1 className="text-5xl lg:text-6xl font-black text-teal-900 dark:text-cream-300 font-heading tracking-[0.2em] uppercase select-none">
                Acauã
              </h1>
              <p className="text-teal-700 dark:text-white text-xs font-bold uppercase tracking-[0.25em]">
                Sistema de Gestão de Psicologia Individual
              </p>
            </div>
          </div>

          {/* Bottom characteristics panel */}
          <div className="space-y-4 relative z-10">
            <div className="h-px bg-gradient-to-r from-transparent via-teal-400/25 to-transparent"></div>
            <div className="grid grid-cols-2 gap-8 text-left font-sans">
              <div className="space-y-1">
                <span className="text-[11px] font-black text-teal-800 dark:text-white uppercase tracking-wider block">Sigilo e Privacidade</span>
                <p className="text-[10px] text-teal-700 dark:text-white leading-relaxed">Banco de dados criptografado localmente no seu computador, em total conformidade com o CFP e a LGPD.</p>
              </div>
              <div className="space-y-1">
                <span className="text-[11px] font-black text-teal-800 dark:text-white uppercase tracking-wider block">Fluxo Clínico e Financeiro</span>
                <p className="text-[10px] text-teal-700 dark:text-white leading-relaxed">Prontuários, evolução clínica, agenda de atendimentos e gestão financeira unificados.</p>
              </div>
            </div>
            <div className="text-[9px] text-center text-teal-700 dark:text-white font-bold uppercase tracking-wider pt-4">
              ⬢ Acauã Offline v0.1
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
