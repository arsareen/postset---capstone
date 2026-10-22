// Profile screen: view your profile (#view) and edit it (#edit).
// TODO(W10): real data — save to a Supabase profiles table, not this browser.
// TODO(W12): tie the profile to the signed-in account.

(function () {
  var KEY = 'postset.profile';
  var LIMITS = { name: 40, city: 40, bio: 160, artists: 8, artistLength: 40 };
  var HANDLE = /^[a-z0-9._]{3,20}$/;
  var data = window.POSTSET_SAMPLE;
  var form = document.getElementById('profile-form');
  var photo = null; // the photo being edited, as a data: URL

  function $(id) { return document.getElementById(id); }

  // localStorage can be missing or full (private browsing, a big photo), so
  // every access is guarded and the screen still works without it.
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch (e) { return null; }
  }
  function save(profile) {
    try { localStorage.setItem(KEY, JSON.stringify(profile)); return true; } catch (e) { return false; }
  }

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function paintAvatar(el, profile, src) {
    if (src) {
      el.style.backgroundImage = 'url(' + src + ')';
      el.textContent = '';
    } else {
      el.style.backgroundImage = '';
      el.textContent = profile && profile.name ? profile.name.trim().charAt(0).toUpperCase() : '';
    }
  }

  // ---------- view ----------
  function renderView() {
    var p = load();
    $('profile-set').hidden = !p;
    $('profile-empty').hidden = !!p;
    if (!p) return;

    paintAvatar($('view-avatar'), p, p.photo);
    $('view-name').textContent = p.name;
    $('view-handle').textContent = '@' + p.handle;
    $('view-city').textContent = p.city || '';
    $('view-city').hidden = !p.city;
    $('view-bio').textContent = p.bio || '';
    $('view-bio').hidden = !p.bio;
    $('view-artists').innerHTML = (p.artists || []).map(function (a) {
      return '<span class="tag">' + esc(a) + '</span>';
    }).join('');
    $('view-artists').hidden = !(p.artists && p.artists.length);

    var shows = data.shows.filter(function (s) { return s.attended; });
    var clips = 0;
    data.shows.forEach(function (s) {
      s.songs.forEach(function (song) { clips += song.mine || 0; });
    });
    $('view-stats').innerHTML =
      '<div><b>' + shows.length + '</b><span class="mono">Shows</span></div>' +
      '<div><b>' + clips + '</b><span class="mono">Clips</span></div>' +
      '<div><b>' + (p.artists || []).length + '</b><span class="mono">Artists</span></div>';

    $('view-show-count').textContent = shows.length;
    $('view-shows').innerHTML = shows.map(function (s) {
      return '<li><a class="result-row" href="' + s.href + '">' +
        '<span class="ft" style="background-image:url(' + s.img + ')"></span>' +
        '<span><b>' + esc(s.artist) + '</b><span class="mono">' + esc(s.venue) + ' · ' + esc(s.date) + '</span></span>' +
        '<span class="side"><span class="mono lit">' + s.clips + ' clips</span></span></a></li>';
    }).join('');
  }

  // ---------- edit ----------
  function fillForm() {
    var p = load() || {};
    form.name.value = p.name || '';
    form.handle.value = p.handle || '';
    form.city.value = p.city || '';
    form.bio.value = p.bio || '';
    form.artists.value = (p.artists || []).join(', ');
    photo = p.photo || null;
    paintPhoto();
    clearErrors();
    updateCounts();
  }

  function paintPhoto() {
    paintAvatar($('edit-avatar'), { name: form.name.value }, photo);
    $('photo-remove').hidden = !photo;
  }

  function updateCounts() {
    document.querySelector('[data-count="name"]').textContent = form.name.value.length + ' / ' + LIMITS.name;
    document.querySelector('[data-count="bio"]').textContent = form.bio.value.length + ' / ' + LIMITS.bio;
  }

  function setError(field, message) {
    var wrap = document.querySelector('[data-field="' + field + '"]');
    var err = wrap.querySelector('.err');
    var hint = wrap.querySelector('.hint');
    wrap.classList.toggle('invalid', !!message);
    err.textContent = message || '';
    err.hidden = !message;
    // The error replaces the hint rather than repeating it underneath.
    if (hint) hint.hidden = !!message;
  }

  function clearErrors() {
    ['name', 'handle', 'city', 'bio', 'artists'].forEach(function (f) { setError(f, ''); });
    $('form-error').hidden = true;
  }

  function parseArtists(text) {
    var seen = {};
    return text.split(',').map(function (a) { return a.trim().replace(/\s+/g, ' '); })
      .filter(function (a) {
        var k = a.toLowerCase();
        if (!a || seen[k]) return false;
        seen[k] = true;
        return true;
      });
  }

  // Returns the cleaned profile, or null after marking every field that's wrong.
  function validate() {
    clearErrors();
    var ok = true;
    var name = form.name.value.trim().replace(/\s+/g, ' ');
    var handle = form.handle.value.trim().replace(/^@/, '').toLowerCase();
    var city = form.city.value.trim();
    var bio = form.bio.value.trim();
    var artists = parseArtists(form.artists.value);

    if (!name) { setError('name', 'Add a display name.'); ok = false; }
    if (!handle) { setError('handle', 'Pick a handle.'); ok = false; }
    else if (!HANDLE.test(handle)) { setError('handle', 'Use 3–20 lowercase letters, numbers, dots or underscores. No spaces.'); ok = false; }
    if (bio.length > LIMITS.bio) { setError('bio', 'Keep it to ' + LIMITS.bio + ' characters.'); ok = false; }
    if (artists.length > LIMITS.artists) { setError('artists', 'Up to ' + LIMITS.artists + ' artists.'); ok = false; }
    else if (artists.some(function (a) { return a.length > LIMITS.artistLength; })) { setError('artists', 'One of those names is too long.'); ok = false; }

    return ok ? { name: name, handle: handle, city: city, bio: bio, artists: artists, photo: photo } : null;
  }

  // Shrinks a chosen photo to a 256px square so it fits in browser storage.
  function readPhoto(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onerror = reject;
      reader.onload = function () {
        var img = new Image();
        img.onerror = reject;
        img.onload = function () {
          var size = 256;
          var side = Math.min(img.width, img.height);
          var canvas = document.createElement('canvas');
          canvas.width = canvas.height = size;
          canvas.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  $('photo').addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\//.test(file.type)) { $('form-error').textContent = 'That file isn’t a photo.'; $('form-error').hidden = false; return; }
    readPhoto(file).then(function (src) { photo = src; paintPhoto(); $('form-error').hidden = true; })
      .catch(function () { $('form-error').textContent = 'Couldn’t read that photo. Try another one.'; $('form-error').hidden = false; });
  });
  $('photo-remove').addEventListener('click', function () { photo = null; paintPhoto(); });
  form.name.addEventListener('input', function () { updateCounts(); if (!photo) paintPhoto(); });
  form.bio.addEventListener('input', updateCounts);
  // The @ is already drawn in front of the field, and handles are lowercase.
  form.handle.addEventListener('input', function () {
    var cleaned = form.handle.value.replace(/^@+/, '').toLowerCase();
    if (cleaned !== form.handle.value) form.handle.value = cleaned;
  });
  // A field's error goes away as soon as you start fixing it.
  ['name', 'handle', 'city', 'bio', 'artists'].forEach(function (f) {
    form[f].addEventListener('input', function () { setError(f, ''); });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var profile = validate();
    if (!profile) {
      var first = form.querySelector('.invalid input, .invalid textarea');
      if (first) first.focus();
      return;
    }
    if (!save(profile)) {
      $('form-error').textContent = 'Couldn’t save on this device. If you added a photo, try removing it.';
      $('form-error').hidden = false;
      return;
    }
    location.hash = 'view';
  });

  // The URL hash picks the subscreen (see .state in styles.css), so refresh
  // whichever one is being opened.
  function route() {
    if (location.hash === '#edit') fillForm();
    else renderView();
  }
  window.addEventListener('hashchange', route);
  renderView();
  if (location.hash === '#edit') fillForm();
})();
