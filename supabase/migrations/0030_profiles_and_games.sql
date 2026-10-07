-- Public profiles, ready for more than one game.
--
-- profiles: the @handle of the link, when the account was made, the cover, the
-- quote, the showcase (characters with a line each), "about you", who sees
-- what, the settings that follow the account.
-- matches.game and match_players: what every game has (place, time, the XP the
-- match gave); what only "Who am I?" has moves to whoami_match_players.
-- user_badges: when a badge was earned (the rules live in the app).
-- profile_comments: the profile's mural.
--
-- Only losable tables change; the library and the themes are only read. Safe
-- to run again (setup re-runs every migration).

-- profiles ------------------------------------------------------------------

alter table public.profiles add column if not exists handle text;
alter table public.profiles add column if not exists handle_changed_at timestamptz;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists quote text;
alter table public.profiles add column if not exists banner jsonb;
alter table public.profiles add column if not exists accent text;
alter table public.profiles add column if not exists showcase jsonb not null default '[]';
alter table public.profiles add column if not exists about jsonb not null default '{}';
alter table public.profiles add column if not exists privacy jsonb not null default '{}';
alter table public.profiles add column if not exists settings jsonb not null default '{}';

do $$ begin
  alter table public.profiles add constraint profiles_handle_shape
    check (handle ~ '^[a-z0-9_]{3,20}$');
exception when duplicate_object then null;
end $$;
do $$ begin
  alter table public.profiles add constraint profiles_quote_length
    check (char_length(quote) <= 80);
exception when duplicate_object then null;
end $$;
create unique index if not exists profiles_handle on public.profiles (handle);

-- the accounts that came before: made when their user was
update public.profiles p
set created_at = u.created_at
from auth.users u
where u.id = p.id and p.created_at > u.created_at;

-- and a handle from their name (the app gives one to every new account)
with slugs as (
  select
    id,
    coalesce(
      nullif(left(regexp_replace(
        translate(lower(coalesce(name, '')),
          'áàâãäåéèêëíìîïóòôõöúùûüçñ', 'aaaaaaeeeeiiiiooooouuuucn'),
        '[^a-z0-9_]', '', 'g'), 16), ''),
      'player'
    ) as base
  from public.profiles
  where handle is null
),
numbered as (
  select
    s.id,
    s.base,
    row_number() over (partition by s.base order by s.id) as n
  from slugs s
)
update public.profiles p
set handle = case
  when length(n.base) >= 3 and n.n = 1
    and not exists (select 1 from public.profiles o where o.handle = n.base)
  then n.base
  else left(rpad(n.base, 3, '_'), 13) || '_' || substr(replace(p.id::text, '-', ''), 1, 6)
end
from numbered n
where n.id = p.id;

-- matches: which game -------------------------------------------------------

alter table public.matches add column if not exists game text not null default 'who-am-i';

-- match_players: what every game has, plus the XP the match gave ---------------

alter table public.match_players add column if not exists xp integer not null default 0;

-- "Who am I?"'s own part of a player's match
create table if not exists public.whoami_match_players (
  match_id text not null,
  user_id text not null,
  picked_by text,
  character_id text,
  character_name text,
  character_origin text,
  auto_picked boolean not null default false,
  result text not null check (result in ('discovered', 'gave_up', 'left', 'not_found')),
  discovered_at integer,
  questions integer not null default 0,
  guesses integer not null default 0,
  primary key (match_id, user_id),
  -- a guest's matches moving to their account carry this part along
  foreign key (match_id, user_id) references public.match_players (match_id, user_id)
    on delete cascade on update cascade
);
create index if not exists whoami_match_players_picked_by
  on public.whoami_match_players (picked_by);
alter table public.whoami_match_players enable row level security;

-- copy the old columns over, once per row. They stay on match_players, unused
-- and nullable, until a later migration drops them.
do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'match_players' and column_name = 'character_id'
  ) then
    -- XP for the matches played before there was XP: 10 for finishing (not
    -- leaving), 15 for first place, 10 for discovering, 5 for the day's first
    -- match (src/game/profile/xp.ts has the same numbers)
    update public.match_players mp
    set xp = case when mp.result = 'left' then 0 else 10 end
      + case when mp.place = 1 then 15 else 0 end
      + case when mp.result = 'discovered' then 10 else 0 end
      + case when mp.finished_at = (
          select min(o.finished_at) from public.match_players o
          where o.user_id = mp.user_id
            and (o.finished_at at time zone 'utc')::date = (mp.finished_at at time zone 'utc')::date
        ) then 5 else 0 end
    where mp.result is not null
      and not exists (
        select 1 from public.whoami_match_players w
        where w.match_id = mp.match_id and w.user_id = mp.user_id
      );

    insert into public.whoami_match_players (
      match_id, user_id, picked_by, character_id, character_name, character_origin,
      auto_picked, result, discovered_at, questions, guesses
    )
    select match_id, user_id, picked_by, character_id, character_name, character_origin,
      auto_picked, result, discovered_at, questions, guesses
    from public.match_players
    where result is not null
    on conflict (match_id, user_id) do nothing;

    alter table public.match_players
      alter column auto_picked drop not null,
      alter column result drop not null,
      alter column questions drop not null,
      alter column guesses drop not null;
  end if;
