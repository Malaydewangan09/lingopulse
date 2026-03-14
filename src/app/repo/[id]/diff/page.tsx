'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Activity, GitCompareArrows, KeyRound, ShieldAlert } from 'lucide-react';
import Header from '@/components/dashboard/Header';
import MetricCard from '@/components/dashboard/MetricCard';
import ProductPageLoader from '@/components/dashboard/ProductPageLoader';
import ScanDiffPanel from '@/components/dashboard/ScanDiffPanel';
import Sidebar from '@/components/dashboard/Sidebar';
import { fetchRepoDataCached, peekRepoData, setRepoDataCache } from '@/lib/repo-data-cache';
import type { DraftFixResult, RepoInfo, ScanDiffSummary } from '@/lib/types';
import { LOCALE_STATS, generateHeatmapData, ACTIVITY, PR_CHECKS } from '@/lib/mock-data';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  locales?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  previousLocales?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fileMetrics?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  activity?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  prChecks?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  history?: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  historyLocales?: any[];
  scanDiff: ScanDiffSummary | null;
  latestDraftFix: DraftFixResult | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  incidents?: any[];
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
  const [data, setData] = useState<DashboardData | null>(() => peekRepoData<DashboardData>(id));
  const [loading, setLoading] = useState(() => !peekRepoData<DashboardData>(id));
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const [creatingFixPr, setCreatingFixPr] = useState(false);
  const [fixPrError, setFixPrError] = useState('');
  const [fixPrResult, setFixPrResult] = useState<DraftFixResult | null>(null);

  const load = useCallback(async (options: { force?: boolean } = {}) => {
    const isDemo = id === 'demo';
    if (isDemo) {
      const localeMetrics = LOCALE_STATS.map(l => ({
        locale: l.locale,
        locale_name: l.name,
        flag: l.flag,
        coverage: Number(l.coverage),
        quality_score: Number(l.qualityScore),
        missing_keys: Number(l.missingKeys),
        total_keys: Number(l.totalKeys),
        translated_keys: Number(l.translatedKeys),
      }));
      const heatmapData = generateHeatmapData();
      const demoData: DashboardData = {
        repo: { id: 'demo', name: 'demo-app', full_name: 'demo/demo-app', owner: 'demo', default_branch: 'main', updated_at: new Date().toISOString() },
        latestRun: { id: 'demo-run', created_at: new Date().toISOString(), overall_coverage: 78.4, quality_score: 8.2, missing_keys: 44, active_locales: 8, total_locales: 8 },
        previousRun: { id: 'demo-prev', created_at: new Date(Date.now() - 86400000).toISOString(), overall_coverage: 77.1, quality_score: 8.0, missing_keys: 52, active_locales: 8, total_locales: 8 },
        locales: localeMetrics,
        previousLocales: localeMetrics.map(l => ({ ...l, coverage: Math.max(0, Number(l.coverage) - 2) })),
        fileMetrics: heatmapData.map(h => ({ locale: h.locale, file_path: h.file, coverage: h.coverage, missing_keys: h.missingKeys, total_keys: h.totalKeys })),
        activity: ACTIVITY.slice(0, 4).map(a => ({ id: a.id, type: a.type, branch: a.branch ?? null, author: a.author ?? null, message: a.message ?? null, created_at: new Date().toISOString(), coverage_delta: a.coverageDelta ?? 0, locales_affected: a.localesAffected ?? null })),
        prChecks: PR_CHECKS.slice(0, 3).map(p => ({ id: p.id, pr_number: p.prNumber, pr_title: p.title, author: p.author, branch: p.branch, status: p.status, coverage_before: p.coverageBefore, coverage_after: p.coverageAfter, missing_keys: p.missingKeys, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })),
        history: [],
        historyLocales: [],
        scanDiff: {
          hasBaseline: true, status: 'watch', headline: 'auth needs attention', summary: '44 missing keys at 95.4% coverage', recommendation: 'Start with auth: 11 missing keys at 94.7% coverage.',
          coverageDelta: 0, qualityDelta: -0.1, missingKeysDelta: 0, totalMissingKeys: 44,
          regressedLocales: [
            { key: 'ja', label: 'Japanese', currentCoverage: 89.0, currentMissingKeys: 15, coverageDelta: -1.2, missingDelta: 8 },
            { key: 'ar', label: 'Arabic', currentCoverage: 82.3, currentMissingKeys: 21, coverageDelta: -0.8, missingDelta: 5 },
          ],
          improvedLocales: [{ key: 'es', label: 'Spanish', currentCoverage: 97.1, currentMissingKeys: 4, coverageDelta: 1.5, missingDelta: -12 }],
          regressedModules: [{ key: 'auth', label: 'auth', currentCoverage: 94.7, currentMissingKeys: 11, coverageDelta: -5.3, missingDelta: 11 }],
          improvedModules: [],
        },
        latestDraftFix: null,
        incidents: [],
      };
      setData(demoData);
      setLoading(false);
      return;
    }

    try {
      const next = await fetchRepoDataCached<DashboardData>(id, { force: options.force });
      setData(next);
      setError('');
    } catch (nextError: unknown) {
      setError(nextError instanceof Error ? nextError.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { void load(); }, [load]);

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
        const fresh = await fetchRepoDataCached<DashboardData>(id, { force: true });
        if (fresh.latestRun?.id && fresh.latestRun.id !== currentRunId) {
          setData(fresh);
          setRepoDataCache(id, fresh);
          return;
        }
      }

      await load({ force: true });
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
      await load({ force: true });
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
      <div style={{ paddingLeft: 52, minHeight: '100vh' }}>
      <Sidebar activeSection="overview" currentRepoId={id} variant="minimal" />
      <div style={{ minWidth: 0 }}>
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
    <ProductPageLoader
      title="Loading scan diff"
      subtitle="Preparing the latest comparison, regressions, and recovery signals."
    />
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
    <ProductPageLoader
      title="Scan diff needs the first analysis"
      subtitle="Run the first repo analysis to unlock comparisons between scans."
    />
  );
}
