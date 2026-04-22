# Performance Optimization Guide

## Visión General

Este documento describe las estrategias de optimización implementadas en el backend de Maya Autopartes para lograr ultra-fast API responses.

## 1. Arquitectura de Optimización

```
Request HTTP
    ↓
[Compresión Middleware] ← Gzip + Brotli
    ↓
[Cache Middleware] ← Redis (TTL configurable)
    ↓
[Route Handler]
    ↓
[Query Optimizer] ← Índices, select optimizado, batch operations
    ↓
[Supabase]
    ↓
[Response Optimization] ← Minificación, CDN headers
    ↓
[Client]
```

## 2. Módulos de Optimización

### 2.1 Redis Cache (`backend/cache/redis.js`)

**Características:**
- Cache con TTL configurable por tipo de dato
- Compresión LZ-string para datos > 1KB
- Invalidación inteligente de cache por patrón
- Estadísticas de hit/miss rate

**TTLs por defecto:**
```javascript
almacen: 300s        // Productos - 5 min
almacenStats: 600s   // Estadísticas - 10 min
clientes: 600s       // Clientes - 10 min
usuarios: 1800s      // Usuarios - 30 min
busquedas: 3600s     // Búsquedas - 1 hora
ventasResumen: 300s  // Ventas - 5 min
facturasResumen: 600s // Facturas - 10 min
```

**Uso en rutas:**

```javascript
const { getCache } = require('../cache/redis');
const cache = getCache();

// Cachear un valor
await cache.set('almacen:lista', data, 300);

// Obtener del cache
const cached = await cache.get('almacen:lista');

// Wrapper getOrSet
const data = await cache.getOrSet('almacen:lista', async () => {
  // Función que se ejecuta si no está en cache
  const { data } = await supabase.from('almacen').select();
  return data;
});

// Invalidar cache
await cache.invalidateByPattern('almacen:*');
await cache.invalidateByPattern('busquedas:*');

// Batch operations
await cache.setMultiple({
  'almacen:lista': almacenData,
  'clientes:lista': clientesData
}, 600);

const results = await cache.getMultiple(['almacen:lista', 'clientes:lista']);
```

**Estadísticas:**
```
GET /api/monitoring/cache-stats
{
  "hits": 1523,
  "misses": 247,
  "writes": 1770,
  "deletes": 234,
  "errors": 0,
  "total": 1770,
  "hitRate": "86.04%",
  "isConnected": true
}
```

### 2.2 Query Optimizer (`backend/optimization/query-optimizer.js`)

**Características:**
- Paginación automática (50 items/página)
- Select solo campos necesarios
- Batch operations para inserts, updates, deletes
- Búsqueda optimizada en múltiples campos
- Lazy loading para relaciones
- Análisis de slow queries

**Uso:**

```javascript
const QueryOptimizer = require('../optimization/query-optimizer');
const optimizer = new QueryOptimizer(supabase);

// 1. Paginación optimizada
const { data, pagination, duration } = await optimizer.getPaginated('almacen', 1, 50);
// Duration: ~50ms para 50 items

// 2. Select optimizado (solo campos necesarios)
const { data } = await optimizer.getOptimized('almacen', 
  'id,nombre,precio,stock',
  { stock: { operator: 'gt', value: 0 } },
  { page: 1, size: 50 }
);

// 3. Batch queries (paralelo)
const { results, totalDuration } = await optimizer.batchQuery([
  { table: 'almacen', columns: 'id,nombre,precio' },
  { table: 'clientes', columns: 'id,nombre,email' },
  { table: 'usuarios', columns: 'id,nombre,rol' }
]);
// totalDuration: ~200ms en lugar de 600ms en serie

// 4. Búsqueda optimizada
const { data, count, duration } = await optimizer.search(
  'almacen',
  'filtro',
  ['nombre', 'descripcion', 'codigo'],
  { page: 1, size: 50 }
);
// Búsqueda en 3 campos en <100ms

// 5. Batch insert (100 items por batch)
const { recordsInserted, totalDuration } = await optimizer.batchInsert(
  'almacen',
  productos,
  100
);

// 6. Batch update
const { recordsUpdated } = await optimizer.batchUpdate(
  'almacen',
  [
    { id: '1', data: { stock: 100 } },
    { id: '2', data: { stock: 50 } }
  ]
);

// 7. Batch delete
const { recordsDeleted } = await optimizer.batchDelete('almacen', ids);

// 8. Lazy loading relaciones
const { data } = await optimizer.withRelations('almacen', productId, {
  detalles: {
    table: 'almacen_detalles',
    foreignKey: 'almacen_id',
    select: '*'
  },
  ventas: {
    table: 'ventas',
    foreignKey: 'producto_id',
    select: 'id,fecha,cantidad'
  }
});
```

