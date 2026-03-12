/**
 * Core i18n analysis engine.
 * - Parses JSON/YAML locale files
 * - Calculates coverage per locale × file
 * - Scores translation quality via Lingo.dev SDK (sampling)
 */

import yaml from 'js-yaml';
import type { GithubFile } from './github';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LocaleFile {
  locale: string;
  filePath: string;
  moduleName: string;
  keys: Record<string, string>;   // flat: "auth.login.button" → "Sign in"
  keyCount: number;
}

export interface FileCoverageResult {
  locale: string;
  filePath: string;
  moduleName: string;
  totalKeys: number;
  translatedKeys: number;
  missingKeys: number;
  coverage: number;
}

export interface LocaleCoverageResult {
  locale: string;
  totalKeys: number;
  translatedKeys: number;
  missingKeys: number;
  coverage: number;
  qualityScore: number;
  fileResults: FileCoverageResult[];
}

export interface AnalysisResult {
  overallCoverage: number;
  qualityScore: number;
  totalKeys: number;
  missingKeys: number;
  locales: LocaleCoverageResult[];
  sourceLocale: string;
  analyzedFiles: number;
}

// ─── Parsers ─────────────────────────────────────────────────────────────────

const LOCALE_CODE_RE = /^[a-z]{2}(?:[-_][A-Za-z]{2,4})?$/;

function parseFileContent(content: string, path: string): Record<string, unknown> | null {
  try {
    let parsed: Record<string, unknown> | null = null;
    if (path.endsWith('.json')) parsed = JSON.parse(content);
    else if (path.endsWith('.yaml') || path.endsWith('.yml')) parsed = yaml.load(content) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;

    // Unwrap locale-keyed format: {"en": {...}} or {"de": {...}}
    // Kestra and some other projects wrap all translations under the locale code
    const keys = Object.keys(parsed);
    if (keys.length === 1 && LOCALE_CODE_RE.test(keys[0]) && typeof parsed[keys[0]] === 'object') {
      return parsed[keys[0]] as Record<string, unknown>;
    }

    return parsed;
  } catch {}
  return null;
}

/** Recursively flatten nested object into dot-notation keys */
function flattenKeys(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v !== null && typeof v === 'object' && !Array.isArray(v)) {
      Object.assign(result, flattenKeys(v as Record<string, unknown>, key));
    } else if (typeof v === 'string' && v.trim()) {
      result[key] = v;
    }
  }
  return result;
}

// ─── Locale detection ────────────────────────────────────────────────────────

const LOCALE_REGEX = /[\/\-_]([a-z]{2}(?:[-_][A-Z]{2})?)(?:\/|\.)/;
const LOCALE_FROM_DIR = /(?:^|\/)([a-z]{2}(?:[-_][A-Z]{2})?)\/[^\/]+\.(json|yaml|yml)$/;

function inferLocale(path: string): string | null {
  const m = LOCALE_FROM_DIR.exec(path) ?? LOCALE_REGEX.exec(path);
  if (!m) return null;
  return m[1].replace('_', '-');
}

function inferModuleName(path: string): string {
  const parts = path.split('/');
  const filename = parts[parts.length - 1].replace(/\.(json|yaml|yml)$/, '');
  // If filename looks like a locale code, use parent dir
  if (/^[a-z]{2}(-[A-Z]{2})?$/.test(filename)) {
    return parts[parts.length - 2] ?? 'messages';
  }
  return filename;
}

// ─── File grouping ───────────────────────────────────────────────────────────

interface FileGroup {
  moduleName: string;
  files: Map<string, LocaleFile>;   // locale → LocaleFile
}

function groupFilesByModule(localeFiles: LocaleFile[]): Map<string, FileGroup> {
  const groups = new Map<string, FileGroup>();
  for (const f of localeFiles) {
    if (!groups.has(f.moduleName)) {
      groups.set(f.moduleName, { moduleName: f.moduleName, files: new Map() });
    }
    groups.get(f.moduleName)!.files.set(f.locale, f);
  }
  return groups;
}

// ─── Quality scoring via Lingo.dev SDK ──────────────────────────────────────

