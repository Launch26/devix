"use client";

import React from "react";
import { Volume2, VolumeX, ShieldAlert, Skull, ShieldCheck, Zap, Radio, Globe, Heart } from "lucide-react";

interface ControlConsoleProps {
  isAudioMuted: boolean;
  toggleAudio: (e?: React.MouseEvent) => void;
  setActiveTab: (tab: string) => void;
  nodes: any[];
  killedNodes: Set<string>;
  killedLinks: string[];
  packetResult: any;
}

export default function ControlConsole({
  isAudioMuted,
  toggleAudio,
  setActiveTab,
  nodes,
  killedNodes,
  killedLinks,
  packetResult,
}: ControlConsoleProps) {
  const activeNodesCount = nodes.length - killedNodes.size;
  const totalPlanetsCount = nodes.length;
  
  // Dynamic health percentage based on active nodes
  const healthPercent = totalPlanetsCount > 0 
    ? Math.round((activeNodesCount / totalPlanetsCount) * 100) 
    : 100;

  // Let's compute dynamic routes count: total links minus killed links
  // Standard Zeta-26 Star system has 15 base routes. Let's count them or use a fallback
  const availableRoutes = Math.max(0, 15 - killedLinks.length);

  // Latency calculation: use latest packet latency or fallback to a standard nominal latency
  const avgLatencyStr = packetResult?.total_latency_ms 
    ? `${packetResult.total_latency_ms.toFixed(3)} ms`
    : "12.045 ms";

  return (
    <div className="glass-card hud-corners p-6 flex flex-col gap-6 relative overflow-hidden select-none">
      {/* Subtle background glow */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-neon-cyan/5 rounded-full blur-2xl pointer-events-none" />

      {/* Floating control console header */}
      <div className="flex items-center gap-2 pb-3 border-b border-neon-cyan/10">
        <Radio className="w-4 h-4 text-neon-cyan animate-pulse" />
        <span className="font-heading tracking-[0.1em] text-[#e2e0ec] uppercase">
          COMMAND CONSOLE
        </span>
      </div>

      {/* Stacked Glass Action Buttons */}
      <div className="flex flex-col gap-3">
        {/* Sound Toggle */}
        <button
          onClick={toggleAudio}
          className={`flex items-center justify-between w-full px-4 py-3 rounded-btn border text-[12px] font-bold tracking-[0.1em] uppercase transition-all duration-300 ${
            isAudioMuted
              ? "bg-neon-crimson/5 border-neon-crimson/20 text-neon-crimson/80 hover:border-neon-crimson/40 hover:bg-neon-crimson/10"
              : "bg-neon-cyan/5 border-neon-cyan/20 text-neon-cyan hover:border-neon-cyan/50 hover:shadow-[0_0_15px_rgba(0,229,255,0.15)] hover:bg-neon-cyan/10"
          }`}
        >
          <span className="flex items-center gap-2">
            {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            {isAudioMuted ? "SOUND MUTED" : "SOUND ACTIVE"}
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${isAudioMuted ? "bg-neon-crimson animate-ping" : "bg-neon-cyan"}`} />
        </button>

        {/* Chaos Mode */}
        <button
          onClick={() => setActiveTab("chaos")}
          className="flex items-center justify-between w-full px-4 py-3 rounded-btn bg-neon-purple/5 border border-neon-purple/20 text-neon-purple hover:border-neon-purple/50 hover:shadow-[0_0_15px_rgba(139,92,246,0.15)] hover:bg-neon-purple/10 transition-all duration-300 font-bold text-[12px] tracking-[0.1em] uppercase"
        >
          <span className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            CHAOS MODE
          </span>
          <span className="text-[12px] text-[#4a4560] font-mono">⚡ SYS</span>
        </button>

        {/* Kill Planet */}
        <button
          onClick={() => setActiveTab("kill-planet")}
          className="flex items-center justify-between w-full px-4 py-3 rounded-btn bg-neon-crimson/5 border border-neon-crimson/20 text-neon-crimson hover:border-neon-crimson/50 hover:shadow-[0_0_15px_rgba(239,68,68,0.15)] hover:bg-neon-crimson/10 transition-all duration-300 font-bold text-[12px] tracking-[0.1em] uppercase"
        >
          <span className="flex items-center gap-2">
            <Skull className="w-4 h-4" />
            KILL PLANET
          </span>
          <span className="text-[12px] text-neon-crimson/40 font-mono">CRITICAL</span>
        </button>
      </div>

      {/* Divider */}
      <div className="h-[2px] bg-gradient-to-r from-transparent via-neon-cyan/80 to-transparent my-1" />

      {/* Quick Network Stats */}
      <div className="flex flex-col gap-4">
        <span className="text-[15px]  tracking-[0.1em] text-[#ffffff] uppercase">
          QUICK NETWORK STATS
        </span>

        <div className="grid grid-cols-2 gap-3">
          {/* Stat Box: Active Nodes */}
          <div className="bg-void-deep/40 p-3 rounded-btn border border-neon-cyan/5 flex flex-col gap-1">
            <span className="text-[12px] font-mono tracking-wider text-[#ffffff] uppercase">
              ACTIVE NODES
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="font-heading text-lg font-bold text-neon-cyan">
                {activeNodesCount}
              </span>
              <span className="text-[12px] text-[#ffffff] font-mono">/ {totalPlanetsCount}</span>
            </div>
          </div>

          {/* Stat Box: Health */}
          <div className="bg-void-deep/40 p-3 rounded-btn border border-neon-cyan/5 flex flex-col gap-1">
            <span className="text-[12px] font-mono tracking-wider text-[#ffffff] uppercase">
              NET HEALTH
            </span>
            <div className="flex items-baseline gap-1">
              <span className={`font-heading text-lg font-bold ${
                healthPercent > 70 
                  ? "text-neon-emerald" 
                  : healthPercent > 40 
                  ? "text-neon-orange" 
                  : "text-neon-crimson"
              }`}>
                {healthPercent}%
              </span>
            </div>
          </div>

          {/* Stat Box: Routes */}
          <div className="bg-void-deep/40 p-3 rounded-btn border border-neon-cyan/5 flex flex-col gap-1">
            <span className="text-[12px] font-mono tracking-wider text-[#ffffff] uppercase">
              ACTIVE ROUTES
            </span>
            <span className="font-heading text-lg font-bold text-neon-purple">
              {availableRoutes}
            </span>
          </div>

          {/* Stat Box: Avg Latency */}
          <div className="bg-void-deep/40 p-3 rounded-btn border border-neon-cyan/5 flex flex-col gap-1">
            <span className="text-[12px] font-mono tracking-wider text-[#ffffff] uppercase">
              AVG LATENCY
            </span>
            <span className="font-heading text-s font-bold text-neon-orange truncate mt-1">
              {avgLatencyStr}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
