'use client';
import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Header from '@/components/dashboard/Header';
import CoverageHeatmap from '@/components/dashboard/CoverageHeatmap';
import QualityChart from '@/components/dashboard/QualityChart';
import LocaleBreakdown from '@/components/dashboard/LocaleBreakdown';
import PRChecks from '@/components/dashboard/PRChecks';
import Sidebar from '@/components/dashboard/Sidebar';
import LiveIncidentsPanel from '@/components/dashboard/LiveIncidentsPanel';
import type {
  ActivityEvent,
  CoverageDataPoint,
  DraftFixResult,
  FileLocaleCell,
  LocaleStats,
  PRCheck,
  QualityDataPoint,
  RepoInfo,
  ScanDiffSummary,
  TranslationIncident,
} from '@/lib/types';

type NumericValue = number | string | null | undefined;

interface RepoRow {
  id: string;
  name: string;
  full_name: string;
  owner: string;
  default_branch: string;
  updated_at: string;
  public_ingest_key?: string | null;
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

interface IncidentRow {
  id: string;
  issue_type: TranslationIncident['issueType'];
  locale: string;
  route?: string | null;
  translation_key?: string | null;
  sample_text?: string | null;
  fallback_locale?: string | null;
  first_seen_at?: string | null;
  last_seen_at?: string | null;
  hit_count?: NumericValue;
  app_version?: string | null;
  commit_sha?: string | null;
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
  scanDiff: ScanDiffSummary | null;
  latestDraftFix: DraftFixResult | null;
  incidents: IncidentRow[];
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

function summarizePRCheck(check: PRCheckRow): string {
  const coverageBefore = toNumber(check.coverage_before);
  const coverageAfter = toNumber(check.coverage_after);
  const delta = round1(coverageAfter - coverageBefore);
  const missingKeys = Math.round(toNumber(check.missing_keys));

  if (check.status === 'failing') {
    if (delta < 0 && missingKeys > 0) {
      return `Coverage dropped ${Math.abs(delta).toFixed(1)} pts and ${missingKeys} missing keys still need fixes.`;
    }
    if (delta < 0) {
      return `Coverage dropped ${Math.abs(delta).toFixed(1)} pts in this PR scan.`;
    }
    return `${missingKeys} missing keys are blocking merge.`;
  }

  if (check.status === 'warning') {
    if (delta < 0) {
      return `Coverage softened by ${Math.abs(delta).toFixed(1)} pts. Review the touched locale files before merge.`;
    }
    return `${missingKeys} missing keys remain in the current PR snapshot.`;
  }

  if (missingKeys > 0) {
    return `${missingKeys} missing keys are present, but no blocking regression was detected.`;
  }

  return 'No localization regression detected in this PR scan.';
}

function buildLiveIncidents(incidents: IncidentRow[]): TranslationIncident[] {
  return incidents.map(incident => ({
    id: incident.id,
    issueType: incident.issue_type,
    locale: incident.locale,
    route: incident.route ?? '/',
    translationKey: incident.translation_key ?? '',
    sampleText: incident.sample_text ?? '',
    fallbackLocale: incident.fallback_locale ?? null,
    firstSeenAt: incident.first_seen_at ?? new Date().toISOString(),
    lastSeenAt: incident.last_seen_at ?? new Date().toISOString(),
    hitCount: Math.max(1, Math.round(toNumber(incident.hit_count))),
    appVersion: incident.app_version ?? null,
    commitSha: incident.commit_sha ?? null,
  }));
}

function buildPRChecks(checks: PRCheckRow[], repoFullName: string): PRCheck[] {
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
    summary: summarizePRCheck(check),
    prUrl: `https://github.com/${repoFullName}/pull/${Math.round(toNumber(check.pr_number))}`,
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

export default function RepoDashboard() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshError, setRefreshError] = useState('');
  const [syncingPrChecks, setSyncingPrChecks] = useState(false);
  const [prSyncMessage, setPrSyncMessage] = useState('');
  const [activeSection, setActiveSection] = useState('overview');
  const [workspaceTab, setWorkspaceTab] = useState<'coverage' | 'locales' | 'prchecks' | 'trends'>('coverage');

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

