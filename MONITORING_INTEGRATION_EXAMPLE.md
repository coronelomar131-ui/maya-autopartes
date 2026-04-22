# Ejemplo de Integración de Monitoreo - Maya Autopartes

## 📚 Ejemplos Prácticos de Cómo Usar el Sistema de Monitoreo

Este documento muestra paso a paso cómo integrar el error handling y monitoreo en tu código existente.

---

## 1. Integración en Backend Server

### ANTES (sin monitoreo):

```javascript
// backend/server.js
const express = require('express');
const app = express();

app.use(express.json());

// Rutas
app.use('/api/v1/ventas', ventasRoutes);

// Error handling básico
app.use((err, req, res, next) => {
  console.error('ERROR:', err);
  res.status(500).json({ error: 'Error interno' });
});

app.listen(5000);
```

### DESPUÉS (con monitoreo):

```javascript
// backend/server.js
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');

const {
  errorHandlingMiddleware,
  notFoundMiddleware,
  requestContextMiddleware,
  setUserContextMiddleware,
  logInfo
} = require('./monitoring/error-handler');

const { createHealthCheckRoutes } = require('./monitoring/healthcheck');
const { responseTimeMiddleware } = require('./monitoring/healthcheck');

const app = express();

// ============================================================================
// MIDDLEWARES DE MONITOREO (PRIMERO)
// ============================================================================

app.use(requestContextMiddleware);      // Agregar transactionId a cada request
app.use(setUserContextMiddleware);      // Agregar contexto de usuario
app.use(responseTimeMiddleware);        // Rastrear latencia de respuestas

// ============================================================================
// MIDDLEWARES ESTÁNDAR
// ============================================================================

app.use(helmet());
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));

// ============================================================================
// RUTAS
// ============================================================================

app.use('/api/v1/ventas', ventasRoutes);
app.use('/api/v1/almacen', almacenRoutes);
// ... otras rutas

// ============================================================================
// HEALTH CHECK ROUTES
// ============================================================================

const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

app.use('/health', createHealthCheckRoutes(supabase));

// ============================================================================
// ERROR HANDLING MIDDLEWARE (AL FINAL)
// ============================================================================

app.use(notFoundMiddleware);            // Manejar 404
app.use(errorHandlingMiddleware);       // Error handler global

// ============================================================================
// INICIAR SERVIDOR
// ============================================================================

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  logInfo('Servidor iniciado', {
    puerto: PORT,
    ambiente: process.env.NODE_ENV
  });
});

// Graceful shutdown con logs
process.on('SIGTERM', () => {
  logInfo('SIGTERM recibido, cerrando gracefully...');
  server.close(() => {
    logInfo('Servidor cerrado');
    process.exit(0);
  });
});
```

---

## 2. Integración en Rutas

### ANTES (sin error handling):

```javascript
// backend/routes/ventas.js
const express = require('express');
const router = express.Router();

router.get('/:id', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('ventas')
      .select('*')
      .eq('id', req.params.id);

    if (error) {
      console.error(error);
      return res.status(500).json({ error: 'Error en BD' });
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error interno' });
  }
});

module.exports = router;
```

### DESPUÉS (con error handling):

