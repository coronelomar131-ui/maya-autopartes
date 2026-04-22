# API Integration Guide - Maya Autopartes

## 📋 Overview

El frontend ahora está completamente integrado con el backend. Los datos se almacenan en el servidor (Supabase/PostgreSQL) y se cachean localmente para una UI rápida.

**Arquitectura:**
```
┌─────────────────────────────────────────────────────────┐
│                   Maya Autopartes UI                     │
│  (HTML + CSS + JavaScript - En el navegador)             │
└────────────────────┬────────────────────────────────────┘
                     │
     ┌───────────────┼───────────────┐
     ▼               ▼               ▼
┌─────────┐  ┌────────────┐  ┌──────────────┐
│ Cache   │  │ API Client │  │ Sync Queue   │
│ Local   │  │ (JWT Auth) │  │ (Offline)    │
└─────────┘  └────────────┘  └──────────────┘
     │               │               │
     └───────────────┼───────────────┘
                     │
              ┌──────▼──────┐
              │   Backend   │
              │ (Node.js +  │
              │ PostgreSQL/ │
              │ Supabase)   │
              └─────────────┘
```

## 🔌 Componentes

### 1. **api-client.js** (~450 líneas)
Cliente HTTP con autenticación JWT, retry logic y caching.

**Características:**
- ✅ Fetch wrapper con headers de JWT
- ✅ Retry automático con exponential backoff
- ✅ Caching local con TTL (5 min por defecto)
- ✅ Request deduplication
- ✅ Error handling robusto (401, 403, 422, 429, 500)
- ✅ Offline mode (cache stale)
- ✅ Event listeners para cambios de estado

**Uso:**
```javascript
// GET
const ventas = await apiClient.get('/ventas');

// POST
const newVenta = await apiClient.post('/ventas', {
  cliente: 'Taller García',
  total: 1500,
  fecha: '2024-04-22',
  responsable: 'Omar'
});

// PUT
await apiClient.put('/ventas/123', { status: 'completada' });

// DELETE
await apiClient.delete('/ventas/123');

// Autenticación
await apiClient.login('user@example.com', 'password');
apiClient.logout();

// Estado
const status = apiClient.getConnectionStatus();
// { online: true, authenticated: true, user: {...}, pendingRequests: 0, queuedRequests: 2 }
```

### 2. **sync-queue.js** (~350 líneas)
Gestor de cola de sincronización para modo offline.

**Características:**
- ✅ Encolar cambios cuando está offline
- ✅ Sincronizar automáticamente al reconectar
- ✅ Retry inteligente con exponential backoff
- ✅ Persistencia en localStorage
- ✅ Manejo de conflictos
- ✅ Priorización de requests

**Uso:**
```javascript
// Agregar a queue
syncQueue.add('POST', '/ventas', { cliente: 'X', total: 100 });

// Estado
const status = syncQueue.getStatus();
// { queued: 5, syncing: false, online: true, lastSync: 1713816000, failedCount: 0 }

// Listeners
syncQueue.onStatusChange(({ event, status }) => {
  if (event === 'syncCompleted') {
    console.log(`Synced ${status.synced} items`);
  }
});

// Requests fallidos
const failed = syncQueue.getFailedRequests();
syncQueue.retryFailedRequest(failedRequestId);
syncQueue.clearFailed();

// Limpieza
syncQueue.clearQueue();
```

### 3. **core.js** (Actualizado)
Capa de datos con API integration.

**Cambios principales:**
- ✅ `loadData()` ahora es async y carga desde API
- ✅ `sv()` sincroniza con API en background
- ✅ Nuevas funciones CRUD: `addVenta()`, `updateVenta()`, `deleteVenta()`
- ✅ Lo mismo para productos y clientes
- ✅ `getSyncStatus()` para monitorar estado

**Uso:**
```javascript
// Cargar datos al inicio
await loadData(); // Carga cache local, luego API en background

// Crear venta
const venta = await addVenta({
  cliente: 'Taller García',
  total: 1500,
  fecha: today(),
  responsable: 'Omar'
});

// Actualizar venta
await updateVenta(ventaId, { status: 'completada' });

// Eliminar venta
await deleteVenta(ventaId);

// Mismo para productos y clientes
await addProducto({ nombre: 'Amortiguador', precio: 250 });
await updateProducto(productId, { stock: 100 });
await deleteProducto(productId);

// Monitorear sync
const syncStatus = getSyncStatus();
// { 
//   lastSync: 1713816000,
//   isSyncing: false,
//   error: null,
//   queuedChanges: { queued: 2 },
//   isOnline: true,
//   isAuthenticated: true
// }
```

