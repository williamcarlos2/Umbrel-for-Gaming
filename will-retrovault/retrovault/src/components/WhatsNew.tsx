"use client";
import { useState } from "react";
import { CHANGELOG } from "@/data/changelog";
import Link from "next/link";

const SEEN_KEY = "rv-whats-new-seen-version";
const CURRENT_VERSION = CHANGELOG[CHANGELOG.length - 1].version;

export function shouldShowWhatsNew(seenVersion: string | null, currentVersion: string): boolean {
  return seenVersion !== currentVersion;
}

export function WhatsNew() {
  const [show, setShow] = useState(() => (typeof window !== "undefined" ? shouldShowWhatsNew(localStorage.getItem(SEEN_KEY), CURRENT_VERSION) : false));

  const dismiss = () => {
    localStorage.setItem(SEEN_KEY, CURRENT_VERSION);
    setShow(false);
  };

  if (!show) return null;

  const latest = CHANGELOG[CHANGELOG.length - 1];
  const highlights = latest.changes.slice(0, 3).map(section => ({
    category: section.category,
    item: section.items[0],
  }));

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-[150] p-4" onClick={dismiss}>
      <div className="bg-zinc-950 border-4 border-green-700 w-full max-w-md shadow-[0_0_30px_rgba(34,197,94,0.3)]"
        onClick={e => e.stopPropagation()}>
        <div className="border-b-2 border-green-900 p-5">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div>
              <h2 className="text-green-400 font-terminal text-xl uppercase">What&apos;s New in v{CURRENT_VERSION}</h2>
              <p className="text-zinc-600 font-terminal text-xs">{latest.title}</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-3">
          {highlights.map((h, i) => (
            <div key={i} className="flex gap-3 border border-zinc-800 p-3">
              <span className="text-green-600 font-terminal text-sm shrink-0 mt-0.5">▶</span>
              <div>
                <div className="text-zinc-500 font-terminal text-xs uppercase">{h.category}</div>
                <div className="text-zinc-300 font-terminal text-sm">{h.item}</div>
              </div>
            </div>
          ))}

          <Link href="/changelog" onClick={dismiss}
            className="block text-center text-zinc-600 hover:text-zinc-400 font-terminal text-xs transition-colors mt-2">
            View full changelog →
          </Link>
        </div>

        <div className="border-t border-zinc-900 p-4 flex justify-end">
          <button onClick={dismiss}
            className="px-6 py-2 bg-green-700 hover:bg-green-600 text-black font-terminal text-base font-bold border-2 border-green-500 transition-colors">
            GOT IT ✓
          </button>
        </div>
      </div>
    </div>
  );
}
