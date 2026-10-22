# postset - capstone

PostSet: a shared clip library for festival and concert crowds, sorted by song. IST300 capstone.

## Running this project

**Stack:** plain HTML, CSS and JavaScript for the screens, and Supabase for the database (later also sign-in and video storage). There's no framework and nothing to install with a package manager. Why: [docs/decisions/0001-stack.md](docs/decisions/0001-stack.md).

**What a machine needs**
- Python 3, only to serve the files locally. It's already on macOS; check with `python3 --version`.
- A web browser.
- A free Supabase project (supabase.com) with `supabase/schema.sql` run in it once.

**Start the screens**

From the repo root:

```
python3 -m http.server 8000 --directory src
```

Open http://localhost:8000. Leave that terminal open while you use the app; Ctrl+C stops it.

**Set up the database (once per Supabase project)**

1. In the Supabase dashboard, open your project → **SQL Editor** → **New query**.
2. Paste all of `supabase/schema.sql` and press **Run**.
3. **Table Editor** → `shows` should list five shows.

The screens still read sample data from `src/data/sample.js`. They switch to Supabase in Week 10.

The screens in `src/` started as the Lab 4 prototype (`docs/design/prototype/`) and are being turned into working screens one story at a time.
