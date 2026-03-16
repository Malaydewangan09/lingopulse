import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';

export const maxDuration = 60; // extend Vercel timeout to 60s (Pro) — prevents analysis being killed
import { supabaseAdmin } from '@/lib/supabase';
import { createOrUpdatePullRequestComment, getRepoInfo, registerWebhook } from '@/lib/github';
import { fetchI18nFiles } from '@/lib/github';
import { analyzeRepo, getLocaleMetadata } from '@/lib/analyze';
import { buildPrCommentBody, computeScanDiff, snapshotFromAnalysisResult, snapshotFromStoredMetrics } from '@/lib/diff';
import { validateLingoApiKey } from '@/lib/lingo';
import { derivePrCheckStatus } from '@/lib/pr-checks';
import crypto from 'crypto';

interface ConnectRepoRequest {
  repoUrl?: string;
  githubToken?: string;
  lingoApiKey?: string | null;
}

interface ExistingRepoRow {
  id: string;
}

interface GithubRepoInfo {
  default_branch?: string;
}

// GET /api/repos  —  list all connected repos
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = supabaseAdmin();
    const { data, error } = await db
      .from('repos')
      .select('*')
      .eq('owner_user_id', user.id)
      .order('created_at', { ascending: false });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

// POST /api/repos  —  connect a new repo
export async function POST(req: NextRequest) {
  try {
  const body = await req.json() as ConnectRepoRequest;
  const { repoUrl, githubToken, lingoApiKey } = body;
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!repoUrl || !githubToken || !lingoApiKey?.trim()) {
    return NextResponse.json({ error: 'repoUrl, githubToken, and lingoApiKey are required' }, { status: 400 });
  }

  // Parse "owner/repo" or full GitHub URL
  const match = repoUrl.replace('https://github.com/', '').match(/^([\w.-]+)\/([\w.-]+)/);
  if (!match) return NextResponse.json({ error: 'Invalid repo URL' }, { status: 400 });
  const [, owner, name] = match;
  const fullName = `${owner}/${name}`;

  const db = supabaseAdmin();

  try {
    await validateLingoApiKey(lingoApiKey.trim());
  } catch (error: unknown) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Invalid Lingo.dev API key',
    }, { status: 422 });
  }

  // Check if already connected
  const { data: existing } = await db
    .from('repos')
    .select('id')
    .eq('full_name', fullName)
    .eq('owner_user_id', user.id)
    .single<ExistingRepoRow>();
  if (existing) {
    await db
      .from('repos')
      .update({
        github_token: githubToken,
        lingo_api_key: lingoApiKey.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .eq('owner_user_id', user.id);

    return NextResponse.json({ error: 'Repo already connected', id: existing.id, credentialsUpdated: true }, { status: 409 });
  }

  // Validate token + get repo info
  let repoInfo: GithubRepoInfo;
  try {
    repoInfo = await getRepoInfo(fullName, githubToken);
  } catch (error: unknown) {
    return NextResponse.json({
      error: `GitHub error: ${error instanceof Error ? error.message : 'unknown error'}`,
    }, { status: 422 });
  }

  const webhookSecret = crypto.randomBytes(20).toString('hex');
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  const webhookUrl = `${appUrl}/api/webhooks/github`;
  const sharedWebhookSecret = process.env.GITHUB_WEBHOOK_SECRET ?? webhookSecret;

  // Register webhook (best-effort — might fail on public repos without write access)
  let webhookId: number | null = null;
  try {
    webhookId = await registerWebhook(fullName, githubToken, webhookUrl, sharedWebhookSecret);
  } catch {
    // Continue without webhook; user can add manually
  }

  // Insert repo
  const { data: repo, error: insertErr } = await db.from('repos').insert({
    full_name:      fullName,
    owner,
    name,
    owner_user_id:  user.id,
    default_branch: repoInfo.default_branch ?? 'main',
    github_token:   githubToken,
    lingo_api_key:  lingoApiKey.trim(),
    webhook_id:     webhookId,
    webhook_secret: sharedWebhookSecret,
  }).select().single();

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  // Wait for analysis to complete before returning - so dashboard loads directly
  await analyzeAndStore(repo.id, fullName, repo.default_branch, githubToken, lingoApiKey.trim(), 'manual', db)
    .catch(console.error);

  return NextResponse.json({ id: repo.id, fullName, webhookRegistered: !!webhookId }, { status: 201 });
  } catch (error: unknown) {
    console.error('POST /api/repos error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}

// ─── Shared analysis + storage logic (also used by webhook handler) ──────────

export async function analyzeAndStore(
  repoId: string,
  fullName: string,
  branch: string,
  githubToken: string,
  lingoApiKey: string | null,
  triggeredBy: string,
  db: ReturnType<typeof supabaseAdmin>,
  commitSha?: string,
  author?: string,
  prNumber?: number,
  prTitle?: string,
) {
  // Fetch i18n files
  const files = await fetchI18nFiles(fullName, branch, githubToken);
  if (files.length === 0) return null;

  // Analyze
  const result = await analyzeRepo(files, lingoApiKey ?? undefined);

  // Get previous run for diff baseline
  const baselineRunQuery = db
    .from('analysis_runs')
    .select('id, overall_coverage, quality_score, missing_keys, triggered_by')
    .eq('repo_id', repoId)
    .order('created_at', { ascending: false })
    .limit(1);

  const { data: scopedPrevRuns } = triggeredBy === 'pr'
    ? await baselineRunQuery.neq('triggered_by', 'pr')
    : await baselineRunQuery;

  let prevRun = scopedPrevRuns?.[0] ?? null;

  if (!prevRun && triggeredBy === 'pr') {
    const { data: fallbackPrevRuns } = await db
      .from('analysis_runs')
      .select('id, overall_coverage, quality_score, missing_keys, triggered_by')
      .eq('repo_id', repoId)
      .order('created_at', { ascending: false })
      .limit(1);
    prevRun = fallbackPrevRuns?.[0] ?? null;
  }

  const previousLocales = prevRun
    ? (await db.from('locale_metrics').select('locale, coverage, quality_score, missing_keys').eq('run_id', prevRun.id)).data ?? []
    : [];
  const previousFileMetrics = prevRun
    ? (await db.from('file_metrics').select('locale, file_path, coverage, missing_keys').eq('run_id', prevRun.id)).data ?? []
    : [];

  const scanDiff = computeScanDiff(
    snapshotFromAnalysisResult(result),
    prevRun ? snapshotFromStoredMetrics(prevRun, previousLocales, previousFileMetrics) : null,
  );
  const coverageDelta = scanDiff.coverageDelta;

  // Insert run
  const { data: run, error: runErr } = await db.from('analysis_runs').insert({
    repo_id:          repoId,
    branch,
    commit_sha:       commitSha ?? null,
    triggered_by:     triggeredBy,
    overall_coverage: result.overallCoverage,
    quality_score:    result.qualityScore,
    total_keys:       result.totalKeys,
    missing_keys:     result.missingKeys,
    active_locales:   result.locales.filter(l => l.coverage >= 50).length,
    total_locales:    result.locales.length,
  }).select().single();

  if (runErr || !run) return null;

  // Insert locale metrics
  if (result.locales.length > 0) {
    await db.from('locale_metrics').insert(
      result.locales.map(l => {
        const meta = getLocaleMetadata(l.locale);
        return {
          run_id:          run.id,
          locale:          l.locale,
          flag:            meta.flag,
          locale_name:     meta.name,
          coverage:        l.coverage,
          quality_score:   l.qualityScore,
          total_keys:      l.totalKeys,
          translated_keys: l.translatedKeys,
          missing_keys:    l.missingKeys,
        };
      })
    );
  }

  // Insert file metrics
  const allFileResults = result.locales.flatMap(l => l.fileResults);
  if (allFileResults.length > 0) {
    await db.from('file_metrics').insert(
      allFileResults.map(f => ({
        run_id:       run.id,
        locale:       f.locale,
        file_path:    f.filePath,
        coverage:     f.coverage,
        total_keys:   f.totalKeys,
        missing_keys: f.missingKeys,
      }))
    );
  }

  // Insert activity event
  const affectedLocales = result.locales
    .filter(l => l.locale !== result.sourceLocale && l.missingKeys > 0)
    .map(l => l.locale);

  const eventType = triggeredBy === 'pr' ? 'pr_opened'
    : scanDiff.status === 'blocked' ? 'regression'
    : triggeredBy === 'push' ? 'push'
    : 'analysis';

  // Only log manual analyses once (skip duplicates within 10 min)
  if (triggeredBy === 'manual') {
    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recent } = await db
      .from('activity_events')
      .select('id')
      .eq('repo_id', repoId)
      .eq('type', 'analysis')
      .gte('created_at', tenMinAgo)
      .limit(1);
    if (recent && recent.length > 0) {
      // Skip creating duplicate event — just update the run
      await db.from('repos').update({ updated_at: new Date().toISOString() }).eq('id', repoId);
      return { run, result, coverageDelta, scanDiff };
    }
  }

  await db.from('activity_events').insert({
    repo_id:          repoId,
    type:             eventType,
    branch,
    commit_sha:       commitSha ?? null,
    author:           author ?? 'lingo-bot',
    message:          commitSha
      ? `Push on ${branch} · ${scanDiff.headline}`
      : triggeredBy === 'manual'
      ? `Manual analysis · ${result.locales.length} locales · ${result.missingKeys} missing keys`
      : triggeredBy === 'pr'
      ? `PR #${prNumber ?? '—'} · ${scanDiff.headline}`
      : `Scheduled analysis · ${scanDiff.headline}`,
    coverage_delta:   coverageDelta,
    locales_affected: affectedLocales.slice(0, 8),
  });

  // Upsert PR check
  if (prNumber && triggeredBy === 'pr') {
    const coverageBefore = prevRun?.overall_coverage ?? result.overallCoverage;
    const status = derivePrCheckStatus({
      coverageBefore,
      coverageAfter: result.overallCoverage,
      missingKeys: result.missingKeys,
    });

    await db.from('pr_checks').upsert({
      repo_id:         repoId,
      pr_number:       prNumber,
      pr_title:        prTitle ?? '',
      author:          author ?? '',
      branch,
      status,
      coverage_before: coverageBefore,
      coverage_after:  result.overallCoverage,
      missing_keys:    result.missingKeys,
      run_id:          run.id,
      updated_at:      new Date().toISOString(),
    }, { onConflict: 'repo_id,pr_number' });

    try {
      await createOrUpdatePullRequestComment(
        fullName,
        prNumber,
        githubToken,
        buildPrCommentBody(fullName, scanDiff),
      );
    } catch (error) {
      console.error('Failed to sync PR comment', error);
    }
  }

  // Update repo updated_at
  await db.from('repos').update({ updated_at: new Date().toISOString() }).eq('id', repoId);

  return { run, result, coverageDelta, scanDiff };
}
