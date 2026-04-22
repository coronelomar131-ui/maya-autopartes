# Real-time Sync Bidireccional - Arquitectura Completa

## 📋 Índice
1. [Descripción General](#descripción-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Componentes Principales](#componentes-principales)
4. [Flujos de Datos](#flujos-de-datos)
5. [Manejo de Offline](#manejo-de-offline)
6. [Seguridad](#seguridad)
7. [Escalabilidad](#escalabilidad)

---

## 🎯 Descripción General

El sistema de Real-time Sync bidireccional permite que múltiples usuarios vean cambios en inventario, ventas y clientes **instantáneamente** sin recargar la página.

### Características Principales

✅ **Sincronización Bidireccional**: Cambios en UI → BD → Otros usuarios
✅ **Soporte Offline**: Cola de cambios locales cuando no hay conexión
✅ **Broadcasting**: Notificaciones a múltiples usuarios en salas
✅ **Consistencia de Datos**: Supabase como fuente única de verdad
✅ **Heartbeat**: Detección automática de desconexiones
✅ **Estadísticas**: Monitoreo de conexiones y eventos

---

## 🏗️ Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                        NAVEGADOR (USUARIO)                      │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  index.html / main.js / core.js / ui.js                 │  │
│  │  ├─ Formularios (Ventas, Almacén, Clientes)             │  │
│  │  └─ Render dinámico de tablas                           │  │
│  └──────────────────────────────────────────────────────────┘  │
│                           ▲                                     │
│                           │                                     │
│  ┌────────────────────────┴──────────────────────────────────┐  │
│  │  RealtimeClient (frontend/realtime-client.js)            │  │
│  │  ├─ Socket.io Cliente                                    │  │
│  │  ├─ Eventos IN: venta_creada, almacen_actualizado, etc   │  │
│  │  ├─ Eventos OUT: usuario_login, venta_creada, etc        │  │
│  │  └─ Offline Queue (localStorage)                         │  │
│  └────────────────────────┬──────────────────────────────────┘  │
│                           │                                     │
│                   WebSocket (TCP)                               │
│                           │                                     │
└───────────────────────────┼─────────────────────────────────────┘
                            │
            ┌───────────────┴────────────────┐
            │                                │
        ┌───▼────────────────────────────┐  │
        │  SERVIDOR REALTIME              │  │
        │  (backend/realtime/            │  │
        │   websocket.js)                │  │
        │                                │  │
        │  ┌──────────────────────────┐  │  │
        │  │ Socket.io Server         │  │  │
        │  │ ├─ connected_users Map   │  │  │
        │  │ ├─ rooms Map             │  │  │
        │  │ └─ offline_queue Map     │  │  │
        │  └──────────────────────────┘  │  │
        │                                │  │
        │  Eventos:                      │  │
        │  • usuario_login              │  │
        │  • venta_creada               │  │
        │  • venta_actualizada          │  │
        │  • almacen_actualizado        │  │
        │  • cliente_actualizado        │  │
        │  • usuario_conectado          │  │
        │  • usuario_desconectado       │  │
        │                                │  │
        └────────────┬───────────────────┘  │
                     │                      │
                     │ Propaga cambios      │
                     │                      │
        ┌────────────▼───────────────────┐  │
        │ SUPABASE SYNC MANAGER           │  │
        │ (backend/realtime/             │  │
        │  supabase-sync.js)             │  │
        │                                │  │
        │ Listeners:                     │  │
        │ • postgres_changes             │  │
        │   - ventas INSERT/UPDATE/DEL   │  │
        │   - almacen UPDATE             │  │
        │   - clientes UPDATE            │  │
        │                                │  │
        │ → Envía eventos al Socket.io   │  │
        └────────────┬───────────────────┘  │
                     │                      │
        ┌────────────▼───────────────────┐  │
        │  SUPABASE REALTIME             │  │
        │  (BD con Triggers PostgreSQL)  │  │
        │                                │  │
        │  Tablas:                       │  │
        │  • ventas                      │  │
        │  • almacen                     │  │
        │  • clientes                    │  │
        │  • usuarios                    │  │
        │                                │  │
        │  (Cambios en BD → eventos)     │  │
        └────────────────────────────────┘  │
                                             │
        ┌────────────────────────────────────┘
        │
        └──────────► A TODOS LOS USUARIOS CONECTADOS EN LA SALA
```

---

## 🔌 Componentes Principales

### 1. **RealtimeClient** (`frontend/realtime-client.js`)

**Ubicación**: Frontend (cliente del navegador)

**Responsabilidades**:
- Conectar al servidor WebSocket
- Escuchar eventos de cambios
- Actualizar UI en tiempo real
- Gestionar cola offline

**Métodos Públicos**:
```javascript
// Inicialización
await realtimeClient.inicializar(usuarioId, nombre);

// Emitir eventos
realtimeClient.ventaCreada(ventaData);
realtimeClient.ventaActualizada(ventaData);
realtimeClient.almacenActualizado(almacenData);
realtimeClient.clienteActualizado(clienteData);

// Ciclo de vida
realtimeClient.desconectar();
realtimeClient.reconectar();
```

**Eventos Escuchados**:
```javascript
- venta_creada → callback.onVentaCreada()
- venta_actualizada → callback.onVentaActualizada()
- venta_eliminada → callback.onVentaEliminada()
- almacen_actualizado → callback.onAlmacenActualizado()
- cliente_actualizado → callback.onClienteActualizado()
- usuario_conectado → callback.onUsuarioConectado()
- usuario_desconectado → callback.onUsuarioDesconectado()
- estado_conexion → callback.onEstadoConexion()
```

---

### 2. **WebSocket Server** (`backend/realtime/websocket.js`)

**Ubicación**: Backend (Node.js)

**Responsabilidades**:
- Aceptar conexiones de Socket.io
- Gestionar salas de usuarios
- Propagar eventos entre clientes
- Mantener cola offline
- Monitorear conexiones inactivas

**Estructura de Datos**:
```javascript
connectedUsers: Map<socketId, userInfo>
  userInfo: {
    socketId: string,
    usuarioId: string,
    nombre: string,
    sala: string,
    timestamp: ISO string,
    activo: boolean,
    ultimaActividad: Date
  }

rooms: Map<roomName, Set<socketIds>>
  Ejemplo: 'global' → {socket1, socket2, socket3}

offlineQueue: Map<usuarioId, evento[]>
```

**Eventos Emitidos**:
```javascript
// Entrada
socket.on('usuario_login', userData, callback)
socket.on('venta_creada', ventaData, callback)
socket.on('venta_actualizada', ventaData, callback)
socket.on('almacen_actualizado', almacenData, callback)
socket.on('cliente_actualizado', clienteData, callback)
socket.on('solicitar_sincronizacion', filtros, callback)
socket.on('ping') → responde con 'pong'

// Salida
socket.to(sala).emit('venta_creada', evento)
socket.to(sala).emit('venta_actualizada', evento)
io.to(sala).emit('usuario_conectado', evento)
io.to(sala).emit('usuario_desconectado', evento)
```

---

### 3. **Supabase Sync Manager** (`backend/realtime/supabase-sync.js`)

**Ubicación**: Backend (conecta BD con WebSocket)

**Responsabilidades**:
- Escuchar cambios en Supabase Realtime
- Procesar eventos de BD (INSERT/UPDATE/DELETE)
- Propagar cambios a clientes conectados
- Detectar cambios específicos
- Generar alertas (stock bajo, etc.)

**Listeners Configurados**:
```javascript
// Tabla: ventas
- INSERT → venta_creada
- UPDATE → venta_actualizada (detecta cambios)
- DELETE → venta_eliminada

// Tabla: almacen
- UPDATE → almacen_actualizado (calcula diferencia de stock)
  - Si stock < 10 → alerta_stock_bajo

// Tabla: clientes
- UPDATE → cliente_actualizado (detecta cambios)
```

**Flujo de Eventos**:
```
BD (INSERT/UPDATE/DELETE)
    ↓ (Trigger PostgreSQL)
Supabase Realtime
    ↓ (postgres_changes event)
SupabaseSyncManager
    ↓ (io.emit())
Socket.io Server
    ↓ (socket.to(sala).emit())
Todos los clientes en la sala
    ↓ (callback activado)
Actualizar UI en tiempo real
```

---

## 📊 Flujos de Datos

### Flujo 1: Usuario crea una venta

```
1. Usuario rellena formulario en UI
   ↓
2. JavaScript: core.js/ui.js valida y guarda localmente
   ↓
3. realtimeClient.ventaCreada(ventaData)
   ├─ Si conectado → socket.emit('venta_creada', data)
   └─ Si offline → encolada en offlineQueue
   ↓
4. WebSocket Server recibe 'venta_creada'
   ├─ Valida usuario autenticado
   ├─ Crea objeto evento con metadata
   └─ socket.to(sala).emit('venta_creada', evento)
   ↓
5. API Backend sincroniza con Supabase
   └─ INSERT en tabla ventas
   ↓
6. Supabase Realtime dispara evento INSERT
   ↓
7. SupabaseSyncManager recibe postgres_changes
   └─ io.emit('venta_creada', evento) ← broadcast
   ↓
8. Todos los clientes reciben 'venta_creada'
   ├─ RealtimeClient escucha el evento
   ├─ Llama callback.onVentaCreada(evento)
   └─ UI actualiza tabla de ventas
   ↓
9. ✅ Otros usuarios ven la nueva venta SIN REFRESH
```

---

### Flujo 2: Usuario está offline

```
1. Usuario crea/modifica venta (sin conexión)
   ↓
2. realtimeClient.ventaCreada()
   └─ No está conectado → offlineQueue.push(evento)
      + Guardado en localStorage
   ↓
3. Usuario rellena más formularios
   └─ Todos van a la cola local
   ↓
4. [Reconexión automática]
   ├─ Socket.io detecta conexión
   ├─ websocket.js: usuario_login nuevamente
   └─ Envía offlineQueue desde localStorage
   ↓
5. WebSocket Server procesa la cola
   └─ Emite cada evento a la sala
   ↓
6. SupabaseSyncManager sincroniza con BD
   └─ INSERT/UPDATE varios registros
   ↓
7. Todos los clientes reciben todos los eventos
   ├─ Tablas se actualizan progresivamente
   └─ UI refleja todos los cambios offline
   ↓
8. ✅ Sincronización completa sin conflictos
```

---

### Flujo 3: Múltiples usuarios editan almacén

```
Usuario A                    Usuario B                Servidor/BD
─────────                    ─────────                ───────────

Edita stock: 100 → 95
    ├─ API POST /almacen
    │  {productoId: 1, nuevoStock: 95}
    │                                    → INSERT log_cambio
    │                                    → UPDATE almacen SET cantidad=95
    │                                    ↓
    │                            Supabase Realtime
    │                            (postgres_changes)
    │                                    ↓
    │                        SupabaseSyncManager
    │                        .on('almacen.UPDATE')
    │                                    ↓
    │                        io.to('global').emit(
    │                          'almacen_actualizado', {
    │                            productoId: 1,
    │                            stockAnterior: 100,
    │                            stockNuevo: 95,
    │                            diferencia: -5
    │                          })
    │
    ├─────────────────────────────────────┼─────────────────┐
    │                                      │                 │
 Recibe evento ←────────────────────────────────────── Recibe evento
 ✅ Tabla actualiza: 100 → 95  Edita stock: 95 → 90  ✅ Tabla actualiza: 95 → 90
    │
    └─ onAlmacenActualizado()
       renderA() actualiza tabla

                              ├─ API POST /almacen
                              │  {productoId: 1, nuevoStock: 90}
                              │                                   → UPDATE almacen SET cantidad=90
```

---

## 🔄 Manejo de Offline

### Mecánica de Cola Local

**Almacenamiento**:
```javascript
// localStorage
realtime_offline_queue = [
  {
    tipo: 'venta_creada',
    data: { id: 'v-123', monto: 5000, ... },
    timestamp: '2026-04-22T12:30:00Z',
    intentos: 0
  },
  {
    tipo: 'almacen_actualizado',
    data: { productoId: 'p-1', nuevaCantidad: 95 },
    timestamp: '2026-04-22T12:31:00Z',
    intentos: 0
  },
  ...
]
```

**Encolamiento**:
```javascript
if (!isConnected) {
  offlineQueue.push({
    tipo, data, timestamp: now, intentos: 0
  });
  localStorage.setItem('realtime_offline_queue', JSON.stringify(offlineQueue));
}
```

**Sincronización al Reconectar**:
```javascript
socket.on('connect', () => {
  // 1. Cargar cola desde localStorage
  const cola = JSON.parse(localStorage.getItem('realtime_offline_queue'));
  
  // 2. Procesar cada cambio
  for (const cambio of cola) {
    switch(cambio.tipo) {
      case 'venta_creada':
        ventaCreada(cambio.data);
        break;
      ...
    }
    await sleep(100); // Evitar spam
  }
  
  // 3. Limpiar cola
  localStorage.removeItem('realtime_offline_queue');
});
```

**Límites**:
- Máximo 100 eventos en cola
- Tamaño máximo por evento: 1 MB
- Si la cola está llena, se descarta el evento más antiguo

---

## 🔐 Seguridad

### Autenticación

```javascript
// En usuario_login, validar:
1. usuarioId existe en BD
2. Token JWT válido (si aplica)
3. Usuario tiene permisos en sala

// Ejemplo:
socket.on('usuario_login', (userData, callback) => {
  const { usuarioId, nombre } = userData;
  
  if (!usuarioId || !validarToken(userData.token)) {
    return callback({ error: 'No autorizado' });
  }
  
  // Proceder con login
});
```

### Autorización

```javascript
// Validar cada evento:
1. Usuario está autenticado (en connectedUsers)
2. Usuario tiene permisos para la sala
3. Datos no contienen información sensible

// Ejemplo:
socket.on('venta_creada', (ventaData, callback) => {
  const userInfo = connectedUsers.get(socket.id);
  
  if (!userInfo) {
    return callback({ error: 'Usuario no autenticado' });
  }
  
  if (!tienePermiso(userInfo.usuarioId, 'crear_venta')) {
    return callback({ error: 'Permiso denegado' });
  }
  
  // Proceder
});
```

### Encriptación

- Usar HTTPS/WSS en producción
- Socket.io maneja TLS automáticamente
- Datos sensibles (contraseñas, tokens) nunca en eventos

### Validación

```javascript
// Backend valida TODOS los datos recibidos
const { body, validationResult } = require('express-validator');

app.post('/api/venta', [
  body('monto').isFloat({ min: 0 }),
  body('clienteId').isString(),
  // ...
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  // Proceder
});
```

---

## 📈 Escalabilidad

### Para 10-50 Usuarios

**Configuración Recomendada**:
```javascript
// websocket.js
const io = socketIO(server, {
  pingInterval: 25000,
  pingTimeout: 20000,
  maxHttpBufferSize: 1e6 // 1 MB
});

// Suficiente con un único servidor Node.js
```

### Para 50-500 Usuarios

**Redis Adapter** (para múltiples servidores):
```javascript
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');

const pubClient = createClient({ host: 'localhost', port: 6379 });
const subClient = pubClient.duplicate();

io.adapter(createAdapter(pubClient, subClient));
```

**Ventajas**:
- Múltiples servidores Node.js
- Un usuario en servidor A, otro en servidor B → sincronización
- Supabase como fuente de verdad

---

### Para 500+ Usuarios

**Arquitectura Distribuida**:
```
     Balanceador de Carga (nginx/haproxy)
            ↓
    ┌───────┬───────┬────────┐
    │       │       │        │
 Server A  Server B Server C Server D
    │       │       │        │
    └───────┴───────┴────────┘
            ↓
    Redis Cluster (pub/sub)
            ↓
      Supabase (RLS)
```

**Implementación**:
```javascript
// .env
REDIS_URL=redis://redis-cluster:6379
SOCKET_IO_ADAPTER=redis

// Código
const { createAdapter } = require('@socket.io/redis-adapter');
const redis = require('redis');

const client = redis.createClient({
  url: process.env.REDIS_URL
});

io.adapter(createAdapter(client));
```

---

## 🚀 Deployment

### Vercel (Frontend)

```bash
# package.json
"build": "npm run build"

# .vercelignore
backend/
*.md
sql/
```

### Heroku/Railway (Backend)

```bash
# Procfile
web: node backend/realtime/websocket.js

# Buildpacks
- nodejs
- redis (si usas Redis adapter)
```

### Variábles de Entorno

```bash
# Backend .env
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
FRONTEND_URL=https://maya-autopartes.vercel.app
PORT=3001
LOG_LEVEL=info
REDIS_URL=redis://... (si aplica)
```

---

## 📊 Monitoreo y Estadísticas

### Endpoints de Health Check

```javascript
GET /health
{
  "status": "ok",
  "realtime": {
    "usuariosConectados": 42,
    "salas": 5,
    "eventosEnCola": 12
  },
  "timestamp": "2026-04-22T12:00:00Z"
}

GET /stats
{
  "usuariosConectados": 42,
  "salas": [
    { "nombre": "global", "usuariosTotales": 30 },
    { "nombre": "team-a", "usuariosTotales": 12 }
  ],
  "timestamp": "2026-04-22T12:00:00Z"
}
```

### Logs

Todos los eventos se registran en `./logs/`:
- `realtime-info.log` - Operaciones normales
- `realtime-error.log` - Errores
- `realtime-debug.log` - Detalles de depuración

---

## ✅ Checklist de Implementación

- [ ] `backend/realtime/websocket.js` creado y configurado
- [ ] `backend/realtime/supabase-sync.js` escuchando cambios
- [ ] `frontend/realtime-client.js` importado en main.js
- [ ] Callbacks implementados en core.js/ui.js
- [ ] Socket.io agregado a `backend/package.json`
- [ ] Variables de entorno configuradas
- [ ] Tests de conectividad completados
- [ ] Documentación de eventos WEBSOCKET_EVENTS.md
- [ ] Guía de testing REALTIME_TESTING.md

---

## 🔗 Referencias Relacionadas

- [WEBSOCKET_EVENTS.md](./WEBSOCKET_EVENTS.md) - Especificación de eventos
- [REALTIME_TESTING.md](./REALTIME_TESTING.md) - Guía de testing
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura general del proyecto
- [Socket.io Documentation](https://socket.io/docs/)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)

---

**Última actualización**: 2026-04-22
**Versión**: 1.0.0
**Autor**: Maya Autopartes Dev Team