**Índices recomendados en Supabase:**

```sql
-- Tabla almacen
CREATE INDEX idx_almacen_usuario_id ON almacen(usuario_id);
CREATE INDEX idx_almacen_estado ON almacen(estado);
CREATE INDEX idx_almacen_nombre ON almacen(nombre);

-- Tabla clientes
CREATE INDEX idx_clientes_usuario_id ON clientes(usuario_id);
CREATE INDEX idx_clientes_email ON clientes(email);
CREATE INDEX idx_clientes_nombre ON clientes(nombre);

-- Tabla usuarios
CREATE INDEX idx_usuarios_email ON usuarios(email);
CREATE INDEX idx_usuarios_rol ON usuarios(rol);

-- Tabla ventas
CREATE INDEX idx_ventas_usuario_id ON ventas(usuario_id);
CREATE INDEX idx_ventas_cliente_id ON ventas(cliente_id);
CREATE INDEX idx_ventas_fecha ON ventas(fecha);

-- Tabla facturas
CREATE INDEX idx_facturas_usuario_id ON facturas(usuario_id);
CREATE INDEX idx_facturas_venta_id ON facturas(venta_id);
CREATE INDEX idx_facturas_fecha ON facturas(fecha);
```

**Análisis de queries:**
```
GET /api/monitoring/query-analysis
{
  "totalQueries": 1523,
  "averageDuration": "45.23ms",
  "slowQueries": {
    "count": 23,
    "percentage": "1.51%",
    "examples": [...]
  },
  "tableStats": {
    "almacen": { "count": 450, "avgDuration": "32.5ms", "slowQueries": 2 },
    "clientes": { "count": 320, "avgDuration": "28.3ms", "slowQueries": 1 }
  }
}
```

### 2.3 Compression Manager (`backend/optimization/compression.js`)

**Características:**
- Gzip compression automática (threshold: 1KB)
- Minificación de JSON responses
- CDN headers para assets estáticos
- Cache-Control configurado por tipo de request
- Monitoreo de ratio de compresión

**Configuración:**

```javascript
const CompressionManager = require('../optimization/compression');
const manager = new CompressionManager({
  level: 6,        // Nivel de compresión (0-11)
  minSize: 1024,   // Mínimo para comprimir
  cdnTTL: 2592000  // 30 días
});

// Applicar middleware
app.use(...manager.getFullOptimizationMiddleware());
```

**Headers de respuesta:**

```
Almacén (primeros 5 min):
GET /api/v1/almacen
Content-Encoding: gzip
Cache-Control: public, max-age=300, must-revalidate
X-Cache: HIT (si viene de Redis)
X-Response-Time: 12ms

Assets estáticos (CSS, JS, imágenes):
Cache-Control: public, max-age=2592000, immutable
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN
```

**Optimización de payload:**

```javascript
const optimized = manager.optimizePayload(data, {
  removeNulls: true,
  removeEmpty: true,
  maxDepth: 10
});
// Elimina nulls y strings vacíos, reduce tamaño de payload
```

**Estadísticas:**
```
GET /api/monitoring/compression-stats
{
  "responsesCompressed": 1234,
  "responsesUncompressed": 23,
  "bytesOriginal": 2456789,
  "bytesCompressed": 456234,
  "compressionRate": "98.15%",
  "totalBytesSaved": 2000555,
  "averageCompressionRatio": "81.44%"
}
```

## 3. Implementación en Rutas

### Ejemplo: Endpoint `/api/v1/almacen` optimizado

```javascript
const router = require('express').Router();
const { getCache } = require('../cache/redis');
const QueryOptimizer = require('../optimization/query-optimizer');

// GET /api/v1/almacen - Lista paginada con cache
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 50;

  try {
    // Generar clave de cache
    const cacheKey = `almacen:lista:${page}:${pageSize}`;

    // Intentar obtener del cache
    const cached = await req.cache.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json({ success: true, data: cached });
    }

    // Si no está en cache, obtener del DB con optimizer
    const optimizer = new QueryOptimizer(req.supabase);
    const { data, pagination, duration } = await optimizer.getPaginated(
      'almacen',
      page,
      pageSize
    );

    // Cachear resultado
    await req.cache.set(cacheKey, { data, pagination }, 300);

    res.set('X-Cache', 'MISS');
    res.json({
      success: true,
      data,
      pagination,
      duration
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/v1/almacen - Crear y invalidar cache
router.post('/', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('almacen')
      .insert([req.body])
      .select();

    if (error) throw error;

    // Invalidar cache de lista
    await req.cache.invalidateByPattern('almacen:*');
    await req.cache.invalidateByPattern('busquedas:almacen:*');

    res.json({ success: true, data: data[0] });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});
```

## 4. Monitoreo y Dashboards

### Endpoints de monitoreo:

```bash
# Cache statistics
curl http://localhost:5000/api/monitoring/cache-stats

# Query analysis
curl http://localhost:5000/api/monitoring/query-analysis

# Compression statistics
curl http://localhost:5000/api/monitoring/compression-stats

# Dashboard integrado
curl http://localhost:5000/api/monitoring/performance

# Flush cache
curl -X POST http://localhost:5000/api/monitoring/cache-flush \
  -H "Authorization: Bearer YOUR_TOKEN"

# Reset métricas
curl -X POST http://localhost:5000/api/monitoring/reset-metrics
```

## 5. Best Practices

### 1. Configurar TTLs apropiados

```javascript
// Datos que cambian frecuentemente: TTL corto
almacen: 300s        // Inventario - 5 min
ventasResumen: 300s  // Ventas - 5 min

// Datos semi-estáticos: TTL medio
clientes: 600s       // 10 min
facturas: 600s       // 10 min

// Datos estáticos: TTL largo
usuarios: 1800s      // 30 min
busquedas: 3600s     // 1 hora
```

### 2. Invalidar cache al actualizar datos

```javascript
// Al crear/actualizar/eliminar
await cache.invalidateByPattern('almacen:*');

// Al cambiar usuarios
await cache.invalidateByPattern('usuarios:*');

// Búsquedas generales
await cache.invalidateByPattern('busquedas:*');
```

### 3. Usar batch operations para múltiples registros

```javascript
// ❌ LENTO: 100 queries secuenciales
for (const item of items) {
  await supabase.from('almacen').insert(item);
}

// ✅ RÁPIDO: 1 batch query
await queryOptimizer.batchInsert('almacen', items, 100);
// Tiempo: 200ms en lugar de 5000ms
```

### 4. Select solo campos necesarios

```javascript
// ❌ Traer todo
const { data } = await supabase.from('almacen').select();

// ✅ Solo lo necesario
const { data } = await queryOptimizer.getOptimized(
  'almacen',
  'id,nombre,precio,stock'
);
// Tamaño: 30KB en lugar de 200KB
```

### 5. Usar batch queries para datos relacionados

```javascript
// ❌ 3 requests secuenciales = 300ms
const almacen = await getAlmacen();
const clientes = await getClientes();
const usuarios = await getUsuarios();

// ✅ 1 batch query = 100ms
const { results } = await queryOptimizer.batchQuery([
  { table: 'almacen', columns: 'id,nombre,precio' },
  { table: 'clientes', columns: 'id,nombre' },
  { table: 'usuarios', columns: 'id,nombre,rol' }
]);
```

## 6. Métricas de Éxito

### Performance esperado:

| Operación | Antes | Después | Mejora |
|-----------|-------|---------|--------|
| GET /almacen (sin cache) | 450ms | 50ms | 9x faster |
| GET /almacen (con cache) | 450ms | 12ms | 37x faster |
| Search (1000 resultados) | 2500ms | 8ms | 312x faster |
| Batch insert (1000 items) | 25000ms | 500ms | 50x faster |
| Response size (con gzip) | 500KB | 45KB | 11x smaller |
| Cache hit rate | N/A | 85%+ | High efficiency |

### Monitoreo continuo:

```
Dashboard: /api/monitoring/performance
{
  "cache": {
    "hitRate": "86%",
    "isConnected": true
  },
  "queries": {
    "totalQueries": 1523,
    "averageDuration": "45ms",
    "slowQueries": { "percentage": "1.5%" }
  },
  "compression": {
    "compressionRate": "98%",
    "averageRatio": "81%"
  },
  "memory": { "heapUsed": "45MB", "heapTotal": "100MB" }
}
```

## 7. Troubleshooting

### Redis no conecta
```bash
# Verificar si Redis está running
redis-cli ping

# Revisar logs
tail -f redis.log

# Reconectar
curl -X POST http://localhost:5000/api/monitoring/cache-flush
```

### Slow queries
```bash
# Ver análisis
curl http://localhost:5000/api/monitoring/query-analysis

# Agregar índices en Supabase
CREATE INDEX idx_table_column ON table(column);

# Reset métricas
curl -X POST http://localhost:5000/api/monitoring/reset-metrics
```

### Alta compresión pero slow requests
```javascript
// Reducir nivel de compresión (menos CPU)
const manager = new CompressionManager({ level: 3 });

// O aumentar threshold
const manager = new CompressionManager({ minSize: 5120 }); // 5KB
```

## 8. Próximos pasos

- [ ] Implementar WebSocket subscriptions (real-time updates sin polling)
- [ ] GraphQL para queries más eficientes
- [ ] CDN integrado (Cloudflare, Fastly)
- [ ] Service Workers en frontend
- [ ] Database connection pooling
- [ ] Sharding para tablas grandes
