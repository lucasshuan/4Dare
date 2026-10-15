-- The number of a guest who played a match.
--
-- A guest has no profile: their name and their creature come from their
-- number (src/game/guest-names.ts). match_players kept only their id, so the
-- control panel could not tell who they were. record_match now keeps the
-- number too (null for an account). The rest of record_match is unchanged.
--
-- Written and read by the server only (service key). Idempotent.

alter table public.match_players
  add column if not exists guest_number integer;

create or replace function public.record_match(m jsonb)
returns void
language plpgsql
set search_path = public
as $function$
declare
  v_finished timestamptz;
begin
  insert into public.matches (id, room_code, round, theme, theme_id, started_at, finished_at, game, mode)
  values (
    m->>'id',
    m->>'roomCode',
    (m->>'round')::integer,
    m->'theme',
    m->>'themeId',
    to_timestamp((m->>'startedAt')::bigint / 1000.0),
    to_timestamp((m->>'finishedAt')::bigint / 1000.0),
    coalesce(m->>'game', 'who-am-i'),
    m->>'mode'
  )
  on conflict (id) do nothing
  returning finished_at into v_finished;
  if v_finished is null then
    return;
  end if;

  insert into public.match_players (match_id, user_id, was_guest, guest_number, lang, place, time_ms, finished_at, xp, role)
  select
    m->>'id',
    p->>'userId',
    (p->>'wasGuest')::boolean,
    (p->>'guestNumber')::integer,
    p->>'lang',
    (p->>'place')::integer,
    (p->>'timeMs')::integer,
    v_finished,
    coalesce((p->>'xp')::integer, 0)
      + case when not exists (
          select 1 from public.match_players o
          where o.user_id = p->>'userId'
            and (o.finished_at at time zone 'utc')::date = (v_finished at time zone 'utc')::date
        ) then coalesce((m->>'dayBonus')::integer, 0) else 0 end,
    coalesce(p->>'role', 'player')
  from jsonb_array_elements(m->'players') as p;

  if m->>'game' = 'impostor' then
    insert into public.impostor_match_players (
      match_id, user_id, impostor, out_round, left_match, right_votes, guess, guess_hit,
      first_right, votes_taken, character_name
    )
    select
      m->>'id',
      p->>'userId',
      coalesce((p->'impostor'->>'impostor')::boolean, false),
      (p->'impostor'->>'outRound')::integer,
      coalesce((p->'impostor'->>'left')::boolean, false),
      coalesce((p->'impostor'->>'rightVotes')::integer, 0),
      p->'impostor'->>'guess',
      (p->'impostor'->>'guessHit')::boolean,
      coalesce((p->'impostor'->>'firstRight')::boolean, false),
      coalesce((p->'impostor'->>'votesTaken')::integer, 0),
      p->>'characterName'
    from jsonb_array_elements(m->'players') as p
    where p ? 'impostor';
    return;
  end if;

  if m->>'game' = 'lineup' then
    insert into public.lineup_rounds (
      match_id, round, mission_id, mission_text, host_id, verdict_for, verdict_why, lots, trades
    )
    select
      m->>'id',
      (r->>'round')::smallint,
      r->>'missionId',
      r->>'missionText',
      r->>'hostId',
      r->>'verdictFor',
      r->>'verdictWhy',
      coalesce(r->'lots', '[]'::jsonb),
      coalesce(r->'trades', '[]'::jsonb)
    from jsonb_array_elements(coalesce(m->'lineup'->'rounds', '[]'::jsonb)) as r
    where r->>'missionId' is null
      or exists (select 1 from public.lineup_missions lm where lm.id = r->>'missionId');

    insert into public.lineup_boards (
      match_id, round, user_id, team_name, board, spent, top_price, votes,
      tie_votes, laughs, won, crowd, points
    )
    select
      m->>'id',
      (b->>'round')::smallint,
      p->>'userId',
      nullif(b->'board'->>'name', ''),
      b->'board',
      coalesce((b->>'spent')::smallint, 0),
      coalesce((b->>'topPrice')::smallint, 0),
      coalesce((b->>'votes')::smallint, 0),
      (b->>'tieVotes')::smallint,
      coalesce((b->>'laughs')::smallint, 0),
      coalesce((b->>'won')::boolean, false),
      coalesce((b->>'crowd')::boolean, false),
      coalesce((b->>'points')::smallint, 0)
    from jsonb_array_elements(m->'players') as p,
      jsonb_array_elements(coalesce(p->'lineup', '[]'::jsonb)) as b
    where exists (
      select 1 from public.lineup_rounds lr
      where lr.match_id = m->>'id' and lr.round = (b->>'round')::smallint
    );
    return;
  end if;

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
$function$;
