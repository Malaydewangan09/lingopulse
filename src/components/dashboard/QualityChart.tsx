'use client';
import { useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, Area, AreaChart, ReferenceLine,
} from 'recharts';
import type { CoverageDataPoint, LocaleStats, QualityDataPoint } from '@/lib/types';
import SectionHeader from '@/components/dashboard/SectionHeader';

interface Props {
  qualityData: QualityDataPoint[];
  coverageData: CoverageDataPoint[];
  locales: LocaleStats[];
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
    acc[key] = key === 'overall' ? 'var(--accent)' : PALETTE[index % PALETTE.length];
    return acc;
  }, {});
}

const CustomTooltip = ({ active, payload, label }: TooltipProps) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border-bright)',
      borderRadius: 8, padding: '10px 14px',
      boxShadow: '0 6px 18px rgba(0,0,0,0.28)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>{label}</div>
      {payload.map(entry => (
        <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: entry.color }} />
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)' }}>{entry.dataKey}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-1)', marginLeft: 'auto' }}>
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
      background: 'var(--surface)', border: '1px solid var(--border-bright)',
      borderRadius: 8, padding: '10px 14px',
      boxShadow: '0 6px 18px rgba(0,0,0,0.28)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', marginBottom: 6 }}>{label}</div>
      {payload.map(entry => (
        <div key={entry.dataKey} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: entry.color }}>
            {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}{entry.dataKey === 'coverage' ? '%' : ''}
          </span>
        </div>
      ))}
    </div>
  );
};

function SnapshotMetric({
  label,
  value,
  tone = 'var(--text-1)',
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  return (
    <div style={{
      borderRadius: 10,
      border: '1px solid var(--border)',
      background: 'var(--surface)',
      padding: 14,
    }}>
      <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 8 }}>
        {label}
      </div>
      <div style={{ fontSize: 22, color: tone, fontWeight: 600, lineHeight: 1.1 }}>
        {value}
      </div>
    </div>
  );
}

function EmptyTrendState({
  tab,
  coveragePoint,
  qualityPoint,
  locales,
}: {
  tab: 'quality' | 'coverage';
  coveragePoint?: CoverageDataPoint;
  qualityPoint?: QualityDataPoint;
  locales: LocaleStats[];
}) {
  const weakestCoverage = [...locales]
    .filter(locale => !locale.isSourceLocale)
    .sort((a, b) => b.missingKeys - a.missingKeys)
    .slice(0, 3);

  const lowestQuality = [...locales]
    .filter(locale => !locale.isSourceLocale)
    .sort((a, b) => a.qualityScore - b.qualityScore)
    .slice(0, 3);

  return (
    <div
      style={{
        minHeight: 220,
        display: 'grid',
        gap: 14,
        borderRadius: 10,
        border: '1px dashed var(--border-bright)',
        background: 'var(--surface)',
        padding: 16,
      }}
    >
      <div>
        <div style={{ color: 'var(--text-1)', fontWeight: 600, marginBottom: 4 }}>Current baseline snapshot</div>
        <div style={{ color: 'var(--text-2)', fontSize: 12 }}>
          One scan is enough to show the current state. Run one more analysis to unlock the trend line.
        </div>
      </div>

      {tab === 'coverage' ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
            <SnapshotMetric label="overall coverage" value={`${coveragePoint?.coverage.toFixed(1) ?? '0.0'}%`} tone="var(--accent)" />
            <SnapshotMetric label="missing keys" value={`${coveragePoint?.missingKeys ?? 0}`} tone={coveragePoint && coveragePoint.missingKeys > 0 ? 'var(--danger)' : 'var(--success)'} />
            <SnapshotMetric label="tracked locales" value={`${locales.length}`} />
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>focus locales right now</div>
            {weakestCoverage.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>More locale detail will appear after the next scan.</div>
            ) : weakestCoverage.map(locale => (
              <div key={locale.locale} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--text-1)' }}>
                  {locale.flag} {locale.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                  {locale.missingKeys} missing · {locale.coverage.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
            <SnapshotMetric label="overall quality" value={`${typeof qualityPoint?.overall === 'number' ? qualityPoint.overall.toFixed(1) : '0.0'}/10`} tone="var(--blue)" />
            <SnapshotMetric label="quality-tracked locales" value={`${locales.filter(locale => !locale.isSourceLocale).length}`} />
            <SnapshotMetric label="lowest score" value={lowestQuality[0] ? `${lowestQuality[0].qualityScore.toFixed(1)}/10` : '—'} tone={lowestQuality[0] && lowestQuality[0].qualityScore < 7 ? 'var(--danger)' : 'var(--text-1)'} />
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>review copy in</div>
            {lowestQuality.length === 0 ? (
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Quality scoring will deepen after more scans.</div>
            ) : lowestQuality.map(locale => (
              <div key={locale.locale} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div style={{ fontSize: 12, color: 'var(--text-1)' }}>
                  {locale.flag} {locale.name}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                  Q:{locale.qualityScore.toFixed(1)} · {locale.missingKeys} missing
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function QualityChart({ qualityData, coverageData, locales }: Props) {
  const [tab, setTab] = useState<'quality' | 'coverage'>('coverage');
  const qualityKeys = getNumericSeriesKeys(qualityData);
  const colors = buildSeriesColors(qualityKeys);
  const historyCount = coverageData.length || qualityData.length || 0;

  const tabs = [
    { id: 'coverage', label: 'Coverage Trend' },
    { id: 'quality', label: 'Quality Scores' },
  ] as const;

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <SectionHeader
        title="Trend Analysis"
        subtitle={historyCount <= 1 ? 'single baseline captured' : `${historyCount}-run history`}
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
                fontSize: 11, fontFamily: 'var(--font-mono)', cursor: 'pointer',
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
            <EmptyTrendState
              tab="coverage"
              coveragePoint={coverageData[0]}
              qualityPoint={qualityData[0]}
              locales={locales}
            />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={coverageData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="covGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="var(--accent)" stopOpacity={0.01} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--text-3)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                  tickLine={false}
                  axisLine={false}
                  interval={Math.max(0, Math.floor(coverageData.length / 6))}
                />
                <YAxis
                  domain={[0, 100]}
                  tickCount={5}
                  tick={{ fill: 'var(--text-3)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={v => `${v}%`}
                  width={38}
                />
                <Tooltip content={<CoverageTooltip />} />
                <ReferenceLine y={80} stroke="rgba(118,208,175,0.16)" strokeDasharray="4 4" label={{ value: 'target', fill: 'var(--text-3)', fontSize: 9, fontFamily: 'var(--font-mono)' }} />
                <Area
                  type="monotone"
                  dataKey="coverage"
                  stroke="var(--accent)"
                  strokeWidth={2}
                  fill="url(#covGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: 'var(--accent)', strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )
        ) : qualityData.length <= 1 || qualityKeys.length === 0 ? (
          <EmptyTrendState
            tab="quality"
            coveragePoint={coverageData[0]}
            qualityPoint={qualityData[0]}
            locales={locales}
          />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={qualityData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: 'var(--text-3)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
                tickLine={false}
                axisLine={false}
                interval={Math.max(0, Math.floor(qualityData.length / 6))}
              />
              <YAxis
                domain={[5, 10.5]}
                tickCount={6}
                tick={{ fill: 'var(--text-3)', fontSize: 10, fontFamily: 'var(--font-mono)' }}
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
                <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{key}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
