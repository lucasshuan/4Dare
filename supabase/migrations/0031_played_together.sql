-- Whether two players ever finished a match together: "who played with me"
-- in a profile's privacy (the card, the mural). Safe to run again.

create or replace function public.played_together(p_a text, p_b text)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.match_players a
    join public.match_players b on b.match_id = a.match_id
    where a.user_id = p_a and b.user_id = p_b
  );
$$;
revoke execute on function public.played_together(text, text) from public, anon, authenticated;
