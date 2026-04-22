# Estrategia de Error Handling - Maya Autopartes

## 🎯 Filosofía General

Un sistema robusto de error handling debe:
1. **Prevenir** errores antes de que ocurran (validación)
2. **Detectar** errores rápidamente (logging)
3. **Recuperarse** cuando sea posible (retry)
4. **Informar** al usuario apropiadamente
5. **Aprender** de los errores (análisis)

---

## 1. Arquitectura de Error Handling

### 1.1 Capas de Defensa

```
┌─────────────────────────────────────────────────────────┐
│                    USUARIO (Frontend)                    │
├─────────────────────────────────────────────────────────┤
│  Error Boundary React / Try-Catch / Sentry Client       │
├─────────────────────────────────────────────────────────┤
│                   COMUNICACIÓN (HTTP)                    │
│  Status Codes / Error Responses / Headers                │
├─────────────────────────────────────────────────────────┤
│  Request Validation / Middleware / asyncHandler          │
│                    BACKEND (Express)                      │
│  Route Handlers / Error Classes / Logging                │
├─────────────────────────────────────────────────────────┤
│            Base de Datos (Supabase)                      │
│  Connection Pool / Query Errors / Retry Logic            │
└─────────────────────────────────────────────────────────┘
```

### 1.2 Componentes Clave

| Componente | Ubicación | Responsabilidad |
|-----------|-----------|-----------------|
| **Error Classes** | `backend/monitoring/error-handler.js` | Tipificación de errores |
| **asyncHandler** | `backend/monitoring/error-handler.js` | Wrapping de rutas async |
| **Middleware** | `backend/monitoring/error-handler.js` | Procesamiento global |
| **Logging** | `backend/monitoring/error-handler.js` | Persistencia de logs |
| **Sentry (Backend)** | `backend/monitoring/error-handler.js` | Reporte remoto |
| **Sentry (Frontend)** | `frontend/monitoring/sentry-client.js` | Reporte de errores UI |
| **Health Check** | `backend/monitoring/healthcheck.js` | Monitoreo de servicios |

---

## 2. Categorías de Errores

### 2.1 Errores de Validación (4xx)

```javascript
// Cuando: Datos inválidos del usuario
// Código HTTP: 400-422
// Acción: Mostrar mensaje al usuario

throw new ValidationError('Email inválido', {
  field: 'email',
  value: 'not-an-email',
  expectedFormat: 'email@domain.com'
});

// Response:
{
  "success": false,
  "error": {
    "type": "ValidationError",
    "message": "Email inválido",
    "statusCode": 400
  }
}
```

### 2.2 Errores de Autenticación (401)

```javascript
// Cuando: Token expirado, inválido o no presente
// Código HTTP: 401
// Acción: Redirigir a login

throw new AuthenticationError('Token expirado');

// Frontend handling:
if (error.statusCode === 401) {
  localStorage.clear();
  window.location.href = '/login';
}
```

### 2.3 Errores de Autorización (403)

```javascript
// Cuando: Usuario sin permisos
// Código HTTP: 403
// Acción: Mostrar "Acceso denegado"

if (!user.hasRole('admin')) {
  throw new AuthorizationError('Se requiere rol Admin');
}

// Response:
{
  "success": false,
  "error": {
    "type": "AuthorizationError",
    "message": "Acceso denegado",
    "statusCode": 403
  }
}
```

### 2.4 Errores de Recurso (404)

```javascript
// Cuando: Recurso no existe
// Código HTTP: 404
// Acción: Mostrar "No encontrado"

const producto = await supabase
  .from('productos')
  .select('*')
  .eq('id', id);

if (!producto.data || producto.data.length === 0) {
  throw new NotFoundError('Producto', { id });
}
```

### 2.5 Errores de Base de Datos (5xx)

```javascript
// Cuando: Falla conexión, query inválida, etc
// Código HTTP: 500-503
// Acción: Reintento automático, log detallado

try {
  const { data, error } = await supabase
    .from('productos')
    .select('*');
  
  if (error) {
    throw new DatabaseError('Error al obtener productos', {
      originalError: error.message,
      code: error.code
    });
  }
} catch (error) {
  logError(error, req, { operacion: 'listar_productos' });
  // Reintento automático via retry middleware
}
```

### 2.6 Errores de Servidor (5xx)

```javascript
// Cuando: Error inesperado, bug en código
// Código HTTP: 500
// Acción: Log + Sentry + respuesta genérica

try {
  // Tu código que puede fallar
  await procesarArchivo(archivo);
} catch (error) {
  throw new AppError(
    'Error al procesar archivo',
    500,
    { archivo: archivo.name, tamaño: archivo.size }
  );
}
```

---

## 3. Flujo de Error en Backend

### 3.1 Captura y Propagación

