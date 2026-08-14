"use client";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type MonthSignal = {
  buy: "strong" | "good" | "neutral" | "caution";
  sell: "strong" | "good" | "neutral" | "caution";
  note: string;
};

const GENERAL_CALENDAR: MonthSignal[] = [
  { buy: "strong", sell: "caution", note: "Post-holiday sell-off. Prices drop as people sell gifts. Best buying window of year." },
  { buy: "strong", sell: "neutral", note: "Continued softness. Great for patient buyers. Convention pre-season deals emerge." },
  { buy: "good", sell: "neutral", note: "Tax return season brings more sellers to FB Marketplace and Craigslist." },
  { buy: "neutral", sell: "neutral", note: "Spring cleaning season = garage sales begin. Mixed pricing quality." },
  { buy: "good", sell: "good", note: "Garage sale season peaks. Good supply at garage sales, solid sell-through online." },
  { buy: "neutral", sell: "strong", note: "Summer convention season. Collector demand spikes. Good selling window." },
  { buy: "caution", sell: "strong", note: "Prime convention season (MAGFest, Portland Retro, etc.). Prices elevated at shows." },
  { buy: "caution", sell: "strong", note: "Back-to-school nostalgia bump. Strong sell period continues." },
  { buy: "neutral", sell: "good", note: "Garage sale season winds down. Online demand stays healthy." },
  { buy: "neutral", sell: "good", note: "Pre-holiday gifting season begins. Good sell window opening." },
  { buy: "neutral", sell: "strong", note: "Black Friday effect: buyers active. Strong sell period for desirable items." },
  { buy: "caution", sell: "strong", note: "Holiday peak demand. Best selling month. Worst buying month for value hunters." },
];

type PlatformPattern = {
  platform: string;
  pattern: string;
  tip: string;
};

const PLATFORM_PATTERNS: PlatformPattern[] = [
  { platform: "NES / SNES", pattern: "Steady year-round with slight holiday spike.", tip: "These are established markets — timing matters less than condition and completeness." },
  { platform: "N64", pattern: "Anniversary years (2026 = 30th anniversary) drive price spikes.", tip: "Watch for anniversary-driven media coverage — nostalgia waves hit N64 hard." },
  { platform: "PS2 / Xbox", pattern: "Still undervalued but trending up. Buy before nostalgia wave fully arrives.", tip: "The 6th gen nostalgia wave is beginning. PS2/Xbox prices have been rising 15-20%/year." },
  { platform: "Dreamcast", pattern: "Cult following drives consistent premium. Best buys at estate sales.", tip: "Dreamcast rarely goes on sale. Patient acquisition at estate/garage sales is the play." },
  { platform: "PS3 / Xbox 360", pattern: "Currently near price floor. Long-term hold opportunity.", tip: "7th gen is the next nostalgia wave. Accumulate quality titles now before prices rise." },
  { platform: "GBA / Game Boy", pattern: "Strong demand year-round. Holiday spikes on handhelds are significant.", tip: "Handhelds are perennial gift items — price premium peaks hard in December." },
];

const SIGNAL_COLORS = {
  strong: { text: "text-emerald-400", bg: "bg-emerald-500", border: "border-emerald-700", label: "STRONG" },
  good: { text: "text-green-400", bg: "bg-green-600", border: "border-green-800", label: "GOOD" },
  neutral: { text: "text-zinc-400", bg: "bg-zinc-600", border: "border-zinc-700", label: "NEUTRAL" },
  caution: { text: "text-red-400", bg: "bg-red-700", border: "border-red-900", label: "CAUTION" },
};

const now = new Date();
const currentMonth = now.getMonth();

