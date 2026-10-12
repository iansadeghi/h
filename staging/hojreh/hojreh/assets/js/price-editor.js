import { saveDirty } from './save-dirty.js';
import { show as showToast } from './toast.js';
import { priceEditorSearchAnim } from './price-editor-search-anim.js';

let priceEditor;

/**
 * ═══════════════════════════════════════════════════════════════
 * Hojreh Price Editor — Search System
 * سیستم جستجو برای صفحه ویرایشگر قیمت‌ها
 * جستجو فقط روی نام محصول (.label-name) انجام می‌شود
 * ═══════════════════════════════════════════════════════════════
 */

(function () {
  'use strict';

  /* ─── المان‌های صفحه ─── */
  var searchBtn    = document.getElementById('priceSearchBtn');
  var mainHeader   = document.getElementById('mainHeader');
  var searchInput  = document.getElementById('pricingSearchInput');
  var searchClose  = document.getElementById('headerSearchClose');
  var emptyState   = document.getElementById('pricingSearchEmpty');
  var pricingItems = document.querySelectorAll('.pricing-item[data-item-id]');
  var cardTitle    = document.querySelector('.pricing-card-title');
  var cardSubtitle = document.querySelector('.pricing-card-subtitle');

  /* ─── متن‌های اصلی هدر کارت (برای بازگردانی پس از جستجو) ─── */
  var originalTitle    = cardTitle    ? cardTitle.textContent    : '';
  var originalSubtitle = cardSubtitle ? cardSubtitle.textContent : '';

  /* متن راهنمای خروج از جستجو */
  var SEARCH_SUBTITLE = 'برای خروج از حالت جستجو، آیکون × را که در سمت چپ هدر قرار دارد، بزنید.';

  /* ═══════════════════════════════════════════════════════════════
     OPEN / CLOSE SEARCH MODE
     باز و بسته کردن حالت جستجو در هدر
     ═══════════════════════════════════════════════════════════════ */

  function openSearch() {
    /* تبدیل آیکون دکمه footer به X */
    if (searchBtn) {
      searchBtn.classList.add('search-active');
      searchBtn.setAttribute('aria-label', 'بستن جستجو');
      searchBtn.setAttribute('title', 'بستن جستجو');
    }

    priceEditorSearchAnim.open();
  }

  function closeSearch() {
    /* بازگردانی آیکون دکمه footer به ذره‌بین */
    if (searchBtn) {
      searchBtn.classList.remove('search-active');
      searchBtn.setAttribute('aria-label', 'جستجوی محصول');
      searchBtn.setAttribute('title', 'جستجوی محصول');
    }

    var doReset = function () {
      if (searchInput) searchInput.value = '';
      showAllItems();
      /* بازگردانی متن‌های اصلی هدر کارت */
      if (cardTitle)    cardTitle.textContent    = originalTitle;
      if (cardSubtitle) cardSubtitle.textContent = originalSubtitle;
    };

    priceEditorSearchAnim.close(doReset);
  }

  /* ═══════════════════════════════════════════════════════════════
     SHOW / HIDE ITEMS
     نمایش همه آیتم‌ها یا فیلتر بر اساس جستجو
     ═══════════════════════════════════════════════════════════════ */

  function showAllItems() {
    pricingItems.forEach(function (item) {
      item.hidden = false;
    });
    if (emptyState) emptyState.hidden = true;
  }

  function filterItems(rawQuery) {
    var query = rawQuery.trim();

    /* اگر جستجو خالی بود، همه رو نشون بده و متن‌های اصلی رو برگردون */
    if (!query) {
      showAllItems();
      if (cardTitle)    cardTitle.textContent    = originalTitle;
      if (cardSubtitle) cardSubtitle.textContent = originalSubtitle;
      return;
    }

    var hasResults = false;

    pricingItems.forEach(function (item) {
      var nameEl = item.querySelector('.label-name');
      if (!nameEl) {
        /* اگر المان name پیدا نشد، آیتم همیشه نمایش داده می‌شود */
        item.hidden = false;
        return;
      }

      var productName = nameEl.textContent.trim();
      /* مقایسه بدون حساسیت به حروف — Persian text case-insensitive */
      var matched = productName.indexOf(query) !== -1 ||
                    productName.toLowerCase().indexOf(query.toLowerCase()) !== -1;

      item.hidden = !matched;
      if (matched) hasResults = true;
    });

    /* به‌روزرسانی هدر کارت بر اساس نتیجه جستجو */
    if (hasResults) {
      /* حالت سرچ با نتیجه: عنوان جستجو و راهنمای خروج */
      if (cardTitle)    cardTitle.textContent    = 'جستجو برای عبارت ' + query;
      if (cardSubtitle) cardSubtitle.textContent = SEARCH_SUBTITLE;
    } else {
      /* حالت emptystate: متن خالی می‌شود اما ارتفاع المان باقی می‌ماند */
      if (cardTitle)    cardTitle.textContent    = '';
      if (cardSubtitle) cardSubtitle.textContent = '';
    }

    /* نمایش یا پنهان کردن empty state —
       فقط در حالت سرچ و زمانی که نتیجه‌ای وجود ندارد */
    if (emptyState) {
      var inSearchMode = mainHeader && mainHeader.classList.contains('search-mode');
      emptyState.hidden = hasResults || !inSearchMode;
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     EVENT LISTENERS
     ═══════════════════════════════════════════════════════════════ */

  if (searchBtn) {
    searchBtn.addEventListener('click', function () {
      /* اگر جستجو باز است (دکمه حالت X دارد) → ببند، وگرنه → باز کن */
      if (searchBtn.classList.contains('search-active')) {
        closeSearch();
      } else {
        openSearch();
      }
    });
  }

  if (searchClose) {
    searchClose.addEventListener('click', closeSearch);
  }

  if (searchInput) {
    searchInput.addEventListener('input', function () {
      filterItems(this.value);
    });

    /* پاک کردن با Escape */
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeSearch();
      }
    });
  }

  /* بستن جستجو با کلید Escape در هر جایی از صفحه */
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mainHeader && mainHeader.classList.contains('search-mode')) {
      closeSearch();
    }
  });

})();


