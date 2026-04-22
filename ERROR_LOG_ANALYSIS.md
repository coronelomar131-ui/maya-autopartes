# Análisis de Error Logs - Maya Autopartes

## 📋 Guía Completa para Interpretar y Analizar Logs

Este documento explica cómo leer, analizar y depurar problemas usando los logs del sistema.

---

## 1. Estructura de Logs

### 1.1 Ubicación de Archivos

```
proyecto/
├── logs/
│   ├── error.log       # Solo errores (nivel: error)
│   ├── combined.log    # Todos los logs (debug, info, warn, error)
│   ├── error.log.1     # Archivos rotados
│   └── combined.log.1
```

### 1.2 Formato de Log Individual

```json
{
  "timestamp": "2024-04-22 14:30:45",
  "level": "error",
  "message": "Application Error",
  "context": {
    "method": "POST",
    "url": "/api/v1/ventas",
    "ip": "192.168.1.100",
    "userId": "user_12345",
    "userEmail": "cliente@example.com"
  },
  "statusCode": 500,
  "errorType": "DatabaseError",
  "stack": "Error: connection timeout\n    at Database.query...",
  "details": {
    "code": "ETIMEDOUT",
    "detail": "Unable to connect to database"
  }
}
```

---

## 2. Niveles de Severidad

### 2.1 Estructura de Niveles

| Nivel | Código | Color | Significado | Acción |
|-------|--------|-------|-------------|--------|
| **DEBUG** | 0 | Azul | Información de depuración | Ignorar en producción |
| **INFO** | 1 | Verde | Información general | Registrar eventos normales |
| **WARN** | 2 | Amarillo | Advertencia | Investigar si es frecuente |
| **ERROR** | 3 | Rojo | Error | Investigar inmediatamente |

### 2.2 Ejemplos por Nivel

**DEBUG - Información detallada**:
```json
{
  "level": "debug",
  "message": "Query ejecutada",
  "sql": "SELECT * FROM productos WHERE id = $1",
  "parameters": [123],
  "duration": "42ms"
}
```

**INFO - Eventos normales**:
```json
{
  "level": "info",
  "message": "Usuario iniciado sesión",
  "userId": "user_123",
  "email": "user@example.com",
  "timestamp": "2024-04-22T14:30:45Z"
}
```

**WARN - Situaciones anómalas pero recuperables**:
```json
{
  "level": "warn",
  "message": "Inventario bajo detectado",
  "productoId": "prod_456",
  "cantidadActual": 5,
  "minimoRecomendado": 10
}
```

**ERROR - Problemas que necesitan atención**:
```json
{
  "level": "error",
  "message": "Application Error",
  "errorType": "DatabaseError",
  "statusCode": 500,
  "details": {
    "code": "ECONNREFUSED",
    "detail": "Connection refused"
  }
}
```

---

## 3. Tipos de Errores Comunes

### 3.1 DatabaseError (Error de Base de Datos)

**Síntomas**:
```
errorType: "DatabaseError"
statusCode: 500
message: "Error al obtener productos"
```

**Causas Posibles**:
- Conexión perdida a Supabase
- Query SQL inválida
- Timeout de conexión
- Credenciales expiradas

**Investigación**:
```bash
# Ver logs de error
tail -100 logs/error.log | grep DatabaseError

# Verificar salud de DB
curl http://localhost:5000/health/db

# En sentry
# 1. Issues → Buscar "DatabaseError"
# 2. Ver breadcrumbs para entender qué sucedió antes
# 3. Revisar stack trace
```

**Solución**:
```javascript
// En backend/server.js
// Implementar retry logic
const retryQuery = async (fn, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
};
```

### 3.2 ValidationError (Error de Validación)

**Síntomas**:
```
errorType: "ValidationError"
statusCode: 400
message: "Datos inválidos"
```

**Causas Posibles**:
- Campo requerido faltante
- Formato de dato incorrecto
- Valor fuera de rango

