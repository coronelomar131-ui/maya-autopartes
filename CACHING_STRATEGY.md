# Caching Strategy Guide

## Overview

Estrategia de caching multi-capas para maximizar hit rate y minimizar latencia en Maya Autopartes API.

---

## 1. Arquitectura de Caching

```
┌─────────────────────────────────────────────────┐
│           CLIENT REQUEST                        │
└────────────────────┬────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │   Browser Cache        │
        │   (Service Worker)     │
        │   TTL: 24h             │
        └────────┬───────────────┘
                 │ MISS
                 ▼
        ┌────────────────────────┐
        │   CDN Cache            │
        │   (CloudFlare, etc)    │
        │   TTL: 30 days         │
        └────────┬───────────────┘
                 │ MISS
                 ▼
        ┌────────────────────────┐
        │   Redis Cache          │
        │   (API Server)         │
        │   TTL: 5min-1h         │
        └────────┬───────────────┘
                 │ MISS
                 ▼
        ┌────────────────────────┐
        │   Database             │
        │   (Supabase)           │
        │   No TTL               │
        └────────────────────────┘
```

---

## 2. Cache Layers

### Layer 1: Browser / Service Worker
**TTL:** 24 horas
**Type:** Local Storage + Service Worker
**Control:** Client-side

```javascript
// Service Worker - Cache API requests
self.addEventListener('fetch', (event) => {
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
        .then(response => {
          // Clone y cache
          caches.open('maya-api-v1').then(cache => {
            cache.put(event.request, response.clone());
          });
          return response;
        })
    );
  }
});

// HTML5 Cache Storage
localStorage.setItem('almacen:lista:1', JSON.stringify(data), {
  ttl: 86400 // 24 hours
});
```

### Layer 2: CDN Cache
**TTL:** 30 días (assets) / 5 min (data)
**Type:** HTTP Cache-Control headers
**Control:** Server-side headers

```javascript
// Assets estáticos (CSS, JS, imágenes)
Cache-Control: public, max-age=2592000, immutable
               (30 días, no cambia)

// API responses
Cache-Control: public, max-age=300, must-revalidate
               (5 min, revalidar)

// Requests POST/PUT/DELETE
Cache-Control: no-store, no-cache, must-revalidate
               (sin cache)
```

### Layer 3: Redis Cache (API Server)
**TTL:** 5 min - 1 hora (configurable por tipo)
**Type:** In-memory key-value store
**Control:** Backend code

```javascript
const cache = getCache();

// Cachear respuesta
await cache.set('almacen:lista:1', data, 300); // 5 min

// Obtener del cache
const cached = await cache.get('almacen:lista:1');

// Batch cache
await cache.setMultiple({
  'almacen:lista:1': almacenData,
  'clientes:lista:1': clientesData
}, 600);
```

### Layer 4: Database
**TTL:** None (source of truth)
**Type:** Supabase PostgreSQL
**Control:** ACID transactions

---

## 3. Cache Key Naming Convention

### Estructura
```
{entity}:{scope}:{identifier}:{modifier}
```

### Ejemplos

```javascript
// Almacén
almacen:lista:1                      // Página 1 de productos
almacen:lista:2                      // Página 2
almacen:stats:usuario:123            // Stats para usuario 123
almacen:byId:456                     // Producto específico
busquedas:almacen:filtro:50          // Búsqueda cacheada

// Clientes
clientes:lista:1                     // Página 1 de clientes
clientes:stats:usuario:123           // Stats para usuario 123
clientes:byId:789                    // Cliente específico
busquedas:clientes:juan:50           // Búsqueda cacheada

// Usuarios
usuarios:lista:1                     // Página 1
usuarios:byId:123                    // Usuario específico
usuarios:byEmail:juan@email.com      // Por email

// Ventas
ventas:usuario:123:mes:04            // Ventas usuario en abril
ventas:resumen:usuario:123           // Resumen mensual

// Facturas
facturas:usuario:123:mes:04          // Facturas del usuario
facturas:venta:456                   // Facturas de venta
```

---

## 4. TTL Configuration

### Default TTLs

```javascript
// backend/cache/redis.js

const defaultTTLs = {
  // Datos que cambian frecuentemente (5 min)
  almacen: 300,
  ventasResumen: 300,
  
  // Datos semi-dinámicos (10 min)
  almacenStats: 600,
  clientes: 600,
  facturasResumen: 600,
  
  // Datos semi-estáticos (30 min)
  usuarios: 1800,
  
  // Búsquedas (1 hora - cacheadas agresivamente)
  busquedas: 3600,
  
  // Default
  default: 600
};
```

### Personalización por endpoint

