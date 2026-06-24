// ==========================================================================
// KALEIDOSCOPIO - ADMIN GESTIÓN DE CUENTAS CONTROLLER
// Controller for admin/cuentas/index.html (List-Detail UI)
// ==========================================================================

window.onerror = function(message, source, lineno, colno, error) {
  alert("ERROR DETECTADO:\n" + message + "\nEn: " + source + "\nLínea: " + lineno + ":" + colno);
};

let allClients = [];
let selectedClienteId = null;

// Variables de temporizador
let timerInterval = null;
let elapsedSeconds = 0;
let timerState = 'stopped'; // 'running', 'paused', 'stopped'
let startTimeIso = null;
let endTimeIso = null;

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Proteger la ruta - Verificar sesión
  const authenticated = await checkAuth();
  if (!authenticated) {
    return; // Redirección ya ejecutada por checkAuth
  }

  // 2. Rellenar día de corte selector (1-31)
  const commCutoffSelect = document.getElementById('commCutoffDay');
  let dayOptionsHtml = '';
  for (let i = 1; i <= 31; i++) {
    dayOptionsHtml += `<option value="${i}">${i}</option>`;
  }
  commCutoffSelect.innerHTML = dayOptionsHtml;

  // 3. Configurar pestañas (tabs) de bitácoras
  const tabTech = document.getElementById('tabBitacoraTecnica');
  const tabAudit = document.getElementById('tabBitacoraAuditoria');
  const panelTech = document.getElementById('panelBitacoraTecnica');
  const panelAudit = document.getElementById('panelBitacoraAuditoria');

  tabTech.addEventListener('click', () => {
    tabTech.classList.add('active');
    tabAudit.classList.remove('active');
    panelTech.classList.add('active');
    panelAudit.classList.remove('active');
  });

  tabAudit.addEventListener('click', () => {
    tabAudit.classList.add('active');
    tabTech.classList.remove('active');
    panelAudit.classList.add('active');
    panelTech.classList.remove('active');
  });

  // 4. Buscador en barra lateral (Sidebar)
  const searchInput = document.getElementById('searchClientSidebar');
  searchInput.addEventListener('input', () => {
    renderClientsList(searchInput.value.toLowerCase().trim());
  });

  // 5. Formulario comercial y contrato
  const commercialForm = document.getElementById('commercialForm');
  commercialForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveCommercialData();
  });

  // 6. Cambio de Estado de Cuenta desde Cabecera
  const statusSelect = document.getElementById('detAccountStatus');
  statusSelect.addEventListener('change', async (e) => {
    await updateAccountStatus(e.target.value);
  });

  // 7. Lógica del Temporizador
  const btnStart = document.getElementById('btnTimerStart');
  const btnPause = document.getElementById('btnTimerPause');
  const btnStop = document.getElementById('btnTimerStop');
  const timerDisplay = document.getElementById('timerDisplay');

  btnStart.addEventListener('click', () => {
    if (timerState === 'stopped') {
      elapsedSeconds = 0;
      startTimeIso = new Date().toISOString();
    }
    
    timerState = 'running';
    btnStart.style.display = 'none';
    btnPause.style.display = 'inline-flex';
    btnStop.removeAttribute('disabled');
    btnStop.style.opacity = '1';
    btnStop.style.cursor = 'pointer';

    timerInterval = setInterval(() => {
      elapsedSeconds++;
      timerDisplay.textContent = formatHHMMSS(elapsedSeconds);
    }, 1000);
  });

  btnPause.addEventListener('click', () => {
    clearInterval(timerInterval);
    timerState = 'paused';
    btnPause.style.display = 'none';
    btnStart.style.display = 'inline-flex';
    btnStart.textContent = 'Reanudar';
  });

  btnStop.addEventListener('click', () => {
    clearInterval(timerInterval);
    endTimeIso = new Date().toISOString();

    // Calcular duración exacta H:MM
    const totalMinutes = Math.floor(elapsedSeconds / 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const mStr = m < 10 ? '0' + m : m;

    document.getElementById('worklogDuration').value = `${h}:${mStr}`;
    document.getElementById('worklogResponsible').value = 'Admin';
    document.getElementById('worklogDesc').value = '';
    document.getElementById('worklogComments').value = '';

    // Formatear fechas legibles para el modal
    document.getElementById('worklogStart').value = new Date(startTimeIso).toLocaleTimeString('es-MX');
    document.getElementById('worklogEnd').value = new Date(endTimeIso).toLocaleTimeString('es-MX');

    // Mostrar modal
    document.getElementById('worklogModalOverlay').classList.add('active');
  });

  // Cerrar modal de trabajo
  const closeWorklogModal = () => {
    document.getElementById('worklogModalOverlay').classList.remove('active');
    // Reiniciar interfaz del timer
    timerState = 'stopped';
    timerDisplay.textContent = '00:00:00';
    btnPause.style.display = 'none';
    btnStart.style.display = 'inline-flex';
    btnStart.textContent = 'Iniciar';
    btnStop.setAttribute('disabled', 'true');
    btnStop.style.opacity = '0.5';
    btnStop.style.cursor = 'not-allowed';
  };

  document.getElementById('closeWorklogModal').addEventListener('click', closeWorklogModal);
  document.getElementById('cancelWorklogBtn').addEventListener('click', closeWorklogModal);

  // Formulario de Bitácora Submit
  const worklogForm = document.getElementById('worklogForm');
  worklogForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveWorklog(closeWorklogModal);
  });

  // 8. Formulario de Ajustes Manuales Submit
  const manualAdjForm = document.getElementById('manualAdjustmentForm');
  manualAdjForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await applyManualHoursAdjustment();
  });

  // 9. Formulario de Configuración de Base de Datos Submit e Interacción de Plan
  const dbConfigForm = document.getElementById('databaseConfigForm');
  const dbPlanSelect = document.getElementById('dbConnPlan');
  const dbCustomGroup = document.getElementById('dbConnCustomLimitGroup');
  const dbLimitInput = document.getElementById('dbConnTable');

  if (dbPlanSelect && dbCustomGroup && dbLimitInput) {
    dbPlanSelect.addEventListener('change', (e) => {
      if (e.target.value === 'custom') {
        dbCustomGroup.style.display = 'block';
        dbLimitInput.setAttribute('required', 'true');
      } else {
        dbCustomGroup.style.display = 'none';
        dbLimitInput.removeAttribute('required');
      }
    });
  }

  if (dbConfigForm) {
    dbConfigForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await saveDatabaseConfig();
    });
  }

  // 10. Activación en tiempo real del botón de ver contrato al escribir
  const contractInput = document.getElementById('commContractUrl');
  const btnContract = document.getElementById('btnViewContract');
  contractInput.addEventListener('input', (e) => {
    const url = e.target.value.trim();
    if (url) {
      btnContract.href = url;
      btnContract.style.opacity = '1';
      btnContract.style.pointerEvents = 'auto';
    } else {
      btnContract.removeAttribute('href');
      btnContract.style.opacity = '0.5';
      btnContract.style.pointerEvents = 'none';
    }
  });

  // Módulos Adicionales son estáticos en la interfaz

  // 11. Cargar lista de clientes inicial
  await fetchClients();
});

