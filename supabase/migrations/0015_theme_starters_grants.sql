-- theme_starters is read only by the server (service role), like the other
-- tables: drop the default grants anon and authenticated got with the table.
-- Row level security with no policies already blocked them. Idempotent.

revoke all on public.theme_starters from anon, authenticated;
