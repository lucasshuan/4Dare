-- Spanish library ids ("es-wd-Q302") count as the same character as the other
-- languages' when picks are tallied.
create or replace function public.whoami_pick_key(p_id text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_id ~ '^(en|es|ja|pt)-((wd-Q|al-)[0-9]+|hand-[a-z0-9]+(-[a-z0-9]+)*)$'
      then substr(p_id, 4)
    else p_id
  end;
$$;

revoke all on function public.whoami_pick_key(text)
  from public, anon, authenticated;
