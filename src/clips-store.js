// Clips: create, read, update and delete, saved in this browser.
// The screens only talk to ClipsStore, never to storage directly.
// TODO(W10): real data — swap these functions for Supabase calls
// (docs/03-architecture.md §6, §8) and keep the screens as they are.

(function () {
  var KEY = 'postset.clips';
  var MAX_TITLE = 80;
  var MAX_FILENAME = 200;
  var shows = window.POSTSET_SAMPLE.shows;
  var key = window.songKey; // song-key.js

  // localStorage can be missing or full (private browsing), so every access
  // is guarded; a failed read is an empty list, a failed write is reported.
  function read() {
    try {
      var list = JSON.parse(localStorage.getItem(KEY));
      return Array.isArray(list) ? list : [];
    } catch (e) { return []; }
  }
  function write(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; }
  }

  function findShow(slug) {
    for (var i = 0; i < shows.length; i++) if (shows[i].slug === slug) return shows[i];
    return null;
  }

  // "id", "Id" and "I.D." are all the unknown-track tag, saved as "ID".
  function isIdTag(title) { return key(title).replace(/\s/g, '') === 'id'; }
  function cleanTitle(title) {
    var t = String(title || '').trim().replace(/\s+/g, ' ');
    return isIdTag(t) ? 'ID' : t;
  }
  function cleanFilename(name) {
    // A full path from some browsers becomes just the file's name.
    return String(name || '').split(/[\\/]/).pop().trim();
  }

  function newId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  // Returns { fields, errors }; errors is empty when everything is usable.
  function check(input) {
    var fields = {
      eventSlug: String(input.eventSlug || ''),
      songTitle: cleanTitle(input.songTitle),
      filename: cleanFilename(input.filename),
    };
    var errors = {};
    if (!findShow(fields.eventSlug)) errors.event = 'Pick the show this was filmed at.';
    if (!fields.songTitle) errors.song = 'Tag a song, or type ID if nobody knows it yet.';
    else if (fields.songTitle.length > MAX_TITLE) errors.song = 'Keep the song name under ' + MAX_TITLE + ' characters.';
    if (!fields.filename) errors.filename = 'Choose the video.';
    else if (fields.filename.length > MAX_FILENAME) errors.filename = 'That file name is too long.';
    return { fields: fields, errors: errors };
  }

  function hasErrors(errors) { return Object.keys(errors).length > 0; }

  function byCreated(a, b) { return a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0; }

  window.ClipsStore = {
    isIdTag: isIdTag,
    findShow: findShow,

    create: function (input) {
      var c = check(input);
      if (hasErrors(c.errors)) return { ok: false, errors: c.errors };
      var now = new Date().toISOString();
      var clip = {
        id: newId(),
        eventSlug: c.fields.eventSlug,
        songTitle: c.fields.songTitle,
        songKey: key(c.fields.songTitle),
        filename: c.fields.filename,
        createdAt: now,
        updatedAt: now,
      };
      var list = read();
      list.push(clip);
      if (!write(list)) return { ok: false, errors: { form: 'Couldn’t save on this device.' } };
      return { ok: true, clip: clip };
    },

    get: function (id) {
      var list = read();
      for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
      return null;
    },

    all: function () { return read().sort(byCreated); },

    listBySong: function (eventSlug, songKey) {
      return read().filter(function (c) { return c.eventSlug === eventSlug && c.songKey === songKey; }).sort(byCreated);
    },

    // The show's setlist in order, then any tag typed at upload that isn't
    // on it (decision 0002: a new title joins the end of the setlist).
    songsForEvent: function (eventSlug) {
      var show = findShow(eventSlug);
      var clips = read().filter(function (c) { return c.eventSlug === eventSlug; }).sort(byCreated);
      var counts = {};
      clips.forEach(function (c) { counts[c.songKey] = (counts[c.songKey] || 0) + 1; });
      var songs = (show ? show.songs : []).map(function (s) {
        var k = key(s.title);
        return { title: s.title, key: k, count: counts[k] || 0, onSetlist: true };
      });
      var seen = {};
      songs.forEach(function (s) { seen[s.key] = true; });
      clips.forEach(function (c) {
        if (seen[c.songKey]) return;
        seen[c.songKey] = true;
        songs.push({ title: c.songTitle, key: c.songKey, count: counts[c.songKey], onSetlist: false });
      });
      return songs;
    },

    update: function (id, input) {
      var list = read();
      var i = -1;
      for (var n = 0; n < list.length; n++) if (list[n].id === id) i = n;
      if (i < 0) return { ok: false, errors: { form: 'That clip doesn’t exist any more.' } };
      var merged = {
        eventSlug: input.eventSlug !== undefined ? input.eventSlug : list[i].eventSlug,
        songTitle: input.songTitle !== undefined ? input.songTitle : list[i].songTitle,
        filename: input.filename !== undefined ? input.filename : list[i].filename,
      };
      var c = check(merged);
      if (hasErrors(c.errors)) return { ok: false, errors: c.errors };
      list[i] = Object.assign({}, list[i], c.fields, { songKey: key(c.fields.songTitle), updatedAt: new Date().toISOString() });
      if (!write(list)) return { ok: false, errors: { form: 'Couldn’t save on this device.' } };
      return { ok: true, clip: list[i] };
    },

    remove: function (id) {
      var list = read();
      var kept = list.filter(function (c) { return c.id !== id; });
      if (kept.length === list.length) return { ok: false, errors: { form: 'That clip doesn’t exist any more.' } };
      if (!write(kept)) return { ok: false, errors: { form: 'Couldn’t save on this device.' } };
      return { ok: true };
    },
  };
})();
