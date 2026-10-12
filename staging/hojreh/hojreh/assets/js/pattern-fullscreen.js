/* ==========================================================================
   PATTERN FULLSCREEN — دکمه تمام‌صفحه برای آکاردئون «الگوهای قیمت‌گذاری»
   فایل مستقل و خوداتکا (IIFE). فقط .accordion-item[data-type="pattern"]
   داخل #pricingPatternsList را تحت تأثیر قرار می‌دهد.
   هیچ منطقی از settings-panel.js / pricing-patterns.js تغییر نمی‌کند؛
   این فایل فقط با event delegation و MutationObserver کار می‌کند.
   ========================================================================== */
(function () {
  'use strict';

  const list = document.getElementById('pricingPatternsList');
  if (!list) return;

  /* ─── مارک‌آپ دکمه فول‌اسکرین ───────────────────────────────────────── */
  function fullscreenButtonMarkup() {
    return `
      <button class="acc-fullscreen-btn" type="button" aria-label="نمایش تمام‌صفحه الگو" title="نمایش تمام‌صفحه">
        <span class="fs-icon fs-icon-expand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 4H5a1 1 0 0 0-1 1v4"/>
            <path d="M15 4h4a1 1 0 0 1 1 1v4"/>
            <path d="M9 20H5a1 1 0 0 1-1-1v-4"/>
            <path d="M15 20h4a1 1 0 0 0 1-1v-4"/>
          </svg>
        </span>
        <span class="fs-icon fs-icon-collapse">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 9h4a1 1 0 0 0 1-1V4"/>
            <path d="M20 9h-4a1 1 0 0 1-1-1V4"/>
            <path d="M4 15h4a1 1 0 0 1 1 1v4"/>
            <path d="M20 15h-4a1 1 0 0 0-1 1v4"/>
          </svg>
        </span>
      </button>
    `;
  }

  /* ─── گام ۱: آپگرید مارک‌آپ یک آیتم پترن ────────────────────────────── */
  function upgradePatternAccordion(item) {
    if (!item || item.dataset.fsReady === 'true') return;
    if (item.querySelector(':scope > .accordion-header > .acc-left-actions > .acc-toggle-group')) {
      /* مارک‌آپ از قبل (مثلاً به‌صورت استاتیک) به ساختار جدید تبدیل شده */
      item.dataset.fsReady = 'true';
      return;
    }
    const toggleBtn = item.querySelector(':scope > .accordion-header > .acc-left-actions > .acc-toggle-btn');
    if (!toggleBtn) return;

    const group = document.createElement('div');
    group.className = 'acc-toggle-group';

    /* ترتیب DOM مهم است: در RTL اولین فرزندِ فلکس در لبه‌ی راستِ گروه
       می‌نشیند و آخرین فرزند در لبه‌ی چپ. toggleBtn (شورون) باید همیشه
       ثابت روی لبه‌ی چپ بماند، پس باید آخرین فرزند باشد؛ دکمه‌ی فول‌اسکرین
       (که عرضش بین 0 و 56px انیمیشن می‌شود، بدون هیچ همپوشانی چون
       flex-item مجزاست) باید اول اضافه شود. */
    toggleBtn.parentNode.insertBefore(group, toggleBtn);
    group.insertAdjacentHTML('beforeend', fullscreenButtonMarkup());
    group.appendChild(toggleBtn);

    item.dataset.fsReady = 'true';
  }

  function upgradeAllPatternAccordions() {
    list.querySelectorAll(':scope > .accordion-item[data-type="pattern"]').forEach(upgradePatternAccordion);
  }

  /* اجرای اولیه روی آیتم‌های موجود */
  upgradeAllPatternAccordions();

  /* آپگرید خودکار آیتم‌های پترن جدیدی که بعداً اضافه می‌شوند
     (همان الگوی استفاده‌شده در settings-panel.html برای api-price-source-select) */
  const patternUpgradeObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        if (node.matches && node.matches('.accordion-item[data-type="pattern"]')) {
          upgradePatternAccordion(node);
        }
        if (node.querySelectorAll) {
          node.querySelectorAll('.accordion-item[data-type="pattern"]').forEach(upgradePatternAccordion);
        }
      });
    });
  });
  patternUpgradeObserver.observe(list, { childList: true, subtree: true });

  /* ─── حالت reduced motion ───────────────────────────────────────────── */
  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  /* ─── گام ۳: ورود به حالت تمام‌صفحه (FLIP دستی) ─────────────────────── */
  function enterFullscreen(item) {
    if (item.classList.contains('pattern-fullscreen') || item.classList.contains('pattern-fullscreen-animating')) return;

    /* اگر آیتم پترن دیگری همین الان تمام‌صفحه است، فوری (بدون انیمیشن) ببندش */
    const other = document.querySelector('.accordion-item.pattern-fullscreen');
    if (other && other !== item) exitFullscreenInstant(other);

    const reduceMotion = prefersReducedMotion();
    const rect = item.getBoundingClientRect();

    /* جای‌خالی در لیست تا با خروج آیتم از فلوی عادی (position:fixed)، لیست جمع نشود */
    const placeholder = document.createElement('div');
    placeholder.className = 'pattern-fullscreen-placeholder';
    placeholder.style.height = rect.height + 'px';
    const cs = getComputedStyle(item);
    placeholder.style.marginBottom = cs.marginBottom;
    item.parentNode.insertBefore(placeholder, item);
    item._flipPlaceholder = placeholder;

    document.body.classList.add('hojreh-fs-lock');

    if (reduceMotion) {
      item.classList.add('pattern-fullscreen');
      return;
    }

    /* فریز موقعیت/اندازه فعلی به‌صورت inline (نقطه شروع FLIP)
       نکته‌ی مهم (صفحه RTL است: <html dir="rtl">): کلاس .pattern-fullscreen
       از شورت‌هند inset:0 استفاده می‌کند که right و bottom را هم ست می‌کند.
       اگر همزمان left/width/height به‌صورت inline ست شده باشند ولی right
       ست نشده باشد، مرورگر در جعبه‌ی over-constrained طبق اسپک CSS، در
       حالت direction:rtl مقدار left را نادیده می‌گیرد و از right (که صفر
       است) استفاده می‌کند؛ نتیجه‌اش دقیقاً همان «کج‌شدن/چسبیدن به راست حین
       اسکیل» است که گزارش شده. برای رفع قطعی، right/bottom را هم صراحتاً
       inline ست می‌کنیم تا هیچ ابهامی برای مرورگر نماند. */
    item.style.position = 'fixed';
    item.style.top = rect.top + 'px';
    item.style.left = rect.left + 'px';
    item.style.right = 'auto';
    item.style.bottom = 'auto';
    item.style.width = rect.width + 'px';
    item.style.height = rect.height + 'px';
    item.style.margin = '0';

    void item.offsetWidth; // اجبار به reflow قبل از افزودن کلاس transition

    item.classList.add('pattern-fullscreen', 'pattern-fullscreen-animating');

    requestAnimationFrame(() => {
      item.style.top = '0px';
      item.style.left = '0px';
      item.style.right = 'auto';
      item.style.bottom = 'auto';
      item.style.width = window.innerWidth + 'px';
      item.style.height = window.innerHeight + 'px';
    });

    const cleanup = (e) => {
      if (e && e.propertyName && e.propertyName !== 'width' && e.propertyName !== 'height') return;
      item.removeEventListener('transitionend', cleanup);
      item.classList.remove('pattern-fullscreen-animating');
      ['position', 'top', 'left', 'right', 'bottom', 'width', 'height', 'margin', 'zIndex'].forEach(p => { item.style[p] = ''; });
    };
    item.addEventListener('transitionend', cleanup);
    setTimeout(() => cleanup(null), 600); // fallback ایمنی اگر transitionend شلیک نشد
  }

  /* ─── گام ۴: خروج از حالت تمام‌صفحه ──────────────────────────────────── */
  function exitFullscreen(item) {
    if (!item.classList.contains('pattern-fullscreen') || item.classList.contains('pattern-fullscreen-animating')) return;

    const reduceMotion = prefersReducedMotion();
    const placeholder = item._flipPlaceholder;

    const finish = () => {
      if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
      item._flipPlaceholder = null;
      document.body.classList.remove('hojreh-fs-lock');
    };

    if (reduceMotion) {
      item.classList.remove('pattern-fullscreen');
      finish();
      return;
    }

    const startRect = item.getBoundingClientRect(); // فعلاً تمام‌صفحه
    const endRect = placeholder ? placeholder.getBoundingClientRect() : startRect;

    item.style.position = 'fixed';
    item.style.top = startRect.top + 'px';
    item.style.left = startRect.left + 'px';
    item.style.right = 'auto'; /* رفع باگ کج‌شدن به راست در RTL — نگاه کنید به توضیح در enterFullscreen */
    item.style.bottom = 'auto';
    item.style.width = startRect.width + 'px';
    item.style.height = startRect.height + 'px';
    item.style.margin = '0';

    void item.offsetWidth;

    item.classList.remove('pattern-fullscreen');
    item.classList.add('pattern-fullscreen-animating');

    requestAnimationFrame(() => {
      item.style.top = endRect.top + 'px';
      item.style.left = endRect.left + 'px';
      item.style.right = 'auto';
      item.style.bottom = 'auto';
      item.style.width = endRect.width + 'px';
      item.style.height = endRect.height + 'px';
    });

    const cleanup = (e) => {
      if (e && e.propertyName && e.propertyName !== 'width' && e.propertyName !== 'height') return;
      item.removeEventListener('transitionend', cleanup);
      item.classList.remove('pattern-fullscreen-animating');
      ['position', 'top', 'left', 'right', 'bottom', 'width', 'height', 'margin', 'zIndex'].forEach(p => { item.style[p] = ''; });
      finish();
    };
    item.addEventListener('transitionend', cleanup);
    setTimeout(() => cleanup(null), 600);
  }

  /* نسخه فوری بدون انیمیشن، برای بستن اضطراری یک آیتم دیگر */
  function exitFullscreenInstant(item) {
    item.classList.remove('pattern-fullscreen', 'pattern-fullscreen-animating');
    ['position', 'top', 'left', 'right', 'bottom', 'width', 'height', 'margin', 'zIndex'].forEach(p => { item.style[p] = ''; });
    if (item._flipPlaceholder && item._flipPlaceholder.parentNode) {
      item._flipPlaceholder.parentNode.removeChild(item._flipPlaceholder);
    }
    item._flipPlaceholder = null;
    document.body.classList.remove('hojreh-fs-lock');
  }

  /* ─── گام ۲: کلیک روی دکمه فول‌اسکرین، جدا از کلیک روی هدر ──────────── */
  list.addEventListener('click', function (e) {
    const fsBtn = e.target.closest('.acc-fullscreen-btn');
    if (!fsBtn) return;
    e.stopPropagation(); // نگذار این کلیک به هندلر باز/بسته‌کردن هدر هم برسد
    e.preventDefault();
    const item = fsBtn.closest('.accordion-item[data-type="pattern"]');
    if (!item) return;
    if (item.classList.contains('pattern-fullscreen')) {
      exitFullscreen(item);
    } else {
      enterFullscreen(item);
    }
  });

  /* ─── گام ۵: کلید Escape برای خروج از تمام‌صفحه ──────────────────────── */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    const active = document.querySelector('.accordion-item.pattern-fullscreen:not(.pattern-fullscreen-animating)');
    if (active) exitFullscreen(active);
  });

  /* ─── گام ۶: جلوگیری از باز/بسته‌شدن آکاردئون با کلیک روی هدر در حالت تمام‌صفحه ─── */
  document.addEventListener('click', function (e) {
    const header = e.target.closest('.accordion-header');
    if (!header) return;
    const item = header.closest('.accordion-item.pattern-fullscreen');
    if (!item) return;
    if (e.target.closest('.acc-fullscreen-btn')) return; // این خودش جدا مدیریت می‌شود
    e.stopImmediatePropagation();
  }, true); // capture: قبل از هندلر toggle موجود اجرا شود
})();
