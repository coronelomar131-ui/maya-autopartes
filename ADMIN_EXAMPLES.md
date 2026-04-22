# Admin Panel - Ejemplos de Uso

## 📚 Ejemplos Prácticos

### 1. Crear un Nuevo Usuario

#### Frontend (HTML/JavaScript)
```html
<!-- Click en botón -->
<button onclick="openNewUserForm()">+ Nuevo Usuario</button>

<!-- Modal que se abre -->
<form onsubmit="createAdminUser(event)">
  <input type="email" name="email" required>
  <input type="text" name="nombre" required>
  <input type="password" name="password" required>
  <select name="role">
    <option value="">Sin rol</option>
    <option value="admin">Administrador</option>
    <option value="vendedor">Vendedor</option>
  </select>
  <button type="submit">Crear Usuario</button>
</form>
```

#### JavaScript (admin.js)
```javascript
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

    if (!response.ok) throw new Error(`Error ${response.status}`);

    const data = await response.json();
    console.log('Usuario creado:', data);
    
    toast('✅ Usuario creado exitosamente');
    closeAdminNewUserModal();
    
    // Reload usuarios list
    await loadAdminUsers();
    renderAdminUsers();
    renderAdminRoles();
  } catch (error) {
    console.error('Error:', error);
    toast(`⚠ Error: ${error.message}`);
  }
}
```

#### Backend (Express.js)
```javascript
router.post('/users', requireAdmin, async (req, res) => {
  try {
    const { email, nombre, password, role } = req.body;

    // Validate
    if (!email || !nombre || !password) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create auth user
    const { data: authData, error: authError } = await req.supabase.auth.admin
      .createUser({
        email,
        password,
        email_confirm: true
      });

    if (authError) throw authError;

    // Create user record
    const { data: userData, error: userError } = await req.supabase
      .from('usuarios')
      .insert([{
        id: authData.user.id,
        email,
        nombre,
        role: role || null,
        activo: true,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (userError) throw userError;

    // Log to audit
    await req.supabase.from('audit_logs').insert([{
      usuario_id: req.user.id,
      evento: 'create_user',
      tabla: 'usuarios',
      fila_id: userData.id,
      detalles: { email, nombre, role },
      timestamp: new Date().toISOString()
    }]);

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: userData
    });
  } catch (error) {
    res.status(400).json({
      error: 'Error al crear usuario',
      message: error.message
    });
  }
});
```

#### API Request (cURL)
```bash
curl -X POST http://localhost:3000/api/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "email": "carlos@example.com",
    "nombre": "Carlos López",
    "password": "SecurePassword123",
    "role": "vendedor"
  }'
```

#### Response
```json
{
  "success": true,
  "message": "Usuario creado exitosamente",
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "carlos@example.com",
    "nombre": "Carlos López",
    "role": "vendedor",
    "activo": true,
    "created_at": "2026-04-22T15:30:00Z"
  }
}
```

---

### 2. Cambiar Rol de Usuario

#### JavaScript (Cambio en tiempo real)
```javascript
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

    if (!response.ok) throw new Error(`Error ${response.status}`);

    toast('✅ Rol actualizado');
    await loadAdminUsers();
    renderAdminRoles();
    renderAdminUsers();
  } catch (error) {
    console.error('Error:', error);
    toast(`⚠ Error: ${error.message}`);
    // Revert UI
    await loadAdminUsers();
    renderAdminRoles();
  }
}
```

#### HTML (Dropdown)
```html
<select class="role-select"
        value="vendedor"
        onchange="changeUserRole('550e8400-e29b-41d4-a716-446655440000', this.value)">
  <option value="">Sin rol</option>
  <option value="admin">Admin</option>
  <option value="supervisor">Supervisor</option>
  <option value="vendedor" selected>Vendedor</option>
  <option value="bodeguero">Bodeguero</option>
  <option value="cliente">Cliente</option>
</select>
```

#### API Request (cURL)
```bash
curl -X PUT http://localhost:3000/api/admin/users/550e8400-e29b-41d4-a716-446655440000/role \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"role": "supervisor"}'
```

---

### 3. Obtener Lista de Usuarios (Paginada)

