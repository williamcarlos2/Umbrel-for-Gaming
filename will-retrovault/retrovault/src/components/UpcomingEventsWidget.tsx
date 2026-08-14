"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type GameEvent = {
  id: string; title: string; dateRaw: string; date?: string;
  location: string; attending: boolean; interested: boolean;
};

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function daysUntil(ev: GameEvent): number | null {
  const d = ev.date ? new Date(ev.date + 'T12:00:00') : null;
  if (!d || isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export function UpcomingEventsWidget() {
  const [events, setEvents] = useState<GameEvent[]>([]);

  useEffect(() => {
    fetch('/api/events').then(r => r.json()).then((all: GameEvent[]) => {
      const upcoming = all
        .filter(e => (e.attending || e.interested) && (daysUntil(e) ?? 999) >= 0)
        .sort((a, b) => (daysUntil(a) ?? 999) - (daysUntil(b) ?? 999))
        .slice(0, 3);
      setEvents(upcoming);
    }).catch(() => {});
  }, []);

  if (events.length === 0) return null;

  return (
    <div className="bg-zinc-950 border-2 border-yellow-800 rounded-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span>🎪</span>
          <h3 className="text-yellow-400 font-terminal text-base uppercase">Upcoming Events</h3>
        </div>
        <Link href="/events" className="text-zinc-600 hover:text-zinc-400 font-terminal text-xs transition-colors">
          View all →
        </Link>
      </div>
      <div className="space-y-2">
        {events.map(ev => {
          const days = daysUntil(ev);
          const d = ev.date ? new Date(ev.date + 'T12:00:00') : null;
          return (
            <div key={ev.id} className={`flex items-center gap-3 p-2 border ${ev.attending ? 'border-yellow-800/50' : 'border-zinc-800'}`}>
              {d && (
                <div className="text-center w-10 shrink-0">
                  <div className="text-zinc-600 font-terminal text-xs">{MONTHS[d.getMonth()]}</div>
                  <div className="text-zinc-300 font-terminal text-xl font-bold leading-tight">{d.getDate()}</div>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-zinc-200 font-terminal text-sm truncate">{ev.title}</div>
                {ev.location && <div className="text-zinc-600 font-terminal text-xs">{ev.location}</div>}
              </div>
              {days !== null && (
                <div className={`font-terminal text-xs px-2 py-0.5 border shrink-0 ${
                  ev.attending ? 'text-yellow-400 border-yellow-800' :
                  days <= 14 ? 'text-orange-400 border-orange-900' : 'text-zinc-600 border-zinc-700'
                }`}>
                  {days === 0 ? 'TODAY' : `${days}d`}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