// Obtener lista completa de clientes de Supabase
async function fetchClients() {
  if (!initSupabase()) return;

  try {
    const { data: clients, error } = await window.supabaseClient
      .from('clientes')
      .select(`
        id,
        nombre_completo,
        empresa,
        correo,
        activo,
        cliente_planes (
          estado
        )
      `)
      .order('nombre_completo', { ascending: true });

    if (error) throw error;

    allClients = (clients || []).map(c => {
      const planState = c.cliente_planes && c.cliente_planes.length > 0
        ? c.cliente_planes[0].estado
        : 'Pendiente';
      return {
        ...c,
        estado: planState
      };
    });

    renderClientsList();

  } catch (err) {
    console.error('Error al obtener clientes:', err);
  }
}

// Renderizar lista en la columna izquierda
function renderClientsList(filter = '') {
  const container = document.getElementById('clientsListContainer');
  if (!container) return;

  const filtered = allClients.filter(c => {
    if (!filter) return true;
    return (
      c.nombre_completo.toLowerCase().includes(filter) ||
      c.empresa.toLowerCase().includes(filter) ||
      c.correo.toLowerCase().includes(filter)
    );
  });

  if (filtered.length === 0) {
    container.innerHTML = '<span style="color:var(--muted); font-size:0.85rem; padding:1rem; text-align:center;">Sin clientes coincidentes.</span>';
    return;
  }

  let html = '';
  filtered.forEach(c => {
    // Badges de estado en barra lateral
    let statusClass = 'pendiente';
    if (c.estado === 'Activo') statusClass = 'activo';
    else if (c.estado === 'Suspendido') statusClass = 'suspendido';

    const isSelected = selectedClienteId === c.id ? 'selected' : '';

    html += `
      <button class="client-item-btn ${isSelected}" onclick="selectCliente('${c.id}')">
        <div class="client-item-name">${escapeHtml(c.nombre_completo)}</div>
        <div class="client-item-company">${escapeHtml(c.empresa)}</div>
        <div class="client-item-email">${escapeHtml(c.correo)}</div>
        <div class="client-item-footer">
          <span class="client-badge-status ${statusClass}" style="padding:0.2rem 0.5rem; font-size:0.7rem;">${c.estado}</span>
        </div>
      </button>
    `;
  });

  container.innerHTML = html;
}

