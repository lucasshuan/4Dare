-- What players picked for each theme, for the pick screen's "random" button.
-- matches.theme_id is themeId(theme) from src/game/theme-id.ts; picks the
-- clock made (auto_picked) don't count. record_match lives here, in its
-- newest shape (0002 used to define it), so new matches save both.

alter table public.matches add column if not exists theme_id text;
alter table public.match_players add column if not exists auto_picked boolean not null default false;

-- Matches saved before: the same slug themeId() makes from the English text.
-- A theme the host typed ("set": null) never gets one.
update public.matches
set theme_id = trim(both '-' from regexp_replace(lower(normalize(theme->>'en', NFKD)), '[^a-z0-9]+', '-', 'g'))
where theme_id is null and theme->>'en' is not null
  and jsonb_typeof(theme->'set') is distinct from 'null';

create index if not exists matches_theme on public.matches (theme_id);

create or replace function public.record_match(m jsonb)
returns void
language sql
set search_path = public
as $$
  with saved as (
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
    returning id, finished_at
  )
  insert into public.match_players (
    match_id, user_id, was_guest, lang, picked_by, character_id, character_name,
    character_origin, auto_picked, result, place, discovered_at, questions, guesses,
    time_ms, finished_at
  )
  select
    saved.id,
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
    saved.finished_at
  from saved, jsonb_array_elements(m->'players') as p;
$$;

-- Characters picked for a theme, most picked first. Library ids lose their
-- language ("pt-wd-Q302" -> "wd-Q302") so picks in every language add up;
-- characters players made keep their "u-" id; the clock's stand-ins are skipped.
create or replace function public.popular_picks(p_theme text, p_limit integer)
returns table (id text, picks bigint)
language sql
stable
set search_path = public
as $$
  select
    case
      when mp.character_id ~ '^(en|pt|ja)-(wd-Q|al-)[0-9]+$' then substr(mp.character_id, 4)
      else mp.character_id
    end as id,
    count(*) as picks
  from public.match_players mp
  join public.matches m on m.id = mp.match_id
  where m.theme_id = p_theme
    and mp.character_id is not null
    and mp.character_id not like 'emergency-%'
    and not mp.auto_picked
  group by 1
  order by picks desc, id
  limit p_limit;
$$;

revoke execute on function public.record_match(jsonb) from public, anon, authenticated;
revoke execute on function public.popular_picks(text, integer) from public, anon, authenticated;
