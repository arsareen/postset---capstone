// The one rule for "are these two typed song names the same song"
// (docs/decisions/0002): case, apostrophes and punctuation don't count,
// so "ferris" matches "Ferris" and "afterglow" finds "Afterglow Season".
// Used by search.js and clips-store.js so there is never a second copy.

window.songKey = function (s) {
  return String(s).normalize('NFKC').toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/\s+/g, ' ').trim();
};
