let darkMode;
let bindThemeActions;

/**
 * ═══════════════════════════════════════════════════════════════
 * Hojreh Dark Mode System
 * سیستم تغییر تم با افکت Radial Circle Clip-path Transition
 * از View Transitions API با Fallback دستی پشتیبانی می‌کند
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  var STORAGE_KEY = 'hojreh-theme';
  var TRANSITION_DURATION = 1000; // ms
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

  /* شعاع نهایی دایره برای مسیر View Transition API به‌صورت درصد (نه px).
     چون ::view-transition-new(root) فضای مختصات مستقل خودش را دارد که در
     زوم‌های غیر از ۱۰۰٪ با سند اصلی هم‌راستا نمی‌ماند، به‌جای px مطلق از
     درصدِ نسبت به ابعاد خودِ pseudo-element استفاده می‌کنیم. طبق فرمول
     رزولوشن درصدی shape-radius (نسبت به قطر مرجع: sqrt((W²+H²)/2))،
     برای پوشاندن کامل صفحه از هر نقطه‌ای (حتی گوشه‌ها) حداقل ~141.42٪
     لازم است؛ ۱۵۰٪ کمی حاشیه اطمینان اضافه می‌کند. */
  var VIEW_TRANSITION_RADIUS_PERCENT = 150;

  /* ═══════════════════════════════════════════════════════════════
     THEME PERSISTENCE
     ذخیره و بارگذاری تنظیمات تم
     ═══════════════════════════════════════════════════════════════ */

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
    } catch (e) { /* silent */ }
  }

  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     BUTTON STATE UPDATER
     آپدیت ظاهر دکمه‌های dark/light بر اساس تم فعال
     ═══════════════════════════════════════════════════════════════ */

  function updateButtonStates(isDark) {
    document.querySelectorAll('[data-theme-action="dark"]').forEach(function (btn) {
      btn.classList.toggle('pill-btn-active', isDark);
    });
    document.querySelectorAll('[data-theme-action="light"]').forEach(function (btn) {
      btn.classList.toggle('pill-btn-active', !isDark);
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     FALLBACK TRANSITION (for browsers without View Transitions API)
     انیمیشن دستی با clip-path برای مرورگرهای قدیمی‌تر
     ═══════════════════════════════════════════════════════════════ */

  function applyThemeFallback(newTheme, originX, originY, maxRadius, transitionId, source) {
    var isGoingDark = newTheme === 'dark';

    var overlay = document.createElement('div');

    if (isGoingDark) {
      /* حالت معکوس: خودِ لایت (رنگ قبلی) به‌صورت یک دایره‌ی بزرگ که کل
         صفحه را پوشانده روی صفحه می‌ماند و کم‌کم به سمت نقطه‌ی دکمه
         جمع می‌شود؛ در همین حین تم واقعی زیرش به دارک تغییر می‌کند و
         با جمع‌شدن دایره‌ی لایت، دارک نمایان می‌شود. */
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

      // Force reflow so transition picks up the initial state
      overlay.getBoundingClientRect();

      // تم واقعی همین حالا زیر overlay عوض می‌شود (چون overlay کل صفحه را پوشانده، نامرئی است)
      applyTheme(newTheme);
      saveTheme(newTheme);
      updateButtonStates(true);

      overlay.style.transition = 'clip-path ' + TRANSITION_DURATION + 'ms ease-in-out';
      overlay.style.clipPath = 'circle(0px at ' + originX + 'px ' + originY + 'px)';
    } else {
      /* حالت عادی: دایره‌ی رنگ جدید (لایت) از نقطه‌ی دکمه شروع به
         گسترش می‌کند تا کل صفحه را بگیرد. */
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

      // Force reflow so transition picks up the initial state
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

  /* ═══════════════════════════════════════════════════════════════
     VIEW TRANSITIONS API TRANSITION
     انیمیشن با View Transitions API (مرورگرهای مدرن)
     ═══════════════════════════════════════════════════════════════ */

  function applyThemeWithViewTransition(newTheme, originXPercent, originYPercent, transitionId, source) {
    var isGoingDark = newTheme === 'dark';

    // برای گذار به دارک، ترتیب لایه‌ها باید برعکس شود (لایتِ قدیم روی
    // دارکِ جدید بنشیند تا با جمع‌شدنِ دایره‌اش، دارک نمایان شود).
    // این attribute فقط طول همین گذار زنده می‌ماند.
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
      // مختصات و شعاع به‌صورت درصد (نسبت به ابعاد خودِ pseudo-element) داده
      // می‌شوند، نه px مطلق، چون فضای مختصات ::view-transition-*(root)
      // در زوم‌های غیر از ۱۰۰٪ با سند اصلی هم‌راستا نیست.
      var keyframes, pseudoElement;

      if (isGoingDark) {
        // دایره‌ی لایتِ قدیم (که کل صفحه را پوشانده) به سمت نقطه‌ی دکمه جمع می‌شود.
        keyframes = {
          clipPath: [
            'circle(' + VIEW_TRANSITION_RADIUS_PERCENT + '% at ' + originXPercent + '% ' + originYPercent + '%)',
            'circle(0% at ' + originXPercent + '% ' + originYPercent + '%)',
          ],
        };
        pseudoElement = '::view-transition-old(root)';
      } else {
        // دایره‌ی لایتِ جدید از مرکز دکمه‌ی کلیک‌شده شروع به گسترش می‌کند.
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

  /* ═══════════════════════════════════════════════════════════════
     ORIGIN CALCULATOR
     محاسبه مختصات مرکز دقیق آیکون دکمه
     ═══════════════════════════════════════════════════════════════ */

  function getOriginFromBtn(btn) {
    var rect = btn.getBoundingClientRect();
    var originX = Math.round(rect.left + rect.width / 2);
    var originY = Math.round(rect.top + rect.height / 2);
    var maxRadius = Math.ceil(Math.hypot(
      Math.max(originX, window.innerWidth - originX),
      Math.max(originY, window.innerHeight - originY)
    ));
    // مختصات درصدی (نسبت به ویوپورت) — فقط برای مسیر View Transition
    // استفاده می‌شود، چون به فضای مختصات pixel-scaled سند اصلی وابسته نیست.
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

  /* ═══════════════════════════════════════════════════════════════
     THEME ACTION HANDLER
     هندلر دکمه تغییر تم (toggle / dark / light)
     ═══════════════════════════════════════════════════════════════ */

  function handleThemeBtn(event) {
    var btn = event.currentTarget;
    var action = btn.getAttribute('data-theme-action'); // 'toggle' | 'dark' | 'light'
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';

    var newTheme;
    if (action === 'toggle') {
      // دکمه یکپارچه: هر بار بین dark و light سوییچ می‌کند
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

  /** Bind theme controls that may be added after initial page boot, such as
     the product formula modal's lazily-created header controls. */
  bindThemeActions = function (root) {
    (root || document).querySelectorAll('[data-theme-action]').forEach(function (btn) {
      if (btn.dataset.hojrehThemeBound === 'true') return;
      btn.dataset.hojrehThemeBound = 'true';
      btn.addEventListener('click', handleThemeBtn);
    });
  };

  /* ═══════════════════════════════════════════════════════════════
     SCROLL TO TOP HANDLER
     هندلر دکمه بازگشت به بالا
     ═══════════════════════════════════════════════════════════════ */

  function bindScrollTopBtns() {
    document.querySelectorAll('[data-action="scroll-top"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  }

  /* ═══════════════════════════════════════════════════════════════
     INITIALIZATION
     مقداردهی اولیه
     ═══════════════════════════════════════════════════════════════ */

  function init() {
    var currentTheme = getStoredTheme();
    applyTheme(currentTheme);
    updateButtonStates(currentTheme === 'dark');

    // اتصال همه دکمه‌های dark/light
    bindThemeActions(document);

    // اتصال دکمه‌های scroll-to-top
    bindScrollTopBtns();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Export برای استفاده اختیاری از خارج
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
