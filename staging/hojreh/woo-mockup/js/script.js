function showTab(e, id){
  e.preventDefault();
  document.querySelectorAll('.product_data_tabs .tab-item').forEach(item=>item.classList.remove('active'));
  e.target.closest('.tab-item').classList.add('active');
  document.querySelectorAll('.wc-panel').forEach(p=>p.classList.add('hidden'));
  document.getElementById('tab-'+id).classList.remove('hidden');
  return false;
}

/* Switch between "محصول ساده" (simple) and "محصول متغیر" (variable).
   Toggles the .variable-active class on the product-data box, which drives
   (via CSS) hiding the "همگانی" pricing tab + showing the "متغیر‌ها" tab
   and the per-attribute "استفاده برای متغیر‌ها" checkboxes. */
function setProductType(e, type){
  e.preventDefault();
  var box = document.getElementById('product-data-box');
  if(!box) return false;

  document.querySelectorAll('.product-type-switch li').forEach(function(li){
    li.classList.toggle('active', li.getAttribute('data-type') === type);
  });

  var isVariable = (type === 'variable');
  box.classList.toggle('variable-active', isVariable);

  var activeTab = box.querySelector('.product_data_tabs .tab-item.active');
  var activeKey = activeTab ? activeTab.getAttribute('data-tab') : null;

  if(isVariable && activeKey === 'general'){
    // "همگانی" no longer exists for variable products, jump to "متغیر‌ها"
    var variationsLink = box.querySelector('.tab-item[data-tab="variations"] a');
    if(variationsLink){ showTab({preventDefault:function(){}, target:variationsLink}, 'variations'); }
  } else if(!isVariable && activeKey === 'variations'){
    // going back to simple: "متغیر‌ها" no longer exists, jump back to "همگانی"
    var generalLink = box.querySelector('.tab-item[data-tab="general"] a');
    if(generalLink){ showTab({preventDefault:function(){}, target:generalLink}, 'general'); }
  }

  return false;
}

/* Expand/collapse a single variation row inside the "متغیر‌ها" tab */
function toggleVariation(e){
  e.preventDefault();
  var item = e.target.closest('.variation-item');
  if(!item) return false;
  item.classList.toggle('open');
  var body = item.querySelector('.variation-item-body');
  if(body) body.classList.toggle('hidden');
  return false;
}

/* On mobile, each panel moves inside its own tab-item so the tab list becomes
   an accordion (header immediately followed by its own content). On desktop
   the panels move back into the shared .wc-panels area for the classic tab layout. */
function setupProductTabsLayout(){
  var tabsList = document.querySelector('.product_data_tabs');
  var panelsContainer = document.querySelector('.wc-panels');
  if(!tabsList || !panelsContainer) return;

  var items = Array.prototype.slice.call(tabsList.querySelectorAll('.tab-item'));
  var mq = window.matchMedia('(max-width: 782px)');

  function applyLayout(isMobile){
    items.forEach(function(item){
      var key = item.getAttribute('data-tab');
      var panel = document.getElementById('tab-' + key);
      if(!panel) return;
      if(isMobile){
        item.appendChild(panel);
      } else {
        panelsContainer.appendChild(panel);
      }
    });
  }

  applyLayout(mq.matches);
  if(mq.addEventListener){
    mq.addEventListener('change', function(e){ applyLayout(e.matches); });
  } else if(mq.addListener){
    mq.addListener(function(e){ applyLayout(e.matches); });
  }
}

document.addEventListener('DOMContentLoaded', function(){
  var toggle = document.querySelector('.menu-toggle');
  var menu = document.getElementById('adminmenu');
  var overlay = document.getElementById('menu-overlay');
  var closeBtn = document.getElementById('menu-close');

  function openMenu(){
    menu.classList.add('open');
    overlay.classList.add('open');
    closeBtn.classList.add('open');
  }
  function closeMenu(){
    menu.classList.remove('open');
    overlay.classList.remove('open');
    closeBtn.classList.remove('open');
  }

  if(toggle){
    toggle.addEventListener('click', function(){
      if(menu.classList.contains('open')){
        closeMenu();
      } else {
        openMenu();
      }
    });
  }
  if(overlay){ overlay.addEventListener('click', closeMenu); }
  if(closeBtn){ closeBtn.addEventListener('click', closeMenu); }

  setupProductTabsLayout();
});
