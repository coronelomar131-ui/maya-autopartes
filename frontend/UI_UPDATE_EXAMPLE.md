# UI.js Update Example - Cómo integrar API en tu UI

Este documento muestra ejemplos de cómo actualizar tu `ui.js` para usar la API en lugar de localStorage.

## 📋 Tabla de contenidos

1. [Renderización con Loading](#renderización-con-loading)
2. [Operaciones CRUD](#operaciones-crud)
3. [Indicadores de Estado](#indicadores-de-estado)
4. [Error Handling](#error-handling)
5. [Optimistic Updates](#optimistic-updates)

---

## Renderización con Loading

### ANTES (localStorage)

```javascript
function renderV() {
  const data = filtV();
  const pg = Math.max(1, Math.ceil(data.length / PG));
  
  if (vPg > pg) vPg = 1;
  
  const sl = data.slice((vPg - 1) * PG, vPg * PG);
  
  document.getElementById('v-tb').innerHTML = !sl.length
    ? '<tr><td colspan="15">Sin ventas</td></tr>'
    : sl.map(v => `<tr>
        <td>${v.cliente}</td>
        <td>${fmt(v.total)}</td>
        <!-- ... más columnas ... -->
      </tr>`).join('');
}

// Llamar en cualquier lado
renderV();
```

### DESPUÉS (API)

```javascript
async function renderV() {
  // Mostrar spinner mientras carga
  const spinner = document.getElementById('v-loading');
  spinner.style.display = 'block';
  
  try {
    // ESTRATEGIA 1: Cargar del cache primero (rápido)
    // El apiClient.get() retorna cache si es válido
    const response = await apiClient.get('/ventas');
    
    // ESTRATEGIA 2: O forzar reload desde servidor
    // const response = await apiClient.get('/ventas', { skipCache: true });
    
    // Actualizar datos globales
    if (response?.data) {
      ventas = response.data;
      localStorage.setItem('ma4_v_cache', JSON.stringify(ventas));
    }
    
    // Renderizar tabla
    const data = filtV();
    const pg = Math.max(1, Math.ceil(data.length / PG));
    
    if (vPg > pg) vPg = 1;
    
    const sl = data.slice((vPg - 1) * PG, vPg * PG);
    
    document.getElementById('v-tb').innerHTML = !sl.length
      ? '<tr><td colspan="15">Sin ventas</td></tr>'
      : sl.map(v => `<tr>
          <td>${v.cliente}</td>
          <td>${fmt(v.total)}</td>
          <!-- ... más columnas ... -->
        </tr>`).join('');
    
    // Actualizar timestamp de última sincronización
    const lastSyncEl = document.getElementById('last-sync');
    if (lastSyncEl) {
      lastSyncEl.textContent = new Date().toLocaleTimeString();
    }
    
  } catch (error) {
    // Mostrar error pero mantener datos en cache
    console.error('❌ Error cargando ventas:', error);
    showError(`Error: ${error.message}`);
    
    // Si el error es 401, logout automático ya sucedió
    if (error.message.includes('sesión expiró')) {
      setTimeout(() => location.reload(), 2000);
    }
  } finally {
    spinner.style.display = 'none';
  }
}

// Llamar al iniciar
await renderV();

// O refrescar manualmente
async function refreshV() {
  await renderV();
}

// HTML asociado
/* 
<div id="v-loading" class="spinner" style="display:none;">
  <p>Cargando ventas...</p>
</div>
<table>
  <tbody id="v-tb"></tbody>
</table>
<div id="last-sync" style="font-size:12px;color:#999;">Nunca</div>
*/
```

### Helper para spinners

```javascript
// Utility functions para spinners
function showSpinner(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'flex';
}

function hideSpinner(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

// CSS para spinner
/*
#v-loading {
  display: none;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 6px;
  animation: fadeIn 0.3s;
}

#v-loading::before {
  content: '';
  width: 20px;
  height: 20px;
  border: 2px solid #f3f3f3;
  border-top: 2px solid #2196F3;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
*/
```

---

## Operaciones CRUD

### Crear Venta (ANTES)

```javascript
async function addV() {
  const form = document.getElementById('v-form');
  const cliente = form.querySelector('[name="cliente"]').value;
  const total = parseFloat(form.querySelector('[name="total"]').value);
  const fecha = form.querySelector('[name="fecha"]').value;
  const responsable = form.querySelector('[name="responsable"]').value;
  
  try {
    validateVenta({ cliente, total, fecha, responsable });
    
    const venta = {
      id: Date.now(),
      cliente,
      total,
      fecha,
      responsable,
      status: 'activa'
    };
    
    ventas.push(venta);
    sv();  // Guardar en localStorage
    
    form.reset();
    closeOv('v-add-ov');
    renderV();
    toast('✅ Venta creada');
    
  } catch (error) {
    toast(`❌ ${error.message}`);
  }
}
```

### Crear Venta (DESPUÉS)

```javascript
async function addV() {
  const form = document.getElementById('v-form');
  const cliente = form.querySelector('[name="cliente"]').value;
  const total = parseFloat(form.querySelector('[name="total"]').value);
  const fecha = form.querySelector('[name="fecha"]').value;
  const responsable = form.querySelector('[name="responsable"]').value;
  
  try {
    // 1. Validar en cliente
    validateVenta({ cliente, total, fecha, responsable });
    
    // 2. Mostrar spinner
    showSpinner('v-add-loading');
    
    // 3. Crear venta (usa la nueva función que sincroniza con API)
    const venta = await addVenta({
      cliente,
      total,
      fecha,
      responsable,
      status: 'activa'
    });
    
    // 4. Limpiar y cerrar
    form.reset();
    closeOv('v-add-ov');
    
    // 5. Refrescar tabla (desde API o cache)
    await renderV();
    
    // 6. Mostrar feedback
    const status = getSyncStatus();
    if (status.isOnline) {
      toast('✅ Venta creada y sincronizada');
    } else {
      toast('✅ Venta creada (se sincronizará)');
    }
    
  } catch (error) {
    console.error('Error:', error);
    toast(`❌ ${error.message}`);
  } finally {
    hideSpinner('v-add-loading');
  }
}

// HTML necesario
/*
<div id="v-add-ov" class="overlay">
  <div class="modal">
    <h2>Nueva Venta</h2>
    <form id="v-form">
      <input name="cliente" placeholder="Cliente" required />
      <input name="total" type="number" placeholder="Total" required />
      <input name="fecha" type="date" required />
      <input name="responsable" placeholder="Responsable" required />
      <div id="v-add-loading" class="spinner" style="display:none;">
        Guardando...
      </div>
      <button type="submit" onclick="addV()">Crear</button>
      <button type="button" onclick="closeOv('v-add-ov')">Cancelar</button>
    </form>
  </div>
</div>
*/
```

### Editar Venta (Optimistic Update)

```javascript
async function editV(id) {
  const venta = findVentaById(id);
  if (!venta) return;
  
  const form = document.getElementById('v-edit-form');
  const newTotal = parseFloat(form.querySelector('[name="total"]').value);
  const newStatus = form.querySelector('[name="status"]').value;
  
  const updates = {
    total: newTotal,
    status: newStatus
  };
  
  try {
    // 1. OPTIMISTIC UPDATE - Actualizar UI inmediatamente
    const oldVenta = JSON.parse(JSON.stringify(venta));
    Object.assign(venta, updates);
    renderV();  // Renderizar con datos nuevos
    
    // 2. Mostrar feedback optimista
    toast('💾 Guardando...');
    
    // 3. Enviar a servidor en background
    await updateVenta(id, updates);
    
    // 4. Éxito - Actualizar feedback
    toast('✅ Cambios guardados');
    
    // 5. Cerrar modal
    closeOv('v-edit-ov');
    
  } catch (error) {
    // REVERTIR si falla
    Object.assign(venta, oldVenta);
    renderV();
    
    // Mostrar error
    console.error('Error:', error);
    toast(`❌ Error: ${error.message}`);
  }
}
```

### Eliminar Venta (Con confirmación)

```javascript
async function delV(id) {
  const venta = findVentaById(id);
  if (!venta) return;
  
  // Pedir confirmación
  if (!confirm(`¿Eliminar venta de ${venta.cliente}?`)) {
    return;
  }
  
  try {
    // 1. Mostrar spinner
    showSpinner('v-delete-loading');
    
    // 2. Eliminar (usa nueva función que sincroniza)
    await deleteVenta(id);
    
    // 3. Refrescar tabla
    await renderV();
    
    // 4. Feedback
    toast('✅ Venta eliminada');
    
  } catch (error) {
    console.error('Error:', error);
    toast(`❌ Error: ${error.message}`);
  } finally {
    hideSpinner('v-delete-loading');
  }
}
```

---

## Indicadores de Estado

### Badge de Conexión

```html
<div class="status-header">
  <h1>Maya Autopartes</h1>
  <div class="connection-badge" id="status-badge">
    <span class="badge-dot" id="badge-dot"></span>
    <span id="status-text">Online</span>
    <span id="queue-info" style="display:none;">
      • <span id="queue-count">0</span> cambios
    </span>
  </div>
</div>

<script>
// Actualizar badge cada segundo
function updateStatusBadge() {
  const isOnline = apiClient.isOnline();
  const queuedCount = syncQueue.getStatus().queued;
  
  const badge = document.getElementById('status-badge');
  const text = document.getElementById('status-text');
  const info = document.getElementById('queue-info');
  const count = document.getElementById('queue-count');
  
  // Actualizar estado online/offline
  badge.className = `connection-badge ${isOnline ? 'online' : 'offline'}`;
  text.textContent = isOnline ? 'Online' : 'Offline';
  
  // Mostrar cambios pendientes
  if (queuedCount > 0) {
    info.style.display = 'inline';
    count.textContent = queuedCount;
  } else {
    info.style.display = 'none';
  }
}

// Actualizar inmediatamente y luego cada segundo
updateStatusBadge();
setInterval(updateStatusBadge, 1000);

// También escuchar eventos
apiClient.addListener(updateStatusBadge);
syncQueue.onStatusChange(updateStatusBadge);
</script>

<style>
.connection-badge {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.3s;
}

.connection-badge.online {
  background: #e8f5e9;
  color: #2e7d32;
}

.connection-badge.offline {
  background: #fff3e0;
  color: #f57c00;
  animation: pulse-warn 2s infinite;
}

.badge-dot {
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

@keyframes pulse-warn {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}
</style>
```

### Mostrar sync status en modal

```html
<div id="sync-status-modal" class="modal" style="display:none;">
  <div class="modal-content">
    <h3>Sincronizando cambios...</h3>
    <div class="progress-bar">
      <div class="progress" id="sync-progress" style="width: 0%"></div>
    </div>
    <p id="sync-message">0 de 0 sincronizados</p>
  </div>
</div>

<script>
syncQueue.onStatusChange(({ event, status }) => {
  const modal = document.getElementById('sync-status-modal');
  const message = document.getElementById('sync-message');
  const progress = document.getElementById('sync-progress');
  
  if (event === 'syncStarted') {
    modal.style.display = 'flex';
    message.textContent = `Sincronizando ${status.queued} cambios...`;
    progress.style.width = '10%';
    
  } else if (event === 'syncCompleted') {
    progress.style.width = '100%';
    message.textContent = `✅ ${status.queued} cambios sincronizados`;
    
    setTimeout(() => {
      modal.style.display = 'none';
    }, 2000);
  }
});
</script>
```

---

## Error Handling

### Manejo de errores comunes

```javascript
async function handleError(error, context) {
  console.error(`Error en ${context}:`, error);
  
  // Tipos de error
  if (error.message.includes('sesión expiró')) {
    // 401 - Auto logout ya sucedió
    toast('❌ Tu sesión expiró. Inicia sesión de nuevo.');
    setTimeout(() => location.reload(), 2000);
    
  } else if (error.message.includes('No tienes permisos')) {
    // 403
    toast('❌ No tienes permisos para hacer esto');
    
  } else if (error.message.includes('no encontrado')) {
    // 404
    toast('❌ El recurso no existe');
    
  } else if (error.message.includes('validación')) {
    // 422
    toast(`❌ ${error.message}`);
    
  } else if (error.message.includes('Demasiadas solicitudes')) {
    // 429
    toast('⚠️ Intentas demasiado rápido. Espera un momento.');
    
  } else if (error.message.includes('Servidor no disponible')) {
    // 500+
    toast('⚠️ El servidor no está disponible. Intenta después.');
    
  } else {
    // Error desconocido
    toast(`❌ Error: ${error.message}`);
  }
}

// Usar en funciones
async function addV() {
  try {
    // ... código ...
  } catch (error) {
    handleError(error, 'agregar venta');
  }
}
```

---

## Optimistic Updates

### Patrón recomendado

```javascript
async function updateWithOptimism(id, updates) {
  const item = findById(id);  // O tu función
  if (!item) return;
  
  // 1. Guardar estado anterior
  const backup = JSON.parse(JSON.stringify(item));
  
  try {
    // 2. Actualizar UI inmediatamente (optimistic)
    Object.assign(item, updates);
    renderTable();  // Re-render
    toast('💾 Guardando cambios...');
    
    // 3. Enviar al servidor (background)
    await updateItem(id, updates);  // Usa nueva función
    
    // 4. Éxito
    toast('✅ Cambios guardados');
    
  } catch (error) {
    // 5. Si falla, revertir UI
    Object.assign(item, backup);
    renderTable();
    
    // 6. Mostrar error
    toast(`❌ Error: ${error.message}`);
    throw error;
  }
}

// Usar para ediciones
function onInputChange(id, field, value) {
  updateWithOptimism(id, { [field]: value })
    .catch(error => console.error(error));
}

// En HTML
/*
<input 
  value="valor"
  onchange="onInputChange(123, 'campo', this.value)"
/>
*/
```

---

## Summary

### Cambios principales en ui.js

1. **Todas las funciones que modifican datos ahora son `async`**
   ```javascript
   // Antes: function addV()
   // Después: async function addV()
   ```

2. **Usar las nuevas funciones CRUD de core.js**
   ```javascript
   await addVenta(data)      // En lugar de ventas.push() + sv()
   await updateVenta(id, data)  // En lugar de editar + sv()
   await deleteVenta(id)     // En lugar de splice + sv()
   ```

3. **Mostrar spinners mientras carga**
   ```javascript
   showSpinner('v-loading');
   try {
     await renderV();
   } finally {
     hideSpinner('v-loading');
   }
   ```

4. **Monitorear estado de conexión**
   ```javascript
   apiClient.addListener(() => updateStatusBadge());
   syncQueue.onStatusChange(() => updateStatusBadge());
   ```

5. **Usar optimistic updates para mejor UX**
   ```javascript
   // Actualizar UI primero
   // Luego sincronizar
   // Si falla, revertir
   ```

---

**Próximo paso:** Revisa [integration-example.html](./integration-example.html) para ver un ejemplo completo funcionando.
