"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, ShieldAlert, Cpu, Activity, Clock, ShieldCheck } from "lucide-react";

interface PacketAnimationProps {
  packetResult: any;
  sending: boolean;
  activeHop: number;
}

export default function PacketAnimation({
  packetResult,
  sending,
  activeHop,
}: PacketAnimationProps) {
  const [dots, setDots] = useState("");

  // Simple loading dots animator for the idle/transit displays
  useEffect(() => {
    if (!sending) return;
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, [sending]);

  // Derived properties
  const route = packetResult?.route || [];
  const totalHops = Math.max(0, route.length - 1);
  const isComplete = packetResult && !sending && activeHop === -1;
  const currentHopName = activeHop >= 0 ? route[activeHop] : "Idle";
  const progressPercent = sending
    ? Math.round(((activeHop + 1) / (route.length || 1)) * 100)
    : isComplete
    ? 100
    : 0;

  // Let's create an ETA string
  const etaVal = sending
    ? `${((totalHops - activeHop) * 0.4).toFixed(1)}s`
    : isComplete
    ? "0.0s"
    : "—";

  return (
    <div className="glass-card hud-corners p-5 flex flex-col gap-4 relative overflow-hidden h-full min-h-[250px] select-none">
      {/* Background glow effects */}
      <div 
        className={`absolute -left-6 -top-6 w-24 h-24 rounded-full blur-2xl pointer-events-none transition-all duration-700 ${
          sending ? "bg-neon-orange/10" : isComplete ? "bg-neon-emerald/10" : "bg-neon-cyan/5"
        }`} 
      />

      {/* Header bar */}
      <div className="flex items-center justify-between pb-3 border-b border-neon-cyan/10">
        <div className="flex items-center gap-2">
          <Activity className="w-3.5 h-3.5 text-neon-cyan animate-pulse" />
          <span className="font-heading text-xs font-bold tracking-widest text-[#e2e0ec] uppercase">
            LIVE ROUTING PROCESSOR
          </span>
        </div>
        {sending && (
          <span className="text-[9px] font-mono text-neon-orange font-bold animate-pulse uppercase tracking-wider">
            TRANSMITTING{dots}
          </span>
        )}
        {isComplete && (
          <span className="text-[9px] font-mono text-neon-emerald font-bold uppercase tracking-wider flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> VERIFIED
          </span>
        )}
      </div>

      {/* Core visualization section */}
      {!packetResult && !sending ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2 py-6">
          <Cpu className="w-8 h-8 text-[#4a4560] animate-pulse" />
          <span className="text-xs font-heading font-semibold tracking-wider text-[#9d97b5]">
            AWAITING UPLINK
          </span>
          <span className="text-[10px] font-mono text-[#4a4560] max-w-xs uppercase tracking-wide">
            Select origin/destination planets and press transmit to initialize telemetry data routing.
          </span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col justify-between gap-4">
          
          {/* Node Meta Specs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono">
            <div className="bg-void-deep/50 p-2 rounded-btn border border-neon-cyan/5">
              <div className="text-[#4a4560] text-[8px] uppercase tracking-wider">SOURCE</div>
              <div className="text-neon-cyan font-bold truncate mt-0.5">
                {packetResult?.origin_id || "Gaia Prime"}
              </div>
            </div>
            
            <div className="bg-void-deep/50 p-2 rounded-btn border border-neon-cyan/5">
              <div className="text-[#4a4560] text-[8px] uppercase tracking-wider">DESTINATION</div>
              <div className="text-neon-purple font-bold truncate mt-0.5">
                {packetResult?.destination_id || "Atlas"}
              </div>
            </div>

            <div className="bg-void-deep/50 p-2 rounded-btn border border-neon-cyan/5">
              <div className="text-[#4a4560] text-[8px] uppercase tracking-wider">HOP INDX</div>
              <div className="text-neon-orange font-bold truncate mt-0.5">
                {sending ? `HOP ${activeHop + 1}/${route.length}` : isComplete ? "COMPLETE" : "0"}
              </div>
            </div>

            <div className="bg-void-deep/50 p-2 rounded-btn border border-neon-cyan/5">
              <div className="text-[#4a4560] text-[8px] uppercase tracking-wider">PACKET ID</div>
              <div className="text-neon-emerald font-bold truncate mt-0.5">
                {packetResult?.packet_id ? packetResult.packet_id.substring(0, 8) : "—"}
              </div>
            </div>
          </div>

          {/* Dynamic Interactive Hop Timeline Nodes */}
          <div className="relative flex items-center justify-between py-6 px-4">
            {/* Absolute Glowing Connect Line */}
            <div className="absolute left-6 right-6 top-[50%] h-[2px] bg-void-deep pointer-events-none z-0">
              <div 
                className="h-full bg-gradient-to-r from-neon-cyan via-neon-orange to-neon-purple transition-all duration-300 shadow-[0_0_8px_#00e5ff]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Planet Node Indicators */}
            {route.map((planet: string, index: number) => {
              const isActive = sending && index === activeHop;
              const isPassed = isComplete || (sending && index < activeHop);
              
              return (
                <div key={index} className="relative z-10 flex flex-col items-center gap-1.5">
                  {/* Glowing core indicator */}
                  <div 
                    className={`w-6 h-6 rounded-full border flex items-center justify-center font-mono text-[9px] font-bold transition-all duration-300 ${
                      isActive 
                        ? "bg-neon-orange border-none text-[#070b14] scale-125 shadow-[0_0_12px_#ff9f43] animate-pulse"
                        : isPassed
                        ? "bg-neon-emerald border-none text-[#070b14] shadow-[0_0_8px_#00ffb3]"
                        : "bg-[#070b14] border-neon-cyan/20 text-[#4a4560]"
                    }`}
                  >
                    {index + 1}
                  </div>
                  {/* Planet label */}
                  <span 
                    className={`text-[8px] font-mono tracking-wider transition-colors duration-300 ${
                      isActive 
                        ? "text-neon-orange font-extrabold"
                        : isPassed
                        ? "text-neon-emerald"
                        : "text-[#4a4560]"
                    }`}
                  >
                    {planet.substring(0, 4).toUpperCase()}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress Bar & ETA */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between font-mono text-[10px]">
              <span className="text-[#9d97b5]">ROUTING COMPLETED:</span>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[#9d97b5]">
                  <Clock className="w-3.5 h-3.5" /> ETA: <strong className="text-neon-cyan">{etaVal}</strong>
                </span>
                <span className="text-[#e2e0ec] font-bold">{progressPercent}%</span>
              </div>
            </div>
            
            {/* The outer bar */}
            <div className="h-2 w-full bg-void-deep rounded-full overflow-hidden border border-neon-cyan/5">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-neon-cyan via-[#3b82f6] to-neon-purple transition-all duration-300 shadow-[0_0_10px_rgba(0,229,255,0.3)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Delivery & Security Verification Banner */}
          {isComplete && (
            <div className="animate-slide-up flex items-center justify-between bg-neon-emerald/5 border border-neon-emerald/20 p-3 rounded-btn">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-neon-emerald animate-pulse" />
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold text-neon-emerald tracking-wide uppercase">
                    E2EE VERIFICATION PASSED
                  </span>
                  <span className="text-[8px] font-mono text-[#9d97b5]">
                    SHA-256 INTEGRITY VALIDATED AT DST
                  </span>
                </div>
              </div>
              <span className="text-[9px] font-mono text-neon-emerald font-extrabold">
                {packetResult.total_latency_ms?.toFixed(3)} ms
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
