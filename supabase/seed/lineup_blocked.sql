-- Real people kept off What for?'s auction: a short list, by hand. The rule:
-- someone who committed atrocities (or answers for them now), or the victim
-- of a recent tragedy. Hand-fed: insert and update only.
insert into public.lineup_blocked (character_id, reason)
values
  ('wd-Q7747', 'War of aggression; wanted by the International Criminal Court.'),
  ('wd-Q43723', 'Wanted by the International Criminal Court for war crimes.'),
  ('wd-Q57336', 'Leads a regime of mass executions and repression.'),
  ('wd-Q38823', 'Ordered the mass executions of 1988.'),
  ('wd-Q118725', 'Ordered the Hama massacre.'),
  ('wd-Q58132', 'Under investigation for crimes against humanity.'),
  ('wd-Q15031', 'Leads the mass detention of Uyghurs.'),
  ('wd-Q30121972', 'Killed in 2025: a recent tragedy, not a joke.')
on conflict (character_id) do update set reason = excluded.reason;
