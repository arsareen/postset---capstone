# 0002 · Each show has its own setlist; uploaders pick a song or add one

**Date.** 2026-10-22

**Status.** Decided. Replaces the PRD's free-text song tags (FR2).

**Context.** Story 7 needs clips "in setlist order," but the PRD tags clips with free text, which has no order. Free text also splits one song into several pages when people type it differently. POSTSET hit this with real uploads: "Strobe," "strobe" and "Strobe - deadmau5" were all being typed for the same song.

**Decision.**
- Each show has an ordered list of songs.
- At upload, you pick a song from that show's list, or type a new title, which is added to the end of the list.
- Titles are matched on a cleaned-up key (lowercase, punctuation stripped, a trailing " - Artist" removed), so variants land on one song page. The display name stays what was first typed.
- The matching happens inside the database: an `add_song` function plus a unique index on (show, cleaned-up title). No screen can create a duplicate by skipping the check.
- Whoever created the show can reorder the list.
- Clips point to their song by id (`clips.song_id`), not by title as POSTSET does, so renaming a song touches one row instead of every clip.

**Why not the alternative.**
- Free text alone: no order, and duplicate song pages.
- An admin entering every setlist before anyone can upload: blocks uploads on one person, and nobody knows the full setlist during a show.
- Automatic matching from each clip's filming time against a timed setlist: POSTSET proved it works on test clips, but it needs a timed setlist that usually doesn't exist, and CLAUDE.md keeps tagging manual for now.

**What I'm giving up.** Setlist order is only as good as whoever creates the show. Matching on the cleaned-up title misses "deadmau5 - Strobe" (artist typed first), because without a music database there's no reliable way to tell which side of the dash is the song.

**What would change my mind.** If testing shows duplicate song pages still happening often. Or if an outside setlist source, for example setlist.fm's API, could fill a show's setlist in automatically. That is a natural candidate for D09's "call one outside service."
