-- What the control panel did about a person, and the accounts' numbers.
--
-- Every report is about a person (an account, or a guest's browser id). The
-- panel answers with a sanction: a warning they see when they come in, a
-- mute (no chat, no murals) or a ban (no rooms, no writing, no votes, no
-- suggestions) for a while or for good, or nothing (archived). Each one
-- settles the reports made until `up_to`; later reports are open again. A
-- mute or a ban can be lifted. The server checks the person's active one on
-- the actions it covers (src/server/sanctions.ts).
--
-- admin_people(): each account's matches, XP, wins and games, in one read,
-- for the panel's list of accounts.
--
-- Written and read by the server only (service key). Idempotent.

create table if not exists public.sanctions (
  id bigint generated always as identity primary key,
  person text not null,
  kind text not null check (kind in ('warn', 'mute', 'ban', 'none')),
  until timestamptz,                    -- null: for good (a ban), or not timed
  reason text check (reason is null or char_length(reason) <= 300),
  wipe boolean not null default false,  -- a ban that also took down what they sent
  up_to timestamptz not null default now(),
  author_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  lifted_at timestamptz,
  seen_at timestamptz                   -- a warning: when the person read it
);

create index if not exists sanctions_person
  on public.sanctions (person, created_at desc);

alter table public.sanctions enable row level security;
revoke all on public.sanctions from anon, authenticated;

-- A guest signed in: what was done about them follows the account.
create or replace function public.reassign_sanctions(p_from text, p_to text)
returns void
language sql
set search_path = public
as $$
  update public.sanctions set person = p_to where person = p_from and p_from <> p_to;
$$;
revoke execute on function public.reassign_sanctions(text, text) from public, anon, authenticated;

create or replace function public.admin_people()
returns table (
  user_id text,
  plays integer,
  xp integer,
  wins integer,
  per_game jsonb,
  first_at timestamptz,
  last_at timestamptz
)
language sql
stable
set search_path = public
as $$
  select
    g.user_id,
    sum(g.n)::integer,
    sum(g.xp)::integer,
    sum(g.wins)::integer,
    jsonb_object_agg(g.game, g.n),
    min(g.first_at),
    max(g.last_at)
  from (
    select
      mp.user_id,
      m.game,
      count(*) as n,
      coalesce(sum(mp.xp), 0) as xp,
      count(*) filter (where mp.place = 1) as wins,
      min(mp.finished_at) as first_at,
      max(mp.finished_at) as last_at
    from public.match_players mp
    join public.matches m on m.id = mp.match_id
    where not mp.was_guest
    group by mp.user_id, m.game
  ) g
  group by g.user_id;
$$;
revoke execute on function public.admin_people() from public, anon, authenticated;
