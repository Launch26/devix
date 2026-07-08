"use client";

import React from "react";
import { BarChart3 } from "lucide-react";

interface LatencyChartProps {
  packetResult: any;
  totalLatency: number;
  fiberMs: number;
  towerMs: number;
  voidMs: number;
  atmosphereMs: number;
}

export default function LatencyChart({
  packetResult,
  totalLatency,
  fiberMs,
  towerMs,
  voidMs,
  atmosphereMs,
}: LatencyChartProps) {
  const segments = [
    { label: "Fiber", val: fiberMs, color: "#00E5FF" }, // Neon Cyan
    { label: "Tower", val: towerMs, color: "#FF9F43" }, // Orange
    { label: "Atmos", val: atmosphereMs, color: "#00FFB3" }, // Emerald
    { label: "Void", val: voidMs, color: "#8B5CF6" }, // Purple
  ];

  const total = fiberMs + towerMs + voidMs + atmosphereMs || 1;

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      {/* Header Title */}
      <div className="flex items-center gap-1.5 pb-2.5 mb-2.5 border-b border-neon-cyan/10">
        <BarChart3 className="w-3.5 h-3.5 text-[#4a4560]" />
        <span className="font-heading text-[10px] font-bold tracking-widest text-[#4a4560] uppercase">
          LATENCY DISTRIBUTION
        </span>
      </div>

      {!packetResult ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center py-8 text-[#4a4560]">
          <span className="uppercase tracking-widest text-[8px] font-mono">
            No telemetry data
          </span>
        </div>
      ) : (
        <div className="flex-1 flex flex-col sm:flex-row items-center justify-center gap-4">
          {/* Radial Donut SVG */}
          <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
            {(() => {
              const R = 38;
              const cx = 50;
              const cy = 50;
              const strokeW = 12;
              const circumference = 2 * Math.PI * R;
              let offset = 0;

              return (
                <svg width="100%" height="100%" viewBox="0 0 100 100" className="transform -rotate-90">
                  {/* Track base */}
                  <circle
                    cx={cx}
                    cy={cy}
                    r={R}
                    fill="none"
                    stroke="rgba(7, 11, 20, 0.8)"
                    strokeWidth={strokeW}
                  />
                  {/* Segments */}
                  {segments.map((seg, i) => {
                    if (seg.val <= 0) return null;
                    const pct = seg.val / total;
                    const dash = pct * circumference;
                    const elem = (
                      <circle
                        key={i}
                        cx={cx}
                        cy={cy}
                        r={R}
                        fill="none"
                        stroke={seg.color}
                        strokeWidth={strokeW}
                        strokeDasharray={`${dash} ${circumference - dash}`}
                        strokeDashoffset={-offset}
                        className="transition-all duration-500 hover:opacity-100"
                        opacity="0.85"
                      />
                    );
                    offset += dash;
                    return elem;
                  })}
                </svg>
              );
            })()}
            {/* Center value overlay */}
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-[12px] font-mono font-black text-neon-cyan leading-none">
                {totalLatency.toFixed(1)}
              </span>
              <span className="text-[7px] font-mono text-[#9d97b5] mt-0.5">MS</span>
            </div>
          </div>

          {/* Legend Grid */}
          <div className="flex-1 flex flex-col gap-1.5 w-full">
            {segments.map((s) => {
              const pct = (s.val / total) * 100;
              return (
                <div key={s.label} className="flex items-center justify-between font-mono text-[9px] w-full">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: s.color }}
                    />
                    <span className="text-[#9d97b5] font-semibold">{s.label}:</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#e2e0ec] font-bold">{s.val.toFixed(2)}ms</span>
                    <span className="text-[#4a4560] font-bold">({pct.toFixed(0)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
