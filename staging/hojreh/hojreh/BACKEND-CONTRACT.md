# Hojreh Dynamic Pricing — Backend Integration Contract

این فایل تنها قرارداد اتصال فرانت‌اند (`pricing-patterns.js` و ماژول‌های
همراه) به بک‌اند افزونه وردپرسی/ووکامرسی حجره است. هدف این است که بک‌اند
دقیقاً همان ساختاری را بخواند و بنویسد که فرانت‌اند تولید/مصرف می‌کند، بدون
هیچ لایه ترجمه اضافه یا شکننده‌ای بین UI، لایه محاسبه، و دیتابیس. هر تیم
بک‌اند، ابزار scaffolding، یا عامل خودکاری که این سند را بخواند باید بتواند
بدون دسترسی به سورس فرانت‌اند، endpointها، schemaها، و منطق سمت سرور را پیاده‌سازی کند.

**نکته بسته‌بندی مهم:** فرانت‌اند دو نقطه ورود ES Module دارد
(`assets/js/settings-page.js` و `assets/js/price-editor-page.js`) که هرکدام
به‌صورت غیرمستقیم به دو زیرپوشه وابسته‌اند: `assets/js/pricing-patterns/`
و `assets/js/settings-panel/`. این importها relative و سمت مرورگر resolve
می‌شوند، پس کافی است کل ساختار پوشه‌ای `assets/js/` عیناً (بدون flatten
کردن) داخل افزونه کپی شود؛ نیازی به enqueue جداگانه برای فایل‌های داخل این
زیرپوشه‌ها نیست (جزئیات در بخش ۲.۱).

---

## 1) صفحات افزونه در وردپرس

افزونه فقط دو صفحه top-level در منوی مدیریت وردپرس دارد، نه یک صفحه با زیرمنو:

- `تنظیمات حجره` → معادل `settings-panel.html`
- `ویرایشگر قیمت` → معادل `price-editor.html`

هر دو صفحه می‌توانند آیکون مشترک داشته باشند.

## 2) وابستگی به WooCommerce

در فایل اصلی افزونه PHP، هدر وابستگی وردپرس قرار بگیرد:

```php
/**
 * Plugin Name: Hojreh Dynamic Pricing
 * Requires Plugins: woocommerce
 */
```

برای سازگاری دفاعی، علاوه بر هدر بالا، در activation hook هم فعال بودن
WooCommerce بررسی شود و در صورت نبودن WooCommerce، افزونه فعال نماند.

```php
register_activation_hook( __FILE__, function () {
    if ( ! class_exists( 'WooCommerce' ) ) {
        deactivate_plugins( plugin_basename( __FILE__ ) );
        wp_die( 'Hojreh Dynamic Pricing requires WooCommerce to be installed and active.' );
    }
} );
```

---

## 2.1) بارگذاری فایل‌های ES Module در وردپرس (enqueue)

این سند بر اساس وردپرس **7.1** نوشته شده است. فرانت‌اند حجره
(`assets/js/*`) به‌طور کامل بر پایه ES Modules است و دو entry-point دارد:

- `assets/js/settings-page.js` → برای صفحه «تنظیمات حجره»
- `assets/js/price-editor-page.js` → برای صفحه «ویرایشگر قیمت»

هر دو در HTML اصلی با `<script type="module" src="…">` بارگذاری
می‌شوند. تبدیل به افزونه یعنی این دو تگ باید توسط PHP، از طریق مکانیزم
enqueue خودِ وردپرس تولید شوند، نه به‌صورت hardcode در یک تمپلیت PHP.

### 2.1.1) روش توصیه‌شده: `script_loader_tag` (پایدار، تست‌شده روی wp-admin)

وردپرس تابع بومی `wp_enqueue_script_module()` را از نسخه ۶.۵ دارد، اما
یک محدودیت شناخته‌شده و **هنوز رفع‌نشده تا 7.1** دارد: وقتی از هوک
`admin_enqueue_scripts` صدا زده شود، تگ اسکریپت اصلاً پرینت نمی‌شود، چون
این API فقط از طریق هوک‌های `wp_head`/`wp_footer` تگ را چاپ می‌کند —
هوک‌هایی که در ناحیه wp-admin اجرا نمی‌شوند. چون **هر دو صفحه افزونه حجره
صفحات top-level خود wp-admin هستند** (نه صفحات فرانت سایت)، استفاده از
`wp_enqueue_script_module()` برای این پروژه **توصیه نمی‌شود** مگر این‌که
قبل از استفاده، رفتارش دقیقاً روی نسخه وردپرسِ نصب‌شده تست شود.

روش پایدار و رسمی جایگزین (که خود مستندات وردپرس هم برای همین سناریو
پیشنهاد می‌کند)، استفاده از `wp_enqueue_script()` معمولی به‌همراه فیلتر
`script_loader_tag` برای افزودن `type="module"` به تگ خروجی است:

```php
add_action( 'admin_menu', function () {
    $hook_settings = add_menu_page(
        'تنظیمات حجره',
        'تنظیمات حجره',
        'manage_woocommerce',
        'hojreh-settings',
        'hojreh_render_settings_page',
        'dashicons-tag'
    );

    $hook_editor = add_menu_page(
        'ویرایشگر قیمت',
        'ویرایشگر قیمت',
        'manage_woocommerce',
        'hojreh-price-editor',
        'hojreh_render_price_editor_page',
        'dashicons-tag'
    );

    add_action( "admin_enqueue_scripts", function ( $current_hook ) use ( $hook_settings, $hook_editor ) {
        // فقط روی صفحات خودِ افزونه بارگذاری شود، نه در کل wp-admin.
        if ( $current_hook === $hook_settings ) {
            hojreh_enqueue_module( 'hojreh-settings-page', 'assets/js/settings-page.js' );
        } elseif ( $current_hook === $hook_editor ) {
            hojreh_enqueue_module( 'hojreh-price-editor-page', 'assets/js/price-editor-page.js' );
        }
    } );
} );

function hojreh_enqueue_module( string $handle, string $relative_path ): void {
    $src = plugin_dir_url( __FILE__ ) . $relative_path;
    $abs = plugin_dir_path( __FILE__ ) . $relative_path;

    wp_enqueue_script(
        $handle,
        $src,
        array(),              // بدون وابستگی به jQuery و غیره — مطابق ماژول‌های خودکفای فرانت
        file_exists( $abs ) ? filemtime( $abs ) : '1.0.0', // cache-busting خودکار
        true                  // in_footer — دقیقاً مثل تگ فعلی در انتهای body
    );
}

add_filter( 'script_loader_tag', function ( $tag, $handle, $src ) {
    $module_handles = array( 'hojreh-settings-page', 'hojreh-price-editor-page' );
    if ( in_array( $handle, $module_handles, true ) ) {
        $tag = str_replace( '<script ', '<script type="module" ', $tag );
    }
    return $tag;
}, 10, 3 );
```

نکات این بلوک:

- شرط `if ( $current_hook === $hook_settings )` تضمین می‌کند اسکریپت‌های
  حجره فقط در صفحات خودِ افزونه لود شوند، نه در کل wp-admin (رعایت اصل
  عدم آلودگی صفحات دیگر — دقیقاً همان روحیه‌ای که مهاجرت ES Module برای
  حذف global namespace pollution دنبال کرده بود).
