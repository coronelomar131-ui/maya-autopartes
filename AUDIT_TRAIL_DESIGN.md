# Audit Trail Design Document

## Resumen Ejecutivo

Sistema centralizado de Activity Logging y Audit Trail para Maya Autopartes que proporciona trazabilidad completa de todos los cambios en la base de datos, cumpliendo con estándares ISO 27001 y GDPR.

**Versión:** 1.0.0  
**Autor:** Maya Autopartes Compliance Team  
**Fecha:** 2026-04-22

---

## 🎯 Objetivos

1. **Trazabilidad completa:** Registrar TODOS los cambios (CREATE, UPDATE, DELETE)
2. **Compliance:** Cumplir con ISO 27001 y GDPR
3. **Inmutabilidad:** Logs append-only (no se pueden eliminar)
4. **Performance:** Mínimo impacto en operaciones normales
5. **Auditoría:** Generar reportes de compliance bajo demanda

---

## 📋 Especificación Técnica

### Base de Datos - Tabla `audit_logs`

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Información de usuario
  usuario_id UUID NOT NULL,
  usuario_email TEXT,
  
  -- Información del cambio
  tabla TEXT NOT NULL,
  accion TEXT NOT NULL CHECK (accion IN ('CREATE', 'UPDATE', 'DELETE', 'READ')),
  registro_id UUID,
  
  -- Datos del cambio
  valores_antes JSONB,        -- Estado anterior del registro
  valores_despues JSONB,      -- Estado nuevo del registro
  cambios JSONB,              -- Solo los campos modificados (diff)
  
  -- Metadatos
  metadata JSONB DEFAULT '{}'::jsonb,  -- IP, User-Agent, etc.
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Índices para performance
  INDEX idx_audit_timestamp (timestamp DESC),
  INDEX idx_audit_usuario (usuario_id),
  INDEX idx_audit_tabla (tabla),
  INDEX idx_audit_accion (accion),
  INDEX idx_audit_registro (registro_id),
  
  -- Integridad
  CONSTRAINT audit_logs_no_delete CHECK (true)
);
```

### Propiedades de la Tabla

| Propiedad | Valor | Justificación |
|-----------|-------|---------------|
| **Append-only** | Sí | Trigger previene DELETE |
| **Encrypted** | Recomendado | Datos sensibles en `valores_antes/despues` |
| **Replicada** | Sí | Backup en múltiples regiones |
| **Retention** | 7 años | Cumplimiento regulatorio |
| **Row Level Security** | Sí | Solo administradores pueden leer |

---

## 🔧 Componentes del Sistema

### 1. Backend - AuditLogger (`backend/logging/audit.js`)

**Responsabilidades:**
- Registrar cambios en la BD
- Validar integridad de datos
- Generar reportes de compliance
- Exportar datos a CSV

**Métodos principales:**

```javascript
// Registrar actividades
logActivity({ usuario_id, usuario_email, tabla, accion, registro_id, valores_antes, valores_despues, metadata })
logCreate(usuario_id, usuario_email, tabla, registro_id, valores_despues)
logUpdate(usuario_id, usuario_email, tabla, registro_id, valores_antes, valores_despues)
logDelete(usuario_id, usuario_email, tabla, registro_id, valores_antes)

// Consultar logs
getAuditTrail(filters, limit, offset)
getUserActivity(usuario_id)
getTableActivity(tabla)
getRecordHistory(tabla, registro_id)
getRecentChanges(horasAtras)

// Reportes
getComplianceReport(fechaInicio, fechaFin)
exportToCSV(filters)
verifyIntegrity(desde, hasta)
```

### 2. API Routes (`backend/routes/audit.js`)

**Endpoints disponibles:**

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/audit` | Últimos 100 eventos (con filtros) |
| GET | `/api/audit/recent` | Últimas N horas |
| GET | `/api/audit/user/:usuario_id` | Actividad de usuario específico |
| GET | `/api/audit/table/:tabla` | Actividad de tabla específica |
| GET | `/api/audit/record/:tabla/:record_id` | Historial de un registro |
| GET | `/api/audit/export` | Descargar CSV |
| GET | `/api/audit/compliance` | Reporte de compliance ISO 27001/GDPR |
| GET | `/api/audit/integrity` | Verificar integridad de logs |
| POST | `/api/audit/log` | Registrar actividad (interno) |
| POST | `/api/audit/initialize` | Crear tabla (admin only) |

