"use client";

import { useEffect, useState } from "react";

type Person = { id: string; name: string };
type GameItem = { id: string; title: string; platform: string; copies?: unknown[] };

type MentionEntry = {
  id: string; entityId: string; entityType: string; entityName: string;
  fromPerson: string; message: string; createdAt: string;
};

type Props = {
  critic: Person;
  people: Person[];
  items: GameItem[];
  favData: Record<string, string[]>;
  regretData: Record<string, string[]>;
  onClose: () => void;
};

export function CriticProfileModal({ critic, items, favData, regretData, onClose }: Props) {
  const [mentions, setMentions] = useState<MentionEntry[]>([]);

  const favIds = favData[critic.id] || [];
  const regIds = regretData[critic.id] || [];
  const favItems = items.filter(i => favIds.includes(i.id));
  const regItems = items.filter(i => regIds.includes(i.id));

  const platformBreakdown: Record<string, { favs: number; regs: number }> = {};
  for (const i of favItems) {
    platformBreakdown[i.platform] = platformBreakdown[i.platform] || { favs: 0, regs: 0 };
    platformBreakdown[i.platform].favs++;
  }
  for (const i of regItems) {
    platformBreakdown[i.platform] = platformBreakdown[i.platform] || { favs: 0, regs: 0 };
    platformBreakdown[i.platform].regs++;
  }
  const topPlatforms = Object.entries(platformBreakdown)
    .sort((a, b) => (b[1].favs + b[1].regs) - (a[1].favs + a[1].regs))
    .slice(0, 5);
  const ratio = favIds.length + regIds.length > 0
    ? ((favIds.length / (favIds.length + regIds.length)) * 100).toFixed(0) : null;

  useEffect(() => {
    fetch('/api/tags').then(r => r.json()).then(d => {
      setMentions((d.mentions || {})[critic.id] || []);
    });
  }, [critic.id]);

  const deleteMention = async (mentionId: string) => {
    await fetch('/api/tags', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete_mention', personId: critic.id, mentionId })
    });
    setMentions(prev => prev.filter(m => m.id !== mentionId));
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-950 border-4 border-purple-600 p-6 rounded-sm w-full max-w-2xl shadow-[0_0_30px_rgba(168,85,247,0.4)] mx-4 overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="border-b-2 border-purple-900 pb-4 mb-6">
          <h2 className="text-3xl text-purple-400 font-terminal uppercase tracking-widest">🎮 {critic.name}</h2>
          <p className="text-purple-700 font-terminal text-sm mt-1">Player Profile</p>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'FAVORITES', value: favIds.length, color: 'text-yellow-400' },
            { label: 'REGRETS', value: regIds.length, color: 'text-red-400' },
            { label: 'POSITIVITY', value: ratio ? `${ratio}%` : '--', color: parseInt(ratio || '0') >= 60 ? 'text-emerald-400' : 'text-orange-400' },
            { label: 'MENTIONS', value: mentions.length, color: 'text-purple-300' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-zinc-900 border border-purple-900/50 p-3 rounded-sm text-center">
              <div className="text-zinc-500 font-terminal text-xs mb-1">{label}</div>
              <div className={`font-terminal font-bold text-2xl ${color}`}>{value}</div>
            </div>
          ))}
        </div>

        {/* Top Platforms */}
        {topPlatforms.length > 0 && (
          <div className="mb-6">
            <h3 className="text-purple-400 font-terminal text-lg uppercase mb-3">Top Platforms</h3>
            <div className="space-y-2">
              {topPlatforms.map(([plat, counts]) => (
                <div key={plat} className="flex items-center justify-between bg-zinc-900 border border-zinc-800 p-2 rounded-sm">
                  <span className="text-zinc-300 font-terminal">{plat}</span>
                  <div className="flex gap-3">
                    {counts.favs > 0 && <span className="text-yellow-400 font-terminal text-sm">⭐ {counts.favs}</span>}
                    {counts.regs > 0 && <span className="text-red-400 font-terminal text-sm">👎 {counts.regs}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mentions */}
        {mentions.length > 0 && (
          <div className="mb-6">
            <h3 className="text-purple-400 font-terminal text-lg uppercase mb-3">💬 @ Mentions ({mentions.length})</h3>
            <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
              {mentions.map(m => (
                <div key={m.id} className="bg-zinc-900 border border-purple-900/40 p-3 rounded-sm">
                  <div className="flex justify-between items-start mb-1">
                    <div className="font-terminal text-sm text-purple-400">
                      {m.fromPerson} on <span className="text-green-400">{m.entityName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-zinc-700 font-terminal text-xs">{new Date(m.createdAt).toLocaleDateString()}</span>
                      <button onClick={() => deleteMention(m.id)} className="text-zinc-700 hover:text-red-400 transition-colors text-xs">✕</button>
                    </div>
                  </div>
                  <p className="text-zinc-300 font-terminal text-base">{m.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Favorites list */}
        {favItems.length > 0 && (
          <div className="mb-6">
            <h3 className="text-yellow-400 font-terminal text-lg uppercase mb-3">⭐ Favorites ({favItems.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {favItems.map(i => (
                <div key={i.id} className="bg-zinc-900 border border-yellow-900/50 p-2 rounded-sm">
                  <div className="text-yellow-300 font-terminal font-bold text-base truncate">{i.title}</div>
                  <div className="text-zinc-500 font-terminal text-xs">{i.platform}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regrets list */}
        {regItems.length > 0 && (
          <div className="mb-6">
            <h3 className="text-red-400 font-terminal text-lg uppercase mb-3">👎 Regrets ({regItems.length})</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
              {regItems.map(i => (
                <div key={i.id} className="bg-zinc-900 border border-red-900/50 p-2 rounded-sm">
                  <div className="text-red-300 font-terminal font-bold text-base truncate">{i.title}</div>
                  <div className="text-zinc-500 font-terminal text-xs">{i.platform}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {favIds.length === 0 && regIds.length === 0 && mentions.length === 0 && (
          <p className="text-zinc-600 font-terminal text-xl text-center py-6">No activity yet.</p>
        )}

        <div className="flex justify-end pt-4 border-t border-purple-900">
          <button onClick={onClose} className="px-6 py-2 font-terminal text-xl text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-400 transition-colors">
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
