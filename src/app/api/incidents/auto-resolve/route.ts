import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { repoId?: string; daysOld?: number };
    const daysOld = body.daysOld ?? 7;
    const cutoffDate = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000).toISOString();

    const db = supabaseAdmin();

    let query = db
      .from('translation_incidents')
      .update({ status: 'resolved', resolved_at: new Date().toISOString() })
      .eq('status', 'open')
      .lt('last_seen_at', cutoffDate);

    if (body.repoId) {
      query = query.eq('repo_id', body.repoId);
    }

    const { data, error } = await query.select('id');

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ 
      ok: true, 
      resolvedCount: data?.length ?? 0,
      message: `Resolved ${data?.length ?? 0} incidents older than ${daysOld} days` 
    });
  } catch (error: unknown) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500 });
  }
}
