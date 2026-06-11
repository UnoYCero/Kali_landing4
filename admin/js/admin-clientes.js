// ==========================================================================
// KALEIDOSCOPIO - ADMIN CLIENTES CONTROLLER
// Controller for admin/clientes/index.html
// ==========================================================================

let allClients = [];
let currentPage = 1;
const pageSize = 10;
let searchQuery = '';
let currentSort = 'fecha_registro-desc';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Proteger la ruta - Verificar sesión
  const authenticated = await checkAuth();
  if (!authenticated) {
    return; // Redirección ya ejecutada por checkAuth
  }

  // 2. Selectores del DOM
  const searchInput = document.getElementById('searchClient');
  const sortSelect = document.getElementById('orderBy');
  const btnPrev = document.getElementById('btnPrevPage');
  const btnNext = document.getElementById('btnNextPage');

  // 3. Event Listeners
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value.toLowerCase().trim();
    currentPage = 1;
    renderClientes();
  });

  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    currentPage = 1;
    renderClientes();
  });

  btnPrev.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderClientes();
    }
  });

  btnNext.addEventListener('click', () => {
    const totalPages = Math.ceil(getFilteredClients().length / pageSize);
    if (currentPage < totalPages) {
      currentPage++;
      renderClientes();
    }
  });

  // 4. Cargar datos iniciales
  await fetchClientesData();
});

