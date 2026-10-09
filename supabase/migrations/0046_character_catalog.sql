-- The characters page's catalog: every character in one language, with what
-- its card and filters need (work, first taste, pictures everyone sees,
-- players' nicknames, the languages it has a name in). The server reads it
-- a page at a time, after the last id it got, and keeps it a few minutes.
-- Only reads; safe to run again.

drop function if exists public.character_catalog(text);

create or replace function public.character_catalog(p_lang text, p_after text, p_limit integer)
returns table (
  id text,
  name text,
  origin text,
  image_url text,
  popularity integer,
  created_at timestamptz,
  created_by text,
  taste text,
  pictures integer,
  aliases text[],
  other_names text[],
  langs text[]
)
language sql
stable
set search_path = public
as $$
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
    coalesce(pics.n, 0),
    coalesce(n.aliases, '{}') || coalesce(pa.names, '{}'),
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
  left join (
    select i.character_id, count(*)::integer as n
    from public.character_images i
    where i.status = 'active'
    group by i.character_id
  ) pics on pics.character_id = c.id
  left join (
    select a.character_id, array_agg(a.name order by a.id) as names
    from public.character_aliases a
    where a.lang = p_lang and not a.hidden and not a.removed
    group by a.character_id
  ) pa on pa.character_id = c.id
  where c.id > coalesce(p_after, '')
  order by c.id
  limit p_limit;
$$;
revoke execute on function public.character_catalog(text, text, integer)
  from public, anon, authenticated;
