/* ═══════════════════════════════════════════════════════════════
   hojreh-product-integration.js
   ───────────────────────────────────────────────────────────────
   Entry point for the Hojreh × WooCommerce product-page mockup
   integration. Two jobs:

     1. Seed the two example saved patterns in the hidden
        #pricingPatternsList mirror (data-id="401" and "402") with
        real formula elements, through the real engine's own data
        model (HojrehPatternController.setElements()), so the
        "استفاده از الگو" tab has something real to demonstrate with
        instead of an empty formula. Per the brief, this is allowed
        precisely because the shipped settings-panel.html demo data
        ships pattern 401 empty.

     2. Find every price field this page has (the simple-product
        "قیمت عادی" field, and each variation's) and turn it into a
        Hojreh dynamic-pricing field via
        hojreh-formula-modal.js's createHojrehFormulaField().
   ═══════════════════════════════════════════════════════════════ */

import { HojrehPatternController } from '../../hojreh/assets/js/pricing-patterns.js';
import { createHojrehFormulaField } from './hojreh-formula-modal.js';

/* ── 1) Seed the two example patterns ──────────────────────────────
   Element shape matches BACKEND-CONTRACT.md's documented AST
   (§14.3): { id, type, operator, selectedId, isGroup, innerElements }.
   Quantity symbols ('a' for var1, 'c' for the packaging variable
   whose ENGLISH ID is "var3" -- note this differs from that same
   item's accordion data-id, which is "103"; data-id is only the
   accordion's own DOM identity, the formula engine keys everything
   by english-id-input's value) match the values already hardcoded
   on those items' quantity-symbol inputs in the registry mirror. */
function seedExamplePatterns() {
  const p401 = HojrehPatternController.get('401');
  if (p401 && !p401.state.elements.length) {
    p401.setElements([
      { id: 1, type: 'variable', operator: '+', selectedId: 'var1', quantitySymbol: 'a', isGroup: false, innerElements: [] },
      { id: 2, type: 'variable', operator: '+', selectedId: 'var3', quantitySymbol: 'c', isGroup: false, innerElements: [] },
      { id: 3, type: 'rounding', operator: '+', selectedId: 'round1', isGroup: false, innerElements: [] }
    ]);
    p401._setStatus('green', null);
    p401.rememberLastValidFormula();
    if (p401.container) p401.render({ syncPreview: true });
  }

  const p402 = HojrehPatternController.get('402');
  if (p402 && !p402.state.elements.length) {
    p402.setElements([
      { id: 1, type: 'variable', operator: '+', selectedId: 'var1', quantitySymbol: 'a', isGroup: false, innerElements: [] },
      { id: 2, type: 'constant', operator: '+', selectedId: 'const1', isGroup: false, innerElements: [] },
      { id: 3, type: 'constant', operator: '+', selectedId: 'const2', isGroup: false, innerElements: [] },
      { id: 4, type: 'rounding', operator: '+', selectedId: 'round1', isGroup: false, innerElements: [] }
    ]);
    p402.rememberLastValidFormula();
    if (p402.container) p402.render({ syncPreview: true });
  }
}

/* ── 2) Wire up every price field on the page ─────────────────────── */

function wireSimpleProductField() {
  const group = document.querySelector('[data-hojreh-instance="simple"]');
  if (!group) return;

  createHojrehFormulaField({
    key: 'simple',
    productType: 'simple',
    mountEl: group.querySelector('[data-hojreh-role="dynamic-pricing-mount"]'),
    regularPriceFieldEl: group.querySelector('[data-hojreh-role="regular-price-field"]'),
    regularPriceInput: group.querySelector('[data-hojreh-role="regular-price-input"]'),
    salePriceFieldEl: group.querySelector('[data-hojreh-role="sale-price-field"]'),
    stockStatusInputs: document.querySelectorAll('[data-hojreh-role="simple-stock-status"]'),
    getProductName: () => document.querySelector('#titlewrap input')?.value?.trim() || 'محصول'
  });
}

function wireVariationFields() {
  document.querySelectorAll('[data-hojreh-instance^="var-"]').forEach(body => {
    const key = body.dataset.hojrehInstance;
    const head = body.closest('.variation-item')?.querySelector('.variation-title');
    const variationLabel = head ? head.textContent.trim() : key;

    createHojrehFormulaField({
      key,
      productType: 'variable',
      mountEl: body.querySelector('[data-hojreh-role="dynamic-pricing-mount"]'),
      regularPriceFieldEl: body.querySelector('[data-hojreh-role="regular-price-field"]'),
      regularPriceInput: body.querySelector('[data-hojreh-role="regular-price-input"]'),
      salePriceFieldEl: body.querySelector('[data-hojreh-role="sale-price-field"]'),
      stockStatusSelectEl: body.querySelector('[data-hojreh-role="stock-status-select"]'),
      getProductName: () => {
        const title = document.querySelector('#titlewrap input')?.value?.trim() || 'محصول';
        return `${title} — ${variationLabel}`;
      }
    });
  });
}

seedExamplePatterns();
wireSimpleProductField();
wireVariationFields();
