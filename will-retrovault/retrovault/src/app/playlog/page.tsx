"use client";

import { useState, useEffect } from "react";

type PlayLogEntry = {
  id: string; title: string; platform: string;
  status: 'playing' | 'beat' | 'gave_up' | 'want_to_play' | 'backlog';
  rating?: number; notes?: string; startedAt?: string; finishedAt?: string; updatedAt: string;
};

const STATUSES = [
  { id: 'playing', label: '🎮 Playing', color: 'text-green-400 border-green-700 bg-green-900/20' },
  { id: 'beat', label: '🏆 Beaten', color: 'text-yellow-400 border-yellow-700 bg-yellow-900/10' },
  { id: 'want_to_play', label: '👀 Want to Play', color: 'text-blue-400 border-blue-800 bg-blue-900/10' },
  { id: 'backlog', label: '📚 Backlog', color: 'text-zinc-400 border-zinc-700 bg-zinc-900/20' },
  { id: 'gave_up', label: '🙅 Gave Up', color: 'text-red-400 border-red-900 bg-red-900/10' },
];

const PLATFORMS = ["NES","SNES","N64","Gamecube","Switch","Sega Genesis","Sega CD","Dreamcast","PS1","PS2","PS3","PSP","Xbox","Xbox 360"];

function StatusBadge({ status }: { status: string }) {
  const s = STATUSES.find(x => x.id === status);
  return <span className={`font-terminal text-xs px-2 py-0.5 border ${s?.color || 'text-zinc-400 border-zinc-700'}`}>{s?.label || status}</span>;
}

