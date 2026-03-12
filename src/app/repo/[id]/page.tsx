'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Globe, KeyRound, Activity, Layers } from 'lucide-react';
import Header from '@/components/dashboard/Header';
import MetricCard from '@/components/dashboard/MetricCard';
import CoverageHeatmap from '@/components/dashboard/CoverageHeatmap';
import QualityChart from '@/components/dashboard/QualityChart';
import LocaleBreakdown from '@/components/dashboard/LocaleBreakdown';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import PRChecks from '@/components/dashboard/PRChecks';
import Sidebar from '@/components/dashboard/Sidebar';
import type { LocaleStats, FileLocaleCell, ActivityEvent, PRCheck, RepoInfo, QualityDataPoint, CoverageDataPoint } from '@/lib/types';
import { coverageTextColor } from '@/lib/utils';

interface DashboardData {
  repo: any;
  latestRun: any;
  locales: any[];
  fileMetrics: any[];
  activity: any[];
  prChecks: any[];
  history: any[];
}

function buildRepoInfo(data: DashboardData): RepoInfo {
  const { repo, latestRun } = data;
  return {
    id:               repo.id,
    name:             repo.name,
    fullName:         repo.full_name,
    owner:            repo.owner,
    defaultBranch:    repo.default_branch,
    lastAnalyzed:     latestRun?.created_at ?? repo.updated_at,
    overallCoverage:  latestRun?.overall_coverage ?? 0,
    qualityScore:     latestRun?.quality_score ?? 0,
    totalMissingKeys: latestRun?.missing_keys ?? 0,
    activeLocales:    latestRun?.active_locales ?? 0,
    totalLocales:     latestRun?.total_locales ?? 0,
    webhookActive:    !!repo.webhook_id,
  };
}

function buildLocaleStats(locales: any[]): LocaleStats[] {
  return locales.map(l => ({
    locale:         l.locale,
    flag:           l.flag ?? '🌐',
    name:           l.locale_name ?? l.locale,
    coverage:       l.coverage ?? 0,
    qualityScore:   l.quality_score ?? 0,
    missingKeys:    l.missing_keys ?? 0,
    totalKeys:      l.total_keys ?? 0,
    translatedKeys: l.translated_keys ?? 0,
    lastUpdated:    '—',
    trend:          0,
  }));
}

function buildHeatmapData(fileMetrics: any[]): FileLocaleCell[] {
  return fileMetrics.map(f => ({
    locale:      f.locale,
    file:        f.file_path.split('/').pop()?.replace(/\.(json|yaml|yml)$/, '') ?? f.file_path,
    coverage:    f.coverage ?? 0,
    missingKeys: f.missing_keys ?? 0,
    totalKeys:   f.total_keys ?? 0,
  }));
}

function buildActivityFeed(events: any[]): ActivityEvent[] {
  return events.map(e => ({
    id:               e.id,
    type:             e.type,
    repo:             '',
    branch:           e.branch ?? 'main',
    author:           e.author ?? 'unknown',
    avatarUrl:        '',
    message:          e.message ?? '',
    timestamp:        new Date(e.created_at).toLocaleString(),
    coverageDelta:    e.coverage_delta,
    localesAffected:  e.locales_affected ?? [],
  }));
}

function buildPRChecks(checks: any[]): PRCheck[] {
  return checks.map(c => ({
    id:             c.id,
    prNumber:       c.pr_number,
    title:          c.pr_title ?? '',
    author:         c.author ?? '',
    branch:         c.branch ?? '',
    status:         c.status,
    coverageBefore: c.coverage_before ?? 0,
    coverageAfter:  c.coverage_after ?? 0,
    missingKeys:    c.missing_keys ?? 0,
    timestamp:      new Date(c.created_at).toLocaleString(),
  }));
}

