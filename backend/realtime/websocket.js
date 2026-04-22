/**
 * backend/realtime/websocket.js
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Socket.io Server para Real-time Sync bidireccional
 *
 * Responsabilidades:
 * ✓ Gestionar conexiones de múltiples usuarios
 * ✓ Propagar cambios en tiempo real
 * ✓ Manejar salas (grupos de usuarios)
 * ✓ Gestionar desconexiones y reconexiones
 * ✓ Sincronizar eventos con Supabase
 *
 * Eventos soportados:
 * - venta_creada: Notifica creación de nueva venta
 * - venta_actualizada: Notifica cambio en venta existente
 * - venta_eliminada: Notifica eliminación de venta
 * - almacen_actualizado: Notifica cambio en inventario
 * - cliente_actualizado: Notifica cambio en datos de cliente
 * - usuario_conectado: Notifica cuando usuario se conecta
 * - usuario_desconectado: Notifica cuando usuario se desconecta
 * - sincronizar_solicitud: Solicita sincronización completa
 *
 * @version 1.0.0
 * @author Maya Autopartes Dev Team
 * @last-update 2026-04-22
 */

const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const cors = require('cors');
const logger = require('./logger');

// ═════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN INICIAL
// ═════════════════════════════════════════════════════════════════════════════

const app = express();
const server = http.createServer(app);

const io = socketIO(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
    methods: ['GET', 'POST']
  },
  pingInterval: 25000,
  pingTimeout: 20000,
  maxHttpBufferSize: 1e6 // 1 MB
});

// ═════════════════════════════════════════════════════════════════════════════
// DATA STRUCTURES
// ═════════════════════════════════════════════════════════════════════════════

// Rastrear usuarios conectados
const connectedUsers = new Map();

// Rastrear salas (grupos de usuarios)
const rooms = new Map();

// Cola de eventos para usuarios offline
const offlineQueue = new Map();

// Configuración de salas
const ROOM_TYPES = {
  GLOBAL: 'global',
  TEAM: 'team',
  USER: 'user'
};

// ═════════════════════════════════════════════════════════════════════════════
// SOCKET.IO CONNECTION HANDLER
// ═════════════════════════════════════════════════════════════════════════════

