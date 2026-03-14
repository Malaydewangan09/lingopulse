import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { isI18nFilePath, listPullRequestFiles, validateWebhookSignature } from '@/lib/github';
import { analyzeAndStore } from '@/app/api/repos/route';

interface GithubWebhookBody {
  repository?: { full_name?: string };
  ref?: string;
  after?: string;
  pusher?: { name?: string };
  head_commit?: { author?: { name?: string }; message?: string };
  action?: string;
  pull_request?: {
    number?: number;
    title?: string;
    head?: { ref?: string; sha?: string };
    user?: { login?: string };
  };
}

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get('x-hub-signature-256') ?? '';
  const event     = req.headers.get('x-github-event') ?? '';

  // Parse body
  let body: GithubWebhookBody;
  try { body = JSON.parse(payload); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const fullName = body.repository?.full_name;
  if (!fullName) return NextResponse.json({ ok: true }); // no-op

  // Look up repo in DB
  const db = supabaseAdmin();
  const { data: repos } = await db
    .from('repos')
    .select('*')
    .eq('full_name', fullName)
    .order('created_at', { ascending: true });

  if (!repos || repos.length === 0) return NextResponse.json({ ok: true }); // repo not tracked

  // Validate signature
  const globalSecret = process.env.GITHUB_WEBHOOK_SECRET ?? repos[0]?.webhook_secret ?? '';

  if (globalSecret && signature) {
    const valid = await validateWebhookSignature(payload, signature, globalSecret);
    if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // ── Handle push ────────────────────────────────────────────────────────────
  if (event === 'push') {
    const branch    = body.ref?.replace('refs/heads/', '') ?? '';
    const commitSha = body.after ?? '';
    const author    = body.pusher?.name ?? body.head_commit?.author?.name ?? 'unknown';

    const matchingRepos = repos.filter(repo => branch === repo.default_branch);
    if (matchingRepos.length === 0) {
      return NextResponse.json({ ok: true, skipped: 'non-default branch' });
    }

    for (const repo of matchingRepos) {
      analyzeAndStore(
        repo.id, fullName, branch,
        repo.github_token, repo.lingo_api_key,
        'push', db, commitSha, author,
      ).catch(console.error);
    }

    return NextResponse.json({ ok: true, triggered: true });
  }

  // ── Handle pull_request ────────────────────────────────────────────────────
  if (event === 'pull_request') {
    const action = body.action ?? '';
    const prNumber  = body.pull_request?.number ?? 0;

    if (action === 'closed') {
      await Promise.all(repos.map(repo =>
        db.from('pr_checks').delete().eq('repo_id', repo.id).eq('pr_number', prNumber)
      ));
      return NextResponse.json({ ok: true, removed: true });
    }

    if (!['opened', 'synchronize', 'reopened'].includes(action)) {
      return NextResponse.json({ ok: true, skipped: `action=${action}` });
    }

    const prTitle   = body.pull_request?.title ?? '';
    const branch    = body.pull_request?.head?.ref ?? '';
    const commitSha = body.pull_request?.head?.sha ?? '';
    const author    = body.pull_request?.user?.login ?? 'unknown';
    const prFiles   = prNumber > 0 ? await listPullRequestFiles(fullName, prNumber, repos[0].github_token).catch(() => []) : [];
    const touchesI18n = prFiles.some(isI18nFilePath);

    if (!touchesI18n) {
      await Promise.all(repos.map(repo =>
        db.from('pr_checks').delete().eq('repo_id', repo.id).eq('pr_number', prNumber)
      ));
      return NextResponse.json({ ok: true, skipped: 'no i18n files changed' });
    }

    for (const repo of repos) {
      analyzeAndStore(
        repo.id, fullName, branch,
        repo.github_token, repo.lingo_api_key,
        'pr', db, commitSha, author, prNumber, prTitle,
      ).catch(console.error);
    }

    return NextResponse.json({ ok: true, triggered: true });
  }

  // ── Ping ───────────────────────────────────────────────────────────────────
  if (event === 'ping') {
    return NextResponse.json({ ok: true, pong: true });
  }

  return NextResponse.json({ ok: true });
}
