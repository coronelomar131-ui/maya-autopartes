# Real-time Sync Bidireccional - Resumen de Implementación

## 📦 Archivos Creados

### Backend (Node.js)

#### 1. `backend/realtime/websocket.js` (330 líneas)
**Responsabilidad**: Servidor WebSocket principal

**Características**:
- Socket.io server con soporte para múltiples usuarios
- Autenticación con `usuario_login` event
- Gestión de salas (grupos de usuarios)
- Broadcasting de eventos (venta_creada, almacen_actualizado, etc.)
- Cola offline para sincronización
- Heartbeat/ping para detección de conexiones inactivas
- Endpoints de health check: `/health`, `/stats`

**Eventos Soportados**:
```
Usuario:
  → usuario_login (autenticar)
  ← usuario_conectado (notificar)
  ← usuario_desconectado (notificar)

Ventas:
  → venta_creada
  → venta_actualizada
  → venta_eliminada
  ← broadcast a sala

Almacén:
  → almacen_actualizado
  ← broadcast a sala

Clientes:
  → cliente_actualizado
  ← broadcast a sala

Sistema:
  → ping (heartbeat)
  → solicitar_sincronizacion
  ← pong, estado_conexion
```

**Exporta**:
```javascript
module.exports = {
  io,              // Socket.io instance
  server,          // HTTP server
  app,             // Express app
  connectedUsers,  // Map de usuarios conectados
  rooms,           // Map de salas
  broadcastToRoom,
  getUsuariosSala,
  getEstadisticas
};
```

---

#### 2. `backend/realtime/supabase-sync.js` (240 líneas)
**Responsabilidad**: Sincronizar cambios de Supabase con WebSocket

**Características**:
- Escucha Supabase Realtime (postgres_changes)
- Procesa eventos INSERT, UPDATE, DELETE
- Detecta cambios específicos (before/after)
- Propaga a clientes conectados
- Genera alertas automáticas (stock bajo < 10)
- Estadísticas de sincronización

**Tablas Escuchadas**:
```
ventas:
  INSERT  → venta_creada
  UPDATE  → venta_actualizada (detecta cambios)
  DELETE  → venta_eliminada

almacen:
  UPDATE  → almacen_actualizado
         → alerta_stock_bajo (si stock < 10)

clientes:
  UPDATE  → cliente_actualizado (detecta cambios)
```

**Exporta**:
```javascript
class SupabaseSyncManager {
  inicializar()
  getEstadisticas()
  limpiar()
}
```

---

#### 3. `backend/realtime/logger.js` (50 líneas)
**Responsabilidad**: Sistema simple de logging

**Características**:
- Logs a console y archivo
- Niveles: error, warn, info, debug
- Directorio: `./logs/`
- Archivos: `realtime-error.log`, `realtime-info.log`, etc.

---

#### 4. `backend/package.json` (modificado)
**Cambios**:
- Agregada dependencia: `socket.io` ^4.5.4
- Agregada dependencia: `http` para compatibility

---

### Frontend (Browser)

#### 5. `frontend/realtime-client.js` (330 líneas)
**Responsabilidad**: Cliente WebSocket en el navegador

**Características**:
- Socket.io client con auto-reconexión
- Callbacks para cada tipo de evento
- Gestor de cola offline (localStorage)
- Sincronización automática al reconectar
- Heartbeat automático (ping cada 30s)
- Métodos públicos para emitir eventos:
  - `ventaCreada(data)`
  - `ventaActualizada(data)`
  - `almacenActualizado(data)`
  - `clienteActualizado(data)`
  - `desconectar()`
  - `reconectar()`

**Cola Offline**:
```javascript
offlineQueue = [
  {
    tipo: 'venta_creada',
    data: { ... },
    timestamp: ISO,
    intentos: 0
  },
  // ...
]
// Guardado en localStorage
```

**Callbacks Disponibles**:
```javascript
onVentaCreada(evento)
onVentaActualizada(evento)
onVentaEliminada(evento)
onAlmacenActualizado(evento)
onClienteActualizado(evento)
onUsuarioConectado(evento)
onUsuarioDesconectado(evento)
onEstadoConexion(estado)
onErrorConexion(error)
```

---

### Documentación

