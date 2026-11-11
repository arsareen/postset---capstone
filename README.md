# postset - capstone

PostSet: a shared clip library for festival and concert crowds, sorted by song. IST300 capstone.

Sign in, upload a clip you filmed and tag it to a song, then open any song at a show and watch every angle people uploaded.

**Stack:** plain HTML, CSS and JavaScript, and Supabase for sign-in, the database and video storage. There's no framework and nothing to install with a package manager. The Supabase client library loads from a CDN, pinned to version 2.45.4. Why: [docs/decisions/0001-stack.md](docs/decisions/0001-stack.md).

## Run it

**What a machine needs**
- Python 3, to serve the files. Check with `python3 --version`.
- Node.js 18 or newer, to write the config file and run the tests. Check with `node --version`.
- Google Chrome, for the tests.
- A free Supabase project (supabase.com).

**1. Get the code**
```
git clone https://github.com/arsareen/postset---capstone.git
cd postset---capstone
```

**2. Set up the database (once per Supabase project)**
1. In the Supabase dashboard, open your project → **SQL Editor** → **New query**.
2. Paste all of `supabase/schema.sql` and press **Run**. It's safe to run again.
3. **Table Editor**: `shows` should list three shows (ANOTR twice, and Luke Dean & Max Dean). `setlist_songs` starts empty: each show's setlist grows as clips are tagged.
4. **Authentication → Sign In / Providers → Email**: turn **Confirm email** off, so a new account can sign in straight away. If you leave it on, set **Authentication → URL Configuration → Site URL** to `http://localhost:8000`, so the confirmation link comes back to the app.

**3. Add your keys**
```
cp .env.example .env
```
Open `.env` and fill in both values from **Project Settings → API**. Use the anon (publishable) key, never the service_role (secret) key. Then:
```
node scripts/write-config.mjs
```
This writes `src/config.js`, which the browser reads. `.env` and `src/config.js` are both gitignored, so check `git status` never lists them.

**4. Start the app**
```
python3 scripts/serve.py
```
Open **http://localhost:8000**. Leave that terminal open while you use the app; Ctrl+C stops it. (This is Python's built-in file server, set to stop the browser from showing old copies of pages after a change.)

**5. Try it**
1. Choose **Create an account**, then enter an email and a password of at least 6 characters.
2. Tap **+** in the tab bar. Choose **From your camera roll** and pick a video under 50 MB, pick the show, then **Next: tag it**. Pick a song (or type a new one, or **Don't know it yet**) and press **Upload clip**.
3. Press **Watch it**: your clip plays on that song's page. Sign out (Profile tab), create a second account, and upload another clip of the same song. Both angles now show on that song for either account.

**If something's wrong**
- *"PostSet can't reach its database"*: you skipped step 3 (`node scripts/write-config.mjs`).
- *A screen looks like an old version*: reload with Cmd+Shift+R (Ctrl+Shift+R on Windows).
- *"No shows yet"*: you skipped step 2, or ran it in a different Supabase project from the one in `.env`.
- *"Confirm your email first"*: turn off Confirm email (step 2.4), or open the link in the email.
- Nothing loads after a week of not using it: Supabase pauses free projects. Open the dashboard and restore the project.

## What's in here

- `src/`: the app. Every screen needs sign-in (`signin.html`).
  - `index.html` Shows · `event.html` one show's setlist · `song.html` every angle of a song · `add.html` add or retag a clip · `search.html` · `profile.html`
  - `clips-store.js`: the only code that reads or writes the database. `app.js`: helpers every screen shares.
- `supabase/schema.sql`: tables, access rules, the `add_song` function and the video bucket.
- `scripts/`: `write-config.mjs` (`.env` → `src/config.js`) and `serve.py` (local server).
- `docs/design/prototype/`: the Lab 4 clickable prototype these screens were built from, with its sample data.
- `docs/`: concept brief, PRD, architecture, backlog, decisions, and Discovery logs.