  // Poll fast (5s) while no analysis data yet, then slow down to 30s
  const hasRuns = data?.latestRun != null;
  useEffect(() => {
    const interval = hasRuns ? 30_000 : 5_000;
    const timer = setInterval(load, interval);
    return () => clearInterval(timer);
  }, [load, hasRuns]);

  useEffect(() => {
    if (activeSection === 'overview') setWorkspaceTab('coverage');
    if (activeSection === 'locales') setWorkspaceTab('locales');
    if (activeSection === 'trends') setWorkspaceTab('trends');
  }, [activeSection]);

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

  const handleSyncPrChecks = async () => {
    if (syncingPrChecks) return;

    setSyncingPrChecks(true);
    setPrSyncMessage('');

    try {
      const res = await fetch(`/api/repos/${id}/sync-prs`, { method: 'POST' });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload.error ?? `PR sync failed (${res.status})`);
      }

      setPrSyncMessage(payload.message ?? 'PR sync complete.');
      await load();
    } catch (nextError: unknown) {
      setPrSyncMessage(nextError instanceof Error ? nextError.message : 'Failed to sync PR checks');
    } finally {
      setSyncingPrChecks(false);
    }
  };

  if (loading) return <LoadingSkeleton />;
  if (error || !data?.repo) return <ErrorState error={error} />;
  if (!data.latestRun) return <WaitingForAnalysis />;

  const repo = buildRepoInfo(data);
  const locales = buildLocaleStats(data.locales, data.previousLocales, repo.lastAnalyzed);
  const heatmap = buildHeatmapData(data.fileMetrics);
  const incidents = buildLiveIncidents(data.incidents);
  const prChecks = buildPRChecks(data.prChecks, data.repo.full_name);
  const charts = buildChartData(data.history, data.historyLocales);
  const workspaceTabs = [
    { id: 'coverage', label: 'coverage map', description: 'module-level translation coverage by locale' },
    { id: 'locales', label: 'locale health', description: 'rank locales by coverage, quality, and missing keys' },
    { id: 'prchecks', label: 'PR checks', description: 'review only the pull requests Lingo Pulse has analyzed' },
    { id: 'trends', label: 'trend analysis', description: 'track scan history across coverage and quality' },
  ] as const;
  const activeWorkspaceTab = workspaceTabs.find(tab => tab.id === workspaceTab) ?? workspaceTabs[0];

  const previousCoverage = data.previousRun ? toNumber(data.previousRun.overall_coverage) : 0;
  const coverageTrend = data.previousRun ? round1(repo.overallCoverage - previousCoverage) : 0;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar activeSection={activeSection} onNavigate={setActiveSection} currentRepoId={id} />
      <div className="dashboard-content-offset" style={{ flex: 1, minWidth: 0 }}>
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
          <Header repo={repo} scanDiff={data.scanDiff} onRefresh={handleRefresh} refreshing={refreshing} />

          <main className="dashboard-main">
            <div
              id="section-overview"
              className="animate-fade-up"
              style={{
                animationDelay: '0.04s',
                marginBottom: 14,
                display: 'grid',
                gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                gap: 0,
                border: '1px solid var(--border)',
                borderRadius: 12,
                background: 'var(--card)',
                overflow: 'hidden',
              }}
            >
              {[
                { label: 'coverage', value: `${repo.overallCoverage.toFixed(1)}%`, meta: coverageTrend === 0 ? 'stable' : `${coverageTrend > 0 ? '+' : ''}${coverageTrend.toFixed(1)} pts`, tone: 'var(--accent)' },
                { label: 'quality', value: `${repo.qualityScore.toFixed(1)}/10`, meta: 'lingo.dev', tone: 'var(--text-1)' },
                { label: 'missing keys', value: `${repo.totalMissingKeys}`, meta: `${repo.totalLocales} locales`, tone: repo.totalMissingKeys > 0 ? 'var(--danger)' : 'var(--success)' },
                { label: 'live incidents', value: `${incidents.length}`, meta: incidents.length > 0 ? 'needs review' : 'quiet', tone: incidents.length > 0 ? 'var(--danger)' : 'var(--text-1)' },
              ].map((item, index) => (
                <div
                  key={item.label}
                  style={{
                    padding: '14px 16px',
                    borderLeft: index === 0 ? 'none' : '1px solid var(--border)',
                    display: 'grid',
                    gap: 6,
                  }}
                >
                  <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {item.label}
                  </div>
                  <div style={{ fontSize: 26, lineHeight: 1, fontWeight: 600, color: item.tone }}>
                    {item.value}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>
                    {item.meta}
                  </div>
                </div>
              ))}
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

            {incidents.length > 0 && (
              <div id="section-incidents" className="animate-fade-up" style={{ animationDelay: '0.16s', marginBottom: 14 }}>
                <LiveIncidentsPanel
                  incidents={incidents}
                  repoId={data.repo.id}
                  ingestKey={data.repo.public_ingest_key ?? null}
                  compact
                />
              </div>
            )}

            <div id="section-workspace" className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
              <div
                style={{
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
                    Workspace view
                  </div>
                  <div style={{ fontSize: 18, color: 'var(--text-1)', fontWeight: 600, marginBottom: 4 }}>
                    {activeWorkspaceTab.label}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-sans)' }}>
                    {activeWorkspaceTab.description}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    flexWrap: 'wrap',
                    minWidth: 0,
                    width: 'fit-content',
                    maxWidth: '100%',
                    padding: 6,
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                  }}
                >
                  {workspaceTabs.map(tab => {
                    const active = workspaceTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          setWorkspaceTab(tab.id);
                          setActiveSection(
                            tab.id === 'coverage'
                              ? 'overview'
                              : tab.id === 'locales'
                              ? 'locales'
                              : tab.id === 'prchecks'
                              ? 'prchecks'
                              : 'trends',
                          );
                        }}
                        style={{
                          height: 34,
                          padding: '0 12px',
                          borderRadius: 8,
                          border: `1px solid ${active ? 'var(--border-bright)' : 'transparent'}`,
                          background: active ? 'var(--card)' : 'transparent',
                          color: active ? 'var(--text-1)' : 'var(--text-2)',
                          fontSize: 12,
                          fontWeight: active ? 600 : 500,
                          fontFamily: 'var(--font-sans)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          transition: 'background 0.15s, border-color 0.15s, color 0.15s',
                          boxShadow: active ? 'inset 0 0 0 1px rgba(255,255,255,0.02)' : 'none',
                        }}
                        onMouseEnter={e => {
                          if (!active) {
                            e.currentTarget.style.background = 'var(--card)';
                            e.currentTarget.style.color = 'var(--text-1)';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!active) {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.color = 'var(--text-2)';
                          }
                        }}
                      >
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            background: active ? 'var(--accent)' : 'var(--border-bright)',
                            opacity: active ? 1 : 0.85,
                            flexShrink: 0,
                          }}
                        />
                        {tab.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div id={workspaceTab === 'coverage' ? 'section-heatmap' : workspaceTab === 'locales' ? 'section-locales' : workspaceTab === 'prchecks' ? 'section-prchecks' : 'section-trends'}>
                {workspaceTab === 'coverage' && (
                  <CoverageHeatmap data={heatmap} locales={locales} />
                )}
                {workspaceTab === 'locales' && (
                  <LocaleBreakdown locales={locales} />
                )}
                {workspaceTab === 'prchecks' && (
                  <PRChecks
                    checks={prChecks}
                    latestDraftFix={data.latestDraftFix}
                    webhookActive={repo.webhookActive}
                    syncing={syncingPrChecks}
                    syncMessage={prSyncMessage}
                    onSync={handleSyncPrChecks}
                  />
                )}
                {workspaceTab === 'trends' && (
                  <QualityChart qualityData={charts.quality} coverageData={charts.coverage} locales={locales} />
                )}
              </div>
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
