/* ════════════════════════════════════════════════════════════════
 * settings-panel.js — orchestrator
 *
 * This file used to contain every piece of settings-panel logic in one
 * ~1700-line module. It has been split into focused modules under
 * ./settings-panel/, each owning a single responsibility:
 *
 *   id-utils.js            English-ID generation/validation, item-type helpers
 *   confirm-modal.js       Shared delete-confirmation modal
 *   rounding.js            Rounding-mechanism math + its accordion wiring
 *   unit-sync.js           "اجرت به ازای هر یک ..." label sync on unit change
 *   delete-actions.js      Delete buttons for variables/constants/algorithms
 *   manual-formula.js      Manual-formula-mode toggle for pricing patterns
 *   drag-reorder.js        Drag & drop + list-order dirty tracking
 *   dirty-tracking.js      Field-level dirty tracking + save payload/button
 *   accordion-lifecycle.js Accordion shell creation + the hydration pipeline
 *   templates.js           Pure body-HTML generators for each accordion type
 *   add-items.js           The five "add new ..." button handlers
 *   formula-field-sync.js  Debounced formula refresh on field changes
 *   sidebar-nav.js         Smooth-scroll sidebar + active-section pill
 *   misc-ui.js             Toman price suffix + password show/hide toggle
 *
 * This file's only job is to import them, run their init routines in the
 * same order the original monolithic script did, and re-export the same
 * public `settingsPanel` API other files (api-modal.js) already depend on.
 * ════════════════════════════════════════════════════════════════ */

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

/* ─── BOOT SEQUENCE ───
   Mirrors the execution order of the original single-file script so that
   any implicit ordering assumptions (e.g. dirty-tracking snapshot must be
   deferred past pricing-patterns.js's own boot) keep holding true. */

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

/* اگر هر یک از ۶ لیست آکاردئونی از همان ابتدا خالی بود، empty state را نشان بده */
initAccordionEmptyStates();

/* ─── PUBLIC API ───
   Same shape as before: api-modal.js and other dynamic-accordion callers
   route new items through this facade so they get identical wiring
   (drag, switch validation, dirty tracking, unit label sync, name update)
   to every other accordion. */
export const settingsPanel = {
  generateEnglishID,
  normalizeEnglishIdValue,
  showConfirmModal,
  /* Unified accordion factory — the single object lifecycle pipeline.
     api-modal.js routes new API variables through hydrateAccordionItem so they
     get the exact same wiring (drag, switch validation, dirty tracking, unit
     label sync, name update) as every other dynamically created accordion. */
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
  /* Order dirty tracking — call these from backend integration code */
  getOrderPayload,
  commitOrderTracking,
  hasOrderChanged,
  snapshotAllListOrders,
  /* empty state لیست‌های آکاردئونی — api-modal.js بعد از افزودن/پنهان‌سازی
     متغیر API صدا می‌زند تا #apiVariablesList را به‌روز نگه دارد. */
  refreshAccordionEmptyState
};
