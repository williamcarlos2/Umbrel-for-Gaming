"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

type PublicItem = {
  id: string;
  title: string;
  platform: string;
  priority: 1 | 2 | 3;
  notes?: string | null;
  addedAt: string;
};

const PRIORITY_META = {
  1: { label: "⭐ Must-Have", color: "border-yellow-700 text-yellow-300", badge: "bg-yellow-900 text-yellow-300" },
  2: { label: "🎮 Want",      color: "border-green-700  text-green-400",  badge: "bg-green-900  text-green-300"  },
  3: { label: "📦 Someday",   color: "border-zinc-700   text-zinc-400",   badge: "bg-zinc-800   text-zinc-300"   },
};

export default function PublicWishlistPage() {
  const params = useParams<{ token: string }>();
  const [label, setLabel] = useState("Wishlist");
  const [items, setItems] = useState<PublicItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!params.token) return;
    fetch(`/api/wishlist/public/${params.token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) { setNotFound(true); }
        else { setLabel(d.label); setItems(d.items || []); }
        setLoading(false);
      })
      .catch(() => { setNotFound(true); setLoading(false); });
  }, [params.token]);

  const grouped = ([1, 2, 3] as const).map(p => ({
    priority: p,
    items: items.filter(i => i.priority === p),
  })).filter(g => g.items.length > 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <p className="text-green-700 font-terminal animate-pulse">LOADING...</p>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 font-terminal text-xl mb-2">404</p>
          <p className="text-zinc-600 font-terminal">Wishlist not found or link expired.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-6 font-terminal">
      <div className="max-w-3xl mx-auto">
        <div className="border-4 border-green-700 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.2)] mb-6">
          <h1 className="text-2xl text-green-400 tracking-widest uppercase">🎁 {label}</h1>
          <p className="text-zinc-600 text-sm mt-1">{items.length} item{items.length !== 1 ? "s" : ""} wanted</p>
        </div>

        {items.length === 0 ? (
          <p className="text-zinc-600 text-center py-12">Nothing on this wishlist yet!</p>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ priority, items: groupItems }) => {
              const meta = PRIORITY_META[priority];
              return (
                <div key={priority}>
                  <h2 className={`text-sm uppercase tracking-wider mb-3 ${meta.color.split(" ")[1]}`}>
                    {meta.label}
                  </h2>
                  <div className="space-y-2">
                    {groupItems.map(item => (
                      <div key={item.id} className={`border p-3 ${meta.color}`}>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{item.title}</p>
                            {item.notes && (
                              <p className="text-zinc-500 text-xs mt-0.5">{item.notes}</p>
                            )}
                          </div>
                          <span className={`text-xs px-2 py-0.5 shrink-0 ${meta.badge}`}>
                            {item.platform}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <p className="text-zinc-800 text-xs text-center mt-8">
          Powered by RetroVault · <a href="https://github.com/theretrovault/retrovault" className="hover:text-zinc-600">github.com/theretrovault/retrovault</a>
        </p>
      </div>
    </div>
  );
}
