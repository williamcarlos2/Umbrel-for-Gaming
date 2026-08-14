"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type Alert = {
  id: string; type: string; title: string; message: string;
  href: string; severity: string; icon: string; createdAt: string;
};

const SEVERITY_STYLES: Record<string, string> = {
  urgent:  "border-red-700 bg-red-950/30 text-red-300",
  warning: "border-yellow-700 bg-yellow-950/20 text-yellow-300",
  success: "border-emerald-700 bg-emerald-950/20 text-emerald-300",
  info:    "border-blue-700 bg-blue-950/20 text-blue-300",
};

export function AlertsBanner() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    const stored = sessionStorage.getItem("rv-dismissed-alerts");
    return stored ? new Set(JSON.parse(stored) as string[]) : new Set();
  });

  useEffect(() => {
    fetch("/api/alerts").then(r => r.json()).then(d => setAlerts(d)).catch(() => {});
  }, []);

  const dismiss = (id: string) => {
    const next = new Set([...dismissed, id]);
    setDismissed(next);
    sessionStorage.setItem("rv-dismissed-alerts", JSON.stringify([...next]));
  };

  const visible = alerts.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2 mb-5">
      {visible.map(alert => {
        const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;
        return (
          <div key={alert.id} className={`border-2 p-3 flex items-center gap-3 ${style}`}>
            <span className="text-xl shrink-0">{alert.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-terminal text-sm font-bold">{alert.title}</div>
              <div className="font-terminal text-xs opacity-80">{alert.message}</div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link href={alert.href} className="font-terminal text-xs underline hover:no-underline">View →</Link>
              <button onClick={() => dismiss(alert.id)} className="opacity-50 hover:opacity-100 font-terminal text-sm transition-opacity">✕</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
