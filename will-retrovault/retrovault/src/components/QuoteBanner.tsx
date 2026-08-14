"use client";

import { useState } from "react";
import { QUOTES, type Quote } from "@/data/quotes";

const pickRandom = () => QUOTES[Math.floor(Math.random() * QUOTES.length)];

export function QuoteBanner() {
  const [quote, setQuote] = useState<Quote | null>(() => pickRandom());
  const [fading, setFading] = useState(false);


  const cycle = () => {
    setFading(true);
    setTimeout(() => {
      setQuote(pickRandom());
      setFading(false);
    }, 300);
  };

  if (!quote) return null;

  return (
    <div
      className="w-full bg-zinc-950 border-b border-green-900/40 px-4 py-2 flex items-center justify-between gap-4 cursor-pointer group hover:border-green-700/60 transition-colors"
      onClick={cycle}
      title="Click for another quote"
    >
      <div className={`flex-1 min-w-0 transition-opacity duration-300 ${fading ? "opacity-0" : "opacity-100"}`}>
        <span className="text-green-700 font-terminal text-xs mr-2 shrink-0">❝</span>
        <span className="text-zinc-400 font-terminal text-sm italic">
          {quote.text}
        </span>
        <span className="text-green-700 font-terminal text-xs ml-1 mr-3">❞</span>
        <span className="text-green-600 font-terminal text-xs">
          — {quote.author}
          {quote.role ? <span className="text-zinc-600"> · {quote.role}</span> : null}
        </span>
      </div>
      <span className="text-zinc-700 font-terminal text-xs shrink-0 group-hover:text-zinc-500 transition-colors hidden sm:block">
        ↻ click to refresh
      </span>
    </div>
  );
}
