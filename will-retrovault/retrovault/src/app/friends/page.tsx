"use client";

import { useState, useEffect } from "react";

type Person = { id: string; name: string };
type GameItem = { id: string; title: string; platform: string; copies: { id: string }[] };
type MentionEntry = { id: string; entityId: string; entityName: string; fromPerson: string; message: string; createdAt: string; };

export default function FriendsPage() {
  const [people, setPeople] = useState<Person[]>([]);
  const [items, setItems] = useState<GameItem[]>([]);
  const [favData, setFavData] = useState<Record<string, string[]>>({});
  const [regretData, setRegretData] = useState<Record<string, string[]>>({});
  const [tagsData, setTagsData] = useState<{ mentions: Record<string, MentionEntry[]> }>({ mentions: {} });
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/favorites").then(r => r.json()),
      fetch("/api/inventory").then(r => r.json()),
      fetch("/api/tags").then(r => r.json()),
    ]).then(([favs, inv, tags]) => {
      setPeople(favs.people || []);
      setFavData(favs.favorites || {});
      setRegretData(favs.regrets || {});
      setItems(inv);
      setTagsData(tags);
      setLoading(false);
    });
  }, []);

  const selectedPerson = people.find(p => p.id === selected);

  const getProfile = (person: Person) => {
    const favIds = favData[person.id] || [];
    const regIds = regretData[person.id] || [];
    const mentions = tagsData.mentions[person.id] || [];
    const favItems = items.filter(i => favIds.includes(i.id));
    const regItems = items.filter(i => regIds.includes(i.id));
    const platforms = Array.from(new Set([...favItems, ...regItems].map(i => i.platform)));
    const positivity = favIds.length + regIds.length > 0
      ? Math.round((favIds.length / (favIds.length + regIds.length)) * 100)
      : null;
    return { favIds, regIds, mentions, favItems, regItems, platforms, positivity };
  };

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      <div className="border-b-4 border-green-900 pb-6 mb-8">
        <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">👥 Friends Mode</h2>
        <p className="text-zinc-500 font-terminal text-sm mt-1">Each player&apos;s personal view of your collection</p>
      </div>

      {loading ? (
        <div className="text-green-500 font-terminal text-2xl animate-pulse text-center py-12">LOADING...</div>
      ) : people.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">👥</div>
          <p className="text-zinc-500 font-terminal text-xl mb-2">No players added yet.</p>
          <p className="text-zinc-700 font-terminal text-sm">Add players from the Vault → Players button.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* People list */}
          <div className="space-y-3">
            <h3 className="text-zinc-400 font-terminal text-lg uppercase mb-3">Players ({people.length})</h3>
            {people.map(p => {
              const profile = getProfile(p);
              const isSelected = selected === p.id;
              return (
                <button key={p.id} onClick={() => setSelected(isSelected ? null : p.id)}
                  className={`w-full text-left border-2 p-4 transition-all ${isSelected ? 'border-purple-500 bg-purple-950/20 shadow-[0_0_10px_rgba(168,85,247,0.2)]' : 'border-zinc-800 hover:border-zinc-600'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-zinc-200 font-terminal text-lg">{p.name}</span>
                    {profile.positivity !== null && (
                      <span className={`font-terminal text-sm px-2 py-0.5 border ${profile.positivity >= 60 ? 'text-emerald-400 border-emerald-700' : 'text-orange-400 border-orange-800'}`}>
                        {profile.positivity}% 👍
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3 font-terminal text-xs text-zinc-600">
                    <span>⭐ {profile.favIds.length}</span>
                    <span>👎 {profile.regIds.length}</span>
                    <span>💬 {profile.mentions.length}</span>
                    <span>🎮 {profile.platforms.length} platforms</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Profile panel */}
          <div className="lg:col-span-2">
            {selectedPerson ? (() => {
              const profile = getProfile(selectedPerson);
              return (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="border-2 border-purple-700 bg-purple-950/10 p-5">
                    <h3 className="text-purple-300 font-terminal text-2xl mb-1">{selectedPerson.name}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                      {[
                        { label: "Favorites", val: profile.favIds.length, color: "text-yellow-400" },
                        { label: "Regrets", val: profile.regIds.length, color: "text-red-400" },
                        { label: "Mentions", val: profile.mentions.length, color: "text-purple-300" },
                        { label: "Platforms", val: profile.platforms.length, color: "text-blue-400" },
                      ].map(({ label, val, color }) => (
                        <div key={label} className="bg-zinc-900 p-3 text-center border border-purple-900/30">
                          <div className={`font-terminal text-2xl font-bold ${color}`}>{val}</div>
                          <div className="text-zinc-600 font-terminal text-xs">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mentions */}
                  {profile.mentions.length > 0 && (
                    <div>
                      <h4 className="text-purple-400 font-terminal text-lg uppercase mb-3">💬 Mentions for {selectedPerson.name}</h4>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {profile.mentions.map(m => (
                          <div key={m.id} className="border border-purple-900/30 bg-zinc-950 p-3">
                            <div className="flex justify-between mb-1">
                              <span className="text-purple-400 font-terminal text-xs">
                                <span className="text-zinc-300">{m.fromPerson}</span> on <span className="text-green-400">{m.entityName}</span>
                              </span>
                              <span className="text-zinc-700 font-terminal text-xs">{new Date(m.createdAt).toLocaleDateString()}</span>
                            </div>
                            <p className="text-zinc-300 font-terminal text-sm">{m.message}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Favorites */}
                  {profile.favItems.length > 0 && (
                    <div>
                      <h4 className="text-yellow-400 font-terminal text-lg uppercase mb-3">⭐ {selectedPerson.name}&apos;s Favorites ({profile.favItems.length})</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto">
                        {profile.favItems.map(i => (
                          <div key={i.id} className="border border-yellow-900/40 bg-yellow-950/10 p-3">
                            <div className="text-yellow-200 font-terminal text-sm truncate">{i.title}</div>
                            <div className="text-zinc-600 font-terminal text-xs">{i.platform}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Regrets */}
                  {profile.regItems.length > 0 && (
                    <div>
                      <h4 className="text-red-400 font-terminal text-lg uppercase mb-3">👎 {selectedPerson.name}&apos;s Regrets ({profile.regItems.length})</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-52 overflow-y-auto">
                        {profile.regItems.map(i => (
                          <div key={i.id} className="border border-red-900/40 bg-red-950/10 p-3">
                            <div className="text-red-200 font-terminal text-sm truncate">{i.title}</div>
                            <div className="text-zinc-600 font-terminal text-xs">{i.platform}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {profile.favItems.length === 0 && profile.regItems.length === 0 && profile.mentions.length === 0 && (
                    <div className="text-zinc-700 font-terminal text-xl text-center py-8 border-2 border-dashed border-zinc-800">
                      {selectedPerson.name} hasn&apos;t rated anything yet.
                    </div>
                  )}
                </div>
              );
            })() : (
              <div className="border-2 border-dashed border-zinc-800 p-12 text-center">
                <div className="text-zinc-700 font-terminal text-xl">Select a player to see their profile</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
