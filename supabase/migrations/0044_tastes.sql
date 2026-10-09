-- Gostos become tastes: every name in English, like the rest of the schema.
-- Same type, columns, functions and view, renamed; nothing else changes.
-- The library is hand-fed: a copy of the columns this renames first.

create table if not exists backup.characters_tastes_before_0044 as
  select id, gostos from public.characters where gostos is not null;
create table if not exists backup.origins_tastes_before_0044 as
  select id, gostos from public.origins where gostos is not null;

alter type public.gosto rename to taste;
alter table public.origins rename column gostos to tastes;
alter table public.characters rename column gostos to tastes;

-- The old functions read the old column names; new ones under new names.
drop view if exists public.theme_starter_gostos;
drop function if exists public.lineup_pool(text, integer, integer);
drop function if exists public.lineup_pool(text);
drop function if exists public.impostor_facts(text[], text);
drop function if exists public.gostos(public.characters);
drop function if exists public.character_gostos(public.characters);
drop function if exists public.gostos_by_rule(text, public.character_category);

-- Mirrored in src/game/tastes.ts.
create or replace function public.tastes_by_rule(
  p_origin text,
  p_category public.character_category
)
returns public.taste[]
language sql
immutable
set search_path = public
as $$
  select case
    when split_part(p_origin, ':', 1) = 'al' then array['anime']::public.taste[]
    when split_part(p_origin, ':', 1) in ('job', 'group') then array['real']::public.taste[]
    when p_category = 'anime' then array['anime']::public.taste[]
    when p_category = 'cartoons' then array['animation']::public.taste[]
    when p_category = 'film_tv' then array['live']::public.taste[]
    when p_category = 'games' then array['games']::public.taste[]
    when p_category = 'comics' then array['comics']::public.taste[]
    when p_category in ('literature', 'mythology', 'folklore') then array['books']::public.taste[]
    when p_category = 'religion' then array['faith']::public.taste[]
    when p_category in (
      'sports', 'music', 'entertainment', 'politics', 'royalty', 'history',
      'science', 'art', 'business', 'internet'
    ) then array['real']::public.taste[]
    else null
  end;
$$;

-- A character's tastes, first the main one: its own decision, its work's, or
-- the rule.
create or replace function public.character_tastes(c public.characters)
returns public.taste[]
language sql
stable
set search_path = public
as $$
  select coalesce(
    c.tastes,
    (select o.tastes from public.origins o where o.id = c.origin_id),
    public.tastes_by_rule(c.origin_id, c.category)
  );
$$;

revoke execute on function public.tastes_by_rule(text, public.character_category)
  from public, anon, authenticated;
revoke execute on function public.character_tastes(public.characters)
  from public, anon, authenticated;

-- Each theme's shared starters, clearest first, as their tastes joined by
-- commas ('' when none).
create or replace view public.theme_starter_tastes
with (security_invoker = true) as
select s.theme_id,
       array_agg(
         coalesce(array_to_string(public.character_tastes(c), ','), '')
         order by s.position
       ) as tastes
from public.whoami_theme_starters s
join public.characters c on c.id = s.character_id
where s.lang = 'all'
group by s.theme_id;

revoke all on public.theme_starter_tastes from public, anon, authenticated;

create or replace function public.impostor_facts(p_ids text[], p_lang text)
returns table (
  character_id text,
  category public.character_category,
  work text,
  popularity integer,
  tastes public.taste[]
)
language sql
stable
set search_path = public
as $$
  select c.id,
         c.category,
         coalesce(l.label, c.origin_id),
         n.popularity,
         public.character_tastes(c)
  from public.characters c
  left join public.character_names n
    on n.character_id = c.id and n.lang = p_lang
  left join public.origin_labels l
    on l.origin_id = c.origin_id and l.lang = 'en'
  where c.id = any(p_ids);
$$;

revoke execute on function public.impostor_facts(text[], text)
  from public, anon, authenticated;

-- One-argument version, kept for servers deployed before 0042.
create or replace function public.lineup_pool(p_lang text)
returns table (character_id text, tastes public.taste[], popularity integer)
language sql
stable
set search_path = public
as $$
  with floor as (
    select coalesce(public.impostor_known_floor(p_lang), 0) as v
  )
  select c.id, public.character_tastes(c), n.popularity
  from public.characters c
  join public.character_names n
    on n.character_id = c.id and n.lang = p_lang
  cross join floor f
  where c.id not like 'u-%'
    and c.image_url is not null
    and n.popularity is not null
    and n.popularity >= f.v
    and cardinality(public.character_tastes(c)) > 0
    and not exists (
      select 1 from public.lineup_blocked b where b.character_id = c.id
    )
  order by n.popularity desc;
$$;

revoke execute on function public.lineup_pool(text)
  from public, anon, authenticated;

create or replace function public.lineup_pool(
  p_lang text,
  p_top integer,
  p_per_taste integer
)
returns table (character_id text, tastes public.taste[], popularity integer)
language sql
stable
set search_path = public
as $$
  -- character_tastes, inlined: called once a row it is ten times slower
  with deck as (
    select c.id,
      coalesce(
        c.tastes,
        o.tastes,
        public.tastes_by_rule(c.origin_id, c.category)
      ) as tastes,
      n.popularity
    from public.characters c
    join public.character_names n
      on n.character_id = c.id and n.lang = p_lang
    left join public.origins o on o.id = c.origin_id
    where c.id not like 'u-%'
      and c.image_url is not null
      and n.popularity is not null
      and not exists (
        select 1 from public.lineup_blocked b where b.character_id = c.id
      )
  ),
  ranked as (
    select d.id, d.tastes, d.popularity,
      row_number() over (order by d.popularity desc, d.id) as rk
    from deck d
    where cardinality(d.tastes) > 0
  ),
  per_taste as (
    select r.id,
      row_number() over (partition by g order by r.popularity desc, r.id) as grk
    from ranked r, unnest(r.tastes) as g
  )
  select r.id, r.tastes, r.popularity
  from ranked r
  where r.rk <= p_top
    or r.id in (select p.id from per_taste p where p.grk <= p_per_taste)
  order by r.popularity desc, r.id;
$$;

revoke execute on function public.lineup_pool(text, integer, integer)
  from public, anon, authenticated;

-- Open rooms keep what they switched off under the new key.
update public.rooms
set state = jsonb_set(
  state,
  '{settings}',
  ((state->'settings') - 'offGostos')
    || jsonb_build_object('offTastes', state->'settings'->'offGostos')
)
where state->'settings' ? 'offGostos';
