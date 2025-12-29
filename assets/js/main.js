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

  configureFormForProgram(programType);

  formOverlay.classList.add("active");
  formOverlay.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
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
  document.body.style.overflow = "";
  resetForm();
};

applyTriggers.forEach((btn) => {
  btn.addEventListener("click", triggerForm);
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
