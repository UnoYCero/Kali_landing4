// ==========================================================================
// KALEIDOSCOPIO - CRM PROSPECTOS CONTROLLER
// Controller for prospectos/index.html (CRM view)
// ==========================================================================

let allProspects = [];
let allStatuses = [];
let activeToolFilter = 'all';
let activeStatusFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Proteger la ruta - Verificar sesión
  const authenticated = await checkAuth();
  if (!authenticated) {
    return; // Redirección ya ejecutada por checkAuth
  }

  // 2. Caché y selectores de DOM
  const prospectsTableBody = document.getElementById('prospectsTableBody');
  const filterStatusSelect = document.getElementById('filterStatus');
  const prospectStatusSelect = document.getElementById('prospectStatus');
  
  // Modales
  const prospectModalOverlay = document.getElementById('prospectModalOverlay');
  const statesModalOverlay = document.getElementById('statesModalOverlay');
  
  // Triggers de abrir modales
  const openProspectModalBtn = document.getElementById('openProspectModal');
  const openStatesModalBtn = document.getElementById('openStatesModal');
  
  // Triggers de cerrar modales
  const closeProspectModalBtn = document.getElementById('closeProspectModal');
  const cancelProspectBtn = document.getElementById('cancelProspectBtn');
  const closeStatesModalBtn = document.getElementById('closeStatesModal');

  // Formularios
  const prospectForm = document.getElementById('prospectForm');
  const addStatusForm = document.getElementById('addStatusForm');

  // 3. Event Listeners de Modales
  openProspectModalBtn.addEventListener('click', () => {
    prospectForm.reset();
    prospectModalOverlay.classList.add('active');
  });

  const closeProspectModal = () => prospectModalOverlay.classList.remove('active');
  closeProspectModalBtn.addEventListener('click', closeProspectModal);
  cancelProspectBtn.addEventListener('click', closeProspectModal);

  openStatesModalBtn.addEventListener('click', () => {
    renderStatusesManagerList();
    statesModalOverlay.classList.add('active');
  });

  const closeStatesModal = () => statesModalOverlay.classList.remove('active');
  closeStatesModalBtn.addEventListener('click', closeStatesModal);

  // 4. Lógica de Pestañas de Filtrado (Herramienta)
  const tabs = document.querySelectorAll('.crm-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      activeToolFilter = tab.dataset.tool;
      renderProspects();
    });
  });

  // 5. Lógica de Filtro de Estado
  filterStatusSelect.addEventListener('change', (e) => {
    activeStatusFilter = e.target.value;
    renderProspects();
  });

  // 6. Configurar presets de color del nuevo estado
  const colorPresets = document.querySelectorAll('#newStatusColorPresets .color-preset-dot');
  const newStatusColorInput = document.getElementById('newStatusColor');

  colorPresets.forEach(preset => {
    preset.addEventListener('click', () => {
      colorPresets.forEach(p => p.classList.remove('selected'));
      preset.classList.add('selected');
      newStatusColorInput.value = preset.dataset.color;
    });
  });

  // 7. Enviar formulario para agregar prospecto
  prospectForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('prospectName').value.trim();
    const organization = document.getElementById('prospectOrg').value.trim();
    const description = document.getElementById('prospectDesc').value.trim();
    const tool = document.getElementById('prospectTool').value;
    const status_id = document.getElementById('prospectStatus').value;

    if (!name || !description || !tool) {
      alert('Por favor completa los campos requeridos.');
      return;
    }

    try {
      const { error } = await window.supabaseClient
        .from('prospects')
        .insert([{
          name,
          organization: organization || null,
          description,
          tool,
          status_id: status_id || null
        }]);

      if (error) throw error;

      closeProspectModal();
      await fetchCRMData(); // Recargar datos de Supabase
    } catch (err) {
      console.error('Error insertando prospecto:', err);
      alert('No se pudo guardar el prospecto en Supabase.');
    }
  });

  // 8. Enviar formulario para crear nuevo estado dinámico
  addStatusForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('newStatusName').value.trim().toLowerCase();
    const color = newStatusColorInput.value;

    if (!name || !color) {
      alert('Por favor ingresa el nombre del estado.');
      return;
    }

    try {
      const { error } = await window.supabaseClient
        .from('statuses')
        .insert([{ name, color }]);

      if (error) {
        if (error.code === '23505') { // Código de violación de restricción UNIQUE en Postgres
          alert('Este estado ya existe.');
        } else {
          throw error;
        }
        return;
      }

      document.getElementById('newStatusName').value = '';
      
      // Recargar estados y actualizar elementos del DOM
      await fetchStatusesOnly();
      renderStatusesManagerList();
    } catch (err) {
      console.error('Error al insertar estado:', err);
      alert('No se pudo guardar el estado en Supabase.');
    }
  });

  // 9. Cargar datos iniciales
  await fetchCRMData();
});

