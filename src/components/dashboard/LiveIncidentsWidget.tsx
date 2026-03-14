'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle } from 'lucide-react';
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

function labelForIssue(issueType: TranslationIncident['issueType']) {
  switch (issueType) {
    case 'raw_key': return 'raw key';
    case 'placeholder': return 'placeholder';
    case 'fallback': return 'fallback';
    case 'empty': return 'empty';
    default: return issueType;
  }
}

export default function LiveIncidentsWidget({ incidents: initialIncidents, repoId }: Props) {
  const [incidents, setIncidents] = useState(initialIncidents);
  const [resolving, setResolving] = useState<string | null>(null);
  const hasIncidents = incidents.length > 0;

  const handleResolve = async (incidentId: string) => {
    setResolving(incidentId);
    try {
      await fetch(`/api/incidents/${incidentId}`, { method: 'DELETE' });
      setIncidents(prev => prev.filter(i => i.id !== incidentId));
    } catch (e) {
      console.error('Failed to resolve incident:', e);
    } finally {
      setResolving(null);
    }
  };

  if (!hasIncidents) return null;

  return (
    <div style={{
      borderRadius: 12,
      background: 'var(--card)',
      border: '1px solid var(--border)',
      overflow: 'hidden',
      marginBottom: 14,
    }}>
      <div style={{
        padding: '14px 16px',
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
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
            background: 'var(--bg)',
            color: 'var(--warning)',
            padding: '2px 8px',
            borderRadius: 6,
          }}>
            {incidents.length}
          </span>
        </div>
      </div>

      <div style={{ padding: 10, display: 'grid', gridTemplateColumns: 'repeat(3, minmax(220px, 1fr))', gap: 8 }}>
        {incidents.slice(0, 3).map((incident) => (
          <div
            key={incident.id}
            style={{
              padding: 14,
              borderRadius: 10,
              background: 'var(--card)',
              border: '1px solid var(--border)',
              minHeight: 130,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, flex: 1, overflow: 'hidden' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {incident.translationKey || incident.sampleText || labelForIssue(incident.issueType)}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, flexShrink: 0, background: 'var(--bg-2)', padding: '3px 8px', borderRadius: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--warning)' }}>{incident.hitCount}</span>
                <span style={{ fontSize: 10, color: 'var(--warning)' }}>hits</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--text-2)', background: 'var(--bg-2)', padding: '3px 8px', borderRadius: 4, fontWeight: 500 }}>
                {labelForIssue(incident.issueType)}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-2)' }}>{incident.locale}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, fontSize: 10, color: 'var(--text-3)' }}>
              <span>{incident.route}</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
              <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
                {formatRelativeTime(incident.firstSeenAt)}
              </span>
              <button
                onClick={() => handleResolve(incident.id)}
                disabled={resolving === incident.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '5px 10px',
                  borderRadius: 5,
                  border: '1px solid rgba(34,197,94,0.3)',
                  background: 'rgba(34,197,94,0.1)',
                  color: 'var(--success)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: resolving === incident.id ? 'wait' : 'pointer',
                  opacity: resolving === incident.id ? 0.5 : 1,
                }}
              >
                <CheckCircle size={12} />
                Fix
              </button>
            </div>
          </div>
        ))}
      </div>

      {incidents.length > 3 && (
        <div style={{
          padding: '10px 14px',
          textAlign: 'center',
          fontSize: 11,
          color: 'var(--accent)',
          cursor: 'pointer',
          borderTop: '1px solid var(--border)',
        }}
        onClick={() => window.location.href = `/repo/${repoId}/sdk`}
        >
          View all incidents →
        </div>
      )}

      {incidents.length <= 3 && (
        <div style={{
          padding: '10px 14px',
          textAlign: 'center',
          fontSize: 10,
          color: 'var(--text-3)',
          borderTop: '1px solid var(--border)',
        }}>
          Click Fix to resolve incidents
        </div>
      )}
    </div>
  );
}
