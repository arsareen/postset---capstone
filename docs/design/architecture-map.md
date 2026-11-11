# PostSet: Architecture Map

CP-M3. MVP slice only. Each box names the requirement it serves. Explained in [../03-architecture.md](../03-architecture.md).

```
┌──────────────────────────────────────────────────────────────────┐
│  PHONE / LAPTOP BROWSER   static files from src/, served locally │
│                                                                  │
│  Shows list ──▶ Event page ──▶ Song page        Share page       │
│  (PRD gap)      Story 7        Stories 1, 6     FR8, no account  │
│                                                                  │
│  Upload page    60s cap · re-encode >50MB to 1080p    FR1, FR2   │
│                                                                  │
│  supabase-js  (the only dependency; carries the user's session)  │
└────────┬─────────────────────┬──────────────────────┬────────────┘
         │ sign in / session   │ queries + add_song   │ upload / signed link
         ▼                     ▼                      ▼
┌──────────────────────────────────────────────────────────────────┐
│  SUPABASE  (one free project)                                    │
│                                                                  │
│  ┌──────────────┐  ┌───────────────────────────┐  ┌────────────┐ │
│  │ Auth         │  │ Postgres                  │  │ Storage    │ │
│  │ email +      │  │ shows                     │  │ bucket     │ │
│  │ password     │  │ setlist_songs   Story 7   │  │ "clips"    │ │
│  │ FR8          │  │ clips           FR3, FR4  │  │ private,   │ │
│  │              │  │                           │  │ 50MB limit │ │
│  │              │  │ add_song()      FR2       │  │ FR1, FR7   │ │
│  │              │  │ shared_clip()   FR8       │  │            │ │
│  └──────────────┘  └───────────────────────────┘  └────────────┘ │
│                                                                  │
│  ROW-LEVEL SECURITY: checked on every query and every file       │
│  signed in → read all, write own · signed out → shared clip only │
└──────────────────────────────────────────────────────────────────┘
         ▲
         │  supabase/schema.sql: tables, policies, functions, bucket
         │  (a clean clone runs this once in a new project)
```

## Story 1 traced: "watch a song I never recorded"

```
open event  ──▶ query show, setlist_songs (by position), clips   [with session]
            ──▶ Postgres row-level security: signed in? ── no ──▶ 0 rows → sign-in
            ◀── rows: songs in order, each song's clips
tap song    ──▶ (no request) order angles by recorded_at
                0 clips → "No clips yet"     1 clip → single player
play angle  ──▶ Storage: signed link for that file (signed in?) ──▶ video plays
```

## Upload traced

```
pick show, pick or type song, pick file
  ──▶ (browser) >60s? refuse · >50MB? re-encode to 1080p
  ──▶ add_song(show, title)            → song id (new, or the existing match)
  ──▶ Storage: clips/<my id>/<uuid>    → rule: own folder, ≤ 50MB
  ──▶ insert clips row                 → rule: uploaded_by = me
        insert fails? ──▶ delete the uploaded file
```
