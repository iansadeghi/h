import { HojrehFormulaEngine } from './formula-engine.js';
import { HojrehPatternController } from './controller-core.js';
const controllerStateMixin = {
  _registryOptions(extra = {}) {
    return this.registryCatalog ? { registryCatalog: this.registryCatalog, ...extra } : extra;
  },
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
  addElement(type, subType) {
    if (type !== 'group') {
      const dataType = subType || type;
      const options = HojrehFormulaEngine.getRegisteredData
        ? null
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
    let destination = this.state.elements;
    if (targetGroupId != null) {
      const target = this.findElementById(targetGroupId);
      if (!target || !(target.type === 'group' || target.isGroup) || !Array.isArray(target.innerElements)) return false;
      if (target === dragged || this.findElementById(targetGroupId, dragged.innerElements || [])) return false;
      destination = target.innerElements;
    }
    info.array.splice(info.index, 1);
    const destinationIndex = Math.min(insertIndex, destination.length);
    destination.splice(destinationIndex, 0, dragged);
    if (!HojrehFormulaEngine.hasValidElementOrder(this.state.elements)) {
      destination.splice(destinationIndex, 1);
      info.array.splice(info.index, 0, dragged);
      return false;
    }
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
  applyFormulaText(text, { allowEmpty = false, preserveOnEmpty = false } = {}) {
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
  compileToProgram() {
    return HojrehFormulaEngine.compileToProgram(this.state.elements, this._registryOptions());
  },
  buildFormulaText(useEnglishIds) {
    return HojrehFormulaEngine.buildFormulaString(this.state.elements, useEnglishIds, this._registryOptions());
  },
  getPayload() {
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