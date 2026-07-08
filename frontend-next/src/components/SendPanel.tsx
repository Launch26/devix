import { useState, useEffect } from 'react';

export default function SendPanel({
  universe,
  selectedOrigin,
  selectedDestination,
  onOriginChange,
  onDestinationChange,
  onSend,
  sending,
  error,
}) {
  const [message, setMessage] = useState('Hello world');
  const nodes = universe?.nodes || [];

  useEffect(() => {
    if (selectedOrigin && !nodes.find(n => n.id === selectedOrigin)) {
      onOriginChange('');
    }
    if (selectedDestination && !nodes.find(n => n.id === selectedDestination)) {
      onDestinationChange('');
    }
  }, [nodes]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedOrigin || !selectedDestination || !message.trim()) return;
    onSend(selectedOrigin, selectedDestination, message.trim());
  };

  return (
    <div className="panel" id="send-panel">
      <div className="panel-title">
        <span className="icon">📡</span>
        Transmit Message
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Origin Planet</label>
          <select
            className="select"
            value={selectedOrigin}
            onChange={(e) => onOriginChange(e.target.value)}
          >
            <option value="">Select origin…</option>
            {nodes.map(n => (
              <option key={n.id} value={n.id}>{n.id} (Base {n.codex})</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Destination Planet</label>
          <select
            className="select"
            value={selectedDestination}
            onChange={(e) => onDestinationChange(e.target.value)}
          >
            <option value="">Select destination…</option>
            {nodes.filter(n => n.id !== selectedOrigin).map(n => (
              <option key={n.id} value={n.id}>{n.id} (Base {n.codex})</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Payload</label>
          <input
            className="input"
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter payload…"
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%' }}
          disabled={sending || !selectedOrigin || !selectedDestination || !message.trim()}
        >
          {sending ? (
            <>
              <span className="spinner" />
              Transmitting…
            </>
          ) : (
            <>🚀 Transmit</>
          )}
        </button>
      </form>

      {error && <div className="error-msg">⚠ {error}</div>}
    </div>
  );
}