```javascript
// Corto TTL para datos críticos
app.get('/api/v1/almacen', cacheMiddleware(cache, 60)); // 1 min

// Largo TTL para datos estáticos
app.get('/api/v1/usuarios', cacheMiddleware(cache, 3600)); // 1 hora

// Sin cache para datos sensibles
app.get('/api/v1/usuarios/:id', (req, res) => {
  // No cachear: auth requiere datos frescos
});
```

---

## 5. Cache Invalidation Strategies

### Strategy 1: Time-based (TTL)
**Trigger:** Tiempo automático
**Ventaja:** Simple, predecible
**Desventaja:** Stale data durante TTL

```javascript
// Cache se expira automáticamente después de 300s
await cache.set('almacen:lista:1', data, 300);
```

### Strategy 2: Pattern-based (Active Invalidation)
**Trigger:** Evento de actualización
**Ventaja:** Datos frescos inmediatos
**Desventaja:** Complejo de implementar

```javascript
// Al crear/actualizar almacén
app.post('/api/v1/almacen', async (req, res) => {
  const { data } = await supabase.from('almacen').insert(req.body).select();
  
  // Invalidar todo lo relacionado
  await cache.invalidateByPattern('almacen:*');        // Lista, stats
  await cache.invalidateByPattern('busquedas:*');      // Búsquedas
  await cache.invalidateByPattern('ventas:resumen:*'); // Resumen ventas
  
  res.json({ success: true, data });
});
```

### Strategy 3: Event-based (Pub/Sub)
**Trigger:** Webhook o evento
**Ventaja:** Flexible, escalable
**Desventaja:** Requiere infraestructura adicional

```javascript
// Supabase Real-time Subscriptions
supabase
  .from('almacen')
  .on('*', payload => {
    // Invalidar cache cuando hay cambios
    cache.invalidateByPattern('almacen:*');
  })
  .subscribe();
```

### Strategy 4: Explicit Invalidation
**Trigger:** API endpoint admin
**Ventaja:** Control total
**Desventaja:** Manual

```javascript
// POST /api/monitoring/cache-flush
app.post('/api/monitoring/cache-flush', async (req, res) => {
  await cache.flush();
  res.json({ success: true });
});
```

---

## 6. Cache Invalidation Patterns

### Patrón 1: Cuando cambiar un registro

```javascript
// Actualizar almacén
router.put('/api/v1/almacen/:id', async (req, res) => {
  const { data } = await supabase
    .from('almacen')
    .update(req.body)
    .eq('id', req.params.id)
    .select();

  // Invalidar listas (alguno de los items cambió)
  await cache.invalidateByPattern('almacen:lista:*');
  await cache.invalidateByPattern('almacen:stats:*');
  
  // Invalidar item específico
  await cache.delete(`almacen:byId:${req.params.id}`);
  
  // Invalidar búsquedas (resultados pueden cambiar)
  await cache.invalidateByPattern('busquedas:almacen:*');

  res.json({ success: true, data: data[0] });
});
```

### Patrón 2: Cuando crear un registro

```javascript
// Crear nuevo almacén
router.post('/api/v1/almacen', async (req, res) => {
  const { data } = await supabase
    .from('almacen')
    .insert([req.body])
    .select();

  // Invalidar listas (nuevo item agregado)
  await cache.invalidateByPattern('almacen:lista:*');
  await cache.invalidateByPattern('almacen:stats:*');
  
  // Invalidar búsquedas (puede aparecer en resultados)
  await cache.invalidateByPattern('busquedas:almacen:*');
  
  // Invalidar resumen si es venta
  if (req.body.type === 'venta') {
    await cache.invalidateByPattern('ventas:resumen:*');
  }

  res.json({ success: true, data: data[0] });
});
```

### Patrón 3: Cuando eliminar un registro

```javascript
// Eliminar almacén
router.delete('/api/v1/almacen/:id', async (req, res) => {
  const { error } = await supabase
    .from('almacen')
    .delete()
    .eq('id', req.params.id);

  if (error) throw error;

  // Invalidar todo lo relacionado
  await cache.invalidateByPattern('almacen:*');
  await cache.invalidateByPattern('busquedas:*');
  await cache.invalidateByPattern('ventas:*');

  res.json({ success: true });
});
```

### Patrón 4: Cascade invalidation

