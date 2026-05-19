const toolsMenuToggle = document.getElementById('toolsMenuToggle');
const toolsSidebar = document.getElementById('toolsSidebar');

if (toolsMenuToggle && toolsSidebar) {
  toolsMenuToggle.addEventListener('click', () => {
    const isOpen = toolsSidebar.classList.toggle('is-open');
    toolsMenuToggle.setAttribute('aria-expanded', String(isOpen));
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 960) {
      toolsSidebar.classList.remove('is-open');
      toolsMenuToggle.setAttribute('aria-expanded', 'false');
    }
  });
}
