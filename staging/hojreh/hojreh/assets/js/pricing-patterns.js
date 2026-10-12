/* pricing-patterns.js — ENTRY POINT / MODULE MAP
   ═══════════════════════════════════════════════════════════════
   This used to be a single ~2,700-line file. It has been split into
   assets/js/pricing-patterns/*.js so each piece stays reviewable and
   testable on its own:

     formula-engine.js    HojrehFormulaEngine — pure formula parser /
                           AST / evaluator. No DOM, no dependency on
                           HojrehPatternController.

     controller-core.js   HojrehPatternController's constructor and
                           its small stateless static helpers
                           (instance registry, cloneElements, etc).

     controller-state.js  Pure state-mutation methods (add/remove/move
                           elements, formula text sync, evaluate) plus
                           the backend-ready compiler layer
                           (compileToProgram, getPayload, dirty-
                           tracking). No DOM.

     controller-dom.js    Every DOM-binding method (render, drag &
                           drop, the simulator grid, hydrate/destroy).

     controller.js         Merges controller-core + controller-state +
                            controller-dom into the one
                            HojrehPatternController class every other
                            file imports — same prototype chain, same
                            methods, same behavior as before.

     bootstrap.js          Wires HojrehPatternController instances to
                            the accordion markup and builds the
                            pricingPatterns facade object.

   Every method body was moved as-is; nothing was rewritten. The
   public API below — HojrehFormulaEngine, HojrehPatternController,
   pricingPatterns — is unchanged, so nothing importing from
   './pricing-patterns.js' needed to change.
   ═══════════════════════════════════════════════════════════════ */

import './formula-preview-overflow.js';
import { HojrehFormulaEngine } from './pricing-patterns/formula-engine.js';
import { HojrehPatternController } from './pricing-patterns/controller.js';
import { bootstrapHojrehPricingPatterns } from './pricing-patterns/bootstrap.js';

export { HojrehFormulaEngine, HojrehPatternController };

export let pricingPatterns = {};

/* bootstrapHojrehPricingPatterns() returns null when #pricingPatternsList
   isn't present on the page (e.g. price-editor.html, which doesn't use
   the settings-panel accordion), in which case pricingPatterns stays
   the empty facade above — identical to the pre-refactor behavior. */
const facade = bootstrapHojrehPricingPatterns();
if (facade) pricingPatterns = facade;
