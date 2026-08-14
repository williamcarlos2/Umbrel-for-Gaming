"use client";

import { useState } from "react";
import { CHANGELOG, type ChangelogEntry } from "@/data/changelog";

const TYPE_STYLES: Record<string, { color: string; bg: string; border: string; label: string }> = {
  feature:     { color: "text-green-400",  bg: "bg-green-950/20",  border: "border-green-700",  label: "NEW" },
  improvement: { color: "text-blue-400",   bg: "bg-blue-950/20",   border: "border-blue-700",   label: "IMPROVED" },
  fix:         { color: "text-yellow-400", bg: "bg-yellow-950/10", border: "border-yellow-700", label: "FIX" },
  breaking:    { color: "text-red-400",    bg: "bg-red-950/20",    border: "border-red-700",    label: "BREAKING" },
};

const CATEGORY_ICONS: Record<string, string> = {
  "Foundation": "🏗️", "Game Inventory": "🕹️", "Price Data": "📊", "P&L System": "💰",
  "Analytics": "📈", "Market Tools": "🎯", "Players System": "🎮", "Collection Showcase": "🎮",
  "UX": "✨", "App Configuration": "⚙️", "Standalone Mode": "🔌", "Authentication": "🔒",
  "Themes": "🎨", "Tags & Mentions": "🏷️", "Search": "🔍", "Feature Groups": "🔧",
  "Navigation Overhaul": "🗺️", "Field Tools": "🔦", "Business Intelligence": "💹",
  "Collection Tools": "📦", "Personal": "🎮", "Discovery": "🌐", "Scraper System": "⚙️",
  "Achievement Codex": "🏆", "Dashboard Overhaul": "⚡", "PWA": "📱",
  "Price Alert Engine": "🚨", "Global Search": "🔍", "Keyboard Shortcuts": "⌨️",
  "Value History": "📈", "Sharing": "🔗", "Changelog": "📋",
};

function VersionCard({ entry, expanded, onToggle }: { entry: ChangelogEntry; expanded: boolean; onToggle: () => void }) {
  const typeStyle = TYPE_STYLES[entry.type];
  const totalChanges = entry.changes.reduce((s, c) => s + c.items.length, 0);

  return (
    <div className={`border-2 ${typeStyle.border} transition-all`}>
      <button onClick={onToggle} className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <div className={`font-mono text-sm px-3 py-1 border-2 shrink-0 ${typeStyle.color} ${typeStyle.border} ${typeStyle.bg}`}>
            v{entry.version}
          </div>
          <div className="min-w-0">
            <div className="text-zinc-200 font-terminal text-lg truncate">{entry.title}</div>
            <div className="text-zinc-600 font-terminal text-xs flex gap-3 mt-0.5">
              <span>{entry.date}</span>
              <span>·</span>
              <span>{totalChanges} changes</span>
              <span>·</span>
              <span className={`${typeStyle.color} uppercase text-xs`}>{typeStyle.label}</span>
            </div>
          </div>
        </div>
        <span className={`font-terminal text-xl shrink-0 ${typeStyle.color}`}>{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-zinc-800 p-5 space-y-5">
          {entry.changes.map(section => (
            <div key={section.category}>
              <h3 className="text-zinc-400 font-terminal text-sm uppercase flex items-center gap-2 mb-3">
                <span>{CATEGORY_ICONS[section.category] || "•"}</span>
                <span>{section.category}</span>
              </h3>
              <ul className="space-y-1.5 ml-6">
                {section.items.map((item, i) => (
                  <li key={i} className="flex items-start gap-2 text-zinc-400 font-terminal text-sm">
                    <span className={`${typeStyle.color} shrink-0 mt-0.5`}>▶</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ChangelogPage() {
  const [search, setSearch] = useState("");
  const [expandedVersion, setExpandedVersion] = useState<string | null>(CHANGELOG[CHANGELOG.length - 1].version);

  const sorted = [...CHANGELOG].reverse(); // latest first

  const filtered = search.trim()
    ? sorted.filter(e =>
        e.title.toLowerCase().includes(search.toLowerCase()) ||
        e.version.includes(search) ||
        e.changes.some(c =>
          c.category.toLowerCase().includes(search.toLowerCase()) ||
          c.items.some(i => i.toLowerCase().includes(search.toLowerCase()))
        )
      )
    : sorted;

  const totalVersions = CHANGELOG.length;
  const totalChanges = CHANGELOG.reduce((s, e) => s + e.changes.reduce((cs, c) => cs + c.items.length, 0), 0);
  const latestVersion = CHANGELOG[CHANGELOG.length - 1];

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      {/* Header */}
      <div className="border-b-4 border-green-900 pb-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">📋 Changelog</h2>
          <p className="text-zinc-500 font-terminal text-sm mt-1">
            {totalVersions} releases · {totalChanges} changes · current v{latestVersion.version}
          </p>
        </div>
        <div className={`px-4 py-2 border-2 font-terminal text-sm ${TYPE_STYLES[latestVersion.type].border} ${TYPE_STYLES[latestVersion.type].color} ${TYPE_STYLES[latestVersion.type].bg}`}>
          Latest: v{latestVersion.version} — {latestVersion.date}
        </div>
      </div>

      {/* Search */}
      <input type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search changelog..."
        className="w-full bg-zinc-950 border-2 border-zinc-800 text-zinc-300 font-terminal text-base p-3 mb-6 focus:outline-none focus:border-green-600 max-w-md" />

      {/* Version cards */}
      <div className="space-y-3">
        {filtered.map(entry => (
          <VersionCard
            key={entry.version}
            entry={entry}
            expanded={expandedVersion === entry.version}
            onToggle={() => setExpandedVersion(expandedVersion === entry.version ? null : entry.version)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center py-12 text-zinc-700 font-terminal text-xl">No results for &quot;{search}&quot;</div>
        )}
      </div>
    </div>
  );
}
