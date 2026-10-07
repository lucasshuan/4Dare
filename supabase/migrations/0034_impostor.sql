-- The Impostor: its question bank (hand-fed like the themes: insert and
-- update only, never a reset), what each question did in play, and two reads
-- the server needs to deal the cards (what a character is, and how famous a
-- character must be to count as known). Safe to run again.

create table if not exists public.impostor_questions (
  -- 'g-brave', 'set-warriors-weapons', 'theme-pokemon-type'
  id text primary key,
  kind text not null check (kind in ('scale', 'color', 'emoji', 'pick', 'word')),
  scope text not null check (scope in ('general', 'set', 'theme')),
  -- set: one of the theme sets; theme: the theme
  theme_set text,
  theme_id text references public.whoami_themes(id),
  -- who the question fits: fiction, real people or both
  audience text not null default 'all' check (audience in ('all', 'fiction', 'real')),
  en text not null,
  es text not null,
  ja text not null,
  pt text not null,
  -- scale {"low":{"emoji","en","es","ja","pt"},"high":{…}}
  -- pick {"choices":[{"emoji","en","es","ja","pt"}, …]} (2 to 4)
  -- emoji {"palette":"foods"} (src/game/impostor/answers.ts); color, word: null
  options jsonb,
  -- 1 light, 3 gives a lot away (never in the first round)
  spice smallint not null default 2 check (spice between 1 and 3),
  -- null: ours; a player's once themes have their own editor
  created_by uuid references public.profiles(id) on delete set null,
  status text not null default 'live' check (status in ('draft', 'live', 'hidden')),
  created_at timestamptz not null default now(),
  check ((scope = 'set') = (theme_set is not null)),
  check ((scope = 'theme') = (theme_id is not null))
);
alter table public.impostor_questions enable row level security;

-- One row per question and language, added to at the end of each match.
create table if not exists public.impostor_question_stats (
  question_id text not null references public.impostor_questions(id),
  lang text not null,
  -- rounds it was asked in
  asked integer not null default 0,
  -- answers that never came
  silent integer not null default 0,
  -- the impostor stood apart from the rest when the answers showed
  stood_out integer not null default 0,
  -- an impostor went out in the vote right after
  caught integer not null default 0,
  primary key (question_id, lang)
);
alter table public.impostor_question_stats enable row level security;

-- Adds a match's rows: [{"id","lang","asked","silent","stood_out","caught"}].
create or replace function public.impostor_count_questions(p_rows jsonb)
returns void
language sql
set search_path = public
as $$
  insert into public.impostor_question_stats as s
    (question_id, lang, asked, silent, stood_out, caught)
  select r.id, r.lang, r.asked, r.silent, r.stood_out, r.caught
  from jsonb_to_recordset(p_rows)
    as r(id text, lang text, asked int, silent int, stood_out int, caught int)
  where exists (select 1 from public.impostor_questions q where q.id = r.id)
  on conflict (question_id, lang) do update set
    asked = s.asked + excluded.asked,
    silent = s.silent + excluded.silent,
    stood_out = s.stood_out + excluded.stood_out,
    caught = s.caught + excluded.caught;
$$;

-- What the deal weighs about each character (library ids): its category,
-- its work or job by its English label (one work can sit under two ids), its
-- popularity in the language and its gostos.
create or replace function public.impostor_facts(p_ids text[], p_lang text)
returns table (
  character_id text,
  category public.character_category,
  work text,
  popularity integer,
  gostos public.gosto[]
)
language sql
stable
set search_path = public
as $$
  select c.id,
         c.category,
         coalesce(l.label, c.origin_id),
         n.popularity,
         public.character_gostos(c)
  from public.characters c
  left join public.character_names n
    on n.character_id = c.id and n.lang = p_lang
  left join public.origin_labels l
    on l.origin_id = c.origin_id and l.lang = 'en'
  where c.id = any(p_ids);
$$;

-- The popularity of a language's 2 500th most popular character: anyone at
-- or above it counts as known there.
create or replace function public.impostor_known_floor(p_lang text)
returns integer
language sql
stable
set search_path = public
as $$
  select popularity
  from public.character_names
  where lang = p_lang and popularity is not null
  order by popularity desc
  offset 2499
  limit 1;
$$;

revoke execute on function public.impostor_count_questions(jsonb)
  from public, anon, authenticated;
revoke execute on function public.impostor_facts(text[], text)
  from public, anon, authenticated;
revoke execute on function public.impostor_known_floor(text)
  from public, anon, authenticated;

-- The Impostor's part in a match, beside match_players (one row per player).
create table if not exists public.impostor_match_players (
  match_id text not null references public.matches(id) on delete cascade,
  user_id text not null,
  impostor boolean not null,
  -- the round they went out in; null: still in at the end
  out_round integer,
  left_match boolean not null default false,
  -- votes that helped send an impostor out
  right_votes integer not null default 0,
  -- a caught impostor's guess at the crew's card
  guess text,
  guess_hit boolean,
  primary key (match_id, user_id)
);
alter table public.impostor_match_players enable row level security;
