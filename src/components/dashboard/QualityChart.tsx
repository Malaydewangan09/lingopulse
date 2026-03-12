'use client';
import { useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, Area, AreaChart, ReferenceLine,
} from 'recharts';
import type { QualityDataPoint, CoverageDataPoint } from '@/lib/types';
import SectionHeader from '@/components/dashboard/SectionHeader';

interface Props {
  qualityData: QualityDataPoint[];
  coverageData: CoverageDataPoint[];
}

const LOCALE_COLORS: Record<string, string> = {
  en:    '#00E5A0',
  es:    '#4B9EFF',
  fr:    '#FF6B35',
  de:    '#E6A817',
  ja:    '#C084FC',
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0D1117', border: '1px solid var(--border-bright)',
      borderRadius: 8, padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'DM Mono, monospace', marginBottom: 6 }}>{label}</div>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: entry.color }} />
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text-2)' }}>{entry.dataKey}</span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text-1)', marginLeft: 'auto' }}>
            {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const CoverageTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0D1117', border: '1px solid var(--border-bright)',
      borderRadius: 8, padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'DM Mono, monospace', marginBottom: 6 }}>{label}</div>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: entry.color }}>
            {entry.value.toFixed(1)}{entry.dataKey === 'coverage' ? '%' : ''}
          </span>
        </div>
      ))}
    </div>
  );
};

export default function QualityChart({ qualityData, coverageData }: Props) {
  const [tab, setTab] = useState<'quality' | 'coverage'>('coverage');

  const tabs = [
    { id: 'coverage', label: 'Coverage Trend' },
    { id: 'quality',  label: 'Quality Scores' },
  ] as const;

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      {/* Header */}
      <SectionHeader
        title="Trend Analysis"
        subtitle="30-day history"
        tooltip="Coverage Trend shows how your overall translation % has changed over time. Quality Scores shows AI-rated translation quality per locale (scored by Lingo.dev). A dip means a push added untranslated strings."
        right={
          <div style={{
            display: 'flex', background: 'var(--surface)', borderRadius: 8,
            border: '1px solid var(--border)', padding: 3, gap: 2,
          }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                padding: '4px 12px', borderRadius: 6, border: 'none',
                background: tab === t.id ? 'var(--card-hover)' : 'transparent',
                color: tab === t.id ? 'var(--text-1)' : 'var(--text-3)',
                fontSize: 11, fontFamily: 'DM Mono, monospace', cursor: 'pointer',
                borderBottom: tab === t.id ? '1px solid var(--border-bright)' : '1px solid transparent',
                transition: 'color 0.15s, background 0.15s',
              }}>
                {t.label}
              </button>
            ))}
          </div>
        }
      />

      {/* Chart */}
      <div style={{ padding: '20px 12px 12px' }}>
        {tab === 'coverage' ? (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={coverageData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="covGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#00E5A0" stopOpacity={0.18} />
                  <stop offset="95%" stopColor="#00E5A0" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 10, fontFamily: 'DM Mono, monospace' }}
                tickLine={false} axisLine={false}
                interval={Math.floor(coverageData.length / 6)}
              />
              <YAxis
                domain={[60, 100]} tickCount={5}
                tick={{ fill: 'var(--text-3)', fontSize: 10, fontFamily: 'DM Mono, monospace' }}
                tickLine={false} axisLine={false}
                tickFormatter={v => `${v}%`}
                width={38}
              />
              <Tooltip content={<CoverageTooltip />} />
              <ReferenceLine y={80} stroke="rgba(0,229,160,0.15)" strokeDasharray="4 4" label={{ value: 'target', fill: 'var(--text-3)', fontSize: 9, fontFamily: 'DM Mono, monospace' }} />
              <Area
                type="monotone" dataKey="coverage"
                stroke="#00E5A0" strokeWidth={2}
                fill="url(#covGrad)" dot={false} activeDot={{ r: 4, fill: '#00E5A0', strokeWidth: 0 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={qualityData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 10, fontFamily: 'DM Mono, monospace' }}
                tickLine={false} axisLine={false}
                interval={Math.floor(qualityData.length / 6)}
              />
              <YAxis
                domain={[5, 10.5]} tickCount={6}
                tick={{ fill: 'var(--text-3)', fontSize: 10, fontFamily: 'DM Mono, monospace' }}
                tickLine={false} axisLine={false} width={28}
              />
              <Tooltip content={<CustomTooltip />} />
              {Object.entries(LOCALE_COLORS).map(([locale, color]) => (
                <Line
                  key={locale} type="monotone" dataKey={locale}
                  stroke={color} strokeWidth={1.5} dot={false}
                  activeDot={{ r: 3, fill: color, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}

        {/* Quality legend */}
        {tab === 'quality' && (
          <div style={{ display: 'flex', gap: 14, padding: '6px 8px 0', flexWrap: 'wrap' }}>
            {Object.entries(LOCALE_COLORS).map(([locale, color]) => (
              <div key={locale} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 16, height: 2, background: color, borderRadius: 1 }} />
                <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>{locale}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
