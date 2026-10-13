const CHECKBOX_SELECTOR = 'input[type="checkbox"].hojreh-checkbox-input';
const READY_ATTRIBUTE = 'data-hojreh-checkbox-ready';
function createVisual() {
  const visual = document.createElement('span');
  visual.className = 'hojreh-checkbox__visual';
  visual.setAttribute('aria-hidden', 'true');
  visual.innerHTML = `
    <svg class="hojreh-checkbox__tick" viewBox="0 0 20 20" focusable="false">
      <path class="hojreh-checkbox__tick-path" pathLength="16" d="M4.8 10.4 8.2 13.5 15.2 6.5" />
    </svg>
  `;
  return visual;
}
export function enhanceHojrehCheckbox(input) {
  if (!(input instanceof HTMLInputElement) || !input.matches(CHECKBOX_SELECTOR)) return null;
  if (input.hasAttribute(READY_ATTRIBUTE)) return input.closest('.hojreh-checkbox');
  const control = document.createElement('span');
  control.className = 'hojreh-checkbox';
  input.before(control);
  control.append(input, createVisual());
  input.classList.add('hojreh-checkbox__input');
  input.setAttribute(READY_ATTRIBUTE, 'true');
  return control;
}
function enhanceWithin(root) {
  if (root.nodeType !== Node.ELEMENT_NODE && root.nodeType !== Node.DOCUMENT_NODE) return;
  if (root.nodeType === Node.ELEMENT_NODE && root.matches(CHECKBOX_SELECTOR)) {
    enhanceHojrehCheckbox(root);
  }
  root.querySelectorAll?.(CHECKBOX_SELECTOR).forEach(enhanceHojrehCheckbox);
}
function playStateAnimation(input) {
  const control = input.closest('.hojreh-checkbox');
  if (!control) return;
  control.classList.remove('is-checking', 'is-unchecking');
  void control.offsetWidth;
  control.classList.add(input.checked ? 'is-checking' : 'is-unchecking');
}
export function initHojrehCheckboxes(root = document) {
  enhanceWithin(root);
  if (document.documentElement.dataset.hojrehCheckboxEvents !== 'true') {
    document.documentElement.dataset.hojrehCheckboxEvents = 'true';
    document.addEventListener('change', event => {
      if (event.target.matches?.(CHECKBOX_SELECTOR)) playStateAnimation(event.target);
    });
    document.addEventListener('animationend', event => {
      if (!event.target.classList?.contains('hojreh-checkbox__visual')) return;
      if (!['hojreh-checkbox-jelly-in', 'hojreh-checkbox-jelly-out'].includes(event.animationName)) return;
      event.target.closest('.hojreh-checkbox')?.classList.remove('is-checking', 'is-unchecking');
    });
  }
  if (document.body && document.documentElement.dataset.hojrehCheckboxObserver !== 'true') {
    document.documentElement.dataset.hojrehCheckboxObserver = 'true';
    new MutationObserver(mutations => {
      mutations.forEach(mutation => mutation.addedNodes.forEach(enhanceWithin));
    }).observe(document.body, { childList: true, subtree: true });
  }
}
function boot() {
  initHojrehCheckboxes();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}