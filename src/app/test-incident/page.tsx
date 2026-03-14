'use client';

import { useState } from 'react';

export default function TestIncidentSender() {
  const [status, setStatus] = useState('');
  
  const sendIncident = async (issueType: string) => {
    setStatus('Sending...');
    try {
      const res = await fetch('/api/incidents/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoId: 'demo',
          ingestKey: 'demo-key',
          issueType,
          locale: 'es',
          route: '/',
          translationKey: 'welcome_message',
          sampleText: issueType === 'raw_key' ? 'welcome_message' : 
                      issueType === 'placeholder' ? 'Hello {name}, welcome!' :
                      issueType === 'fallback' ? 'Hello {name}' :
                      '',
          appVersion: 'test',
        }),
      });
      
      if (res.ok) {
        setStatus(`✅ ${issueType} incident sent!`);
      } else {
        const data = await res.json();
        setStatus(`❌ Error: ${data.error}`);
      }
    } catch (e) {
      setStatus(`❌ Error: ${e}`);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h2>Test Incident Sender</h2>
      <p>Click buttons to simulate different incident types:</p>
      
      <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
        <button onClick={() => sendIncident('raw_key')} style={{ padding: '10px 20px' }}>
          Test Raw Key
        </button>
        <button onClick={() => sendIncident('placeholder')} style={{ padding: '10px 20px' }}>
          Test Placeholder
        </button>
        <button onClick={() => sendIncident('fallback')} style={{ padding: '10px 20px' }}>
          Test Fallback
        </button>
        <button onClick={() => sendIncident('empty')} style={{ padding: '10px 20px' }}>
          Test Empty
        </button>
      </div>
      
      {status && <p style={{ marginTop: 16, fontWeight: 'bold' }}>{status}</p>}
    </div>
  );
}
