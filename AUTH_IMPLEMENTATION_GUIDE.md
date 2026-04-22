# AUTH_IMPLEMENTATION_GUIDE.md - Guía de Implementación Rápida

**Versión:** 1.0.0  
**Fecha:** 2026-04-22  
**Propósito:** Guía paso a paso para integrar autenticación JWT en tu aplicación

---

## 🚀 Quick Start (5 minutos)

### Paso 1: Instalar Dependencias

```bash
cd backend
npm install jsonwebtoken bcryptjs
npm install  # Para instalar todas las dependencias

# Para desarrollo
npm install --save-dev nodemon
```

### Paso 2: Configurar Variables de Entorno

Crear archivo `.env` en la raíz del proyecto:

```bash
# Backend
NODE_ENV=development
PORT=3000

# JWT Secrets (generar con `openssl rand -base64 32`)
JWT_SECRET=tu-secreto-aleatorio-cambiar-en-produccion
REFRESH_TOKEN_SECRET=tu-secreto-refresh-diferente

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000

# Rate Limiting
RATE_LIMIT_MAX=5
RATE_LIMIT_WINDOW_MS=900000

# Logs
LOG_LEVEL=debug
```

**Generar secretos seguros:**
```bash
# macOS/Linux
openssl rand -base64 32

# Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Minimum 0 -Maximum 256) }))
```

### Paso 3: Configurar Base de Datos

Ejecutar SQL en tu Supabase:

```bash
# Opción 1: Usar la migración SQL
# Copiar contenido de: backend/database/migrations/001-auth-schema.sql
# Ejecutar en Supabase SQL Editor

# Opción 2: Ejecutar con CLI
supabase migration up
```

### Paso 4: Integrar Backend

En tu archivo principal de Express (ej: `server.js`):

```javascript
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { createAuthRoutes } = require('./backend/routes/auth-routes');
const { authMiddleware, rateLimitMiddleware, auditMiddleware } = require('./backend/middleware/auth-middleware');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');

const app = express();

// Middleware de seguridad
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(','),
  credentials: true
}));
app.use(morgan('combined'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Audit logging
app.use(auditMiddleware());

// Inicializar Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Rutas de autenticación
app.use('/api/auth', createAuthRoutes(supabase));

// Ruta protegida de ejemplo
app.get('/api/usuarios/:usuario_id',
  authMiddleware(supabase),
  async (req, res) => {
    // req.usuario contiene { usuario_id, email, rol }
    res.json({ usuario: req.usuario });
  }
);

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
```

### Paso 5: Integrar Frontend

En `index.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Maya Autopartes</title>
  <script src="auth/auth-client.js"></script>
</head>
<body>
  <div id="app">
    <!-- Tu app aquí -->
  </div>

  <script>
    // Inicializar cliente de autenticación
    const auth = new AuthClient('http://localhost:3000/api');

    // Verificar si hay sesión activa
    if (!auth.isAuthenticated()) {
      // Si no está autenticado, redirigir a login
      auth.redirectToLogin(window.location.href);
    } else {
      // Obtener info del usuario
      const user = auth.getUserInfo();
      console.log(`Bienvenido ${user.nombre}`);

      // Configurar callback para cuando se pierda la autenticación
      auth.onUnauthorized((message) => {
        alert(message);
        auth.redirectToLogin();
      });
    }

    // Tu código de aplicación aquí
  </script>
</body>
</html>
```

---

## 📝 Crear Página de Login

