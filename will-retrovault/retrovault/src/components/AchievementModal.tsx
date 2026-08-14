"use client";

import { RARITIES, type Achievement, type AchievementContext, CATEGORY_LABELS } from "@/data/achievements";

type Props = {
  achievement: Achievement;
  unlocked: boolean;
  unlockedAt?: string; // ISO date if we track it (future feature)
  context?: AchievementContext;
  critics?: { id: string; name: string }[];
  criticUnlocks?: Record<string, string[]>; // personId -> achievementIds (future)
  onClose: () => void;
};

// Category-specific tips for how to unlock each category
const UNLOCK_TIPS: Record<string, string> = {
  collection: "Keep adding games to your vault. Achievements unlock automatically as your collection grows.",
  business:   "Log your sales and purchases in the P&L Ledger. Use the Flip Calculator to find profitable deals.",
  hunting:    "Tag your acquisition sources when logging games. Attend events and use the Convention Tracker.",
  platform:   "Deepen your collection on a single platform. Specialist collectors unlock these faster.",
  social:     "Add players in the Vault, tag games, and send @mentions. Social achievements unlock through engagement.",
  personal:   "Use the Play Log to track what you're playing and mark games as beaten.",
  grind:      "Run the price scraper regularly. These unlock over time as price history data accumulates.",
  secret:     "Keep playing. Secret achievements unlock through specific behaviors — some are obvious once found.",
  milestone:  "Use RetroVault regularly. These unlock as you interact with different features.",
};

