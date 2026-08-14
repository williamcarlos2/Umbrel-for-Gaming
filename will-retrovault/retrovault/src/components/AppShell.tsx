"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { DemoProvider, useDemoMode } from "@/components/DemoMode";
import { Tip, TooltipProvider, useTooltips } from "@/components/Tooltip";
import { AppConfigProvider, useAppConfig } from "@/components/AppConfig";
import { StandaloneNav } from "@/components/StandaloneNav";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthGuard, useLogout } from "@/components/AuthGuard";
import { QuoteBanner } from "@/components/QuoteBanner";
import { SYSTEM_ITEMS, getEnabledGroups, type NavGroup } from "@/data/navConfig";
import { KeyboardShortcuts } from "@/components/KeyboardShortcuts";
import { GlobalSearch } from "@/components/GlobalSearch";
import { BugReportModal } from "@/components/BugReportModal";
import { ToastProvider } from "@/components/Toast";
import { WhatsNew } from "@/components/WhatsNew";
import { Onboarding } from "@/components/Onboarding";
import { EnvironmentBadge } from "@/components/EnvironmentBadge";
import pkg from "../../package.json";

function LogoutButton({ logout }: { logout: () => void }) {
  const [authEnabled, setAuthEnabled] = useState(false);
  useEffect(() => {
    fetch("/api/auth").then(r => r.json()).then(d => setAuthEnabled(!!d.authEnabled)).catch(() => {});
  }, []);
  if (!authEnabled) return null;
  return (
    <button onClick={logout}
      className="w-full text-left px-3 py-1 font-terminal text-sm text-red-600 hover:text-red-400 hover:bg-red-900/20 transition-colors uppercase">
      ⏻ LOGOUT
    </button>
  );
}

