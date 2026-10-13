(function () {
  'use strict';
  var MIN_DISPLAY_MS = 4000;
  var FADE_MS = 500;
  var SOFT_CAP_PERCENT = 92;
  var GLOW_THRESHOLD_PERCENT = 80;
  document.addEventListener('DOMContentLoaded', function () {
    var preloader = document.getElementById('hojrehPreloader');
    var barWrap = document.getElementById('hojrehPreloaderBar');
    var barFill = barWrap ? barWrap.querySelector('.preloader-bar-fill') : null;
    if (!preloader || !barFill) return;
    var startTime = performance.now();
    var resourcesReady = false;
    var rafId = null;
    var finished = false;
    function easeProgress(t) {
      return t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }
    function setProgress(percent) {
      percent = Math.max(0, Math.min(100, percent));
      barFill.style.width = percent + '%';
      if (percent >= GLOW_THRESHOLD_PERCENT) {
        barFill.classList.add('is-glowing');
      } else {
        barFill.classList.remove('is-glowing');
      }
    }
    function tick(now) {
      var elapsed = now - startTime;
      var t = Math.min(elapsed / MIN_DISPLAY_MS, 1);
      var eased = easeProgress(t);
      var target = eased * 100;
      if (!resourcesReady && target > SOFT_CAP_PERCENT) {
        target = SOFT_CAP_PERCENT;
      }
      setProgress(target);
      var minTimeDone = elapsed >= MIN_DISPLAY_MS;
      if (minTimeDone && resourcesReady) {
        setProgress(100);
        finishPreload();
        return;
      }
      rafId = requestAnimationFrame(tick);
    }
    function waitForRealReadiness() {
      var fontsPromise = (document.fonts && document.fonts.ready)
        ? document.fonts.ready.catch(function () {})
        : Promise.resolve();
      var loadPromise = new Promise(function (resolve) {
        if (document.readyState === 'complete') {
          resolve();
        } else {
          window.addEventListener('load', function () { resolve(); }, { once: true });
        }
      });
      var stylesheetsPromise = Promise.all(
        Array.prototype.map.call(
          document.querySelectorAll('link[rel="stylesheet"]'),
          function (link) {
            return new Promise(function (resolve) {
              if (link.sheet) { resolve(); return; }
              link.addEventListener('load', resolve, { once: true });
              link.addEventListener('error', resolve, { once: true });
            });
          }
        )
      );
      var imagesPromise = Promise.all(
        Array.prototype.map.call(document.images, function (img) {
          if (img.complete) return Promise.resolve();
          return new Promise(function (resolve) {
            img.addEventListener('load', resolve, { once: true });
            img.addEventListener('error', resolve, { once: true });
          });
        })
      );
      Promise.all([fontsPromise, loadPromise, stylesheetsPromise, imagesPromise])
        .then(function () {
          resourcesReady = true;
        })
        .catch(function () {
          resourcesReady = true;
        });
    }
    function finishPreload() {
      if (finished) return;
      finished = true;
      if (rafId) cancelAnimationFrame(rafId);
      preloader.classList.add('is-hidden');
      if (barWrap) barWrap.classList.add('is-hidden');
      window.setTimeout(function () {
        preloader.style.display = 'none';
        if (barWrap) barWrap.style.display = 'none';
        document.documentElement.classList.add('hojreh-preloading-done');
      }, FADE_MS);
    }
    waitForRealReadiness();
    rafId = requestAnimationFrame(tick);
  });
})();