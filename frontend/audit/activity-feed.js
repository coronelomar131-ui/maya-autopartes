/**
 * Activity Feed Component
 * Panel de "Actividad Reciente" con visualización de cambios, filtros y exportación
 *
 * Características:
 * - Mostrar eventos en formato legible: "Omar creó venta de $5,000 (11:30am)"
 * - Filtrar por usuario, tabla, fecha, acción
 * - Exportar audit trail a CSV
 * - Búsqueda en tiempo real
 * - Paginación
 * - Actualización periódica (polling opcional)
 *
 * Versión: 1.0.0
 * Dependencias: Requiere API backend en /api/audit
 */

class ActivityFeed {
  constructor(options = {}) {
    this.apiBaseUrl = options.apiBaseUrl || '/api/audit';
    this.refreshInterval = options.refreshInterval || 30000; // 30 segundos
    this.pageSize = options.pageSize || 50;
    this.autoRefresh = options.autoRefresh !== false;
    this.containerId = options.containerId || 'activity-feed';

    this.currentPage = 0;
    this.totalRecords = 0;
    this.activities = [];
    this.filters = {
      usuario: '',
      tabla: '',
      accion: '',
      desde: '',
      hasta: ''
    };

    this.refreshIntervalId = null;
  }

  /**
   * Inicializar el activity feed
   */
  async init() {
    console.log('[ActivityFeed] Inicializando...');

    this.renderUI();
    await this.loadActivities();

    if (this.autoRefresh) {
      this.startAutoRefresh();
    }

    this.attachEventListeners();
    console.log('[ActivityFeed] Listo');
  }

