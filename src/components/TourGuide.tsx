import React, { useState, useLayoutEffect, useRef } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles } from 'lucide-react';

interface TourStep {
  targetId: string;
  title: string;
  description: string;
  position: 'right' | 'bottom';
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'nav-dashboard',
    title: '📊 Painel Geral',
    description: 'Sua visão central do dia: sessões agendadas, resumo financeiro do mês, aniversariantes e gráficos de tendência.',
    position: 'right',
  },
  {
    targetId: 'nav-pacientes',
    title: '👥 Pacientes',
    description: 'Prontuário digital completo. Evoluções SOAP ou livres, anexos em PDF, genograma familiar e mapeamento farmacológico.',
    position: 'right',
  },
  {
    targetId: 'nav-agenda',
    title: '📅 Agenda',
    description: 'Grade horária de 7h–21h por dia. Agende, confirme, cancele ou trance horários. Sessões recorrentes semanais disponíveis.',
    position: 'right',
  },
  {
    targetId: 'nav-financeiro',
    title: '💰 Financeiro',
    description: 'Controle de fluxo de caixa por mês. Lançamentos automáticos ao confirmar sessões. Exportação em PDF e CSV.',
    position: 'right',
  },
  {
    targetId: 'nav-tarefas',
    title: '✅ Tarefas do Dia',
    description: 'Lista unificada de sessões + tarefas livres do dia. Confirme presença aqui para faturar automaticamente.',
    position: 'right',
  },
  {
    targetId: 'nav-kanban',
    title: '🔀 Jornada Clínica',
    description: 'Board visual do progresso dos pacientes: Fila de Espera → Avaliação → Em Terapia → Preparação para Alta → Alta.',
    position: 'right',
  },
  {
    targetId: 'nav-notas',
    title: '📝 Bloco de Notas',
    description: 'Escreva anotações livres, pensamentos terapêuticos e rascunhos de forma criptografada e com salvamento automático local.',
    position: 'right',
  },
  {
    targetId: 'nav-documentos',
    title: '📄 Documentos',
    description: 'Gere documentos clínicos em PDF: Declaração de Comparecimento, Recibo, Relatório Psicológico e Encaminhamento.',
    position: 'right',
  },
  {
    targetId: 'session-timer',
    title: '⏱️ Cronômetro de Sessão',
    description: 'Controle o tempo de cada atendimento. Clique para iniciar, pausar ou zerar. Fica vermelho ao ultrapassar 1 hora.',
    position: 'right',
  },
  {
    targetId: 'profile-trigger',
    title: '⚙️ Perfil e Segurança',
    description: 'Clique no seu perfil para acessar as configurações gerais do sistema, redefinir ou personalizar atalhos de teclado, refazer este guia, gerar backups criptografados ou bloquear a tela manualmente.',
    position: 'right',
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface TourGuideProps {
  onClose: () => void;
  onNavigate: (tab: string) => void;
}

const tabForStep: Record<string, string> = {
  'nav-dashboard': 'dashboard',
  'nav-pacientes': 'pacientes',
  'nav-agenda': 'agenda',
  'nav-financeiro': 'financeiro',
  'nav-tarefas': 'tarefas',
  'nav-kanban': 'kanban',
  'nav-notas': 'notas',
  'nav-documentos': 'documentos',
  'session-timer': 'dashboard',
  'profile-trigger': 'dashboard',
};

export const TourGuide: React.FC<TourGuideProps> = ({ onClose, onNavigate }) => {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const currentStep = TOUR_STEPS[step];

  const measureTarget = () => {
    const el = document.getElementById(currentStep.targetId);
    if (el) {
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    }
  };

  useLayoutEffect(() => {
    measureTarget();
    window.addEventListener('resize', measureTarget);
    return () => window.removeEventListener('resize', measureTarget);
  }, [step]);

  const handleNext = () => {
    if (step < TOUR_STEPS.length - 1) {
      const nextStep = TOUR_STEPS[step + 1];
      const tab = tabForStep[nextStep.targetId];
      if (tab) onNavigate(tab);
      setTimeout(() => setStep(s => s + 1), 100);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      const prevStep = TOUR_STEPS[step - 1];
      const tab = tabForStep[prevStep.targetId];
      if (tab) onNavigate(tab);
      setTimeout(() => setStep(s => s - 1), 100);
    }
  };

  const PAD = 6;
  const tooltipW = 280;
  const tooltipH = 180;

  let tooltipTop = 0;
  let tooltipLeft = 0;

  if (rect) {
    // Position tooltip to the right of the element
    tooltipLeft = rect.left + rect.width + 16;
    tooltipTop = rect.top + rect.height / 2 - tooltipH / 2;

    // Clamp within viewport
    if (tooltipTop < 12) tooltipTop = 12;
    if (tooltipTop + tooltipH > window.innerHeight - 12) tooltipTop = window.innerHeight - tooltipH - 12;
    if (tooltipLeft + tooltipW > window.innerWidth - 12) tooltipLeft = rect.left - tooltipW - 16;
  }

  return (
    <div className="fixed inset-0 z-[190] pointer-events-none">
      {/* Dark overlay with spotlight cutout */}
      {rect && (
        <svg className="absolute inset-0 w-full h-full pointer-events-auto" onClick={onClose}>
          <defs>
            <mask id="spotlight-mask">
              <rect width="100%" height="100%" fill="white" />
              <rect
                x={rect.left - PAD}
                y={rect.top - PAD}
                width={rect.width + PAD * 2}
                height={rect.height + PAD * 2}
                rx="14"
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width="100%"
            height="100%"
            fill="rgba(0,0,0,0.72)"
            mask="url(#spotlight-mask)"
          />
          {/* Animated gold border around target */}
          <rect
            x={rect.left - PAD}
            y={rect.top - PAD}
            width={rect.width + PAD * 2}
            height={rect.height + PAD * 2}
            rx="14"
            fill="none"
            stroke="rgba(229,193,88,0.85)"
            strokeWidth="2"
            className="animate-pulse"
          />
        </svg>
      )}

      {/* Tooltip card */}
      {rect && (
        <div
          ref={tooltipRef}
          className="pointer-events-auto absolute animate-scaleIn"
          style={{ top: tooltipTop, left: tooltipLeft, width: tooltipW }}
        >
          <div className="bg-[#faf9f6] dark:bg-[#0e0e12] border border-teal-500/40 rounded-2xl shadow-2xl p-4 flex flex-col gap-3">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-black text-charcoal-900 dark:text-white leading-snug">{currentStep.title}</p>
                <p className="text-[9px] font-bold uppercase tracking-widest text-teal-400 mt-0.5">
                  Passo {step + 1} de {TOUR_STEPS.length}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-stone-400 hover:text-stone-700 dark:hover:text-white transition-colors shrink-0 mt-0.5"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="h-1 w-full bg-[#e7e4dc] dark:bg-[#1c1c24] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-600 to-teal-400 rounded-full transition-all duration-500"
                style={{ width: `${((step + 1) / TOUR_STEPS.length) * 100}%` }}
              />
            </div>

            {/* Description */}
            <p className="text-[10.5px] text-stone-600 dark:text-charcoal-300 font-sans leading-relaxed">
              {currentStep.description}
            </p>

            {/* Navigation */}
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handlePrev}
                disabled={step === 0}
                className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-stone-400 hover:text-stone-700 dark:hover:text-white disabled:opacity-30 transition-all"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Anterior
              </button>

              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 uiverse-btn-gold text-white text-[9px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded-xl shadow-md transition-all hover:opacity-90"
              >
                {step < TOUR_STEPS.length - 1 ? (
                  <>Próximo <ChevronRight className="h-3.5 w-3.5" /></>
                ) : (
                  <><Sparkles className="h-3.5 w-3.5" /> Concluir</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
