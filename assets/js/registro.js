const CLIP_URL = 'https://pago.clip.mx/v3/a60ee4b8-3b0e-4e2a-a136-bbfa1f90faeb';

const form = document.getElementById('cohortForm');
const steps = Array.from(document.querySelectorAll('.form-step'));
const nextButton = document.getElementById('nextStep');
const prevButton = document.getElementById('prevStep');
const submitButton = document.getElementById('submitForm');
const progressBar = document.getElementById('progressBar');
const progressMessage = document.getElementById('progressMessage');
const successMessage = document.getElementById('successMessage');
const inventorCards = Array.from(document.querySelectorAll('.inventor-card'));
const tipoInventorInput = document.getElementById('tipoInventor');
const colorCards = Array.from(document.querySelectorAll('.color-card'));
const colorAreaInput = document.getElementById('colorArea');
const acceptTermsButton = document.getElementById('acceptTermsButton');
const termsAcceptedInput = document.getElementById('termsAccepted');
const termsLink = document.getElementById('viewTermsLink');
const termsContent = document.getElementById('termsContent');

let currentStep = 0;
const totalSteps = steps.length;
const progressPhrases = [
  'Tu locura se está incubando…',
  'Casi listo para romper el molde…',
  'Bienvenido al Kaleidoscopio.',
];
const submitDefaultText = 'Enviar Aplicación';
const submittingText = 'Enviando…';
let isFallbackSubmit = false;

const updateStepVisibility = () => {
  steps.forEach((step, index) => {
    step.classList.toggle('active', index === currentStep);
  });

  prevButton.style.display = currentStep === 0 ? 'none' : 'inline-flex';
  const isLastStep = currentStep === totalSteps - 1;
  nextButton.style.display = isLastStep ? 'none' : 'inline-flex';
  submitButton.style.display = isLastStep ? 'inline-flex' : 'none';

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
    step.querySelectorAll('input:not([disabled]), textarea:not([disabled]), select:not([disabled])')
  );
  return fields.every((field) => {
    if (field.type === 'checkbox') return field.checked || !field.hasAttribute('required');
    if (field.hasAttribute('required')) return field.value.trim() !== '';
    return true;
  });
};

const highlightInvalid = () => {
  const step = steps[currentStep];
  const fields = Array.from(
    step.querySelectorAll('input:not([disabled]), textarea:not([disabled]), select:not([disabled])')
  );
  fields.forEach((field) => {
    const invalid = field.hasAttribute('required') && field.value.trim() === '';
    if (field.type === 'checkbox' && field.hasAttribute('required')) {
      const target =
        field.id === 'termsAccepted'
          ? acceptTermsButton || field.parentElement
          : field.parentElement;
      target?.classList.toggle('shake', !field.checked);
      if (!field.checked) setTimeout(() => target?.classList.remove('shake'), 400);
    }
    if (invalid) {
      field.classList.add('invalid');
      setTimeout(() => field.classList.remove('invalid'), 600);
    }
    if (field.id === 'colorArea' && !field.value.trim()) {
      colorCards.forEach((card) => {
        card.classList.add('shake');
        setTimeout(() => card.classList.remove('shake'), 400);
      });
    }
    if (field.id === 'termsAccepted' && !field.checked) {
      acceptTermsButton?.classList.add('shake');
      setTimeout(() => acceptTermsButton?.classList.remove('shake'), 400);
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
  termsAcceptedInput.value = isAccepted ? 'aceptado' : '';
  acceptTermsButton.classList.toggle('accepted', isAccepted);
  acceptTermsButton.setAttribute('aria-pressed', String(isAccepted));
  acceptTermsButton.textContent = isAccepted
    ? 'Términos aceptados'
    : 'Aceptar términos y condiciones';
};

const handleSuccess = () => {
  form.setAttribute('hidden', 'true');
  successMessage.hidden = false;
  progressBar.style.width = '100%';
  progressMessage.textContent = 'Redirigiendo al proceso de pago…';
  setTimeout(() => {
    window.location.href = CLIP_URL;
  }, 1800);
};

nextButton.addEventListener('click', () => {
  if (!validateStep()) { highlightInvalid(); return; }
  currentStep = Math.min(currentStep + 1, totalSteps - 1);
  updateStepVisibility();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

prevButton.addEventListener('click', () => {
  currentStep = Math.max(currentStep - 1, 0);
  updateStepVisibility();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

form.addEventListener('submit', async (event) => {
  if (isFallbackSubmit) return;
  event.preventDefault();
  if (!validateStep()) { highlightInvalid(); return; }

  setSubmittingState(true);

  const formData = new FormData(form);
  try {
    const response = await fetch('/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(formData).toString(),
    });
    if (!response.ok) throw new Error('Netlify submission failed');
    handleSuccess();
  } catch (error) {
    console.error('Error enviando el formulario', error);
    progressMessage.textContent = 'No pudimos enviar tu aplicación. Inténtalo de nuevo.';
    setSubmittingState(false);
    if (!form.dataset.fallbackSubmitted) {
      form.dataset.fallbackSubmitted = 'true';
      isFallbackSubmit = true;
      form.submit();
    }
  }
});

inventorCards.forEach((card) => {
  const selectCard = () => {
    const value = card.dataset.value;
    if (!value) return;
    inventorCards.forEach((c) => { c.classList.remove('selected'); c.setAttribute('aria-checked', 'false'); });
    card.classList.add('selected');
    card.setAttribute('aria-checked', 'true');
    tipoInventorInput.value = value;
  };
  card.addEventListener('click', selectCard);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectCard(); }
  });
});

colorCards.forEach((card) => {
  const selectColor = () => {
    const value = card.dataset.color;
    if (!value || !colorAreaInput) return;
    colorCards.forEach((c) => { c.classList.remove('selected'); c.setAttribute('aria-checked', 'false'); });
    card.classList.add('selected');
    card.setAttribute('aria-checked', 'true');
    colorAreaInput.value = value;
  };
  card.addEventListener('click', selectColor);
  card.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectColor(); }
  });
});

acceptTermsButton?.addEventListener('click', () => {
  setTermsAcceptance(!(termsAcceptedInput?.checked ?? false));
});

termsLink?.addEventListener('click', (e) => {
  e.preventDefault();
  if (!termsContent) return;
  const willShow = termsContent.hasAttribute('hidden');
  if (willShow) { termsContent.removeAttribute('hidden'); } else { termsContent.setAttribute('hidden', 'true'); }
  termsLink.setAttribute('aria-expanded', String(willShow));
  termsLink.textContent = willShow ? 'Ocultar términos y condiciones' : 'Ver términos y condiciones';
});

window.addEventListener('DOMContentLoaded', () => {
  updateStepVisibility();
  setTermsAcceptance(false);
  const userAgentField = document.getElementById('userAgentField');
  const referrerField = document.getElementById('referrerField');
  const createdAtField = document.getElementById('createdAtField');
  if (userAgentField) userAgentField.value = navigator.userAgent;
  if (referrerField) referrerField.value = document.referrer;
  if (createdAtField) createdAtField.value = new Date().toISOString();
});
