// Shows (home): the show with the newest upload up top, then every show as
// a footage card with its clip count and a stack of its latest angles.
// Shows you filmed at come first.

(function () {
  var store = window.ClipsStore;
  var esc = PS.esc;

  document.getElementById('today').textContent =
    new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' });

  PS.boot(function (user, shows) {
    var out = document.getElementById('shows');
    if (!shows.length) {
      out.innerHTML = '<div class="no-results"><b>No shows yet</b><p>Run supabase/schema.sql in your Supabase project; it adds the first shows.</p></div>';
      return;
    }

    return store.allClips().then(function (clips) {
      var byShow = {};
      clips.forEach(function (c) { (byShow[c.showId] = byShow[c.showId] || []).push(c); });

      var thumbPaths = [];
      shows.forEach(function (s) { (byShow[s.id] || []).slice(0, 3).forEach(function (c) { thumbPaths.push(c.thumb); }); });

      return store.urls(thumbPaths).then(function (urls) {
        function stack(list) {
          return '<span class="stack">' + list.slice(0, 3).map(function (c) {
            return '<i' + PS.bg(urls[c.thumb], null) + '></i>';
          }).join('') + '</span>';
        }

        function card(s) {
          var list = byShow[s.id] || [];
          var mine = list.some(function (c) { return c.mine; });
          return '<a class="show-card" href="' + PS.link('event.html', { show: s.slug }) + '"' + PS.bg(s.cover) + '>' +
            '<div>' + (mine ? '<span class="tag solid">You filmed here</span>' : '') +
              '<span class="mono" style="display:block">' + esc(PS.showDate(s.date_local)) + '</span>' +
              '<h3 class="h-md">' + esc(s.artist) + '</h3>' +
              '<span class="mono">' + esc(s.venue) + '</span></div>' +
            '<div class="stack-count">' + (list.length ? stack(list) : '') +
              '<span class="mono lit">' + (list.length ? PS.plural(list.length, 'clip') : 'No clips yet') + '</span></div>' +
            '</a>';
        }

        // The show with the newest upload, as the big card.
        var html = '';
        var latest = clips[0] ? store.shows().filter(function (s) { return s.id === clips[0].showId; })[0] : null;
        if (latest) {
          html += '<a class="live-card fade-in" href="' + PS.link('event.html', { show: latest.slug }) + '"' + PS.bg(latest.cover) + '>' +
            '<span class="chip glass"><span class="dot"></span>Just added</span>' +
            '<span class="chip glass who-here">' + PS.plural((byShow[latest.id] || []).length, 'clip') + '</span>' +
            '<div class="body"><span class="mono lit">' + esc(latest.venue) + ' · ' + esc(PS.showDate(latest.date_local)) + '</span>' +
            '<h2 class="h-xl">' + esc(latest.artist) + '</h2>' +
            '<span class="btn">Watch the set</span></div></a>';
        }

        var yours = shows.filter(function (s) { return (byShow[s.id] || []).some(function (c) { return c.mine; }); });
        var others = shows.filter(function (s) { return yours.indexOf(s) < 0; });
        if (yours.length) {
          html += '<div class="section-label"><span class="mono">Your shows</span><span class="mono">' + yours.length + '</span></div>' +
            yours.map(card).join('');
        }
        if (others.length) {
          html += '<div class="section-label" style="padding-top:' + (yours.length ? '18px' : '0') + '"><span class="mono">' +
            (yours.length ? 'More shows' : 'Shows') + '</span><span class="mono">' + others.length + '</span></div>' +
            others.map(card).join('');
        }
        out.innerHTML = html;
      });
    }).catch(function (err) { PS.fatal(out, err); });
  });
})();
