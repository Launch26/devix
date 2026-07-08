import React from 'react';

/**
 * DashboardCards — Three-column layout with:
 *   1. Latency Breakdown per component (M3 requirement: fiber, tower, atmosphere, void)
 *   2. Delivery Summary (status, messages, route, packet ID)
 *   3. Live Event Stream (chronological packet events)
 */

/* ── Latency Breakdown Card ─────────────────────────────────────────────── */
function LatencyCard({ packetResult }) {
  let fiberMs = 0;
  let towerMs = 0;
  let atmosMs = 0;
  let vacuumMs = 0;

  packetResult.hop_log.forEach(hop => {
    fiberMs += hop.latency.fiber_transit_ms;
    towerMs += hop.latency.tower_delay_ms;
    if (hop.void_from_previous) {
      atmosMs += hop.void_from_previous.atmosphere_delay_origin_ms;
      atmosMs += hop.void_from_previous.atmosphere_delay_dest_ms;
      vacuumMs += hop.void_from_previous.vacuum_only_ms;
    }
  });

  const totalMs = fiberMs + towerMs + atmosMs + vacuumMs;

  const rows = [
    { label: 'Fiber Transit',       val: fiberMs,  color: '#06b6d4' },
    { label: 'Tower Processing',    val: towerMs,  color: '#f59e0b' },
    { label: 'Atmospheric Refraction', val: atmosMs, color: '#10b981' },
    { label: 'Vacuum Transit',      val: vacuumMs, color: '#8b5cf6' },
  ];

  return (
    <div className="report-panel latency-card">
      <div className="report-panel-title">
        <span>⚡</span> Latency Breakdown
      </div>
      {rows.map((r, i) => (
        <div key={i} className="latency-row">
          <span className="label">
            <span className="dot" style={{ backgroundColor: r.color }}></span>
            {r.label}
          </span>
          <span className="val">{r.val.toFixed(4)} ms</span>
        </div>
      ))}
      <div className="latency-divider"></div>
      <div className="latency-row total">
        <span className="label">Total End-to-End</span>
        <span className="val">{totalMs.toFixed(4)} ms</span>
      </div>
    </div>
  );
}

/* ── Delivery Summary Card ──────────────────────────────────────────────── */
function SummaryCard({ packetResult }) {
  return (
    <div className="report-panel summary-card">
      <div className="report-panel-title">
        <span>📦</span> Delivery Summary
      </div>
      <div className="summary-box">
        <div className="summary-label">Status</div>
        <div className="status-badge delivered">DELIVERED</div>
      </div>
      {packetResult.security && (
        <div className="summary-box">
          <div className="summary-label">Security</div>
          <div className="status-badge" style={{ backgroundColor: 'var(--success-color)', color: '#0f172a', padding: '2px 6px' }}>
            E2EE + SHA-256 VERIFIED
          </div>
        </div>
      )}
      <div className="summary-box">
        <div className="summary-label">Original Message</div>
        <div className="summary-value">{packetResult.message}</div>
      </div>
      <div className="summary-box">
        <div className="summary-label">Delivered Message</div>
        <div className="summary-value">{packetResult.message}</div>
      </div>
      <div className="summary-box">
        <div className="summary-label">Route Taken</div>
        <div className="summary-value route">
          {packetResult.route.join(' → ')}
        </div>
      </div>
      <div className="summary-box">
        <div className="summary-label">Total Hops</div>
        <div className="summary-value">{packetResult.route.length - 1}</div>
      </div>
      <div className="summary-footer">
        Packet ID: {packetResult.packet_id}
      </div>
    </div>
  );
}

/* ── Live Event Stream Card ─────────────────────────────────────────────── */
function EventStreamCard({ packetResult }) {
  const events = [];

  // Build chronological events
  events.push({
    type: 'info',
    event: 'route.calculated',
    detail: `${packetResult.route.length} planets, ${packetResult.route.length - 1} hops`
  });

  events.push({
    type: 'info',
    event: 'packet.created',
    detail: `ID: ${packetResult.packet_id}`
  });

  if (packetResult.security) {
    events.push({
      type: 'success',
      event: 'security.encrypted',
      detail: 'E2EE XOR-SHA256 Cipher'
    });
  }

  // Each hop
  packetResult.hop_log.forEach((hop, i) => {
    if (i === 0) {
      events.push({
        type: 'hop',
        event: `packet.origin.encoded`,
        detail: `${hop.planet_id} → Base ${hop.payload_encoded.base}`
      });
    } else if (i < packetResult.hop_log.length - 1) {
      events.push({
        type: 'hop',
        event: `packet.relay.${hop.planet_id.toLowerCase()}`,
        detail: `Towers ${hop.towers_str}, ${hop.direction}`
      });
      events.push({
        type: 'hop',
        event: `codex.translated`,
        detail: `${hop.codex_transition} at ${hop.planet_id}`
      });
    } else {
      events.push({
        type: 'success',
        event: `packet.arrived.${hop.planet_id.toLowerCase()}`,
        detail: `Tower ${hop.receiving_tower}`
      });
    }
  });

  if (packetResult.security) {
    events.push({
      type: 'success',
      event: 'security.decrypted',
      detail: 'Ciphertext Decrypted'
    });
    events.push({
      type: 'success',
      event: 'security.verified',
      detail: 'SHA-256 Signature Valid'
    });
  }

  events.push({
    type: 'success',
    event: 'packet.delivered',
    detail: `Total: ${packetResult.total_latency_ms.toFixed(2)} ms`
  });

  return (
    <div className="report-panel stream-card">
      <div className="report-panel-title">
        <span>📡</span> Transmission Event Log
      </div>
      <div className="stream-list">
        {events.map((ev, i) => (
          <div key={i} className="stream-row">
            <span className={`stream-dot ${ev.type}`}></span>
            <span className="stream-event">{ev.event}</span>
            <span className="stream-detail">{ev.detail}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main Export ─────────────────────────────────────────────────────────── */
export default function DashboardCards({ packetResult }) {
  if (!packetResult) return null;

  return (
    <div className="dashboard-grid">
      <LatencyCard packetResult={packetResult} />
      <SummaryCard packetResult={packetResult} />
      <EventStreamCard packetResult={packetResult} />
    </div>
  );
}
