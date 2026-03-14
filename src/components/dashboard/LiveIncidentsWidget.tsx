'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle, Copy, X, Wand2 } from 'lucide-react';
import type { TranslationIncident } from '@/lib/types';

interface Props {
  incidents: TranslationIncident[];
  repoId: string;
  sourceLocale?: string;
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

export default function LiveIncidentsWidget({ incidents: initialIncidents, repoId, sourceLocale = 'en' }: Props) {
  const [incidents, setIncidents] = useState(initialIncidents);
  const [resolving, setResolving] = useState<string | null>(null);
  const [fixingIncident, setFixingIncident] = useState<TranslationIncident | null>(null);
  const [sourceText, setSourceText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [translating, setTranslating] = useState(false);
  const [copied, setCopied] = useState(false);
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

  const handleFixClick = (incident: TranslationIncident) => {
    setFixingIncident(incident);
    setSourceText('');
    setTranslatedText('');
    setCopied(false);
  };

  const handleTranslate = async () => {
    if (!fixingIncident) return;
    setTranslating(true);
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoId,
          key: fixingIncident.translationKey,
          sourceText: sourceText || fixingIncident.translationKey,
          targetLocale: fixingIncident.locale,
          sourceLocale,
        }),
      });
      const data = await res.json();
      if (data.translation) {
        setTranslatedText(data.translation);
      }
    } catch (e) {
      console.error('Failed to translate:', e);
    } finally {
      setTranslating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(translatedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseFix = () => {
    setFixingIncident(null);
    setSourceText('');
    setTranslatedText('');
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
                onClick={() => handleFixClick(incident)}
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

      {fixingIncident && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
        }}
        onClick={handleCloseFix}
        >
          <div style={{
            background: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: 20,
            width: '90%',
            maxWidth: 480,
            maxHeight: '90vh',
            overflow: 'auto',
          }}
          onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Wand2 size={18} color="var(--accent)" />
                <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-1)' }}>Fix Translation</span>
              </div>
              <button onClick={handleCloseFix} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Issue
              </div>
              <div style={{ 
                fontSize: 12, 
                color: 'var(--warning)', 
                background: 'var(--bg)', 
                padding: '8px 12px', 
                borderRadius: 6 
              }}>
                {labelForIssue(fixingIncident.issueType)}: {fixingIncident.translationKey || fixingIncident.sampleText}
              </div>
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>
                Current ({fixingIncident.locale}): <span style={{ color: 'var(--danger)' }}>{fixingIncident.sampleText || '(empty)'}</span>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Source Text ({sourceLocale})
              </div>
              <input
                type="text"
                value={sourceText}
                onChange={e => setSourceText(e.target.value)}
                placeholder={fixingIncident.translationKey || 'Enter source text in English...'}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text-1)',
                  fontSize: 13,
                  outline: 'none',
                }}
              />
              <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>
                Enter the correct text in {sourceLocale} that should be translated
              </div>
            </div>

            <button
              onClick={handleTranslate}
              disabled={translating || !sourceText}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: 6,
                border: 'none',
                background: translating ? 'var(--bg)' : 'var(--accent)',
                color: translating ? 'var(--text-2)' : 'var(--bg)',
                fontSize: 13,
                fontWeight: 600,
                cursor: translating ? 'wait' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                marginBottom: translatedText ? 16 : 0,
              }}
            >
              {translating ? (
                <>Translating...</>
              ) : (
                <><Wand2 size={14} /> Translate with Lingo.dev</>
              )}
            </button>

            {translatedText && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Fixed Translation ({fixingIncident.locale})
                </div>
                <div style={{ 
                  fontSize: 14, 
                  color: 'var(--success)', 
                  background: 'rgba(34,197,94,0.1)', 
                  padding: '12px', 
                  borderRadius: 6,
                  border: '1px solid rgba(34,197,94,0.3)',
                  marginBottom: 12,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}>
                  {translatedText}
                </div>
                
                {fixingIncident.issueType === 'placeholder' && (
                  <div style={{ 
                    fontSize: 11, 
                    color: 'var(--warning)', 
                    background: 'rgba(230,168,23,0.1)', 
                    padding: '8px 12px', 
                    borderRadius: 6,
                    marginBottom: 12,
                  }}>
                    ⚠️ Verify that placeholders match the source text!
                  </div>
                )}

                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={handleCopy}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      borderRadius: 6,
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text-1)',
                      fontSize: 13,
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <Copy size={14} />
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <button
                    onClick={() => {
                      handleResolve(fixingIncident.id);
                      handleCloseFix();
                    }}
                    style={{
                      flex: 1,
                      padding: '10px 16px',
                      borderRadius: 6,
                      border: 'none',
                      background: 'var(--accent)',
                      color: 'var(--bg)',
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                    }}
                  >
                    <CheckCircle size={14} />
                    Mark Resolved
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
