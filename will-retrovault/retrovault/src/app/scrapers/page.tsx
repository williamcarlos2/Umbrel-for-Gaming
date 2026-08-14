"use client";

import { useState, useEffect, useRef } from "react";

type Scraper = {
  id: string; name: string; description: string; script: string; logFile: string;
  featureGroup: string | null; enabled: boolean; status: string;
  lastRun: string | null; lastRunStatus: string | null; nextRun: string | null;
  cadenceHour: number; cadenceType: "hourly" | "daily" | "weekly";
  itemsProcessed: number; itemsTotal: number; defaultCadenceHour: number;
  logSize: number; logExists: boolean;
};

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string; pulse: boolean }> = {
  idle:           { label: "IDLE",          color: "text-zinc-400",   dot: "bg-zinc-600",   pulse: false },
  running:        { label: "RUNNING",       color: "text-green-400",  dot: "bg-green-500",  pulse: true  },
  error:          { label: "ERROR",         color: "text-red-400",    dot: "bg-red-500",    pulse: false },
  not_configured: { label: "NOT BUILT YET", color: "text-zinc-600",   dot: "bg-zinc-800",   pulse: false },
  success:        { label: "COMPLETED",     color: "text-emerald-400",dot: "bg-emerald-500",pulse: false },
};

const CADENCE_OPTIONS = [
  { type: "hourly",  label: "Every hour",    hours: [1, 2, 4, 6, 12] },
  { type: "daily",   label: "Once a day",    hours: Array.from({length: 24}, (_, i) => i) },
  { type: "weekly",  label: "Once a week",   hours: [0, 6, 12, 18] },
];

function fmtBytes(b: number) {
  if (b < 1024) return `${b}B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`;
  return `${(b / 1024 / 1024).toFixed(1)}MB`;
}