Crear archivo `login.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Login - Maya Autopartes</title>
  <script src="auth/auth-client.js"></script>
  <style>
    body {
      font-family: Arial, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background: #f5f5f5;
    }
    .login-container {
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      width: 300px;
    }
    h1 {
      text-align: center;
      margin-bottom: 30px;
    }
    .form-group {
      margin-bottom: 15px;
    }
    input {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      box-sizing: border-box;
    }
    button {
      width: 100%;
      padding: 10px;
      background: #007bff;
      color: white;
      border: none;
      border-radius: 4px;
      font-size: 16px;
      cursor: pointer;
      margin-top: 20px;
    }
    button:hover {
      background: #0056b3;
    }
    .error {
      color: #d32f2f;
      margin-top: 10px;
    }
    .register-link {
      text-align: center;
      margin-top: 20px;
      font-size: 14px;
    }
    .register-link a {
      color: #007bff;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <h1>Maya Autopartes</h1>

    <form id="loginForm">
      <div class="form-group">
        <input type="email" id="email" placeholder="Email" required>
      </div>

      <div class="form-group">
        <input type="password" id="password" placeholder="Contraseña" required>
      </div>

      <button type="submit">Inicia Sesión</button>

      <div id="error" class="error"></div>
    </form>

    <div class="register-link">
      ¿No tienes cuenta? <a href="register.html">Registrate</a>
    </div>
  </div>

  <script>
    const auth = new AuthClient('http://localhost:3000/api');
    const returnUrl = new URLSearchParams(location.search).get('returnUrl');

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      const email = document.getElementById('email').value;
      const password = document.getElementById('password').value;
      const errorDiv = document.getElementById('error');

      try {
        errorDiv.textContent = '';
        await auth.login(email, password);

        // Redirect al dashboard o URL original
        window.location.href = returnUrl || 'index.html';
      } catch (error) {
        errorDiv.textContent = 'Error: ' + error.message;
      }
    });

    // Si ya está autenticado, redirigir
    if (auth.isAuthenticated()) {
      window.location.href = 'index.html';
    }
  </script>
</body>
</html>
```

---

## 📝 Crear Página de Registro

Crear archivo `register.html`:

```html
<!DOCTYPE html>
<html>
<head>
  <title>Registrarse - Maya Autopartes</title>
  <script src="auth/auth-client.js"></script>
  <style>
    /* Similar a login.html -->
  </style>
</head>
<body>
  <div class="login-container">
    <h1>Crear Cuenta</h1>

    <form id="registerForm">
      <div class="form-group">
        <input type="email" id="email" placeholder="Email" required>
      </div>

      <div class="form-group">
        <input type="text" id="nombre" placeholder="Nombre completo" required>
      </div>

      <div class="form-group">
        <input type="text" id="empresa" placeholder="Empresa (opcional)">
      </div>

      <div class="form-group">
        <input type="password" id="password" placeholder="Contraseña" required>
        <small>Mín. 8 caracteres, 1 mayúscula, 1 número</small>
      </div>

      <button type="submit">Registrarse</button>

      <div id="error" class="error"></div>
    </form>

    <div class="register-link">
      ¿Ya tienes cuenta? <a href="login.html">Inicia sesión</a>
    </div>
  </div>

  <script>
    const auth = new AuthClient('http://localhost:3000/api');

    document.getElementById('registerForm').addEventListener('submit', async (e) => {
      e.preventDefault();

      const userData = {
        email: document.getElementById('email').value,
        nombre: document.getElementById('nombre').value,
        empresa: document.getElementById('empresa').value,
        password: document.getElementById('password').value,
      };

      try {
        document.getElementById('error').textContent = '';
        await auth.register(userData);
        alert('Registro exitoso. Redirigiendo...');
        window.location.href = 'index.html';
      } catch (error) {
        document.getElementById('error').textContent = 'Error: ' + error.message;
      }
    });

    // Si ya está autenticado, redirigir
    if (auth.isAuthenticated()) {
      window.location.href = 'index.html';
    }
  </script>
</body>
</html>
```

---

## 🔐 Proteger Rutas Backend

### Ruta Básica Protegida

```javascript
app.get('/api/inventario',
  authMiddleware(supabase),
  async (req, res) => {
    // req.usuario = { usuario_id, email, rol }
    const inventario = await obtenerInventario(req.usuario.usuario_id);
    res.json(inventario);
  }
);
```

### Ruta Solo para Admin

```javascript
const { roleMiddleware } = require('./backend/middleware/auth-middleware');

app.delete('/api/usuarios/:id',
  authMiddleware(supabase),
  roleMiddleware('admin'),
  async (req, res) => {
    // Solo admin puede acceder
    await supabase
      .from('usuarios')
      .delete()
      .eq('usuario_id', req.params.id);

    res.json({ mensaje: 'Usuario eliminado' });
  }
);
```

### Validar Pertenencia

```javascript
const { ownershipMiddleware } = require('./backend/middleware/auth-middleware');

app.put('/api/usuarios/:usuario_id/perfil',
  authMiddleware(supabase),
  ownershipMiddleware('usuario_id'),
  async (req, res) => {
    // Usuario solo puede actualizar su perfil
    // ...
  }
);
```

---

## 📡 Usar Token en Requests

### Fetch Básico

