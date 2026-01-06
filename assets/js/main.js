// Nueva función para scroll suave sin afectar la URL
function smoothScroll(id) {
  const element = document.getElementById(id);
  if (element) {
    element.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}

const formOverlay = document.getElementById("formOverlay");
const applyTriggers = Array.from(
  document.querySelectorAll("[data-apply-trigger]")
);
const programOverlay = document.getElementById("programOverlay");
const closeProgramOverlay = document.getElementById("closeProgramOverlay");
const backToPrograms = document.getElementById("backToPrograms");
const startRegistrationButton = document.getElementById("startRegistrationButton");
const programDetailTitle = document.getElementById("programDetailTitle");
const programDetailBadge = document.getElementById("programDetailBadge");
const programDetailLead = document.getElementById("programDetailLead");
const programDetailMeta = document.getElementById("programDetailMeta");
const programDetailIncludes = document.getElementById("programDetailIncludes");
const programDetailResults = document.getElementById("programDetailResults");
const programModules = document.getElementById("programModules");
const menuToggle = document.getElementById("menuToggle");
const mainNav = document.getElementById("mainNav");
const closeForm = document.getElementById("closeForm");
const form = document.getElementById("cohortForm");
const steps = Array.from(document.querySelectorAll(".form-step"));
const nextButton = document.getElementById("nextStep");
const prevButton = document.getElementById("prevStep");
const submitButton = document.getElementById("submitForm");
const progressBar = document.getElementById("progressBar");
const progressMessage = document.getElementById("progressMessage");
const successMessage = document.getElementById("successMessage");
const closeSuccess = document.getElementById("closeSuccess");
const inventorCards = Array.from(document.querySelectorAll(".inventor-card"));
const tipoInventorInput = document.getElementById("tipoInventor");
const colorCards = Array.from(document.querySelectorAll(".color-card"));
const colorAreaInput = document.getElementById("colorArea");
const acceptTermsButton = document.getElementById("acceptTermsButton");
const termsAcceptedInput = document.getElementById("termsAccepted");
const termsLink = document.getElementById("viewTermsLink");
const termsContent = document.getElementById("termsContent");

// Elementos para lógica condicional
const formTitle = document.getElementById("formTitle");
const programBadge = document.getElementById("programBadge");
const programInput = document.getElementById("programSelection");
const successProgramName = document.getElementById("successProgramName");
const formNameInput = form.querySelector('input[name="form-name"]');
const bodyEl = document.body;

let currentStep = 0;
const totalSteps = steps.length;
const progressPhrases = [
  "Tu locura se está incubando…",
  "Casi listo para romper el molde…",
  "Bienvenido al Kaleidoscopio.",
];
const submitDefaultText = "Enviar Aplicación";
const submittingText = "Enviando…";

if (menuToggle && mainNav) {
  const toggleMenu = () => {
    const isOpen = mainNav.classList.toggle("open");
    menuToggle.classList.toggle("is-active", isOpen);
    menuToggle.setAttribute("aria-expanded", isOpen);
  };

  menuToggle.addEventListener("click", toggleMenu);

  mainNav.querySelectorAll(".nav-link").forEach((link) => {
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
}

const triggerForm = (event) => {
  const button = event.currentTarget;
  const programType = button.dataset.program || "impulsora";

  openProgramDetails(programType);
};

const programContent = {
  impulsora: {
    title: "Impulsora de Ideas",
    badge: "Cohort Creativo",
    color: "var(--yellow)",
    lead:
      "Lleva tu idea desde una servilleta a un prototipo validado con sesiones guiadas y mentorías aplicadas.",
    meta: ["Duración: 6 semanas", "Modalidad: Híbrida", "Enfoque: Creatividad + Prototipado"],
    includes: [
      "Sprints de Design Thinking radical",
      "Laboratorios de ideación asistida",
      "Prototipado express con expertos",
      "Pitch inicial y retroalimentación",
    ],
    results: [
      "Hipótesis de problema/solución validadas",
      "Primer prototipo funcional o storyboard",
      "Mapa de riesgos y próximos experimentos",
    ],
    modules: [
      { title: "Semana 1 · Explosión de ideas", desc: "Explora problemas, usuarios y dolores con ejercicios creativos." },
      { title: "Semana 2 · Diseño radical", desc: "Define la propuesta de valor con design thinking radical." },
      { title: "Semana 3 · Prototipo express", desc: "Construye y prueba un primer prototipo tangible o digital." },
      { title: "Semana 4 · Validación", desc: "Testea con usuarios reales y recoge evidencia accionable." },
      { title: "Semana 5 · Iteración", desc: "Refina la solución con mentorías 1:1 y feedback del panel." },
      { title: "Semana 6 · Demo ready", desc: "Prepara un pitch y plan de siguientes pasos." },
    ],
  },
  incubadora: {
    title: "Incubadora de Negocios",
    badge: "Cohort Negocios",
    color: "var(--blue)",
    lead:
      "Escala tu MVP con estrategia comercial, métricas claras y preparación para inversión.",
    meta: ["Duración: 8 semanas", "Modalidad: Híbrida", "Enfoque: Negocio + Tracción"],
    includes: [
      "Mentorías con operadores y founders",
      "Unit economics y pricing",
      "Go-to-market y growth loops",
      "Preparación para inversión ángel",
    ],
    results: [
      "Métricas de tracción y funnel definidos",
      "Modelo financiero y unit economics claros",
      "Pitch deck listo para inversionistas",
    ],
    modules: [
      { title: "Semana 1 · Diagnóstico de negocio", desc: "Revisa tu MVP, mercado y propuesta de valor." },
      { title: "Semana 2 · Estrategia comercial", desc: "Define ICP, pricing y canales prioritarios." },
      { title: "Semana 3 · Métricas y datos", desc: "Establece KPIs, funnels y tableros de seguimiento." },
      { title: "Semana 4 · Producto + crecimiento", desc: "Refina features claves y experimentos de crecimiento." },
      { title: "Semana 5 · Finanzas y unit economics", desc: "Modela ingresos, costos y runway." },
      { title: "Semana 6 · Equipo y operación", desc: "Roles, procesos y cadencias para escalar." },
      { title: "Semana 7 · Pitch e inversión", desc: "Prepara deck, narrativa e inversión ángel." },
      { title: "Semana 8 · Demo y plan 90 días", desc: "Roadmap claro y compromisos de seguimiento." },
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

  programDetailMeta.innerHTML = "";
  data.meta.forEach((item) => {
    const chip = document.createElement("div");
    chip.className = "program-detail-chip";
    chip.textContent = item;
    programDetailMeta.appendChild(chip);
  });

  programDetailIncludes.innerHTML = "";
  data.includes.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    programDetailIncludes.appendChild(li);
  });

  programDetailResults.innerHTML = "";
  data.results.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    programDetailResults.appendChild(li);
  });

  programModules.innerHTML = "";
  data.modules.forEach((module) => {
    const wrapper = document.createElement("article");
    wrapper.className = "program-module";
    const title = document.createElement("strong");
    title.textContent = module.title;
    const desc = document.createElement("p");
    desc.textContent = module.desc;
    wrapper.appendChild(title);
    wrapper.appendChild(desc);
    programModules.appendChild(wrapper);
  });

  startRegistrationButton.dataset.program = type;
};

const openProgramDetails = (type) => {
  renderProgramDetails(type);
  programOverlay?.classList.add("active");
  programOverlay?.setAttribute("aria-hidden", "false");
  bodyEl.style.overflow = "hidden";
};

const closeProgramDetails = () => {
  programOverlay?.classList.remove("active");
  programOverlay?.setAttribute("aria-hidden", "true");
  bodyEl.style.overflow = "";
};

const configureFormForProgram = (type) => {
  resetForm();
  programInput.value = type;
  const formName =
    type === "incubadora" ? "cohort-incubadora" : "cohort-impulsora";
  formNameInput.value = formName;
  form.setAttribute("name", formName);

  if (type === "incubadora") {
    formTitle.textContent = "Aplicación Incubadora";
    programBadge.textContent = "Cohort Negocios";
    programBadge.style.borderColor = "var(--blue)";
    programBadge.style.color = "var(--blue)";
    successProgramName.textContent = "Incubadora de Negocios";
  } else {
    formTitle.textContent = "Aplicación Impulsora";
    programBadge.textContent = "Cohort Creativo";
    programBadge.style.borderColor = "var(--yellow)";
    programBadge.style.color = "var(--yellow)";
    successProgramName.textContent = "Impulsora de Ideas";
  }

  const conditionalFields = document.querySelectorAll("[data-show-if]");
  conditionalFields.forEach((field) => {
    const condition = field.dataset.showIf;
    const inputs = field.querySelectorAll("input, textarea, select");

    if (condition === type) {
      field.classList.remove("d-none");
      inputs.forEach((i) => (i.disabled = false));
    } else {
      field.classList.add("d-none");
      inputs.forEach((i) => (i.disabled = true));
    }
  });
};

const closeOverlay = () => {
  formOverlay.classList.remove("active");
  formOverlay.setAttribute("aria-hidden", "true");
  bodyEl.style.overflow = "";
  resetForm();
};

applyTriggers.forEach((btn) => {
  btn.addEventListener("click", triggerForm);
});

startRegistrationButton?.addEventListener("click", (event) => {
  const programType = event.currentTarget.dataset.program || "impulsora";
  closeProgramDetails();
  configureFormForProgram(programType);
  formOverlay.classList.add("active");
  formOverlay.setAttribute("aria-hidden", "false");
  bodyEl.style.overflow = "hidden";
});

closeProgramOverlay?.addEventListener("click", closeProgramDetails);
backToPrograms?.addEventListener("click", closeProgramDetails);

programOverlay?.addEventListener("click", (event) => {
  if (event.target === programOverlay) {
    closeProgramDetails();
  }
});

closeForm.addEventListener("click", closeOverlay);
formOverlay.addEventListener("click", (event) => {
  if (event.target === formOverlay) {
    closeOverlay();
  }
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && formOverlay.classList.contains("active")) {
    closeOverlay();
  }
});

