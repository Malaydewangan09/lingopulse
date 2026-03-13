export type LocaleCode = string;
export type FilePath = string;

export interface LocaleStats {
  locale: LocaleCode;
  flag: string;
  name: string;
  coverage: number;         // 0-100
  qualityScore: number;     // 0-10
  missingKeys: number;
  totalKeys: number;
  translatedKeys: number;
  lastUpdated: string;      // ISO date
  trend: number;            // delta from last check (+/-)
  isSourceLocale?: boolean;
}

export interface FileLocaleCell {
  locale: LocaleCode;
  file: FilePath;
  coverage: number;
  missingKeys: number;
  totalKeys: number;
}

export interface QualityDataPoint {
  date: string;
  overall: number;
  [locale: string]: number | string;
}

export interface CoverageDataPoint {
  date: string;
  coverage: number;
  missingKeys: number;
}

export interface ActivityEvent {
  id: string;
  type: 'push' | 'pr_opened' | 'pr_merged' | 'analysis' | 'regression' | 'incident';
  repo: string;
  branch: string;
  author: string;
  avatarUrl: string;
  message: string;
  timestamp: string;
  coverageDelta?: number;
  localesAffected?: string[];
}

export interface PRCheck {
  id: string;
  prNumber: number;
  title: string;
  author: string;
  branch: string;
  status: 'passing' | 'failing' | 'warning' | 'pending';
  coverageBefore: number;
  coverageAfter: number;
  missingKeys: number;
  timestamp: string;
  summary: string;
  prUrl: string;
}

export interface ScanDiffSignal {
  key: string;
  label: string;
  coverageDelta: number;
  qualityDelta?: number;
  missingDelta: number;
  currentCoverage: number;
  currentMissingKeys: number;
  currentQualityScore?: number;
}

export interface ScanDiffSummary {
  hasBaseline: boolean;
  status: 'safe' | 'watch' | 'blocked';
  headline: string;
  summary: string;
  recommendation: string;
  coverageDelta: number;
  qualityDelta: number;
  missingKeysDelta: number;
  regressedLocales: ScanDiffSignal[];
  improvedLocales: ScanDiffSignal[];
  regressedModules: ScanDiffSignal[];
  improvedModules: ScanDiffSignal[];
}

export interface DraftFixResult {
  prUrl: string;
  branch: string;
  filesUpdated: number;
  localesTouched: string[];
  keysFilled: number;
  mode: 'lingo' | 'source';
}

export type TranslationIncidentIssueType = 'raw_key' | 'placeholder' | 'fallback' | 'empty';

export interface TranslationIncident {
  id: string;
  issueType: TranslationIncidentIssueType;
  locale: string;
  route: string;
  translationKey: string;
  sampleText: string;
  fallbackLocale?: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  hitCount: number;
  appVersion?: string | null;
  commitSha?: string | null;
}

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

export interface RepoInfo {
  id: string;
  name: string;
  fullName: string;
  owner: string;
  defaultBranch: string;
  lastAnalyzed: string;
  overallCoverage: number;
  qualityScore: number;
  totalMissingKeys: number;
  activeLocales: number;
  totalLocales: number;
  webhookActive: boolean;
}
