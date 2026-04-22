# Guía de Integración de Audit Trail

## Cómo integrar el sistema de auditoría en rutas existentes

Este documento muestra ejemplos de cómo agregar auto-logging a las rutas API existentes.

---

## 🔧 Configuración Inicial

### Paso 1: Importar AuditLogger en server.js

```javascript
// backend/server.js

const express = require('express');
const AuditLogger = require('./logging/audit');

const app = express();

// Crear instancia global de auditLogger
const auditLogger = new AuditLogger(supabase);

// Inicializar tabla de auditoría
app.use(async (req, res, next) => {
  req.auditLogger = auditLogger;
  next();
});

// Registrar ruta de auditoría
const auditRoutes = require('./routes/audit');
app.use('/api/audit', auditRoutes);
```

### Paso 2: Ejecutar SQL setup en Supabase

1. Ir a Supabase Dashboard → SQL Editor
2. Copiar contenido de `sql/audit_logs_setup.sql`
3. Ejecutar

---

## 📝 Patrones de Integración

### Patrón 1: CREATE - Registrar nuevo recurso

**Ubicación:** `backend/routes/ventas.js` (ejemplo)

```javascript
const express = require('express');
const router = express.Router();

// POST /api/v1/ventas - Crear venta
router.post('/', async (req, res) => {
  try {
    const venta = req.body;

    // Validar entrada
    if (!venta.cliente_id || !venta.monto) {
      return res.status(400).json({ error: 'cliente_id y monto requeridos' });
    }

    // CREAR en BD
    const { data, error } = await req.supabase
      .from('ventas')
      .insert([venta])
      .select();

    if (error) throw error;

    const ventaCreada = data[0];

    // ✅ REGISTRAR EN AUDIT LOG
    await req.auditLogger.logCreate(
      req.userId,              // usuario autenticado
      req.userEmail,           // email del usuario
      'ventas',                // nombre de tabla
      ventaCreada.id,          // ID del registro creado
      ventaCreada,             // valores completos
      {
        ip: req.ip,
        user_agent: req.get('user-agent'),
        endpoint: '/api/v1/ventas',
        metodo: 'POST'
      }
    );

    res.status(201).json({
      success: true,
      data: ventaCreada
    });

  } catch (error) {
    console.error('[Ventas Error]', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
```

---

### Patrón 2: UPDATE - Registrar modificación

**Ubicación:** `backend/routes/ventas.js`