#### 6. `REALTIME_ARCHITECTURE.md` (400+ líneas)
**Contenido**:
- Diagrama de arquitectura completo
- Descripción de componentes
- Flujos de datos (3 escenarios principales)
- Offline mode mechanic
- Seguridad (autenticación, autorización, validación)
- Escalabilidad (10 a 500+ usuarios)
- Deployment (Vercel, Heroku, Railway)
- Monitoreo y estadísticas
- Checklist de implementación

**Secciones Clave**:
```
1. Descripción General
2. Arquitectura del Sistema (diagrama)
3. Componentes Principales
4. Flujos de Datos
5. Manejo de Offline
6. Seguridad
7. Escalabilidad
8. Deployment
9. Monitoreo
10. Checklist
```

---

#### 7. `WEBSOCKET_EVENTS.md` (350+ líneas)
**Contenido**:
- Referencia completa de todos los eventos
- Payload exacto para cada evento
- Ejemplos de uso
- Callbacks correspondientes
- Tabla resumen
- Integración con core.js

**Eventos Documentados**:
```
Autenticación:
  - usuario_login (C→S)

Ventas:
  - venta_creada (C↔S)
  - venta_actualizada (C↔S)
  - venta_eliminada (C↔S)

Almacén:
  - almacen_actualizado (C↔S)
  - alerta_stock_bajo (S→C)

Clientes:
  - cliente_actualizado (C↔S)

Usuarios:
  - usuario_conectado (S→C)
  - usuario_desconectado (S→C)

Sincronización:
  - solicitar_sincronizacion (C→S)

Conexión:
  - ping/pong (C↔S)
  - estado_conexion (S→C)
  - error_conexion (S→C)
```

---

#### 8. `REALTIME_TESTING.md` (400+ líneas)
**Contenido**:
- Setup de testing
- Testing manual (6 escenarios)
- Testing automatizado (Jest suite)
- Escenarios de prueba (checklist)
- Debugging y monitoreo
- Checklist de QA pre-deployment
- Testing en móvil
- Test report template

**Escenarios Manuales Cubiertos**:
```
1. Conexión Básica
2. Crear Venta
3. Actualizar Stock
4. Desconexión y Offline
5. Múltiples Usuarios Simultáneamente
6. Desconexión Limpia
```

**Checklist Completo**:
```
✅ Conexión y Autenticación
✅ Broadcasting de Eventos
✅ Offline Mode
✅ Usuarios Conectados
✅ Heartbeat y Timeout
✅ Salas (Rooms)
✅ Sincronización Supabase
✅ Errors y Recuperación
✅ Rendimiento
```

---

#### 9. `REALTIME_INTEGRATION_EXAMPLE.md` (300+ líneas)
**Contenido**:
- Cómo cargar RealtimeClient en HTML
- Inicialización en main.js
- Event handlers para actualizar UI
- Wrapper functions para emitir eventos
- Integración con flujo de login existente
- HTML elements para status
- Actualización de formularios
- Ejemplos de código completo
- CSS para offline mode
- Checklist de integración

**Código Incluido**:
```javascript
// Inicialización
inicializarRealtimeSync(usuarioId, nombreUsuario)

// Event handlers
handleVentaCreada(evento)
handleVentaActualizada(evento)
handleAlmacenActualizado(evento)
handleEstadoConexion(estado)
// ... etc

// Wrappers
createVentaWithRealtime(ventaData)
updateAlmacenWithRealtime(productoId, stock)

// Login integration
loginUserWithRealtime(email, password)
logoutUserWithRealtime()
```

---

#### 10. `REALTIME_IMPLEMENTATION_SUMMARY.md` (este archivo)
**Contenido**:
- Resumen de todos los archivos
- Estructura completa
- Cómo empezar
- Variables de entorno
- Troubleshooting rápido
- Próximos pasos

---

## 🚀 Cómo Empezar

### Paso 1: Instalar Dependencias

```bash
cd backend
npm install socket.io
npm install
```

### Paso 2: Configurar Variables de Entorno

Crear `backend/.env`:
```bash
# Supabase
SUPABASE_URL=https://xyzqgbmwfvhyjyxdffvl.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...

# Backend
PORT=3001
LOG_LEVEL=info
FRONTEND_URL=http://localhost:8080

# Optional: Redis (para múltiples servidores)
REDIS_URL=redis://localhost:6379
```

### Paso 3: Iniciar Backend

```bash
# Terminal 1
cd backend
node realtime/websocket.js

# Output esperado:
# 🚀 WebSocket Server corriendo en puerto 3001
# ✅ Todas las suscripciones inicializadas
```

