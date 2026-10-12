/* ═══════════════════════════════════════════════════════════════
   HojrehPatternController — CORE
   ───────────────────────────────────────────────────────────────
   Pure, DOM-agnostic-by-default, instance-scoped pricing pattern
   controller. Each instance owns 100% of its own state: elements
   tree, id counter, validation status/error, manual-mode text
   snapshot, and (optionally) a bound DOM container.

   There is no module-level "active pattern" cursor anywhere in this
   file. Any number of instances can exist concurrently — in the
   settings-panel accordion, in a headless Node/PHP-adjacent script,
   or spun up on demand for bulk WooCommerce sync — without any one
   instance able to corrupt another's state.

   This file holds only the constructor and the small stateless
   static helpers (registry, cloning, DOM-attribute reading). The
   bulk of the instance behavior lives in two sibling mixin files
   that get merged onto this class's prototype by controller.js:
     - controller-state.js  pure state-mutation + backend-compiler methods
     - controller-dom.js    DOM-binding methods (render, drag&drop, etc.)
   Splitting it this way keeps the constructor/registry plumbing
   readable instead of being buried inside ~1500 lines of methods,
   while every instance still behaves exactly as before: this
   remains a single class with a single prototype chain.
   ═══════════════════════════════════════════════════════════════ */

import { HojrehFormulaEngine } from './formula-engine.js';

class HojrehPatternController {
  /**
   * @param {string|number} patternId  Stable identifier for this pattern
   *   (matches data-id on the accordion, or the WP post/row id).
   * @param {Element|null}  targetContainer  Optional DOM node this
   *   instance should render into / read controls from. May be null
   *   for headless use (bulk generation, backend payload precompute).
   * @param {object}        [options]
   * @param {string}        [options.patternName='']
   * @param {Array}         [options.initialElements=[]]  Pre-hydrated AST.
   */
  constructor(patternId, targetContainer = null, options = {}) {
    if (!patternId && patternId !== 0) {
      throw new Error('HojrehPatternController requires a patternId');
    }

    this.patternId = String(patternId);
    this.container = targetContainer || null;

    /* Optimistic-concurrency token (Contract §10). Read from the bound
       container's data-revision attribute; null when the DOM doesn't
       carry one yet (e.g. brand-new unsaved pattern, or headless use
       with no targetContainer) so callers can distinguish "unknown
       revision" from "revision 0". Re-synced whenever bindDom() runs
       against a (re)rendered container. `revisionInfo.authoritative`
       tells us whether that value actually came from a server-emitted
       data-revision attribute, vs. a non-blocking `1` placeholder used
       only so the UI has something to render — see state.isRevisionAuthoritative
       below and _readRevisionAttr()'s doc comment. */
    const revisionInfo = HojrehPatternController._readRevisionAttr(targetContainer);
    this.lastKnownRevision = revisionInfo.revision;

    /* Optional injected data catalog (options.registryCatalog). When
       set, every engine call this instance makes — buildFormulaText,
       evaluate, compileToProgram, validateAndApplyFormula, the
       item-picker dropdowns, etc. — resolves variables/constants/
       roundings from this catalog instead of scraping the DOM, so the
       instance is fully usable with `targetContainer === null`. */
    this.registryCatalog = options.registryCatalog || null;

    /* ── Isolated instance state ──────────────────────────────
       Nothing here is shared with any other controller instance. */
    this.state = {
      patternName: options.patternName || '',
      elements: HojrehPatternController.cloneElements(options.initialElements || []),
      lastValidElements: HojrehPatternController.cloneElements(options.initialElements || []),
      elementCounter: 0,
      status: 'empty',      // 'empty' | 'green' | 'yellow' | 'red'
      errorMessage: '',
      isManual: false,
      manualText: '',
      savedFormulaText: null, // dirty-tracking snapshot; null = not yet synced
      simulatorValues: {},     // { [itemId]: { price, quantity } } — test-panel overrides

      /* True only when this.lastKnownRevision was read from a real,
         numeric data-revision attribute emitted by the server (Contract
         §10). False for the "1" UI placeholder used when the attribute
         is missing entirely. Save/sync code can consult this before
         trusting lastKnownRevision as a genuine base_revision. */
      isRevisionAuthoritative: revisionInfo.authoritative
    };

    /* Internal-only, non-serializable runtime handles (timers, DOM
       refs). Deliberately kept off `state` so state stays cheap to
       clone/snapshot and free of circular DOM references. */
    this._dom = {
      dropZone: null,
      emptyState: null,
      itemsContainer: null,
      previewLarge: null,
      testInputsGrid: null,
      finalCalcValue: null
    };
    this._isRendering = false;
    this._validateTimer = null;
    this._hydrationTimer = null;

    this.refreshCounterFromElements();

    if (this.container) this.bindDom(this.container);
  }