- استفاده از `filemtime()` به‌جای رشته نسخه‌ی ثابت، یعنی هر بار فایل JS
  تغییر کند، مرورگر و کش‌های سمت سرور (مثل افزونه‌های caching) مجبورند
  نسخه تازه را بگیرند؛ نیازی به دستی بالا بردن شماره نسخه در هر دیپلوی نیست.
- `array()` به‌عنوان وابستگی عمداً خالی است: entry-pointها خودشان از طریق
  `import` به همه‌چیز دسترسی دارند و هیچ وابستگی به jQuery یا اسکریپت‌های
  دیگر وردپرس ندارند (مطابق بند «پرهیز از `* as namespace`» که در فرانت
  رعایت شده).

> **نکته:** فقط دو entry-point بالا صریحاً enqueue می‌شوند. `api-modal.js`
> مستقیماً از `assets/js/settings-panel.js` (نه از زیرپوشه‌اش) import
> می‌کند و مسیرش دست‌نخورده می‌ماند.

### 2.1.2) جایگزین `wp_localize_script` برای ماژول‌ها: `wp_add_inline_script`

`wp_localize_script()` با Script Modules اصلاً کار نمی‌کند (این محدودیت
مختص خودِ API `wp_enqueue_script_module` نیست، اما چون این پروژه از
enqueue کلاسیک بالا استفاده می‌کند، `wp_localize_script` در تئوری کار
می‌کند — با این‌حال چون هدف صریح‌بودن و پایداری است، اینجا هم توصیه
می‌شود از `wp_add_inline_script()` با آرگومان `'before'` استفاده شود تا
دقیقاً معلوم باشد این مقداردهی، قبل از اجرای ماژول انجام می‌شود):

```php
wp_add_inline_script(
    $handle,
    sprintf(
        'window.hojrehRestNonce = %s; window.hojrehApiRoot = %s;',
        wp_json_encode( wp_create_nonce( 'wp_rest' ) ),
        wp_json_encode( esc_url_raw( rest_url( 'hojreh/v1/' ) ) )
    ),
    'before'
);
```

این دقیقاً همان `window.hojrehRestNonce` است که در بخش ۱۴.۵ همین سند
(الگوی `fetch` برای ذخیره‌سازی) مصرف می‌شود — کد جاوااسکریپت فرانت بدون
هیچ تغییری همین‌طور کار می‌کند.

برای catalog اولیه (مقادیر متغیرها/ثابت‌ها/رندسازی‌ها که در بخش ۴ توضیح
داده شد)، اگر بخواهید بک‌اند از همان لحظه‌ی لود صفحه یک snapshot اولیه
تزریق کند (به‌جای این‌که فرانت صبر کند و بعد یک درخواست AJAX جدا بزند)،
همین الگو تکرار می‌شود:

```php
wp_add_inline_script(
    $handle,
    'window.hojrehInitialCatalog = ' . wp_json_encode( hojreh_get_active_catalog() ) . ';',
    'before'
);
```

### 2.1.3) نکات تکمیلی سازگاری با وردپرس 7.1

- **حداقل نسخه:** در هدر افزونه `Requires PHP: 8.1` و `Requires at least: 6.5` قید شود.
- **کپسوله‌سازی assets:** پوشه `assets/` باید عیناً داخل پوشه افزونه
  کپی شود (`wp-content/plugins/hojreh-dynamic-pricing/assets/...`)؛
  مسیرها در `hojreh_enqueue_module()` بالا با `plugin_dir_url(__FILE__)`
  نسبی محاسبه می‌شوند، پس جابه‌جایی نام پوشه افزونه مشکلی ایجاد نمی‌کند.
- **قابلیت (capability) دسترسی:** هر دو `add_menu_page` بالا از
  `manage_woocommerce` استفاده کرده‌اند نه `manage_options`، چون این
  افزونه مستقیماً روی قیمت‌گذاری محصولات ووکامرس اثر می‌گذارد و باید
  همان سطح دسترسی مدیریت فروشگاه را رعایت کند؛ این مقدار باید با کدهای
  خطای `permission_denied` در بخش ۱۱.۶ همسو باشد (یعنی REST endpointها
  هم دقیقاً همین capability را در `permission_callback` چک کنند، نه یک
  capability متفاوت).
- **نانس REST جداگانه (اختیاری ولی توصیه‌شده):** به‌جای اکشن عمومی
  `wp_rest`، می‌توان یک اکشن نانس اختصاصی (مثلاً `hojreh_rest_nonce`)
  تعریف کرد تا نشت این نانس به سایر بخش‌های REST API سایت محدودتر شود؛
  در این صورت `permission_callback` مربوطه در بخش ۱۱ باید همان اکشن را
  با `wp_verify_nonce` چک کند.

---

## 3) معماری فرانت‌اند: چارچوب OOP و DOM-independent

فرانت‌اند از دو لایه مجزا تشکیل شده: `HojrehFormulaEngine` و
`HojrehPatternController`. نقطه ورود `pricing-patterns.js` است (داخلاً به
چند فایل زیرپوشه `assets/js/pricing-patterns/` تقسیم شده، اما این تقسیم
صرفاً سازمان‌دهی کد داخلی است و برای بک‌اند اهمیتی ندارد — API عمومی زیر
همان چیزی است که مصرف می‌شود):

1. **`HojrehFormulaEngine`** — یک IIFE محض و stateless (parser، compiler،
   evaluator، serializer). هیچ state نگه نمی‌دارد؛ همه‌چیز از طریق آرگومان
   ورودی/خروجی رد و بدل می‌شود.
2. **`HojrehPatternController`** — کلاس OOP که هر instance آن یک الگوی
   قیمتی مجزا را نمایندگی می‌کند و کاملاً DOM-independent است.

این جداسازی یعنی بک‌اند (یا هر اسکریپت Node/headless دیگر) می‌تواند از همان
منطق پردازش فرمول استفاده کند بدون این‌که به `document` یا هیچ عنصر DOM
نیازی داشته باشد — پیش‌نیاز اصلی برای bulk sync هزاران محصول ووکامرس.

### 3.1) `HojrehPatternController` — Class Interface

```js
class HojrehPatternController {
  constructor(patternId, targetContainer = null, options = {}) { … }
}
```

| پارامتر | نوع | الزامی | توضیح |
|---|---|---|---|
| `patternId` | `string \| number` | بله | شناسه پایدار الگو (مطابق `data-id` روی accordion، یا id ردیف/پست وردپرس). اگر falsy و غیر از `0` باشد، constructor exception پرتاب می‌کند. |
| `targetContainer` | `Element \| null` | خیر (default `null`) | نود DOM که instance باید به آن bind شود. برای حالت headless (bulk generation، پیش‌محاسبه payload سمت سرور) باید `null` باشد. |
| `options.patternName` | `string` | خیر (default `''`) | نام نمایشی الگو. |
| `options.initialElements` | `Array` | خیر (default `[]`) | درخت AST از پیش هیدریت‌شده — مثلاً از `wp_postmeta` بازخوانی‌شده. |
| `options.registryCatalog` | `Array \| { variables, constants, roundings }` | خیر (default `null`) | کاتالوگ داده تزریقی برای اجرای headless — به بخش ۴ مراجعه شود. |

**قوانین ایزوله بودن instanceها:**

- هیچ cursor یا state سراسری («الگوی فعال فعلی») در سطح ماژول وجود ندارد.
- هر instance مالک ۱۰۰٪ state خودش است: `elements` tree، `elementCounter`،
  `status`، `errorMessage`، `isManual`/`manualText`، `savedFormulaText`
  (اسنپ‌شات dirty-tracking)، و `simulatorValues`.
