# Definiciones de Roles - Maya Autopartes
**Última actualización: 2026-04-22**

## 📚 Índice

1. [Admin](#admin--nivel-4)
2. [Gerente](#gerente--nivel-3)
3. [Vendedor](#vendedor--nivel-2)
4. [Viewer](#viewer--nivel-1)
5. [Comparación Rápida](#comparación-rápida)
6. [Transiciones de Rol](#transiciones-de-rol)

---

## Admin 🔴 (Nivel 4)

**Nombre en Sistema**: `admin`
**Color**: #d32f2f (Rojo)
**Nivel de Acceso**: 4 (Máximo)

### Descripción General
El administrador tiene acceso total a todos los recursos del sistema. Es responsable de la gestión del sistema, seguridad, usuarios e integraciones. Debe tener máxima confianza.

### Responsabilidades
- Gestión de usuarios (crear, editar, eliminar, cambiar roles)
- Configuración del sistema y empresa
- Gestión de integraciones (Google Drive, Supabase, MercadoLibre, OneDrive)
- Auditoría y logs de acceso
- Seguridad y backups
- Permisos y control de acceso (RBAC)

### Recursos Accesibles
- ✅ **Ventas**: Crear, Ver, Editar, Eliminar, Aprobar, Cancelar, Exportar, Cambiar Vendedor, Cambiar Estado Pago
- ✅ **Almacén**: Ver, Crear Producto, Editar Producto, Eliminar Producto, Actualizar Stock, Ver Costo, Importar, Exportar
- ✅ **Clientes**: Crear, Ver, Editar, Eliminar, Ver Crédito, Cambiar Crédito, Exportar
- ✅ **Usuarios**: Crear, Ver Lista, Editar, Eliminar, Cambiar Rol, Cambiar Contraseña (otro), Desactivar, Ver Permisos
- ✅ **Reportes**: Todos
- ✅ **Sincronización**: Google Drive, Supabase, MercadoLibre, OneDrive, Ver Historial
- ✅ **Configuración**: Editar Empresa, Editar Integraciones, Editar Permisos, Ver Auditoría, Ver Logs, Cambiar Idioma, Cambiar Tema
- ✅ **Seguridad**: Cambiar Contraseña, Activar 2FA, Ver Sesiones, Cerrar Sesiones

### Casos de Uso Típicos

#### 1. Crear nuevo usuario
```javascript
// Admin puede crear usuarios con cualquier rol
POST /api/usuarios
{
  "nombre": "Juan García",
  "email": "juan@example.com",
  "role": "vendedor",  // Puede asignar cualquier rol
  "contraseña": "secure_password"
}
```

#### 2. Cambiar configuración de empresa
```javascript
// Solo Admin puede editar empresa
PUT /api/configuracion/empresa
{
  "nombre": "Maya Autopartes S.A.",
  "nit": "900123456-7",
  "direccion": "Calle Principal 123"
}
```

#### 3. Ver logs de auditoría
```javascript
// Admin puede ver todos los accesos
GET /api/admin/auditoria?limit=100&offset=0
```

#### 4. Configurar integraciones
```javascript
// Solo Admin puede cambiar claves de API
PUT /api/configuracion/integraciones
{
  "google_drive": { "api_key": "..." },
  "supabase": { "url": "...", "key": "..." }
}
```

### Restricciones y Consideraciones
- ⚠️ **No se puede auto-eliminar**: Un Admin no puede eliminarse a sí mismo
- ⚠️ **Cambios auditable**: Todos los cambios de Admin se registran
- ⚠️ **Mínimo una cuenta**: Siempre debe haber al menos un Admin

### Duración Típica de Sesión
- 60 minutos (sin actividad)
- Requiere re-autenticación para cambios críticos

---

## Gerente 🟠 (Nivel 3)

**Nombre en Sistema**: `gerente`
**Color**: #f57c00 (Naranja)
**Nivel de Acceso**: 3 (Alto)

### Descripción General
El gerente es responsable de la operación diaria del negocio. Puede gestionar ventas, reportes, usuarios operativos y ver auditoría. No puede acceder a configuración crítica.

### Responsabilidades
- Gestión de ventas (crear, editar, aprobar, cancelar)
- Reportes y análisis de operaciones
- Gestión de vendedores (crear, editar, desactivar)
- Auditoria y control de acceso
- Sincronización de datos

### Recursos Accesibles
- ✅ **Ventas**: Crear, Ver, Editar, Eliminar, Aprobar, Cancelar, Exportar, Cambiar Vendedor, Cambiar Estado Pago
- ✅ **Almacén**: Ver, Crear Producto, Editar Producto, ❌ Eliminar, Actualizar Stock, Ver Costo, Importar, Exportar
- ✅ **Clientes**: Crear, Ver, Editar, Eliminar, Ver Crédito, Cambiar Crédito, Exportar
- ✅ **Usuarios**: Crear, Ver Lista, Editar, ❌ Eliminar, ❌ Cambiar Rol, ❌ Cambiar Contraseña (otro), Desactivar, Ver Permisos
- ✅ **Reportes**: Ventas, Inventario, Clientes, ❌ Usuarios, PDF, Excel, Filtros Avanzados
- ✅ **Sincronización**: Google Drive, Supabase, MercadoLibre, OneDrive, Ver Historial
- ❌ **Configuración**: ❌ Editar Empresa, ❌ Editar Integraciones, ❌ Editar Permisos, Ver Auditoría, ❌ Ver Logs, Cambiar Idioma, Cambiar Tema
- ✅ **Seguridad**: Cambiar Contraseña (propia), Activar 2FA, Ver Sesiones, ❌ Cerrar Sesiones (otros)

### Casos de Uso Típicos

#### 1. Crear venta
```javascript
// Gerente crea venta para cualquier vendedor
POST /api/ventas
{
  "cliente_id": 123,
  "vendedor_id": 456,  // Puede asignar a cualquiera
  "items": [...],
  "total": 1500.00
}
```

#### 2. Aprobar venta
```javascript
// Gerente puede aprobar ventas
PUT /api/ventas/789/aprobar
{
  "motivo_aprobacion": "Revisión completada"
}
```

#### 3. Ver reporte de ventas
```javascript
// Gerente genera reportes de operaciones
GET /api/reportes/ventas?fecha_inicio=2026-04-01&fecha_fin=2026-04-30
```

#### 4. Desactivar usuario
```javascript
// Gerente puede desactivar vendedores
PUT /api/usuarios/456/desactivar
{
  "motivo": "Cambio de personal"
}
```

### Restricciones
- ❌ No puede eliminar usuarios completamente
- ❌ No puede cambiar roles de otros usuarios
- ❌ No puede acceder a configuración de empresa
- ❌ No puede ver logs de sistema

---

## Vendedor 🟢 (Nivel 2)

**Nombre en Sistema**: `vendedor`
**Color**: #388e3c (Verde)
**Nivel de Acceso**: 2 (Medio)

### Descripción General
El vendedor es el usuario transaccional principal. Crea y gestiona sus propias ventas, consulta inventario y maneja clientes. No puede acceder a reportes globales ni administración.

### Responsabilidades
- Crear y editar sus propias ventas
- Consultar y actualizar inventario
- Crear y editar clientes
- Cancelar sus propias ventas
- Ver información de precios

### Recursos Accesibles
- ✅ **Ventas**: Crear, Ver (suyas), Editar (suyas), ❌ Eliminar, ❌ Aprobar, Cancelar (suyas), ❌ Exportar, ❌ Cambiar Vendedor, ❌ Cambiar Estado Pago
- ✅ **Almacén**: Ver, ❌ Crear Producto, ❌ Editar Producto, ❌ Eliminar, Actualizar Stock, ❌ Ver Costo, ❌ Importar, ❌ Exportar
- ✅ **Clientes**: Crear, Ver, Editar, ❌ Eliminar, ❌ Ver Crédito, ❌ Cambiar Crédito, ❌ Exportar
- ❌ **Usuarios**: Ninguno
- ❌ **Reportes**: Ninguno (No puede generar reportes)
- ❌ **Sincronización**: Ninguno
- ✅ **Configuración**: ❌ Editar Empresa, ❌ Editar Integraciones, ❌ Editar Permisos, ❌ Ver Auditoría, ❌ Ver Logs, Cambiar Idioma, Cambiar Tema
- ✅ **Seguridad**: Cambiar Contraseña (propia), Activar 2FA, Ver Sesiones (propia), ❌ Cerrar Sesiones

### Casos de Uso Típicos

#### 1. Crear venta
```javascript
// Vendedor crea venta (automáticamente suya)
POST /api/ventas
{
  "cliente_id": 123,
  // vendedor_id se asigna automáticamente del usuario actual
  "items": [
    { "producto_id": 456, "cantidad": 2, "precio": 100 }
  ],
  "total": 200.00
}
```

#### 2. Consultar inventario
```javascript
// Vendedor consulta productos disponibles
GET /api/almacen/productos?disponibles=true
```

#### 3. Crear cliente
```javascript
// Vendedor puede crear nuevos clientes
POST /api/clientes
{
  "nombre": "Juan García",
  "telefono": "123456789",
  "direccion": "Calle 123"
}
```

#### 4. Actualizar stock
```javascript
// Vendedor actualiza stock al vender
PUT /api/almacen/productos/456/stock
{
  "cantidad": -2,
  "razon": "Venta realizada"
}
```

### Restricciones
- ❌ No puede ver ventas de otros vendedores
- ❌ No puede editar ventas de otros
- ❌ No puede ver precios de costo
- ❌ No puede crear usuarios
- ❌ No puede generar reportes globales
- ❌ No puede configurar integraciones

---

## Viewer 🔵 (Nivel 1)

**Nombre en Sistema**: `viewer`
**Color**: #1976d2 (Azul)
**Nivel de Acceso**: 1 (Bajo - Solo lectura)

### Descripción General
El viewer tiene acceso de solo lectura a reportes y consultas. Perfecto para gerentes de otros departamentos que necesitan consultar información pero no pueden hacer cambios.

### Responsabilidades
- Consultar reportes de ventas
- Consultar inventario
- Consultar clientes
- Generar PDF y Excel
- Ver información histórica

### Recursos Accesibles
- ✅ **Ventas**: ❌ Crear, Ver (solo lectura), ❌ Editar, ❌ Eliminar, ❌ Aprobar, ❌ Cancelar, Exportar, ❌ Cambiar Vendedor, ❌ Cambiar Estado Pago
- ✅ **Almacén**: Ver, ❌ Crear Producto, ❌ Editar Producto, ❌ Eliminar, ❌ Actualizar Stock, ❌ Ver Costo, ❌ Importar, Exportar
- ✅ **Clientes**: ❌ Crear, Ver, ❌ Editar, ❌ Eliminar, ❌ Ver Crédito, ❌ Cambiar Crédito, Exportar
- ❌ **Usuarios**: Ninguno
- ✅ **Reportes**: Ver Ventas, Ver Inventario, Ver Clientes, ❌ Ver Usuarios, Generar PDF, Generar Excel, ❌ Filtros Avanzados
- ❌ **Sincronización**: Ninguno
- ✅ **Configuración**: ❌ Todo excepto Cambiar Idioma y Cambiar Tema
- ✅ **Seguridad**: Cambiar Contraseña (propia), Activar 2FA, Ver Sesiones (propia), ❌ Cerrar Sesiones

### Casos de Uso Típicos

#### 1. Ver reporte de ventas
```javascript
// Viewer consulta reportes (no puede cambiar)
GET /api/reportes/ventas?fecha_inicio=2026-04-01&fecha_fin=2026-04-30
```

#### 2. Exportar a PDF
```javascript
// Viewer puede exportar reportes
POST /api/reportes/exportar/pdf
{
  "tipo": "ventas",
  "fecha_inicio": "2026-04-01",
  "fecha_fin": "2026-04-30"
}
```

#### 3. Ver inventario
```javascript
// Viewer consulta inventario completo
GET /api/almacen/productos
// Nota: No ve el costo, solo datos públicos
```

### Restricciones
- ❌ No puede crear nada
- ❌ No puede editar nada
- ❌ No puede eliminar nada
- ❌ No puede cambiar estados de transacciones
- ❌ No puede ver información privada (costos, precios)
- ❌ No puede ver usuarios

---

## Comparación Rápida

| Capacidad | Admin | Gerente | Vendedor | Viewer |
|-----------|:-----:|:-------:|:--------:|:------:|
| **Crear Ventas** | ✅ | ✅ | ✅ (suyas) | ❌ |
| **Aprobar Ventas** | ✅ | ✅ | ❌ | ❌ |
| **Eliminar Ventas** | ✅ | ✅ | ❌ | ❌ |
| **Ver Reportes** | ✅ | ✅ | ❌ | ✅ |
| **Crear Usuarios** | ✅ | ✅ | ❌ | ❌ |
| **Cambiar Roles** | ✅ | ❌ | ❌ | ❌ |
| **Eliminar Usuarios** | ✅ | ❌ | ❌ | ❌ |
| **Ver Logs** | ✅ | ❌ | ❌ | ❌ |
| **Editar Config** | ✅ | ❌ | ❌ | ❌ |
| **Exportar** | ✅ | ✅ | ❌ | ✅ |

---

## Transiciones de Rol

### Promoción: Vendedor → Gerente
```javascript
// Precondiciones:
// - Mínimo 3 meses como vendedor
// - Al menos 50 ventas completadas
// - Evaluación positiva de supervisor

PUT /api/usuarios/456/rol
{
  "nuevo_rol": "gerente",
  "razon": "Promoción por rendimiento",
  "fecha_efectiva": "2026-05-01"
}
// ✅ Registrado en auditoría
// 📧 Notificación al usuario
// 🔄 Permisos se actualizan automáticamente
```

### Demoteion: Gerente → Vendedor
```javascript
// Precondiciones:
// - Solo Admin puede demover
// - Debe tener justificación
// - Notificación formal al usuario

PUT /api/usuarios/456/rol
{
  "nuevo_rol": "vendedor",
  "razon": "Cambio de puesto",
  "fecha_efectiva": "2026-05-01"
}
```

### Cambio a Admin
```javascript
// ⚠️ CRÍTICO - Solo Admin existente puede hacer esto
// Debe cumplir criterios de confianza máxima

PUT /api/usuarios/456/rol
{
  "nuevo_rol": "admin",
  "razon": "Nueva posición de administrador",
  "require_2fa": true,  // Requiere 2FA activado
  "require_approval": true  // Requiere aprobación
}
```

### Cambio a Viewer
```javascript
// Para personal de consultoría o auditoría externa

PUT /api/usuarios/456/rol
{
  "nuevo_rol": "viewer",
  "razon": "Acceso temporal para auditoría",
  "fecha_expiracion": "2026-06-30"  // Opcional: expira automáticamente
}
```

---

## 📋 Matriz de Cambio de Roles

| De / A | Admin | Gerente | Vendedor | Viewer |
|--------|:-----:|:-------:|:--------:|:------:|
| **Admin** | - | ✅ Demote | ✅ Demote | ✅ Demote |
| **Gerente** | ✅ Promote* | - | ✅ | ✅ |
| **Vendedor** | ✅ Promote* | ✅ Promote | - | ✅ |
| **Viewer** | ✅ Promote* | ✅ Promote | ✅ Promote | - |

*Requiere aprobación de otro Admin

---

## 🔐 Consideraciones de Seguridad por Rol

### Admin
- Requiere 2FA obligatorio
- Sesión máx. 60 minutos
- Todas las acciones registradas
- IP whitelist recomendada
- Contraseña cambio cada 90 días

### Gerente
- Requiere 2FA recomendado
- Sesión máx. 120 minutos
- Cambios de estado registrados
- Contraseña cambio cada 180 días

### Vendedor
- 2FA opcional
- Sesión máx. 480 minutos
- Creación de registros registrada
- Contraseña cambio cada 180 días

### Viewer
- 2FA opcional
- Sesión máx. 720 minutos
- Solo acceso de lectura (sin logging)

---

## 📞 Soporte y Preguntas

Para asignación de roles o cambios, contactar a:
- **Admin actual**: Puede cambiar cualquier rol
- **Gerente**: Puede crear vendedores/viewers
- **Otros**: No pueden cambiar roles

---