```javascript
// PUT /api/v1/ventas/:id - Actualizar venta
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const datosNuevos = req.body;

    // OBTENER VALORES ANTERIORES (importante para diff)
    const { data: datosAnteriores } = await req.supabase
      .from('ventas')
      .select('*')
      .eq('id', id)
      .single();

    if (!datosAnteriores) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    // ACTUALIZAR en BD
    const { data: ventaActualizada, error } = await req.supabase
      .from('ventas')
      .update(datosNuevos)
      .eq('id', id)
      .select();

    if (error) throw error;

    // ✅ REGISTRAR EN AUDIT LOG
    await req.auditLogger.logUpdate(
      req.userId,
      req.userEmail,
      'ventas',
      id,
      datosAnteriores,         // valores ANTES
      ventaActualizada[0],     // valores DESPUÉS
      {
        ip: req.ip,
        user_agent: req.get('user-agent'),
        endpoint: '/api/v1/ventas/:id',
        metodo: 'PUT'
      }
    );

    res.json({
      success: true,
      data: ventaActualizada[0]
    });

  } catch (error) {
    console.error('[Ventas Error]', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

### Patrón 3: DELETE - Registrar eliminación

**Ubicación:** `backend/routes/ventas.js`

```javascript
// DELETE /api/v1/ventas/:id - Eliminar venta
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // OBTENER VALORES ANTES DE ELIMINAR
    const { data: ventaAntes } = await req.supabase
      .from('ventas')
      .select('*')
      .eq('id', id)
      .single();

    if (!ventaAntes) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    // ELIMINAR de BD
    const { error } = await req.supabase
      .from('ventas')
      .delete()
      .eq('id', id);

    if (error) throw error;

    // ✅ REGISTRAR EN AUDIT LOG (CRÍTICO ANTES DE DELETE)
    await req.auditLogger.logDelete(
      req.userId,
      req.userEmail,
      'ventas',
      id,
      ventaAntes,  // valores que se perdieron
      {
        ip: req.ip,
        user_agent: req.get('user-agent'),
        endpoint: '/api/v1/ventas/:id',
        metodo: 'DELETE',
        razon: req.body?.razon || 'no especificada'  // opcional
      }
    );

    res.json({
      success: true,
      message: 'Venta eliminada'
    });

  } catch (error) {
    console.error('[Ventas Error]', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

### Patrón 4: BULK OPERATIONS - Múltiples cambios

```javascript
// POST /api/v1/ventas/bulk-update - Actualizar múltiples ventas
router.post('/bulk-update', async (req, res) => {
  try {
    const { vendedor_id, ids_ventas, nuevo_estado } = req.body;

    // Obtener valores actuales de TODAS
    const { data: ventasActuales } = await req.supabase
      .from('ventas')
      .select('*')
      .in('id', ids_ventas);

    // Actualizar TODAS
    const { error } = await req.supabase
      .from('ventas')
      .update({ estado: nuevo_estado, vendedor_id })
      .in('id', ids_ventas);

    if (error) throw error;

    // Obtener valores actualizados
    const { data: ventasNuevas } = await req.supabase
      .from('ventas')
      .select('*')
      .in('id', ids_ventas);

    // ✅ REGISTRAR CADA CAMBIO en audit log
    for (let i = 0; i < ventasActuales.length; i++) {
      await req.auditLogger.logUpdate(
        req.userId,
        req.userEmail,
        'ventas',
        ventasActuales[i].id,
        ventasActuales[i],
        ventasNuevas[i],
        {
          bulk_operation: true,
          total_registros: ventasActuales.length
        }
      );
    }

    res.json({
      success: true,
      actualizadas: ventasActuales.length
    });

  } catch (error) {
    console.error('[Ventas Error]', error);
    res.status(500).json({ error: error.message });
  }
});
```

---

## 🔐 Middleware para Auto-auditar

Para automatizar el logging sin tocar cada ruta, crear middleware:

```javascript
// backend/middleware/audit-middleware.js

const AuditLogger = require('../logging/audit');

/**
 * Middleware que intercepta cambios y los registra automáticamente
 * Funciona para rutas POST/PUT/DELETE
 */
async function auditLoggerMiddleware(req, res, next) {
  const originalJson = res.json;
  const auditLogger = req.auditLogger;

  // Interceptar respuesta
  res.json = function(data) {
    // Si fue CREATE/UPDATE/DELETE y fue exitoso
    if (
      res.statusCode < 400 &&
      ['POST', 'PUT', 'DELETE'].includes(req.method) &&
      data.data
    ) {
      // Registrar automáticamente
      const registro = data.data;
      const tabla = inferirTabla(req.path); // Inferir de la URL

      if (tabla && registro.id) {
        req.auditLogger.logActivity({
          usuario_id: req.userId,
          usuario_email: req.userEmail,
          tabla,
          accion: mapearMetodo(req.method),
          registro_id: registro.id,
          valores_despues: registro,
          metadata: {
            auto_logged: true,
            ip: req.ip,
            endpoint: req.path
          }
        }).catch(err => console.error('[Audit Error]', err));
      }
    }

    return originalJson.call(this, data);
  };

  next();
}

function inferirTabla(path) {
  // /api/v1/ventas → 'ventas'
  const match = path.match(/\/api\/v\d+\/(\w+)/);
  return match ? match[1] : null;
}

function mapearMetodo(method) {
  const map = {
    'POST': 'CREATE',
    'PUT': 'UPDATE',
    'PATCH': 'UPDATE',
    'DELETE': 'DELETE',
    'GET': 'READ'
  };
  return map[method] || 'READ';
}

module.exports = auditLoggerMiddleware;
```

**Usar en server.js:**

```javascript
const auditMiddleware = require('./middleware/audit-middleware');

// Aplicar globalmente
app.use('/api', auditMiddleware);
```

---

## 📊 Middleware para Autenticación + Contexto

Extraer usuario_id y usuario_email del JWT:

```javascript
// backend/middleware/auth-context.js

const jwt = require('jsonwebtoken');

async function setAuthContext(req, res, next) {
  try {
    const token = req.headers.authorization?.split('Bearer ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.sub;  // user id
      req.userEmail = decoded.email;
      req.userRole = decoded.role || 'user';
    } else {
      req.userId = null;
      req.userEmail = 'anonymous';
    }
  } catch (error) {
    req.userId = null;
    req.userEmail = 'error-parsing-token';
  }

  next();
}

module.exports = setAuthContext;
```

**Usar en server.js:**

```javascript
const setAuthContext = require('./middleware/auth-context');

app.use(setAuthContext);
```

---

## 🎯 Casos de Uso Específicos

### Caso 1: Sync desde Google Drive

```javascript
// backend/routes/sync.js

router.post('/from-drive', async (req, res) => {
  try {
    const { archivo_id, tipo } = req.body;

    // Obtener datos de Google Drive
    const datosExternos = await obtenerDeGoogleDrive(archivo_id);

    // Crear/actualizar en BD
    const { data, error } = await req.supabase
      .from(tipo)  // 'ventas', 'almacen', etc.
      .upsert(datosExternos, { onConflict: 'id' })
      .select();

    if (!error) {
      // ✅ Registrar sincronización
      data.forEach(registro => {
        req.auditLogger.logActivity({
          usuario_id: req.userId,
          usuario_email: req.userEmail || 'sync-drive',
          tabla: tipo,
          accion: 'UPDATE',  // o CREATE si es nuevo
          registro_id: registro.id,
          valores_despues: registro,
          metadata: {
            sincronizacion: 'google-drive',
            archivo_id: archivo_id,
            timestamp_drive: new Date().toISOString()
          }
        });
      });
    }

    res.json({ success: true, sincronizados: data.length });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

### Caso 2: Auditoría de Accesos (READ)

```javascript
// Opcional: registrar también lecturas sensibles

router.get('/clientes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: cliente } = await req.supabase
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single();

    if (cliente) {
      // ✅ Registrar acceso a datos sensibles
      if (req.userRole !== 'admin') {
        await req.auditLogger.logActivity({
          usuario_id: req.userId,
          usuario_email: req.userEmail,
          tabla: 'clientes',
          accion: 'READ',
          registro_id: id,
          metadata: {
            sensible: true,
            acceso_datos_personales: true,
            ip: req.ip
          }
        });
      }
    }

    res.json({ data: cliente });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 📊 Consultar Audit Logs

### Desde backend

```javascript
// Obtener historial de una venta
const historial = await req.auditLogger.getRecordHistory('ventas', ventaId);

// Obtener actividad de usuario
const actividad = await req.auditLogger.getUserActivity(userId, 100);

// Generar reporte de compliance
const reporte = await req.auditLogger.getComplianceReport(
  '2026-01-01',
  '2026-04-22'
);

console.log(reporte);
// {
//   periodo: { desde: '2026-01-01', hasta: '2026-04-22' },
//   total_eventos: 15234,
//   eventos_por_accion: { CREATE: 3421, UPDATE: 8945, DELETE: 234, READ: 2634 },
//   ...
// }
```

### Desde frontend

```javascript
// En main.js o componente relevante
import ActivityFeed from './frontend/audit/activity-feed.js';

const feed = new ActivityFeed({
  apiBaseUrl: '/api/audit',
  containerId: 'activity-feed',
  autoRefresh: true
});

await feed.init();

// El panel se actualiza automáticamente cada 30 segundos
```

---

## 🚀 Checklist de Integración

Para cada tabla que quieras auditar:

- [ ] Crear POST para INSERT + logCreate()
- [ ] Crear PUT para UPDATE + logUpdate()
- [ ] Crear DELETE + logDelete()
- [ ] Obtener valores ANTES de UPDATE/DELETE
- [ ] Pasar metadata (IP, user-agent, etc.)
- [ ] Testear que logs aparecen en GET /api/audit
- [ ] Testear exportación a CSV
- [ ] Testear filtros en Activity Feed

---

## 🧪 Testing

```bash
# Test 1: Crear venta
curl -X POST http://localhost:5000/api/v1/ventas \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "cliente_id": "...",
    "monto": 5000,
    "estado": "completada"
  }'

# Test 2: Ver audit log
curl http://localhost:5000/api/audit?tabla=ventas

# Test 3: Exportar
curl http://localhost:5000/api/audit/export?tabla=ventas > audit.csv

# Test 4: Verificar integridad
curl http://localhost:5000/api/audit/integrity
```

---

## 📝 Notas Importantes

1. **SIEMPRE obtener valores ANTES:** Para UPDATE/DELETE, obtener valores anteriores
2. **Metadata importante:** IP, user-agent, endpoint, contexto
3. **Performance:** Los logs se insertan async, no bloquea
4. **Append-only:** Los logs NO se pueden modificar (trigger previene)
5. **RLS:** Solo admin ve todos los logs, usuarios ven los suyos

---

## 🆘 Troubleshooting

### Logs no aparecen
```bash
# Verificar que tabla existe
curl http://localhost:5000/api/audit/integrity

# Verificar permisos RLS
# En Supabase: Verificar política de RLS en audit_logs
```

### "Deletion of audit logs is not permitted"
✅ Esto es esperado y correcto (compliance)

### Performance lento
```javascript
// Limitar logs consultados
curl http://localhost:5000/api/audit?limit=100  // max 1000
```

---

## ✅ Validación Final

Ejecutar este checklist para confirmar que todo funciona:

```bash
# 1. Crear registro
POST /api/v1/ventas → create venta

# 2. Verificar que apareció en logs
GET /api/audit?tabla=ventas
# Debe tener: CREATE action, valores_despues con datos

# 3. Actualizar registro
PUT /api/v1/ventas/:id → cambiar campo

# 4. Verificar UPDATE en logs
GET /api/audit/record/ventas/:id
# Debe mostrar CREATE → UPDATE con cambios

# 5. Exportar
GET /api/audit/export?tabla=ventas > test.csv
# Verificar que CSV tiene datos correctos

# 6. Verificar integridad
GET /api/audit/integrity
# Debe retornar: "integrity_ok": true
```

¡Listo para producción! 🎉
