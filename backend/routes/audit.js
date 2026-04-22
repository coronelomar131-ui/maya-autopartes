/**
 * API Routes para Audit Trail
 * Endpoints para consultar, filtrar y exportar logs de auditoría
 *
 * Versión: 1.0.0
 * Rutas:
 * - GET /api/audit (últimos 100 eventos)
 * - GET /api/audit?usuario=email (actividad de usuario)
 * - GET /api/audit?tabla=tabla_name (actividad de tabla)
 * - GET /api/audit/export (descargar CSV)
 * - GET /api/audit/compliance (reporte de compliance)
 * - GET /api/audit/integrity (verificar integridad)
 * - GET /api/audit/record/:tabla/:id (historial de registro)
 * - POST /api/audit/log (registrar actividad - interno)
 */

const express = require('express');
const router = express.Router();
const AuditLogger = require('../logging/audit');

// Instancia global (compartida)
let auditLogger = null;

/**
 * Middleware para inicializar auditLogger si no existe
 */
router.use((req, res, next) => {
  if (!auditLogger && req.supabase) {
    auditLogger = new AuditLogger(req.supabase);
  }
  req.auditLogger = auditLogger;
  next();
});

/**
 * GET /api/audit
 * Obtener últimos eventos de auditoría con filtros opcionales
 *
 * Query params:
 * - limit: número de registros (default 100, max 1000)
 * - offset: para paginación (default 0)
 * - usuario: filtrar por usuario_id o usuario_email
 * - tabla: filtrar por nombre de tabla
 * - accion: filtrar por acción (CREATE, UPDATE, DELETE, READ)
 * - desde: fecha inicio (ISO 8601)
 * - hasta: fecha fin (ISO 8601)
 * - registro_id: filtrar por ID de registro específico
 *
 * Response: { data: [...], total, limit, offset, hasMore }
 */
router.get('/', async (req, res) => {
  try {
    const { limit = 100, offset = 0, usuario, tabla, accion, desde, hasta, registro_id } = req.query;

    // Construir filtros
    const filters = {};

    if (usuario) {
      // Puede ser usuario_id o usuario_email
      filters.usuario_id = usuario; // Intentar como UUID
    }

    if (tabla) {
      filters.tabla = tabla;
    }

    if (accion) {
      const accionesValidas = ['CREATE', 'UPDATE', 'DELETE', 'READ'];
      if (accionesValidas.includes(accion.toUpperCase())) {
        filters.accion = accion.toUpperCase();
      }
    }

    if (desde) {
      filters.desde = desde;
    }

    if (hasta) {
      filters.hasta = hasta;
    }

    if (registro_id) {
      filters.registro_id = registro_id;
    }

    // Obtener datos
    const result = await req.auditLogger.getAuditTrail(
      filters,
      Math.min(parseInt(limit) || 100, 1000),
      parseInt(offset) || 0
    );

    res.json(result);

  } catch (error) {
    console.error('[Audit Route Error]', error);
    res.status(500).json({
      error: 'Error obteniendo audit trail',
      message: error.message
    });
  }
});

/**
 * GET /api/audit/recent
 * Obtener cambios recientes (últimas N horas)
 *
 * Query params:
 * - hours: horas hacia atrás (default 24)
 * - tabla: filtrar por tabla (opcional)
 */
router.get('/recent', async (req, res) => {
  try {
    const { hours = 24, tabla } = req.query;

    const result = await req.auditLogger.getRecentChanges(
      parseInt(hours) || 24,
      tabla || null
    );

    res.json(result);

  } catch (error) {
    console.error('[Audit Route Error]', error);
    res.status(500).json({
      error: 'Error obteniendo cambios recientes',
      message: error.message
    });
  }
});

/**
 * GET /api/audit/user/:usuario_id
 * Obtener actividad completa de un usuario específico
 */
router.get('/user/:usuario_id', async (req, res) => {
  try {
    const { usuario_id } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    const result = await req.auditLogger.getUserActivity(
      usuario_id,
      Math.min(parseInt(limit) || 100, 1000),
      parseInt(offset) || 0
    );

    res.json(result);

  } catch (error) {
    console.error('[Audit Route Error]', error);
    res.status(500).json({
      error: 'Error obteniendo actividad de usuario',
      message: error.message
    });
  }
});

/**
 * GET /api/audit/table/:tabla
 * Obtener actividad completa de una tabla específica
 */
router.get('/table/:tabla', async (req, res) => {
  try {
    const { tabla } = req.params;
    const { limit = 100, offset = 0 } = req.query;

    const result = await req.auditLogger.getTableActivity(
      tabla,
      Math.min(parseInt(limit) || 100, 1000),
      parseInt(offset) || 0
    );

    res.json(result);

  } catch (error) {
    console.error('[Audit Route Error]', error);
    res.status(500).json({
      error: 'Error obteniendo actividad de tabla',
      message: error.message
    });
  }
});

/**
 * GET /api/audit/record/:tabla/:record_id
 * Obtener historial completo de un registro específico
 *
 * Muestra todos los cambios aplicados a un registro
 */
