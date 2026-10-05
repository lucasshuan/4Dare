-- Library characters a language's players know but its list left out. Each
-- language's list was the 8000 most read in its own Wikipedia, and Portuguese
-- readers seldom open cartoon or anime articles: Shrek, Buzz Lightyear, Tom
-- and Jerry or Nezuko were in the database, named, yet nowhere in the
-- Portuguese search. Here a character joins a language where it already has
-- a name when another language's list holds it high enough:
--   fictional  from any other language
--   people     only when both other languages hold them (a Japanese actor
--              alone in the Japanese list stays out of the Portuguese one)
-- Its popularity there is the other language's, moved by the gap between the
-- two lists' medians, less 1000 (3000 for people) for not being measured
-- there; it joins when that clears the language's own cut. A name already in
-- the language's list (the same character under another id, mostly) keeps
-- it out, and of two newcomers with one name only the stronger joins. Only
-- fills a missing popularity: safe to run again.
with lib as (
  select c.id, c.kind, n.lang, n.norm, n.popularity
  from public.characters c
  join public.character_names n on n.character_id = c.id
  where c.created_by is null
),
lists as (
  select
    lang,
    percentile_disc(0.5) within group (order by popularity) as median,
    min(popularity) as cut
  from lib
  where popularity is not null
  group by lang
),
heard as (
  select
    t.id,
    t.lang,
    t.norm,
    max(
      s.popularity + tl.median - sl.median
      - case when t.kind = 'fictional' then 1000 else 3000 end
    ) as popularity
  from lib t
  join lib s on s.id = t.id and s.lang <> t.lang and s.popularity is not null
  join lists tl on tl.lang = t.lang
  join lists sl on sl.lang = s.lang
  where t.popularity is null
  group by t.id, t.lang, t.norm, t.kind
  having t.kind = 'fictional' or count(*) = 2
),
joining as (
  select distinct on (h.lang, h.norm) h.id, h.lang, h.popularity
  from heard h
  join lists l on l.lang = h.lang
  where h.popularity >= l.cut
    and not exists (
      select 1 from lib v
      where v.lang = h.lang and v.norm = h.norm and v.popularity is not null
    )
  order by h.lang, h.norm, h.popularity desc, h.id
)
update public.character_names n
set popularity = j.popularity
from joining j
where n.character_id = j.id and n.lang = j.lang and n.popularity is null;
