-- The deploy reading whoami_theme_stats and whoami_fit_votes is live: drop
-- what 0022 left for the one before it. The old answers were copied into
-- whoami_fit_votes by 0022; the old picks live on in match_players.

drop function if exists public.theme_pick_scores(text, integer);
drop function if exists public.popular_picks(text, integer);
drop function if exists public.record_image_pick(text, text, text);
-- 0019's view over the old table, where it is still there
drop view if exists public.pick_feedback;
drop table if exists public.whoami_pick_feedback;
