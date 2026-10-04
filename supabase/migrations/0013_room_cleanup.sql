-- Old rooms go away on their own, every hour: closed ones a day after they
-- closed, any other a week after its last write (an abandoned lobby or
-- match). Finished matches live on in `matches`; a code in use is never
-- touched, since every move writes the room.
create extension if not exists pg_cron;

create or replace function public.delete_old_rooms()
returns integer
language sql
set search_path = ''
as $$
  with gone as (
    delete from public.rooms
    where (phase = 'closed' and updated_at < now() - interval '1 day')
       or updated_at < now() - interval '7 days'
    returning 1
  )
  select count(*)::integer from gone;
$$;

revoke all on function public.delete_old_rooms() from public, anon, authenticated;

-- same name again replaces the job
select cron.schedule(
  'delete-old-rooms',
  '17 * * * *',
  'select public.delete_old_rooms()'
);
