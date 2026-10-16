-- Who wrote a Who am I? theme.
--
-- Questions and missions already keep their author (created_by); themes
-- didn't. Same column here: the profile that wrote it, null when nobody is
-- named. A theme the Workshop accepts keeps its suggester.
--
-- Touches the hand-fed themes table, so a copy of it is kept first
-- (whoami_themes_backup_0061). Idempotent.

create table if not exists public.whoami_themes_backup_0061 as
  select * from public.whoami_themes;
alter table public.whoami_themes_backup_0061 enable row level security;
revoke all on public.whoami_themes_backup_0061 from anon, authenticated;

alter table public.whoami_themes
  add column if not exists created_by uuid
    references public.profiles (id) on delete set null;
