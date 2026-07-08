import { useState } from 'react';

export default function HopLog({ packetResult, activeHop }) {
  const [expandedHops, setExpandedHops] = useState(new Set());

  if (!packetResult) {
    return (
      <div className="panel" id="hop-log-panel">
        <div className="panel-title">
          <span className="icon">🛰️</span>
          Hop Log
        </div>
        <div className="empty-state">
          <span className="icon">📭</span>
          No transmission data yet
        </div>
      </div>
    );
  }

  const toggleHop = (idx) => {
    setExpandedHops(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const hops = packetResult.hop_log || [];

  return (
    <div className="panel" id="hop-log-panel">
      <div className="panel-title">
        <span className="icon">🛰️</span>
        Hop Log
        <span className="badge badge-purple" style={{ marginLeft: 'auto' }}>
          {hops.length} hops
        </span>
      </div>

      <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
        Route: {packetResult.route?.join(' → ')}
      </div>

      {hops.map((hop, idx) => {
        const isOpen = expandedHops.has(idx);
        const isActive = idx === activeHop;

        return (
          <div
            key={idx}
            className={`accordion-item ${isActive ? 'active' : ''}`}
          >
            <div className="accordion-header" onClick={() => toggleHop(idx)}>
              <div className="hop-header-info">
                <span className="hop-idx">#{idx}</span>
                <span className="hop-planet">{hop.planet_id}</span>
                <span className="badge badge-cyan">Base {hop.planet_codex}</span>
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                {isOpen ? '▾' : '▸'}
              </span>
            </div>

            <div className={`accordion-body ${isOpen ? 'open' : ''}`}>
              <div className="hop-detail-grid">
                <span className="detail-label">Receiving Tower</span>
                <span className="detail-value">
                  {hop.receiving_tower !== null ? `Tower ${hop.receiving_tower}` : '— (origin)'}
                </span>

                <span className="detail-label">Sending Tower</span>
                <span className="detail-value">
                  {hop.sending_tower !== null ? `Tower ${hop.sending_tower}` : '— (destination)'}
                </span>

                <span className="detail-label">Fiber Segments</span>
                <span className="detail-value">{hop.fiber_segments}</span>

                <span className="detail-label">Fiber Transit</span>
                <span className="detail-value">{hop.latency?.fiber_transit_ms?.toFixed(4)} ms</span>

                <span className="detail-label">Tower Delay</span>
                <span className="detail-value">{hop.latency?.tower_delay_ms?.toFixed(2)} ms</span>

                <span className="detail-label">Planet Latency</span>
                <span className="detail-value">{hop.latency?.total_planet_ms?.toFixed(4)} ms</span>
              </div>

              {hop.void_from_previous && (
                <div className="hop-detail-grid" style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(124,58,237,0.1)' }}>
                  <span className="detail-label">Void Distance</span>
                  <span className="detail-value">{hop.void_from_previous.distance_km?.toLocaleString()} km</span>

                  <span className="detail-label">Void Time</span>
                  <span className="detail-value">{hop.void_from_previous.travel_time_ms?.toFixed(4)} ms</span>

                  <span className="detail-label">Atm. Origin</span>
                  <span className="detail-value">{hop.void_from_previous.atmosphere_delay_origin_ms?.toFixed(4)} ms</span>

                  <span className="detail-label">Atm. Dest.</span>
                  <span className="detail-value">{hop.void_from_previous.atmosphere_delay_dest_ms?.toFixed(4)} ms</span>
                </div>
              )}

              {hop.payload_encoded && (
                <div className="hop-codex">
                  <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                    Encoded → Base {hop.payload_encoded.base}
                  </div>
                  <div className="hop-codex-values">
                    [{hop.payload_encoded.values?.join(', ')}]
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
