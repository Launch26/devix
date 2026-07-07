import React from 'react';

// Planet radius formula
export function getPlanetRadius(radiusKm) {
  return Math.max(28, Math.min(70, Math.log10(radiusKm) * 14));
}

// Planet visual configs
const PLANET_STYLES = {
  Aegis: {
    base: '#1a4fa0',
    light: '#3B82F6',
    highlight: '#60a5fa',
    stripes: [
      { cy: 0.3, rx: 1, ry: 0.1, fill: '#2563eb', opacity: 0.5 },
      { cy: 0.6, rx: 0.9, ry: 0.08, fill: '#1d4ed8', opacity: 0.4 },
      { cy: -0.25, rx: 0.8, ry: 0.09, fill: '#60a5fa', opacity: 0.3 },
    ],
    type: 'ocean',
  },
  Boreas: {
    base: '#7f1d1d',
    light: '#EF4444',
    highlight: '#f87171',
    stripes: [
      { cx: 0.15, cy: -0.2, rx: 0.3, ry: 0.25, fill: '#991b1b', opacity: 0.7 },
      { cx: -0.2, cy: 0.3, rx: 0.25, ry: 0.2, fill: '#7f1d1d', opacity: 0.8 },
      { cx: 0.05, cy: 0.1, rx: 0.15, ry: 0.12, fill: '#450a0a', opacity: 0.6 },
    ],
    type: 'cratered',
  },
  Dawn: {
    base: '#92400e',
    light: '#F59E0B',
    highlight: '#fcd34d',
    stripes: [
      { cx: 0.1, cy: -0.1, rx: 0.35, ry: 0.3, fill: '#d97706', opacity: 0.5 },
      { cx: -0.15, cy: 0.2, rx: 0.2, ry: 0.18, fill: '#b45309', opacity: 0.6 },
    ],
    type: 'rocky',
  },
  Elysium: {
    base: '#064e3b',
    light: '#10B981',
    highlight: '#34d399',
    stripes: [
      { cy: 0.2, rx: 1, ry: 0.12, fill: '#059669', opacity: 0.5 },
      { cy: -0.1, rx: 0.95, ry: 0.1, fill: '#047857', opacity: 0.45 },
      { cy: 0.5, rx: 0.85, ry: 0.09, fill: '#10b981', opacity: 0.35 },
      { cy: -0.4, rx: 0.7, ry: 0.08, fill: '#34d399', opacity: 0.25 },
    ],
    type: 'swirl',
  },
  Fenix: {
    base: '#4c1d95',
    light: '#A78BFA',
    highlight: '#ddd6fe',
    stripes: [
      { cx: 0, cy: 0, rx: 0.6, ry: 0.6, fill: '#7c3aed', opacity: 0.4 },
      { cx: 0.1, cy: -0.1, rx: 0.4, ry: 0.4, fill: '#a78bfa', opacity: 0.3 },
    ],
    type: 'emissive',
  },
  Caelum: {
    base: '#7c2d12',
    light: '#F97316',
    highlight: '#fdba74',
    stripes: [
      { cy: -0.35, rx: 1, ry: 0.09, fill: '#fb923c', opacity: 0.55 },
      { cy: -0.15, rx: 1, ry: 0.08, fill: '#c2410c', opacity: 0.5 },
      { cy: 0.05, rx: 1, ry: 0.1, fill: '#ea580c', opacity: 0.55 },
      { cy: 0.25, rx: 1, ry: 0.08, fill: '#c2410c', opacity: 0.5 },
      { cy: 0.45, rx: 1, ry: 0.07, fill: '#fb923c', opacity: 0.45 },
    ],
    type: 'gas_giant',
    hasRing: true,
  },
};

