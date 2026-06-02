const toolsMenuToggle = document.getElementById('toolsMenuToggle');
const toolsSidebar = document.getElementById('toolsSidebar');
const toolsDrawerBackdrop = document.getElementById('toolsDrawerBackdrop');
const header = document.querySelector('.main-header');

const syncHeaderHeight = () => {
  if (!header) return;
  document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`);
};

const closeToolsDrawer = () => {
  toolsSidebar?.classList.remove('is-open');
  toolsDrawerBackdrop?.classList.remove('is-open');
  toolsMenuToggle?.setAttribute('aria-expanded', 'false');
  toolsMenuToggle?.classList.remove('is-hidden');
};

const openToolsDrawer = () => {
  toolsSidebar?.classList.add('is-open');
  toolsDrawerBackdrop?.classList.add('is-open');
  toolsMenuToggle?.setAttribute('aria-expanded', 'true');
  toolsMenuToggle?.classList.add('is-hidden');
};

syncHeaderHeight();
window.addEventListener('resize', () => {
  syncHeaderHeight();
  closeToolsDrawer();
});

if (toolsMenuToggle && toolsSidebar) {
  toolsMenuToggle.addEventListener('click', () => {
    const isOpen = toolsSidebar.classList.contains('is-open');
    if (isOpen) {
      closeToolsDrawer();
    } else {
      openToolsDrawer();
    }
  });

  toolsDrawerBackdrop?.addEventListener('click', closeToolsDrawer);
  
  // Close drawer when clicking any link inside the sidebar
  toolsSidebar.querySelectorAll('a').forEach((item) => {
    item.addEventListener('click', closeToolsDrawer);
  });
}

// Close drawer if user presses Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeToolsDrawer();
  }
});
