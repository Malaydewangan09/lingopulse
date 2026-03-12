'use client';
import { useState } from 'react';
import { coverageColor, coverageLabel } from '@/lib/utils';
import type { FileLocaleCell } from '@/lib/types';
import { LOCALE_STATS, FILE_MODULES } from '@/lib/mock-data';
import SectionHeader from '@/components/dashboard/SectionHeader';

interface Props { data: FileLocaleCell[]; }

interface TooltipState {
  visible: boolean;
  x: number; y: number;
  locale: string; file: string;
  coverage: number; missing: number; total: number;
}

export default function CoverageHeatmap({ data }: Props) {
  const [tooltip, setTooltip] = useState<TooltipState>({ visible: false, x: 0, y: 0, locale: '', file: '', coverage: 0, missing: 0, total: 0 });

  const cellMap = new Map<string, FileLocaleCell>();
  for (const cell of data) {
    cellMap.set(`${cell.locale}:${cell.file}`, cell);
  }

  const CELL_W = 52;
  const CELL_H = 28;
  const LABEL_W = 96;
  const HEADER_H = 36;

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

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      {/* Card header */}
      <SectionHeader
        title="Coverage Heatmap"
        subtitle="locales × modules · hover for details"
        tooltip="Each cell shows how many keys in that module have been translated for that locale. Green = fully translated, red = mostly missing. Hover any cell for exact stats. Fix reds by running `npx lingo.dev@latest i18n`."
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

      {/* Grid container */}
      <div style={{ padding: '16px 20px', overflowX: 'auto' }}>
        <div style={{ minWidth: LABEL_W + FILE_MODULES.length * (CELL_W + 4), position: 'relative' }}>

          {/* Column headers */}
          <div style={{ display: 'flex', marginLeft: LABEL_W, marginBottom: 8 }}>
            {FILE_MODULES.map(file => (
              <div key={file} style={{
                width: CELL_W, marginRight: 4, flexShrink: 0,
                textAlign: 'center', fontSize: 10,
                color: 'var(--text-3)', fontFamily: 'DM Mono, monospace',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {file}
              </div>
            ))}
          </div>

          {/* Rows */}
          {LOCALE_STATS.map((locale, li) => (
            <div key={locale.locale} style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
              {/* Row label */}
              <div style={{
                width: LABEL_W, flexShrink: 0, paddingRight: 12,
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ fontSize: 13 }}>{locale.flag}</span>
                <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'DM Mono, monospace' }}>
                  {locale.locale}
                </span>
                <span style={{
                  fontFamily: 'DM Mono, monospace', fontSize: 10,
                  color: locale.coverage >= 88 ? 'var(--success)' : locale.coverage >= 60 ? 'var(--warning)' : 'var(--danger)',
                  marginLeft: 'auto',
                }}>
                  {locale.coverage.toFixed(0)}%
                </span>
              </div>

              {/* Cells */}
              {FILE_MODULES.map(file => {
                const cell = cellMap.get(`${locale.locale}:${file}`);
                const cov = cell?.coverage ?? 0;
                const bg = coverageColor(cov);

                return (
                  <div
                    key={file}
                    className="cov-cell"
                    style={{
                      width: CELL_W, height: CELL_H, marginRight: 4, flexShrink: 0,
                      background: bg,
                      border: '1px solid rgba(255,255,255,0.04)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      animationDelay: `${li * 0.03 + FILE_MODULES.indexOf(file) * 0.015}s`,
                    }}
                    onMouseEnter={e => cell && handleMouseEnter(e, cell)}
                    onMouseLeave={() => setTooltip(t => ({ ...t, visible: false }))}
                  >
                    <span style={{
                      fontFamily: 'DM Mono, monospace', fontSize: 9,
                      color: cov === 0 ? 'var(--text-3)' : 'rgba(255,255,255,0.55)',
                    }}>
                      {cov === 0 ? '—' : `${cov.toFixed(0)}%`}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Fixed tooltip */}
      {tooltip.visible && (
        <div style={{
          position: 'fixed', left: tooltip.x, top: tooltip.y,
          transform: 'translate(-50%, -100%)',
          background: '#0D1117', border: '1px solid var(--border-bright)',
          borderRadius: 8, padding: '10px 14px',
          pointerEvents: 'none', zIndex: 9999,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          minWidth: 160,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'DM Mono, monospace' }}>
              {tooltip.locale} · {tooltip.file}
            </span>
          </div>
          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 20, fontWeight: 500, color: tooltip.coverage >= 88 ? 'var(--accent)' : tooltip.coverage >= 60 ? 'var(--warning)' : 'var(--danger)' }}>
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
