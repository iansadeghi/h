/* ─── EMPTY STATE برای accordion-list های سکشن‌های تنظیمات ───
   الهام‌گرفته از empty state بخش سرچ مودال API (assets/js/api-modal.js
   → .api-empty-state در assets/css/api-modal.css): آیکون + عنوان + توضیح.
   اینجا همان الگو برای هر ۶ لیست آکاردئونی صفحه‌ی settings-panel تکرار
   شده، با عنوان/توضیح اختصاصی هرکدام (اشاره به دکمه‌ی «افزودن» همان سکشن). */

const EMPTY_STATE_ICON = `
  <svg class="accordion-empty-icon" viewBox="0 0 126.086 120.359" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M125.95,42.66a2.983,2.983,0,0,0-3.8-1.9l-2.2.7a60.491,60.491,0,0,1-54.1-39.5,3.037,3.037,0,0,0-5.7,2.1,66.706,66.706,0,0,0,46.9,41.6l-18.5,6.1a78.564,78.564,0,0,1-22.5-16.3v-8.2a3,3,0,0,0-6,0v8.2a81.674,81.674,0,0,1-10.4,9.1,3.011,3.011,0,0,0,3.5,4.9,73.4,73.4,0,0,0,6.9-5.6v15.3l-41.1-13.5a65.685,65.685,0,0,0,19-7.8,2.984,2.984,0,1,0-3.1-5.1,59.791,59.791,0,0,1-28.7,8.7l-2.2-.7a3,3,0,0,0-1.9,5.7l2.7.8a57.54,57.54,0,0,1,11.2,11.9,61.222,61.222,0,0,1,7.7,14.8,59.208,59.208,0,0,1,3.4,16.2,2.971,2.971,0,0,0,3,2.8h.2a3.012,3.012,0,0,0,2.8-3.2,68,68,0,0,0-3.7-17.8,66.584,66.584,0,0,0-8.5-16.3c-1-1.4-2.1-2.8-3.2-4.2l18.4,6.1a75.9,75.9,0,0,1,8.4,26.2l-23,31.7a2.953,2.953,0,0,0,.7,4.2,2.792,2.792,0,0,0,1.8.6,2.982,2.982,0,0,0,2.4-1.2l4.1-5.7h0a60.379,60.379,0,0,1,65.1.1v.1l4,5.6a2.982,2.982,0,0,0,2.4,1.2,3.226,3.226,0,0,0,1.8-.6,3.122,3.122,0,0,0,.7-4.2l-3.3-4.6v-.2a60.121,60.121,0,0,1,20.2-63.4l2.6-.8A3.235,3.235,0,0,0,125.95,42.66Zm-58.1,22.2,14.2-4.7a82.3,82.3,0,0,0-5.4,16.8Zm12.7-10.5-14.5,4.8V43.76A82.892,82.892,0,0,0,80.55,54.36Zm-36.6,5.8,17.2,5.6,10.5,14.5a83.36,83.36,0,0,0-17.3,0l4.1-5.6a3.011,3.011,0,1,0-4.9-3.5l-4.2,5.8A82.3,82.3,0,0,0,43.95,60.16Zm49.9,45.2a66.77,66.77,0,0,0-55.6-2.8l11.3-15.6a81.563,81.563,0,0,1,27,0l5.5,7.6a2.982,2.982,0,0,0,2.4,1.2,3.226,3.226,0,0,0,1.8-.6,3.122,3.122,0,0,0,.7-4.2l-5.3-7.3a78.078,78.078,0,0,1,8.4-26.2l18.5-6.1A66.829,66.829,0,0,0,93.85,105.36Z" transform="translate(-0.002 -0.001)"/>
    <path d="M47.05,24.26a3,3,0,1,0,3,3A3,3,0,0,0,47.05,24.26Z" transform="translate(-0.002 -0.001)"/>
  </svg>
`;

/* هر لیست: عنوان و توضیحی که به دکمهٔ «افزودن» همان سکشن اشاره می‌کند. */
const EMPTY_STATE_CONFIG = {
  apiVariablesList: {
    title: 'هیچ متغیری وجود ندارد!',
    desc: 'برای افزودن متغیر، از دکمه «مشاهده بیشتر» استفاده کنید.'
  },
  independentList: {
    title: 'هیچ متغیری وجود ندارد!',
    desc: 'برای افزودن متغیر، از دکمه «افزودن متغیر مستقل» استفاده کنید.'
  },
  constantsList: {
    title: 'هیچ ثابتی وجود ندارد!',
    desc: 'برای افزودن ثابت، از دکمه «ایجاد ثابت» استفاده کنید.'
  },
  roundingList: {
    title: 'هیچ الگوریتمی وجود ندارد!',
    desc: 'برای افزودن الگوریتم رُندسازی، از دکمه «ایجاد الگوریتم رُندسازی» استفاده کنید.'
  },
  pricingPatternsList: {
    title: 'هیچ الگویی وجود ندارد!',
    desc: 'برای افزودن الگو، از دکمه «ایجاد الگو» استفاده کنید.'
  },
  apprenticeList: {
    title: 'هیچ شاگردی وجود ندارد!',
    desc: 'برای افزودن شاگرد، از دکمه «افزودن شاگرد حجره» استفاده کنید.'
  }
};

/* آیتم‌های «پنهان‌شده» (مثل acc-hide-btn متغیرهای API که فقط display:none
   می‌شوند و از DOM حذف نمی‌شوند) نباید به‌عنوان آیتم فعال شمرده شوند. */
function countVisibleAccordionItems(list) {
  return Array.from(list.children).filter(child =>
    child.classList.contains('accordion-item') && child.style.display !== 'none'
  ).length;
}

function buildEmptyStateEl(config) {
  const empty = document.createElement('div');
  empty.className = 'accordion-empty-state';
  // مثل انیمیشن ورود آیتم‌های جدید (add-items.js / api-modal.js):
  // اول مخفی می‌شود، بعد در فریم بعدی محو-ظاهر می‌شود تا یهویی نیاید.
  empty.style.opacity = '0';
  empty.style.transform = 'translateY(-8px)';
  empty.innerHTML = `
    ${EMPTY_STATE_ICON}
    <div class="accordion-empty-title">${config.title}</div>
    <div class="accordion-empty-desc">${config.desc}</div>
  `;
  return empty;
}

/* بعد از هر افزودن/حذف/پنهان‌سازی آیتم در یکی از ۶ لیست آکاردئونی صدا زده
   می‌شود تا empty state را در صورت نیاز نشان/پنهان کند. */
function refreshAccordionEmptyState(list) {
  if (!list) return;
  const config = EMPTY_STATE_CONFIG[list.id];
  if (!config) return;

  const existing = list.querySelector(':scope > .accordion-empty-state');

  if (countVisibleAccordionItems(list) > 0) {
    existing?.remove();
    return;
  }

  if (existing) return;

  const empty = buildEmptyStateEl(config);
  list.appendChild(empty);

  requestAnimationFrame(() => {
    empty.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    empty.style.opacity = '1';
    empty.style.transform = 'translateY(0)';
  });
}

function initAccordionEmptyStates() {
  Object.keys(EMPTY_STATE_CONFIG).forEach(id => {
    refreshAccordionEmptyState(document.getElementById(id));
  });
}

export { refreshAccordionEmptyState, initAccordionEmptyStates };
