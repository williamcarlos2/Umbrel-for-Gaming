/**
 * Achievement System — RetroVault
 *
 * 130+ achievements across 10 categories, 5 rarity tiers.
 *
 * Architecture:
 * - ACHIEVEMENTS array: static definitions with a check() predicate
 * - AchievementContext: snapshot of collection state passed to check()
 * - evaluateAchievements(ctx): returns Set<string> of auto-unlocked IDs
 * - Manual unlocks (secret achievements, action-triggered): persisted by
 *   /api/achievements into env-local runtime state (`achievements-unlocked.json`)
 *   and merged with auto-evaluated achievements in the API payload
 *
 * Adding an achievement:
 * 1. Add an entry to ACHIEVEMENTS with a unique id, category, rarity, and check()
 * 2. If it requires new context data, add the field to AchievementContext
 *    and populate it in the achievement context builder
 * 3. For manual unlocks (check: () => false), trigger from the relevant UI
 *    component via POST /api/achievements with action: "unlock_manual"
 *
 * Rarity points: Common=10, Uncommon=25, Rare=50, Epic=100, Legendary=250
 */
export type AchievementRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";
export type AchievementCategory =
  | "collection" | "business" | "hunting" | "platform" | "social"
  | "personal" | "grind" | "secret" | "milestone";

export type Achievement = {
  id: string;
  name: string;
  description?: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  points: number;
  // Evaluation function signature (evaluated at runtime)
  check: (ctx: AchievementContext) => boolean;
  // Human-readable condition
  condition: string;
  secret?: boolean; // Hidden until unlocked
};

export type AchievementContext = {
  // Collection
  totalOwned: number;
  totalPlatforms: number;
  totalCatalog: number;
  platformCounts: Record<string, number>;
  // Financial
  totalSpent: number;
  totalRevenue: number;
  totalSales: number;
  totalProfit: number;
  bestFlipRoi: number; // highest single-sale ROI %
  // Market
  hasMarketData: boolean;
  priceHistoryDays: number;
  watchlistCount: number;
  grailCount: number;
  grailsFound: number;
  // Play
  playlogCount: number;
  gamesBeaten: number;
  gamesGivenUp: number;
  currentlyPlaying: number;
  backlogCount: number;
  ratingsFive: number; // 5-star ratings given
  ratingsOne: number;  // 1-star ratings given
  // Social
  criticCount: number;
  totalFavorites: number;
  totalRegrets: number;
  totalTags: number;
  totalMentions: number;
  // Events / Hunting
  eventsAttending: number;
  conventionSessions: number;
  conventionSpent: number;
  // Sourcing
  sources: string[];
  sourceCount: number;
  // Platform-specific counts
  nesOwned: number;
  snesOwned: number;
  n64Owned: number;
  genesisOwned: number;
  dreamcastOwned: number;
  ps1Owned: number;
  ps2Owned: number;
  gamecubeOwned: number;
  xboxOwned: number;
  switchOwned: number;
  pspOwned: number;
  ps3Owned: number;
  xbox360Owned: number;
  segaCdOwned: number;
  // App usage
  scraperRuns: number;
  dealsDismissed: number;
  whatnotSellers: number;
  streamsWatched: number;
  // System / power user
  apiKeysCreated: number;
  bugReportsFiled: number;
  collectionExported: boolean;
  csvImported: boolean;
  valueHistoryDays: number; // days of snapshot data
  uptimeDays: number;       // computed from value-history as proxy for system uptime
  // Setup wizard
  setupWizardMode: "collector" | "dealer" | "empire" | null;
  setupWizardDone: boolean;
  authConfigured: boolean;
  themeCustomized: boolean;
  // Wishlist
  wishlistCount: number;
  wishlistFound: number;
  wishlistShared: boolean;
  wishlistMustHaveCount: number;
};

const RARITIES: Record<AchievementRarity, { color: string; bg: string; border: string; label: string; points: number }> = {
  common:    { color: "text-zinc-300",   bg: "bg-zinc-800",    border: "border-zinc-600",   label: "Common",    points: 10  },
  uncommon:  { color: "text-green-400",  bg: "bg-green-950",   border: "border-green-700",  label: "Uncommon",  points: 25  },
  rare:      { color: "text-blue-400",   bg: "bg-blue-950",    border: "border-blue-700",   label: "Rare",      points: 50  },
  epic:      { color: "text-purple-400", bg: "bg-purple-950",  border: "border-purple-700", label: "Epic",      points: 100 },
  legendary: { color: "text-yellow-400", bg: "bg-yellow-950",  border: "border-yellow-700", label: "Legendary", points: 250 },
};