export default function PlayLogPage() {
  const [entries, setEntries] = useState<PlayLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editEntry, setEditEntry] = useState<PlayLogEntry | null>(null);

  // Form state
  const [form, setForm] = useState({ title: '', platform: '', status: 'want_to_play' as PlayLogEntry['status'], rating: 0, notes: '' });

  const load = () => {
    fetch('/api/playlog').then(r => r.json()).then(d => { setEntries(d); setLoading(false); });
  };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.title.trim()) return;
    await fetch('/api/playlog', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upsert', ...form, id: editEntry?.id }),
    });
    setShowAdd(false); setEditEntry(null);
    setForm({ title: '', platform: '', status: 'want_to_play', rating: 0, notes: '' });
    load();
  };

  const setStatus = async (id: string, status: PlayLogEntry['status']) => {
    await fetch('/api/playlog', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_status', id, status }) });
    load();
  };

  const del = async (id: string) => {
    await fetch('/api/playlog', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }) });
    load();
  };

  const openEdit = (e: PlayLogEntry) => {
    setEditEntry(e);
    setForm({ title: e.title, platform: e.platform, status: e.status, rating: e.rating || 0, notes: e.notes || '' });
    setShowAdd(true);
  };

  const filtered = entries.filter(e => {
    if (filterStatus !== 'all' && e.status !== filterStatus) return false;
    if (search && !e.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const counts = STATUSES.reduce((acc, s) => {
    acc[s.id] = entries.filter(e => e.status === s.id).length;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      <div className="border-b-4 border-green-900 pb-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">🎮 Play Log</h2>
          <p className="text-zinc-500 font-terminal text-sm mt-1">{entries.length} games tracked</p>
        </div>
        <button onClick={() => { setEditEntry(null); setForm({ title: '', platform: '', status: 'want_to_play', rating: 0, notes: '' }); setShowAdd(true); }}
          className="px-5 py-2 bg-green-600 hover:bg-green-500 text-black font-terminal text-xl font-bold border-2 border-green-400 transition-colors">
          + LOG GAME
        </button>
      </div>

      {/* Stats strip */}
      <div className="flex flex-wrap gap-3 mb-6">
        {STATUSES.map(s => (
          <button key={s.id} onClick={() => setFilterStatus(filterStatus === s.id ? 'all' : s.id)}
            className={`px-3 py-1 font-terminal text-sm border-2 transition-colors ${filterStatus === s.id ? s.color : 'text-zinc-600 border-zinc-800 hover:border-zinc-600'}`}>
            {s.label} <span className="opacity-60">({counts[s.id] || 0})</span>
          </button>
        ))}
        <button onClick={() => setFilterStatus('all')}
          className={`px-3 py-1 font-terminal text-sm border-2 transition-colors ${filterStatus === 'all' ? 'text-white border-zinc-400 bg-zinc-800' : 'text-zinc-600 border-zinc-800'}`}>
          ALL ({entries.length})
        </button>
      </div>

      {/* Search */}
      <input type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search games..."
        className="w-full bg-zinc-950 border-2 border-zinc-800 text-zinc-300 font-terminal text-xl p-2 mb-6 focus:outline-none focus:border-green-600 max-w-md" />

      {/* List */}
      {loading ? <div className="text-green-500 font-terminal animate-pulse">LOADING...</div> : (
        <div className="space-y-2">
          {filtered.map(e => (
            <div key={e.id} className="bg-zinc-950 border border-zinc-800 p-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:border-zinc-600 transition-colors group">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="text-green-300 font-terminal text-lg truncate">{e.title}</span>
                  <span className="text-zinc-600 font-terminal text-sm">{e.platform}</span>
                  <StatusBadge status={e.status} />
                  {e.rating ? <span className="text-yellow-400 font-terminal text-sm">{"⭐".repeat(e.rating)}</span> : null}
                </div>
                {e.notes && <p className="text-zinc-600 font-terminal text-xs mt-1 truncate">{e.notes}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {/* Quick status buttons */}
                {STATUSES.filter(s => s.id !== e.status).slice(0, 2).map(s => (
                  <button key={s.id} onClick={() => setStatus(e.id, s.id as PlayLogEntry['status'])}
                    className="text-zinc-700 hover:text-zinc-300 font-terminal text-xs px-2 py-1 border border-zinc-800 hover:border-zinc-600 transition-colors hidden sm:block">
                    → {s.label.split(' ').slice(1).join(' ')}
                  </button>
                ))}
                <button onClick={() => openEdit(e)} className="text-zinc-600 hover:text-blue-400 font-terminal text-sm px-2 transition-colors">✏️</button>
                <button onClick={() => del(e.id)} className="text-zinc-700 hover:text-red-400 font-terminal text-sm px-2 transition-colors">✕</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && <div className="text-zinc-700 font-terminal text-xl text-center py-8">No games here yet.</div>}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-zinc-950 border-4 border-green-700 p-6 w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-green-400 font-terminal text-2xl uppercase">{editEntry ? 'Edit Entry' : 'Log a Game'}</h3>

            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Game title..." className="w-full bg-black border-2 border-zinc-700 text-green-300 font-terminal text-xl p-2 focus:outline-none focus:border-green-500" />

            <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
              className="w-full bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-base p-2 focus:outline-none cursor-pointer">
              <option value="">Platform...</option>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <div>
              <label className="block text-zinc-500 font-terminal text-xs uppercase mb-2">Status</label>
              <div className="grid grid-cols-2 gap-2">
                {STATUSES.map(s => (
                  <button key={s.id} onClick={() => setForm(f => ({ ...f, status: s.id as PlayLogEntry['status'] }))}
                    className={`py-2 font-terminal text-sm border-2 transition-colors ${form.status === s.id ? s.color : 'text-zinc-600 border-zinc-800'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-zinc-500 font-terminal text-xs uppercase mb-2">Rating</label>
              <div className="flex gap-2">
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setForm(f => ({ ...f, rating: f.rating === n ? 0 : n }))}
                    className={`text-2xl transition-all ${form.rating >= n ? 'opacity-100' : 'opacity-20'}`}>⭐</button>
                ))}
              </div>
            </div>

            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notes (optional)..." rows={2}
              className="w-full bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-sm p-2 focus:outline-none focus:border-zinc-500 resize-none" />

            <div className="flex gap-3 pt-2">
              <button onClick={save} className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-black font-terminal text-xl font-bold border-2 border-green-400 transition-colors">
                SAVE
              </button>
              <button onClick={() => setShowAdd(false)} className="px-6 py-2 font-terminal text-xl text-zinc-400 border border-zinc-700 hover:border-zinc-400 transition-colors">
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
