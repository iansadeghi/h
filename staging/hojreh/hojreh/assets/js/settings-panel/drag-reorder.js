import { createPlaceholder } from '../general.js';
import { pricingPatterns } from '../pricing-patterns.js';

/* ─── DRAG & DROP + ORDER DIRTY TRACKING ───
 *
 * Order-dirty tracking works independently from field-value dirty tracking.
 * It keeps a "saved order" snapshot per list (set at page load and again
 * after each successful save) and compares it to the live DOM order after
 * every drop. If any list's order differs from its saved snapshot, the save
 * button shows the unsaved-changes dot.
 *
 * Saved snapshots are stored as arrays of data-id values keyed by list id.
 * On save, commitOrderTracking() is called to advance the snapshot to the
 * current DOM order, clearing the dirty flag.
 */

/* Map<listId, string[]>  — the order that is considered "saved" */
const _savedListOrders = {};

/** Return the current DOM order of data-id values for a given accordion-list */
function getListOrder(list) {
  return [...list.querySelectorAll(':scope > .accordion-item')]
    .map(item => item.dataset.id || item.dataset.type || '');
}

/** Snapshot the current DOM order for all lists — call once at boot and again after save */
function snapshotAllListOrders() {
  document.querySelectorAll('.accordion-list[id]').forEach(list => {
    _savedListOrders[list.id] = getListOrder(list);
  });
}

/** True if any list's live order differs from its saved snapshot */
function hasOrderChanged() {
  return document.querySelectorAll('.accordion-list[id]').length > 0 &&
    [...document.querySelectorAll('.accordion-list[id]')].some(list => {
      const saved = _savedListOrders[list.id];
      if (!saved) return false;
      const live = getListOrder(list);
      return live.length !== saved.length || live.some((id, i) => id !== saved[i]);
    });
}

/** Advance saved snapshots to current DOM order — call after a successful save */
function commitOrderTracking() {
  snapshotAllListOrders();
}

/** Return an order payload describing the current position of every item in every list */
function getOrderPayload() {
  const lists = {};
  document.querySelectorAll('.accordion-list[id]').forEach(list => {
    lists[list.id] = getListOrder(list).map((id, index) => ({ id, position: index }));
  });
  return { save_mode: 'order', lists };
}

/* ── Drag implementation ── */
let draggingEl = null;
let placeholder = null;

function startDrag(e) {
  e.preventDefault();
  const item = e.currentTarget.closest('.accordion-item');
  if (item.closest('.pattern-interactive-box')) return;
  const activeList = item.closest('.accordion-list');
  draggingEl = item;

  const rect = item.getBoundingClientRect();
  placeholder = createPlaceholder(rect.height);
  item.after(placeholder);
  item.classList.add('dragging');

  item.style.position = 'fixed';
  item.style.zIndex = '999';
  item.style.width = rect.width + 'px';
  item.style.left = rect.left + 'px';
  item.style.top = rect.top + 'px';
  item.style.margin = '0';

  const startY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
  const offsetY = startY - rect.top;

  function onMove(ev) {
    const clientY = ev.type === 'touchmove' ? ev.touches[0].clientY : ev.clientY;
    item.style.top = (clientY - offsetY) + 'px';

    const siblings = [...activeList.querySelectorAll('.accordion-item:not(.dragging)')];
    const after = siblings.find(sib => {
      const r = sib.getBoundingClientRect();
      return clientY < r.top + r.height / 2;
    });

    if (after) {
      activeList.insertBefore(placeholder, after);
    } else {
      activeList.appendChild(placeholder);
    }
  }

  const onUp = function() {
    item.style.position = '';
    item.style.zIndex = '';
    item.style.width = '';
    item.style.left = '';
    item.style.top = '';
    item.style.margin = '';
    item.classList.remove('dragging');
    activeList.insertBefore(item, placeholder);
    placeholder.remove();
    placeholder = null;
    draggingEl = null;
    pricingPatterns.refreshFormulaAfterSettingsChange?.();

    /* After the item settles in its new position, check whether the order
       of this list actually changed relative to the saved snapshot.
       If it did, surface the unsaved-changes dot on the save button. */
    window._hojrehRefreshSettingsDot?.();

    document.removeEventListener('mousemove', onMove);
    document.removeEventListener('mouseup', onUp);
    document.removeEventListener('touchmove', onMove);
    document.removeEventListener('touchend', onUp);
  };

  document.addEventListener('mousemove', onMove);
  document.addEventListener('mouseup', onUp);
  document.addEventListener('touchmove', onMove, { passive: false });
  document.addEventListener('touchend', onUp);
}

/* Wire drag handles for every accordion already present in the initial page markup */
function initDragHandles() {
  document.querySelectorAll('.accordion-list').forEach(list => {
    list.querySelectorAll('.acc-drag-handle').forEach(handle => {
      handle.addEventListener('mousedown', startDrag);
      handle.addEventListener('touchstart', startDrag, { passive: false });
    });
  });
}

/* Take the initial snapshot once the DOM is settled */
function initOrderSnapshot() {
  setTimeout(snapshotAllListOrders, 0);
}

export {
  startDrag,
  getListOrder,
  snapshotAllListOrders,
  hasOrderChanged,
  commitOrderTracking,
  getOrderPayload,
  initDragHandles,
  initOrderSnapshot
};
