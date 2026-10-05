-- Who fits a theme depends on the language: a Brazilian's "famous people of
-- the 90s" are not a Japanese player's. Three sources, weighed in
-- src/server/theme-picks.ts:
--   starters  a language may add its own (lang 'pt', 'ja', ...), ranked ahead
--             of the shared ones (lang 'all'); hand-fed, insert only
--   pickers   each player once per theme and character, in the picker's
--             language; a pick the hand or the dice offered is "suggested"
--   votes     "did it fit the theme?", once per player, in their language
-- The pick screen reads pickers and votes summed per character and language
-- (whoami_theme_stats). Pictures change too: a pick of the cover as shown
-- (kept) counts less than one chosen on purpose, and reports weigh against
-- a picture, so the library's own can be overtaken (character_images.score).
--
-- The deploy before this one still reads popular_picks, theme_pick_scores and
-- whoami_pick_feedback, and records pictures with the three-argument
-- record_image_pick: they stay until it is gone (the next migration drops
-- them). No row is deleted; everything is safe to run again.

-- the starters and the library's pictures are hand-fed: a copy before touching them
create schema if not exists backup;
revoke all on schema backup from public, anon, authenticated;
create table if not exists backup.theme_starters_before_0022 as
  table public.whoami_theme_starters;
create table if not exists backup.character_images_before_0022 as
  select id, character_id, url, created_by, status, picks, bonus
  from public.character_images
  where created_by is null;

-- A library id without its language ("pt-wd-Q302" -> "wd-Q302"); players'
-- characters ("u-<uuid>") stay as they are.
create or replace function public.whoami_pick_key(p_id text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_id ~ '^(en|pt|ja)-(wd-Q|al-)[0-9]+$' then substr(p_id, 4)
    else p_id
  end;
$$;

-- --- starters per language ---------------------------------------------------

alter table public.whoami_theme_starters
  add column if not exists lang text not null default 'all';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'whoami_theme_starters_lang_check'
  ) then
    alter table public.whoami_theme_starters
      add constraint whoami_theme_starters_lang_check
      check (lang in ('all', 'en', 'pt', 'ja'));
  end if;
  -- one row per theme, language and character; positions count within a language
  if not exists (
    select 1 from pg_constraint
    where conname = 'whoami_theme_starters_pkey'
      and pg_get_constraintdef(oid) like '%lang%'
  ) then
    alter table public.whoami_theme_starters
      drop constraint if exists whoami_theme_starters_pkey;
    alter table public.whoami_theme_starters
      add constraint whoami_theme_starters_pkey
      primary key (theme_id, lang, character_id);
  end if;
  alter table public.whoami_theme_starters
    drop constraint if exists whoami_theme_starters_theme_id_position_key;
  if not exists (
    select 1 from pg_constraint
    where conname = 'whoami_theme_starters_theme_id_lang_position_key'
  ) then
    alter table public.whoami_theme_starters
      add constraint whoami_theme_starters_theme_id_lang_position_key
      unique (theme_id, lang, position);
  end if;
end $$;

-- --- pickers -----------------------------------------------------------------

create table if not exists public.whoami_theme_pickers (
  theme_id text not null,
  character_id text not null,
  picker_id text not null,
  lang text not null check (lang in ('en', 'pt', 'ja')),
  suggested boolean not null default false,
  picked_at timestamptz not null default now(),
  primary key (theme_id, character_id, picker_id)
);
create index if not exists whoami_theme_pickers_picker
  on public.whoami_theme_pickers (picker_id);
alter table public.whoami_theme_pickers enable row level security;
revoke all on public.whoami_theme_pickers from anon, authenticated;

-- Matches saved before: their pickers, in the picker's language (the clock's
-- picks and stand-ins left out). Whether the hand offered it is unknown.
insert into public.whoami_theme_pickers
  (theme_id, character_id, picker_id, lang, suggested, picked_at)
select distinct on (m.theme_id, public.whoami_pick_key(mp.character_id), mp.picked_by)
  m.theme_id,
  public.whoami_pick_key(mp.character_id),
  mp.picked_by,
  coalesce(picker.lang, substring(mp.character_id from '^(en|pt|ja)-'), mp.lang),
  false,
  mp.finished_at
from public.match_players mp
join public.matches m on m.id = mp.match_id
left join public.match_players picker
  on picker.match_id = mp.match_id and picker.user_id = mp.picked_by
where m.theme_id is not null
  and mp.picked_by is not null
  and mp.character_id is not null
  and mp.character_id not like 'emergency-%'
  and mp.character_id not like 'draft-%'
  and not mp.auto_picked
order by m.theme_id, public.whoami_pick_key(mp.character_id), mp.picked_by, mp.finished_at
on conflict do nothing;

-- --- votes -------------------------------------------------------------------

create table if not exists public.whoami_fit_votes (
  theme_id text not null,
  character_id text not null,
  voter_id text not null,
  lang text not null check (lang in ('en', 'pt', 'ja')),
  fits boolean not null,
  voted_at timestamptz not null default now(),
  primary key (theme_id, character_id, voter_id)
);
create index if not exists whoami_fit_votes_voter
  on public.whoami_fit_votes (voter_id);
