import { createClient } from '@supabase/supabase-js';

// Browser/server client (uses anon key) — lazy so build doesn't fail without env vars
export function supabase() {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) throw new Error('Supabase env vars not set');
  return createClient(url, anon);
}

// Server-only admin client (uses service role key — only call from API routes)
export function supabaseAdmin() {
  const url        = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) throw new Error('Supabase env vars not set');
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
