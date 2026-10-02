-- Finished matches, kept per player: who picked what for whom, how it ended,
-- how long it took. Written only by the server (service key), never read by
-- browsers. Guests are anonymous users: linking Discord/Google keeps their id,
-- so their matches stay theirs; signing in to an older account moves them
-- (reassign_matches).

create table if not exists public.matches (
  id text primary key, -- room code + start time: saving twice is a no-op
  room_code text not null,
  round integer not null,
  theme jsonb,
  started_at timestamptz not null,
  finished_at timestamptz not null
);

create table if not exists public.match_players (
  match_id text not null references public.matches (id) on delete cascade,
  user_id text not null,
  was_guest boolean not null,
  lang text not null,
  picked_by text,
  character_id text,
  character_name text,
  character_origin text,
  result text not null check (result in ('discovered', 'gave_up', 'left', 'not_found')),
  place integer,
  discovered_at integer,
  questions integer not null default 0,
  guesses integer not null default 0,
  time_ms integer,
  finished_at timestamptz not null, -- copied from the match: "my matches, newest first" needs no join
  primary key (match_id, user_id)
);
create index if not exists match_players_user on public.match_players (user_id, finished_at desc);

alter table public.matches enable row level security;
alter table public.match_players enable row level security;

-- record_match (the match and its players in one statement) lives in
-- 0006_theme_picks.sql, its newest shape: setup re-runs every migration, so it
-- is defined once.

-- A guest signed in to an account that already existed: their matches follow them.
create or replace function public.reassign_matches(from_id text, to_id text)
returns void
language sql
set search_path = public
as $$
  update public.match_players mp
  set user_id = to_id
  where mp.user_id = from_id
    and not exists (
      select 1 from public.match_players other
      where other.match_id = mp.match_id and other.user_id = to_id
    );
$$;

revoke execute on function public.reassign_matches(text, text) from public, anon, authenticated;
