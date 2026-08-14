"use client";

import { useMemo, useState } from "react";
import { parseSteamInput } from "@/lib/steam";

type ResolveResponse = {
  ok?: boolean;
  error?: string;
  resolved?: {
    kind: string;
    normalizedProfileUrl: string | null;
    guidance: string;
    importMode: string;
    canPreview: boolean;
    warnings: string[];
    suggestedPlatform: string;
  };
  preview?: {
    target: string;
    importMode: string;
    suggestedPlatform: string;
    steps: string[];
  } | null;
};

type FetchabilityResponse = {
  ok?: boolean;
  error?: string;
  target?: string;
  fetchability?: {
    httpStatus: number;
    isPrivate: boolean;
    hasProfileShell: boolean;
    loginWalledGames: boolean;
    readable: boolean;
    recommendation: string;
  };
};

type OwnedGamesPreviewResponse = {
  ok?: boolean;
  error?: string;
  platform?: string;
  dryRun?: boolean;
  summary?: {
    total: number;
    likelyMatch: number;
    possibleImport: number;
    needsReview: number;
  };
  rows?: Array<{
    title: string;
    platform: string;
    status: 'likely_match' | 'possible_import' | 'needs_review';
    matchedInventoryId: string | null;
    matchedTitle: string | null;
    matchedPlatform: string | null;
    notes: string;
  }>;
};

const SAMPLE_TITLES = [
  'Portal 2',
  'Half-Life 2',
  'The Elder Scrolls V: Skyrim',
  'Vampire Survivors',
  'Balatro',
];

