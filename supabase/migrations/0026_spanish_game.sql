-- Spanish as a fourth game language: themes get a Spanish name (filled by
-- supabase/seed/whoami_themes_es.sql; null reads as the English one), and
-- starters, pickers and fit votes may be Spanish. The themes and starters are
-- hand-fed: a copy first. Safe to run again.

create schema if not exists backup;
revoke all on schema backup from public, anon, authenticated;
create table if not exists backup.themes_before_0026 as
  table public.whoami_themes;
create table if not exists backup.theme_starters_before_0026 as
  table public.whoami_theme_starters;

alter table public.whoami_themes add column if not exists es text;

alter table public.whoami_theme_starters
  drop constraint if exists whoami_theme_starters_lang_check;
alter table public.whoami_theme_starters
  add constraint whoami_theme_starters_lang_check
  check (lang in ('all', 'en', 'es', 'ja', 'pt'));

alter table public.whoami_theme_pickers
  drop constraint if exists whoami_theme_pickers_lang_check;
alter table public.whoami_theme_pickers
  add constraint whoami_theme_pickers_lang_check
  check (lang in ('en', 'es', 'ja', 'pt'));

alter table public.whoami_fit_votes
  drop constraint if exists whoami_fit_votes_lang_check;
alter table public.whoami_fit_votes
  add constraint whoami_fit_votes_lang_check
  check (lang in ('en', 'es', 'ja', 'pt'));
