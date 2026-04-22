# Guía de Setup de Supabase - Maya Autopartes

## Descripción General

Esta guía te ayudará a configurar un proyecto Supabase (PostgreSQL managed) para la aplicación Maya Autopartes con autenticación, base de datos y RLS configurados.

**Versión:** 1.0.0  
**Requisitos:** Cuenta de Supabase (gratuita o paga)

---

## Paso 1: Crear Proyecto en Supabase

### 1.1 Acceder a Supabase
1. Abre https://supabase.com
2. Haz clic en "Sign In" (o crea cuenta si es la primera vez)
3. Usa tu email (preferiblemente `coronelomar131@gmail.com`)

### 1.2 Crear Nuevo Proyecto
1. En el dashboard, haz clic en "New Project"
2. Selecciona la organización (o crea una nueva)
3. Completa los datos:
   - **Project name:** `maya-autopartes`
   - **Database password:** Crea una contraseña fuerte
   - **Region:** Selecciona la más cercana (ej: `us-east-1` para América)
   - **Pricing Plan:** `Free` (para desarrollo) o `Pro` (para producción)

4. Haz clic en "Create new project"

### 1.3 Esperar Inicialización
El proyecto tardará 1-2 minutos en crearse. Verás una pantalla de "Getting Started" cuando esté listo.

---

## Paso 2: Obtener Credenciales

### 2.1 Acceder a Project Settings
1. En el panel izquierdo, haz clic en el ícono de engranaje (Settings)
2. Selecciona "Project Settings"

### 2.2 Copiar API Keys
En la pestaña "API", encontrarás:

- **Project URL:** `https://xxxxxxxxxxxxx.supabase.co`
- **Anon Key:** `eyJhbGci...` (Cliente público)
- **Service Role Key:** `eyJhbGci...` (Admin, MANTENER SECRETO)

Guarda estos valores en un lugar seguro.

### 2.3 Obtener Database Password
La contraseña la configuraste en el paso 1.2. Si la olvidaste:
1. Ve a Settings > Database
2. Haz clic en "Reset database password"
3. Copia la nueva contraseña

---

## Paso 3: Configurar Variables de Entorno

### 3.1 Crear archivo .env.local
En la raíz del proyecto `maya-autopartes-working/`, crea un archivo `.env.local`:

```bash
# Supabase Configuration
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Backend Configuration
DATABASE_URL=postgresql://postgres:your_password@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
API_URL=http://localhost:3001
API_PORT=3001
NODE_ENV=development

# Authentication
JWT_SECRET=your-secret-key-here
JWT_EXPIRY=7d

# Email (opcional para recuperación de contraseña)
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@mayaautopartes.com
```

### 3.2 Configuración de Ejemplo
```bash
# Reemplaza con tus valores reales de Supabase
SUPABASE_URL=https://abcdefghijklmnop.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYwMzk0OTgzOCwiZXhwIjoxOTIwNTE1ODM4fQ.SUPABASE_ANON_KEY_EXAMPLE
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjAzOTQ5ODM4LCJleHAiOjE5MjA1MTU4Mzh9.SERVICE_ROLE_KEY_EXAMPLE
```

### 3.3 Proteger Variables Sensibles
Asegúrate de que `.env.local` esté en `.gitignore`:

```bash
# .gitignore
.env.local
.env.production
.env.*.local
```

---

## Paso 4: Ejecutar Migraciones

### 4.1 Instalar Dependencias
```bash
cd backend
npm install
```

### 4.2 Ejecutar Migraciones Automáticas
```bash
node database/migrations.js run
```

**Salida esperada:**
```
=== Iniciando Migraciones de Base de Datos ===

✓ Tabla de migraciones verificada
Migraciones ya ejecutadas: 0
Migraciones disponibles: 3

▶ Ejecutando migración: migration_001_initial_schema.sql
✓ Migración completada: migration_001_initial_schema.sql
▶ Ejecutando migración: migration_002_add_indexes.sql
✓ Migración completada: migration_002_add_indexes.sql
▶ Ejecutando migración: migration_003_add_rls.sql
✓ Migración completada: migration_003_add_rls.sql

✓ Todas las migraciones completadas exitosamente!
  Ejecutadas: 3, Saltadas: 0
```

### 4.3 Verificar Migraciones
```bash
node database/migrations.js status
```

---

## Paso 5: Verificar Schema en Supabase

### 5.1 Acceder a Editor SQL
1. En el dashboard de Supabase, ve a "SQL Editor"
2. Haz clic en "New Query"

### 5.2 Verificar Tablas
Ejecuta esta query para listar todas las tablas creadas:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Debes ver 10 tablas:**
- actividad_log
- almacen
- clientes
- configuracion_empresa
- detalles_venta
- facturas
- movimientos_inventario
- schema_migrations
- sesiones
- usuarios
- ventas

### 5.3 Verificar RLS está Habilitado
```sql
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
```

Todas las filas deben mostrar `rowsecurity = true`.

---

## Paso 6: Configurar Autenticación (Supabase Auth)

### 6.1 Habilitar Email/Password Auth
1. En el dashboard, ve a "Authentication" > "Providers"
2. Busca "Email"
3. Haz clic en el toggle para habilitar
4. Configura:
   - ✓ Email Confirmed
   - ✓ Double Confirm Changes (para cambios de email)

### 6.2 Configurar Email Confirmations (Opcional)
Para producción, configura un proveedor de email:

1. Ve a "Authentication" > "Email Templates"
2. Personaliza los templates si es necesario
3. Para enviar emails reales, configura SendGrid:
   - Ve a Settings > Emails
   - Selecciona "SendGrid" como proveedor
   - Ingresa tu API Key de SendGrid

