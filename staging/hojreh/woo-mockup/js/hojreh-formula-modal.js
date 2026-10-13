
import {
  HojrehFormulaEngine,
  HojrehPatternController
} from '../../hojreh/assets/js/pricing-patterns.js';
import {
  showToast,
  formatNumberWithCommas,
  attachNumericInput
} from '../../hojreh/assets/js/general.js';
import { bindThemeActions } from '../../hojreh/assets/js/dark-mode.js';
import { customSelect } from '../../hojreh/assets/js/custom-select.js';

let modalSeq = 0;

function buildFormulaBuilderBoxHTML(suffix) {
  return `
    <div class="pattern-interactive-box hojreh-modal-pattern-interactive-box">
      <div class="pattern-content-pane formula-drop-zone hojreh-modal-formula-drop-zone" id="formulaDropZone_${suffix}">
        <div class="formula-empty-state" id="formulaEmptyState_${suffix}">
          <svg viewBox="0 0 416 400" fill="currentColor" class="formula-svg">
            <path d="M0,0v32v32h32V32h32V0H32H0z M96,0v32h48V0H96z M176,0v32h48V0H176z M256,0v32h32v32h32V0H256z M0,96v64h32V96H0z M288,96v48H96v16v240h320V144h-96V96H288z M128,176h256v192H128V176z M0,192v32v32h64v-32H32v-32H0z"/>
            <rect x="240" y="222.214" width="32" height="99.571"/>
            <rect x="206.214" y="256" width="99.571" height="32"/>
          </svg>
          <div class="formula-empty-title">اجزای قیمت‌گذاری این محصول را اضافه کنید.</div>
          <div class="formula-empty-desc">
            از ستون سمت پایین، آیتم‌های تاثیرگذار بر قیمت این محصول را اضافه کنید.
          </div>
        </div>
        <div class="formula-error-state" id="formulaErrorState_${suffix}">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 460" class="formula-svg formula-error-icon"><path d="M230,0C103.17,0,0,103.18,0,230S103.17,460,230,460,460,356.82,460,230,356.83,0,230,0ZM50,230A178.751,178.751,0,0,1,86.5,121.85L338.15,373.5A178.751,178.751,0,0,1,230,410C130.75,410,50,329.25,50,230ZM373.5,338.15,121.85,86.5A178.751,178.751,0,0,1,230,50c99.25,0,180,80.75,180,180A178.751,178.751,0,0,1,373.5,338.15Z" fill="currentColor"/></svg>
          <div class="formula-empty-title formula-error-title">فرمول نامعتبر است</div>
          <div class="formula-empty-desc">
            شناسه‌های استفاده شده در فرمول باید با شناسه‌های متغیرها، ثابت‌ها و رُندسازی‌های تعریف‌شده مطابقت داشته باشند و ساختار ریاضی فرمول صحیح باشد.
          </div>
        </div>
        <div class="formula-items-container" id="formulaItemsContainer_${suffix}"></div>
      </div>

      <div class="formula-preview-wrapper hojreh-modal-formula-preview-wrapper" id="formulaPreviewWrapper_${suffix}">
        <button class="hojreh-modal-manual-formula-btn" type="button" aria-pressed="false">
          <span>نوشتن دستی فرمول</span>
        </button>
        <input type="checkbox" class="manual-formula-toggle hojreh-modal-manual-formula-toggle" tabindex="-1" aria-hidden="true" />
        <div class="formula-preview-large-box hojreh-modal-formula-preview" id="formulaPreviewLarge_${suffix}" spellcheck="false" autocomplete="off">
          برای نمایش فرمول، آیتم‌ها را به باکس بالا اضافه کنید.
        </div>
      </div>

      <div class="pattern-control-pane hojreh-modal-pattern-control-pane">

        <button class="btn-control-action btn-more" id="btnGroupAdd_${suffix}" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          افزودن گروه محاسباتی (به عنوان پرانتز)
        </button>

        <button class="btn-control-action btn-more" id="btnApiVariableAdd_${suffix}" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          افزودن متغیر وابسته به API
        </button>

        <button class="btn-control-action btn-more" id="btnIndependentAdd_${suffix}" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          افزودن متغیر مستقل
        </button>

        <button class="btn-control-action btn-more" id="btnConstantAdd_${suffix}" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          افزودن ثابت درصدی
        </button>

        <button class="btn-control-action btn-more" id="btnRoundingAdd_${suffix}" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          افزودن مکانیزم رُندسازی
        </button>
      </div>
    </div>
  `;
}


function getRegistryItem(id) {
  const registry = HojrehFormulaEngine.getRegisteredItems({ activeOnly: false });
  return registry.variables.find(v => v.id === id) || null;
}

function getActiveController(instance) {
  if (instance.mode === 'use-pattern') {
    return instance.selectedPatternId
      ? HojrehPatternController.get(instance.selectedPatternId)
      : null;
  }
  return instance.buildController || null;
}

function animatePageSection(element, delay = 0) {
  if (!element) return;
  const animationId = `${Date.now()}_${Math.random()}`;
  element.dataset.hojrehSectionAnimationId = animationId;
  element.classList.remove('hojreh-page-section-enter');
  element.style.setProperty('--hojreh-section-enter-delay', `${delay}ms`);
  void element.offsetWidth;
  element.classList.add('hojreh-page-section-enter');
  const handleAnimationEnd = event => {
    if (event.target !== element) return;
    if (element.dataset.hojrehSectionAnimationId !== animationId) {
      element.removeEventListener('animationend', handleAnimationEnd);
      return;
    }
    element.classList.remove('hojreh-page-section-enter');
    element.style.removeProperty('--hojreh-section-enter-delay');
    delete element.dataset.hojrehSectionAnimationId;
    element.removeEventListener('animationend', handleAnimationEnd);
  };
  element.addEventListener('animationend', handleAnimationEnd);
}

function animatePageSectionGroups(groups) {
  groups.filter(Boolean).forEach((group, index) => {
    const elements = Array.isArray(group) ? group : [group];
    elements.forEach(element => animatePageSection(element, index * 120));
  });
}

function playPendingPageQuantityEntrance(instance) {
  if (
    !instance._pendingPageQtyEntrance ||
    instance._pageQtyHasEntered ||
    !instance.dynamicPricingCheckbox?.checked ||
    !instance.activeDependencyIds?.length
  ) return;

  instance._pendingPageQtyEntrance = false;
  instance._pageQtyHasEntered = true;
  animatePageSection(instance.pageQtySectionEl);
}

function syncDependentUI(instance) {
  const controller = getActiveController(instance);
  const depIds = controller
    ? HojrehFormulaEngine.collectDependencies(controller.state.elements).variables
    : [];
  const key = `${instance.mode}:${instance.selectedPatternId || ''}:${depIds.join('|')}::${controller ? '1' : '0'}`;

  if (key !== instance._lastDepsKey) {
    const hadDependencies = Boolean(instance.activeDependencyIds?.length);
    instance._lastDepsKey = key;
    instance.activeDependencyIds = depIds;
    if (instance.pageQtyContainer) renderQuantitySkeleton(instance.pageQtyContainer, instance);
    if (!hadDependencies && depIds.length && !instance._pageQtyHasEntered) {
      instance._pendingPageQtyEntrance = true;
    } else if (!depIds.length) {
      instance._pendingPageQtyEntrance = false;
    }
  }
  updateFinalPriceDisplays(instance);
}

