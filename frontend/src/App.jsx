/**
 * App.jsx - Main Application Component for Zeta-26 Interplanetary Routing Simulator
 * This component manages the global state of the universe, chaos events (node/link failures),
 * packet transmissions, and renders all the primary UI components (StarMap, EventLog, Analytics).
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchUniverse, sendMessage, routeMessage, killNode, killLink, restoreAll, getChaosState } from './utils/api';
import StarMap from './components/StarMap';
import MiniPlanetDiagram from './components/MiniPlanetDiagram';
import PacketPhaseBar from './components/PacketPhaseBar';
import EventLog from './components/EventLog';
import AnalyticsSection from './components/AnalyticsSection';
import InteractiveStarBackground from './components/InteractiveStarBackground';
import './App.css';

const PLANET_COLORS = {
  Aegis: '#3B82F6',
  Boreas: '#EF4444',
  Dawn: '#F59E0B',
  Elysium: '#10B981',
  Fenix: '#A78BFA',
  Caelum: '#F97316',
};

const SIDEBAR_TABS = [
  { id: 'map', icon: '🗺', label: 'Star Map' },
  { id: 'transmit', icon: '📡', label: 'Transmit' },
  { id: 'hoplog', icon: '🛰', label: 'Hop Log' },
  { id: 'analytics', icon: '📊', label: 'Analytics' },
  { id: 'chaos', icon: '💀', label: 'Chaos' },
  { id: 'settings', icon: '⚙', label: 'Settings' },
];

export default function App() {
  const [universe, setUniverse] = useState(null);
  const [chaosState, setChaosState] = useState({ killedNodes: [], killedLinks: [] });
  const [packetResult, setPacketResult] = useState(null);
  const [selectedOrigin, setSelectedOrigin] = useState('Dawn');
  const [selectedDestination, setSelectedDestination] = useState('Aegis');
  const [message, setMessage] = useState('Hello Zeta-26!');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [animationData, setAnimationData] = useState(null);
  const [linkA, setLinkA] = useState('');
  const [linkB, setLinkB] = useState('');
  const [activeHop, setActiveHop] = useState(-1);
  const [activeTab, setActiveTab] = useState('map');
  const [animSpeed, setAnimSpeed] = useState(0.5);
  const [eventLog, setEventLog] = useState([]);
  const [currentPhase, setCurrentPhase] = useState(null);
  const [selectedHopIdx, setSelectedHopIdx] = useState(null);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [inputMode, setInputMode] = useState('structured'); // 'structured' | 'nlp'
  const [nlpText, setNlpText] = useState('');
  const [copilotResult, setCopilotResult] = useState(null);
  const audioRef = useRef(null);
  const hasInteracted = useRef(false);

  useEffect(() => {
    loadUniverse();
    loadChaosState();
  }, []);

  useEffect(() => {
    // Attempt to autoplay audio when component mounts
    if (audioRef.current && !isAudioMuted) {
      audioRef.current.play().catch(e => {
        // Autoplay may be blocked by browser policy without user interaction
        console.warn("Autoplay blocked by browser. User must click to play.", e);
        setIsAudioMuted(true);
      });
    }

    // Start audio on first user click anywhere on the page
    const handleFirstInteraction = () => {
      if (!hasInteracted.current && audioRef.current) {
        hasInteracted.current = true;
        audioRef.current.play().then(() => {
          setIsAudioMuted(false);
        }).catch(e => console.error("Audio play failed:", e));
      }
      document.removeEventListener('click', handleFirstInteraction);
    };

    document.addEventListener('click', handleFirstInteraction);
    
    return () => {
      document.removeEventListener('click', handleFirstInteraction);
    };
  }, []);

  const toggleAudio = (e) => {
    if (e) e.stopPropagation();
    hasInteracted.current = true; // Manual toggle counts as an interaction
    
    if (!audioRef.current) return;
    if (isAudioMuted) {
      audioRef.current.play().catch(e => console.error(e));
      setIsAudioMuted(false);
    } else {
      audioRef.current.pause();
      setIsAudioMuted(true);
    }
  };

  async function loadUniverse() {
    const { data, error } = await fetchUniverse();
    if (data) setUniverse(data);
    if (error) console.error('Failed to load universe:', error);
  }

  async function loadChaosState() {
    const { data } = await getChaosState();
    if (data) setChaosState(data);
  }

  const handleSend = useCallback(async () => {
    if (inputMode === 'structured' && (!selectedOrigin || !selectedDestination || !message.trim())) return;
    if (inputMode === 'nlp' && !nlpText.trim()) return;

    setError(null);
    setSending(true);
    setPacketResult(null);
    setCopilotResult(null);
    setAnimationData(null);
    setActiveHop(-1);
    setEventLog([]);
    setCurrentPhase(null);
    setSelectedHopIdx(null);

    let data, err;
    if (inputMode === 'nlp') {
      const resp = await routeMessage({ text: nlpText });
      data = resp.data; err = resp.error;
    } else {
      const resp = await routeMessage({ origin: selectedOrigin, destination: selectedDestination, message: message.trim() });
      data = resp.data; err = resp.error;
    }

    setSending(false);

    if (err) { setError(err); return; }

    // Backend returned Phase 2 Unified Reporting Protocol
    setCopilotResult(data);
    
    // Packet might be inside data.packet
    const pkt = data.packet || data;
    if (pkt && pkt.route) {
        setPacketResult(pkt);
        setAnimationData({
          route: pkt.route,
          hopLog: pkt.hop_log,
          startTime: Date.now(),
          security: pkt.security,
        });
    }
  }, [inputMode, selectedOrigin, selectedDestination, message, nlpText]);

  const handleKillNode = useCallback(async (nodeId) => {
    const { data } = await killNode(nodeId);
    if (data?.state) setChaosState(data.state);
  }, []);

  const handleKillLink = useCallback(async (nodeA, nodeB) => {
    const { data } = await killLink(nodeA, nodeB);
    if (data?.state) setChaosState(data.state);
  }, []);

  const handleRestore = useCallback(async () => {
    const { data } = await restoreAll();
    if (data?.state) setChaosState(data.state);
  }, []);

  const handlePlanetClick = useCallback((planetId) => {
    if (!selectedOrigin || (selectedOrigin && selectedDestination)) {
      setSelectedOrigin(planetId);
      setSelectedDestination('');
    } else {
      if (planetId !== selectedOrigin) setSelectedDestination(planetId);
    }
  }, [selectedOrigin, selectedDestination]);

  const nodes = universe?.nodes || [];
  const killedNodes = new Set(chaosState?.killedNodes || []);
  const killedLinks = chaosState?.killedLinks || [];
  const hasKills = killedNodes.size > 0 || killedLinks.length > 0;
  const isOperational = !hasKills;

  // Active hop details
  const displayHopIdx = selectedHopIdx !== null ? selectedHopIdx : (activeHop >= 0 ? activeHop : 0);
  const activeHopData = packetResult?.hop_log?.[displayHopIdx] || null;
  const totalLatency = packetResult?.total_latency_ms || 0;

  // Latency breakdown
  let fiberMs = 0, towerMs = 0, voidMs = 0, atmosphereMs = 0;
  if (packetResult?.hop_log) {
    for (const hop of packetResult.hop_log) {
      fiberMs += hop.latency?.fiber_transit_ms || 0;
      towerMs += hop.latency?.tower_delay_ms || 0;
      if (hop.void_from_previous) {
        voidMs += (hop.void_from_previous.vacuum_only_ms || hop.void_from_previous.travel_time_ms || 0);
        atmosphereMs += (hop.void_from_previous.atmosphere_delay_origin_ms || 0) + (hop.void_from_previous.atmosphere_delay_dest_ms || 0);
      }
    }
  }

  if (!universe) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <h2>Initializing Zeta-26 System…</h2>
        <p>Loading universe configuration</p>
      </div>
    );
  }

  return (
    <div className="zeta-master">
      <InteractiveStarBackground />
      <div className="grid-pinned-top">
        {/* ═══ HEADER BAR ═══════════════════════════════════════ */}
        <header className="zeta-header">
          <div className="header-left">
            <div>
              <div
                className="header-title"
                style={{
                  fontFamily: "'Fjalla One', sans-serif",
                  fontSize: "1.5rem",
                  fontWeight: "700",
                  background:
                    "linear-gradient(90deg, #7d7d7d 0%, #bfbfbf 35%, #ffffff 50%, #d8d8d8 70%, #8a8a8a 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  marginTop: "5px",
                  backgroundClip: "text",
                  letterSpacing: "2px",
                  lineHeight: "1",
                  textTransform: "uppercase",
                  textShadow: "0 0 20px rgba(0, 229, 255, 0.15)",
                }}
              >
                RELIC RING PROTOCOL
              </div>

              <div
                className="header-subtitle"
                style={{
                  fontSize: "0.8rem",
                  color: "#00ffd9",
                  letterSpacing: "2px",
                  marginTop: "5px",
                  fontWeight: "500",
                  textTransform: "uppercase",
                }}
              >
                ZETA-26 STAR SYSTEM — ROUTING SIMULATOR
              </div>
            </div>
          </div>

          <div className="header-center">
            <span className="system-status-label">SYSTEM STATUS</span>
            <span className={`status-dot ${isOperational ? 'status-ok' : 'status-bad'}`} />
            <span className={`status-text ${isOperational ? 'text-ok' : 'text-bad'}`}>
              {isOperational ? 'OPERATIONAL' : 'DEGRADED'}
            </span>
          </div>

          <div className="header-right">
            <button
              className="hdr-btn sound-btn"
              onClick={toggleAudio}
            >
              {isAudioMuted ? '🔇 SOUND OFF' : '🔊 SOUND ON'}
            </button>
          </div>
        </header>

        <audio 
          ref={audioRef} 
          src="/space_music.mp3" 
          loop 
          autoPlay 
        />

        {/* ── LEFT SIDEBAR ── */}
        {/* <aside className="zeta-sidebar"> ... </aside> */}

        {/* ── CENTER STAR MAP ── */}
        <main className="zeta-center">
          <StarMap
            universe={universe}
            chaosState={chaosState}
            animationData={animationData}
            activeHop={activeHop}
            setActiveHop={setActiveHop}
            selectedOrigin={selectedOrigin}
            selectedDestination={selectedDestination}
            onPlanetClick={handlePlanetClick}
            animSpeed={animSpeed}
            onAnimEvent={setEventLog}
            onPhaseChange={setCurrentPhase}
          />
          <div className="scroll-indicator">
            ▼ SCROLL FOR TRANSMISSION ANALYTICS ▼
          </div>
        </main>

        {/* ── RIGHT PANEL ── */}
        <aside className="zeta-right-panel">
          {/* Speed control */}
          <div className="speed-control">
            <span className="speed-label">Speed: {animSpeed}×</span>
            <input
              type="range"
              min="0.1"
              max="4"
              step="0.5"
              value={animSpeed}
              onChange={e => setAnimSpeed(parseFloat(e.target.value))}
              className="speed-slider"
            />
          </div>

          {/* Active Route */}
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
                {packetResult.route?.map((planet, i) => (
                  <div
                    key={i}
                    className={`route-list-item ${i === displayHopIdx ? 'route-item-active' : ''}`}
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

          {/* Copilot Evaluation */}
          {copilotResult && (
            <div className="right-card" id="copilot-eval-card" style={{borderColor: '#06b6d4', boxShadow: '0 0 10px rgba(6, 182, 212, 0.1)'}}>
              <div className="right-card-header">
                <span className="right-card-title" style={{color: '#06b6d4'}}>🛸 CO-PILOT AGENT</span>
                {copilotResult.evaluation_ms && <span className="badge-cyan-sm">{copilotResult.evaluation_ms}ms</span>}
              </div>
              
              <div style={{ fontSize: '11px', color: '#a8a2b5', marginBottom: 12, lineHeight: 1.4 }}>
                <strong style={{color: '#fff'}}>Explanation:</strong> {copilotResult.explanation}
              </div>

              {copilotResult.link_evaluations?.map((ev, i) => {
                const isRerouted = ev.trust_score < 0.5 || ev.targeting_risk_score > 0.5;
                return (
                <div key={ev.link_id} style={{
                    background: '#1a1625', 
                    borderRadius: 4, 
                    padding: 8, 
                    marginBottom: 8,
                    borderLeft: `3px solid ${isRerouted ? '#ef4444' : '#10b981'}`
                }}>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: 4}}>
                    <strong style={{fontSize: 11, color: '#fff'}}>{ev.link_id}</strong>
                    <span style={{fontSize: 10, color: isRerouted ? '#ef4444' : '#10b981'}}>
                      {isRerouted ? 'FLAGGED' : 'CLEARED'}
                    </span>
                  </div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, fontSize: 10, color: '#a8a2b5'}}>
                    <div>Trust Score: <span style={{color: ev.trust_score < 0.5 ? '#ef4444' : '#10b981'}}>{(ev.trust_score * 100).toFixed(0)}%</span></div>
                    <div>Target Risk: <span style={{color: ev.targeting_risk_score > 0.5 ? '#f59e0b' : '#10b981'}}>{(ev.targeting_risk_score * 100).toFixed(0)}%</span></div>
                    <div>Congestion: <span>{ev.predicted_congestion_penalty_ms >= 900000 ? 'MAX' : ev.predicted_congestion_penalty_ms.toFixed(1) + 'ms'}</span></div>
                    <div>Cost: <span style={{color: '#fff'}}>{ev.combined_cost >= 900000 ? 'INF' : ev.combined_cost.toFixed(4)}</span></div>
                  </div>
                </div>
              )})}
            </div>
          )}

          {/* Hop Details */}
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
                  <span style={{ color: PLANET_COLORS[activeHopData.planet_id] }}>
                    {activeHopData.planet_id}
                  </span>
                  <span style={{ color: '#5e586f', margin: '0 6px' }}>→</span>
                  <span style={{ color: PLANET_COLORS[packetResult?.route?.[displayHopIdx + 1]] }}>
                    {packetResult?.route?.[displayHopIdx + 1] || '(destination)'}
                  </span>
                </div>

                <div className="hop-stats-grid">
                  <span className="hop-stat-label">EXIT TOWER</span>
                  <span className="hop-stat-label">VOID</span>
                  <span className="hop-stat-label">ENTRY TOWER</span>

                  <span className="hop-stat-value" style={{ color: '#FFD700' }}>
                    {activeHopData.sending_tower !== null && activeHopData.sending_tower !== undefined
                      ? `Tower ${activeHopData.sending_tower}`
                      : '—'}
                  </span>
                  <span className="hop-stat-icon">⟶</span>
                  <span className="hop-stat-value" style={{ color: '#F97316' }}>
                    {packetResult?.hop_log?.[displayHopIdx + 1]?.receiving_tower !== null &&
                     packetResult?.hop_log?.[displayHopIdx + 1]?.receiving_tower !== undefined
                      ? `Tower ${packetResult.hop_log[displayHopIdx + 1].receiving_tower}`
                      : '—'}
                  </span>
                </div>

                {/* Mini planet diagram */}
                <div className="mini-diagram-container">
                  <MiniPlanetDiagram hop={activeHopData} universe={universe} />
                </div>

                {/* Hop path description */}
                {activeHopData.fiber_segments > 0 && (
                  <div className="hop-path-text">
                    Path: T{activeHopData.receiving_tower} → T{activeHopData.sending_tower}
                    <span style={{ color: '#5e586f', marginLeft: 8 }}>({activeHopData.fiber_segments} segments)</span>
                  </div>
                )}

                <div className="hop-stat-list">
                  {activeHopData.receiving_tower !== null && activeHopData.receiving_tower !== undefined && (
                    <div className="hsl-row">
                      <span className="hsl-label">Receiving Tower</span>
                      <span className="hsl-value">T{activeHopData.receiving_tower}</span>
                    </div>
                  )}
                  {activeHopData.sending_tower !== null && activeHopData.sending_tower !== undefined && (
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
                    <div className="encoded-array">
                      [{activeHopData.payload_encoded.values.join(', ')}]
                    </div>
                  </div>
                )}

                {activeHopData.void_from_previous && (
                  <>
                    <div className="hop-section-label">TRANSMISSION TO {packetResult?.route?.[displayHopIdx]}</div>
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
                          {((activeHopData.void_from_previous.atmosphere_delay_origin_ms || 0) +
                            (activeHopData.void_from_previous.atmosphere_delay_dest_ms || 0)).toFixed(4)} ms
                        </span>
                      </div>
                      <div className="hsl-row">
                        <span className="hsl-label">Status</span>
                        <span className="hsl-value" style={{ color: '#00d4ff' }}>
                          {sending ? 'Transmitting…' : activeHop >= 0 ? 'In Transit' : 'Complete'}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </>
            ) : (
              <div style={{ color: '#5e586f', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                Transmit a packet to see hop details
              </div>
            )}
          </div>
        </aside>
      </div>

      <div className="scroll-content">
        {/* ═══ BOTTOM BAR ═══════════════════════════════════════ */}
        <footer className="zeta-bottom">
          {/* Column 1: Transmit form */}
          <div className="bottom-col transmit-col" style={{position: 'relative'}}>
            <div className="bottom-col-title" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                <span>⬡ TRANSMIT MESSAGE</span>
                <div style={{display: 'flex', gap: 4, background: '#1a1625', padding: 2, borderRadius: 12}}>
                    <button 
                      onClick={() => setInputMode('structured')}
                      style={{
                          background: inputMode === 'structured' ? '#2a2438' : 'transparent',
                          border: 'none', color: inputMode === 'structured' ? '#fff' : '#5e586f',
                          padding: '2px 8px', borderRadius: 10, fontSize: 10, cursor: 'pointer', transition: '0.2s'
                      }}
                    >MANUAL</button>
                    <button 
                      onClick={() => setInputMode('nlp')}
                      style={{
                          background: inputMode === 'nlp' ? '#06b6d4' : 'transparent',
                          border: 'none', color: inputMode === 'nlp' ? '#1a1625' : '#5e586f', fontWeight: inputMode === 'nlp' ? 'bold' : 'normal',
                          padding: '2px 8px', borderRadius: 10, fontSize: 10, cursor: 'pointer', transition: '0.2s'
                      }}
                    >CO-PILOT AI</button>
                </div>
            </div>
            
            {inputMode === 'structured' ? (
                <>
                    <div className="transmit-row">
                      <div className="transmit-field">
                        <label className="transmit-label">FROM</label>
                        <select
                          className="transmit-select"
                          value={selectedOrigin}
                          onChange={e => setSelectedOrigin(e.target.value)}
                        >
                          <option value="">Origin…</option>
                          {nodes.map(n => (
                            <option key={n.id} value={n.id}>{n.id} (Base {n.codex})</option>
                          ))}
                        </select>
                      </div>
                      <div className="transmit-field">
                        <label className="transmit-label">TO</label>
                        <select
                          className="transmit-select"
                          value={selectedDestination}
                          onChange={e => setSelectedDestination(e.target.value)}
                        >
                          <option value="">Destination…</option>
                          {nodes.filter(n => n.id !== selectedOrigin).map(n => (
                            <option key={n.id} value={n.id}>{n.id} (Base {n.codex})</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="transmit-field" style={{ marginTop: 6 }}>
                      <label className="transmit-label">MESSAGE</label>
                      <input
                        className="transmit-input"
                        type="text"
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        placeholder="Enter payload…"
                      />
                    </div>
                </>
            ) : (
                <div className="transmit-field" style={{ height: '90px' }}>
                  <label className="transmit-label" style={{color: '#06b6d4'}}>NATURAL LANGUAGE COMMAND</label>
                  <textarea
                    className="transmit-input"
                    value={nlpText}
                    onChange={e => setNlpText(e.target.value)}
                    placeholder="e.g., 'Send hello from Aegis to Fenix'"
                    style={{ resize: 'none', height: '100%', fontFamily: 'monospace' }}
                  />
                </div>
            )}
            
            <button
              className="transmit-btn"
              onClick={handleSend}
              disabled={sending || (inputMode === 'structured' && (!selectedOrigin || !selectedDestination || !message.trim())) || (inputMode === 'nlp' && !nlpText.trim())}
              style={{marginTop: inputMode === 'nlp' ? 12 : undefined, background: inputMode === 'nlp' ? '#06b6d4' : undefined, color: inputMode === 'nlp' ? '#1a1625' : undefined}}
            >
              {sending ? (
                <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, borderColor: inputMode === 'nlp' ? 'rgba(0,0,0,0.3)' : undefined, borderTopColor: inputMode === 'nlp' ? '#000' : undefined }} /> {(inputMode === 'nlp') ? 'THINKING...' : 'TRANSMITTING...'}</>
              ) : (
                <>{(inputMode === 'nlp') ? '✨ ENGAGE CO-PILOT' : '🚀 TRANSMIT'}</>
              )}
            </button>
            {error && <div className="error-msg">{error}</div>}
          </div>

          {/* Column 2: Packet phase */}
          <div className="bottom-col phase-col">
            <PacketPhaseBar currentPhase={currentPhase} packetResult={packetResult} />
          </div>

          {/* Column 3: Event log */}
          <div className="bottom-col eventlog-col">
            <EventLog events={eventLog} />
          </div>

          {/* Column 4: Latency breakdown */}
          <div className="bottom-col latency-col">
            <div className="bottom-col-title">⬡ LATENCY BREAKDOWN (TOTAL)</div>
            {packetResult ? (
              <>
                <div className="latency-big-number">
                  {totalLatency.toFixed(4)} <span className="latency-unit">ms</span>
                </div>

                {/* Donut chart SVG */}
                <div className="donut-container">
                  {(() => {
                    const total = fiberMs + towerMs + voidMs + atmosphereMs || 1;
                    const segments = [
                      { label: 'Fiber', val: fiberMs, color: '#06b6d4' },
                      { label: 'Tower', val: towerMs, color: '#f59e0b' },
                      { label: 'Atmosphere', val: atmosphereMs, color: '#10b981' },
                      { label: 'Void', val: voidMs, color: '#7c3aed' },
                    ];
                    const R = 38, cx = 50, cy = 50, strokeW = 14;
                    const circumference = 2 * Math.PI * R;
                    let offset = 0;
                    return (
                      <svg width="100" height="100" viewBox="0 0 100 100">
                        <circle cx={cx} cy={cy} r={R} fill="none" stroke="#0a0a1a" strokeWidth={strokeW} />
                        {segments.map((seg, i) => {
                          if (seg.val <= 0) return null;
                          const pct = seg.val / total;
                          const dash = pct * circumference;
                          const elem = (
                            <circle
                              key={i}
                              cx={cx} cy={cy} r={R}
                              fill="none"
                              stroke={seg.color}
                              strokeWidth={strokeW}
                              strokeDasharray={`${dash} ${circumference - dash}`}
                              strokeDashoffset={-offset}
                              transform={`rotate(-90 ${cx} ${cy})`}
                              opacity="0.9"
                            />
                          );
                          offset += dash;
                          return elem;
                        })}
                      </svg>
                    );
                  })()}
                </div>

                <div className="latency-legend">
                  {[
                    { label: 'Fiber', val: fiberMs, color: '#06b6d4', pct: fiberMs / (totalLatency || 1) },
                    { label: 'Tower', val: towerMs, color: '#f59e0b', pct: towerMs / (totalLatency || 1) },
                    { label: 'Atmosphere', val: atmosphereMs, color: '#10b981', pct: atmosphereMs / (totalLatency || 1) },
                    { label: 'Void', val: voidMs, color: '#7c3aed', pct: voidMs / (totalLatency || 1) },
                  ].map(s => (
                    <div key={s.label} className="latency-legend-row">
                      <span className="legend-dot" style={{ backgroundColor: s.color }} />
                      <span className="legend-label">{s.label}</span>
                      <span className="legend-val">{s.val.toFixed(4)} ms</span>
                      <span className="legend-pct">({(s.pct * 100).toFixed(2)}%)</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ color: '#5e586f', fontSize: 12, marginTop: 16, textAlign: 'center' }}>
                No transmission data yet
              </div>
            )}
          </div>
        </footer>

        <AnalyticsSection packetResult={packetResult} eventLog={eventLog} />
      </div>


    </div>
  );
}
