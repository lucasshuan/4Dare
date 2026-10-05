-- Spanish names, ahead of a Spanish game: the library keeps characters'
-- Spanish names ("Don Ramón") and works' Spanish labels as rows of their own.
-- No Spanish list yet, so none has a popularity: the app reads one language
-- at a time and never shows them, while the other languages take them as
-- aliases (other_names) for guesses. Constraints only, no row changes; the
-- library was copied by 0024. Safe to run again.

alter table public.character_names
  drop constraint if exists character_names_lang_check;
alter table public.character_names
  add constraint character_names_lang_check
  check (lang in ('en', 'pt', 'ja', 'es'));

alter table public.origin_labels
  drop constraint if exists origin_labels_lang_check;
alter table public.origin_labels
  add constraint origin_labels_lang_check
  check (lang in ('en', 'pt', 'ja', 'es'));
