/**
 * custom-select.js — Hojreh Custom Dropdown System
 *
 * KEY DESIGN DECISIONS:
 *
 * 1. PORTAL RENDERING — The options panel is appended to <body>, not inside
 *    the wrapper. This makes it immune to overflow:hidden on any ancestor
 *    (accordion-body, computational-group-box, etc.). Position is calculated
 *    with getBoundingClientRect() on every open.
 *
 * 2. Z-INDEX 99 — Below the sticky header (z-index:100) so the dropdown
 *    never floats on top of the header when scrolling.
 *
 * 3. DRAG SAFETY — Before the drag ghost is cloned, we close all open
 *    dropdowns. The ghost therefore never contains an open dropdown, so
 *    dragging cannot break the layout. We also listen for the custom
 *    'formula-drag-start' event emitted by pricing-patterns.js.
 *
 * 4. FORMULA-DRAG-START — pricing-patterns.js fires this event on
 *    mousedown/touchstart of any drag handle. We close all open dropdowns
 *    at that moment before the ghost is created.
 */

/** سیستم dropdown سفارشی. */
  'use strict';

  /* ─── Public API ─── */
  const customSelect = { init, refresh, initAll, closeAll };

  /* ─── Internal registry: native select → wrapper element ─── */
  const registry = new WeakMap();

  /* Text inside the trigger always lives in its own inline span
     (.custom-select-trigger-label) instead of directly as trigger.textContent.
     This lets per-change effects (e.g. the range-control blur swap) target
     only the text node, never the trigger's background/padding/border. */
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

  /* ─── Portal panel registry: wrapper → floating panel (in body) ─── */
  const portalMap = new WeakMap();

  /* ════════════════════════════════════════════════════════════════
     INIT
     ════════════════════════════════════════════════════════════════ */

  function init(nativeSelect) {
    if (!nativeSelect || nativeSelect.tagName !== 'SELECT') return;
    if (registry.has(nativeSelect)) return;

    nativeSelect.style.display = 'none';
    nativeSelect.setAttribute('aria-hidden', 'true');

    const isRounded = !!nativeSelect.closest('.pattern-item-search-wrapper');
    const isRange = nativeSelect.dataset.customSelectMode === 'range';

    /* Wrapper — only contains trigger + arrow; options panel goes in body */
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

    /* Portal panel — lives in <body>, positioned absolutely */
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

    /* ─── Events ─── */

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      if (wrapper.classList.contains('is-disabled')) return;
      toggleDropdown(wrapper, nativeSelect);
    });

    wrapper.addEventListener('keydown', function (e) {
      handleKeydown(e, wrapper, nativeSelect, trigger, optionsPanel);
    });

    /* Keep custom UI in sync when native value changes programmatically */
    nativeSelect.addEventListener('change', function () {
      setTriggerLabel(trigger, getSelectedLabel(nativeSelect));
      syncSelectedClass(optionsPanel, nativeSelect.value);
    });

    registry.set(nativeSelect, wrapper);
  }

  /* ════════════════════════════════════════════════════════════════
     REFRESH
     ════════════════════════════════════════════════════════════════ */

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

  /* ════════════════════════════════════════════════════════════════
     INIT ALL
     ════════════════════════════════════════════════════════════════ */

  function initAll() {
    document.querySelectorAll('select').forEach(function (sel) {
      if (!registry.has(sel)) init(sel);
    });
  }

  /* ════════════════════════════════════════════════════════════════
     CLOSE ALL (called before drag starts)
     ════════════════════════════════════════════════════════════════ */

  function closeAll() {
    document.querySelectorAll('.custom-select-wrapper.is-open').forEach(closeDropdown);
  }

  /* ════════════════════════════════════════════════════════════════
     HELPERS
     ════════════════════════════════════════════════════════════════ */

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

    /* For rounded panels the options go inside a scroll wrapper so that
       overflow:hidden on the panel clips the scrollbar to the border-radius.
       For square panels the options go directly into the panel (existing behaviour). */
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

    Array.from(nativeSelect.options).forEach(function (opt) {
      const item = document.createElement('div');
      item.className = 'custom-select-option';
      item.textContent = opt.textContent.trim();
      item.dataset.value = opt.value;
      item.setAttribute('role', 'option');

      if (opt.disabled) {
        item.classList.add('is-disabled');
        item.setAttribute('aria-disabled', 'true');
      }
      if (opt.selected) {
        item.classList.add('is-selected');
        item.setAttribute('aria-selected', 'true');
      }

      item.addEventListener('mousedown', function (e) {
        /* mousedown instead of click so we can preventDefault before blur */
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

  /* A range-mode select keeps the native <select> as the data contract while
     replacing the ordinary option list with a discrete slider. The feature is
     opt-in through data-custom-select-mode="range", so existing dropdowns keep
     their markup, keyboard handling and styling unchanged. */
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
      // فقط خودِ span متن بلر/محو می‌شود، نه کل باکس تریگر.
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

  /* ════════════════════════════════════════════════════════════════
     DROPDOWN OPEN / CLOSE
     ════════════════════════════════════════════════════════════════ */

  function toggleDropdown(wrapper, nativeSelect) {
    if (wrapper.classList.contains('is-open')) {
      closeDropdown(wrapper);
    } else {
      /* Close all other open dropdowns first */
      document.querySelectorAll('.custom-select-wrapper.is-open').forEach(function (w) {
        if (w !== wrapper) closeDropdown(w);
      });
      openDropdown(wrapper);
    }
  }

  function openDropdown(wrapper) {
    const panel = portalMap.get(wrapper);
    if (!panel) return;

    /* Position the panel relative to the trigger */
    positionPanel(wrapper, panel);

    wrapper.classList.add('is-open');
    panel.classList.add('is-open');
    const trigger = wrapper.querySelector('.custom-select-trigger');
    if (trigger) trigger.setAttribute('aria-expanded', 'true');

    /* Scroll selected option into view */
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

  /**
   * Calculate and apply position for the portal panel.
   * Called on open and on scroll/resize while open.
   *
   * Strategy: anchor to the trigger's left edge and set an exact pixel width.
   * This guarantees the panel aligns perfectly under the trigger regardless
   * of writing direction, scroll position, or ancestor transforms.
   *
   * Gap between the trigger and the panel is controlled by the CSS custom
   * property --custom-select-gap on .custom-select-wrapper (default 5px).
   * Adjust that variable — or override it on a specific wrapper — to change
   * the spacing without touching this function.
   */
  function positionPanel(wrapper, panel) {
    const rect = wrapper.getBoundingClientRect();
    const viewportH = window.innerHeight;
    const viewportW = window.innerWidth;

    /* Read gap from CSS variable so callers can override per-instance */
    const gapPx = parseFloat(getComputedStyle(wrapper).getPropertyValue('--custom-select-gap')) || 5;

    /* Exact width match — no rounding */
    const panelWidth = rect.width;

    /* Estimate panel height before it is shown (max-height is 220px).
       For rounded panels the scroll container is an inner div, so check that. */
    const scroller = panel.querySelector('.custom-select-scroll-inner') || panel;
    const panelH = Math.min(220, scroller.scrollHeight || 220);

    /* Prefer opening downward; flip upward only when there is not enough
       space below but there is more space above */
    const spaceBelow = viewportH - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < panelH + gapPx && spaceAbove > spaceBelow;

    panel.style.position = 'fixed';
    panel.style.width    = panelWidth + 'px';
    panel.style.minWidth = 'unset';
    panel.style.maxWidth = 'unset';

    /* z-index: پنل به‌طور پیش‌فرض از CSS مقدار 99 می‌گیرد (زیر هدر چسبان،
       طبق طراحی اصلی). اما وقتی تریگر داخل یک آکاردئون پترنِ تمام‌صفحه است
       (z-index:1000، که عمداً کل صفحه از جمله هدر را می‌پوشاند)، پنل با همان
       99 عملاً زیر آن مودالِ تمام‌صفحه دفن و نامرئی می‌شد. اینجا اگر چنین
       تریگری تشخیص داده شود، z-index پنل موقتاً بالاتر از مودال ست می‌شود؛
       در غیر این صورت هیچ تغییری نسبت به رفتار قبلی ایجاد نمی‌شود.

       همین مشکل، با شدت بیشتر، برای مودال «تنظیم فرمول محصول» در پروژه
       woo-mockup هم صدق می‌کند: آن مودال (.hojreh-formula-modal-overlay)
       z-index:100000 دارد، خیلی بالاتر از 1000 مودال pattern-fullscreen
       خودِ حجره — پس اگر این کلاس هم اینجا چک نشود، پنل دراپ‌داون داخل آن
       مودال با z-index:99 کاملاً پشت مودال دفن و نامرئی می‌شود (این دقیقاً
       همان چیزی بود که به‌عنوان «لیست آیتم‌ها با کلیک چیزی نشان نمی‌دهد»
       گزارش شد). عدد 100001 عمداً یک واحد بالاتر از 100000 است تا همیشه
       بالای آن مودال بماند، هرچقدر هم z-index مودال در آینده عوض شود --
       اگر آن عدد تغییر کرد، این عدد هم باید متناظر آپدیت شود. */
    const inWooMockupFormulaModal = !!wrapper.closest('.hojreh-formula-modal-overlay');
    panel.style.zIndex = inWooMockupFormulaModal
      ? '100001'
      : (wrapper.closest('.pattern-fullscreen') ? '1500' : '');

    /* Horizontal: align left edge to trigger's left edge.
       Clamp so the panel never exceeds the viewport on the right. */
    let leftPos = rect.left;
    if (leftPos + panelWidth > viewportW) {
      leftPos = viewportW - panelWidth;
    }
    if (leftPos < 0) leftPos = 0;

    panel.style.left  = leftPos + 'px';
    panel.style.right = 'auto';

    /* Vertical */
    if (openUpward) {
      panel.style.bottom = (viewportH - rect.top + gapPx) + 'px';
      panel.style.top    = 'auto';
    } else {
      panel.style.top    = (rect.bottom + gapPx) + 'px';
      panel.style.bottom = 'auto';
    }
  }

  /* ─── Reposition all open panels on scroll / resize ─── */
  function repositionOpenPanels() {
    document.querySelectorAll('.custom-select-wrapper.is-open').forEach(function (wrapper) {
      const panel = portalMap.get(wrapper);
      if (panel) positionPanel(wrapper, panel);
    });
  }

  /* ─── Keyboard navigation ─── */
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

  /* ════════════════════════════════════════════════════════════════
     GLOBAL EVENT LISTENERS
     ════════════════════════════════════════════════════════════════ */

  /* Close on outside click */
  document.addEventListener('click', function (e) {
    document.querySelectorAll('.custom-select-wrapper.is-open').forEach(function (wrapper) {
      const panel = portalMap.get(wrapper);
      if (!wrapper.contains(e.target) && !(panel && panel.contains(e.target))) {
        closeDropdown(wrapper);
      }
    });
  });

  /* Reposition on scroll or resize */
  window.addEventListener('scroll', repositionOpenPanels, { passive: true, capture: true });
  window.addEventListener('resize', repositionOpenPanels, { passive: true });

  /* Close all dropdowns before any drag starts — prevents ghost clone issues */
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

  /* ════════════════════════════════════════════════════════════════
     MUTATION OBSERVER — auto-init dynamically added selects
     ════════════════════════════════════════════════════════════════ */

  function observeDom() {
    const observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          /* Never initialise anything inside a drag ghost — it is a visual
             clone only and must not gain new interactive widgets. */
          if (node.classList && node.classList.contains('formula-drag-ghost')) return;
          if (node.closest && node.closest('.formula-drag-ghost')) return;
          if (node.tagName === 'SELECT') { init(node); return; }
          node.querySelectorAll && node.querySelectorAll('select').forEach(function (sel) {
            /* Skip selects inside drag ghosts added as subtrees */
            if (!sel.closest('.formula-drag-ghost')) init(sel);
          });
        });
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /* ════════════════════════════════════════════════════════════════
     BOOTSTRAP
     ════════════════════════════════════════════════════════════════ */

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { initAll(); observeDom(); });
  } else {
    initAll();
    observeDom();
  }

export { customSelect };