export default function SeasonalPage() {
  const thisMonth = GENERAL_CALENDAR[currentMonth];
  const buySig = SIGNAL_COLORS[thisMonth.buy];
  const sellSig = SIGNAL_COLORS[thisMonth.sell];

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      <div className="border-b-4 border-green-900 pb-6 mb-6">
        <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">📆 Seasonal Buy/Sell Calendar</h2>
        <p className="text-zinc-500 font-terminal text-sm mt-1">Historical patterns for when to buy and when to sell retro games</p>
      </div>

      {/* This month highlight */}
      <div className="bg-zinc-950 border-2 border-yellow-700 p-5 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-yellow-400 font-terminal text-lg uppercase">📍 Right now: {MONTHS[currentMonth]}</span>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div className={`border-2 p-4 text-center ${buySig.border}`}>
            <div className="text-zinc-500 font-terminal text-xs uppercase mb-1">Buy Signal</div>
            <div className={`font-terminal text-2xl font-bold ${buySig.text}`}>
              {thisMonth.buy === "strong" ? "🟢" : thisMonth.buy === "good" ? "🟡" : thisMonth.buy === "neutral" ? "⬜" : "🔴"} {buySig.label}
            </div>
          </div>
          <div className={`border-2 p-4 text-center ${sellSig.border}`}>
            <div className="text-zinc-500 font-terminal text-xs uppercase mb-1">Sell Signal</div>
            <div className={`font-terminal text-2xl font-bold ${sellSig.text}`}>
              {thisMonth.sell === "strong" ? "🟢" : thisMonth.sell === "good" ? "🟡" : thisMonth.sell === "neutral" ? "⬜" : "🔴"} {sellSig.label}
            </div>
          </div>
        </div>
        <p className="text-zinc-300 font-terminal text-sm">{thisMonth.note}</p>
      </div>

      {/* Full year calendar grid */}
      <div className="mb-8">
        <h3 className="text-zinc-400 font-terminal text-lg uppercase mb-4">Full Year Overview</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {GENERAL_CALENDAR.map((month, i) => {
            const isCurrent = i === currentMonth;
            const bSig = SIGNAL_COLORS[month.buy];
            const sSig = SIGNAL_COLORS[month.sell];
            return (
              <div key={i} className={`border-2 p-3 ${isCurrent ? "border-yellow-600 shadow-[0_0_10px_rgba(234,179,8,0.2)]" : "border-zinc-800"}`}>
                <div className={`font-terminal text-sm uppercase mb-2 ${isCurrent ? "text-yellow-400" : "text-zinc-400"}`}>
                  {MONTHS[i]} {isCurrent ? "← NOW" : ""}
                </div>
                <div className="flex gap-2 text-xs font-terminal">
                  <div className={`flex-1 text-center py-1 border ${bSig.border} ${bSig.text}`}>
                    B: {bSig.label[0]}
                  </div>
                  <div className={`flex-1 text-center py-1 border ${sSig.border} ${sSig.text}`}>
                    S: {sSig.label[0]}
                  </div>
                </div>
                <p className="text-zinc-700 font-terminal text-xs mt-1 line-clamp-2">{month.note.split('.')[0]}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Best buy months */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
        <div className="border border-green-800 p-4">
          <h3 className="text-green-400 font-terminal text-base uppercase mb-3">🛒 Best Buy Months</h3>
          <div className="space-y-1">
            {GENERAL_CALENDAR.map((m, i) => ({ ...m, month: i }))
              .filter(m => m.buy === "strong" || m.buy === "good")
              .map(m => (
                <div key={m.month} className="flex items-center gap-3">
                  <span className={`font-terminal text-sm w-8 ${m.month === currentMonth ? "text-yellow-400" : "text-zinc-300"}`}>{MONTHS[m.month]}</span>
                  <span className={`font-terminal text-xs px-2 py-0.5 border ${SIGNAL_COLORS[m.buy].text} ${SIGNAL_COLORS[m.buy].border}`}>
                    {SIGNAL_COLORS[m.buy].label}
                  </span>
                </div>
              ))}
          </div>
        </div>
        <div className="border border-orange-900 p-4">
          <h3 className="text-orange-400 font-terminal text-base uppercase mb-3">💰 Best Sell Months</h3>
          <div className="space-y-1">
            {GENERAL_CALENDAR.map((m, i) => ({ ...m, month: i }))
              .filter(m => m.sell === "strong" || m.sell === "good")
              .map(m => (
                <div key={m.month} className="flex items-center gap-3">
                  <span className={`font-terminal text-sm w-8 ${m.month === currentMonth ? "text-yellow-400" : "text-zinc-300"}`}>{MONTHS[m.month]}</span>
                  <span className={`font-terminal text-xs px-2 py-0.5 border ${SIGNAL_COLORS[m.sell].text} ${SIGNAL_COLORS[m.sell].border}`}>
                    {SIGNAL_COLORS[m.sell].label}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Platform-specific patterns */}
      <div>
        <h3 className="text-zinc-400 font-terminal text-lg uppercase mb-4">Platform-Specific Patterns</h3>
        <div className="space-y-3">
          {PLATFORM_PATTERNS.map(p => (
            <div key={p.platform} className="border border-zinc-800 p-4 hover:border-zinc-600 transition-colors">
              <div className="font-terminal text-base text-green-400 mb-1">{p.platform}</div>
              <p className="text-zinc-400 font-terminal text-sm mb-1">{p.pattern}</p>
              <p className="text-zinc-600 font-terminal text-xs">💡 {p.tip}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-zinc-700 font-terminal text-xs mt-6">
        Seasonal patterns are based on historical community observations and general retail patterns. Individual markets vary. Always verify with current PriceCharting data.
      </p>
    </div>
  );
}
