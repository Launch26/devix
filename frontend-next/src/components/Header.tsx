"use client";

import React from "react";

interface HeaderProps {
  isOperational: boolean;

}

export default function Header({
  isOperational,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full h-16 glass-header px-6 flex items-center justify-between select-none">
      {/* Cinematic grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,229,255,0.01)_1px,transparent_1px)] bg-[size:10rem] pointer-events-none" />

      {/* Left: Title */}
      <div className="relative z-10 flex flex-col justify-center">
        <h1 className="font-heading text-lg md:text-xl font-extrabold tracking-[0.2em] leading-none text-metallic uppercase select-none cursor-default drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
          RELIC RING PROTOCOL
        </h1>

        <div className="font-mono text-[9px] tracking-[0.25em] text-neon-cyan/70 mt-1 uppercase">
          ZETA-26 STAR SYSTEM — AI ROUTING SIMULATOR
        </div>
      </div>

      {/* Center: System Status */}
      <div className="relative z-10 hidden sm:flex items-center gap-3 bg-void-deep/60 px-4 py-1.5 rounded-full border border-neon-cyan/10">
        <span className="font-mono text-[9px] tracking-wider text-[#9d97b5] uppercase">
          SYSTEM STATUS:
        </span>

        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full transition-all duration-1000 ${isOperational
                ? "bg-neon-emerald shadow-[0_0_10px_#00ffb3] animate-pulse"
                : "bg-neon-crimson shadow-[0_0_10px_#ef4444]"
              }`}
          />

          <span
            className={`font-mono text-[10px] font-bold tracking-wider ${isOperational ? "text-neon-emerald" : "text-neon-crimson"
              }`}
          >
            {isOperational ? "OPERATIONAL" : "DEGRADED"}
          </span>
        </div>
      </div>
    </header>
  );
}