```javascript
const token = auth.getToken();

const response = await fetch('/api/inventario', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Axios

```javascript
const instance = axios.create({
  baseURL: 'http://localhost:3000/api'
});

// Interceptor para agregar token automáticamente
instance.interceptors.request.use((config) => {
  const token = auth.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar 401
instance.interceptors.response.use(
  response => response,
  async (error) => {
    if (error.response?.status === 401) {
      auth.logout();
      auth.redirectToLogin();
    }
    return Promise.reject(error);
  }
);
```

---

## 🧪 Testear Autenticación

### 1. Test de Registro

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123",
    "nombre": "Juan Pérez",
    "empresa": "Mi Empresa"
  }'
```

**Respuesta esperada:**
```json
{
  "mensaje": "Usuario registrado exitosamente",
  "data": {
    "usuario_id": "uuid-...",
    "email": "test@example.com",
    "nombre": "Juan Pérez",
    "token": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": "15m"
  }
}
```

### 2. Test de Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123"
  }'
```

### 3. Test de Ruta Protegida

```bash
curl -X GET http://localhost:3000/api/usuarios/uuid \
  -H "Authorization: Bearer eyJhbGc..."
```

### 4. Test de Refresh

```bash
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGc..."
  }'
```

---

## 🐛 Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| `JWT_SECRET is required` | Variable no configurada | Agregar a `.env` |
| `SUPABASE connection failed` | URL/Key incorrectos | Verificar en Supabase dashboard |
| `400 Bad Request` | Validación fallida | Ver details en respuesta JSON |
| `401 Unauthorized` | Token inválido/expirado | Hacer login nuevamente |
| `403 Forbidden` | Sin permisos | Verificar rol del usuario |
| `CORS error` | Origen no permitido | Agregar a ALLOWED_ORIGINS |

---

## 📊 Monitoreo

### Ver logs en Supabase

```sql
SELECT * FROM audit_log
WHERE evento = 'LOGIN_SUCCESS'
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Ver intentos fallidos

```sql
SELECT email, COUNT(*) as intentos, MAX(created_at) as ultimo
FROM login_attempts
WHERE exitoso = false
AND created_at > NOW() - INTERVAL '1 hour'
GROUP BY email
HAVING COUNT(*) > 3;
```

---

## 🚀 Deployment a Producción

### Checklist

- [ ] JWT_SECRET - Cambiar a valor aleatorio
- [ ] REFRESH_TOKEN_SECRET - Cambiar a valor aleatorio
- [ ] NODE_ENV=production
- [ ] CORS originados correctos (dominio real)
- [ ] HTTPS habilitado
- [ ] Supabase RLS policies configuradas
- [ ] Backups de BD configurados
- [ ] Logs centralizados (Sentry, LogRocket, etc.)

### Comandos

```bash
# Build
npm run build

# Deploy a Vercel/Heroku/etc.
# (seguir guía específica de tu proveedor)

# En servidor:
npm install --production
NODE_ENV=production npm start
```

---

## 📚 Archivos Generados

```
backend/
├── auth/
│   └── auth.js (320 líneas)
├── middleware/
│   └── auth-middleware.js (180 líneas)
├── routes/
│   └── auth-routes.js (280 líneas)
└── database/
    └── migrations/
        └── 001-auth-schema.sql

frontend/
└── auth/
    └── auth-client.js (380 líneas)

Documentación/
├── AUTH_FLOW.md
├── JWT_SECURITY.md
├── OAUTH_NEXTPHASE.md
└── AUTH_IMPLEMENTATION_GUIDE.md (este archivo)

HTML/
├── login.html
├── register.html
└── index.html (con integración)
```

---

## 📖 Documentación Completa

- **AUTH_FLOW.md** - Flujo detallado de cada operación
- **JWT_SECURITY.md** - Mejores prácticas de seguridad
- **OAUTH_NEXTPHASE.md** - Roadmap de features avanzadas

---

## 🎯 Próximos Pasos

1. ✅ Implementar autenticación JWT básica
2. ⚪ Implementar Google OAuth (Phase 2)
3. ⚪ Implementar 2FA (Phase 2)
4. ⚪ Implementar session management (Phase 3)
5. ⚪ Auditoría avanzada y dashboards (Phase 3)

---

**¿Preguntas o problemas?**  
Revisar documentación en `AUTH_FLOW.md` y `JWT_SECURITY.md`

**Última actualización:** 2026-04-22
