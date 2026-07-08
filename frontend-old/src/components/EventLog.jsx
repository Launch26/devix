import { useEffect, useRef } from 'react';

export default function EventLog({ events }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [events]);

  const getColor = (event) => {
    if (!event) return 'white';
    const msg = event.msg || '';
    if (msg.includes('✅') || msg.includes('📡') || msg.includes('🏭') || msg.includes('🔒') || msg.includes('🔓')) return '#10b981';
    if (msg.includes('🚀')) return '#00d4ff';
    return '#e8e6f0';
  };

  return (
    <div className="event-log-panel">
      <div className="event-log-title">⬡ EVENT LOG</div>
      <div className="event-log-list" ref={containerRef}>
        {(!events || events.length === 0) && (
          <div style={{ color: '#5e586f', fontSize: 11, padding: '8px 0' }}>
            Awaiting transmission…
          </div>
        )}
        {events && events.map((ev, i) => (
          <div key={i} className="event-log-entry" style={{ color: getColor(ev) }}>
            <span className="event-time">[{ev.time}]</span>
            <span className="event-msg">{ev.msg}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
