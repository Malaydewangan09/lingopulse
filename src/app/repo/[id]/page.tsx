'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Activity, Globe, KeyRound, Layers } from 'lucide-react';
import Header from '@/components/dashboard/Header';
import MetricCard from '@/components/dashboard/MetricCard';
import CoverageHeatmap from '@/components/dashboard/CoverageHeatmap';
import QualityChart from '@/components/dashboard/QualityChart';
import LocaleBreakdown from '@/components/dashboard/LocaleBreakdown';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import PRChecks from '@/components/dashboard/PRChecks';
import Sidebar from '@/components/dashboard/Sidebar';
import DashboardInsights from '@/components/dashboard/DashboardInsights';
import type { InsightCard } from '@/components/dashboard/DashboardInsights';
import type {
  ActivityEvent,
  CoverageDataPoint,
  FileLocaleCell,
  LocaleStats,
  PRCheck,
  QualityDataPoint,
  RepoInfo,
} from '@/lib/types';

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

interface LocaleMetricRow {
  locale: string;
  flag?: string | null;
  locale_name?: string | null;
  coverage?: NumericValue;
  quality_score?: NumericValue;
  missing_keys?: NumericValue;
  total_keys?: NumericValue;
  translated_keys?: NumericValue;
}

interface FileMetricRow {
  locale: string;
  file_path: string;
  coverage?: NumericValue;
  missing_keys?: NumericValue;
  total_keys?: NumericValue;
}

interface ActivityRow {
  id: string;
  type: ActivityEvent['type'];
  branch?: string | null;
  author?: string | null;
  message?: string | null;
  created_at?: string | null;
  coverage_delta?: NumericValue;
  locales_affected?: string[] | null;
}

interface PRCheckRow {
  id: string;
  pr_number?: NumericValue;
  pr_title?: string | null;
  author?: string | null;
  branch?: string | null;
  status: PRCheck['status'];
  coverage_before?: NumericValue;
  coverage_after?: NumericValue;
  missing_keys?: NumericValue;
  created_at?: string | null;
  updated_at?: string | null;
}

interface HistoryLocaleRow {
  run_id: string;
  locale: string;
  coverage?: NumericValue;
  quality_score?: NumericValue;
}

interface DashboardData {
  repo: RepoRow;
  latestRun: AnalysisRunRow | null;
  previousRun: AnalysisRunRow | null;
  locales: LocaleMetricRow[];
  previousLocales: LocaleMetricRow[];
  fileMetrics: FileMetricRow[];
  activity: ActivityRow[];
  prChecks: PRCheckRow[];
  history: AnalysisRunRow[];
  historyLocales: HistoryLocaleRow[];
}

const LOCALE_FILENAME_RE = /^[a-z]{2}(?:[-_][A-Za-z]{2,4})?$/;

