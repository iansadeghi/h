import { HojrehFormulaEngine, HojrehPatternController } from './pricing-patterns.js';
import { attachNumericInput } from './general.js';

let formulaTestModal;

/* ═══════════════════════════════════════════════════════════════
   FORMULA TEST MODAL — مودال تست کردن فرمول قیمت‌گذاری (حجره)
   ─────────────────────────────────────────────────────────────
   • دکمه «تست کردن فرمول»: فقط وقتی .has-formula وجود دارد نمایش داده
     می‌شود و padding راست فیلد فقط در همان حالت اعمال می‌شود.
   • مودال 500px عرض، وسط‌چین، از پایین اسلاید می‌کند.
   • Drag handle: کشیدن به سمت پایین مودال را می‌بندد.
   ═══════════════════════════════════════════════════════════════ */

(function initFormulaTestModal() {
  'use strict';

  var modalOverlay        = document.getElementById('formulaTestModalOverlay');
  var modal               = document.getElementById('formulaTestModal');
  var dragHandle          = document.getElementById('ftmDragHandle');
  var ftmBody             = document.getElementById('ftmBody');
  var ftmSummaryValue     = document.getElementById('ftmSummaryValue');
  var activePattern       = null;
  var formulaPreviewLarge = null;
  var removeAboveFullscreenTimer = null;

  if (!modal || !modalOverlay || !ftmBody) return;

  /* ─── Number helpers ─── */
  function formatNum(num) {
    var safe = Number.isFinite(Number(num)) ? Math.round(Number(num)) : 0;
    return safe.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '،');
  }

  function parseNum(value) {
    var engine = HojrehFormulaEngine;
    if (engine && engine.parseNumberValue) return engine.parseNumberValue(value, 0);
    var cleaned = String(value || '')
      .replace(/[۰-۹]/g, function(d) { return '۰۱۲۳۴۵۶۷۸۹'.indexOf(d); })
      .replace(/[,،\s]/g, '')
      .replace(/[^0-9.\-]/g, '');
    var n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  /* ─── Button visibility (JS fallback — CSS :has() is primary) ─── */
  function getPatternFromElement(element) {
    return element && element.closest ? element.closest('.accordion-item[data-type="pattern"]') : null;
  }

  function getPatternPreview(pattern) {
    return pattern ? pattern.querySelector('.formula-preview-large-box') : null;
  }

  function syncButton(button) {
    var pattern = getPatternFromElement(button);
    var preview = getPatternPreview(pattern);
    button.classList.toggle('formula-test-visible', !!(preview && preview.classList.contains('has-formula')));
  }

  function bindTestButton(button) {
    if (!button || button.dataset.formulaTestReady === 'true') return;
    button.dataset.formulaTestReady = 'true';
    syncButton(button);
    var preview = getPatternPreview(getPatternFromElement(button));
    if (preview) {
      new MutationObserver(function() {
        syncButton(button);
        if (modal.classList.contains('open') && preview === formulaPreviewLarge) renderFields();
      }).observe(preview, {
        subtree: true, childList: true, characterData: true,
        attributes: true, attributeFilter: ['class']
      });
    }
    button.addEventListener('click', function() {
      openModal(getPatternFromElement(button));
    });
  }

  function bindAllTestButtons(root) {
    root = root || document;
    if (root.matches && (root.matches('.btn-test-formula') || root.matches('[id^="btnTestFormula"]'))) {
      bindTestButton(root);
    }
    root.querySelectorAll?.('.btn-test-formula, [id^="btnTestFormula"]').forEach(bindTestButton);
  }

  /* ─── Open / close ─── */
  function openModal(pattern) {
    activePattern = pattern || activePattern || document.querySelector('#pricingPatternsList .accordion-item[data-type="pattern"]');
    formulaPreviewLarge = getPatternPreview(activePattern);
    // NOTE: deliberately no activatePattern()/controller-binding call here.
    // This modal is a read-only view: it queries whatever controller
    // already exists (see getActiveController()) and falls back to the
    // pattern's last-synced static snapshot otherwise. It never creates
    // or registers a HojrehPatternController instance itself.
    renderFields();

    /* اگه دکمه‌ی «تست فرمول» از داخل یک آکاردئون پترنِ تمام‌صفحه کلیک شده
       باشه (z-index:1000، که عمداً کل صفحه از جمله هدر رو می‌پوشونه)،
       این مودال با z-index پیش‌فرضش (901) کاملاً زیرش دفن و نامرئی می‌شه.
       این کلاس، z-index مودال/overlay رو موقتاً بالاتر از آن می‌بره. */
    var aboveFullscreen = !!(activePattern && activePattern.classList.contains('pattern-fullscreen'));
    clearTimeout(removeAboveFullscreenTimer); // مبادا از یک closeModal قبلی هنوز در صف باشه و همین الان کلاس رو برداره
    modal.classList.toggle('above-pattern-fullscreen', aboveFullscreen);
    modalOverlay.classList.toggle('above-pattern-fullscreen', aboveFullscreen);

    modal.classList.add('open');
    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(animate) {
    if (animate === false) {
      /* instant — used at end of drag */
      modal.classList.add('dragging');
      modal.style.transform = 'translateX(-50%) translateY(100%)';
      /* re-enable transition after paint so next open animates correctly */
      requestAnimationFrame(function() {
        requestAnimationFrame(function() {
          modal.classList.remove('dragging');
          modal.classList.remove('open');
          modal.style.transform = '';
        });
      });
    } else {
      modal.classList.remove('open');
    }
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';

    /* نکته‌ی مهم: کلاس above-pattern-fullscreen (که z-index مودال را بالاتر
       از آکاردئون تمام‌صفحه می‌برد) نباید همین الان حذف شود — چون در همون
       لحظه z-index مودال به زیر لایه‌ی سفیدِ فول‌اسکرین می‌افتد و مودال،
       با این‌که هنوز در حال اسلاید به پایین است، پشت آن لایه ناپدید و
       انیمیشنش کاملاً نامرئی می‌شود (به نظر می‌رسد یهو پرید). به‌جایش صبر
       می‌کنیم انیمیشن (۰.۳۵ثانیه، مطابق ترنزیشن transform در CSS) واقعاً
       تمام شود، بعد این کلاس را برمی‌داریم. */
    clearTimeout(removeAboveFullscreenTimer);
    removeAboveFullscreenTimer = setTimeout(function() {
      modal.classList.remove('above-pattern-fullscreen');
      modalOverlay.classList.remove('above-pattern-fullscreen');
    }, 360);
  }

  bindAllTestButtons(document);
  new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      mutation.addedNodes.forEach(function(node) {
        if (node.nodeType !== 1) return;
        bindAllTestButtons(node);
      });
    });
  }).observe(document.body, { childList: true, subtree: true });

  modalOverlay.addEventListener('click', function() { closeModal(); });
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && modal.classList.contains('open')) closeModal();
  });

  /* ─── Drag-to-close on drag handle ─── */
  if (dragHandle) {
    var dragStartY   = 0;
    var dragCurrentY = 0;
    var isDragging   = false;
    /* Threshold: if dragged more than this fraction of modal height, close it */
    var CLOSE_THRESHOLD = 0.35;
    var VELOCITY_THRESHOLD = 0.5; /* px/ms — fast flick always closes */
    var dragStartTime = 0;

    function onDragStart(e) {
      if (!modal.classList.contains('open')) return;
      isDragging   = true;
      dragStartY   = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
      dragCurrentY = dragStartY;
      dragStartTime = Date.now();
      modal.classList.add('dragging');
      e.preventDefault();
    }

    function onDragMove(e) {
      if (!isDragging) return;
      dragCurrentY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
      var delta = Math.max(0, dragCurrentY - dragStartY); /* only downward */
      modal.style.transform = 'translateX(-50%) translateY(' + delta + 'px)';
      /* Fade overlay proportionally */
      var modalH = modal.offsetHeight || 400;
      var ratio  = Math.min(delta / modalH, 1);
      modalOverlay.style.opacity = (1 - ratio * 0.7).toString();
      e.preventDefault();
    }

    function onDragEnd(e) {
      if (!isDragging) return;
      isDragging = false;
      var delta    = Math.max(0, dragCurrentY - dragStartY);
      var elapsed  = Math.max(1, Date.now() - dragStartTime);
      var velocity = delta / elapsed; /* px/ms */
      var modalH   = modal.offsetHeight || 400;

      modal.classList.remove('dragging');
      modalOverlay.style.opacity = '';

      if (delta > modalH * CLOSE_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
        closeModal(false);
      } else {
        /* Snap back */
        modal.style.transform = '';
      }
    }

    dragHandle.addEventListener('mousedown',  onDragStart, { passive: false });
    dragHandle.addEventListener('touchstart', onDragStart, { passive: false });
    document.addEventListener('mousemove',  onDragMove, { passive: false });
    document.addEventListener('touchmove',  onDragMove, { passive: false });
    document.addEventListener('mouseup',    onDragEnd);
    document.addEventListener('touchend',   onDragEnd);
  }

  /* ─── Resolve the live controller for the active pattern (passive) ──
     Pure registry query — HojrehPatternController.get(id) — nothing
     more. No activatePattern() call, no controllerForAccordion, no
     binding, no registration. If a pattern was never touched by
     pricing-patterns.js's own bootstrap/MutationObserver (e.g. a
     simulated/headless snapshot with no live accordion), this simply
     returns null and callers fall back to getStaticSnapshot(). */
  function getActiveController() {
    var Controller = HojrehPatternController;
    var id = activePattern && activePattern.dataset ? activePattern.dataset.id : null;
    if (!Controller || !id) return null;
    return Controller.get(id) || null;
  }

  /* ─── Passive snapshot fallback ─────────────────────────────────
     When no live controller instance exists for the active pattern,
     read the last-synced backend payload straight off the DOM — the
     hidden `.hojreh-formula-payload-field` textarea that
     HojrehPatternController.syncBackendFields() already writes on
     every render. Its `ast` carries each element's own snapshotted
     selectedName/selectedUnit/selectedValue, which is exactly enough
     to drive the test form without ever resurrecting a controller.
     Fails soft (returns null) on missing/malformed data — never
     throws, so a headless/simulated pattern with no snapshot yet just
     renders the modal's empty state instead of erroring. */
  function getStaticSnapshot() {
    if (!activePattern || !activePattern.querySelector) return null;
    var payloadField = activePattern.querySelector('.hojreh-formula-payload-field');
    if (!payloadField || !payloadField.value) return null;
    try {
      var payload = JSON.parse(payloadField.value);
      return Array.isArray(payload.ast) ? payload.ast : null;
    } catch (e) {
      return null;
    }
  }

  /* ─── Collect variables from current formula ─── */
  function getVariables() {
    var engine = HojrehFormulaEngine;
    var Controller = HojrehPatternController;
    if (!engine) return [];

    var controller = getActiveController();
    var elements = controller
      ? Controller.cloneElements(controller.state.elements)
      : getStaticSnapshot();

    if (!elements || !elements.length) return [];

    // With a live controller: route through its own _registryOptions()
    // (DOM scrape or injected registryCatalog). Without one: rely purely
    // on each element's own snapshotted selectedName/selectedUnit/
    // selectedValue below — no registry lookup, no DOM scrape, nothing
    // constructive.
    var items = controller
      ? engine.getRegisteredItems(controller._registryOptions({ activeOnly: false }))
      : { variables: [], constants: [], roundings: [] };
    var seen   = [];
    var result = [];

    function walk(elems) {
      (elems || []).forEach(function(el) {
        if (el.isGroup || el.type === 'group') { walk(el.innerElements || []); return; }
        if (!el.selectedId || el.type !== 'variable') return;
        if (seen.indexOf(el.selectedId) !== -1) return;
        seen.push(el.selectedId);

        var varInfo     = items.variables.filter(function(v) { return v.id === el.selectedId; })[0] || {};
        var unitLabel   = varInfo.unit   || el.selectedUnit  || 'واحد';
        var displayName = varInfo.name   || el.selectedName  || 'بدون نام';
        var defPrice    = Number.isFinite(varInfo.price) ? varInfo.price : (el.selectedValue || 0);

        var priceLabel = engine.getPriceFieldLabel
          ? engine.getPriceFieldLabel(displayName, unitLabel)
          : ('قیمت هر ' + unitLabel + ' از ' + displayName);
        var qtyLabel = engine.getQuantityFieldLabel
          ? engine.getQuantityFieldLabel(displayName, unitLabel)
          : (unitLabel + ' ' + displayName);

        result.push({ id: el.selectedId, priceLabel: priceLabel, qtyLabel: qtyLabel, defPrice: defPrice });
      });
    }

    walk(elements);
    return result;
  }

  /* ─── Live calculation ─── */
  function recalc() {
    var engine = HojrehFormulaEngine;
    var Controller = HojrehPatternController;
    if (!engine || !ftmSummaryValue) return;

    var controller = getActiveController();
    var elements = controller
      ? Controller.cloneElements(controller.state.elements)
      : getStaticSnapshot();

    var values = {};
    ftmBody.querySelectorAll('input[data-id][data-ftype]').forEach(function(inp) {
      var id   = inp.dataset.id;
      var type = inp.dataset.ftype;
      values[id] = values[id] || {};
      if (type === 'price') values[id].price    = parseNum(inp.value);
      if (type === 'qty')   values[id].quantity = parseNum(inp.value);
    });

    // controller.evaluate() runs HojrehFormulaEngine.evaluateFormula with
    // this instance's _registryOptions() baked in (DOM scrape or injected
    // registryCatalog alike). Without a controller, evaluateFormula still
    // works directly off the static snapshot's elements — each variable's
    // price/quantity comes from the `values` override the test inputs
    // just supplied, so no registry lookup is even needed on this path.
    var total = controller
      ? controller.evaluate(values)
      : engine.evaluateFormula(elements || [], values, {});
    ftmSummaryValue.textContent = formatNum(total) + ' تومان';
  }

  /* ─── Render stacked form-group rows using existing classes ─── */
  function renderFields() {
    ftmBody.innerHTML = '';
    var variables = getVariables();

    if (!variables.length) {
      ftmBody.innerHTML = '<div style="padding:32px;text-align:center;font-weight:700;color:var(--gray-600);">فرمول فاقد متغیر قابل تست است.</div>';
      if (ftmSummaryValue) ftmSummaryValue.textContent = '— تومان';
      return;
    }

    variables.forEach(function(v) {
      /* Price field — wrapped with تومان suffix */
      var pg = document.createElement('div');
      pg.className = 'form-group';
      var priceInput = document.createElement('input');
      priceInput.type = 'text';
      priceInput.inputMode = 'numeric';
      priceInput.className = 'form-control';
      priceInput.dataset.id = v.id;
      priceInput.dataset.ftype = 'price';
      priceInput.value = formatNum(v.defPrice);
      priceInput.autocomplete = 'off';

      var priceWrapper = document.createElement('div');
      priceWrapper.className = 'settings-price-wrapper';
      priceWrapper.appendChild(priceInput);
      var priceUnit = document.createElement('span');
      priceUnit.className = 'settings-price-unit';
      priceUnit.textContent = 'تومان';
      priceWrapper.appendChild(priceUnit);

      pg.innerHTML = '<span class="form-label">' + v.priceLabel + '</span>';
      pg.appendChild(priceWrapper);
      ftmBody.appendChild(pg);

      // اعمال numeric-only از HojrehGeneral
      attachNumericInput(priceInput, true);

      /* Quantity field */
      var qg = document.createElement('div');
      qg.className = 'form-group';
      qg.innerHTML =
        '<span class="form-label">' + v.qtyLabel + '</span>' +
        '<input type="number" inputmode="decimal" class="form-control"' +
        ' data-id="' + v.id + '" data-ftype="qty"' +
        ' value="1" min="0" step="0.01" autocomplete="off" />';
      ftmBody.appendChild(qg);
    });

    ftmBody.querySelectorAll('input[data-ftype="price"]').forEach(function(inp) {
      inp.addEventListener('blur', function() {
        var n = parseNum(inp.value);
        if (Number.isFinite(n)) inp.value = formatNum(n);
      });
    });

    ftmBody.querySelectorAll('input[data-id]').forEach(function(inp) {
      inp.addEventListener('input', recalc);
    });

    recalc();
  }

  formulaTestModal = {
    open: openModal,
    close: function() { closeModal(); },
    bindAllTestButtons: bindAllTestButtons
  };
})();

export { formulaTestModal };