function fmtTime(iso: string | null) {
  if (!iso) return "Never";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function fmtLastSuccess(scraper: Scraper) {
  if (!scraper.lastRun) return 'Never';
  if (scraper.lastRunStatus === 'success') return fmtTime(scraper.lastRun);
  return 'Last run failed';
}

function cadenceLabel(s: Scraper): string {
  if (s.cadenceType === "hourly") return `Every ${s.cadenceHour}h`;
  if (s.cadenceType === "daily") return `Daily at ${s.cadenceHour}:00`;
  if (s.cadenceType === "weekly") return `Weekly (Mon ${s.cadenceHour}:00)`;
  return "Custom";
}

function scheduleNotificationDismiss(setNotifications: React.Dispatch<React.SetStateAction<string[]>>, msg: string) {
  setTimeout(() => setNotifications(n => n.filter(x => x !== msg)), 8000);
}

export default function ScrapersPage() {
  const [scrapers, setScrapers] = useState<Scraper[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLog, setActiveLog] = useState<string | null>(null);
  const [logLines, setLogLines] = useState<string[]>([]);
  const [loadingLog, setLoadingLog] = useState(false);
  const [editCadence, setEditCadence] = useState<string | null>(null);
  const [cadenceForm, setCadenceForm] = useState({ type: "daily", hour: 0 });
  const [, setRunningIds] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<Record<string, { scheduled: boolean; cronExpr: string | null }>>({});

  const load = () => {
    fetch("/api/scrapers").then(r => r.json()).then((d: Scraper[]) => {
      setScrapers(d);
      setLoading(false);
    });
    // Also fetch scheduler status
    fetch("/api/scrapers/status").then(r => r.json()).then(d => setSchedulerStatus(d)).catch(() => {});
  };

  useEffect(() => {
    load();
    // Poll every 5s while any scraper is running
    pollRef.current = setInterval(() => {
      fetch("/api/scrapers").then(r => r.json()).then((d: Scraper[]) => {
        setScrapers(d);
        const stillRunning = new Set(d.filter(s => s.status === "running").map(s => s.id));
        setRunningIds(prev => {
          // Detect newly completed scrapers
          prev.forEach(id => {
            if (!stillRunning.has(id)) {
              const s = d.find(s => s.id === id);
              if (s) {
                const msg = `✅ ${s.name} completed`;
                setNotifications(n => [msg, ...n].slice(0, 5));
                scheduleNotificationDismiss(setNotifications, msg);
              }
            }
          });
          return stillRunning;
        });
      });
    }, 5000);
    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logLines]);

  function notify(msg: string) {
    setNotifications(n => [msg, ...n].slice(0, 5));
    scheduleNotificationDismiss(setNotifications, msg);
  }

  const runScraper = async (id: string) => {
    const scraper = scrapers.find(s => s.id === id);
    if (!scraper) return;
    if (scraper.status === "not_configured") {
      notify(`⚠️ ${scraper.name} script not built yet`);
      return;
    }
    setRunningIds(prev => new Set([...prev, id]));
    setScrapers(prev => prev.map(s => s.id === id ? { ...s, status: "running" } : s));
    notify(`▶ ${scraper.name} started`);
    await fetch("/api/scrapers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "run", id })
    });
  };

  const toggleEnabled = async (id: string) => {
    const scraper = scrapers.find(s => s.id === id);
    if (!scraper) return;
    const res = await fetch("/api/scrapers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "toggle_enabled", id })
    });
    const updated = await res.json();
    setScrapers(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
    if (updated.enabled) {
      notify(`✅ ${scraper.name} enabled — scheduled automatically (${cadenceLabel(updated)})`);
    } else {
      notify(`⏸ ${scraper.name} disabled — removed from schedule`);
    }
  };

  const loadLog = async (id: string) => {
    setActiveLog(id); setLoadingLog(true); setLogLines([]);
    const res = await fetch(`/api/scrapers?id=${id}&log=100`);
    const d = await res.json();
    setLogLines(d.lines || []);
    setLoadingLog(false);
  };

  const clearLog = async (id: string) => {
    await fetch("/api/scrapers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "clear_log", id })
    });
    setLogLines([]);
    notify("Log cleared");
  };

  const saveCadence = async (id: string) => {
    const res = await fetch("/api/scrapers", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "update_cadence", id, cadenceType: cadenceForm.type, cadenceHour: cadenceForm.hour })
    });
    const updated = await res.json();
    setScrapers(prev => prev.map(s => s.id === id ? { ...s, ...updated } : s));
    setEditCadence(null);
    notify(`⏱ Schedule updated: ${cadenceLabel(updated)}`);
  };

  const enabledCount = scrapers.filter(s => s.enabled).length;
  const runningCount = scrapers.filter(s => s.status === "running").length;

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">

      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        {notifications.map((n, i) => (
          <div key={i} className="bg-zinc-900 border border-green-700 px-4 py-2 font-terminal text-sm text-green-300 shadow-lg animate-pulse">
            {n}
          </div>
        ))}
      </div>

      <div className="border-b-4 border-green-900 pb-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">⚙️ Scraper Control Center</h2>
          <p className="text-zinc-500 font-terminal text-sm mt-1">
            {enabledCount} active · {runningCount > 0 ? <span className="text-green-400">{runningCount} running</span> : "none running"}
          </p>
        </div>
        <button onClick={load} className="px-4 py-2 font-terminal text-sm text-zinc-400 border border-zinc-700 hover:border-zinc-500 transition-colors">
          🔄 REFRESH STATUS
        </button>
      </div>

      {loading ? (
        <div className="text-green-500 font-terminal text-2xl animate-pulse text-center py-12">LOADING SCRAPERS...</div>
      ) : (
        <div className="space-y-4">
          {scrapers.map(s => {
            const statusCfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.idle;
            const isRunning = s.status === "running";
            const isBuilt = s.status !== "not_configured";

            return (
              <div key={s.id} className={`border-2 transition-all ${
                isRunning ? "border-green-600 shadow-[0_0_10px_rgba(34,197,94,0.2)]" :
                !s.enabled ? "border-zinc-800 opacity-60" :
                s.lastRunStatus === "error" ? "border-red-800" :
                "border-zinc-700 hover:border-zinc-500"
              }`}>
                {/* Header row */}
                <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Status dot + name */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${statusCfg.dot} ${statusCfg.pulse ? "animate-pulse" : ""}`} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-zinc-200 font-terminal text-base">{s.name}</span>
                        {s.featureGroup && (
                          <span className="text-zinc-600 font-terminal text-xs px-1.5 py-0.5 border border-zinc-800">
                            {s.featureGroup}
                          </span>
                        )}
                      </div>
                      <p className="text-zinc-600 font-terminal text-xs mt-0.5 truncate">{s.description}</p>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 text-center shrink-0 flex-wrap">
                    <div>
                      <div className={`font-terminal text-sm ${statusCfg.color}`}>{statusCfg.label}</div>
                      <div className="text-zinc-700 font-terminal text-xs">status</div>
                    </div>
                    <div>
                      <div className="text-zinc-400 font-terminal text-sm">{fmtTime(s.lastRun)}</div>
                      <div className="text-zinc-700 font-terminal text-xs">last attempt</div>
                    </div>
                    <div>
                      <div className={`font-terminal text-sm ${s.lastRunStatus === 'success' ? 'text-emerald-400' : 'text-zinc-500'}`}>{fmtLastSuccess(s)}</div>
                      <div className="text-zinc-700 font-terminal text-xs">last successful run</div>
                    </div>
                    <div>
                      <div className="text-zinc-400 font-terminal text-sm">{cadenceLabel(s)}</div>
                      <div className="text-zinc-700 font-terminal text-xs">schedule</div>
                    </div>
                    {/* In-process scheduler status */}
                    {schedulerStatus[s.id] && (
                      <div>
                        <div className={`font-terminal text-sm ${
                          schedulerStatus[s.id].scheduled ? 'text-emerald-400' : 'text-zinc-600'
                        }`}>
                          {schedulerStatus[s.id].scheduled ? '⏰ SCHEDULED' : '⏸ NOT SCHEDULED'}
                        </div>
                        <div className="text-zinc-700 font-terminal text-xs">
                          {schedulerStatus[s.id].cronExpr || 'on-demand'}
                        </div>
                      </div>
                    )}
                    {s.logSize > 0 && (
                      <div>
                        <div className="text-zinc-500 font-terminal text-sm">{fmtBytes(s.logSize)}</div>
                        <div className="text-zinc-700 font-terminal text-xs">log size</div>
                      </div>
                    )}
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {/* Enable/Disable toggle */}
                    <button onClick={() => toggleEnabled(s.id)}
                      className={`px-3 py-1.5 font-terminal text-xs border-2 transition-colors ${
                        s.enabled
                          ? "bg-green-800/50 text-green-300 border-green-700 hover:bg-red-900/30 hover:text-red-400 hover:border-red-800"
                          : "text-zinc-500 border-zinc-700 hover:border-green-700 hover:text-green-400"
                      }`}>
                      {s.enabled ? "ENABLED" : "DISABLED"}
                    </button>

                    {/* Run now */}
                    <button onClick={() => runScraper(s.id)}
                      disabled={isRunning || !isBuilt}
                      className={`px-3 py-1.5 font-terminal text-xs border transition-colors ${
                        isRunning ? "text-green-400 border-green-700 animate-pulse cursor-not-allowed" :
                        !isBuilt ? "text-zinc-700 border-zinc-800 cursor-not-allowed" :
                        "text-blue-400 border-blue-800 hover:bg-blue-900/20"
                      }`}>
                      {isRunning ? "▶ RUNNING..." : "▶ RUN NOW"}
                    </button>

                    {/* Schedule */}
                    <button onClick={() => {
                      setEditCadence(editCadence === s.id ? null : s.id);
                      setCadenceForm({ type: s.cadenceType, hour: s.cadenceHour });
                    }}
                      className="px-3 py-1.5 font-terminal text-xs text-zinc-500 border border-zinc-700 hover:border-zinc-500 transition-colors">
                      ⏱ SCHEDULE
                    </button>

                    {/* View log */}
                    {s.logExists && (
                      <button onClick={() => activeLog === s.id ? setActiveLog(null) : loadLog(s.id)}
                        className={`px-3 py-1.5 font-terminal text-xs border transition-colors ${
                          activeLog === s.id ? "text-yellow-400 border-yellow-700" : "text-zinc-600 border-zinc-800 hover:border-zinc-600"
                        }`}>
                        📋 LOG
                      </button>
                    )}
                  </div>
                </div>

                {/* Not built badge */}
                {!isBuilt && (
                  <div className="px-4 pb-3">
                    <div className="bg-zinc-900 border border-zinc-700 px-3 py-2 font-terminal text-xs text-zinc-500 flex items-center gap-2">
                      <span>🔧</span>
                      <span>Script not yet built. Enable this scraper to queue it for development, or run it manually when ready.</span>
                    </div>
                  </div>
                )}

                {/* Cadence editor */}
                {editCadence === s.id && (
                  <div className="border-t border-zinc-800 p-4 bg-zinc-950">
                    <p className="text-zinc-400 font-terminal text-xs uppercase mb-3">Schedule</p>
                    <div className="flex flex-wrap gap-3 items-end">
                      <div>
                        <label className="block text-zinc-600 font-terminal text-xs mb-1">Frequency</label>
                        <div className="flex gap-2">
                          {CADENCE_OPTIONS.map(opt => (
                            <button key={opt.type} onClick={() => setCadenceForm(f => ({ ...f, type: opt.type, hour: opt.hours[0] }))}
                              className={`px-3 py-1 font-terminal text-xs border-2 transition-colors ${cadenceForm.type === opt.type ? "bg-green-700 text-black border-green-500" : "text-zinc-500 border-zinc-700 hover:border-zinc-500"}`}>
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <label className="block text-zinc-600 font-terminal text-xs mb-1">
                          {cadenceForm.type === "hourly" ? "Every N hours" : "Hour (24h)"}
                        </label>
                        <select value={cadenceForm.hour} onChange={e => setCadenceForm(f => ({ ...f, hour: parseInt(e.target.value) }))}
                          className="bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-sm p-1.5 focus:outline-none cursor-pointer">
                          {CADENCE_OPTIONS.find(o => o.type === cadenceForm.type)?.hours.map(h => (
                            <option key={h} value={h}>
                              {cadenceForm.type === "hourly" ? `Every ${h}h` : `${h}:00`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button onClick={() => saveCadence(s.id)}
                        className="px-4 py-1.5 bg-green-700 hover:bg-green-600 text-black font-terminal text-sm font-bold border border-green-500 transition-colors">
                        SAVE
                      </button>
                      <button onClick={() => setEditCadence(null)}
                        className="px-3 py-1.5 font-terminal text-sm text-zinc-500 border border-zinc-700">
                        CANCEL
                      </button>
                    </div>
                    <p className="text-zinc-700 font-terminal text-xs mt-2">
                      Enabling this scraper will automatically register it in crontab with the schedule above.
                    </p>
                  </div>
                )}

                {/* Log viewer */}
                {activeLog === s.id && (
                  <div className="border-t border-zinc-800">
                    <div className="flex items-center justify-between px-4 py-2 bg-zinc-950">
                      <span className="text-zinc-500 font-terminal text-xs uppercase">
                        {s.logFile} ({fmtBytes(s.logSize)})
                      </span>
                      <div className="flex gap-2">
                        <button onClick={() => loadLog(s.id)} className="text-zinc-600 hover:text-zinc-400 font-terminal text-xs">↻ Refresh</button>
                        <button onClick={() => clearLog(s.id)} className="text-red-700 hover:text-red-500 font-terminal text-xs">🗑 Clear</button>
                        <button onClick={() => setActiveLog(null)} className="text-zinc-600 hover:text-zinc-400 font-terminal text-xs">✕</button>
                      </div>
                    </div>
                    <div ref={logRef} className="bg-black p-4 h-48 overflow-y-auto font-mono text-xs text-zinc-400 space-y-0.5">
                      {loadingLog ? (
                        <div className="text-green-500 animate-pulse">Loading log...</div>
                      ) : logLines.length === 0 ? (
                        <div className="text-zinc-700">Log is empty.</div>
                      ) : (
                        logLines.map((line, i) => (
                          <div key={i} className={
                            line.includes("error") || line.includes("Error") || line.includes("ERROR") ? "text-red-400" :
                            line.includes("✅") || line.includes("Saved") || line.includes("success") ? "text-green-400" :
                            line.includes("⚠️") || line.includes("warn") ? "text-yellow-400" :
                            "text-zinc-500"
                          }>{line}</div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Info panel */}
      <div className="mt-8 border border-zinc-800 bg-zinc-950 p-4">
        <p className="text-zinc-500 font-terminal text-xs uppercase mb-2">How scrapers work</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-terminal text-xs text-zinc-600">
          <div><span className="text-zinc-400">Enable →</span> Registers in system crontab with selected schedule. Runs automatically in background.</div>
          <div><span className="text-zinc-400">Run Now →</span> Triggers immediately regardless of schedule. Useful for first-time setup or manual refresh.</div>
          <div><span className="text-zinc-400">Log →</span> Tail of the last 100 log lines. Color-coded for errors, warnings, and success messages.</div>
        </div>
      </div>
    </div>
  );
}