const updateStepVisibility = () => {
  steps.forEach((step, index) => {
    step.classList.toggle("active", index === currentStep);
  });

  prevButton.style.display = currentStep === 0 ? "none" : "inline-flex";
  const isLastStep = currentStep === totalSteps - 1;
  nextButton.style.display = isLastStep ? "none" : "inline-flex";
  submitButton.style.display = isLastStep ? "inline-flex" : "none";

  const progressRatio = (currentStep + 1) / totalSteps;
  progressBar.style.width = `${Math.round(progressRatio * 100)}%`;

  if (progressRatio < 0.45) {
    progressMessage.textContent = progressPhrases[0];
  } else if (progressRatio < 0.85) {
    progressMessage.textContent = progressPhrases[1];
  } else {
    progressMessage.textContent = progressPhrases[2];
  }
};

const validateStep = () => {
  const step = steps[currentStep];
  const fields = Array.from(
    step.querySelectorAll(
      "input:not([disabled]), textarea:not([disabled]), select:not([disabled])"
    )
  );
  return fields.every((field) => {
    if (field.type === "checkbox") {
      return field.checked;
    }
    if (field.hasAttribute("required")) {
      return field.value.trim() !== "";
    }
    return true;
  });
};

nextButton.addEventListener("click", () => {
  if (!validateStep()) {
    highlightInvalid();
    return;
  }
  currentStep = Math.min(currentStep + 1, totalSteps - 1);
  updateStepVisibility();
});

