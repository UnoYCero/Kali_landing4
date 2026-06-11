// ==========================================================================
// KALEIDOSCOPIO - ADMIN CUENTAS CONTROLLER
// Controller for admin/cuentas/index.html
// ==========================================================================

let selectedClienteId = null;

// Variables de temporizador
let timerInterval = null;
let elapsedSeconds = 0;
let timerState = 'stopped'; // 'running', 'paused', 'stopped'

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Proteger la ruta - Verificar sesión
  const authenticated = await checkAuth();
  if (!authenticated) {
    return; // Redirección ya ejecutada por checkAuth
  }

  // 2. Selectores de DOM
  const searchInput = document.getElementById('searchClientInput');
  const resultsContainer = document.getElementById('searchResultsContainer');
  const cutoffForm = document.getElementById('cutoffForm');
  const cutoffDaySelect = document.getElementById('cutoffDaySelect');
  
  // Temporizador
  const btnStart = document.getElementById('btnTimerStart');
  const btnPause = document.getElementById('btnTimerPause');
  const btnStop = document.getElementById('btnTimerStop');
  const timerDisplay = document.getElementById('timerDisplay');

  // Modal de guardado de bitácora
  const worklogModal = document.getElementById('worklogModalOverlay');
  const closeWorklogModalBtn = document.getElementById('closeWorklogModal');
  const cancelWorklogBtn = document.getElementById('cancelWorklogBtn');
  const worklogForm = document.getElementById('worklogForm');

  // 3. Rellenar opciones del Día de Corte (1 a 31)
  let dayOptionsHtml = '';
  for (let i = 1; i <= 31; i++) {
    dayOptionsHtml += `<option value="${i}">${i}</option>`;
  }
  cutoffDaySelect.innerHTML = dayOptionsHtml;

  // 4. Lógica de Buscador de Clientes
  searchInput.addEventListener('input', async () => {
    const query = searchInput.value.toLowerCase().trim();
    if (!query) {
      resultsContainer.style.display = 'none';
      return;
    }

    try {
      // Buscar clientes por nombre, empresa o correo
      const { data: clients, error } = await window.supabaseClient
        .from('clientes')
        .select('id, nombre_completo, empresa, correo, ciudad')
        .or(`nombre_completo.ilike.%${query}%,empresa.ilike.%${query}%,correo.ilike.%${query}%`)
        .limit(8);

      if (error) throw error;

      if (clients && clients.length > 0) {
        let itemsHtml = '';
        clients.forEach(c => {
          itemsHtml += `
            <div class="search-result-item" onclick="selectCliente('${c.id}')">
              <strong>${escapeHtml(c.nombre_completo)}</strong>
              <span>${escapeHtml(c.empresa)} • ${escapeHtml(c.correo)}</span>
            </div>
          `;
        });
        resultsContainer.innerHTML = itemsHtml;
        resultsContainer.style.display = 'block';
      } else {
        resultsContainer.innerHTML = '<div style="padding:0.85rem; color:var(--muted); font-size:0.9rem;">Sin resultados.</div>';
        resultsContainer.style.display = 'block';
      }

    } catch (err) {
      console.error('Error buscando clientes:', err);
    }
  });

  // Ocultar buscador si se clickea fuera
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
      resultsContainer.style.display = 'none';
    }
  });

  // 5. Configuración de Día de Corte Submit
  cutoffForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedClienteId) return;

    const selectedDay = parseInt(cutoffDaySelect.value);

    try {
      const { error } = await window.supabaseClient
        .from('configuracion_cortes')
        .update({ dia_corte: selectedDay })
        .eq('cliente_id', selectedClienteId);

      if (error) throw error;

      alert(`Día de corte actualizado al día ${selectedDay} del mes.`);
    } catch (err) {
      console.error('Error al actualizar corte:', err);
      alert('Error al guardar el día de corte.');
    }
  });

  // 6. Lógica de Temporizador
  btnStart.addEventListener('click', () => {
    if (timerState === 'stopped') {
      elapsedSeconds = 0;
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
    
    // Calcular formato H:MM para el formulario
    const totalMinutes = Math.floor(elapsedSeconds / 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    const mStr = m < 10 ? '0' + m : m;

    document.getElementById('worklogDuration').value = `${h}:${mStr}`;
    document.getElementById('worklogResponsible').value = '';
    document.getElementById('worklogComments').value = '';

    // Mostrar modal
    worklogModal.classList.add('active');
  });

  // Cerrar modal de trabajo
  const closeWorklog = () => {
    worklogModal.classList.remove('active');
    // Restaurar botones del timer
    timerState = 'stopped';
    timerDisplay.textContent = '00:00:00';
    btnPause.style.display = 'none';
    btnStart.style.display = 'inline-flex';
    btnStart.textContent = 'Iniciar';
    btnStop.setAttribute('disabled', 'true');
    btnStop.style.opacity = '0.5';
    btnStop.style.cursor = 'not-allowed';
  };

  closeWorklogModalBtn.addEventListener('click', closeWorklog);
  cancelWorklogBtn.addEventListener('click', closeWorklog);

  // 7. Guardar Bitácora Submit
  worklogForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedClienteId) return;

    const durationStr = document.getElementById('worklogDuration').value.trim();
    const responsible = document.getElementById('worklogResponsible').value.trim();
    const comments = document.getElementById('worklogComments').value.trim();

    // Validar duración
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
      // A. Registrar en cliente_horas_historial
      const { error: insertError } = await window.supabaseClient
        .from('cliente_horas_historial')
        .insert([{
          cliente_id: selectedClienteId,
          duracion: durationStr,
          duracion_minutos: totalMinutes,
          responsable,
          comentarios: comments,
          fecha: new Date().toISOString()
        }]);

      if (insertError) throw insertError;

      // B. Obtener bolsa de horas actual
      const { data: currentHours, error: fetchError } = await window.supabaseClient
        .from('cliente_horas')
        .select('horas_utilizadas, horas_restantes')
        .eq('cliente_id', selectedClienteId)
        .single();

      if (fetchError) throw fetchError;

      const newUsed = parseFloat(currentHours.horas_utilizadas) + decimalHours;
      const newRemaining = parseFloat(currentHours.horas_restantes) - decimalHours;

      // C. Actualizar bolsa de horas en cliente_horas
      const { error: updateError } = await window.supabaseClient
        .from('cliente_horas')
        .update({
          horas_utilizadas: newUsed,
          horas_restantes: newRemaining,
          actualizado_en: new Date().toISOString()
        })
        .eq('cliente_id', selectedClienteId);

      if (updateError) throw updateError;

      // Cerrar modal y limpiar
      closeWorklog();

      // Recargar datos actualizados
      await loadClienteAccountData(selectedClienteId);

    } catch (err) {
      console.error('Error guardando trabajo en bitácora:', err);
      alert('No se pudo registrar el trabajo ni actualizar la bolsa de horas.');
    }
  });
});