```javascript
// backend/cache/redis.js
const cachePatterns = {
  'almacen:*': [
    'almacen:stats:*',
    'busquedas:almacen:*',
    'ventas:resumen:*'
  ],
  'clientes:*': [
    'clientes:stats:*',
    'busquedas:clientes:*',
    'ventas:resumen:*'
  ],
  'usuarios:*': [
    'usuarios:stats:*'
  ],
  'ventas:*': [
    'almacen:stats:*',
    'busquedas:*',
    'facturas:*'
  ]
};

// Invalidar automáticamente patrones relacionados
await cache.invalidateByPattern('almacen:*');
// ^ Invalida también almacen:stats:*, busquedas:almacen:*, etc.
```

---

## 7. Cache Warming Strategy

### Pre-cachar datos al iniciar

```javascript
// backend/server.js
async function warmupCache() {
  console.log('Warming up cache...');
  
  try {
    // Pre-cachear listas populares
    const { data: almacen } = await supabase
      .from('almacen')
      .select()
      .limit(50);
    
    await cache.set('almacen:lista:1', almacen, 600);
    
    const { data: clientes } = await supabase
      .from('clientes')
      .select()
      .limit(50);
    
    await cache.set('clientes:lista:1', clientes, 600);
    
    console.log('Cache warmed up successfully');
  } catch (error) {
    console.error('Cache warmup error:', error);
  }
}

// Ejecutar al iniciar
app.listen(PORT, async () => {
  await warmupCache();
});
```

### Pre-cachar basado en usuario

```javascript
// Cuando usuario inicia sesión
router.post('/api/v1/usuarios/login', async (req, res) => {
  const { data: user } = await authenticate(req.body);
  
  // Pre-cachear datos del usuario
  const userId = user.id;
  
  const warmupTasks = [
    supabase.from('almacen')
      .select()
      .eq('usuario_id', userId)
      .limit(50)
      .then(({ data }) => cache.set(`almacen:lista:usuario:${userId}`, data, 600)),
    
    supabase.from('clientes')
      .select()
      .eq('usuario_id', userId)
      .limit(50)
      .then(({ data }) => cache.set(`clientes:lista:usuario:${userId}`, data, 600)),
    
    supabase.from('ventas')
      .select()
      .eq('usuario_id', userId)
      .limit(20)
      .then(({ data }) => cache.set(`ventas:usuario:${userId}`, data, 300))
  ];
  
  await Promise.all(warmupTasks);
  
  res.json({ success: true, user, token });
});
```

---

## 8. Cache Monitoring

### Endpoints de monitoreo

```bash
# Ver estadísticas de cache
curl http://localhost:5000/api/monitoring/cache-stats

# Ver análisis de queries
curl http://localhost:5000/api/monitoring/query-analysis

# Dashboard completo
curl http://localhost:5000/api/monitoring/performance

# Flush cache
curl -X POST http://localhost:5000/api/monitoring/cache-flush \
  -H "Authorization: Bearer TOKEN"

# Reset métricas
curl -X POST http://localhost:5000/api/monitoring/reset-metrics
```

### Interpretar estadísticas

```json
{
  "hits": 8230,           // Requests servidos desde cache
  "misses": 1542,         // Requests que fueron a DB
  "total": 9772,          // Total requests
  "hitRate": "84.26%",    // Porcentaje de cache hits
  "writes": 10234,        // Datos escritos en cache
  "deletes": 456,         // Items invalidados
  "errors": 0             // Errores en operaciones cache
}
```

**Interpretar hit rate:**
- **< 50%:** Cache configuration needs improvement
- **50-75%:** Good, but can optimize TTLs
- **75-90%:** Very good, production-ready
- **> 90%:** Excellent, highly efficient

---

## 9. Best Practices

### ✅ DO

1. **Cachear GET requests agresivamente**
   ```javascript
   // TTL adecuado según tipo de dato
   almacen: 300s, clientes: 600s, usuarios: 1800s
   ```

2. **Invalidar proactivamente**
   ```javascript
   // Al cambiar datos, limpiar cache inmediatamente
   await cache.invalidateByPattern('almacen:*');
   ```

3. **Usar batch operations**
   ```javascript
   // Cachear múltiples valores de una vez
   await cache.setMultiple(keysValues, ttl);
   ```

4. **Monitorear cache hit rate**
   ```javascript
   // Revisar /api/monitoring/performance regularmente
   ```

5. **Calentar cache al iniciar**
   ```javascript
   // Pre-cargar datos populares
   await warmupCache();
   ```

### ❌ DON'T

1. **No cachear datos sensibles**
   ```javascript
   // ❌ WRONG
   await cache.set('user:password', hashedPassword);
   
   // ✅ RIGHT
   // No cachear, dejar en DB únicamente
   ```

2. **No usar TTLs infinitos**
   ```javascript
   // ❌ WRONG
   await cache.set('almacen:lista', data); // Sin TTL
   
   // ✅ RIGHT
   await cache.set('almacen:lista', data, 300); // 5 min
   ```