```javascript
// backend/routes/ventas.js
const express = require('express');
const router = express.Router();

const {
  asyncHandler,
  ValidationError,
  DatabaseError,
  NotFoundError,
  logInfo,
  logWarn
} = require('../monitoring/error-handler');

/**
 * GET /api/v1/ventas/:id
 * Obtener venta por ID
 */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const ventaId = req.params.id;

    // Validar parámetro
    if (!ventaId || isNaN(ventaId)) {
      throw new ValidationError('ID de venta inválido', {
        parametro: 'id',
        valor: ventaId
      });
    }

    logInfo('Obteniendo venta', {
      ventaId,
      usuarioId: req.user?.id
    });

    // Consultar BD
    const { data, error } = await req.supabase
      .from('ventas')
      .select('*')
      .eq('id', ventaId);

    if (error) {
      throw new DatabaseError(
        `Error al obtener venta ${ventaId}`,
        {
          originalError: error.message,
          supabaseCode: error.code
        }
      );
    }

    // Validar resultado
    if (!data || data.length === 0) {
      throw new NotFoundError('Venta', { ventaId });
    }

    logInfo('Venta obtenida exitosamente', {
      ventaId,
      total: data[0].total
    });

    res.json({
      success: true,
      data: data[0]
    });
  })
);

/**
 * POST /api/v1/ventas
 * Crear nueva venta
 */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { clienteId, productos, total } = req.body;
    const usuarioId = req.user?.id;

    // Validar datos requeridos
    if (!clienteId) {
      throw new ValidationError('clienteId es requerido', {
        campo: 'clienteId'
      });
    }

    if (!Array.isArray(productos) || productos.length === 0) {
      throw new ValidationError('productos debe ser un array no vacío', {
        campo: 'productos'
      });
    }

    if (!total || total <= 0) {
      throw new ValidationError('total debe ser mayor a 0', {
        campo: 'total',
        valor: total
      });
    }

    logInfo('Creando nueva venta', {
      clienteId,
      productosCount: productos.length,
      total,
      usuarioId
    });

    // Insertar en BD
    const { data, error } = await req.supabase
      .from('ventas')
      .insert([{
        cliente_id: clienteId,
        usuario_id: usuarioId,
        total,
        fecha: new Date().toISOString(),
        productos: JSON.stringify(productos)
      }])
      .select();

    if (error) {
      throw new DatabaseError(
        'Error al crear venta',
        {
          originalError: error.message,
          clienteId,
          productosCount: productos.length
        }
      );
    }

    logInfo('Venta creada exitosamente', {
      ventaId: data[0]?.id,
      total
    });

    res.status(201).json({
      success: true,
      data: data[0]
    });
  })
);

module.exports = router;
```

---

## 3. Integración en Frontend

### ANTES (sin Sentry):

```javascript
// frontend/components/ProductForm.js
import React, { useState } from 'react';

export default function ProductForm() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData(event.target);
      const response = await fetch('/api/v1/productos', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        alert('Error al guardar producto');
        return;
      }

      alert('Producto guardado!');
      event.target.reset();
    } catch (error) {
      console.error(error);
      alert('Error desconocido');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Guardando...' : 'Guardar'}
      </button>
    </form>
  );
}
```

### DESPUÉS (con Sentry):

```javascript
// frontend/components/ProductForm.js
import React, { useState } from 'react';
import sentryClient from '../monitoring/sentry-client';

export default function ProductForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError(null);

    // Registrar acción del usuario
    sentryClient.addBreadcrumb({
      category: 'user-action',
      level: 'info',
      message: 'Usuario enviando formulario de producto'
    });

    try {
      const formData = new FormData(event.target);
      const nombre = formData.get('nombre');
      const precio = formData.get('precio');

      // Validar datos en frontend
      if (!nombre || nombre.trim().length < 3) {
        throw new Error('El nombre debe tener al menos 3 caracteres');
      }

      if (!precio || parseFloat(precio) <= 0) {
        throw new Error('El precio debe ser mayor a 0');
      }

      sentryClient.addBreadcrumb({
        category: 'validation',
        level: 'info',
        message: 'Validación de formulario completada',
        data: { nombre, precio }
      });

      // Hacer request
      sentryClient.addBreadcrumb({
        category: 'api-call',
        level: 'info',
        message: 'POST /api/v1/productos iniciado'
      });

      const response = await fetch('/api/v1/productos', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ nombre, precio })
      });

      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.error?.message || 'Error al guardar';

        throw new Error(errorMessage);
      }

      const data = await response.json();

      // Éxito
      sentryClient.captureMessage(
        `Producto guardado exitosamente: ${nombre}`,
        'info'
      );

      setError(null);
      event.target.reset();

      // Mostrar mensaje de éxito
      alert(`Producto "${nombre}" guardado exitosamente!`);

    } catch (err) {
      const errorMessage = err.message || 'Error desconocido';

      // Capturar en Sentry
      sentryClient.captureException(err, {
        tags: {
          component: 'ProductForm',
          action: 'submit'
        },
        contexts: {
          form: {
            method: 'POST',
            endpoint: '/api/v1/productos'
          }
        }
      });

      setError(errorMessage);
      console.error('Error:', err);

    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="product-form">
      <div>
        <label>Nombre del Producto:</label>
        <input
          type="text"
          name="nombre"
          required
          minLength={3}
        />
      </div>

      <div>
        <label>Precio:</label>
        <input
          type="number"
          name="precio"
          required
          min={0.01}
          step={0.01}
        />
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      <button type="submit" disabled={loading}>
        {loading ? 'Guardando...' : 'Guardar Producto'}
      </button>
    </form>
  );
}
```

