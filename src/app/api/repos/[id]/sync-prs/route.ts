import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';
import { analyzeAndStore } from '@/app/api/repos/route';
import { isI18nFilePath, listPullRequestFiles, listPullRequests } from '@/lib/github';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    void req;
    const { id } = await params;
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const db = supabaseAdmin();
    const { data: repo } = await db
      .from('repos')
      .select('*')
      .eq('id', id)
      .eq('owner_user_id', user.id)
      .single();

    if (!repo) return NextResponse.json({ error: 'Repo not found' }, { status: 404 });

    const prs = await listPullRequests(repo.full_name, repo.github_token, 'open', 12);
    const openPrNumbers = new Set(prs.map(pr => pr.number).filter((value): value is number => Number.isFinite(value)));

    const { data: existingChecks } = await db
      .from('pr_checks')
      .select('id, pr_number')
      .eq('repo_id', repo.id);

    const stalePrNumbers = (existingChecks ?? [])
      .map(check => Number(check.pr_number))
      .filter(prNumber => Number.isFinite(prNumber) && !openPrNumbers.has(prNumber));

    if (stalePrNumbers.length > 0) {
      await Promise.all(
        stalePrNumbers.map(prNumber =>
          db.from('pr_checks').delete().eq('repo_id', repo.id).eq('pr_number', prNumber)
        ),
      );
    }

    if (prs.length === 0) {
      return NextResponse.json({ synced: 0, message: 'No recent pull requests to sync.' });
    }

    const syncResults = await Promise.allSettled(
      prs
        .filter(pr => pr.head?.ref && pr.head?.sha)
        .map(async pr => {
          const files = await listPullRequestFiles(repo.full_name, pr.number, repo.github_token).catch(() => []);
          const touchesI18n = files.some(isI18nFilePath);

          if (!touchesI18n) {
            await db.from('pr_checks').delete().eq('repo_id', repo.id).eq('pr_number', pr.number);
            return { kind: 'skipped' as const };
          }

          const result = await analyzeAndStore(
            repo.id,
            repo.full_name,
            pr.head?.ref ?? repo.default_branch,
            repo.github_token,
            repo.lingo_api_key,
            'pr',
            db,
            pr.head?.sha,
            pr.user?.login ?? 'unknown',
            pr.number,
            pr.title,
          );

          return result ? { kind: 'synced' as const } : { kind: 'failed' as const };
        }),
    );

    const synced = syncResults.filter(result => result.status === 'fulfilled' && result.value.kind === 'synced').length;
    const skipped = syncResults.filter(result => result.status === 'fulfilled' && result.value.kind === 'skipped').length;
    const failed = syncResults.length - synced - skipped;

    return NextResponse.json({
      synced,
      skipped,
      failed,
      message: synced > 0
        ? `Synced ${synced} localization-relevant PR ${synced === 1 ? 'check' : 'checks'}${skipped > 0 ? ` · skipped ${skipped} unrelated PRs` : ''}.`
        : skipped > 0
        ? `Skipped ${skipped} PRs because they did not touch locale files.`
        : 'No PR checks were created. Recent merged PRs may no longer have a readable head branch.',
    });
  } catch (error: unknown) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}
