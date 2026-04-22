# Sistema de Monitoreo y Error Handling - Maya Autopartes

## 📊 Overview

Este sistema proporciona error handling robusto y monitoreo en producción para la aplicación Maya Autopartes.

### ✨ Características

- **Error Handling Centralizado**: Clases de error tipificadas y middleware global
- **Logging Estructurado**: Winston con rotación de logs y múltiples niveles
- **Monitoreo Remoto**: Sentry para captura de errores en tiempo real
- **Health Checks**: Endpoints para verificar salud de servicios
- **Breadcrumbs**: Rastrear acciones del usuario previas al error
- **Performance Tracking**: Monitorear latencias y memory usage
- **User Context**: Identificar usuarios afectados por errores
- **Alertas Automáticas**: Notificaciones en Slack, Email, etc.

---

## 📁 Estructura de Archivos Creados

```
maya-autopartes-working/
├── backend/
│   └── monitoring/
│       ├── error-handler.js      (~230 líneas) - Error handling centralizado
│       └── healthcheck.js        (~280 líneas) - Health check endpoints
├── frontend/
│   └── monitoring/
│       └── sentry-client.js      (~350 líneas) - Sentry para navegador
└── Documentación/
    ├── MONITORING_DASHBOARD.md    - Guía de Sentry
    ├── ERROR_LOG_ANALYSIS.md      - Cómo interpretar logs
    ├── ERROR_HANDLING_STRATEGY.md - Estrategia completa
    ├── PRODUCTION_MONITORING.md   - Monitoreo en producción
    ├── MONITORING_INTEGRATION_EXAMPLE.md - Ejemplos de código
    └── MONITORING_README.md       - Este archivo
```

**Total Líneas de Código**: ~860 líneas
**Total Documentación**: ~2,500 líneas

---

## 🚀 Quick Start

### 1. Instalación de Dependencias

```bash
# Backend
cd backend
npm install winston @sentry/node
npm install --save-dev jest supertest

# Frontend
cd frontend
npm install @sentry/react
```

### 2. Configurar Variables de Entorno

```bash
# Backend .env
NODE_ENV=development
SENTRY_DSN=https://<key>@sentry.io/<projectId>
LOG_DIR=./logs

# Frontend .env
REACT_APP_SENTRY_DSN=https://<key>@sentry.io/<projectId>
```

### 3. Integrar en Backend

En `backend/server.js`:

```javascript
const {
  errorHandlingMiddleware,
  notFoundMiddleware,
  requestContextMiddleware,
  setUserContextMiddleware
} = require('./monitoring/error-handler');

const { createHealthCheckRoutes } = require('./monitoring/healthcheck');

// Antes de las rutas
app.use(requestContextMiddleware);
app.use(setUserContextMiddleware);

// Después de las rutas
app.use('/health', createHealthCheckRoutes(supabase));
app.use(notFoundMiddleware);
app.use(errorHandlingMiddleware);
```

### 4. Integrar en Frontend

En `frontend/index.js`:

```javascript
import sentryClient from './monitoring/sentry-client';

sentryClient.init();
```

### 5. Usar en Rutas

```javascript
const { asyncHandler, ValidationError } = require('../monitoring/error-handler');

router.get('/endpoint', asyncHandler(async (req, res) => {
  // Tu código aquí - errores se capturan automáticamente
}));
```

---

## 📖 Documentación

### Para Developers
- **MONITORING_INTEGRATION_EXAMPLE.md**: Cómo integrar en tu código
- **ERROR_HANDLING_STRATEGY.md**: Filosofía y mejores prácticas

### Para Operations
- **MONITORING_DASHBOARD.md**: Cómo usar Sentry
- **PRODUCTION_MONITORING.md**: Alertas, runbooks, escalación
- **ERROR_LOG_ANALYSIS.md**: Análisis de logs en terminal

---

## 🔍 Endpoints Disponibles

### Health Checks

