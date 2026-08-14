"use client";

import { useState, useEffect } from "react";

type GameEvent = {
  id: string; title: string; dateRaw: string; date?: string;
  location: string; venue?: string; url?: string; source: string;
  attending: boolean; interested: boolean; notes?: string; description?: string;
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function formatDate(ev: GameEvent): string {
  if (ev.date) {
    const d = new Date(ev.date + 'T12:00:00');
    if (!isNaN(d.getTime())) return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }
  return ev.dateRaw || "Date TBD";
}

function daysUntil(ev: GameEvent): number | null {
  const d = ev.date ? new Date(ev.date + 'T12:00:00') : null;
  if (!d || isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export default function EventsPage() {
  const [events, setEvents] = useState<GameEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'attending' | 'interested' | 'upcoming'>('upcoming');
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [editNotes, setEditNotes] = useState<{ id: string; text: string } | null>(null);
  const [form, setForm] = useState({ title: '', date: '', location: '', venue: '', url: '', description: '', attending: false });

  const load = () => fetch('/api/events').then(r => r.json()).then(d => { setEvents(d); setLoading(false); });
  useEffect(() => { load(); }, []);

  const toggle = async (id: string, field: 'attending' | 'interested') => {
    await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: `toggle_${field}`, id }) });
    load();
  };

  const saveNotes = async () => {
    if (!editNotes) return;
    await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_notes', id: editNotes.id, notes: editNotes.text }) });
    setEditNotes(null); load();
  };

  const addManual = async () => {
    if (!form.title.trim()) return;
    await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'add_manual', ...form }) });
    setShowAdd(false);
    setForm({ title: '', date: '', location: '', venue: '', url: '', description: '', attending: false });
    load();
  };

  const del = async (id: string) => {
    await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', id }) });
    load();
  };

  const filtered = events.filter(e => {
    if (filter === 'attending' && !e.attending) return false;
    if (filter === 'interested' && !e.interested) return false;
    if (filter === 'upcoming') {
      const days = daysUntil(e);
      if (days !== null && days < 0) return false;
    }
    if (search && !e.title.toLowerCase().includes(search.toLowerCase()) &&
        !e.location.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const attendingCount = events.filter(e => e.attending).length;
  const interestedCount = events.filter(e => e.interested).length;
  const upcomingAttending = events.filter(e => e.attending && (daysUntil(e) ?? 999) >= 0)
    .sort((a, b) => (daysUntil(a) ?? 999) - (daysUntil(b) ?? 999));

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      <div className="border-b-4 border-green-900 pb-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">🎪 Gaming Events</h2>
          <p className="text-zinc-500 font-terminal text-sm mt-1">Conventions, expos, and swap meets</p>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 text-black font-terminal text-base font-bold border-2 border-green-400 transition-colors">
            + ADD EVENT
          </button>
          <button onClick={async () => {
            await fetch('/api/events?scrape=1');
            setTimeout(load, 2000);
          }}
            className="px-4 py-2 text-zinc-400 hover:text-zinc-200 font-terminal text-base border border-zinc-700 hover:border-zinc-500 transition-colors">
            🔄 REFRESH
          </button>
        </div>
      </div>

      {/* Next up banner */}
      {upcomingAttending.length > 0 && (
        <div className="bg-yellow-950/20 border-2 border-yellow-700 p-4 mb-6 flex items-center gap-4">
          <span className="text-3xl">🎪</span>
          <div className="flex-1 min-w-0">
            <p className="text-yellow-400 font-terminal text-lg truncate">{upcomingAttending[0].title}</p>
            <p className="text-zinc-500 font-terminal text-sm">{formatDate(upcomingAttending[0])} · {upcomingAttending[0].location}</p>
          </div>
          <div className="shrink-0 text-center">
            <div className="text-yellow-400 font-terminal text-3xl font-bold">{daysUntil(upcomingAttending[0])}</div>
            <div className="text-zinc-600 font-terminal text-xs">days away</div>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex flex-wrap gap-3 mb-6">
        {[
          { id: 'upcoming', label: `📅 Upcoming`, count: events.filter(e => (daysUntil(e) ?? 1) >= 0).length },
          { id: 'attending', label: `✅ Attending`, count: attendingCount },
          { id: 'interested', label: `👀 Interested`, count: interestedCount },
          { id: 'all', label: `📋 All`, count: events.length },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id as 'upcoming' | 'interested' | 'all')}
            className={`px-3 py-1.5 font-terminal text-sm border-2 transition-colors ${filter === f.id ? 'bg-green-700 text-black border-green-500' : 'text-zinc-500 border-zinc-700 hover:border-zinc-500'}`}>
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      <input type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search events or locations..."
        className="w-full bg-zinc-950 border-2 border-zinc-800 text-zinc-300 font-terminal text-base p-2 mb-6 focus:outline-none focus:border-green-600 max-w-md" />

      {/* Events list */}
      {loading ? (
        <div className="text-green-500 font-terminal animate-pulse text-xl text-center py-12">LOADING EVENTS...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-zinc-800">
          <div className="text-5xl mb-4">🎪</div>
          <p className="text-zinc-600 font-terminal text-xl mb-2">No events found.</p>
          <p className="text-zinc-700 font-terminal text-sm">Run the scraper or add events manually.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(ev => {
            const days = daysUntil(ev);
            const isPast = days !== null && days < 0;
            return (
              <div key={ev.id} className={`border-2 p-4 transition-colors ${
                ev.attending ? 'border-yellow-700 bg-yellow-950/10' :
                ev.interested ? 'border-blue-800 bg-blue-950/10' :
                isPast ? 'border-zinc-800 opacity-40' :
                'border-zinc-800 hover:border-zinc-600'
              }`}>
                <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                  {/* Date badge */}
                  <div className="shrink-0 text-center w-16 hidden sm:block">
                    {ev.date ? (() => {
                      const d = new Date(ev.date + 'T12:00:00');
                      return (
                        <div className="border border-zinc-700 p-1">
                          <div className="text-zinc-500 font-terminal text-xs">{MONTHS[d.getMonth()]}</div>
                          <div className="text-zinc-300 font-terminal text-2xl font-bold">{d.getDate()}</div>
                          <div className="text-zinc-600 font-terminal text-xs">{d.getFullYear()}</div>
                        </div>
                      );
                    })() : (
                      <div className="text-zinc-700 font-terminal text-xs border border-zinc-800 p-2">TBD</div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <h3 className={`font-terminal text-lg ${ev.attending ? 'text-yellow-300' : 'text-zinc-200'}`}>{ev.title}</h3>
                        <p className="text-zinc-500 font-terminal text-sm">
                          {formatDate(ev)}
                          {ev.location && <> · {ev.location}</>}
                          {ev.venue && <> · <span className="text-zinc-600">{ev.venue}</span></>}
                        </p>
                      </div>
                      {days !== null && days >= 0 && (
                        <span className={`font-terminal text-xs px-2 py-0.5 border shrink-0 ${
                          days <= 7 ? 'text-red-400 border-red-800' :
                          days <= 30 ? 'text-yellow-500 border-yellow-800' :
                          'text-zinc-500 border-zinc-700'
                        }`}>
                          {days === 0 ? 'TODAY!' : days === 1 ? 'TOMORROW' : `${days}d away`}
                        </span>
                      )}
                    </div>
                    {ev.description && <p className="text-zinc-600 font-terminal text-xs mt-1 line-clamp-2">{ev.description}</p>}
                    {ev.notes && <p className="text-blue-400 font-terminal text-xs mt-1 italic">📝 {ev.notes}</p>}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggle(ev.id, 'attending')}
                      className={`px-3 py-1 font-terminal text-xs border transition-colors ${ev.attending ? 'bg-yellow-700 text-black border-yellow-500' : 'text-zinc-600 border-zinc-700 hover:border-yellow-700 hover:text-yellow-500'}`}>
                      ✅ Going
                    </button>
                    <button onClick={() => toggle(ev.id, 'interested')}
                      className={`px-3 py-1 font-terminal text-xs border transition-colors ${ev.interested ? 'bg-blue-800 text-white border-blue-500' : 'text-zinc-600 border-zinc-700 hover:border-blue-700 hover:text-blue-500'}`}>
                      👀 Maybe
                    </button>
                    <button onClick={() => setEditNotes({ id: ev.id, text: ev.notes || '' })}
                      className="text-zinc-700 hover:text-zinc-400 font-terminal text-sm transition-colors">📝</button>
                    {ev.url && (
                      <a href={ev.url} target="_blank" rel="noopener noreferrer"
                        className="text-zinc-700 hover:text-zinc-400 font-terminal text-sm transition-colors">↗</a>
                    )}
                    <button onClick={() => del(ev.id)} className="text-zinc-800 hover:text-red-600 font-terminal text-sm transition-colors">✕</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Notes modal */}
      {editNotes && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setEditNotes(null)}>
          <div className="bg-zinc-950 border-4 border-blue-700 p-6 w-full max-w-md space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-blue-400 font-terminal text-xl uppercase">📝 Event Notes</h3>
            <textarea value={editNotes.text} onChange={e => setEditNotes({ ...editNotes, text: e.target.value })}
              placeholder="Hotel booked, budget: $200, going with Dave..."
              rows={4} className="w-full bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-sm p-3 focus:outline-none resize-none" autoFocus />
            <div className="flex gap-3">
              <button onClick={saveNotes} className="flex-1 py-2 bg-blue-700 hover:bg-blue-600 text-white font-terminal text-xl font-bold border-2 border-blue-500">SAVE</button>
              <button onClick={() => setEditNotes(null)} className="px-6 font-terminal text-xl text-zinc-400 border border-zinc-700">CANCEL</button>
            </div>
          </div>
        </div>
      )}

      {/* Add event modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-zinc-950 border-4 border-green-700 p-6 w-full max-w-lg space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-green-400 font-terminal text-2xl uppercase">🎪 Add Event</h3>
            <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="Event name..." className="w-full bg-black border-2 border-zinc-700 text-green-300 font-terminal text-xl p-2 focus:outline-none focus:border-green-500" autoFocus />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-zinc-500 font-terminal text-xs uppercase mb-1">Date</label>
                <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  className="w-full bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-base p-2 focus:outline-none" />
              </div>
              <div>
                <label className="block text-zinc-500 font-terminal text-xs uppercase mb-1">City/Location</label>
                <input type="text" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                  placeholder="Portland, OR" className="w-full bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-base p-2 focus:outline-none" />
              </div>
            </div>
            <input type="text" value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))}
              placeholder="Venue name (optional)" className="w-full bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-base p-2 focus:outline-none" />
            <input type="url" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))}
              placeholder="Event URL (optional)" className="w-full bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-base p-2 focus:outline-none" />
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={form.attending} onChange={e => setForm(f => ({ ...f, attending: e.target.checked }))} className="w-4 h-4" />
              <span className="text-yellow-400 font-terminal text-sm">Mark as attending</span>
            </label>
            <div className="flex gap-3">
              <button onClick={addManual} className="flex-1 py-2 bg-green-600 hover:bg-green-500 text-black font-terminal text-xl font-bold border-2 border-green-400">ADD</button>
              <button onClick={() => setShowAdd(false)} className="px-6 font-terminal text-xl text-zinc-400 border border-zinc-700">CANCEL</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
