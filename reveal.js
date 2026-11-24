/* Aparición suave al hacer scroll. Lee los selectores de data-reveal en <body>.
   No oculta lo que ya se ve al cargar y no hace nada con "reducir movimiento". */
(function () {
  'use strict';
  var sel = document.body.getAttribute('data-reveal');
  if (!sel || !('IntersectionObserver' in window)) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 120); };
  idle(function () {
    var els = document.querySelectorAll(sel), vh = window.innerHeight;
    var below = Array.prototype.filter.call(els, function (e) { return e.getBoundingClientRect().top > vh; });
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (x) { if (x.isIntersecting) { x.target.classList.add('in'); io.unobserve(x.target); } });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    requestAnimationFrame(function () {
      below.forEach(function (e, i) { e.classList.add('rv'); e.style.transitionDelay = (i % 3) * 60 + 'ms'; io.observe(e); });
    });
  });
})();
