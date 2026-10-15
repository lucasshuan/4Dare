-- The control panel's overview, in one read.
--
-- admin_stats(p_days) returns a jsonb with what the overview shows: matches
-- per game and per day (São Paulo days, the last p_days), the players and the
-- languages they played in, the rooms open now, the library, the content
-- banks and the queues that wait on the admin. One round trip instead of a
-- dozen counts; the server calls it with the service key and caches it for a
-- minute.
--
-- Idempotent.

create or replace function public.admin_stats(p_days integer default 14)
returns jsonb
language sql
stable
set search_path = public
as $$
  with
  m as (
    select id, game, theme_id, started_at, finished_at
    from matches
  ),
  days as (
    select (now() at time zone 'America/Sao_Paulo')::date - g as day
    from generate_series(0, greatest(p_days, 1) - 1) g
  )
  select jsonb_build_object(
    'since', (select min(started_at) from m),
    'matches', (select count(*) from m),
    'plays', (select count(*) from match_players),
    'players', (select count(distinct user_id) from match_players),
    'games', coalesce((
      select jsonb_agg(jsonb_build_object(
        'game', game,
        'matches', n,
        'avg_sec', avg_sec,
        'last', last
      ) order by n desc)
      from (
        select game, count(*) n,
          round(avg(extract(epoch from finished_at - started_at))
            filter (where finished_at is not null))::int avg_sec,
          max(started_at) last
        from m group by game
      ) g
    ), '[]'::jsonb),
    'days', (
      select jsonb_agg(jsonb_build_object(
        'day', d.day,
        'by', coalesce((
          select jsonb_object_agg(game, n)
          from (
            select game, count(*) n from m
            where (started_at at time zone 'America/Sao_Paulo')::date = d.day
            group by game
          ) x
        ), '{}'::jsonb)
      ) order by d.day)
      from days d
    ),
    'langs', coalesce((
      select jsonb_object_agg(lang, n)
      from (select lang, count(*) n from match_players group by lang) l
    ), '{}'::jsonb),
    'top_themes', coalesce((
      select jsonb_agg(jsonb_build_object('id', t.theme_id, 'name', coalesce(w.pt, t.theme_id), 'n', t.n) order by t.n desc)
      from (
        select theme_id, count(*) n from m
        where theme_id is not null
        group by theme_id order by count(*) desc limit 8
      ) t
      left join whoami_themes w on w.id = t.theme_id
    ), '[]'::jsonb),
    'top_picks', coalesce((
      select jsonb_agg(jsonb_build_object('id', character_id, 'name', name, 'n', n) order by n desc)
      from (
        select character_id, max(character_name) name, count(*) n
        from match_players
        where character_id is not null
        group by character_id order by count(*) desc limit 8
      ) p
    ), '[]'::jsonb),
    'rooms', (
      select jsonb_build_object(
        'open', count(*) filter (where phase <> 'closed'),
        'lobby', count(*) filter (where phase in ('lobby', 'finished')),
        'playing', count(*) filter (where phase not in ('lobby', 'finished', 'closed')),
        'active_hour', count(*) filter (where phase <> 'closed' and updated_at > now() - interval '1 hour'),
        'stale', count(*) filter (where phase <> 'closed' and updated_at < now() - interval '12 hours')
      )
      from rooms
    ),
    'library', (
      select jsonb_build_object(
        'characters', (select count(*) from characters),
        'by_players', (select count(*) from characters where created_by is not null),
        'images', count(*) filter (where status = 'active'),
        'pending', count(*) filter (where status = 'pending'),
        'pending_since', min(created_at) filter (where status = 'pending'),
        'aliases', (select count(*) from character_aliases where not removed)
      )
      from character_images
    ),
    'banks', jsonb_build_object(
      'themes_on', (select count(*) from whoami_themes where active),
      'themes_off', (select count(*) from whoami_themes where not active),
      'questions', (select count(*) from impostor_questions where status = 'live'),
      'spice', coalesce((
        select jsonb_object_agg(spice, n)
        from (select spice, count(*) n from impostor_questions where status = 'live' group by spice) s
      ), '{}'::jsonb),
      'missions', (select count(*) from lineup_missions where status = 'live'),
      'heavy', (select count(*) from lineup_missions where status = 'live' and heavy),
      'extras', (select count(*) from lineup_extras where status = 'live'),
      'blocked', (select count(*) from lineup_blocked)
    ),
    'workshop', (
      select jsonb_build_object(
        'voting', count(*) filter (where status = 'voting'),
        'review', count(*) filter (where status = 'review')
      )
      from workshop_suggestions
    ),
    'reports_week', (select count(*) from player_reports where created_at > now() - interval '7 days')
  );
$$;

revoke execute on function public.admin_stats(integer) from public, anon, authenticated;
