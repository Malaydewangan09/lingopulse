alter table repos add column if not exists owner_user_id uuid references auth.users(id) on delete cascade;

create index if not exists idx_repos_owner_user_id on repos(owner_user_id);

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
  if exists (
    select 1
    from pg_constraint
    where conname = 'repos_owner_key_full_name_key'
  ) then
    alter table repos drop constraint repos_owner_key_full_name_key;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'repos_owner_user_id_full_name_key'
  ) then
    alter table repos
      add constraint repos_owner_user_id_full_name_key unique (owner_user_id, full_name);
  end if;
end $$;
