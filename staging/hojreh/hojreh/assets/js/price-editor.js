import { saveDirty } from './save-dirty.js';
import { show as showToast } from './toast.js';
import { priceEditorSearchAnim } from './price-editor-search-anim.js';
let priceEditor;
(function () {
  'use strict';
  var searchBtn    = document.getElementById('priceSearchBtn');
  var mainHeader   = document.getElementById('mainHeader');
  var searchInput  = document.getElementById('pricingSearchInput');
  var searchClose  = document.getElementById('headerSearchClose');
  var emptyState   = document.getElementById('pricingSearchEmpty');
  var pricingItems = document.querySelectorAll('.pricing-item[data-item-id]');
  var cardTitle    = document.querySelector('.pricing-card-title');
  var cardSubtitle = document.querySelector('.pricing-card-subtitle');
  var originalTitle    = cardTitle    ? cardTitle.textContent    : '';
  var originalSubtitle = cardSubtitle ? cardSubtitle.textContent : '';
  var SEARCH_SUBTITLE = 'برای خروج از حالت جستجو، آیکون × را که در سمت چپ هدر قرار دارد، بزنید.';
  function openSearch() {
    if (searchBtn) {
      searchBtn.classList.add('search-active');
      searchBtn.setAttribute('aria-label', 'بستن جستجو');
      searchBtn.setAttribute('title', 'بستن جستجو');
    }
    priceEditorSearchAnim.open();
  }
  function closeSearch() {
    if (searchBtn) {
      searchBtn.classList.remove('search-active');
      searchBtn.setAttribute('aria-label', 'جستجوی محصول');
      searchBtn.setAttribute('title', 'جستجوی محصول');
    }
    var doReset = function () {
      if (searchInput) searchInput.value = '';
      showAllItems();
      if (cardTitle)    cardTitle.textContent    = originalTitle;
      if (cardSubtitle) cardSubtitle.textContent = originalSubtitle;
    };
    priceEditorSearchAnim.close(doReset);
  }
  function showAllItems() {
    pricingItems.forEach(function (item) {
      item.hidden = false;
    });
    if (emptyState) emptyState.hidden = true;
  }
  function filterItems(rawQuery) {
    var query = rawQuery.trim();
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
        item.hidden = false;
        return;
      }
      var productName = nameEl.textContent.trim();
      var matched = productName.indexOf(query) !== -1 ||
                    productName.toLowerCase().indexOf(query.toLowerCase()) !== -1;
      item.hidden = !matched;
      if (matched) hasResults = true;
    });
    if (hasResults) {
      if (cardTitle)    cardTitle.textContent    = 'جستجو برای عبارت ' + query;
      if (cardSubtitle) cardSubtitle.textContent = SEARCH_SUBTITLE;
    } else {
      if (cardTitle)    cardTitle.textContent    = '';
      if (cardSubtitle) cardSubtitle.textContent = '';
    }
    if (emptyState) {
      var inSearchMode = mainHeader && mainHeader.classList.contains('search-mode');
      emptyState.hidden = hasResults || !inSearchMode;
    }
  }
  if (searchBtn) {
    searchBtn.addEventListener('click', function () {
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
    searchInput.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeSearch();
      }
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mainHeader && mainHeader.classList.contains('search-mode')) {
      closeSearch();
    }
  });
})();
(function () {
  'use strict';
  function snapshotValue(input) {
    return input ? (input.value || '') : '';
  }
  function initPriceDirtyTracking() {
    document.querySelectorAll('.price-input[id]').forEach(function (input) {
      if (input.dataset.hojrehDirtyReady === 'true') return;
      input.dataset.hojrehDirtyReady = 'true';
      input.dataset.hojrehOriginalValue = snapshotValue(input);
    });
  }
  function markPriceDirty(input) {
    if (!input || input.dataset.hojrehDirtyReady !== 'true') return;
    var changed = snapshotValue(input) !== input.dataset.hojrehOriginalValue;
    input.classList.toggle('hojreh-dirty-field', changed);
    refreshSaveDot();
  }
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
  function commitPriceDirtyTracking() {
    document.querySelectorAll('.price-input[data-hojreh-dirty-ready="true"]').forEach(function (input) {
      input.dataset.hojrehOriginalValue = snapshotValue(input);
      input.classList.remove('hojreh-dirty-field');
    });
  }
  var _priceUnsavedState = { value: false };
  function refreshSaveDot() {
    var hasDirty = !!document.querySelector('.price-input.hojreh-dirty-field');
    saveDirty.refreshDot('savePricesBtn', hasDirty, _priceUnsavedState);
  }
  function injectSaveDot() {
    saveDirty.injectDot('savePricesBtn');
  }
  function initSaveBtn() {
    var btn = document.getElementById('savePricesBtn');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var payload = getDirtyPricesPayload();
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
  document.addEventListener('input', function (e) {
    if (e.target.classList.contains('price-input')) {
      markPriceDirty(e.target);
    }
  });
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
  priceEditor = {
    getDirtyPricesPayload: getDirtyPricesPayload,
    commitPriceDirtyTracking: commitPriceDirtyTracking,
    initPriceDirtyTracking: initPriceDirtyTracking
  };
})();
export { priceEditor };