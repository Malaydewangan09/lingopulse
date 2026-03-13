'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, Copy, Link2, RadioTower, ShieldAlert, TerminalSquare } from 'lucide-react';
// RadioTower still used in MetricCard, ShieldAlert/TerminalSquare in metrics
import Header from '@/components/dashboard/Header';
import MetricCard from '@/components/dashboard/MetricCard';
import Sidebar from '@/components/dashboard/Sidebar';
import type { RepoInfo, ScanDiffSummary } from '@/lib/types';

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
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [activeSnippet, setActiveSnippet] = useState('plain');

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

  useEffect(() => { void load(); }, [load]);

  const origin = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

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
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar activeSection="overview" currentRepoId={id} />
      <div className="dashboard-content-offset" style={{ flex: 1, minWidth: 0 }}>
        <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
          <Header repo={repo} scanDiff={data.scanDiff} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} refreshing={refreshing} />

          <main className="dashboard-main">
            <div className="dashboard-metrics-grid">
              <MetricCard label="SDK Status" value="ready" sublabel="browser incident reporter" accent icon={<RadioTower size={15} />} />
              <MetricCard label="Repo ID" value={data.repo.id.slice(0, 8)} sublabel="scopes incident ingest" icon={<ShieldAlert size={15} />} />
              <MetricCard label="Open Incidents" value={data.incidents.length} sublabel="live production reports" danger={data.incidents.length > 0} icon={<TerminalSquare size={15} />} />
              <MetricCard label="Endpoint" value="/api" sublabel="cross-origin ingest enabled" icon={<Copy size={15} />} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)', gap: 16, alignItems: 'start' }}>
              <div style={{ display: 'grid', gap: 14, minWidth: 0 }}>
                <SnippetBlock
                  tabs={[...snippetTabs]}
                  activeTab={activeSnippet}
                  onTabChange={setActiveSnippet}
                />

                {/* What gets reported — compact tag strip */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>reports:</span>
                  {['raw key', 'placeholder leak', 'fallback copy', 'empty value'].map(label => (
                    <span key={label} className="tag tag-neutral repo-chip">{label}</span>
                  ))}
                </div>

                {/* Setup checklist */}
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', marginRight: 4 }}>status</span>
                  {([
                    { label: 'connected', done: true },
                    { label: 'ingest key', done: !!data.repo.public_ingest_key },
                    { label: 'first incident', done: data.incidents.length > 0 },
                  ] as { label: string; done: boolean; localOnly?: boolean }[]).map(step => (
                    <span key={step.label} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '3px 8px', borderRadius: 6, fontSize: 11,
                      fontFamily: 'var(--font-mono)',
                      background: step.done ? 'rgba(63,200,122,0.08)' : step.localOnly ? 'rgba(230,168,23,0.06)' : 'rgba(255,255,255,0.03)',
                      border: `1px solid ${step.done ? 'rgba(63,200,122,0.2)' : step.localOnly ? 'rgba(230,168,23,0.2)' : 'var(--border)'}`,
                      color: step.done ? 'var(--success)' : step.localOnly ? 'var(--warning)' : 'var(--text-3)',
                    }}>
                      {step.done
                        ? <svg width="8" height="8" viewBox="0 0 10 10"><path d="M2 5.5l2 2 4-4" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        : <div style={{ width: 5, height: 5, borderRadius: '50%', background: step.localOnly ? 'var(--warning)' : 'var(--border-bright)', flexShrink: 0 }} />
                      }
                      {step.label}
                    </span>
                  ))}
                </div>

                {/* Env config */}
                <EnvConfigBlock repoId={data.repo.id} ingestKey={data.repo.public_ingest_key ?? ''} apiBase={origin} />
              </div>

              <div style={{ display: 'grid', gap: 14, position: 'sticky', top: 72 }}>
                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, padding: 16 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 14 }}>
                    credentials
                  </div>
                  <div style={{ display: 'grid', gap: 12 }}>
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

                <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 600 }}>Recent live reports</div>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)', marginTop: 2 }}>
                        compact runtime validation feed
                      </div>
                    </div>
                    <Link2 size={14} color="var(--accent)" />
                  </div>
                  {data.incidents.length === 0 ? (
                    <div style={{ padding: 16, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
                      No incidents have been reported yet. Trigger one from the target app to validate the SDK wiring.
                    </div>
                  ) : (
                    <div style={{ display: 'grid' }}>
                      {data.incidents.slice(0, 4).map((incident, index) => (
                        <div
                          key={incident.id}
                          style={{
                            padding: '12px 16px',
                            borderTop: index === 0 ? 'none' : '1px solid var(--border)',
                            display: 'grid',
                            gap: 6,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--danger)', flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: 'var(--text-1)', fontWeight: 600 }}>
                              {incident.translation_key || incident.sample_text || labelForIncident(incident.issue_type)}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--text-2)' }}>
                            {incident.locale ?? '—'} on {incident.route ?? '/'}
                            {incident.app_version ? ` · ${incident.app_version}` : ''}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                            <span>{labelForIncident(incident.issue_type)}</span>
                            <span>{toNumber(incident.hit_count)} hit{toNumber(incident.hit_count) === 1 ? '' : 's'} · {formatRelativeTime(incident.last_seen_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
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
        Analysis in progress… SDK setup becomes available after the first successful scan
      </span>
    </div>
  );
}