```bash
# Estado general
GET /health
Response: { status: "healthy|degraded|unhealthy", ... }

# Base de datos
GET /health/db
Response: { service: "database", status: "healthy", latency: 42ms, ... }

# Redis (si está configurado)
GET /health/redis
Response: { service: "redis", status: "healthy", ... }

# Reportedetallado
GET /health/detailed
Response: { status: "healthy", checks: { server, database, redis }, ... }

# Memoria
GET /health/memory
Response: { memory: { heapUsed, heapTotal, ... } }

# Estado simple (para uptime monitors)
GET /health/status
Response: "OK" (200) o "ERROR" (503)
```

---

## 🛠️ API - Funciones Principales

### Backend Error Classes

```javascript
const {
  AppError,           // Error genérico (500)
  ValidationError,    // Datos inválidos (400)
  DatabaseError,      // Error BD (500)
  AuthenticationError, // No autenticado (401)
  AuthorizationError,  // Sin permisos (403)
  NotFoundError       // No existe (404)
} = require('./monitoring/error-handler');

throw new ValidationError('Email inválido', { field: 'email' });
```

### Backend Logging

```javascript
const { logError, logWarn, logInfo } = require('./monitoring/error-handler');

logError(error, req, { operacion: 'importar_excel' });
logWarn('Inventario bajo', req, { productoId: 123 });
logInfo('Sync completado', { itemsSincronizados: 500 });
```

### Backend Middleware

```javascript
const { asyncHandler } = require('./monitoring/error-handler');

// Envuelve rutas async
router.post('/endpoint', asyncHandler(async (req, res) => {
  // Errores se capturan automáticamente
}));
```

### Frontend Sentry Client

```javascript
import sentryClient from './monitoring/sentry-client';

// Capturar excepción
sentryClient.captureException(error);

// Capturar mensaje
sentryClient.captureMessage('Info importante', 'info');

// Agregar breadcrumb
sentryClient.addBreadcrumb({
  category: 'user-action',
  message: 'Usuario hizo clic en guardar'
});

// Contexto de usuario
sentryClient.setUser({
  id: 'user123',
  email: 'user@example.com'
});

// Ver historial de errores
const history = sentryClient.getErrorHistory();
```

---

## 📊 Flujo de Error

```
┌──────────────────────────────┐
│   Error ocurre en aplicación │
└──────────────┬───────────────┘
               │
        ┌──────▼──────┐
        │ try-catch   │
        │ asyncHandler│
        └──────┬──────┘
               │
        ┌──────▼────────────┐
        │ Error logging     │
        │ (Winston)         │
        └──────┬────────────┘
               │
        ┌──────▼────────────────┐
        │ Sentry capture        │
        │ (Si statusCode >= 500)│
        └──────┬────────────────┘
               │
        ┌──────▼──────────────┐
        │ Error response      │
        │ (JSON al cliente)   │
        └─────────────────────┘
```

---

## 🎯 Casos de Uso Típicos

### 1. Capturar Error en Ruta

```javascript
router.post('/productos', asyncHandler(async (req, res) => {
  if (!req.body.nombre) {
    throw new ValidationError('Nombre requerido');
  }
  // ...
}));
```

### 2. Registrar Operación Importante

```javascript
logInfo('Sincronización iniciada', { userId: 123 });
try {
  await syncGoogleDrive();
} catch (error) {
  logError(error, req, { operacion: 'sync' });
}
```

### 3. Capturar Error en Frontend

```javascript
try {
  const data = await fetch('/api/ventas').then(r => r.json());
} catch (error) {
  sentryClient.captureException(error);
}
```

### 4. Monitorear Performance

```javascript
// Health endpoint retorna latencias
GET /health/detailed
→ latency: { db: 42ms, redis: 8ms }
```

---

## 🚨 Alertas Configuradas

### Automáticas en Sentry

1. **DatabaseError > 5 en 1h**: Slack #errors-critical
2. **5xx errors > 10 en 15min**: Slack @on-call
3. **401 Unauthorized > 20 en 1h**: Posible ataque
4. **Performance: p95 > 5s**: Warning

### Manual en UptimeRobot

- Health check cada 5 minutos
- Alert si /health/status != "OK"

---

## 📈 Métricas Monitoreadas

