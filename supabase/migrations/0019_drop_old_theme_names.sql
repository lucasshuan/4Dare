-- The deploy reading whoami_themes, whoami_theme_starters and
-- whoami_pick_feedback is live: drop the old names 0018 left for the one
-- before it. Views only; the tables keep every row.

drop view if exists public.themes;
drop view if exists public.theme_starters;
drop view if exists public.pick_feedback;
