# Activity Feed Component

Panel interactivo de "Actividad Reciente" para visualizar y auditar todos los cambios en el sistema.

## 📋 Características

- ✅ Visualización en tiempo real de eventos (CREATE, UPDATE, DELETE)
- ✅ Filtros por usuario, tabla, acción, fecha
- ✅ Búsqueda instantánea
- ✅ Paginación (50 eventos por página)
- ✅ Exportación a CSV
- ✅ Modal para ver detalles completos de cambios
- ✅ Auto-refresh cada 30 segundos
- ✅ Responsive design
- ✅ Compatible con todos los navegadores modernos

---

## 🚀 Instalación

### 1. Incluir en HTML

```html
<!-- En index.html -->
<div id="activity-feed"></div>

<!-- Importar el script -->
<script src="./frontend/audit/activity-feed.js"></script>
```

### 2. Inicializar en JavaScript

```javascript
// En main.js
import ActivityFeed from './frontend/audit/activity-feed.js';

const feed = new ActivityFeed({
  apiBaseUrl: '/api/audit',      // URL del API backend
  refreshInterval: 30000,         // Actualizar cada 30s
  pageSize: 50,                   // Eventos por página
  autoRefresh: true,              // Actualización automática
  containerId: 'activity-feed'    // ID del contenedor
});

await feed.init();
```

---

## 💻 Uso

### Uso Básico

```javascript
const feed = new ActivityFeed();
await feed.init();
```

### Con Opciones Personalizadas

```javascript
const feed = new ActivityFeed({
  apiBaseUrl: 'https://api.mayaautopartes.mx/api/audit',
  refreshInterval: 60000,  // Actualizar cada minuto
  pageSize: 100,           // 100 eventos por página
  autoRefresh: false,      // Sin actualización automática
  containerId: 'my-feed'   // ID del contenedor
});

await feed.init();
```

### Controlar Auto-refresh

```javascript
const feed = new ActivityFeed();

await feed.init();

// Detener actualización automática
feed.stopAutoRefresh();

// Reanudar
feed.startAutoRefresh();

// Actualizar manualmente
await feed.loadActivities();

// Limpiar al salir
feed.destroy();
```

---

## 🔍 API Methods

### Cargar actividades

```javascript
// Cargar con filtros
await feed.loadActivities();

// Manualmente aplicar filtros
feed.filters.usuario = 'omar@example.com';
feed.filters.tabla = 'ventas';
feed.currentPage = 0;
await feed.loadActivities();
```

### Obtener datos

```javascript
// Actividades cargadas actualmente
console.log(feed.activities);

// Total de registros
console.log(feed.totalRecords);

// Página actual
console.log(feed.currentPage);

// Filtros aplicados
console.log(feed.filters);
```

### Exportar

```javascript
// Exportar con filtros actuales
await feed.exportToCSV();

// Se descarga: audit_trail_2026-04-22.csv
```

---

## 🎨 Interfaz de Usuario

### Estructura

```
┌─────────────────────────────────────────────────┐
│ 📋 Actividad Reciente     [🔄] [📥]            │
├─────────────────────────────────────────────────┤
│ [Usuario...] [Tabla] [Acción] [Desde] [Hasta] │
├─────────────────────────────────────────────────┤
│ Total: 1,245 eventos      Página 1              │
├─────────────────────────────────────────────────┤
│ ✨ Omar creó venta           11:30am           │
│    CREATE | ventas | omar@mail.com             │
│                                                 │
│ ✏️ Juan actualizó stock      11:32am           │
│    UPDATE | almacen | juan@mail.com            │
│                                                 │
│ 🗑️ Admin eliminó usuario     11:35am           │
│    DELETE | usuarios | admin@mail.com          │
├─────────────────────────────────────────────────┤
│ [← Anterior] Página 1 de 25 [Siguiente →]      │
└─────────────────────────────────────────────────┘
```

### Iconos por Acción

