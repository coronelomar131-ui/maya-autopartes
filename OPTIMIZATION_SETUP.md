# Performance Optimization Setup Guide

## Quick Start (5 minutos)

### 1. Instalar dependencias

```bash
cd backend
npm install redis lz-string
```

### 2. Configurar variables de entorno

```bash
# .env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=null
COMPRESSION_LEVEL=6
NODE_ENV=development
```

### 3. Iniciar Redis (si no está corriendo)

```bash
# MacOS
brew services start redis

# Linux
sudo systemctl start redis-server

# Windows
redis-server.exe

# Docker
docker run -d -p 6379:6379 redis:latest
```

### 4. Verificar Redis está corriendo

```bash
redis-cli ping
# Output: PONG
```

### 5. Ejecutar servidor

```bash
npm run dev
```

### 6. Verificar setup

```bash
# Health check
curl http://localhost:5000/api/health

# Cache stats
curl http://localhost:5000/api/monitoring/cache-stats

# Performance dashboard
curl http://localhost:5000/api/monitoring/performance
```

---

## Installation Steps

### Step 1: Install Dependencies

```bash
cd /path/to/backend
npm install redis lz-string
```

**Verificar:**
```bash
npm list redis lz-string
# redis@4.6.10
# lz-string@1.5.0
```

### Step 2: Setup Redis Server

#### Option A: Local Installation

**MacOS:**
```bash
brew install redis
brew services start redis
brew services stop redis    # To stop
```

**Linux:**
```bash
sudo apt-get install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**Windows:**
```bash
# Download from: https://github.com/microsoftarchive/redis/releases
# Or use Windows Subsystem for Linux (WSL)
```

#### Option B: Docker

```bash
# Pull and run Redis container
docker run -d -p 6379:6379 --name maya-redis redis:latest

# Verify
docker ps | grep maya-redis
```

#### Option C: Docker Compose

```yaml
# docker-compose.yml
version: '3.8'
services:
  redis:
    image: redis:latest
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    environment:
      - REDIS_PASSWORD=your-secure-password

  app:
    build: .
    ports:
      - "5000:5000"
    environment:
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=your-secure-password
    depends_on:
      - redis

volumes:
  redis-data:
```

```bash
docker-compose up -d
```

### Step 3: Create Environment Variables

**File: `.env`**
```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=null          # null si no hay password
REDIS_DB=0                   # Database number (0-15)

# Compression Configuration
COMPRESSION_LEVEL=6          # 0-11 (higher = more CPU)
COMPRESSION_MIN_SIZE=1024    # Bytes, minimum size to compress

# Server Configuration
NODE_ENV=development
PORT=5000
CORS_ORIGIN=http://localhost:3000

# Database
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-key
```

**File: `.env.production`**
```env
# Redis Configuration (Producción)
REDIS_HOST=redis.production.example.com
REDIS_PORT=6379
REDIS_PASSWORD=your-secure-password
REDIS_DB=0

# Compression Configuration
COMPRESSION_LEVEL=9          # Higher compression in production
COMPRESSION_MIN_SIZE=512

# Server Configuration
NODE_ENV=production
PORT=5000
CORS_ORIGIN=https://maya-autopartes.com

# Database
SUPABASE_URL=your-supabase-production-url
SUPABASE_KEY=your-supabase-production-key
```

### Step 4: Initialize Cache in Server

**File: `backend/server.js`**

```javascript
const express = require('express');
const { initializeOptimization } = require('./middleware/cache-optimization');

const app = express();
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ... other middleware ...

// Initialize optimization (cache, compression, monitoring)
(async () => {
  const { cache, queryOptimizer, compressionManager } = 
    await initializeOptimization(app, supabase);
  
  // Opcional: warm up cache
  await warmupCache(cache, supabase);
})();

// ... rest of setup ...
```

### Step 5: Create Helper Functions

**File: `backend/utils/cache-helpers.js`**

```javascript
const { getCache } = require('../cache/redis');

/**
 * Warm up cache with popular data
 */
async function warmupCache(cache, supabase) {
  console.log('🔥 Warming up cache...');
  
  try {
    // Cache popular products
    const { data: almacen } = await supabase
      .from('almacen')
      .select('id,nombre,precio,stock')
      .limit(100);
    
    await cache.set('almacen:list:popular', almacen, 1800);
    
    // Cache popular searches
    const popularSearches = ['filtro', 'aceite', 'manguera'];
    for (const term of popularSearches) {
      const { data } = await supabase
        .from('almacen')
        .select()
        .ilike('nombre', `%${term}%`)
        .limit(50);
      
      await cache.set(`busquedas:almacen:${term}`, data, 3600);
    }
    
    console.log('✅ Cache warmup completed');
  } catch (error) {
    console.error('⚠️ Cache warmup error:', error);
  }
}

