**Discovery:** D11 - 

**Name:** Aryaman Sareen

**Date:** 11/16/26

**AI tool used:** Claude Code

**Conversation link(s):** See Artifact

**Time spent:** 40 Minutes



### 1. What I did

In this discovery log, I looked at my multi-angle feature, where all the angles of a song group under the right song and don't leak into another one. My old D08 test didn't actually protect it, because it still read the old browser storage while my app runs on Supabase now. So I built a test harness that, with one command, node tests/run.mjs, opens the app in Chrome with a fake Supabase database, so the tests never touch my real data. Then I wrote 4 tests for Story 6. They check that every angle of a song shows together, and that another song keeps its own section so clips don't leak. To prove the tests actually work, I broke the one-clip code on purpose, and they failed. 

### 2. Artifact

The whole branch:

https://github.com/arsareen/postset---capstone/tree/tests/harness

The Story 6 tests:

https://github.com/arsareen/postset---capstone/blob/tests/harness/tests/story6-angles.test.mjs

The test runner:

https://github.com/arsareen/postset---capstone/blob/tests/harness/tests/run.mjs

The 2 commits:

Harness: https://github.com/arsareen/postset---capstone/commit/823cda6

Story 6 tests: https://github.com/arsareen/postset---capstone/commit/d7582b3



Story 6 acceptance criteria (docs/02-prd.md)

- AC1: Given multiple people uploaded clips of the same song, when I open that song, then I see all available angles listed together.

- AC2: Given only one angle exists, when I open it, then the single clip displays correctly without a broken "compare angles" state.



| Test | Criterion | Would it pass if the feature broke? |
|---|---|---|
| Every angle from different people is listed together | AC1 | No. It checks all 3 angles, their order, and switching angles. |
| Another song keeps its own section | AC1 | No. It checks each song's row and count, and that the other song's page plays only its own clip. |
| One angle plays without a broken compare strip | AC2 | No. When I broke the one-clip code in song.js, it failed. |
| My only angle says "Only your angle so far" | AC2 | No. When I broke the one-clip code, it failed too. |



What got through: the rule that drops an empty song lives in the database, so no browser test can reach it. That's the next test I'd write. I didn't get to the cleanup step before the deadline.



Where I corrected Claude: Claude's first AC1 test only checked that another song's clip didn't show up on this song's page. I said that I expected each song to keep its own section on the setlist, so it added a test for that.



### 3. Claim

A test passing doesn’t mean the feature works if it’s checking old code the app stopped using.

### 4. Question

How would I even know a test went stale if it never fails?

### 5. Reflection

This log showed me that a passing test doesn't really mean much if it's pointed at old code. I thought my multi-angle feature was covered from D08, but that test was checking a version of the app that's basically gone. If an angle landed under the wrong song, then it would still pass, but I'd never know. Next time, I want to write the test first instead of changing stuff and hoping it still works, which is similar to what I did on my last commit.
