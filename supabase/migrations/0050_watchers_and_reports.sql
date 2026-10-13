-- Watchers and reports.
--
-- Whoever watches a room has no seat: they live here, not in rooms.state, so
-- thousands can watch a match (a streamer's audience) without every room write
-- carrying them and without racing the game's compare-and-swap. One row per
-- player: watching a room stops watching any other. A page that stays open
-- touches seen_at as it polls; one that closes sets gone_at. The server leaves
-- out rows gone past a short grace or not seen for minutes, and prunes them.
--
-- A report is what a player says about someone in a room (spam, offence,
-- cheating). It keeps, for good, what the person wrote in that room's chat
-- when they were reported: a room's chat goes when the room closes. Nothing
-- reads reports yet; a moderation panel will.
--
-- Written and read by the server only (service key). Idempotent.

create table if not exists public.room_watchers (
  player_id text primary key,
  room_code text not null references public.rooms (code) on delete cascade,
  person jsonb not null,                 -- id, isGuest, name, guestNumber, avatar, lang
  position double precision not null,    -- the host's order, lowest first
  joined_at timestamptz not null default now(),
  seen_at timestamptz not null default now(),
  gone_at timestamptz                    -- the page closed (it may just be reloading)
);

create index if not exists room_watchers_room
  on public.room_watchers (room_code, position);
create index if not exists room_watchers_seen
  on public.room_watchers (seen_at);

alter table public.room_watchers enable row level security;
revoke all on public.room_watchers from anon, authenticated;

create table if not exists public.player_reports (
  id bigint generated always as identity primary key,
  reporter_id text not null,
  target_id text not null,
  target jsonb not null,                 -- the person as the room showed them
  room_code text not null,               -- no foreign key: the report outlives the room
  reason text not null check (reason in ('spam', 'offensive', 'cheating', 'other')),
  note text check (note is null or char_length(note) <= 300),
  lines jsonb not null default '[]',     -- what they wrote in the room's chat, oldest first
  created_at timestamptz not null default now(),
  unique (reporter_id, target_id, room_code)
);

create index if not exists player_reports_target
  on public.player_reports (target_id, created_at desc);
create index if not exists player_reports_reporter
  on public.player_reports (reporter_id, created_at desc);

alter table public.player_reports enable row level security;
revoke all on public.player_reports from anon, authenticated;

-- A guest signed in to an account: whatever they were reported for, and
-- whatever they reported, follows them.
create or replace function public.reassign_player_reports(p_from text, p_to text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_from = p_to then
    return;
  end if;
  update public.player_reports
     set target_id = p_to
   where target_id = p_from
     and not exists (
       select 1 from public.player_reports r
        where r.reporter_id = player_reports.reporter_id
          and r.target_id = p_to
          and r.room_code = player_reports.room_code
     );
  update public.player_reports
     set reporter_id = p_to
   where reporter_id = p_from
     and not exists (
       select 1 from public.player_reports r
        where r.reporter_id = p_to
          and r.target_id = player_reports.target_id
          and r.room_code = player_reports.room_code
     );
end;
$$;

revoke all on function public.reassign_player_reports(text, text)
  from public, anon, authenticated;
