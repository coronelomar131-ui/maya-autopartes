/**
 * frontend/realtime-client.js
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Socket.io Client para Real-time Sync desde el Frontend
 *
 * Responsabilidades:
 * ✓ Conectar con WebSocket server cuando app carga
 * ✓ Escuchar eventos de cambios en tiempo real
 * ✓ Actualizar UI automáticamente
 * ✓ Manejar reconexiones y fallback offline
 * ✓ Encolar cambios locales cuando está offline
 * ✓ Sincronizar cambios cuando vuelve online
 *
 * Eventos escuchados:
 * - venta_creada: Nueva venta de otro usuario
 * - venta_actualizada: Cambio en venta existente
 * - venta_eliminada: Venta eliminada
 * - almacen_actualizado: Cambio en inventario
 * - cliente_actualizado: Cambio en datos de cliente
 * - usuario_conectado: Notificación de usuario conectándose
 * - usuario_desconectado: Notificación de usuario desconectándose
 *
 * @version 1.0.0
 * @author Maya Autopartes Dev Team
 * @last-update 2026-04-22
 */

// ═════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN INICIAL
// ═════════════════════════════════════════════════════════════════════════════

class RealtimeClient {
  constructor(options = {}) {
    this.serverUrl = options.serverUrl || `http://${window.location.hostname}:3001`;
    this.socket = null;
    this.isConnected = false;
    this.usuarioId = null;
    this.nombreUsuario = null;
    this.sala = options.sala || 'global';

    // Cola de cambios mientras está offline
    this.offlineQueue = [];
    this.maxQueueSize = options.maxQueueSize || 100;

    // Callbacks para actualizar UI
    this.callbacks = {
      onVentaCreada: options.onVentaCreada || this._defaultCallback,
      onVentaActualizada: options.onVentaActualizada || this._defaultCallback,
      onVentaEliminada: options.onVentaEliminada || this._defaultCallback,
      onAlmacenActualizado: options.onAlmacenActualizado || this._defaultCallback,
      onClienteActualizado: options.onClienteActualizado || this._defaultCallback,
      onUsuarioConectado: options.onUsuarioConectado || this._defaultCallback,
      onUsuarioDesconectado: options.onUsuarioDesconectado || this._defaultCallback,
      onEstadoConexion: options.onEstadoConexion || this._defaultCallback,
      onErrorConexion: options.onErrorConexion || this._defaultCallback
    };

    // Estado de sincronización
    this.sincronizando = false;
    this.ultimaSincronizacion = null;

    // Logger
    this.debug = options.debug || false;
  }

  /**
   * Inicializar conexión WebSocket
   */
  async inicializar(usuarioId, nombreUsuario) {
    try {
      this.usuarioId = usuarioId;
      this.nombreUsuario = nombreUsuario;

      // Intentar cargar Socket.io desde CDN si no existe
      if (typeof io === 'undefined') {
        await this._cargarSocket();
      }

      this._crearConexion();
      this._configurarEventos();

      this._log('✅ RealtimeClient inicializado');
      return true;

    } catch (error) {
      this._error('❌ Error inicializando RealtimeClient:', error);
      this.callbacks.onErrorConexion({
        tipo: 'inicializacion',
        error: error.message
      });
      return false;
    }
  }

  /**
   * Crear conexión Socket.io
   */
  _crearConexion() {
    this.socket = io(this.serverUrl, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      autoConnect: true,
      transports: ['websocket', 'polling']
    });

