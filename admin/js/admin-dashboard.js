// ==========================================================================
// KALEIDOSCOPIO - ADMIN DASHBOARD & LOGIN CONTROLLER
// Controller for index.html (Handles integrated inline login and stats display)
// ==========================================================================

// Función de hasheo SHA-256 en navegador
async function hashPassword(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
  const loginView = document.getElementById('loginView');
  const adminView = document.getElementById('adminView');

  // 1. Verificar sesión (indicamos true porque es la página raíz /admin)
  const authenticated = await checkAuth(true);

  if (authenticated) {
    // USUARIO AUTENTICADO: Mostrar Dashboard
    loginView.style.display = 'none';
    adminView.style.display = 'block';

    try {
      if (supabase) {
        await updateDashboardStats();
      }
    } catch (error) {
      console.error('Error cargando estadísticas del dashboard:', error);
    }
  } else {
    // USUARIO NO AUTENTICADO: Mostrar Formulario de Login
    adminView.style.display = 'none';
    loginView.style.display = 'flex';

    initLoginController();
  }
});

// Inicializar todos los listeners del login
function initLoginController() {
  const loginForm = document.getElementById('loginForm');
  const adminPasswordInput = document.getElementById('adminPassword');
  const loginError = document.getElementById('loginError');
  const supabaseError = document.getElementById('supabaseError');
  const configToggle = document.getElementById('configToggle');
  const configSection = document.getElementById('configSection');
  const dbUrlInput = document.getElementById('dbUrl');
  const dbKeyInput = document.getElementById('dbKey');
  const saveConfigBtn = document.getElementById('saveConfigBtn');

  // Cargar credenciales guardadas en localStorage si existen
  dbUrlInput.value = localStorage.getItem('supabase_url') || '';
  dbKeyInput.value = localStorage.getItem('supabase_anon_key') || '';

  // Toggle de configuración de Supabase
  configToggle.addEventListener('click', () => {
    configSection.classList.toggle('active');
  });

  // Guardar configuración localmente en el navegador
  saveConfigBtn.addEventListener('click', () => {
    const url = dbUrlInput.value.trim();
    const key = dbKeyInput.value.trim();

    if (url && key) {
      localStorage.setItem('supabase_url', url);
      localStorage.setItem('supabase_anon_key', key);
      
      // Intentar re-inicializar en la ventana global
      window.SUPABASE_URL = url;
      window.SUPABASE_ANON_KEY = key;
      
      alert('Credenciales de Supabase guardadas localmente en este navegador.');
      supabaseError.style.display = 'none';
      configSection.classList.remove('active');
    } else {
      alert('Por favor ingresa ambos campos.');
    }
  });

  // Envío de contraseña de login
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.style.display = 'none';
    supabaseError.style.display = 'none';

    const password = adminPasswordInput.value;
    
    // Asegurar que Supabase esté inicializado
    const initialized = initSupabase();
    if (!initialized) {
      supabaseError.style.display = 'block';
      configSection.classList.add('active');
      return;
    }

    try {
      // A. Calcular hash SHA-256 de la contraseña ingresada
      const hashedInput = await hashPassword(password);

      // B. Consultar si coincide con el hash en la tabla admin_settings de Supabase
      const { data, error } = await supabase
        .from('admin_settings')
        .select('value')
        .eq('key', 'admin_password_hash')
        .eq('value', hashedInput)
        .maybeSingle();

      if (error) {
        console.error('Error consultando Supabase:', error);
        loginError.textContent = 'Error de conexión con la base de datos de Supabase.';
        loginError.style.display = 'block';
        return;
      }

      if (data && data.value === hashedInput) {
        // Credenciales correctas: Guardar sesión
        localStorage.setItem('kali_admin_session', hashedInput);
        // Recargar la página para que checkAuth() pase y revele el panel
        window.location.reload();
      } else {
        // Credenciales incorrectas
        loginError.textContent = 'Contraseña incorrecta. Inténtalo de nuevo.';
        loginError.style.display = 'block';
        adminPasswordInput.value = '';
        adminPasswordInput.focus();
      }
    } catch (err) {
      console.error('Error en autenticación:', err);
      loginError.textContent = 'Hubo un error inesperado al verificar la contraseña.';
      loginError.style.display = 'block';
    }
  });
}

// Función para consultar Supabase y pintar métricas en el Dashboard
async function updateDashboardStats() {
  try {
    // Obtener todos los prospectos y sus estados correspondientes
    const { data: prospects, error: prospectsError } = await supabase
      .from('prospects')
      .select('id, status_id, statuses(name)');
      
    if (prospectsError) throw prospectsError;

    if (!prospects || prospects.length === 0) {
      return; // Dejar placeholders en cero si no hay datos
    }

    const totalProspects = prospects.length;
    
    // Contar clientes activos (definidos como estados diferentes de 'perdido')
    const activeClients = prospects.filter(p => {
      const statusName = p.statuses?.name?.toLowerCase();
      return statusName && statusName !== 'perdido';
    }).length;

    // Calcular conversiones (leads con estado 'cerrado')
    const closedDeals = prospects.filter(p => {
      const statusName = p.statuses?.name?.toLowerCase();
      return statusName === 'cerrado';
    }).length;

    const conversionRate = totalProspects > 0 ? ((closedDeals / totalProspects) * 100).toFixed(1) : '0.0';

    // Proyectar ingresos ficticios basados en número de cierres ($15,000 MXN por contrato cerrado como ejemplo interactivo)
    const projectedRevenue = (closedDeals * 15000).toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN'
    });

    // Actualizar elementos en el DOM si existen
    const kpiCards = document.querySelectorAll('.kpi-card');
    
    kpiCards.forEach(card => {
      const title = card.querySelector('.kpi-card-title').textContent.toLowerCase();
      const valueEl = card.querySelector('.kpi-card-value');
      
      if (title.includes('ingresos') && valueEl) {
        valueEl.textContent = projectedRevenue;
      } else if (title.includes('clientes') && valueEl) {
        valueEl.textContent = activeClients;
      } else if (title.includes('conversiones') && valueEl) {
        valueEl.textContent = `${conversionRate}%`;
      }
    });
  } catch (e) {
    console.error('No se pudieron calcular las estadísticas en caliente:', e);
  }
}
