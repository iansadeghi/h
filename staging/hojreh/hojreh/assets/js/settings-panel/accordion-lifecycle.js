import { showToast, normalizeUnitSelects } from '../general.js';
import { pricingPatterns } from '../pricing-patterns.js';
import {
  normalizeEnglishIdValue,
  generateEnglishID,
  hasDuplicateActiveEnglishId,
  nextAccordionId,
  itemHumanType,
  isFormulaProtectedItem
} from './id-utils.js';
import { formatNumberWithCommas, attachRoundingCalculations } from './rounding.js';
import { attachUnitLabelSync } from './unit-sync.js';
import { attachDeleteEvents, attachDeleteConstantEvents } from './delete-actions.js';
import { toggleManualFormulaMode } from './manual-formula.js';
import { startDrag } from './drag-reorder.js';
import { initDirtyTracking } from './dirty-tracking.js';
import { initNewAccordionExtras } from './misc-ui.js';
import { initApprenticeAccess } from './apprentice-access.js';
function dragHandleMarkup() {
  return `
    <div class="acc-drag-handle" title="جابجایی">
      <svg viewBox="0 0 16 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <circle cx="4" cy="4" r="2"/>
        <circle cx="12" cy="4" r="2"/>
        <circle cx="4" cy="12" r="2"/>
        <circle cx="12" cy="12" r="2"/>
        <circle cx="4" cy="20" r="2"/>
        <circle cx="12" cy="20" r="2"/>
      </svg>
    </div>
  `;
}
function deleteButtonMarkup(title, extraClass = 'acc-delete-btn') {
  return `
    <button class="acc-action-btn ${extraClass}" title="${title}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"></path>
        <line x1="10" y1="11" x2="10" y2="17"></line>
        <line x1="14" y1="11" x2="14" y2="17"></line>
        <g class="icon-trash-lid">
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          <polyline points="3 6 5 6 21 6"></polyline>
        </g>
      </svg>
    </button>
  `;
}
function toggleButtonMarkup() {
  return `
    <button class="acc-toggle-btn" aria-label="باز/بسته کردن" title="باز/بسته کردن">
      <svg class="chevron-down" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    </button>
  `;
}
function createAccordionShell({ type, id = nextAccordionId(type), title, bodyHtml, deleteTitle, deleteClass = 'acc-delete-btn', active = false, open = false }) {
  const item = document.createElement('div');
  item.className = `accordion-item${open ? ' open' : ''}`;
  item.setAttribute('draggable', 'false');
  item.dataset.id = id;
  item.dataset.type = type;
  item.innerHTML = `
    <div class="accordion-header">
      ${dragHandleMarkup()}
      <label class="acc-switch" title="فعال/غیرفعال">
        <input type="checkbox" ${active ? 'checked' : ''} />
        <span class="acc-switch-inner"></span>
      </label>
      <div class="acc-title-area">
        <span class="acc-name">${title}</span>
      </div>
      <div class="acc-left-actions">
        ${deleteTitle ? deleteButtonMarkup(deleteTitle, deleteClass) : ''}
        ${toggleButtonMarkup()}
      </div>
    </div>
    <div class="accordion-body">
      <div class="accordion-body-inner">${bodyHtml}</div>
    </div>
  `;
  return item;
}
function syncApprenticeName(item) {
  if (!item?.querySelector('.apprentice-first-name-input, .apprentice-last-name-input')) return;
  const firstName = item?.querySelector('.apprentice-first-name-input')?.value?.trim() || '';
  const lastName = item?.querySelector('.apprentice-last-name-input')?.value?.trim() || '';
  const displayName = `${firstName} ${lastName}`.trim() || 'شاگرد جدید';
  const nameSpan = item?.querySelector('.acc-name');
  if (nameSpan) nameSpan.textContent = displayName;
}
function animateAccordionItemIn(item) {
  if (!item) return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  item.classList.add('item-enter');
  const clearAnim = () => item.classList.remove('item-enter');
  item.addEventListener('animationend', clearAnim, { once: true });
  setTimeout(clearAnim, 600);
}
function hydrateAccordionItem(item, options = {}) {
  if (!item) return item;
  animateAccordionItemIn(item);
  item.classList.toggle('open', !!options.open);
  const switchInput = item.querySelector('.acc-switch input[type="checkbox"]');
  if (switchInput) {
    switchInput.checked = !!options.active;
    setIdentityFieldsLocked(item, !!switchInput.checked);
  }
  attachAccordionEvents(item.querySelector('.accordion-header'));
  item.querySelectorAll('.var-name-input').forEach(input => attachNameUpdateEvents(input));
  const deleteBtn = item.querySelector('.acc-delete-btn');
  if (deleteBtn) attachDeleteEvents(deleteBtn);
  const constantDeleteBtn = item.querySelector('.acc-delete-constant-btn');
  if (constantDeleteBtn) attachDeleteConstantEvents(constantDeleteBtn);
  attachSwitchValidationAndLock(switchInput);
  item.querySelectorAll('.unit-select').forEach(select => attachUnitLabelSync(select));
  if (item.dataset.type === 'algorithm') attachRoundingCalculations(item);
  const dragHandle = item.querySelector('.acc-drag-handle');
  if (dragHandle && dragHandle.dataset.dragReady !== 'true') {
    dragHandle.dataset.dragReady = 'true';
    dragHandle.addEventListener('mousedown', startDrag);
    dragHandle.addEventListener('touchstart', startDrag, { passive: false });
  }
  item.querySelectorAll('.var-min-price, .var-default-price').forEach(input => {
    if (input.dataset.settingsPriceReady === 'true') return;
    input.dataset.settingsPriceReady = 'true';
    input.addEventListener('input', function() {
      let clean = this.value.replace(/،/g, '').replace(/,/g, '');
      clean = clean.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
      if (!isNaN(clean) && clean !== '') {
        this.value = formatNumberWithCommas(clean);
      }
      pricingPatterns.refreshFormulaAfterSettingsChange?.();
    });
  });
  item.querySelectorAll('.apprentice-first-name-input, .apprentice-last-name-input').forEach(input => {
    if (input.dataset.apprenticeNameReady === 'true') return;
    input.dataset.apprenticeNameReady = 'true';
    input.addEventListener('input', () => syncApprenticeName(item));
  });
  syncApprenticeName(item);
  item.querySelectorAll('.manual-formula-toggle').forEach(toggle => {
    if (toggle.dataset.hojrehManualHandler) return;
    toggle.dataset.hojrehManualHandler = 'settings';
    toggle.addEventListener('change', function() {
      pricingPatterns.activatePattern?.(this.closest('.accordion-item[data-type="pattern"]'), { hydrate: false });
      toggleManualFormulaMode(this.checked, this.closest('.accordion-item[data-type="pattern"]'));
    });
  });
  normalizeUnitSelects(item);
  initApprenticeAccess(item);
  initDirtyTracking(item);
  initNewAccordionExtras(item);
  return item;
}
function normalizeInitialAccordionState() {
  document.querySelectorAll('.accordion-item').forEach(item => {
    item.classList.remove('open');
    const switchInput = item.querySelector('.acc-switch input[type="checkbox"]');
    if (switchInput) switchInput.checked = true;
    setIdentityFieldsLocked(item, true);
    syncApprenticeName(item);
  });
}
function attachAccordionEvents(header) {
  if (!header) return;
  if (header.dataset.accordionReady === 'true') return;
  header.dataset.accordionReady = 'true';
  header.addEventListener('click', function(e) {
    if (
      e.target.closest('.acc-drag-handle') ||
      e.target.closest('.acc-switch') ||
      e.target.closest('.acc-action-btn') ||
      e.target.closest('.pattern-interactive-box')
    ) return;
    const item = this.closest('.accordion-item');
    item.classList.toggle('open');
  });
}
function attachNameUpdateEvents(input) {
  if (!input) return;
  if (input.dataset.nameUpdateReady === 'true') return;
  input.dataset.nameUpdateReady = 'true';
  const initialItem = input.closest('.accordion-item');
  const initialIdInput = initialItem?.querySelector('.english-id-input');
  if (initialIdInput && initialIdInput.dataset.manualListenerAttached !== 'true') {
    initialIdInput.dataset.manualListenerAttached = 'true';
    initialIdInput.addEventListener('input', function() {
      this.dataset.manualEdited = 'true';
      pricingPatterns.refreshFormulaAfterSettingsChange?.();
    });
  }
  input.addEventListener('input', function() {
    const item = this.closest('.accordion-item');
    const nameSpan = item.querySelector('.acc-name');
    if (nameSpan) {
      nameSpan.textContent = this.value || 'بدون نام';
    }
    const idInput = item.querySelector('.english-id-input');
    if (idInput && idInput.dataset.manualEdited !== "true" && idInput.value.trim() === '' && item.querySelector('.acc-switch input[type="checkbox"]')?.checked) {
      const type = item.dataset.type || 'variable';
      idInput.value = generateEnglishID(this.value, type, idInput);
    }
    pricingPatterns.refreshFormulaAfterSettingsChange?.();
  });
}
function setIdentityFieldsLocked(item, locked) {
  const nameInput = item.querySelector('.var-name-input');
  const idInput = item.querySelector('.english-id-input');
  [nameInput, idInput].forEach(input => {
    if (!input) return;
    input.readOnly = !!locked;
    input.setAttribute('aria-readonly', locked ? 'true' : 'false');
    input.classList.toggle('identity-locked-field', !!locked);
  });
}
function validateItemBeforeActivation(item) {
  const nameInput = item.querySelector('.var-name-input');
  const idInput = item.querySelector('.english-id-input');
  const fallbackName = item.querySelector('.acc-name')?.textContent?.trim() || '';
  if (nameInput && nameInput.value.trim() === '' && fallbackName) {
    nameInput.value = fallbackName;
    nameInput.dispatchEvent(new Event('input', { bubbles: true }));
  }
  if (nameInput && nameInput.value.trim() === '') {
    return { valid: false, message: 'نخست فیلد نام را پر کنید!' };
  }
  if (idInput) {
    let normalizedId = normalizeEnglishIdValue(idInput.value);
    if (!normalizedId) {
      normalizedId = generateEnglishID(nameInput?.value || fallbackName, item.dataset.type || 'variable', idInput);
      idInput.value = normalizedId;
    } else if (idInput.value !== normalizedId) {
      idInput.value = normalizedId;
    }
    if (!/^[a-z][a-z0-9_]*$/.test(normalizedId)) {
      return { valid: false, message: 'شناسه انگلیسی باید با حرف کوچک انگلیسی شروع شود و فقط شامل حروف کوچک، عدد و underline باشد.' };
    }
    if (hasDuplicateActiveEnglishId(normalizedId, item)) {
      return { valid: false, message: 'این شناسه انگلیسی در آیتم دیگری استفاده شده است.' };
    }
  }
  return { valid: true };
}
function attachSwitchValidationAndLock(switchInput) {
  if (!switchInput) return;
  if (switchInput.dataset.switchValidationReady === 'true') return;
  switchInput.dataset.switchValidationReady = 'true';
  const initialItem = switchInput.closest('.accordion-item');
  if (initialItem && switchInput.checked) setIdentityFieldsLocked(initialItem, true);
  switchInput.addEventListener('change', function() {
    const item = this.closest('.accordion-item');
    const label = itemHumanType(item);
    if (this.checked) {
      const validation = validateItemBeforeActivation(item);
      if (!validation.valid) {
        this.checked = false;
        setIdentityFieldsLocked(item, false);
        showToast(validation.message, 'yellow');
        return;
      }
      setIdentityFieldsLocked(item, true);
      showToast(`${label} فعال شد.`, 'green');
    } else {
      if (isFormulaProtectedItem(item)) {
        this.checked = true;
        setIdentityFieldsLocked(item, true);
        showToast(`${label} در فرمول یا الگوی قیمت‌گذاری استفاده شده و نمی‌تواند غیرفعال شود.`, 'yellow');
        return;
      }
      setIdentityFieldsLocked(item, false);
      showToast(`${label} غیرفعال شد.`, 'green');
    }
    pricingPatterns.refreshFormulaAfterSettingsChange?.();
  });
}
function initAccordionEvents() {
  document.querySelectorAll('.accordion-header').forEach(header => {
    attachAccordionEvents(header);
  });
}
function initNameUpdateEvents() {
  document.querySelectorAll('.var-name-input').forEach(input => {
    attachNameUpdateEvents(input);
  });
}
function initSwitchValidation() {
  document.querySelectorAll('.acc-switch input[type="checkbox"]').forEach(sw => {
    attachSwitchValidationAndLock(sw);
  });
}
export {
  createAccordionShell,
  hydrateAccordionItem,
  animateAccordionItemIn,
  attachAccordionEvents,
  attachNameUpdateEvents,
  attachSwitchValidationAndLock,
  setIdentityFieldsLocked,
  validateItemBeforeActivation,
  syncApprenticeName,
  normalizeInitialAccordionState,
  initAccordionEvents,
  initNameUpdateEvents,
  initSwitchValidation
};
