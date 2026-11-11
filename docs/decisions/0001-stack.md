# 0001 · Supabase for everything, run locally

**Date.** 2026-10-22

**Status.** Decided

**Context.** PostSet is a video app used on phones. I need sign-in, a database, video storage, and access rules that hold even if the UI gets them wrong, plus a repo a classmate can run from its README. I have five weeks. There is no hosting this semester: the app runs locally, and the demo is recorded.

**Decision.** Supabase for the database, sign-in, video storage and row-level security (access rules the database enforces). Plain HTML/CSS/JS front end, served locally, talking to Supabase directly through `supabase-js`. No server code.

**Why not the alternative.**
- Supabase plus Cloudflare R2 for video removes the 50 MB file cap. But R2 uploads have to be signed by a server, because the keys can't go in the browser, and this app has no server. The database's access rules also wouldn't cover the R2 files.
- Firebase needs billing turned on for storage, and its document database makes "every clip of this song, in setlist order" awkward.
- My personal app's stack (Vercel, Neon, Clerk, R2) is four accounts, with access checked by hand in every endpoint.

**What I'm giving up.** File size: the free plan caps each file at 50 MB and the project at 1 GB, so clips are capped at 60 seconds and re-encoded to 1080p, and the whole app holds about 25 clips. And everything sits with one vendor.

**What would change my mind.** If 60 seconds at 1080p turns out too short or too low-quality for people to bother uploading. Or if the 1 GB fills before the demo. Then: Supabase's paid plan, or moving only the video to R2 behind a small signing function.
