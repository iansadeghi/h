import { pricingPatterns } from '../pricing-patterns.js';
function toggleManualFormulaMode(isActive, patternItem) {
  if (isActive) {
    document.body.classList.add('manual-formula-active');
  } else {
    document.body.classList.remove('manual-formula-active');
  }
  if (patternItem) {
    const localToggle = patternItem.querySelector('.manual-formula-toggle');
    if (localToggle) localToggle.checked = isActive;
  }
  pricingPatterns.activatePattern?.(patternItem, { hydrate: false });
  pricingPatterns.enableManualFormulaMode?.(patternItem);
}
function initManualFormulaToggles() {
  document.querySelectorAll('.manual-formula-toggle').forEach(chk => {
    if (chk.dataset.hojrehManualHandler) return;
    chk.dataset.hojrehManualHandler = 'settings';
    chk.addEventListener('change', function() {
      toggleManualFormulaMode(this.checked, this.closest('.accordion-item[data-type="pattern"]'));
    });
  });
}
export { toggleManualFormulaMode, initManualFormulaToggles };
