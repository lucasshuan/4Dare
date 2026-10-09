-- The players page's "played with me": every account that shared a finished
-- match with a player, and how many. Only reads; safe to run again.

create index if not exists match_players_user on public.match_players (user_id);

create or replace function public.co_players(p_user text)
returns table (user_id text, times integer)
language sql
stable
set search_path = public
as $$
  select other.user_id, count(distinct other.match_id)::integer
  from public.match_players mine
  join public.match_players other
    on other.match_id = mine.match_id and other.user_id <> mine.user_id
  join public.profiles p on p.id::text = other.user_id
  where mine.user_id = p_user
  group by other.user_id;
$$;
revoke execute on function public.co_players(text) from public, anon, authenticated;