### 6.3 Crear Primer Usuario (Admin)
Opción 1: Desde Supabase Dashboard
1. Ve a "Authentication" > "Users"
2. Haz clic en "Add user"
3. Email: `coronelomar131@gmail.com`
4. Password: Una contraseña segura
5. Haz clic en "Create user"

Opción 2: Desde API (después de implementar backend)
```bash
curl -X POST http://localhost:3001/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "coronelomar131@gmail.com",
    "password": "password123",
    "nombre": "Omar",
    "rol": "admin"
  }'
```

---

## Paso 7: Implementar Autenticación en Backend

### 7.1 Crear archivo de configuración
`backend/database/supabase.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
```

### 7.2 Crear rutas de autenticación
`backend/routes/auth.js`:

```javascript
const express = require('express');
const router = express.Router();
const supabase = require('../database/supabase');

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, nombre, apellido } = req.body;

    // Crear usuario en Supabase Auth
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (error) throw error;

    // Crear registro en tabla usuarios
    const { error: dbError } = await supabase
      .from('usuarios')
      .insert({
        id: data.user.id,
        email,
        nombre,
        apellido,
        rol: 'vendedor'
      });

    if (dbError) throw dbError;

    res.json({ success: true, user: data.user });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    res.json({ success: true, session: data.session });
  } catch (error) {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

module.exports = router;
```

---

## Paso 8: Testing de la Conexión

### 8.1 Crear script de prueba
`backend/test-connection.js`:

```javascript
require('dotenv').config();
const supabase = require('./database/supabase');

async function testConnection() {
  try {
    console.log('Testing Supabase connection...\n');

    // Test 1: Listar usuarios
    const { data: users, error: userError } = await supabase
      .from('usuarios')
      .select('*')
      .limit(5);

    if (userError) throw userError;
    console.log('✓ Conexión exitosa a base de datos');
    console.log(`✓ Usuarios encontrados: ${users.length}`);

    // Test 2: Verificar tablas
    const { data: tables, error: tableError } = await supabase.rpc('exec', {
      sql: "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    });

    if (!tableError) {
      console.log(`✓ Tablas en la base de datos: ${tables?.length || 0}`);
    }

    console.log('\n✓ Todos los tests pasaron!');
  } catch (error) {
    console.error('✗ Error:', error.message);
    process.exit(1);
  }
}

testConnection();
```

### 8.2 Ejecutar test
```bash
node backend/test-connection.js
```

---

## Paso 9: Configuración de Producción

### 9.1 Upgradar plan de Supabase (si es necesario)
Para producción:
1. Ve a Settings > Billing
2. Selecciona "Pro Plan"
3. Configura límites de almacenamiento

### 9.2 Configurar backups automáticos
1. Ve a Settings > Backups
2. Habilita backups diarios
3. Configura retención (30 días recomendado)

### 9.3 Configurar SSL
En Settings > Database:
1. Verifica que SSL está habilitado (debe estar por defecto)
2. Descarga el certificado si necesitas conexión externa

### 9.4 Monitoreo y Logs
1. Ve a "Logs" para ver query logs
2. Configura alertas en Settings > Notifications

---

## Paso 10: Documentación de Credenciales

Crea un archivo seguro (`CREDENTIALS.md` en 1Password, Google Drive encriptado, etc.):

```markdown
# Maya Autopartes - Supabase Credentials

**Proyecto:** maya-autopartes  
**URL:** https://xxxxxxxxxxxxx.supabase.co  
**Creado:** 2026-04-22

## API Keys
- Anon Key: eyJhbGci...
- Service Role Key: eyJhbGci...

## Database
- Host: db.xxxxxxxxxxxxx.supabase.co
- Port: 5432
- Database: postgres
- User: postgres
- Password: ****

## Admin Email
- Email: coronelomar131@gmail.com
- Password: ****

## Endpoints
- API URL: https://api.mayaautopartes.com
- Dashboard: https://app.mayaautopartes.com
```

---

## Troubleshooting

### Error: "SUPABASE_URL no encontrada"
Solución: Verifica que `.env.local` existe y tiene la clave correcta

### Error: "RLS policy denying access"
Solución: Verifica que:
1. RLS está habilitado en las tablas
2. Las políticas están correctamente configuradas
3. El usuario tiene el rol correcto

### Error: "Connection refused"
Solución:
1. Verifica que la URL de Supabase es correcta
2. Comprueba que tu IP está en la whitelist
3. Verifica que no hay firewall bloqueando

### Migraciones no se ejecutan
Solución:
```bash
# Verificar status
node database/migrations.js status

# Ejecutar una migración específica
node database/migrations.js specific migration_001_initial_schema.sql
```

### RLS bloqueando inserciones
Solución: Asegúrate de que el usuario tiene el `id` correcto:
```sql
-- En la sesión del usuario
SELECT auth.uid();

-- Debería retornar el UUID del usuario
```

---

## Comandos Útiles

```bash
# Ver estado de migraciones
node backend/database/migrations.js status

# Ejecutar todas las migraciones
node backend/database/migrations.js run

# Ejecutar una migración específica
node backend/database/migrations.js specific migration_002_add_indexes.sql

# Test de conexión
node backend/test-connection.js

# Iniciar servidor de desarrollo
npm run dev
```

---

## Referencias

- [Documentación oficial de Supabase](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase PostgreSQL](https://supabase.com/docs/guides/database)
- [RLS en Supabase](https://supabase.com/docs/guides/auth/row-level-security)
- [JavaScript Client Library](https://supabase.com/docs/reference/javascript/introduction)

---

**Última actualización:** 2026-04-22  
**Versión:** 1.0.0
