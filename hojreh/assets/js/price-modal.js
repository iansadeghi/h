import { priceChart } from './price-chart.js';

let priceModal;

/**
 * ═══════════════════════════════════════════════════════════════
 * Hojreh Price Modal
 * فایل: assets/js/price-modal.js
 *
 * این فایل:
 *  ۱) داخل هر «.tip-content» در صفحه، متن پرانتزی را (مثل «(24 ساعت قبل)»)
 *     پیدا کرده و آن را در یک <span class="price-paren-trigger"> قابل‌کلیک
 *     می‌پیچد (خط‌چین زیر آن از price-modal.css می‌آید).
 *  ۲) با کلیک روی آن، یک مودال مشترک باز می‌شود که نمودار قیمت
 *     (HojrehPriceChart) را با افکت ورود از پایین نشان می‌دهد.
 *  ۳) مودال یک اسپینر لودینگ دارد که تا زمان آمادگی داده نمایش
 *     داده می‌شود — تا بعداً به بک‌اند واقعی وصل شود کافیست
 *     PriceChart با گزینه fetchData ساخته شود (نگاه کنید به
 *     assets/js/price-chart.js برای قرارداد داده).
 *
 * این ماژول کاملاً مستقل از api-modal.js است.
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  var MODAL_ID = 'hojrehPriceModal';
  var activeChart = null;
  var lastFocusedTrigger = null;
  var currentRangeLabel = '';

  /* ─────────────────────────────────────────────────────────────
     باکس درصد تغییرات (در هدر مودال، کنار دکمه بستن)
     ───────────────────────────────────────────────────────────── */

  function getChangeBoxEls(overlay) {
    return {
      box: overlay.querySelector('#priceModalChangeBox'),
      slide: overlay.querySelector('#priceModalChangeSlide'),
      tooltip: overlay.querySelector('#priceModalChangeTooltip')
    };
  }

  /* به‌روزرسانی محتوای باکس تغییرات + رنگ/جهت آن. این تابع همیشه وقتی
     صدا زده می‌شود که باکس در حالت اسکلتن (is-loading) است — چون
     onChangeUpdate از داخل _render نمودار، قبل از پایان لود، فایر
     می‌شود. پس فقط کافیست محتوا را بنویسیم؛ نمایش/افکت ورود را
     setChangeBoxLoading(false)/revealChangeBox به‌عهده دارند. */
  function updateChangeBox(overlay, changeData) {
    var els = getChangeBoxEls(overlay);
    if (!els.box) return;

    els.box.classList.remove('is-up', 'is-down', 'is-flat');
    els.box.classList.add('is-' + changeData.direction);
    els.box.dataset.percent = changeData.percent;
    els.box.dataset.direction = changeData.direction;

    els.slide.innerHTML = changeData.html;
    updateChangeTooltip(overlay);
  }

  /* تولتیپ هاور باکس تغییرات: «تغییرات هفتگی/روزانه/ماهانه» */
  function updateChangeTooltip(overlay) {
    var els = getChangeBoxEls(overlay);
    if (!els.tooltip) return;
    els.tooltip.textContent = 'تغییرات ' + (currentRangeLabel || '');
  }

  /* پایان حالت اسکلتن — چه برای اولین نمایش، چه بعد از تغییر بازه:
     حالت لودینگ حذف و افکت ورود اسلایدی (از شکاف کنار دکمه بستن)
     روی محتوای تازه اجرا می‌شود. */
  function revealChangeBox(overlay) {
    var els = getChangeBoxEls(overlay);
    if (!els.box) return;
    els.box.classList.remove('is-loading');
    els.box.classList.add('is-revealed');
  }

  /* حین تغییر بازه زمانی: باکس کامل برود روی اسکلتن (پوشاندن کامل رنگ
     پس‌زمینه قبلی) تا داده جدید بیاید؛ با پایان لود، revealChangeBox
     افکت ورود را اجرا می‌کند. */
  function setChangeBoxLoading(overlay, isLoading) {
    var els = getChangeBoxEls(overlay);
    if (!els.box) return;
    if (isLoading) {
      els.box.classList.add('is-loading');
    } else {
      revealChangeBox(overlay);
    }
  }

  /* ─────────────────────────────────────────────────────────────
     ساخت اسکلت مودال (یک‌بار، تزریق در body)
     ───────────────────────────────────────────────────────────── */

  function buildModalSkeleton() {
    var existing = document.getElementById(MODAL_ID);
    if (existing) return existing;

    var overlay = document.createElement('div');
    overlay.className = 'price-modal-overlay';
    overlay.id = MODAL_ID;
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-hidden', 'true');

    overlay.innerHTML =
      '<div class="price-modal-content" role="document">' +
        '<div class="price-modal-header">' +
          '<div class="price-modal-title-wrap">' +
            '<span class="price-modal-title" id="priceModalTitle">روند تغییرات قیمت</span>' +
          '</div>' +
          '<div class="price-modal-header-actions">' +
            '<div class="price-modal-change-box is-loading" id="priceModalChangeBox" tabindex="0">' +
              '<span class="price-modal-change-skeleton"></span>' +
              '<span class="price-modal-change-slit">' +
                '<span class="price-modal-change-slide" id="priceModalChangeSlide"></span>' +
              '</span>' +
              '<span class="price-modal-change-tooltip" id="priceModalChangeTooltip"></span>' +
            '</div>' +
            '<button type="button" class="price-modal-close" aria-label="بستن">' +
              '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
                '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' +
              '</svg>' +
            '</button>' +
          '</div>' +
        '</div>' +
        '<div class="price-modal-body" id="priceModalBody">' +
          '<div class="price-modal-spinner-wrap">' +
            '<div class="price-modal-spinner"></div>' +
            '<span class="price-modal-spinner-text">در حال دریافت اطلاعات قیمت...</span>' +
          '</div>' +
          '<div class="price-modal-chart-host" id="priceModalChartHost"></div>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    return overlay;
  }

  /* ─────────────────────────────────────────────────────────────
     OPEN / CLOSE
     ───────────────────────────────────────────────────────────── */

  function openModal(config) {
    var overlay = buildModalSkeleton();
    var titleEl = overlay.querySelector('#priceModalTitle');
    var bodyEl = overlay.querySelector('#priceModalBody');
    var chartHost = overlay.querySelector('#priceModalChartHost');
    var changeEls = getChangeBoxEls(overlay);

    titleEl.textContent = config.title || 'روند تغییرات قیمت';

    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('price-modal-open');
    document.body.style.overflow = 'hidden';

    /* اگر همین الان (همین tick) کلاس is-active اضافه شود، ممکن است مرورگر
       فرصت نکند حالت اولیه (opacity:0 / transform بسته) را پینت کند و
       ترنزیشن را کامل نادیده بگیرد (مخصوصاً بار اول که overlay تازه به
       body اضافه شده). با یک force reflow + دو requestAnimationFrame
       تودرتو، مطمئن می‌شویم حالت بسته حتماً یک فریم پینت شده و بعد
       ترنزیشن به سمت is-active اجرا می‌شود — هم بار اول هم بارهای بعدی. */
    void overlay.offsetHeight;
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        overlay.classList.add('is-active');
      });
    });

    /* پاک‌سازی نمودار قبلی در صورت وجود */
    if (activeChart && typeof activeChart.destroy === 'function') {
      activeChart.destroy();
      activeChart = null;
    }
    chartHost.innerHTML = '';
    bodyEl.classList.add('is-loading');

    /* ریست کامل باکس تغییرات برای باز شدن جدید مودال */
    currentRangeLabel = '';
    changeEls.box.classList.remove('is-revealed', 'is-up', 'is-down', 'is-flat');
    changeEls.box.classList.add('is-loading');
    changeEls.slide.innerHTML = '';
    changeEls.slide.className = 'price-modal-change-slide';
    changeEls.slide.id = 'priceModalChangeSlide';

    activeChart = priceChart.create(chartHost, {
      itemId: config.itemId || '',
      itemLabel: config.itemLabel || '',
      defaultRange: config.defaultRange || 'weekly',
      ranges: config.ranges || ['daily', 'weekly', 'monthly'],
      fetchData: config.fetchData || null,
      onChangeUpdate: function (changeData) { updateChangeBox(overlay, changeData); },
      onRangeLabelChange: function (label) { currentRangeLabel = label; updateChangeTooltip(overlay); },
      onSwitchStart: function () { setChangeBoxLoading(overlay, true); },
      onSwitchEnd: function () { setChangeBoxLoading(overlay, false); }
    });

    activeChart.load().then(function () {
      bodyEl.classList.remove('is-loading');
      setChangeBoxLoading(overlay, false);
    });

    bindCloseHandlers(overlay);
  }

  function closeModal() {
    var overlay = document.getElementById(MODAL_ID);
    if (!overlay || !overlay.classList.contains('is-active')) return;

    overlay.classList.remove('is-active');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('price-modal-open');
    document.body.style.overflow = '';

    if (lastFocusedTrigger && typeof lastFocusedTrigger.focus === 'function') {
      lastFocusedTrigger.focus();
    }

    /* بعد از پایان انیمیشن، نمودار را تخریب کن تا event listenerها جمع شوند */
    setTimeout(function () {
      if (!overlay.classList.contains('is-active') && activeChart) {
        activeChart.destroy();
        activeChart = null;
      }
    }, 320);
  }

  var closeHandlersBound = false;
  function bindCloseHandlers(overlay) {
    if (closeHandlersBound) return;
    closeHandlersBound = true;

    overlay.querySelector('.price-modal-close').addEventListener('click', closeModal);

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) closeModal();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('is-active')) {
        closeModal();
      }
    });
  }

  /* ─────────────────────────────────────────────────────────────
     پیچیدن متن پرانتزی داخل tip-content با span قابل کلیک
     مثال ورودی:  «(24 ساعت قبل)»  →
     <span class="price-paren-trigger" tabindex="0">(24 ساعت قبل)</span>
     ───────────────────────────────────────────────────────────── */

  var PAREN_REGEX = /\(([^()]*)\)/;

  function wrapParenInNode(tipContentEl) {
    if (!tipContentEl || tipContentEl.dataset.priceParenWrapped === 'true') return;

    /* فقط روی فرزندان متنی مستقیم (text node) دنبال پرانتز می‌گردیم
       تا داخل last-price/span دیگر دست نخوریم */
    var childNodes = Array.prototype.slice.call(tipContentEl.childNodes);

    for (var i = 0; i < childNodes.length; i++) {
      var node = childNodes[i];
      if (node.nodeType !== Node.TEXT_NODE) continue;

      var match = PAREN_REGEX.exec(node.textContent);
      if (!match) continue;

      var fullMatch = match[0];
      var startIdx = match.index;
      var before = node.textContent.slice(0, startIdx);
      var after = node.textContent.slice(startIdx + fullMatch.length);

      var trigger = document.createElement('span');
      trigger.className = 'price-paren-trigger';
      trigger.textContent = fullMatch;
      trigger.setAttribute('tabindex', '0');
      trigger.setAttribute('role', 'button');
      trigger.setAttribute('aria-label', 'نمایش نمودار روند قیمت');

      var frag = document.createDocumentFragment();
      if (before) frag.appendChild(document.createTextNode(before));
      frag.appendChild(trigger);
      if (after) frag.appendChild(document.createTextNode(after));

      node.parentNode.replaceChild(frag, node);
      break; /* فقط اولین پرانتز هر تیپ‌کانتنت */
    }

    tipContentEl.dataset.priceParenWrapped = 'true';
  }

  function getItemContextFromTrigger(trigger) {
    var pricingItem = trigger.closest('.pricing-item[data-item-id]');
    var itemId = pricingItem ? pricingItem.dataset.itemId : '';
    var labelNameEl = pricingItem ? pricingItem.querySelector('.label-name') : null;
    var prefixEl = pricingItem ? pricingItem.querySelector('.label-prefix') : null;
    var itemLabel = (labelNameEl ? labelNameEl.textContent.trim() : '') || itemId || 'محصول';
    var fullLabel = ((prefixEl ? prefixEl.textContent.trim() : '') + ' ' + itemLabel).trim();

    return { itemId: itemId, itemLabel: itemLabel, fullLabel: fullLabel };
  }

  function initParenTriggers() {
    document.querySelectorAll('.tip-content').forEach(wrapParenInNode);

    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('.price-paren-trigger');
      if (!trigger) return;
      handleTriggerActivate(trigger);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var trigger = e.target.closest && e.target.closest('.price-paren-trigger');
      if (!trigger) return;
      e.preventDefault();
      handleTriggerActivate(trigger);
    });
  }

  function handleTriggerActivate(trigger) {
    lastFocusedTrigger = trigger;
    var ctx = getItemContextFromTrigger(trigger);

    openModal({
      title: 'روند قیمت ' + ctx.itemLabel,
      itemId: ctx.itemId,
      itemLabel: ctx.itemLabel,
      defaultRange: 'weekly',
      ranges: ['daily', 'weekly', 'monthly']
      /* fetchData: function (itemId, range) { ... }  ← نقطه اتصال بک‌اند آینده */
    });
  }

  /* ─────────────────────────────────────────────────────────────
     BOOT
     ───────────────────────────────────────────────────────────── */

  function boot() {
    initParenTriggers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ─── Public API — برای فراخوانی دستی مودال از بخش‌های دیگر سایت ─── */
  priceModal = {
    open: openModal,
    close: closeModal
  };

})();

export { priceModal };
