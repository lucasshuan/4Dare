-- Names the import took from vandalised or misspelt Wikidata labels, found
-- while naming the library in Spanish. The bad names do not stay as aliases.
-- Safe to run again.
with v(id, lang, bad, good, norm) as (values
  ('wd-Q14602686', 'en', 'gabriel putita del leon', 'Gabriel Paulista', 'gabrielpaulista'),
  ('wd-Q18617137', 'en', 'Gerson Santos Putin', 'Gerson', 'gerson'),
  ('wd-Q231182', 'en', 'Paolo Maldini Osbourne', 'Kelly Osbourne', 'kellyosbourne'),
  ('wd-Q31768', 'en', 'Sadawo Abe', 'Sadao Abe', 'sadaoabe'),
  ('wd-Q347395', 'en', 'Luis Gómez', 'Luis Guzmán', 'luisguzman'),
  ('wd-Q459348', 'en', 'Oona Castilla Chaplin', 'Oona Chaplin', 'oonachaplin'),
  ('wd-Q483512', 'en', 'Isadora Duncana', 'Isadora Duncan', 'isadoraduncan'),
  ('wd-Q54365875', 'en', 'Kōki,', 'Kōki', 'koki'),
  ('wd-Q54365875', 'ja', 'Kōki,', 'Kōki', 'koki'),
  ('wd-Q920039', 'en', 'Cássio Bramitos', 'Cássio Ramos', 'cassioramos'),
  ('wd-Q96106282', 'en', 'Michele Morrone Algoes', 'Michele Morrone', 'michelemorrone')
),
fixed as (
  update public.character_names n
  set name = v.good, norm = v.norm
  from v
  where n.character_id = v.id and n.lang = v.lang and n.name = v.bad
  returning n.character_id
)
select count(*) from fixed;

-- The other languages' rows forget the bad names' normalised forms and take
-- the good ones.
update public.character_names n
set alias_norms = array(
  select distinct x from (
    select unnest(n.alias_norms) as x
    union select o.norm from public.character_names o
    where o.character_id = n.character_id and o.lang <> n.lang
  ) s
  where x <> n.norm
    and x not in ('gabrielputitadelleon', 'gersonsantosputin', 'paolomaldiniosbourne',
      'sadawoabe', 'luisgomez', 'oonacastillachaplin', 'isadoraduncana',
      'cassiobramitos', 'michelemorronealgoes')
)
where n.character_id in ('wd-Q14602686', 'wd-Q18617137', 'wd-Q231182', 'wd-Q31768',
  'wd-Q347395', 'wd-Q459348', 'wd-Q483512', 'wd-Q54365875', 'wd-Q920039',
  'wd-Q96106282');
