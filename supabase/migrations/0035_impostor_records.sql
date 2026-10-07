-- An Impostor match's record: the shared match and players rows as before,
-- plus each player's side and part (impostor_match_players). "Who am I?"
-- keeps its own rows. Same function as 0030 otherwise.
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
      match_id, user_id, impostor, out_round, left_match, right_votes, guess, guess_hit
    )
    select
      m->>'id',
      p->>'userId',
      coalesce((p->'impostor'->>'impostor')::boolean, false),
      (p->'impostor'->>'outRound')::integer,
      coalesce((p->'impostor'->>'left')::boolean, false),
      coalesce((p->'impostor'->>'rightVotes')::integer, 0),
      p->'impostor'->>'guess',
      (p->'impostor'->>'guessHit')::boolean
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
