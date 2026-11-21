import React from 'react';
import { CheckCircle2, Info, X, AlertCircle } from 'lucide-react';
import { useService } from '../context/ServiceContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = useService();
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-start gap-3 px-4 py-3 rounded-lg bg-[#0A1628] text-white shadow-lg border border-slate-700/80"
        >
          {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />}
          {t.type === 'error' && <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />}
          {t.type === 'info' && <Info className="w-4 h-4 text-[#60A5FA] mt-0.5 shrink-0" />}
          <p className="text-xs leading-relaxed text-slate-100 flex-1">{t.text}</p>
          <button
            type="button"
            onClick={() => dismissToast(t.id)}
            aria-label="Dismiss notification"
            className="text-slate-400 hover:text-white transition-colors p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};
