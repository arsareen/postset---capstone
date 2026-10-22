# PostSet: Technical Architecture

IST300 Prompts to Products · CP-M3 · Capstone repo: `arsareen/postset---capstone`

This covers the MVP slice only: Stories 1, 6 and 7, plus upload and accounts (PRD §4). Nothing from the Won't band or the roadmap is on the map. The map itself is in [design/architecture-map.md](design/architecture-map.md).

---

## 1. Where this architecture comes from

I'm also building PostSet outside class, as POSTSET at postset.app, which has had real people uploading clips from real nights since September. That app has already run into most of the problems this document has to answer: how big iPhone video is, people typing the same song three different ways, and what someone without an account should be allowed to see.

The capstone keeps the decisions about the product and the data that have survived real use there: the setlist model, song-title matching, uploads going straight from the phone to storage, angles ordered by filming time, and a share page that shows one clip. It deliberately rebuilds the technical side on a different, simpler stack, and it's a separate codebase and a separate set of services (§10).

## 2. The decision

| Layer | Choice |
|---|---|
| Front end | Plain HTML, CSS and JavaScript, no framework, one file per screen. The Lab 4 prototype screens become the real screens. |
| Back end | **Supabase**, all of it: Postgres database, Auth (sign-in), Storage (video), and row-level security, meaning access rules the database itself enforces on every request |
| Server code | None. The browser talks to Supabase directly through `supabase-js`, the one dependency. The rules live in the database, not in a server I'd have to write. |
| Where it runs | Locally. The front end is served from `src/` by any static server (`python3 -m http.server`) and talks to one free Supabase project. |

## 3. What decides a stack for PostSet, ranked

1. **Handles phone video inside free limits.** An iPhone filming 4K at 60fps produces about 400 MB per minute. Video is the product; everything else is a normal web app.
2. **Access rules enforced where the data lives.** Signed-out people see nothing except a clip someone chose to share. Week 12 makes the point directly: the UI can hide a row, but only the place the data lives can protect it.
3. **Someone else can run it from a clean clone using only the README** (D12, DD). Without hosting, the README is the whole deployment.
4. **Fits five weeks of build time.** Familiarity counts. I've built this data model on Postgres before, and Supabase is Postgres, so the tables and queries carry over. What's new to me is Supabase's sign-in and access rules.
5. **Free at class scale.**

## 4. Stacks compared

| Criterion | **A. Supabase only** | B. Supabase + Cloudflare R2 for video | C. Firebase |
|---|---|---|---|
| 1. Video | 50 MB per file and 1 GB total on the free plan. That works if clips are compressed to 1080p and capped at 60 seconds (§8). | R2 has no meaningful file cap and charges nothing for viewing bandwidth. But R2's keys can't sit in the browser, so every upload needs server code to sign it, and there is no server. | Storage needs the Blaze (billing) plan, with a card on file |
| 2. Access rules in the database | Row-level security covers both the database and the video files | Covers the database, but not the R2 files, which would need their own separate checks | Security Rules cover the database and storage |
| 3. Clean clone | **Best.** One account; run one schema file; done. | Two accounts plus server code to deploy | One account, plus billing |
| 4. Five weeks | Postgres, which I know. Auth and row-level security are new. | Everything in A, plus a signing service | New database model. "Every clip of this song, in setlist order" is a relational question, and Firestore is a document store. |
| 5. Free | Yes, within the limits above | Yes | Needs billing turned on |

**I'm picking A.** It wins on access rules and the clean clone, and it is the only option with no server code at all. B only fixes the file-size limit, and it costs a server, a second account, and access checks that don't cover the video. A handles the file-size limit with compression and a length cap instead.

## 5. Components and what each one is for

Every box on the map, and the requirement it exists for.

