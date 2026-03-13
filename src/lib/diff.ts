import type {
  AnalysisResult,
  FileCoverageResult,
} from '@/lib/analyze';
import type { ScanDiffSignal, ScanDiffSummary } from '@/lib/types';

interface NumericRunLike {
  overall_coverage?: number | string | null;
  quality_score?: number | string | null;
  missing_keys?: number | string | null;
}

interface LocaleMetricLike {
  locale: string;
  coverage?: number | string | null;
  quality_score?: number | string | null;
  missing_keys?: number | string | null;
}

interface FileMetricLike {
  locale: string;
  file_path: string;
  coverage?: number | string | null;
  missing_keys?: number | string | null;
}

interface LocaleSnapshot {
  coverage: number;
  qualityScore: number;
  missingKeys: number;
}

interface ModuleSnapshot {
  coverage: number;
  missingKeys: number;
}

export interface AnalysisSnapshot {
  overallCoverage: number;
  qualityScore: number;
  missingKeys: number;
  locales: Map<string, LocaleSnapshot>;
  modules: Map<string, ModuleSnapshot>;
}

function toNumber(value: unknown): number {
  const next = typeof value === 'number' ? value : Number(value ?? 0);
  return Number.isFinite(next) ? next : 0;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

const LOCALE_FILENAME_RE = /^[a-z]{2}(?:[-_][A-Za-z]{2,4})?$/;

export function deriveModuleName(filePath: string): string {
  const parts = filePath.split('/').filter(Boolean);
  if (filePath.startsWith('[missing]/') && parts.length >= 2) {
    return parts[1];
  }

  const filename = parts[parts.length - 1]?.replace(/\.(json|yaml|yml)$/, '') ?? filePath;
  if (LOCALE_FILENAME_RE.test(filename)) {
    return parts[parts.length - 2] ?? 'messages';
  }

  return filename;
}

function buildModuleSnapshotFromFileResults(fileResults: FileCoverageResult[]): Map<string, ModuleSnapshot> {
  const modules = new Map<string, { coverageSum: number; cells: number; missingKeys: number }>();

  for (const fileResult of fileResults) {
    const current = modules.get(fileResult.moduleName) ?? { coverageSum: 0, cells: 0, missingKeys: 0 };
    current.coverageSum += fileResult.coverage;
    current.cells += 1;
    current.missingKeys += fileResult.missingKeys;
    modules.set(fileResult.moduleName, current);
  }

  return new Map(
    [...modules.entries()].map(([name, stats]) => [
      name,
      {
        coverage: stats.cells > 0 ? round1(stats.coverageSum / stats.cells) : 0,
        missingKeys: stats.missingKeys,
      },
    ]),
  );
}

function buildModuleSnapshotFromMetrics(fileMetrics: FileMetricLike[]): Map<string, ModuleSnapshot> {
  const modules = new Map<string, { coverageSum: number; cells: number; missingKeys: number }>();

  for (const fileMetric of fileMetrics) {
    const moduleName = deriveModuleName(fileMetric.file_path);
    const current = modules.get(moduleName) ?? { coverageSum: 0, cells: 0, missingKeys: 0 };
    current.coverageSum += toNumber(fileMetric.coverage);
    current.cells += 1;
    current.missingKeys += Math.round(toNumber(fileMetric.missing_keys));
    modules.set(moduleName, current);
  }

  return new Map(
    [...modules.entries()].map(([name, stats]) => [
      name,
      {
        coverage: stats.cells > 0 ? round1(stats.coverageSum / stats.cells) : 0,
        missingKeys: stats.missingKeys,
      },
    ]),
  );
}

export function snapshotFromAnalysisResult(result: AnalysisResult): AnalysisSnapshot {
  const localeSnapshot = new Map<string, LocaleSnapshot>();
  const allFileResults = result.locales.flatMap(locale => locale.fileResults);

  for (const locale of result.locales) {
    localeSnapshot.set(locale.locale, {
      coverage: locale.coverage,
      qualityScore: locale.qualityScore,
      missingKeys: locale.missingKeys,
    });
  }

  return {
    overallCoverage: result.overallCoverage,
    qualityScore: result.qualityScore,
    missingKeys: result.missingKeys,
    locales: localeSnapshot,
    modules: buildModuleSnapshotFromFileResults(allFileResults),
  };
}

export function snapshotFromStoredMetrics(
  run: NumericRunLike,
  locales: LocaleMetricLike[],
  fileMetrics: FileMetricLike[],
): AnalysisSnapshot {
  const localeSnapshot = new Map<string, LocaleSnapshot>();

  for (const locale of locales) {
    localeSnapshot.set(locale.locale, {
      coverage: round1(toNumber(locale.coverage)),
      qualityScore: round1(toNumber(locale.quality_score)),
      missingKeys: Math.round(toNumber(locale.missing_keys)),
    });
  }

  return {
    overallCoverage: round1(toNumber(run.overall_coverage)),
    qualityScore: round1(toNumber(run.quality_score)),
    missingKeys: Math.round(toNumber(run.missing_keys)),
    locales: localeSnapshot,
    modules: buildModuleSnapshotFromMetrics(fileMetrics),
  };
}

function compareLocaleSignals(current: AnalysisSnapshot, previous: AnalysisSnapshot | null) {
  const allLocales = new Set<string>([
    ...current.locales.keys(),
    ...(previous?.locales.keys() ?? []),
  ]);

  const regressed: ScanDiffSignal[] = [];
  const improved: ScanDiffSignal[] = [];

  for (const locale of allLocales) {
    const currentLocale = current.locales.get(locale);
    const previousLocale = previous?.locales.get(locale);
    if (!currentLocale && !previousLocale) continue;

    const coverageDelta = round1((currentLocale?.coverage ?? 0) - (previousLocale?.coverage ?? 0));
    const qualityDelta = round1((currentLocale?.qualityScore ?? 0) - (previousLocale?.qualityScore ?? 0));
    const missingDelta = Math.round((currentLocale?.missingKeys ?? 0) - (previousLocale?.missingKeys ?? 0));

    if (coverageDelta === 0 && qualityDelta === 0 && missingDelta === 0) continue;

    const signal: ScanDiffSignal = {
      key: locale,
      label: locale,
      coverageDelta,
      qualityDelta,
      missingDelta,
      currentCoverage: currentLocale?.coverage ?? 0,
      currentMissingKeys: currentLocale?.missingKeys ?? 0,
      currentQualityScore: currentLocale?.qualityScore ?? 0,
    };

    if (coverageDelta < 0 || missingDelta > 0 || qualityDelta < 0) {
      regressed.push(signal);
    } else {
      improved.push(signal);
    }
  }

  const severity = (signal: ScanDiffSignal) =>
    signal.missingDelta * 4 + Math.max(0, -signal.coverageDelta) * 3 + Math.max(0, -(signal.qualityDelta ?? 0)) * 4;
  const gain = (signal: ScanDiffSignal) =>
    Math.max(0, -signal.missingDelta) * 4 + Math.max(0, signal.coverageDelta) * 3 + Math.max(0, signal.qualityDelta ?? 0) * 4;

  regressed.sort((a, b) => severity(b) - severity(a) || a.label.localeCompare(b.label));
  improved.sort((a, b) => gain(b) - gain(a) || a.label.localeCompare(b.label));

  return { regressed, improved };
}

function compareModuleSignals(current: AnalysisSnapshot, previous: AnalysisSnapshot | null) {
  const allModules = new Set<string>([
    ...current.modules.keys(),
    ...(previous?.modules.keys() ?? []),
  ]);

  const regressed: ScanDiffSignal[] = [];
  const improved: ScanDiffSignal[] = [];

  for (const moduleName of allModules) {
    const currentModule = current.modules.get(moduleName);
    const previousModule = previous?.modules.get(moduleName);
    if (!currentModule && !previousModule) continue;

    const coverageDelta = round1((currentModule?.coverage ?? 0) - (previousModule?.coverage ?? 0));
    const missingDelta = Math.round((currentModule?.missingKeys ?? 0) - (previousModule?.missingKeys ?? 0));

    if (coverageDelta === 0 && missingDelta === 0) continue;

    const signal: ScanDiffSignal = {
      key: moduleName,
      label: moduleName,
      coverageDelta,
      missingDelta,
      currentCoverage: currentModule?.coverage ?? 0,
      currentMissingKeys: currentModule?.missingKeys ?? 0,
    };

    if (coverageDelta < 0 || missingDelta > 0) {
      regressed.push(signal);
    } else {
      improved.push(signal);
    }
  }

  const severity = (signal: ScanDiffSignal) => signal.missingDelta * 4 + Math.max(0, -signal.coverageDelta) * 3;
  const gain = (signal: ScanDiffSignal) => Math.max(0, -signal.missingDelta) * 4 + Math.max(0, signal.coverageDelta) * 3;

  regressed.sort((a, b) => severity(b) - severity(a) || a.label.localeCompare(b.label));
  improved.sort((a, b) => gain(b) - gain(a) || a.label.localeCompare(b.label));

  return { regressed, improved };
}

function determineStatus(current: AnalysisSnapshot, coverageDelta: number, qualityDelta: number, missingKeysDelta: number) {
  if (
    current.overallCoverage < 70 ||
    current.missingKeys > 200 ||
    coverageDelta <= -2 ||
    qualityDelta <= -0.7 ||
    missingKeysDelta >= 12
  ) {
    return 'blocked' as const;
  }

  if (
    current.overallCoverage < 88 ||
    current.missingKeys > 0 ||
    coverageDelta < 0 ||
    qualityDelta < 0 ||
    missingKeysDelta > 0
  ) {
    return 'watch' as const;
  }

  return 'safe' as const;
}

function buildHeadline(
  status: ScanDiffSummary['status'],
  hasBaseline: boolean,
  missingKeysDelta: number,
  regressedModules: ScanDiffSignal[],
  improvedModules: ScanDiffSignal[],
): string {
  if (!hasBaseline) {
    return 'First successful scan captured';
  }

  if (status === 'safe') {
    if (missingKeysDelta < 0) {
      return `${Math.abs(missingKeysDelta)} missing keys recovered since the last run`;
    }
    return 'No new localization regressions detected';
  }

  if (regressedModules[0]) {
    return `${regressedModules[0].label} needs attention`;
  }

  if (improvedModules[0] && status === 'watch') {
    return `${improvedModules[0].label} recovered, but more gaps remain`;
  }

  return status === 'blocked' ? 'Release risk increased in the latest scan' : 'Translation drift detected in the latest scan';
}

export function computeScanDiff(current: AnalysisSnapshot, previous: AnalysisSnapshot | null): ScanDiffSummary {
  const coverageDelta = previous ? round1(current.overallCoverage - previous.overallCoverage) : 0;
  const qualityDelta = previous ? round1(current.qualityScore - previous.qualityScore) : 0;
  const missingKeysDelta = previous ? Math.round(current.missingKeys - previous.missingKeys) : 0;
  const { regressed: regressedLocales, improved: improvedLocales } = compareLocaleSignals(current, previous);
  const { regressed: regressedModules, improved: improvedModules } = compareModuleSignals(current, previous);

  const status = previous
    ? determineStatus(current, coverageDelta, qualityDelta, missingKeysDelta)
    : current.missingKeys === 0
      ? 'safe'
      : 'watch';
  const headline = buildHeadline(status, !!previous, missingKeysDelta, regressedModules, improvedModules);

  let summary = `${current.missingKeys} missing keys at ${current.overallCoverage.toFixed(1)}% coverage`;
  if (previous) {
    summary = `${summary} · ${coverageDelta >= 0 ? '+' : ''}${coverageDelta.toFixed(1)} pts coverage · ${qualityDelta >= 0 ? '+' : ''}${qualityDelta.toFixed(1)} quality · ${missingKeysDelta >= 0 ? '+' : ''}${missingKeysDelta} keys`;
  } else {
    summary = `${summary} · ${current.locales.size} locales tracked in the first baseline`;
  }

  const topModule = regressedModules[0] ?? improvedModules[0];
  const topLocale = regressedLocales[0] ?? improvedLocales[0];
  const recommendation = topModule
    ? `Start with ${topModule.label}: ${topModule.currentMissingKeys} missing keys at ${topModule.currentCoverage.toFixed(1)}% coverage.`
    : topLocale
      ? `Review ${topLocale.label}: ${topLocale.currentMissingKeys} missing keys at ${topLocale.currentCoverage.toFixed(1)}% coverage.`
      : 'No immediate follow-up required from the latest scan.';

  return {
    hasBaseline: !!previous,
    status,
    headline,
    summary,
    recommendation,
    coverageDelta,
    qualityDelta,
    missingKeysDelta,
    regressedLocales: regressedLocales.slice(0, 3),
    improvedLocales: improvedLocales.slice(0, 3),
    regressedModules: regressedModules.slice(0, 3),
    improvedModules: improvedModules.slice(0, 3),
  };
}

export function buildPrCommentBody(repoName: string, diff: ScanDiffSummary): string {
  const marker = '<!-- lingopulse:pr-summary -->';
  const statusLabel = diff.status === 'safe' ? 'passing' : diff.status === 'watch' ? 'watch' : 'blocked';
  const lines = [
    marker,
    `## Lingo Pulse PR Check: ${statusLabel}`,
    '',
    `**${repoName}**`,
    '',
    `- ${diff.summary}`,
    `- ${diff.recommendation}`,
  ];

  if (diff.regressedModules.length > 0) {
    lines.push('', '### Module regressions');
    diff.regressedModules.forEach(signal => {
      lines.push(`- \`${signal.label}\` · ${signal.currentMissingKeys} missing keys · ${signal.coverageDelta.toFixed(1)} pts coverage`);
    });
  }

  if (diff.regressedLocales.length > 0) {
    lines.push('', '### Locale regressions');
    diff.regressedLocales.forEach(signal => {
      lines.push(`- \`${signal.label}\` · ${signal.currentMissingKeys} missing keys · ${signal.coverageDelta.toFixed(1)} pts coverage`);
    });
  }

  if (diff.improvedModules.length > 0) {
    lines.push('', '### Recoveries');
    diff.improvedModules.forEach(signal => {
      lines.push(`- \`${signal.label}\` · ${signal.currentMissingKeys} missing keys remaining · +${signal.coverageDelta.toFixed(1)} pts`);
    });
  }

  lines.push('', '_Generated by Lingo Pulse_');
  return lines.join('\n');
}
