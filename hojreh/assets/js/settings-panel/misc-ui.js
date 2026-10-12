import { initNumericInputs } from '../general.js';

/* ─── Task 4: افزودن پسوند تومان به ورودی‌های قیمت در settings-panel ─── */
function wrapPriceInputsWithToman(root) {
  root = root || document;
  const priceSelectors = '.ojrat-input, .var-min-price, .var-default-price';
  root.querySelectorAll(priceSelectors).forEach(input => {
    if (input.closest('.settings-price-wrapper')) return; // قبلاً wrap شده
    const wrapper = document.createElement('div');
    wrapper.className = 'settings-price-wrapper';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);
    const unit = document.createElement('span');
    unit.className = 'settings-price-unit';
    unit.textContent = 'تومان';
    wrapper.appendChild(unit);
  });
  // اعمال numeric formatting
  initNumericInputs(root);
}

/* ─── Task 5: toggle رمز عبور با آیکون چشم ─── */
function initPasswordToggle(root) {
  root = root || document;
  root.querySelectorAll('.password-eye-btn').forEach(btn => {
    if (btn.dataset.eyeAttached) return;
    btn.dataset.eyeAttached = 'true';
    const wrapper = btn.closest('.password-input-wrapper');
    if (!wrapper) return;
    const input = wrapper.querySelector('.apprentice-password-input');
    if (!input) return;

    btn.addEventListener('click', function() {
      const isPassword = input.type === 'password';
      // انیمیشن چشمک
      btn.classList.add('toggling');
      setTimeout(() => {
        input.type = isPassword ? 'text' : 'password';
        btn.querySelector('.eye-open').style.display = isPassword ? 'none' : '';
        btn.querySelector('.eye-closed').style.display = isPassword ? '' : 'none';
        btn.classList.remove('toggling');
      }, 130);
    });
  });
}

/* export wrap helper so api-modal and dynamic accordions can reuse it */
function initNewAccordionExtras(el) {
  wrapPriceInputsWithToman(el);
  initPasswordToggle(el);
}

export { wrapPriceInputsWithToman, initPasswordToggle, initNewAccordionExtras };
