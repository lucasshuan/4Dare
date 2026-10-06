-- Every theme has its Spanish name now (supabase/seed/whoami_themes_es.sql):
-- like the other languages', it is required.
alter table public.whoami_themes alter column es set not null;
