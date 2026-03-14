'use client';

import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, CheckCircle } from 'lucide-react';
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
    case 'placeholder': return 'placeholder leak';
    case 'fallback': return 'fallback copy';
    case 'empty': return 'empty translation';
    default: return issueType;
  }
}

export default function LiveIncidentsFullView({ incidents: initialIncidents, repoId }: Props) {
  const [expanded, setExpanded] = useState(true);
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

  if (!hasIncidents) {
    return (
      <div style={{
        borderRadius: 12,
        background: 'var(--card)',
        border: '1px solid var(--border)',
        padding: 24,
        textAlign: 'center',
        marginBottom: 16,
      }}>
        <div style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 8 }}>
          No incidents reported yet
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
          Trigger one from your app to validate SDK wiring
        </div>
      </div>
    );
  }

  return (
    <div style={{
      borderRadius: 12,
      background: 'var(--card)',
      border: '1px solid var(--border)',
      overflow: 'hidden',
      marginBottom: 16,
    }}>
      <div 
        onClick={() => setExpanded(!expanded)}
        style={{
          padding: '14px 16px',
          background: 'var(--surface)',
          borderBottom: expanded ? '1px solid var(--border)' : 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <AlertTriangle size={16} color="var(--warning)" />
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
            Live Incidents
          </span>
          <span style={{ 
            fontSize: 11, 
            fontWeight: 600, 
            background: 'var(--accent-dim)',
            color: 'var(--accent)',
            padding: '2px 8px',
            borderRadius: 6,
          }}>
            {incidents.length} open
          </span>
        </div>
        {expanded ? <ChevronUp size={16} color="var(--text-3)" /> : <ChevronDown size={16} color="var(--text-3)" />}
      </div>

      {expanded && (
        <div>
          {incidents.map((incident, index) => (
            <div
              key={incident.id}
              style={{
                padding: '14px 16px',
                borderBottom: index < incidents.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', flexShrink: 0, marginTop: 4 }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-1)', marginBottom: 4 }}>
                      {incident.translationKey || incident.sampleText || labelForIssue(incident.issueType)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
                      {incident.locale} on {incident.route}
                      {incident.fallbackLocale && <span style={{ color: 'var(--text-3)' }}> → {incident.fallbackLocale}</span>}
                    </div>
                  </div>
                </div>
                <div style={{ textAlign: 'center', flexShrink: 0, marginLeft: 12 }}>
                  <div style={{ fontSize: 19, fontWeight: 700, color: 'var(--warning)', fontFamily: 'var(--font-mono)' }}>
                    {incident.hitCount}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>hits</div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <span style={{ 
                    fontSize: 10, 
                    color: 'var(--warning)', 
                    background: 'rgba(230,168,23,0.1)',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontWeight: 500,
                  }}>
                    {labelForIssue(incident.issueType)}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
                    first seen {formatRelativeTime(incident.firstSeenAt)}
                  </span>
                  <span style={{ fontSize: 10, color: 'var(--text-3)' }}>
                    last seen {formatRelativeTime(incident.lastSeenAt)}
                  </span>
                  {incident.appVersion && (
                    <span style={{ fontSize: 10, color: 'var(--blue)' }}>
                      source {incident.appVersion}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => handleResolve(incident.id)}
                  disabled={resolving === incident.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    padding: '4px 10px',
                    borderRadius: 6,
                    border: 'none',
                    background: 'var(--success)',
                    color: '#0D1117',
                    fontSize: 10,
                    fontWeight: 600,
                    cursor: resolving === incident.id ? 'wait' : 'pointer',
                    opacity: resolving === incident.id ? 0.7 : 1,
                  }}
                >
                  <CheckCircle size={12} />
                  Resolve
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
