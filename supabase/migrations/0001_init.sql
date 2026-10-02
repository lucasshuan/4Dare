-- Dare: everything the server needs. The browser never reads these tables directly:
-- all access goes through the Next.js server with the service role, so RLS is on with no policies.

create extension if not exists pg_trgm;

-- Rooms: the whole game state as JSON, plus a version for compare-and-swap.
create table if not exists public.rooms (
  code text primary key,
  state jsonb not null,
  version integer not null default 1,
  phase text not null,
  visibility text not null,
  updated_at timestamptz not null default now()
);
create index if not exists rooms_public_lobby on public.rooms (updated_at desc)
  where phase = 'lobby' and visibility = 'public';

-- Character library, one row per language entry. norm / alias_norms are normalised names for search.
create table if not exists public.characters (
  id text primary key,
  lang text not null check (lang in ('en', 'pt', 'ja')),
  name text not null,
  norm text not null,
  origin text,
  image_url text,
  aliases text[] not null default '{}',
  alias_norms text[] not null default '{}',
  popularity integer not null default 0,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists characters_lang_popularity on public.characters (lang, popularity desc);
create index if not exists characters_norm_trgm on public.characters using gin (norm gin_trgm_ops);

-- Who someone is: guests (anonymous users) and accounts (Discord / Google).
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  is_guest boolean not null default true,
  name text,
  guest_number integer not null,
  avatar jsonb not null,
  provider text,
  provider_avatar_url text,
  updated_at timestamptz not null default now()
);

alter table public.rooms enable row level security;
alter table public.characters enable row level security;
alter table public.profiles enable row level security;

-- Search: exact name, then names starting with the query, then aliases, then names containing it.
create or replace function public.search_characters(q text, p_lang text, p_limit integer)
returns setof public.characters
language sql
stable
set search_path = public
as $$
  select c.*
  from public.characters c
  where c.lang = p_lang
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

-- Public picture buckets.
insert into storage.buckets (id, name, public)
values ('characters', 'characters', true), ('avatars', 'avatars', true)
on conflict (id) do nothing;
