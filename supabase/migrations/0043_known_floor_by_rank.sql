-- The popularity a character needs in a language to count as known, at any
-- depth: the Impostor's floor is the 2 500th (0034), deeper for a room that
-- dropped gostos (gostoReach). The one-argument version stays for servers
-- still running the previous deploy.
create or replace function public.impostor_known_floor(p_lang text, p_rank integer)
returns integer
language sql
stable
set search_path = public
as $$
  select popularity
  from public.character_names
  where lang = p_lang and popularity is not null
  order by popularity desc
  offset greatest(p_rank, 1) - 1
  limit 1;
$$;

revoke execute on function public.impostor_known_floor(text, integer)
  from public, anon, authenticated;
