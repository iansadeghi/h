/* ═══════════════════════════════════════════════════════════════
   HojrehPatternController — ASSEMBLY
   ───────────────────────────────────────────────────────────────
   Composes the final HojrehPatternController class from:
     - controller-core.js   constructor + static registry/helpers
     - controller-state.js  pure state-mutation + backend-compiler methods
     - controller-dom.js    DOM-binding methods + static DOM helper

   This is a plain mixin merge (Object.assign onto the prototype /
   the class itself), so the result is byte-for-byte the same class
   shape — same prototype chain, same methods, same `instanceof`
   behavior — as the original single ~1500-line class body. Nothing
   importing HojrehPatternController needs to know it's assembled
   from four files instead of one.
   ═══════════════════════════════════════════════════════════════ */

import { HojrehPatternController } from './controller-core.js';
import { controllerStateMixin } from './controller-state.js';
import { controllerDomMixin, controllerDomStatics } from './controller-dom.js';

Object.assign(HojrehPatternController.prototype, controllerStateMixin, controllerDomMixin);
Object.assign(HojrehPatternController, controllerDomStatics);

export { HojrehPatternController };
