/* ═══════════════════════════════════════════════════════════════
   HojrehPatternController — DOM BINDING
   ───────────────────────────────────────────────────────────────
   Optional — every instance is fully usable headlessly. Everything
   here reads this.state and writes into this.container. No other
   instance's DOM or state is ever touched. Re-binding to a
   different container is safe and simply re-points these local
   refs; it never leaks into a shared cursor.

   Exported as a plain mixin object (+ a small static-methods
   object) and merged onto HojrehPatternController by controller.js
   — see controller-core.js for why the class is split this way.
   Method bodies are byte-for-byte identical to the original
   monolithic pricing-patterns.js; only their location changed.
   ═══════════════════════════════════════════════════════════════ */

import {
  showToast, formatNumberWithCommas as formatSharedNumber,
  normalizeUnitSelects
} from '../general.js';
import { HojrehFormulaEngine } from './formula-engine.js';
import { HojrehPatternController } from './controller-core.js';

/* Shared with settings-panel.js via HojrehGeneral (general.js loads
   first on every page that includes this file) — single source of
   truth for Persian-comma (،) thousands formatting. */
function formatNumberWithCommas(num) { return formatSharedNumber(num); }

const controllerDomMixin = {
  bindDom(container) {
    this.container = container;
    const revisionInfo = HojrehPatternController._readRevisionAttr(container);
    this.lastKnownRevision = revisionInfo.revision;
    this.state.isRevisionAuthoritative = revisionInfo.authoritative;
    const dom = this._dom;
    dom.dropZone = container.querySelector('.formula-drop-zone');
    dom.emptyState = container.querySelector('.formula-empty-state');
    dom.itemsContainer = container.querySelector('.formula-items-container');
    dom.previewLarge = container.querySelector('.formula-preview-large-box');
    dom.testInputsGrid = container.querySelector('.test-inputs-grid');
    dom.finalCalcValue = container.querySelector('[id^="finalCalculationValue"], .final-calculation-value');

    this._ensureWarningState();
    this._bindControls();
    return !!(dom.dropZone && dom.itemsContainer && dom.previewLarge);
  },

  isManualMode() {
    return !!this.container?.querySelector('.manual-formula-toggle')?.checked;
  },

  /** Re-render the DOM tree from current state. Safe to call as
   *  often as needed; guarded against re-entrancy per-instance
   *  (this._isRendering), never against any other instance. */
  render(options = {}) {
    if (!this.container || this._isRendering) return;
    this._isRendering = true;
    const syncPreview = options.syncPreview !== false;
    const dom = this._dom;

    HojrehFormulaEngine.normalizeElementOperators(this.state.elements);
    dom.itemsContainer.innerHTML = '';

    if (!this.state.elements.length) {
      if (syncPreview) {
        if (this.isManualMode()) this._setManualPreviewText('');
        else this._updatePreview();
      }
      this._showDropZoneState('empty');
      if (dom.testInputsGrid) dom.testInputsGrid.innerHTML = '';
      if (dom.finalCalcValue) dom.finalCalcValue.textContent = '۰ تومان';
      this.container.querySelector('[id^="finalCalculationSummary"], .final-calculation-summary')?.classList.add('hidden');
      this.syncBackendFields();
      this._isRendering = false;
      this._scheduleHydration();
      return;
    }

    this.state.elements.forEach((el, index) => {
      if (index > 0) dom.itemsContainer.appendChild(this._createOperatorConnectorDom(el));
      dom.itemsContainer.appendChild((el.isGroup || el.type === 'group') ? this._createGroupDom(el) : this._createItemDom(el));
    });

    this._attachDragEvents();
    this._showDropZoneState('normal');
    if (options.enterId != null) this._playEnterAnimation(options.enterId);

    if (syncPreview) {
      if (this.isManualMode()) {
        this._setManualPreviewText(this.buildFormulaText(true));
        this._setStatus('green', null);
      } else {
        this._updatePreview();
      }
    }

    this.updateSimulatorGrid();
    this.syncBackendFields();
    this._isRendering = false;
    this._scheduleHydration();
  },

  /** Plays the exit transition on `box` (a .pattern-item-box or
   *  .computational-group-box) and only removes the underlying
   *  element + re-renders once that transition has actually run.
   *  We pin an explicit pixel max-height first (its own current
   *  height, read via scrollHeight) because `.collapsed-hide` drives
   *  the collapse via `max-height: 0`, and a CSS transition can only
   *  interpolate max-height from a concrete pixel value — not from
   *  the default `none`. */
  _animateOutAndRemove(box, elementId, toastMessage) {
    const startHeight = box.scrollHeight;
    box.style.maxHeight = `${startHeight}px`;
    void box.offsetWidth; // force the pixel value to be painted first

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        box.classList.add('collapsed-hide');
      });
    });

    setTimeout(() => {
      this.removeElementById(elementId);
      this.render({ syncPreview: true });
      showToast(toastMessage, 'green');
    }, 260);
  },

  /** Plays a one-off "enter" transition for the just-added element
   *  (and its operator connector, if any) right after a fresh render.
   *  Every other element in the tree was also just recreated by
   *  render()'s full innerHTML rebuild, but only this one should
   *  visibly animate in — so we snap it to a "pre-enter" state
   *  synchronously (before paint) and release it on the next frame,
   *  letting the box's existing `transition: all .25s ease` carry it
   *  to its normal resting state. */
  _playEnterAnimation(elementId) {
    const dom = this._dom;
    if (!dom.itemsContainer) return;
    const target = dom.itemsContainer.querySelector(
      `[data-element-id="${elementId}"]`
    );
    if (!target) return;
    const connector = target.previousElementSibling?.classList?.contains('operator-connector-row')
      ? target.previousElementSibling
      : null;

    target.classList.add('item-enter');
    connector?.classList.add('item-enter');
    // Force a style flush so the "pre-enter" state above is actually
    // painted before we remove it — otherwise the browser may coalesce
    // both class changes into a single frame and skip the transition.
    void target.offsetWidth;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        target.classList.remove('item-enter');
        connector?.classList.remove('item-enter');
      });
    });
  },

  /** Ensures/creates the hidden inputs WordPress reads on submit,
   *  scoped to this instance's own container element only. */
  ensureBackendFields() {
    if (!this.container) return {};
    const pattern = this.container;
    const patternId = pattern.dataset.id || this.patternId;
    let formulaField = pattern.querySelector('.hojreh-formula-text-field');
    let displayField = pattern.querySelector('.hojreh-formula-display-field');
    let dependenciesField = pattern.querySelector('.hojreh-formula-dependencies-field');
    let payloadField = pattern.querySelector('.hojreh-formula-payload-field');

    if (!formulaField) {
      formulaField = document.createElement('input');
      formulaField.type = 'hidden';
      formulaField.className = 'hojreh-formula-text-field';
      formulaField.dataset.hojrehNoDirty = 'true';
      formulaField.name = `hojreh_patterns[${patternId}][formula]`;
      pattern.appendChild(formulaField);
    }
    if (!displayField) {
      displayField = document.createElement('input');
      displayField.type = 'hidden';
      displayField.className = 'hojreh-formula-display-field';
      displayField.dataset.hojrehNoDirty = 'true';
      displayField.name = `hojreh_patterns[${patternId}][display_formula]`;
      pattern.appendChild(displayField);
    }
    if (!dependenciesField) {
      dependenciesField = document.createElement('textarea');
      dependenciesField.className = 'hojreh-formula-dependencies-field';
      dependenciesField.dataset.hojrehNoDirty = 'true';
      dependenciesField.name = `hojreh_patterns[${patternId}][dependencies]`;
      dependenciesField.hidden = true;
      pattern.appendChild(dependenciesField);
    }
    if (!payloadField) {
      payloadField = document.createElement('textarea');
      payloadField.className = 'hojreh-formula-payload-field';
      payloadField.dataset.hojrehNoDirty = 'true';
      payloadField.name = `hojreh_patterns[${patternId}][payload]`;
      payloadField.hidden = true;
      pattern.appendChild(payloadField);
    }
    return { formulaField, displayField, dependenciesField, payloadField };
  },

  syncBackendFields() {
    const fields = this.ensureBackendFields();
    if (!fields.formulaField || !fields.payloadField) return;
    const payload = this.getPayload();
    fields.formulaField.value = payload.formula || '';
    if (fields.displayField) fields.displayField.value = payload.displayFormula || '';
    if (fields.dependenciesField) fields.dependenciesField.value = JSON.stringify(payload.dependencies || {});
    fields.payloadField.value = JSON.stringify(payload);

    if (this.state.savedFormulaText === null) {
      this.state.savedFormulaText = fields.formulaField.value;
    } else {
      window._hojrehRefreshSettingsDot?.();
    }
  },

  /* ── Internal DOM builders / control wiring ─────────────────── */

  _getSelectableOptions(subType) {
    const emptyLabelMap = {
      variable: 'انتخاب متغیر',
      'independent-variable': 'انتخاب متغیر مستقل',
      'api-variable': 'انتخاب متغیر وابسته به API',
      constant: 'انتخاب ثابت',
      rounding: 'انتخاب مکانیزم'
    };
    const options = [{ id: '', name: emptyLabelMap[subType] || 'انتخاب آیتم' }];
    const items = HojrehFormulaEngine.getRegisteredItems(this._registryOptions({ activeOnly: true }));

    if (subType === 'variable' || subType === 'independent-variable' || subType === 'api-variable') {
      const sourceFilter = subType === 'api-variable' ? 'api' : subType === 'independent-variable' ? 'independent' : null;
      items.variables
        .filter(v => !sourceFilter || v.source === sourceFilter)
        .forEach(v => {
          if (!v.id) return;
          options.push({ id: v.id, name: v.name, unit: v.unit, value: v.price, source: v.source, subType: v.subType, quantitySymbol: v.quantitySymbol });
        });
    } else if (subType === 'constant') {
      items.constants.forEach(c => { if (c.id) options.push({ id: c.id, name: c.name, unit: '٪', value: c.percent, subType: 'constant' }); });
    } else if (subType === 'rounding') {
      items.roundings.forEach(r => { if (r.id) options.push({ id: r.id, name: r.name, unit: 'رُندسازی', value: 0, subType: 'rounding' }); });
    }
    return options;
  },

  _resolveElementSubType(el) {
    if (el.subType && el.subType !== 'variable') return el.subType;
    if (el.type === 'variable' && el.selectedId) {
      const item = HojrehFormulaEngine.findItemById(el.selectedId, this._registryOptions({ activeOnly: false }));
      if (item?.source === 'api') return 'api-variable';
      if (item?.source === 'independent') return 'independent-variable';
    }
    return el.type;
  },

  _getElementTargetInfo(elementId) {
    const id = Number(elementId);
    const idx = this.state.elements.findIndex(e => Number(e.id) === id);
    if (idx !== -1) return { array: this.state.elements, index: idx, parent: null };

    const search = (arr, parent) => {
      for (const el of arr) {
        if (el.type === 'group' || el.isGroup) {
          const innerIndex = (el.innerElements || []).findIndex(child => Number(child.id) === id);
          if (innerIndex !== -1) return { array: el.innerElements, index: innerIndex, parent: el };
          const found = search(el.innerElements || [], el);
          if (found) return found;
        }
      }
      return null;
    };
    return search(this.state.elements, null);
  },

  _ensureWarningState() {
    const dom = this._dom;
    if (!dom.dropZone || dom.dropZone.querySelector('.formula-warning-state')) return;
    const ws = document.createElement('div');
    ws.className = 'formula-error-state formula-warning-state';
    ws.style.display = 'none';
    ws.innerHTML = `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="formula-svg" style="color:#f59e0b">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
      </svg>
      <div class="formula-empty-title" style="color:#d97706">فرمول نیازمند بازبینی است</div>
      <div class="formula-empty-desc">فرمول قابل خواندن است، اما با ساختار بصری امن حجره معادل قطعی ندارد.</div>
    `;
    dom.dropZone.appendChild(ws);
  },

  _showDropZoneState(state) {
    const emptyState = this.container?.querySelector('.formula-empty-state');
    const errorState = this.container?.querySelector('.formula-error-state');
    const warningState = this.container?.querySelector('.formula-warning-state');
    const dom = this._dom;

    if (emptyState) emptyState.style.display = 'none';
    if (errorState) errorState.classList.remove('active');
    if (warningState) { warningState.style.display = 'none'; warningState.classList.remove('active'); }
    dom.itemsContainer.style.display = 'none';

    if (state === 'empty') { if (emptyState) emptyState.style.display = 'flex'; }
    else if (state === 'warning') { if (warningState) { warningState.style.display = 'flex'; warningState.classList.add('active'); } }
    else if (state === 'error') { if (errorState) errorState.classList.add('active'); }
    else {
      // .formula-items-container defaults to `display: none` in the
      // stylesheet, so resetting the inline style to '' would just fall
      // back to that hidden default. Force the actual layout value the
      // container is designed for (flex-direction: column).
      dom.itemsContainer.style.display = 'flex';
    }
  },

  _setManualPreviewText(text) {
    const dom = this._dom;
    dom.previewLarge.textContent = text || '';
    dom.previewLarge.classList.toggle('has-formula', !!text);
  },

  _updatePreview() {
    const dom = this._dom;
    if (this.isManualMode()) return;
    dom.previewLarge.removeAttribute('contenteditable');
    dom.previewLarge.classList.remove('formula-valid', 'formula-invalid', 'formula-warning');
    dom.previewLarge.style.borderColor = '';

    if (!this.state.elements.length) {
      dom.previewLarge.classList.remove('has-formula');
      dom.previewLarge.textContent = 'برای نمایش فرمول، آیتم‌ها را به باکس بالا اضافه کنید.';
      this._showDropZoneState('empty');
      return;
    }
    dom.previewLarge.classList.add('has-formula');
    dom.previewLarge.textContent = this.buildFormulaText(false);
    this._showDropZoneState('normal');
  },

  _applyStatusToDom(status, errorMsg) {
    const dom = this._dom;
    dom.previewLarge.classList.remove('formula-valid', 'formula-invalid', 'formula-warning');
    if (status === 'green') {
      dom.previewLarge.classList.add('formula-valid');
      dom.previewLarge.style.borderColor = '';
      this._showDropZoneState('normal');
    } else if (status === 'yellow') {
      dom.previewLarge.classList.add('formula-warning');
      dom.previewLarge.style.borderColor = '#f59e0b';
      this._showDropZoneState('warning');
      if (errorMsg) showToast(errorMsg, 'yellow');
    } else if (status === 'empty') {
      dom.previewLarge.style.borderColor = '';
      this._showDropZoneState('empty');
    } else {
      dom.previewLarge.classList.add('formula-invalid');
      dom.previewLarge.style.borderColor = '';
      this._showDropZoneState('error');
      if (errorMsg) showToast('خطا: ' + errorMsg, 'red');
    }
    this.syncBackendFields();
  },

  _createOperatorConnectorDom(el) {
    const row = document.createElement('div');
    row.className = 'operator-connector-row';
    const selector = document.createElement('div');
    selector.className = 'operator-selector-badge';
    const currentOp = el.operator === '*' ? '×' : '+';
    const plusIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round"><line x1="12" y1="4" x2="12" y2="20"/><line x1="4" y1="12" x2="20" y2="12"/></svg>`;
    const timesIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.75" stroke-linecap="round"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>`;
    selector.innerHTML = `
      <div class="operator-options-dropdown">
        <div class="operator-opt ${currentOp === '+' ? 'selected' : ''}" data-op="+">${plusIcon}</div>
        <div class="operator-opt ${currentOp === '×' ? 'selected' : ''}" data-op="*">${timesIcon}</div>
      </div>
    `;
    const opts = selector.querySelectorAll('.operator-opt');
    opts.forEach(opt => { if (!opt.classList.contains('selected')) opt.style.display = 'none'; });
    opts.forEach(opt => {
      opt.addEventListener('click', e => {
        e.stopPropagation();
        el.operator = opt.getAttribute('data-op') === '*' ? '*' : '+';
        this.render({ syncPreview: true });
      });
    });
    selector.addEventListener('mouseenter', () => opts.forEach(o => { o.style.display = 'flex'; }));
    selector.addEventListener('mouseleave', () => opts.forEach(o => { if (!o.classList.contains('selected')) o.style.display = 'none'; }));
    row.appendChild(selector);
    return row;
  },

  _createItemDom(el) {
    const wrapper = document.createElement('div');
    wrapper.className = 'pattern-item-box';
    wrapper.dataset.elementId = el.id;

    const dragHandle = document.createElement('div');
    dragHandle.className = 'acc-drag-handle';
    dragHandle.innerHTML = `<svg viewBox="0 0 16 24" fill="currentColor"><circle cx="4" cy="4" r="2"/><circle cx="12" cy="4" r="2"/><circle cx="4" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="4" cy="20" r="2"/><circle cx="12" cy="20" r="2"/></svg>`;

    const searchWrapper = document.createElement('div');
    searchWrapper.className = 'pattern-item-search-wrapper';
    const select = document.createElement('select');
    const dataType = this._resolveElementSubType(el);
    el.subType = dataType;
    const optionsData = this._getSelectableOptions(dataType);
    const hasActiveSelected = !!(el.selectedId && optionsData.some(opt => opt.id === el.selectedId));
    if (el.selectedId && !hasActiveSelected) {
      const fallback = HojrehFormulaEngine.findItemById(el.selectedId, this._registryOptions({ activeOnly: false }));
      optionsData.push({
        id: el.selectedId,
        name: fallback ? `${fallback.name} (غیرفعال/قفل‌شده)` : `${el.selectedId} (تعریف‌نشده)`,
        unit: fallback?.unit || el.selectedUnit || 'واحد',
        value: fallback?.price ?? fallback?.percent ?? el.selectedValue ?? 0,
        source: fallback?.source || el.source || '',
        subType: fallback?.subType || el.subType || dataType,
        quantitySymbol: fallback?.quantitySymbol || el.quantitySymbol || '',
        disabled: true
      });
      wrapper.classList.add('pattern-item-invalid');
      wrapper.title = fallback
        ? 'این آیتم در فرمول وجود دارد اما فعلاً غیرفعال است؛ تا اصلاح نشود در فرمول‌های جدید معتبر نیست.'
        : 'این شناسه در تنظیمات تعریف نشده است.';
    }
    optionsData.forEach((opt, idx) => {
      const o = document.createElement('option');
      o.value = opt.id;
      o.textContent = opt.name;
      if (opt.disabled || (!opt.id && idx > 0)) o.disabled = true;
      if (opt.id === el.selectedId) o.selected = true;
      select.appendChild(o);
    });
    select.addEventListener('change', () => {
      const selectedOpt = optionsData.find(o => o.id === select.value);
      if (selectedOpt && selectedOpt.id) {
        Object.assign(el, {
          selectedId: selectedOpt.id,
          selectedName: selectedOpt.name,
          selectedUnit: selectedOpt.unit,
          selectedValue: selectedOpt.value,
          source: selectedOpt.source || '',
          subType: selectedOpt.subType || el.subType || el.type,
          quantitySymbol: selectedOpt.quantitySymbol || ''
        });
      } else {
        Object.assign(el, {
          selectedId: '', selectedName: 'انتخاب نشده',
          selectedUnit: el.type === 'constant' ? '٪' : el.type === 'rounding' ? 'رُندسازی' : 'عدد',
          selectedValue: 0, source: '', quantitySymbol: ''
        });
      }
      this.refreshPreviewAndSimulator(true);
    });
    searchWrapper.appendChild(select);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'pattern-item-delete-btn';
    deleteBtn.title = 'حذف آیتم';
    deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line><g class="icon-trash-lid"><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><polyline points="3 6 5 6 21 6"></polyline></g></svg>`;
    deleteBtn.addEventListener('click', () => {
      this._animateOutAndRemove(wrapper, el.id, 'جزء مورد نظر از فرمول حذف شد.');
    });

    wrapper.appendChild(dragHandle);
    wrapper.appendChild(searchWrapper);
    wrapper.appendChild(deleteBtn);
    return wrapper;
  },

  _createGroupDom(el) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'computational-group-box';
    groupDiv.dataset.elementId = el.id;

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'pattern-item-delete-btn computational-group-delete-btn';
    const hasItems = !!(el.innerElements && el.innerElements.length);
    deleteBtn.style.opacity = hasItems ? '0' : '1';
    deleteBtn.style.visibility = hasItems ? 'hidden' : 'visible';
    deleteBtn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line><g class="icon-trash-lid"><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><polyline points="3 6 5 6 21 6"></polyline></g></svg>`;
    deleteBtn.addEventListener('click', () => {
      this._animateOutAndRemove(groupDiv, el.id, 'گروه محاسباتی حذف شد.');
    });

    const dragHandle = document.createElement('div');
    dragHandle.className = 'acc-drag-handle computational-group-drag-handle';
    dragHandle.title = 'جابجایی';
    dragHandle.style.cursor = 'grab';
    dragHandle.innerHTML = `<svg viewBox="0 0 16 24" fill="currentColor"><circle cx="4" cy="4" r="2"/><circle cx="12" cy="4" r="2"/><circle cx="4" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="4" cy="20" r="2"/><circle cx="12" cy="20" r="2"/></svg>`;

    const controlsRow = document.createElement('div');
    controlsRow.className = 'computational-group-controls';
    controlsRow.appendChild(dragHandle);
    controlsRow.appendChild(deleteBtn);

    const groupHeader = document.createElement('div');
    groupHeader.className = 'computational-group-header';
    const groupLabel = document.createElement('span');
    groupLabel.className = 'computational-group-label';
    groupLabel.textContent = 'گروه محاسباتی';
    groupHeader.appendChild(groupLabel);
    groupHeader.appendChild(controlsRow);

    const body = document.createElement('div');
    body.className = 'computational-group-body';
    body.dataset.groupId = el.id;

    if (!hasItems) {
      body.textContent = 'آیتم‌ها را به این داخل بکشید.';
    } else {
      el.innerElements.forEach((innerEl, idx) => {
        if (idx > 0) body.appendChild(this._createOperatorConnectorDom(innerEl));
        body.appendChild((innerEl.isGroup || innerEl.type === 'group') ? this._createGroupDom(innerEl) : this._createItemDom(innerEl));
      });
    }

    groupDiv.appendChild(groupHeader);
    groupDiv.appendChild(body);
    return groupDiv;
  },

  refreshPreviewAndSimulator(forceTextSync) {
    if (this.isManualMode()) {
      if (forceTextSync) {
        this._setManualPreviewText(this.buildFormulaText(true));
        this._applyStatusToDom('green', null);
        this._setStatus('green', null);
      } else if (this.state.status === 'green') {
        this.updateSimulatorGrid();
        this.syncBackendFields();
      }
      return;
    }
    this._updatePreview();
    this.updateSimulatorGrid();
    this.syncBackendFields();
  },

  refreshAfterRegistryChange() {
    HojrehPatternController.ensureUnifiedUnitSelectOptions(document);
    if (!this.state.elements.length) { this.syncBackendFields(); return; }
    if (this.isManualMode()) {
      this.render({ syncPreview: false });
      if (this.state.status === 'green') this.updateSimulatorGrid();
    } else {
      this.render({ syncPreview: true });
    }
  },

  /* ── Drag & drop ─────────────────────────────────────────────
     Fully instance-scoped: reads/writes only this.state.elements
     and this._dom.itemsContainer. Two controllers dragging at the
     same time (e.g. two open accordions) never interfere. */

  _attachDragEvents() {
    const dom = this._dom;
    dom.itemsContainer.querySelectorAll('.acc-drag-handle').forEach(handle => {
      handle.replaceWith(handle.cloneNode(true)); // drop any stale listeners
    });
    dom.itemsContainer.querySelectorAll('.acc-drag-handle').forEach(handle => {
      const start = e => this._startDrag(e);
      handle.addEventListener('mousedown', start);
      handle.addEventListener('touchstart', start, { passive: false });
    });
  },

  _startDrag(e) {
    e.preventDefault();
    e.stopPropagation();
    const dom = this._dom;

    const item = e.currentTarget.closest('.pattern-item-box') || e.currentTarget.closest('.computational-group-box');
    if (!item) return;

    const elementId = Number(item.dataset.elementId);
    const info = this._getElementTargetInfo(elementId);
    const draggedElData = info ? info.array[info.index] : null;
    if (!draggedElData) return;

    const rect = item.getBoundingClientRect();
    const startY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
    const offsetY = startY - rect.top;

    /* Lock the ghost to the column it started in: fixed left/width,
       only `top` tracks the pointer. This mirrors the accordion drag
       behaviour and stops the item from drifting across the page. */
    const ghost = item.cloneNode(true);
    ghost.classList.add('formula-drag-ghost');
    ghost.style.cssText = `position:fixed;width:${rect.width}px;height:${rect.height}px;left:${rect.left}px;top:${rect.top}px;z-index:9999;pointer-events:none;margin:0;transition:none;`;

    /* Force the grabbing cursor for the whole gesture — the ghost has
       pointer-events:none and the live item is hidden, so nothing under
       the pointer would otherwise show a drag cursor. */
    document.body.classList.add('formula-dragging');

    ghost.querySelectorAll('.pattern-item-search-wrapper').forEach(sw => {
      const liveSw = item.querySelector('.pattern-item-search-wrapper');
      const liveTrigger = liveSw && liveSw.querySelector('.custom-select-trigger');
      const labelText = liveTrigger ? liveTrigger.textContent.trim() : '';
      sw.querySelectorAll('.custom-select-wrapper').forEach(w => w.remove());
      sw.querySelectorAll('select').forEach(s => s.remove());

      const staticTrigger = document.createElement('div');
      staticTrigger.className = 'custom-select-wrapper rounded-select';
      staticTrigger.style.cssText = 'pointer-events:none;';
      const staticFace = document.createElement('div');
      staticFace.className = 'custom-select-trigger';
      staticFace.textContent = labelText;
      const staticArrow = document.createElement('span');
      staticArrow.className = 'custom-select-arrow';
      staticArrow.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
      staticTrigger.appendChild(staticFace);
      staticTrigger.appendChild(staticArrow);
      sw.appendChild(staticTrigger);
    });

    /* Keep a Woo-modal drag ghost inside the same scoped modal root.
       The ghost is still position:fixed, so its viewport coordinates do not
       change, but it now retains the exact modal-only drag-handle, trash,
       typography and token styles instead of visually collapsing when moved
       under <body>. On the settings page there is no modal root, so the
       existing body-host behaviour is preserved. */
    const ghostHost = item.closest('.hojreh-formula-modal') || document.body;
    ghostHost.appendChild(ghost);

    /* All operator-connector badges currently in play get pooled here so
       they can be reused as we shuffle the placeholder around — a badge
       always sits between two boxes, never attached to one specific item,
       so on every move we rebuild the "one connector per gap" layout for
       whichever container (top-level list or a group body) currently
       holds the placeholder, reusing pooled nodes instead of recreating
       them so nothing flickers or gets orphaned mid-drag. */
    const connectorPool = [...dom.itemsContainer.querySelectorAll('.operator-connector-row')];

    const ph = document.createElement('div');
    ph.className = 'formula-drag-placeholder';
    ph.style.cssText = `height:${rect.height}px;min-height:${rect.height}px;margin:0;box-sizing:border-box;`;
    item.style.display = 'none';
    item.after(ph);

    const getTargetGroup = (cx, cy) => {
      let found = null;
      dom.itemsContainer.querySelectorAll('.computational-group-body').forEach(gb => {
        const groupId = Number(gb.dataset.groupId);
        if (groupId === elementId) return;
        const draggedAsGroup = this.findElementById(elementId);
        if (draggedAsGroup && (draggedAsGroup.type === 'group' || draggedAsGroup.isGroup)) {
          const parent = this.findElementById(groupId, draggedAsGroup.innerElements || []);
          if (parent) return;
        }
        const r = gb.getBoundingClientRect();
        if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) found = gb;
      });
      return found;
    };

    /* Ensures `container` has exactly one connector badge between every
       pair of adjacent boxes (item/group boxes, with `ph` standing in for
       the dragged one) and none anywhere else — before the first box,
       after the last, or inside any other container. Pulls badges from
       connectorPool as needed and returns any it no longer needs there.
       `item` itself is excluded on purpose: it's only display:none'd, not
       removed from the DOM, so it's still sitting at its original spot
       with the `pattern-item-box` class — counting it as well as `ph`
       is what was producing one phantom extra gap (and an extra badge)
       right where the dragged item used to live. */
    const layoutConnectors = container => {
      const boxes = [...container.children].filter(c =>
        c !== item && (c.classList.contains('pattern-item-box') || c.classList.contains('computational-group-box') || c === ph));
      // strip every connector currently inside this container back into the pool.
      // Must actually detach it from the DOM here (not just track it in the
      // pool array) — otherwise a badge this container no longer needs (e.g.
      // a group left with only one item after its sibling drags out) is
      // never picked up by the re-insertion loop below and stays stuck
      // wherever it physically was, instead of disappearing.
      [...container.querySelectorAll(':scope > .operator-connector-row')].forEach(c => {
        c.remove();
        if (!connectorPool.includes(c)) connectorPool.push(c);
      });
      for (let i = 1; i < boxes.length; i++) {
        const badge = connectorPool.pop() || this._createOperatorConnectorDom({ operator: '+' });
        container.insertBefore(badge, boxes[i]);
      }
    };

    const onMove = ev => {
      ev.preventDefault();
      const cy = ev.type === 'touchmove' ? ev.touches[0].clientY : ev.clientY;
      const cx = ev.type === 'touchmove' ? ev.touches[0].clientX : ev.clientX;
      /* left/width stay pinned to the starting column — only vertical
         position tracks the pointer, so the item can't drift sideways
         out of its own list the way it used to. */
      ghost.style.top = (cy - offsetY) + 'px';

      const tg = getTargetGroup(cx, cy);
      dom.itemsContainer.querySelectorAll('.computational-group-body').forEach(gb => gb.classList.remove('drag-over'));

      const targetContainer = tg || dom.itemsContainer;
      if (tg) tg.classList.add('drag-over');

      const directItems = [...targetContainer.children].filter(c =>
        (c.classList.contains('pattern-item-box') || c.classList.contains('computational-group-box')) && c !== item);
      const after = directItems.find(s => cy < s.getBoundingClientRect().top + s.getBoundingClientRect().height / 2);
      after ? targetContainer.insertBefore(ph, after) : targetContainer.appendChild(ph);

      /* Re-lay every container, not just the one the placeholder just
         entered — pulling a pooled badge out of another group's body
         leaves a gap there that only that group's own pass will refill. */
      layoutConnectors(dom.itemsContainer);
      dom.itemsContainer.querySelectorAll('.computational-group-body').forEach(gb => layoutConnectors(gb));
    };

    const onUp = () => {
      // Commit the placeholder's actual destination before restoring layout.
      // The hidden original still occupies a DOM slot, but is not part of
      // the destination index expected by moveElement().
      const targetContainer = ph.parentElement;
      const targetGroupId = targetContainer.classList.contains('computational-group-body')
        ? Number(targetContainer.dataset.groupId) : null;
      const targetChildren = [...targetContainer.children];
      const phIdx = targetChildren.indexOf(ph);
      const insertIndex = targetChildren.slice(0, phIdx).filter(c =>
        c !== item && (c.classList.contains('pattern-item-box') || c.classList.contains('computational-group-box'))).length;

      ghost.remove();
      item.style.display = '';
      document.body.classList.remove('formula-dragging');
      dom.itemsContainer.querySelectorAll('.computational-group-body').forEach(gb => gb.classList.remove('drag-over'));

      ph.remove();
      const moved = this.moveElement(elementId, { targetGroupId, insertIndex });
      if (!moved) showToast('جابه‌جایی مجاز نیست؛ ثابت درصدی و رُندسازی باید بعد از یک متغیر یا گروه دارای متغیر باشند.', 'yellow');
      this.render({ syncPreview: true });
      cleanup();
    };

    const cleanup = () => {
      document.body.classList.remove('formula-dragging');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  },

  /* ── Simulator grid ──────────────────────────────────────────── */

  updateSimulatorGrid() {
    const dom = this._dom;
    if (!dom.testInputsGrid) return;
    dom.testInputsGrid.innerHTML = '';
    const testSectionLabel = this.container?.querySelector('[id^="testSectionLabel"]');
    const finalCalculationSummary = this.container?.querySelector('[id^="finalCalculationSummary"], .final-calculation-summary');
    const variablesAdded = [];
    const items = HojrehFormulaEngine.getRegisteredItems(this._registryOptions({ activeOnly: false }));

    const processEl = el => {
      if (el.isGroup || el.type === 'group') { (el.innerElements || []).forEach(processEl); return; }
      if (!el.selectedId || el.type !== 'variable') return;
      if (variablesAdded.includes(el.selectedId)) return;
      variablesAdded.push(el.selectedId);

      const varInfo = items.variables.find(v => v.id === el.selectedId);
      if (varInfo) Object.assign(el, {
        selectedName: varInfo.name, selectedUnit: varInfo.unit, selectedValue: varInfo.price,
        quantitySymbol: varInfo.quantitySymbol, subType: varInfo.subType || el.subType, source: varInfo.source || el.source || ''
      });

      const unitLabel = varInfo?.unit || el.selectedUnit || 'واحد';
      const displayName = varInfo?.name || el.selectedName || 'بدون نام';
      const currentPrice = Number.isFinite(varInfo?.price) ? varInfo.price : (el.selectedValue || 0);

      const priceGroup = document.createElement('div');
      priceGroup.className = 'form-group';
      priceGroup.innerHTML = `
        <span class="form-label">${HojrehFormulaEngine.getPriceFieldLabel(displayName, unitLabel)}</span>
        <input type="text" class="form-control simulator-price-input"
          data-id="${el.selectedId}" data-unit="${unitLabel}"
          value="${formatNumberWithCommas(currentPrice)}" />
      `;
      priceGroup.querySelector('input').addEventListener('input', e => {
        const numericValue = HojrehFormulaEngine.parseNumberValue(e.target.value, NaN);
        if (Number.isFinite(numericValue)) e.target.value = formatNumberWithCommas(numericValue);
        this.calculateSimulatorFinalPrice();
      });
      dom.testInputsGrid.appendChild(priceGroup);

      const quantityGroup = document.createElement('div');
      quantityGroup.className = 'form-group';
      quantityGroup.innerHTML = `
        <span class="form-label">${HojrehFormulaEngine.getQuantityFieldLabel(displayName, unitLabel)}</span>
        <input type="number" class="form-control simulator-qty-input"
          data-id="${el.selectedId}" value="1" min="0" step="0.01" />
      `;
      quantityGroup.querySelector('input').addEventListener('input', () => this.calculateSimulatorFinalPrice());
      dom.testInputsGrid.appendChild(quantityGroup);
    };

    this.state.elements.forEach(processEl);

    if (variablesAdded.length) {
      if (testSectionLabel) testSectionLabel.style.display = 'block';
      if (finalCalculationSummary) finalCalculationSummary.classList.remove('hidden');
    } else {
      if (testSectionLabel) testSectionLabel.style.display = 'none';
      if (finalCalculationSummary) finalCalculationSummary.classList.add('hidden');
    }
    this.calculateSimulatorFinalPrice();
  },

  calculateSimulatorFinalPrice() {
    const values = {};
    this.container?.querySelectorAll('.simulator-price-input[data-id]').forEach(input => {
      const id = input.dataset.id;
      values[id] = values[id] || {};
      values[id].price = HojrehFormulaEngine.parseNumberValue(input.value, 0);
    });
    this.container?.querySelectorAll('.simulator-qty-input[data-id]').forEach(input => {
      const id = input.dataset.id;
      values[id] = values[id] || {};
      values[id].quantity = HojrehFormulaEngine.parseNumberValue(input.value, 0);
    });
    this.state.simulatorValues = values;
    const total = this.evaluate(values);
    if (this._dom.finalCalcValue) this._dom.finalCalcValue.textContent = formatNumberWithCommas(total) + ' تومان';
  },

  /* ── Manual formula mode ─────────────────────────────────────── */

  setManualSensitiveFieldsVisibility(isManual) {
    // Scoped to this instance's own container — document-wide selectors here
    // would toggle fields belonging to *every* pattern accordion on the
    // page, breaking multi-instance isolation.
    const scope = this.container || document;
    scope.querySelectorAll('.english-id-group').forEach(g => { g.style.display = isManual ? 'block' : 'none'; });
    scope.querySelectorAll('.quantity-symbol-group').forEach(g => { g.style.display = isManual ? 'block' : 'none'; });
  },

  enableManualFormulaMode() {
    const manual = this.isManualMode();
    const hint = this.container?.querySelector('[id^="formulaHint"], .formula-hint');
    this.setManualSensitiveFieldsVisibility(manual);
    const dom = this._dom;

    if (!manual) {
      const result = this.applyFormulaText(HojrehFormulaEngine.sanitizeBiDiCharacters(dom.previewLarge.textContent), { allowEmpty: true, preserveOnEmpty: true });
      this._applyStatusToDom(result.status, null);
      if (result.status === 'red' || result.status === 'yellow') {
        this.restoreLastValidFormula();
        showToast('فرمول دستی نامعتبر ذخیره نشد و آخرین ساختار معتبر نمایش داده شد.', 'yellow');
      }
      dom.previewLarge.removeAttribute('contenteditable');
      if (hint) hint.style.display = 'none';
      dom.previewLarge.classList.remove('formula-valid', 'formula-invalid', 'formula-warning');
      this.render({ syncPreview: true });
      return;
    }

    dom.previewLarge.setAttribute('contenteditable', 'true');
    if (hint) hint.style.display = 'block';
    this._setManualPreviewText(this.buildFormulaText(true));
    if (this.state.elements.length) {
      this.render({ syncPreview: false });
      this._setStatus('green', null);
      this._applyStatusToDom('green', null);
    } else {
      this._setStatus('empty', null);
      this._applyStatusToDom('empty', null);
    }
  },

  validateAndApplyFormula(options = {}) {
    const dom = this._dom;
    const text = HojrehFormulaEngine.sanitizeBiDiCharacters(dom.previewLarge.textContent).trim();
    const result = this.applyFormulaText(text, options);
    this._applyStatusToDom(result.status, options.silent ? null : (result.error || result.warning));

    if (result.status === 'empty') {
      dom.previewLarge.classList.remove('has-formula', 'formula-valid', 'formula-invalid', 'formula-warning');
      this.render({ syncPreview: false });
    } else if (result.status === 'green') {
      dom.previewLarge.classList.add('has-formula');
      this.render({ syncPreview: false });
      this.updateSimulatorGrid();
    } else {
      dom.previewLarge.classList.add('has-formula');
    }
    return result;
  },

  /* ── Control wiring (add-item buttons, manual toggle, preview edits) ── */

  _bindControls() {
    const pattern = this.container;
    if (!pattern || pattern.dataset.patternControlsReady === 'true') return;
    pattern.dataset.patternControlsReady = 'true';

    const commitManualIfNeeded = () => {
      if (!this.isManualMode()) return true;
      const result = this.validateAndApplyFormula({ silent: true });
      if (result.status === 'green' || result.status === 'empty') return true;
      showToast('فرمول دستی فعلی معتبر نیست؛ ابتدا آن را اصلاح کنید تا بتوان آیتم جدید اضافه کرد.', 'yellow');
      return false;
    };

    const addAndRender = (type, subType) => {
      if (!commitManualIfNeeded()) return;
      const result = this.addElement(type, subType);
      if (!result.ok) {
        const msg = result.reason === 'no-active-items'
          ? 'برای افزودن این جزء، ابتدا یک آیتم فعال در تنظیمات تعریف کنید.'
          : (type === 'constant'
            ? 'ثابت درصدی نمی‌تواند اولین آیتم باشد؛ ابتدا یک متغیر انتخاب‌شده یا گروه دارای متغیر اضافه کنید.'
            : 'مکانیزم رُندسازی نمی‌تواند اولین آیتم باشد؛ ابتدا یک متغیر انتخاب‌شده یا گروه دارای متغیر اضافه کنید.');
        showToast(msg, 'yellow');
        return;
      }
      this.render({ syncPreview: true, enterId: result.id });
      showToast('آیتم جدید به فرمول‌ساز اضافه شد.', 'green');
    };

    const bind = (selector, callback) => {
      pattern.querySelector(selector)?.addEventListener('click', event => {
        event.preventDefault();
        callback();
      });
    };

    bind('[id^="btnGroupAdd"]', () => addAndRender('group'));
    bind('[id^="btnApiVariableAdd"]', () => addAndRender('variable', 'api-variable'));
    bind('[id^="btnIndependentAdd"]', () => addAndRender('variable', 'independent-variable'));
    bind('[id^="btnConstantAdd"]', () => addAndRender('constant'));
    bind('[id^="btnRoundingAdd"]', () => addAndRender('rounding'));
    pattern.querySelector('[id^="formulaTutorialBtn"]')?.addEventListener('click', () => {
      showToast('مستندات و آموزش‌های ویدیویی در آپدیت بعدی قرار خواهند گرفت.', 'yellow');
    });

    const manualToggle = pattern.querySelector('.manual-formula-toggle');
    if (manualToggle && manualToggle.dataset.hojrehManualHandler !== 'settings' && manualToggle.dataset.pricingManualReady !== 'true') {
      manualToggle.dataset.pricingManualReady = 'true';
      manualToggle.addEventListener('change', () => this.enableManualFormulaMode());
    }

    const preview = pattern.querySelector('.formula-preview-large-box');
    if (preview && preview.dataset.formulaPreviewReady !== 'true') {
      preview.dataset.formulaPreviewReady = 'true';
      preview.addEventListener('input', () => {
        if (!this.isManualMode()) return;
        clearTimeout(this._validateTimer);
        this._validateTimer = setTimeout(() => this.validateAndApplyFormula(), 450);
      });
      preview.addEventListener('keydown', event => {
        if (!this.isManualMode()) return;
        if (event.key === 'Enter') { event.preventDefault(); this.validateAndApplyFormula(); }
      });
      preview.addEventListener('paste', event => {
        if (!this.isManualMode()) return;
        event.preventDefault();
        const text = (event.clipboardData || window.clipboardData).getData('text/plain');
        HojrehPatternController._insertPlainTextAtSelection(preview, text.replace(/\n+/g, ' '));
      });
    }
  },

  _scheduleHydration() {
    clearTimeout(this._hydrationTimer);
    this._hydrationTimer = setTimeout(() => this.hydrate(), 60);
  },

  /** Reconciles DOM with state — cheap, idempotent, safe to call on
   *  an interval per-instance if desired (see bootstrap below), but
   *  never needs to "borrow" or restore any other instance's cursor
   *  because there IS no shared cursor. */
  hydrate() {
    if (this._isRendering || !this.container) return;
    const manual = this.isManualMode();
    const dom = this._dom;
    this.setManualSensitiveFieldsVisibility(manual);

    if (manual && dom.previewLarge.getAttribute('contenteditable') !== 'true') {
      dom.previewLarge.setAttribute('contenteditable', 'true');
    }
    if (!manual && dom.previewLarge.hasAttribute('contenteditable')) {
      dom.previewLarge.removeAttribute('contenteditable');
    }

    if (this.state.elements.length > 0 && this.state.status !== 'red' && this.state.status !== 'yellow') {
      const hasVisualItems = !!dom.itemsContainer.querySelector('.pattern-item-box, .computational-group-box');
      if (!hasVisualItems) this.render({ syncPreview: !manual });
      else this._showDropZoneState('normal');
    }
    if (!this.state.elements.length && !HojrehFormulaEngine.sanitizeBiDiCharacters(dom.previewLarge.textContent).trim() && manual) {
      this._showDropZoneState('empty');
    }
    this.syncBackendFields();
  },

  destroy() {
    clearTimeout(this._validateTimer);
    clearTimeout(this._hydrationTimer);
    HojrehPatternController.unregister(this.patternId);
  },
};

