function initSidebarNav() {
  const sidebarLinks = document.querySelectorAll('.sidebar-menu li a');
  const sections = document.querySelectorAll('.main > h1.section-title');
  const sidebarMenu = document.querySelector('.sidebar-menu');
  let sidebarPill = null;
  if (sidebarMenu) {
    sidebarPill = document.createElement('div');
    sidebarPill.className = 'sidebar-pill';
    sidebarMenu.insertBefore(sidebarPill, sidebarMenu.firstChild);
  }
  function moveSidebarPill(link) {
    if (!sidebarPill || !sidebarMenu || !link) return;
    const textEl = link.querySelector('.sidebar-text');
    if (!textEl) return;
    const menuRect = sidebarMenu.getBoundingClientRect();
    const textRect = textEl.getBoundingClientRect();
    const menuStyle = getComputedStyle(sidebarMenu);
    const menuBorderTop = parseFloat(menuStyle.borderTopWidth) || 0;
    const menuBorderLeft = parseFloat(menuStyle.borderLeftWidth) || 0;
    const width = Math.round(textRect.width);
    const height = Math.round(textRect.height);
    const x = Math.round(textRect.left - menuRect.left - menuBorderLeft);
    const y = Math.round(textRect.top - menuRect.top - menuBorderTop);
    sidebarPill.style.width = `${width}px`;
    sidebarPill.style.height = `${height}px`;
    sidebarPill.style.transform = `translate(${x}px, ${y}px)`;
    sidebarPill.classList.add('is-visible');
  }
  function popSidebarDot(link) {
    const dot = link && link.querySelector('.sidebar-dot');
    if (!dot) return;
    dot.classList.remove('dot-pop');
    void dot.offsetWidth; 
    dot.classList.add('dot-pop');
  }
  function setActiveSidebarLink(link) {
    if (!link) return;
    if (link.classList.contains('active')) {
      moveSidebarPill(link);
      return;
    }
    sidebarLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');
    moveSidebarPill(link);
    popSidebarDot(link);
  }
  sidebarLinks.forEach(link => {
    link.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (targetId && targetId.startsWith('#')) {
        e.preventDefault();
        const targetSection = document.getElementById(targetId.substring(1));
        if (targetSection) {
          window.scrollTo({
            top: targetSection.offsetTop - 85,
            behavior: 'smooth'
          });
          setActiveSidebarLink(this);
        }
      }
    });
  });
  window.addEventListener('scroll', () => {
    let currentSectionId = '';
    const scrollPos = window.scrollY + 120;
    sections.forEach(sec => {
      if (scrollPos >= sec.offsetTop) {
        currentSectionId = sec.getAttribute('id');
      }
    });
    if (currentSectionId) {
      const match = Array.from(sidebarLinks)
        .find(link => link.getAttribute('href') === `#${currentSectionId}`);
      if (match) setActiveSidebarLink(match);
    }
  });
  const realignSidebarPill = () =>
    moveSidebarPill(document.querySelector('.sidebar-menu li a.active'));
  window.addEventListener('resize', realignSidebarPill);
  window.addEventListener('load', realignSidebarPill);
  realignSidebarPill();
  const sidebarEl = document.querySelector('.sidebar');
  if (window.ResizeObserver && sidebarEl) {
    const sidebarResizeObserver = new ResizeObserver(realignSidebarPill);
    sidebarResizeObserver.observe(sidebarEl);
    if (sidebarMenu) sidebarResizeObserver.observe(sidebarMenu);
  }
}
export { initSidebarNav };
