# Ejemplos Prácticos de Uso RBAC - Maya Autopartes
**Última actualización: 2026-04-22**

## 📖 Tabla de Contenidos

1. [Backend - Express.js](#backend---expressjs)
2. [Frontend - Vanilla JavaScript](#frontend---vanilla-javascript)
3. [Integración Completa](#integración-completa)
4. [Casos de Uso Reales](#casos-de-uso-reales)

---

## Backend - Express.js

### Configuración Inicial

```javascript
// app.js
const express = require('express');
const session = require('express-session');
const {
  requireAuth,
  requirePermission,
  requireRole,
  requireAdmin,
  requireAdminOrGerente,
  auditLog,
  logResourceChange,
  handleAuthError
} = require('./backend/middleware/rbac-middleware');

const app = express();

// Middleware global
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

// Middleware de extracción de usuario
app.use((req, res, next) => {
  req.usuario = req.session?.usuario || null;
  next();
});

// ═════════════════════════════════════════════════════════════════

// RUTAS PÚBLICAS (sin autenticación)

app.post('/api/login', async (req, res) => {
  try {
    const { email, contraseña } = req.body;
    
    // Verificar credenciales en BD
    const usuario = await db.query(
      'SELECT * FROM usuarios WHERE email = ? LIMIT 1',
      [email]
    );
    
    if (!usuario || !verificarContraseña(contraseña, usuario.hash)) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }
    
    // Guardar en sesión
    req.session.usuario = {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      role: usuario.role
    };
    
    res.json({ 
      success: true, 
      usuario: req.session.usuario 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// ═════════════════════════════════════════════════════════════════

// RUTAS PROTEGIDAS - VENTAS

app.post('/api/ventas',
  requireAuth,
  requirePermission('venta', 'crear'),
  auditLog('Crear nueva venta'),
  logResourceChange('ventas'),
  async (req, res) => {
    try {
      const { cliente_id, items, total, notas } = req.body;
      
      // Crear venta
      const venta = {
        id: generateId(),
        cliente_id,
        vendedor_id: req.usuario.id,  // Asignar al vendedor actual
        items,
        total,
        notas,
        estado: 'pendiente',
        fecha: new Date(),
        creado_por: req.usuario.id
      };
      
      await db.query('INSERT INTO ventas SET ?', venta);
      
      res.json({ 
        success: true, 
        data: venta,
        mensaje: 'Venta creada exitosamente'
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.put('/api/ventas/:id',
  requireAuth,
  requirePermission('venta', 'editar'),
  auditLog('Editar venta'),
  logResourceChange('ventas'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { items, total, notas } = req.body;
      
      // Verificar propiedad (los vendedores solo pueden editar sus ventas)
      if (req.usuario.role === 'vendedor') {
        const venta = await db.query(
          'SELECT * FROM ventas WHERE id = ? LIMIT 1',
          [id]
        );
        
        if (venta.vendedor_id !== req.usuario.id) {
          return res.status(403).json({ 
            error: 'No puede editar ventas de otros vendedores' 
          });
        }
      }
      
      await db.query('UPDATE ventas SET ? WHERE id = ?', [
        { items, total, notas, modificado_en: new Date() },
        id
      ]);
      
      res.json({ success: true, mensaje: 'Venta actualizada' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.delete('/api/ventas/:id',
  requireAuth,
  requirePermission('venta', 'eliminar'),
  auditLog('Eliminar venta'),
  logResourceChange('ventas'),
  async (req, res) => {
    try {
      const { id } = req.params;
      
      await db.query('DELETE FROM ventas WHERE id = ?', [id]);
      
      res.json({ success: true, mensaje: 'Venta eliminada' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.put('/api/ventas/:id/aprobar',
  requireAuth,
  requirePermission('venta', 'aprobar'),
  auditLog('Aprobar venta'),
  logResourceChange('ventas'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { motivo } = req.body;
      
      await db.query(
        'UPDATE ventas SET estado = ?, aprobado_por = ?, aprobado_en = ? WHERE id = ?',
        ['aprobada', req.usuario.id, new Date(), id]
      );
      
      res.json({ success: true, mensaje: 'Venta aprobada' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ═════════════════════════════════════════════════════════════════

// RUTAS PROTEGIDAS - USUARIOS (Solo Admin/Gerente)

app.post('/api/usuarios',
  requireAuth,
  requirePermission('usuario', 'crear'),
  auditLog('Crear usuario'),
  logResourceChange('usuarios'),
  async (req, res) => {
    try {
      const { nombre, email, role, contraseña } = req.body;
      
      // Validar rol
      if (!['admin', 'gerente', 'vendedor', 'viewer'].includes(role)) {
        return res.status(400).json({ error: 'Rol inválido' });
      }
      
      // Validar que no sea Admin (solo otro Admin puede crear Admins)
      if (role === 'admin' && req.usuario.role !== 'admin') {
        return res.status(403).json({ 
          error: 'Solo Admin puede crear otros Admins' 
        });
      }
      
      // Crear usuario
      const usuario = {
        id: generateId(),
        nombre,
        email,
        role,
        hash: hashPassword(contraseña),
        creado_en: new Date(),
        creado_por: req.usuario.id,
        activo: true
      };
      
      await db.query('INSERT INTO usuarios SET ?', usuario);
      
      // Enviar email de bienvenida
      await enviarEmailBienvenida(email, nombre, role);
      
      res.json({ 
        success: true, 
        usuario: { id: usuario.id, nombre, email, role } 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.get('/api/usuarios',
  requireAuth,
  requirePermission('usuario', 'ver_lista'),
  auditLog('Listar usuarios'),
  async (req, res) => {
    try {
      const usuarios = await db.query(
        'SELECT id, nombre, email, role, activo, creado_en FROM usuarios'
      );
      
      res.json({ success: true, data: usuarios });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.put('/api/usuarios/:id/rol',
  requireAuth,
  requirePermission('usuario', 'cambiar_rol'),
  auditLog('Cambiar rol de usuario'),
  logResourceChange('usuarios'),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { nuevo_rol, razon } = req.body;
      
      // Solo Admin puede cambiar roles
      if (req.usuario.role !== 'admin') {
        return res.status(403).json({ 
          error: 'Solo Admin puede cambiar roles' 
        });
      }
      
      // No permitir auto-cambio de rol de último Admin
      const otrosAdmins = await db.query(
        'SELECT COUNT(*) as count FROM usuarios WHERE role = ? AND id != ?',
        ['admin', id]
      );
      
      if (nuevo_rol !== 'admin' && otrosAdmins[0].count === 0) {
        return res.status(400).json({ 
          error: 'No puede remover el último Admin del sistema' 
        });
      }
      
      await db.query(
        'UPDATE usuarios SET role = ?, modificado_en = ?, modificado_por = ? WHERE id = ?',
        [nuevo_rol, new Date(), req.usuario.id, id]
      );
      
      res.json({ success: true, mensaje: 'Rol actualizado' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ═════════════════════════════════════════════════════════════════

// RUTAS PROTEGIDAS - REPORTES

app.get('/api/reportes/ventas',
  requireAuth,
  requirePermission('reporte', 'ver_ventas'),
  auditLog('Ver reporte de ventas'),
  async (req, res) => {
    try {
      const { fecha_inicio, fecha_fin, vendedor_id } = req.query;
      
      let query = 'SELECT * FROM ventas WHERE 1=1';
      const params = [];
      
      if (fecha_inicio) {
        query += ' AND fecha >= ?';
        params.push(new Date(fecha_inicio));
      }
      
      if (fecha_fin) {
        query += ' AND fecha <= ?';
        params.push(new Date(fecha_fin));
      }
      
      // Los vendedores solo ven sus ventas
      if (req.usuario.role === 'vendedor') {
        query += ' AND vendedor_id = ?';
        params.push(req.usuario.id);
      }
      
      if (vendedor_id && req.usuario.role !== 'vendedor') {
        query += ' AND vendedor_id = ?';
        params.push(vendedor_id);
      }
      
      const ventas = await db.query(query, params);
      
      // Calcular estadísticas
      const estadisticas = {
        total_ventas: ventas.length,
        monto_total: ventas.reduce((sum, v) => sum + v.total, 0),
        promedio_venta: ventas.length > 0 
          ? ventas.reduce((sum, v) => sum + v.total, 0) / ventas.length 
          : 0
      };
      
      res.json({ 
        success: true, 
        data: ventas,
        estadisticas 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.post('/api/reportes/exportar/excel',
  requireAuth,
  requirePermission('reporte', 'generar_excel'),
  auditLog('Exportar reporte a Excel'),
  async (req, res) => {
    try {
      const { tipo, fecha_inicio, fecha_fin } = req.body;
      
      // Implementación simplificada
      const datos = await obtenerDatosReporte(tipo, fecha_inicio, fecha_fin);
      const excelBuffer = generarExcel(datos);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=reporte_${tipo}_${Date.now()}.xlsx`);
      res.send(excelBuffer);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ═════════════════════════════════════════════════════════════════

// RUTAS PROTEGIDAS - CONFIGURACIÓN (Solo Admin)

app.get('/api/admin/auditoria',
  requireAuth,
  requireAdmin,
  auditLog('Ver auditoría del sistema'),
  async (req, res) => {
    try {
      const { limit = 100, offset = 0 } = req.query;
      
      const logs = await db.query(
        'SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ? OFFSET ?',
        [parseInt(limit), parseInt(offset)]
      );
      
      res.json({ success: true, data: logs });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

app.put('/api/admin/configuracion',
  requireAuth,
  requireAdmin,
  auditLog('Cambiar configuración del sistema'),
  logResourceChange('configuracion'),
  async (req, res) => {
    try {
      const { clave, valor } = req.body;
      
      await db.query(
        'UPDATE configuracion SET valor = ? WHERE clave = ?',
        [valor, clave]
      );
      
      res.json({ success: true, mensaje: 'Configuración actualizada' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ═════════════════════════════════════════════════════════════════

// RUTA DE INFORMACIÓN DE USUARIO Y PERMISOS

app.get('/api/usuario/actual',
  requireAuth,
  async (req, res) => {
    try {
      const { getPermittedActions, getAllUserPermissions } = require('./backend/rbac/roles');
      
      res.json({
        success: true,
        usuario: req.usuario,
        permisos: getAllUserPermissions(req.usuario),
        acciones: {
          venta: getPermittedActions(req.usuario, 'venta'),
          cliente: getPermittedActions(req.usuario, 'cliente'),
          almacen: getPermittedActions(req.usuario, 'almacen')
        }
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// ═════════════════════════════════════════════════════════════════

// MANEJO DE ERRORES (Debe estar al final)
app.use(handleAuthError);

module.exports = app;
```

---

## Frontend - Vanilla JavaScript

### Inicialización

```javascript
// main.js o script global
document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Cargar usuario actual
    const response = await fetch('/api/usuario/actual');
    const data = await response.json();
    
    if (data.usuario) {
      // Inicializar sistema de permisos
      PermissionSystem.initialize(data.usuario);
      
      // Actualizar UI con información de usuario
      updateUserUI(data.usuario);
      
      // Aplicar RBAC a todos los elementos
      PermissionSystem.applyRBACToPage();
      
      // Inicializar componentes
      initializeVentasForm();
      initializeClientesForm();
      initializeAdminPanel();
    } else {
      // Redirigir a login
      window.location.href = '/login.html';
    }
  } catch (error) {
    console.error('Error inicializando aplicación:', error);
  }
});

function updateUserUI(usuario) {
  document.getElementById('user-name').textContent = usuario.nombre;
  document.getElementById('user-role').textContent = getRoleLabel(usuario.role);
  document.getElementById('user-role').className = `badge badge-${usuario.role}`;
}

function getRoleLabel(role) {
  const labels = {
    'admin': 'Administrador',
    'gerente': 'Gerente',
    'vendedor': 'Vendedor',
    'viewer': 'Visor'
  };
  return labels[role] || role;
}
```

### Formulario de Ventas

```javascript
function initializeVentasForm() {
  const form = document.getElementById('form-venta');
  const btnCrear = document.getElementById('btn-crear-venta');
  const btnGuardar = document.getElementById('btn-guardar-venta');
  const btnEliminar = document.getElementById('btn-eliminar-venta');
  const inputVendedor = document.getElementById('input-vendedor');
  
  // Mostrar/ocultar botones según permisos
  btnCrear.style.display = PermissionSystem.hasPermission('venta', 'crear') ? '' : 'none';
  btnGuardar.style.display = PermissionSystem.hasPermission('venta', 'editar') ? '' : 'none';
  btnEliminar.style.display = PermissionSystem.hasPermission('venta', 'eliminar') ? '' : 'none';
  
  // Mostrar selector de vendedor solo si puede cambiar vendedor
  inputVendedor.style.display = 
    PermissionSystem.hasPermission('venta', 'cambiar_vendedor') ? '' : 'none';
  
  // Eventos
  btnCrear.addEventListener('click', () => {
    PermissionSystem.withPermissionCheck(
      'venta',
      'crear',
      () => crearVenta(),
      'No tiene permiso para crear ventas'
    );
  });
  
  btnGuardar.addEventListener('click', () => {
    PermissionSystem.withPermissionCheck(
      'venta',
      'editar',
      () => guardarVenta(),
      'No tiene permiso para editar ventas'
    );
  });
  
  btnEliminar.addEventListener('click', () => {
    if (!PermissionSystem.checkPermissionWithAlert('venta', 'eliminar')) {
      return;
    }
    
    if (confirm('¿Está seguro de que desea eliminar esta venta?')) {
      eliminarVenta();
    }
  });
}

async function crearVenta() {
  const datos = recolectarDatosFormulario();
  
  try {
    const response = await fetch('/api/ventas', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(datos),
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (data.success) {
      toast('Venta creada exitosamente', 'success');
      limpiarFormulario();
    } else {
      toast(data.error || 'Error creando venta', 'error');
    }
  } catch (error) {
    console.error('Error:', error);
    toast('Error de red', 'error');
  }
}
```

### Panel de Administración

```javascript
function initializeAdminPanel() {
  const panelAdmin = document.getElementById('admin-panel');
  const usuario = PermissionSystem.getCurrentUser();
  
  // Mostrar panel solo si es Admin o Gerente
  if (!PermissionSystem.hasRole(['admin', 'gerente'])) {
    panelAdmin.style.display = 'none';
    return;
  }
  
  // Secciones condicionales
  const seccionUsuarios = document.querySelector('[data-section="usuarios"]');
  const seccionConfiguracion = document.querySelector('[data-section="configuracion"]');
  const seccionAuditoria = document.querySelector('[data-section="auditoria"]');
  
  // Usuarios: visible para Gerente+
  if (seccionUsuarios) {
    seccionUsuarios.style.display = 
      PermissionSystem.hasPermission('usuario', 'ver_lista') ? '' : 'none';
  }
  
  // Configuración: visible solo para Admin
  if (seccionConfiguracion) {
    seccionConfiguracion.style.display = 
      PermissionSystem.hasPermission('configuracion', 'editar_empresa') ? '' : 'none';
  }
  
  // Auditoría: visible para Admin + Gerente
  if (seccionAuditoria) {
    seccionAuditoria.style.display = 
      PermissionSystem.hasPermission('configuracion', 'ver_auditoria') ? '' : 'none';
  }
  
  // Cargar datos
  if (PermissionSystem.hasPermission('usuario', 'ver_lista')) {
    cargarListaUsuarios();
  }
  
  if (PermissionSystem.hasPermission('configuracion', 'ver_auditoria')) {
    cargarAuditoria();
  }
}

async function cargarListaUsuarios() {
  try {
    const response = await fetch('/api/usuarios', {
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (data.success) {
      renderizarTablaUsuarios(data.data);
    }
  } catch (error) {
    console.error('Error cargando usuarios:', error);
  }
}

function renderizarTablaUsuarios(usuarios) {
  const tbody = document.getElementById('usuarios-tbody');
  tbody.innerHTML = '';
  
  usuarios.forEach(usuario => {
    const tr = document.createElement('tr');
    
    // Botones de acción según permisos
    let acciones = '';
    
    if (PermissionSystem.hasPermission('usuario', 'editar')) {
      acciones += `<button class="btn-editar" onclick="editarUsuario('${usuario.id}')">Editar</button>`;
    }
    
    if (PermissionSystem.hasPermission('usuario', 'cambiar_rol')) {
      acciones += `<button class="btn-rol" onclick="cambiarRolUsuario('${usuario.id}')">Cambiar Rol</button>`;
    }
    
    if (PermissionSystem.hasPermission('usuario', 'eliminar')) {
      acciones += `<button class="btn-eliminar" onclick="eliminarUsuario('${usuario.id}')">Eliminar</button>`;
    }
    
    tr.innerHTML = `
      <td>${usuario.nombre}</td>
      <td>${usuario.email}</td>
      <td><span class="badge badge-${usuario.role}">${getRoleLabel(usuario.role)}</span></td>
      <td>${acciones}</td>
    `;
    
    tbody.appendChild(tr);
  });
}
```

---

## Integración Completa

### HTML Structure

```html
<!DOCTYPE html>
<html>
<head>
  <title>Maya Autopartes</title>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <!-- Header con info de usuario -->
  <header>
    <h1>Maya Autopartes</h1>
    <div class="user-info">
      <span id="user-name"></span>
      <span id="user-role" class="badge"></span>
      <button onclick="logout()">Logout</button>
    </div>
  </header>

  <!-- Sección de Ventas (visible para Vendedor+) -->
  <section id="section-ventas" data-rbac-recurso="venta" data-rbac-accion="ver">
    <h2>Gestión de Ventas</h2>
    
    <button 
      id="btn-crear-venta"
      data-rbac-recurso="venta" 
      data-rbac-accion="crear"
      onclick="abrirFormularioVenta()">
      + Crear Venta
    </button>

    <form id="form-venta">
      <input type="text" placeholder="Cliente" required>
      
      <select id="input-vendedor"
        data-rbac-recurso="venta"
        data-rbac-accion="cambiar_vendedor">
        <option>Seleccionar Vendedor</option>
      </select>
      
      <input type="number" placeholder="Total" required>
      
      <button type="button" id="btn-guardar-venta">Guardar</button>
      <button type="button" 
        id="btn-eliminar-venta"
        data-rbac-recurso="venta"
        data-rbac-accion="eliminar">
        Eliminar
      </button>
    </form>
  </section>

  <!-- Panel de Administración (solo Admin/Gerente) -->
  <section id="admin-panel">
    <h2>Administración</h2>
    
    <div data-section="usuarios"
      data-rbac-recurso="usuario"
      data-rbac-accion="ver_lista">
      <h3>Usuarios</h3>
      <button data-rbac-recurso="usuario" data-rbac-accion="crear">
        + Crear Usuario
      </button>
      <table id="usuarios-table">
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Email</th>
            <th>Rol</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody id="usuarios-tbody"></tbody>
      </table>
    </div>

    <div data-section="configuracion"
      data-rbac-recurso="configuracion"
      data-rbac-accion="editar_empresa">
      <h3>Configuración</h3>
      <!-- Formulario de configuración -->
    </div>

    <div data-section="auditoria"
      data-rbac-recurso="configuracion"
      data-rbac-accion="ver_auditoria">
      <h3>Auditoría</h3>
      <!-- Tabla de auditoría -->
    </div>
  </section>

  <!-- Scripts -->
  <script src="./frontend/rbac/permissions.js"></script>
  <script src="./main.js"></script>
</body>
</html>
```

---

## Casos de Uso Reales

### Caso 1: Vendedor Crea una Venta

**Flujo:**

1. **Frontend**: Usuario abre formulario (botón visible porque es vendedor)
2. **Frontend**: Sistema valida `hasPermission('venta', 'crear')` = ✅
3. **Frontend**: Usuario completa formulario y hace submit
4. **Backend**: Middleware `requirePermission('venta', 'crear')` verifica ✅
5. **Backend**: Se crea la venta asignada automáticamente al vendedor
6. **Backend**: Evento registrado en `audit_logs`
7. **Frontend**: Toast success "Venta creada"

**Código Frontend:**
```javascript
PermissionSystem.withPermissionCheck(
  'venta', 'crear',
  () => fetch('/api/ventas', { method: 'POST', body: ... }),
  'No puede crear ventas'
);
```

**Código Backend:**
```javascript
app.post('/api/ventas',
  requireAuth,
  requirePermission('venta', 'crear'),  // ← Verifica
  async (req, res) => {
    // Crear venta...
  }
);
```

### Caso 2: Gerente Intenta Cambiar Contraseña de Otro Usuario

**Flujo:**

1. **Frontend**: Formulario no muestra opción (verificaría en UI)
2. **Backend**: Si alguien intenta por API:
   - `requirePermission('usuario', 'cambiar_contraseña_otro')` verifica
   - Gerente NO tiene permiso → `403 Forbidden`
   - Evento registrado: `logAccessEvent(..., false)` ← Acceso denegado
3. **Response**: 403 con mensaje "No autorizado"

### Caso 3: Admin Promociona Vendedor a Gerente

**Flujo:**

1. **Frontend**: Admin abre panel de usuarios
2. **Frontend**: Botón "Cambiar Rol" visible (verificado por RBAC)
3. **Frontend**: Admin selecciona nuevo rol "gerente"
4. **Backend**: 
   - `requirePermission('usuario', 'cambiar_rol')` verifica ✅
   - Validaciones adicionales (no remover último admin, etc.)
   - Actualiza BD
   - Registra cambio: `logResourceChange('usuarios')`
   - Registra auditoría: `logAccessEvent(..., true)`
5. **Frontend**: Refrescar `PermissionSystem.refreshPermissions()`
6. **Result**: Usuario tiene nuevos permisos al siguiente login

---

