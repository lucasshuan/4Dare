-- What for?'s priciest characters in a language: the average price of those
-- sold at least p_min times, dearest first, for the game's page.
create or replace function public.lineup_priciest(p_lang text, p_min integer, p_limit integer)
returns table (card_id text, sold integer, avg_price numeric)
language sql
stable
set search_path = public
as $$
  select s.card_id, s.sold, round(s.price_sum::numeric / s.sold, 1)
  from public.lineup_card_stats s
  where s.lang = p_lang and s.sold >= greatest(1, p_min)
  order by s.price_sum::numeric / s.sold desc, s.sold desc
  limit greatest(0, least(p_limit, 24));
$$;
revoke execute on function public.lineup_priciest(text, integer, integer) from public, anon, authenticated;
