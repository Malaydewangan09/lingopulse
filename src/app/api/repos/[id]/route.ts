import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { computeScanDiff, snapshotFromStoredMetrics } from '@/lib/diff';
import type { DraftFixResult } from '@/lib/types';

// DELETE /api/repos/[id]  —  disconnect & remove a repo
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    void req;
    const { id } = await params;
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = supabaseAdmin();
    const { data: repo } = await db
      .from('repos')
      .select('id')
      .eq('id', id)
      .eq('owner_user_id', user.id)
      .single();
    if (!repo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Cascade deletes handled by Supabase FK or we delete manually
    await db.from('pr_checks').delete().eq('repo_id', id);
    await db.from('activity_events').delete().eq('repo_id', id);
    const { data: runs } = await db.from('analysis_runs').select('id').eq('repo_id', id);
    if (runs && runs.length > 0) {
      const runIds = runs.map(r => r.id);
      await db.from('file_metrics').delete().in('run_id', runIds);
      await db.from('locale_metrics').delete().in('run_id', runIds);
    }
    await db.from('analysis_runs').delete().eq('repo_id', id);
    const { error } = await db.from('repos').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Internal server error' }, { status: 500 });
  }
}

// GET /api/repos/[id]  —  full dashboard data for one repo
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  void req;
  const { id } = await params;
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = supabaseAdmin();

  // Get repo
  const { data: repo, error: repoErr } = await db
    .from('repos')
    .select('*')
    .eq('id', id)
    .eq('owner_user_id', user.id)
    .single();
  if (repoErr || !repo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Latest + previous runs
  const { data: recentRuns } = await db
    .from('analysis_runs')
    .select('*')
    .eq('repo_id', id)
    .order('created_at', { ascending: false })
    .limit(2);

  const latestRun = recentRuns?.[0] ?? null;
  const previousRun = recentRuns?.[1] ?? null;

  if (!latestRun) {
    return NextResponse.json({
      repo,
      latestRun: null,
      previousRun: null,
      locales: [],
      previousLocales: [],
      fileMetrics: [],
      activity: [],
      prChecks: [],
      history: [],
      historyLocales: [],
      scanDiff: null,
      latestDraftFix: null,
      incidents: [],
    });
  }

  // Locale metrics for latest run
  const { data: locales } = await db
    .from('locale_metrics')
    .select('*')
    .eq('run_id', latestRun.id)
    .order('coverage', { ascending: false });

  // Locale metrics for previous run for trend deltas
  const previousLocaleQuery = previousRun
    ? await db
        .from('locale_metrics')
        .select('*')
        .eq('run_id', previousRun.id)
    : null;
  const previousLocales = previousLocaleQuery?.data ?? [];
  const previousFileQuery = previousRun
    ? await db
        .from('file_metrics')
        .select('locale, file_path, coverage, missing_keys')
        .eq('run_id', previousRun.id)
    : null;
  const previousFileMetrics = previousFileQuery?.data ?? [];

  // File metrics for latest run
  const { data: fileMetrics } = await db
    .from('file_metrics')
    .select('*')
    .eq('run_id', latestRun.id);

  // Activity events (last 20)
  const { data: activity } = await db
    .from('activity_events')
    .select('*')
    .eq('repo_id', id)
    .order('created_at', { ascending: false })
    .limit(20);

  const latestDraftFix = (activity ?? []).find(event => {
    const payload = event.raw_payload as { kind?: string } | null;
    return payload?.kind === 'draft_fix_pr';
  })?.raw_payload as { draftFix?: DraftFixResult } | undefined;

  const { data: incidents } = await db
    .from('translation_incidents')
    .select('*')
    .eq('repo_id', id)
    .eq('status', 'open')
    .order('last_seen_at', { ascending: false })
    .limit(6);

  // PR checks (last 10)
  const { data: prChecks } = await db
    .from('pr_checks')
    .select('*')
    .eq('repo_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  // History (last 30 runs for charts)
  const { data: history } = await db
    .from('analysis_runs')
    .select('id, overall_coverage, quality_score, missing_keys, created_at')
    .eq('repo_id', id)
    .order('created_at', { ascending: true })
    .limit(30);

  const historyRunIds = history?.map(run => run.id) ?? [];
  const historyLocaleQuery = historyRunIds.length > 0
    ? await db
        .from('locale_metrics')
        .select('run_id, locale, coverage, quality_score')
        .in('run_id', historyRunIds)
    : null;
  const historyLocales = historyLocaleQuery?.data ?? [];
  const scanDiff = computeScanDiff(
    snapshotFromStoredMetrics(latestRun, locales ?? [], fileMetrics ?? []),
    previousRun ? snapshotFromStoredMetrics(previousRun, previousLocales, previousFileMetrics) : null,
  );

  return NextResponse.json({
    repo,
    latestRun,
    previousRun,
    locales,
    previousLocales,
    fileMetrics,
    activity,
    prChecks,
    history,
    historyLocales,
    scanDiff,
    latestDraftFix: latestDraftFix?.draftFix ?? null,
    incidents: incidents ?? [],
  });
}
