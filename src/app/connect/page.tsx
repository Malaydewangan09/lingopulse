'use client';
import { useDeferredValue, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Github, Key, Zap, CheckCircle2, ArrowRight, ExternalLink, Globe, Activity, Shield, LogOut, Search, RefreshCw, Lock, Sparkles, GitBranch, Eye, EyeOff } from 'lucide-react';
import { navigateWithTransition } from '@/lib/navigation';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

type Step = 'form' | 'analyzing' | 'done' | 'error' | 'exists';
type RepoSource = 'picker' | 'manual';
type PickerState = 'idle' | 'loading' | 'ready' | 'error';

interface AnalysisProgress {
  step: string;
  pct: number;
}

interface ConnectRepoResponse {
  id?: string;
  error?: string;
  credentialsUpdated?: boolean;
}

interface GithubSessionMetadata {
  provider?: string;
}

interface GithubRepo {
  id: number;
  full_name: string;
  name: string;
  description: string | null;
  private: boolean;
  html_url: string;
  updated_at: string;
  default_branch: string;
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

async function fetchGithubRepos(providerToken: string): Promise<GithubRepo[]> {
  const repoMap = new Map<number, GithubRepo>();

  for (let page = 1; page <= 3; page += 1) {
    const res = await fetch(
      `https://api.github.com/user/repos?sort=updated&per_page=100&page=${page}&affiliation=owner,collaborator,organization_member`,
      {
        headers: {
          Accept: 'application/vnd.github+json',
          Authorization: `Bearer ${providerToken}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
      },
    );

    if (!res.ok) {
      let message = `GitHub returned ${res.status}`;
      try {
        const payload = await res.json() as { message?: string };
        if (payload.message) message = payload.message;
      } catch {
        // fall back to the generic status error
      }
      throw new Error(message);
    }

    const pageRepos = await res.json() as GithubRepo[];
    pageRepos.forEach(repo => repoMap.set(repo.id, repo));
    if (pageRepos.length < 100) break;
  }

  return Array.from(repoMap.values()).sort((a, b) => {
    const aTime = new Date(a.updated_at).getTime();
    const bTime = new Date(b.updated_at).getTime();
    return bTime - aTime;
  });
}

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
  const [existingCredentialsUpdated, setExistingCredentialsUpdated] = useState(false);
  const [repoSource, setRepoSource] = useState<RepoSource>('manual');
  const [pickerState, setPickerState] = useState<PickerState>('idle');
  const [pickerError, setPickerError] = useState('');
  const [githubProviderToken, setGithubProviderToken] = useState('');
  const [githubRepos, setGithubRepos] = useState<GithubRepo[]>([]);
  const [repoSearch, setRepoSearch] = useState('');
  const [selectedRepoId, setSelectedRepoId] = useState<number | null>(null);
  const deferredRepoSearch = useDeferredValue(repoSearch);

  const filteredRepos = githubRepos.filter(repo => {
    const query = deferredRepoSearch.trim().toLowerCase();
    if (!query) return true;
    return repo.full_name.toLowerCase().includes(query) || (repo.description ?? '').toLowerCase().includes(query);
  });

  const selectedRepo = githubRepos.find(repo => repo.id === selectedRepoId) ?? null;
  const hasGithubPicker = githubProviderToken.length > 0;
  const shellMaxWidth = step === 'form' ? 980 : 760;

  const handleSignOut = async () => {
    const supabase = createBrowserSupabaseClient();
    await supabase.auth.signOut();
    navigateWithTransition(router, '/landing', 'replace');
  };

  useEffect(() => {
    let isActive = true;

    const bootstrapSession = async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.auth.getSession();
      if (!isActive) return;

      const provider = (data.session?.user.app_metadata as GithubSessionMetadata | undefined)?.provider;
      const providerToken = provider === 'github' ? (data.session?.provider_token ?? '') : '';

      setGithubProviderToken(providerToken);

      if (providerToken) {
        setGhToken(providerToken);
        setRepoSource('picker');
      } else {
        setRepoSource('manual');
      }
    };

    void bootstrapSession();

    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (!githubProviderToken) return;

    let isActive = true;

    const loadGithubPicker = async () => {
      setPickerState('loading');
      setPickerError('');

      try {
        const repos = await fetchGithubRepos(githubProviderToken);
        if (!isActive) return;

        setGithubRepos(repos);
        setPickerState('ready');

        if (repos.length > 0) {
          setSelectedRepoId(current => current && repos.some(repo => repo.id === current) ? current : repos[0].id);
          setRepoUrl(current => current || `https://github.com/${repos[0].full_name}`);
        }
      } catch (error: unknown) {
        if (!isActive) return;
        setPickerState('error');
        setPickerError(error instanceof Error ? error.message : 'Unable to load repos from GitHub');
      }
    };

    void loadGithubPicker();

    return () => {
      isActive = false;
    };
  }, [githubProviderToken]);

