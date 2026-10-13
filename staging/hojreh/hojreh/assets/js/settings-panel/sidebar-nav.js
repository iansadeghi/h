/* ─── SMOOTH SIDEBAR SCROLLING & ACTIVE SECTION HIGHLIGHTING ─── */

function initSidebarNav() {
  const sidebarLinks = document.querySelectorAll('.sidebar-menu li a');
  const sections = document.querySelectorAll('.main > h1.section-title');
  const sidebarMenu = document.querySelector('.sidebar-menu');

  // Single floating pill that slides + resizes under whichever title is
  // active, instead of the background being toggled per-item (which
  // used to just pop off one item and appear on the other instantly).
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
    // getBoundingClientRect() on sidebarMenu is measured from its outer
    // border edge, but sidebarPill (position: absolute; top:0; left:0)
    // is anchored to sidebarMenu's *padding* edge — the box border-top
    // (3px dashed) sits between those two edges. Left uncorrected, the
    // pill lands exactly one border-width too high on every title.
    const menuStyle = getComputedStyle(sidebarMenu);
    const menuBorderTop = parseFloat(menuStyle.borderTopWidth) || 0;
    const menuBorderLeft = parseFloat(menuStyle.borderLeftWidth) || 0;
    // Rounding to whole CSS pixels here matters: at non-100% browser zoom,
    // getBoundingClientRect() returns fractional values that the browser
    // snaps to the physical pixel grid independently for each element —
    // textRect's snap and menuRect's snap don't always agree by the same
    // fraction. Left as raw floats, that mismatch shows up as the pill
    // being very slightly wider/narrower or offset than the text box it's
    // supposed to sit under, which reads as it "leaning" or "stretching"
    // toward one side at some zoom levels but not others. Rounding every
    // value the same way removes that mismatch instead of chasing it.
    const width = Math.round(textRect.width);
    const height = Math.round(textRect.height);
    const x = Math.round(textRect.left - menuRect.left - menuBorderLeft);
    const y = Math.round(textRect.top - menuRect.top - menuBorderTop);
    sidebarPill.style.width = `${width}px`;
    sidebarPill.style.height = `${height}px`;
    sidebarPill.style.transform = `translate(${x}px, ${y}px)`;
    sidebarPill.classList.add('is-visible');
  }

  // Momentary border-pinch + jelly settle on the dot of the item that
  // just became selected (re-triggerable even mid-animation).
  function popSidebarDot(link) {
    const dot = link && link.querySelector('.sidebar-dot');
    if (!dot) return;
    dot.classList.remove('dot-pop');
    void dot.offsetWidth; // force reflow so the animation can restart
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

  // Keep the pill aligned if the layout shifts (webfont swap, resize)
  const realignSidebarPill = () =>
    moveSidebarPill(document.querySelector('.sidebar-menu li a.active'));
  window.addEventListener('resize', realignSidebarPill);
  window.addEventListener('load', realignSidebarPill);
  realignSidebarPill();

  // sidebar-resizer.js changes the .sidebar element's own box (drag-resize,
  // collapse/show via the side button) without ever firing a window
  // 'resize' event, which is the only thing the listener above catches.
  // A ResizeObserver on the sidebar reacts to every actual size change
  // of that box directly — drag, show/hide, breakpoint switches — so the
  // pill re-syncs immediately instead of only "waking up" once the user
  // happens to scroll and something else triggers a recalculation.
  const sidebarEl = document.querySelector('.sidebar');
  if (window.ResizeObserver && sidebarEl) {
    const sidebarResizeObserver = new ResizeObserver(realignSidebarPill);
    sidebarResizeObserver.observe(sidebarEl);
    if (sidebarMenu) sidebarResizeObserver.observe(sidebarMenu);
  }
}

export { initSidebarNav };
