// Layout only, no app behaviour: stretches each .fit title to fill its row.
// Short titles print wide, long titles print condensed, like a gig poster lineup.
(function () {
  function fit() {
    document.querySelectorAll('.fit').forEach(function (el) {
      var box = el.parentElement;
      if (!box.clientWidth) return; // inside a subscreen that isn't showing
      var n = el.textContent.trim().length;
      var stretch = el.dataset.stretch || Math.max(52, Math.min(140, 165 - n * 6.5));
      var max = +el.dataset.max || 999;
      el.style.fontStretch = stretch + '%';
      el.style.fontSize = '100px';
      var size = 100 * box.clientWidth / el.offsetWidth;
      el.style.fontSize = Math.min(size, max) + 'px';
    });
  }
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(fit);
  window.addEventListener('resize', fit);
  window.addEventListener('hashchange', fit);
})();
