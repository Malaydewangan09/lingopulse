'use client';
import type { PRCheck } from '@/lib/types';
import { CheckCircle2, XCircle, AlertCircle, Clock, GitPullRequest, ArrowRight } from 'lucide-react';
import SectionHeader from '@/components/dashboard/SectionHeader';

interface Props { checks: PRCheck[]; }

function StatusIcon({ status }: { status: PRCheck['status'] }) {
  const map = {
    passing: { icon: <CheckCircle2 size={14} />, color: 'var(--success)' },
    failing: { icon: <XCircle size={14} />,       color: 'var(--danger)'  },
    warning: { icon: <AlertCircle size={14} />,   color: 'var(--warning)' },
    pending: { icon: <Clock size={14} />,          color: 'var(--text-3)'  },
  };
  const { icon, color } = map[status];
  return <span style={{ color }}>{icon}</span>;
}

function CoverageDelta({ before, after }: { before: number; after: number }) {
  const delta = after - before;
  const color = delta > 0.5 ? 'var(--success)' : delta < -0.5 ? 'var(--danger)' : 'var(--text-3)';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'DM Mono, monospace', fontSize: 11 }}>
      <span style={{ color: 'var(--text-3)' }}>{before.toFixed(1)}%</span>
      <ArrowRight size={10} color="var(--text-3)" />
      <span style={{ color }}>{after.toFixed(1)}%</span>
    </div>
  );
}

export default function PRChecks({ checks }: Props) {
  const passing = checks.filter(c => c.status === 'passing').length;
  const failing = checks.filter(c => c.status === 'failing').length;
  const warning = checks.filter(c => c.status === 'warning').length;

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      {/* Header */}
      <SectionHeader
        title="PR Checks"
        subtitle={`${checks.length} open PRs`}
        tooltip="Before a PR is merged, Lingo Pulse checks if it adds untranslated strings. Failing = PR drops coverage >2%. Warning = minor regression. Passing = safe to merge."
        right={
          <div style={{ display: 'flex', gap: 6 }}>
            {failing > 0 && <span className="tag tag-danger">{failing} failing</span>}
            {warning > 0 && <span className="tag tag-warning">{warning} warn</span>}
            {passing > 0 && <span className="tag tag-success">{passing} ok</span>}
          </div>
        }
      />

      {/* PR list */}
      <div style={{ padding: '6px 0' }}>
        {checks.map((check, i) => (
          <div
            key={check.id}
            style={{
              padding: '10px 16px',
              borderBottom: i < checks.length - 1 ? '1px solid rgba(28,43,58,0.5)' : 'none',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.015)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              {/* Status icon */}
              <div style={{ paddingTop: 1 }}>
                <StatusIcon status={check.status} />
              </div>

              {/* Content */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{
                    fontSize: 10, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace',
                    background: 'var(--border)', padding: '1px 5px', borderRadius: 3,
                  }}>
                    #{check.prNumber}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {check.title}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <CoverageDelta before={check.coverageBefore} after={check.coverageAfter} />

                  {check.missingKeys > 0 && (
                    <span style={{
                      fontSize: 10, fontFamily: 'DM Mono, monospace',
                      color: check.status === 'failing' ? 'var(--danger)' : 'var(--warning)',
                    }}>
                      +{check.missingKeys} missing keys
                    </span>
                  )}

                  <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace', marginLeft: 'auto' }}>
                    {check.timestamp}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
