import { HojrehPatternController } from './controller-core.js';
import { controllerStateMixin } from './controller-state.js';
import { controllerDomMixin, controllerDomStatics } from './controller-dom.js';
Object.assign(HojrehPatternController.prototype, controllerStateMixin, controllerDomMixin);
Object.assign(HojrehPatternController, controllerDomStatics);
export { HojrehPatternController };