"use client";

import React, { useEffect, useRef } from "react";
import { Terminal, Activity } from "lucide-react";

interface EventLogProps {
  events: any[];
}

export default function EventLog({ events }: EventLogProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events]);

  const getColor = (msg: string) => {
    if (!msg) return "text-[#e2e0ec]";
    if (msg.includes("✅") || msg.includes("📡") || msg.includes("🏭") || msg.includes("🔒") || msg.includes("🔓")) {
      return "text-neon-emerald";
    }
    if (msg.includes("🚀") || msg.includes("calculated") || msg.includes("route")) {
      return "text-neon-cyan";
    }
    if (msg.includes("Warning") || msg.includes("delay") || msg.includes("Congestion")) {
      return "text-neon-orange";
    }
    if (msg.includes("Error") || msg.includes("failed") || msg.includes("down") || msg.includes("killed")) {
      return "text-neon-crimson";
    }
    return "text-[#9d97b5]";
  };

  return (
    <div className="flex flex-col h-full overflow-hidden select-none">
      <div className="flex items-center gap-1.5 pb-2.5 mb-2.5 border-b border-neon-cyan/10">
        <Terminal className="w-3.5 h-3.5 text-[#4a4560]" />
        <span className="font-heading text-[10px] font-bold tracking-widest text-[#4a4560] uppercase">
          LIVE PROTOCOL EVENTS
        </span>
      </div>

      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2 font-mono text-[10px] scrollbar-thin"
      >
        {!events || events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-[#4a4560] gap-1.5">
            <Activity className="w-4 h-4 animate-pulse text-[#4a4560]/40" />
            <span className="uppercase tracking-widest text-[8px]">
              Awaiting payload signal
            </span>
          </div>
        ) : (
          events.map((ev, i) => {
            const msgColor = getColor(ev.msg || "");
            return (
              <div key={i} className="flex gap-2.5 items-start leading-relaxed animate-fade-in">
                {/* Timestamp */}
                <span className="text-[#4a4560] font-bold select-none shrink-0">
                  [{ev.time || "00:00:00"}]
                </span>
                
                {/* Event Details */}
                <span className={`flex-1 break-words font-medium ${msgColor}`}>
                  {ev.msg}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
