# Guía de Implementación RBAC - Maya Autopartes
**Última actualización: 2026-04-22**

## 📖 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura](#arquitectura)
3. [Instalación y Configuración](#instalación-y-configuración)
4. [Uso en Backend](#uso-en-backend)
5. [Uso en Frontend](#uso-en-frontend)
6. [Ejemplos Prácticos](#ejemplos-prácticos)
7. [Auditoría y Logging](#auditoría-y-logging)
8. [Solución de Problemas](#solución-de-problemas)

---

## 🎯 Visión General

El sistema RBAC (Role-Based Access Control) de Maya Autopartes proporciona:

- **4 Roles predefinidos**: Admin, Gerente, Vendedor, Viewer
- **Control granular de permisos** por recurso y acción
- **Validación en servidor** (seguridad)
- **Validación en cliente** (experiencia)
- **Auditoría completa** de accesos denegados
- **Fácil integración** con Express.js y frontend vanilla

---

## 🏗️ Arquitectura

### Componentes

```
backend/
├── rbac/
│   └── roles.js                 # Definición de roles y permisos
└── middleware/
    └── rbac-middleware.js       # Middlewares Express para verificación

frontend/
└── rbac/
    └── permissions.js           # Sistema de permisos en cliente
```

### Flujo de Autorización

```
┌─────────────────────────────────────────────────────────────┐
│ Request HTTP (usuario + acción)                              │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
            ┌──────────────────────────┐
            │ Middleware requireAuth   │
            │ (Verificar sesión/JWT)   │
            └────────────┬─────────────┘
                         │
        ┌────────────────┴────────────────┐
        │ Inválido                        │ Válido
        ▼                                 ▼
    401 Unauthorized        ┌──────────────────────────┐
                            │ Middleware requirePerm   │
                            │ (checkPermission)        │
                            └────────────┬─────────────┘
                                        │
                        ┌───────────────┴───────────────┐
                        │ Sin permisos                   │ Con permisos
                        ▼                               ▼
                    403 Forbidden            ┌──────────────────────┐
                                            │ logAccessEvent()     │
                                            │ Ejecutar endpoint    │
                                            └──────────────────────┘
```

---

## 🔧 Instalación y Configuración

### 1. Importar los módulos

#### Backend (Express.js)

```javascript
// En tu app.js o server.js
const express = require('express');
const {
  requireAuth,
  requirePermission,
  requireRole,
  requireAdmin,
  auditLog,
  logResourceChange
} = require('./backend/middleware/rbac-middleware');

const app = express();
```

#### Frontend (HTML)

```html
<!-- En tu index.html -->
<script src="./frontend/rbac/permissions.js"></script>
```

### 2. Configurar middleware global (Backend)

```javascript
const app = express();

// Middleware global para extraer usuario
app.use((req, res, next) => {
  // Obtener usuario de sesión, JWT, o headers
  req.usuario = req.session?.usuario || 
                req.headers['x-usuario'] ? 
                JSON.parse(req.headers['x-usuario']) : 
                null;
  next();
});

// Middleware de error al final
app.use(handleAuthError);
```

### 3. Inicializar en Frontend

```javascript
// Después de login
fetch('/api/usuario/actual')
  .then(res => res.json())
  .then(data => {
    // Inicializar sistema de permisos
    PermissionSystem.initialize(data.usuario);
    
    // Aplicar RBAC a toda la página
    PermissionSystem.applyRBACToPage();
  });
```

---

## 💻 Uso en Backend

### Proteger una ruta con permiso específico

```javascript
app.post('/api/ventas', 
  requireAuth,
  requirePermission('venta', 'crear'),
  auditLog('Crear venta'),
  logResourceChange('ventas'),
  async (req, res) => {
    // Crear venta
    const venta = await crearVenta(req.body);
    res.json({ success: true, data: venta });
  }
);
```

### Proteger con rol específico

```javascript
// Solo Admin
app.delete('/api/usuarios/:id',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    await eliminarUsuario(req.params.id);
    res.json({ success: true });
  }
);

// Admin o Gerente
app.get('/api/reportes/auditoria',
  requireAuth,
  requireAdminOrGerente,
  async (req, res) => {
    const auditoria = await getAuditoria();
    res.json({ success: true, data: auditoria });
  }
);
```

### Permisos múltiples (OR logic)

```javascript
app.post('/api/reportes/generar',
  requireAuth,
  requireAnyPermission([
    { recurso: 'reporte', accion: 'generar_pdf' },
    { recurso: 'reporte', accion: 'generar_excel' }
  ]),
  async (req, res) => {
    // Generar reporte
    res.json({ success: true });
  }
);
```

### Permisos múltiples (AND logic)

```javascript
app.post('/api/usuarios/:id/cambiar-rol',
  requireAuth,
  requireAllPermissions([
    { recurso: 'usuario', accion: 'editar' },
    { recurso: 'usuario', accion: 'cambiar_rol' }
  ]),
  async (req, res) => {
    // Cambiar rol
    res.json({ success: true });
  }
);
```

### Verificación manual en código

```javascript
const { checkPermission } = require('./backend/rbac/roles');

app.post('/api/venta/procesar', requireAuth, async (req, res) => {
  const usuario = req.usuario;
  
  if (!checkPermission(usuario, 'venta', 'crear')) {
    return res.status(403).json({ error: 'No autorizado' });
  }
  
  // Procesar venta
});
```

### Logging de auditoría

```javascript
const { logAccessEvent } = require('./backend/rbac/roles');

// Acceso permitido
logAccessEvent(usuario, 'venta', 'crear', true, {
  ip: req.ip,
  venta_id: venta.id
});

// Acceso denegado
logAccessEvent(usuario, 'venta', 'eliminar', false, {
  ip: req.ip,
  motivo: 'Rol insuficiente'
});
```

---

## 🎨 Uso en Frontend

### Verificar permisos

```javascript
// Verificación simple
if (PermissionSystem.hasPermission('venta', 'crear')) {
  // Crear venta
}

// Verificar uno de varios
if (PermissionSystem.hasAnyPermission([
  { recurso: 'venta', accion: 'crear' },
  { recurso: 'venta', accion: 'editar' }
])) {
  // Permitir editar venta
}

// Verificar todos
if (PermissionSystem.hasAllPermissions([
  { recurso: 'usuario', accion: 'editar' },
  { recurso: 'usuario', accion: 'cambiar_rol' }
])) {
  // Cambiar rol de usuario
}

// Verificar rol
if (PermissionSystem.hasRole(['admin', 'gerente'])) {
  // Mostrar panel de admin
}
```

### Manipular DOM basado en permisos

```javascript
// Ocultar/mostrar elemento
PermissionSystem.showIfPermitted('#btn-crear-venta', 
  PermissionSystem.hasPermission('venta', 'crear'));

// Habilitar/deshabilitar botón
PermissionSystem.enableIfPermitted('#btn-eliminar-venta',
  PermissionSystem.hasPermission('venta', 'eliminar'));

// Aplicar a múltiples elementos (selector CSS)
PermissionSystem.applyPermissionToElements(
  '.btn-crear-producto',
  'almacen',
  'crear_producto'
);
```

### Atributos HTML declarativos

```html
<!-- El elemento se muestra/habilita automáticamente -->
<button 
  data-rbac-recurso="venta" 
  data-rbac-accion="crear"
  id="btn-crear">
  Crear Venta
</button>

<button 
  data-rbac-recurso="usuario"
  data-rbac-accion="eliminar"
  id="btn-eliminar-usuario">
  Eliminar
</button>

<script>
  // Aplicar RBAC a todos los elementos con atributos data-rbac
  PermissionSystem.applyRBACToPage();
</script>
```

### Con validación de alerta

```javascript
// Muestra alerta si no tiene permiso
if (PermissionSystem.checkPermissionWithAlert('venta', 'eliminar')) {
  // Proceder a eliminar
  await deleteSale(ventaId);
}

// Wrapper para funciones protegidas
PermissionSystem.withPermissionCheck(
  'venta', 
  'crear',
  () => {
    // Este código solo se ejecuta si tiene permiso
    return crearVenta(datosVenta);
  },
  'No puede crear ventas'
);
```

### Sincronización con servidor

```javascript
// Refrescar permisos después de cambio de rol
async function changeUserRole(userId, newRole) {
  await fetch(`/api/usuarios/${userId}/rol`, {
    method: 'PUT',
    body: JSON.stringify({ role: newRole })
  });
  
  // Refrescar permisos del usuario actual
  await PermissionSystem.refreshPermissions();
  
  // Reaplicar RBAC a página
  PermissionSystem.applyRBACToPage();
}
```

---

## 💡 Ejemplos Prácticos

### Ejemplo 1: Panel de Administración

```html
<!-- HTML -->
<div id="admin-panel">
  <h2>Administración</h2>
  
  <section data-rbac-recurso="usuario" data-rbac-accion="ver_lista">
    <h3>Usuarios</h3>
    <button data-rbac-recurso="usuario" data-rbac-accion="crear">
      Crear Usuario
    </button>
  </section>
  
  <section data-rbac-recurso="configuracion" data-rbac-accion="editar_empresa">
    <h3>Configuración</h3>
    <button>Editar Empresa</button>
  </section>
</div>

<script>
  PermissionSystem.initialize(usuarioActual);
  PermissionSystem.applyRBACToPage();
</script>
```

### Ejemplo 2: Formulario de Venta

```javascript
// JavaScript
function initSaleForm() {
  const form = document.getElementById('sale-form');
  const btnCreate = document.getElementById('btn-create-sale');
  const btnDelete = document.getElementById('btn-delete-sale');
  const inputVendedor = document.getElementById('input-vendedor');
  
  // Habilitar/deshabilitar botones
  btnCreate.disabled = !PermissionSystem.hasPermission('venta', 'crear');
  btnDelete.disabled = !PermissionSystem.hasPermission('venta', 'eliminar');
  
  // Mostrar/ocultar campos
  inputVendedor.style.display = 
    PermissionSystem.hasPermission('venta', 'cambiar_vendedor') ? '' : 'none';
  
  // Listener con validación
  btnCreate.addEventListener('click', (e) => {
    if (!PermissionSystem.checkPermissionWithAlert('venta', 'crear')) {
      e.preventDefault();
      return;
    }
    submitSaleForm();
  });
}

initSaleForm();
```

### Ejemplo 3: Componente Reusable

```javascript
/**
 * Componente de botón protegido por permisos
 */
function createPermissionButton(config) {
  const {
    id,
    texto,
    recurso,
    accion,
    onclick,
    clase = 'btn btn-primary'
  } = config;
  
  const tiene = PermissionSystem.hasPermission(recurso, accion);
  
  const btn = document.createElement('button');
  btn.id = id;
  btn.textContent = texto;
  btn.className = clase;
  btn.disabled = !tiene;
  
  if (!tiene) {
    btn.title = `No tiene permiso: ${accion} en ${recurso}`;
    btn.classList.add('no-permission');
  } else {
    btn.addEventListener('click', onclick);
  }
  
  return btn;
}

// Uso
const btnCrearVenta = createPermissionButton({
  id: 'btn-crear',
  texto: 'Crear Venta',
  recurso: 'venta',
  accion: 'crear',
  onclick: () => crearVenta(),
  clase: 'btn btn-primary btn-lg'
});

document.body.appendChild(btnCrearVenta);
```

---

## 🔍 Auditoría y Logging

### Eventos Registrados

El sistema registra automáticamente:

1. **Accesos permitidos**: Usuario, recurso, acción, timestamp
2. **Accesos denegados**: Usuario, recurso, acción, IP, timestamp
3. **Cambios de recurso**: PUT, POST, DELETE, timestamp
4. **Cambios de rol**: Usuario modificado, nuevo rol, usuario admin

### Acceder a logs

```javascript
// Backend
const { logAccessEvent } = require('./backend/rbac/roles');

logAccessEvent(usuario, 'venta', 'crear', true, {
  ip: req.ip,
  userAgent: req.get('user-agent'),
  venta_id: venta.id
});

// Frontend - Generar reporte
const report = PermissionSystem.generatePermissionReport();
console.log(report);
// {
//   usuario: { id, nombre, role },
//   fecha: "2026-04-22T10:30:00Z",
//   permisos: { venta: { crear: true, ... }, ... },
//   resumen: { venta: 8, cliente: 6, ... }
// }
```

### Endpoint para ver auditoría

```javascript
app.get('/api/admin/auditoria',
  requireAuth,
  requireAdmin,
  async (req, res) => {
    // Conectar a DB y obtener logs
    const logs = await db.query('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 1000');
    res.json({ success: true, data: logs });
  }
);
```

---

## 🐛 Solución de Problemas

### Problema: Botón no se oculta en cliente

**Solución**: Asegúrese de:
1. Llamar `PermissionSystem.initialize(usuario)` después de login
2. Llamar `PermissionSystem.applyRBACToPage()` después de renderizar HTML
3. Verificar que los atributos `data-rbac-*` sean correctos

```javascript
// ✅ Correcto
PermissionSystem.initialize(user);
PermissionSystem.applyRBACToPage(); // Después de renderizar

// ❌ Incorrecto - No inicializado
<button data-rbac-recurso="venta" data-rbac-accion="crear">
  Crear
</button>
```

### Problema: 403 en rutas protegidas

**Solución**: Verificar que:
1. `req.usuario` esté siendo seteado correctamente
2. El usuario tenga el rol correcto en la BD
3. El middleware `requireAuth` esté antes de `requirePermission`

```javascript
// ✅ Orden correcto
app.post('/api/ventas',
  requireAuth,           // Primero verificar autenticación
  requirePermission('venta', 'crear'),  // Luego verificar permisos
  handler
);

// ❌ Orden incorrecto
app.post('/api/ventas',
  requirePermission('venta', 'crear'),  // ERROR: usuario no validado
  requireAuth,
  handler
);
```

### Problema: Permisos no se sincronizan después de cambio de rol

**Solución**: Llamar `refreshPermissions()` después de cambio de rol

```javascript
async function cambiarRol(usuarioId, nuevoRol) {
  await fetch(`/api/usuarios/${usuarioId}/rol`, {
    method: 'PUT',
    body: JSON.stringify({ role: nuevoRol })
  });
  
  // Refrescar permisos
  await PermissionSystem.refreshPermissions();
  
  // Reaplicar a página
  PermissionSystem.applyRBACToPage();
}
```

### Problema: Error "rol no definido"

**Verificar que el rol esté en ROLES**:

```javascript
const { ROLES } = require('./backend/rbac/roles');

// ✅ Válidos
const validRoles = [ROLES.ADMIN, ROLES.GERENTE, ROLES.VENDEDOR, ROLES.VIEWER];

// ❌ Inválido
const usuario = { role: 'superusuario' }; // No existe
```

---

## 📋 Checklist de Implementación

- [ ] Archivos copiados correctamente
- [ ] Middlewares importados en Express
- [ ] Middleware de extracción de usuario configurado
- [ ] Rutas protegidas con `requireAuth` y `requirePermission`
- [ ] Scripts RBAC incluidos en HTML
- [ ] `PermissionSystem.initialize()` llamado después de login
- [ ] `PermissionSystem.applyRBACToPage()` llamado después de renderizar
- [ ] Atributos `data-rbac-*` agregados a elementos
- [ ] Auditoría configurada
- [ ] Tests de permisos realizados

---

## 🔗 Referencias Rápidas

### Funciones Backend
- `checkPermission(usuario, recurso, accion)`
- `checkRole(usuario, rol)`
- `getPermittedActions(usuario, recurso)`
- `logAccessEvent(usuario, recurso, accion, permitido, detalles)`

### Funciones Frontend
- `PermissionSystem.hasPermission(recurso, accion)`
- `PermissionSystem.applyRBACToPage()`
- `PermissionSystem.checkPermissionWithAlert(recurso, accion, msg)`
- `PermissionSystem.refreshPermissions()`

### Middlewares Express
- `requireAuth` - Verificar autenticación
- `requirePermission(recurso, accion)` - Verificar permiso
- `requireRole(roles)` - Verificar rol
- `requireAdmin` - Solo Admin
- `auditLog(descripcion)` - Registrar acceso
- `logResourceChange(recurso)` - Registrar cambios

---

