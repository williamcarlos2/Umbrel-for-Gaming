"use client";

import { useState, useEffect } from "react";

type Seller = {
  username: string; displayName: string; specialty: string;
  twitterUrl?: string; instagramUrl?: string; notes?: string;
  notifyBefore?: number; addedAt: string;
};

type Stream = {
  id: string; seller: string; title: string;
  startTime?: string; scheduledText?: string;
  url: string; source: string; dismissed?: boolean; attending?: boolean;
};

type WhatnotData = {
  sellers: Seller[]; streams: Stream[];
  lastChecked: string | null;
  sellerStatuses?: Record<string, { status: string; needsManualCheck: boolean; lastChecked: string }>;
};

const SPECIALTIES = [
  "NES/SNES", "Sega Genesis", "N64", "PS1/PS2", "Dreamcast",
  "Handhelds", "Gamecube", "Mixed Retro", "Graded Games", "Sealed Games", "Lots/Collections"
];

function daysUntil(iso: string): number {
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86400000);
}

function fmtStreamTime(stream: Stream): string {
  if (stream.startTime) {
    const d = new Date(stream.startTime);
    const days = daysUntil(stream.startTime);
    if (days === 0) return `Today at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (days === 1) return `Tomorrow at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' }) +
      ` at ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  return stream.scheduledText || 'Time TBD';
}

export default function WhatnotPage() {
  const [data, setData] = useState<WhatnotData>({ sellers: [], streams: [], lastChecked: null });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'schedule' | 'sellers'>('schedule');
  const [showAddSeller, setShowAddSeller] = useState(false);
  const [showAddStream, setShowAddStream] = useState(false);
  const [sellerForm, setSellerForm] = useState({ username: '', displayName: '', specialty: '', twitterUrl: '', instagramUrl: '', notes: '', notifyBefore: 30 });
  const [streamForm, setStreamForm] = useState({ seller: '', title: '', startTime: '', scheduledText: '', url: '' });

  const load = () => fetch('/api/whatnot').then(r => r.json()).then(d => { setData(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const addSeller = async () => {
    if (!sellerForm.username.trim()) return;
    await fetch('/api/whatnot', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_seller', ...sellerForm }) });
    setShowAddSeller(false);
    setSellerForm({ username: '', displayName: '', specialty: '', twitterUrl: '', instagramUrl: '', notes: '', notifyBefore: 30 });
    load();
  };

  const removeSeller = async (username: string) => {
    await fetch('/api/whatnot', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'remove_seller', username }) });
    load();
  };

  const addStream = async () => {
    if (!streamForm.seller.trim()) return;
    await fetch('/api/whatnot', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_stream', ...streamForm }) });
    setShowAddStream(false);
    setStreamForm({ seller: '', title: '', startTime: '', scheduledText: '', url: '' });
    load();
  };

  const dismissStream = async (id: string) => {
    await fetch('/api/whatnot', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'dismiss_stream', id }) });
    load();
  };

  const toggleAttending = async (id: string) => {
    await fetch('/api/whatnot', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'attending', id }) });
    load();
  };

  const upcomingStreams = data.streams
    .filter(s => !s.dismissed)
    .sort((a, b) => {
      const da = a.startTime ? new Date(a.startTime).getTime() : Infinity;
      const db = b.startTime ? new Date(b.startTime).getTime() : Infinity;
      return da - db;
    });

  const attendingStreams = upcomingStreams.filter(s => s.attending);
  const nextStream = attendingStreams[0] || upcomingStreams[0];

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      <div className="border-b-4 border-green-900 pb-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">📺 Whatnot Tracker</h2>
          <p className="text-zinc-500 font-terminal text-sm mt-1">
            Follow your favorite sellers · Never miss a live auction
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAddSeller(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-black font-terminal text-sm font-bold border-2 border-green-400 transition-colors">
            + FOLLOW SELLER
          </button>
          <button onClick={() => setShowAddStream(true)}
            className="px-4 py-2 text-blue-400 font-terminal text-sm border border-blue-800 hover:bg-blue-900/20 transition-colors">
            + ADD STREAM
          </button>
        </div>
      </div>

      {/* Next up banner */}
      {nextStream && (
        <div className="bg-orange-950/20 border-2 border-orange-700 p-4 mb-6 flex items-center gap-4">
          <span className="text-3xl">📺</span>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-orange-400 font-terminal text-sm uppercase">
                {nextStream.attending ? "✅ You're watching" : "⏭ Up next"}
              </span>
              <span className="text-zinc-600 font-terminal text-xs">{nextStream.source === 'manual' ? 'manually added' : 'auto-detected'}</span>
            </div>
            <p className="text-zinc-200 font-terminal text-lg truncate">{nextStream.title}</p>
            <p className="text-zinc-500 font-terminal text-sm">{fmtStreamTime(nextStream)}</p>
          </div>
          <a href={nextStream.url} target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 bg-orange-700 hover:bg-orange-600 text-white font-terminal text-sm font-bold border border-orange-500 shrink-0 transition-colors">
            OPEN ↗
          </a>
        </div>
      )}

      {/* Cloudflare notice */}
      <div className="bg-zinc-900 border border-zinc-700 px-4 py-3 mb-6 flex items-start gap-3 text-zinc-500 font-terminal text-xs">
        <span className="text-yellow-600 shrink-0 mt-0.5">⚠️</span>
        <div>
          <span className="text-zinc-400">Whatnot uses Cloudflare protection</span> — automatic scraping is blocked.
          Add streams manually when sellers announce them on social media, or check their Whatnot profile directly.
          Seller profile links are provided below for quick access.
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: 'schedule', label: `📅 Stream Schedule (${upcomingStreams.length})` },
          { id: 'sellers', label: `👤 Sellers (${data.sellers.length})` },
        ].map(t => (
          <button key={t.id} onClick={() => setTab(t.id as 'schedule' | 'sellers')}
            className={`px-4 py-2 font-terminal text-sm border-2 transition-colors ${tab === t.id ? "bg-green-700 text-black border-green-500" : "text-zinc-500 border-zinc-700 hover:border-zinc-500"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-green-500 font-terminal animate-pulse text-xl text-center py-12">LOADING...</div>
      ) : (
        <>
          {/* Schedule tab */}
          {tab === 'schedule' && (
            <div className="space-y-3">
              {upcomingStreams.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-zinc-800">
                  <div className="text-5xl mb-4">📺</div>
                  <p className="text-zinc-500 font-terminal text-xl mb-2">No streams scheduled.</p>
                  <p className="text-zinc-700 font-terminal text-sm mb-4">
                    Add streams manually when your favorite sellers announce them.
                  </p>
                  <button onClick={() => setShowAddStream(true)}
                    className="px-6 py-2 font-terminal text-sm text-blue-400 border border-blue-800 hover:bg-blue-900/20 transition-colors">
                    + ADD STREAM
                  </button>
                </div>
              ) : (
                upcomingStreams.map(stream => {
                  const seller = data.sellers.find(s => s.username === stream.seller);
                  const days = stream.startTime ? daysUntil(stream.startTime) : null;
                  return (
                    <div key={stream.id} className={`border-2 p-4 transition-colors ${
                      stream.attending ? "border-orange-700 bg-orange-950/10" :
                      days !== null && days <= 1 ? "border-yellow-800" :
                      "border-zinc-800 hover:border-zinc-600"
                    }`}>
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-orange-400 font-terminal text-base">{stream.seller}</span>
                            {seller?.specialty && <span className="text-zinc-600 font-terminal text-xs px-1.5 border border-zinc-800">{seller.specialty}</span>}
                            {stream.source === 'manual' && <span className="text-zinc-700 font-terminal text-xs">manual</span>}
                            {days !== null && days === 0 && <span className="text-red-400 font-terminal text-xs border border-red-800 px-1.5 animate-pulse">LIVE TODAY</span>}
                            {days !== null && days === 1 && <span className="text-yellow-400 font-terminal text-xs">TOMORROW</span>}
                          </div>
                          <p className="text-zinc-200 font-terminal text-base truncate">{stream.title}</p>
                          <p className="text-zinc-500 font-terminal text-sm">{fmtStreamTime(stream)}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                          <button onClick={() => toggleAttending(stream.id)}
                            className={`px-3 py-1 font-terminal text-xs border transition-colors ${stream.attending ? "bg-orange-700 text-white border-orange-500" : "text-zinc-600 border-zinc-700 hover:border-orange-700 hover:text-orange-400"}`}>
                            {stream.attending ? "✅ Watching" : "Watch"}
                          </button>
                          <a href={stream.url} target="_blank" rel="noopener noreferrer"
                            className="px-3 py-1 font-terminal text-xs text-blue-400 border border-blue-800 hover:bg-blue-900/20 transition-colors">
                            OPEN ↗
                          </a>
                          <button onClick={() => dismissStream(stream.id)}
                            className="text-zinc-700 hover:text-red-400 font-terminal text-xs px-2 transition-colors">✕</button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* Sellers tab */}
          {tab === 'sellers' && (
            <div className="space-y-3">
              {data.sellers.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-zinc-800">
                  <div className="text-5xl mb-4">👤</div>
                  <p className="text-zinc-500 font-terminal text-xl mb-2">No sellers followed yet.</p>
                  <button onClick={() => setShowAddSeller(true)}
                    className="px-6 py-2 font-terminal text-sm text-green-400 border border-green-700 hover:bg-green-900/20 transition-colors">
                    + FOLLOW YOUR FIRST SELLER
                  </button>
                </div>
              ) : (
                data.sellers.map(seller => {
                  const status = data.sellerStatuses?.[seller.username];
                  const sellerStreams = upcomingStreams.filter(s => s.seller === seller.username);
                  return (
                    <div key={seller.username} className="border-2 border-zinc-800 p-4 hover:border-zinc-600 transition-colors">
                      <div className="flex items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 flex-wrap mb-1">
                            <span className="text-orange-400 font-terminal text-lg">{seller.displayName || seller.username}</span>
                            <span className="text-zinc-600 font-terminal text-xs">@{seller.username}</span>
                            {seller.specialty && <span className="text-zinc-500 font-terminal text-xs px-1.5 border border-zinc-800">{seller.specialty}</span>}
                            {status && (
                              <span className={`font-terminal text-xs ${status.needsManualCheck ? 'text-yellow-600' : 'text-green-600'}`}>
                                {status.needsManualCheck ? '⚠️ needs manual check' : '✓ auto-tracked'}
                              </span>
                            )}
                          </div>
                          {seller.notes && <p className="text-zinc-600 font-terminal text-xs mb-2">{seller.notes}</p>}
                          <div className="flex gap-4 flex-wrap">
                            <a href={`https://www.whatnot.com/user/${seller.username}`} target="_blank" rel="noopener noreferrer"
                              className="text-orange-600 hover:text-orange-400 font-terminal text-xs transition-colors">
                              📺 Whatnot ↗
                            </a>
                            {seller.twitterUrl && (
                              <a href={seller.twitterUrl} target="_blank" rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-400 font-terminal text-xs transition-colors">
                                🐦 Twitter ↗
                              </a>
                            )}
                            {seller.instagramUrl && (
                              <a href={seller.instagramUrl} target="_blank" rel="noopener noreferrer"
                                className="text-pink-700 hover:text-pink-500 font-terminal text-xs transition-colors">
                                📸 Instagram ↗
                              </a>
                            )}
                          </div>
                          {sellerStreams.length > 0 && (
                            <p className="text-zinc-600 font-terminal text-xs mt-2">
                              {sellerStreams.length} upcoming stream{sellerStreams.length !== 1 ? 's' : ''} scheduled
                            </p>
                          )}
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => { setStreamForm(f => ({ ...f, seller: seller.username, url: `https://www.whatnot.com/user/${seller.username}` })); setShowAddStream(true); }}
                            className="px-3 py-1 font-terminal text-xs text-blue-400 border border-blue-800 hover:bg-blue-900/20 transition-colors">
                            + Stream
                          </button>
                          <button onClick={() => removeSeller(seller.username)}
                            className="text-zinc-700 hover:text-red-400 font-terminal text-xs px-2 transition-colors">✕</button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </>
      )}

      {/* Add Seller Modal */}
      {showAddSeller && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowAddSeller(false)}>
          <div className="bg-zinc-950 border-4 border-orange-700 p-6 w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-orange-400 font-terminal text-2xl uppercase">📺 Follow a Seller</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-500 font-terminal text-xs uppercase mb-1">Whatnot Username *</label>
                <input type="text" value={sellerForm.username} onChange={e => setSellerForm(f => ({ ...f, username: e.target.value }))}
                  placeholder="username" className="w-full bg-black border-2 border-zinc-700 text-orange-300 font-terminal text-xl p-2 focus:outline-none focus:border-orange-600" autoFocus />
              </div>
              <div>
                <label className="block text-zinc-500 font-terminal text-xs uppercase mb-1">Display Name</label>
                <input type="text" value={sellerForm.displayName} onChange={e => setSellerForm(f => ({ ...f, displayName: e.target.value }))}
                  placeholder="Friendly name" className="w-full bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-xl p-2 focus:outline-none" />
              </div>
            </div>

            <div>
              <label className="block text-zinc-500 font-terminal text-xs uppercase mb-1">Specialty</label>
              <div className="flex flex-wrap gap-1">
                {SPECIALTIES.map(s => (
                  <button key={s} onClick={() => setSellerForm(f => ({ ...f, specialty: s }))}
                    className={`px-2 py-1 font-terminal text-xs border transition-colors ${sellerForm.specialty === s ? "bg-orange-700 text-white border-orange-500" : "text-zinc-600 border-zinc-700 hover:border-zinc-500"}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-500 font-terminal text-xs uppercase mb-1">Twitter/X URL</label>
                <input type="url" value={sellerForm.twitterUrl} onChange={e => setSellerForm(f => ({ ...f, twitterUrl: e.target.value }))}
                  placeholder="https://twitter.com/..." className="w-full bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-sm p-2 focus:outline-none" />
              </div>
              <div>
                <label className="block text-zinc-500 font-terminal text-xs uppercase mb-1">Instagram URL</label>
                <input type="url" value={sellerForm.instagramUrl} onChange={e => setSellerForm(f => ({ ...f, instagramUrl: e.target.value }))}
                  placeholder="https://instagram.com/..." className="w-full bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-sm p-2 focus:outline-none" />
              </div>
            </div>

            <textarea value={sellerForm.notes} onChange={e => setSellerForm(f => ({ ...f, notes: e.target.value }))}
              placeholder="Notes (what they sell, pricing style, etc.)" rows={2}
              className="w-full bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-sm p-2 focus:outline-none resize-none" />

            <div className="flex gap-3">
              <button onClick={addSeller} className="flex-1 py-2 bg-orange-700 hover:bg-orange-600 text-white font-terminal text-xl font-bold border-2 border-orange-500">FOLLOW</button>
              <button onClick={() => setShowAddSeller(false)} className="px-6 font-terminal text-xl text-zinc-400 border border-zinc-700">CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Stream Modal */}
      {showAddStream && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowAddStream(false)}>
          <div className="bg-zinc-950 border-4 border-blue-700 p-6 w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-blue-400 font-terminal text-2xl uppercase">📅 Add Stream</h3>

            <div>
              <label className="block text-zinc-500 font-terminal text-xs uppercase mb-1">Seller *</label>
              <select value={streamForm.seller} onChange={e => setStreamForm(f => ({ ...f, seller: e.target.value, url: `https://www.whatnot.com/user/${e.target.value}` }))}
                className="w-full bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-base p-2 focus:outline-none cursor-pointer">
                <option value="">Select seller...</option>
                {data.sellers.map(s => <option key={s.username} value={s.username}>{s.displayName || s.username}</option>)}
              </select>
            </div>

            <input type="text" value={streamForm.title} onChange={e => setStreamForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Stream title / description (optional)" className="w-full bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-base p-2 focus:outline-none" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-500 font-terminal text-xs uppercase mb-1">Date & Time</label>
                <input type="datetime-local" value={streamForm.startTime} onChange={e => setStreamForm(f => ({ ...f, startTime: e.target.value }))}
                  className="w-full bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-sm p-2 focus:outline-none" />
              </div>
              <div>
                <label className="block text-zinc-500 font-terminal text-xs uppercase mb-1">Or describe time</label>
                <input type="text" value={streamForm.scheduledText} onChange={e => setStreamForm(f => ({ ...f, scheduledText: e.target.value }))}
                  placeholder="e.g. Saturday at 8pm EST" className="w-full bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-sm p-2 focus:outline-none" />
              </div>
            </div>

            <input type="url" value={streamForm.url} onChange={e => setStreamForm(f => ({ ...f, url: e.target.value }))}
              placeholder="Stream URL (auto-filled from seller)" className="w-full bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-sm p-2 focus:outline-none" />

            <div className="flex gap-3">
              <button onClick={addStream} disabled={!streamForm.seller} className="flex-1 py-2 bg-blue-700 hover:bg-blue-600 text-white font-terminal text-xl font-bold border-2 border-blue-500 disabled:opacity-40">ADD</button>
              <button onClick={() => setShowAddStream(false)} className="px-6 font-terminal text-xl text-zinc-400 border border-zinc-700">CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