  const runProgressAnimation = async () => {
    for (const p of PROGRESS_STEPS) {
      setProgressLabel(p.step);
      setProgress(p.pct);
      await new Promise(r => setTimeout(r, 400 + Math.random() * 600));
    }
  };

  const handleRefreshRepos = async () => {
    if (!githubProviderToken) return;

    setPickerState('loading');
    setPickerError('');

    try {
      const repos = await fetchGithubRepos(githubProviderToken);
      setGithubRepos(repos);
      setPickerState('ready');

      if (repos.length > 0) {
        const nextRepo = selectedRepoId && repos.some(repo => repo.id === selectedRepoId)
          ? repos.find(repo => repo.id === selectedRepoId) ?? repos[0]
          : repos[0];

        setSelectedRepoId(nextRepo.id);
        setRepoUrl(`https://github.com/${nextRepo.full_name}`);
      }
    } catch (error: unknown) {
      setPickerState('error');
      setPickerError(error instanceof Error ? error.message : 'Unable to refresh repos from GitHub');
    }
  };

  const handleRepoSelection = (repo: GithubRepo) => {
    setSelectedRepoId(repo.id);
    setRepoUrl(`https://github.com/${repo.full_name}`);
    if (githubProviderToken) setGhToken(githubProviderToken);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!repoUrl) {
      setErrorMsg('Select a repository before connecting.');
      return;
    }

    if (!ghToken) {
      setErrorMsg('A GitHub token is required to read the repo and register webhooks.');
      return;
    }

    if (!lingoKey.trim()) {
      setErrorMsg('A Lingo.dev API key is required to score translations and generate draft fix PRs.');
      return;
    }

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
        setExistingCredentialsUpdated(!!data.credentialsUpdated);
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

