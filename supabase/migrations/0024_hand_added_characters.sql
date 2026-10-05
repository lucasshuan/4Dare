-- Characters added to the library by hand, for the ones neither Wikidata nor
-- AniList gave ("hand-fox-mccloud"), with origins as "topic:<slug>". Their
-- picks count once per character across languages, like the others'. The
-- library is hand-fed: a copy of it first. Safe to run again.

create schema if not exists backup;
revoke all on schema backup from public, anon, authenticated;
create table if not exists backup.characters_before_0024 as
  select * from public.characters where created_by is null;
create table if not exists backup.character_names_before_0024 as
  select n.*
  from public.character_names n
  join public.characters c on c.id = n.character_id
  where c.created_by is null;
create table if not exists backup.origins_before_0024 as
  table public.origins;
create table if not exists backup.origin_labels_before_0024 as
  table public.origin_labels;
create table if not exists backup.character_images_before_0024 as
  select * from public.character_images where created_by is null;

-- A library id without its language ("pt-wd-Q302" -> "wd-Q302"); players'
-- characters ("u-<uuid>") stay as they are.
create or replace function public.whoami_pick_key(p_id text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_id ~ '^(en|pt|ja)-((wd-Q|al-)[0-9]+|hand-[a-z0-9]+(-[a-z0-9]+)*)$'
      then substr(p_id, 4)
    else p_id
  end;
$$;

revoke all on function public.whoami_pick_key(text)
  from public, anon, authenticated;
