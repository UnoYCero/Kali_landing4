// ==========================================================================
// KALEIDOSCOPIO - CLIENT REGISTRATION CONTROLLER
// Controller for clientes/registro/index.html
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Si ya tiene sesión activa, redirigir al dashboard
  await checkClientAuth();

  // 2. Selectores del DOM
  const form = document.getElementById('registroForm');
  const emailInput = document.getElementById('email');
  const confirmEmailInput = document.getElementById('confirmEmail');
  const passwordInput = document.getElementById('password');
  const confirmPasswordInput = document.getElementById('confirmPassword');
  
  const emailError = document.getElementById('emailError');
  const passwordError = document.getElementById('passwordError');
  const errorMsgBox = document.getElementById('errorMsgBox');
  const successMsgBox = document.getElementById('successMsgBox');
  const submitBtn = document.getElementById('submitBtn');

  // Bloquear copiar/pegar y arrastrar de manera programática adicional
  const blockEvents = (e) => {
    e.preventDefault();
    return false;
  };

  confirmEmailInput.addEventListener('paste', blockEvents);
  confirmEmailInput.addEventListener('copy', blockEvents);
  confirmEmailInput.addEventListener('drop', blockEvents);

  confirmPasswordInput.addEventListener('paste', blockEvents);
  confirmPasswordInput.addEventListener('copy', blockEvents);
  confirmPasswordInput.addEventListener('drop', blockEvents);

  // 3. Validación en tiempo real
  function validateFields() {
    let emailMatch = true;
    let passwordMatch = true;

    // Validación de correos
    if (confirmEmailInput.value.trim() !== '') {
      if (emailInput.value.trim() !== confirmEmailInput.value.trim()) {
        emailError.style.display = 'block';
        emailMatch = false;
      } else {
        emailError.style.display = 'none';
      }
    } else {
      emailError.style.display = 'none';
    }

    // Validación de contraseñas
    if (confirmPasswordInput.value !== '') {
      if (passwordInput.value !== confirmPasswordInput.value) {
        passwordError.style.display = 'block';
        passwordMatch = false;
      } else {
        passwordError.style.display = 'none';
      }
    } else {
      passwordError.style.display = 'none';
    }

    // Bloquear/desbloquear botón de registro
    if (emailMatch && passwordMatch) {
      submitBtn.removeAttribute('disabled');
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
    } else {
      submitBtn.setAttribute('disabled', 'true');
      submitBtn.style.opacity = '0.5';
      submitBtn.style.cursor = 'not-allowed';
    }

    return emailMatch && passwordMatch;
  }

  // Escuchar inputs en tiempo real
  emailInput.addEventListener('input', validateFields);
  confirmEmailInput.addEventListener('input', validateFields);
  passwordInput.addEventListener('input', validateFields);
  confirmPasswordInput.addEventListener('input', validateFields);

  // 4. Manejador del submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMsgBox.style.display = 'none';
    successMsgBox.style.display = 'none';

    // Validación final antes de enviar
    if (!validateFields()) {
      errorMsgBox.textContent = 'Por favor corrige los campos con errores antes de continuar.';
      errorMsgBox.style.display = 'block';
      return;
    }

    const fullName = document.getElementById('fullName').value.trim();
    const companyName = document.getElementById('companyName').value.trim();
    const city = document.getElementById('city').value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!initSupabase()) {
      errorMsgBox.textContent = 'Error al conectar con la base de datos de Supabase. Revisa la consola.';
      errorMsgBox.style.display = 'block';
      return;
    }

    try {
      submitBtn.setAttribute('disabled', 'true');
      submitBtn.textContent = 'Registrando...';

      // Hashear la contraseña en el cliente
      const hash = await hashPassword(password);

      // Inserción en la tabla de clientes
      const { data: client, error: insertError } = await window.supabaseClient
        .from('clientes')
        .insert([{
          nombre_completo: fullName,
          empresa: companyName,
          correo: email,
          password_hash: hash,
          ciudad: city,
          activo: true
        }])
        .select()
        .single();

      if (insertError) {
        if (insertError.code === '23505') { // UNIQUE constraint en Postgres
          throw new Error('El correo electrónico ingresado ya se encuentra registrado.');
        } else {
          throw insertError;
        }
      }

      // Inicializar el plan predeterminado
      const { error: planError } = await window.supabaseClient
        .from('cliente_planes')
        .insert([{
          cliente_id: client.id,
          nombre_plan: 'Plan de Mantenimiento Web',
          horas_mensuales: 8.00,
          estado: 'Activo'
        }]);

      if (planError) throw planError;

      // Inicializar la configuración de cortes (día 28 por defecto)
      const { error: corteError } = await window.supabaseClient
        .from('configuracion_cortes')
        .insert([{
          cliente_id: client.id,
          dia_corte: 28,
          ultimo_reset: new Date().toISOString()
        }]);

      if (corteError) throw corteError;

      // Inicializar la bolsa de horas actual
      const { error: horasError } = await window.supabaseClient
        .from('cliente_horas')
        .insert([{
          cliente_id: client.id,
          horas_contratadas: 8.00,
          horas_utilizadas: 0.00,
          horas_restantes: 8.00
        }]);

      if (horasError) throw horasError;

      // Todo correcto, mostrar éxito y redirección
      successMsgBox.style.display = 'block';
      setTimeout(() => {
        window.location.href = '../login/';
      }, 2000);

    } catch (err) {
      console.error('Error en el flujo de registro:', err);
      errorMsgBox.textContent = err.message || 'Ocurrió un error inesperado al registrar el cliente.';
      errorMsgBox.style.display = 'block';
      submitBtn.removeAttribute('disabled');
      submitBtn.textContent = 'Registrar Cuenta';
    }
  });
});
