// ==========================================================================
// KALEIDOSCOPIO - SECURE PASSWORD MANAGER LOGIC
// ==========================================================================

let supabaseClient = null;
let currentUser = null;
let currentSessionToken = null;

// Estados de la app
let projects = [];
let services = [];
let credentials = [];

let activeProjectId = null;
let activeServiceId = null;
let activeCredentialId = null;

// Temporizador de inactividad
let inactivityTimeout = null;
let lastActivityTime = Date.now();

// --------------------------------------------------------------------------
// 1. INICIALIZACIÓN Y CONFIGURACIÓN
// --------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', async () => {
  initApp();
  setupEventListeners();
});

function getSupabaseCredentials() {
  const url = window.SUPABASE_URL || localStorage.getItem('supabase_url');
  const key = window.SUPABASE_ANON_KEY || localStorage.getItem('supabase_anon_key');
  return { url, key };
}

function initSupabaseClient(token = null) {
  const { url, key } = getSupabaseCredentials();
  if (url && key && window.supabase) {
    try {
      const options = {};
      if (token) {
        options.global = {
          headers: {
            'x-custom-session-token': token
          }
        };
      }
      supabaseClient = window.supabase.createClient(url, key, options);
      return true;
    } catch (e) {
      console.error('Error al inicializar cliente Supabase:', e);
    }
  }
  return false;
}

async function initApp() {
  // Intentar cargar la sesión de localStorage
  const savedToken = localStorage.getItem('kali_pm_token');
  const savedUser = localStorage.getItem('kali_pm_user');

  if (savedToken && savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
      currentSessionToken = savedToken;
      
      initSupabaseClient(currentSessionToken);
      
      // Validar si la sesión sigue activa y vigente en Supabase
      const { data: sessionData, error } = await supabaseClient
        .from('sesiones_contraseñas')
        .select('*')
        .eq('token', currentSessionToken)
        .gt('expira_en', new Date().toISOString())
        .maybeSingle();

      if (error || !sessionData) {
        // Sesión caducada o inválida
        logout();
      } else {
        // Sesión válida, iniciar temporizador y cargar dashboard
        startInactivityTimer();
        showScreen('appScreen');
        loadDashboardData();
        renderUserProfile();
      }
    } catch (e) {
      console.error('Error al restaurar sesión:', e);
      logout();
    }
  } else {
    // Si no hay sesión, inicializar Supabase básico para login
    initSupabaseClient();
    showScreen('authScreen');
  }
}

// Helper para cambiar entre pantallas principales
function showScreen(screenId) {
  document.getElementById('authScreen').classList.add('hidden');
  document.getElementById('setupScreen').classList.add('hidden');
  document.getElementById('appScreen').classList.add('hidden');
  
  document.getElementById(screenId).classList.remove('hidden');
}

