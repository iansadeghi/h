import { pricingPatterns } from '../pricing-patterns.js';
function attachUnitLabelSync(select) {
  if (!select) return;
  if (select.dataset.unitLabelReady === 'true') return;
  select.dataset.unitLabelReady = 'true';
  select.addEventListener('change', function() {
    const parentBody = this.closest('.accordion-body');
    if (!parentBody) return;
    const wageLabel = parentBody.querySelector('.dynamic-wage-label');
    if (wageLabel) {
      wageLabel.textContent = `اجرت به ازای هر یک ${this.value}`;
    }
    pricingPatterns.refreshFormulaAfterSettingsChange?.();
  });
}
function initUnitSync() {
  document.querySelectorAll('.unit-select').forEach(select => {
    attachUnitLabelSync(select);
  });
}
export { attachUnitLabelSync, initUnitSync };