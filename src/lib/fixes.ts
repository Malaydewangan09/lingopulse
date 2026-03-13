import {
  fetchI18nFiles,
  createBranchFromBase,
  createPullRequest,
  upsertRepoFile,
} from '@/lib/github';
import {
  groupFilesByModule,
  inferSourceLocaleFromFiles,
  parseLocaleFiles,
  replaceLocaleInPath,
  serializeLocaleFile,
} from '@/lib/analyze';
import type { DraftFixResult } from '@/lib/types';

interface DraftFixInput {
  fullName: string;
  baseBranch: string;
  githubToken: string;
  lingoApiKey?: string | null;
}

interface PendingFileUpdate {
  locale: string;
  path: string;
  moduleName: string;
  format: 'json' | 'yaml';
  wrappedByLocale: boolean;
  keys: Record<string, string>;
  missingKeys: number;
}

interface PendingTranslation {
  filePath: string;
  key: string;
  sourceText: string;
}

function deriveTargetPath(sourcePath: string, sourceLocale: string, targetLocale: string): string {
  const replaced = replaceLocaleInPath(sourcePath, sourceLocale, targetLocale);
  if (replaced !== sourcePath) return replaced;

  const parts = sourcePath.split('/');
  const filename = parts.pop() ?? sourcePath;
  const extMatch = filename.match(/\.(json|yaml|yml)$/);
  const ext = extMatch?.[0] ?? '.json';
  const stem = filename.slice(0, -ext.length);
  return [...parts, `${stem}.${targetLocale}${ext}`].join('/');
}

async function translateBatch(
  targetLocale: string,
  sourceLocale: string,
  entries: PendingTranslation[],
  lingoApiKey?: string | null,
): Promise<{ values: string[]; usedLingo: boolean }> {
  const fallback = entries.map(entry => entry.sourceText);
  if (!lingoApiKey || entries.length === 0) {
    return { values: fallback, usedLingo: false };
  }

  try {
    const { LingoDotDevEngine } = await import('@lingo.dev/_sdk');
    const engine = new LingoDotDevEngine({ apiKey: lingoApiKey });
    const payload = Object.fromEntries(entries.map((entry, index) => [`item_${index}`, entry.sourceText]));
    const translated = await engine.localizeObject(payload, { sourceLocale, targetLocale }) as Record<string, string>;

    return {
      values: entries.map((_, index) => translated[`item_${index}`] ?? fallback[index]),
      usedLingo: true,
    };
  } catch {
    return { values: fallback, usedLingo: false };
  }
}

export async function createDraftFixPullRequest(input: DraftFixInput): Promise<DraftFixResult> {
  const files = await fetchI18nFiles(input.fullName, input.baseBranch, input.githubToken);
  const localeFiles = parseLocaleFiles(files);
  if (localeFiles.length === 0) {
    throw new Error('No i18n files found in this repo');
  }

  const sourceLocale = inferSourceLocaleFromFiles(localeFiles);
  const localeSet = new Set(localeFiles.map(file => file.locale));
  const targetLocales = [...localeSet].filter(locale => locale !== sourceLocale).sort((a, b) => a.localeCompare(b));
  if (targetLocales.length === 0) {
    throw new Error('No target locales available for draft fixes');
  }

  const grouped = groupFilesByModule(localeFiles);
  const updates = new Map<string, PendingFileUpdate>();
  let usedLingo = false;

  for (const locale of targetLocales) {
    const localeTranslations: PendingTranslation[] = [];

    for (const [, group] of grouped) {
      const sourceFile = group.files.get(sourceLocale);
      if (!sourceFile) continue;

      const targetFile = group.files.get(locale);
      const filePath = targetFile?.filePath ?? deriveTargetPath(sourceFile.filePath, sourceLocale, locale);
      const update = updates.get(filePath) ?? {
        locale,
        path: filePath,
        moduleName: group.moduleName,
        format: targetFile?.format ?? sourceFile.format,
        wrappedByLocale: targetFile?.wrappedByLocale ?? sourceFile.wrappedByLocale,
        keys: { ...(targetFile?.keys ?? {}) },
        missingKeys: 0,
      };

      for (const [key, sourceText] of Object.entries(sourceFile.keys)) {
        if (update.keys[key]?.trim()) continue;
        localeTranslations.push({
          filePath,
          key,
          sourceText,
        });
      }

      updates.set(filePath, update);
    }

    if (localeTranslations.length === 0) continue;

    const translated = await translateBatch(locale, sourceLocale, localeTranslations, input.lingoApiKey);
    usedLingo = usedLingo || translated.usedLingo;

    localeTranslations.forEach((entry, index) => {
      const update = updates.get(entry.filePath);
      if (!update) return;
      if (update.keys[entry.key]?.trim()) return;
      update.keys[entry.key] = translated.values[index];
      update.missingKeys += 1;
    });
  }

  const changedFiles = [...updates.values()].filter(update => update.missingKeys > 0);
  if (changedFiles.length === 0) {
    throw new Error('No missing keys found for a draft fix PR');
  }

  const branch = `lingopulse/draft-fixes-${Date.now().toString(36)}`;
  await createBranchFromBase(input.fullName, input.baseBranch, branch, input.githubToken);

  for (const update of changedFiles) {
    const content = serializeLocaleFile(update.keys, update.locale, update.format, update.wrappedByLocale);
    await upsertRepoFile(
      input.fullName,
      update.path,
      content,
      branch,
      `chore(i18n): draft ${update.locale} fixes for ${update.moduleName}`,
      input.githubToken,
    );
  }

  const localesTouched = [...new Set(changedFiles.map(file => file.locale))].sort((a, b) => a.localeCompare(b));
  const keysFilled = changedFiles.reduce((sum, file) => sum + file.missingKeys, 0);
  const mode: DraftFixResult['mode'] = usedLingo ? 'lingo' : 'source';
  const prBody = [
    '## Lingo Pulse Draft Fixes',
    '',
    `- Filled ${keysFilled} missing keys across ${changedFiles.length} files`,
    `- Locales: ${localesTouched.map(locale => `\`${locale}\``).join(', ')}`,
    `- Source locale: \`${sourceLocale}\``,
    `- Generation mode: ${mode === 'lingo' ? 'Lingo.dev translation draft' : 'source-copy fallback'}`,
    '',
    'Review translations before merge. This PR is generated from the latest repository scan.',
  ].join('\n');

  const pr = await createPullRequest(input.fullName, input.githubToken, {
    title: 'chore(i18n): draft missing translation fixes',
    head: branch,
    base: input.baseBranch,
    body: prBody,
    draft: true,
  });

  return {
    prUrl: pr.html_url,
    branch,
    filesUpdated: changedFiles.length,
    localesTouched,
    keysFilled,
    mode,
  };
}
