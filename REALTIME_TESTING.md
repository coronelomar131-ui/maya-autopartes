# Real-time Sync - Guía de Testing Completa

## 📋 Tabla de Contenidos

1. [Setup de Testing](#setup-de-testing)
2. [Testing Manual](#testing-manual)
3. [Testing Automatizado](#testing-automatizado)
4. [Escenarios de Prueba](#escenarios-de-prueba)
5. [Debugging](#debugging)
6. [Checklist de QA](#checklist-de-qa)

---

## 🛠️ Setup de Testing

### Requisitos

```bash
# Node.js 16+
node --version

# npm
npm --version

# Dependencias instaladas
cd backend
npm install socket.io
npm install

# Supabase configurado y activo
# SUPABASE_URL y SUPABASE_ANON_KEY en .env
```

### Estructura de Archivos

```
maya-autopartes-working/
├── backend/
│   ├── realtime/
│   │   ├── websocket.js         ✅ Servidor WebSocket
│   │   ├── supabase-sync.js     ✅ Sync con BD
│   │   └── logger.js            ✅ Sistema de logs
│   └── package.json             ✅ socket.io agregado
├── frontend/
│   ├── realtime-client.js       ✅ Cliente WebSocket
│   └── index.html               (agregar referencias)
├── main.js                       (agregar callbacks)
└── core.js                       (agregar listeners)
```

### Inicializar Servidor

```bash
# Terminal 1: Backend
cd backend
npm install
node realtime/websocket.js

# Output esperado:
# 🚀 WebSocket Server corriendo en puerto 3001
# ✅ Todas las suscripciones inicializadas (de Supabase)
```

### Inicializar Frontend

```bash
# Terminal 2: Frontend (usar live-server o similar)
npx http-server .

# O abrir directamente en navegador
file:///C:/Users/omar/maya-autopartes-working/index.html
```

---

## 🧪 Testing Manual

### Escenario 1: Conexión Básica

**Objetivo**: Verificar que cliente se conecta al servidor

**Pasos**:
1. Abre navegador en `http://localhost:8080/index.html`
2. Abre DevTools (F12)
3. En Console, ejecuta:

```javascript
// Crear instancia de cliente
const realtime = new RealtimeClient({
  serverUrl: 'http://localhost:3001',
  debug: true
});

// Inicializar
await realtime.inicializar('user-test-1', 'Tester Uno');
```

**Resultado Esperado**:
```
[RealtimeClient] ✅ RealtimeClient inicializado
[RealtimeClient] Conectando a WebSocket server...
[RealtimeClient] ✅ Conectado al servidor WebSocket
[RealtimeClient] ✅ Usuario autenticado en sala: global
```

**Verificación en Backend**:
```bash
# En logs o console del backend
Cliente conectado: socket-id-xxx
Usuario Tester Uno (user-test-1) se unió a sala: global
✅ Supabase Realtime listeners configurados
```

---

### Escenario 2: Crear Venta

**Objetivo**: Verificar que eventos se propagan entre usuarios

**Setup**:
- Abre 2 navegadores (Usuario A y Usuario B)
- Inicializa RealtimeClient en ambos

**Pasos - Usuario A**:

```javascript
// En consola del navegador A
realtime.ventaCreada({
  id: 'v-test-1',
  clienteId: 'c-123',
  cliente: 'Test Cliente',
  monto: 5000,
  items: [
    { productoId: 'p-1', cantidad: 2, precio: 2500 }
  ],
  concepto: 'Venta de prueba',
  estado: 'pendiente',
  fecha: new Date().toISOString().split('T')[0],
  usuario_id: 'user-test-1'
});
```

**Resultado Esperado - Usuario A**:
```
[RealtimeClient] Cambio encolado (1): venta_creada
// O si está conectado:
[RealtimeClient] Cambio encolado (0): venta_creada
```

**Resultado Esperado - Usuario B**:
```javascript
// El callback se ejecuta automáticamente
onVentaCreada → evento recibido {
  tipo: 'venta_creada',
  ventaId: 'v-test-1',
  usuario: 'Tester Uno',
  timestamp: '2026-04-22T...',
  ...
}
```

---

### Escenario 3: Actualizar Stock

**Objetivo**: Verificar cambios de almacén y alertas

**Pasos - Usuario A**:

```javascript
realtime.almacenActualizado({
  productoId: 'p-1',
  nombreProducto: 'Filtro de Aire',
  stockAnterior: 100,
  stockNuevo: 95,
  diferencia: -5,
  concepto: 'Venta',
  precio: 250.00
});
```

**Resultado Esperado**:

1. **Usuario A**: Evento se envía
2. **Usuario B**: Recibe evento
   ```javascript
   onAlmacenActualizado → {
     tipo: 'almacen_actualizado',
     producto: 'Filtro de Aire',
     stockAnterior: 100,
     stockNuevo: 95,
     diferencia: -5
   }
   ```
3. **Ambos**: Si stockNuevo < 10, se dispara alerta_stock_bajo

---

### Escenario 4: Desconexión y Offline

**Objetivo**: Verificar manejo de offline y reconexión

**Pasos**:

```javascript
// 1. Abrir DevTools Network
// 2. Desactivar conexión: DevTools → Network → "Offline"
// 3. En consola, hacer cambios:

realtime.ventaCreada({
  id: 'v-offline-1',
  cliente: 'Cliente Offline',
  monto: 3000,
  // ...
});

// 4. Verificar en localStorage
localStorage.getItem('realtime_offline_queue')
// Output: Array con eventos

// 5. Reactivar conexión: DevTools → Network → "No throttling"
```

**Resultado Esperado**:

```javascript
// Reconexión automática
[RealtimeClient] ✅ Conectado al servidor WebSocket
[RealtimeClient] Cola offline cargada: 1 items
[RealtimeClient] Procesando 1 cambios offline...
[RealtimeClient] ✅ Cola offline procesada

// En localStorage, la cola se vacía
localStorage.getItem('realtime_offline_queue')
// Output: null o []
```

---

### Escenario 5: Múltiples Usuarios Simultáneamente

**Objetivo**: Verificar broadcast correcto

**Setup**:
- Abre 3 navegadores (Usuarios A, B, C)
- Inicializa en todos

**Pasos**:

```javascript
// Usuario A: Crear venta
realtime.ventaCreada({ id: 'v-abc', cliente: 'Test', monto: 1000 });

// Usuario B: Actualizar almacén
realtime.almacenActualizado({ productoId: 'p-1', stockNuevo: 50 });

// Usuario C: Modificar cliente
realtime.clienteActualizado({ id: 'c-1', nombre: 'Nuevo Nombre' });
```

**Resultado Esperado**:

| Usuario A | Usuario B | Usuario C |
|-----------|-----------|-----------|
| Envía venta | Recibe venta ✅ | Recibe venta ✅ |
| Recibe almacén ✅ | Envía almacén | Recibe almacén ✅ |
| Recibe cliente ✅ | Recibe cliente ✅ | Envía cliente |

---

### Escenario 6: Desconexión Limpia

**Objetivo**: Verificar que otros usuarios se notifiquen

**Pasos**:

```javascript
// Usuario A: Desconectar
realtime.desconectar();
```

**Resultado Esperado - Usuario B**:
```javascript
onUsuarioDesconectado → {
  usuarioId: 'user-test-1',
  nombre: 'Tester Uno',
  usuariosTotales: 1 // Bajó de 2 a 1
}
```

---

## 🤖 Testing Automatizado

### Test Suite con Jest

Crea `backend/realtime/__tests__/websocket.test.js`:

```javascript
/**
 * Test Suite para WebSocket Server
 */

const { io: ioClient } = require('socket.io-client');
const { server, io: ioServer } = require('../websocket');

describe('WebSocket Server', () => {
  let clientSocket;
  let clientSocket2;

  beforeEach((done) => {
    // Iniciar servidor
    server.listen(() => {
      const port = server.address().port;

      // Crear cliente de prueba
      clientSocket = ioClient(`http://localhost:${port}`, {
        reconnectionDelay: 0,
        rejectUnauthorized: false
      });

      clientSocket.on('connect', done);
    });
  });

  afterEach(() => {
    ioServer.close();
    clientSocket.close();
    if (clientSocket2) clientSocket2.close();
  });

  test('Usuario puede autenticarse', (done) => {
    clientSocket.emit('usuario_login', {
      usuarioId: 'user-1',
      nombre: 'Test User',
      sala: 'global'
    }, (response) => {
      expect(response.success).toBe(true);
      expect(response.socketId).toBeDefined();
      expect(response.usuariosTotales).toBeGreaterThan(0);
      done();
    });
  });

  test('Venta creada se broadcast a otros usuarios', (done) => {
    // Usuario 1 se conecta
    clientSocket.emit('usuario_login', {
      usuarioId: 'user-1',
      nombre: 'User 1',
      sala: 'global'
    }, () => {
      // Usuario 2 se conecta
      clientSocket2 = ioClient(`http://localhost:${server.address().port}`, {
        reconnectionDelay: 0,
        rejectUnauthorized: false
      });

      clientSocket2.on('connect', () => {
        clientSocket2.emit('usuario_login', {
          usuarioId: 'user-2',
          nombre: 'User 2',
          sala: 'global'
        }, () => {
          // Usuario 2 escucha el evento
          clientSocket2.on('venta_creada', (evento) => {
            expect(evento.tipo).toBe('venta_creada');
            expect(evento.ventaId).toBe('v-1');
            expect(evento.usuario).toBe('User 1');
            done();
          });

          // Usuario 1 crea venta
          clientSocket.emit('venta_creada', {
            id: 'v-1',
            cliente: 'Test',
            monto: 5000
          });
        });
      });
    });
  });

  test('Evento offline se encola correctamente', (done) => {
    clientSocket.emit('usuario_login', {
      usuarioId: 'user-1',
      nombre: 'User 1'
    }, () => {
      // Desconectar simulado
      clientSocket.disconnect();

      // Esperar y reconectar
      setTimeout(() => {
        clientSocket.connect();

        clientSocket.on('connect', () => {
          clientSocket.emit('usuario_login', {
            usuarioId: 'user-1',
            nombre: 'User 1'
          }, (response) => {
            expect(response.eventosEnEspera).toBeDefined();
            done();
          });
        });
      }, 500);
    });
  });
});
```

**Ejecutar tests**:
```bash
npm test -- backend/realtime/__tests__/websocket.test.js
```

---

## 📋 Escenarios de Prueba

### Checklist Completo

#### ✅ Conexión y Autenticación

- [ ] Usuario se conecta al servidor
- [ ] RealtimeClient inicializa sin errores
- [ ] Servidor log muestra "Usuario conectado"
- [ ] Callback `onEstadoConexion` se dispara con estado "conectado"
- [ ] Socket ID se asigna correctamente
- [ ] Usuarios totales se actualizan en cliente

#### ✅ Broadcasting de Eventos

- [ ] Venta creada se recibe en otros usuarios
- [ ] Venta actualizada se recibe en otros usuarios
- [ ] Venta eliminada se recibe en otros usuarios
- [ ] Almacén actualizado se recibe en otros usuarios
- [ ] Cliente actualizado se recibe en otros usuarios
- [ ] Cambios incluyen metadata (usuario, timestamp)

#### ✅ Offline Mode

- [ ] Evento se encola en offlineQueue cuando offline
- [ ] Cola se guarda en localStorage
- [ ] Reconexión automática se dispara
- [ ] Cola se procesa al reconectar
- [ ] localStorage se limpia después de sincronizar
- [ ] No hay duplicados después de reconectar

#### ✅ Usuarios Conectados

- [ ] `usuario_conectado` se dispara para cada nuevo usuario
- [ ] `usuario_desconectado` se dispara cuando usuario sale
- [ ] Contador de usuarios totales es correcto
- [ ] Nombres de usuarios aparecen en eventos

#### ✅ Heartbeat y Timeout

- [ ] Ping se envía cada 30 segundos
- [ ] Servidor responde con pong
- [ ] Usuario inactivo por > 5 min se desconecta
- [ ] Reconexión automática funciona después de timeout

#### ✅ Salas (Rooms)

- [ ] Usuario se une a sala por defecto "global"
- [ ] Usuario puede unirse a sala específica
- [ ] Broadcasting solo llega a usuarios en la misma sala
- [ ] Usuario en sala A no recibe eventos de sala B

#### ✅ Sincronización Supabase

- [ ] Cambios en BD se propagan a WebSocket
- [ ] INSERT en ventas → venta_creada
- [ ] UPDATE en almacen → almacen_actualizado
- [ ] UPDATE en clientes → cliente_actualizado
- [ ] Stock < 10 → alerta_stock_bajo
- [ ] Cambios se detectan correctamente (before/after)

#### ✅ Errors y Recuperación

- [ ] Error de autenticación rechaza usuario
- [ ] Error en evento incluye callback error
- [ ] Reconexión reintenta automáticamente
- [ ] Timeout de conexión se maneja
- [ ] Logs registran todos los errores

#### ✅ Rendimiento

- [ ] Múltiples eventos en rápida sucesión se procesan
- [ ] 50+ usuarios conectados sin lag
- [ ] Cola offline maneja 100+ eventos
- [ ] Memoria se libera después de procesar cola
- [ ] No hay memory leaks después de 1 hora

---

## 🐛 Debugging

### Habilitar Logs en Desarrollo

**Frontend** (Console del navegador):
```javascript
// Crear cliente con debug activado
const realtime = new RealtimeClient({
  serverUrl: 'http://localhost:3001',
  debug: true  // ← Activa logs detallados
});
```

**Backend** (.env):
```bash
LOG_LEVEL=debug  # debug | info | warn | error
```

### Inspeccionar Socket.io Devtools

```javascript
// En consola del navegador
io = window.io  // Acceder a socket.io