io.on('connection', (socket) => {
  logger.info(`Cliente conectado: ${socket.id}`);

  // ─── Event: usuario_login ───
  socket.on('usuario_login', (userData, callback) => {
    try {
      const { usuarioId, nombre, email, sala = 'global', timestamp } = userData;

      if (!usuarioId || !nombre) {
        logger.warn(`Login incompleto: ${socket.id}`);
        return callback({ error: 'Datos de usuario incompletos' });
      }

      // Guardar información del usuario
      const userInfo = {
        socketId: socket.id,
        usuarioId,
        nombre,
        email,
        sala,
        timestamp: new Date().toISOString(),
        activo: true,
        ultimaActividad: new Date()
      };

      connectedUsers.set(socket.id, userInfo);

      // Crear/actualizar sala
      if (!rooms.has(sala)) {
        rooms.set(sala, new Set());
      }
      rooms.get(sala).add(socket.id);

      // Unirse a la sala socket.io
      socket.join(sala);

      logger.info(`Usuario ${nombre} (${usuarioId}) se unió a sala: ${sala}`);

      // Notificar a otros usuarios en la sala
      io.to(sala).emit('usuario_conectado', {
        usuarioId,
        nombre,
        timestamp: userInfo.timestamp,
        usuariosTotales: rooms.get(sala).size
      });

      // Retornar confirmación y cola de sincronización
      const queuePendiente = offlineQueue.get(usuarioId) || [];
      callback({
        success: true,
        socketId: socket.id,
        usuariosTotales: rooms.get(sala).size,
        eventosEnEspera: queuePendiente.length,
        cola: queuePendiente
      });

    } catch (error) {
      logger.error('Error en usuario_login:', error);
      callback({ error: 'Error al conectar usuario' });
    }
  });

  // ─── Event: venta_creada ───
  socket.on('venta_creada', (ventaData, callback) => {
    try {
      const userInfo = connectedUsers.get(socket.id);
      if (!userInfo) {
        return callback({ error: 'Usuario no autenticado' });
      }

      const evento = {
        tipo: 'venta_creada',
        ventaId: ventaData.id,
        data: ventaData,
        usuario: userInfo.nombre,
        usuarioId: userInfo.usuarioId,
        timestamp: new Date().toISOString(),
        sala: userInfo.sala
      };

      // Guardar en logs
      logger.info(`Venta creada: ${ventaData.id} por ${userInfo.nombre}`);

      // Propagar a otros usuarios en la sala
      socket.to(userInfo.sala).emit('venta_creada', evento);

      // Guardar en cola para usuarios offline
      queueEventoOffline('venta_creada', evento);

      callback({ success: true, ventaId: ventaData.id });

    } catch (error) {
      logger.error('Error en venta_creada:', error);
      callback({ error: 'Error al crear venta' });
    }
  });

  // ─── Event: venta_actualizada ───
  socket.on('venta_actualizada', (ventaData, callback) => {
    try {
      const userInfo = connectedUsers.get(socket.id);
      if (!userInfo) {
        return callback({ error: 'Usuario no autenticado' });
      }

      const evento = {
        tipo: 'venta_actualizada',
        ventaId: ventaData.id,
        cambios: ventaData.cambios,
        data: ventaData,
        usuario: userInfo.nombre,
        usuarioId: userInfo.usuarioId,
        timestamp: new Date().toISOString(),
        sala: userInfo.sala
      };

      logger.info(`Venta actualizada: ${ventaData.id} por ${userInfo.nombre}`);

      // Propagar a otros usuarios
      socket.to(userInfo.sala).emit('venta_actualizada', evento);

      // Guardar en cola offline
      queueEventoOffline('venta_actualizada', evento);

      callback({ success: true });

    } catch (error) {
      logger.error('Error en venta_actualizada:', error);
      callback({ error: 'Error al actualizar venta' });
    }
  });

  // ─── Event: venta_eliminada ───
  socket.on('venta_eliminada', (ventaData, callback) => {
    try {
      const userInfo = connectedUsers.get(socket.id);
      if (!userInfo) {
        return callback({ error: 'Usuario no autenticado' });
      }

      const evento = {
        tipo: 'venta_eliminada',
        ventaId: ventaData.id,
        usuario: userInfo.nombre,
        usuarioId: userInfo.usuarioId,
        timestamp: new Date().toISOString(),
        sala: userInfo.sala
      };

      logger.info(`Venta eliminada: ${ventaData.id} por ${userInfo.nombre}`);

      socket.to(userInfo.sala).emit('venta_eliminada', evento);
      queueEventoOffline('venta_eliminada', evento);

      callback({ success: true });

    } catch (error) {
      logger.error('Error en venta_eliminada:', error);
      callback({ error: 'Error al eliminar venta' });
    }
  });

  // ─── Event: almacen_actualizado ───
  socket.on('almacen_actualizado', (almacenData, callback) => {
    try {
      const userInfo = connectedUsers.get(socket.id);
      if (!userInfo) {
        return callback({ error: 'Usuario no autenticado' });
      }

      const evento = {
        tipo: 'almacen_actualizado',
        productoId: almacenData.productoId,
        stockAnterior: almacenData.stockAnterior,
        stockNuevo: almacenData.stockNuevo,
        diferencia: almacenData.diferencia,
        concepto: almacenData.concepto,
        usuario: userInfo.nombre,
        usuarioId: userInfo.usuarioId,
        timestamp: new Date().toISOString(),
        sala: userInfo.sala
      };

      logger.info(`Almacén actualizado: ${almacenData.productoId} por ${userInfo.nombre}`);

      socket.to(userInfo.sala).emit('almacen_actualizado', evento);
      queueEventoOffline('almacen_actualizado', evento);

      callback({ success: true });

    } catch (error) {
      logger.error('Error en almacen_actualizado:', error);
      callback({ error: 'Error al actualizar almacén' });
    }
  });

  // ─── Event: cliente_actualizado ───
  socket.on('cliente_actualizado', (clienteData, callback) => {
    try {
      const userInfo = connectedUsers.get(socket.id);
      if (!userInfo) {
        return callback({ error: 'Usuario no autenticado' });
      }

      const evento = {
        tipo: 'cliente_actualizado',
        clienteId: clienteData.id,
        cambios: clienteData.cambios,
        usuario: userInfo.nombre,
        usuarioId: userInfo.usuarioId,
        timestamp: new Date().toISOString(),
        sala: userInfo.sala
      };

      logger.info(`Cliente actualizado: ${clienteData.id} por ${userInfo.nombre}`);

      socket.to(userInfo.sala).emit('cliente_actualizado', evento);
      queueEventoOffline('cliente_actualizado', evento);

      callback({ success: true });

    } catch (error) {
      logger.error('Error en cliente_actualizado:', error);
      callback({ error: 'Error al actualizar cliente' });
    }
  });

  // ─── Event: solicitar_sincronizacion ───
  socket.on('solicitar_sincronizacion', (filtros, callback) => {
    try {
      const userInfo = connectedUsers.get(socket.id);
      if (!userInfo) {
        return callback({ error: 'Usuario no autenticado' });
      }

      logger.info(`Sincronización solicitada por ${userInfo.nombre}`);

      // Emitir evento para que el servidor envíe datos completos
      socket.emit('iniciar_sincronizacion', {
        timestamp: new Date().toISOString(),
        filtros
      });

      callback({ success: true });

    } catch (error) {
      logger.error('Error en solicitar_sincronizacion:', error);
      callback({ error: 'Error en sincronización' });
    }
  });

  // ─── Event: ping (heartbeat) ───
  socket.on('ping', () => {
    const userInfo = connectedUsers.get(socket.id);
    if (userInfo) {
      userInfo.ultimaActividad = new Date();
    }
    socket.emit('pong');
  });

  // ─── Event: disconnect ───
  socket.on('disconnect', () => {
    try {
      const userInfo = connectedUsers.get(socket.id);

      if (userInfo) {
        const { usuarioId, nombre, sala } = userInfo;

        // Remover de sala
        if (rooms.has(sala)) {
          rooms.get(sala).delete(socket.id);
          if (rooms.get(sala).size === 0) {
            rooms.delete(sala);
          }
        }

        // Remover de usuarios conectados
        connectedUsers.delete(socket.id);

        logger.info(`Usuario ${nombre} desconectado`);

        // Notificar a otros usuarios
        io.to(sala).emit('usuario_desconectado', {
          usuarioId,
          nombre,
          timestamp: new Date().toISOString(),
          usuariosTotales: rooms.has(sala) ? rooms.get(sala).size : 0
        });
      }
    } catch (error) {
      logger.error('Error en disconnect:', error);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Encolar evento para usuarios offline
 */
function queueEventoOffline(tipo, evento) {
  try {
    // Almacenar en BD o memoria caché
    // Por ahora usamos memoria con límite de 1000 eventos
    const maxEventos = 1000;
    const eventos = offlineQueue.get('eventos_globales') || [];

    eventos.push(evento);

    if (eventos.length > maxEventos) {
      eventos.shift();
    }

    offlineQueue.set('eventos_globales', eventos);

    logger.debug(`Evento encolado: ${tipo}`);
  } catch (error) {
    logger.error('Error al encolar evento:', error);
  }
}

/**
 * Broadcast a sala específica
 */
function broadcastToRoom(sala, evento, data) {
  try {
    io.to(sala).emit(evento, data);
    logger.debug(`Broadcast a sala ${sala}: ${evento}`);
  } catch (error) {
    logger.error(`Error en broadcast: ${error}`);
  }
}

/**
 * Obtener usuarios conectados en una sala
 */
function getUsuariosSala(sala) {
  if (!rooms.has(sala)) return [];

  return Array.from(rooms.get(sala)).map(socketId => {
    return connectedUsers.get(socketId);
  }).filter(user => user !== undefined);
}

/**
 * Obtener estadísticas de conexión
 */
function getEstadisticas() {
  return {
    usuariosConectados: connectedUsers.size,
    salas: rooms.size,
    eventosEnCola: offlineQueue.get('eventos_globales')?.length || 0,
    timestamp: new Date().toISOString()
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// HEALTH CHECK & MONITORING
// ═════════════════════════════════════════════════════════════════════════════

// Limpiar conexiones inactivas cada 5 minutos
setInterval(() => {
  const ahora = new Date();
  const timeout = 5 * 60 * 1000; // 5 minutos

  connectedUsers.forEach((userInfo, socketId) => {
    if (ahora - userInfo.ultimaActividad > timeout) {
      logger.warn(`Desconectando usuario inactivo: ${userInfo.nombre}`);
      const socket = io.sockets.sockets.get(socketId);
      if (socket) {
        socket.disconnect(true);
      }
    }
  });
}, 5 * 60 * 1000);

// ═════════════════════════════════════════════════════════════════════════════
// HEALTH CHECK ENDPOINT
// ═════════════════════════════════════════════════════════════════════════════

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    realtime: {
      usuariosConectados: connectedUsers.size,
      salas: rooms.size,
      eventosEnCola: offlineQueue.get('eventos_globales')?.length || 0
    },
    timestamp: new Date().toISOString()
  });
});

app.get('/stats', (req, res) => {
  const stats = {
    usuariosConectados: connectedUsers.size,
    salas: Array.from(rooms.keys()).map(sala => ({
      nombre: sala,
      usuariosTotales: rooms.get(sala).size
    })),
    timestamp: new Date().toISOString()
  };
  res.json(stats);
});

// ═════════════════════════════════════════════════════════════════════════════
// EXPORT & SERVER START
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
  io,
  server,
  app,
  connectedUsers,
  rooms,
  broadcastToRoom,
  getUsuariosSala,
  getEstadisticas
};

// Iniciar servidor si es main
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  server.listen(PORT, () => {
    console.log(`🚀 WebSocket Server corriendo en puerto ${PORT}`);
  });
}
