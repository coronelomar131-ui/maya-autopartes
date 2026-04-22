/**
 * meli-ui-integration.js - Componentes UI para MercadoLibre Integration
 * ═════════════════════════════════════════════════════════════════
 *
 * Responsabilidades:
 * ✓ Modal de configuración MercadoLibre
 * ✓ Dashboard de estado de sincronización
 * ✓ Historial de cambios
 * ✓ Alertas y conflictos
 * ✓ Botón "Sincronizar Ahora"
 * ✓ Status indicators en tabla de inventario
 *
 * Integración con index.html
 * Se llama en setupConfigModal() y setupDashboard()
 *
 * @version 1.0.0
 * @last-update 2026-04-22
 */

// ═════════════════════════════════════════════════════════════════
// MODAL DE CONFIGURACIÓN MERCADOLIBRE
// ═════════════════════════════════════════════════════════════════

/**
 * Crear sección MercadoLibre en modal de configuración
 */
function createMeliConfigSection() {
  return `
    <div class="config-section meli-section" data-section="mercadolibre">
      <h3>🛒 MercadoLibre Integration</h3>

      <!-- Estado de conexión -->
      <div class="meli-status-box" id="meliStatusBox">
        <div class="status-indicator" id="meliStatusIndicator">
          <span class="status-dot offline"></span>
          <span class="status-text">Desconectado</span>
        </div>
        <p class="status-details" id="meliStatusDetails">
          Configura credenciales para sincronizar inventario con MercadoLibre
        </p>
      </div>

      <!-- Credenciales -->
      <div class="meli-credentials">
        <label for="meliClientId">
          Client ID
          <span class="help-icon" title="Obtener en developers.mercadolibre.com">ⓘ</span>
        </label>
        <input
          type="text"
          id="meliClientId"
          placeholder="Ej: 1234567890123456"
          class="input-field"
        />

        <label for="meliClientSecret">
          Client Secret
          <span class="help-icon" title="Mantener en secreto">ⓘ</span>
        </label>
        <input
          type="password"
          id="meliClientSecret"
          placeholder="••••••••••••••••"
          class="input-field"
        />
      </div>

      <!-- Botones de acción -->
      <div class="meli-actions">
        <button
          id="meliConnectBtn"
          class="btn btn-primary"
          onclick="handleMeliConnect()"
        >
          🔗 Conectar con MercadoLibre
        </button>

        <button
          id="meliTestBtn"
          class="btn btn-secondary"
          onclick="handleMeliTest()"
          style="display: none;"
        >
          ✓ Probar Conexión
        </button>

        <button
          id="meliDisconnectBtn"
          class="btn btn-danger"
          onclick="handleMeliDisconnect()"
          style="display: none;"
        >
          🔴 Desconectar
        </button>
      </div>

      <!-- Configuración de sync -->
      <div class="meli-config" id="meliConfig" style="display: none;">
        <label>
          <input
            type="checkbox"
            id="meliAutoSync"
            checked
          />
          Sincronización automática cada 30 minutos
        </label>

        <label>
          <input
            type="checkbox"
            id="meliAutoCreate"
            checked
          />
          Crear automáticamente productos nuevos en MELI
        </label>

        <label>
          <input
            type="checkbox"
            id="meliAutoPrice"
            checked
          />
          Sincronizar precios automáticamente
        </label>

        <label>
          <input
            type="checkbox"
            id="meliAutoStock"
            checked
          />
          Sincronizar stock automáticamente
        </label>
      </div>

      <!-- Info -->
      <div class="meli-info" id="meliInfo" style="display: none;">
        <h4>📊 Información de Sincronización</h4>
        <div class="info-grid">
          <div class="info-item">
            <label>Última sincronización:</label>
            <span id="meliLastSync">Nunca</span>
          </div>
          <div class="info-item">
            <label>Próxima sincronización:</label>
            <span id="meliNextSync">-</span>
          </div>
          <div class="info-item">
            <label>Productos sincronizados:</label>
            <span id="meliSyncedCount">0 / 0</span>
          </div>
          <div class="info-item">
            <label>Conflictos pendientes:</label>
            <span id="meliConflictCount">0</span>
          </div>
        </div>

        <button
          id="meliSyncNowBtn"
          class="btn btn-success"
          onclick="handleMeliSyncNow()"
          style="width: 100%; margin-top: 1rem;"
        >
          🔄 Sincronizar Ahora
        </button>
      </div>

      <!-- Link a documentación -->
      <div class="meli-help" style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #ddd;">
        <a href="MERCADOLIBRE_SETUP.md" target="_blank">📖 Ver guía de configuración</a>
        <a href="INVENTORY_SYNC_FLOW.md" target="_blank">📋 Ver flujo de sincronización</a>
      </div>
    </div>
  `;
}