**Investigación**:
```bash
# Buscar validaciones fallidas
grep "ValidationError" logs/combined.log

# Verificar parámetros enviados
# En Sentry → Issues → Click en evento
# Ver "Request" tab
```

**Solución**:
```javascript
// Mejorar validación en frontend antes de enviar
import { validationSchema } from '../validators/producto';

const handleSubmit = async (data) => {
  try {
    await validationSchema.validate(data);
    await submitForm(data);
  } catch (validationError) {
    sentryClient.captureMessage(validationError.message, 'warning');
    showErrorToUser(validationError.message);
  }
};
```

### 3.3 AuthenticationError (No Autenticado)

**Síntomas**:
```
errorType: "AuthenticationError"
statusCode: 401
message: "Autenticación requerida"
```

**Causas Posibles**:
- Token expirado
- Token inválido
- No hay token en request
- Sesión cerrada

**Investigación**:
```bash
# Buscar errores de autenticación
grep "401" logs/combined.log

# Verificar en Sentry
# Issues → AuthenticationError
# Ver contexto de usuario
```

**Solución**:
```javascript
// Implementar refresh token logic en frontend
const apiCall = async (url, options) => {
  try {
    let response = await fetch(url, options);
    
    if (response.status === 401) {
      // Intentar refresh
      const refreshed = await refreshToken();
      if (refreshed) {
        response = await fetch(url, options);
      } else {
        // Redirigir a login
        window.location.href = '/login';
      }
    }
    
    return response;
  } catch (error) {
    sentryClient.captureException(error);
  }
};
```

### 3.4 NotFoundError (Recurso No Encontrado)

**Síntomas**:
```
errorType: "NotFoundError"
statusCode: 404
message: "Producto no encontrado"
```

**Causas Posibles**:
- ID no existe
- Recurso fue eliminado
- Ruta incorrecta

**Investigación**:
```bash
# Buscar 404s
grep "404" logs/combined.log | tail -20

# En Sentry
# Issues → NotFoundError
# Ver qué recurso se buscaba
```

---

## 4. Análisis de Logs en Terminal

### 4.1 Búsqueda Básica

```bash
# Ver últimas 50 líneas
tail -50 logs/error.log

# Ver últimas líneas en tiempo real
tail -f logs/error.log

# Buscar errores específicos
grep "DatabaseError" logs/error.log

# Contar errores por tipo
grep "errorType" logs/error.log | grep -o '"errorType":"[^"]*"' | sort | uniq -c
```

### 4.2 Análisis de Rendimiento

```bash
# Ver duraciones lentas
grep "duration" logs/combined.log | grep -oE "[0-9]{4,}ms" | sort -nr | head -20

# Errores en endpoint específico
grep "/api/v1/ventas" logs/error.log

# Errores por usuario
grep "userId" logs/error.log | grep -oE "\"userId\":\"[^\"]*\"" | sort | uniq -c
```

### 4.3 Análisis Temporal

```bash
# Errores en última hora
tail -10000 logs/error.log | grep "14:3"

# Agrupar errores por minuto
grep "timestamp" logs/error.log | cut -d' ' -f2 | sort | uniq -c

# Peak de errores
awk '{print substr($0, 1, 16)}' logs/error.log | sort | uniq -c | sort -rn | head
```

### 4.4 Scripting Avanzado

```bash
#!/bin/bash
# Script para analizar errores del día

echo "=== RESUMEN DE ERRORES HOY ==="

# Contar total
echo "Total de errores:"
grep "error" logs/error.log | wc -l

# Errores por tipo
echo -e "\nErrores por tipo:"
grep "errorType" logs/error.log | \
  grep -oE '"errorType":"[^"]*"' | \
  cut -d'"' -f4 | \
  sort | uniq -c | sort -rn

# Top 5 usuarios afectados
echo -e "\nTop 5 usuarios con más errores:"
grep "userId" logs/error.log | \
  grep -oE '"userId":"[^"]*"' | \
  cut -d'"' -f4 | \
  sort | uniq -c | sort -rn | head -5

# Endpoints con más errores
echo -e "\nEndpoints con más errores:"
grep "url" logs/error.log | \
  grep -oE '"/api/v1/[^"]*"' | \
  sort | uniq -c | sort -rn | head -5
```

