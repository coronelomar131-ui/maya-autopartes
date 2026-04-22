# Real-time Sync - Guía de Integración en main.js

## 📌 Cómo Integrar RealtimeClient en la Aplicación Existente

Este documento muestra el código exacto necesario para conectar `realtime-client.js` con `main.js`, `core.js` y la UI existente.

---

## 1. Cargar RealtimeClient en `index.html`

Agregar antes de `main.js`:

```html
<!-- Socket.io Client (CDN) -->
<script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>

<!-- Real-time Sync Client -->
<script src="./frontend/realtime-client.js"></script>

<!-- App principal -->
<script type="module" src="./main.js"></script>
```

---

## 2. Inicializar en `main.js` (después de auth)

Agregar esta sección después del login de usuario:

```javascript
// ═════════════════════════════════════════════════════════════════════════
// REALTIME SYNC INITIALIZATION
// ═════════════════════════════════════════════════════════════════════════

let realtimeClient = null;

/**
 * Inicializar sincronización en tiempo real
 */
async function inicializarRealtimeSync(usuarioId, nombreUsuario) {
  try {
    // Crear instancia del cliente
    realtimeClient = new RealtimeClient({
      serverUrl: window.location.hostname === 'localhost' 
        ? 'http://localhost:3001'
        : `https://${window.location.hostname}`,
      sala: 'global',
      debug: true, // Cambiar a false en producción
      maxQueueSize: 100
    });

    // Registrar callbacks para actualizar UI
    realtimeClient.callbacks.onVentaCreada = handleVentaCreada;
    realtimeClient.callbacks.onVentaActualizada = handleVentaActualizada;
    realtimeClient.callbacks.onVentaEliminada = handleVentaEliminada;
    realtimeClient.callbacks.onAlmacenActualizado = handleAlmacenActualizado;
    realtimeClient.callbacks.onClienteActualizado = handleClienteActualizado;
    realtimeClient.callbacks.onUsuarioConectado = handleUsuarioConectado;
    realtimeClient.callbacks.onUsuarioDesconectado = handleUsuarioDesconectado;
    realtimeClient.callbacks.onEstadoConexion = handleEstadoConexion;
    realtimeClient.callbacks.onErrorConexion = handleErrorConexion;

    // Inicializar conexión
    const success = await realtimeClient.inicializar(usuarioId, nombreUsuario);
    
    if (success) {
      console.log('✅ Real-time Sync inicializado');
      return true;
    } else {
      console.error('❌ Error inicializando Real-time Sync');
      return false;
    }

  } catch (error) {
    console.error('❌ Error en inicializarRealtimeSync:', error);
    toast('⚠️ No se pudo conectar a sincronización en tiempo real', 'warning');
    return false;
  }
}

// ═════════════════════════════════════════════════════════════════════════
// EVENT HANDLERS - ACTUALIZAR UI EN TIEMPO REAL
// ═════════════════════════════════════════════════════════════════════════

/**
 * Handle: Venta creada por otro usuario
 */
function handleVentaCreada(evento) {
  try {
    console.log(`📝 Venta creada por ${evento.usuario}:`, evento.ventaId);

    // Agregar a array ventas
    if (!ventas.find(v => v.id === evento.ventaId)) {
      ventas.unshift(evento.data);
      
      // Actualizar UI
      renderV();
      
      // Mostrar notificación
      toast(`✅ ${evento.usuario} creó venta ${evento.ventaId}`, 'success');
    }
  } catch (error) {
    console.error('Error en handleVentaCreada:', error);
  }
}

/**
 * Handle: Venta actualizada por otro usuario
 */
function handleVentaActualizada(evento) {
  try {
    console.log(`✏️ Venta actualizada por ${evento.usuario}:`, evento.ventaId);

    // Buscar y actualizar
    const venta = findVentaById(evento.ventaId);
    if (venta) {
      // Actualizar campos
      Object.assign(venta, evento.data);
      
      // Actualizar UI
      renderV();
      
      // Mostrar cambios
      const cambiosStr = Object.keys(evento.cambios || {})
        .map(key => `${key}: ${evento.cambios[key].anterior} → ${evento.cambios[key].nuevo}`)
        .join(', ');
      
      toast(`${evento.usuario} actualizó venta (${cambiosStr})`, 'info');
    }
  } catch (error) {
    console.error('Error en handleVentaActualizada:', error);
  }
}

/**
 * Handle: Venta eliminada por otro usuario
 */
