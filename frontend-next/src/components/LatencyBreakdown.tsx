export default function LatencyBreakdown({ packetResult }) {
  if (!packetResult) {
    return (
      <div className="panel" id="latency-panel">
        <div className="panel-title">
          <span className="icon">⏱</span>
          Latency Analysis
        </div>
        <div className="empty-state">
          <span className="icon">📊</span>
          Transmit a message to see latency data
        </div>
      </div>
    );
  }

  const hops = packetResult.hop_log || [];
  const totalLatency = packetResult.total_latency_ms || 0;

  // Aggregate totals
  let totalFiber = 0, totalTower = 0, totalVoid = 0;
  for (const hop of hops) {
    totalFiber += hop.latency?.fiber_transit_ms || 0;
    totalTower += hop.latency?.tower_delay_ms || 0;
    if (hop.void_from_previous) {
      totalVoid += hop.void_from_previous.travel_time_ms || 0;
    }
  }

  const maxComponent = Math.max(totalFiber, totalTower, totalVoid, 1);

  return (
    <div className="panel" id="latency-panel">
      <div className="panel-title">
        <span className="icon">⏱</span>
        Latency Analysis
      </div>

      <div className="latency-total">
        <span className="value">{totalLatency.toFixed(4)}</span>
        <span className="unit">ms</span>
      </div>

      <div className="latency-bar-row">
        <span className="latency-bar-label">Fiber</span>
        <div className="latency-bar-track">
          <div
            className="latency-bar-fill fiber"
            style={{ width: `${(totalFiber / totalLatency) * 100}%` }}
          />
        </div>
        <span className="latency-bar-value">{totalFiber.toFixed(4)} ms</span>
      </div>

      <div className="latency-bar-row">
        <span className="latency-bar-label">Tower</span>
        <div className="latency-bar-track">
          <div
            className="latency-bar-fill tower"
            style={{ width: `${(totalTower / totalLatency) * 100}%` }}
          />
        </div>
        <span className="latency-bar-value">{totalTower.toFixed(4)} ms</span>
      </div>

      <div className="latency-bar-row">
        <span className="latency-bar-label">Void</span>
        <div className="latency-bar-track">
          <div
            className="latency-bar-fill void"
            style={{ width: `${(totalVoid / totalLatency) * 100}%` }}
          />
        </div>
        <span className="latency-bar-value">{totalVoid.toFixed(4)} ms</span>
      </div>

      <div style={{ marginTop: '16px', borderTop: '1px solid rgba(124,58,237,0.12)', paddingTop: '12px' }}>
        <div className="section-label">Per-Hop Breakdown</div>
        {hops.map((hop, idx) => {
          const voidMs = hop.void_from_previous?.travel_time_ms || 0;
          const fiberMs = hop.latency?.fiber_transit_ms || 0;
          const towerMs = hop.latency?.tower_delay_ms || 0;
          const hopTotal = voidMs + fiberMs + towerMs;
          const maxHop = Math.max(hopTotal, 1);

          return (
            <div key={idx} style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '10px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                {hop.planet_id} {voidMs > 0 ? `(void: ${voidMs.toFixed(2)}ms)` : '(origin)'}
              </div>
              <div className="latency-bar-track" style={{ height: '6px' }}>
                <div style={{ display: 'flex', height: '100%' }}>
                  {voidMs > 0 && (
                    <div
                      className="latency-bar-fill void"
                      style={{ width: `${(voidMs / maxHop) * 100}%`, borderRadius: '4px 0 0 4px' }}
                    />
                  )}
                  {fiberMs > 0 && (
                    <div
                      className="latency-bar-fill fiber"
                      style={{ width: `${(fiberMs / maxHop) * 100}%` }}
                    />
                  )}
                  <div
                    className="latency-bar-fill tower"
                    style={{ width: `${(towerMs / maxHop) * 100}%`, borderRadius: '0 4px 4px 0' }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
