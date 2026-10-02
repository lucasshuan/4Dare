-- What players said about a character the "random" button drew for a theme:
-- liked (it fits) or not. One answer per player, theme and character; a new
-- answer replaces the old one. The draw weighs picks and likes up and each
-- "no" down (see src/server/theme-picks.ts). character_id is language-free
-- ("wd-Q302", "al-40", "u-<uuid>"), like popular_picks returns.

create table if not exists public.pick_feedback (
  theme_id text not null,
  character_id text not null,
  user_id text not null,
  liked boolean not null,
  created_at timestamptz not null default now(),
  primary key (theme_id, character_id, user_id)
);

alter table public.pick_feedback enable row level security;

-- The most picked characters of a theme with their likes and dislikes.
create or replace function public.theme_pick_scores(p_theme text, p_limit integer)
returns table (id text, picks bigint, likes bigint, dislikes bigint)
language sql
stable
set search_path = public
as $$
  select
    p.id,
    p.picks,
    count(f.user_id) filter (where f.liked) as likes,
    count(f.user_id) filter (where not f.liked) as dislikes
  from public.popular_picks(p_theme, p_limit) p
  left join public.pick_feedback f on f.theme_id = p_theme and f.character_id = p.id
  group by p.id, p.picks
  order by p.picks desc, p.id;
$$;

revoke execute on function public.theme_pick_scores(text, integer) from public, anon, authenticated;
