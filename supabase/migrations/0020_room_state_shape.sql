-- Every room in the shape the app now expects, so the code can drop what it
-- did for rooms saved before a field existed. Fills each missing field with
-- what that fallback gave; rooms already in shape are left as they are.
-- Idempotent: run again once the deploy without the fallbacks is live, for
-- rooms the previous one made in between. The version moves on, so a write
-- racing this one retries on the new state.

update public.rooms r
set version = r.version + 1,
  state = r.state
  -- top level: the step's length, the long shows, turn rounds and numbers
  || jsonb_build_object(
    'stepMs', coalesce(
      r.state -> 'stepMs',
      case
        when jsonb_typeof(r.state -> 'deadline') = 'number'
          and jsonb_typeof(r.state -> 'stepStartsAt') = 'number'
        then to_jsonb((r.state ->> 'deadline')::bigint - (r.state ->> 'stepStartsAt')::bigint)
        else 'null'::jsonb
      end
    ),
    'newcomer', coalesce(r.state -> 'newcomer', 'false'::jsonb),
    'turnRound', coalesce(r.state -> 'turnRound', '0'::jsonb),
    'turnNumber', coalesce(
      r.state -> 'turnNumber',
      to_jsonb(coalesce((
        select max((p ->> 'n')::int)
        from jsonb_array_elements(coalesce(r.state -> 'plays', '[]'::jsonb)) p
      ), 0))
    ),
    -- every setting, the old single "stepSeconds" gone
    'settings', jsonb_build_object(
      'game', 'who-am-i',
      'name', '',
      'visibility', 'public',
      'password', '',
      'seats', 4,
      'voteSeconds', 40,
      'askSeconds', 80,
      'guessSeconds', 60,
      'answerSeconds', 80,
      'validateSeconds', 40,
      'mode', 'classic',
      'themeMode', 'vote',
      'themeSets', '["screen","cartoons","anime","games","books","heroes","powers","myths","scifi","warriors","animals","music","celebs","sports","history","world","jobs","family","quirks","looks"]'::jsonb
    ) || ((r.state -> 'settings') - 'stepSeconds'),
    -- players: a page state and a colour of their own (the seat's, as before)
    'players', (
      select coalesce(jsonb_agg(
        jsonb_build_object(
          'goneAt', coalesce(p -> 'goneAt', 'null'::jsonb),
          'colorSlot', coalesce(p -> 'colorSlot', to_jsonb((i - 1) % 4))
        ) || p
        order by i
      ), '[]'::jsonb)
      from jsonb_array_elements(r.state -> 'players') with ordinality as t(p, i)
    ),
    -- cards: a draft slot
    'assignments', (
      select coalesce(jsonb_object_agg(
        a.key, jsonb_build_object('draft', 'null'::jsonb) || a.value
      ), '{}'::jsonb)
      from jsonb_each(coalesce(r.state -> 'assignments', '{}'::jsonb)) a
    ),
    -- outcomes: a turn round
    'outcomes', (
      select coalesce(jsonb_object_agg(
        o.key, jsonb_build_object('round', 'null'::jsonb) || o.value
      ), '{}'::jsonb)
      from jsonb_each(coalesce(r.state -> 'outcomes', '{}'::jsonb)) o
    ),
    -- the theme vote: what each vote took off the clock
    'vote', case
      when jsonb_typeof(r.state -> 'vote') = 'object'
      then jsonb_build_object('cuts', '{}'::jsonb) || (r.state -> 'vote')
      else coalesce(r.state -> 'vote', 'null'::jsonb)
    end,
    -- a show saved before beats: one theme beat
    'reveal', case
      when jsonb_typeof(r.state -> 'reveal') = 'object'
        and r.state -> 'reveal' ->> 'kind' in ('opening', 'theme', 'cast')
        and not (r.state -> 'reveal' ? 'beats')
      then (r.state -> 'reveal') || jsonb_build_object('beats', jsonb_build_array(
        jsonb_build_object(
          'kind', 'theme',
          'startsAt', r.state -> 'reveal' -> 'startsAt',
          'until', r.state -> 'reveal' -> 'until'
        )
      ))
      else coalesce(r.state -> 'reveal', 'null'::jsonb)
    end
  )
where not (r.state ? 'stepMs')
  or not (r.state ? 'newcomer')
  or not (r.state ? 'turnRound')
  or not (r.state ? 'turnNumber')
  or (r.state -> 'settings') ? 'stepSeconds'
  or (select count(*) from jsonb_object_keys(r.state -> 'settings')) < 13
  or exists (
    select 1 from jsonb_array_elements(r.state -> 'players') p
    where not (p ? 'goneAt') or not (p ? 'colorSlot')
  )
  or exists (
    select 1 from jsonb_each(coalesce(r.state -> 'assignments', '{}'::jsonb)) a
    where not (a.value ? 'draft')
  )
  or exists (
    select 1 from jsonb_each(coalesce(r.state -> 'outcomes', '{}'::jsonb)) o
    where not (o.value ? 'round')
  )
  or (jsonb_typeof(r.state -> 'vote') = 'object' and not (r.state -> 'vote' ? 'cuts'))
  or (
    jsonb_typeof(r.state -> 'reveal') = 'object'
    and r.state -> 'reveal' ->> 'kind' in ('opening', 'theme', 'cast')
    and not (r.state -> 'reveal' ? 'beats')
  );
