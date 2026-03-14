'use client';
import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, GitPullRequest, LoaderCircle, ShieldAlert, Sparkles, TriangleAlert } from 'lucide-react';
import SectionHeader from '@/components/dashboard/SectionHeader';
import type { DraftFixResult, ScanDiffSignal, ScanDiffSummary } from '@/lib/types';

function Tooltip({ text }: { text: string }) {
  const [show, setShow] = useState(false);
  return (
    <span 
      style={{ position: 'relative', display: 'inline-flex', alignSelf: 'flex-start' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{ fontSize: 9, color: 'var(--text-3)', marginLeft: 4 }}>ⓘ</span>
      {show && (
        <span style={{
          position: 'absolute', bottom: '140%', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--card)', border: '1px solid var(--border-bright)', borderRadius: 8,
          padding: '8px 12px', fontSize: 11, color: 'var(--text-2)',
          zIndex: 100, fontFamily: 'var(--font-sans)', fontWeight: 500,
          whiteSpace: 'normal', width: 180, textAlign: 'center', lineHeight: 1.4,
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {text}
          <span style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            border: '6px solid transparent', borderTopColor: 'var(--border-bright)',
          }} />
        </span>
      )}
    </span>
  );
}

interface Props {
  diff: ScanDiffSummary | null;
  creatingFixPr: boolean;
  onCreateFixPr: () => void | Promise<void>;
  fixResult: DraftFixResult | null;
  latestDraftFix: DraftFixResult | null;
  fixError: string;
}

function toneStyles(status: ScanDiffSummary['status']) {
  if (status === 'safe') {
    return {
      bg: 'rgba(63,200,122,0.1)',
      border: 'rgba(63,200,122,0.22)',
      color: 'var(--success)',
      label: 'safe',
      icon: <CheckCircle2 size={14} />,
    };
  }

  if (status === 'blocked') {
    return {
      bg: 'rgba(240,82,72,0.1)',
      border: 'rgba(240,82,72,0.22)',
      color: 'var(--danger)',
      label: 'blocked',
      icon: <ShieldAlert size={14} />,
    };
  }

  return {
    bg: 'rgba(230,168,23,0.1)',
    border: 'rgba(230,168,23,0.22)',
    color: 'var(--warning)',
    label: 'watch',
    icon: <TriangleAlert size={14} />,
  };
}

function formatDelta(value: number, suffix = ''): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(1)}${suffix}`;
}

function formatMissingDelta(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value}`;
}

