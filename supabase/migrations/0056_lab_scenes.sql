-- The lab's saved scenes.
--
-- The control panel's lab plays a whole match on a made-up clock with bots in
-- the seats. A saved scene keeps everything that match needs to come back
-- exactly: its settings, what the server dealt for it (the kit), the moves
-- made by hand, the moment and the seat on screen, plus a name and a note. A
-- link to the lab names a scene, so it opens the same match, frame for frame.
--
-- Written and read by the server only (service key). Idempotent.

create table if not exists public.lab_scenes (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 80),
  game text not null,
  params jsonb not null,
  note text check (note is null or char_length(note) <= 500),
  author_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists lab_scenes_recent
  on public.lab_scenes (created_at desc);

alter table public.lab_scenes enable row level security;
revoke all on public.lab_scenes from anon, authenticated;
