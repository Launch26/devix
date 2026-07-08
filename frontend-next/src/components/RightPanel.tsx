"use client";

import MiniPlanetDiagram from "./MiniPlanetDiagram";

const PLANET_COLORS: Record<string, string> = {
  Aegis:   "#3B82F6",
  Boreas:  "#EF4444",
  Dawn:    "#F59E0B",
  Elysium: "#10B981",
  Fenix:   "#A78BFA",
  Caelum:  "#F97316",
};

interface RightPanelProps {
  packetResult: any;
  copilotResult: any;
  nodes: any[];
  displayHopIdx: number;
  activeHopData: any;
  sending: boolean;
  activeHop: number;
  setSelectedHopIdx: (i: number) => void;
  universe: any;
}

export default function RightPanel({
  packetResult,
  copilotResult,
  nodes,
  displayHopIdx,
  activeHopData,
  sending,
  activeHop,
  setSelectedHopIdx,
  universe,
}: RightPanelProps) {
  return (
    <aside className="zeta-right-panel">

      {/* ── Active Route ── */}
      {packetResult && (
        <div className="right-card" id="active-route-card">
          <div className="right-card-header">
            <span className="right-card-title">ACTIVE ROUTE</span>
            <span className="badge-purple-sm">{(packetResult.route?.length - 1) || 0} HOPS</span>
          </div>
          <div className="route-arrow">
            <span style={{ color: PLANET_COLORS[packetResult.origin_id] }}>{packetResult.origin_id}</span>
            <span className="route-arrow-icon">→</span>
            <span style={{ color: PLANET_COLORS[packetResult.destination_id] }}>{packetResult.destination_id}</span>
          </div>
          <div className="route-list">
            {packetResult.route?.map((planet: string, i: number) => (
              <div
                key={i}
                className={`route-list-item ${i === displayHopIdx ? "route-item-active" : ""}`}
                onClick={() => setSelectedHopIdx(i)}
              >
                <span className="route-num">{i + 1}</span>
                <span style={{ color: PLANET_COLORS[planet] }}>{planet}</span>
                <span className="route-base">
                  (Base {nodes.find(n => n.id === planet)?.codex})
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Co-Pilot Evaluation ── */}
      {copilotResult && (
        <div
          className="right-card"
          id="copilot-eval-card"
          style={{ borderColor: "#06b6d4", boxShadow: "0 0 10px rgba(6,182,212,0.1)" }}
        >
          <div className="right-card-header">
            <span className="right-card-title" style={{ color: "#06b6d4" }}>🛸 CO-PILOT AGENT</span>
            {copilotResult.evaluation_ms && (
              <span className="badge-cyan-sm">{copilotResult.evaluation_ms}ms</span>
            )}
          </div>

          <div style={{ fontSize: 11, color: "#a8a2b5", marginBottom: 12, lineHeight: 1.4 }}>
            <strong style={{ color: "#fff" }}>Explanation:</strong> {copilotResult.explanation}
          </div>

          {copilotResult.link_evaluations?.map((ev: any) => {
            const flagged = ev.trust_score < 0.5 || ev.combined_cost > 90000;
            return (
              <div
                key={ev.link_id}
                style={{
                  background: "#1a1625",
                  borderRadius: 4,
                  padding: 8,
                  marginBottom: 8,
                  borderLeft: `3px solid ${flagged ? "#ef4444" : "#10b981"}`,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <strong style={{ fontSize: 11, color: "#fff" }}>{ev.link_id}</strong>
                  <span style={{ fontSize: 10, color: flagged ? "#ef4444" : "#10b981" }}>
                    {flagged ? "FLAGGED" : "CLEARED"}
                  </span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 10, color: "#a8a2b5" }}>
                  <div>Trust Score: <span style={{ color: ev.trust_score < 0.5 ? "#ef4444" : "#10b981" }}>{(ev.trust_score * 100).toFixed(0)}%</span></div>
                  <div>Target Risk: <span style={{ color: ev.targeting_risk_score > 0.5 ? "#f59e0b" : "#10b981" }}>{(ev.targeting_risk_score * 100).toFixed(0)}%</span></div>
                  <div>Congestion: <span>{ev.predicted_congestion_penalty_ms >= 900000 ? "MAX" : ev.predicted_congestion_penalty_ms.toFixed(1) + "ms"}</span></div>
                  <div>Cost: <span style={{ color: "#fff" }}>{ev.combined_cost >= 900000 ? "INF" : ev.combined_cost.toFixed(0)}</span></div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Hop Details ── */}
      <div className="right-card" id="hop-details-card">
        <div className="right-card-header">
          <span className="right-card-title">HOP DETAILS</span>
          {packetResult && (
            <span className="badge-cyan-sm">
              HOP {displayHopIdx + 1} OF {packetResult.hop_log?.length || 1}
            </span>
          )}
        </div>

        {activeHopData ? (
          <>
            <div className="hop-detail-heading">
              <span style={{ color: PLANET_COLORS[activeHopData.planet_id] }}>{activeHopData.planet_id}</span>
              <span style={{ color: "#5e586f", margin: "0 6px" }}>→</span>
              <span style={{ color: PLANET_COLORS[packetResult?.route?.[displayHopIdx + 1]] }}>
                {packetResult?.route?.[displayHopIdx + 1] || "(destination)"}
              </span>
            </div>

            <div className="hop-stats-grid">
              <span className="hop-stat-label">EXIT TOWER</span>
              <span className="hop-stat-label">VOID</span>
              <span className="hop-stat-label">ENTRY TOWER</span>
              <span className="hop-stat-value" style={{ color: "#FFD700" }}>
                {activeHopData.sending_tower != null ? `Tower ${activeHopData.sending_tower}` : "—"}
              </span>
              <span className="hop-stat-icon">⟶</span>
              <span className="hop-stat-value" style={{ color: "#F97316" }}>
                {packetResult?.hop_log?.[displayHopIdx + 1]?.receiving_tower != null
                  ? `Tower ${packetResult.hop_log[displayHopIdx + 1].receiving_tower}`
                  : "—"}
              </span>
            </div>

            <div className="mini-diagram-container">
              <MiniPlanetDiagram hop={activeHopData} universe={universe} />
            </div>

            {activeHopData.fiber_segments > 0 && (
              <div className="hop-path-text">
                Path: T{activeHopData.receiving_tower} → T{activeHopData.sending_tower}
                <span style={{ color: "#5e586f", marginLeft: 8 }}>({activeHopData.fiber_segments} segments)</span>
              </div>
            )}

            <div className="hop-stat-list">
              {activeHopData.receiving_tower != null && (
                <div className="hsl-row">
                  <span className="hsl-label">Receiving Tower</span>
                  <span className="hsl-value">T{activeHopData.receiving_tower}</span>
                </div>
              )}
              {activeHopData.sending_tower != null && (
                <div className="hsl-row">
                  <span className="hsl-label">Sending Tower</span>
                  <span className="hsl-value">T{activeHopData.sending_tower}</span>
                </div>
              )}
              <div className="hsl-row">
                <span className="hsl-label">Planet Latency</span>
                <span className="hsl-value">{(activeHopData.latency?.total_planet_ms || 0).toFixed(4)} ms</span>
              </div>
              <div className="hsl-row">
                <span className="hsl-label">Segments</span>
                <span className="hsl-value">{activeHopData.fiber_segments || 0}</span>
              </div>
              <div className="hsl-row">
                <span className="hsl-label">Fiber Time</span>
                <span className="hsl-value">{activeHopData.latency?.fiber_transit_ms?.toFixed(4)} ms</span>
              </div>
              <div className="hsl-row">
                <span className="hsl-label">Tower Delay</span>
                <span className="hsl-value">{activeHopData.latency?.tower_delay_ms?.toFixed(2)} ms</span>
              </div>
            </div>

            {activeHopData.payload_encoded && (
              <div className="encoded-payload-section">
                <div className="encoded-label">Encoded → Base {activeHopData.payload_encoded.base}</div>
                <div className="encoded-array">[{activeHopData.payload_encoded.values.join(", ")}]</div>
              </div>
            )}

            {activeHopData.void_from_previous && (
              <>
                <div className="hop-section-label">
                  TRANSMISSION TO {packetResult?.route?.[displayHopIdx]}
                </div>
                <div className="hop-stat-list">
                  <div className="hsl-row">
                    <span className="hsl-label">Void Distance</span>
                    <span className="hsl-value">{activeHopData.void_from_previous.distance_km?.toLocaleString()} km</span>
                  </div>
                  <div className="hsl-row">
                    <span className="hsl-label">Void Time</span>
                    <span className="hsl-value">{activeHopData.void_from_previous.travel_time_ms?.toFixed(4)} ms</span>
                  </div>
                  <div className="hsl-row">
                    <span className="hsl-label">Atmos. Delay</span>
                    <span className="hsl-value">
                      {(
                        (activeHopData.void_from_previous.atmosphere_delay_origin_ms || 0) +
                        (activeHopData.void_from_previous.atmosphere_delay_dest_ms || 0)
                      ).toFixed(4)} ms
                    </span>
                  </div>
                  <div className="hsl-row">
                    <span className="hsl-label">Status</span>
                    <span className="hsl-value" style={{ color: "#00d4ff" }}>
                      {sending ? "Transmitting…" : activeHop >= 0 ? "In Transit" : "Complete"}
                    </span>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div style={{ color: "#5e586f", fontSize: 12, textAlign: "center", padding: "20px 0" }}>
            Transmit a packet to see hop details
          </div>
        )}
      </div>
    </aside>
  );
}
