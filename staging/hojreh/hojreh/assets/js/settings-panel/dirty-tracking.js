import { showToast } from '../general.js';
import { saveDirty } from '../save-dirty.js';
import { pricingPatterns } from '../pricing-patterns.js';
import { getItemFormulaId } from './id-utils.js';
import { getOrderPayload, hasOrderChanged, commitOrderTracking } from './drag-reorder.js';

/* ─── DIRTY FIELD TRACKING FOR SAFE BACKEND PATCH SAVE ─── */

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

/* Optimistic-concurrency token (Contract §10) for a single field's
 * owning entity. Each accordion-item is expected to carry its own
 * data-revision (independent entities — variable/constant/algorithm/
 * pattern — each track their own revision per §10.2), so this is read
 * per-field rather than from one shared/global value. Returns null
 * (not 0) when the attribute is absent or non-numeric, distinguishing
 * "unknown revision" from "server revision 0". Falls back to the
 * pricing-patterns controller's own tracked revision for pattern-type
 * items, since that DOM is owned/re-rendered by pricing-patterns.js. */
/** Returns `{ revision, authoritative }` — mirrors
 *  HojrehPatternController._readRevisionAttr()'s contract so both
 *  files agree on what counts as a verified server-emitted revision
 *  vs. a client-side placeholder (see that method's doc comment for
 *  the full rationale). `authoritative` is false whenever `revision`
 *  is the "1" UI placeholder, so callers can tell the difference
 *  before treating it as a real base_revision. */
function getEntityRevisionInfo(item) {
  if (!item) return { revision: null, authoritative: false };
  if (item.dataset?.type === 'pattern') {
    const facade = pricingPatterns;
    if (facade.getLastKnownRevision) {
      const fromController = facade.getLastKnownRevision(item);
      if (fromController !== null && fromController !== undefined) {
        const authoritative = facade.isRevisionAuthoritative
          ? facade.isRevisionAuthoritative(item)
          : true; // older facade without the getter: assume authoritative
        return { revision: fromController, authoritative };
      }
    }
  }
  const raw = item.getAttribute?.('data-revision');
  if (raw === null || raw === undefined) {
    // Attribute completely absent: non-blocking "1" UI placeholder
    // only — do NOT write it back onto the DOM, since that could
    // stamp a fake baseline over server intent that just hasn't
    // hydrated yet (matches HojrehPatternController._readRevisionAttr).
    return { revision: 1, authoritative: false };
  }
  if (raw === '') return { revision: null, authoritative: false };
  const num = Number(raw);
  return Number.isFinite(num)
    ? { revision: num, authoritative: true }
    : { revision: null, authoritative: false };
}

/** Back-compat wrapper: same bare-number contract callers already
 *  rely on, now backed by getEntityRevisionInfo(). */
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

/* Defer snapshot until all scripts have finished their synchronous init
   (pricing-patterns.js rewrites quantity-symbol and english-id inputs during its
   own boot, so snapshotting before it runs would cause false dirty detections). */
function initInitialDirtySnapshot() {
  setTimeout(function() { initDirtyTracking(document); }, 0);
}

/* ─── UNSAVED CHANGES DOT on header save button (via shared HojrehSaveDirty) ─── */
function initSaveDot() {
  saveDirty.injectDot('headerSaveBtn');

  const _settingsUnsavedState = { value: false };

  function refreshDot() {
    const hasFieldDirty = !!document.querySelector(
      'input[data-hojreh-dirty-ready="true"].hojreh-dirty-field:not([type="hidden"]):not([readonly]):not([data-hojreh-no-dirty]), ' +
      'select[data-hojreh-dirty-ready="true"].hojreh-dirty-field:not([type="hidden"]):not([readonly]):not([data-hojreh-no-dirty]), ' +
      'textarea[data-hojreh-dirty-ready="true"].hojreh-dirty-field:not([type="hidden"]):not([readonly]):not([data-hojreh-no-dirty])'
    );
    /* Also treat a changed list order as dirty */
    /* Also treat a changed formula as dirty (covers both manual edits and drag-reorders) */
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

/* ─── HEADER SAVE ACTION & TOAST ─── */
function initHeaderSaveButton() {
  const headerSaveBtn = document.getElementById('headerSaveBtn');
  if (!headerSaveBtn) return;
  headerSaveBtn.addEventListener('click', () => {
    const payload = getDirtySettingsPayload();
    /* Attach the current list order so the backend can persist item positions.
       The backend should use payload.order_payload.lists to update sort positions. */
    payload.order_payload = getOrderPayload();
    // در اتصال بک‌اند، payload.changes (تغییرات فیلدها) و payload.order_payload (ترتیب آیتم‌ها) ارسال می‌شود.
    /* ── Snapshot dirty state BEFORE commits so checks reflect pre-save truth ── */
    const hasOrderDirty = hasOrderChanged();
    const hasFormulaDirty = !!pricingPatterns.hasFormulaChanged?.();
    const totalChanges = payload.changes.length;

    window.dispatchEvent(new CustomEvent('hojreh:settings-save-payload', { detail: payload }));
    commitDirtyTracking(document);
    /* Advance the saved-order snapshot so the dirty dot clears after save */
    commitOrderTracking();
    /* Advance the formula snapshot so the dirty dot clears after save */
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
