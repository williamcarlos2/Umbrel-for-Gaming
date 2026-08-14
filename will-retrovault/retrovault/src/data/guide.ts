export type GuideTip = {
  id: string;
  text: string;
  detail?: string;
  appLink?: { label: string; href: string };
};

export type GuideSection = {
  id: string;
  title: string;
  icon: string;
  color: string;
  intro: string;
  tips: GuideTip[];
  resources?: { label: string; url: string; note: string }[];
};

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "mindset",
    title: "The Hunter's Mindset",
    icon: "🧠",
    color: "text-purple-400 border-purple-700",
    intro: "The difference between a casual collector and a serious hunter is almost entirely mental. These are the principles that separate lucky finds from consistent wins.",
    tips: [
      { id: "m1", text: "Know before you go. Always check PriceCharting before any hunting trip.", detail: "If you don't know the market value of what you're looking at, you can't make a smart buying decision. This is non-negotiable. Five seconds on your phone saves you from paying $40 for a $12 game — or missing a $200 game for $5.", appLink: { label: "Check prices in Field Mode", href: "/field" } },
      { id: "m2", text: "eBay SOLD listings are the truth. Asking price is just a dream.", detail: "Any seller can list a game for $500. That means nothing. What matters is what people actually paid. Always filter eBay to 'Sold Listings' to see real market data. A game with 200 listings at $80 but 3 actual sales at $30 is a $30 game.", appLink: { label: "View market data in your Vault", href: "/inventory" } },
      { id: "m3", text: "Patience is your most powerful asset.", detail: "The best finds come to those who hunt consistently over time, not those who panic-buy at the first sight of something rare. If you miss a deal, another will come. If you overpay out of excitement, that money is gone." },
      { id: "m4", text: "Never buy what you can't sell. Always sell what you don't love.", detail: "Before every purchase, ask: if I change my mind tomorrow, can I get my money back? If the answer is no, your margin for error is zero. Build a collection where every piece either has personal value or market value — ideally both." },
      { id: "m5", text: "The hunt is a skill, not luck. Most great finds aren't lucky — they're earned.", detail: "Experienced hunters find deals that casual shoppers walk past every day. The difference is knowing what to look for. Every tip in this guide is a piece of that skill." },
      { id: "m6", text: "Separate your collector brain from your business brain.", detail: "These are two different modes. In business mode, every purchase is a calculation: cost, potential sale price, fees, time. In collector mode, you're buying what you love. Know which mode you're in before opening your wallet." },
      { id: "m7", text: "Discipline beats enthusiasm every time.", detail: "Enthusiasm says 'I have to have it.' Discipline says 'not at that price.' The hunters who build sustainable, profitable collections are the ones who walk away more often than they buy." },
    ],
  },
  {
    id: "pricing",
    title: "Understanding Pricing",
    icon: "💰",
    color: "text-yellow-400 border-yellow-700",
    intro: "Price knowledge is the foundation of every smart buy and sell. Most people get this wrong — even store owners.",
    tips: [
      { id: "p1", text: "PriceCharting is your baseline. eBay sold listings are your truth.", detail: "PriceCharting aggregates eBay sold data and is updated regularly. Use it for quick lookups. But for important purchases, go directly to eBay completed listings to see the actual range and recency of sales.", appLink: { label: "Price check in Field Mode", href: "/field" } },
      { id: "p2", text: "Condition is everything. The same game can be worth 4x more or less depending on state.", detail: "Loose (cart only) vs. CIB (complete in box) vs. Sealed can represent dramatically different prices. A sealed NES game can be worth 10x its loose equivalent. Always assess what you're actually buying.", appLink: { label: "Track condition in your Vault", href: "/inventory" } },
      { id: "p3", text: "Price trends matter more than current snapshots.", detail: "A game that was $30 last year and is $80 today is trending up — momentum is your friend. A game at $80 that was $150 six months ago may be correcting. RetroVault tracks 30-day price history so you can see the direction.", appLink: { label: "View price history", href: "/inventory" } },
      { id: "p4", text: "Game stores price to their overhead, not to fair market value.", detail: "A store in a downtown location paying high rent needs higher margins. Their prices reflect their business costs, not just market data. This is why prices vary so wildly between stores — it's not ignorance, it's economics." },
      { id: "p5", text: "Stores that price from current eBay listings (not sold) are overpriced by default.", detail: "This is one of the most common mistakes. Anyone can list a game for any price. The list price is not the market price. Always compare to what actually sold, not what's currently listed." },
      { id: "p6", text: "Platform matters more than title for pricing trends.", detail: "SNES and N64 games have held value strongly. PS3 and Xbox 360 games are often undervalued right now — the nostalgia wave hasn't hit yet. Knowing which platforms are trending is as important as knowing individual game prices.", appLink: { label: "View analytics by platform", href: "/analytics" } },
      { id: "p7", text: "Sealed and graded games follow completely different market rules.", detail: "WATA and VGA graded games are speculative collectibles more than gaming artifacts. Their prices are driven by condition grades and pop reports, not playability. Don't confuse this market with the general retro market." },
      { id: "p8", text: "Calculate your real net profit, not just the sale price.", detail: "A $60 sale on eBay nets you ~$47 after 13.25% fees and shipping. Know your actual take-home before deciding if a flip is worth it.", appLink: { label: "Use the Flip Calculator", href: "/flip" } },
    ],
    resources: [
      { label: "PriceCharting", url: "https://www.pricecharting.com", note: "The gold standard for retro game prices" },
      { label: "eBay Sold Listings", url: "https://www.ebay.com/sch/i.html?LH_Sold=1&LH_Complete=1", note: "Filter to 'Sold' to see real transaction data" },
      { label: "GameValueNow", url: "https://www.gamevaluenow.com", note: "Secondary price reference, good for cross-checking" },
    ],
  },
  {
    id: "buying",
    title: "Buying Smart",
    icon: "🛒",
    color: "text-green-400 border-green-700",
    intro: "Every great deal starts before you walk in the door. Preparation, pattern recognition, and knowing when to walk away are what separate great hunters from average ones.",
    tips: [
      { id: "b1", text: "Check your own inventory before buying. Dupes kill your ROI.", detail: "It sounds obvious but it happens constantly at garage sales: you buy something you already own. RetroVault's Field Mode warns you instantly if you already own the game — and tells you what condition your copy is in, what you paid for it, and whether the market has gone up or down since you bought it. At a garage sale you'll know in one glance: what you have, what condition it's in, what you paid, and whether it's worth buying another copy.", appLink: { label: "Check dupes in Field Mode", href: "/field" } },
      { id: "b1b", text: "Field Mode tells you everything you need at the point of sale.", detail: "Type any game title in Field Mode and instantly see: market price (Loose / CIB / New), your BUY / PASS / NEGOTIATE verdict based on the asking price, whether you already own it (and what condition + what you paid), whether it's on your Watchlist with your target price, and how the asking price compares to your target ROI. It's designed to work on a phone screen at a table — fast, readable, decisive.", appLink: { label: "Open Field Mode", href: "/field" } },
      { id: "b2", text: "At garage sales, arrive early. Very early.", detail: "The best finds at garage sales are gone by 7:30am. Serious hunters often arrive before official start times. The people who sleep until 10am find the leftovers. Know your priorities." },
      { id: "b3", text: "At thrift stores, go mid-week when new donations arrive.", detail: "Most thrift stores receive and process donations Tuesday through Thursday. Weekend crowds have already picked through Friday and Saturday arrivals. Mid-week regulars consistently find better deals." },
      { id: "b4", text: "Build relationships with thrift store staff.", detail: "If you're a regular at a Goodwill or Salvation Army, introduce yourself. Some stores will call regulars when specific items arrive. This is not guaranteed but it's happened for many serious collectors." },
      { id: "b5", text: "Lot purchases are where the real margins live.", detail: "A box of 50 loose NES games for $100 is often a better deal than buying games individually, even if most are common. One hidden gem in a lot can make the whole purchase profitable. Use the Lot Calculator to price individual items from bulk purchases.", appLink: { label: "Use the Lot Calculator", href: "/lot" } },
      { id: "b6", text: "Always test before you buy. 'Untested' is a discount word, not a promise.", detail: "An untested game is one that might not work. Price accordingly — typically 25-35% below tested value. Many sellers don't test because they can't, not because the game works fine." },
      { id: "b7", text: "The label is the game's passport. Learn to read it.", detail: "On Nintendo carts, the label condition tells you about storage and handling history. Faded labels, water damage, or marker writing affect value significantly. On disc-based games, check the data side for deep scratches — light surface scratches usually buff out." },
      { id: "b8", text: "At conventions, establish a budget before entering. Track it in real time.", detail: "Convention fever is real. The excitement of a show floor makes it easy to overspend by hundreds of dollars without realizing it. Set a hard budget and track every purchase as you go.", appLink: { label: "Use Convention Tracker", href: "/convention" } },
      { id: "b9", text: "Compare across dealers at conventions before committing.", detail: "At a multi-vendor show, the same game can be priced very differently across the floor. Walk the entire floor first before buying anything over $20. You may find the same game for significantly less three tables over." },
      { id: "b10", text: "Facebook Marketplace for local deals — but go with cash and meet in public.", detail: "FB Marketplace consistently has some of the best local deals on retro games, often from people who don't know what they have. Always meet in a public place, bring exact cash, and test before paying when possible.", appLink: { label: "Find local deals", href: "/deals" } },
    ],
  },
  {
    id: "negotiating",
    title: "Negotiation & Dealing",
    icon: "🤝",
    color: "text-blue-400 border-blue-700",
    intro: "Negotiation is a skill with specific techniques. The best negotiators aren't aggressive — they're confident, informed, and genuinely prepared to walk away.",
    tips: [
      { id: "n1", text: "The person who knows more wins the negotiation.", detail: "Before negotiating, know the market value, the condition premium or discount, and your walk-away price. Confidence in a negotiation comes from preparation, not personality." },
      { id: "n2", text: "Cash in hand is a serious negotiating tool.", detail: "Saying 'I have $40 cash right now' is more compelling than an offer in the abstract. The certainty and immediacy of cash moves people. Use it." },
      { id: "n3", text: "Start lower than you want to pay. Leave room to meet in the middle.", detail: "If your target is $30, open at $20-22. This gives you room to settle at $25-30, which both parties find satisfying. Starting at your maximum leaves you nowhere to go.", appLink: { label: "Get offer recommendations", href: "/negotiate" } },
      { id: "n4", text: "Bundle offers are powerful. 'I'll take everything for $X' is hard to refuse.", detail: "Sellers want to move multiple items at once. Offering to buy everything in one transaction for a package price often beats trying to negotiate individual pieces. It also clears their inventory faster, which many sellers appreciate." },
      { id: "n5", text: "Use condition as a justification, not an insult.", detail: "Point out the worn label, missing manual, or scuffed disc as a reason for a lower price — not as criticism of the seller. Keep it factual: 'I notice there's no manual — could you do $X without it?' is much better than 'This is damaged.'" },
      { id: "n6", text: "Show comparable sales if challenged. Don't argue — demonstrate.", detail: "If a seller pushes back on your offer, pull up eBay sold listings right there. 'Here's what these have sold for recently' is irrefutable. You're not arguing opinion — you're showing data." },
      { id: "n7", text: "Genuine willingness to walk away is your strongest card.", detail: "If you're not truly prepared to walk away, you'll always overpay. The best deals often happen when the seller calls you back as you're leaving. Don't bluff — actually be willing to leave." },
      { id: "n8", text: "Be respectful of sellers' emotional attachment.", detail: "Many garage sale sellers priced items based on what they paid or what they meant to them. Acknowledge the item's history while still being honest about market value. 'This is a great game — I can do $X' works better than 'These only sell for $X.'" },
    ],
    resources: [
      { label: "Negotiation Helper", url: "/negotiate", note: "RetroVault's built-in offer calculator with scenario-specific strategy" },
    ],
  },
  {
    id: "selling",
    title: "Selling for Maximum Return",
    icon: "📦",
    color: "text-orange-400 border-orange-700",
    intro: "Selling well is as important as buying well. Most collectors leave significant money on the table by selling the wrong way.",
    tips: [
      { id: "s1", text: "eBay reaches the most buyers. It also takes the most fees.", detail: "eBay's 13.25% final value fee plus PayPal/shipping costs mean you net roughly $0.80 per dollar sold. It's still the highest reach — but factor this into your pricing calculations.", appLink: { label: "Calculate net profit", href: "/flip" } },
      { id: "s2", text: "CIB consistently sells for more than loose. Complete your sets when possible.", detail: "Adding the box and manual to a loose game before selling can increase the sale price by 40-80%. If you find a box at a yard sale, check if it matches a loose cart you already own." },
      { id: "s3", text: "Photography is half your listing. Bad photos cost you money.", detail: "Listings with multiple clear, well-lit photos from multiple angles consistently sell faster and for more than listings with blurry or low-effort images. Photograph the label, board, PCB if relevant, and any flaws." },
      { id: "s4", text: "Timing matters. Holiday seasons and nostalgia surges drive prices.", detail: "The weeks before Christmas and the run-up to major game anniversaries (NES 40th anniversary, for example) drive genuine price increases. Monitor your Hot List for price trend direction before selling.", appLink: { label: "Check your Hot List", href: "/hotlist" } },
      { id: "s5", text: "Know your platform: eBay for rare items, Facebook/local for common stuff.", detail: "Selling a common PS2 game on eBay for $8 minus $4 shipping minus $1 fees makes no sense. Local sales (Facebook Marketplace, conventions, swap meets) are better for high-volume, low-value items. Save eBay for games worth $25+." },
      { id: "s6", text: "Lot sales trade price for speed and convenience.", detail: "Bundling similar common games into lots (e.g., '10 PS2 Sports Games') moves inventory faster than individual listings. The per-game price is lower, but the time investment per item is much lower too." },
      { id: "s7", text: "Track your P&L on every sale. Your gut is not an accounting system.", detail: "You cannot optimize what you don't measure. RetroVault's P&L ledger tracks what you paid, what you sold for, and your actual net profit — not just what you think you made.", appLink: { label: "Log sales in P&L Ledger", href: "/sales" } },
      { id: "s8", text: "Price to sell, not to maximize. Sitting inventory has a cost.", detail: "A game listed for $60 that sits for 6 months is less profitable than one sold for $50 in 2 weeks. Factor in the time value of your capital — money tied up in inventory can't be reinvested in better deals." },
    ],
    resources: [
      { label: "eBay Sold Listings", url: "https://www.ebay.com/sch/i.html?LH_Sold=1&LH_Complete=1", note: "Always anchor your pricing to what actually sold" },
      { label: "Mercari", url: "https://www.mercari.com", note: "Lower fees than eBay, good for mid-range items" },
    ],
  },
  {
    id: "authentication",
    title: "Spotting Fakes & Condition Grading",
    icon: "🔍",
    color: "text-red-400 border-red-700",
    intro: "Counterfeits exist across NES, SNES, GBA, and DS markets. Knowing what to look for saves you from expensive mistakes.",
    tips: [
      { id: "a1", text: "GBA games are the most commonly counterfeited. Always test before buying.", detail: "Fake GBA games are prevalent and often look convincing. Real tells: label printing quality, screw type (real games use tri-wing screws, fakes often use Phillips), and PCB inspection. Test functionality and battery backup saves." },
      { id: "a2", text: "The label is the first thing to check, but never the only thing.", detail: "Fake labels are good but rarely perfect. Look for: correct font weight, authentic Nintendo/Sega logo styling, appropriate color saturation, and label placement. But always open the cart if the value justifies it." },
      { id: "a3", text: "The PCB (circuit board) tells the truth.", detail: "If you have the tools, the PCB inside a cartridge doesn't lie. Original Nintendo boards have specific chip configurations and manufacturer markings. The repro market can fake the outside but rarely the board itself." },
      { id: "a4", text: "Know your regions. PAL games have different cases and labels.", detail: "European PAL games are legitimate but are worth less in North American markets due to compatibility and collector demand differences. Always identify region before pricing." },
      { id: "a5", text: "For high-value purchases, buy from trusted sources with return policies.", detail: "If you're spending $200+ on a single game, buy from established eBay sellers with good feedback history, dedicated retro game stores with authentication expertise, or known community members in forums/Discord." },
      { id: "a6", text: "Condition grading: Loose means cart only, no promises. CIB means complete in box. Sealed means factory-sealed, unopened.", detail: "These are the baseline terms. Beyond this: G (Good) = functional but significant wear. VG (Very Good) = light wear, fully functional. EX (Excellent) = minimal wear. NM (Near Mint) = virtually perfect. These grades affect value significantly." },
    ],
    resources: [
      { label: "NFCGames.com - Fake Checker", url: "https://nfcgames.com", note: "Community database of known counterfeit game IDs" },
      { label: "Digitpress Fake NES Guide", url: "https://www.digitpress.com/library/faqs/fakenesguide.htm", note: "Definitive guide to spotting fake NES cartridges" },
    ],
  },
  {
    id: "collection",
    title: "Building a Collection With Intent",
    icon: "🏛️",
    color: "text-cyan-400 border-cyan-700",
    intro: "A great collection isn't accidental. It reflects your taste, your budget, and your long-term vision — whether that's personal enjoyment, financial value, or both.",
    tips: [
      { id: "c1", text: "Define what you're collecting before you start buying.", detail: "Are you collecting to play? To display? To flip? To complete a specific platform? Each goal requires a different strategy. Collectors who try to do all four simultaneously rarely do any of them well." },
      { id: "c2", text: "Platform specialization beats platform breadth for value hunters.", detail: "Becoming deeply knowledgeable about one platform gives you an edge that general collectors don't have. You'll spot deals and fakes faster, know the library better, and build a more cohesive collection." },
      { id: "c3", text: "Buy quality, not quantity. One great CIB beats ten worn loose.", detail: "A smaller, high-quality collection is more valuable and satisfying than a large collection of beat-up carts. Be selective about what earns a spot on your shelf." },
      { id: "c4", text: "Document everything. The history of how you got something is part of its value.", detail: "Note where you bought it, what you paid, when you acquired it. This documentation adds personal value and is useful if you ever sell — buyers appreciate provenance.", appLink: { label: "Track acquisitions in P&L Ledger", href: "/sales" } },
      { id: "c5", text: "Know your grails and pursue them actively.", detail: "Every collector has games they'd do almost anything to own. Knowing what those are keeps you focused and motivated. Add them to your grail list so you recognize them instantly when they appear.", appLink: { label: "Build your Grail List", href: "/grails" } },
      { id: "c6", text: "Don't let FOMO drive purchases. The best deal is always the one you're confident in.", detail: "Fear of missing out is the enemy of good collecting. If you need a week to think about a purchase, take it. If it's gone when you come back, a better version of it will appear eventually." },
      { id: "c7", text: "Review and cull your collection periodically.", detail: "A collection should evolve as your taste and knowledge grow. Games you bought early that no longer fit your vision should be sold — reinvesting that capital in better pieces improves the whole." },
    ],
    resources: [
      { label: "Your Collection Showcase", url: "/showcase", note: "View your collection as a gallery" },
      { label: "Platform Completion Tiers", url: "/tiers", note: "Track how deep you've gone on each platform" },
      { label: "Collection Goals", url: "/goals", note: "Set platform-level collection targets" },
    ],
  },
  {
    id: "resources",
    title: "Essential Resources",
    icon: "📚",
    color: "text-zinc-400 border-zinc-600",
    intro: "The retro gaming community is extraordinarily generous with knowledge. These are the best places to learn, find deals, and connect.",
    tips: [
      { id: "r1", text: "Chase After The Right Price (YouTube) — field hunting techniques and deal evaluation", detail: "One of the best YouTube channels for practical retro hunting advice. Covers garage sale strategies, thrift store navigation, pricing breakdowns, and the psychology of the deal." },
      { id: "r2", text: "Metal Jesus Rocks (YouTube) — deep dives into specific platforms and hidden gems", detail: "Long-running channel with excellent hidden gem guides by platform. Essential for discovering what to look for beyond the obvious titles." },
      { id: "r3", text: "My Life in Gaming (YouTube) — hardware deep dives and RGB/display optimization", detail: "Best resource for understanding how to get the best picture out of retro hardware. Essential if display quality matters to you." },
      { id: "r4", text: "r/gamecollecting — community knowledge and deal verification", detail: "Active subreddit with experienced collectors. Good for pricing questions, authentication help, and community trades." },
      { id: "r5", text: "r/gameswap — community trading and selling", detail: "Dedicated subreddit for collector-to-collector trades and sales. Often below eBay market prices since there's no fee structure." },
      { id: "r6", text: "Digital Press forums — deep expertise on obscure titles and authentication", detail: "One of the oldest retro gaming communities online. Exceptional knowledge base for authenticating rare games and understanding regional variants." },
    ],
    resources: [
      { label: "Chase After The Right Price", url: "https://www.youtube.com/@ChaseAfterTheRightPrice", note: "Field hunting and deal evaluation" },
      { label: "Metal Jesus Rocks", url: "https://www.youtube.com/@MetalJesusRocks", note: "Hidden gems by platform" },
      { label: "My Life in Gaming", url: "https://www.youtube.com/@MyLifeInGaming", note: "Hardware and display optimization" },
      { label: "r/gamecollecting", url: "https://reddit.com/r/gamecollecting", note: "Community pricing and authentication help" },
      { label: "r/gameswap", url: "https://reddit.com/r/gameswap", note: "Community trading" },
      { label: "PriceCharting", url: "https://www.pricecharting.com", note: "Market price data" },
      { label: "Digital Press", url: "https://www.digitpress.com", note: "Deep expertise on rare games" },
    ],
  },
  {
    id: "integrations",
    title: "Optional Integrations",
    icon: "🔌",
    color: "text-blue-400 border-blue-700",
    intro: "RetroVault has several optional features that require free third-party API keys. None are required — the core app works without any of them. Each integration is a quality-of-life upgrade you can enable when ready.",
    tips: [
      {
        id: "int_youtube",
        text: "YouTube Videos — watch playthroughs and walkthroughs directly in game modals",
        detail: "Add a free YouTube Data API v3 key from Google Cloud Console. Once configured, every game modal shows top-rated playthroughs, walkthroughs, reviews, and longplays. Videos load on demand and cache locally — the free quota is plenty for normal use.",
        appLink: { label: "Enable YouTube in Settings", href: "/settings#youtube" }
      },
      {
        id: "int_bugs",
        text: "Bug Reporter — file GitHub issues directly from the app without leaving RetroVault",
        detail: "Create a fine-grained GitHub Personal Access Token with Issues:Write permission on your repo. Once set, the 🐛 button files reports to GitHub with duplicate detection and rate limiting built in.",
        appLink: { label: "Enable Bug Reporter in Settings", href: "/settings" }
      },
      {
        id: "int_api",
        text: "Public API — expose your collection data programmatically for automations and integrations",
        detail: "Generate API keys from the /api-docs page. Use them to connect RetroVault to Home Assistant, Discord bots, Obsidian, or any script. Read-only keys are safe to share; write keys can manage other keys.",
        appLink: { label: "Manage API Keys", href: "/api-docs" }
      },
      {
        id: "int_craigslist",
        text: "Craigslist Deals — get alerts when games on your watchlist appear locally",
        detail: "Set your city slug in Settings (e.g. 'portland', 'chicago'). Enable the Craigslist scraper and it scans the video games section, cross-referencing your watchlist and grail list for matching deals.",
        appLink: { label: "Configure in Settings", href: "/settings" }
      },
      {
        id: "int_reddit",
        text: "Reddit r/gameswap Alerts — monitor selling posts for games you want",
        detail: "No API key needed — uses Reddit's public JSON API. Enable the Reddit scraper and it checks r/gameswap for posts offering games on your watchlist or grail list.",
        appLink: { label: "Enable Reddit Scraper", href: "/scrapers" }
      },
    ],
    resources: [
      { label: "Google Cloud Console (YouTube API)", url: "https://console.cloud.google.com", note: "Free YouTube Data API v3 key" },
      { label: "GitHub Fine-Grained Tokens", url: "https://github.com/settings/personal-access-tokens", note: "For bug reporter integration" },
      { label: "API Documentation", url: "/api-docs", note: "RetroVault v1 API reference" },
    ],
  },
];