  /**
   * Renderizar estructura HTML
   */
  renderUI() {
    const container = document.getElementById(this.containerId);
    if (!container) {
      console.error(`[ActivityFeed] Contenedor #${this.containerId} no encontrado`);
      return;
    }

    container.innerHTML = `
      <div class="activity-feed-container">
        <div class="activity-header">
          <h2>📋 Actividad Reciente</h2>
          <div class="activity-controls">
            <button id="af-refresh-btn" class="btn btn-sm btn-primary" title="Refrescar">
              🔄 Refrescar
            </button>
            <button id="af-export-btn" class="btn btn-sm btn-success" title="Exportar a CSV">
              📥 Exportar
            </button>
          </div>
        </div>

        <div class="activity-filters">
          <input
            type="text"
            id="af-filter-usuario"
            class="filter-input"
            placeholder="Filtrar por usuario..."
            value=""
          />
          <select id="af-filter-tabla" class="filter-select">
            <option value="">Todas las tablas</option>
            <option value="ventas">Ventas</option>
            <option value="almacen">Almacén</option>
            <option value="clientes">Clientes</option>
            <option value="usuarios">Usuarios</option>
            <option value="facturas">Facturas</option>
          </select>
          <select id="af-filter-accion" class="filter-select">
            <option value="">Todas las acciones</option>
            <option value="CREATE">Crear</option>
            <option value="UPDATE">Actualizar</option>
            <option value="DELETE">Eliminar</option>
            <option value="READ">Leer</option>
          </select>
          <input
            type="date"
            id="af-filter-desde"
            class="filter-input"
            title="Desde"
          />
          <input
            type="date"
            id="af-filter-hasta"
            class="filter-input"
            title="Hasta"
          />
          <button id="af-filter-clear-btn" class="btn btn-sm btn-secondary">
            ✕ Limpiar
          </button>
        </div>

        <div class="activity-stats">
          <span id="af-stats-total">Total: 0 eventos</span>
          <span id="af-stats-page">Página 1</span>
        </div>

        <div id="af-activity-list" class="activity-list">
          <div class="loading">Cargando actividades...</div>
        </div>

        <div class="activity-pagination">
          <button id="af-prev-btn" class="btn btn-sm" disabled>← Anterior</button>
          <span id="af-page-info">Página 1 de 1</span>
          <button id="af-next-btn" class="btn btn-sm" disabled>Siguiente →</button>
        </div>

        <div id="af-modal-details" class="modal" style="display:none;">
          <div class="modal-content">
            <div class="modal-header">
              <h3>Detalles del Cambio</h3>
              <button class="modal-close" id="af-modal-close">✕</button>
            </div>
            <div id="af-modal-body" class="modal-body">
              <!-- Detalles se insertan aquí -->
            </div>
          </div>
        </div>
      </div>

      <style>
        .activity-feed-container {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
        }

        .activity-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #dee2e6;
          padding-bottom: 15px;
        }

        .activity-header h2 {
          margin: 0;
          color: #212529;
          font-size: 1.5em;
        }

        .activity-controls {
          display: flex;
          gap: 10px;
        }

        .activity-filters {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 10px;
          margin-bottom: 15px;
          padding: 15px;
          background: white;
          border-radius: 6px;
        }

        .filter-input,
        .filter-select {
          padding: 8px 12px;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          font-size: 0.9em;
        }

        .filter-input:focus,
        .filter-select:focus {
          outline: none;
          border-color: #0066cc;
          box-shadow: 0 0 0 3px rgba(0, 102, 204, 0.1);
        }

        .activity-stats {
          display: flex;
          gap: 20px;
          margin-bottom: 15px;
          font-size: 0.9em;
          color: #666;
          padding: 0 5px;
        }

        .activity-list {
          background: white;
          border-radius: 6px;
          overflow: hidden;
          max-height: 600px;
          overflow-y: auto;
        }

        .activity-item {
          border-bottom: 1px solid #dee2e6;
          padding: 15px;
          transition: background-color 0.2s;
          cursor: pointer;
        }

        .activity-item:last-child {
          border-bottom: none;
        }

        .activity-item:hover {
          background-color: #f1f3f5;
        }

        .activity-item.create {
          border-left: 4px solid #28a745;
        }

        .activity-item.update {
          border-left: 4px solid #ffc107;
        }

        .activity-item.delete {
          border-left: 4px solid #dc3545;
        }

        .activity-item.read {
          border-left: 4px solid #17a2b8;
        }

        .activity-icon {
          display: inline-block;
          margin-right: 10px;
          font-size: 1.1em;
        }

        .activity-main {
          display: flex;
          justify-content: space-between;
          align-items: start;
          margin-bottom: 8px;
        }

        .activity-description {
          flex: 1;
          font-weight: 500;
          color: #212529;
        }

        .activity-time {
          color: #999;
          font-size: 0.85em;
          white-space: nowrap;
          margin-left: 10px;
        }

        .activity-meta {
          display: flex;
          gap: 15px;
          font-size: 0.85em;
          color: #666;
          margin-top: 8px;
        }

        .activity-meta-item {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .activity-badge {
          display: inline-block;
          padding: 2px 8px;
          border-radius: 4px;
          font-size: 0.75em;
          font-weight: 600;
          text-transform: uppercase;
        }

        .badge-create {
          background-color: #d4edda;
          color: #155724;
        }

        .badge-update {
          background-color: #fff3cd;
          color: #856404;
        }

        .badge-delete {
          background-color: #f8d7da;
          color: #721c24;
        }

        .badge-read {
          background-color: #d1ecf1;
          color: #0c5460;
        }

        .loading {
          padding: 40px 20px;
          text-align: center;
          color: #999;
        }

        .activity-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 15px;
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid #dee2e6;
        }

        .btn {
          padding: 8px 16px;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          background: white;
          color: #333;
          cursor: pointer;
          font-size: 0.9em;
          transition: all 0.2s;
        }

        .btn:hover:not(:disabled) {
          background: #f8f9fa;
          border-color: #adb5bd;
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-primary {
          background: #0066cc;
          color: white;
          border-color: #0066cc;
        }

        .btn-primary:hover {
          background: #0052a3;
          border-color: #0052a3;
        }

        .btn-success {
          background: #28a745;
          color: white;
          border-color: #28a745;
        }

        .btn-success:hover {
          background: #218838;
          border-color: #218838;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
          border-color: #6c757d;
        }

        .btn-secondary:hover {
          background: #5a6268;
          border-color: #5a6268;
        }

        .btn-sm {
          padding: 6px 12px;
          font-size: 0.85em;
        }

        .modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          max-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #dee2e6;
        }

        .modal-header h3 {
          margin: 0;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5em;
          cursor: pointer;
          color: #999;
        }

        .modal-close:hover {
          color: #333;
        }

        .modal-body {
          padding: 20px;
        }

        .json-view {
          background: #f5f5f5;
          border: 1px solid #dee2e6;
          border-radius: 4px;
          padding: 12px;
          overflow-x: auto;
          font-family: monospace;
          font-size: 0.85em;
          white-space: pre-wrap;
          word-wrap: break-word;
          max-height: 300px;
          overflow-y: auto;
        }

        .change-item {
          margin-bottom: 15px;
          padding-bottom: 15px;
          border-bottom: 1px solid #dee2e6;
        }

        .change-item:last-child {
          border-bottom: none;
        }

        .change-field {
          font-weight: 600;
          color: #212529;
          margin-bottom: 8px;
        }

        .change-values {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          font-size: 0.9em;
        }

        .change-before,
        .change-after {
          padding: 10px;
          background: #f8f9fa;
          border-radius: 4px;
          border-left: 3px solid #dee2e6;
        }

        .change-before {
          border-left-color: #dc3545;
        }

        .change-after {
          border-left-color: #28a745;
        }

        .change-label {
          font-size: 0.8em;
          color: #999;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
      </style>
    `;
  }

