import { HojrehFormulaEngine, pricingPatterns } from './pricing-patterns.js';
import { settingsPanel } from './settings-panel.js';
import { customSelect } from './custom-select.js';

let apiModal;

/* ═══════════════════════════════════════════════════════════════
   API MODAL — متغیرهای وابسته به API
   فایل: assets/js/api-modal.js
   ═══════════════════════════════════════════════════════════════ */
(function () {

  /* ─── تولید شناسه‌های حرفی برای متغیرهای تعداد، هم‌راستا با HojrehFormulaEngine ─── */
  function generateQuantitySymbol(index) {
    if (HojrehFormulaEngine?.generateQuantitySymbol) {
      return HojrehFormulaEngine.generateQuantitySymbol(index);
    }

    const letters = 'abcdefghijklmnopqrstuvwxyz';
    let n = Math.max(0, Number(index) || 0);
    if (n < 26) return letters[n];
    n -= 26;

    for (let length = 2; length < 8; length++) {
      const blockSize = 26 * Math.pow(25, length - 1);
      if (n < blockSize) {
        let result = '';
        let previous = '';
        for (let pos = 0; pos < length; pos++) {
          const choices = pos === 0 ? letters.split('') : letters.split('').filter(ch => ch !== previous);
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

  /* ─── محاسبه quantity symbols برای متغیرهای API ─── */
  function updateApiQuantitySymbols() {
    if (HojrehFormulaEngine?.syncVariableQuantitySymbols) {
      HojrehFormulaEngine.syncVariableQuantitySymbols();
      pricingPatterns.refreshFormulaAfterSettingsChange?.();
      return;
    }

    const allVariables = [];
    document.querySelectorAll('#apiVariablesList .accordion-item[data-type="api-variable"]').forEach(item => {
      if (!item.querySelector('.acc-switch input[type="checkbox"]')?.checked) return;
      allVariables.push({ element: item, quantityInput: item.querySelector('.quantity-symbol-input') });
    });
    document.querySelectorAll('#independentList .accordion-item[data-type="variable"]').forEach(item => {
      if (!item.querySelector('.acc-switch input[type="checkbox"]')?.checked) return;
      allVariables.push({ element: item, quantityInput: item.querySelector('.quantity-symbol-input') });
    });

    const used = new Set();
    allVariables.forEach((v, index) => {
      if (!v.quantityInput) return;
      const current = String(v.quantityInput.value || '').trim().toLowerCase().replace(/[^a-z]/g, '');
      if (current && !used.has(current)) {
        v.quantityInput.value = current;
        used.add(current);
        return;
      }
      let candidate = generateQuantitySymbol(index);
      let safetyIndex = index;
      while (used.has(candidate)) candidate = generateQuantitySymbol(++safetyIndex);
      v.quantityInput.value = candidate;
      used.add(candidate);
    });
  }

  /* ─── قرارداد واحدها و پوشش پرووایدرها ─────────────────────────────
     این واحدها واحد خروجی «وب‌سرویس حجره» هستند، نه الزاماً واحد خام
     صفحهٔ منبع. تبدیل‌هایی مثل ریال→تومان، ۱۰۰ ین→۱ ین و تن→کیلوگرم
     باید در Collector مرکزی انجام شوند تا فرمول مشتری همیشه یک معنا داشته
     باشد. پرووایدرها فقط وقتی در UI نمایش داده می‌شوند که آن متغیر را روی
     یک صفحه/خروجی مشخص مشاهده و قابل‌تفکیک کرده باشیم.
  ─────────────────────────────────────────────────────────────────── */
  const itemDefaultUnit = {
    // ارزها — همه عدد
    "USD": "عدد", "EUR": "عدد", "AED": "عدد", "TRY": "عدد",
    "GBP": "عدد", "CNY": "عدد", "JPY": "عدد", "CAD": "عدد",
    "AUD": "عدد", "CHF": "عدد", "SGD": "عدد", "HKD": "عدد",
    "AZN": "عدد", "GEL": "عدد", "KWD": "عدد", "BHD": "عدد",
    "OMR": "عدد", "QAR": "عدد", "SAR": "عدد", "RUB": "عدد",
    "INR": "عدد", "PKR": "عدد", "SEK": "عدد", "NOK": "عدد",
    "DKK": "عدد", "NZD": "عدد", "MYR": "عدد", "KRW": "عدد",
    "AMD": "عدد", "AFN": "عدد", "IQD": "عدد", "KGS": "عدد",
    "TJS": "عدد", "TMT": "عدد", "ARS": "عدد", "BRL": "عدد", "SYP": "عدد", "THB": "عدد",
    // طلاجات
    "XAU_OZ": "انس تروا",
    "MITHQAL": "مثقال",
    "GOLD_18K": "گرم",
    "GOLD_20K": "گرم",
    "GOLD_21K": "گرم",
    "GOLD_24K": "گرم",
    "GOLD_MOLTEN_CASH": "مثقال",
    "GOLD_18K_750": "گرم",
    "GOLD_18K_740": "گرم",
    "GOLD_SECONDHAND": "گرم",
    "GOLD_BAR": "گرم",
    "GOLD_MOLTEN_WS": "مثقال",
    "GOLD_SUB_KILO": "مثقال",
    "MITHQAL_17": "مثقال",
    "MITHQAL_COIN": "مثقال",
    "MITHQAL_NO_BUBBLE": "مثقال",
    "BUBBLE_TRANSFER": "مثقال",
    // نقره
    "SILVER": "انس تروا",
    "SILVER_999": "گرم",
    "SILVER_925": "گرم",
    // سکه‌ها — همه عدد
    "EMAMI": "عدد", "BAHAR": "عدد", "HALF_COIN": "عدد", "QUARTER_COIN": "عدد",
    "GRAM_COIN": "عدد", "PARSIAN_1G": "عدد",
    "RETAIL_EMAMI": "عدد", "RETAIL_BAHAR": "عدد",
    "RETAIL_HALF": "عدد", "RETAIL_QUARTER": "عدد", "RETAIL_GRAM": "عدد",
    "EMAMI_86": "عدد", "EMAMI_PRE86": "عدد",
    "HALF_86": "عدد", "HALF_PRE86": "عدد",
    "QUARTER_86": "عدد", "QUARTER_PRE86": "عدد",
    // فلزات
    "COPPER": "کیلوگرم", "ALUMINIUM": "کیلوگرم", "NICKEL": "کیلوگرم",
    "ZINC": "کیلوگرم", "LEAD": "کیلوگرم", "TIN": "کیلوگرم",
    "COBALT": "کیلوگرم", "PLATINUM": "گرم", "PALLADIUM": "گرم",
    // انرژی
    "OIL": "بشکه", "OIL_BRENT": "بشکه", "OIL_OPEC": "بشکه",
    "GAS": "میلیون بی‌تی‌یو", "GASOLINE": "گالن", "GASOIL": "تن متریک",
    "HEATING_OIL": "گالن", "LNG": "میلیون بی‌تی‌یو", "COAL": "تن متریک"
  };

  const providerCatalog = {
    tgju:      { label: 'TGJU', note: 'HTML عمومی و صفحات شاخص' },
    navasan:   { label: 'نوسان', note: 'ویجت رسمی رایگان وردپرس' },
    alanchand: { label: 'الان‌چند', note: 'HTML عمومی' },
    iranjib:   { label: 'ایران‌جیب', note: 'جدول‌های عمومی نرخ' },
    estjt:     { label: 'اتحادیه طلا تهران', note: 'جدول عمومی' },
    ayaar:     { label: 'عیار', note: 'جدول عمومی' },
    zarwan:    { label: 'زروان', note: 'HTML و JSON عمومی صفحه' },
    tgn:       { label: 'تابان گوهر نفیس', note: 'وب‌سرویس ارائه‌دهنده' },
    tala:      { label: 'Tala.ir', note: 'وب‌سرویس و جدول عمومی' }
  };

  const providerCoverage = {
    tgju: new Set(`USD EUR AED GBP TRY CHF CNY JPY KRW CAD AUD NZD SGD INR PKR IQD SYP AFN DKK SEK NOK SAR QAR OMR KWD BHD MYR THB HKD RUB AZN AMD GEL KGS TJS TMT GOLD_18K_750 GOLD_18K_740 GOLD_24K GOLD_SECONDHAND MITHQAL MITHQAL_NO_BUBBLE BUBBLE_TRANSFER MITHQAL_COIN GOLD_MOLTEN_CASH GOLD_MOLTEN_WS GOLD_SUB_KILO SILVER_925 SILVER_999 SILVER XAU_OZ EMAMI BAHAR HALF_COIN QUARTER_COIN GRAM_COIN RETAIL_EMAMI RETAIL_BAHAR RETAIL_HALF RETAIL_QUARTER RETAIL_GRAM ALUMINIUM LEAD ZINC COPPER NICKEL COBALT TIN OIL GASOLINE HEATING_OIL GAS OIL_BRENT GASOIL COAL OIL_OPEC LNG`.split(' ')),
    iranjib: new Set(`USD EUR AED MITHQAL SILVER XAU_OZ GOLD_18K EMAMI BAHAR HALF_COIN QUARTER_COIN GRAM_COIN ALUMINIUM LEAD ZINC COPPER NICKEL TIN PLATINUM PALLADIUM OIL GASOLINE GAS OIL_BRENT`.split(' ')),
    navasan: new Set(`USD EUR AED GBP TRY CHF CNY JPY CAD AUD NZD SGD INR PKR AFN DKK SEK NOK OMR KWD MYR THB RUB AZN BRL MITHQAL GOLD_MOLTEN_CASH GOLD_18K EMAMI BAHAR HALF_COIN QUARTER_COIN GRAM_COIN`.split(' ')),
    alanchand: new Set(`USD EUR AED GBP TRY CHF CNY JPY KRW CAD AUD NZD SGD INR PKR IQD SYP AFN DKK SEK NOK SAR QAR OMR KWD BHD MYR THB HKD RUB AZN AMD GEL KGS TJS TMT BRL ARS MITHQAL SILVER XAU_OZ GOLD_18K EMAMI BAHAR HALF_COIN QUARTER_COIN GRAM_COIN`.split(' ')),
    tgn: new Set(`USD EUR AED GOLD_18K_740 GOLD_SECONDHAND SILVER_925 SILVER_999 XAU_OZ GOLD_18K GOLD_20K GOLD_21K EMAMI BAHAR HALF_COIN QUARTER_COIN GRAM_COIN`.split(' ')),
    tala: new Set(`AED TRY OMR GOLD_18K_740 GOLD_24K MITHQAL_17 GOLD_BAR GOLD_18K EMAMI BAHAR HALF_COIN QUARTER_COIN GRAM_COIN PARSIAN_1G`.split(' ')),
    estjt: new Set(`GOLD_24K MITHQAL XAU_OZ GOLD_18K EMAMI BAHAR HALF_COIN QUARTER_COIN GRAM_COIN`.split(' ')),
    ayaar: new Set(`MITHQAL XAU_OZ GOLD_18K EMAMI BAHAR HALF_COIN QUARTER_COIN GRAM_COIN`.split(' ')),
    zarwan: new Set(`USD EUR AED GBP TRY CHF CNY JPY CAD AUD SGD INR IQD AFN DKK SEK NOK SAR QAR OMR KWD BHD MYR THB HKD RUB AZN AMD BAHAR GRAM_COIN EMAMI_86 HALF_86 QUARTER_86 EMAMI_PRE86 HALF_PRE86 QUARTER_PRE86`.split(' '))
  };

  function providersForItem(id) {
    return Object.keys(providerCatalog).filter(providerId => providerCoverage[providerId]?.has(id));
  }

  const intervalStops = [
    ['1m', 'هر ۱ دقیقه'],
    ['5m', 'هر ۵ دقیقه'],
    ['10m', 'هر ۱۰ دقیقه'],
    ['30m', 'هر ۳۰ دقیقه'],
    ['1h', 'هر ۱ ساعت'],
    ['2h', 'هر ۲ ساعت'],
    ['3h', 'هر ۳ ساعت'],
    ['12h', 'هر ۱۲ ساعت'],
    ['1d', 'هر ۱ روز'],
    ['2d', 'هر ۲ روز'],
    ['3d', 'هر ۳ روز'],
    ['1w', 'هر ۱ هفته']
  ];

  function intervalOptions(selectedValue = '1m') {
    return intervalStops.map(([value, label]) =>
      `<option value="${value}"${value === selectedValue ? ' selected' : ''}>${label}</option>`
    ).join('');
  }

  function providerOptions(item) {
    const ids = providersForItem(item.id);
    if (!ids.length) {
      return '<option value="" selected>فعلاً منبع نقدی تأییدنشده</option>';
    }
    const options = ['<option value="auto" selected>خودکار (بهترین منبع در دسترس)</option>'];
    ids.forEach(id => {
      const provider = providerCatalog[id];
      options.push(`<option value="${id}">${provider.label}</option>`);
    });
    return options.join('');
  }

  function sourceModeOptions() {
    return '<option value="api">دریافت خودکار</option><option value="manual">ورود دستی</option>';
  }

  /* ─── دیتای دسته‌بندی‌های موجود در مودال ─── */
  const apiData = {
    "ارزها": [
      { name: "دلار آمریکا",          id: "USD" },
      { name: "یورو",                  id: "EUR" },
      { name: "درهم امارات",          id: "AED" },
      { name: "لیر ترکیه",            id: "TRY" },
      { name: "پوند انگلیس",         id: "GBP" },
      { name: "یوان چین",             id: "CNY" },
      { name: "ین ژاپن",              id: "JPY" },
      { name: "دلار کانادا",          id: "CAD" },
      { name: "دلار استرالیا",        id: "AUD" },
      { name: "فرانک سوئیس",         id: "CHF" },
      { name: "دلار سنگاپور",        id: "SGD" },
      { name: "دلار هنگ کنگ",        id: "HKD" },
      { name: "منات آذربایجان",       id: "AZN" },
      { name: "لاری گرجستان",        id: "GEL" },
      { name: "دینار کویت",          id: "KWD" },
      { name: "دینار بحرین",         id: "BHD" },
      { name: "ریال عمان",            id: "OMR" },
      { name: "ریال قطر",             id: "QAR" },
      { name: "ریال عربستان",        id: "SAR" },
      { name: "روبل روسیه",          id: "RUB" },
      { name: "روپیه هند",            id: "INR" },
      { name: "روپیه پاکستان",       id: "PKR" },
      { name: "کرون سوئد",           id: "SEK" },
      { name: "کرون نروژ",           id: "NOK" },
      { name: "کرون دانمارک",        id: "DKK" },
      { name: "دلار نیوزلند",        id: "NZD" },
      { name: "رینگیت مالزی",        id: "MYR" },
      { name: "وون کره جنوبی",       id: "KRW" },
      { name: "درام ارمنستان",       id: "AMD" },
      { name: "افغانی افغانستان",    id: "AFN" },
      { name: "دینار عراق",          id: "IQD" },
      { name: "سوم قرقیزستان",       id: "KGS" },
      { name: "سامانی تاجیکستان",   id: "TJS" },
      { name: "منات ترکمنستان",      id: "TMT" },
      { name: "پزوی آرژانتین",       id: "ARS" },
      { name: "رئال برزیل",          id: "BRL" },
      { name: "پوند سوریه",          id: "SYP" },
      { name: "بات تایلند",          id: "THB" }
    ],
    "طلاجات": [
      { name: "اونس جهانی طلا",               id: "XAU_OZ" },
      { name: "مثقال طلا (مظنه بازار)",       id: "MITHQAL" },
      { name: "طلای 18 عیار",                 id: "GOLD_18K" },
      { name: "طلای 20 عیار",                 id: "GOLD_20K" },
      { name: "طلای 21 عیار",                 id: "GOLD_21K" },
      { name: "طلای 24 عیار",                 id: "GOLD_24K" },
      { name: "آبشده نقدی",                   id: "GOLD_MOLTEN_CASH" },
      { name: "طلای 18 عیار / 750",           id: "GOLD_18K_750" },
      { name: "طلای 18 عیار / 740",           id: "GOLD_18K_740" },
      { name: "طلای دست دوم",                 id: "GOLD_SECONDHAND" },
      { name: "شمش گرمی",                     id: "GOLD_BAR" },
      { name: "آبشده بنکداری",                id: "GOLD_MOLTEN_WS" },
      { name: "آبشده کمتر از کیلو",          id: "GOLD_SUB_KILO" },
      { name: "مثقال طلای ۱۷ عیار",           id: "MITHQAL_17" },
      { name: "مثقال / بر مبنای سکه",        id: "MITHQAL_COIN" },
      { name: "مثقال / بدون حباب",            id: "MITHQAL_NO_BUBBLE" },
      { name: "حباب آبشده",                   id: "BUBBLE_TRANSFER" }
    ],
    "نقره‌جات": [
      { name: "اونس جهانی نقره", id: "SILVER" },
      { name: "گرم نقره 999",  id: "SILVER_999" },
      { name: "گرم نقره 925",  id: "SILVER_925" }
    ],
    "سکه‌ها": [
      { name: "سکه امامی",               id: "EMAMI" },
      { name: "سکه بهار آزادی",         id: "BAHAR" },
      { name: "نیم سکه",                 id: "HALF_COIN" },
      { name: "ربع سکه",                 id: "QUARTER_COIN" },
      { name: "سکه گرمی",               id: "GRAM_COIN" },
      { name: "سکه پارسیان 1 گرمی",    id: "PARSIAN_1G" },
      { name: "سکه امامی تک فروشی",    id: "RETAIL_EMAMI" },
      { name: "سکه بهار آزادی تک فروشی", id: "RETAIL_BAHAR" },
      { name: "نیم سکه تک فروشی",      id: "RETAIL_HALF" },
      { name: "ربع سکه تک فروشی",      id: "RETAIL_QUARTER" },
      { name: "سکه گرمی تک فروشی",     id: "RETAIL_GRAM" },
      { name: "سکه امامی 86",           id: "EMAMI_86" },
      { name: "سکه امامی قبل 86",       id: "EMAMI_PRE86" },
      { name: "نیم سکه 86",             id: "HALF_86" },
      { name: "نیم سکه قبل 86",         id: "HALF_PRE86" },
      { name: "ربع سکه 86",             id: "QUARTER_86" },
      { name: "ربع سکه قبل 86",         id: "QUARTER_PRE86" }
    ],
    "فلزات": [
      { name: "مس",          id: "COPPER" },
      { name: "آلومینیوم",  id: "ALUMINIUM" },
      { name: "نیکل",        id: "NICKEL" },
      { name: "روی",         id: "ZINC" },
      { name: "سرب",         id: "LEAD" },
      { name: "قلع",         id: "TIN" },
      { name: "کبالت",       id: "COBALT" },
      { name: "پلاتین",      id: "PLATINUM" },
      { name: "پالادیوم",    id: "PALLADIUM" }
    ],
    "انرژی": [
      { name: "نفت خام",          id: "OIL" },
      { name: "نفت برنت",         id: "OIL_BRENT" },
      { name: "نفت اوپک",         id: "OIL_OPEC" },
      { name: "گاز طبیعی",        id: "GAS" },
      { name: "بنزین",             id: "GASOLINE" },
      { name: "گازوئیل",          id: "GASOIL" },
      { name: "نفت کوره",         id: "HEATING_OIL" },
      { name: "LNG ژاپن / کره",  id: "LNG" },
      { name: "زغال‌سنگ",         id: "COAL" }
    ]
  };

  /* ─── آیکون SVG اختصاصی هر دسته‌بندی ─── */
  const categoryIcons = {
    "ارزها": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="240 65 90 65" fill="#2ecc71"><path d="M247.958,68.596v38.86h74.852v-38.86H247.958z M258.421,73.454h53.935c-0.157,0.389-0.24,0.797-0.24,1.214 c0,2.011,1.796,3.643,4.01,3.643c0.459,0,0.908-0.076,1.337-0.209V97.96c-0.428-0.142-0.877-0.218-1.337-0.218 c-2.214,0-4.01,1.632-4.01,3.643c0,0.417,0.084,0.825,0.24,1.214h-53.935c0.146-0.389,0.23-0.797,0.23-1.214 c0-2.011-1.796-3.643-4.01-3.643c-0.459,0-0.908,0.076-1.337,0.218V78.102c0.428,0.133,0.877,0.209,1.337,0.209 c2.214,0,4.01-1.632,4.01-3.643C258.651,74.251,258.567,73.843,258.421,73.454z M285.384,78.311c-5.91,0-10.693,4.345-10.693,9.715 v2.429h0.543c1.201,4.155,5.19,7.286,10.15,7.286s8.949-3.131,10.15-7.286h0.543v-2.429 C296.077,82.656,291.294,78.311,285.384,78.311z M285.384,83.169c3.185,0,5.347,1.964,5.347,4.858c0,2.894-2.162,4.858-5.347,4.858 s-5.347-1.964-5.347-4.858C280.037,85.133,282.199,83.169,285.384,83.169z M266.671,84.383c-2.214,0-4.01,1.632-4.01,3.643 c0,2.011,1.796,3.643,4.01,3.643s4.01-1.632,4.01-3.643C270.681,86.015,268.885,84.383,266.671,84.383z M304.097,84.383c-2.214,0-4.01,1.632-4.01,3.643c0,2.011,1.796,3.643,4.01,3.643s4.01-1.632,4.01-3.643 C308.107,86.015,306.31,84.383,304.097,84.383z M247.958,109.885v4.858h2.684c0,0,38.324-0.095,66.143,6.603l3.352,0.797v-12.258 h-5.347v2.647c-0.428-0.142-0.877-0.218-1.337-0.218c-1.807,0-3.394,1.11-3.874,2.694c-27.464-5.152-58.916-5.123-58.948-5.123 H247.958z"/></svg>`,
    "طلاجات": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="255 250 55 45" fill="#f1c40f"><path d="M276.192,256.083l-3.986,6.975v2.085h-2.603l-3.986,6.975v2.085h-2.603l-3.986,6.975v5.38h13.179h3.295h9.884h3.295h13.179 h9.884v-5.331l-3.924-7.024h-2.666v-2.037l-3.924-7.024h-2.666v-2.037l-3.924-7.024h-10.902H276.192z M278.103,259.377h4.678 l2.603,4.556v1.21h-2.603h-4.678h-0.956H275.5v-1.21L278.103,259.377z M271.513,268.438h0.692h3.986l2.603,4.556v1.21h-2.603h-4.678 h-0.956h-1.647v-1.21L271.513,268.438z M284.692,268.438h3.986h0.692l2.603,4.556v1.21h-7.281h-0.956h-1.647v-1.21L284.692,268.438z M264.924,277.498h0.692h3.986l2.603,4.556v1.21h-9.884v-1.21L264.924,277.498z M278.103,277.498h0.692h3.986l2.603,4.556v1.21 H275.5v-1.21L278.103,277.498z M291.281,277.498h3.986h0.692l2.603,4.556v1.21h-9.884v-1.21L291.281,277.498z"/></svg>`,
    "نقره‌جات": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="255 250 55 45" fill="#a6b8c7"><path d="M276.192,256.083l-3.986,6.975v2.085h-2.603l-3.986,6.975v2.085h-2.603l-3.986,6.975v5.38h13.179h3.295h9.884h3.295h13.179 h9.884v-5.331l-3.924-7.024h-2.666v-2.037l-3.924-7.024h-2.666v-2.037l-3.924-7.024h-10.902H276.192z M278.103,259.377h4.678 l2.603,4.556v1.21h-2.603h-4.678h-0.956H275.5v-1.21L278.103,259.377z M271.513,268.438h0.692h3.986l2.603,4.556v1.21h-2.603h-4.678 h-0.956h-1.647v-1.21L271.513,268.438z M284.692,268.438h3.986h0.692l2.603,4.556v1.21h-7.281h-0.956h-1.647v-1.21L284.692,268.438z M264.924,277.498h0.692h3.986l2.603,4.556v1.21h-9.884v-1.21L264.924,277.498z M278.103,277.498h0.692h3.986l2.603,4.556v1.21 H275.5v-1.21L278.103,277.498z M291.281,277.498h3.986h0.692l2.603,4.556v1.21h-9.884v-1.21L291.281,277.498z"/></svg>`,
    "سکه‌ها": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="255 315 65 65" fill="#e67e22"><path d="M316.803,349.74c0,2.05-6.01,4.915-15.796,4.915c-2.389,0-4.673-0.18-6.802-0.528c0.035-0.194,0.075-0.383,0.075-0.581 v-5.597c2.13,0.326,4.382,0.497,6.727,0.497c6.125,0,12.513-1.236,15.796-3.573V349.74z M292.027,353.546 c0,2.042-5.988,4.897-15.738,4.897s-15.734-2.851-15.734-4.897v-4.84c3.274,2.328,9.631,3.555,15.734,3.555 s12.461-1.228,15.738-3.555V353.546z M260.554,357.137c3.278,2.328,9.636,3.56,15.734,3.56c6.103,0,12.461-1.232,15.738-3.56v4.84 c0,2.046-5.988,4.897-15.738,4.897c-9.746,0-15.734-2.851-15.734-4.897V357.137z M316.803,332.818c0,2.05-6.01,4.915-15.796,4.915 c-9.785,0-15.796-2.864-15.796-4.915v-4.866c3.282,2.336,9.667,3.573,15.796,3.573c6.125,0,12.513-1.236,15.796-3.573V332.818z M301.007,319.438c9.785,0,15.796,2.864,15.796,4.915c0,2.05-6.01,4.919-15.796,4.919c-9.785,0-15.796-2.864-15.796-4.919 C285.211,322.302,291.217,319.438,301.007,319.438z M285.211,336.409c3.282,2.341,9.667,3.577,15.796,3.577 c6.125,0,12.513-1.236,15.796-3.577v4.871c0,2.05-6.01,4.915-15.796,4.915c-2.345,0-4.673-0.189-6.798-0.532 c0.031-0.18,0.07-0.356,0.07-0.546c0-3.018-3.929-5.126-9.068-6.239V336.409z M276.288,340.219c9.75,0,15.738,2.851,15.738,4.897 c0,2.042-5.988,4.893-15.738,4.893s-15.734-2.851-15.734-4.893C260.554,343.07,266.542,340.219,276.288,340.219z M276.288,375.304 c-9.746,0-15.734-2.851-15.734-4.897v-4.84c3.274,2.328,9.631,3.56,15.734,3.56s12.461-1.232,15.738-3.56v4.84 C292.027,372.453,286.038,375.304,276.288,375.304z M301.007,363.116c-2.376,0-4.66-0.18-6.807-0.528 c0.04-0.202,0.079-0.4,0.079-0.612v-5.562c2.121,0.321,4.378,0.493,6.727,0.493c6.125,0,12.513-1.236,15.796-3.573v4.866 C316.803,360.252,310.792,363.116,301.007,363.116z"/></svg>`,
    "فلزات": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="245 135 65 55" fill="#2c3e50"><path d="M267.804,141.453c-2.741,0-4.961,2.22-4.961,4.962v14.885c0,2.741,2.22,4.962,4.961,4.962h29.769 c19.781,0,24.662-21.474,24.662-21.474l-0.005-0.01c0.099-0.27,0.149-0.555,0.15-0.843c0-1.37-1.111-2.481-2.481-2.481H267.804z M250.439,148.895c-1.37,0-2.481,1.111-2.481,2.481c0.001,0.424,0.111,0.842,0.32,1.211l-0.005,0.01c0,0,3.366,6.221,9.608,6.221 v-9.923H250.439z M277.727,171.222c0,0-2.481,7.442-7.442,7.442c-1.37-0.019-2.496,1.076-2.516,2.446 c-0.019,1.37,1.076,2.496,2.446,2.516c0.023,0,0.047,0,0.07,0h12.404c0.707,0,1.38-0.301,1.851-0.829c0,0,1.866-1.652,3.111-1.652 c1.245,0,3.111,1.652,3.111,1.652c0.471,0.527,1.144,0.829,1.851,0.829h12.404c1.37,0.019,2.496-1.076,2.516-2.446 c0.019-1.37-1.076-2.496-2.446-2.516c-0.023,0-0.047,0-0.07,0c-4.961,0-7.442-7.442-7.442-7.442H277.727z"/></svg>`,
    "انرژی": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 352.456 384.003" fill="#e74c3c"><path d="M16.228,0a16,16,0,0,0-.453,32q.226,0,.453,0v80a16,16,0,0,0-.453,32q.226,0,.453,0v96a16,16,0,0,0-.453,32q.226,0,.453,0v80a16,16,0,0,0-.453,32q.226,0,.453,0h320a16,16,0,1,0,.452-32c-.15,0-.3,0-.452,0V272a16,16,0,1,0,.452-32c-.15,0-.3,0-.452,0V144a16,16,0,0,0,.452-32c-.15,0-.3,0-.452,0V32a16,16,0,0,0,.452-32c-.15,0-.3,0-.452,0h-320Zm160,96s64,76.656,64,112a64,64,0,1,1-128,0C112.228,172.656,176.228,96,176.228,96Z" transform="translate(0 0.002)"/></svg>`
  };

  /* ─── MODAL LOGIC ─── */
  const modal = document.getElementById('apiModal');
  const openBtn = document.getElementById('openApiModalBtn');
  const closeBtn = document.getElementById('closeApiModalBtn');
  const searchBtn = document.getElementById('apiSearchBtn');
  const slider = document.getElementById('apiSlider');
  const paneCategories = document.getElementById('paneCategories');
  const itemsContainer = document.getElementById('itemsContainer');
  const backBtn = document.getElementById('apiBackBtn');
  const searchInput = document.getElementById('apiSearchInput');

  if (!modal || !openBtn) return;

  /* ─── مدیریت حالت سرچ در هدر ─── */
  let isSearchMode = false;

  function enterSearchMode() {
    isSearchMode = true;
    modal.classList.add('search-active');
    searchInput.value = '';
    // فوکوس با تأخیر کوچک برای اینکه انیمیشن CSS اول بره
    setTimeout(() => searchInput.focus(), 320);
  }

  function exitSearchMode() {
    isSearchMode = false;
    modal.classList.remove('search-active');
    searchInput.value = '';
    // برگشت به صفحه دسته‌بندی‌ها
    slideTo(1);
  }

  searchBtn?.addEventListener('click', () => {
    enterSearchMode();
  });

  function renderCategories() {
    paneCategories.innerHTML = '';
    for (let cat in apiData) {
      const div = document.createElement('div');
      div.className = 'api-cat-box';
      const catIcon = categoryIcons[cat] || '';
      div.innerHTML = `
        <div class="api-cat-title-wrap">
          <span class="api-cat-brand-icon">${catIcon}</span>
          <span class="api-cat-title">${cat}</span>
        </div>
        <span class="api-cat-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg></span>
      `;
      div.addEventListener('click', () => openCategory(cat));
      paneCategories.appendChild(div);
    }
  }

  /* ─── بررسی وجود آکاردئون با این شناسه در لیست API (آیتم‌های پنهان نادیده گرفته می‌شوند) ─── */
  function isAlreadyAdded(id) {
    const allItems = document.querySelectorAll('#apiVariablesList .accordion-item[data-type="api-variable"]');
    for (const item of allItems) {
      if (item.style.display === 'none') continue; // آیتم پنهان‌شده = موجود نیست
      // بررسی از طریق data-id
      if (item.dataset.apiSymbol === id || item.dataset.id === id) return true;
      // بررسی از طریق مقدار شناسه انگلیسی (fallback برای آیتم‌هایی که data-id متفاوت دارند)
      const idInput = item.querySelector('.english-id-input');
      if (idInput && idInput.value.trim() === id) return true;
    }
    return false;
  }

  /* ─── ساخت HTML آکاردئون برای متغیر API جدید ─── */
  function createAccordionItem(item) {
    const dragSVG = `<svg viewBox="0 0 16 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><circle cx="4" cy="4" r="2"/><circle cx="12" cy="4" r="2"/><circle cx="4" cy="12" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="4" cy="20" r="2"/><circle cx="12" cy="20" r="2"/></svg>`;
    // ساختار دو-لایه (eye-full-icon + eye-slashed-icon) عمداً همینطور نگه داشته شده
    // چون assets/css/icon-hover-anim.css دقیقاً همین دو span را برای انیمیشن
    // هاور (پاپ‌این چشم کامل → فید و خط‌کشیِ چشم خط‌خورده) هدف قرار می‌دهد؛
    // یک svg تخت مثل قبل باعث می‌شد این آیتم‌های تازه‌ساخته‌شده هیچ انیمیشنی نداشته باشند.
    const hideSVG = `<span class="eye-full-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg></span><span class="eye-slashed-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg></span>`;
    const chevronSVG = `<svg class="chevron-down" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
    const arrowSVG = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

    // تعیین واحد شمارش پیش‌فرض بر اساس شناسه
    const defaultUnit = itemDefaultUnit[item.id] || 'عدد';
    const el = document.createElement('div');
    el.className = 'accordion-item';
    el.setAttribute('draggable', 'false');
    el.setAttribute('data-id', item.id);
    el.setAttribute('data-type', 'api-variable');
    el.setAttribute('data-api-symbol', item.id);
    el.setAttribute('data-unit', defaultUnit);

    el.innerHTML = `
      <div class="accordion-header">
        <div class="acc-drag-handle" title="جابجایی">${dragSVG}</div>
        <label class="acc-switch" title="فعال/غیرفعال">
          <input type="checkbox" />
          <span class="acc-switch-inner"></span>
        </label>
        <div class="acc-title-area">
          <span class="acc-name">${item.name}</span>
        </div>
        <div class="acc-left-actions">
          <button class="acc-action-btn acc-hide-btn" title="پنهان‌سازی">${hideSVG}</button>
          <button class="acc-toggle-btn" aria-label="باز/بسته کردن" title="باز/بسته کردن">${chevronSVG}</button>
        </div>
      </div>
      <div class="accordion-body">
        <div class="accordion-body-inner">
          <div class="form-grid">
            <div class="form-group">
              <span class="form-label">نام متغیر</span>
              <input type="text" class="form-control var-name-input" value="${item.name}" />
            </div>
            <div class="form-group english-id-group">
              <span class="form-label">شناسه انگلیسی (فرمول)</span>
              <input type="text" class="form-control english-id-input" value="${item.id}" placeholder="مثلاً USD" />
            </div>
            <div class="form-group quantity-symbol-group">
              <span class="form-label">نشانه متغیر تعداد</span>
              <input type="text" class="form-control quantity-symbol-input" value="" placeholder="a" readonly />
            </div>
            <div class="form-group">
              <span class="form-label">منبع قیمت</span>
              <div class="select-wrap">
                <select class="form-control api-price-source-select">${sourceModeOptions()}</select>
                <span class="select-arrow">${arrowSVG}</span>
              </div>
            </div>
            <div class="form-group api-only-field">
              <span class="form-label">بازه بررسی</span>
              <div class="select-wrap">
                <select class="form-control api-interval-select" data-custom-select-mode="range" aria-label="بازه بررسی">${intervalOptions()}</select>
                <span class="select-arrow">${arrowSVG}</span>
              </div>
            </div>
            <div class="form-group api-only-field">
              <span class="form-label">منبع API</span>
              <div class="select-wrap">
                <select class="form-control api-provider-select">${providerOptions(item)}</select>
                <span class="select-arrow">${arrowSVG}</span>
              </div>
            </div>
            <div class="form-group manual-only-field" style="display:none;">
              <span class="form-label">مبلغ فعلی</span>
              <input type="text" class="form-control var-default-price" value="" />
            </div>
            <div class="form-group">
              <span class="form-label">حداقل قیمت</span>
              <input type="text" class="form-control" value="" />
            </div>
            <div class="form-group">
              <span class="form-label dynamic-wage-label">اجرت به ازای هر یک ${defaultUnit}</span>
              <input type="text" class="form-control ojrat-input" value="۰" />
            </div>
            <div class="form-group api-only-field">
              <span class="form-label">آخرین مبلغ اعلام شده</span>
              <button class="last-price">—</button>
            </div>
            <div class="form-group api-only-field">
              <span class="form-label">تست اتصال</span>
              <button class="btn-test-conn">بررسی اتصال به وب سرویس</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // دکمه پنهان‌سازی مخصوص متغیرهای API است و جزو pipeline مشترک نیست،
    // پس همچنان به صورت اختصاصی وصل می‌شود.
    attachApiHideEvents(el.querySelector('.acc-hide-btn'));

    /* ─── HYDRATION BRIDGE ───────────────────────────────────────────
       به‌جای سیم‌کشی دستیِ ایزوله (که باعث می‌شد آیتم تازه‌ساخته‌شده نیمه‌کاره
       بماند و درگ هندل، اعتبارسنجی سوییچ، dirty tracking و sync نام/واحد را
       نداشته باشد)، آیتم را از کنترلر مرکزی و مشترک hydrate عبور می‌دهیم تا
       دقیقاً مثل سایر آکاردئون‌ها وارد چرخه‌ی حیات شیء شود:
         - اتصال drag handle به startDrag (مشکل ۱)
         - attachAccordionEvents / attachSwitchValidationAndLock
         - attachNameUpdateEvents / attachUnitLabelSync
         - initDirtyTracking و سایر guardها
    ──────────────────────────────────────────────────────────────────── */
    if (settingsPanel?.hydrateAccordionItem) {
      settingsPanel.hydrateAccordionItem(el, { type: 'api-variable' });
    } else {
      // fallback دفاعی: اگر pipeline مشترک هنوز در دسترس نیست، حداقل toggle را وصل کن
      const header = el.querySelector('.accordion-header');
      header?.addEventListener('click', function (e) {
        if (
          e.target.closest('.acc-drag-handle') ||
          e.target.closest('.acc-switch') ||
          e.target.closest('.acc-action-btn')
        ) return;
        el.classList.toggle('open');
      });
    }

    return el;
  }

  /* ─── اضافه کردن آیتم به لیست آکاردئون‌های API ─── */
  function addToApiList(item, rowEl) {
    if (isAlreadyAdded(item.id)) {
      rowEl.classList.add('api-item-already');
      if (typeof showToast === 'function') {
        showToast(`«${item.name}» قبلاً به لیست اضافه شده است.`, 'yellow');
      }
      return;
    }

    const list = document.getElementById('apiVariablesList');
    if (!list) return;

    const newItem = createAccordionItem(item);

    // انیمیشن ورود
    newItem.style.opacity = '0';
    newItem.style.transform = 'translateY(-8px)';
    list.appendChild(newItem);
    settingsPanel.refreshAccordionEmptyState?.(list);

    requestAnimationFrame(() => {
      newItem.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      newItem.style.opacity = '1';
      newItem.style.transform = 'translateY(0)';
    });

    // باز کردن آکاردئون جدید
    setTimeout(() => {
      newItem.classList.add('open');
      newItem.style.transition = '';
      // پاک‌سازی استایل‌های inline انیمیشن ورود.
      // مقدار inline ‌`opacity:1` بر قانون کلاسی `.accordion-item.dragging { opacity:0.5 }`
      // اولویت دارد و باعث می‌شد آیتم API هنگام درگ، حالت کم‌رنگ بصری را نگیرد.
      // با حذف این inline styleها، آیتم به همان رفتار CSS سایر آکاردئون‌ها برمی‌گردد.
      newItem.style.opacity = '';
      newItem.style.transform = '';
    }, 320);

    // بروزرسانی quantity symbols
    updateApiQuantitySymbols();
    pricingPatterns.refreshFormulaAfterSettingsChange?.();

    // اعمال پسوند تومان روی ورودی‌های قیمت آکاردئون جدید
    settingsPanel.wrapPriceInputsWithToman?.(newItem);

    // تسک ۳: انیمیشن + → تیک (CSS transition — بدون layout shift)
    rowEl.classList.add('adding');
    rowEl.style.pointerEvents = 'none';

    setTimeout(() => {
      rowEl.classList.remove('adding');
      rowEl.classList.add('api-item-added');
    }, 300);

    if (typeof showToast === 'function') {
      showToast(`«${item.name}» به متغیرهای وابسته به API اضافه شد.`, 'green');
    }

    // بستن مودال با تأخیر کوتاه (بعد از اتمام انیمیشن تیک)
    setTimeout(() => {
      modal.classList.remove('active');
      modal.classList.remove('in-category');
      modal.classList.remove('search-active');
      isSearchMode = false;
    }, 560);

    // اسکرول به آیتم جدید بعد از بستن مودال
    setTimeout(() => {
      newItem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 700);
  }

  function renderItems(itemsArray) {
    itemsContainer.innerHTML = '';
    if (itemsArray.length === 0) {
      itemsContainer.innerHTML = `
        <div class="api-empty-state">
          <svg class="api-empty-icon" viewBox="0 0 480 480"><path d="M192,0C86.246,0,0,86.246,0,192S86.246,384,192,384a190.988,190.988,0,0,0,126.8-48.234l17.2,17.2V384l96,96,48-48-96-96H352.969l-17.2-17.2A190.988,190.988,0,0,0,384,192C384,86.246,297.754,0,192,0Zm0,48A144,144,0,1,1,48,192,143.638,143.638,0,0,1,192,48Zm-72,96a24,24,0,1,0,24,24A24,24,0,0,0,120,144Zm144,0a24,24,0,1,0,24,24A24,24,0,0,0,264,144Zm-72,71.906a143.616,143.616,0,0,0-83.531,26.578l27.89,39.094c32.661-23.329,78.574-23.329,111.235,0l27.89-39.094A143.474,143.474,0,0,0,192,215.906Z" fill="#d0d0d0"/></svg>
          <div class="api-empty-title">نتیجه‌ای یافت نشد</div>
          <div class="api-empty-desc">جستجوی شما با هیچ متغیری مطابقت ندارد.</div>
        </div>
      `;
      return;
    }
    itemsArray.forEach(item => {
      const div = document.createElement('div');
      div.className = 'api-item-row';
      const already = isAlreadyAdded(item.id);
      div.innerHTML = `
        <span class="api-item-content">
          <span class="api-item-name">${item.name}</span>
        </span>
        <div class="api-item-row-end">
          <span class="api-item-id">${item.id}</span>
          <span class="api-item-icon-wrap">
            <span class="api-item-check${already ? '' : ' hidden'}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg>
            </span>
            <span class="api-item-plus${already ? ' hidden' : ''}">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </span>
          </span>
        </div>
      `;
      if (already) div.classList.add('api-item-added');
      div.addEventListener('click', () => addToApiList(item, div));
      itemsContainer.appendChild(div);
    });
  }

  function slideTo(paneIndex) {
    if (paneIndex === 1) {
      slider.style.transform = 'translateX(0)';
      modal.classList.remove('in-category');
    } else {
      slider.style.transform = 'translateX(50%)';
      modal.classList.add('in-category');
    }
  }

  function openCategory(catName) {
    renderItems(apiData[catName]);
    slideTo(2);
    // ذخیره نام دسته فعلی برای رفرش بعدی
    modal.dataset.currentCat = catName;
  }

  openBtn.addEventListener('click', () => {
    modal.classList.add('active');
    modal.classList.remove('in-category');
    modal.classList.remove('search-active');
    isSearchMode = false;
    modal.dataset.currentCat = '';
    renderCategories();
    searchInput.value = '';
    slideTo(1);
    setTimeout(updateApiQuantitySymbols, 100);
  });

  closeBtn.addEventListener('click', () => {
    if (isSearchMode) {
      // در حالت سرچ، close = بستن سرچ (نه بستن مودال)
      exitSearchMode();
      return;
    }
    modal.classList.remove('active');
    modal.classList.remove('in-category');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      if (isSearchMode) {
        exitSearchMode();
        return;
      }
      modal.classList.remove('active');
      modal.classList.remove('in-category');
    }
  });

  backBtn?.addEventListener('click', () => {
    if (isSearchMode) {
      exitSearchMode();
      return;
    }
    slideTo(1);
    searchInput.value = '';
  });

  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim().toLowerCase();
    if (val === '') {
      slideTo(1);
      return;
    }
    let results = [];
    for (let cat in apiData) {
      apiData[cat].forEach(item => {
        if (item.name.toLowerCase().includes(val) || item.id.toLowerCase().includes(val)) {
          results.push(item);
        }
      });
    }
    // در حالت سرچ، هدر برمی‌گرده به حالت اصلی (نه حالت دسته‌بندی)
    modal.classList.remove('in-category');
    renderItems(results);
    slider.style.transform = 'translateX(50%)';
  });

  /* ─── اکشن پنهان‌سازی موقت آکاردئون‌های API ─── */
  function attachApiHideEvents(btn) {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const accordionItem = this.closest('.accordion-item');
      const varName = accordionItem.querySelector('.var-name-input')?.value || 'این متغیر';
      const formulaId = accordionItem.querySelector('.english-id-input')?.value?.trim();

      if (formulaId && pricingPatterns.isRegistryItemUsed?.(formulaId)) {
        if (typeof showToast === 'function') {
          showToast(`متغیر "${varName}" در فرمول قیمت‌گذاری استفاده شده و قابل پنهان‌سازی نیست.`, 'yellow');
        }
        return;
      }

      accordionItem.classList.add('collapsed-hide');
      setTimeout(() => {
        accordionItem.style.display = 'none';
        settingsPanel.refreshAccordionEmptyState?.(accordionItem.parentElement);
        if (typeof showToast === 'function') {
          showToast(`متغیر "${varName}" پنهان شد.`, 'green');
        }
        pricingPatterns.refreshFormulaAfterSettingsChange?.();

        // اگر مودال باز است، لیست آیتم‌ها را دوباره رندر کن
        if (modal.classList.contains('active')) {
          if (modal.classList.contains('in-category') && modal.dataset.currentCat) {
            // در حالت دسته‌بندی: رندر مجدد همان دسته
            renderItems(apiData[modal.dataset.currentCat]);
          } else if (isSearchMode && searchInput.value.trim()) {
            // در حالت جستجو: جستجو را دوباره اجرا کن
            searchInput.dispatchEvent(new Event('input'));
          }
        }
      }, 300);
    });
  }

  document.querySelectorAll('#apiVariablesList .acc-hide-btn').forEach(btn => {
    attachApiHideEvents(btn);
  });

  /* آیتم‌های نمونه‌ای که از قبل داخل HTML هستند نیز باید دقیقاً همان قرارداد
     واحد/پرووایدر آیتم‌های ساخته‌شده در مودال را بگیرند. */
  function hydrateExistingApiMetadata() {
    const catalogById = new Map();
    Object.values(apiData).flat().forEach(item => catalogById.set(item.id, item));

    document.querySelectorAll('#apiVariablesList .accordion-item[data-type="api-variable"]').forEach(itemEl => {
      const id = itemEl.dataset.apiSymbol || itemEl.dataset.id || itemEl.querySelector('.english-id-input')?.value?.trim();
      const item = catalogById.get(String(id || '').toUpperCase());
      if (!item) return;
      itemEl.dataset.apiSymbol = itemEl.dataset.apiSymbol || item.id;

      const defaultUnit = itemDefaultUnit[item.id] || 'عدد';
      itemEl.dataset.unit = defaultUnit;
      const unitSelect = itemEl.querySelector('.unit-select');
      unitSelect?.closest('.form-group')?.remove();

      const wageLabel = itemEl.querySelector('.dynamic-wage-label');
      if (wageLabel) wageLabel.textContent = `اجرت به ازای هر یک ${defaultUnit}`;

      const sourceSelect = itemEl.querySelector('.api-price-source-select');
      if (sourceSelect) {
        sourceSelect.innerHTML = sourceModeOptions();
        customSelect.refresh(sourceSelect);
      }

      const providerField = [...itemEl.querySelectorAll('.api-only-field')].find(field =>
        field.querySelector('.form-label')?.textContent.trim() === 'منبع API'
      );
      const providerSelect = providerField?.querySelector('select');
      if (providerSelect) {
        providerSelect.classList.add('api-provider-select');
        providerSelect.innerHTML = providerOptions(item);
        providerSelect.disabled = false;
      }

      const intervalField = [...itemEl.querySelectorAll('.api-only-field')].find(field =>
        field.querySelector('.form-label')?.textContent.trim() === 'بازه بررسی'
      );
      const intervalSelect = intervalField?.querySelector('select');
      if (intervalSelect) {
        intervalSelect.classList.add('api-interval-select');
        intervalSelect.dataset.customSelectMode = 'range';
        intervalSelect.setAttribute('aria-label', 'بازه بررسی');
        intervalSelect.innerHTML = intervalOptions();
        customSelect.refresh(intervalSelect);
      }
    });
  }

  hydrateExistingApiMetadata();

  // Export تابع آپدیت symbols برای استفاده در سایر فایل‌ها
  apiModal = { updateApiQuantitySymbols, providerCatalog, providerCoverage, itemDefaultUnit };

})();
export { apiModal };
