-- Private rooms are listed too now (locked, asking for a password), so the
-- room list reads every recent room, whatever its visibility.
create index if not exists rooms_recent on public.rooms (updated_at desc);
