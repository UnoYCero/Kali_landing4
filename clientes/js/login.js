// ==========================================================================
// KALEIDOSCOPIO - CLIENT LOGIN CONTROLLER
// Controller for clientes/login/index.html
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Redirigir al dashboard si ya hay sesión activa válida
  await checkClientAuth();

  const loginForm = document.getElementById('loginForm');
  const clientEmailInput = document.getElementById('clientEmail');
  const clientPasswordInput = document.getElementById('clientPassword');
  
  const loginError = document.getElementById('loginError');
  const supabaseError = document.getElementById('supabaseError');

  // Manejar el submit del Login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';
    supabaseError.style.display = 'none';

    const email = clientEmailInput.value.trim();
    const password = clientPasswordInput.value;
    
    const initialized = initSupabase();
    if (!initialized) {
      supabaseError.style.display = 'block';
      return;
    }

    try {
      // Hashear la contraseña ingresada
      const hashedInput = await hashPassword(password);

      // Buscar el cliente en la tabla
      const { data: client, error } = await window.supabaseClient
        .from('clientes')
        .select('id, nombre_completo, activo')
        .eq('correo', email)
        .eq('password_hash', hashedInput)
        .maybeSingle();

      if (error) {
        console.error('Error consultando Supabase:', error);
        loginError.textContent = 'Error de conexión con la base de datos.';
        loginError.style.display = 'block';
        return;
      }

      if (client) {
        if (!client.activo) {
          loginError.textContent = 'Tu cuenta de cliente se encuentra inactiva o suspendida. Por favor contacta al equipo de soporte de Kaleidoscopio.';
          loginError.style.display = 'block';
          return;
        }

        // Guardar sesión en localStorage y redirigir
        localStorage.setItem('kali_client_session', client.id);
        window.location.href = '../dashboard/';
      } else {
        loginError.textContent = 'Correo electrónico o contraseña incorrectos. Inténtalo de nuevo.';
        loginError.style.display = 'block';
        clientPasswordInput.value = '';
        clientPasswordInput.focus();
      }
    } catch (err) {
      console.error('Error en el login del cliente:', err);
      loginError.textContent = 'Hubo un error inesperado al procesar el inicio de sesión.';
      loginError.style.display = 'block';
    }
  });
});
