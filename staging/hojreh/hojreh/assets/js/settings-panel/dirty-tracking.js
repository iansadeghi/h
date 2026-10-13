import { showToast } from '../general.js';
import { saveDirty } from '../save-dirty.js';
import { pricingPatterns } from '../pricing-patterns.js';
import { getItemFormulaId } from './id-utils.js';
import { getOrderPayload, hasOrderChanged, commitOrderTracking } from './drag-reorder.js';
const DIRTY_TRACKABLE_SELECTOR =
  'input:not([type="hidden"]):not([readonly]):not([data-hojreh-no-dirty]), ' +
  'select:not([type="hidden"]):not([readonly]):not([data-hojreh-no-dirty]), ' +
  'textarea:not([type="hidden"]):not([readonly]):not([data-hojreh-no-dirty])';
const DIRTY_READY_SELECTOR =
  'input[data-hojreh-dirty-ready="true"]:not([type="hidden"]):not([readonly]):not([data-hojreh-no-dirty]), ' +
  'select[data-hojreh-dirty-ready="true"]:not([type="hidden"]):not([readonly]):not([data-hojreh-no-dirty]), ' +
  'textarea[data-hojreh-dirty-ready="true"]:not([type="hidden"]):not([readonly]):not([data-hojreh-no-dirty])';