const LOCALE_METADATA: Record<string, { flag: string; name: string }> = {
  en:     { flag: '🇺🇸', name: 'English' },
  es:     { flag: '🇪🇸', name: 'Spanish' },
  fr:     { flag: '🇫🇷', name: 'French' },
  de:     { flag: '🇩🇪', name: 'German' },
  ja:     { flag: '🇯🇵', name: 'Japanese' },
  'zh-CN':{ flag: '🇨🇳', name: 'Chinese (Simplified)' },
  'zh-TW':{ flag: '🇹🇼', name: 'Chinese (Traditional)' },
  'pt-BR':{ flag: '🇧🇷', name: 'Portuguese (Brazil)' },
  pt:     { flag: '🇵🇹', name: 'Portuguese' },
  ko:     { flag: '🇰🇷', name: 'Korean' },
  ar:     { flag: '🇸🇦', name: 'Arabic' },
  ru:     { flag: '🇷🇺', name: 'Russian' },
  hi:     { flag: '🇮🇳', name: 'Hindi' },
  nl:     { flag: '🇳🇱', name: 'Dutch' },
  it:     { flag: '🇮🇹', name: 'Italian' },
  pl:     { flag: '🇵🇱', name: 'Polish' },
  tr:     { flag: '🇹🇷', name: 'Turkish' },
  sv:     { flag: '🇸🇪', name: 'Swedish' },
  da:     { flag: '🇩🇰', name: 'Danish' },
  fi:     { flag: '🇫🇮', name: 'Finnish' },
  nb:     { flag: '🇳🇴', name: 'Norwegian' },
  cs:     { flag: '🇨🇿', name: 'Czech' },
  uk:     { flag: '🇺🇦', name: 'Ukrainian' },
  vi:     { flag: '🇻🇳', name: 'Vietnamese' },
  th:     { flag: '🇹🇭', name: 'Thai' },
  id:     { flag: '🇮🇩', name: 'Indonesian' },
  ms:     { flag: '🇲🇾', name: 'Malay' },
  ro:     { flag: '🇷🇴', name: 'Romanian' },
  hu:     { flag: '🇭🇺', name: 'Hungarian' },
  el:     { flag: '🇬🇷', name: 'Greek' },
  he:     { flag: '🇮🇱', name: 'Hebrew' },
};

export function getLocaleMetadata(locale: string) {
  return LOCALE_METADATA[locale] ?? { flag: '🌐', name: locale };
}

/** Simple string similarity 0-1 (Jaccard on trigrams) */
function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const trigrams = (s: string) => new Set(Array.from({ length: s.length - 2 }, (_, i) => s.slice(i, i + 3)));
  const ta = trigrams(a.toLowerCase());
  const tb = trigrams(b.toLowerCase());
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  const union = ta.size + tb.size - inter;
  return union === 0 ? 1 : inter / union;
}

/** Score quality by sampling translations against Lingo.dev re-translation */
async function scoreQualityWithLingo(
  sourceKeys: Record<string, string>,
  targetKeys: Record<string, string>,
  targetLocale: string,
  lingoApiKey: string,
): Promise<number> {
  try {
    const { LingoDotDevEngine } = await import('@lingo.dev/_sdk');
    const engine = new LingoDotDevEngine({ apiKey: lingoApiKey });

    // Sample up to 6 non-trivial strings
    const sampleEntries = Object.entries(sourceKeys)
      .filter(([, v]) => v.length > 8 && v.length < 120 && !v.includes('{') && !v.includes('<'))
      .slice(0, 6);

    if (sampleEntries.length === 0) return 7.5;

    const sampleObj = Object.fromEntries(sampleEntries);

    // Re-translate via Lingo
    const retranslated = await engine.localizeObject(
      sampleObj,
      { sourceLocale: 'en', targetLocale },
    );

    // Compare with existing translations
    let totalSim = 0;
    let count = 0;
    for (const [key] of sampleEntries) {
      const existing = targetKeys[key];
      const fresh    = (retranslated as Record<string, string>)[key];
      if (existing && fresh) {
        totalSim += similarity(existing, fresh);
        count++;
      }
    }

    if (count === 0) return 7.0;
    // Map 0–1 similarity to 5–10 quality score
    const avgSim = totalSim / count;
    return Math.round((5 + avgSim * 5) * 10) / 10;
  } catch {
    // If SDK fails (no API key, network error), return a coverage-based estimate
    return null as unknown as number;
  }
}

// ─── Main analysis ───────────────────────────────────────────────────────────