function NavGroup({ group, collapsed }: { group: NavGroup; collapsed: boolean }) {
  const pathname = usePathname();
  const hasActive = group.items.some(i => pathname === i.href);
  const [open, setOpen] = useState<boolean>(hasActive || true);

  if (collapsed) {
    // Icon-only: show first item's icon as group representative
    return (
      <div className="space-y-2">
        {group.items.map(item => (
          <Link key={item.href} href={item.href} title={item.label}
            className={`flex items-center justify-center w-8 h-8 mx-auto rounded-sm transition-colors ${
              pathname === item.href ? "bg-green-600 text-black" : "text-green-600 hover:text-green-300"
            }`}>
            <span className="text-sm">{item.icon}</span>
          </Link>
        ))}
      </div>
    );
  }

  return (
    <div>
      <button onClick={() => setOpen(!open)}
        className={`w-full flex items-center justify-between px-3 py-1.5 font-terminal text-xs uppercase tracking-widest transition-colors ${
          hasActive ? "text-green-400" : "text-zinc-500 hover:text-zinc-300"
        }`}>
        <span className="flex items-center gap-1.5">
          <span>{group.icon}</span>
          <span>{group.label}</span>
        </span>
        <span className="text-xs opacity-60">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="ml-2 border-l border-zinc-800 pl-2 space-y-0.5 mb-1">
          {group.items.map(item => (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2 px-2 py-1.5 font-terminal text-sm rounded-sm transition-colors truncate ${
                pathname === item.href
                  ? "text-black bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]"
                  : "text-green-400 hover:text-green-200 hover:bg-green-900/20"
              }`}>
              <span className="text-xs shrink-0">{item.icon}</span>
              <span className="truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ScraperHealthChip({ onReportIssue }: { onReportIssue: (context: { title: string; description: string; metadata: Record<string, unknown> }) => void }) {
  const [health, setHealth] = useState<{
    degraded: boolean;
    severity: 'info' | 'warning' | 'critical';
    activeIssueCount: number;
    activeIssues: Array<{ id: string; name: string; message: string; userImpact: string; lastRun: string | null; severity: 'info' | 'warning' | 'critical'; state: string }>;
  } | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch('/api/scraper-health')
      .then((r) => r.json())
      .then((d) => setHealth(d))
      .catch(() => {});
  }, []);

  if (!health?.degraded) return null;

  const tone = health.severity === 'critical'
    ? 'bg-red-950 border-red-600 text-red-300 shadow-[0_0_18px_rgba(220,38,38,0.28)]'
    : 'bg-yellow-950 border-yellow-600 text-yellow-300 shadow-[0_0_18px_rgba(234,179,8,0.25)]';

  return (
    <div className={`fixed bottom-4 right-4 z-40 max-w-md border-2 px-4 py-3 ${tone}`}>
      <button onClick={() => setOpen(!open)} className="w-full text-left">
        <div className="font-terminal text-sm uppercase tracking-wide">
          ⚠ Scraper Issues Detected ({health.activeIssueCount})
        </div>
        <div className="font-terminal text-xs mt-1 opacity-90">
          {health.activeIssues[0]?.userImpact || 'Some automated data may be stale.'}
        </div>
      </button>

      {open && (
        <div className="mt-3 space-y-3 border-t border-current/30 pt-3">
          {health.activeIssues.map((issue) => (
            <div key={issue.id} className="font-terminal text-xs">
              <div className="uppercase text-[11px] opacity-80">{issue.name}</div>
              <div className="mt-1">{issue.message}</div>
              <div className="mt-1 opacity-80">{issue.userImpact}</div>
              {issue.lastRun ? <div className="mt-1 opacity-70">Last run: {new Date(issue.lastRun).toLocaleString()}</div> : null}
            </div>
          ))}
          <button
            onClick={() => onReportIssue({
              title: `Scraper degradation: ${health.activeIssues.map((issue) => issue.name).slice(0, 2).join(', ')}`,
              description: 'One or more RetroVault scrapers appear degraded or down. This report was opened from the scraper health chip.',
              metadata: {
                scraperHealth: health,
              },
            })}
            className="w-full border border-current/40 px-3 py-2 font-terminal text-xs uppercase hover:bg-black/20 transition-colors"
          >
            Report Issue
          </button>
        </div>
      )}
    </div>
  );
}

function MCLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [bugOpen, setBugOpen] = useState(false);
  const [bugContext, setBugContext] = useState<{ title?: string; description?: string; metadata?: Record<string, unknown> } | null>(null);
  const pathname = usePathname();
  const { start: startDemo } = useDemoMode();
  const { enabled: tooltipsEnabled, toggle: toggleTooltips } = useTooltips();
  const { features, runtimeEnv } = useAppConfig();
  const runtimeTrack = (runtimeEnv || "dev").toUpperCase();
  const logout = useLogout();

  const enabledGroups = getEnabledGroups(features);

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950">
      {/* Sidebar Toggle (desktop) */}
      <button onClick={() => setSidebarOpen(!sidebarOpen)}
        className="hidden md:flex fixed top-4 left-4 z-50 w-8 h-8 items-center justify-center text-green-500 hover:text-green-300 bg-black border border-green-800 rounded-sm transition-all hover:border-green-500 shadow-[0_0_8px_rgba(34,197,94,0.2)]"
        title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}>
        {sidebarOpen ? "◀" : "▶"}
      </button>

      {/* Mobile Top Bar */}
      <div className="md:hidden bg-black border-b-2 border-green-900 p-4 flex items-center justify-between">
        <h1 className="text-xl text-green-500 tracking-widest uppercase font-terminal">M1SS10N C0NTR0L</h1>
        <button onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-green-500 hover:text-green-300 border border-green-800 px-3 py-1 font-terminal text-sm">
          {sidebarOpen ? "HIDE" : "NAV"}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`bg-black border-r-4 border-green-900 flex flex-col shrink-0 relative z-10 shadow-[5px_0_15px_rgba(34,197,94,0.1)] transition-all duration-300 overflow-hidden
        ${sidebarOpen ? "w-full md:w-56 p-4" : "w-0 md:w-12 p-0 md:py-4 md:px-2"}`}>
        {sidebarOpen ? (
          <>
            {/* Logo */}
            <div className="mb-5 mt-6 px-2 space-y-2">
              <h1 className="text-green-500 font-terminal text-base tracking-widest uppercase drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]">
                M1SS10N C0NTR0L
              </h1>
              <p className="text-green-700 font-terminal text-xs mt-0.5">v{pkg.version} {runtimeTrack} ONLINE</p>
              <EnvironmentBadge />
            </div>

            {/* Grouped nav */}
            <nav className="flex-1 space-y-1 overflow-y-auto min-h-0 pr-1">
              {enabledGroups.map(group => (
                <NavGroup key={group.id} group={group} collapsed={false} />
              ))}
              {/* System items */}
              <div className="pt-2 border-t border-zinc-900 space-y-0.5">
                {SYSTEM_ITEMS.map(item => (
                  <Link key={item.href} href={item.href}
                    className={`flex items-center gap-2 px-3 py-1.5 font-terminal text-sm rounded-sm transition-colors ${
                      pathname === item.href ? "text-black bg-green-500" : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/30"
                    }`}>
                    <span className="text-xs">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </nav>

            {/* Footer controls */}
            <div className="mt-3 pt-3 border-t border-green-900/50 space-y-1 shrink-0">
              <Tip text="Search pages, tools, and key records from anywhere in the app.">
                <button onClick={() => setSearchOpen(true)}
                  className="w-full text-left px-3 py-1 font-terminal text-xs text-green-700 hover:text-green-400 hover:bg-green-900/10 transition-colors uppercase">
                  🔍 SEARCH <span className='opacity-40 ml-1'>/</span>
                </button>
              </Tip>
              <Tip text="Open the bug report flow with optional context when something is broken, confusing, or worth improving.">
                <button onClick={() => { setBugContext(null); setBugOpen(true); }}
                  className="w-full text-left px-3 py-1 font-terminal text-xs text-orange-700 hover:text-orange-500 hover:bg-orange-900/10 transition-colors uppercase">
                  🐛 REPORT ISSUE
                </button>
              </Tip>
              <Tip text="Launch a guided walkthrough that shows off the main RetroVault surfaces and workflows.">
                <button onClick={() => startDemo()}
                  className="w-full text-left px-3 py-1 font-terminal text-xs text-yellow-600 hover:text-yellow-400 hover:bg-yellow-900/10 transition-colors uppercase">
                  ▶ DEMO MODE
                </button>
              </Tip>
              <Tip text={tooltipsEnabled ? "Tooltips are on. Hover supported controls and dropdown actions for extra guidance." : "Turn tooltips on to get inline help across navigation, tools, and action menus."}>
                <button onClick={toggleTooltips}
                  title={tooltipsEnabled ? "Tooltips are ON — hover elements to see hints. Click to disable." : "Tooltips are OFF — click to enable hover hints throughout the app."}
                  className={`w-full text-left px-3 py-1 font-terminal text-xs transition-colors uppercase ${
                    tooltipsEnabled ? "text-blue-400 hover:text-blue-200" : "text-zinc-600 hover:text-zinc-400"
                  }`}>
                  💡 TIPS: {tooltipsEnabled ? "ON" : "OFF"}
                </button>
              </Tip>
              <LogoutButton logout={logout} />
              <div className="flex items-center gap-2 pt-1 px-3">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-green-900 font-terminal text-xs">OPTIMAL</span>
              </div>
            </div>
          </>
        ) : (
          /* Collapsed icon-only */
          <div className="hidden md:flex flex-col items-center space-y-3 mt-10">
            {enabledGroups.flatMap(g => g.items).slice(0, 12).map(item => (
              <Link key={item.href} href={item.href} title={item.label}
                className={`text-base transition-colors ${pathname === item.href ? "text-green-400" : "text-green-800 hover:text-green-400"}`}>
                {item.icon}
              </Link>
            ))}
            <Link href="/settings" title="Settings" className="text-zinc-700 hover:text-zinc-400 text-base transition-colors">⚙️</Link>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 h-screen overflow-y-auto relative z-0">
        <QuoteBanner />
        <div className="p-6 md:p-10 w-full max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
      <KeyboardShortcuts onSearch={() => setSearchOpen(true)} />
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      {bugOpen && <BugReportModal onClose={() => setBugOpen(false)} initialContext={bugContext || undefined} />}
      <ScraperHealthChip onReportIssue={(context) => { setBugContext(context); setBugOpen(true); }} />
      <WhatsNew />
      <Onboarding />
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const { standaloneMode } = useAppConfig();
  if (standaloneMode) return <StandaloneNav>{children}</StandaloneNav>;
  return <MCLayout>{children}</MCLayout>;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ThemeProvider>
        <AppConfigProvider>
          <DemoProvider>
            <TooltipProvider>
              <AuthGuard>
                <Shell>{children}</Shell>
              </AuthGuard>
            </TooltipProvider>
          </DemoProvider>
        </AppConfigProvider>
      </ThemeProvider>
    </ToastProvider>
  );
}
