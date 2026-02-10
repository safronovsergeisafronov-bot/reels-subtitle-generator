import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  info: Info,
};

const BORDER_COLORS = {
  success: 'border-l-green-500',
  error: 'border-l-red-500',
  info: 'border-l-blue-500',
};

const ICON_COLORS = {
  success: 'text-green-400',
  error: 'text-red-400',
  info: 'text-blue-400',
};

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const toast = useCallback(({ type = 'info', message }) => {
    const id = ++toastId;
    setToasts((prev) => {
      const next = [...prev, { id, type, message, removing: false }];
      // Keep max 3 visible
      if (next.length > 3) {
        return next.slice(next.length - 3);
      }
      return next;
    });

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToasts((prev) =>
        prev.map((t) => (t.id === id ? { ...t, removing: true } : t))
      );
      // Remove from DOM after fade-out animation
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 300);
    }, 3000);
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, removing: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      {/* Toast Container */}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
        role="status"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-center gap-3 bg-zinc-800 border border-zinc-700 border-l-4 ${BORDER_COLORS[t.type]} rounded-lg px-4 py-3 shadow-lg min-w-[280px] max-w-[380px] transition-all duration-300 ${
                t.removing
                  ? 'opacity-0 translate-x-4'
                  : 'opacity-100 translate-x-0 animate-slide-in'
              }`}
            >
              <Icon size={18} className={ICON_COLORS[t.type]} />
              <span className="text-sm text-zinc-200 flex-1">{t.message}</span>
              <button
                onClick={() => dismissToast(t.id)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {/* Inline keyframe animation */}
      <style>{`
        @keyframes slide-in {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