## 🔐 Autenticación (JWT)

### Setup Inicial

```javascript
// 1. Login
try {
  const response = await apiClient.login('user@maya.com', 'password123');
  console.log('Usuario:', response.user);
  // Token se guarda automáticamente en localStorage
} catch (error) {
  console.error('Error de login:', error.message);
}

// 2. Verificar autenticación
if (apiClient.isAuthenticated()) {
  console.log('Usuario:', apiClient.getCurrentUser());
}

// 3. Logout
apiClient.logout();
```

### Token Management

- **Almacenamiento:** localStorage (`maya_token`)
- **Refresh:** Automático si expira (el servidor retorna 401)
- **Headers:** `Authorization: Bearer {token}`

## 📊 Real-time Sync

### Estrategia de Cache

```
┌─────────────┐
│  API Call   │
└──────┬──────┘
       │
       ├─ Cache válido (< 5 min)?
       │  ├─ SÍ: Retornar cache
       │  └─ NO: Ir a servidor
       │
       ├─ Response OK?
       │  ├─ SÍ: Cachear + Retornar
       │  └─ NO: Ir a error handling
       │
       └─ ¿Offline y es GET?
          ├─ SÍ: Usar cache stale
          └─ NO: Encolar para después
```

### Cache TTL

Por defecto: **5 minutos** (configurable en `API_CONFIG.cacheExpiry`)

```javascript
// Usar cache específico
await apiClient.get('/ventas', { cacheTTL: 10 * 60 * 1000 }); // 10 min

// Saltarse cache
await apiClient.get('/ventas', { skipCache: true });

// Limpiar cache
apiClient.clearCache();
```

## 🔄 Offline Mode

### Qué pasa cuando está offline?

1. **GET requests:** Retorna cache stale (si existe)
2. **POST/PUT/DELETE:** Se encolan en `syncQueue`
3. **UI:** Muestra indicador de "Offline" + requests pendientes
4. **Al reconectar:** Sincroniza automáticamente

### Ejemplo de UI con Offline

```html
<!-- Indicador de conexión -->
<div id="connection-status">
  <span id="status-icon" class="online">●</span>
  <span id="status-text">Online</span>
  <span id="queue-count" style="display:none;">
    (<span id="queue-items">0</span> cambios pendientes)
  </span>
</div>

<script>
// Monitorear conexión
apiClient.addListener(({ event, data }) => {
  if (event === 'online') {
    document.getElementById('status-icon').className = 'online';
    document.getElementById('status-text').textContent = 'Online';
  } else if (event === 'offline') {
    document.getElementById('status-icon').className = 'offline';
    document.getElementById('status-text').textContent = 'Offline';
  }
});

// Monitorear queue
syncQueue.onStatusChange(({ status }) => {
  const queueCount = document.getElementById('queue-count');
  const queueItems = document.getElementById('queue-items');
  
  if (status.queued > 0) {
    queueCount.style.display = 'inline';
    queueItems.textContent = status.queued;
  } else {
    queueCount.style.display = 'none';
  }
});
</script>
```

## 🎯 Uso en UI.js

### Renderización con Loading

```javascript
// Antes (localStorage):
function renderV() {
  const data = filtV();
  // Renderizar inmediatamente
}

// Después (API + Cache):
async function renderV() {
  // Mostrar spinner mientras carga
  showSpinner('loading-ventas');
  
  try {
    // Cargar datos (del cache primero, luego API)
    const response = await apiClient.get('/ventas');
    ventas = response.data || ventas;
    
    // Renderizar tabla
    const data = filtV();
    document.getElementById('v-tb').innerHTML = data.map(v => /* ... */).join('');
    
    // Actualizar timestamps
    document.getElementById('last-sync').textContent = 
      `Sincronizado: ${new Date().toLocaleTimeString()}`;
  } catch (error) {
    showError(`Error cargando ventas: ${error.message}`);
  } finally {
    hideSpinner('loading-ventas');
  }
}

// Refrescar manualmente (skip cache)
async function refreshV() {
  return renderV();
}
```

