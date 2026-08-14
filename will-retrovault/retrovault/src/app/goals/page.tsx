"use client";
import { useEffect, useState } from "react";
import { getConsoleData } from "@/data/consoles";
import { PlatformButton, ConsoleModal } from "@/components/ConsoleModal";

type GameItem = { id: string; title: string; platform: string; copies: { id?: string; condition?: string; priceAcquired?: string | number }[]; isDigital?: boolean; };
type Priority = 1 | 2 | 3 | null;
const PRIORITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "HIGH", color: "text-red-400 border-red-600" },
  2: { label: "MED", color: "text-yellow-400 border-yellow-600" },
  3: { label: "LOW", color: "text-zinc-400 border-zinc-600" },
};

export default function GoalsPage() {
  const [items, setItems] = useState<GameItem[]>([]);
  const [priorities, setPriorities] = useState<Record<string, Priority>>({});
  const [consolePlatform, setConsolePlatform] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"priority" | "completion" | "owned" | "name">("priority");

  useEffect(() => {
    Promise.all([
      fetch('/api/inventory').then(r => r.json()),
      fetch('/api/goals').then(r => r.json()),
    ]).then(([inv, goals]) => {
      setItems(inv);
      setPriorities(goals.priorities || {});
    }).finally(() => setLoading(false));
  }, []);

  const setPriority = async (platform: string, priority: Priority) => {
    const newP = { ...priorities, [platform]: priority };
    if (priority === null) delete newP[platform];
    setPriorities(newP);
    await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ platform, priority }),
    });
  };

  if (loading) return <div className="text-green-500 font-terminal text-2xl animate-pulse p-6">COMPUTING COLLECTION GOALS...</div>;

  const platformMap = items.reduce((acc, item) => {
    if (!acc[item.platform]) acc[item.platform] = { total: 0, owned: 0 };
    acc[item.platform].total += 1;
    if ((item.copies || []).length > 0 && !item.isDigital) acc[item.platform].owned += 1;
    return acc;
  }, {} as Record<string, { total: number; owned: number }>);

  const platforms = Object.entries(platformMap).map(([name, { total, owned }]) => {
    const consoleData = getConsoleData(name);
    const librarySize = consoleData?.librarySize || total;
    const pct = Math.round((owned / total) * 100);
    const libraryPct = parseFloat(((owned / librarySize) * 100).toFixed(2));
    const priority = priorities[name] || null;
    return { name, total, owned, librarySize, pct, libraryPct, priority };
  }).sort((a, b) => {
    if (sortBy === "priority") {
      const pa = a.priority ?? 99;
      const pb = b.priority ?? 99;
      if (pa !== pb) return pa - pb;
      return b.pct - a.pct;
    }
    if (sortBy === "completion") return b.pct - a.pct;
    if (sortBy === "owned") return b.owned - a.owned;
    return a.name.localeCompare(b.name);
  });

  const totalOwned = items.filter(i => (i.copies || []).length > 0 && !i.isDigital).length;
  const totalCatalog = items.length;

  const barColor = (pct: number) => {
    if (pct >= 75) return "bg-emerald-500";
    if (pct >= 40) return "bg-yellow-500";
    if (pct >= 15) return "bg-blue-500";
    return "bg-zinc-600";
  };

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh] flex flex-col space-y-6">
      <header className="border-b-4 border-green-900 pb-6">
        <div className="flex items-center gap-4 mb-4">
          <span className="text-3xl">🏆</span>
          <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase">Collection Goals</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-zinc-950 border-2 border-green-800 p-4 text-center rounded-sm">
            <div className="text-green-600 font-terminal text-sm mb-1">OWNED</div>
            <div className="text-4xl font-bold text-green-400">{totalOwned.toLocaleString()}</div>
          </div>
          <div className="bg-zinc-950 border-2 border-green-800 p-4 text-center rounded-sm">
            <div className="text-green-600 font-terminal text-sm mb-1">CATALOG SIZE</div>
            <div className="text-4xl font-bold text-zinc-300">{totalCatalog.toLocaleString()}</div>
          </div>
          <div className="bg-zinc-950 border-2 border-green-800 p-4 text-center rounded-sm">
            <div className="text-green-600 font-terminal text-sm mb-1">OVERALL COVERAGE</div>
            <div className="text-4xl font-bold text-yellow-400">{Math.round((totalOwned / totalCatalog) * 100)}%</div>
          </div>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3 justify-end">
        <span className="text-zinc-500 font-terminal text-lg">Sort:</span>
        {(["priority","completion","owned","name"] as const).map(s => (
          <button key={s} onClick={() => setSortBy(s)}
            className={`px-3 py-1 font-terminal text-lg uppercase border transition-colors ${sortBy === s ? 'bg-green-600 text-black border-green-400' : 'text-zinc-400 border-zinc-700 hover:border-green-700'}`}>
            {s === "priority" ? "⭐ Priority" : s}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {platforms.map(({ name, total, owned, librarySize, pct, libraryPct, priority }) => (
          <div key={name} className="bg-zinc-950 border-2 border-green-900 hover:border-green-700 rounded-sm p-4 transition-colors">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                {/* Priority Picker */}
                <div className="flex gap-1">
                  {([1, 2, 3] as const).map(p => (
                    <button key={p} onClick={() => setPriority(name, priority === p ? null : p)}
                      title={`Set ${PRIORITY_LABELS[p].label} priority`}
                      className={`w-7 h-7 text-xs font-terminal border rounded-sm transition-all ${priority === p ? `bg-current ${PRIORITY_LABELS[p].color.replace('text-','text-black border-')} font-bold` : `${PRIORITY_LABELS[p].color} hover:opacity-80 bg-transparent`}`}>
                      {p}
                    </button>
                  ))}
                </div>
                <div>
                  <PlatformButton platform={name} onClick={setConsolePlatform} className="text-green-300 font-terminal font-bold text-xl hover:text-green-100" />
                  <span className="text-zinc-600 font-terminal text-sm ml-3">{owned} / {total} tracked</span>
                </div>
              </div>
              <div className="flex gap-4 items-center">
                {priority !== null && (
                  <span className={`font-terminal text-sm border px-2 py-0.5 rounded-full ${PRIORITY_LABELS[priority]?.color}`}>
                    {PRIORITY_LABELS[priority]?.label}
                  </span>
                )}
                <div className="text-right">
                  <div className="text-zinc-500 font-terminal text-xs">CATALOG</div>
                  <div className="text-green-400 font-terminal font-bold text-2xl">{pct}%</div>
                </div>
                {librarySize !== total && (
                  <div className="text-right">
                    <div className="text-zinc-500 font-terminal text-xs">FULL LIB</div>
                    <div className="text-blue-400 font-terminal font-bold text-lg">{libraryPct}%</div>
                    <div className="text-zinc-600 font-terminal text-xs">of ~{librarySize.toLocaleString()}</div>
                  </div>
                )}
              </div>
            </div>
            <div className="h-4 bg-zinc-800 rounded-full overflow-hidden">
              <div className={`h-full ${barColor(pct)} rounded-full transition-all`} style={{ width: `${pct}%` }}></div>
            </div>
            {pct >= 75 && <div className="mt-2 text-emerald-400 font-terminal text-sm">🏆 Elite collector! {total - owned} titles left.</div>}
          </div>
        ))}
      </div>

      {consolePlatform && (
        <ConsoleModal platform={consolePlatform} totalInCatalog={platformMap[consolePlatform]?.total || 0}
          owned={platformMap[consolePlatform]?.owned || 0} onClose={() => setConsolePlatform(null)} />
      )}
    </div>
  );
}