---

## 4. Integración en API Calls

### Crear un Helper de API Reusable

```javascript
// frontend/utils/api.js
import sentryClient from '../monitoring/sentry-client';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

/**
 * Wrapper para fetch con error handling y logging
 */
export async function apiCall(endpoint, options = {}) {
  const startTime = Date.now();

  const finalOptions = {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  };

  const fullUrl = `${API_BASE_URL}${endpoint}`;

  // Registrar breadcrumb
  sentryClient.addBreadcrumb({
    category: 'api-call',
    level: 'info',
    message: `${finalOptions.method} ${endpoint}`,
    data: {
      method: finalOptions.method,
      url: endpoint
    }
  });

  try {
    const response = await fetch(fullUrl, finalOptions);
    const latency = Date.now() - startTime;

    // Registrar latencia
    if (latency > 2000) {
      sentryClient.addBreadcrumb({
        category: 'performance',
        level: 'warning',
        message: `API call lento: ${endpoint}`,
        data: { latency: `${latency}ms` }
      });
    }

    // Manejar errores de autenticación
    if (response.status === 401) {
      localStorage.clear();
      window.location.href = '/login';
      throw new Error('Sesión expirada');
    }

    // Manejar errores del servidor
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(
        errorData?.error?.message || `HTTP ${response.status}`
      );
      error.status = response.status;
      error.data = errorData;

      throw error;
    }

    const data = await response.json();

    // Log de éxito
    sentryClient.addBreadcrumb({
      category: 'api-call-success',
      level: 'info',
      message: `${finalOptions.method} ${endpoint} exitoso`,
      data: { latency: `${latency}ms` }
    });

    return data;

  } catch (error) {
    const latency = Date.now() - startTime;

    // Capturar en Sentry
    sentryClient.captureException(error, {
      tags: {
        apiEndpoint: endpoint,
        method: finalOptions.method,
        latency: `${latency}ms`
      },
      contexts: {
        api: {
          endpoint,
          method: finalOptions.method,
          latency: `${latency}ms`,
          status: error.status
        }
      }
    });

    throw error;
  }
}

// Uso:
export const api = {
  getProductos: () => apiCall('/api/v1/productos'),
  getProducto: (id) => apiCall(`/api/v1/productos/${id}`),
  createProducto: (data) => apiCall('/api/v1/productos', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateProducto: (id, data) => apiCall(`/api/v1/productos/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteProducto: (id) => apiCall(`/api/v1/productos/${id}`, {
    method: 'DELETE'
  })
};
```

### Usar el Helper

```javascript
// En componentes
import { api } from '../utils/api';
import sentryClient from '../monitoring/sentry-client';

export default function ProductList() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProductos();
  }, []);

  const loadProductos = async () => {
    try {
      sentryClient.addBreadcrumb({
        category: 'user-action',
        message: 'Usuario viendo lista de productos'
      });

      const data = await api.getProductos();
      setProductos(data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
      // Error ya fue capturado por api.js
    } finally {
      setLoading(false);
    }
  };

  // ... Rest of component
}
```

---

## 5. Testing con Monitoreo

### Test de Error Handling

```javascript
// backend/tests/error-handler.test.js
const request = require('supertest');
const { app } = require('../server');
const { ValidationError } = require('../monitoring/error-handler');

