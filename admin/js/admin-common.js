// ==========================================================================
// KALEIDOSCOPIO - ADMIN COMMON SCRIPTS (AUTH & NAVIGATION)
// Shared helper code for admin pages
// ==========================================================================

let supabase = null;

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
      supabase = window.supabase.createClient(url, key);
      return true;
    } catch (e) {
      console.error('Error al inicializar Supabase client:', e);
      return false;
    }
  }
  return false;
}

// Calcular ruta de redirección al login dependiente del nivel de carpeta
function redirectToLogin() {
  if (window.location.pathname.includes('/login')) {
    return;
  }
  
  let relativePathToLogin = './login/';
  const path = window.location.pathname;
  
  if (path.includes('/prospectos')) {
    relativePathToLogin = '../login/';
  }
  
  window.location.href = relativePathToLogin;
}

// Validar la sesión activa contra Supabase
async function checkAuth() {
  const session = localStorage.getItem('kali_admin_session');
  if (!session) {
    redirectToLogin();
    return false;
  }
  
  const { url, key } = getSupabaseCredentials();
  if (!url || !key) {
    redirectToLogin();
    return false;
  }
  
  const initialized = initSupabase();
  if (!initialized) {
    redirectToLogin();
    return false;
  }
  
  try {
    // Validar que el hash guardado en localStorage coincida con el hash de contraseña en Supabase
    const { data, error } = await supabase
      .from('admin_settings')
      .select('value')
      .eq('key', 'admin_password_hash')
      .eq('value', session)
      .maybeSingle();
      
    if (error || !data) {
      // Sesión inválida o contraseña modificada
      localStorage.removeItem('kali_admin_session');
      redirectToLogin();
      return false;
    }
    
    // Sesión verificada
    return true;
  } catch (e) {
    console.error('Error al verificar autenticación:', e);
    // En caso de error de red temporal, permitimos permanecer en la página para no frustrar al usuario,
    // pero si no hay objeto de base de datos o da fallo de API Key, se enviará a login.
    return true; 
  }
}

// Inicialización de componentes comunes de la interfaz (Sidebar & Logout)
document.addEventListener('DOMContentLoaded', () => {
  // Inicializar menú hamburguesa responsive
  const menuToggle = document.getElementById('adminMenuToggle');
  const sidebar = document.getElementById('adminSidebar');
  
  if (menuToggle && sidebar) {
    menuToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      sidebar.classList.toggle('active');
      menuToggle.classList.toggle('is-active');
      const expanded = sidebar.classList.contains('active');
      menuToggle.setAttribute('aria-expanded', String(expanded));
    });
    
    // Cerrar sidebar al hacer click fuera en pantallas móviles
    document.addEventListener('click', (event) => {
      const isClickInsideSidebar = sidebar.contains(event.target);
      const isClickOnToggle = menuToggle.contains(event.target);
      
      if (!isClickInsideSidebar && !isClickOnToggle && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
        menuToggle.classList.remove('is-active');
        menuToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }
  
  // Inicializar botón de Cerrar Sesión
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      localStorage.removeItem('kali_admin_session');
      redirectToLogin();
    });
  }
});
