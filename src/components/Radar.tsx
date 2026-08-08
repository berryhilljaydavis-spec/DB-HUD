interface RadarProps {
  /** Normalised blips: angle in degrees, distance 0-1, label. */
  blips: { angle: number; distance: number; label: string }[];
}

export function Radar({ blips }: RadarProps) {
  return (
    <div className="radar">
      <svg viewBox="0 0 200 200" role="presentation">
        <circle className="radar-face" cx="100" cy="100" r="92" />
        {[30, 55, 80].map((r) => (
          <circle key={r} className="radar-ring" cx="100" cy="100" r={r} />
        ))}
        <line className="radar-cross" x1="8" y1="100" x2="192" y2="100" />
        <line className="radar-cross" x1="100" y1="8" x2="100" y2="192" />
        <g className="radar-sweep">
          <path d="M100 100 L100 8 A92 92 0 0 1 165 35 Z" />
        </g>
        {blips.map((blip) => {
          const angle = (blip.angle * Math.PI) / 180 - Math.PI / 2;
          const radius = 18 + blip.distance * 70;
          return (
            <circle
              key={blip.label}
              className="radar-blip"
              cx={100 + Math.cos(angle) * radius}
              cy={100 + Math.sin(angle) * radius}
              r={3.2}
            />
          );
        })}
      </svg>
      <ul className="radar-legend">
        {blips.slice(0, 5).map((blip) => (
          <li key={blip.label}>{blip.label}</li>
        ))}
      </ul>
    </div>
  );
}
