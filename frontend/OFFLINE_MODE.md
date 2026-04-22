# Offline Mode - Maya Autopartes

## 🌐 ¿Qué es Offline Mode?

Maya Autopartes puede funcionar completamente sin conexión a internet. Los cambios se guardan localmente y se sincronizan automáticamente cuando vuelve la conexión.

## 📊 Flujo de Operación

```
┌─────────────────────────────────────────────────────────────┐
│                     USUARIO EN APP                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
            ┌────────────────────┐
            │ ¿Hay conexión?     │
            └─────┬──────┬───────┘
                  │      │
        SÍ        │      │ NO
        ┌─────────┘      └─────────┐
        │                          │
        ▼                          ▼
    ┌────────┐            ┌──────────────┐
    │  API   │            │  Sync Queue  │
    │ Server │            │  (Local)     │
    │  Data  │            │   Cache      │
    └────────┘            └──────────────┘
        │                          │
        └───────────┬─────────────┘
                    │
                    ▼
            ┌──────────────────┐
            │   Render UI      │
            │  (Rápido, local) │
            └──────────────────┘
```

## 💾 Almacenamiento Local

### LocalStorage Keys

```javascript
// Cache de datos
'ma4_v_cache'       // Array de ventas
'ma4_a_cache'       // Array de productos
'ma4_c_cache'       // Array de clientes

// Autenticación
'maya_token'        // JWT token
'maya_user'         // Usuario actual (JSON)

// Sync Queue
'maya_sync_queue'   // Array de requests pendientes
```

### Tamaño Máximo

LocalStorage en navegadores modernos:
- **Chrome/Firefox/Edge:** ~10-50 MB
- **Safari:** ~5 MB
- **IE:** ~10 MB

Maya Autopartes debería ocupar max ~1-2 MB incluso con miles de registros.

## 🔄 Ciclo de Sync

### Cuando Estás Online

```
1. Usuario crea/edita/elimina dato
   ↓
2. Guardar en local cache (inmediato)
   ↓
3. Enviar a API en background
   ├─ OK? → Actualizar cache
   └─ Error? → Mantener en cache local
```

### Cuando Estás Offline

```
1. Usuario crea/edita/elimina dato
   ↓
2. Guardar en local cache (inmediato)
   ↓
3. Agregar a Sync Queue (para después)
   ↓
4. Mostrar "⚠ Offline - Cambios pendientes"
```

### Al Reconectar

```
1. Dispositivo detecta conexión
   ↓
2. syncQueue.sync() automáticamente
   ├─ Para cada request encolado:
   │  ├─ Intentar enviar
   │  ├─ Retry si falla (max 3 intentos)
   │  └─ Remover si OK
   │
3. Mostrar "✅ Sincronizado: X cambios"
   ├─ Si todos OK
   └─ O "⚠ Fallo: Y cambios pendientes"
```

## 🎯 Ejemplos de Uso

### Crear Venta Offline

```javascript
// 1. Usuario crea venta
const venta = {
  cliente: 'Taller García',
  total: 1500,
  fecha: '2024-04-22',
  responsable: 'Omar'
};

// 2. Guardar (automático con addVenta)
const result = await addVenta(venta);
// Con internet: Creada en servidor + local
// Sin internet: Solo en local, encolada

// 3. UI muestra:
// "Venta creada" (verde si online, amarillo si offline)

// 4. Si estaba offline y luego se conecta:
// -> Automáticamente se sincroniza
// -> Servidor recibe la venta
// -> Toast muestra "✅ Cambio guardado"
```

### Editar Venta Offline

```javascript
// 1. Usuario edita venta
await updateVenta(ventaId, { status: 'completada' });

// 2. Si está offline:
// ├─ Actualiza local
// ├─ Agrega a queue
// └─ Muestra "⚠ Offline - Cambios pendientes"

// 3. Al reconectar:
// ├─ Se sincroniza automáticamente
// └─ Muestra "✅ Cambios guardados"
```

### Crear Múltiples Registros Offline

```javascript
// Usuario está offline y crea 5 ventas

// Cada venta:
// 1. Se guarda en local (inmediato)
// 2. Se agrega a queue
// 3. UI muestra "5 cambios pendientes"

// Al conectarse:
// 1. syncQueue.sync() procesa los 5
// 2. Con retry: Si uno falla, lo reintenta hasta 3 veces
// 3. Muestra resultado: "✅ 5 sincronizados" o "⚠ 3 fallidos"
```

## ⚠️ Consideraciones Importantes

### Validación

Todos los datos se validan **antes** de agregar a la queue:

```javascript
// Esto valida primero
await addVenta({ cliente: '', total: -100 });
// ❌ Lanza error: "Cliente es obligatorio"
// No se agrega a queue

// Esto es válido
await addVenta({ cliente: 'Taller García', total: 100 });
// ✅ Se guarda + encola si offline
```

### Conflictos de Sincronización

Si dos dispositivos editan el mismo registro:

**Estrategia:** Last-write-wins (el servidor decide)

```javascript
// Dispositivo A (offline): edita venta 123 → status = 'completada'
// Dispositivo B (online): edita venta 123 → status = 'cancelada'

// Cuando A se conecta:
// → Envía su cambio
// → Servidor retorna 409 (conflicto) o lo sobrescribe
// → UI muestra advertencia

// Solución: Ver estado actual del servidor antes de editar
```

### Pérdida de Conexión Intermitente

Si pierde conexión **durante** una sincronización:

```javascript
// Retry automático con exponential backoff:
// Intento 1: espera 2 segundos
// Intento 2: espera 4 segundos
// Intento 3: espera 8 segundos
// Fallan todos? → Se mantiene en queue hasta próxima conexión
```

## 🛠️ APIs para Offline Mode

### Monitorear Estado

```javascript
// Estado de conexión
const status = apiClient.getConnectionStatus();
console.log(status);
// {
//   online: true,
//   authenticated: true,
//   user: { id: 1, email: 'user@maya.com' },
//   pendingRequests: 0,
//   queuedRequests: 2
// }

// Estado de sync
const syncStatus = syncQueue.getStatus();
console.log(syncStatus);
// {
//   queued: 2,
//   syncing: false,
//   online: true,
//   lastSync: 1713816000,
//   failedCount: 0,
//   nextRetryIn: null
// }

// Estado global
const globalStatus = getSyncStatus();
console.log(globalStatus);
// {
//   lastSync: 1713816000,
//   isSyncing: false,
//   error: null,
//   queuedChanges: { queued: 2 },
//   isOnline: true,
//   isAuthenticated: true
// }
```

### Escuchar Cambios

```javascript
// Conexión
apiClient.addListener(({ event }) => {
  if (event === 'online') console.log('✅ Online');
  if (event === 'offline') console.log('❌ Offline');
});

// Sync
syncQueue.onStatusChange(({ event, status }) => {
  if (event === 'syncStarted') console.log('📤 Sincronizando...');
  if (event === 'syncCompleted') console.log('✅ Sync OK');
  if (event === 'syncFailed') console.log('❌ Sync falló');
  if (event === 'requestQueued') console.log(`📋 En queue: ${status.queued}`);
  if (event === 'offline') console.log('⚠️ Offline detectado');
  if (event === 'online') console.log('✅ Reconectado');
});
```

### Administrar Queue

```javascript
// Ver requests pendientes
const queue = syncQueue.getQueue();
queue.forEach(req => {
  console.log(`${req.method} ${req.endpoint} (${req.retries} retries)`);
});

// Ver requests fallidos
const failed = syncQueue.getFailedRequests();
failed.forEach(req => {
  console.log(`❌ ${req.endpoint}: ${req.lastError}`);
});

// Reintentar uno fallido
await syncQueue.retryFailedRequest(failedRequestId);

// Sincronizar manualmente
const result = await syncQueue.sync();
console.log(`Sincronizados: ${result.synced}, Fallidos: ${result.failed}`);

// Limpiar queue
syncQueue.clearQueue();
syncQueue.clearFailed();
```

## 🎨 UI/UX para Offline

### Indicador de Conexión

```html
<div class="connection-badge" id="conn-badge">
  <span class="status-dot" id="status-dot"></span>
  <span class="status-text" id="status-text">Online</span>
  <span class="queue-info" id="queue-info" style="display:none;">
    • <span id="queue-count">0</span> cambios pendientes
  </span>
</div>

<style>
.connection-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.connection-badge.online {
  background: #e8f5e9;
  color: #2e7d32;
}

.connection-badge.offline {
  background: #fff3e0;
  color: #f57c00;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
</style>

<script>
// Actualizar estado
function updateConnectionBadge() {
  const badge = document.getElementById('conn-badge');
  const text = document.getElementById('status-text');
  const info = document.getElementById('queue-info');
  const count = document.getElementById('queue-count');
  
  if (apiClient.isOnline()) {
    badge.className = 'connection-badge online';
    text.textContent = 'Online';
  } else {
    badge.className = 'connection-badge offline';
    text.textContent = 'Offline';
  }
  
  const queuedCount = syncQueue.getStatus().queued;
  if (queuedCount > 0) {
    info.style.display = 'inline';
    count.textContent = queuedCount;
  } else {
    info.style.display = 'none';
  }
}

// Escuchar cambios
apiClient.addListener(() => updateConnectionBadge());
syncQueue.onStatusChange(() => updateConnectionBadge());

// Inicializar
updateConnectionBadge();
</script>
```

