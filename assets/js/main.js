// ── Menu ─────────────────────────────────────────────────────────────────────
const menuToggle = document.getElementById('menuToggle');
const mainNav = document.getElementById('mainNav');
const bodyEl = document.body;

if (menuToggle && mainNav) {
  const toggleMenu = () => {
    const isOpen = mainNav.classList.toggle('open');
    menuToggle.classList.toggle('is-active', isOpen);
    menuToggle.setAttribute('aria-expanded', isOpen);
  };

  menuToggle.addEventListener('click', toggleMenu);
  mainNav.querySelectorAll('.nav-link').forEach((link) => {
    link.addEventListener('click', () => {
      if (mainNav.classList.contains('open')) toggleMenu();
    });
  });
  window.addEventListener('resize', () => {
    if (window.innerWidth > 960 && mainNav.classList.contains('open')) {
      mainNav.classList.remove('open');
      menuToggle.classList.remove('is-active');
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  });
}

// ── Program Details Overlay ───────────────────────────────────────────────────
const programOverlay = document.getElementById('programOverlay');
const closeProgramOverlay = document.getElementById('closeProgramOverlay');
const backToPrograms = document.getElementById('backToPrograms');
const programDetailTitle = document.getElementById('programDetailTitle');
const programDetailBadge = document.getElementById('programDetailBadge');
const programDetailLead = document.getElementById('programDetailLead');
const programDetailMeta = document.getElementById('programDetailMeta');
const programDetailIncludes = document.getElementById('programDetailIncludes');
const programDetailResults = document.getElementById('programDetailResults');
const programModules = document.getElementById('programModules');
const programMedia = document.getElementById('programMedia');
const programVideo = document.getElementById('programVideo');
const programVideoCaption = document.getElementById('programVideoCaption');
const applyTriggers = Array.from(document.querySelectorAll('[data-apply-trigger]'));

const programContent = {
  impulsora: {
    title: 'Impulsora: Road to Funding',
    badge: 'Cohort Creativo · Convocatoria Abierta',
    color: 'var(--yellow)',
    lead: 'Más que un programa, es una experiencia transformadora. Si tu idea te quita el sueño y sabes que va a cambiar las reglas del juego, esta es tu señal. Lleva tu proyecto desde su estado primitivo hasta un modelo ferozmente validado y listo para levantar rondas de capital. Únete a la rebelión y construye el futuro junto a los mejores operadores creativos.',
    videoUrl: 'https://www.youtube.com/embed/8vS1uxEV1T4',
    videoCaption: 'Conoce la convocatoria de Impulsora en 45 segundos.',
    meta: ['Duración: 6 semanas', 'Modalidad: Híbrida', 'Enfoque: Creatividad + Prototipado'],
    includes: [
      'Sprints de Design Thinking radical',
      'Laboratorios de ideación asistida',
      'Prototipado express con expertos',
      'Pitch inicial y retroalimentación',
    ],
    results: [
      'Hipótesis de problema/solución validadas',
      'Primer prototipo funcional o storyboard',
      'Mapa de riesgos y próximos experimentos',
    ],
    modules: [
      { title: 'Módulo 1', desc: 'Estudio de mercado' },
      { title: 'Módulo 2', desc: 'Operatividad del negocio' },
      { title: 'Módulo 3', desc: 'Redes sociales y marketing' },
      { title: 'Módulo 4', desc: 'Gobierno corporativo' },
      { title: 'Módulo 5', desc: 'Proyecciones financieras' },
    ],
  },
  incubadora: {
    title: 'Incubadora: First Steps',
    badge: 'Cohort Negocios',
    color: 'var(--blue)',
    lead: 'Road to Funding es un programa intensivo de 10 semanas diseñado para emprendedores que buscan estructurar su negocio y prepararse para levantar capital. A través de acompañamiento práctico, desarrollarás los elementos clave para presentar tu proyecto de forma sólida ante inversionistas.',
    videoUrl: 'https://www.youtube.com/embed/k_MmR4sfl_4',
    videoCaption: 'Explora la convocatoria de Incubadora en un vistazo rápido.',
    meta: ['Duración: 10 semanas', 'Modalidad: Híbrida', 'Enfoque: Estructuración y Capital'],
    includes: [
      'Acompañamiento práctico paso a paso',
      'Desarrollo de elementos clave para inversionistas',
      'Preparación de Pitch y Unit Economics',
    ],
    results: [
      'Proyecciones financieras estructuradas',
      'Estructura de gobierno corporativo',
      'Listo para levantar capital',
    ],
    modules: [
      { title: 'Módulo 1', desc: 'Estudio de mercado' },
      { title: 'Módulo 2', desc: 'Operatividad del negocio' },
      { title: 'Módulo 3', desc: 'Redes sociales y marketing' },
      { title: 'Módulo 4', desc: 'Gobierno corporativo' },
      { title: 'Módulo 5', desc: 'Proyecciones financieras' },
    ],
  },
};

const renderProgramDetails = (type) => {
  const data = programContent[type];
  if (!data) return;

  programDetailTitle.textContent = data.title;
  programDetailBadge.textContent = data.badge;
  programDetailBadge.style.borderColor = data.color;
  programDetailBadge.style.color = data.color;
  programDetailLead.textContent = data.lead;

  programDetailMeta.innerHTML = '';
  data.meta.forEach((item) => {
    const chip = document.createElement('div');
    chip.className = 'program-detail-chip';
    chip.textContent = item;
    programDetailMeta.appendChild(chip);
  });

  programDetailIncludes.innerHTML = '';
  data.includes.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    programDetailIncludes.appendChild(li);
  });

  programDetailResults.innerHTML = '';
  data.results.forEach((item) => {
    const li = document.createElement('li');
    li.textContent = item;
    programDetailResults.appendChild(li);
  });

  if (programMedia && programVideo) {
    if (data.videoUrl) {
      programVideo.src = data.videoUrl;
      programVideoCaption.textContent = data.videoCaption || 'Conoce la convocatoria en video.';
      programMedia.classList.remove('d-none');
    } else {
      programVideo.src = '';
      programMedia.classList.add('d-none');
    }
  }

  programModules.innerHTML = '';
  data.modules.forEach((module) => {
    const wrapper = document.createElement('article');
    wrapper.className = 'program-module';
    const title = document.createElement('strong');
    title.textContent = module.title;
    const desc = document.createElement('p');
    desc.textContent = module.desc;
    wrapper.appendChild(title);
    wrapper.appendChild(desc);
    programModules.appendChild(wrapper);
  });

  const downloadPdfBtn = document.getElementById('downloadPdfBtn');
  if (downloadPdfBtn) {
    if (type === 'impulsora') {
      downloadPdfBtn.style.display = 'inline-block';
    } else {
      downloadPdfBtn.style.display = 'none';
    }
  }
};

