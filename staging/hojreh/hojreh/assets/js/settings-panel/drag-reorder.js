import { createPlaceholder } from '../general.js';
import { pricingPatterns } from '../pricing-patterns.js';
const _savedListOrders = {};
function getListOrder(list) {
  return [...list.querySelectorAll(':scope > .accordion-item')]
    .map(item => item.dataset.id || item.dataset.type || '');
}
function snapshotAllListOrders() {
  document.querySelectorAll('.accordion-list[id]').forEach(list => {
    _savedListOrders[list.id] = getListOrder(list);
  });
}
function hasOrderChanged() {
  return document.querySelectorAll('.accordion-list[id]').length > 0 &&
    [...document.querySelectorAll('.accordion-list[id]')].some(list => {
      const saved = _savedListOrders[list.id];
      if (!saved) return false;
      const live = getListOrder(list);
      return live.length !== saved.length || live.some((id, i) => id !== saved[i]);
    });
}
function commitOrderTracking() {
  snapshotAllListOrders();
}
function getOrderPayload() {
  const lists = {};
  document.querySelectorAll('.accordion-list[id]').forEach(list => {
    lists[list.id] = getListOrder(list).map((id, index) => ({ id, position: index }));
  });
  return { save_mode: 'order', lists };
}
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
function initDragHandles() {
  document.querySelectorAll('.accordion-list').forEach(list => {
    list.querySelectorAll('.acc-drag-handle').forEach(handle => {
      handle.addEventListener('mousedown', startDrag);
      handle.addEventListener('touchstart', startDrag, { passive: false });
    });
  });
}
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
