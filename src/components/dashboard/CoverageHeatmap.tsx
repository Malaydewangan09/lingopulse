'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { coverageColor, coverageLabel, coverageTextColor } from '@/lib/utils';
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

  const modules = [...new Set(data.map(cell => cell.file))]
    .sort((a, b) => a.localeCompare(b));

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

  const CELL_H = 28;
  const LABEL_W = 126;
  const MIN_CELL_W = 72;

  const handleMouseEnter = (e: React.MouseEvent, cell: FileLocaleCell) => {
    setTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
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
              { label: '0%', color: 'var(--coverage-40)' },
              { label: '60%', color: 'var(--coverage-60)' },
              { label: '88%', color: 'var(--coverage-88)' },
              { label: '100%', color: 'var(--coverage-100)' },
            ].map(({ label, color }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 10, height: 10, borderRadius: 2, background: color, border: '1px solid var(--border)' }} />
                <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{label}</span>
              </div>
            ))}
          </div>
        }
      />

      <div style={{ padding: '16px 20px', overflowX: 'auto' }}>
        {emptyState ? (
          <div
            style={{
              borderRadius: 12,
              border: '1px dashed var(--border-bright)',
              background: 'var(--surface)',
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
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
              Try a fresh scan after pointing the repo at per-module locale files such as `common/en.json`, `auth/fr.yaml`, or similar grouped paths.
            </div>
          </div>
        ) : (
          <div
            style={{
              position: 'relative',
              width: '100%',
              minWidth: LABEL_W + modules.length * MIN_CELL_W,
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `${LABEL_W}px repeat(${modules.length}, minmax(${MIN_CELL_W}px, 1fr))`,
                gap: 4,
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <div />
              {modules.map(file => (
                <div
                  key={file}
                  title={file}
                  style={{
                    minWidth: 0,
                    textAlign: 'center',
                    fontSize: 10,
                    color: 'var(--text-3)',
                    fontFamily: 'var(--font-mono)',
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
              <div
                key={locale.locale}
                style={{
                  display: 'grid',
                  gridTemplateColumns: `${LABEL_W}px repeat(${modules.length}, minmax(${MIN_CELL_W}px, 1fr))`,
                  gap: 4,
                  alignItems: 'center',
                  marginBottom: 4,
                }}
              >
                <div
                  style={{
                    minWidth: 0,
                    paddingRight: 12,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span style={{ fontSize: 13 }}>{locale.flag}</span>
                  <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
                    {locale.locale}
                  </span>
                  {locale.isSourceLocale && <span className="tag tag-neutral repo-chip">source</span>}
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
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
                  const background = cell ? coverageColor(coverage) : 'var(--surface)';

                  return (
                    <div
                      key={`${locale.locale}:${file}`}
                      className={cell ? 'cov-cell' : undefined}
                      style={{
                        minWidth: 0,
                        height: CELL_H,
                        background,
                        border: '1px solid var(--border)',
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
                          fontFamily: 'var(--font-mono)',
                          fontSize: 9,
                          color: coverage === 0 ? 'var(--text-3)' : coverageTextColor(coverage),
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

      {tooltip.visible && typeof document !== 'undefined' && createPortal(
        <div
          style={{
            position: 'fixed',
            left: tooltip.x,
            top: tooltip.y,
            background: 'var(--surface)',
            border: '1px solid var(--border-bright)',
            borderRadius: 8,
            padding: '10px 10px',
            pointerEvents: 'none',
            zIndex: 99999,
            boxShadow: '0 6px 18px rgba(0,0,0,0.28)',
            minWidth: 160,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-mono)' }}>
              {tooltip.locale} · {tooltip.file}
            </span>
          </div>
          <div
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 20,
              fontWeight: 500,
              color: tooltip.coverage >= 88 ? 'var(--accent)' : tooltip.coverage >= 60 ? 'var(--warning)' : 'var(--danger)',
            }}
          >
            {tooltip.coverage.toFixed(1)}%
          </div>
          <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: 3 }}>
            {tooltip.missing} missing · {tooltip.total} total
          </div>
          <div style={{ marginTop: 5 }}>
            <span className={`tag repo-chip tag-${tooltip.coverage >= 88 ? 'success' : tooltip.coverage >= 60 ? 'warning' : 'danger'}`}>
              {coverageLabel(tooltip.coverage)}
            </span>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