### Optimistic Updates

```javascript
async function editV(id, newData) {
  // 1. Actualizar UI inmediatamente (optimistic)
  const oldData = findVentaById(id);
  Object.assign(oldData, newData);
  renderV();
  
  // 2. Enviar a servidor en background
  try {
    await updateVenta(id, newData);
    toast('✅ Cambio guardado');
  } catch (error) {
    // 3. Revertir si falla
    Object.assign(oldData, oldData);
    renderV();
    toast(`❌ ${error.message}`);
  }
}
```

## 🔧 Endpoints API Esperados

El backend debe implementar estos endpoints:

```
GET    /api/auth/me              - Usuario actual (requiere JWT)
POST   /api/auth/login           - Login
POST   /api/auth/refresh         - Refresh token

GET    /api/ventas               - Listar todas las ventas
POST   /api/ventas               - Crear venta
GET    /api/ventas/:id           - Obtener venta
PUT    /api/ventas/:id           - Actualizar venta
DELETE /api/ventas/:id           - Eliminar venta
PUT    /api/ventas/batch         - Actualizar múltiples (sync)

GET    /api/almacen              - Listar productos
POST   /api/almacen              - Crear producto
PUT    /api/almacen/:id          - Actualizar producto
DELETE /api/almacen/:id          - Eliminar producto
PUT    /api/almacen/batch        - Actualizar múltiples (sync)

GET    /api/clientes             - Listar clientes
POST   /api/clientes             - Crear cliente
PUT    /api/clientes/:id         - Actualizar cliente
DELETE /api/clientes/:id         - Eliminar cliente
PUT    /api/clientes/batch       - Actualizar múltiples (sync)

GET    /api/dashboard            - Estadísticas (ventas, almacén, etc)
```

## 📱 Configuración

### Cambiar Base URL

```javascript
// En api-client.js
const API_CONFIG = {
  baseURL: 'https://api.maya-autopartes.com',  // Cambiar aquí
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
  cacheExpiry: 5 * 60 * 1000,
  // ...
};
```

### Cambiar TTL de Cache

```javascript
// Global
API_CONFIG.cacheExpiry = 10 * 60 * 1000;  // 10 minutos

// Por request
await apiClient.get('/ventas', { cacheTTL: 1 * 60 * 1000 });  // 1 minuto
```

### Cambiar Retry Logic

```javascript
const API_CONFIG = {
  retryAttempts: 5,       // Intentos máximos
  retryDelay: 2000,       // Delay inicial (ms)
  // Con exponential backoff: 2s, 4s, 8s, 16s, 32s...
};
```

## 🐛 Debugging

### Logging

```javascript
// Ver todas las llamadas API
apiClient.addListener(({ event, data }) => {
  console.log(`🔄 ${event}:`, data);
});

// Ver estado de sync
syncQueue.onStatusChange(({ event, status }) => {
  console.log(`📊 Sync ${event}:`, status);
});

// Estado completo
console.log(apiClient.getConnectionStatus());
console.log(syncQueue.getStatus());
console.log(getSyncStatus());
```

### Simular Offline

```javascript
// En DevTools Console:

// Simular desconexión
window.dispatchEvent(new Event('offline'));

// Simular reconexión
window.dispatchEvent(new Event('online'));

// Ver queue
console.log(syncQueue.getQueue());

// Ver cache
console.log(apiClient.getCachedResponse('GET:/ventas'));
```

## ✅ Checklist de Implementación

- [ ] Incluir `api-client.js` en HTML
- [ ] Incluir `sync-queue.js` en HTML
- [ ] Actualizar `core.js` con nuevas funciones
- [ ] Actualizar `ui.js` para usar API en lugar de localStorage
- [ ] Implementar login/logout
- [ ] Implementar indicadores de sync/offline
- [ ] Implementar error handling
- [ ] Probar offline mode
- [ ] Configurar baseURL del backend
- [ ] Probar en producción

## 📚 Referencias

- [API Client Source](./api-client.js)
- [Sync Queue Source](./sync-queue.js)
- [Offline Mode Guide](./OFFLINE_MODE.md)
- Backend: Check `/backend/routes/` for endpoint implementations