alter table public.whoami_fit_votes enable row level security;
revoke all on public.whoami_fit_votes from anon, authenticated;

-- the old answers ("liked" meant it fits), in the language the voter last played
do $$
begin
  if to_regclass('public.whoami_pick_feedback') is not null then
    insert into public.whoami_fit_votes
      (theme_id, character_id, voter_id, lang, fits, voted_at)
    select
      f.theme_id,
      f.character_id,
      f.user_id,
      coalesce(
        (select mp.lang from public.match_players mp
         where mp.user_id = f.user_id
         order by mp.finished_at desc limit 1),
        'en'
      ),
      f.liked,
      f.created_at
    from public.whoami_pick_feedback f
    on conflict do nothing;
  end if;
end $$;

-- --- saving a match ----------------------------------------------------------

-- The match, its players, and each picker once per theme and character. A
-- pick of their own replaces one the hand or the dice offered.
create or replace function public.record_match(m jsonb)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_finished timestamptz;
begin
  insert into public.matches (id, room_code, round, theme, theme_id, started_at, finished_at)
  values (
    m->>'id',
    m->>'roomCode',
    (m->>'round')::integer,
    m->'theme',
    m->>'themeId',
    to_timestamp((m->>'startedAt')::bigint / 1000.0),
    to_timestamp((m->>'finishedAt')::bigint / 1000.0)
  )
  on conflict (id) do nothing
  returning finished_at into v_finished;
  if v_finished is null then
    return;
  end if;

  insert into public.match_players (
    match_id, user_id, was_guest, lang, picked_by, character_id, character_name,
    character_origin, auto_picked, result, place, discovered_at, questions, guesses,
    time_ms, finished_at
  )
  select
    m->>'id',
    p->>'userId',
    (p->>'wasGuest')::boolean,
    p->>'lang',
    p->>'pickedById',
    p->>'characterId',
    p->>'characterName',
    p->>'characterOrigin',
    coalesce((p->>'autoPicked')::boolean, false),
    p->>'result',
    (p->>'place')::integer,
    (p->>'discoveredAt')::integer,
    (p->>'questions')::integer,
    (p->>'guesses')::integer,
    (p->>'timeMs')::integer,
    v_finished
  from jsonb_array_elements(m->'players') as p;

  insert into public.whoami_theme_pickers
    (theme_id, character_id, picker_id, lang, suggested, picked_at)
  select distinct on (public.whoami_pick_key(p->>'characterId'), p->>'pickedById')
    m->>'themeId',
    public.whoami_pick_key(p->>'characterId'),
    p->>'pickedById',
    coalesce(p->>'pickerLang', p->>'lang'),
    coalesce((p->>'suggested')::boolean, false),
    v_finished
  from jsonb_array_elements(m->'players') as p
  where m->>'themeId' is not null
    and p->>'pickedById' is not null
    and p->>'characterId' is not null
    and p->>'characterId' not like 'emergency-%'
    and p->>'characterId' not like 'draft-%'
    and not coalesce((p->>'autoPicked')::boolean, false)
  order by public.whoami_pick_key(p->>'characterId'), p->>'pickedById'
  on conflict (theme_id, character_id, picker_id) do update
    set suggested = false, lang = excluded.lang, picked_at = excluded.picked_at
    where whoami_theme_pickers.suggested and not excluded.suggested;
end;
$$;

-- A guest signed in: their matches, picks and votes become the account's
-- (where the account has its own, the guest's stay where they are, like
-- their matches).
create or replace function public.reassign_matches(from_id text, to_id text)
returns void
language sql
set search_path = public
as $$
  update public.match_players mp
  set user_id = to_id
  where mp.user_id = from_id
    and not exists (
      select 1 from public.match_players other
      where other.match_id = mp.match_id and other.user_id = to_id
    );
  update public.whoami_theme_pickers p
  set picker_id = to_id
  where p.picker_id = from_id
    and not exists (
      select 1 from public.whoami_theme_pickers other
      where other.theme_id = p.theme_id
        and other.character_id = p.character_id
        and other.picker_id = to_id
    );
  update public.whoami_fit_votes v
  set voter_id = to_id
  where v.voter_id = from_id
    and not exists (
      select 1 from public.whoami_fit_votes other
      where other.theme_id = v.theme_id
        and other.character_id = v.character_id
        and other.voter_id = to_id
    );
$$;

-- --- reading a theme ---------------------------------------------------------

