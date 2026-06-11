// ==========================================================================
// KALEIDOSCOPIO - CLIENT DASHBOARD CONTROLLER
// Controller for clientes/dashboard/index.html
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Verificar la sesión del cliente
  const client = await checkClientAuth();
  if (!client) {
    return; // Redirección ya ejecutada por checkClientAuth
  }

  // 2. Ejecutar chequeo/reinicio de corte mensual si corresponde
  await checkAndResetClientHours(client.id);

  // 3. Actualizar datos básicos de bienvenida en la interfaz
  document.getElementById('welcomeTitle').textContent = `¡Hola, ${client.nombre_completo.split(' ')[0]}!`;
  document.getElementById('welcomeSubtitle').textContent = `Gestiona los servicios de ${client.empresa}`;
  document.getElementById('userBadgeName').textContent = client.nombre_completo;

  // 4. Consultar y renderizar datos del plan y estado
  await fetchAndRenderDashboardData(client.id);
});

// Consultar datos de Supabase y actualizar la UI
async function fetchAndRenderDashboardData(clienteId) {
  if (!window.supabaseClient) return;

  try {
    // A. Consultar Plan de Cliente
    const { data: plan, error: planError } = await window.supabaseClient
      .from('cliente_planes')
      .select('nombre_plan, estado')
      .eq('cliente_id', clienteId)
      .maybeSingle();

    if (planError) throw planError;

    if (plan) {
      document.getElementById('planName').textContent = `Plan actual: ${plan.nombre_plan}`;
      
      const statusBadge = document.getElementById('serviceStatusBadge');
      statusBadge.textContent = plan.estado;
      
      // Limpiar clases existentes
      statusBadge.className = 'client-badge-status';
      
      // Asignar clase de estilo correspondiente
      const estadoLower = plan.estado.toLowerCase();
      if (estadoLower === 'activo') {
        statusBadge.classList.add('activo');
      } else if (estadoLower === 'suspendido') {
        statusBadge.classList.add('suspendido');
      } else {
        statusBadge.classList.add('pendiente');
      }
    }

    // B. Consultar Configuración de Cortes
    const { data: corte, error: corteError } = await window.supabaseClient
      .from('configuracion_cortes')
      .select('dia_corte')
      .eq('cliente_id', clienteId)
      .maybeSingle();

    if (corteError) throw corteError;

    if (corte) {
      document.getElementById('cutoffMessage').textContent = `Tu bolsa de horas se reinicia el día ${corte.dia_corte} de cada mes.`;
    }

    // C. Consultar Bolsa de Horas
    const { data: horas, error: horasError } = await window.supabaseClient
      .from('cliente_horas')
      .select('horas_contratadas, horas_utilizadas, horas_restantes')
      .eq('cliente_id', clienteId)
      .maybeSingle();

    if (horasError) throw horasError;

    if (horas) {
      const remainingFormatted = formatDecimalHours(horas.horas_restantes);
      document.getElementById('hoursRemaining').textContent = `${remainingFormatted} hrs`;
      document.getElementById('hoursRemainingSub').textContent = remainingFormatted;
      document.getElementById('hoursContracted').textContent = formatDecimalHours(horas.horas_contratadas);
      document.getElementById('hoursUsed').textContent = formatDecimalHours(horas.horas_utilizadas);
    }

    // D. Consultar Historial de Trabajos
    const { data: historial, error: historialError } = await window.supabaseClient
      .from('cliente_horas_historial')
      .select('fecha, duracion, comentarios')
      .eq('cliente_id', clienteId)
      .order('fecha', { ascending: false });

    if (historialError) throw historialError;

    renderHistorialTable(historial);

  } catch (err) {
    console.error('Error cargando información de dashboard:', err);
  }
}

// Renderizar el historial de tareas realizadas
function renderHistorialTable(historial) {
  const tableBody = document.getElementById('historialTableBody');
  if (!tableBody) return;

  if (!historial || historial.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="3" class="crm-empty-state">
          No hay trabajos de soporte registrados en tu historial.
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  historial.forEach(item => {
    const dateObj = new Date(item.fecha);
    const dateFormatted = dateObj.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    html += `
      <tr>
        <td style="font-weight: 500; white-space: nowrap;">${dateFormatted}</td>
        <td style="font-family: var(--font-mono); font-weight: 600; color: var(--blue);">${item.duracion} hrs</td>
        <td style="color: var(--muted); line-height: 1.5;">${escapeHtml(item.comentarios)}</td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;
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