| Acción | Icono | Color |
|--------|-------|-------|
| CREATE | ✨ | Verde |
| UPDATE | ✏️ | Amarillo |
| DELETE | 🗑️ | Rojo |
| READ | 👁️ | Azul |

---

## 📊 Ejemplos de Uso

### Ejemplo 1: Panel de administrador

```html
<!-- admin-dashboard.html -->
<div class="admin-container">
  <h1>Panel de Control</h1>
  
  <div id="activity-feed"></div>
</div>

<script type="module">
  import ActivityFeed from './frontend/audit/activity-feed.js';

  const feed = new ActivityFeed({
    containerId: 'activity-feed',
    pageSize: 100,
    autoRefresh: true
  });

  await feed.init();
</script>
```

### Ejemplo 2: Auditoría de usuario específico

```javascript
const feed = new ActivityFeed();
await feed.init();

// Filtrar por usuario
document.getElementById('filter-user-btn').addEventListener('click', () => {
  const usuario = prompt('Ingresar email de usuario:');
  if (usuario) {
    feed.filters.usuario = usuario;
    feed.currentPage = 0;
    feed.loadActivities();
  }
});
```

### Ejemplo 3: Exportar reporte mensual

```javascript
async function exportarReporteAbril() {
  const feed = new ActivityFeed();
  await feed.init();

  // Filtrar por período
  feed.filters.desde = '2026-04-01';
  feed.filters.hasta = '2026-04-30';
  feed.currentPage = 0;

  await feed.loadActivities();
  await feed.exportToCSV();  // Descargar CSV
}
```

### Ejemplo 4: Monitorear cambios en tiempo real

```javascript
const feed = new ActivityFeed({
  refreshInterval: 5000,  // Actualizar cada 5 segundos
  autoRefresh: true
});

await feed.init();

// Escuchar cambios
setInterval(() => {
  console.log(`Total eventos: ${feed.totalRecords}`);
  console.log(`Últimos eventos:`, feed.activities.slice(0, 5));
}, 30000);  // Log cada 30 segundos
```

---

## 🔗 Integración con API

### Endpoints requeridos

El componente espera estos endpoints en el backend:

```
GET /api/audit
GET /api/audit/export
```

### Query Parameters soportados

```
GET /api/audit?limit=50&offset=0&usuario=X&tabla=Y&accion=Z&desde=DATE&hasta=DATE
```

### Formato de respuesta esperado

```json
{
  "data": [
    {
      "id": "uuid",
      "usuario_id": "uuid",
      "usuario_email": "omar@example.com",
      "tabla": "ventas",
      "accion": "CREATE",
      "registro_id": "uuid",
      "timestamp": "2026-04-22T11:30:00Z",
      "valores_antes": null,
      "valores_despues": {
        "monto": 5000,
        "cliente": "Juan"
      },
      "cambios": null,
      "metadata": {
        "ip": "192.168.1.1",
        "user_agent": "Mozilla/5.0..."
      }
    }
  ],
  "total": 1245,
  "limit": 50,
  "offset": 0,
  "hasMore": true
}
```

---

## 🎯 Filtros

### Filtro por usuario

```javascript
// Escribir en input #af-filter-usuario
feed.filters.usuario = 'omar@example.com';
feed.currentPage = 0;
feed.loadActivities();
```

### Filtro por tabla

```javascript
feed.filters.tabla = 'ventas';
// Opciones: 'ventas', 'almacen', 'clientes', 'usuarios', 'facturas'
```

### Filtro por acción

```javascript
feed.filters.accion = 'UPDATE';
// Opciones: 'CREATE', 'UPDATE', 'DELETE', 'READ'
```

### Filtro por fecha

```javascript
feed.filters.desde = '2026-04-01';
feed.filters.hasta = '2026-04-30';
```

### Limpiar filtros

```javascript
// Botón UI: ✕ Limpiar
// O programáticamente:
feed.filters = {
  usuario: '',
  tabla: '',
  accion: '',
  desde: '',
  hasta: ''
};
feed.currentPage = 0;
feed.loadActivities();
```

---

## 📊 Modal de Detalles

