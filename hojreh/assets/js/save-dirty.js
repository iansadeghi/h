/**
 * ═══════════════════════════════════════════════════════════════
 * Hojreh Save-Dirty Helper
 * ابزار مشترک نشانگر تغییرات ذخیره‌نشده روی دکمه‌های ذخیره
 *
 * این فایل منطق مشترک تزریق نقطه و انیمیشن دکمه را کپسوله‌سازی
 * می‌کند تا price-editor.js و settings-panel.js از آن استفاده کنند.
 *
 * API عمومی (window.HojrehSaveDirty):
 *   injectDot(buttonId)       — یک بار فراخوانی شود؛ نقطه را در دکمه تزریق می‌کند
 *   refreshDot(buttonId, hasDirty, wasUnsavedRef)  — وضعیت دکمه را به‌روز می‌کند
 * ═══════════════════════════════════════════════════════════════
 */

/** ابزار نشانگر تغییرات ذخیره‌نشده. */
  'use strict';

  /**
   * نقطه‌ی ذخیره را داخل دکمه تزریق می‌کند (اگر قبلاً وجود نداشته باشد).
   * @param {string} buttonId  — id دکمه‌ی ذخیره
   * @returns {HTMLElement|null}  عنصر نقطه، یا null اگر دکمه پیدا نشد
   */
  function injectDot(buttonId) {
    var btn = document.getElementById(buttonId);
    if (!btn) return null;
    if (btn.querySelector('.save-dirty-dot')) return btn.querySelector('.save-dirty-dot');
    var dot = document.createElement('span');
    dot.className = 'save-dirty-dot';
    btn.insertBefore(dot, btn.firstChild);
    return dot;
  }

  /**
   * وضعیت نقطه و انیمیشن دکمه را بر اساس وجود تغییرات ذخیره‌نشده به‌روز می‌کند.
   *
   * @param {string}  buttonId       — id دکمه‌ی ذخیره
   * @param {boolean} hasDirty       — آیا تغییرات ذخیره‌نشده وجود دارند؟
   * @param {{ value: boolean }} stateRef  — شیء { value } برای نگه‌داشتن وضعیت قبلی
   *                                         (توسط caller ایجاد و نگه‌داری می‌شود)
   */
  function refreshDot(buttonId, hasDirty, stateRef) {
    var btn = document.getElementById(buttonId);
    if (!btn) return;

    // Only restart the pop animation when transitioning from clean → dirty
    if (hasDirty && !stateRef.value) {
      btn.classList.remove('has-unsaved-changes');
      void btn.offsetWidth; // force reflow so animation replays
    }
    btn.classList.toggle('has-unsaved-changes', hasDirty);
    stateRef.value = hasDirty;
  }

  /* ─── Public API ─── */
  const saveDirty = {
    injectDot:  injectDot,
    refreshDot: refreshDot
  };

export { saveDirty };
