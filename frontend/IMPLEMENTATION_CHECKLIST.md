# Frontend API Integration - Implementation Checklist

## ✅ Completado

### 1. Archivos creados

- [x] **api-client.js** (450 líneas)
  - Fetch wrapper con headers JWT
  - Retry logic con exponential backoff
  - Caching local con TTL
  - Error handling robusto
  - Request deduplication
  - Event listeners

- [x] **sync-queue.js** (350 líneas)
  - Queue manager para offline mode
  - Sincronización automática
  - Retry inteligente
  - Persistencia en localStorage
  - Priorización de requests
  - Failed request management

- [x] **core.js** (Actualizado)
  - `loadData()` ahora es async
  - `sv()` sincroniza con API
  - CRUD functions: `addVenta()`, `updateVenta()`, `deleteVenta()`
  - Mismo para productos y clientes
  - `getSyncStatus()` para monitoreo
  - Cache local + API integration

### 2. Documentación

- [x] **API_INTEGRATION_GUIDE.md**
  - Overview de arquitectura
  - Documentación de api-client.js
  - Documentación de sync-queue.js
  - Uso en core.js
  - Autenticación JWT
  - Real-time sync
  - Offline mode
  - Endpoints esperados
  - Configuración

- [x] **OFFLINE_MODE.md**
  - Explicación de offline mode
  - Ciclo de sync
  - Ejemplos de uso
  - Consideraciones importantes
  - APIs para offline
  - UI/UX best practices
  - Testing guide

- [x] **README.md** (Frontend)
  - Quick start
  - Estructura de archivos
  - Documentación de componentes
  - Arquitectura
  - Autenticación
  - Offline mode
  - Indicadores UI
  - Testing
  - Endpoints
  - Configuración
  - Debugging

### 3. Ejemplos

- [x] **integration-example.html**
  - Demo interactiva
  - Real-time status monitoring
  - API tests
  - CRUD operations
  - Offline simulation
  - Console log integrada
  - Queue monitor

## 🔧 Próximos pasos (Para implementador)

### Paso 1: Setup básico

```html
<!-- En tu index.html -->
<script src="./frontend/api-client.js"></script>
<script src="./frontend/sync-queue.js"></script>
<script src="./core.js"></script>
<script src="./ui.js"></script>
```

### Paso 2: Configurar API

En `api-client.js`, línea ~20:

```javascript
const API_CONFIG = {
  baseURL: 'http://localhost:3000/api',  // ← CAMBIAR A TU URL
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
  cacheExpiry: 5 * 60 * 1000,
  // ... resto de config
};
```

### Paso 3: Implementar endpoints backend

Ver sección "Endpoints esperados" en API_INTEGRATION_GUIDE.md:

Mínimo requerido:
- `POST /auth/login` - Retorna { token, user }
- `GET /ventas` - Retorna { data: [...] }
- `POST /ventas` - Crea venta
- `PUT /ventas/:id` - Actualiza venta
- `DELETE /ventas/:id` - Elimina venta
- Ídem para /almacen y /clientes

### Paso 4: Actualizar UI

En tu `ui.js` o donde renderices:

**Antes (localStorage):**
```javascript
function renderV() {
  const data = filtV();
  // Renderizar tabla
}
```

**Después (API):**
```javascript
async function renderV() {
  showSpinner('loading-ventas');
  try {
    // Cargar de API (o cache si está offline)
    const response = await apiClient.get('/ventas');
    if (response?.data) {
      ventas = response.data;
    }
    
    // Renderizar tabla
    const data = filtV();
    document.getElementById('v-tb').innerHTML = data.map(v => /* ... */).join('');
    
  } catch (error) {
    showError(`Error: ${error.message}`);
  } finally {
    hideSpinner('loading-ventas');
  }
}
```

### Paso 5: Agregar indicador de conexión

