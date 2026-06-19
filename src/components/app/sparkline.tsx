'use client';

// Sparkline minimalista en SVG (sin dependencias). Para tendencias compactas
// como la evolución de una sensibilidad a lo largo de los cierres del día.
interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  /** Rango fijo opcional [min,max] para que varias sparklines sean comparables. */
  domain?: [number, number];
  color?: string;
}

export default function Sparkline({ values, width = 64, height = 20, className, domain, color = 'currentColor' }: SparklineProps) {
  if (!values || values.length < 2) {
    return <div style={{ width, height }} className={className} aria-hidden />;
  }
  const min = domain ? domain[0] : Math.min(...values);
  const max = domain ? domain[1] : Math.max(...values);
  const span = max - min || 1;
  const stepX = width / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / span) * height;
    return `${x.toFixed(1)},${Math.max(1, Math.min(height - 1, y)).toFixed(1)}`;
  }).join(' ');

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
