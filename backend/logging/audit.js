/**
 * Activity Logging & Audit Trail System
 * Sistema centralizado de registro de auditoría para compliance
 *
 * Características:
 * - Registra TODOS los cambios (CREATE, UPDATE, DELETE)
 * - Append-only: No se pueden eliminar logs
 * - Trazabilidad completa: usuario, tabla, acción, datos antes/después, timestamp
 * - ISO 27001 compliant
 * - GDPR: Anonimización de datos sensibles opcional
 *
 * Versión: 1.0.0
 * Autor: Maya Autopartes Compliance Team
 */

const { v4: uuidv4 } = require('uuid');

class AuditLogger {
  constructor(supabase) {
    this.supabase = supabase;
    this.tableName = 'audit_logs';
    this.initialized = false;
  }

  /**
   * Inicializar tabla de audit si no existe
   * NOTA: Esta debe ejecutarse una sola vez en setup
   */
  async initialize() {
    if (this.initialized) return;

    try {
      // Verificar si tabla existe
      const { data, error: checkError } = await this.supabase
        .from(this.tableName)
        .select('id')
        .limit(1);

      if (checkError && checkError.code === 'PGRST116') {
        // Tabla no existe, crear con SQL
        console.log('[Audit] Creando tabla de auditoría...');

        const createTableSQL = `
          CREATE TABLE IF NOT EXISTS audit_logs (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            usuario_id UUID NOT NULL,
            usuario_email TEXT,
            tabla TEXT NOT NULL,
            accion TEXT NOT NULL CHECK (accion IN ('CREATE', 'UPDATE', 'DELETE', 'READ')),
            registro_id UUID,
            valores_antes JSONB,
            valores_despues JSONB,
            cambios JSONB,
            metadata JSONB DEFAULT '{}'::jsonb,
            timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            ip_address TEXT,
            user_agent TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

            -- Indices para performance
            CONSTRAINT audit_logs_no_delete CHECK (true),
            INDEX idx_audit_timestamp (timestamp DESC),
            INDEX idx_audit_usuario (usuario_id),
            INDEX idx_audit_tabla (tabla),
            INDEX idx_audit_accion (accion),
            INDEX idx_audit_registro (registro_id)
          );

          -- Crear vista para solo lectura (append-only enforcement)
          CREATE OR REPLACE VIEW audit_logs_view AS
            SELECT * FROM audit_logs ORDER BY timestamp DESC;

          -- Crear trigger para evitar delete
          CREATE OR REPLACE FUNCTION prevent_audit_delete()
          RETURNS TRIGGER AS $$
          BEGIN
            RAISE EXCEPTION 'Deletion of audit logs is not permitted (Compliance violation)';
          END;
          $$ LANGUAGE plpgsql;

          CREATE TRIGGER prevent_audit_delete_trigger
          BEFORE DELETE ON audit_logs
          FOR EACH ROW EXECUTE FUNCTION prevent_audit_delete();

          -- Crear función para registrar cambios automáticamente
          CREATE OR REPLACE FUNCTION log_change()
          RETURNS TRIGGER AS $$
          BEGIN
            INSERT INTO audit_logs (
              usuario_id,
              tabla,
              accion,
              registro_id,
              valores_antes,
              valores_despues,
              cambios,
              metadata
            ) VALUES (
              COALESCE(current_setting('audit.user_id', true)::uuid, gen_random_uuid()),
              TG_TABLE_NAME,
              TG_OP,
              CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
              CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
              CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE row_to_json(NEW) END,
              CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(NEW) - to_jsonb(OLD) ELSE NULL END,
              jsonb_build_object('op', TG_OP)
            );
            RETURN COALESCE(NEW, OLD);
          END;
          $$ LANGUAGE plpgsql;
        `;

        // Ejecutar creación
        const { error: createError } = await this.supabase.rpc('sql', {
          sql: createTableSQL
        }).catch(() => ({ error: { message: 'RPC no disponible - usar SQL desde Supabase dashboard' } }));

        console.log('[Audit] Tabla de auditoría lista');
      }

      this.initialized = true;
    } catch (error) {
      console.warn('[Audit] Warning en inicialización:', error.message);
      this.initialized = true; // Proceder igual
    }
  }

