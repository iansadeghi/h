import { HojrehPatternController } from './controller.js';
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
  return {
    activatePattern(pattern, options = {}) {
      const controller = controllerForAccordion(pattern);
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
    getLastKnownRevision(pattern = null) {
      if (!pattern) { console.error('Hojreh Facade Error: Missing explicit pattern element argument.'); return null; }
      const controller = getControllerByElement(pattern);
      if (!controller) { console.error('Hojreh Facade Error: No controller resolved for the given pattern element.'); return null; }
      return controller.lastKnownRevision ?? null;
    },
    isRevisionAuthoritative(pattern = null) {
      if (!pattern) { console.error('Hojreh Facade Error: Missing explicit pattern element argument.'); return false; }
      const controller = getControllerByElement(pattern);
      if (!controller) { console.error('Hojreh Facade Error: No controller resolved for the given pattern element.'); return false; }
      return !!controller.state.isRevisionAuthoritative;
    },
    getPatternSaveEnvelope(pattern = null) {
      if (!pattern) { console.error('Hojreh Facade Error: Missing explicit pattern element argument.'); return null; }
      const controller = getControllerByElement(pattern);
      if (!controller) { console.error('Hojreh Facade Error: No controller resolved for the given pattern element.'); return null; }
      return { base_revision: controller.lastKnownRevision, payload: controller.getPayload() };
    },
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