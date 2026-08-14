"use client";

import { createContext, useContext, useState, useCallback } from "react";

type ToastType = "success" | "error" | "warning" | "info";

type Toast = {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
};

type ToastContextType = {
  toast: (message: string, type?: ToastType, duration?: number) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
};

const ToastContext = createContext<ToastContextType>({
  toast: () => {}, success: () => {}, error: () => {}, warning: () => {}, info: () => {},
});

export const useToast = () => useContext(ToastContext);

const STYLES: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: { bg: "bg-emerald-950",  border: "border-emerald-600", icon: "✅", text: "text-emerald-300" },
  error:   { bg: "bg-red-950",      border: "border-red-600",     icon: "❌", text: "text-red-300"     },
  warning: { bg: "bg-yellow-950",   border: "border-yellow-600",  icon: "⚠️", text: "text-yellow-300"  },
  info:    { bg: "bg-blue-950",     border: "border-blue-600",    icon: "ℹ️", text: "text-blue-300"    },
};

export function ToastStack({ toasts, remove }: { toasts: Toast[]; remove: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-[300] space-y-2 pointer-events-none" style={{ maxWidth: "360px" }}>
      {toasts.map(t => {
        const s = STYLES[t.type];
        return (
          <div key={t.id}
            className={`${s.bg} ${s.border} border-2 px-4 py-3 font-terminal text-sm shadow-lg flex items-start gap-3 pointer-events-auto animate-in slide-in-from-right duration-200`}>
            <span className="shrink-0 mt-0.5">{s.icon}</span>
            <span className={`${s.text} flex-1`}>{t.message}</span>
            <button onClick={() => remove(t.id)} className="text-zinc-600 hover:text-zinc-300 shrink-0 text-xs transition-colors">✕</button>
          </div>
        );
      })}
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "info", duration = 4000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev.slice(-4), { id, message, type, duration }]); // max 5 at once
    if (duration > 0) setTimeout(() => remove(id), duration);
  }, [remove]);

  const success = useCallback((m: string) => toast(m, "success"), [toast]);
  const error   = useCallback((m: string) => toast(m, "error", 6000), [toast]);
  const warning = useCallback((m: string) => toast(m, "warning"), [toast]);
  const info    = useCallback((m: string) => toast(m, "info"), [toast]);

  return (
    <ToastContext.Provider value={{ toast, success, error, warning, info }}>
      {children}
      <ToastStack toasts={toasts} remove={remove} />
    </ToastContext.Provider>
  );
}
