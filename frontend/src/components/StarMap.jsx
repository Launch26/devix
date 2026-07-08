import { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import PlanetSVG, { getPlanetRadius } from './PlanetSVG.jsx';

const PLANET_LIGHT = {
  Aegis: '#3B82F6',
  Boreas: '#EF4444',
  Dawn: '#F59E0B',
  Elysium: '#10B981',
  Fenix: '#A78BFA',
  Caelum: '#F97316',
};

const PADDING = 140;

function computeLayout(nodes, width, height) {
  if (!nodes || nodes.length === 0) return { positions: {}, xMin: 0, xMax: 1, yMin: 0, yMax: 1 };
  const xs = nodes.map(n => n.x);
  const ys = nodes.map(n => n.y);
  const xMin = Math.min(...xs), xMax = Math.max(...xs);
  const yMin = Math.min(...ys), yMax = Math.max(...ys);
  const xRange = (xMax - xMin) || 1;
  const yRange = (yMax - yMin) || 1;
  const mapW = width - PADDING * 2;
  const mapH = height - PADDING * 2;

  const positions = {};
  for (const node of nodes) {
    positions[node.id] = {
      x: PADDING + (node.x - xMin) / xRange * mapW,
      y: PADDING + (yMax - node.y) / yRange * mapH,
    };
  }
  return { positions };
}

function TowerMarker({ cx, cy, k, isActive, onHover, label }) {
  const [hovered, setHovered] = useState(false);
  const r = isActive ? 6 : 3;
  const color = isActive ? '#FFD700' : '#8B7355';
  const filter = isActive ? 'drop-shadow(0 0 6px #ffd700)' : 'none';

  return (
    <g
      style={{ cursor: 'pointer' }}
      onMouseEnter={() => { setHovered(true); if (onHover) onHover(label); }}
      onMouseLeave={() => { setHovered(false); if (onHover) onHover(null); }}
    >
      <circle
        cx={cx}
        cy={cy}
        r={r + 4}
        fill="transparent"
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill={color}
        stroke="white"
        strokeWidth="1"
        style={{ filter, transition: 'r 0.2s' }}
        className={isActive ? 'tower-active' : ''}
      />
      {hovered && (
        <text
          x={cx + r + 4}
          y={cy + 3}
          fill="white"
          fontSize="9"
          fontFamily="JetBrains Mono, monospace"
        >
          {label}
        </text>
      )}
    </g>
  );
}

function PlanetGroup({
  node, pos, isKilled, isSelected, isSource, isDestination,
  activeTowers, pulsingTowers, flashWhite,
}) {
  const R = getPlanetRadius(node.radius_km);
  const color = PLANET_LIGHT[node.id] || '#8888ff';
  const N = node.active_towers;
  const [hoveredTower, setHoveredTower] = useState(null);

  const towers = [];
  for (let k = 0; k < N; k++) {
    const angle = k * (2 * Math.PI / N) - Math.PI / 2;
    const tx = pos.x + (R + 8) * Math.cos(angle);
    const ty = pos.y + (R + 8) * Math.sin(angle);
    const isActiveTower = activeTowers ? activeTowers.includes(k) : false;
    const isPulsingTower = pulsingTowers ? pulsingTowers.includes(k) : false;
    towers.push({ k, tx, ty, isActive: isActiveTower || isPulsingTower });
  }

  return (
    <g className="planet-outer-group">
      {/* Selection ring */}
      {isSelected && (
        <circle
          cx={pos.x} cy={pos.y}
          r={R + 16}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeDasharray="6 4"
          opacity="0.8"
        >
          <animateTransform
            attributeName="transform"
            type="rotate"
            from={`0 ${pos.x} ${pos.y}`}
            to={`360 ${pos.x} ${pos.y}`}
            dur="8s"
            repeatCount="indefinite"
          />
        </circle>
      )}

      {/* Flash white on delivery */}
      {flashWhite && (
        <circle
          cx={pos.x} cy={pos.y}
          r={R + 20}
          fill="white"
          opacity="0.4"
        >
          <animate attributeName="opacity" values="0.4;0;0.4;0" dur="0.4s" repeatCount="2" />
        </circle>
      )}

      {/* Planet illustrated body */}
      <PlanetSVG
        name={node.id}
        radiusKm={node.radius_km}
        cx={pos.x}
        cy={pos.y}
        isKilled={isKilled}
      />

      {/* Tower markers */}
      {towers.map(({ k, tx, ty, isActive }) => (
        <TowerMarker
          key={k}
          cx={tx}
          cy={ty}
          k={k}
          isActive={isActive}
          label={`Tower ${k}`}
          onHover={setHoveredTower}
        />
      ))}

      {/* Hovered tower tooltip */}
      {hoveredTower && (
        <text
          x={pos.x}
          y={pos.y + R + 40}
          fill="#FFD700"
          fontSize="8"
          textAnchor="middle"
          fontFamily="JetBrains Mono, monospace"
        >
          {hoveredTower}
        </text>
      )}

      {/* Planet name */}
      <text
        x={pos.x}
        y={pos.y + R + 20}
        textAnchor="middle"
        fill={isKilled ? '#888' : color}
        fontSize="13"
        fontWeight="600"
        fontFamily="Inter, sans-serif"
      >
        {node.id}
      </text>
      <text
        x={pos.x}
        y={pos.y + R + 33}
        textAnchor="middle"
        fill={isKilled ? '#555' : color + '99'}
        fontSize="10"
        fontFamily="JetBrains Mono, monospace"
      >
        Base {node.codex}
      </text>
    </g>
  );
}

export default function StarMap({
  universe,
  chaosState,
  animationData,
  activeHop,
  setActiveHop,
  selectedOrigin,
  selectedDestination,
  onPlanetClick,
  animSpeed,
  onAnimEvent,
  onPhaseChange,
}) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ w: 800, h: 600 });
  const animRef = useRef(null);
  const animStateRef = useRef(null);

  // Packet dot state
  const [packetPos, setPacketPos] = useState(null);
  const [cometTail, setCometTail] = useState([]);
  const [flashPlanet, setFlashPlanet] = useState(null);
  const [delivered, setDelivered] = useState(false);
  const [activeTowersByPlanet, setActiveTowersByPlanet] = useState({});
  const [pulsingTowersByPlanet, setPulsingTowersByPlanet] = useState({});
  const [glowingLinks, setGlowingLinks] = useState(new Set());
  const [tooltipPlanet, setTooltipPlanet] = useState(null);

  // Resize observer
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        setSize({ w: entry.contentRect.width, h: entry.contentRect.height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const nodes = universe?.nodes || [];
  const links = universe?.links || [];
  const killedNodes = new Set(chaosState?.killedNodes || []);
  const killedLinks = new Set(chaosState?.killedLinks || []);

  const { positions } = useMemo(
    () => computeLayout(nodes, size.w, size.h),
    [nodes, size]
  );

  // Build route set for highlighting
  const activeRouteLinks = useMemo(() => {
    const set = new Set();
    if (animationData?.route) {
      const route = animationData.route;
      for (let i = 0; i < route.length - 1; i++) {
        const key = [route[i], route[i + 1]].sort().join('-');
        set.add(key);
      }
    }
    return set;
  }, [animationData]);

  // ── Animation Engine ──────────────────────────────────────
  useEffect(() => {
    if (!animationData || !animationData.hopLog) return;

    const hopLog = animationData.hopLog;
    const route = animationData.route;
    const speed = animSpeed || 1;

    let cancelled = false;
    let eventLog = [];

    function emit(msg, color = 'white') {
      const ts = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      eventLog.push({ time: ts, msg, color });
      if (onAnimEvent) onAnimEvent([...eventLog]);
    }

    function setPhase(phase) {
      if (onPhaseChange) onPhaseChange(phase);
    }

    async function sleep(ms) {
      return new Promise(resolve => {
        const t = setTimeout(resolve, ms / speed);
        animRef.current = { cancel: () => clearTimeout(t) };
      });
    }

    function getTowerPos(planetId, towerIdx) {
      const node = nodes.find(n => n.id === planetId);
      const pos = positions[planetId];
      if (!node || !pos) return { x: 0, y: 0 };
      const R = getPlanetRadius(node.radius_km);
      const N = node.active_towers;
      const angle = towerIdx * (2 * Math.PI / N) - Math.PI / 2;
      return {
        x: pos.x + (R + 8) * Math.cos(angle),
        y: pos.y + (R + 8) * Math.sin(angle),
      };
    }

    async function animatePacketLinear(fromPos, toPos, durationMs, onProgress) {
      return new Promise(resolve => {
        const start = performance.now();
        function frame(now) {
          if (cancelled) { resolve(); return; }
          const t = Math.max(0, Math.min((now - start) / (durationMs / speed), 1));
          const x = fromPos.x + (toPos.x - fromPos.x) * t;
          const y = fromPos.y + (toPos.y - fromPos.y) * t;
          setPacketPos({ x, y });
          setCometTail(prev => {
            const next = [{ x, y }, ...prev.slice(0, 9)];
            return next;
          });
          if (onProgress) onProgress(t);
          if (t < 1) requestAnimationFrame(frame);
          else resolve();
        }
        requestAnimationFrame(frame);
      });
    }

    async function animatePacketArc(planetId, entryTower, exitTower, direction, durationMs) {
      const node = nodes.find(n => n.id === planetId);
      const pos = positions[planetId];
      if (!node || !pos) return;
      const R = getPlanetRadius(node.radius_km);
      const N = node.active_towers;

      let startAngle = entryTower * (2 * Math.PI / N) - Math.PI / 2;
      let endAngle = exitTower * (2 * Math.PI / N) - Math.PI / 2;

      if (direction === 'CW') {
        if (endAngle < startAngle) endAngle += 2 * Math.PI;
      } else {
        if (endAngle > startAngle) endAngle -= 2 * Math.PI;
      }

      const STEPS = 30;
      const waypoints = [];
      for (let i = 0; i <= STEPS; i++) {
        const t = i / STEPS;
        const a = startAngle + t * (endAngle - startAngle);
        waypoints.push({
          x: pos.x + (R + 8) * Math.cos(a),
          y: pos.y + (R + 8) * Math.sin(a),
        });
      }

      return new Promise(resolve => {
        const start = performance.now();
        function frame(now) {
          if (cancelled) { resolve(); return; }
          const t = Math.max(0, Math.min((now - start) / (durationMs / speed), 1));
          const idx = Math.floor(t * STEPS);
          const wp = waypoints[Math.min(idx, STEPS)];
          setPacketPos({ x: wp.x, y: wp.y });
          setCometTail(prev => {
            const next = [{ x: wp.x, y: wp.y }, ...prev.slice(0, 9)];
            return next;
          });

          // Highlight nearby tower
          const towerAngle = startAngle + t * (endAngle - startAngle);
          // find closest tower
          let bestK = 0, bestDiff = Infinity;
          for (let k = 0; k < N; k++) {
            const ta = k * (2 * Math.PI / N) - Math.PI / 2;
            const diff = Math.abs(((towerAngle - ta) + Math.PI) % (2 * Math.PI) - Math.PI);
            if (diff < bestDiff) { bestDiff = diff; bestK = k; }
          }
          setPulsingTowersByPlanet(prev => ({ ...prev, [planetId]: [bestK] }));

          if (t < 1) requestAnimationFrame(frame);
          else { setPulsingTowersByPlanet(prev => ({ ...prev, [planetId]: [] })); resolve(); }
        }
        requestAnimationFrame(frame);
      });
    }

    async function runAnimation() {
      await sleep(200);
      emit(`📦 Packet created at ${route[0]}`, 'green');
      emit(`🔭 Routing path calculated`, 'white');
      if (animationData.security) {
        emit(`🔒 E2EE XOR-SHA256 Cipher Encrypted`, 'green');
      }
      setPhase({ phase: 'Inside Source', step: 0, total: 5 });

      // Parse hopLog for structured steps
      // The hopLog from backend has: planet_id, receiving_tower, sending_tower, fiber_segments,
      // void_from_previous, latency
      const hops = hopLog;

      for (let i = 0; i < hops.length; i++) {
        if (cancelled) break;
        const hop = hops[i];
        const planetId = hop.planet_id;
        const node = nodes.find(n => n.id === planetId);
        if (!node) continue;

        setActiveHop(i);

        // VOID hop from previous planet
        if (hop.void_from_previous && i > 0) {
          const prevHop = hops[i - 1];
          const prevPlanet = prevHop.planet_id;
          const exitTowerIdx = prevHop.sending_tower;
          const entryTowerIdx = hop.receiving_tower;

          setGlowingLinks(prev => {
            const next = new Set(prev);
            next.add([prevPlanet, planetId].sort().join('-'));
            return next;
          });

          const fromPos = exitTowerIdx !== null && exitTowerIdx !== undefined
            ? getTowerPos(prevPlanet, exitTowerIdx)
            : positions[prevPlanet] || { x: 0, y: 0 };
          const toPos = entryTowerIdx !== null && entryTowerIdx !== undefined
            ? getTowerPos(planetId, entryTowerIdx)
            : positions[planetId] || { x: 0, y: 0 };

          setPhase({ phase: 'In Transit', step: 2, total: 5 });
          emit(`🚀 Transmitting to ${planetId}`, 'cyan');
          await animatePacketLinear(fromPos, toPos, 1200);

          setGlowingLinks(prev => {
            const next = new Set(prev);
            next.delete([prevPlanet, planetId].sort().join('-'));
            return next;
          });

          emit(`📡 Signal received at ${planetId}`, 'green');
          setPhase({ phase: `To ${planetId}`, step: 3, total: 5 });
        } else {
          // First hop, start at receiving tower
          const towerIdx = hop.receiving_tower;
          if (towerIdx !== null && towerIdx !== undefined) {
            const tPos = getTowerPos(planetId, towerIdx);
            setPacketPos(tPos);
          } else {
            setPacketPos(positions[planetId]);
          }
        }

        // Determine entry and exit towers for logic
        const entryTower = hop.receiving_tower;
        const exitTower = hop.sending_tower;

        emit(`🏭 Entering tower network (${planetId})`, 'green');
        setPhase({ phase: `Inside ${planetId}`, step: i === 0 ? 0 : 4, total: 5 });

        // Ring traversal if segments > 0
        const segments = hop.fiber_segments || 0;
        if (segments > 0 && entryTower !== null && entryTower !== undefined && exitTower !== null && exitTower !== undefined) {
          emit(`⚡ Moving: Tower ${entryTower} → Tower ${exitTower} (${planetId})`, 'white');
          const duration = Math.max(400, segments * 120);

          // Determine direction (CW default)
          const N = node.active_towers;
          const cwDist = ((exitTower - entryTower) + N) % N;
          const ccwDist = ((entryTower - exitTower) + N) % N;
          const direction = cwDist <= ccwDist ? 'CW' : 'CCW';

          await animatePacketArc(planetId, entryTower, exitTower, direction, duration);
        } else if (entryTower !== null && entryTower !== undefined) {
          // Stationary — pulse tower
          await sleep(400);
        }

        if (exitTower !== null && exitTower !== undefined) {
          emit(`📤 Exiting planet atmosphere (${planetId})`, 'white');
        }

        // Packet leaves planet
        await sleep(100);
      }

      // Delivery flash
      if (!cancelled) {
        const dest = route[route.length - 1];
        setFlashPlanet(dest);
        if (animationData.security) {
          emit(`🔓 Ciphertext Decrypted`, 'green');
          emit(`✅ SHA-256 Signature Valid`, 'green');
        }
        emit(`✅ Delivered to ${dest}`, 'green');
        setPhase({ phase: 'Inside Destination', step: 4, total: 5 });
        setDelivered(true);
        setPacketPos(null);
        setCometTail([]);
        await sleep(2000);
        setDelivered(false);
        setFlashPlanet(null);
      }
    }

    setDelivered(false);
    setFlashPlanet(null);
    setCometTail([]);
    setActiveTowersByPlanet({});
    setPulsingTowersByPlanet({});
    setGlowingLinks(new Set());

    runAnimation().catch(() => {});

    return () => {
      cancelled = true;
      if (animRef.current?.cancel) animRef.current.cancel();
    };
  }, [animationData]);

  // Click handler
  const handleSVGClick = useCallback((e) => {
    if (!universe) return;
    const svgEl = e.currentTarget;
    const rect = svgEl.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (const node of nodes) {
      const pos = positions[node.id];
      if (!pos) continue;
      const R = getPlanetRadius(node.radius_km);
      const dist = Math.sqrt((mx - pos.x) ** 2 + (my - pos.y) ** 2);
      if (dist < R + 10) {
        onPlanetClick(node.id);
        return;
      }
    }
  }, [universe, positions, nodes, onPlanetClick]);

  // Mouse move for tooltip
  const handleMouseMove = useCallback((e) => {
    if (!universe) return;
    const svgEl = e.currentTarget;
    const rect = svgEl.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (const node of nodes) {
      const pos = positions[node.id];
      if (!pos) continue;
      const R = getPlanetRadius(node.radius_km);
      const dist = Math.sqrt((mx - pos.x) ** 2 + (my - pos.y) ** 2);
      if (dist < R + 12) {
        setTooltipPlanet({ node, mx: e.clientX, my: e.clientY });
        return;
      }
    }
    setTooltipPlanet(null);
  }, [universe, positions, nodes]);

  const destPlanet = animationData?.route?.[animationData.route.length - 1];

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      <svg
        width={size.w}
        height={size.h}
        style={{ display: 'block', cursor: 'pointer' }}
        onClick={handleSVGClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltipPlanet(null)}
      >
        {/* ── All link lines ── */}
        <g pointerEvents="none">
          {links.map((link, i) => {
            const n1 = nodes.find(n => n.id === link.source);
            const n2 = nodes.find(n => n.id === link.target);
            if (!n1 || !n2) return null;
            const p1 = positions[n1.id];
            const p2 = positions[n2.id];
            if (!p1 || !p2) return null;
            const sortedKey = [link.source, link.target].sort().join('-');
            const isKilledLink = killedLinks.has(sortedKey);
            const isActiveRoute = activeRouteLinks.has(sortedKey);
            const isGlowing = glowingLinks.has(sortedKey);

            if (isKilledLink) {
              return (
                <line
                  key={i}
                  x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke="rgba(239,68,68,0.5)"
                  strokeWidth="2"
                  strokeDasharray="8 6"
                />
              );
            }

            return (
              <g key={i}>
                {/* Wide glow behind route */}
                {isActiveRoute && (
                  <line
                    x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                    stroke={isGlowing ? '#00d4ff' : '#00d4ff'}
                    strokeWidth={isGlowing ? 14 : 10}
                    strokeOpacity={isGlowing ? 0.18 : 0.08}
                  >
                    {isGlowing && (
                      <animate attributeName="strokeOpacity" values="0.08;0.25;0.08" dur="0.6s" repeatCount="indefinite" />
                    )}
                  </line>
                )}
                <line
                  x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y}
                  stroke={isActiveRoute ? '#00d4ff' : '#1a3a5c'}
                  strokeWidth={isActiveRoute ? 2 : 1}
                  strokeDasharray={isActiveRoute ? 'none' : '6 5'}
                  strokeOpacity={isActiveRoute ? 1 : 0.6}
                />
              </g>
            );
          })}
        </g>

        {/* ── Planets ── */}
        {nodes.map(node => {
          const pos = positions[node.id];
          if (!pos) return null;
          const isKilled = killedNodes.has(node.id);
          const isSelected = node.id === selectedOrigin || node.id === selectedDestination;
          return (
            <PlanetGroup
              key={node.id}
              node={node}
              pos={pos}
              isKilled={isKilled}
              isSelected={isSelected}
              isSource={node.id === selectedOrigin}
              isDestination={node.id === selectedDestination}
              activeTowers={activeTowersByPlanet[node.id] || []}
              pulsingTowers={pulsingTowersByPlanet[node.id] || []}
              flashWhite={flashPlanet === node.id}
            />
          );
        })}

        {/* ── Comet Tail ── */}
        {cometTail.length > 1 && (
          <polyline
            points={cometTail.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke="#00d4ff"
            strokeWidth="3"
            strokeLinecap="round"
            strokeOpacity="0.7"
            style={{
              strokeDasharray: `${cometTail.length * 3}`,
            }}
            pointerEvents="none"
          />
        )}

        {/* ── Packet dot ── */}
        {packetPos && (
          <g pointerEvents="none">
            <circle cx={packetPos.x} cy={packetPos.y} r={10} fill="#00d4ff" opacity="0.25" />
            <circle cx={packetPos.x} cy={packetPos.y} r={6} fill="white">
              <animate attributeName="r" values="5;7;5" dur="0.5s" repeatCount="indefinite" />
            </circle>
          </g>
        )}

        {/* ── DELIVERED badge ── */}
        {delivered && destPlanet && positions[destPlanet] && (
          <g pointerEvents="none">
            <rect
              x={positions[destPlanet].x - 48}
              y={positions[destPlanet].y - 70}
              width={96}
              height={22}
              rx={6}
              fill="#10b981"
              opacity="0.9"
            />
            <text
              x={positions[destPlanet].x}
              y={positions[destPlanet].y - 54}
              textAnchor="middle"
              fill="white"
              fontSize="11"
              fontWeight="700"
              fontFamily="Inter, sans-serif"
              letterSpacing="2"
            >
              ✓ DELIVERED
            </text>
          </g>
        )}
      </svg>

      {/* Planet tooltip */}
      {tooltipPlanet && (
        <div
          className="canvas-tooltip"
          style={{
            position: 'fixed',
            left: tooltipPlanet.mx + 14,
            top: tooltipPlanet.my - 10,
            pointerEvents: 'none',
            zIndex: 200,
          }}
        >
          <div className="tip-name" style={{ color: PLANET_LIGHT[tooltipPlanet.node.id] }}>
            {tooltipPlanet.node.id}
          </div>
          <div className="tip-row">
            <span className="tip-label">Codex</span>
            <span className="tip-value">Base {tooltipPlanet.node.codex}</span>
          </div>
          <div className="tip-row">
            <span className="tip-label">Radius</span>
            <span className="tip-value">{tooltipPlanet.node.radius_km.toLocaleString()} km</span>
          </div>
          <div className="tip-row">
            <span className="tip-label">Towers</span>
            <span className="tip-value">{tooltipPlanet.node.active_towers}</span>
          </div>
          <div className="tip-row">
            <span className="tip-label">Atmosphere</span>
            <span className="tip-value">{tooltipPlanet.node.atmosphere_thickness_km} km</span>
          </div>
        </div>
      )}
    </div>
  );
}
