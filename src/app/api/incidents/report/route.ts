import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { TranslationIncidentReport } from '@/lib/types';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function normalizePath(value?: string) {
  if (!value) return '/';
  return value.startsWith('/') ? value : `/${value}`;
}

function fingerprintIncident(payload: TranslationIncidentReport) {
  return crypto
    .createHash('sha256')
    .update([
      payload.issueType,
      payload.locale,
      normalizePath(payload.route),
      payload.translationKey ?? '',
      payload.sampleText ?? '',
      payload.fallbackLocale ?? '',
    ].join('|'))
    .digest('hex');
}

function buildIncidentMessage(payload: TranslationIncidentReport) {
  const route = normalizePath(payload.route);
  const label = payload.translationKey || payload.sampleText || payload.issueType;

  switch (payload.issueType) {
    case 'raw_key':
      return `Live incident · ${payload.locale} exposed raw key ${label} on ${route}`;
    case 'placeholder':
      return `Live incident · ${payload.locale} leaked placeholder ${label} on ${route}`;
    case 'fallback':
      return `Live incident · ${payload.locale} fell back to ${payload.fallbackLocale ?? 'source'} on ${route}`;
    case 'empty':
      return `Live incident · ${payload.locale} rendered empty copy on ${route}`;
    default:
      return `Live incident · ${payload.locale} translation issue on ${route}`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as TranslationIncidentReport;

    if (!body.repoId || !body.ingestKey || !body.issueType || !body.locale) {
      return NextResponse.json({ error: 'repoId, ingestKey, issueType, and locale are required' }, { status: 400, headers: CORS_HEADERS });
    }

    const db = supabaseAdmin();
    const { data: repo } = await db
      .from('repos')
      .select('id')
      .eq('id', body.repoId)
      .eq('public_ingest_key', body.ingestKey)
      .single();

    if (!repo) {
      return NextResponse.json({ error: 'Invalid repo ingest credentials' }, { status: 401, headers: CORS_HEADERS });
    }

    const fingerprint = fingerprintIncident(body);
    const route = normalizePath(body.route);
    const timestamp = new Date().toISOString();

    const { data: existing } = await db
      .from('translation_incidents')
      .select('id, hit_count')
      .eq('repo_id', body.repoId)
      .eq('fingerprint', fingerprint)
      .maybeSingle();

    if (existing) {
      await db
        .from('translation_incidents')
        .update({
          sample_text: body.sampleText ?? null,
          fallback_locale: body.fallbackLocale ?? null,
          app_version: body.appVersion ?? null,
          commit_sha: body.commitSha ?? null,
          hit_count: existing.hit_count + 1,
          last_seen_at: timestamp,
          raw_payload: body.metadata ?? null,
          status: 'open',
        })
        .eq('id', existing.id);

      return NextResponse.json({ ok: true, incidentId: existing.id, status: 'updated' }, { headers: CORS_HEADERS });
    }

    const { data: incident, error: insertError } = await db
      .from('translation_incidents')
      .insert({
        repo_id: body.repoId,
        fingerprint,
        issue_type: body.issueType,
        locale: body.locale,
        route,
        translation_key: body.translationKey ?? null,
        sample_text: body.sampleText ?? null,
        fallback_locale: body.fallbackLocale ?? null,
        app_version: body.appVersion ?? null,
        commit_sha: body.commitSha ?? null,
        raw_payload: body.metadata ?? null,
      })
      .select('id')
      .single();

    if (insertError || !incident) {
      return NextResponse.json({ error: insertError?.message ?? 'Failed to store incident' }, { status: 500, headers: CORS_HEADERS });
    }

    await db.from('activity_events').insert({
      repo_id: body.repoId,
      type: 'incident',
      branch: body.commitSha ?? 'production',
      commit_sha: body.commitSha ?? null,
      author: 'lingopulse-sdk',
      message: buildIncidentMessage(body),
      locales_affected: [body.locale],
      raw_payload: {
        kind: 'translation_incident',
        incidentId: incident.id,
        issueType: body.issueType,
        route,
        translationKey: body.translationKey ?? null,
      },
    });

    return NextResponse.json({ ok: true, incidentId: incident.id, status: 'created' }, { headers: CORS_HEADERS });
  } catch (error: unknown) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Internal server error',
    }, { status: 500, headers: CORS_HEADERS });
  }
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}