- ساخت هزاران instance به‌صورت هم‌زمان ارزان است — هر instance یک object
  graph ساده است (state + چند timer handle)، نه یک subtree از DOM.
- container کاملاً اختیاری است و فقط توسط متدهای `render()`/`bindDom()`
  مصرف می‌شود؛ هیچ متد دیگری (`getPayload`, `compileToProgram`,
  `evaluate`, …) به وجود DOM وابسته نیست.

**Lifecycle states (`state.status`):**

| مقدار | معنی | مجاز برای ذخیره نهایی؟ |
|---|---|---|
| `empty` | هیچ عنصری در فرمول نیست | خیر |
| `green` | فرمول معتبر و کامل parse شده | **بله — تنها وضعیت قابل persist** |
| `yellow` | فرمول قابل parse است اما معادل بصری قطعی ندارد (draft) | خیر — فقط به‌عنوان draft ذخیره شود |
| `red` | فرمول نامعتبر (خطای parse یا validation) | خیر |

**Static registry API** (برای query بین‌الگویی بدون این‌که یک instance از
وجود بقیه مستقیماً خبر داشته باشد):

```js
HojrehPatternController.register(instance)        // ثبت در Map سراسری، instance را برمی‌گرداند
HojrehPatternController.unregister(patternId)      // حذف از Map
HojrehPatternController.get(patternId)             // → instance | null
HojrehPatternController.all()                      // → Array<instance>
HojrehPatternController.isItemUsedInAnyInstance(id) // → boolean، بررسی استفاده یک آیتم در همه الگوهای زنده
HojrehPatternController.cloneElements(elements)     // deep-clone (JSON round-trip) — بدون هیچ ref مشترک
```

**متدهای اصلی instance:**

| متد | امضا | توضیح |
|---|---|---|
| `setElements(elements)` | `(Array) → void` | جایگزینی کامل درخت AST؛ counter را نیز sync می‌کند. |
| `addElement(type, subType)` | `(string, string?) → { ok, reason? }` | افزودن عنصر جدید به ریشه. **throw نمی‌کند** — شکست را با `{ ok: false, reason }` گزارش می‌دهد (`'no-active-items'` یا `'needs-base-term'`)، تا هم دکمه UI و هم اسکریپت headless بتوانند یکسان مدیریتش کنند. |
| `removeElementById(id)` / `moveElement(id, opts)` / `findElementById(id)` | — | مدیریت درخت، عمیقاً recursive روی گروه‌ها. |
| `applyFormulaText(text, opts)` | `(string, { allowEmpty?, preserveOnEmpty? }) → { status, … }` | فرمول متنی manual (با شناسه‌های انگلیسی) را parse و روی state اعمال می‌کند. |
| `evaluate(values?)` | `(object?) → number` | ارزیابی مقدار فعلی فرمول با override اختیاری مقادیر. |
| `compileToProgram()` | `() → Array<Instr>` | به بخش ۵ مراجعه شود. |
| `buildFormulaText(useEnglishIds)` | `(boolean) → string` | فرمول canonical (انگلیسی) یا نمایشی (فارسی). |
| `getPayload()` | `() → PayloadObject` | payload کامل backend-safe — به بخش ۶ مراجعه شود. |
| `hasChanged()` | `() → boolean` | مقایسه با آخرین `savedFormulaText` snapshot. |
| `commitSnapshot()` | `() → void` | snapshot dirty-tracking را به وضعیت فعلی پیش می‌برد (بعد از save موفق فراخوانی شود). |
| `setRegistryCatalog(catalog)` | `(object \| Array \| null) → void` | جایگزینی زنده کاتالوگ تزریقی؛ به بخش ۴ مراجعه شود. |
| `render(options)` | `({ syncPreview? }) → void` | فقط در صورت وجود `this.container` معنا دارد؛ برای instanceهای headless نیازی به فراخوانی نیست. |
| `destroy()` | `() → void` | timerهای داخلی را پاک و از registry سراسری unregister می‌کند. |

---

## 4) Hybrid Registry Injection — تزریق کاتالوگ داده

`HojrehFormulaEngine` برای resolve کردن متغیرها/ثابت‌ها/رندسازی‌ها دو مسیر
دارد که کاملاً به هم agnostic هستند:

1. **DOM scraping (پیش‌فرض، محیط ویرایشگر مرورگر):** وقتی هیچ
   `registryCatalog`ای تزریق نشده، `HojrehFormulaEngine.getRegisteredItems()`
   با `document.querySelectorAll(...)` روی accordionهای صفحه اسکن می‌کند.
2. **Catalog injection (headless/offline):** وقتی
   `HojrehPatternController` با `options.registryCatalog` ساخته شود (یا
   بعداً `setRegistryCatalog(catalog)` صدا زده شود)، engine **هیچ‌گاه**
   `document.querySelectorAll` را برای آن instance صدا نمی‌زند — کاتالوگ
   تزریقی به‌طور کامل جایگزین DOM می‌شود.

هر دو مسیر خروجی یکسانی تولید می‌کنند: `{ variables, constants, roundings }`،
که تمام مصرف‌کننده‌های پایین‌دستی (`buildFormulaString`, `evaluateFormula`,
`compileToProgram`, `parseFormulaString`, …) کاملاً نسبت به منشأ داده بی‌تفاوت‌اند.

### 4.1) شکل‌های ورودی مجاز `registryCatalog`

Engine دو شکل ورودی را می‌پذیرد:

**(الف) آرایه تخت با فیلد `type`:**

```json
[
  { "type": "variable", "id": "var3", "name": "بسته‌بندی شیشه‌ای 10*10*7 لوکس",
    "quantitySymbol": "c", "unit": "عدد", "price": 45000, "ojrat": 0,
    "source": "independent", "active": true },
  { "type": "constant", "id": "const1", "name": "کارمزد بسته‌بندی",
    "percent": 5, "active": true },
  { "type": "rounding", "id": "round1", "name": "رُند کردن چهار رقم آخر",
    "config": { "digits": 4, "mode": "zero", "preventZero": true, "preventIncrease": false },
    "active": true }
]
```

**(ب) شکل bucket‌بندی‌شده (دقیقاً همان شکلی که خروجی نهایی هم دارد):**

```json
{
  "variables": [ { "id": "var3", "...": "..." } ],
  "constants": [ { "id": "const1", "...": "..." } ],
  "roundings": [ { "id": "round1", "...": "..." } ]
}
```

هر entry با `normalizeCatalogEntry()` نرمالایز می‌شود:

- `id` از `entry.id ?? entry.selectedId` گرفته و از `normalizeIdentifier()`
  عبور می‌کند؛ اگر خالی شود، entry نادیده گرفته می‌شود.
- `active` پیش‌فرضش `true` است؛ فقط `active === false` صریح آن را غیرفعال می‌کند.
- برای `variable`: `unit` پیش‌فرض `'عدد'`، `price`/`ojrat` با
  `parseNumberValue(...,0)` امن می‌شوند، `source` یا `'api'` یا
  `'independent'` است.
- برای `constant`: فقط `percent` (یا fallback از `selectedValue`).
- برای `rounding`: آبجکت `config` با پیش‌فرض‌های `digits: 3`, `mode: 'zero'`,
  `preventZero: false`, `preventIncrease: false`.

### 4.2) Fallback و اولویت وقتی هم DOM و هم کاتالوگ حاضرند

