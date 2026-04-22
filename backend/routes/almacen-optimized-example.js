/**
 * EXAMPLE: Optimized Almacén Routes
 *
 * Este archivo muestra cómo implementar todas las optimizaciones:
 * - Redis cache con invalidación inteligente
 * - Query optimizer con paginación y batch operations
 * - Compression automática
 * - Performance monitoring
 *
 * Copiar esta estructura a las otras rutas (clientes, usuarios, ventas, facturas)
 */

const router = require('express').Router();

/**
 * GET /api/v1/almacen
 * Lista paginada de productos con cache
 *
 * Query params:
 * - page: número de página (default: 1)
 * - pageSize: items por página (default: 50)
 * - search: término de búsqueda (optional)
 * - estado: filtrar por estado (optional)
 */
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 50;
  const search = req.query.search;
  const estado = req.query.estado;

  try {
    // Generar clave de cache única basada en parámetros
    const cacheKey = `almacen:lista:${page}:${pageSize}:${search || 'all'}:${estado || 'all'}`;

    // Intentar obtener del Redis cache
    const cached = await req.cache.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json({
        success: true,
        data: cached.data,
        pagination: cached.pagination,
        cache: 'HIT',
        duration: 0
      });
    }

    // Si no está en cache, usar QueryOptimizer
    let query = {
      table: 'almacen',
      columns: 'id,nombre,codigo,precio,stock,estado,descripcion,createdAt',
      filters: {},
      pagination: { page, size: pageSize }
    };

    // Aplicar filtros
    if (search) {
      query.filters.nombre = { operator: 'ilike', value: `%${search}%` };
    }
    if (estado) {
      query.filters.estado = estado;
    }

    const startTime = Date.now();

    // Obtener datos optimizados
    const result = await req.queryOptimizer.getOptimized(
      query.table,
      query.columns,
      query.filters,
      query.pagination
    );

    const duration = Date.now() - startTime;

    // Estructura de respuesta
    const response = {
      data: result.data,
      pagination: result.pagination || {
        page,
        pageSize,
        total: result.data.length
      }
    };

    // Cachear resultado (5 minutos para almacén)
    await req.cache.set(cacheKey, response, 300);

    res.set('X-Cache', 'MISS');
    res.json({
      success: true,
      ...response,
      cache: 'MISS',
      duration
    });
  } catch (error) {
    console.error('Error fetching almacen:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/almacen/search
 * Búsqueda optimizada en múltiples campos
 * Cacheada agresivamente (1 hora) para búsquedas frecuentes
 *
 * Query params:
 * - q: término de búsqueda (required)
 * - page: número de página (default: 1)
 * - limit: máximo resultados (default: 1000)
 */
router.get('/search', async (req, res) => {
  const searchTerm = req.query.q;
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 1000;

  if (!searchTerm || searchTerm.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Search term required (q parameter)'
    });
  }

  try {
    // Cache key para búsquedas
    const cacheKey = `busquedas:almacen:${searchTerm.toLowerCase()}:${page}:${limit}`;

    // Intentar obtener del cache
    const cached = await req.cache.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json({
        success: true,
        data: cached,
        cache: 'HIT',
        count: cached.length
      });
    }

    const startTime = Date.now();

    // Búsqueda optimizada en múltiples campos
    const result = await req.queryOptimizer.search(
      'almacen',
      searchTerm,
      ['nombre', 'codigo', 'descripcion'], // Campos a buscar
      { page, size: limit }
    );

    const duration = Date.now() - startTime;

    // Cachear búsqueda (1 hora - búsquedas son más estables)
    await req.cache.set(cacheKey, result.data, 3600);

    res.set('X-Cache', 'MISS');
    res.json({
      success: true,
      data: result.data,
      count: result.count,
      cache: 'MISS',
      duration,
      searchTerm
    });
  } catch (error) {
    console.error('Error searching almacen:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/almacen/:id
 * Obtener producto específico con relaciones
 * Cacheado por 10 minutos
 */
router.get('/:id', async (req, res) => {
  const id = req.params.id;

  try {
    // Cache por producto específico
    const cacheKey = `almacen:byId:${id}`;

    const cached = await req.cache.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json({
        success: true,
        data: cached,
        cache: 'HIT'
      });
    }

    const startTime = Date.now();

    // Obtener con relaciones (lazy loading)
    const result = await req.queryOptimizer.withRelations(
      'almacen',
      id,
      {
        // Relaciones a cargar
        detalles: {
          table: 'almacen_detalles',
          foreignKey: 'almacen_id',
          select: 'id,cantidad,precio'
        },
        ultimasVentas: {
          table: 'ventas',
          foreignKey: 'producto_id',
          select: 'id,fecha,cantidad'
        }
      }
    );

    const duration = Date.now() - startTime;

    // Cachear producto (10 minutos)
    await req.cache.set(cacheKey, result.data, 600);

    res.set('X-Cache', 'MISS');
    res.json({
      success: true,
      data: result.data,
      cache: 'MISS',
      duration
    });
  } catch (error) {
    console.error('Error fetching almacen by id:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/almacen
 * Crear nuevo producto e invalidar caches relacionados
 */
router.post('/', async (req, res) => {
  try {
    const startTime = Date.now();

    // Insertar en DB
    const { data, error } = await req.supabase
      .from('almacen')
      .insert([req.body])
      .select();

    if (error) throw error;

    const duration = Date.now() - startTime;

    // Invalidar caches relacionados
    await Promise.all([
      req.cache.invalidateByPattern('almacen:lista:*'),    // Listas paginadas
      req.cache.invalidateByPattern('almacen:stats:*'),    // Estadísticas
      req.cache.invalidateByPattern('busquedas:almacen:*') // Búsquedas previas
    ]);

    res.status(201).json({
      success: true,
      data: data[0],
      duration,
      invalidated: [
        'almacen:lista:*',
        'almacen:stats:*',
        'busquedas:almacen:*'
      ]
    });
  } catch (error) {
    console.error('Error creating almacen:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/v1/almacen/batch
 * Insertar múltiples productos eficientemente
 * Usa batch operations del QueryOptimizer
 */
router.post('/batch', async (req, res) => {
  const { products } = req.body;

  if (!Array.isArray(products) || products.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'products array required'
    });
  }

  try {
    const startTime = Date.now();

    // Insertar en batches de 100
    const result = await req.queryOptimizer.batchInsert(
      'almacen',
      products,
      100
    );

    const duration = Date.now() - startTime;

    // Invalidar caches
    await Promise.all([
      req.cache.invalidateByPattern('almacen:*'),
      req.cache.invalidateByPattern('busquedas:*')
    ]);

    res.status(201).json({
      success: true,
      recordsInserted: result.recordsInserted,
      totalDuration: result.totalDuration,
      averageTimePerRecord: result.averageTimePerRecord,
      invalidated: ['almacen:*', 'busquedas:*']
    });
  } catch (error) {
    console.error('Error batch inserting almacen:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PUT /api/v1/almacen/:id
 * Actualizar producto e invalidar caches
 */
router.put('/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const startTime = Date.now();

    // Actualizar en DB
    const { data, error } = await req.supabase
      .from('almacen')
      .update(req.body)
      .eq('id', id)
      .select();

    if (error) throw error;

    const duration = Date.now() - startTime;

    // Invalidar caches relacionados
    await Promise.all([
      req.cache.delete(`almacen:byId:${id}`),          // Cache específico
      req.cache.invalidateByPattern('almacen:lista:*'), // Listas
      req.cache.invalidateByPattern('almacen:stats:*'), // Stats
      req.cache.invalidateByPattern('busquedas:*')      // Búsquedas
    ]);

    res.json({
      success: true,
      data: data[0],
      duration,
      invalidated: [
        `almacen:byId:${id}`,
        'almacen:lista:*',
        'almacen:stats:*',
        'busquedas:*'
      ]
    });
  } catch (error) {
    console.error('Error updating almacen:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * DELETE /api/v1/almacen/:id
 * Eliminar producto e invalidar caches
 */
router.delete('/:id', async (req, res) => {
  const id = req.params.id;

  try {
    const startTime = Date.now();

    // Eliminar de DB
    const { error } = await req.supabase
      .from('almacen')
      .delete()
      .eq('id', id);

    if (error) throw error;

    const duration = Date.now() - startTime;

    // Invalidar caches - agresivamente
    await Promise.all([
      req.cache.delete(`almacen:byId:${id}`),           // Cache específico
      req.cache.invalidateByPattern('almacen:*'),       // TODO en almacen
      req.cache.invalidateByPattern('busquedas:*'),     // Todas búsquedas
      req.cache.invalidateByPattern('ventas:*')         // Ventas relacionadas
    ]);

    res.json({
      success: true,
      message: 'Almacen deleted successfully',
      duration,
      invalidated: [
        'almacen:*',
        'busquedas:*',
        'ventas:*'
      ]
    });
  } catch (error) {
    console.error('Error deleting almacen:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/v1/almacen/stats/inventory
 * Estadísticas de inventario (cacheado 10 minutos)
 */
router.get('/stats/inventory', async (req, res) => {
  try {
    const cacheKey = 'almacen:stats:inventory';

    const cached = await req.cache.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json({
        success: true,
        data: cached,
        cache: 'HIT'
      });
    }

    const startTime = Date.now();

    // Calcular estadísticas
    const { data: almacen, error } = await req.supabase
      .from('almacen')
      .select('id,nombre,stock,precio,estado');

    if (error) throw error;

    const stats = {
      totalProducts: almacen.length,
      totalValue: almacen.reduce((sum, p) => sum + (p.precio * p.stock), 0),
      lowStock: almacen.filter(p => p.stock < 10).length,
      outOfStock: almacen.filter(p => p.stock === 0).length,
      avgStock: (almacen.reduce((sum, p) => sum + p.stock, 0) / almacen.length).toFixed(2),
      byStatus: {
        active: almacen.filter(p => p.estado === 'activo').length,
        inactive: almacen.filter(p => p.estado === 'inactivo').length,
        discontinued: almacen.filter(p => p.estado === 'descontinuado').length
      },
      generatedAt: new Date().toISOString()
    };

    const duration = Date.now() - startTime;

    // Cachear estadísticas (10 minutos)
    await req.cache.set(cacheKey, stats, 600);

    res.set('X-Cache', 'MISS');
    res.json({
      success: true,
      data: stats,
      cache: 'MISS',
      duration
    });
  } catch (error) {
    console.error('Error getting inventory stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

/**
 * IMPLEMENTACIÓN EN server.js
 *
 * const almacenRoutes = require('./routes/almacen-optimized-example');
 * app.use('/api/v1/almacen', almacenRoutes);
 *
 * Después integrar al server.js existente
 */

/**
 * TESTING ENDPOINTS
 *
 * # Lista con paginación
 * curl 'http://localhost:5000/api/v1/almacen?page=1&pageSize=50'
 *
 * # Búsqueda
 * curl 'http://localhost:5000/api/v1/almacen/search?q=filtro'
 *
 * # Producto específico
 * curl 'http://localhost:5000/api/v1/almacen/abc123'
 *
 * # Crear
 * curl -X POST 'http://localhost:5000/api/v1/almacen' \
 *   -H 'Content-Type: application/json' \
 *   -d '{"nombre":"Producto","precio":100,"stock":50}'
 *
 * # Batch insert
 * curl -X POST 'http://localhost:5000/api/v1/almacen/batch' \
 *   -H 'Content-Type: application/json' \
 *   -d '{
 *     "products": [
 *       {"nombre":"P1","precio":100,"stock":50},
 *       {"nombre":"P2","precio":200,"stock":100}
 *     ]
 *   }'
 *
 * # Actualizar
 * curl -X PUT 'http://localhost:5000/api/v1/almacen/abc123' \
 *   -H 'Content-Type: application/json' \
 *   -d '{"stock":75}'
 *
 * # Eliminar
 * curl -X DELETE 'http://localhost:5000/api/v1/almacen/abc123'
 *
 * # Estadísticas
 * curl 'http://localhost:5000/api/v1/almacen/stats/inventory'
 *
 * # Monitoreo
 * curl 'http://localhost:5000/api/monitoring/cache-stats'
 * curl 'http://localhost:5000/api/monitoring/performance'
 */
