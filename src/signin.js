// Sign in, or create an account, with email and password (Supabase Auth).
// After signing in, goes back to the page that sent you here (?next=).

(function () {
  var db = window.db;
  var params = new URLSearchParams(location.search);
  var mode = 'signin'; // or 'signup'

  function $(id) { return document.getElementById(id); }

  // Only same-site page names, so ?next= can't send you to another website.
  function nextPage() {
    var n = params.get('next') || '';
    return /^[a-z0-9-]+\.html([?#].*)?$/i.test(n) ? n : 'index.html';
  }

  function setError(field, message) {
    var wrap = document.querySelector('[data-field="' + field + '"]');
    var err = wrap.querySelector('.err');
    wrap.classList.toggle('invalid', !!message);
    err.textContent = message || '';
    err.hidden = !message;
  }
  function formError(message) { $('signin-error').textContent = message || ''; $('signin-error').hidden = !message; }
  function status(message) { $('signin-status').textContent = message || ''; $('signin-status').hidden = !message; }

  function setMode(m) {
    mode = m;
    var up = m === 'signup';
    $('signin-title').textContent = up ? 'Create an account' : 'Sign in';
    $('signin-submit').textContent = up ? 'Create account' : 'Sign in';
    $('signin-switch-text').textContent = up ? 'Already have an account?' : 'New here?';
    $('signin-switch').textContent = up ? 'Sign in' : 'Create an account';
    $('signin-password').autocomplete = up ? 'new-password' : 'current-password';
    $('signin-password-hint').hidden = !up;
    setError('email', ''); setError('password', ''); formError('');
  }

  // Supabase's messages, in words a user can act on.
  function friendly(err) {
    var m = (err && err.message) || '';
    if (/invalid login credentials/i.test(m)) return 'That email and password don’t match an account.';
    if (/email not confirmed/i.test(m)) return 'Confirm your email first: open the link we sent you, then sign in.';
    if (/already registered|already exists/i.test(m)) return 'There’s already an account with that email. Sign in instead.';
    if (/rate limit|too many/i.test(m)) return 'Too many tries. Wait a minute and try again.';
    if (/failed to fetch|network/i.test(m)) return 'Can’t reach PostSet. Check your connection and try again.';
    return m || 'Something went wrong. Try again.';
  }

  $('signin-switch').addEventListener('click', function () { setMode(mode === 'signin' ? 'signup' : 'signin'); });
  $('signin-email').addEventListener('input', function () { setError('email', ''); });
  $('signin-password').addEventListener('input', function () { setError('password', ''); });

  $('signin-form').addEventListener('submit', function (e) {
    e.preventDefault();
    formError(''); status('');
    var email = $('signin-email').value.trim();
    var password = $('signin-password').value;
    var bad = false;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { setError('email', 'Enter your email address.'); bad = true; }
    if (password.length < 6) { setError('password', 'At least 6 characters.'); bad = true; }
    if (bad) return;

    var button = $('signin-submit');
    button.disabled = true;
    var call = mode === 'signup'
      ? db.auth.signUp({ email: email, password: password, options: { emailRedirectTo: location.origin + '/signin.html' } })
      : db.auth.signInWithPassword({ email: email, password: password });

    call.then(function (r) {
      button.disabled = false;
      if (r.error) { formError(friendly(r.error)); return; }
      if (r.data.session) { location.replace(nextPage()); return; }
      // Sign-up with email confirmation turned on: no session until confirmed.
      setMode('signin');
      status('Check ' + email + ' for a link to confirm your account, then sign in here.');
    }, function (err) {
      button.disabled = false;
      formError(friendly(err));
    });
  });

  // Already signed in (or just back from the confirmation link): skip the form.
  db.auth.getSession().then(function (r) {
    if (r.data && r.data.session) location.replace(nextPage());
  });
})();