اگر یک instance با `registryCatalog` ساخته شده باشد ولی همچنان به یک
`targetContainer` هم bind شده باشد (مثلاً پیش‌نمایش زنده در صفحه‌ای که
داده‌اش از سرور پیش‌بارگذاری شده)، **کاتالوگ تزریقی همیشه اولویت مطلق دارد**
— هیچ‌گاه به‌صورت خودکار به DOM برنمی‌گردد. تنها راه بازگشت به DOM scraping،
فراخوانی صریح زیر است:

```js
instance.setRegistryCatalog(null); // از این پس دوباره از DOM اسکن می‌کند
```

این رفتار deterministic عمداً انتخاب شده: بک‌اندی که یک snapshot قیمتی تازه
(مثلاً بعد از تغییر نرخ طلا/ارز) تزریق می‌کند، نباید نگران این باشد که یک
DOM قدیمی به‌طور خاموش override‌اش کند.

### 4.3) Live state hydration

```js
// یک job پس‌زمینه که قیمت‌های تازه از یک صرافی/API طلا می‌آورد:
const freshCatalog = await fetchLatestPricesFromGoldApi();
instance.setRegistryCatalog(freshCatalog);

const newPayload = instance.getPayload(); // همان instance، همان AST،
                                           // فقط با قیمت‌های جدید resolve شده
```

`setRegistryCatalog` هیچ چیز دیگری از state (درخت `elements`, `status`,
`patternName`, …) را دست نمی‌زند — فقط منبع resolve آیتم‌ها را عوض می‌کند.
این یعنی برای recalculation انبوه، بک‌اند نیازی به بازسازی instanceها ندارد؛
فقط کاتالوگ را swap می‌کند و دوباره `getPayload()`/`compileToProgram()`/`evaluate()` را صدا می‌زند.

---

## 5) کامپایلر RPN — `compileToProgram()`

علاوه بر `formula` (متن canonical) و `ast` (درخت تودرتو)، هر payload شامل
فیلد **`program`** است: یک آرایه تخت postfix/RPN که یک stack machine حدوداً
۱۵ خطی در PHP بتواند بدون پیاده‌سازی مجدد parser/AST-walker جاوااسکریپت،
مستقیماً آن را اجرا کند.

`program` از همان پیمایش چپ‌به‌راست درخت `elements` تولید می‌شود که
`buildFormulaString()` و `evaluateFormula()` هم استفاده می‌کنند — پس متن
فرمول canonical، AST، و program هرگز نمی‌توانند از هم واگرا شوند؛ هر سه
همیشه دقیقاً همان محاسبه را توصیف می‌کنند.

### 5.1) گرامر opcodeها

| `op` | فیلدها | معنای روی stack |
|---|---|---|
| `var` | `id`, `qty`, `ojrat` (boolean) | مقدار `(price + (ojrat ? ojrat : 0)) * qty` را push می‌کند |
| `const` | `id`, `mode` (`'add'` \| `'mul'`) | یک مقدار `a` را pop می‌کند، درصد `const.percent` را روی آن اعمال و push می‌کند: اگر `mode==='mul'` → `a * pct`, وگرنه → `a + a*pct` |
| `add` | — | `b`,`a` را pop و `a + b` را push می‌کند |
| `mul` | — | `b`,`a` را pop و `a * b` را push می‌کند |
| `round` | `id` | یک مقدار را pop می‌کند و نتیجه `hojreh_apply_rounding(value, roundings[id].config)` را push می‌کند |

گروه‌های بصری (`type: 'group'`) هیچ opcode مجزایی تولید نمی‌کنند — کاملاً
transparent به stack هستند؛ فقط عناصر داخلشان به‌ترتیب emit می‌شوند، دقیقاً
مثل این‌که پرانتزها در متن فرمول فقط اولویت بصری می‌دهند نه یک عملگر مستقل.

### 5.2) مثال کامل

برای فرمول `[round1[var3*c + var1*a]]` (بسته‌بندی×c جمع با زعفران×a، سپس
رند‌شده)، خروجی `compileToProgram()`:

```json
[
  { "op": "var",   "id": "var3", "qty": "c", "ojrat": false },
  { "op": "var",   "id": "var1", "qty": "a", "ojrat": false },
  { "op": "add" },
  { "op": "round", "id": "round1" }
]
```

خواندن گام‌به‌گام: push مقدار `var3`، push مقدار `var1`، `add` این دو را
pop و جمعشان را push می‌کند، سپس `round` نتیجه را pop و رند‌شده را push
می‌کند — آخرین مقدار روی stack، خروجی نهایی فرمول است.

### 5.3) `ojrat` (اجرت ساخت) در program در برابر payload سطح بالا

دو جای متفاوت با دو معنای متفاوت:

- در سطح یک عنصر `var` داخل `program`، فیلد `ojrat` فقط یک **boolean** است
  («آیا این متغیر اجرت دارد که باید در محاسبه لحاظ شود؟»).
- در سطح بالای payload، کلید `ojrat` (بخش ۶.۱) یک **map** از
  `variableId → مبلغ عددی اجرت` برای همه متغیرهای دارای اجرت غیرصفر است،
  صرف‌نظر از این‌که در فرمول این الگوی خاص استفاده شده باشند یا نه — این map
  از کل کاتالوگ فعال ساخته می‌شود، نه فقط از dependencyهای این الگو.

بک‌اند باید هنگام اجرای `program`، مقدار عددی اجرت را از دیتای واقعی
متغیر (`values[id]['ojrat']`) بخواند، نه از payload سطح بالای همین درخواست
— چون قیمت/اجرت متغیرها می‌تواند بین ذخیره الگو و لحظه محاسبه واقعی (مثلاً
بعد از یک بروزرسانی نرخ طلا) تغییر کرده باشد. `program` فقط **ساختار**
محاسبه را نگه می‌دارد؛ مقادیر زنده همیشه در لحظه اجرا از دیتابیس خوانده می‌شوند.

---

## 6) Payload Schema — منبع حقیقت فرمول

`HojrehPatternController#getPayload()` خروجی زیر را تولید می‌کند؛ این
همان شکلی است که در فیلدهای hidden/textarea داخل accordion هر الگو سریالایز
می‌شود و باید عیناً به بک‌اند ارسال شود:

```text
hojreh_patterns[<patternId>][formula]
hojreh_patterns[<patternId>][display_formula]
hojreh_patterns[<patternId>][dependencies]
hojreh_patterns[<patternId>][payload]
```

### 6.1) شکل کامل payload