// Seleccionar un cliente desde el buscador
async function selectCliente(clienteId) {
  selectedClienteId = clienteId;
  document.getElementById('searchClientInput').value = '';
  document.getElementById('searchResultsContainer').style.display = 'none';

  // Cargar datos
  await loadClienteAccountData(clienteId);
}

// Cargar toda la cuenta y bitácoras del cliente
async function loadClienteAccountData(clienteId) {
  if (!window.supabaseClient) return;

  try {
    // 1. Información General del Cliente
    const { data: client, error: clientError } = await window.supabaseClient
      .from('clientes')
      .select('nombre_completo, empresa, correo, ciudad')
      .eq('id', clienteId)
      .single();

    if (clientError) throw clientError;

    document.getElementById('clientNameText').textContent = client.nombre_completo;
    document.getElementById('clientCompanyText').textContent = client.empresa;
    document.getElementById('clientEmailText').textContent = client.correo;
    document.getElementById('clientCityText').textContent = client.ciudad;

    // 2. Plan y Corte
    const { data: plan, error: planError } = await window.supabaseClient
      .from('cliente_planes')
      .select('nombre_plan, horas_mensuales')
      .eq('cliente_id', clienteId)
      .maybeSingle();

    if (planError) throw planError;

    if (plan) {
      document.getElementById('clientPlanText').textContent = `${plan.nombre_plan} (${formatDecimalHours(plan.horas_mensuales)} horas mensuales)`;
    }

    const { data: corte, error: corteError } = await window.supabaseClient
      .from('configuracion_cortes')
      .select('dia_corte')
      .eq('cliente_id', clienteId)
      .maybeSingle();

    if (corteError) throw corteError;

    if (corte) {
      document.getElementById('cutoffDaySelect').value = corte.dia_corte;
    }

    // 3. Bolsa de horas actual
    const { data: horas, error: horasError } = await window.supabaseClient
      .from('cliente_horas')
      .select('horas_contratadas, horas_utilizadas, horas_restantes')
      .eq('cliente_id', clienteId)
      .maybeSingle();

    if (horasError) throw horasError;

    if (horas) {
      document.getElementById('kpiContracted').textContent = formatDecimalHours(horas.horas_contratadas);
      document.getElementById('kpiUsed').textContent = formatDecimalHours(horas.horas_utilizadas);
      document.getElementById('kpiRemaining').textContent = formatDecimalHours(horas.horas_restantes);
    }

    // 4. Historial de bitácora
    const { data: historial, error: historialError } = await window.supabaseClient
      .from('cliente_horas_historial')
      .select('id, fecha, responsable, duracion, comentarios')
      .eq('cliente_id', clienteId)
      .order('fecha', { ascending: false });

    if (historialError) throw historialError;

    renderHistorial(historial);

    // Mostrar panel completo
    document.getElementById('accountPanel').style.display = 'block';

  } catch (err) {
    console.error('Error al cargar datos del cliente:', err);
    alert('Error al cargar la cuenta del cliente de Supabase.');
  }
}

