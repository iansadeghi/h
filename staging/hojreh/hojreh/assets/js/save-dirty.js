  'use strict';
  function injectDot(buttonId) {
    var btn = document.getElementById(buttonId);
    if (!btn) return null;
    if (btn.querySelector('.save-dirty-dot')) return btn.querySelector('.save-dirty-dot');
    var dot = document.createElement('span');
    dot.className = 'save-dirty-dot';
    btn.insertBefore(dot, btn.firstChild);
    return dot;
  }
  function refreshDot(buttonId, hasDirty, stateRef) {
    var btn = document.getElementById(buttonId);
    if (!btn) return;
    if (hasDirty && !stateRef.value) {
      btn.classList.remove('has-unsaved-changes');
      void btn.offsetWidth;
    }
    btn.classList.toggle('has-unsaved-changes', hasDirty);
    stateRef.value = hasDirty;
  }
  const saveDirty = {
    injectDot:  injectDot,
    refreshDot: refreshDot
  };
export { saveDirty };