-- A character has many pictures. The library's own (created_by null) starts
-- with a head start (`bonus`) that a player's picture has to beat with
-- distinct pickers; characters.image_url is always the best one, kept by
-- refresh_character_cover, so search, hands and examples keep reading one URL
-- per character. Players never write image_url themselves: what they send is
-- another picture of the character, which a picker may put on their card.
--
-- A picture a player sends is checked before it is stored
-- (src/server/moderation.ts). Its status:
--   active  → everyone sees it in the character's tray
--   pending → the detector could not tell (no key, quota, outage): its author
--             still uses it, nobody else sees it until a later check
--   hidden  → reported by enough people; matches that used it keep it
-- A picture sent for a new name has no character yet (character_id null)
-- until the pick makes one; one left like that is an orphan the daily
-- cleanup removes with its file.

-- the library is hand-fed: a copy of its pictures before touching them
create schema if not exists backup;
revoke all on schema backup from public, anon, authenticated;
create table if not exists backup.characters_before_0017 as
  select id, image_url, created_by from public.characters;

create table if not exists public.character_images (
  id uuid primary key default gen_random_uuid(),
  character_id text references public.characters (id) on delete cascade,
  url text not null,
  -- the player who sent it; null for the library's own
  created_by text,
  -- who sent it as they looked then: { name, isGuest, guestNumber, avatar }
  author jsonb,
  status text not null default 'active'
    check (status in ('pending', 'active', 'hidden')),
  -- the detector's scores, to tune its thresholds without asking again
  moderation jsonb,
  -- distinct players who put it on a confirmed card
  picks integer not null default 0,
  bonus integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index if not exists character_images_character_url
  on public.character_images (character_id, url);
create index if not exists character_images_unattached
  on public.character_images (created_at) where character_id is null;
create index if not exists character_images_pending
  on public.character_images (created_at) where status = 'pending';

create table if not exists public.character_image_picks (
  image_id uuid not null references public.character_images (id) on delete cascade,
  player_id text not null,
  created_at timestamptz not null default now(),
  primary key (image_id, player_id)
);

create table if not exists public.character_image_reports (
  image_id uuid not null references public.character_images (id) on delete cascade,
  reporter_id text not null,
  created_at timestamptz not null default now(),
  primary key (image_id, reporter_id)
);

-- Read and written only by the server (service role), like the other tables.
alter table public.character_images enable row level security;
alter table public.character_image_picks enable row level security;
alter table public.character_image_reports enable row level security;
revoke all on public.character_images from anon, authenticated;
revoke all on public.character_image_picks from anon, authenticated;
revoke all on public.character_image_reports from anon, authenticated;

-- Every picture the library has today: the library's own with the head start,
-- a player's character's with its maker.
insert into public.character_images (character_id, url, created_by, bonus)
select
  id,
  image_url,
  case when id like 'u-%' then created_by end,
  case when id like 'u-%' then 0 else 20 end
from public.characters
where image_url is not null
on conflict (character_id, url) do nothing;

-- A character's cover is its active picture with the best score (picks plus
-- head start), the oldest on a tie; none left active, no cover.
create or replace function public.refresh_character_cover(p_character text)
returns void
language sql
set search_path = ''
as $$
  update public.characters c
  set image_url = best.url
  from (
    select (
      select i.url
      from public.character_images i
      where i.character_id = p_character and i.status = 'active'
      order by i.picks + i.bonus desc, i.created_at
      limit 1
    ) as url
  ) best
  where c.id = p_character and c.image_url is distinct from best.url;
$$;

-- A character made or given a cover (a player's new name, a library row added
-- by hand): its picture gets a row. The picture a pick card sent for the new
-- name is that row, now attached to the character.
create or replace function public.character_cover_image()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.image_url is null then
    return new;
  end if;
  update public.character_images
  set character_id = new.id
  where character_id is null and url = new.image_url;
  if not found then
    insert into public.character_images (character_id, url, created_by, bonus)
    values (
      new.id,
      new.image_url,
      case when new.id like 'u-%' then new.created_by end,
      -- only a library picture gets the head start, never one of our uploads
      case
        when new.id like 'u-%'
          or new.image_url like '%/storage/v1/object/public/%' then 0
        else 20
      end
    )
    on conflict (character_id, url) do nothing;
  end if;
  return new;
end;
$$;

create or replace trigger characters_cover_image
  after insert or update of image_url on public.characters
  for each row execute function public.character_cover_image();

-- A player confirmed a card with this picture: one pick per player, and the
-- cover follows the score.
create or replace function public.record_image_pick(
  p_character text,
  p_url text,
  p_player text
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_image uuid;
begin
  select id into v_image
  from public.character_images
  where character_id = p_character and url = p_url;
  if v_image is null then
    return;
  end if;
  insert into public.character_image_picks (image_id, player_id)
  values (v_image, p_player)
  on conflict do nothing;
  if found then
    update public.character_images set picks = picks + 1 where id = v_image;
    perform public.refresh_character_cover(p_character);
  end if;
end;
$$;

-- One report per player and picture; at `p_hide_at` reports a player's
-- picture is hidden (the library's never is) and the cover moves on if it was
-- the cover. Returns the picture's status.
create or replace function public.report_character_image(
  p_image uuid,
  p_reporter text,
  p_hide_at integer
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  v_count integer;
  v_character text;
  v_status text;
begin
  insert into public.character_image_reports (image_id, reporter_id)
  values (p_image, p_reporter)
  on conflict do nothing;
  select count(*) into v_count
  from public.character_image_reports
  where image_id = p_image;
  update public.character_images
  set status = 'hidden'
  where id = p_image
    and status <> 'hidden'
    and created_by is not null
    and v_count >= p_hide_at
  returning character_id into v_character;
  if v_character is not null then
    perform public.refresh_character_cover(v_character);
  end if;
  select status into v_status from public.character_images where id = p_image;
  return v_status;
end;
$$;

-- Peter Pan's library picture was replaced by a player, with a wrong one,
-- before pictures had their own table: the library's original is the cover
-- again, and the player's stays hidden.
insert into public.character_images (character_id, url, bonus)
select
  'wd-Q107190',
  'https://upload.wikimedia.org/wikipedia/commons/0/05/Peter_pan_1911_pipes_%28cropped%29.jpg',
  20
where exists (select 1 from public.characters where id = 'wd-Q107190')
on conflict (character_id, url) do nothing;
update public.character_images
set status = 'hidden', bonus = 0
where character_id = 'wd-Q107190'
  and url like '%/storage/v1/object/public/characters/%';
select public.refresh_character_cover('wd-Q107190');

revoke all on function public.refresh_character_cover(text)
  from public, anon, authenticated;
revoke all on function public.character_cover_image()
  from public, anon, authenticated;
revoke all on function public.record_image_pick(text, text, text)
  from public, anon, authenticated;
revoke all on function public.report_character_image(uuid, text, integer)
  from public, anon, authenticated;