// Map achievement IDs to context values for progress display
function getProgress(achievement: Achievement, ctx?: AchievementContext): { current: number; target: number; label: string } | null {
  if (!ctx) return null;
  const id = achievement.id;

  const progressMap: Record<string, { current: number; target: number; label: string }> = {
    "c_10":    { current: ctx.totalOwned,   target: 10,    label: "games owned" },
    "c_25":    { current: ctx.totalOwned,   target: 25,    label: "games owned" },
    "c_50":    { current: ctx.totalOwned,   target: 50,    label: "games owned" },
    "c_100":   { current: ctx.totalOwned,   target: 100,   label: "games owned" },
    "c_250":   { current: ctx.totalOwned,   target: 250,   label: "games owned" },
    "c_500":   { current: ctx.totalOwned,   target: 500,   label: "games owned" },
    "c_1000":  { current: ctx.totalOwned,   target: 1000,  label: "games owned" },
    "c_2500":  { current: ctx.totalOwned,   target: 2500,  label: "games owned" },
    "c_5000":  { current: ctx.totalOwned,   target: 5000,  label: "games owned" },
    "p_2plat": { current: ctx.totalPlatforms, target: 2,   label: "platforms" },
    "p_5plat": { current: ctx.totalPlatforms, target: 5,   label: "platforms" },
    "p_10plat":{ current: ctx.totalPlatforms, target: 10,  label: "platforms" },
    "p_all":   { current: ctx.totalPlatforms, target: 14,  label: "platforms" },
    "p_nes25": { current: ctx.nesOwned,     target: 25,    label: "NES games" },
    "p_nes100":{ current: ctx.nesOwned,     target: 100,   label: "NES games" },
    "p_snes25":{ current: ctx.snesOwned,    target: 25,    label: "SNES games" },
    "p_snes100":{ current: ctx.snesOwned,   target: 100,   label: "SNES games" },
    "p_gen25": { current: ctx.genesisOwned, target: 25,    label: "Genesis games" },
    "p_dc10":  { current: ctx.dreamcastOwned, target: 10,  label: "Dreamcast games" },
    "p_n6425": { current: ctx.n64Owned,     target: 25,    label: "N64 games" },
    "p_ps125": { current: ctx.ps1Owned,     target: 25,    label: "PS1 games" },
    "p_ps2100":{ current: ctx.ps2Owned,     target: 100,   label: "PS2 games" },
    "p_gc25":  { current: ctx.gamecubeOwned, target: 25,   label: "Gamecube games" },
    "p_segacd":{ current: ctx.segaCdOwned,  target: 10,    label: "Sega CD games" },
    "b_10sales":{ current: ctx.totalSales,  target: 10,    label: "sales" },
    "b_50sales":{ current: ctx.totalSales,  target: 50,    label: "sales" },
    "b_100sales":{ current: ctx.totalSales, target: 100,   label: "sales" },
    "b_profit500": { current: Math.max(0, ctx.totalProfit), target: 500,  label: "profit ($)" },
    "b_profit1k":  { current: Math.max(0, ctx.totalProfit), target: 1000, label: "profit ($)" },
    "b_profit5k":  { current: Math.max(0, ctx.totalProfit), target: 5000, label: "profit ($)" },
    "b_profit10k": { current: Math.max(0, ctx.totalProfit), target: 10000, label: "profit ($)" },
    "b_revenue1k": { current: ctx.totalRevenue, target: 1000,  label: "revenue ($)" },
    "b_revenue10k":{ current: ctx.totalRevenue, target: 10000, label: "revenue ($)" },
    "pl_10":   { current: ctx.playlogCount,  target: 10,   label: "games logged" },
    "pl_50":   { current: ctx.playlogCount,  target: 50,   label: "games logged" },
    "pl_beat10":{ current: ctx.gamesBeaten, target: 10,    label: "games beaten" },
    "pl_beat50":{ current: ctx.gamesBeaten, target: 50,    label: "games beaten" },
    "pl_beat100":{ current: ctx.gamesBeaten, target: 100,  label: "games beaten" },
    "s_5critics":{ current: ctx.criticCount, target: 5,    label: "players added" },
    "s_10critics":{ current: ctx.criticCount, target: 10,  label: "players added" },
    "s_tags25":{ current: ctx.totalTags,    target: 25,    label: "tags added" },
    "s_tags100":{ current: ctx.totalTags,   target: 100,   label: "tags added" },
    "d_history30": { current: ctx.priceHistoryDays, target: 30,  label: "days of price history" },
    "d_history90": { current: ctx.priceHistoryDays, target: 90,  label: "days of price history" },
    "d_history365":{ current: ctx.priceHistoryDays, target: 365, label: "days of price history" },
    "sys_uptime7":  { current: ctx.uptimeDays || 0,       target: 7,   label: "days running" },
    "sys_uptime30": { current: ctx.uptimeDays || 0,       target: 30,  label: "days running" },
    "sys_uptime90": { current: ctx.uptimeDays || 0,       target: 90,  label: "days running" },
    "sys_uptime365":{ current: ctx.uptimeDays || 0,       target: 365, label: "days running" },
    "sys_snapshot7":{ current: ctx.valueHistoryDays || 0, target: 7,   label: "days of history" },
    "sys_api_3":    { current: ctx.apiKeysCreated || 0,   target: 3,   label: "API keys" },
    "sys_bug3":     { current: ctx.bugReportsFiled || 0,  target: 3,   label: "bug reports" },
    "sys_scraper5": { current: ctx.scraperRuns || 0,      target: 5,   label: "scraper runs" },
    "sys_scraper20":{ current: ctx.scraperRuns || 0,      target: 20,  label: "scraper runs" },
    "g_5found":{ current: ctx.grailsFound,  target: 5,     label: "grails found" },
    "g_10found":{ current: ctx.grailsFound, target: 10,    label: "grails found" },
    "h_source3":{ current: ctx.sourceCount, target: 3,     label: "sources used" },
    "h_source6":{ current: ctx.sourceCount, target: 6,     label: "sources used" },
    "h_events5":{ current: ctx.eventsAttending, target: 5, label: "events attended" },
    "h_whatnot5":{ current: ctx.whatnotSellers, target: 5, label: "sellers followed" },
    "b_spent1k":{ current: ctx.totalSpent,  target: 1000,  label: "spent ($)" },
    "b_spent5k":{ current: ctx.totalSpent,  target: 5000,  label: "spent ($)" },
    "b_watchlist10":{ current: ctx.watchlistCount, target: 10, label: "watchlist items" },
  };

  return progressMap[id] || null;
}