end $$;

-- badges: when each was earned ------------------------------------------------

create table if not exists public.user_badges (
  user_id text not null,
  badge text not null,
  -- null for the badges every game shares
  game text,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge)
);
alter table public.user_badges enable row level security;

-- the mural -----------------------------------------------------------------

create table if not exists public.profile_comments (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  author_id uuid not null references public.profiles (id) on delete cascade,
  -- a reply hangs under one top line, one level deep
  parent_id bigint references public.profile_comments (id) on delete cascade,
  body text not null check (char_length(body) between 1 and 200),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists profile_comments_profile
  on public.profile_comments (profile_id, created_at desc);
create index if not exists profile_comments_author
  on public.profile_comments (author_id, created_at desc);
create index if not exists profile_comments_parent
  on public.profile_comments (parent_id);
alter table public.profile_comments enable row level security;

create table if not exists public.profile_comment_reports (
  comment_id bigint not null references public.profile_comments (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, reporter_id)
);
create index if not exists profile_comment_reports_reporter
  on public.profile_comment_reports (reporter_id);
alter table public.profile_comment_reports enable row level security;

-- A line on a mural, refused past 8 lines a minute or 60 a day from one author
-- (across server instances); the new id, or null when refused.
create or replace function public.post_profile_comment(
  p_profile uuid, p_author uuid, p_parent bigint, p_body text
)
returns bigint
language plpgsql
set search_path = public
as $$
declare
  v_id bigint;
begin
  -- a reply answers a top line of the same mural
  if p_parent is not null and not exists (
    select 1 from public.profile_comments
    where id = p_parent and profile_id = p_profile and parent_id is null
  ) then
    raise exception 'bad parent';
  end if;
  perform pg_advisory_xact_lock(hashtext('profile_comment:' || p_author::text));
  if (select count(*) from public.profile_comments
      where author_id = p_author and created_at > now() - interval '1 minute') >= 8
    or (select count(*) from public.profile_comments
      where author_id = p_author and created_at > now() - interval '1 day') >= 60
  then
    return null;
  end if;
  insert into public.profile_comments (profile_id, author_id, parent_id, body)
  values (p_profile, p_author, p_parent, p_body)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.post_profile_comment(uuid, uuid, bigint, text)
  from public, anon, authenticated;

-- One report per person; the third hides the line. Whether it is hidden now.
create or replace function public.report_profile_comment(p_comment bigint, p_reporter uuid)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_hidden boolean;
begin
  insert into public.profile_comment_reports (comment_id, reporter_id)
  values (p_comment, p_reporter)
  on conflict do nothing;
  update public.profile_comments c
  set hidden = true
  where c.id = p_comment
    and (select count(*) from public.profile_comment_reports r where r.comment_id = p_comment) >= 3;
  select hidden into v_hidden from public.profile_comments where id = p_comment;
  return coalesce(v_hidden, false);
end;
$$;
revoke execute on function public.report_profile_comment(bigint, uuid)
  from public, anon, authenticated;

-- record_match: the match, every player's part and "Who am I?"'s part -------

create or replace function public.record_match(m jsonb)
returns void
language plpgsql
set search_path = public
as $$
declare
  v_finished timestamptz;
begin
  insert into public.matches (id, room_code, round, theme, theme_id, started_at, finished_at, game)
  values (
    m->>'id',
    m->>'roomCode',
    (m->>'round')::integer,
    m->'theme',
    m->>'themeId',
    to_timestamp((m->>'startedAt')::bigint / 1000.0),
    to_timestamp((m->>'finishedAt')::bigint / 1000.0),
    coalesce(m->>'game', 'who-am-i')
  )
  on conflict (id) do nothing
  returning finished_at into v_finished;
  if v_finished is null then
    return;
  end if;

  -- the XP the app worked out, plus the day's-first bonus it names
  insert into public.match_players (match_id, user_id, was_guest, lang, place, time_ms, finished_at, xp)
  select
    m->>'id',
    p->>'userId',
    (p->>'wasGuest')::boolean,
    p->>'lang',
    (p->>'place')::integer,
    (p->>'timeMs')::integer,
    v_finished,
    coalesce((p->>'xp')::integer, 0)
      + case when not exists (
          select 1 from public.match_players o
          where o.user_id = p->>'userId'
            and (o.finished_at at time zone 'utc')::date = (v_finished at time zone 'utc')::date
        ) then coalesce((m->>'dayBonus')::integer, 0) else 0 end
  from jsonb_array_elements(m->'players') as p;

  if coalesce(m->>'game', 'who-am-i') <> 'who-am-i' then
    return;
  end if;

  insert into public.whoami_match_players (
    match_id, user_id, picked_by, character_id, character_name, character_origin,
    auto_picked, result, discovered_at, questions, guesses
  )
  select
    m->>'id',
    p->>'userId',
    p->>'pickedById',
    p->>'characterId',
    p->>'characterName',
    p->>'characterOrigin',
    coalesce((p->>'autoPicked')::boolean, false),
    p->>'result',
    (p->>'discoveredAt')::integer,
    (p->>'questions')::integer,
    (p->>'guesses')::integer
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
revoke execute on function public.record_match(jsonb) from public, anon, authenticated;

-- A guest signed in to an account that already existed: their matches, picks,
-- votes and badges follow them (the "Who am I?" part rides the foreign key).
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
  update public.whoami_match_players w
  set picked_by = to_id
  where w.picked_by = from_id;
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
  update public.user_badges b
  set user_id = to_id
  where b.user_id = from_id
    and not exists (
      select 1 from public.user_badges other
      where other.user_id = to_id and other.badge = b.badge
    );
$$;
revoke execute on function public.reassign_matches(text, text) from public, anon, authenticated;

-- A player's matches since a time, newest first, as the profile reads them:
-- every game's part, who else played (and where they ended), and the game's
-- own part ("Who am I?": their card and the card they picked for someone).
create or replace function public.player_matches(p_user text, p_since timestamptz)
returns table (
  match_id text,
  game text,
  finished_at timestamptz,
  lang text,
  place integer,
  time_ms integer,
  xp integer,
  others jsonb,
  details jsonb
)
language sql
stable
set search_path = public
as $$
  select
    mp.match_id,
    m.game,
    mp.finished_at,
    mp.lang,
    mp.place,
    mp.time_ms,
    mp.xp,
    coalesce((
      select jsonb_agg(jsonb_build_object('id', o.user_id, 'place', o.place, 'guest', o.was_guest))
      from public.match_players o
      where o.match_id = mp.match_id and o.user_id <> mp.user_id
    ), '[]'::jsonb),
    case m.game when 'who-am-i' then (
      select jsonb_build_object(
        'themeId', m.theme_id,
        'theme', m.theme,
        'result', w.result,
        'questions', w.questions,
        'guesses', w.guesses,
        'discoveredAt', w.discovered_at,
        'characterId', w.character_id,
        'characterName', w.character_name,
        'pickedBy', w.picked_by,
        'gave', (
          select jsonb_build_object(
            'to', g.user_id,
            'characterId', g.character_id,
            'characterName', g.character_name,
            'result', g.result,
            'questions', g.questions
          )
          from public.whoami_match_players g
          where g.match_id = mp.match_id and g.picked_by = mp.user_id
            and not g.auto_picked
          limit 1
        )
      )
      from public.whoami_match_players w
      where w.match_id = mp.match_id and w.user_id = mp.user_id
    ) end
  from public.match_players mp
  join public.matches m on m.id = mp.match_id
  where mp.user_id = p_user and mp.finished_at >= p_since
  order by mp.finished_at desc;
$$;
revoke execute on function public.player_matches(text, timestamptz) from public, anon, authenticated;

-- Every game's totals for a player, all time: one row per game.
create or replace function public.player_totals(p_user text)
returns table (game text, matches integer, wins integer, time_ms bigint, xp integer, first_at timestamptz)
language sql
stable
set search_path = public
as $$
  select
    m.game,
    count(*)::integer,
    count(*) filter (where mp.place = 1)::integer,
    coalesce(sum(mp.time_ms), 0)::bigint,
    coalesce(sum(mp.xp), 0)::integer,
    min(mp.finished_at)
  from public.match_players mp
  join public.matches m on m.id = mp.match_id
  where mp.user_id = p_user
  group by m.game;
$$;
revoke execute on function public.player_totals(text) from public, anon, authenticated;
