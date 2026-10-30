import { useToast, ToastType } from '@/context/ToastContext';
import { CheckIcon, AlertIcon, XIcon } from '@/components/Icons';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success':
        return <CheckIcon className="w-5 h-5 text-emerald-400 flex-shrink-0" />;
      case 'warning':
        return <AlertIcon className="w-5 h-5 text-amber-400 flex-shrink-0" />;
      case 'error':
        return <XIcon className="w-5 h-5 text-red-400 flex-shrink-0" />;
      default:
        return <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 flex-shrink-0" />;
    }
  };

  const getBorder = (type: ToastType) => {
    switch (type) {
      case 'success': return 'border-emerald-500/40 bg-slate-900/95';
      case 'warning': return 'border-amber-500/40 bg-slate-900/95';
      case 'error':   return 'border-red-500/40 bg-slate-900/95';
      default:        return 'border-cyan-500/40 bg-slate-900/95';
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-2xl backdrop-blur-md animate-slide-up transition-all ${getBorder(toast.type)}`}
          role="status"
        >
          {getIcon(toast.type)}
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-white tracking-tight">{toast.title}</h4>
            {toast.message && (
              <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{toast.message}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-white p-1 rounded transition"
            aria-label="Dismiss toast"
          >
            <XIcon className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
