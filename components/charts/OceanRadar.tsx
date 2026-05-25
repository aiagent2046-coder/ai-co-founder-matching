type OceanScores = {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
};

const TRAITS = [
  { key: 'openness',         label: 'O', full: 'Openness' },
  { key: 'conscientiousness',label: 'C', full: 'Conscient.' },
  { key: 'extraversion',     label: 'E', full: 'Extraversion' },
  { key: 'agreeableness',    label: 'A', full: 'Agreeable.' },
  { key: 'neuroticism',      label: 'N', full: 'Neuroticism' },
] as const;

export function OceanRadar({
  scores,
  size = 200,
  color = '#00d4aa',
  showLabels = true,
}: {
  scores: OceanScores;
  size?: number;
  color?: string;
  showLabels?: boolean;
}) {
  const center = size / 2;
  const radius = size * 0.4;

  // 5 axis points
  const points = TRAITS.map((t, i) => {
    const angle = (i * 2 * Math.PI / 5) - Math.PI / 2; // start from top
    const score = (scores[t.key] ?? 0) / 100;
    return {
      ...t,
      angle,
      // Axis end point
      ax: center + Math.cos(angle) * radius,
      ay: center + Math.sin(angle) * radius,
      // Score point
      sx: center + Math.cos(angle) * radius * score,
      sy: center + Math.sin(angle) * radius * score,
      // Label point
      lx: center + Math.cos(angle) * (radius + 14),
      ly: center + Math.sin(angle) * (radius + 14),
    };
  });

  const polygon = points.map(p => `${p.sx},${p.sy}`).join(' ');

  // Grid rings (25%, 50%, 75%, 100%)
  const rings = [0.25, 0.5, 0.75, 1];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{display:'block'}}>
      {/* Grid rings */}
      {rings.map((r, i) => (
        <polygon
          key={i}
          points={TRAITS.map((_, j) => {
            const angle = (j * 2 * Math.PI / 5) - Math.PI / 2;
            return `${center + Math.cos(angle) * radius * r},${center + Math.sin(angle) * radius * r}`;
          }).join(' ')}
          fill="none"
          stroke="#374151"
          strokeWidth="0.5"
          opacity={0.6}
        />
      ))}
      {/* Axis lines */}
      {points.map((p, i) => (
        <line key={i} x1={center} y1={center} x2={p.ax} y2={p.ay} stroke="#374151" strokeWidth="0.5" opacity={0.6}/>
      ))}
      {/* Score polygon */}
      <polygon
        points={polygon}
        fill={color}
        fillOpacity={0.2}
        stroke={color}
        strokeWidth="2"
        style={{filter:`drop-shadow(0 0 8px ${color}40)`}}
      />
      {/* Score points */}
      {points.map((p, i) => (
        <circle key={i} cx={p.sx} cy={p.sy} r="3" fill={color} />
      ))}
      {/* Labels */}
      {showLabels && points.map((p, i) => (
        <text
          key={i}
          x={p.lx}
          y={p.ly}
          fontSize="10"
          fontWeight="600"
          fill="#9ca3af"
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="Space Grotesk,sans-serif"
        >{p.label}</text>
      ))}
    </svg>
  );
}
