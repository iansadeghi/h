function createIndependentVarBodyHtml() {
  return `
    <div class="form-grid">
      <div class="form-group">
        <span class="form-label">نام متغیر</span>
        <input type="text" class="form-control var-name-input" value="متغیر جدید" />
      </div>
      <div class="form-group english-id-group">
        <span class="form-label">شناسه انگلیسی </span>
        <input type="text" class="form-control english-id-input" value="" placeholder="مثلاً var4" />
      </div>
      <div class="form-group quantity-symbol-group" style="display: none;">
        <span class="form-label">نشانه متغیر تعداد</span>
        <input type="text" class="form-control quantity-symbol-input" value="" placeholder="a" readonly />
      </div>
      <div class="form-group">
        <span class="form-label">حداقل قیمت ورودی (تومان)</span>
        <input type="text" class="form-control var-min-price" value="۰" />
      </div>
      <div class="form-group">
        <span class="form-label">واحد شمارش</span>
        <div class="select-wrap">
          <select class="form-control unit-select">
            <option value="عدد" selected>عدد</option>
            <option value="کیلوگرم">کیلوگرم</option>
            <option value="گرم">گرم</option>
            <option value="بسته">بسته</option>
            <option value="مثقال">مثقال</option>
          </select>
          <span class="select-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>
        </div>
      </div>
      <div class="form-group">
        <span class="form-label dynamic-wage-label">اجرت به ازای هر یک عدد</span>
        <input type="text" class="form-control ojrat-input" value="۰" />
      </div>
      <div class="form-group">
        <span class="form-label">مبلغ پیش‌فرض</span>
        <input type="text" class="form-control var-default-price" value="۰" />
      </div>
    </div>
  `;
}
function createConstantBodyHtml() {
  return `
    <div class="form-grid">
      <div class="form-group">
        <span class="form-label">نام ثابت</span>
        <input type="text" class="form-control var-name-input" value="ثابت درصدی جدید" />
      </div>
      <div class="form-group english-id-group">
        <span class="form-label">شناسه انگلیسی </span>
        <input type="text" class="form-control english-id-input" value="" placeholder="مثلاً const3" />
      </div>
      <div class="form-group">
        <span class="form-label">درصد (%)</span>
        <input type="number" class="form-control percent-input-field" value="0" min="0" max="100" step="0.1" />
      </div>
    </div>
  `;
}
function createRoundingBodyHtml() {
  return `
    <div class="form-grid">
      <div class="form-group">
        <span class="form-label">نام الگوریتم</span>
        <input type="text" class="form-control var-name-input" value="مکانیزم رُندسازی جدید" />
      </div>
      <div class="form-group english-id-group">
        <span class="form-label">شناسه انگلیسی </span>
        <input type="text" class="form-control english-id-input" value="" placeholder="مثلاً round2" />
      </div>
      <div class="form-group">
        <span class="form-label">تعداد ارقام تحت تاثیر</span>
        <div class="select-wrap">
          <select class="form-control rounding-max-select">
            <option value="3">سه رقم اول</option>
            <option value="4" selected>چهار رقم اول</option>
            <option value="5">پنج رقم اول</option>
            <option value="6">شش رقم اول</option>
            <option value="7">هفت رقم اول</option>
          </select>
          <span class="select-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>
        </div>
      </div>
      <div class="form-group">
        <span class="form-label">نوع رُندسازی</span>
        <div class="select-wrap">
          <select class="form-control rounding-type-select">
          </select>
          <span class="select-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg></span>
        </div>
      </div>
      <div class="form-group">
        <span class="form-label">تست محاسباتی رُندسازی</span>
        <input type="text" class="form-control rounding-test-input" placeholder="یک قیمت فرضی را وارد کنید..." value="1,234,567" />
      </div>
      <div class="form-group">
        <span class="form-label">خروجی الگوریتم</span>
        <input type="text" class="form-control rounding-output-val" readonly value="—" />
      </div>
      <div class="form-group rounding-guard-group">
        <span class="form-label"></span>
        <label class="rounding-guard-label">
          <input type="checkbox" class="rounding-guard-check rounding-prevent-zero hojreh-checkbox-input" />
          <span>اگر رُندسازی قیمت را صفر کند، قیمت اصلی برگردانده شود</span>
        </label>
      </div>
      <div class="form-group rounding-guard-group">
        <span class="form-label"></span>
        <label class="rounding-guard-label">
          <input type="checkbox" class="rounding-guard-check rounding-prevent-increase hojreh-checkbox-input" />
          <span>اگر رُندسازی قیمت را افزایش دهد، رُندسازی اعمال نشود</span>
        </label>
      </div>
    </div>
  `;
}
function createApprenticeBodyHtml(id) {
  return `
    <div class="form-grid apprentice-form-grid">
      <div class="form-group">
        <label class="form-label">نام کاربر</label>
        <input type="text" class="form-control apprentice-first-name-input" name="hojreh_apprentices[${id}][first_name]" value="" />
      </div>
      <div class="form-group">
        <label class="form-label">نام خانوادگی</label>
        <input type="text" class="form-control apprentice-last-name-input" name="hojreh_apprentices[${id}][last_name]" value="" />
      </div>
      <div class="form-group">
        <label class="form-label">ایمیل کاربر</label>
        <input type="email" class="form-control apprentice-email-input" name="hojreh_apprentices[${id}][email]" value="" />
      </div>
      <div class="form-group">
        <label class="form-label">رمز عبور کاربر</label>
        <div class="password-input-wrapper">
          <input type="password" class="form-control apprentice-password-input" name="hojreh_apprentices[${id}][password]" value="" autocomplete="new-password" />
          <button type="button" class="password-eye-btn" aria-label="نمایش/پنهان رمز عبور" title="نمایش/پنهان رمز عبور">
            <svg class="eye-open" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
            <svg class="eye-closed" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:none">
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
              <line x1="1" y1="1" x2="23" y2="23"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
    <div class="form-group apprentice-access-group"></div>
    <div class="form-group">
      <label class="form-label">کلید حجره</label>
      <input type="text" class="form-control" style="text-align: left;" value="site.com/hojreh-plugin" readonly />
    </div>
  `;
}
const STALE_LIFECYCLE_ATTRS = [
  'data-name-update-ready',
  'data-drag-ready',
  'data-switch-validation-ready',
  'data-rounding-ready',
  'data-unit-label-ready',
  'data-settings-price-ready',
  'data-apprentice-name-ready',
  'data-accordion-ready',
  'data-delete-ready',
  'data-delete-constant-ready',
  'data-manual-listener-attached',
  'data-manual-edited',
  'data-hojreh-manual-handler',
  'data-hojreh-original-value',
  'data-pricing-manual-ready',
  'data-formula-preview-ready',
  'data-formula-test-ready',
  'data-hojreh-dirty-ready',
  'data-eye-attached',
  'data-pattern-controls-ready'
];
function stripStaleLifecycleAttributes(root) {
  if (!root) return;
  const apply = el => STALE_LIFECYCLE_ATTRS.forEach(attr => el.removeAttribute(attr));
  apply(root);
  root.querySelectorAll('*').forEach(apply);
}
function createPatternBodyHtml(id, title) {
  const template = document.querySelector('#pricingPatternsList .accordion-item[data-type="pattern"] .accordion-body-inner');
  if (!template) return '';
  const clone = template.cloneNode(true);
  clone.querySelectorAll('[id]').forEach(el => {
    el.id = `${el.id}-${id}`;
  });
  clone.querySelectorAll('.formula-items-container').forEach(el => { el.innerHTML = ''; });
  clone.querySelectorAll('.formula-preview-large-box').forEach(el => {
    el.textContent = 'برای نمایش فرمول، آیتم‌ها را به باکس بالا اضافه کنید.';
    el.classList.remove('has-formula', 'formula-valid', 'formula-invalid', 'formula-warning');
    el.removeAttribute('contenteditable');
    el.style.borderColor = '';
  });
  clone.querySelectorAll('.btn-test-formula').forEach(el => {
    el.style.display = '';
  });
  clone.querySelectorAll('.formula-empty-state').forEach(el => { el.style.display = 'flex'; });
  clone.querySelectorAll('.formula-error-state').forEach(el => {
    el.classList.remove('active');
    el.style.display = '';
  });
  clone.querySelectorAll('.manual-formula-toggle').forEach(el => {
    el.checked = false;
    el.removeAttribute('checked');
  });
  clone.querySelectorAll('.test-inputs-grid').forEach(el => {
    el.innerHTML = '';
    el.setAttribute('aria-hidden', 'true');
  });
  clone.querySelectorAll('.final-calculation-summary').forEach(el => {
    el.classList.add('hidden');
    el.setAttribute('aria-hidden', 'true');
  });
  clone.querySelectorAll('.final-calculation-summary span[id], .final-calculation-summary [id]').forEach(el => {
    if (el.matches('#finalCalculationValue, [id^="finalCalculationValue"]')) el.textContent = '۰ تومان';
  });
  const nameInput = clone.querySelector('.pattern-name-input');
  if (nameInput) {
    nameInput.value = title;
    nameInput.setAttribute('value', title);
    nameInput.name = `hojreh_patterns[${id}][name]`;
    nameInput.setAttribute('name', `hojreh_patterns[${id}][name]`);
  }
  clone.querySelectorAll('.hojreh-formula-text-field, .hojreh-formula-display-field, .hojreh-formula-dependencies-field, .hojreh-formula-payload-field').forEach(el => el.remove());
  stripStaleLifecycleAttributes(clone);
  return clone.innerHTML;
}
export {
  createIndependentVarBodyHtml,
  createConstantBodyHtml,
  createRoundingBodyHtml,
  createApprenticeBodyHtml,
  createPatternBodyHtml,
  stripStaleLifecycleAttributes
};