```json
{
  "schemaVersion": 2,
  "status": "green",
  "error": null,
  "patternId": "401",
  "patternName": "الگوی ترکیب محصول و بسته‌بندی لوکس کادویی",
  "formula": "[round1[var3*c + var1*a]]",
  "displayFormula": "[رُند کردن چهار رقم آخر[بسته‌بندی شیشه‌ای 10*10*7 لوکس*c + زعفران قائنات سوپر نگین اتویی*a]]",
  "ast": [
    {
      "type": "variable",
      "subType": "independent-variable",
      "operator": "+",
      "selectedId": "var3",
      "selectedName": "بسته‌بندی شیشه‌ای 10*10*7 لوکس",
      "selectedUnit": "عدد",
      "selectedValue": 0,
      "quantitySymbol": "c",
      "isGroup": false,
      "innerElements": []
    },
    {
      "type": "variable",
      "subType": "independent-variable",
      "operator": "+",
      "selectedId": "var1",
      "selectedName": "زعفران قائنات سوپر نگین اتویی",
      "selectedUnit": "گرم",
      "selectedValue": 0,
      "quantitySymbol": "a",
      "isGroup": false,
      "innerElements": []
    },
    {
      "type": "rounding",
      "subType": "rounding",
      "operator": "+",
      "selectedId": "round1",
      "selectedName": "رُند کردن چهار رقم آخر",
      "selectedUnit": "رُندسازی",
      "selectedValue": 0,
      "quantitySymbol": "",
      "isGroup": false,
      "innerElements": []
    }
  ],
  "program": [
    { "op": "var", "id": "var3", "qty": "c", "ojrat": false },
    { "op": "var", "id": "var1", "qty": "a", "ojrat": false },
    { "op": "add" },
    { "op": "round", "id": "round1" }
  ],
  "dependencies": {
    "variables": ["var3", "var1"],
    "constants": [],
    "roundings": ["round1"]
  },
  "apiSymbols": [],
  "ojrat": { "var5": 15000 },
  "updatedAt": "2026-07-01T06:43:08.327Z"
}
```

### 6.2) توضیح فیلدها

| فیلد | نوع | توضیح |
|---|---|---|
| `schemaVersion` | `number` | همیشه `2` در نسخه فعلی؛ بک‌اند باید نسخه‌های ناسازگار آینده را با این عدد تشخیص دهد و اگر بزرگ‌تر از نسخه‌ای است که می‌شناسد، ذخیره را رد کند نه این‌که حدس بزند. |
| `status` | `'empty' \| 'green' \| 'yellow' \| 'red'` | به جدول lifecycle در بخش ۳.۱ مراجعه شود. |
| `error` | `string \| null` | پیام خطا وقتی `status === 'red'`؛ در غیر این‌صورت `null`. |
| `patternId` | `string` | شناسه پایدار الگو (همیشه به‌صورت رشته سریالایز می‌شود، حتی اگر ورودی عددی بوده باشد). |
| `patternName` | `string` | نام نمایشی. |
| `formula` | `string` | فرمول canonical با شناسه انگلیسی — منبع حقیقت برای audit و برای بازسازی مجدد `elements` در صورت نیاز. |
| `displayFormula` | `string` | همان فرمول با نام فارسی آیتم‌ها — فقط برای نمایش، هرگز parse نشود. |
| `ast` | `Array<Element>` | درخت تخت‌شده و سریالایز‌شده عناصر (خروجی `serializeElements`). |
| `program` | `Array<Instr>` | خروجی `compileToProgram()` — به بخش ۵ مراجعه شود. |
| `dependencies` | `{ variables: string[], constants: string[], roundings: string[] }` | لیست id همه آیتم‌های استفاده‌شده در این الگو؛ برای ساخت ایندکس‌های بخش ۱۲ ضروری است. |
| `apiSymbols` | `string[]` | نمادهای ثابت API که واقعاً در همین الگو استفاده شده‌اند؛ برای اعلام انتخاب‌های واقعی به سرویس حجره. |
| `ojrat` | `Record<variableId, number>` | map مبلغ اجرت برای همه متغیرهای فعال دارای اجرت غیرصفر (نه فقط dependencyهای این الگو) — به بخش ۵.۳ مراجعه شود. |
| `updatedAt` | `string (ISO 8601)` | زمان تولید این payload سمت کلاینت؛ **این فیلد جایگزین کنترل همزمانی نیست** — به بخش ۷ مراجعه شود. |

بک‌اند باید **فقط payload با `status: "green"` را برای محاسبه محصول
معتبر بداند**. وضعیت `"red"` نباید ذخیره نهایی شود. وضعیت `"yellow"` از
نظر parser قابل فهم است اما معادل بصری قطعی ندارد و بهتر است فقط به عنوان
draft ذخیره شود (نه به‌عنوان فرمول فعال محصول).

---

## 7) قوانین syntax فرمول

کاراکترهای مجاز:

- `+`
- `*` و `×`، اما canonical همیشه `*` است
- `(` و `)` برای گروه محاسباتی بصری
- `[` و `]` برای wrapperهای درصد و رندسازی
- شناسه انگلیسی lowercase: `^[a-z][a-z0-9_]*$`

قوانین مهم:

- متغیر همیشه به شکل `variableId*quantitySymbol` می‌آید.
- ثابت درصدی اگر بعد از عبارت بیاید canonical می‌شود به:
  `[previousExpression]+const1` یا `[previousExpression]*const1`.
- رندسازی به شکل `[roundingId[previousExpression]]` ذخیره می‌شود.
- پرانتزها در UI به گروه محاسباتی تبدیل می‌شوند.
- کروشه‌ها برای اولویت/عملگرهای اختصاصی هستند و خودشان گروه محاسباتی بصری نمی‌سازند.

---

## 8) فعال بودن آیتم‌ها و پایداری شناسه‌ها

بک‌اند باید همان سیاست فرانت را enforce کند:

- فقط آیتم‌های فعال اجازه حضور در فرمول دارند.
- متغیر غیرفعال در فرمول‌ها و selectorها شرکت نمی‌کند؛ اما اگر قبلاً نشانه
  مقدار داشته باشد، برای جلوگیری از پرش بی‌دلیل، فرمول‌ها پاک/renumber
  نمی‌شود و همچنان برای جلوگیری از duplicate رزرو می‌ماند.
- اگر آیتمی در فرمول/الگوی فعال استفاده شده، غیرفعال یا حذف نشود
  (از `HojrehPatternController.isItemUsedInAnyInstance(id)` سمت کلاینت
  برای هشدار پیشگیرانه استفاده می‌شود؛ بک‌اند باید همین قانون را به‌صورت
  authoritative دوباره enforce کند، نه فقط به کلاینت تکیه کند).
- بعد از فعال‌سازی، نام و شناسه انگلیسی readonly/locked باشد.
- شناسه انگلیسی هر آیتم باید پایدار بماند و بدون دلیل renumber نشود.
- تولید شناسه جدید باید کوچک‌ترین شماره آزاد را بدهد؛ اما شناسه‌های قبلی
  نباید برای پر کردن gap دوباره renumber شوند.

---

## 9) بلوپرینت ارزیاب سمت PHP — Stack Machine برای `program`

این تابع، ارزیاب مرجع `program` است: یک حلقه ساده مبتنی بر stack که
هزاران محصول را در لحظه — مثلاً وقتی یک API نرخ ارز/طلا تغییر قیمت پایه
اعلام می‌کند — بدون نیاز به دوباره‌نویسی parser جاوااسکریپت در PHP، بازمحاسبه می‌کند:

```php
/**
 * Evaluate a compiled Hojreh `program` (flat RPN token array) against
 * live variable values. This is the canonical PHP mirror of
 * HojrehFormulaEngine.evaluateFormula() — it MUST stay in sync with the
 * opcode grammar documented in §5 of BACKEND-CONTRACT.md.
 *
 * @param array $program  The `program` array from a pattern's payload.
 * @param array $values   [ variableId => ['price' => float, 'quantity' => float, 'ojrat' => float],
 *                          constantId => ['percent' => float],
 *                          roundingId => ['config' => array] ]
 * @return float
 */
function hojreh_evaluate_program( array $program, array $values ): float {
    $stack = [];
    foreach ( $program as $instr ) {
        switch ( $instr['op'] ) {
            case 'var':
                $price   = (float) ( $values[ $instr['id'] ]['price']    ?? 0 );
                $qty     = (float) ( $values[ $instr['id'] ]['quantity'] ?? 1 );
                $ojrat   = $instr['ojrat'] ? (float) ( $values[ $instr['id'] ]['ojrat'] ?? 0 ) : 0;
                $stack[] = ( $price + $ojrat ) * $qty;
                break;
            case 'const':
                $a       = array_pop( $stack );
                $pct     = (float) ( $values[ $instr['id'] ]['percent'] ?? 0 ) / 100;
                $stack[] = $instr['mode'] === 'mul' ? $a * $pct : $a + $a * $pct;
                break;
            case 'add':
                $b = array_pop( $stack ); $a = array_pop( $stack );
                $stack[] = $a + $b;
                break;
            case 'mul':
                $b = array_pop( $stack ); $a = array_pop( $stack );
                $stack[] = $a * $b;
                break;
            case 'round':
                $stack[] = hojreh_apply_rounding( array_pop( $stack ), $values[ $instr['id'] ]['config'] ?? [] );
                break;
        }
    }
    return (float) array_pop( $stack );
}
```

### 9.1) `hojreh_apply_rounding()` — مطابقت دقیق با `applyRounding()` جاوااسکریپت

```php
function hojreh_apply_rounding( float $value, array $config ): float {
    $digits = max( 1, (int) ( $config['digits'] ?? 3 ) );
    $factor = 10 ** $digits;
    $mode   = $config['mode'] ?? 'zero';

    if ( 'nine' === $mode ) {
        $rounded = floor( $value / $factor ) * $factor + ( $factor - 1 );
    } elseif ( 'last_nine' === $mode ) {
        $sub_factor = 10 ** max( 0, $digits - 1 );
        $rounded    = floor( $value / $factor ) * $factor + ( 9 * $sub_factor );
    } else {
        $rounded = floor( $value / $factor ) * $factor;
    }

    if ( ! empty( $config['preventZero'] ) && $rounded <= 0 && $value > 0 ) {
        return $value;
    }
    if ( ! empty( $config['preventIncrease'] ) && $rounded > $value ) {
        return $value;
    }

    return $rounded;
}
```

### 9.2) اجرای انبوه هنگام تغییر نرخ خارجی (طلا/ارز)

```php
function hojreh_recalculate_on_rate_change( string $changed_variable_id, float $new_price ): void {
    // 1) از pattern_dependency_index (بخش ۱۲) فقط الگوهای وابسته را بگیر
    $affected_pattern_ids = hojreh_get_patterns_depending_on( $changed_variable_id );

    // 2) از product_dynamic_pricing_index فقط محصولاتی که یکی از این الگوها را دارند
    $affected_product_ids = hojreh_get_products_using_patterns( $affected_pattern_ids );

    foreach ( $affected_product_ids as $product_id ) {
        $pattern_id = get_post_meta( $product_id, '_hojreh_pattern_id', true );
        $payload    = hojreh_get_pattern_payload( $pattern_id ); // status === 'green' تضمین‌شده

        $values   = hojreh_build_values_snapshot( $payload['dependencies'] ); // شامل قیمت تازه
        $new_calc = hojreh_evaluate_program( $payload['program'], $values );

        wc_get_product( $product_id )->set_regular_price( $new_calc )->save();
    }
}
```

این حلقه به‌جای پیمایش هر محصول در فروشگاه، فقط زیرمجموعه‌ای را که واقعاً
به `$changed_variable_id` وابسته‌اند لمس می‌کند — دقیقاً همان دلیلی که
ایندکس‌های بخش ۱۲ ضروری‌اند.

---

## 10) کنترل همزمانی — `base_revision`

### 10.1) مسئله

فرانت‌اند دو صفحه مستقل دارد که هر دو می‌توانند روی داده مشترک بنویسند:
`تنظیمات حجره` (شامل ویرایشگر الگوهای قیمتی) و `ویرایشگر قیمت`. هر دو از
همان الگوی patch سبک استفاده می‌کنند —
`getDirtySettingsPayload()`/`getDirtyPricesPayload()` فقط فیلدهای واقعاً
تغییر‌کرده را می‌فرستند (`save_mode: 'patch_changed_fields_only'`) — اما
patch سطح فیلد به‌تنهایی رخداد زیر را حل نمی‌کند:

> مدیر فروشگاه صفحه تنظیمات را با دیتای قدیمی باز نگه داشته؛ در همین فاصله
> شاگرد حجره از صفحه ویرایشگر قیمت، قیمت یک متغیر مستقل را تغییر داده و
> ذخیره کرده است. وقتی مدیر روی «ذخیره» کلیک می‌کند، حتی اگر فقط فیلدهای
> *خودش* را patch کند، ممکن است بدون اطلاع رکورد کلی الگو (`formula`,
> `ast`, `program`) را با نسخه‌ای بسازد که هنوز از قیمت قدیمی متغیر خبر
> ندارد، و در واقع تغییر شاگرد را overwrite کند اگر هر دو یک entity واحد
> (مثلاً کل رکورد یک pattern) را دوباره می‌نویسند.

`base_revision` این شکاف را با یک optimistic-concurrency token در سطح
**هر entity قابل ذخیره** (هر pattern، هر متغیر مستقل، هر ثابت، هر رندسازی)
می‌بندد.

### 10.2) قرارداد سرور

- هر entity (رکورد pattern در `wp_postmeta`/جدول اختصاصی، یا هر آیتم
  کاتالوگ) یک ستون/متای عددی `revision` نگه می‌دارد که با **هر** commit
  موفق دقیقاً یک واحد افزایش می‌یابد (شروع از `1` در اولین ایجاد).
- هر پاسخ GET که یک entity را برمی‌گرداند (بارگذاری اولیه صفحه، یا
  هر پاسخ REST که دیتای فعلی را می‌دهد) باید مقدار فعلی `revision` را در
  خروجی همراه کند — به شکل `revision` در سطح خود entity (نه در payload
  فرمول؛ چون هر entity فرمول، متغیر، ثابت، و رندسازی، revision مستقل خودش
  را دارد).
- کلاینت این مقدار را در لحظه بارگذاری/آخرین sync موفق نگه می‌دارد (مثلاً
  در یک `data-revision` روی همان عنصر accordion که سایر id/typeها هم آنجا
  نگهداری می‌شوند) و هنگام ساخت payload ذخیره، آن را به‌عنوان
  `base_revision` همراه هر `change`/`pattern save` می‌فرستد.
- سرور، پیش از commit، مقدار `base_revision` ارسالی را با `revision`
  فعلی رکورد در دیتابیس مقایسه می‌کند:
  - **برابر بود** → write مجاز است؛ commit انجام و `revision` عدد بعدی
    می‌شود؛ پاسخ موفق شامل `revision` جدید است (کلاینت باید آن را
    جایگزین مقدار قبلی خودش کند).
  - **برابر نبود** (یعنی رکورد از زمان بارگذاری کلاینت توسط نوشتار دیگری
    تغییر کرده) → write **رد** می‌شود؛ سرور پاسخ `409 Conflict` با کد
    `revision_mismatch` برمی‌گرداند (به بخش ۱۱.۴ مراجعه شود) و **هیچ
    فیلدی از آن change را commit نمی‌کند** — نه حتی فیلدهای غیرهم‌پوشان.
    تصمیم‌گیری درباره merge دستی یا overwrite آگاهانه به لایه UI
    (نمایش diff/هشدار به کاربر) واگذار می‌شود، نه به‌صورت خودکار سمت سرور.
