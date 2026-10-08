-- What for? with a presenter: a match's mode ("classic" or "host"; null for
-- the games without one), each player's role in it ("host": presented, no
-- seat nor points), and each round's presenter, the board they picked and
-- why. record_match keeps them; player_matches tells how many rounds a
-- player presented (the role follows them on sign-in).
alter table public.matches add column if not exists mode text;
alter table public.match_players
  add column if not exists role text not null default 'player'
  check (role in ('player', 'host'));

create or replace function public.record_match(m jsonb)
returns void
language plpgsql
set search_path to 'public'
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

  insert into public.match_players (match_id, user_id, was_guest, lang, place, time_ms, finished_at, xp, role)
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
revoke execute on function public.record_match(jsonb) from public, anon, authenticated;

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
    )
    when 'impostor' then (
      select jsonb_build_object(
        'themeId', m.theme_id,
        'theme', m.theme,
        'impostor', i.impostor,
        'outRound', i.out_round,
        'left', i.left_match,
        'rightVotes', i.right_votes,
        'firstRight', i.first_right,
        'votesTaken', i.votes_taken,
        'guess', i.guess,
        'guessHit', i.guess_hit,
        'characterName', i.character_name
      )
      from public.impostor_match_players i
      where i.match_id = mp.match_id and i.user_id = mp.user_id
    )
    when 'lineup' then (
      select jsonb_build_object(
        'presented', case when mp.role = 'host' then (
          select count(*) from public.lineup_rounds hr where hr.match_id = mp.match_id
        ) else 0 end,
        'rounds', coalesce(jsonb_agg(jsonb_build_object(
        'round', b.round,
        'missionId', lr.mission_id,
        'spent', b.spent,
        'topPrice', b.top_price,
        'votes', b.votes,
        'tieVotes', b.tie_votes,
        'laughs', b.laughs,
        'won', b.won,
        'crowd', b.crowd,
        'points', b.points,
        'cards', jsonb_array_length(coalesce(b.board->'cards', '[]'::jsonb))
      ) order by b.round), '[]'::jsonb))
      from public.lineup_boards b
      join public.lineup_rounds lr on lr.match_id = b.match_id and lr.round = b.round
      where b.match_id = mp.match_id and b.user_id = mp.user_id
    ) end
  from public.match_players mp
  join public.matches m on m.id = mp.match_id
  where mp.user_id = p_user and mp.finished_at >= p_since
  order by mp.finished_at desc;
$$;
revoke execute on function public.player_matches(text, timestamptz) from public, anon, authenticated;