function handleVentaEliminada(evento) {
  try {
    console.log(`🗑️ Venta eliminada por ${evento.usuario}:`, evento.ventaId);

    // Remover de array
    const index = ventas.findIndex(v => v.id === evento.ventaId);
    if (index !== -1) {
      ventas.splice(index, 1);
      
      // Actualizar UI
      renderV();
      
      // Notificación
      toast(`${evento.usuario} eliminó venta ${evento.ventaId}`, 'warning');
    }
  } catch (error) {
    console.error('Error en handleVentaEliminada:', error);
  }
}

/**
 * Handle: Stock actualizado por otro usuario
 */
function handleAlmacenActualizado(evento) {
  try {
    console.log(`📦 Almacén actualizado por ${evento.usuario}:`, evento.productoId);

    // Buscar producto
    const producto = findProductoById(evento.productoId);
    if (producto) {
      const stockAnterior = producto.cantidad;
      
      // Actualizar stock
      producto.cantidad = evento.stockNuevo;
      
      // Actualizar UI
      renderA();
      
      // Mostrar notificación
      const cambio = evento.diferencia > 0 ? '+' : '';
      toast(
        `${evento.usuario} actualizó ${evento.producto}: ${stockAnterior} → ${evento.stockNuevo} (${cambio}${evento.diferencia})`,
        'info'
      );
      
      // Si stock bajo, resaltar
      if (evento.stockNuevo < 10) {
        const filaProducto = document.querySelector(`[data-producto-id="${evento.productoId}"]`);
        if (filaProducto) {
          filaProducto.classList.add('table-warning');
          filaProducto.innerHTML += ' <span class="badge badge-danger">⚠️ STOCK BAJO</span>';
        }
      }
    }
  } catch (error) {
    console.error('Error en handleAlmacenActualizado:', error);
  }
}

/**
 * Handle: Cliente actualizado por otro usuario
 */
function handleClienteActualizado(evento) {
  try {
    console.log(`👥 Cliente actualizado por ${evento.usuario}:`, evento.clienteId);

    // Buscar cliente
    const cliente = clientes.find(c => c.id === evento.clienteId);
    if (cliente) {
      // Actualizar datos
      Object.assign(cliente, evento.data);
      
      // Actualizar UI
      renderC();
      
      // Mostrar cambios
      const cambiosStr = Object.keys(evento.cambios || {})
        .map(key => `${key}: ${evento.cambios[key].anterior} → ${evento.cambios[key].nuevo}`)
        .join(', ');
      
      toast(`${evento.usuario} actualizó cliente ${evento.nombreCliente} (${cambiosStr})`, 'info');
    }
  } catch (error) {
    console.error('Error en handleClienteActualizado:', error);
  }
}

/**
 * Handle: Usuario se conectó
 */
function handleUsuarioConectado(evento) {
  try {
    console.log(`🟢 Usuario conectado: ${evento.nombre}`);
    
    // Actualizar badge de usuarios conectados
    const userBadge = document.getElementById('usuarios-conectados');
    if (userBadge) {
      userBadge.textContent = evento.usuariosTotales;
    }
    
    // Toast silencioso para no saturar
    if (evento.usuariosTotales <= 5) { // Solo mostrar si hay pocos
      toast(`✅ ${evento.nombre} se conectó`, 'success');
    }
  } catch (error) {
    console.error('Error en handleUsuarioConectado:', error);
  }
}

/**
 * Handle: Usuario se desconectó
 */
function handleUsuarioDesconectado(evento) {
  try {
    console.log(`🔴 Usuario desconectado: ${evento.nombre}`);
    
    // Actualizar badge
    const userBadge = document.getElementById('usuarios-conectados');
    if (userBadge) {
      userBadge.textContent = evento.usuariosTotales;
    }
    
    toast(`❌ ${evento.nombre} se desconectó`, 'warning');
  } catch (error) {
    console.error('Error en handleUsuarioDesconectado:', error);
  }
}

/**
 * Handle: Cambio en estado de conexión
 */
function handleEstadoConexion(estado) {
  try {
    const statusBadge = document.getElementById('sync-status');
    
    if (estado.estado === 'conectado') {
      console.log('✅ Conectado a servidor realtime');
      if (statusBadge) {
        statusBadge.innerHTML = '🟢 Sincronizado';
        statusBadge.classList.remove('text-danger');
        statusBadge.classList.add('text-success');
      }
    } else {
      console.log('❌ Desconectado del servidor realtime');
      if (statusBadge) {
        statusBadge.innerHTML = '🔴 Offline';
        statusBadge.classList.remove('text-success');
        statusBadge.classList.add('text-danger');
      }
    }
  } catch (error) {
    console.error('Error en handleEstadoConexion:', error);
  }
}

