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
      transition: 'color 0.15s, border-color 0.15s, transform 0.1s',
    }}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent-glow)'; }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
      onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.92)'; }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)'; }}
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
    title: 'We scan your locale files automatically',
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
    title: 'Catch regressions at the PR, not in production',
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

function RevealSection({ children, delay = '0s', style = {}, blur = false }: { children: React.ReactNode; delay?: string; style?: React.CSSProperties; blur?: boolean }) {
  const ref = useReveal();
  return (
    <div ref={ref} className={blur ? 'reveal-blur' : 'reveal'} style={{ transitionDelay: delay, ...style }}>
      {children}
    </div>
  );
}

function StaggerReveal({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const ref = useReveal();
  return (
    <div ref={ref} className="reveal-stagger" style={style}>
      {children}
    </div>
  );
}

function TiltCard({ children, className = '', style = {}, strength = 7 }: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  strength?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const cur = useRef({ x: 0, y: 0 });
  const tgt = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      tgt.current = {
        x: ((e.clientX - r.left) / r.width - 0.5) * strength,
        y: -((e.clientY - r.top) / r.height - 0.5) * strength,
      };
    };
    const onLeave = () => { tgt.current = { x: 0, y: 0 }; };
    const tick = () => {
      cur.current.x += (tgt.current.x - cur.current.x) * 0.1;
      cur.current.y += (tgt.current.y - cur.current.y) * 0.1;
      el.style.transform = `perspective(900px) rotateY(${cur.current.x.toFixed(3)}deg) rotateX(${cur.current.y.toFixed(3)}deg)`;
      frame.current = requestAnimationFrame(tick);
    };
    el.addEventListener('mousemove', onMove);
    el.addEventListener('mouseleave', onLeave);
    frame.current = requestAnimationFrame(tick);
    return () => {
      el.removeEventListener('mousemove', onMove);
      el.removeEventListener('mouseleave', onLeave);
      cancelAnimationFrame(frame.current);
    };
  }, [strength]);

  return (
    <div ref={ref} className={className} style={{ ...style, willChange: 'transform' }}>
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

// ── Screenshots Section ───────────────────────────────────────────────────────

const SCREENSHOT_TABS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    tag: 'Coverage map',
    tagColor: 'var(--accent)',
    description: 'See which locales and modules have gaps at a glance. The red cells are what your users are hitting.',
    src: '/screenshots/dashboard.png',
    alt: 'Lingo Pulse dashboard showing coverage heatmap and live incidents',
  },
  {
    id: 'scan-diff',
    label: 'Scan Diff',
    tag: 'Release signal',
    tagColor: 'var(--blue)',
    description: 'After every push, this shows exactly what got worse and what recovered. Open a draft fix PR directly from this view.',
    src: '/screenshots/scan-diff.png',
    alt: 'Lingo Pulse scan diff view showing missing key recoveries and regressions',
  },
  {
    id: 'sdk',
    label: 'SDK',
    tag: 'Production incidents',
    tagColor: 'var(--warning)',
    description: 'Four lines of code in your frontend. Broken translations from real users show up here the moment they happen.',
    src: '/screenshots/sdk.png',
    alt: 'Lingo Pulse SDK setup page with live incident feed',
  },
  {
    id: 'connect',
    label: 'Connect',
    tag: 'Setup',
    tagColor: 'var(--text-2)',
    description: 'Takes about 30 seconds. Pick your repo from the list or paste a token for private access. No config files needed.',
    src: '/screenshots/connect.png',
    alt: 'Lingo Pulse connect page with GitHub OAuth repo picker',
  },
];

