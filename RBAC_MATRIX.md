# RBAC Permission Matrix - Maya Autopartes
**Última actualización: 2026-04-22**

## 📋 Roles Disponibles

| Rol | Nivel | Descripción | Color |
|-----|-------|-------------|-------|
| **Admin** | 4 | Acceso total al sistema, gestión de usuarios y configuración | 🔴 #d32f2f |
| **Gerente** | 3 | Gestión de ventas, reportes, usuarios y auditoría | 🟠 #f57c00 |
| **Vendedor** | 2 | Creación de ventas, consulta de inventario y clientes | 🟢 #388e3c |
| **Viewer** | 1 | Solo lectura: reportes y consultas | 🔵 #1976d2 |

---

## 🔐 Matriz de Permisos Completa

### 1. VENTAS

| Acción | Admin | Gerente | Vendedor | Viewer |
|--------|:-----:|:-------:|:--------:|:------:|
| Crear | ✅ | ✅ | ✅ | ❌ |
| Ver | ✅ | ✅ | ✅ | ✅ |
| Editar | ✅ | ✅ | ✅ | ❌ |
| Eliminar | ✅ | ✅ | ❌ | ❌ |
| Aprobar | ✅ | ✅ | ❌ | ❌ |
| Cancelar | ✅ | ✅ | ✅ | ❌ |
| Exportar | ✅ | ✅ | ❌ | ✅ |
| Cambiar Vendedor | ✅ | ✅ | ❌ | ❌ |
| Cambiar Estado de Pago | ✅ | ✅ | ❌ | ❌ |

### 2. ALMACÉN / INVENTARIO

| Acción | Admin | Gerente | Vendedor | Viewer |
|--------|:-----:|:-------:|:--------:|:------:|
| Ver Productos | ✅ | ✅ | ✅ | ✅ |
| Crear Producto | ✅ | ✅ | ❌ | ❌ |
| Editar Producto | ✅ | ✅ | ❌ | ❌ |
| Eliminar Producto | ✅ | ❌ | ❌ | ❌ |
| Actualizar Stock | ✅ | ✅ | ✅ | ❌ |
| Ver Costo | ✅ | ✅ | ❌ | ❌ |
| Importar | ✅ | ✅ | ❌ | ❌ |
| Exportar | ✅ | ✅ | ❌ | ✅ |

### 3. CLIENTES

| Acción | Admin | Gerente | Vendedor | Viewer |
|--------|:-----:|:-------:|:--------:|:------:|
| Crear | ✅ | ✅ | ✅ | ❌ |
| Ver | ✅ | ✅ | ✅ | ✅ |
| Editar | ✅ | ✅ | ✅ | ❌ |
| Eliminar | ✅ | ✅ | ❌ | ❌ |
| Ver Crédito | ✅ | ✅ | ❌ | ❌ |
| Cambiar Crédito | ✅ | ✅ | ❌ | ❌ |
| Exportar | ✅ | ✅ | ❌ | ✅ |

### 4. USUARIOS

| Acción | Admin | Gerente | Vendedor | Viewer |
|--------|:-----:|:-------:|:--------:|:------:|
| Crear | ✅ | ✅ | ❌ | ❌ |
| Ver Lista | ✅ | ✅ | ❌ | ❌ |
| Editar | ✅ | ✅ | ❌ | ❌ |
| Eliminar | ✅ | ❌ | ❌ | ❌ |
| Cambiar Rol | ✅ | ❌ | ❌ | ❌ |
| Cambiar Contraseña (otro) | ✅ | ❌ | ❌ | ❌ |
| Desactivar | ✅ | ✅ | ❌ | ❌ |
| Ver Permisos | ✅ | ✅ | ❌ | ❌ |

### 5. REPORTES

| Acción | Admin | Gerente | Vendedor | Viewer |
|--------|:-----:|:-------:|:--------:|:------:|
| Ver Ventas | ✅ | ✅ | ❌ | ✅ |
| Ver Inventario | ✅ | ✅ | ❌ | ✅ |
| Ver Clientes | ✅ | ✅ | ❌ | ✅ |
| Ver Usuarios | ✅ | ✅ | ❌ | ❌ |
| Generar PDF | ✅ | ✅ | ❌ | ✅ |
| Generar Excel | ✅ | ✅ | ❌ | ✅ |
| Filtros Avanzados | ✅ | ✅ | ❌ | ❌ |

### 6. SINCRONIZACIÓN

| Acción | Admin | Gerente | Vendedor | Viewer |
|--------|:-----:|:-------:|:--------:|:------:|
| Google Drive | ✅ | ✅ | ❌ | ❌ |
| Supabase | ✅ | ✅ | ❌ | ❌ |
| MercadoLibre | ✅ | ✅ | ❌ | ❌ |
| OneDrive | ✅ | ✅ | ❌ | ❌ |
| Ver Historial | ✅ | ✅ | ❌ | ❌ |

