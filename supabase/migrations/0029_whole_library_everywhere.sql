-- Every language searches the whole library: a language's popularity only
-- orders it, ranked ones first. A Japanese player who types "Chaves" finds
-- him, a Brazilian who types "Maomao" finds her. One row stays out: an
-- unranked one when a ranked one in its language has its name and category,
-- the same character under another id (Wikidata and AniList both list Kurisu
-- Makise). `shadowed` marks it; columns only appended, so the view keeps its
-- grants. No row changes.

create index if not exists character_names_lang_norm_ranked
  on public.character_names (lang, norm) where popularity is not null;

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
    ) as other_names,
    n.popularity is null and exists (
      select 1
      from public.character_names v
      join public.characters vc on vc.id = v.character_id
      where v.lang = n.lang and v.norm = n.norm and v.popularity is not null
        and v.character_id <> n.character_id and v.character_id not like 'u-%'
        and vc.category is not distinct from c.category
    ) as shadowed
  from public.character_names n
  join public.characters c on c.id = n.character_id
  left join public.origin_labels l on l.origin_id = c.origin_id and l.lang = n.lang
  left join public.origin_labels e on e.origin_id = c.origin_id and e.lang = 'en';

revoke all on public.character_entries from anon, authenticated;

create or replace function public.search_characters(q text, p_lang text, p_limit integer)
returns setof public.character_entries
language sql
stable
set search_path = public
as $$
  select c.*
  from public.character_entries c
  where c.lang = p_lang
    and (
      q = ''
      or c.norm like q || '%'
      or c.norm like '%' || q || '%'
      or exists (select 1 from unnest(c.alias_norms) a where a like q || '%')
    )
    and not c.shadowed
  order by
    case
      when q = '' then 0
      when c.norm = q then 4
      when c.norm like q || '%' then 3
      when exists (select 1 from unnest(c.alias_norms) a where a like q || '%') then 2
      else 1
    end desc,
    c.popularity desc nulls last
  limit p_limit;
$$;

revoke execute on function public.search_characters(text, text, integer)
  from public, anon, authenticated;
