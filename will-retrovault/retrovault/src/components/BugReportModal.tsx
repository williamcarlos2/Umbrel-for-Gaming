"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";

type BugReportContext = {
  title?: string;
  description?: string;
  steps?: string;
  expected?: string;
  actual?: string;
  metadata?: Record<string, unknown>;
};

type Props = { onClose: () => void; initialContext?: BugReportContext };

const TYPES = [
  { id: "bug", label: "🐛 Bug Report", desc: "Something isn't working correctly" },
  { id: "feature", label: "✨ Feature Request", desc: "Suggest something new" },
  { id: "other", label: "📋 Other", desc: "General feedback" },
];

export function BugReportModal({ onClose, initialContext }: Props) {
  const pathname = usePathname();
  const [type, setType] = useState("bug");
  const [title, setTitle] = useState(initialContext?.title || "");
  const [description, setDescription] = useState(initialContext?.description || "");
  const [steps, setSteps] = useState(initialContext?.steps || "");
  const [expected, setExpected] = useState(initialContext?.expected || "");
  const [actual, setActual] = useState(initialContext?.actual || "");
  const [honeypot, setHoneypot] = useState(""); // bot trap
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok?: boolean; error?: string; issueUrl?: string; issueNumber?: number; duplicate?: boolean; existingUrl?: string; existingTitle?: string; resetIn?: number } | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [issuesUrl, setIssuesUrl] = useState('https://github.com/theretrovault/retrovault/issues');

  useEffect(() => {
    fetch("/api/bug-report").then(r => r.json()).then(d => { setConfigured(d.configured); if (d.issuesUrl) setIssuesUrl(d.issuesUrl); });
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/bug-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, description, type, steps, expected, actual,
          page: pathname,
          metadata: initialContext?.metadata,
          website: honeypot, // honeypot
        }),
      });
      const data = await res.json();
      setResult(data);
    } catch {
      setResult({ error: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = "w-full bg-black border-2 border-zinc-700 text-zinc-300 font-terminal text-sm p-2 focus:outline-none focus:border-green-600 resize-none";

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[200] p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-950 border-4 border-orange-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-sm shadow-[0_0_30px_rgba(251,146,60,0.2)]"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="border-b-2 border-orange-900 p-5 flex items-center justify-between">
          <div>
            <h2 className="text-orange-400 font-terminal text-2xl uppercase">🐛 Report an Issue</h2>
            <p className="text-zinc-600 font-terminal text-xs mt-1">Goes straight to GitHub. No account needed.</p>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-zinc-300 font-terminal text-xl transition-colors">✕</button>
        </div>

        {configured === false && (
          <div className="p-5 border border-yellow-800 bg-yellow-950/20 m-5">
            <p className="text-yellow-400 font-terminal text-sm">⚠️ Bug reporting is not configured.</p>
            <p className="text-zinc-500 font-terminal text-xs mt-1">Add <code className="bg-zinc-900 px-1">GITHUB_ISSUES_TOKEN</code> to <code className="bg-zinc-900 px-1">.env.local</code> to enable in-app bug reporting.</p>
            <p className="text-zinc-600 font-terminal text-xs mt-2">In the meantime, open issues directly at: <a href={issuesUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-400">{issuesUrl.replace("https://", "")} ↗</a></p>
          </div>
        )}

        {result?.ok ? (
          <div className="p-8 text-center">
            <div className="text-5xl mb-4">✅</div>
            <p className="text-emerald-400 font-terminal text-2xl mb-2">Issue #{result.issueNumber} Filed!</p>
            <p className="text-zinc-400 font-terminal text-sm mb-4">Thanks for the report. We&apos;ll look into it.</p>
            <a href={result.issueUrl} target="_blank" rel="noopener noreferrer"
              className="px-6 py-2 font-terminal text-sm text-blue-400 border border-blue-800 hover:bg-blue-900/20 transition-colors inline-block">
              View on GitHub ↗
            </a>
            <button onClick={onClose} className="block mx-auto mt-3 text-zinc-600 hover:text-zinc-400 font-terminal text-sm transition-colors">Close</button>
          </div>
        ) : (
          <form onSubmit={submit} className="p-5 space-y-4">
            {/* Honeypot — hidden from humans */}
            <input
              type="text"
              value={honeypot}
              onChange={e => setHoneypot(e.target.value)}
              style={{ display: 'none' }}
              tabIndex={-1}
              autoComplete="off"
            />

            {/* Type */}
            <div>
              <label className="block text-zinc-400 font-terminal text-xs uppercase mb-2">Type</label>
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map(t => (
                  <button key={t.id} type="button" onClick={() => setType(t.id)}
                    className={`p-3 text-left border-2 transition-colors ${type === t.id ? "border-orange-600 bg-orange-950/20" : "border-zinc-800 hover:border-zinc-600"}`}>
                    <div className="font-terminal text-sm">{t.label}</div>
                    <div className="text-zinc-600 font-terminal text-xs">{t.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Page */}
            <div>
              <label className="block text-zinc-400 font-terminal text-xs uppercase mb-1">Page (auto-detected)</label>
              <div className="bg-zinc-900 border border-zinc-700 px-3 py-2 font-terminal text-sm text-zinc-500">{pathname}</div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-zinc-400 font-terminal text-xs uppercase mb-1">Title <span className="text-red-500">*</span></label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required minLength={10}
                placeholder="Brief, descriptive title..."
                className={inputCls} />
              <p className="text-zinc-700 font-terminal text-xs mt-0.5">{title.length}/10 minimum</p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-zinc-400 font-terminal text-xs uppercase mb-1">Description <span className="text-red-500">*</span></label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} required minLength={20}
                rows={4} placeholder="What happened? What did you expect?"
                className={inputCls} />
            </div>

            {/* Bug-specific fields */}
            {type === "bug" && (
              <>
                <div>
                  <label className="block text-zinc-400 font-terminal text-xs uppercase mb-1">Steps to Reproduce (optional)</label>
                  <textarea value={steps} onChange={e => setSteps(e.target.value)} rows={3}
                    placeholder="1. Go to...&#10;2. Click...&#10;3. See error"
                    className={inputCls} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-zinc-400 font-terminal text-xs uppercase mb-1">Expected</label>
                    <textarea value={expected} onChange={e => setExpected(e.target.value)} rows={2}
                      placeholder="What should happen?" className={inputCls} />
                  </div>
                  <div>
                    <label className="block text-zinc-400 font-terminal text-xs uppercase mb-1">Actual</label>
                    <textarea value={actual} onChange={e => setActual(e.target.value)} rows={2}
                      placeholder="What actually happened?" className={inputCls} />
                  </div>
                </div>
              </>
            )}

            {/* Error messages */}
            {result?.error && !result.duplicate && (
              <div className="border border-red-800 bg-red-950/20 p-3">
                <p className="text-red-400 font-terminal text-sm">⚠ {result.error}</p>
                {result.resetIn && (
                  <p className="text-zinc-500 font-terminal text-xs mt-1">Try again in ~{result.resetIn} minute{result.resetIn !== 1 ? 's' : ''}.</p>
                )}
              </div>
            )}

            {/* Duplicate warning */}
            {result?.duplicate && (
              <div className="border-2 border-yellow-700 bg-yellow-950/20 p-4">
                <p className="text-yellow-400 font-terminal text-base mb-2">⚠️ Possible Duplicate Found</p>
                <p className="text-zinc-400 font-terminal text-sm mb-2">A similar issue already exists:</p>
                <p className="text-zinc-300 font-terminal text-sm italic mb-3">&quot;{result.existingTitle}&quot;</p>
                <div className="flex gap-3">
                  <a href={result.existingUrl} target="_blank" rel="noopener noreferrer"
                    className="px-4 py-2 font-terminal text-sm text-blue-400 border border-blue-800 hover:bg-blue-900/20 transition-colors">
                    View Existing Issue ↗
                  </a>
                  <button type="submit" className="px-4 py-2 font-terminal text-sm text-orange-400 border border-orange-800 hover:bg-orange-900/20 transition-colors">
                    Submit Anyway
                  </button>
                </div>
              </div>
            )}

            {/* Submit */}
            {!result?.duplicate && (
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={submitting || configured === false || title.length < 10 || description.length < 20}
                  className="flex-1 py-3 bg-orange-700 hover:bg-orange-600 text-white font-terminal text-xl font-bold border-2 border-orange-500 transition-colors disabled:opacity-40">
                  {submitting ? "SUBMITTING..." : "🐛 SUBMIT REPORT"}
                </button>
                <button type="button" onClick={onClose}
                  className="px-6 font-terminal text-xl text-zinc-400 border border-zinc-700 hover:border-zinc-400 transition-colors">
                  CANCEL
                </button>
              </div>
            )}

            <p className="text-zinc-700 font-terminal text-xs">
              Rate limited: 1 report per hour, 5 per day. Duplicate detection runs automatically before submission.
              Your IP is hashed — never stored in plain text.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
