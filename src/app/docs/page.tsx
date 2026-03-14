'use client';

import Link from 'next/link';
import { useState } from 'react';

const NAV = [
  { id: 'overview',    label: 'Overview' },
  { id: 'quickstart',  label: 'Quick start' },
  { id: 'analysis',    label: 'How analysis works' },
  { id: 'webhooks',    label: 'Webhooks' },
  { id: 'sdk',         label: 'SDK integration' },
  { id: 'api',         label: 'API reference' },
];

function Code({ children }: { children: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: 'relative', marginTop: 12, marginBottom: 24 }}>
      <pre style={{
        background: '#0F1724', border: '1px solid #1C2B3A', borderRadius: 10,
        padding: '16px 20px', fontSize: 13, fontFamily: 'DM Mono, monospace',
        color: '#A8C4D8', overflowX: 'auto', lineHeight: 1.7, margin: 0,
      }}>{children}</pre>
      <button
        onClick={() => { navigator.clipboard.writeText(children.trim()); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        style={{
          position: 'absolute', top: 10, right: 10, padding: '4px 10px',
          background: copied ? 'rgba(0,229,160,0.12)' : 'rgba(255,255,255,0.05)',
          border: '1px solid', borderColor: copied ? '#00E5A0' : '#1C2B3A',
          color: copied ? '#00E5A0' : '#6B8FA8', borderRadius: 6,
          fontSize: 11, fontFamily: 'DM Mono, monospace', cursor: 'pointer',
          transition: 'all 0.15s',
        }}
      >{copied ? 'copied!' : 'copy'}</button>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} style={{ paddingTop: 56, paddingBottom: 8 }}>
      <h2 style={{
        fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em',
        color: '#E8F0F7', marginBottom: 16, paddingBottom: 12,
        borderBottom: '1px solid #1C2B3A',
      }}>{title}</h2>
      {children}
    </section>
  );
}

function Tag({ children, color = '#00E5A0' }: { children: string; color?: string }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 8px', borderRadius: 5,
      background: color + '18', border: `1px solid ${color}40`,
      color, fontSize: 11, fontFamily: 'DM Mono, monospace',
      marginRight: 6, marginBottom: 4,
    }}>{children}</span>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p style={{ color: '#7A9AB8', fontSize: 15, lineHeight: 1.75, marginBottom: 16 }}>{children}</p>;
}

function H3({ children }: { children: string }) {
  return <h3 style={{ fontSize: 16, fontWeight: 600, color: '#C4D8E8', marginTop: 28, marginBottom: 10 }}>{children}</h3>;
}

