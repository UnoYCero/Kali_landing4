(function () {
  const menuToggle = document.getElementById("menuToggle");
  const mainNav = document.getElementById("mainNav");

  if (menuToggle && mainNav && !mainNav.dataset.menuBound) {
    const toggleMenu = () => {
      const isOpen = mainNav.classList.toggle("open");
      menuToggle.classList.toggle("is-active", isOpen);
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    };

    menuToggle.addEventListener("click", toggleMenu);

    mainNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (mainNav.classList.contains("open")) {
          toggleMenu();
        }
      });
    });

    window.addEventListener("resize", () => {
      if (window.innerWidth > 960 && mainNav.classList.contains("open")) {
        mainNav.classList.remove("open");
        menuToggle.classList.remove("is-active");
        menuToggle.setAttribute("aria-expanded", "false");
      }
    });

    mainNav.dataset.menuBound = "true";
  }

  if (mainNav) {
    const currentPath = window.location.pathname.split("/").pop() || "index.html";
    mainNav.querySelectorAll("a[href]").forEach((link) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      const linkPath = href.split("/").pop();
      if (linkPath === currentPath) {
        link.setAttribute("aria-current", "page");
      }
    });
  }
})();
