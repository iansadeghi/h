/* Wires HojrehPatternController instances to the existing accordion
   markup and builds the pricingPatterns facade object. Extracted
   from the former monolithic pricing-patterns.js — see
   ../pricing-patterns.js for the full module map.

   Originally an immediately-invoked, self-contained IIFE that
   reassigned a module-level `pricingPatterns` variable directly.
   Now an exported function that instead RETURNS the facade object
   (or null if #pricingPatternsList isn't on the page, e.g.
   price-editor.html) — the caller (../pricing-patterns.js) assigns
   the result to its own exported `pricingPatterns` binding. This is
   the only behavioral adaptation needed to make the code an
   importable module instead of a page-bottom script; every line of
   actual logic below is unchanged. */

import { HojrehPatternController } from './controller.js';

/* ═══════════════════════════════════════════════════════════════
   BOOTSTRAP — wires HojrehPatternController instances to the
   existing accordion markup so this refactor is a drop-in
   replacement for the old initHojrehPricingPatterns IIFE. No
   module-level mutable cursor is created here: each accordion node
   gets its own controller instance, registered by patternId, and
   the DOM MutationObserver simply instantiates a new controller for
   any newly-added pattern accordion.
   ═══════════════════════════════════════════════════════════════ */

export function bootstrapHojrehPricingPatterns() {
  'use strict';

  const pricingPatternsList = document.getElementById('pricingPatternsList');
  if (!pricingPatternsList) return null;

  function controllerForAccordion(accordionEl) {
    if (!accordionEl) return null;
    const patternId = accordionEl.dataset.id || `pattern_${Math.random().toString(36).slice(2, 9)}`;
    accordionEl.dataset.id = patternId;

    const existing = HojrehPatternController.get(patternId);
    if (existing) {
      if (existing.container !== accordionEl) existing.bindDom(accordionEl);
      return existing;
    }

    const nameInput = accordionEl.querySelector('.pattern-name-input');
    const controller = new HojrehPatternController(patternId, accordionEl, {
      patternName: nameInput?.value?.trim() || accordionEl.querySelector('.acc-name')?.textContent?.trim() || ''
    });
    HojrehPatternController.register(controller);
    return controller;
  }

  function getControllerByElement(element) {
    const accordion = element?.closest?.('.accordion-item[data-type="pattern"]');
    return accordion ? controllerForAccordion(accordion) : null;
  }

  function initAllPatterns(root = document) {
    root.querySelectorAll?.('#pricingPatternsList .accordion-item[data-type="pattern"], .accordion-item[data-type="pattern"]')
      .forEach(accordionEl => {
        const controller = controllerForAccordion(accordionEl);
        controller.render({ syncPreview: true });
        controller.rememberLastValidFormula();
      });
  }

  document.querySelectorAll('.accordion-item[data-type="variable"] .var-name-input, .accordion-item[data-type="api-variable"] .var-name-input, .accordion-item[data-type="constant"] .var-name-input, .accordion-item[data-type="algorithm"] .var-name-input, .accordion-item[data-type="pattern"] .var-name-input').forEach(input => {
    const item = input.closest('.accordion-item');
    const nameSpan = item?.querySelector('.acc-name');
    if (nameSpan) nameSpan.textContent = input.value || 'بدون نام';
  });

  HojrehPatternController.ensureUnifiedUnitSelectOptions(document);
  initAllPatterns(document);

  const patternObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        const pattern = node.matches?.('.accordion-item[data-type="pattern"]') ? node : node.querySelector?.('.accordion-item[data-type="pattern"]');
        if (pattern) {
          const controller = controllerForAccordion(pattern);
          controller.render({ syncPreview: true });
          controller.rememberLastValidFormula();
        }
      });
      mutation.removedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        const pattern = node.matches?.('.accordion-item[data-type="pattern"]') ? node : node.querySelector?.('.accordion-item[data-type="pattern"]');
        if (pattern?.dataset.id) HojrehPatternController.get(pattern.dataset.id)?.destroy();
      });
    });
  });
  patternObserver.observe(pricingPatternsList, { childList: true, subtree: true });

  /* ── Public facade ─────────────────────────────────────────────
     Kept for backward compatibility with settings-panel.js and
     other modules that call window.HojrehPricingPatterns.*. Every
     method now simply resolves the relevant HojrehPatternController
     instance(s) and delegates — no shared mutable state involved. */
  return {
    activatePattern(pattern, options = {}) {
      const controller = controllerForAccordion(pattern);
      // settings-panel.js / formula-test-modal.js call this with
      // { hydrate: false } when they only need the controller bound/
      // resolved (e.g. before enableManualFormulaMode()) and explicitly
      // don't want hydrate()'s DOM side effects (contenteditable
      // toggling, possible re-render, syncBackendFields) to run yet.
      if (controller && options.hydrate !== false) controller.hydrate();
      return !!controller;
    },
    bindPatternControls(pattern) { controllerForAccordion(pattern); },
    bindAllPatternControls(root = document) { initAllPatterns(root); },
    renderFormulaItems(options = {}, pattern = null) {
      if (!pattern) { console.error('Hojreh Facade Error: Missing explicit pattern element argument.'); return null; }
      const controller = getControllerByElement(pattern);
      if (!controller) { console.error('Hojreh Facade Error: No controller resolved for the given pattern element.'); return null; }
      controller.render(options);
    },
    updateFormulaPreview(pattern = null) {
      if (!pattern) { console.error('Hojreh Facade Error: Missing explicit pattern element argument.'); return null; }
      const controller = getControllerByElement(pattern);
      if (!controller) { console.error('Hojreh Facade Error: No controller resolved for the given pattern element.'); return null; }
      controller._updatePreview();
    },
    calculateSimulatorFinalPrice(pattern = null) {
      if (!pattern) { console.error('Hojreh Facade Error: Missing explicit pattern element argument.'); return null; }
      const controller = getControllerByElement(pattern);
      if (!controller) { console.error('Hojreh Facade Error: No controller resolved for the given pattern element.'); return null; }
      controller.calculateSimulatorFinalPrice();
    },
    enableManualFormulaMode(pattern = null) {
      if (!pattern) { console.error('Hojreh Facade Error: Missing explicit pattern element argument.'); return null; }
      const controller = getControllerByElement(pattern);
      if (!controller) { console.error('Hojreh Facade Error: No controller resolved for the given pattern element.'); return null; }
      controller.enableManualFormulaMode();
    },
    getRegisteredData(type) {
      const instance = HojrehPatternController.all()[0];
      return instance ? instance._getSelectableOptions(type) : [];
    },
    refreshFormulaPreviewAndSimulator(forceTextSync, pattern = null) {
      (pattern ? getControllerByElement(pattern) : HojrehPatternController.all()[0])?.refreshPreviewAndSimulator(forceTextSync);
    },
    refreshFormulaAfterSettingsChange() {
      HojrehPatternController.all().forEach(c => c.refreshAfterRegistryChange());
    },
    validateAndApplyFormula(options = {}, pattern = null) {
      return (pattern ? getControllerByElement(pattern) : HojrehPatternController.all()[0])?.validateAndApplyFormula(options);
    },
    getFormulaPayload(pattern = null) {
      return (pattern ? getControllerByElement(pattern) : HojrehPatternController.all()[0])?.getPayload();
    },
    getAllFormulaPayloads() {
      return HojrehPatternController.all().map(c => c.getPayload());
    },
    getBackendPayload() {
      return HojrehPatternController.all().map(c => c.getPayload());
    },
    /** Optimistic-concurrency token for a single pattern instance
     *  (Contract §10). Returns null if unknown (no data-revision yet). */
    getLastKnownRevision(pattern = null) {
      if (!pattern) { console.error('Hojreh Facade Error: Missing explicit pattern element argument.'); return null; }
      const controller = getControllerByElement(pattern);
      if (!controller) { console.error('Hojreh Facade Error: No controller resolved for the given pattern element.'); return null; }
      return controller.lastKnownRevision ?? null;
    },
    /** Whether getLastKnownRevision()'s value for this pattern came from
     *  a real server-emitted data-revision attribute (Contract §10), vs.
     *  the non-authoritative "1" UI placeholder used when the attribute
     *  hasn't hydrated yet. Callers that want to be extra defensive
     *  (e.g. refuse to fire a save until this is true) can check it
     *  before relying on getPatternSaveEnvelope()'s base_revision. */
    isRevisionAuthoritative(pattern = null) {
      if (!pattern) { console.error('Hojreh Facade Error: Missing explicit pattern element argument.'); return false; }
      const controller = getControllerByElement(pattern);
      if (!controller) { console.error('Hojreh Facade Error: No controller resolved for the given pattern element.'); return false; }
      return !!controller.state.isRevisionAuthoritative;
    },
    /** Save-request envelope for one pattern: { base_revision, payload },
     *  matching Contract §10.3 / §14.5 exactly (base_revision sits
     *  alongside payload, not inside it). NOTE: base_revision may be
     *  the non-authoritative placeholder (see isRevisionAuthoritative()
     *  above) if this pattern's container never received a real
     *  data-revision attribute from the server. */
    getPatternSaveEnvelope(pattern = null) {
      if (!pattern) { console.error('Hojreh Facade Error: Missing explicit pattern element argument.'); return null; }
      const controller = getControllerByElement(pattern);
      if (!controller) { console.error('Hojreh Facade Error: No controller resolved for the given pattern element.'); return null; }
      return { base_revision: controller.lastKnownRevision, payload: controller.getPayload() };
    },
    /** Bulk-sync envelope for every registered pattern (Contract §14.6),
     *  restricted to 'green' (fully valid) patterns as the contract
     *  requires for anything the backend should treat as authoritative. */
    getBulkSyncPayload() {
      return HojrehPatternController.all()
        .filter(c => c.state.status === 'green')
        .map(c => ({ base_revision: c.lastKnownRevision, payload: c.getPayload() }));
    },
    syncBackendPayload(pattern = null) {
      (pattern ? getControllerByElement(pattern) : HojrehPatternController.all()[0])?.syncBackendFields();
    },
    getUsedItemIds(pattern = null) {
      return (pattern ? getControllerByElement(pattern) : HojrehPatternController.all()[0])?.getUsedItemIds() || [];
    },
    isItemUsedInCurrentFormula(id, pattern = null) {
      return !!(pattern ? getControllerByElement(pattern) : HojrehPatternController.all()[0])?.isItemUsed(id);
    },
    isItemUsedInAnyFormula: id => HojrehPatternController.isItemUsedInAnyInstance(id),
    isItemUsedInFormula: id => HojrehPatternController.isItemUsedInAnyInstance(id),
    isRegisteredItemUsed: id => HojrehPatternController.isItemUsedInAnyInstance(id),
    isRegistryItemUsed: id => HojrehPatternController.isItemUsedInAnyInstance(id),
    ensureUnifiedUnitSelectOptions: root => HojrehPatternController.ensureUnifiedUnitSelectOptions(root),
    hydrateFormulaUi(pattern = null) {
      (pattern ? getControllerByElement(pattern) : HojrehPatternController.all()[0])?.hydrate();
    },
    buildBackendPayload() {
      return HojrehPatternController.all().map(c => c.getPayload());
    },
    getFormulaElements(pattern = null) {
      const controller = pattern ? controllerForAccordion(pattern) : HojrehPatternController.all()[0];
      return controller ? HojrehFormulaEngine.serializeElements(controller.state.elements) : [];
    },
    getCurrentFormulaElements(pattern = null) {
      const controller = pattern ? controllerForAccordion(pattern) : HojrehPatternController.all()[0];
      return controller ? HojrehPatternController.cloneElements(controller.state.elements) : [];
    },
    setFormulaElements(elements, pattern = null) {
      const controller = pattern ? controllerForAccordion(pattern) : HojrehPatternController.all()[0];
      if (!controller) return;
      controller.setElements(elements);
      controller.render({ syncPreview: true });
    },
    setCurrentFormulaElements(elements, pattern = null) {
      this.setFormulaElements(elements, pattern);
    },
    hasFormulaChanged: () => HojrehPatternController.all().some(c => c.hasChanged()),
    commitFormulaSnapshot: () => HojrehPatternController.all().forEach(c => c.commitSnapshot())
  };
}
