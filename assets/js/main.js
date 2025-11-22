      // Nueva función para scroll suave sin afectar la URL
      function smoothScroll(id) {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }

      const formOverlay = document.getElementById("formOverlay");
      const applyTriggers = Array.from(
        document.querySelectorAll("[data-apply-trigger]")
      );
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

      // Elementos nuevos para lógica condicional
      const formTitle = document.getElementById("formTitle");
      const programBadge = document.getElementById("programBadge");
      const programInput = document.getElementById("programSelection");
      const successProgramName = document.getElementById("successProgramName");

      let currentStep = 0;
      const totalSteps = steps.length;
      const progressPhrases = [
        "Tu locura se está incubando…",
        "Casi listo para romper el molde…",
        "Bienvenido al Kaleidoscopio."
      ];

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
          conditionalFields.forEach(field => {
              const condition = field.dataset.showIf;
              if (condition === type) {
                  field.classList.remove("d-none");
                  const inputs = field.querySelectorAll("input, textarea, select");
                  inputs.forEach(i => i.disabled = false);
              } else {
                  field.classList.add("d-none");
                  const inputs = field.querySelectorAll("input, textarea, select");
                  inputs.forEach(i => i.disabled = true);
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
        const fields = Array.from(step.querySelectorAll("input:not([disabled]), textarea:not([disabled]), select:not([disabled])"));
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
        const fields = Array.from(step.querySelectorAll("input:not([disabled]), textarea:not([disabled]), select:not([disabled])"));
        fields.forEach((field) => {
          const invalid = field.hasAttribute("required") && field.value.trim() === "";
          if (field.type === "checkbox" && field.hasAttribute("required")) {
            field.parentElement.classList.toggle("shake", !field.checked);
            if (!field.checked) {
              setTimeout(() => field.parentElement.classList.remove("shake"), 400);
            }
          }
          if (invalid) {
            field.classList.add("invalid");
            setTimeout(() => field.classList.remove("invalid"), 600);
          }
        });
      };

      const formError = document.getElementById("formError");
      const API_ENDPOINT = "/api/aplicaciones";

      const setFormError = (message) => {
        if (!formError) return;
        formError.textContent = message;
        formError.classList.toggle("active", Boolean(message));
      };

      const toggleFormBusyState = (isBusy) => {
        [submitButton, nextButton, prevButton].forEach((btn) => {
          if (!btn) return;
          btn.disabled = isBusy;
          btn.classList.toggle("is-loading", isBusy);
        });
      };

      const serializeFormData = () => {
        const entries = new FormData(form).entries();
        return Object.fromEntries(entries);
      };

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        setFormError("");

        if (!validateStep()) {
          highlightInvalid();
          return;
        }

        toggleFormBusyState(true);
        const payload = serializeFormData();

        try {
          const response = await fetch(API_ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });

          if (!response.ok) {
            setFormError("No pudimos guardar tu aplicación. Inténtalo de nuevo.");
            return;
          }

          form.setAttribute("hidden", "true");
          successMessage.hidden = false;
          progressBar.style.width = "100%";
          progressMessage.textContent = progressPhrases[2];
        } catch (error) {
          console.error("Error al enviar la aplicación:", error);
          setFormError("Revisa tu conexión e inténtalo nuevamente.");
        } finally {
          toggleFormBusyState(false);
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
        inventorCards.forEach((card) => card.classList.remove("selected"));
        tipoInventorInput.value = "";
        updateStepVisibility();
      };

      inventorCards.forEach((card) => {
        const selectCard = () => {
          const value = card.dataset.value;
          if (!value) return;
          inventorCards.forEach((c) => c.classList.remove("selected"));
          card.classList.add("selected");
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

      const animatedElements = document.querySelectorAll(".card, .timeline-item, .testimonial-card, .program-card");
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
