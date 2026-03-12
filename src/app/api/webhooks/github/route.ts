import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { validateWebhookSignature } from '@/lib/github';
import { analyzeAndStore } from '@/app/api/repos/route';

export async function POST(req: NextRequest) {
  const payload = await req.text();
  const signature = req.headers.get('x-hub-signature-256') ?? '';
  const event     = req.headers.get('x-github-event') ?? '';

  // Parse body
  let body: any;
  try { body = JSON.parse(payload); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const fullName: string = body.repository?.full_name;
  if (!fullName) return NextResponse.json({ ok: true }); // no-op

  // Look up repo in DB
  const db = supabaseAdmin();
  const { data: repo } = await db
    .from('repos')
    .select('*')
    .eq('full_name', fullName)
    .single();

  if (!repo) return NextResponse.json({ ok: true }); // repo not tracked

  // Validate signature
  const globalSecret = process.env.GITHUB_WEBHOOK_SECRET ?? '';
  const repoSecret   = repo.webhook_secret ?? globalSecret;

  if (repoSecret && signature) {
    const valid = await validateWebhookSignature(payload, signature, repoSecret);
    if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // ── Handle push ────────────────────────────────────────────────────────────
  if (event === 'push') {
    const branch    = (body.ref as string)?.replace('refs/heads/', '');
    const commitSha = body.after as string;
    const author    = body.pusher?.name ?? body.head_commit?.author?.name ?? 'unknown';
    const message   = body.head_commit?.message ?? '';

    // Only analyze default branch and PRs
    if (branch !== repo.default_branch) {
      return NextResponse.json({ ok: true, skipped: 'non-default branch' });
    }

    // Run analysis (async, don't block response)
    analyzeAndStore(
      repo.id, fullName, branch,
      repo.github_token, repo.lingo_api_key,
      'push', db, commitSha, author,
    ).catch(console.error);

    return NextResponse.json({ ok: true, triggered: true });
  }

  // ── Handle pull_request ────────────────────────────────────────────────────
  if (event === 'pull_request') {
    const action    = body.action as string;
    if (!['opened', 'synchronize', 'reopened'].includes(action)) {
      return NextResponse.json({ ok: true, skipped: `action=${action}` });
    }

    const prNumber  = body.pull_request?.number as number;
    const prTitle   = body.pull_request?.title  as string;
    const branch    = body.pull_request?.head?.ref as string;
    const commitSha = body.pull_request?.head?.sha as string;
    const author    = body.pull_request?.user?.login as string;

    analyzeAndStore(
      repo.id, fullName, branch,
      repo.github_token, repo.lingo_api_key,
      'pr', db, commitSha, author, prNumber, prTitle,
    ).catch(console.error);

    return NextResponse.json({ ok: true, triggered: true });
  }

  // ── Ping ───────────────────────────────────────────────────────────────────
  if (event === 'ping') {
    return NextResponse.json({ ok: true, pong: true });
  }

  return NextResponse.json({ ok: true });
}
