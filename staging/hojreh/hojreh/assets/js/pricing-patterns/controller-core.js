import { HojrehFormulaEngine } from './formula-engine.js';
class HojrehPatternController {
  constructor(patternId, targetContainer = null, options = {}) {
    if (!patternId && patternId !== 0) {
      throw new Error('HojrehPatternController requires a patternId');
    }
    this.patternId = String(patternId);
    this.container = targetContainer || null;
    const revisionInfo = HojrehPatternController._readRevisionAttr(targetContainer);
    this.lastKnownRevision = revisionInfo.revision;
    this.registryCatalog = options.registryCatalog || null;
    this.state = {
      patternName: options.patternName || '',
      elements: HojrehPatternController.cloneElements(options.initialElements || []),
      lastValidElements: HojrehPatternController.cloneElements(options.initialElements || []),
      elementCounter: 0,
      status: 'empty',      
      errorMessage: '',
      isManual: false,
      manualText: '',
      savedFormulaText: null, 
      simulatorValues: {},     
      isRevisionAuthoritative: revisionInfo.authoritative
    };
    this._dom = {
      dropZone: null,
      emptyState: null,
      itemsContainer: null,
      previewLarge: null,
      testInputsGrid: null,
      finalCalcValue: null
    };
    this._isRendering = false;
    this._validateTimer = null;
    this._hydrationTimer = null;
    this.refreshCounterFromElements();
    if (this.container) this.bindDom(this.container);
  }
  static cloneElements(elements) {
    return JSON.parse(JSON.stringify(elements || []));
  }
  static _readRevisionAttr(container) {
    if (!container || !container.getAttribute) return { revision: null, authoritative: false };
    const raw = container.getAttribute('data-revision');
    if (raw === null) {
      return { revision: 1, authoritative: false };
    }
    if (raw === '') return { revision: null, authoritative: false };
    const num = Number(raw);
    return Number.isFinite(num)
      ? { revision: num, authoritative: true }
      : { revision: null, authoritative: false };
  }
  static _insertPlainTextAtSelection(editableEl, text) {
    const selection = window.getSelection();
    let range = null;
    if (selection && selection.rangeCount > 0) {
      const candidate = selection.getRangeAt(0);
      if (editableEl.contains(candidate.commonAncestorContainer)) {
        range = candidate;
      }
    }
    if (!range) {
      range = document.createRange();
      range.selectNodeContents(editableEl);
      range.collapse(false);
    }
    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }
    editableEl.dispatchEvent(new Event('input', { bubbles: true }));
  }
  static _registry = new Map();
  static register(instance) {
    HojrehPatternController._registry.set(instance.patternId, instance);
    return instance;
  }
  static unregister(patternId) {
    HojrehPatternController._registry.delete(String(patternId));
  }
  static get(patternId) {
    return HojrehPatternController._registry.get(String(patternId)) || null;
  }
  static all() {
    return Array.from(HojrehPatternController._registry.values());
  }
  static isItemUsedInAnyInstance(itemId) {
    const normalizedId = HojrehFormulaEngine.normalizeIdentifier(itemId);
    return HojrehPatternController.all().some(instance => instance.isItemUsed(normalizedId));
  }
}
export { HojrehPatternController };
