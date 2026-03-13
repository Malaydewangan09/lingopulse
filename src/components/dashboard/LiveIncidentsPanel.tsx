'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, RadioTower } from 'lucide-react';
import SectionHeader from '@/components/dashboard/SectionHeader';
import type { TranslationIncident } from '@/lib/types';

interface Props {
  incidents: TranslationIncident[];
  repoId: string;
  ingestKey?: string | null;
  compact?: boolean;
}

function formatRelativeTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'recently';

  const diffMinutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60000));
  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function labelForIssue(issueType: TranslationIncident['issueType']) {
  switch (issueType) {
    case 'raw_key':
      return 'raw key';
    case 'placeholder':
      return 'placeholder leak';
    case 'fallback':
      return 'fallback copy';
    case 'empty':
      return 'empty translation';
    default:
      return issueType;
  }
}

export default function LiveIncidentsPanel({
  incidents,
  repoId,
  ingestKey,
  compact = false,
}: Props) {
  const router = useRouter();
  const apiBase = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const sdkSnippet = `const pulse = new LingoPulse({ repoId: '${repoId}', ingestKey: '${ingestKey ?? 'repo_ingest_key'}', apiBase: '${apiBase}' })`;
  const panelBorder = '1px solid var(--border)';
  const panelBackground = 'var(--card)';

  return (
    <div style={{ background: panelBackground, border: panelBorder, borderRadius: 12, overflow: 'hidden' }}>
      <SectionHeader
        title="Live Incidents"
        subtitle={incidents.length > 0 ? `${incidents.length} open production translation incidents` : 'SDK-ready production monitor for broken translations'}
        tooltip="The production reporter tracks raw keys, placeholder leaks, empty strings, and fallback copy rendered to real users."
        right={!compact ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              onClick={() => router.push(`/repo/${repoId}/sdk`)}
              className="mono-badge mono-badge-sm"
              style={{ color: 'var(--blue)', border: '1px solid color-mix(in srgb, var(--blue) 24%, transparent)', background: 'color-mix(in srgb, var(--blue) 10%, transparent)', cursor: 'pointer' }}
            >
              <RadioTower size={12} />
              sdk setup
            </button>
          </div>
        ) : undefined}
      />

      {incidents.length === 0 ? (
        <div style={{ padding: 18, display: 'grid', gap: 12 }}>
          <p style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
            Route the browser SDK into your production app to capture raw keys, placeholder leaks, fallback copy, and empty translations the moment users see them.
          </p>

          <p style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.6, fontFamily: 'var(--font-mono)' }}>
            Set a unique <span style={{ color: 'var(--text-1)' }}>appVersion</span> per app or surface, like <span style={{ color: 'var(--text-1)' }}>web@1.4.2</span> or <span style={{ color: 'var(--text-1)' }}>marketing@2026-03-13</span>, so incident rows show exactly which SDK source reported them.
          </p>

          <div style={{
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--surface)',
            padding: '12px 14px',
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-2)',
            overflowX: 'auto',
          }}>
            {sdkSnippet}
          </div>

          <p style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
            Full setup, integration examples, and endpoint details now live in the dedicated SDK page.
          </p>
        </div>
      ) : (
        <div style={{ padding: '8px 0' }}>
          {incidents.slice(0, compact ? 2 : incidents.length).map((incident, index) => (
            <div
              key={incident.id}
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1fr) auto',
                gap: 12,
                padding: compact ? '12px 16px' : '14px 18px',
                borderTop: index === 0 ? 'none' : '1px solid var(--border)',
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>
                    {incident.translationKey || incident.sampleText || labelForIssue(incident.issueType)}
                  </span>
                  <span className="mono-badge mono-badge-sm" style={{ color: 'var(--danger)', border: '1px solid rgba(240,82,72,0.18)', background: 'rgba(240,82,72,0.08)' }}>
                    {labelForIssue(incident.issueType)}
                  </span>
                  {incident.appVersion && (
                    <span className="mono-badge mono-badge-sm" style={{ color: 'var(--blue)', border: '1px solid color-mix(in srgb, var(--blue) 20%, transparent)', background: 'color-mix(in srgb, var(--blue) 9%, transparent)' }}>
                      source {incident.appVersion}
                    </span>
                  )}
                </div>

                <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 6 }}>
                  {incident.locale} on {incident.route}
                  {incident.fallbackLocale ? ` falling back to ${incident.fallbackLocale}` : ''}
                  {incident.sampleText ? ` • saw "${incident.sampleText}"` : ''}
                </p>

                <p style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-sans)' }}>
                  first seen {formatRelativeTime(incident.firstSeenAt)} · last seen {formatRelativeTime(incident.lastSeenAt)}
                  {incident.appVersion ? ` · source ${incident.appVersion}` : ' · source unlabeled'}
                  {incident.commitSha ? ` · ${incident.commitSha.slice(0, 7)}` : ''}
                </p>
              </div>

              <div style={{ textAlign: 'right', minWidth: 78 }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: 'var(--danger)', lineHeight: 1.1 }}>
                  {incident.hitCount}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>
                  hits
                </div>
              </div>
            </div>
          ))}

          <div style={{
            padding: '12px 18px 16px',
            borderTop: '1px solid var(--border)',
            fontSize: 11,
            color: 'var(--text-3)',
            fontFamily: 'var(--font-mono)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
            <AlertTriangle size={12} />
            {compact
              ? 'Live incident feed stays open until translation fixes are shipped and reports stop arriving.'
              : 'Incidents stay open until translation fixes are shipped and the next reports stop arriving.'}
          </div>
        </div>
      )}
    </div>
  );
}
