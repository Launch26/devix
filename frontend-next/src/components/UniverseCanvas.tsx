import { useRef, useEffect, useState, useCallback } from 'react';

const PLANET_COLORS = {
  Aegis: '#3b82f6',
  Boreas: '#f59e0b',
  Dawn: '#f97316',
  Elysium: '#10b981',
  Fenix: '#ef4444',
  Caelum: '#8b5cf6',
};

const PLANET_RADIUS_DISPLAY = 22;
const PADDING = 80;

export default function UniverseCanvas({
  universe,
  chaosState,
  animationData,
  activeHop,
  setActiveHop,
  selectedOrigin,
  selectedDestination,
  onPlanetClick,
}) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const animRef = useRef(null);
  const animStateRef = useRef(null);

  // Compute scale/offset to fit planets into canvas
  const getTransform = useCallback((canvas, nodes) => {
    if (!nodes || nodes.length === 0) return { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0 };
    const xs = nodes.map(n => n.x);
    const ys = nodes.map(n => n.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const rangeX = maxX - minX || 1;
    const rangeY = maxY - minY || 1;
    const w = canvas.width - PADDING * 2;
    const h = canvas.height - PADDING * 2;
    const scale = Math.min(w / rangeX, h / rangeY);
    return {
      scale,
      offsetX: PADDING + (w - rangeX * scale) / 2 - minX * scale,
      offsetY: PADDING + (h - rangeY * scale) / 2 - minY * scale,
    };
  }, []);

  const toCanvas = useCallback((node, transform) => ({
    cx: node.x * transform.scale + transform.offsetX,
    cy: node.y * transform.scale + transform.offsetY,
  }), []);

  // Main draw loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');

    function resize() {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    }
    resize();
    window.addEventListener('resize', resize);

    function draw(time) {
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;
      ctx.clearRect(0, 0, w, h);

      if (!universe) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      const nodes = universe.nodes;
      const links = universe.links;
      const transform = getTransform({ width: w, height: h }, nodes);
      const killedNodes = new Set(chaosState?.killedNodes || []);
      const killedLinks = new Set(chaosState?.killedLinks || []);

      // Draw links
      for (const link of links) {
        const n1 = nodes.find(n => n.id === link.source);
        const n2 = nodes.find(n => n.id === link.target);
        if (!n1 || !n2) continue;

        const p1 = toCanvas(n1, transform);
        const p2 = toCanvas(n2, transform);
        const sortedKey = [link.source, link.target].sort().join('-');
        const isKilled = killedLinks.has(sortedKey);

        ctx.beginPath();
        ctx.moveTo(p1.cx, p1.cy);
        ctx.lineTo(p2.cx, p2.cy);

        if (isKilled) {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
          ctx.setLineDash([6, 6]);
          ctx.lineWidth = 2;
        } else {
          // Color by distance
          const maxDist = universe.metadata.max_void_hop_distance_km;
          const ratio = Math.min(link.void_distance_km / maxDist, 1);
          const r = Math.round(ratio * 200 + 50);
          const g = Math.round((1 - ratio) * 200 + 50);
          ctx.strokeStyle = `rgba(${r}, ${g}, 80, 0.25)`;
          ctx.setLineDash([]);
          ctx.lineWidth = 1;
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Draw route highlight if animating
      const anim = animStateRef.current;
      if (animationData && animationData.route) {
        const route = animationData.route;
        for (let i = 0; i < route.length - 1; i++) {
          const n1 = nodes.find(n => n.id === route[i]);
          const n2 = nodes.find(n => n.id === route[i + 1]);
          if (!n1 || !n2) continue;
          const p1 = toCanvas(n1, transform);
          const p2 = toCanvas(n2, transform);

          ctx.beginPath();
          ctx.moveTo(p1.cx, p1.cy);
          ctx.lineTo(p2.cx, p2.cy);
          ctx.strokeStyle = 'rgba(124, 58, 237, 0.4)';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      // Draw planets
      for (const node of nodes) {
        const pos = toCanvas(node, transform);
        const color = PLANET_COLORS[node.id] || '#8888ff';
        const isKilled = killedNodes.has(node.id);
        const isSelected = node.id === selectedOrigin || node.id === selectedDestination;

        // Atmosphere glow
        const atmRadius = PLANET_RADIUS_DISPLAY + 8;
        const glowGrad = ctx.createRadialGradient(pos.cx, pos.cy, PLANET_RADIUS_DISPLAY, pos.cx, pos.cy, atmRadius + 12);
        glowGrad.addColorStop(0, isKilled ? 'rgba(239, 68, 68, 0.15)' : `${color}22`);
        glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        ctx.arc(pos.cx, pos.cy, atmRadius + 12, 0, Math.PI * 2);
        ctx.fill();

        // Atmosphere ring
        ctx.beginPath();
        ctx.arc(pos.cx, pos.cy, atmRadius, 0, Math.PI * 2);
        ctx.strokeStyle = isKilled ? 'rgba(239, 68, 68, 0.3)' : `${color}33`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Planet body
        const bodyGrad = ctx.createRadialGradient(pos.cx - 4, pos.cy - 4, 2, pos.cx, pos.cy, PLANET_RADIUS_DISPLAY);
        bodyGrad.addColorStop(0, isKilled ? '#3a1515' : color + '40');
        bodyGrad.addColorStop(1, isKilled ? '#1a0a0a' : '#0a0a1a');
        ctx.fillStyle = bodyGrad;
        ctx.beginPath();
        ctx.arc(pos.cx, pos.cy, PLANET_RADIUS_DISPLAY, 0, Math.PI * 2);
        ctx.fill();

        // Border
        ctx.beginPath();
        ctx.arc(pos.cx, pos.cy, PLANET_RADIUS_DISPLAY, 0, Math.PI * 2);
        ctx.strokeStyle = isKilled ? 'rgba(239, 68, 68, 0.6)' : color + '88';
        ctx.lineWidth = isSelected ? 2.5 : 1.5;
        ctx.stroke();

        // Selection ring
        if (isSelected) {
          ctx.beginPath();
          ctx.arc(pos.cx, pos.cy, PLANET_RADIUS_DISPLAY + 4, 0, Math.PI * 2);
          ctx.strokeStyle = color;
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.stroke();
          ctx.setLineDash([]);
        }

        // Dead X
        if (isKilled) {
          ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
          ctx.lineWidth = 3;
          const s = PLANET_RADIUS_DISPLAY * 0.6;
          ctx.beginPath();
          ctx.moveTo(pos.cx - s, pos.cy - s);
          ctx.lineTo(pos.cx + s, pos.cy + s);
          ctx.moveTo(pos.cx + s, pos.cy - s);
          ctx.lineTo(pos.cx - s, pos.cy + s);
          ctx.stroke();
        }

        // Towers
        const N = node.active_towers;
        for (let i = 0; i < N; i++) {
          const angle = (2 * Math.PI * i) / N;
          const tx = pos.cx + (PLANET_RADIUS_DISPLAY - 3) * Math.sin(angle);
          const ty = pos.cy - (PLANET_RADIUS_DISPLAY - 3) * Math.cos(angle);
          ctx.fillStyle = color + 'bb';
          ctx.beginPath();
          ctx.arc(tx, ty, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Label
        ctx.fillStyle = isKilled ? '#888' : '#ccc';
        ctx.font = '600 12px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(node.id, pos.cx, pos.cy + PLANET_RADIUS_DISPLAY + 16);

        // Codex badge
        ctx.fillStyle = color + '99';
        ctx.font = '500 9px JetBrains Mono, monospace';
        ctx.fillText(`Base ${node.codex}`, pos.cx, pos.cy + PLANET_RADIUS_DISPLAY + 28);
      }

      // ── Signal Animation ──────────────────────────────────────────────
      if (animationData && animationData.route && animationData.route.length > 1) {
        const route = animationData.route;
        const hopCount = route.length - 1;
        const msPerHop = 2000; // 2 seconds per hop animation
        const elapsed = Date.now() - animationData.startTime;
        const totalDuration = hopCount * msPerHop;

        if (elapsed < totalDuration) {
          const currentHopFloat = elapsed / msPerHop;
          const currentHop = Math.floor(currentHopFloat);
          const hopProgress = currentHopFloat - currentHop;

          if (currentHop !== activeHop) {
            setActiveHop(currentHop);
          }

          if (currentHop < hopCount) {
            const srcNode = nodes.find(n => n.id === route[currentHop]);
            const dstNode = nodes.find(n => n.id === route[currentHop + 1]);
            if (srcNode && dstNode) {
              const p1 = toCanvas(srcNode, transform);
              const p2 = toCanvas(dstNode, transform);
              const color = PLANET_COLORS[srcNode.id] || '#8888ff';

              // Particle position
              const px = p1.cx + (p2.cx - p1.cx) * hopProgress;
              const py = p1.cy + (p2.cy - p1.cy) * hopProgress;

              // Comet tail
              const tailLen = 8;
              for (let t = 0; t < tailLen; t++) {
                const tp = Math.max(0, hopProgress - t * 0.015);
                const tx = p1.cx + (p2.cx - p1.cx) * tp;
                const ty = p1.cy + (p2.cy - p1.cy) * tp;
                const alpha = (1 - t / tailLen) * 0.6;
                const radius = (1 - t / tailLen) * 4 + 1;
                ctx.globalAlpha = alpha;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.arc(tx, ty, radius, 0, Math.PI * 2);
                ctx.fill();
              }

              // Main particle
              ctx.globalAlpha = 1;
              const particleGlow = ctx.createRadialGradient(px, py, 0, px, py, 12);
              particleGlow.addColorStop(0, color);
              particleGlow.addColorStop(0.5, color + '66');
              particleGlow.addColorStop(1, 'rgba(0,0,0,0)');
              ctx.fillStyle = particleGlow;
              ctx.beginPath();
              ctx.arc(px, py, 12, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = '#ffffffff';
              ctx.beginPath();
              ctx.arc(px, py, 3, 0, Math.PI * 2);
              ctx.fill();

              // Pulse effect on arrival planet
              if (hopProgress > 0.85) {
                const pulseAlpha = (hopProgress - 0.85) / 0.15 * 0.4;
                const pulseSize = PLANET_RADIUS_DISPLAY + (hopProgress - 0.85) / 0.15 * 15;
                ctx.globalAlpha = pulseAlpha;
                ctx.strokeStyle = PLANET_COLORS[dstNode.id] || '#8888ff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(p2.cx, p2.cy, pulseSize, 0, Math.PI * 2);
                ctx.stroke();
              }

              // Codex label near active planet
              if (animationData.hopLog && animationData.hopLog[currentHop]) {
                const hop = animationData.hopLog[currentHop];
                if (hop.payload_encoded) {
                  ctx.globalAlpha = Math.min(1, hopProgress * 3);
                  ctx.fillStyle = '#a78bfa';
                  ctx.font = '500 10px JetBrains Mono, monospace';
                  ctx.textAlign = 'left';
                  const label = `→ Base ${hop.payload_encoded.base}`;
                  ctx.fillText(label, p1.cx + PLANET_RADIUS_DISPLAY + 8, p1.cy - 5);
                }
              }

              ctx.globalAlpha = 1;
            }
          }
        } else {
          // Animation complete
          if (activeHop !== hopCount) {
            setActiveHop(hopCount);
          }
        }
      }

      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', resize);
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [universe, chaosState, animationData, selectedOrigin, selectedDestination, getTransform, toCanvas, activeHop, setActiveHop]);

  // Click handler
  const handleClick = useCallback((e) => {
    if (!universe) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;
    const transform = getTransform({ width: w, height: h }, universe.nodes);

    for (const node of universe.nodes) {
      const pos = toCanvas(node, transform);
      const dist = Math.sqrt((x - pos.cx) ** 2 + (y - pos.cy) ** 2);
      if (dist < PLANET_RADIUS_DISPLAY + 5) {
        onPlanetClick(node.id);
        return;
      }
    }
  }, [universe, getTransform, toCanvas, onPlanetClick]);

  // Hover handler
  const handleMouseMove = useCallback((e) => {
    if (!universe) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = rect.width;
    const h = rect.height;
    const transform = getTransform({ width: w, height: h }, universe.nodes);

    for (const node of universe.nodes) {
      const pos = toCanvas(node, transform);
      const dist = Math.sqrt((x - pos.cx) ** 2 + (y - pos.cy) ** 2);
      if (dist < PLANET_RADIUS_DISPLAY + 5) {
        setTooltip({
          x: e.clientX + 12,
          y: e.clientY - 10,
          node,
        });
        return;
      }
    }
    setTooltip(null);
  }, [universe, getTransform, toCanvas]);

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setTooltip(null)}
        style={{ cursor: 'pointer' }}
      />
      {tooltip && (
        <div
          className="canvas-tooltip"
          style={{ left: tooltip.x, top: tooltip.y, opacity: 1 }}
        >
          <div className="tip-name" style={{ color: PLANET_COLORS[tooltip.node.id] }}>
            {tooltip.node.id}
          </div>
          <div className="tip-row">
            <span className="tip-label">Codex</span>
            <span className="tip-value">Base {tooltip.node.codex}</span>
          </div>
          <div className="tip-row">
            <span className="tip-label">Radius</span>
            <span className="tip-value">{tooltip.node.radius_km.toLocaleString()} km</span>
          </div>
          <div className="tip-row">
            <span className="tip-label">Towers</span>
            <span className="tip-value">{tooltip.node.active_towers}</span>
          </div>
          <div className="tip-row">
            <span className="tip-label">Atmosphere</span>
            <span className="tip-value">{tooltip.node.atmosphere_thickness_km} km</span>
          </div>
          <div className="tip-row">
            <span className="tip-label">Refraction</span>
            <span className="tip-value">{tooltip.node.refraction_index}</span>
          </div>
        </div>
      )}
    </div>
  );
}
