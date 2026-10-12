/* ═══════════════════════════════════════════════════════════════
   HojrehPatternController — STATE MUTATION + BACKEND COMPILER
   ───────────────────────────────────────────────────────────────
   Pure, DOM-agnostic instance methods: everything that reads or
   mutates this.state without touching this.container/this._dom,
   plus the backend-ready compiler layer (compileToProgram,
   buildFormulaText, getPayload, dirty-tracking).

   Exported as a plain mixin object and merged onto
   HojrehPatternController.prototype by controller.js — see
   controller-core.js for why the class is split this way. Method
   bodies are byte-for-byte identical to the original monolithic
   pricing-patterns.js; only their location changed.
   ═══════════════════════════════════════════════════════════════ */

import { HojrehFormulaEngine } from './formula-engine.js';
import { HojrehPatternController } from './controller-core.js';

const controllerStateMixin = {
  /* ── INSTANCE STATE MUTATION (pure — no DOM required) ──────────── */

  /** Merges this instance's injected catalog (if any) into an engine
   *  options object. Every engine call the controller makes routes
   *  through this so headless mode stays a single source of truth. */
  _registryOptions(extra = {}) {
    return this.registryCatalog ? { registryCatalog: this.registryCatalog, ...extra } : extra;
  },

  /** Swap the injected catalog at runtime (e.g. a background sync job
   *  re-hydrating this instance with fresher prices) without needing
   *  to reconstruct the controller. Pass null to fall back to DOM
   *  scraping again. */
  setRegistryCatalog(catalog) {
    this.registryCatalog = catalog || null;
  },

  nextElementId() {
    this.state.elementCounter += 1;
    return this.state.elementCounter;
  },

  refreshCounterFromElements() {
    let maxId = 0;
    const walk = elems => (elems || []).forEach(el => {
      maxId = Math.max(maxId, Number(el.id || 0));
      if (el.type === 'group' || el.isGroup) walk(el.innerElements || []);
    });
    walk(this.state.elements);
    this.state.elementCounter = Math.max(this.state.elementCounter, maxId);
  },

  makeElement(type, subType) {
    return {
      id: this.nextElementId(),
      type,
      subType: subType || type,
      operator: '+',
      selectedId: '',
      selectedName: 'انتخاب نشده',
      selectedUnit: type === 'constant' ? '٪' : type === 'rounding' ? 'رُندسازی' : 'عدد',
      selectedValue: 0,
      quantitySymbol: '',
      source: '',
      isGroup: type === 'group',
      innerElements: []
    };
  },

  hasBaseFormulaPart(elements = this.state.elements) {
    return (elements || []).some(el => {
      if (el.type === 'variable') return !!el.selectedId;
      if (el.type === 'group' || el.isGroup) return this.hasBaseFormulaPart(el.innerElements || []);
      return false;
    });
  },

  /** Adds a new element to the root of the formula tree.
   *  Returns { ok, reason? } instead of throwing/toasting directly,
   *  so headless callers (bulk generation) can handle failures
   *  without a UI dependency; bindDom() wires toast feedback on top. */
  addElement(type, subType) {
    if (type !== 'group') {
      const dataType = subType || type;
      const options = HojrehFormulaEngine.getRegisteredData
        ? null // resolved via controller helper below, kept for UI parity
        : null;
      const registered = this._getSelectableOptions(dataType);
      if (registered.length <= 1) {
        return { ok: false, reason: 'no-active-items' };
      }
    }

    if ((type === 'constant' || type === 'rounding') && !this.hasBaseFormulaPart()) {
      return { ok: false, reason: 'needs-base-term' };
    }

    const newEl = this.makeElement(type, subType);
    this.state.elements.push(newEl);
    return { ok: true, id: newEl.id };
  },

  removeElementById(id) {
    const info = this._getElementTargetInfo(id);
    if (!info) return false;
    info.array.splice(info.index, 1);
    HojrehFormulaEngine.normalizeElementOperators(info.array);
    HojrehFormulaEngine.normalizeElementOperators(this.state.elements);
    return true;
  },

  findElementById(id, arr = this.state.elements) {
    const numericId = Number(id);
    for (const el of arr || []) {
      if (Number(el.id) === numericId) return el;
      if (el.type === 'group' || el.isGroup) {
        const found = this.findElementById(numericId, el.innerElements || []);
        if (found) return found;
      }
    }
    return null;
  },

  moveElement(id, { targetGroupId = null, insertIndex = 0 } = {}) {
    const info = this._getElementTargetInfo(id);
    if (!info || !Number.isInteger(insertIndex) || insertIndex < 0) return false;
    const dragged = info.array[info.index];

    // Resolve the destination before detaching anything. Headless callers
    // must obey the same no-self/no-descendant rule as the drag UI.
    let destination = this.state.elements;
    if (targetGroupId != null) {
      const target = this.findElementById(targetGroupId);
      if (!target || !(target.type === 'group' || target.isGroup) || !Array.isArray(target.innerElements)) return false;
      if (target === dragged || this.findElementById(targetGroupId, dragged.innerElements || [])) return false;
      destination = target.innerElements;
    }

    // insertIndex is relative to the destination WITHOUT the dragged item.
    // Check the final tree, including the source and all ancestor groups:
    // moving a base away can expose a dependent item without moving it.
    info.array.splice(info.index, 1);
    const destinationIndex = Math.min(insertIndex, destination.length);
    destination.splice(destinationIndex, 0, dragged);
    if (!HojrehFormulaEngine.hasValidElementOrder(this.state.elements)) {
      destination.splice(destinationIndex, 1);
      info.array.splice(info.index, 0, dragged);
      return false;
    }

    // Normalize only after acceptance; rejected moves preserve operators
    // and object/array identities as well as the original order.
    HojrehFormulaEngine.normalizeElementOperators(this.state.elements);
    return true;
  },

  setElements(elements) {
    this.state.elements = HojrehPatternController.cloneElements(elements);
    this.refreshCounterFromElements();
  },

  rememberLastValidFormula() {
    if (this.state.elements.length && this.state.status !== 'red' && this.state.status !== 'yellow') {
      this.state.lastValidElements = HojrehPatternController.cloneElements(this.state.elements);
    }
  },

  restoreLastValidFormula() {
    if (!this.state.lastValidElements.length) return false;
    this.setElements(this.state.lastValidElements);
    return true;
  },

  /** Parses `text` (English-id manual formula) and applies it as the
   *  new element tree if valid. Pure state transition — DOM feedback
   *  (toasts, preview text) is layered on by bindDom()'s wrapper. */
  applyFormulaText(text, { allowEmpty = false, preserveOnEmpty = false } = {}) {
    // Single source-of-truth sanitization point: strip invisible RTL/LTR
    // bidi control marks before anything else touches the text, so every
    // caller (manual-mode commit, live validation, toggle-back-to-verbal)
    // gets clean input regardless of how the raw DOM text was extracted.
    const trimmed = HojrehFormulaEngine.sanitizeBiDiCharacters(String(text || '')).trim();

    if (!trimmed) {
      if (preserveOnEmpty && this.state.elements.length) {
        this._setStatus('green', null);
        return { status: 'green', elements: this.state.elements, recovered: true };
      }
      this.setElements([]);
      this._setStatus('empty', null);
      return { status: 'empty' };
    }

    const basicCheck = HojrehFormulaEngine.validateFormula(trimmed);
    if (!basicCheck.valid) {
      this._setStatus('red', basicCheck.error);
      return { status: 'red', error: basicCheck.error };
    }

    const parsed = HojrehFormulaEngine.parseFormulaString(trimmed, this._registryOptions());
    if (!parsed.valid) {
      this._setStatus('red', parsed.error);
      return { status: 'red', error: parsed.error };
    }
    if (!parsed.renderable) {
      this._setStatus('yellow', parsed.warning || 'فرمول با ساختار بصری امن معادل قطعی ندارد.');
      return { status: 'yellow', warning: parsed.warning };
    }

    this.setElements(parsed.elements || []);
    this._setStatus('green', null);
    return { status: 'green', elements: this.state.elements };
  },

  _setStatus(status, errorMessage) {
    this.state.status = status;
    this.state.errorMessage = errorMessage || '';
    if (status === 'green') this.rememberLastValidFormula();
  },

  getUsedItemIds() {
    const deps = HojrehFormulaEngine.collectDependencies(this.state.elements);
    return [...deps.variables, ...deps.constants, ...deps.roundings];
  },

  isItemUsed(id) {
    return this.getUsedItemIds().includes(HojrehFormulaEngine.normalizeIdentifier(id));
  },

  evaluate(values = this.state.simulatorValues) {
    return HojrehFormulaEngine.evaluateFormula(this.state.elements, values, this._registryOptions());
  },

  /* ── BACKEND-READY COMPILER LAYER ───────────────────────────────── */

  /** Flat postfix/RPN instruction list — see
   *  HojrehFormulaEngine.compileToProgram for the op grammar. This is
   *  what a PHP stack-machine consumes; formula text + AST stay
   *  around purely for editor UX and human-readable audit trails. */
  compileToProgram() {
    return HojrehFormulaEngine.compileToProgram(this.state.elements, this._registryOptions());
  },

  /** Canonical (English id) and display (Persian label) formula text. */
  buildFormulaText(useEnglishIds) {
    return HojrehFormulaEngine.buildFormulaString(this.state.elements, useEnglishIds, this._registryOptions());
  },

  /** Full backend-safe payload: everything WordPress/WooCommerce needs
   *  to store and later re-evaluate this pattern, matching the
   *  schema documented in BACKEND-CONTRACT.md. Works with or without
   *  a bound DOM container. */
  getPayload() {
    // Single-pass reduce over the already activeOnly-filtered variable
    // list from getRegisteredItems() — no secondary lookup pass and no
    // repeated array scans, so this stays O(n) in the active-variable
    // count regardless of how large the overall catalog is.
    const activeVariables = HojrehFormulaEngine.getRegisteredItems(
      this._registryOptions({ activeOnly: true })
    ).variables;
    const dependencies = HojrehFormulaEngine.collectDependencies(this.state.elements);
    const usedVariableIds = new Set(dependencies.variables);
    const apiSymbols = [...new Set(activeVariables
      .filter(v => v.source === 'api' && usedVariableIds.has(v.id) && /^[A-Z0-9_]{2,40}$/.test(v.apiSymbol || ''))
      .map(v => v.apiSymbol))].sort();
    const ojratMap = activeVariables.reduce((map, v) => {
      if (v.ojrat > 0) map[v.id] = v.ojrat;
      return map;
    }, {});

    return {
      schemaVersion: 2,
      status: this.state.status,
      error: this.state.errorMessage || null,
      patternId: this.patternId,
      patternName: this.state.patternName,
      formula: this.buildFormulaText(true),
      displayFormula: this.buildFormulaText(false),
      ast: HojrehFormulaEngine.serializeElements(this.state.elements),
      program: this.compileToProgram(),
      dependencies,
      apiSymbols,
      ojrat: ojratMap,
      updatedAt: new Date().toISOString()
    };
  },

  hasChanged() {
    if (this.state.savedFormulaText === null) return false;
    return this.buildFormulaText(true) !== this.state.savedFormulaText;
  },

  commitSnapshot() {
    this.state.savedFormulaText = this.buildFormulaText(true);
  },
};

export { controllerStateMixin };