module.exports = { warmupCache };
```

### Step 6: Configure Routes

**File: `backend/routes/almacen.js`** (Actualizar existente)

```javascript
const router = require('express').Router();
const { getCache } = require('../cache/redis');

// GET lista paginada
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const pageSize = parseInt(req.query.pageSize) || 50;
  
  const cacheKey = `almacen:lista:${page}:${pageSize}`;
  
  try {
    // Intentar cache
    const cached = await req.cache.get(cacheKey);
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json({ success: true, ...cached });
    }

    // Obtener de DB con optimizer
    const { data, pagination, duration } = 
      await req.queryOptimizer.getPaginated('almacen', page, pageSize);

    // Cachear
    await req.cache.set(cacheKey, { data, pagination }, 300);

    res.set('X-Cache', 'MISS');
    res.json({ success: true, data, pagination, duration });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST crear y invalidar cache
router.post('/', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('almacen')
      .insert([req.body])
      .select();

    if (error) throw error;

    // Invalidar caches relacionados
    await req.cache.invalidateByPattern('almacen:*');
    await req.cache.invalidateByPattern('busquedas:*');

    res.json({ success: true, data: data[0] });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

module.exports = router;
```

### Step 7: Test Setup

```bash
# Test Redis connection
node -e "
const redis = require('redis');
const client = redis.createClient({ host: 'localhost', port: 6379 });
client.on('ready', () => {
  console.log('✅ Redis connected');
  client.ping((err, reply) => {
    console.log('PING:', reply);
    process.exit(0);
  });
});
client.on('error', (err) => {
  console.error('❌ Redis error:', err);
  process.exit(1);
});
"

# Test server startup
npm run dev

# In another terminal, test endpoints
curl http://localhost:5000/api/health
curl http://localhost:5000/api/monitoring/cache-stats
```

---

## Configuration Details

### Redis Configuration

**Default Settings:**
```javascript
const cacheOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || null,
  db: 0,
  maxRetries: 3,
  retryStrategy: (options) => {
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Redis retry time exhausted');
    }
    return Math.min(options.attempt * 100, 3000);
  }
};
```

**TTL Configuration:**
```javascript
defaultTTLs = {
  almacen: 300,           // 5 min
  almacenStats: 600,      // 10 min
  clientes: 600,          // 10 min
  usuarios: 1800,         // 30 min
  busquedas: 3600,        // 1 hora
  ventasResumen: 300,     // 5 min
  facturasResumen: 600,   // 10 min
  default: 600            // 10 min
};
```

### Compression Configuration

**Default Settings:**
```javascript
const compressionOptions = {
  algorithm: 'gzip',       // Standard compression
  level: 6,                // Balance speed/compression (0-11)
  threshold: 1024,         // Minimum bytes to compress
  filter: (req, res) => {
    // Don't compress if already compressed
    if (req.headers['x-no-compression']) return false;
    // Use default filter
    return compression.filter(req, res);
  }
};
```

**Adjust for your use case:**
```javascript
// More compression (slower, smaller size)
const manager = new CompressionManager({ level: 9, minSize: 512 });

// Less compression (faster, larger size)
const manager = new CompressionManager({ level: 3, minSize: 2048 });

// Aggressive (production)
const manager = new CompressionManager({ level: 9, minSize: 256 });

// Conservative (development)
const manager = new CompressionManager({ level: 3, minSize: 5120 });
```

---

## Verification Checklist

### Pre-flight Checks

- [ ] Node.js 16+ installed: `node --version`
- [ ] npm 8+ installed: `npm --version`
- [ ] Redis installed: `redis-cli --version`
- [ ] Redis running: `redis-cli ping` → PONG
- [ ] Port 5000 available: `lsof -i :5000`
- [ ] Port 6379 available: `lsof -i :6379`

### Installation Checks

- [ ] Dependencies installed: `npm list redis lz-string`
- [ ] Cache module created: `ls backend/cache/redis.js`
- [ ] Optimizer module created: `ls backend/optimization/query-optimizer.js`
- [ ] Compression module created: `ls backend/optimization/compression.js`
- [ ] Middleware created: `ls backend/middleware/cache-optimization.js`

### Runtime Checks

```bash
# Start server
npm run dev

# In another terminal:

# Health check
curl http://localhost:5000/api/health
# Output: { "status": "OK", "database": "CONNECTED" }

# Cache stats
curl http://localhost:5000/api/monitoring/cache-stats
# Output: { "hits": 0, "misses": 0, ... }

