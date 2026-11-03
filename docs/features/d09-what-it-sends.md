# D09 · What does your app actually send?

## Part 1 · Watch my own app

**Action:** add a clip on the Clips screen (`src/clips.html`), from my D08 flow.

### The request
```
Method:     none
URL:        none
What was sent:  nothing left the browser
Status:     none
What came back: nothing
```

**What I saw in the Network tab:** <!-- YOU: one or two sentences on what you saw when you added a clip, e.g. "only the page's own files loaded; no row appeared when I pressed Save" -->

**Where the data actually went:** PostSet still saves clips in the browser. `src/clips-store.js` writes every clip with `localStorage.setItem('postset.clips', …)` (line 22) and reads them back with `localStorage.getItem` (line 17). localStorage is storage inside the browser, so saving never makes a network request. I found the clip in DevTools under **Application → Local Storage → http://localhost:8000 → postset.clips**.

**Why my stack works this way:** <!-- YOU: in your own words. Notes: D08 picked browser storage on purpose, since it's simple and low-risk for mock data; clips-store.js is the only file that touches storage so it can be swapped for Supabase; the switch to Supabase hasn't been done yet. -->

### The same request without my app
My app sends nothing, so I sent the request my app *will* make once it reads from Supabase: load the list of shows. The values come from `.env`, and only the variable names appear here.

```
$ curl -i "$SUPABASE_URL/rest/v1/shows?select=*" -H "apikey: $SUPABASE_ANON_KEY"
HTTP/2 404
{"code":"PGRST205","details":null,"hint":null,"message":"Could not find the table 'public.shows' in the schema cache"}
```

**Same as the browser?** No. The browser showed no request at all, and this one reached Supabase and got a **404**. The `shows` table is written in `supabase/schema.sql`, but I never ran that file in my Supabase project, so the database is empty. The key and the URL are right (compare row 1 below, where a wrong key fails differently); only the table is missing.

### Break it on purpose

| What I changed | Status | What came back | Is that what a user should see? |
|---|---|---|---|
| Wrong key (`apikey: not-a-real-key`) | 401 | `"Invalid API key"`, with a hint to check the anon or service_role key | <!-- YOU --> |
| No key at all | 401 | `"No API key found in request"` | <!-- YOU --> |
| Asked for a table that doesn't exist (`/rest/v1/nonsense`) | 404 | `"Could not find the table 'public.nonsense'"` | <!-- YOU --> |
| Sent broken JSON as a new show (`POST` with `{not json`) | 400 | `"Empty or invalid json"` | <!-- YOU --> |

I also tried sending `DELETE` to the whole `shows` table as a wrong method. Claude Code's safety check blocked it before it ran, because it would have tried to wipe every row.

## Part 2 · Call someone else's service

**First choice: setlist.fm**, because a show's real setlist is what PostSet tags clips to. It proves who you are with a key in an `x-api-key` header, and my key wasn't issued in time. Without one, every call fails the same way:

| What I sent | Status | What came back |
|---|---|---|
| A fake key (`x-api-key: not-a-real-key`) | 403 | `{"message":"Forbidden"}` |
| No key at all | 403 | `{"message":"Forbidden"}` |

**Working call: MusicBrainz** (musicbrainz.org), an open database of artists, releases and songs. PostSet could use it to check song and artist names when someone tags a clip, so "ferris" and "Ferris" point to the same real track.

**How do you prove who you are?** No key. Every request has to send a `User-Agent` header naming the app and a way to contact you. I used `PostSet/0.1 (IST300 capstone)`.

**Limits:** About 1 request per second for each IP address. Going over, or not identifying yourself, gets you refused. The response headers also show a running budget: `x-ratelimit-limit: 400`, `x-ratelimit-remaining: 338`.

**What one request looks like:** `GET https://musicbrainz.org/ws/2/artist/?query=artist:<name>&fmt=json`, which returns JSON with a `count` and an `artists` list.

**Key in `.env`?** Not needed; MusicBrainz has no keys. My Supabase keys are in `.env`, and `git status` doesn't list it.

### One real call
```
$ curl -i -A "PostSet/0.1 (IST300 capstone)" "https://musicbrainz.org/ws/2/artist/?query=artist:Fred%20again..&limit=1&fmt=json"
HTTP/2 200
{"count":2845,"artists":[{"id":"bca46a0c-25c9-42ca-98c2-e64c8a5e337e","type":"Person","score":100,"name":"Fred again..","country":"GB", …}]}
```

### Breaking it
| What I changed | Status | What came back |
|---|---|---|
| Bad request: an artist ID that isn't an ID (`/artist/not-a-real-id`) | 400 | `"Invalid mbid."` with a link to the docs |
| Wrong identity: a blank `User-Agent` (MusicBrainz has no key, so this is its "wrong key") | 403 | `"Your requests are being throttled by MusicBrainz because the application you are using has not identified itself."` |

**What I noticed:** <!-- YOU: one or two sentences. e.g. both services answer errors in JSON with a message, but Supabase uses 401 for a missing key while MusicBrainz uses 403 for a missing identity. -->
