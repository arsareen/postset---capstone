# PostSet — Backlog

## User Stories

---

**Story 1.** As a viewer, I want to open any song from a show I attended and watch it even if I never recorded it myself, so I don't have to hunt through scattered social posts hoping a stranger caught it.

**Acceptance criteria**
- [ ] Given a song was performed at an event and at least one clip has been uploaded for it, when I open that song's page, then I can watch a clip of it.
- [ ] Given no one has uploaded a clip of a song yet, when I open that song's page, then I see a clear "no clips yet" state rather than an error or blank screen.

**Evidence.** CP-M1 concept brief, job story — "so I can stay in the moment and still watch any track later from every angle in the crowd." Interview Q3, Interviewee B — went back on YouTube after the show to find recordings of songs they didn't capture themselves.

---

**Story 2.** As a show-goer, I want to record only the specific moments that matter most to me (an entrance, a favorite song), so I don't have to choose between filming everything and missing the show.

**Acceptance criteria**
- [ ] Given I'm at a live event, when I decide to record a moment, then capture starts within a couple of taps.
- [ ] Given I choose not to record a song, when the song ends, then the app does not prompt me to justify or log that decision.

**Evidence.** Interview Q2, Interviewee B — pulls out the phone for an artist's entrance and songs that personally mean more to them, not for every song.

---

**Story 3.** As a show-goer, I want clips of a song to land together on that song's page no matter who uploaded them, so nobody has to text clips around after the show.

**Acceptance criteria**
- [ ] Given several attendees at the same event upload clips of the same song, when any user opens that song, then they see all of those clips together.
- [ ] Given only one person recorded a song, when anyone else looks for it, then they can find and watch that clip without it being sent to them directly.

**Evidence.** Interview Q3, Interviewee A — a specific song that everyone they were with loved, one person recorded it, and they sent it to each other afterward.

---

**Story 4.** As a show-goer deciding whether to record a song, I want to know whether someone else has likely already captured it, so I can put my phone away with confidence instead of worrying I'll lose the memory.

**Acceptance criteria**
- [ ] Given a song is currently playing, when I check the app, then I can see whether anyone at the event has already captured that song.
- [ ] Given no one has recorded a song and I don't either, when the show ends, then that song is shown as having zero coverage rather than disappearing silently.

**Evidence.** Interview Q2, Interviewee A — didn't take out the phone the whole show because friends were recording and could share videos among each other.

---

**Story 5.** As an uploader, I want to tag a clip as a standalone highlight moment (not tied to a specific song), so a one-off moment like a guest cameo isn't lost or forced into the wrong song's page.

**Acceptance criteria**
- [ ] Given I upload a clip of a non-song moment, when I tag it, then I can label it as a "moment" distinct from a regular song entry.
- [ ] Given a clip doesn't fit any existing song or moment tag, when I try to tag it, then I can create a new tag rather than being forced into an inaccurate match.

**Evidence.** Interview Q1, Interviewee B — described J Cole bringing a fan onstage to sing a verse as one of the standout memories of the night, a moment that doesn't map cleanly to a single song title.

---

**Story 6.** As a viewer, I want to see every angle anyone captured of a song, so I can pick the best view instead of settling for one shaky clip.

**Acceptance criteria**
- [ ] Given multiple people uploaded clips of the same song, when I open that song, then I see all available angles listed together.
- [ ] Given only one angle exists for a song, when I open it, then the single clip displays correctly without a broken "compare angles" state.

**Evidence.** CP-M1 concept brief, pitch — "watch it from every angle in the crowd, even the songs they never recorded themselves." Own observed behaviour — regularly settling for a single bad-angle clip because no organized multi-angle option exists.

---

**Story 7.** As a viewer after a show, I want to browse clips organized by the setlist rather than scrolling through random uploads, so I can jump straight to the songs I care about instead of digging through YouTube and hashtags.

**Acceptance criteria**
- [ ] Given an event has a setlist with clips tagged to songs, when I open the event page, then clips are grouped and browsable by song in setlist order.
- [ ] Given no setlist has been added for an event yet, when I open the event page, then clips are still accessible in a default view rather than hidden behind a missing setlist.

**Evidence.** Interview Q3, Interviewee B — "if I didn't record then I would go back on YouTube to see recordings of it." The friction is that existing platforms don't organize content by song — you're searching blindly.

