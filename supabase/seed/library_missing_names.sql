-- Library characters with no name in a language take their English one there
-- (its aliases too), so every language searches every character (0029). Their
-- popularity there stays empty: they come after the ranked ones. Insert only:
-- safe to run again.
insert into public.character_names (character_id, lang, name, norm, aliases, alias_norms)
select n.character_id, l.lang, n.name, n.norm, n.aliases, n.alias_norms
from public.character_names n
cross join (values ('es'), ('ja'), ('pt')) as l(lang)
where n.lang = 'en' and n.character_id not like 'u-%'
on conflict (character_id, lang) do nothing;
