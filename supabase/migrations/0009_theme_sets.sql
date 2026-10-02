-- Each theme belongs to a theme set (src/game/theme-sets.ts); the host picks
-- which sets a vote draws from. `pnpm seed` fills it from data/themes.json, and
-- the AI names the set of the themes it invents.

alter table public.themes add column if not exists theme_set text;
create index if not exists themes_set on public.themes (theme_set) where active;
