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

## MoSCoW

| Band | Stories | Reasoning |
|---|---|---|
| **Must** | 1, 6, 7 | These are the product. A user uploads a clip, it's organized by setlist (7), anyone can open a song and watch it (1), and if multiple people uploaded the same song you see all of them (6). Without any one of these, the app doesn't do its core job. |
| **Should** | 2, 3 | Both came from strong interview evidence — selective recording (2) and attendees pooling clips (3) — but the product still functions without them on day one. |
| **Could** | 5, 8 | Moment tagging (5) and finding a better angle than yours (8) are nice once the library has volume. Neither is load-bearing for a first demo. |
| **Won't** | 4 | Live coverage signals ("someone's already recording this") require real-time data and critical mass to be meaningful. Showing "0 people recording" at launch actively undermines confidence rather than building it. Revisit once there's enough user activity for the signal to be trustworthy. |

## MVP Slice

**Stories 1, 6, and 7.** A user uploads a clip, tags it to a song on a known setlist, and any other user can browse that setlist and watch every available angle of any song — including ones they never recorded. You could screen-record someone doing this start to finish without saying "imagine it saves."
