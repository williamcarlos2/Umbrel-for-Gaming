"use client";
import { useEffect, useState } from "react";
import { AddAssetModal, type AssetFormData } from "@/components/AddAssetModal";

type SaleEntry = {
  id: string;
  title: string;
  platform: string;
  condition: string;
  salePrice: string;
  costBasis: string;
  saleDate: string;
  buyer?: string;
  notes?: string;
  createdAt: string;
};

type AcqEntry = {
  id: string;
  title: string;
  platform: string;
  source: string; // e.g. "Yard Sale", "eBay", "Flea Market"
  cost: string;
  date: string;
  notes?: string;
  createdAt: string;
};

type FormMode = 'sale' | 'acquisition' | null;

// Hoisted to module scope — prevents focus loss on re-render
function Kpi({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-zinc-950 border-2 border-green-800 p-5 rounded-sm text-center">
      <div className="text-green-600 font-terminal text-sm mb-1">{label}</div>
      <div className={`font-terminal font-bold ${color}`} style={{ fontSize: 'clamp(1.2rem,3vw,2.5rem)' }}>{value}</div>
    </div>
  );
}

export default function SalesPage() {
  const [sales, setSales] = useState<SaleEntry[]>([]);
  const [acquisitions, setAcquisitions] = useState<AcqEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'sales' | 'acquisitions' | 'pl'>('pl');
  const [formMode, setFormMode] = useState<FormMode>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [showAddAsset, setShowAddAsset] = useState(false);

  const fetchData = () => {
    fetch('/api/sales?type=sales').then(r => r.json()).then(setSales);
    fetch('/api/sales?type=acquisitions').then(r => r.json()).then(setAcquisitions);
  };

  const handleAddAsset = async (data: AssetFormData) => {
    // 1. Log acquisition in P&L
    await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'acquisitions',
        action: 'add',
        item: {
          title: data.title,
          platform: data.platform,
          source: data.source || 'Unknown',
          cost: data.isDigital ? '0' : data.priceAcquired,
          date: data.purchaseDate,
          notes: data.notes,
          isDigital: data.isDigital,
        }
      })
    });
    // 2. Also add to main inventory
    const existing = await fetch('/api/inventory').then(r => r.json());
    const found = existing.find((i: { title: string; platform: string }) =>
      i.title.toLowerCase() === data.title.toLowerCase() &&
      i.platform.toLowerCase() === data.platform.toLowerCase()
    );
    if (found) {
      // Add a new copy to existing item
      const newCopy = { id: Date.now().toString(), hasBox: data.hasBox, hasManual: data.hasManual, priceAcquired: data.priceAcquired, condition: data.condition };
      await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...found, copies: [...(found.copies || []), newCopy], purchaseDate: found.purchaseDate || data.purchaseDate })
      });
    } else {
      // Create new inventory item
      await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: Math.random().toString(36).slice(2, 10),
          title: data.title, platform: data.platform, status: 'Yes',
          notes: data.notes || '', purchaseDate: data.purchaseDate,
          isDigital: data.isDigital, marketLoose: '0', marketCib: '0',
          copies: [{ id: Date.now().toString(), hasBox: data.hasBox, hasManual: data.hasManual, priceAcquired: data.priceAcquired, condition: data.condition }]
        })
      });
    }
    setShowAddAsset(false);
    fetchData();
  };

  useEffect(() => { fetchData(); }, []);

  const submit = async () => {
    await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: formMode === 'sale' ? 'sales' : 'acquisitions', action: 'add', item: form })
    });
    setFormMode(null);
    setForm({});
    fetchData();
  };

  const remove = async (type: 'sales' | 'acquisitions', id: string) => {
    if (!confirm('Delete this entry?')) return;
    await fetch('/api/sales', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, action: 'delete', item: { id } })
    });
    fetchData();
  };

  const totalRevenue = sales.reduce((s, e) => s + (parseFloat(e.salePrice) || 0), 0);
  const totalCostSold = sales.reduce((s, e) => s + (parseFloat(e.costBasis) || 0), 0);
  const totalSpentAcq = acquisitions.reduce((s, e) => s + (parseFloat(e.cost) || 0), 0);
  const realizedProfit = totalRevenue - totalCostSold;
  const netPosition = realizedProfit - totalSpentAcq;

  const input = (field: string, label: string, type = 'text') => (
    <div>
      <label className="block text-zinc-400 font-terminal text-sm mb-1 uppercase">{label}</label>
      <input type={type} className="w-full bg-black border-2 border-green-800 text-green-300 p-2 font-terminal text-xl focus:outline-none focus:border-green-400"
        value={form[field] || ''} onChange={e => setForm({...form, [field]: e.target.value})} />
    </div>
  );

  // Kpi hoisted to module scope above

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh] flex flex-col space-y-6">
      <header className="border-b-4 border-green-900 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <span className="text-3xl">💰</span>
          <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase">P&amp;L Ledger</h2>
        </div>
        <div className="flex gap-3">
          <button onClick={() => setShowAddAsset(true)}
            className="bg-blue-900/50 hover:bg-blue-600 text-blue-300 font-terminal text-xl px-4 py-2 border-2 border-blue-500 transition-colors">
            + LOG PURCHASE
          </button>
          <button onClick={() => { setFormMode('sale'); setForm({ saleDate: new Date().toISOString().split('T')[0] }); }}
            className="bg-green-600 hover:bg-green-500 text-black font-terminal font-bold text-xl px-4 py-2 border-2 border-green-400 transition-colors">
            + LOG SALE
          </button>
        </div>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Total Revenue" value={`$${totalRevenue.toFixed(2)}`} color="text-green-400" />
        <Kpi label="COGS" value={`$${totalCostSold.toFixed(2)}`} color="text-zinc-400" />
        <Kpi label="Realized Profit" value={`${realizedProfit >= 0 ? '+' : ''}$${realizedProfit.toFixed(2)}`} color={realizedProfit >= 0 ? "text-emerald-400" : "text-red-400"} />
        <Kpi label="New Capital Deployed" value={`$${totalSpentAcq.toFixed(2)}`} color="text-blue-400" />
      </div>

      {/* Tabs */}
      <div className="flex border-b-2 border-green-900">
        {(['pl','sales','acquisitions'] as const).map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-6 py-2 font-terminal text-lg uppercase transition-colors ${activeTab === t ? 'bg-green-600 text-black' : 'text-green-500 hover:bg-green-900/30'}`}>
            {t === 'pl' ? 'Summary' : t}
          </button>
        ))}
      </div>

      {/* Summary */}
      {activeTab === 'pl' && (
        <div className="space-y-6">
          <div className="bg-zinc-950 border-2 border-green-800 p-6 rounded-sm">
            <h3 className="text-green-400 font-terminal text-2xl mb-4 uppercase">Business Summary</h3>
            <div className="space-y-3 font-terminal text-xl">
              <div className="flex justify-between border-b border-green-900/30 pb-2">
                <span className="text-zinc-400">Sales Recorded</span>
                <span className="text-green-300">{sales.length}</span>
              </div>
              <div className="flex justify-between border-b border-green-900/30 pb-2">
                <span className="text-zinc-400">Acquisitions Logged</span>
                <span className="text-blue-300">{acquisitions.length}</span>
              </div>
              <div className="flex justify-between border-b border-green-900/30 pb-2">
                <span className="text-zinc-400">Avg Sale Price</span>
                <span className="text-green-300">{sales.length > 0 ? `$${(totalRevenue/sales.length).toFixed(2)}` : '--'}</span>
              </div>
              <div className="flex justify-between border-b border-green-900/30 pb-2">
                <span className="text-zinc-400">Avg Margin</span>
                <span className={totalCostSold > 0 ? (totalRevenue > totalCostSold ? 'text-emerald-400' : 'text-red-400') : 'text-zinc-500'}>
                  {totalCostSold > 0 ? `${(((totalRevenue - totalCostSold) / totalCostSold) * 100).toFixed(1)}%` : '--'}
                </span>
              </div>
              <div className="flex justify-between pt-2">
                <span className="text-zinc-300 font-bold">Net Cash Position</span>
                <span className={`font-bold ${netPosition >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {netPosition >= 0 ? '+' : ''}${netPosition.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sales Log */}
      {activeTab === 'sales' && (
        <div className="overflow-auto border-2 border-green-900 rounded bg-zinc-950">
          <table className="w-full text-left font-terminal text-lg whitespace-nowrap min-w-[800px]">
            <thead className="sticky top-0 bg-zinc-900 border-b-2 border-green-800 text-green-500 uppercase">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Title</th>
                <th className="p-3">Platform</th>
                <th className="p-3">Condition</th>
                <th className="p-3 text-right">Cost Basis</th>
                <th className="p-3 text-right">Sale Price</th>
                <th className="p-3 text-right">Profit</th>
                <th className="p-3 text-center">Del</th>
              </tr>
            </thead>
            <tbody>
              {sales.length === 0 && (
                <tr><td colSpan={8} className="p-8 text-center text-zinc-600">No sales logged yet. Click + LOG SALE to get started.</td></tr>
              )}
              {sales.map((s, idx) => {
                const profit = (parseFloat(s.salePrice) || 0) - (parseFloat(s.costBasis) || 0);
                return (
                  <tr key={s.id} className={`border-b border-green-900/30 hover:bg-green-900/20 ${idx % 2 === 0 ? 'bg-black/20' : ''}`}>
                    <td className="p-3 text-zinc-400">{s.saleDate}</td>
                    <td className="p-3 text-green-300 font-bold">{s.title}</td>
                    <td className="p-3 text-zinc-400 text-sm">{s.platform}</td>
                    <td className="p-3 text-zinc-500">{s.condition}</td>
                    <td className="p-3 text-right text-zinc-400">${parseFloat(s.costBasis || '0').toFixed(2)}</td>
                    <td className="p-3 text-right text-green-400 font-bold">${parseFloat(s.salePrice || '0').toFixed(2)}</td>
                    <td className={`p-3 text-right font-bold ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                    </td>
                    <td className="p-3 text-center">
                      <button onClick={() => remove('sales', s.id)} className="text-red-500 hover:text-red-300">[DEL]</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Acquisitions Log */}
      {activeTab === 'acquisitions' && (
        <div className="overflow-auto border-2 border-green-900 rounded bg-zinc-950">
          <table className="w-full text-left font-terminal text-lg whitespace-nowrap min-w-[700px]">
            <thead className="sticky top-0 bg-zinc-900 border-b-2 border-green-800 text-green-500 uppercase">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Title</th>
                <th className="p-3">Platform</th>
                <th className="p-3">Source</th>
                <th className="p-3 text-right">Cost</th>
                <th className="p-3">Notes</th>
                <th className="p-3 text-center">Del</th>
              </tr>
            </thead>
            <tbody>
              {acquisitions.length === 0 && (
                <tr><td colSpan={7} className="p-8 text-center text-zinc-600">No acquisitions logged yet. Click + LOG PURCHASE to start tracking.</td></tr>
              )}
              {acquisitions.map((a, idx) => (
                <tr key={a.id} className={`border-b border-green-900/30 hover:bg-green-900/20 ${idx % 2 === 0 ? 'bg-black/20' : ''}`}>
                  <td className="p-3 text-zinc-400">{a.date}</td>
                  <td className="p-3 text-green-300 font-bold">{a.title}</td>
                  <td className="p-3 text-zinc-400 text-sm">{a.platform}</td>
                  <td className="p-3 text-blue-400">{a.source}</td>
                  <td className="p-3 text-right text-blue-400 font-bold">${parseFloat(a.cost || '0').toFixed(2)}</td>
                  <td className="p-3 text-zinc-500 text-sm max-w-[150px] truncate">{a.notes}</td>
                  <td className="p-3 text-center">
                    <button onClick={() => remove('acquisitions', a.id)} className="text-red-500 hover:text-red-300">[DEL]</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddAsset && (
        <AddAssetModal
          title="LOG PURCHASE + ADD TO VAULT"
          onClose={() => setShowAddAsset(false)}
          onSave={handleAddAsset}
        />
      )}

      {/* Legacy Sale Form */}
      {formMode && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-sm" onClick={() => setFormMode(null)}>
          <div className="bg-zinc-950 border-4 border-green-500 p-6 rounded-sm w-full max-w-lg shadow-[0_0_30px_rgba(34,197,94,0.4)]" onClick={e => e.stopPropagation()}>
            <h3 className="text-2xl text-green-400 font-terminal uppercase mb-6 tracking-widest border-b-2 border-green-900 pb-2">
              {formMode === 'sale' ? 'LOG SALE' : 'LOG PURCHASE'}
            </h3>
            <div className="space-y-4">
              {input('title', 'Game Title')}
              {input('platform', 'Platform')}
              {formMode === 'sale' ? (
                <>
                  {input('condition', 'Condition (Loose/CIB/etc)')}
                  {input('costBasis', 'Cost Basis ($)', 'number')}
                  {input('salePrice', 'Sale Price ($)', 'number')}
                  {input('saleDate', 'Sale Date', 'date')}
                  {input('buyer', 'Buyer (optional)')}
                </>
              ) : (
                <>
                  {input('source', 'Source (Yard Sale / eBay / etc)')}
                  {input('cost', 'Total Cost ($)', 'number')}
                  {input('date', 'Date', 'date')}
                </>
              )}
              {input('notes', 'Notes (optional)')}
            </div>
            <div className="mt-6 flex justify-end gap-4">
              <button onClick={() => setFormMode(null)} className="px-4 py-2 font-terminal text-xl text-zinc-400 hover:text-white">CANCEL</button>
              <button onClick={submit} className="px-4 py-2 font-terminal text-xl bg-green-600 text-black font-bold hover:bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]">COMMIT</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