3. **No olvidar invalidar**
   ```javascript
   // ❌ WRONG
   await supabase.from('almacen').update(...);
   // Stale cache!
   
   // ✅ RIGHT
   await supabase.from('almacen').update(...);
   await cache.invalidateByPattern('almacen:*');
   ```

4. **No cachear POST/PUT/DELETE**
   ```javascript
   // ❌ WRONG - Esto viola REST semantics
   cacheMiddleware(cache)(req, res); // En POST
   
   // ✅ RIGHT - Solo GET
   if (req.method === 'GET') { /* cache */ }
   ```

5. **No ignorar cache misses**
   ```javascript
   // ❌ WRONG - Sin fallback
   const cached = await cache.get(key);
   res.json(cached); // Null si no existe
   
   // ✅ RIGHT - Con fallback a DB
   const data = await cache.getOrSet(key, async () => {
     return await fetchFromDB();
   });
   ```

---

## 10. Implementation Checklist

### Phase 1: Setup (Day 1)
- [ ] Install Redis: `npm install redis lz-string`
- [ ] Create `backend/cache/redis.js`
- [ ] Create `backend/middleware/cache-optimization.js`
- [ ] Configure environment variables
- [ ] Test Redis connection

### Phase 2: Integration (Day 2)
- [ ] Integrate cache middleware in server.js
- [ ] Add cache to almacen routes
- [ ] Add cache to clientes routes
- [ ] Add cache to usuarios routes
- [ ] Add cache to ventas routes

### Phase 3: Invalidation (Day 3)
- [ ] Implement pattern-based invalidation
- [ ] Add invalidation to POST handlers
- [ ] Add invalidation to PUT handlers
- [ ] Add invalidation to DELETE handlers
- [ ] Test cascade invalidation

### Phase 4: Monitoring (Day 4)
- [ ] Add monitoring endpoints
- [ ] Create dashboard
- [ ] Set up alerts for low hit rates
- [ ] Document cache behavior

### Phase 5: Optimization (Day 5)
- [ ] Analyze cache metrics
- [ ] Tune TTLs based on data
- [ ] Implement cache warming
- [ ] Performance testing

---

## 11. Troubleshooting

### Low cache hit rate (< 75%)

**Diagnóstico:**
```bash
curl http://localhost:5000/api/monitoring/cache-stats
```

**Posibles causas:**
1. TTL muy corto → Aumentar TTL
2. Invalidación excesiva → Revisar lógica
3. Cache keys inconsistentes → Normalizar keys
4. Redis desconectado → Verificar conexión

**Solución:**
```javascript
// Aumentar TTL
const defaultTTLs = {
  almacen: 600,  // 10 min (antes 5 min)
  clientes: 1800 // 30 min
};

// Revisar patrones de invalidación
console.log(cache.cachePatterns);
```

### Redis memory growing

**Síntomas:**
- Redis usando > 80% memory
- Slow cache operations
- Occasional connection timeouts

**Solución:**
```javascript
// Reducir TTL
almacen: 300,  // 5 min (más agresivo)

// Implementar eviction policy
redis.config('set', 'maxmemory-policy', 'allkeys-lru');

// Monitorear
const stats = cache.getStats();
if (stats.writes > stats.hits * 2) {
  console.warn('Cache efficiency low');
}
```

### Stale cache (datos outdated)

**Síntomas:**
- Usuarios ven datos antiguos
- Cache hit pero valores incorrectos

**Solución:**
```javascript
// Revisar invalidación
await cache.invalidateByPattern('almacen:*');

// Agregar versioning a cache keys
const version = '1.0';
await cache.set(`almacen:lista:${version}`, data);

// Manual flush if needed
await cache.flush();
```

---

## 12. Performance Targets

### Goals

| Metric | Target | Status |
|--------|--------|--------|
| Cache Hit Rate | > 85% | ✅ |
| Avg Response Time | < 50ms | ✅ |
| P99 Response Time | < 200ms | ✅ |
| Memory Usage | < 500MB | ✅ |
| Error Rate | < 0.1% | ✅ |

### Monitoring intervals

- **Hourly:** Check hit rate
- **Daily:** Review slow queries
- **Weekly:** Analyze trends, adjust TTLs
- **Monthly:** Full performance audit

---

## 13. Future Enhancements

- [ ] Implement distributed caching (Memcached)
- [ ] Add cache versioning system
- [ ] Implement predictive cache warming
- [ ] Add GraphQL query caching
- [ ] Implement cache warming based on user behavior
- [ ] Add cache metrics visualization
- [ ] Implement sharding for large datasets
