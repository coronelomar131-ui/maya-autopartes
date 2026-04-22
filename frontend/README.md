# Frontend - Maya Autopartes

## 📁 Estructura de archivos

```
frontend/
├── api-client.js                 # Cliente HTTP con JWT, retry, cache, offline
├── sync-queue.js                 # Gestor de cola para sincronización offline
├── API_INTEGRATION_GUIDE.md       # Guía completa de integración con API
├── OFFLINE_MODE.md                # Guía de modo offline y sync
├── integration-example.html       # Ejemplo interactivo de uso
└── README.md                      # Este archivo
```

## 🚀 Quick Start

### 1. Incluir los scripts en tu HTML

```html
<!-- ANTES de core.js y ui.js -->
<script src="./frontend/api-client.js"></script>
<script src="./frontend/sync-queue.js"></script>

<!-- Tus scripts existentes -->
<script src="./core.js"></script>
<script src="./ui.js"></script>
```

### 2. Configurar API base URL

En `api-client.js`, cambiar:

```javascript
const API_CONFIG = {
  baseURL: 'https://tu-api.com/api',  // ← Cambiar aquí
  timeout: 10000,
  retryAttempts: 3,
  // ...
};
```

### 3. Usar en tu código

```javascript
// Cargar datos (cache local primero, luego API)
await loadData();

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

// Monitorear sync
const status = getSyncStatus();
console.log(status);
// {
//   lastSync: 1713816000,
//   isSyncing: false,
//   queuedChanges: { queued: 0 },
//   isOnline: true
// }
```

## 🔌 Componentes

### api-client.js (~450 líneas)

Cliente HTTP robusto con:

- **Autenticación JWT** - Maneja login/logout y token refresh
- **Retry logic** - Reintentos automáticos con exponential backoff
- **Caching** - Cache local con TTL de 5 minutos (configurable)
- **Request deduplication** - No duplica requests idénticos
- **Error handling** - Manejo específico de 401, 403, 422, 429, 500
- **Offline mode** - Cache stale para GET, queue para mutaciones
- **Event listeners** - Notifica sobre cambios de estado

**API pública:**

```javascript
// CRUD
apiClient.get(endpoint, options)
apiClient.post(endpoint, data, options)
apiClient.put(endpoint, data, options)
apiClient.delete(endpoint, options)

// Autenticación
apiClient.login(email, password)
apiClient.logout()
apiClient.refreshToken()
apiClient.getCurrentUser()
apiClient.isAuthenticated()

// Cache
apiClient.clearCache()
apiClient.getCachedResponse(key)

// State
apiClient.isOnline()
apiClient.getConnectionStatus()

// Listeners
apiClient.addListener(callback)
apiClient.removeListener(callback)
```

### sync-queue.js (~350 líneas)

Gestor de cola para sincronización offline:

- **Encolar cambios offline** - POST/PUT/DELETE se encolan si estás offline
- **Sincronización automática** - Al reconectar se sincroniza automáticamente
- **Retry inteligente** - Reintentos con exponential backoff
- **Persistencia** - Los cambios se guardan en localStorage
- **Priorización** - Los requests se pueden priorizar
- **Monitoreo** - Estado de sync en tiempo real

**API pública:**

```javascript
// Queue management
syncQueue.add(method, endpoint, data, options)
syncQueue.remove(requestId)
syncQueue.getQueue()
syncQueue.getStatus()

// Synchronization
syncQueue.sync()
syncQueue.retrySyncRequest(requestId)

// Failed requests
syncQueue.getFailedRequests()
syncQueue.retryFailedRequest(requestId)
syncQueue.clearFailed()

// State
syncQueue.getStatus()

// Listeners
syncQueue.onStatusChange(callback)
```

### core.js (Actualizado)

Nuevas funciones de API integration:

