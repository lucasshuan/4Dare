-- The Workshop's weekly limit comes from the control panel.
--
-- create_workshop_suggestion counts 3 suggestions a week, written in the
-- function. The panel's Workshop rules now set it (src/game/workshop-rules.ts):
-- this one takes it as p_limit, with the same lock, count and insert. The
-- old function stays for the deploy in between.
--
-- Called by the server only (service key). Idempotent.

create or replace function public.create_workshop_suggestion_limited(
  p_kind text,
  p_lang text,
  p_payload jsonb,
  p_translations jsonb,
  p_author uuid,
  p_limit integer
)
returns uuid
language plpgsql
set search_path = public
as $function$
declare
  v_id uuid;
begin
  perform pg_advisory_xact_lock(hashtext('suggestion:' || p_author::text));
  if (select count(*) from public.workshop_suggestions
      where created_by = p_author and created_at >= date_trunc('week', now())) >= p_limit then
    return null;
  end if;
  insert into public.workshop_suggestions (kind, lang, payload, translations, created_by)
  values (p_kind, p_lang, p_payload, p_translations, p_author)
  returning id into v_id;
  return v_id;
end;
$function$;

revoke execute on function public.create_workshop_suggestion_limited(text, text, jsonb, jsonb, uuid, integer)
  from public, anon, authenticated;