// Seleccionar cliente y cargar su ficha en el panel derecho
async function selectCliente(clienteId) {
  selectedClienteId = clienteId;

  // Actualizar selección en barra lateral
  renderClientsList(document.getElementById('searchClientSidebar').value.toLowerCase().trim());

  // Cargar datos detallados del cliente
  await loadFichaCliente(clienteId);
}

// Cargar toda la información de la ficha del cliente
async function loadFichaCliente(clienteId) {
  if (!window.supabaseClient) return;

  try {
    // A. Consultar datos generales del cliente
    const { data: client, error: clientError } = await window.supabaseClient
      .from('clientes')
      .select('nombre_completo, empresa, correo, ciudad')
      .eq('id', clienteId)
      .single();

    if (clientError) throw clientError;

    document.getElementById('detClientName').textContent = client.nombre_completo;
    document.getElementById('detClientCompany').textContent = client.empresa;

    // B. Consultar Plan e Info Comercial
    const { data: plan, error: planError } = await window.supabaseClient
      .from('cliente_planes')
      .select('nombre_plan, monto_mensual, url_contrato, notas_internas, estado')
      .eq('cliente_id', clienteId)
      .maybeSingle();

    if (planError) throw planError;

    // Valores predeterminados en caso de registros ausentes en la BD
    let planName = 'Plan de Mantenimiento Web';
    let monthlyAmount = '0.00';
    let contractUrl = '';
    let internalNotes = '';
    let accountStatus = 'Pendiente';

    if (plan) {
      planName = plan.nombre_plan || 'Plan de Mantenimiento Web';
      monthlyAmount = plan.monto_mensual || '0.00';
      contractUrl = plan.url_contrato || '';
      internalNotes = plan.notas_internas || '';
      accountStatus = plan.estado || 'Pendiente';
    }

    document.getElementById('commPlanName').value = planName;
    document.getElementById('commMonthlyAmount').value = monthlyAmount;
    document.getElementById('commContractUrl').value = contractUrl;
    document.getElementById('commInternalNotes').value = internalNotes;
    document.getElementById('detAccountStatus').value = accountStatus;

    // Activar / desactivar botón de ver contrato
    const btnContract = document.getElementById('btnViewContract');
    if (contractUrl) {
      btnContract.href = contractUrl;
      btnContract.style.opacity = '1';
      btnContract.style.pointerEvents = 'auto';
    } else {
      btnContract.removeAttribute('href');
      btnContract.style.opacity = '0.5';
      btnContract.style.pointerEvents = 'none';
    }

    // C. Consultar Configuración de Cortes
    const { data: corte, error: corteError } = await window.supabaseClient
      .from('configuracion_cortes')
      .select('dia_corte')
      .eq('cliente_id', clienteId)
      .maybeSingle();

    if (corteError) throw corteError;

    let cutoffDay = 28;
    if (corte) {
      cutoffDay = corte.dia_corte || 28;
    }
    document.getElementById('commCutoffDay').value = cutoffDay;
    document.getElementById('detCutoffText').textContent = `Bolsa reinicia el día ${cutoffDay} de cada mes.`;

    // D. Consultar Bolsa de Horas
    const { data: horas, error: horasError } = await window.supabaseClient
      .from('cliente_horas')
      .select('horas_contratadas, horas_utilizadas, horas_restantes')
      .eq('cliente_id', clienteId)
      .maybeSingle();

    if (horasError) throw horasError;

    let contractedHrs = '0:00';
    let usedHrs = '0:00';
    let remainingHrs = '0:00';
    let isRemainingNegative = false;

    if (horas) {
      contractedHrs = formatDecimalHours(horas.horas_contratadas);
      usedHrs = formatDecimalHours(horas.horas_utilizadas);
      remainingHrs = formatDecimalHours(horas.horas_restantes);
      isRemainingNegative = parseFloat(horas.horas_restantes) < 0;
    }

    document.getElementById('cardContracted').textContent = `${contractedHrs} hrs`;
    document.getElementById('cardUsed').textContent = `${usedHrs} hrs`;
    
    const remainingEl = document.getElementById('cardRemaining');
    remainingEl.textContent = `${remainingHrs} hrs`;
    
    if (isRemainingNegative) {
      remainingEl.style.color = 'var(--red)';
    } else {
      remainingEl.style.color = 'var(--green)';
    }

    // E. Consultar Historial de soporte técnico
    const { data: techLogs, error: techLogsError } = await window.supabaseClient
      .from('cliente_horas_historial')
      .select('id, fecha, hora_inicio, hora_fin, responsable, duracion, descripcion, comentarios')
      .eq('cliente_id', clienteId)
      .order('fecha', { ascending: false });

    if (techLogsError) throw techLogsError;
    renderTechLogsTable(techLogs);

    // F. Consultar Historial de Auditoría
    const { data: auditLogs, error: auditLogsError } = await window.supabaseClient
      .from('auditoria_horas')
      .select('fecha, usuario_admin, accion, valor_anterior, valor_nuevo')
      .eq('cliente_id', clienteId)
      .order('fecha', { ascending: false });

    if (auditLogsError) throw auditLogsError;
    renderAuditLogsTable(auditLogs);

    // F2. Consultar Configuración de Base de Datos
    const { data: dbConn, error: dbConnError } = await window.supabaseClient
      .from('cliente_conexiones')
      .select('nombre_conexion, tabla_principal, supabase_url, supabase_project_id, supabase_anon_key')
      .eq('cliente_id', clienteId)
      .maybeSingle();

    if (dbConnError) {
      console.error('Error al obtener conexion de BD:', dbConnError);
    }

    if (dbConn) {
      document.getElementById('dbConnName').value = dbConn.nombre_conexion || '';
      document.getElementById('dbConnUrl').value = dbConn.supabase_url || '';
      document.getElementById('dbConnProjectId').value = dbConn.supabase_project_id || '';
      document.getElementById('dbConnAnonKey').value = dbConn.supabase_anon_key || '';
      
      const planVal = dbConn.tabla_principal || 'free';
      const selectPlanEl = document.getElementById('dbConnPlan');
      const customGroupEl = document.getElementById('dbConnCustomLimitGroup');
      const tableInputEl = document.getElementById('dbConnTable');

      if (planVal === 'free' || planVal === 'pro') {
        selectPlanEl.value = planVal;
        customGroupEl.style.display = 'none';
        tableInputEl.value = '';
        tableInputEl.removeAttribute('required');
      } else {
        selectPlanEl.value = 'custom';
        customGroupEl.style.display = 'block';
        tableInputEl.value = planVal;
        tableInputEl.setAttribute('required', 'true');
      }
    } else {
      document.getElementById('dbConnName').value = '';
      document.getElementById('dbConnUrl').value = '';
      document.getElementById('dbConnProjectId').value = '';
      document.getElementById('dbConnAnonKey').value = '';
      
      document.getElementById('dbConnPlan').value = 'free';
      document.getElementById('dbConnCustomLimitGroup').style.display = 'none';
      document.getElementById('dbConnTable').value = '';
      document.getElementById('dbConnTable').removeAttribute('required');
    }

    // Mostrar panel detallado y ocultar vacío
    document.getElementById('emptyDetailState').style.display = 'none';
    document.getElementById('detailPanel').style.display = 'block';

  } catch (err) {
    console.error('Error al cargar datos detallados del cliente:', err);
    alert('Error al consultar datos en Supabase.');
  }
}

