// ==========================================================================
// KALEIDOSCOPIO - ADMIN DASHBOARD CONTROLLER
// Controller for index.html (Dashboard view)
// ==========================================================================

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Proteger la ruta - Verificar sesión
  const authenticated = await checkAuth();
  if (!authenticated) {
    return; // Redirección ya ejecutada por checkAuth
  }

  // 2. Inicializar estadísticas reales en base a base de datos si está disponible
  try {
    if (supabase) {
      await updateDashboardStats();
    }
  } catch (error) {
    console.error('Error cargando estadísticas del dashboard:', error);
  }
});

// Función para consultar Supabase y pintar métricas
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
