"use client";
/**
 * AddAssetModal — Add or edit a game in the collection
 *
 * Used for both "Add new asset" and "Edit existing asset" flows.
 * The same modal handles both cases via the initialData prop.
 *
 * Key behaviors:
 * - Autocomplete suggestions from the catalog (filtered by selected platform)
 * - Platform autocomplete with recent-system shortcuts for faster data entry
 * - Suggestions stored in a ref to avoid re-renders on every keystroke
 * - Field component hoisted to module scope (prevents focus loss on re-render)
 *
 * @param onSave    Called with the completed form data. Caller handles the API write.
 * @param onClose   Called to dismiss the modal (backdrop click or cancel).
 * @param initialData  Pre-populate for edit mode. Omit for new asset.
 */

import React, { useState, useEffect, useRef } from "react";
import { CONSOLES } from "@/data/consoles";

const STATIC_PLATFORM_NAMES = [...CONSOLES]
  .map(c => c.shortName)
  .sort((a, b) => a.localeCompare(b));

const RECENT_KEY = "recentPlatforms";

function normalizePlatformName(value: string) {
  return value.trim();
}

function getRecentPlatforms(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]"); }
  catch { return []; }
}

function saveRecentPlatform(platform: string) {
  const recent = getRecentPlatforms().filter(p => p !== platform);
  localStorage.setItem(RECENT_KEY, JSON.stringify([platform, ...recent].slice(0, 5)));
}

export type AssetFormData = {
  title: string;
  platform: string;
  condition: string;
  hasBox: boolean;
  hasManual: boolean;
  priceAcquired: string;
  purchaseDate: string;
  source: string;
  notes: string;
  isDigital: boolean;
};

type Props = {
  onClose: () => void;
  onSave: (data: AssetFormData) => Promise<void>;
  initialData?: Partial<AssetFormData>;
  title?: string;
};

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm text-zinc-400 font-terminal mb-1 uppercase">
        {label}{error && <span className="text-red-500 ml-1">, {error}</span>}
      </label>
      {children}
    </div>
  );
}

