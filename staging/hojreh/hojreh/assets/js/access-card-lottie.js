(function () {
  'use strict';
  if (!window.lottie || !window.HOJREH_LOTTIE) return;
  var CYCLE_END = { edit: 55, settings: 50, plus: 50 };
  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function setup(box) {
    var key = box.getAttribute('data-lottie');
    var data = window.HOJREH_LOTTIE[key];
    var end = CYCLE_END[key];
    if (!data || !end) return;
    var card = box.closest('a, button') || box;
    var hovering = false;
    var playing = false;
    var anim = window.lottie.loadAnimation({
      container: box,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      animationData: data,
      rendererSettings: { preserveAspectRatio: 'xMidYMid meet' }
    });
    anim.addEventListener('DOMLoaded', function () {
      box.querySelectorAll('[stroke]').forEach(function (el) {
        el.setAttribute('stroke', 'currentColor');
      });
      var svg = box.querySelector('svg');
      if (svg) svg.setAttribute('aria-hidden', 'true');
    });
    function rest() {
      anim.resetSegments(true);
      anim.goToAndStop(0, true);
    }
    function start() {
      if (reduceMotion) return;
      hovering = true;
      anim.loop = true;               
      if (!playing) {
        playing = true;
        anim.playSegments([0, end], true);
      }
    }
    function stop() {
      hovering = false;
      anim.loop = false;              
    }
    anim.addEventListener('complete', function () {
      playing = false;
      rest();                          
      if (hovering) start();           
    });
    card.addEventListener('mouseenter', start);
    card.addEventListener('mouseleave', stop);
    card.addEventListener('focusin', function () {
      try { if (!card.matches(':focus-visible')) return; } catch (e) {}
      start();
    });
    card.addEventListener('focusout', stop);
  }
  function init() {
    document.querySelectorAll('[data-lottie]').forEach(setup);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
