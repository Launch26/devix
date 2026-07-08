import { getPlanetRadius } from "./PlanetSVG";

interface Hop {
  planet_id: string;
  receiving_tower: number | null;
  sending_tower: number | null;
}

interface UniverseNode {
  id: string;
  codex: number;
  radius_km?: number;
  active_towers: number;
}

interface Universe {
  nodes: UniverseNode[];
}

interface MiniPlanetDiagramProps {
  hop: Hop;
  universe: Universe;
}

const PLANET_COLORS: Record<string, string> = {
  Aegis: "#3B82F6",
  Boreas: "#EF4444",
  Dawn: "#F59E0B",
  Elysium: "#10B981",
  Fenix: "#A78BFA",
  Caelum: "#F97316",
};

export default function MiniPlanetDiagram({
  hop,
  universe,
}: MiniPlanetDiagramProps) {
  if (!hop || !universe) return null;

  const planetId = hop.planet_id;

  const node = universe.nodes?.find(
    (n) => n.id === planetId
  );

  if (!node) return null;

  const SIZE = 120;
  const cx = SIZE / 2;
  const cy = SIZE / 2;

  // Use the helper if radius is available, otherwise fall back to 40.
  const R = node.radius_km
    ? getPlanetRadius(node.radius_km)
    : 40;

  const N = node.active_towers;

  const color =
    PLANET_COLORS[planetId] ?? "#8888ff";

  const entryTower = hop.receiving_tower;
  const exitTower = hop.sending_tower;

  const towers: {
    k: number;
    x: number;
    y: number;
    angle: number;
    isEntry: boolean;
    isExit: boolean;
  }[] = [];

  for (let k = 0; k < N; k++) {
    const angle =
      (k * (2 * Math.PI)) / N -
      Math.PI / 2;

    towers.push({
      k,
      x: cx + (R + 8) * Math.cos(angle),
      y: cy + (R + 8) * Math.sin(angle),
      angle,
      isEntry: k === entryTower,
      isExit:
        k === exitTower &&
        exitTower !== entryTower,
    });
  }

  let arcPath = "";

  if (
    entryTower !== null &&
    entryTower !== undefined &&
    exitTower !== null &&
    exitTower !== undefined &&
    entryTower !== exitTower
  ) {
    const cwDist =
      ((exitTower - entryTower) + N) % N;

    const ccwDist =
      ((entryTower - exitTower) + N) % N;

    const direction =
      cwDist <= ccwDist ? 1 : -1;

    let startAngle =
      (entryTower * (2 * Math.PI)) / N -
      Math.PI / 2;

    let endAngle =
      (exitTower * (2 * Math.PI)) / N -
      Math.PI / 2;

    if (
      direction === 1 &&
      endAngle < startAngle
    )
      endAngle += 2 * Math.PI;

    if (
      direction === -1 &&
      endAngle > startAngle
    )
      endAngle -= 2 * Math.PI;

    const arcR = R + 8;

    const x1 =
      cx + arcR * Math.cos(startAngle);

    const y1 =
      cy + arcR * Math.sin(startAngle);

    const x2 =
      cx + arcR * Math.cos(endAngle);

    const y2 =
      cy + arcR * Math.sin(endAngle);

    const largeArc =
      Math.abs(endAngle - startAngle) >
      Math.PI
        ? 1
        : 0;

    const sweepFlag =
      direction === 1 ? 1 : 0;

    arcPath = `M ${x1} ${y1} A ${arcR} ${arcR} 0 ${largeArc} ${sweepFlag} ${x2} ${y2}`;
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "#9d97b5",
          textTransform: "uppercase",
          letterSpacing: 1,
        }}
      >
        Inside {planetId} (Base {node.codex})
      </div>

      <svg
        width={SIZE}
        height={SIZE}
        style={{ overflow: "visible" }}
      >
        <circle
          cx={cx}
          cy={cy}
          r={R}
          fill={`${color}22`}
          stroke={`${color}66`}
          strokeWidth={1.5}
        />

        <circle
          cx={cx}
          cy={cy}
          r={R}
          fill="none"
          stroke={`${color}44`}
          strokeWidth={0.5}
        />

        {arcPath && (
          <path
            d={arcPath}
            fill="none"
            stroke="#00d4ff"
            strokeWidth={1.5}
            strokeDasharray="4 3"
            opacity={0.8}
          />
        )}

        {towers.map((t) => (
          <g key={t.k}>
            <circle
              cx={t.x}
              cy={t.y}
              r={
                t.isEntry
                  ? 5
                  : t.isExit
                  ? 5
                  : 3
              }
              fill={
                t.isEntry
                  ? "#10b981"
                  : t.isExit
                  ? "#ef4444"
                  : "#8B7355"
              }
              stroke="white"
              strokeWidth={0.5}
            />

            <text
              x={
                t.x +
                ((t.x - cx) / R) * 8
              }
              y={
                t.y +
                ((t.y - cy) / R) * 8
              }
              textAnchor="middle"
              dominantBaseline="middle"
              fill={
                t.isEntry
                  ? "#10b981"
                  : t.isExit
                  ? "#ef4444"
                  : "#6b6b8a"
              }
              fontSize={5}
              fontFamily="JetBrains Mono, monospace"
            >
              T{t.k}
            </text>
          </g>
        ))}
      </svg>

      <div
        style={{
          fontSize: 10,
          color: "#6b6b8a",
          textAlign: "center",
          fontFamily:
            "JetBrains Mono, monospace",
        }}
      >
        {entryTower !== null &&
          entryTower !== undefined && (
            <span
              style={{
                color: "#10b981",
              }}
            >
              Entry: T{entryTower}{" "}
            </span>
          )}

        {exitTower !== null &&
          exitTower !== undefined && (
            <span
              style={{
                color: "#ef4444",
              }}
            >
              Exit: T{exitTower}
            </span>
          )}
      </div>
    </div>
  );
}