// --------------------------------------------------------------------------
// 2. SISTEMA DE AUTENTICACIÓN INDEPENDIENTE
// --------------------------------------------------------------------------
async function hashPassword(message) {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Generador de UUID para tokens de sesión
function generateUUID() {
  if (crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Iniciar sesión
async function login(username, password) {
  const loginError = document.getElementById('loginError');
  loginError.classList.add('hidden');

  try {
    const passwordHash = await hashPassword(password);
    
    // Consultar usuario
    const { data: user, error } = await supabaseClient
      .from('usuarios_contraseñas')
      .select('*')
      .eq('usuario', username)
      .eq('password_hash', passwordHash)
      .eq('estado', 'activo')
      .maybeSingle();

    if (error || !user) {
      loginError.classList.remove('hidden');
      return;
    }

    // Crear la sesión en BD primero para poder tener permisos RLS de actualizar su contraseña
    const sessionCreated = await createSessionForUser(user);
    if (!sessionCreated) return;

    // Verificar si es primer acceso
    if (!user.primer_acceso_completado) {
      document.getElementById('setupUserName').textContent = user.nombre;
      showScreen('setupScreen');
    } else {
      // Login exitoso y completo
      startInactivityTimer();
      showScreen('appScreen');
      loadDashboardData();
      renderUserProfile();
    }
  } catch (e) {
    console.error('Error durante login:', e);
    loginError.textContent = 'Ocurrió un error inesperado al conectar con el servidor.';
    loginError.classList.remove('hidden');
  }
}

// Crear sesión en Supabase y localStorage
async function createSessionForUser(user) {
  const token = generateUUID();
  const expireDate = new Date();
  expireDate.setHours(expireDate.getHours() + 24); // Sesión válida por 24 horas

  const { error } = await supabaseClient
    .from('sesiones_contraseñas')
    .insert({
      usuario_id: user.id,
      token: token,
      expira_en: expireDate.toISOString()
    });

  if (error) {
    console.error('Error al guardar la sesión:', error);
    alert('Error de conexión con la base de datos de sesiones.');
    return false;
  }

  // Guardar sesión en local
  localStorage.setItem('kali_pm_token', token);
  localStorage.setItem('kali_pm_user', JSON.stringify(user));
  
  currentUser = user;
  currentSessionToken = token;

  // Registrar último acceso en la tabla del usuario e inicializar cabecera
  initSupabaseClient(token); // Re-inicializar con cabecera de autenticación
  await supabaseClient
    .from('usuarios_contraseñas')
    .update({ ultimo_acceso: new Date().toISOString() })
    .eq('id', user.id);

  return true;
}

// Cerrar sesión
async function logout() {
  stopInactivityTimer();
  
  if (supabaseClient && currentSessionToken) {
    // Intentar borrar la sesión en Supabase
    await supabaseClient
      .from('sesiones_contraseñas')
      .delete()
      .eq('token', currentSessionToken);
  }

  localStorage.removeItem('kali_pm_token');
  localStorage.removeItem('kali_pm_user');
  
  currentUser = null;
  currentSessionToken = null;
  
  initSupabaseClient(); // Volver al cliente básico sin token
  
  // Limpiar campos de login
  document.getElementById('loginPassword').value = '';
  showScreen('authScreen');
}

// --------------------------------------------------------------------------
// 3. PRIMER ACCESO - VALIDACIÓN DE FORTALEZA DE CONTRASEÑA
// --------------------------------------------------------------------------
function setupPasswordStrengthValidation() {
  const newPassword = document.getElementById('newPassword');
  const confirmPassword = document.getElementById('confirmPassword');
  const strengthBar = document.getElementById('strengthBar');
  const strengthText = document.getElementById('strengthText');
  const setupSubmitBtn = document.getElementById('setupSubmitBtn');
  const matchError = document.getElementById('matchError');

  // Bloquear Copiar/Pegar en el campo de confirmación
  confirmPassword.addEventListener('paste', (e) => {
    e.preventDefault();
  });

  const validatePassword = () => {
    const val = newPassword.value;
    let score = 0;
    
    // Criterios
    const lengthValid = val.length >= 8;
    const upperValid = /[A-Z]/.test(val);
    const numOrSpecialValid = /[0-9\W]/.test(val);

    // Actualizar clases de requerimientos visuales
    updateRequirementStatus('reqLength', lengthValid);
    updateRequirementStatus('reqUpper', upperValid);
    updateRequirementStatus('reqNumber', numOrSpecialValid);

    if (val.length > 0) score += 1;
    if (lengthValid) score += 1;
    if (upperValid) score += 1;
    if (numOrSpecialValid) score += 1;
    if (val.length >= 12) score += 1;

    // Actualizar indicador de fortaleza
    let strength = "Ninguna";
    let color = "#ff3e7f"; // Red
    let width = "0%";

    if (score === 1 || score === 2) {
      strength = "Débil";
      color = "#ff3e7f";
      width = "30%";
    } else if (score === 3 || score === 4) {
      strength = "Media";
      color = "#ffb347"; // Orange
      width = "65%";
    } else if (score === 5) {
      strength = "Fuerte";
      color = "#00ffa3"; // Green
      width = "100%";
    }

    strengthBar.style.backgroundColor = color;
    strengthBar.style.width = width;
    strengthText.textContent = `Seguridad: ${strength}`;
    strengthText.style.color = color;

    // Validar coincidencia
    const passwordsMatch = val === confirmPassword.value && val !== '';
    const satisfiesRequirements = lengthValid && upperValid && numOrSpecialValid;

    if (confirmPassword.value !== '' && !passwordsMatch) {
      matchError.classList.remove('hidden');
    } else {
      matchError.classList.add('hidden');
    }

    // Activar o desactivar botón
    setupSubmitBtn.disabled = !(passwordsMatch && satisfiesRequirements);
  };

  newPassword.addEventListener('input', validatePassword);
  confirmPassword.addEventListener('input', validatePassword);
}

function updateRequirementStatus(id, isValid) {
  const el = document.getElementById(id);
  if (isValid) {
    el.classList.add('valid');
  } else {
    el.classList.remove('valid');
  }
}

async function handlePasswordSetup(e) {
  e.preventDefault();
  const newPassword = document.getElementById('newPassword').value;
  
  try {
    const passwordHash = await hashPassword(newPassword);

    // Actualizar contraseña definitiva del usuario a través de la función RPC segura
    const { data: success, error } = await supabaseClient
      .rpc('cambiar_contrasenia_usuario', {
        p_usuario_id: currentUser.id,
        p_token: currentSessionToken,
        p_nuevo_hash: passwordHash
      });

    if (error || !success) {
      console.error('Error al establecer contraseña:', error);
      alert('Hubo un error al guardar la nueva contraseña. Inténtalo de nuevo: ' + (error ? error.message : 'Sesión inválida'));
      return;
    }

    // Actualizar el estado del usuario localmente
    currentUser.primer_acceso_completado = true;
    localStorage.setItem('kali_pm_user', JSON.stringify(currentUser));

    // Entrar al Dashboard
    showToast('Contraseña guardada con éxito');
    startInactivityTimer();
    showScreen('appScreen');
    loadDashboardData();
    renderUserProfile();
  } catch (e) {
    console.error('Error al configurar contraseña:', e);
  }
}

// --------------------------------------------------------------------------
// 4. SISTEMA DE AUTO-BLOQUEO POR INACTIVIDAD
// --------------------------------------------------------------------------
function startInactivityTimer() {
  lastActivityTime = Date.now();
  
  if (inactivityTimeout) clearInterval(inactivityTimeout);
  
  inactivityTimeout = setInterval(() => {
    const minutesSelected = parseInt(document.getElementById('lockTimerSelect').value);
    const msLimit = minutesSelected * 60 * 1000;
    
    if (Date.now() - lastActivityTime >= msLimit) {
      logout();
      showToast('Bloqueado automáticamente por inactividad');
    }
  }, 10000); // Revisar cada 10 segundos
}

function stopInactivityTimer() {
  if (inactivityTimeout) {
    clearInterval(inactivityTimeout);
    inactivityTimeout = null;
  }
}

function resetActivityTimer() {
  lastActivityTime = Date.now();
}

// --------------------------------------------------------------------------
// 5. CARGA DE DATOS Y RENDER DEL DASHBOARD
// --------------------------------------------------------------------------
async function loadDashboardData() {
  try {
    // 1. Cargar proyectos
    const { data: dbProjects, error: projError } = await supabaseClient
      .from('proyectos_contraseñas')
      .select('*')
      .order('nombre');
    
    if (projError) throw projError;
    projects = dbProjects || [];

    // 2. Cargar servicios
    const { data: dbServices, error: servError } = await supabaseClient
      .from('servicios_contraseñas')
      .select('*')
      .order('nombre');
      
    if (servError) throw servError;
    services = dbServices || [];

    // 3. Cargar credenciales
    const { data: dbCreds, error: credError } = await supabaseClient
      .from('credenciales')
      .select('*')
      .order('nombre');
      
    if (credError) throw credError;
    credentials = dbCreds || [];

    // Renderizar componentes
    renderProjectsList();
    renderStats();
    renderCredentialsTable();
  } catch (e) {
    console.error('Error al cargar datos del gestor:', e);
  }
}

function renderUserProfile() {
  if (currentUser) {
    document.getElementById('profileName').textContent = currentUser.nombre;
    const initial = currentUser.nombre ? currentUser.nombre.charAt(0).toUpperCase() : 'U';
    document.getElementById('userAvatar').textContent = initial;
  }
}

function renderStats() {
  document.getElementById('statProjects').textContent = projects.length;
  document.getElementById('statServices').textContent = services.length;
  document.getElementById('statTotalCreds').textContent = credentials.length;
  
  const sharedCount = credentials.filter(c => c.visibilidad === 'compartido').length;
  const privateCount = credentials.filter(c => c.visibilidad === 'privado').length;
  
  document.getElementById('statShared').textContent = sharedCount;
  document.getElementById('statPrivate').textContent = privateCount;
}

function renderProjectsList() {
  const container = document.getElementById('projectsList');
  container.innerHTML = '';
  
  const searchVal = document.getElementById('searchProject').value.toLowerCase().trim();
  const filteredProjects = projects.filter(p => p.nombre.toLowerCase().includes(searchVal));

  if (filteredProjects.length === 0) {
    container.innerHTML = `<div class="empty-state" style="padding: 1rem 0.5rem; font-size: 0.8rem;">No hay proyectos.</div>`;
    return;
  }

  filteredProjects.forEach(p => {
    const projServices = services.filter(s => s.proyecto_id === p.id);
    const countCreds = credentials.filter(c => projServices.some(s => s.id === c.servicio_id)).length;
    
    const isProjectActive = activeProjectId === p.id;
    
    const projectEl = document.createElement('div');
    projectEl.className = `project-item ${isProjectActive ? 'active' : ''}`;
    
    projectEl.innerHTML = `
      <div class="project-summary" onclick="selectProject('${p.id}')">
        <div class="project-meta">
          <span class="project-dot" style="background: ${p.color || '#3ed1ff'};"></span>
          <span>${escapeHTML(p.nombre)}</span>
        </div>
        <span class="project-count">${countCreds}</span>
      </div>
      <div class="services-list ${isProjectActive ? '' : 'hidden'}">
        ${projServices.map(s => {
          const isServiceActive = activeServiceId === s.id;
          return `
            <div class="service-item ${isServiceActive ? 'active' : ''}" onclick="selectService('${s.id}', event)">
              <span>${escapeHTML(s.nombre)}</span>
            </div>
          `;
        }).join('')}
        <div class="btn-add-service-inline" onclick="openServiceModal('${p.id}', '${escapeHTML(p.nombre).replace(/'/g, "\\'")}', event)">
          <span>+ Agregar Servicio</span>
        </div>
      </div>
    `;
    
    container.appendChild(projectEl);
  });
}

function renderCredentialsTable() {
  const tableBody = document.getElementById('credentialsTableBody');
  tableBody.innerHTML = '';

  const searchVal = document.getElementById('searchCredential').value.toLowerCase().trim();
  
  // Filtrar por proyecto / servicio seleccionado
  let filtered = [...credentials];
  
  if (activeServiceId) {
    filtered = filtered.filter(c => c.servicio_id === activeServiceId);
  } else if (activeProjectId) {
    const projServices = services.filter(s => s.proyecto_id === activeProjectId).map(s => s.id);
    filtered = filtered.filter(c => projServices.includes(c.servicio_id));
  }

  // Filtrar por término de búsqueda
  if (searchVal !== '') {
    filtered = filtered.filter(c => 
      c.nombre.toLowerCase().includes(searchVal) ||
      c.correo.toLowerCase().includes(searchVal) ||
      (c.usuario && c.usuario.toLowerCase().includes(searchVal)) ||
      c.url.toLowerCase().includes(searchVal)
    );
  }

  // Mostrar botón de crear credencial solo si hay un servicio seleccionado
  const btnNewCred = document.getElementById('btnNewCredential');
  if (activeServiceId) {
    btnNewCred.classList.remove('hidden');
  } else {
    btnNewCred.classList.add('hidden');
  }

  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" class="empty-state">No se encontraron credenciales.</td></tr>`;
    return;
  }

  filtered.forEach(c => {
    const isSelected = activeCredentialId === c.id;
    const tr = document.createElement('tr');
    tr.className = isSelected ? 'active' : '';
    tr.onclick = () => selectCredential(c.id);
    
    tr.innerHTML = `
      <td><strong>${escapeHTML(c.nombre)}</strong></td>
      <td>${escapeHTML(c.correo)}</td>
      <td>${escapeHTML(c.usuario || '-')}</td>
      <td class="mono">${escapeHTML(c.url)}</td>
      <td><span class="badge-vis ${c.visibilidad}">${escapeHTML(c.visibilidad)}</span></td>
    `;
    
    tableBody.appendChild(tr);
  });
}

function renderCredentialDetails() {
  const detailsPanel = document.getElementById('detailsPanel');
  const emptyDetails = document.getElementById('emptyDetails');
  const detailsContent = document.getElementById('detailsContent');

  if (!activeCredentialId) {
    emptyDetails.classList.remove('hidden');
    detailsContent.classList.add('hidden');
    return;
  }

  const cred = credentials.find(c => c.id === activeCredentialId);
  if (!cred) {
    activeCredentialId = null;
    emptyDetails.classList.remove('hidden');
    detailsContent.classList.add('hidden');
    return;
  }

  // Buscar nombres de proyecto y servicio
  const service = services.find(s => s.id === cred.servicio_id);
  const project = service ? projects.find(p => p.id === service.proyecto_id) : null;
  const pathText = `${project ? project.nombre : ''} > ${service ? service.nombre : ''}`;

  emptyDetails.classList.add('hidden');
  detailsContent.classList.remove('hidden');

  // Verificar si el usuario actual es el creador de la credencial
  const isOwner = cred.creado_por === currentUser.id;

  detailsContent.innerHTML = `
    <div class="details-header">
      <div class="details-title">
        <h2>${escapeHTML(cred.nombre)}</h2>
        <div class="details-path">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
          <span>${escapeHTML(pathText)}</span>
        </div>
      </div>
      <span class="badge-vis ${cred.visibilidad}">${escapeHTML(cred.visibilidad)}</span>
    </div>

    <div class="details-body">
      <div class="detail-row">
        <label>Correo Electrónico</label>
        <div class="detail-value-wrapper">
          <div class="detail-value" id="detailEmail">${escapeHTML(cred.correo)}</div>
          <button class="btn-copy" onclick="copyToClipboard('${escapeHTML(cred.correo).replace(/'/g, "\\'")}', 'Correo')" title="Copiar correo">📋</button>
        </div>
      </div>

      <div class="detail-row">
        <label>Usuario</label>
        <div class="detail-value-wrapper">
          <div class="detail-value" id="detailUser">${escapeHTML(cred.usuario || 'Opcional')}</div>
          <button class="btn-copy" onclick="copyToClipboard('${escapeHTML(cred.usuario || '').replace(/'/g, "\\'")}', 'Usuario')" title="Copiar usuario">📋</button>
        </div>
      </div>

      <div class="detail-row">
        <label>Contraseña</label>
        <div class="detail-value-wrapper">
          <div class="detail-value mono" id="detailPassword">••••••••••</div>
          <button class="btn-eye" onclick="togglePasswordVisibility(this, '${escapeHTML(cred.password_text).replace(/'/g, "\\'")}')" title="Mostrar contraseña">👁️</button>
          <button class="btn-copy" onclick="copyToClipboard('${escapeHTML(cred.password_text).replace(/'/g, "\\'")}', 'Contraseña')" title="Copiar contraseña">📋</button>
        </div>
      </div>

      <div class="detail-row">
        <label>URL de Acceso</label>
        <div class="detail-value-wrapper">
          <div class="detail-value"><a href="${escapeHTML(cred.url)}" target="_blank" class="url-link">${escapeHTML(cred.url)}</a></div>
          <button class="btn-copy" onclick="copyToClipboard('${escapeHTML(cred.url).replace(/'/g, "\\'")}', 'URL')" title="Copiar URL">📋</button>
        </div>
      </div>

      ${cred.notas ? `
      <div class="detail-row">
        <label>Notas</label>
        <div class="detail-notes">${escapeHTML(cred.notas)}</div>
      </div>
      ` : ''}

      ${isOwner ? `
      <div class="details-actions">
        <button class="btn-outline" onclick="openEditCredentialModal('${cred.id}')" style="flex: 1; justify-content: center;">Editar</button>
        <button class="btn-outline" onclick="deleteCredential('${cred.id}')" style="flex: 1; justify-content: center; border-color: var(--red); color: var(--red);">Eliminar</button>
      </div>
      ` : `
      <div class="detail-row">
        <span style="font-size: 0.75rem; color: var(--muted); text-align: center; display: block; border-top: 1px solid var(--border); padding-top: 1rem;">
          Esta credencial compartida fue creada por otro usuario y no puede ser editada.
        </span>
      </div>
      `}
    </div>
  `;
}

// --------------------------------------------------------------------------
// 6. ACCIONES DE SELECCIÓN Y BÚSQUEDA
// --------------------------------------------------------------------------
function selectProject(projectId) {
  if (activeProjectId === projectId) {
    // Colapsar
    activeProjectId = null;
    activeServiceId = null;
  } else {
    activeProjectId = projectId;
    activeServiceId = null; // Reset servicio activo al cambiar proyecto
  }
  
  // Limpiar credencial activa al cambiar de nivel
  activeCredentialId = null;
  
  updatePathTitle();
  renderProjectsList();
  renderCredentialsTable();
  renderCredentialDetails();
}

function selectService(serviceId, event) {
  if (event) event.stopPropagation(); // Evitar click en proyecto padre
  
  if (activeServiceId === serviceId) {
    activeServiceId = null;
  } else {
    activeServiceId = serviceId;
  }
  
  activeCredentialId = null;
  
  updatePathTitle();
  renderProjectsList();
  renderCredentialsTable();
  renderCredentialDetails();
}

function selectCredential(credId) {
  activeCredentialId = credId;
  renderCredentialsTable();
  renderCredentialDetails();
}

function updatePathTitle() {
  const title = document.getElementById('selectedPathTitle');
  const desc = document.getElementById('selectedPathDesc');
  
  if (activeServiceId) {
    const s = services.find(serv => serv.id === activeServiceId);
    const p = projects.find(proj => proj.id === s.proyecto_id);
    title.textContent = `${p ? p.nombre : ''} > ${s ? s.nombre : ''}`;
    desc.textContent = s.descripcion || 'Visualizando las credenciales de este servicio.';
  } else if (activeProjectId) {
    const p = projects.find(proj => proj.id === activeProjectId);
    title.textContent = p ? p.nombre : 'Proyecto';
    desc.textContent = p.descripcion || 'Visualizando todos los servicios de este proyecto.';
  } else {
    title.textContent = 'Todos los accesos';
    desc.textContent = 'Selecciona un proyecto o servicio para ver las credenciales asociadas.';
  }
}

// --------------------------------------------------------------------------
// 7. OPERACIONES DE ESCRITURA (MODALES & DB CRUD)
// --------------------------------------------------------------------------
async function handleCreateProject(e) {
  e.preventDefault();
  const name = document.getElementById('projectName').value.trim();
  const desc = document.getElementById('projectDesc').value.trim();
  const color = document.querySelector('input[name="projColor"]:checked').value;

  try {
    const { data, error } = await supabaseClient
      .from('proyectos_contraseñas')
      .insert({
        nombre: name,
        descripcion: desc,
        color: color,
        creado_por: currentUser.id
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        alert('Ya existe un proyecto con ese nombre.');
      } else {
        throw error;
      }
      return;
    }

    closeModal('modalProject');
    showToast(`Proyecto "${name}" creado`);
    
    // Recargar datos
    await loadDashboardData();
    // Auto seleccionar proyecto creado
    if (data) {
      selectProject(data.id);
    }
  } catch (e) {
    console.error('Error al crear proyecto:', e);
    alert('Ocurrió un error al crear el proyecto.');
  }
}

async function handleCreateService(e) {
  e.preventDefault();
  const name = document.getElementById('serviceName').value.trim();
  const desc = document.getElementById('serviceDesc').value.trim();
  const projectId = document.getElementById('serviceProjectId').value;

  try {
    const { data, error } = await supabaseClient
      .from('servicios_contraseñas')
      .insert({
        nombre: name,
        descripcion: desc,
        proyecto_id: projectId,
        creado_por: currentUser.id
      })
      .select()
      .single();

    if (error) throw error;

    closeModal('modalService');
    showToast(`Servicio "${name}" agregado`);
    
    await loadDashboardData();
    
    // Auto seleccionar servicio creado
    if (data) {
      activeProjectId = projectId;
      selectService(data.id);
    }
  } catch (e) {
    console.error('Error al crear servicio:', e);
    alert('Ocurrió un error al crear el servicio.');
  }
}

async function handleCreateOrEditCredential(e) {
  e.preventDefault();
  const id = document.getElementById('credId').value;
  const serviceId = document.getElementById('credServiceId').value;
  const name = document.getElementById('credName').value.trim();
  const vis = document.getElementById('credVisibility').value;
  const email = document.getElementById('credEmail').value.trim();
  const user = document.getElementById('credUser').value.trim();
  const pass = document.getElementById('credPassword').value;
  const url = document.getElementById('credUrl').value.trim();
  const notes = document.getElementById('credNotes').value.trim();

  const payload = {
    servicio_id: serviceId,
    nombre: name,
    correo: email,
    usuario: user || null,
    password_text: pass,
    url: url,
    notas: notes || null,
    visibilidad: vis
  };

  try {
    if (id) {
      // Editar
      const { error } = await supabaseClient
        .from('credenciales')
        .update(payload)
        .eq('id', id);

      if (error) throw error;
      showToast(`Ingreso "${name}" actualizado`);
    } else {
      // Crear nuevo
      payload.creado_por = currentUser.id;
      const { error } = await supabaseClient
        .from('credenciales')
        .insert(payload);

      if (error) throw error;
      showToast(`Ingreso "${name}" creado`);
    }

    closeModal('modalCredential');
    await loadDashboardData();
  } catch (e) {
    console.error('Error al guardar credencial:', e);
    alert('Ocurrió un error al guardar la credencial.');
  }
}

async function deleteCredential(id) {
  const cred = credentials.find(c => c.id === id);
  if (!cred) return;

  if (confirm(`¿Estás seguro de que deseas eliminar el acceso "${cred.nombre}"?`)) {
    try {
      const { error } = await supabaseClient
        .from('credenciales')
        .delete()
        .eq('id', id);

      if (error) throw error;

      showToast(`Acceso "${cred.nombre}" eliminado`);
      activeCredentialId = null;
      
      await loadDashboardData();
    } catch (e) {
      console.error('Error al eliminar credencial:', e);
      alert('No se pudo eliminar la credencial.');
    }
  }
}

// --------------------------------------------------------------------------
// 8. INTERFACES DE COPIADO Y DETALLES DE VISIBILIDAD
// --------------------------------------------------------------------------
function togglePasswordVisibility(btn, password) {
  const valueContainer = document.getElementById('detailPassword');
  if (valueContainer.textContent === '••••••••••') {
    valueContainer.textContent = password;
    btn.textContent = '🔒';
    btn.title = 'Ocultar contraseña';
  } else {
    valueContainer.textContent = '••••••••••';
    btn.textContent = '👁️';
    btn.title = 'Mostrar contraseña';
  }
}

function copyToClipboard(text, fieldName) {
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast(`${fieldName} copiado al portapapeles`);
  }).catch(err => {
    console.error('Error al copiar:', err);
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  
  // Reiniciar la animación forzando reflow
  toast.style.animation = 'none';
  toast.offsetHeight; /* reflow */
  toast.style.animation = 'toastFade 2.5s forwards';

  setTimeout(() => {
    toast.classList.add('hidden');
  }, 2500);
}

// Generador de contraseñas seguras integrado en Modal
function generateSecurePassword() {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~`|}{[]:;?><,./-=";
  let pass = "";
  for (let i = 0; i < 16; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  document.getElementById('credPassword').value = pass;
}

// --------------------------------------------------------------------------
// 9. CONFIGURACIÓN DE MODALES E INTERACCIONES UI
// --------------------------------------------------------------------------
function setupEventListeners() {
  // Resetear temporizador de inactividad con interacciones
  ['click', 'keypress', 'mousemove', 'scroll', 'touchstart'].forEach(eventName => {
    document.addEventListener(eventName, resetActivityTimer, { passive: true });
  });

  // Login
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const user = document.getElementById('loginUser').value.trim();
    const pass = document.getElementById('loginPassword').value;
    login(user, pass);
  });

  // Cambio de contraseña primer acceso
  setupPasswordStrengthValidation();
  document.getElementById('setupForm').addEventListener('submit', handlePasswordSetup);

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', logout);

  // Filtros de búsqueda local e instantánea
  document.getElementById('searchProject').addEventListener('input', renderProjectsList);
  document.getElementById('searchCredential').addEventListener('input', renderCredentialsTable);

  // Proyectos Modales
  document.getElementById('btnNewProject').addEventListener('click', () => openModal('modalProject'));
  document.getElementById('btnCloseProjectModal').addEventListener('click', () => closeModal('modalProject'));
  document.getElementById('btnCancelProject').addEventListener('click', () => closeModal('modalProject'));
  document.getElementById('formProject').addEventListener('submit', handleCreateProject);

  // Servicios Modales
  document.getElementById('btnCloseServiceModal').addEventListener('click', () => closeModal('modalService'));
  document.getElementById('btnCancelService').addEventListener('click', () => closeModal('modalService'));
  document.getElementById('formService').addEventListener('submit', handleCreateService);

  // Credenciales Modales
  document.getElementById('btnNewCredential').addEventListener('click', openCreateCredentialModal);
  document.getElementById('btnCloseCredModal').addEventListener('click', () => closeModal('modalCredential'));
  document.getElementById('btnCancelCred').addEventListener('click', () => closeModal('modalCredential'));
  document.getElementById('formCredential').addEventListener('submit', handleCreateOrEditCredential);
  
  // Ojo de contraseña en Modal
  document.getElementById('btnModalPassEye').addEventListener('click', function() {
    const input = document.getElementById('credPassword');
    if (input.type === 'password') {
      input.type = 'text';
      this.textContent = '🔒';
    } else {
      input.type = 'password';
      this.textContent = '👁️';
    }
  });

  // Generador de contraseña en Modal
  document.getElementById('btnModalPassGen').addEventListener('click', generateSecurePassword);

  // Manejar click en select de autobloqueo
  document.getElementById('lockTimerSelect').addEventListener('change', startInactivityTimer);
}

function openModal(id) {
  document.getElementById(id).classList.remove('hidden');
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

function openServiceModal(projectId, projectName, event) {
  if (event) event.stopPropagation();
  
  document.getElementById('serviceProjectId').value = projectId;
  document.getElementById('serviceProjectName').value = projectName;
  document.getElementById('serviceName').value = '';
  document.getElementById('serviceDesc').value = '';
  
  openModal('modalService');
}

function openCreateCredentialModal() {
  if (!activeServiceId) return;

  document.getElementById('credentialModalTitle').textContent = 'Nuevo Ingreso';
  document.getElementById('credId').value = '';
  document.getElementById('credServiceId').value = activeServiceId;
  document.getElementById('credName').value = '';
  document.getElementById('credEmail').value = '';
  document.getElementById('credUser').value = '';
  document.getElementById('credPassword').value = '';
  document.getElementById('credUrl').value = '';
  document.getElementById('credNotes').value = '';
  document.getElementById('credVisibility').value = 'privado';
  document.getElementById('credPassword').type = 'password';
  document.getElementById('btnModalPassEye').textContent = '👁️';

  openModal('modalCredential');
}

function openEditCredentialModal(id) {
  const cred = credentials.find(c => c.id === id);
  if (!cred) return;

  document.getElementById('credentialModalTitle').textContent = 'Editar Ingreso';
  document.getElementById('credId').value = cred.id;
  document.getElementById('credServiceId').value = cred.servicio_id;
  document.getElementById('credName').value = cred.nombre;
  document.getElementById('credEmail').value = cred.correo;
  document.getElementById('credUser').value = cred.usuario || '';
  document.getElementById('credPassword').value = cred.password_text;
  document.getElementById('credUrl').value = cred.url;
  document.getElementById('credNotes').value = cred.notas || '';
  document.getElementById('credVisibility').value = cred.visibilidad;
  document.getElementById('credPassword').type = 'password';
  document.getElementById('btnModalPassEye').textContent = '👁️';

  openModal('modalCredential');
}

// --------------------------------------------------------------------------
// 10. HELPERS
// --------------------------------------------------------------------------
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
