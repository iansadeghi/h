let priceEditorSearchAnim;
(function () {
  'use strict';
  var SLIDE_OUT_DURATION = 260;  
  var SLIDE_IN_DURATION  = 320;  
  var FOCUS_DELAY        = 320;  
  var mainHeader  = document.getElementById('mainHeader');
  var searchInput = document.getElementById('pricingSearchInput');
  if (!mainHeader) return;
  function animateOpen() {
    if (mainHeader.classList.contains('search-mode') ||
        mainHeader.classList.contains('search-entering')) return;
    mainHeader.classList.add('search-entering');
    setTimeout(function () {
      mainHeader.classList.remove('search-entering');
      mainHeader.classList.add('search-mode');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
        });
      });
      setTimeout(function () {
        if (searchInput) searchInput.focus();
      }, FOCUS_DELAY);
    }, SLIDE_OUT_DURATION);
  }
  function animateClose(onDone) {
    if (!mainHeader.classList.contains('search-mode')) {
      if (typeof onDone === 'function') onDone();
      return;
    }
    mainHeader.classList.remove('search-mode');
    mainHeader.classList.add('search-closing');
    setTimeout(function () {
      mainHeader.classList.remove('search-closing');
      mainHeader.classList.add('search-closing-end');
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
        });
      });
      setTimeout(function () {
        mainHeader.classList.remove('search-closing-end');
        if (typeof onDone === 'function') onDone();
      }, SLIDE_IN_DURATION);
    }, SLIDE_OUT_DURATION);
  }
  priceEditorSearchAnim = {
    open:  animateOpen,
    close: animateClose
  };
})();
export { priceEditorSearchAnim };