export default function DocsPage() {
  const [active, setActive] = useState('overview');

  return (
    <div style={{ minHeight: '100vh', background: '#070B14', color: '#E8F0F7', backgroundImage: 'radial-gradient(ellipse 80% 40% at 50% 0%, rgba(0,229,160,0.04) 0%, transparent 70%)' }}>
      {/* Top bar */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        borderBottom: '1px solid #1C2B3A',
        background: 'rgba(5,8,15,0.92)', backdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', height: 52,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
            <div style={{
              width: 22, height: 22, borderRadius: 6,
              background: 'linear-gradient(135deg, #00E5A0 0%, #00B87A 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="3" fill="#070B14"/>
                <path d="M8 2a6 6 0 1 1 0 12A6 6 0 0 1 8 2z" stroke="#070B14" strokeWidth="1.5" fill="none"/>
                <path d="M8 2v2M8 12v2M2 8h2M12 8h2" stroke="#070B14" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: '#7A9AB8' }}>
              lingo<span style={{ color: '#00E5A0' }}>pulse</span>
            </span>
          </Link>
          <span style={{ color: '#1C2B3A', fontSize: 16 }}>/</span>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: '#4A6A84' }}>docs</span>
        </div>
        <Link href="/connect" style={{
          padding: '6px 16px', borderRadius: 8,
          background: '#00E5A0', color: '#070B14',
          fontSize: 13, fontWeight: 700, textDecoration: 'none',
          fontFamily: 'DM Mono, monospace',
          transition: 'opacity 0.15s',
        }}>
          Get started →
        </Link>
      </header>

      <div style={{ display: 'flex', maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
        {/* Sidebar */}
        <aside style={{
          width: 200, flexShrink: 0, position: 'sticky', top: 52,
          height: 'calc(100vh - 52px)', overflowY: 'auto',
          padding: '32px 0 32px', borderRight: '1px solid #1C2B3A',
        }}>
          <p style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#4A6A84', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, paddingLeft: 4 }}>Contents</p>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {NAV.map(item => (
              <a
                key={item.id}
                href={`#${item.id}`}
                onClick={() => setActive(item.id)}
                style={{
                  padding: '7px 12px', borderRadius: 7, fontSize: 14,
                  fontFamily: 'DM Sans, sans-serif',
                  color: active === item.id ? '#00E5A0' : '#7A9AB8',
                  background: active === item.id ? 'rgba(0,229,160,0.07)' : 'transparent',
                  textDecoration: 'none', transition: 'all 0.12s',
                  borderLeft: active === item.id ? '2px solid #00E5A0' : '2px solid transparent',
                }}
                onMouseEnter={e => { if (active !== item.id) e.currentTarget.style.color = '#C4D8E8'; }}
                onMouseLeave={e => { if (active !== item.id) e.currentTarget.style.color = '#7A9AB8'; }}
              >{item.label}</a>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main style={{ flex: 1, padding: '32px 0 80px 48px', minWidth: 0 }}>

          <Section id="overview" title="Overview">
            <P>
              <strong style={{ color: '#E8F0F7' }}>Lingo Pulse</strong> is an i18n observability dashboard. Like Datadog, but for your translation coverage. Connect a GitHub repository, and Lingo Pulse will scan every locale file on every push, score translation quality via the Lingo.dev SDK, and alert you when a language breaks.
            </P>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
              <Tag>coverage tracking</Tag>
              <Tag>quality scoring</Tag>
              <Tag>webhook events</Tag>
              <Tag color="#FF6B35">PR checks</Tag>
              <Tag color="#FF6B35">incident feed</Tag>
            </div>
            <P>
              Built on Next.js, Supabase, and the <code style={{ fontFamily: 'DM Mono, monospace', color: '#00E5A0', fontSize: 13 }}>@lingo.dev/_sdk</code>. All open source.
            </P>
          </Section>

          <Section id="quickstart" title="Quick start">
            <H3>1. Clone and install</H3>
            <Code>{`git clone https://github.com/your-org/lingo-pulse
cd lingo-pulse
npm install`}</Code>

            <H3>2. Configure environment variables</H3>
            <P>Copy the example file and fill in your credentials:</P>
            <Code>{`cp .env.example .env.local`}</Code>
            <Code>{`NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
LINGO_DEV_API_KEY=your_lingo_dev_key
GITHUB_WEBHOOK_SECRET=any_random_secret`}</Code>

            <H3>3. Run the database migrations</H3>
            <P>Create a Supabase project, open the SQL editor, and run all 4 migration files in order:</P>
            <Code>{`supabase/migrations/001_initial.sql
supabase/migrations/002_owner_scoping.sql
supabase/migrations/003_pr_checks_repo_pr_unique.sql
supabase/migrations/004_translation_incidents.sql`}</Code>

            <H3>4. Start the dev server</H3>
            <Code>{`npm run dev
# → http://localhost:3000`}</Code>

            <H3>5. Connect a repository</H3>
            <P>
              Visit <code style={{ fontFamily: 'DM Mono, monospace', color: '#00E5A0', fontSize: 13 }}>/connect</code>, sign in with GitHub, paste your repository URL, and optionally add a GitHub PAT with <code style={{ fontFamily: 'DM Mono, monospace', color: '#7A9AB8', fontSize: 13 }}>admin:repo_hook</code> scope to enable automatic webhook registration.
            </P>
          </Section>

          <Section id="analysis" title="How analysis works">
            <P>
              When a repository is connected (or a webhook push event fires), Lingo Pulse fetches the full file tree via the GitHub API and finds every locale file matching <code style={{ fontFamily: 'DM Mono, monospace', color: '#00E5A0', fontSize: 13 }}>**/*.json</code> or <code style={{ fontFamily: 'DM Mono, monospace', color: '#00E5A0', fontSize: 13 }}>**/*.yaml</code> under common i18n directories.
            </P>
            <H3>Coverage score</H3>
            <P>
              For each locale, the engine compares keys against the source locale (usually <code style={{ fontFamily: 'DM Mono, monospace', color: '#7A9AB8', fontSize: 13 }}>en</code>). Coverage = translated keys ÷ total source keys × 100.
            </P>
            <H3>Quality score</H3>
            <P>
              Translated strings are passed to the Lingo.dev SDK for quality analysis. The SDK detects placeholder leaks, fallback copy left in source language, empty values, and format mismatches. Each file receives a 0–100 quality score.
            </P>
            <H3>Incident detection</H3>
            <P>
              A locale is flagged as an incident when its coverage drops below the threshold (default 80%) or its quality score drops more than 10 points between two consecutive analysis runs.
            </P>
          </Section>

          <Section id="webhooks" title="Webhooks">
            <P>
              Lingo Pulse registers a GitHub webhook on your repository pointing to <code style={{ fontFamily: 'DM Mono, monospace', color: '#00E5A0', fontSize: 13 }}>/api/webhooks/github</code>. Push and pull-request events trigger a fresh analysis run automatically.
            </P>
            <H3>Requirements</H3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
              {[
                ['GitHub PAT scope', 'admin:repo_hook. Needed for automatic registration'],
                ['Public URL', 'Webhooks require a publicly reachable host. Localhost will not work. Deploy to Vercel or use ngrok for local testing.'],
                ['Webhook secret', 'Set GITHUB_WEBHOOK_SECRET in your env. The handler validates the X-Hub-Signature-256 header on every request.'],
              ].map(([label, desc]) => (
                <div key={label} style={{ display: 'flex', gap: 12, padding: '12px 16px', background: '#0F1724', borderRadius: 8, border: '1px solid #1C2B3A' }}>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: '#00E5A0', flexShrink: 0, marginTop: 1 }}>{label}</span>
                  <span style={{ fontSize: 13, color: '#7A9AB8', lineHeight: 1.6 }}>{desc}</span>
                </div>
              ))}
            </div>
            <H3>Local testing with ngrok</H3>
            <Code>{`npx ngrok http 3000
# copy the https://xxxx.ngrok.io URL
# → update NEXT_PUBLIC_APP_URL in .env.local
# → reconnect the repo to register the webhook`}</Code>
          </Section>

          <Section id="sdk" title="SDK integration">
            <P>
              Lingo Pulse uses <code style={{ fontFamily: 'DM Mono, monospace', color: '#00E5A0', fontSize: 13 }}>@lingo.dev/_sdk</code> to score translation quality. Get your API key from the Lingo.dev dashboard and set it as <code style={{ fontFamily: 'DM Mono, monospace', color: '#7A9AB8', fontSize: 13 }}>LINGO_DEV_API_KEY</code>.
            </P>
            <Code>{`npm install @lingo.dev/_sdk`}</Code>
            <Code>{`import { LingoDotDevEngine } from '@lingo.dev/_sdk';

const engine = new LingoDotDevEngine({ apiKey: process.env.LINGO_DEV_API_KEY });

// Score a batch of translated strings
const result = await engine.localizeObject(
  { greeting: 'Hola', cta: 'Empezar' },
  { sourceLocale: 'es', targetLocale: 'en' }
);`}</Code>
            <P>
              The SDK is called during each analysis run. Results are stored in the <code style={{ fontFamily: 'DM Mono, monospace', color: '#7A9AB8', fontSize: 13 }}>locale_metrics</code> and <code style={{ fontFamily: 'DM Mono, monospace', color: '#7A9AB8', fontSize: 13 }}>file_metrics</code> tables and surfaced in the dashboard quality chart.
            </P>
          </Section>

          <Section id="api" title="API reference">
            {[
              { method: 'POST', path: '/api/repos', desc: 'Connect a new repository. Body: { repoUrl, githubPat?, lingoApiKey? }' },
              { method: 'GET',  path: '/api/repos', desc: 'List all repos for the authenticated user.' },
              { method: 'GET',  path: '/api/repos/[id]', desc: 'Fetch full dashboard data for a repo (locales, coverage, quality, activity).' },
              { method: 'POST', path: '/api/analyze', desc: 'Manually trigger a re-analysis run. Body: { repoId }' },
              { method: 'POST', path: '/api/webhooks/github', desc: 'GitHub webhook receiver. Validates X-Hub-Signature-256 and triggers analysis.' },
            ].map(({ method, path, desc }, i) => (
              <div key={`${method}-${path}-${i}`} style={{
                display: 'flex', gap: 14, alignItems: 'flex-start',
                padding: '12px 16px', marginBottom: 8,
                background: '#0F1724', border: '1px solid #1C2B3A', borderRadius: 8,
              }}>
                <span style={{
                  fontFamily: 'DM Mono, monospace', fontSize: 11, fontWeight: 700,
                  color: method === 'POST' ? '#FF6B35' : '#00E5A0',
                  background: method === 'POST' ? 'rgba(255,107,53,0.1)' : 'rgba(0,229,160,0.1)',
                  border: `1px solid ${method === 'POST' ? 'rgba(255,107,53,0.25)' : 'rgba(0,229,160,0.25)'}`,
                  padding: '2px 7px', borderRadius: 5, flexShrink: 0, marginTop: 1,
                }}>{method}</span>
                <div>
                  <code style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: '#C4D8E8' }}>{path}</code>
                  <p style={{ fontSize: 13, color: '#7A9AB8', margin: '4px 0 0', lineHeight: 1.5 }}>{desc}</p>
                </div>
              </div>
            ))}
          </Section>

        </main>
      </div>
    </div>
  );
}
