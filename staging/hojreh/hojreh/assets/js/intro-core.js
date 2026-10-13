/**
 * ═══════════════════════════════════════════════════════════════
 * Hojreh Intro Core — هستهٔ اینتروی صفحات (قابل استفادهٔ مجدد)
 *
 * فقط یک بار برای هر بازدیدکننده (localStorage) اجرا می‌شود:
 * صفحه با یک اورلی تیره می‌شود، فوکس روی عناصر مشخص‌شده حرکت می‌کند
 * و کنار هر کدام یک حباب توضیح نمایش داده می‌شود.
 *
 * استفاده در هر صفحه (فایل محتوای همان صفحه، بعد از این فایل لود شود):
 *
 *   HojrehIntro.start({
 *     id: 'access',                // کلید یکتا برای هر صفحه
 *     version: 1,                  // با افزایش آن، اینترو دوباره نمایش داده می‌شود
 *     steps: [
 *       { target: '#someSelector', text: 'متن توضیح' },
 *       ...
 *     ],
 *     labels: { next: 'بعدی', skip: 'بستن راهنما', done: 'متوجه شدم' }  // اختیاری
 *   });
 *
 * ابزارها:
 *   HojrehIntro.start({... , force: true})  // نمایش اجباری (بدون توجه به دفعهٔ قبل)
 *   HojrehIntro.reset('access')             // پاک‌کردن «دیده شده» (برای تست)
 *
 * - پس از پایان پری‌لودر (کلاس hojreh-preloading-done) شروع می‌شود.
 * - با تم روشن/تاریک (html[data-theme]) هماهنگ است.
 * - کیبورد: Enter / ← = بعدی ، Esc = بستن راهنما.
 * ═══════════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  var KEY_PREFIX = 'hojreh-intro:';
  var DONE_CLASS = 'hojreh-preloading-done';
  var DEFAULT_LABELS = { next: 'بعدی', skip: 'بستن راهنما', done: 'متوجه شدم' };

  var CSS = '' +
    '.hi-root{--hi-bg:#fff;--hi-fg:#111;--hi-muted:#666;--hi-accent:#00584D;--hi-accent-fg:#fff;' +
      'position:fixed;inset:0;z-index:1000001;direction:rtl;font-family:"YekanBakh",Tahoma,sans-serif;' +
      'opacity:0;transition:opacity .35s ease}' +
    '[data-theme="dark"] .hi-root{--hi-bg:#1e1e1e;--hi-fg:#eee;--hi-muted:#a8a8a8;--hi-accent:#06917D}' +
    '.hi-root.is-on{opacity:1}' +
    '.hi-block{position:absolute;inset:0}' +
    '.hi-spot{position:absolute;box-shadow:0 0 0 9999px rgba(0,0,0,.62);pointer-events:none;' +
      'transition:left .45s cubic-bezier(.4,0,.2,1),top .45s cubic-bezier(.4,0,.2,1),' +
      'width .45s cubic-bezier(.4,0,.2,1),height .45s cubic-bezier(.4,0,.2,1),border-radius .45s ease}' +
    '.hi-tip{position:absolute;box-sizing:border-box;background:var(--hi-bg);color:var(--hi-fg);' +
      'border-radius:35px;padding:16px 18px 14px;box-shadow:0 10px 30px rgba(0,0,0,.28);' +
      'transition:left .45s cubic-bezier(.4,0,.2,1),top .45s cubic-bezier(.4,0,.2,1)}' +
    '.hi-tip::before{content:"";position:absolute;left:var(--hi-arrow,50%);width:12px;height:12px;' +
      'margin-left:-6px;background:var(--hi-bg);transform:rotate(45deg);border-radius:2px}' +
    '.hi-tip.is-below::before{top:-5px}.hi-tip.is-above::before{bottom:-5px}' +
    '.hi-text{margin:0 0 14px;font-size:14.5px;line-height:1.9;font-weight:500}' +
    '.hi-foot{display:flex;align-items:center;justify-content:space-between;gap:10px; flex-direction: row-reverse}' +
    '.hi-count{font-size:15.5px;color:var(--hi-muted)}' +
    '.hi-actions{display:flex;align-items:center;gap:6px; flex-direction: row-reverse}' +
    '.hi-btn{font:inherit;font-size:13.5px;font-weight:600;border:0;cursor:pointer;border-radius:100px;padding:7px 16px}' +
    '.hi-skip{color:var(--hi-muted)}.hi-skip:hover{color:var(--hi-fg)}' +
    '.hi-next{background:var(--hi-accent);color:var(--hi-accent-fg)}.hi-next:hover{filter:brightness(1.12)}' +
    '.hi-btn:focus-visible{outline:none}' +
    '@media (prefers-reduced-motion:reduce){.hi-root,.hi-spot,.hi-tip{transition:none}}';

  function storageGet(key) {
    try { return localStorage.getItem(key); } catch (e) { return undefined; } // undefined = ذخیره‌سازی در دسترس نیست
  }
  function storageSet(key, val) {
    try { localStorage.setItem(key, val); } catch (e) { /* نادیده */ }
  }

  function injectCss() {
    if (document.getElementById('hojrehIntroCss')) return;
    var st = document.createElement('style');
    st.id = 'hojrehIntroCss';
    st.textContent = CSS;
    document.head.appendChild(st);
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function toFa(n) { try { return Number(n).toLocaleString('fa-IR'); } catch (e) { return String(n); } }

  /* اجرا بعد از پایان پری‌لودر (در صفحاتی که پری‌لودر ندارند: بلافاصله) */
  function whenReady(cb) {
    var root = document.documentElement;
    function go() { setTimeout(cb, 250); }
    if (!document.getElementById('hojrehPreloader') || root.classList.contains(DONE_CLASS)) return go();
    var mo = new MutationObserver(function () {
      if (root.classList.contains(DONE_CLASS)) { mo.disconnect(); go(); }
    });
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
  }

  function run(cfg) {
    var steps = (cfg.steps || []).filter(function (s) { return document.querySelector(s.target); });
    if (!steps.length) return;

    var labels = Object.assign({}, DEFAULT_LABELS, cfg.labels || {});
    var idx = 0;
    var prevOverflow = document.documentElement.style.overflow;

    injectCss();
    var root = el('div', 'hi-root');
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    var block = el('div', 'hi-block');
    var spot = el('div', 'hi-spot');
    var tip = el('div', 'hi-tip');
    var text = el('p', 'hi-text');
    text.setAttribute('aria-live', 'polite');
    var foot = el('div', 'hi-foot');
    var count = el('span', 'hi-count');
    var actions = el('div', 'hi-actions');
    var skipBtn = el('button', 'hi-btn hi-skip', labels.skip);
    var nextBtn = el('button', 'hi-btn hi-next');
    skipBtn.type = nextBtn.type = 'button';
    actions.append(skipBtn, nextBtn);
    foot.append(count, actions);
    tip.append(text, foot);
    root.append(block, spot, tip);
    document.body.appendChild(root);
    document.documentElement.style.overflow = 'hidden';

    var raf = 0;
    function place() {
      var step = steps[idx];
      var target = document.querySelector(step.target);
      if (!target) return;
      var r = target.getBoundingClientRect();
      var pad = 8;
      spot.style.left = (r.left - pad) + 'px';
      spot.style.top = (r.top - pad) + 'px';
      spot.style.width = (r.width + pad * 2) + 'px';
      spot.style.height = (r.height + pad * 2) + 'px';
      spot.style.borderRadius = getComputedStyle(target).borderRadius;

      var vw = window.innerWidth, vh = window.innerHeight, gap = 18;
      var w = Math.min(320, vw - 24);
      tip.style.width = w + 'px';
      var h = tip.offsetHeight;
      var below = r.bottom + pad + gap + h <= vh - 12;
      var top = below ? r.bottom + pad + gap : Math.max(12, r.top - pad - gap - h);
      var left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), vw - 12 - w);
      tip.style.top = top + 'px';
      tip.style.left = left + 'px';
      tip.classList.toggle('is-below', below);
      tip.classList.toggle('is-above', !below);
      var arrow = Math.min(Math.max(22, r.left + r.width / 2 - left), w - 22);
      tip.style.setProperty('--hi-arrow', arrow + 'px');
    }
    function schedulePlace() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(place);
    }

    function show(i) {
      idx = i;
      var step = steps[idx];
      var last = idx === steps.length - 1;
      text.textContent = step.text;
      count.textContent = toFa(idx + 1) + ' از ' + toFa(steps.length);
      nextBtn.textContent = last ? labels.done : labels.next;
      skipBtn.style.visibility = last ? 'hidden' : 'visible';
      var target = document.querySelector(step.target);
      if (target && target.scrollIntoView) target.scrollIntoView({ block: 'center', behavior: 'auto' });
      place();
      nextBtn.focus({ preventScroll: true });
    }

    function close() {
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', schedulePlace);
      window.removeEventListener('load', schedulePlace);
      cancelAnimationFrame(raf);
      document.documentElement.style.overflow = prevOverflow;
      root.classList.remove('is-on');
      setTimeout(function () { root.remove(); }, 380);
    }
    function next() { if (idx >= steps.length - 1) close(); else show(idx + 1); }

    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'ArrowLeft' || e.key === 'Enter') {
        if (e.key === 'Enter' && document.activeElement === skipBtn) return; // کلیک خود دکمه
        e.preventDefault(); next();
      }
      else if (e.key === 'ArrowRight' && idx > 0) { e.preventDefault(); show(idx - 1); }
      else if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === nextBtn ? skipBtn : nextBtn).focus(); }
    }

    nextBtn.addEventListener('click', next);
    skipBtn.addEventListener('click', close);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', schedulePlace);
    window.addEventListener('load', schedulePlace);

    show(0);
    requestAnimationFrame(function () { root.classList.add('is-on'); });
  }

  var HojrehIntro = {
    start: function (cfg) {
      if (!cfg || !cfg.id) return false;
      var key = KEY_PREFIX + cfg.id;
      var ver = String(cfg.version || 1);
      if (!cfg.force) {
        var seen = storageGet(key);
        if (seen === undefined || seen === ver) return false;
      }
      whenReady(function () {
        storageSet(key, ver); // با نمایش، «دیده شده» ثبت می‌شود تا رفرش وسط اینترو آن را تکرار نکند
        run(cfg);
      });
      return true;
    },
    reset: function (id) {
      try { localStorage.removeItem(KEY_PREFIX + id); } catch (e) { /* نادیده */ }
    }
  };

  window.HojrehIntro = HojrehIntro;
})();