/**
 * Handle: Error en conexión realtime
 */
function handleErrorConexion(error) {
  try {
    console.error('❌ Error realtime:', error.tipo, error.error);
    
    toast(`⚠️ Error de sincronización: ${error.error}`, 'danger');
  } catch (e) {
    console.error('Error en handleErrorConexion:', e);
  }
}

// ═════════════════════════════════════════════════════════════════════════
// WRAPPER FUNCTIONS - EMITIR EVENTOS AL CREAR/MODIFICAR
// ═════════════════════════════════════════════════════════════════════════

/**
 * Wrapper para crear venta (ahora notifica en tiempo real)
 */
const createVentaWithRealtime = async (ventaData) => {
  try {
    // 1. Crear venta localmente
    const venta = {
      id: 'v-' + new Date().getTime(),
      ...ventaData,
      fecha: today(),
      usuario_id: sesionActual.usuarioId
    };
    
    ventas.unshift(venta);
    renderV();
    
    // 2. Sincronizar con Supabase (si aplica)
    // await syncVentasToSupabase();
    
    // 3. Notificar a otros usuarios en tiempo real
    if (realtimeClient && realtimeClient.isConnected) {
      realtimeClient.ventaCreada(venta);
    }
    
    toast(`✅ Venta creada: ${venta.id}`, 'success');
    return venta;
    
  } catch (error) {
    console.error('Error creando venta:', error);
    toast('❌ Error al crear venta', 'danger');
    throw error;
  }
};

/**
 * Wrapper para actualizar almacén (ahora notifica en tiempo real)
 */
const updateAlmacenWithRealtime = async (productoId, nuevoStock) => {
  try {
    // 1. Actualizar localmente
    const producto = findProductoById(productoId);
    if (!producto) throw new Error('Producto no encontrado');
    
    const stockAnterior = producto.cantidad;
    producto.cantidad = nuevoStock;
    renderA();
    
    // 2. Sincronizar con Supabase (si aplica)
    // await syncAlmacenToSupabase();
    
    // 3. Notificar a otros usuarios
    if (realtimeClient && realtimeClient.isConnected) {
      realtimeClient.almacenActualizado({
        productoId,
        nombreProducto: producto.nombre,
        stockAnterior,
        stockNuevo: nuevoStock,
        diferencia: nuevoStock - stockAnterior,
        concepto: 'Actualización manual',
        precio: producto.precio
      });
    }
    
    toast(`✅ Stock actualizado: ${producto.nombre}`, 'success');
    
  } catch (error) {
    console.error('Error actualizando almacén:', error);
    toast('❌ Error al actualizar almacén', 'danger');
    throw error;
  }
};

// ═════════════════════════════════════════════════════════════════════════
// INTEGRAR EN FLUJO DE LOGIN EXISTENTE
// ═════════════════════════════════════════════════════════════════════════

/**
 * Modificar loginUser en core.js para inicializar RealtimeSync
 * 
 * Encontrar la función loginUser() y agregar al final:
 */

// DESPUÉS de existente loginUser(), agregar:
const loginUserWithRealtime = async (email, password) => {
  // Llamar a loginUser original
  const user = await loginUser(email, password);
  
  if (user) {
    // Inicializar real-time sync
    await inicializarRealtimeSync(user.id, user.nombre);
  }
  
  return user;
};

/**
 * Modificar logoutUser para limpiar RealtimeSync
 */
const logoutUserWithRealtime = () => {
  // Desconectar realtime
  if (realtimeClient) {
    realtimeClient.desconectar();
  }
  
  // Llamar a logout original
  return logoutUser();
};

// ═════════════════════════════════════════════════════════════════════════
// EXPORT PARA HANDLERS EN HTML
// ═════════════════════════════════════════════════════════════════════════

