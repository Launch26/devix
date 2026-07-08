"use client";

import React from "react";
import { Skull, AlertTriangle, RefreshCw, X } from "lucide-react";

const PLANET_COLORS: Record<string, string> = {
  Aegis: "#3B82F6",
  Boreas: "#EF4444",
  Dawn: "#F59E0B",
  Elysium: "#10B981",
  Fenix: "#A78BFA",
  Caelum: "#F97316",
};

interface ChaosModalProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  nodes: any[];
  killedNodes: Set<string>;
  killedLinks: string[];
  hasKills: boolean;
  linkA: string;
  linkB: string;
  setLinkA: (v: string) => void;
  setLinkB: (v: string) => void;
  onKillNode: (id: string) => void;
  onKillLink: (a: string, b: string) => void;
  onRestore: () => void;
}

export default function ChaosModal({
  activeTab,
  setActiveTab,
  nodes,
  killedNodes,
  killedLinks,
  hasKills,
  linkA,
  linkB,
  setLinkA,
  setLinkB,
  onKillNode,
  onKillLink,
  onRestore,
}: ChaosModalProps) {
  if (activeTab !== "chaos" && activeTab !== "kill-planet") return null;

  const isChaos = activeTab === "chaos";

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md animate-fade-in"
      onClick={() => setActiveTab("map")}
    >
      <div 
        className={`glass-card max-w-md w-full p-6 relative overflow-hidden transition-all duration-300 ${
          isChaos 
            ? "border-neon-purple/30 shadow-glow-purple-lg" 
            : "border-neon-crimson/30 shadow-glow-crimson"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Decorative Corner lines */}
        <div className="absolute top-0 left-0 w-8 h-[1px] bg-neon-cyan/40" />
        <div className="absolute top-0 left-0 w-[1px] h-8 bg-neon-cyan/40" />
        
        {/* Close Button */}
        <button 
          onClick={() => setActiveTab("map")}
          className="absolute top-4 right-4 p-1.5 rounded-full border border-neon-cyan/10 hover:border-neon-cyan/40 text-[#9d97b5] hover:text-[#e2e0ec] transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-2.5 pb-4 mb-5 border-b border-neon-cyan/10">
          {isChaos ? (
            <AlertTriangle className="w-5 h-5 text-neon-purple animate-pulse" />
          ) : (
            <Skull className="w-5 h-5 text-neon-crimson animate-bounce" />
          )}
          <span className={`font-heading text-sm font-black tracking-widest uppercase ${
            isChaos ? "text-neon-purple" : "text-neon-crimson"
          }`}>
            {isChaos ? "SYS CHAOS INTERACTION" : "NODE DESTRUCTION MATRIX"}
          </span>
        </div>

        {/* ── Kill Planet Mode ── */}
        {!isChaos ? (
          <div className="flex flex-col gap-4">
            <div className="text-[10px] font-mono tracking-wider text-[#9d97b5] uppercase">
              SELECT TARGET NODE TO SHUT DOWN OR REACTIVATE:
            </div>
            
            <div className="grid grid-cols-3 gap-2.5">
              {nodes.map((node) => {
                const isKilled = killedNodes.has(node.id);
                return (
                  <button
                    key={node.id}
                    onClick={() => onKillNode(node.id)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-btn border text-[10px] font-bold tracking-wider uppercase transition-all duration-300 ${
                      isKilled
                        ? "bg-neon-crimson/15 border-neon-crimson text-neon-crimson shadow-[0_0_10px_rgba(239,68,68,0.2)] animate-pulse"
                        : "bg-void-deep/60 border-neon-cyan/15 text-[#e2e0ec] hover:border-neon-cyan/40 hover:bg-void-deep"
                    }`}
                  >
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: isKilled ? "#ef4444" : PLANET_COLORS[node.id] || "#00E5FF" }}
                    />
                    <span className={isKilled ? "line-through text-neon-crimson/70" : ""}>
                      {node.id}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* List of Offline planets */}
            {killedNodes.size > 0 && (
              <div className="mt-2 p-3 bg-neon-crimson/5 rounded-btn border border-neon-crimson/20">
                <div className="text-[8px] font-mono tracking-widest text-neon-crimson font-bold uppercase mb-2">
                  OFFLINE MATRIX TARGETS:
                </div>
                <div className="flex flex-wrap gap-2">
                  {Array.from(killedNodes).map((nodeId) => (
                    <span 
                      key={nodeId} 
                      onClick={() => onKillNode(nodeId)}
                      className="badge bg-neon-crimson/20 text-neon-crimson border border-neon-crimson/30 hover:border-neon-crimson cursor-pointer flex items-center gap-1 py-1"
                    >
                      {nodeId} ✕
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* ── Chaos Mode (Kill Link) ── */
          <div className="flex flex-col gap-4">
            <div className="text-[10px] font-mono tracking-wider text-[#9d97b5] uppercase">
              SELECT LINK TERMINALS TO SEVER TRANSITS:
            </div>

            <div className="flex gap-2">
              <select 
                className="select-glass flex-1"
                value={linkA} 
                onChange={(e) => setLinkA(e.target.value)}
              >
                <option value="">NODE ALPHA</option>
                {nodes.map((n) => <option key={n.id} value={n.id}>{n.id}</option>)}
              </select>
              
              <select 
                className="select-glass flex-1"
                value={linkB} 
                onChange={(e) => setLinkB(e.target.value)}
              >
                <option value="">NODE OMEGA</option>
                {nodes.filter((n) => n.id !== linkA).map((n) => (
                  <option key={n.id} value={n.id}>{n.id}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => {
                if (linkA && linkB && linkA !== linkB) {
                  onKillLink(linkA, linkB);
                  setLinkA("");
                  setLinkB("");
                }
              }}
              disabled={!linkA || !linkB}
              className="w-full py-3 rounded-btn font-bold text-[10px] tracking-[0.2em] uppercase text-white bg-neon-crimson border border-neon-crimson/30 shadow-glow-crimson hover:bg-red-600 disabled:opacity-40 disabled:pointer-events-none transition-all duration-300"
            >
              SEVER CONNECTION
            </button>

            {/* List of Offline links */}
            {killedLinks.length > 0 && (
              <div className="mt-2 p-3 bg-neon-purple/5 rounded-btn border border-neon-purple/20">
                <div className="text-[8px] font-mono tracking-widest text-neon-purple font-bold uppercase mb-2">
                  SEVERED ROUTE LEASES:
                </div>
                <div className="flex flex-wrap gap-2">
                  {killedLinks.map((link) => (
                    <span 
                      key={link} 
                      onClick={() => {
                        const [a, b] = link.split("-");
                        onKillLink(a, b);
                      }}
                      className="badge bg-neon-purple/20 text-neon-purple border border-neon-purple/30 hover:border-neon-purple cursor-pointer flex items-center gap-1 py-1"
                    >
                      {link} ✕
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer actions: Restore everything */}
        {hasKills && (
          <div className="mt-6 pt-4 border-t border-neon-cyan/10">
            <button
              onClick={onRestore}
              className="w-full py-3.5 rounded-btn font-bold text-[11px] tracking-[0.2em] uppercase text-[#070b14] bg-gradient-to-r from-neon-emerald to-[#059669] hover:shadow-glow-emerald hover:-translate-y-0.5 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              RESTORE ALL TELEMETRY LEASES
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