/* ── Shared, stateless registry helper kept on the class so every
   instance's control-binding code can call it without depending
   on a module-level function. Attached directly to the class (not
   the prototype) by controller.js. ─────────────────────────────── */
const controllerDomStatics = {
  ensureUnifiedUnitSelectOptions(root = document) {
    const unitOptions = HojrehFormulaEngine.getUnitOptions ? HojrehFormulaEngine.getUnitOptions() : [];
    const selects = (root || document).querySelectorAll ? (root || document).querySelectorAll('select.unit-select') : [];

    selects.forEach(select => {
      const currentValue = select.value || 'عدد';
      const exists = unitOptions.some(unit => unit.value === currentValue);
      select.innerHTML = '';
      unitOptions.forEach(unit => {
        const option = document.createElement('option');
        option.value = unit.value;
        option.textContent = unit.label || unit.value;
        if (unit.value === currentValue) option.selected = true;
        select.appendChild(option);
      });
      if (currentValue && !exists) {
        const customOption = document.createElement('option');
        customOption.value = currentValue;
        customOption.textContent = currentValue;
        customOption.selected = true;
        select.appendChild(customOption);
      }
    });

    normalizeUnitSelects(root);
    HojrehFormulaEngine.syncVariableQuantitySymbols();
  },
};

export { controllerDomMixin, controllerDomStatics };
