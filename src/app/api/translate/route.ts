import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { repoId, key, sourceText, targetLocale, sourceLocale } = await req.json();

    if (!repoId || !key || !targetLocale) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const db = supabaseAdmin();
    const { data: repo } = await db
      .from('repos')
      .select('id, lingo_api_key')
      .eq('id', repoId)
      .eq('owner_user_id', user.id)
      .single();

    if (!repo) return NextResponse.json({ error: 'Repo not found' }, { status: 404 });

    if (!repo.lingo_api_key) {
      return NextResponse.json({ error: 'Lingo.dev API key not configured for this repo' }, { status: 422 });
    }

    // Use Lingo.dev SDK
    const { LingoDotDevEngine } = await import('@lingo.dev/_sdk');
    const engine = new LingoDotDevEngine({ apiKey: repo.lingo_api_key });

    const payload = { [key]: sourceText || key };
    const translated = await engine.localizeObject(payload, { 
      sourceLocale: sourceLocale || 'en', 
      targetLocale 
    }) as Record<string, string>;

    const result = translated[key] || '';

    return NextResponse.json({ translation: result });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Translation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
