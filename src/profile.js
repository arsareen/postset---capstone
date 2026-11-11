// Profile: who you're signed in as, the clips you've added (newest first),
// and sign out.

(function () {
  var store = window.ClipsStore;
  var esc = PS.esc;
  var out = document.getElementById('profile');

  PS.boot(function (user) {
    return store.allClips().then(function (all) {
      var mine = all.filter(function (c) { return c.mine; });
      var showsFilmed = {}, songsFilmed = {};
      mine.forEach(function (c) { showsFilmed[c.showId] = true; songsFilmed[c.songId] = true; });
      var email = user.email || '';
      var name = email.split('@')[0] || 'You';

      return store.urls(mine.map(function (c) { return c.thumb; })).then(function (urls) {
        var list = mine.map(function (c) {
          var s = store.shows().filter(function (x) { return x.id === c.showId; })[0] || {};
          return '<li><a class="result-row" href="' + PS.link('song.html', { show: c.eventSlug, song: c.songKey, angle: c.id }) + '">' +
            '<span class="ft"' + PS.bg(urls[c.thumb], s.cover) + '></span>' +
            '<span><b>' + esc(c.songTitle === 'ID' ? 'Unknown track (ID)' : c.songTitle) + '</b>' +
            '<span class="mono">' + esc(s.artist) + ' · ' + esc(s.venue) + '</span></span>' +
            '<span class="side">' + (c.duration ? '<span class="mono lit">' + PS.dur(c.duration) + '</span>' : '') + '</span></a></li>';
        }).join('');

        out.innerHTML =
          '<div class="profile-id"><div class="avatar xl">' + esc(name.charAt(0).toUpperCase()) + '</div>' +
            '<h2 class="h-lg">' + esc(name) + '</h2><span class="mono">' + esc(email) + '</span></div>' +
          '<div class="profile-stats"><div class="stats">' +
            '<div><b>' + mine.length + '</b><span class="mono">' + (mine.length === 1 ? 'Clip' : 'Clips') + '</span></div>' +
            '<div><b>' + Object.keys(showsFilmed).length + '</b><span class="mono">Shows</span></div>' +
            '<div><b>' + Object.keys(songsFilmed).length + '</b><span class="mono">Songs</span></div></div></div>' +
          '<div class="profile-actions"><a class="btn sm" href="add.html">+ Add a clip</a>' +
            '<button type="button" class="btn sm ghost" id="signout">Sign out</button></div>' +
          '<div class="section-label"><span class="mono">Your clips</span><span class="mono">' + mine.length + '</span></div>' +
          (mine.length
            ? '<ul class="results">' + list + '</ul>'
            : '<div class="no-results"><b>No clips yet</b><p>Film a song or add one from your camera roll, and it shows up here.</p></div>') +
          '<div style="height:110px"></div>';

        document.getElementById('signout').addEventListener('click', function () {
          this.disabled = true;
          window.Auth.signOut();
        });
      });
    }).catch(function (err) { PS.fatal(out, err); });
  });
})();
