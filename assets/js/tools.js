const toolsSidebar = document.getElementById('toolsSidebar');
const toolsDrawerBackdrop = document.getElementById('toolsDrawerBackdrop');
const header = document.querySelector('.main-header');

const toolsMenuToggles = Array.from(document.querySelectorAll('.tools-hamburger'));
const toolsPrimaryToggle = toolsMenuToggles[0] || null;

if (toolsMenuToggles.length > 1) {
  toolsMenuToggles.slice(1).forEach((btn) => btn.remove());
}

const syncHeaderHeight = () => {
  if (!header) return;
  document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`);
};

const setToggleHidden = (hidden) => {
  if (!toolsPrimaryToggle) return;
  toolsPrimaryToggle.classList.toggle('is-hidden', hidden);
};

const closeToolsDrawer = () => {
  toolsSidebar?.classList.remove('is-open');
  toolsDrawerBackdrop?.classList.remove('is-open');
  toolsPrimaryToggle?.setAttribute('aria-expanded', 'false');
  setToggleHidden(false);
};

const openToolsDrawer = () => {
  toolsSidebar?.classList.add('is-open');
  toolsDrawerBackdrop?.classList.add('is-open');
  toolsPrimaryToggle?.setAttribute('aria-expanded', 'true');
  setToggleHidden(true);
};

syncHeaderHeight();
window.addEventListener('resize', () => {
  syncHeaderHeight();
  closeToolsDrawer();
});

if (toolsPrimaryToggle && toolsSidebar) {
  toolsPrimaryToggle.addEventListener('click', () => {
    const isOpen = toolsSidebar.classList.contains('is-open');
    if (isOpen) closeToolsDrawer(); else openToolsDrawer();
  });

  toolsDrawerBackdrop?.addEventListener('click', closeToolsDrawer);
  toolsSidebar.querySelectorAll('a').forEach((item) => item.addEventListener('click', closeToolsDrawer));
}