// Exponer al window para handlers onclick en HTML
window.createVentaWithRealtime = createVentaWithRealtime;
window.updateAlmacenWithRealtime = updateAlmacenWithRealtime;
window.inicializarRealtimeSync = inicializarRealtimeSync;
window.realtimeClient = () => realtimeClient; // Getter para acceder en consola
```

---

## 3. Agregar HTML Elements para Status

En `index.html`, agregar badges de estado:

```html
<!-- Navegación superior -->
<nav class="navbar navbar-expand-lg navbar-dark bg-dark">
  <div class="navbar-nav ml-auto">
    <!-- Usuarios conectados -->
    <div class="nav-item mr-3">
      <span id="sync-status" class="badge badge-success">🟢 Sincronizado</span>
      <span id="usuarios-conectados" class="badge badge-info ml-2">1</span>
    </div>
  </div>
</nav>

<!-- En tabla de almacén, agregar atributo data -->
<tr data-producto-id="p-1">
  <!-- contenido -->
</tr>
```

---

## 4. Actualizar Formularios para usar Realtime

En lugar de:
```javascript
// Viejo
svV('crear_venta', {datos});
```

Usar:
```javascript
// Nuevo
const venta = await createVentaWithRealtime({
  clienteId: document.getElementById('venta_cli').value,
  monto: parseFloat(document.getElementById('venta_mon').value),
  // ... otros campos
});
```

---

## 5. Modificar render functions para marcar offline

```javascript
/**
 * En renderV(), agregar indicador de sincronización
 */
function renderV() {
  // ... código existente ...
  
  // Agregar indicador si está offline
  if (realtimeClient && !realtimeClient.isConnected) {
    const mensaje = document.querySelector('[data-offline-message]');
    if (mensaje) {
      mensaje.style.display = 'block';
      mensaje.textContent = `⚠️ Offline mode - ${realtimeClient.offlineQueue.length} cambios encolados`;
    }
  }
}
```

---

## 6. En `index.html`, agregar loader

```html
<!-- Mostrar mientras se sincroniza -->
<div id="sync-loading" class="alert alert-info" style="display: none;">
  <i class="spinner-border spinner-border-sm mr-2"></i>
  Sincronizando cambios offline...
</div>

<script>
// Mostrar/ocultar loader
window.showSyncLoading = (show) => {
  document.getElementById('sync-loading').style.display = show ? 'block' : 'none';
};
</script>
```

---

## 7. Ejemplo Completo: Crear Venta con Realtime

```javascript
/**
 * En ui.js o en onclick handler
 */
function handleCrearVenta() {
  const clienteId = document.getElementById('venta_cli').value;
  const monto = parseFloat(document.getElementById('venta_mon').value);
  
  if (!clienteId || !monto) {
    toast('❌ Completa todos los campos', 'danger');
    return;
  }
  
  const venta = {
    id: 'v-' + new Date().getTime(),
    clienteId,
    cliente: findClienteByNombre(clienteId)?.nombre || 'Desconocido',
    monto,
    items: [],
    concepto: 'Venta general',
    estado: 'pendiente',
    fecha: today(),
    usuario_id: sesionActual.usuarioId
  };
  
  // Agregar localmente
  ventas.unshift(venta);
  renderV();
  
  // Notificar en tiempo real
  if (window.realtimeClient) {
    window.realtimeClient.ventaCreada(venta);
  }
  
  // Limpiar formulario
  document.getElementById('venta_cli').value = '';
  document.getElementById('venta_mon').value = '';
  
  toast(`✅ Venta creada: ${venta.id}`, 'success');
}
```

---

## 8. CSS para Estados de Conexión

Agregar a `styles.css`:

```css
/* Offline mode */
.offline-indicator {
  position: fixed;
  top: 0;
  right: 0;
  background: #dc3545;
  color: white;
  padding: 10px 15px;
  z-index: 1000;
  display: none;
}

.offline-indicator.show {
  display: block;
  animation: pulse 1s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Tabla de almacén con stock bajo */
.table-warning {
  background-color: #fff3cd;
}

.badge-sync {
  position: relative;
  display: inline-block;
}

.badge-sync.connecting::after {
  content: '';
  display: inline-block;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

---

## ✅ Checklist de Integración

- [ ] RealtimeClient cargado en `index.html`
- [ ] `inicializarRealtimeSync()` llamado después de login
- [ ] Todos los callbacks registrados
- [ ] Event handlers implementados
- [ ] Wrapper functions para crear/modificar
- [ ] HTML elements para status agregados
- [ ] Formularios actualizados para usar realtime
- [ ] Render functions actualizadas
- [ ] CSS para offline mode agregado
- [ ] Testeado: conexión, creación, offline mode
- [ ] Logs muestran eventos en consola

---

**Última actualización**: 2026-04-22
**Versión**: 1.0.0
