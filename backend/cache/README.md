# Redis Cache Module

Ultra-fast in-memory caching for Maya Autopartes API.

## Quick Start

```javascript
const { getCache } = require('./redis');
const cache = getCache();

// Connect to Redis
await cache.connect();

// Cache a value
await cache.set('key', { data: 'value' }, 300); // 5 min TTL

// Get from cache
const data = await cache.get('key');

// Batch operations
await cache.setMultiple({
  'key1': value1,
  'key2': value2
}, 600);

// Invalidate pattern
await cache.invalidateByPattern('almacen:*');

// Get stats
const stats = cache.getStats();
console.log(`Hit rate: ${stats.hitRate}`);
```

## Features

- **Automatic Compression:** LZ-string compression for data > 1KB
- **Configurable TTL:** Per-type TTL configuration
- **Pattern Invalidation:** Invalidate multiple keys by pattern
- **Batch Operations:** Set/get multiple keys efficiently
- **Statistics:** Track cache hits, misses, and errors
- **Reconnection Logic:** Automatic reconnection on failures

## Configuration

```javascript
const cache = getCache({
  host: 'localhost',        // Redis host
  port: 6379,              // Redis port
  password: null,          // Auth password
  compression: true,       // Enable compression
  maxRetries: 3            // Max connection retries
});
```

## TTL by Type

```
almacen           300s (5 min)     - Products change frequently
almacenStats      600s (10 min)    - Stats update less frequently
clientes          600s (10 min)    
usuarios          1800s (30 min)   - User data relatively static
busquedas         3600s (1 hour)   - Search results highly cacheable
ventasResumen     300s (5 min)     - Sales data dynamic
facturasResumen   600s (10 min)    
default           600s (10 min)    - Everything else
```

## Methods

### set(key, value, ttl)
Cache a value with optional TTL.

```javascript
await cache.set('almacen:lista:1', data, 300);
```

### get(key)
Retrieve from cache, returns null if not found.

```javascript
const data = await cache.get('almacen:lista:1');
```

### getOrSet(key, fn, ttl)
Get from cache or execute function if miss.

```javascript
const data = await cache.getOrSet('almacen:lista:1', async () => {
  return await fetchFromDB();
}, 300);
```

### setMultiple(keysValues, ttl)
Batch set operation for efficiency.

```javascript
await cache.setMultiple({
  'almacen:lista': almacenData,
  'clientes:lista': clientesData
}, 600);
```

### getMultiple(keys)
Batch get operation.

```javascript
const results = await cache.getMultiple(['almacen:lista', 'clientes:lista']);
```

### delete(key)
Remove specific key.

```javascript
await cache.delete('almacen:lista:1');
```

### invalidateByPattern(pattern)
Remove multiple keys matching pattern.

```javascript
await cache.invalidateByPattern('almacen:*');
```

### flush()
Clear entire cache (use carefully!).

```javascript
await cache.flush();
```

### getStats()
Get cache performance metrics.

```javascript
const stats = cache.getStats();
// { hits: 1234, misses: 456, hitRate: "73.04%", ... }
```

## Performance

- **Cache HIT:** 12ms
- **Cache MISS:** 50ms (including DB query)
- **Compression ratio:** 80-90% for typical JSON
- **Hit rate target:** > 85%

## Monitoring

```bash
# Get stats
curl http://localhost:5000/api/monitoring/cache-stats

# Get dashboard
curl http://localhost:5000/api/monitoring/performance

# Flush cache (admin)
curl -X POST http://localhost:5000/api/monitoring/cache-flush \
  -H "Authorization: Bearer TOKEN"
```

## Troubleshooting

**Redis won't connect:**
```bash
redis-cli ping
# Should return: PONG
```

**Low hit rate (< 75%):**
1. Increase TTL values
2. Check invalidation logic
3. Verify cache keys consistency

**Redis memory growing:**
1. Reduce TTL values
2. Reduce batch sizes
3. Check for memory leaks

## Files

- `redis.js` - Main cache implementation
- `README.md` - This file
