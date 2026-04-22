# WebSocket Events - Referencia Completa

## 📡 Tabla de Contenidos

1. [Eventos de Autenticación](#eventos-de-autenticación)
2. [Eventos de Ventas](#eventos-de-ventas)
3. [Eventos de Almacén](#eventos-de-almacén)
4. [Eventos de Clientes](#eventos-de-clientes)
5. [Eventos de Usuarios](#eventos-de-usuarios)
6. [Eventos de Sincronización](#eventos-de-sincronización)
7. [Eventos de Conexión](#eventos-de-conexión)

---

## 🔐 Eventos de Autenticación

### `usuario_login`

**Dirección**: Cliente → Servidor

**Descripción**: Autenticar usuario cuando entra a la aplicación

**Payload Enviado**:
```javascript
{
  usuarioId: "user-123",           // ID único del usuario
  nombre: "Juan Pérez",            // Nombre completo
  email: "juan@example.com",       // Email
  sala: "global",                  // Sala a unirse (default: global)
  timestamp: "2026-04-22T12:00:00Z" // ISO timestamp
}
```

**Respuesta (Callback)**:
```javascript
// Éxito
{
  success: true,
  socketId: "socket-xyz",         // ID único de la conexión
  usuariosTotales: 15,            // Usuarios en la sala
  eventosEnEspera: 0,             // Eventos offline pendientes
  cola: []                        // Eventos para sincronizar
}

// Error
{
  error: "Datos de usuario incompletos"
}
```

**Ejemplo de Uso**:
```javascript
realtimeClient.inicializar('user-123', 'Juan Pérez').then(() => {
  console.log('✅ Usuario autenticado');
});
```

---

## 📝 Eventos de Ventas

### `venta_creada`

**Dirección Bidireccional**: Cliente ↔ Servidor

**Descripción**: Se creó una nueva venta

**Cliente → Servidor**:
```javascript
realtimeClient.ventaCreada({
  id: "v-12345",                  // ID único de venta
  clienteId: "c-456",
  cliente: "Auto Parts SRL",
  monto: 5000.00,
  items: [
    { productoId: "p-1", cantidad: 2, precio: 2500 }
  ],
  concepto: "Venta general",
  estado: "pendiente",
  fecha: "2026-04-22",
  usuario_id: "user-123"
})
```

**Servidor → Otros Clientes (broadcast)**:
```javascript
{
  tipo: "venta_creada",
  ventaId: "v-12345",
  data: { /* objeto completo */ },
  usuario: "Juan Pérez",          // Nombre de quien la creó
  usuarioId: "user-123",
  timestamp: "2026-04-22T12:00:00Z",
  sala: "global",
  fuente: "cliente"               // o "supabase"
}
```

**Callback en Cliente**:
```javascript
realtimeClient.callbacks.onVentaCreada = (evento) => {
  console.log(`Nueva venta de ${evento.usuario}: ${evento.ventaId}`);
  // Actualizar tabla de ventas
  agregarVentaATabla(evento.data);
};
```

**Validaciones Backend**:
- ✅ Usuario autenticado
- ✅ Permisos para crear ventas
- ✅ Monto > 0
- ✅ Cliente existe
- ✅ Productos existen

---

### `venta_actualizada`

**Dirección Bidireccional**: Cliente ↔ Servidor

**Descripción**: Se modificó una venta existente

**Cliente → Servidor**:
```javascript
realtimeClient.ventaActualizada({
  id: "v-12345",
  monto: 5500.00,                 // Cambio
  estado: "completada",           // Cambio
  cambios: {                       // Opcional: describir qué cambió
    monto: { anterior: 5000, nuevo: 5500 },
    estado: { anterior: "pendiente", nuevo: "completada" }
  }
})
```

**Servidor → Otros Clientes**:
```javascript
{
  tipo: "venta_actualizada",
  ventaId: "v-12345",
  data: { /* objeto actualizado */ },
  cambios: {                      // Cambios detectados
    monto: { anterior: 5000, nuevo: 5500 },
    estado: { anterior: "pendiente", nuevo: "completada" }
  },
  anterior: { /* objeto antes */ },
  usuario: "Juan Pérez",
  usuarioId: "user-123",
  timestamp: "2026-04-22T12:01:00Z",
  sala: "global",
  fuente: "cliente"
}
```

**Callback en Cliente**:
```javascript
realtimeClient.callbacks.onVentaActualizada = (evento) => {
  // Actualizar fila específica de la venta
  actualizarVentaEnTabla(evento.ventaId, evento.data);
  
  // Mostrar cambios
  mostrarToast(`${evento.usuario} actualizó venta ${evento.ventaId}`);
};
```

---

### `venta_eliminada`

**Dirección Bidireccional**: Cliente ↔ Servidor

**Descripción**: Se eliminó una venta

**Cliente → Servidor**:
```javascript
realtimeClient.ventaEliminada({
  id: "v-12345"
})
```

**Servidor → Otros Clientes**:
```javascript
{
  tipo: "venta_eliminada",
  ventaId: "v-12345",
  usuario: "Juan Pérez",
  usuarioId: "user-123",
  timestamp: "2026-04-22T12:02:00Z",
  sala: "global"
}
```

**Callback en Cliente**:
```javascript
realtimeClient.callbacks.onVentaEliminada = (evento) => {
  // Remover fila de la tabla
  removerVentaDeTabla(evento.ventaId);
  
  mostrarToast(`${evento.usuario} eliminó venta ${evento.ventaId}`);
};
```

---

## 📦 Eventos de Almacén

### `almacen_actualizado`

**Dirección Bidireccional**: Cliente ↔ Servidor

**Descripción**: El stock de un producto fue modificado

**Cliente → Servidor**:
```javascript
realtimeClient.almacenActualizado({
  productoId: "p-1",              // ID del producto
  nombreProducto: "Filtro de Aire",
  stockAnterior: 100,
  stockNuevo: 95,
  diferencia: -5,                 // Automático si no se envía
  concepto: "Venta",              // Razón del cambio
  precio: 250.00                  // Precio actual
})
```

**Servidor → Otros Clientes**:
```javascript
{
  tipo: "almacen_actualizado",
  productoId: "p-1",
  producto: "Filtro de Aire",
  stockAnterior: 100,
  stockNuevo: 95,
  diferencia: -5,                 // Cambio (negativo = salida)
  concepto: "Venta",
  usuario: "Juan Pérez",
  usuarioId: "user-123",
  precioActual: 250.00,
  timestamp: "2026-04-22T12:03:00Z",
  sala: "global",
  fuente: "cliente"
}
```

**Eventos Derivados**:

#### `alerta_stock_bajo` (automático)

Se dispara automáticamente si stock cae por debajo de 10:

```javascript
{
  tipo: "alerta_stock_bajo",
  productoId: "p-1",
  producto: "Filtro de Aire",
  stockActual: 5,
  timestamp: "2026-04-22T12:03:00Z"
}
```

**Callback en Cliente**:
```javascript
realtimeClient.callbacks.onAlmacenActualizado = (evento) => {
  // Actualizar fila del producto en tabla de almacén
  actualizarProductoEnTabla(evento.productoId, evento.stockNuevo);
  
  // Cambiar color de fila si stock es bajo
  if (evento.stockNuevo < 10) {
    resaltarProducto(evento.productoId, 'rojo');
  }
  
  mostrarToast(`Stock de ${evento.producto}: ${evento.stockAnterior} → ${evento.stockNuevo}`);
};

// Escuchar alertas de stock bajo
socket.on('alerta_stock_bajo', (evento) => {
  mostrarNotificacion('⚠️ STOCK BAJO: ' + evento.producto);
});
```

---

## 👥 Eventos de Clientes

### `cliente_actualizado`

**Dirección Bidireccional**: Cliente ↔ Servidor

**Descripción**: Datos de cliente fueron modificados

**Cliente → Servidor**:
```javascript
realtimeClient.clienteActualizado({
  id: "c-456",
  nombre: "Auto Parts SRL",       // Cambio
  contacto: "John Doe",           // Cambio
  email: "john@autoparts.com",
  telefono: "+56 9 1234 5678",
  ciudad: "Santiago",
  cambios: {                       // Describir cambios
    nombre: { anterior: "Auto Parts", nuevo: "Auto Parts SRL" },
    contacto: { anterior: "Jane", nuevo: "John Doe" }
  }
})
```

**Servidor → Otros Clientes**:
```javascript
{
  tipo: "cliente_actualizado",
  clienteId: "c-456",
  nombreCliente: "Auto Parts SRL",
  cambios: {
    nombre: { anterior: "Auto Parts", nuevo: "Auto Parts SRL" },
    contacto: { anterior: "Jane", nuevo: "John Doe" }
  },
  data: { /* objeto completo */ },
  usuario: "Juan Pérez",
  usuarioId: "user-123",
  timestamp: "2026-04-22T12:04:00Z",
  sala: "global",
  fuente: "cliente"
}
```

**Callback en Cliente**:
```javascript
realtimeClient.callbacks.onClienteActualizado = (evento) => {
  // Actualizar cliente en tabla
  actualizarClienteEnTabla(evento.clienteId, evento.data);
  
  mostrarToast(`${evento.usuario} actualizó cliente ${evento.nombreCliente}`);
};
```

---

## 👨‍💼 Eventos de Usuarios

### `usuario_conectado`

**Dirección**: Servidor → Clientes

**Descripción**: Un usuario se conectó a la aplicación

**Payload**:
```javascript
{
  usuarioId: "user-123",
  nombre: "Juan Pérez",
  timestamp: "2026-04-22T12:05:00Z",
  usuariosTotales: 16              // Total en la sala
}
```

**Callback en Cliente**:
```javascript
realtimeClient.callbacks.onUsuarioConectado = (evento) => {
  mostrarToast(`✅ ${evento.nombre} se conectó`);
  actualizarContadorUsuarios(evento.usuariosTotales);
  
  // Actualizar lista de usuarios activos
  agregarUsuarioActivo({
    id: evento.usuarioId,
    nombre: evento.nombre,
    estado: 'activo'
  });
};
```

---

### `usuario_desconectado`

**Dirección**: Servidor → Clientes

**Descripción**: Un usuario se desconectó

**Payload**:
```javascript
{
  usuarioId: "user-123",
  nombre: "Juan Pérez",
  timestamp: "2026-04-22T12:06:00Z",
  usuariosTotales: 15              // Total en la sala
}
```

**Callback en Cliente**:
```javascript
realtimeClient.callbacks.onUsuarioDesconectado = (evento) => {
  mostrarToast(`❌ ${evento.nombre} se desconectó`);
  actualizarContadorUsuarios(evento.usuariosTotales);
  
  // Remover de lista de usuarios activos
  removerUsuarioActivo(evento.usuarioId);
};
```

---

## 🔄 Eventos de Sincronización

### `solicitar_sincronizacion`

**Dirección**: Cliente → Servidor

**Descripción**: Cliente solicita sincronización completa de datos

**Cliente → Servidor**:
```javascript
realtimeClient.solicitarSincronizacion({
  filtros: {
    tipo: "ventas",               // 'ventas', 'almacen', 'clientes'
    desde: "2026-04-20",          // Opcional
    hasta: "2026-04-22",          // Opcional
    estado: "pendiente"           // Opcional
  }
})
```

**Servidor → Cliente**:
```javascript
// Emite evento para iniciar sincronización
socket.emit('iniciar_sincronizacion', {
  timestamp: "2026-04-22T12:07:00Z",
  filtros: { tipo: "ventas" }
})

// Luego envía los datos:
socket.emit('datos_sincronizacion', {
  tipo: "ventas",
  items: [ /* array de ventas */ ],
  total: 45,
  timestamp: "2026-04-22T12:07:01Z"
})
```

**Callback en Cliente**:
```javascript
// Manejar sincronización completa
socket.on('datos_sincronizacion', (evento) => {
  if (evento.tipo === 'ventas') {
    // Reemplazar ventas locales
    ventas.length = 0;
    ventas.push(...evento.items);
    
    // Actualizar UI
    renderV();
    mostrarToast(`✅ Sincronizadas ${evento.total} ventas`);
  }
});
```

---

## 🔌 Eventos de Conexión

### `ping / pong`

**Dirección**: Bidireccional (heartbeat)

**Descripción**: Mantener conexión viva y detectar desconexiones

**Cliente → Servidor** (cada 30 segundos):
```javascript
socket.emit('ping');
```

**Servidor → Cliente** (respuesta):
```javascript
socket.emit('pong');
```

**Implementación**:
```javascript
// RealtimeClient lo maneja automáticamente
setInterval(() => {
  if (isConnected) {
    socket.emit('ping');
  }
}, 30000);
```

---

### Eventos de Sistema (Socket.io nativos)

```javascript
// Conexión exitosa
socket.on('connect', () => {
  console.log('✅ Conectado al servidor');
});

// Desconexión
socket.on('disconnect', () => {
  console.log('❌ Desconectado del servidor');
});

// Error de conexión
socket.on('connect_error', (error) => {
  console.error('Error de conexión:', error);
});

// Reconexión
socket.on('reconnect', () => {
  console.log('🔄 Reconectado');
});

// Fallo de reconexión
socket.on('reconnect_failed', () => {
  console.error('❌ No se pudo reconectar');
});
```

---

## 📊 Evento: `estado_conexion`

**Dirección**: Servidor → Cliente

**Descripción**: Cambio en estado de la conexión

**Payload**:
```javascript
{
  estado: "conectado",            // o "desconectado"
  isConnected: true,
  usuariosTotales: 16,
  timestamp: "2026-04-22T12:08:00Z"
}
```

**Callback en Cliente**:
```javascript
realtimeClient.callbacks.onEstadoConexion = (estado) => {
  if (estado.estado === 'conectado') {
    // Mostrar badge verde
    document.getElementById('status-badge').innerHTML = '🟢 Conectado';
    document.getElementById('usuario-count').innerHTML = `${estado.usuariosTotales} usuarios`;
  } else {
    // Mostrar badge rojo
    document.getElementById('status-badge').innerHTML = '🔴 Desconectado';
  }
};
```

---

## ⚠️ Evento: `error_conexion`

**Dirección**: Servidor → Cliente

**Descripción**: Error en operación de realtime

**Payload**:
```javascript
{
  tipo: "inicializacion",         // o "conexion", "evento", etc
  error: "Error message here"
}
```

**Callback en Cliente**:
```javascript
realtimeClient.callbacks.onErrorConexion = (error) => {
  console.error(`Error [${error.tipo}]: ${error.error}`);
  
  if (error.tipo === 'inicializacion') {
    mostrarToast('❌ Error al conectar. Reintentando...');
  }
};
```

---

## 📋 Tabla Resumen de Eventos

| Evento | Dirección | Descripción | Cola Offline |
|--------|-----------|-------------|--------------|
| `usuario_login` | C→S | Autenticar usuario | ❌ |
| `venta_creada` | C↔S | Nueva venta | ✅ |
| `venta_actualizada` | C↔S | Venta modificada | ✅ |
| `venta_eliminada` | C↔S | Venta eliminada | ✅ |
| `almacen_actualizado` | C↔S | Stock modificado | ✅ |
| `alerta_stock_bajo` | S→C | Stock bajo | - |
| `cliente_actualizado` | C↔S | Cliente modificado | ✅ |
| `usuario_conectado` | S→C | Usuario se conectó | - |
| `usuario_desconectado` | S→C | Usuario se desconectó | - |
| `solicitar_sincronizacion` | C→S | Sincronización | - |
| `ping/pong` | C↔S | Heartbeat | - |
| `estado_conexion` | S→C | Cambio de estado | - |
| `error_conexion` | S→C | Error | - |

**Leyenda**:
- C→S: Cliente hacia Servidor
- S→C: Servidor hacia Cliente
- C↔S: Bidireccional (broadcast)
- ✅ Cola Offline: Se encola si está offline
- ❌ No se encola
- `-` No aplica

---

## 🔗 Integración con Core.js

### Eventos a escuchar en `main.js`

```javascript
// Después de inicializar realtimeClient
realtimeClient.callbacks.onVentaCreada = (evento) => {
  // Agregar a array ventas
  ventas.push(evento.data);
  // Re-renderizar tabla
  renderV();
};

realtimeClient.callbacks.onAlmacenActualizado = (evento) => {
  // Buscar producto y actualizar
  const producto = findProductoById(evento.productoId);
  if (producto) {
    producto.cantidad = evento.stockNuevo;
    renderA();
  }
};

// ... etc para otros eventos
```

---

**Última actualización**: 2026-04-22
**Versión**: 1.0.0
**Socket.io Version**: 4.5.4+
