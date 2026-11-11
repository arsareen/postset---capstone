// Sample data the screens read until the real database exists.
// TODO(W10): real data — these become Supabase queries (docs/03-architecture.md §7).
// Names and counts match the prototype screens, so search results and the
// screens they open agree with each other.

window.POSTSET_SAMPLE = {
  shows: [
    {
      slug: 'sol-haze', artist: 'Sol Haze', venue: 'Brooklyn Paramount', date: 'Mon 5 Oct',
      live: true, attended: false, clips: 0, img: 'img/stussy_front.jpg', href: 'add.html#record',
      songs: [],
    },
    {
      slug: 'mira-vale', artist: 'Mira Vale', venue: 'Terminal 5 · New York', date: 'Sat 20 Sep',
      attended: true, clips: 26, img: 'img/relaxmyeyes1.jpg', href: 'event.html',
      songs: [
        { title: 'Static Bloom', clips: 2 },
        { title: 'Glasshouse', clips: 4 },
        { title: 'Run It Back Slow', clips: 2 },
        { title: 'Saltwater Radio', clips: 3 },
        { title: 'Hollow', clips: 0 },
        { title: 'Nights Like Velvet', clips: 3 },
        { title: 'Paper Moons', clips: 1 },
        { title: 'Ferris', clips: 6 },
        { title: 'Afterglow Season', clips: 5, mine: 1 },
        { title: 'Lowercase Love', clips: 1, mine: 1 },
        { title: 'Northbound', clips: 0 },
      ],
    },
    {
      slug: 'dusk-theory', artist: 'Dusk Theory', venue: 'Webster Hall · New York', date: 'Fri 3 Oct',
      attended: true, clips: 12, img: 'img/maup_backstage3.jpg', href: 'event.html#no-setlist',
      songs: [],
    },
    {
      slug: 'lune-parade', artist: 'Lune Parade', venue: 'Brooklyn Steel', date: 'Sat 30 Aug',
      attended: true, clips: 41, img: 'img/sammy_middle.jpg', href: 'event.html',
      songs: [],
    },
    {
      slug: 'okari', artist: 'Okari', venue: 'Governors Ball', date: 'Sat 7 Jun',
      attended: true, clips: 18, img: 'img/maup_backstage2.jpg', href: 'event.html',
      songs: [],
    },
  ],
};

// Which song screen to open for a song, by how many clips it has.
window.POSTSET_SAMPLE.songHref = function (song) {
  if (song.clips === 0) return 'song.html#empty';
  if (song.clips === 1) return 'song.html#one';
  return 'song.html#playing';
};
