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
    title: 'Impulsora de Negocios',
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
      { title: 'Semana 1 · Explosión de ideas', desc: 'Explora problemas, usuarios y dolores con ejercicios creativos.' },
      { title: 'Semana 2 · Diseño radical', desc: 'Define la propuesta de valor con design thinking radical.' },
      { title: 'Semana 3 · Prototipo express', desc: 'Construye y prueba un primer prototipo tangible o digital.' },
      { title: 'Semana 4 · Validación', desc: 'Testea con usuarios reales y recoge evidencia accionable.' },
      { title: 'Semana 5 · Iteración', desc: 'Refina la solución con mentorías 1:1 y feedback del panel.' },
      { title: 'Semana 6 · Demo ready', desc: 'Prepara un pitch y plan de siguientes pasos.' },
    ],
  },
  incubadora: {
    title: 'Incubadora de Ideas',
    badge: 'Cohort Negocios',
    color: 'var(--blue)',
    lead: 'Entiende el mercado, analiza las oportunidades, desarrolla tu modelo de negocio y aterriza tu idea.',
    videoUrl: 'https://www.youtube.com/embed/k_MmR4sfl_4',
    videoCaption: 'Explora la convocatoria de Incubadora en un vistazo rápido.',
    meta: ['Duración: 5 semanas', 'Modalidad: Híbrida', 'Enfoque: Idea + MVP'],
    includes: [
      'Mentorías con operadores y founders',
      'Unit economics y pricing',
      'Go-to-market',
      'Preparación para vender el proyecto',
    ],
    results: [
      'Métricas de tracción y funnel definidos',
      'Modelo financiero y unit economics claros',
      'Pitch deck listo',
    ],
    modules: [
      { title: 'Semana 1 · Problemática', desc: 'Analiza y valida tu problema.' },
      { title: 'Semana 2 · Entorno', desc: 'Evaluación de la oportunidad y creación del Benchmark.' },
      { title: 'Semana 3 · Estructura', desc: 'Estrategias de Marketing y técnicas de ideación.' },
      { title: 'Semana 4 · Producto', desc: 'Creación del primer MVP.' },
      { title: 'Semana 5 · Finanzas y unit economics', desc: 'Prorrateo y costos.' },
      { title: 'DEMO DAY · Go to market', desc: 'Business canvas y desarrollo de pitch.' },
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
  });

  const pdfSection = document.getElementById('programPdfSection');
  const pdfFrame = document.getElementById('programPdfFrame');
  if (pdfSection && pdfFrame) {
    if (type === 'impulsora') {
      pdfFrame.src = 'ROAD TO FUNDING - CONV.pdf';
      pdfSection.style.display = 'block';
    } else {
      pdfFrame.src = '';
      pdfSection.style.display = 'none';
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