// Obtener datos de Supabase
async function fetchClientesData() {
  const tableBody = document.getElementById('clientesTableBody');
  if (!window.supabaseClient) return;

  try {
    const { data: clients, error } = await window.supabaseClient
      .from('clientes')
      .select(`
        id,
        nombre_completo,
        empresa,
        correo,
        ciudad,
        fecha_registro,
        activo,
        cliente_planes (
          estado
        )
      `)
      .order('fecha_registro', { ascending: false });

    if (error) throw error;

    allClients = (clients || []).map(c => {
      // Obtener el estado del plan o establecer Pendiente por defecto
      const planState = c.cliente_planes && c.cliente_planes.length > 0
        ? c.cliente_planes[0].estado
        : 'Pendiente';
      return {
        ...c,
        estado: planState
      };
    });

    renderClientes();

  } catch (err) {
    console.error('Error cargando directivos de clientes:', err);
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="crm-empty-state" style="color: var(--red);">
          Error al cargar datos. Verifica la conexión a Supabase y que las tablas existan.
        </td>
      </tr>
    `;
  }
}

// Filtrar clientes en memoria
function getFilteredClients() {
  return allClients.filter(c => {
    const term = searchQuery;
    if (!term) return true;
    return (
      c.nombre_completo.toLowerCase().includes(term) ||
      c.empresa.toLowerCase().includes(term) ||
      c.correo.toLowerCase().includes(term) ||
      c.ciudad.toLowerCase().includes(term)
    );
  });
}

// Ordenar clientes en memoria
function sortClients(clientsList) {
  const [field, direction] = currentSort.split('-');
  
  return clientsList.sort((a, b) => {
    let valA = a[field];
    let valB = b[field];

    // Tratar fechas
    if (field === 'fecha_registro') {
      valA = new Date(valA).getTime();
      valB = new Date(valB).getTime();
    } else {
      // Cadenas de texto
      valA = String(valA).toLowerCase();
      valB = String(valB).toLowerCase();
    }

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

// Renderizar la tabla de clientes
function renderClientes() {
  const tableBody = document.getElementById('clientesTableBody');
  const paginationInfo = document.getElementById('paginationInfo');
  
  const filtered = getFilteredClients();
  const sorted = sortClients(filtered);
  
  const totalItems = sorted.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  
  // Ajustar página actual si excede el rango
  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;
  
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalItems);
  const pageItems = sorted.slice(startIndex, endIndex);

  // Actualizar botones de paginación
  document.getElementById('btnPrevPage').disabled = (currentPage === 1);
  document.getElementById('btnNextPage').disabled = (currentPage === totalPages);
  
  // Info de paginación
  paginationInfo.textContent = totalItems > 0 
    ? `Mostrando ${startIndex + 1}-${endIndex} de ${totalItems} clientes`
    : 'Mostrando 0 clientes';

  if (pageItems.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="7" class="crm-empty-state">
          No se encontraron clientes que coincidan con la búsqueda.
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  pageItems.forEach(c => {
    const regDate = new Date(c.fecha_registro).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });

    // Color del estado
    let statusColor = 'var(--blue)'; // Pendiente
    if (c.estado === 'Activo') {
      statusColor = 'var(--green)';
    } else if (c.estado === 'Suspendido') {
      statusColor = 'var(--red)';
    }

    // Select dropdown para modificar estado
    const statusSelect = `
      <select class="status-select" onchange="updateClientStatus('${c.id}', this.value)" style="color: ${statusColor}; border-color: ${statusColor};">
        <option value="Activo" ${c.estado === 'Activo' ? 'selected' : ''} style="color: var(--green);">ACTIVO</option>
        <option value="Suspendido" ${c.estado === 'Suspendido' ? 'selected' : ''} style="color: var(--red);">SUSPENDIDO</option>
        <option value="Pendiente" ${c.estado === 'Pendiente' ? 'selected' : ''} style="color: var(--blue);">PENDIENTE</option>
      </select>
    `;

    html += `
      <tr id="client-row-${c.id}">
        <td style="font-weight: 600; color: var(--text);">${escapeHtml(c.nombre_completo)}</td>
        <td style="color: var(--muted);">${escapeHtml(c.empresa)}</td>
        <td>${escapeHtml(c.correo)}</td>
        <td style="color: var(--muted);">${escapeHtml(c.ciudad)}</td>
        <td style="white-space: nowrap;">${regDate}</td>
        <td>${statusSelect}</td>
        <td style="text-align: center;">
          <button class="btn-logout" onclick="deleteClient('${c.id}')" style="display:inline-flex; width:auto; padding:0.4rem 0.8rem; font-size:0.8rem; background:rgba(255, 62, 127, 0.05);" title="Eliminar Cliente">
            Eliminar
          </button>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;
}

// Actualizar el estado del plan del cliente en Supabase
async function updateClientStatus(clienteId, newStatus) {
  if (!window.supabaseClient) return;

  try {
    // 1. Actualizar el estado del plan
    const { error: planError } = await window.supabaseClient
      .from('cliente_planes')
      .update({ estado: newStatus })
      .eq('cliente_id', clienteId);

    if (planError) throw planError;

    // 2. Sincronizar el flag activo en clientes (Suspendido -> activo = false, de lo contrario true)
    const isActivo = (newStatus !== 'Suspendido');
    const { error: clientError } = await window.supabaseClient
      .from('clientes')
      .update({ activo: isActivo })
      .eq('id', clienteId);

    if (clientError) throw clientError;

    // 3. Actualizar memoria local
    const clientIdx = allClients.findIndex(c => c.id === clienteId);
    if (clientIdx !== -1) {
      allClients[clientIdx].estado = newStatus;
      allClients[clientIdx].activo = isActivo;
    }

    // Re-renderizar la tabla para actualizar colores
    renderClientes();

  } catch (err) {
    console.error('Error al actualizar estado del cliente:', err);
    alert('No se pudo actualizar el estado en Supabase.');
    renderClientes();
  }
}

// Eliminar un cliente por completo de Supabase
async function deleteClient(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar este cliente? Se borrarán sus planes, bolsa de horas, configuraciones e historial de soporte.')) return;

  try {
    const { error } = await window.supabaseClient
      .from('clientes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Eliminar de caché local
    allClients = allClients.filter(c => c.id !== id);
    renderClientes();

  } catch (err) {
    console.error('Error eliminando cliente:', err);
    alert('No se pudo eliminar el cliente de Supabase.');
  }
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
window.updateClientStatus = updateClientStatus;
window.deleteClient = deleteClient;