function ScreenshotsSection() {
  const [active, setActive] = useState(SCREENSHOT_TABS[0].id);
  const [displayed, setDisplayed] = useState(SCREENSHOT_TABS[0].id);
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle');
  const tab = SCREENSHOT_TABS.find(t => t.id === displayed)!;

  function switchTab(id: string) {
    if (id === active || phase !== 'idle') return;
    setActive(id);
    setPhase('exit');
    setTimeout(() => {
      setDisplayed(id);
      setPhase('enter');
      setTimeout(() => setPhase('idle'), 380);
    }, 180);
  }

  const contentStyle: React.CSSProperties = {
    transition: 'opacity 0.18s ease, transform 0.18s ease',
    opacity: phase === 'exit' ? 0 : 1,
    transform: phase === 'exit' ? 'translateY(6px)' : phase === 'enter' ? 'translateY(0)' : 'translateY(0)',
    animation: phase === 'enter' ? 'screenshotEnter 0.36s cubic-bezier(0.22,1,0.36,1) both' : 'none',
  };

  return (
    <RevealSection blur>
      <style>{`
        @keyframes screenshotEnter {
          from { opacity: 0; transform: translateY(14px) scale(0.995); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
        @keyframes captionEnter {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <section style={{ borderTop: '1px solid var(--border)', padding: `88px 28px 80px` }}>
        <div style={{ maxWidth: LANDING_SHELL_MAX, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 40, marginBottom: 48, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--blue)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
                Product tour
              </div>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 1.0, color: 'var(--text-1)' }}>
                See it in action.
              </h2>
            </div>
            <p style={{ color: 'var(--text-2)', fontSize: 15, maxWidth: 340, lineHeight: 1.75, paddingBottom: 6 }}>
              Real screenshots from a live repository connected to Lingo Pulse.
            </p>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 36, flexWrap: 'wrap' }}>
            {SCREENSHOT_TABS.map(t => (
              <button
                key={t.id}
                onClick={() => switchTab(t.id)}
                style={{
                  padding: '8px 18px', borderRadius: 8, fontSize: 13, fontWeight: 500,
                  fontFamily: 'var(--font-sans)', cursor: 'pointer',
                  border: active === t.id ? '1px solid var(--accent-glow)' : '1px solid var(--border)',
                  background: active === t.id ? 'var(--accent-dim)' : 'transparent',
                  color: active === t.id ? 'var(--accent)' : 'var(--text-2)',
                  transition: 'all 0.18s',
                }}
                onMouseEnter={e => { if (active !== t.id) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.transform = 'scale(1.02)'; }}}
                onMouseLeave={e => { if (active !== t.id) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.transform = 'scale(1)'; }}}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.02)'; }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Caption — animates with the screenshot */}
          <div
            key={displayed}
            style={{
              textAlign: 'center', marginBottom: 24,
              animation: phase === 'enter' ? 'captionEnter 0.3s ease both' : 'none',
            }}
          >
            <span style={{
              fontFamily: 'DM Mono, monospace', fontSize: 11, letterSpacing: '0.08em',
              textTransform: 'uppercase', color: tab.tagColor, marginRight: 10,
            }}>
              {tab.tag}
            </span>
            <span style={{ color: 'var(--text-2)', fontSize: 14 }}>{tab.description}</span>
          </div>

          {/* Screenshot frame */}
          <div style={{
            borderRadius: 18, border: '1px solid var(--border)',
            overflow: 'hidden', background: 'var(--card)',
            boxShadow: '0 40px 100px rgba(0,0,0,0.5)',
            position: 'relative',
          }}>
            {/* Window chrome */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '12px 18px', borderBottom: '1px solid var(--border)',
              background: 'var(--card)',
            }}>
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--danger)', opacity: 0.8 }} />
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--warning)', opacity: 0.8 }} />
              <div style={{ width: 9, height: 9, borderRadius: '50%', background: 'var(--success)', opacity: 0.8 }} />
              <span style={{ marginLeft: 10, fontSize: 11, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
                lingopulse.app
              </span>
              {/* Active tab name in chrome bar */}
              <span style={{
                marginLeft: 'auto', fontSize: 10, color: tab.tagColor,
                fontFamily: 'DM Mono, monospace', letterSpacing: '0.06em',
                transition: 'color 0.2s',
              }}>
                {tab.label.toLowerCase()}
              </span>
            </div>
            <div style={contentStyle}>
              <img
                src={tab.src}
                alt={tab.alt}
                style={{ width: '100%', display: 'block' }}
              />
            </div>
          </div>
        </div>
      </section>
    </RevealSection>
  );
}

// ── CascadeBadge ──────────────────────────────────────────────────────────────

function CascadeBadge({ text }: { text: string }) {
  const [visible, setVisible] = useState(0);
  const [phase, setPhase] = useState<'in' | 'hold' | 'out'>('in');

  useEffect(() => {
    const chars = text.split('');
    let i = 0;
    let timer: ReturnType<typeof setTimeout>;

    function runIn() {
      setPhase('in');
      setVisible(0);
      i = 0;
      const tick = () => {
        i++;
        setVisible(i);
        if (i < chars.length) {
          timer = setTimeout(tick, 38);
        } else {
          setPhase('hold');
          timer = setTimeout(runOut, 3200);
        }
      };
      timer = setTimeout(tick, 38);
    }

    function runOut() {
      setPhase('out');
      i = chars.length;
      const tick = () => {
        i--;
        setVisible(i);
        if (i > 0) {
          timer = setTimeout(tick, 22);
        } else {
          timer = setTimeout(runIn, 600);
        }
      };
      timer = setTimeout(tick, 22);
    }

    runIn();
    return () => clearTimeout(timer);
  }, [text]);

  const chars = text.split('');
  return (
    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 13, fontWeight: 500, letterSpacing: '0.04em', display: 'inline-flex' }}>
      {chars.map((ch, i) => (
        <span key={i} style={{
          color: i < visible ? 'var(--accent)' : 'transparent',
          transition: 'color 0.12s ease',
          whiteSpace: 'pre',
        }}>
          {ch}
        </span>
      ))}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const dark = useIsDark();
  const heroGlowRef = useRef<HTMLDivElement>(null);
  const [ctaLoading, setCtaLoading] = useState(false);

  const goToAuth = () => {
    if (ctaLoading) return;
    setCtaLoading(true);
    router.push('/auth');
  };

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
            onClick={() => router.push('/repo/demo')}
            style={{
              height: 40, padding: '0 20px', borderRadius: 10,
              background: 'var(--accent-button)', border: '1px solid rgba(255,255,255,0.04)',
              color: 'var(--accent-button-text)', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'var(--font-sans)',
              display: 'flex', alignItems: 'center', gap: 7,
              transition: 'transform 0.15s, box-shadow 0.15s',
              boxShadow: '0 1px 0 rgba(255,255,255,0.12) inset',
            }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.12) inset, 0 10px 24px rgba(0,0,0,0.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.12) inset'; }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.02)'; }}
          >
            Try Demo
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section
        onMouseMove={e => {
          if (!heroGlowRef.current) return;
          const r = e.currentTarget.getBoundingClientRect();
          heroGlowRef.current.style.transform = `translate(${e.clientX - r.left - 350}px, ${e.clientY - r.top - 350}px)`;
        }}
        style={{
          maxWidth: 2000, margin: '0 auto', padding: LANDING_SECTION_PADDING,
          display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
          position: 'relative', overflow: 'hidden',
        }}
      >
        {/* Mouse-follow ambient glow */}
        <div ref={heroGlowRef} style={{
          position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 0,
          width: 700, height: 700, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,229,160,0.05) 0%, transparent 60%)',
          transform: 'translate(270px, -200px)',
        }} />

        {/* Hero badge — scramble */}
        <div className="animate-fade-up" style={{ marginBottom: 28, animationDelay: '0s' }}>
          <CascadeBadge text="know what's missing before it ships" />
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up" style={{
          fontSize: 'clamp(34px, 5.2vw, 62px)',
          fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.04em',
          maxWidth: 820, marginBottom: 24,
          animationDelay: '0.08s',
          color: 'var(--text-1)',
        }}>
          Your translations are broken.{' '}
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
            You just don&apos;t know it yet.
          </span>
        </h1>

        {/* Sub */}
        <p className="animate-fade-up" style={{
          fontSize: 18, color: 'var(--text-2)', maxWidth: 560,
          lineHeight: 1.65, marginBottom: 44, animationDelay: '0.16s',
        }}>
          Push code, we tell you what's broken in your translations before your users do.
        </p>

        {/* CTAs */}
        <div className="animate-fade-up" style={{
          display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center',
          marginBottom: 72, animationDelay: '0.24s',
        }}>
          <button
            onClick={goToAuth}
            disabled={ctaLoading}
            style={{
              padding: '14px 32px', borderRadius: 10,
              background: 'var(--accent-button)', border: '1px solid rgba(255,255,255,0.04)',
              color: 'var(--accent-button-text)', fontSize: 15, fontWeight: 700,
              cursor: ctaLoading ? 'default' : 'pointer',
              fontFamily: 'var(--font-sans)',
              boxShadow: '0 1px 0 rgba(255,255,255,0.12) inset',
              transition: 'transform 0.15s, box-shadow 0.15s, opacity 0.15s',
              opacity: ctaLoading ? 0.75 : 1,
              display: 'flex', alignItems: 'center', gap: 8,
            }}
            onMouseEnter={e => { if (!ctaLoading) { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.12) inset, 0 12px 28px rgba(0,0,0,0.2)'; }}}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.12) inset'; }}
            onMouseDown={e => { if (!ctaLoading) { e.currentTarget.style.transform = 'scale(0.97)'; e.currentTarget.style.boxShadow = '0 0 0 rgba(0,0,0,0)'; }}}
            onMouseUp={e => { if (!ctaLoading) { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.12) inset, 0 12px 28px rgba(0,0,0,0.2)'; }}}
          >
            {ctaLoading && (
              <svg width="14" height="14" viewBox="0 0 14 14" style={{ animation: 'spin 0.7s linear infinite', flexShrink: 0 }}>
                <circle cx="7" cy="7" r="5.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3"/>
                <path d="M7 1.5a5.5 5.5 0 0 1 5.5 5.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            )}
            Connect repository
          </button>
          <button
            onClick={() => router.push('/docs')}
            style={{
              padding: '14px 28px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-bright)',
              color: 'var(--text-1)', fontSize: 15, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'scale(1.02)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.transform = 'scale(1)'; }}
            onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
            onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.02)'; }}
          >
            Read the docs
          </button>
        </div>

        {/* Hero heatmap card */}
        <TiltCard strength={5} className="animate-fade-up animate-glow-pulse" style={{
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
        </TiltCard>
      </section>

      {/* ── Stats bar ── */}
      <RevealSection>
        <section style={{
          borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
          background: 'linear-gradient(90deg, rgba(0,229,160,0.025) 0%, rgba(75,158,255,0.015) 100%)',
          padding: LANDING_BAND_PADDING,
        }}>
          <StaggerReveal style={{
            maxWidth: LANDING_SHELL_MAX, margin: '0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 0, flexWrap: 'wrap',
          }}>
            {[
              { value: '247', label: 'missing keys caught', color: 'var(--danger)' },
              { value: '12',  label: 'locales tracked',     color: 'var(--accent)' },
              { value: '1',   label: 'click to open fix PR',  color: 'var(--blue)'   },
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
          </StaggerReveal>
        </section>
      </RevealSection>

      {/* ── Compatibility strip ── */}
      <RevealSection delay="0.06s">
        <section style={{ padding: `18px 0 0`, overflow: 'hidden' }}>
          <div style={{ textAlign: 'center', fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text-3)', marginBottom: 14, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Scans common repository i18n layouts
          </div>
          <div style={{ position: 'relative', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', padding: '10px 0', overflow: 'hidden' }}>
            {/* fade edges */}
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(90deg, var(--bg), transparent)', zIndex: 1, pointerEvents: 'none' }} />
            <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 80, background: 'linear-gradient(270deg, var(--bg), transparent)', zIndex: 1, pointerEvents: 'none' }} />
            <div style={{ display: 'inline-flex', gap: 40, animation: 'marqueeShift 18s linear infinite', whiteSpace: 'nowrap' }}>
              {[...REPO_PATTERNS, ...REPO_PATTERNS].map((pattern, i) => (
                <span key={i} style={{
                  fontFamily: 'DM Mono, monospace', fontSize: 12,
                  color: i % 3 === 0 ? 'var(--accent)' : 'var(--text-2)',
                  fontWeight: i % 3 === 0 ? 600 : 400,
                  letterSpacing: '0.02em',
                }}>
                  {i % 3 !== 0 && <span style={{ marginRight: 40, color: 'var(--border)', fontWeight: 400 }}>·</span>}
                  {pattern}
                </span>
              ))}
            </div>
          </div>
        </section>
      </RevealSection>

      {/* ── Features ── */}
      <section style={{ maxWidth: LANDING_SHELL_MAX, margin: '0 auto', padding: LANDING_SECTION_PADDING }}>
        <RevealSection blur>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 40, marginBottom: 52, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--blue)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
                Operations
              </div>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 1.0, color: 'var(--text-1)', maxWidth: 580 }}>
                See what broke,<br />fix it fast.
              </h2>
            </div>
            <p style={{ color: 'var(--text-2)', fontSize: 15, maxWidth: 340, lineHeight: 1.75, paddingBottom: 6 }}>
              Every push shows you what regressed. One click opens a fix PR. The SDK catches whatever slips through to production.
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
                border: '1px solid rgba(255,255,255,0.07)',
                background: '#0a0e14',
                boxShadow: '0 44px 120px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
                padding: 30,
                color: DARK_PANEL_TEXT,
              }}
            >
              <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)', backgroundSize: '40px 40px', opacity: 0.3 }} />
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)' }} />

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
                  background: '#0a0e14',
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
                  background: '#0a0e14',
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

      {/* ── Demo Video ── */}
      <section style={{ 
        padding: '80px 24px', 
        background: 'var(--surface)', 
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Animated background glow */}
        <div style={{
          position: 'absolute',
          top: '30%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600,
          height: 400,
          background: 'transparent',
          animation: 'pulse 4s ease-in-out infinite',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '50%',
          height: '100%',
          background: 'linear-gradient(90deg, rgba(0,229,160,0.03) 0%, transparent 100%)',
          pointerEvents: 'none',
        }} />
        
        <div style={{ maxWidth: 1100, margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 40, marginBottom: 32, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
                Demo
              </div>
              <h2 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 1.0, color: 'var(--text-1)' }}>
                From repo<br />to production.
              </h2>
            </div>
            <p style={{ color: 'var(--text-2)', fontSize: 15, maxWidth: 340, lineHeight: 1.75, paddingBottom: 6 }}>
              Watch how Lingo Pulse catches translation bugs in production.
            </p>
          </div>
          
          {/* Video container */}
          <div style={{ 
            position: 'relative',
            maxWidth: 1100,
            margin: '0 auto',
            borderRadius: 12, 
            overflow: 'hidden',
            border: '1px solid var(--border)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.4)',
          }}>
            <video 
              autoPlay
              muted
              loop
              playsInline
              controls
              style={{ 
                width: '100%', 
                display: 'block',
                background: '#0a0e14',
              }}
            >
              <source src="/lingopulse.mp4" type="video/mp4" />
            </video>
          </div>
          
          {/* CTA buttons */}
          <div style={{ marginTop: 28, display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/auth" style={{
              padding: '10px 24px',
              borderRadius: 8,
              background: 'var(--accent)',
              color: 'var(--bg)',
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
              boxShadow: '0 4px 15px rgba(0,229,160,0.3)',
              transition: 'transform 0.15s, box-shadow 0.15s',
              display: 'inline-block',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.03)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,229,160,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(0,229,160,0.3)'; }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.03)'; }}
            >
              Try it now
            </a>
            <a href="https://github.com/Malaydewangan09/lingopulse" target="_blank" style={{
              padding: '10px 24px',
              borderRadius: 8,
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-1)',
              fontWeight: 500,
              fontSize: 14,
              textDecoration: 'none',
              transition: 'background 0.15s, border-color 0.15s, transform 0.15s',
              display: 'inline-block',
            }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'; e.currentTarget.style.transform = 'scale(1.02)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'scale(1)'; }}
              onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
              onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.02)'; }}
            >
              GitHub
            </a>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" style={{ borderTop: '1px solid var(--border)', padding: LANDING_WIDE_SECTION_PADDING }}>
        <div style={{ maxWidth: LANDING_SHELL_MAX, margin: '0 auto' }}>
          <RevealSection blur>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 40, marginBottom: 52, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 14 }}>
                  Setup
                </div>
                <h2 style={{ fontSize: 'clamp(28px, 4vw, 52px)', fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 1.0, color: 'var(--text-1)' }}>
                  Three steps.<br />That&apos;s it.
                </h2>
              </div>
              <p style={{ color: 'var(--text-2)', fontSize: 15, maxWidth: 340, lineHeight: 1.75, paddingBottom: 6 }}>
                Sign in, select a repository, and start monitoring locale coverage in minutes.
              </p>
            </div>
          </RevealSection>

          <div className="landing-process-shell">
            <div className="landing-process-inner">
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18, paddingBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 8px var(--accent)' }} />
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: DARK_PANEL_DIM, letterSpacing: '0.06em' }}>
                  3 min setup · GitHub native · no config required
                </span>
              </div>

              <div className="landing-process-list">
                {STEPS.map(({ num, kicker, title, desc, signal, tone, previewTitle, previewNote, previewItems, meter }, i) => (
                  <RevealSection key={num} delay={`${i * 0.12}s`}>
                    <div className="landing-process-row">
                      <div className="landing-process-index-wrap">
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 58 }}>
                          <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: tone, letterSpacing: '0.06em', marginBottom: 4, opacity: 0.7 }}>
                            {kicker.toUpperCase()}
                          </div>
                          <div style={{ fontSize: 44, fontWeight: 900, lineHeight: 1, letterSpacing: '-0.06em', color: tone, opacity: 0.18, fontFamily: 'DM Mono, monospace', userSelect: 'none' }}>
                            {num}
                          </div>
                        </div>
                        {i < STEPS.length - 1 && <div className="landing-process-segment" />}
                      </div>

                      <div className="landing-process-copy">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                          <span style={{ width: 3, height: 16, borderRadius: 2, background: tone, display: 'inline-block' }} />
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: DARK_PANEL_DIM, letterSpacing: '0.06em' }}>
                            {signal}
                          </span>
                        </div>

                        <h3 style={{ fontSize: 'clamp(20px, 2.2vw, 26px)', fontWeight: 700, marginBottom: 12, letterSpacing: '-0.03em', color: DARK_PANEL_TEXT, lineHeight: 1.15 }}>
                          {title}
                        </h3>
                        <p style={{ fontSize: 14, color: DARK_PANEL_MUTED, lineHeight: 1.8, maxWidth: 420 }}>
                          {desc}
                        </p>
                      </div>

                      <div
                        className="landing-process-preview"
                        style={{ borderColor: 'rgba(255,255,255,0.07)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04), 0 18px 50px rgba(0,0,0,0.18)', padding: 0, overflow: 'hidden' }}
                      >
                        {/* Window chrome */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.1)' }} />
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: tone, opacity: 0.6 }} />
                          </div>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: DARK_PANEL_DIM }}>{previewTitle}</span>
                          <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: tone, fontWeight: 700 }}>{meter.value}%</span>
                        </div>

                        <div style={{ padding: '14px 16px' }}>
                          <div style={{ position: 'absolute', inset: '0 0 auto 0', height: 1, background: `linear-gradient(90deg, transparent, ${tone}, transparent)`, opacity: 0.25 }} />

                          <div style={{ fontSize: 11, color: DARK_PANEL_MUTED, marginBottom: 12 }}>{previewNote}</div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
                            {previewItems.map((item, itemIndex) => (
                              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: itemIndex < previewItems.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.tone, flexShrink: 0 }} />
                                  <span style={{ fontSize: 11, color: DARK_PANEL_TEXT, minWidth: 0 }}>{item.label}</span>
                                </div>
                                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: item.tone, flexShrink: 0, letterSpacing: '0.04em' }}>{item.state}</span>
                              </div>
                            ))}
                          </div>

                          <div style={{ height: 3, borderRadius: 999, background: 'rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                            <div style={{ width: `${meter.value}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, rgba(255,255,255,0.08), ${tone})` }} />
                          </div>
                          <div style={{ fontSize: 10, color: DARK_PANEL_DIM, fontFamily: 'DM Mono, monospace', marginTop: 6 }}>{meter.label}</div>
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
                onClick={goToAuth}
                style={{
                  padding: '14px 40px', borderRadius: 10,
                  background: 'var(--accent-button)', border: '1px solid rgba(255,255,255,0.04)',
                  color: 'var(--accent-button-text)', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.12) inset',
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.12) inset, 0 12px 28px rgba(0,0,0,0.2)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.12) inset'; }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; e.currentTarget.style.boxShadow = 'none'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.12) inset, 0 12px 28px rgba(0,0,0,0.2)'; }}
              >
                Start monitoring
              </button>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ── Product Screenshots ── */}
      <ScreenshotsSection />

      {/* ── CTA Banner ── */}
      <RevealSection>
        <section style={{
          borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
          padding: LANDING_CTA_PADDING, position: 'relative', overflow: 'hidden',
          background: 'transparent',
        }}>
          <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center' }}>
            <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--text-2)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 20 }}>
              Start monitoring
            </div>
            <h2 style={{ fontSize: 'clamp(26px, 3.8vw, 48px)', fontWeight: 900, letterSpacing: '-0.045em', lineHeight: 1.0, marginBottom: 18 }}>
              No more broken translations<br />
              <span style={{ color: 'var(--accent)' }}>reaching your users.</span>
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: 15, marginBottom: 36, maxWidth: 440, margin: '0 auto 36px' }}>
              Connect a repository and start scanning locale files in minutes.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={goToAuth}
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
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; e.currentTarget.style.boxShadow = 'none'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.02)'; e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.12) inset, 0 10px 24px rgba(0,0,0,0.18)'; }}
              >
                Connect repository
              </button>
              <button
                onClick={() => router.push('/docs')}
                style={{
                  padding: '13px 28px', borderRadius: 10,
                  background: 'transparent', border: '1px solid var(--border-bright)',
                  color: 'var(--text-1)', fontSize: 14, cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
              transition: 'background 0.15s, border-color 0.15s, transform 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.transform = 'scale(1.02)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.transform = 'scale(1)'; }}
                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1.02)'; }}
              >
                Read the docs
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
          <a href="https://github.com/Malaydewangan09/lingopulse" target="_blank" rel="noopener noreferrer"
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
