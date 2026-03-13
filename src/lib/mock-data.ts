import type {
  LocaleStats, FileLocaleCell, QualityDataPoint,
  CoverageDataPoint, ActivityEvent, PRCheck, RepoInfo
} from './types';

export const DEMO_REPO: RepoInfo = {
  id: '1',
  name: 'lingo.dev',
  fullName: 'lingodotdev/lingo.dev',
  owner: 'lingodotdev',
  defaultBranch: 'main',
  lastAnalyzed: new Date(Date.now() - 4 * 60 * 1000).toISOString(),
  overallCoverage: 78.4,
  qualityScore: 8.2,
  totalMissingKeys: 247,
  activeLocales: 12,
  totalLocales: 15,
  webhookActive: true,
};

export const LOCALE_STATS: LocaleStats[] = [
  { locale: 'en',    flag: '🇺🇸', name: 'English',             coverage: 100, qualityScore: 10.0, missingKeys: 0,   totalKeys: 1240, translatedKeys: 1240, lastUpdated: '2h ago',   trend: 0    },
  { locale: 'es',    flag: '🇪🇸', name: 'Spanish',             coverage: 94.2, qualityScore: 9.1, missingKeys: 72,  totalKeys: 1240, translatedKeys: 1168, lastUpdated: '3h ago',   trend: 2.1  },
  { locale: 'fr',    flag: '🇫🇷', name: 'French',              coverage: 91.8, qualityScore: 8.9, missingKeys: 102, totalKeys: 1240, translatedKeys: 1138, lastUpdated: '5h ago',   trend: -0.4 },
  { locale: 'de',    flag: '🇩🇪', name: 'German',              coverage: 89.3, qualityScore: 8.7, missingKeys: 133, totalKeys: 1240, translatedKeys: 1107, lastUpdated: '1d ago',   trend: 1.2  },
  { locale: 'ja',    flag: '🇯🇵', name: 'Japanese',            coverage: 82.6, qualityScore: 8.4, missingKeys: 216, totalKeys: 1240, translatedKeys: 1024, lastUpdated: '2d ago',   trend: -1.8 },
  { locale: 'zh-CN', flag: '🇨🇳', name: 'Chinese (Simplified)',coverage: 79.1, qualityScore: 8.1, missingKeys: 258, totalKeys: 1240, translatedKeys: 981,  lastUpdated: '2d ago',   trend: 0.6  },
  { locale: 'pt-BR', flag: '🇧🇷', name: 'Portuguese (Brazil)', coverage: 75.4, qualityScore: 7.8, missingKeys: 304, totalKeys: 1240, translatedKeys: 936,  lastUpdated: '3d ago',   trend: -2.3 },
  { locale: 'ko',    flag: '🇰🇷', name: 'Korean',              coverage: 68.2, qualityScore: 7.4, missingKeys: 394, totalKeys: 1240, translatedKeys: 846,  lastUpdated: '4d ago',   trend: 0    },
  { locale: 'ar',    flag: '🇸🇦', name: 'Arabic',              coverage: 61.7, qualityScore: 7.1, missingKeys: 475, totalKeys: 1240, translatedKeys: 765,  lastUpdated: '5d ago',   trend: -3.1 },
  { locale: 'ru',    flag: '🇷🇺', name: 'Russian',             coverage: 57.3, qualityScore: 6.8, missingKeys: 529, totalKeys: 1240, translatedKeys: 711,  lastUpdated: '6d ago',   trend: -0.9 },
  { locale: 'hi',    flag: '🇮🇳', name: 'Hindi',               coverage: 43.8, qualityScore: 6.2, missingKeys: 697, totalKeys: 1240, translatedKeys: 543,  lastUpdated: '8d ago',   trend: -1.5 },
  { locale: 'nl',    flag: '🇳🇱', name: 'Dutch',               coverage: 38.1, qualityScore: 5.9, missingKeys: 767, totalKeys: 1240, translatedKeys: 473,  lastUpdated: '10d ago',  trend: -4.2 },
];

export const FILE_MODULES = ['common', 'auth', 'dashboard', 'pricing', 'settings', 'emails', 'onboarding', 'errors', 'api'];

// locales × files coverage matrix
function cellCov(base: number, jitter: number): number {
  const v = base + (Math.random() - 0.5) * jitter;
  return Math.min(100, Math.max(0, Math.round(v * 10) / 10));
}

const LOCALE_BASES: Record<string, number> = {
  en: 100, es: 94, fr: 91, de: 89, ja: 82, 'zh-CN': 79,
  'pt-BR': 75, ko: 68, ar: 62, ru: 57, hi: 44, nl: 38,
};

export function generateHeatmapData(): FileLocaleCell[] {
  const cells: FileLocaleCell[] = [];
  const totalKeys = 1240;
  const perFile = Math.floor(totalKeys / FILE_MODULES.length);

  for (const locale of LOCALE_STATS.map(l => l.locale)) {
    const base = LOCALE_BASES[locale] ?? 50;
    for (const file of FILE_MODULES) {
      const cov = cellCov(base, 24);
      const missing = Math.round((1 - cov / 100) * perFile);
      cells.push({ locale, file, coverage: cov, missingKeys: missing, totalKeys: perFile });
    }
  }
  return cells;
}