- این بررسی باید **per-entity** باشد، نه per-request: یک درخواست patch
  می‌تواند شامل چند `change` روی چند entity مختلف باشد (مثلاً هم یک
  متغیر مستقل هم یک pattern)؛ هر entity با `base_revision` خودش سنجیده
  می‌شود، و رد شدن یکی نباید بقیه changeهای معتبر همان درخواست را متوقف
  کند — پاسخ باید per-change شکست/موفقیت را جدا گزارش دهد (بخش ۱۱.۴).

### 10.3) الحاق به payload موجود

ساختار patch فعلی (`save_mode: 'patch_changed_fields_only'`, `changes: []`)
حفظ می‌شود؛ فقط هر آیتم آرایه `changes` یک فیلد جدید می‌گیرد:

```json
{
  "save_mode": "patch_changed_fields_only",
  "changes": [
    {
      "key": "variable.var1.var-default-price.مبلغ پیش‌فرض",
      "item_id": "var1",
      "item_type": "variable",
      "old_value": "130000",
      "new_value": "150000",
      "base_revision": 7
    }
  ],
  "formula_payload": {}
}
```

و برای ذخیره یک pattern کامل (`PATCH /wp-json/hojreh/v1/patterns/{id}`، بخش
۱۱.۲)، خود بدنه درخواست یک `base_revision` در سطح ریشه دارد که با
`revision` فعلی همان pattern در دیتابیس سنجیده می‌شود:

```json
{
  "base_revision": 12,
  "payload": { "...": "خروجی کامل getPayload() از بخش ۶.۱" }
}
```

### 10.4) چرا سطح فیلد کافی نیست ولی لازم است

Patch سطح فیلد (`changes[]`) ریسک overwrite رشته‌ای کوچک از فیلدهای غیرمرتبط
را از بین می‌برد (مثلاً یک تغییر رنگ تم در تب دیگر). `base_revision`
مسئله متفاوتی را حل می‌کند: جلوگیری از این‌که یک نوشتار مبتنی بر خواندن
قدیمی، حتی روی *همان* فیلد یا *همان* entity، نوشتار تازه‌تری را نامرئی
overwrite کند. این دو مکانیزم مکمل‌اند، نه جایگزین هم.

---

## 11) REST API / AJAX Endpoints Schema

Namespace: `hojreh/v1`. تمام endpointهای نوشتاری نیازمند `X-WP-Nonce`
(از `wp_create_nonce('wp_rest')`، در کلاینت به شکل `window.hojrehRestNonce`
در دسترس باشد) و capability اختصاصی `manage_hojreh_pricing` هستند.

### 11.1) `GET /wp-json/hojreh/v1/patterns/{patternId}`

بازیابی یک pattern به همراه `revision` فعلی‌اش.

**پاسخ ۲۰۰:**

```json
{
  "revision": 12,
  "payload": { "...": "شکل کامل بخش ۶.۱" }
}
```

### 11.2) `POST /wp-json/hojreh/v1/patterns/{patternId}`

ذخیره کامل یک pattern (وقتی `status === 'green'` است). ورودی همان
`getPayload()` بخش ۶.۱ به‌همراه `base_revision` (بخش ۱۰.۳).

**بدنه درخواست:**

```json
{
  "base_revision": 12,
  "payload": { "schemaVersion": 2, "status": "green", "...": "..." }
}
```

**اعتبارسنجی ورودی (سمت سرور، اجباری):**

- `payload.status` باید دقیقاً `"green"` باشد؛ در غیر این‌صورت `422`.
- `payload.schemaVersion` باید نسخه‌ای باشد که سرور می‌شناسد (فعلاً `2`).
- هر `id` در `payload.dependencies.{variables,constants,roundings}` باید
  در کاتالوگ فعال موجود و `active: true` باشد؛ در غیر این‌صورت `422` با
  اشاره به id نامعتبر (enforcement سمت سرور بخش ۸، مستقل از فرانت‌اند).
- `payload.formula` باید با کامپایل مجدد `payload.ast` روی سرور (یا حداقل
  با اجرای همان regex/grammar بخش ۷) سازگار باشد — سرور نباید کورکورانه
  `formula` ارسالی را بدون بازبینی معتبر بداند.

**پاسخ ۲۰۰ (موفق):**

```json
{
  "ok": true,
  "revision": 13,
  "updatedAt": "2026-07-01T06:45:02.118Z"
}
```

**پاسخ ۴۲۲ (خطای اعتبارسنجی):**

```json
{
  "ok": false,
  "code": "validation_error",
  "message": "شناسه var9 در فرمول استفاده شده اما در کاتالوگ فعال یافت نشد.",
  "field": "dependencies.variables"
}
```

**پاسخ ۴۰۹ (تعارض همزمانی):**

```json
{
  "ok": false,
  "code": "revision_mismatch",
  "message": "این الگو از زمان بارگذاری شما توسط کاربر دیگری ذخیره شده است.",
  "current_revision": 14,
  "your_base_revision": 12,
  "current_payload": { "...": "آخرین نسخه معتبر روی سرور، برای نمایش diff یا reload" }
}
```

### 11.3) `POST /wp-json/hojreh/v1/patterns/bulk-sync`

ذخیره انبوه — استفاده اصلی: sync هزاران محصول بعد از یک عملیات تولید
headless (بخش ۹.۲ عملیات معکوس آن است: خواندن، نه نوشتن).

**بدنه درخواست:**

```json
{
  "patterns": [
    { "base_revision": 12, "payload": { "...": "..." } },
    { "base_revision": 4,  "payload": { "...": "..." } }
  ]
}
```

**پاسخ ۲۰۰ — نتیجه per-item، نه all-or-nothing:**

```json
{
  "results": [
    { "patternId": "401", "ok": true,  "revision": 13 },
    { "patternId": "402", "ok": false, "code": "revision_mismatch", "current_revision": 9, "your_base_revision": 4 }
  ]
}
```

### 11.4) `PATCH /wp-json/hojreh/v1/settings`

معادل REST برای `getDirtySettingsPayload()`. بدنه دقیقاً همان شکل بخش
۱۰.۳ (نسخه غنی‌شده با `base_revision` per-change) به‌علاوه `order_payload`
اختیاری (`{ save_mode: 'order', lists: [...] }` برای ترتیب آیتم‌ها).

**پاسخ ۲۰۰ — هر `change` جداگانه گزارش می‌شود:**

```json
{
  "results": [
    { "key": "variable.var1.var-default-price.مبلغ پیش‌فرض", "ok": true,  "revision": 8 },
    { "key": "constant.const1.percent-input.درصد", "ok": false, "code": "revision_mismatch", "current_revision": 3, "your_base_revision": 2 }
  ]
}
```

هیچ change موفقی به‌خاطر شکست change دیگر در همان درخواست rollback نمی‌شود؛
هر entity مستقلاً commit یا رد می‌شود.

### 11.5) `PATCH /wp-json/hojreh/v1/prices`

معادل REST برای `getDirtyPricesPayload()` صفحه «ویرایشگر قیمت». همان
شکل patch (`item_id`, `input_id`, `old_value`, `new_value`, `base_revision`)
و همان قرارداد پاسخ per-change بخش ۱۱.۴.

### 11.6) خلاصه کدهای خطا

