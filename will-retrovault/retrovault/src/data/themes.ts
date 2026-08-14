export type ColorPalette = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  // CSS variable values
  primary: string;      // main accent (e.g. green-400)
  primaryDark: string;  // darker variant for borders
  primaryGlow: string;  // rgba for box shadows
  primaryBg: string;    // subtle bg tint
  text: string;         // body text color
  textMuted: string;    // secondary text
  border: string;       // border color
  bgBase: string;       // page background
  bgCard: string;       // card/modal background
};

export type StyleTheme = {
  id: string;
  name: string;
  emoji: string;
  description: string;
  cssClass: string;
  previewBg: string;
};

export const COLOR_PALETTES: ColorPalette[] = [
  {
    id: "green",
    name: "Matrix Green",
    emoji: "🟢",
    description: "Classic phosphor green — the original hacker terminal.",
    primary: "#4ade80",      // green-400
    primaryDark: "#166534",  // green-900
    primaryGlow: "rgba(34,197,94,0.4)",
    primaryBg: "rgba(34,197,94,0.05)",
    text: "#86efac",         // green-300
    textMuted: "#166534",    // green-900
    border: "#166534",
    bgBase: "#09090b",       // zinc-950
    bgCard: "#18181b",       // zinc-900
  },
  {
    id: "blue",
    name: "Cobalt Blue",
    emoji: "🔵",
    description: "IBM blue terminal. Serious business, retro computing vibes.",
    primary: "#60a5fa",      // blue-400
    primaryDark: "#1e3a8a",  // blue-900
    primaryGlow: "rgba(59,130,246,0.4)",
    primaryBg: "rgba(59,130,246,0.05)",
    text: "#93c5fd",         // blue-300
    textMuted: "#1e3a8a",
    border: "#1e3a8a",
    bgBase: "#03050e",
    bgCard: "#0a0f1e",
  },
  {
    id: "purple",
    name: "Synthwave",
    emoji: "🟣",
    description: "SNES-era purple neon. Lo-fi beats and 16-bit dreams.",
    primary: "#c084fc",      // purple-400
    primaryDark: "#581c87",  // purple-900
    primaryGlow: "rgba(168,85,247,0.4)",
    primaryBg: "rgba(168,85,247,0.05)",
    text: "#d8b4fe",         // purple-300
    textMuted: "#581c87",
    border: "#581c87",
    bgBase: "#08030f",
    bgCard: "#120520",
  },
  {
    id: "amber",
    name: "Amber",
    emoji: "🟠",
    description: "Warm amber phosphor. The original vintage monitor glow.",
    primary: "#fbbf24",      // amber-400
    primaryDark: "#78350f",  // amber-900
    primaryGlow: "rgba(245,158,11,0.4)",
    primaryBg: "rgba(245,158,11,0.05)",
    text: "#fcd34d",         // amber-300
    textMuted: "#78350f",
    border: "#78350f",
    bgBase: "#0a0800",
    bgCard: "#18130a",
  },
  {
    id: "magenta",
    name: "Arcade Magenta",
    emoji: "🩷",
    description: "Hot pink neon. Straight from the arcade cabinet marquee.",
    primary: "#f472b6",      // pink-400
    primaryDark: "#831843",  // pink-900
    primaryGlow: "rgba(236,72,153,0.4)",
    primaryBg: "rgba(236,72,153,0.05)",
    text: "#f9a8d4",         // pink-300
    textMuted: "#831843",
    border: "#831843",
    bgBase: "#0d0008",
    bgCard: "#1a000f",
  },
  {
    id: "cyan",
    name: "Retro Cyan",
    emoji: "🩵",
    description: "80s computer cyan. Commodore 64 meets teal phosphor.",
    primary: "#22d3ee",      // cyan-400
    primaryDark: "#164e63",  // cyan-900
    primaryGlow: "rgba(6,182,212,0.4)",
    primaryBg: "rgba(6,182,212,0.05)",
    text: "#67e8f9",         // cyan-300
    textMuted: "#164e63",
    border: "#164e63",
    bgBase: "#00080a",
    bgCard: "#00121a",
  },
  {
    id: "red",
    name: "Crimson Alert",
    emoji: "🔴",
    description: "Red alert. Maximum urgency for maximum hustle.",
    primary: "#f87171",      // red-400
    primaryDark: "#7f1d1d",  // red-900
    primaryGlow: "rgba(239,68,68,0.4)",
    primaryBg: "rgba(239,68,68,0.05)",
    text: "#fca5a5",         // red-300
    textMuted: "#7f1d1d",
    border: "#7f1d1d",
    bgBase: "#0a0000",
    bgCard: "#180000",
  },
  {
    id: "gold",
    name: "Golden Age",
    emoji: "✨",
    description: "Premium gold. For the collector who has arrived.",
    primary: "#f59e0b",      // yellow-500
    primaryDark: "#713f12",  // yellow-900
    primaryGlow: "rgba(234,179,8,0.4)",
    primaryBg: "rgba(234,179,8,0.05)",
    text: "#fde68a",         // yellow-200
    textMuted: "#713f12",
    border: "#713f12",
    bgBase: "#0a0800",
    bgCard: "#1a1200",
  },
];

