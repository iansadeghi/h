import { show as showToastNotification } from './toast.js';
  'use strict';
  function showToast(message, typeOrDuration) {
    showToastNotification(message, typeof typeOrDuration === 'number' ? 'green' : (typeOrDuration || 'green'), typeof typeOrDuration === 'number' ? typeOrDuration : undefined);
  }
  function createCustomSelect(selectElement) {
    if (selectElement.classList.contains('custom-select-initialized')) {
      return;
    }
    selectElement.classList.add('custom-select-initialized');
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';
    selectElement.parentNode.insertBefore(wrapper, selectElement);
    wrapper.appendChild(selectElement);
    const displayBox = document.createElement('div');
    displayBox.className = 'custom-select-display';
    const displayText = document.createElement('span');
    displayText.className = 'custom-select-text';
    const displayArrow = document.createElement('span');
    displayArrow.className = 'custom-select-arrow';
    displayArrow.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
      </svg>
    `;
    displayBox.appendChild(displayText);
    displayBox.appendChild(displayArrow);
    wrapper.appendChild(displayBox);
    const optionsList = document.createElement('div');
    optionsList.className = 'custom-select-options';
    function updateOptions() {
      optionsList.innerHTML = '';
      const options = selectElement.querySelectorAll('option');
      options.forEach((option, index) => {
        const optionItem = document.createElement('div');
        optionItem.className = 'custom-select-option';
        optionItem.textContent = option.textContent;
        optionItem.dataset.value = option.value;
        optionItem.dataset.index = index;
        if (option.selected) {
          optionItem.classList.add('selected');
          displayText.textContent = option.textContent;
        }
        optionItem.addEventListener('click', function(e) {
          e.stopPropagation();
          selectElement.selectedIndex = index;
          const changeEvent = new Event('change', { bubbles: true });
          selectElement.dispatchEvent(changeEvent);
          wrapper.classList.remove('open');
          updateDisplay();
        });
        optionsList.appendChild(optionItem);
      });
    }
    function updateDisplay() {
      const selectedOption = selectElement.options[selectElement.selectedIndex];
      if (selectedOption) {
        displayText.textContent = selectedOption.textContent;
      }
      optionsList.querySelectorAll('.custom-select-option').forEach((opt, idx) => {
        if (idx === selectElement.selectedIndex) {
          opt.classList.add('selected');
        } else {
          opt.classList.remove('selected');
        }
      });
    }
    wrapper.appendChild(optionsList);
    updateOptions();
    displayBox.addEventListener('click', function(e) {
      e.stopPropagation();
      document.querySelectorAll('.custom-select-wrapper.open').forEach(w => {
        if (w !== wrapper) {
          w.classList.remove('open');
        }
      });
      wrapper.classList.toggle('open');
    });
    document.addEventListener('click', function(e) {
      if (!wrapper.contains(e.target)) {
        wrapper.classList.remove('open');
      }
    });
    selectElement.addEventListener('change', function() {
      updateDisplay();
    });
    const observer = new MutationObserver(function(mutations) {
      updateOptions();
      updateDisplay();
    });
    observer.observe(selectElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['selected']
    });
    selectElement._customSelectWrapper = wrapper;
    selectElement._customSelectUpdate = updateOptions;
  }
  function initCustomSelects(container = document) {
    const selects = container.querySelectorAll('select:not(.custom-select-initialized)');
    selects.forEach(select => {
      if (select.classList.contains('custom-select') || select.hasAttribute('data-custom-select')) {
        createCustomSelect(select);
      }
    });
  }
  function updateCustomSelect(selectElement) {
    if (selectElement._customSelectUpdate) {
      selectElement._customSelectUpdate();
    }
  }
  function createPlaceholder(height) {
    const ph = document.createElement('div');
    ph.className = 'drag-placeholder';
    ph.style.height = height + 'px';
    return ph;
  }
  const unitCatalog = [
    { value: 'عدد', kind: 'count', quantityLabel: 'تعداد' },
    { value: 'بسته', kind: 'count', quantityLabel: 'تعداد' },
    { value: 'جعبه', kind: 'count', quantityLabel: 'تعداد' },
    { value: 'کارتن', kind: 'count', quantityLabel: 'تعداد' },
    { value: 'دست', kind: 'count', quantityLabel: 'تعداد' },
    { value: 'جفت', kind: 'count', quantityLabel: 'تعداد' },
    { value: 'شاخه', kind: 'count', quantityLabel: 'تعداد' },
    { value: 'رول', kind: 'count', quantityLabel: 'تعداد' },
    { value: 'دستگاه', kind: 'count', quantityLabel: 'تعداد' },
    { value: 'قوطی', kind: 'count', quantityLabel: 'تعداد' },
    { value: 'بطری', kind: 'count', quantityLabel: 'تعداد' },
    { value: 'کیسه', kind: 'count', quantityLabel: 'تعداد' },
    { value: 'میلی‌گرم', kind: 'weight', quantityLabel: 'وزن' },
    { value: 'گرم', kind: 'weight', quantityLabel: 'وزن' },
    { value: 'کیلوگرم', kind: 'weight', quantityLabel: 'وزن' },
    { value: 'مثقال', kind: 'weight', quantityLabel: 'وزن' },
    { value: 'انس تروا', kind: 'weight', quantityLabel: 'وزن' },
    { value: 'سوت', kind: 'weight', quantityLabel: 'وزن' },
    { value: 'تن', kind: 'weight', quantityLabel: 'وزن' },
    { value: 'تن متریک', kind: 'weight', quantityLabel: 'وزن' },
    { value: 'میلی‌متر', kind: 'length', quantityLabel: 'طول' },
    { value: 'سانتی‌متر', kind: 'length', quantityLabel: 'طول' },
    { value: 'متر', kind: 'length', quantityLabel: 'طول' },
    { value: 'متر مربع', kind: 'area', quantityLabel: 'مساحت' },
    { value: 'سانتی‌متر مربع', kind: 'area', quantityLabel: 'مساحت' },
    { value: 'میلی‌لیتر', kind: 'volume', quantityLabel: 'حجم' },
    { value: 'لیتر', kind: 'volume', quantityLabel: 'حجم' },
    { value: 'سانتی‌متر مکعب', kind: 'volume', quantityLabel: 'حجم' },
    { value: 'متر مکعب', kind: 'volume', quantityLabel: 'حجم' },
    { value: 'بشکه', kind: 'volume', quantityLabel: 'حجم' },
    { value: 'گالن', kind: 'volume', quantityLabel: 'حجم' },
    { value: 'میلیون بی‌تی‌یو', kind: 'energy', quantityLabel: 'انرژی' }
  ];
  function getUnitMeta(value) {
    const normalized = String(value || '').trim();
    return unitCatalog.find(u => u.value === normalized) || {
      value: normalized || 'عدد',
      kind: 'custom',
      quantityLabel: 'مقدار'
    };
  }
  function normalizeUnitSelect(selectElement) {
    if (!selectElement) return;
    const selectedValue = selectElement.value || selectElement.querySelector('option[selected]')?.value || 'عدد';
    const customCurrent = selectedValue && !unitCatalog.some(u => u.value === selectedValue)
      ? [{ value: selectedValue, kind: 'custom', quantityLabel: 'مقدار' }]
      : [];
    selectElement.innerHTML = '';
    [...unitCatalog, ...customCurrent].forEach(unit => {
      const option = document.createElement('option');
      option.value = unit.value;
      option.textContent = unit.value;
      option.dataset.unitKind = unit.kind;
      option.dataset.quantityLabel = unit.quantityLabel;
      if (unit.value === selectedValue) option.selected = true;
      selectElement.appendChild(option);
    });
  }
  function normalizeUnitSelects(container = document) {
    container.querySelectorAll('select.unit-select').forEach(normalizeUnitSelect);
  }
  function formatNumberWithCommas(num) {
    const safe = Number.isFinite(Number(num)) ? Math.round(Number(num)) : 0;
    return safe.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '،');
  }
  function persianToEnglishDigits(str) {
    return String(str)
      .replace(/[۰-۹]/g, d => d.charCodeAt(0) - 0x06F0)
      .replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x0660);
  }
  function formatThousands(numStr) {
    const clean = persianToEnglishDigits(numStr).replace(/[^0-9]/g, '');
    if (!clean) return '';
    return parseInt(clean, 10).toLocaleString('en-US');
  }
  function attachNumericInput(input, formatCommas) {
    if (!input || input.dataset.numericAttached) return;
    input.dataset.numericAttached = 'true';
    input.addEventListener('keydown', function(e) {
      const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter'];
      if (allowed.includes(e.key)) return;
      if (e.ctrlKey || e.metaKey) return;
      const isEnDigit = e.key >= '0' && e.key <= '9';
      const isFaDigit = e.key >= '۰' && e.key <= '۹';
      if (!isEnDigit && !isFaDigit) {
        e.preventDefault();
      }
    });
    input.addEventListener('input', function() {
      const selStart = this.selectionStart;
      const oldLen = this.value.length;
      let val = persianToEnglishDigits(this.value);
      val = val.replace(/[^0-9]/g, '');
      if (formatCommas) {
        val = val ? parseInt(val, 10).toLocaleString('en-US') : '';
      }
      this.value = val;
      try {
        const newLen = this.value.length;
        const diff = newLen - oldLen;
        this.setSelectionRange(selStart + diff, selStart + diff);
      } catch(err) {}
    });
  }
  function initNumericInputs(root) {
    root = root || document;
    root.querySelectorAll('.price-input, .var-min-price, .var-default-price, .ojrat-input, .rounding-test-input').forEach(inp => {
      attachNumericInput(inp, true);
    });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initNumericInputs(document));
  } else {
    initNumericInputs(document);
  }
  normalizeUnitSelects();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      normalizeUnitSelects();
      initCustomSelects();
    });
  } else {
    initCustomSelects();
  }
export {
  showToast, createCustomSelect, initCustomSelects, updateCustomSelect,
  createPlaceholder, unitCatalog, getUnitMeta, normalizeUnitSelect,
  normalizeUnitSelects, formatNumberWithCommas, persianToEnglishDigits,
  formatThousands, attachNumericInput, initNumericInputs
};