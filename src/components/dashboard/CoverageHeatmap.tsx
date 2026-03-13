'use client';
import { useState } from 'react';
import { coverageColor, coverageLabel } from '@/lib/utils';
import type { FileLocaleCell, LocaleStats } from '@/lib/types';
import SectionHeader from '@/components/dashboard/SectionHeader';

interface Props {
  data: FileLocaleCell[];
  locales?: LocaleStats[];
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  locale: string;
  file: string;
  coverage: number;
  missing: number;
  total: number;
}

interface ModuleSummary {
  name: string;
  missingKeys: number;
  averageCoverage: number;
}

function buildModuleSummary(data: FileLocaleCell[]): ModuleSummary[] {
  const moduleMap = new Map<string, { missingKeys: number; coverageSum: number; cells: number }>();

  for (const cell of data) {
    const existing = moduleMap.get(cell.file) ?? { missingKeys: 0, coverageSum: 0, cells: 0 };
    existing.missingKeys += cell.missingKeys;
    existing.coverageSum += cell.coverage;
    existing.cells += 1;
    moduleMap.set(cell.file, existing);
  }

  return [...moduleMap.entries()]
    .map(([name, stats]) => ({
      name,
      missingKeys: stats.missingKeys,
      averageCoverage: stats.cells > 0 ? stats.coverageSum / stats.cells : 0,
    }))
    .sort((a, b) => {
      if (b.missingKeys !== a.missingKeys) return b.missingKeys - a.missingKeys;
      if (a.averageCoverage !== b.averageCoverage) return a.averageCoverage - b.averageCoverage;
      return a.name.localeCompare(b.name);
    });
}