function controlSnapshotValue(control) {
  if (!control) return '';
  if (control.type === 'checkbox') return control.checked ? '1' : '0';
  return control.value ?? '';
}
function initDirtyTracking(root = document) {
  root.querySelectorAll(DIRTY_TRACKABLE_SELECTOR).forEach(control => {
    if (control.dataset.hojrehDirtyReady === 'true') return;
    control.dataset.hojrehDirtyReady = 'true';
    control.dataset.hojrehOriginalValue = controlSnapshotValue(control);
  });
}
function markDirtyControl(control) {
  if (!control || control.dataset.hojrehDirtyReady !== 'true') return;
  const current = controlSnapshotValue(control);
  control.classList.toggle('hojreh-dirty-field', current !== control.dataset.hojrehOriginalValue);
}
function getControlFieldKey(control) {
  const groupLabel = control.closest('.form-group')?.querySelector('.form-label, .pattern-control-title')?.textContent?.trim() || '';
  const item = control.closest('.accordion-item');
  const itemId = getItemFormulaId(item) || item?.dataset?.id || '';
  const itemType = item?.dataset?.type || 'global';
  const classKey = Array.from(control.classList || []).find(cls => cls !== 'form-control') || control.name || control.id || control.tagName.toLowerCase();
  return `${itemType}.${itemId}.${classKey}.${groupLabel}`;
}
function getEntityRevisionInfo(item) {
  if (!item) return { revision: null, authoritative: false };
  if (item.dataset?.type === 'pattern') {
    const facade = pricingPatterns;
    if (facade.getLastKnownRevision) {
      const fromController = facade.getLastKnownRevision(item);
      if (fromController !== null && fromController !== undefined) {
        const authoritative = facade.isRevisionAuthoritative
          ? facade.isRevisionAuthoritative(item)
          : true;
        return { revision: fromController, authoritative };
      }
    }
  }
  const raw = item.getAttribute?.('data-revision');
  if (raw === null || raw === undefined) {
    return { revision: 1, authoritative: false };
  }
  if (raw === '') return { revision: null, authoritative: false };
  const num = Number(raw);
  return Number.isFinite(num)
    ? { revision: num, authoritative: true }
    : { revision: null, authoritative: false };
}
function getEntityBaseRevision(item) {
  return getEntityRevisionInfo(item).revision;
}
function getDirtySettingsPayload() {
  const changes = [];
  document.querySelectorAll(DIRTY_READY_SELECTOR).forEach(control => {
    const current = controlSnapshotValue(control);
    const original = control.dataset.hojrehOriginalValue;
    if (current !== original) {
      const item = control.closest('.accordion-item');
      changes.push({
        key: getControlFieldKey(control),
        item_id: getItemFormulaId(item) || item?.dataset?.id || '',
        item_type: item?.dataset?.type || 'global',
        old_value: original,
        new_value: current,
        base_revision: getEntityBaseRevision(item)
      });
    }
  });
  return {
    save_mode: 'patch_changed_fields_only',
    changes,
    formula_payload: pricingPatterns.getAllFormulaPayloads?.() || pricingPatterns.getFormulaPayload?.() || null
  };
}
function commitDirtyTracking(root = document) {
  root.querySelectorAll(DIRTY_TRACKABLE_SELECTOR).forEach(control => {
    control.dataset.hojrehOriginalValue = controlSnapshotValue(control);
    control.classList.remove('hojreh-dirty-field');
  });
}
function initInitialDirtySnapshot() {
  setTimeout(function() { initDirtyTracking(document); }, 0);
}
function initSaveDot() {
  saveDirty.injectDot('headerSaveBtn');
  const _settingsUnsavedState = { value: false };
  function refreshDot() {
    const hasFieldDirty = !!document.querySelector(
      'input[data-hojreh-dirty-ready="true"].hojreh-dirty-field:not([type="hidden"]):not([readonly]):not([data-hojreh-no-dirty]), ' +
      'select[data-hojreh-dirty-ready="true"].hojreh-dirty-field:not([type="hidden"]):not([readonly]):not([data-hojreh-no-dirty]), ' +
      'textarea[data-hojreh-dirty-ready="true"].hojreh-dirty-field:not([type="hidden"]):not([readonly]):not([data-hojreh-no-dirty])'
    );
    const hasDirty = hasFieldDirty || hasOrderChanged() || !!pricingPatterns.hasFormulaChanged?.();
    saveDirty.refreshDot('headerSaveBtn', hasDirty, _settingsUnsavedState);
  }
  document.addEventListener('input', refreshDot);
  document.addEventListener('change', refreshDot);
  window._hojrehRefreshSettingsDot = refreshDot;
}
function initDirtyFieldListeners() {
  document.addEventListener('input', e => { if (e.target.matches('input, textarea')) markDirtyControl(e.target); });
  document.addEventListener('change', e => { if (e.target.matches('input, select, textarea')) markDirtyControl(e.target); });
  const dirtyTrackingObserver = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
      mutation.addedNodes.forEach(node => {
        if (node.nodeType === 1) initDirtyTracking(node);
      });
    });
  });
  dirtyTrackingObserver.observe(document.body, { childList: true, subtree: true });
}
function initHeaderSaveButton() {
  const headerSaveBtn = document.getElementById('headerSaveBtn');
  if (!headerSaveBtn) return;
  headerSaveBtn.addEventListener('click', () => {
    const payload = getDirtySettingsPayload();
    payload.order_payload = getOrderPayload();
    const hasOrderDirty = hasOrderChanged();
    const hasFormulaDirty = !!pricingPatterns.hasFormulaChanged?.();
    const totalChanges = payload.changes.length;
    window.dispatchEvent(new CustomEvent('hojreh:settings-save-payload', { detail: payload }));
    commitDirtyTracking(document);
    commitOrderTracking();
    pricingPatterns.commitFormulaSnapshot?.();
    window._hojrehRefreshSettingsDot?.();
    const hasSomethingToSave = totalChanges > 0 || hasOrderDirty || hasFormulaDirty;
    if (hasSomethingToSave) {
      const parts = [];
      if (totalChanges > 0) parts.push(`${totalChanges} تغییر فیلد`);
      if (hasOrderDirty) parts.push('تغییر ترتیب');
      if (hasFormulaDirty) parts.push('تغییر فرمول');
      showToast(`${parts.join('، ')} برای ذخیره‌سازی آماده شد.`, 'green');
    } else {
      showToast('تغییری برای ذخیره‌سازی وجود ندارد.', 'yellow');
    }
  });
}
export {
  controlSnapshotValue,
  initDirtyTracking,
  markDirtyControl,
  getControlFieldKey,
  getEntityRevisionInfo,
  getEntityBaseRevision,
  getDirtySettingsPayload,
  commitDirtyTracking,
  initInitialDirtySnapshot,
  initSaveDot,
  initDirtyFieldListeners,
  initHeaderSaveButton
};