prevButton.addEventListener("click", () => {
  currentStep = Math.max(currentStep - 1, 0);
  updateStepVisibility();
});

const highlightInvalid = () => {
  const step = steps[currentStep];
  const fields = Array.from(
    step.querySelectorAll(
      "input:not([disabled]), textarea:not([disabled]), select:not([disabled])"
    )
  );
  fields.forEach((field) => {
    const invalid =
      field.hasAttribute("required") && field.value.trim() === "";
    if (field.type === "checkbox" && field.hasAttribute("required")) {
      const target =
        field.id === "termsAccepted"
          ? acceptTermsButton || field.parentElement
          : field.parentElement;
      target?.classList.toggle("shake", !field.checked);
      if (!field.checked) {
        setTimeout(() => target?.classList.remove("shake"), 400);
      }
    }
    if (invalid) {
      field.classList.add("invalid");
      setTimeout(() => field.classList.remove("invalid"), 600);
    }

    if (field.id === "colorArea" && !field.value.trim()) {
      colorCards.forEach((card) => {
        card.classList.add("shake");
        setTimeout(() => card.classList.remove("shake"), 400);
      });
    }
    if (field.id === "termsAccepted" && !field.checked) {
      acceptTermsButton?.classList.add("shake");
      setTimeout(() => acceptTermsButton?.classList.remove("shake"), 400);
    }
  });
};

const setSubmittingState = (isSubmitting) => {
  submitButton.disabled = isSubmitting;
  submitButton.textContent = isSubmitting ? submittingText : submitDefaultText;
};

const setTermsAcceptance = (isAccepted) => {
  if (!termsAcceptedInput || !acceptTermsButton) return;
  termsAcceptedInput.checked = isAccepted;
  termsAcceptedInput.value = isAccepted ? "aceptado" : "";
  acceptTermsButton.classList.toggle("accepted", isAccepted);
  acceptTermsButton.setAttribute("aria-pressed", String(isAccepted));
  acceptTermsButton.textContent = isAccepted
    ? "Términos aceptados"
    : "Aceptar términos y condiciones";
};

