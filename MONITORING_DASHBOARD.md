# Dashboard de Monitoreo - Maya Autopartes

## 📊 Guía de Sentry para Producción

Este documento explica cómo configurar, usar y monitorear errores en producción usando Sentry.

---

## 1. Configuración Inicial de Sentry

### 1.1 Crear Cuenta y Proyecto en Sentry

1. Ir a [sentry.io](https://sentry.io)
2. Crear una cuenta (o usar cuenta existente)
3. Crear un nuevo proyecto:
   - **Plataforma**: Node.js (Backend)
   - **Nombre**: maya-autopartes-backend
   - **Equipo**: Tu equipo

4. Crear segundo proyecto:
   - **Plataforma**: React (Frontend)
   - **Nombre**: maya-autopartes-frontend

### 1.2 Obtener DSN

- **Backend DSN**: `https://<key>@<domain>.ingest.sentry.io/<projectId>`
- **Frontend DSN**: Similar al anterior

Guardar estos en variables de entorno:
```bash
# Backend .env
SENTRY_DSN=https://<backend-key>@<domain>.ingest.sentry.io/<backend-projectId>

# Frontend .env
REACT_APP_SENTRY_DSN=https://<frontend-key>@<domain>.ingest.sentry.io/<frontend-projectId>
```

---

## 2. Instalación de Dependencias

### Backend
```bash
cd backend
npm install @sentry/node winston
```

### Frontend
```bash
cd frontend
npm install @sentry/react
```

---

## 3. Integración en Backend

### 3.1 Usar Error Handler Middleware

En `backend/server.js`:

```javascript
const {
  errorHandlingMiddleware,
  notFoundMiddleware,
  requestContextMiddleware,
  setUserContextMiddleware,
  asyncHandler,
  logError,
  logInfo
} = require('./monitoring/error-handler');
const { createHealthCheckRoutes } = require('./monitoring/healthcheck');

// Agregar middlewares ANTES de las rutas
app.use(requestContextMiddleware);      // ID de transacción
app.use(setUserContextMiddleware);      // Contexto de usuario

// Rutas...
app.use('/api/v1/ventas', ventasRoutes);
// etc...

// Health check routes
app.use('/health', createHealthCheckRoutes(supabase));

// Error handling DESPUÉS de las rutas
app.use(notFoundMiddleware);
app.use(errorHandlingMiddleware);
```

### 3.2 Usar asyncHandler en Rutas

En cualquier ruta async:

```javascript
const { asyncHandler, ValidationError, DatabaseError } = require('../monitoring/error-handler');

router.get('/productos', asyncHandler(async (req, res) => {
  const { data, error } = await req.supabase
    .from('productos')
    .select('*');

  if (error) {
    throw new DatabaseError('Error al obtener productos', { original: error });
  }

  res.json(data);
}));
```

### 3.3 Logging Manual

```javascript
const { logError, logWarn, logInfo } = require('./monitoring/error-handler');

// Registrar error
logError(new Error('Algo salió mal'), req, { 
  operacion: 'actualizar_inventario',
  productoId: 123 
});

// Registrar advertencia
logWarn('Inventario bajo detectado', req, {
  productoId: 456,
  cantidad: 5
});

// Registrar información
logInfo('Sincronización completada', {
  itemsSincronizados: 1500,
  duracion: '2.5s'
});
```

---

## 4. Integración en Frontend

### 4.1 Inicializar Sentry en Entrada Principal

En `frontend/index.js` (o equivalente):

```javascript
import sentryClient from './monitoring/sentry-client';

// Inicializar Sentry
sentryClient.init();

// Si tienes autenticación
auth.onAuthStateChanged((user) => {
  if (user) {
    sentryClient.setUser({
      id: user.uid,
      email: user.email,
      username: user.displayName
    });
  } else {
    sentryClient.clearUser();
  }
});
```

### 4.2 Capturar Errores en Componentes

```javascript
import sentryClient from '../monitoring/sentry-client';

function MyComponent() {
  const handleClick = async () => {
    try {
      // Tu código
      const response = await fetch('/api/v1/ventas');
    } catch (error) {
      sentryClient.captureException(error, {
        contexts: {
          component: {
            name: 'MyComponent',
            action: 'handleClick'
          }
        }
      });
    }
  };

  return <button onClick={handleClick}>Click</button>;
}
```

### 4.3 Agregar Breadcrumbs

```javascript
// Registrar navegación del usuario
sentryClient.addBreadcrumb({
  category: 'user-action',
  level: 'info',
  message: 'Usuario hizo clic en botón de guardado',
  data: {
    button: 'save',
    form: 'product-form'
  }
});

// Registrar eventos importantes
sentryClient.addBreadcrumb({
  category: 'api-call',
  level: 'info',
  message: 'Llamada a API de sincronización',
  data: {
    endpoint: '/api/v1/sync',
    method: 'POST'
  }
});
```

---

## 5. Endpoints de Health Check

### 5.1 Health Check Básico
```bash
GET /health
```

Response (200 OK):
```json
{
  "status": "healthy",
  "timestamp": "2024-04-22T12:30:00Z",
  "uptime": 3600,
  "environment": "production",
  "database": "healthy",
  "latency": {
    "db": 45
  }
}
```

### 5.2 Verificar Base de Datos
```bash
GET /health/db
```

Response:
```json
{
  "service": "database",
  "status": "healthy",
  "connected": true,
  "latency": 42,
  "timestamp": "2024-04-22T12:30:00Z"
}
```

### 5.3 Reporte Detallado
```bash
GET /health/detailed
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-04-22T12:30:00Z",
  "uptime": {
    "ms": 3600000,
    "seconds": 3600,
    "minutes": 60,
    "hours": 1
  },
  "checks": {
    "server": {
      "status": "healthy",
      "uptime": 3600,
      "memory": {
        "used": 150,
        "total": 512
      }
    },
    "database": {
      "status": "healthy",
      "connected": true,
      "latency": 42
    }
  }
}
```

### 5.4 Estado Simple (Para Monitoreo)
```bash
GET /health/status
```

Response (200 OK):
```
OK
```

---

## 6. Dashboard de Sentry

### 6.1 Elementos Principales

**Issues**: Problemas agrupados automáticamente
- Haz clic en un issue para ver todos los eventos
- Revisa el stack trace y breadcrumbs
- Asigna a equipo miembro
- Marca como "Resolved" cuando se corrija

**Releases**: Seguimiento de versiones
- Tags automáticos por versión de código
- Relaciona errores con commits específicos
- Marca releases como "Deployed"

**Performance**: Monitoreo de rendimiento
- Transacciones lentas
- Latencia por endpoint
- Uso de recursos

**Alerts**: Alertas automáticas
- Configura alertas por umbral de errores
- Integra con Slack, Email, etc.
- Define criterios personalizados

### 6.2 Análisis de Errores

1. **Issues Page**:
   - Número de ocurrencias
   - Usuarios afectados
   - Primero/último visto
   - Sesiones involucradas

2. **Event Details**:
   - Breadcrumbs (acciones previas)
   - Contexto de usuario
   - Stack trace completo
   - Tags y valores personalizados

3. **Performance Metrics**:
   - Tiempo de respuesta por endpoint
   - Errores por ubicación
   - Transacciones lentas

---

## 7. Filtración y Tags Personalizados

### 7.1 Tags Predefinidos

El sistema automáticamente incluye:
```javascript
{
  environment: 'production',
  statusCode: 500,
  errorType: 'DatabaseError',
  userId: 'user123',
  release: '1.0.0'
}
```

### 7.2 Tags Personalizados

En el backend:
```javascript
const { logError } = require('./monitoring/error-handler');

try {
  // Tu código
} catch (error) {
  logError(error, req, {
    operacion: 'importar_excel',
    archivoNombre: 'productos.xlsx',
    archivoTamano: 2.5 // MB
  });
}
```

En el frontend:
```javascript
sentryClient.setTag('feature', 'inventory-management');
sentryClient.setTag('page', 'products-list');
```

---

## 8. Configuración de Alertas

### 8.1 Alert Rules (En Sentry Dashboard)

1. **Alert por Tasa de Errores**:
   - Condición: `events >= 10 in 1h`
   - Acción: Enviar email/Slack

2. **Alert por Error Crítico**:
   - Filtro: `error.statusCode == 500`
   - Acción: Notificación inmediata

3. **Alert por Performance**:
   - Condición: `p95(transaction.duration) > 5s`
   - Acción: Slack notification

### 8.2 Integración Slack

En Sentry:
1. Settings → Integrations → Slack
2. Conectar workspace
3. Seleccionar canal (#errors)
4. Configurar alert rules

---

## 9. Best Practices

### ✅ Hacer

- ✅ Capturar errores en puntos críticos
- ✅ Incluir contexto útil en cada error
- ✅ Usar breadcrumbs para rastrear acciones
- ✅ Agrupar errores relacionados
- ✅ Resolver issues cuando se corrija el bug
- ✅ Revisar alertas regularmente
- ✅ Mantener sensitive data fuera de logs

### ❌ No Hacer

- ❌ Capturar TODOS los errores (flood)
- ❌ Incluir tokens/contraseñas en logs
- ❌ Ignorar alertas de errores críticos
- ❌ Dejar issues sin asignar
- ❌ Cambiar DSN en producción sin documentar

---

## 10. Ejemplo Completo: Capturar Error en Sync de Google Drive

```javascript
// Backend
const { asyncHandler, AppError } = require('./monitoring/error-handler');
const { logError, logInfo } = require('./monitoring/error-handler');

router.post('/sync-google-drive', asyncHandler(async (req, res) => {
  const startTime = Date.now();
  const userId = req.user.id;

  logInfo('Iniciando sincronización con Google Drive', {
    userId,
    timestamp: new Date().toISOString()
  });

  try {
    const googleDriveService = require('../api/google-drive-sync');
    const result = await googleDriveService.syncInventory(req.supabase, req.user);

    const duration = Date.now() - startTime;

    logInfo('Sincronización completada exitosamente', {
      userId,
      itemsSincronizados: result.count,
      duracion: `${duration}ms`
    });

    res.json({
      success: true,
      message: `${result.count} items sincronizados`,
      duration
    });
  } catch (error) {
    logError(error, req, {
      operacion: 'sincronizar_google_drive',
      userId,
      duracionIntento: `${Date.now() - startTime}ms`
    });

    throw new AppError(
      'Error al sincronizar con Google Drive',
      500,
      { originalError: error.message }
    );
  }
}));

// Frontend
import sentryClient from '../monitoring/sentry-client';

function SyncButton() {
  const [syncing, setSyncing] = useState(false);

  const handleSync = async () => {
    setSyncing(true);
    sentryClient.addBreadcrumb({
      category: 'user-action',
      level: 'info',
      message: 'Usuario inició sincronización con Google Drive'
    });

    try {
      const response = await fetch('/api/v1/sync-google-drive', {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      sentryClient.captureMessage('Sincronización exitosa', 'info');
      // Mostrar éxito al usuario
    } catch (error) {
      sentryClient.captureException(error, {
        contexts: {
          component: {
            action: 'handleSync'
          }
        }
      });
      // Mostrar error al usuario
    } finally {
      setSyncing(false);
    }
  };

  return (
    <button onClick={handleSync} disabled={syncing}>
      {syncing ? 'Sincronizando...' : 'Sincronizar'}
    </button>
  );
}
```

---

## 11. Troubleshooting

### Los errores no aparecen en Sentry
- ✓ Verificar DSN configurado correctamente
- ✓ Revisar que `NODE_ENV !== 'test'`
- ✓ Confirmar que error.statusCode >= 500
- ✓ Verificar network tab en DevTools

### Demasiadas alertas
- ✓ Ajustar thresholds en Alert Rules
- ✓ Filtrar errores de desarrollo
- ✓ Usar `beforeSend` para descartar ciertos errores

### Performance degradado
- ✓ Reducir `tracesSampleRate`
- ✓ No capturar breadcrumbs de consola
- ✓ Limitar número de breadcrumbs

---

## 12. Contacto y Soporte

- **Documentación Sentry**: https://docs.sentry.io/
- **API Docs**: https://docs.sentry.io/api/
- **Community**: https://forum.sentry.io/

---

**Última actualización**: Abril 2024
**Versión**: 1.0.0
