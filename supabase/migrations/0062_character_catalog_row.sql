-- One character's catalog row.
--
-- A character's page (and the sheet the browser asks for) needs a single row
-- of character_catalog, but the server read the whole catalog for it: every
-- character, page after page, then indexed it for search. This returns the
-- same columns for one id, with the same rules (hidden characters are left
-- out), so a sheet reads one row.
--
-- Called by the server only (service key). Idempotent.

create or replace function public.character_catalog_row(p_lang text, p_id text)
returns table(id text, name text, origin text, image_url text, popularity integer, created_at timestamp with time zone, created_by text, taste text, pictures integer, aliases text[], other_names text[], langs text[])
language sql
stable
set search_path to 'public'
as $function$
  select
    c.id,
    coalesce(
      n.name,
      en.name,
      (select o.name from public.character_names o where o.character_id = c.id order by o.lang limit 1)
    ),
    coalesce(l.label, e.label, c.custom_origin),
    c.image_url,
    n.popularity,
    c.created_at,
    c.created_by,
    (public.character_tastes(c))[1]::text,
    (
      select count(*)::integer
      from public.character_images i
      where i.character_id = c.id and i.status = 'active'
    ),
    coalesce(n.aliases, '{}') || coalesce(
      (
        select array_agg(a.name order by a.id)
        from public.character_aliases a
        where a.character_id = c.id
          and a.lang = p_lang
          and not a.hidden
          and not a.removed
      ),
      '{}'
    ),
    array(
      select o.name from public.character_names o
      where o.character_id = c.id and o.lang <> p_lang
      order by o.lang
    ),
    array(
      select o.lang from public.character_names o
      where o.character_id = c.id
      order by o.lang
    )
  from public.characters c
  left join public.character_names n on n.character_id = c.id and n.lang = p_lang
  left join public.character_names en on en.character_id = c.id and en.lang = 'en'
  left join public.origin_labels l on l.origin_id = c.origin_id and l.lang = p_lang
  left join public.origin_labels e on e.origin_id = c.origin_id and e.lang = 'en'
  where c.id = p_id
    and not c.hidden;
$function$;

revoke execute on function public.character_catalog_row(text, text)
  from public, anon, authenticated;
