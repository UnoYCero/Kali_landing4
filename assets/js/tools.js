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
};

const openToolsDrawer = () => {
  toolsSidebar?.classList.add('is-open');
  toolsDrawerBackdrop?.classList.add('is-open');
  toolsMenuToggle?.setAttribute('aria-expanded', 'true');
};

syncHeaderHeight();
window.addEventListener('resize', () => {
  syncHeaderHeight();
  closeToolsDrawer();
});

if (toolsMenuToggle && toolsSidebar) {
  toolsMenuToggle.addEventListener('click', () => {
    const isOpen = toolsSidebar.classList.contains('is-open');
    if (isOpen) closeToolsDrawer(); else openToolsDrawer();
  });

  toolsDrawerBackdrop?.addEventListener('click', closeToolsDrawer);
  toolsSidebar.querySelectorAll('a').forEach((item) => item.addEventListener('click', closeToolsDrawer));
}
