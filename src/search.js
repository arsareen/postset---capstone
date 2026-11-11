// Search (Story 9): shows by artist or venue, songs by title, as you type.
// Matching uses the same song-key rule as tagging, so case and punctuation
// don't matter. Nothing typed: every show, newest first.

(function () {
  var store = window.ClipsStore;
  var esc = PS.esc;
  var key = window.songKey;
  var input = document.getElementById('q');
  var clear = document.getElementById('clear');
  var results = document.getElementById('results');
  var songs = [], counts = {}, thumbBySong = {}, urls = {};

  // Wraps the first case-insensitive match of the typed text in <mark>.
  function highlight(text, q) {
    var i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }

  function showById(id) { return store.shows().filter(function (s) { return s.id === id; })[0]; }

  function showRow(s, q) {
    var n = counts['show' + s.id] || 0;
    return '<li><a class="result-row" href="' + PS.link('event.html', { show: s.slug }) + '">' +
      '<span class="ft"' + PS.bg(s.cover) + '></span>' +
      '<span><b>' + highlight(s.artist, q) + '</b><span class="mono">' + highlight(s.venue, q) + ' · ' + esc(PS.showDate(s.date_local)) + '</span></span>' +
      '<span class="side"><span class="mono ' + (n ? 'lit' : '') + '">' + (n ? PS.plural(n, 'clip') : 'No clips') + '</span></span></a></li>';
  }

  function songRow(song, q) {
    var s = showById(song.show_id);
    var n = counts[song.id] || 0;
    var href = PS.link(n ? 'song.html' : 'add.html', { show: s.slug, song: song.normalized_title });
    return '<li><a class="result-row" href="' + href + '">' +
      '<span class="ft"' + PS.bg(urls[thumbBySong[song.id]], s.cover) + '></span>' +
      '<span><b>' + highlight(song.title, q) + '</b><span class="mono">' + esc(s.artist) + ' · ' + esc(s.venue) + '</span></span>' +
      '<span class="side"><span class="mono ' + (n ? 'lit' : '') + '">' + (n ? PS.plural(n, 'angle') : 'No clips yet') + '</span></span></a></li>';
  }

  function render() {
    var q = input.value.trim();
    var qk = key(q);
    clear.hidden = !q;
    var shows = store.shows();
    if (!qk) {
      results.innerHTML = '<div class="section-label"><span class="mono">All shows</span><span class="mono">' + shows.length + '</span></div>' +
        '<ul class="results">' + shows.map(function (s) { return showRow(s, ''); }).join('') + '</ul><div style="height:110px"></div>';
      return;
    }
    var showHits = shows.filter(function (s) { return key(s.artist + ' ' + s.venue).indexOf(qk) >= 0; });
    var songHits = songs.filter(function (s) { return !store.isIdTag(s.title) && s.normalized_title.indexOf(qk) >= 0; })
      .sort(function (a, b) { return (counts[b.id] || 0) - (counts[a.id] || 0); });
    if (!showHits.length && !songHits.length) {
      // Story 9, AC3: a clear message, not a blank screen.
      results.innerHTML = '<div class="no-results"><b>Nothing matches “' + esc(q) + '”</b>' +
        '<p>Try an artist, a venue, or part of a song title.</p></div>';
      return;
    }
    results.innerHTML =
      (showHits.length ? '<div class="section-label"><span class="mono">Shows</span><span class="mono">' + showHits.length + '</span></div>' +
        '<ul class="results">' + showHits.map(function (s) { return showRow(s, q); }).join('') + '</ul>' : '') +
      (songHits.length ? '<div class="section-label"><span class="mono">Songs</span><span class="mono">' + songHits.length + '</span></div>' +
        '<ul class="results">' + songHits.map(function (s) { return songRow(s, q); }).join('') + '</ul>' : '') +
      '<div style="height:110px"></div>';
  }

  input.addEventListener('input', render);
  clear.addEventListener('click', function () { input.value = ''; render(); input.focus(); });

  PS.boot(function () {
    return Promise.all([store.allSongs(), store.allClips()]).then(function (rs) {
      songs = rs[0];
      rs[1].forEach(function (c) {
        counts[c.songId] = (counts[c.songId] || 0) + 1;
        counts['show' + c.showId] = (counts['show' + c.showId] || 0) + 1;
        if (!thumbBySong[c.songId] && c.thumb) thumbBySong[c.songId] = c.thumb;
      });
      return store.urls(Object.keys(thumbBySong).map(function (k) { return thumbBySong[k]; }));
    }).then(function (u) {
      urls = u;
      var q = new URLSearchParams(location.search).get('q');
      if (q) input.value = q;
      render();
    }).catch(function (err) { PS.fatal(results, err); });
  });
})();
