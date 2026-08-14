"use client";
import { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

type Snapshot = { date: string; totalValue: number; totalCib: number; totalPaid: number; gameCount: number };

const RANGES = [
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "180d", days: 180 },
  { label: "1yr", days: 365 },
  { label: "All", days: 9999 },
];

export default function ValueHistoryPage() {
  const [history, setHistory] = useState<Snapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(90);

  useEffect(() => {
    fetch("/api/value-history").then(r => r.json()).then(d => { setHistory(d); setLoading(false); });
  }, []);

  const filtered = history.slice(-range);
  const latest = filtered[filtered.length - 1];
  const earliest = filtered[0];
  const valueChange = latest && earliest ? latest.totalValue - earliest.totalValue : 0;
  const valuePct = earliest?.totalValue > 0 ? (valueChange / earliest.totalValue) * 100 : 0;
  const gameChange = latest && earliest ? latest.gameCount - earliest.gameCount : 0;

  const chartData = filtered.map(s => ({
    date: s.date.slice(5), // MM-DD
    "Loose Value": Math.round(s.totalValue),
    "CIB Value": Math.round(s.totalCib),
    "Total Paid": Math.round(s.totalPaid),
    Games: s.gameCount,
  }));

  const fmt = (n: number) => n >= 1000 ? `$${(n/1000).toFixed(1)}k` : `$${n.toFixed(0)}`;

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      <div className="border-b-4 border-green-900 pb-6 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">📈 Collection Value History</h2>
          <p className="text-zinc-500 font-terminal text-sm mt-1">How your net worth has grown over time</p>
        </div>
        <div className="flex gap-2">
          {RANGES.map(r => (
            <button key={r.label} onClick={() => setRange(r.days)}
              className={`px-3 py-1 font-terminal text-xs border-2 transition-colors ${range === r.days ? "bg-green-700 text-black border-green-500" : "text-zinc-500 border-zinc-700 hover:border-zinc-500"}`}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-green-500 font-terminal animate-pulse text-xl text-center py-12">LOADING HISTORY...</div>
      ) : history.length < 2 ? (
        <div className="text-center py-16 border-2 border-dashed border-zinc-800">
          <div className="text-5xl mb-4">📊</div>
          <p className="text-zinc-500 font-terminal text-xl mb-2">Not enough history yet.</p>
          <p className="text-zinc-600 font-terminal text-sm">The snapshot script runs daily. Come back tomorrow to see your first chart!</p>
          <p className="text-zinc-700 font-terminal text-xs mt-4">Run: <code className="bg-zinc-900 px-2">node scripts/snapshot-value.mjs</code></p>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {latest && [
              { label: "Current Value", val: fmt(latest.totalValue), color: "text-blue-400" },
              { label: `Change (${RANGES.find(r => r.days === range)?.label})`, val: `${valueChange >= 0 ? "+" : ""}${fmt(valueChange)}`, color: valueChange >= 0 ? "text-emerald-400" : "text-red-400" },
              { label: "% Change", val: `${valuePct >= 0 ? "+" : ""}${valuePct.toFixed(1)}%`, color: valuePct >= 0 ? "text-emerald-400" : "text-red-400" },
              { label: "Games Added", val: gameChange >= 0 ? `+${gameChange}` : `${gameChange}`, color: "text-zinc-300" },
            ].map(({ label, val, color }) => (
              <div key={label} className="bg-zinc-950 border border-zinc-700 p-4 text-center">
                <div className={`font-terminal text-2xl font-bold ${color}`}>{val}</div>
                <div className="text-zinc-600 font-terminal text-xs mt-1">{label}</div>
              </div>
            ))}
          </div>

          {/* Value chart */}
          <div className="mb-6">
            <h3 className="text-zinc-400 font-terminal text-sm uppercase mb-3">Collection Value Over Time</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="date" stroke="#4b5563" tick={{ fontFamily: "monospace", fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis stroke="#4b5563" tick={{ fontFamily: "monospace", fontSize: 10 }} tickFormatter={v => `$${v >= 1000 ? (v/1000).toFixed(0)+"k" : v}`} />
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #166534", fontFamily: "monospace" }} formatter={(v) => `$${Number(v ?? 0).toFixed(0)}`} />
                  <Legend />
                  <Line type="monotone" dataKey="Loose Value" stroke="#3b82f6" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="Total Paid" stroke="#ef4444" strokeWidth={1} dot={false} strokeDasharray="4 2" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Game count chart */}
          <div>
            <h3 className="text-zinc-400 font-terminal text-sm uppercase mb-3">Games Owned Over Time</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                  <XAxis dataKey="date" stroke="#4b5563" tick={{ fontFamily: "monospace", fontSize: 10 }} interval="preserveStartEnd" />
                  <YAxis stroke="#4b5563" tick={{ fontFamily: "monospace", fontSize: 10 }} />
                  <Tooltip contentStyle={{ background: "#18181b", border: "1px solid #166534", fontFamily: "monospace" }} />
                  <Line type="monotone" dataKey="Games" stroke="#22c55e" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
