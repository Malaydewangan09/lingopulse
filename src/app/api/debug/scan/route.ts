import { NextRequest, NextResponse } from 'next/server';
import { fetchI18nFiles } from '@/lib/github';
import { analyzeRepo } from '@/lib/analyze';
import { getAuthenticatedUser } from '@/lib/auth';

// GET /api/debug/scan?repo=owner/repo&token=ghp_xxx
// Quick dry-run: shows what i18n files are found and their coverage
export async function GET(req: NextRequest) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const repo  = searchParams.get('repo');
  const token = searchParams.get('token');
  const branch = searchParams.get('branch') ?? 'main';

  if (!repo || !token) {
    return NextResponse.json({ error: 'repo and token query params required' }, { status: 400 });
  }

  try {
    const files = await fetchI18nFiles(repo, branch, token);

    if (files.length === 0) {
      return NextResponse.json({
        found: 0,
        message: 'No i18n files detected. Make sure your repo has JSON/YAML files under locales/, i18n/, translations/, or messages/ directories.',
        files: [],
      });
    }

    const result = await analyzeRepo(files);

    return NextResponse.json({
      found: files.length,
      sourceLocale: result.sourceLocale,
      localesDetected: result.locales.map(l => l.locale),
      overallCoverage: result.overallCoverage,
      totalKeys: result.totalKeys,
      missingKeys: result.missingKeys,
      files: files.map(f => ({
        path: f.path,
        size: f.content.length,
      })),
      localeBreakdown: result.locales.map(l => ({
        locale: l.locale,
        coverage: l.coverage,
        totalKeys: l.totalKeys,
        missingKeys: l.missingKeys,
      })),
    });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}