// Renderizar bitácora técnica
function renderTechLogsTable(logs) {
  const tableBody = document.getElementById('techLogsTableBody');
  if (!tableBody) return;

  if (!logs || logs.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="crm-empty-state">No hay registros de soporte técnico.</td>
      </tr>
    `;
    return;
  }

  let html = '';
  logs.forEach(log => {
    const regDate = new Date(log.fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    let rangeStr = '—';
    if (log.hora_inicio && log.hora_fin) {
      const start = new Date(log.hora_inicio).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      const end = new Date(log.hora_fin).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
      rangeStr = `${start} - ${end}`;
    }

    const activityText = log.descripcion 
      ? log.descripcion 
      : (log.comentarios || 'Trabajo de soporte técnico');

    const subCommentsHtml = log.descripcion && log.comentarios 
      ? `<br><small style="color:var(--muted); font-style:italic;">Obs: ${escapeHtml(log.comentarios)}</small>` 
      : '';

    html += `
      <tr id="tech-row-${log.id}">
        <td style="white-space: nowrap;">${regDate}</td>
        <td style="white-space: nowrap; font-size: 0.85rem; color: var(--muted);">${rangeStr}</td>
        <td style="font-family: monospace; font-weight:600; color:var(--blue);">${log.duracion} hrs</td>
        <td>${escapeHtml(log.responsable)}</td>
        <td style="line-height:1.4; max-width: 320px;">
          <strong>${escapeHtml(activityText)}</strong>
          ${subCommentsHtml}
        </td>
        <td style="text-align: center;">
          <button class="btn-logout" onclick="deleteTechLogRecord('${log.id}', '${log.duracion}')" style="display:inline-flex; width:auto; padding:0.4rem 0.8rem; font-size:0.8rem; background:rgba(255, 62, 127, 0.05);" title="Eliminar Registro">
            Eliminar
          </button>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;
}

// Renderizar bitácora de auditoría
function renderAuditLogsTable(logs) {
  const tableBody = document.getElementById('auditLogsTableBody');
  if (!tableBody) return;

  if (!logs || logs.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="crm-empty-state">No hay registros de auditoría de saldo.</td>
      </tr>
    `;
    return;
  }

  let html = '';
  logs.forEach(log => {
    const regDate = new Date(log.fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    html += `
      <tr>
        <td style="white-space: nowrap;">${regDate}</td>
        <td style="font-weight:600; color:var(--blue);">${escapeHtml(log.usuario_admin)}</td>
        <td>${escapeHtml(log.accion)}</td>
        <td style="font-family: monospace;">${log.valor_anterior}</td>
        <td style="font-family: monospace; font-weight: 600; color: var(--green);">${log.valor_nuevo}</td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;
}

// Guardar información de la ficha comercial
async function saveCommercialData() {
  if (!selectedClienteId || !window.supabaseClient) return;

  const planName = document.getElementById('commPlanName').value.trim();
  const monthlyAmount = parseFloat(document.getElementById('commMonthlyAmount').value) || 0.00;
  const contractUrl = document.getElementById('commContractUrl').value.trim();
  const internalNotes = document.getElementById('commInternalNotes').value.trim();
  const cutoffDay = parseInt(document.getElementById('commCutoffDay').value);

  try {
    // 1. Verificar si existe registro en cliente_planes para decidir update o insert
    const { data: planExist, error: checkError } = await window.supabaseClient
      .from('cliente_planes')
      .select('id')
      .eq('cliente_id', selectedClienteId)
      .maybeSingle();

    if (checkError) throw checkError;

    if (planExist) {
      const { error: planError } = await window.supabaseClient
        .from('cliente_planes')
        .update({
          nombre_plan: planName,
          monto_mensual: monthlyAmount,
          url_contrato: contractUrl || null,
          notas_internas: internalNotes || null
        })
        .eq('cliente_id', selectedClienteId);

      if (planError) throw planError;
    } else {
      const { error: planError } = await window.supabaseClient
        .from('cliente_planes')
        .insert([{
          cliente_id: selectedClienteId,
          nombre_plan: planName,
          monto_mensual: monthlyAmount,
          url_contrato: contractUrl || null,
          notas_internas: internalNotes || null,
          estado: 'Activo'
        }]);

      if (planError) throw planError;
    }

    // 2. Guardar en configuracion_cortes usando upsert para que sea robusto
    const { error: corteError } = await window.supabaseClient
      .from('configuracion_cortes')
      .upsert({
        cliente_id: selectedClienteId,
        dia_corte: cutoffDay
      }, { onConflict: 'cliente_id' });

    if (corteError) throw corteError;

    alert('Ficha comercial del cliente guardada con éxito.');
    await loadFichaCliente(selectedClienteId);

  } catch (err) {
    console.error('Error al guardar datos comerciales:', err);
    alert('No se pudo guardar la información comercial.');
  }
}

// Actualizar el estado de cuenta del cliente
async function updateAccountStatus(newStatus) {
  if (!selectedClienteId || !window.supabaseClient) return;

  try {
    // 1. Verificar si existe registro en cliente_planes
    const { data: planExist, error: checkError } = await window.supabaseClient
      .from('cliente_planes')
      .select('id')
      .eq('cliente_id', selectedClienteId)
      .maybeSingle();

    if (checkError) throw checkError;

    if (planExist) {
      const { error: planError } = await window.supabaseClient
        .from('cliente_planes')
        .update({ estado: newStatus })
        .eq('cliente_id', selectedClienteId);

      if (planError) throw planError;
    } else {
      const { error: planError } = await window.supabaseClient
        .from('cliente_planes')
        .insert([{
          cliente_id: selectedClienteId,
          estado: newStatus,
          nombre_plan: 'Plan de Mantenimiento Web',
          horas_mensuales: 8.00
        }]);

      if (planError) throw planError;
    }

    // 2. Sincronizar con el flag activo de clientes (si es Suspendido -> activo = false, de lo contrario true)
    const isActivo = (newStatus !== 'Suspendido');
    const { error: clientError } = await window.supabaseClient
      .from('clientes')
      .update({ activo: isActivo })
      .eq('id', selectedClienteId);

    if (clientError) throw clientError;

    alert(`Estado de la cuenta actualizado a: ${newStatus}`);
    
    // Recargar el caché de clientes local y actualizar sidebar
    await fetchClients();

  } catch (err) {
    console.error('Error al cambiar estado de cuenta:', err);
    alert('No se pudo actualizar el estado de la cuenta en Supabase.');
  }
}

// Guardar bitácora técnica al finalizar el temporizador
async function saveWorklog(closeModalCallback) {
  if (!selectedClienteId || !window.supabaseClient) return;

  const durationStr = document.getElementById('worklogDuration').value.trim();
  const responsible = document.getElementById('worklogResponsible').value.trim();
  const description = document.getElementById('worklogDesc').value.trim();
  const comments = document.getElementById('worklogComments').value.trim();

  // Validar formato
  const parts = durationStr.split(':');
  if (parts.length !== 2) {
    alert('Formato de duración inválido. Use H:MM');
    return;
  }

  const hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);
  const decimalHours = hours + (minutes / 60);
  const totalMinutes = hours * 60 + minutes;

  try {
    // 1. Insertar en cliente_horas_historial
    const { error: insertError } = await window.supabaseClient
      .from('cliente_horas_historial')
      .insert([{
        cliente_id: selectedClienteId,
        duracion: durationStr,
        duracion_minutos: totalMinutes,
        responsable,
        descripcion,
        comentarios: comments || null,
        hora_inicio: startTimeIso,
        hora_fin: endTimeIso,
        fecha: startTimeIso
      }]);

    if (insertError) throw insertError;

    // 2. Consultar bolsa de horas actual
    const { data: currentHours, error: fetchError } = await window.supabaseClient
      .from('cliente_horas')
      .select('horas_utilizadas, horas_restantes')
      .eq('cliente_id', selectedClienteId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    let newUsed = decimalHours;
    let newRemaining = 8.00 - decimalHours;

    if (currentHours) {
      newUsed = parseFloat(currentHours.horas_utilizadas) + decimalHours;
      newRemaining = parseFloat(currentHours.horas_restantes) - decimalHours;

      // 3. Actualizar la bolsa de horas
      const { error: updateError } = await window.supabaseClient
        .from('cliente_horas')
        .update({
          horas_utilizadas: newUsed,
          horas_restantes: newRemaining,
          actualizado_en: new Date().toISOString()
        })
        .eq('cliente_id', selectedClienteId);

      if (updateError) throw updateError;
    } else {
      // Crear registro inicial de bolsa de horas
      const { error: createError } = await window.supabaseClient
        .from('cliente_horas')
        .insert([{
          cliente_id: selectedClienteId,
          horas_contratadas: 8.00,
          horas_utilizadas: newUsed,
          horas_restantes: newRemaining,
          actualizado_en: new Date().toISOString()
        }]);

      if (createError) throw createError;
    }

    closeModalCallback();
    await loadFichaCliente(selectedClienteId);

  } catch (err) {
    console.error('Error al guardar reporte de bitácora técnica:', err);
    alert('No se pudo guardar la bitácora técnica ni descontar el saldo.');
  }
}

// Eliminar un registro de bitácora técnica y reintegrar saldo
async function deleteTechLogRecord(id, durationStr) {
  if (!selectedClienteId || !window.supabaseClient) return;
  if (!confirm('¿Estás seguro de que deseas eliminar este registro técnico? Las horas asociadas se reintegrarán al saldo disponible del cliente.')) return;

  const parts = durationStr.split(':');
  const hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);
  const decimalHours = hours + (minutes / 60);

  try {
    // 1. Borrar registro de historial
    const { error: deleteError } = await window.supabaseClient
      .from('cliente_horas_historial')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    // 2. Re-calcular bolsa de horas
    const { data: currentHours, error: fetchError } = await window.supabaseClient
      .from('cliente_horas')
      .select('horas_utilizadas, horas_restantes')
      .eq('cliente_id', selectedClienteId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (currentHours) {
      const newUsed = Math.max(0, parseFloat(currentHours.horas_utilizadas) - decimalHours);
      const newRemaining = parseFloat(currentHours.horas_restantes) + decimalHours;

      // 3. Actualizar la bolsa
      const { error: updateError } = await window.supabaseClient
        .from('cliente_horas')
        .update({
          horas_utilizadas: newUsed,
          horas_restantes: newRemaining,
          actualizado_en: new Date().toISOString()
        })
        .eq('cliente_id', selectedClienteId);

      if (updateError) throw updateError;
    }

    await loadFichaCliente(selectedClienteId);

  } catch (err) {
    console.error('Error al eliminar bitácora técnica:', err);
    alert('No se pudo completar la supresión del registro.');
  }
}

// Aplicar ajuste manual de horas (Sumar, Restar, Establecer)
async function applyManualHoursAdjustment() {
  if (!selectedClienteId || !window.supabaseClient) return;

  const adjType = document.getElementById('adjType').value;
  const adjHours = parseInt(document.getElementById('adjHours').value) || 0;
  const adjMinutes = parseInt(document.getElementById('adjMinutes').value) || 0;

  if (adjHours === 0 && adjMinutes === 0) {
    alert('Por favor ingresa una cantidad de horas o minutos válida.');
    return;
  }

  const decimalAdjustment = adjHours + (adjMinutes / 60);
  const formattedAdjustment = `${adjHours}:${adjMinutes < 10 ? '0' + adjMinutes : adjMinutes}`;

  try {
    // 1. Obtener horas actuales
    const { data: horas, error: fetchError } = await window.supabaseClient
      .from('cliente_horas')
      .select('horas_restantes')
      .eq('cliente_id', selectedClienteId)
      .maybeSingle();

    if (fetchError) throw fetchError;

    let currentRemaining = 8.00;
    if (horas) {
      currentRemaining = parseFloat(horas.horas_restantes);
    }

    let newRemaining = currentRemaining;
    let actionDescription = '';

    if (adjType === 'add') {
      newRemaining = currentRemaining + decimalAdjustment;
      actionDescription = `Suma manual de horas: +${formattedAdjustment} hrs`;
    } else if (adjType === 'subtract') {
      newRemaining = currentRemaining - decimalAdjustment;
      actionDescription = `Resta manual de horas: -${formattedAdjustment} hrs`;
    } else if (adjType === 'set') {
      newRemaining = decimalAdjustment;
      actionDescription = `Modificación directa de saldo: Establecer a ${formattedAdjustment} hrs`;
    }

    const valorAnteriorStr = formatDecimalHours(currentRemaining) + " hrs";
    const valorNuevoStr = formatDecimalHours(newRemaining) + " hrs";

    // 2. Registrar en auditoria_horas
    const { error: auditError } = await window.supabaseClient
      .from('auditoria_horas')
      .insert([{
        cliente_id: selectedClienteId,
        fecha: new Date().toISOString(),
        usuario_admin: 'Admin',
        accion: actionDescription,
        valor_anterior: valorAnteriorStr,
        valor_nuevo: valorNuevoStr
      }]);

    if (auditError) throw auditError;

    // 3. Actualizar o insertar en cliente_horas
    if (horas) {
      const { error: updateError } = await window.supabaseClient
        .from('cliente_horas')
        .update({
          horas_restantes: newRemaining,
          actualizado_en: new Date().toISOString()
        })
        .eq('cliente_id', selectedClienteId);

      if (updateError) throw updateError;
    } else {
      const { error: createError } = await window.supabaseClient
        .from('cliente_horas')
        .insert([{
          cliente_id: selectedClienteId,
          horas_contratadas: 8.00,
          horas_utilizadas: 0.00,
          horas_restantes: newRemaining,
          actualizado_en: new Date().toISOString()
        }]);

      if (createError) throw createError;
    }

    // Reiniciar entradas del formulario de ajuste
    document.getElementById('adjHours').value = '0';
    document.getElementById('adjMinutes').value = '0';

    alert(`Ajuste de saldo aplicado: ${actionDescription}`);
    await loadFichaCliente(selectedClienteId);

  } catch (err) {
    console.error('Error al aplicar ajuste manual de horas:', err);
    alert('No se pudo aplicar el ajuste manual de saldo.');
  }
}

// Convertir segundos transcurridos en formato HH:MM:SS
function formatHHMMSS(totalSeconds) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  
  const hStr = h < 10 ? '0' + h : h;
  const mStr = m < 10 ? '0' + m : m;
  const sStr = s < 10 ? '0' + s : s;
  
  return `${hStr}:${mStr}:${sStr}`;
}

// Convertir horas decimales (ej. 2.25) a formato H:MM (ej. 2:15)
function formatDecimalHours(val) {
  const num = parseFloat(val) || 0;
  const h = Math.floor(num);
  const m = Math.round((num - h) * 60);
  const mStr = m < 10 ? '0' + m : m;
  return `${h}:${mStr}`;
}

// Prevenir inyección de HTML
function escapeHtml(string) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return String(string).replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Guardar la configuración de base de datos del cliente en Supabase
async function saveDatabaseConfig() {
  if (!selectedClienteId || !window.supabaseClient) return;

  const connName = document.getElementById('dbConnName').value.trim();
  const connPlan = document.getElementById('dbConnPlan').value;
  const connUrl = document.getElementById('dbConnUrl').value.trim();
  const connProjectId = document.getElementById('dbConnProjectId').value.trim();
  const connAnonKey = document.getElementById('dbConnAnonKey').value.trim();

  // Si el plan es custom, la tabla almacena el límite en MB, de lo contrario la clave del plan ('free' o 'pro')
  const connTable = connPlan === 'custom' 
    ? document.getElementById('dbConnTable').value.trim() 
    : connPlan;

  try {
    const { error } = await window.supabaseClient
      .from('cliente_conexiones')
      .upsert({
        cliente_id: selectedClienteId,
        nombre_conexion: connName,
        tabla_principal: connTable,
        supabase_url: connUrl,
        supabase_project_id: connProjectId,
        supabase_anon_key: connAnonKey,
        actualizado_en: new Date().toISOString()
      }, { onConflict: 'cliente_id' });

    if (error) throw error;

    alert('Configuración de base de datos guardada con éxito.');
  } catch (err) {
    console.error('Error al guardar configuración de base de datos:', err);
    const detailMsg = err.message || err.details || (typeof err === 'object' ? JSON.stringify(err) : String(err));
    alert('No se pudo guardar la configuración de la base de datos:\n' + detailMsg);
  }
}

// Módulos adicionales inactivos

// Métodos globales para llamadas inline en HTML
window.selectCliente = selectCliente;
window.deleteTechLogRecord = deleteTechLogRecord;