| Component | What it does | Serves |
|---|---|---|
| Shows list page | Your events; tap one to open it | Reaching any event (PRD gap, §11) |
| Event page | One show's setlist in order, with clip counts per song | Story 7 |
| Song page | Every clip of a song as angles you can switch between | Stories 1, 6 |
| Upload page | Pick show, pick or add a song, pick a file; compress if needed; upload | FR1, FR2 |
| Share page (`share.html?t=…`) | Plays one shared clip, no account needed | FR8 |
| Supabase Auth | Email and password sign-in; the session lives in the browser | FR8 |
| Postgres tables `shows`, `setlist_songs`, `clips` | Which clips belong to which song, and the setlist order | FR3, FR4, Story 7 |
| Row-level security policies | Signed in: read everything, write only your own rows. Signed out: nothing. | FR8 |
| `add_song(show_id, title)` database function | Adds a song, or returns the existing one when the title matches | FR2, Story 7 |
| `shared_clip(token)` database function | The one thing a signed-out visitor can call: returns exactly one shared clip | FR8 |
| Storage bucket `clips` (private, 50 MB limit) | Video files and poster frames, filed under each uploader's own folder | FR1, FR7 |

Two pieces trace to no user story: the **shows list** and **creating a show**. The prototype showed I can't reach an event or upload without them. That means the PRD is missing requirements, not that the pieces are unneeded (see §11).

## 6. Data model (MVP)

```
shows          id, slug, artist, venue (club or festival), date_local,
               created_by → auth.users
setlist_songs  id, show_id → shows, title, normalized_title, position
               unique (show_id, normalized_title)
clips          id, show_id → shows, song_id → setlist_songs,
               storage_path, thumb_path, uploaded_by → auth.users,
               recorded_at, share_token (null until shared), created_at
```

All of it lives in one file, `supabase/schema.sql`: tables, access policies, the two functions and the storage bucket. A clean clone needs a new Supabase project and that file run once in its SQL editor.

**Where the setlist comes from** (decision record [0002](decisions/0002-setlist-and-song-tagging.md)):
- Each show has its own setlist, in order.
- At upload you pick a song from that show's setlist, or type a new title, which is added to the end of the list.
- Titles are matched on a cleaned-up version of the name (lowercase, punctuation stripped, a trailing " - Artist" removed), so "Strobe", "strobe" and "Strobe - deadmau5" all land on one song page.
- The cleaning happens inside the database (`add_song` plus the unique index), so no screen can create a duplicate by skipping it.
- Whoever created the show can reorder its setlist.

This replaces the PRD's free-text song tags. Those had no order for Story 7 to show, and they would split one song across several pages.

**Access rules:**

| Table or bucket | Read | Write |
|---|---|---|
| `shows` | Signed-in users | Anyone signed in can create one; only its creator can change it |
| `setlist_songs` | Signed-in users | Adding goes through `add_song`; reordering and renaming are for the show's creator only |
| `clips` | Signed-in users | Only rows where `uploaded_by` is you |
| Storage | Signed-in users | Uploads only into a folder named after your own user id; delete only your own files |

Signed-out visitors get only `shared_clip(token)`, plus read access to a file whose clip has been shared.

`recorded_at` is the filming time read from the video file. It only orders the angles on a song page (Story 6); nothing else depends on it.

## 7. Trace: Story 1, "watch a song I never recorded"

1. The viewer is signed in, so the browser holds their Supabase session.
2. They open an event page. `supabase-js` sends three queries with that session attached: the show by slug, its `setlist_songs` ordered by `position`, and its `clips`.
3. Postgres checks the access rules on each query. Signed in: the rows come back. Signed out: nothing comes back, and the page sends them to sign-in.
4. The page shows the setlist in order, with a clip count per song.
5. The viewer taps a song. The song page orders that song's clips by `recorded_at` and shows them as angles (Story 6).
6. For the angle being played, the browser asks Storage for a signed link, a temporary URL to that one file. Storage checks the viewer is signed in, and the video plays from Supabase Storage.

**Edge cases.** A song with no clips shows "No clips yet" (Story 1, AC2). A song with one clip shows a single player with no angle picker (Story 6, AC2).