```javascript
// 1. En una ruta
router.post('/productos', asyncHandler(async (req, res) => {
  // 2. asyncHandler captura automáticamente errores
  // 3. Errores se pasan al middleware error handler
  
  const { nombre, precio } = req.body;
  
  // 4. Validación manual
  if (!nombre || !precio) {
    throw new ValidationError('Campo requerido faltante');
  }
  
  // 5. Operación que puede fallar
  try {
    const { data, error } = await req.supabase
      .from('productos')
      .insert([{ nombre, precio }]);
    
    if (error) {
      throw new DatabaseError(error.message);
    }
    
    res.json({ success: true, data });
  } catch (error) {
    // 6. asyncHandler captura y pasa a error middleware
    throw error;
  }
}));

// 7. Middleware de error (order importante)
app.use(errorHandlingMiddleware); // Último en la cadena
```

### 3.2 Logging en Capas

```javascript
// Layer 1: Request context
app.use(requestContextMiddleware); // Agrega transactionId

// Layer 2: Operación específica
logInfo('Iniciando importación de Excel', {
  archivo: 'productos.xlsx',
  usuario: req.user.id
});

// Layer 3: Error capturado
logError(error, req, {
  operacion: 'importar_excel',
  etapa: 'validacion',
  linea: error.lineNumber
});

// Resultado en logs/
// {
//   transactionId: "1713872445000-a7f2k9m1",
//   timestamp: "2024-04-22 14:30:45",
//   level: "error",
//   message: "Application Error",
//   context: {
//     operacion: "importar_excel",
//     etapa: "validacion"
//   }
// }
```

---

## 4. Flujo de Error en Frontend

### 4.1 Error Boundary (React)

```javascript
import React from 'react';
import sentryClient from '../monitoring/sentry-client';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to Sentry
    sentryClient.captureException(error, {
      contexts: {
        react: {
          componentStack: errorInfo.componentStack
        }
      }
    });

    // Log locally
    console.error('Error capturado:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h1>Algo salió mal</h1>
          <p>Por favor, actualiza la página</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

### 4.2 Try-Catch en Async Functions

```javascript
async function handleImportExcel(file) {
  sentryClient.addBreadcrumb({
    category: 'user-action',
    message: `Usuario seleccionó archivo: ${file.name}`
  });

  try {
    // Validar archivo
    if (file.size > 10 * 1024 * 1024) {
      throw new Error('Archivo demasiado grande (máx 10MB)');
    }

    // Hacer request
    sentryClient.addBreadcrumb({
      category: 'api-call',
      message: 'Iniciando importación al servidor'
    });

    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/v1/import-excel', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Success
    sentryClient.captureMessage(
      `Importación exitosa: ${data.count} items`,
      'info'
    );

    return data;
  } catch (error) {
    // Capturar error
    sentryClient.captureException(error, {
      contexts: {
        component: {
          action: 'handleImportExcel',
          fileName: file.name
        }
      }
    });

    // Mostrar al usuario
    showErrorNotification(error.message);

    return null;
  }
}
```

### 4.3 Manejo de Errores de API

```javascript
async function apiCall(endpoint, options = {}) {
  const startTime = Date.now();

  try {
    const response = await fetch(endpoint, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    // Rastrear latencia
    const latency = Date.now() - startTime;
    if (latency > 3000) {
      sentryClient.addBreadcrumb({
        category: 'performance',
        level: 'warning',
        message: `API call lento: ${endpoint}`,
        data: { latency: `${latency}ms` }
      });
    }

    // Manejar status codes
    if (response.status === 401) {
      // Token expirado
      localStorage.clear();
      window.location.href = '/login';
      return null;
    }

    if (response.status === 403) {
      throw new Error('No tiene permisos para esta acción');
    }

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Error desconocido');
    }

    return await response.json();
  } catch (error) {
    sentryClient.captureException(error, {
      tags: {
        endpoint,
        latency: Date.now() - startTime
      }
    });

    throw error;
  }
}
```

---

## 5. Estrategia de Retry

### 5.1 Retry Automático en Backend

```javascript
/**
 * Reintentar operación con backoff exponencial
 */
