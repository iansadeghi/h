const ACCESS_OPTIONS = [
  { key: 'edit_variable_prices', label: 'ویرایشگر قیمت متغیرها' },
  { key: 'edit_product_pricing_formula', label: 'ویرایش فرمول قیمت‌گذاری تک‌محصول' }
];
const MOTION = { duration: 360, easing: 'cubic-bezier(.22, 1, .36, 1)' };
function initApprenticeAccess(root = document) {
  root.querySelectorAll('.apprentice-access-group').forEach(group => {
    if (group.dataset.accessReady === 'true') return;
    group.dataset.accessReady = 'true';
    const itemId = group.closest('.accordion-item').dataset.id;
    group.innerHTML = `
      <span class="form-label">دسترسی کاربر</span>
      <div class="form-control apprentice-access-field" role="group" aria-label="دسترسی‌های کاربر"></div>
      <div class="apprentice-access-available" role="group" aria-label="دسترسی‌های قابل افزودن"></div>
      <span class="apprentice-access-status" role="status" aria-live="polite"></span>
    `;
    const field = group.querySelector('.apprentice-access-field');
    const available = group.querySelector('.apprentice-access-available');
    const status = group.querySelector('.apprentice-access-status');
    let moving = false;
    const entries = ACCESS_OPTIONS.map(option => {
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.hidden = true;
      input.checked = true;
      input.defaultChecked = true;
      input.value = '1';
      input.className = `apprentice-access-${option.key}`;
      input.name = `hojreh_apprentices[${itemId}][permissions][${option.key}]`;
      group.appendChild(input);
      const badge = document.createElement('button');
      badge.type = 'button';
      badge.className = 'apprentice-access-badge';
      badge.innerHTML = `
        <span class="apprentice-access-text">${option.label}</span>
        <span class="apprentice-access-close" aria-hidden="true">
          <svg viewBox="0 0 16 16" fill="currentColor" stroke="none">
            <path d="M4.64 3.36 8 6.72 11.36 3.36 12.64 4.64 9.28 8 12.64 11.36 11.36 12.64 8 9.28 4.64 12.64 3.36 11.36 6.72 8 3.36 4.64Z" />
          </svg>
        </span>
      `;
      badge.addEventListener('click', () => toggleAccess(input, badge, option.label));
      return { input, badge, label: option.label };
    });
    function syncBadges() {
      const count = entries.filter(entry => entry.input.checked).length;
      entries.forEach(({ input, badge, label }) => {
        const locked = input.checked && count === 1;
        badge.dataset.selected = String(input.checked);
        badge.setAttribute('aria-disabled', String(locked));
        badge.setAttribute('aria-label', locked
          ? `${label}؛ حداقل یک دسترسی باید باقی بماند`
          : `${input.checked ? 'حذف' : 'افزودن'} دسترسی ${label}`);
        badge.title = locked ? 'حداقل یک دسترسی باید باقی بماند' : `${input.checked ? 'حذف' : 'افزودن'} دسترسی`;
        (input.checked ? field : available).appendChild(badge);
      });
    }
    function toggleAccess(input, badge, label) {
      if (moving) return;
      if (input.checked && entries.filter(entry => entry.input.checked).length <= 1) return;
      const focused = document.activeElement === badge;
      const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const before = entries.map(entry => entry.badge.getBoundingClientRect());
      const groupHeight = group.getBoundingClientRect().height;
      input.checked = !input.checked;
      syncBadges();
      if (focused) badge.focus({ preventScroll: true });
      status.textContent = `دسترسی «${label}» ${input.checked ? 'اضافه' : 'حذف'} شد.`;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      if (reduceMotion || typeof badge.animate !== 'function') return;
      const after = entries.map(entry => entry.badge.getBoundingClientRect());
      const nextGroupHeight = group.getBoundingClientRect().height;
      moving = true;
      const animations = entries.map((entry, index) => entry.badge.animate([
        { transform: `translate(${before[index].left - after[index].left}px, ${before[index].top - after[index].top}px) scale(${before[index].width / after[index].width}, ${before[index].height / after[index].height})` },
        { transform: 'translate(0, 0) scale(1, 1)' }
      ], MOTION));
      if (groupHeight !== nextGroupHeight) {
        animations.push(group.animate([
          { height: `${groupHeight}px` }, { height: `${nextGroupHeight}px` }
        ], MOTION));
      }
      Promise.allSettled(animations.map(animation => animation.finished)).then(() => { moving = false; });
    }
    syncBadges();
  });
}
export { initApprenticeAccess };