### 7. CONFIGURACIÓN

| Acción | Admin | Gerente | Vendedor | Viewer |
|--------|:-----:|:-------:|:--------:|:------:|
| Editar Empresa | ✅ | ❌ | ❌ | ❌ |
| Editar Integraciones | ✅ | ❌ | ❌ | ❌ |
| Editar Permisos | ✅ | ❌ | ❌ | ❌ |
| Ver Auditoría | ✅ | ✅ | ❌ | ❌ |
| Ver Logs | ✅ | ❌ | ❌ | ❌ |
| Cambiar Idioma | ✅ | ✅ | ✅ | ✅ |
| Cambiar Tema | ✅ | ✅ | ✅ | ✅ |

### 8. SEGURIDAD

| Acción | Admin | Gerente | Vendedor | Viewer |
|--------|:-----:|:-------:|:--------:|:------:|
| Cambiar Contraseña (propia) | ✅ | ✅ | ✅ | ✅ |
| Activar 2FA | ✅ | ✅ | ✅ | ✅ |
| Ver Sesiones | ✅ | ✅ | ✅ | ✅ |
| Cerrar Sesiones | ✅ | ❌ | ❌ | ❌ |

---

## 📊 Resumen por Rol

### ADMIN (4)
- **Total de permisos**: 96 de 96
- **Acceso**: Completo a todos los recursos y acciones
- **Responsabilidades**: 
  - Gestión de usuarios (crear, editar, eliminar)
  - Configuración del sistema
  - Auditoría y logs
  - Integraciones
  - Permisos RBAC

### GERENTE (3)
- **Total de permisos**: 79 de 96
- **Acceso**: Control operativo completo
- **Responsabilidades**:
  - Gestión de ventas (crear, editar, aprobar)
  - Reportes y análisis
  - Gestión de usuarios (crear, editar)
  - Auditoría
  - Integraciones

### VENDEDOR (2)
- **Total de permisos**: 44 de 96
- **Acceso**: Transaccional
- **Responsabilidades**:
  - Crear y editar ventas propias
  - Gestionar clientes
  - Consultar inventario
  - Actualizar stock

### VIEWER (1)
- **Total de permisos**: 23 de 96
- **Acceso**: Solo lectura
- **Responsabilidades**:
  - Consultar reportes
  - Ver datos históricos
  - Generar reportes en PDF/Excel

---

## 🔧 Casos de Uso por Rol

### Caso: Crear Nueva Venta
- ✅ **Admin**: SÍ (cualquier vendedor, cualquier cliente)
- ✅ **Gerente**: SÍ (cualquier vendedor, cualquier cliente)
- ✅ **Vendedor**: SÍ (solo suya)
- ❌ **Viewer**: NO

### Caso: Cambiar Precio Producto
- ✅ **Admin**: SÍ
- ✅ **Gerente**: SÍ
- ❌ **Vendedor**: NO
- ❌ **Viewer**: NO

### Caso: Ver Reportes de Ventas
- ✅ **Admin**: SÍ
- ✅ **Gerente**: SÍ
- ❌ **Vendedor**: NO
- ✅ **Viewer**: SÍ (solo lectura)

### Caso: Asignar Rol a Usuario
- ✅ **Admin**: SÍ
- ❌ **Gerente**: NO
- ❌ **Vendedor**: NO
- ❌ **Viewer**: NO

### Caso: Importar Inventario desde Excel
- ✅ **Admin**: SÍ
- ✅ **Gerente**: SÍ
- ❌ **Vendedor**: NO
- ❌ **Viewer**: NO

---

## 📝 Notas Importantes

1. **Admin siempre tiene acceso**: Los permisos se heredan hacia abajo en la jerarquía
2. **Principio de menor privilegio**: Los vendedores tienen acceso mínimo necesario
3. **Audit Trail**: Todas las acciones denegadas se registran
4. **Sincronización en tiempo real**: Los permisos se sincronizan entre cliente y servidor

---

## 🔄 Cómo Usar Esta Matriz

### Backend (Node.js)
```javascript
const { checkPermission } = require('./backend/rbac/roles');

if (checkPermission(usuario, 'venta', 'crear')) {
  // Permitir crear venta
}
```

### Frontend (JavaScript)
```javascript
if (PermissionSystem.hasPermission('venta', 'crear')) {
  // Mostrar botón de crear venta
}
```

### HTML Declarativo
```html
<button 
  data-rbac-recurso="venta" 
  data-rbac-accion="crear"
  id="btn-crear-venta">
  Crear Venta
</button>

<script>
  PermissionSystem.applyRBACToPage();
</script>
```

---

## 🔐 Seguridad

- Verificación en **servidor** (autorización)
- Validación en **cliente** (UX/experiencia)
- Logs de todos los accesos denegados
- Matriz centralizada y versionada
- Sin hardcoding de permisos en código

