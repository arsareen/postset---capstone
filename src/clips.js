// Clips screen: songs for a show (#songs), one song's clips (#song),
// add a clip (#add) and edit one (#edit). All data goes through ClipsStore.
// The query string says which show, song or clip; the hash picks the subscreen.

(function () {
  var store = window.ClipsStore;
  var data = window.POSTSET_SAMPLE;
  var params = new URLSearchParams(location.search);

  var withSetlist = data.shows.filter(function (s) { return s.songs.length; });
  var eventSlug = store.findShow(params.get('event')) ? params.get('event') : (withSetlist[0] || data.shows[0]).slug;
  var songKey = params.get('song') || '';

  function $(id) { return document.getElementById(id); }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function link(query, hash) {
    var q = new URLSearchParams(query).toString();
    return 'clips.html' + (q ? '?' + q : '') + '#' + hash;
  }

  function pad(n) { return n < 10 ? '0' + n : String(n); }

  function when(iso) {
    return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function songTitle(slug, key) {
    var songs = store.songsForEvent(slug);
    for (var i = 0; i < songs.length; i++) if (songs[i].key === key) return songs[i].title;
    return null;
  }

  // ---------- #songs ----------
  function renderSongs() {
    var show = store.findShow(eventSlug);
    $('show-chips').innerHTML = data.shows.map(function (s) {
      return '<a href="' + link({ event: s.slug }, 'songs') + '"' + (s.slug === eventSlug ? ' aria-current="page"' : '') + '>' + esc(s.artist) + '</a>';
    }).join('');
    $('songs-add').href = link({ event: eventSlug }, 'add');
    $('songs-show').textContent = show.artist + ' · ' + show.venue;

    var songs = store.songsForEvent(eventSlug);
    var total = songs.reduce(function (n, s) { return n + s.count; }, 0);
    $('songs-total').textContent = total + (total === 1 ? ' clip' : ' clips');

    function row(s, i) {
      return '<li><a class="row' + (s.count ? '' : ' empty') + '" href="' + link({ event: eventSlug, song: s.key }, 'song') + '">' +
        '<span class="n">' + (s.onSetlist ? pad(i + 1) : '—') + '</span>' +
        '<span class="t">' + esc(s.title) + (store.isIdTag(s.title) ? ' <span class="tag amber">Unknown track</span>' : '') + '</span>' +
        '<span class="r"><span class="mono">' + s.count + '</span></span></a></li>';
    }
    var onList = songs.filter(function (s) { return s.onSetlist; });
    var extra = songs.filter(function (s) { return !s.onSetlist; });
    $('songs-list').innerHTML = onList.map(row).join('');
    $('songs-extra').innerHTML = extra.length
      ? '<div class="divider"><span class="mono">Not on the setlist</span></div><ul class="setlist">' + extra.map(row).join('') + '</ul>'
      : '';
    if (!songs.length) {
      $('songs-list').innerHTML = '<li class="no-results" style="list-style:none"><b>No setlist yet</b><p>Add a clip and type its song; it starts the list.</p></li>';
    }
  }

  // ---------- #song ----------
  var pendingDelete = null; // id of the clip whose row is asking "Delete?"

  function renderSong(status) {
    var show = store.findShow(eventSlug);
    var title = songTitle(eventSlug, songKey);
    var clips = songKey ? store.listBySong(eventSlug, songKey) : [];

    $('song-back').href = link({ event: eventSlug }, 'songs');
    $('song-add').href = $('song-empty-add').href = link({ event: eventSlug, song: songKey }, 'add');
    $('song-show').textContent = show.artist;
    $('song-title').textContent = title || 'Song not found';
    $('song-meta').textContent = store.isIdTag(title || '')
      ? clips.length + (clips.length === 1 ? ' clip' : ' clips') + ' · unknown track, retag it when you find out'
      : clips.length + (clips.length === 1 ? ' clip' : ' clips') + ' · ' + show.venue;

    $('song-status').textContent = status || '';
    $('song-status').hidden = !status;
    $('song-empty').hidden = clips.length > 0;
    $('song-empty-title').textContent = 'No clips of ' + (title || 'this song') + ' yet';

    $('song-clips').innerHTML = clips.map(function (c) {
      if (c.id === pendingDelete) {
        return '<li><div class="clip-row confirm-row" data-id="' + esc(c.id) + '">' +
          '<span>Delete <b style="display:inline">' + esc(c.filename) + '</b>?</span>' +
          '<span class="row-actions"><button type="button" class="danger solid" data-confirm="' + esc(c.id) + '">Yes, delete</button>' +
          '<button type="button" data-cancel>Cancel</button></span></div></li>';
      }
      return '<li><div class="clip-row" data-id="' + esc(c.id) + '">' +
        '<span class="ft" style="background-image:url(' + show.img + ')"></span>' +
        '<span><b class="clip-file">' + esc(c.filename) + '</b><span class="mono">Added ' + esc(when(c.createdAt)) + '</span></span>' +
        '<span class="row-actions"><a href="' + link({ id: c.id }, 'edit') + '">Edit</a>' +
        '<button type="button" class="danger" data-delete="' + esc(c.id) + '">Delete</button></span></div></li>';
    }).join('');
  }

  $('song-clips').addEventListener('click', function (e) {
    var t = e.target.closest('button');
    if (!t) return;
    if (t.hasAttribute('data-delete')) { pendingDelete = t.getAttribute('data-delete'); renderSong(); }
    else if (t.hasAttribute('data-cancel')) { pendingDelete = null; renderSong(); }
    else if (t.hasAttribute('data-confirm')) {
      var clip = store.get(t.getAttribute('data-confirm'));
      var result = store.remove(t.getAttribute('data-confirm'));
      pendingDelete = null;
      renderSong(result.ok ? 'Deleted ' + (clip ? clip.filename : 'the clip') + '.' : result.errors.form);
    }
  });

  // ---------- #add and #edit share one form ----------
  function formHtml(p, submitLabel) {
    return '<form class="form" id="' + p + '-form" novalidate style="padding-top:22px">' +
      '<div class="form-field" data-field="event"><label for="' + p + '-event"><span class="mono">Show</span></label>' +
        '<select id="' + p + '-event">' + data.shows.map(function (s) {
          return '<option value="' + s.slug + '">' + esc(s.artist) + ' · ' + esc(s.venue) + '</option>';
        }).join('') + '</select><span class="err" hidden></span></div>' +
      '<div class="form-field" data-field="song"><label for="' + p + '-song"><span class="mono">Song</span></label>' +
        '<input id="' + p + '-song" list="' + p + '-songs" maxlength="80" placeholder="Pick from the setlist, type a song, or ID" autocomplete="off">' +
        '<datalist id="' + p + '-songs"></datalist>' +
        '<span class="hint">Don’t know it yet? Type ID and retag it later.</span><span class="err" hidden></span></div>' +
      '<div class="form-field" data-field="filename"><span class="label"><span class="mono">Video</span></span>' +
        '<div class="photo-field"><span class="btn ghost sm file-btn">Choose video<input id="' + p + '-file" type="file" accept="video/*" aria-label="Choose the video"></span>' +
        '<span class="chosen-file" id="' + p + '-chosen">No video chosen</span></div>' +
        '<span class="err" hidden></span></div>' +
      '<p class="form-error" id="' + p + '-error" hidden></p>' +
      '<div class="foot" style="padding-left:0;padding-right:0"><button class="btn" type="submit">' + submitLabel + '</button></div>' +
      '</form>';
  }

  function setupForm(p, initial, onSubmit) {
    var form = $(p + '-form');
    var filename = initial.filename || '';
    var eventSel = $(p + '-event');
    var song = $(p + '-song');

    function fillSuggestions() {
      var titles = store.songsForEvent(eventSel.value).map(function (s) { return s.title; });
      if (titles.indexOf('ID') < 0) titles.push('ID');
      $(p + '-songs').innerHTML = titles.map(function (t) { return '<option value="' + esc(t) + '">'; }).join('');
    }
    function showFile() { $(p + '-chosen').textContent = filename || 'No video chosen'; }
    function setError(field, message) {
      var wrap = form.querySelector('[data-field="' + field + '"]');
      var err = wrap.querySelector('.err');
      var hint = wrap.querySelector('.hint');
      wrap.classList.toggle('invalid', !!message);
      err.textContent = message || '';
      err.hidden = !message;
      if (hint) hint.hidden = !!message;
    }

    eventSel.value = initial.eventSlug;
    song.value = initial.songTitle || '';
    fillSuggestions();
    showFile();

    eventSel.addEventListener('change', function () { fillSuggestions(); setError('event', ''); });
    song.addEventListener('input', function () { setError('song', ''); });
    $(p + '-file').addEventListener('change', function (e) {
      var f = e.target.files && e.target.files[0];
      if (f) { filename = f.name; showFile(); setError('filename', ''); }
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      ['event', 'song', 'filename'].forEach(function (f) { setError(f, ''); });
      $(p + '-error').hidden = true;
      var result = onSubmit({ eventSlug: eventSel.value, songTitle: song.value, filename: filename });
      if (result.ok) {
        location.href = link({ event: result.clip.eventSlug, song: result.clip.songKey }, 'song');
        return;
      }
      Object.keys(result.errors).forEach(function (f) {
        if (f === 'form') { $(p + '-error').textContent = result.errors.form; $(p + '-error').hidden = false; }
        else setError(f, result.errors[f]);
      });
    });
  }

  $('add-form-slot').innerHTML = formHtml('add', 'Save clip');
  $('add-cancel').href = songKey ? link({ event: eventSlug, song: songKey }, 'song') : link({ event: eventSlug }, 'songs');
  setupForm('add', { eventSlug: eventSlug, songTitle: songKey ? songTitle(eventSlug, songKey) : '' }, store.create);

  var editing = params.get('id') ? store.get(params.get('id')) : null;
  if (editing) {
    $('edit-form-slot').innerHTML = formHtml('edit', 'Save changes');
    $('edit-cancel').href = link({ event: editing.eventSlug, song: editing.songKey }, 'song');
    setupForm('edit', editing, function (fields) { return store.update(editing.id, fields); });
  } else {
    $('edit-form-slot').innerHTML = '<div class="empty-wrap" style="padding-top:22px"><div class="empty-box"><b class="h-sm">No clip to edit</b>' +
      '<p>Open a song and tap Edit on one of its clips.</p><a class="btn sm" href="' + link({ event: eventSlug }, 'songs') + '">Go to songs</a></div></div>';
  }

  // The hash picks the subscreen (see .state in styles.css); redraw the
  // list screens whenever they're opened so they show what's saved now.
  function route() {
    if (location.hash === '#song') renderSong();
    else if (location.hash !== '#add' && location.hash !== '#edit') renderSongs();
  }
  window.addEventListener('hashchange', route);
  renderSongs();
  renderSong();
})();