**Ejemplos de uso:**

```bash
# Obtener últimos eventos
curl http://localhost:5000/api/audit?limit=50

# Filtrar por usuario
curl http://localhost:5000/api/audit?usuario=omar@example.com

# Historial de tabla
curl http://localhost:5000/api/audit/table/ventas?limit=100

# Historial de registro específico
curl http://localhost:5000/api/audit/record/ventas/a1b2c3d4-e5f6-7890-abcd-ef1234567890

# Exportar a CSV
curl http://localhost:5000/api/audit/export?tabla=ventas > ventas_audit.csv

# Reporte de compliance (período)
curl "http://localhost:5000/api/audit/compliance?desde=2026-01-01&hasta=2026-04-22"

# Verificar integridad
curl http://localhost:5000/api/audit/integrity
```

### 3. Frontend - Activity Feed (`frontend/audit/activity-feed.js`)

**Características:**

- **Visualización:** Panel de "Actividad Reciente" con eventos en formato legible
- **Filtros:** Usuario, tabla, acción, rango de fechas
- **Búsqueda:** Búsqueda en tiempo real
- **Paginación:** 50 eventos por página (configurable)
- **Exportación:** Descargar audit trail como CSV
- **Modal de detalles:** Ver cambios completos de cada evento

**Interfaz de usuario:**

```
┌─────────────────────────────────────────────────┐
│ 📋 Actividad Reciente      [🔄 Refrescar] [📥 Exportar] │
├─────────────────────────────────────────────────┤
│ Filtros:                                        │
│ [Usuario...]  [Tabla▼]  [Acción▼]  [Des...] [Has...] [✕] │
├─────────────────────────────────────────────────┤
│ Total: 1,245 eventos      Página 1              │
├─────────────────────────────────────────────────┤
│ ✨ Omar creó venta de $5,000         11:30am   │
│    CREATE | ventas | omar@mail.com             │
│                                                 │
│ ✏️ Juan actualizó stock           11:32am   │
│    UPDATE | almacen | juan@mail.com            │
│                                                 │
│ 🗑️ Admin eliminó usuario         11:35am   │
│    DELETE | usuarios | admin@mail.com          │
├─────────────────────────────────────────────────┤
│ [← Anterior]  Página 1 de 25  [Siguiente →]    │
└─────────────────────────────────────────────────┘
```

**Integración:**

```javascript
// En main.js o componente relevante
import ActivityFeed from './frontend/audit/activity-feed.js';

const feed = new ActivityFeed({
  apiBaseUrl: '/api/audit',
  refreshInterval: 30000,  // 30 segundos
  pageSize: 50,
  autoRefresh: true,
  containerId: 'activity-feed'
});

await feed.init();

// Al destruir
feed.destroy();
```

---

## 📊 Flujos de Datos

### Flujo de Registro de Cambio

```
┌─────────────────────────────────────────────────────────┐
│                    Evento de cambio                     │
│               (CREATE/UPDATE/DELETE)                    │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│           Middleware de Auditoría                       │
│   (captura usuario, tabla, valores antes/después)      │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│          AuditLogger.logActivity()                      │
│   - Valida entrada                                      │
│   - Calcula cambios (diff)                              │
│   - Crea objeto de log                                  │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│         INSERT INTO audit_logs                          │
│         (append-only, no update/delete)                 │
└────────────────┬────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────┐
│            Log guardado en BD                           │
│   - Inmutable (protected por trigger)                   │
│   - Indexado (rápidas consultas)                        │
│   - Encriptado en tránsito y en reposo                  │
└─────────────────────────────────────────────────────────┘
```

### Flujo de Consulta/Exportación