      setTimeout(() => navigateWithTransition(router, `/repo/${repoId}`), 1200);
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
          color: 'var(--text-2)', fontSize: 11, fontFamily: 'var(--font-sans)', fontWeight: 500,
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
            background: 'var(--accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="3" fill="#070B14"/>
              <path d="M8 2a6 6 0 1 1 0 12A6 6 0 0 1 8 2z" stroke="#070B14" strokeWidth="1.5" fill="none"/>
              <path d="M8 2v2M8 12v2M2 8h2M12 8h2" stroke="#070B14" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'var(--font-sans)', fontWeight: 700, fontSize: 22, letterSpacing: '-0.03em', color: 'var(--text-1)' }}>
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
            <div key={label} className="mono-badge mono-badge-sm" style={{
              background: 'var(--card)', border: '1px solid var(--border)',
              color: 'var(--text-2)',
            }}>
              {icon}{label}
            </div>
          ))}
        </div>
      )}

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: shellMaxWidth,
        background: 'var(--card)', border: '1px solid var(--border)',
        borderRadius: 16, overflow: 'hidden',
        boxShadow: '0 20px 44px rgba(0,0,0,0.24)',
        animationDelay: '0.15s',
      }} className="animate-fade-up">

        {step === 'form' && (
          <form onSubmit={handleSubmit} style={{ padding: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>
              Connect your repository
            </h2>
            <p style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', marginBottom: 24 }}>
              Lingo Pulse will analyze your i18n files and track quality over time
            </p>

            {hasGithubPicker && (
              <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    setRepoSource('picker');
                    setGhToken(githubProviderToken);
                    if (selectedRepo) {
                      setRepoUrl(`https://github.com/${selectedRepo.full_name}`);
                    } else if (githubRepos[0]) {
                      setRepoUrl(`https://github.com/${githubRepos[0].full_name}`);
                    }
                    setErrorMsg('');
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 9,
                    border: `1px solid ${repoSource === 'picker' ? 'var(--border-bright)' : 'var(--border)'}`,
                    background: repoSource === 'picker' ? 'var(--card-hover)' : 'transparent',
                    color: repoSource === 'picker' ? 'var(--accent)' : 'var(--text-2)',
                    fontSize: 11,
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Sparkles size={12} />
                  Pick from GitHub
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setRepoSource('manual');
                    setErrorMsg('');
                  }}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 9,
                    border: `1px solid ${repoSource === 'manual' ? 'var(--border-bright)' : 'var(--border)'}`,
                    background: repoSource === 'manual' ? 'var(--card-hover)' : 'transparent',
                    color: repoSource === 'manual' ? 'var(--text-1)' : 'var(--text-2)',
                    fontSize: 11,
                    fontFamily: 'var(--font-sans)',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Paste manually
                </button>
              </div>
            )}

            {errorMsg && (
              <div
                style={{
                  marginBottom: 18,
                  padding: '12px 14px',
                  borderRadius: 10,
                  border: '1px solid rgba(240,82,72,0.2)',
                  background: 'rgba(240,82,72,0.08)',
                  color: 'var(--danger)',
                  fontSize: 12,
                  fontFamily: 'var(--font-sans)',
                }}
              >
                {errorMsg}
              </div>
            )}

            <div className="connect-form-grid">
              <div>
                {hasGithubPicker && repoSource === 'picker' ? (
                  <>
                    <label style={{ display: 'block', fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', fontWeight: 500, marginBottom: 6 }}>
                      GitHub repository picker
                    </label>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        background: 'var(--surface)',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        padding: '0 12px',
                        marginBottom: 12,
                      }}
                    >
                      <Search size={14} color="var(--text-3)" />
                      <input
                        type="text"
                        placeholder="Search repos from your GitHub account"
                        value={repoSearch}
                        onChange={e => setRepoSearch(e.target.value)}
                        style={{
                          flex: 1,
                          border: 'none',
                          outline: 'none',
                          background: 'transparent',
                          color: 'var(--text-1)',
                          fontFamily: 'var(--font-sans)',
                          fontSize: 12,
                          padding: '11px 0',
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => void handleRefreshRepos()}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: 'var(--text-2)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title="Refresh repos"
                      >
                        <RefreshCw size={14} />
                      </button>
                    </div>

                    <div
                      style={{
                        marginBottom: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-sans)' }}>
                        {pickerState === 'loading'
                          ? 'Loading repos from GitHub...'
                          : `${filteredRepos.length} repos available from your GitHub session`}
                      </div>
                      <span className="tag tag-accent repo-chip">OAuth</span>
                    </div>

                    <div
                      style={{
                        borderRadius: 14,
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        maxHeight: 332,
                        overflow: 'auto',
                        padding: 8,
                      }}
                    >
                      {pickerState === 'loading' && (
                        <div style={{ display: 'grid', gap: 10 }}>
                          {[0, 1, 2, 3].map(index => (
                            <div key={index} className="skeleton" style={{ borderRadius: 12, padding: '12px 14px', display: 'grid', gap: 10 }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                                <div className="skeleton skeleton-line" style={{ width: `${56 + index * 8}%`, height: 13 }} />
                                <div className="skeleton skeleton-pill" style={{ width: 68, height: 22 }} />
                              </div>
                              <div className="skeleton skeleton-line-sm" style={{ width: `${34 + index * 9}%` }} />
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div className="skeleton skeleton-line-sm" style={{ width: 52 }} />
                                <div className="skeleton skeleton-line-sm" style={{ width: 108 }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {pickerState === 'error' && (
                        <div
                          style={{
                            borderRadius: 12,
                            border: '1px solid rgba(240,82,72,0.2)',
                            background: 'rgba(240,82,72,0.08)',
                            padding: '14px 16px',
                            color: 'var(--danger)',
                            fontSize: 12,
                            fontFamily: 'var(--font-sans)',
                            lineHeight: 1.6,
                          }}
                        >
                          {pickerError}
                          <div style={{ marginTop: 8, color: 'var(--text-3)' }}>
                            If you just enabled new GitHub scopes, sign out and sign in again once to refresh consent.
                          </div>
                        </div>
                      )}

                      {pickerState === 'ready' && filteredRepos.length === 0 && (
                        <div
                          style={{
                            borderRadius: 12,
                            border: '1px dashed var(--border)',
                            padding: '18px 16px',
                            color: 'var(--text-2)',
                            fontSize: 12,
                            lineHeight: 1.6,
                          }}
                        >
                          {githubRepos.length === 0
                            ? 'No repositories were returned for this GitHub account. Use manual entry if you need a repo from another account.'
                            : 'No repositories match that search.'}
                        </div>
                      )}

                      {pickerState === 'ready' && filteredRepos.length > 0 && (
                        <div style={{ display: 'grid', gap: 8 }}>
                          {filteredRepos.map(repo => {
                            const isSelected = repo.id === selectedRepoId;
                            return (
                              <button
                                key={repo.id}
                                type="button"
                                onClick={() => handleRepoSelection(repo)}
                                style={{
                                  textAlign: 'left',
                                  borderRadius: 12,
                                  border: `1px solid ${isSelected ? 'var(--border-bright)' : 'var(--border)'}`,
                                  background: isSelected ? 'var(--card-hover)' : 'var(--card)',
                                  padding: '12px 14px',
                                  cursor: 'pointer',
                                  transition: 'border-color 0.15s, transform 0.15s',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 6 }}>
                                  <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>
                                      {repo.full_name}
                                    </div>
                                    <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-sans)' }}>
                                      {repo.description || 'No description provided'}
                                    </div>
                                  </div>
                                  <span className={`${repo.private ? 'tag tag-warning' : 'tag tag-neutral'} repo-chip`}>
                                    {repo.private ? 'private' : 'public'}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-sans)' }}>
                                  <span>{repo.default_branch}</span>
                                  <span>updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                                  {isSelected && <span className="tag tag-accent repo-chip">selected</span>}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    <Field
                      label="GitHub Repository"
                      icon={<Github size={14} />}
                      placeholder="github.com/your-org/your-repo"
                      value={repoUrl}
                      onChange={setRepoUrl}
                      required
                      hint="Public or private repo you have access to"
                    />

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
                          Needs <code style={{ background: 'var(--border)', padding: '1px 4px', borderRadius: 3, fontSize: 10 }}>repo</code> + <code style={{ background: 'var(--border)', padding: '1px 4px', borderRadius: 3, fontSize: 10 }}>admin:repo_hook</code> scopes.{' '}
                          <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer"
                            style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                            Generate one <ExternalLink size={9} style={{ display: 'inline', verticalAlign: 'middle' }} />
                          </a>
                        </span>
                      }
                    />
                  </>
                )}

                <Field
                  label="Lingo.dev API Key"
                  icon={<Zap size={14} />}
                  placeholder="lingo_xxxxxxxxxxxxxxxxxxxx"
                  value={lingoKey}
                  onChange={setLingoKey}
                  required
                  type="password"
                  hint={
                    <span>
                      Required - powers translation quality scoring and draft translation fixes.{' '}
                      <a href="https://lingo.dev" target="_blank" rel="noopener noreferrer"
                        style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                        Get one free <ExternalLink size={9} style={{ display: 'inline', verticalAlign: 'middle' }} />
                      </a>
                    </span>
                  }
                />
              </div>

              <div className="connect-side-stack">
                <div
                  style={{
                    borderRadius: 14,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    padding: '19px 16px 14px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 10,
                        background: hasGithubPicker && repoSource === 'picker'
                          ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
                          : 'color-mix(in srgb, var(--blue) 12%, transparent)',
                        color: hasGithubPicker && repoSource === 'picker' ? 'var(--accent)' : 'var(--blue)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {hasGithubPicker && repoSource === 'picker' ? <Github size={15} /> : <Lock size={15} />}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, color: 'var(--text-1)', fontWeight: 600 }}>
                        {hasGithubPicker && repoSource === 'picker' ? 'Selected repo' : 'Access model'}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-sans)' }}>
                        {hasGithubPicker && repoSource === 'picker' ? 'Using your signed-in GitHub session' : 'Manual GitHub token mode'}
                      </div>
                    </div>
                  </div>

                  {hasGithubPicker && repoSource === 'picker' && selectedRepo ? (
                    <div style={{ display: 'grid', gap: 10 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{selectedRepo.full_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
                        {selectedRepo.description || 'This repo is ready to connect and scan.'}
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span className={`${selectedRepo.private ? 'tag tag-warning' : 'tag tag-neutral'} repo-chip`}>
                          {selectedRepo.private ? 'private' : 'public'}
                        </span>
                        <span className="tag tag-neutral repo-chip">
                          <GitBranch size={10} />
                          {selectedRepo.default_branch}
                        </span>
                      </div>
                      <a
                        href={selectedRepo.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', fontFamily: 'var(--font-sans)', fontWeight: 500 }}
                      >
                        Open on GitHub <ExternalLink size={10} style={{ display: 'inline', verticalAlign: 'middle' }} />
                      </a>
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.7 }}>
                      {hasGithubPicker
                        ? 'Switch to manual mode if you want to connect a repo from another GitHub account or use a different token.'
                        : 'Paste a repo URL and token to connect a public or private repository you can access.'}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    borderRadius: 14,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    padding: '16px 16px 14px',
                  }}
                >
                  <div style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', marginBottom: 8 }}>
                    token usage
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>
                    {hasGithubPicker && repoSource === 'picker'
                      ? 'Your current GitHub OAuth session is used for repo discovery and the initial connect request.'
                      : 'The GitHub token is used to read repo contents and attempt webhook registration.'}
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" style={{
              width: 'fit-content', minWidth: 248, maxWidth: '100%', padding: '10px 18px', marginTop: 26, marginInline: 'auto',
              background: 'var(--accent-button)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 9,
              color: 'var(--accent-button-text)', fontFamily: 'var(--font-sans)',
              fontSize: 12.5, fontWeight: 650, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'transform 0.15s, box-shadow 0.15s',
              boxShadow: '0 1px 0 rgba(255,255,255,0.12) inset',
            }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.12) inset, 0 10px 22px rgba(0,0,0,0.18)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 1px 0 rgba(255,255,255,0.12) inset'; }}
            >
              {repoSource === 'picker' ? 'Connect Selected Repo' : 'Connect & Analyze'} <ArrowRight size={11} />
            </button>
          </form>
        )}

        {step === 'analyzing' && (
          <div style={{ padding: 36, textAlign: 'center' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, margin: '0 auto 20px',
              background: 'var(--card-hover)', border: '1px solid var(--border-bright)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--accent)',
            }}>
              <Zap size={22} />
            </div>
            <h3 style={{ fontSize: 15, color: 'var(--text-1)', marginBottom: 6 }}>Analyzing your repository…</h3>
            <p style={{ fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', marginBottom: 28, minHeight: 16 }}>
              {progressLabel}
            </p>

            {/* Progress bar */}
            <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{
              height: '100%', width: `${progress}%`, borderRadius: 3,
                background: 'var(--accent)',
                transition: 'width 0.5s cubic-bezier(0.16,1,0.3,1)',
                boxShadow: 'none',
              }} />
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
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
            <p style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-sans)' }}>
              Redirecting to your dashboard…
            </p>
          </div>
        )}

        {step === 'error' && (
          <div style={{ padding: 28 }}>
            <div style={{
              padding: '12px 14px', borderRadius: 8, marginBottom: 20,
              background: 'rgba(240,82,72,0.08)', border: '1px solid rgba(240,82,72,0.2)',
              fontSize: 12, color: 'var(--danger)', fontFamily: 'var(--font-sans)',
            }}>
              {errorMsg}
            </div>
            <button onClick={() => setStep('form')} style={{
              width: '100%', padding: '10px', background: 'var(--card-hover)',
              border: '1px solid var(--border)', borderRadius: 8,
              color: 'var(--text-1)', fontFamily: 'var(--font-sans)',
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
              fontSize: 12, color: 'var(--warning)', fontFamily: 'var(--font-sans)',
              lineHeight: 1.6,
            }}>
              {existingCredentialsUpdated
                ? 'This repo is already connected. Stored GitHub and Lingo.dev credentials were refreshed. You can open its dashboard or force a fresh reconnect (deletes existing data and re-scans).'
                : 'This repo is already connected. You can view its dashboard or force a fresh reconnect (deletes existing data and re-scans).'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'center' }}>
              {existingRepoId && (
                <button onClick={() => navigateWithTransition(router, `/repo/${existingRepoId}`)} style={{
                  width: 'fit-content', minWidth: 248, maxWidth: '100%', padding: '10px 18px', background: 'var(--accent-button)', border: '1px solid rgba(255,255,255,0.04)', borderRadius: 8,
                  color: 'var(--accent-button-text)', fontFamily: 'var(--font-sans)', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  boxShadow: '0 1px 0 rgba(255,255,255,0.12) inset',
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
                width: 'fit-content', minWidth: 248, maxWidth: '100%', padding: '10px 18px', background: 'transparent',
                border: '1px solid var(--border)', borderRadius: 8,
                color: 'var(--text-2)', fontFamily: 'var(--font-sans)',
                fontSize: 12, cursor: 'pointer',
              }}>
                Force reconnect (delete & re-scan)
              </button>
              <button onClick={() => setStep('form')} style={{
                width: '100%', padding: '8px', background: 'transparent', border: 'none',
                color: 'var(--text-3)', fontFamily: 'var(--font-sans)', fontSize: 11, cursor: 'pointer',
              }}>
                ← Back
              </button>
            </div>
          </div>
        )}
      </div>

      {step === 'form' && (
        <button
          onClick={() => navigateWithTransition(router, '/docs')}
          style={{
            marginTop: 16, background: 'none', border: 'none',
            color: 'var(--text-3)', fontSize: 11, fontFamily: 'var(--font-sans)',
            cursor: 'pointer', transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = 'var(--accent)'}
          onMouseLeave={e => e.currentTarget.style.color = 'var(--text-3)'}
        >
          Read the docs →
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
  const [revealed, setRevealed] = useState(false);
  const resolvedType = type === 'password' ? (revealed ? 'text' : 'password') : type;
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: 'block', fontSize: 11, color: 'var(--text-2)', fontFamily: 'var(--font-sans)', fontWeight: 500, marginBottom: 6 }}>
        {label}
        {required && <span style={{ color: 'var(--accent)', marginLeft: 4 }}>*</span>}
      </label>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: 'var(--surface)', borderRadius: 8,
        border: `1px solid ${focused ? 'var(--border-bright)' : 'var(--border)'}`,
        padding: '0 12px',
        transition: 'border-color 0.15s',
        boxShadow: 'none',
      }}>
        <span style={{ color: focused ? 'var(--accent)' : 'var(--text-3)', transition: 'color 0.15s', flexShrink: 0 }}>
          {icon}
        </span>
        <input
          type={resolvedType}
          placeholder={placeholder}
          value={value}
          required={required}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, border: 'none', outline: 'none', background: 'transparent',
            color: 'var(--text-1)', fontFamily: 'var(--font-sans)', fontSize: 12,
            padding: '10px 0',
          }}
        />
        {type === 'password' && (
          <button
            type="button"
            onClick={() => setRevealed(current => !current)}
            style={{
              border: 'none',
              background: 'transparent',
              color: 'var(--text-3)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              flexShrink: 0,
            }}
            title={revealed ? 'Hide value' : 'Show value'}
            aria-label={revealed ? 'Hide value' : 'Show value'}
          >
            {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {hint && (
        <p style={{ marginTop: 5, fontSize: 11, color: 'var(--text-3)', lineHeight: 1.4 }}>{hint}</p>
      )}
    </div>
  );
}
