-- Fixes from the Supabase advisors (security and performance).

-- pg_trgm lived in public, so the Data API let anyone call its functions,
-- set_limit() among them. In its own schema they are out of reach. Nothing
-- calls them by name: search_characters only uses like, which the trigram
-- index on character_names keeps serving, and no row changes.
create schema if not exists extensions;
alter extension pg_trgm set schema extensions;

-- deleting a character cascades into theme_starters; without this index each
-- delete reads the whole table
create index if not exists theme_starters_character
  on public.theme_starters (character_id);
