-- Themes drawn at the start of a match. The list in data/themes.json is loaded
-- by `pnpm seed` (source 'bank'); themes the AI invents are kept too (source
-- 'ai'). Turn one off with active = false: the servers pick it up within ten
-- minutes, no deploy needed. Read and written only by the server.

create table if not exists public.themes (
  id text primary key, -- from the English text: "famous-duos"
  en text not null,
  pt text not null,
  ja text not null,
  source text not null check (source in ('bank', 'ai')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists themes_active on public.themes (active) where active;

alter table public.themes enable row level security;