export default function PlanetSVG({ name, radiusKm, cx = 0, cy = 0, isKilled = false }) {
  const R = getPlanetRadius(radiusKm);
  const style = PLANET_STYLES[name] || PLANET_STYLES['Aegis'];
  const id = `planet-${name}`;

  const baseColor = isKilled ? '#3a1515' : style.base;
  const lightColor = isKilled ? '#ef4444' : style.light;
  const highlightColor = isKilled ? '#f87171' : style.highlight;

  // Gradient offsets for light source top-left
  const gx1 = cx - R * 0.4;
  const gy1 = cy - R * 0.4;

  return (
    <g className={`planet-group planet-${name}`}>
      <defs>
        <radialGradient id={`${id}-grad`} cx="35%" cy="30%" r="65%" fx="30%" fy="25%">
          <stop offset="0%" stopColor={highlightColor} stopOpacity="0.9" />
          <stop offset="40%" stopColor={lightColor} stopOpacity="0.95" />
          <stop offset="80%" stopColor={baseColor} stopOpacity="1" />
          <stop offset="100%" stopColor={baseColor} stopOpacity="1" />
        </radialGradient>

        <radialGradient id={`${id}-vignette`} cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor="black" stopOpacity="0" />
          <stop offset="100%" stopColor="black" stopOpacity="0.5" />
        </radialGradient>

        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={lightColor} stopOpacity="0.15" />
          <stop offset="100%" stopColor={lightColor} stopOpacity="0" />
        </radialGradient>

        {style.type === 'emissive' && (
          <radialGradient id={`${id}-emissive`} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor={highlightColor} stopOpacity="0.5" />
            <stop offset="70%" stopColor={lightColor} stopOpacity="0.2" />
            <stop offset="100%" stopColor={lightColor} stopOpacity="0" />
          </radialGradient>
        )}

        <clipPath id={`${id}-clip`}>
          <circle cx={cx} cy={cy} r={R} />
        </clipPath>
      </defs>

      {/* Atmosphere glow */}
      <circle
        cx={cx}
        cy={cy}
        r={R + (style.type === 'emissive' ? 16 : 10)}
        fill={`url(#${id}-glow)`}
      />

      {/* Caelum ring (behind planet body) */}
      {style.hasRing && (
        <>
          <ellipse
            cx={cx}
            cy={cy + R * 0.15}
            rx={R * 1.8}
            ry={R * 0.3}
            fill="none"
            stroke={isKilled ? '#666' : '#fb923c'}
            strokeWidth="3"
            strokeOpacity="0.5"
          />
          <ellipse
            cx={cx}
            cy={cy + R * 0.15}
            rx={R * 1.5}
            ry={R * 0.22}
            fill="none"
            stroke={isKilled ? '#555' : '#fdba74'}
            strokeWidth="1.5"
            strokeOpacity="0.3"
          />
        </>
      )}

      {/* Planet base with radial gradient */}
      <circle cx={cx} cy={cy} r={R} fill={`url(#${id}-grad)`} />

      {/* Surface texture / stripes clipped to planet */}
      {!isKilled && (
        <g clipPath={`url(#${id}-clip)`}>
          {style.stripes.map((s, i) => {
            // For stripe-type planets (ocean, swirl, gas_giant): horizontal ellipses
            // For cratered/rocky: blob shapes
            const isStripe = ['ocean', 'swirl', 'gas_giant'].includes(style.type);
            if (isStripe) {
              return (
                <ellipse
                  key={i}
                  cx={cx + (s.cx || 0) * R}
                  cy={cy + s.cy * R}
                  rx={(s.rx || 1) * R}
                  ry={s.ry * R}
                  fill={s.fill}
                  opacity={s.opacity}
                />
              );
            } else {
              return (
                <ellipse
                  key={i}
                  cx={cx + s.cx * R}
                  cy={cy + s.cy * R}
                  rx={s.rx * R}
                  ry={s.ry * R}
                  fill={s.fill}
                  opacity={s.opacity}
                />
              );
            }
          })}

          {/* Emissive core glow */}
          {style.type === 'emissive' && (
            <circle cx={cx} cy={cy} r={R * 0.5} fill={`url(#${id}-emissive)`} opacity="0.8" />
          )}
        </g>
      )}

      {/* Vignette (edge darkening for depth) */}
      <circle cx={cx} cy={cy} r={R} fill={`url(#${id}-vignette)`} />

      {/* Highlight arc top-left */}
      {!isKilled && (
        <ellipse
          cx={cx - R * 0.2}
          cy={cy - R * 0.25}
          rx={R * 0.45}
          ry={R * 0.25}
          fill={highlightColor}
          opacity="0.18"
          transform={`rotate(-25, ${cx - R * 0.2}, ${cy - R * 0.25})`}
        />
      )}

      {/* Planet border */}
      <circle
        cx={cx}
        cy={cy}
        r={R}
        fill="none"
        stroke={isKilled ? 'rgba(239,68,68,0.6)' : lightColor + 'aa'}
        strokeWidth="1.5"
      />

      {/* Killed X */}
      {isKilled && (
        <>
          <line
            x1={cx - R * 0.5} y1={cy - R * 0.5}
            x2={cx + R * 0.5} y2={cy + R * 0.5}
            stroke="#ef4444" strokeWidth="3" strokeOpacity="0.8"
          />
          <line
            x1={cx + R * 0.5} y1={cy - R * 0.5}
            x2={cx - R * 0.5} y2={cy + R * 0.5}
            stroke="#ef4444" strokeWidth="3" strokeOpacity="0.8"
          />
        </>
      )}
    </g>
  );
}
