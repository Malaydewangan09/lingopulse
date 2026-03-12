import crypto from 'crypto';
import type { NextRequest, NextResponse } from 'next/server';

const OWNER_COOKIE = 'lingopulse_owner';
const OWNER_SIG_COOKIE = 'lingopulse_owner_sig';
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function signingSecret() {
  return process.env.APP_SESSION_SECRET
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? 'lingopulse-dev-owner-secret';
}

function signOwnerKey(ownerKey: string) {
  return crypto.createHmac('sha256', signingSecret()).update(ownerKey).digest('hex');
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: ONE_YEAR_SECONDS,
  };
}

export function readOwnerKey(req: NextRequest): string | null {
  const ownerKey = req.cookies.get(OWNER_COOKIE)?.value;
  const signature = req.cookies.get(OWNER_SIG_COOKIE)?.value;
  if (!ownerKey || !signature) return null;
  return signOwnerKey(ownerKey) === signature ? ownerKey : null;
}

export function createOwnerKey() {
  return crypto.randomUUID();
}

export function attachOwnerKey(res: NextResponse, ownerKey: string) {
  const options = cookieOptions();
  res.cookies.set(OWNER_COOKIE, ownerKey, options);
  res.cookies.set(OWNER_SIG_COOKIE, signOwnerKey(ownerKey), options);
}