// Renderizar tabla de historial
function renderHistorial(historial) {
  const tableBody = document.getElementById('cuentasHistorialTableBody');
  if (!tableBody) return;

  if (!historial || historial.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="crm-empty-state">
          Sin registros en el historial de soporte.
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  historial.forEach(h => {
    const regDate = new Date(h.fecha).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    html += `
      <tr id="hist-row-${h.id}">
        <td style="white-space: nowrap;">${regDate}</td>
        <td>${escapeHtml(h.responsable)}</td>
        <td style="font-family: monospace; font-weight:600; color:var(--blue);">${h.duracion} hrs</td>
        <td style="color:var(--muted); line-height:1.4;">${escapeHtml(h.comentarios)}</td>
        <td style="text-align: center;">
          <button class="btn-logout" onclick="deleteHistoryRecord('${h.id}', '${h.duracion}')" style="display:inline-flex; width:auto; padding:0.4rem 0.8rem; font-size:0.8rem; background:rgba(255, 62, 127, 0.05);" title="Eliminar Registro">
            Eliminar
          </button>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;
}

// Eliminar un registro de bitácora y reintegrar las horas a la bolsa
async function deleteHistoryRecord(id, durationStr) {
  if (!confirm('¿Estás seguro de que deseas eliminar este registro de soporte? Las horas del registro serán reintegradas a la bolsa de horas restantes.')) return;

  // Convertir duración a decimal
  const parts = durationStr.split(':');
  const hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);
  const decimalHours = hours + (minutes / 60);

  try {
    // 1. Eliminar el registro en Supabase
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
      .single();

    if (fetchError) throw fetchError;

    const newUsed = Math.max(0, parseFloat(currentHours.horas_utilizadas) - decimalHours);
    const newRemaining = parseFloat(currentHours.horas_restantes) + decimalHours;

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

    // Recargar datos
    await loadClienteAccountData(selectedClienteId);

  } catch (err) {
    console.error('Error al eliminar registro de bitácora:', err);
    alert('No se pudo eliminar el registro de soporte.');
  }
}

// Formatear segundos en formato HH:MM:SS
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

// Prevenir XSS
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

// Hacer globales las funciones que se llaman inline en HTML
window.selectCliente = selectCliente;
window.deleteHistoryRecord = deleteHistoryRecord;
