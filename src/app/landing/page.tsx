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

const FEATURES = [
  {
    icon: '⬛',
    gradient: 'linear-gradient(135deg, #00E5A0 0%, #00B87A 100%)',
    title: 'Coverage Heatmap',
    desc: 'See exactly which locale × module combinations are missing. Spot translation gaps before they ship to production.',
    stat: '100% visibility',
  },
  {
    icon: '📈',
    gradient: 'linear-gradient(135deg, #4B9EFF 0%, #2563EB 100%)',
    title: 'AI Quality Scoring',
    desc: 'Lingo.dev scores every translation 1–10. Know if your Japanese copy sounds natural or like it was machine-translated.',
    stat: '10-point scale',
  },
  {
    icon: '🔒',
    gradient: 'linear-gradient(135deg, #FF6B35 0%, #DC2626 100%)',
    title: 'PR Gate Checks',
    desc: 'Every PR gets a coverage check. Merge with confidence — or catch regressions before they hit your users.',
    stat: 'Zero regressions',
  },
];

const STEPS = [
  { num: '01', title: 'Connect your GitHub repo', desc: 'Paste your repo URL and GitHub token. Lingo Pulse auto-registers a webhook — no YAML, no config files.' },
  { num: '02', title: 'We scan your i18n files',  desc: 'Detects JSON/YAML locale files, maps coverage per locale × module, and scores quality with Lingo.dev AI.' },
  { num: '03', title: 'Monitor forever',           desc: 'Webhook fires on every push. Dashboard updates live. Get alerted when coverage drops below your threshold.' },
];