router.get('/record/:tabla/:record_id', async (req, res) => {
  try {
    const { tabla, record_id } = req.params;

    const result = await req.auditLogger.getRecordHistory(tabla, record_id);

    res.json(result);

  } catch (error) {
    console.error('[Audit Route Error]', error);
    res.status(500).json({
      error: 'Error obteniendo historial de registro',
      message: error.message
    });
  }
});

/**
 * GET /api/audit/export
 * Exportar audit trail a CSV
 *
 * Query params (mismos filtros que GET /api/audit):
 * - usuario, tabla, accion, desde, hasta, registro_id
 * - limit: máximo 10000 registros
 *
 * Response: archivo CSV descargable
 */
router.get('/export', async (req, res) => {
  try {
    const { usuario, tabla, accion, desde, hasta, registro_id, limit = 10000 } = req.query;

    const filters = {};
    if (usuario) filters.usuario_id = usuario;
    if (tabla) filters.tabla = tabla;
    if (accion) filters.accion = accion.toUpperCase();
    if (desde) filters.desde = desde;
    if (hasta) filters.hasta = hasta;
    if (registro_id) filters.registro_id = registro_id;

    const csv = await req.auditLogger.exportToCSV(
      filters,
      Math.min(parseInt(limit) || 10000, 50000)
    );

    // Preparar respuesta como descarga
    const timestamp = new Date().toISOString().split('T')[0];
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit_trail_${timestamp}.csv"`);
    res.send(csv);

  } catch (error) {
    console.error('[Audit Route Error]', error);
    res.status(500).json({
      error: 'Error exportando audit trail',
      message: error.message
    });
  }
});

/**
 * GET /api/audit/compliance
 * Generar reporte de compliance (ISO 27001, GDPR)
 *
 * Query params:
 * - desde: fecha inicio (requerido)
 * - hasta: fecha fin (requerido)
 *
 * Response: Reporte con estadísticas, accesos a datos sensibles, etc.
 */
router.get('/compliance', async (req, res) => {
  try {
    const { desde, hasta } = req.query;

    if (!desde || !hasta) {
      return res.status(400).json({
        error: 'Parámetros requeridos: desde, hasta'
      });
    }

    const report = await req.auditLogger.getComplianceReport(desde, hasta);

    res.json(report);

  } catch (error) {
    console.error('[Audit Route Error]', error);
    res.status(500).json({
      error: 'Error generando reporte de compliance',
      message: error.message
    });
  }
});

/**
 * GET /api/audit/integrity
 * Verificar integridad de los logs (detectar manipulación)
 *
 * Query params:
 * - desde: fecha inicio (opcional)
 * - hasta: fecha fin (opcional)
 *
 * Response: { total_logs, integrity_ok, issues: [...] }
 */
router.get('/integrity', async (req, res) => {
  try {
    const { desde, hasta } = req.query;

    const result = await req.auditLogger.verifyIntegrity(desde, hasta);

    res.json(result);

  } catch (error) {
    console.error('[Audit Route Error]', error);
    res.status(500).json({
      error: 'Error verificando integridad',
      message: error.message
    });
  }
});

/**
 * POST /api/audit/log
 * Registrar actividad manualmente (uso interno)
 *
 * Body:
 * {
 *   usuario_id: UUID,
 *   usuario_email: string,
 *   tabla: string,
 *   accion: 'CREATE' | 'UPDATE' | 'DELETE' | 'READ',
 *   registro_id?: UUID,
 *   valores_antes?: object,
 *   valores_despues?: object,
 *   metadata?: object
 * }
 *
 * Response: { id, ... } - El log insertado
 */
router.post('/log', async (req, res) => {
  try {
    const {
      usuario_id,
      usuario_email,
      tabla,
      accion,
      registro_id,
      valores_antes,
      valores_despues,
      metadata
    } = req.body;

    // Validar entrada
    if (!usuario_id || !tabla || !accion) {
      return res.status(400).json({
        error: 'Campos requeridos: usuario_id, tabla, accion'
      });
    }

    const result = await req.auditLogger.logActivity({
      usuario_id,
      usuario_email: usuario_email || 'api',
      tabla,
      accion: accion.toUpperCase(),
      registro_id,
      valores_antes,
      valores_despues,
      metadata: {
        ...metadata,
        ip: req.ip,
        user_agent: req.get('user-agent')
      }
    });

    res.status(201).json(result);

  } catch (error) {
    console.error('[Audit Route Error]', error);
    res.status(500).json({
      error: 'Error registrando actividad',
      message: error.message
    });
  }
});

/**
 * POST /api/audit/initialize
 * Inicializar tabla de auditoría (requiere permisos admin)
 * NOTA: Ejecutar solo una vez en setup
 */
router.post('/initialize', async (req, res) => {
  try {
    // En producción, verificar API key o token admin
    const adminKey = req.get('x-admin-key');
    if (!adminKey || adminKey !== process.env.ADMIN_KEY) {
      return res.status(403).json({
        error: 'No autorizado'
      });
    }

    await req.auditLogger.initialize();

    res.json({
      success: true,
      message: 'Tabla de auditoría inicializada'
    });

  } catch (error) {
    console.error('[Audit Route Error]', error);
    res.status(500).json({
      error: 'Error inicializando auditoría',
      message: error.message
    });
  }
});

module.exports = router;