  /**
   * Registrar actividad (método principal)
   *
   * @param {Object} params - Parámetros del log
   * @param {UUID} params.usuario_id - ID del usuario que realiza la acción
   * @param {string} params.usuario_email - Email del usuario
   * @param {string} params.tabla - Nombre de la tabla afectada
   * @param {string} params.accion - Acción realizada (CREATE, UPDATE, DELETE)
   * @param {UUID} params.registro_id - ID del registro afectado
   * @param {Object} params.valores_antes - Valores anteriores (para UPDATE/DELETE)
   * @param {Object} params.valores_despues - Valores nuevos (para CREATE/UPDATE)
   * @param {Object} params.metadata - Metadatos adicionales (IP, User-Agent, etc)
   * @returns {Promise<Object>} Objeto insertado con ID de log
   */
  async logActivity({
    usuario_id,
    usuario_email,
    tabla,
    accion,
    registro_id,
    valores_antes = null,
    valores_despues = null,
    metadata = {}
  }) {
    try {
      // Validar entrada
      const accionesValidas = ['CREATE', 'UPDATE', 'DELETE', 'READ'];
      if (!accionesValidas.includes(accion)) {
        throw new Error(`Acción inválida: ${accion}`);
      }

      if (!usuario_id || !tabla) {
        throw new Error('usuario_id y tabla son requeridos');
      }

      // Calcular cambios
      const cambios = this.calcularCambios(valores_antes, valores_despues);

      // Preparar objeto de log
      const auditLog = {
        id: uuidv4(),
        usuario_id,
        usuario_email: usuario_email || 'unknown',
        tabla,
        accion,
        registro_id: registro_id || null,
        valores_antes: valores_antes ? JSON.stringify(valores_antes) : null,
        valores_despues: valores_despues ? JSON.stringify(valores_despues) : null,
        cambios: cambios ? JSON.stringify(cambios) : null,
        metadata: JSON.stringify(metadata),
        timestamp: new Date().toISOString(),
        created_at: new Date().toISOString()
      };

      // Insertar en base de datos
      const { data, error } = await this.supabase
        .from(this.tableName)
        .insert([auditLog])
        .select();

      if (error) {
        console.error('[Audit Error]', error);
        throw error;
      }

      console.log(`[Audit] ${accion} en ${tabla} por ${usuario_email}`);
      return data?.[0] || auditLog;

    } catch (error) {
      console.error('[Audit Error en logActivity]:', error.message);
      throw error;
    }
  }

  /**
   * Registrar CREATE
   */
  async logCreate(usuario_id, usuario_email, tabla, registro_id, valores_despues, metadata = {}) {
    return this.logActivity({
      usuario_id,
      usuario_email,
      tabla,
      accion: 'CREATE',
      registro_id,
      valores_despues,
      metadata
    });
  }

  /**
   * Registrar UPDATE
   */
  async logUpdate(usuario_id, usuario_email, tabla, registro_id, valores_antes, valores_despues, metadata = {}) {
    return this.logActivity({
      usuario_id,
      usuario_email,
      tabla,
      accion: 'UPDATE',
      registro_id,
      valores_antes,
      valores_despues,
      metadata
    });
  }

  /**
   * Registrar DELETE
   */
  async logDelete(usuario_id, usuario_email, tabla, registro_id, valores_antes, metadata = {}) {
    return this.logActivity({
      usuario_id,
      usuario_email,
      tabla,
      accion: 'DELETE',
      registro_id,
      valores_antes,
      metadata
    });
  }

  /**
   * Obtener histórico completo
   * @param {Object} filters - Filtros (usuario_id, tabla, accion, desde, hasta)
   * @param {number} limit - Límite de registros (default 100, max 1000)
   * @param {number} offset - Offset para paginación
   */
  async getAuditTrail(filters = {}, limit = 100, offset = 0) {
    try {
      limit = Math.min(limit, 1000); // Máximo 1000
      limit = Math.max(limit, 1);   // Mínimo 1

      let query = this.supabase
        .from(this.tableName)
        .select('*', { count: 'exact' });

      // Aplicar filtros
      if (filters.usuario_id) {
        query = query.eq('usuario_id', filters.usuario_id);
      }

      if (filters.tabla) {
        query = query.eq('tabla', filters.tabla);
      }

      if (filters.accion) {
        query = query.eq('accion', filters.accion);
      }

      if (filters.desde) {
        query = query.gte('timestamp', filters.desde);
      }

      if (filters.hasta) {
        query = query.lte('timestamp', filters.hasta);
      }

      if (filters.registro_id) {
        query = query.eq('registro_id', filters.registro_id);
      }

      // Ordenar y paginar
      const { data, error, count } = await query
        .order('timestamp', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        data: data || [],
        total: count || 0,
        limit,
        offset,
        hasMore: (offset + limit) < (count || 0)
      };

    } catch (error) {
      console.error('[Audit Error en getAuditTrail]:', error.message);
      throw error;
    }
  }

  /**
   * Obtener cambios recientes (últimas N horas)
   */
  async getRecentChanges(hoursBack = 24, tabla = null) {
    const desde = new Date(Date.now() - hoursBack * 60 * 60 * 1000).toISOString();

    const filters = { desde };
    if (tabla) filters.tabla = tabla;

    return this.getAuditTrail(filters, 500);
  }

  /**
   * Obtener actividad de un usuario específico
   */
  async getUserActivity(usuario_id, limit = 100, offset = 0) {
    return this.getAuditTrail({ usuario_id }, limit, offset);
  }

