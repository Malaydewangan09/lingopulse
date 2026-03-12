import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// DELETE /api/repos/[id]  —  disconnect & remove a repo
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = supabaseAdmin();
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
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// GET /api/repos/[id]  —  full dashboard data for one repo
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = supabaseAdmin();

  // Get repo
  const { data: repo, error: repoErr } = await db.from('repos').select('*').eq('id', id).single();
  if (repoErr || !repo) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Latest run
  const { data: latestRun } = await db
    .from('analysis_runs')
    .select('*')
    .eq('repo_id', id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!latestRun) {
    return NextResponse.json({ repo, latestRun: null, locales: [], fileMetrics: [], activity: [], prChecks: [], history: [] });
  }

  // Locale metrics for latest run
  const { data: locales } = await db
    .from('locale_metrics')
    .select('*')
    .eq('run_id', latestRun.id)
    .order('coverage', { ascending: false });

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
    .select('overall_coverage, quality_score, missing_keys, created_at')
    .eq('repo_id', id)
    .order('created_at', { ascending: true })
    .limit(30);

  return NextResponse.json({ repo, latestRun, locales, fileMetrics, activity, prChecks, history });
}
