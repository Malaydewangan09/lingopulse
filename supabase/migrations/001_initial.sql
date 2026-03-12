-- Enable UUID extension
create extension if not exists "pgcrypto";

-- ─── Repos ──────────────────────────────────────────────────────────────────
create table if not exists repos (
  id              uuid primary key default gen_random_uuid(),
  full_name       text not null unique,  -- "owner/repo"
  owner           text not null,
  name            text not null,
  default_branch  text not null default 'main',
  github_token    text,                 -- stored in plaintext for hackathon; use vault in prod
  lingo_api_key   text,
  webhook_id      bigint,
  webhook_secret  text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─── Analysis Runs ──────────────────────────────────────────────────────────
create table if not exists analysis_runs (
  id                uuid primary key default gen_random_uuid(),
  repo_id           uuid not null references repos(id) on delete cascade,
  branch            text,
  commit_sha        text,
  triggered_by      text not null default 'manual',  -- 'push' | 'pr' | 'manual' | 'scheduled'
  overall_coverage  numeric(5,2),
  quality_score     numeric(4,2),
  total_keys        integer,
  missing_keys      integer,
  active_locales    integer,
  total_locales     integer,
  created_at        timestamptz not null default now()
);

-- ─── Locale Metrics (per run) ───────────────────────────────────────────────
create table if not exists locale_metrics (
  id               uuid primary key default gen_random_uuid(),
  run_id           uuid not null references analysis_runs(id) on delete cascade,
  locale           text not null,
  flag             text,
  locale_name      text,
  coverage         numeric(5,2),
  quality_score    numeric(4,2),
  total_keys       integer,
  translated_keys  integer,
  missing_keys     integer,
  unique (run_id, locale)
);

-- ─── File Metrics (per run × locale) ───────────────────────────────────────
create table if not exists file_metrics (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid not null references analysis_runs(id) on delete cascade,
  locale       text not null,
  file_path    text not null,
  coverage     numeric(5,2),
  total_keys   integer,
  missing_keys integer,
  unique (run_id, locale, file_path)
);

-- ─── Activity Events ────────────────────────────────────────────────────────
create table if not exists activity_events (
  id                uuid primary key default gen_random_uuid(),
  repo_id           uuid not null references repos(id) on delete cascade,
  type              text not null,  -- 'push' | 'pr_opened' | 'pr_merged' | 'analysis' | 'regression'
  branch            text,
  commit_sha        text,
  author            text,
  message           text,
  coverage_delta    numeric(5,2),
  locales_affected  text[],
  raw_payload       jsonb,
  created_at        timestamptz not null default now()
);

-- ─── PR Checks ──────────────────────────────────────────────────────────────
create table if not exists pr_checks (
  id               uuid primary key default gen_random_uuid(),
  repo_id          uuid not null references repos(id) on delete cascade,
  pr_number        integer not null,
  pr_title         text,
  author           text,
  branch           text,
  status           text not null default 'pending',  -- 'passing' | 'failing' | 'warning' | 'pending'
  coverage_before  numeric(5,2),
  coverage_after   numeric(5,2),
  missing_keys     integer default 0,
  run_id           uuid references analysis_runs(id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ─── Indexes ────────────────────────────────────────────────────────────────
create index if not exists idx_analysis_runs_repo_id     on analysis_runs(repo_id, created_at desc);
create index if not exists idx_locale_metrics_run_id     on locale_metrics(run_id);
create index if not exists idx_file_metrics_run_id       on file_metrics(run_id);
create index if not exists idx_activity_events_repo_id   on activity_events(repo_id, created_at desc);
create index if not exists idx_pr_checks_repo_id         on pr_checks(repo_id, created_at desc);

-- ─── RLS (disable for hackathon, enable + add policies in prod) ─────────────
alter table repos            disable row level security;
alter table analysis_runs    disable row level security;
alter table locale_metrics   disable row level security;
alter table file_metrics     disable row level security;
alter table activity_events  disable row level security;
alter table pr_checks        disable row level security;
