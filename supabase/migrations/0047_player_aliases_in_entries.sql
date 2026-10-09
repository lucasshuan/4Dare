-- Players' nicknames (character_aliases, 0045) join the library's aliases
-- wherever a character is read in one language: the games' search and the
-- guesses that count as right. Hidden and removed ones stay out. Only the
-- view changes; the library tables are only read. Safe to run again.

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
) pa on true;