#### JavaScript
```javascript
async function loadAdminUsers() {
  try {
    // Página 1, 50 usuarios por página
    const response = await fetch('/api/admin/users?page=1&limit=50', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) throw new Error(`Error ${response.status}`);

    const data = await response.json();
    adminUsers = data.data || [];
    console.log(`Cargados ${adminUsers.length} usuarios`);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

#### API Request (cURL)
```bash
curl http://localhost:3000/api/admin/users?page=1&limit=50 \
  -H "Authorization: Bearer TOKEN"
```

#### Response
```json
{
  "success": true,
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "juan@example.com",
      "nombre": "Juan Pérez",
      "role": "vendedor",
      "activo": true,
      "created_at": "2026-04-20T10:00:00Z"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "email": "maria@example.com",
      "nombre": "María García",
      "role": "supervisor",
      "activo": true,
      "created_at": "2026-04-19T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 145,
    "pages": 3
  }
}
```

---

### 4. Obtener Activity Log

#### JavaScript
```javascript
async function loadActivityLog() {
  try {
    const response = await fetch('/api/admin/logs?limit=500&days=30', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) throw new Error(`Error ${response.status}`);

    const data = await response.json();
    adminActivityLog = data.data || [];
    console.log(`Cargados ${adminActivityLog.length} eventos`);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

#### API Request (cURL)
```bash
curl http://localhost:3000/api/admin/logs?limit=500&days=30 \
  -H "Authorization: Bearer TOKEN"
```

#### Response
```json
{
  "success": true,
  "data": [
    {
      "id": "log-001",
      "event_type": "login",
      "usuario_email": "juan@example.com",
      "tabla": "usuarios",
      "fila_id": "550e8400-e29b-41d4-a716-446655440000",
      "descripcion": "login en usuarios",
      "timestamp": "2026-04-22T15:45:30Z",
      "detalles": {}
    },
    {
      "id": "log-002",
      "event_type": "create",
      "usuario_email": "admin@example.com",
      "tabla": "ventas",
      "fila_id": "v-12345",
      "descripcion": "create en ventas",
      "timestamp": "2026-04-22T15:30:15Z",
      "detalles": {
        "total": 1500,
        "cliente_id": "c-001"
      }
    }
  ]
}
```

---

### 5. Exportar Activity Log a CSV

#### JavaScript
```javascript
function exportActivityLog() {
  if (adminActivityLog.length === 0) {
    toast('⚠ No hay registros para exportar');
    return;
  }

  // Headers
  const headers = ['Timestamp', 'Usuario', 'Evento', 'Descripción'];
  
  // Data rows
  const rows = adminActivityLog.map(log => [
    new Date(log.timestamp).toLocaleString('es-MX'),
    log.usuario_email || 'Sistema',
    log.event_type,
    log.descripcion || ''
  ]);

  // Build CSV
  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  // Download
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
```

#### Output CSV
```csv
"Timestamp","Usuario","Evento","Descripción"
"22/04/2026 15:45:30","juan@example.com","login","login en usuarios"
"22/04/2026 15:30:15","admin@example.com","create","create en ventas"
"22/04/2026 15:20:00","maria@example.com","update","update en clientes"
```

---

### 6. Obtener Estadísticas

#### JavaScript
```javascript
async function loadAdminStats() {
  try {
    const response = await fetch('/api/admin/stats', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) throw new Error(`Error ${response.status}`);

    const data = await response.json();
    adminStats = data.data || {};
    
    console.log('Total ventas:', adminStats.totalVentas);
    console.log('Usuarios activos:', adminStats.usuariosActivos);
  } catch (error) {
    console.error('Error:', error);
  }
}
```

#### API Request (cURL)
```bash
curl http://localhost:3000/api/admin/stats \
  -H "Authorization: Bearer TOKEN"
```

#### Response
```json
{
  "success": true,
  "data": {
    "totalUsuarios": 145,
    "usuariosActivos": 45,
    "usuariosOnline": 28,
    "totalClientes": 156,
    "totalProductos": 287,
    "totalVentas": 125450.00,
    "totalSales": 42,
    "productosStockBajo": 12,
    "ventasChangePercent": 8.5,
    "usuariosChangePercent": 5.2,
    "productosChangePercent": -2.1,
    "clientesChangePercent": 3.7,
    "conversionRate": 0.35
  }
}
```

---

### 7. Reset de Contraseña

#### JavaScript
```javascript
async function resetUserPassword(userId) {
  if (!confirm('¿Enviar email de reset de contraseña?')) return;

  try {
    const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      }
    });

    if (!response.ok) throw new Error(`Error ${response.status}`);

    toast('✅ Email de reset enviado');
  } catch (error) {
    console.error('Error:', error);
    toast(`⚠ Error: ${error.message}`);
  }
}
```

#### API Request (cURL)
```bash
curl -X POST http://localhost:3000/api/admin/users/550e8400-e29b-41d4-a716-446655440000/reset-password \
  -H "Authorization: Bearer TOKEN"
```

#### Response
```json
{
  "success": true,
  "message": "Email de reset enviado"
}
```

---

### 8. Eliminar Usuario

#### JavaScript
```javascript
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

    if (!response.ok) throw new Error(`Error ${response.status}`);

    toast('✅ Usuario eliminado exitosamente');
    closeAdminEditUserModal();
    await loadAdminUsers();
    renderAdminUsers();
    renderAdminRoles();
  } catch (error) {
    console.error('Error:', error);
    toast(`⚠ Error: ${error.message}`);
  }
}
```

#### API Request (cURL)
```bash
curl -X DELETE http://localhost:3000/api/admin/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Authorization: Bearer TOKEN"
```

#### Response
```json
{
  "success": true,
  "message": "Usuario eliminado exitosamente"
}
```

---

## 🎯 Casos de Uso Comunes

### Caso 1: Nuevo Empleado se Incorpora
```
1. Admin crea usuario con email de empresa
2. Sistema envía email de confirmación
3. Admin asigna rol (vendedor, bodeguero, etc)
4. Empleado recibe email, reset password
5. Empleado entra al sistema con nuevo rol
```

### Caso 2: Cambio de Rol (Ascenso)
```
1. Admin abre panel → Roles
2. Busca usuario actual (ej: Juan)
3. Click en dropdown del rol actual
4. Selecciona nuevo rol (supervisor)
5. Sistema registra cambio en audit_logs
6. Usuario obtiene nuevos permisos inmediatamente
```

### Caso 3: Auditoria de Acciones
```
1. Admin sospecha de actividad irregular
2. Abre Activity Log
3. Filtra por usuario específico
4. Revisa eventos: login, acciones, logout
5. Exporta log a CSV para análisis
6. Usa info para tomar decisiones
```

### Caso 4: Análisis de Performance
```
1. Admin revisa Analytics diariamente
2. Observa KPI de Ventas: ↑ 8.5%
3. Usuarios Activos: ↑ 5.2%
4. Revisa gráfico de vendedores top
5. Identifica tendencias
6. Toma decisiones estratégicas
```

### Caso 5: Desactivar Usuario Temporal
```
1. Empleado entra en licencia
2. Admin busca usuario en panel
3. Click Editar → Estado: Inactivo
4. Guarda cambios
5. Usuario no puede hacer login
6. Datos se preservan para cuando regrese
```

---

## ⚠️ Validaciones

### Validación de Contraseña
```
✓ Mínimo 8 caracteres
✓ Al menos 1 mayúscula
✓ Al menos 1 número

❌ "pass"            (muy corta)
❌ "password"        (sin mayúscula ni número)
✅ "Password123"     (válida)
```

### Validación de Email
```
✓ Formato válido: user@domain.com
✓ Email único (no duplicados)

❌ "invalidemail"    (sin @)
❌ "user@"           (incompleto)
✅ "user@example.com" (válido)
```

### Validación de Rol
```
Valores válidos:
- null (sin rol)
- "admin"
- "supervisor"
- "vendedor"
- "bodeguero"
- "cliente"
```

---

## 🔍 Debugging

### Ver logs en consola
```javascript
console.log('Usuarios:', adminUsers);
console.log('Activity Log:', adminActivityLog);
console.log('Stats:', adminStats);
```

### Ver estado actual
```javascript
// En consola del navegador
adminUsers.length          // Cantidad de usuarios cargados
adminActivityLog.length    // Cantidad de eventos
adminStats.totalVentas     // Total de ventas
```

### Ver token JWT
```javascript
localStorage.getItem('token')  // Token actual
localStorage.getItem('userRole')  // Rol del usuario
```

---

**Última actualización**: 2026-04-22
**Versión**: 1.0.0
