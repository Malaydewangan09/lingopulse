alter table repos add column if not exists owner_key text;

create index if not exists idx_repos_owner_key on repos(owner_key);

do $$
begin
  if exists (
    select 1
    from pg_constraint
    where conname = 'repos_full_name_key'
  ) then
    alter table repos drop constraint repos_full_name_key;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'repos_owner_key_full_name_key'
  ) then
    alter table repos
      add constraint repos_owner_key_full_name_key unique (owner_key, full_name);
  end if;
end $$;
