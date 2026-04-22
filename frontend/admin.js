/**
 * @file admin.js
 * @description Gestión del Admin Panel - Usuarios, Roles, Activity Log y Analytics
 * @version 1.0.0
 */

// ═════════════════════════════════════════════════════════════════
// STATE
// ═════════════════════════════════════════════════════════════════

let adminUsers = [];
let adminActivityLog = [];
let adminStats = {};
let currentEditingUserId = null;

// ═════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═════════════════════════════════════════════════════════════════

/**
 * Renderiza el admin panel (llamado desde main.js)
 */
async function renderAdminPanel() {
  const pageEl = document.getElementById('page-admin');
  if (!pageEl) return;

  // Cargar HTML del admin panel
  try {
    const response = await fetch('frontend/pages/admin.html');
    const html = await response.text();
    pageEl.innerHTML = html;

    // Inicializar datos
    await initAdminPanel();
  } catch (error) {
    console.error('Error loading admin panel:', error);
    pageEl.innerHTML = '<div class="empty-state">Error al cargar el panel</div>';
  }
}

/**
 * Inicializa el panel de admin
 */
async function initAdminPanel() {
  console.log('Initializing admin panel...');
  await loadAdminUsers();
  await loadActivityLog();
  await loadAdminStats();
  renderAdminUsers();
  renderAdminRoles();
  renderActivityLog();
  renderAdminStats();
}

// ═════════════════════════════════════════════════════════════════
// USUARIOS - CRUD
// ═════════════════════════════════════════════════════════════════

/**
 * Carga todos los usuarios desde el backend
 */
async function loadAdminUsers() {
  try {
    const response = await fetch('/api/admin/users', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    adminUsers = data.data || [];
    console.log('Usuarios cargados:', adminUsers.length);
  } catch (error) {
    console.error('Error cargando usuarios:', error);
    toast(`⚠ Error al cargar usuarios: ${error.message}`);
  }
}

/**
 * Renderiza la tabla de usuarios
 */
function renderAdminUsers() {
  const container = document.getElementById('admin-users-list');
  if (!container) return;

  if (adminUsers.length === 0) {
    container.innerHTML = '<div class="empty-state">No hay usuarios</div>';
    return;
  }

  const rows = adminUsers.map(user => `
    <div class="admin-user-row">
      <div class="user-info">
        <div class="user-name">${user.nombre || 'Sin nombre'}</div>
        <div class="user-email">${user.email}</div>
      </div>
      <div class="user-role">
        <span class="badge badge-${user.role || 'default'}">${user.role || 'Sin rol'}</span>
      </div>
      <div class="user-status">
        <span class="status-dot" style="background:${user.activo ? '#4CAF50' : '#9E9E9E'}"></span>
        ${user.activo ? 'Activo' : 'Inactivo'}
      </div>
      <div class="user-actions">
        <button class="btn btn-sm btn-secondary" onclick="editAdminUser('${user.id}')">✏️ Editar</button>
        <button class="btn btn-sm btn-danger" onclick="resetUserPassword('${user.id}')">🔑 Reset</button>
      </div>
    </div>
  `).join('');

  container.innerHTML = `<div class="admin-users-table-content">${rows}</div>`;
}

/**
 * Filtra usuarios en la tabla
 */
function filterAdminUsers() {
  const searchText = document.getElementById('userSearchInput')?.value.toLowerCase() || '';
  const statusFilter = document.getElementById('userStatusFilter')?.value || '';

  const filtered = adminUsers.filter(user => {
    const matchesSearch = !searchText ||
      user.nombre?.toLowerCase().includes(searchText) ||
      user.email?.toLowerCase().includes(searchText);

    const matchesStatus = !statusFilter ||
      (statusFilter === 'activo' ? user.activo : !user.activo);

    return matchesSearch && matchesStatus;
  });

  const container = document.getElementById('admin-users-list');
  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">No hay usuarios que coincidan</div>';
    return;
  }

  const rows = filtered.map(user => `
    <div class="admin-user-row">
      <div class="user-info">
        <div class="user-name">${user.nombre || 'Sin nombre'}</div>
        <div class="user-email">${user.email}</div>
      </div>
      <div class="user-role">
        <span class="badge badge-${user.role || 'default'}">${user.role || 'Sin rol'}</span>
      </div>
      <div class="user-status">
        <span class="status-dot" style="background:${user.activo ? '#4CAF50' : '#9E9E9E'}"></span>
        ${user.activo ? 'Activo' : 'Inactivo'}
      </div>
      <div class="user-actions">
        <button class="btn btn-sm btn-secondary" onclick="editAdminUser('${user.id}')">✏️ Editar</button>
        <button class="btn btn-sm btn-danger" onclick="resetUserPassword('${user.id}')">🔑 Reset</button>
      </div>
    </div>
  `).join('');

  container.innerHTML = `<div class="admin-users-table-content">${rows}</div>`;
}

