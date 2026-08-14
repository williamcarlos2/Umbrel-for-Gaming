"use client";
import { useState, useEffect } from "react";

const EXPIRY_OPTIONS = [
  { label: "7 days",   days: 7 },
  { label: "1 month",  days: 30 },
  { label: "3 months", days: 90 },
  { label: "1 year",   days: 365 },
  { label: "Never",    days: 0 },
];

type ShareConfig = {
  ownerName?: string;
  contactEmail?: string;
  contactPhone?: string;
  shareContact?: boolean;
  publicUrl?: string;
  publicTokenExpiresAt?: string | null;
};

function expiryLabel(iso: string | undefined): string {
  if (!iso) return "No expiry set";
  const d = new Date(iso);
  const now = new Date();
  if (d < now) return "⚠️ Expired";
  const days = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  if (days === 1) return "Expires tomorrow";
  if (days < 30) return `Expires in ${days} days`;
  const months = Math.floor(days / 30);
  return `Expires in ~${months} month${months > 1 ? "s" : ""}`;
}

export default function SharePage() {
  const [config, setConfig] = useState<ShareConfig | null>(null);
  const [token, setToken] = useState("");
  const [qrSvg, setQrSvg] = useState("");
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expiryDays, setExpiryDays] = useState(30);

  useEffect(() => {
    Promise.all([
      fetch("/api/config").then(r => r.json()),
      fetch("/api/collection-share").then(r => r.json()),
    ]).then(([configData, shareData]) => {
      setConfig(configData);
      setToken(shareData.token || "");
      if (shareData.expiresAt) {
        const expires = new Date(shareData.expiresAt).getTime();
        const now = Date.now();
        const remainingDays = Math.max(0, Math.ceil((expires - now) / 86400000));
        setExpiryDays(remainingDays || 0);
      }
      setConfig(() => ({
        ...configData,
        publicTokenExpiresAt: shareData.expiresAt || null,
      }));
    });
  }, []);

  const publicUrl = config?.publicUrl
    ? `${config.publicUrl}/public/${token}`
    : `http://localhost:3000/public/${token}`;

  const generateToken = () => {
    const t = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    setToken(t);
  };

  const generateQr = async () => {
    const QRCode = (await import("qrcode")).default;
    const svg = await QRCode.toString(publicUrl, { type: "svg", width: 256, margin: 2, color: { dark: "#4ade80", light: "#09090b" } });
    setQrSvg(svg);
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    const expiresAt = expiryDays > 0
      ? new Date(Date.now() + expiryDays * 86400000).toISOString()
      : null;

    await fetch("/api/config", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ownerName: config.ownerName || '',
        contactEmail: config.contactEmail || '',
        contactPhone: config.contactPhone || '',
        shareContact: !!config.shareContact,
        publicUrl: config.publicUrl || '',
      })
    });

    await fetch("/api/collection-share", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, label: `${config?.ownerName || 'My'} Collection`, expiresAt })
    });
    setConfig((prev) => ({ ...(prev || {}), publicTokenExpiresAt: expiresAt }));
    setSaving(false);
    await generateQr();
  };

  const copy = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadQr = () => {
    const blob = new Blob([qrSvg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "retrovault-qr.svg"; a.click();
    URL.revokeObjectURL(url);
  };

  const isExpired = config?.publicTokenExpiresAt && new Date(config.publicTokenExpiresAt) < new Date();

  if (!config) return <div className="text-green-500 font-terminal animate-pulse text-xl text-center py-16">LOADING...</div>;

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      <div className="border-b-4 border-green-900 pb-6 mb-6">
        <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">🔗 Share Your Collection</h2>
        <p className="text-zinc-500 font-terminal text-sm mt-1">Generate a public read-only link to share your collection. No prices or P&L shown.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Setup */}
        <div className="space-y-5">

          {/* Visibility list */}
          <div className="bg-zinc-950 border border-zinc-700 p-4 space-y-3">
            <p className="text-zinc-400 font-terminal text-sm uppercase">What visitors can see:</p>
            <ul className="space-y-1 font-terminal text-sm">
              {["✅ Your game collection (titles, platforms, condition)", "✅ Showcase gallery", "✅ Collection stats", "✅ Completion tiers", "❌ Prices paid or market values", "❌ Sales / P&L data", "❌ Watchlist or business tools"].map(s => (
                <li key={s} className={s.startsWith("✅") ? "text-zinc-300" : "text-zinc-600"}>{s}</li>
              ))}
            </ul>
          </div>

          {/* Security blurb */}
          <div className="bg-zinc-950 border border-zinc-800 px-4 py-3 flex gap-3 items-start">
            <span className="text-green-700 text-lg shrink-0 mt-0.5">🔒</span>
            <p className="text-zinc-500 font-terminal text-xs leading-relaxed">
              Your link is secured by the token — only people with the exact URL can view it.
              Wrong token = 404, no hints. To revoke access, generate a new token.
            </p>
          </div>

          {/* Token */}
          <div>
            <label className="block text-zinc-400 font-terminal text-sm uppercase mb-2">Share Token</label>
            <div className="flex gap-2">
              <input type="text" value={token} onChange={e => setToken(e.target.value)}
                placeholder="Generate or type a token..."
                className="flex-1 bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-base p-2 focus:outline-none focus:border-green-600" />
              <button onClick={generateToken}
                className="px-3 py-2 font-terminal text-xs text-zinc-400 border border-zinc-700 hover:border-zinc-500 transition-colors">
                🎲 Random
              </button>
            </div>
            <p className="text-zinc-700 font-terminal text-xs mt-1">Your public URL will be: /public/{token || "your-token"}</p>
          </div>

          {/* Expiry */}
          <div>
            <label className="block text-zinc-400 font-terminal text-sm uppercase mb-2">Link Expiry</label>
            <div className="flex gap-2 flex-wrap">
              {EXPIRY_OPTIONS.map(opt => (
                <button key={opt.days} onClick={() => setExpiryDays(opt.days)}
                  className={`px-3 py-1.5 font-terminal text-xs border transition-colors ${
                    expiryDays === opt.days
                      ? "text-green-400 border-green-600 bg-green-900/20"
                      : "text-zinc-500 border-zinc-700 hover:border-zinc-500"
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
            {config.publicTokenExpiresAt && (
              <p className={`font-terminal text-xs mt-2 ${isExpired ? "text-red-500" : "text-zinc-600"}`}>
                Current: {expiryLabel(config.publicTokenExpiresAt)}
                {!isExpired && <span className="text-zinc-700"> · Saving will reset the clock</span>}
              </p>
            )}
            {!config.publicTokenExpiresAt && (
              <p className="text-zinc-700 font-terminal text-xs mt-2">No expiry set · Saving will apply selected duration</p>
            )}
          </div>

          {/* Public page identity */}
          <div className="bg-zinc-950 border border-zinc-700 p-4 space-y-4">
            <p className="text-zinc-400 font-terminal text-sm uppercase">Public page identity</p>
            <div>
              <label className="block text-zinc-500 font-terminal text-xs uppercase mb-2">Display name</label>
              <input type="text" value={config.ownerName || ""} onChange={e => setConfig({ ...config, ownerName: e.target.value })}
                placeholder="Your name or store name"
                className="w-full bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-base p-2 focus:outline-none focus:border-green-600" />
            </div>
            <div>
              <label className="block text-zinc-500 font-terminal text-xs uppercase mb-2">Contact email</label>
              <input type="email" value={config.contactEmail || ""} onChange={e => setConfig({ ...config, contactEmail: e.target.value })}
                placeholder="you@example.com"
                className="w-full bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-base p-2 focus:outline-none focus:border-green-600" />
            </div>
            <div>
              <label className="block text-zinc-500 font-terminal text-xs uppercase mb-2">Contact phone</label>
              <input type="text" value={config.contactPhone || ""} onChange={e => setConfig({ ...config, contactPhone: e.target.value })}
                placeholder="Optional phone number"
                className="w-full bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-base p-2 focus:outline-none focus:border-green-600" />
            </div>
            <label className="flex items-center gap-3 text-zinc-300 font-terminal text-sm cursor-pointer">
              <input type="checkbox" checked={!!config.shareContact} onChange={e => setConfig({ ...config, shareContact: e.target.checked })}
                className="h-4 w-4 accent-green-500" />
              Share contact details on the public page
            </label>
            <p className="text-zinc-600 font-terminal text-xs">These fields still live in Settings too, but this puts them where you actually notice them while generating a live share link.</p>
          </div>

          {/* Public URL base */}
          <div>
            <label className="block text-zinc-400 font-terminal text-sm uppercase mb-2">Base URL</label>
            <input type="text" value={config.publicUrl || ""} onChange={e => setConfig({ ...config, publicUrl: e.target.value })}
              placeholder="https://your-domain.com (or leave blank for LAN)"
              className="w-full bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-base p-2 focus:outline-none focus:border-green-600" />
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <button onClick={save} disabled={!token || saving}
              className="px-5 py-2 bg-green-600 hover:bg-green-500 text-black font-terminal text-base font-bold border-2 border-green-400 transition-colors disabled:opacity-40">
              {saving ? "SAVING..." : "SAVE & GENERATE QR"}
            </button>
          </div>

          {/* URL display */}
          {token && (
            <div className="bg-zinc-950 border-2 border-green-800 p-4">
              <p className="text-zinc-500 font-terminal text-xs uppercase mb-2">Your public URL:</p>
              <div className="flex items-center gap-2">
                <code className="text-green-300 font-terminal text-sm flex-1 break-all">{publicUrl}</code>
                <button onClick={copy}
                  className={`px-3 py-1 font-terminal text-xs border shrink-0 transition-colors ${copied ? "text-emerald-400 border-emerald-600" : "text-zinc-400 border-zinc-700 hover:border-zinc-500"}`}>
                  {copied ? "✓ Copied!" : "Copy"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* QR Code */}
        <div className="flex flex-col items-center gap-4">
          {qrSvg ? (
            <>
              <div className="border-4 border-green-700 p-4 bg-zinc-950" dangerouslySetInnerHTML={{ __html: qrSvg }} />
              <div className="flex gap-3">
                <button onClick={downloadQr}
                  className="px-4 py-2 font-terminal text-sm text-blue-400 border border-blue-800 hover:bg-blue-900/20 transition-colors">
                  ⬇️ Download QR
                </button>
                <button onClick={generateQr}
                  className="px-4 py-2 font-terminal text-sm text-zinc-400 border border-zinc-700 hover:border-zinc-500 transition-colors">
                  🔄 Refresh
                </button>
              </div>
              <p className="text-zinc-600 font-terminal text-xs text-center">
                Print this QR code to share at conventions — visitors can scan to browse your collection
              </p>
            </>
          ) : (
            <div className="border-4 border-dashed border-zinc-800 p-16 text-center">
              <div className="text-5xl mb-4">📱</div>
              <p className="text-zinc-600 font-terminal text-lg">QR code will appear here after saving</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
