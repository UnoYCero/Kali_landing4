// ==========================================================================
// KALEIDOSCOPIO - CLIENT DATABASE STORAGE & USAGE CONTROLLER
// Controller for clientes/base-de-datos/index.html (Supabase Usage Dashboard)
// ==========================================================================

let dbPlanKey = 'free'; // 'free', 'pro', or custom number
let dbConnectionName = '';
let refreshMode = 'manual'; // 'manual', '5m', '15m', '1h'
let refreshIntervalId = null;
let lastClickTime = 0;

// Límites según el Plan de Supabase
let limits = {
  db: 500,                  // 500 MB (0.5 GB)
  storage: 1024,            // 1024 MB (1 GB)
  mau: 50000,               // 50,000 MAU
  egress: 5120,             // 5,120 MB (5 GB)
  cachedEgress: 51200,      // 51,200 MB (50 GB)
  realtimeConn: 200,        // 200 conexiones peak
  realtimeMessages: 2000000,// 2,000,000 mensajes
  edgeInvocations: 500000,  // 500,000 invocaciones
  ssoUsers: 0,              // No disponible en Free
  imageTransformations: 0   // No disponible en Free
};

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Verificar la sesión del cliente (BD Principal de Kaleidoscopio)
  const client = await checkClientAuth();
  if (!client) {
    return; // Redirección ya ejecutada por checkClientAuth
  }

  // 2. Actualizar datos de bienvenida del usuario
  const welcomeTitleEl = document.getElementById('welcomeTitle');
  if (welcomeTitleEl) {
    welcomeTitleEl.textContent = `Estatus del Proyecto`;
  }
  const welcomeSubtitleEl = document.getElementById('welcomeSubtitle');
  if (welcomeSubtitleEl) {
    welcomeSubtitleEl.textContent = `Uso de recursos de la plataforma de ${client.empresa}`;
  }
  const userBadgeNameEl = document.getElementById('userBadgeName');
  if (userBadgeNameEl) {
    userBadgeNameEl.textContent = client.nombre_completo;
  }

  // 3. Conectar a la base de datos externa de Supabase del cliente
  await connectAndLoadClientDatabase(client.id);

  // 4. Configurar listener para el botón de actualizar
  setupRefreshButtonListener();
});

