"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { unlockAchievement } from "@/lib/achievementUnlocks";
import { GUIDE_SECTIONS, type GuideSection } from "@/data/guide";

function SectionCard({ section }: { section: GuideSection }) {
  const [expanded, setExpanded] = useState(false);
  const [openTipId, setOpenTipId] = useState<string | null>(null);

  const colorClass = section.color.split(' ')[0]; // just the text color
  const borderClass = section.color.split(' ')[1]; // just the border color

  return (
    <div className={`border-2 ${borderClass} transition-all`}>
      {/* Section header */}
      <button onClick={() => setExpanded(!expanded)}
        className="w-full p-5 text-left flex items-center justify-between gap-4 hover:bg-white/5 transition-colors">
        <div className="flex items-center gap-4">
          <span className="text-4xl">{section.icon}</span>
          <div>
            <h3 className={`font-terminal text-xl uppercase ${colorClass}`}>{section.title}</h3>
            <p className="text-zinc-600 font-terminal text-sm mt-1">{section.tips.length} principles</p>
          </div>
        </div>
        <span className={`font-terminal text-xl ${colorClass} shrink-0`}>{expanded ? "▲" : "▼"}</span>
      </button>

      {expanded && (
        <div className="border-t border-zinc-800 p-5 space-y-4">
          <p className="text-zinc-400 font-terminal text-sm leading-relaxed">{section.intro}</p>

          {/* Tips */}
          <div className="space-y-2">
            {section.tips.map((tip, i) => (
              <div key={tip.id} className="border border-zinc-800 hover:border-zinc-700 transition-colors">
                <button onClick={() => setOpenTipId(openTipId === tip.id ? null : tip.id)}
                  className="w-full p-3 text-left flex items-start gap-3">
                  <span className={`font-terminal text-sm shrink-0 mt-0.5 ${colorClass}`}>{String(i + 1).padStart(2, '0')}.</span>
                  <span className="text-zinc-200 font-terminal text-base flex-1">{tip.text}</span>
                  {(tip.detail || tip.appLink) && (
                    <span className="text-zinc-700 font-terminal text-xs shrink-0">{openTipId === tip.id ? "▲" : "▼"}</span>
                  )}
                </button>
                {openTipId === tip.id && (tip.detail || tip.appLink) && (
                  <div className="px-8 pb-4 space-y-3">
                    {tip.detail && (
                      <p className="text-zinc-500 font-terminal text-sm leading-relaxed">{tip.detail}</p>
                    )}
                    {tip.appLink && (
                      <Link href={tip.appLink.href}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 font-terminal text-xs border ${borderClass} ${colorClass} hover:bg-white/5 transition-colors`}>
                        ▶ {tip.appLink.label} →
                      </Link>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Resources */}
          {section.resources && section.resources.length > 0 && (
            <div className="pt-3 border-t border-zinc-800">
              <p className="text-zinc-600 font-terminal text-xs uppercase mb-2">Resources</p>
              <div className="flex flex-wrap gap-2">
                {section.resources.map(r => r.url.startsWith('/') ? (
                  <Link key={r.url} href={r.url} title={r.note}
                    className={`flex items-center gap-1.5 px-3 py-1.5 font-terminal text-xs border ${borderClass} ${colorClass} hover:bg-white/5 transition-colors`}>
                    ▶ {r.label}
                  </Link>
                ) : (
                  <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" title={r.note}
                    className={`flex items-center gap-1.5 px-3 py-1.5 font-terminal text-xs border ${borderClass} ${colorClass} hover:bg-white/5 transition-colors`}>
                    ↗ {r.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function GuidePage() {
  const [search, setSearch] = useState('');

  useEffect(() => {
    void unlockAchievement('a_guide');
  }, []);
  const totalTips = GUIDE_SECTIONS.reduce((s, g) => s + g.tips.length, 0);

  const filteredSections = search.trim()
    ? GUIDE_SECTIONS.map(section => ({
        ...section,
        tips: section.tips.filter(t =>
          t.text.toLowerCase().includes(search.toLowerCase()) ||
          (t.detail && t.detail.toLowerCase().includes(search.toLowerCase()))
        )
      })).filter(s => s.tips.length > 0)
    : GUIDE_SECTIONS;

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      {/* Header */}
      <div className="border-b-4 border-green-900 pb-6 mb-8">
        <div className="flex items-center gap-4 mb-3">
          <span className="text-4xl">📖</span>
          <div>
            <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">
              The Hunter&apos;s Field Guide
            </h2>
            <p className="text-zinc-500 font-terminal text-sm mt-1">
              {GUIDE_SECTIONS.length} chapters · {totalTips} principles · Built from the collective wisdom of the retro hunting community
            </p>
          </div>
        </div>
        <p className="text-zinc-500 font-terminal text-sm leading-relaxed max-w-3xl">
          This guide distills years of knowledge from experienced retro game hunters — from the psychology of the deal to the mechanics of pricing, negotiation, authentication, and building a collection with intent. Every principle here is tied directly to a RetroVault feature so you can put it into practice immediately.
        </p>
      </div>

      {/* Quick nav */}
      <div className="flex flex-wrap gap-2 mb-6">
        {GUIDE_SECTIONS.map(s => (
          <button key={s.id}
            onClick={() => {
              const el = document.getElementById(`section-${s.id}`);
              el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }}
            className="px-3 py-1.5 font-terminal text-xs border border-zinc-700 text-zinc-500 hover:text-zinc-200 hover:border-zinc-500 transition-colors">
            {s.icon} {s.title}
          </button>
        ))}
      </div>

      {/* Search */}
      <input type="text" value={search} onChange={e => setSearch(e.target.value)}
        placeholder="Search tips and principles..."
        className="w-full bg-zinc-950 border-2 border-zinc-800 text-zinc-300 font-terminal text-base p-3 mb-6 focus:outline-none focus:border-green-600 max-w-lg" />

      {search && (
        <p className="text-zinc-600 font-terminal text-sm mb-4">
          {filteredSections.reduce((s, g) => s + g.tips.length, 0)} results for &quot;{search}&quot;
        </p>
      )}

      {/* Sections */}
      <div className="space-y-4">
        {filteredSections.map(section => (
          <div key={section.id} id={`section-${section.id}`}>
            <SectionCard section={section} />
          </div>
        ))}
      </div>

      {/* Footer attribution */}
      <div className="mt-10 border-t border-zinc-800 pt-6">
        <p className="text-zinc-700 font-terminal text-xs leading-relaxed">
          Knowledge sourced from the retro game collecting community, including insights from Chase After The Right Price, r/gamecollecting, experienced collectors and store owners, and the RetroVault team. Prices and market conditions change — always verify current data before buying or selling.
        </p>
      </div>
    </div>
  );
}
