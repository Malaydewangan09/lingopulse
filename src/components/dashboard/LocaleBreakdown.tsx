'use client';
import { useState } from 'react';
import { coverageTextColor, qualityColor } from '@/lib/utils';
import type { LocaleStats } from '@/lib/types';
import { TrendingUp, TrendingDown } from 'lucide-react';
import SectionHeader from '@/components/dashboard/SectionHeader';

interface Props { locales: LocaleStats[]; }

type SortKey = 'coverage' | 'quality' | 'missing';

export default function LocaleBreakdown({ locales }: Props) {
  const [sort, setSort] = useState<SortKey>('coverage');
  const [showAll, setShowAll] = useState(false);

  const sorted = [...locales].sort((a, b) => {
    if (sort === 'coverage') return b.coverage - a.coverage;
    if (sort === 'quality')  return b.qualityScore - a.qualityScore;
    return b.missingKeys - a.missingKeys;
  });

  const visible = showAll ? sorted : sorted.slice(0, 8);

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      {/* Header */}
      <SectionHeader
        title="Locale Health"
        subtitle={`${locales.length} locales tracked`}
        tooltip="Each locale's health at a glance. Coverage bar = % of source keys translated. Q: = Lingo.dev quality score (1-10). Sort by 'missing' to find where to focus next."
        right={
          <div style={{ display: 'flex', gap: 4 }}>
            {(['coverage', 'quality', 'missing'] as SortKey[]).map(s => (
              <button key={s} onClick={() => setSort(s)} style={{
                padding: '3px 8px', borderRadius: 5, border: '1px solid',
                borderColor: sort === s ? 'var(--accent-glow)' : 'var(--border)',
                background: sort === s ? 'var(--accent-dim)' : 'transparent',
                color: sort === s ? 'var(--accent)' : 'var(--text-3)',
                fontSize: 10, fontFamily: 'DM Mono, monospace', cursor: 'pointer',
                transition: 'all 0.15s',
              }}>
                {s}
              </button>
            ))}
          </div>
        }
      />

      {/* Locale list */}
      <div style={{ padding: '8px 0' }}>
        {visible.length === 0 ? (
          <div style={{ padding: '24px 16px', color: 'var(--text-2)', fontSize: 12, textAlign: 'center' }}>
            Locale metrics will appear here once the first analysis completes.
          </div>
        ) : (
          visible.map((locale, i) => (
            <div
              key={locale.locale}
              style={{
                padding: '10px 16px',
                borderBottom: i < visible.length - 1 ? '1px solid rgba(28,43,58,0.5)' : 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.015)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>{locale.flag}</span>
                <span style={{ fontSize: 12, color: 'var(--text-1)', flex: 1 }}>{locale.name}</span>
                {locale.isSourceLocale && <span className="tag tag-neutral">source</span>}
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--text-3)' }}>
                  {locale.locale}
                </span>

                {locale.trend !== 0 && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 2,
                    fontSize: 10, fontFamily: 'DM Mono, monospace',
                    color: locale.trend > 0 ? 'var(--success)' : 'var(--danger)',
                  }}>
                    {locale.trend > 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                    {Math.abs(locale.trend).toFixed(1)}%
                  </div>
                )}
              </div>

              <div style={{ position: 'relative', height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{
                  position: 'absolute', left: 0, top: 0, height: '100%',
                  width: `${locale.coverage}%`,
                  background: locale.coverage >= 88
                    ? 'linear-gradient(90deg, #1A5C38, var(--accent))'
                    : locale.coverage >= 60
                    ? 'linear-gradient(90deg, #5C4500, var(--warning))'
                    : 'linear-gradient(90deg, #5C1A1A, var(--danger))',
                  borderRadius: 3,
                  animation: 'barFill 0.8s cubic-bezier(0.16,1,0.3,1) both',
                  animationDelay: `${i * 0.05}s`,
                  transition: 'width 0.3s',
                }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 5 }}>
                <span style={{
                  fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 500,
                  color: coverageTextColor(locale.coverage),
                }}>
                  {locale.coverage.toFixed(1)}%
                </span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {locale.missingKeys > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
                      {locale.missingKeys} missing
                    </span>
                  )}
                  <span style={{
                    fontSize: 10, fontFamily: 'DM Mono, monospace',
                    color: qualityColor(locale.qualityScore),
                  }}>
                    Q:{locale.qualityScore.toFixed(1)}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
                    {locale.lastUpdated}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Show more */}
      {locales.length > 8 && (
        <button
          onClick={() => setShowAll(v => !v)}
          style={{
            width: '100%', padding: '10px', border: 'none',
            borderTop: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-3)',
            fontSize: 11, fontFamily: 'DM Mono, monospace', cursor: 'pointer',
            transition: 'color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.background = 'var(--accent-dim)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'transparent'; }}
        >
          {showAll ? '↑ show less' : `↓ show ${locales.length - 8} more`}
        </button>
      )}
    </div>
  );
}
