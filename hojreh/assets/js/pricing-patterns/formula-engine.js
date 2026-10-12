/* ═══════════════════════════════════════════════════════════════
   HojrehFormulaEngine — پارسر/AST/موتور ارزیابیِ خالصِ فرمول
   ───────────────────────────────────────────────────────────────
   Extracted from the former monolithic pricing-patterns.js as part
   of its modularization (see ../pricing-patterns.js for the full
   module map). Zero DOM dependency and zero dependency on
   HojrehPatternController — a single source of truth shared by the
   editor UI, the simulator, and (structurally) the backend compiler.
   ═══════════════════════════════════════════════════════════════ */

import {
  unitCatalog as sharedUnitCatalog, getUnitMeta as getSharedUnitMeta
} from '../general.js';

const HojrehFormulaEngine = (function () {
  'use strict';

  const ID_PATTERN = /^[a-z][a-z0-9_]*$/;
  const LETTERS = 'abcdefghijklmnopqrstuvwxyz';

  const fallbackUnitCatalog = {
    'کیلوگرم': { category: 'weight', quantityLabel: 'وزن' },
    'گرم': { category: 'weight', quantityLabel: 'وزن' },
    'میلی‌گرم': { category: 'weight', quantityLabel: 'وزن' },
    'مثقال': { category: 'weight', quantityLabel: 'وزن' },
    'تن': { category: 'weight', quantityLabel: 'وزن' },
    'عدد': { category: 'count', quantityLabel: 'تعداد' },
    'بسته': { category: 'count', quantityLabel: 'تعداد' },
    'کارتن': { category: 'count', quantityLabel: 'تعداد' },
    'جعبه': { category: 'count', quantityLabel: 'تعداد' },
    'شاخه': { category: 'count', quantityLabel: 'تعداد' },
    'دستگاه': { category: 'count', quantityLabel: 'تعداد' },
    'متر': { category: 'length', quantityLabel: 'طول' },
    'سانتی‌متر': { category: 'length', quantityLabel: 'طول' },
    'میلی‌متر': { category: 'length', quantityLabel: 'طول' },
    'متر مربع': { category: 'area', quantityLabel: 'مساحت' },
    'سانتی‌متر مربع': { category: 'area', quantityLabel: 'مساحت' },
    'لیتر': { category: 'volume', quantityLabel: 'حجم' },
    'میلی‌لیتر': { category: 'volume', quantityLabel: 'حجم' },
    'متر مکعب': { category: 'volume', quantityLabel: 'حجم' }
  };

  const unitCatalog = sharedUnitCatalog || fallbackUnitCatalog;

  function getUnitMeta(unit) {
    const cleanUnit = String(unit || '').trim();
    if (getSharedUnitMeta) {
      const meta = getSharedUnitMeta(cleanUnit);
      return {
        category: meta.kind || meta.category || 'custom',
        quantityLabel: meta.quantityLabel || 'مقدار'
      };
    }
    if (Array.isArray(unitCatalog)) {
      const meta = unitCatalog.find(u => u.value === cleanUnit);
      return meta ? { category: meta.kind || meta.category || 'custom', quantityLabel: meta.quantityLabel || 'مقدار' }
        : { category: 'custom', quantityLabel: 'مقدار' };
    }
    return unitCatalog[cleanUnit] || { category: 'custom', quantityLabel: 'مقدار' };
  }

  function getQuantityFieldLabel(name, unit) {
    const cleanName = String(name || 'بدون نام').trim();
    const cleanUnit = String(unit || 'واحد').trim();
    return `${getUnitMeta(cleanUnit).quantityLabel} ${cleanName} (${cleanUnit})`;
  }

  function getPriceFieldLabel(name, unit) {
    const cleanName = String(name || 'بدون نام').trim();
    const cleanUnit = String(unit || 'واحد').trim();
    return `قیمت هر ${cleanUnit} از ${cleanName}`;
  }

  function getUnitOptions() {
    if (Array.isArray(unitCatalog)) {
      return unitCatalog.map(unit => ({
        value: unit.value,
        label: unit.label || unit.value,
        category: unit.kind || unit.category || 'custom',
        quantityLabel: unit.quantityLabel || 'مقدار'
      }));
    }
    return Object.keys(unitCatalog).map(value => ({
      value,
      label: value,
      category: unitCatalog[value].category || 'custom',
      quantityLabel: unitCatalog[value].quantityLabel || 'مقدار'
    }));
  }

  // تولید نشانه‌های مقدار طبق الگوی خواسته‌شده: a..z, ab, ac, ..., az, ba, bc, ...
  // تکرار پشت سر هم مثل aa / bb تولید نمی‌شود تا خوانایی فرمول‌ها حفظ شود.
  function generateQuantitySymbol(index) {
    let n = Math.max(0, Number(index) || 0);
    if (n < 26) return LETTERS[n];
    n -= 26;

    for (let length = 2; length < 8; length++) {
      const blockSize = 26 * Math.pow(25, length - 1);
      if (n < blockSize) {
        let result = '';
        let previous = '';
        for (let pos = 0; pos < length; pos++) {
          const choices = pos === 0 ? LETTERS.split('') : LETTERS.split('').filter(ch => ch !== previous);
          const divisor = Math.pow(25, length - pos - 1);
          const choiceIndex = Math.floor(n / divisor);
          const ch = choices[choiceIndex];
          result += ch;
          previous = ch;
          n = n % divisor;
        }
        return result;
      }
      n -= blockSize;
    }

    return `q${index}`;
  }

  function normalizeNumberString(value) {
    return String(value ?? '')
      .replace(/[۰-۹]/g, d => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
      .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
      .replace(/[,،\s]/g, '')
      .replace(/[^0-9.\-]/g, '');
  }

  function parseNumberValue(value, fallback = 0) {
    const normalized = normalizeNumberString(value);
    if (!normalized || normalized === '-' || normalized === '.') return fallback;
    const num = parseFloat(normalized);
    return Number.isFinite(num) ? num : fallback;
  }

  function normalizeIdentifier(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  }

  function normalizeQuantitySymbol(value) {
    return String(value || '').trim().toLowerCase().replace(/[^a-z]/g, '');
  }

  function readVariablePrice(item) {
    const defaultPriceInput = item.querySelector('.var-default-price');
    if (defaultPriceInput) return parseNumberValue(defaultPriceInput.value, 0);

    const lastPriceButton = item.querySelector('.last-price');
    if (lastPriceButton) return parseNumberValue(lastPriceButton.textContent, 0);

    const minPriceInput = item.querySelector('.var-min-price');
    if (minPriceInput) return parseNumberValue(minPriceInput.value, 0);

    return 0;
  }

  function getVariableAccordionItems() {
    return [
      ...Array.from(document.querySelectorAll('#apiVariablesList .accordion-item[data-type="api-variable"]')).map(item => ({ item, source: 'api' })),
      ...Array.from(document.querySelectorAll('#independentList .accordion-item[data-type="variable"]')).map(item => ({ item, source: 'independent' }))
    ];
  }

  function isAccordionItemActive(item) {
    return !!item.querySelector('.acc-switch input[type="checkbox"]')?.checked;
  }

  function nextAvailableQuantitySymbol(usedSymbols) {
    let index = 0;
    let candidate = generateQuantitySymbol(index);
    while (usedSymbols.has(candidate)) {
      index += 1;
      candidate = generateQuantitySymbol(index);
    }
    return candidate;
  }

  // نشانه مقدار فقط برای متغیرهای فعال در فرمول رزرو می‌شود؛
  // مقدارهای قدیمی آیتم‌های غیرفعال پاک نمی‌شوند تا شناسه‌ها بی‌دلیل نپرند.
  // دو مرحله‌ای است تا یک آیتم فعالِ جدید، نشانه پایدار آیتم فعال قبلی را ندزدد.
  function syncVariableQuantitySymbols() {
    const used = new Set();
    const needsGeneration = [];
    const entries = getVariableAccordionItems();

    entries.forEach(({ item }) => {
      const input = item.querySelector('.quantity-symbol-input');
      if (!input) return;

      const current = normalizeQuantitySymbol(input.value);

      if (!isAccordionItemActive(item)) {
        input.value = current;
        return;
      }

      if (current && !used.has(current)) {
        input.value = current;
        used.add(current);
      } else {
        needsGeneration.push(input);
      }
    });

    needsGeneration.forEach(input => {
      const generated = nextAvailableQuantitySymbol(used);
      input.value = generated;
      used.add(generated);
    });
  }

  function collectVariableItem(item, index, source) {
    const nameInput = item.querySelector('.var-name-input');
    const idInput = item.querySelector('.english-id-input');
    const quantityInput = item.querySelector('.quantity-symbol-input');
    const unitSelect = item.querySelector('.unit-select');
    const ojratInput = item.querySelector('.ojrat-input');

    if (!nameInput || !idInput) return null;

    const active = isAccordionItemActive(item);
    const id = normalizeIdentifier(idInput.value);
    if (idInput.value && idInput.value !== id) idInput.value = id;

    const normalizedQuantitySymbol = normalizeQuantitySymbol(quantityInput?.value);
    const quantitySymbol = active ? (normalizedQuantitySymbol || generateQuantitySymbol(index)) : normalizedQuantitySymbol;
    if (active && quantityInput && quantityInput.value !== quantitySymbol) quantityInput.value = quantitySymbol;

    const unit = unitSelect?.value || item.dataset.unit || 'عدد';

    // read ojrat — strip Persian digits and commas, default to 0
    let ojrat = 0;
    if (ojratInput) {
      let rawOjrat = ojratInput.value.replace(/،/g, '').replace(/,/g, '');
      rawOjrat = rawOjrat.replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
      ojrat = parseFloat(rawOjrat) || 0;
    }

    return {
      id,
      name: nameInput.value.trim() || 'بدون نام',
      quantitySymbol,
      unit,
      unitMeta: getUnitMeta(unit),
      price: readVariablePrice(item),
      ojrat,
      active,
      source,
      apiSymbol: source === 'api' ? String(item.dataset.apiSymbol || '').trim().toUpperCase() : null,
      subType: source === 'api' ? 'api-variable' : 'independent-variable',
      element: item
    };
  }

  function readRoundingConfig(item) {
    const digits = parseInt(item.querySelector('.rounding-max-select')?.value || '3', 10);
    const mode = item.querySelector('.rounding-type-select')?.value || 'zero';
    const preventZero     = !!(item.querySelector('.rounding-prevent-zero')?.checked);
    const preventIncrease = !!(item.querySelector('.rounding-prevent-increase')?.checked);
    return {
      digits: Number.isFinite(digits) ? digits : 3,
      mode,
      preventZero,
      preventIncrease
    };
  }
  /* ── Hybrid registry injection ────────────────────────────────
     When a controller is constructed with { registryCatalog }, the
     engine never touches document.querySelectorAll for that lookup —
     it normalizes the supplied catalog into the exact same
     { variables, constants, roundings } shape the DOM-scrape path
     produces, so every downstream consumer (buildFormulaString,
     evaluateFormula, compileToProgram, parseFormulaString, …) is
     completely agnostic to where the data came from. This is what
     lets HojrehPatternController run fully headlessly — bulk
     WooCommerce sync jobs, background price-recalculation queues,
     offline/unit-test contexts — with zero DOM present. */
  function normalizeCatalogEntry(entry, type) {
    if (!entry || typeof entry !== 'object') return null;
    const id = normalizeIdentifier(entry.id ?? entry.selectedId ?? '');
    if (!id) return null;
    const base = {
      id,
      name: String(entry.name ?? entry.selectedName ?? 'بدون نام').trim() || 'بدون نام',
      active: entry.active !== false
    };

    if (type === 'variable') {
      const unit = entry.unit || entry.selectedUnit || 'عدد';
      return {
        ...base,
        quantitySymbol: normalizeQuantitySymbol(entry.quantitySymbol ?? ''),
        unit,
        unitMeta: getUnitMeta(unit),
        price: parseNumberValue(entry.price ?? entry.selectedValue, 0),
        ojrat: parseNumberValue(entry.ojrat, 0),
        source: entry.source === 'api' ? 'api' : 'independent',
        apiSymbol: entry.source === 'api' ? String(entry.apiSymbol ?? entry.api_symbol ?? '').trim().toUpperCase() : null,
        subType: entry.subType || (entry.source === 'api' ? 'api-variable' : 'independent-variable')
      };
    }
    if (type === 'constant') {
      return { ...base, percent: parseNumberValue(entry.percent ?? entry.selectedValue, 0) };
    }
    if (type === 'rounding') {
      return {
        ...base,
        config: {
          digits: Number.isFinite(Number(entry.config?.digits)) ? Number(entry.config.digits) : 3,
          mode: entry.config?.mode || 'zero',
          preventZero: !!entry.config?.preventZero,
          preventIncrease: !!entry.config?.preventIncrease
        }
      };
    }
    return base;
  }

  function buildRegistryFromCatalog(catalog) {
    const items = { variables: [], constants: [], roundings: [] };

    // Accepts either a flat array of { type, ...fields } entries, or an
    // already-bucketed { variables, constants, roundings } object — both
    // are documented shapes a headless caller might reasonably hand in.
    if (Array.isArray(catalog)) {
      catalog.forEach(entry => {
        const type = entry?.type;
        const normalized = normalizeCatalogEntry(entry, type);
        if (!normalized) return;
        if (type === 'variable') items.variables.push(normalized);
        else if (type === 'constant') items.constants.push(normalized);
        else if (type === 'rounding') items.roundings.push(normalized);
      });
    } else if (catalog && typeof catalog === 'object') {
      (catalog.variables || []).forEach(entry => {
        const normalized = normalizeCatalogEntry(entry, 'variable');
        if (normalized) items.variables.push(normalized);
      });
      (catalog.constants || []).forEach(entry => {
        const normalized = normalizeCatalogEntry(entry, 'constant');
        if (normalized) items.constants.push(normalized);
      });
      (catalog.roundings || []).forEach(entry => {
        const normalized = normalizeCatalogEntry(entry, 'rounding');
        if (normalized) items.roundings.push(normalized);
      });
    }

    return items;
  }

  function filterRegistryByActive(items, activeOnly) {
    if (!activeOnly) return items;
    return {
      variables: items.variables.filter(v => v.active),
      constants: items.constants.filter(c => c.active),
      roundings: items.roundings.filter(r => r.active)
    };
  }

  function getRegisteredItems(options = {}) {
    const activeOnly = !!options.activeOnly;

    // Headless mode: an injected catalog completely bypasses DOM
    // scraping. No document.querySelectorAll call happens on this path,
    // so this is safe to call with no DOM present at all.
    if (options.registryCatalog) {
      return filterRegistryByActive(buildRegistryFromCatalog(options.registryCatalog), activeOnly);
    }

    const items = { variables: [], constants: [], roundings: [] };

    syncVariableQuantitySymbols();

    getVariableAccordionItems().forEach(({ item, source }, index) => {
      const variable = collectVariableItem(item, index, source);
      if (!variable) return;
      if (activeOnly && !variable.active) return;
      items.variables.push(variable);
    });

    document.querySelectorAll('#constantsList .accordion-item[data-type="constant"]').forEach(item => {
      const nameInput = item.querySelector('.var-name-input');
      const idInput = item.querySelector('.english-id-input');
      const percentInput = item.querySelector('.percent-input-field');
      if (!nameInput || !idInput) return;
      const active = isAccordionItemActive(item);
      if (activeOnly && !active) return;
      const id = normalizeIdentifier(idInput.value);
      if (idInput.value && idInput.value !== id) idInput.value = id;
      items.constants.push({
        id,
        name: nameInput.value.trim() || 'بدون نام',
        percent: parseNumberValue(percentInput?.value, 0),
        active,
        element: item
      });
    });

    document.querySelectorAll('#roundingList .accordion-item[data-type="algorithm"]').forEach(item => {
      const nameInput = item.querySelector('.var-name-input');
      const idInput = item.querySelector('.english-id-input');
      if (!nameInput || !idInput) return;
      const active = isAccordionItemActive(item);
      if (activeOnly && !active) return;
      const id = normalizeIdentifier(idInput.value);
      if (idInput.value && idInput.value !== id) idInput.value = id;
      items.roundings.push({
        id,
        name: nameInput.value.trim() || 'بدون نام',
        active,
        config: readRoundingConfig(item),
        element: item
      });
    });

    return items;
  }

  function findInCollection(id, collection) {
    const clean = normalizeIdentifier(id);
    for (const v of collection.variables) if (v.id === clean) return { ...v, type: 'variable' };
    for (const c of collection.constants) if (c.id === clean) return { ...c, type: 'constant' };
    for (const r of collection.roundings) if (r.id === clean) return { ...r, type: 'rounding' };
    return null;
  }

  function findItemById(itemId, options = {}) {
    return findInCollection(itemId, getRegisteredItems(options));
  }

  function cloneElementForBackend(el) {
    return {
      type: el.type,
      subType: el.subType || el.type,
      operator: el.operator === '*' ? '*' : '+',
      selectedId: el.selectedId || '',
      selectedName: el.selectedName || '',
      selectedUnit: el.selectedUnit || '',
      selectedValue: Number(el.selectedValue || 0),
      quantitySymbol: el.quantitySymbol || '',
      isGroup: !!(el.isGroup || el.type === 'group'),
      innerElements: (el.innerElements || []).map(cloneElementForBackend)
    };
  }

  function normalizeElementOperators(elements) {
    (elements || []).forEach((el, index) => {
      el.operator = index === 0 ? '+' : (el.operator === '*' ? '*' : '+');
      if (el.type === 'group' || el.isGroup) normalizeElementOperators(el.innerElements || []);
    });
    return elements || [];
  }

  /** Structural order check only: no normalization, registry lookup or
   *  selection validation, so unfinished editor items remain editable.
   *  Each group starts its own running total. Empty groups are allowed
   *  as placeholders, but cannot supply a base for percent/rounding. */
  function hasValidElementOrder(elements) {
    function inspect(elems) {
      let hasBase = false;
      for (const el of elems || []) {
        if (el.type === 'group' || el.isGroup) {
          const inner = inspect(el.innerElements);
          if (!inner.valid) return inner;
          hasBase = hasBase || inner.hasBase;
        } else if (el.type === 'constant' || el.type === 'rounding') {
          if (!hasBase) return { valid: false, hasBase: false };
        } else if (el.type === 'variable') {
          hasBase = true;
        }
      }
      return { valid: true, hasBase };
    }
    return inspect(elements).valid;
  }

  function getElementRegistryItem(el, options = {}) {
    if (!el?.selectedId) return null;
    return findItemById(el.selectedId, { activeOnly: false, ...options });
  }

  /* Unicode directional-isolate marks (RLI ... PDI). Wrapping each Persian
     label in these turns it into an opaque, atomic bidi run: its RTL
     characters can no longer merge with a neighboring RTL run across the
     neutral characters (operators, spaces, digits) that sit between them.
     Without this, concatenating several strong-RTL terms with weak/neutral
     joiners lets the browser's bidi algorithm regroup and reorder the terms
     as a block — visually flipping term order even though the underlying
     string (and this.state.elements) is built in perfectly correct
     chronological order. Only ever applied to the verbal/display strings;
     English-id (canonical) formulas are pure ASCII and never need it. */
  const RLI = '\u2067';
  const PDI = '\u2069';
  function isolateRtlLabel(text) {
    return text ? `${RLI}${text}${PDI}` : text;
  }

  function buildFormulaString(elements, useEnglishIds = false, options = {}) {
    const safeElements = normalizeElementOperators(elements || []);
    if (!safeElements.length) return '';

    function appendTerm(expr, operator, term) {
      if (!term) return expr;
      if (!expr) return term;
      return `${expr} ${operator === '*' ? '*' : '+'} ${term}`;
    }

    function labelFor(el, fallback) {
      const item = getElementRegistryItem(el, options);
      if (useEnglishIds) return item?.id || el.selectedId || fallback || '';
      return isolateRtlLabel(item?.name || el.selectedName || fallback || '');
    }

    function processElements(elems) {
      let expr = '';

      elems.forEach(el => {
        if (el.type === 'group' || el.isGroup) {
          const inner = processElements(el.innerElements || []);
          if (inner) expr = appendTerm(expr, el.operator, `(${inner})`);
          return;
        }

        if (el.type === 'variable') {
          const item = getElementRegistryItem(el, options);
          const rawDisplayId = useEnglishIds ? (item?.id || el.selectedId) : (item?.name || el.selectedName || 'بدون نام');
          const displayId = useEnglishIds ? rawDisplayId : isolateRtlLabel(rawDisplayId);
          const qSym = item?.quantitySymbol || el.quantitySymbol || '';
          if (displayId && qSym) {
            const varTerm = `${displayId}*${qSym}`;
            // append ojrat term only when ojrat > 0
            const ojrat = item?.ojrat || 0;
            if (ojrat > 0) {
              // useEnglishIds: use id_ojrat*qSym; display mode: use "اجرت" as readable label
              const ojratTerm = useEnglishIds
                ? `${item?.id || el.selectedId}_ojrat*${qSym}`
                : isolateRtlLabel('اجرت');
              expr = appendTerm(expr, el.operator, `${varTerm} + ${ojratTerm}`);
            } else {
              expr = appendTerm(expr, el.operator, varTerm);
            }
          }
          return;
        }

        if (el.type === 'constant') {
          if (!expr) return;
          const displayId = labelFor(el, '');
          if (displayId) expr = `[${expr}]${el.operator === '*' ? '*' : '+'}${displayId}`;
          return;
        }

        if (el.type === 'rounding') {
          if (!expr) return;
          const displayId = labelFor(el, '');
          if (displayId) expr = `[${displayId}[${expr}]]`;
        }
      });

      return expr;
    }

    return processElements(safeElements);
  }

  function normalizeFormulaForCompare(formulaText) {
    return String(formulaText || '')
      .replace(/×/g, '*')
      .replace(/\s+/g, '')
      .toLowerCase();
  }

  function validateFormula(formulaText) {
    const text = String(formulaText || '').trim();
    if (!text) return { valid: false, error: 'فرمول خالی است' };

    const allowedPattern = /^[a-z0-9_\s+*×()\[\]]+$/;
    if (!allowedPattern.test(text)) {
      const badChars = [...new Set(text.split('').filter(c => !/[a-z0-9_\s+*×()\[\]]/.test(c)))];
      return { valid: false, error: `کاراکتر(های) غیرمجاز در فرمول: ${badChars.join(' ')}` };
    }

    if (/[A-Z]/.test(text)) return { valid: false, error: 'فرمول باید فقط شامل حروف کوچک انگلیسی باشد' };

    const stack = [];
    const pairs = { ')': '(', ']': '[' };
    for (const ch of text) {
      if (ch === '(' || ch === '[') stack.push(ch);
      if (ch === ')' || ch === ']') {
        if (!stack.length || stack.pop() !== pairs[ch]) {
          return { valid: false, error: 'ترتیب پرانتزها یا کروشه‌ها صحیح نیست' };
        }
      }
    }
    if (stack.length) return { valid: false, error: 'تعداد پرانتزها یا کروشه‌های باز و بسته برابر نیست' };

    const stripped = text.replace(/\s/g, '').replace(/×/g, '*');
    if (/^[+*]/.test(stripped) || /[+*]$/.test(stripped)) {
      return { valid: false, error: 'عملگر در ابتدا یا انتهای فرمول نامعتبر است' };
    }
    if (/[+*]{2,}/.test(stripped)) return { valid: false, error: 'عملگرهای متوالی نامعتبر هستند' };
    if (/\(\)/.test(stripped) || /\[\]/.test(stripped)) return { valid: false, error: 'گروه یا کروشه خالی معتبر نیست' };

    return { valid: true };
  }

  function parseFormulaString(formulaText, options = {}) {
    const basicCheck = validateFormula(formulaText);
    if (!basicCheck.valid) return { valid: false, error: basicCheck.error, elements: [] };

    const activeItems = getRegisteredItems({ activeOnly: true, ...options });
    const allItems = getRegisteredItems({ activeOnly: false, ...options });
    const text = String(formulaText || '').replace(/×/g, '*').trim();
    let pos = 0;
    let elementCounter = 0;
    let warningReason = '';

    function markWarning(message) {
      if (!warningReason) warningReason = message;
    }

    function peek() { return pos < text.length ? text[pos] : null; }
    function consume() { return text[pos++]; }
    function skipWS() { while (pos < text.length && /\s/.test(text[pos])) pos += 1; }

    function parseIdentifier() {
      skipWS();
      let id = '';
      while (pos < text.length && /[a-z0-9_]/.test(text[pos])) id += consume();
      return id;
    }

    function activeItem(id) { return findInCollection(id, activeItems); }
    function anyItem(id) { return findInCollection(id, allItems); }

    function requireActiveItem(id) {
      const item = activeItem(id);
      if (item) return item;
      const inactive = anyItem(id);
      if (inactive) throw new Error(`آیتم «${id}» در سیستم وجود دارد اما فعال نیست`);
      throw new Error(`شناسه «${id}» در سیستم تعریف نشده است`);
    }

    function expect(ch, message) {
      skipWS();
      if (peek() !== ch) throw new Error(message || `کاراکتر «${ch}» انتظار می‌رفت`);
      consume();
    }

    function makeElementFromItem(item, operator) {
      return {
        id: ++elementCounter,
        type: item.type,
        subType: item.type === 'variable'
          ? (item.source === 'api' ? 'api-variable' : 'independent-variable')
          : item.type,
        operator: operator === '*' ? '*' : '+',
        selectedId: item.id,
        selectedName: item.name,
        selectedUnit: item.unit || (item.type === 'constant' ? '٪' : 'رُندسازی'),
        selectedValue: item.price ?? item.percent ?? 0,
        quantitySymbol: item.quantitySymbol || '',
        source: item.source || '',
        isGroup: false,
        innerElements: []
      };
    }

    function parseExpression(stopChar) {
      const elements = [];
      let pendingOp = '+';
      let expectingTerm = true;

      while (pos < text.length) {
        skipWS();
        const ch = peek();
        if (!ch) break;
        if (stopChar && ch === stopChar) break;

        if (ch === '+' || ch === '*') {
          if (expectingTerm) throw new Error('عملگر بدون آیتم قبل از آن معتبر نیست');
          pendingOp = consume() === '*' ? '*' : '+';
          expectingTerm = true;
          continue;
        }

        if (!expectingTerm) {
          throw new Error('بین اجزای فرمول باید عملگر + یا * قرار بگیرد');
        }

        const parsed = parseTerm(pendingOp, elements);
        parsed.forEach(el => elements.push(el));
        pendingOp = '+';
        expectingTerm = false;
      }

      if (expectingTerm && elements.length > 0) throw new Error('فرمول با عملگر ناقص تمام شده است');
      normalizeElementOperators(elements);
      return elements;
    }

    function parseTerm(operator, currentElements) {
      skipWS();
      const ch = peek();

      if (ch === '(') {
        consume();
        const inner = parseExpression(')');
        expect(')', 'پرانتز بسته برای گروه محاسباتی پیدا نشد');
        if (!inner.length) throw new Error('گروه محاسباتی خالی معتبر نیست');
        return [{
          id: ++elementCounter,
          type: 'group',
          subType: 'group',
          operator,
          selectedId: '',
          selectedName: '',
          selectedUnit: '',
          selectedValue: 0,
          quantitySymbol: '',
          isGroup: true,
          innerElements: inner
        }];
      }

      if (ch === '[') return parseBracketExpression(operator, currentElements);

      if (/[a-z]/.test(ch || '')) {
        const id = parseIdentifier();
        if (!ID_PATTERN.test(id)) throw new Error(`شناسه «${id}» معتبر نیست`);
        const item = requireActiveItem(id);

        if (item.type === 'variable') {
          skipWS();
          if (peek() !== '*') throw new Error(`متغیر «${id}» باید به صورت ${id}*${item.quantitySymbol || 'a'} نوشته شود`);
          consume();
          skipWS();
          let qSym = '';
          while (pos < text.length && /[a-z]/.test(text[pos])) qSym += consume();
          if (!qSym) throw new Error('بعد از * باید نشانه مقدار متغیر بیاید');
          if (item.quantitySymbol && qSym !== item.quantitySymbol) {
            throw new Error(`نشانه مقدار برای «${id}» باید «${item.quantitySymbol}» باشد، نه «${qSym}»`);
          }
          if (pos < text.length && /[0-9_]/.test(text[pos])) {
            throw new Error(`نشانه مقدار متغیر نامعتبر است: ${qSym}${text[pos]}`);
          }
          const el = makeElementFromItem(item, operator);
          el.quantitySymbol = qSym;
          return [el];
        }

        if (item.type === 'constant') {
          if (!currentElements.length) throw new Error('ثابت درصدی نمی‌تواند اولین آیتم فرمول باشد');
          return [makeElementFromItem(item, operator)];
        }

        throw new Error(`مکانیزم رُندسازی «${id}» فقط باید به شکل [${id}[...]] استفاده شود`);
      }

      throw new Error(`کاراکتر غیرمجاز یا جایگذاری نامعتبر: «${ch}»`);
    }

    function parseBracketExpression(operator, currentElements) {
      consume(); // [
      skipWS();
      const savedPos = pos;
      const firstId = parseIdentifier();
      const firstItem = firstId ? activeItem(firstId) : null;

      if (firstItem?.type === 'rounding') {
        skipWS();
        if (peek() !== '[') {
          throw new Error(`بعد از شناسه رُندسازی «${firstId}» باید کروشه داخلی باز شود`);
        }
        if (currentElements.length > 0) {
          markWarning('رُندسازی فقط وقتی معادل نمایش بصری است که روی کل عبارت قبلی اعمال شده باشد');
        }
        consume(); // inner [
        const inner = parseExpression(']');
        expect(']', 'کروشه داخلی رُندسازی بسته نشده است');
        expect(']', 'کروشه بیرونی رُندسازی بسته نشده است');
        if (!inner.length) throw new Error('رُندسازی روی عبارت خالی معتبر نیست');
        inner[0].operator = operator === '*' ? '*' : '+';
        normalizeElementOperators(inner);
        const roundEl = makeElementFromItem(firstItem, '+');
        return [...inner, roundEl];
      }

      pos = savedPos;
      const inner = parseExpression(']');
      expect(']', 'کروشه بسته پیدا نشد');
      if (!inner.length) throw new Error('کروشه خالی معتبر نیست');
      if (operator === '*' && inner.length > 1) {
        markWarning('ضرب مستقیم روی کروشه چندجزئی، معادل بصری قطعی ندارد؛ برای گروه بصری از پرانتز استفاده کنید.');
      }
      inner[0].operator = operator === '*' ? '*' : '+';
      normalizeElementOperators(inner);
      return inner;
    }

    try {
      const elements = parseExpression(null);
      skipWS();
      if (pos < text.length) throw new Error(`بخش اضافه و غیرقابل پردازش در فرمول: ${text.slice(pos)}`);
      normalizeElementOperators(elements);
      const canonical = buildFormulaString(elements, true);
      const normalizedInput = normalizeFormulaForCompare(text);
      const normalizedCanonical = normalizeFormulaForCompare(canonical);
      if (normalizedInput !== normalizedCanonical) {
        markWarning('فرمول قابل خواندن است، اما شکل کروشه‌گذاری یا ترتیب آن معادل بصری قطعی ندارد.');
      }
      return {
        valid: true,
        elements,
        error: null,
        canonical,
        renderable: !warningReason,
        warning: warningReason || null,
        normalizedInput,
        normalizedCanonical
      };
    } catch (err) {
      return { valid: false, error: err.message || 'خطای ناشناخته در پارس فرمول', elements: [] };
    }
  }

  function applyRounding(value, config) {
    const safeValue = Number(value || 0);
    const digits = Math.max(1, parseInt(config?.digits || 3, 10));
    const factor = Math.pow(10, digits);
    const mode = config?.mode || 'zero';

    /* ── compute the raw rounded result ──────────────────────── */
    let rounded;
    if (mode === 'nine') {
      rounded = Math.floor(safeValue / factor) * factor + (factor - 1);
    } else if (mode === 'last_nine') {
      const subFactor = Math.pow(10, Math.max(0, digits - 1));
      rounded = Math.floor(safeValue / factor) * factor + (9 * subFactor);
    } else {
      rounded = Math.floor(safeValue / factor) * factor;
    }

    /* ── Guard 1: prevent result from becoming 0 ────────────────
       If the rounded value is 0 (or negative) while the original
       price is positive, skip rounding and return the original.   */
    if (config?.preventZero && rounded <= 0 && safeValue > 0) {
      return safeValue;
    }

    /* ── Guard 2: prevent price increase during rounding ────────
       If the rounded value is higher than the original, skip
       rounding and return the original.                          */
    if (config?.preventIncrease && rounded > safeValue) {
      return safeValue;
    }

    return rounded;
  }

  function evaluateFormula(elements, values = {}, options = {}) {
    const registry = getRegisteredItems({ activeOnly: false, ...options });
    function findValueItem(id) { return findInCollection(id, registry); }

    function evalElems(elems) {
      let result = 0;
      let isFirst = true;

      normalizeElementOperators(elems || []).forEach(el => {
        let value = 0;

        if (el.type === 'group' || el.isGroup) {
          value = evalElems(el.innerElements || []);
        } else if (el.type === 'variable') {
          const item = findValueItem(el.selectedId);
          const supplied = values[el.selectedId] || {};
          const price = Number.isFinite(Number(supplied.price)) ? Number(supplied.price) : Number(item?.price || el.selectedValue || 0);
          const quantity = Number.isFinite(Number(supplied.quantity)) ? Number(supplied.quantity)
            : Number.isFinite(Number(supplied.qty)) ? Number(supplied.qty)
              : 1;
          // add ojrat per unit when set
          const ojrat = Number(supplied.ojrat ?? item?.ojrat ?? 0) || 0;
          value = price * quantity + ojrat * quantity;
        } else if (el.type === 'constant') {
          const item = findValueItem(el.selectedId);
          const supplied = values[el.selectedId] || {};
          const percent = Number.isFinite(Number(supplied.percent)) ? Number(supplied.percent) : Number(item?.percent || el.selectedValue || 0);
          result = el.operator === '*' ? result * (percent / 100) : result + result * (percent / 100);
          isFirst = false;
          return;
        } else if (el.type === 'rounding') {
          const item = findValueItem(el.selectedId);
          result = applyRounding(result, item?.config || values[el.selectedId]?.config || {});
          isFirst = false;
          return;
        }

        if (isFirst) {
          result = value;
          isFirst = false;
        } else if (el.operator === '*') {
          result *= value;
        } else {
          result += value;
        }
      });

      return result;
    }

    return evalElems(elements || []);
  }

  function collectDependencies(elements) {
    const deps = { variables: [], constants: [], roundings: [] };
    const seen = new Set();

    function walk(elems) {
      (elems || []).forEach(el => {
        if (el.type === 'group' || el.isGroup) return walk(el.innerElements || []);
        if (!el.selectedId || seen.has(`${el.type}:${el.selectedId}`)) return;
        seen.add(`${el.type}:${el.selectedId}`);
        if (el.type === 'variable') deps.variables.push(el.selectedId);
        if (el.type === 'constant') deps.constants.push(el.selectedId);
        if (el.type === 'rounding') deps.roundings.push(el.selectedId);
      });
    }

    walk(elements || []);
    return deps;
  }

  /* ── RPN / postfix compiler ─────────────────────────────────────
     Emits a flat, backend-friendly instruction list that a ~15-line
     PHP stack machine can execute without re-implementing the JS
     parser/AST walker. Grammar mirrors evaluateFormula():

       push var  -> {op:'var',      id, qty}       -> pushes price*qty (+ ojrat*qty)
       push const-> {op:'const',    id, mode}       -> pops a, pushes const applied to a
       group     -> compiled recursively, no extra op (transparent to the stack)
       combine   -> {op:'add'} | {op:'mul'}         -> pops b,a, pushes a±*b
       round     -> {op:'round', id}                -> pops a, pushes rounded(a)

     The program is a straight left-to-right postfix walk of the same
     element tree buildFormulaString()/evaluateFormula() already use,
     so canonical formula text, AST, and program can never diverge. */
  function compileToProgram(elements, options = {}) {
    const program = [];
    const safeElements = normalizeElementOperators(elements || []);

    function emit(elems) {
      let combinedOnce = false;

      elems.forEach(el => {
        if (el.type === 'group' || el.isGroup) {
          emit(el.innerElements || []);
        } else if (el.type === 'variable') {
          const item = getElementRegistryItem(el, options);
          program.push({
            op: 'var',
            id: item?.id || el.selectedId,
            qty: item?.quantitySymbol || el.quantitySymbol || '',
            ojrat: !!(item?.ojrat > 0)
          });
        } else if (el.type === 'constant') {
          const item = getElementRegistryItem(el, options);
          program.push({
            op: 'const',
            id: item?.id || el.selectedId,
            mode: el.operator === '*' ? 'mul' : 'add'
          });
          combinedOnce = true; // constant already consumed+re-pushed the running total
          return;
        } else if (el.type === 'rounding') {
          const item = getElementRegistryItem(el, options);
          program.push({ op: 'round', id: item?.id || el.selectedId });
          combinedOnce = true;
          return;
        } else {
          return;
        }

        if (combinedOnce) {
          program.push({ op: el.operator === '*' ? 'mul' : 'add' });
        } else {
          combinedOnce = true;
        }
      });
    }

    emit(safeElements);
    return program;
  }

  /* Strips invisible Unicode bidi control marks (LRM/RLM/LRE/RLE/PDF/LRO/RLO)
     that RTL browsers silently inject into contentEditable text around
     Latin-script runs. Left in place, these marks pass through untouched
     into the formula validation regex and produce false-positive
     leading/trailing-operator errors even though the visible text is a
     perfectly valid formula. Pure/stateless so it's safe to call anywhere
     raw text is pulled out of the DOM. */
  function sanitizeBiDiCharacters(text) {
    return String(text || '').replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069\u061C]/g, '');
  }

  return {
    getRegisteredItems,
    findItemById,
    buildFormulaString,
    parseFormulaString,
    validateFormula,
    generateQuantitySymbol,
    parseNumberValue,
    normalizeIdentifier,
    normalizeQuantitySymbol,
    syncVariableQuantitySymbols,
    evaluateFormula,
    applyRounding,
    getUnitMeta,
    UNIT_TAXONOMY: unitCatalog,
    getUnitOptions,
    getQuantityFieldLabel,
    getPriceFieldLabel,
    normalizeElementOperators,
    hasValidElementOrder,
    serializeElements: elements => normalizeElementOperators(elements || []).map(cloneElementForBackend),
    collectDependencies,
    compileToProgram,
    normalizeFormulaForCompare,
    sanitizeBiDiCharacters,
    isolateRtlLabel
  };
})();

export { HojrehFormulaEngine };
