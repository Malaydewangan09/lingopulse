'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Activity, GitCompareArrows, KeyRound, ShieldAlert } from 'lucide-react';
import Header from '@/components/dashboard/Header';
import MetricCard from '@/components/dashboard/MetricCard';
import ScanDiffPanel from '@/components/dashboard/ScanDiffPanel';
import Sidebar from '@/components/dashboard/Sidebar';
import type { DraftFixResult, RepoInfo, ScanDiffSummary } from '@/lib/types';

type NumericValue = number | string | null | undefined;

interface RepoRow {
  id: string;
  name: string;
  full_name: string;
  owner: string;
  default_branch: string;
  updated_at: string;
  webhook_id?: number | null;
}

interface AnalysisRunRow {
  id: string;
  created_at: string;
  overall_coverage?: NumericValue;
  quality_score?: NumericValue;
  missing_keys?: NumericValue;
  active_locales?: NumericValue;
  total_locales?: NumericValue;
}

interface DashboardData {
  repo: RepoRow;
  latestRun: AnalysisRunRow | null;
  previousRun: AnalysisRunRow | null;
  scanDiff: ScanDiffSummary | null;
  latestDraftFix: DraftFixResult | null;
}

function toNumber(value: unknown): number {
  const next = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function buildRepoInfo(data: DashboardData): RepoInfo {
  const { repo, latestRun } = data;
  return {
    id: repo.id,
    name: repo.name,
    fullName: repo.full_name,
    owner: repo.owner,
    defaultBranch: repo.default_branch,
    lastAnalyzed: latestRun?.created_at ?? repo.updated_at,
    overallCoverage: toNumber(latestRun?.overall_coverage),
    qualityScore: toNumber(latestRun?.quality_score),
    totalMissingKeys: Math.round(toNumber(latestRun?.missing_keys)),
    activeLocales: Math.round(toNumber(latestRun?.active_locales)),
    totalLocales: Math.round(toNumber(latestRun?.total_locales)),
    webhookActive: !!repo.webhook_id,
  };
}

export default function RepoDiffPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const [creatingFixPr, setCreatingFixPr] = useState(false);
  const [fixPrError, setFixPrError] = useState('');
  const [fixPrResult, setFixPrResult] = useState<DraftFixResult | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/repos/${id}`);
      if (!res.ok) throw new Error(`${res.status}`);
      setData(await res.json());
      setError('');
    } catch (nextError: unknown) {
      setError(nextError instanceof Error ? nextError.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshError('');

    try {
      const currentRunId = data?.latestRun?.id ?? null;
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoId: id }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error ?? `Analysis failed (${res.status})`);
      }

      for (let attempt = 0; attempt < 15; attempt += 1) {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const status = await fetch(`/api/repos/${id}`);
        if (!status.ok) break;
        const fresh = await status.json();
        if (fresh.latestRun?.id && fresh.latestRun.id !== currentRunId) {
          setData(fresh);
          return;
        }
      }

      await load();
    } catch (nextError: unknown) {
      setRefreshError(nextError instanceof Error ? nextError.message : 'Failed to analyze repo');
    } finally {
      setRefreshing(false);
    }
  };

  const handleCreateFixPr = async () => {
    if (creatingFixPr) return;

    setCreatingFixPr(true);
    setFixPrError('');
    setFixPrResult(null);

    try {
      const res = await fetch(`/api/repos/${id}/draft-fix-pr`, { method: 'POST' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error ?? `Draft fix PR failed (${res.status})`);
      }

      setFixPrResult(payload as DraftFixResult);
      await load();
    } catch (nextError: unknown) {
      setFixPrError(nextError instanceof Error ? nextError.message : 'Failed to create draft fix PR');
    } finally {
      setCreatingFixPr(false);
    }
  };

  if (loading) return <LoadingSkeleton />;
  if (error || !data?.repo) return <ErrorState error={error} />;
  if (!data.latestRun) return <WaitingForAnalysis />;

  const repo = buildRepoInfo(data);
  const diff = data.scanDiff;
  const status = diff?.status ?? 'watch';
  const previousCoverage = data.previousRun ? toNumber(data.previousRun.overall_coverage) : 0;
  const coverageTrend = data.previousRun ? round1(repo.overallCoverage - previousCoverage) : 0;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar activeSection="overview" currentRepoId={id} />
      <div className="dashboard-content-offset" style={{ flex: 1, minWidth: 0 }}>
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
          <Header repo={repo} scanDiff={data.scanDiff} onRefresh={handleRefresh} refreshing={refreshing} />

          <main className="dashboard-main">
            <div id="section-overview" className="dashboard-metrics-grid">
              <MetricCard label="Diff Status" value={status} sublabel={diff?.hasBaseline ? 'latest comparison live' : 'waiting for next baseline'} danger={status === 'blocked'} warning={status === 'watch'} accent={status === 'safe'} icon={<ShieldAlert size={15} />} />
              <MetricCard label="Coverage" value={repo.overallCoverage.toFixed(1)} unit="%" trend={coverageTrend} sublabel="latest scan" icon={<GitCompareArrows size={15} />} />
              <MetricCard label="Quality" value={repo.qualityScore.toFixed(1)} unit="/10" sublabel="latest score" icon={<Activity size={15} />} />
              <MetricCard label="Missing Keys" value={repo.totalMissingKeys} sublabel={`${repo.totalLocales} locales tracked`} danger={repo.totalMissingKeys > 200} warning={repo.totalMissingKeys > 50 && repo.totalMissingKeys <= 200} icon={<KeyRound size={15} />} />
            </div>

            {refreshError && (
              <div
                style={{
                  marginBottom: 14,
                  padding: '12px 14px',
                  borderRadius: 12,
                  background: 'rgba(240,82,72,0.08)',
                  border: '1px solid rgba(240,82,72,0.2)',
                  color: 'var(--danger)',
                  fontSize: 12,
                  fontFamily: 'DM Mono, monospace',
                }}
              >
                {refreshError}
              </div>
            )}

            <ScanDiffPanel
              diff={data.scanDiff}
              creatingFixPr={creatingFixPr}
              onCreateFixPr={handleCreateFixPr}
              fixResult={fixPrResult}
              latestDraftFix={data.latestDraftFix}
              fixError={fixPrError}
            />
          </main>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
      <div style={{ height: 56, background: 'var(--card)', borderBottom: '1px solid var(--border)' }} />
      <div className="dashboard-main">
        <div className="dashboard-metrics-grid">
          {[0, 1, 2, 3].map(index => (
            <div key={index} className="skeleton" style={{ height: 110, borderRadius: 12 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ErrorState({ error }: { error: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 12 }}>
      <span style={{ color: 'var(--danger)', fontFamily: 'DM Mono, monospace' }}>Error: {error || 'Repo not found'}</span>
      <a href="/connect" style={{ color: 'var(--accent)', fontFamily: 'DM Mono, monospace', fontSize: 13 }}>← Connect a repo</a>
    </div>
  );
}

function WaitingForAnalysis() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 12 }}>
      <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 10 }} />
      <span style={{ color: 'var(--text-2)', fontFamily: 'DM Mono, monospace', fontSize: 13 }}>
        Analysis in progress… diff view unlocks after the first successful scan
      </span>
    </div>
  );
}
