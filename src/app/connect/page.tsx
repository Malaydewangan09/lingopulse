'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Github, Key, Zap, CheckCircle2, ArrowRight, ExternalLink, Globe, Activity, Shield, LogOut } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

type Step = 'form' | 'analyzing' | 'done' | 'error' | 'exists';

interface AnalysisProgress {
  step: string;
  pct: number;
}

interface ConnectRepoResponse {
  id?: string;
  error?: string;
}

const PROGRESS_STEPS: AnalysisProgress[] = [
  { step: 'Connecting to GitHub…',      pct: 10 },
  { step: 'Registering webhook…',       pct: 22 },
  { step: 'Scanning repository tree…',  pct: 38 },
  { step: 'Fetching i18n files…',       pct: 55 },
  { step: 'Parsing locale keys…',       pct: 68 },
  { step: 'Calculating coverage…',      pct: 80 },
  { step: 'Scoring translation quality via Lingo.dev…', pct: 90 },
  { step: 'Storing metrics…',           pct: 97 },
  { step: 'Analysis complete!',         pct: 100 },
];

export default function ConnectPage() {
  const router = useRouter();
  const [step, setStep]       = useState<Step>('form');
  const [repoUrl, setRepoUrl] = useState('');
  const [ghToken, setGhToken] = useState('');
  const [lingoKey, setLingoKey] = useState('');
  const [progress, setProgress] = useState(0);
  const [progressLabel, setProgressLabel] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [existingRepoId, setExistingRepoId] = useState('');

  const handleSignOut = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.replace('/landing');
  };

  const runProgressAnimation = async () => {
    for (const p of PROGRESS_STEPS) {
      setProgressLabel(p.step);
      setProgress(p.pct);
      await new Promise(r => setTimeout(r, 400 + Math.random() * 600));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('analyzing');
    setProgress(0);

    // Start animation concurrently
    const animPromise = runProgressAnimation();

    try {
      const res = await fetch('/api/repos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl, githubToken: ghToken, lingoApiKey: lingoKey }),
      });
      // Safe JSON parse — server might return empty body on crash
      const text = await res.text();
      let data: ConnectRepoResponse = {};
      try { data = JSON.parse(text); } catch {
        await animPromise;
        setErrorMsg(`Server error (${res.status}): ${text.slice(0, 120) || 'empty response — check your Supabase env vars'}`);
        setStep('error');
        return;
      }

      await animPromise;

      if (res.status === 409) {
        // Repo already connected — offer to go there or force-reconnect
        setExistingRepoId(data.id ?? '');
        setStep('exists');
        return;
      }

      if (!res.ok) {
        setErrorMsg(data.error ?? `Request failed (${res.status})`);
        setStep('error');
        return;
      }

      const repoId = data.id;
      if (!repoId) {
        setErrorMsg('Repo connected but no dashboard id was returned');
        setStep('error');
        return;
      }

      setStep('done');

      setTimeout(() => router.push(`/repo/${repoId}`), 1200);
    } catch (error: unknown) {
      await animPromise;
      setErrorMsg(error instanceof Error ? error.message : 'Request failed');
      setStep('error');
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '24px', position: 'relative', zIndex: 1,
    }}>
      <button
        onClick={() => void handleSignOut()}
        style={{
          position: 'absolute', top: 24, right: 24,
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '8px 12px', borderRadius: 8,
          border: '1px solid var(--border)', background: 'transparent',
          color: 'var(--text-2)', fontSize: 11, fontFamily: 'DM Mono, monospace',
          cursor: 'pointer',
        }}
      >
        <LogOut size={12} />
        Sign out
      </button>

      {/* Logo */}
      <div style={{ marginBottom: 40, textAlign: 'center' }} className="animate-fade-up">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 11,
            background: 'linear-gradient(135deg, var(--accent) 0%, #00B87A 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3" fill="#070B14"/>
              <path d="M8 2a6 6 0 1 1 0 12A6 6 0 0 1 8 2z" stroke="#070B14" strokeWidth="1.5" fill="none"/>
              <path d="M8 2v2M8 12v2M2 8h2M12 8h2" stroke="#070B14" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'DM Mono, monospace', fontWeight: 500, fontSize: 22, letterSpacing: '-0.02em', color: 'var(--text-1)' }}>
            lingo<span style={{ color: 'var(--accent)' }}>pulse</span>
          </span>
        </div>
        <p style={{ color: 'var(--text-2)', fontSize: 14 }}>
          i18n observability for teams that ship globally
        </p>
      </div>

      {/* Feature pills */}
      {step === 'form' && (
        <div style={{
          display: 'flex', gap: 8, marginBottom: 32, flexWrap: 'wrap', justifyContent: 'center',
          animationDelay: '0.1s',
        }} className="animate-fade-up">
          {[
            { icon: <Globe size={11} />, label: 'Coverage heatmap' },
            { icon: <Activity size={11} />, label: 'Quality scoring' },
            { icon: <Shield size={11} />, label: 'PR checks' },
            { icon: <Zap size={11} />, label: 'Live webhook updates' },
          ].map(({ icon, label }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 100,
              background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)',
              fontSize: 11, color: 'var(--accent)', fontFamily: 'DM Mono, monospace',
            }}>
              {icon}{label}
            </div>
          ))}
        </div>
      )}

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 480,
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        animationDelay: '0.15s',
      }} className="animate-fade-up">

        {/* Top glow */}
        <div style={{
          height: 1, background: 'linear-gradient(90deg, transparent, var(--accent-glow), transparent)',
        }} />

        {step === 'form' && (
          <form onSubmit={handleSubmit} style={{ padding: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>
              Connect your repository
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace', marginBottom: 24 }}>
              Lingo Pulse will analyze your i18n files and track quality over time
            </p>

            {/* GitHub repo */}
            <Field
              label="GitHub Repository"
              icon={<Github size={14} />}
              placeholder="github.com/your-org/your-repo"
              value={repoUrl}
              onChange={setRepoUrl}
              required
              hint="Public or private repo you have access to"
            />

            {/* GitHub token */}
            <Field
              label="GitHub Personal Access Token"
              icon={<Key size={14} />}
              placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
              value={ghToken}
              onChange={setGhToken}
              required
              type="password"
              hint={
                <span>
                  Needs <code style={{ background: 'var(--border)', padding: '1px 4px', borderRadius: 3, fontSize: 10 }}>repo</code> scope.{' '}
                  <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                    Generate one <ExternalLink size={9} style={{ display: 'inline', verticalAlign: 'middle' }} />
                  </a>
                </span>
              }
            />

            {/* Lingo API key */}
            <Field
              label="Lingo.dev API Key"
              icon={<Zap size={14} />}
              placeholder="lingo_xxxxxxxxxxxxxxxxxxxx"
              value={lingoKey}
              onChange={setLingoKey}
              type="password"
              hint={
                <span>
                  Optional — enables quality scoring.{' '}
                  <a href="https://lingo.dev" target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                    Get one free <ExternalLink size={9} style={{ display: 'inline', verticalAlign: 'middle' }} />
                  </a>
                </span>
              }
            />

            <button type="submit" style={{
              width: '100%', padding: '12px', marginTop: 8,
              background: 'var(--accent)', border: 'none', borderRadius: 9,
              color: '#070B14', fontFamily: 'DM Mono, monospace',
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'opacity 0.15s, transform 0.15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.opacity = '0.88'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1';    e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              Connect & Analyze <ArrowRight size={14} />
            </button>
          </form>
        )}

        {step === 'analyzing' && (
          <div style={{ padding: 36, textAlign: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, margin: '0 auto 20px',
              background: 'var(--accent-dim)', border: '1px solid var(--accent-glow)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)',
            }}>
              <Zap size={22} />
            </div>
            <h3 style={{ fontSize: 15, color: 'var(--text-1)', marginBottom: 6 }}>Analyzing your repository…</h3>
            <p style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace', marginBottom: 28, minHeight: 16 }}>
              {progressLabel}
            </p>

            {/* Progress bar */}
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
                height: '100%', width: `${progress}%`, borderRadius: 3,
                background: 'linear-gradient(90deg, #1A5C38, var(--accent))',
                transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1)',
                boxShadow: '0 0 8px var(--accent-glow)',
              }} />
            </div>
            <div style={{
              fontFamily: 'DM Mono, monospace', fontSize: 11,
              color: 'var(--text-3)', marginTop: 8, textAlign: 'right',
            }}>
              {progress}%
            </div>
          </div>
        )}

        {step === 'done' && (
          <div style={{ padding: 36, textAlign: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, margin: '0 auto 20px',
              background: 'rgba(63,200,122,0.1)', border: '1px solid rgba(63,200,122,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--success)',
            }}>
              <CheckCircle2 size={24} />
            </div>
            <h3 style={{ fontSize: 15, color: 'var(--success)', marginBottom: 6 }}>Analysis complete!</h3>
            <p style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
              Redirecting to your dashboard…
            </p>
          </div>
        )}

        {step === 'error' && (
          <div style={{ padding: 28 }}>
            <div style={{
              padding: '12px 14px', borderRadius: 8, marginBottom: 20,
              background: 'rgba(240,82,72,0.08)', border: '1px solid rgba(240,82,72,0.2)',
              fontSize: 12, color: 'var(--danger)', fontFamily: 'DM Mono, monospace',
            }}>
              {errorMsg}
            </div>
            <button onClick={() => setStep('form')} style={{
              width: '100%', padding: '10px', background: 'var(--card-hover)',
              border: '1px solid var(--border)', borderRadius: 8,
              color: 'var(--text-1)', fontFamily: 'DM Mono, monospace',
              fontSize: 12, cursor: 'pointer',
            }}>
              ← Try again
            </button>
          </div>
        )}

        {step === 'exists' && (
          <div style={{ padding: 28 }}>
            <div style={{
              padding: '12px 14px', borderRadius: 8, marginBottom: 20,
              background: 'rgba(230,168,23,0.08)', border: '1px solid rgba(230,168,23,0.2)',
              fontSize: 12, color: 'var(--warning)', fontFamily: 'DM Mono, monospace',
              lineHeight: 1.6,
            }}>
              This repo is already connected. You can view its dashboard or force a fresh reconnect (deletes existing data and re-scans).
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {existingRepoId && (
                <button onClick={() => router.push(`/repo/${existingRepoId}`)} style={{
                  width: '100%', padding: '10px', background: 'var(--accent)', border: 'none', borderRadius: 8,
                  color: '#070B14', fontFamily: 'DM Mono, monospace', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                }}>
                  Go to dashboard →
                </button>
              )}
              <button onClick={async () => {
                if (existingRepoId) {
                  await fetch(`/api/repos/${existingRepoId}`, { method: 'DELETE' });
                }
                setStep('form');
              }} style={{
                width: '100%', padding: '10px', background: 'transparent',
                border: '1px solid var(--border)', borderRadius: 8,
                color: 'var(--text-2)', fontFamily: 'DM Mono, monospace',
                fontSize: 12, cursor: 'pointer',
              }}>
                Force reconnect (delete & re-scan)
              </button>
              <button onClick={() => setStep('form')} style={{
                width: '100%', padding: '8px', background: 'transparent', border: 'none',
                color: 'var(--text-3)', fontFamily: 'DM Mono, monospace', fontSize: 11, cursor: 'pointer',
              }}>
                ← Back
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Demo link */}
      {step === 'form' && (
        <button
          onClick={() => router.push('/')}
          style={{
            marginTop: 16, background: 'none', border: 'none',
            color: 'var(--text-3)', fontSize: 11, fontFamily: 'DM Mono, monospace',
            cursor: 'pointer', transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
        >
          View demo dashboard →
        </button>
      )}
    </div>
  );
}

// ─── Field component ─────────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  type?: string;
  hint?: React.ReactNode;
}

function Field({ label, icon, placeholder, value, onChange, required, type = 'text', hint }: FieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-2)', fontFamily: 'DM Mono, monospace', marginBottom: 6 }}>
        {label}
      </label>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--surface)', borderRadius: 8,
        border: `1px solid ${focused ? 'var(--accent-glow)' : 'var(--border)'}`,
        padding: '0 12px',
        transition: 'border-color 0.15s',
        boxShadow: focused ? '0 0 0 3px rgba(0,229,160,0.08)' : 'none',
      }}>
        <span style={{ color: focused ? 'var(--accent)' : 'var(--text-3)', transition: 'color 0.15s', flexShrink: 0 }}>
          {icon}
        </span>
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          required={required}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            color: 'var(--text-1)', fontFamily: 'DM Mono, monospace', fontSize: 12,
            padding: '10px 0',
          }}
        />
      </div>
      {hint && (
        <p style={{ marginTop: 5, fontSize: 11, color: 'var(--text-3)', lineHeight: 1.4 }}>{hint}</p>
      )}
    </div>
  );
}
