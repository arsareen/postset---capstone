// Show: one night's setlist in order (Story 7), how much of it was filmed,
// and each song's angles. Songs nobody filmed stay on the list, empty.

(function () {
  var store = window.ClipsStore;
  var esc = PS.esc;
  var slug = new URLSearchParams(location.search).get('show');

  document.getElementById('back').innerHTML = PS.icons.back;

  PS.boot(function (user, shows) {
    var show = store.findShow(slug);
    var body = document.getElementById('body');
    if (!show) {
      document.getElementById('hero').style.height = '160px';
      document.getElementById('artist').textContent = 'Show not found';
      body.innerHTML = '<div class="no-results"><b>That show isn’t on PostSet</b><p>It may have been removed.</p>' +
        '<a class="btn sm" style="margin:14px auto 0" href="index.html">All shows</a></div>';
      return;
    }

    document.title = show.artist + ' · ' + show.venue + ' | PostSet';
    if (show.cover) document.getElementById('hero').style.backgroundImage = PS.cssUrl(show.cover);
    document.getElementById('artist').textContent = show.artist;
    document.getElementById('venue').textContent = show.venue;
    document.getElementById('date-chip').innerHTML = '<span class="dot"></span>' + esc(PS.showDate(show.date_local));

    return store.setlist(slug).then(function (songs) {
      var clips = [];
      songs.forEach(function (s) { clips = clips.concat(s.clips); });
      var fans = {};
      clips.forEach(function (c) { fans[c.uploader] = true; });
      var max = songs.reduce(function (m, s) { return Math.max(m, s.count); }, 0);
      var topCount = songs.filter(function (s) { return s.count === max; }).length;

      document.getElementById('stats').innerHTML =
        '<div><b>' + songs.length + '</b><span class="mono">' + (songs.length === 1 ? 'Song' : 'Songs') + '</span></div>' +
        '<div><b>' + clips.length + '</b><span class="mono">' + (clips.length === 1 ? 'Clip' : 'Clips') + '</span></div>' +
        '<div><b>' + Object.keys(fans).length + '</b><span class="mono">Filmed it</span></div>';

      var addHere = PS.link('add.html', { show: slug });

      // No setlist yet (Story 7, AC2): say so, and give the way in.
      if (!songs.length) {
        body.innerHTML = '<div class="banner"><div class="mono">No clips yet</div>' +
          '<p>Nobody has added a clip from this show. The first one you tag starts the setlist, and every song after it joins the end.</p></div>' +
          '<div style="padding:0 20px 120px"><a class="btn" href="' + addHere + '">Add the first clip</a></div>';
        return;
      }

      var thumbPaths = [];
      songs.forEach(function (s) { s.clips.slice(0, 3).forEach(function (c) { thumbPaths.push(c.thumb); }); });

      return store.urls(thumbPaths).then(function (urls) {
        // One bar per song; the most-filmed gets the screen's one pink highlight.
        var coverage = '<div class="coverage"><div style="display:flex;justify-content:space-between">' +
          '<span class="mono">Coverage by song</span><span class="mono">' +
          songs.filter(function (s) { return s.count; }).length + ' of ' + songs.length + ' filmed</span></div>' +
          '<div class="bars" aria-hidden="true">' + songs.map(function (s) {
            if (!s.count) return '<span class="none"></span>';
            var top = s.count === max && topCount === 1 && songs.length > 1;
            return '<span' + (top ? ' class="top"' : '') + ' style="height:' + Math.max(8, Math.round(44 * s.count / max)) + 'px"></span>';
          }).join('') + '</div>' +
          '<div class="axis"><span class="mono">1</span><span class="mono">' + songs.length + '</span></div></div>';

        var rows = songs.map(function (s, i) {
          var top = s.count && s.count === max && topCount === 1 && songs.length > 1;
          var href = s.count ? PS.link('song.html', { show: slug, song: s.key }) : PS.link('add.html', { show: slug, song: s.key });
          var right = s.count
            ? '<span class="stack">' + s.clips.slice(0, 3).map(function (c) { return '<i' + PS.bg(urls[c.thumb], show.cover) + '></i>'; }).join('') + '</span>' +
              '<span class="mono">' + s.count + '</span>'
            : '<span class="add-tile" aria-label="Add the first clip">+</span>';
          return '<li><a class="row' + (top ? ' top' : '') + (s.count ? '' : ' empty') + '" href="' + href + '">' +
            '<span class="n">' + ('0' + (i + 1)).slice(-2) + '</span>' +
            '<span class="t">' + esc(s.title) + (store.isIdTag(s.title) ? ' <span class="tag amber">Unknown track</span>' : '') + '</span>' +
            '<span class="r">' + right + '</span></a></li>';
        }).join('');

        body.innerHTML = coverage +
          '<div class="tabs"><a aria-current="page">Setlist <span>' + songs.length + '</span></a></div>' +
          '<ul class="setlist">' + rows + '</ul>' +
          '<div style="padding:0 20px 120px"><a class="btn ghost" href="' + addHere + '">+ Add a clip from this show</a></div>';
      });
    }).catch(function (err) { PS.fatal(body, err); });
  });
})();
