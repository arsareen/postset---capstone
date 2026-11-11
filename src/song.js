// Song: the core screen. A full-screen player on one angle, every other
// angle in the strip underneath (Stories 1 and 6). One angle plays on its
// own with an invite to add yours; no angles shows a clear empty state.

(function () {
  var store = window.ClipsStore;
  var esc = PS.esc;
  var params = new URLSearchParams(location.search);
  var slug = params.get('show');
  var songKey = params.get('song') || '';
  var main = document.getElementById('main');

  var show, song, clips = [], setlist = [], urls = {};
  var playing = null;   // the clip on screen
  var muted = true;     // browsers only autoplay silent video; tap Sound to hear it
  var confirming = false;

  var SOUND_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5"/></svg>';
  var SOUND_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M16 9a4.5 4.5 0 010 6M18.5 6.5a8 8 0 010 11"/></svg>';
  var PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M7 4.5v15l13-7.5z"/></svg>';

  function eventLink() { return PS.link('event.html', { show: slug }); }
  function addLink() { return PS.link('add.html', { show: slug, song: songKey }); }

  // ---------- no clips yet (Story 1, AC2) ----------
  function drawEmpty() {
    var i = -1;
    setlist.forEach(function (s, n) { if (song && s.id === song.id) i = n; });
    var before = i > 0 ? setlist[i - 1] : null;
    var after = i >= 0 && i < setlist.length - 1 ? setlist[i + 1] : null;
    var mostFilmed = setlist.slice().sort(function (a, b) { return b.count - a.count; })[0];
    function neighbor(label, s) {
      if (!s) return '';
      return '<a class="neighbor" href="' + PS.link(s.count ? 'song.html' : 'add.html', { show: slug, song: s.key }) + '">' +
        '<span><span class="mono">' + label + '</span><b>' + esc(s.title) + '</b></span>' +
        '<span class="mono lit">' + (s.count ? PS.plural(s.count, 'angle') : 'No clips') + '</span></a>';
    }
    main.className = 'screen';
    main.innerHTML = '<div class="empty-wrap">' +
      '<div style="display:flex;align-items:center;gap:12px;margin-bottom:22px">' +
        '<a class="icon-btn glass" href="' + eventLink() + '" aria-label="Back to the setlist">' + PS.icons.back + '</a>' +
        '<span class="mono lit">' + esc(show.artist) + ' · ' + esc(show.venue) + '</span></div>' +
      (song
        ? '<span class="mono">Song ' + (i + 1) + ' of ' + setlist.length + '</span>' +
          '<h1 class="h-xl empty-title">' + esc(song.title) + '</h1>' +
          '<div class="empty-box"><div class="ring">0</div><b class="h-sm">No clips of ' + esc(song.title) + ' yet</b>' +
          '<p>Nobody has uploaded this song. If you filmed it, yours will be the first angle here.</p>' +
          '<a class="btn sm" href="' + addLink() + '">Add the first angle</a></div>' +
          '<div class="neighbors">' + neighbor('Before this', before) + neighbor('After this', after) +
          (mostFilmed && mostFilmed.count && mostFilmed !== before && mostFilmed !== after ? neighbor('Most filmed tonight', mostFilmed) : '') + '</div>'
        : '<h1 class="h-lg empty-title">Song not found</h1>' +
          '<div class="empty-box"><b class="h-sm">That song isn’t on this setlist</b><p>It may have been retagged.</p>' +
          '<a class="btn sm" href="' + eventLink() + '">Back to the setlist</a></div>') +
      '<div style="height:120px"></div></div>';
  }

  // ---------- the player ----------
  function drawPlayer() {
    main.className = 'screen flush';
    main.innerHTML =
      '<div class="imm"><div class="ambient" id="ambient"></div>' +
        '<video id="video" playsinline loop muted autoplay preload="auto"></video>' +
        '<button class="imm-tap" id="tap" aria-label="Pause or play"></button></div>' +
      '<div class="paused-mark glass" id="paused" hidden>' + PLAY + '</div>' +
      '<div class="imm-top">' +
        '<a class="icon-btn glass" href="' + eventLink() + '" aria-label="Back to the setlist">' + PS.icons.back + '</a>' +
        '<div><span class="mono lit">' + esc(show.artist) + ' · ' + esc(show.venue) + '</span>' +
        '<h1 class="h-md">' + esc(song.title) + '</h1></div></div>' +
      '<div class="angle-badge glass" id="badge"></div>' +
      '<div class="mine-actions" id="mine" hidden></div>' +
      '<div class="confirm-bar glass" id="confirm" hidden></div>' +
      '<div class="rail"><button type="button" id="sound" aria-pressed="false"></button></div>' +
      '<div class="imm-bottom"><div class="progress"><i id="prog"></i></div><div id="angles"></div></div>';

    var video = document.getElementById('video');
    video.addEventListener('timeupdate', function () {
      if (video.duration) document.getElementById('prog').style.width = (100 * video.currentTime / video.duration) + '%';
    });
    video.addEventListener('play', function () { document.getElementById('paused').hidden = true; });
    video.addEventListener('pause', function () { document.getElementById('paused').hidden = false; });
    video.addEventListener('error', function () {
      document.getElementById('badge').querySelector('.mono').textContent = 'This video can’t play in this browser';
    });
    document.getElementById('tap').addEventListener('click', function () {
      if (video.paused) video.play(); else video.pause();
    });
    document.getElementById('sound').addEventListener('click', function () {
      muted = !muted;
      video.muted = muted;
      if (!muted && video.paused) video.play();
      drawSound();
    });
    document.getElementById('angles').addEventListener('click', function (e) {
      var a = e.target.closest('[data-angle]');
      if (!a) return;
      e.preventDefault();
      play(a.getAttribute('data-angle'));
    });
    drawSound();
  }

  function drawSound() {
    var b = document.getElementById('sound');
    b.innerHTML = (muted ? SOUND_OFF : SOUND_ON) + (muted ? 'Sound' : 'On');
    b.setAttribute('aria-pressed', String(!muted));
    b.setAttribute('aria-label', muted ? 'Turn sound on' : 'Turn sound off');
  }

  function drawAngles() {
    var n = clips.length;
    var out = document.getElementById('angles');
    if (n === 1) {
      // One angle (Story 6, AC2): no picker, an invite instead.
      var c = clips[0];
      out.innerHTML = '<div class="strip-head"><span class="h-sm">1 angle</span></div>' +
        '<div class="solo-card glass"><span class="ft"' + PS.bg(urls[c.thumb], show.cover) + '></span><div>' +
        (c.mine
          ? '<b>Only your angle so far</b><p>When someone else who was there adds theirs, it lands right next to this one.</p>'
          : '<b>Were you there for this one?</b><p>Add your angle and it lands right next to this one.</p>') +
        '<a class="mono pink" href="' + addLink() + '">+ Add ' + (c.mine ? 'another' : 'your') + ' angle</a></div></div>';
      return;
    }
    out.innerHTML = '<div class="strip-head"><span class="h-sm">' + n + ' angles</span></div>' +
      '<div class="strip">' + clips.map(function (c, i) {
        return '<a href="' + PS.link('song.html', { show: slug, song: songKey, angle: c.id }) + '" data-angle="' + esc(c.id) + '"' +
          (playing && c.id === playing.id ? ' aria-current="true"' : '') + '>' +
          '<div class="ft"' + PS.bg(urls[c.thumb], show.cover) + '>' + (c.duration ? '<span class="dur">' + PS.dur(c.duration) + '</span>' : '') + '</div>' +
          '<span class="mono">Angle ' + (i + 1) + '</span><span class="mono">' + (c.mine ? 'Yours' : esc(PS.clock(c.recordedAt || c.createdAt))) + '</span></a>';
      }).join('') +
      '<a href="' + addLink() + '"><div class="add">+</div><span class="mono">Add yours</span></a></div>';
  }

  function drawBadge() {
    var i = clips.indexOf(playing);
    var when = playing.recordedAt ? 'Filmed ' + PS.clock(playing.recordedAt) : 'Added ' + new Date(playing.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    document.getElementById('badge').innerHTML =
      '<b><span class="dot"></span>Angle ' + (i + 1) + ' / ' + clips.length + '</b>' +
      '<span class="mono" style="display:block">' + (playing.mine ? 'Yours · ' : '') + esc(when) + '</span>';
    var mine = document.getElementById('mine');
    mine.hidden = !playing.mine || confirming;
    mine.innerHTML = playing.mine
      ? '<a class="glass" href="' + PS.link('add.html', { edit: playing.id }) + '">Retag</a>' +
        '<button type="button" class="danger" id="del">Delete</button>'
      : '';
    var del = document.getElementById('del');
    if (del) del.addEventListener('click', askDelete);
  }

  function closeConfirm() {
    confirming = false;
    var bar = document.getElementById('confirm');
    if (bar) { bar.hidden = true; bar.innerHTML = ''; }
  }

  function askDelete() {
    var target = playing; // the angle you pressed Delete on, even if you then tap another
    confirming = true;
    drawBadge();
    var bar = document.getElementById('confirm');
    bar.hidden = false;
    bar.innerHTML = '<b>Delete this angle?</b><span class="muted">It’s removed for everyone, along with the video.</span>' +
      '<span class="row-actions"><button type="button" id="cancel-del">Cancel</button>' +
      '<button type="button" class="danger solid" id="yes-del">Yes, delete</button></span>';
    document.getElementById('cancel-del').addEventListener('click', function () { closeConfirm(); drawBadge(); });
    document.getElementById('yes-del').addEventListener('click', function () {
      var yes = this;
      yes.disabled = true; yes.textContent = 'Deleting…';
      store.remove(target.id).then(function (r) {
        if (!r.ok) {
          // Say what went wrong, and leave a way out.
          bar.querySelector('.muted').textContent = r.errors.form;
          yes.disabled = false; yes.textContent = 'Try again';
          return;
        }
        closeConfirm();
        history.replaceState(null, '', PS.link('song.html', { show: slug, song: songKey }));
        load();
      });
    });
  }

  function play(id) {
    var next = clips.filter(function (c) { return c.id === id; })[0] || clips[0];
    if (confirming && next !== playing) closeConfirm(); // switching angle cancels a pending delete
    playing = next;
    if (next.id !== params.get('angle')) {
      history.replaceState(null, '', PS.link('song.html', { show: slug, song: songKey, angle: next.id }));
    }
    var video = document.getElementById('video');
    document.getElementById('ambient').style.backgroundImage = PS.cssUrl(urls[next.thumb] || show.cover || '');
    if (urls[next.thumb]) video.poster = urls[next.thumb]; else video.removeAttribute('poster');
    drawBadge();
    drawAngles();
    store.urls([next.path]).then(function (u) {
      if (playing !== next) return;
      video.muted = muted;
      video.src = u[next.path];
      var p = video.play();
      if (p && p.catch) p.catch(function () { document.getElementById('paused').hidden = false; });
      // Clips uploaded before still frames existed get one now, from their own video.
      if (next.mine && !next.thumb) {
        PS.grabFrame(u[next.path], { crossOrigin: true }).then(function (f) {
          return store.saveThumb(next, f.blob);
        });
      }
    });
  }

  function load() {
    return Promise.all([store.song(slug, songKey), store.setlist(slug)]).then(function (rs) {
      song = rs[0].song;
      clips = rs[0].clips;
      setlist = rs[1];
      document.title = (song ? song.title + ' · ' : '') + show.artist + ' | PostSet';
      if (!clips.length) { drawEmpty(); return; }
      return store.urls(clips.map(function (c) { return c.thumb; })).then(function (u) {
        urls = u;
        drawPlayer();
        play(params.get('angle'));
      });
    }).catch(function (err) { PS.fatal(main, err); });
  }

  PS.boot(function () {
    show = store.findShow(slug);
    if (!show) {
      main.className = 'screen';
      main.innerHTML = '<div class="empty-wrap"><h1 class="h-lg empty-title">Show not found</h1>' +
        '<a class="btn sm" href="index.html">All shows</a></div>';
      return;
    }
    return load();
  });
})();
