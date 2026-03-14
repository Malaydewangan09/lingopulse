'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, BookOpen } from 'lucide-react';
import type { TranslationIncident } from '@/lib/types';

interface Props {
  incidents: TranslationIncident[];
  repoId: string;
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';
  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export default function LiveIncidentsWidget({ incidents, repoId }: Props) {
  const router = useRouter();
  const hasIncidents = incidents.length > 0;

  if (!hasIncidents) return null;

  return (
    <div style={{
      width: 320,
      borderRadius: 12,
      background: 'var(--card)',
      border: '1px solid rgba(230,168,23,0.3)',
      overflow: 'hidden',
      marginBottom: 14,
      boxShadow: '0 4px 16px rgba(230,168,23,0.1)',
    }}>
      <div style={{
        padding: '14px 16px',
        background: 'linear-gradient(135deg, rgba(230,168,23,0.12) 0%, rgba(230,168,23,0.06) 100%)',
        borderBottom: '1px solid rgba(230,168,23,0.2)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={16} color="var(--warning)" />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)' }}>
            Live Incidents
          </span>
          <span style={{ 
            fontSize: 11, 
            fontWeight: 600, 
            background: 'rgba(230,168,23,0.2)',
            color: 'var(--warning)',
            padding: '2px 8px',
            borderRadius: 6,
          }}>
            {incidents.length}
          </span>
        </div>
      </div>

      <div style={{ maxHeight: 240, overflowY: 'auto' }}>
        {incidents.slice(0, 4).map((incident, index) => (
          <div
            key={incident.id}
            style={{
              padding: '12px 14px',
              borderBottom: index < Math.min(incidents.length, 4) - 1 ? '1px solid var(--border)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {incident.translationKey || incident.sampleText || labelForIssue(incident.issueType)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--warning)' }}>{incident.hitCount}</span>
                <span style={{ fontSize: 8, color: 'var(--text-3)' }}>hits</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--warning)', background: 'rgba(230,168,23,0.1)', padding: '1px 6px', borderRadius: 3 }}>
                {labelForIssue(incident.issueType)}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-2)' }}>
                {incident.locale}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-2)' }}>
                on {incident.route}
              </span>
            </div>

            <div style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>
              first seen {formatRelativeTime(incident.firstSeenAt)} · last seen {formatRelativeTime(incident.lastSeenAt)}
            </div>
          </div>
        ))}
      </div>

      {incidents.length > 4 && (
        <div
          onClick={() => router.push(`/repo/${repoId}/sdk`)}
          style={{
            padding: '10px 14px',
            textAlign: 'center',
            fontSize: 11,
            color: 'var(--accent)',
            cursor: 'pointer',
            borderTop: '1px solid var(--border)',
            fontWeight: 500,
          }}
        >
          View all {incidents.length} incidents →
        </div>
      )}

      {incidents.length <= 4 && (
        <div
          onClick={() => router.push(`/repo/${repoId}/sdk`)}
          style={{
            padding: '10px 14px',
            textAlign: 'center',
            fontSize: 10,
            color: 'var(--text-3)',
            cursor: 'pointer',
            borderTop: '1px solid var(--border)',
          }}
        >
          Go to SDK page →
        </div>
      )}
    </div>
  );
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