```html
<div class="connection-badge" id="status-badge">
  <span class="status-dot" id="status-dot"></span>
  <span id="status-text">Online</span>
  <span id="queue-info" style="display:none;">
    • <span id="queue-count">0</span> cambios
  </span>
</div>

<script>
// Monitorear estado
function updateStatus() {
  const online = apiClient.isOnline();
  const queued = syncQueue.getStatus().queued;
  
  const badge = document.getElementById('status-badge');
  badge.className = online ? 'online' : 'offline';
  document.getElementById('status-text').textContent = online ? 'Online' : 'Offline';
  
  const info = document.getElementById('queue-info');
  if (queued > 0) {
    info.style.display = 'inline';
    document.getElementById('queue-count').textContent = queued;
  } else {
    info.style.display = 'none';
  }
}

apiClient.addListener(updateStatus);
syncQueue.onStatusChange(updateStatus);
setInterval(updateStatus, 1000);
</script>
```

### Paso 6: Actualizar operaciones CRUD

**Antes (localStorage):**
```javascript
function addV() {
  const venta = { cliente, total, ... };
  ventas.push(venta);
  sv();  // Guardar localStorage
  renderV();
}
```

**Después (API):**
```javascript
async function addV() {
  try {
    const venta = { cliente, total, ... };
    const result = await addVenta(venta);  // Usa nueva función
    renderV();
    toast('✅ Venta creada');
  } catch (error) {
    toast(`❌ ${error.message}`);
  }
}
```

### Paso 7: Probar todo

1. **Test online:**
   - Abre app
   - Crea venta
   - Verifica que se guarda en servidor
   - Recarga página, data persiste

2. **Test offline:**
   - En DevTools → Network → Offline
   - Crea venta
   - Verifica "⚠️ Offline - 1 cambio pendiente"
   - Vuelve a Online
   - Verifica sincronización automática

3. **Test retry:**
   - Desconecta internet
   - Crea 3 ventas
   - Conecta después de 10s
   - Verifica que todas se sincronizan

## 📊 Arquitectura de archivos

```
maya-autopartes-working/
├── frontend/
│   ├── api-client.js                  # ✅ Nuevo - Cliente HTTP
│   ├── sync-queue.js                  # ✅ Nuevo - Sync offline
│   ├── API_INTEGRATION_GUIDE.md        # ✅ Nuevo - Guía
│   ├── OFFLINE_MODE.md                # ✅ Nuevo - Offline guide
│   ├── README.md                      # ✅ Nuevo - Frontend docs
│   ├── integration-example.html        # ✅ Nuevo - Demo
│   ├── IMPLEMENTATION_CHECKLIST.md     # ✅ Este archivo
│   ├── realtime-client.js              # Existente
│   ├── monitoring/
│   │   └── sentry-client.js            # Existente
│   ├── rbac/
│   │   └── permissions.js              # Existente
│   ├── auth/
│   │   └── auth-client.js              # Existente
│   └── audit/
│       └── activity-feed.js            # Existente
│
├── core.js                             # ✅ Actualizado - API functions
├── ui.js                               # ⏳ Requiere update
├── main.js                             # ⏳ Requiere update
├── index.html                          # ⏳ Requiere update
│
└── backend/
    ├── routes/
    │   ├── auth.js                     # ⏳ Implementar POST /login, POST /refresh
    │   ├── ventas.js                   # ⏳ Implementar CRUD + batch
    │   ├── almacen.js                  # ⏳ Implementar CRUD + batch
    │   └── clientes.js                 # ⏳ Implementar CRUD + batch
    └── ...
```

## 🔐 Seguridad

Verificar que:

- [ ] API requiere JWT en headers Authorization
- [ ] JWT expira y se puede renovar
- [ ] 401 fuerza logout automático
- [ ] 403 muestra "No tienes permiso"
- [ ] HTTPS en producción
- [ ] CORS configurado correctamente
- [ ] Rate limiting para prevenir abuse
- [ ] Validación en servidor (no confiar en cliente)

