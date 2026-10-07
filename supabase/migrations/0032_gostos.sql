-- Gostos: where a character is known (anime, animation, live action, games,
-- comics, books and legends, faith, real people). A room turns some off; its
-- themes then lose those characters, and a theme left with too few is not
-- offered. A theme serves both games, with one name; `games` takes it out of
-- one. The library is hand-fed: a copy of what this touches first. Safe to
-- run again.

create schema if not exists backup;
revoke all on schema backup from public, anon, authenticated;
create table if not exists backup.characters_before_0032 as
  select * from public.characters where created_by is null;
create table if not exists backup.origins_before_0032 as
  table public.origins;
create table if not exists backup.whoami_themes_before_0032 as
  table public.whoami_themes;

do $$
begin
  create type public.gosto as enum (
    'anime', 'animation', 'live', 'games', 'comics', 'books', 'faith', 'real'
  );
exception
  when duplicate_object then null;
end
$$;

-- A decision for a whole work or job (every id with the same English label
-- gets it), and one for a character that differs from its work. Null: the rule.
alter table public.origins add column if not exists gostos public.gosto[];
alter table public.characters add column if not exists gostos public.gosto[];

-- The rule, for what nobody decided: AniList is anime, a job or a group is a
-- real person, then the category. Null: no gosto yet, so it filters nothing.
-- Mirrored in src/game/gostos.ts.
create or replace function public.gostos_by_rule(
  p_origin text,
  p_category public.character_category
)
returns public.gosto[]
language sql
immutable
set search_path = public
as $$
  select case
    when split_part(p_origin, ':', 1) = 'al' then array['anime']::public.gosto[]
    when split_part(p_origin, ':', 1) in ('job', 'group') then array['real']::public.gosto[]
    when p_category = 'anime' then array['anime']::public.gosto[]
    when p_category = 'cartoons' then array['animation']::public.gosto[]
    when p_category = 'film_tv' then array['live']::public.gosto[]
    when p_category = 'games' then array['games']::public.gosto[]
    when p_category = 'comics' then array['comics']::public.gosto[]
    when p_category in ('literature', 'mythology', 'folklore') then array['books']::public.gosto[]
    when p_category = 'religion' then array['faith']::public.gosto[]
    when p_category in (
      'sports', 'music', 'entertainment', 'politics', 'royalty', 'history',
      'science', 'art', 'business', 'internet'
    ) then array['real']::public.gosto[]
    else null
  end;
$$;

-- A character's gostos, first the main one: its own decision, its work's, or
-- the rule. Read as a computed column of characters: select=id,character_gostos
-- (its own name: a function called gostos would hide behind the column).
create or replace function public.character_gostos(c public.characters)
returns public.gosto[]
language sql
stable
set search_path = public
as $$
  select coalesce(
    c.gostos,
    (select o.gostos from public.origins o where o.id = c.origin_id),
    public.gostos_by_rule(c.origin_id, c.category)
  );
$$;
revoke execute on function public.gostos_by_rule(text, public.character_category)
  from public, anon, authenticated;
revoke execute on function public.character_gostos(public.characters)
  from public, anon, authenticated;

-- One theme, both games: the same row and name. Leaving a game out of
-- `games` keeps the theme out of it.
alter table public.whoami_themes
  add column if not exists games text[] not null default '{who-am-i,impostor}';

-- Each theme's shared starters, clearest first, as their gostos joined by
-- commas ('' when a starter has none): the server keeps it with the theme
-- list and offers a theme while enough of them keep a gosto that is on.
create or replace view public.theme_starter_gostos
with (security_invoker = true) as
select s.theme_id,
       array_agg(
         coalesce(array_to_string(public.character_gostos(c), ','), '')
         order by s.position
       ) as gostos
from public.whoami_theme_starters s
join public.characters c on c.id = s.character_id
where s.lang = 'all'
group by s.theme_id;
revoke all on public.theme_starter_gostos from public, anon, authenticated;
