import { showToast } from '../general.js';
import { pricingPatterns } from '../pricing-patterns.js';
import { formulaTestModal } from '../formula-test-modal.js';
import { nextAccordionId } from './id-utils.js';
import { createAccordionShell, hydrateAccordionItem } from './accordion-lifecycle.js';
import {
  createIndependentVarBodyHtml,
  createConstantBodyHtml,
  createRoundingBodyHtml,
  createApprenticeBodyHtml,
  createPatternBodyHtml
} from './templates.js';
import { refreshAccordionEmptyState } from './empty-state.js';
function initAddIndependentVarButton() {
  const addIndependentVarBtn = document.getElementById('addIndependentVarBtn');
  if (!addIndependentVarBtn) return;
  addIndependentVarBtn.addEventListener('click', () => {
    const list = document.getElementById('independentList');
    if (!list) return;
    const id = nextAccordionId('variable');
    const newItem = createAccordionShell({
      type: 'variable',
      id,
      title: 'متغیر جدید',
      bodyHtml: createIndependentVarBodyHtml(),
      deleteTitle: 'حذف متغیر',
      deleteClass: 'acc-delete-btn',
      active: false,
      open: false
    });
    list.appendChild(newItem);
    refreshAccordionEmptyState(list);
    hydrateAccordionItem(newItem, { active: false, open: false });
    showToast('متغیر جدید ایجاد شد.', 'green');
    pricingPatterns.refreshFormulaAfterSettingsChange?.();
  });
}
function initAddConstantButton() {
  const addConstantBtn = document.getElementById('addConstantBtn');
  if (!addConstantBtn) return;
  addConstantBtn.addEventListener('click', () => {
    const list = document.getElementById('constantsList');
    if (!list) return;
    const id = nextAccordionId('constant');
    const newItem = createAccordionShell({
      type: 'constant',
      id,
      title: 'ثابت درصدی جدید',
      bodyHtml: createConstantBodyHtml(),
      deleteTitle: 'حذف ثابت',
      deleteClass: 'acc-delete-constant-btn',
      active: false,
      open: false
    });
    list.appendChild(newItem);
    refreshAccordionEmptyState(list);
    hydrateAccordionItem(newItem, { active: false, open: false });
    showToast('ثابت درصدی جدید ایجاد شد.', 'green');
    pricingPatterns.refreshFormulaAfterSettingsChange?.();
  });
}
function initAddRoundingButton() {
  const addRoundingBtn = document.getElementById('addRoundingBtn');
  if (!addRoundingBtn) return;
  addRoundingBtn.addEventListener('click', () => {
    const list = document.getElementById('roundingList');
    if (!list) return;
    const id = nextAccordionId('algorithm');
    const newItem = createAccordionShell({
      type: 'algorithm',
      id,
      title: 'مکانیزم رُندسازی جدید',
      bodyHtml: createRoundingBodyHtml(),
      deleteTitle: 'حذف مکانیزم',
      deleteClass: 'acc-delete-btn',
      active: false,
      open: false
    });
    list.appendChild(newItem);
    refreshAccordionEmptyState(list);
    hydrateAccordionItem(newItem, { active: false, open: false });
    showToast('مکانیزم رُندسازی جدید ایجاد شد.', 'green');
    pricingPatterns.refreshFormulaAfterSettingsChange?.();
  });
}
function initAddPatternButton() {
  const addPatternBtn = document.getElementById('addPatternBtn');
  if (!addPatternBtn) return;
  addPatternBtn.addEventListener('click', () => {
    const list = document.getElementById('pricingPatternsList');
    if (!list) return;
    const id = nextAccordionId('pattern');
    const title = 'الگوی جدید';
    const item = createAccordionShell({
      type: 'pattern',
      id,
      title,
      bodyHtml: createPatternBodyHtml(id, title),
      deleteTitle: 'حذف الگو',
      active: false,
      open: false
    });
    list.appendChild(item);
    refreshAccordionEmptyState(list);
    hydrateAccordionItem(item, { active: false, open: false });
    pricingPatterns.bindPatternControls?.(item);
    pricingPatterns.activatePattern?.(item, { hydrate: false });
    formulaTestModal.bindAllTestButtons?.(item);
    showToast('الگوی جدید ایجاد شد.', 'green');
    window._hojrehRefreshSettingsDot?.();
    pricingPatterns.refreshFormulaAfterSettingsChange?.();
  });
}
function initAddApprenticeButton() {
  const addApprenticeBtn = document.getElementById('addApprenticeBtn');
  if (!addApprenticeBtn) return;
  addApprenticeBtn.addEventListener('click', () => {
    const list = document.getElementById('apprenticeList');
    if (!list) return;
    const id = nextAccordionId('apprentice');
    const item = createAccordionShell({
      type: 'apprentice',
      id,
      title: 'شاگرد جدید',
      bodyHtml: createApprenticeBodyHtml(id),
      deleteTitle: 'حذف شاگرد',
      active: false,
      open: false
    });
    list.appendChild(item);
    refreshAccordionEmptyState(list);
    hydrateAccordionItem(item, { active: false, open: false });
    showToast('شاگرد جدید ایجاد شد.', 'green');
    window._hojrehRefreshSettingsDot?.();
  });
}
function initAddItemButtons() {
  initAddIndependentVarButton();
  initAddConstantButton();
  initAddRoundingButton();
  initAddPatternButton();
  initAddApprenticeButton();
}
export { initAddItemButtons };