// Ver socket conectado
socket

// Emitir evento manualmente
socket.emit('venta_creada', { id: 'v-1' });

// Escuchar evento manualmente
socket.on('venta_creada', (evento) => {
  console.log('Evento recibido:', evento);
});
```

### Monitor de Conexión

```javascript
// En consola, crear monitor
setInterval(() => {
  console.log({
    conectado: realtime.isConnected,
    usuarioId: realtime.usuarioId,
    colaOffline: realtime.offlineQueue.length,
    socketId: realtime.socket?.id
  });
}, 1000);
```

### Ver Logs del Servidor

```bash
# Terminal backend
tail -f logs/realtime-debug.log   # Todos los detalles
tail -f logs/realtime-info.log    # Operaciones normales
tail -f logs/realtime-error.log   # Errores
```

### Testing de Latencia

```javascript
// Medir latencia de eventos
const inicio = Date.now();

realtime.callbacks.onVentaCreada = (evento) => {
  const latencia = Date.now() - inicio;
  console.log(`Latencia: ${latencia}ms`);
};

realtime.ventaCreada({ id: 'v-test', cliente: 'Test' });
```

---

## ✅ Checklist de QA

### Pre-Deployment

- [ ] ¿Todos los archivos fueron creados?
  - [ ] `backend/realtime/websocket.js` (300+ líneas)
  - [ ] `backend/realtime/supabase-sync.js` (200+ líneas)
  - [ ] `backend/realtime/logger.js` (50+ líneas)
  - [ ] `frontend/realtime-client.js` (200+ líneas)

- [ ] ¿Dependencias están instaladas?
  - [ ] `npm install socket.io` en backend
  - [ ] Verificar `package.json` tiene socket.io

- [ ] ¿Variables de entorno están configuradas?
  - [ ] `SUPABASE_URL` definida
  - [ ] `SUPABASE_ANON_KEY` definida
  - [ ] `FRONTEND_URL` definida
  - [ ] `PORT=3001` o puerto disponible

- [ ] ¿Documentación está completa?
  - [ ] `REALTIME_ARCHITECTURE.md` creado
  - [ ] `WEBSOCKET_EVENTS.md` creado
  - [ ] `REALTIME_TESTING.md` creado

- [ ] ¿Funcionalidad crítica funciona?
  - [ ] Usuario se conecta ✅
  - [ ] Evento se propaga a otro usuario ✅
  - [ ] Offline mode guarda cambios ✅
  - [ ] Reconexión sincroniza ✅

- [ ] ¿No hay errores en consola?
  - [ ] Frontend console sin errores de red
  - [ ] Backend console sin conexión fallida
  - [ ] Socket.io messages fluyen normalmente

- [ ] ¿Rendimiento es aceptable?
  - [ ] Latencia < 1 segundo
  - [ ] Sin freezes en UI
  - [ ] CPU stable < 50%
  - [ ] Memoria estable

---

## 📱 Testing en Móvil

### Conectar Móvil a Localhost

```bash
# Obtener IP local de la computadora
ipconfig getifaddr en0  # macOS
ipconfig              # Windows

# En móvil, usar esa IP
# Ejemplo: http://192.168.1.100:8080
```

### Testing en Production-like

```bash
# Usar ngrok para exponer localhost
ngrok http 3001

# En frontend, usar URL de ngrok
const realtime = new RealtimeClient({
  serverUrl: 'https://abc123.ngrok.io'
});
```

---

## 🚀 Test Report Template

Completar después de testing:

```markdown
# Real-time Sync - Test Report
Fecha: 2026-04-22
Tester: [Nombre]

## Resumen
- Escenarios ejecutados: 15/15
- Pasados: 15 ✅
- Fallidos: 0 ❌
- Éxito Rate: 100%

## Detalles
- Latencia promedio: 150ms
- Usuarios máximos simultáneos: 50
- Eventos procesados: 1,234
- Errores: 0

## Notas
[Agregar cualquier issue encontrado]

## Recomendaciones
[Mejoras sugeridas]
```

---

**Última actualización**: 2026-04-22
**Versión**: 1.0.0
**Socket.io Version**: 4.5.4+
