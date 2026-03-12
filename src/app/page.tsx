'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Globe, KeyRound, Activity, Layers, ArrowRight } from 'lucide-react';
import Header from '@/components/dashboard/Header';
import MetricCard from '@/components/dashboard/MetricCard';
import CoverageHeatmap from '@/components/dashboard/CoverageHeatmap';
import QualityChart from '@/components/dashboard/QualityChart';
import LocaleBreakdown from '@/components/dashboard/LocaleBreakdown';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import PRChecks from '@/components/dashboard/PRChecks';
import {
  DEMO_REPO, LOCALE_STATS, HEATMAP_DATA,
  QUALITY_HISTORY, COVERAGE_HISTORY, ACTIVITY, PR_CHECKS,
} from '@/lib/mock-data';

export default function Home() {
  const router = useRouter();
  const [checkingRepos, setCheckingRepos] = useState(true);

  // If user has connected repos, redirect to the first one
  useEffect(() => {
    fetch('/api/repos')
      .then(r => r.ok ? r.json().catch(() => []) : [])
      .then((repos: any[]) => {
        if (repos?.length > 0) router.replace(`/repo/${repos[0].id}`);
        else router.replace('/connect');
      })
      .catch(() => router.replace('/connect'));
  }, [router]);

  if (checkingRepos) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: 10 }} />
      </div>
    );
  }

  // Show demo dashboard
  return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
      <Header repo={DEMO_REPO} />

      {/* Demo banner */}
      <div style={{
        background: 'linear-gradient(90deg, rgba(0,229,160,0.06) 0%, rgba(75,158,255,0.06) 100%)',
        borderBottom: '1px solid var(--border)',
        padding: '8px 24px', textAlign: 'center',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
      }}>
        <span style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: 'DM Mono, monospace' }}>
          You&apos;re viewing the demo dashboard
        </span>
        <button
          onClick={() => router.push('/landing')}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 12px', borderRadius: 6,
            background: 'transparent', border: '1px solid var(--border-bright)',
            color: 'var(--text-2)', fontFamily: 'DM Mono, monospace',
            fontSize: 11, cursor: 'pointer',
            transition: 'color 0.15s, border-color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-1)'; e.currentTarget.style.borderColor = 'var(--border-bright)'; }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-2)'; e.currentTarget.style.borderColor = 'var(--border-bright)'; }}
        >
          View landing page
        </button>
        <button
          onClick={() => router.push('/connect')}
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 12px', borderRadius: 6,
            background: 'var(--accent)', border: 'none',
            color: '#070B14', fontFamily: 'DM Mono, monospace',
            fontSize: 11, fontWeight: 600, cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Connect your repo <ArrowRight size={11} />
        </button>
      </div>

      <main style={{ maxWidth: 1440, margin: '0 auto', padding: '24px 24px 48px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
          <MetricCard label="Overall Coverage" value={DEMO_REPO.overallCoverage.toFixed(1)} unit="%" trend={1.4} sublabel="across all locales" accent icon={<Globe size={15} />} delay={0} />
          <MetricCard label="Avg Quality Score" value={DEMO_REPO.qualityScore.toFixed(1)} unit="/10" trend={0.2} sublabel="GEMBA · BERTScore" icon={<Activity size={15} />} delay={80} />
          <MetricCard label="Missing Keys" value={DEMO_REPO.totalMissingKeys} trend={-18} trendLabel="-18 since last push" sublabel="across 12 locales" danger={DEMO_REPO.totalMissingKeys > 200} icon={<KeyRound size={15} />} delay={160} />
          <MetricCard label="Active Locales" value={`${DEMO_REPO.activeLocales}/${DEMO_REPO.totalLocales}`} sublabel="3 below threshold" icon={<Layers size={15} />} delay={240} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 14, marginBottom: 14 }}>
          <div className="animate-fade-up" style={{ animationDelay: '0.1s' }}><CoverageHeatmap data={HEATMAP_DATA} /></div>
          <div className="animate-fade-up" style={{ animationDelay: '0.15s' }}><LocaleBreakdown locales={LOCALE_STATS} /></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 340px', gap: 14 }}>
          <div className="animate-fade-up" style={{ animationDelay: '0.2s' }}><QualityChart qualityData={QUALITY_HISTORY} coverageData={COVERAGE_HISTORY} /></div>
          <div className="animate-fade-up" style={{ animationDelay: '0.25s' }}><ActivityFeed events={ACTIVITY} /></div>
          <div className="animate-fade-up" style={{ animationDelay: '0.3s' }}><PRChecks checks={PR_CHECKS} /></div>
        </div>

        <div style={{ marginTop: 24, textAlign: 'center', fontSize: 11, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
          powered by <a href="https://lingo.dev" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)', textDecoration: 'none' }}>lingo.dev</a>
          {' '}· CLI · SDK · CI/CD · Quality Scoring
        </div>
      </main>
    </div>
  );
}