export function AddAssetModal({ onClose, onSave, initialData, title = "ADD ASSET" }: Props) {
  const initialPlatform = initialData?.platform || "";
  const [platform, setPlatform] = useState(initialPlatform);
  const [platformInput, setPlatformInput] = useState(initialPlatform);
  const [titleInput, setTitleInput] = useState(initialData?.title || "");
  const [condition, setCondition] = useState(initialData?.condition || "Loose");
  const [hasBox, setHasBox] = useState(initialData?.hasBox || false);
  const [hasManual, setHasManual] = useState(initialData?.hasManual || false);
  const [isDigital, setIsDigital] = useState(initialData?.isDigital || false);
  const [price, setPrice] = useState(initialData?.priceAcquired || "");
  const [purchaseDate, setPurchaseDate] = useState(
    initialData?.purchaseDate || new Date().toISOString().split("T")[0]
  );
  const [source, setSource] = useState(initialData?.source || "");
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const inventoryRef = useRef<{ title: string; platform: string }[]>([]);
  const availablePlatformsRef = useRef<string[]>(STATIC_PLATFORM_NAMES);
  const recentRef = useRef<string[]>(getRecentPlatforms());
  const titleInputRef = useRef<HTMLInputElement>(null);
  const titleDropdownRef = useRef<HTMLDivElement>(null);
  const platformInputRef = useRef<HTMLInputElement>(null);
  const platformDropdownRef = useRef<HTMLDivElement>(null);

  const [titleSuggestions, setTitleSuggestions] = useState<string[]>([]);
  const [showTitleSuggestions, setShowTitleSuggestions] = useState(false);
  const [platformSuggestions, setPlatformSuggestions] = useState<string[]>([]);
  const [showPlatformSuggestions, setShowPlatformSuggestions] = useState(false);
  const [recentPlatforms, setRecentPlatforms] = useState<string[]>(() => getRecentPlatforms());
  const [availablePlatforms, setAvailablePlatforms] = useState<string[]>(STATIC_PLATFORM_NAMES);

  useEffect(() => {
    fetch("/api/inventory")
      .then(r => r.json())
      .then((d: { title: string; platform: string }[]) => {
        inventoryRef.current = d.map(i => ({ title: i.title, platform: i.platform }));
      });

    fetch('/api/config')
      .then(r => r.json())
      .then((cfg) => {
        const enabled = ((Array.isArray(cfg?.platforms) ? cfg.platforms : []) as string[])
          .map(normalizePlatformName)
          .filter((name: string) => name && name.toLowerCase() !== 'all');
        const staticNames = STATIC_PLATFORM_NAMES.map(normalizePlatformName);
        const uniqueEnabled = [...new Set(enabled)];
        const uniqueStatic = [...new Set(staticNames)].filter((name: string) => !uniqueEnabled.includes(name));
        const nextPlatforms = [...uniqueEnabled, ...uniqueStatic];
        availablePlatformsRef.current = nextPlatforms;
        setAvailablePlatforms(nextPlatforms);
      })
      .catch(() => {
        availablePlatformsRef.current = STATIC_PLATFORM_NAMES;
        setAvailablePlatforms(STATIC_PLATFORM_NAMES);
      });
  }, []);

  const getTitleSuggestions = (query: string, plat: string): string[] => {
    if (!query || query.length < 1 || !plat) return [];
    const lower = query.toLowerCase();
    return inventoryRef.current
      .filter(i => i.platform.toLowerCase() === plat.toLowerCase() && i.title.toLowerCase().includes(lower))
      .map(i => i.title)
      .filter((value, index, arr) => arr.indexOf(value) === index)
      .slice(0, 10);
  };

  const getPlatformSuggestions = (query: string): string[] => {
    const normalized = query.trim().toLowerCase();
    const available = availablePlatformsRef.current;
    const recent = recentRef.current.filter((r) => available.includes(r));
    const combined = [...recent, ...available.filter((name) => !recent.includes(name))];
    if (!normalized) return combined.slice(0, 12);
    return combined.filter((name) => name.toLowerCase().includes(normalized)).slice(0, 12);
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTitleInput(val);
    const sugg = getTitleSuggestions(val, platform);
    setTitleSuggestions(sugg);
    setShowTitleSuggestions(sugg.length > 0 && val.length > 0);
  };

  const handlePlatformChange = (plat: string, preserveTitle = false) => {
    setPlatform(plat);
    setPlatformInput(plat);
    setPlatformSuggestions([]);
    setShowPlatformSuggestions(false);
    setTitleSuggestions([]);
    setShowTitleSuggestions(false);
    if (!preserveTitle) setTitleInput("");
    setTimeout(() => titleInputRef.current?.focus(), 50);
  };

  const handlePlatformInputChange = (value: string) => {
    setPlatformInput(value);
    const sugg = getPlatformSuggestions(value);
    setPlatformSuggestions(sugg);
    setShowPlatformSuggestions(sugg.length > 0);

    if (value.trim().toLowerCase() !== platform.trim().toLowerCase()) {
      setPlatform("");
      setTitleSuggestions([]);
      setShowTitleSuggestions(false);
      setTitleInput("");
    }
  };

  const handleConditionChange = (c: string) => {
    setCondition(c);
    if (c === "CIB") { setHasBox(true); setHasManual(true); setIsDigital(false); }
    else if (c === "Loose") { setHasBox(false); setHasManual(false); setIsDigital(false); }
    else if (c === "Digital") { setHasBox(false); setHasManual(false); setIsDigital(true); }
    else { setIsDigital(false); }
  };

  const selectTitleSuggestion = (s: string) => {
    setTitleInput(s);
    setShowTitleSuggestions(false);
    setTitleSuggestions([]);
  };

  const selectPlatformSuggestion = (s: string) => {
    handlePlatformChange(s);
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!titleDropdownRef.current?.contains(target) && target !== titleInputRef.current) {
        setShowTitleSuggestions(false);
      }
      if (!platformDropdownRef.current?.contains(target) && target !== platformInputRef.current) {
        setShowPlatformSuggestions(false);
      }
    };
    setTimeout(() => document.addEventListener("click", handler), 0);
    return () => document.removeEventListener("click", handler);
  }, []);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!platform) e.platform = "System is required.";
    if (!titleInput.trim()) e.title = "Title is required.";
    if (!isDigital && (!price || isNaN(parseFloat(price)) || parseFloat(price) < 0)) {
      e.price = "A valid cost is required.";
    }
    if (!purchaseDate) e.purchaseDate = "Date is required.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    saveRecentPlatform(platform);
    const nextRecentPlatforms = getRecentPlatforms();
    recentRef.current = nextRecentPlatforms;
    setRecentPlatforms(nextRecentPlatforms);
    await onSave({
      title: titleInput.trim(),
      platform,
      condition,
      hasBox,
      hasManual,
      priceAcquired: isDigital ? "0" : price,
      purchaseDate,
      source,
      notes,
      isDigital,
    });
    setSaving(false);
  };

  const inputCls = (err?: string) =>
    `w-full bg-black border-2 ${err ? "border-red-700" : "border-green-800"} text-green-300 p-2 font-terminal text-xl focus:outline-none focus:border-green-400`;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-start justify-center z-50 backdrop-blur-sm overflow-y-auto py-8"
      onClick={onClose}>
      <div className="bg-zinc-950 border-4 border-green-500 p-6 rounded-sm w-full max-w-xl mx-4 shadow-[0_0_30px_rgba(34,197,94,0.3)] my-auto"
        onClick={e => e.stopPropagation()}>
        <h3 className="text-2xl text-green-400 font-terminal uppercase mb-6 tracking-widest border-b-2 border-green-900 pb-2">{title}</h3>

        <div className="space-y-4">
          <Field label="System *" error={errors.platform}>
            <div className="space-y-2">
              <div className="relative">
                <input
                  ref={platformInputRef}
                  type="text"
                  className={inputCls(errors.platform)}
                  placeholder="Type a system name..."
                  value={platformInput}
                  onChange={e => handlePlatformInputChange(e.target.value)}
                  onFocus={() => {
                    const sugg = getPlatformSuggestions(platformInput);
                    setPlatformSuggestions(sugg);
                    setShowPlatformSuggestions(sugg.length > 0);
                  }}
                  autoComplete="off"
                  spellCheck={false}
                />
                {showPlatformSuggestions && platformSuggestions.length > 0 && (
                  <div
                    ref={platformDropdownRef}
                    className="absolute top-full left-0 right-0 z-30 bg-zinc-900 border-2 border-green-700 max-h-56 overflow-y-auto shadow-xl"
                  >
                    {platformSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          selectPlatformSuggestion(s);
                        }}
                        className="w-full px-3 py-2 text-left text-green-300 hover:bg-green-900/50 font-terminal text-lg"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {recentPlatforms.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {recentPlatforms.filter(r => availablePlatforms.includes(r)).map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => handlePlatformChange(r)}
                      className={`px-2 py-0.5 font-terminal text-xs border transition-colors ${
                        platform === r ? 'bg-green-700 text-black border-green-500' : 'text-zinc-500 border-zinc-700 hover:border-zinc-500'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
              {platform && (
                <p className="text-zinc-600 font-terminal text-xs">Selected: {platform}</p>
              )}
            </div>
          </Field>

          <Field label="Game Title *" error={errors.title}>
            <div className="relative">
              <input
                ref={titleInputRef}
                type="text"
                className={inputCls(errors.title)}
                placeholder={platform ? "START TYPING..." : "SELECT SYSTEM FIRST"}
                value={titleInput}
                onChange={handleTitleChange}
                disabled={!platform}
                autoComplete="off"
                spellCheck={false}
              />
              {showTitleSuggestions && titleSuggestions.length > 0 && (
                <div ref={titleDropdownRef}
                  className="absolute top-full left-0 right-0 z-30 bg-zinc-900 border-2 border-green-700 max-h-48 overflow-y-auto shadow-xl">
                  {titleSuggestions.map(s => (
                    <button key={s}
                      type="button"
                      onMouseDown={e => {
                        e.preventDefault();
                        selectTitleSuggestion(s);
                      }}
                      className="w-full px-3 py-2 text-left text-green-300 hover:bg-green-900/50 font-terminal text-lg">
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {platform && titleInput.length > 0 && titleSuggestions.length === 0 && (
              <p className="text-zinc-600 font-terminal text-xs mt-1">No catalog matches, custom title will be used.</p>
            )}
          </Field>

          <Field label="Condition *">
            <div className="flex gap-2 flex-wrap">
              {["Loose","CIB","Digital","Other"].map(c => (
                <button key={c} type="button" onClick={() => handleConditionChange(c)}
                  className={`px-4 py-2 font-terminal text-lg border-2 transition-colors ${condition === c ? "bg-green-600 text-black border-green-400" : "text-zinc-400 border-zinc-700 hover:border-green-700"}`}>
                  {c}
                </button>
              ))}
            </div>
            {condition === "Other" && (
              <div className="flex gap-4 mt-2">
                <label className="flex items-center gap-2 text-zinc-400 font-terminal text-lg cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 accent-green-600" checked={hasBox}
                    onChange={e => setHasBox(e.target.checked)} /> Box
                </label>
                <label className="flex items-center gap-2 text-zinc-400 font-terminal text-lg cursor-pointer">
                  <input type="checkbox" className="w-5 h-5 accent-green-600" checked={hasManual}
                    onChange={e => setHasManual(e.target.checked)} /> Manual
                </label>
              </div>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label={isDigital ? "Cost (optional)" : "Cost Paid ($) *"} error={errors.price}>
              <div className="flex">
                <span className="bg-zinc-900 border-2 border-r-0 border-green-800 text-green-400 px-3 flex items-center font-terminal">$</span>
                <input type="number" step="0.01" min="0"
                  className={inputCls(errors.price) + " flex-1 border-l-0"}
                  placeholder="0.00" value={price} onChange={e => setPrice(e.target.value)}
                  disabled={isDigital} />
              </div>
            </Field>
            <Field label="Purchase Date *" error={errors.purchaseDate}>
              <input type="date" className={inputCls(errors.purchaseDate)} value={purchaseDate}
                onChange={e => setPurchaseDate(e.target.value)} />
            </Field>
          </div>

          <Field label="Source">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1">
                {["Garage Sale","Thrift Store","eBay","Facebook Marketplace","Craigslist","Game Store","Convention","Trade","Lot Purchase","Whatnot","Gift","r/gameswap"].map(s => (
                  <button key={s} type="button" onClick={() => setSource(s)}
                    className={`px-2 py-0.5 font-terminal text-xs border transition-colors ${
                      source === s ? 'bg-green-700 text-black border-green-500' : 'text-zinc-500 border-zinc-700 hover:border-zinc-500'
                    }`}>{s}</button>
                ))}
              </div>
              <input type="text" className={inputCls()} placeholder="Or type a custom source..."
                value={source} onChange={e => setSource(e.target.value)} />
            </div>
          </Field>

          <Field label="Notes">
            <textarea className={inputCls() + " h-16 resize-none"} placeholder="Optional notes..."
              value={notes} onChange={e => setNotes(e.target.value)} />
          </Field>

          {isDigital && (
            <div className="bg-blue-900/20 border border-blue-700 p-3 rounded-sm font-terminal text-blue-400 text-sm">
              ℹ️ Digital assets are excluded from market value, Buy/Sell scores, and P&L calculations.
            </div>
          )}
        </div>

        <div className="mt-6 pt-4 border-t-2 border-green-900 flex justify-between items-center">
          <div className="text-zinc-600 font-terminal text-sm">* Required fields</div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose}
              className="px-4 py-2 font-terminal text-xl text-zinc-400 hover:text-white">CANCEL</button>
            <button type="button" onClick={handleSave} disabled={saving}
              className="px-4 py-2 font-terminal text-xl bg-green-600 text-black font-bold hover:bg-green-500 disabled:opacity-50 shadow-[0_0_10px_rgba(34,197,94,0.4)]">
              {saving ? "SAVING..." : "COMMIT ASSET"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
