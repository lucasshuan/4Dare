-- What for?'s deck: a language's best known characters (p_top), plus each
-- gosto's own best known (p_per_gosto) however far down the list they are,
-- so a gosto the famous few crowd out (games, cartoons) still deals. All with
-- a picture and a gosto, off the block list, most popular first (the id
-- breaks ties, so the server can read it in pages). The one-argument
-- version stays for servers still running the previous deploy.

create or replace function public.lineup_pool(
  p_lang text,
  p_top integer,
  p_per_gosto integer
)
returns table (
  character_id text,
  gostos public.gosto[],
  popularity integer
)
language sql
stable
set search_path = public
as $$
  -- character_gostos, inlined: called once a row it is ten times slower
  with deck as (
    select c.id,
      coalesce(
        c.gostos,
        o.gostos,
        public.gostos_by_rule(c.origin_id, c.category)
      ) as gostos,
      n.popularity
    from public.characters c
    join public.character_names n
      on n.character_id = c.id and n.lang = p_lang
    left join public.origins o on o.id = c.origin_id
    where c.id not like 'u-%'
      and c.image_url is not null
      and n.popularity is not null
      and not exists (
        select 1 from public.lineup_blocked b where b.character_id = c.id
      )
  ),
  ranked as (
    select d.id, d.gostos, d.popularity,
      row_number() over (order by d.popularity desc, d.id) as rk
    from deck d
    where cardinality(d.gostos) > 0
  ),
  per_gosto as (
    select r.id,
      row_number() over (partition by g order by r.popularity desc, r.id) as grk
    from ranked r, unnest(r.gostos) as g
  )
  select r.id, r.gostos, r.popularity
  from ranked r
  where r.rk <= p_top
    or r.id in (select p.id from per_gosto p where p.grk <= p_per_gosto)
  order by r.popularity desc, r.id;
$$;

revoke execute on function public.lineup_pool(text, integer, integer)
  from public, anon, authenticated;
