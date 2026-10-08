-- Avatars are no longer DiceBear critters but our own creatures, stored as
-- their DNA (src/lib/avatar): { kind: "creature", dna, color }. Every critter
-- left becomes the neutral Dare drawn from the critter's old seed (DNA
-- "....<seed>": no words, the seed as its variant), on the same colour.

create or replace function pg_temp.creature(a jsonb)
returns jsonb
language sql
immutable
as $$
  select case
    when a->>'kind' = 'critter' then jsonb_build_object(
      'kind', 'creature',
      'dna', '....' || coalesce(nullif(left(lower(regexp_replace(a->>'seed', '[^a-zA-Z0-9]', '', 'g')), 10), ''), '0'),
      'color', a->'color'
    )
    else a
  end
$$;

update public.profiles
set avatar = pg_temp.creature(avatar)
where avatar->>'kind' = 'critter';

update public.room_messages
set author = jsonb_set(author, '{avatar}', pg_temp.creature(author->'avatar'))
where author->'avatar'->>'kind' = 'critter';

-- character_images holds the hand-fed library too: a copy of the rows touched
-- (players' pictures only, the library's own have no author) before changing them
create schema if not exists backup;
revoke all on schema backup from public, anon, authenticated;
create table if not exists backup.character_images_authors_before_0037 as
  select id, author from public.character_images
  where created_by is not null and author->'avatar'->>'kind' = 'critter';

update public.character_images
set author = jsonb_set(author, '{avatar}', pg_temp.creature(author->'avatar'))
where created_by is not null and author->'avatar'->>'kind' = 'critter';
