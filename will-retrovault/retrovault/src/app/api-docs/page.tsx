"use client";
import { useState, useEffect, useCallback } from "react";

type ApiKey = { id: string; name: string; prefix: string; permissions: string; createdAt: string; lastUsed: string | null };
type Endpoint = { path: string; method: string; summary: string; params?: string[] };

const ENDPOINTS: Endpoint[] = [
  // ── Collection API (v1, requires API key) ──────────────────────────────────
  { path: "/api/v1/inventory",   method: "GET",    summary: "List all games in catalog", params: ["platform", "owned", "q", "has_price", "sort", "limit", "offset"] },
  { path: "/api/v1/collection",  method: "GET",    summary: "Collection summary stats and KPIs" },
  { path: "/api/v1/sales",       method: "GET",    summary: "Sales and acquisition history", params: ["type", "limit", "offset"] },
  { path: "/api/v1/watchlist",   method: "GET",    summary: "Target Radar items with live price alert status" },
  { path: "/api/v1/grails",      method: "GET",    summary: "Holy Grail tracker", params: ["status: all|hunting|found"] },
  { path: "/api/v1/achievements",method: "GET",    summary: "Achievement unlock status and progress" },
  { path: "/api/v1/health",      method: "GET",    summary: "System health and data quality metrics" },
  { path: "/api/v1/keys",        method: "GET",    summary: "List API keys (write key required)" },
  { path: "/api/v1/keys",        method: "POST",   summary: "Create API key (write key required)" },
  { path: "/api/v1/keys?id=",    method: "DELETE", summary: "Revoke API key (write key required)" },
  // ── Wishlist API (no key required — local use only) ────────────────────────
  { path: "/api/wishlist",                    method: "GET",    summary: "List all wishlist items (ordered by priority)" },
  { path: "/api/wishlist",                    method: "POST",   summary: "Add item — body: { title, platform, priority?, notes?, gameId? }" },
  { path: "/api/wishlist/[id]",               method: "PATCH",  summary: "Update item — body: { priority?, notes?, foundAt? }" },
  { path: "/api/wishlist/[id]",               method: "DELETE", summary: "Remove item from wishlist" },
  { path: "/api/wishlist/share",              method: "GET",    summary: "Get (or create) public share token" },
  { path: "/api/wishlist/share",              method: "DELETE", summary: "Regenerate share token (revokes old link)" },
  { path: "/api/wishlist/public/[token]",     method: "GET",    summary: "Public read-only wishlist view — no auth required" },
];

