"use client";

import React from "react";

export default function LoadingScreen() {
  return (
    <div className="relative flex flex-col items-center justify-center h-screen w-screen bg-void overflow-hidden select-none">
      {/* Cinematic grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,229,255,0.02)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,229,255,0.02)_1px,transparent_1px)] bg-[size:4rem_4rem] pointer-events-none" />
      
      {/* Glowing atmospheric orb */}
      <div className="absolute w-[500px] h-[500px] rounded-full bg-neon-purple/5 blur-[120px] pointer-events-none animate-pulse-glow" />
      
      {/* Sci-Fi HUD Scanlines */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-neon-cyan/[0.03] to-transparent h-full w-full pointer-events-none animate-scan-line" />

      <div className="relative flex flex-col items-center z-10 max-w-md text-center px-6">
        {/* Glowing complex loader */}
        <div className="relative w-24 h-24 mb-10 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-neon-cyan/10" />
          <div className="absolute inset-2 rounded-full border border-dashed border-neon-purple/20 animate-spin-slow" />
          <div className="absolute inset-0 rounded-full border-t-2 border-r-2 border-neon-cyan shadow-[0_0_15px_rgba(0,229,255,0.4)] animate-spin" style={{ animationDuration: '1.2s' }} />
          <span className="text-[10px] font-mono tracking-widest text-neon-cyan animate-pulse">Z-26</span>
        </div>

        {/* Text descriptions */}
        <h2 className="font-heading text-lg md:text-xl font-black uppercase tracking-[0.3em] mb-3 text-metallic">
          INITIALIZING SYSTEM
        </h2>
        
        <p className="text-xs font-mono tracking-[0.2em] text-neon-cyan/60 uppercase">
          ZETA-26 STAR SYSTEM // ROUTING SIMULATOR
        </p>

        <div className="mt-8 w-48 h-[1px] bg-gradient-to-r from-transparent via-neon-cyan/30 to-transparent" />
        
        <div className="mt-4 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-neon-emerald animate-ping" />
          <span className="text-[10px] font-mono tracking-widest text-[#9d97b5] uppercase">
            CONNECTING INTERPLANETARY DATA RING...
          </span>
        </div>
      </div>
    </div>
  );
}
