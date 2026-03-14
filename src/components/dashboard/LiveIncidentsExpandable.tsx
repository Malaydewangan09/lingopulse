'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
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

function labelForIssue(issueType: TranslationIncident['issueType']) {
  switch (issueType) {
    case 'raw_key': return 'raw key';
    case 'placeholder': return 'placeholder';
    case 'fallback': return 'fallback';
    case 'empty': return 'empty';
    default: return issueType;
  }
}

export default function LiveIncidentsExpandable({ incidents, repoId }: Props) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const hasIncidents = incidents.length > 0;

  if (!hasIncidents) return null;

  const displayIncidents = expanded ? incidents : incidents.slice(0, 2);

  return (
    <div style={{
      borderRadius: 10,
      background: 'rgba(240,82,72,0.06)',
      border: '1px solid rgba(240,82,72,0.2)',
      marginBottom: 14,
      overflow: 'hidden',
    }}>
      <div
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '12px 14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <AlertTriangle size={14} color="var(--danger)" />
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--danger)' }}>
            {incidents.length} Live Incident{incidents.length > 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
            {incidents[0].locale} · {formatRelativeTime(incidents[0].lastSeenAt)}
          </span>
        </div>
        {expanded ? <ChevronUp size={14} color="var(--text-3)" /> : <ChevronDown size={14} color="var(--text-3)" />}
      </div>

      {expanded && (
        <div style={{ borderTop: '1px solid rgba(240,82,72,0.15)' }}>
          {incidents.map(incident => (
            <div
              key={incident.id}
              style={{
                padding: '10px 14px',
                borderBottom: '1px solid rgba(240,82,72,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 10, color: 'var(--danger)', fontWeight: 600 }}>{labelForIssue(incident.issueType)}</span>
                <span style={{ fontSize: 10, color: 'var(--text-2)' }}>{incident.locale}</span>
                <span style={{ fontSize: 9, color: 'var(--text-3)' }}>{formatRelativeTime(incident.lastSeenAt)}</span>
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--danger)' }}>{incident.hitCount} hits</span>
            </div>
          ))}
          <div
            onClick={() => router.push(`/repo/${repoId}/sdk`)}
            style={{
              padding: '10px 14px',
              textAlign: 'center',
              fontSize: 11,
              color: 'var(--blue)',
              cursor: 'pointer',
              background: 'rgba(240,82,72,0.05)',
            }}
          >
            View full details →
          </div>
        </div>
      )}
    </div>
  );
}
