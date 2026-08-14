"use client";
import React from "react";
import { TagsPanel } from "@/components/TagsPanel";
import { YouTubePanel } from "@/components/YouTubePanel";
import { getCopyBucketLabel, getOwnedCopyBuckets } from "@/lib/copyCondition";
import { getPriceTrend, getTotalPaid } from "@/lib/marketUtils";

type GameCopy = {
  id: string;
  hasBox: boolean;
  hasManual: boolean;
  priceAcquired: string;
  condition?: string;
};

type PriceHistoryEntry = {
  loose: string | null;
  cib: string | null;
  new: string | null;
  graded: string | null;
  fetchedAt?: string;
};

type PriceVariantMatch = {
  title: string;
  platform: string;
  loose: string | null;
  cib: string | null;
  new: string | null;
  graded: string | null;
};

type GameItem = {
  id: string;
  title: string;
  platform: string;
  marketLoose?: string;
  marketCib?: string;
  marketNew?: string;
  marketGraded?: string;
  priceHistory?: Record<string, PriceHistoryEntry>;
  lastFetched?: string;
  purchaseDate?: string;
  copies: GameCopy[];
  hasVariants?: boolean;
  variantMatches?: PriceVariantMatch[];
};

function trendLabel(t: number | null) {
  if (t === null) return "--";
  return `${t > 0 ? "+" : ""}${t.toFixed(1)}% ${t > 2 ? "↑" : t < -2 ? "↓" : "→"}`;
}

function trendColor(t: number | null) {
  if (t === null) return "text-zinc-500";
  if (t > 2) return "text-green-400";
  if (t < -2) return "text-red-400";
  return "text-yellow-400";
}

export function GameTitleButton({
  item,
  onClick,
  className,
}: {
  item: GameItem;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={className ?? "hover:text-green-100 hover:underline text-left truncate w-full"}
      title={`${item.title} — click for price details`}
    >
      {item.title}
    </button>
  );
}

type Person = { id: string; name: string };

