-- About five famous, common characters for each theme, picked by hand: the
-- obvious picks most players know. They back the "fits the theme" examples
-- shown when the theme is revealed and the hand of suggestions on the pick
-- screen. They are kept apart from what players picked (popular_picks) and
-- liked (pick_feedback). character_id is a language-free library id
-- ("wd-Q302", "al-40"); position 1 and 2 are the clearest fits. The rows come
-- from supabase/seed/theme_starters.sql. Read only by the server.

create table if not exists public.theme_starters (
  theme_id text not null references public.themes (id) on delete cascade,
  character_id text not null references public.characters (id) on delete cascade,
  position smallint not null check (position between 1 and 8),
  primary key (theme_id, character_id),
  unique (theme_id, position)
);

alter table public.theme_starters enable row level security;