### Paso 4: Cargar en Frontend

```html
<!-- En index.html -->
<script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script>
<script src="./frontend/realtime-client.js"></script>
```

### Paso 5: Inicializar en main.js

```javascript
// Después del login
await inicializarRealtimeSync(usuarioId, nombre);

// Registrar callbacks
realtimeClient.callbacks.onVentaCreada = (evento) => {
  ventas.unshift(evento.data);
  renderV();
};

// ... etc
```

### Paso 6: Emitir Eventos

```javascript
// Al crear venta
realtimeClient.ventaCreada({
  id: 'v-123',
  cliente: 'Test',
  monto: 5000
});

// Al actualizar almacén
realtimeClient.almacenActualizado({
  productoId: 'p-1',
  stockNuevo: 95
});
```

---

## 📊 Estructura de Datos

### Evento en WebSocket
```javascript
{
  tipo: 'venta_creada',                    // Tipo de evento
  ventaId: 'v-123',                        // ID del recurso
  data: { /* objeto completo */ },         // Datos
  usuario: 'Juan Pérez',                   // Quién lo hizo
  usuarioId: 'user-1',
  timestamp: '2026-04-22T12:00:00Z',      // Cuándo
  sala: 'global',                          // A qué sala
  fuente: 'cliente'                        // De dónde vino
}
```

### Usuario Conectado
```javascript
{
  socketId: 'socket-xyz',
  usuarioId: 'user-1',
  nombre: 'Juan Pérez',
  sala: 'global',
  timestamp: ISO,
  activo: true,
  ultimaActividad: Date
}
```

### Cola Offline
```javascript
{
  tipo: 'venta_creada',
  data: { /* venta */ },
  timestamp: ISO,
  intentos: 0
}
```

---

## 🔐 Seguridad

### Implementado

✅ **Autenticación**:
- Validar `usuarioId` en `usuario_login`
- Permitir solo usuarios autenticados emitir eventos

✅ **Validación**:
- Backend valida todos los datos recibidos
- Tamaño máximo de evento: 1 MB
- Tipos de datos esperados

✅ **Encriptación**:
- HTTPS/WSS en producción
- Socket.io maneja TLS automáticamente

### Por Implementar (si es necesario)

