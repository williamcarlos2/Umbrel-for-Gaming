"use client";

import { useState, useRef } from "react";

type Props = {
  label: string;
  description?: string;
  children: React.ReactNode;
  side?: "bottom" | "top";
};

export function NavTooltip({ label, description, children, side = "bottom" }: Props) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), 800); // 0.8s delay
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  return (
    <div className="relative" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div className={`absolute z-[200] pointer-events-none ${
          side === "bottom" ? "top-full mt-2 left-1/2 -translate-x-1/2" : "bottom-full mb-2 left-1/2 -translate-x-1/2"
        }`}>
          <div className="bg-zinc-950 border-2 border-green-700 px-3 py-2 shadow-[0_0_12px_rgba(34,197,94,0.3)] min-w-max max-w-[220px]">
            <div className="font-terminal text-green-300 text-sm uppercase tracking-wide">{label}</div>
            {description && (
              <div className="font-terminal text-zinc-500 text-xs mt-0.5 leading-snug">{description}</div>
            )}
            {/* Arrow */}
            <div className={`absolute left-1/2 -translate-x-1/2 w-0 h-0 ${
              side === "bottom"
                ? "bottom-full border-l-4 border-r-4 border-b-4 border-l-transparent border-r-transparent border-b-green-700"
                : "top-full border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-green-700"
            }`} />
          </div>
        </div>
      )}
    </div>
  );
}
