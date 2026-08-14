"use client";

import { useState, useEffect, useRef, useCallback } from "react";

type Person = { id: string; name: string };

export type MentionEntry = {
  id: string; entityId: string; entityType: string; entityName: string;
  fromPerson: string; toPerson: string; message: string; createdAt: string;
};

type TagsPanelProps = {
  entityId: string;
  entityType: "game" | "platform";
  entityName: string;
  people: Person[];
};

const SUGGESTED_TAGS = [
  "hidden gem", "overpriced", "underrated", "must play", "nostalgia",
  "rpg", "platformer", "shooter", "sports", "racing", "puzzle", "fighting",
  "multiplayer", "co-op", "single player", "open world",
  "rare", "common", "japan exclusive", "PAL",
  "childhood favorite", "grail", "want to sell", "want to buy",
  "licensed music", "controversial", "cult classic",
];

export function TagsPanel({ entityId, entityType, entityName, people }: TagsPanelProps) {
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionText, setMentionText] = useState("");
  const [mentionTarget, setMentionTarget] = useState("");
  const [mentionFrom, setMentionFrom] = useState("");
  const [mentions, setMentions] = useState<MentionEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"tags" | "mentions">("tags");
  const inputRef = useRef<HTMLInputElement>(null);

  const entityStore = entityType === "platform" ? "platformTags" : "gameTags";

  const loadData = useCallback(() => {
    fetch("/api/tags")
      .then(r => r.json())
      .then(d => {
        setTags(d[entityStore]?.[entityId] || []);
        const all: MentionEntry[] = [];
        Object.entries((d.mentions || {}) as Record<string, MentionEntry[]>)
          .forEach(([toPersonId, personMentions]) => {
            personMentions.forEach(m => {
              if (m.entityId === entityId) all.push({ ...m, toPerson: toPersonId });
            });
          });
        all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setMentions(all);
      });
  }, [entityStore, entityId]);

  useEffect(() => { loadData(); }, [loadData]);

  const addTag = async (tag: string) => {
    const cleaned = tag.trim().toLowerCase().replace(/\s+/g, " ");
    if (!cleaned || tags.includes(cleaned)) return;
    const res = await fetch("/api/tags", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add_tag", entityId, entityType, tag: cleaned })
    });
    setTags((await res.json()).tags);
    setNewTag("");
    setShowSuggestions(false);
  };

  const removeTag = async (tag: string) => {
    const res = await fetch("/api/tags", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove_tag", entityId, entityType, tag })
    });
    setTags((await res.json()).tags);
  };

  const sendMention = async () => {
    if (!mentionText.trim() || !mentionTarget) return;
    const entry = await fetch("/api/tags", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "add_mention",
        mention: { entityId, entityType, entityName, fromPerson: mentionFrom || "You", toPerson: mentionTarget, message: mentionText }
      })
    }).then(r => r.json());
    setMentions(prev => [{ ...entry, toPerson: mentionTarget }, ...prev]);
    setMentionText("");
  };

  const deleteMention = async (mentionId: string, toPerson: string) => {
    await fetch("/api/tags", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_mention", personId: toPerson, mentionId })
    });
    setMentions(prev => prev.filter(m => m.id !== mentionId));
  };

  const filtered = newTag.trim()
    ? SUGGESTED_TAGS.filter(t => t.includes(newTag.toLowerCase()) && !tags.includes(t))
    : SUGGESTED_TAGS.filter(t => !tags.includes(t)).slice(0, 8);

  return (
    <div className="mt-5 border-t-2 border-zinc-800 pt-4 space-y-3">
      <div className="flex gap-2">
        <button onClick={() => setActiveTab("tags")}
          className={`px-4 py-1 font-terminal text-sm uppercase border-2 transition-colors ${activeTab === "tags" ? "bg-green-700 text-black border-green-500" : "text-zinc-500 border-zinc-700 hover:text-zinc-300"}`}>
          🏷️ Tags {tags.length > 0 && <span className="opacity-70">({tags.length})</span>}
        </button>
        <button onClick={() => setActiveTab("mentions")}
          className={`px-4 py-1 font-terminal text-sm uppercase border-2 transition-colors ${activeTab === "mentions" ? "bg-purple-700 text-white border-purple-500" : "text-zinc-500 border-zinc-700 hover:text-zinc-300"}`}>
          💬 Mentions {mentions.length > 0 && <span className="opacity-70">({mentions.length})</span>}
        </button>
      </div>

      {activeTab === "tags" && (
        <div className="space-y-3">
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {tags.map(tag => (
                <span key={tag} className="flex items-center gap-1 bg-green-950/60 border border-green-800 text-green-300 font-terminal text-sm px-3 py-1 rounded-full">
                  #{tag}
                  <button onClick={() => removeTag(tag)} className="text-green-700 hover:text-red-400 ml-1 text-xs transition-colors">✕</button>
                </span>
              ))}
            </div>
          )}
          <div className="relative">
            <div className="flex gap-2">
              <input ref={inputRef} type="text" value={newTag}
                placeholder="Type a tag or pick a suggestion..."
                className="flex-1 bg-black border-2 border-zinc-800 text-green-300 font-terminal text-sm p-2 focus:outline-none focus:border-green-600"
                onChange={e => { setNewTag(e.target.value); setShowSuggestions(true); }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                onKeyDown={e => { if (e.key === "Enter") addTag(newTag); if (e.key === "Escape") setShowSuggestions(false); }}
              />
              <button onClick={() => addTag(newTag)}
                className="px-4 py-2 bg-green-700 hover:bg-green-600 text-black font-terminal text-sm font-bold border border-green-500 transition-colors">
                + TAG
              </button>
            </div>
            {showSuggestions && filtered.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-10 bg-zinc-900 border-2 border-green-900 max-h-36 overflow-y-auto shadow-lg">
                {filtered.map(s => (
                  <button key={s} onMouseDown={() => addTag(s)}
                    className="w-full text-left px-3 py-2 text-green-400 font-terminal text-sm hover:bg-green-900/40 border-b border-zinc-800 last:border-0 transition-colors">
                    #{s}
                  </button>
                ))}
              </div>
            )}
          </div>
          {tags.length === 0 && !newTag && (
            <p className="text-zinc-700 font-terminal text-xs">No tags yet. Tags help with search and discovery.</p>
          )}
        </div>
      )}

      {activeTab === "mentions" && (
        <div className="space-y-4">
          <div className="bg-zinc-900/60 border border-purple-900/40 p-3 space-y-2 rounded-sm">
            <p className="text-purple-500 font-terminal text-xs uppercase tracking-widest">@ Mention a Player</p>
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              <select value={mentionFrom} onChange={e => setMentionFrom(e.target.value)}
                className="flex-1 min-w-0 bg-black border border-purple-900 text-purple-300 font-terminal text-sm p-2 focus:outline-none focus:border-purple-500">
                <option value="">From (you)...</option>
                {people.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
              <span className="text-purple-700 font-terminal self-center hidden sm:block">→</span>
              <select value={mentionTarget} onChange={e => setMentionTarget(e.target.value)}
                className="flex-1 min-w-0 bg-black border border-purple-900 text-purple-300 font-terminal text-sm p-2 focus:outline-none focus:border-purple-500">
                <option value="">@ notify player...</option>
                {people.filter(p => p.name !== mentionFrom).map(p => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <input type="text" value={mentionText} onChange={e => setMentionText(e.target.value)}
                placeholder={`Note about "${entityName}"...`}
                className="flex-1 bg-black border border-purple-900 text-purple-200 font-terminal text-sm p-2 focus:outline-none focus:border-purple-500"
                onKeyDown={e => { if (e.key === "Enter") sendMention(); }}
              />
              <button onClick={sendMention} disabled={!mentionText.trim() || !mentionTarget}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white font-terminal text-sm font-bold border border-purple-500 transition-colors disabled:opacity-30">
                SEND
              </button>
            </div>
          </div>
          {mentions.length > 0 ? (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {mentions.map(m => {
                const toCritic = people.find(p => p.id === m.toPerson);
                return (
                  <div key={m.id} className="bg-zinc-900 border border-purple-900/30 p-3 rounded-sm">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-purple-400 font-terminal text-xs">
                        <span className="text-zinc-300">{m.fromPerson}</span> → <span className="text-purple-300">@{toCritic?.name || "player"}</span>
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-700 font-terminal text-xs">{new Date(m.createdAt).toLocaleDateString()}</span>
                        <button onClick={() => deleteMention(m.id, m.toPerson)} className="text-zinc-700 hover:text-red-400 transition-colors text-xs">✕</button>
                      </div>
                    </div>
                    <p className="text-zinc-200 font-terminal text-sm">{m.message}</p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-zinc-700 font-terminal text-xs">No mentions on this {entityType} yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
