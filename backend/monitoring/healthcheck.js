/**
 * Maya Autopartes - Health Check Monitor
 * Endpoints para verificar salud de servicios
 * Versión: 1.0.0
 *
 * Endpoints:
 * - GET /health           Salud general del servidor
 * - GET /health/db        Verificar conexión a Supabase
 * - GET /health/redis     Verificar conexión a Redis (si está configurado)
 * - GET /health/detailed  Reporte detallado de todos los servicios
 */

const express = require('express');

// ============================================================================
// SALUD DEL SERVIDOR
// ============================================================================

/**
 * Verificar si el servidor está activo y respondiendo
 */
async function checkServerHealth() {
  return {
    status: 'healthy',
    uptime: process.uptime(),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    },
    cpu: {
      usage: process.cpuUsage()
    }
  };
}

// ============================================================================
// SALUD DE BASE DE DATOS
// ============================================================================

/**
 * Verificar conexión a Supabase
 */
async function checkDatabaseHealth(supabase) {
  const startTime = Date.now();

  try {
    if (!supabase) {
      return {
        status: 'unhealthy',
        error: 'Supabase client no inicializado',
        latency: 0
      };
    }

    // Intentar una query simple
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .limit(1);

    const latency = Date.now() - startTime;

    if (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        latency
      };
    }

    return {
      status: 'healthy',
      connected: true,
      latency,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      latency: Date.now() - startTime
    };
  }
}

// ============================================================================
// SALUD DE REDIS (Opcional)
// ============================================================================

/**
 * Verificar conexión a Redis
 */
async function checkRedisHealth(redisClient) {
  const startTime = Date.now();

  try {
    if (!redisClient) {
      return {
        status: 'disabled',
        message: 'Redis no está configurado'
      };
    }

    // Intentar PING
    const response = await redisClient.ping();
    const latency = Date.now() - startTime;

    if (response === 'PONG') {
      return {
        status: 'healthy',
        connected: true,
        latency,
        timestamp: new Date().toISOString()
      };
    } else {
      return {
        status: 'unhealthy',
        error: 'PING no respondió correctamente',
        latency
      };
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error.message,
      latency: Date.now() - startTime
    };
  }
}

// ============================================================================
// ESTADÍSTICAS AGREGADAS
// ============================================================================

class HealthCheckAggregator {
  constructor() {
    this.checks = {};
    this.startTime = Date.now();
  }

  /**
   * Registrar resultado de health check
   */
  registerCheck(name, result) {
    this.checks[name] = {
      ...result,
      checkedAt: new Date().toISOString()
    };
  }

  /**
   * Obtener estado general
   */
  getOverallStatus() {
    const statuses = Object.values(this.checks).map(c => c.status);

    // Lógica: si alguno es 'unhealthy', el general es unhealthy
    if (statuses.includes('unhealthy')) {
      return 'unhealthy';
    }

    // Si todos son 'disabled', retornar degraded
    if (statuses.every(s => s === 'disabled')) {
      return 'degraded';
    }

    return 'healthy';
  }

  /**
   * Obtener reporte completo
   */
  getReport() {
    const overallStatus = this.getOverallStatus();
    const uptime = Date.now() - this.startTime;

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: {
        ms: uptime,
        seconds: Math.round(uptime / 1000),
        minutes: Math.round(uptime / 1000 / 60),
        hours: Math.round(uptime / 1000 / 60 / 60)
      },
      checks: this.checks
    };
  }
}

// ============================================================================
// FACTORY PARA CREAR RUTAS DE HEALTH CHECK
// ============================================================================

/**
 * Crear rutas de health check
 * Uso: app.use(createHealthCheckRoutes(supabase, redisClient))
 */
