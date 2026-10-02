-- Character library: one row per character, its names, aliases and popularity
-- per language in character_names, and where it comes from as an origin id
-- whose labels live in origin_labels. Adding a language means adding rows, not
-- copying characters. `pnpm seed` loads data/characters.json and
-- data/origins.json; characters players make ("u-<uuid>") have one name row
-- and keep the origin they typed in custom_origin.
--
-- Replaces 0001's table, which had one row per language: what players made is
-- moved over, library rows come back with the next `pnpm seed`.

do $$
begin
  create type public.character_category as enum (
    'anime', 'games', 'comics', 'cartoons', 'film_tv', 'literature',
    'mythology', 'religion', 'folklore', 'sports', 'music', 'entertainment',
    'internet', 'politics', 'royalty', 'history', 'science', 'art',
    'business', 'other'
  );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'characters' and column_name = 'lang'
  ) then
    drop function if exists public.search_characters(text, text, integer);
    drop index if exists public.characters_lang_popularity;
    drop index if exists public.characters_norm_trgm;
    alter table public.characters rename to characters_v1;
  end if;
end $$;

-- Works, traditions and descriptors: "wd:Q8337" (Harry Potter), "job:actress", "topic:bible".
create table if not exists public.origins (
  id text primary key
);

create table if not exists public.origin_labels (
  origin_id text not null references public.origins (id) on delete cascade,
  lang text not null check (lang in ('en', 'pt', 'ja')),
  label text not null,
  primary key (origin_id, lang)
);

-- "wd-Q302" (Wikidata), "al-40" (AniList), "u-<uuid>" (made by a player).
create table if not exists public.characters (
  id text primary key,
  kind text check (kind in ('fictional', 'human')),
  category public.character_category,
  origin_id text references public.origins (id) on delete set null,
  custom_origin text,
  image_url text,
  created_by text,
  created_at timestamptz not null default now()
);

-- norm / alias_norms are normalised names for search. popularity is null when
-- the character is known by this name but isn't in this language's library.
create table if not exists public.character_names (
  character_id text not null references public.characters (id) on delete cascade,
  lang text not null check (lang in ('en', 'pt', 'ja')),
  name text not null,
  norm text not null,
  aliases text[] not null default '{}',
  alias_norms text[] not null default '{}',
  popularity integer,
  primary key (character_id, lang)
);
create index if not exists character_names_lang_popularity
  on public.character_names (lang, popularity desc) where popularity is not null;
create index if not exists character_names_norm_trgm
  on public.character_names using gin (norm gin_trgm_ops);

do $$
begin
  if to_regclass('public.characters_v1') is not null then
    insert into public.characters (id, custom_origin, image_url, created_by, created_at)
      select id, origin, image_url, created_by, created_at
      from public.characters_v1 where id like 'u-%'
      on conflict (id) do nothing;
    insert into public.character_names (character_id, lang, name, norm, aliases, alias_norms, popularity)
      select id, lang, name, norm, aliases, alias_norms, popularity
      from public.characters_v1 where id like 'u-%'
      on conflict (character_id, lang) do nothing;
    drop table public.characters_v1;
  end if;
end $$;

alter table public.origins enable row level security;
alter table public.origin_labels enable row level security;
alter table public.characters enable row level security;
alter table public.character_names enable row level security;

-- A character as one language sees it: its name there and its origin's label
-- there (English when that language has none, or what a player typed).
create or replace view public.character_entries
with (security_invoker = true) as
  select
    n.character_id,
    n.lang,
    n.name,
    n.norm,
    n.aliases,
    n.alias_norms,
    n.popularity,
    c.image_url,
    coalesce(l.label, e.label, c.custom_origin) as origin,
    c.created_at
  from public.character_names n
  join public.characters c on c.id = n.character_id
  left join public.origin_labels l on l.origin_id = c.origin_id and l.lang = n.lang
  left join public.origin_labels e on e.origin_id = c.origin_id and e.lang = 'en';

-- Search: exact name, then names starting with the query, then aliases, then names containing it.
create or replace function public.search_characters(q text, p_lang text, p_limit integer)
returns setof public.character_entries
language sql
stable
set search_path = public
as $$
  select c.*
  from public.character_entries c
  where c.lang = p_lang
    and c.popularity is not null
    and (
      q = ''
      or c.norm like q || '%'
      or c.norm like '%' || q || '%'
      or exists (select 1 from unnest(c.alias_norms) a where a like q || '%')
    )
  order by
    case
      when q = '' then 0
      when c.norm = q then 4
      when c.norm like q || '%' then 3
      when exists (select 1 from unnest(c.alias_norms) a where a like q || '%') then 2
      else 1
    end desc,
    c.popularity desc
  limit p_limit;
$$;

revoke execute on function public.search_characters(text, text, integer) from public, anon, authenticated;
revoke all on public.character_entries from anon, authenticated;