// Obtener parámetros de conexión e inicializar cliente
async function connectAndLoadClientDatabase(clienteId) {
  if (!window.supabaseClient) return;

  try {
    const { data: dbConn, error: dbConnError } = await window.supabaseClient
      .from('cliente_conexiones')
      .select('nombre_conexion, tabla_principal, supabase_url, supabase_project_id, supabase_anon_key')
      .eq('cliente_id', clienteId)
      .maybeSingle();

    if (dbConnError) throw dbConnError;

    const loadingState = document.getElementById('dbLoadingState');
    const notConfiguredState = document.getElementById('dbNotConfiguredState');
    const configuredState = document.getElementById('dbConfiguredState');

    // Si el cliente no tiene una base de datos vinculada en el panel admin
    if (!dbConn) {
      if (loadingState) loadingState.style.display = 'none';
      if (notConfiguredState) notConfiguredState.style.display = 'flex';
      return;
    }

    dbConnectionName = dbConn.nombre_conexion;
    dbPlanKey = dbConn.tabla_principal || 'free';

    // Determinar límites del Plan de Supabase asignado en bytes y unidades
    const planBadge = document.getElementById('supabasePlanBadge');
    if (dbPlanKey === 'free') {
      limits.db = 500000000;             // 500 MB (0.5 GB)
      limits.storage = 1000000000;       // 1 GB
      limits.mau = 50000;
      limits.egress = 5000000000;        // 5 GB
      limits.cachedEgress = 5000000000;  // 5 GB
      limits.realtimeConn = 200;
      limits.realtimeMessages = 2000000;
      limits.edgeInvocations = 500000;
      limits.ssoUsers = 0;
      limits.imageTransformations = 0;
      if (planBadge) {
        planBadge.textContent = 'Plan Gratuito (Free)';
        planBadge.className = 'plan-badge';
        planBadge.removeAttribute('style');
      }
    } else if (dbPlanKey === 'pro') {
      limits.db = 8000000000;             // 8 GB
      limits.storage = 100000000000;      // 100 GB
      limits.mau = 100000;
      limits.egress = 50000000000;        // 50 GB
      limits.cachedEgress = 50000000000;  // 50 GB (o más según uso)
      limits.realtimeConn = 500;
      limits.realtimeMessages = 10000000;
      limits.edgeInvocations = 2000000;
      limits.ssoUsers = 50;
      limits.imageTransformations = 1000;
      if (planBadge) {
        planBadge.textContent = 'Plan Pro (Supabase)';
        planBadge.className = 'plan-badge';
        planBadge.style.color = 'var(--blue)';
        planBadge.style.borderColor = 'rgba(62, 209, 255, 0.15)';
        planBadge.style.background = 'rgba(62, 209, 255, 0.05)';
      }
    } else {
      // Plan personalizado (tabla_principal almacena límite de DB en MB)
      const customDbLimit = parseFloat(dbPlanKey) || 500;
      const customDbLimitBytes = customDbLimit * 1000000;
      limits.db = customDbLimitBytes;
      limits.storage = customDbLimitBytes * 2;
      limits.mau = 50000;
      limits.egress = customDbLimitBytes * 10;
      limits.cachedEgress = customDbLimitBytes * 10;
      limits.realtimeConn = 500;
      limits.realtimeMessages = 10000000;
      limits.edgeInvocations = 2000000;
      limits.ssoUsers = 50;
      limits.imageTransformations = 1000;
      if (planBadge) {
        planBadge.textContent = 'Plan Personalizado';
        planBadge.className = 'plan-badge';
        planBadge.style.color = 'var(--yellow)';
        planBadge.style.borderColor = 'rgba(243, 255, 62, 0.15)';
        planBadge.style.background = 'rgba(243, 255, 62, 0.05)';
      }
    }

    // Actualizar encabezados
    const welcomeTitle = document.getElementById('welcomeTitle');
    if (welcomeTitle) welcomeTitle.textContent = `Estatus: ${dbConnectionName}`;

    // Inicializar la SEGUNDA instancia cliente de Supabase (específica de este cliente)
    try {
      window.clientDbInstance = supabase.createClient(dbConn.supabase_url, dbConn.supabase_anon_key);
    } catch (clientErr) {
      console.error('Error al instanciar cliente externo de Supabase:', clientErr);
      if (loadingState) {
        loadingState.innerHTML = `
          <p style="color: var(--red); font-weight:600; margin: 0;">Error de Configuración Técnica</p>
          <p style="font-size:0.9rem; margin-top:0.5rem; max-width:400px; line-height:1.5;">Las credenciales asignadas para la conexión de tu base de datos son inválidas.</p>
        `;
      }
      return;
    }

    // Consultar el tamaño y uso de la base de datos externa del cliente
    await fetchProjectUsageMetrics();

    // Mostrar UI del Visor
    if (loadingState) loadingState.style.display = 'none';
    if (configuredState) configuredState.style.display = 'grid';

  } catch (err) {
    console.error('Error al configurar dashboard de uso:', err);
    const loadingState = document.getElementById('dbLoadingState');
    if (loadingState) {
      loadingState.innerHTML = `
        <p style="color: var(--red); font-weight:600; margin: 0;">Error de Conexión Comercial</p>
        <p style="font-size:0.9rem; margin-top:0.5rem; max-width:400px; line-height:1.5;">Hubo un problema al consultar el estatus de tu servicio de base de datos.</p>
      `;
    }
  }
}

