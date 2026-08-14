"use client";

import { getConsoleData, getDailyFacts } from "@/data/consoles";
import { TagsPanel } from "@/components/TagsPanel";
import { YouTubePanel } from "@/components/YouTubePanel";

export function PlatformButton({
  platform,
  onClick,
  className,
}: {
  platform: string;
  onClick: (p: string) => void;
  className?: string;
}) {
  const data = getConsoleData(platform);
  return (
    <button
      onClick={data ? () => onClick(platform) : undefined}
      className={`${className ?? ""}${data ? " hover:underline cursor-pointer" : ""} transition-colors`}
      title={data ? `Click for ${platform} info` : platform}
    >
      {platform}
    </button>
  );
}

type Person = { id: string; name: string };

export function ConsoleModal({
  platform,
  totalInCatalog,
  owned,
  onClose,
  people = [],
}: {
  platform: string;
  totalInCatalog: number;
  owned: number;
  onClose: () => void;
  people?: Person[];
}) {
  const data = getConsoleData(platform);
  if (!data) return null;

  const dailyFacts = getDailyFacts(data.facts);
  const completionPct = data.librarySize > 0
    ? ((owned / data.librarySize) * 100).toFixed(2)
    : "0";
  const catalogPct = totalInCatalog > 0
    ? ((owned / totalInCatalog) * 100).toFixed(1)
    : "0";
  const lifespan = data.discontinuedYear
    ? `${data.discontinuedYear - data.releaseYear} years`
    : `${new Date().getFullYear() - data.releaseYear}+ years (still active)`;

  const borderColor = data.color === "blue" ? "border-blue-500" :
    data.color === "red" ? "border-red-500" :
    data.color === "green" ? "border-green-500" :
    data.color === "purple" ? "border-purple-500" :
    data.color === "indigo" ? "border-indigo-500" :
    data.color === "cyan" ? "border-cyan-500" :
    data.color === "orange" ? "border-orange-500" :
    "border-yellow-500";

  const accentColor = data.color === "blue" ? "text-blue-400" :
    data.color === "red" ? "text-red-400" :
    data.color === "green" ? "text-green-400" :
    data.color === "purple" ? "text-purple-400" :
    data.color === "indigo" ? "text-indigo-400" :
    data.color === "cyan" ? "text-cyan-400" :
    data.color === "orange" ? "text-orange-400" :
    "text-yellow-400";

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm overflow-y-auto py-8"
      onClick={onClose}
    >
      <div
        className={`bg-zinc-950 border-4 ${borderColor} p-6 rounded-sm w-full max-w-2xl shadow-[0_0_30px_rgba(0,0,0,0.8)] mx-4 overflow-y-auto max-h-[90vh]`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`border-b-2 border-zinc-800 pb-4 mb-6`}>
          <p className="text-zinc-500 font-terminal text-sm uppercase tracking-widest mb-1">{data.manufacturer}</p>
          <h2 className={`text-3xl font-bold ${accentColor} font-terminal uppercase tracking-wider`}>
            {data.shortName}
          </h2>
          <p className="text-zinc-400 font-terminal text-lg mt-1">
            {data.releaseYear} — {data.discontinuedYear ?? "Present"} &nbsp;·&nbsp; {lifespan}
          </p>
        </div>

        {/* Description */}
        <p className="text-zinc-300 text-base leading-relaxed mb-6 font-mono">
          {data.description}
        </p>

        {/* Core Stats */}
        <div className="mb-6">
          <h3 className={`font-terminal text-xl uppercase mb-3 ${accentColor}`}>Core Stats</h3>
          <div className="grid grid-cols-2 gap-3">
            {[
              ["CPU", data.cpu],
              ["RAM", data.ram],
              ["Released", data.releaseYear.toString()],
              ["Discontinued", data.discontinuedYear?.toString() ?? "Still Active"],
              ["Full Library Size", `~${data.librarySize.toLocaleString()} titles`],
              ["You Own", `${owned} titles`],
              ["Catalog Coverage", `${catalogPct}% of tracked titles`],
              ["Library Completion", `${completionPct}% of total library`],
            ].map(([label, value]) => (
              <div key={label} className="bg-zinc-900 border border-zinc-700 rounded-sm p-3">
                <div className="text-zinc-500 font-terminal text-xs uppercase mb-1">{label}</div>
                <div className={`font-terminal text-lg font-bold ${accentColor}`}>{value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Daily Rotating Facts */}
        <div className="mb-6">
          <h3 className={`font-terminal text-xl uppercase mb-3 ${accentColor}`}>
            📡 Today&apos;s Did You Know?
            <span className="text-zinc-600 text-sm ml-2 font-normal">(rotates daily)</span>
          </h3>
          <div className="space-y-3">
            {dailyFacts.map((fact, i) => (
              <div key={i} className="bg-zinc-900 border border-zinc-700 rounded-sm p-4 flex gap-3">
                <span className={`${accentColor} font-terminal text-xl shrink-0`}>{i + 1}.</span>
                <p className="text-zinc-300 text-sm leading-relaxed">{fact}</p>
              </div>
            ))}
          </div>
        </div>

        <YouTubePanel game={platform} platform={platform} type="trailer" />

        <TagsPanel
          entityId={`platform-${platform.toLowerCase().replace(/\s+/g, '-')}`}
          entityType="platform"
          entityName={platform}
          people={people}
        />

        <div className="flex justify-end mt-4">
          <button onClick={onClose} className="px-6 py-2 font-terminal text-xl text-zinc-400 hover:text-white border border-zinc-700 hover:border-zinc-400 transition-colors">
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