-- Per character and language: pickers on their own, pickers the hand or the
-- dice offered it to, and votes. The busiest first, at most p_limit rows.
create or replace function public.whoami_theme_stats(p_theme text, p_limit integer)
returns table (
  character_id text,
  lang text,
  picks integer,
  suggested integer,
  fits integer,
  misfits integer
)
language sql
stable
set search_path = ''
as $$
  with picked as (
    select
      p.character_id,
      p.lang,
      (count(*) filter (where not p.suggested))::integer as picks,
      (count(*) filter (where p.suggested))::integer as suggested
    from public.whoami_theme_pickers p
    where p.theme_id = p_theme
    group by p.character_id, p.lang
  ),
  voted as (
    select
      v.character_id,
      v.lang,
      (count(*) filter (where v.fits))::integer as fits,
      (count(*) filter (where not v.fits))::integer as misfits
    from public.whoami_fit_votes v
    where v.theme_id = p_theme
    group by v.character_id, v.lang
  )
  select
    character_id,
    lang,
    coalesce(picked.picks, 0),
    coalesce(picked.suggested, 0),
    coalesce(voted.fits, 0),
    coalesce(voted.misfits, 0)
  from picked
  full join voted using (character_id, lang)
  order by
    coalesce(picked.picks, 0) + coalesce(picked.suggested, 0) + coalesce(voted.fits, 0) desc,
    character_id,
    lang
  limit p_limit;
$$;

-- --- pictures ----------------------------------------------------------------

-- chosen: the player put this picture on their card (a tray choice or their
-- own upload); not chosen: they kept the cover as the card showed it.
alter table public.character_image_picks
  add column if not exists chosen boolean not null default true;
alter table public.character_images
  add column if not exists keeps integer not null default 0;
alter table public.character_images
  add column if not exists reports integer not null default 0;
-- The cover is the best score: head start, pickers who chose it, the square
-- root of those who kept it (a cover shown by default can't snowball), two
-- off per report.
alter table public.character_images
  add column if not exists score double precision
  generated always as (bonus + picks + sqrt(keeps) - 2 * reports) stored;
create index if not exists character_images_best
  on public.character_images (character_id, score desc, created_at)
  where status = 'active';

update public.character_images i
set reports = r.n
from (
  select image_id, count(*)::integer as n
  from public.character_image_reports
  group by image_id
) r
where i.id = r.image_id and i.reports <> r.n;

create or replace function public.refresh_character_cover(p_character text)
returns void
language sql
set search_path = ''
as $$
  update public.characters c
  set image_url = best.url
  from (
    select (
      select i.url
      from public.character_images i
      where i.character_id = p_character and i.status = 'active'
      order by i.score desc, i.created_at
      limit 1
    ) as url
  ) best
  where c.id = p_character and c.image_url is distinct from best.url;
$$;

-- A player confirmed a card with this picture: once per player, as chosen or
-- kept; choosing it later upgrades a keep. The cover follows the score.
-- (The three-argument one, the previous deploy's, still counts every pick
-- as chosen.)
create or replace function public.record_image_pick(
  p_character text,
  p_url text,
  p_player text,
  p_chosen boolean
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_image uuid;
begin
  select id into v_image
  from public.character_images
  where character_id = p_character and url = p_url;
  if v_image is null then
    return;
  end if;
  insert into public.character_image_picks (image_id, player_id, chosen)
  values (v_image, p_player, p_chosen)
  on conflict do nothing;
  if found then
    update public.character_images
    set picks = picks + case when p_chosen then 1 else 0 end,
        keeps = keeps + case when p_chosen then 0 else 1 end
    where id = v_image;
  elsif p_chosen then
    update public.character_image_picks
    set chosen = true
    where image_id = v_image and player_id = p_player and not chosen;
    if not found then
      return;
    end if;
    update public.character_images
    set picks = picks + 1, keeps = greatest(keeps - 1, 0)
    where id = v_image;
  else
    return;
  end if;
  perform public.refresh_character_cover(p_character);
end;
$$;

-- One report per player and picture. Every report lowers the score; at
-- `p_hide_at` a player's picture is hidden (the library's never is). The
-- cover follows. Returns the picture's status.
create or replace function public.report_character_image(
  p_image uuid,
  p_reporter text,
  p_hide_at integer
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
  v_character text;
  v_status text;
begin
  insert into public.character_image_reports (image_id, reporter_id)
  values (p_image, p_reporter)
  on conflict do nothing;
  select count(*) into v_count
  from public.character_image_reports
  where image_id = p_image;
  update public.character_images
  set reports = v_count,
      status = case
        when status <> 'hidden' and created_by is not null and v_count >= p_hide_at
          then 'hidden'
        else status
      end
  where id = p_image
  returning character_id, status into v_character, v_status;
  if v_character is not null then
    perform public.refresh_character_cover(v_character);
  end if;
  return v_status;
end;
$$;

revoke all on function public.whoami_pick_key(text)
  from public, anon, authenticated;
revoke all on function public.record_match(jsonb)
  from public, anon, authenticated;
revoke all on function public.reassign_matches(text, text)
  from public, anon, authenticated;
revoke all on function public.whoami_theme_stats(text, integer)
  from public, anon, authenticated;
revoke all on function public.refresh_character_cover(text)
  from public, anon, authenticated;
revoke all on function public.record_image_pick(text, text, text, boolean)
  from public, anon, authenticated;
revoke all on function public.report_character_image(uuid, text, integer)
  from public, anon, authenticated;