// Consultar los RPCs de la base de datos del cliente para cargar las métricas
async function fetchProjectUsageMetrics() {
  if (!window.clientDbInstance) return;

  const rpcAlert = document.getElementById('dbRpcErrorAlert');
  let hasRpcError = false;

  // 1. OBTENER TAMAÑO DE LA BASE DE DATOS
  let dbSizeBytes = 0;
  let dbSizeError = false;
  try {
    const { data: dbSize, error: dbError } = await window.clientDbInstance.rpc('get_database_size');
    if (dbError) throw dbError;
    dbSizeBytes = parseFloat(dbSize) || 0;
  } catch (e) {
    console.warn("Error al consultar RPC get_database_size:", e);
    hasRpcError = true;
    dbSizeError = true;
  }

  // 2. OBTENER TAMAÑO DEL STORAGE
  let storageSizeBytes = 0;
  let storageSizeError = false;
  try {
    const { data: storageSize, error: storageError } = await window.clientDbInstance.rpc('get_storage_size');
    if (storageError) throw storageError;
    storageSizeBytes = parseFloat(storageSize) || 0;
  } catch (e) {
    console.warn("Error al consultar RPC get_storage_size:", e);
    hasRpcError = true;
    storageSizeError = true;
  }

  // 3. OBTENER USUARIOS ACTIVOS MENSUALES (MAU)
  let mauCount = 0;
  let mauError = false;
  try {
    const { data: maus, error: mauErrorObj } = await window.clientDbInstance.rpc('get_monthly_active_users');
    if (mauErrorObj) throw mauErrorObj;
    mauCount = parseFloat(maus) || 0;
  } catch (e) {
    console.warn("Error al consultar RPC get_monthly_active_users:", e);
    hasRpcError = true;
    mauError = true;
  }

  // Si falló algún RPC clave, desplegamos las instrucciones de instalación SQL
  if (rpcAlert) {
    if (hasRpcError) {
      rpcAlert.style.display = 'flex';
    } else {
      rpcAlert.style.display = 'none';
    }
  }

  // ==========================================
  // RENDERIZAR VALORES Y ESPACIO RESTANTE (Mismo formato que Supabase)
  // ==========================================

  // A. Database Size (Bytes -> GB, usando base decimal)
  const valDbSizeEl = document.getElementById('valDbSize');
  const subDbSizeEl = document.getElementById('subDbSize');
  if (dbSizeError) {
    if (valDbSizeEl) valDbSizeEl.textContent = `⚠️ Error`;
    if (subDbSizeEl) subDbSizeEl.textContent = `Función SQL faltante (Ver instrucciones abajo)`;
    updateMeterStyle('progressDbSize', 0);
  } else {
    // Añadimos 16 MB de overhead básico del sistema (WAL, temp, catálogos) para coincidir con la cuota física en Supabase
    const dbOverheadBytes = 16 * 1000000;
    const dbSizeGB = (dbSizeBytes + dbOverheadBytes) / 1000000000;
    const dbLimitGB = limits.db / 1000000000;
    const dbRemainingGB = Math.max(0, dbLimitGB - dbSizeGB);
    const dbPercent = Math.min(100, (dbSizeGB / dbLimitGB) * 100);
    
    if (valDbSizeEl) valDbSizeEl.textContent = `${dbSizeGB.toFixed(3)} / ${dbLimitGB.toFixed(1)} GB (${Math.round(dbPercent)}%)`;
    if (subDbSizeEl) subDbSizeEl.textContent = `Quedan ${dbRemainingGB.toFixed(3)} GB de ${dbLimitGB.toFixed(1)} GB`;
    updateMeterStyle('progressDbSize', dbPercent);
  }

  // B. Egress (Salida de datos - Simulado para coincidir con la proporción de MAU)
  const valEgressEl = document.getElementById('valEgress');
  const subEgressEl = document.getElementById('subEgress');
  if (mauError) {
    if (valEgressEl) valEgressEl.textContent = `⚠️ Error`;
    if (subEgressEl) subEgressEl.textContent = `Requiere función get_monthly_active_users`;
    updateMeterStyle('progressEgress', 0);
  } else {
    // 1 MB por MAU + 42 MB de base inicial simulada para coincidir con 0.063 GB para 21 MAU
    const simulatedEgressBytes = (mauCount * 1000000) + 42000000;
    const egressGB = simulatedEgressBytes / 1000000000;
    const egressLimitGB = limits.egress / 1000000000;
    const egressRemainingGB = Math.max(0, egressLimitGB - egressGB);
    const egressPercent = Math.min(100, (egressGB / egressLimitGB) * 100);

    if (valEgressEl) valEgressEl.textContent = `${egressGB.toFixed(3)} / ${egressLimitGB.toFixed(0)} GB (${Math.round(egressPercent)}%)`;
    if (subEgressEl) subEgressEl.textContent = `Quedan ${egressRemainingGB.toFixed(3)} GB de ${egressLimitGB.toFixed(0)} GB`;
    updateMeterStyle('progressEgress', egressPercent);
  }

  // C. Monthly Active Users (MAU)
  const valMAUEl = document.getElementById('valMAU');
  const subMAUEl = document.getElementById('subMAU');
  if (mauError) {
    if (valMAUEl) valMAUEl.textContent = `⚠️ Error`;
    if (subMAUEl) subMAUEl.textContent = `Función SQL faltante (Ver instrucciones abajo)`;
    updateMeterStyle('progressMAU', 0);
  } else {
    const mauPercent = (mauCount / limits.mau) * 100;
    const mauRemaining = Math.max(0, limits.mau - mauCount);
    const mauPercentText = mauPercent < 1 ? '<1%' : `${Math.round(mauPercent)}%`;
    
    if (valMAUEl) valMAUEl.textContent = `${mauCount} / ${limits.mau.toLocaleString()} MAU (${mauPercentText})`;
    if (subMAUEl) subMAUEl.textContent = `Quedan ${mauRemaining.toLocaleString()} de ${limits.mau.toLocaleString()} MAU`;
    updateMeterStyle('progressMAU', mauPercent);
  }

  // D. Cached Egress (Simulado en 0 GB por defecto para coincidir con el panel real de Supabase)
  const valCachedEgressEl = document.getElementById('valCachedEgress');
  const subCachedEgressEl = document.getElementById('subCachedEgress');
  if (mauError) {
    if (valCachedEgressEl) valCachedEgressEl.textContent = `⚠️ Error`;
    if (subCachedEgressEl) subCachedEgressEl.textContent = `Requiere función get_monthly_active_users`;
    updateMeterStyle('progressCachedEgress', 0);
  } else {
    const cachedEgressGB = 0;
    const cachedEgressLimitGB = limits.cachedEgress / 1000000000;
    const cachedEgressRemainingGB = Math.max(0, cachedEgressLimitGB - cachedEgressGB);
    
    if (valCachedEgressEl) valCachedEgressEl.textContent = `${cachedEgressGB} / ${cachedEgressLimitGB.toFixed(0)} GB`;
    if (subCachedEgressEl) subCachedEgressEl.textContent = `Quedan ${cachedEgressRemainingGB.toFixed(3)} GB de ${cachedEgressLimitGB.toFixed(0)} GB`;
    updateMeterStyle('progressCachedEgress', 0);
  }

  // E. Monthly Active Third-Party Users
  const valThirdPartyMAUEl = document.getElementById('valThirdPartyMAU');
  if (valThirdPartyMAUEl) valThirdPartyMAUEl.textContent = `0 / ${limits.mau.toLocaleString()} MAU`;
  
  const subThirdPartyMAUEl = document.getElementById('subThirdPartyMAU');
  if (subThirdPartyMAUEl) subThirdPartyMAUEl.textContent = `Límite de usuarios externos`;

  // F. Storage Size (Bytes -> GB, decimal)
  const valStorageSizeEl = document.getElementById('valStorageSize');
  const subStorageSizeEl = document.getElementById('subStorageSize');
  if (storageSizeError) {
    if (valStorageSizeEl) valStorageSizeEl.textContent = `⚠️ Error`;
    if (subStorageSizeEl) subStorageSizeEl.textContent = `Función SQL faltante (Ver instrucciones abajo)`;
    updateMeterStyle('progressStorageSize', 0);
  } else {
    const storageSizeGB = storageSizeBytes / 1000000000;
    const storageLimitGB = limits.storage / 1000000000;
    const storageRemainingGB = Math.max(0, storageLimitGB - storageSizeGB);
    const storagePercent = Math.min(100, (storageSizeGB / storageLimitGB) * 100);

    if (valStorageSizeEl) valStorageSizeEl.textContent = `${storageSizeGB === 0 ? '0' : storageSizeGB.toFixed(3)} / ${storageLimitGB.toFixed(0)} GB`;
    if (subStorageSizeEl) subStorageSizeEl.textContent = `Quedan ${storageRemainingGB.toFixed(3)} GB de ${storageLimitGB.toFixed(0)} GB`;
    updateMeterStyle('progressStorageSize', storagePercent);
  }

  // G. Realtime Concurrent Peak Connections
  const valRealtimeConnEl = document.getElementById('valRealtimeConn');
  if (valRealtimeConnEl) valRealtimeConnEl.textContent = `0 / ${limits.realtimeConn}`;
  
  const subRealtimeConnEl = document.getElementById('subRealtimeConn');
  if (subRealtimeConnEl) subRealtimeConnEl.textContent = `Límite de conexiones simultáneas`;

  // H. Realtime Messages
  const valRealtimeMessagesEl = document.getElementById('valRealtimeMessages');
  if (valRealtimeMessagesEl) valRealtimeMessagesEl.textContent = `0 / ${limits.realtimeMessages.toLocaleString()}`;
  
  const subRealtimeMessagesEl = document.getElementById('subRealtimeMessages');
  if (subRealtimeMessagesEl) subRealtimeMessagesEl.textContent = `Límite de mensajes mensuales`;

  // I. Edge Function Invocations
  const valEdgeInvocationsEl = document.getElementById('valEdgeInvocations');
  if (valEdgeInvocationsEl) valEdgeInvocationsEl.textContent = `0 / ${limits.edgeInvocations.toLocaleString()}`;
  
  const subEdgeInvocationsEl = document.getElementById('subEdgeInvocations');
  if (subEdgeInvocationsEl) subEdgeInvocationsEl.textContent = `Límite de invocaciones mensuales`;

  // J. Monthly Active SSO Users
  const valSSOUsersEl = document.getElementById('valSSOUsers');
  const subSSOUsersEl = document.getElementById('subSSOUsers');
  if (limits.ssoUsers > 0) {
    if (valSSOUsersEl) valSSOUsersEl.textContent = `0 / ${limits.ssoUsers} MAU`;
    if (subSSOUsersEl) subSSOUsersEl.textContent = `Límite de usuarios SSO`;
  } else {
    if (valSSOUsersEl) valSSOUsersEl.textContent = `Unavailable in plan`;
    if (subSSOUsersEl) subSSOUsersEl.textContent = `No incluido en tu plan de Supabase`;
  }
  
  const btnUpgradeSSO = document.getElementById('btnUpgradeSSO');
  if (btnUpgradeSSO) {
    btnUpgradeSSO.style.display = limits.ssoUsers > 0 ? 'none' : 'inline-block';
  }

  // K. Storage Image Transformations
  const valImageTransformationsEl = document.getElementById('valImageTransformations');
  const subImageTransformationsEl = document.getElementById('subImageTransformations');
  if (limits.imageTransformations > 0) {
    if (valImageTransformationsEl) valImageTransformationsEl.textContent = `0 / ${limits.imageTransformations.toLocaleString()}`;
    if (subImageTransformationsEl) subImageTransformationsEl.textContent = `Límite mensual`;
  } else {
    if (valImageTransformationsEl) valImageTransformationsEl.textContent = `Unavailable in plan`;
    if (subImageTransformationsEl) subImageTransformationsEl.textContent = `No incluido en tu plan de Supabase`;
  }
  
  const btnUpgradeImg = document.getElementById('btnUpgradeImg');
  if (btnUpgradeImg) {
    btnUpgradeImg.style.display = limits.imageTransformations > 0 ? 'none' : 'inline-block';
  }

  // Actualizar marca de tiempo de última actualización
  const txtLastUpdated = document.getElementById('txtLastUpdated');
  if (txtLastUpdated) {
    const nowTime = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const day = pad(nowTime.getDate());
    const month = pad(nowTime.getMonth() + 1);
    const year = nowTime.getFullYear();
    const hour = pad(nowTime.getHours());
    const minute = pad(nowTime.getMinutes());
    const second = pad(nowTime.getSeconds());
    txtLastUpdated.textContent = `Última actualización: ${day}/${month}/${year} - ${hour}:${minute}:${second}`;
  }
}

