/**
 * ═══════════════════════════════════════════════════════════════
 * Hojreh General JavaScript Components
 * سیستم‌های عمومی و قابل استفاده در تمام صفحات
 * ═══════════════════════════════════════════════════════════════
 */

import { show as showToastNotification } from './toast.js';
  'use strict';

  /* ═══════════════════════════════════════════════════════════════
     TOAST NOTIFICATION SYSTEM
     سیستم نمایش پیام‌های Toast
     — اجرا توسط toast.js / HojrehToast انجام می‌شود
     ═══════════════════════════════════════════════════════════════ */

  /**
   * نمایش یک پیام Toast
   * @param {string} message - متن پیام
   * @param {string|number} typeOrDuration - نوع ('green'|'yellow'|'red') یا مدت (عدد، برای سازگاری قدیم)
   */
  function showToast(message, typeOrDuration) {
    showToastNotification(message, typeof typeOrDuration === 'number' ? 'green' : (typeOrDuration || 'green'), typeof typeOrDuration === 'number' ? typeOrDuration : undefined);
  }

  /* ═══════════════════════════════════════════════════════════════
     CUSTOM SELECT/DROPDOWN SYSTEM
     سیستم سلکت باکس اختصاصی با استایل کامل
     ═══════════════════════════════════════════════════════════════ */

  /**
   * تبدیل یک select معمولی به Custom Select
   * @param {HTMLSelectElement} selectElement - المان select اصلی
   */
  function createCustomSelect(selectElement) {
    // اگر قبلا تبدیل شده، نادیده بگیر
    if (selectElement.classList.contains('custom-select-initialized')) {
      return;
    }
    selectElement.classList.add('custom-select-initialized');

    // ساخت wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-wrapper';
    
    // قرار دادن select داخل wrapper
    selectElement.parentNode.insertBefore(wrapper, selectElement);
    wrapper.appendChild(selectElement);

    // ساخت المان نمایشی
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

    // ساخت لیست آپشن‌ها
    const optionsList = document.createElement('div');
    optionsList.className = 'custom-select-options';
    
    // پر کردن آپشن‌ها
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
        
        // کلیک روی آپشن
        optionItem.addEventListener('click', function(e) {
          e.stopPropagation();
          
          // انتخاب آپشن جدید
          selectElement.selectedIndex = index;
          
          // ترگر کردن event تغییر
          const changeEvent = new Event('change', { bubbles: true });
          selectElement.dispatchEvent(changeEvent);
          
          // بستن لیست
          wrapper.classList.remove('open');
          
          // آپدیت نمایش
          updateDisplay();
        });
        
        optionsList.appendChild(optionItem);
      });
    }

    // آپدیت نمایش
    function updateDisplay() {
      const selectedOption = selectElement.options[selectElement.selectedIndex];
      if (selectedOption) {
        displayText.textContent = selectedOption.textContent;
      }
      
      // آپدیت کلاس selected
      optionsList.querySelectorAll('.custom-select-option').forEach((opt, idx) => {
        if (idx === selectElement.selectedIndex) {
          opt.classList.add('selected');
        } else {
          opt.classList.remove('selected');
        }
      });
    }

    wrapper.appendChild(optionsList);
    
    // اولین بار آپشن‌ها رو بساز
    updateOptions();

    // کلیک روی display box برای باز/بسته کردن
    displayBox.addEventListener('click', function(e) {
      e.stopPropagation();
      
      // بستن سایر custom select های باز
      document.querySelectorAll('.custom-select-wrapper.open').forEach(w => {
        if (w !== wrapper) {
          w.classList.remove('open');
        }
      });
      
      wrapper.classList.toggle('open');
    });

    // بستن با کلیک بیرون
    document.addEventListener('click', function(e) {
      if (!wrapper.contains(e.target)) {
        wrapper.classList.remove('open');
      }
    });

    // وقتی select اصلی تغییر کرد (از طریق کد)
    selectElement.addEventListener('change', function() {
      updateDisplay();
    });

    // MutationObserver برای تشخیص تغییرات در options
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

    // ذخیره reference برای استفاده بعدی
    selectElement._customSelectWrapper = wrapper;
    selectElement._customSelectUpdate = updateOptions;
  }

  /**
   * تبدیل تمام select های یک کانتینر به Custom Select
   * @param {HTMLElement} container - کانتینر (پیش‌فرض: document)
   */
  function initCustomSelects(container = document) {
    const selects = container.querySelectorAll('select:not(.custom-select-initialized)');
    selects.forEach(select => {
      // فقط select هایی که کلاس custom-select دارند
      if (select.classList.contains('custom-select') || select.hasAttribute('data-custom-select')) {
        createCustomSelect(select);
      }
    });
  }

  /**
   * آپدیت کردن آپشن‌های یک custom select
   * @param {HTMLSelectElement} selectElement
   */
  function updateCustomSelect(selectElement) {
    if (selectElement._customSelectUpdate) {
      selectElement._customSelectUpdate();
    }
  }

  /* ═══════════════════════════════════════════════════════════════
     PLACEHOLDER HELPER
     تابع کمکی برای ساخت placeholder در drag & drop
     ═══════════════════════════════════════════════════════════════ */

  function createPlaceholder(height) {
    const ph = document.createElement('div');
    ph.className = 'drag-placeholder';
    ph.style.height = height + 'px';
    return ph;
  }



  /* ═══════════════════════════════════════════════════════════════
     UNIT CATALOG
     لیست یکپارچه واحدهای شمارش + جنس واحد برای فرمول‌ساز و بک‌اند
     ═══════════════════════════════════════════════════════════════ */

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

  /* ═══════════════════════════════════════════════════════════════
     NUMBER FORMATTING (shared by pricing-patterns.js + settings-panel.js)
     Persian-comma (،) thousands separator — single source of truth so
     both modules stay in sync instead of maintaining their own copies.
     ═══════════════════════════════════════════════════════════════ */

  function formatNumberWithCommas(num) {
    const safe = Number.isFinite(Number(num)) ? Math.round(Number(num)) : 0;
    return safe.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '،');
  }


  /* ═══════════════════════════════════════════════════════════════
     EXPORT TO GLOBAL SCOPE
     ═══════════════════════════════════════════════════════════════ */


  /* ═══════════════════════════════════════════════════════════════
     NUMERIC INPUT UTILITIES
     ابزارهای ورودی عددی: نرمال‌سازی ارقام فارسی و فرمت جداکننده هزار
     ═══════════════════════════════════════════════════════════════ */

  /**
   * تبدیل ارقام فارسی/عربی به انگلیسی
   */
  function persianToEnglishDigits(str) {
    return String(str)
      .replace(/[۰-۹]/g, d => d.charCodeAt(0) - 0x06F0)
      .replace(/[٠-٩]/g, d => d.charCodeAt(0) - 0x0660);
  }

  /**
   * فرمت عدد با جداکننده هزار (کاما)
   */
  function formatThousands(numStr) {
    const clean = persianToEnglishDigits(numStr).replace(/[^0-9]/g, '');
    if (!clean) return '';
    return parseInt(clean, 10).toLocaleString('en-US');
  }

  /**
   * اتصال رفتار ورودی عددی به یک المان input
   * - فقط ارقام مجاز است
   * - ارقام فارسی به انگلیسی تبدیل می‌شوند
   * - اگر formatCommas=true باشد، فرمت جداکننده هزار اعمال می‌شود
   */
  function attachNumericInput(input, formatCommas) {
    if (!input || input.dataset.numericAttached) return;
    input.dataset.numericAttached = 'true';

    input.addEventListener('keydown', function(e) {
      // اجازه به کلیدهای کنترلی
      const allowed = ['Backspace','Delete','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Tab','Home','End','Enter'];
      if (allowed.includes(e.key)) return;
      // اجازه به ترکیب‌های کنترلی (Ctrl+A, Ctrl+C, ...)
      if (e.ctrlKey || e.metaKey) return;
      // بررسی عدد بودن کلید (انگلیسی یا فارسی)
      const isEnDigit = e.key >= '0' && e.key <= '9';
      const isFaDigit = e.key >= '۰' && e.key <= '۹';
      if (!isEnDigit && !isFaDigit) {
        e.preventDefault();
      }
    });

    input.addEventListener('input', function() {
      const selStart = this.selectionStart;
      const oldLen = this.value.length;
      // تبدیل ارقام فارسی
      let val = persianToEnglishDigits(this.value);
      // حذف همه کاراکترهای غیرعددی
      val = val.replace(/[^0-9]/g, '');
      if (formatCommas) {
        val = val ? parseInt(val, 10).toLocaleString('en-US') : '';
      }
      this.value = val;
      // حفظ موقعیت کرسر
      try {
        const newLen = this.value.length;
        const diff = newLen - oldLen;
        this.setSelectionRange(selStart + diff, selStart + diff);
      } catch(err) {}
    });
  }

  /**
   * اتصال خودکار رفتار عددی به تمام ورودی‌های عددی در یک محدوده
   */
  function initNumericInputs(root) {
    root = root || document;
    // ورودی‌های قیمت با فرمت هزارتایی
    root.querySelectorAll('.price-input, .var-min-price, .var-default-price, .ojrat-input, .rounding-test-input').forEach(inp => {
      attachNumericInput(inp, true);
    });
  }

  // اجرای اولیه بعد از بارگذاری DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => initNumericInputs(document));
  } else {
    initNumericInputs(document);
  }


  // اجرای خودکار برای واحدهای شمارش و select های موجود در صفحه
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
