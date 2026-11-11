// Shows, setlists and clips, saved in Supabase.
// The screens only talk to ClipsStore, never to the database directly.
// Tables, access rules and the add_song function: supabase/schema.sql.
// Every function returns a promise. Writes resolve to { ok: true, clip }
// or { ok: false, errors: { field: message } }.

(function () {
  var db = window.db;           // supabase-client.js
  var key = window.songKey;     // song-key.js, the same rule as public.song_key()
  var MAX_TITLE = 80;
  var MAX_FILENAME = 200;
  var MAX_BYTES = 50 * 1024 * 1024; // the storage bucket's limit
  var CLIP_COLS = 'id, show_id, song_id, filename, storage_path, thumb_path, duration_s, recorded_at, uploaded_by, created_at';

  var shows = [];   // filled by ready()
  var userId = null;

  function findShow(slug) {
    for (var i = 0; i < shows.length; i++) if (shows[i].slug === slug) return shows[i];
    return null;
  }
  function showById(id) {
    for (var i = 0; i < shows.length; i++) if (shows[i].id === id) return shows[i];
    return null;
  }

  // "id", "Id" and "I.D." are all the unknown-track tag, saved as "ID".
  function isIdTag(title) { return key(title || '').replace(/\s/g, '') === 'id'; }
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

  function checkFile(f) {
    if (!f) return 'Choose the video.';
    if (f.type && f.type.indexOf('video/') !== 0) return 'That isn’t a video file.';
    if (f.size > MAX_BYTES) return 'That video is over 50 MB. Trim it or pick a shorter clip.';
    if (!f.size) return 'That file is empty.';
    if (cleanFilename(f.name).length > MAX_FILENAME) return 'That file name is too long.';
    return '';
  }

  // Checks what the user picked before anything is sent. A file is only
  // required when adding; retagging keeps the video that's already there.
  function check(input, needFile) {
    var fields = {
      eventSlug: String(input.eventSlug || ''),
      songTitle: cleanTitle(input.songTitle),
      file: input.file || null,
    };
    var errors = {};
    if (!findShow(fields.eventSlug)) errors.event = 'Pick the show this was filmed at.';
    if (!key(fields.songTitle)) errors.song = 'Tag a song, or pick “Don’t know it yet”.';
    else if (fields.songTitle.length > MAX_TITLE) errors.song = 'Keep the song name under ' + MAX_TITLE + ' characters.';
    if (needFile) {
      var fileError = checkFile(fields.file);
      if (fileError) errors.filename = fileError;
    }
    return { fields: fields, errors: errors };
  }

  function hasErrors(errors) { return Object.keys(errors).length > 0; }

  // Database and network failures, in words the user can act on.
  function fail(err) {
    var m = (err && (err.message || err.error)) || '';
    if (/failed to fetch|network/i.test(m)) m = 'Can’t reach PostSet. Check your connection and try again.';
    else if (/jwt|not authenticated|sign in/i.test(m)) m = 'You’ve been signed out. Sign in again and retry.';
    else if (/row-level security|permission denied/i.test(m)) m = 'Only the person who uploaded this clip can change it.';
    else if (/exceeded the maximum allowed size|payload too large/i.test(m)) m = 'That video is over 50 MB.';
    else if (/mime type/i.test(m)) m = 'That isn’t a video file.';
    else m = 'Couldn’t save: ' + (m || 'something went wrong') + '.';
    return { ok: false, errors: { form: m } };
  }

  function must(r) { if (r.error) throw r.error; return r.data; }

  // Angles play in the order they were filmed (Story 6), then upload order.
  function byFilmed(a, b) {
    var x = a.recordedAt || a.createdAt, y = b.recordedAt || b.createdAt;
    return x < y ? -1 : x > y ? 1 : 0;
  }

  function toClip(row, song) {
    var show = showById(row.show_id);
    return {
      id: row.id,
      showId: row.show_id,
      songId: row.song_id,
      eventSlug: show ? show.slug : '',
      songTitle: song ? song.title : '',
      songKey: song ? song.normalized_title : '',
      filename: row.filename,
      path: row.storage_path,
      thumb: row.thumb_path,
      duration: row.duration_s,
      recordedAt: row.recorded_at,
      createdAt: row.created_at,
      mine: row.uploaded_by === userId,
      uploader: row.uploaded_by,
    };
  }

  function addSong(show, title) {
    return db.rpc('add_song', { p_show_id: show.id, p_title: title }).then(must);
  }

  var urlCache = {}; // storage path → { url, until }

  window.ClipsStore = {
    isIdTag: isIdTag,
    findShow: findShow,
    checkFile: checkFile,
    shows: function () { return shows; },
    userId: function () { return userId; },

    // Loads the signed-in user and the list of shows, newest first. Call once, first.
    ready: function (user) {
      userId = user.id;
      return db.from('shows').select('id, slug, artist, venue, date_local, cover')
        .order('date_local', { ascending: false, nullsFirst: false })
        .then(function (r) { shows = must(r); return shows; });
    },

    // Every clip, lightly: for counts and thumbnail stacks on Shows and Profile.
    allClips: function () {
      return db.from('clips').select(CLIP_COLS + ', setlist_songs(title, normalized_title)').order('created_at', { ascending: false })
        .then(function (r) { return must(r).map(function (row) { return toClip(row, row.setlist_songs); }); });
    },

    // The show's setlist in order, each song with its clips. A title typed
    // at upload that wasn't on it has already joined the end (decision 0002).
    setlist: function (eventSlug) {
      var show = findShow(eventSlug);
      if (!show) return Promise.resolve([]);
      return Promise.all([
        db.from('setlist_songs').select('id, title, normalized_title, position').eq('show_id', show.id).order('position'),
        db.from('clips').select(CLIP_COLS).eq('show_id', show.id),
      ]).then(function (rs) {
        var songs = must(rs[0]);
        var clips = must(rs[1]);
        return songs.map(function (s) {
          var mine = clips.filter(function (c) { return c.song_id === s.id; })
            .map(function (c) { return toClip(c, s); }).sort(byFilmed);
          return { id: s.id, title: s.title, key: s.normalized_title, position: s.position, clips: mine, count: mine.length };
        });
      });
    },

    // Every song on every setlist: for search.
    allSongs: function () {
      return db.from('setlist_songs').select('id, show_id, title, normalized_title, position').then(must);
    },

    // Titles and counts only: for the song picker.
    songsForEvent: function (eventSlug) {
      return this.setlist(eventSlug);
    },

    // One song and its clips in filming order. Resolves { song: null } if
    // the song isn't on this show.
    song: function (eventSlug, songKey) {
      var show = findShow(eventSlug);
      if (!show || !songKey) return Promise.resolve({ song: null, clips: [] });
      return db.from('setlist_songs').select('id, title, normalized_title, position')
        .eq('show_id', show.id).eq('normalized_title', songKey).maybeSingle()
        .then(function (r) {
          var song = must(r);
          if (!song) return { song: null, clips: [] };
          return db.from('clips').select(CLIP_COLS).eq('song_id', song.id).then(function (c) {
            return { song: song, clips: must(c).map(function (row) { return toClip(row, song); }).sort(byFilmed) };
          });
        });
    },

    get: function (id) {
      return db.from('clips').select(CLIP_COLS + ', setlist_songs(title, normalized_title)').eq('id', id).maybeSingle()
        .then(function (r) {
          if (r.error || !r.data) return null;
          return toClip(r.data, r.data.setlist_songs);
        }, function () { return null; });
    },

    // Temporary links (one hour) to files in the private bucket, for many at
    // once. Resolves { path: url }; paths that fail are left out.
    urls: function (paths) {
      var now = Date.now(), out = {}, need = [];
      paths.forEach(function (p) {
        if (!p) return;
        if (urlCache[p] && urlCache[p].until > now) out[p] = urlCache[p].url;
        else if (need.indexOf(p) < 0) need.push(p);
      });
      if (!need.length) return Promise.resolve(out);
      return db.storage.from('clips').createSignedUrls(need, 3600).then(function (r) {
        (r.data || []).forEach(function (x) {
          if (x.signedUrl) { out[x.path] = x.signedUrl; urlCache[x.path] = { url: x.signedUrl, until: now + 50 * 60 * 1000 }; }
        });
        return out;
      }, function () { return out; });
    },

    // Upload the video (and its still frame) into the uploader's own folder,
    // then save the row. If the row can't be saved, the files are removed again.
    // extra: { thumb: Blob|null, duration: seconds|null, recordedAt: ISO|null }
    create: function (input, extra) {
      extra = extra || {};
      var c = check(input, true);
      if (hasErrors(c.errors)) return Promise.resolve({ ok: false, errors: c.errors });
      var show = findShow(c.fields.eventSlug);
      var file = c.fields.file;
      var filename = cleanFilename(file.name);
      var ext = (filename.match(/\.([a-z0-9]{1,5})$/i) || [, 'mp4'])[1].toLowerCase();
      var base = userId + '/' + newId();
      var path = base + '.' + ext;
      var thumbPath = extra.thumb ? base + '.jpg' : null;
      var bucket = db.storage.from('clips');
      var song;
      var uploaded = false;

      // Files first: a song only joins the setlist (for good; nobody can
      // remove setlist songs) once its video is safely stored.
      return bucket.upload(path, file, { contentType: file.type || 'video/mp4', upsert: false }).then(must)
        .then(function () {
          uploaded = true;
          if (!thumbPath) return;
          // A missing still frame isn't worth failing the upload over.
          return bucket.upload(thumbPath, extra.thumb, { contentType: 'image/jpeg', upsert: false })
            .then(function (r) { if (r.error) thumbPath = null; });
        })
        .then(function () { return addSong(show, c.fields.songTitle); })
        .then(function (s) {
          song = s;
          return db.from('clips').insert({
            show_id: show.id, song_id: song.id, storage_path: path, thumb_path: thumbPath,
            filename: filename, uploaded_by: userId,
            duration_s: extra.duration || null, recorded_at: extra.recordedAt || null,
          }).select(CLIP_COLS).single().then(function (r) {
            if (r.error) throw r.error; // the catch below removes the files
            return { ok: true, clip: toClip(r.data, song) };
          });
        })
        .catch(function (err) {
          // Anything that failed after the video landed: take the files back out.
          if (!uploaded) return fail(err);
          return bucket.remove(thumbPath ? [path, thumbPath] : [path]).then(function () { return fail(err); }, function () { return fail(err); });
        });
    },

    // Retag: move a clip to another song (or show). The video stays the same.
    update: function (id, input) {
      var c = check(input, false);
      if (hasErrors(c.errors)) return Promise.resolve({ ok: false, errors: c.errors });
      var show = findShow(c.fields.eventSlug);
      var song;
      return addSong(show, c.fields.songTitle)
        .then(function (s) {
          song = s;
          return db.from('clips').update({ show_id: show.id, song_id: song.id }).eq('id', id).select(CLIP_COLS);
        })
        .then(function (r) {
          var rows = must(r);
          if (!rows.length) return { ok: false, errors: { form: 'That clip doesn’t exist any more, or it isn’t yours to change.' } };
          return { ok: true, clip: toClip(rows[0], song) };
        })
        .catch(fail);
    },

    // Give one of your clips a still frame it didn't get at upload.
    saveThumb: function (clip, blob) {
      if (!clip.mine || clip.thumb || !blob) return Promise.resolve(null);
      var thumbPath = clip.path.replace(/\.[^./]+$/, '') + '.jpg';
      return db.storage.from('clips').upload(thumbPath, blob, { contentType: 'image/jpeg', upsert: true })
        .then(must)
        .then(function () { return db.from('clips').update({ thumb_path: thumbPath }).eq('id', clip.id).select('id'); })
        .then(function (r) { must(r); clip.thumb = thumbPath; return thumbPath; })
        .catch(function () { return null; });
    },

    // Delete the row first (the access rules decide if you may), then its files.
    remove: function (id) {
      return db.from('clips').delete().eq('id', id).select('storage_path, thumb_path')
        .then(function (r) {
          var rows = must(r);
          if (!rows.length) return { ok: false, errors: { form: 'That clip doesn’t exist any more, or it isn’t yours to delete.' } };
          var files = [rows[0].storage_path];
          if (rows[0].thumb_path) files.push(rows[0].thumb_path);
          return db.storage.from('clips').remove(files).then(function () { return { ok: true }; });
        })
        .catch(fail);
    },
  };
})();
