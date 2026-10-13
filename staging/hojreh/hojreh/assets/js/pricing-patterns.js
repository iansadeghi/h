import './formula-preview-overflow.js';
import { HojrehFormulaEngine } from './pricing-patterns/formula-engine.js';
import { HojrehPatternController } from './pricing-patterns/controller.js';
import { bootstrapHojrehPricingPatterns } from './pricing-patterns/bootstrap.js';
export { HojrehFormulaEngine, HojrehPatternController };
export let pricingPatterns = {};
const facade = bootstrapHojrehPricingPatterns();
if (facade) pricingPatterns = facade;