export async function analyzeRepo(
  files: GithubFile[],
  lingoApiKey?: string,
): Promise<AnalysisResult> {
  // Parse all files
  const localeFiles: LocaleFile[] = [];
  for (const f of files) {
    const parsed = parseFileContent(f.content, f.path);
    if (!parsed) continue;

    const locale = inferLocale(f.path);
    if (!locale) continue;

    const keys = flattenKeys(parsed);
    if (Object.keys(keys).length === 0) continue;

    localeFiles.push({
      locale,
      filePath: f.path,
      moduleName: inferModuleName(f.path),
      keys,
      keyCount: Object.keys(keys).length,
    });
  }

  if (localeFiles.length === 0) {
    return {
      overallCoverage: 0, qualityScore: 0, totalKeys: 0, missingKeys: 0,
      locales: [], sourceLocale: 'en', analyzedFiles: 0,
    };
  }

  // Determine source locale (most keys wins, prefer 'en')
  const keyCountByLocale = new Map<string, number>();
  for (const f of localeFiles) {
    keyCountByLocale.set(f.locale, (keyCountByLocale.get(f.locale) ?? 0) + f.keyCount);
  }
  let sourceLocale = 'en';
  if (!keyCountByLocale.has('en')) {
    sourceLocale = [...keyCountByLocale.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'en';
  }

  const groups = groupFilesByModule(localeFiles);
  const locales = [...new Set(localeFiles.map(f => f.locale))];
  const targetLocales = locales.filter(l => l !== sourceLocale);

  // Build per-locale results
  const localeResults: LocaleCoverageResult[] = [];

  for (const locale of [sourceLocale, ...targetLocales]) {
    const fileResults: FileCoverageResult[] = [];
    let totalKeys = 0;
    let translatedKeys = 0;

    for (const [, group] of groups) {
      const sourceFile = group.files.get(sourceLocale);
      const targetFile = group.files.get(locale);

      if (!sourceFile) continue;
      const srcKeys = sourceFile.keys;
      const tgtKeys = targetFile?.keys ?? {};
      const total = Object.keys(srcKeys).length;
      if (total === 0) continue;

      let translated = 0;
      for (const k of Object.keys(srcKeys)) {
        if (tgtKeys[k] && tgtKeys[k].trim()) translated++;
      }

      const missing = total - translated;
      totalKeys += total;
      translatedKeys += translated;

      fileResults.push({
        locale,
        filePath: targetFile?.filePath ?? `[missing]/${group.moduleName}/${locale}.json`,
        moduleName: group.moduleName,
        totalKeys: total,
        translatedKeys: translated,
        missingKeys: missing,
        coverage: total > 0 ? Math.round((translated / total) * 1000) / 10 : 0,
      });
    }

    const coverage = totalKeys > 0 ? Math.round((translatedKeys / totalKeys) * 1000) / 10 : 0;

    // Quality score: source locale is always 10
    let qualityScore = locale === sourceLocale ? 10 : 0;
    if (locale !== sourceLocale && lingoApiKey) {
      // Aggregate source and target keys for sampling
      const allSourceKeys: Record<string, string> = {};
      const allTargetKeys: Record<string, string> = {};
      for (const [, group] of groups) {
        Object.assign(allSourceKeys, group.files.get(sourceLocale)?.keys ?? {});
        Object.assign(allTargetKeys, group.files.get(locale)?.keys ?? {});
      }
      const scored = await scoreQualityWithLingo(allSourceKeys, allTargetKeys, locale, lingoApiKey);
      qualityScore = scored ?? Math.max(5, Math.min(9.5, 5 + (coverage / 100) * 4.5));
    } else if (locale !== sourceLocale) {
      // Fallback: coverage-based estimate
      qualityScore = Math.max(5, Math.min(9.5, 5 + (coverage / 100) * 4.5));
    }

    localeResults.push({
      locale, totalKeys, translatedKeys,
      missingKeys: totalKeys - translatedKeys,
      coverage, qualityScore, fileResults,
    });
  }

  // Overall metrics (exclude source locale from averages)
  const targetResults = localeResults.filter(r => r.locale !== sourceLocale);
  const totalMissing  = targetResults.reduce((s, r) => s + r.missingKeys, 0);
  const srcTotalKeys  = localeResults.find(r => r.locale === sourceLocale)?.totalKeys ?? 0;

  const overallCoverage = targetResults.length > 0
    ? Math.round(targetResults.reduce((s, r) => s + r.coverage, 0) / targetResults.length * 10) / 10
    : 100;

  const overallQuality = targetResults.length > 0
    ? Math.round(targetResults.reduce((s, r) => s + r.qualityScore, 0) / targetResults.length * 10) / 10
    : 10;

  return {
    overallCoverage,
    qualityScore: overallQuality,
    totalKeys: srcTotalKeys,
    missingKeys: totalMissing,
    locales: localeResults,
    sourceLocale,
    analyzedFiles: localeFiles.length,
  };
}
