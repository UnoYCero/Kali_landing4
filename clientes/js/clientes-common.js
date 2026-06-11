// ==========================================================================
// KALEIDOSCOPIO - CLIENT COMMON SCRIPTS (AUTH, RESET LOGIC & NAVIGATION)
// Shared helper code for client portal pages
// ==========================================================================

window.supabaseClient = null;

// Obtener credenciales de Supabase
function getSupabaseCredentials() {
  const url = window.SUPABASE_URL || localStorage.getItem('supabase_url');
  const key = window.SUPABASE_ANON_KEY || localStorage.getItem('supabase_anon_key');
  return { url, key };
}

// Inicializar cliente Supabase
function initSupabase() {
  const { url, key } = getSupabaseCredentials();
  if (url && key && window.supabase) {
    try {
      window.supabaseClient = window.supabase.createClient(url, key);
      return true;
    } catch (e) {
      console.error('Error al inicializar Supabase client:', e);
      return false;
    }
  }
  return false;
}

// Calcular ruta de redirección al login
function redirectToClientLogin() {
  const path = window.location.pathname;
  if (!path.includes('/login') && !path.includes('/registro')) {
    // Si estamos en dashboard, subimos un nivel a /clientes/login
    window.location.href = '../login/';
  }
}

// Hashear contraseñas con SHA-256 en el cliente
async function hashPassword(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Validar la sesión activa del cliente contra Supabase
async function checkClientAuth() {
  const session = localStorage.getItem('kali_client_session');
  const path = window.location.pathname;
  const isAuthPage = path.includes('/login') || path.includes('/registro');

  if (!session) {
    if (!isAuthPage) redirectToClientLogin();
    return null;
  }
  
  const { url, key } = getSupabaseCredentials();
  if (!url || !key) {
    if (!isAuthPage) redirectToClientLogin();
    return null;
  }
  
  const initialized = initSupabase();
  if (!initialized) {
    if (!isAuthPage) redirectToClientLogin();
    return null;
  }
  
  try {
    // Consultar el cliente por ID
    const { data: client, error } = await window.supabaseClient
      .from('clientes')
      .select('id, nombre_completo, empresa, correo, ciudad, activo')
      .eq('id', session)
      .maybeSingle();
      
    if (error || !client || !client.activo) {
      // Sesión inválida, cliente no existe o fue desactivado
      localStorage.removeItem('kali_client_session');
      if (!isAuthPage) redirectToClientLogin();
      return null;
    }
    
    // Si estamos en login o registro y la sesión es válida, mandar a dashboard
    if (isAuthPage) {
      window.location.href = '../dashboard/';
    }
    
    return client;
  } catch (e) {
    console.error('Error al verificar autenticación del cliente:', e);
    return null; 
  }
}

// Función para comprobar y reiniciar la bolsa de horas si corresponde
async function checkAndResetClientHours(clienteId) {
  if (!window.supabaseClient) return;

  try {
    // 1. Obtener la configuración de cortes
    const { data: corte, error: errorCorte } = await window.supabaseClient
      .from('configuracion_cortes')
      .select('dia_corte, ultimo_reset')
      .eq('cliente_id', clienteId)
      .maybeSingle();

    if (errorCorte || !corte) return;

    // 2. Obtener el plan del cliente
    const { data: plan, error: errorPlan } = await window.supabaseClient
      .from('cliente_planes')
      .select('horas_mensuales')
      .eq('cliente_id', clienteId)
      .maybeSingle();

    if (errorPlan || !plan) return;

    const diaCorte = corte.dia_corte;
    const ultimoResetStr = corte.ultimo_reset;
    
    if (isResetDue(diaCorte, ultimoResetStr)) {
      const horasMensuales = parseFloat(plan.horas_mensuales);
      
      console.log(`Reinicio de bolsa de horas debido para cliente ${clienteId}. Reiniciando a ${horasMensuales} horas.`);
      
      // Actualizar la bolsa de horas
      const { error: errorHoras } = await window.supabaseClient
        .from('cliente_horas')
        .update({
          horas_contratadas: horasMensuales,
          horas_utilizadas: 0.00,
          horas_restantes: horasMensuales,
          actualizado_en: new Date().toISOString()
        })
        .eq('cliente_id', clienteId);

      if (errorHoras) throw errorHoras;

      // Actualizar la fecha del último reinicio
      const { error: errorUpdateCorte } = await window.supabaseClient
        .from('configuracion_cortes')
        .update({
          ultimo_reset: new Date().toISOString()
        })
        .eq('cliente_id', clienteId);

      if (errorUpdateCorte) throw errorUpdateCorte;
    }
  } catch (e) {
    console.error('Error durante el chequeo de reinicio de corte:', e);
  }
}

// Determinar si corresponde hacer reset
function isResetDue(diaCorte, ultimoResetStr) {
  const today = new Date();
  const lastReset = new Date(ultimoResetStr);
  
  const lastYear = lastReset.getFullYear();
  const lastMonth = lastReset.getMonth();
  
  let yearDiff = today.getFullYear() - lastYear;
  let monthDiff = today.getMonth() - lastMonth + (yearDiff * 12);
  
  if (monthDiff <= 0) {
    return false; // Mismo mes del último reset, no se requiere acción
  }
  
  if (monthDiff > 1) {
    return true; // Se saltaron meses completos
  }
  
  // monthDiff === 1 (Estamos en el mes siguiente al reset anterior)
  // Calculamos el último día del mes actual para ver si el corte excede la longitud del mes
  const lastDayOfNextMonth = new Date(lastYear, lastMonth + 2, 0).getDate();
  const targetDay = Math.min(diaCorte, lastDayOfNextMonth);
  
  if (today.getDate() >= targetDay) {
    return true;
  }
  
  return false;
}

// Inicialización de componentes comunes de la interfaz del Cliente (Sidebar responsive & Logout)
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar menú hamburguesa
  const menuToggle = document.getElementById('clientMenuToggle');
  const sidebar = document.getElementById('clientSidebar');
  
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('active');
      const expanded = sidebar.classList.contains('active');
      menuToggle.setAttribute('aria-expanded', String(expanded));
    });
    
    // Cerrar sidebar al hacer click fuera
    document.addEventListener('click', (event) => {
      const isClickInsideSidebar = sidebar.contains(event.target);
      const isClickOnToggle = menuToggle.contains(event.target);
      
      if (!isClickInsideSidebar && !isClickOnToggle && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
  
  // Cerrar Sesión
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('kali_client_session');
      redirectToClientLogin();
    });
  }
});
