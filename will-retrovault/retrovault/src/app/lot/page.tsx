"use client";
import { useEffect, useState } from "react";

type InventoryItem = { id: string; title: string; platform: string; copies: { id?: string; priceAcquired?: string | number }[]; marketLoose?: string; marketCib?: string; };
type LotItem = { id: string; title: string; platform: string; marketValue: number; allocatedCost: number; };

export default function LotPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [totalPaid, setTotalPaid] = useState("");
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<LotItem[] | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/inventory').then(r => r.json()).then(d =>
      setInventory(d.filter((i: InventoryItem) => (i.copies || []).length === 0))
    );
  }, []);

  const filteredInventory = inventory
    .filter(i => !selectedIds.has(i.id))
    .filter(i => i.title.toLowerCase().includes(search.toLowerCase()) || i.platform.toLowerCase().includes(search.toLowerCase()))
    .slice(0, 50);

  const selectedItems = inventory.filter(i => selectedIds.has(i.id));

  const getMarketValue = (item: InventoryItem) =>
    parseFloat(item.marketLoose || '0') || parseFloat(item.marketCib || '0') || 0;

  const totalMarket = selectedItems.reduce((s, i) => s + getMarketValue(i), 0);
  const paid = parseFloat(totalPaid) || 0;

  const calculate = () => {
    if (!paid || selectedItems.length === 0) return;
    const lotItems: LotItem[] = selectedItems.map(item => {
      const mv = getMarketValue(item);
      // Allocate cost proportionally to market value, floor at 0
      const allocated = totalMarket > 0 ? (mv / totalMarket) * paid : paid / selectedItems.length;
      return { id: item.id, title: item.title, platform: item.platform, marketValue: mv, allocatedCost: allocated };
    });
    setResult(lotItems);
  };

  const saveToInventory = async () => {
    if (!result) return;
    setSaving(true);
    for (const item of result) {
      const invItem = inventory.find(i => i.id === item.id);
      if (!invItem) continue;
      const updatedItem = {
        ...invItem,
        copies: [{
          id: Date.now().toString() + Math.random().toString(36).slice(2),
          hasBox: false, hasManual: false,
          priceAcquired: item.allocatedCost.toFixed(2),
          condition: 'Good'
        }]
      };
      await fetch('/api/inventory', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedItem)
      });
    }
    setSaving(false);
    setResult(null);
    setSelectedIds(new Set());
    setTotalPaid("");
    alert(`Saved ${result.length} games to inventory with allocated costs.`);
  };

  const roi = totalMarket > 0 && paid > 0 ? ((totalMarket - paid) / paid * 100).toFixed(1) : null;

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh] flex flex-col space-y-6">
      <header className="border-b-4 border-green-900 pb-6">
        <div className="flex items-center gap-4">
          <span className="text-3xl">📦</span>
          <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase">Lot Calculator</h2>
        </div>
        <p className="text-zinc-500 font-terminal text-sm mt-2">
          Bought a bulk lot? Enter what you paid, add the games, and we&apos;ll allocate cost per title based on market value.
        </p>
      </header>

      {/* Total Paid */}
      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="flex-1">
          <label className="block text-zinc-400 font-terminal text-sm mb-1 uppercase">Total Amount Paid for Lot</label>
          <div className="flex items-center">
            <span className="text-green-400 font-terminal text-2xl px-3 bg-zinc-900 border-2 border-r-0 border-green-800 h-12 flex items-center">$</span>
            <input type="number" step="0.01" className="flex-1 bg-black border-2 border-green-800 text-green-300 p-2 font-terminal text-2xl focus:outline-none focus:border-green-400 h-12"
              placeholder="0.00" value={totalPaid} onChange={e => setTotalPaid(e.target.value)} />
          </div>
        </div>
        {selectedItems.length > 0 && paid > 0 && (
          <div className="flex gap-6 font-terminal text-lg">
            <div className="text-center">
              <div className="text-zinc-500 text-sm">Market Total</div>
              <div className="text-blue-400 font-bold text-2xl">${totalMarket.toFixed(2)}</div>
            </div>
            {roi && (
              <div className="text-center">
                <div className="text-zinc-500 text-sm">Paper ROI</div>
                <div className={`font-bold text-2xl ${parseFloat(roi) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {parseFloat(roi) >= 0 ? '+' : ''}{roi}%
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Game Picker */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-green-400 font-terminal text-xl uppercase">Add Games to Lot</h3>
            <span className="text-zinc-600 font-terminal text-sm">{selectedItems.length} selected</span>
          </div>
          <input type="text" className="w-full bg-zinc-950 border-2 border-green-800 text-green-400 p-2 font-terminal text-lg uppercase mb-2 focus:outline-none"
            placeholder="SEARCH CATALOG..." value={search} onChange={e => setSearch(e.target.value)} />
          <div className="border-2 border-green-900 rounded bg-zinc-950 max-h-80 overflow-y-auto">
            {filteredInventory.map(item => {
              const mv = getMarketValue(item);
              return (
                <button key={item.id} onClick={() => setSelectedIds(p => { const n = new Set(p); n.add(item.id); return n; })}
                  className="w-full flex justify-between items-center p-3 hover:bg-green-900/20 border-b border-green-900/30 text-left transition-colors">
                  <div>
                    <div className="text-green-300 font-terminal font-bold text-lg">{item.title}</div>
                    <div className="text-zinc-500 font-terminal text-sm">{item.platform}</div>
                  </div>
                  <span className={`font-terminal font-bold ${mv > 0 ? 'text-blue-400' : 'text-zinc-700'}`}>
                    {mv > 0 ? `$${mv.toFixed(2)}` : 'No price'}
                  </span>
                </button>
              );
            })}
            {filteredInventory.length === 0 && (
              <p className="text-zinc-600 font-terminal text-center p-6">No results. Type to search the catalog.</p>
            )}
          </div>
        </div>

        {/* Selected Games */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-green-400 font-terminal text-xl uppercase">Lot Contents</h3>
            {selectedItems.length > 0 && (
              <button onClick={() => setSelectedIds(new Set())} className="text-red-500 hover:text-red-300 font-terminal text-sm">CLEAR ALL</button>
            )}
          </div>
          <div className="border-2 border-green-900 rounded bg-zinc-950 max-h-80 overflow-y-auto">
            {selectedItems.length === 0 ? (
              <p className="text-zinc-600 font-terminal text-center p-6">Add games from the left panel.</p>
            ) : (
              selectedItems.map(item => {
                const mv = getMarketValue(item);
                const allocated = result?.find(r => r.id === item.id);
                return (
                  <div key={item.id} className="flex justify-between items-center p-3 border-b border-green-900/30">
                    <div>
                      <div className="text-green-300 font-terminal font-bold text-lg">{item.title}</div>
                      <div className="text-zinc-500 font-terminal text-sm">{item.platform}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="text-blue-400 font-terminal text-sm">${mv > 0 ? mv.toFixed(2) : '--'}</div>
                        {allocated && <div className="text-yellow-400 font-terminal text-sm">→ ${allocated.allocatedCost.toFixed(2)}</div>}
                      </div>
                      <button onClick={() => setSelectedIds(p => { const n = new Set(p); n.delete(item.id); return n; })}
                        className="text-red-600 hover:text-red-400 font-terminal text-lg">✕</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="flex gap-3 mt-4">
            <button onClick={calculate} disabled={!paid || selectedItems.length === 0}
              className="flex-1 bg-green-600 hover:bg-green-500 text-black font-terminal font-bold text-xl py-2 disabled:opacity-50 transition-colors">
              CALCULATE
            </button>
            {result && (
              <button onClick={saveToInventory} disabled={saving}
                className="flex-1 bg-blue-700 hover:bg-blue-600 text-white font-terminal font-bold text-xl py-2 disabled:opacity-50 transition-colors">
                {saving ? "SAVING..." : "SAVE TO INVENTORY"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="border-2 border-yellow-700 rounded-sm p-4 bg-zinc-950">
          <h3 className="text-yellow-400 font-terminal text-xl mb-4 uppercase">Cost Allocation Results</h3>
          <div className="overflow-x-auto">
            <table className="w-full font-terminal text-lg">
              <thead className="text-zinc-500 border-b border-zinc-700">
                <tr>
                  <th className="pb-2 text-left">Title</th>
                  <th className="pb-2 text-left">Platform</th>
                  <th className="pb-2 text-right">Market Value</th>
                  <th className="pb-2 text-right">Market %</th>
                  <th className="pb-2 text-right">Allocated Cost</th>
                  <th className="pb-2 text-right">Paper Profit</th>
                </tr>
              </thead>
              <tbody>
                {result.map(item => {
                  const profit = item.marketValue - item.allocatedCost;
                  const pct = totalMarket > 0 ? ((item.marketValue / totalMarket) * 100).toFixed(1) : '0';
                  return (
                    <tr key={item.id} className="border-b border-zinc-800 hover:bg-zinc-900">
                      <td className="py-2 text-green-300 font-bold pr-4">{item.title}</td>
                      <td className="py-2 text-zinc-500 text-sm pr-4">{item.platform}</td>
                      <td className="py-2 text-blue-400 text-right pr-4">{item.marketValue > 0 ? `$${item.marketValue.toFixed(2)}` : '--'}</td>
                      <td className="py-2 text-zinc-400 text-right pr-4">{pct}%</td>
                      <td className="py-2 text-yellow-400 font-bold text-right pr-4">${item.allocatedCost.toFixed(2)}</td>
                      <td className={`py-2 font-bold text-right ${profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {profit >= 0 ? '+' : ''}${profit.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-zinc-800 font-bold">
                  <td colSpan={2} className="py-2 pl-2 text-zinc-200">TOTALS</td>
                  <td className="py-2 text-blue-400 text-right pr-4">${totalMarket.toFixed(2)}</td>
                  <td className="py-2 text-right pr-4">100%</td>
                  <td className="py-2 text-yellow-400 text-right pr-4">${paid.toFixed(2)}</td>
                  <td className={`py-2 text-right ${totalMarket - paid >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {totalMarket - paid >= 0 ? '+' : ''}${(totalMarket - paid).toFixed(2)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
