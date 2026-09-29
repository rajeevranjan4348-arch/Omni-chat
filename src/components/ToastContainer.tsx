import React, { useEffect, useState } from 'react';
import { toastManager, ToastMessage } from '../utils/toast';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    return toastManager.subscribe(setToasts);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => {
        let borderClass = 'border-blue-500/30 bg-slate-900/95 text-blue-200';
        let Icon = Info;
        if (toast.type === 'error') {
          borderClass = 'border-red-500/40 bg-slate-900/95 text-red-200';
          Icon = AlertCircle;
        } else if (toast.type === 'success') {
          borderClass = 'border-emerald-500/40 bg-slate-900/95 text-emerald-200';
          Icon = CheckCircle2;
        } else if (toast.type === 'warning') {
          borderClass = 'border-amber-500/40 bg-slate-900/95 text-amber-200';
          Icon = AlertTriangle;
        }

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl border shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-2 ${borderClass}`}
          >
            <Icon size={18} className="shrink-0 mt-0.5" />
            <div className="flex-1 text-xs leading-relaxed font-medium">
              {toast.text}
            </div>
            <button
              onClick={() => toastManager.remove(toast.id)}
              className="text-white/40 hover:text-white/80 p-0.5 rounded transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
