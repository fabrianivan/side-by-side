import React from 'react';

export interface TrendPoint {
  date: string;
  value: number;
}

/**
 * Grafik tren kecil (SVG murni, tanpa pustaka) dengan pita target opsional.
 * Small dependency-free SVG line chart with an optional target band and an accessible text summary.
 */
export const TrendChart: React.FC<{
  points: TrendPoint[];
  min: number;
  max: number;
  target?: { min: number; max: number };
  ariaLabel: string;
  formatValue?: (v: number) => string;
  referenceLine?: { value: number; label: string };
  locale: 'id' | 'en';
}> = ({ points, min, max, target, ariaLabel, formatValue = (v) => String(v), referenceLine, locale }) => {
  const W = 320;
  const H = 128;
  const padL = 30;
  const padR = 10;
  const padT = 10;
  const padB = 22;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const values = points.map((p) => p.value);
  const lo = Math.min(min, ...values, target?.min ?? Infinity, referenceLine?.value ?? Infinity);
  const hiRaw = Math.max(max, ...values, target?.max ?? -Infinity, referenceLine?.value ?? -Infinity);
  const hi = hiRaw === lo ? lo + 1 : hiRaw;

  const times = points.map((p) => new Date(`${p.date.slice(0, 10)}T00:00:00`).getTime());
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const x = (i: number) =>
    points.length <= 1 || tMax === tMin ? padL + innerW / 2 : padL + ((times[i] - tMin) / (tMax - tMin)) * innerW;
  const y = (v: number) => padT + innerH - ((v - lo) / (hi - lo)) * innerH;

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const fmtDate = (d: string) =>
    new Date(`${d.slice(0, 10)}T00:00:00`).toLocaleDateString(locale === 'en' ? 'en-GB' : 'id-ID', {
      day: 'numeric',
      month: 'short',
    });

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="w-full h-auto">
      {/* Sumbu & garis bantu */}
      <line x1={padL} y1={padT + innerH} x2={W - padR} y2={padT + innerH} className="stroke-brand-navy/15 dark:stroke-white/15" />
      <text x={padL - 6} y={y(hi) + 4} textAnchor="end" className="fill-brand-navy/55 dark:fill-white/55" fontSize="9">
        {formatValue(hi)}
      </text>
      <text x={padL - 6} y={y(lo) + 3} textAnchor="end" className="fill-brand-navy/55 dark:fill-white/55" fontSize="9">
        {formatValue(lo)}
      </text>

      {target && (
        <rect
          x={padL}
          width={innerW}
          y={y(Math.min(target.max, hi))}
          height={Math.max(2, y(Math.max(target.min, lo)) - y(Math.min(target.max, hi)))}
          className="fill-status-success/15"
        />
      )}
      {referenceLine && (
        <>
          <line
            x1={padL}
            x2={W - padR}
            y1={y(referenceLine.value)}
            y2={y(referenceLine.value)}
            strokeDasharray="4 3"
            className="stroke-status-warning"
          />
          <text x={W - padR} y={y(referenceLine.value) - 3} textAnchor="end" fontSize="8.5" className="fill-[#8A6100] dark:fill-[#F3C64D]">
            {referenceLine.label}
          </text>
        </>
      )}

      {points.length > 1 && <path d={path} fill="none" strokeWidth="2.25" strokeLinejoin="round" className="stroke-brand-teal" />}
      {points.map((p, i) => (
        <circle key={`${p.date}-${i}`} cx={x(i)} cy={y(p.value)} r="3.5" className="fill-brand-teal stroke-white dark:stroke-surface-dark-card" strokeWidth="1.5">
          <title>{`${fmtDate(p.date)}: ${formatValue(p.value)}`}</title>
        </circle>
      ))}

      {points.length > 0 && (
        <>
          <text x={x(0)} y={H - 6} textAnchor={points.length > 1 ? 'start' : 'middle'} fontSize="9" className="fill-brand-navy/55 dark:fill-white/55">
            {fmtDate(points[0].date)}
          </text>
          {points.length > 1 && (
            <text x={x(points.length - 1)} y={H - 6} textAnchor="end" fontSize="9" className="fill-brand-navy/55 dark:fill-white/55">
              {fmtDate(points[points.length - 1].date)}
            </text>
          )}
        </>
      )}
    </svg>
  );
};