### Backend
- Error rate (5xx, 4xx)
- Response time (p50, p95, p99)
- Memory usage (heapUsed/heapTotal)
- Database latency
- Request count

### Frontend
- JavaScript errors
- Unhandled promise rejections
- Page performance (LCP, FID, CLS)
- Network errors
- API latency

### Usuarios
- Usuarios afectados por error
- Navegación previo al error (breadcrumbs)
- Contexto: navegador, IP, versión app

---

## 🔧 Configuración Avanzada

### Reducir Ruido de Errores

En `error-handler.js`:

```javascript
const ERROR_CACHE_DURATION = 10 * 60 * 1000; // Deduplicar cada 10 min
// O filtrar ciertos errores:
beforeSend(event) {
  if (event.message.includes('ignored')) return null;
}
```

### Aumentar Detalle de Logs

```javascript
// Desarrollo: DEBUG, Producción: INFO
const level = NODE_ENV === 'production' ? 'info' : 'debug';
```

### Limitar Tamaño de Logs

```bash
# logs/ se rota automáticamente
# - error.log: máx 10MB, 5 archivos
# - combined.log: máx 10MB, 10 archivos
```

---

## 🐛 Troubleshooting

### Los errores no aparecen en Sentry
1. Verificar `SENTRY_DSN` configurado
2. Verificar `NODE_ENV !== 'test'`
3. El error debe ser statusCode >= 500
4. Revisar network tab en DevTools

### Demasiadas alertas
1. Aumentar threshold en Alert Rules
2. Usar `beforeSend` para filtrar
3. Ajustar `ERROR_CACHE_DURATION`

### Logs muy grandes
1. Limpiar logs viejos: `rm logs/*.log.*`
2. Comprimir: `gzip logs/old.log`
3. Configurar logrotate

---

## 📋 Checklist de Producción

### Pre-Deploy
- [ ] Sentry DSN configurado
- [ ] Variables de entorno correctas
- [ ] Health endpoints testados
- [ ] Alertas en Slack configuradas
- [ ] UptimeRobot setup
- [ ] Logs rotate configurado
- [ ] Team capacitado

### Post-Deploy
- [ ] `/health` retorna OK
- [ ] Sentry recibe eventos
- [ ] Alertas funcionan
- [ ] Dashboard visible
- [ ] Runbooks documentados

---

## 📚 Recursos Adicionales

- [Sentry Docs](https://docs.sentry.io/)
- [Winston Logger](https://github.com/winstonjs/winston)
- [Express Error Handling](https://expressjs.com/en/guide/error-handling.html)
- [Sentry React](https://docs.sentry.io/platforms/javascript/guides/react/)

---

## 🎓 Documentación Completa

| Documento | Para | Propósito |
|-----------|------|----------|
| MONITORING_DASHBOARD.md | DevOps | Usar Sentry efectivamente |
| ERROR_LOG_ANALYSIS.md | Developers | Interpretar logs y debuggear |
| ERROR_HANDLING_STRATEGY.md | Architects | Entender filosofía del sistema |
| PRODUCTION_MONITORING.md | On-Call | Alertas, runbooks, escalación |
| MONITORING_INTEGRATION_EXAMPLE.md | Developers | Cómo integrar en código |

---

## 🤝 Soporte

**Dudas sobre monitoreo?** Revisar documentación correspondiente o contactar al equipo.

**Error nuevo?** Abrir issue en GitHub con contexto (navegador, OS, steps to reproduce).

**Mejora sugerida?** Hacer PR con cambios.

---

**Versión**: 1.0.0  
**Última actualización**: Abril 2024  
**Responsable**: Equipo de Desarrollo Maya Autopartes

---

## 🎉 Próximos Pasos

1. ✅ Instalar dependencias
2. ✅ Configurar variables de entorno
3. ✅ Integrar en server.js
4. ✅ Wrappear rutas con asyncHandler
5. ✅ Configurar Sentry
6. ✅ Agregar alertas
7. ✅ Capacitar al equipo
8. ✅ Deploy a producción
9. ✅ Monitoreo 24/7

**Tiempo estimado**: 2-4 horas para integración completa
