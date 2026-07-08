const PHASES = [
  { label: 'Inside Source', key: 'Inside Source' },
  { label: 'To Space', key: 'To Space' },
  { label: 'In Transit', key: 'In Transit' },
  { label: 'To Planet', key: 'To Planet' },
  { label: 'Destination', key: 'Inside Destination' },
];

export default function PacketPhaseBar({ currentPhase, packetResult }) {
  const activeIdx = PHASES.findIndex(p =>
    currentPhase?.phase?.includes(p.key) || currentPhase?.phase === p.label
  );

  const progressPct = currentPhase
    ? Math.min(100, Math.round(((currentPhase.step || 0) / Math.max(1, (currentPhase.total || 5) - 1)) * 100))
    : 0;

  if (!packetResult && !currentPhase) {
    return (
      <div className="packet-phase-bar">
        <div className="phase-title">⬡ PACKET ANIMATION</div>
        <div className="phases-steps">
          {PHASES.map((p, i) => (
            <div key={i} className="phase-step phase-inactive">
              <div className="phase-dot" />
              <span>{p.label}</span>
            </div>
          ))}
        </div>
        <div className="phase-progress-track">
          <div className="phase-progress-fill" style={{ width: '0%' }} />
        </div>
        <div className="phase-current-label">Waiting for transmission…</div>
      </div>
    );
  }

  return (
    <div className="packet-phase-bar">
      <div className="phase-title">⬡ PACKET VISUALIZATION</div>
      <div className="phases-steps">
        {PHASES.map((p, i) => {
          const isActive = i === activeIdx;
          const isDone = i < activeIdx;
          return (
            <div key={i} className={`phase-step ${isActive ? 'phase-active' : isDone ? 'phase-done' : 'phase-inactive'}`}>
              <div className="phase-dot">
                {isDone ? '✓' : isActive ? '●' : '○'}
              </div>
              <span>{p.label}</span>
              {i < PHASES.length - 1 && <div className={`phase-connector ${isDone ? 'connector-done' : ''}`} />}
            </div>
          );
        })}
      </div>
      <div className="phase-progress-track">
        <div
          className="phase-progress-fill"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      <div className="phase-current-label">
        Current Phase: <span style={{ color: '#00d4ff' }}>{currentPhase?.phase || 'Idle'}</span>
      </div>
      <div style={{ fontSize: 10, color: '#6b6b8a', marginTop: 4 }}>{progressPct}% complete</div>
    </div>
  );
}