export default function CoverageHeatmap({ data, locales = [] }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    locale: '',
    file: '',
    coverage: 0,
    missing: 0,
    total: 0,
  });

  const cellMap = new Map<string, FileLocaleCell>();
  for (const cell of data) {
    cellMap.set(`${cell.locale}:${cell.file}`, cell);
  }

  const moduleSummary = buildModuleSummary(data);
  const modules = moduleSummary.map(module => module.name);

  const localeRows: LocaleStats[] = locales.length > 0
    ? locales
    : [...new Set(data.map(cell => cell.locale))]
        .sort((a, b) => a.localeCompare(b))
        .map(locale => ({
          locale,
          flag: '🌐',
          name: locale,
          coverage: 0,
          qualityScore: 0,
          missingKeys: 0,
          totalKeys: 0,
          translatedKeys: 0,
          lastUpdated: '—',
          trend: 0,
        }));

  const CELL_W = 52;
  const CELL_H = 28;
  const LABEL_W = 126;

  const handleMouseEnter = (e: React.MouseEvent, cell: FileLocaleCell) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({
      visible: true,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
      locale: cell.locale,
      file: cell.file,
      coverage: cell.coverage,
      missing: cell.missingKeys,
      total: cell.totalKeys,
    });
  };

  const emptyState = localeRows.length === 0 || modules.length === 0;

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <SectionHeader
        title="Coverage Heatmap"
        subtitle={
          emptyState
            ? `${localeRows.length} locales tracked · module grid unavailable`
            : `${localeRows.length} locales × ${modules.length} modules`
        }
        tooltip="Each cell shows how many keys in that module have been translated for that locale. Green = fully translated, red = mostly missing. Hover any cell for exact stats."
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {[
              { label: '0%', color: '#5C1A1A' },
              { label: '60%', color: '#5C4500' },
              { label: '88%', color: '#1A5C38' },
              { label: '100%', color: 'rgba(0,229,160,0.3)' },
            ].map(({ label, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: color, border: '1px solid rgba(255,255,255,0.06)' }} />
                <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>{label}</span>
              </div>
            ))}
          </div>
        }
      />

      {moduleSummary.length > 0 && (
        <div
          style={{
            padding: '12px 20px 0',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: 10,
          }}
        >
          {moduleSummary.slice(0, 3).map(module => {
            const tone = module.averageCoverage >= 88
              ? { color: 'var(--success)', border: 'rgba(63,200,122,0.24)', bg: 'rgba(63,200,122,0.08)' }
              : module.averageCoverage >= 60
              ? { color: 'var(--warning)', border: 'rgba(230,168,23,0.24)', bg: 'rgba(230,168,23,0.08)' }
              : { color: 'var(--danger)', border: 'rgba(240,82,72,0.24)', bg: 'rgba(240,82,72,0.08)' };

            return (
              <div
                key={module.name}
                style={{
                  minWidth: 0,
                  borderRadius: 10,
                  border: `1px solid ${tone.border}`,
                  background: tone.bg,
                  padding: '10px 12px',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
                }}
              >
                <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  hotspot module
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 10, marginBottom: 6 }}>
                  <span style={{ minWidth: 0, fontSize: 14, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {module.name}
                  </span>
                  <span style={{ flexShrink: 0, fontSize: 12, fontFamily: 'DM Mono, monospace', color: tone.color }}>
                    {module.missingKeys} missing
                  </span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
                  {module.averageCoverage.toFixed(1)}% average coverage
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ padding: '16px 20px', overflowX: 'auto' }}>
        {emptyState ? (
          <div
            style={{
              borderRadius: 12,
              border: '1px dashed var(--border-bright)',
              background: 'linear-gradient(180deg, rgba(75,158,255,0.08) 0%, rgba(255,255,255,0.01) 100%)',
              padding: 18,
              minHeight: 190,
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
              No comparable module matrix yet
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', maxWidth: 560 }}>
              Locale totals were found, but we could not build a file-by-file comparison for this scan. This usually happens when the repo only exposes aggregate locale files or the source/target files do not map cleanly by module.
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
              Try a fresh scan after pointing the repo at per-module locale files such as `common/en.json`, `auth/fr.yaml`, or similar grouped paths.
            </div>
          </div>
        ) : (
          <div style={{ minWidth: LABEL_W + modules.length * (CELL_W + 4), position: 'relative' }}>
            <div style={{ display: 'flex', marginLeft: LABEL_W, marginBottom: 8 }}>
              {modules.map(file => (
                <div
                  key={file}
                  title={file}
                  style={{
                    width: CELL_W,
                    marginRight: 4,
                    flexShrink: 0,
                    textAlign: 'center',
                    fontSize: 10,
                    color: 'var(--text-3)',
                    fontFamily: 'DM Mono, monospace',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {file}
                </div>
              ))}
            </div>

            {localeRows.map((locale, li) => (
              <div key={locale.locale} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
                <div
                  style={{
                    width: LABEL_W,
                    flexShrink: 0,
                    paddingRight: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 13 }}>{locale.flag}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'DM Mono, monospace' }}>
                    {locale.locale}
                  </span>
                  {locale.isSourceLocale && <span className="tag tag-neutral">source</span>}
                  <span
                    style={{
                      fontFamily: 'DM Mono, monospace',
                      fontSize: 10,
                      color: locale.coverage >= 88 ? 'var(--success)' : locale.coverage >= 60 ? 'var(--warning)' : 'var(--danger)',
                      marginLeft: 'auto',
                    }}
                  >
                    {locale.coverage.toFixed(0)}%
                  </span>
                </div>

                {modules.map((file, fi) => {
                  const cell = cellMap.get(`${locale.locale}:${file}`);
                  const coverage = cell?.coverage ?? 0;
                  const background = cell ? coverageColor(coverage) : 'rgba(255,255,255,0.03)';

                  return (
                    <div
                      key={`${locale.locale}:${file}`}
                      className={cell ? 'cov-cell' : undefined}
                      style={{
                        width: CELL_W,
                        height: CELL_H,
                        marginRight: 4,
                        flexShrink: 0,
                        background,
                        border: '1px solid rgba(255,255,255,0.04)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        animationDelay: `${li * 0.03 + fi * 0.015}s`,
                        cursor: cell ? 'pointer' : 'default',
                      }}
                      onMouseEnter={e => cell && handleMouseEnter(e, cell)}
                      onMouseLeave={() => setTooltip(t => ({ ...t, visible: false }))}
                    >
                      <span
                        style={{
                          fontFamily: 'DM Mono, monospace',
                          fontSize: 9,
                          color: coverage === 0 ? 'var(--text-3)' : 'rgba(255,255,255,0.55)',
                        }}
                      >
                        {coverage === 0 ? '—' : `${coverage.toFixed(0)}%`}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {tooltip.visible && (
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            transform: 'translate(-50%, -100%)',
            background: '#0D1117',
            border: '1px solid var(--border-bright)',
            borderRadius: 8,
            padding: '10px 14px',
            pointerEvents: 'none',
            zIndex: 9999,
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            minWidth: 160,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'DM Mono, monospace' }}>
              {tooltip.locale} · {tooltip.file}
            </span>
          </div>
          <div
            style={{
              fontFamily: 'DM Mono, monospace',
              fontSize: 20,
              fontWeight: 500,
              color: tooltip.coverage >= 88 ? 'var(--accent)' : tooltip.coverage >= 60 ? 'var(--warning)' : 'var(--danger)',
            }}
          >
            {tooltip.coverage.toFixed(1)}%
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace', marginTop: 3 }}>
            {tooltip.missing} missing · {tooltip.total} total
          </div>
          <div style={{ marginTop: 4 }}>
            <span className={`tag tag-${tooltip.coverage >= 88 ? 'success' : tooltip.coverage >= 60 ? 'warning' : 'danger'}`}>
              {coverageLabel(tooltip.coverage)}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
