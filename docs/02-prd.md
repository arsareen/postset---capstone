# PostSet: Product Requirements Document

IST300 Prompts to Products · CP-M2 · Capstone repo: `arsareen/postset---capstone`

---

## 1. Problem and the job it does

At a live show you can't record every song without spending the whole night behind your phone instead of being there. So you film a couple of favorites and miss the rest, or you film everything and miss the show. Afterward the songs you didn't catch are scattered across random Instagram stories, YouTube uploads, and TikTok hashtags, and you're hoping a stranger happened to post the exact track from a decent angle.

The job: when I'm at a show and can't record every song without missing the experience, I want to pool my clips with everyone else's and tag them by song, so I can stay in the moment and still watch any track later from every angle in the crowd.

Nobody organizes clips by song, and nobody lets you line up several angles of the same track. So most people settle for their own shaky single angle, or nothing.

## 2. Who it's for

A festival and concert regular in their early twenties. At the show they're a recorder: they film a few songs that mean the most to them and want permission to put the phone away for the rest. Later the same person opens PostSet as a viewer, wanting the tracks they missed, or the ones they only caught from one bad spot in the back.

## 3. Goals and success criteria

The goal is collective coverage of a set. Because people naturally film different songs, pooling clips gives the crowd a fuller record than any one person has.

The MVP is a success when, at one real event:

- at least 10 clips are uploaded, across at least 3 different songs, and
- a viewer can open a song they personally did not film and watch at least one clip of it.

The test is that you could screen record someone doing this end to end without ever saying "imagine it saves."

## 4. In scope: the MVP being built this semester

This is what gets built in `arsareen/postset---capstone` this fall, directed by the agent, with commit history to show it. It maps to the Must band of the backlog: stories 1, 6, and 7.

A user can:

- upload a clip they filmed at an event
- tag that clip to a song by typing the song name (free text)
- browse an event by song and watch clips
- when several people uploaded the same song, see all available angles together
- open a song they never filmed themselves and watch a clip of it

Accounts: uploading requires a simple login so each clip has an owner. A single clip that has been shared or sent directly can be viewed without an account. To browse the library and watch more, an account is required.

## 5. Out of scope

The features below are deliberately not part of the capstone build. Everything except automatic song detection lives on the roadmap in section 9. This list is here so the build stays a clean core instead of a sprawling app that half works.

- **Automatic song detection (Shazam style).** Live festival audio is too noisy for reliable matching, which is why tagging is manual. Not planned.
- **Friend and social features** (following, friend lists). Roadmap.
- **Wrapped style end of year stats.** Roadmap.
- **Comments and likes.** Roadmap. Pulls in moderation, notifications, and a whole interaction layer the core doesn't need.
- **In app video trimming and editing.** Roadmap.
- **Live "someone is already recording this" coverage signal** (backlog story 4). Needs real time data and enough users for the signal to be trustworthy. Showing zero coverage at launch would undercut confidence rather than build it. Roadmap.

## 6. User stories and acceptance criteria

Priority bands: Must (in the MVP), Should (built if time allows), Could (later).

### Must

**Story 1. Watch a song I never recorded.**
As a viewer, I want to open any song from a show I attended and watch it even if I never recorded it myself, so I don't have to hunt through scattered social posts hoping a stranger caught it.

- Given a song was performed and at least one clip exists for it, when I open that song's page, then I can watch a clip of it.
- Given no one has uploaded a clip of a song yet, when I open that song's page, then I see a clear "no clips yet" state rather than an error or blank screen.

**Story 6. See every angle.**
As a viewer, I want to see every angle anyone captured of a song, so I can pick the best view instead of settling for one shaky clip.

- Given multiple people uploaded clips of the same song, when I open that song, then I see all available angles listed together.
- Given only one angle exists, when I open it, then the single clip displays correctly without a broken "compare angles" state.

**Story 7. Browse by setlist.**
As a viewer after a show, I want to browse clips organized by song rather than scrolling random uploads, so I can jump straight to the songs I care about.

- Given an event has clips tagged to songs, when I open the event page, then clips are grouped and browsable by song.
- Given no clips are tagged for an event yet, when I open the event page, then clips are still accessible in a default view rather than hidden.

### Should

**Story 2. Record only what matters.**
As a show-goer, I want to record only the specific moments that matter most to me, so I don't have to choose between filming everything and missing the show.

- Given I'm at a live event, when I decide to record a moment, then capture starts within a couple of taps.
- Given I choose not to record a song, when the song ends, then the app does not prompt me to justify or log that decision.

**Story 3. Clips land together automatically.**
As a show-goer, I want clips of a song to land together on that song's page no matter who uploaded them, so nobody has to text clips around after the show.

- Given several attendees upload clips of the same song at the same event, when any user opens that song, then they see all of those clips together.
- Given only one person recorded a song, when anyone else looks for it, then they can find and watch it without it being sent to them directly.

**Story 9. Search by song and event.**
As a viewer, I want to search for a specific song or event, so I can jump straight to what I'm looking for instead of browsing through everything, the way I currently dig blindly through YouTube and hashtags.

- Given clips exist for a song, when I search that song's name, then matching songs appear in the results.
- Given I search an event name, when the results load, then I can open that event and browse its songs.

### Could

**Story 5. Tag a standalone moment.** As an uploader, I want to tag a clip as a highlight moment not tied to a song, so a one-off like a guest cameo isn't lost or forced into the wrong song's page.

**Story 8. Find a better angle than mine.** As a viewer who recorded from a bad spot, I want to see someone else's better-positioned clip of that same song, so a poor vantage point doesn't ruin my only record of the moment.

## 7. Functional requirements

Derived from the Must stories. Written so a builder can act on them without guessing.

- The system must let a logged in user upload a video clip and associate it with an event.
- The system must let the uploader tag a clip with a song name entered as free text at upload time.
- The system must group clips that share the same song name within the same event onto a single song page.
- The system must display all clips tagged to a song together on that song's page.
- The system must show a clear empty state on a song page that has no clips yet.
- The system must let a logged in user browse an event and see its songs.
- The system must let a viewer open and play any clip on a song page, including songs the viewer did not upload.
- The system must require login for uploading and for browsing the library, and must allow a single directly shared clip to be viewed without an account.

## 8. Assumptions and risks

- **Biggest risk, cold start.** The promise (watch any song from any angle) only holds if a crowd contributes, not a handful of people. If enough attendees at the same show don't upload, coverage isn't real. This is the core risk.
- **Willingness to share.** People may keep clips to themselves rather than add them to a shared pool.
- **Free text song names.** Because song names are typed freely, slight spelling differences could split one song into two pages. Acceptable for the MVP; a cleaner song picker is a later consideration.

## 9. Roadmap (post capstone)

On the record as intended, but out of this semester's build:

- Friend and social features
- Wrapped style end of year stats
- Comments and likes
- In app video trimming and editing
- Live coverage signal (story 4)
- Standalone moment tagging (story 5) and better angle discovery (story 8)

---

*This PRD is a living spec. It will be revised as the build progresses, and those revisions are part of the capstone evidence.*