// ═════════════════════════════════════════════════════════════════
// HANDLERS DE CONFIGURACIÓN
// ═════════════════════════════════════════════════════════════════

/**
 * Conectar con MercadoLibre (OAuth flow)
 */
async function handleMeliConnect() {
  try {
    const clientId = document.getElementById('meliClientId').value;
    const clientSecret = document.getElementById('meliClientSecret').value;

    if (!clientId || !clientSecret) {
      toast('❌ Ingresa Client ID y Secret', 'error');
      return;
    }

    // Guardar credenciales temporalmente
    localStorage.setItem('ma4_meli_client_id', clientId);
    localStorage.setItem('ma4_meli_client_secret', clientSecret);

    // Actualizar config global
    if (typeof window.MELI !== 'undefined' && window.MELI) {
      window.MELI.MELI_CONFIG.clientId = clientId;
      window.MELI.MELI_CONFIG.clientSecret = clientSecret;
    }

    // Obtener URL de autorización
    const authUrl = window.MELI ? window.MELI.getAuthUrl() : getMeliAuthUrl();

    // Redirigir a MELI
    window.location.href = authUrl;
  } catch (e) {
    console.error('Error conectando con MELI:', e);
    toast('❌ Error al conectar con MercadoLibre', 'error');
  }
}

/**
 * Probar conexión con MELI
 */
