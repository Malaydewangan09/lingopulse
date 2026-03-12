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
  type: 'push' | 'pr_opened' | 'pr_merged' | 'analysis' | 'regression';
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
