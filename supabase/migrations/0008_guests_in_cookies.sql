-- Guests are a signed cookie now (src/server/auth/guest.ts), never a database
-- row. The anonymous Supabase users guests used to be go away, with their
-- profiles, identities and sessions (all cascade from auth.users). Matches
-- keep the old ids, like any guest's.

delete from auth.users where is_anonymous;

alter table public.profiles drop column if exists is_guest;