| `code` | HTTP status | معنی |
|---|---|---|
| `validation_error` | 422 | payload/change ساختار یا محتوای نامعتبر دارد |
| `revision_mismatch` | 409 | `base_revision` ارسالی با `revision` فعلی سرور نمی‌خواند |
| `item_locked` | 422 | تلاش برای تغییر id/نام یک آیتم فعال (بخش ۸) |
| `item_in_use` | 422 | تلاش برای غیرفعال/حذف آیتمی که در یک الگوی فعال استفاده شده |
| `permission_denied` | 403 | کاربر بدون capability لازم |

---

## 12) واحدهای شمارش

واحدها در `window.HojrehUnits` و `HojrehFormulaEngine.getUnitOptions()`
یکپارچه شده‌اند. هر واحد جنس دارد؛ مثل:

- وزن: `میلی‌گرم`، `گرم`، `کیلوگرم`، `مثقال`
- تعداد: `عدد`، `بسته`، `جعبه`، `کارتن`، `دستگاه`، `قوطی`، `بطری`، `کیسه`
- حجم: `میلی‌لیتر`، `لیتر`، `سانتی‌متر مکعب`، `متر مکعب`
- طول: `متر`، `سانتی‌متر`
- مساحت: `متر مربع`

شبیه‌ساز بر اساس جنس واحد label درست تولید می‌کند؛ مثل:

- `وزن پسته احمدآقایی برشته زعفرانی ممتاز (کیلوگرم)`
- `تعداد بسته‌بندی شیشه‌ای 10*10*7 لوکس (عدد)`
- `قیمت هر کیلوگرم از پسته احمدآقایی برشته زعفرانی ممتاز`

---

### 12.1) نماد ثابت API در schemaVersion 2

برای متغیرهای `source: "api"`، شناسه قابل‌ویرایش فرمول (`id`) با نماد ثابت بازار یکی نیست.
فیلد `apiSymbol` (برای نمونه `USD`) باید مستقل ذخیره شود و هرگز با تغییر `id` بازنویسی نشود.
هر payload نسخه ۲ آرایه `apiSymbols` را نیز دارد که فقط نمادهای API واقعاً استفاده‌شده
در همان فرمول را شامل می‌شود. بک‌اند وردپرس باید اجتماع `apiSymbols` فرمول‌های فعال را
به لایه دریافت نرخ حجره بدهد؛ نه کل کاتالوگ و نه انتخاب‌های پنهان/غیرفعال را.

## 13) ایندکس‌های پیشنهادی برای محاسبه سریع ووکامرس

برای جلوگیری از کندی در فروشگاه‌های بزرگ، بک‌اند بهتر است این ایندکس‌ها را نگه دارد:

- `pattern_dependency_index`: وابستگی هر الگو به variables/constants/roundings
  (مستقیماً از `payload.dependencies` هر الگو ساخته می‌شود).
- `product_dynamic_pricing_index`: محصولاتی که قیمت پویا دارند و pattern فعال دارند.
- `product_variable_quantity_index`: مقدار هر متغیر برای هر محصول، مثل
  `product_id + variable_id + quantity`.
- `price_update_events`: رویداد تغییر قیمت متغیر مستقل یا API برای اجرای
  recalculation صفی.

وقتی قیمت یک متغیر تغییر کرد، بک‌اند از `pattern_dependency_index` الگوهای
وابسته و از `product_dynamic_pricing_index` محصولات وابسته را پیدا کند،
سپس با `program` (بخش ۵ و ۹) قیمت جدید را محاسبه و به WooCommerce اعلام
کند — به همان شکلی که در `hojreh_recalculate_on_rate_change()` (بخش ۹.۲)
نشان داده شد.

---

## 14) چرخه حیات کامل یک instance — مثال end-to-end

مقداردهی اولیه → تغییر → export payload → ارسال به وردپرس → پاکسازی.

### 14.1) مقداردهی اولیه (متصل به یک accordion در DOM)

```js
const container = document.querySelector('.accordion-item[data-id="401"]');

const instance = new HojrehPatternController('401', container, {
  patternName: 'الگوی ترکیب محصول و بسته‌بندی لوکس کادویی'
});

instance.render({ syncPreview: true });
```

### 14.2) مقداردهی اولیه headless (بدون DOM — مثلاً sync انبوه بک‌اند)

```js
const instance = new HojrehPatternController('woo_product_8842', null, {
  patternName: 'Auto-generated from WooCommerce product #8842',
  initialElements: existingAstFromDatabase // اختیاری، مثلاً هیدریت‌شده از wp_postmeta
});
```

ساخت هزاران instance به‌صورت هم‌زمان ارزان است — هر instance یک object graph
ساده است (state + چند timer handle)، نه یک subtree از DOM:

```js
const instances = wooProductIds.map(id =>
  HojrehPatternController.register(new HojrehPatternController(id))
);
// ۵٬۰۰۰ instance در کمتر از یک ثانیه و کاملاً ایزوله از هم ساخته می‌شوند.
```

### 14.3) تغییر برنامه‌ای الگو

```js
instance.setElements([
  { id: 1, type: 'variable', operator: '+', selectedId: 'var3',
    quantitySymbol: 'c', isGroup: false, innerElements: [] },
  { id: 2, type: 'variable', operator: '+', selectedId: 'var1',
    quantitySymbol: 'a', isGroup: false, innerElements: [] },
  { id: 3, type: 'rounding', operator: '+', selectedId: 'round1',
    isGroup: false, innerElements: [] }
]);

// یا از طریق API سمت ویرایشگر، که validate می‌کند و شکست را گزارش می‌دهد
// به‌جای throw کردن — امن هم برای دکمه‌های UI و هم اسکریپت‌های headless:
const result = instance.addElement('constant');
if (!result.ok) {
  console.warn('افزودن ثابت ممکن نشد:', result.reason);
}

instance.render({ syncPreview: true }); // فقط اگر instance.container ست شده باشد لازم است
```

### 14.4) Export کردن payload برای AJAX/REST وردپرس

```js
const payload = instance.getPayload();
```

`payload` دقیقاً مطابق schema بخش ۶.۱ همین فایل است.

### 14.5) ارسال به وردپرس

```js
async function savePattern(instance) {
  const payload = instance.getPayload();
  if (payload.status !== 'green') {
    // فقط 'green' باید نهایی ذخیره شود — بخش ۶.۲
    console.warn('الگو هنوز معتبر نیست، ذخیره رد شد:', payload.status);
    return;
  }

  const response = await fetch('/wp-json/hojreh/v1/patterns/' + instance.patternId, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-WP-Nonce': window.hojrehRestNonce
    },
    body: JSON.stringify({
      base_revision: instance.lastKnownRevision, // بخش ۱۰
      payload
    })
  });

  if (response.ok) instance.commitSnapshot(); // اسنپ‌شات dirty-tracking را پیش می‌برد
  return response.json();
}
```

### 14.6) Export انبوه (هزاران محصول هم‌زمان)

```js
const allPayloads = HojrehPatternController.all()
  .filter(c => c.state.status === 'green')
  .map(c => ({ base_revision: c.lastKnownRevision, payload: c.getPayload() }));

await fetch('/wp-json/hojreh/v1/patterns/bulk-sync', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.hojrehRestNonce },
  body: JSON.stringify({ patterns: allPayloads })
});
```

### 14.7) پاکسازی (وقتی یک accordion/ردیف محصول حذف می‌شود)

```js
instance.destroy(); // timerهایش را پاک و از registry استاتیک unregister می‌کند
```

---
