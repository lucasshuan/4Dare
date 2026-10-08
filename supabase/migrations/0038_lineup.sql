-- What for? (lineup): its missions and extras (hand-fed like the themes:
-- insert and update only, never a reset), the characters kept out of its
-- deck, what missions and cards did in play, and the deck the server deals
-- from. The library is only read here. Safe to run again.

-- The envelope's missions: each one a task a team does, in the infinitive
-- ("Change a tire, in the rain, at midnight."), answering "what for?".
create table if not exists public.lineup_missions (
  -- 'tire-rain', 'titanic'
  id text primary key,
  tone text not null check (tone in ('chores', 'social', 'adventure', 'absurd', 'contest')),
  -- shipwrecks, funerals: in by default, a room can switch them off
  heavy boolean not null default false,
  en text not null,
  es text not null,
  ja text not null,
  pt text not null,
  -- null: ours; a player's once missions have their own editor
  created_by uuid references public.profiles(id) on delete set null,
  status text not null default 'live' check (status in ('draft', 'live', 'hidden')),
  created_at timestamptz not null default now()
);
alter table public.lineup_missions enable row level security;

-- Extras: plain folk drawn by hand (a baby, a pigeon, your uncle), an emoji
-- on a tint instead of a picture. They belong to no gosto.
create table if not exists public.lineup_extras (
  -- 'baby', 'grandma': the card is 'x:baby'
  id text primary key,
  emoji text not null,
  -- the picture's ground, '#fde2c8'
  tint text not null check (tint ~ '^#[0-9a-f]{6}$'),
  en text not null,
  es text not null,
  ja text not null,
  pt text not null,
  status text not null default 'live' check (status in ('live', 'hidden')),
  created_at timestamptz not null default now()
);
alter table public.lineup_extras enable row level security;

-- Real people kept off the auction: auctioning a dictator to change a tire
-- goes too far. A short list, by hand.
create table if not exists public.lineup_blocked (
  character_id text primary key references public.characters(id),
  reason text not null,
  created_at timestamptz not null default now()
);
alter table public.lineup_blocked enable row level security;

-- One row per mission and language, added to at the end of each match.
create table if not exists public.lineup_mission_stats (
  mission_id text not null references public.lineup_missions(id),
  lang text not null,
  played integer not null default 0,
  -- "Good mission?" on the score
  liked integer not null default 0,
  disliked integer not null default 0,
  -- reactions on stage
  laughs integer not null default 0,
  -- rounds that ended tied
  ties integer not null default 0,
  primary key (mission_id, lang)
);
alter table public.lineup_mission_stats enable row level security;

-- One row per card and language: what the auctions made of it. The average
-- price is price_sum / sold.
create table if not exists public.lineup_card_stats (
  -- a library id ('wd-Q302') or an extra's ('x:baby')
  card_id text not null,
  lang text not null,
  lots integer not null default 0,
  sold integer not null default 0,
  price_sum integer not null default 0,
  traded integer not null default 0,
  won integer not null default 0,
  primary key (card_id, lang)
);
alter table public.lineup_card_stats enable row level security;

-- Adds a match's rounds: [{"id","lang","played","liked","disliked","laughs","ties"}].
create or replace function public.lineup_count_missions(p_rows jsonb)
returns void
language sql
set search_path = public
as $$
  insert into public.lineup_mission_stats as s
    (mission_id, lang, played, liked, disliked, laughs, ties)
  select r.id, r.lang, r.played, r.liked, r.disliked, r.laughs, r.ties
  from jsonb_to_recordset(p_rows)
    as r(id text, lang text, played int, liked int, disliked int, laughs int, ties int)
  where exists (select 1 from public.lineup_missions m where m.id = r.id)
  on conflict (mission_id, lang) do update set
    played = s.played + excluded.played,
    liked = s.liked + excluded.liked,
    disliked = s.disliked + excluded.disliked,
    laughs = s.laughs + excluded.laughs,
    ties = s.ties + excluded.ties;
$$;

-- Adds a match's cards: [{"id","lang","lots","sold","price","traded","won"}].
create or replace function public.lineup_count_cards(p_rows jsonb)
returns void
language sql
set search_path = public
as $$
  insert into public.lineup_card_stats as s
    (card_id, lang, lots, sold, price_sum, traded, won)
  select r.id, r.lang, r.lots, r.sold, r.price, r.traded, r.won
  from jsonb_to_recordset(p_rows)
    as r(id text, lang text, lots int, sold int, price int, traded int, won int)
  on conflict (card_id, lang) do update set
    lots = s.lots + excluded.lots,
    sold = s.sold + excluded.sold,
    price_sum = s.price_sum + excluded.price_sum,
    traded = s.traded + excluded.traded,
    won = s.won + excluded.won;
$$;

-- A language's deck: its known characters (as the Impostor counts them) with
-- a picture and a gosto, off the block list, most popular first. The server
-- keeps it for ten minutes and asks for names and pictures of the ones it
-- draws.
create or replace function public.lineup_pool(p_lang text)
returns table (
  character_id text,
  gostos public.gosto[],
  popularity integer
)
language sql
stable
set search_path = public
as $$
  with floor as (
    select coalesce(public.impostor_known_floor(p_lang), 0) as v
  )
  select c.id, public.character_gostos(c), n.popularity
  from public.characters c
  join public.character_names n
    on n.character_id = c.id and n.lang = p_lang
  cross join floor f
  where c.id not like 'u-%'
    and c.image_url is not null
    and n.popularity is not null
    and n.popularity >= f.v
    and cardinality(public.character_gostos(c)) > 0
    and not exists (
      select 1 from public.lineup_blocked b where b.character_id = c.id
    )
  order by n.popularity desc;
$$;

revoke execute on function public.lineup_count_missions(jsonb)
  from public, anon, authenticated;
revoke execute on function public.lineup_count_cards(jsonb)
  from public, anon, authenticated;
revoke execute on function public.lineup_pool(text)
  from public, anon, authenticated;
