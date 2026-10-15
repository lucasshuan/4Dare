-- Hiding a character, from the control panel.
--
-- A character the admin takes out of the library (a duplicate, a mistake,
-- something that shouldn't be there) is hidden, never deleted: the library
-- is hand-fed (CLAUDE.md). A hidden character leaves the search, the picks,
-- the hands and the characters page (character_entries and character_catalog
-- skip it); its rows, names and pictures stay, and the panel brings it back.
--
-- Touches the library's characters table, so a copy of it is kept first
-- (characters_backup_0060). Written and read by the server only. Idempotent.

create table if not exists public.characters_backup_0060 as
  select * from public.characters;
alter table public.characters_backup_0060 enable row level security;
revoke all on public.characters_backup_0060 from anon, authenticated;

alter table public.characters
  add column if not exists hidden boolean not null default false;

create or replace view public.character_entries
with (security_invoker = true) as
select
  n.character_id,
  n.lang,
  n.name,
  n.norm,
  n.aliases || coalesce(pa.names, '{}') as aliases,
  n.alias_norms || coalesce(pa.norms, '{}') as alias_norms,
  n.popularity,
  c.image_url,
  coalesce(l.label, e.label, c.custom_origin) as origin,
  c.created_at,
  array(
    select o.name
    from public.character_names o
    where o.character_id = n.character_id and o.lang <> n.lang
    order by o.lang
  ) as other_names,
  n.popularity is null and exists (
    select 1
    from public.character_names v
    join public.characters vc on vc.id = v.character_id
    where v.lang = n.lang
      and v.norm = n.norm
      and v.popularity is not null
      and v.character_id <> n.character_id
      and v.character_id !~~ 'u-%'
      and not vc.category is distinct from c.category
  ) as shadowed
from public.character_names n
join public.characters c on c.id = n.character_id
left join public.origin_labels l on l.origin_id = c.origin_id and l.lang = n.lang
left join public.origin_labels e on e.origin_id = c.origin_id and e.lang = 'en'
left join lateral (
  select array_agg(a.name order by a.id) as names,
         array_agg(a.norm order by a.id) as norms
  from public.character_aliases a
  where a.character_id = n.character_id
    and a.lang = n.lang
    and not a.hidden
    and not a.removed
) pa on true
where not c.hidden;

create or replace function public.character_catalog(p_lang text, p_after text, p_limit integer)
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
    and not c.hidden
  order by c.id
  limit p_limit;
$function$;
