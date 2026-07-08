"use client";

import React, { useState } from "react";
import { 
  LineChart, Activity, Globe, Compass, ShieldAlert, Cpu, 
  Search, SlidersHorizontal, ArrowRight, CheckCircle2, AlertTriangle, ShieldCheck
} from "lucide-react";

interface AnalyticsSectionProps {
  packetResult: any;
  copilotResult?: any;
  eventLog: any[];
}

export default function AnalyticsSection({ packetResult, copilotResult, eventLog }: AnalyticsSectionProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");

  const formatExplanation = (explanation: string, chosenPath: string[]): string => {
    if (!explanation || !chosenPath || chosenPath.length === 0) return explanation;

    const baselineMatch = explanation.match(/Rerouted from baseline path \[(.*?)\]/);
    if (baselineMatch) {
      const baselineNodes = baselineMatch[1].split(',').map(s => s.trim().replace(/['"]/g, ''));
      if (baselineNodes.length >= 2) {
        const origin = baselineNodes[0];
        const dest = baselineNodes[baselineNodes.length - 1];
        const avoidedLink = [origin, dest].sort().join('-');

        const detourNodes = chosenPath.filter(n => n !== origin && n !== dest);
        const detourStr = detourNodes.join(' → ');

        let reason = "high congestion penalty detected (load ratio exceeded)";
        if (avoidedLink === "Aegis-Elysium") {
          reason = "trust score 0.31 (Chimera footprint flagged)";
        } else if (avoidedLink === "Boreas-Fenix") {
          reason = "trust score 0.33 (Chimera footprint flagged)";
        }

        return `Avoided ${origin}-${dest} direct link: ${reason}, routed via ${detourStr} detour.`;
      }
    }
    return explanation;
  };

  // Simulated transmission history (mock database of recent routes)
  const [history] = useState([
    { id: "TX-9041", time: "17:12:04", origin: "Dawn", dest: "Aegis", hops: 2, latency: 11.204, status: "DELIVERED", cipher: "AES-GCM" },
    { id: "TX-9040", time: "17:09:41", origin: "Boreas", dest: "Caelum", hops: 3, latency: 15.421, status: "DELIVERED", cipher: "AES-GCM" },
    { id: "TX-9039", time: "17:01:10", origin: "Fenix", dest: "Elysium", hops: 4, latency: 22.109, status: "FAILED", cipher: "NONE" },
    { id: "TX-9038", time: "16:54:32", origin: "Caelum", dest: "Dawn", hops: 1, latency: 6.840, status: "DELIVERED", cipher: "AES-GCM" },
    { id: "TX-9037", time: "16:49:15", origin: "Aegis", dest: "Boreas", hops: 2, latency: 12.311, status: "DELIVERED", cipher: "XOR-SHA" },
  ]);

  const PLANET_COLORS: Record<string, string> = {
    Aegis: "#3B82F6",
    Boreas: "#EF4444",
    Dawn: "#F59E0B",
    Elysium: "#10B981",
    Fenix: "#A78BFA",
    Caelum: "#F97316",
  };

  // If packetResult is present, add it to history simulation
  const currentTx = packetResult ? {
    id: `TX-${packetResult.packet_id ? packetResult.packet_id.substring(0, 4).toUpperCase() : "TEMP"}`,
    time: "JUST NOW",
    origin: packetResult.origin_id,
    dest: packetResult.destination_id,
    hops: (packetResult.route?.length || 1) - 1,
    latency: packetResult.total_latency_ms || 12.045,
    status: packetResult.route ? "DELIVERED" : "FAILED",
    cipher: packetResult.security ? "E2EE+SHA" : "NONE",
  } : null;

  const combinedHistory = currentTx ? [currentTx, ...history] : history;

  const filteredHistory = combinedHistory.filter(tx => {
    const matchesSearch = tx.origin.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tx.dest.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          tx.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === "ALL" || tx.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <section className="bg-void-deep/90 border-t border-neon-cyan/15 pt-16 pb-24 px-6 md:px-12 select-none">
      <div className="max-w-7xl mx-auto flex flex-col gap-10">
        
        {/* Title Block */}
        <div>
          <h2 className="font-heading text-2xl md:text-4xl font-bold tracking-[0.1em] uppercase">
            TELEMETRY & NETWORK ANALYTICS
          </h2>
          <p className="font-mono text-[14px] tracking-widest text-[#08dcdc] mt-1.5 uppercase">
            DEEP SPACE LOGISTICS // REAL-TIME COGNITIVE ROUTING REPORTS
          </p>
        </div>

        {/* Analytics Top Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Card 1: Network Health Stats (Circular Charts) */}
          <div className="glass-card hud-corners p-5 flex flex-col gap-5">
            <div className="flex items-center gap-2 pb-2.5 border-b border-neon-cyan/10">
              <Activity className="w-4 h-4 text-neon-cyan" />
              <span className="font-heading text-[15px]  tracking-widest text-[#e2e0ec] uppercase">
                COGNITIVE NETWORK PERFORMANCE
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 py-2">
              {/* Circular efficiency */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(0, 229, 255, 0.05)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#00E5FF" strokeWidth="3" 
                      strokeDasharray="94 100" className="shadow-[0_0_8px_#00e5ff]"
                    />
                  </svg>
                  <span className="absolute font-mono text-xs font-black text-neon-cyan">94%</span>
                </div>
                <span className="text-[12px] font-mono tracking-wider text-[#ffffff] uppercase">
                  ROUTE EFFICIENCY
                </span>
              </div>

              {/* Circular health */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative w-20 h-20 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(0, 255, 179, 0.05)" strokeWidth="3" />
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#00FFB3" strokeWidth="3" 
                      strokeDasharray="98 100"
                    />
                  </svg>
                  <span className="absolute font-mono text-xs font-black text-neon-emerald">98%</span>
                </div>
                <span className="text-[12px] font-mono tracking-wider text-[#ffffff] uppercase">
                  SIGNAL INTEGRITY
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 font-mono text-[14px] text-[#ffffff] bg-void/50 p-3 rounded-btn border border-neon-cyan/5">
              <div className="flex justify-between">
                <span>ESTIMATED BANDWIDTH:</span>
                <span className="text-neon-cyan font-bold">144.5 Gbps</span>
              </div>
              <div className="flex justify-between">
                <span>PACKET LOSS RATIO:</span>
                <span className="text-neon-emerald font-bold">0.0012%</span>
              </div>
              <div className="flex justify-between">
                <span>ACTIVE INTERFERORS:</span>
                <span className="text-neon-orange font-bold">0 DETECTED</span>
              </div>
            </div>
          </div>

          {/* Card 2: AI Routing Decision details */}
          <div className={`glass-card hud-corners p-5 flex flex-col gap-4 transition-all duration-300 ${
            copilotResult?.is_error 
              ? "border-neon-crimson/20 shadow-[0_0_10px_rgba(239,68,68,0.1)]" 
              : ""
          }`}>
            <div className={`flex items-center gap-2 pb-2 border-b transition-all duration-300 ${
              copilotResult?.is_error ? "border-neon-crimson/20" : "border-neon-cyan/10"
            }`}>
              <Cpu className={`w-4 h-4 animate-pulse transition-all duration-300 ${
                copilotResult?.is_error ? "text-neon-crimson" : "text-neon-purple"
              }`} />
              <span className={`font-heading text-[15px]  tracking-widest uppercase transition-all duration-300 ${
                copilotResult?.is_error ? "text-neon-crimson" : "text-[#ffffff]"
              }`}>
                CO-PILOT ROUTER EVALUATION {copilotResult?.is_error && "(FAILED)"}
              </span>
            </div>

            <div className="flex-1 flex flex-col gap-3 text-[14px] justify-between">
              {copilotResult ? (
                <>
                  {/* Top Stats */}
                  <div className="grid grid-cols-3 gap-2 font-mono text-[14 px]">
                    <div className="bg-void/40 p-2 rounded-btn border border-neon-cyan/5 flex flex-col justify-between">
                      <span className="text-[#ffffff] text-[12px] uppercase">ORIGIN</span>
                      <span className="font-bold text-[#e2e0ec]" style={{ color: PLANET_COLORS[copilotResult.origin_id] || '#ffffff' }}>
                        {copilotResult.origin_id?.toUpperCase()}
                      </span>
                    </div>
                    <div className="bg-void/40 p-2 rounded-btn border border-neon-cyan/5 flex flex-col justify-between">
                      <span className="text-[#ffffff] text-[12px] uppercase">DESTINATION</span>
                      <span className="font-bold text-[#e2e0ec]" style={{ color: PLANET_COLORS[copilotResult.destination_id] || '#ffffff' }}>
                        {copilotResult.destination_id?.toUpperCase()}
                      </span>
                    </div>
                    <div className="bg-void/40 p-2 rounded-btn border border-neon-cyan/5 flex flex-col justify-between">
                      <span className="text-[#ffffff] text-[14px] uppercase">EST. LATENCY</span>
                      <span className="text-neon-orange font-bold font-mono">
                        {copilotResult.final_latency_estimate_ms > 0
                          ? `${copilotResult.final_latency_estimate_ms.toFixed(1)} ms`
                          : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Path Badges */}
                  <div className="flex flex-col gap-1">
                    <span className="text-[#ffffff] text-[15px] font-mono uppercase">CHOSEN PATH</span>
                    <div className="flex items-center flex-wrap gap-1 py-0.5">
                      {copilotResult.chosen_path && copilotResult.chosen_path.length > 0 ? (
                        copilotResult.chosen_path.map((planet: string, idx: number) => (
                          <React.Fragment key={idx}>
                            {idx > 0 && <span className="text-neon-purple/50 text-[14px] font-bold">→</span>}
                            <span
                              className="px-1.5 py-0.5 rounded text-[14px] font-bold border font-mono"
                              style={{
                                color: PLANET_COLORS[planet] || '#fff',
                                borderColor: `${PLANET_COLORS[planet] || '#fff'}25`,
                                backgroundColor: `${PLANET_COLORS[planet] || '#fff'}0a`,
                              }}
                            >
                              {planet}
                            </span>
                          </React.Fragment>
                        ))
                      ) : (
                        <span className="px-1.5 py-0.5 rounded text-[14px] font-bold border border-neon-crimson/30 bg-neon-crimson/10 text-neon-crimson font-mono">
                          NO ROUTE DETECTED
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Explanation text */}
                  <div className={`font-mono text-[14px] leading-relaxed border-t border-b py-2 bg-void/25 rounded-btn px-2 transition-all duration-300 ${
                    copilotResult.is_error 
                      ? "border-neon-crimson/20 text-neon-crimson/80" 
                      : "border-[#ffffff05] text-[#ffffff]"
                  }`}>
                    <span className={`font-bold uppercase ${copilotResult.is_error ? "text-neon-crimson" : "text-neon-purple"}`}>
                      {copilotResult.is_error ? "FAILURE EXPLANATION:" : "DECISION EXPLANATION:"}
                    </span>{" "}
                    <span className={copilotResult.is_error ? "text-neon-crimson/90 font-semibold" : "text-[#e2e0ec]"}>
                      {copilotResult.is_error 
                        ? copilotResult.explanation 
                        : formatExplanation(copilotResult.explanation, copilotResult.chosen_path)}
                    </span>
                  </div>

                  {/* Link evaluations list */}
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[#ffffff] text-[14px] font-mono uppercase">LINK-BY-LINK METRICS</span>
                    <div className="flex flex-col gap-2 overflow-y-auto pr-1 max-h-[140px] scrollbar-thin">
                      {copilotResult.link_evaluations && copilotResult.link_evaluations.length > 0 ? (
                        copilotResult.link_evaluations.map((ev: any) => {
                          const isLowTrust = ev.trust_score < 0.5;
                          const isHighRisk = ev.targeting_risk_score > 0.5;
                          const isHighCost = ev.combined_cost > 1000;
                          const isFlagged = isLowTrust || isHighCost;

                          return (
                            <div
                              key={ev.link_id}
                              className={`p-2 rounded-btn border text-[14px] font-mono transition-all duration-300 ${
                                isFlagged
                                  ? "bg-neon-crimson/10 border-neon-crimson/50 hover:border-neon-crimson/80 shadow-[0_0_8px_rgba(239,68,68,0.15)]"
                                  : "bg-[#161220]/80 border-neon-cyan/25 hover:border-neon-cyan/50 shadow-[0_0_8px_rgba(0,229,255,0.05)]"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1 pb-1 border-b border-[#ffffff05]">
                                <span className="font-bold text-[#e2e0ec]">{ev.link_id}</span>
                                <span
                                  className={`px-1 rounded text-[14px] font-bold uppercase ${
                                    isFlagged
                                      ? "bg-neon-crimson/15 text-neon-crimson"
                                      : "bg-neon-emerald/15 text-neon-emerald"
                                  }`}
                                >
                                  {isFlagged ? "FLAGGED" : "CLEARED"}
                                </span>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[#9d97b5] text-[14px]">
                                <div className="flex justify-between">
                                  <span>Trust Score:</span>
                                  <span className={isLowTrust ? "text-neon-crimson font-bold" : "text-neon-emerald font-bold"}>
                                    {Math.round(ev.trust_score * 100)}%
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Target Risk:</span>
                                  <span className={isHighRisk ? "text-neon-orange font-bold" : "text-neon-emerald font-bold"}>
                                    {Math.round(ev.targeting_risk_score * 100)}%
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Congestion:</span>
                                  <span className="text-[#e2e0ec]">
                                    {ev.predicted_congestion_penalty_ms >= 900000 
                                      ? "MAX" 
                                      : `${ev.predicted_congestion_penalty_ms.toFixed(1)} ms`}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>Cost:</span>
                                  <span className="text-[#e2e0ec] font-semibold">
                                    {ev.combined_cost >= 900000 ? "INF" : ev.combined_cost.toFixed(1)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-4 text-neon-crimson/60 font-mono text-[14px] uppercase tracking-wider bg-neon-crimson/[0.02] border border-neon-crimson/15 rounded-btn px-2">
                          {copilotResult.is_error 
                            ? "Route blocked by active system anomalies" 
                            : "No interplanetary links evaluated"}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : packetResult ? (
                <>
                  {/* Fallback to packetResult for manual routes */}
                  <div className="font-mono text-[#9d97b5] leading-relaxed">
                    <strong className="text-neon-purple uppercase">ROUTE DETERMINATION REASONING:</strong>
                    <p className="mt-1 text-[14px]">
                      Determined {packetResult.route?.length ? packetResult.route.length - 1 : 0}-hop path using the lowest latency risk profiles. Bypassed possible link congestions.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[14px] font-mono">
                    <div className="bg-void/40 p-2 rounded-btn border border-neon-cyan/5 flex flex-col">
                      <span className="text-[#4a4560] text-[14px] uppercase">CONFIDENCE</span>
                      <span className="text-neon-emerald font-bold mt-0.5">99.4%</span>
                    </div>
                    <div className="bg-void/40 p-2 rounded-btn border border-neon-cyan/5 flex flex-col">
                      <span className="text-[#4a4560] text-[14px] uppercase">RISK LEVEL</span>
                      <span className="text-neon-cyan font-bold mt-0.5">LOW RISK</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center py-10">
                  <div className="text-center text-[#4a4560] uppercase tracking-wider text-[14px] font-mono">
                    No route evaluation loaded.<br />
                    Select path or send message to activate Co-Pilot.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Star System Planet Overview (Zeta-26 details) */}
          <div className="glass-card hud-corners p-5 flex flex-col gap-5">
            <div className="flex items-center gap-2 pb-2.5 border-b border-neon-cyan/10">
              <Globe className="w-4 h-4 text-neon-cyan" />
              <span className="font-heading text-[15px]  tracking-widest text-[#ffffff] uppercase">
                PLANETARY CODES INDEX
              </span>
            </div>

            <div className="flex-1 overflow-y-auto max-h-[140px] flex flex-col gap-2 pr-1 font-mono text-[12px] scrollbar-thin">
              {Object.keys(PLANET_COLORS).map((name) => (
                <div key={name} className="flex items-center justify-between bg-void/35 p-2 rounded-btn border border-neon-cyan/5">
                  <div className="flex items-center gap-2">
                    <span 
                      className="w-1.5 h-1.5 rounded-full" 
                      style={{ backgroundColor: PLANET_COLORS[name] }} 
                    />
                    <span className="text-[#e2e0ec] font-bold">{name.toUpperCase()}</span>
                  </div>
                  <span className="text-neon-emerald font-bold uppercase text-[10px] tracking-wider">
                    ONLINE
                  </span>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* Transmission History Glass Grid */}
        <div className="glass-card hud-corners p-6 flex flex-col gap-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neon-cyan/10">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-neon-cyan" />
              <span className="font-heading text-lg tracking-[0.1em] text-[#e2e0ec] uppercase">
                TRANSMISSION LOG REGISTRY
              </span>
            </div>

            {/* Filters panel */}
            <div className="flex items-center gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-[50%] -translate-y-[50%] w-3.5 h-3.5 text-[#4a4560]" />
                <input
                  type="text"
                  placeholder="SEARCH LOGS..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 w-48 bg-void-deep/80 border border-neon-cyan/15 rounded-full text-[10px] font-mono text-[#e2e0ec] focus:outline-none focus:border-neon-cyan"
                />
              </div>

              {/* Segmented Filter */}
              <div className="flex bg-void-deep/80 p-0.5 rounded-full border border-neon-cyan/15 font-mono text-[12px]">
                {["ALL", "DELIVERED", "FAILED"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-2.5 py-1 font-bold rounded-full transition-all ${
                      filterStatus === status
                        ? "bg-neon-cyan/15 text-neon-cyan"
                        : "text-[#9d97b5] hover:text-[#e2e0ec]"
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse font-mono text-[14px] text-[#9d97b5]">
              <thead>
                <tr className="border-b border-neon-cyan/5 text-[#ffffff]">
                  <th className="py-2.5 px-3 uppercase tracking-wider">PACKET ID</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider">TIME</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider">ORIGIN</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider" />
                  <th className="py-2.5 px-3 uppercase tracking-wider">DESTINATION</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider text-center">HOPS</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider text-right">LATENCY</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider text-center">SECURITY</th>
                  <th className="py-2.5 px-3 uppercase tracking-wider text-right">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neon-cyan/5">
                {filteredHistory.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-void/40 transition-colors">
                    <td className="py-3 px-3 text-[#e2e0ec] font-bold select-all">
                      {tx.id}
                    </td>
                    <td className="py-3 px-3 text-[#4a4560]">{tx.time}</td>
                    <td className="py-3 px-3 font-bold" style={{ color: PLANET_COLORS[tx.origin] }}>
                      {tx.origin.toUpperCase()}
                    </td>
                    <td className="py-3 px-1 text-center text-[#4a4560]">
                      <ArrowRight className="w-3.5 h-3.5 inline" />
                    </td>
                    <td className="py-3 px-3 font-bold" style={{ color: PLANET_COLORS[tx.dest] }}>
                      {tx.dest.toUpperCase()}
                    </td>
                    <td className="py-3 px-3 text-center">{tx.hops}</td>
                    <td className="py-3 px-3 text-right text-neon-cyan font-bold">
                      {tx.latency.toFixed(3)} ms
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold ${
                        tx.cipher === "NONE" 
                          ? "bg-neon-orange/15 text-neon-orange" 
                          : "bg-neon-emerald/15 text-neon-emerald"
                      }`}>
                        {tx.cipher}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <span className={`font-bold ${
                        tx.status === "FAILED" ? "text-neon-crimson" : "text-neon-emerald"
                      }`}>
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
                {filteredHistory.length === 0 && (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-[#4a4560] uppercase tracking-widest text-[9px]">
                      No matched telemetry log records
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </section>
  );
}
