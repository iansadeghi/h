let darkMode;
let bindThemeActions;
(function () {
  'use strict';
  var STORAGE_KEY = 'hojreh-theme';
  var TRANSITION_DURATION = 1000; 
  var themeTransitionSequence = 0;
  function announceThemeTransitionStart(source) {
    var id = ++themeTransitionSequence;
    document.dispatchEvent(new CustomEvent('hojreh:theme-transition-start', {
      detail: { id: id, source: source }
    }));
    return id;
  }
  function announceThemeTransitionEnd(id, source) {
    if (id !== themeTransitionSequence) return;
    document.dispatchEvent(new CustomEvent('hojreh:theme-transition-end', {
      detail: { id: id, source: source }
    }));
  }
  var VIEW_TRANSITION_RADIUS_PERCENT = 150;
  function getStoredTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY) || 'light';
    } catch (e) {
      return 'light';
    }
  }
  function saveTheme(theme) {
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {  }
  }
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }
  function updateButtonStates(isDark) {
    document.querySelectorAll('[data-theme-action="dark"]').forEach(function (btn) {
      btn.classList.toggle('pill-btn-active', isDark);
    });
    document.querySelectorAll('[data-theme-action="light"]').forEach(function (btn) {
      btn.classList.toggle('pill-btn-active', !isDark);
    });
  }
  function applyThemeFallback(newTheme, originX, originY, maxRadius, transitionId, source) {
    var isGoingDark = newTheme === 'dark';
    var overlay = document.createElement('div');
    if (isGoingDark) {
      overlay.style.cssText = [
        'position:fixed',
        'inset:0',
        'z-index:99998',
        'pointer-events:none',
        'background:#ffffff',
        'clip-path:circle(' + maxRadius + 'px at ' + originX + 'px ' + originY + 'px)',
        'will-change:clip-path',
      ].join(';');
      document.body.appendChild(overlay);
      overlay.getBoundingClientRect();
      applyTheme(newTheme);
      saveTheme(newTheme);
      updateButtonStates(true);
      overlay.style.transition = 'clip-path ' + TRANSITION_DURATION + 'ms ease-in-out';
      overlay.style.clipPath = 'circle(0px at ' + originX + 'px ' + originY + 'px)';
    } else {
      overlay.style.cssText = [
        'position:fixed',
        'inset:0',
        'z-index:99998',
        'pointer-events:none',
        'background:#ffffff',
        'clip-path:circle(0px at ' + originX + 'px ' + originY + 'px)',
        'will-change:clip-path',
      ].join(';');
      document.body.appendChild(overlay);
      overlay.getBoundingClientRect();
      overlay.style.transition = 'clip-path ' + TRANSITION_DURATION + 'ms ease-in-out';
      overlay.style.clipPath = 'circle(' + maxRadius + 'px at ' + originX + 'px ' + originY + 'px)';
      var halfDuration = Math.floor(TRANSITION_DURATION * 0.5);
      setTimeout(function () {
        applyTheme(newTheme);
        saveTheme(newTheme);
        updateButtonStates(false);
      }, halfDuration);
    }
    var transitionFinished = false;
    function finishTransition() {
      if (transitionFinished) return;
      transitionFinished = true;
      overlay.remove();
      announceThemeTransitionEnd(transitionId, source);
    }
    overlay.addEventListener('transitionend', finishTransition, { once: true });
    setTimeout(function () {
      if (overlay.parentNode) overlay.remove();
      finishTransition();
    }, TRANSITION_DURATION + 200);
  }
  function applyThemeWithViewTransition(newTheme, originXPercent, originYPercent, transitionId, source) {
    var isGoingDark = newTheme === 'dark';
    if (isGoingDark) {
      document.documentElement.setAttribute('data-theme-transition', 'to-dark');
    } else {
      document.documentElement.removeAttribute('data-theme-transition');
    }
    var transition = document.startViewTransition(function () {
      applyTheme(newTheme);
      saveTheme(newTheme);
      updateButtonStates(newTheme === 'dark');
    });
    transition.ready.then(function () {
      var keyframes, pseudoElement;
      if (isGoingDark) {
        keyframes = {
          clipPath: [
            'circle(' + VIEW_TRANSITION_RADIUS_PERCENT + '% at ' + originXPercent + '% ' + originYPercent + '%)',
            'circle(0% at ' + originXPercent + '% ' + originYPercent + '%)',
          ],
        };
        pseudoElement = '::view-transition-old(root)';
      } else {
        keyframes = {
          clipPath: [
            'circle(0% at ' + originXPercent + '% ' + originYPercent + '%)',
            'circle(' + VIEW_TRANSITION_RADIUS_PERCENT + '% at ' + originXPercent + '% ' + originYPercent + '%)',
          ],
        };
        pseudoElement = '::view-transition-new(root)';
      }
      var anim = document.documentElement.animate(keyframes, {
        duration: TRANSITION_DURATION,
        easing: 'ease-in-out',
        pseudoElement: pseudoElement,
      });
      anim.addEventListener('finish', function () {
        document.documentElement.removeAttribute('data-theme-transition');
      }, { once: true });
    }).catch(function () {
      document.documentElement.removeAttribute('data-theme-transition');
    });
    transition.finished.then(function () {
      announceThemeTransitionEnd(transitionId, source);
    }).catch(function () {
      announceThemeTransitionEnd(transitionId, source);
    });
  }
  function getOriginFromBtn(btn) {
    var rect = btn.getBoundingClientRect();
    var originX = Math.round(rect.left + rect.width / 2);
    var originY = Math.round(rect.top + rect.height / 2);
    var maxRadius = Math.ceil(Math.hypot(
      Math.max(originX, window.innerWidth - originX),
      Math.max(originY, window.innerHeight - originY)
    ));
    var originXPercent = (originX / window.innerWidth) * 100;
    var originYPercent = (originY / window.innerHeight) * 100;
    return {
      originX: originX,
      originY: originY,
      maxRadius: maxRadius,
      originXPercent: originXPercent,
      originYPercent: originYPercent
    };
  }
  function handleThemeBtn(event) {
    var btn = event.currentTarget;
    var action = btn.getAttribute('data-theme-action'); 
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var newTheme;
    if (action === 'toggle') {
      newTheme = isDark ? 'light' : 'dark';
    } else if (action === 'dark') {
      if (isDark) return;
      newTheme = 'dark';
    } else {
      if (!isDark) return;
      newTheme = 'light';
    }
    var origin = getOriginFromBtn(btn);
    var transitionId = announceThemeTransitionStart(btn);
    if (typeof document.startViewTransition === 'function') {
      applyThemeWithViewTransition(newTheme, origin.originXPercent, origin.originYPercent, transitionId, btn);
    } else {
      applyThemeFallback(newTheme, origin.originX, origin.originY, origin.maxRadius, transitionId, btn);
    }
  }
  bindThemeActions = function (root) {
    (root || document).querySelectorAll('[data-theme-action]').forEach(function (btn) {
      if (btn.dataset.hojrehThemeBound === 'true') return;
      btn.dataset.hojrehThemeBound = 'true';
      btn.addEventListener('click', handleThemeBtn);
    });
  };
  function bindScrollTopBtns() {
    document.querySelectorAll('[data-action="scroll-top"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }
  function init() {
    var currentTheme = getStoredTheme();
    applyTheme(currentTheme);
    updateButtonStates(currentTheme === 'dark');
    bindThemeActions(document);
    bindScrollTopBtns();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  darkMode = {
    setTheme: function (theme) {
      applyTheme(theme);
      saveTheme(theme);
      updateButtonStates(theme === 'dark');
    },
    getTheme: function () {
      return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
    }
  };
})();
export { darkMode, bindThemeActions };