const openProgramDetails = (type) => {
  renderProgramDetails(type);
  programOverlay?.classList.add('active');
  programOverlay?.setAttribute('aria-hidden', 'false');
  bodyEl.style.overflow = 'hidden';
};

const closeProgramDetails = () => {
  programOverlay?.classList.remove('active');
  programOverlay?.setAttribute('aria-hidden', 'true');
  bodyEl.style.overflow = '';
  if (programVideo) programVideo.src = '';
};

applyTriggers.forEach((btn) => {
  btn.addEventListener('click', (e) => {
    const type = e.currentTarget.dataset.program || 'impulsora';
    openProgramDetails(type);
  });
});

closeProgramOverlay?.addEventListener('click', closeProgramDetails);
backToPrograms?.addEventListener('click', closeProgramDetails);
programOverlay?.addEventListener('click', (e) => {
  if (e.target === programOverlay) closeProgramDetails();
});

// ── Narrativa Modal ───────────────────────────────────────────────────────────
const narrativaOverlay = document.getElementById('narrativaOverlay');
const openNarrativaBtn = document.getElementById('openNarrativa');
const closeNarrativaBtn = document.getElementById('closeNarrativa');

const openNarrativaModal = () => {
  narrativaOverlay?.classList.add('active');
  narrativaOverlay?.setAttribute('aria-hidden', 'false');
  bodyEl.style.overflow = 'hidden';
};

const closeNarrativaModal = () => {
  narrativaOverlay?.classList.remove('active');
  narrativaOverlay?.setAttribute('aria-hidden', 'true');
  bodyEl.style.overflow = '';
};

openNarrativaBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  openNarrativaModal();
});
closeNarrativaBtn?.addEventListener('click', closeNarrativaModal);
narrativaOverlay?.addEventListener('click', (e) => {
  if (e.target === narrativaOverlay) closeNarrativaModal();
});

// ── Carousel ──────────────────────────────────────────────────────────────────
const carouselTrack = document.getElementById('carouselTrack');
const carouselPrev = document.getElementById('carouselPrev');
const carouselNext = document.getElementById('carouselNext');
const carouselDotsContainer = document.getElementById('carouselDots');

if (carouselTrack && carouselDotsContainer) {
  const slides = Array.from(carouselTrack.querySelectorAll('.carousel-slide'));
  let currentSlide = 0;

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'carousel-dot';
    dot.setAttribute('aria-label', `Imagen ${i + 1}`);
    dot.addEventListener('click', () => goToSlide(i));
    carouselDotsContainer.appendChild(dot);
  });

  const dots = Array.from(carouselDotsContainer.querySelectorAll('.carousel-dot'));

  const goToSlide = (index) => {
    currentSlide = ((index % slides.length) + slides.length) % slides.length;
    carouselTrack.style.transform = `translateX(-${currentSlide * 100}%)`;
    dots.forEach((dot, i) => dot.classList.toggle('active', i === currentSlide));
  };

  goToSlide(0);

  carouselPrev?.addEventListener('click', () => goToSlide(currentSlide - 1));
  carouselNext?.addEventListener('click', () => goToSlide(currentSlide + 1));

  let touchStartX = 0;
  carouselTrack.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
  }, { passive: true });
  carouselTrack.addEventListener('touchend', (e) => {
    const diff = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) goToSlide(diff > 0 ? currentSlide + 1 : currentSlide - 1);
  });
}

// ── ESC key ───────────────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (programOverlay?.classList.contains('active')) closeProgramDetails();
    if (narrativaOverlay?.classList.contains('active')) closeNarrativaModal();
  }
});

// ── IntersectionObserver ──────────────────────────────────────────────────────
const animatedElements = document.querySelectorAll(
  '.card, .timeline-item, .testimonial-card, .program-card, .que-es-card'
);
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add('in-view');
    });
  },
  { threshold: 0.2 }
);
animatedElements.forEach((el) => observer.observe(el));

// ── Hero tilt ─────────────────────────────────────────────────────────────────
const hero = document.querySelector('.hero');
hero?.addEventListener('mousemove', (e) => {
  const rect = hero.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width - 0.5) * 20;
  const y = ((e.clientY - rect.top) / rect.height - 0.5) * 20;
  hero.style.setProperty('--tilt-x', `${y}px`);
  hero.style.setProperty('--tilt-y', `${-x}px`);
});
hero?.addEventListener('mouseleave', () => {
  hero.style.setProperty('--tilt-x', '0px');
  hero.style.setProperty('--tilt-y', '0px');
});
