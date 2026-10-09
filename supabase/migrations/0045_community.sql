-- The community pages: players' nicknames for characters (with their
-- history and reports), the Workshop's suggestions and votes, the news and
-- their reactions, curators, and the reads behind rankings and the
-- contributions feed.
--
-- The library and the game banks are only read here: a suggestion lives in
-- its own table until a curator approves it, and only then does the app
-- insert it into its bank. Safe to run again.

-- curators ------------------------------------------------------------------

-- Who reviews the Workshop's suggestions (set by hand).
alter table public.profiles add column if not exists curator boolean not null default false;

-- nicknames -----------------------------------------------------------------

-- A player's nickname for a character, in one language. The library's own
-- names stay in character_names; these only add to search and guesses.
create table if not exists public.character_aliases (
  id bigint generated always as identity primary key,
  character_id text not null references public.characters (id) on delete cascade,
  lang text not null check (lang in ('en', 'es', 'ja', 'pt')),
  name text not null check (char_length(name) between 2 and 40),
  -- the name folded for search (normalizeName in the app)
  norm text not null,
  -- an account that is deleted leaves its nicknames, without its name
  created_by uuid references public.profiles (id) on delete set null,
  edited_by uuid references public.profiles (id) on delete set null,
  -- three reports hide one for everyone
  hidden boolean not null default false,
  -- taken out by someone; kept for the history and to undo
  removed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists character_aliases_once
  on public.character_aliases (character_id, lang, norm) where not removed;
create index if not exists character_aliases_character
  on public.character_aliases (character_id);
create index if not exists character_aliases_author
  on public.character_aliases (created_by, created_at desc);
alter table public.character_aliases enable row level security;

-- Who put, changed, took out or brought back each nickname, and when.
create table if not exists public.character_alias_events (
  id bigint generated always as identity primary key,
  alias_id bigint not null references public.character_aliases (id) on delete cascade,
  character_id text not null references public.characters (id) on delete cascade,
  action text not null check (action in ('add', 'edit', 'remove', 'restore')),
  before text,
  after text,
  actor uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists character_alias_events_character
  on public.character_alias_events (character_id, created_at desc);
create index if not exists character_alias_events_actor
  on public.character_alias_events (actor, created_at desc);
create index if not exists character_alias_events_time
  on public.character_alias_events (created_at desc);
alter table public.character_alias_events enable row level security;

create table if not exists public.character_alias_reports (
  alias_id bigint not null references public.character_aliases (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (alias_id, reporter_id)
);
alter table public.character_alias_reports enable row level security;

-- Adds a nickname (or brings back one taken out), refused past 30 changes an
-- hour from one account. The nickname's id; null when refused; -1 when the
-- character already has it.
create or replace function public.add_character_alias(
  p_character text, p_lang text, p_name text, p_norm text, p_actor uuid
)
returns bigint
language plpgsql
set search_path = public
as $$
declare
  v_id bigint;
begin
  perform pg_advisory_xact_lock(hashtext('alias:' || p_actor::text));
  if (select count(*) from public.character_alias_events
      where actor = p_actor and created_at > now() - interval '1 hour') >= 30 then
    return null;
  end if;
  if exists (
    select 1 from public.character_aliases
    where character_id = p_character and lang = p_lang and norm = p_norm and not removed
  ) then
    return -1;
  end if;
  insert into public.character_aliases (character_id, lang, name, norm, created_by)
  values (p_character, p_lang, p_name, p_norm, p_actor)
  returning id into v_id;
  insert into public.character_alias_events (alias_id, character_id, action, after, actor)
  values (v_id, p_character, 'add', p_name, p_actor);
  return v_id;
end;
$$;
revoke execute on function public.add_character_alias(text, text, text, text, uuid)
  from public, anon, authenticated;

-- Changes, takes out or brings back a player's nickname. 'ok', 'limit',
-- 'taken' (another nickname of the character already reads so) or 'missing'.
create or replace function public.change_character_alias(
  p_id bigint, p_action text, p_name text, p_norm text, p_actor uuid
)
returns text
language plpgsql
set search_path = public
as $$
declare
  a public.character_aliases;
begin
  perform pg_advisory_xact_lock(hashtext('alias:' || p_actor::text));
  if (select count(*) from public.character_alias_events
      where actor = p_actor and created_at > now() - interval '1 hour') >= 30 then
    return 'limit';
  end if;
  select * into a from public.character_aliases where id = p_id for update;
  if a.id is null then
    return 'missing';
  end if;
  if p_action = 'edit' then
    if a.removed then return 'missing'; end if;
    if p_norm <> a.norm and exists (
      select 1 from public.character_aliases
      where character_id = a.character_id and lang = a.lang and norm = p_norm
        and not removed and id <> a.id
    ) then
      return 'taken';
    end if;
    update public.character_aliases
    set name = p_name, norm = p_norm, edited_by = p_actor, updated_at = now()
    where id = a.id;
    insert into public.character_alias_events (alias_id, character_id, action, before, after, actor)
    values (a.id, a.character_id, 'edit', a.name, p_name, p_actor);
  elsif p_action = 'remove' then
    if a.removed then return 'ok'; end if;
    update public.character_aliases set removed = true, updated_at = now() where id = a.id;
    insert into public.character_alias_events (alias_id, character_id, action, before, actor)
    values (a.id, a.character_id, 'remove', a.name, p_actor);
  elsif p_action = 'restore' then
    if not a.removed then return 'ok'; end if;
    if exists (
      select 1 from public.character_aliases
      where character_id = a.character_id and lang = a.lang and norm = a.norm and not removed
    ) then
      return 'taken';
    end if;
    update public.character_aliases set removed = false, updated_at = now() where id = a.id;
    insert into public.character_alias_events (alias_id, character_id, action, after, actor)
    values (a.id, a.character_id, 'restore', a.name, p_actor);
  else
    raise exception 'bad action';
  end if;
  return 'ok';
end;
$$;
revoke execute on function public.change_character_alias(bigint, text, text, text, uuid)
  from public, anon, authenticated;

-- One report per person; the third hides the nickname. Whether it is hidden now.
create or replace function public.report_character_alias(p_id bigint, p_reporter uuid)
returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_hidden boolean;
begin
  insert into public.character_alias_reports (alias_id, reporter_id)
  values (p_id, p_reporter)
  on conflict do nothing;
  update public.character_aliases a
  set hidden = true
  where a.id = p_id
    and (select count(*) from public.character_alias_reports r where r.alias_id = p_id) >= 3;
  select hidden into v_hidden from public.character_aliases where id = p_id;
  return coalesce(v_hidden, false);
end;
$$;
revoke execute on function public.report_character_alias(bigint, uuid)
  from public, anon, authenticated;

-- Workshop ------------------------------------------------------------------

-- A theme, question or mission someone suggested. It waits here, in the
-- language it was written in, until a curator puts it live (the app then
-- inserts it into its bank; `bank_id` says which row) or leaves it out.
create table if not exists public.workshop_suggestions (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('theme', 'question', 'mission')),
  status text not null default 'voting' check (status in ('voting', 'review', 'live', 'refused')),
  -- the language it was written in
  lang text not null check (lang in ('en', 'es', 'ja', 'pt')),
  -- what its bank keeps (theme: name, set, games, starters; question: kind,
  -- text, ends or choices, scope, audience, spice; mission: text, tone, heavy)
  payload jsonb not null,
  -- the other languages' texts, by piece: {"en": {"name": "…"}, …}
  translations jsonb not null default '{}',
  created_by uuid references public.profiles (id) on delete set null,
  yes integer not null default 0,
  no integer not null default 0,
  -- why it was left out
  reason text check (char_length(reason) <= 300),
  bank_id text,
  decided_by uuid references public.profiles (id) on delete set null,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists workshop_suggestions_status
  on public.workshop_suggestions (status, created_at desc);
create index if not exists workshop_suggestions_author
  on public.workshop_suggestions (created_by, created_at desc);
create index if not exists workshop_suggestions_bank
  on public.workshop_suggestions (bank_id) where bank_id is not null;
alter table public.workshop_suggestions enable row level security;

create table if not exists public.workshop_votes (
  suggestion_id uuid not null references public.workshop_suggestions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- true: wants to play it; false: doesn't fit
  vote boolean not null,
  created_at timestamptz not null default now(),
  primary key (suggestion_id, user_id)
);
create index if not exists workshop_votes_user on public.workshop_votes (user_id);
alter table public.workshop_votes enable row level security;

-- A new suggestion, refused past 3 a week (Monday on, UTC) from one account.
-- The new id, or null when refused.
create or replace function public.create_workshop_suggestion(
  p_kind text, p_lang text, p_payload jsonb, p_translations jsonb, p_author uuid
)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('suggestion:' || p_author::text));
  if (select count(*) from public.workshop_suggestions
      where created_by = p_author and created_at >= date_trunc('week', now())) >= 3 then
    return null;
  end if;
  insert into public.workshop_suggestions (kind, lang, payload, translations, created_by)
  values (p_kind, p_lang, p_payload, p_translations, p_author)
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.create_workshop_suggestion(text, text, jsonb, jsonb, uuid)
  from public, anon, authenticated;

-- Casts, changes or (null) takes back a vote while the suggestion is up for
-- votes; its counts after it.
create or replace function public.vote_workshop_suggestion(
  p_suggestion uuid, p_user uuid, p_vote boolean
)
returns table (yes integer, no integer)
language plpgsql
set search_path = public
as $$
#variable_conflict use_column
begin
  if not exists (
    select 1 from public.workshop_suggestions s
    where s.id = p_suggestion and s.status = 'voting'
  ) then
    raise exception 'closed';
  end if;
  if p_vote is null then
    delete from public.workshop_votes v
    where v.suggestion_id = p_suggestion and v.user_id = p_user;
  else
    insert into public.workshop_votes (suggestion_id, user_id, vote)
    values (p_suggestion, p_user, p_vote)
    on conflict (suggestion_id, user_id) do update set vote = excluded.vote, created_at = now();
  end if;
  return query
  update public.workshop_suggestions s
  set yes = (select count(*) from public.workshop_votes v where v.suggestion_id = p_suggestion and v.vote),
      no = (select count(*) from public.workshop_votes v where v.suggestion_id = p_suggestion and not v.vote)
  where s.id = p_suggestion
  returning s.yes, s.no;
end;
$$;
revoke execute on function public.vote_workshop_suggestion(uuid, uuid, boolean)
  from public, anon, authenticated;

-- news ----------------------------------------------------------------------

-- What changed in 4Dare, written by hand in every language (a Workshop
-- suggestion that goes live writes its own, crediting who suggested it).
create table if not exists public.news_posts (
  -- 'side-menu', 'workshop-<suggestion id>'
  id text primary key,
  published_at timestamptz not null default now(),
  kind text not null check (kind in ('new', 'better', 'fix', 'workshop', 'notice')),
  game text not null check (game in ('who-am-i', 'impostor', 'lineup', 'site')),
  -- a big change gets a wide card with the game's art
  featured boolean not null default false,
  -- {"en": "…", "es": "…", "ja": "…", "pt": "…"}; a fix may have no title
  title jsonb not null default '{}',
  body jsonb not null,
  -- where it leads: {"href": "/what-for", "label": {"en": "…", …}}
  action jsonb,
  suggestion_id uuid references public.workshop_suggestions (id) on delete set null,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists news_posts_published
  on public.news_posts (published_at desc) where not hidden;
alter table public.news_posts enable row level security;

create table if not exists public.news_reactions (
  post_id text not null references public.news_posts (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reaction text not null check (reaction in ('love', 'party', 'laugh', 'wow')),
  created_at timestamptz not null default now(),
  primary key (post_id, user_id, reaction)
);
create index if not exists news_reactions_user on public.news_reactions (user_id);
alter table public.news_reactions enable row level security;

-- Puts or takes back one reaction; every reaction's count on the post after it.
create or replace function public.toggle_news_reaction(
  p_post text, p_user uuid, p_reaction text
)
returns table (reaction text, total integer)
language plpgsql
set search_path = public
as $$
#variable_conflict use_column
begin
  if exists (
    select 1 from public.news_reactions r
    where r.post_id = p_post and r.user_id = p_user and r.reaction = p_reaction
  ) then
    delete from public.news_reactions r
    where r.post_id = p_post and r.user_id = p_user and r.reaction = p_reaction;
  else
    insert into public.news_reactions (post_id, user_id, reaction)
    values (p_post, p_user, p_reaction);
  end if;
  return query
  select r.reaction, count(*)::integer
  from public.news_reactions r
  where r.post_id = p_post
  group by r.reaction;
end;
$$;
revoke execute on function public.toggle_news_reaction(text, uuid, text)
  from public, anon, authenticated;

-- rankings ------------------------------------------------------------------

create index if not exists match_players_finished on public.match_players (finished_at desc);

-- The accounts with the most XP in one game (null: every game) since a time
-- (null: ever). Accounts that keep their activity from anyone stay out.
create or replace function public.xp_ranking(p_game text, p_since timestamptz, p_limit integer)
returns table (user_id uuid, xp integer, matches integer, wins integer)
language sql
stable
set search_path = public
as $$
  select p.id, sum(mp.xp)::integer, count(*)::integer,
         count(*) filter (where mp.place = 1)::integer
  from public.match_players mp
  join public.matches m on m.id = mp.match_id
  join public.profiles p on p.id::text = mp.user_id
  where (p_game is null or m.game = p_game)
    and (p_since is null or mp.finished_at >= p_since)
    and coalesce(p.privacy ->> 'activity', 'all') = 'all'
  group by p.id
  having sum(mp.xp) > 0
  order by sum(mp.xp) desc, count(*) desc, p.id
  limit p_limit;
$$;
revoke execute on function public.xp_ranking(text, timestamptz, integer)
  from public, anon, authenticated;

-- One account's place in that ranking (counted even when it hides its
-- activity: only its owner asks), with its numbers; nothing without XP.
create or replace function public.xp_ranking_place(p_user uuid, p_game text, p_since timestamptz)
returns table (place integer, xp integer, matches integer, wins integer)
language sql
stable
set search_path = public
as $$
  with mine as (
    select sum(mp.xp)::integer as xp, count(*)::integer as matches,
           count(*) filter (where mp.place = 1)::integer as wins
    from public.match_players mp
    join public.matches m on m.id = mp.match_id
    where mp.user_id = p_user::text
      and (p_game is null or m.game = p_game)
      and (p_since is null or mp.finished_at >= p_since)
  ),
  ahead as (
    select count(*)::integer as n
    from (
      select mp.user_id
      from public.match_players mp
      join public.matches m on m.id = mp.match_id
      join public.profiles p on p.id::text = mp.user_id
      where (p_game is null or m.game = p_game)
        and (p_since is null or mp.finished_at >= p_since)
        and coalesce(p.privacy ->> 'activity', 'all') = 'all'
        and mp.user_id <> p_user::text
      group by mp.user_id
      having sum(mp.xp) > (select xp from mine)
    ) t
  )
  select (select n from ahead) + 1, mine.xp, mine.matches, mine.wins
  from mine
  where mine.xp > 0;
$$;
revoke execute on function public.xp_ranking_place(uuid, text, timestamptz)
  from public, anon, authenticated;

-- contributions -------------------------------------------------------------

-- What the community put into the library and the Workshop, newest first:
-- pictures everyone sees, characters made, nicknames put or changed,
-- suggestions sent and the ones that went live. Only from accounts that
-- show their contributions to everyone, unless `p_user` asks for one
-- account's own. `p_kind`: null for all, else 'picture', 'character',
-- 'alias' or 'suggestion'.
create or replace function public.contribution_feed(
  p_kind text, p_user uuid, p_before timestamptz, p_limit integer
)
returns table (
  kind text, at timestamptz, user_id text, character_id text, ref text, detail jsonb
)
language sql
stable
set search_path = public
as $$
  with feed as (
    select 'picture'::text as kind, i.created_at as at, i.created_by as user_id,
           i.character_id, i.id::text as ref, '{}'::jsonb as detail
    from public.character_images i
    where i.created_by is not null and i.status = 'active' and i.character_id is not null
      and (p_kind is null or p_kind = 'picture')
    union all
    select 'character', c.created_at, c.created_by, c.id, c.id, '{}'::jsonb
    from public.characters c
    where c.created_by is not null
      and (p_kind is null or p_kind = 'character')
    union all
    select 'alias', e.created_at, e.actor::text, e.character_id, e.alias_id::text,
           jsonb_build_object('action', e.action, 'name', e.after, 'before', e.before, 'lang', a.lang)
    from public.character_alias_events e
    join public.character_aliases a on a.id = e.alias_id
    where e.actor is not null and e.action in ('add', 'edit') and not a.hidden and not a.removed
      and (p_kind is null or p_kind = 'alias')
    union all
    select 'suggestion', s.created_at, s.created_by::text, null, s.id::text,
           jsonb_build_object('kind', s.kind, 'status', s.status, 'lang', s.lang,
                              'payload', s.payload, 'translations', s.translations)
    from public.workshop_suggestions s
    where s.created_by is not null
      and (p_kind is null or p_kind = 'suggestion')
    union all
    select 'live', s.decided_at, s.created_by::text, null, s.id::text,
           jsonb_build_object('kind', s.kind, 'status', s.status, 'lang', s.lang,
                              'payload', s.payload, 'translations', s.translations)
    from public.workshop_suggestions s
    where s.created_by is not null and s.status = 'live' and s.decided_at is not null
      and (p_kind is null or p_kind = 'suggestion')
  )
  select f.kind, f.at, f.user_id, f.character_id, f.ref, f.detail
  from feed f
  join public.profiles p on p.id::text = f.user_id
  where (p_before is null or f.at < p_before)
    and (case when p_user is null
              then coalesce(p.privacy ->> 'contributions', 'all') = 'all'
              else f.user_id = p_user::text end)
  order by f.at desc
  limit p_limit;
$$;
revoke execute on function public.contribution_feed(text, uuid, timestamptz, integer)
  from public, anon, authenticated;

-- Who helped the library and the Workshop most since a time (null: ever),
-- counting pictures everyone sees, characters, nicknames put and
-- suggestions that went live; accounts that show contributions to everyone.
create or replace function public.top_contributors(p_since timestamptz, p_limit integer)
returns table (
  user_id text, pictures integer, characters integer, aliases integer, live integer, total integer
)
language sql
stable
set search_path = public
as $$
  with counts as (
    select i.created_by as user_id, 1 as pictures, 0 as characters, 0 as aliases, 0 as live
    from public.character_images i
    where i.created_by is not null and i.status = 'active'
      and (p_since is null or i.created_at >= p_since)
    union all
    select c.created_by, 0, 1, 0, 0
    from public.characters c
    where c.created_by is not null and (p_since is null or c.created_at >= p_since)
    union all
    select a.created_by::text, 0, 0, 1, 0
    from public.character_aliases a
    where a.created_by is not null and not a.hidden and not a.removed
      and (p_since is null or a.created_at >= p_since)
    union all
    select s.created_by::text, 0, 0, 0, 1
    from public.workshop_suggestions s
    where s.created_by is not null and s.status = 'live'
      and (p_since is null or s.decided_at >= p_since)
  )
  select c.user_id, sum(c.pictures)::integer, sum(c.characters)::integer,
         sum(c.aliases)::integer, sum(c.live)::integer,
         (sum(c.pictures) + sum(c.characters) + sum(c.aliases) + 5 * sum(c.live))::integer
  from counts c
  join public.profiles p on p.id::text = c.user_id
  where coalesce(p.privacy ->> 'contributions', 'all') = 'all'
  group by c.user_id
  order by 6 desc, c.user_id
  limit p_limit;
$$;
revoke execute on function public.top_contributors(timestamptz, integer)
  from public, anon, authenticated;

-- only the server (service role) reads and writes these
revoke all on public.character_aliases, public.character_alias_events,
  public.character_alias_reports, public.workshop_suggestions, public.workshop_votes,
  public.news_posts, public.news_reactions
  from anon, authenticated;
