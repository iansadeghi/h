import { formatNumberWithCommas as formatSharedNumber } from '../general.js';
import { customSelect } from '../custom-select.js';

/* ─── DYNAMIC ROUNDING MECHANISM ─── */

const roundingDigitNames = {
  3: "سومین",
  4: "چهارمین",
  5: "پنجمین",
  6: "ششمین",
  7: "هفتمین"
};

// نام فارسی عدد برای N-1 رقم اول (برای جمله «X رقم اول قیمت، 0 شود ولی Yمین رقم 9 شود»)
const roundingPrevDigitText = {
  3: "دو",
  4: "سه",
  5: "چهار",
  6: "پنج",
  7: "شش"
};

/* Shared with pricing-patterns.js via HojrehGeneral (general.js loads
   first on every page that includes this file) — single source of
   truth for Persian-comma (،) thousands formatting. Local fallback
   kept only for defensive standalone use. */
function formatNumberWithCommas(num) {
  return formatSharedNumber(num);
}

function updateRoundingTypeOptions(maxSelect) {
  const item = maxSelect.closest('.accordion-item');
  const typeSelect = item.querySelector('.rounding-type-select');
  if (!typeSelect) return;

  const val = parseInt(maxSelect.value);
  const text = maxSelect.options[maxSelect.selectedIndex].text;
  const digitName = roundingDigitNames[val] || `${val}امین`;
  // برای گزینه last_nine: N-1 رقم اول 0 شوند، سپس رقم Nام 9 شود
  const prevText = roundingPrevDigitText[val] ? `${roundingPrevDigitText[val]} رقم اول` : `${val - 1} رقم اول`;
  const previousSelection = typeSelect.value;

  typeSelect.innerHTML = `
    <option value="zero" ${previousSelection === 'zero' ? 'selected' : ''}>${text} قیمت، 0 شود</option>
    <option value="nine" ${previousSelection === 'nine' ? 'selected' : ''}>${text} قیمت، 9 شود</option>
    <option value="last_nine" ${previousSelection === 'last_nine' ? 'selected' : ''}>${prevText} قیمت، 0 شود ولی ${digitName} رقم 9 شود</option>
  `;

  /* Rebuild the custom-select widget so its visible options match the new native ones */
  customSelect.refresh(typeSelect);

  calculateRoundingOutput(item);
}

function calculateRoundingOutput(item) {
  const maxSelect = item.querySelector('.rounding-max-select');
  const typeSelect = item.querySelector('.rounding-type-select');
  const testInput = item.querySelector('.rounding-test-input');
  const outputVal = item.querySelector('.rounding-output-val');

  if (!maxSelect || !typeSelect || !testInput || !outputVal) return;

  let raw = testInput.value.replace(/،/g, '').replace(/,/g, '').trim();
  raw = raw.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));

  const price = parseInt(raw);
  if (isNaN(price) || price <= 0) {
    outputVal.value = '—';
    return;
  }

  const N = parseInt(maxSelect.value);
  const factor = Math.pow(10, N);
  const mode = typeSelect.value;
  let finalRoundedPrice = price;

  if (mode === 'zero') {
    finalRoundedPrice = Math.floor(price / factor) * factor;
  } else if (mode === 'nine') {
    finalRoundedPrice = Math.floor(price / factor) * factor + (factor - 1);
  } else if (mode === 'last_nine') {
    const subFactor = Math.pow(10, N - 1);
    finalRoundedPrice = Math.floor(price / factor) * factor + (9 * subFactor);
  }

  /* ── Guard 1: prevent result from becoming 0 ────────────────── */
  const preventZero = !!(item.querySelector('.rounding-prevent-zero')?.checked);
  if (preventZero && finalRoundedPrice <= 0 && price > 0) {
    finalRoundedPrice = price;
  }

  /* ── Guard 2: prevent price increase during rounding ─────────── */
  const preventIncrease = !!(item.querySelector('.rounding-prevent-increase')?.checked);
  if (preventIncrease && finalRoundedPrice > price) {
    finalRoundedPrice = price;
  }

  outputVal.value = formatNumberWithCommas(finalRoundedPrice) + ' تومان';
}

function attachRoundingCalculations(item) {
  if (!item || item.dataset.roundingReady === 'true') return;
  item.dataset.roundingReady = 'true';
  const maxSelect = item.querySelector('.rounding-max-select');
  const typeSelect = item.querySelector('.rounding-type-select');
  const testInput = item.querySelector('.rounding-test-input');

  if (maxSelect) {
    maxSelect.addEventListener('change', () => updateRoundingTypeOptions(maxSelect));
    updateRoundingTypeOptions(maxSelect);
  }
  if (typeSelect) {
    typeSelect.addEventListener('change', () => calculateRoundingOutput(item));
  }
  if (testInput) {
    testInput.addEventListener('input', function() {
      let value = this.value.replace(/،/g, '').replace(/,/g, '');
      value = value.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
      if (!isNaN(value) && value !== '') {
        this.value = formatNumberWithCommas(value);
      }
      calculateRoundingOutput(item);
    });
  }

  /* ── Guard checkboxes ── */
  const preventZeroCb = item.querySelector('.rounding-prevent-zero');
  const preventIncreaseCb = item.querySelector('.rounding-prevent-increase');

  if (preventZeroCb) {
    preventZeroCb.addEventListener('change', () => calculateRoundingOutput(item));
  }
  if (preventIncreaseCb) {
    preventIncreaseCb.addEventListener('change', () => {
      calculateRoundingOutput(item);
    });
  }
}

/* Wire up every rounding accordion already present in the initial page markup */
function initRoundingList() {
  document.querySelectorAll('#roundingList .accordion-item').forEach(item => {
    attachRoundingCalculations(item);
  });
}

export {
  formatNumberWithCommas,
  updateRoundingTypeOptions,
  calculateRoundingOutput,
  attachRoundingCalculations,
  initRoundingList
};