function renderQuantitySkeleton(container, instance) {
  const rebuild = () => {
    container.innerHTML = '';
    const ids = instance.activeDependencyIds || [];

    if (!ids.length) {
      const hint = document.createElement('div');
      hint.className = 'hojreh-no-formula-hint';
      hint.textContent = instance.mode === 'use-pattern'
        ? 'ابتدا یک الگو را از بالا انتخاب کنید.'
        : 'با افزودن اجزای قیمت‌گذاری، مقادیر مورد نیاز برای محاسبه اینجا نمایش داده می‌شود.';
      container.appendChild(hint);
    } else {

      const grid = document.createElement('div');
      grid.className = 'hojreh-quantity-fields-grid';

      ids.forEach(id => {
        const item = getRegistryItem(id);
        const fullLabel = HojrehFormulaEngine.getQuantityFieldLabel(item?.name, item?.unit);
        const label = container === instance.pageQtyContainer
          ? fullLabel.replace(/\s*\([^()]*\)\s*$/, '')
          : fullLabel;
        const unit = String(item?.unit || 'واحد').trim();

        const group = document.createElement('div');
        group.className = 'form-group';

        const labelEl = document.createElement('label');
        labelEl.className = 'form-label';
        labelEl.textContent = label;

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control';
        input.dataset.varId = id;
        input.value = instance.quantities[id] ?? '1';
        input.addEventListener('input', () => {
          instance.quantities[id] = input.value;
          updateFinalPriceDisplays(instance);
        });
        attachNumericInput(input);

        group.appendChild(labelEl);
        if (container === instance.pageQtyContainer) {
          const inputWrap = document.createElement('div');
          inputWrap.className = 'hojreh-page-input-wrapper';

          const unitEl = document.createElement('span');
          unitEl.className = 'hojreh-page-input-unit';
          unitEl.textContent = unit;

          inputWrap.appendChild(input);
          inputWrap.appendChild(unitEl);
          group.appendChild(inputWrap);
        } else {
          group.appendChild(input);
        }
        grid.appendChild(group);
      });

      container.appendChild(grid);

      if (container !== instance.pageQtyContainer) {
        const priceBar = document.createElement('div');
        priceBar.className = 'hojreh-final-price-bar';
        priceBar.innerHTML = '<span>قیمت نهایی محاسبه‌شده:</span><span class="hojreh-final-price-value">۰ تومان</span>';
        container.appendChild(priceBar);
      }
    }

    container.classList.remove('hojreh-qty-is-leaving');
    container.classList.add('hojreh-qty-is-entering');
    requestAnimationFrame(() => container.classList.remove('hojreh-qty-is-entering'));
  };

  clearTimeout(container._hojrehQtyTransitionTimer);
  if (!container.hasChildNodes()) {
    rebuild();
    return;
  }

  container.classList.add('hojreh-qty-is-leaving');
  container._hojrehQtyTransitionTimer = setTimeout(rebuild, 150);
}

function computeFinalPrice(instance) {
  const controller = getActiveController(instance);
  if (!controller) return 0;
  const values = {};
  (instance.activeDependencyIds || []).forEach(id => {
    values[id] = { quantity: HojrehFormulaEngine.parseNumberValue(instance.quantities[id], 1) };
  });
  return controller.evaluate(values);
}

function clearSalePriceTransition(field) {
  field.classList.remove('hojreh-sale-price-transition', 'hojreh-sale-price-is-leaving', 'hojreh-sale-price-is-entering');
  field.style.removeProperty('height');
  field.style.removeProperty('margin-bottom');
  field.style.removeProperty('overflow');
  field.style.removeProperty('box-sizing');
}

function hideSalePriceField(instance, field) {
  if (field.classList.contains('hojreh-sale-price-is-leaving')) return;
  clearTimeout(instance._salePriceTransitionTimer);

  const startHeight = field.getBoundingClientRect().height;
  instance._salePriceNaturalMargin = getComputedStyle(field).marginBottom;
  field.classList.add('hojreh-sale-price-transition');
  field.style.height = `${startHeight}px`;
  field.style.overflow = 'hidden';
  field.style.boxSizing = 'border-box';
  void field.offsetHeight;

  field.classList.add('hojreh-sale-price-is-leaving');
  field.style.height = '0px';
  field.style.marginBottom = '0px';

  const transitionDuration = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 420;
  instance._salePriceTransitionTimer = setTimeout(() => {
    if (field.classList.contains('hojreh-sale-price-is-leaving')) field.remove();
    clearSalePriceTransition(field);
    instance._salePriceTransitionTimer = null;
  }, transitionDuration);
}

function showSalePriceField(instance, field) {
  clearTimeout(instance._salePriceTransitionTimer);
  const wasLeaving = field.classList.contains('hojreh-sale-price-is-leaving');
  const interruptedHeight = wasLeaving ? field.getBoundingClientRect().height : 0;
  const interruptedMargin = wasLeaving ? getComputedStyle(field).marginBottom : '';
  clearSalePriceTransition(field);

  if (!field.isConnected) {
    const anchor = instance.salePriceOriginalNextSibling?.isConnected
      ? instance.salePriceOriginalNextSibling
      : instance.mountEl;
    instance.priceFieldsParent?.insertBefore(field, anchor);

    const targetHeight = field.getBoundingClientRect().height;
    const targetMargin = getComputedStyle(field).marginBottom;
    field.classList.add('hojreh-sale-price-transition', 'hojreh-sale-price-is-entering');
    field.style.height = '0px';
    field.style.marginBottom = '0px';
    field.style.overflow = 'hidden';
    field.style.boxSizing = 'border-box';
    void field.offsetHeight;
    requestAnimationFrame(() => {
      field.classList.remove('hojreh-sale-price-is-entering');
      field.style.height = `${targetHeight}px`;
      field.style.marginBottom = targetMargin;
    });
  } else if (wasLeaving) {
    const targetHeight = field.scrollHeight;
    field.classList.add('hojreh-sale-price-transition');
    field.style.height = `${interruptedHeight}px`;
    field.style.marginBottom = interruptedMargin;
    field.style.overflow = 'hidden';
    field.style.boxSizing = 'border-box';
    void field.offsetHeight;
    requestAnimationFrame(() => {
      field.style.height = `${targetHeight}px`;
      field.style.marginBottom = instance._salePriceNaturalMargin || '12px';
    });
  } else {
    return;
  }

  const transitionDuration = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 420;
  instance._salePriceTransitionTimer = setTimeout(() => {
    clearSalePriceTransition(field);
    instance._salePriceTransitionTimer = null;
  }, transitionDuration);
}

function syncSalePriceField(instance) {
  const field = instance.salePriceFieldEl;
  if (!field) return;

  const dynamicPricingEnabled = Boolean(instance.dynamicPricingCheckbox?.checked);
  const regularPriceIsFilled = Boolean(instance.regularPriceInput?.value.trim());
  const shouldShow = !dynamicPricingEnabled || regularPriceIsFilled;

  if (shouldShow) showSalePriceField(instance, field);
  else if (field.isConnected) hideSalePriceField(instance, field);

}

