'use client';
import { useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, Area, AreaChart, ReferenceLine,
} from 'recharts';
import type { CoverageDataPoint, QualityDataPoint } from '@/lib/types';
import SectionHeader from '@/components/dashboard/SectionHeader';

interface Props {
  qualityData: QualityDataPoint[];
  coverageData: CoverageDataPoint[];
}

const PALETTE = ['#4B9EFF', '#FF6B35', '#E6A817', '#C084FC', '#3FC87A', '#F05248'];

interface TooltipEntry {
  dataKey: string;
  color: string;
  value: number | string;
}

interface TooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

function getNumericSeriesKeys(data: QualityDataPoint[]) {
  const discovered = new Set<string>();
  for (const point of data) {
    for (const [key, value] of Object.entries(point)) {
      if (key !== 'date' && typeof value === 'number' && Number.isFinite(value)) {
        discovered.add(key);
      }
    }
  }

  const keys = [...discovered];
  const localeKeys = keys.filter(key => key !== 'overall').sort((a, b) => a.localeCompare(b));
  return keys.includes('overall') ? ['overall', ...localeKeys.slice(0, 5)] : localeKeys.slice(0, 6);
}

function buildSeriesColors(keys: string[]) {
  return keys.reduce<Record<string, string>>((acc, key, index) => {
    acc[key] = key === 'overall' ? '#00E5A0' : PALETTE[index % PALETTE.length];
    return acc;
  }, {});
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0D1117', border: '1px solid var(--border-bright)',
      borderRadius: 8, padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'DM Mono, monospace', marginBottom: 6 }}>{label}</div>
      {payload.map(entry => (
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

const CoverageTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#0D1117', border: '1px solid var(--border-bright)',
      borderRadius: 8, padding: '10px 14px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'DM Mono, monospace', marginBottom: 6 }}>{label}</div>
      {payload.map(entry => (
        <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: entry.color }}>
            {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}{entry.dataKey === 'coverage' ? '%' : ''}
          </span>
        </div>
      ))}
    </div>
  );
};

function EmptyTrendState() {
  return (
    <div
      style={{
        height: 220,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 8,
        borderRadius: 10,
        border: '1px dashed var(--border-bright)',
        background: 'linear-gradient(180deg, rgba(75,158,255,0.08) 0%, rgba(255,255,255,0.01) 100%)',
      }}
    >
      <div style={{ color: 'var(--text-1)', fontWeight: 600 }}>Trend data will appear after a few scans</div>
      <div style={{ color: 'var(--text-2)', fontSize: 12, maxWidth: 360, textAlign: 'center' }}>
        Run another analysis or wait for webhook activity to build a useful history line instead of a single snapshot.
      </div>
    </div>
  );
}

export default function QualityChart({ qualityData, coverageData }: Props) {
  const [tab, setTab] = useState<'quality' | 'coverage'>('coverage');
  const qualityKeys = getNumericSeriesKeys(qualityData);
  const colors = buildSeriesColors(qualityKeys);

  const tabs = [
    { id: 'coverage', label: 'Coverage Trend' },
    { id: 'quality', label: 'Quality Scores' },
  ] as const;

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <SectionHeader
        title="Trend Analysis"
        subtitle={`${coverageData.length || qualityData.length || 0}-run history`}
        tooltip="Coverage Trend shows how overall translation % changes over time. Quality Scores tracks the overall model score and, when available, per-locale quality signals."
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

      <div style={{ padding: '20px 12px 12px' }}>
        {tab === 'coverage' ? (
          coverageData.length <= 1 ? (
            <EmptyTrendState />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={coverageData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="covGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00E5A0" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#00E5A0" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--text-3)', fontSize: 10, fontFamily: 'DM Mono, monospace' }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.max(0, Math.floor(coverageData.length / 6))}
                />
                <YAxis
                  domain={[0, 100]}
                  tickCount={5}
                  tick={{ fill: 'var(--text-3)', fontSize: 10, fontFamily: 'DM Mono, monospace' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `${v}%`}
                  width={38}
                />
                <Tooltip content={<CoverageTooltip />} />
                <ReferenceLine y={80} stroke="rgba(0,229,160,0.15)" strokeDasharray="4 4" label={{ value: 'target', fill: 'var(--text-3)', fontSize: 9, fontFamily: 'DM Mono, monospace' }} />
                <Area
                  type="monotone"
                  dataKey="coverage"
                  stroke="#00E5A0"
                  strokeWidth={2}
                  fill="url(#covGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#00E5A0', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )
        ) : qualityData.length <= 1 || qualityKeys.length === 0 ? (
          <EmptyTrendState />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={qualityData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--text-3)', fontSize: 10, fontFamily: 'DM Mono, monospace' }}
                tickLine={false}
                axisLine={false}
                interval={Math.max(0, Math.floor(qualityData.length / 6))}
              />
              <YAxis
                domain={[5, 10.5]}
                tickCount={6}
                tick={{ fill: 'var(--text-3)', fontSize: 10, fontFamily: 'DM Mono, monospace' }}
                tickLine={false}
                axisLine={false}
                width={28}
              />
              <Tooltip content={<CustomTooltip />} />
              {qualityKeys.map(key => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={colors[key]}
                  strokeWidth={key === 'overall' ? 2.4 : 1.5}
                  dot={false}
                  strokeDasharray={key === 'overall' ? undefined : '5 4'}
                  activeDot={{ r: key === 'overall' ? 4 : 3, fill: colors[key], strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}

        {tab === 'quality' && qualityKeys.length > 0 && (
          <div style={{ display: 'flex', gap: 14, padding: '6px 8px 0', flexWrap: 'wrap' }}>
            {qualityKeys.map(key => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 16, height: 2, background: colors[key], borderRadius: 1 }} />
                <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>{key}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
