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
  format: 'json' | 'yaml';
  wrappedByLocale: boolean;
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

interface ParsedLocalePayload {
  data: Record<string, unknown>;
  format: 'json' | 'yaml';
  wrappedByLocale: boolean;
}

function parseFileContent(content: string, path: string): ParsedLocalePayload | null {
  try {
    let parsed: Record<string, unknown> | null = null;
    let format: 'json' | 'yaml' = 'json';
    if (path.endsWith('.json')) parsed = JSON.parse(content);
    else if (path.endsWith('.yaml') || path.endsWith('.yml')) {
      parsed = yaml.load(content) as Record<string, unknown>;
      format = 'yaml';
    }
    if (!parsed || typeof parsed !== 'object') return null;

    // Unwrap locale-keyed format: {"en": {...}} or {"de": {...}}
    // Kestra and some other projects wrap all translations under the locale code
    const keys = Object.keys(parsed);
    if (keys.length === 1 && LOCALE_CODE_RE.test(keys[0]) && typeof parsed[keys[0]] === 'object') {
      return {
        data: parsed[keys[0]] as Record<string, unknown>,
        format,
        wrappedByLocale: true,
      };
    }

    return {
      data: parsed,
      format,
      wrappedByLocale: false,
    };
  } catch {}
  return null;
}

/** Recursively flatten nested object into dot-notation keys */
export function flattenKeys(obj: Record<string, unknown>, prefix = ''): Record<string, string> {
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

export function unflattenKeys(keys: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [path, value] of Object.entries(keys)) {
    const parts = path.split('.');
    let cursor: Record<string, unknown> = result;

    parts.forEach((part, index) => {
      if (index === parts.length - 1) {
        cursor[part] = value;
        return;
      }

      const next = cursor[part];
      if (!next || typeof next !== 'object' || Array.isArray(next)) {
        cursor[part] = {};
      }
      cursor = cursor[part] as Record<string, unknown>;
    });
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

export function replaceLocaleInPath(path: string, fromLocale: string, toLocale: string): string {
  const normalizedFrom = fromLocale.replace('-', '_');
  const normalizedTo = toLocale.replace('-', '_');

  let next = path;
  next = next.replace(new RegExp(`/(?:${fromLocale}|${normalizedFrom})(?=/)`, 'g'), `/${toLocale}`);
  next = next.replace(new RegExp(`(^|[._-])(?:${fromLocale}|${normalizedFrom})(?=\\.(json|yaml|yml)$)`, 'g'), `$1${toLocale}`);
  next = next.replace(new RegExp(`/(?:${fromLocale}|${normalizedFrom})(?=\\.(json|yaml|yml)$)`, 'g'), `/${toLocale}`);

  return next.replace(new RegExp(normalizedTo, 'g'), toLocale);
}

export function serializeLocaleFile(
  keys: Record<string, string>,
  locale: string,
  format: 'json' | 'yaml',
  wrappedByLocale: boolean,
): string {
  const nested = unflattenKeys(keys);
  const payload = wrappedByLocale ? { [locale]: nested } : nested;

  if (format === 'yaml') {
    return yaml.dump(payload, {
      lineWidth: 120,
      noRefs: true,
      sortKeys: true,
    });
  }

  return `${JSON.stringify(payload, null, 2)}\n`;
}

export function parseLocaleFiles(files: GithubFile[]): LocaleFile[] {
  const localeFiles: LocaleFile[] = [];

  for (const file of files) {
    const parsed = parseFileContent(file.content, file.path);
    if (!parsed) continue;

    const locale = inferLocale(file.path);
    if (!locale) continue;

    const keys = flattenKeys(parsed.data);
    if (Object.keys(keys).length === 0) continue;

    localeFiles.push({
      locale,
      filePath: file.path,
      moduleName: inferModuleName(file.path),
      keys,
      keyCount: Object.keys(keys).length,
      format: parsed.format,
      wrappedByLocale: parsed.wrappedByLocale,
    });
  }

  return localeFiles;
}

export function inferSourceLocaleFromFiles(localeFiles: LocaleFile[]): string {
  const keyCountByLocale = new Map<string, number>();
  for (const file of localeFiles) {
    keyCountByLocale.set(file.locale, (keyCountByLocale.get(file.locale) ?? 0) + file.keyCount);
  }

  if (keyCountByLocale.has('en')) return 'en';

  return [...keyCountByLocale.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'en';
}

export interface LocaleFileGroup {
  moduleName: string;
  files: Map<string, LocaleFile>;
}

// ─── File grouping ───────────────────────────────────────────────────────────

export function groupFilesByModule(localeFiles: LocaleFile[]): Map<string, LocaleFileGroup> {
  const groups = new Map<string, LocaleFileGroup>();
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
  const localeFiles = parseLocaleFiles(files);

  if (localeFiles.length === 0) {
    return {
      overallCoverage: 0, qualityScore: 0, totalKeys: 0, missingKeys: 0,
      locales: [], sourceLocale: 'en', analyzedFiles: 0,
    };
  }

  // Determine source locale (most keys wins, prefer 'en')
  const sourceLocale = inferSourceLocaleFromFiles(localeFiles);

  const groups = groupFilesByModule(localeFiles);
  const locales = [...new Set(localeFiles.map(f => f.locale))];
  const targetLocales = locales.filter(l => l !== sourceLocale);

  // Build per-locale results (without quality scoring first)
  const localeResults: LocaleCoverageResult[] = [];
  const localeKeysMap: Record<string, { source: Record<string, string>; target: Record<string, string> }> = {};

  for (const locale of [sourceLocale, ...targetLocales]) {
    const fileResults: FileCoverageResult[] = [];
    let totalKeys = 0;
    let translatedKeys = 0;

    // Aggregate keys for quality scoring
    const allSourceKeys: Record<string, string> = {};
    const allTargetKeys: Record<string, string> = {};

    for (const [, group] of groups) {
      const sourceFile = group.files.get(sourceLocale);
      const targetFile = group.files.get(locale);

      if (!sourceFile) continue;
      Object.assign(allSourceKeys, sourceFile.keys);
      if (targetFile) Object.assign(allTargetKeys, targetFile.keys);

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
    const qualityScore = locale === sourceLocale ? 10 : 0;

    localeKeysMap[locale] = { source: allSourceKeys, target: allTargetKeys };
    localeResults.push({
      locale, totalKeys, translatedKeys,
      missingKeys: totalKeys - translatedKeys,
      coverage, qualityScore, fileResults,
    });
  }

  // Score quality in parallel for all target locales
  if (lingoApiKey) {
    const scoringPromises = localeResults
      .filter(r => r.locale !== sourceLocale)
      .map(async (result) => {
        const keys = localeKeysMap[result.locale];
        if (!keys) return;
        const scored = await scoreQualityWithLingo(keys.source, keys.target, result.locale, lingoApiKey);
        result.qualityScore = scored ?? Math.max(5, Math.min(9.5, 5 + (result.coverage / 100) * 4.5));
      });
    await Promise.all(scoringPromises);
  } else {
    // Fallback: coverage-based estimate
    for (const result of localeResults) {
      if (result.locale !== sourceLocale) {
        result.qualityScore = Math.max(5, Math.min(9.5, 5 + (result.coverage / 100) * 4.5));
      }
    }
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