## 8. Trace: uploading a clip

1. On the upload screen the user picks a show, picks or types a song, and chooses a video.
2. The browser reads the clip's length and turns down anything over 60 seconds. If the file is over 50 MB, it re-encodes it to 1080p at about 5 Mbps, roughly 38 MB per minute, so a 60-second clip fits.
3. If the song is new, the browser calls `add_song`, which returns the song's id, either newly created or the matching existing one.
4. The browser uploads the file to `clips/<my user id>/<random id>.mp4`. Storage checks that the folder is the uploader's own and that the file is under the bucket's 50 MB limit.
5. The browser inserts the `clips` row (show, song, file path, filming time). The access rules check that `uploaded_by` is the signed-in user.
6. The clip now appears on that song's page for everyone signed in.

**Failure path.** If step 5 fails after step 4 succeeded, the file sits in Storage with no row pointing at it. The upload page deletes the file when the insert fails. Anything left over after a crash is a known gap.

## 9. What this costs

- **About 25 clips in total.** The free plan has 1 GB of storage, which is roughly 25 one-minute clips at 1080p. The PRD's success test (10 clips across 3 songs at one event) fits, but a second busy event wouldn't. Past that it's the paid plan, or moving video somewhere else (decision 0001, "what would change my mind").
- **Quality and length are lost.** Clips are capped at 60 seconds and re-encoded down from 4K to 1080p. Someone filming a whole 4-minute song can only keep one minute of it.
- **Compression happens on the phone.** It's slow on longer clips and depends on what the phone's browser supports.
- **Share links only work where the app is running.** It runs locally, so a share link can be demonstrated but can't be sent to someone else over the internet. FR8's shared clip is built and testable, but real sharing needs hosting, which is not this semester.
- **Free projects pause.** Supabase pauses a free project after about a week of inactivity, so it needs a check-in before the demo recording.
- **Sign-in is new to me.** I haven't shipped Supabase Auth or row-level security before. A wrong policy fails silently: rows just don't come back. So every policy gets checked with two accounts in Week 12, against the API, not the screen.
- **Supabase is a single vendor.** The database, sign-in and storage are all theirs. The schema is plain Postgres and would move easily; the access rules and storage paths would not.

## 10. Where the capstone differs from POSTSET

| | POSTSET (personal app) | Capstone |
|---|---|---|
| Stack | Vercel functions, Neon, Clerk, Cloudflare R2 | Supabase only |
| Access checks | Written by hand in every server endpoint | Database access rules, with no server code |
| Clip → song link | Matched by cleaned-up title, so a rename rewrites every clip | `song_id` foreign key, so a rename touches one row |
| Duplicate-title rule | Server code | Inside the database (`add_song`, unique index) |
| Front end | One large `app.html` | One file per screen, matching the prototype |
| Video | Up to 500 MB, re-encoded above 60 MB | Up to 50 MB and 60 seconds, re-encoded above 50 MB |
| Runs | Hosted at postset.app | Locally, from the README |

**Deliberately not built**, though POSTSET has them (PRD §5): likes, comments, friends, notifications, the Trending feed, albums, DJ pages, bookmarks, Save to Photos, the report queue, and automatic song matching from filming times. That last one stays out because CLAUDE.md keeps tagging manual for now.

## 11. PRD changes this exposes

- **FR2, song tagging:** change "free text" to "pick from the show's setlist, or type a new song, which is added to the setlist."
- **Shows list and creating a show:** needed to reach any event and to upload anything, but no story asks for them. Add them.
- **Upload:** in the MVP, but it has no Must story with acceptance criteria. Add one.
- **Clip length:** add a requirement. A clip up to 60 seconds uploads; a longer one is refused with a clear message.
- **FR8, shared clip:** works locally only this semester, because there's no hosting.

---

*Like the PRD, this is a living document. When reality changes a decision, this file gets updated and a new decision record says why.*