## 🧪 Testing

### Manual
- [ ] Probar login/logout
- [ ] Crear/editar/eliminar en cada tabla
- [ ] Offline mode funciona
- [ ] Sync automático al reconectar
- [ ] Error handling muestra mensajes claros

### Automatizado (Recomendado)

```javascript
// En tests/integration.test.js
describe('API Integration', () => {
  test('Login stores token', async () => {
    await apiClient.login('user@test.com', 'pass');
    expect(localStorage.getItem('maya_token')).toBeTruthy();
  });

  test('Offline queue works', async () => {
    window.dispatchEvent(new Event('offline'));
    syncQueue.add('POST', '/ventas', { cliente: 'Test' });
    expect(syncQueue.getStatus().queued).toBe(1);
  });

  test('Auto-sync on reconnect', async () => {
    // Simulate offline + add to queue
    // Simulate online
    // Verify sync happened
  });
});
```

## 🚀 Deployment

### Producción

1. **Configurar API URL:**
   ```javascript
   const API_CONFIG = {
     baseURL: 'https://api.maya-autopartes.com',  // Producción
     // ...
   };
   ```

2. **HTTPS obligatorio** - Los navegadores bloquean localStorage desde HTTP

3. **CORS headers** - Backend debe permitir requests del frontend

4. **Rate limiting** - Proteger API contra abuso

5. **Monitoring** - Sentry/LogRocket para errores en producción

## 📝 Notas importantes

### Cache

- **TTL por defecto:** 5 minutos
- **Saltarse cache:** `{ skipCache: true }`
- **Limpiar todo:** `apiClient.clearCache()`

### Offline

- **GET:** Retorna cache stale si está offline
- **POST/PUT/DELETE:** Se encolan automáticamente
- **Sync automático:** Al reconectar se sincroniza
- **Max queue:** 100 requests (configurable)

### Performance

- Request deduplication evita duplicados
- Memoización en core.js evita recálculos
- Cache local reduce llamadas al servidor
- Batch endpoints (`/ventas/batch`) para sync

### Error Handling

- **401:** Logout automático + mensaje
- **403:** "No tienes permiso"
- **404:** "Recurso no encontrado"
- **422:** Errores de validación específicos
- **429:** "Demasiadas solicitudes"
- **500:** "Servidor no disponible"

## 📚 Recursos

- [API_INTEGRATION_GUIDE.md](./API_INTEGRATION_GUIDE.md)
- [OFFLINE_MODE.md](./OFFLINE_MODE.md)
- [README.md](./README.md)
- [integration-example.html](./integration-example.html)
- [api-client.js](./api-client.js)
- [sync-queue.js](./sync-queue.js)
- [core.js](../core.js)

## ❓ FAQs

**P: ¿Dónde va el token JWT?**
A: localStorage('maya_token') - se envía automáticamente en header Authorization

**P: ¿Qué pasa si pierdo conexión?**
A: Los POST/PUT/DELETE se encolan y se sincronizan al reconectar

**P: ¿Cómo fuerzo un refresh?**
A: `apiClient.clearCache()` o `{ skipCache: true }`

**P: ¿Puedo usar esto sin backend?**
A: Sí, funciona con localStorage como antes, pero sin sync

**P: ¿Cómo debuggeo offline mode?**
A: En DevTools → Network → Offline, o dispara evento: `window.dispatchEvent(new Event('offline'))`

**P: ¿Qué tan grande puede ser el localStorage?**
A: ~10-50 MB según navegador, Maya usa ~1-2 MB

**P: ¿Se pierden datos si cierro el navegador?**
A: No, localStorage persiste. Si es offline, se sincroniza al abrir

---

**Estado:** ✅ IMPLEMENTACIÓN COMPLETA  
**Fecha:** 2024-04-22  
**Versión:** 1.0.0  
**Autor:** Maya Autopartes Dev Team
