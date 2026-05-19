const toolsMenuToggle = document.getElementById('toolsMenuToggle');
const toolsSidebar = document.getElementById('toolsSidebar');
const header = document.querySelector('.main-header');

const syncHeaderHeight = () => {
  if (!header) return;
  const headerHeight = `${header.offsetHeight}px`;
  document.documentElement.style.setProperty('--header-height', headerHeight);
};

syncHeaderHeight();
window.addEventListener('resize', syncHeaderHeight);

if (toolsMenuToggle && toolsSidebar) {
  toolsMenuToggle.addEventListener('click', () => {
    const isOpen = toolsSidebar.classList.toggle('is-open');
    toolsMenuToggle.setAttribute('aria-expanded', String(isOpen));
    toolsMenuToggle.classList.toggle('is-open', isOpen);
  });
}
