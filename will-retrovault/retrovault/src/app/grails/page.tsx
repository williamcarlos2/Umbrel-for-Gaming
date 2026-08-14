"use client";

import { useState, useEffect } from "react";

type GrailEntry = {
  id: string; title: string; platform: string; notes?: string;
  priority: 1 | 2 | 3; addedAt: string; acquiredAt?: string;
};

const PRIORITY = {
  1: { label: "🔥 Must Have", color: "border-red-700 bg-red-950/20 text-red-400" },
  2: { label: "👀 Want It", color: "border-yellow-700 bg-yellow-950/10 text-yellow-400" },
  3: { label: "💭 Someday", color: "border-zinc-700 bg-zinc-900/20 text-zinc-400" },
};

const PLATFORMS = ["NES","SNES","N64","Gamecube","Switch","Sega Genesis","Sega CD","Dreamcast","PS1","PS2","PS3","PSP","Xbox","Xbox 360"];

export default function GrailsPage() {
  const [grails, setGrails] = useState<GrailEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'found'>('active');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ title: '', platform: '', notes: '', priority: 2 as 1 | 2 | 3 });

  const load = () => fetch('/api/grails').then(r => r.json()).then(d => { setGrails(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!form.title.trim()) return;
    await fetch('/api/grails', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add', ...form }) });
    setShowAdd(false); setForm({ title: '', platform: '', notes: '', priority: 2 });
    load();
  };

  const markFound = async (id: string) => {
    await fetch('/api/grails', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'acquired', id }) });
    load();
  };

  const del = async (id: string) => {
    await fetch('/api/grails', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }) });
    load();
  };

  const filtered = grails.filter(g => {
    if (filter === 'active' && g.acquiredAt) return false;
    if (filter === 'found' && !g.acquiredAt) return false;
    if (search && !g.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }).sort((a, b) => a.priority - b.priority);

  const active = grails.filter(g => !g.acquiredAt).length;
  const found = grails.filter(g => !!g.acquiredAt).length;

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      <div className="border-b-4 border-green-900 pb-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">🏴‍☠️ Holy Grail Tracker</h2>
          <p className="text-zinc-500 font-terminal text-sm mt-1">
            {active} hunting · {found} found 🎉
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="px-5 py-2 bg-red-700 hover:bg-red-600 text-white font-terminal text-xl font-bold border-2 border-red-500 transition-colors">
          + ADD GRAIL
        </button>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {[
          { id: 'active', label: `🔍 Hunting (${active})` },
          { id: 'found', label: `✅ Found (${found})` },
          { id: 'all', label: `📋 All (${grails.length})` },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id as 'active' | 'found' | 'all')}
            className={`px-4 py-2 font-terminal text-sm uppercase border-2 transition-colors ${filter === f.id ? 'bg-green-700 text-black border-green-500' : 'text-zinc-500 border-zinc-700 hover:border-zinc-500'}`}>
            {f.label}
          </button>
        ))}
      </div>

      <input type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search grails..." className="w-full bg-zinc-950 border-2 border-zinc-800 text-zinc-300 font-terminal text-xl p-2 mb-6 focus:outline-none focus:border-green-600 max-w-md" />

      {/* Grail list */}
      {loading ? <div className="text-green-500 font-terminal animate-pulse">LOADING...</div> : (
        <div className="space-y-3">
          {filtered.map(g => (
            <div key={g.id} className={`border-2 p-4 flex flex-col sm:flex-row sm:items-center gap-3 transition-colors ${
              g.acquiredAt ? 'border-emerald-900 bg-emerald-950/10 opacity-75' : PRIORITY[g.priority].color
            }`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 flex-wrap">
                  {g.acquiredAt && <span className="text-emerald-400 font-terminal text-sm">✅ FOUND!</span>}
                  <span className={`font-terminal text-xl ${g.acquiredAt ? 'text-emerald-300 line-through' : 'text-zinc-200'}`}>{g.title}</span>
                  {g.platform && <span className="text-zinc-600 font-terminal text-sm">{g.platform}</span>}
                  <span className={`font-terminal text-xs px-2 py-0.5 border ${PRIORITY[g.priority].color}`}>
                    {PRIORITY[g.priority].label}
                  </span>
                </div>
                {g.notes && <p className="text-zinc-600 font-terminal text-xs mt-1">{g.notes}</p>}
                {g.acquiredAt && <p className="text-emerald-700 font-terminal text-xs mt-1">Found {new Date(g.acquiredAt).toLocaleDateString()}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {!g.acquiredAt && (
                  <button onClick={() => markFound(g.id)}
                    className="px-3 py-1 bg-emerald-800 hover:bg-emerald-700 text-emerald-200 font-terminal text-sm border border-emerald-600 transition-colors">
                    ✅ FOUND IT!
                  </button>
                )}
                <button onClick={() => del(g.id)} className="text-zinc-700 hover:text-red-400 font-terminal text-sm px-2 transition-colors">✕</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="text-zinc-700 font-terminal text-xl text-center py-8">
              {filter === 'active' ? "No grails on the hunt. Add some!" : "No grails here yet."}
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-zinc-950 border-4 border-red-800 p-6 w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-red-400 font-terminal text-2xl uppercase">🏴‍☠️ Add Holy Grail</h3>

            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Game title..." className="w-full bg-black border-2 border-zinc-700 text-green-300 font-terminal text-xl p-2 focus:outline-none focus:border-red-600" autoFocus />

            <select value={form.platform} onChange={e => setForm(f => ({ ...f, platform: e.target.value }))}
              className="w-full bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-base p-2 focus:outline-none cursor-pointer">
              <option value="">Platform (optional)...</option>
              {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <div>
              <label className="block text-zinc-500 font-terminal text-xs uppercase mb-2">Priority</label>
              <div className="grid grid-cols-3 gap-2">
                {([1, 2, 3] as const).map(n => (
                  <button key={n} onClick={() => setForm(f => ({ ...f, priority: n }))}
                    className={`py-2 font-terminal text-sm border-2 transition-colors ${form.priority === n ? PRIORITY[n].color : 'text-zinc-600 border-zinc-800'}`}>
                    {PRIORITY[n].label}
                  </button>
                ))}
              </div>
            </div>

            <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Why is this a grail? (optional)" rows={2}
              className="w-full bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-sm p-2 focus:outline-none resize-none" />

            <div className="flex gap-3">
              <button onClick={add} className="flex-1 py-2 bg-red-700 hover:bg-red-600 text-white font-terminal text-xl font-bold border-2 border-red-500 transition-colors">
                ADD TO LIST
              </button>
              <button onClick={() => setShowAdd(false)} className="px-6 font-terminal text-xl text-zinc-400 border border-zinc-700 hover:border-zinc-400 transition-colors">
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
