let priceEditorSearchAnim;

/**
 * ═══════════════════════════════════════════════════════════════
 * Price Editor — Header Search Transition Animation
 * ماژول انیمیشن تبدیل هدر به جستجو
 *
 * استراتژی CSS:
 *   - .header-search-box روی position:absolute است → خارج از flex flow
 *   - در حالت عادی opacity:0 / pointer-events:none → layout هدر سالم است
 *   - کلاس‌های search-entering / search-mode / search-closing /
 *     search-closing-end مراحل انیمیشن را کنترل می‌کنند
 *
 * این ماژول فقط منطق زمان‌بندی را مدیریت می‌کند.
 * منطق فیلتر جستجو در price-editor.js باقی می‌ماند.
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  /* ─── تنظیمات زمان‌بندی ─── */
  var SLIDE_OUT_DURATION = 260;  /* ms — مدت فید-اوت المان‌های هدر */
  var SLIDE_IN_DURATION  = 320;  /* ms — مدت فید-این جعبه جستجو */
  var FOCUS_DELAY        = 320;  /* ms — تأخیر فوکوس */

  /* ─── المان‌های صفحه ─── */
  var mainHeader  = document.getElementById('mainHeader');
  var searchInput = document.getElementById('pricingSearchInput');

  if (!mainHeader) return;

  /* ═══════════════════════════════════════════════════════════════
     OPEN: المان‌های هدر خارج می‌شوند → جعبه جستجو وارد می‌شود
     ═══════════════════════════════════════════════════════════════ */

  function animateOpen() {
    /* جلوگیری از تداخل */
    if (mainHeader.classList.contains('search-mode') ||
        mainHeader.classList.contains('search-entering')) return;

    /* مرحله ۱: شروع اسلاید-اوت المان‌های هدر */
    mainHeader.classList.add('search-entering');

    /* مرحله ۲: بعد از پایان فید-اوت، جعبه جستجو را فعال کن */
    setTimeout(function () {
      mainHeader.classList.remove('search-entering');
      mainHeader.classList.add('search-mode');

      /* مرحله ۳: یک فریم صبر تا مرورگر حالت اولیه جعبه جستجو را رندر کند،
         سپس transition شروع می‌شود (opacity:0 → 1, translateX(-28px) → 0) */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          /* CSS transition خودکار اجرا می‌شود — کاری لازم نیست */
        });
      });

      /* فوکوس بعد از پایان انیمیشن ورود */
      setTimeout(function () {
        if (searchInput) searchInput.focus();
      }, FOCUS_DELAY);

    }, SLIDE_OUT_DURATION);
  }

  /* ═══════════════════════════════════════════════════════════════
     CLOSE: جعبه جستجو خارج می‌شود → المان‌های هدر برمی‌گردند
     ═══════════════════════════════════════════════════════════════ */

  function animateClose(onDone) {
    if (!mainHeader.classList.contains('search-mode')) {
      if (typeof onDone === 'function') onDone();
      return;
    }

    /* مرحله ۱: شروع اسلاید-اوت جعبه جستجو + ظهور المان‌های هدر (هنوز شفاف) */
    mainHeader.classList.remove('search-mode');
    mainHeader.classList.add('search-closing');

    /* مرحله ۲: بعد از فید-اوت جعبه جستجو، المان‌ها را به موقعیت اصلی برگردان */
    setTimeout(function () {
      mainHeader.classList.remove('search-closing');
      mainHeader.classList.add('search-closing-end');

      /* یک فریم صبر تا مرورگر موقعیت شروع (translateX + opacity:0) را رندر کند */
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          /* CSS transition خودکار المان‌ها را به translateX(0) / opacity:1 می‌برد */
        });
      });

      /* مرحله ۳: بعد از پایان اسلاید-این، کلاس موقت را پاک کن */
      setTimeout(function () {
        mainHeader.classList.remove('search-closing-end');
        if (typeof onDone === 'function') onDone();
      }, SLIDE_IN_DURATION);

    }, SLIDE_OUT_DURATION);
  }

  /* ═══════════════════════════════════════════════════════════════
     PUBLIC API — expose to price-editor.js
     ═══════════════════════════════════════════════════════════════ */

  priceEditorSearchAnim = {
    open:  animateOpen,
    close: animateClose
  };

})();

export { priceEditorSearchAnim };
