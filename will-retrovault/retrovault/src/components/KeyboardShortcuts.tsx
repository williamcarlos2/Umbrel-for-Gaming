"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const SHORTCUTS: { keys: string; label: string; href?: string; action?: string }[] = [
  { keys: "g v", label: "Go to Vault", href: "/inventory" },
  { keys: "g f", label: "Go to Field Mode", href: "/field" },
  { keys: "g h", label: "Go to Home", href: "/" },
  { keys: "g a", label: "Go to Analytics", href: "/analytics" },
  { keys: "g s", label: "Go to Sales/P&L", href: "/sales" },
  { keys: "g p", label: "Go to Play Log", href: "/playlog" },
  { keys: "g g", label: "Go to Grails", href: "/grails" },
  { keys: "g w", label: "Go to Watchlist", href: "/watchlist" },
  { keys: "g e", label: "Go to Events", href: "/events" },
  { keys: "g c", label: "Go to Convention", href: "/convention" },
  { keys: "g n", label: "Go to Negotiate", href: "/negotiate" },
  { keys: "/",   label: "Global Search", action: "search" },
  { keys: "?",   label: "Show Shortcuts", action: "help" },
];

export function KeyboardShortcuts({ onSearch }: { onSearch?: () => void }) {
  const router = useRouter();
  const [showHelp, setShowHelp] = useState(false);
  const [pending, setPending] = useState<string | null>(null);

  useEffect(() => {
    let pendingKey: string | null = null;
    let pendingTimer: NodeJS.Timeout | null = null;

    const handler = (e: KeyboardEvent) => {
      // Skip if typing in an input/textarea/select
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (["input", "textarea", "select"].includes(tag)) return;

      const key = e.key.toLowerCase();

      // Help shortcut
      if (key === "?" || (e.shiftKey && e.key === "?")) {
        e.preventDefault();
        setShowHelp(h => !h);
        return;
      }

      // Search shortcut
      if (key === "/" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onSearch?.();
        return;
      }

      // Escape
      if (key === "escape") {
        setShowHelp(false);
        return;
      }

      // Two-key sequences (g + key)
      if (pendingKey === "g") {
        if (pendingTimer) clearTimeout(pendingTimer);
        pendingKey = null;
        setPending(null);

        const shortcut = SHORTCUTS.find(s => s.keys === `g ${key}` && s.href);
        if (shortcut?.href) {
          e.preventDefault();
          router.push(shortcut.href);
        }
        return;
      }

      if (key === "g") {
        pendingKey = "g";
        setPending("g");
        pendingTimer = setTimeout(() => {
          pendingKey = null;
          setPending(null);
        }, 1000);
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [router, onSearch]);

  if (!showHelp) {
    return pending ? (
      <div className="fixed bottom-4 right-4 z-50 bg-zinc-900 border border-green-700 px-4 py-2 font-terminal text-sm text-green-400 shadow-lg">
        G + ...
      </div>
    ) : null;
  }

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowHelp(false)}>
      <div className="bg-zinc-950 border-4 border-green-700 p-6 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-green-400 font-terminal text-2xl uppercase">⌨️ Keyboard Shortcuts</h3>
          <button onClick={() => setShowHelp(false)} className="text-zinc-500 hover:text-zinc-300 font-terminal">✕</button>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {SHORTCUTS.map(s => (
            <div key={s.keys} className="flex items-center justify-between border border-zinc-800 px-3 py-2">
              <span className="text-zinc-400 font-terminal text-sm">{s.label}</span>
              <span className="font-mono text-xs bg-zinc-800 text-green-400 px-2 py-0.5 rounded">{s.keys}</span>
            </div>
          ))}
        </div>
        <p className="text-zinc-700 font-terminal text-xs mt-4">Press ? anytime to toggle this panel. Shortcuts disabled when typing in inputs.</p>
      </div>
    </div>
  );
}