---

## 5. Análisis en Sentry

### 5.1 Página de Issues

**Columnas importantes**:
- **Title**: Nombre del error agrupado
- **Events**: Número de ocurrencias
- **Users**: Usuarios afectados
- **First Seen**: Cuándo empezó
- **Last Seen**: Última ocurrencia

**Acciones**:
- Click en issue → Ver eventos individuales
- "Resolve" → Marcar como resuelto
- "Ignore" → No mostrar más
- "Assign" → Asignar a equipo

### 5.2 Detalles de Evento

Cuando haces click en un issue, ves:

**Breadcrumbs** (Historial de acciones):
```
14:30:45 user-action    Navigate to /productos
14:30:47 api-call       GET /api/v1/productos
14:30:48 user-action    Click button "Edit"
14:30:50 api-call       POST /api/v1/productos/123
14:30:51 ui.error       DatabaseError thrown
```

**Stack Trace** (Dónde pasó):
```
DatabaseError: connection timeout
  at connectDatabase (backend/database.js:42)
  at executeQuery (backend/database.js:120)
  at router.post (/api/v1/productos/:id)
```

**Request** (Datos enviados):
```
POST /api/v1/productos/123
Headers: {Authorization: "Bearer..."}
Body: {"name": "Producto A", "price": 100}
```

**User** (Quién fue afectado):
```
ID: user_123
Email: cliente@example.com
Login Time: 2024-04-22 14:00:00
```

### 5.3 Filtros Útiles

```
# Errores de última hora
is:unresolved age:-1h

# DatabaseErrors no resueltos
error.type:DatabaseError is:unresolved

# Errores en producción de usuario específico
environment:production user.email:"usuario@example.com"

# Errores con latencia > 5s
performance.slow_duration:>5000
```

---

## 6. Correlación Backend + Frontend

### 6.1 Transaction ID

Cada request tiene un `transactionId` único:

**Backend** (generado automáticamente):
```json
{
  "timestamp": "2024-04-22T14:30:45Z",
  "transactionId": "1713872445000-a7f2k9m1",
  "message": "Error en POST /api/v1/ventas"
}
```

**Frontend** (en header de respuesta):
```javascript
// response.headers['x-transaction-id']
// Usar para correlacionar con backend logs
```

**Uso**:
```bash
# Buscar todas las logs de una transacción
grep "1713872445000-a7f2k9m1" logs/combined.log

# Incluir en error reports
sentryClient.setTag('transactionId', response.headers['x-transaction-id']);
```

### 6.2 Correlacionar Errores

1. **Frontend genera error**:
   ```javascript
   try {
     const response = await fetch('/api/v1/ventas', options);
   } catch (error) {
     const transactionId = response?.headers?.get('x-transaction-id');
     sentryClient.captureException(error, {
       tags: { transactionId }
     });
   }
   ```

2. **Backend recibe error**:
   ```javascript
   // En middleware de error
   logError(error, req, {
     transactionId: req.transactionId,
     clientSide: false
   });
   ```

3. **Análisis**:
   ```bash
   # Buscar en backend logs
   grep "1713872445000-a7f2k9m1" logs/combined.log
   
   # Buscar en Sentry con tag
   transactionId:"1713872445000-a7f2k9m1"
   ```

---

## 7. Performance Analysis

### 7.1 Latencias Lentas

En logs buscar:
```json
{
  "message": "Response slow",
  "duration": "5234ms",
  "url": "/api/v1/almacen/stats/inventory",
  "method": "GET"
}
```

