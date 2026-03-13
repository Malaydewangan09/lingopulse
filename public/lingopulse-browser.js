(function (global) {
  function detectIssueType(value, options) {
    var normalized = String(value || '').trim();

    if (!normalized) return 'empty';
    if (options.translationKey && normalized === options.translationKey) return 'raw_key';
    if (/^\{[^}]+\}$/.test(normalized) || /\{[^}]+\}/.test(normalized)) return 'placeholder';
    if (options.fallbackLocale) return 'fallback';

    return null;
  }

  function LingoPulse(config) {
    this.endpoint = (config.apiBase || '').replace(/\/$/, '') + '/api/incidents/report';
    this.basePayload = {
      repoId: config.repoId,
      ingestKey: config.ingestKey,
      appVersion: config.appVersion,
      commitSha: config.commitSha,
    };
  }

  LingoPulse.prototype.capture = function capture(payload) {
    var body = Object.assign({}, this.basePayload, payload, {
      route: payload.route || (typeof window !== 'undefined' ? window.location.pathname : '/'),
    });

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      var blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
      navigator.sendBeacon(this.endpoint, blob);
      return Promise.resolve();
    }

    return fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    });
  };

  LingoPulse.prototype.inspect = function inspect(value, options) {
    var text = value == null ? '' : String(value);
    var issueType = detectIssueType(text, options || {});

    if (!issueType) return text;

    this.capture({
      issueType: issueType,
      locale: options.locale,
      route: options.route,
      translationKey: options.translationKey,
      sampleText: text,
      fallbackLocale: options.fallbackLocale,
    });

    return text;
  };

  LingoPulse.prototype.wrapTranslator = function wrapTranslator(translate, resolve) {
    var self = this;
    return function wrapped() {
      var args = Array.prototype.slice.call(arguments);
      var value = translate.apply(null, args);
      return self.inspect(value, resolve.apply(null, args));
    };
  };

  global.LingoPulse = LingoPulse;
})(typeof window !== 'undefined' ? window : globalThis);
