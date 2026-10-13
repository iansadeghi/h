const PREVIEW_SELECTOR = '.formula-preview-large-box';
const ACTION_SELECTOR = '.btn-test-formula, .hojreh-modal-manual-formula-btn';
const SAFE_GAP = 3;
const boundPreviews = new WeakSet();
function hasHorizontalOverflow(preview) {
  return (preview.scrollWidth - preview.clientWidth) > 1;
}
function hiddenContentOnRight(preview) {
  if (!hasHorizontalOverflow(preview)) return false;
  const direction = getComputedStyle(preview).direction;
  if (direction === 'rtl') {
    return preview.scrollLeft < -1;
  }
  return (preview.scrollWidth - preview.clientWidth - preview.scrollLeft) > 1;
}
function createOverflowGuard(host) {
  const guard = document.createElement('span');
  guard.className = 'formula-preview-overflow-guard';
  guard.setAttribute('aria-hidden', 'true');
  host.appendChild(guard);
  return guard;
}
function visibleAction(host) {
  const action = host.querySelector(ACTION_SELECTOR);
  if (!action) return null;
  const style = getComputedStyle(action);
  if (style.display === 'none' || style.visibility === 'hidden') return null;
  return action;
}
function actionBelongsOnRight(host, preview, action, hostRect, actionRect) {
  if (!action) return false;
  if (host.classList.contains('hojreh-modal-formula-preview-wrapper')) {
    return preview.classList.contains('has-formula');
  }
  const hostMid = hostRect.left + hostRect.width / 2;
  return actionRect.left >= hostMid || actionRect.right > hostRect.right - 2;
}
function bindPreview(preview) {
  if (!preview || boundPreviews.has(preview)) return;
  boundPreviews.add(preview);
  const host = preview.parentElement;
  if (!host) return;
  host.classList.add('formula-preview-overflow-host');
  const guard = createOverflowGuard(host);
  let frame = 0;
  let resizeObserver = null;
  let observedAction = null;
  const observeAction = action => {
    if (!resizeObserver || action === observedAction) return;
    if (observedAction) resizeObserver.unobserve(observedAction);
    observedAction = action;
    if (observedAction) resizeObserver.observe(observedAction);
  };
  const sync = () => {
    frame = 0;
    if (!preview.isConnected || !host.isConnected || preview.clientWidth <= 0) {
      guard.classList.remove('is-visible', 'has-action-shield');
      preview.classList.remove('has-horizontal-overflow');
      host.classList.remove('has-horizontal-overflow');
      guard.style.width = '0px';
      return;
    }
    const overflowingX = hasHorizontalOverflow(preview);
    preview.classList.toggle('has-horizontal-overflow', overflowingX);
    host.classList.toggle('has-horizontal-overflow', overflowingX);
    const hostRect = host.getBoundingClientRect();
    const previewRect = preview.getBoundingClientRect();
    const action = visibleAction(host);
    const actionRect = action?.getBoundingClientRect();
    observeAction(action);
    if (action && actionRect && actionRect.width > 0) {
      host.style.setProperty('--formula-preview-action-width', `${actionRect.width}px`);
    } else {
      host.style.setProperty('--formula-preview-action-width', '0px');
    }
    let rightShieldWidth = 0;
    if (action && actionRect && actionBelongsOnRight(host, preview, action, hostRect, actionRect)) {
      if (host.classList.contains('hojreh-modal-formula-preview-wrapper')) {
        rightShieldWidth = actionRect.width + 12 + SAFE_GAP;
      } else {
        const safeEdge = actionRect.left - SAFE_GAP;
        rightShieldWidth = Math.max(0, hostRect.right - safeEdge);
      }
    } else {
      rightShieldWidth = Math.max(0, hostRect.right - previewRect.right);
    }
    const topInset = Math.max(0, previewRect.top - hostRect.top);
    guard.style.right = '0px';
    guard.style.top = `${topInset}px`;
    guard.style.height = `${preview.clientHeight}px`;
    guard.style.width = `${rightShieldWidth}px`;
    guard.classList.toggle('has-action-shield', rightShieldWidth > 0.5);
    guard.classList.toggle('is-visible', hiddenContentOnRight(preview));
  };
  const scheduleSync = () => {
    if (frame) cancelAnimationFrame(frame);
    frame = requestAnimationFrame(sync);
  };
  preview.addEventListener('scroll', scheduleSync, { passive: true });
  preview.addEventListener('input', scheduleSync);
  const action = host.querySelector(ACTION_SELECTOR);
  action?.addEventListener('transitionrun', scheduleSync);
  action?.addEventListener('transitionend', scheduleSync);
  const mutationObserver = new MutationObserver(scheduleSync);
  mutationObserver.observe(host, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class', 'contenteditable', 'dir', 'style']
  });
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(scheduleSync);
    resizeObserver.observe(preview);
    resizeObserver.observe(host);
    observeAction(action);
  } else {
    window.addEventListener('resize', scheduleSync, { passive: true });
  }
  scheduleSync();
}
function scan(root = document) {
  if (root.matches?.(PREVIEW_SELECTOR)) bindPreview(root);
  root.querySelectorAll?.(PREVIEW_SELECTOR).forEach(bindPreview);
}
scan(document);
const documentObserver = new MutationObserver(mutations => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) scan(node);
    }
  }
});
documentObserver.observe(document.body, { childList: true, subtree: true });
export { bindPreview };
