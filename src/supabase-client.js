// One Supabase client for every working screen, plus the sign-in guard.
// Needs, loaded before it: the supabase-js library and config.js
// (written from .env by scripts/write-config.mjs).

(function () {
  var cfg = window.POSTSET_CONFIG;
  if (!cfg || !cfg.url || !window.supabase) {
    document.body.innerHTML = '<main style="max-width:420px;margin:60px auto;font:16px/1.5 Inter,system-ui,sans-serif;padding:0 16px">' +
      '<h1>PostSet can’t reach its database</h1>' +
      (window.supabase
        ? '<p>src/config.js is missing. In the repo folder, run <code>node scripts/write-config.mjs</code>, then reload.</p>'
        : '<p>The Supabase library didn’t load. Check your internet connection, then reload.</p>') +
      '</main>';
    throw new Error('PostSet config missing');
  }

  var db = window.supabase.createClient(cfg.url, cfg.anonKey);
  window.db = db;

  function here() {
    return (location.pathname.split('/').pop() || 'index.html') + location.search + location.hash;
  }

  window.Auth = {
    // Resolves with the signed-in user. Signed out: goes to sign-in and
    // comes back here afterwards; the promise never resolves.
    requireUser: function () {
      return db.auth.getSession().then(function (r) {
        var user = r.data && r.data.session && r.data.session.user;
        if (user) return user;
        location.replace('signin.html?next=' + encodeURIComponent(here()));
        return new Promise(function () {});
      });
    },
    signOut: function () {
      return db.auth.signOut().then(function () { location.replace('signin.html'); });
    },
  };

  // Signing out in another tab signs this one out too.
  db.auth.onAuthStateChange(function (event) {
    if (event === 'SIGNED_OUT' && !/signin\.html$/.test(location.pathname)) location.replace('signin.html');
  });
})();