function createHealthCheckRoutes(supabase, redisClient = null) {
  const router = express.Router();
  const aggregator = new HealthCheckAggregator();

  /**
   * GET /health
   * Health check básico del servidor
   */
  router.get('/', async (req, res) => {
    try {
      const serverHealth = await checkServerHealth();
      const dbHealth = await checkDatabaseHealth(supabase);

      const overallStatus = dbHealth.status === 'healthy' ? 'healthy' : 'degraded';

      res.status(overallStatus === 'healthy' ? 200 : 503).json({
        status: overallStatus,
        timestamp: new Date().toISOString(),
        uptime: serverHealth.uptime,
        environment: process.env.NODE_ENV || 'development',
        database: dbHealth.status,
        latency: {
          db: dbHealth.latency || 0
        }
      });
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /health/db
   * Verificación detallada de base de datos
   */
  router.get('/db', async (req, res) => {
    try {
      const dbHealth = await checkDatabaseHealth(supabase);
      const statusCode = dbHealth.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json({
        service: 'database',
        ...dbHealth,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        service: 'database',
        status: 'unhealthy',
        error: error.message
      });
    }
  });

  /**
   * GET /health/redis
   * Verificación de Redis (si está configurado)
   */
  router.get('/redis', async (req, res) => {
    try {
      const redisHealth = await checkRedisHealth(redisClient);
      const statusCode = redisHealth.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json({
        service: 'redis',
        ...redisHealth,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(503).json({
        service: 'redis',
        status: 'unhealthy',
        error: error.message
      });
    }
  });

  /**
   * GET /health/detailed
   * Reporte completo de salud
   */
  router.get('/detailed', async (req, res) => {
    try {
      const serverHealth = await checkServerHealth();
      const dbHealth = await checkDatabaseHealth(supabase);
      const redisHealth = await checkRedisHealth(redisClient);

      aggregator.registerCheck('server', serverHealth);
      aggregator.registerCheck('database', dbHealth);
      aggregator.registerCheck('redis', redisHealth);

      const report = aggregator.getReport();
      const statusCode = report.status === 'healthy' ? 200 : 503;

      res.status(statusCode).json(report);
    } catch (error) {
      res.status(503).json({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * GET /health/memory
   * Información de memoria
   */
  router.get('/memory', (req, res) => {
    const memUsage = process.memoryUsage();

    res.json({
      timestamp: new Date().toISOString(),
      memory: {
        rss: {
          bytes: memUsage.rss,
          mb: Math.round(memUsage.rss / 1024 / 1024)
        },
        heapTotal: {
          bytes: memUsage.heapTotal,
          mb: Math.round(memUsage.heapTotal / 1024 / 1024)
        },
        heapUsed: {
          bytes: memUsage.heapUsed,
          mb: Math.round(memUsage.heapUsed / 1024 / 1024)
        },
        external: {
          bytes: memUsage.external,
          mb: Math.round(memUsage.external / 1024 / 1024)
        },
        arrayBuffers: {
          bytes: memUsage.arrayBuffers || 0,
          mb: Math.round((memUsage.arrayBuffers || 0) / 1024 / 1024)
        }
      }
    });
  });

  /**
   * GET /health/status
   * Estado simple (texto plano para monitoreo)
   */
  router.get('/status', async (req, res) => {
    try {
      const dbHealth = await checkDatabaseHealth(supabase);

      if (dbHealth.status === 'healthy') {
        res.status(200).send('OK');
      } else {
        res.status(503).send('UNHEALTHY');
      }
    } catch (error) {
      res.status(503).send('ERROR');
    }
  });

  return router;
}

// ============================================================================
// MIDDLEWARE PARA MONITOREO CONTINUO
// ============================================================================

/**
 * Middleware para rastrear latencia de respuestas
 */
function responseTimeMiddleware(req, res, next) {
  const startTime = Date.now();

  res.on('finish', () => {
    const latency = Date.now() - startTime;

    // Log lento en desarrollo
    if (process.env.NODE_ENV !== 'production' && latency > 1000) {
      console.warn(`Respuesta lenta detectada: ${req.method} ${req.path} - ${latency}ms`);
    }

    // Agregar header con latencia
    res.setHeader('X-Response-Time', `${latency}ms`);
  });

  next();
}

/**
 * Middleware para rastrear errores por ruta
 */
function errorTrackingMiddleware() {
  const errorStats = {};

  return (err, req, res, next) => {
    const route = req.route?.path || req.path;
    const method = req.method;
    const key = `${method} ${route}`;

    if (!errorStats[key]) {
      errorStats[key] = {
        count: 0,
        lastError: null,
        timestamp: new Date().toISOString()
      };
    }

    errorStats[key].count++;
    errorStats[key].lastError = err.message;
    errorStats[key].lastErrorTime = new Date().toISOString();

    next(err);
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  createHealthCheckRoutes,
  checkServerHealth,
  checkDatabaseHealth,
  checkRedisHealth,
  HealthCheckAggregator,
  responseTimeMiddleware,
  errorTrackingMiddleware
};
