export type PlatformGroup = {
  id: string;
  label: string;
  icon: string;
  platforms: string[];
  era: "retro" | "modern" | "handheld" | "legacy";
};

export const PLATFORM_GROUPS: PlatformGroup[] = [
  {
    id: "nintendo-retro",
    label: "Nintendo (Retro)",
    icon: "🔴",
    era: "retro",
    platforms: ["NES", "SNES", "Nintendo 64", "Gamecube"],
  },
  {
    id: "nintendo-modern",
    label: "Nintendo (Modern)",
    icon: "🔴",
    era: "modern",
    platforms: ["Wii", "Wii U", "Nintendo Switch", "Switch 2"],
  },
  {
    id: "nintendo-handheld",
    label: "Nintendo (Handheld)",
    icon: "🎮",
    era: "handheld",
    platforms: ["Game Boy", "Game Boy Color", "Virtual Boy", "Game Boy Advance", "Nintendo DS", "Nintendo 3DS"],
  },
  {
    id: "playstation-retro",
    label: "PlayStation (Retro)",
    icon: "🔵",
    era: "retro",
    platforms: ["PS1", "PS2", "PS3", "PSP"],
  },
  {
    id: "playstation-modern",
    label: "PlayStation (Modern)",
    icon: "🔵",
    era: "modern",
    platforms: ["PS4", "PS5", "PS Vita"],
  },
  {
    id: "sega-retro",
    label: "Sega (Retro)",
    icon: "🔷",
    era: "retro",
    platforms: ["Sega Genesis", "Sega CD", "Dreamcast", "Sega Saturn", "Sega 32X", "Game Gear", "Sega Master System"],
  },
  {
    id: "xbox",
    label: "Xbox",
    icon: "🟩",
    era: "retro",
    platforms: ["Xbox", "Xbox 360", "Xbox One", "Xbox Series X"],
  },
  {
    id: "legacy",
    label: "Legacy & Specialty",
    icon: "🕹️",
    era: "legacy",
    platforms: ["Atari 2600", "TurboGrafx-16", "Neo Geo", "Atari Jaguar"],
  },
];

export const RETRO_DEFAULTS = [
  "NES", "SNES", "Nintendo 64", "Gamecube", "Nintendo Switch",
  "Sega Genesis", "Sega CD", "Dreamcast",
  "PS1", "PS2", "PS3", "PSP",
  "Xbox", "Xbox 360",
];

export const ALL_PLATFORMS = PLATFORM_GROUPS.flatMap(g => g.platforms);
