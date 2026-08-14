"use client";

import { useState } from "react";
import { RARITIES, type Achievement, type AchievementContext } from "@/data/achievements";
import { AchievementModal } from "@/components/AchievementModal";

type Props = {
  achievement: Achievement;
  unlocked: boolean;
  context?: AchievementContext;
  compact?: boolean; // smaller layout for dashboard widgets
};

export function AchievementCard({ achievement, unlocked, context, compact = false }: Props) {
  const [open, setOpen] = useState(false);
  const cfg = RARITIES[achievement.rarity];

  if (compact) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          title={`${achievement.name} — click for details`}
          className={`border ${cfg.border} ${cfg.bg} p-3 flex items-center gap-2 w-full text-left hover:brightness-110 transition-all cursor-pointer ${!unlocked ? "opacity-50 grayscale" : ""}`}>
          <span className="text-2xl shrink-0">{achievement.icon}</span>
          <div className="min-w-0">
            <div className={`font-terminal text-xs ${cfg.color} truncate`}>{achievement.name}</div>
            <div className="text-zinc-700 font-terminal text-xs">+{achievement.points}pts</div>
          </div>
          <span className={`font-terminal text-xs shrink-0 ml-auto ${cfg.color} opacity-50`}>▶</span>
        </button>

        {open && (
          <AchievementModal
            achievement={achievement}
            unlocked={unlocked}
            context={context}
            onClose={() => setOpen(false)}
          />
        )}
      </>
    );
  }

  // Full card (used on /achievements page)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={`text-left border-2 p-4 transition-all hover:scale-[1.01] cursor-pointer w-full ${
          unlocked
            ? `${cfg.border} ${cfg.bg} shadow-sm`
            : "border-zinc-800 opacity-50 grayscale"
        }`}>
        <div className="flex items-start gap-3">
          <div className={`text-3xl shrink-0 ${!unlocked ? "opacity-30" : ""}`}>{achievement.icon}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-0.5">
              <span className={`font-terminal text-base ${unlocked ? cfg.color : "text-zinc-500"}`}>{achievement.name}</span>
              {unlocked && <span className="text-zinc-500 text-xs">✓</span>}
            </div>
            <p className="text-zinc-600 font-terminal text-xs mb-2">
              {achievement.secret && !unlocked ? "???" : (achievement.description || achievement.condition)}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`font-terminal text-xs px-1.5 py-0.5 border ${cfg.color} ${cfg.border}`}>
                {cfg.label}
              </span>
              <span className={`font-terminal text-xs ml-auto ${unlocked ? cfg.color : "text-zinc-700"}`}>
                +{achievement.points}pts
              </span>
            </div>
            {!unlocked && !achievement.secret && (
              <p className="text-zinc-700 font-terminal text-xs mt-1 italic">{achievement.condition}</p>
            )}
          </div>
        </div>
      </button>

      {open && (
        <AchievementModal
          achievement={achievement}
          unlocked={unlocked}
          context={context}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
