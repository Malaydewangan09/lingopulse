'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import type { TranslationIncident } from '@/lib/types';

interface Props {
  incidents: TranslationIncident[];
  repoId: string;
}

export default function LiveIncidentsBadge({ incidents, repoId }: Props) {
  const router = useRouter();
  const hasIncidents = incidents.length > 0;

  if (!hasIncidents) return null;

  return (
    <div
      onClick={() => router.push(`/repo/${repoId}/sdk`)}
      style={{
        padding: '6px 12px',
        borderRadius: 8,
        background: 'rgba(240,82,72,0.1)',
        border: '1px solid rgba(240,82,72,0.25)',
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: 14,
        transition: 'all 0.15s',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(240,82,72,0.15)';
        e.currentTarget.style.borderColor = 'rgba(240,82,72,0.4)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(240,82,72,0.1)';
        e.currentTarget.style.borderColor = 'rgba(240,82,72,0.25)';
      }}
    >
      <div style={{ position: 'relative' }}>
        <AlertTriangle size={14} color="var(--danger)" />
        <div style={{
          position: 'absolute',
          top: -4,
          right: -6,
          width: 14,
          height: 14,
          borderRadius: '50%',
          background: 'var(--danger)',
          color: 'white',
          fontSize: 9,
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {incidents.length > 9 ? '9+' : incidents.length}
        </div>
      </div>
      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--danger)' }}>
        {incidents.length} Incident{incidents.length > 1 ? 's' : ''}
      </span>
      <span style={{ fontSize: 10, color: 'var(--text-3)' }}>needs review →</span>
    </div>
  );
}
