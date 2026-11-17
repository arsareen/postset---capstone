// Story 6. See every angle (docs/02-prd.md).
// As a viewer, I want to see every angle anyone captured of a song, so I can
// pick the best view instead of settling for one shaky clip.
import { expect } from './run.mjs';

const maya = { id: 'u-maya', email: 'maya@test.dev', password: 'secret123' };
const jon = { id: 'u-jon', email: 'jon@test.dev', password: 'secret123' };
const viewer = { id: 'u-viewer', email: 'viewer@test.dev', password: 'secret123' };

const show = { id: 1, slug: 'anotr-pacha-nyc', artist: 'ANOTR', venue: 'Pacha NYC', date_local: '2026-10-10', cover: null };
const pumpUpTheJam = { id: 10, show_id: 1, title: 'Pump up the jam', normalized_title: 'pump up the jam', position: 1, created_by: null };
const otherSong = { id: 11, show_id: 1, title: 'Relax My Eyes', normalized_title: 'relax my eyes', position: 2, created_by: null };

function clip(id, user, song, recordedAt) {
  return {
    id, show_id: 1, song_id: song.id, filename: `${id}.mp4`,
    storage_path: `${user.id}/${id}.mp4`, thumb_path: `${user.id}/${id}.jpg`,
    duration_s: 2, recorded_at: recordedAt, uploaded_by: user.id, created_at: recordedAt,
  };
}

const SONG_PAGE = 'song.html?show=anotr-pacha-nyc&song=pump%20up%20the%20jam';

export default {
  // AC1: Given multiple people uploaded clips of the same song, when I open
  // that song, then I see all available angles listed together.
  'Story 6 AC1: every angle of a song from different people is listed together': async (t) => {
    await t.seed({
      users: [maya, jon, viewer],
      shows: [show],
      setlist_songs: [pumpUpTheJam, otherSong],
      clips: [
        clip('maya-1', maya, pumpUpTheJam, '2026-10-11T01:10:00Z'),
        clip('jon-1', jon, pumpUpTheJam, '2026-10-11T01:11:00Z'),
        clip('maya-2', maya, pumpUpTheJam, '2026-10-11T01:12:00Z'),
        clip('jon-other', jon, otherSong, '2026-10-11T01:20:00Z'), // a different song: must not show up
      ],
      signedInAs: viewer.id,
    });
    await t.open(SONG_PAGE);

    // All three angles, from both uploaders, in one strip.
    await t.waitForText('3 angles', '#angles');
    const angles = await t.js(() => [...document.querySelectorAll('#angles [data-angle]')].map((a) => a.dataset.angle));
    expect(angles).toEqual(['maya-1', 'jon-1', 'maya-2']); // in filming order
    expect(angles).notToContain('jon-other');

    // The first angle plays, and the badge says where you are.
    expect(await t.text('#badge')).toContain('Angle 1 / 3');
    await t.waitFor(() => document.getElementById('video').src.includes('maya-1.mp4'), { what: 'angle 1 to load' });

    // Tapping another angle switches the player to it.
    await t.click('#angles [data-angle="jon-1"]');
    await t.waitForText('Angle 2 / 3', '#badge');
    await t.waitFor(() => document.getElementById('video').src.includes('jon-1.mp4'), { what: 'angle 2 to load' });
    expect(await t.js(() => document.querySelector('[data-angle="jon-1"]').getAttribute('aria-current'))).toBe('true');
    expect(t.errors).toEqual([]);
  },

  // AC1, the other half: a different song from the same show isn't mixed in.
  // It keeps its own row on the setlist and its own page of angles.
  'Story 6 AC1: another song on the setlist keeps its own section of angles': async (t) => {
    await t.seed({
      users: [maya, jon, viewer],
      shows: [show],
      setlist_songs: [pumpUpTheJam, otherSong],
      clips: [
        clip('maya-1', maya, pumpUpTheJam, '2026-10-11T01:10:00Z'),
        clip('jon-1', jon, pumpUpTheJam, '2026-10-11T01:11:00Z'),
        clip('maya-2', maya, pumpUpTheJam, '2026-10-11T01:12:00Z'),
        clip('jon-other', jon, otherSong, '2026-10-11T01:20:00Z'),
      ],
      signedInAs: viewer.id,
    });

    // The setlist shows each song as its own row, with its own count.
    await t.open('event.html?show=anotr-pacha-nyc');
    await t.waitFor('.setlist li');
    const rows = await t.js(() => [...document.querySelectorAll('.setlist li')].map((li) => ({
      title: li.querySelector('.t').textContent.trim(),
      count: li.querySelector('.r').textContent.trim(),
    })));
    expect(rows).toEqual([{ title: 'Pump up the jam', count: '3' }, { title: 'Relax My Eyes', count: '1' }]);

    // Opening the other song shows only its own angle.
    await t.clickText('Relax My Eyes', '.setlist a');
    await t.waitForText('1 angle', '#angles');
    expect(await t.text('h1')).toBe('Relax My Eyes');
    await t.waitFor(() => document.getElementById('video').src.includes('jon-other.mp4'), { what: 'its clip to load' });
    expect(await t.js(() => document.getElementById('video').src)).notToContain('maya');
    expect(t.errors).toEqual([]);
  },

  // AC2: Given only one angle exists, when I open it, then the single clip
  // displays correctly without a broken "compare angles" state.
  'Story 6 AC2: a song with one angle plays it without a broken compare-angles strip': async (t) => {
    await t.seed({
      users: [maya, viewer],
      shows: [show],
      setlist_songs: [pumpUpTheJam],
      clips: [clip('maya-1', maya, pumpUpTheJam, '2026-10-11T01:10:00Z')],
      signedInAs: viewer.id,
    });
    await t.open(SONG_PAGE);

    await t.waitForText('1 angle', '#angles');
    // No picker with a single choice in it, and no "1 / 1" counting.
    expect(await t.count('#angles .strip')).toBe(0);
    expect(await t.count('#angles [data-angle]')).toBe(0);
    // Instead, an invite to add your angle.
    expect(await t.text('#angles .solo-card')).toContain('Were you there for this one?');
    expect(await t.text('#angles .solo-card')).toContain('+ Add your angle');

    // The one clip really loads and plays.
    await t.waitFor(() => document.getElementById('video').src.includes('maya-1.mp4'), { what: 'the clip to load' });
    await t.waitFor(() => document.getElementById('video').readyState >= 2, { what: 'the video to have a frame to show' });
    expect(await t.text('#badge')).notToContain('can’t play');
    expect(t.errors).toEqual([]);
  },

  // AC2, from the uploader's side: their only clip says so instead of inviting them to add "your" angle.
  'Story 6 AC2: the uploader of the only angle is told it is theirs so far': async (t) => {
    await t.seed({
      users: [maya],
      shows: [show],
      setlist_songs: [pumpUpTheJam],
      clips: [clip('maya-1', maya, pumpUpTheJam, '2026-10-11T01:10:00Z')],
      signedInAs: maya.id,
    });
    await t.open(SONG_PAGE);

    await t.waitForText('Only your angle so far', '#angles');
    expect(await t.text('#angles .solo-card')).toContain('+ Add another angle');
    expect(await t.count('#angles .strip')).toBe(0);
  },
};