Hacer click en un evento abre un modal con:

1. **Información General**
   - Usuario que realizó cambio
   - Tabla afectada
   - Acción (CREATE/UPDATE/DELETE)
   - Timestamp exacto
   - ID de registro

2. **Cambios Realizados** (para UPDATE)
   ```
   📌 monto
   Anterior: 5000
   Nuevo: 5500

   📌 estado
   Anterior: pendiente
   Nuevo: completada
   ```

3. **Datos Completos**
   - Valores antes (JSON)
   - Valores después (JSON)

---

## ⚙️ Opciones de Configuración

```javascript
{
  // URL base del API de auditoría
  apiBaseUrl: '/api/audit',

  // Intervalo de actualización (ms)
  refreshInterval: 30000,

  // Eventos por página
  pageSize: 50,

  // Activar actualización automática
  autoRefresh: true,

  // ID del contenedor HTML
  containerId: 'activity-feed'
}
```

---

## 🔐 Seguridad

- Los datos se obtienen del API backend (requiere autenticación)
- Los datos sensibles se mostran en modal (no en lista)
- CSV de exportación contiene todos los datos (usuario debe proteger archivo)
- Session storage para filtros (se borran al cerrar navegador)

---

## 🐛 Troubleshooting

### "Contenedor no encontrado"

```javascript
// Error: [ActivityFeed] Contenedor #activity-feed no encontrado

// Solución: Asegurar que existe en HTML
<div id="activity-feed"></div>
```

### "Error cargando actividades"

```javascript
// Verificar que API está accesible
curl http://localhost:5000/api/audit

// Verificar CORS si es en otra url
// Verificar autenticación (token JWT)
```

### "No hay actividades que mostrar"

```javascript
// Puede ser que:
// 1. Aún no hay eventos (crear alguno)
// 2. Filtros están muy restrictivos
// 3. Permisos RLS deniegan acceso

// Verificar sin filtros
feed.filters = { usuario: '', tabla: '', accion: '', desde: '', hasta: '' };
await feed.loadActivities();
```

### "Exportación vacía"

```javascript
// Asegurar que hay eventos para exportar
// Incrementar p_limit si es necesario (max 50000)
curl "http://localhost:5000/api/audit/export?limit=10000"
```

---

## 📱 Responsive Design

El componente es totalmente responsive:

- **Desktop:** Grilla de 5 columnas
- **Tablet:** Grilla de 2-3 columnas
- **Mobile:** Single column, lista apilada

```javascript
// El componente se adapta automáticamente
// No requiere configuración adicional
```

---

## 🚀 Performance

Optimizaciones implementadas:

- Paginación (no cargar todo de una vez)
- Índices en BD (búsquedas rápidas)
- Límite máximo 1000 registros por consulta
- Caché de 5 minutos en reportes
- Auto-refresh no bloquea interfaz

---

## 📚 Referencias

- **Backend:** `backend/routes/audit.js`
- **Clase AuditLogger:** `backend/logging/audit.js`
- **Documentación SQL:** `sql/audit_logs_setup.sql`
- **Guía de Integración:** `AUDIT_INTEGRATION_GUIDE.md`
- **Diseño Técnico:** `AUDIT_TRAIL_DESIGN.md`

---

## ✅ Checklist de Deployment

- [ ] Backend API accesible en `/api/audit`
- [ ] Tabla `audit_logs` creada en BD
- [ ] Triggers y funciones SQL en lugar
- [ ] Componente JS incluido en página
- [ ] Contenedor `#activity-feed` existe
- [ ] Autenticación JWT funcionando
- [ ] Tests de filtros pasando
- [ ] CSV export funciona
- [ ] Auto-refresh habilitado

---

## 📞 Soporte

Para problemas o preguntas:

1. Revisar esta documentación
2. Revisar logs del navegador (F12 → Console)
3. Revisar logs del backend
4. Verificar SQL en Supabase

---

**Versión:** 1.0.0  
**Última actualización:** 2026-04-22  
**Autor:** Maya Autopartes Compliance Team
