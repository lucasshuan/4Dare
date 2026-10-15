-- What the control panel changes without a deploy.
--
-- Each save is a new row: `values` holds only what differs from the code's
-- defaults (src/game/tunables.ts lists what can be set), by area: `tunes`
-- (scene lengths, clocks, room defaults and limits, XP, which games are
-- open), `music` (each track's level and loop, which track plays when) and
-- `scenes` (the sounds of each scene). The newest row is the one in force;
-- going back publishes an old row's values as a new one. A room copies the
-- values when a match starts, so a save never reaches a match being played.
--
-- Written and read by the server only (service key). Idempotent.

create table if not exists public.game_config (
  id bigint generated always as identity primary key,
  "values" jsonb not null default '{}'::jsonb,
  note text check (note is null or char_length(note) <= 300),
  author_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.game_config enable row level security;
revoke all on public.game_config from anon, authenticated;

-- version 1: nothing changed yet, everything as the code has it
insert into public.game_config ("values", note)
select '{}'::jsonb, 'Os valores do código'
where not exists (select 1 from public.game_config);