---

**Story 8.** As a viewer who recorded a song from a bad spot, I want to see someone else's better-positioned clip of that same song, so a poor vantage point doesn't ruin my only record of that moment.

**Acceptance criteria**
- [ ] Given I recorded a song from a poor angle, when I open that song's page, then I can see other uploaded angles alongside mine.
- [ ] Given no better angle exists yet, when I check, then my own clip is shown as the only available angle rather than implying a better one exists.

**Evidence.** CP-M1 concept brief, persona — "wanting to watch the tracks they missed, or only caught from one bad spot in the back." Own observed behaviour — repeatedly watching back a clip from a bad position and wishing for a different vantage point.

---

**Story 9.** As a viewer, I want to search for a specific song or event, so I can jump straight to what I'm looking for instead of browsing through everything, the way I currently dig blindly through YouTube and hashtags.

**Acceptance criteria**
- [ ] Given clips exist for a song, when I search that song's name, then matching songs appear in the results.
- [ ] Given I search an event name, when the results load, then I can open that event and browse its songs.
- [ ] Given nothing matches what I typed, when the results load, then I see a clear "nothing matches" message rather than a blank screen.

**Evidence.** Interview Q3, Interviewee B — "if I didn't record then I would go back on YouTube to see recordings of it," which means searching blindly by song name. In the CP-M2 PRD as a Should; added here so the backlog matches it.

---

**Story 10.** As an uploader, I want a profile with my name, handle and photo, so people watching my angle know whose clip it is, and I can see the shows I've been to in one place.

**Acceptance criteria**
- [ ] Given I haven't set up a profile, when I open Profile, then I'm prompted to create one rather than shown a blank screen.
- [ ] Given I enter a display name and a valid handle, when I save, then my profile shows them, and they're still there when I come back to the app.
- [ ] Given I leave the display name or handle empty, or type a handle with spaces or symbols, when I save, then nothing saves and I see what to fix under that field.
- [ ] Given I've been to shows, when I open my profile, then I see those shows listed and can open each one.

**Evidence.** CP-M2 PRD §4 — "uploading requires a simple login so each clip has an owner"; a profile is how that owner shows up to everyone else. Not from the interviews: this came up during the build. Worth asking in the next round whether people care who filmed an angle.

---

## MoSCoW

| Band | Stories | Reasoning |
|---|---|---|
| **Must** | 1, 6, 7 | These are the product. A user uploads a clip, it's organized by setlist (7), anyone can open a song and watch it (1), and if multiple people uploaded the same song you see all of them (6). Without any one of these, the app doesn't do its core job. |
| **Should** | 2, 3, 9, 10 | Selective recording (2) and attendees pooling clips (3) came from strong interview evidence. Search (9) and profiles (10) make the app easier to get around and show whose clip is whose. The product still does its core job without any of them on day one. |
| **Could** | 5, 8 | Moment tagging (5) and finding a better angle than yours (8) are nice once the library has volume. Neither is load-bearing for a first demo. |
| **Won't** | 4 | Live coverage signals ("someone's already recording this") require real-time data and critical mass to be meaningful. Showing "0 people recording" at launch actively undermines confidence rather than building it. Revisit once there's enough user activity for the signal to be trustworthy. |

## MVP Slice

**Stories 1, 6, and 7.** A user uploads a clip, tags it to a song on a known setlist, and any other user can browse that setlist and watch every available angle of any song — including ones they never recorded. You could screen-record someone doing this start to finish without saying "imagine it saves."

## Screen expectations (written before prototyping)

- Shows list (home). My events, each one tappable to open it. No story asks for this but I need it to get around.
- Event page. Story 7. One show's setlist in order, each song a row, tap to open that song.
- Song page. Stories 1, 3, 6, 8. Open a song and see every uploaded clip as different angles I can pick from. The core screen.
- Upload and tag. Stories 2, 5. Add a clip, tag it to a song, or tag it as a standalone moment.

Story 4 is in the Won't band so it sits out.

## Screens added during the build

- Search. Story 9. One box for shows and songs, narrowing as you type.
- Profile. Story 10. View and edit your name, handle, photo, city, bio and favorite artists; your shows underneath. Saved on the device until Week 10.
- Tab bar on every screen: Shows, Search, Record, Add, Profile.
