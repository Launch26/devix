import React from 'react';

/**
 * HopLogTable — Detailed hop-by-hop table with encoding translations (M2 requirement).
 * Shows planet, towers, ring path, direction, codex transition, fiber segments,
 * step/cumulative times, AND the encoded payload values at each hop.
 */
export default function HopLogTable({ packetResult }) {
  if (!packetResult || !packetResult.hop_log) return null;

  return (
    <div className="report-panel">
      <div className="report-panel-title">
        <span>📋</span> Ordered Hop Log
      </div>
      <div className="hop-table-container">
        <table className="hop-table">
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
            {packetResult.hop_log.map((hop, i) => (
              <React.Fragment key={i}>
                {/* Main data row */}
                <tr>
                  <td>{i + 1}</td>
                  <td className="planet-cell">{hop.planet_id}</td>
                  <td>{hop.towers_str}</td>
                  <td>{hop.ring_path_str}</td>
                  <td>{hop.direction}</td>
                  <td className="codex-cell">{hop.codex_transition}</td>
                  <td>{hop.fiber_segments}</td>
                  <td className="time-cell">{hop.step_time_s.toFixed(5)}s</td>
                  <td className="time-cell">{hop.cumulative_time_s.toFixed(5)}s</td>
                </tr>
                {/* Encoding translation row (M2: visible encoding at each hop) */}
                <tr className="encoding-row">
                  <td></td>
                  <td colSpan={8}>
                    <div className="encoding-label">
                      Payload → Base {hop.payload_encoded.base} Encoding
                    </div>
                    <div className="encoding-values">
                      [{hop.payload_encoded.values.join(', ')}]
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