function buildChartData(history: any[]): { quality: QualityDataPoint[]; coverage: CoverageDataPoint[] } {
  const quality: QualityDataPoint[] = history.map(h => ({
    date:    new Date(h.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    overall: h.quality_score ?? 0,
  }));
  const coverage: CoverageDataPoint[] = history.map(h => ({
    date:        new Date(h.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    coverage:    h.overall_coverage ?? 0,
    missingKeys: h.missing_keys ?? 0,
  }));
  return { quality, coverage };
}

export default function RepoDashboard() {
  const { id } = useParams<{ id: string }>();
  const [data, setData]         = useState<DashboardData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/repos/${id}`);
      if (!res.ok) throw new Error(`${res.status}`);
      setData(await res.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  // Poll every 30s for live updates
  useEffect(() => {
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [load]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      // Capture the current latest run id before analysis
      const currentRunId = data?.latestRun?.id ?? null;

      await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoId: id }),
      });

      // Poll every 2s until a new run appears (max 30s)
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const res = await fetch(`/api/repos/${id}`);
        if (!res.ok) break;
        const fresh = await res.json();
        if (fresh.latestRun?.id && fresh.latestRun.id !== currentRunId) {
          setData(fresh);
          break;
        }
      }
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) return <LoadingSkeleton />;
  if (error || !data?.repo) return <ErrorState error={error} />;
  if (!data.latestRun) return <WaitingForAnalysis />;

  const repo        = buildRepoInfo(data);
  const locales     = buildLocaleStats(data.locales);
  const heatmap     = buildHeatmapData(data.fileMetrics);
  const activity    = buildActivityFeed(data.activity);
  const prChecks    = buildPRChecks(data.prChecks);
  const charts      = buildChartData(data.history);

  // Coverage trend (delta vs prev run)
  const prevCov = data.history.length >= 2 ? data.history[data.history.length - 2]?.overall_coverage ?? 0 : 0;
  const covTrend = Math.round((repo.overallCoverage - prevCov) * 10) / 10;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar activeSection={activeSection} onNavigate={setActiveSection} currentRepoId={id} />
      <div style={{ flex: 1, minWidth: 0, paddingLeft: 52 }}>
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
          <Header repo={repo} onRefresh={handleRefresh} refreshing={refreshing} />

          <main style={{ maxWidth: 1440, margin: '0 auto', padding: '24px 24px 48px' }}>
            {/* Metrics */}
            <div id="section-overview" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
              <MetricCard label="Overall Coverage" value={repo.overallCoverage.toFixed(1)} unit="%" trend={covTrend} sublabel="across all locales" accent icon={<Globe size={15} />} delay={0} />
              <MetricCard label="Avg Quality Score" value={repo.qualityScore.toFixed(1)} unit="/10" sublabel="Lingo.dev scoring" icon={<Activity size={15} />} delay={80} />
              <MetricCard label="Missing Keys" value={repo.totalMissingKeys} sublabel={`${repo.totalLocales} locales tracked`} danger={repo.totalMissingKeys > 200} warning={repo.totalMissingKeys > 50 && repo.totalMissingKeys <= 200} icon={<KeyRound size={15} />} delay={160} />
              <MetricCard label="Active Locales" value={`${repo.activeLocales}/${repo.totalLocales}`} sublabel="≥50% coverage" icon={<Layers size={15} />} delay={240} />
            </div>

            {heatmap.length > 0 ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, marginBottom: 14 }}>
                  <div id="section-heatmap" className="animate-fade-up" style={{ animationDelay: '0.1s' }}>
                    <CoverageHeatmap data={heatmap} />
                  </div>
                  <div id="section-locales" className="animate-fade-up" style={{ animationDelay: '0.15s' }}>
                    <LocaleBreakdown locales={locales} />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 340px', gap: 14 }}>
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
              </>
            ) : (
              <LocaleOnlyView locales={locales} activity={activity} prChecks={prChecks} charts={charts} />
            )}

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

// ─── Sub-views & states ──────────────────────────────────────────────────────

function LocaleOnlyView({ locales, activity, prChecks, charts }: any) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 340px', gap: 14 }}>
      <div id="section-locales"><LocaleBreakdown locales={locales} /></div>
      <div id="section-trends"><QualityChart qualityData={charts.quality} coverageData={charts.coverage} /></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div id="section-activity"><ActivityFeed events={activity} /></div>
        <div id="section-prchecks"><PRChecks checks={prChecks} /></div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
      <div style={{ height: 56, background: 'var(--card)', borderBottom: '1px solid var(--border)' }} />
      <div style={{ maxWidth: 1440, margin: '24px auto', padding: '0 24px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        {[0,1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 110, borderRadius: 12 }} />)}
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
      <span style={{ color: 'var(--text-2)', fontFamily: 'DM Mono, monospace', fontSize: 13 }}>Analysis in progress… refreshing shortly</span>
    </div>
  );
}