const handleSuccess = () => {
  form.setAttribute("hidden", "true");
  successMessage.hidden = false;
  progressBar.style.width = "100%";
  progressMessage.textContent = progressPhrases[2];
  setSubmittingState(false);
};

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!validateStep()) {
    highlightInvalid();
    return;
  }

  setSubmittingState(true);

  const formData = new FormData(form);
  if (!formData.has("form-name")) {
    formData.append(
      "form-name",
      formNameInput.value || form.getAttribute("name")
    );
  }

  try {
    const response = await fetch(form.action || "/", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(formData).toString(),
    });

    if (!response.ok) {
      throw new Error("Netlify submission failed");
    }

    handleSuccess();
  } catch (error) {
    console.error("Error enviando el formulario", error);
    progressMessage.textContent =
      "No pudimos enviar tu aplicación. Inténtalo de nuevo.";
    setSubmittingState(false);
  }
});

closeSuccess.addEventListener("click", () => {
  closeOverlay();
});

const resetForm = () => {
  form.reset();
  currentStep = 0;
  successMessage.hidden = true;
  form.removeAttribute("hidden");
  setSubmittingState(false);
  inventorCards.forEach((card) => {
    card.classList.remove("selected");
    card.setAttribute("aria-checked", "false");
  });
  tipoInventorInput.value = "";
  colorCards.forEach((card) => {
    card.classList.remove("selected");
    card.setAttribute("aria-checked", "false");
  });
  if (colorAreaInput) colorAreaInput.value = "";
  setTermsAcceptance(false);
  if (termsContent) termsContent.setAttribute("hidden", "true");
  if (termsLink) {
    termsLink.textContent = "Ver términos y condiciones";
    termsLink.setAttribute("aria-expanded", "false");
  }
  updateStepVisibility();
};

inventorCards.forEach((card) => {
  const selectCard = () => {
    const value = card.dataset.value;
    if (!value) return;
    inventorCards.forEach((c) => {
      c.classList.remove("selected");
      c.setAttribute("aria-checked", "false");
    });
    card.classList.add("selected");
    card.setAttribute("aria-checked", "true");
    tipoInventorInput.value = value;
  };

  card.addEventListener("click", selectCard);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectCard();
    }
  });
});

colorCards.forEach((card) => {
  const selectColor = () => {
    const value = card.dataset.color;
    if (!value || !colorAreaInput) return;
    colorCards.forEach((c) => {
      c.classList.remove("selected");
      c.setAttribute("aria-checked", "false");
    });
    card.classList.add("selected");
    card.setAttribute("aria-checked", "true");
    colorAreaInput.value = value;
  };

  card.addEventListener("click", selectColor);
  card.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectColor();
    }
  });
});

acceptTermsButton?.addEventListener("click", () => {
  const nextState = !(termsAcceptedInput?.checked ?? false);
  setTermsAcceptance(nextState);
});

termsLink?.addEventListener("click", (event) => {
  event.preventDefault();
  if (!termsContent) return;
  const willShow = termsContent.hasAttribute("hidden");
  if (willShow) {
    termsContent.removeAttribute("hidden");
  } else {
    termsContent.setAttribute("hidden", "true");
  }
  termsLink.setAttribute("aria-expanded", String(willShow));
  termsLink.textContent = willShow
    ? "Ocultar términos y condiciones"
    : "Ver términos y condiciones";
});

const animatedElements = document.querySelectorAll(
  ".card, .timeline-item, .testimonial-card, .program-card"
);
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("in-view");
      }
    });
  },
  { threshold: 0.25 }
);

animatedElements.forEach((el) => observer.observe(el));

window.addEventListener("DOMContentLoaded", () => {
  updateStepVisibility();
  setTermsAcceptance(false);
});

const hero = document.querySelector(".hero");
hero?.addEventListener("mousemove", (event) => {
  const rect = hero.getBoundingClientRect();
  const x = ((event.clientX - rect.left) / rect.width - 0.5) * 20;
  const y = ((event.clientY - rect.top) / rect.height - 0.5) * 20;
  hero.style.setProperty("--tilt-x", `${y}px`);
  hero.style.setProperty("--tilt-y", `${-x}px`);
});

hero?.addEventListener("mouseleave", () => {
  hero.style.setProperty("--tilt-x", "0px");
  hero.style.setProperty("--tilt-y", "0px");
});
