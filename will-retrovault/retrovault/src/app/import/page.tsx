"use client";
import { useState, useRef } from "react";
import Link from "next/link";

type ParsedRow = {
  title: string; platform: string; condition: string; price: string;
  hasBox: boolean; hasManual: boolean; notes: string; purchaseDate: string; source: string;
  status: "ready" | "duplicate" | "error"; error?: string;
};

const PLATFORM_ALIASES: Record<string, string> = {
  "nes": "NES", "nintendo entertainment system": "NES", "famicom": "NES",
  "snes": "SNES", "super nintendo": "SNES", "super nes": "SNES",
  "n64": "N64", "nintendo 64": "N64",
  "gamecube": "Gamecube", "gcn": "Gamecube", "gc": "Gamecube",
  "switch": "Switch", "nintendo switch": "Switch",
  "genesis": "Sega Genesis", "sega genesis": "Sega Genesis", "megadrive": "Sega Genesis", "mega drive": "Sega Genesis",
  "sega cd": "Sega CD", "segacd": "Sega CD",
  "dreamcast": "Dreamcast", "dc": "Dreamcast",
  "ps1": "PS1", "psx": "PS1", "playstation": "PS1", "playstation 1": "PS1",
  "ps2": "PS2", "playstation 2": "PS2",
  "ps3": "PS3", "playstation 3": "PS3",
  "psp": "PSP",
  "xbox": "Xbox",
  "xbox 360": "Xbox 360", "360": "Xbox 360",
};

function normalizePlatform(raw: string): string {
  const lower = raw.toLowerCase().trim();
  return PLATFORM_ALIASES[lower] || raw.trim();
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const header = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z_]/g, ""));
  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    // Handle quoted fields
    const cells: string[] = [];
    let current = "";
    let inQuote = false;
    for (const char of line) {
      if (char === '"') { inQuote = !inQuote; continue; }
      if (char === "," && !inQuote) { cells.push(current.trim()); current = ""; continue; }
      current += char;
    }
    cells.push(current.trim());

    const get = (keys: string[]) => {
      for (const k of keys) {
        const idx = header.indexOf(k);
        if (idx >= 0 && cells[idx]) return cells[idx];
      }
      return "";
    };

    const title = get(["title", "name", "game", "game_title", "gametitle"]);
    const platform = get(["platform", "system", "console"]);
    if (!title) continue;

    rows.push({
      title,
      platform: normalizePlatform(platform),
      condition: get(["condition", "grade", "state"]) || "Loose",
      price: get(["price", "cost", "paid", "purchase_price", "amount"]) || "0",
      hasBox: ["yes", "true", "1", "cib", "complete"].includes(get(["box", "has_box", "hasbox", "boxed"]).toLowerCase()),
      hasManual: ["yes", "true", "1", "cib", "complete"].includes(get(["manual", "has_manual", "hasmanual"]).toLowerCase()),
      notes: get(["notes", "note", "comments", "description"]),
      purchaseDate: get(["date", "purchase_date", "acquired", "bought"]),
      source: get(["source", "where", "vendor", "store"]),
      status: "ready",
    });
  }

  return rows;
}

