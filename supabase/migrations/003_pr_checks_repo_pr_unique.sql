do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'pr_checks_repo_id_pr_number_key'
  ) then
    alter table pr_checks
      add constraint pr_checks_repo_id_pr_number_key unique (repo_id, pr_number);
  end if;
end $$;