export function AchievementModal({ achievement, unlocked, unlockedAt, context, onClose }: Props) {
  const cfg = RARITIES[achievement.rarity];
  const catCfg = CATEGORY_LABELS[achievement.category];
  const progress = getProgress(achievement, context);
  const tip = UNLOCK_TIPS[achievement.category];
  const isSecret = achievement.secret && !unlocked;

  const progressPct = progress ? Math.min((progress.current / progress.target) * 100, 100) : null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4 backdrop-blur-sm" onClick={onClose}>
      <div className={`bg-zinc-950 border-4 ${cfg.border} w-full max-w-lg rounded-sm shadow-lg`}
        style={{ boxShadow: `0 0 30px ${achievement.rarity === 'legendary' ? 'rgba(234,179,8,0.3)' : achievement.rarity === 'epic' ? 'rgba(168,85,247,0.3)' : achievement.rarity === 'rare' ? 'rgba(59,130,246,0.3)' : ''}` }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className={`p-5 border-b-2 ${cfg.border} ${cfg.bg} flex items-start gap-4`}>
          <div className={`text-5xl ${!unlocked ? 'grayscale opacity-40' : ''}`}>{achievement.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <span className={`font-terminal text-xl ${cfg.color}`}>{achievement.name}</span>
              {unlocked && <span className="text-emerald-400 font-terminal text-sm">✓ UNLOCKED</span>}
              {!unlocked && <span className="text-zinc-600 font-terminal text-sm">🔒 LOCKED</span>}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`font-terminal text-xs px-2 py-0.5 border ${cfg.color} ${cfg.border}`}>
                {cfg.label}
              </span>
              <span className="text-zinc-500 font-terminal text-xs">{catCfg.icon} {catCfg.label}</span>
              <span className={`font-terminal text-sm font-bold ${cfg.color}`}>+{achievement.points} pts</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">

          {/* Description / condition */}
          <div>
            <p className="text-zinc-400 font-terminal text-xs uppercase mb-1">How to unlock</p>
            <p className="text-zinc-200 font-terminal text-base">
              {isSecret ? "This is a secret achievement. Keep exploring to discover it." : achievement.condition}
            </p>
          </div>

          {/* Progress bar */}
          {progress && !unlocked && (
            <div>
              <div className="flex justify-between text-zinc-500 font-terminal text-xs mb-1">
                <span>Progress</span>
                <span>{progress.current.toLocaleString()} / {progress.target.toLocaleString()} {progress.label}</span>
              </div>
              <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500 ${cfg.bg.replace('bg-', 'bg-').replace('/20', '')}`}
                  style={{ width: `${progressPct}%`, backgroundColor: 'var(--p)' }} />
              </div>
              <div className="text-right text-zinc-600 font-terminal text-xs mt-0.5">{progressPct?.toFixed(0)}%</div>
            </div>
          )}

          {/* Unlock date */}
          {unlocked && unlockedAt && (
            <div className="border border-emerald-800 bg-emerald-950/20 p-3">
              <p className="text-zinc-500 font-terminal text-xs uppercase mb-1">Unlocked</p>
              <p className="text-emerald-300 font-terminal text-base">{new Date(unlockedAt).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
          )}

          {/* Tip for locked achievements */}
          {!unlocked && !isSecret && tip && (
            <div className="border border-zinc-800 bg-zinc-900/30 p-3">
              <p className="text-zinc-500 font-terminal text-xs uppercase mb-1">💡 Tip</p>
              <p className="text-zinc-400 font-terminal text-sm">{tip}</p>
            </div>
          )}

          {/* Context data (current relevant stats) */}
          {context && progress && (
            <div className="border border-zinc-800 p-3">
              <p className="text-zinc-500 font-terminal text-xs uppercase mb-2">Your current stats</p>
              <div className="flex justify-between font-terminal text-sm">
                <span className="text-zinc-400">{progress.label}</span>
                <span className={`font-bold ${unlocked ? 'text-emerald-400' : 'text-zinc-300'}`}>{progress.current.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Point value context */}
          <div className="border border-zinc-800 p-3">
            <p className="text-zinc-500 font-terminal text-xs uppercase mb-2">Rarity breakdown</p>
            <div className="grid grid-cols-2 gap-2 font-terminal text-xs">
              {Object.entries(RARITIES).map(([r, rcfg]) => (
                <div key={r} className="flex justify-between">
                  <span className={rcfg.color}>{rcfg.label}</span>
                  <span className="text-zinc-600">+{rcfg.points}pts</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex justify-end">
          <button onClick={onClose}
            className="px-6 py-2 font-terminal text-base text-zinc-400 border border-zinc-700 hover:border-zinc-400 hover:text-white transition-colors">
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
