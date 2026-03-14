'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, RadioTower, ExternalLink } from 'lucide-react';
import type { TranslationIncident } from '@/lib/types';

interface Props {
  incidents: TranslationIncident[];
  repoId: string;
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';
  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) return 'now';
  if (diffMinutes < 60) return `${diffMinutes}m`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h`;
  return `${Math.floor(diffHours / 24)}d`;
}

export default function LiveIncidentsBanner({ incidents, repoId }: Props) {
  const router = useRouter();
  const hasIncidents = incidents.length > 0;
  
  if (!hasIncidents) return null;

  return (
    <div
      onClick={() => router.push(`/repo/${repoId}/sdk`)}
      style={{
        padding: '12px 16px',
        borderRadius: 10,
        background: 'rgba(240,82,72,0.08)',
        border: '1px solid rgba(240,82,72,0.25)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 14,
        transition: 'background 0.15s',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'rgba(240,82,72,0.12)'}
      onMouseLeave={e => e.currentTarget.style.background = 'rgba(240,82,72,0.08)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 32, height: 32,
          borderRadius: 8,
          background: 'rgba(240,82,72,0.15)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <AlertTriangle size={16} color="var(--danger)" />
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', display: 'flex', alignItems: 'center', gap: 6 }}>
            {incidents.length} Live Incident{incidents.length > 1 ? 's' : ''}
            <span style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 500, background: 'rgba(240,82,72,0.15)', padding: '2px 6px', borderRadius: 4 }}>
              NEEDS REVIEW
            </span>
          </div>
          <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>
            {incidents[0].locale} · {formatRelativeTime(incidents[0].lastSeenAt)} · {incidents.length > 1 && `+${incidents.length - 1} more`}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-3)' }}>
        <span style={{ fontSize: 11 }}>Review</span>
        <ExternalLink size={12} />
      </div>
    </div>
  );
}