/* ═══════════════════════════════════════════════════════════════
   PRICE EDITOR — DIRTY TRACKING & SAFE PATCH SAVE
   ردیابی تغییرات و ذخیره‌سازی امن (فقط مقادیر تغییر‌یافته)

   چرا این کد در فرانت‌اند لازم است:
   بک‌اند نمی‌تواند تشخیص دهد که کدام فیلدها در این سشن واقعاً
   تغییر کرده‌اند. اگر همه مقادیر ارسال شوند، یک ادمین با سشن
   قدیمی می‌تواند بدون قصد مقادیر جدیدتری که توسط ادمین دیگری
   ثبت شده را بازنویسی کند. بنابراین فرانت‌اند باید snapshot
   اولیه را نگه دارد و فقط diff را به بک‌اند ارسال کند.
   ═══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ─── helpers ─── */
  function snapshotValue(input) {
    return input ? (input.value || '') : '';
  }

  /* ─── Initialise snapshot on all price inputs ─── */
  function initPriceDirtyTracking() {
    document.querySelectorAll('.price-input[id]').forEach(function (input) {
      if (input.dataset.hojrehDirtyReady === 'true') return;
      input.dataset.hojrehDirtyReady = 'true';
      input.dataset.hojrehOriginalValue = snapshotValue(input);
    });
  }

  /* ─── Mark a single input dirty/clean ─── */
  function markPriceDirty(input) {
    if (!input || input.dataset.hojrehDirtyReady !== 'true') return;
    var changed = snapshotValue(input) !== input.dataset.hojrehOriginalValue;
    input.classList.toggle('hojreh-dirty-field', changed);
    refreshSaveDot();
  }

  /* ─── Build patch payload — only changed fields ─── */
  function getDirtyPricesPayload() {
    var changes = [];
    document.querySelectorAll('.price-input[data-hojreh-dirty-ready="true"]').forEach(function (input) {
      var current = snapshotValue(input);
      var original = input.dataset.hojrehOriginalValue;
      if (current !== original) {
        var item = input.closest('.pricing-item[data-item-id]');
        changes.push({
          item_id: item ? item.dataset.itemId : (input.id || ''),
          input_id: input.id || '',
          old_value: original,
          new_value: current
        });
      }
    });
    return {
      save_mode: 'patch_changed_fields_only',
      changes: changes
    };
  }

  /* ─── Commit: update snapshots and clear dirty state ─── */
  function commitPriceDirtyTracking() {
    document.querySelectorAll('.price-input[data-hojreh-dirty-ready="true"]').forEach(function (input) {
      input.dataset.hojrehOriginalValue = snapshotValue(input);
      input.classList.remove('hojreh-dirty-field');
    });
  }

  /* ─── Unsaved-changes dot on save button (via shared HojrehSaveDirty) ─── */
  var _priceUnsavedState = { value: false };

  function refreshSaveDot() {
    var hasDirty = !!document.querySelector('.price-input.hojreh-dirty-field');
    saveDirty.refreshDot('savePricesBtn', hasDirty, _priceUnsavedState);
  }

  function injectSaveDot() {
    saveDirty.injectDot('savePricesBtn');
  }

  /* ─── Save button handler ─── */
  function initSaveBtn() {
    var btn = document.getElementById('savePricesBtn');
    if (!btn) return;

    btn.addEventListener('click', function () {
      var payload = getDirtyPricesPayload();

      // در اتصال بک‌اند، فقط payload.changes ارسال می‌شود
      // تا مقادیر قدیمی سشن روی داده‌های جدیدتر overwrite نکند.
      window.dispatchEvent(new CustomEvent('hojreh:prices-save-payload', { detail: payload }));

      commitPriceDirtyTracking();
      refreshSaveDot();

      if (payload.changes.length) {
        showToast(payload.changes.length + ' قیمت برای ذخیره‌سازی آماده شد.', 'green');
      } else {
        showToast('تغییری برای ذخیره‌سازی وجود ندارد.', 'yellow');
      }
    });
  }

  /* ─── Listen for input events on price fields ─── */
  document.addEventListener('input', function (e) {
    if (e.target.classList.contains('price-input')) {
      markPriceDirty(e.target);
    }
  });

  /* ─── Boot ─── */
  function boot() {
    initPriceDirtyTracking();
    injectSaveDot();
    initSaveBtn();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* ─── Public API ─── */
  priceEditor = {
    getDirtyPricesPayload: getDirtyPricesPayload,
    commitPriceDirtyTracking: commitPriceDirtyTracking,
    initPriceDirtyTracking: initPriceDirtyTracking
  };

})();

export { priceEditor };
