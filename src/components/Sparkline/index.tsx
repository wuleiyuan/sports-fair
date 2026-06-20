import React from 'react';

export interface SparklinePoint {
  date: string;
  value: number;
}

interface Props {
  data: SparklinePoint[];
  color?: string;
  height?: number;
  label?: string;
  showMinMax?: boolean;
  className?: string;
}

const Sparkline: React.FC<Props> = ({
  data,
  color = '#CCFF00',
  height = 40,
  label,
  showMinMax = false,
  className,
}) => {
  if (!data || data.length < 2) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'ui-monospace, monospace', fontSize: 11, color: '#6b6b6b' }}>—</span>
      </div>
    );
  }

  const values = data.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const padding = range * 0.1;
  const yMin = min - padding;
  const yMax = max + padding;
  const yRange = yMax - yMin || 1;

  const widthPerPoint = 100 / (data.length - 1);
  const points = data.map((p, i) => {
    const x = i * widthPerPoint;
    const y = ((yMax - p.value) / yRange) * 100;
    return `${x},${y}`;
  });

  const pathD = `M${points.join(' L')}`;
  const fillPathD = `${pathD} L${(data.length - 1) * widthPerPoint},100 L0,100 Z`;

  const minIdx = values.indexOf(min);
  const maxIdx = values.indexOf(max);
  const minX = minIdx * widthPerPoint;
  const maxX = maxIdx * widthPerPoint;
  const minY = ((yMax - min) / yRange) * 100;
  const maxY = ((yMax - max) / yRange) * 100;

  return (
    <div className={className}>
      {label && (
        <div style={{ fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', color: '#6b6b6b', marginBottom: 6 }}>
          {label}
        </div>
      )}
      <svg
        viewBox={`0 0 ${(data.length - 1) * widthPerPoint} 100`}
        preserveAspectRatio="none"
        style={{ display: 'block', width: '100%', height }}
      >
        <defs>
          <linearGradient id={`spark-fill-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.2} />
            <stop offset="100%" stopColor={color} stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <path
          d={fillPathD}
          fill={`url(#spark-fill-${color.replace('#', '')})`}
        />
        <path
          d={pathD}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {showMinMax && (
          <>
            <circle cx={minX} cy={minY} r={3} fill={color} opacity={0.8} />
            <circle cx={maxX} cy={maxY} r={3} fill={color} opacity={0.8} />
          </>
        )}
      </svg>
    </div>
  );
};

export default Sparkline;