export { RARITIES };

export const ACHIEVEMENTS: Achievement[] = [
  // ─── COLLECTION SIZE ───────────────────────────────────────────────────────
  { id: "c_first",      name: "First Cartridge",      icon: "🌱", category: "milestone",   rarity: "common",    points: 10,  condition: "Add your first game",               check: c => c.totalOwned >= 1 },
  { id: "c_10",         name: "Getting Serious",       icon: "📦", category: "milestone",   rarity: "common",    points: 10,  condition: "Own 10 games",                      check: c => c.totalOwned >= 10 },
  { id: "c_25",         name: "Quarter Century",       icon: "🎮", category: "milestone",   rarity: "common",    points: 10,  condition: "Own 25 games",                      check: c => c.totalOwned >= 25 },
  { id: "c_50",         name: "Collector",             icon: "📚", category: "milestone",   rarity: "uncommon",  points: 25,  condition: "Own 50 games",                      check: c => c.totalOwned >= 50 },
  { id: "c_100",        name: "Century Club",          icon: "💯", category: "milestone",   rarity: "uncommon",  points: 25,  condition: "Own 100 games",                     check: c => c.totalOwned >= 100 },
  { id: "c_250",        name: "The Stash",             icon: "🏗️", category: "milestone",   rarity: "rare",      points: 50,  condition: "Own 250 games",                     check: c => c.totalOwned >= 250 },
  { id: "c_500",        name: "The Library",           icon: "🏛️", category: "milestone",   rarity: "rare",      points: 50,  condition: "Own 500 games",                     check: c => c.totalOwned >= 500 },
  { id: "c_1000",       name: "Legend",                icon: "👑", category: "milestone",   rarity: "epic",      points: 100, condition: "Own 1,000 games",                   check: c => c.totalOwned >= 1000 },
  { id: "c_2500",       name: "The Archive",           icon: "🗄️", category: "milestone",   rarity: "legendary", points: 250, condition: "Own 2,500 games",                   check: c => c.totalOwned >= 2500 },
  { id: "c_5000",       name: "The Museum",            icon: "🏛️", category: "milestone",   rarity: "legendary", points: 250, condition: "Own 5,000 games",                   check: c => c.totalOwned >= 5000 },

  // ─── PLATFORMS ──────────────────────────────────────────────────────────────
  { id: "p_2plat",      name: "Multi-System",          icon: "🕹️", category: "platform",    rarity: "common",    points: 10,  condition: "Own games on 2 platforms",          check: c => c.totalPlatforms >= 2 },
  { id: "p_5plat",      name: "Platform Agnostic",     icon: "🌐", category: "platform",    rarity: "uncommon",  points: 25,  condition: "Own games on 5 platforms",          check: c => c.totalPlatforms >= 5 },
  { id: "p_10plat",     name: "Era Hopper",            icon: "⏰", category: "platform",    rarity: "rare",      points: 50,  condition: "Own games on 10 platforms",         check: c => c.totalPlatforms >= 10 },
  { id: "p_all",        name: "The Completionist",     icon: "🗺️", category: "platform",    rarity: "legendary", points: 250, condition: "Own games on all 14 platforms",     check: c => c.totalPlatforms >= 14 },
  { id: "p_nes25",      name: "NES Enthusiast",        icon: "🔴", category: "platform",    rarity: "uncommon",  points: 25,  condition: "Own 25 NES games",                  check: c => c.nesOwned >= 25 },
  { id: "p_nes100",     name: "NES Expert",            icon: "🔴", category: "platform",    rarity: "rare",      points: 50,  condition: "Own 100 NES games",                 check: c => c.nesOwned >= 100 },
  { id: "p_snes25",     name: "SNES Enthusiast",       icon: "🟣", category: "platform",    rarity: "uncommon",  points: 25,  condition: "Own 25 SNES games",                 check: c => c.snesOwned >= 25 },
  { id: "p_snes100",    name: "SNES Expert",           icon: "🟣", category: "platform",    rarity: "rare",      points: 50,  condition: "Own 100 SNES games",                check: c => c.snesOwned >= 100 },
  { id: "p_gen25",      name: "Genesis Collector",     icon: "🔷", category: "platform",    rarity: "uncommon",  points: 25,  condition: "Own 25 Sega Genesis games",         check: c => c.genesisOwned >= 25 },
  { id: "p_dc10",       name: "Dreamcast Devotee",     icon: "🌀", category: "platform",    rarity: "rare",      points: 50,  condition: "Own 10 Dreamcast games",            check: c => c.dreamcastOwned >= 10 },
  { id: "p_n6425",      name: "64-Bit Aficionado",     icon: "🔵", category: "platform",    rarity: "uncommon",  points: 25,  condition: "Own 25 N64 games",                  check: c => c.n64Owned >= 25 },
  { id: "p_ps125",      name: "PlayStation Pioneer",   icon: "⬜", category: "platform",    rarity: "uncommon",  points: 25,  condition: "Own 25 PS1 games",                  check: c => c.ps1Owned >= 25 },
  { id: "p_ps2100",     name: "PS2 Century",           icon: "🟦", category: "platform",    rarity: "rare",      points: 50,  condition: "Own 100 PS2 games",                 check: c => c.ps2Owned >= 100 },
  { id: "p_gc25",       name: "Cube Club",             icon: "🟤", category: "platform",    rarity: "uncommon",  points: 25,  condition: "Own 25 Gamecube games",             check: c => c.gamecubeOwned >= 25 },
  { id: "p_segacd",     name: "FMV Fan",               icon: "💿", category: "platform",    rarity: "rare",      points: 50,  condition: "Own 10 Sega CD games",              check: c => c.segaCdOwned >= 10 },

  // ─── BUSINESS / FINANCIAL ────────────────────────────────────────────────────
  { id: "b_first_sale", name: "First Deal",            icon: "🤝", category: "business",    rarity: "common",    points: 10,  condition: "Complete your first sale",          check: c => c.totalSales >= 1 },
  { id: "b_10sales",    name: "Active Flipper",        icon: "💹", category: "business",    rarity: "uncommon",  points: 25,  condition: "Complete 10 sales",                 check: c => c.totalSales >= 10 },
  { id: "b_50sales",    name: "Volume Dealer",         icon: "📈", category: "business",    rarity: "rare",      points: 50,  condition: "Complete 50 sales",                 check: c => c.totalSales >= 50 },
  { id: "b_100sales",   name: "The Empire Begins",     icon: "🏢", category: "business",    rarity: "epic",      points: 100, condition: "Complete 100 sales",                check: c => c.totalSales >= 100 },
  { id: "b_profit500",  name: "Half Grand Hustle",     icon: "💵", category: "business",    rarity: "uncommon",  points: 25,  condition: "$500 in total profit",              check: c => c.totalProfit >= 500 },
  { id: "b_profit1k",   name: "Four Figures",          icon: "💴", category: "business",    rarity: "rare",      points: 50,  condition: "$1,000 in total profit",            check: c => c.totalProfit >= 1000 },
  { id: "b_profit5k",   name: "Serious Money",         icon: "💶", category: "business",    rarity: "epic",      points: 100, condition: "$5,000 in total profit",            check: c => c.totalProfit >= 5000 },
  { id: "b_profit10k",  name: "The Business",          icon: "💰", category: "business",    rarity: "legendary", points: 250, condition: "$10,000 in total profit",           check: c => c.totalProfit >= 10000 },
  { id: "b_revenue1k",  name: "Grand Total",           icon: "🎰", category: "business",    rarity: "uncommon",  points: 25,  condition: "$1,000 in total sales revenue",     check: c => c.totalRevenue >= 1000 },
  { id: "b_revenue10k", name: "Five-Figure Flipper",   icon: "🏆", category: "business",    rarity: "epic",      points: 100, condition: "$10,000 in total sales revenue",    check: c => c.totalRevenue >= 10000 },
  { id: "b_roi100",     name: "Double Up",             icon: "✌️", category: "business",    rarity: "uncommon",  points: 25,  condition: "100% ROI on a single sale",         check: c => c.bestFlipRoi >= 100 },
  { id: "b_roi500",     name: "Found Money",           icon: "🤑", category: "business",    rarity: "rare",      points: 50,  condition: "500% ROI on a single sale",         check: c => c.bestFlipRoi >= 500 },
  { id: "b_roi1000",    name: "Dumpster Treasure",     icon: "🗑️", category: "business",    rarity: "legendary", points: 250, condition: "1000% ROI on a single sale",        check: c => c.bestFlipRoi >= 1000 },
  { id: "b_spent1k",    name: "Invested",              icon: "💸", category: "business",    rarity: "uncommon",  points: 25,  condition: "Spend $1,000 on your collection",   check: c => c.totalSpent >= 1000 },
  { id: "b_spent5k",    name: "High Roller",           icon: "🎲", category: "business",    rarity: "rare",      points: 50,  condition: "Spend $5,000 on your collection",   check: c => c.totalSpent >= 5000 },
  { id: "b_watchlist10",name: "On The Radar",          icon: "🎯", category: "business",    rarity: "common",    points: 10,  condition: "Add 10 items to Target Radar",      check: c => c.watchlistCount >= 10 },

  // ─── HUNTING & SOURCING ──────────────────────────────────────────────────────
  { id: "h_source3",    name: "Multi-Channel Hunter", icon: "🗺️", category: "hunting",    rarity: "uncommon",  points: 25,  condition: "Buy from 3 different sources",      check: c => c.sourceCount >= 3 },
  { id: "h_source6",    name: "Everywhere at Once",   icon: "🌐", category: "hunting",    rarity: "rare",      points: 50,  condition: "Buy from 6 different sources",      check: c => c.sourceCount >= 6 },
  { id: "h_garage",     name: "Early Bird",           icon: "🏠", category: "hunting",    rarity: "common",    points: 10,  condition: "Buy a game from a garage sale",     check: c => c.sources.includes("Garage Sale") },
  { id: "h_thrift",     name: "Thrift Diver",         icon: "🏪", category: "hunting",    rarity: "common",    points: 10,  condition: "Buy a game from a thrift store",    check: c => c.sources.includes("Thrift Store") },
  { id: "h_convention", name: "Show Shopper",         icon: "🎪", category: "hunting",    rarity: "uncommon",  points: 25,  condition: "Buy a game at a gaming convention", check: c => c.sources.includes("Convention") },
  { id: "h_lot",        name: "Lot Gambler",          icon: "🎲", category: "hunting",    rarity: "uncommon",  points: 25,  condition: "Buy a game as part of a lot purchase", check: c => c.sources.includes("Lot Purchase") },
  { id: "h_trade",      name: "Trader",               icon: "🔄", category: "hunting",    rarity: "uncommon",  points: 25,  condition: "Acquire a game through a trade",    check: c => c.sources.includes("Trade") },
  { id: "h_whatnot",    name: "Live Auction",         icon: "📺", category: "hunting",    rarity: "uncommon",  points: 25,  condition: "Buy a game on Whatnot",             check: c => c.sources.includes("Whatnot") },
  { id: "h_convention5",name: "Convention Regular",  icon: "🎪", category: "hunting",    rarity: "rare",      points: 50,  condition: "Attend 5 gaming conventions",        check: c => c.conventionSessions >= 5 },
  { id: "h_conv500",    name: "Convention Spender",  icon: "💰", category: "hunting",    rarity: "rare",      points: 50,  condition: "Spend $500 at conventions total",    check: c => c.conventionSpent >= 500 },
  { id: "h_events5",    name: "Event Goer",          icon: "📅", category: "hunting",    rarity: "uncommon",  points: 25,  condition: "Mark 5 events as attending",         check: c => c.eventsAttending >= 5 },
  { id: "h_scraper",    name: "Automated",           icon: "⚙️", category: "hunting",    rarity: "common",    points: 10,  condition: "Run a scraper at least once",        check: c => c.scraperRuns >= 1 },
  { id: "h_deals",      name: "Deal Dismisser",      icon: "🧹", category: "hunting",    rarity: "common",    points: 10,  condition: "Dismiss 10 local deals",             check: c => c.dealsDismissed >= 10 },
  { id: "h_whatnot5",   name: "Seller Follower",     icon: "📺", category: "hunting",    rarity: "uncommon",  points: 25,  condition: "Follow 5 Whatnot sellers",           check: c => c.whatnotSellers >= 5 },

  // ─── GRAILS ──────────────────────────────────────────────────────────────────
  { id: "g_first_grail",name: "The Holy Quest Begins",icon: "🏴‍☠️",category: "hunting",    rarity: "common",    points: 10,  condition: "Add your first grail",              check: c => c.grailCount >= 1 },
  { id: "g_5grails",    name: "Wish List",           icon: "📋", category: "hunting",    rarity: "common",    points: 10,  condition: "Add 5 grails",                      check: c => c.grailCount >= 5 },
  { id: "g_first_found",name: "Grail Found!",        icon: "🎉", category: "hunting",    rarity: "rare",      points: 50,  condition: "Mark your first grail as found",     check: c => c.grailsFound >= 1 },
  { id: "g_5found",     name: "Grail Hunter",        icon: "⚔️", category: "hunting",    rarity: "epic",      points: 100, condition: "Find 5 grail items",                check: c => c.grailsFound >= 5 },
  { id: "g_10found",    name: "The Legend",          icon: "🏆", category: "hunting",    rarity: "legendary", points: 250, condition: "Find 10 grail items",               check: c => c.grailsFound >= 10 },

  // ─── PLAY LOG ────────────────────────────────────────────────────────────────
  { id: "pl_first",     name: "Press Start",         icon: "▶️", category: "personal",   rarity: "common",    points: 10,  condition: "Log your first game",               check: c => c.playlogCount >= 1 },
  { id: "pl_10",        name: "Retro Gamer",         icon: "🎮", category: "personal",   rarity: "common",    points: 10,  condition: "Log 10 games played",               check: c => c.playlogCount >= 10 },
  { id: "pl_50",        name: "Dedicated Player",    icon: "🕹️", category: "personal",   rarity: "uncommon",  points: 25,  condition: "Log 50 games played",               check: c => c.playlogCount >= 50 },
  { id: "pl_beat1",     name: "Champion",            icon: "🏆", category: "personal",   rarity: "common",    points: 10,  condition: "Beat your first game",              check: c => c.gamesBeaten >= 1 },
  { id: "pl_beat10",    name: "Serial Finisher",     icon: "✅", category: "personal",   rarity: "uncommon",  points: 25,  condition: "Beat 10 games",                     check: c => c.gamesBeaten >= 10 },
  { id: "pl_beat50",    name: "The Completionist",   icon: "💎", category: "personal",   rarity: "rare",      points: 50,  condition: "Beat 50 games",                     check: c => c.gamesBeaten >= 50 },
  { id: "pl_beat100",   name: "Hall of Fame",        icon: "🎖️", category: "personal",   rarity: "epic",      points: 100, condition: "Beat 100 games",                    check: c => c.gamesBeaten >= 100 },
  { id: "pl_giveup",    name: "Honest Critic",       icon: "🙅", category: "personal",   rarity: "common",    points: 10,  condition: "Give up on a game",                 check: c => c.gamesGivenUp >= 1 },
  { id: "pl_giveup5",   name: "Life's Too Short",    icon: "⏩", category: "personal",   rarity: "uncommon",  points: 25,  condition: "Give up on 5 games",                check: c => c.gamesGivenUp >= 5 },
  { id: "pl_playing5",  name: "Multitasker",         icon: "🔀", category: "personal",   rarity: "uncommon",  points: 25,  condition: "Play 5 games simultaneously",       check: c => c.currentlyPlaying >= 5 },
  { id: "pl_backlog25", name: "Backlog King",        icon: "📚", category: "personal",   rarity: "rare",      points: 50,  condition: "Add 25 games to backlog",           check: c => c.backlogCount >= 25 },
  { id: "pl_5star5",    name: "Five Star Critic",    icon: "⭐", category: "personal",   rarity: "uncommon",  points: 25,  condition: "Give 5-star rating to 5 games",    check: c => c.ratingsFive >= 5 },
  { id: "pl_1star",     name: "Harsh Critic",        icon: "💀", category: "personal",   rarity: "uncommon",  points: 25,  condition: "Give a 1-star rating",              check: c => c.ratingsOne >= 1 },
  { id: "pl_all_status",name: "Status Updater",      icon: "📊", category: "personal",   rarity: "rare",      points: 50,  condition: "Have games in all 5 play statuses", check: c => c.gamesBeaten > 0 && c.gamesGivenUp > 0 && c.currentlyPlaying > 0 && c.backlogCount > 0 },

  // ─── SOCIAL / PLAYERS ────────────────────────────────────────────────────────
  { id: "s_first_critic",name: "The Jury",           icon: "🧑‍⚖️",category: "social",     rarity: "common",    points: 10,  condition: "Add your first player",             check: c => c.criticCount >= 1 },
  { id: "s_5critics",   name: "The Panel",           icon: "👥", category: "social",     rarity: "uncommon",  points: 25,  condition: "Add 5 players",                     check: c => c.criticCount >= 5 },
  { id: "s_10critics",  name: "The Academy",         icon: "🎬", category: "social",     rarity: "rare",      points: 50,  condition: "Add 10 players",                    check: c => c.criticCount >= 10 },
  { id: "s_fav10",      name: "Fan Club",            icon: "⭐", category: "social",     rarity: "common",    points: 10,  condition: "Players favorite 10 games",         check: c => c.totalFavorites >= 10 },
  { id: "s_fav50",      name: "Beloved Collection",  icon: "❤️", category: "social",     rarity: "uncommon",  points: 25,  condition: "Players favorite 50 games",         check: c => c.totalFavorites >= 50 },
  { id: "s_regret10",   name: "The Jury Has Spoken", icon: "👎", category: "social",     rarity: "uncommon",  points: 25,  condition: "Players regret 10 games",           check: c => c.totalRegrets >= 10 },
  { id: "s_tags25",     name: "Metadata Nerd",       icon: "🏷️", category: "social",     rarity: "uncommon",  points: 25,  condition: "Add 25 tags across your library",   check: c => c.totalTags >= 25 },
  { id: "s_tags100",    name: "Catalogued",          icon: "📚", category: "social",     rarity: "rare",      points: 50,  condition: "Add 100 tags across your library",  check: c => c.totalTags >= 100 },
  { id: "s_mention10",  name: "The Messenger",       icon: "💬", category: "social",     rarity: "uncommon",  points: 25,  condition: "Send 10 @ mentions",                check: c => c.totalMentions >= 10 },

  // ─── DATA & GRIND ────────────────────────────────────────────────────────────
  { id: "d_prices100",  name: "Price Watcher",       icon: "👁️", category: "grind",      rarity: "uncommon",  points: 25,  condition: "Have price data for 100+ games",    check: c => c.hasMarketData },
  { id: "d_history30",  name: "30-Day Streak",       icon: "📅", category: "grind",      rarity: "rare",      points: 50,  condition: "30+ days of price history",         check: c => c.priceHistoryDays >= 30 },
  { id: "d_history90",  name: "Quarter Watcher",     icon: "📆", category: "grind",      rarity: "epic",      points: 100, condition: "90+ days of price history",         check: c => c.priceHistoryDays >= 90 },
  { id: "d_history365", name: "Year in Review",      icon: "🗓️", category: "grind",      rarity: "legendary", points: 250, condition: "365+ days of price history",        check: c => c.priceHistoryDays >= 365 },

  // ─── SECRET / EASTER EGGS ────────────────────────────────────────────────────
  { id: "x_konami",     name: "↑↑↓↓←→←→BA",        icon: "🎮", category: "secret",     rarity: "rare",      points: 50,  condition: "Secret: discover the Konami code",   check: () => false, secret: true },
  { id: "x_midnight",   name: "Night Owl",           icon: "🦉", category: "secret",     rarity: "uncommon",  points: 25,  condition: "Secret achievement",                 check: () => false, secret: true },
  { id: "x_first_fail", name: "Try Again",           icon: "💀", category: "secret",     rarity: "common",    points: 10,  condition: "Secret achievement",                 check: () => false, secret: true },
  { id: "x_broke",      name: "The Struggle",        icon: "😅", category: "secret",     rarity: "uncommon",  points: 25,  condition: "Secret: spend more than you've made", check: c => c.totalSpent > 0 && c.totalRevenue < c.totalSpent * 0.5, secret: true },
  { id: "x_hoarder",    name: "Can't Stop Won't Stop",icon: "🤯",category: "secret",     rarity: "rare",      points: 50,  condition: "Secret achievement",                  check: c => c.totalOwned >= 500 && c.totalSales < 5, secret: true },
  { id: "x_collector",  name: "Never For Sale",      icon: "🔒", category: "secret",     rarity: "epic",      points: 100, condition: "Secret: 1000 games, 0 sales",        check: c => c.totalOwned >= 1000 && c.totalSales === 0, secret: true },

  // ─── APP MASTERY ─────────────────────────────────────────────────────────────
  // ─── SYSTEM & POWER USER ────────────────────────────────────────────────────
  { id: "sys_uptime7",   name: "Week One",            icon: "⚡", category: "grind",      rarity: "common",    points: 10,  condition: "RetroVault has been running for 7+ days",   check: c => c.uptimeDays >= 7 },
  { id: "sys_uptime30",  name: "Monthly Regular",     icon: "📅", category: "grind",      rarity: "uncommon",  points: 25,  condition: "RetroVault has been running for 30+ days",  check: c => c.uptimeDays >= 30 },
  { id: "sys_uptime90",  name: "Quarterly Veteran",   icon: "🏅", category: "grind",      rarity: "rare",      points: 50,  condition: "RetroVault has been running for 90+ days",  check: c => c.uptimeDays >= 90 },
  { id: "sys_uptime365", name: "One Year Strong",     icon: "🎖️", category: "grind",      rarity: "epic",      points: 100, condition: "RetroVault has been running for a full year", check: c => c.uptimeDays >= 365 },
  { id: "sys_snapshot7", name: "Daily Driver",        icon: "📊", category: "grind",      rarity: "common",    points: 10,  condition: "7+ days of collection value history",       check: c => c.valueHistoryDays >= 7 },
  { id: "sys_api_key",   name: "Developer",           icon: "🔌", category: "milestone",  rarity: "uncommon",  points: 25,  condition: "Create your first API key",                 check: c => c.apiKeysCreated >= 1 },
  { id: "sys_api_3",     name: "Integrator",          icon: "🔗", category: "milestone",  rarity: "rare",      points: 50,  condition: "Create 3 API keys (multiple integrations)", check: c => c.apiKeysCreated >= 3 },
  { id: "sys_export",    name: "Backed Up",           icon: "💾", category: "milestone",  rarity: "uncommon",  points: 25,  condition: "Export your collection",                    check: c => c.collectionExported },
  { id: "sys_import",    name: "Migrator",            icon: "📥", category: "milestone",  rarity: "uncommon",  points: 25,  condition: "Import a CSV collection",                   check: c => c.csvImported },
  { id: "sys_bug",       name: "Bug Hunter",          icon: "🐛", category: "milestone",  rarity: "common",    points: 10,  condition: "File your first bug report",                check: c => c.bugReportsFiled >= 1 },
  { id: "sys_bug3",      name: "QA Tester",           icon: "🔬", category: "milestone",  rarity: "uncommon",  points: 25,  condition: "File 3 bug reports",                        check: c => c.bugReportsFiled >= 3 },
  { id: "sys_scraper5",  name: "Data Hoarder",        icon: "🤖", category: "grind",      rarity: "rare",      points: 50,  condition: "Run scrapers 5+ times",                     check: c => c.scraperRuns >= 5 },
  { id: "sys_scraper20", name: "The Machine",         icon: "⚙️", category: "grind",      rarity: "epic",      points: 100, condition: "Run scrapers 20+ times",                    check: c => c.scraperRuns >= 20 },

  // ─── APP MASTERY (manual unlocks) ────────────────────────────────────────────
  { id: "a_field",      name: "Field Ready",         icon: "🔦", category: "milestone",  rarity: "common",    points: 10,  condition: "Use Field Mode to check a price",    check: () => false }, // triggered manually
  { id: "a_negotiator", name: "The Negotiator",      icon: "🤝", category: "milestone",  rarity: "uncommon",  points: 25,  condition: "Use the Negotiation Helper",         check: () => false }, // triggered manually
  { id: "a_guide",      name: "Student of the Game", icon: "📖", category: "milestone",  rarity: "uncommon",  points: 25,  condition: "Read the Field Guide",               check: () => false }, // triggered manually
  { id: "a_insurance",  name: "Properly Insured",    icon: "📋", category: "milestone",  rarity: "rare",      points: 50,  condition: "Generate an insurance report",       check: () => false }, // triggered manually
  { id: "a_theme",      name: "Customizer",          icon: "🎨", category: "milestone",  rarity: "common",    points: 10,  condition: "Change the app theme",               check: c => c.themeCustomized },
  { id: "a_auth",       name: "Locked Down",         icon: "🔐", category: "milestone",  rarity: "uncommon",  points: 25,  condition: "Enable app authentication",          check: c => c.authConfigured },

  // ─── SETUP WIZARD & IDENTITY ─────────────────────────────────────────────────
  { id: "setup_done",       name: "Choose Your Adventure",  icon: "🗺️",  category: "milestone", rarity: "common",    points: 10,  condition: "Complete the Setup Wizard",                            check: c => c.setupWizardDone },
  { id: "setup_collector",  name: "The Collector",          icon: "🎮",  category: "milestone", rarity: "uncommon",  points: 25,  condition: "Set up RetroVault in Collector mode",                  check: c => c.setupWizardMode === 'collector' },
  { id: "setup_dealer",     name: "The Dealer",             icon: "💰",  category: "milestone", rarity: "uncommon",  points: 25,  condition: "Set up RetroVault in Dealer mode",                     check: c => c.setupWizardMode === 'dealer' },
  { id: "setup_empire",     name: "The Empire Builder",     icon: "🏆",  category: "milestone", rarity: "rare",      points: 50,  condition: "Set up RetroVault in Empire Builder mode",             check: c => c.setupWizardMode === 'empire' },
  { id: "setup_rerun",      name: "Change of Plans",        icon: "🔄",  category: "secret",    rarity: "uncommon",  points: 25,  condition: "Secret: re-run the Setup Wizard and switch modes",     check: () => false, secret: true }, // triggered manually

  // ─── WISHLIST ─────────────────────────────────────────────────────────────────
  { id: "wish_first",       name: "Window Shopping",        icon: "🎁",  category: "personal",  rarity: "common",    points: 10,  condition: "Add your first game to the Wishlist",                  check: c => c.wishlistCount >= 1 },
  { id: "wish_five",        name: "Short List",              icon: "📝",  category: "personal",  rarity: "common",    points: 10,  condition: "Add 5 games to the Wishlist",                          check: c => c.wishlistCount >= 5 },
  { id: "wish_ten",         name: "Wish List Pro",           icon: "📋",  category: "personal",  rarity: "uncommon",  points: 25,  condition: "Add 10 games to the Wishlist",                         check: c => c.wishlistCount >= 10 },
  { id: "wish_found1",      name: "Found One!",              icon: "✅",  category: "personal",  rarity: "common",    points: 10,  condition: "Mark your first Wishlist game as Found",               check: c => c.wishlistFound >= 1 },
  { id: "wish_found5",      name: "Making It Happen",        icon: "🎯",  category: "personal",  rarity: "uncommon",  points: 25,  condition: "Mark 5 Wishlist games as Found",                       check: c => c.wishlistFound >= 5 },
  { id: "wish_found10",     name: "The Fulfiller",           icon: "🌟",  category: "personal",  rarity: "rare",      points: 50,  condition: "Mark 10 Wishlist games as Found",                      check: c => c.wishlistFound >= 10 },
  { id: "wish_shared",      name: "Share the Love",          icon: "🔗",  category: "social",    rarity: "uncommon",  points: 25,  condition: "Share your Wishlist via public link",                  check: c => c.wishlistShared },
  { id: "wish_must_have",   name: "Gotta Have It",           icon: "⭐",  category: "personal",  rarity: "uncommon",  points: 25,  condition: "Add 5 Must-Have items to your Wishlist",               check: c => c.wishlistMustHaveCount >= 5 },
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

/**
 * Evaluate all auto-checkable achievements against the current collection context.
 * Secret achievements (check: () => false) are skipped during auto evaluation and
 * are instead unlocked explicitly through the manual-achievement API path.
 */
export function evaluateAchievements(ctx: AchievementContext): Set<string> {
  const unlocked = new Set<string>();
  for (const a of ACHIEVEMENTS) {
    if (!a.secret && a.check(ctx)) unlocked.add(a.id);
  }
  return unlocked;
}

export function getTotalPoints(unlockedIds: string[]): number {
  return ACHIEVEMENTS.filter(a => unlockedIds.includes(a.id))
    .reduce((s, a) => s + a.points, 0);
}

/**
 * Completion % counts only auto-checkable achievements (not secret, not manual-only).
 * Manual-only achievements (check: () => false) are excluded so the % isn\'t
 * artificially inflated by things the user can\'t organically discover.
 */
export function getCompletionPercent(unlockedIds: string[]): number {
  const autoCheckable = ACHIEVEMENTS.filter(a => !a.secret && a.check.toString() !== '_ => false');
  return autoCheckable.length > 0
    ? Math.round((unlockedIds.filter(id => autoCheckable.find(a => a.id === id)).length / autoCheckable.length) * 100)
    : 0;
}

export const CATEGORY_LABELS: Record<AchievementCategory, { label: string; icon: string }> = {
  collection: { label: "Collection", icon: "📦" },
  business:   { label: "Business",   icon: "💰" },
  hunting:    { label: "Hunting",    icon: "🔦" },
  platform:   { label: "Platform",   icon: "🕹️" },
  social:     { label: "Social",     icon: "👥" },
  personal:   { label: "Personal",   icon: "🎮" },
  grind:      { label: "Grind",      icon: "⚙️" },
  secret:     { label: "Secret",     icon: "❓" },
  milestone:  { label: "Milestone",  icon: "🏁" },
};
