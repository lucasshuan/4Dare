-- The character's names in the other languages, as written, next to its
-- aliases: the search shows the name a player typed ("Spider-Man" in a
-- Portuguese room) and guesses accept it. alias_norms already holds them
-- normalised, for the database's own search. Columns only appended, so the
-- view keeps its grants and search_characters keeps working.

create or replace view public.character_entries
with (security_invoker = true) as
  select
    n.character_id,
    n.lang,
    n.name,
    n.norm,
    n.aliases,
    n.alias_norms,
    n.popularity,
    c.image_url,
    coalesce(l.label, e.label, c.custom_origin) as origin,
    c.created_at,
    array(
      select o.name
      from public.character_names o
      where o.character_id = n.character_id and o.lang <> n.lang
      order by o.lang
    ) as other_names
  from public.character_names n
  join public.characters c on c.id = n.character_id
  left join public.origin_labels l on l.origin_id = c.origin_id and l.lang = n.lang
  left join public.origin_labels e on e.origin_id = c.origin_id and e.lang = 'en';

revoke all on public.character_entries from anon, authenticated;
