import { useState } from 'react';

const PLANET_COLORS = {
  Aegis: '#3b82f6',
  Boreas: '#f59e0b',
  Dawn: '#f97316',
  Elysium: '#10b981',
  Fenix: '#ef4444',
  Caelum: '#8b5cf6',
};

export default function ChaosPanel({
  universe,
  chaosState,
  onKillNode,
  onKillLink,
  onRestore,
}) {
  const [linkA, setLinkA] = useState('');
  const [linkB, setLinkB] = useState('');

  const nodes = universe?.nodes || [];
  const killedNodes = new Set(chaosState?.killedNodes || []);
  const killedLinks = chaosState?.killedLinks || [];
  const hasKills = killedNodes.size > 0 || killedLinks.length > 0;

  const handleKillLink = () => {
    if (linkA && linkB && linkA !== linkB) {
      onKillLink(linkA, linkB);
      setLinkA('');
      setLinkB('');
    }
  };

  return (
    <div className="panel" id="chaos-panel">
      <div className="panel-title">
        <span className="icon">💀</span>
        Chaos Control
        {hasKills && (
          <span className="badge badge-danger" style={{ marginLeft: 'auto' }}>
            {killedNodes.size} nodes · {killedLinks.length} links
          </span>
        )}
      </div>

      <div className="section-label">Kill / Revive Node</div>
      <div className="chaos-grid">
        {nodes.map(node => {
          const isKilled = killedNodes.has(node.id);
          return (
            <button
              key={node.id}
              className={`chaos-node-btn ${isKilled ? 'killed' : ''}`}
              style={{ borderColor: isKilled ? undefined : PLANET_COLORS[node.id] + '55' }}
              onClick={() => onKillNode(node.id)}
              title={isKilled ? `Revive ${node.id}` : `Kill ${node.id}`}
            >
              <div
                className="chaos-node-dot"
                style={{ backgroundColor: isKilled ? 'var(--danger)' : PLANET_COLORS[node.id] }}
              />
              <span className="node-name">{node.id}</span>
            </button>
          );
        })}
      </div>

      <div className="section-label">Kill Link</div>
      <div className="kill-link-row">
        <div className="form-group">
          <select
            className="select"
            value={linkA}
            onChange={e => setLinkA(e.target.value)}
          >
            <option value="">Node A</option>
            {nodes.map(n => (
              <option key={n.id} value={n.id}>{n.id}</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <select
            className="select"
            value={linkB}
            onChange={e => setLinkB(e.target.value)}
          >
            <option value="">Node B</option>
            {nodes.filter(n => n.id !== linkA).map(n => (
              <option key={n.id} value={n.id}>{n.id}</option>
            ))}
          </select>
        </div>
        <button
          className="btn btn-danger btn-sm"
          onClick={handleKillLink}
          disabled={!linkA || !linkB}
          style={{ flexShrink: 0, marginBottom: 0 }}
        >
          Kill
        </button>
      </div>

      {killedLinks.length > 0 && (
        <div style={{ marginTop: '10px' }}>
          <div className="section-label">Dead Links</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {killedLinks.map(link => (
              <span key={link} className="badge badge-danger">{link}</span>
            ))}
          </div>
        </div>
      )}

      {hasKills && (
        <button
          className="btn btn-success"
          style={{ width: '100%', marginTop: '14px' }}
          onClick={onRestore}
        >
          ✨ Restore All
        </button>
      )}
    </div>
  );
}