function SignalList({
  title,
  signals,
  emptyLabel,
  positive,
}: {
  title: string;
  signals: ScanDiffSignal[];
  emptyLabel: string;
  positive?: boolean;
}) {
  const tooltipText = positive 
    ? (title.includes('modules') ? 'Modules with 100% coverage' : 'Locales with 100% coverage')
    : (title.includes('modules') ? 'Modules with missing keys' : 'Locales with missing keys');
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 12,
        background: 'var(--card-hover)',
        padding: 14,
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        {title}
        <Tooltip text={tooltipText} />
      </div>

      {signals.length === 0 ? (
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{emptyLabel}</div>
      ) : (
        <div style={{ display: 'grid', gap: 10 }}>
          {signals.map(signal => (
            <div key={signal.key} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 600, marginBottom: 4 }}>
                  {signal.label}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
                  {signal.currentMissingKeys} missing · {signal.currentCoverage.toFixed(1)}% coverage
                </div>
              </div>

              <div
                style={{
                  flexShrink: 0,
                  fontSize: 11,
                  fontFamily: 'DM Mono, monospace',
                  color: positive ? 'var(--success)' : 'var(--danger)',
                  textAlign: 'right',
                }}
              >
                <div>{formatDelta(signal.coverageDelta, ' pts')}</div>
                <div>{formatMissingDelta(signal.missingDelta)} keys</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ScanDiffPanel({ diff, creatingFixPr, onCreateFixPr, fixResult, latestDraftFix, fixError }: Props) {
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [toastEntered, setToastEntered] = useState(false);
  const previousFixUrlRef = useRef<string | null>(null);
  const hideToastRef = useRef<number | null>(null);
  const removeToastRef = useRef<number | null>(null);
  const activeDiff = diff ?? {
    hasBaseline: false,
    status: 'watch',
    headline: 'Waiting for a comparable baseline',
    summary: 'Run another scan to compare changes over time.',
    recommendation: 'The draft fix PR flow still works as long as missing keys exist.',
    coverageDelta: 0,
    qualityDelta: 0,
    missingKeysDelta: 0,
    totalMissingKeys: 0,
    regressedLocales: [],
    improvedLocales: [],
    regressedModules: [],
    improvedModules: [],
  } satisfies ScanDiffSummary;
  const tone = toneStyles(activeDiff.status);
  const visibleDraftFix = fixResult ?? latestDraftFix;
  const showComparison = activeDiff.hasBaseline;

  useEffect(() => {
    return () => {
      if (hideToastRef.current) window.clearTimeout(hideToastRef.current);
      if (removeToastRef.current) window.clearTimeout(removeToastRef.current);
    };
  }, []);

  useEffect(() => {
    if (!fixResult?.prUrl || fixResult.prUrl === previousFixUrlRef.current) return;

    previousFixUrlRef.current = fixResult.prUrl;

    if (hideToastRef.current) window.clearTimeout(hideToastRef.current);
    if (removeToastRef.current) window.clearTimeout(removeToastRef.current);

    let frame = 0;
    const showTimer = window.setTimeout(() => {
      setShowSuccessToast(true);
      setToastEntered(false);

      frame = window.requestAnimationFrame(() => setToastEntered(true));

      hideToastRef.current = window.setTimeout(() => {
        setToastEntered(false);
      }, 3200);

      removeToastRef.current = window.setTimeout(() => {
        setShowSuccessToast(false);
      }, 3460);
    }, 0);

    return () => {
      window.clearTimeout(showTimer);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [fixResult]);

  return (
    <div
      style={{
        position: 'relative',
        background: 'var(--card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 14,
      }}
    >
      <SectionHeader
        title="Scan Diff"
        subtitle={activeDiff.hasBaseline ? 'latest run compared with the previous scan' : 'first baseline captured for this repo'}
        tooltip="This compares the newest scan against the previous baseline, ranks the worst regressions, and can open a draft GitHub PR with generated fixes for missing keys."
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span
              className="tag repo-chip"
              style={{
                background: tone.bg,
                borderColor: tone.border,
                color: tone.color,
              }}
            >
              {tone.icon}
              {tone.label}
            </span>
            <button
              onClick={() => void onCreateFixPr()}
              disabled={creatingFixPr}
              style={{
                height: 32,
                padding: '0 12px',
                borderRadius: 8,
                border: '1px solid var(--accent-glow)',
                background: creatingFixPr ? 'var(--accent-dim)' : 'var(--accent-dim)',
                color: 'var(--accent)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                cursor: creatingFixPr ? 'wait' : 'pointer',
                fontFamily: 'DM Mono, monospace',
                fontSize: 11,
              }}
            >
              {creatingFixPr ? <LoaderCircle size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <GitPullRequest size={13} />}
              {creatingFixPr ? 'creating draft PR' : 'create draft fix PR'}
            </button>
          </div>
        }
      />

      {showSuccessToast && fixResult && (
        <div
          style={{
            position: 'absolute',
            top: 74,
            right: 18,
            zIndex: 4,
            width: 'min(340px, calc(100% - 36px))',
            borderRadius: 12,
            border: '1px solid rgba(0,229,160,0.2)',
            background: 'var(--surface)',
            boxShadow: '0 18px 40px rgba(0, 0, 0, 0.28)',
            padding: 14,
            display: 'grid',
            gap: 8,
            opacity: toastEntered ? 1 : 0,
            transform: toastEntered ? 'translateY(0)' : 'translateY(-8px)',
            transition: 'opacity 180ms ease, transform 180ms ease',
            pointerEvents: 'none',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--success)', fontSize: 12, fontWeight: 600 }}>
            <CheckCircle2 size={14} />
            Draft fix PR created
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
            {fixResult.keysFilled} keys drafted across {fixResult.filesUpdated} files. Merge that PR to update the default-branch dashboard.
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
            {fixResult.mode === 'lingo' ? 'Lingo.dev draft ready on GitHub.' : 'Source-copy fallback draft ready on GitHub.'}
          </div>
        </div>
      )}

      <div style={{ padding: 18, display: 'grid', gap: 16 }}>
        <div
          style={{
            borderRadius: 14,
            border: `1px solid ${tone.border}`,
            background: 'var(--card-hover)',
            padding: 16,
            display: 'grid',
            gridTemplateColumns: showComparison ? 'minmax(0, 1.35fr) repeat(3, minmax(0, 0.55fr))' : 'minmax(0, 1fr) minmax(220px, 260px)',
            gap: 14,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace', marginBottom: 8 }}>
              release signal
            </div>
            <div style={{ fontSize: 20, lineHeight: 1.15, color: 'var(--text-1)', fontWeight: 600, marginBottom: 8 }}>
              {activeDiff.headline}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-2)', maxWidth: 620, marginBottom: 10 }}>
              {activeDiff.summary}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
              {activeDiff.recommendation}
            </div>
          </div>

          {showComparison ? (
            [
              { label: 'coverage', value: formatDelta(activeDiff.coverageDelta, ' pts'), color: activeDiff.coverageDelta >= 0 ? 'var(--success)' : 'var(--danger)', tooltip: 'Change in coverage from previous scan' },
              { label: 'quality', value: formatDelta(activeDiff.qualityDelta), color: activeDiff.qualityDelta >= 0 ? 'var(--success)' : 'var(--danger)', tooltip: 'Change in quality score from previous scan' },
              { label: 'missing keys', value: String(activeDiff.totalMissingKeys ?? activeDiff.regressedLocales.reduce((sum, s) => sum + s.currentMissingKeys, 0) ?? activeDiff.regressedModules.reduce((sum, s) => sum + s.currentMissingKeys, 0) ?? 0), color: (activeDiff.totalMissingKeys ?? activeDiff.regressedLocales.reduce((sum, s) => sum + s.currentMissingKeys, 0) ?? 0) > 0 ? 'var(--danger)' : 'var(--success)', tooltip: 'Total untranslated keys in worst affected locales' },
            ].map(stat => (
              <div
                key={stat.label}
                style={{
                  borderRadius: 12,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  padding: 14,
                  minWidth: 0,
                }}
              >
                <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {stat.label}
                  <Tooltip text={stat.tooltip} />
                </div>
                <div style={{ fontSize: 20, color: stat.color, fontWeight: 600 }}>
                  {stat.value}
                </div>
              </div>
            ))
          ) : (
            <div
              style={{
                borderRadius: 12,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                padding: 14,
                minWidth: 0,
                alignSelf: 'stretch',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace', marginBottom: 8 }}>
                  next comparison
                </div>
                <div style={{ fontSize: 15, color: 'var(--text-1)', fontWeight: 600, marginBottom: 6 }}>
                  Run one more scan
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                  Push a change, sync a PR, or trigger manual analysis again to activate regression tracking.
                </div>
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace', marginTop: 12 }}>
                diff view becomes live after the next baseline
              </div>
            </div>
          )}
        </div>

        {showComparison && (
          <div className="dashboard-scan-grid">
            <SignalList
              title={activeDiff.regressedModules.length > 0 ? "Top regressions (modules)" : "Top regressions (locales)"}
              signals={activeDiff.regressedModules.length > 0 ? activeDiff.regressedModules : activeDiff.regressedLocales}
              emptyLabel="No missing keys found."
            />
            <SignalList
              title={activeDiff.improvedModules.length > 0 ? "Complete (modules)" : "Complete (locales)"}
              signals={activeDiff.improvedModules.length > 0 ? activeDiff.improvedModules : activeDiff.improvedLocales}
              emptyLabel="No completed locales yet."
              positive
            />
          </div>
        )}

        {(visibleDraftFix || fixError) && (
          <div
            style={{
              borderRadius: 12,
              border: `1px solid ${fixError ? 'rgba(240,82,72,0.18)' : 'var(--border)'}`,
              background: fixError ? 'rgba(240,82,72,0.05)' : 'var(--surface)',
              padding: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 16,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 12, color: fixError ? 'var(--danger)' : visibleDraftFix?.isMerged ? 'var(--success)' : 'var(--text-1)', fontWeight: 600, marginBottom: 4 }}>
                {fixError ? 'Draft fix PR failed' : visibleDraftFix?.isMerged ? 'Last fix PR merged' : 'Draft fix PR is open'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                {fixError
                  ? fixError
                  : `${visibleDraftFix?.keysFilled ?? 0} keys drafted across ${visibleDraftFix?.filesUpdated ?? 0} files · ${visibleDraftFix?.mode === 'lingo' ? 'Lingo.dev translation draft' : 'source-copy fallback'}`}
              </div>
              {!fixError && !visibleDraftFix?.isMerged && (
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6, lineHeight: 1.5 }}>
                  The main dashboard stays on {` `}
                  <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-2)' }}>master</span>
                  {` `}until this PR is merged.
                </div>
              )}
              {!fixError && !visibleDraftFix?.isMerged && (
                <div style={{ fontSize: 11, color: 'var(--accent)', marginTop: 4, lineHeight: 1.5 }}>
                  Merge the fix PR to turn the default-branch heatmap green.
                </div>
              )}
              {visibleDraftFix?.isMerged && (
                <div style={{ fontSize: 11, color: 'var(--success)', marginTop: 4, lineHeight: 1.5 }}>
                  The heatmap has been updated with the merged changes.
                </div>
              )}
            </div>

            {visibleDraftFix && (
              <a
                href={visibleDraftFix.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  color: 'var(--accent)',
                  textDecoration: 'none',
                  fontFamily: 'DM Mono, monospace',
                  fontSize: 11,
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '8px 10px',
                  background: 'var(--card-hover)',
                }}
              >
                <Sparkles size={13} />
                open draft PR
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