/**
 * Abre modal para crear nuevo usuario
 */
function openNewUserForm() {
  const modal = document.getElementById('admin-new-user-modal');
  if (modal) modal.style.display = 'flex';
}

/**
 * Cierra modal de nuevo usuario
 */
function closeAdminNewUserModal() {
  const modal = document.getElementById('admin-new-user-modal');
  if (modal) modal.style.display = 'none';
  document.getElementById('adminNewUserForm')?.reset();
}

/**
 * Crea un nuevo usuario
 */
async function createAdminUser(event) {
  event.preventDefault();

  const form = document.getElementById('adminNewUserForm');
  const formData = new FormData(form);

  try {
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(Object.fromEntries(formData))
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    const data = await response.json();
    console.log('Usuario creado:', data);
    toast('✅ Usuario creado exitosamente');
    closeAdminNewUserModal();
    await loadAdminUsers();
    renderAdminUsers();
    renderAdminRoles();
  } catch (error) {
    console.error('Error creando usuario:', error);
    toast(`⚠ Error al crear usuario: ${error.message}`);
  }
}

/**
 * Abre modal para editar usuario
 */
function editAdminUser(userId) {
  const user = adminUsers.find(u => u.id === userId);
  if (!user) return;

  currentEditingUserId = userId;
  document.getElementById('editUserId').value = user.id;
  document.getElementById('editUserEmail').value = user.email;
  document.getElementById('editUserNombre').value = user.nombre || '';
  document.getElementById('editUserStatus').value = user.activo ? 'true' : 'false';
  document.getElementById('editUserRole').value = user.role || '';

  const modal = document.getElementById('admin-edit-user-modal');
  if (modal) modal.style.display = 'flex';
}

/**
 * Cierra modal de editar usuario
 */
function closeAdminEditUserModal() {
  const modal = document.getElementById('admin-edit-user-modal');
  if (modal) modal.style.display = 'none';
  currentEditingUserId = null;
}

/**
 * Actualiza un usuario
 */