function updateFinalPriceDisplays(instance) {
  const price = computeFinalPrice(instance);
  const formatted = `${formatNumberWithCommas(Math.round(price))} تومان`;
  const updatePriceValue = (element) => {
    if (!element || element.textContent === formatted) return;
    element.classList.remove('hojreh-price-is-updating');
    void element.offsetWidth;
    element.textContent = formatted;
    element.classList.add('hojreh-price-is-updating');
  };
  updatePriceValue(instance.pageFinalPriceEl);

  if (instance.regularPriceInput) {
    instance.regularPriceInput.value = Math.round(price) > 0 ? formatNumberWithCommas(Math.round(price)) : '';
  }
  syncSalePriceField(instance);

  if (instance.stockStatusSelectEl || instance.stockStatusInputs.length) {
    const min = HojrehFormulaEngine.parseNumberValue(instance.minPrice, 0);
    const shouldMarkOutOfStock = instance.outOfStockBelowMin && min > 0 && price < min && price > 0;
    const nextValue = shouldMarkOutOfStock ? 'ناموجود' : 'موجود';
    if (instance.stockStatusSelectEl && instance.stockStatusSelectEl.value !== nextValue) {
      instance.stockStatusSelectEl.value = nextValue;
      instance.stockStatusSelectEl.dispatchEvent(new Event('change', { bubbles: true }));
    }
    const nextRadio = instance.stockStatusInputs.find(input => input.value === nextValue);
    if (nextRadio && !nextRadio.checked) {
      nextRadio.checked = true;
      nextRadio.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }
}


function getSavedPatternList(instance) {
  const savedPatterns = Array.from(document.querySelectorAll('#pricingPatternsList .accordion-item[data-type="pattern"]'))
    .filter(el => el.querySelector('.acc-switch input[type="checkbox"]')?.checked)
    .map(el => ({
      id: el.dataset.id,
      name: el.querySelector('.pattern-name-input')?.value
        || el.querySelector('.acc-name')?.textContent?.trim()
        || `الگوی ${el.dataset.id}`
    }));
  return savedPatterns.concat(instance.convertedPatterns || []);
}

const PATTERN_PICKER_EMPTY_ICON = `
  <svg class="hojreh-pattern-picker-empty-icon" viewBox="0 0 126.086 120.359" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M125.95,42.66a2.983,2.983,0,0,0-3.8-1.9l-2.2.7a60.491,60.491,0,0,1-54.1-39.5,3.037,3.037,0,0,0-5.7,2.1,66.706,66.706,0,0,0,46.9,41.6l-18.5,6.1a78.564,78.564,0,0,1-22.5-16.3v-8.2a3,3,0,0,0-6,0v8.2a81.674,81.674,0,0,1-10.4,9.1,3.011,3.011,0,0,0,3.5,4.9,73.4,73.4,0,0,0,6.9-5.6v15.3l-41.1-13.5a65.685,65.685,0,0,0,19-7.8,2.984,2.984,0,1,0-3.1-5.1,59.791,59.791,0,0,1-28.7,8.7l-2.2-.7a3,3,0,0,0-1.9,5.7l2.7.8a57.54,57.54,0,0,1,11.2,11.9,61.222,61.222,0,0,1,7.7,14.8,59.208,59.208,0,0,1,3.4,16.2,2.971,2.971,0,0,0,3,2.8h.2a3.012,3.012,0,0,0,2.8-3.2,68,68,0,0,0-3.7-17.8,66.584,66.584,0,0,0-8.5-16.3c-1-1.4-2.1-2.8-3.2-4.2l18.4,6.1a75.9,75.9,0,0,1,8.4,26.2l-23,31.7a2.953,2.953,0,0,0,.7,4.2,2.792,2.792,0,0,0,1.8.6,2.982,2.982,0,0,0,2.4-1.2l4.1-5.7h0a60.379,60.379,0,0,1,65.1.1v.1l4,5.6a2.982,2.982,0,0,0,2.4,1.2,3.226,3.226,0,0,0,1.8-.6,3.122,3.122,0,0,0,.7-4.2l-3.3-4.6v-.2a60.121,60.121,0,0,1,20.2-63.4l2.6-.8A3.235,3.235,0,0,0,125.95,42.66Zm-58.1,22.2,14.2-4.7a82.3,82.3,0,0,0-5.4,16.8Zm12.7-10.5-14.5,4.8V43.76A82.892,82.892,0,0,0,80.55,54.36Zm-36.6,5.8,17.2,5.6,10.5,14.5a83.36,83.36,0,0,0-17.3,0l4.1-5.6a3.011,3.011,0,1,0-4.9-3.5l-4.2,5.8A82.3,82.3,0,0,0,43.95,60.16Zm49.9,45.2a66.77,66.77,0,0,0-55.6-2.8l11.3-15.6a81.563,81.563,0,0,1,27,0l5.5,7.6a2.982,2.982,0,0,0,2.4,1.2,3.226,3.226,0,0,0,1.8-.6,3.122,3.122,0,0,0,.7-4.2l-5.3-7.3a78.078,78.078,0,0,1,8.4-26.2l18.5-6.1A66.829,66.829,0,0,0,93.85,105.36Z" transform="translate(-0.002 -0.001)"/>
    <path d="M47.05,24.26a3,3,0,1,0,3,3A3,3,0,0,0,47.05,24.26Z" transform="translate(-0.002 -0.001)"/>
  </svg>
`;

function renderPatternPicker(instance) {
  const list = instance.patternPickerListEl;
  list.innerHTML = '';
  const query = (instance.patternSearchQuery || '').trim().toLocaleLowerCase('fa-IR');
  const patterns = getSavedPatternList(instance).filter(pattern =>
    !query || pattern.name.toLocaleLowerCase('fa-IR').includes(query)
  );

  if (!patterns.length) {
    if (query) {
      const empty = document.createElement('div');
      empty.className = 'hojreh-pattern-picker-empty';
      empty.textContent = 'الگویی با این عبارت پیدا نشد.';
      list.appendChild(empty);
      return;
    }

    const empty = document.createElement('div');
    empty.className = 'hojreh-pattern-picker-empty hojreh-pattern-picker-empty-state';
    empty.innerHTML = `
      ${PATTERN_PICKER_EMPTY_ICON}
      <div class="hojreh-pattern-picker-empty-title">هیچ الگوی فعالی وجود ندارد!</div>
      <div class="hojreh-pattern-picker-empty-desc">از <a href="../hojreh/settings-panel.html#pricing-patterns-section" target="_blank" rel="noopener">صفحه تنظیمات</a> الگوی قیمت‌گذاری بسازید و آن را فعال کنید.</div>
    `;
    list.appendChild(empty);
    return;
  }

  patterns.forEach(p => {
    const row = document.createElement('label');
    row.className = 'hojreh-pattern-picker-item';
    if (instance.selectedPatternId === p.id) row.classList.add('hojreh-selected');

    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = `hojrehPatternPicker_${instance.suffix}`;
    radio.value = p.id;
    radio.checked = instance.selectedPatternId === p.id;

    const span = document.createElement('span');
    span.className = 'hojreh-pattern-picker-title';
    span.textContent = p.name;

    row.appendChild(radio);
    row.appendChild(span);
    list.appendChild(row);

    radio.addEventListener('change', () => {
      instance.selectedPatternId = p.id;
      list.querySelectorAll('.hojreh-pattern-picker-item').forEach(el => el.classList.remove('hojreh-selected'));
      row.classList.add('hojreh-selected');
      renderReadonlyPreview(instance);
      syncDependentUI(instance);
    });
  });
}

function renderReadonlyPreview(instance) {
  const wrap = instance.readonlyPreviewWrapEl;
  wrap.innerHTML = '';
  const controller = instance.selectedPatternId ? HojrehPatternController.get(instance.selectedPatternId) : null;

  const box = document.createElement('div');
  box.className = 'formula-preview-large-box hojreh-modal-pattern-preview';
  if (controller?.state?.elements?.length) {
    box.classList.add('has-formula');
    box.textContent = controller.buildFormulaText(false);
  } else {
    box.textContent = 'برای نمایش فرمول، یک الگو انتخاب کنید.';
  }
  wrap.appendChild(box);
}

function validateFormulaForPatternConversion(instance, { notify = true } = {}) {
  const source = instance.buildController;
  const reject = (message) => {
    if (notify) showToast(message, 'yellow');
    return false;
  };

  if (!source?.state?.elements?.length) {
    return reject('ابتدا حداقل یک جزء به فرمول اضافه کنید.');
  }

  if (source.isManualMode?.()) {
    const manualResult = source.validateAndApplyFormula({ silent: true });
    if (manualResult.status !== 'green') {
      return reject('ابتدا فرمول دستی را کامل و معتبر کنید.');
    }
  }

  const hasIncompleteElement = (elements) => (elements || []).some(element => {
    if (element.type === 'group' || element.isGroup) {
      return !element.innerElements?.length || hasIncompleteElement(element.innerElements);
    }
    return !String(element.selectedId || '').trim();
  });
  if (hasIncompleteElement(source.state.elements)) {
    return reject('ابتدا همه آیتم‌های فرمول را انتخاب و فرمول را کامل کنید.');
  }

  const canonicalFormula = source.buildFormulaText(true).trim();
  if (!canonicalFormula) {
    return reject('فرمول معتبر و قابل تبدیل ساخته نشده است.');
  }

  const basicValidation = HojrehFormulaEngine.validateFormula(canonicalFormula);
  if (!basicValidation.valid) {
    return reject(basicValidation.error || 'فرمول معتبر و قابل تبدیل ساخته نشده است.');
  }

  const parsed = HojrehFormulaEngine.parseFormulaString(
    canonicalFormula,
    source._registryOptions?.() || {}
  );
  if (!parsed.valid || !parsed.renderable || !parsed.elements?.length) {
    return reject(parsed.error || parsed.warning || 'فرمول معتبر و قابل تبدیل ساخته نشده است.');
  }

  return true;
}

function convertFormulaToPattern(instance, overlay, name) {
  const source = instance.buildController;
  if (!validateFormulaForPatternConversion(instance)) return;

  const id = `woo_saved_${instance.suffix}_${++instance.convertedPatternSeq}`;
  const pattern = new HojrehPatternController(id, null, {
    patternName: name,
    initialElements: HojrehPatternController.cloneElements(source.state.elements)
  });
  HojrehPatternController.register(pattern);
  instance.convertedPatterns.push({ id, name });
  instance.selectedPatternId = id;
  renderPatternPicker(instance);
  renderReadonlyPreview(instance);
  overlay.querySelector('.hojreh-segmented-control button[data-tab="use-pattern"]')?.click();
  showToast('فرمول محصول به یک الگو تبدیل شد.', 'green');
}

function openConvertPatternDialog(instance, overlay) {
  if (!validateFormulaForPatternConversion(instance)) return;

  const dialog = overlay.querySelector('.hojreh-pattern-name-dialog');
  const input = dialog?.querySelector('.hojreh-pattern-name-dialog-input');
  if (!dialog || !input) return;

  input.value = instance.getProductName() || '';
  dialog.hidden = false;
  requestAnimationFrame(() => {
    dialog.classList.add('is-visible');
    input.focus();
    input.select();
  });
}

function personalizeSelectedPattern(instance, overlay) {
  const selected = instance.selectedPatternId
    ? HojrehPatternController.get(instance.selectedPatternId)
    : null;
  if (!selected) {
    showToast('نخست یک الگو را برای شخصی‌سازی انتخاب کنید.', 'yellow');
    return;
  }

  instance.buildController.setElements(
    HojrehPatternController.cloneElements(selected.state.elements)
  );
  instance.buildController.render({ syncPreview: true });
  overlay.querySelector('.hojreh-segmented-control button[data-tab="build"]')?.click();
  showToast('الگوی انتخاب‌شده برای شخصی‌سازی در بخش فرمول قرار گرفت.', 'green');
}

function clonePlainValue(value) {
  return JSON.parse(JSON.stringify(value));
}

function captureModalDraft(instance) {
  return {
    controllerState: clonePlainValue(instance.buildController.state),
    mode: instance.mode,
    selectedPatternId: instance.selectedPatternId,
    patternSearchQuery: instance.patternSearchQuery,
    convertedPatterns: clonePlainValue(instance.convertedPatterns),
    convertedPatternSeq: instance.convertedPatternSeq
  };
}

function syncModalTabWithoutAnimation(instance) {
  const overlay = instance.modalOverlayEl;
  if (!overlay) return;

  overlay.querySelectorAll('.hojreh-segmented-control button').forEach(button => {
    button.classList.toggle('hojreh-active', button.dataset.tab === instance.mode);
  });
  overlay.querySelectorAll('.hojreh-tab-panel').forEach(panel => {
    panel.classList.toggle('hojreh-active', panel.dataset.panel === instance.mode);
    panel.classList.remove('hojreh-tab-panel--leaving');
    panel.style.removeProperty('transition');
    panel.style.removeProperty('transform');
    panel.style.removeProperty('opacity');
    panel.style.removeProperty('visibility');
    panel.style.removeProperty('z-index');
  });
  instance.syncSegmentedControlLayout?.(false);
}

function restoreModalDraft(instance) {
  const snapshot = instance._modalDraftSnapshot;
  if (!snapshot) return;

  const retainedPatternIds = new Set(snapshot.convertedPatterns.map(pattern => pattern.id));
  instance.convertedPatterns.forEach(pattern => {
    if (!retainedPatternIds.has(pattern.id)) HojrehPatternController.unregister(pattern.id);
  });

  instance.buildController.state = clonePlainValue(snapshot.controllerState);
  instance.buildController.refreshCounterFromElements();
  instance.buildController.render({ syncPreview: true });
  instance.mode = snapshot.mode;
  instance.selectedPatternId = snapshot.selectedPatternId;
  instance.patternSearchQuery = snapshot.patternSearchQuery;
  instance.convertedPatterns = clonePlainValue(snapshot.convertedPatterns);
  instance.convertedPatternSeq = snapshot.convertedPatternSeq;

  const searchInput = instance.modalOverlayEl?.querySelector('.hojreh-pattern-search-input');
  const searchClear = instance.modalOverlayEl?.querySelector('.hojreh-pattern-search-clear');
  if (searchInput) searchInput.value = instance.patternSearchQuery;
  if (searchClear) searchClear.hidden = !instance.patternSearchQuery;

  renderPatternPicker(instance);
  renderReadonlyPreview(instance);
  syncModalTabWithoutAnimation(instance);
  syncDependentUI(instance);
}


function buildModalShell(instance) {
  const suffix = instance.suffix;
  const overlay = document.createElement('div');
  overlay.className = 'hojreh-formula-modal hojreh-formula-modal-overlay';
  overlay.id = `hojrehFormulaModal_${suffix}`;
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');

  overlay.innerHTML = `
    <div class="hojreh-formula-modal-header">
      <div class="hojreh-formula-modal-header-left">
        <div class="hojreh-modal-settings-menu">
          <button type="button" class="hojreh-modal-settings-trigger hojreh-header-icon-btn" aria-label="تنظیمات فرمول" aria-expanded="false" title="تنظیمات فرمول">
            <svg class="hojreh-modal-settings-gear" viewBox="1 0.5 22 23" aria-hidden="true">
              <path fill-rule="evenodd" clip-rule="evenodd" d="M12.0002 8C9.79111 8 8.00024 9.79086 8.00024 12C8.00024 14.2091 9.79111 16 12.0002 16C14.2094 16 16.0002 14.2091 16.0002 12C16.0002 9.79086 14.2094 8 12.0002 8ZM10.0002 12C10.0002 10.8954 10.8957 10 12.0002 10C13.1048 10 14.0002 10.8954 14.0002 12C14.0002 13.1046 13.1048 14 12.0002 14C10.8957 14 10.0002 13.1046 10.0002 12Z" fill="currentColor"/>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M11.2867 0.5C9.88583 0.5 8.6461 1.46745 8.37171 2.85605L8.29264 3.25622C8.10489 4.20638 7.06195 4.83059 6.04511 4.48813L5.64825 4.35447C4.32246 3.90796 2.83873 4.42968 2.11836 5.63933L1.40492 6.83735C0.67773 8.05846 0.954349 9.60487 2.03927 10.5142L2.35714 10.7806C3.12939 11.4279 3.12939 12.5721 2.35714 13.2194L2.03927 13.4858C0.954349 14.3951 0.67773 15.9415 1.40492 17.1626L2.11833 18.3606C2.83872 19.5703 4.3225 20.092 5.64831 19.6455L6.04506 19.5118C7.06191 19.1693 8.1049 19.7935 8.29264 20.7437L8.37172 21.1439C8.6461 22.5325 9.88584 23.5 11.2867 23.5H12.7136C14.1146 23.5 15.3543 22.5325 15.6287 21.1438L15.7077 20.7438C15.8954 19.7936 16.9384 19.1693 17.9553 19.5118L18.3521 19.6455C19.6779 20.092 21.1617 19.5703 21.8821 18.3606L22.5955 17.1627C23.3227 15.9416 23.046 14.3951 21.9611 13.4858L21.6432 13.2194C20.8709 12.5722 20.8709 11.4278 21.6432 10.7806L21.9611 10.5142C23.046 9.60489 23.3227 8.05845 22.5955 6.83732L21.8821 5.63932C21.1617 4.42968 19.678 3.90795 18.3522 4.35444L17.9552 4.48814C16.9384 4.83059 15.8954 4.20634 15.7077 3.25617L15.6287 2.85616C15.3543 1.46751 14.1146 0.5 12.7136 0.5H11.2867ZM10.3338 3.24375C10.4149 2.83334 10.7983 2.5 11.2867 2.5H12.7136C13.2021 2.5 13.5855 2.83336 13.6666 3.24378L13.7456 3.64379C14.1791 5.83811 16.4909 7.09167 18.5935 6.38353L18.9905 6.24984C19.4495 6.09527 19.9394 6.28595 20.1637 6.66264L20.8771 7.86064C21.0946 8.22587 21.0208 8.69271 20.6764 8.98135L20.3586 9.24773C18.6325 10.6943 18.6325 13.3057 20.3586 14.7523L20.6764 15.0186C21.0208 15.3073 21.0946 15.7741 20.8771 16.1394L20.1637 17.3373C19.9394 17.714 19.4495 17.9047 18.9905 17.7501L18.5936 17.6164C16.4909 16.9082 14.1791 18.1618 13.7456 20.3562L13.6666 20.7562C13.5855 21.1666 13.2021 21.5 12.7136 21.5H11.2867C10.7983 21.5 10.4149 21.1667 10.3338 20.7562L10.2547 20.356C9.82113 18.1617 7.50931 16.9082 5.40665 17.6165L5.0099 17.7501C4.55092 17.9047 4.06104 17.714 3.83671 17.3373L3.1233 16.1393C2.9058 15.7741 2.97959 15.3073 3.32398 15.0186L3.64185 14.7522C5.36782 13.3056 5.36781 10.6944 3.64185 9.24779L3.32398 8.98137C2.97959 8.69273 2.9058 8.2259 3.1233 7.86067L3.83674 6.66266C4.06106 6.28596 4.55093 6.09528 5.0099 6.24986L5.40676 6.38352C7.50938 7.09166 9.82112 5.83819 10.2547 3.64392L10.3338 3.24375Z" fill="currentColor"/>
            </svg>
            <svg class="hojreh-modal-settings-gear-outline" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3"></circle>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06-2 2-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V20h-2.82v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06-2-2 .06-.06A1.65 1.65 0 0 0 7.6 15a1.65 1.65 0 0 0-1.51-1H6v-2.82h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06 2-2 .06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V5h2.82v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06 2 2-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H20v2.82h-.09a1.65 1.65 0 0 0-1.51 1Z"></path>
            </svg>
          </button>
          <div class="hojreh-modal-settings-actions" role="menu" aria-label="تنظیمات فرمول">
            <button type="button" class="hojreh-header-icon-btn" data-theme-action="toggle" role="menuitem" aria-label="تغییر حالت تاریک یا روشن" title="تغییر حالت تاریک یا روشن">
              <svg class="hojreh-theme-icon-moon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
              <svg class="hojreh-theme-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
            </button>
            <button type="button" class="hojreh-header-icon-btn hojreh-convert-pattern-btn hojreh-contextual-pattern-btn" role="menuitem" aria-label="تبدیل فرمول به الگو" title="تبدیل فرمول به الگو">
              <svg class="hojreh-convert-pattern-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path class="hojreh-convert-pattern-icon-top" d="M20 9H4l5.5-6" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path class="hojreh-convert-pattern-icon-bottom" d="M4 15h16l-5.5 6" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </div>
        <button type="button" class="hojreh-formula-modal-close hojreh-header-icon-btn" aria-label="بستن" title="بستن">
          <span class="hojreh-header-close-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </span>
        </button>
        <button type="button" class="hojreh-mobile-header-action hojreh-header-icon-btn" data-theme-action="toggle" aria-label="تغییر حالت تاریک یا روشن" title="تغییر حالت تاریک یا روشن">
          <svg class="hojreh-theme-icon-moon" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
          <svg class="hojreh-theme-icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
        </button>
      </div>

      <div class="hojreh-formula-modal-header-center">
        <div class="hojreh-segmented-control" aria-label="شیوه قیمت‌گذاری">
          <span class="hojreh-segmented-control-tray"></span>
          <button type="button" class="hojreh-active" data-tab="build">
            <span class="hojreh-tab-label-desktop">ساخت فرمول</span>
            <span class="hojreh-tab-label-mobile">فرمول</span>
          </button>
          <button type="button" data-tab="use-pattern">
            <span class="hojreh-tab-label-desktop">استفاده از الگوی قیمت‌گذاری</span>
            <span class="hojreh-tab-label-mobile">الگو</span>
          </button>
        </div>
      </div>

      <div class="hojreh-formula-modal-header-right">
        <button type="button" class="hojreh-save-formula-btn hojreh-header-icon-btn" aria-label="ذخیره و بستن" title="ذخیره و بستن">
          <span class="hojreh-header-save-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 20V15H9V20M18 20H6C4.89543 20 4 19.1046 4 18V6C4 4.89543 4.89543 4 6 4H14.1716C14.702 4 15.2107 4.21071 15.5858 4.58579L19.4142 8.41421C19.7893 8.78929 20 9.29799 20 9.82843V18C20 19.1046 19.1046 20 18 20Z"/>
            </svg>
          </span>
          <span class="hojreh-save-formula-label">ذخیره و بستن</span>
        </button>
        <button type="button" class="hojreh-mobile-header-action hojreh-header-icon-btn hojreh-convert-pattern-btn hojreh-contextual-pattern-btn" aria-label="تبدیل فرمول به الگو" title="تبدیل فرمول به الگو">
          <svg class="hojreh-convert-pattern-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path class="hojreh-convert-pattern-icon-top" d="M20 9H4l5.5-6" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path class="hojreh-convert-pattern-icon-bottom" d="M4 15h16l-5.5 6" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </button>
      </div>
    </div>

    <div class="hojreh-formula-modal-body">
      <div class="hojreh-formula-modal-content">

        <div class="hojreh-tab-panels">
          <div class="hojreh-tab-panels-track">
            <div class="hojreh-tab-panel hojreh-active" data-panel="build">
              <div class="accordion-body-inner" id="hojrehBuildBox_${suffix}">
                ${buildFormulaBuilderBoxHTML(suffix)}
              </div>
            </div>

            <div class="hojreh-tab-panel" data-panel="use-pattern">
              <div class="hojreh-pattern-search-wrap">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="6.5"></circle><path d="m16 16 4 4"></path></svg>
                <input type="search" class="hojreh-pattern-search-input" id="hojrehPatternSearch_${suffix}" placeholder="جستجو الگو" aria-label="جستجو الگو" dir="rtl" autocomplete="off">
                <button type="button" class="hojreh-pattern-search-clear" aria-label="پاک کردن جستجو" hidden>
                  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="2.4" stroke-linecap="square"/></svg>
                </button>
              </div>
              <div class="hojreh-pattern-picker-list" id="hojrehPatternPicker_${suffix}"></div>
              <div class="hojreh-readonly-preview-wrap" id="hojrehReadonlyPreview_${suffix}"></div>
            </div>
          </div>
        </div>

      </div>
    </div>

    <div class="hojreh-pattern-name-dialog" hidden aria-hidden="true">
      <div class="hojreh-pattern-name-dialog-box" role="dialog" aria-modal="true" aria-labelledby="hojrehPatternNameTitle_${suffix}">
        <div class="hojreh-pattern-name-dialog-title" id="hojrehPatternNameTitle_${suffix}">لطفا نام الگو را وارد کنید</div>
        <input type="text" class="form-control hojreh-pattern-name-dialog-input" aria-label="نام الگو">
        <div class="hojreh-pattern-name-dialog-actions">
          <button type="button" class="hojreh-pattern-name-dialog-cancel">انصراف</button>
          <button type="button" class="hojreh-pattern-name-dialog-confirm">تبدیل به الگو</button>
        </div>
      </div>
    </div>

    <div class="hojreh-exit-confirm-dialog" hidden aria-hidden="true">
      <div class="hojreh-exit-confirm-box" role="alertdialog" aria-modal="true" aria-labelledby="hojrehExitConfirmTitle_${suffix}" aria-describedby="hojrehExitConfirmDesc_${suffix}">
        <button type="button" class="hojreh-exit-confirm-close" aria-label="بستن پیام" title="بستن پیام">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18"/>
          </svg>
        </button>
        <div class="hojreh-exit-confirm-title" id="hojrehExitConfirmTitle_${suffix}">ذخیره تغییرات</div>
        <div class="hojreh-exit-confirm-desc" id="hojrehExitConfirmDesc_${suffix}">مایل به ذخیره تغییرات هستید؟</div>
        <div class="hojreh-exit-confirm-actions">
          <button type="button" class="hojreh-exit-confirm-discard">صرف نظر از تغییرات</button>
          <button type="button" class="hojreh-exit-confirm-save">ذخیره و بستن</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.inert = true;
  overlay.setAttribute('aria-hidden', 'true');

  bindThemeActions(overlay);

  const settingsMenu = overlay.querySelector('.hojreh-modal-settings-menu');
  const settingsTrigger = overlay.querySelector('.hojreh-modal-settings-trigger');
  let settingsPointerInside = false;
  let settingsThemeTransitionLocked = false;
  let settingsPointerX = -1;
  let settingsPointerY = -1;
  const rememberSettingsPointer = event => {
    settingsPointerX = event.clientX;
    settingsPointerY = event.clientY;
  };
  const isPointerActuallyInsideSettings = () => {
    if (!settingsMenu) return false;
    if (settingsMenu.matches(':hover')) return true;
    if (settingsPointerX < 0 || settingsPointerY < 0) return false;
    const pointedElement = document.elementFromPoint(settingsPointerX, settingsPointerY);
    return Boolean(pointedElement && settingsMenu.contains(pointedElement));
  };
  const closeSettingsMenu = () => {
    if (settingsThemeTransitionLocked) return;
    settingsMenu?.classList.remove('is-open');
    settingsTrigger?.setAttribute('aria-expanded', 'false');
  };
  settingsTrigger?.addEventListener('click', () => {
    const isOpen = settingsMenu.classList.toggle('is-open');
    settingsTrigger.setAttribute('aria-expanded', String(isOpen));
  });
  const trackSettingsPointerAcrossWindow = event => {
    rememberSettingsPointer(event);
    settingsPointerInside = Boolean(
      settingsMenu && event.target instanceof Node && settingsMenu.contains(event.target)
    );
    if (!settingsPointerInside) closeSettingsMenu();
  };
  window.addEventListener('pointermove', trackSettingsPointerAcrossWindow, true);
  document.documentElement.addEventListener('pointerleave', () => {
    settingsPointerX = -1;
    settingsPointerY = -1;
    settingsPointerInside = false;
    closeSettingsMenu();
  });
  window.addEventListener('blur', () => {
    settingsPointerX = -1;
    settingsPointerY = -1;
    settingsPointerInside = false;
    closeSettingsMenu();
  });
  settingsMenu?.addEventListener('pointerenter', event => {
    rememberSettingsPointer(event);
    settingsPointerInside = true;
  });
  settingsMenu?.addEventListener('pointerleave', event => {
    rememberSettingsPointer(event);
    settingsPointerInside = false;
    closeSettingsMenu();
  });
  document.addEventListener('hojreh:theme-transition-start', event => {
    if (!settingsMenu?.contains(event.detail?.source)) return;
    settingsThemeTransitionLocked = true;
    settingsMenu.classList.add('is-open');
    settingsTrigger?.setAttribute('aria-expanded', 'true');
  });
  document.addEventListener('hojreh:theme-transition-end', event => {
    if (!settingsMenu?.contains(event.detail?.source)) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      settingsPointerInside = isPointerActuallyInsideSettings();
      settingsThemeTransitionLocked = false;
      if (!settingsPointerInside) closeSettingsMenu();
    }));
  });
  overlay.addEventListener('click', (event) => {
    if (!event.target.closest('.hojreh-modal-settings-menu')) {
      closeSettingsMenu();
    }
  });
  const updateContextualPatternAction = () => {
    const isPatternTab = instance.mode === 'use-pattern';
    const label = isPatternTab ? 'شخصی‌سازی فرمول' : 'تبدیل فرمول به الگو';
    overlay.querySelectorAll('.hojreh-contextual-pattern-btn').forEach(btn => {
      btn.setAttribute('aria-label', label);
      btn.setAttribute('title', label);
    });
  };
  overlay.querySelectorAll('.hojreh-contextual-pattern-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      if (instance.mode === 'use-pattern') personalizeSelectedPattern(instance, overlay);
      else openConvertPatternDialog(instance, overlay);
      closeSettingsMenu();
    });
  });

  const patternDialog = overlay.querySelector('.hojreh-pattern-name-dialog');
  const closePatternDialog = () => {
    if (!patternDialog) return;
    patternDialog.classList.remove('is-visible');
    patternDialog.setAttribute('aria-hidden', 'true');
    setTimeout(() => { if (!patternDialog.classList.contains('is-visible')) patternDialog.hidden = true; }, 180);
  };
  patternDialog?.querySelector('.hojreh-pattern-name-dialog-cancel')?.addEventListener('click', closePatternDialog);
  patternDialog?.addEventListener('click', event => { if (event.target === patternDialog) closePatternDialog(); });
  const confirmPatternDialog = () => {
    const name = patternDialog?.querySelector('.hojreh-pattern-name-dialog-input')?.value.trim();
    if (!name) {
      showToast('لطفا نام الگو را وارد کنید.', 'yellow');
      return;
    }
    closePatternDialog();
    convertFormulaToPattern(instance, overlay, name);
  };
  patternDialog?.querySelector('.hojreh-pattern-name-dialog-confirm')?.addEventListener('click', confirmPatternDialog);
  patternDialog?.querySelector('.hojreh-pattern-name-dialog-input')?.addEventListener('keydown', event => {
    if (event.key === 'Enter') confirmPatternDialog();
    if (event.key === 'Escape') closePatternDialog();
  });

  const tabButtons = Array.from(overlay.querySelectorAll('.hojreh-segmented-control button'));
  const panels = overlay.querySelectorAll('.hojreh-tab-panel');
  const tray = overlay.querySelector('.hojreh-segmented-control-tray');

  const positionTray = (btn, animate) => {
    if (!btn) return;
    if (!animate) tray.style.transition = 'none';

    const controlRect = btn.parentElement.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    const physicalLeft = btnRect.left - controlRect.left;

    tray.style.width = btnRect.width + 'px';
    tray.style.transform = `translateX(${physicalLeft}px)`;
    if (!animate) {
      void tray.offsetWidth;
      tray.style.transition = '';
    }
  };

  instance.syncSegmentedControlLayout = (animate = false) => {
    positionTray(overlay.querySelector('.hojreh-segmented-control button.hojreh-active'), animate);
  };
  window.addEventListener('resize', () => instance.syncSegmentedControlLayout(false));

  const resetPanelWithoutAnimation = (panel) => {
    if (!panel) return;
    const wasActive = panel.classList.contains('hojreh-active');
    panel.style.transition = 'none';
    if (!wasActive) panel.style.visibility = 'hidden';
    panel.style.transform = 'translateX(0)';
    panel.style.opacity = '1';
    panel.style.zIndex = '';
    void panel.offsetWidth;
    panel.style.transition = '';
    panel.style.transform = '';
    panel.style.opacity = '';
    panel.style.visibility = '';
  };

  tabButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      if (btn.classList.contains('hojreh-active')) return;

      customSelect.closeAll();

      const currentBtn = overlay.querySelector('.hojreh-segmented-control button.hojreh-active');
      const outgoingPanel = overlay.querySelector('.hojreh-tab-panel.hojreh-active');
      const incomingPanel = overlay.querySelector(`.hojreh-tab-panel[data-panel="${btn.dataset.tab}"]`);
      if (!currentBtn || !incomingPanel) return;

      const transitionSeq = (instance._tabTransitionSeq || 0) + 1;
      instance._tabTransitionSeq = transitionSeq;
      document.querySelectorAll('.formula-drag-ghost, .formula-drag-placeholder').forEach(el => el.remove());
      document.body.classList.remove('formula-dragging');
      panels.forEach(panel => {
        if (panel !== outgoingPanel) panel.classList.remove('hojreh-tab-panel--leaving');
        if (panel !== outgoingPanel) resetPanelWithoutAnimation(panel);
      });

      const currentRect = currentBtn.getBoundingClientRect();
      const targetRect = btn.getBoundingClientRect();
      const currentCenter = currentRect.left + currentRect.width / 2;
      const targetCenter = targetRect.left + targetRect.width / 2;
      const moveSign = targetCenter > currentCenter ? -1 : 1;
      const travel = moveSign > 0 ? '100%' : '-100%';
      const incomingStart = moveSign > 0 ? '-100%' : '100%';

      tabButtons.forEach(b => b.classList.remove('hojreh-active'));
      btn.classList.add('hojreh-active');

      if (outgoingPanel) {
        outgoingPanel.classList.remove('hojreh-active');
        outgoingPanel.classList.add('hojreh-tab-panel--leaving');
        outgoingPanel.style.transform = 'translateX(0)';
        outgoingPanel.style.opacity = '1';
        outgoingPanel.style.zIndex = '1';
      }

      incomingPanel.classList.add('hojreh-active');
      incomingPanel.style.transition = 'none';
      incomingPanel.style.transform = `translateX(${incomingStart})`;
      incomingPanel.style.opacity = '1';
      incomingPanel.style.zIndex = '2';
      void incomingPanel.offsetWidth;
      incomingPanel.style.transition = '';

      positionTray(btn, true);
      requestAnimationFrame(() => {
        if (outgoingPanel) {
          outgoingPanel.style.transform = `translateX(${travel})`;
        }
        incomingPanel.style.transform = 'translateX(0)';
      });

      const finishSlide = (event) => {
        if (event && (event.target !== incomingPanel || event.propertyName !== 'transform')) return;
        if (instance._tabTransitionSeq !== transitionSeq) return;
        if (outgoingPanel) {
          outgoingPanel.classList.remove('hojreh-tab-panel--leaving');
          resetPanelWithoutAnimation(outgoingPanel);
        }
        incomingPanel.style.transition = 'none';
        incomingPanel.style.transform = 'translateX(0)';
        incomingPanel.style.opacity = '1';
        incomingPanel.style.zIndex = '';
        void incomingPanel.offsetWidth;
        incomingPanel.style.transition = '';
        incomingPanel.style.transform = '';
        incomingPanel.style.opacity = '';
        incomingPanel.removeEventListener('transitionend', finishSlide);
      };
      incomingPanel.addEventListener('transitionend', finishSlide);
      setTimeout(() => finishSlide(), 480);

      instance.mode = btn.dataset.tab;
      updateContextualPatternAction();
      syncDependentUI(instance);
    });
  });

  const exitConfirmDialog = overlay.querySelector('.hojreh-exit-confirm-dialog');
  const hideExitConfirm = () => {
    exitConfirmDialog.classList.remove('is-visible');
    exitConfirmDialog.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      if (!exitConfirmDialog.classList.contains('is-visible')) exitConfirmDialog.hidden = true;
    }, 180);
  };
  const showExitConfirm = () => {
    exitConfirmDialog.hidden = false;
    exitConfirmDialog.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
      exitConfirmDialog.classList.add('is-visible');
      exitConfirmDialog.querySelector('.hojreh-exit-confirm-save')?.focus();
    });
  };

  overlay.querySelector('.hojreh-formula-modal-close').addEventListener('click', showExitConfirm);
  exitConfirmDialog.querySelector('.hojreh-exit-confirm-close').addEventListener('click', hideExitConfirm);
  exitConfirmDialog.querySelector('.hojreh-exit-confirm-save').addEventListener('click', () => {
    hideExitConfirm();
    showToast('فرمول قیمت‌گذاری این محصول ذخیره شد.', 'green');
    closeModal(instance);
  });
  exitConfirmDialog.querySelector('.hojreh-exit-confirm-discard').addEventListener('click', () => {
    hideExitConfirm();
    restoreModalDraft(instance);
    closeModal(instance);
  });
  overlay.querySelector('.hojreh-save-formula-btn').addEventListener('click', () => {
    showToast('فرمول قیمت‌گذاری این محصول ذخیره شد.', 'green');
    closeModal(instance);
  });

  const buildBoxEl = overlay.querySelector(`#hojrehBuildBox_${suffix}`);
  instance.buildController = new HojrehPatternController(`hojreh_woo_${suffix}`, buildBoxEl, {
    patternName: `فرمول محصول — ${suffix}`
  });
  HojrehPatternController.register(instance.buildController);
  instance.buildController.render({ syncPreview: true });

  const manualToggle = buildBoxEl.querySelector('.manual-formula-toggle');
  const manualButton = buildBoxEl.querySelector('.hojreh-modal-manual-formula-btn');
  if (manualToggle && manualButton) {
    manualButton.addEventListener('click', () => {
      manualToggle.checked = !manualToggle.checked;
      manualToggle.dispatchEvent(new Event('change', { bubbles: true }));
    });
    manualToggle.addEventListener('change', () => {
      manualButton.classList.toggle('is-active', manualToggle.checked);
      manualButton.setAttribute('aria-pressed', String(manualToggle.checked));
    });
  }

  const itemsContainer = buildBoxEl.querySelector('.formula-items-container');
  new MutationObserver(() => {
    if (instance.mode === 'build') syncDependentUI(instance);
  }).observe(itemsContainer, { childList: true, subtree: true });

  instance.patternPickerListEl = overlay.querySelector(`#hojrehPatternPicker_${suffix}`);
  instance.readonlyPreviewWrapEl = overlay.querySelector(`#hojrehReadonlyPreview_${suffix}`);
  const patternSearchInput = overlay.querySelector(`#hojrehPatternSearch_${suffix}`);
  const patternSearchClear = overlay.querySelector('.hojreh-pattern-search-clear');
  const getPatternSearchDirection = value => {
    for (const character of value) {
      if (/[\p{Script=Arabic}\p{Script=Hebrew}]/u.test(character)) return 'rtl';
      if (/\p{Letter}/u.test(character)) return 'ltr';
    }
    return 'rtl';
  };
  const updatePatternSearch = value => {
    instance.patternSearchQuery = value;
    if (patternSearchInput) patternSearchInput.dir = getPatternSearchDirection(value);
    if (patternSearchClear) patternSearchClear.hidden = !value;
    renderPatternPicker(instance);
  };
  patternSearchInput?.addEventListener('input', event => {
    updatePatternSearch(event.target.value);
  });
  patternSearchClear?.addEventListener('click', () => {
    if (!patternSearchInput) return;
    patternSearchInput.value = '';
    updatePatternSearch('');
    patternSearchInput.focus();
  });
  renderPatternPicker(instance);
  renderReadonlyPreview(instance);
  updateContextualPatternAction();

  instance.modalOverlayEl = overlay;
  return overlay;
}

function openModal(instance) {
  if (!instance.modalOverlayEl) buildModalShell(instance);
  if (instance._closeTimer) {
    clearTimeout(instance._closeTimer);
    instance._closeTimer = null;
  }

  document.querySelectorAll('.formula-drag-ghost, .formula-drag-placeholder').forEach(el => el.remove());
  document.body.classList.remove('formula-dragging');

  customSelect.closeAll();
  instance._modalDraftSnapshot = captureModalDraft(instance);
  instance.modalOverlayEl.inert = false;
  instance.modalOverlayEl.removeAttribute('aria-hidden');
  void instance.modalOverlayEl.offsetWidth;
  instance.modalOverlayEl.classList.add('hojreh-open');
  document.body.style.overflow = 'hidden';
  syncDependentUI(instance);

  requestAnimationFrame(() => {
    if (instance.syncSegmentedControlLayout) instance.syncSegmentedControlLayout(false);
    requestAnimationFrame(() => {
      if (instance.syncSegmentedControlLayout) instance.syncSegmentedControlLayout(false);
    });
  });
}

function closeModal(instance) {
  if (!instance.modalOverlayEl) return;

  document.querySelectorAll('.formula-drag-ghost, .formula-drag-placeholder').forEach(el => el.remove());
  document.body.classList.remove('formula-dragging');
  customSelect.closeAll();

  instance.modalOverlayEl.inert = true;
  instance.modalOverlayEl.setAttribute('aria-hidden', 'true');
  instance.modalOverlayEl.classList.remove('hojreh-open');
  if (instance._closeTimer) clearTimeout(instance._closeTimer);
  const closeDuration = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 0 : 480;
  instance._closeTimer = setTimeout(() => {
    if (!instance.modalOverlayEl.classList.contains('hojreh-open')) {
      document.body.style.overflow = '';
      playPendingPageQuantityEntrance(instance);
    }
    instance._closeTimer = null;
  }, closeDuration);
}


export function createHojrehFormulaField(config) {
  const suffix = `${config.key || 'field'}_${++modalSeq}`;

  const instance = {
    suffix,
    productType: config.productType,
    regularPriceInput: config.regularPriceInput,
    salePriceFieldEl: config.salePriceFieldEl || null,
    stockStatusSelectEl: config.stockStatusSelectEl || null,
    stockStatusInputs: Array.from(config.stockStatusInputs || []),
    mountEl: config.mountEl,
    priceFieldsParent: config.mountEl.parentElement,
    salePriceOriginalNextSibling: config.salePriceFieldEl?.nextSibling || null,
    getProductName: config.getProductName || (() => ''),
    mode: 'build',
    quantities: {},
    minPrice: '',
    outOfStockBelowMin: false,
    selectedPatternId: null,
    patternSearchQuery: '',
    buildController: null,
    convertedPatterns: [],
    convertedPatternSeq: 0,
    modalOverlayEl: null,
    pageQtyContainer: null,
    pageQtySectionEl: null,
    pageFinalPriceEl: null,
    activeDependencyIds: [],
    _lastDepsKey: null,
    _pendingPageQtyEntrance: false,
    _pageQtyHasEntered: false
  };

  const row = document.createElement('div');
  row.className = 'hojreh-dynamic-pricing-row';
  row.innerHTML = `
    <label>
      <input type="checkbox" class="hojreh-dynamic-pricing-checkbox hojreh-checkbox-input">
      قیمت‌گذاری پویا با افزونه حجره
    </label>
  `;
  config.mountEl.classList.add('hojreh-dynamic-pricing-mount');
  config.mountEl.appendChild(row);

  const pagePanel = document.createElement('div');
  pagePanel.className = 'hojreh-page-formula-panel';
  pagePanel.style.display = 'none';
  config.mountEl.appendChild(pagePanel);

  const setBtnWrap = document.createElement('div');
  setBtnWrap.className = 'hojreh-set-formula-wrap';
  setBtnWrap.style.display = 'none';
  setBtnWrap.innerHTML = `
    <button type="button" class="hojreh-set-formula-btn">
      <svg class="hojreh-set-formula-star" viewBox="0 0 1000 1000" aria-hidden="true">
        <path d="M0 500C276.097 500 500 276.097 500 0c0 276.097 223.903 500 500 500-276.097 0-500 223.903-500 500C500 723.916 276.097 500 0 500Z"/>
      </svg>
      <span>تنظیم فرمول قیمت‌گذاری محصول</span>
      <svg class="hojreh-set-formula-arrow" viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path d="M20.5 5.5 10 16l10.5 10.5"/>
      </svg>
    </button>
  `;
  pagePanel.appendChild(setBtnWrap);

  const qtyWrap = document.createElement('div');
  qtyWrap.className = 'hojreh-quantity-fields-wrap';
  qtyWrap.innerHTML = `
    <h2 class="section-title hojreh-page-section-title">مقدار هر متغیر</h2>
    <div class="hojreh-qty-container"></div>
  `;
  pagePanel.appendChild(qtyWrap);
  instance.pageQtySectionEl = qtyWrap;
  instance.pageQtyContainer = qtyWrap.querySelector('.hojreh-qty-container');

  const pricingOptionsWrap = document.createElement('div');
  pricingOptionsWrap.className = 'hojreh-page-pricing-options';
  pricingOptionsWrap.style.display = 'none';
  pricingOptionsWrap.innerHTML = `
    <h2 class="section-title hojreh-page-section-title">حداقل قیمت محصول</h2>
    <div class="hojreh-page-min-price-field">
      <label for="hojrehMinPrice_${suffix}">حداقل قیمت مجاز</label>
      <div class="hojreh-page-input-wrapper">
        <input type="text" id="hojrehMinPrice_${suffix}" placeholder="مثلا 500000" inputmode="numeric">
        <span class="hojreh-page-input-unit">تومان</span>
      </div>
    </div>
    <label class="hojreh-page-out-of-stock-field" for="hojrehOutOfStock_${suffix}">
      <input type="checkbox" class="hojreh-checkbox-input" id="hojrehOutOfStock_${suffix}">
      <span>در صورت پایین‌تر بودن قیمت محاسبه‌شده از حداقل، وضعیت موجودی این متغیر به «ناموجود» تغییر کند.</span>
    </label>
  `;
  pagePanel.appendChild(pricingOptionsWrap);

  const pageFinalSectionTitle = document.createElement('h2');
  pageFinalSectionTitle.className = 'section-title hojreh-page-section-title hojreh-page-final-section-title';
  pageFinalSectionTitle.textContent = 'قیمت نهایی محاسبه‌شده';
  pagePanel.appendChild(pageFinalSectionTitle);

  const pageFinalPriceBar = document.createElement('div');
  pageFinalPriceBar.className = 'hojreh-final-price-bar hojreh-page-final-price-bar';
  pageFinalPriceBar.innerHTML = '<span>قیمت نهایی:</span><span class="hojreh-final-price-value">۰ تومان</span>';
  pagePanel.appendChild(pageFinalPriceBar);
  instance.pageFinalPriceEl = pageFinalPriceBar.querySelector('.hojreh-final-price-value');

  const checkbox = row.querySelector('.hojreh-dynamic-pricing-checkbox');
  const setBtn = setBtnWrap.querySelector('.hojreh-set-formula-btn');
  const minPriceInput = pricingOptionsWrap.querySelector(`#hojrehMinPrice_${suffix}`);
  const outOfStockInput = pricingOptionsWrap.querySelector(`#hojrehOutOfStock_${suffix}`);
  instance.dynamicPricingCheckbox = checkbox;

  attachNumericInput(minPriceInput);
  minPriceInput.addEventListener('input', () => {
    instance.minPrice = minPriceInput.value;
    updateFinalPriceDisplays(instance);
  });
  outOfStockInput?.addEventListener('change', () => {
    instance.outOfStockBelowMin = outOfStockInput.checked;
    updateFinalPriceDisplays(instance);
  });

  checkbox.addEventListener('change', () => {
    if (checkbox.checked) {
      config.regularPriceInput.value = '';
      config.regularPriceInput.setAttribute('disabled', 'disabled');
      config.regularPriceInput.placeholder = 'با فرمول حجره محاسبه می‌شود';
      pagePanel.style.display = '';
      setBtnWrap.style.display = '';
      pricingOptionsWrap.style.display = '';
      qtyWrap.style.display = '';
      syncSalePriceField(instance);
      syncDependentUI(instance);
      animatePageSectionGroups([
        setBtnWrap,
        qtyWrap,
        pricingOptionsWrap,
        [pageFinalSectionTitle, pageFinalPriceBar]
      ]);
    } else {
      config.regularPriceInput.removeAttribute('disabled');
      config.regularPriceInput.placeholder = '';
      config.regularPriceInput.value = '';
      pagePanel.style.display = 'none';
      setBtnWrap.style.display = 'none';
      pricingOptionsWrap.style.display = 'none';
      qtyWrap.style.display = 'none';
      [setBtnWrap, qtyWrap, pricingOptionsWrap, pageFinalSectionTitle, pageFinalPriceBar].forEach(element => {
        element.classList.remove('hojreh-page-section-enter');
        element.style.removeProperty('--hojreh-section-enter-delay');
      });
      syncSalePriceField(instance);
    }
  });

  setBtn.addEventListener('click', () => openModal(instance));

  new MutationObserver(() => {
    qtyWrap.style.display = checkbox.checked ? '' : 'none';
  }).observe(instance.pageQtyContainer, { childList: true, subtree: true });

  return instance;
}
