'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, Copy, Link2, RadioTower, ShieldAlert, TerminalSquare, X, BookOpen } from 'lucide-react';
import Header from '@/components/dashboard/Header';
import MetricCard from '@/components/dashboard/MetricCard';
import ProductPageLoader from '@/components/dashboard/ProductPageLoader';
import Sidebar from '@/components/dashboard/Sidebar';
import LiveIncidentsFullView from '@/components/dashboard/LiveIncidentsFullView';
import { fetchRepoDataCached, peekRepoData, getActiveAnalysis, setActiveAnalysis } from '@/lib/repo-data-cache';
import type { RepoInfo, ScanDiffSummary, TranslationIncident } from '@/lib/types';

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

interface IncidentRow {
  id: string;
  issue_type?: string | null;
  locale?: string | null;
  route?: string | null;
  translation_key?: string | null;
  sample_text?: string | null;
  last_seen_at?: string | null;
  hit_count?: NumericValue;
  app_version?: string | null;
}

interface DashboardData {
  repo: RepoRow;
  latestRun: AnalysisRunRow | null;
  scanDiff: ScanDiffSummary | null;
  incidents: IncidentRow[];
}

function toNumber(value: unknown): number {
  const next = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
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

function formatRelativeTime(value?: string | null) {
  if (!value) return 'recently';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';

  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function labelForIncident(issueType?: string | null) {
  switch (issueType) {
    case 'raw_key':
      return 'raw key';
    case 'placeholder':
      return 'placeholder leak';
    case 'fallback':
      return 'fallback copy';
    case 'empty':
      return 'empty translation';
    default:
      return 'incident';
  }
}

function SnippetBlock({
  tabs,
  activeTab,
  onTabChange,
}: {
  tabs: Array<{ id: string; label: string; title: string; description: string; code: string }>;
  activeTab: string;
  onTabChange: (id: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const activeSnippet = tabs.find(tab => tab.id === activeTab) ?? tabs[0];

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeSnippet.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {tabs.map(tab => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              style={{
                height: 28, padding: '0 10px', borderRadius: 7,
                border: `1px solid ${active ? 'var(--border-bright)' : 'transparent'}`,
                background: active ? 'var(--card-hover)' : 'transparent',
                color: active ? 'var(--text-1)' : 'var(--text-3)',
                fontSize: 11, fontWeight: active ? 600 : 400,
                fontFamily: 'var(--font-sans)', cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          );
        })}
        <button
          onClick={() => void handleCopy()}
          className="mono-badge mono-badge-sm"
          style={{ marginLeft: 'auto', cursor: 'pointer', color: copied ? 'var(--success)' : 'var(--text-2)', border: '1px solid var(--border)', background: 'var(--surface)', flexShrink: 0 }}
        >
          {copied ? <CheckCircle2 size={11} /> : <Copy size={11} />}
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre style={{
        margin: 0,
        padding: '16px',
        overflowX: 'auto',
        background: 'var(--surface)',
        color: 'var(--text-2)',
        fontSize: 11,
        fontFamily: 'var(--font-mono)',
        lineHeight: 1.7,
      }}>
        <code>{activeSnippet.code}</code>
      </pre>
    </div>
  );
}

function EnvConfigBlock({ repoId, ingestKey, apiBase }: { repoId: string; ingestKey: string; apiBase: string }) {
  const [copied, setCopied] = useState(false);
  const text = `LINGO_REPO_ID="${repoId}"\nLINGO_INGEST_KEY="${ingestKey}"\nLINGO_API_BASE="${apiBase}"`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch { /* ignore */ }
  };

  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          env config
        </span>
        <button
          onClick={() => void handleCopy()}
          className="mono-badge mono-badge-sm"
          style={{ cursor: 'pointer', color: copied ? 'var(--success)' : 'var(--text-2)', border: '1px solid var(--border)', background: 'var(--surface)' }}
        >
          {copied ? <CheckCircle2 size={11} /> : <Copy size={11} />}
          {copied ? 'copied' : 'copy all'}
        </button>
      </div>
      <pre style={{ margin: 0, padding: '14px 16px', background: 'var(--surface)', fontSize: 11, fontFamily: 'var(--font-mono)', lineHeight: 1.8, color: 'var(--text-2)' }}>
        {[
          { key: 'LINGO_REPO_ID', val: repoId },
          { key: 'LINGO_INGEST_KEY', val: ingestKey },
          { key: 'LINGO_API_BASE', val: apiBase },
        ].map(({ key, val }) => (
          <div key={key}>
            <span style={{ color: 'var(--accent)' }}>{key}</span>
            <span style={{ color: 'var(--text-3)' }}>{"="}</span>
            <span style={{ color: 'var(--text-1)' }}>{`"${val}"`}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}

export default function RepoSdkPage() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<DashboardData | null>(() => peekRepoData<DashboardData>(id));
  const [loading, setLoading] = useState(() => !peekRepoData<DashboardData>(id));
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeSnippet, setActiveSnippet] = useState('plain');
  const [showDocs, setShowDocs] = useState(false);

  const load = useCallback(async (options: { force?: boolean } = {}) => {
    const isDemo = id === 'demo';
    if (isDemo) {
      const demoData: DashboardData = {
        repo: { id: 'demo', name: 'demo-app', full_name: 'demo/demo-app', owner: 'demo', default_branch: 'main', updated_at: new Date().toISOString(), public_ingest_key: 'pk_demo_abc123' },
        latestRun: { id: 'demo-run', created_at: new Date().toISOString(), overall_coverage: 78.4, quality_score: 8.2, missing_keys: 44, active_locales: 8, total_locales: 8 },
        scanDiff: null,
        incidents: [
          { id: '1', issue_type: 'fallback', locale: 'ja', translation_key: 'common.welcome', route: '/', sample_text: 'Welcome', last_seen_at: new Date(Date.now() - 3600000).toISOString() },
          { id: '2', issue_type: 'placeholder', locale: 'de', translation_key: 'auth.login_btn', route: '/login', sample_text: 'Login {0}', last_seen_at: new Date(Date.now() - 7200000).toISOString() },
          { id: '3', issue_type: 'empty', locale: 'fr', translation_key: 'dashboard.title', route: '/dashboard', sample_text: '', last_seen_at: new Date(Date.now() - 86400000).toISOString() },
        ],
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

  // Continue analysis polling if user navigated away and came back
  const [continuePollingStarted, setContinuePollingStarted] = useState(false);
  useEffect(() => {
    console.log('[SDK] useEffect run, continuePollingStarted:', continuePollingStarted);
    
    if (continuePollingStarted) {
      console.log('[SDK] Already started, returning');
      return;
    }
    
    const active = getActiveAnalysis();
    console.log('[SDK] getActiveAnalysis result:', active, 'id:', id);
    
    if (!active) {
      console.log('[SDK] No active analysis');
      return;
    }
    
    if (active.repoId !== id) {
      console.log('[SDK] Wrong repoId, stored:', active.repoId, 'current:', id);
      return;
    }

    setContinuePollingStarted(true);
    console.log('[SDK] Starting continuePolling now!');

    const pollForAnalysis = async () => {
      setRefreshing(true);
      try {
        for (let attempt = 0; attempt < 15; attempt += 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
          const fresh = await fetchRepoDataCached<DashboardData>(id, { force: true });
          console.log('[SDK] Attempt', attempt, 'latestRun:', fresh.latestRun?.id, 'previousRunId:', active.previousRunId);
          if (fresh.latestRun?.id && fresh.latestRun.id !== active.previousRunId) {
            setData(fresh);
            console.log('[SDK] Analysis complete!');
            return;
          }
        }
        await load({ force: true });
      } finally {
        setRefreshing(false);
      }
    };

    pollForAnalysis();
  }, [id, load]);

  useEffect(() => {
    const timer = setInterval(() => { void load({ force: true }); }, 15_000);
    return () => clearInterval(timer);
  }, [load]);

  const origin = typeof window !== 'undefined' ? window.location.origin : (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000');

  const snippets = useMemo(() => {
    const repoId = data?.repo.id ?? 'repo-id';
    const ingestKey = data?.repo.public_ingest_key ?? 'public-ingest-key';
    const setup = `import { LingoPulse } from '@/lib/sdk/lingopulse';

const pulse = new LingoPulse({
  repoId: '${repoId}',
  ingestKey: '${ingestKey}',
  apiBase: '${origin}',
  appVersion: 'web@1.0.0',
});`;

    const browserSetup = `<script src="${origin}/lingopulse-browser.js"></script>
<script>
  const pulse = new window.LingoPulse({
    repoId: '${repoId}',
    ingestKey: '${ingestKey}',
    apiBase: '${origin}',
    appVersion: 'static-site@1.0.0',
  });
</script>`;

    const wrap = `const t = pulse.wrapTranslator(i18n.t.bind(i18n), (key: string) => ({
  locale: i18n.language,
  route: window.location.pathname,
  translationKey: key,
}));

const label = t('checkout.pay_now');`;

    const inspect = `const label = pulse.inspect(i18n.t('checkout.pay_now'), {
  locale: i18n.language,
  route: window.location.pathname,
  translationKey: 'checkout.pay_now',
});`;

    const payload = `POST ${origin}/api/incidents/report

{
  "repoId": "${repoId}",
  "ingestKey": "${ingestKey}",
  "issueType": "raw_key",
  "locale": "ja",
  "route": "/checkout",
  "translationKey": "checkout.pay_now",
  "sampleText": "checkout.pay_now",
  "appVersion": "web@1.0.0"
}`;

    return { setup, browserSetup, wrap, inspect, payload };
  }, [data?.repo.id, data?.repo.public_ingest_key, origin]);

  if (loading) return <LoadingSkeleton />;
  if (error || !data?.repo) return <ErrorState error={error} />;
  if (!data.latestRun) return <WaitingForAnalysis />;

  const repo = buildRepoInfo(data);
  const snippetTabs = [
    {
      id: 'plain',
      label: 'Plain HTML / JS',
      title: 'Plain HTML / JS setup',
      description: 'Drop one script tag into any static frontend and initialize the reporter.',
      code: snippets.browserSetup,
    },
    {
      id: 'react',
      label: 'React / module',
      title: 'React / module setup',
      description: 'Initialize the SDK in a modular frontend and keep one shared client instance.',
      code: snippets.setup,
    },
    {
      id: 'wrap',
      label: 'Wrap translator',
      title: 'Wrap your translator',
      description: 'Use the SDK around your translation function so incidents are captured automatically.',
      code: snippets.wrap,
    },
    {
      id: 'inspect',
      label: 'Direct inspect',
      title: 'Inspect values directly',
      description: 'Manually report a rendered value if your app uses a custom i18n layer.',
      code: snippets.inspect,
    },
    {
      id: 'payload',
      label: 'Raw payload',
      title: 'Raw ingest payload',
      description: 'Send incidents directly over HTTP if you do not want to use the helper SDK.',
      code: snippets.payload,
    },
  ] as const;

  return (
    <div style={{ paddingLeft: 52, minHeight: '100vh' }}>
      <Sidebar activeSection="overview" currentRepoId={id} variant="minimal" />
      <div style={{ minWidth: 0 }}>
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
          <Header repo={repo} scanDiff={data.scanDiff} onRefresh={async () => { setRefreshing(true); await load({ force: true }); setRefreshing(false); }} refreshing={refreshing} />

          <main className="dashboard-main">
            <div className="dashboard-metrics-grid">
              <MetricCard label="SDK Status" value="ready" sublabel="browser incident reporter" accent icon={<RadioTower size={15} />} />
              <MetricCard label="Repo ID" value={data.repo.id.slice(0, 8)} sublabel="scopes incident ingest" icon={<ShieldAlert size={15} />} />
              <MetricCard label="Open Incidents" value={data.incidents.length} sublabel="live production reports" danger={data.incidents.length > 0} icon={<TerminalSquare size={15} />} />
              <MetricCard label="Endpoint" value="/api" sublabel="cross-origin ingest enabled" icon={<Copy size={15} />} />
            </div>

            {/* Setup Guide - Credentials & Status side by side */}
            <div style={{ marginBottom: 16, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
                  setup guide
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>repo id</div>
                    <div style={{ fontSize: 12, color: 'var(--text-1)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{data.repo.id}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>ingest key</div>
                    <div style={{ fontSize: 12, color: 'var(--text-1)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{data.repo.public_ingest_key}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginBottom: 4 }}>api base</div>
                    <div style={{ fontSize: 12, color: 'var(--text-1)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>{origin}</div>
                  </div>
                </div>
              </div>

              <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                <EnvConfigBlock repoId={data.repo.id} ingestKey={data.repo.public_ingest_key ?? ''} apiBase={origin} />
              </div>
            </div>

            {/* Live Incidents */}
            {data.incidents.length > 0 && (
              <LiveIncidentsFullView 
                incidents={data.incidents.map(i => ({
                  id: i.id,
                  issueType: (i.issue_type ?? 'raw_key') as TranslationIncident['issueType'],
                  locale: i.locale ?? 'unknown',
                  route: i.route ?? '/',
                  translationKey: i.translation_key || i.sample_text || 'unknown key',
                  sampleText: i.sample_text || 'no sample',
                  fallbackLocale: null,
                  firstSeenAt: i.last_seen_at ?? new Date().toISOString(),
                  lastSeenAt: i.last_seen_at ?? new Date().toISOString(),
                  hitCount: toNumber(i.hit_count),
                  appVersion: i.app_version ?? undefined,
                  commitSha: null,
                }))} 
                repoId={data.repo.id}
              />
            )}

            {/* Floating Docs Button */}
            <div style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 100, display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                padding: '6px 12px',
                borderRadius: 8,
                background: 'var(--card)',
                border: '1px solid var(--border)',
                fontSize: 11,
                color: 'var(--text-2)',
                fontFamily: 'var(--font-mono)',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              }}>
                Integration guide
              </div>
              <div
                onClick={() => setShowDocs(true)}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 24,
                  background: 'linear-gradient(135deg, var(--accent) 0%, #7C3AED 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 16px rgba(124, 58, 237, 0.4)',
                  animation: 'floatPulse 2s ease-in-out infinite',
                }}
              >
                <BookOpen size={20} color="white" />
              </div>
            </div>

            {/* Docs Side Panel */}
            {showDocs && (
              <div style={{
                position: 'fixed',
                top: 0,
                right: 0,
                width: '100%',
                maxWidth: 500,
                height: '100vh',
                background: 'var(--card)',
                borderLeft: '1px solid var(--border)',
                zIndex: 200,
                overflow: 'auto',
                boxShadow: '-8px 0 32px rgba(0,0,0,0.3)',
              }}>
                <div style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  position: 'sticky',
                  top: 0,
                  background: 'var(--card)',
                }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>Integration Guide</span>
                  <div
                    onClick={() => setShowDocs(false)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'var(--surface)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                    }}
                  >
                    <X size={16} color="var(--text-3)" />
                  </div>
                </div>
                <div style={{ padding: 20, display: 'grid', gap: 14 }}>
                  <SnippetBlock
                    tabs={[...snippetTabs]}
                    activeTab={activeSnippet}
                    onTabChange={setActiveSnippet}
                  />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>reports:</span>
                    {['raw key', 'placeholder leak', 'fallback copy', 'empty value'].map(label => (
                      <span key={label} className="tag tag-neutral repo-chip">{label}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <ProductPageLoader
      title="Loading SDK workspace"
      subtitle="Preparing install steps, credentials, and the latest runtime incident feed."
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
      title="SDK setup unlocks after first scan"
      subtitle="Run the first repo analysis to scope incident reporting and verify the runtime reporter."
    />
  );
}
