(function () {
  'use strict';
  const list = document.getElementById('pricingPatternsList');
  if (!list) return;
  function fullscreenButtonMarkup() {
    return `
      <button class="acc-fullscreen-btn" type="button" aria-label="نمایش تمام‌صفحه الگو" title="نمایش تمام‌صفحه">
        <span class="fs-icon fs-icon-expand">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 4H5a1 1 0 0 0-1 1v4"/>
            <path d="M15 4h4a1 1 0 0 1 1 1v4"/>
            <path d="M9 20H5a1 1 0 0 1-1-1v-4"/>
            <path d="M15 20h4a1 1 0 0 0 1-1v-4"/>
          </svg>
        </span>
        <span class="fs-icon fs-icon-collapse">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 9h4a1 1 0 0 0 1-1V4"/>
            <path d="M20 9h-4a1 1 0 0 1-1-1V4"/>
            <path d="M4 15h4a1 1 0 0 1 1 1v4"/>
            <path d="M20 15h-4a1 1 0 0 0-1 1v4"/>
          </svg>
        </span>
      </button>
    `;
  }
  function upgradePatternAccordion(item) {
    if (!item || item.dataset.fsReady === 'true') return;
    if (item.querySelector(':scope > .accordion-header > .acc-left-actions > .acc-toggle-group')) {
      item.dataset.fsReady = 'true';
      return;
    }
    const toggleBtn = item.querySelector(':scope > .accordion-header > .acc-left-actions > .acc-toggle-btn');
    if (!toggleBtn) return;
    const group = document.createElement('div');
    group.className = 'acc-toggle-group';
    toggleBtn.parentNode.insertBefore(group, toggleBtn);
    group.insertAdjacentHTML('beforeend', fullscreenButtonMarkup());
    group.appendChild(toggleBtn);
    item.dataset.fsReady = 'true';
  }
  function upgradeAllPatternAccordions() {
    list.querySelectorAll(':scope > .accordion-item[data-type="pattern"]').forEach(upgradePatternAccordion);
  }
  upgradeAllPatternAccordions();
  const patternUpgradeObserver = new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        if (node.matches && node.matches('.accordion-item[data-type="pattern"]')) {
          upgradePatternAccordion(node);
        }
        if (node.querySelectorAll) {
          node.querySelectorAll('.accordion-item[data-type="pattern"]').forEach(upgradePatternAccordion);
        }
      });
    });
  });
  patternUpgradeObserver.observe(list, { childList: true, subtree: true });
  function prefersReducedMotion() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }
  function enterFullscreen(item) {
    if (item.classList.contains('pattern-fullscreen') || item.classList.contains('pattern-fullscreen-animating')) return;
    const other = document.querySelector('.accordion-item.pattern-fullscreen');
    if (other && other !== item) exitFullscreenInstant(other);
    const reduceMotion = prefersReducedMotion();
    const rect = item.getBoundingClientRect();
    const placeholder = document.createElement('div');
    placeholder.className = 'pattern-fullscreen-placeholder';
    placeholder.style.height = rect.height + 'px';
    const cs = getComputedStyle(item);
    placeholder.style.marginBottom = cs.marginBottom;
    item.parentNode.insertBefore(placeholder, item);
    item._flipPlaceholder = placeholder;
    document.body.classList.add('hojreh-fs-lock');
    if (reduceMotion) {
      item.classList.add('pattern-fullscreen');
      return;
    }
    item.style.position = 'fixed';
    item.style.top = rect.top + 'px';
    item.style.left = rect.left + 'px';
    item.style.right = 'auto';
    item.style.bottom = 'auto';
    item.style.width = rect.width + 'px';
    item.style.height = rect.height + 'px';
    item.style.margin = '0';
    void item.offsetWidth; 
    item.classList.add('pattern-fullscreen', 'pattern-fullscreen-animating');
    requestAnimationFrame(() => {
      item.style.top = '0px';
      item.style.left = '0px';
      item.style.right = 'auto';
      item.style.bottom = 'auto';
      item.style.width = window.innerWidth + 'px';
      item.style.height = window.innerHeight + 'px';
    });
    const cleanup = (e) => {
      if (e && e.propertyName && e.propertyName !== 'width' && e.propertyName !== 'height') return;
      item.removeEventListener('transitionend', cleanup);
      item.classList.remove('pattern-fullscreen-animating');
      ['position', 'top', 'left', 'right', 'bottom', 'width', 'height', 'margin', 'zIndex'].forEach(p => { item.style[p] = ''; });
    };
    item.addEventListener('transitionend', cleanup);
    setTimeout(() => cleanup(null), 600); 
  }
  function exitFullscreen(item) {
    if (!item.classList.contains('pattern-fullscreen') || item.classList.contains('pattern-fullscreen-animating')) return;
    const reduceMotion = prefersReducedMotion();
    const placeholder = item._flipPlaceholder;
    const finish = () => {
      if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
      item._flipPlaceholder = null;
      document.body.classList.remove('hojreh-fs-lock');
    };
    if (reduceMotion) {
      item.classList.remove('pattern-fullscreen');
      finish();
      return;
    }
    const startRect = item.getBoundingClientRect(); 
    const endRect = placeholder ? placeholder.getBoundingClientRect() : startRect;
    item.style.position = 'fixed';
    item.style.top = startRect.top + 'px';
    item.style.left = startRect.left + 'px';
    item.style.right = 'auto'; 
    item.style.bottom = 'auto';
    item.style.width = startRect.width + 'px';
    item.style.height = startRect.height + 'px';
    item.style.margin = '0';
    void item.offsetWidth;
    item.classList.remove('pattern-fullscreen');
    item.classList.add('pattern-fullscreen-animating');
    requestAnimationFrame(() => {
      item.style.top = endRect.top + 'px';
      item.style.left = endRect.left + 'px';
      item.style.right = 'auto';
      item.style.bottom = 'auto';
      item.style.width = endRect.width + 'px';
      item.style.height = endRect.height + 'px';
    });
    const cleanup = (e) => {
      if (e && e.propertyName && e.propertyName !== 'width' && e.propertyName !== 'height') return;
      item.removeEventListener('transitionend', cleanup);
      item.classList.remove('pattern-fullscreen-animating');
      ['position', 'top', 'left', 'right', 'bottom', 'width', 'height', 'margin', 'zIndex'].forEach(p => { item.style[p] = ''; });
      finish();
    };
    item.addEventListener('transitionend', cleanup);
    setTimeout(() => cleanup(null), 600);
  }
  function exitFullscreenInstant(item) {
    item.classList.remove('pattern-fullscreen', 'pattern-fullscreen-animating');
    ['position', 'top', 'left', 'right', 'bottom', 'width', 'height', 'margin', 'zIndex'].forEach(p => { item.style[p] = ''; });
    if (item._flipPlaceholder && item._flipPlaceholder.parentNode) {
      item._flipPlaceholder.parentNode.removeChild(item._flipPlaceholder);
    }
    item._flipPlaceholder = null;
    document.body.classList.remove('hojreh-fs-lock');
  }
  list.addEventListener('click', function (e) {
    const fsBtn = e.target.closest('.acc-fullscreen-btn');
    if (!fsBtn) return;
    e.stopPropagation(); 
    e.preventDefault();
    const item = fsBtn.closest('.accordion-item[data-type="pattern"]');
    if (!item) return;
    if (item.classList.contains('pattern-fullscreen')) {
      exitFullscreen(item);
    } else {
      enterFullscreen(item);
    }
  });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    const active = document.querySelector('.accordion-item.pattern-fullscreen:not(.pattern-fullscreen-animating)');
    if (active) exitFullscreen(active);
  });
  document.addEventListener('click', function (e) {
    const header = e.target.closest('.accordion-header');
    if (!header) return;
    const item = header.closest('.accordion-item.pattern-fullscreen');
    if (!item) return;
    if (e.target.closest('.acc-fullscreen-btn')) return; 
    e.stopImmediatePropagation();
  }, true); 
})();