```javascript
// Load
await loadData()  // Async, carga cache + API

// CRUD Ventas
await addVenta(venta)
await updateVenta(id, data)
await deleteVenta(id)

// CRUD Productos
await addProducto(producto)
await updateProducto(id, data)
await deleteProducto(id)

// CRUD Clientes
await addCliente(cliente)
await updateCliente(id, data)
await deleteCliente(id)

// Status
getSyncStatus()
```

## 📊 Arquitectura

### Cache Strategy

```
GET /api/ventas
    ↓
¿Cache válido (< 5 min)?
    ├─ SÍ → Retornar cache (inmediato)
    └─ NO → Ir a servidor
            ├─ OK? → Cachear + Retornar
            └─ Error?
                ├─ ¿Offline? → Cache stale
                └─ Error a UI
```

### Offline Strategy

```
Usuario edita dato
    ↓
¿Online?
    ├─ SÍ → Guardar local + Enviar API
    └─ NO → Guardar local + Encolar

[Al reconectar]
    ↓
syncQueue.sync()
    └─ Para cada request encolado:
        ├─ Intentar enviar
        ├─ Retry si falla (max 3)
        └─ Mostrar resultado
```

## 🔐 Autenticación

### Setup

```javascript
// 1. Login
const response = await apiClient.login('user@maya.com', 'password');
// Token se guarda en localStorage('maya_token')

// 2. Verificar
if (apiClient.isAuthenticated()) {
  const user = apiClient.getCurrentUser();
  console.log(user);
}

// 3. Logout
apiClient.logout();
// Token se elimina, cache se limpia
```

### Renovación automática

Si el token expira:
1. Backend retorna 401
2. apiClient detecta error
3. Automáticamente llama a `/auth/refresh`
4. Si falla → logout automático

## 📱 Offline Mode

### Qué pasa sin conexión

- **GET requests** → Retorna cache existente (stale)
- **POST/PUT/DELETE** → Se encolan para sincronizar después
- **UI** → Muestra indicador "Offline" + número de cambios pendientes
- **Al reconectar** → Sincroniza automáticamente

### Ejemplo

```javascript
// Usuario offline, crea venta
const venta = await addVenta({
  cliente: 'Test',
  total: 100
});
// → Se guarda en local
// → Se agrega a queue
// → UI muestra "⚠️ Offline - 1 cambio pendiente"

// [Usuario se conecta]
// → syncQueue.sync() automático
// → Venta se envía al servidor
// → UI muestra "✅ Sincronizado"
```

## 🎯 Indicadores de UI

### Indicador de conexión

```html
<div id="status-badge">
  <span class="status-dot"></span>
  <span id="status-text">Online</span>
  <span id="queue-info" style="display:none;">
    • <span id="queue-count">0</span> cambios pendientes
  </span>
</div>

<script>
apiClient.addListener(() => {
  const status = apiClient.isOnline();
  const badge = document.getElementById('status-badge');
  badge.className = status ? 'online' : 'offline';
});

syncQueue.onStatusChange(({ status }) => {
  if (status.queued > 0) {
    document.getElementById('queue-info').style.display = 'inline';
    document.getElementById('queue-count').textContent = status.queued;
  }
});
</script>
```

## 🧪 Testing

### Ejemplo de test interactivo

Abre `integration-example.html` en el navegador. Tiene:

- Monitor de conexión en tiempo real
- Estadísticas de datos
- Tests de API (GET, POST)
- Operaciones CRUD
- Simulador de offline
- Console log integrada

### Simular offline en DevTools

```javascript
// Chrome Console:

// Ir offline
window.dispatchEvent(new Event('offline'));

// Ver estado
console.log(apiClient.isOnline());  // false
console.log(syncQueue.getStatus()); // { queued: 0, online: false }

// Crear datos
await addVenta({ cliente: 'Test', total: 100 });

// Ver queue
console.log(syncQueue.getQueue()); // [request pending]

// Volver online
window.dispatchEvent(new Event('online'));

// Ver sincronización
// → Automáticamente se sincroniza
```

## 📋 Endpoints esperados

El backend debe implementar:

```
Autenticación
POST   /api/auth/login              { email, password }
POST   /api/auth/refresh            (requiere JWT)
GET    /api/auth/me                 (requiere JWT)

Ventas
GET    /api/ventas                  (requiere JWT)
POST   /api/ventas                  (requiere JWT)
GET    /api/ventas/:id              (requiere JWT)
PUT    /api/ventas/:id              (requiere JWT)
DELETE /api/ventas/:id              (requiere JWT)
PUT    /api/ventas/batch            Batch sync

Almacén
GET    /api/almacen                 (requiere JWT)
POST   /api/almacen                 (requiere JWT)
GET    /api/almacen/:id             (requiere JWT)
PUT    /api/almacen/:id             (requiere JWT)
DELETE /api/almacen/:id             (requiere JWT)
PUT    /api/almacen/batch           Batch sync

Clientes
GET    /api/clientes                (requiere JWT)
POST   /api/clientes                (requiere JWT)
GET    /api/clientes/:id            (requiere JWT)
PUT    /api/clientes/:id            (requiere JWT)
DELETE /api/clientes/:id            (requiere JWT)
PUT    /api/clientes/batch          Batch sync

Otros
GET    /api/dashboard               (requiere JWT)
```

## ⚙️ Configuración

### API_CONFIG

En `api-client.js`:

```javascript
const API_CONFIG = {
  baseURL: 'http://localhost:3000/api',     // ← Cambiar
  timeout: 10000,                            // Timeout en ms
  retryAttempts: 3,                          // Max reintentos
  retryDelay: 1000,                          // Delay inicial
  cacheExpiry: 5 * 60 * 1000,                // TTL cache
  tokenStorageKey: 'maya_token',
  userStorageKey: 'maya_user',
  requestQueueKey: 'maya_request_queue'
};
```

### SYNC_CONFIG

En `sync-queue.js`:

```javascript
const SYNC_CONFIG = {
  storageKey: 'maya_sync_queue',
  maxRetries: 3,                             // Max reintentos
  retryDelay: 2000,                          // Delay inicial
  retryBackoff: 2,                           // Multiplicador exponencial
  maxQueueSize: 100,                         // Max items en queue
  persistInterval: 1000                      // Guardar cada 1s
};
```

## 🐛 Debugging

### Logging

```javascript
// Ver todas las llamadas API
apiClient.addListener(({ event, data }) => {
  console.log(`API: ${event}`, data);
});

// Ver sync events
syncQueue.onStatusChange(({ event, status }) => {
  console.log(`Sync: ${event}`, status);
});

// Estado completo
console.log(apiClient.getConnectionStatus());
console.log(syncQueue.getStatus());
console.log(getSyncStatus());
```

### Storage inspection

```javascript
// Ver localStorage
localStorage.getItem('maya_token');      // JWT
localStorage.getItem('maya_user');       // Usuario
localStorage.getItem('maya_sync_queue'); // Queue
localStorage.getItem('ma4_v_cache');     // Ventas
localStorage.getItem('ma4_a_cache');     // Productos
localStorage.getItem('ma4_c_cache');     // Clientes
```

## 📚 Documentación

- [API Integration Guide](./API_INTEGRATION_GUIDE.md) - Guía completa
- [Offline Mode Guide](./OFFLINE_MODE.md) - Modo offline detallado
- [Integration Example](./integration-example.html) - Demo interactiva

## ✅ Checklist

- [ ] Incluir `api-client.js` en HTML
- [ ] Incluir `sync-queue.js` en HTML
- [ ] Configurar `baseURL` en `api-client.js`
- [ ] Implementar endpoints en backend
- [ ] Probar login/logout
- [ ] Probar GET/POST/PUT/DELETE
- [ ] Probar offline mode
- [ ] Probar sync al reconectar
- [ ] Implementar UI indicators
- [ ] Deployer en producción

## 🔗 Referencias

- [Backend API Docs](../backend/API.md)
- [Core.js Functions](../core.js)
- [UI.js](../ui.js)
