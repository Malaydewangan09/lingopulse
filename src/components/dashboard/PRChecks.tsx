'use client';
import { useMemo, useState } from 'react';
import type { DraftFixResult, PRCheck } from '@/lib/types';
import { CheckCircle2, XCircle, AlertCircle, Clock, ArrowRight, ExternalLink, Sparkles, RefreshCw } from 'lucide-react';
import SectionHeader from '@/components/dashboard/SectionHeader';

interface Props {
  checks: PRCheck[];
  latestDraftFix: DraftFixResult | null;
  webhookActive: boolean;
  syncing?: boolean;
  syncMessage?: string;
  onSync?: () => void | Promise<void>;
}

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
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 11 }}>
      <span style={{ color: 'var(--text-3)' }}>{before.toFixed(1)}%</span>
      <ArrowRight size={10} color="var(--text-3)" />
      <span style={{ color }}>{after.toFixed(1)}%</span>
    </div>
  );
}

export default function PRChecks({ checks, latestDraftFix, webhookActive, syncing = false, syncMessage = '', onSync }: Props) {
  const [showPassing, setShowPassing] = useState(false);
  const passing = checks.filter(c => c.status === 'passing').length;
  const failing = checks.filter(c => c.status === 'failing').length;
  const warning = checks.filter(c => c.status === 'warning').length;
  const attentionChecks = checks.filter(c => c.status !== 'passing');
  const sortedChecks = useMemo(() => {
    const severityRank: Record<PRCheck['status'], number> = {
      failing: 0,
      warning: 1,
      pending: 2,
      passing: 3,
    };

    return [...checks].sort((a, b) => {
      const severityDelta = severityRank[a.status] - severityRank[b.status];
      return severityDelta;
    });
  }, [checks]);
  const visibleChecks = showPassing ? sortedChecks : attentionChecks;
  const subtitle = checks.length === 0
    ? 'no synced PR checks yet'
    : attentionChecks.length > 0
    ? `${attentionChecks.length} PRs need review${passing > 0 ? ` · ${passing} clean hidden` : ''}`
    : `${checks.length} synced PR checks · all clean`;

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      {/* Header */}
      <SectionHeader
        title="PR Checks"
        subtitle={subtitle}
        tooltip="Before a PR is merged, Lingo Pulse checks if it adds untranslated strings. Failing = PR drops coverage >2%. Warning = minor regression. Passing = safe to merge."
        right={
          <div style={{ display: 'flex', gap: 6 }}>
            {onSync && (
              <button
                onClick={() => void onSync()}
                disabled={syncing}
                className="mono-badge mono-badge-sm"
                style={{
                  cursor: syncing ? 'wait' : 'pointer',
                  color: syncing ? 'var(--text-3)' : 'var(--blue)',
                  border: '1px solid var(--border)',
                  background: syncing ? 'var(--surface)' : 'var(--card-hover)',
                }}
              >
                <RefreshCw size={12} style={{ animation: syncing ? 'spin 0.8s linear infinite' : 'none' }} />
                {syncing ? 'syncing' : 'sync PRs'}
              </button>
            )}
            {failing > 0 && <span className="tag tag-danger">{failing} failing</span>}
            {warning > 0 && <span className="tag tag-warning">{warning} warn</span>}
          </div>
        }
      />

      <div style={{ padding: '6px 0' }}>
        {syncMessage && (
          <div style={{ padding: '10px 16px', color: 'var(--text-3)', fontSize: 11, fontFamily: 'var(--font-mono)', borderBottom: '1px solid var(--border)' }}>
            {syncMessage}
          </div>
        )}
        {checks.length === 0 ? (
          <div style={{ padding: '24px 16px', color: 'var(--text-2)', fontSize: 12, textAlign: 'center' }}>
            {webhookActive
              ? 'No PR checks have been synced yet. Open a new PR or use "sync PRs" to backfill current open pull requests.'
              : 'This repo is connected without an active webhook, so PR events are not arriving automatically. Reconnect with GitHub again or use "sync PRs" to backfill open pull requests.'}
          </div>
        ) : visibleChecks.length === 0 ? (
          <div style={{ padding: '18px 16px', display: 'grid', gap: 10 }}>
            <div style={{ color: 'var(--success)', fontSize: 12, fontWeight: 600 }}>
              All synced PR checks are clean.
            </div>
            <div style={{ color: 'var(--text-2)', fontSize: 12 }}>
              Nothing needs action right now. You can still inspect passing checks if you want the full audit trail.
            </div>
            <div>
              <button
                onClick={() => setShowPassing(true)}
                className="mono-badge mono-badge-sm"
                style={{
                  cursor: 'pointer',
                  color: 'var(--text-2)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                }}
              >
                show passing checks
              </button>
            </div>
          </div>
        ) : (
          visibleChecks.map((check, i) => (
            <div
              key={check.id}
              style={{
                padding: '12px 16px',
                borderBottom: i < visibleChecks.length - 1 ? '1px solid var(--border)' : 'none',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--card-hover)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <div style={{ paddingTop: 1 }}>
                  <StatusIcon status={check.status} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                    <span style={{
                      fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)',
                      background: 'var(--border)', padding: '1px 5px', borderRadius: 3,
                    }}>
                      #{check.prNumber}
                    </span>
                    <span style={{ fontSize: 12, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {check.title}
                    </span>
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5, marginBottom: 8 }}>
                    {check.summary}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <CoverageDelta before={check.coverageBefore} after={check.coverageAfter} />

                    {check.missingKeys > 0 && (
                      <span style={{
                        fontSize: 10, fontFamily: 'var(--font-mono)',
                        color: check.status === 'failing' ? 'var(--danger)' : 'var(--warning)',
                      }}>
                        +{check.missingKeys} missing keys
                      </span>
                    )}

                    <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginLeft: 'auto' }}>
                      {check.timestamp}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                    <a
                      href={check.prUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        height: 28,
                        padding: '0 10px',
                        borderRadius: 8,
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        color: 'var(--text-2)',
                        textDecoration: 'none',
                        fontSize: 10,
                        fontFamily: 'var(--font-sans)',
                        fontWeight: 500,
                      }}
                    >
                      <ExternalLink size={12} />
                      open PR
                    </a>

                    {latestDraftFix && check.status !== 'passing' && (
                      <a
                        href={latestDraftFix.prUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          height: 28,
                          padding: '0 10px',
                          borderRadius: 8,
                          border: '1px solid var(--border)',
                          background: 'var(--card-hover)',
                          color: 'var(--accent)',
                          textDecoration: 'none',
                          fontSize: 10,
                          fontFamily: 'var(--font-sans)',
                          fontWeight: 500,
                        }}
                      >
                        <Sparkles size={12} />
                        open fix PR
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}

        {checks.length > 0 && passing > 0 && attentionChecks.length > 0 && (
          <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border)' }}>
            <button
              onClick={() => setShowPassing(current => !current)}
              className="mono-badge mono-badge-sm"
              style={{
                cursor: 'pointer',
                color: 'var(--text-2)',
                border: '1px solid var(--border)',
                background: 'var(--surface)',
              }}
            >
              {showPassing ? 'hide passing checks' : `show ${passing} passing checks`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