export default function SteamPage() {
  const [input, setInput] = useState("");
  const [sampleTitles, setSampleTitles] = useState(SAMPLE_TITLES.join('\n'));
  const [loading, setLoading] = useState(false);
  const [fetchabilityLoading, setFetchabilityLoading] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [result, setResult] = useState<ResolveResponse | null>(null);
  const [fetchability, setFetchability] = useState<FetchabilityResponse | null>(null);
  const [ownedPreview, setOwnedPreview] = useState<OwnedGamesPreviewResponse | null>(null);
  const parsed = useMemo(() => parseSteamInput(input), [input]);

  const canPrep = Boolean(parsed.normalizedProfileUrl);

  const runPreview = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/steam/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      const data = await response.json();
      setResult(data);
    } catch {
      setResult({ error: 'Failed to preview Steam import target.' });
    } finally {
      setLoading(false);
    }
  };

  const runFetchabilityCheck = async () => {
    if (!input.trim()) {
      setFetchability({ error: 'Enter a Steam profile target first.' });
      return;
    }

    setFetchabilityLoading(true);
    setFetchability(null);
    try {
      const response = await fetch('/api/steam/fetchability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      const data = await response.json();
      setFetchability(data);
    } catch {
      setFetchability({ error: 'Failed to check Steam profile fetchability.' });
    } finally {
      setFetchabilityLoading(false);
    }
  };

  const runOwnedGamesPreview = async () => {
    const titles = sampleTitles
      .split(/\r?\n/)
      .map((title) => title.trim())
      .filter(Boolean);

    if (titles.length === 0) {
      setOwnedPreview({ error: 'Add at least one game title to preview owned-games mapping.' });
      return;
    }

    setPreviewLoading(true);
    setOwnedPreview(null);
    try {
      const response = await fetch('/api/steam/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ titles, platform: 'PC (Steam)' }),
      });
      const data = await response.json();
      setOwnedPreview(data);
    } catch {
      setOwnedPreview({ error: 'Failed to build owned-games preview.' });
    } finally {
      setPreviewLoading(false);
    }
  };

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      <div className="border-b-4 border-green-900 pb-6 mb-6">
        <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">♨️ Steam Connector</h2>
        <p className="text-zinc-500 font-terminal text-sm mt-2 max-w-3xl">
          Steam groundwork is now at the dry-run pipeline stage: target resolution, preview framing, and owned-games mapping
          into likely matches, possible imports, and needs-review rows.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-6">
          <section className="bg-zinc-950 border-2 border-green-800 rounded-sm p-5 space-y-4">
            <h3 className="text-green-400 font-terminal text-2xl uppercase border-b border-green-900 pb-2">🎯 Import Target</h3>

            <div className="space-y-2">
              <label className="block text-zinc-500 font-terminal text-xs uppercase tracking-wide">
                Steam profile URL, vanity name, or SteamID64
              </label>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="https://steamcommunity.com/id/example or 7656119..."
                className="w-full bg-black border-2 border-green-800 p-3 text-green-300 focus:outline-none focus:border-green-400 font-terminal"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border border-zinc-800 bg-black/40 p-3">
                <div className="text-zinc-600 font-terminal text-xs uppercase">Detected Type</div>
                <div className="text-green-300 font-terminal text-lg mt-1">{parsed.kind}</div>
              </div>
              <div className="border border-zinc-800 bg-black/40 p-3">
                <div className="text-zinc-600 font-terminal text-xs uppercase">Normalized Target</div>
                <div className="text-green-300 font-terminal text-sm mt-1 break-all">{parsed.normalizedProfileUrl || "—"}</div>
              </div>
            </div>

            <div className="border border-blue-900 bg-blue-950/20 p-3">
              <div className="text-blue-400 font-terminal text-xs uppercase mb-1">Connector Read</div>
              <div className="text-zinc-300 font-terminal text-sm">{parsed.guidance}</div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {[
                "https://steamcommunity.com/id/yourname",
                "https://steamcommunity.com/profiles/76561198000000000",
                "76561198000000000",
                "yourname",
              ].map((sample) => (
                <button
                  key={sample}
                  onClick={() => setInput(sample)}
                  className="px-3 py-1.5 font-terminal text-xs border border-zinc-700 text-zinc-400 hover:text-green-300 hover:border-green-600 hover:bg-green-950/30 transition-colors"
                >
                  {sample}
                </button>
              ))}
            </div>

            <div className="pt-2 flex flex-wrap gap-3 items-center">
              <button
                disabled={!canPrep || loading}
                onClick={runPreview}
                className={`px-4 py-2 font-terminal text-sm uppercase border rounded-sm transition-colors ${
                  canPrep && !loading
                    ? "text-black bg-green-500 border-green-400 hover:bg-green-400"
                    : "text-zinc-600 bg-zinc-900 border-zinc-800 cursor-not-allowed"
                }`}
              >
                {loading ? 'Preparing Preview...' : 'Prepare Import Target'}
              </button>
              <p className="text-zinc-600 font-terminal text-xs">
                Dry-run only for now. No inventory writes, no duplicate roulette.
              </p>
            </div>

            {result?.error && (
              <div className="border border-red-900 bg-red-950/20 p-3 text-red-300 font-terminal text-sm">
                {result.error}
              </div>
            )}

            {result?.resolved && (
              <div className="border border-green-900 bg-green-950/20 p-4 space-y-3">
                <div>
                  <div className="text-green-400 font-terminal text-xs uppercase mb-1">Dry-Run Resolution</div>
                  <div className="text-zinc-200 font-terminal text-sm">Mode: {result.resolved.importMode}</div>
                  <div className="text-zinc-400 font-terminal text-sm">Platform target: {result.resolved.suggestedPlatform}</div>
                </div>
                <ul className="space-y-1 text-zinc-300 font-terminal text-sm">
                  {result.resolved.warnings.map((warning) => (
                    <li key={warning}>• {warning}</li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="bg-zinc-950 border-2 border-green-800 rounded-sm p-5 space-y-4">
            <h3 className="text-green-400 font-terminal text-2xl uppercase border-b border-green-900 pb-2">🌐 Public Profile Fetchability</h3>
            <p className="text-zinc-500 font-terminal text-sm">
              Before live owned-games import can ever work, RetroVault needs to know whether the Steam profile is publicly readable right now.
            </p>
            <div className="flex flex-wrap gap-3 items-center">
              <button
                disabled={!canPrep || fetchabilityLoading}
                onClick={runFetchabilityCheck}
                className={`px-4 py-2 font-terminal text-sm uppercase border rounded-sm transition-colors ${
                  canPrep && !fetchabilityLoading
                    ? "text-black bg-green-500 border-green-400 hover:bg-green-400"
                    : "text-zinc-600 bg-zinc-900 border-zinc-800 cursor-not-allowed"
                }`}
              >
                {fetchabilityLoading ? 'Checking Visibility...' : 'Check Public Fetchability'}
              </button>
              <p className="text-zinc-600 font-terminal text-xs">Dry-run visibility detection only.</p>
            </div>

            {fetchability?.error && (
              <div className="border border-red-900 bg-red-950/20 p-3 text-red-300 font-terminal text-sm">
                {fetchability.error}
              </div>
            )}

            {fetchability?.fetchability && (
              <div className="border border-green-900 bg-green-950/20 p-4 space-y-3">
                <div className="text-zinc-300 font-terminal text-sm break-all">Target: {fetchability.target}</div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="border border-zinc-800 bg-black/40 p-3">
                    <div className="text-zinc-600 font-terminal text-xs uppercase">HTTP</div>
                    <div className="text-green-300 font-terminal text-lg mt-1">{fetchability.fetchability.httpStatus}</div>
                  </div>
                  <div className="border border-zinc-800 bg-black/40 p-3">
                    <div className="text-zinc-600 font-terminal text-xs uppercase">Readable</div>
                    <div className={`font-terminal text-lg mt-1 ${fetchability.fetchability.readable ? 'text-emerald-300' : 'text-yellow-300'}`}>
                      {fetchability.fetchability.readable ? 'yes' : 'not yet'}
                    </div>
                  </div>
                </div>
                <ul className="space-y-1 text-zinc-300 font-terminal text-sm">
                  <li>• Private profile detected: {fetchability.fetchability.isPrivate ? 'yes' : 'no'}</li>
                  <li>• Public profile shell detected: {fetchability.fetchability.hasProfileShell ? 'yes' : 'no'}</li>
                  <li>• Old games endpoint looks login-walled: {fetchability.fetchability.loginWalledGames ? 'yes' : 'no'}</li>
                </ul>
                <div className="text-zinc-400 font-terminal text-sm">{fetchability.fetchability.recommendation}</div>
              </div>
            )}
          </section>

          <section className="bg-zinc-950 border-2 border-green-800 rounded-sm p-5 space-y-4">
            <h3 className="text-green-400 font-terminal text-2xl uppercase border-b border-green-900 pb-2">🧪 Owned Games Mapping Preview</h3>
            <p className="text-zinc-500 font-terminal text-sm">
              Next-slice seam: paste sample Steam titles and RetroVault will classify what likely already exists, what looks importable,
              and what needs human review before any real import lands.
            </p>
            <textarea
              value={sampleTitles}
              onChange={(e) => setSampleTitles(e.target.value)}
              rows={8}
              className="w-full bg-black border-2 border-green-800 p-3 text-green-300 focus:outline-none focus:border-green-400 font-terminal"
              placeholder="One Steam game title per line"
            />
            <div className="flex flex-wrap gap-3 items-center">
              <button
                onClick={runOwnedGamesPreview}
                disabled={previewLoading}
                className={`px-4 py-2 font-terminal text-sm uppercase border rounded-sm transition-colors ${
                  !previewLoading
                    ? "text-black bg-green-500 border-green-400 hover:bg-green-400"
                    : "text-zinc-600 bg-zinc-900 border-zinc-800 cursor-not-allowed"
                }`}
              >
                {previewLoading ? 'Mapping Titles...' : 'Preview Owned Games Mapping'}
              </button>
              <p className="text-zinc-600 font-terminal text-xs">Dry-run mapping only, still no writes.</p>
            </div>

            {ownedPreview?.error && (
              <div className="border border-red-900 bg-red-950/20 p-3 text-red-300 font-terminal text-sm">
                {ownedPreview.error}
              </div>
            )}

            {ownedPreview?.summary && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="border border-zinc-800 bg-black/40 p-3 text-center">
                  <div className="text-green-400 font-terminal text-xl">{ownedPreview.summary.total}</div>
                  <div className="text-zinc-600 font-terminal text-xs">Titles</div>
                </div>
                <div className="border border-zinc-800 bg-black/40 p-3 text-center">
                  <div className="text-blue-400 font-terminal text-xl">{ownedPreview.summary.likelyMatch}</div>
                  <div className="text-zinc-600 font-terminal text-xs">Likely Match</div>
                </div>
                <div className="border border-zinc-800 bg-black/40 p-3 text-center">
                  <div className="text-emerald-400 font-terminal text-xl">{ownedPreview.summary.possibleImport}</div>
                  <div className="text-zinc-600 font-terminal text-xs">Possible Import</div>
                </div>
                <div className="border border-zinc-800 bg-black/40 p-3 text-center">
                  <div className="text-yellow-400 font-terminal text-xl">{ownedPreview.summary.needsReview}</div>
                  <div className="text-zinc-600 font-terminal text-xs">Needs Review</div>
                </div>
              </div>
            )}

            {ownedPreview?.rows && ownedPreview.rows.length > 0 && (
              <div className="overflow-x-auto border border-zinc-800">
                <table className="w-full font-terminal text-sm">
                  <thead>
                    <tr className="border-b border-green-900 text-zinc-500 uppercase text-xs">
                      <th className="text-left p-3">Title</th>
                      <th className="text-left p-3">Status</th>
                      <th className="text-left p-3">Matched Entry</th>
                      <th className="text-left p-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownedPreview.rows.map((row) => (
                      <tr key={`${row.platform}-${row.title}`} className="border-b border-zinc-900 hover:bg-zinc-900/30">
                        <td className="p-3 text-zinc-200">{row.title}</td>
                        <td className="p-3">
                          <span className={`px-2 py-1 border text-xs ${
                            row.status === 'likely_match'
                              ? 'text-blue-300 border-blue-800'
                              : row.status === 'possible_import'
                                ? 'text-emerald-300 border-emerald-800'
                                : 'text-yellow-300 border-yellow-800'
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="p-3 text-zinc-400">{row.matchedTitle ? `${row.matchedTitle} (${row.matchedPlatform})` : '—'}</td>
                        <td className="p-3 text-zinc-500">{row.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-zinc-950 border-2 border-green-800 rounded-sm p-5 space-y-3">
            <h3 className="text-green-400 font-terminal text-2xl uppercase border-b border-green-900 pb-2">🔒 Privacy Workflow</h3>
            <ol className="space-y-2 text-sm font-terminal text-zinc-300 list-decimal pl-5">
              <li>Open your Steam profile privacy settings.</li>
              <li>Temporarily set <span className="text-green-400">Game details</span> to <span className="text-green-400">Public</span>.</li>
              <li>Run the import once RetroVault’s live fetch step is wired.</li>
              <li>Set the profile back to your preferred privacy level right after import.</li>
            </ol>
            <p className="text-zinc-500 font-terminal text-xs">
              Standing doctrine: low-friction and privacy-aware beats creepy. We guide the user through the least-weird path first.
            </p>
          </section>

          <section className="bg-zinc-950 border-2 border-green-800 rounded-sm p-5 space-y-3">
            <h3 className="text-green-400 font-terminal text-2xl uppercase border-b border-green-900 pb-2">🧱 Planned Connector Slices</h3>
            <ul className="space-y-2 text-sm font-terminal text-zinc-300">
              <li>• Public-profile owned-games fetch when the Steam target is actually readable</li>
              <li>• Title normalization + dedupe preview before any import</li>
              <li>• Future inventory write path only after dry-run rows prove trustworthy</li>
              <li>• Optional local export/import flow for zero-profile-exposure users</li>
            </ul>
          </section>

          <section className="bg-zinc-950 border-2 border-yellow-900 rounded-sm p-5 space-y-3">
            <h3 className="text-yellow-400 font-terminal text-2xl uppercase border-b border-yellow-900 pb-2">⚠️ Not In This Pass</h3>
            <ul className="space-y-2 text-sm font-terminal text-zinc-300">
              <li>• No hardcoded API keys or tokens</li>
              <li>• No pretending private libraries are readable when they are not</li>
              <li>• No auto-import into inventory until the fetch/mapping path is testable and trustworthy</li>
              <li>• No Steam API-key mode yet, that stays deferred</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
