/**
 * sidebar-resizer.js — v3
 */
(function () {
  'use strict';

  const LS_KEY_WIDTH   = 'hojreh-sidebar-width';
  const LS_KEY_VISIBLE = 'hojreh-sidebar-visible';
  const DEFAULT_WIDTH  = 265;
  const MAX_EXTRA_PCT  = 10;
  // آستانه collapse: اگه عرض sidebar از اینقدر کمتر شد، مخفی بشه
  const COLLAPSE_THRESH = 243;

  const sidebar  = document.querySelector('.sidebar');
  const pageWrap = document.querySelector('.page-wrap');
  const resizer  = document.getElementById('colResizer');

  if (!sidebar || !pageWrap || !resizer) return;

  /* ── دکمه نمایش — چسبیده به سمت راست صفحه ── */
  const showBtn = document.createElement('button');
  showBtn.className = 'sidebar-show-btn';
  showBtn.title = 'نمایش فهرست تنظیمات';
  showBtn.innerHTML = `<svg viewBox="0 0 10 16" fill="none" stroke="currentColor"
    stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    xmlns="http://www.w3.org/2000/svg">
    <polyline points="7 2 2 8 7 14"/>
  </svg>`;
  document.body.appendChild(showBtn);

  /* ── state ── */
  let isVisible  = true;
  let savedW     = DEFAULT_WIDTH;
  let baseW      = DEFAULT_WIDTH;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartW = 0;

  /* ── محاسبه ارتفاع header برای تنظیم موقعیت handle ── */
  function getHeaderHeight() {
    const hdr = document.querySelector('header');
    return hdr ? hdr.getBoundingClientRect().height : 0;
  }

  function updateHandlePosition() {
    const handle = resizer.querySelector('.col-resizer-handle');
    if (!handle) return;
    const hdrH = getHeaderHeight();
    // فضای کار بدون هدر
    const workH = window.innerHeight - hdrH;
    // مرکز فضای کار نسبت به پنجره
    const centerY = hdrH + workH / 2;
    handle.style.top = centerY + 'px';
    handle.style.transform = 'translateY(-50%)';
  }

  /* ── localStorage ── */
  function safeStorageGet(key) {
    try { return window.localStorage?.getItem(key); } catch (e) { return null; }
  }

  function safeStorageSet(key, value) {
    try { window.localStorage?.setItem(key, value); } catch (e) { /* restricted storage; ignore */ }
  }

  function loadState() {
    const w = parseInt(safeStorageGet(LS_KEY_WIDTH), 10);
    if (!isNaN(w) && w >= 100) { savedW = w; baseW = w; }
    if (safeStorageGet(LS_KEY_VISIBLE) === 'false') isVisible = false;
  }

  function saveState() {
    safeStorageSet(LS_KEY_WIDTH, savedW);
    safeStorageSet(LS_KEY_VISIBLE, isVisible);
  }

  /* ── اعمال عرض ── */
  function isMobile() {
    return window.innerWidth <= 860;
  }

  function setWidth(w) {
    // در موبایل sidebar عرضش با CSS کنترل میشه، inline style نمیخواد
    if (isMobile()) return;
    sidebar.style.width = w + 'px';
  }

  /* ── Re-hydrate resizer: رویدادهای hover رو دوباره فعال کن ── */
  function rehydrateResizer() {
    // مطمئن بشیم display و opacity درست هستن
    resizer.style.display   = '';
    resizer.style.opacity   = '';
    resizer.style.pointerEvents = '';
    resizer.style.transition    = '';

    // یه reflow کوچیک برای بازنشانی حالت hover مرورگر
    void resizer.offsetWidth;

    // موقعیت handle رو آپدیت کن
    updateHandlePosition();
  }

  /* ── collapse: sidebar مخفی، دکمه ظاهر ── */
  function collapse() {
    if (!isVisible) return;
    isVisible = false;

    sidebar.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
    sidebar.style.opacity    = '0';
    sidebar.style.transform  = 'translateX(30px)';
    resizer.style.opacity    = '0';
    resizer.style.pointerEvents = 'none';

    setTimeout(() => {
      sidebar.style.display  = 'none';
      sidebar.style.opacity  = '';
      sidebar.style.transform  = '';
      sidebar.style.transition = '';
      resizer.style.display  = 'none';
      pageWrap.classList.add('sidebar-hidden');
      showBtn.classList.add('visible');
    }, 265);

    saveState();
  }

  /* ── show: sidebar با slide+fade برمیگرده ── */
  function show() {
    if (isVisible) return;
    isVisible = true;

    // همیشه با عرض پیشفرض 260 برگرده
    savedW = DEFAULT_WIDTH;

    resizer.style.display  = '';
    resizer.style.opacity  = '0';
    resizer.style.transition = 'opacity 0.25s ease';
    resizer.style.pointerEvents = '';

    sidebar.style.display  = '';
    sidebar.style.width    = DEFAULT_WIDTH + 'px';
    sidebar.style.opacity  = '0';
    sidebar.style.transform  = 'translateX(30px)';
    sidebar.style.transition = 'opacity 0.25s ease, transform 0.25s ease';

    pageWrap.classList.remove('sidebar-hidden');

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        sidebar.style.opacity   = '1';
        sidebar.style.transform = 'translateX(0)';
        resizer.style.opacity   = '1';

        setTimeout(() => {
          sidebar.style.transition = '';
          sidebar.style.opacity    = '';
          sidebar.style.transform  = '';
          resizer.style.transition = '';
          resizer.style.opacity    = '';

          // re-hydrate تا hover خط جداکننده دوباره کار کنه
          rehydrateResizer();
        }, 265);
      });
    });

    showBtn.classList.remove('visible');
    saveState();
  }

  /* ══ DRAG ══ */
  function onMove(clientX) {
    const dx   = clientX - dragStartX;
    const newW = dragStartW - dx;

    if (newW < COLLAPSE_THRESH) {
      endDrag();
      collapse();
      return;
    }

    const maxAllowed = Math.round(baseW * (1 + MAX_EXTRA_PCT / 100));
    const clamped    = Math.min(maxAllowed, Math.max(COLLAPSE_THRESH + 10, newW));
    setWidth(clamped);
  }

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    resizer.classList.remove('dragging');
    document.body.style.cursor     = '';
    document.body.style.userSelect = '';
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup',   onMouseUp);
    savedW = parseInt(sidebar.style.width || DEFAULT_WIDTH, 10);
    if (isNaN(savedW)) savedW = DEFAULT_WIDTH;
    saveState();
  }

  function onMouseMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    onMove(e.clientX);
  }

  function onMouseUp() { endDrag(); }

  resizer.addEventListener('mousedown', function (e) {
    if (!isVisible) return;
    e.preventDefault();
    isDragging   = true;
    dragStartX   = e.clientX;
    dragStartW   = sidebar.getBoundingClientRect().width;
    baseW        = Math.max(DEFAULT_WIDTH, dragStartW);
    resizer.classList.add('dragging');
    document.body.style.cursor     = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup',   onMouseUp);
  });

  /* touch */
  let touchStartX = 0, touchStartW = 0;
  resizer.addEventListener('touchstart', function (e) {
    if (!isVisible) return;
    touchStartX = e.touches[0].clientX;
    touchStartW = sidebar.getBoundingClientRect().width;
    baseW       = Math.max(DEFAULT_WIDTH, touchStartW);
    isDragging  = true;
    resizer.classList.add('dragging');
  }, { passive: true });

  document.addEventListener('touchmove', function (e) {
    if (!isDragging) return;
    const dx   = e.touches[0].clientX - touchStartX;
    const newW = touchStartW - dx;
    if (newW < COLLAPSE_THRESH) {
      isDragging = false;
      resizer.classList.remove('dragging');
      collapse();
      return;
    }
    const maxAllowed = Math.round(baseW * (1 + MAX_EXTRA_PCT / 100));
    setWidth(Math.min(maxAllowed, Math.max(COLLAPSE_THRESH + 10, newW)));
  }, { passive: true });

  document.addEventListener('touchend', function () {
    if (!isDragging) return;
    isDragging = false;
    resizer.classList.remove('dragging');
    savedW = parseInt(sidebar.style.width || DEFAULT_WIDTH, 10);
    if (isNaN(savedW)) savedW = DEFAULT_WIDTH;
    saveState();
  });

  showBtn.addEventListener('click', show);

  /* آپدیت موقعیت handle هنگام resize پنجره */
  window.addEventListener('resize', function() {
    updateHandlePosition();
    // اگه به موبایل رفتیم، inline width رو پاک کن تا CSS کنترل کنه
    if (isMobile()) {
      sidebar.style.width = '';
    }
  });

  /* ── INIT ── */
  loadState();
  setWidth(savedW);
  updateHandlePosition();

  if (!isVisible) {
    sidebar.style.display = 'none';
    resizer.style.display = 'none';
    pageWrap.classList.add('sidebar-hidden');
    showBtn.classList.add('visible');
  }

})();