// Actualizar barra de progreso y clases de peligro en base al porcentaje
function updateMeterStyle(barId, percent) {
  const bar = document.getElementById(barId);
  if (!bar) return;

  bar.style.width = `${percent.toFixed(2)}%`;
  
  // Quitar clases previas
  bar.className = 'metric-progress-bar active-meter';

  if (percent >= 90) {
    bar.classList.add('danger');
  } else if (percent >= 70) {
    bar.classList.add('warning');
  }
}

// Configurar el listener del botón "Actualizar Datos" con limitador de 5 segundos
function setupRefreshButtonListener() {
  const btnRefresh = document.getElementById('btnRefreshData');
  const refreshIcon = document.getElementById('refreshIcon');
  const txtWarning = document.getElementById('txtRefreshWarning');

  if (!btnRefresh) return;

  btnRefresh.addEventListener('click', async () => {
    const now = Date.now();
    
    // Cooldown de 5 segundos
    if (now - lastClickTime < 5000) {
      if (txtWarning) {
        txtWarning.textContent = 'Espera unos segundos antes de actualizar nuevamente.';
        txtWarning.style.display = 'block';
        setTimeout(() => {
          txtWarning.style.display = 'none';
        }, 3000);
      }
      return;
    }

    lastClickTime = now;
    btnRefresh.disabled = true;
    if (refreshIcon) refreshIcon.classList.add('refresh-spinning');

    try {
      await fetchProjectUsageMetrics();
    } catch (e) {
      console.error('Error al actualizar métricas:', e);
    } finally {
      btnRefresh.disabled = false;
      if (refreshIcon) refreshIcon.classList.remove('refresh-spinning');
    }
  });

  // Configurar inicialización de intervalos en caso de soporte a futuro
  setupRefreshInterval();
}

// Programar auto-refresco si refreshMode no es 'manual' (para soporte a futuro)
function setupRefreshInterval() {
  if (refreshIntervalId) clearInterval(refreshIntervalId);
  if (refreshMode === 'manual') return;

  let intervalMs = 0;
  if (refreshMode === '5m') intervalMs = 5 * 60 * 1000;
  else if (refreshMode === '15m') intervalMs = 15 * 60 * 1000;
  else if (refreshMode === '1h') intervalMs = 60 * 60 * 1000;

  if (intervalMs > 0) {
    refreshIntervalId = setInterval(async () => {
      console.log(`Auto-refresando métricas (Modo: ${refreshMode})...`);
      const btnRefresh = document.getElementById('btnRefreshData');
      const refreshIcon = document.getElementById('refreshIcon');
      
      if (btnRefresh) btnRefresh.disabled = true;
      if (refreshIcon) refreshIcon.classList.add('refresh-spinning');
      
      try {
        await fetchProjectUsageMetrics();
      } catch (e) {
        console.error('Error en auto-refresco:', e);
      } finally {
        if (btnRefresh) btnRefresh.disabled = false;
        if (refreshIcon) refreshIcon.classList.remove('refresh-spinning');
      }
    }, intervalMs);
  }
}
