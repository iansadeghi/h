import './dark-mode.js';

const searchInput = document.getElementById('productFormulaSearch');
const clearBtn = document.getElementById('productSearchClear');
const list = document.getElementById('productFormulaList');
const emptyState = document.getElementById('productsEmptyState');
const items = Array.from(list?.querySelectorAll('.product-list-item') || []);

function normalize(value) {
  return String(value || '')
    .toLocaleLowerCase('fa')
    .replace(/[يى]/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\s+/g, ' ')
    .trim();
}

function filterProducts() {
  const query = normalize(searchInput?.value);
  let visible = 0;

  items.forEach((item) => {
    const matches = !query || normalize(item.dataset.search).includes(query);
    item.hidden = !matches;
    if (matches) visible += 1;
  });

  if (clearBtn) clearBtn.hidden = !query;
  if (emptyState) emptyState.hidden = visible !== 0;
}

searchInput?.addEventListener('input', filterProducts);
clearBtn?.addEventListener('click', () => {
  searchInput.value = '';
  filterProducts();
  searchInput.focus();
});

filterProducts();