// Función de consulta principal de Supabase
async function fetchCRMData() {
  if (!window.supabaseClient) return;

  try {
    // A. Consultar estados primero
    await fetchStatusesOnly();

    // B. Consultar prospectos con la relación a su estado
    const { data: prospects, error } = await window.supabaseClient
      .from('prospects')
      .select(`
        id,
        name,
        organization,
        description,
        tool,
        status_id,
        created_at,
        statuses (
          name,
          color
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    allProspects = prospects || [];
    renderProspects();
  } catch (err) {
    console.error('Error cargando datos de Supabase:', err);
    const tableBody = document.getElementById('prospectsTableBody');
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="crm-empty-state" style="color: var(--red);">
          Error al cargar datos. Verifica la conexión a Supabase y que las tablas existan.
        </td>
      </tr>
    `;
  }
}

// Cargar solo estados
async function fetchStatusesOnly() {
  try {
    const { data: statuses, error } = await window.supabaseClient
      .from('statuses')
      .select('id, name, color')
      .order('name', { ascending: true });

    if (error) throw error;

    allStatuses = statuses || [];
    updateStatusDropdowns();
  } catch (err) {
    console.error('Error cargando estados:', err);
  }
}

// Actualizar los inputs dropdown de estados en base a la lista cargada
function updateStatusDropdowns() {
  const filterSelect = document.getElementById('filterStatus');
  const formSelect = document.getElementById('prospectStatus');

  // A. Dropdown de filtrado
  let filterOptionsHtml = '<option value="all">Cualquier Estado</option>';
  allStatuses.forEach(st => {
    filterOptionsHtml += `<option value="${st.id}">${st.name.toUpperCase()}</option>`;
  });
  filterSelect.innerHTML = filterOptionsHtml;
  filterSelect.value = activeStatusFilter;

  // B. Dropdown del formulario
  let formOptionsHtml = '<option value="">-- Sin Estado --</option>';
  allStatuses.forEach(st => {
    formOptionsHtml += `<option value="${st.id}">${st.name.toUpperCase()}</option>`;
  });
  formSelect.innerHTML = formOptionsHtml;
}

// Renderizar la lista de estados dentro del panel administrador de estados
function renderStatusesManagerList() {
  const container = document.getElementById('statesListContainer');
  if (!container) return;

  if (allStatuses.length === 0) {
    container.innerHTML = '<span style="color: var(--muted); font-size: 0.9rem;">Sin estados personalizados.</span>';
    return;
  }

  let html = '';
  allStatuses.forEach(st => {
    html += `
      <div class="badge" style="border-color: ${st.color}; color: ${st.color}; background: rgba(0,0,0,0.3); padding: 0.5rem 0.85rem; display: inline-flex; align-items: center; gap: 0.5rem;">
        <span>●</span> ${st.name.toUpperCase()}
        <button type="button" onclick="deleteStatus('${st.id}')" style="background:none; border:none; color:inherit; cursor:pointer; font-weight:bold; font-size:1.1rem; padding:0; line-height:1; margin-left:0.25rem;" title="Eliminar Estado">×</button>
      </div>
    `;
  });
  container.innerHTML = html;
}

// Mapear nombres de herramientas técnicas a etiquetas amigables
function formatToolName(toolKey) {
  const mapping = {
    'general': 'General',
    'pedidos': 'Sistema de Pedidos',
    'web': 'Desarrollo Web',
    'ia': 'IA Tools'
  };
  return mapping[toolKey] || toolKey;
}

// Renderizar los prospectos filtrados en la tabla HTML
function renderProspects() {
  const tableBody = document.getElementById('prospectsTableBody');
  if (!tableBody) return;

  // Filtrar en base a las selecciones activas
  const filtered = allProspects.filter(p => {
    const matchesTool = activeToolFilter === 'all' || p.tool === activeToolFilter;
    const matchesStatus = activeStatusFilter === 'all' || p.status_id === activeStatusFilter;
    return matchesTool && matchesStatus;
  });

  if (filtered.length === 0) {
    tableBody.innerHTML = `
      <tr>
        <td colspan="6" class="crm-empty-state">
          No se encontraron prospectos con los filtros seleccionados.
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  filtered.forEach(p => {
    // Dar formato al badge de estado dinámico
    let statusBadge = '<span class="badge badge-tool" style="opacity: 0.6;">Sin Asignar</span>';
    if (p.statuses) {
      statusBadge = `
        <span class="badge badge-status" style="border-color: ${p.statuses.color}; color: ${p.statuses.color}; background: rgba(0, 0, 0, 0.25);">
          ${p.statuses.name}
        </span>
      `;
    }

    html += `
      <tr id="row-${p.id}">
        <td style="font-weight: 600; color: var(--text);">${escapeHtml(p.name)}</td>
        <td style="color: var(--muted);">${p.organization ? escapeHtml(p.organization) : '—'}</td>
        <td class="crm-desc-cell" title="${escapeHtml(p.description)}">${escapeHtml(p.description)}</td>
        <td><span class="badge badge-tool">${formatToolName(p.tool)}</span></td>
        <td>${statusBadge}</td>
        <td style="text-align: center;">
          <button class="btn-logout" onclick="deleteProspect('${p.id}')" style="display:inline-flex; width:auto; padding:0.4rem 0.8rem; font-size:0.8rem; background:rgba(255, 62, 127, 0.05);" title="Eliminar Prospecto">
            Eliminar
          </button>
        </td>
      </tr>
    `;
  });

  tableBody.innerHTML = html;
}

// Eliminar prospecto de Supabase
async function deleteProspect(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar este prospecto?')) return;

  try {
    const { error } = await window.supabaseClient
      .from('prospects')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // Remover fila visualmente rápido
    const row = document.getElementById(`row-${id}`);
    if (row) row.remove();
    
    // Actualizar caché
    allProspects = allProspects.filter(p => p.id !== id);
    if (allProspects.length === 0) {
      renderProspects();
    }
  } catch (err) {
    console.error('Error eliminando prospecto:', err);
    alert('No se pudo eliminar el prospecto de Supabase.');
  }
}

// Eliminar estado dinámico de Supabase
async function deleteStatus(id) {
  if (!confirm('¿Estás seguro de que deseas eliminar este estado? Los prospectos asociados perderán su estado.')) return;

  try {
    const { error } = await window.supabaseClient
      .from('statuses')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await fetchCRMData();
    renderStatusesManagerList();
  } catch (err) {
    console.error('Error al eliminar estado:', err);
    alert('No se pudo eliminar el estado. Asegúrate de que no existan restricciones activas en la base de datos.');
  }
}

// Helper para escapar HTML y prevenir inyección XSS
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

// Hacer globales los métodos disparados desde eventos inline HTML
window.deleteProspect = deleteProspect;
window.deleteStatus = deleteStatus;