const FLOAT_BADGES = [
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const router = useRouter();
  const dark = useIsDark();

  return (
    <div style={{
      position: 'relative', zIndex: 1, minHeight: '100vh',
      fontFamily: "'DM Sans Variable', sans-serif", color: 'var(--text-1)',
    }}>

      {/* ── Nav ── */}
      <nav style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 40px', borderBottom: '1px solid var(--border)',
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
            onClick={() => router.push('/')}
            style={{
              padding: '7px 16px', borderRadius: 7,
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--text-2)', fontSize: 13, cursor: 'pointer',
              fontFamily: "'DM Sans Variable', sans-serif",
              transition: 'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-bright)'; e.currentTarget.style.color = 'var(--text-1)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
          >
            View demo
          </button>
          <button
            onClick={() => router.push('/connect')}
            style={{
              padding: '7px 18px', borderRadius: 7,
              background: 'var(--accent)', border: 'none',
              color: '#070B14', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'DM Sans Variable', sans-serif",
              transition: 'opacity 0.15s, transform 0.15s',
              boxShadow: '0 0 20px rgba(0,229,160,0.2)',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1';    e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            Get started →
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{
        maxWidth: 1100, margin: '0 auto', padding: '88px 40px 72px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center',
        position: 'relative',
      }}>
        {/* Pill badge */}
        <div className="animate-fade-up" style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '5px 14px', borderRadius: 100,
          background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)',
          fontSize: 12, color: 'var(--accent)', fontFamily: 'DM Mono, monospace',
          marginBottom: 28, animationDelay: '0s',
        }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block', animation: 'pulseDot 2s infinite' }} />
          Powered by Lingo.dev · Built for global teams
        </div>

        {/* Headline */}
        <h1 className="animate-fade-up" style={{
          fontSize: 'clamp(34px, 5.2vw, 62px)',
          fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.04em',
          maxWidth: 820, marginBottom: 24,
          animationDelay: '0.08s',
          color: 'var(--text-1)',
        }}>
          Know when your translations break{' '}
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
            before your users do.
          </span>
        </h1>

        {/* Sub */}
        <p className="animate-fade-up" style={{
          fontSize: 18, color: 'var(--text-2)', maxWidth: 560,
          lineHeight: 1.65, marginBottom: 44, animationDelay: '0.16s',
        }}>
          Lingo Pulse monitors i18n coverage, AI quality scores, and PR safety gates across every locale in your codebase.
        </p>

        {/* CTAs */}
        <div className="animate-fade-up" style={{
          display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'center',
          marginBottom: 72, animationDelay: '0.24s',
        }}>
          <button
            onClick={() => router.push('/connect')}
            style={{
              padding: '14px 32px', borderRadius: 10,
              background: 'var(--accent)', border: 'none',
              color: '#070B14', fontSize: 15, fontWeight: 700, cursor: 'pointer',
              fontFamily: "'DM Sans Variable', sans-serif",
              boxShadow: '0 0 40px rgba(0,229,160,0.3)',
              transition: 'opacity 0.15s, transform 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 60px rgba(0,229,160,0.4)'; }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(0,229,160,0.3)'; }}
          >
            Connect your repo →
          </button>
          <button
            onClick={() => router.push('/')}
            style={{
              padding: '14px 28px', borderRadius: 10,
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-bright)',
              color: 'var(--text-1)', fontSize: 15, fontWeight: 500, cursor: 'pointer',
              fontFamily: "'DM Sans Variable', sans-serif",
              transition: 'background 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'var(--border-bright)'; }}
          >
            View live demo
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
            <div key={i} style={{
              position: 'absolute',
              top: b.top,
              left: (b as any).left,
              right: (b as any).right,
              background: 'var(--card)',
              border: `1px solid ${b.color}44`,
              borderRadius: 100,
              padding: '4px 10px',
              fontSize: 10,
              fontFamily: 'DM Mono, monospace',
              color: b.color,
              whiteSpace: 'nowrap',
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
          padding: '22px 40px',
        }}>
          <div style={{
            maxWidth: 1100, margin: '0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 0, flexWrap: 'wrap',
          }}>
            {[
              { value: '247', label: 'missing keys caught', color: 'var(--danger)' },
              { value: '12',  label: 'locales tracked',     color: 'var(--accent)' },
              { value: '~0s', label: 'webhook latency',     color: 'var(--blue)'   },
              { value: '10×', label: 'quality metrics',     color: 'var(--warning)'},
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

      {/* ── Features ── */}
      <section style={{ maxWidth: 1100, margin: '0 auto', padding: '88px 40px 72px' }}>
        <RevealSection>
          <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 700, letterSpacing: '-0.03em', textAlign: 'center', marginBottom: 12 }}>
            Everything you need to ship i18n with confidence
          </h2>
          <p style={{ textAlign: 'center', color: 'var(--text-2)', fontSize: 16, marginBottom: 56, maxWidth: 560, margin: '12px auto 56px' }}>
            Built for engineering teams that care about quality in every language.
          </p>
        </RevealSection>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {FEATURES.map(({ gradient, title, desc, stat }, i) => (
            <RevealSection key={title} delay={`${i * 0.1}s`}>
              <div style={{
                background: 'var(--card)', border: '1px solid var(--border)',
                borderRadius: 14, padding: '28px 24px', height: '100%',
                transition: 'border-color 0.2s, transform 0.2s, box-shadow 0.2s',
                position: 'relative', overflow: 'hidden',
              }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = 'var(--border-bright)';
                  el.style.transform = 'translateY(-4px)';
                  el.style.boxShadow = '0 20px 60px rgba(0,0,0,0.4)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement;
                  el.style.borderColor = 'var(--border)';
                  el.style.transform = 'translateY(0)';
                  el.style.boxShadow = 'none';
                }}
              >
                {/* Top gradient line */}
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: gradient, opacity: 0.8 }} />

                <div style={{
                  width: 40, height: 40, borderRadius: 10, marginBottom: 18,
                  background: gradient, opacity: 0.9,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 18,
                }} />

                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, letterSpacing: '-0.01em' }}>{title}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.65, marginBottom: 18 }}>{desc}</p>
                <div style={{
                  display: 'inline-flex', alignItems: 'center',
                  padding: '3px 10px', borderRadius: 100,
                  background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)',
                  fontSize: 11, color: 'var(--accent)', fontFamily: 'DM Mono, monospace',
                }}>
                  {stat}
                </div>
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{ borderTop: '1px solid var(--border)', padding: '88px 40px' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <RevealSection>
            <h2 style={{ fontSize: 'clamp(24px, 3.5vw, 38px)', fontWeight: 700, letterSpacing: '-0.03em', textAlign: 'center', marginBottom: 12 }}>
              Up and running in 3 steps
            </h2>
            <p style={{ textAlign: 'center', color: 'var(--text-2)', fontSize: 16, marginBottom: 60, maxWidth: 480, margin: '12px auto 60px' }}>
              No config files. No YAML. Just paste your repo URL and go.
            </p>
          </RevealSection>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 32, position: 'relative' }}>
            {/* Connector lines */}
            <div style={{
              position: 'absolute', top: 28, left: '16.67%', right: '16.67%', height: 1,
              background: 'linear-gradient(90deg, transparent, var(--border), var(--border), transparent)',
              zIndex: 0,
            }} />

            {STEPS.map(({ num, title, desc }, i) => (
              <RevealSection key={num} delay={`${i * 0.12}s`} style={{ position: 'relative', zIndex: 1 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 16, marginBottom: 20,
                  background: 'var(--card)', border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 0 4px var(--bg)',
                }}>
                  <span style={{
                    fontFamily: 'DM Mono, monospace', fontSize: 16, fontWeight: 700,
                    color: 'var(--accent)',
                  }}>{num}</span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 10, letterSpacing: '-0.01em' }}>{title}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.65 }}>{desc}</p>
              </RevealSection>
            ))}
          </div>

          <RevealSection delay="0.3s">
            <div style={{ textAlign: 'center', marginTop: 60 }}>
              <button
                onClick={() => router.push('/connect')}
                style={{
                  padding: '14px 40px', borderRadius: 10,
                  background: 'var(--accent)', border: 'none',
                  color: '#070B14', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  fontFamily: "'DM Sans Variable', sans-serif",
                  boxShadow: '0 0 40px rgba(0,229,160,0.25)',
                  transition: 'opacity 0.15s, transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 0 60px rgba(0,229,160,0.4)'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 0 40px rgba(0,229,160,0.25)'; }}
              >
                Get started — it&apos;s free →
              </button>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <RevealSection>
        <section style={{
          borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
          padding: '72px 40px', position: 'relative', overflow: 'hidden',
          background: 'radial-gradient(ellipse 80% 160% at 50% 50%, rgba(0,229,160,0.06) 0%, transparent 70%)',
        }}>
          <div style={{ maxWidth: 640, margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(22px, 3vw, 34px)', fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 14 }}>
              Stop shipping broken translations.
              <br /><span style={{ color: 'var(--accent)' }}>Start shipping with confidence.</span>
            </h2>
            <p style={{ color: 'var(--text-2)', fontSize: 15, marginBottom: 36 }}>
              Connect your first repo in under 2 minutes. Free forever.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={() => router.push('/connect')}
                style={{
                  padding: '13px 32px', borderRadius: 10,
                  background: 'var(--accent)', border: 'none',
                  color: '#070B14', fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  fontFamily: "'DM Sans Variable', sans-serif",
                  transition: 'opacity 0.15s, transform 0.15s',
                  boxShadow: '0 0 32px rgba(0,229,160,0.3)',
                }}
                onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                Connect your repo →
              </button>
              <button
                onClick={() => router.push('/')}
                style={{
                  padding: '13px 28px', borderRadius: 10,
                  background: 'transparent', border: '1px solid var(--border-bright)',
                  color: 'var(--text-1)', fontSize: 14, cursor: 'pointer',
                  fontFamily: "'DM Sans Variable', sans-serif",
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                View demo first
              </button>
            </div>
          </div>
        </section>
      </RevealSection>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: '1px solid var(--border)', padding: '24px 40px',
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
          <a href="/connect" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Get started →</a>
        </div>
      </footer>
    </div>
  );
}
