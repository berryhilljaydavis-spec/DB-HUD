interface BarChartProps {
  values: number[];
  label: string;
}

export function BarChart({ values, label }: BarChartProps) {
  const max = Math.max(1, ...values);
  return (
    <div className="barchart">
      <div className="bars">
        {values.map((value, index) => (
          <span
            key={`${label}-${index}`}
            className="bar"
            style={{ height: `${Math.max(4, (value / max) * 100)}%` }}
            title={`${value}`}
          />
        ))}
      </div>
      <p className="chart-label">{label}</p>
    </div>
  );
}

interface GaugeProps {
  value: number;
  max: number;
  label: string;
  unit?: string;
}

export function Gauge({ value, max, label, unit = '' }: GaugeProps) {
  const ratio = Math.min(1, max === 0 ? 0 : value / max);
  const circumference = 2 * Math.PI * 34;
  return (
    <div className="gauge">
      <svg viewBox="0 0 80 80" role="presentation">
        <circle className="gauge-track" cx="40" cy="40" r="34" />
        <circle
          className="gauge-value"
          cx="40"
          cy="40"
          r="34"
          strokeDasharray={`${ratio * circumference} ${circumference}`}
          transform="rotate(-90 40 40)"
        />
      </svg>
      <div className="gauge-readout">
        <b>
          {value}
          {unit}
        </b>
        <span>{label}</span>
      </div>
    </div>
  );
}
