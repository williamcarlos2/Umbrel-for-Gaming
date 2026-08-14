"use client";
import { useEffect, useState } from "react";

type WatchlistEntry = {
  id: string;
  title: string;
  platform: string;
  targetBuyPrice: string;
  currentMarket?: string;
  notes?: string;
  createdAt: string;
};

export default function WatchlistPage() {
  const [entries, setEntries] = useState<WatchlistEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});
  const [inventory, setInventory] = useState<{ id: string; title: string; platform: string; copies?: unknown[]; marketLoose?: string }[]>([]);

  const fetch_ = () => {
    fetch('/api/sales?type=watchlist').then(r => r.json()).then(setEntries);
    fetch('/api/inventory').then(r => r.json()).then(setInventory);
  };

  useEffect(() => { fetch_(); }, []);

  const submit = async () => {
    await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'watchlist', action: 'add', item: form })
    });
    setShowForm(false);
    setForm({});
    fetch_();
  };

  const remove = async (id: string) => {
    if (!confirm('Remove from watchlist?')) return;
    await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'watchlist', action: 'delete', item: { id } })
    });
    fetch_();
  };

  // Enrich with current market price from inventory
  const enriched = entries.map(e => {
    const invItem = inventory.find(i => i.title.toLowerCase() === e.title.toLowerCase() && i.platform.toLowerCase() === e.platform.toLowerCase());
    const market = invItem ? parseFloat(invItem.marketLoose || '0') || 0 : 0;
    const target = parseFloat(e.targetBuyPrice) || 0;
    const alert = market > 0 && target > 0 && market <= target;
    return { ...e, currentMarket: market > 0 ? market.toFixed(2) : null, alert };
  });

  const input = (field: string, label: string, type = 'text') => (
    <div>
      <label className="block text-zinc-400 font-terminal text-sm mb-1 uppercase">{label}</label>
      <input type={type} className="w-full bg-black border-2 border-green-800 text-green-300 p-2 font-terminal text-xl focus:outline-none focus:border-green-400"
        value={form[field] || ''} onChange={e => setForm({...form, [field]: e.target.value})} />
    </div>
  );

  const alerts = enriched.filter(e => e.alert);

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh] flex flex-col space-y-6">
      <header className="border-b-4 border-green-900 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-3xl">🎯</span>
          <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase">Target Radar</h2>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-green-600 hover:bg-green-500 text-black font-terminal font-bold text-xl px-4 py-2 border-2 border-green-400 transition-colors">
          + ADD TARGET
        </button>
      </header>

      {alerts.length > 0 && (
        <div className="bg-emerald-900/30 border-2 border-emerald-500 rounded-sm p-4">
          <h3 className="text-emerald-400 font-terminal text-xl mb-3 uppercase">🔔 Price Alerts — Buy Now!</h3>
          {alerts.map(e => (
            <div key={e.id} className="flex justify-between items-center font-terminal text-lg py-1">
              <span className="text-green-300 font-bold">{e.title} ({e.platform})</span>
              <span className="text-emerald-400">Market ${e.currentMarket} ≤ Target ${e.targetBuyPrice} ✓</span>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-auto border-2 border-green-900 rounded bg-zinc-950">
        <table className="w-full text-left font-terminal text-lg whitespace-nowrap min-w-[700px]">
          <thead className="sticky top-0 bg-zinc-900 border-b-2 border-green-800 text-green-500 uppercase">
            <tr>
              <th className="p-3">Title</th>
              <th className="p-3">Platform</th>
              <th className="p-3 text-right">Target Price</th>
              <th className="p-3 text-right">Current Market</th>
              <th className="p-3 text-center">Status</th>
              <th className="p-3">Notes</th>
              <th className="p-3 text-center">Del</th>
            </tr>
          </thead>
          <tbody>
            {enriched.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-zinc-600">No targets set. Add games you want to buy below a specific price.</td></tr>
            )}
            {enriched.map((e, idx) => (
              <tr key={e.id} className={`border-b border-green-900/30 hover:bg-green-900/20 ${idx % 2 === 0 ? 'bg-black/20' : ''} ${e.alert ? 'bg-emerald-900/10' : ''}`}>
                <td className="p-3 text-green-300 font-bold">{e.title}</td>
                <td className="p-3 text-zinc-400 text-sm">{e.platform}</td>
                <td className="p-3 text-right text-yellow-400 font-bold">${parseFloat(e.targetBuyPrice || '0').toFixed(2)}</td>
                <td className="p-3 text-right">{e.currentMarket ? <span className={parseFloat(e.currentMarket) <= parseFloat(e.targetBuyPrice) ? 'text-emerald-400 font-bold' : 'text-blue-400'}>${e.currentMarket}</span> : <span className="text-zinc-600">--</span>}</td>
                <td className="p-3 text-center">{e.alert ? <span className="text-emerald-400 font-bold">🟢 BUY NOW</span> : <span className="text-zinc-600">⏳ Waiting</span>}</td>
                <td className="p-3 text-zinc-500 text-sm max-w-[120px] truncate">{e.notes}</td>
                <td className="p-3 text-center"><button onClick={() => remove(e.id)} className="text-red-500 hover:text-red-300">[DEL]</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setShowForm(false)}>
          <div className="bg-zinc-950 border-4 border-yellow-500 p-6 rounded-sm w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl text-yellow-400 font-terminal uppercase mb-6 tracking-widest border-b-2 border-yellow-900 pb-2">ADD TARGET</h3>
            <div className="space-y-4">
              {input('title', 'Game Title')}
              {input('platform', 'Platform')}
              {input('targetBuyPrice', 'Buy Below ($)', 'number')}
              {input('notes', 'Notes (optional)')}
            </div>
            <div className="mt-6 flex justify-end gap-4">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 font-terminal text-xl text-zinc-400 hover:text-white">CANCEL</button>
              <button onClick={submit} className="px-4 py-2 font-terminal text-xl bg-yellow-500 text-black font-bold hover:bg-yellow-400">ADD TARGET</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
