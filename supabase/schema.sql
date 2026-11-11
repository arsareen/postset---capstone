-- PostSet database schema (docs/03-architecture.md §6).
-- Run the whole file once in a new Supabase project: SQL Editor → New query → paste → Run.
-- Safe to run again: everything is "if not exists" or replaces itself.
--
-- Tables: shows, setlist_songs, clips. Function: add_song. Storage bucket: clips.
-- Access rule everywhere: signed in can read everything and change only their
-- own rows; signed out gets nothing.

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
alter table public.shows add column if not exists cover text;  -- image path under src/, e.g. img/anotr-pacha-nyc.jpg

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

-- ---------- song matching (decision 0002) ----------
-- The same rule as src/song-key.js: case, apostrophes and punctuation don't
-- count, so "Ferris", "ferris" and "FERRIS!" are one song. Keep the two in step.
create or replace function public.song_key(title text)
returns text language sql immutable parallel safe as $$
  select btrim(regexp_replace(
           regexp_replace(
             regexp_replace(lower(normalize(coalesce(title, ''), NFKC)), '[''’]', '', 'g'),
             '[^a-z0-9\s]+', ' ', 'g'),
           '\s+', ' ', 'g'))
$$;

-- ---------- setlist_songs ----------
-- Each show's songs in order. normalized_title is computed by the database,
-- and the unique index means no screen can create a duplicate song page.
create table if not exists public.setlist_songs (
  id                bigint generated always as identity primary key,
  show_id           bigint not null references public.shows (id) on delete cascade,
  title             text not null check (char_length(btrim(title)) between 1 and 80),
  normalized_title  text generated always as (public.song_key(title)) stored,
  position          int not null,
  created_by        uuid references auth.users (id) default auth.uid(),
  created_at        timestamptz not null default now(),
  unique (show_id, normalized_title),
  unique (id, show_id)                  -- lets clips check their song is from the same show
);

alter table public.setlist_songs enable row level security;

drop policy if exists "Signed-in users can read setlists" on public.setlist_songs;
create policy "Signed-in users can read setlists"
  on public.setlist_songs for select to authenticated using (true);
-- No insert/update/delete policies: songs are only added through add_song.

-- Adds a song to the end of a show's setlist, or returns the one that already
-- matches. "id", "I.D." etc. are saved as "ID" (the unknown-track tag).
create or replace function public.add_song(p_show_id bigint, p_title text)
returns public.setlist_songs
language plpgsql security definer set search_path = public as $$
declare
  t    text := regexp_replace(btrim(coalesce(p_title, '')), '\s+', ' ', 'g');
  song public.setlist_songs;
begin
  if auth.uid() is null then
    raise exception 'Sign in to add a song' using errcode = '42501';
  end if;
  if replace(public.song_key(t), ' ', '') = 'id' then t := 'ID'; end if;
  if public.song_key(t) = '' then
    raise exception 'Tag a song, or type ID if nobody knows it yet' using errcode = '22023';
  end if;

  select * into song from public.setlist_songs
   where show_id = p_show_id and normalized_title = public.song_key(t);
  if found then return song; end if;

  insert into public.setlist_songs (show_id, title, position, created_by)
  values (p_show_id, t,
          coalesce((select max(position) from public.setlist_songs where show_id = p_show_id), 0) + 1,
          auth.uid())
  on conflict (show_id, normalized_title) do nothing
  returning * into song;

  if song.id is null then  -- someone else added it a moment ago
    select * into song from public.setlist_songs
     where show_id = p_show_id and normalized_title = public.song_key(t);
  end if;
  return song;
end $$;

revoke all on function public.add_song(bigint, text) from public, anon;
grant execute on function public.add_song(bigint, text) to authenticated;

-- ---------- clips ----------
create table if not exists public.clips (
  id            uuid primary key default gen_random_uuid(),
  show_id       bigint not null references public.shows (id) on delete cascade,
  song_id       bigint not null,
  storage_path  text not null unique,     -- clips/<uploader id>/<random>.<ext> in Storage
  filename      text not null check (char_length(filename) between 1 and 200),
  uploaded_by   uuid not null references auth.users (id) default auth.uid(),
  created_at    timestamptz not null default now(),
  foreign key (song_id, show_id) references public.setlist_songs (id, show_id) on delete cascade
);
create index if not exists clips_song_idx on public.clips (song_id);
-- A still frame for lists and the angle strip, the clip's length, and when it
-- was filmed (from the file; orders the angles on a song page, Story 6).
alter table public.clips add column if not exists thumb_path  text;
alter table public.clips add column if not exists duration_s  real;
alter table public.clips add column if not exists recorded_at timestamptz;

alter table public.clips enable row level security;

drop policy if exists "Signed-in users can read clips" on public.clips;
create policy "Signed-in users can read clips"
  on public.clips for select to authenticated using (true);

drop policy if exists "Uploaders add clips as themselves" on public.clips;
create policy "Uploaders add clips as themselves"
  on public.clips for insert to authenticated
  with check (uploaded_by = auth.uid() and split_part(storage_path, '/', 1) = auth.uid()::text
              and (thumb_path is null or split_part(thumb_path, '/', 1) = auth.uid()::text));

drop policy if exists "Uploaders retag their own clips" on public.clips;
create policy "Uploaders retag their own clips"
  on public.clips for update to authenticated
  using (uploaded_by = auth.uid())
  with check (uploaded_by = auth.uid() and split_part(storage_path, '/', 1) = auth.uid()::text
              and (thumb_path is null or split_part(thumb_path, '/', 1) = auth.uid()::text));

drop policy if exists "Uploaders delete their own clips" on public.clips;
create policy "Uploaders delete their own clips"
  on public.clips for delete to authenticated using (uploaded_by = auth.uid());

-- ---------- video storage ----------
-- Private bucket, 50 MB per file: videos and their JPEG still frames. Files
-- live in a folder named after the uploader's user id, and only they can add
-- or remove files there.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('clips', 'clips', false, 52428800, array['video/*', 'image/jpeg'])
on conflict (id) do update
  set public = false, file_size_limit = 52428800, allowed_mime_types = array['video/*', 'image/jpeg'];

drop policy if exists "Signed-in users can watch clips" on storage.objects;
create policy "Signed-in users can watch clips"
  on storage.objects for select to authenticated using (bucket_id = 'clips');

drop policy if exists "Uploaders add videos to their own folder" on storage.objects;
create policy "Uploaders add videos to their own folder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'clips' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Uploaders delete their own videos" on storage.objects;
create policy "Uploaders delete their own videos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'clips' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- shows ----------
-- The real shows clips have been filmed at. created_by is empty because they
-- belong to no account; anyone signed in can upload to them. Setlists start
-- empty and grow as clips are tagged (decision 0002; Story 7, AC2).
-- date_local is the night the show started.
insert into public.shows (slug, artist, venue, date_local, cover) values
  ('anotr-pacha-ibiza',  'ANOTR',                'Pacha Ibiza',         '2026-04-26', 'img/anotr-pacha-ibiza.jpg'),
  ('anotr-pacha-nyc',    'ANOTR',                'Pacha NYC',           '2026-07-10', 'img/anotr-pacha-nyc.jpg'),
  ('dean-storehouse',    'Luke Dean & Max Dean', 'Brooklyn Storehouse', '2026-07-24', 'img/dean-storehouse.jpg')
on conflict (slug) do update set artist = excluded.artist, venue = excluded.venue,
  date_local = excluded.date_local, cover = excluded.cover;
