import { showToast } from '../general.js';
import { pricingPatterns } from '../pricing-patterns.js';
import { itemHumanType, isFormulaProtectedItem } from './id-utils.js';
import { showConfirmModal } from './confirm-modal.js';
import { refreshAccordionEmptyState } from './empty-state.js';
function attachDeleteEvents(btn) {
  if (!btn) return;
  if (btn.dataset.deleteReady === 'true') return;
  btn.dataset.deleteReady = 'true';
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    const accordionItem = this.closest('.accordion-item');
    const itemName = accordionItem.querySelector('.var-name-input')?.value || 'این آیتم';
    const label = itemHumanType(accordionItem);
    if (isFormulaProtectedItem(accordionItem)) {
      showToast(`${label} «${itemName}» در فرمول قیمت‌گذاری استفاده شده و قابل حذف نیست.`, 'yellow');
      return;
    }
    showConfirmModal(
      `حذف ${label}`,
      `این کار باعث حذف ${label} «${itemName}» خواهد شد. آیا مطمئن هستید؟`,
      () => {
        const list = accordionItem.parentElement;
        accordionItem.classList.add('collapsed-hide');
        setTimeout(() => {
          accordionItem.remove();
          refreshAccordionEmptyState(list);
          pricingPatterns.refreshFormulaAfterSettingsChange?.();
          showToast(`${label} «${itemName}» با موفقیت حذف شد.`, 'green');
        }, 300);
      }
    );
  });
}
function attachDeleteConstantEvents(btn) {
  if (!btn) return;
  if (btn.dataset.deleteConstantReady === 'true') return;
  btn.dataset.deleteConstantReady = 'true';
  btn.addEventListener('click', function(e) {
    e.stopPropagation();
    const accordionItem = this.closest('.accordion-item');
    const constantName = accordionItem.querySelector('.var-name-input')?.value || 'این ثابت';
    if (isFormulaProtectedItem(accordionItem)) {
      showToast(`ثابت درصدی «${constantName}» در فرمول قیمت‌گذاری استفاده شده و قابل حذف نیست.`, 'yellow');
      return;
    }
    showConfirmModal(
      'حذف ثابت درصدی',
      `این کار باعث حذف ثابت «${constantName}» خواهد شد. آیا مطمئن هستید؟`,
      () => {
        const list = accordionItem.parentElement;
        accordionItem.classList.add('collapsed-hide');
        setTimeout(() => {
          accordionItem.remove();
          refreshAccordionEmptyState(list);
          pricingPatterns.refreshFormulaAfterSettingsChange?.();
          showToast(`ثابت درصدی «${constantName}» با موفقیت حذف شد.`, 'green');
        }, 300);
      }
    );
  });
}
function initDeleteActions() {
  document.querySelectorAll('.acc-delete-btn').forEach(btn => {
    attachDeleteEvents(btn);
  });
  document.querySelectorAll('.acc-delete-constant-btn').forEach(btn => {
    attachDeleteConstantEvents(btn);
  });
}
export { attachDeleteEvents, attachDeleteConstantEvents, initDeleteActions };