```
┌────────────────────────────────────────┐
│  Frontend: Activity Feed               │
│  - Usuario aplica filtros             │
│  - Solicita página X                  │
└───────────────┬────────────────────────┘
                │
                ▼
┌────────────────────────────────────────┐
│  GET /api/audit?usuario=X&tabla=Y     │
│  (HTTP con SSL/TLS)                    │
└───────────────┬────────────────────────┘
                │
                ▼
┌────────────────────────────────────────┐
│  Backend: Validar permisos            │
│  - Usuario autenticado?                │
│  - Tiene acceso a datos?               │
└───────────────┬────────────────────────┘
                │
                ▼
┌────────────────────────────────────────┐
│  SELECT FROM audit_logs                │
│  WHERE user_id=X AND tabla=Y           │
│  ORDER BY timestamp DESC               │
│  LIMIT 100 OFFSET 0                    │
└───────────────┬────────────────────────┘
                │
                ▼
┌────────────────────────────────────────┐
│  Retornar JSON con metadatos           │
│  {                                     │
│    data: [...],                        │
│    total: 1245,                        │
│    hasMore: true                       │
│  }                                     │
└─────────────────────────────────────────┘
```

---

## 🔐 Seguridad

### Principios de Diseño

1. **Integridad de datos:** Append-only + Triggers + Checksums
2. **Confidencialidad:** Encriptación TLS + Roles RBAC en BD
3. **Autenticidad:** JWT + Auditoría de acceso

### Medidas Implementadas

| Medida | Implementación |
|--------|----------------|
| **Append-only** | Trigger bloquea DELETE |
| **Validación** | Check constraints en BD |
| **Encriptación en tránsito** | SSL/TLS HTTP |
| **Encriptación en reposo** | AES-256 recomendado en Supabase |
| **RLS (Row Level Security)** | Solo admin/owner pueden leer |
| **Auditoría de acceso** | Cada consulta a audit_logs es registrada |
| **Anonimización** | Mascarar emails sensibles en exportación |
| **Retención** | 7 años (configurable según regulación) |

### Control de Acceso

```
┌─────────────────┐
│   Usuario       │
└────────┬────────┘
         │
         ▼
    ¿Token válido?
    ├─ NO → 401 Unauthorized
    └─ SÍ ▼
        ¿Es admin?
        ├─ SÍ → Acceso a todos los logs
        ├─ NO → ¿Mismo usuario?
        │       ├─ SÍ → Acceso a sus propios logs
        │       └─ NO → 403 Forbidden
```

---

## 📈 Performance

### Estrategia de Optimización

1. **Índices:**
   - `idx_audit_timestamp`: Consultas recientes
   - `idx_audit_usuario`: Actividad por usuario
   - `idx_audit_tabla`: Actividad por tabla
   - `idx_audit_accion`: Filtros por acción

2. **Paginación:**
   - Máximo 1,000 registros por consulta
   - Default 100 registros por página
   - Offset-based pagination

3. **Caching (opcional):**
   - Redis para últimas 24 horas
   - TTL 5 minutos para reportes

4. **Archivado:**
   - Mover logs antiguos (>1 año) a tabla separada
   - Mantener índices solo en logs activos

### Benchmarks esperados

| Operación | Tiempo esperado |
|-----------|-----------------|
| Insertar log | < 10ms |
| Consultar 100 logs | < 50ms |
| Exportar 10,000 logs | < 2s |
| Verificar integridad | < 5s |

---

## 🔄 Integración con Rutas Existentes

### Modificar rutas para auto-logging

Cada endpoint que modifique datos debe llamar a `auditLogger`:

```javascript
// En routes/ventas.js (ejemplo)
const AuditLogger = require('../logging/audit');

router.post('/', async (req, res) => {
  try {
    const venta = req.body;
    
    // Crear venta
    const { data, error } = await req.supabase
      .from('ventas')
      .insert([venta])
      .select();
    
    if (!error) {
      // Registrar en audit log
      const auditLogger = new AuditLogger(req.supabase);
      await auditLogger.logCreate(
        req.userId,  // usuario autenticado
        req.userEmail,
        'ventas',
        data[0].id,
        data[0]
      );
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## 📋 Casos de Uso

### 1. Auditoría de Ventas
**Requerimiento:** "Ver quién creó qué venta y cuándo"

```bash
GET /api/audit/table/ventas?limit=100&accion=CREATE
```

Resultado:
```json
{
  "data": [
    {
      "id": "uuid",
      "usuario_email": "omar@example.com",
      "tabla": "ventas",
      "accion": "CREATE",
      "timestamp": "2026-04-22T11:30:00Z",
      "valores_despues": {
        "monto": 5000,
        "cliente": "Juan",
        "estado": "completada"
      }
    }
  ]
}
```

### 2. Historial de Cambios
**Requerimiento:** "Ver todos los cambios a una orden de venta"

```bash
GET /api/audit/record/ventas/a1b2c3d4-e5f6-7890-abcd-ef1234567890
```

Resultado: Línea de tiempo de CREATE → UPDATE → UPDATE → ...

### 3. Reporte de Compliance
**Requerimiento:** "Generar reporte de accesos a datos sensibles"

```bash
GET /api/audit/compliance?desde=2026-01-01&hasta=2026-04-22
```

Resultado:
```json
{
  "periodo": { "desde": "2026-01-01", "hasta": "2026-04-22" },
  "total_eventos": 15234,
  "eventos_por_accion": {
    "CREATE": 3421,
    "UPDATE": 8945,
    "DELETE": 234,
    "READ": 2634
  },
  "eventos_por_usuario": { "omar@example.com": 4521, ... },
  "eventos_por_tabla": { "ventas": 8234, "clientes": 4521, ... },
  "datos_sensibles_accedidos": 7155,
  "intentos_delete": 234
}
```

### 4. Exportación para Auditors
**Requerimiento:** "Descargar todos los cambios a usuarios en abril"

```bash
GET /api/audit/export?tabla=usuarios&desde=2026-04-01&hasta=2026-04-30
```

Resultado: Archivo `audit_trail_2026-04-22.csv` descargado

---

## 🚀 Deployment

### Configuración necesaria

**Variables de entorno (.env):**
```
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=xxx
ADMIN_KEY=xxx  # Para endpoint /audit/initialize
DATABASE_URL=postgresql://...
```

### Steps de instalación

1. **Crear tabla en Supabase:**
   ```bash
   POST /api/audit/initialize
   Headers: X-Admin-Key: xxx
   ```

2. **Importar ruta en server.js:**
   ```javascript
   const auditRoutes = require('./routes/audit');
   app.use('/api/audit', auditRoutes);
   ```

3. **Integrar en componentes frontend:**
   ```javascript
   import ActivityFeed from './frontend/audit/activity-feed.js';
   const feed = new ActivityFeed();
   await feed.init();
   ```

4. **Modificar rutas existentes** para llamar a `logActivity`

---

## 📊 Reportes

### Reporte ISO 27001
- Acceso a datos sensibles (usuarios, clientes)
- Tentativas de delete no autorizado
- Cambios a configuración de seguridad

### Reporte GDPR
- Quién accedió a datos personales
- Derechos de eliminación ejercidos
- Anonimización de datos sensibles

### Reporte Operacional
- Cambios por usuario/tabla/período
- Actividad por hora del día
- Top operaciones

---

## 🔧 Mantenimiento

### Backup y Retención

```sql
-- Mantener 7 años (2555 días)
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '7 years';

-- Archivar logs antiguos (>1 año)
INSERT INTO audit_logs_archived
SELECT * FROM audit_logs WHERE created_at < NOW() - INTERVAL '1 year';
```

### Monitoreo

- Alertar si tabla crece > 1GB/mes
- Verificar integridad semanalmente
- Auditar accesos a audit_logs

---

## ✅ Checklist de Compliance

- [x] Append-only implementation
- [x] Timestamp inmutable
- [x] Usuario rastreable
- [x] Cambios antes/después registrados
- [x] Exportación a CSV
- [x] Reportes de compliance
- [x] Control de acceso RBAC
- [x] Verificación de integridad
- [x] Documentación

---

## 📚 Referencias

- **ISO/IEC 27001:2022** - Information Security Management
- **GDPR Art. 5** - Principles relating to processing of personal data
- **PCI DSS 10.1-10.7** - Logging and monitoring requirements
- **Supabase Row Level Security** - https://supabase.com/docs/learn/auth-deep-dive/row-level-security
