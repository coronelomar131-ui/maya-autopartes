/**
 * Cache & Optimization Integration Middleware
 * Integra Redis cache, query optimization y compresión al servidor Express
 */

const { getCache } = require('../cache/redis');
const QueryOptimizer = require('../optimization/query-optimizer');
const CompressionManager = require('../optimization/compression');

/**
 * Inicializar sistemas de optimización
 */
async function initializeOptimization(app, supabase) {
  // Inicializar Redis cache
  const cache = getCache({
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    password: process.env.REDIS_PASSWORD || null,
    compression: true
  });

  // Conectar a Redis (no bloqueante, fallar silenciosamente si no está disponible)
  const cacheConnected = await cache.connect().catch(() => false);

  if (cacheConnected) {
    console.log('Cache system initialized successfully');
  } else {
    console.log('Cache system unavailable, running without Redis (performance degraded)');
  }

  // Inicializar Query Optimizer
  const queryOptimizer = new QueryOptimizer(supabase);

  // Inicializar Compression Manager
  const compressionManager = new CompressionManager({
    level: process.env.COMPRESSION_LEVEL || 6,
    minSize: 1024,
    cdnTTL: 86400 * 30 // 30 días
  });

  // Agregar a req para acceso global
  app.use((req, res, next) => {
    req.cache = cache;
    req.queryOptimizer = queryOptimizer;
    req.compressionManager = compressionManager;
    next();
  });

  // Aplicar compresión
  const compressionMiddlewares = compressionManager.getFullOptimizationMiddleware();
  compressionMiddlewares.forEach(middleware => app.use(middleware));

  // Middleware de monitoreo de performance
  app.use(performanceMonitoringMiddleware);

  // Endpoints de monitoreo
  setupMonitoringEndpoints(app, cache, queryOptimizer, compressionManager);

  return { cache, queryOptimizer, compressionManager };
}

/**
 * Middleware de monitoreo de performance
 */
function performanceMonitoringMiddleware(req, res, next) {
  const startTime = Date.now();

  // Interceptar el método send para medir duración total
  const originalSend = res.send;

  res.send = function(data) {
    const duration = Date.now() - startTime;

    // Agregar header con duración de request
    res.set('X-Response-Time', `${duration}ms`);

    // Log de requests lentos
    if (duration > 1000) {
      console.warn(`SLOW REQUEST: ${req.method} ${req.originalUrl} took ${duration}ms`);
    }

    return originalSend.call(this, data);
  };

  next();
}

/**
 * Setup endpoints de monitoreo
 */
function setupMonitoringEndpoints(app, cache, queryOptimizer, compressionManager) {
  /**
   * GET /api/monitoring/cache-stats
   * Estadísticas del cache Redis
   */
  app.get('/api/monitoring/cache-stats', (req, res) => {
    try {
      const stats = cache.getStats();
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/monitoring/query-analysis
   * Análisis de queries ejecutadas
   */
  app.get('/api/monitoring/query-analysis', (req, res) => {
    try {
      const analysis = queryOptimizer.getQueryAnalysis();
      res.json({
        success: true,
        data: analysis,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/monitoring/compression-stats
   * Estadísticas de compresión
   */
  app.get('/api/monitoring/compression-stats', (req, res) => {
    try {
      const stats = compressionManager.getStatistics();
      res.json({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * GET /api/monitoring/performance
   * Dashboard integrado de performance
   */
  app.get('/api/monitoring/performance', (req, res) => {
    try {
      const cacheStats = cache.getStats();
      const queryAnalysis = queryOptimizer.getQueryAnalysis();
      const compressionStats = compressionManager.getStatistics();

      res.json({
        success: true,
        data: {
          cache: cacheStats,
          queries: queryAnalysis,
          compression: compressionStats,
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/monitoring/cache-flush
   * Limpiar cache (admin only)
   */
  app.post('/api/monitoring/cache-flush', async (req, res) => {
    try {
      // Verificar token de admin (implementar según tu sistema de auth)
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.includes('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized'
        });
      }

      const flushed = await cache.flush();

      if (flushed) {
        res.json({
          success: true,
          message: 'Cache flushed successfully',
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to flush cache'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  /**
   * POST /api/monitoring/reset-metrics
   * Resetear métricas de monitoreo
   */
  app.post('/api/monitoring/reset-metrics', (req, res) => {
    try {
      cache.resetStats();
      queryOptimizer.resetMetrics();
      compressionManager.resetStatistics();

      res.json({
        success: true,
        message: 'All metrics reset successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
}

/**
 * Middleware para cachear responses automáticamente
 */
function cacheMiddleware(cache, ttl = null) {
  return async (req, res, next) => {
    // Solo cachear GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generar clave de cache
    const cacheKey = `http:${req.originalUrl}`;

    try {
      // Intentar obtener del cache
      const cached = await cache.get(cacheKey);

      if (cached) {
        res.set('X-Cache', 'HIT');
        return res.json(cached);
      }

      // Si no está en cache, interceptar response
      const originalJson = res.json;

      res.json = function(data) {
        // Cachear el response
        cache.set(cacheKey, data, ttl).catch(err => {
          console.error('Cache set error:', err);
        });

        res.set('X-Cache', 'MISS');
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      console.error('Cache middleware error:', error);
      next();
    }
  };
}

module.exports = {
  initializeOptimization,
  performanceMonitoringMiddleware,
  cacheMiddleware,
  setupMonitoringEndpoints
};