function toNumber(value: unknown): number {
  const next = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatRelativeTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatChartDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function inferSourceLocale(locales: LocaleMetricRow[]): string | null {
  if (locales.length === 0) return null;

  const exactSource = locales.find(locale =>
    toNumber(locale.coverage) >= 100 &&
    toNumber(locale.quality_score) >= 9.9 &&
    toNumber(locale.missing_keys) === 0
  );
  if (exactSource?.locale) return exactSource.locale;

  const fullyCovered = locales.filter(locale => toNumber(locale.coverage) >= 100);
  if (fullyCovered.length === 1) return fullyCovered[0].locale;

  return [...locales]
    .sort((a, b) => {
      const keyDelta = toNumber(b.total_keys) - toNumber(a.total_keys);
      if (keyDelta !== 0) return keyDelta;
      return toNumber(b.coverage) - toNumber(a.coverage);
    })[0]?.locale ?? null;
}

function deriveModuleName(filePath: string): string {
  const parts = filePath.split('/').filter(Boolean);
  if (filePath.startsWith('[missing]/') && parts.length >= 2) {
    return parts[1];
  }

  const filename = parts[parts.length - 1]?.replace(/\.(json|yaml|yml)$/, '') ?? filePath;
  if (LOCALE_FILENAME_RE.test(filename)) {
    return parts[parts.length - 2] ?? 'messages';
  }

  return filename;
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

function buildLocaleStats(locales: LocaleMetricRow[], previousLocales: LocaleMetricRow[], lastAnalyzed?: string | null): LocaleStats[] {
  const previousCoverage = new Map(previousLocales.map(locale => [locale.locale, toNumber(locale.coverage)]));
  const sourceLocale = inferSourceLocale(locales);
  const updatedLabel = formatRelativeTime(lastAnalyzed);

  return locales.map(locale => {
    const coverage = toNumber(locale.coverage);
    const previous = previousCoverage.get(locale.locale);
    return {
      locale: locale.locale,
      flag: locale.flag ?? '🌐',
      name: locale.locale_name ?? locale.locale,
      coverage,
      qualityScore: toNumber(locale.quality_score),
      missingKeys: Math.round(toNumber(locale.missing_keys)),
      totalKeys: Math.round(toNumber(locale.total_keys)),
      translatedKeys: Math.round(toNumber(locale.translated_keys)),
      lastUpdated: updatedLabel,
      trend: previous === undefined ? 0 : round1(coverage - previous),
      isSourceLocale: locale.locale === sourceLocale,
    };
  });
}

function buildHeatmapData(fileMetrics: FileMetricRow[]): FileLocaleCell[] {
  return fileMetrics.map(metric => ({
    locale: metric.locale,
    file: deriveModuleName(metric.file_path),
    coverage: toNumber(metric.coverage),
    missingKeys: Math.round(toNumber(metric.missing_keys)),
    totalKeys: Math.round(toNumber(metric.total_keys)),
  }));
}

function buildActivityFeed(events: ActivityRow[]): ActivityEvent[] {
  return events.map(event => ({
    id: event.id,
    type: event.type,
    repo: '',
    branch: event.branch ?? 'main',
    author: event.author ?? 'unknown',
    avatarUrl: '',
    message: event.message ?? '',
    timestamp: formatRelativeTime(event.created_at),
    coverageDelta: toNumber(event.coverage_delta),
    localesAffected: event.locales_affected ?? [],
  }));
}

function buildPRChecks(checks: PRCheckRow[]): PRCheck[] {
  return checks.map(check => ({
    id: check.id,
    prNumber: Math.round(toNumber(check.pr_number)),
    title: check.pr_title ?? '',
    author: check.author ?? '',
    branch: check.branch ?? '',
    status: check.status,
    coverageBefore: toNumber(check.coverage_before),
    coverageAfter: toNumber(check.coverage_after),
    missingKeys: Math.round(toNumber(check.missing_keys)),
    timestamp: formatRelativeTime(check.updated_at ?? check.created_at),
  }));
}

function buildChartData(history: AnalysisRunRow[], historyLocales: HistoryLocaleRow[]): { quality: QualityDataPoint[]; coverage: CoverageDataPoint[] } {
  const localeHistoryByRun = new Map<string, HistoryLocaleRow[]>();
  for (const localeMetric of historyLocales) {
    const existing = localeHistoryByRun.get(localeMetric.run_id) ?? [];
    existing.push(localeMetric);
    localeHistoryByRun.set(localeMetric.run_id, existing);
  }

  const quality: QualityDataPoint[] = history.map(run => {
    const point: QualityDataPoint = {
      date: formatChartDate(run.created_at),
      overall: toNumber(run.quality_score),
    };

    for (const localeMetric of localeHistoryByRun.get(run.id) ?? []) {
      point[localeMetric.locale] = toNumber(localeMetric.quality_score);
    }

    return point;
  });

  const coverage: CoverageDataPoint[] = history.map(run => ({
    date: formatChartDate(run.created_at),
    coverage: toNumber(run.overall_coverage),
    missingKeys: Math.round(toNumber(run.missing_keys)),
  }));

  return { quality, coverage };
}

function summarizeModules(heatmap: FileLocaleCell[]) {
  const modules = new Map<string, { missingKeys: number; coverageSum: number; cells: number; locales: Set<string> }>();

  for (const cell of heatmap) {
    const current = modules.get(cell.file) ?? { missingKeys: 0, coverageSum: 0, cells: 0, locales: new Set<string>() };
    current.missingKeys += cell.missingKeys;
    current.coverageSum += cell.coverage;
    current.cells += 1;
    current.locales.add(cell.locale);
    modules.set(cell.file, current);
  }

  return [...modules.entries()]
    .map(([name, stats]) => ({
      name,
      missingKeys: stats.missingKeys,
      averageCoverage: stats.cells > 0 ? stats.coverageSum / stats.cells : 0,
      localesAffected: stats.locales.size,
    }))
    .sort((a, b) => {
      if (b.missingKeys !== a.missingKeys) return b.missingKeys - a.missingKeys;
      if (a.averageCoverage !== b.averageCoverage) return a.averageCoverage - b.averageCoverage;
      return a.name.localeCompare(b.name);
    });
}

function buildInsightCards(repo: RepoInfo, locales: LocaleStats[], heatmap: FileLocaleCell[]): InsightCard[] {
  const weakestLocale = [...locales]
    .filter(locale => !locale.isSourceLocale)
    .sort((a, b) => {
      if (b.missingKeys !== a.missingKeys) return b.missingKeys - a.missingKeys;
      return a.coverage - b.coverage;
    })[0];

  const strongestLocale = [...locales]
    .sort((a, b) => b.coverage - a.coverage)[0];

  const modules = summarizeModules(heatmap);
  const hotspot = modules[0];

  return [
    {
      eyebrow: 'Next Fix',
      title: weakestLocale
        ? `${weakestLocale.name} is missing ${weakestLocale.missingKeys} keys`
        : 'No translation gaps detected',
      detail: weakestLocale
        ? `${weakestLocale.coverage.toFixed(1)}% coverage · quality ${weakestLocale.qualityScore.toFixed(1)}/10`
        : 'Every tracked locale is aligned with the source locale in the latest scan.',
      footer: weakestLocale ? `${weakestLocale.locale} · updated ${weakestLocale.lastUpdated}` : `last scan ${formatRelativeTime(repo.lastAnalyzed)}`,
      tone: !weakestLocale ? 'success' : weakestLocale.coverage < 60 ? 'danger' : 'warning',
    },
    {
      eyebrow: 'Module Hotspot',
      title: hotspot
        ? `${hotspot.name} is dragging coverage`
        : 'No module hotspot found',
      detail: hotspot
        ? `${hotspot.missingKeys} missing keys across ${hotspot.localesAffected} locales · ${hotspot.averageCoverage.toFixed(1)}% average coverage`
        : 'We need file-level module data before this card can rank the weakest area.',
      footer: hotspot ? 'best next target for a focused translation pass' : 'module hotspot detection activates when file metrics exist',
      tone: hotspot ? (hotspot.averageCoverage < 60 ? 'danger' : 'warning') : 'neutral',
    },
    {
      eyebrow: 'Repo Signal',
      title: `${new Set(heatmap.map(cell => cell.file)).size || 0} modules · ${repo.totalLocales} locales tracked`,
      detail: repo.webhookActive
        ? 'Webhook is live, so pushes and pull requests should update the dashboard automatically.'
        : 'Manual refresh mode is active. Connecting a webhook will make the dashboard feel live.',
      footer: `branch ${repo.defaultBranch} · last scan ${formatRelativeTime(repo.lastAnalyzed)}`,
      tone: repo.webhookActive ? 'accent' : 'neutral',
    },
    {
      eyebrow: 'Best Momentum',
      title: strongestLocale
        ? `${strongestLocale.name} leads at ${strongestLocale.coverage.toFixed(1)}%`
        : 'Waiting for locale data',
      detail: strongestLocale
        ? strongestLocale.isSourceLocale
          ? 'This is the inferred source locale used as the coverage baseline for the repo.'
          : strongestLocale.trend === 0
            ? `${strongestLocale.missingKeys} keys left · stable versus the previous run`
            : `${strongestLocale.missingKeys} keys left · ${strongestLocale.trend > 0 ? '+' : ''}${strongestLocale.trend.toFixed(1)} pts versus the previous run`
        : 'Run another analysis to surface momentum and quality leaders.',
      footer: strongestLocale ? `${strongestLocale.locale}${strongestLocale.isSourceLocale ? ' · source locale' : ''}` : 'quality trends get better after multiple runs',
      tone: strongestLocale ? (strongestLocale.isSourceLocale ? 'neutral' : strongestLocale.coverage >= 88 ? 'success' : 'accent') : 'neutral',
    },
  ];
}

export default function RepoDashboard() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const [activeSection, setActiveSection] = useState('overview');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/repos/${id}`);
      if (!res.ok) throw new Error(`${res.status}`);
      setData(await res.json());
      setError('');
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load]);

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
    } catch (error: unknown) {
      setRefreshError(error instanceof Error ? error.message : 'Failed to analyze repo');
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return <LoadingSkeleton />;
  if (error || !data?.repo) return <ErrorState error={error} />;
  if (!data.latestRun) return <WaitingForAnalysis />;

  const repo = buildRepoInfo(data);
  const locales = buildLocaleStats(data.locales, data.previousLocales, repo.lastAnalyzed);
  const heatmap = buildHeatmapData(data.fileMetrics);
  const activity = buildActivityFeed(data.activity);
  const prChecks = buildPRChecks(data.prChecks);
  const charts = buildChartData(data.history, data.historyLocales);
  const insights = buildInsightCards(repo, locales, heatmap);

  const previousCoverage = data.previousRun ? toNumber(data.previousRun.overall_coverage) : 0;
  const coverageTrend = data.previousRun ? round1(repo.overallCoverage - previousCoverage) : 0;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar activeSection={activeSection} onNavigate={setActiveSection} currentRepoId={id} />
      <div className="dashboard-content-offset" style={{ flex: 1, minWidth: 0 }}>
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
          <Header repo={repo} onRefresh={handleRefresh} refreshing={refreshing} />

          <main className="dashboard-main">
            <div id="section-overview" className="dashboard-metrics-grid">
              <MetricCard label="Overall Coverage" value={repo.overallCoverage.toFixed(1)} unit="%" trend={coverageTrend} sublabel="across all locales" accent icon={<Globe size={15} />} delay={0} />
              <MetricCard label="Avg Quality Score" value={repo.qualityScore.toFixed(1)} unit="/10" sublabel="Lingo.dev scoring" icon={<Activity size={15} />} delay={80} />
              <MetricCard label="Missing Keys" value={repo.totalMissingKeys} sublabel={`${repo.totalLocales} locales tracked`} danger={repo.totalMissingKeys > 200} warning={repo.totalMissingKeys > 50 && repo.totalMissingKeys <= 200} icon={<KeyRound size={15} />} delay={160} />
              <MetricCard label="Active Locales" value={`${repo.activeLocales}/${repo.totalLocales}`} sublabel="≥50% coverage" icon={<Layers size={15} />} delay={240} />
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

            <DashboardInsights cards={insights} />

            <div className="dashboard-top-grid">
              <div id="section-heatmap" className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
                <CoverageHeatmap data={heatmap} locales={locales} />
              </div>
              <div id="section-locales" className="animate-fade-up" style={{ animationDelay: '0.15s' }}>
                <LocaleBreakdown locales={locales} />
              </div>
            </div>

            <div className="dashboard-bottom-grid">
              <div id="section-trends" className="animate-fade-up" style={{ animationDelay: '0.2s' }}>
                <QualityChart qualityData={charts.quality} coverageData={charts.coverage} />
              </div>
              <div id="section-activity" className="animate-fade-up" style={{ animationDelay: '0.25s' }}>
                <ActivityFeed events={activity} />
              </div>
              <div id="section-prchecks" className="animate-fade-up" style={{ animationDelay: '0.3s' }}>
                <PRChecks checks={prChecks} />
              </div>
            </div>

            <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
              powered by <a href="https://lingo.dev" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>lingo.dev</a>
              {' '}· CLI · SDK · CI/CD · Quality Scoring
            </div>
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
        Analysis in progress… heatmap and trends will populate after the first successful scan
      </span>
    </div>
  );
}
