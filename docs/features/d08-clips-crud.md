# D08 · Clips: create, read, update, delete

## What each verb means for the user
Written before anything was built:

- **Create:** add a clip with event, song tag and video filename; read it back and confirm all three fields saved, including a clip tagged "ID".
- **Read:** with several clips across two songs, opening a song returns every clip for that song and nothing from the other.
- **Update:** change one clip's tag from "ID" to a real song; confirm it now shows under the new song and no longer under "ID".
- **Delete:** remove a clip; confirm it's gone from its song's list and the others are untouched.

**Where the data lives:** in the browser (localStorage, key `postset.clips`). Only the video's filename is saved, not the video itself. Why: _[yours to write]_

## Checks → results

| Verb | Check (run by `tests/checks/d08-clips.mjs`) | Result |
|---|---|---|
| Create | Add Mira Vale / "ID" / `IMG_0001.MOV` and Mira Vale / "Ferris" / `IMG_0002.MOV` through the form, reload, then confirm the "ID" clip's three fields on screen and in storage | ✅ pass |
| Read | Add a second Ferris clip and a Glasshouse clip; open Ferris and Glasshouse | ✅ pass |
| Update | Open "ID", press Edit on `IMG_0001.MOV`, change the song to "Paper Moons", save; open both songs | ✅ pass |
| Delete | On Ferris, press Delete on `IMG_0002.MOV`, then Yes; open Ferris and compare every other clip before and after | ✅ pass |

## Plan (as approved)
Approved in plan mode on Oct 26 with no changes:
- `src/clips-store.js`: the only code that touches storage (`create`, `get`, `listBySong`, `songsForEvent`, `update`, `remove`), so Workshop 4 can swap it for Supabase without changing the screens.
- `src/song-key.js`: the decision 0002 song-matching rule, moved out of `search.js` so search and clips share one copy. "id", "Id" and "I.D." are saved as "ID".
- `src/clips.html` + `src/clips.js`: four subscreens (songs, one song, add, edit). Delete asks first, right in the row.
- `tests/checks/d08-clips.mjs`: drives headless Chrome through the real screens; no new dependencies.

## Evidence
Run on Oct 26 with `python3 -m http.server 8000 --directory src` going:

```
$ node tests/checks/d08-clips.mjs

PASS  Create — event, song tag and filename all saved, including a clip tagged "ID"
      added through the form: Mira Vale / "ID" / IMG_0001.MOV and Mira Vale / "Ferris" / IMG_0002.MOV, then reloaded
      "ID" song screen shows: title "ID", show "Mira Vale", files ["IMG_0001.MOV"]
      saved record: {"eventSlug":"mira-vale","songTitle":"ID","filename":"IMG_0001.MOV"}

PASS  Read — a song shows every one of its clips and nothing from the other song
      clips saved: Ferris ×2 (IMG_0002, IMG_0003), Glasshouse ×1 (IMG_0004), ID ×1 (IMG_0001)
      opened Ferris: ["IMG_0002.MOV","IMG_0003.MOV"]
      opened Glasshouse: ["IMG_0004.MOV"]

PASS  Update — retag "ID" → a real song; the clip moves to it and leaves "ID"
      opened "ID", pressed Edit on IMG_0001.MOV, changed the song to "Paper Moons", saved
      opened Paper Moons: ["IMG_0001.MOV"]
      opened ID: []

PASS  Delete — the clip is gone from its song and every other clip is untouched
      pressed Delete on IMG_0002.MOV; the row asked: "Delete IMG_0002.MOV? Yes, delete Cancel"; pressed Yes; status: "Deleted IMG_0002.MOV."
      opened Ferris: ["IMG_0003.MOV"]
      clips saved before: 4, after: 3; the other 3 identical to before: true

4 of 4 checks passed · page errors: none
```

The first run also passed all four checks, but the script itself crashed at the end: it deleted its temporary Chrome folder while Chrome was still closing. It now waits for Chrome to exit first.

## Trying to break it
Two things per verb a real user might do that weren't planned for. _[You choose these; then we run them and fill in the table.]_

| Verb | What I tried | What happened | Did I have to correct the agent? |
|---|---|---|---|
| Read | Added a clip, then tried to watch it | Nothing plays, and there's no play button. Only the file's name is saved this week, not the video, so a real user would expect to watch and can't. | No |
| Update | Edited a clip and changed its show (venue), not just its song | The clip moved: at the new show it's listed as "Ferris" under "Not on the setlist", and the old show's Ferris count dropped to 0. The app never asked whether that song was actually played there. | No |
| Delete | Deleted a clip | Two taps (Delete, then "Yes, delete"). There's no undo once it's gone. | No |
| Create | _[one more off-plan try]_ | | |
| Create | _[one more off-plan try]_ | | |
| Read | _[one more off-plan try]_ | | |
| Update | _[one more off-plan try]_ | | |
| Delete | _[one more off-plan try]_ | | |

## What I corrected
_[Yours to make true. A draft from the session:]_
- Mid-build, I stopped the agent and asked whether it had actually reviewed the D08 requirements, then had it line up everything due before Tuesday before continuing.
- The plan was approved with no changes.

## Left for later
- `TODO(W10)`: clips move from the browser into Supabase (Workshop 4, Oct 29); `src/clips-store.js` is the only file that should need to change.
- Clips have no owner yet, so anyone using this browser can edit or delete any clip. Login arrives in Week 12. _[Note every moment you wanted login: D10 asks for the list.]_
- The video itself isn't stored or played; only its filename is.