**Investigación**:
```bash
# Top 10 requests más lentos
grep "duration" logs/combined.log | \
  grep -oE '[0-9]+ms' | \
  sed 's/ms//' | \
  sort -rn | \
  head -10
```

**Soluciones**:
```javascript
// 1. Implementar caching
const cache = new Map();
const getCachedData = (key, fn) => {
  if (cache.has(key)) return cache.get(key);
  const data = fn();
  cache.set(key, data);
  setTimeout(() => cache.delete(key), 5 * 60 * 1000); // 5 min
  return data;
};

// 2. Implementar paginación
app.get('/api/v1/almacen', (req, res) => {
  const page = req.query.page || 1;
  const limit = req.query.limit || 20;
  const offset = (page - 1) * limit;
  
  // ... query with LIMIT offset, limit
});

// 3. Indexar columnas consultadas frecuentemente
// En Supabase: CREATE INDEX idx_productos_codigo ON productos(codigo);
```

### 7.2 Memory Leaks

Ver estadísticas:
```bash
curl http://localhost:5000/health/memory
```

Response:
```json
{
  "memory": {
    "heapUsed": {
      "mb": 256,
      "bytes": 268435456
    },
    "heapTotal": {
      "mb": 512,
      "bytes": 536870912
    }
  }
}
```

**Análisis**:
```javascript
// Si heapUsed crece continuamente:
// 1. Buscar referencias circulares
// 2. Limpiar event listeners
// 3. Vaciar caches

// Monitoreo continuo
setInterval(() => {
  const mem = process.memoryUsage();
  logInfo('Memory status', {
    heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + 'MB',
    heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + 'MB'
  });
}, 5 * 60 * 1000); // Cada 5 minutos
```

---

## 8. Alertas y Patrones

### 8.1 Detectar Anomalías

```bash
# Spike de errores en último minuto
tail -1000 logs/error.log | wc -l

# Si > 50 errores en último minuto → Alerta
```

### 8.2 Patrones de Ataque

```bash
# Múltiples 401 desde una IP
grep "401" logs/combined.log | grep "192.168.1.50" | wc -l

# Si > 5 en 1 minuto → Posible ataque de fuerza bruta
```

### 8.3 Degradación de Servicio

```bash
# Tiempo promedio de respuesta
grep "duration" logs/combined.log | \
  grep -oE '[0-9]+ms' | \
  sed 's/ms//' | \
  awk '{sum+=$1; count++} END {print sum/count}'

# Si > 2000ms en promedio → Investigar
```

---

## 9. Troubleshooting Común

### Problema: Logs muy grandes

**Solución**:
```bash
# Limpiar logs viejos
find logs/ -name "*.log.*" -mtime +30 -delete

# Comprimir logs
gzip logs/error.log.1
```

### Problema: Errores duplicados en Sentry

**Solución**:
```javascript
// En error-handler.js, aumentar ERROR_CACHE_DURATION
const ERROR_CACHE_DURATION = 10 * 60 * 1000; // 10 minutos

// O usar fingerprint personalizado
beforeSend(event, hint) {
  event.fingerprint = [
    event.exception[0].type,
    event.exception[0].value
  ];
  return event;
}
```

### Problema: No veo mis logs en archivo

**Solución**:
```bash
# Verificar que Winston está instalado
npm list winston

# Verificar permisos de carpeta logs/
ls -la logs/

# Verificar que NODE_ENV !== 'test'
echo $NODE_ENV
```

---

## 10. Checklist de Monitoreo Diario

- [ ] Revisar Sentry Issues página
- [ ] Verificar health endpoints
- [ ] Buscar DatabaseErrors en logs
- [ ] Analizar latencias lentas
- [ ] Revisar alertas en Slack
- [ ] Limpiar logs viejos
- [ ] Documentar problemas encontrados

---

**Última actualización**: Abril 2024
**Versión**: 1.0.0
