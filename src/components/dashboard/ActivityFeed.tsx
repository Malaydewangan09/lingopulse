'use client';
import type { ActivityEvent } from '@/lib/types';
import { GitCommit, GitMerge, GitPullRequest, Zap, AlertTriangle } from 'lucide-react';
import SectionHeader from '@/components/dashboard/SectionHeader';

interface Props { events: ActivityEvent[]; }

function EventIcon({ type }: { type: ActivityEvent['type'] }) {
  const iconProps = { size: 13 };
  const style: Record<ActivityEvent['type'], { icon: React.ReactNode; color: string; bg: string }> = {
    push:        { icon: <GitCommit {...iconProps} />, color: 'var(--blue)',    bg: 'var(--blue-dim)' },
    pr_opened:   { icon: <GitPullRequest {...iconProps} />, color: 'var(--accent)', bg: 'var(--accent-dim)' },
    pr_merged:   { icon: <GitMerge {...iconProps} />, color: '#C084FC',         bg: 'rgba(192,132,252,0.1)' },
    analysis:    { icon: <Zap {...iconProps} />, color: 'var(--warning)',       bg: 'rgba(230,168,23,0.1)' },
    regression:  { icon: <AlertTriangle {...iconProps} />, color: 'var(--danger)', bg: 'rgba(240,82,72,0.1)' },
  };
  const s = style[type];
  return (
    <div style={{
      width: 28, height: 28, borderRadius: 8, flexShrink: 0,
      background: s.bg, color: s.color,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: `1px solid ${s.color}28`,
    }}>
      {s.icon}
    </div>
  );
}

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

export default function ActivityFeed({ events }: Props) {
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      {/* Header */}
      <SectionHeader
        title="Recent Activity"
        tooltip="Every event that changed your translations — git pushes, PR opens/merges, and scheduled analyses. Coverage delta (+/-%) shows if a push improved or hurt your coverage."
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="status-live" />
            <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>live</span>
          </div>
        }
      />

      <div style={{ padding: '8px 0' }}>
        {events.length === 0 ? (
          <div style={{ padding: '24px 16px', color: 'var(--text-2)', fontSize: 12, textAlign: 'center' }}>
            Activity will appear here after a manual scan, push, or pull request event.
          </div>
        ) : (
          events.map((event, i) => (
            <div
              key={event.id}
              style={{
                padding: '10px 16px',
                borderBottom: i < events.length - 1 ? '1px solid rgba(28,43,58,0.5)' : 'none',
                display: 'flex', gap: 10, alignItems: 'flex-start',
                transition: 'background 0.15s',
                animationDelay: `${i * 0.06}s`,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.015)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <EventIcon type={event.type} />

              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{
                  fontSize: 12, color: 'var(--text-1)', lineHeight: 1.4,
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  marginBottom: 4,
                }}>
                  {event.message}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--blue), var(--accent))',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 8, fontFamily: 'DM Mono, monospace', color: 'var(--bg)', fontWeight: 700,
                    flexShrink: 0,
                  }}>
                    {initials(event.author)}
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
                    {event.author}
                  </span>

                  <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>·</span>
                  <span style={{
                    fontSize: 9, color: 'var(--blue)', fontFamily: 'DM Mono, monospace',
                    background: 'var(--blue-dim)', padding: '1px 5px', borderRadius: 3,
                  }}>
                    {event.branch}
                  </span>

                  {event.coverageDelta !== undefined && event.coverageDelta !== 0 && (
                    <>
                      <span style={{ fontSize: 10, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>·</span>
                      <span style={{
                        fontSize: 10, fontFamily: 'DM Mono, monospace',
                        color: event.coverageDelta > 0 ? 'var(--success)' : 'var(--danger)',
                      }}>
                        {event.coverageDelta > 0 ? '+' : ''}{event.coverageDelta.toFixed(1)}%
                      </span>
                    </>
                  )}

                  {event.localesAffected && event.localesAffected.length > 0 && (
                    <div style={{ display: 'flex', gap: 3, marginLeft: 'auto' }}>
                      {event.localesAffected.slice(0, 3).map(l => (
                        <span key={l} style={{
                          fontSize: 9, fontFamily: 'DM Mono, monospace',
                          color: 'var(--text-3)', background: 'var(--border)',
                          padding: '1px 4px', borderRadius: 3,
                        }}>
                          {l}
                        </span>
                      ))}
                      {event.localesAffected.length > 3 && (
                        <span style={{ fontSize: 9, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace' }}>
                          +{event.localesAffected.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <span style={{
                fontSize: 10, color: 'var(--text-3)', fontFamily: 'DM Mono, monospace',
                flexShrink: 0, paddingTop: 2,
              }}>
                {event.timestamp}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