export function PriceDetailModal({
  item,
  onClose,
  favoritedBy = [],
  regrettedBy = [],
  onDateSaved,
  allPeople = [],
}: {
  item: GameItem;
  onClose: () => void;
  favoritedBy?: Person[];
  regrettedBy?: Person[];
  onDateSaved?: (id: string, date: string) => void;
  allPeople?: Person[];
}) {
  const [dateInput, setDateInput] = React.useState(item.purchaseDate || '');
  const [savedDate, setSavedDate] = React.useState(item.purchaseDate || '');
  const [savingDate, setSavingDate] = React.useState(false);
  const [showUpdateField, setShowUpdateField] = React.useState(false);
  const [variantInfo, setVariantInfo] = React.useState<{ hasVariants: boolean; variantMatches: PriceVariantMatch[] }>({
    hasVariants: !!item.hasVariants,
    variantMatches: item.variantMatches || [],
  });

  React.useEffect(() => {
    let cancelled = false;
    fetch(`/api/pricecharting?title=${encodeURIComponent(item.title)}&platform=${encodeURIComponent(item.platform)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled || !data) return;
        setVariantInfo({
          hasVariants: !!data.hasVariants,
          variantMatches: Array.isArray(data.variantMatches) ? data.variantMatches : [],
        });
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [item.title, item.platform]);

  const saveDate = async () => {
    if (!dateInput) return;
    setSavingDate(true);
    try {
      await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...item, purchaseDate: dateInput })
      });
      setSavedDate(dateInput);
      setShowUpdateField(false);
      onDateSaved?.(item.id, dateInput);
    } catch (e) { console.error(e); }
    finally { setSavingDate(false); }
  };
  const copies = item.copies || [];
  const qty = copies.length;
  const ownedBuckets = getOwnedCopyBuckets(copies, item.platform);

  const priceVal = (v: string | undefined) =>
    v && v !== "0" && v !== "N/A" ? `$${v}` : "--";

  const priceRow = (
    label: string,
    value: string | undefined,
    color: string,
    isOwned: boolean
  ) => (
    <div
      className={`flex justify-between items-center p-3 rounded-sm border font-terminal text-xl ${
        isOwned
          ? "bg-green-900/30 border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.2)]"
          : "bg-zinc-900 border-zinc-800"
      }`}
    >
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-zinc-400">{label}:</span>
        {isOwned && (
          <span className="text-green-400 text-sm border border-green-600 px-2 py-0.5 rounded-full">
            YOU HAVE THIS
          </span>
        )}
      </div>
      <span className={`${color} font-bold`}>{priceVal(value)}</span>
    </div>
  );

  const priceKey: "loose" | "cib" = ownedBuckets.cib && !ownedBuckets.loose ? "cib" : "loose";
  const trend7 = getPriceTrend(item, 7, priceKey);
  const trend30 = getPriceTrend(item, 30, priceKey);
  const historyCount = item.priceHistory ? Object.keys(item.priceHistory).length : 0;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-zinc-950 border-4 border-blue-500 p-6 rounded-sm w-full max-w-md shadow-[0_0_30px_rgba(59,130,246,0.4)] overflow-y-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-2xl text-blue-400 font-terminal uppercase mb-1 tracking-widest border-b-2 border-blue-900 pb-2">
          {item.title}
        </h3>
        <p className="text-green-500 font-terminal text-lg mb-0">{item.platform}</p>
        {/* Purchase Date Row */}
        <div className="mb-1 space-y-1">
          {savedDate ? (
            <div className="flex items-center gap-3">
              <span className="text-zinc-500 font-terminal text-sm">
                Acquired: {new Date(savedDate + 'T12:00:00').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </span>
              <button
                onClick={() => { setShowUpdateField(v => !v); setDateInput(savedDate); }}
                className="text-zinc-600 hover:text-zinc-400 font-terminal text-xs border border-zinc-800 px-2 py-0.5 transition-colors"
              >
                {showUpdateField ? 'CANCEL' : 'EDIT DATE'}
              </button>
            </div>
          ) : null}
          {(!savedDate || showUpdateField) && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateInput}
                onChange={e => setDateInput(e.target.value)}
                className="bg-black border border-zinc-700 text-zinc-400 p-1 font-terminal text-sm focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={saveDate}
                disabled={!dateInput || savingDate}
                className="text-blue-400 hover:text-blue-300 font-terminal text-sm border border-blue-800 px-2 py-0.5 disabled:opacity-40 transition-colors"
              >
                {savingDate ? 'SAVING...' : savedDate ? 'UPDATE DATE' : 'SET DATE'}
              </button>
            </div>
          )}
        </div>
        {qty > 0 ? (
          <p className="text-emerald-400 font-terminal text-sm mb-5">
            YOU OWN {qty} {qty === 1 ? "COPY" : "COPIES"}{qty > 1 ? " (MULTIPLE)" : ""}
          </p>
        ) : (
          <p className="text-zinc-500 font-terminal text-sm mb-5">NOT IN COLLECTION</p>
        )}

        {/* Variant Pricing Alert */}
        {variantInfo.hasVariants && (
          <div className="mt-3 mb-4 border border-amber-700 bg-amber-950/20 p-3">
            <div className="text-amber-300 font-terminal text-base font-bold mb-1">⚠ Variant-sensitive pricing</div>
            <p className="text-amber-500 font-terminal text-xs mb-2">This title has editions that command different prices (e.g. Not For Resale, First Print, Player’s Choice). Confirm which version this is before buying, selling, or comparing prices.</p>
            {variantInfo.variantMatches && variantInfo.variantMatches.length > 0 && (
              <div className="space-y-1">
                {variantInfo.variantMatches.map((v, i) => (
                  <div key={i} className="border border-amber-900 px-2 py-1 font-terminal text-xs text-amber-400">
                    <span className="font-bold">{v.title}</span>
                    {v.loose && v.loose !== 'N/A' && ` · Loose $${v.loose}`}
                    {v.cib && v.cib !== 'N/A' && ` · CIB $${v.cib}`}
                    {v.new && v.new !== 'N/A' && ` · New $${v.new}`}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Market Prices */}
        <div className="space-y-3">
          {priceRow("LOOSE", item.marketLoose, "text-green-400", !!ownedBuckets.loose)}
          {priceRow("CIB", item.marketCib, "text-blue-400", !!ownedBuckets.cib)}
          {priceRow("PARTIAL (BOX OR MANUAL)", item.marketCib, "text-yellow-300", !!ownedBuckets.partial)}
          {priceRow("NEW/SEALED", item.marketNew, "text-yellow-400", false)}
          <div className="opacity-60">
            {priceRow("GRADED", item.marketGraded, "text-purple-400", false)}
          </div>
        </div>

        {/* What I Paid */}
        <div className="mt-4 pt-4 border-t-2 border-zinc-800">
          {qty > 0 ? (
            <div>
              <h4 className="text-zinc-400 font-terminal text-lg mb-3 uppercase">What You Paid</h4>
              <div className="space-y-2">
                {copies.map((copy, idx) => {
                  const paid = parseFloat(copy.priceAcquired) || 0;
                  const condition = getCopyBucketLabel(copy);
                  const condColor = condition === "CIB" ? "text-blue-400" : condition === "PARTIAL" ? "text-yellow-300" : "text-green-400";
                  return (
                    <div key={copy.id} className="flex justify-between items-center p-2 bg-zinc-900 border border-zinc-800 rounded-sm font-terminal text-lg">
                      <span className="text-zinc-400">
                        COPY #{idx + 1} <span className={`${condColor} text-sm`}>[{condition}]</span>
                        {copy.condition && copy.condition !== "Good" && (
                          <span className="text-zinc-500 text-sm ml-1">({copy.condition})</span>
                        )}
                      </span>
                      {paid > 0
                        ? <span className="text-emerald-400 font-bold">${paid.toFixed(2)}</span>
                        : <span className="text-zinc-600 italic">Unknown</span>}
                    </div>
                  );
                })}
                {copies.length > 1 && (
                  <div className="flex justify-between items-center p-2 bg-emerald-900/20 border border-emerald-800 rounded-sm font-terminal text-lg mt-1">
                    <span className="text-zinc-300 font-bold">TOTAL PAID:</span>
                    <span className="text-emerald-400 font-bold">${getTotalPaid(copies).toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center p-3 bg-zinc-900/50 border border-dashed border-zinc-700 rounded-sm font-terminal text-lg">
              <span className="text-zinc-500">COST PAID:</span>
              <span className="text-zinc-600 italic">Not in collection</span>
            </div>
          )}
        </div>

        {/* Market Timing — 30-day moving average vs current price */}
        {historyCount >= 3 && (() => {
          const history = item.priceHistory!;
          const sortedDates = Object.keys(history).sort();
          const recentDates = sortedDates.slice(-30);
          const priceKey2: 'loose' | 'cib' = (copies[0]?.hasBox && copies[0]?.hasManual) ? 'cib' : 'loose';
          const recentPrices = recentDates
            .map(d => parseFloat(history[d][priceKey2] || '0'))
            .filter(v => v > 0);
          if (recentPrices.length < 2) return null;
          const movingAvg = recentPrices.reduce((s, v) => s + v, 0) / recentPrices.length;
          const currentPrice = recentPrices[recentPrices.length - 1];
          const deviation = ((currentPrice - movingAvg) / movingAvg * 100);
          const signal = deviation > 5 ? { label: 'ABOVE AVERAGE', color: 'text-red-400', emoji: '📈', tip: 'Good time to sell — price is elevated vs 30-day avg.' } :
            deviation < -5 ? { label: 'BELOW AVERAGE', color: 'text-emerald-400', emoji: '📉', tip: 'Potential buy opportunity — price is below 30-day avg.' } :
            { label: 'AT AVERAGE', color: 'text-yellow-400', emoji: '➡️', tip: 'Price is stable near the 30-day average.' };
          return (
            <div className="mt-4 pt-3 border-t border-zinc-800">
              <h4 className="text-zinc-400 font-terminal text-lg mb-2 uppercase">📊 Market Timing</h4>
              <div className="bg-zinc-900 border border-zinc-700 rounded-sm p-3 space-y-2">
                <div className="flex justify-between font-terminal text-lg">
                  <span className="text-zinc-500">30-Day Avg:</span>
                  <span className="text-zinc-300">${movingAvg.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-terminal text-lg">
                  <span className="text-zinc-500">Current:</span>
                  <span className="text-zinc-300">${currentPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-terminal text-lg">
                  <span className="text-zinc-500">Deviation:</span>
                  <span className={`font-bold ${signal.color}`}>{deviation > 0 ? '+' : ''}{deviation.toFixed(1)}%</span>
                </div>
                <div className={`flex items-center gap-2 pt-2 border-t border-zinc-700 font-terminal text-lg font-bold ${signal.color}`}>
                  <span>{signal.emoji}</span>
                  <span>{signal.label}</span>
                </div>
                <p className="text-zinc-600 text-xs">{signal.tip}</p>
              </div>
            </div>
          );
        })()}

        {/* Price Trends */}
        {historyCount >= 3 && (
          <div className="mt-4 pt-3 border-t border-zinc-800">
            <h4 className="text-zinc-400 font-terminal text-lg mb-2 uppercase">Price Trend</h4>
            <div className="flex gap-4">
              <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-sm p-2 text-center">
                <div className="text-zinc-500 text-xs mb-1">7 DAYS</div>
                <div className={`font-terminal text-lg font-bold ${trendColor(trend7)}`}>{trendLabel(trend7)}</div>
              </div>
              <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-sm p-2 text-center">
                <div className="text-zinc-500 text-xs mb-1">30 DAYS</div>
                <div className={`font-terminal text-lg font-bold ${trendColor(trend30)}`}>{trendLabel(trend30)}</div>
              </div>
              <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-sm p-2 text-center">
                <div className="text-zinc-500 text-xs mb-1">DATA POINTS</div>
                <div className="font-terminal text-lg text-blue-400">{historyCount}</div>
              </div>
            </div>
          </div>
        )}

        {/* Favorited By / Regretted By */}
        {(favoritedBy.length > 0 || regrettedBy.length > 0) && (
          <div className="mt-4 pt-3 border-t border-zinc-800 space-y-3">
            {favoritedBy.length > 0 && (
              <div>
                <h4 className="text-yellow-400 font-terminal text-lg mb-2 uppercase">⭐ Favorited By</h4>
                <div className="flex flex-wrap gap-2">
                  {favoritedBy.map(p => (
                    <span key={p.id} className="bg-yellow-900/30 border border-yellow-600 text-yellow-300 font-terminal text-sm px-3 py-1 rounded-full">
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {regrettedBy.length > 0 && (
              <div>
                <h4 className="text-red-400 font-terminal text-lg mb-2 uppercase">👎 Regretted By</h4>
                <div className="flex flex-wrap gap-2">
                  {regrettedBy.map(p => (
                    <span key={p.id} className="bg-red-900/30 border border-red-600 text-red-300 font-terminal text-sm px-3 py-1 rounded-full">
                      {p.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {item.lastFetched && (
          <p className="text-zinc-600 font-terminal text-sm mt-4">
            Last fetched: {new Date(item.lastFetched).toLocaleString()}
          </p>
        )}

        <TagsPanel
          entityId={item.id}
          entityType="game"
          entityName={item.title}
          people={allPeople}
        />

        <YouTubePanel game={item.title} platform={item.platform} />

        <div className="mt-6 flex justify-between items-center">
          <a
            href={`https://www.pricecharting.com/search-products?q=${encodeURIComponent(`${item.title} ${item.platform}`)}&type=videogames`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-400 hover:text-yellow-300 font-terminal text-sm"
          >
            [VIEW ON PRICECHARTING ↗]
          </a>
          <button onClick={onClose} className="px-4 py-2 font-terminal text-xl text-zinc-400 hover:text-white">
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