# Compression stats
curl http://localhost:5000/api/monitoring/compression-stats
# Output: { "responsesCompressed": 0, ... }

# Performance dashboard
curl http://localhost:5000/api/monitoring/performance
# Output: { "cache": {...}, "queries": {...}, "compression": {...} }
```

---

## Troubleshooting

### Redis Connection Error

**Error:** `ECONNREFUSED 127.0.0.1:6379`

**Solutions:**
1. Check Redis is running: `redis-cli ping`
2. Check host/port: `REDIS_HOST=localhost REDIS_PORT=6379`
3. Restart Redis:
   ```bash
   redis-cli shutdown
   redis-server
   ```

### Low Cache Hit Rate

**Symptom:** Cache hit rate < 50%

**Diagnosis:**
```bash
curl http://localhost:5000/api/monitoring/cache-stats
# Check hitRate percentage
```

**Solutions:**
1. Increase TTL: Change defaultTTLs in redis.js
2. Check invalidation: Review cache invalidation logic
3. Verify cache keys: Ensure consistent key naming

### Memory Issues

**Symptom:** Redis memory usage > 80%

**Solutions:**
1. Reduce TTL:
   ```javascript
   almacen: 180,  // 3 min instead of 5 min
   ```

2. Enable eviction policy:
   ```bash
   redis-cli CONFIG SET maxmemory-policy allkeys-lru
   ```

3. Monitor usage:
   ```bash
   redis-cli INFO memory
   ```

### Compression Issues

**Symptom:** Slow response times despite gzip enabled

**Solutions:**
1. Reduce compression level:
   ```javascript
   const manager = new CompressionManager({ level: 3 });
   ```

2. Increase minimum size:
   ```javascript
   const manager = new CompressionManager({ minSize: 5120 });
   ```

3. Check CPU usage:
   ```bash
   top
   # Look for node process CPU %
   ```

---

## Performance Tuning

### For Development

```env
REDIS_HOST=localhost
REDIS_PORT=6379
COMPRESSION_LEVEL=3
NODE_ENV=development
```

### For Production

```env
REDIS_HOST=redis.production.internal
REDIS_PORT=6379
REDIS_PASSWORD=secure-password
COMPRESSION_LEVEL=9
NODE_ENV=production
```

### For High Traffic

```javascript
// Increase batch sizes
await queryOptimizer.batchInsert('almacen', items, 500); // 500 per batch

// Reduce TTL for fresher data
almacen: 60, // 1 minute

// Aggressive compression
const manager = new CompressionManager({ level: 9, minSize: 256 });
```

### For Memory Constrained

```javascript
// Increase TTL to reduce writes
almacen: 600, // 10 minutes

// Less aggressive compression
const manager = new CompressionManager({ level: 3, minSize: 5120 });

// Smaller batch sizes
await queryOptimizer.batchInsert('almacen', items, 50); // 50 per batch
```

---

## Production Deployment

### 1. Use Redis Managed Service

**Options:**
- AWS ElastiCache
- Google Cloud Memorystore
- Heroku Redis
- Upstash
- Azure Cache for Redis

**Example (AWS ElastiCache):**
```env
REDIS_HOST=maya-cache.abc123.ng.0001.use1.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=your-auth-token
REDIS_TLS=true
```

### 2. Enable SSL/TLS

```javascript
const options = {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
  password: process.env.REDIS_PASSWORD,
  tls: process.env.REDIS_TLS === 'true' ? {} : null
};
```

### 3. Setup Monitoring

```bash
# Use Redis Insights or similar
redis-cli --stat

# Or use monitoring endpoint
curl http://your-api.com/api/monitoring/performance
```

### 4. Configure Auto-scaling

```yaml
# Kubernetes HPA example
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: maya-api
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: maya-api
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
```

---

## Next Steps

1. **Implement in routes:** Use example in `almacen-optimized-example.js`
2. **Monitor metrics:** Check `/api/monitoring/performance` regularly
3. **Tune configuration:** Adjust TTLs based on your usage patterns
4. **Setup alerts:** Alert on cache hit rate < 75% or errors > 0.1%
5. **Optimize queries:** Add database indexes as recommended
6. **Load test:** Test with 100+ concurrent users
7. **Document patterns:** Document cache invalidation strategy for your team

---

## Support

For issues or questions:
1. Check `/PERFORMANCE_OPTIMIZATION.md` for detailed guide
2. Check `/CACHING_STRATEGY.md` for caching best practices
3. Review monitoring dashboard: `/api/monitoring/performance`
4. Check application logs: `npm run dev` output
5. Check Redis logs: `redis-cli INFO`
