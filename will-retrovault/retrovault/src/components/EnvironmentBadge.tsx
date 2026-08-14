"use client";

import { useAppConfig } from "@/components/AppConfig";

const STYLES: Record<string, string> = {
  prod: "border-red-700 text-red-300 bg-red-950/30",
  production: "border-red-700 text-red-300 bg-red-950/30",
  nightly: "border-amber-700 text-amber-300 bg-amber-950/30",
  dev: "border-cyan-700 text-cyan-300 bg-cyan-950/30",
  development: "border-cyan-700 text-cyan-300 bg-cyan-950/30",
};

export function EnvironmentBadge() {
  const { runtimeEnv } = useAppConfig();
  const normalized = (runtimeEnv || 'unknown').toLowerCase();
  const style = STYLES[normalized] || "border-zinc-700 text-zinc-300 bg-zinc-950/30";

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1 border font-terminal text-xs uppercase tracking-widest ${style}`}>
      <span>ENV</span>
      <span>{normalized}</span>
    </div>
  );
}