async function retryOperation(
  fn,
  maxRetries = 3,
  initialDelay = 1000
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      // Errores que no deberían reintentar
      if (error.statusCode === 400 || error.statusCode === 401) {
        throw error;
      }

      // Backoff exponencial: 1s, 2s, 4s
      const delay = initialDelay * Math.pow(2, attempt - 1);

      logWarn(`Reintentando operación (intento ${attempt}/${maxRetries})`, null, {
        delay,
        error: error.message
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Usar:
router.post('/productos', asyncHandler(async (req, res) => {
  const result = await retryOperation(() =>
    req.supabase
      .from('productos')
      .insert([req.body])
  );

  res.json(result);
}));
```

### 5.2 Retry en Frontend

```javascript
/**
 * Reintentar fetch con jitter aleatorio
 */
async function fetchWithRetry(
  url,
  options = {},
  maxRetries = 3
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      // No reintentar si es error de cliente
      if (response.status >= 400 && response.status < 500) {
        return response;
      }

      if (response.ok) {
        return response;
      }

      // Reintentar si es error de servidor
      if (attempt < maxRetries) {
        const delay = 1000 * Math.pow(2, attempt - 1) +
                     Math.random() * 1000;

        await new Promise(r => setTimeout(r, delay));
      }
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const delay = 1000 * Math.pow(2, attempt - 1) +
                   Math.random() * 1000;

      await new Promise(r => setTimeout(r, delay));
    }
  }

  throw new Error(`Failed after ${maxRetries} retries`);
}
```

---

## 6. Errores Específicos por Módulo

### 6.1 Errores de Sincronización Google Drive

```javascript
// backend/api/google-drive-sync.js

try {
  const client = authorize();
  // Error posible: credenciales inválidas
} catch (error) {
  if (error.message.includes('unauthorized')) {
    throw new AuthenticationError(
      'Google Drive: Credenciales inválidas',
      { module: 'google-drive' }
    );
  }
  throw new AppError('Error de Google Drive', 503);
}

try {
  const files = await drive.files.list();
  // Error posible: rate limit
} catch (error) {
  if (error.code === 403) {
    throw new AppError(
      'Límite de API alcanzado, reintentar en 60s',
      429
    );
  }
}
```

### 6.2 Errores de Mapeo Excel

```javascript
// backend/api/excel-mapper.js

try {
  const headers = worksheet.row(1).values;
  
  // Validar que existe formato esperado
  if (!headers.includes('CODIGO')) {
    throw new ValidationError(
      'Formato de Excel inválido',
      { missingColumn: 'CODIGO' }
    );
  }

  // Procesar filas
  for (let i = 2; i <= rowCount; i++) {
    try {
      const row = worksheet.row(i).values;
      validateRow(row); // Puede fallar
    } catch (error) {
      throw new ValidationError(
        `Error en fila ${i}: ${error.message}`,
        { fila: i, datos: row }
      );
    }
  }
} catch (error) {
  logError(error, null, { archivo: filename });
  throw error;
}
```

### 6.3 Errores de Mercado Libre

```javascript
// backend/api/meli-sync.js

try {
  const token = getAccessToken();
  // Error posible: token expirado
} catch (error) {
  if (error.includes('expired')) {
    // Refrescar token automáticamente
    const newToken = await refreshAccessToken();
    setAccessToken(newToken);
  }
}

try {
  const listings = await meli.getListings();
} catch (error) {
  if (error.status === 401) {
    throw new AuthenticationError('Mercado Libre: Acceso denegado');
  }
  if (error.status === 429) {
    throw new AppError('Rate limit de Mercado Libre', 429);
  }
}
```

---

## 7. Testing de Error Handling

### 7.1 Test Unitarios

```javascript
// backend/tests/error-handler.test.js

describe('Error Handler', () => {
  it('debería capturar ValidationError', async () => {
    const error = new ValidationError('Inválido', { field: 'email' });
    expect(error.statusCode).toBe(400);
    expect(error.name).toBe('ValidationError');
  });

  it('debería aplicar asyncHandler', async () => {
    const fn = asyncHandler(async (req, res) => {
      throw new Error('Test error');
    });

    const mockReq = {};
    const mockRes = {};
    const mockNext = jest.fn();

    await fn(mockReq, mockRes, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});
```

### 7.2 Test de Integración

```javascript
// backend/tests/api.integration.test.js

describe('API Endpoints - Error Handling', () => {
  it('debería retornar 404 para producto no existe', async () => {
    const response = await request(app)
      .get('/api/v1/productos/999999')
      .expect(404);

    expect(response.body.error.type).toBe('NotFoundError');
  });

  it('debería retornar 400 para datos inválidos', async () => {
    const response = await request(app)
      .post('/api/v1/productos')
      .send({ nombre: '' }) // Falta precio
      .expect(400);

    expect(response.body.error.type).toBe('ValidationError');
  });
});
```

---

## 8. Checklist de Implementación

- [ ] Instalar Winston en backend
- [ ] Instalar Sentry en backend y frontend
- [ ] Crear directorio `logs/`
- [ ] Integrar error-handler.js en server.js
- [ ] Integrar healthcheck routes
- [ ] Wrappear todas las rutas async con asyncHandler
- [ ] Configurar error classes en todas las rutas
- [ ] Inicializar Sentry en frontend
- [ ] Agregar Error Boundary en React
- [ ] Configurar alertas en Sentry
- [ ] Documentar errores por módulo
- [ ] Setup monitoreo en producción

---

## 9. Monitoreo en Producción

### Diario
- [ ] Revisar Sentry Issues
- [ ] Verificar /health endpoints
- [ ] Revisar alertas de error

### Semanal
- [ ] Analizar trends de errores
- [ ] Revisar performance metrics
- [ ] Actualizar thresholds de alertas

### Mensual
- [ ] Generar reporte de confiabilidad
- [ ] Planificar mejoras
- [ ] Revisar y limpiar logs

---

**Última actualización**: Abril 2024
**Versión**: 1.0.0
