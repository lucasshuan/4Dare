-- Room chat: what players write in the lobby and the match, and the system
-- lines a match posts ("Match started", "Theme: Superheroes", the order, the
-- first turn; src/game/chat.ts). Like every table it is written and read only
-- by the server (service key): browsers hear a "chat" ping on the room's
-- Realtime topic (an id, never the text) and fetch through
-- /api/rooms/[code]/messages. A room's chat is deleted when it closes; chats
-- of rooms that died without closing are pruned after a day (see
-- src/server/rooms.ts), and deleting a room takes its chat with it.
-- Idempotent: safe to run again.

create table if not exists public.room_messages (
  id bigint generated always as identity primary key,
  room_code text not null references public.rooms (code) on delete cascade,
  author_id text,          -- null for a system line
  author jsonb,            -- the writer as the room showed them: id, isGuest, name, guestNumber, avatar
  body text,               -- what they wrote, 1 to 280 characters
  system jsonb,            -- a system line: { "type": "theme", "theme": { ... } }
  show_at timestamptz not null default now(),   -- hidden until then (a line waits for its scene)
  created_at timestamptz not null default now(),
  constraint room_messages_kind check (
    (body is not null and system is null and author_id is not null
      and char_length(body) between 1 and 280)
    or (body is null and system is not null and author_id is null)
  )
);

create index if not exists room_messages_room
  on public.room_messages (room_code, created_at);
create index if not exists room_messages_created
  on public.room_messages (created_at);

alter table public.room_messages enable row level security;
revoke all on public.room_messages from anon, authenticated;

-- Saves one line and returns it. A player's line is refused (rate_limited)
-- when its author already wrote 5 lines in this room in the last 10 seconds,
-- or 30 in the last minute: this holds across every server instance, where
-- the route's in-memory check only holds within one. The lock makes two
-- lines sent at once by the same author count each other.
create or replace function public.add_room_message(
  p_room text,
  p_author text,
  p_author_json jsonb,
  p_body text,
  p_system jsonb,
  p_show_at timestamptz
)
returns public.room_messages
language plpgsql
security definer
set search_path = public
as $$
declare
  saved public.room_messages;
begin
  if p_body is not null then
    perform pg_advisory_xact_lock(
      hashtextextended('room_messages:' || p_room || ':' || coalesce(p_author, ''), 0)
    );
    if (select count(*) from public.room_messages
          where room_code = p_room and author_id = p_author and body is not null
            and created_at > now() - interval '10 seconds') >= 5
       or (select count(*) from public.room_messages
          where room_code = p_room and author_id = p_author and body is not null
            and created_at > now() - interval '60 seconds') >= 30 then
      raise exception 'rate_limited' using errcode = 'P0001';
    end if;
  end if;
  insert into public.room_messages (room_code, author_id, author, body, system, show_at)
  values (p_room, p_author, p_author_json, p_body, p_system, coalesce(p_show_at, now()))
  returning * into saved;
  return saved;
end;
$$;

revoke all on function public.add_room_message(text, text, jsonb, text, jsonb, timestamptz)
  from public, anon, authenticated;

-- A guest signed in to an account: their lines move to it (author_id and the
-- id in the snapshot), and the system lines that name them ("Order: …", the
-- first turn) name the account, so the screens show its name and face.
create or replace function public.reassign_room_messages(p_from text, p_to text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_from text := '"id": ' || to_jsonb(p_from)::text;
  v_to text := '"id": ' || to_jsonb(p_to)::text;
begin
  if p_from = p_to then
    return;
  end if;
  update public.room_messages
     set author_id = p_to,
         author = jsonb_set(author, '{id}', to_jsonb(p_to))
   where author_id = p_from;
  -- jsonb prints every key as "key": value, so the person's id is found as text
  update public.room_messages
     set system = replace(system::text, v_from, v_to)::jsonb
   where system is not null and strpos(system::text, v_from) > 0;
end;
$$;

revoke all on function public.reassign_room_messages(text, text)
  from public, anon, authenticated;
