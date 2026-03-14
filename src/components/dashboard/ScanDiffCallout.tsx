'use client';

import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, GitCompareArrows, ShieldAlert, TriangleAlert } from 'lucide-react';
import { navigateWithTransition } from '@/lib/navigation';
import type { ScanDiffSummary } from '@/lib/types';

interface Props {
  repoId: string;
  diff: ScanDiffSummary | null;
  compact?: boolean;
}

function getTone(status: 'safe' | 'watch' | 'blocked') {
  if (status === 'safe') {
    return {
      color: 'var(--success)',
      border: 'rgba(63,200,122,0.22)',
      background: 'rgba(63,200,122,0.08)',
      icon: <CheckCircle2 size={14} />,
      label: 'safe',
    };
  }

  if (status === 'blocked') {
    return {
      color: 'var(--danger)',
      border: 'rgba(240,82,72,0.22)',
      background: 'rgba(240,82,72,0.08)',
      icon: <ShieldAlert size={14} />,
      label: 'blocked',
    };
  }

  return {
    color: 'var(--warning)',
    border: 'rgba(230,168,23,0.22)',
    background: 'rgba(230,168,23,0.08)',
    icon: <TriangleAlert size={14} />,
    label: 'watch',
  };
}

export default function ScanDiffCallout({ repoId, diff, compact = false }: Props) {
  const router = useRouter();
  const tone = getTone(diff?.status ?? 'watch');
  const headline = diff?.headline ?? 'Scan diff becomes live after the next baseline';
  const summary = diff?.hasBaseline
    ? diff.summary
    : 'Compare the latest scan against the previous baseline, review regressions, and open a draft fix PR from one focused view.';

  return (
    <div
      style={{
        marginBottom: compact ? 0 : 14,
        borderRadius: 12,
        border: `1px solid ${tone.border}`,
        background: 'var(--card)',
        padding: compact ? 14 : 16,
        display: 'grid',
        gridTemplateColumns: compact ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) auto',
        gap: 14,
        alignItems: 'center',
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <div className="mono-badge mono-badge-sm" style={{ color: tone.color, border: `1px solid ${tone.border}`, background: tone.background }}>
            {tone.icon}
            scan diff
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
            {diff?.hasBaseline ? `${tone.label} signal live` : 'baseline mode'}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <GitCompareArrows size={15} color={tone.color} />
          <span style={{ fontSize: 15, color: 'var(--text-1)', fontWeight: 600 }}>
            {headline}
          </span>
        </div>

        <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.55, maxWidth: compact ? '100%' : 760 }}>
          {summary}
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', justifyContent: compact ? 'flex-start' : 'flex-end' }}>
        <button
          onClick={() => navigateWithTransition(router, `/repo/${repoId}/diff`)}
          style={{
            height: 36,
            padding: '0 14px',
            borderRadius: 9,
            border: `1px solid ${tone.border}`,
            background: tone.color,
            color: '#070B14',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
            fontSize: 11,
            fontWeight: 600,
            boxShadow: 'none',
          }}
        >
          open scan diff
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
