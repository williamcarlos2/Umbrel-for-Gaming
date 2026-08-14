"use client";
import { useState, useEffect } from "react";
import Link from "next/link";

type Health = {
  status: string; timestamp: string; node: string; uptime: string; diskUsage: string;
  inventory: { total: number; owned: number; withPrices: number; stale30: number; neverFetched: number } | null;
  scrapers: { id: string; name: string; enabled: boolean; status: string; lastRun: string | null; lastRunStatus: string | null }[];
  logs: Record<string, string>;
};

type DatabaseBackupIntegrity = {
  status: "ok" | "warning" | "error";
  timestamp: string;
  database: { path: string; exists: boolean; sizeBytes: number; modifiedAt: string | null };
  backupDirectory: { path: string; exists: boolean };
  latestBackup: { path: string; sizeBytes: number; modifiedAt: string; ageMinutes: number } | null;
  latestSymlink: { path: string; target: string; exists: boolean } | null;
  quickCheck: { ok: boolean; result: string; target: string | null };
  counts: { game: number | null; gameCopy: number | null };
  errors: string[];
};

function StatusDot({ ok }: { ok: boolean }) {
  return <span className={`inline-block w-2 h-2 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'} mr-2`} />;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

function formatAge(minutes: number) {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h ${minutes % 60}m`;
  return `${Math.floor(hours / 24)}d ${hours % 24}h`;
}

export default function HealthPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [backupIntegrity, setBackupIntegrity] = useState<DatabaseBackupIntegrity | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch('/api/health').then(r => r.json()),
      fetch('/api/database-backup-integrity').then(r => r.json()).catch(() => null),
    ]).then(([healthData, backupData]) => { setHealth(healthData); setBackupIntegrity(backupData); setLoading(false); });
  };
  useEffect(() => {
    Promise.all([
      fetch('/api/health').then(r => r.json()),
      fetch('/api/database-backup-integrity').then(r => r.json()).catch(() => null),
    ]).then(([healthData, backupData]) => {
      setHealth(healthData);
      setBackupIntegrity(backupData);
      setLoading(false);
    });
  }, []);

  const exportCollection = async () => {
    setExporting(true);
    const res = await fetch('/api/export');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `retrovault-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  };

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      <div className="border-b-4 border-green-900 pb-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">⚡ System Status</h2>
          <p className="text-zinc-500 font-terminal text-sm mt-1">{health ? `Last checked: ${new Date(health.timestamp).toLocaleTimeString()}` : 'Loading...'}</p>
        </div>
        <div className="flex gap-3">
          <button onClick={load} className="px-4 py-2 font-terminal text-sm text-zinc-400 border border-zinc-700 hover:border-zinc-500 transition-colors">🔄 Refresh</button>
          <button onClick={exportCollection} disabled={exporting} className="px-4 py-2 font-terminal text-sm text-blue-400 border border-blue-800 hover:bg-blue-900/20 transition-colors disabled:opacity-40">{exporting ? "Exporting..." : "⬇️ Export Collection"}</button>
        </div>
      </div>

      {loading ? <div className="text-green-500 font-terminal animate-pulse text-xl text-center py-12">RUNNING DIAGNOSTICS...</div> : health && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[{ label: "Status", val: health.status.toUpperCase(), color: "text-green-400" }, { label: "Uptime", val: health.uptime, color: "text-zinc-300" }, { label: "Node", val: health.node, color: "text-zinc-300" }, { label: "Data Size", val: health.diskUsage, color: "text-zinc-300" }].map(({ label, val, color }) => <div key={label} className="bg-zinc-950 border border-zinc-700 p-4 text-center"><div className={`font-terminal text-xl font-bold ${color}`}>{val}</div><div className="text-zinc-600 font-terminal text-xs mt-1 uppercase">{label}</div></div>)}
          </div>

          {backupIntegrity && (
            <div className={`bg-zinc-950 border-2 p-5 ${backupIntegrity.status === 'ok' ? 'border-green-900' : backupIntegrity.status === 'warning' ? 'border-yellow-700' : 'border-red-700'}`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4"><h3 className="text-green-400 font-terminal text-lg uppercase">🛡️ Database Backup Integrity</h3><span className={`font-terminal text-xs uppercase ${backupIntegrity.status === 'ok' ? 'text-green-400' : backupIntegrity.status === 'warning' ? 'text-yellow-400' : 'text-red-400'}`}><StatusDot ok={backupIntegrity.status === 'ok'} />{backupIntegrity.status}</span></div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[{ label: "DB File", val: backupIntegrity.database.exists ? "Present" : "Missing", color: backupIntegrity.database.exists ? "text-green-400" : "text-red-400" }, { label: "Latest Backup", val: backupIntegrity.latestBackup ? formatAge(backupIntegrity.latestBackup.ageMinutes) : "None", color: backupIntegrity.latestBackup ? "text-blue-400" : "text-yellow-400" }, { label: "SQLite quick_check", val: backupIntegrity.quickCheck.ok ? backupIntegrity.quickCheck.result : "FAILED", color: backupIntegrity.quickCheck.ok ? "text-green-400" : "text-red-400" }, { label: "Game Rows", val: backupIntegrity.counts.game?.toLocaleString() ?? "n/a", color: "text-zinc-300" }, { label: "GameCopy Rows", val: backupIntegrity.counts.gameCopy?.toLocaleString() ?? "n/a", color: "text-zinc-300" }].map(({ label, val, color }) => <div key={label} className="border border-zinc-800 p-3 text-center"><div className={`font-terminal text-xl font-bold ${color}`}>{val}</div><div className="text-zinc-600 font-terminal text-xs mt-1">{label}</div></div>)}
              </div>
              <div className="mt-4 grid gap-2 text-xs font-mono text-zinc-500"><div className="truncate">DB: {backupIntegrity.database.path} ({formatBytes(backupIntegrity.database.sizeBytes)})</div><div className="truncate">Backup dir: {backupIntegrity.backupDirectory.path}</div><div className="truncate">Latest backup: {backupIntegrity.latestBackup ? `${backupIntegrity.latestBackup.path} (${formatBytes(backupIntegrity.latestBackup.sizeBytes)})` : 'none found'}</div><div className="truncate">Latest symlink: {backupIntegrity.latestSymlink ? `${backupIntegrity.latestSymlink.path} → ${backupIntegrity.latestSymlink.target}` : 'none found'}</div><div className="truncate">Integrity target: {backupIntegrity.quickCheck.target ?? 'none'}</div></div>
              {backupIntegrity.errors.length > 0 && <div className="mt-4 border border-yellow-900 bg-yellow-950/20 p-3 text-yellow-400 font-terminal text-xs space-y-1">{backupIntegrity.errors.map((error) => <div key={error}>⚠ {error}</div>)}</div>}
            </div>
          )}

          {health.inventory && <div className="bg-zinc-950 border-2 border-green-900 p-5"><h3 className="text-green-400 font-terminal text-lg uppercase mb-4">📦 Collection Health</h3><div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">{[{ label: "Total in DB", val: health.inventory.total.toLocaleString(), color: "text-zinc-300" }, { label: "Owned", val: health.inventory.owned.toLocaleString(), color: "text-green-400" }, { label: "With Prices", val: health.inventory.withPrices.toLocaleString(), color: "text-blue-400" }, { label: "Stale (30d+)", val: health.inventory.stale30.toLocaleString(), color: health.inventory.stale30 > 0 ? "text-yellow-400" : "text-green-400" }, { label: "Never Fetched", val: health.inventory.neverFetched.toLocaleString(), color: health.inventory.neverFetched > 0 ? "text-orange-400" : "text-green-400" }].map(({ label, val, color }) => <div key={label} className="border border-zinc-800 p-3 text-center"><div className={`font-terminal text-2xl font-bold ${color}`}>{val}</div><div className="text-zinc-600 font-terminal text-xs mt-1">{label}</div></div>)}</div>{(health.inventory.stale30 > 0 || health.inventory.neverFetched > 0) && <div className="mt-3 flex gap-3">{health.inventory.neverFetched > 0 && <Link href="/scrapers" className="text-orange-500 hover:text-orange-400 font-terminal text-xs transition-colors">▶ Run price scraper to fetch {health.inventory.neverFetched} missing prices →</Link>}{health.inventory.stale30 > 0 && <Link href="/scrapers" className="text-yellow-600 hover:text-yellow-400 font-terminal text-xs transition-colors">▶ {health.inventory.stale30} prices are 30+ days old →</Link>}</div>}</div>}

          <div className="bg-zinc-950 border-2 border-zinc-800 p-5"><div className="flex items-center justify-between mb-4"><h3 className="text-zinc-400 font-terminal text-lg uppercase">⚙️ Scrapers</h3><Link href="/scrapers" className="text-zinc-600 hover:text-zinc-400 font-terminal text-xs transition-colors">Full control →</Link></div><div className="space-y-2">{health.scrapers.map(s => <div key={s.id} className="flex items-center gap-3 border border-zinc-900 p-2"><StatusDot ok={s.enabled && s.status !== 'error'} /><span className="text-zinc-300 font-terminal text-sm flex-1">{s.name}</span><span className={`font-terminal text-xs ${s.status === 'running' ? 'text-green-400' : s.status === 'error' ? 'text-red-400' : s.enabled ? 'text-zinc-400' : 'text-zinc-700'}`}>{s.enabled ? s.status.toUpperCase() : 'DISABLED'}</span><span className="text-zinc-700 font-terminal text-xs">{s.lastRun ? new Date(s.lastRun).toLocaleDateString() : 'Never run'}</span></div>)}</div></div>

          <div className="bg-zinc-950 border-2 border-zinc-800 p-5"><h3 className="text-zinc-400 font-terminal text-lg uppercase mb-4">📋 Recent Log Activity</h3><div className="space-y-2">{Object.entries(health.logs).map(([key, line]) => <div key={key} className="border border-zinc-900 p-2"><div className="text-zinc-600 font-terminal text-xs uppercase mb-1">{key}</div><div className="text-zinc-400 font-mono text-xs truncate">{line}</div></div>)}</div></div>

          <div className="bg-zinc-950 border-2 border-blue-900 p-5"><h3 className="text-blue-400 font-terminal text-lg uppercase mb-3">⬇️ Backup & Export</h3><p className="text-zinc-500 font-terminal text-sm mb-4">Export your entire collection as a single JSON file. Use it to migrate, back up, or transfer your data.</p><div className="flex flex-wrap gap-3"><button onClick={exportCollection} disabled={exporting} className="px-5 py-2 bg-blue-700 hover:bg-blue-600 text-white font-terminal text-base font-bold border-2 border-blue-500 transition-colors disabled:opacity-40">{exporting ? "Generating..." : "⬇️ Download Full Collection"}</button><a href="/api/export?file=inventory.json" download className="px-4 py-2 font-terminal text-sm text-zinc-400 border border-zinc-700 hover:border-zinc-500 transition-colors">Inventory only</a><a href="/api/export?file=sales.json" download className="px-4 py-2 font-terminal text-sm text-zinc-400 border border-zinc-700 hover:border-zinc-500 transition-colors">Sales data only</a></div><p className="text-zinc-700 font-terminal text-xs mt-3">Backup tip: copy your entire <code className="bg-zinc-900 px-1">data/</code> folder for a complete backup including config and all history.</p></div>
        </div>
      )}
    </div>
  );
}
