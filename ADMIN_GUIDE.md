# Admin Panel - Guía Completa

## 📋 Índice
1. [Descripción General](#descripción-general)
2. [Acceso y Permisos](#acceso-y-permisos)
3. [Gestión de Usuarios](#gestión-de-usuarios)
4. [Asignación de Roles](#asignación-de-roles)
5. [Activity Log](#activity-log)
6. [Analytics y KPIs](#analytics-y-kpis)
7. [Endpoints API](#endpoints-api)
8. [Troubleshooting](#troubleshooting)

---

## Descripción General

El **Admin Panel** es una interfaz ejecutiva centralizada para gestionar:
- **Usuarios**: CRUD completo, estados y permisos
- **Roles**: Asignación y cambio de roles por usuario
- **Actividad**: Registro auditable de todas las operaciones
- **Analytics**: KPIs, estadísticas y métricas en tiempo real

### Características Principales
✅ Usuarios (crear, editar, eliminar, desactivar)
✅ Roles dinámicos (Admin, Supervisor, Vendedor, Bodeguero, Cliente)
✅ Activity Log completo (últimos 30 días)
✅ KPIs en tiempo real (ventas, usuarios, productos, clientes)
✅ Exportación de logs a CSV
✅ Búsqueda y filtrado avanzado
✅ Responsive design (desktop y mobile)

---

## Acceso y Permisos

### ¿Quién puede acceder?
**Solo usuarios con rol `admin`** pueden acceder al Admin Panel.

### Cómo verificar el rol
```javascript
// En el navegador (consola)
localStorage.getItem('userRole')
// Debe retornar "admin"
```

### Estructura de Rutas
```
/admin
├── /admin/users       → Gestión de usuarios
├── /admin/roles       → Asignación de roles
├── /admin/activity    → Activity log
└── /admin/stats       → Analytics
```

---

## Gestión de Usuarios

### Crear Usuario

1. **Ir a**: Admin Panel → Usuarios
2. **Click en**: "+ Nuevo Usuario"
3. **Completar**:
   - Email (único)
   - Nombre Completo
   - Contraseña (mínimo 8 caracteres, 1 mayúscula, 1 número)
   - Rol (opcional)
4. **Click**: "Crear Usuario"

#### Validaciones
- ✅ Email válido y único
- ✅ Contraseña > 8 caracteres
- ✅ Contraseña con mayúsculas y números
- ✅ Nombre mínimo 2 caracteres

### Editar Usuario

1. **Ir a**: Usuarios
2. **En la fila del usuario**: Click "✏️ Editar"
3. **Cambiar**: Nombre, Estado (Activo/Inactivo), Rol
4. **Click**: "Guardar Cambios"

### Eliminar Usuario

1. **Abrir** modal de edición del usuario
2. **Click**: "Eliminar Usuario"
3. **Confirmar** en el diálogo

### Reset de Contraseña

1. **En la fila del usuario**: Click "🔑 Reset"
2. **Usuario recibirá** email con link de reset
3. **Podrá crear** nueva contraseña

### Búsqueda y Filtrado

- **Búsqueda**: Por nombre o email
- **Filtro de Estado**: Activo/Inactivo
- **Resultado**: En tiempo real, sin recargar

---

## Asignación de Roles

### Roles Disponibles

| Rol | Descripción | Permisos |
|-----|-------------|----------|
| **Admin** 👑 | Acceso completo al sistema | Todo |
| **Supervisor** 🔍 | Supervisión y reportes | Ver todo, sin crear |
| **Vendedor** 💼 | Crear y gestionar ventas | Ventas, clientes |
| **Bodeguero** 📦 | Gestión de almacén | Almacén, inventario |
| **Cliente** 🛍️ | Compra y consulta | Productos, historial |
| **Sin Rol** | Usuario sin permisos específicos | Lectura solo |

### Cambiar Rol de Usuario

**Opción 1: Desde Tab de Roles**
1. **Ir a**: Admin → Roles
2. **En la sección del rol actual**: Click "Editar"
3. **Seleccionar nuevo rol** en dropdown
4. **Confirmar** el cambio

**Opción 2: Desde Edición de Usuario**
1. **Ir a**: Usuarios → "✏️ Editar"
2. **Cambiar rol** en select "Rol"
3. **Guardar Cambios**

### Visualización por Rol

Cada rol se muestra en una tarjeta separada:
- **Admin**: Orange
- **Supervisor**: Blue
- **Vendedor**: Green
- **Bodeguero**: Purple
- **Cliente**: Gray

---

## Activity Log

### Visualización de Logs

**Ir a**: Admin → Actividad

Muestra los últimos **500 eventos** de los últimos **30 días**.

### Información Registrada

```
Timestamp      | Usuario    | Evento      | Descripción
2026-04-22     | juan@...   | login       | Inicio de sesión
2026-04-22     | maria@...  | create      | Crear producto
2026-04-22     | admin@...  | update_user | Cambiar rol
2026-04-22     | sistema    | delete      | Eliminar venta
```

### Eventos Rastreados

| Evento | Descripción |
|--------|-------------|
| `login` | Inicio de sesión |
| `logout` | Cierre de sesión |
| `create` | Crear recurso |
| `update` | Actualizar recurso |
| `delete` | Eliminar recurso |
| `change_role` | Cambio de rol de usuario |
| `reset_password` | Reset de contraseña |

### Filtros

- **Tipo de Evento**: login, logout, create, update, delete
- **Usuario**: Buscar por email del usuario
- **Período**: Últimos 30 días (configurable en backend)

### Exportar Log

1. **Click**: "📥 Exportar Log"
2. **Se descarga** archivo `activity-log-YYYY-MM-DD.csv`
3. **Abrir en**: Excel, Google Sheets, etc.

---

## Analytics y KPIs

### KPIs en Tiempo Real

```
┌─────────────────────────────────────────┐
│ Ventas Totales      $125,450.00   ↑ 8%  │
│ Usuarios Activos    45            ↑ 5%  │
│ Productos           287           → 0%  │
│ Clientes Registr.   156           ↑ 3%  │
└─────────────────────────────────────────┘
```

### Gráficos y Visualizaciones

#### 1. Ventas por Período
- Muestra tendencia de ventas en últimos 30 días
- Identifica picos de demanda
- Proyecta tendencias

#### 2. Usuarios Activos
- Número de usuarios online ahora
- Usuarios activos en últimas 24h
- Tendencia semanal

#### 3. Productos Stock Bajo
- Lista productos con stock < 10 unidades
- Prioridad para reabastecer
- Cantidad disponible

#### 4. Top 5 Vendedores
- Ranking por ventas
- Monto total por vendedor
- Performance relativo

### Métricas Detalladas

| Métrica | Cálculo | Período |
|---------|---------|---------|
| Promedio por Venta | Total Ventas / Qty Ventas | Hoy |
| Tasa de Conversión | Clientes / Visitantes | Mes |
| Stock Bajo | Productos < 10 | Ahora |
| Usuarios Online | Conectados actualmente | Ahora |

---

## Endpoints API

### Base URL
```
/api/admin
```

### GET /api/admin/users
**Obtener todos los usuarios**

```bash
curl -H "Authorization: Bearer TOKEN" \
  /api/admin/users?page=1&limit=50
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "nombre": "Juan Pérez",
      "role": "vendedor",
      "activo": true,
      "created_at": "2026-04-22T10:00:00Z"
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

### POST /api/admin/users
**Crear nuevo usuario**

```bash
curl -X POST -H "Content-Type: application/json" \
  -d '{
    "email": "nuevo@example.com",
    "nombre": "Carlos López",
    "password": "Secure123",
    "role": "vendedor"
  }' \
  /api/admin/users
```

### PUT /api/admin/users/:id
**Actualizar usuario**

```bash
curl -X PUT -H "Content-Type: application/json" \
  -d '{
    "nombre": "Nuevo Nombre",
    "activo": true,
    "role": "supervisor"
  }' \
  /api/admin/users/user-uuid
```

### PUT /api/admin/users/:id/role
**Cambiar rol**

```bash
curl -X PUT -H "Content-Type: application/json" \
  -d '{"role": "admin"}' \
  /api/admin/users/user-uuid/role
```

### DELETE /api/admin/users/:id
**Eliminar usuario**

```bash
curl -X DELETE \
  /api/admin/users/user-uuid
```

### POST /api/admin/users/:id/reset-password
**Enviar reset de contraseña**

```bash
curl -X POST \
  /api/admin/users/user-uuid/reset-password
```

### GET /api/admin/logs
**Obtener activity logs**

```bash
curl -H "Authorization: Bearer TOKEN" \
  /api/admin/logs?limit=500&days=30
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "log-uuid",
      "event_type": "login",
      "usuario_email": "user@example.com",
      "tabla": "usuarios",
      "descripcion": "login en usuarios",
      "timestamp": "2026-04-22T10:15:30Z",
      "detalles": {}
    }
  ]
}
```

### GET /api/admin/stats
**Obtener estadísticas**

```bash
curl -H "Authorization: Bearer TOKEN" \
  /api/admin/stats
```

**Response:**
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

## Troubleshooting

### Error: "No autorizado"
```
❌ Error: 403 - No autorizado
```

**Causa**: Usuario no tiene rol `admin`

**Solución**:
1. Solicitar al administrador cambiar tu rol
2. Verificar en Supabase que tu usuario tenga `role = 'admin'`

### Error: "Email ya existe"
```
❌ Error: 400 - Email ya existe
```

**Causa**: Intentas crear usuario con email duplicado

**Solución**:
1. Usar email diferente
2. O editar usuario existente

### Error: "Contraseña débil"
```
❌ Error: 400 - Contraseña debe contener mayúscula y número
```

**Causa**: Contraseña no cumple requisitos

**Requisitos válidos**:
- ✅ Mínimo 8 caracteres
- ✅ Al menos 1 mayúscula
- ✅ Al menos 1 número

### Activity Log no muestra datos
```
⚠ Sin registro de actividad
```

**Causa**: No hay eventos en los últimos 30 días

**Solución**:
1. Verificar que se hayan hecho operaciones
2. Revisar logs en Supabase directamente
3. Aumentar rango de días en filtros

### Estadísticas con valores 0
```
💡 Métricas muestran 0 o valores incorrectos
```

**Causa**: Base de datos vacía o sin datos recientes

**Solución**:
1. Realizar operaciones (crear ventas, usuarios, etc.)
2. Esperar a que se sincronicen los datos
3. Recargar la página (F5)

### API retorna 500
```
❌ Error 500 - Internal Server Error
```

**Solución**:
1. Verificar logs del servidor
2. Confirmar conexión a Supabase
3. Verificar permisos en Supabase RLS

---

## Mejores Prácticas

### Seguridad
1. ✅ Cambiar contraseñas regularmente
2. ✅ Auditar activity log semanalmente
3. ✅ Revisar permisos de roles mensualmente
4. ✅ Eliminar usuarios inactivos

### Gestión de Usuarios
1. ✅ Crear usuarios con rol específico
2. ✅ Cambiar rol según responsabilidades
3. ✅ Desactivar en lugar de eliminar (preserva auditoría)
4. ✅ Usar nombres descriptivos

### Monitoreo
1. ✅ Revisar KPIs diariamente
2. ✅ Exportar logs mensualmente
3. ✅ Analizar tendencias en ventas
4. ✅ Alertar sobre stock bajo

---

## Soporte

### Contacto
- **Email**: admin@mayaautopartes.com
- **Teléfono**: +52 (XXX) XXX-XXXX
- **Horario**: Lunes-Viernes, 9AM-6PM

### Documentación Relacionada
- [AUTH_FLOW.md](AUTH_FLOW.md) - Flujo de autenticación
- [RBAC_IMPLEMENTATION.md](RBAC_IMPLEMENTATION.md) - Sistema de roles
- [AUDIT_TRAIL_DESIGN.md](AUDIT_TRAIL_DESIGN.md) - Activity logs
- [API.js](api.js) - Integraciones API

---

**Última actualización**: 2026-04-22
**Versión Admin Panel**: 1.0.0
**Estado**: ✅ Producción
