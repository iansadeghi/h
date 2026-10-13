import { pricingPatterns } from '../pricing-patterns.js';
function normalizeEnglishIdValue(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '');
}
function generateEnglishID(persianText, type, currentInput) {
  const prefixMap = {
    'variable': 'var',
    'api-variable': 'api',
    'constant': 'const',
    'algorithm': 'round',
    'pattern': 'pattern'
  };
  const prefix = prefixMap[type] || type || 'item';
  const existingIds = new Set();
  document.querySelectorAll('.english-id-input').forEach(input => {
    if (input === currentInput) return;
    const val = normalizeEnglishIdValue(input.value);
    if (val) existingIds.add(val);
  });
  let counter = 1;
  let candidateId = `${prefix}${counter}`;
  while (existingIds.has(candidateId)) {
    counter++;
    candidateId = `${prefix}${counter}`;
  }
  return candidateId;
}
function getItemFormulaId(item) {
  return normalizeEnglishIdValue(item?.querySelector('.english-id-input')?.value || '');
}
function hasDuplicateActiveEnglishId(id, currentItem) {
  const normalized = normalizeEnglishIdValue(id);
  if (!normalized) return false;
  return Array.from(document.querySelectorAll('.accordion-item')).some(item => {
    if (item === currentItem) return false;
    if (!item.querySelector('.acc-switch input[type="checkbox"]')?.checked) return false;
    return getItemFormulaId(item) === normalized;
  });
}
function isFormulaProtectedItem(item) {
  const id = getItemFormulaId(item);
  if (!id) return false;
  const patterns = pricingPatterns;
  return !!(
    patterns?.isItemUsedInAnyFormula?.(id) ||
    patterns?.isItemUsedInFormula?.(id) ||
    patterns?.isRegisteredItemUsed?.(id) ||
    patterns?.isRegistryItemUsed?.(id)
  );
}
function itemHumanType(item) {
  const type = item?.dataset?.type;
  if (type === 'variable') return 'متغیر';
  if (type === 'api-variable') return 'متغیر وابسته به API';
  if (type === 'constant') return 'ثابت درصدی';
  if (type === 'algorithm') return 'مکانیزم رُندسازی';
  if (type === 'pattern') return 'الگو';
  if (type === 'apprentice') return 'شاگرد حجره';
  return 'آیتم';
}
function nextAccordionId(type) {
  const safeType = String(type || 'item').replace(/[^a-z0-9_-]/gi, '') || 'item';
  return `${safeType}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}
export {
  normalizeEnglishIdValue,
  generateEnglishID,
  getItemFormulaId,
  hasDuplicateActiveEnglishId,
  isFormulaProtectedItem,
  itemHumanType,
  nextAccordionId
};
