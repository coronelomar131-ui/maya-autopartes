/**
 * backend/realtime/supabase-sync.js
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Supabase Realtime Sync - Escuchar cambios en BD y propagar a WebSocket
 *
 * Responsabilidades:
 * ✓ Conectar a Supabase y escuchar cambios
 * ✓ Recibir eventos de triggers de BD
 * ✓ Propagar cambios a WebSocket server
 * ✓ Asegurar consistencia de datos entre BD y clientes
 * ✓ Manejar errores y reintentos
 * ✓ Registrar logs de sincronización
 *
 * Eventos escuchados en Supabase:
 * - ventas.INSERT: Nueva venta creada
 * - ventas.UPDATE: Venta modificada
 * - ventas.DELETE: Venta eliminada
 * - almacen.UPDATE: Stock actualizado
 * - clientes.UPDATE: Datos de cliente modificados
 *
 * @version 1.0.0
 * @author Maya Autopartes Dev Team
 * @last-update 2026-04-22
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

// ═════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ═════════════════════════════════════════════════════════════════════════════

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xyzqgbmwfvhyjyxdffvl.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || '';

// Validar configuración
if (!SUPABASE_URL || !SUPABASE_KEY) {
  logger.error('❌ SUPABASE_URL y SUPABASE_ANON_KEY son requeridos');
  process.exit(1);
}

// ═════════════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT
// ═════════════════════════════════════════════════════════════════════════════

class SupabaseSyncManager {
  constructor(ioInstance) {
    this.supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    this.io = ioInstance;
    this.subscriptions = [];
    this.isConnected = false;

    // Estadísticas
    this.stats = {
      eventosRecibidos: 0,
      eventosPropagados: 0,
      errores: 0,
      ultimaSync: null
    };

    logger.info('SupabaseSyncManager inicializado');
  }

  /**
   * Inicializar todas las suscripciones
   */
  async inicializar() {
    try {
      logger.info('Inicializando suscripciones de Supabase...');

      // Suscribirse a cambios en ventas
      await this._setupVentasListener();

      // Suscribirse a cambios en almacén
      await this._setupAlmacenListener();

      // Suscribirse a cambios en clientes
      await this._setupClientesListener();

      this.isConnected = true;
      logger.info('✅ Todas las suscripciones inicializadas');

      return true;

    } catch (error) {
      logger.error('❌ Error inicializando suscripciones:', error);
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Listener: Cambios en tabla VENTAS
   */
  async _setupVentasListener() {
    try {
      const subscription = this.supabase
        .channel('public:ventas')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'ventas'
          },
          (payload) => {
            this._handleVentaInsert(payload);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'ventas'
          },
          (payload) => {
            this._handleVentaUpdate(payload);
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'DELETE',
            schema: 'public',
            table: 'ventas'
          },
          (payload) => {
            this._handleVentaDelete(payload);
          }
        )
        .subscribe();

      this.subscriptions.push(subscription);
      logger.info('✅ Listener de ventas configurado');

    } catch (error) {
      logger.error('Error configurando listener de ventas:', error);
      throw error;
    }
  }

  /**
   * Listener: Cambios en tabla ALMACEN
   */
  async _setupAlmacenListener() {
    try {
      const subscription = this.supabase
        .channel('public:almacen')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'almacen'
          },
          (payload) => {
            this._handleAlmacenUpdate(payload);
          }
        )
        .subscribe();

      this.subscriptions.push(subscription);
      logger.info('✅ Listener de almacén configurado');

    } catch (error) {
      logger.error('Error configurando listener de almacén:', error);
      throw error;
    }
  }

  /**
   * Listener: Cambios en tabla CLIENTES
   */
  async _setupClientesListener() {
    try {
      const subscription = this.supabase
        .channel('public:clientes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'clientes'
          },
          (payload) => {
            this._handleClienteUpdate(payload);
          }
        )
        .subscribe();

      this.subscriptions.push(subscription);
      logger.info('✅ Listener de clientes configurado');

    } catch (error) {
      logger.error('Error configurando listener de clientes:', error);
      throw error;
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // HANDLERS: VENTAS
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Handle: Venta creada (INSERT)
   */
  _handleVentaInsert(payload) {
    try {
      this.stats.eventosRecibidos++;

      const evento = {
        tipo: 'venta_creada',
        ventaId: payload.new.id,
        data: payload.new,
        timestamp: new Date().toISOString(),
        fuente: 'supabase'
      };

      logger.info(`Nueva venta en BD: ${payload.new.id}`);

      // Propagar a todos los clientes conectados
      this.io.emit('venta_creada', evento);

      this.stats.eventosPropagados++;
      this._updateLastSync();

    } catch (error) {
      logger.error('Error en _handleVentaInsert:', error);
      this.stats.errores++;
    }
  }

  /**
   * Handle: Venta actualizada (UPDATE)
   */
  _handleVentaUpdate(payload) {
    try {
      this.stats.eventosRecibidos++;

      // Detectar cambios
      const cambios = this._detectarCambios(payload.old, payload.new);

      const evento = {
        tipo: 'venta_actualizada',
        ventaId: payload.new.id,
        data: payload.new,
        cambios: cambios,
        anterior: payload.old,
        timestamp: new Date().toISOString(),
        fuente: 'supabase'
      };

      logger.info(`Venta actualizada en BD: ${payload.new.id}`);

      this.io.emit('venta_actualizada', evento);

      this.stats.eventosPropagados++;
      this._updateLastSync();

    } catch (error) {
      logger.error('Error en _handleVentaUpdate:', error);
      this.stats.errores++;
    }
  }

  /**
   * Handle: Venta eliminada (DELETE)
   */
  _handleVentaDelete(payload) {
    try {
      this.stats.eventosRecibidos++;

      const evento = {
        tipo: 'venta_eliminada',
        ventaId: payload.old.id,
        data: payload.old,
        timestamp: new Date().toISOString(),
        fuente: 'supabase'
      };

      logger.info(`Venta eliminada en BD: ${payload.old.id}`);

      this.io.emit('venta_eliminada', evento);

      this.stats.eventosPropagados++;
      this._updateLastSync();

    } catch (error) {
      logger.error('Error en _handleVentaDelete:', error);
      this.stats.errores++;
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // HANDLERS: ALMACÉN
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Handle: Almacén actualizado (UPDATE)
   */
  _handleAlmacenUpdate(payload) {
    try {
      this.stats.eventosRecibidos++;

      // Calcular cambio de stock
      const stockAnterior = payload.old?.cantidad || 0;
      const stockNuevo = payload.new?.cantidad || 0;
      const diferencia = stockNuevo - stockAnterior;

      const evento = {
        tipo: 'almacen_actualizado',
        productoId: payload.new.id,
        producto: payload.new.nombre,
        stockAnterior,
        stockNuevo,
        diferencia,
        precioActual: payload.new.precio,
        timestamp: new Date().toISOString(),
        fuente: 'supabase'
      };

      logger.info(
        `Stock actualizado: ${payload.new.nombre} (${stockAnterior} → ${stockNuevo})`
      );

      this.io.emit('almacen_actualizado', evento);

      // Si stock es bajo, emitir alerta especial
      if (stockNuevo < 10) {
        this.io.emit('alerta_stock_bajo', {
          productoId: payload.new.id,
          producto: payload.new.nombre,
          stockActual: stockNuevo,
          timestamp: new Date().toISOString()
        });
      }

      this.stats.eventosPropagados++;
      this._updateLastSync();

    } catch (error) {
      logger.error('Error en _handleAlmacenUpdate:', error);
      this.stats.errores++;
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // HANDLERS: CLIENTES
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Handle: Cliente actualizado (UPDATE)
   */
  _handleClienteUpdate(payload) {
    try {
      this.stats.eventosRecibidos++;

      const cambios = this._detectarCambios(payload.old, payload.new);

      const evento = {
        tipo: 'cliente_actualizado',
        clienteId: payload.new.id,
        nombreCliente: payload.new.nombre,
        cambios: cambios,
        data: payload.new,
        timestamp: new Date().toISOString(),
        fuente: 'supabase'
      };

      logger.info(`Cliente actualizado: ${payload.new.nombre}`);

      this.io.emit('cliente_actualizado', evento);

      this.stats.eventosPropagados++;
      this._updateLastSync();

    } catch (error) {
      logger.error('Error en _handleClienteUpdate:', error);
      this.stats.errores++;
    }
  }

  // ═════════════════════════════════════════════════════════════════════════════
  // UTILITY METHODS
  // ═════════════════════════════════════════════════════════════════════════════

  /**
   * Detectar qué campos cambiaron
   */
  _detectarCambios(old, nuevo) {
    const cambios = {};

    if (!old || !nuevo) return cambios;

    Object.keys(nuevo).forEach(key => {
      if (old[key] !== nuevo[key]) {
        cambios[key] = {
          anterior: old[key],
          nuevo: nuevo[key]
        };
      }
    });

    return cambios;
  }

  /**
   * Actualizar timestamp de última sincronización
   */
  _updateLastSync() {
    this.stats.ultimaSync = new Date().toISOString();
  }

  /**
   * Obtener estadísticas
   */
  getEstadisticas() {
    return {
      ...this.stats,
      isConnected: this.isConnected,
      subscripciones: this.subscriptions.length
    };
  }

  /**
   * Desuscribirse de todos los canales
   */
  async limpiar() {
    try {
      for (const subscription of this.subscriptions) {
        await this.supabase.removeChannel(subscription);
      }
      this.subscriptions = [];
      this.isConnected = false;
      logger.info('✅ Todas las suscripciones eliminadas');
    } catch (error) {
      logger.error('Error limpiando suscripciones:', error);
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═════════════════════════════════════════════════════════════════════════════

module.exports = SupabaseSyncManager;
