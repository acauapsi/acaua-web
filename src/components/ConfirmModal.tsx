import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, Info, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  type = 'info'
}) => {
  if (!isOpen) return null;

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return <AlertTriangle className="h-6 w-6 text-red-500 animate-bounce" />;
      case 'warning':
        return <AlertTriangle className="h-6 w-6 text-gold-500" />;
      default:
        return <Info className="h-6 w-6 text-gold-500" />;
    }
  };

  const getConfirmButtonClass = () => {
    switch (type) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-500 text-white hover:shadow-red-500/10';
      default:
        return 'bg-gold-gradient hover:shadow-gold-500/10 text-charcoal-950 font-bold';
    }
  };

  return createPortal(
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-[9999] animate-fadeIn">
      <div className="max-w-md w-full glass-panel-gold rounded-2xl p-6 relative border border-gold-500/30 shadow-2xl animate-scaleIn">
        {/* Close Button */}
        <button 
          onClick={onCancel}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-charcoal-900 border border-charcoal-800 hover:border-gold-500/30 text-charcoal-400 hover:text-white transition-all"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex gap-4 items-start">
          <div className={`p-3 rounded-xl shrink-0 ${
            type === 'danger' ? 'bg-red-500/10 border border-red-500/20' : 'bg-gold-500/10 border border-gold-500/20'
          }`}>
            {getIcon()}
          </div>

          <div className="space-y-2">
            <h3 className="text-lg font-extrabold text-white font-sans tracking-wide leading-tight">
              {title}
            </h3>
            <p className="text-sm text-charcoal-300 leading-relaxed font-sans">
              {message}
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-charcoal-800/80">
          <button
            type="button"
            onClick={onCancel}
            className="px-4.5 py-2.5 bg-charcoal-900 border border-charcoal-800 hover:border-gold-500/20 text-charcoal-300 hover:text-white rounded-xl text-xs font-bold transition-all"
          >
            {cancelText}
          </button>
          
          <button
            type="button"
            onClick={onConfirm}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg ${getConfirmButtonClass()}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