### Toast Notifications

```javascript
// Offline
toast('⚠️ Sin conexión - Los cambios se guardarán localmente');

// Guardando
toast('💾 Guardando...');

// Guardado offline
toast('✅ Guardado (offline - se sincronizará)');

// Sincronizando
toast('📤 Sincronizando cambios...');

// Sincronizado
toast('✅ Sincronizado con servidor');

// Error
toast('❌ Error: No se pudo sincronizar');
```

### Loading States

```html
<!-- Mientras carga de API -->
<div class="loading-spinner" id="table-spinner" style="display:none;">
  <div class="spinner"></div>
  <p>Cargando datos...</p>
</div>

<!-- Mientras sincroniza -->
<div class="sync-status" id="sync-status" style="display:none;">
  <span class="spinner-small"></span>
  <p>Sincronizando <span id="sync-count">0</span> cambios...</p>
</div>

<!-- Si offline se muestra con datos en caché -->
<div class="offline-banner" id="offline-banner" style="display:none;">
  <span>⚠️ Estás offline - Mostrando datos en caché</span>
</div>
```

## 🧪 Testing Offline Mode

### Simular Offline en DevTools

```javascript
// Chrome DevTools Console

// Ir offline
window.dispatchEvent(new Event('offline'));

// Ver estado
console.log(apiClient.isOnline()); // false
console.log(syncQueue.getStatus()); // { queued: 0, syncing: false, online: false }

// Crear venta (se encola)
await addVenta({ cliente: 'Test', total: 100 });

// Ver queue
console.log(syncQueue.getQueue()); // Array de 1 request

// Volver online
window.dispatchEvent(new Event('online'));

// Ver sincronización automática
console.log('Checked status after online event');
```

### Simular Pérdida de Conexión

```javascript
// En Chrome DevTools:
// 1. Abre Network tab
// 2. Click en throttle dropdown (arriba a la derecha)
// 3. Selecciona "Offline"
// 4. Intenta editar datos
// 5. Verifica que se encola
// 6. Selecciona "Online" nuevamente
// 7. Verifica que sincroniza automáticamente
```

### Test de Retry Logic

```javascript
// 1. Simular offline
window.dispatchEvent(new Event('offline'));

// 2. Crear datos
await addVenta({ cliente: 'Test1', total: 100 });
await addVenta({ cliente: 'Test2', total: 200 });

// 3. Ver queue
console.log(`Queued: ${syncQueue.getStatus().queued}`); // 2

// 4. Volver online
window.dispatchEvent(new Event('online'));

// 5. Esperar sync (automático en ~500ms)
setTimeout(() => {
  console.log(`After sync: ${syncQueue.getStatus().queued}`); // Debería ser 0
}, 1000);
```

## 📱 Mejores Prácticas

### Para Desarrolladores

1. **Siempre usar async/await**
   ```javascript
   const venta = await addVenta(data); // ✅ Correcto
   addVenta(data); // ❌ Incorrecto, no espera
   ```

2. **Validar datos antes de guardar**
   ```javascript
   try {
     await addVenta(data);
   } catch (error) {
     toast(`❌ ${error.message}`);
   }
   ```

3. **Mostrar indicadores de sync**
   ```javascript
   syncQueue.onStatusChange(({ event }) => {
     if (event === 'syncStarted') showSpinner();
     if (event === 'syncCompleted') hideSpinner();
   });
   ```

4. **Usar optimistic updates**
   ```javascript
   // Actualizar UI primero
   ventas.find(v => v.id === id).status = 'new';
   renderV();
   
   // Luego sincronizar
   updateVenta(id, { status: 'new' }).catch(error => {
     // Revertir si falla
     toast(`❌ ${error.message}`);
   });
   ```

### Para Usuarios

1. **Seguimiento de cambios**
   - Mira el indicador en la esquina: "Online" ✅ o "Offline" ⚠️
   - Si dice "Offline" y ves "5 cambios pendientes", no cierres la app

2. **Sincronización**
   - Los cambios se sincronizan automáticamente
   - No necesitas hacer click en "Sincronizar"
   - Si falla, espera unos segundos e intenta de nuevo

3. **Pérdida de datos**
   - Los datos se guardan localmente primero
   - Aunque pierdas conexión, los cambios no se pierden
   - Se sincronizarán cuando vuelva la conexión

## 🔗 Referencias

- [API Integration Guide](./API_INTEGRATION_GUIDE.md)
- [api-client.js](./api-client.js)
- [sync-queue.js](./sync-queue.js)
- [core.js - API functions](../core.js)
