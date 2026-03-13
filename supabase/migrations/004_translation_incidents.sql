alter table repos add column if not exists public_ingest_key text;

update repos
set public_ingest_key = encode(gen_random_bytes(18), 'hex')
where public_ingest_key is null;

alter table repos alter column public_ingest_key set not null;
alter table repos alter column public_ingest_key set default encode(gen_random_bytes(18), 'hex');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'repos_public_ingest_key_key'
  ) then
    alter table repos
      add constraint repos_public_ingest_key_key unique (public_ingest_key);
  end if;
end $$;

create table if not exists translation_incidents (
  id                uuid primary key default gen_random_uuid(),
  repo_id           uuid not null references repos(id) on delete cascade,
  fingerprint       text not null,
  issue_type        text not null,
  locale            text not null,
  route             text not null default '/',
  translation_key   text,
  sample_text       text,
  fallback_locale   text,
  app_version       text,
  commit_sha        text,
  hit_count         integer not null default 1,
  first_seen_at     timestamptz not null default now(),
  last_seen_at      timestamptz not null default now(),
  status            text not null default 'open',
  raw_payload       jsonb,
  unique (repo_id, fingerprint)
);

create index if not exists idx_translation_incidents_repo_last_seen
  on translation_incidents(repo_id, last_seen_at desc);

alter table translation_incidents disable row level security;
