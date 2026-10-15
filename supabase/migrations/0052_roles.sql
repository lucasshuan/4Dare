-- Account roles.
--
-- Every account has a role: player (everyone, by default), curator (puts
-- Workshop suggestions live) or admin (the control panel at admin.4dare.com,
-- and everything a curator does). Guests have no profile row, so no role.
--
-- The role replaces the curator flag: whoever was a curator stays one, then
-- the Google account steps down to player and the Discord account becomes the
-- admin. A partial unique index keeps it to one admin; dropping the index is
-- all it takes to allow more. The curator column stays as it was until the
-- code no longer reads it, then a later migration drops it.
--
-- Idempotent.

do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('player', 'curator', 'admin');
  end if;
end $$;

alter table public.profiles
  add column if not exists role public.user_role not null default 'player';

update public.profiles set role = 'curator'
  where curator and role = 'player';

-- Nobel's Google account (@nobel) plays; Nobel's Discord account (@noble) runs the panel.
update public.profiles set role = 'player', curator = false
  where id = '11fff349-2756-43a8-bed1-1465b4350519';
update public.profiles set role = 'admin'
  where id = 'dda55a72-0b2f-48ff-afd1-3601130bd290';

create unique index if not exists one_admin
  on public.profiles ((true)) where role = 'admin';
