'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Globe, BarChart3, GitPullRequest, Plus, Home, ChevronDown, Trash2, Check } from 'lucide-react';

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  sectionId: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview',  label: 'Overview',   icon: <LayoutDashboard size={18} />, sectionId: 'section-overview'  },
  { id: 'locales',   label: 'Locales',    icon: <Globe size={18} />,           sectionId: 'section-locales'   },
  { id: 'trends',    label: 'Trends',     icon: <BarChart3 size={18} />,       sectionId: 'section-trends'    },
  { id: 'prchecks',  label: 'PR Checks',  icon: <GitPullRequest size={18} />,  sectionId: 'section-prchecks' },
];

interface Repo { id: string; name: string; full_name: string; }

interface Props {
  activeSection?: string;
  onNavigate?: (id: string) => void;
  currentRepoId?: string;
}

export default function Sidebar({ activeSection, onNavigate, currentRepoId }: Props) {
  const router = useRouter();
  const [hoveredId, setHoveredId]   = useState<string | null>(null);
  const [repos, setRepos]           = useState<Repo[]>([]);
  const [showRepos, setShowRepos]   = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmId, setConfirmId]   = useState<string | null>(null);

  const loadRepos = () => {
    fetch('/api/repos')
      .then(r => r.ok ? r.json().catch(() => []) : [])
      .then((data: any[]) => setRepos(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

  useEffect(() => { loadRepos(); }, []);

  const handleClick = (item: NavItem) => {
    if (item.sectionId) {
      const el = document.getElementById(item.sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    onNavigate?.(item.id);
  };

  const handleDelete = async (e: React.MouseEvent, repoId: string) => {
    e.stopPropagation();
    if (confirmId !== repoId) {
      setConfirmId(repoId);
      return;
    }
    setDeletingId(repoId);
    try {
      const res = await fetch(`/api/repos/${repoId}`, { method: 'DELETE' });
      if (!res.ok) { setConfirmId(null); return; }
      const remaining = repos.filter(r => r.id !== repoId);
      setRepos(remaining);
      setConfirmId(null);
      if (remaining.length === 0) {
        router.push('/connect');
      } else if (repoId === currentRepoId) {
        router.push(`/repo/${remaining[0].id}`);
      }
    } finally {
      setDeletingId(null);
    }
  };

  const SideBtn = ({ id, icon, label, onClick, isActive = false }: {
    id: string; icon: React.ReactNode; label: string;
    onClick: () => void; isActive?: boolean;
  }) => {
    const isHov = hoveredId === id;
    return (
      <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
        <button
          onClick={onClick}
          onMouseEnter={() => setHoveredId(id)}
          onMouseLeave={() => setHoveredId(null)}
          style={{
            width: 36, height: 36, borderRadius: 9, border: 'none',
            background: isActive ? 'var(--accent-dim)' : isHov ? 'rgba(255,255,255,0.05)' : 'transparent',
            color: isActive ? 'var(--accent)' : 'var(--text-3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'background 0.15s, color 0.15s', outline: 'none',
          }}
        >
          {icon}
        </button>
        {isHov && (
          <div style={{
            position: 'absolute', left: 44, top: '50%', transform: 'translateY(-50%)',
            background: '#0D1117', border: '1px solid var(--border-bright)', borderRadius: 6,
            padding: '5px 10px', whiteSpace: 'nowrap', fontSize: 11,
            fontFamily: 'DM Mono, monospace', color: 'var(--text-1)',
            pointerEvents: 'none', zIndex: 200, boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
            animation: 'fadeIn 0.1s ease both',
          }}>
            {label}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: 52, height: '100vh',
      background: '#0D1117', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      paddingTop: 12, paddingBottom: 16, zIndex: 100, boxSizing: 'border-box',
    }}>
      {/* Logo — click to go home */}
      <button
        onClick={() => router.push('/landing')}
        title="Home"
        style={{
          width: 28, height: 28, borderRadius: 8, border: 'none',
          background: 'linear-gradient(135deg, var(--accent) 0%, #00B87A 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20, flexShrink: 0, cursor: 'pointer', padding: 0,
          transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = '0.8'}
        onMouseLeave={e => e.currentTarget.style.opacity = '1'}
      >
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="3" fill="#070B14"/>
          <path d="M8 2a6 6 0 1 1 0 12A6 6 0 0 1 8 2z" stroke="#070B14" strokeWidth="1.5" fill="none"/>
          <path d="M8 2v2M8 12v2M2 8h2M12 8h2" stroke="#070B14" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      {/* Nav items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, width: '100%', alignItems: 'center' }}>
        {NAV_ITEMS.map(item => {
          const isActive = activeSection === item.id;
          const isHov = hoveredId === item.id;
          return (
            <div key={item.id} style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
              <button
                onClick={() => handleClick(item)}
                onMouseEnter={() => setHoveredId(item.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  width: 36, height: 36, borderRadius: 9, border: 'none',
                  background: isActive ? 'var(--accent-dim)' : isHov ? 'rgba(255,255,255,0.05)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', transition: 'background 0.15s, color 0.15s', outline: 'none',
                }}
              >
                {item.icon}
              </button>
              {isHov && (
                <div style={{
                  position: 'absolute', left: 44, top: '50%', transform: 'translateY(-50%)',
                  background: '#0D1117', border: '1px solid var(--border-bright)', borderRadius: 6,
                  padding: '5px 10px', whiteSpace: 'nowrap', fontSize: 11,
                  fontFamily: 'DM Mono, monospace', color: 'var(--text-1)',
                  pointerEvents: 'none', zIndex: 200, boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
                  animation: 'fadeIn 0.1s ease both',
                }}>
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', alignItems: 'center' }}>

        {/* Repo switcher */}
        <div style={{ position: 'relative', width: '100%', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => setShowRepos(v => !v)}
            onMouseEnter={() => setHoveredId('__repos')}
            onMouseLeave={() => setHoveredId(null)}
            style={{
              width: 36, height: 36, borderRadius: 9, border: 'none',
              background: showRepos ? 'var(--accent-dim)' : hoveredId === '__repos' ? 'rgba(255,255,255,0.05)' : 'transparent',
              color: showRepos ? 'var(--accent)' : 'var(--text-3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', transition: 'background 0.15s, color 0.15s', outline: 'none',
            }}
          >
            <ChevronDown size={18} style={{ transform: showRepos ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {hoveredId === '__repos' && !showRepos && (
            <div style={{
              position: 'absolute', left: 44, top: '50%', transform: 'translateY(-50%)',
              background: '#0D1117', border: '1px solid var(--border-bright)', borderRadius: 6,
              padding: '5px 10px', whiteSpace: 'nowrap', fontSize: 11,
              fontFamily: 'DM Mono, monospace', color: 'var(--text-1)',
              pointerEvents: 'none', zIndex: 200, boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
              animation: 'fadeIn 0.1s ease both',
            }}>
              Repos
            </div>
          )}

          {/* Repo dropdown — stopPropagation so clicks inside don't bubble to backdrop */}
          {showRepos && (
            <>
              {/* Invisible backdrop to close on outside click */}
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 199 }}
                onClick={() => setShowRepos(false)}
              />
              <div
                onClick={e => e.stopPropagation()}
                style={{
                  position: 'absolute', bottom: 0, left: 44,
                  background: '#0D1117', border: '1px solid var(--border-bright)', borderRadius: 8,
                  minWidth: 220, zIndex: 300, boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                  overflow: 'hidden', animation: 'fadeSlideUp 0.15s ease both',
                }}
              >
                <div style={{ padding: '8px 12px 6px', fontSize: 10, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace', borderBottom: '1px solid var(--border)', letterSpacing: '0.08em' }}>
                  CONNECTED REPOS
                </div>

                {repos.length === 0 ? (
                  <div style={{ padding: '12px', fontSize: 11, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
                    No repos connected
                  </div>
                ) : repos.map(r => {
                  const isCurrent = r.id === currentRepoId;
                  const isConfirm = confirmId === r.id;
                  const isDeleting = deletingId === r.id;
                  return (
                    <div
                      key={r.id}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        padding: '6px 8px 6px 12px',
                        background: isCurrent ? 'rgba(0,229,160,0.06)' : 'transparent',
                        borderBottom: '1px solid var(--border)',
                        transition: 'background 0.12s',
                      }}
                    >
                      <button
                        onClick={() => { setShowRepos(false); router.push(`/repo/${r.id}`); }}
                        style={{
                          flex: 1, textAlign: 'left', border: 'none', background: 'transparent',
                          color: isCurrent ? 'var(--accent)' : 'var(--text-1)',
                          fontSize: 12, fontFamily: 'DM Mono, monospace', cursor: 'pointer',
                          padding: '2px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                      >
                        {r.full_name ?? r.name}
                        {isCurrent && <span style={{ marginLeft: 5, fontSize: 9, color: 'var(--accent)', opacity: 0.7 }}>●</span>}
                      </button>
                      <button
                        onClick={e => handleDelete(e, r.id)}
                        disabled={isDeleting}
                        title={isConfirm ? 'Click again to confirm' : 'Remove repo'}
                        style={{
                          flexShrink: 0, width: 24, height: 24, borderRadius: 5, border: 'none',
                          background: isConfirm ? 'rgba(240,82,72,0.15)' : 'transparent',
                          color: isConfirm ? 'var(--danger)' : 'var(--text-3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', transition: 'background 0.12s, color 0.12s',
                          opacity: isDeleting ? 0.4 : 1,
                        }}
                        onMouseEnter={e => { if (!isConfirm) { e.currentTarget.style.color = 'var(--danger)'; e.currentTarget.style.background = 'rgba(240,82,72,0.08)'; } }}
                        onMouseLeave={e => { if (!isConfirm) { e.currentTarget.style.color = 'var(--text-3)'; e.currentTarget.style.background = 'transparent'; } }}
                      >
                        {isConfirm ? <Check size={12} /> : <Trash2 size={12} />}
                      </button>
                    </div>
                  );
                })}

                <div style={{ padding: 4 }}>
                  <button
                    onClick={() => { setShowRepos(false); router.push('/connect'); }}
                    style={{
                      width: '100%', padding: '7px 12px', textAlign: 'left', border: 'none',
                      background: 'transparent', color: 'var(--accent)',
                      fontSize: 11, fontFamily: 'DM Mono, monospace', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6, borderRadius: 5,
                      transition: 'background 0.12s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--accent-dim)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <Plus size={11} /> Connect new repo
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        <SideBtn id="__home" icon={<Home size={18} />} label="Home" onClick={() => router.push('/landing')} />
        <SideBtn id="__add" icon={<Plus size={18} />} label="Connect new repo" onClick={() => router.push('/connect')} />
      </div>
    </div>
  );
}
