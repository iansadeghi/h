import { wrapPriceInputsWithToman, initPasswordToggle, initNewAccordionExtras } from './settings-panel/misc-ui.js';
import {
  generateEnglishID,
  normalizeEnglishIdValue,
  isFormulaProtectedItem
} from './settings-panel/id-utils.js';
import { showConfirmModal } from './settings-panel/confirm-modal.js';
import {
  updateRoundingTypeOptions,
  calculateRoundingOutput,
  attachRoundingCalculations,
  initRoundingList
} from './settings-panel/rounding.js';
import { attachUnitLabelSync, initUnitSync } from './settings-panel/unit-sync.js';
import {
  attachDeleteEvents,
  attachDeleteConstantEvents,
  initDeleteActions
} from './settings-panel/delete-actions.js';
import { toggleManualFormulaMode, initManualFormulaToggles } from './settings-panel/manual-formula.js';
import {
  startDrag,
  getOrderPayload,
  commitOrderTracking,
  hasOrderChanged,
  snapshotAllListOrders,
  initDragHandles,
  initOrderSnapshot
} from './settings-panel/drag-reorder.js';
import {
  getDirtySettingsPayload,
  commitDirtyTracking,
  initDirtyTracking,
  initInitialDirtySnapshot,
  initSaveDot,
  initDirtyFieldListeners,
  initHeaderSaveButton
} from './settings-panel/dirty-tracking.js';
import {
  createAccordionShell,
  hydrateAccordionItem,
  animateAccordionItemIn,
  attachAccordionEvents,
  attachNameUpdateEvents,
  attachSwitchValidationAndLock,
  normalizeInitialAccordionState,
  initAccordionEvents,
  initNameUpdateEvents,
  initSwitchValidation
} from './settings-panel/accordion-lifecycle.js';
import { initAddItemButtons } from './settings-panel/add-items.js';
import { initFormulaFieldSync } from './settings-panel/formula-field-sync.js';
import { initSidebarNav } from './settings-panel/sidebar-nav.js';
import { initApprenticeAccess } from './settings-panel/apprentice-access.js';
import { refreshAccordionEmptyState, initAccordionEmptyStates } from './settings-panel/empty-state.js';
initAccordionEvents();
initNameUpdateEvents();
initSwitchValidation();
initRoundingList();
initUnitSync();
initFormulaFieldSync();
initDeleteActions();
initManualFormulaToggles();
initAddItemButtons();
initSidebarNav();
initApprenticeAccess();
initInitialDirtySnapshot();
initSaveDot();
initDirtyFieldListeners();
initHeaderSaveButton();
initOrderSnapshot();
initDragHandles();
wrapPriceInputsWithToman(document);
initPasswordToggle(document);
normalizeInitialAccordionState();
initAccordionEmptyStates();
export const settingsPanel = {
  generateEnglishID,
  normalizeEnglishIdValue,
  showConfirmModal,
  createAccordionShell,
  hydrateAccordionItem,
  animateAccordionItemIn,
  attachAccordionEvents,
  attachNameUpdateEvents,
  attachSwitchValidationAndLock,
  updateRoundingTypeOptions,
  calculateRoundingOutput,
  attachRoundingCalculations,
  attachUnitLabelSync,
  attachDeleteEvents,
  attachDeleteConstantEvents,
  toggleManualFormulaMode,
  startDrag,
  getDirtySettingsPayload,
  commitDirtyTracking,
  initDirtyTracking,
  isFormulaProtectedItem,
  wrapPriceInputsWithToman,
  initPasswordToggle,
  initNewAccordionExtras,
  getOrderPayload,
  commitOrderTracking,
  hasOrderChanged,
  snapshotAllListOrders,
  refreshAccordionEmptyState
};
