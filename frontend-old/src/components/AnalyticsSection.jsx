import React from 'react';

export default function AnalyticsSection({ packetResult, eventLog }) {
  if (!packetResult) {
    return (
      <section className="analytics-section empty">
        <div className="analytics-container">
          <h2 className="analytics-title">Transmission Analytics</h2>
          <p className="analytics-desc">Waiting for transmission data...</p>
        </div>
      </section>
    );
  }

  const hops = packetResult.hop_log || [];
  
  return (
    <section className="analytics-section">
      <div className="analytics-container">
        <h2 className="analytics-title">Transmission Analytics</h2>
        <p className="analytics-desc">Comprehensive breakdown of the last transmitted packet across the Zeta-26 Relic Ring Protocol.</p>
        
        <div className="analytics-grid">
          {/* Ordered Hop Log (Full width) */}
          <div className="analytics-card full-width">
            <h3 className="ac-title">📋 Ordered Hop Log</h3>
            <div className="table-responsive">
              <table className="analytics-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Planet</th>
                    <th>Towers</th>
                    <th>Ring Path</th>
                    <th>Direction</th>
                    <th>Codex</th>
                    <th>Segments</th>
                    <th>Step Time</th>
                    <th>Cumulative</th>
                  </tr>
                </thead>
                <tbody>
                  {hops.map((hop, i) => (
                    <React.Fragment key={i}>
                      <tr>
                        <td>{hop.hop_index + 1}</td>
                        <td style={{ color: "var(--nebula-light)" }}>{hop.planet_id}</td>
                        <td>{hop.towers_str}</td>
                        <td>{hop.ring_path_str || "—"}</td>
                        <td>{hop.direction}</td>
                        <td style={{ color: "var(--plasma-cyan)" }}>{hop.codex_transition}</td>
                        <td>{hop.fiber_segments}</td>
                        <td>{hop.step_time_s?.toFixed(5)}s</td>
                        <td style={{ color: "var(--success)" }}>{hop.cumulative_time_s?.toFixed(5)}s</td>
                      </tr>
                      {hop.payload_encoded && (
                        <tr className="payload-row">
                          <td colSpan="9">
                            <div className="payload-box">
                              <span className="pb-label">Payload → Base {hop.payload_encoded.base} Encoding</span>
                              <div className="pb-array">[{hop.payload_encoded.values.join(', ')}]</div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Latency Breakdown */}
          <div className="analytics-card">
            <h3 className="ac-title">⚡ Latency Breakdown</h3>
            <div className="stats-list">
              {(() => {
                let fiber = 0, tower = 0, voidMs = 0, atmos = 0;
                hops.forEach(h => {
                  fiber += h.latency?.fiber_transit_ms || 0;
                  tower += h.latency?.tower_delay_ms || 0;
                  if (h.void_from_previous) {
                    voidMs += h.void_from_previous.vacuum_only_ms || h.void_from_previous.travel_time_ms || 0;
                    atmos += (h.void_from_previous.atmosphere_delay_origin_ms || 0) + (h.void_from_previous.atmosphere_delay_dest_ms || 0);
                  }
                });
                return (
                  <>
                    <div className="stat-row"><span>Fiber Transit</span> <span>{fiber.toFixed(4)} ms</span></div>
                    <div className="stat-row"><span>Tower Processing</span> <span>{tower.toFixed(4)} ms</span></div>
                    <div className="stat-row"><span>Atmospheric Refraction</span> <span>{atmos.toFixed(4)} ms</span></div>
                    <div className="stat-row"><span>Vacuum Transit</span> <span>{voidMs.toFixed(4)} ms</span></div>
                    <div className="stat-row total-row"><span>Total End-to-End</span> <span>{packetResult.total_latency_ms?.toFixed(4)} ms</span></div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Delivery Summary */}
          <div className="analytics-card">
            <h3 className="ac-title">📦 Delivery Summary</h3>
            <div className="stats-list">
              <div className="stat-row"><span>Status</span> <span style={{color: "var(--success)"}}>DELIVERED</span></div>
              {packetResult.security && (
                <div className="stat-row">
                  <span>Security</span> 
                  <span style={{ backgroundColor: 'var(--success)', color: '#0f172a', padding: '2px 6px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                    E2EE + SHA-256 VERIFIED
                  </span>
                </div>
              )}
              <div className="stat-row"><span>Original Message</span> <span>{packetResult.message}</span></div>
              <div className="stat-row"><span>Delivered Message</span> <span>{packetResult.payload}</span></div>
              <div className="stat-row"><span>Route Taken</span> <span>{packetResult.route?.join(' → ')}</span></div>
              <div className="stat-row"><span>Total Hops</span> <span>{(packetResult.route?.length || 1) - 1}</span></div>
            </div>
          </div>

          {/* Event Log */}
          <div className="analytics-card">
            <h3 className="ac-title">📡 Transmission Event Log</h3>
            <div className="event-list-detailed">
              {eventLog.map((ev, i) => (
                <div key={i} className="ev-detail-item">
                  <div className="ev-time">{ev.time}</div>
                  <div className="ev-msg" style={{color: ev.color}}>{ev.msg}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
