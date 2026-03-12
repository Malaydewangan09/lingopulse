'use client';
import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Tooltip from '@/components/ui/Tooltip';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  trend?: number;
  trendLabel?: string;
  sublabel?: string;
  accent?: boolean;
  danger?: boolean;
  warning?: boolean;
  icon?: React.ReactNode;
  delay?: number;
  tooltip?: React.ReactNode;
}

export default function MetricCard({
  label, value, unit, trend, trendLabel, sublabel,
  accent, danger, warning, icon, delay = 0, tooltip,
}: MetricCardProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  const accentColor = accent ? 'var(--accent)' : danger ? 'var(--danger)' : warning ? 'var(--warning)' : 'var(--blue)';
  const trendUp = trend !== undefined && trend > 0;
  const trendDown = trend !== undefined && trend < 0;

  return (
    <div
      style={{
        background: 'var(--card)',
        border: `1px solid ${accent ? 'rgba(0,229,160,0.2)' : 'var(--border)'}`,
        borderRadius: 12,
        padding: '18px 20px',
        display: 'flex', flexDirection: 'column', gap: 10,
        position: 'relative', overflow: 'hidden',
        transition: 'border-color 0.2s, background 0.2s, transform 0.2s',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(12px)',
        transitionProperty: 'opacity, transform, border-color, background',
        transitionDuration: '0.4s',
        transitionTimingFunction: 'cubic-bezier(0.16,1,0.3,1)',
        cursor: 'default',
        boxShadow: accent ? '0 0 0 1px rgba(0,229,160,0.08), inset 0 0 40px rgba(0,229,160,0.03)' : 'none',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = accent ? 'rgba(0,229,160,0.4)' : 'var(--border-bright)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = accent ? 'rgba(0,229,160,0.2)' : 'var(--border)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Top glow line */}
      <div style={{
        position: 'absolute', top: 0, left: '15%', right: '15%', height: 1,
        background: `linear-gradient(90deg, transparent, ${accentColor}40, transparent)`,
      }} />

      {/* Label row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {label}
          </span>
          {tooltip && <Tooltip content={tooltip} />}
        </div>
        {icon && (
          <div style={{ color: accentColor, opacity: 0.7 }}>{icon}</div>
        )}
      </div>

      {/* Value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
        <span style={{
          fontFamily: 'DM Mono, monospace',
          fontSize: 32, fontWeight: 500,
          color: accent ? 'var(--accent)' : danger ? 'var(--danger)' : warning ? 'var(--warning)' : 'var(--text-1)',
          lineHeight: 1, letterSpacing: '-0.03em',
        }}>
          {value}
        </span>
        {unit && (
          <span style={{ fontSize: 14, color: 'var(--text-2)', fontFamily: 'DM Mono, monospace' }}>{unit}</span>
        )}
      </div>

      {/* Sublabel + trend */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 }}>
        {sublabel && (
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>{sublabel}</span>
        )}
        {trend !== undefined && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 3,
            fontSize: 11, fontFamily: 'DM Mono, monospace',
            color: trendUp ? 'var(--success)' : trendDown ? 'var(--danger)' : 'var(--text-3)',
          }}>
            {trendUp ? <TrendingUp size={11} /> : trendDown ? <TrendingDown size={11} /> : <Minus size={11} />}
            {trendLabel ?? (trend > 0 ? `+${trend.toFixed(1)}%` : trend < 0 ? `${trend.toFixed(1)}%` : 'no change')}
          </div>
        )}
      </div>
    </div>
  );
}
