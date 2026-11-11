// Add a clip: 1) pick or film the video and confirm the show, 2) tag the
// song, 3) added. ?edit=<clip id> retags an existing clip instead (show and
// song only; the video stays). ?show= and ?song= preselect.

(function () {
  var store = window.ClipsStore;
  var esc = PS.esc;
  var params = new URLSearchParams(location.search);
  var main = document.getElementById('main');
  var editId = params.get('edit');
  var filmFirst = params.get('film') === '1';

  var state = {
    step: 'clip',        // clip | song | added
    file: null,
    fileError: '',
    thumb: null,         // { blob, url, duration }
    showSlug: params.get('show') || '',
    songTitle: '',       // what will be saved
    query: '',           // what's typed in the song search
    songs: [],           // the chosen show's setlist
    busy: false,
    errors: {},
    editing: null,       // the clip being retagged
    added: null,
  };

  function cancelHref() {
    if (state.editing) return PS.link('song.html', { show: state.editing.eventSlug, song: state.editing.songKey, angle: state.editing.id });
    if (params.get('show') && params.get('song')) return PS.link('song.html', { show: params.get('show'), song: params.get('song') });
    if (params.get('show')) return PS.link('event.html', { show: params.get('show') });
    return 'index.html';
  }

  function stepsBar(current) {
    var names = ['clip', 'song', 'added'];
    var labels = ['Clip', 'Song', 'Done'];
    var at = names.indexOf(current);
    return '<ol class="steps" style="grid-template-columns:repeat(3,1fr)">' + names.map(function (n, i) {
      return '<li' + (i < at ? ' class="done"' : '') + (i === at ? ' aria-current="step"' : '') + '><i></i><span class="mono">' + labels[i] + '</span></li>';
    }).join('') + '</ol>';
  }

  function head(left, title) {
    return '<div class="flow-head">' + left + '<span class="mono lit">' + title + '</span><span style="width:52px"></span></div>';
  }

  // When the clip was filmed, as far as the file can tell us. A clip filmed
  // just now is now. One picked from the camera roll carries its date, except
  // that iPhones stamp a picked video with the moment it was picked; a date
  // that close to the pick is unknown, rather than wrong.
  function filmedAt() { return state.recordedAt ? new Date(state.recordedAt) : null; }
  function readFilmedAt(file, justFilmed) {
    if (!file.lastModified) return null;
    if (!justFilmed && Math.abs(Date.now() - file.lastModified) < 3 * 60 * 1000) return null;
    return new Date(file.lastModified).toISOString();
  }

  function setShow(slug) {
    if (slug === state.showSlug) return;
    state.showSlug = slug;
    // A song belongs to one show's setlist; don't carry it over to another.
    state.songTitle = '';
    state.query = '';
  }

  // The show you were most likely at: same night as the file's time, allowing
  // for clips filmed after midnight.
  function suggestedShow() {
    var t = filmedAt();
    if (!t) return null;
    var day = function (d) { return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); };
    var same = day(t), prev = day(new Date(t.getTime() - 12 * 3600 * 1000));
    return store.shows().filter(function (s) { return s.date_local === same || s.date_local === prev; })[0] || null;
  }

  // ---------- step 1: the clip and the show ----------
  function fileInput(id, capture) {
    return '<input id="' + id + '" type="file" accept="video/*"' + (capture ? ' capture="environment"' : '') + ' aria-label="Choose a video">';
  }

  function drawClip() {
    var cover = (store.shows()[0] || {}).cover;
    var html = head('<a href="' + cancelHref() + '">Cancel</a>', 'New clip') + stepsBar('clip');

    if (!state.file) {
      var film = '<label class="big-choice file-btn"' + PS.bg(cover) + '>' + fileInput('film-input', true) +
        '<span class="chip glass"><span class="dot live"></span>Camera</span><span class="shutter-mini"></span>' +
        '<div class="body"><span class="mono lit">Two taps from here</span><h2 class="h-lg">Film a moment</h2>' +
        '<span class="muted">Then put the phone down. Tag it whenever you want.</span></div></label>';
      var roll = '<label class="roll-choice file-btn">' + fileInput('roll-input', false) +
        '<div><span class="mono">Already filmed it?</span><h2 class="h-md" style="margin-top:6px">From your camera roll</h2>' +
        '<span class="muted">Any video up to 50 MB.</span></div><span class="add-tile" style="width:44px;height:58px;font-size:22px">+</span></label>';
      html += '<div class="add-head" style="padding-top:0"><h1 class="h-lg">Add a clip</h1></div>' +
        (filmFirst ? film + roll : roll + film);
      main.innerHTML = html;
      ['film-input', 'roll-input'].forEach(function (id) { document.getElementById(id).addEventListener('change', onPick); });
      return;
    }

    var t = filmedAt();
    var suggestion = suggestedShow();
    if (!state.showSlug && suggestion) state.showSlug = suggestion.slug;

    html += '<div class="picked">' +
      '<div class="ft"' + PS.bg(state.thumb && state.thumb.url, cover) + '>' +
        (state.thumb && state.thumb.duration ? '<span class="dur">' + PS.dur(state.thumb.duration) + '</span>' : '') + '</div>' +
      '<div><span class="mono">' + (state.justFilmed ? 'Just filmed' : 'From camera roll') + '</span>' +
      '<b style="overflow-wrap:anywhere">' + esc(state.file.name) + '</b>' +
      (t ? '<span class="mono">Filmed ' + esc(t.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })) + ', ' + esc(PS.clock(t.toISOString())) + '</span>' : '') +
      '<label class="swap file-btn">Choose a different clip' + fileInput('swap-input', false) + '</label></div></div>' +
      (state.fileError ? '<p class="err-line">' + esc(state.fileError) + '</p>' : '') +
      '<div class="field"><span class="mono">Which show was this?</span></div>' +
      '<ul class="choices" role="radiogroup" aria-label="Show">' + store.shows().map(function (s) {
        var on = s.slug === state.showSlug;
        return '<li><button type="button" class="choice" role="radio" aria-checked="' + on + '" data-show="' + esc(s.slug) + '">' +
          '<span><b>' + esc(s.artist) + '</b><span class="mono">' + esc(s.venue) + ' · ' + esc(PS.showDate(s.date_local)) +
          (suggestion && s.slug === suggestion.slug ? '</span><span class="mono pink" style="display:block;margin-top:3px">Matches when you filmed it' : '') +
          '</span></span><span class="radio"></span></button></li>';
      }).join('') + '</ul>' +
      (state.errors.event ? '<p class="err-line" style="padding-top:8px">' + esc(state.errors.event) + '</p>' : '') +
      '<div class="foot"><button type="button" class="btn" id="next"' + (state.fileError ? ' disabled' : '') + '>Next: tag it</button></div>';
    main.innerHTML = html;

    document.getElementById('swap-input').addEventListener('change', onPick);
    main.querySelectorAll('[data-show]').forEach(function (b) {
      b.addEventListener('click', function () { setShow(b.getAttribute('data-show')); state.errors = {}; drawClip(); });
    });
    document.getElementById('next').addEventListener('click', function () {
      if (state.fileError) return;
      if (!store.findShow(state.showSlug)) { state.errors = { event: 'Pick the show this was filmed at.' }; drawClip(); return; }
      goSong();
    });
  }

  function onPick(e) {
    var f = e.target.files && e.target.files[0];
    if (!f) return;
    state.file = f;
    state.justFilmed = e.target.id === 'film-input';
    state.recordedAt = readFilmedAt(f, state.justFilmed);
    state.fileError = store.checkFile(f);
    state.thumb = null;
    drawClip();
    if (state.fileError) return;
    PS.grabFrame(f).then(function (frame) {
      if (state.file !== f) return;
      state.thumb = { blob: frame.blob, url: frame.blob ? URL.createObjectURL(frame.blob) : null, duration: frame.duration };
      if (state.step === 'clip') drawClip();
    });
  }

  // ---------- step 2: the song ----------
  function goSong() {
    state.step = 'song';
    state.errors = {};
    drawSongLoading();
    return store.setlist(state.showSlug).then(function (songs) {
      state.songs = songs;
      var pre = params.get('song');
      if (!state.songTitle && pre && !state.editing) {
        var match = songs.filter(function (s) { return s.key === pre; })[0];
        if (match) state.songTitle = match.title;
      }
      drawSong();
    }).catch(function (err) { PS.fatal(main, err); });
  }

  function drawSongLoading() {
    main.innerHTML = head('<span></span>', state.editing ? 'Retag clip' : 'New clip') + '<p class="loading mono">Loading the setlist…</p>';
  }

  // The Tag it screen. The search box is drawn once; typing only redraws the
  // list under it (drawSongList), so the phone keyboard stays put.
  function drawSong() {
    var show = store.findShow(state.showSlug);
    var thumbUrl = state.editing ? state.editingThumb : state.thumb && state.thumb.url;

    var html = head(state.editing ? '<a href="' + cancelHref() + '">Cancel</a>' : '<a href="#" id="back">‹ Back</a>',
      state.editing ? 'Retag clip' : 'New clip') +
      (state.editing ? '' : stepsBar('song')) +
      '<div style="padding:' + (state.editing ? '22px' : '0') + ' 20px 0">' +
      '<h1 class="h-lg" style="margin-bottom:16px">Tag it</h1>' +
      '<div class="clip-ref"><span class="ft"' + PS.bg(thumbUrl, show.cover) + '></span><div>' +
        '<b style="overflow-wrap:anywhere">' + esc(state.editing ? state.editing.filename : state.file.name) + '</b>' +
        '<span class="mono">' + esc(show.artist) + ' · ' + esc(show.venue) + '</span></div></div>';

    if (state.editing) {
      html += '<div class="form-field" style="margin-bottom:14px"><label for="show-select"><span class="mono">Show</span></label>' +
        '<select id="show-select">' + store.shows().map(function (s) {
          return '<option value="' + esc(s.slug) + '"' + (s.slug === state.showSlug ? ' selected' : '') + '>' + esc(s.artist) + ' · ' + esc(s.venue) + '</option>';
        }).join('') + '</select></div>';
    }

    html += '<label class="search">' + PS.icons.search.replace('<svg', '<svg aria-hidden="true"') +
      '<input id="song-q" type="search" placeholder="Find a song from the set, or type one" autocomplete="off" value="' + esc(state.query) + '" aria-label="Song">' +
      '</label></div>' +
      '<div id="song-list"></div>' +
      '<div id="song-foot"></div>';

    main.innerHTML = html;

    var back = document.getElementById('back');
    if (back) back.addEventListener('click', function (e) { e.preventDefault(); if (state.busy) return; state.step = 'clip'; drawClip(); });
    var sel = document.getElementById('show-select');
    if (sel) sel.addEventListener('change', function () { setShow(sel.value); goSong(); });
    var input = document.getElementById('song-q');
    input.addEventListener('input', function () { state.query = input.value; drawSongList(); });

    // One listener for everything in the list, so redrawing it needs no rewiring.
    document.getElementById('song-list').addEventListener('click', function (e) {
      var pick = e.target.closest('[data-title]');
      if (pick) { state.songTitle = pick.getAttribute('data-title'); }
      else if (e.target.closest('#use-new')) { state.songTitle = state.query.trim(); }
      else return;
      state.errors = {};
      drawSongList();
      drawSongFoot();
    });
    drawSongList();
    drawSongFoot();
  }

  function drawSongList() {
    var show = store.findShow(state.showSlug);
    var q = state.query;
    var qk = window.songKey(q);
    var list = state.songs.filter(function (s) { return !store.isIdTag(s.title) && (!qk || s.key.indexOf(qk) >= 0); });
    var exact = state.songs.some(function (s) { return s.key === qk; });
    var selKey = window.songKey(state.songTitle);
    // A picked title that isn't on this setlist yet (typed, then "Use it").
    var pickedNew = selKey && selKey !== 'id' && !state.songs.some(function (s) { return s.key === selKey; });

    var html = '<ul class="choices" role="radiogroup" aria-label="Song">' + list.map(function (s) {
      var on = s.key === selKey;
      return '<li><button type="button" class="choice pinksel" role="radio" aria-checked="' + on + '" data-title="' + esc(s.title) + '">' +
        '<span><b><span class="n">' + ('0' + s.position).slice(-2) + '</span>' + esc(s.title) + '</b>' +
        '<span class="mono">' + (s.count ? PS.plural(s.count, 'angle') + ' so far' : 'No angles yet') + '</span></span>' +
        '<span class="radio"></span></button></li>';
    }).join('') +
      (pickedNew && window.songKey(q) !== selKey
        ? '<li><button type="button" class="choice pinksel" role="radio" aria-checked="true" data-title="' + esc(state.songTitle) + '">' +
          '<span><b>' + esc(state.songTitle) + '</b><span class="mono">New · joins the end of the setlist</span></span><span class="radio"></span></button></li>'
        : '') +
      '<li><button type="button" class="choice pinksel" role="radio" aria-checked="' + (selKey === 'id') + '" data-title="ID">' +
        '<span><b>Don’t know it yet</b><span class="mono">Tag it ID and retag it when you find out</span></span><span class="radio"></span></button></li>' +
      '</ul>';

    if (qk && !exact) {
      html += '<div class="new-tag"><b>Not on the setlist?</b><p>Add it to the end of ' + esc(show.artist) + '’s setlist. Everyone who filmed it will find it there.</p>' +
        '<div class="input"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(q.trim()) + '</span>' +
        '<button type="button" class="btn sm" id="use-new">' + (selKey === qk ? 'Picked' : 'Use it') + '</button></div></div>';
    }
    if (!list.length && !qk && !state.songs.length) {
      html += '<p class="muted" style="padding:14px 20px 0">No setlist yet. Type the song and you’ll start it.</p>';
    }
    document.getElementById('song-list').innerHTML = html;
  }

  function drawSongFoot() {
    document.getElementById('song-foot').innerHTML =
      (state.errors.song ? '<p class="err-line" style="padding-top:12px">' + esc(state.errors.song) + '</p>' : '') +
      (state.errors.form ? '<p class="form-error">' + esc(state.errors.form) + '</p>' : '') +
      '<div class="foot">' + (state.busy ? '<div class="upload-bar" style="margin:0 0 12px"><i></i></div>' : '') +
      '<button type="button" class="btn" id="save"' + (state.busy ? ' disabled' : '') + '>' +
      (state.busy ? (state.editing ? 'Saving…' : 'Uploading…') : (state.editing ? 'Save changes' : 'Upload clip')) +
      '</button></div>';
    document.getElementById('save').addEventListener('click', save);
  }

  function save() {
    if (state.busy) return;
    if (!state.songTitle) { state.errors = { song: 'Pick the song, or “Don’t know it yet”.' }; drawSongFoot(); return; }
    state.busy = true;
    state.errors = {};
    drawSongFoot();
    var input = { eventSlug: state.showSlug, songTitle: state.songTitle, file: state.file };
    var call = state.editing
      ? store.update(state.editing.id, input)
      : store.create(input, {
          thumb: state.thumb && state.thumb.blob,
          duration: state.thumb && state.thumb.duration,
          recordedAt: state.recordedAt,
        });
    call.then(function (r) {
      state.busy = false;
      if (!r.ok) {
        state.errors = r.errors;
        if (r.errors.filename) { state.step = 'clip'; state.fileError = r.errors.filename; drawClip(); return; }
        if (r.errors.event && !state.editing) { state.step = 'clip'; drawClip(); return; }
        drawSongFoot();
        return;
      }
      if (state.editing) {
        location.replace(PS.link('song.html', { show: r.clip.eventSlug, song: r.clip.songKey, angle: r.clip.id }));
        return;
      }
      state.added = r.clip;
      drawAdded();
    });
  }

  // ---------- step 3: added ----------
  function drawAdded() {
    state.step = 'added';
    var c = state.added;
    var show = store.findShow(c.eventSlug);
    var watch = PS.link('song.html', { show: c.eventSlug, song: c.songKey, angle: c.id });
    main.innerHTML = head('<span></span>', 'New clip') + stepsBar('added') +
      '<div class="added-head"><span class="mono pink">Added</span><h1 class="h-xl">It’s in.</h1>' +
      '<p id="added-line"><b>' + esc(c.songTitle === 'ID' ? 'An unknown track' : c.songTitle) + '</b> at <b>' + esc(show.artist) + '</b>, ' + esc(show.venue) + '.</p></div>' +
      '<div class="added-thumb ft"' + PS.bg(state.thumb && state.thumb.url, show.cover) + '></div>' +
      (state.justFilmed ? '<p class="muted" style="padding:22px 20px 0">Now put the phone down and enjoy the rest of the set.</p>' : '') +
      '<div class="added-actions"><a class="btn" href="' + watch + '">Watch it</a>' +
      '<a class="btn ghost" href="' + PS.link('add.html', { show: c.eventSlug }) + '">Add another clip</a></div>';
    store.song(c.eventSlug, c.songKey).then(function (r) {
      var i = r.clips.map(function (x) { return x.id; }).indexOf(c.id);
      if (i < 0 || !document.getElementById('added-line')) return;
      document.getElementById('added-line').innerHTML = 'You’re angle <b>' + (i + 1) + ' of ' + r.clips.length + '</b> of <b>' +
        esc(c.songTitle === 'ID' ? 'an unknown track' : c.songTitle) + '</b> at <b>' + esc(show.artist) + '</b>, ' + esc(show.venue) + '.';
    }, function () {});
  }

  // ---------- start ----------
  PS.boot(function () {
    if (!editId) {
      if (!store.findShow(state.showSlug)) state.showSlug = '';
      drawClip();
      return;
    }
    return store.get(editId).then(function (clip) {
      if (!clip || !clip.mine) {
        main.innerHTML = head('<a href="index.html">Close</a>', 'Retag clip') +
          '<div class="no-results" style="margin-top:22px"><b>' + (clip ? 'This clip isn’t yours' : 'No clip to retag') + '</b>' +
          '<p>' + (clip ? 'Only the person who uploaded a clip can retag it.' : 'It may have been deleted.') + '</p></div>';
        return;
      }
      state.editing = clip;
      state.showSlug = clip.eventSlug;
      state.songTitle = clip.songTitle;
      return store.urls([clip.thumb]).then(function (u) {
        state.editingThumb = u[clip.thumb] || null;
        return goSong();
      });
    });
  });
})();
