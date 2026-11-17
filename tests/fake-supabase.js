// A stand-in for supabase-js, used only by the tests (tests/run.mjs swaps it in
// for the real library). It keeps a small in-memory database in
// sessionStorage, so it survives page changes within one test and is wiped
// between tests. It copies the rules in supabase/schema.sql that the screens
// depend on:
//   - add_song: titles matched by song_key; "id"/"I.D." saved as "ID"; new songs join the end
//   - only the uploader can change or delete a clip (updates/deletes on other rows affect nothing)
//   - a user-added song is removed when its last clip leaves it
//   - signed out, every table reads as empty
// Uploaded files aren't kept; signed URLs point at small fixture files.

(function () {
  var KEY = '__postset_fake_db';

  function songKey(s) { // same rule as public.song_key() and src/song-key.js
    return String(s == null ? '' : s).normalize('NFKC').toLowerCase()
      .replace(/['’]/g, '').replace(/[^a-z0-9\s]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function load() {
    try { var s = JSON.parse(sessionStorage.getItem(KEY)); if (s) return s; } catch (e) {}
    return { users: [], session: null, shows: [], setlist_songs: [], clips: [], storage: [], seq: 1000, log: [] };
  }
  var db = load();
  function save() { sessionStorage.setItem(KEY, JSON.stringify(db)); }
  function uid() { return db.session ? db.session.user.id : null; }
  function nextId() { db.seq += 1; return db.seq; }
  function uuid() { return 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function ok(data) { return Promise.resolve({ data: data, error: null }); }
  function err(message, code) { return Promise.resolve({ data: null, error: { message: message, code: code || 'fake' } }); }
  function clone(x) { return JSON.parse(JSON.stringify(x)); }

  function dropEmptySong(songId) {
    var song = db.setlist_songs.filter(function (s) { return s.id === songId; })[0];
    if (!song || song.created_by == null) return;
    if (db.clips.some(function (c) { return c.song_id === songId; })) return;
    db.setlist_songs = db.setlist_songs.filter(function (s) { return s.id !== songId; });
  }

  // ---------- query builder: from(table).select().eq().order()… ----------
  function Query(table) {
    this.table = table; this.filters = []; this.sort = null; this.one = 0;
    this.op = 'select'; this.payload = null; this.wantRows = false; this.embed = null;
  }
  Query.prototype.select = function (cols) {
    if (this.op === 'select') this.cols = cols; else this.wantRows = true;
    var m = /setlist_songs\(([^)]*)\)/.exec(cols || '');
    if (m) this.embed = m[1].split(',').map(function (s) { return s.trim(); });
    return this;
  };
  Query.prototype.eq = function (col, val) { this.filters.push(function (r) { return r[col] === val; }); return this; };
  Query.prototype.order = function (col, o) { this.sort = { col: col, asc: !o || o.ascending !== false }; return this; };
  Query.prototype.maybeSingle = function () { this.one = 1; return this; };
  Query.prototype.single = function () { this.one = 2; return this; };
  Query.prototype.insert = function (row) { this.op = 'insert'; this.payload = row; return this; };
  Query.prototype.update = function (row) { this.op = 'update'; this.payload = row; return this; };
  Query.prototype.delete = function () { this.op = 'delete'; return this; };

  Query.prototype.run = function () {
    var self = this, t = this.table, me = uid();
    if (!db[t]) return err('relation "public.' + t + '" does not exist', '42P01');
    if (!me) return this.op === 'select' ? ok(this.one ? null : []) : err('new row violates row-level security policy', '42501');
    db.log.push({ table: t, op: this.op });

    if (this.op === 'insert') {
      if (t !== 'clips') return err('new row violates row-level security policy for table "' + t + '"', '42501');
      var row = Object.assign({ id: uuid(), uploaded_by: me, created_at: new Date().toISOString(),
        thumb_path: null, duration_s: null, recorded_at: null }, clone(this.payload));
      if (row.uploaded_by !== me || row.storage_path.split('/')[0] !== me) return err('new row violates row-level security policy for table "clips"', '42501');
      var song = db.setlist_songs.filter(function (s) { return s.id === row.song_id; })[0];
      if (!song || song.show_id !== row.show_id) return err('insert or update on table "clips" violates foreign key constraint', '23503');
      db.clips.push(row); save();
      return this.respond([row]);
    }

    var rows = db[t].filter(function (r) { return self.filters.every(function (f) { return f(r); }); });

    if (this.op === 'update' || this.op === 'delete') {
      if (t !== 'clips') return ok([]);
      rows = rows.filter(function (r) { return r.uploaded_by === me; }); // RLS: only your own
      if (this.op === 'update') {
        rows.forEach(function (r) {
          var oldSong = r.song_id;
          Object.assign(r, clone(self.payload));
          if (r.song_id !== oldSong) dropEmptySong(oldSong);
        });
      } else {
        var gone = rows.map(function (r) { return r.id; });
        db.clips = db.clips.filter(function (r) { return gone.indexOf(r.id) < 0; });
        rows.forEach(function (r) { dropEmptySong(r.song_id); });
      }
      save();
      return this.wantRows ? this.respond(rows) : ok(null);
    }

    if (this.sort) {
      var c = this.sort.col, a = this.sort.asc ? 1 : -1;
      rows = rows.slice().sort(function (x, y) { return (x[c] < y[c] ? -1 : x[c] > y[c] ? 1 : 0) * a; });
    }
    return this.respond(rows);
  };

  Query.prototype.respond = function (rows) {
    var embed = this.embed;
    var out = rows.map(function (r) {
      var x = clone(r);
      if (embed) {
        var s = db.setlist_songs.filter(function (s) { return s.id === r.song_id; })[0];
        x.setlist_songs = s ? embed.reduce(function (o, k) { o[k] = s[k]; return o; }, {}) : null;
      }
      return x;
    });
    if (this.one === 2 && out.length !== 1) return err('JSON object requested, multiple (or no) rows returned', 'PGRST116');
    return ok(this.one ? (out[0] || null) : out);
  };
  Query.prototype.then = function (res, rej) { return this.run().then(res, rej); };

  // ---------- rpc('add_song') ----------
  function addSong(args) {
    var me = uid();
    if (!me) return err('Sign in to add a song', '42501');
    var t = String(args.p_title || '').trim().replace(/\s+/g, ' ');
    if (songKey(t).replace(/ /g, '') === 'id') t = 'ID';
    if (!songKey(t)) return err('Tag a song, or type ID if nobody knows it yet', '22023');
    var k = songKey(t);
    var found = db.setlist_songs.filter(function (s) { return s.show_id === args.p_show_id && s.normalized_title === k; })[0];
    if (found) return ok(clone(found));
    var pos = db.setlist_songs.filter(function (s) { return s.show_id === args.p_show_id; })
      .reduce(function (m, s) { return Math.max(m, s.position); }, 0) + 1;
    var song = { id: nextId(), show_id: args.p_show_id, title: t, normalized_title: k, position: pos, created_by: me };
    db.setlist_songs.push(song); save();
    return ok(clone(song));
  }

  // ---------- storage ----------
  function bucket() {
    return {
      upload: function (path, file, opts) {
        var me = uid();
        if (!me || path.split('/')[0] !== me) return err('new row violates row-level security policy', '42501');
        if (file && file.size > 50 * 1024 * 1024) return err('The object exceeded the maximum allowed size', '413');
        if (!(opts && opts.upsert) && db.storage.some(function (o) { return o.path === path; })) return err('The resource already exists', '409');
        db.storage = db.storage.filter(function (o) { return o.path !== path; });
        db.storage.push({ path: path, size: file ? file.size : 0, type: opts && opts.contentType });
        save();
        return ok({ path: path });
      },
      remove: function (paths) {
        db.storage = db.storage.filter(function (o) { return paths.indexOf(o.path) < 0; });
        save();
        return ok(paths.map(function (p) { return { name: p }; }));
      },
      createSignedUrls: function (paths) {
        if (!uid()) return err('not authenticated');
        return ok(paths.map(function (p) {
          return { path: p, error: null, signedUrl: '/__fixtures/' + (/\.jpg$/.test(p) ? 'thumb.jpg' : 'clip.mp4') + '?p=' + encodeURIComponent(p) };
        }));
      },
      createSignedUrl: function (p) {
        return this.createSignedUrls([p]).then(function (r) { return r.error ? r : { data: { signedUrl: r.data[0].signedUrl }, error: null }; });
      },
    };
  }

  // ---------- auth ----------
  var auth = {
    getSession: function () { return ok({ session: clone(db.session) }); },
    signInWithPassword: function (c) {
      var u = db.users.filter(function (u) { return u.email === c.email; })[0];
      if (!u || u.password !== c.password) return err('Invalid login credentials', 'invalid_credentials');
      db.session = { user: { id: u.id, email: u.email } }; save();
      return ok({ session: clone(db.session), user: clone(db.session.user) });
    },
    signUp: function (c) {
      if (db.users.some(function (u) { return u.email === c.email; })) return err('User already registered', 'user_already_exists');
      var u = { id: 'u' + nextId(), email: c.email, password: c.password };
      db.users.push(u); db.session = { user: { id: u.id, email: u.email } }; save();
      return ok({ session: clone(db.session), user: clone(db.session.user) });
    },
    signOut: function () { db.session = null; save(); return ok(null); },
    onAuthStateChange: function () { return { data: { subscription: { unsubscribe: function () {} } } }; },
  };

  window.supabase = {
    createClient: function () {
      return {
        auth: auth,
        from: function (t) { return new Query(t); },
        rpc: function (name, args) { return name === 'add_song' ? addSong(args) : err('function ' + name + ' does not exist'); },
        storage: { from: function () { return bucket(); } },
      };
    },
  };
  // For tests: read the fake database as it is now.
  window.__fakeDb = function () { return clone(db); };
})();
