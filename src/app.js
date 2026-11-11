// Shared by every working screen: escaping, dates, links, the tab bar,
// start-up (sign-in + shows), and grabbing a still frame from a video.

(function () {
  var store = window.ClipsStore;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function link(page, query) {
    var q = new URLSearchParams();
    Object.keys(query || {}).forEach(function (k) { if (query[k] != null && query[k] !== '') q.set(k, query[k]); });
    var s = q.toString();
    return page + (s ? '?' + s : '');
  }

  // date_local is a plain date ("2026-07-10"); noon keeps it on the right day in any time zone.
  function showDate(d, opts) {
    if (!d) return '';
    return new Date(d + 'T12:00:00').toLocaleDateString('en-US', opts || { weekday: 'short', day: 'numeric', month: 'short' });
  }
  function clock(iso) {
    return iso ? new Date(iso).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '';
  }
  function dur(s) {
    if (!s && s !== 0) return '';
    s = Math.round(s);
    return Math.floor(s / 60) + ':' + ('0' + (s % 60)).slice(-2);
  }
  function plural(n, word, many) { return n + ' ' + (n === 1 ? word : (many || word + 's')); }

  var ICONS = {
    shows: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7.5A1.5 1.5 0 015.5 6h13A1.5 1.5 0 0120 7.5V10a2 2 0 000 4v2.5a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 16.5V14a2 2 0 000-4z"/><path d="M14 6v12" stroke-dasharray="2 2.5"/></svg>',
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg>',
    add: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>',
    profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8.5" r="3.8"/><path d="M4.5 20c1.2-3.8 4-5.6 7.5-5.6s6.3 1.8 7.5 5.6"/></svg>',
    back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 6l-6 6 6 6"/></svg>',
  };

  // The floating tab bar. `here` is shows | search | add | profile.
  function tabbar(here) {
    function tab(name, href, label, inner, cls) {
      return '<a href="' + href + '" aria-label="' + label + '"' + (cls ? ' class="' + cls + '"' : '') +
        (here === name ? ' aria-current="page"' : '') + '>' + inner + '</a>';
    }
    return '<nav class="tabbar" aria-label="Main">' +
      tab('shows', 'index.html', 'Shows', ICONS.shows) +
      tab('search', 'search.html', 'Search', ICONS.search) +
      tab('record', 'add.html?film=1', 'Film a clip', '<span></span>', 'rec') +
      tab('add', 'add.html', 'Add a clip', ICONS.add) +
      tab('profile', 'profile.html', 'Profile', ICONS.profile) +
      '</nav>';
  }

  function fatal(where, err) {
    if (err) console.error(err);
    var el = typeof where === 'string' ? document.getElementById(where) : where;
    if (!el) return;
    el.innerHTML = '<div class="no-results"><b>Couldn’t load this</b>' +
      '<p>Check your connection and reload. If it keeps happening, sign out and back in.</p></div>';
  }

  // Signs in (or sends you to sign-in), loads the shows, then runs the page.
  function boot(run) {
    var tabs = document.getElementById('tabbar-slot');
    if (tabs) tabs.outerHTML = tabbar(tabs.getAttribute('data-here'));
    window.Auth.requireUser().then(function (user) {
      return store.ready(user).then(function (shows) { return run(user, shows); });
    }).catch(function (err) { fatal(document.querySelector('main'), err); });
  }

  // A still JPEG and the length of a video (a File or a URL). Never rejects:
  // resolves { blob: null } when the browser can't decode it.
  function grabFrame(src, opts) {
    opts = opts || {};
    return new Promise(function (resolve) {
      var url = typeof src === 'string' ? src : URL.createObjectURL(src);
      var v = document.createElement('video');
      var done = false;
      function finish(out) {
        if (done) return;
        done = true;
        if (typeof src !== 'string') URL.revokeObjectURL(url);
        v.removeAttribute('src'); v.load();
        resolve(out);
      }
      var timer = setTimeout(function () { finish({ blob: null, duration: isFinite(v.duration) ? v.duration : null }); }, opts.timeout || 8000);
      if (opts.crossOrigin) v.crossOrigin = 'anonymous';
      v.muted = true; v.playsInline = true; v.preload = 'auto';
      v.addEventListener('loadedmetadata', function () {
        v.currentTime = Math.min(1, (v.duration || 2) * 0.3);
      });
      v.addEventListener('seeked', function () {
        try {
          var w = 360, h = Math.round(w * (v.videoHeight / v.videoWidth || 16 / 9));
          var c = document.createElement('canvas');
          c.width = w; c.height = h;
          c.getContext('2d').drawImage(v, 0, 0, w, h);
          c.toBlob(function (blob) { clearTimeout(timer); finish({ blob: blob, duration: v.duration }); }, 'image/jpeg', 0.8);
        } catch (e) { clearTimeout(timer); finish({ blob: null, duration: v.duration }); }
      });
      v.addEventListener('error', function () { clearTimeout(timer); finish({ blob: null, duration: null }); });
      v.src = url;
    });
  }

  // A URL made safe to put inside CSS url('…'): quotes, brackets and spaces
  // are percent-encoded, so a stored cover path or file name can't break out
  // of the url() and add its own styles.
  function cssUrl(u) {
    return "url('" + encodeURI(String(u)).replace(/%25([0-9a-f]{2})/gi, '%$1')
      .replace(/'/g, '%27').replace(/\(/g, '%28').replace(/\)/g, '%29').replace(/\\/g, '%5C') + "')";
  }

  // Background image for a clip: its still frame if we have a URL, else the show's cover.
  function bg(url, fallback) {
    var u = url || fallback;
    return u ? ' style="background-image:' + esc(cssUrl(u)) + '"' : '';
  }

  window.PS = {
    esc: esc, link: link, showDate: showDate, clock: clock, dur: dur, plural: plural,
    icons: ICONS, tabbar: tabbar, fatal: fatal, boot: boot, grabFrame: grabFrame, bg: bg, cssUrl: cssUrl,
  };
})();