describe('Error Handling Middleware', () => {
  it('debería manejar ValidationError correctamente', async () => {
    const response = await request(app)
      .post('/api/v1/ventas')
      .send({}) // Datos incompletos

      .expect(400);

    expect(response.body).toHaveProperty('success', false);
    expect(response.body.error.type).toBe('ValidationError');
  });

  it('debería retornar 404 para rutas inexistentes', async () => {
    const response = await request(app)
      .get('/api/v1/ruta-inexistente')
      .expect(404);

    expect(response.body.error.type).toBe('NotFoundError');
  });

  it('debería incluir transactionId en respuesta', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);

    // El transactionId está en el middleware
    expect(response).toBeDefined();
  });
});
```

---

## 6. Monitorear Operación Crítica

### Sync de Google Drive

```javascript
// backend/routes/sync.js
const {
  asyncHandler,
  AppError,
  logInfo,
  logError,
  logWarn
} = require('../monitoring/error-handler');

router.post(
  '/google-drive',
  asyncHandler(async (req, res) => {
    const userId = req.user.id;
    const startTime = Date.now();

    logInfo('Iniciando sincronización con Google Drive', {
      userId,
      timestamp: new Date().toISOString()
    });

    try {
      // 1. Validar credenciales
      const credentials = await getGoogleCredentials(userId);
      if (!credentials) {
        throw new AppError(
          'No se encontraron credenciales de Google Drive',
          401
        );
      }

      logInfo('Credenciales validadas', { userId });

      // 2. Conectar a Google Drive
      const drive = await connectGoogleDrive(credentials);

      logInfo('Conectado a Google Drive', { userId });

      // 3. Obtener archivos
      const files = await drive.getFiles();
      logInfo('Archivos obtenidos', {
        userId,
        count: files.length
      });

      // 4. Procesar cada archivo
      let processedCount = 0;
      let errorCount = 0;

      for (const file of files) {
        try {
          await processFile(file, req.supabase);
          processedCount++;
        } catch (fileError) {
          errorCount++;
          logWarn(`Error procesando archivo: ${file.name}`, req, {
            fileName: file.name,
            error: fileError.message,
            userId
          });
        }
      }

      const duration = Date.now() - startTime;

      logInfo('Sincronización completada', {
        userId,
        processedCount,
        errorCount,
        duration: `${duration}ms`,
        status: errorCount === 0 ? 'success' : 'partial'
      });

      res.json({
        success: true,
        message: `${processedCount} archivos sincronizados, ${errorCount} errores`,
        stats: {
          processed: processedCount,
          errors: errorCount,
          duration: `${duration}ms`
        }
      });

    } catch (error) {
      const duration = Date.now() - startTime;

      logError(error, req, {
        operacion: 'sync_google_drive',
        userId,
        duracionIntento: `${duration}ms`,
        etapa: error.etapa || 'desconocida'
      });

      throw error;
    }
  })
);
```

---

## 7. Verificar Implementación

### Checklist

```bash
# 1. Directorios creados
ls -la backend/monitoring/
ls -la frontend/monitoring/
ls -la logs/  # Será creado automáticamente

# 2. Archivos presentes
test -f backend/monitoring/error-handler.js && echo "✓ error-handler.js"
test -f backend/monitoring/healthcheck.js && echo "✓ healthcheck.js"
test -f frontend/monitoring/sentry-client.js && echo "✓ sentry-client.js"

# 3. Dependencias instaladas
npm list winston  # Backend
npm list @sentry/node  # Backend
npm list @sentry/react  # Frontend

# 4. Health check funciona
curl http://localhost:5000/health
# {
#   "status": "healthy",
#   "timestamp": "2024-04-22T14:30:00Z",
#   "database": "healthy"
# }

# 5. Logs se crean
tail logs/combined.log
tail logs/error.log
```

---

**Última actualización**: Abril 2024
**Versión**: 1.0.0
