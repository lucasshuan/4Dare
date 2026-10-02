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
alter table public.profiles enable row level security;

-- Public picture buckets.
insert into storage.buckets (id, name, public)
values ('characters', 'characters', true), ('avatars', 'avatars', true)
on conflict (id) do nothing;
