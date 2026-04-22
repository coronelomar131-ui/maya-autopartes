# Google Drive Sync - Guía Técnica Completa

## Índice
1. [Arquitectura](#arquitectura)
2. [API Reference](#api-reference)
3. [Flujo de Sincronización](#flujo-de-sincronización)
4. [Manejo de Conflictos](#manejo-de-conflictos)
5. [Offline-First Architecture](#offline-first-architecture)
6. [Error Handling](#error-handling)
7. [Ejemplos de Uso](#ejemplos-de-uso)

---

## Arquitectura

### Componentes Principales

```
┌─────────────────────────────────────────┐
│     Maya Autopartes App                 │
├─────────────────────────────────────────┤
│  UI Layer (Buttons, Status, Errors)     │
├─────────────────────────────────────────┤
│  Google Drive Sync Module               │
│  ├─ Auth (OAuth 2.0)                    │
│  ├─ Drive Client                        │
│  ├─ Sync Engine                         │
│  ├─ Offline Queue                       │
│  └─ Conflict Resolver                   │
├─────────────────────────────────────────┤
│  Excel Mapper Module                    │
│  ├─ mapFromExcel() - Excel → App        │
│  ├─ mapToExcel() - App → Excel          │
│  └─ Validation                          │
├─────────────────────────────────────────┤
│  Storage                                │
│  ├─ localStorage (Auth, Config)         │
│  └─ RAM (State, Queues)                 │
├─────────────────────────────────────────┤
│  Google Drive API (OAuth)               │
│  └─ Excel file in Google Drive          │
└─────────────────────────────────────────┘
```

### Data Flow

```
EXCEL → READ → VALIDATE → MAP → DETECT CHANGES → APPLY TO APP
  ↓                                                        ↓
  └─ Every 60s (configurable) ──────────────────────────┘

APP → CHANGE EVENT → QUEUE → MAP → VALIDATE → WRITE → EXCEL
  ↓                                                      ↓
  └─ Offline Queue if no connection ──────────────────┘
```

---

## API Reference

### Inicialización

#### `init()`
Inicializar Google Drive Sync. Restaura sesión o inicia OAuth flow.

```javascript
import GoogleDriveSync from './api/google-drive-sync.js';

try {
  await GoogleDriveSync.init();
  console.log('✅ Sync iniciado');
} catch (error) {
  console.error('❌ Error:', error);
}
```

**Retorna:** `Promise<boolean>`

---

### Sincronización Manual

#### `syncNow()`
Forzar sincronización inmediata.

```javascript
// En event listener de botón
button.addEventListener('click', async () => {
  try {
    const result = await GoogleDriveSync.syncNow();
    console.log(`Cambios: ${result.changes}`);
  } catch (error) {
    console.error('Error en sync:', error);
  }
});
```

**Retorna:** `Promise<{ success: boolean, changes: number }>`

---

### Polling Automático

#### `startAutoSync(interval?)`
Iniciar sincronización automática periódica.

```javascript
// Cada 60 segundos (por defecto)
GoogleDriveSync.startAutoSync();

// Cada 30 segundos
GoogleDriveSync.startAutoSync(30000);

// Cada 5 minutos
GoogleDriveSync.startAutoSync(300000);
```

**Parámetros:**
- `interval` (número, opcional): Milisegundos entre syncs. Default: 60000

**Retorna:** `number` (ID del interval)

---

#### `stopAutoSync()`
Detener sincronización automática.

```javascript
GoogleDriveSync.stopAutoSync();
```

---

### Lectura de Datos

#### `readExcelFromDrive()`
Leer datos directamente del archivo Excel en Google Drive.

```javascript
try {
  const data = await GoogleDriveSync.readExcelFromDrive();
  console.log(`Leídas ${data.length} filas`);
  // data = [{ id, numero, cliente, ... }, ...]
} catch (error) {
  console.error('Error leyendo:', error);
}
```

**Retorna:** `Promise<Array<Object>>`

---

### Escritura de Datos

#### `writeChangesToExcel(changes)`
Escribir cambios en el archivo Excel.

```javascript
const changes = [
  {
    type: 'create',
    data: { numero: 'F001', cliente: 'Cliente A', total: 1500 }
  },
  {
    type: 'update',
    data: { id: 'ma_123', numero: 'F002', total: 2000 }
  }
];

try {
  const result = await GoogleDriveSync.writeChangesToExcel(changes);
  console.log('✅ Cambios escritos en Excel');
} catch (error) {
  console.error('Error escribiendo:', error);
}
```

**Parámetros:**
- `changes` (Array): Array con objetos que tienen `type` ('create'|'update'|'delete') y `data`

**Retorna:** `Promise<{ success: boolean }>`

---

### Modo Offline

#### `setupOfflineDetection()`
Configurar detección automática de conexión/desconexión.

```javascript
GoogleDriveSync.setupOfflineDetection();

// Automáticamente:
// 1. Detecta pérdida de conexión
// 2. Encola cambios
// 3. Al recuperar conexión, procesa la cola
```

---

#### `processOfflineQueue()`
Procesar cambios que se encolaron mientras estaba offline.

```javascript
try {
  await GoogleDriveSync.processOfflineQueue();
  console.log('✅ Cola offline procesada');
} catch (error) {
  console.error('Error:', error);
}
```

**Retorna:** `Promise<void>`

---

### Manejo de Conflictos

#### `resolveConflict(appData, excelData)`
Resolver conflicto usando timestamp (Last-Write-Wins).

```javascript
const appData = {
  id: 'ma_123',
  cliente: 'A',
  updatedAt: '2026-04-22T10:00:00Z'
};

const excelData = {
  id: 'ma_123',
  cliente: 'B',
  modifiedTime: '2026-04-22T09:00:00Z'
};

const resolution = await GoogleDriveSync.resolveConflict(appData, excelData);
// { winner: 'app', data: appData }
```

**Retorna:** `Promise<{ winner: 'app'|'excel', data: Object }>`

---

#### `queueConflict(appData, excelData)`
Encolar conflicto para resolución manual.

```javascript
GoogleDriveSync.queueConflict(appData, excelData);

// El usuario puede resolver manualmente después
```

---

### UI Integration

#### `registerUIElements(elements)`
Registrar elementos HTML para actualización automática.

```javascript
GoogleDriveSync.registerUIElements({
  syncButton: document.getElementById('sync-button'),
  statusIndicator: document.getElementById('status'),
  lastSyncLabel: document.getElementById('last-sync'),
  errorPanel: document.getElementById('errors')
});
```

**Elementos soportados:**
- `syncButton`: Botón para sync manual
- `statusIndicator`: Div que muestra estado (clase CSS actualizada)
- `lastSyncLabel`: Div que muestra última sincronización
- `errorPanel`: Div para mensajes de error

---

#### `registerCallbacks(callbacks)`
Registrar callbacks para eventos.

```javascript
GoogleDriveSync.registerCallbacks({
  onSyncStart: () => {
    console.log('🔄 Sincronización iniciada');
  },
  onSyncComplete: (data) => {
    console.log(`✅ ${data.changes} cambios sincronizados`);
  },
  onSyncError: (error) => {
    console.error('❌ Error:', error.message);
  },
  onDataUpdate: (data) => {
    console.log('📊 Datos actualizados:', data);
  }
});
```

**Callbacks disponibles:**
- `onSyncStart()`: Se llama al iniciar sync
- `onSyncComplete(data)`: Se llama al completar sync. `data.changes` = número de cambios
- `onSyncError(error)`: Se llama en caso de error
- `onDataUpdate(data)`: Se llama cuando hay datos nuevos

---

### Configuración

#### `getConfig()`
Obtener configuración actual.

```javascript
const config = GoogleDriveSync.getConfig();
console.log(config.syncInterval); // 60000
console.log(config.maxRetries); // 3
```

**Retorna:** `Object`

---

#### `updateConfig(updates)`
Actualizar configuración.

```javascript
GoogleDriveSync.updateConfig({
  syncInterval: 30000, // Cambiar a 30 segundos
  maxRetries: 5
});
```

**Parámetros:**
- `updates` (Object): Propiedades a actualizar

---

### Estado & Diagnóstico

#### `getState()`
Obtener estado actual del sync.

```javascript
const state = GoogleDriveSync.getState();
console.log({
  isAuthenticated: state.isAuthenticated,
  isOnline: state.isOnline,
  isSyncing: state.isSyncing,
  lastSyncTime: state.lastSyncTime,
  lastError: state.lastError,
  queuedChanges: state.queuedChanges,
  conflictCount: state.conflictCount,
  syncCount: state.syncCount
});
```

**Retorna:**
```javascript
{
  isAuthenticated: boolean,
  isOnline: boolean,
  isSyncing: boolean,
  lastSyncTime: number | null,
  lastError: { message, code, timestamp } | null,
  queuedChanges: number,
  conflictCount: number,
  syncCount: number
}
```

---

### Logout & Cleanup

#### `logout()`
Desconectar sesión y limpiar datos.

```javascript
GoogleDriveSync.logout();
// - Elimina tokens
// - Detiene sync automático
// - Limpia localStorage
```

---

## Flujo de Sincronización

### Flujo Completo de Sync (Excel → App)

```
1. READ EXCEL
   └─ GET file from Google Drive
   └─ PARSE Excel with XLSX
   └─ Validate data

2. MAP TO APP FORMAT
   └─ For each row:
      └─ mapFromExcel(row)
      └─ Validate field types
      └─ Add timestamps

3. DETECT CHANGES
   └─ Compare with app state
   └─ Identify: created, updated, deleted

4. RESOLVE CONFLICTS
   └─ If timestamp-based conflict:
      └─ Last-Write-Wins
   └─ If unresolvable:
      └─ Queue for manual resolution

5. APPLY TO APP
   └─ Update app state
   └─ Trigger UI updates
   └─ Save to localStorage

6. UPDATE UI
   └─ Update last sync time
   └─ Update status indicator
   └─ Clear errors
```

### Flujo Completo de Sync (App → Excel)

```
1. DETECT CHANGES IN APP
   └─ onChange event listener
   └─ User action triggers update

2. QUEUE IF OFFLINE
   └─ Check connection
   └─ If offline:
      └─ Add to offlineQueue
      └─ Return success
   └─ If online:
      └─ Continue...

3. MAP TO EXCEL FORMAT
   └─ mapToExcel(appData)
   └─ Format dates, numbers, etc.
   └─ Validate Excel structure

4. READ CURRENT EXCEL
   └─ GET latest from Drive
   └─ Merge with changes
   └─ Detect conflicts

5. WRITE TO EXCEL
   └─ Create new XLSX file
   └─ Upload to Google Drive
   └─ Update file metadata

6. VERIFY & CLEANUP
   └─ Check upload success
   └─ Clear offline queue item
   └─ Update last modified time
```

---

## Manejo de Conflictos

### Escenarios de Conflicto

#### Escenario 1: Edición simultánea
```
App: cliente = "Cliente A" (10:00)
Excel: cliente = "Cliente B" (10:01)

Resolución: Excel gana (más reciente)
```

#### Escenario 2: Cambio offline + cambio remoto
```
Offline:
  - Usuario edita en app
  - Sin conexión, se encola

Reconexión:
  - Se envía cambio app
  - Se lee Excel
  - Conflict detected → Last-Write-Wins
```

#### Escenario 3: Pérdida de datos
```
Si ambas versiones son incompatibles:
  - Se encola conflicto
  - Usuario puede resolver manualmente
  - O se implementa merge automático
```

### Estrategia de Resolución

**Current: Last-Write-Wins (Timestamp-based)**

```javascript
const appTime = new Date(appData.updatedAt).getTime();
const excelTime = new Date(excelData.modifiedTime).getTime();

if (appTime > excelTime) {
  // Usar app
} else {
  // Usar excel
}
```

**Alternativas:**
- **Manual Resolution**: Mostrar UI para que usuario elija
- **Field-Level Merge**: Combinar cambios a nivel de campo
- **Version Control**: Guardar histórico de versiones

---

## Offline-First Architecture

### Cómo Funciona

```
┌─────────────────────────────────────┐
│  User Makes Change in App           │
└────────────────┬────────────────────┘
                 │
                 ↓
        ┌────────────────┐
        │ Online?        │
        └────┬───────┬───┘
             │       │
        YES  │       │  NO
             ↓       ↓
        ┌────────────────┐
        │ Write to Drive │  Queue Change
        └────┬───────────┘  (offlineQueue)
             │
             ↓
        ┌────────────────┐
        │ Success?       │
        └────┬───────┬───┘
             │       │
        YES  │       │  NO
             ↓       ↓
        Update UI  Keep in Queue
                   Retry later
```

### Implementación

```javascript
// Detectar cambio en app
appData.addEventListener('change', async (newData) => {
  try {
    await GoogleDriveSync.writeChangesToExcel([{
      type: 'update',
      data: newData
    }]);
  } catch (error) {
    console.log('Offline - en cola');
    // Automáticamente encolado
  }
});

// Reconexión
window.addEventListener('online', async () => {
  await GoogleDriveSync.processOfflineQueue();
});
```

### Características

- ✅ Cambios se aplican localmente inmediatamente
- ✅ Cambios se guardan en `offlineQueue`
- ✅ Cuando hay conexión, se envían a Drive
- ✅ Si falla, se reintentan automáticamente
- ✅ User no ve latencia

---

## Error Handling

### Tipos de Errores

| Error | Causa | Manejo |
|-------|-------|---------|
| `invalid_grant` | Token expirado | Refresh automático |
| `unauthorized` | Credenciales inválidas | Re-autenticar |
| `forbidden` | Sin permisos | Mostrar error |
| `not_found` | Archivo no existe | Crear nuevo |
| `network_error` | Sin conexión | Encolar offline |
| `rate_limit` | Demasiadas requests | Backoff exponencial |

### Retry Logic

```javascript
// Automático con backoff exponencial
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      const delay = 2000 * Math.pow(2, attempt - 1);
      // Esperar: 2s, 4s, 8s
      await sleep(delay);
    }
  }
}
```

### Manejo de Errores en App

```javascript
GoogleDriveSync.registerCallbacks({
  onSyncError: (error) => {
    if (error.code === 'invalid_grant') {
      // Token expirado - se refresca automáticamente
      console.log('Token refrescado automáticamente');
    } else if (error.code === 'unauthorized') {
      // Mostrar botón de re-autenticación
      showReAuthButton();
    } else if (!navigator.onLine) {
      // Sin conexión - cambios en cola
      showOfflineMessage();
    } else {
      // Error genérico
      showErrorAlert(error.message);
    }
  }
});
```

---

## Ejemplos de Uso

### Ejemplo 1: Setup Completo

```javascript
import GoogleDriveSync from './api/google-drive-sync.js';

async function setupGoogleDriveSync() {
  try {
    // 1. Inicializar
    await GoogleDriveSync.init();

    // 2. Registrar elementos UI
    GoogleDriveSync.registerUIElements({
      syncButton: document.getElementById('sync-btn'),
      statusIndicator: document.getElementById('status'),
      lastSyncLabel: document.getElementById('last-sync'),
      errorPanel: document.getElementById('errors')
    });

    // 3. Registrar callbacks
    GoogleDriveSync.registerCallbacks({
      onSyncStart: () => console.log('🔄 Syncing...'),
      onSyncComplete: (data) => console.log(`✅ ${data.changes} cambios`),
      onSyncError: (error) => console.error('❌', error.message)
    });

    // 4. Activar offline detection
    GoogleDriveSync.setupOfflineDetection();

    // 5. Iniciar sync automático
    GoogleDriveSync.startAutoSync(60000);

    console.log('✅ Google Drive Sync setup completado');
  } catch (error) {
    console.error('❌ Setup error:', error);
  }
}

document.addEventListener('DOMContentLoaded', setupGoogleDriveSync);
```

---

### Ejemplo 2: Sync Manual Reactivo

```javascript
document.getElementById('sync-now-btn').addEventListener('click', async () => {
  const button = event.target;
  const originalText = button.textContent;

  try {
    button.disabled = true;
    button.textContent = '🔄 Sincronizando...';

    const result = await GoogleDriveSync.syncNow();

    button.textContent = `✅ ${result.changes} cambios`;
    setTimeout(() => {
      button.textContent = originalText;
      button.disabled = false;
    }, 2000);

  } catch (error) {
    button.textContent = '❌ Error';
    button.disabled = false;
    console.error(error);
  }
});
```

---

### Ejemplo 3: Monitorear Estado

```javascript
setInterval(() => {
  const state = GoogleDriveSync.getState();

  console.log(`
    📊 Estado del Sync:
    - Autenticado: ${state.isAuthenticated}
    - Online: ${state.isOnline}
    - Sincronizando: ${state.isSyncing}
    - Último sync: ${state.lastSyncTime}
    - Cambios en cola: ${state.queuedChanges}
    - Conflictos: ${state.conflictCount}
    - Total syncs: ${state.syncCount}
  `);

  // Mostrar en UI
  document.getElementById('sync-stats').innerHTML = `
    <div>Última sincronización: ${formatTime(state.lastSyncTime)}</div>
    <div>Cambios en cola: ${state.queuedChanges}</div>
    <div>Estado: ${state.isSyncing ? '🔄 Sincronizando' : '✓ Listo'}</div>
  `;
}, 5000);
```

---

### Ejemplo 4: Integración con Cambios de App

```javascript
// Cuando el usuario crea una venta
async function createVenta(ventaData) {
  // 1. Guardar en app
  const id = saveVentaLocally(ventaData);

  // 2. Intentar enviar a Excel
  try {
    await GoogleDriveSync.writeChangesToExcel([{
      type: 'create',
      data: { ...ventaData, id }
    }]);
    showSuccess('✅ Venta creada y sincronizada');
  } catch (error) {
    if (!navigator.onLine) {
      showInfo('📵 Offline - Será sincronizado cuando hay conexión');
    } else {
      showError('Error sincronizando: ' + error.message);
    }
  }
}

// Cuando el usuario edita una venta
async function updateVenta(id, changes) {
  const venta = getVenta(id);
  const updated = { ...venta, ...changes };

  // 1. Actualizar en app
  updateVentaLocally(id, updated);

  // 2. Intentar enviar a Excel
  try {
    await GoogleDriveSync.writeChangesToExcel([{
      type: 'update',
      data: updated
    }]);
    showSuccess('✅ Cambios sincronizados');
  } catch (error) {
    console.warn('Sincronización pendiente:', error.message);
  }
}
```

---

## Monitoreo & Debugging

### Logs Disponibles

El módulo usa console.log con prefijos:
- `🚀` - Inicialización
- `🔐` - Autenticación
- `🔄` - Sincronización
- `📖` - Lectura de datos
- `✍️` - Escritura de datos
- `✅` - Éxito
- `❌` - Error
- `⚠️` - Advertencia
- `🌐` - Online/Offline

### Habilitar Debug Verbose

```javascript
// En consola del navegador
localStorage.setItem('google_drive_debug', 'true');
location.reload();
```

### Inspeccionar Estado

```javascript
// En consola
window.GOOGLE_DRIVE_SYNC.getState()

// Resultado:
{
  isAuthenticated: true,
  isOnline: true,
  isSyncing: false,
  lastSyncTime: 1713793450000,
  lastError: null,
  queuedChanges: 0,
  conflictCount: 0,
  syncCount: 45
}
```

### Limpiar Datos de Debug

```javascript
// Logout completo
GoogleDriveSync.logout();

// Limpiar estado (CUIDADO)
localStorage.removeItem('google_drive_auth');
location.reload();
```

---

## Performance Tips

1. **Ajustar intervalo de sync**
   - Más frecuente = más requests a Google Drive
   - 60s es un buen balance

2. **Batch writes**
   - Agrupar cambios en lotes de 50 máximo
   - El módulo lo hace automáticamente

3. **Offline queue optimization**
   - Deduplica cambios al mismo registro
   - Procesa incrementalmente

4. **Token refresh**
   - Se refresca automáticamente 5 min antes de expirar
   - No requiere intervención

---

## FAQ

**P: ¿Qué pasa si la app se cierra durante sync?**
R: El sync se interrumpe. Al reiniciar, continúa desde donde se quedó.

**P: ¿Puedo sincronizar con múltiples usuarios?**
R: Sí, pero debes usar diferentes carpetas en Drive o manejar conflictos.

**P: ¿Cuál es el máximo de filas que soporta?**
R: Excel soporta ~1M filas. El módulo optimiza para miles.

**P: ¿Puedo cambiar el intervalo de sync?**
R: Sí, con `updateConfig()` o en `startAutoSync(interval)`.

**P: ¿Qué pasa con datos sensibles?**
R: El módulo no encripta. Usa HTTPS en producción.

---

**Versión:** 1.0.0  
**Última actualización:** 2026-04-22  
**Mantenedor:** Maya Autopartes Dev Team
