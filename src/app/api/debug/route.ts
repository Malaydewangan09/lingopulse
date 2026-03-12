import { NextResponse } from 'next/server';

// GET /api/debug  —  check which env vars are configured (values masked)
export async function GET() {
  const checks = {
    NEXT_PUBLIC_SUPABASE_URL:     !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY:    !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    LINGO_API_KEY:                !!process.env.LINGO_API_KEY,
    GITHUB_WEBHOOK_SECRET:        !!process.env.GITHUB_WEBHOOK_SECRET,
    NEXT_PUBLIC_APP_URL:          process.env.NEXT_PUBLIC_APP_URL ?? '(not set, defaulting to localhost:3000)',
  };

  const missing = Object.entries(checks)
    .filter(([, v]) => v === false)
    .map(([k]) => k);

  // Test Supabase connection if configured
  let supabaseOk = false;
  let supabaseError = '';
  if (checks.NEXT_PUBLIC_SUPABASE_URL && checks.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { supabaseAdmin } = await import('@/lib/supabase');
      const db = supabaseAdmin();
      const { error } = await db.from('repos').select('id').limit(1);
      supabaseOk = !error;
      if (error) supabaseError = error.message;
    } catch (e: any) {
      supabaseError = e.message;
    }
  }

  return NextResponse.json({
    envVars: checks,
    missing,
    supabase: { connected: supabaseOk, error: supabaseError || null },
    allGood: missing.length === 0 && supabaseOk,
  });
}
