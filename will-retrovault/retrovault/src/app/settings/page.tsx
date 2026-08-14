"use client";
/**
 * Settings Page
 *
 * @todo Extract each <Section> into its own component file:
 *       - ThemeSettings, LocalizationSettings, DeploymentSettings,
 *         PlexSettings, ScraperSettings, PlatformSettings,
 *         FeaturesSettings, BugReportingSettings, AuthSettings
 */
import { useEffect, useMemo, useState } from "react";
import { useTheme } from "@/components/ThemeProvider";
import { COLOR_PALETTES, STYLE_THEMES } from "@/data/themes";
import { NAV_GROUPS } from "@/data/navConfig";
import { PLATFORM_GROUPS, RETRO_DEFAULTS, ALL_PLATFORMS } from "@/data/platformGroups";
import Link from "next/link";
import { ONBOARDING_KEY } from "@/components/Onboarding";

type Features = {
  collection: boolean; business: boolean; fieldTools: boolean; windowShop: boolean; system: boolean;
  social: boolean; personal: boolean;
};

type Config = {
  appName: string; tagline: string; ownerName: string; themeColor: string;
  currency: string; dateFormat: string; region: string; publicUrl: string; standaloneMode: boolean;
  auth: { enabled: boolean; passwordHash: string };
  fetchScheduleHour: number; priceDataSource: string;
  autoSatisfyWishlistOnVaultAdd?: boolean;
  githubRepo: string;
  features: Features;
  contactEmail: string; contactPhone: string; shareContact: boolean;
  platforms?: string[];
  scrapers?: { craigslistCity?: string };
};

type TextConfigKey = 'appName' | 'tagline' | 'ownerName' | 'contactEmail' | 'contactPhone' | 'publicUrl';

const THEME_COLORS = ["green","blue","purple","orange","cyan","yellow","pink"];

function YouTubeSettings() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  useEffect(() => {
    fetch('/api/youtube?game=test&platform=test&type=test')
      .then(r => r.json())
      .then(d => setConfigured(d.configured !== false))
      .catch(() => setConfigured(false));
  }, []);

  return (
    <div className="space-y-4">
      <div className={`border-2 p-4 ${configured ? 'border-red-800 bg-red-950/10' : 'border-zinc-800'}`}>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">{configured ? '✅' : '⚠️'}</span>
          <div>
            <div className={`font-terminal text-base ${configured ? 'text-red-400' : 'text-zinc-400'}`}>
              {configured ? 'YouTube API configured — videos active in game modals' : 'YouTube API not configured — video section hidden'}
            </div>
            <p className="text-zinc-600 font-terminal text-xs mt-0.5">
              {configured
                ? 'Game and console modals show playthrough, walkthrough, and review videos.'
                : 'Add YOUTUBE_API_KEY to .env.local to enable in-modal videos.'}
            </p>
          </div>
        </div>
        {!configured && (
          <div className="bg-zinc-900 border border-zinc-700 p-3 font-mono text-xs text-zinc-400 mt-2">
            <p className="text-zinc-500 mb-1"># Add to .env.local:</p>
            <p>YOUTUBE_API_KEY=AIzaSy...</p>
          </div>
        )}
        <p className="text-zinc-600 font-terminal text-xs mt-2">
          Free API key from <a href="https://console.cloud.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-400">console.cloud.google.com</a>.
          Enable &quot;YouTube Data API v3&quot;. Free quota: 10,000 units/day (100+ video lookups/day). Videos are cached after first load.
        </p>
      </div>
    </div>
  );
}