  /* ══════════════════════════════════════════════════════════════
     STATIC HELPERS (stateless — safe to call without an instance)
     ══════════════════════════════════════════════════════════════ */

  static cloneElements(elements) {
    return JSON.parse(JSON.stringify(elements || []));
  }

  /** Reads data-revision off a container element for optimistic
   *  concurrency (Contract §10). Returns `{ revision, authoritative }`
   *  rather than a bare number, so callers (constructor, bindDom) can
   *  tell a real server-emitted revision apart from a client-side
   *  placeholder:
   *   - attribute present & numeric  → { revision: N, authoritative: true }
   *   - attribute present but empty,
   *     or non-numeric               → { revision: null, authoritative: false }
   *   - attribute missing entirely   → { revision: 1, authoritative: false }
   *     (a non-blocking UI placeholder ONLY — e.g. brand-new unsaved
   *     patterns or demo fixtures that never wired up data-revision.
   *     We deliberately do NOT call element.setAttribute() here: doing
   *     so unconditionally could stamp a fake "1" over server intent
   *     that just hasn't hydrated yet, and a save/sync path reading
   *     that stamped value back off the DOM later would mistake it for
   *     a verified base_revision.)
   */
  static _readRevisionAttr(container) {
    if (!container || !container.getAttribute) return { revision: null, authoritative: false };
    const raw = container.getAttribute('data-revision');
    if (raw === null) {
      return { revision: 1, authoritative: false };
    }
    if (raw === '') return { revision: null, authoritative: false };
    const num = Number(raw);
    return Number.isFinite(num)
      ? { revision: num, authoritative: true }
      : { revision: null, authoritative: false };
  }

  /** Inserts plain, already-sanitized text at the current caret
   *  position inside a contentEditable element using the standard
   *  Selection/Range APIs, replacing the deprecated (and no longer
   *  spec-tracked) document.execCommand('insertText', ...) call.
   *  Falls back to an append-at-end if the selection isn't currently
   *  inside `editableEl` (e.g. focus was lost between paste and here). */
  static _insertPlainTextAtSelection(editableEl, text) {
    const selection = window.getSelection();
    let range = null;

    if (selection && selection.rangeCount > 0) {
      const candidate = selection.getRangeAt(0);
      if (editableEl.contains(candidate.commonAncestorContainer)) {
        range = candidate;
      }
    }

    if (!range) {
      // No usable selection inside the field — fall back to inserting
      // at the very end so the paste is never silently dropped.
      range = document.createRange();
      range.selectNodeContents(editableEl);
      range.collapse(false);
    }

    range.deleteContents();
    const textNode = document.createTextNode(text);
    range.insertNode(textNode);

    // Move the caret to just after the inserted text, mirroring what
    // execCommand('insertText', ...) used to do.
    range.setStartAfter(textNode);
    range.setEndAfter(textNode);
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
    }

    // contentEditable fields don't fire a native 'input' event for
    // programmatic DOM mutation the way execCommand used to, so dispatch
    // one manually to keep the existing 'input' listener (debounced
    // validateAndApplyFormula) working unchanged.
    editableEl.dispatchEvent(new Event('input', { bubbles: true }));
  }

  /** Registry of every live controller, keyed by patternId. Lets
   *  cross-pattern queries (e.g. "is item X used anywhere?") iterate
   *  without any instance needing to know about the others directly. */
  static _registry = new Map();

  static register(instance) {
    HojrehPatternController._registry.set(instance.patternId, instance);
    return instance;
  }

  static unregister(patternId) {
    HojrehPatternController._registry.delete(String(patternId));
  }

  static get(patternId) {
    return HojrehPatternController._registry.get(String(patternId)) || null;
  }

  static all() {
    return Array.from(HojrehPatternController._registry.values());
  }

  static isItemUsedInAnyInstance(itemId) {
    const normalizedId = HojrehFormulaEngine.normalizeIdentifier(itemId);
    return HojrehPatternController.all().some(instance => instance.isItemUsed(normalizedId));
  }
}

export { HojrehPatternController };