  /**
   * Cargar actividades del API
   */
  async loadActivities() {
    try {
      const params = new URLSearchParams({
        limit: this.pageSize,
        offset: this.currentPage * this.pageSize,
        ...this.getActiveFilters()
      });

      const response = await fetch(`${this.apiBaseUrl}?${params}`);
      if (!response.ok) throw new Error('Error cargando actividades');

      const result = await response.json();
      this.activities = result.data || [];
      this.totalRecords = result.total || 0;

      this.renderActivities();
      this.updateStats();
      this.updatePagination();

    } catch (error) {
      console.error('[ActivityFeed Error]', error);
      this.showError('Error cargando actividades: ' + error.message);
    }
  }

  /**
   * Renderizar lista de actividades
   */
  renderActivities() {
    const container = document.getElementById('af-activity-list');
    if (!container) return;

    if (this.activities.length === 0) {
      container.innerHTML = '<div class="loading">No hay actividades que mostrar</div>';
      return;
    }

    const html = this.activities.map(activity => {
      const description = this.formatActivityDescription(activity);
      const time = this.formatTime(activity.timestamp);
      const accionLower = activity.accion.toLowerCase();
      const icon = this.getActionIcon(activity.accion);

      return `
        <div class="activity-item ${accionLower}" data-id="${activity.id}">
          <div class="activity-main">
            <div class="activity-description">
              <span class="activity-icon">${icon}</span>
              <span>${description}</span>
            </div>
            <span class="activity-time">${time}</span>
          </div>
          <div class="activity-meta">
            <span class="activity-meta-item">
              <span class="activity-badge badge-${accionLower}">${activity.accion}</span>
            </span>
            <span class="activity-meta-item">📊 ${activity.tabla}</span>
            <span class="activity-meta-item">👤 ${activity.usuario_email || 'Sistema'}</span>
            ${activity.cambios ? '<span class="activity-meta-item">📝 Ver detalles</span>' : ''}
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = html;

    // Agregar event listeners a cada item
    container.querySelectorAll('.activity-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const id = item.getAttribute('data-id');
        const activity = this.activities.find(a => a.id === id);
        if (activity) {
          this.showActivityDetails(activity);
        }
      });
    });
  }

  /**
   * Formatear descripción de actividad
   */
  formatActivityDescription(activity) {
    const usuario = activity.usuario_email ? activity.usuario_email.split('@')[0] : 'Sistema';
    const tabla = activity.tabla;

    switch (activity.accion) {
      case 'CREATE':
        const monto = this.extractMonto(activity.valores_despues);
        return `${usuario} <strong>creó</strong> ${tabla}${monto ? ' de ' + monto : ''}`;

      case 'UPDATE':
        return `${usuario} <strong>actualizó</strong> ${tabla}`;

      case 'DELETE':
        return `${usuario} <strong>eliminó</strong> registro de ${tabla}`;

      case 'READ':
        return `${usuario} <strong>consultó</strong> ${tabla}`;

      default:
        return `${usuario} realizó ${activity.accion} en ${tabla}`;
    }
  }

  /**
   * Extraer monto de valores (para mostrar "$5,000")
   */
  extractMonto(valores) {
    if (!valores || typeof valores !== 'object') return null;

    const montoFields = ['monto', 'total', 'precio', 'amount', 'valor'];
    for (const field of montoFields) {
      if (values[field]) {
        const num = parseFloat(valores[field]);
        if (!isNaN(num)) {
          return new Intl.NumberFormat('es-MX', {
            style: 'currency',
            currency: 'MXN'
          }).format(num);
        }
      }
    }
    return null;
  }

  /**
   * Obtener icono para acción
   */
  getActionIcon(accion) {
    const icons = {
      'CREATE': '✨',
      'UPDATE': '✏️',
      'DELETE': '🗑️',
      'READ': '👁️'
    };
    return icons[accion] || '📝';
  }

  /**
   * Formatear tiempo (ej: "11:30am")
   */
  formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Mostrar detalles de actividad en modal
   */
  showActivityDetails(activity) {
    const modal = document.getElementById('af-modal-details');
    const body = document.getElementById('af-modal-body');

    let html = `
      <div>
        <h4>Información General</h4>
        <table class="details-table" style="width:100%; margin-bottom: 20px;">
          <tr>
            <td style="padding: 8px; font-weight: bold; width: 150px;">Usuario:</td>
            <td style="padding: 8px;">${activity.usuario_email || 'Sistema'}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Tabla:</td>
            <td style="padding: 8px;">${activity.tabla}</td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Acción:</td>
            <td style="padding: 8px;">
              <span class="activity-badge badge-${activity.accion.toLowerCase()}">
                ${activity.accion}
              </span>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px; font-weight: bold;">Timestamp:</td>
            <td style="padding: 8px;">${new Date(activity.timestamp).toLocaleString('es-MX')}</td>
          </tr>
          ${activity.registro_id ? `
            <tr>
              <td style="padding: 8px; font-weight: bold;">Registro ID:</td>
              <td style="padding: 8px; font-family: monospace; font-size: 0.85em;">${activity.registro_id}</td>
            </tr>
          ` : ''}
        </table>
    `;

    // Mostrar cambios
    if (activity.cambios) {
      const cambios = typeof activity.cambios === 'string'
        ? JSON.parse(activity.cambios)
        : activity.cambios;

      html += '<h4>Cambios Realizados</h4>';
      for (const [campo, info] of Object.entries(cambios)) {
        html += `
          <div class="change-item">
            <div class="change-field">📌 ${campo}</div>
            <div class="change-values">
              <div class="change-before">
                <div class="change-label">Anterior</div>
                <div>${this.formatValue(info.anterior)}</div>
              </div>
              <div class="change-after">
                <div class="change-label">Nuevo</div>
                <div>${this.formatValue(info.nuevo)}</div>
              </div>
            </div>
          </div>
        `;
      }
    }

    // Mostrar valores completos si existen
    if (activity.valores_antes || activity.valores_despues) {
      html += '<h4>Datos Completos</h4>';

      if (activity.valores_antes) {
        html += '<div style="margin-bottom: 15px;">';
        html += '<strong>Valores Antes:</strong>';
        html += '<div class="json-view">' + JSON.stringify(
          typeof activity.valores_antes === 'string'
            ? JSON.parse(activity.valores_antes)
            : activity.valores_antes,
          null,
          2
        ) + '</div>';
        html += '</div>';
      }

      if (activity.valores_despues) {
        html += '<div>';
        html += '<strong>Valores Después:</strong>';
        html += '<div class="json-view">' + JSON.stringify(
          typeof activity.valores_despues === 'string'
            ? JSON.parse(activity.valores_despues)
            : activity.valores_despues,
          null,
          2
        ) + '</div>';
        html += '</div>';
      }
    }

    body.innerHTML = html;
    modal.style.display = 'flex';
  }

  /**
   * Formatear valor para mostrar
   */
  formatValue(value) {
    if (value === null || value === undefined) {
      return '<span style="color: #999; font-style: italic;">null</span>';
    }
    if (typeof value === 'object') {
      return '<code>' + JSON.stringify(value) + '</code>';
    }
    return String(value);
  }

  /**
   * Actualizar estadísticas
   */
  updateStats() {
    const totalEl = document.getElementById('af-stats-total');
    if (totalEl) {
      totalEl.textContent = `Total: ${this.totalRecords} eventos`;
    }
  }

  /**
   * Actualizar controles de paginación
   */
  updatePagination() {
    const totalPages = Math.ceil(this.totalRecords / this.pageSize);
    const prevBtn = document.getElementById('af-prev-btn');
    const nextBtn = document.getElementById('af-next-btn');
    const pageInfo = document.getElementById('af-page-info');

    if (prevBtn) prevBtn.disabled = this.currentPage === 0;
    if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages - 1;
    if (pageInfo) pageInfo.textContent = `Página ${this.currentPage + 1} de ${Math.max(1, totalPages)}`;
  }

  /**
   * Obtener filtros activos
   */
  getActiveFilters() {
    const filters = {};
    if (this.filters.usuario) filters.usuario = this.filters.usuario;
    if (this.filters.tabla) filters.tabla = this.filters.tabla;
    if (this.filters.accion) filters.accion = this.filters.accion;
    if (this.filters.desde) filters.desde = this.filters.desde;
    if (this.filters.hasta) filters.hasta = this.filters.hasta;
    return filters;
  }

  /**
   * Iniciar actualización periódica
   */
  startAutoRefresh() {
    this.refreshIntervalId = setInterval(() => {
      this.loadActivities();
    }, this.refreshInterval);
  }

  /**
   * Detener actualización periódica
   */
  stopAutoRefresh() {
    if (this.refreshIntervalId) {
      clearInterval(this.refreshIntervalId);
      this.refreshIntervalId = null;
    }
  }

  /**
   * Exportar a CSV
   */
  async exportToCSV() {
    try {
      const params = new URLSearchParams(this.getActiveFilters());
      const url = `${this.apiBaseUrl}/export?${params}`;

      // Descargar archivo
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_trail_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      console.log('[ActivityFeed] Exportación iniciada');
    } catch (error) {
      console.error('[ActivityFeed Error]', error);
      this.showError('Error exportando datos');
    }
  }

  /**
   * Mostrar error
   */
  showError(message) {
    const container = document.getElementById('af-activity-list');
    if (container) {
      container.innerHTML = `<div class="loading" style="color: #dc3545;">${message}</div>`;
    }
  }

  /**
   * Adjuntar event listeners
   */
  attachEventListeners() {
    // Botones principales
    const refreshBtn = document.getElementById('af-refresh-btn');
    const exportBtn = document.getElementById('af-export-btn');

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.currentPage = 0;
        this.loadActivities();
      });
    }

    if (exportBtn) {
      exportBtn.addEventListener('click', () => this.exportToCSV());
    }

    // Filtros
    const filterUsuario = document.getElementById('af-filter-usuario');
    const filterTabla = document.getElementById('af-filter-tabla');
    const filterAccion = document.getElementById('af-filter-accion');
    const filterDesde = document.getElementById('af-filter-desde');
    const filterHasta = document.getElementById('af-filter-hasta');
    const filterClearBtn = document.getElementById('af-filter-clear-btn');

    const applyFilters = () => {
      this.filters = {
        usuario: filterUsuario?.value || '',
        tabla: filterTabla?.value || '',
        accion: filterAccion?.value || '',
        desde: filterDesde?.value || '',
        hasta: filterHasta?.value || ''
      };
      this.currentPage = 0;
      this.loadActivities();
    };

    filterUsuario?.addEventListener('change', applyFilters);
    filterTabla?.addEventListener('change', applyFilters);
    filterAccion?.addEventListener('change', applyFilters);
    filterDesde?.addEventListener('change', applyFilters);
    filterHasta?.addEventListener('change', applyFilters);

    if (filterClearBtn) {
      filterClearBtn.addEventListener('click', () => {
        filterUsuario.value = '';
        filterTabla.value = '';
        filterAccion.value = '';
        filterDesde.value = '';
        filterHasta.value = '';
        applyFilters();
      });
    }

    // Paginación
    const prevBtn = document.getElementById('af-prev-btn');
    const nextBtn = document.getElementById('af-next-btn');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentPage > 0) {
          this.currentPage--;
          this.loadActivities();
        }
      });
    }

    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(this.totalRecords / this.pageSize);
        if (this.currentPage < totalPages - 1) {
          this.currentPage++;
          this.loadActivities();
        }
      });
    }

    // Modal
    const modal = document.getElementById('af-modal-details');
    const modalClose = document.getElementById('af-modal-close');

    if (modalClose) {
      modalClose.addEventListener('click', () => {
        if (modal) modal.style.display = 'none';
      });
    }

    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.style.display = 'none';
        }
      });
    }
  }

  /**
   * Destruir/limpiar
   */
  destroy() {
    this.stopAutoRefresh();
    const container = document.getElementById(this.containerId);
    if (container) {
      container.innerHTML = '';
    }
  }
}

// Exportar para uso en módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ActivityFeed;
}