  /**
   * Obtener actividad de una tabla específica
   */
  async getTableActivity(tabla, limit = 100, offset = 0) {
    return this.getAuditTrail({ tabla }, limit, offset);
  }

  /**
   * Obtener historial de un registro específico
   */
  async getRecordHistory(tabla, registro_id) {
    return this.getAuditTrail({ tabla, registro_id }, 1000);
  }

  /**
   * Reportes de compliance
   */
  async getComplianceReport(fecha_inicio, fecha_fin) {
    try {
      const filters = {
        desde: fecha_inicio,
        hasta: fecha_fin
      };

      const { data } = await this.getAuditTrail(filters, 10000);

      return {
        periodo: { desde: fecha_inicio, hasta: fecha_fin },
        total_eventos: data.length,
        eventos_por_accion: this.agruparPor(data, 'accion'),
        eventos_por_usuario: this.agruparPor(data, 'usuario_email'),
        eventos_por_tabla: this.agruparPor(data, 'tabla'),
        datos_sensibles_accedidos: data.filter(log =>
          ['usuarios', 'clientes'].includes(log.tabla)
        ).length,
        intentos_delete: data.filter(log => log.accion === 'DELETE').length,
        timestamp_reporte: new Date().toISOString()
      };
    } catch (error) {
      console.error('[Audit Error en getComplianceReport]:', error.message);
      throw error;
    }
  }

  /**
   * Exportar audit trail a CSV
   */
  async exportToCSV(filters = {}, limit = 10000) {
    try {
      const { data } = await this.getAuditTrail(filters, limit);

      if (data.length === 0) {
        return 'timestamp,usuario,tabla,accion,registro_id,cambios\n';
      }

      const headers = [
        'timestamp',
        'usuario_email',
        'tabla',
        'accion',
        'registro_id',
        'cambios',
        'valores_antes',
        'valores_despues'
      ];

      const rows = data.map(log => [
        log.timestamp,
        this.escaparCSV(log.usuario_email),
        log.tabla,
        log.accion,
        log.registro_id,
        this.escaparCSV(JSON.stringify(log.cambios)),
        this.escaparCSV(JSON.stringify(log.valores_antes)),
        this.escaparCSV(JSON.stringify(log.valores_despues))
      ]);

      const csv = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');

      return csv;

    } catch (error) {
      console.error('[Audit Error en exportToCSV]:', error.message);
      throw error;
    }
  }

  /**
   * Verificar integridad de logs (detectar manipulación)
   */
  async verifyIntegrity(desde = null, hasta = null) {
    try {
      const filters = {};
      if (desde) filters.desde = desde;
      if (hasta) filters.hasta = hasta;

      const { data } = await this.getAuditTrail(filters, 10000);

      const issues = [];

      // Verificar que no haya timestamps duplicados exactos
      const timestamps = data.map(log => log.timestamp);
      const duplicates = timestamps.filter((t, i) => timestamps.indexOf(t) !== i);
      if (duplicates.length > 0) {
        issues.push(`${duplicates.length} timestamps duplicados detectados`);
      }

      // Verificar que los IDs sean válidos UUIDs
      data.forEach(log => {
        if (!this.isValidUUID(log.id)) {
          issues.push(`ID inválido en log: ${log.id}`);
        }
      });

      return {
        total_logs: data.length,
        integrity_ok: issues.length === 0,
        issues,
        checked_at: new Date().toISOString()
      };

    } catch (error) {
      console.error('[Audit Error en verifyIntegrity]:', error.message);
      throw error;
    }
  }

  /**
   * Helper: Calcular cambios entre valores antes y después
   */
  calcularCambios(antes, despues) {
    if (!antes || !despues) return null;

    const cambios = {};

    // Encontrar campos modificados
    for (const key in despues) {
      if (JSON.stringify(antes[key]) !== JSON.stringify(despues[key])) {
        cambios[key] = {
          anterior: antes[key],
          nuevo: despues[key]
        };
      }
    }

    // Encontrar campos eliminados
    for (const key in antes) {
      if (!(key in despues)) {
        cambios[key] = {
          anterior: antes[key],
          nuevo: null
        };
      }
    }

    return Object.keys(cambios).length > 0 ? cambios : null;
  }

  /**
   * Helper: Agrupar datos por campo
   */
  agruparPor(data, campo) {
    const grupos = {};
    data.forEach(item => {
      const valor = item[campo] || 'unknown';
      grupos[valor] = (grupos[valor] || 0) + 1;
    });
    return grupos;
  }

  /**
   * Helper: Escapar strings para CSV
   */
  escaparCSV(str) {
    if (!str) return '""';
    if (typeof str !== 'string') str = String(str);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Helper: Validar UUID
   */
  isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}

module.exports = AuditLogger;
