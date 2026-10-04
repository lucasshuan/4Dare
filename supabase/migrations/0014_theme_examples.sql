-- Three themes per set are its examples, shown when someone hovers the set
-- while setting up a room (1 = first line). Picked by hand, like the themes
-- themselves: change them with update only (AGENTS.md).

-- the theme list is hand-fed: a copy before touching it
create schema if not exists backup;
revoke all on schema backup from public, anon, authenticated;
create table if not exists backup.themes_before_0014 as table public.themes;

alter table public.themes add column if not exists example smallint
  check (example between 1 and 3);
create unique index if not exists themes_set_example
  on public.themes (theme_set, example) where example is not null;

update public.themes t
set example = e.example
from (values
  ('disney-characters', 'screen', 1),
  ('harry-potter-characters', 'screen', 2),
  ('horror-movie-characters', 'screen', 3),
  ('the-simpsons-characters', 'cartoons', 1),
  ('talking-objects', 'cartoons', 2),
  ('toy-characters', 'cartoons', 3),
  ('dragon-ball-characters', 'anime', 1),
  ('studio-ghibli-characters', 'anime', 2),
  ('magical-girls', 'anime', 3),
  ('poke-mon', 'games', 1),
  ('nintendo-characters', 'games', 2),
  ('fighting-game-characters', 'games', 3),
  ('fairy-tale-characters', 'books', 1),
  ('princesses', 'books', 2),
  ('writers', 'books', 3),
  ('superheroes', 'heroes', 1),
  ('villains', 'heroes', 2),
  ('sidekicks', 'heroes', 3),
  ('characters-who-can-fly', 'powers', 1),
  ('immortal-characters', 'powers', 2),
  ('mutants', 'powers', 3),
  ('vampires', 'myths', 1),
  ('dragons', 'myths', 2),
  ('gods', 'myths', 3),
  ('robots', 'scifi', 1),
  ('aliens', 'scifi', 2),
  ('time-travelers', 'scifi', 3),
  ('pirates', 'warriors', 1),
  ('ninjas', 'warriors', 2),
  ('knights', 'warriors', 3),
  ('cats', 'animals', 1),
  ('dinosaurs', 'animals', 2),
  ('talking-animals', 'animals', 3),
  ('female-singers', 'music', 1),
  ('rock-stars', 'music', 2),
  ('k-pop-idols', 'music', 3),
  ('comedians', 'celebs', 1),
  ('youtubers-and-streamers', 'celebs', 2),
  ('famous-people-from-the-90s', 'celebs', 3),
  ('soccer-players', 'sports', 1),
  ('race-car-drivers', 'sports', 2),
  ('fictional-athletes', 'sports', 3),
  ('kings', 'history', 1),
  ('scientists', 'history', 2),
  ('painters', 'history', 3),
  ('famous-brazilians', 'world', 1),
  ('characters-who-live-in-the-sea', 'world', 2),
  ('ice-and-snow-characters', 'world', 3),
  ('detectives', 'jobs', 1),
  ('doctors', 'jobs', 2),
  ('spies', 'jobs', 3),
  ('twins', 'family', 1),
  ('famous-couples', 'family', 2),
  ('baby-characters', 'family', 3),
  ('clumsy-characters', 'quirks', 1),
  ('characters-with-a-catchphrase', 'quirks', 2),
  ('geniuses', 'quirks', 3),
  ('characters-who-wear-a-hat', 'looks', 1),
  ('bald-characters', 'looks', 2),
  ('green-characters', 'looks', 3)
) as e (id, theme_set, example)
where t.id = e.id and t.theme_set = e.theme_set and t.example is distinct from e.example;