    this._log('Conectando a WebSocket server...');
  }

  /**
   * Configurar event listeners
   */
  _configurarEventos() {
    if (!this.socket) return;

    // ─── Eventos de conexión ───
    this.socket.on('connect', () => {
      this._log('✅ Conectado al servidor WebSocket');
      this.isConnected = true;

      // Enviar datos de usuario
      this.socket.emit('usuario_login', {
        usuarioId: this.usuarioId,
        nombre: this.nombreUsuario,
        sala: this.sala,
        timestamp: new Date().toISOString()
      }, (response) => {
        if (response.success) {
          this._log(`✅ Usuario autenticado en sala: ${this.sala}`);
          this._notificarEstadoConexion('conectado', response.usuariosTotales);

          // Sincronizar eventos pendientes si hay
          if (response.eventosEnEspera > 0) {
            this._sincronizarColaPendiente(response.cola);
          }

          // Sincronizar si hay eventos offline encolados
          if (this.offlineQueue.length > 0) {
            this._procesarColaOffline();
          }
        }
      });
    });

    this.socket.on('disconnect', () => {
      this._log('⚠️ Desconectado del servidor WebSocket');
      this.isConnected = false;
      this._notificarEstadoConexion('desconectado', 0);
    });

    this.socket.on('connect_error', (error) => {
      this._error('❌ Error de conexión:', error);
      this.callbacks.onErrorConexion({
        tipo: 'conexion',
        error: error.message
      });
    });

    // ─── Eventos de ventas ───
    this.socket.on('venta_creada', (evento) => {
      this._log(`Venta creada por ${evento.usuario}:`, evento.ventaId);
      this.callbacks.onVentaCreada(evento);
    });

    this.socket.on('venta_actualizada', (evento) => {
      this._log(`Venta actualizada por ${evento.usuario}:`, evento.ventaId);
      this.callbacks.onVentaActualizada(evento);
    });

    this.socket.on('venta_eliminada', (evento) => {
      this._log(`Venta eliminada por ${evento.usuario}:`, evento.ventaId);
      this.callbacks.onVentaEliminada(evento);
    });

    // ─── Eventos de almacén ───
    this.socket.on('almacen_actualizado', (evento) => {
      this._log(`Almacén actualizado por ${evento.usuario}:`, evento.productoId);
      this.callbacks.onAlmacenActualizado(evento);
    });

    // ─── Eventos de clientes ───
    this.socket.on('cliente_actualizado', (evento) => {
      this._log(`Cliente actualizado por ${evento.usuario}:`, evento.clienteId);
      this.callbacks.onClienteActualizado(evento);
    });

    // ─── Eventos de usuarios ───
    this.socket.on('usuario_conectado', (evento) => {
      this._log(`Usuario conectado: ${evento.nombre}`);
      this.callbacks.onUsuarioConectado(evento);
    });

    this.socket.on('usuario_desconectado', (evento) => {
      this._log(`Usuario desconectado: ${evento.nombre}`);
      this.callbacks.onUsuarioDesconectado(evento);
    });

    // ─── Heartbeat ───
    setInterval(() => {
      if (this.isConnected) {
        this.socket.emit('ping');
      }
    }, 30000); // Cada 30 segundos
  }

  /**
   * Notificar cambio de estado de conexión
   */
  _notificarEstadoConexion(estado, usuariosTotales = 0) {
    this.callbacks.onEstadoConexion({
      estado,
      isConnected: this.isConnected,
      usuariosTotales,
      timestamp: new Date().toISOString()
    });
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // MÉTODOS PÚBLICOS PARA EMITIR EVENTOS
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Emitir: Venta creada
   */
  ventaCreada(ventaData) {
    if (this.isConnected) {
      this.socket.emit('venta_creada', ventaData, (response) => {
        if (!response.success) {
          this._error('Error al crear venta:', response.error);
          this._encolarCambio('venta_creada', ventaData);
        }
      });
    } else {
      this._encolarCambio('venta_creada', ventaData);
    }
  }

  /**
   * Emitir: Venta actualizada
   */
  ventaActualizada(ventaData) {
    if (this.isConnected) {
      this.socket.emit('venta_actualizada', ventaData, (response) => {
        if (!response.success) {
          this._error('Error al actualizar venta:', response.error);
          this._encolarCambio('venta_actualizada', ventaData);
        }
      });
    } else {
      this._encolarCambio('venta_actualizada', ventaData);
    }
  }

  /**
   * Emitir: Venta eliminada
   */
  ventaEliminada(ventaData) {
    if (this.isConnected) {
      this.socket.emit('venta_eliminada', ventaData, (response) => {
        if (!response.success) {
          this._error('Error al eliminar venta:', response.error);
          this._encolarCambio('venta_eliminada', ventaData);
        }
      });
    } else {
      this._encolarCambio('venta_eliminada', ventaData);
    }
  }

  /**
   * Emitir: Almacén actualizado
   */
  almacenActualizado(almacenData) {
    if (this.isConnected) {
      this.socket.emit('almacen_actualizado', almacenData, (response) => {
        if (!response.success) {
          this._error('Error al actualizar almacén:', response.error);
          this._encolarCambio('almacen_actualizado', almacenData);
        }
      });
    } else {
      this._encolarCambio('almacen_actualizado', almacenData);
    }
  }

  /**
   * Emitir: Cliente actualizado
   */
  clienteActualizado(clienteData) {
    if (this.isConnected) {
      this.socket.emit('cliente_actualizado', clienteData, (response) => {
        if (!response.success) {
          this._error('Error al actualizar cliente:', response.error);
          this._encolarCambio('cliente_actualizado', clienteData);
        }
      });
    } else {
      this._encolarCambio('cliente_actualizado', clienteData);
    }
  }

  /**
   * Solicitar sincronización completa
   */
  solicitarSincronizacion(filtros = {}) {
    if (this.isConnected) {
      this.sincronizando = true;
      this.socket.emit('solicitar_sincronizacion', filtros, (response) => {
        if (response.success) {
          this._log('✅ Sincronización solicitada');
        }
      });
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // OFFLINE QUEUE MANAGEMENT
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Encolar cambio cuando está offline
   */
  _encolarCambio(tipo, data) {
    if (this.offlineQueue.length >= this.maxQueueSize) {
      this._log('⚠️ Cola offline llena, descartando cambio antiguo');
      this.offlineQueue.shift();
    }

    this.offlineQueue.push({
      tipo,
      data,
      timestamp: new Date().toISOString(),
      intentos: 0
    });

    this._log(`Cambio encolado (${this.offlineQueue.length}): ${tipo}`);
    this._guardarColaOfflineLocal();
  }

  /**
   * Guardar cola en localStorage
   */
  _guardarColaOfflineLocal() {
    try {
      localStorage.setItem('realtime_offline_queue', JSON.stringify(this.offlineQueue));
    } catch (error) {
      this._error('Error guardando cola offline en localStorage:', error);
    }
  }

  /**
   * Cargar cola de localStorage
   */
  _cargarColaOfflineLocal() {
    try {
      const cola = localStorage.getItem('realtime_offline_queue');
      if (cola) {
        this.offlineQueue = JSON.parse(cola);
        this._log(`Cola offline cargada: ${this.offlineQueue.length} items`);
      }
    } catch (error) {
      this._error('Error cargando cola offline:', error);
    }
  }

  /**
   * Procesar cola offline cuando reconnecta
   */
  async _procesarColaOffline() {
    if (this.offlineQueue.length === 0) return;

    this._log(`Procesando ${this.offlineQueue.length} cambios offline...`);

    const cola = [...this.offlineQueue];
    this.offlineQueue = [];

    for (const cambio of cola) {
      try {
        switch (cambio.tipo) {
          case 'venta_creada':
            this.ventaCreada(cambio.data);
            break;
          case 'venta_actualizada':
            this.ventaActualizada(cambio.data);
            break;
          case 'venta_eliminada':
            this.ventaEliminada(cambio.data);
            break;
          case 'almacen_actualizado':
            this.almacenActualizado(cambio.data);
            break;
          case 'cliente_actualizado':
            this.clienteActualizado(cambio.data);
            break;
        }

        // Pequeño delay entre envíos
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        this._error(`Error procesando cambio offline: ${cambio.tipo}`, error);
      }
    }

    this._guardarColaOfflineLocal();
    this._log('✅ Cola offline procesada');
  }

  /**
   * Sincronizar cola pendiente del servidor
   */
  _sincronizarColaPendiente(cola) {
    if (!Array.isArray(cola) || cola.length === 0) return;

    this._log(`Sincronizando ${cola.length} eventos pendientes...`);

    for (const evento of cola) {
      try {
        switch (evento.tipo) {
          case 'venta_creada':
            this.callbacks.onVentaCreada(evento);
            break;
          case 'venta_actualizada':
            this.callbacks.onVentaActualizada(evento);
            break;
          case 'venta_eliminada':
            this.callbacks.onVentaEliminada(evento);
            break;
          case 'almacen_actualizado':
            this.callbacks.onAlmacenActualizado(evento);
            break;
          case 'cliente_actualizado':
            this.callbacks.onClienteActualizado(evento);
            break;
        }
      } catch (error) {
        this._error('Error sincronizando evento pendiente:', error);
      }
    }

    this.ultimaSincronizacion = new Date();
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Cargar Socket.io desde CDN
   */
  _cargarSocket() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.socket.io/4.5.4/socket.io.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  /**
   * Default callback (no-op)
   */
  _defaultCallback() {}

  /**
   * Logging
   */
  _log(...args) {
    if (this.debug) {
      console.log('[RealtimeClient]', ...args);
    }
  }

  /**
   * Error logging
   */
  _error(...args) {
    console.error('[RealtimeClient]', ...args);
  }

  /**
   * Desconectar
   */
  desconectar() {
    if (this.socket) {
      this.socket.disconnect();
      this._log('✅ Desconectado');
    }
  }

  /**
   * Reconectar
   */
  reconectar() {
    if (this.socket && !this.isConnected) {
      this.socket.connect();
      this._log('Reconectando...');
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═════════════════════════════════════════════════════════════════════════════

if (typeof window !== 'undefined') {
  window.RealtimeClient = RealtimeClient;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = RealtimeClient;
}
