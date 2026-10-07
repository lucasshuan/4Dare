-- What the profile reads of an Impostor match: the votes a player took over
-- it, whether their vote in the first vote caught an impostor, and the card
-- they held (for the badges and curiosities). player_matches returns the
-- Impostor's part beside "Who am I?"'s. Like "Who am I?"'s part, it now
-- follows a guest's matches to their account (the foreign key).
alter table public.impostor_match_players
  add column if not exists first_right boolean not null default false,
  add column if not exists votes_taken integer not null default 0,
  add column if not exists character_name text,
  add constraint impostor_match_players_player_fkey
    foreign key (match_id, user_id) references public.match_players (match_id, user_id)
    on delete cascade on update cascade;

create or replace function public.record_match(m jsonb)
returns void
language plpgsql
set search_path to 'public'
as $function$
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
    ) end
  from public.match_players mp
  join public.matches m on m.id = mp.match_id
  where mp.user_id = p_user and mp.finished_at >= p_since
  order by mp.finished_at desc;
$$;
revoke execute on function public.player_matches(text, timestamptz) from public, anon, authenticated;
