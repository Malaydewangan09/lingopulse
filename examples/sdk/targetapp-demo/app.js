const pulseConfig = {
  repoId: 'ec1fc1f2-88dd-4b85-a001-35a5c455d13c',
  ingestKey: 'b6bfcb97952de68b326092edc5554adc2141',
  apiBase: 'http://localhost:3000',
  appVersion: 'static-site@1.0.0',
};

const locale = 'ja';
const route = '/checkout';

const states = {
  healthy: {
    value: '今すぐ支払う',
    note: 'Healthy translation. No incident should be reported.',
    translationKey: 'checkout.pay_now',
  },
  'raw-key': {
    value: 'checkout.pay_now',
    note: 'Simulates a raw translation key leaking to users.',
    translationKey: 'checkout.pay_now',
  },
  placeholder: {
    value: '{user_name}',
    note: 'Simulates a placeholder token leaking to users.',
    translationKey: 'checkout.welcome_user',
  },
  fallback: {
    value: 'Pay now',
    note: 'Simulates target locale falling back to source copy.',
    translationKey: 'checkout.pay_now',
    fallbackLocale: 'en',
  },
  empty: {
    value: '',
    note: 'Simulates an empty translation value.',
    translationKey: 'checkout.pay_now',
  },
};

const sdkStatus = document.getElementById('sdk-status');
const activeLocale = document.getElementById('active-locale');
const previewValue = document.getElementById('preview-value');
const previewNote = document.getElementById('preview-note');
const eventLog = document.getElementById('event-log');
const lastResult = document.getElementById('last-result');

activeLocale.textContent = locale;

let pulse = null;

function setStatus(text, mode) {
  sdkStatus.textContent = text;
  sdkStatus.className = 'status-chip ' + mode;
}

function setLastResult(text) {
  lastResult.textContent = text;
}

function appendLog(title, meta) {
  const item = document.createElement('div');
  item.className = 'log-item';
  item.innerHTML = `<strong>${title}</strong><div class="log-meta">${meta}</div>`;
  eventLog.prepend(item);
}

function renderState(nextState) {
  previewValue.textContent = nextState.value || '(empty string)';
  previewNote.textContent = nextState.note;
}

async function trigger(action) {
  const nextState = states[action];
  if (!nextState || !pulse) return;

  renderState(nextState);

  const issueType = action === 'raw-key'
    ? 'raw_key'
    : action === 'placeholder'
    ? 'placeholder'
    : action === 'fallback'
    ? 'fallback'
    : action === 'empty'
    ? 'empty'
    : null;

  if (!issueType) {
    const result = pulse.inspect(nextState.value, {
      locale,
      route,
      translationKey: nextState.translationKey,
      fallbackLocale: nextState.fallbackLocale,
    });
    setLastResult('healthy preview');
    appendLog(
      `Rendered ${action}`,
      `Healthy preview only. Rendered "${result}" with no incident for ${locale} on ${route}.`
    );
    return;
  }

  try {
    const response = await fetch(`${pulseConfig.apiBase}/api/incidents/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repoId: pulseConfig.repoId,
        ingestKey: pulseConfig.ingestKey,
        issueType,
        locale,
        route,
        translationKey: nextState.translationKey,
        sampleText: nextState.value,
        fallbackLocale: nextState.fallbackLocale,
        appVersion: pulseConfig.appVersion,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || `HTTP ${response.status}`);
    }

    setLastResult(payload.status || 'sent');
    appendLog(
      `Triggered ${action}`,
      `Incident ${payload.status || 'sent'} for ${locale} on ${route}. Dashboard should show it after refresh.`
    );
  } catch (error) {
    setLastResult('request failed');
    appendLog(
      `Trigger failed`,
      `Could not reach ${pulseConfig.apiBase}/api/incidents/report. ${error instanceof Error ? error.message : 'Unknown error'}.`
    );
  }
}

function clearLog() {
  eventLog.innerHTML = '';
  setLastResult('waiting');
}

function bootstrap() {
  if (!window.LingoPulse) {
    setStatus('sdk missing', 'status-error');
    appendLog('SDK load failed', 'Make sure Lingo Pulse is running on http://localhost:3000 so /lingopulse-browser.js can load.');
    return;
  }

  pulse = new window.LingoPulse(pulseConfig);
  setStatus('ready', 'status-ready');
  renderState(states.healthy);
  appendLog('SDK ready', 'Click a button to simulate a translation issue and send an incident.');
}

document.addEventListener('click', event => {
  const button = event.target.closest('button[data-action]');
  if (!button) return;

  const action = button.getAttribute('data-action');
  if (action === 'clear-log') {
    clearLog();
    return;
  }

  trigger(action);
});

bootstrap();