function BugReportingSettings({ config, setConfig }: { config: Config; setConfig: React.Dispatch<React.SetStateAction<Config | null>> }) {
  const [bugStatus, setBugStatus] = useState<{ configured: boolean; issuesUrl: string } | null>(null);
  useEffect(() => {
    fetch('/api/bug-report').then(r => r.json()).then(setBugStatus).catch(() => {});
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-zinc-400 font-terminal text-sm uppercase mb-1">GitHub Issues URL</label>
        <div className="flex gap-2 items-start">
          <input type="text"
            className="flex-1 bg-black border-2 border-zinc-800 text-zinc-300 p-2 font-terminal text-base focus:outline-none focus:border-green-600"
            placeholder="theretrovault/retrovault"
            value={config.githubRepo || ''}
            onChange={e => setConfig({ ...config, githubRepo: e.target.value })}
          />
          {config.githubRepo && (
            <a href={`https://github.com/${config.githubRepo}/issues`} target="_blank" rel="noopener noreferrer"
              className="px-3 py-2 font-terminal text-xs text-blue-400 border border-blue-800 hover:bg-blue-900/20 whitespace-nowrap">
              View Issues ↗
            </a>
          )}
        </div>
        <p className="text-zinc-600 font-terminal text-xs mt-1">The GitHub repo where bug reports will be filed (e.g. <code className="bg-zinc-900 px-1">yourname/retrovault</code>)</p>
      </div>

      <div className={`border-2 p-4 ${bugStatus?.configured ? 'border-green-800 bg-green-950/10' : 'border-zinc-800'}`}>
        <div className="flex items-center gap-3 mb-2">
          <span className={`text-2xl`}>{bugStatus?.configured ? '✅' : '⚠️'}</span>
          <div>
            <div className={`font-terminal text-base ${bugStatus?.configured ? 'text-green-400' : 'text-zinc-400'}`}>
              {bugStatus?.configured ? 'GitHub token configured — in-app reporting active' : 'GitHub token not configured — links to GitHub directly'}
            </div>
            <p className="text-zinc-600 font-terminal text-xs mt-0.5">
              {bugStatus?.configured
                ? 'Bug reports go directly to GitHub with duplicate detection and rate limiting.'
                : 'Add GITHUB_ISSUES_TOKEN to .env.local to enable in-app reporting.'}
            </p>
          </div>
        </div>
        {!bugStatus?.configured && (
          <div className="bg-zinc-900 border border-zinc-700 p-3 font-mono text-xs text-zinc-400 mt-2">
            <p className="text-zinc-500 mb-1"># Add to .env.local:</p>
            <p>GITHUB_ISSUES_TOKEN=github_pat_your_token_here</p>
          </div>
        )}
        <p className="text-zinc-600 font-terminal text-xs mt-2">
          Create a Fine-Grained token at github.com → Settings → Developer Settings → Fine-grained tokens.
          Set <strong>Issues: Write</strong> on your repo only. No other permissions needed.
        </p>
      </div>
    </div>
  );
}

// Hoisted outside SettingsPage to prevent focus loss on re-render
function Section({ id, title, icon, children }: { id: string; title: string; icon: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-36 bg-zinc-950 border-2 border-green-800 rounded-sm p-6 space-y-5">
      <h3 className="text-green-400 font-terminal text-2xl uppercase border-b border-green-900 pb-2">{icon} {title}</h3>
      {children}
    </section>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const settingsSections = useMemo(() => [
    { id: 'theme', label: 'Theme', icon: '🎨' },
    { id: 'identity', label: 'Identity', icon: '🏷️' },
    { id: 'localization', label: 'Localization', icon: '🌍' },
    { id: 'deployment', label: 'Deployment', icon: '🌐' },
    { id: 'price-data', label: 'Price Data', icon: '📊' },
    { id: 'platforms', label: 'Platforms', icon: '🕹️' },
    { id: 'scrapers', label: 'Scrapers', icon: '🔧' },
    { id: 'features', label: 'Features', icon: '🎛️' },
    { id: 'youtube', label: 'YouTube', icon: '📺' },
    { id: 'bug-reporting', label: 'Bug Reporting', icon: '🐛' },
    { id: 'authentication', label: 'Authentication', icon: '🔒' },
  ], []);
  const [config, setConfig] = useState<Config | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [openInfoId, setOpenInfoId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [platformStatus, setPlatformStatus] = useState("");

  useEffect(() => {
    fetch('/api/config').then(r => r.json()).then(setConfig);
  }, []);

  const syncPlatforms = async (previousPlatforms: string[], nextPlatforms: string[]) => {
    const PRUNE_CONFIRM_THRESHOLD = 10;
    const added = nextPlatforms.filter(platform => !previousPlatforms.includes(platform));
    const removed = previousPlatforms.filter(platform => !nextPlatforms.includes(platform));
    const messages: string[] = [];

    for (const platform of added) {
      const res = await fetch('/api/platforms/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, enabled: true, autoPopulate: true })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Could not enable ${platform}`);
      const addedCount = data?.sync?.populated?.added || 0;
      messages.push(
        addedCount > 0
          ? `📺 ${platform} enabled, ${addedCount.toLocaleString()} catalog games added.`
          : `📺 ${platform} enabled${data?.sync?.catalogFound === false ? ', catalog sync unavailable for this system yet.' : ', no new catalog games were needed.'}`
      );
    }

    for (const platform of removed) {
      const previewRes = await fetch('/api/platforms/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, enabled: false, previewOnly: true })
      });
      const preview = await previewRes.json().catch(() => ({}));
      if (!previewRes.ok) throw new Error(preview?.error || `Could not preview removal for ${platform}`);

      const previewRemoved = preview?.sync?.pruned?.removed || 0;
      const previewPreservedOwned = preview?.sync?.pruned?.preservedOwned || 0;
      const previewPreservedWatchlist = preview?.sync?.pruned?.preservedWatchlist || 0;
      const previewPreservedWishlist = preview?.sync?.pruned?.preservedWishlist || 0;

      if (previewRemoved > PRUNE_CONFIRM_THRESHOLD) {
        const confirmed = window.confirm(
          `Remove ${platform}? This will prune ${previewRemoved.toLocaleString()} untracked catalog game${previewRemoved === 1 ? '' : 's'} while keeping ${previewPreservedOwned} owned, ${previewPreservedWatchlist} watchlist, and ${previewPreservedWishlist} wishlist item${previewPreservedWishlist === 1 ? '' : 's'}.`
        );
        if (!confirmed) {
          messages.push(`🛑 ${platform} removal canceled. ${previewRemoved.toLocaleString()} catalog game${previewRemoved === 1 ? '' : 's'} would have been pruned.`);
          continue;
        }
      }

      const res = await fetch('/api/platforms/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, enabled: false })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Could not disable ${platform}`);
      const removedCount = data?.sync?.pruned?.removed || 0;
      const preservedOwned = data?.sync?.pruned?.preservedOwned || 0;
      const preservedWatchlist = data?.sync?.pruned?.preservedWatchlist || 0;
      const preservedWishlist = data?.sync?.pruned?.preservedWishlist || 0;
      messages.push(
        `🗑️ ${platform} removed, pruned ${removedCount.toLocaleString()} untracked catalog game${removedCount === 1 ? '' : 's'}${preservedOwned || preservedWatchlist || preservedWishlist ? `, kept ${preservedOwned} owned / ${preservedWatchlist} watchlist / ${preservedWishlist} wishlist.` : '.'}`
      );
    }

    return messages;
  };

  const save = async (updates: Partial<Config> & { newPassword?: string }) => {
    setSaving(true);
    setPlatformStatus('');
    try {
      const currentConfig = (config || {}) as Config;
      const previousPlatforms = Array.isArray(currentConfig.platforms) ? currentConfig.platforms : [];
      const nextPlatforms = Array.isArray(updates.platforms)
        ? updates.platforms
        : previousPlatforms;

      const configPayload = { ...updates } as Partial<Config> & { newPassword?: string };

      await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(configPayload)
      });

      const messages = await syncPlatforms(previousPlatforms, nextPlatforms);
      if (messages.length > 0) setPlatformStatus(messages.join(' '));

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      const refreshed = await fetch('/api/config').then(r => r.json());
      setConfig(refreshed);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSave = async () => {
    setPwError("");
    if (newPassword !== confirmPassword) { setPwError("Passwords don&apos;t match."); return; }
    await save({ newPassword });
    setNewPassword(""); setConfirmPassword("");
    fetch('/api/config').then(r => r.json()).then(setConfig);
  };

  if (!config) return <div className="text-green-500 font-terminal text-2xl animate-pulse p-6">LOADING CONFIG...</div>;

  const input = (key: TextConfigKey, label: string, type = "text", placeholder = "") => (
    <div>
      <label className="block text-zinc-400 font-terminal text-sm mb-1 uppercase">{label}</label>
      <input type={type} className="w-full bg-black border-2 border-green-800 text-green-300 p-2 font-terminal text-xl focus:outline-none focus:border-green-400"
        placeholder={placeholder} value={config[key] || ""}
        onChange={e => setConfig({ ...config, [key]: e.target.value })} />
    </div>
  );

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh] flex flex-col space-y-6">
      <header className="border-b-4 border-green-900 pb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-3xl shrink-0">⚙️</span>
          <h2 className="text-xl sm:text-3xl text-green-400 tracking-widest uppercase truncate">App Settings</h2>
        </div>
        <button onClick={() => save(config)} disabled={saving}
          className={`shrink-0 px-4 sm:px-6 py-2 font-terminal text-sm sm:text-xl font-bold transition-colors border-2 whitespace-nowrap ${saved ? "bg-emerald-600 text-black border-emerald-400" : "bg-green-600 hover:bg-green-500 text-black border-green-400"} disabled:opacity-50`}>
          {saved ? "✓ SAVED!" : saving ? "SAVING..." : "SAVE ALL"}
        </button>
      </header>

      <nav className="sticky top-[76px] z-30 -mx-2 rounded border border-green-900 bg-black/95 px-2 py-3 shadow-[0_0_12px_rgba(34,197,94,0.12)] backdrop-blur supports-[backdrop-filter]:bg-black/85">
        <div className="mb-2 text-zinc-500 font-terminal text-xs uppercase tracking-wide">Jump to section</div>
        <div className="flex flex-wrap gap-2">
          {settingsSections.map(section => (
            <a
              key={section.id}
              href={`#${section.id}`}
              className="px-3 py-1.5 font-terminal text-xs border border-zinc-700 text-zinc-400 hover:text-green-300 hover:border-green-600 hover:bg-green-950/30 transition-colors"
            >
              {section.icon} {section.label}
            </a>
          ))}
        </div>
      </nav>

      <Section id="theme" title="Theme" icon="🎨">
        {/* Light / Dark Mode Toggle */}
        <div>
          <label className="block text-zinc-400 font-terminal text-sm mb-3 uppercase">Mode</label>
          <div className="flex gap-3">
            {(["dark", "light"] as const).map(m => (
              <button key={m}
                onClick={() => setTheme({ ...theme, mode: m,
                  // Auto-switch style if current is mode-incompatible
                  styleId: (() => {
                    const st = STYLE_THEMES.find(s => s.id === theme.styleId);
                    if (m === 'light' && st?.modes === 'dark') return 'terminal';
                    if (m === 'dark'  && st?.modes === 'light') return 'terminal';
                    return theme.styleId;
                  })()
                })}
                className={`flex items-center gap-2 px-4 py-2 border-2 font-terminal text-sm transition-all ${
                  theme.mode === m
                    ? 'border-green-500 bg-green-900/20 text-green-300'
                    : 'border-zinc-700 text-zinc-500 hover:border-zinc-500'
                }`}>
                <span>{m === 'dark' ? '🌑' : '☀️'}</span>
                <span className="uppercase">{m === 'dark' ? 'Dark' : 'Light'}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Color Palette */}
        <div>
          <label className="block text-zinc-400 font-terminal text-sm mb-3 uppercase">Color Palette</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {COLOR_PALETTES.map(p => (
              <button key={p.id}
                onClick={() => setTheme({ ...theme, colorId: p.id })}
                style={{ borderColor: theme.colorId === p.id ? p.primary : undefined, boxShadow: theme.colorId === p.id ? `0 0 12px ${p.primaryGlow}` : undefined }}
                className={`p-3 text-left border-2 rounded-sm transition-all ${
                  theme.colorId === p.id ? "border-current" : "border-zinc-800 hover:border-zinc-600"
                }`}>
                <div className="flex items-center gap-2 mb-1">
                  <span>{p.emoji}</span>
                  <span className="font-terminal text-sm uppercase" style={{ color: p.primary }}>{p.name}</span>
                </div>
                <p className="text-zinc-600 font-terminal text-xs">{p.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Style Theme — filtered by current mode */}
        <div>
          <label className="block text-zinc-400 font-terminal text-sm mb-3 uppercase">
            Style Theme
            <span className="text-zinc-600 ml-2 normal-case">
              (showing {theme.mode === 'dark' ? 'dark' : 'light'} mode themes)
            </span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {STYLE_THEMES.filter(s => s.modes === 'both' || s.modes === theme.mode).map(s => (
              <button key={s.id}
                onClick={() => setTheme({ ...theme, styleId: s.id })}
                className={`p-3 text-left border-2 rounded-sm transition-all ${
                  theme.styleId === s.id ? "border-green-500 bg-green-900/20" : "border-zinc-800 hover:border-zinc-600"
                }`}>
                <div className="text-2xl mb-1">{s.emoji}</div>
                <div className="font-terminal text-sm text-green-400 uppercase mb-1">{s.name}</div>
                <p className="text-zinc-600 font-terminal text-xs">{s.description}</p>
              </button>
            ))}
          </div>
        </div>
        <p className="text-zinc-600 font-terminal text-xs">Theme changes apply instantly and are saved in your browser.</p>
      </Section>

      <Section id="identity" title="Identity" icon="🏷️">
        {input("appName", "App Name")}
        {input("tagline", "Tagline")}
        {input("ownerName", "Collection Owner Name", "text", "e.g. John's Collection")}
        {input("contactEmail", "Contact Email", "email", "shown on your public share page if enabled")}
        {input("contactPhone", "Contact Phone", "tel", "optional — shown on your public share page if enabled")}
        <div className="flex items-center gap-3">
          <button onClick={() => setConfig({ ...config, shareContact: !config.shareContact })}
            className={`w-10 h-6 rounded-full border-2 transition-colors relative ${
              config.shareContact ? "bg-green-600 border-green-400" : "bg-zinc-800 border-zinc-600"
            }`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
              config.shareContact ? "left-4" : "left-0.5"
            }`} />
          </button>
          <label className="text-zinc-400 font-terminal text-sm uppercase cursor-pointer" onClick={() => setConfig({ ...config, shareContact: !config.shareContact })}>
            Show contact info on public share page
          </label>
        </div>
        <div>
          <label className="block text-zinc-400 font-terminal text-sm mb-1 uppercase">Theme Color</label>
          <div className="flex gap-2 flex-wrap">
            {THEME_COLORS.map(c => (
              <button key={c} onClick={() => setConfig({ ...config, themeColor: c })}
                className={`px-4 py-2 font-terminal text-lg border-2 capitalize transition-colors ${config.themeColor === c ? "bg-green-600 text-black border-green-400" : "text-zinc-400 border-zinc-700 hover:border-zinc-400"}`}>
                {c}
              </button>
            ))}
          </div>
          <p className="text-zinc-600 font-terminal text-xs mt-1">Note: Theme color changes will take full effect after the next deployment.</p>
        </div>
      </Section>

      <Section id="localization" title="Localization" icon="🌍">
        <div>
          <label className="block text-zinc-400 font-terminal text-sm mb-1 uppercase">Currency Symbol</label>
          <input type="text" maxLength={3} className="w-24 bg-black border-2 border-green-800 text-green-300 p-2 font-terminal text-2xl text-center focus:outline-none focus:border-green-400"
            value={config.currency} onChange={e => setConfig({ ...config, currency: e.target.value })} />
        </div>
        <div>
          <label className="block text-zinc-400 font-terminal text-sm mb-1 uppercase">Date Format</label>
          <div className="flex gap-2">
            {[["US", "MM/DD/YYYY"], ["ISO", "YYYY-MM-DD"], ["EU", "DD/MM/YYYY"]].map(([fmt, example]) => (
              <button key={fmt} onClick={() => setConfig({ ...config, dateFormat: fmt })}
                className={`px-4 py-2 font-terminal text-lg border-2 transition-colors ${config.dateFormat === fmt ? "bg-green-600 text-black border-green-400" : "text-zinc-400 border-zinc-700 hover:border-zinc-400"}`}>
                {fmt} <span className="text-sm opacity-60">({example})</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-zinc-400 font-terminal text-sm mb-2 uppercase">Region / Price Market</label>
          <div className="flex gap-3 flex-wrap">
            {[
              { id: "NTSC", label: "NTSC (North America)", desc: "US prices — default" },
              { id: "PAL",  label: "PAL (Europe/Australia)", desc: "European prices" },
              { id: "JP",   label: "JP (Japan)", desc: "Japanese prices" },
            ].map(r => (
              <button key={r.id} onClick={() => setConfig({ ...config, region: r.id })}
                className={`px-4 py-2 font-terminal text-base border-2 transition-colors text-left ${
                  config.region === r.id || (!(config.region) && r.id === 'NTSC')
                    ? "bg-green-600 text-black border-green-400"
                    : "text-zinc-400 border-zinc-700 hover:border-zinc-400"
                }`}>
                <div>{r.label}</div>
                <div className="text-xs opacity-60">{r.desc}</div>
              </button>
            ))}
          </div>
          <p className="text-zinc-600 font-terminal text-xs mt-2">Controls which regional price data is used when fetching from PriceCharting. NTSC is the North American market (recommended for most users).</p>
        </div>
      </Section>

      <Section id="deployment" title="Deployment" icon="🌐">
        {input("publicUrl", "Public URL", "url", "https://retrovault.yourdomain.com")}
        <div>
          <label className="block text-zinc-400 font-terminal text-sm mb-2 uppercase">Mode</label>
          <div className="flex gap-3">
            <button onClick={() => setConfig({ ...config, standaloneMode: true })}
              className={`px-4 py-2 font-terminal text-lg border-2 transition-colors ${config.standaloneMode ? "bg-green-600 text-black border-green-400" : "text-zinc-400 border-zinc-700"}`}>
              STANDALONE
            </button>
            <button onClick={() => setConfig({ ...config, standaloneMode: false })}
              className={`px-4 py-2 font-terminal text-lg border-2 transition-colors ${!config.standaloneMode ? "bg-green-600 text-black border-green-400" : "text-zinc-400 border-zinc-700"}`}>
              EMBEDDED (Mission Control)
            </button>
          </div>
          <p className="text-zinc-600 font-terminal text-xs mt-1">Standalone shows the app&apos;s own navigation. Embedded uses Mission Control&apos;s sidebar.</p>
        </div>
      </Section>

      <Section id="price-data" title="Price Data" icon="📊">
        <div>
          <label className="block text-zinc-400 font-terminal text-sm mb-1 uppercase">Fetch Schedule (24h clock)</label>
          <input type="number" min={0} max={23}
            className="w-24 bg-black border-2 border-green-800 text-green-300 p-2 font-terminal text-2xl text-center focus:outline-none focus:border-green-400"
            value={config.fetchScheduleHour}
            onChange={e => setConfig({ ...config, fetchScheduleHour: parseInt(e.target.value) || 0 })} />
          <p className="text-zinc-600 font-terminal text-xs mt-1">Background price fetcher will run at this hour. Current: {config.fetchScheduleHour}:00. Note: crontab must be manually updated to match.</p>
        </div>
      </Section>

      <Section id="platforms" title="Platforms" icon="🕹️">
        <div>
          {platformStatus && (
            <div className="mb-4 border border-yellow-700 bg-yellow-950/20 p-3 text-yellow-300 font-terminal text-xs">
              {platformStatus}
            </div>
          )}
          <p className="text-zinc-500 font-terminal text-sm mb-4">Choose which platforms to track in your vault, analytics, and goals. Defaults to the original 14 retro systems.</p>

          {/* Quick presets */}
          <div className="flex flex-wrap gap-2 mb-5">
            {[
              { label: "Retro Only (default)", platforms: RETRO_DEFAULTS, color: "bg-green-700 border-green-500" },
              { label: "All Platforms", platforms: ALL_PLATFORMS, color: "bg-blue-700 border-blue-500" },
              { label: "Nintendo Only", platforms: ["NES","SNES","Nintendo 64","Gamecube","Wii","Wii U","Nintendo Switch","Switch 2","Game Boy","Game Boy Color","Virtual Boy","Game Boy Advance","Nintendo DS","Nintendo 3DS"], color: "bg-red-800 border-red-600" },
              { label: "PlayStation Only", platforms: ["PS1","PS2","PS3","PS4","PS5","PSP","PS Vita"], color: "bg-blue-800 border-blue-600" },
              { label: "None", platforms: [], color: "bg-zinc-800 border-zinc-600" },
            ].map(preset => (
              <button key={preset.label}
                onClick={() => setConfig({ ...config, platforms: preset.platforms })}
                className={`px-3 py-1.5 font-terminal text-xs border-2 text-white transition-colors ${preset.color} hover:opacity-80`}>
                {preset.label}
              </button>
            ))}
          </div>

          {/* Platform groups */}
          <div className="space-y-5">
            {PLATFORM_GROUPS.map(group => {
              const enabledInGroup = group.platforms.filter(p => (config.platforms || RETRO_DEFAULTS).includes(p)).length;
              return (
                <div key={group.id}>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-terminal text-sm text-zinc-400 uppercase">{group.icon} {group.label}</span>
                    <div className="flex gap-1">
                      <button onClick={() => {
                        const current = new Set(config.platforms || RETRO_DEFAULTS);
                        group.platforms.forEach(p => current.add(p));
                        setConfig({ ...config, platforms: [...current] });
                      }} className="font-terminal text-xs text-zinc-600 hover:text-green-400 transition-colors px-1">+all</button>
                      <button onClick={() => {
                        const current = new Set(config.platforms || RETRO_DEFAULTS);
                        group.platforms.forEach(p => current.delete(p));
                        setConfig({ ...config, platforms: [...current] });
                      }} className="font-terminal text-xs text-zinc-600 hover:text-red-400 transition-colors px-1">−all</button>
                    </div>
                    <span className="text-zinc-700 font-terminal text-xs ml-auto">{enabledInGroup}/{group.platforms.length}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.platforms.map(platform => {
                      const enabled = (config.platforms || RETRO_DEFAULTS).includes(platform);
                      return (
                        <button key={platform}
                          onClick={() => {
                            const current = new Set(config.platforms || RETRO_DEFAULTS);
                            if (enabled) current.delete(platform); else current.add(platform);
                            setConfig({ ...config, platforms: [...current] });
                          }}
                          className={`px-3 py-1.5 font-terminal text-sm border-2 transition-colors ${
                            enabled
                              ? 'bg-green-900/40 text-green-300 border-green-700'
                              : 'text-zinc-600 border-zinc-800 hover:border-zinc-600'
                          }`}>
                          {platform}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-zinc-600 font-terminal text-xs mt-4">
            {(config.platforms || RETRO_DEFAULTS).length} platform{(config.platforms || RETRO_DEFAULTS).length !== 1 ? 's' : ''} enabled.
            Changes take effect immediately after saving.
          </p>
        </div>
      </Section>

      <Section id="scrapers" title="Scrapers" icon="🔧">
        <div>
          <label className="block text-zinc-400 font-terminal text-sm mb-2 uppercase">Craigslist City</label>
          <div className="flex gap-2 flex-wrap items-start">
            <input type="text"
              className="bg-black border-2 border-zinc-800 text-zinc-300 p-2 font-terminal text-xl w-48 focus:outline-none focus:border-green-600"
              placeholder="portland"
              value={config.scrapers?.craigslistCity || ''}
              onChange={e => setConfig({ ...config, scrapers: { ...(config.scrapers || {}), craigslistCity: e.target.value } })} />
            <div className="flex flex-wrap gap-1">
              {['portland','seattle','chicago','boston','newyork','sfbay','denver','dallas','losangeles','atlanta','miami','detroit','minneapolis'].map(c => (
                <button key={c} onClick={() => setConfig({ ...config, scrapers: { ...(config.scrapers || {}), craigslistCity: c } })}
                  className="px-2 py-1 font-terminal text-xs border border-zinc-800 text-zinc-600 hover:text-zinc-300 hover:border-zinc-600 transition-colors">
                  {c}
                </button>
              ))}
            </div>
          </div>
          <p className="text-zinc-600 font-terminal text-xs mt-2">Used by the Craigslist scraper. Enter the subdomain slug from craigslist.org (e.g. &ldquo;portland&rdquo; for portland.craigslist.org)</p>
        </div>
        <div className="pt-2">
          <Link href="/scrapers" className="text-blue-500 hover:text-blue-400 font-terminal text-sm transition-colors">⚙️ Manage all scrapers →</Link>
        </div>
      </Section>

      <Section id="features" title="Features" icon="🎛️">
        <div className="flex items-center justify-between mb-3">
          <p className="text-zinc-500 font-terminal text-sm">Enable or disable feature groups. The navigation updates instantly to show only what you use. Collection is always on.</p>
          <button
            onClick={() => {
              localStorage.removeItem(ONBOARDING_KEY);
              localStorage.removeItem(`${ONBOARDING_KEY}-v`);
              window.location.reload();
            }}
            className="ml-4 shrink-0 px-3 py-1.5 font-terminal text-xs border border-green-800 text-green-600 hover:text-green-400 hover:border-green-600 transition-colors whitespace-nowrap"
          >
            ↺ Restart Setup Wizard
          </button>
        </div>
        <div className="border-2 border-pink-800 bg-pink-950/10 p-4 mb-4">
          <button
            onClick={() => setConfig({ ...config, autoSatisfyWishlistOnVaultAdd: config.autoSatisfyWishlistOnVaultAdd === false ? true : false })}
            className="w-full text-left"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-terminal text-lg">💝 Auto-satisfy wishlist when adding to Vault</span>
              <span className={`font-terminal text-xs px-2 py-0.5 border ${config.autoSatisfyWishlistOnVaultAdd === false ? 'text-zinc-600 border-zinc-700' : 'text-green-400 border-green-700'}`}>
                {config.autoSatisfyWishlistOnVaultAdd === false ? 'OFF' : 'ON'}
              </span>
            </div>
            <p className="text-zinc-400 font-terminal text-sm">When a Vault add matches a wishlist item, remove that wishlist entry automatically and show a session-only “put back on wishlist” undo button on the new row.</p>
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          {NAV_GROUPS.filter(g => !g.alwaysOn).map(group => {
            const enabled = config.features?.[group.id as keyof Features] ?? true;
            const infoOpen = openInfoId === group.id;
            return (
              <div key={group.id} className={`border-2 transition-all relative ${
                enabled ? 'border-green-700 bg-green-900/10' : 'border-zinc-800'
              } ${!enabled ? 'opacity-60' : ''}`}>
                {/* Main toggle row */}
                <button
                  onClick={() => setConfig({ ...config, features: { ...(config.features || {}), [group.id]: !enabled } as Features })}
                  className="w-full p-4 text-left">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-terminal text-lg">{group.icon} {group.label}</span>
                    <span className={`font-terminal text-xs px-2 py-0.5 border ${
                      enabled ? 'text-green-400 border-green-700' : 'text-zinc-600 border-zinc-700'
                    }`}>{enabled ? 'ON' : 'OFF'}</span>
                  </div>
                  <p className="text-zinc-600 font-terminal text-xs">{group.description}</p>
                </button>
                {/* Info button */}
                <button
                  onClick={e => { e.stopPropagation(); setOpenInfoId(infoOpen ? null : group.id); }}
                  className="absolute top-3 right-14 w-5 h-5 rounded-full border border-zinc-600 text-zinc-500 hover:text-zinc-200 hover:border-zinc-400 font-terminal text-xs flex items-center justify-center transition-colors"
                  title="What does this feature do?">
                  ?
                </button>
                {/* Info popover */}
                {infoOpen && (
                  <div className="border-t border-zinc-700 bg-zinc-900 px-4 py-3 mx-0">
                    <p className="text-zinc-300 font-terminal text-sm mb-2">{group.description}</p>
                    <ul className="space-y-1">
                      {group.benefits.map((b, i) => (
                        <li key={i} className="flex gap-2 font-terminal text-xs text-zinc-400">
                          <span className="text-green-700 shrink-0">▶</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 text-zinc-500 font-terminal text-xs">
                      {group.items.length} page{group.items.length !== 1 ? 's' : ''}: {group.items.map(i => i.label).join(', ')}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section id="youtube" title="YouTube Videos" icon="📺">
          <YouTubeSettings />
      </Section>

      <Section id="bug-reporting" title="Bug Reporting" icon="🐛">
        <BugReportingSettings config={config} setConfig={setConfig} />
      </Section>

      <Section id="authentication" title="Authentication" icon="🔒">
        <div className="flex items-center gap-4">
          <button onClick={() => setConfig({ ...config, auth: { ...config.auth, enabled: !config.auth?.enabled } })}
            className={`px-4 py-2 font-terminal text-xl border-2 transition-colors ${config.auth?.enabled ? "bg-green-600 text-black border-green-400" : "text-zinc-400 border-zinc-700"}`}>
            {config.auth?.enabled ? "AUTH: ENABLED" : "AUTH: DISABLED"}
          </button>
          <span className="text-zinc-500 font-terminal text-sm">Toggle to require a password to access the app</span>
        </div>
        {config.auth?.enabled && (
          <div className="space-y-3 pt-2 border-t border-zinc-800">
            <p className="text-zinc-400 font-terminal text-sm">
              Current password: <span className="text-green-400">{config.auth.passwordHash === '(set)' ? 'SET' : 'NOT SET'}</span>
            </p>
            <div>
              <label className="block text-zinc-400 font-terminal text-sm mb-1 uppercase">New Password</label>
              <input type="password" className="w-full bg-black border-2 border-green-800 text-green-300 p-2 font-terminal text-xl focus:outline-none focus:border-green-400"
                placeholder="Enter new password..." value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            </div>
            <div>
              <label className="block text-zinc-400 font-terminal text-sm mb-1 uppercase">Confirm Password</label>
              <input type="password" className="w-full bg-black border-2 border-green-800 text-green-300 p-2 font-terminal text-xl focus:outline-none focus:border-green-400"
                placeholder="Confirm new password..." value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
            </div>
            {pwError && <p className="text-red-500 font-terminal text-sm">{pwError}</p>}
            <button onClick={handlePasswordSave} className="px-4 py-2 font-terminal text-xl bg-blue-700 hover:bg-blue-600 text-white border-2 border-blue-500 transition-colors">
              SET PASSWORD
            </button>
            <p className="text-zinc-600 font-terminal text-xs">Leave blank and save to remove the password. Passwords are stored as SHA-256 hashes.</p>
          </div>
        )}
      </Section>
    </div>
  );
}
