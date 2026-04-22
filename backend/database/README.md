# Database - Maya Autopartes

Este directorio contiene toda la configuración de la base de datos PostgreSQL con Supabase.

## Estructura de Archivos

```
database/
├── schema.sql                 # Schema completo (~330 líneas)
├── migrations/
│   ├── migration_001_initial_schema.sql
│   ├── migration_002_add_indexes.sql
│   └── migration_003_add_rls.sql
├── migrations.js             # Manager de migraciones
├── supabase.js              # Configuración del cliente
└── README.md                 # Este archivo
```

## Configuración Rápida

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
Crear `.env.local` en la raíz del proyecto:
```bash
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

### 3. Ejecutar migraciones
```bash
node database/migrations.js run
```

### 4. Verificar estado
```bash
node database/migrations.js status
```

## Migraciones

Las migraciones se ejecutan automáticamente y se registran en la tabla `schema_migrations`.

### Ejecutar todas las migraciones
```bash
node database/migrations.js run
```

### Ver estado de migraciones
```bash
node database/migrations.js status
```

### Ejecutar una migración específica
```bash
node database/migrations.js specific migration_001_initial_schema.sql
```

## Tablas Creadas

1. **usuarios** - Gestión de usuarios y autenticación
2. **clientes** - Información de clientes
3. **almacen** - Inventario de productos
4. **ventas** - Registro de transacciones
5. **detalles_venta** - Líneas de detalle
6. **facturas** - Facturas electrónicas
7. **movimientos_inventario** - Historial de cambios
8. **actividad_log** - Auditoría del sistema
9. **configuracion_empresa** - Configuraciones globales
10. **sesiones** - Sesiones de usuarios

## Seguridad

### Row Level Security (RLS)
Todas las tablas tienen RLS habilitado. Las políticas garantizan que:
- Cada usuario solo ve sus propios datos
- Gerentes ven datos de su equipo
- Admins tienen acceso total
- Contadores ven datos de facturación

### Contraseñas
Las contraseñas deben hashearse con bcrypt antes de guardar:
```javascript
const bcrypt = require('bcrypt');
const hash = await bcrypt.hash(password, 10);
```

### Keys Secretas
- `SUPABASE_SERVICE_ROLE_KEY` nunca debe exponerse al cliente
- Usar `SUPABASE_ANON_KEY` solo en navegador
- Guardar keys en `.env.local` (no en git)

## Consultas Útiles

Ver documentación completa en `DATABASE_SCHEMA.md` y `DATABASE_QUERIES.md`

### Usuario activo
```bash
node database/migrations.js status
```

### Crear usuario
```javascript
const supabase = require('./supabase');
const { data } = await supabase.auth.admin.createUser({
  email: 'user@example.com',
  password: 'password123'
});
```

## Troubleshooting

### Error: "Connection refused"
Verifica que:
1. `SUPABASE_URL` es correcto
2. La base de datos está disponible
3. No hay firewall bloqueando

### Error: "RLS policy denying access"
Verifica que:
1. El usuario tiene el rol correcto
2. RLS policies están configuradas
3. auth.uid() coincide con el usuario_id

### Migraciones no se ejecutan
```bash
# Ver status
node database/migrations.js status

# Ejecutar con debug
DEBUG=* node database/migrations.js run
```

## Documentación Completa

- **DATABASE_SCHEMA.md** - Diagrama ER y descripción de tablas
- **SUPABASE_SETUP.md** - Guía paso a paso de configuración
- **DATABASE_QUERIES.md** - Ejemplos de queries SQL

## Desarrollo

### Testing de la conexión
```bash
node backend/test-connection.js
```

### Ejecutar en modo desarrollo
```bash
npm run dev
```

## Producción

Para producción:
1. Usar `SUPABASE_SERVICE_ROLE_KEY` con permisos limitados
2. Habilitar backups automáticos
3. Configurar SSL/TLS
4. Monitorear logs y performance
5. Usar connection pooling para mejor rendimiento

---

**Versión:** 1.0.0  
**Última actualización:** 2026-04-22