export const HEATMAP_DATA = generateHeatmapData();

function genQualityHistory(): QualityDataPoint[] {
  const points: QualityDataPoint[] = [];
  const locales = ['en', 'es', 'fr', 'de', 'ja'];
  const values: Record<string, number> = { en: 10, es: 9.2, fr: 8.9, de: 8.8, ja: 8.5 };

  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const point: QualityDataPoint = { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), overall: 0 };

    let sum = 0;
    for (const locale of locales) {
      const drift = (Math.random() - 0.5) * 0.3;
      values[locale] = Math.min(10, Math.max(5, values[locale] + drift));
      point[locale] = Math.round(values[locale] * 10) / 10;
      sum += values[locale];
    }
    point.overall = Math.round(sum / locales.length * 10) / 10;
    points.push(point);
  }
  return points;
}

export const QUALITY_HISTORY = genQualityHistory();

function genCoverageHistory(): CoverageDataPoint[] {
  const points: CoverageDataPoint[] = [];
  let cov = 72;
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    cov = Math.min(100, Math.max(40, cov + (Math.random() - 0.45) * 1.5));
    points.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      coverage: Math.round(cov * 10) / 10,
      missingKeys: Math.round((1 - cov / 100) * 1240),
    });
  }
  return points;
}

export const COVERAGE_HISTORY = genCoverageHistory();

export const ACTIVITY: ActivityEvent[] = [
  {
    id: '1', type: 'push', repo: 'lingo.dev', branch: 'main',
    author: 'artcherkanov', avatarUrl: '',
    message: 'feat: add dashboard translations for ja locale',
    timestamp: '4 min ago', coverageDelta: 1.2, localesAffected: ['ja'],
  },
  {
    id: '2', type: 'regression', repo: 'lingo.dev', branch: 'feat/pricing-v2',
    author: 'replexicahq', avatarUrl: '',
    message: 'chore: update pricing page copy',
    timestamp: '37 min ago', coverageDelta: -3.1, localesAffected: ['es', 'fr', 'de', 'pt-BR'],
  },
  {
    id: '3', type: 'pr_merged', repo: 'lingo.dev', branch: 'fix/auth-strings',
    author: 'malay-dev', avatarUrl: '',
    message: 'fix: correct auth error messages in Spanish',
    timestamp: '2h ago', coverageDelta: 0.8, localesAffected: ['es'],
  },
  {
    id: '4', type: 'analysis', repo: 'lingo.dev', branch: 'main',
    author: 'lingo-bot', avatarUrl: '',
    message: 'Scheduled analysis completed · 247 missing keys detected',
    timestamp: '3h ago', coverageDelta: -0.2, localesAffected: ['ar', 'hi', 'nl'],
  },
  {
    id: '5', type: 'push', repo: 'lingo.dev', branch: 'main',
    author: 'artcherkanov', avatarUrl: '',
    message: 'i18n: bulk translate onboarding flow to Korean',
    timestamp: '5h ago', coverageDelta: 4.3, localesAffected: ['ko'],
  },
  {
    id: '6', type: 'pr_opened', repo: 'lingo.dev', branch: 'feat/nl-translations',
    author: 'contributor-42', avatarUrl: '',
    message: 'Add Dutch translations for settings module',
    timestamp: '8h ago', coverageDelta: 6.1, localesAffected: ['nl'],
  },
];

export const PR_CHECKS: PRCheck[] = [
  {
    id: '1', prNumber: 2041, title: 'feat: new onboarding flow',
    author: 'artcherkanov', branch: 'feat/onboarding-v3',
    status: 'failing', coverageBefore: 78.4, coverageAfter: 71.2,
    missingKeys: 89, timestamp: '20 min ago',
    summary: 'Coverage dropped 7.2 pts and 89 missing keys still need fixes.',
    prUrl: 'https://github.com/lingo-dev/lingopulse/pull/2041',
  },
  {
    id: '2', prNumber: 2038, title: 'fix: pricing page copy update',
    author: 'replexicahq', branch: 'fix/pricing-copy',
    status: 'warning', coverageBefore: 78.4, coverageAfter: 77.9,
    missingKeys: 14, timestamp: '1h ago',
    summary: 'Coverage softened by 0.5 pts. Review the touched locale files before merge.',
    prUrl: 'https://github.com/lingo-dev/lingopulse/pull/2038',
  },
  {
    id: '3', prNumber: 2035, title: 'chore: update footer strings',
    author: 'malay-dev', branch: 'chore/footer',
    status: 'passing', coverageBefore: 78.1, coverageAfter: 78.4,
    missingKeys: 0, timestamp: '3h ago',
    summary: 'No localization regression detected in this PR scan.',
    prUrl: 'https://github.com/lingo-dev/lingopulse/pull/2035',
  },
  {
    id: '4', prNumber: 2031, title: 'feat: add Hindi locale support',
    author: 'contributor-11', branch: 'feat/hi-locale',
    status: 'pending', coverageBefore: 43.5, coverageAfter: 43.8,
    missingKeys: 697, timestamp: '4h ago',
    summary: '697 missing keys are present, but this PR has not completed its final check yet.',
    prUrl: 'https://github.com/lingo-dev/lingopulse/pull/2031',
  },
];