async function updateAdminUser(event) {
  event.preventDefault();

  const form = document.getElementById('adminEditUserForm');
  const formData = new FormData(form);
  const userId = formData.get('id');
  const updateData = Object.fromEntries(formData);
  updateData.activo = updateData.activo === 'true';

  try {
    const response = await fetch(`/api/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(updateData)
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    toast('✅ Usuario actualizado exitosamente');
    closeAdminEditUserModal();
    await loadAdminUsers();
    renderAdminUsers();
    renderAdminRoles();
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    toast(`⚠ Error al actualizar usuario: ${error.message}`);
  }
}

/**
 * Elimina un usuario
 */
async function deleteAdminUser() {
  if (!currentEditingUserId || !confirm('¿Estás seguro de eliminar este usuario?')) {
    return;
  }

  try {
    const response = await fetch(`/api/admin/users/${currentEditingUserId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    toast('✅ Usuario eliminado exitosamente');
    closeAdminEditUserModal();
    await loadAdminUsers();
    renderAdminUsers();
    renderAdminRoles();
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    toast(`⚠ Error al eliminar usuario: ${error.message}`);
  }
}

/**
 * Reset de contraseña de usuario
 */
async function resetUserPassword(userId) {
  if (!confirm('¿Enviar email de reset de contraseña?')) return;

  try {
    const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    toast('✅ Email de reset enviado');
  } catch (error) {
    console.error('Error reseteando contraseña:', error);
    toast(`⚠ Error: ${error.message}`);
  }
}

// ═════════════════════════════════════════════════════════════════
// ROLES - ASIGNACIÓN
// ═════════════════════════════════════════════════════════════════

/**
 * Renderiza la vista de asignación de roles
 */
function renderAdminRoles() {
  const roles = ['', 'admin', 'supervisor', 'vendedor', 'bodeguero', 'cliente'];

  roles.forEach(role => {
    const elementId = `admin-role-${role || 'unassigned'}`;
    const container = document.getElementById(elementId);
    if (!container) return;

    const usersInRole = adminUsers.filter(u => (u.role || null) === (role || null));

    if (usersInRole.length === 0) {
      container.innerHTML = '<div class="empty-state-small">Sin usuarios</div>';
      return;
    }

    const items = usersInRole.map(user => `
      <div class="role-user-item">
        <div class="role-user-name">${user.nombre || user.email}</div>
        <select
          class="role-select"
          value="${user.role || ''}"
          onchange="changeUserRole('${user.id}', this.value)"
        >
          <option value="">Sin rol</option>
          <option value="admin">Admin</option>
          <option value="supervisor">Supervisor</option>
          <option value="vendedor">Vendedor</option>
          <option value="bodeguero">Bodeguero</option>
          <option value="cliente">Cliente</option>
        </select>
      </div>
    `).join('');

    container.innerHTML = items;
  });
}

/**
 * Cambia el rol de un usuario
 */
async function changeUserRole(userId, newRole) {
  try {
    const response = await fetch(`/api/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ role: newRole || null })
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    toast('✅ Rol actualizado');
    await loadAdminUsers();
    renderAdminRoles();
    renderAdminUsers();
  } catch (error) {
    console.error('Error cambiando rol:', error);
    toast(`⚠ Error: ${error.message}`);
    await loadAdminUsers();
    renderAdminRoles();
  }
}

// ═════════════════════════════════════════════════════════════════
// ACTIVITY LOG
// ═════════════════════════════════════════════════════════════════

/**
 * Carga el log de actividad
 */
async function loadActivityLog() {
  try {
    const response = await fetch('/api/admin/logs', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    const data = await response.json();
    adminActivityLog = data.data || [];
    console.log('Activity log cargado:', adminActivityLog.length);
  } catch (error) {
    console.error('Error cargando activity log:', error);
  }
}

/**
 * Renderiza el log de actividad
 */
function renderActivityLog() {
  const container = document.getElementById('admin-activity-list');
  if (!container) return;

  if (adminActivityLog.length === 0) {
    container.innerHTML = '<div class="empty-state">Sin registro de actividad</div>';
    return;
  }

  const rows = adminActivityLog.slice(0, 100).map(log => {
    const timestamp = new Date(log.timestamp).toLocaleString('es-MX');
    const icons = {
      login: '🔓',
      logout: '🔒',
      create: '➕',
      update: '✏️',
      delete: '🗑️'
    };
    const icon = icons[log.event_type] || '📝';

    return `
      <div class="activity-log-item">
        <div class="activity-icon">${icon}</div>
        <div class="activity-details">
          <div class="activity-user">${log.usuario_email || 'Sistema'}</div>
          <div class="activity-action">${log.event_type}</div>
          <div class="activity-description">${log.descripcion || ''}</div>
        </div>
        <div class="activity-timestamp">${timestamp}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = rows;
}

/**
 * Filtra el log de actividad
 */
function filterActivityLog() {
  const typeFilter = document.getElementById('activityTypeFilter')?.value || '';
  const userFilter = document.getElementById('activityUserFilter')?.value.toLowerCase() || '';

  const filtered = adminActivityLog.filter(log => {
    const matchesType = !typeFilter || log.event_type === typeFilter;
    const matchesUser = !userFilter || log.usuario_email?.toLowerCase().includes(userFilter);
    return matchesType && matchesUser;
  });

  const container = document.getElementById('admin-activity-list');
  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML = '<div class="empty-state">Sin registros que coincidan</div>';
    return;
  }

  const rows = filtered.slice(0, 100).map(log => {
    const timestamp = new Date(log.timestamp).toLocaleString('es-MX');
    const icons = { login: '🔓', logout: '🔒', create: '➕', update: '✏️', delete: '🗑️' };
    const icon = icons[log.event_type] || '📝';

    return `
      <div class="activity-log-item">
        <div class="activity-icon">${icon}</div>
        <div class="activity-details">
          <div class="activity-user">${log.usuario_email || 'Sistema'}</div>
          <div class="activity-action">${log.event_type}</div>
          <div class="activity-description">${log.descripcion || ''}</div>
        </div>
        <div class="activity-timestamp">${timestamp}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = rows;
}

/**
 * Exporta el activity log a CSV
 */
function exportActivityLog() {
  if (adminActivityLog.length === 0) {
    toast('⚠ No hay registros para exportar');
    return;
  }

  const headers = ['Timestamp', 'Usuario', 'Evento', 'Descripción'];
  const rows = adminActivityLog.map(log => [
    new Date(log.timestamp).toLocaleString('es-MX'),
    log.usuario_email || 'Sistema',
    log.event_type,
    log.descripcion || ''
  ]);

  const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ═════════════════════════════════════════════════════════════════
// ANALYTICS & STATS
// ═════════════════════════════════════════════════════════════════

/**
 * Carga estadísticas
 */
async function loadAdminStats() {
  try {
    const response = await fetch('/api/admin/stats', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) {
      throw new Error(`Error ${response.status}`);
    }

    const data = await response.json();
    adminStats = data.data || {};
    console.log('Stats cargados:', adminStats);
  } catch (error) {
    console.error('Error cargando stats:', error);
  }
}

/**
 * Renderiza estadísticas y KPIs
 */
function renderAdminStats() {
  // KPI Cards
  document.getElementById('kpi-total-ventas').textContent =
    `$${(adminStats.totalVentas || 0).toLocaleString('es-MX')}`;
  document.getElementById('kpi-usuarios-activos').textContent =
    adminStats.usuariosActivos || '0';
  document.getElementById('kpi-productos').textContent =
    adminStats.totalProductos || '0';
  document.getElementById('kpi-clientes').textContent =
    adminStats.totalClientes || '0';

  // Changes
  document.getElementById('kpi-total-ventas-change').textContent =
    `↑ ${(adminStats.ventasChangePercent || 0).toFixed(1)}%`;
  document.getElementById('kpi-usuarios-activos-change').textContent =
    `↑ ${(adminStats.usuariosChangePercent || 0).toFixed(1)}%`;
  document.getElementById('kpi-productos-change').textContent =
    `→ ${(adminStats.productosChangePercent || 0).toFixed(1)}%`;
  document.getElementById('kpi-clientes-change').textContent =
    `↑ ${(adminStats.clientesChangePercent || 0).toFixed(1)}%`;

  // Metrics Table
  const metricsBody = document.getElementById('admin-metrics-tbody');
  if (metricsBody) {
    const metrics = [
      ['Promedio por Venta', `$${((adminStats.totalVentas || 0) / (adminStats.totalSales || 1)).toFixed(2)}`, 'Hoy'],
      ['Tasa de Conversión', `${((adminStats.conversionRate || 0) * 100).toFixed(2)}%`, 'Mes'],
      ['Productos Bajo Stock', adminStats.productosStockBajo || '0', 'Ahora'],
      ['Usuarios Online', adminStats.usuariosOnline || '0', 'Ahora']
    ];

    metricsBody.innerHTML = metrics.map(([metric, value, period]) => `
      <tr>
        <td>${metric}</td>
        <td><strong>${value}</strong></td>
        <td>${period}</td>
      </tr>
    `).join('');
  }
}

// ═════════════════════════════════════════════════════════════════
// TAB SWITCHING
// ═════════════════════════════════════════════════════════════════

/**
 * Cambia entre tabs del admin panel
 */
function switchAdminTab(tabName) {
  // Ocultar todos los tabs
  document.querySelectorAll('.admin-tab-content').forEach(tab => {
    tab.classList.remove('active');
  });

  // Remover clase active de botones
  document.querySelectorAll('.admin-tab').forEach(btn => {
    btn.classList.remove('active');
  });

  // Mostrar tab seleccionado
  const tabElement = document.getElementById(`admin-${tabName}-tab`);
  if (tabElement) {
    tabElement.classList.add('active');
  }

  // Marcar botón como active
  event.target.classList.add('active');

  // Reload de datos según tab
  if (tabName === 'users') {
    filterAdminUsers();
  } else if (tabName === 'roles') {
    renderAdminRoles();
  } else if (tabName === 'activity') {
    renderActivityLog();
  } else if (tabName === 'stats') {
    renderAdminStats();
  }
}

// ═════════════════════════════════════════════════════════════════
// MODAL CLOSE HANDLERS
// ═════════════════════════════════════════════════════════════════

window.addEventListener('click', (e) => {
  const newUserModal = document.getElementById('admin-new-user-modal');
  const editUserModal = document.getElementById('admin-edit-user-modal');

  if (e.target === newUserModal) {
    closeAdminNewUserModal();
  }
  if (e.target === editUserModal) {
    closeAdminEditUserModal();
  }
});
