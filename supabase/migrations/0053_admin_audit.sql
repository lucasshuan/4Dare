-- What the admin changed, and when.
--
-- The control panel writes one row for every change it makes: a role, a
-- game's settings, a bank row taken offline, a sanction. `target` names what
-- changed (a profile id, a config key, a bank row), `before` and `after` hold
-- the values, and `note` is what the admin wrote, if anything. The panel only
-- appends; nothing updates or deletes rows.
--
-- Written and read by the server only (service key). Idempotent.

create table if not exists public.admin_audit (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  target text not null,
  before jsonb,
  after jsonb,
  note text check (note is null or char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create index if not exists admin_audit_recent
  on public.admin_audit (created_at desc);
create index if not exists admin_audit_target
  on public.admin_audit (target, created_at desc);

alter table public.admin_audit enable row level security;
revoke all on public.admin_audit from anon, authenticated;
