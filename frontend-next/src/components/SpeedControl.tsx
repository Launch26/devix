"use client";

import React from "react";
import { Gauge } from "lucide-react";

interface SpeedControlProps {
  animSpeed: number;
  setAnimSpeed: (v: number) => void;
}

export default function SpeedControl({ animSpeed, setAnimSpeed }: SpeedControlProps) {
  return (
    <div className="flex items-center gap-4 bg-void-deep/80 backdrop-blur-md border border-neon-cyan/15 rounded-full px-4 py-2 shadow-glow-cyan/5 w-fit select-none">
      <div className="flex items-center gap-1.5 text-neon-cyan">
        <Gauge className="w-3.5 h-3.5 animate-pulse" />
        <span className="text-[10px] font-mono tracking-widest uppercase">
          WARP SPEED:
        </span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min="0.1"
          max="4"
          step="0.5"
          value={animSpeed}
          onChange={(e) => setAnimSpeed(parseFloat(e.target.value))}
          className="w-24 h-1 bg-void rounded-lg appearance-none cursor-pointer accent-neon-cyan focus:outline-none"
        />
        <span className="text-[10px] font-mono font-bold text-neon-cyan w-8">
          {animSpeed.toFixed(1)}x
        </span>
      </div>
    </div>
  );
}