async function handleMeliTest() {
  try {
    const btn = document.getElementById('meliTestBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Probando...';

    if (typeof window.MELI === 'undefined' || !window.MELI) {
      toast('❌ Script de MELI no cargado', 'error');
      return;
    }

    const state = window.MELI.getState();

    if (!state.isAuthenticated) {
      toast('❌ No hay autenticación válida', 'error');
      return;
    }

    // Hacer request de prueba
    const response = await fetch('https://api.mercadolibre.com/users/me', {
      headers: {
        'Authorization': `Bearer ${state.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const userData = await response.json();
    toast(`✅ Conectado como: ${userData.nickname}`, 'success');
    console.log('MELI User:', userData);
  } catch (e) {
    console.error('Error probando conexión:', e);
    toast(`❌ Error: ${e.message}`, 'error');
  } finally {
    const btn = document.getElementById('meliTestBtn');
    btn.disabled = false;
    btn.textContent = '✓ Probar Conexión';
  }
}

/**
 * Desconectar de MercadoLibre
 */
async function handleMeliDisconnect() {
  if (!confirm('¿Desconectar de MercadoLibre?')) {
    return;
  }

  try {
    if (typeof window.MELI !== 'undefined' && window.MELI) {
      window.MELI.logout();
    }

    localStorage.removeItem('ma4_meli_token');
    localStorage.removeItem('ma4_meli_user_id');
    localStorage.removeItem('ma4_meli_listings');

    updateMeliStatusUI();
    toast('✅ Desconectado de MercadoLibre', 'success');
  } catch (e) {
    console.error('Error desconectando:', e);
    toast('❌ Error al desconectar', 'error');
  }
}

/**
 * Sincronizar ahora (sin esperar 30 minutos)
 */
async function handleMeliSyncNow() {
  try {
    const btn = document.getElementById('meliSyncNowBtn');
    btn.disabled = true;
    btn.textContent = '⏳ Sincronizando...';

    if (typeof window.MELI === 'undefined' || !window.MELI) {
      toast('❌ Script de MELI no cargado', 'error');
      return;
    }

    // Obtener almacén local
    if (typeof almacen === 'undefined') {
      toast('❌ Almacén no disponible', 'error');
      return;
    }

    const result = await window.MELI.sync(almacen);

    if (result.status === 'success') {
      const changes = result.changes;
      toast(
        `✅ Sincronización completada!\n` +
        `Creados: ${changes.created}, Actualizados: ${changes.updated}`,
        'success'
      );
    } else {
      toast(`❌ Error: ${result.message}`, 'error');
    }

    // Actualizar UI
    updateMeliStatusUI();
  } catch (e) {
    console.error('Error sincronizando:', e);
    toast(`❌ Error: ${e.message}`, 'error');
  } finally {
    const btn = document.getElementById('meliSyncNowBtn');
    btn.disabled = false;
    btn.textContent = '🔄 Sincronizar Ahora';
  }
}

// ═════════════════════════════════════════════════════════════════
// ACTUALIZACIÓN DE UI
// ═════════════════════════════════════════════════════════════════

/**
 * Actualizar estado visual de MercadoLibre
 */
function updateMeliStatusUI() {
  try {
    if (typeof window.MELI === 'undefined' || !window.MELI) {
      return;
    }

    const state = window.MELI.getState();
    const statusBox = document.getElementById('meliStatusBox');
    const statusIndicator = document.getElementById('meliStatusIndicator');
    const statusDetails = document.getElementById('meliStatusDetails');
    const connectBtn = document.getElementById('meliConnectBtn');
    const testBtn = document.getElementById('meliTestBtn');
    const disconnectBtn = document.getElementById('meliDisconnectBtn');
    const meliConfig = document.getElementById('meliConfig');
    const meliInfo = document.getElementById('meliInfo');

    if (state.isAuthenticated) {
      // Conectado
      statusIndicator.innerHTML = `
        <span class="status-dot online"></span>
        <span class="status-text">Conectado</span>
      `;

      statusDetails.textContent = `
        Usuario ID: ${state.userId}
        • Estado: ${state.syncState}
        • Última sync: ${state.lastSyncTime || 'Nunca'}
      `;

      connectBtn.style.display = 'none';
      testBtn.style.display = 'inline-block';
      disconnectBtn.style.display = 'inline-block';
      meliConfig.style.display = 'block';
      meliInfo.style.display = 'block';

      // Actualizar info
      if (typeof almacen !== 'undefined') {
        const syncedCount = Object.keys(JSON.parse(localStorage.getItem('ma4_meli_listings') || '{}')).length;
        document.getElementById('meliSyncedCount').textContent = `${syncedCount} / ${almacen.length}`;
      }

      if (state.lastSyncTime) {
        document.getElementById('meliLastSync').textContent = new Date(state.lastSyncTime).toLocaleString();
      }

      document.getElementById('meliConflictCount').textContent = '0'; // TODO: calcular conflictos
    } else {
      // Desconectado
      statusIndicator.innerHTML = `
        <span class="status-dot offline"></span>
        <span class="status-text">Desconectado</span>
      `;

      statusDetails.textContent = 'Configura credenciales para sincronizar inventario con MercadoLibre';

      connectBtn.style.display = 'inline-block';
      testBtn.style.display = 'none';
      disconnectBtn.style.display = 'none';
      meliConfig.style.display = 'none';
      meliInfo.style.display = 'none';
    }
  } catch (e) {
    console.error('Error actualizando UI:', e);
  }
}

// ═════════════════════════════════════════════════════════════════
// DASHBOARD DE SINCRONIZACIÓN
// ═════════════════════════════════════════════════════════════════

/**
 * Crear dashboard de sincronización para mostrar en home/almacén
 */
function createMeliDashboard() {
  return `
    <div class="meli-dashboard" id="meliDashboard">
      <div class="dashboard-header">
        <h3>🔄 MercadoLibre Sync</h3>
        <div class="dashboard-status" id="dashboardStatus">
          <span class="status-indicator">
            <span class="status-dot offline"></span>
            Desconectado
          </span>
        </div>
      </div>

      <div class="dashboard-content">
        <!-- Estadísticas -->
        <div class="stats-row">
          <div class="stat-box">
            <label>Última sincronización</label>
            <value id="dashLastSync">Nunca</value>
          </div>
          <div class="stat-box">
            <label>Próxima sincronización</label>
            <value id="dashNextSync">-</value>
          </div>
          <div class="stat-box">
            <label>Estado</label>
            <value id="dashState">Inactivo</value>
          </div>
        </div>

        <!-- Alertas -->
        <div id="meliAlerts" style="display: none;"></div>

        <!-- Botones -->
        <div class="dashboard-actions">
          <button
            id="dashSyncBtn"
            class="btn btn-primary"
            onclick="handleMeliSyncNow()"
            style="display: none;"
          >
            🔄 Sincronizar Ahora
          </button>
          <button class="btn btn-secondary" onclick="toggleMeliDashboard()">
            Configurar
          </button>
        </div>
      </div>
    </div>
  `;
}

/**
 * Actualizar dashboard en tiempo real
 */
function updateMeliDashboard() {
  try {
    if (typeof window.MELI === 'undefined' || !window.MELI) {
      return;
    }

    const state = window.MELI.getState();
    const stats = state.stats;

    // Actualizar status
    const statusEl = document.querySelector('.dashboard-status');
    if (statusEl && state.isAuthenticated) {
      statusEl.innerHTML = `
        <span class="status-indicator">
          <span class="status-dot online"></span>
          Conectado
        </span>
      `;
    }

    // Actualizar últimas fechas
    if (stats.lastSync) {
      document.getElementById('dashLastSync').textContent = new Date(stats.lastSync).toLocaleString();
    }

    document.getElementById('dashState').textContent = state.syncState || 'Inactivo';

    // Mostrar botón Sincronizar Ahora solo si conectado
    const syncBtn = document.getElementById('dashSyncBtn');
    if (state.isAuthenticated && syncBtn) {
      syncBtn.style.display = 'inline-block';
    }

    // Mostrar alertas
    const alertsEl = document.getElementById('meliAlerts');
    if (stats.errorCount > 0 && alertsEl) {
      alertsEl.innerHTML = `
        <div class="alert alert-warning">
          ⚠️ ${stats.errorCount} errores en sincronización
        </div>
      `;
      alertsEl.style.display = 'block';
    }
  } catch (e) {
    console.error('Error actualizando dashboard:', e);
  }
}

function toggleMeliDashboard() {
  // Abrir modal de configuración
  if (typeof showConfigModal === 'function') {
    showConfigModal('mercadolibre');
  }
}

// ═════════════════════════════════════════════════════════════════
// STATUS INDICATORS EN TABLA
// ═════════════════════════════════════════════════════════════════

/**
 * Obtener icono de estado de sincronización para producto
 */
function getMeliStatusIcon(product) {
  if (!product) return '⚪';

  const listings = JSON.parse(localStorage.getItem('ma4_meli_listings') || '{}');
  const meliId = listings[product.id];

  if (!meliId) {
    return '⚪'; // No sincronizado
  }

  // Verificar si hay conflicto
  const syncLogs = JSON.parse(localStorage.getItem('ma4_meli_sync_log') || '[]');
  const recentConflict = syncLogs.find(
    log => log.localId === product.id && log.details?.includes('conflict')
  );

  if (recentConflict) {
    return '⚠️'; // Conflicto
  }

  return '✅'; // Sincronizado
}

/**
 * Obtener tooltip con información de sincronización
 */
function getMeliStatusTooltip(product) {
  if (!product) return 'Sin sincronizar';

  const listings = JSON.parse(localStorage.getItem('ma4_meli_listings') || '{}');
  const meliId = listings[product.id];

  if (!meliId) {
    return 'Pendiente: crear en MercadoLibre';
  }

  const syncLogs = JSON.parse(localStorage.getItem('ma4_meli_sync_log') || '[]');
  const lastLog = syncLogs.find(log => log.localId === product.id);

  if (lastLog) {
    return `MELI ID: ${meliId}\nÚltimo sync: ${new Date(lastLog.timestamp).toLocaleString()}`;
  }

  return `MELI ID: ${meliId}`;
}

// ═════════════════════════════════════════════════════════════════
// HISTORIAL DE CAMBIOS
// ═════════════════════════════════════════════════════════════════

/**
 * Crear tabla de historial de sincronización
 */
function createMeliHistoryTable() {
  const logs = typeof window.MELI !== 'undefined' && window.MELI
    ? window.MELI.getLogs(50)
    : JSON.parse(localStorage.getItem('ma4_meli_sync_log') || '[]').slice(0, 50);

  let html = `
    <div class="meli-history">
      <h3>📜 Historial de Sincronización</h3>
      <table class="history-table">
        <thead>
          <tr>
            <th>Hora</th>
            <th>Operación</th>
            <th>Producto</th>
            <th>Estado</th>
            <th>Detalles</th>
          </tr>
        </thead>
        <tbody>
  `;

  for (const log of logs) {
    const time = new Date(log.timestamp).toLocaleTimeString();
    const statusIcon = log.status === 'success' ? '✅' : '❌';
    const product = log.localId ? log.localId.substring(0, 20) : 'General';

    html += `
      <tr class="log-${log.status}">
        <td>${time}</td>
        <td>${log.operation}</td>
        <td>${product}</td>
        <td>${statusIcon}</td>
        <td>${log.details || '-'}</td>
      </tr>
    `;
  }

  html += `
        </tbody>
      </table>
    </div>
  `;

  return html;
}

// ═════════════════════════════════════════════════════════════════
// ESTILOS CSS (para agregar a styles.css)
// ═════════════════════════════════════════════════════════════════

const MELI_CSS = `
/* MercadoLibre Integration Styles */

.meli-section {
  padding: 1.5rem;
  background: #f9f9f9;
  border-radius: 8px;
  margin-bottom: 1.5rem;
}

.meli-status-box {
  padding: 1rem;
  background: white;
  border-left: 4px solid #ff6b6b;
  border-radius: 4px;
  margin-bottom: 1.5rem;
}

.meli-status-box.connected {
  border-left-color: #51cf66;
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.status-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot.online {
  background-color: #51cf66;
  animation: pulse 2s infinite;
}

.status-dot.offline {
  background-color: #ff6b6b;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.status-details {
  margin: 0;
  font-size: 0.9rem;
  color: #666;
}

.meli-credentials {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.meli-credentials label {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-weight: 500;
  margin-bottom: 0.3rem;
}

.help-icon {
  font-size: 0.8rem;
  color: #999;
  cursor: help;
}

.meli-actions {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.meli-actions .btn {
  flex: 1;
  min-width: 200px;
}

.meli-config,
.meli-info {
  padding: 1rem;
  background: white;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.meli-config label {
  display: block;
  margin-bottom: 0.5rem;
  cursor: pointer;
}

.meli-config input[type="checkbox"] {
  margin-right: 0.5rem;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
}

.info-item {
  padding: 0.75rem;
  background: #f5f5f5;
  border-radius: 4px;
}

.info-item label {
  display: block;
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 0.3rem;
}

.info-item span {
  display: block;
  font-weight: 600;
  color: #333;
}

.meli-dashboard {
  background: white;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.dashboard-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #f0f0f0;
}

.dashboard-header h3 {
  margin: 0;
}

.dashboard-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-box {
  padding: 1rem;
  background: #f9f9f9;
  border-radius: 4px;
  text-align: center;
}

.stat-box label {
  display: block;
  font-size: 0.85rem;
  color: #666;
  margin-bottom: 0.5rem;
}

.stat-box value {
  display: block;
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
}

.dashboard-actions {
  display: flex;
  gap: 0.5rem;
}

.dashboard-actions .btn {
  flex: 1;
}

.meli-help {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.meli-help a {
  color: #1971c2;
  text-decoration: none;
  font-size: 0.9rem;
}

.meli-help a:hover {
  text-decoration: underline;
}

.meli-history {
  margin-top: 1.5rem;
}

.history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.history-table thead {
  background: #f5f5f5;
}

.history-table th,
.history-table td {
  padding: 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e0e0e0;
}

.history-table th {
  font-weight: 600;
  color: #333;
}

.log-success {
  background: #f0f9ff;
}

.log-error {
  background: #fff5f5;
}

.alert {
  padding: 1rem;
  border-radius: 4px;
  margin-bottom: 1rem;
}

.alert-warning {
  background: #fffbea;
  border-left: 4px solid #f59f00;
  color: #5c4a08;
}
`;

// ═════════════════════════════════════════════════════════════════
// EXPORTAR
// ═════════════════════════════════════════════════════════════════

if (typeof window !== 'undefined') {
  window.MELI_UI = {
    createConfigSection: createMeliConfigSection,
    createDashboard: createMeliDashboard,
    updateStatusUI: updateMeliStatusUI,
    updateDashboard: updateMeliDashboard,
    getStatusIcon: getMeliStatusIcon,
    getStatusTooltip: getMeliStatusTooltip,
    createHistoryTable: createMeliHistoryTable,
    CSS: MELI_CSS,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    createMeliConfigSection,
    createMeliDashboard,
    updateMeliStatusUI,
    updateMeliDashboard,
    getMeliStatusIcon,
    getMeliStatusTooltip,
    createMeliHistoryTable,
    MELI_CSS,
  };
}
