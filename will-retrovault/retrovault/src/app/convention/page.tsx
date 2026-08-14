"use client";

import { useState, useEffect } from "react";
import {
  loadConventionSessions,
  mutateConventionSessions,
  type ConventionSession as Session,
  type ConventionPurchase as Purchase,
} from "@/lib/conventionSession";


const CONDITIONS = ["Loose", "CIB", "New/Sealed", "Damaged"];
const PLATFORMS = ["NES","SNES","N64","Gamecube","Switch","Sega Genesis","Sega CD","Dreamcast","PS1","PS2","PS3","PSP","Xbox","Xbox 360","Other"];


export default function ConventionPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newBudget, setNewBudget] = useState("");

  // Purchase form
  const [pForm, setPForm] = useState({ title: "", platform: "", price: "", condition: "Loose", notes: "", at: "" });
  const [showPurchase, setShowPurchase] = useState(false);

  useEffect(() => {
    const sync = () => {
      const s = loadConventionSessions();
      setSessions(s);
      setActiveId((current) => current && s.some((session) => session.id === current) ? current : (s.find((session) => session.isActive)?.id || s[s.length - 1]?.id || null));
    };
    sync();
    window.addEventListener('storage', sync);
    window.addEventListener('retrovault:convention-sessions-updated', sync as EventListener);
    return () => {
      window.removeEventListener('storage', sync);
      window.removeEventListener('retrovault:convention-sessions-updated', sync as EventListener);
    };
  }, []);

  const active = sessions.find(s => s.id === activeId) || null;
  const spent = active ? active.purchases.reduce((sum, p) => sum + p.price, 0) : 0;
  const remaining = active ? active.budget - spent : 0;
  const pct = active && active.budget > 0 ? Math.min((spent / active.budget) * 100, 100) : 0;

  const createSession = () => {
    if (!newName.trim()) return;
    const session: Session = {
      id: Date.now().toString(), name: newName, budget: parseFloat(newBudget) || 0,
      purchases: [], createdAt: new Date().toISOString(), isActive: true, endedAt: null,
    };
    const updated = mutateConventionSessions((current) => [...current.map((existing) => ({ ...existing, isActive: false })), session]);
    setSessions(updated);
    setActiveId(session.id); setShowNew(false); setNewName(""); setNewBudget("");
  };

  const addPurchase = () => {
    if (!pForm.title.trim() || !pForm.price || !active) return;
    const purchase: Purchase = {
      id: Date.now().toString(), title: pForm.title, platform: pForm.platform,
      price: parseFloat(pForm.price), condition: pForm.condition,
      notes: pForm.notes, at: pForm.at, timestamp: new Date().toISOString(),
    };
    const updated = mutateConventionSessions((current) => current.map(s =>
      s.id === active.id ? { ...s, purchases: [...s.purchases, purchase] } : s
    ));
    setSessions(updated);
    setShowPurchase(false); setPForm({ title: "", platform: "", price: "", condition: "Loose", notes: "", at: "" });
  };

  const removePurchase = (purchaseId: string) => {
    if (!active) return;
    const updated = mutateConventionSessions((current) => current.map(s =>
      s.id === active.id ? { ...s, purchases: s.purchases.filter(p => p.id !== purchaseId) } : s
    ));
    setSessions(updated);
  };

  const deleteSession = (id: string) => {
    const updated = mutateConventionSessions((current) => current.filter(s => s.id !== id));
    setSessions(updated);
    setActiveId(updated.length > 0 ? updated[updated.length - 1].id : null);
  };

  const pctColor = pct >= 90 ? "bg-red-500" : pct >= 70 ? "bg-yellow-500" : "bg-green-500";

  const setSessionActiveState = (id: string, isActive: boolean) => {
    const updated = mutateConventionSessions((current) => current.map((session) => {
      if (session.id === id) {
        return {
          ...session,
          isActive,
          endedAt: isActive ? null : (session.endedAt || new Date().toISOString()),
        };
      }
      return isActive ? { ...session, isActive: false } : session;
    }));
    setSessions(updated);
  };

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      <div className="border-b-4 border-green-900 pb-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">🎪 Convention Tracker</h2>
          <p className="text-zinc-500 font-terminal text-sm mt-1">Track your convention budget and purchases in real-time</p>
        </div>
        <button onClick={() => setShowNew(true)}
          className="px-5 py-2 bg-green-600 hover:bg-green-500 text-black font-terminal text-xl font-bold border-2 border-green-400 transition-colors">
          + NEW SESSION
        </button>
      </div>

      {sessions.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">🎪</div>
          <p className="text-zinc-500 font-terminal text-xl mb-4">No convention sessions yet.</p>
          <button onClick={() => setShowNew(true)}
            className="px-6 py-3 bg-green-700 hover:bg-green-600 text-black font-terminal text-xl font-bold border-2 border-green-500">
            START YOUR FIRST SESSION
          </button>
        </div>
      ) : (
        <>
          {/* Session tabs */}
          <div className="flex gap-2 mb-6 flex-wrap">
            {sessions.map(s => (
              <button key={s.id} onClick={() => setActiveId(s.id)}
                className={`px-4 py-2 font-terminal text-sm border-2 transition-colors ${activeId === s.id ? 'bg-green-700 text-black border-green-500' : 'text-zinc-400 border-zinc-700 hover:border-zinc-500'}`}>
                {s.name}
              </button>
            ))}
          </div>

          {active && (
            <>
              {/* Budget meter */}
              <div className="bg-zinc-950 border-2 border-green-900 p-5 mb-6 rounded-sm">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="text-zinc-500 font-terminal text-xs uppercase">Session status</div>
                    <div className={`font-terminal text-lg ${active.isActive ? 'text-emerald-400' : 'text-zinc-400'}`}>
                      {active.isActive ? '🟢 Active' : '⚪ Ended'}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {active.isActive ? (
                      <button onClick={() => setSessionActiveState(active.id, false)} className="px-3 py-1.5 font-terminal text-sm border border-red-700 text-red-300 hover:border-red-500">
                        End Session
                      </button>
                    ) : (
                      <button onClick={() => setSessionActiveState(active.id, true)} className="px-3 py-1.5 font-terminal text-sm border border-emerald-700 text-emerald-300 hover:border-emerald-500">
                        Mark Active
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex justify-between items-baseline mb-3">
                  <span className="text-zinc-400 font-terminal text-sm uppercase">Budget</span>
                  <div className="flex gap-6">
                    <div className="text-center">
                      <div className="text-zinc-400 font-terminal text-xs">Spent</div>
                      <div className="text-red-400 font-terminal text-2xl font-bold">${spent.toFixed(2)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-zinc-400 font-terminal text-xs">Remaining</div>
                      <div className={`font-terminal text-2xl font-bold ${remaining >= 0 ? 'text-emerald-400' : 'text-red-500'}`}>${Math.abs(remaining).toFixed(2)}{remaining < 0 ? ' OVER' : ''}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-zinc-400 font-terminal text-xs">Total</div>
                      <div className="text-blue-400 font-terminal text-2xl font-bold">${active.budget.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
                <div className="w-full bg-zinc-800 h-4 rounded-full overflow-hidden">
                  <div className={`h-full ${pctColor} transition-all duration-500 rounded-full`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-zinc-700 font-terminal text-xs">$0</span>
                  <span className="text-zinc-700 font-terminal text-xs">{pct.toFixed(0)}% used</span>
                  <span className="text-zinc-700 font-terminal text-xs">${active.budget.toFixed(2)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 mb-6">
                <button onClick={() => setShowPurchase(true)} disabled={!active.isActive}
                  className="px-5 py-2 bg-blue-700 hover:bg-blue-600 text-white font-terminal text-xl font-bold border-2 border-blue-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  + LOG PURCHASE
                </button>
                <button onClick={() => deleteSession(active.id)}
                  className="px-4 py-2 font-terminal text-sm text-red-600 border border-red-900 hover:border-red-700 transition-colors">
                  DELETE SESSION
                </button>
              </div>

              {/* Purchases list */}
              <div>
                <h3 className="text-zinc-400 font-terminal text-lg uppercase mb-3">Purchases ({active.purchases.length})</h3>
                {active.purchases.length === 0 ? (
                  <div className="text-zinc-700 font-terminal text-lg text-center py-8 border-2 border-dashed border-zinc-800">
                    Nothing logged yet. Start hunting!
                  </div>
                ) : (
                  <div className="space-y-2">
                    {[...active.purchases].reverse().map(p => (
                      <div key={p.id} className="bg-zinc-950 border border-zinc-800 p-4 flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap">
                            <span className="text-green-300 font-terminal text-base">{p.title}</span>
                            {p.platform && <span className="text-zinc-600 font-terminal text-xs">{p.platform}</span>}
                            <span className="text-zinc-600 font-terminal text-xs">[{p.condition}]</span>
                            {p.at && <span className="text-purple-500 font-terminal text-xs">@ {p.at}</span>}
                          </div>
                          {p.notes && <p className="text-zinc-700 font-terminal text-xs mt-1">{p.notes}</p>}
                        </div>
                        <div className="shrink-0 flex items-center gap-3">
                          <span className="text-yellow-400 font-terminal text-2xl font-bold">${p.price.toFixed(2)}</span>
                          <button onClick={() => removePurchase(p.id)} className="text-zinc-700 hover:text-red-400 transition-colors">✕</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}

      {/* New Session Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowNew(false)}>
          <div className="bg-zinc-950 border-4 border-green-700 p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-green-400 font-terminal text-2xl uppercase">🎪 New Session</h3>
            <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="Event name (e.g. Game Con 2026)..."
              className="w-full bg-black border-2 border-zinc-700 text-green-300 font-terminal text-xl p-3 focus:outline-none focus:border-green-500" autoFocus />
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-600 font-terminal text-xl">$</span>
              <input type="number" min="0" step="10" value={newBudget} onChange={e => setNewBudget(e.target.value)}
                placeholder="Budget (optional)"
                className="w-full bg-black border-2 border-yellow-900 text-yellow-300 font-terminal text-2xl pl-8 p-3 focus:outline-none focus:border-yellow-500" />
            </div>
            <div className="flex gap-3">
              <button onClick={createSession} className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-black font-terminal text-xl font-bold border-2 border-green-400">START</button>
              <button onClick={() => setShowNew(false)} className="px-6 font-terminal text-xl text-zinc-400 border border-zinc-700">CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Purchase Modal */}
      {showPurchase && active && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowPurchase(false)}>
          <div className="bg-zinc-950 border-4 border-blue-700 p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-blue-400 font-terminal text-2xl uppercase">+ Log Purchase</h3>
            <input type="text" value={pForm.title} onChange={e => setPForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Game title..." className="w-full bg-black border-2 border-zinc-700 text-green-300 font-terminal text-xl p-2 focus:outline-none focus:border-green-500" autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <select value={pForm.platform} onChange={e => setPForm(f => ({ ...f, platform: e.target.value }))}
                className="bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-sm p-2 focus:outline-none cursor-pointer">
                <option value="">Platform...</option>
                {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={pForm.condition} onChange={e => setPForm(f => ({ ...f, condition: e.target.value }))}
                className="bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-sm p-2 focus:outline-none cursor-pointer">
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-600 font-terminal text-xl">$</span>
              <input type="number" min="0" step="0.50" value={pForm.price} onChange={e => setPForm(f => ({ ...f, price: e.target.value }))}
                placeholder="Price paid"
                className="w-full bg-black border-2 border-yellow-900 text-yellow-300 font-terminal text-2xl pl-8 p-3 focus:outline-none focus:border-yellow-500" />
            </div>
            <input type="text" value={pForm.at} onChange={e => setPForm(f => ({ ...f, at: e.target.value }))}
              placeholder="Where / which dealer (optional)"
              className="w-full bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-sm p-2 focus:outline-none" />
            <input type="text" value={pForm.notes} onChange={e => setPForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notes (optional)"
              className="w-full bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-sm p-2 focus:outline-none" />
            <div className="flex gap-3">
              <button onClick={addPurchase} className="flex-1 py-2 bg-blue-700 hover:bg-blue-600 text-white font-terminal text-xl font-bold border-2 border-blue-500">LOG IT</button>
              <button onClick={() => setShowPurchase(false)} className="px-6 font-terminal text-xl text-zinc-400 border border-zinc-700">CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
