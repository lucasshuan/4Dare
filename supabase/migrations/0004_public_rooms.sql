-- The home screen also lists public rooms that are full or being played (not
-- only lobbies with a free seat): index every recent public room.
create index if not exists rooms_public_recent on public.rooms (updated_at desc)
  where visibility = 'public';