export default function ImportPage() {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [importCount, setImportCount] = useState(0);
  const [newlyEnabledPlatforms, setNewlyEnabledPlatforms] = useState<string[]>([]);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setError("");
    setRows([]);
    setImportDone(false);
    const reader = new FileReader();
    reader.onload = e => {
      const text = e.target?.result as string;
      try {
        const parsed = parseCSV(text);
        if (parsed.length === 0) { setError("No valid rows found. Check your CSV format."); return; }
        setRows(parsed);
      } catch (err: unknown) {
        setError(`Parse error: ${err instanceof Error ? err.message : 'Unknown parse error'}`);
      }
    };
    reader.readAsText(file);
  };

  const doImport = async () => {
    setImporting(true);
    let count = 0;
    const readyRows = rows.filter(r => r.status === "ready");

    // Detect platforms in the import that aren't currently enabled
    const configRes = await fetch("/api/config").then(r => r.json()).catch(() => ({}));
    const currentPlatforms: string[] = configRes.platforms || [];
    const importPlatforms = [...new Set(readyRows.map(r => r.platform).filter(Boolean))];
    const newPlatforms = importPlatforms.filter(p => p && !currentPlatforms.includes(p));

    // Auto-enable new platforms and sync catalog entries for each one
    if (newPlatforms.length > 0) {
      const syncSummaries: string[] = [];
      for (const platform of newPlatforms) {
        const syncRes = await fetch("/api/platforms/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ platform, enabled: true, autoPopulate: true })
        }).then(r => r.json()).catch(() => ({}));
        const added = syncRes?.sync?.populated?.added || 0;
        syncSummaries.push(added > 0
          ? `${platform} (+${added.toLocaleString()} catalog)`
          : `${platform}${syncRes?.sync?.catalogFound === false ? ' (catalog sync unavailable)' : ' (no new catalog titles)'}`);
      }
      setNewlyEnabledPlatforms(syncSummaries);
    }

    for (const row of readyRows) {
      try {
        await fetch("/api/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add",
            title: row.title,
            platform: row.platform,
            condition: row.condition,
            hasBox: row.hasBox,
            hasManual: row.hasManual,
            priceAcquired: row.price,
            purchaseDate: row.purchaseDate,
            source: row.source,
            notes: row.notes,
            isDigital: false,
          })
        });
        count++;
      } catch { /* skip failed rows */ }
      // Throttle to avoid hammering the API
      await new Promise(r => setTimeout(r, 50));
    }

    setImportCount(count);
    setImporting(false);
    setImportDone(true);
  };

  const readyCount = rows.filter(r => r.status === "ready").length;

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      <div className="border-b-4 border-green-900 pb-6 mb-6">
        <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">📥 CSV Import</h2>
        <p className="text-zinc-500 font-terminal text-sm mt-1">Import your game collection from a spreadsheet or another tool</p>
      </div>

      {/* Format guide */}
      <div className="bg-zinc-950 border border-zinc-700 p-4 mb-6">
        <p className="text-zinc-400 font-terminal text-sm uppercase mb-3">Expected CSV Columns</p>
        <div className="overflow-x-auto">
          <table className="font-terminal text-xs text-zinc-500 border-collapse">
            <thead>
              <tr className="border-b border-zinc-700">
                <th className="text-left p-2 text-zinc-400">Column</th>
                <th className="text-left p-2 text-zinc-400">Aliases</th>
                <th className="text-left p-2 text-zinc-400">Required?</th>
                <th className="text-left p-2 text-zinc-400">Example</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["title", "name, game, game_title", "✅ Yes", "Super Mario World"],
                ["platform", "system, console", "✅ Yes", "SNES (or Super Nintendo)"],
                ["condition", "grade, state", "No", "CIB, Loose, Excellent"],
                ["price", "cost, paid, purchase_price", "No", "24.99"],
                ["box", "has_box, boxed", "No", "yes / no"],
                ["manual", "has_manual", "No", "yes / no"],
                ["date", "purchase_date, acquired", "No", "2024-03-15"],
                ["source", "where, vendor", "No", "Garage Sale"],
                ["notes", "note, comments", "No", "Great condition find"],
              ].map(([col, aliases, req, ex]) => (
                <tr key={col} className="border-b border-zinc-900">
                  <td className="p-2 text-green-700 font-bold">{col}</td>
                  <td className="p-2">{aliases}</td>
                  <td className="p-2">{req}</td>
                  <td className="p-2 text-zinc-600">{ex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-zinc-700 font-terminal text-xs mt-3">
          Platform names are normalized: &quot;Super Nintendo&quot; → &quot;SNES&quot;, &quot;Mega Drive&quot; → &quot;Sega Genesis&quot;, etc.
          Use &quot;yes&quot;/&quot;no&quot; or &quot;1&quot;/&quot;0&quot; for box/manual. Rows with &quot;CIB&quot; in condition auto-set both.
        </p>
      </div>

      {/* File drop zone */}
      {!importDone && (
        <div
          className="border-4 border-dashed border-zinc-700 hover:border-green-700 p-10 text-center cursor-pointer transition-colors mb-6"
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}>
          <input ref={fileRef} type="file" accept=".csv,.txt" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <div className="text-5xl mb-4">📄</div>
          <p className="text-zinc-400 font-terminal text-xl mb-2">Drop your CSV here or click to browse</p>
          <p className="text-zinc-600 font-terminal text-sm">Supports .csv and .txt files. First row must be column headers.</p>
        </div>
      )}

      {error && <div className="border border-red-700 bg-red-950/20 p-4 mb-4 text-red-400 font-terminal text-sm">{error}</div>}

      {/* Preview */}
      {rows.length > 0 && !importDone && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-zinc-400 font-terminal text-base">{readyCount} rows ready to import</p>
            <button onClick={doImport} disabled={importing || readyCount === 0}
              className="px-6 py-2 bg-green-600 hover:bg-green-500 text-black font-terminal text-xl font-bold border-2 border-green-400 transition-colors disabled:opacity-40">
              {importing ? "IMPORTING..." : `IMPORT ${readyCount} GAMES`}
            </button>
          </div>

          <div className="overflow-x-auto max-h-72 overflow-y-auto border border-zinc-800">
            <table className="w-full font-terminal text-xs">
              <thead className="sticky top-0 bg-zinc-900">
                <tr className="border-b border-zinc-700 text-zinc-500 uppercase">
                  <th className="text-left p-2">Status</th>
                  <th className="text-left p-2">Title</th>
                  <th className="text-left p-2">Platform</th>
                  <th className="text-left p-2">Condition</th>
                  <th className="text-right p-2">Price</th>
                  <th className="text-left p-2">CIB?</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className={`border-b border-zinc-900 ${row.status === "error" ? "text-red-400" : "text-zinc-300"}`}>
                    <td className="p-2">
                      <span className={`${row.status === "ready" ? "text-green-500" : row.status === "duplicate" ? "text-yellow-500" : "text-red-500"}`}>
                        {row.status === "ready" ? "✓" : row.status === "duplicate" ? "⚠" : "✗"}
                      </span>
                    </td>
                    <td className="p-2 max-w-[200px] truncate">{row.title}</td>
                    <td className="p-2">{row.platform || <span className="text-red-500">missing</span>}</td>
                    <td className="p-2">{row.condition}</td>
                    <td className="p-2 text-right">${parseFloat(row.price || "0").toFixed(2)}</td>
                    <td className="p-2">{row.hasBox && row.hasManual ? "CIB" : row.hasBox ? "Box" : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {importDone && (
        <div className="space-y-4">
          {/* Newly enabled platforms notification */}
          {newlyEnabledPlatforms.length > 0 && (
            <div className="border-2 border-yellow-600 bg-yellow-950/20 p-5">
              <div className="flex items-start gap-3">
                <span className="text-3xl shrink-0">📺</span>
                <div className="flex-1">
                  <p className="text-yellow-400 font-terminal text-lg font-bold mb-1">
                    New Platform{newlyEnabledPlatforms.length > 1 ? 's' : ''} Enabled!
                  </p>
                  <p className="text-zinc-300 font-terminal text-sm mb-3">
                    Your import included games from platform{newlyEnabledPlatforms.length > 1 ? 's' : ''} that weren&apos;t previously active.
                    We automatically enabled {newlyEnabledPlatforms.length > 1 ? 'them' : 'it'} so your games appear in the Vault, then synced catalog entries for each platform when available.
                  </p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {newlyEnabledPlatforms.map(p => (
                      <span key={p} className="px-3 py-1 bg-yellow-900/40 border border-yellow-700 text-yellow-300 font-terminal text-sm">
                        ✅ {p}
                      </span>
                    ))}
                  </div>
                  <Link href="/settings#platforms" className="text-blue-400 hover:text-blue-300 font-terminal text-xs transition-colors">
                    Manage enabled platforms in Settings →
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Success card */}
          <div className="text-center py-12 border-2 border-emerald-700 bg-emerald-950/20">
            <div className="text-5xl mb-4">🎉</div>
            <p className="text-emerald-400 font-terminal text-2xl mb-2">Import Complete!</p>
            <p className="text-zinc-400 font-terminal text-lg mb-4">{importCount} games added to your vault.</p>
            <div className="flex gap-3 justify-center">
              <Link href="/inventory" className="px-6 py-2 bg-green-700 hover:bg-green-600 text-black font-terminal text-base font-bold border border-green-500">
                VIEW VAULT →
              </Link>
              <button onClick={() => { setRows([]); setImportDone(false); setNewlyEnabledPlatforms([]); }}
                className="px-6 py-2 font-terminal text-base text-zinc-400 border border-zinc-700 hover:border-zinc-500">
                Import More
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
