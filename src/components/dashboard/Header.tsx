'use client';
import { useState, useEffect } from 'react';
import { RefreshCw, GitBranch, ChevronDown, ExternalLink, Sun, Moon, GitCompareArrows, CheckCircle2, ShieldAlert, TriangleAlert, Code2 } from 'lucide-react';
import type { RepoInfo, ScanDiffSummary } from '@/lib/types';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';
import { usePathname, useRouter } from 'next/navigation';

function ThemeToggle() {
  const [dark, setDark] = useState(true);
  useEffect(() => {
    const check = () => setDark(!document.documentElement.classList.contains('light'));
    check();
    const saved = localStorage.getItem('theme');
    if (saved) document.documentElement.classList.toggle('light', saved === 'light');
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('light', !next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    setDark(next);
  };
  return (
    <button
      onClick={toggle}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{
        width: 32, height: 32, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--card)', border: '1px solid var(--border)',
        color: 'var(--text-2)', cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent-glow)'; }}
      onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      {dark ? <Sun size={14} /> : <Moon size={14} />}
    </button>
  );
}

interface HeaderProps {
  repo: RepoInfo;
  scanDiff?: ScanDiffSummary | null;
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
}

function formatAnalyzedLabel(value: string) {
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

function getDiffTone(status: 'safe' | 'watch' | 'blocked') {
  if (status === 'safe') {
    return {
      background: 'rgba(63,200,122,0.14)',
      border: 'rgba(63,200,122,0.26)',
      color: 'var(--success)',
      icon: <CheckCircle2 size={12} />,
    };
  }

  if (status === 'blocked') {
    return {
      background: 'rgba(240,82,72,0.14)',
      border: 'rgba(240,82,72,0.26)',
      color: 'var(--danger)',
      icon: <ShieldAlert size={12} />,
    };
  }

  return {
    background: 'rgba(230,168,23,0.14)',
    border: 'rgba(230,168,23,0.26)',
    color: 'var(--warning)',
    icon: <TriangleAlert size={12} />,
  };
}

export default function Header({ repo, scanDiff, onRefresh, refreshing: externalRefreshing }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [localRefreshing, setLocalRefreshing] = useState(false);
  const refreshing = externalRefreshing ?? localRefreshing;
  const onDiffPage = pathname?.endsWith('/diff');
  const onSdkPage = pathname?.endsWith('/sdk');
  const diffTone = getDiffTone(scanDiff?.status ?? 'watch');

  const handleRefresh = async () => {
    if (refreshing) return;
    setLocalRefreshing(true);
    try { await onRefresh?.(); } finally { setLocalRefreshing(false); }
  };

  const handleSignOut = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    router.replace('/landing');
  };

  const analyzedLabel = formatAnalyzedLabel(repo.lastAnalyzed);

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 50,
      background: 'var(--bg)',
      borderBottom: '1px solid var(--border)',
      padding: '0 24px',
    }}>
      <div style={{ maxWidth: 1440, margin: '0 auto', display: 'flex', alignItems: 'center', height: 56, gap: 16 }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 8 }}>
          <div style={{
            width: 30, height: 30, borderRadius: 8,
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3" fill="#070B14"/>
              <path d="M8 2a6 6 0 1 1 0 12A6 6 0 0 1 8 2z" stroke="#070B14" strokeWidth="1.5" fill="none"/>
              <path d="M8 2v2M8 12v2M2 8h2M12 8h2" stroke="#070B14" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: 15, color: 'var(--text-1)', letterSpacing: '-0.02em' }}>
            lingo<span style={{ color: 'var(--accent)' }}>pulse</span>
          </span>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 22, background: 'var(--border)' }} />

        {/* Repo selector */}
        <button style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 10px', borderRadius: 7,
          background: 'var(--card)', border: '1px solid var(--border)',
          color: 'var(--text-1)', cursor: 'pointer', transition: 'border-color 0.15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <div style={{
            width: 18, height: 18, borderRadius: 4,
            background: 'var(--blue)',
            flexShrink: 0,
          }} />
          <span style={{ fontFamily: 'var(--font-sans)', fontSize: 13, fontWeight: 500 }}>{repo.fullName}</span>
          <ChevronDown size={13} color="var(--text-2)" />
        </button>

        {/* Branch */}
        <button style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 10px', borderRadius: 7,
          background: 'var(--card)', border: '1px solid var(--border)',
          color: 'var(--text-2)', cursor: 'pointer', fontSize: 12, transition: 'border-color 0.15s',
        }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--border-bright)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
        >
          <GitBranch size={12} />
          <span style={{ fontFamily: 'var(--font-mono)' }}>{repo.defaultBranch}</span>
          <ChevronDown size={12} />
        </button>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Webhook status */}
        {repo.webhookActive && (
          <div className="mono-badge mono-badge-sm" style={{
            background: 'rgba(63,200,122,0.08)', border: '1px solid rgba(63,200,122,0.2)',
            color: 'var(--success)',
          }}>
            <span className="status-live" />
            webhook active
          </div>
        )}

        {/* Last analyzed */}
        <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>
          {refreshing ? 'analyzing…' : `analyzed ${analyzedLabel}`}
        </span>

        {/* Refresh */}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          title={refreshing ? 'Analyzing…' : 'Re-analyze now'}
          style={{
            width: 32, height: 32, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: refreshing ? 'var(--accent-dim)' : 'var(--card)',
            border: `1px solid ${refreshing ? 'var(--accent-glow)' : 'var(--border)'}`,
            color: refreshing ? 'var(--accent)' : 'var(--text-2)',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            transition: 'color 0.15s, border-color 0.15s, background 0.15s',
          }}
          onMouseEnter={e => { if (!refreshing) { e.currentTarget.style.color = 'var(--accent)'; e.currentTarget.style.borderColor = 'var(--accent-glow)'; }}}
          onMouseLeave={e => { if (!refreshing) { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}}
        >
          <RefreshCw size={14} style={{
            animation: refreshing ? 'spin 0.8s linear infinite' : 'none',
          }} />
        </button>

        <button
          onClick={() => router.push(onDiffPage ? `/repo/${repo.id}` : `/repo/${repo.id}/diff`)}
          title={onDiffPage ? 'Back to dashboard' : 'Open scan diff'}
          style={{
            height: 34, minWidth: 108, padding: '0 14px', borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 7,
            background: onDiffPage ? 'var(--surface)' : 'var(--card)',
            border: `1px solid ${onDiffPage ? 'var(--border-bright)' : diffTone.border}`,
            color: onDiffPage ? 'var(--text-1)' : diffTone.color,
            cursor: 'pointer',
            transition: 'color 0.15s, border-color 0.15s, background 0.15s, transform 0.15s',
            fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
            boxShadow: 'none',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'translateY(-1px)';
            if (onDiffPage) {
              e.currentTarget.style.color = 'var(--accent)';
              e.currentTarget.style.borderColor = 'var(--border-bright)';
              e.currentTarget.style.background = 'var(--card)';
            } else {
              e.currentTarget.style.borderColor = diffTone.color;
              e.currentTarget.style.background = 'var(--surface)';
            }
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'translateY(0)';
            if (onDiffPage) {
              e.currentTarget.style.color = 'var(--text-1)';
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.background = 'var(--surface)';
            } else {
              e.currentTarget.style.borderColor = diffTone.border;
            }
          }}
        >
          {onDiffPage ? <GitCompareArrows size={12} /> : diffTone.icon}
          {onDiffPage ? 'dashboard' : 'scan diff'}
        </button>

        <button
          style={{
            height: 34, minWidth: 84, padding: '0 12px', borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: onSdkPage ? 'var(--surface)' : 'var(--card)',
            border: `1px solid ${onSdkPage ? 'var(--border-bright)' : 'color-mix(in srgb, var(--blue) 26%, transparent)'}`,
            color: onSdkPage ? 'var(--accent)' : 'var(--blue)',
            cursor: 'pointer',
            transition: 'color 0.15s, border-color 0.15s, background 0.15s, transform 0.15s',
            fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 600,
            boxShadow: 'none',
          }}
          onClick={() => router.push(onSdkPage ? `/repo/${repo.id}` : `/repo/${repo.id}/sdk`)}
          onMouseEnter={e => {
            if (!onSdkPage) {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--blue) 44%, transparent)';
              e.currentTarget.style.background = 'var(--surface)';
            }
          }}
          onMouseLeave={e => {
            if (!onSdkPage) {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--blue) 26%, transparent)';
              e.currentTarget.style.background = 'var(--card)';
            }
          }}
        >
          <Code2 size={13} />
          sdk
        </button>

        <a
          href={`https://github.com/${repo.fullName}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            width: 32, height: 32, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--card)', border: '1px solid var(--border)',
            color: 'var(--text-2)', cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s',
            textDecoration: 'none',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.borderColor = 'var(--border-bright)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          <ExternalLink size={14} />
        </a>

        <button
          onClick={() => void handleSignOut()}
          title="Sign out"
          style={{
            height: 32, padding: '0 10px', borderRadius: 7,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--card)', border: '1px solid var(--border)',
            color: 'var(--text-2)', cursor: 'pointer', transition: 'color 0.15s, border-color 0.15s',
            fontFamily: 'var(--font-sans)', fontSize: 11, fontWeight: 500,
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.borderColor = 'var(--border-bright)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          sign out
        </button>

        <ThemeToggle />
      </div>
    </header>
  );
}
