-- Rooms nobody has open get closed. An open page keeps its room written at
-- least once a minute (HEARTBEAT_MS: a read past it writes a quiet SEEN, and
-- hidden tabs keep polling), and a room that sees its pages close sweeps
-- itself on the next read. That read never comes when everyone left: a
-- killed browser sends no goodbye, and a page that did say goodbye only frees
-- its seat once someone reads the room again. Those rooms stayed open until
-- delete_old_rooms took them a week later.
--
-- Every 10 minutes, a room not written for 30 minutes closes the way the
-- engine closes one (phase, no turn, no reveal, no clock), with a new version
-- so a stale write from a page that wakes up loses its compare-and-swap.
-- Closed rooms then go a day later, as before.

create or replace function public.close_idle_rooms()
returns integer
language sql
set search_path = ''
as $$
  with closed as (
    update public.rooms
       set phase = 'closed',
           state = state || jsonb_build_object(
             'phase', 'closed',
             'turnPlayerId', null,
             'reveal', null,
             'deadline', null,
             'stepStartsAt', null,
             'stepMs', null,
             'updatedAt', (extract(epoch from now()) * 1000)::bigint
           ),
           version = version + 1,
           updated_at = now()
     where phase <> 'closed'
       and updated_at < now() - interval '30 minutes'
    returning 1
  )
  select count(*)::integer from closed;
$$;

revoke all on function public.close_idle_rooms() from public, anon, authenticated;

-- same name again replaces the job
select cron.schedule(
  'close-idle-rooms',
  '*/10 * * * *',
  'select public.close_idle_rooms()'
);
