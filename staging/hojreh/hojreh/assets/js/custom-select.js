'use strict';
const customSelect = { init, refresh, initAll, closeAll };
const registry = new WeakMap();
function setTriggerLabel(trigger, text) {
  let label = trigger.querySelector('.custom-select-trigger-label');
  if (!label) {
    label = document.createElement('span');
    label.className = 'custom-select-trigger-label';
    trigger.appendChild(label);
  }
  label.textContent = text;
  return label;
}
const portalMap = new WeakMap();
function init(nativeSelect) {
  if (!nativeSelect || nativeSelect.tagName !== 'SELECT') return;
  if (registry.has(nativeSelect)) return;
  nativeSelect.style.display = 'none';
  nativeSelect.setAttribute('aria-hidden', 'true');
  const isRounded = !!nativeSelect.closest('.pattern-item-search-wrapper');
  const isRange = nativeSelect.dataset.customSelectMode === 'range';
  const wrapper = document.createElement('div');
  wrapper.className = 'custom-select-wrapper'
    + (isRounded ? ' rounded-select' : '')
    + (isRange ? ' range-select' : '');
  wrapper.setAttribute('tabindex', '0');
  const trigger = document.createElement('div');
  trigger.className = 'custom-select-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  setTriggerLabel(trigger, getSelectedLabel(nativeSelect));
  const arrow = document.createElement('span');
  arrow.className = 'custom-select-arrow';
  arrow.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>`;
  const optionsPanel = document.createElement('div');
  optionsPanel.className = 'custom-select-options' + (isRounded ? ' rounded-select' : '');
  optionsPanel.setAttribute('role', 'listbox');
  document.body.appendChild(optionsPanel);
  portalMap.set(wrapper, optionsPanel);
  buildOptions(optionsPanel, nativeSelect, trigger, wrapper);
  wrapper.appendChild(trigger);
  wrapper.appendChild(arrow);
  nativeSelect.parentNode.insertBefore(wrapper, nativeSelect);
  if (nativeSelect.disabled) {
    wrapper.classList.add('is-disabled');
    wrapper.removeAttribute('tabindex');
  }
  trigger.addEventListener('click', function (e) {
    e.stopPropagation();
    if (wrapper.classList.contains('is-disabled')) return;
    toggleDropdown(wrapper, nativeSelect);
  });
  wrapper.addEventListener('keydown', function (e) {
    handleKeydown(e, wrapper, nativeSelect, trigger, optionsPanel);
  });
  nativeSelect.addEventListener('change', function () {
    setTriggerLabel(trigger, getSelectedLabel(nativeSelect));
    syncSelectedClass(optionsPanel, nativeSelect.value);
  });
  registry.set(nativeSelect, wrapper);
}
function refresh(nativeSelect) {
  if (!registry.has(nativeSelect)) { init(nativeSelect); return; }
  const wrapper = registry.get(nativeSelect);
  const trigger = wrapper.querySelector('.custom-select-trigger');
  const optionsPanel = portalMap.get(wrapper);
  if (!optionsPanel) return;
  const isRange = nativeSelect.dataset.customSelectMode === 'range';
  wrapper.classList.toggle('range-select', isRange);
  optionsPanel.classList.toggle('custom-select-options--range', isRange);
  optionsPanel.innerHTML = '';
  buildOptions(optionsPanel, nativeSelect, trigger, wrapper);
  setTriggerLabel(trigger, getSelectedLabel(nativeSelect));
}
function initAll() {
  document.querySelectorAll('select').forEach(function (sel) {
    if (!registry.has(sel)) init(sel);
  });
}
function closeAll() {
  document.querySelectorAll('.custom-select-wrapper.is-open').forEach(closeDropdown);
}
function getSelectedLabel(nativeSelect) {
  const selected = nativeSelect.options[nativeSelect.selectedIndex];
  return selected ? selected.textContent.trim() : '';
}
function buildOptions(panel, nativeSelect, trigger, wrapper) {
  if (nativeSelect.dataset.customSelectMode === 'range') {
    buildRangeControl(panel, nativeSelect, trigger);
    return;
  }
  const isRounded = panel.classList.contains('rounded-select');
  let container = panel;
  if (isRounded) {
    let scroller = panel.querySelector('.custom-select-scroll-inner');
    if (!scroller) {
      scroller = document.createElement('div');
      scroller.className = 'custom-select-scroll-inner';
      panel.appendChild(scroller);
    }
    container = scroller;
  }
  Array.from(nativeSelect.options).forEach(function (opt, index) {
    const item = document.createElement('div');
    item.className = 'custom-select-option';
    item.textContent = opt.textContent.trim();
    item.dataset.value = opt.value;
    item.setAttribute('role', 'option');
    item.style.setProperty('--item-index', index);
    if (opt.disabled) {
      item.classList.add('is-disabled');
      item.setAttribute('aria-disabled', 'true');
    }
    if (opt.selected) {
      item.classList.add('is-selected');
      item.setAttribute('aria-selected', 'true');
    }
    item.addEventListener('mousedown', function (e) {
      e.preventDefault();
    });
    item.addEventListener('click', function (e) {
      e.stopPropagation();
      if (item.classList.contains('is-disabled')) return;
      selectOption(item, panel, nativeSelect, trigger);
      closeDropdown(wrapper);
    });
    container.appendChild(item);
  });
}
function buildRangeControl(panel, nativeSelect, trigger) {
  const options = Array.from(nativeSelect.options).filter(opt => !opt.disabled);
  if (!options.length) return;
  panel.classList.add('custom-select-options--range');
  const control = document.createElement('div');
  control.className = 'custom-select-range-control';
  const range = document.createElement('input');
  range.className = 'custom-select-range-input';
  range.type = 'range';
  range.min = '0';
  range.max = String(options.length - 1);
  range.step = '1';
  range.value = String(Math.max(0, options.findIndex(opt => opt.selected)));
  range.setAttribute('aria-label', nativeSelect.getAttribute('aria-label') || 'انتخاب بازه');
  const syncRangeVisual = () => {
    const index = Number(range.value);
    const progress = options.length > 1 ? (index / (options.length - 1)) * 100 : 0;
    range.style.setProperty('--range-progress', `${progress}%`);
    range.setAttribute('aria-valuetext', options[index]?.textContent.trim() || '');
  };
  range.addEventListener('input', function (event) {
    event.stopPropagation();
    const selectedOption = options[Number(range.value)];
    if (!selectedOption) return;
    nativeSelect.value = selectedOption.value;
    nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    const label = setTriggerLabel(trigger, selectedOption.textContent.trim());
    label.classList.remove('is-range-value-changing');
    void label.offsetWidth;
    label.classList.add('is-range-value-changing');
    syncRangeVisual();
  });
  range.addEventListener('click', event => event.stopPropagation());
  const stopDragging = () => range.classList.remove('is-dragging');
  range.addEventListener('pointerdown', event => {
    range.classList.add('is-dragging');
    try { range.setPointerCapture(event.pointerId); } catch (_) {}
  });
  range.addEventListener('pointerup', stopDragging);
  range.addEventListener('pointercancel', stopDragging);
  range.addEventListener('blur', stopDragging);
  control.appendChild(range);
  panel.appendChild(control);
  syncRangeVisual();
}
function selectOption(item, panel, nativeSelect, trigger) {
  nativeSelect.value = item.dataset.value;
  nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
  setTriggerLabel(trigger, item.textContent.trim());
  syncSelectedClass(panel, item.dataset.value);
}
function syncSelectedClass(panel, value) {
  panel.querySelectorAll('.custom-select-option').forEach(function (opt) {
    const isSelected = opt.dataset.value === value;
    opt.classList.toggle('is-selected', isSelected);
    opt.setAttribute('aria-selected', String(isSelected));
  });
}
function toggleDropdown(wrapper, nativeSelect) {
  if (wrapper.classList.contains('is-open')) {
    closeDropdown(wrapper);
  } else {
    document.querySelectorAll('.custom-select-wrapper.is-open').forEach(function (w) {
      if (w !== wrapper) closeDropdown(w);
    });
    openDropdown(wrapper);
  }
}
function openDropdown(wrapper) {
  const panel = portalMap.get(wrapper);
  if (!panel) return;
  positionPanel(wrapper, panel);
  wrapper.classList.add('is-open');
  panel.classList.add('is-open');
  const trigger = wrapper.querySelector('.custom-select-trigger');
  if (trigger) trigger.setAttribute('aria-expanded', 'true');
  const selected = panel.querySelector('.custom-select-option.is-selected');
  if (selected) {
    setTimeout(function () { selected.scrollIntoView({ block: 'nearest' }); }, 0);
  }
}
function closeDropdown(wrapper) {
  if (!wrapper) return;
  const panel = portalMap.get(wrapper);
  wrapper.classList.remove('is-open');
  if (panel) panel.classList.remove('is-open');
  const trigger = wrapper.querySelector('.custom-select-trigger');
  if (trigger) trigger.setAttribute('aria-expanded', 'false');
}
function positionPanel(wrapper, panel) {
  const rect = wrapper.getBoundingClientRect();
  const viewportH = window.innerHeight;
  const viewportW = window.innerWidth;
  const gapPx = parseFloat(getComputedStyle(wrapper).getPropertyValue('--custom-select-gap')) || 5;
  const panelWidth = rect.width;
  const scroller = panel.querySelector('.custom-select-scroll-inner') || panel;
  const panelH = Math.min(220, scroller.scrollHeight || 220);
  const spaceBelow = viewportH - rect.bottom;
  const spaceAbove = rect.top;
  const openUpward = spaceBelow < panelH + gapPx && spaceAbove > spaceBelow;
  panel.style.position = 'fixed';
  panel.style.width    = panelWidth + 'px';
  panel.style.minWidth = 'unset';
  panel.style.maxWidth = 'unset';
  const inWooMockupFormulaModal = !!wrapper.closest('.hojreh-formula-modal-overlay');
  panel.style.zIndex = inWooMockupFormulaModal
    ? '100001'
    : (wrapper.closest('.pattern-fullscreen') ? '1500' : '');
  let leftPos = rect.left;
  if (leftPos + panelWidth > viewportW) {
    leftPos = viewportW - panelWidth;
  }
  if (leftPos < 0) leftPos = 0;
  panel.style.left  = leftPos + 'px';
  panel.style.right = 'auto';
  if (openUpward) {
    panel.style.bottom = (viewportH - rect.top + gapPx) + 'px';
    panel.style.top    = 'auto';
  } else {
    panel.style.top    = (rect.bottom + gapPx) + 'px';
    panel.style.bottom = 'auto';
  }
}
function repositionOpenPanels() {
  document.querySelectorAll('.custom-select-wrapper.is-open').forEach(function (wrapper) {
    const panel = portalMap.get(wrapper);
    if (panel) positionPanel(wrapper, panel);
  });
}
function handleKeydown(e, wrapper, nativeSelect, trigger, panel) {
  if (e.target?.classList.contains('custom-select-range-input')) return;
  const isOpen = wrapper.classList.contains('is-open');
  const options = Array.from(panel.querySelectorAll('.custom-select-option:not(.is-disabled)'));
  const currentIndex = options.findIndex(o => o.classList.contains('is-selected'));
  switch (e.key) {
    case 'Enter':
    case ' ':
      e.preventDefault();
      if (!isOpen) {
        openDropdown(wrapper);
      } else {
        const highlighted = panel.querySelector('.custom-select-option.is-highlighted');
        if (highlighted) {
          selectOption(highlighted, panel, nativeSelect, trigger);
          closeDropdown(wrapper);
        }
      }
      break;
    case 'ArrowDown':
      e.preventDefault();
      if (!isOpen) { openDropdown(wrapper); return; }
      moveHighlight(options, currentIndex, 1);
      break;
    case 'ArrowUp':
      e.preventDefault();
      if (!isOpen) { openDropdown(wrapper); return; }
      moveHighlight(options, currentIndex, -1);
      break;
    case 'Escape':
    case 'Tab':
      closeDropdown(wrapper);
      break;
  }
}
function moveHighlight(options, currentIndex, direction) {
  options.forEach(o => o.classList.remove('is-highlighted'));
  let nextIndex = currentIndex + direction;
  if (nextIndex < 0) nextIndex = options.length - 1;
  if (nextIndex >= options.length) nextIndex = 0;
  const next = options[nextIndex];
  if (next) {
    next.classList.add('is-highlighted');
    next.scrollIntoView({ block: 'nearest' });
  }
}
document.addEventListener('click', function (e) {
  document.querySelectorAll('.custom-select-wrapper.is-open').forEach(function (wrapper) {
    const panel = portalMap.get(wrapper);
    if (!wrapper.contains(e.target) && !(panel && panel.contains(e.target))) {
      closeDropdown(wrapper);
    }
  });
});
window.addEventListener('scroll', repositionOpenPanels, { passive: true, capture: true });
window.addEventListener('resize', repositionOpenPanels, { passive: true });
document.addEventListener('mousedown', function (e) {
  if (e.target.closest('.acc-drag-handle')) {
    closeAll();
  }
}, true);
document.addEventListener('touchstart', function (e) {
  if (e.target.closest('.acc-drag-handle')) {
    closeAll();
  }
}, { capture: true, passive: true });
function observeDom() {
  const observer = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        if (node.classList && node.classList.contains('formula-drag-ghost')) return;
        if (node.closest && node.closest('.formula-drag-ghost')) return;
        if (node.tagName === 'SELECT') { init(node); return; }
        node.querySelectorAll && node.querySelectorAll('select').forEach(function (sel) {
          if (!sel.closest('.formula-drag-ghost')) init(sel);
        });
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function () { initAll(); observeDom(); });
} else {
  initAll();
  observeDom();
}
export { customSelect };