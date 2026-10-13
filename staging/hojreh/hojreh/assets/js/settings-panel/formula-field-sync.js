import { normalizeUnitSelects } from '../general.js';
import { pricingPatterns } from '../pricing-patterns.js';
import { normalizeEnglishIdValue } from './id-utils.js';
let formulaAffectingRefreshTimer = null;
function scheduleFormulaAffectingRefresh() {
  clearTimeout(formulaAffectingRefreshTimer);
  formulaAffectingRefreshTimer = setTimeout(() => {
    pricingPatterns.refreshFormulaAfterSettingsChange?.();
  }, 80);
}
function initFormulaFieldSync() {
  document.addEventListener('input', function(e) {
    if (e.target.matches('.english-id-input')) {
      const normalized = normalizeEnglishIdValue(e.target.value);
      if (e.target.value !== normalized) e.target.value = normalized;
    }
    if (e.target.matches('.english-id-input, .percent-input-field, .var-min-price, .var-default-price, .rounding-test-input, .ojrat-input')) {
      scheduleFormulaAffectingRefresh();
    }
  });
  document.addEventListener('change', function(e) {
    if (e.target.matches('.unit-select, .rounding-max-select, .rounding-type-select')) {
      normalizeUnitSelects(e.target.closest('.accordion-item') || document);
      scheduleFormulaAffectingRefresh();
    }
    if (e.target.matches('.rounding-prevent-zero, .rounding-prevent-increase')) {
      scheduleFormulaAffectingRefresh();
    }
  });
}
export { scheduleFormulaAffectingRefresh, initFormulaFieldSync };