'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export function useIsDark() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const check = () => setDark(!document.documentElement.classList.contains('light'));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  return dark;
}

function ThemeToggle() {
  const dark = useIsDark();
  useEffect(() => {
    const saved = localStorage.getItem('theme');
    const isDark = saved ? saved === 'dark' : true;
    document.documentElement.classList.toggle('light', !isDark);
  }, []);
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('light', !next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
  };
  return (
    <button onClick={toggle} title={dark ? 'Light mode' : 'Dark mode'} style={{
      width: 34, height: 34, borderRadius: 8, border: '1px solid var(--border)',
      background: 'transparent', color: 'var(--text-2)', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'color 0.15s, border-color 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent-glow)'; }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      {dark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  );
}

// ── Data ──────────────────────────────────────────────────────────────────────

const HEATMAP_ROWS = [
  { locale: 'en', cells: [100, 100, 100, 100, 100, 100] },
  { locale: 'es', cells: [98,  95,  91,  88,  100, 97]  },
  { locale: 'fr', cells: [84,  79,  92,  67,  88,  73]  },
  { locale: 'de', cells: [71,  63,  45,  88,  55,  0]   },
  { locale: 'ja', cells: [52,  38,  0,   44,  0,   0]   },
];

const MODULES = ['common', 'auth', 'dashboard', 'pricing', 'errors', 'onboard'];

const QUALITY_SIGNALS = [
  { locale: 'ja', score: '9.4', width: '94%', note: 'checkout copy reads native', color: 'var(--accent)' },
  { locale: 'fr', score: '8.8', width: '88%', note: 'pricing phrasing is stable', color: 'var(--blue)' },
  { locale: 'de', score: '6.1', width: '61%', note: 'onboarding tone needs review', color: 'var(--warning)' },
];

const SDK_EVENTS = [
  { title: 'checkout.pay_now leaked in production', meta: 'ja · /checkout · raw key', color: 'var(--danger)' },
  { title: '{user_name} rendered to users', meta: 'de · /welcome · placeholder leak', color: 'var(--warning)' },
  { title: 'fr fallback copy detected after deploy', meta: 'fr · /billing · fallback locale', color: 'var(--accent)' },
];

const FEATURE_SUMMARY = [
  { label: 'latest diff', value: 'watch · settings', tone: 'var(--warning)' },
  { label: 'draft fix PR', value: 'ready in one click', tone: 'var(--accent)' },
];

const RELEASE_SURFACE = [
  { module: 'settings', detail: 'fr + ja dropped since last baseline', coverage: 61, state: 'open draft fix PR', tone: 'var(--warning)' },
  { module: 'checkout', detail: 'de placeholders resolved in hotfix', coverage: 88, state: 'recovered', tone: 'var(--blue)' },
  { module: 'errors', detail: 'ja gaps still block merge', coverage: 58, state: 'missing keys', tone: 'var(--danger)' },
  { module: 'billing', detail: 'es + fr stayed stable after push', coverage: 92, state: 'safe to ship', tone: 'var(--accent)' },
];

const REPO_PATTERNS = [
  'package/section/en.json',
  'translations/fr.json',
  'locale-per-file',
  'nested packages',
  'wrapped locale JSON',
  'module folders',
  'monorepos',
  'GitHub repo sync',
];

const STEPS = [
  {
    num: '01',
    kicker: 'Access',
    title: 'Connect your GitHub repo',
    desc: 'Sign in and pick a repo from your GitHub session, with a manual fallback when you need a different source.',
    signal: 'OAuth session',
    tone: 'var(--accent)',
    previewTitle: 'Connected repositories',
    previewNote: 'Session token is active',
    meter: { value: 100, label: 'repo access ready' },
    previewItems: [
      { label: 'checkout-service', state: 'selected', tone: 'var(--accent)' },
      { label: 'marketing-web', state: 'available', tone: 'rgba(148,163,184,0.88)' },
      { label: 'docs-portal', state: 'available', tone: 'rgba(148,163,184,0.88)' },
    ],
  },
  {
    num: '02',
    kicker: 'Scan',
    title: 'We map the i18n surface fast',
    desc: 'Locale files, module coverage, and translation quality get structured into one scan without extra setup.',
    signal: 'Coverage scan',
    tone: 'var(--blue)',
    previewTitle: 'Scan summary',
    previewNote: 'Initial analysis runs automatically',
    meter: { value: 78, label: 'analysis complete' },
    previewItems: [
      { label: '12 locales mapped', state: 'ready', tone: 'var(--blue)' },
      { label: '247 missing keys flagged', state: 'review', tone: 'var(--warning)' },
      { label: '3 low-confidence strings', state: 'queued', tone: 'var(--accent)' },
    ],
  },
  {
    num: '03',
    kicker: 'Monitor',
    title: 'Watch regressions before and after release',
    desc: 'Pushes refresh scan diff and PR checks, while the SDK reports broken translations from production traffic when real users hit them.',
    signal: 'Scan diff + SDK',
    tone: 'var(--warning)',
    previewTitle: 'Release watch',
    previewNote: 'Pre-merge checks and post-deploy incidents',
    meter: { value: 92, label: 'watchers active' },
    previewItems: [
      { label: 'scan diff opened draft fix PR', state: 'ready', tone: 'var(--accent)' },
      { label: 'PR #284 blocked on ja gaps', state: 'blocked', tone: 'var(--danger)' },
      { label: 'sdk reported raw key in checkout', state: 'live', tone: 'var(--warning)' },
    ],
  },
];

interface FloatBadge {
  label: string;
  top: string;
  left?: string;
  right?: string;
  delay: string;
  color: string;
}

const FLOAT_BADGES: FloatBadge[] = [
  { label: '🇺🇸 en · 100%',   top: '8%',  left: '-6%',  delay: '0s',   color: 'var(--success)' },
  { label: '🇯🇵 ja · 52%',    top: '20%', right: '-8%', delay: '0.8s', color: 'var(--warning)' },
  { label: '🇩🇪 de · 71%',    top: '72%', left: '-4%',  delay: '1.4s', color: 'var(--warning)' },
  { label: '🇫🇷 fr · 84%',    top: '82%', right: '-6%', delay: '0.4s', color: 'var(--success)' },
  { label: '🇪🇸 es · 95%',    top: '50%', right: '-10%',delay: '1.1s', color: 'var(--success)' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function covColor(pct: number) {
  if (pct === 0)   return 'rgba(240,82,72,0.25)';
  if (pct < 60)   return 'rgba(230,168,23,0.28)';
  if (pct < 85)   return 'rgba(0,229,160,0.22)';
  return 'rgba(0,229,160,0.55)';
}

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { entry.target.classList.add('is-visible'); obs.unobserve(entry.target); } },
      { threshold: 0.12 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);
  return ref;
}

// ── Components ────────────────────────────────────────────────────────────────

function RevealSection({ children, delay = '0s', style = {} }: { children: React.ReactNode; delay?: string; style?: React.CSSProperties }) {
  const ref = useReveal();
  return (
    <div ref={ref} className="reveal" style={{ transitionDelay: delay, ...style }}>
      {children}
    </div>
  );
}

const LANDING_SHELL_MAX = 1240;
const LANDING_GUTTER = '28px';
const LANDING_SECTION_PADDING = `88px ${LANDING_GUTTER} 72px`;
const LANDING_BAND_PADDING = `22px ${LANDING_GUTTER}`;
const LANDING_WIDE_SECTION_PADDING = `88px ${LANDING_GUTTER}`;
const LANDING_CTA_PADDING = `72px ${LANDING_GUTTER}`;
const LANDING_FOOTER_PADDING = `24px ${LANDING_GUTTER}`;
const DARK_PANEL_TEXT = '#D9E4F1';
const DARK_PANEL_MUTED = '#94A8BE';
const DARK_PANEL_DIM = '#667A92';

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const dark = useIsDark();

  return (
    <div style={{
      position: 'relative', zIndex: 1, minHeight: '100vh',
      fontFamily: 'var(--font-sans)', color: 'var(--text-1)',
    }}>

      {/* ── Nav ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: `14px ${LANDING_GUTTER}`, borderBottom: '1px solid var(--border)',
        background: 'color-mix(in srgb, var(--bg) 90%, transparent)', backdropFilter: 'blur(14px)',
        position: 'sticky', top: 0, zIndex: 50,
        animation: 'fadeIn 0.5s ease both',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 9,
            background: 'linear-gradient(135deg, var(--accent) 0%, #00B87A 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3" fill="#070B14"/>
              <path d="M8 2a6 6 0 1 1 0 12A6 6 0 0 1 8 2z" stroke="#070B14" strokeWidth="1.5" fill="none"/>
              <path d="M8 2v2M8 12v2M2 8h2M12 8h2" stroke="#070B14" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 500, fontSize: 18, letterSpacing: '-0.02em' }}>
            lingo<span style={{ color: 'var(--accent)' }}>pulse</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <ThemeToggle />
          <button
            onClick={() => router.push('/auth')}
            style={{
              height: 40, padding: '0 20px', borderRadius: 10,
              background: 'var(--accent-button)', border: '1px solid rgba(255,255,255,0.04)',
              color: 'var(--accent-button-text)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'transform 0.15s, box-shadow 0.15s',
              boxShadow: '0 1px 0 rgba(255,255,255,0.12) inset',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.12) inset, 0 10px 24px rgba(0,0,0,0.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.12) inset'; }}
          >
            Start monitoring
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        maxWidth: LANDING_SHELL_MAX, margin: '0 auto', padding: LANDING_SECTION_PADDING,
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        position: 'relative',
      }}>
        {/* Pill badge */}
        <div className="animate-fade-up mono-badge" style={{
          background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)',
          color: 'var(--accent)',
          marginBottom: 28, animationDelay: '0s',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'pulseDot 2s infinite' }} />
          Repository-based i18n monitoring
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up" style={{
          fontSize: 'clamp(34px, 5.2vw, 62px)',
          fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.04em',
          maxWidth: 820, marginBottom: 24,
          animationDelay: '0.08s',
          color: 'var(--text-1)',
        }}>
          Translation coverage, quality, and PR checks{' '}
          <span style={{
            backgroundImage: dark
              ? 'linear-gradient(135deg, #ffffff 0%, #00E5A0 60%)'
              : 'linear-gradient(135deg, #1a3a2a 0%, #009966 100%)',
            backgroundSize: '200% auto',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: 'transparent',
            animation: 'gradientShift 5s linear infinite',
            display: 'inline',
          }}>
            in one dashboard.
          </span>
        </h1>

        {/* Sub */}
        <p className="animate-fade-up" style={{
          fontSize: 18, color: 'var(--text-2)', maxWidth: 560,
          lineHeight: 1.65, marginBottom: 44, animationDelay: '0.16s',
        }}>
          Connect a repository to scan locale files, diff every release, open draft fix PRs, and catch broken translations in production.
        </p>

        {/* CTAs */}
        <div className="animate-fade-up" style={{
          display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center',
          marginBottom: 72, animationDelay: '0.24s',
        }}>
          <button
            onClick={() => router.push('/auth')}
            style={{
              padding: '14px 32px', borderRadius: 10,
              background: 'var(--accent-button)', border: '1px solid rgba(255,255,255,0.04)',
              color: 'var(--accent-button-text)', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.12) inset',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.12) inset, 0 12px 28px rgba(0,0,0,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.12) inset'; }}
          >
            Connect repository
          </button>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '14px 28px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-bright)',
              color: 'var(--text-1)', fontSize: 15, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'var(--border-bright)'; }}
          >
            Open demo
          </button>
        </div>

        {/* Hero heatmap card */}
        <div className="animate-fade-up animate-glow-pulse" style={{
          position: 'relative', maxWidth: 580, width: '100%',
          background: 'var(--card)', border: '1px solid var(--border)',
          borderRadius: 18, padding: '22px 26px',
          boxShadow: '0 40px 100px rgba(0,0,0,0.6)',
          animationDelay: '0.32s',
        }}>
          {/* Floating badges */}
          {FLOAT_BADGES.map((b, i) => (
            <div key={i} className="mono-badge mono-badge-sm" style={{
              position: 'absolute',
              top: b.top,
              left: b.left,
              right: b.right,
              background: 'var(--card)',
              border: `1px solid ${b.color}44`,
              color: b.color,
              animation: `float ${3.5 + i * 0.4}s ease-in-out ${b.delay} infinite`,
              boxShadow: `0 4px 16px rgba(0,0,0,0.4), 0 0 12px ${b.color}22`,
              zIndex: 2,
            }}>
              {b.label}
            </div>
          ))}

          {/* Window chrome */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 18 }}>
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--danger)', opacity: 0.8 }} />
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--warning)', opacity: 0.8 }} />
            <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--success)', opacity: 0.8 }} />
            <span style={{ marginLeft: 10, fontSize: 11, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
              lingopulse · coverage heatmap
            </span>
            <span className="status-live" style={{ marginLeft: 'auto' }} />
          </div>

          {/* Column labels */}
          <div style={{ display: 'flex', marginBottom: 6, paddingLeft: 28 }}>
            {MODULES.map(m => (
              <div key={m} style={{ flex: 1, fontSize: 9, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {m}
              </div>
            ))}
          </div>

          {/* Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {HEATMAP_ROWS.map((row, ri) => (
              <div key={row.locale} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 22, fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--text-3)', flexShrink: 0, textAlign: 'right' }}>
                  {row.locale}
                </span>
                {row.cells.map((pct, ci) => (
                  <div key={ci} className="cov-cell" style={{
                    flex: 1, height: 26, borderRadius: 5,
                    background: covColor(pct),
                    border: '1px solid rgba(255,255,255,0.04)',
                    animationDelay: `${(ri * 0.06 + ci * 0.04).toFixed(2)}s`,
                    animation: pct < 60 ? `heatFlicker ${2 + ci * 0.3}s ease-in-out ${ri * 0.2}s infinite` : 'none',
                    position: 'relative',
                  }}>
                    {pct === 0 && (
                      <div style={{
                        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 8, color: 'rgba(240,82,72,0.6)', fontFamily: 'DM Mono, monospace',
                      }}>✕</div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div style={{ display: 'flex', gap: 16, marginTop: 14, justifyContent: 'flex-end' }}>
            {[['var(--success)', '≥85%'], ['var(--warning)', '60–84%'], ['var(--danger)', '<60%']].map(([c, l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 9, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: c as string, opacity: 0.7 }} />
                {l}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <RevealSection>
        <section style={{
          borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
          background: 'linear-gradient(90deg, rgba(0,229,160,0.025) 0%, rgba(75,158,255,0.015) 100%)',
          padding: LANDING_BAND_PADDING,
        }}>
          <div style={{
            maxWidth: LANDING_SHELL_MAX, margin: '0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 0, flexWrap: 'wrap',
          }}>
            {[
              { value: '247', label: 'missing keys caught', color: 'var(--danger)' },
              { value: '12',  label: 'locales tracked',     color: 'var(--accent)' },
              { value: '1',   label: 'draft fix PR click',  color: 'var(--blue)'   },
              { value: 'live', label: 'production incidents', color: 'var(--warning)'},
            ].map((s, i) => (
              <div key={s.label} style={{ display: 'flex', alignItems: 'center' }}>
                {i > 0 && <div style={{ width: 1, height: 32, background: 'var(--border)', margin: '0 36px' }} />}
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 22, fontWeight: 700, color: s.color, lineHeight: 1 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3, fontFamily: 'DM Mono, monospace' }}>
                    {s.label}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </RevealSection>

      {/* ── Compatibility strip ── */}
      <RevealSection delay="0.06s">
        <section style={{ padding: `18px ${LANDING_GUTTER} 0`, overflow: 'hidden' }}>
          <div style={{ maxWidth: LANDING_SHELL_MAX, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text-3)', marginBottom: 14, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Scans common repository i18n layouts
            </div>
          </div>

          <div className="landing-compat-band">
            <div className="landing-compat-track">
              {[...REPO_PATTERNS, ...REPO_PATTERNS].map((pattern, index) => (
                <div key={`${pattern}-${index}`} className="landing-compat-item">
                  <span className="landing-compat-dot" />
                  <span>{pattern}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </RevealSection>

      {/* ── Features ── */}
      <section style={{ maxWidth: LANDING_SHELL_MAX, margin: '0 auto', padding: LANDING_SECTION_PADDING }}>
        <RevealSection>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: 28 }}>
            <div
              style={{
                background: 'rgba(75,158,255,0.08)',
                border: '1px solid rgba(75,158,255,0.18)',
                color: 'var(--blue)',
                marginBottom: 22,
              }}
              className="mono-badge "
            >
              Translation operations
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 3.8vw, 42px)', fontWeight: 700, letterSpacing: '-0.04em', marginBottom: 12, maxWidth: 760 }}>
              Scan diffs, draft fix PRs, and production incident signals in one flow
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: 16, maxWidth: 620, lineHeight: 1.7 }}>
              Use the main dashboard for current health, then move into dedicated routes for scan diff and the runtime SDK when you need action.
            </p>
          </div>
        </RevealSection>

        <div className="landing-feature-grid">
          <RevealSection>
            <div
              style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 20,
                border: '1px solid rgba(0,229,160,0.2)',
                background: 'linear-gradient(180deg, rgba(8,15,27,0.98) 0%, rgba(10,17,31,0.96) 100%)',
                boxShadow: '0 44px 120px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                padding: 30,
                color: DARK_PANEL_TEXT,
              }}
            >
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.35 }} />
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 18% 18%, rgba(0,229,160,0.16), transparent 34%)' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 82% 24%, rgba(75,158,255,0.14), transparent 30%)' }} />
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.28), transparent)' }} />

              <div style={{ position: 'relative', zIndex: 1 }}>
                <div className="landing-feature-panel-top">
                  <div style={{ maxWidth: 420 }}>
                    <div className="tag tag-accent repo-chip" style={{ marginBottom: 14 }}>Scan diff + autofix</div>
                    <h3 style={{ fontSize: 'clamp(24px, 3vw, 34px)', fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 12, color: DARK_PANEL_TEXT }}>
                      Diff each scan and route straight into a fix PR.
                    </h3>
                    <p style={{ fontSize: 14, color: DARK_PANEL_MUTED, lineHeight: 1.7 }}>
                      Every new baseline is compared against the last one, ranked by regression severity, and ready to open as a draft GitHub fix PR.
                    </p>
                  </div>

                  <div className="landing-feature-micro-grid">
                    {FEATURE_SUMMARY.map(item => (
                      <div
                        key={item.label}
                        style={{
                          borderRadius: 14,
                          border: '1px solid rgba(255,255,255,0.06)',
                          background: 'rgba(255,255,255,0.025)',
                          padding: '12px 14px',
                        }}
                      >
                        <div style={{ fontSize: 10, color: DARK_PANEL_DIM, fontFamily: 'DM Mono, monospace', marginBottom: 6 }}>
                          {item.label}
                        </div>
                        <div style={{ fontSize: 13, color: item.tone, fontWeight: 600 }}>
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 26,
                    borderRadius: 18,
                    border: '1px solid rgba(255,255,255,0.06)',
                    background: 'rgba(11,17,30,0.86)',
                    padding: 18,
                    backdropFilter: 'blur(10px)',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05), 0 22px 70px rgba(0,0,0,0.35)',
                  }}
                >
                  <div
                    className="landing-scan-band"
                    style={{
                      position: 'absolute',
                      inset: '44px 14px 62px 82px',
                      borderRadius: 16,
                      pointerEvents: 'none',
                    }}
                  >
                    <div
                      className="animate-scan-sweep"
                      style={{
                        position: 'absolute',
                        inset: 0,
                        width: '38%',
                        background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.11), transparent)',
                        filter: 'blur(12px)',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                    <span className="status-live" />
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: DARK_PANEL_MUTED }}>
                      latest scan diff
                    </span>
                    <span className="tag tag-neutral repo-chip" style={{ color: DARK_PANEL_DIM, background: 'rgba(148,163,184,0.08)', borderColor: 'rgba(148,163,184,0.16)' }}>2 regressions</span>
                    <span className="tag tag-neutral repo-chip" style={{ color: DARK_PANEL_DIM, background: 'rgba(148,163,184,0.08)', borderColor: 'rgba(148,163,184,0.16)' }}>draft PR ready</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {RELEASE_SURFACE.map((lane, index) => (
                      <div
                        key={lane.module}
                        className="landing-surface-row"
                        style={{
                          display: 'grid',
                          gap: 14,
                          alignItems: 'center',
                          borderRadius: 14,
                          border: '1px solid rgba(255,255,255,0.05)',
                          background: 'rgba(255,255,255,0.02)',
                          padding: '14px 16px',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 2,
                            background: lane.tone,
                            opacity: 0.7,
                          }}
                        />
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                            <span style={{ fontSize: 14, fontWeight: 600, color: DARK_PANEL_TEXT }}>
                              {lane.module}
                            </span>
                            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: lane.tone }}>
                              {String(index + 1).padStart(2, '0')}
                            </span>
                          </div>
                          <div style={{ fontSize: 12, color: DARK_PANEL_DIM }}>
                            {lane.detail}
                          </div>
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 8, fontFamily: 'DM Mono, monospace', fontSize: 11 }}>
                            <span style={{ color: DARK_PANEL_DIM }}>coverage</span>
                            <span style={{ color: lane.tone }}>{lane.coverage}%</span>
                          </div>
                          <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.05)', overflow: 'hidden', marginBottom: 8 }}>
                            <div
                              style={{
                                width: `${lane.coverage}%`,
                                height: '100%',
                                borderRadius: 999,
                                background: `linear-gradient(90deg, rgba(255,255,255,0.1), ${lane.tone})`,
                              }}
                            />
                          </div>
                          <div style={{ fontSize: 11, color: lane.tone, fontFamily: 'DM Mono, monospace', textAlign: 'right' }}>
                            {lane.state}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginTop: 18 }}>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {[
                        { label: 'healthy', tone: 'var(--accent)' },
                        { label: 'watch', tone: 'var(--warning)' },
                        { label: 'blocked', tone: 'var(--danger)' },
                      ].map(item => (
                        <div
                          key={item.label}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 8,
                            minHeight: 26,
                            padding: '5px 10px',
                            borderRadius: 7,
                            border: `1px solid ${item.tone}33`,
                            background: 'rgba(255,255,255,0.02)',
                            color: item.tone,
                            fontSize: 11,
                            fontFamily: 'DM Mono, monospace',
                            lineHeight: 1.1,
                          }}
                        >
                          <span
                            style={{
                              width: 7,
                              height: 7,
                              borderRadius: '50%',
                              background: item.tone,
                              boxShadow: `0 0 10px ${item.tone}44`,
                              flexShrink: 0,
                            }}
                          />
                          {item.label}
                        </div>
                      ))}
                    </div>
                    <div style={{ fontSize: 11, color: DARK_PANEL_DIM, fontFamily: 'DM Mono, monospace' }}>
                      Full scan diff opens as a dedicated workflow
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </RevealSection>

          <div className="landing-feature-side-stack">
            <RevealSection delay="0.08s">
              <div
                style={{
                  borderRadius: 22,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'linear-gradient(180deg, rgba(11,18,34,0.98) 0%, rgba(9,15,27,0.96) 100%)',
                  boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
                  padding: 24,
                  height: '100%',
                  color: DARK_PANEL_TEXT,
                }}
              >
                <div className="tag repo-chip" style={{ marginBottom: 14, background: 'rgba(75,158,255,0.12)', borderColor: 'rgba(75,158,255,0.22)', color: 'var(--blue)' }}>
                  AI quality scoring
                </div>
                <h3 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 10, color: DARK_PANEL_TEXT }}>
                  Review low-confidence copy before release.
                </h3>
                <p style={{ fontSize: 14, color: DARK_PANEL_MUTED, lineHeight: 1.7, marginBottom: 20 }}>
                  Lingo.dev scores translation tone so low-confidence strings can be reviewed early.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {QUALITY_SIGNALS.map(signal => (
                    <div
                      key={signal.locale}
                      style={{
                        borderRadius: 14,
                        border: '1px solid rgba(255,255,255,0.06)',
                        background: 'rgba(255,255,255,0.025)',
                        padding: '12px 14px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: DARK_PANEL_TEXT }}>{signal.locale}</span>
                          <span style={{ fontSize: 12, color: DARK_PANEL_DIM }}>{signal.note}</span>
                        </div>
                        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: signal.color }}>{signal.score}/10</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 100, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                        <div
                          style={{
                            width: signal.width,
                            height: '100%',
                            borderRadius: 100,
                            background: `linear-gradient(90deg, rgba(255,255,255,0.15), ${signal.color})`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </RevealSection>

            <RevealSection delay="0.16s">
              <div
                style={{
                  borderRadius: 22,
                  border: '1px solid rgba(255,255,255,0.08)',
                  background: 'linear-gradient(180deg, rgba(16,15,24,0.98) 0%, rgba(11,15,27,0.96) 100%)',
                  boxShadow: '0 24px 70px rgba(0,0,0,0.35)',
                  padding: 24,
                  height: '100%',
                  color: DARK_PANEL_TEXT,
                }}
              >
                <div className="tag repo-chip" style={{ marginBottom: 14, background: 'rgba(255,107,53,0.12)', borderColor: 'rgba(255,107,53,0.22)', color: 'var(--orange)' }}>
                  Production incident SDK
                </div>
                <h3 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 10, color: DARK_PANEL_TEXT }}>
                  Catch broken translations after deploy, not after tweets.
                </h3>
                <p style={{ fontSize: 14, color: DARK_PANEL_MUTED, lineHeight: 1.7, marginBottom: 20 }}>
                  Drop a small SDK into any app, including plain HTML and JavaScript, and report raw keys, placeholder leaks, and fallback copy from production traffic.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {SDK_EVENTS.map(item => (
                    <div
                      key={item.title}
                      style={{
                        display: 'flex',
                        gap: 12,
                        alignItems: 'flex-start',
                        borderRadius: 14,
                        border: '1px solid rgba(255,255,255,0.06)',
                        background: 'rgba(255,255,255,0.025)',
                        padding: '12px 14px',
                      }}
                    >
                      <div
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: '50%',
                          marginTop: 6,
                          background: item.color,
                          boxShadow: `0 0 16px ${item.color}55`,
                          flexShrink: 0,
                          animation: 'pulseDot 1.8s ease-in-out infinite',
                        }}
                      />
                      <div>
                        <div style={{ fontSize: 13, color: DARK_PANEL_TEXT, fontWeight: 600, marginBottom: 4 }}>
                          {item.title}
                        </div>
                        <div style={{ fontSize: 12, color: DARK_PANEL_DIM, fontFamily: 'DM Mono, monospace' }}>
                          {item.meta}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 18 }}>
                  <span className="tag tag-danger repo-chip">raw key</span>
                  <span className="tag tag-warning repo-chip">placeholder leak</span>
                  <span className="tag tag-accent repo-chip">fallback copy</span>
                </div>
              </div>
            </RevealSection>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ borderTop: '1px solid var(--border)', padding: LANDING_WIDE_SECTION_PADDING }}>
        <div style={{ maxWidth: LANDING_SHELL_MAX, margin: '0 auto' }}>
          <RevealSection>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 700, letterSpacing: '-0.03em', textAlign: 'center', marginBottom: 12 }}>
              Set up in 3 steps
            </h2>
            <p style={{ textAlign: 'center', color: 'var(--text-2)', fontSize: 16, marginBottom: 60, maxWidth: 480, margin: '12px auto 60px' }}>
              Sign in, select a repository, and start monitoring locale coverage in minutes.
            </p>
          </RevealSection>

          <div className="landing-process-shell">
            <div className="landing-process-inner">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <span className="tag tag-accent repo-chip">3 minute setup</span>
                  <span className="tag tag-neutral repo-chip">GitHub native</span>
                  <span className="tag tag-neutral repo-chip">No config</span>
                </div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: DARK_PANEL_DIM }}>
                  Single flow from repository access to release monitoring
                </div>
              </div>

              <div className="landing-process-list">
                {STEPS.map(({ num, kicker, title, desc, signal, tone, previewTitle, previewNote, previewItems, meter }, i) => (
                  <RevealSection key={num} delay={`${i * 0.12}s`}>
                    <div className="landing-process-row">
                      <div className="landing-process-index-wrap">
                        <div
                          className="landing-process-index"
                          style={{
                            color: tone,
                            borderColor: 'rgba(255,255,255,0.08)',
                            background: 'rgba(255,255,255,0.04)',
                          }}
                        >
                          {num}
                        </div>
                        {i < STEPS.length - 1 && <div className="landing-process-segment" />}
                      </div>

                      <div className="landing-process-copy">
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
                          <div style={{ fontSize: 10, color: tone, fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                            {kicker}
                          </div>
                          <span
                            className="tag tag-neutral repo-chip"
                            style={{
                              background: 'rgba(255,255,255,0.04)',
                              borderColor: 'rgba(255,255,255,0.08)',
                              color: DARK_PANEL_DIM,
                            }}
                          >
                            {signal}
                          </span>
                        </div>

                        <h3 style={{ fontSize: 'clamp(22px, 2.5vw, 28px)', fontWeight: 700, marginBottom: 12, letterSpacing: '-0.03em', color: DARK_PANEL_TEXT, lineHeight: 1.12 }}>
                          {title}
                        </h3>
                        <p style={{ fontSize: 15, color: DARK_PANEL_MUTED, lineHeight: 1.75, maxWidth: 460 }}>
                          {desc}
                        </p>
                      </div>

                      <div
                        className="landing-process-preview"
                        style={{
                          borderColor: 'rgba(255,255,255,0.07)',
                          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 50px rgba(0,0,0,0.18)',
                        }}
                      >
                        <div style={{ position: 'absolute', inset: '0 0 auto 0', height: 1, background: `linear-gradient(90deg, transparent, ${tone}, transparent)`, opacity: 0.3 }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
                          <div>
                            <div style={{ fontSize: 10, color: DARK_PANEL_DIM, fontFamily: 'DM Mono, monospace', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
                              {previewTitle}
                            </div>
                            <div style={{ fontSize: 12, color: DARK_PANEL_MUTED }}>
                              {previewNote}
                            </div>
                          </div>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 12, color: tone }}>
                            {meter.value}%
                          </span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
                          {previewItems.map((item, itemIndex) => (
                            <div
                              key={item.label}
                              style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                gap: 12,
                                padding: '10px 0',
                                borderBottom: itemIndex < previewItems.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: item.tone, flexShrink: 0 }} />
                                <span style={{ fontSize: 12, color: DARK_PANEL_TEXT, minWidth: 0 }}>
                                  {item.label}
                                </span>
                              </div>
                              <span
                                className="tag tag-neutral repo-chip"
                                style={{
                                  background: 'rgba(255,255,255,0.04)',
                                  borderColor: 'rgba(255,255,255,0.08)',
                                  color: item.tone,
                                  flexShrink: 0,
                                }}
                              >
                                {item.state}
                              </span>
                            </div>
                          ))}
                        </div>

                        <div style={{ height: 6, borderRadius: 999, background: 'rgba(255,255,255,0.05)', overflow: 'hidden', marginBottom: 8 }}>
                          <div
                            style={{
                              width: `${meter.value}%`,
                              height: '100%',
                              borderRadius: 999,
                              background: `linear-gradient(90deg, rgba(255,255,255,0.12), ${tone})`,
                            }}
                          />
                        </div>
                        <div style={{ fontSize: 10, color: DARK_PANEL_DIM, fontFamily: 'DM Mono, monospace' }}>
                          {meter.label}
                        </div>
                      </div>
                    </div>
                  </RevealSection>
                ))}
              </div>
            </div>
          </div>

          <RevealSection delay="0.3s">
            <div style={{ textAlign: 'center', marginTop: 60 }}>
              <button
                onClick={() => router.push('/auth')}
                style={{
                  padding: '14px 40px', borderRadius: 10,
                  background: 'var(--accent-button)', border: '1px solid rgba(255,255,255,0.04)',
                  color: 'var(--accent-button-text)', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.12) inset',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.12) inset, 0 12px 28px rgba(0,0,0,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.12) inset'; }}
              >
                Start monitoring
              </button>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <RevealSection>
        <section style={{
          borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
          padding: LANDING_CTA_PADDING, position: 'relative', overflow: 'hidden',
          background: 'radial-gradient(ellipse 80% 160% at 50% 50%, rgba(0,229,160,0.06) 0%, transparent 70%)',
        }}>
          <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 14 }}>
              Monitor translation issues before release.
              <br /><span style={{ color: 'var(--accent)' }}>Use one dashboard for coverage, quality, and PR checks.</span>
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: 15, marginBottom: 36 }}>
              Connect a repository and start scanning locale files in minutes.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => router.push('/auth')}
                style={{
                  padding: '13px 32px', borderRadius: 10,
                  background: 'var(--accent-button)', border: '1px solid rgba(255,255,255,0.04)',
                  color: 'var(--accent-button-text)', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.12) inset',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.12) inset, 0 10px 24px rgba(0,0,0,0.18)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.12) inset'; }}
              >
                Connect repository
              </button>
              <button
                onClick={() => router.push('/')}
                style={{
                  padding: '13px 28px', borderRadius: 10,
                  background: 'transparent', border: '1px solid var(--border-bright)',
                  color: 'var(--text-1)', fontSize: 14, cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                Open demo
              </button>
            </div>
          </div>
        </section>
      </RevealSection>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid var(--border)', padding: LANDING_FOOTER_PADDING,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 22, height: 22, borderRadius: 6,
            background: 'linear-gradient(135deg, var(--accent) 0%, #00B87A 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3" fill="#070B14"/>
              <path d="M8 2a6 6 0 1 1 0 12A6 6 0 0 1 8 2z" stroke="#070B14" strokeWidth="1.5" fill="none"/>
              <path d="M8 2v2M8 12v2M2 8h2M12 8h2" stroke="#070B14" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, color: 'var(--text-2)' }}>
            lingo<span style={{ color: 'var(--accent)' }}>pulse</span>
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 20, fontFamily: 'DM Mono, monospace', fontSize: 12, color: 'var(--text-3)' }}>
          <span>Built with{' '}<a href="https://lingo.dev" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Lingo.dev</a></span>
          <span>·</span>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--text-3)', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
          >GitHub</a>
          <span>·</span>
          <a href="https://supabase.com" target="_blank" rel="noopener noreferrer"
            style={{ color: 'var(--text-3)', textDecoration: 'none', transition: 'color 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.color = 'var(--text-1)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
          >Supabase</a>
          <span>·</span>
          <a href="/auth" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Start monitoring</a>
        </div>
      </footer>
    </div>
  );
}
