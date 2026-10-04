-- Tables that belong to one game carry its prefix, so other games can come
-- later: themes, their starters and the pick feedback are "Who am I?" only.
-- The library (characters, origins) and rooms stay shared, unprefixed.
-- A rename keeps rows, keys, grants and row level security.

-- the theme list and its starters are hand-fed: a copy before touching them
create schema if not exists backup;
revoke all on schema backup from public, anon, authenticated;
create table if not exists backup.themes_before_0018 as table public.themes;
create table if not exists backup.theme_starters_before_0018 as table public.theme_starters;

alter table public.themes rename to whoami_themes;
alter table public.whoami_themes rename constraint themes_pkey to whoami_themes_pkey;
alter table public.whoami_themes rename constraint themes_example_check to whoami_themes_example_check;
alter table public.whoami_themes rename constraint themes_source_check to whoami_themes_source_check;
alter index public.themes_active rename to whoami_themes_active;
alter index public.themes_set rename to whoami_themes_set;
alter index public.themes_set_example rename to whoami_themes_set_example;

alter table public.theme_starters rename to whoami_theme_starters;
alter table public.whoami_theme_starters rename constraint theme_starters_pkey to whoami_theme_starters_pkey;
alter table public.whoami_theme_starters rename constraint theme_starters_character_id_fkey to whoami_theme_starters_character_id_fkey;
alter table public.whoami_theme_starters rename constraint theme_starters_theme_id_fkey to whoami_theme_starters_theme_id_fkey;
alter table public.whoami_theme_starters rename constraint theme_starters_position_check to whoami_theme_starters_position_check;
alter table public.whoami_theme_starters rename constraint theme_starters_theme_id_position_key to whoami_theme_starters_theme_id_position_key;
alter index public.theme_starters_character rename to whoami_theme_starters_character;

alter table public.pick_feedback rename to whoami_pick_feedback;
alter table public.whoami_pick_feedback rename constraint pick_feedback_pkey to whoami_pick_feedback_pkey;

-- the function names its table in the body, read at each call
create or replace function public.theme_pick_scores(p_theme text, p_limit integer)
returns table (id text, picks bigint, likes bigint, dislikes bigint)
language sql
stable
set search_path = public
as $$
  select
    p.id,
    p.picks,
    count(f.user_id) filter (where f.liked) as likes,
    count(f.user_id) filter (where not f.liked) as dislikes
  from public.popular_picks(p_theme, p_limit) p
  left join public.whoami_pick_feedback f on f.theme_id = p_theme and f.character_id = p.id
  group by p.id, p.picks
  order by p.picks desc, p.id;
$$;

-- The old names, for the deploy still running until the new one is live.
-- Dropped by 0019_drop_old_theme_names.sql.
create or replace view public.themes with (security_invoker = true)
  as select * from public.whoami_themes;
create or replace view public.theme_starters with (security_invoker = true)
  as select * from public.whoami_theme_starters;
create or replace view public.pick_feedback with (security_invoker = true)
  as select * from public.whoami_pick_feedback;
revoke all on public.themes, public.theme_starters, public.pick_feedback
  from anon, authenticated;
