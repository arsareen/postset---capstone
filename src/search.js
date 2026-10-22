// Search screen: filters the sample shows and songs as you type.
// TODO(W10): real data — query Supabase instead of POSTSET_SAMPLE.

(function () {
  var data = window.POSTSET_SAMPLE;
  var input = document.getElementById('q');
  var clear = document.getElementById('clear');
  var results = document.getElementById('results');

  // Same idea as the song-title key in docs/decisions/0002: case, apostrophes
  // and punctuation don't count, so "afterglow" finds "Afterglow Season".
  function key(s) {
    return String(s).normalize('NFKC').toLowerCase()
      .replace(/['’]/g, '')
      .replace(/[^a-z0-9\s]+/g, ' ')
      .replace(/\s+/g, ' ').trim();
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  // Wraps the first case-insensitive match of the typed text in <mark>.
  function highlight(text, q) {
    var i = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
    if (i < 0) return esc(text);
    return esc(text.slice(0, i)) + '<mark>' + esc(text.slice(i, i + q.length)) + '</mark>' + esc(text.slice(i + q.length));
  }

  function showRow(show, q) {
    var side = show.live
      ? '<span class="tag pink">On now</span>'
      : '<span class="mono lit">' + show.clips + ' clips</span>';
    return '<li><a class="result-row" href="' + show.href + '">' +
      '<span class="ft" style="background-image:url(' + show.img + ')"></span>' +
      '<span><b>' + highlight(show.artist, q) + '</b><span class="mono">' + highlight(show.venue, q) + ' · ' + esc(show.date) + '</span></span>' +
      '<span class="side">' + side + '</span></a></li>';
  }

  function songRow(song, show, q) {
    var side = song.clips === 0
      ? '<span class="mono">No clips yet</span>'
      : '<span class="mono lit">' + song.clips + (song.clips === 1 ? ' angle' : ' angles') + '</span>';
    return '<li><a class="result-row" href="' + data.songHref(song) + '">' +
      '<span class="ft" style="background-image:url(' + show.img + ')"></span>' +
      '<span><b>' + highlight(song.title, q) + '</b><span class="mono">' + esc(show.artist) + ' · ' + esc(show.venue) + '</span></span>' +
      '<span class="side">' + side + '</span></a></li>';
  }

  function section(label, count, rows) {
    return '<div class="section-label" style="padding-top:18px"><span class="mono">' + label + '</span><span class="mono">' + count + '</span></div>' +
      '<ul class="results">' + rows.join('') + '</ul>';
  }

  function render() {
    var raw = input.value.trim();
    var q = key(raw);
    clear.hidden = raw === '';

    // Nothing typed: show every show, newest first, as a starting point.
    if (!q) {
      results.innerHTML = section('All shows', data.shows.length, data.shows.map(function (s) { return showRow(s, ''); }));
      return;
    }

    var shows = data.shows.filter(function (s) {
      return key(s.artist).indexOf(q) >= 0 || key(s.venue).indexOf(q) >= 0;
    });
    var songs = [];
    data.shows.forEach(function (show) {
      show.songs.forEach(function (song) {
        if (key(song.title).indexOf(q) >= 0) songs.push(songRow(song, show, raw));
      });
    });

    if (!shows.length && !songs.length) {
      results.innerHTML = '<div class="no-results"><b>Nothing matches “' + esc(raw) + '”</b>' +
        '<p>Try an artist, a venue, or part of a song title.</p></div>';
      return;
    }

    var html = '';
    if (shows.length) html += section('Shows', shows.length, shows.map(function (s) { return showRow(s, raw); }));
    if (songs.length) html += section('Songs', songs.length, songs);
    results.innerHTML = html;
  }

  input.addEventListener('input', render);
  clear.addEventListener('click', function () { input.value = ''; render(); input.focus(); });
  render();
})();