⚠️ **RLS (Row Level Security)** en Supabase:
- Limitar datos por usuario/organización
- Ver: [Supabase RLS Docs](https://supabase.com/docs/guides/auth/row-level-security)

⚠️ **JWT Tokens**:
- Validar token en cada conexión
- Ver: [BEST_PRACTICES_SECURITY.md](./BEST_PRACTICES_SECURITY.md)

---

## 🧪 Testing Rápido

```javascript
// En consola del navegador

// 1. Crear cliente
const rt = new RealtimeClient({debug: true});

// 2. Inicializar
await rt.inicializar('user-1', 'Test User');

// 3. Crear venta
rt.ventaCreada({id: 'v-1', cliente: 'Test', monto: 1000});

// 4. Ver cola (si está offline)
console.log(rt.offlineQueue);

// 5. Ver estado
console.log({
  conectado: rt.isConnected,
  usuarioId: rt.usuarioId,
  colaOffline: rt.offlineQueue.length
});
```

---

## 📈 Escalabilidad

### Pequeña (1-10 usuarios)
```
Un servidor Node.js
Memoria en websocket.js (connectedUsers Map)
```

### Mediana (10-100 usuarios)
```
Un servidor Node.js
Redis para persistencia de sesiones
Supabase Realtime para BD
```

### Grande (100+ usuarios)
```
Múltiples servidores Node.js
Redis Adapter para broadcast
Supabase Realtime para BD
Load Balancer (nginx)
```

---

## ⚠️ Troubleshooting Rápido

### "No se conecta al servidor"
```bash
# 1. Verificar que backend está corriendo
ps aux | grep "node.*websocket"

# 2. Verificar puerto 3001
lsof -i :3001

# 3. Verificar firewall
# Windows: firewall permite puerto 3001

# 4. Verificar CORS en websocket.js
# FRONTEND_URL debe coincidir con origen del cliente
```

### "Eventos no se reciben"
```javascript
// 1. Verificar callback está registrado
console.log(realtimeClient.callbacks.onVentaCreada);

// 2. Verificar evento se emite
rt.ventaCreada({...});

// 3. Verificar logs en backend
tail -f logs/realtime-debug.log

// 4. Verificar conexión WebSocket
console.log(realtimeClient.isConnected);
```

### "Offline mode no funciona"
```javascript
// 1. Verificar localStorage disponible
console.log(localStorage);

// 2. Desactivar conexión (DevTools → Network → Offline)
// 3. Crear evento
rt.ventaCreada({...});
// 4. Verificar cola
console.log(JSON.parse(localStorage.getItem('realtime_offline_queue')));
// 5. Reactivar conexión
// 6. Verificar sincronización
```

---

## 📚 Documentación Relacionada

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura general
- [BEST_PRACTICES_SECURITY.md](./BEST_PRACTICES_SECURITY.md) - Seguridad
- [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) - Guía de desarrollo
- [Socket.io Docs](https://socket.io/docs/) - Documentación oficial
- [Supabase Realtime](https://supabase.com/docs/guides/realtime) - Docs de Supabase

---

## ✅ Checklist Pre-Deployment

### Backend
- [ ] `websocket.js` creado (330 líneas)
- [ ] `supabase-sync.js` creado (240 líneas)
- [ ] `logger.js` creado (50 líneas)
- [ ] `socket.io` en `package.json`
- [ ] `npm install` ejecutado
- [ ] `.env` configurado con SUPABASE_URL, SUPABASE_KEY
- [ ] Server inicia sin errores: `node realtime/websocket.js`
- [ ] Logs muestran "WebSocket Server corriendo"
- [ ] Health check funciona: `curl http://localhost:3001/health`

### Frontend
- [ ] `realtime-client.js` creado (330 líneas)
- [ ] Script cargado en `index.html` (socket.io CDN + realtime-client.js)
- [ ] RealtimeClient instanciado en `main.js`
- [ ] Callbacks registrados
- [ ] Eventos emitidos en crear/modificar/eliminar
- [ ] Consola muestra "[RealtimeClient]" logs
- [ ] Conecta al servidor: `realtimeClient.isConnected === true`
- [ ] Offline mode guarda en localStorage
- [ ] Reconexión sincroniza eventos

### Documentación
- [ ] `REALTIME_ARCHITECTURE.md` creado
- [ ] `WEBSOCKET_EVENTS.md` creado
- [ ] `REALTIME_TESTING.md` creado
- [ ] `REALTIME_INTEGRATION_EXAMPLE.md` creado
- [ ] `REALTIME_IMPLEMENTATION_SUMMARY.md` creado (este)

### Testing
- [ ] 1 usuario se conecta
- [ ] 2+ usuarios reciben evento broadcast
- [ ] Offline mode encola evento
- [ ] Reconexión sincroniza cola
- [ ] Desconexión se notifica
- [ ] Latencia < 1 segundo

---

## 🎯 Próximos Pasos

### Inmediatos
1. Instalar dependencias: `npm install socket.io`
2. Iniciar servidor: `node backend/realtime/websocket.js`
3. Cargar RealtimeClient en HTML
4. Inicializar en main.js después de login
5. Registrar callbacks para actualizar UI

### Corto Plazo (1-2 días)
1. Integrar con formularios existentes
2. Probar con 2+ navegadores
3. Probar offline mode
4. Ajustar UI para estado de conexión
5. Agregar notificaciones para eventos

### Mediano Plazo (1-2 semanas)
1. Implementar RLS en Supabase
2. Agregar validación JWT
3. Tests automatizados con Jest
4. Performance testing
5. Deployment a producción

### Largo Plazo (1+ mes)
1. Redis Adapter para múltiples servidores
2. Metrics y monitoreo
3. Rate limiting
4. WebSocket compression
5. Offline persistence en IndexedDB

---

## 📞 Soporte

Si hay problemas:

1. **Check logs**:
   ```bash
   tail -f backend/logs/realtime-debug.log
   ```

2. **Check console**:
   ```javascript
   // Browser console
   console.log(realtimeClient);
   ```

3. **Check network**:
   - DevTools → Network → WS tab
   - Ver si WebSocket conecta

4. **Restart**:
   ```bash
   # Backend
   Ctrl+C
   node backend/realtime/websocket.js
   
   # Frontend
   Hard refresh: Ctrl+Shift+R
   ```

---

**Última actualización**: 2026-04-22
**Versión**: 1.0.0
**Status**: ✅ Completado

Archivo de resumen para referencia rápida durante desarrollo.