/** Style themes tagged by which mode(s) they support */
export type StyleThemeMode = "dark" | "light" | "both";

export const STYLE_THEMES: (StyleTheme & { modes: StyleThemeMode })[] = [
  // ── Dark-mode style themes ──────────────────────────────────────────────────
  {
    id: "terminal",
    name: "Terminal",
    emoji: "⬛",
    description: "Clean phosphor terminal. Minimal, focused, fast.",
    cssClass: "theme-terminal",
    previewBg: "bg-zinc-950 border-green-800",
    modes: "both" as StyleThemeMode,
  },
  {
    id: "scanline",
    name: "CRT Scanline",
    emoji: "📺",
    description: "Visible scanlines and CRT vignette. Dark mode only.",
    cssClass: "theme-scanline",
    previewBg: "bg-zinc-950 border-green-800",
    modes: "dark" as StyleThemeMode,
  },
  {
    id: "arcade",
    name: "Arcade Cabinet",
    emoji: "🕹️",
    description: "Bold bezels, neon marquee glow, and heavy border treatments.",
    cssClass: "theme-arcade",
    previewBg: "bg-zinc-900 border-yellow-700",
    modes: "both" as StyleThemeMode,
  },
  {
    id: "cartridge",
    name: "Cartridge",
    emoji: "🎮",
    description: "Warm beige tones inspired by physical cartridge plastic.",
    cssClass: "theme-cartridge",
    previewBg: "bg-stone-900 border-stone-700",
    modes: "both" as StyleThemeMode,
  },
  {
    id: "galaxy",
    name: "Dark Galaxy",
    emoji: "🌌",
    description: "Deep space darkness with a subtle star-field background. Dark mode only.",
    cssClass: "theme-galaxy",
    previewBg: "bg-slate-950 border-indigo-900",
    modes: "dark" as StyleThemeMode,
  },
  // ── Light-mode style themes ──────────────────────────────────────────────────
  {
    id: "paper",
    name: "Paper",
    emoji: "📄",
    description: "Clean white paper. Simple, legible, distraction-free.",
    cssClass: "theme-paper",
    previewBg: "bg-white border-gray-300",
    modes: "light" as StyleThemeMode,
  },
  {
    id: "blueprint",
    name: "Blueprint",
    emoji: "📐",
    description: "Technical blueprint grid on a cool blue-white background.",
    cssClass: "theme-blueprint",
    previewBg: "bg-blue-50 border-blue-300",
    modes: "light" as StyleThemeMode,
  },
];

export const DEFAULT_THEME = { colorId: "green", styleId: "terminal", mode: "dark" as "dark" | "light" };
