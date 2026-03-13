export type TranslationIncidentIssueType = 'raw_key' | 'placeholder' | 'fallback' | 'empty';

export interface TranslationIncidentReport {
  repoId: string;
  ingestKey: string;
  issueType: TranslationIncidentIssueType;
  locale: string;
  route?: string;
  translationKey?: string;
  sampleText?: string;
  fallbackLocale?: string;
  appVersion?: string;
  commitSha?: string;
  metadata?: Record<string, unknown>;
}

interface LingoPulseConfig {
  repoId: string;
  ingestKey: string;
  apiBase?: string;
  appVersion?: string;
  commitSha?: string;
}

interface InspectTranslationOptions {
  locale: string;
  route?: string;
  translationKey?: string;
  fallbackLocale?: string;
}

type Translator<TArgs extends unknown[]> = (...args: TArgs) => string;

function detectIssueType(value: string, options: InspectTranslationOptions): TranslationIncidentIssueType | null {
  const normalized = value.trim();

  if (!normalized) return 'empty';
  if (options.translationKey && normalized === options.translationKey) return 'raw_key';
  if (/^\{[^}]+\}$/.test(normalized) || /\{[^}]+\}/.test(normalized)) return 'placeholder';
  if (options.fallbackLocale) return 'fallback';

  return null;
}

export class LingoPulse {
  private readonly endpoint: string;
  private readonly basePayload: Pick<TranslationIncidentReport, 'repoId' | 'ingestKey' | 'appVersion' | 'commitSha'>;

  constructor(config: LingoPulseConfig) {
    this.endpoint = `${(config.apiBase ?? '').replace(/\/$/, '') || ''}/api/incidents/report`;
    this.basePayload = {
      repoId: config.repoId,
      ingestKey: config.ingestKey,
      appVersion: config.appVersion,
      commitSha: config.commitSha,
    };
  }

  async capture(payload: Omit<TranslationIncidentReport, 'repoId' | 'ingestKey' | 'appVersion' | 'commitSha'>) {
    const body: TranslationIncidentReport = {
      ...this.basePayload,
      ...payload,
      route: payload.route || (typeof window !== 'undefined' ? window.location.pathname : '/'),
    };

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
      navigator.sendBeacon(this.endpoint, blob);
      return;
    }

    await fetch(this.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      keepalive: true,
    });
  }

  inspect(value: string | null | undefined, options: InspectTranslationOptions) {
    const text = value ?? '';
    const issueType = detectIssueType(text, options);

    if (!issueType) return text;

    void this.capture({
      issueType,
      locale: options.locale,
      route: options.route,
      translationKey: options.translationKey,
      sampleText: text,
      fallbackLocale: options.fallbackLocale,
    });

    return text;
  }

  wrapTranslator<TArgs extends unknown[]>(
    translate: Translator<TArgs>,
    resolve: (...args: TArgs) => InspectTranslationOptions,
  ) {
    return (...args: TArgs) => {
      const value = translate(...args);
      return this.inspect(value, resolve(...args));
    };
  }
}
