import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { analyzeAndStore } from '@/app/api/repos/route';

// POST /api/analyze  —  manually trigger re-analysis for a repo
export async function POST(req: NextRequest) {
  const { repoId } = await req.json();
  if (!repoId) return NextResponse.json({ error: 'repoId required' }, { status: 400 });

  const db = supabaseAdmin();
  const { data: repo } = await db.from('repos').select('*').eq('id', repoId).single();
  if (!repo) return NextResponse.json({ error: 'Repo not found' }, { status: 404 });

  try {
    const res = await analyzeAndStore(
      repo.id,
      repo.full_name,
      repo.default_branch,
      repo.github_token,
      repo.lingo_api_key,
      'manual',
      db,
    );
    if (!res) return NextResponse.json({ error: 'No i18n files found in this repo' }, { status: 422 });
    return NextResponse.json({
      runId:            res.run.id,
      overallCoverage:  res.result.overallCoverage,
      qualityScore:     res.result.qualityScore,
      missingKeys:      res.result.missingKeys,
      localesFound:     res.result.locales.length,
      filesAnalyzed:    res.result.analyzedFiles,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
