import React, { useState } from 'react';
import { dbService, isTauri } from '../services/db';
import type { ProfessionalConfig } from '../services/db';
import { ConfirmModal } from './ConfirmModal';
import { invoke } from '@tauri-apps/api/core';
import { 
  Save, Landmark, PhoneCall, UserCheck, Shield, Download, Sun, Moon, ShieldAlert, CheckCircle2, Sparkles, Keyboard, FolderOpen
} from 'lucide-react';

interface SettingsProps {
  config: ProfessionalConfig;
  onUpdateConfig: (newConfig: ProfessionalConfig) => void;
  onRestartTour?: () => void;
  onShowShortcuts?: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ config, onUpdateConfig, onRestartTour, onShowShortcuts }) => {
  const [name, setName] = useState(config.name);
  const [crp, setCrp] = useState(config.crp);
  const [contact, setContact] = useState(config.contact);
  const [autoLockTime, setAutoLockTime] = useState(config.autoLockTime);
  const [theme, setTheme] = useState<'dark' | 'light'>(config.theme || 'dark');

  // Backup path
  const [backupPath, setBackupPath] = useState('C:\\Users\\Public\\acaua_backup.db');

  // Custom shortcuts state
  const [customShortcuts, setCustomShortcuts] = useState(() => {
    const saved = localStorage.getItem('acaua_custom_shortcuts') || localStorage.getItem('psi_crm_custom_shortcuts');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
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
    };
  });

  const [recordingAction, setRecordingAction] = useState<string | null>(null);

  // Key recording listener
  React.useEffect(() => {
    if (!recordingAction) return;

    const handleRecord = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Don't register standalone modifier keys
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) {
        return;
      }

      const parts: string[] = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.altKey) parts.push('Alt');
      if (e.shiftKey) parts.push('Shift');

      let keyName = e.key.toUpperCase();
      if (e.key === ' ') keyName = 'Space';
      if (e.key === 'ArrowUp') keyName = 'Up';
      if (e.key === 'ArrowDown') keyName = 'Down';
      if (e.key === 'ArrowLeft') keyName = 'Left';
      if (e.key === 'ArrowRight') keyName = 'Right';

      parts.push(keyName);
      const shortcutStr = parts.join(' + ');

      // Save new shortcut config in local state
      const updated = { ...customShortcuts, [recordingAction]: shortcutStr };
      setCustomShortcuts(updated);
      setRecordingAction(null);
    };

    window.addEventListener('keydown', handleRecord, true);
    return () => window.removeEventListener('keydown', handleRecord, true);
  }, [recordingAction, customShortcuts]);

  React.useEffect(() => {
    setName(config.name);
    setCrp(config.crp);
    setContact(config.contact);
    setAutoLockTime(config.autoLockTime);
    setTheme(config.theme);
  }, [config]);
  
  const [loading, setLoading] = useState(false);
  const [backupLoading, setBackupLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [backupSuccessMsg, setBackupSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

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

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      await dbService.execute(
        'UPDATE config SET name = ?, crp = ?, contact = ?, auto_lock_time = ?, theme = ?',
        [name, crp, contact, autoLockTime, theme]
      );
      
      onUpdateConfig({
        name,
        crp,
        contact,
        autoLockTime,
        theme
      });

      // Save keyboard shortcuts to localStorage
      localStorage.setItem('acaua_custom_shortcuts', JSON.stringify(customShortcuts));
      localStorage.setItem('psi_crm_custom_shortcuts', JSON.stringify(customShortcuts));
      window.dispatchEvent(new Event('storage'));

      setSuccessMsg('Configurações atualizadas com sucesso!');
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Erro ao salvar configurações.');
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectBackupPath = async () => {
    if (isTauri()) {
      try {
        const selected = await invoke<string | null>('select_backup_path');
        if (selected) {
          setBackupPath(selected);
        }
      } catch (err) {
        console.error('Erro ao escolher local do backup:', err);
      }
    } else {
      alert('A seleção de pastas local está disponível apenas no aplicativo Desktop.');
    }
  };

  const handleExportBackup = () => {
    triggerConfirm(
      'Exportar Cópia de Segurança',
      `Esta ação gerará uma cópia idêntica do banco de dados SQLite criptografado no caminho: ${backupPath}. Deseja prosseguir?`,
      async () => {
        setBackupLoading(true);
        setBackupSuccessMsg('');
        try {
          await dbService.backup(backupPath);
          setBackupSuccessMsg('Cópia de segurança gerada com sucesso!');
          setTimeout(() => setBackupSuccessMsg(''), 4000);
        } catch (err: any) {
          alert(`Erro ao exportar backup: ${err?.message || err}`);
        } finally {
          setBackupLoading(false);
        }
      },
      'warning'
    );
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 text-left h-[calc(100vh-105px)] overflow-hidden p-0.5 animate-fadeIn">
      {/* Custom Confirm Modal */}
      <ConfirmModal
        isOpen={confirmState.isOpen}
        title={confirmState.title}
        message={confirmState.message}
        onConfirm={confirmState.onConfirm}
        onCancel={() => setConfirmState(prev => ({ ...prev, isOpen: false }))}
        type={confirmState.type}
      />

      {/* Edit Profile Panel */}
      <div className="lg:col-span-2 bg-[#f0ede6]/20 dark:bg-[#112424] border border-[#e7e4dc] dark:border-teal-800/60 rounded-3xl p-5 shadow-lg flex flex-col justify-between h-full overflow-hidden">
        <form onSubmit={handleSaveSettings} className="flex flex-col h-full justify-between text-xs font-bold text-stone-600 dark:text-charcoal-350 uppercase tracking-wider">
          
          {/* Main settings options grouped together */}
          <div className="space-y-4">
            <span className="text-[9px] text-stone-400 dark:text-white font-extrabold uppercase tracking-widest block">Parâmetros Gerais do Sistema</span>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Nome */}
              <div className="md:col-span-2 space-y-1.5">
                <label className="flex items-center gap-1.5 text-stone-500 dark:text-white font-black text-[9px]">
                  <UserCheck className="h-4 w-4 text-teal-600 dark:text-teal-300" /> Nome Completo do Profissional
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-charcoal-800 focus:border-gold-550/30 rounded-xl py-2 px-3.5 text-charcoal-900 dark:text-white text-xs outline-none font-sans font-bold"
                  required
                />
              </div>
              
              {/* CRP */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-stone-500 dark:text-white font-black text-[9px]">
                  <Landmark className="h-4 w-4 text-teal-600 dark:text-teal-300" /> Inscrição CRP
                </label>
                <input
                  type="text"
                  value={crp}
                  onChange={(e) => setCrp(e.target.value)}
                  className="w-full bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-charcoal-800 focus:border-gold-550/30 rounded-xl py-2 px-3.5 text-charcoal-900 dark:text-white text-xs outline-none font-sans font-bold"
                  required
                />
              </div>

              {/* Contato */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-stone-500 dark:text-white font-black text-[9px]">
                  <PhoneCall className="h-4 w-4 text-teal-600 dark:text-teal-300" /> Contato Profissional
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  className="w-full bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-charcoal-800 focus:border-gold-550/30 rounded-xl py-2 px-3.5 text-charcoal-900 dark:text-white text-xs outline-none font-sans font-bold"
                  required
                />
              </div>

              {/* Tema Selector */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-stone-500 dark:text-white font-black text-[9px] mb-0.5">
                  Visual do Aplicativo (Tema)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`py-1.5 px-3 rounded-xl border text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${
                      theme === 'dark'
                        ? 'bg-teal-gradient border-teal-500 text-white shadow-sm'
                        : 'bg-[#faf9f6]/20 dark:bg-charcoal-900/40 border-[#e7e4dc] dark:border-charcoal-900 hover:border-gold-550/20 text-stone-500 dark:text-white'
                    }`}
                  >
                    <Moon className="h-3.5 w-3.5 shrink-0" />
                    Escuro (Recomendado)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`py-1.5 px-3 rounded-xl border text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all ${
                      theme === 'light'
                        ? 'bg-teal-gradient border-teal-500 text-white shadow-sm'
                        : 'bg-[#faf9f6]/20 dark:bg-charcoal-900/40 border-[#e7e4dc] dark:border-charcoal-900 hover:border-gold-550/20 text-stone-500 dark:text-white'
                    }`}
                  >
                    <Sun className="h-3.5 w-3.5 shrink-0" />
                    Claro
                  </button>
                </div>
              </div>

              {/* Auto Lock dropdown */}
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-stone-500 dark:text-white font-black text-[9px]">
                  <Shield className="h-5 w-5 text-teal-600 dark:text-teal-300" /> Bloqueio de Inatividade (Auto-Lock)
                </label>
                <select
                  value={autoLockTime}
                  onChange={(e) => setAutoLockTime(Number(e.target.value))}
                  className="w-full bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-charcoal-800 focus:border-gold-550/30 rounded-xl py-2 px-3.5 text-charcoal-900 dark:text-white text-xs outline-none font-sans font-bold"
                >
                  <option value={1}>1 Minuto</option>
                  <option value={3}>3 Minutos</option>
                  <option value={5}>5 Minutos (Recomendado)</option>
                  <option value={10}>10 Minutos</option>
                  <option value={20}>20 Minutos</option>
                </select>
              </div>
            </div>

            {/* Keyboard Shortcuts Customizer Section */}
            <div className="pt-4 mt-2 border-t border-[#e7e4dc] dark:border-charcoal-800/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="text-left">
                  <span className="text-[9px] text-stone-400 dark:text-white font-extrabold uppercase tracking-widest block flex items-center gap-1.5"><Keyboard className="h-3.5 w-3.5 text-teal-600 dark:text-teal-300" /> Atalhos de Teclado Personalizados</span>
                  <p className="text-[8.5px] text-stone-500 dark:text-white font-sans mt-0.5 normal-case">Clique na tecla correspondente para gravar uma nova combinação de atalho.</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      triggerConfirm(
                        'Restaurar Atalhos Padrão',
                        'Deseja realmente restaurar todos os atalhos de teclado para os valores padrão do sistema? Esta ação só será definitiva após você clicar no botão "Salvar Configurações" no final da página.',
                        () => {
                          const defaults = {
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
                          setCustomShortcuts(defaults);
                        },
                        'warning'
                      );
                    }}
                    className="text-[8.5px] font-black uppercase text-stone-400 hover:text-teal-600 transition-colors py-1.5"
                  >
                    Restaurar Padrões
                  </button>
                  <button
                    type="button"
                    onClick={onShowShortcuts}
                    className="flex items-center gap-1 bg-[#f0ede6] hover:bg-[#faf9f6] dark:bg-charcoal-900 dark:hover:bg-charcoal-800 text-charcoal-900 dark:text-white border border-[#e7e4dc] dark:border-charcoal-800 text-[8.5px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-xl shadow-sm transition-all"
                  >
                    Ver Atalhos
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                {[
                  { id: 'shortcuts', label: 'Ver Painel de Atalhos' },
                  { id: 'timer', label: 'Alternar Cronômetro' },
                  { id: 'lock', label: 'Bloquear Tela' },
                  { id: 'tab1', label: 'Aba: Painel Geral' },
                  { id: 'tab2', label: 'Aba: Pacientes' },
                  { id: 'tab3', label: 'Aba: Agenda' },
                  { id: 'tab4', label: 'Aba: Financeiro' },
                  { id: 'tab5', label: 'Aba: Tarefas' },
                  { id: 'tab6', label: 'Aba: Jornada Clínica' },
                  { id: 'tab7', label: 'Aba: Bloco de Notas' },
                  { id: 'tab8', label: 'Aba: Documentos' },
                ].map(action => {
                  const isRecording = recordingAction === action.id;
                  const currentVal = customShortcuts[action.id as keyof typeof customShortcuts] || '';
                  return (
                    <div key={action.id} className="flex items-center justify-between py-1 border-b border-[#e7e4dc]/35 dark:border-charcoal-800/30 last:border-0">
                      <span className="text-[9px] font-semibold text-stone-600 dark:text-charcoal-350 tracking-normal normal-case text-left">{action.label}</span>
                      <button
                        type="button"
                        onClick={() => setRecordingAction(action.id)}
                        className={`px-2 py-0.5 text-[8.5px] font-black font-mono rounded-lg border transition-all shrink-0 ${
                          isRecording
                            ? 'bg-amber-500/20 border-amber-500 text-amber-500 animate-pulse'
                            : 'bg-[#faf9f6]/20 dark:bg-charcoal-900 border-[#e7e4dc] dark:border-charcoal-800 text-teal-600 dark:text-teal-300 hover:border-gold-550/20'
                        }`}
                      >
                        {isRecording ? 'Aguardando tecla...' : currentVal}
                      </button>
                    </div>
                  );
                })}
              </div>
              
              {recordingAction && (
                <div className="text-[8px] text-amber-500 dark:text-amber-400 font-bold normal-case text-center animate-pulse pt-0.5">
                  Pressione a nova combinação de teclas (Ex: Ctrl+Shift+K ou Space) para gravar.
                </div>
              )}
            </div>
          </div>

          {/* Feedback alerts & Action button at the bottom */}
          <div className="space-y-3 pt-4 border-t border-[#e7e4dc]/60 dark:border-charcoal-800/60 shrink-0">
            {successMsg && (
              <div className="text-emerald-600 dark:text-emerald-400 text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 rounded-xl py-1.5 px-3 animate-pulse flex items-center gap-1.5 normal-case">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            {errorMsg && (
              <div className="text-red-600 dark:text-red-400 text-[9px] font-bold bg-red-500/10 border border-red-500/20 rounded-xl py-1.5 px-3 animate-pulse flex items-center gap-1.5 normal-case">
                <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="bg-teal-gradient hover:opacity-95 text-white px-5 py-2.5 rounded-xl transition-all text-[9px] font-black uppercase tracking-wider shadow-md flex items-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-charcoal-950 border-t-transparent"></div>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Salvar Configurações
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Right Column: Backup and Compliance cards (Col 1) */}
      <div className="lg:col-span-1 flex flex-col h-full gap-4 overflow-y-auto pr-1">

        {/* Restart Tour Card */}
        <div className="bg-[#f0ede6]/20 dark:bg-[#112424] border border-[#e7e4dc] dark:border-teal-800/60 rounded-3xl p-4 shadow-lg flex items-center justify-between shrink-0">
          <div>
            <span className="text-[9px] text-stone-400 dark:text-white font-extrabold uppercase tracking-widest block">Tour de Introdução</span>
            <p className="text-[9px] text-stone-500 dark:text-white font-sans mt-0.5 normal-case">Reveja o guia interativo do sistema.</p>
          </div>
          <button
            onClick={() => {
              localStorage.removeItem('acaua_tour_done');
              localStorage.removeItem('psi_crm_tour_done');
              onRestartTour?.();
            }}
            className="flex items-center gap-1.5 bg-teal-gradient text-white text-[9px] font-black uppercase tracking-wider px-3 py-2 rounded-xl shadow-md transition-all hover:opacity-90 shrink-0"
          >
            <Sparkles className="h-3 w-3" />
            Refazer Tour
          </button>
        </div>

        {/* Backup Panel */}
        <div className="bg-[#f0ede6]/20 dark:bg-[#112424] border border-[#e7e4dc] dark:border-teal-800/60 rounded-3xl p-5 shadow-lg flex flex-col justify-between shrink-0 space-y-3">
          <div className="space-y-2">
            <span className="text-[9px] text-stone-400 dark:text-white font-extrabold uppercase tracking-widest block">Backup Criptografado</span>
            
            <div className="space-y-1.5 pt-1 text-xs font-bold text-stone-600 dark:text-charcoal-350 uppercase tracking-wider">
              <label className="block text-[9px] font-black text-stone-500 dark:text-white">Diretório Local do Backup</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={backupPath}
                  readOnly
                  className="flex-1 bg-[#f0ede6] dark:bg-charcoal-900 border border-[#e7e4dc] dark:border-charcoal-800 rounded-xl py-1.5 px-3 text-charcoal-900 dark:text-white text-xs outline-none font-sans font-bold cursor-default"
                  placeholder="Selecione o local clicando ao lado..."
                />
                <button
                  type="button"
                  onClick={handleSelectBackupPath}
                  className="px-3 bg-[#f0ede6] hover:bg-[#faf9f6] dark:bg-charcoal-900 dark:hover:bg-charcoal-800 border border-[#e7e4dc] dark:border-charcoal-800 text-teal-600 dark:text-teal-300 rounded-xl flex items-center justify-center transition-all shrink-0"
                  title="Procurar local..."
                >
                  <FolderOpen className="h-4 w-4" />
                </button>
              </div>
            </div>

            {backupSuccessMsg && (
              <div className="text-emerald-600 dark:text-emerald-400 text-[9px] font-bold bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2 flex items-center gap-1.5 animate-fadeIn mt-2 normal-case">
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                <span>{backupSuccessMsg}</span>
              </div>
            )}
          </div>

          <button
            onClick={handleExportBackup}
            disabled={backupLoading}
            className="w-full bg-[#f0ede6] dark:bg-[#112424] border border-[#e7e4dc] dark:border-charcoal-800 hover:border-teal-500/20 text-stone-600 dark:text-white hover:text-charcoal-900 dark:hover:text-white font-extrabold py-2.5 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-[9px] uppercase tracking-wider"
          >
            {backupLoading ? (
              <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-teal-500 border-t-transparent"></div>
            ) : (
              <>
                <Download className="h-3.5 w-3.5" />
                Executar Backup Local
              </>
            )}
          </button>
        </div>

        {/* Security Compliance Card */}
        <div className="flex-1 bg-[#f0ede6]/20 dark:bg-[#112424] border border-[#e7e4dc] dark:border-teal-800/60 rounded-3xl p-5 shadow-lg space-y-3.5 flex flex-col justify-center overflow-hidden">
          <span className="text-[9px] text-stone-400 dark:text-white font-extrabold uppercase tracking-widest block">Compliance e Segurança (LGPD)</span>
          
          <div className="space-y-3 text-[9.5px] text-stone-400 dark:text-white font-medium font-sans tracking-normal leading-relaxed">
            <div className="flex gap-2 items-start">
              <Shield className="h-4 w-4 text-teal-600 dark:text-teal-300 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-charcoal-900 dark:text-white block text-[9.5px]">SQLCipher AES-256</span>
                Banco criptografado localmente no disco. Sem chave válida, os prontuários e dados financeiros continuam ilegíveis.
              </div>
            </div>

            <div className="flex gap-2 items-start">
              <Moon className="h-4 w-4 text-teal-600 dark:text-teal-300 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-charcoal-900 dark:text-white block text-[9.5px]">Auto-Lock Temporizado</span>
                Políticas de inatividade descarregam a chave de memória e bloqueiam o Acauã ao se ausentar do computador.
              </div>
            </div>

            <div className="flex gap-2 items-start">
              <CheckCircle2 className="h-4 w-4 text-teal-600 dark:text-teal-300 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold text-charcoal-900 dark:text-white block text-[9.5px]">Normativa CFP 06/2019</span>
                Documentos clínicos lavrados em conformidade com as diretrizes do Conselho Federal de Psicologia brasileiro.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
