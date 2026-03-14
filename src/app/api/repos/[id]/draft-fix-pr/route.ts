import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { createDraftFixPullRequest } from '@/lib/fixes';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  void req;

  try {
    const { id } = await params;
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = supabaseAdmin();
    const { data: repo } = await db
      .from('repos')
      .select('id, full_name, default_branch, github_token, lingo_api_key')
      .eq('id', id)
      .eq('owner_user_id', user.id)
      .single();

    if (!repo) return NextResponse.json({ error: 'Repo not found' }, { status: 404 });
    if (!repo.github_token) {
      return NextResponse.json({ error: 'GitHub token missing for this repo' }, { status: 422 });
    }

    const result = await createDraftFixPullRequest({
      fullName: repo.full_name,
      baseBranch: repo.default_branch,
      githubToken: repo.github_token,
      lingoApiKey: repo.lingo_api_key,
    });

    await db.from('activity_events').insert({
      repo_id: id,
      type: 'analysis',
      branch: result.branch,
      author: user.email ?? 'lingo-bot',
      message: `Draft fix PR opened · ${result.keysFilled} keys across ${result.filesUpdated} files`,
      coverage_delta: 0,
      locales_affected: result.localesTouched,
      raw_payload: {
        kind: 'draft_fix_pr',
        draftFix: result,
      },
    });

    await db.from('repos').update({ updated_at: new Date().toISOString() }).eq('id', id);

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    const status = /No missing keys|No target locales|No i18n files|GitHub token missing|Lingo\.dev/i.test(message) ? 422 : 500;
    return NextResponse.json({
      error: message,
    }, { status });
  }
}
