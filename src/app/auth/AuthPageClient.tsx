'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Github, LogIn } from 'lucide-react';
import { createBrowserSupabaseClient } from '@/lib/supabase-browser';

type Provider = 'github' | 'google';

interface Props {
  nextPath: string;
  initialError?: string;
}

export default function AuthPageClient({ nextPath, initialError = '' }: Props) {
  const router = useRouter();
  const [loadingProvider, setLoadingProvider] = useState<Provider | null>(null);
  const [error, setError] = useState(initialError);
  const githubEnabled = process.env.NEXT_PUBLIC_ENABLE_GITHUB_AUTH !== 'false';
  const googleEnabled = process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === 'true';
  const hasEnabledProvider = githubEnabled || googleEnabled;

  useEffect(() => {
    const checkExistingSession = async () => {
      const supabase = createBrowserSupabaseClient();
      const { data } = await supabase.auth.getUser();
      if (data.user) router.replace(nextPath);
    };

    void checkExistingSession();
  }, [nextPath, router]);

  const handleOAuth = async (provider: Provider) => {
    setLoadingProvider(provider);
    setError('');

    try {
      const supabase = createBrowserSupabaseClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo,
          scopes: provider === 'github' ? 'read:user user:email repo read:org' : undefined,
        },
      });

      if (authError) throw authError;
    } catch (authError: unknown) {
      setError(authError instanceof Error ? authError.message : 'Sign-in failed');
      setLoadingProvider(null);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative',
        zIndex: 1,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 460,
          borderRadius: 18,
          border: '1px solid var(--border)',
          background: 'var(--card)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.45)',
          overflow: 'hidden',
        }}
        className="animate-fade-up"
      >
        <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, var(--accent-glow), transparent)' }} />

        <div style={{ padding: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11,
              background: 'linear-gradient(135deg, var(--accent) 0%, #00B87A 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <LogIn size={18} color="#070B14" />
            </div>
            <div>
              <div style={{ fontFamily: 'DM Mono, monospace', fontSize: 18, color: 'var(--text-1)' }}>
                lingo<span style={{ color: 'var(--accent)' }}>pulse</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
                secure workspace access
              </div>
            </div>
          </div>

          <h1 style={{ fontSize: 22, lineHeight: 1.2, marginBottom: 10, color: 'var(--text-1)' }}>
            Sign in to your localization workspace
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 24 }}>
            Choose a sign-in method to continue.
          </p>

          {hasEnabledProvider ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {githubEnabled && (
                <button
                  onClick={() => void handleOAuth('github')}
                  disabled={loadingProvider !== null}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: loadingProvider === 'github' ? 'var(--card-hover)' : 'transparent',
                    color: 'var(--text-1)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: loadingProvider !== null ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                  }}
                >
                  <Github size={15} />
                  {loadingProvider === 'github' ? 'Redirecting to GitHub...' : 'Continue with GitHub'}
                </button>
              )}

              {googleEnabled && (
                <button
                  onClick={() => void handleOAuth('google')}
                  disabled={loadingProvider !== null}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: loadingProvider === 'google' ? 'var(--card-hover)' : 'transparent',
                    color: 'var(--text-1)',
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: loadingProvider !== null ? 'not-allowed' : 'pointer',
                  }}
                >
                  {loadingProvider === 'google' ? 'Redirecting to Google...' : 'Continue with Google'}
                </button>
              )}
            </div>
          ) : (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid rgba(240,82,72,0.2)',
                background: 'rgba(240,82,72,0.08)',
                color: 'var(--danger)',
                fontSize: 12,
                fontFamily: 'DM Mono, monospace',
              }}
            >
              No auth providers are enabled. Set `NEXT_PUBLIC_ENABLE_GITHUB_AUTH=true` or `NEXT_PUBLIC_ENABLE_GOOGLE_AUTH=true`.
            </div>
          )}

          {error && (
            <div
              style={{
                marginTop: 16,
                padding: '12px 14px',
                borderRadius: 10,
                border: '1px solid rgba(240,82,72,0.2)',
                background: 'rgba(240,82,72,0.08)',
                color: 'var(--danger)',
                fontSize: 12,
                fontFamily: 'DM Mono, monospace',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginTop: 18, fontSize: 11, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace', lineHeight: 1.6 }}>
            Configure the enabled OAuth providers in Supabase Auth before using this page in production.
          </div>
        </div>
      </div>
    </div>
  );
}
