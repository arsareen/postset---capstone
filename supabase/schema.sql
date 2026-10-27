-- PostSet database schema (docs/03-architecture.md §6).
-- Run the whole file once in a new Supabase project: SQL Editor → New query → paste → Run.
-- Safe to run again: everything is "if not exists" or replaces itself.
--
-- Workshop 3 starts it with one table, shows. setlist_songs, clips, the
-- add_song and shared_clip functions and the storage bucket arrive in Week 10.

-- ---------- shows ----------
create table if not exists public.shows (
  id          bigint generated always as identity primary key,
  slug        text not null unique,
  artist      text not null,
  venue       text not null,             -- a club, a theatre or a festival
  date_local  date,
  created_by  uuid references auth.users (id) default auth.uid(),
  created_at  timestamptz not null default now()
);

-- Row-level security: the database itself decides who sees what.
-- Signed in: read every show, create shows as yourself, change only your own.
-- Signed out: nothing.
alter table public.shows enable row level security;

drop policy if exists "Signed-in users can read shows" on public.shows;
create policy "Signed-in users can read shows"
  on public.shows for select to authenticated using (true);

drop policy if exists "Signed-in users can create shows as themselves" on public.shows;
create policy "Signed-in users can create shows as themselves"
  on public.shows for insert to authenticated with check (created_by = auth.uid());

drop policy if exists "Creators can change their own shows" on public.shows;
create policy "Creators can change their own shows"
  on public.shows for update to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());

-- ---------- sample data ----------
-- The same shows the screens use (src/data/sample.js). created_by is empty
-- because no accounts exist yet. TODO(W12): give them a real owner.
insert into public.shows (slug, artist, venue, date_local) values
  ('sol-haze',    'Sol Haze',    'Brooklyn Paramount',      '2026-10-05'),
  ('mira-vale',   'Mira Vale',   'Terminal 5 · New York',   '2026-09-20'),
  ('dusk-theory', 'Dusk Theory', 'Webster Hall · New York', '2026-10-03'),
  ('lune-parade', 'Lune Parade', 'Brooklyn Steel',          '2026-08-30'),
  ('okari',       'Okari',       'Governors Ball',          '2026-06-07')
on conflict (slug) do nothing;