export default function ApiDocsPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyPerms, setNewKeyPerms] = useState<"read" | "write">("read");
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [masterKey, setMasterKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadKeys = useCallback(async () => {
    if (!masterKey) return;
    const res = await fetch('/api/v1/keys', { headers: { 'X-RetroVault-Key': masterKey } });
    if (res.ok) { const d = await res.json(); setKeys(d.data || []); }
  }, [masterKey]);

  useEffect(() => {
    if (!masterKey) return;
    void (async () => { await loadKeys(); })();
  }, [masterKey, loadKeys]);

  const createKey = async () => {
    if (!newKeyName.trim() || !masterKey) return;
    setLoading(true);
    const res = await fetch('/api/v1/keys', {
      method: 'POST',
      headers: { 'X-RetroVault-Key': masterKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newKeyName, permissions: newKeyPerms }),
    });
    if (res.ok) {
      const d = await res.json();
      setCreatedKey(d.data?.key);
      setNewKeyName("");
      loadKeys();
    }
    setLoading(false);
  };

  const revokeKey = async (id: string) => {
    if (!masterKey || !confirm('Revoke this key?')) return;
    await fetch(`/api/v1/keys?id=${id}`, { method: 'DELETE', headers: { 'X-RetroVault-Key': masterKey } });
    loadKeys();
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      <div className="border-b-4 border-green-900 pb-6 mb-6">
        <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">🔌 RetroVault API</h2>
        <p className="text-zinc-500 font-terminal text-sm mt-1">v1.0 · RESTful · JSON responses · API key auth</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* API Reference */}
        <div className="space-y-5">
          <div>
            <h3 className="text-zinc-300 font-terminal text-xl uppercase mb-4">Authentication</h3>
            <div className="bg-zinc-900 border border-zinc-700 p-4 space-y-3 font-mono text-sm">
              <p className="text-zinc-400"># Option 1: Header</p>
              <p className="text-green-300">X-RetroVault-Key: rvk_your_key_here</p>
              <p className="text-zinc-400 mt-2"># Option 2: Bearer token</p>
              <p className="text-green-300">Authorization: Bearer rvk_your_key_here</p>
            </div>
          </div>

          <div>
            <h3 className="text-zinc-300 font-terminal text-xl uppercase mb-4">Response Format</h3>
            <div className="bg-zinc-900 border border-zinc-700 p-4 font-mono text-xs text-zinc-400">
              <p>{`{`}</p>
              <p className="ml-4"><span className="text-blue-300">&quot;data&quot;</span>: <span className="text-yellow-300">[ ... ]</span>,</p>
              <p className="ml-4"><span className="text-blue-300">&quot;meta&quot;</span>: {"{"} <span className="text-yellow-300">&quot;total&quot;</span>: 254, <span className="text-yellow-300">&quot;offset&quot;</span>: 0, ... {"}"},</p>
              <p className="ml-4"><span className="text-blue-300">&quot;error&quot;</span>: <span className="text-zinc-600">null</span></p>
              <p>{`}`}</p>
            </div>
          </div>

          <div>
            <h3 className="text-zinc-300 font-terminal text-xl uppercase mb-4">Endpoints</h3>
            <div className="space-y-2">
              {ENDPOINTS.map((ep, i) => (
                <div key={i} className="border border-zinc-800 p-3">
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`font-mono text-xs px-2 py-0.5 border ${
                      ep.method === 'GET' ? 'text-green-400 border-green-800' :
                      ep.method === 'POST' ? 'text-blue-400 border-blue-800' :
                      'text-red-400 border-red-800'
                    }`}>{ep.method}</span>
                    <code className="text-zinc-300 font-mono text-sm">{ep.path}</code>
                  </div>
                  <p className="text-zinc-500 font-terminal text-xs">{ep.summary}</p>
                  {ep.params && (
                    <p className="text-zinc-700 font-terminal text-xs mt-1">params: {ep.params.join(', ')}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-zinc-300 font-terminal text-xl uppercase mb-3">Quick Start</h3>
            <div className="bg-zinc-900 border border-zinc-700 p-4 font-mono text-xs text-zinc-400 space-y-2">
              <p className="text-zinc-500"># Get your collection stats</p>
              <p className="text-green-300">curl http://localhost:3000/api/v1/collection \</p>
              <p className="text-green-300 ml-4">-H &quot;X-RetroVault-Key: rvk_your_key&quot;</p>
              <p className="text-zinc-500 mt-3"># Find owned NES games</p>
              <p className="text-green-300">curl &quot;http://localhost:3000/api/v1/inventory?platform=NES&amp;owned=true&quot; \</p>
              <p className="text-green-300 ml-4">-H &quot;X-RetroVault-Key: rvk_your_key&quot;</p>
            </div>
          </div>
        </div>

        {/* Key Management */}
        <div className="space-y-5">
          <div>
            <h3 className="text-zinc-300 font-terminal text-xl uppercase mb-4">API Key Manager</h3>

            {/* Master key input to unlock management */}
            <div className="border border-zinc-700 p-4 mb-4">
              <label className="block text-zinc-500 font-terminal text-xs uppercase mb-2">Enter a Write Key to manage keys</label>
              <div className="flex gap-2">
                <input type="password" value={masterKey} onChange={e => setMasterKey(e.target.value)}
                  placeholder="rvk_..."
                  className="flex-1 bg-black border-2 border-zinc-700 text-zinc-300 font-mono text-sm p-2 focus:outline-none focus:border-green-600" />
                <button onClick={loadKeys} className="px-4 py-2 font-terminal text-xs text-zinc-400 border border-zinc-700 hover:border-zinc-500">
                  Load
                </button>
              </div>
              <p className="text-zinc-700 font-terminal text-xs mt-1">Need your first key? Check .env.local or create one from the CLI.</p>
            </div>

            {/* Create new key */}
            {masterKey && (
              <div className="border border-zinc-700 p-4 mb-4 space-y-3">
                <p className="text-zinc-400 font-terminal text-sm uppercase">Create New Key</p>
                <input type="text" value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
                  placeholder="Key name (e.g. Home Assistant)"
                  className="w-full bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-base p-2 focus:outline-none focus:border-green-600" />
                <div className="flex gap-2 items-center">
                  <select value={newKeyPerms} onChange={e => setNewKeyPerms(e.target.value as 'read' | 'write')}
                    className="bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-sm p-2 focus:outline-none cursor-pointer">
                    <option value="read">Read Only</option>
                    <option value="write">Read + Write</option>
                  </select>
                  <button onClick={createKey} disabled={loading || !newKeyName.trim()}
                    className="flex-1 py-2 bg-green-700 hover:bg-green-600 text-black font-terminal text-sm font-bold border border-green-500 transition-colors disabled:opacity-40">
                    CREATE KEY
                  </button>
                </div>
              </div>
            )}

            {/* New key display */}
            {createdKey && (
              <div className="border-2 border-yellow-600 bg-yellow-950/20 p-4 mb-4">
                <p className="text-yellow-400 font-terminal text-sm mb-2">⚠️ Copy now — won&apos;t be shown again!</p>
                <div className="flex items-center gap-2">
                  <code className="text-yellow-200 font-mono text-xs flex-1 break-all">{createdKey}</code>
                  <button onClick={() => copy(createdKey)}
                    className={`px-3 py-1 font-terminal text-xs border shrink-0 ${copied ? 'text-emerald-400 border-emerald-600' : 'text-zinc-400 border-zinc-600'}`}>
                    {copied ? '✓' : 'Copy'}
                  </button>
                </div>
                <button onClick={() => setCreatedKey(null)} className="text-zinc-600 font-terminal text-xs mt-2 hover:text-zinc-400">Dismiss</button>
              </div>
            )}

            {/* Key list */}
            {keys.length > 0 && (
              <div className="space-y-2">
                <p className="text-zinc-500 font-terminal text-xs uppercase">{keys.length} active key{keys.length !== 1 ? 's' : ''}</p>
                {keys.map(k => (
                  <div key={k.id} className="border border-zinc-800 p-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-zinc-200 font-terminal text-sm">{k.name}</div>
                      <div className="text-zinc-600 font-mono text-xs flex gap-3 mt-0.5">
                        <span>{k.prefix}...</span>
                        <span className={k.permissions === 'write' ? 'text-orange-600' : 'text-zinc-600'}>{k.permissions}</span>
                        <span>created {new Date(k.createdAt).toLocaleDateString()}</span>
                        {k.lastUsed && <span>used {new Date(k.lastUsed).toLocaleDateString()}</span>}
                      </div>
                    </div>
                    <button onClick={() => revokeKey(k.id)} className="text-red-700 hover:text-red-500 font-terminal text-xs transition-colors">revoke</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
