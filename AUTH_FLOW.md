# AUTH_FLOW.md - Flujo Completo de Autenticación JWT

**Versión:** 1.0.0  
**Fecha:** 2026-04-22  
**Sistema:** Maya Autopartes - Autenticación Segura Multi-Usuario

---

## 📋 Índice

1. [Visión General](#visión-general)
2. [Componentes](#componentes)
3. [Flujos de Autenticación](#flujos-de-autenticación)
4. [Token Management](#token-management)
5. [Seguridad](#seguridad)
6. [Integración](#integración)

---

## Visión General

Sistema de autenticación JWT (JSON Web Tokens) con soporte para:
- ✅ Registro de usuarios con validación
- ✅ Login con credenciales email/password
- ✅ Tokens de acceso (15 minutos)
- ✅ Tokens de refresh (7 días)
- ✅ Auto-refresh automático (5 min antes de expiración)
- ✅ Logout con invalidación de tokens
- ✅ Rate limiting por usuario
- ✅ Auditoría de acceso

```
┌──────────────┐
│ Frontend     │
│ auth-client  │
└──────┬───────┘
       │ HTTP/REST
       ▼
┌──────────────┐      ┌──────────────┐
│ Backend      │──────│  Supabase    │
│ auth.js      │      │  Database    │
│ auth-routes  │      │              │
└──────────────┘      └──────────────┘
```

---

## Componentes

### 1. Backend: `backend/auth/auth.js`
**Responsabilidad:** Lógica de autenticación

```javascript
class AuthManager {
  // Métodos principales:
  async register(userData)                // Registrar usuario
  async login(email, password)            // Login
  async refreshAccessToken(refreshToken) // Refrescar token
  async logout(token)                     // Logout
  verifyToken(token)                      // Verificar JWT
  async changePassword(...)               // Cambiar contraseña
  async getUserInfo(usuario_id)           // Obtener info usuario
}
```

**Dependencias:**
- `jsonwebtoken` - Firma/verifica JWT
- `bcryptjs` - Hash de contraseñas
- `uuid` - Generar IDs únicos

### 2. Backend: `backend/middleware/auth-middleware.js`
**Responsabilidad:** Proteger rutas y extraer usuario

```javascript
authMiddleware()        // Verifica JWT en Authorization header
roleMiddleware()        // Valida rol de usuario
ownershipMiddleware()   // Solo usuario puede acceder sus datos
auditMiddleware()       // Logging de acceso
rateLimitMiddleware()   // Límite de intentos
authErrorHandler()      // Manejo centralizado de errores
```

### 3. Backend: `backend/routes/auth-routes.js`
**Responsabilidad:** Endpoints REST de autenticación

```
POST   /auth/register         → Registrar usuario
POST   /auth/login            → Login
POST   /auth/refresh          → Refrescar token
POST   /auth/logout           → Logout
POST   /auth/verify           → Verificar token
POST   /auth/change-password  → Cambiar contraseña
GET    /auth/me               → Obtener usuario actual
PUT    /auth/profile/:id      → Actualizar perfil
```

### 4. Frontend: `frontend/auth/auth-client.js`
**Responsabilidad:** Cliente HTTP + gestión local de tokens

```javascript
class AuthClient {
  async register(userData)                 // Registrar usuario
  async login(email, password)             // Login
  async refreshToken()                     // Refrescar token
  async logout()                           // Logout
  async verifyToken()                      // Verificar token
  async getCurrentUser()                   // Obtener usuario
  async changePassword(...)                // Cambiar contraseña
  async updateProfile(data)                // Actualizar perfil
  
  // Getters
  getToken()                               // Obtener JWT actual
  getRefreshToken()                        // Obtener refresh token
  getUserInfo()                            // Obtener info de usuario
  getUserId()                              // Obtener usuario_id
  isAuthenticated()                        // ¿Está autenticado?
  
  // Callbacks
  onUnauthorized(callback)                 // Callback al perder auth
  redirectToLogin(returnUrl)               // Redirigir a login
}
```

---

## Flujos de Autenticación

### Flujo 1: Registro (New User)

```
FRONTEND                          BACKEND                    DATABASE
   │                                │                           │
   ├─ POST /auth/register ────────>│                           │
   │  { email, password,            │ Validar datos             │
   │    nombre, empresa }           │ ✓ Email válido            │
   │                                │ ✓ Password fuerte         │
   │                                │ ✓ Nombre presente         │
   │                                │                           │
   │                                ├─ SELECT usuarios ──────>│
   │                                │  WHERE email = ...        │
   │<──────────────────────────────┤<─────────────────────────┤
   │                                │ Email no existe ✓         │
   │                                │                           │
   │                                ├─ Hash password (bcrypt)  │
   │                                │ ├─ Salt rounds: 12        │
   │                                │ ├─ New usuario_id (uuid)  │
   │                                │                           │
   │                                ├─ INSERT usuarios ───────>│
   │                                │<────────────────────────┤
   │                                │ Usuario creado ✓          │
   │                                │                           │
   │                                ├─ Generate Tokens         │
   │                                │ ├─ Access (15m)           │
   │                                │ └─ Refresh (7d)           │
   │                                │                           │
   │<─ 201 { token, refreshToken }─┤                           │
   │                                │                           │
   ├─ Save to localStorage          │                           │
   ├─ Start auto-refresh (5min)     │                           │
   └─ Redirect to dashboard ───────>│                           │
```

**Validaciones:**
- Email: formato válido, no existe
- Password: min 8 caracteres, mayúscula, número
- Nombre: min 2 caracteres
- Empresa: opcional, min 2 caracteres si se proporciona

**Respuesta exitosa:**
```json
{
  "mensaje": "Usuario registrado exitosamente",
  "data": {
    "usuario_id": "uuid-here",
    "email": "user@example.com",
    "nombre": "Juan Pérez",
    "token": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": "15m"
  }
}
```

---

### Flujo 2: Login

```
FRONTEND                          BACKEND                    DATABASE
   │                                │                           │
   ├─ POST /auth/login ───────────>│                           │
   │  { email, password }           │ Validar datos             │
   │                                │                           │
   │                                ├─ SELECT usuarios ──────>│
   │                                │  WHERE email = ...        │
   │                                │<────────────────────────┤
   │                                │ Usuario encontrado ✓      │
   │                                │                           │
   │                                ├─ bcrypt.compare          │
   │                                │  password vs hash         │
   │                                │                           │
   │<─ 200 { token, refreshToken }─┤                           │
   │                                │                           │
   │                                ├─ UPDATE last_login ────>│
   │                                │<────────────────────────┤
   │                                │                           │
   │                                ├─ INSERT refresh_token ──>│
   │                                │ (almacenar hash)          │
   │                                │<────────────────────────┤
   │                                │                           │
   ├─ Save tokens to localStorage   │                           │
   ├─ Start auto-refresh            │                           │
   └─ Redirect to dashboard         │                           │
```

**Validaciones:**
- Email y password requeridos
- Email existe en BD
- Password correcto (sin revelar si existe email)

**Rate Limiting:** Max 5 intentos por 15 minutos

---

### Flujo 3: Token Refresh (Auto-refresh)

```
FRONTEND                          BACKEND                    DATABASE
   │                                │                           │
   │ [5 min antes de expiración]    │                           │
   │                                │                           │
   ├─ POST /auth/refresh ─────────>│                           │
   │  { refreshToken }              │ Verify JWT                │
   │                                │ (verify signature)        │
   │                                │                           │
   │                                ├─ SELECT refresh_tokens ─>│
   │                                │  WHERE token_hash = ...   │
   │                                │<────────────────────────┤
   │                                │ Token válido & activo ✓   │
   │                                │                           │
   │                                ├─ UPDATE refresh_token ──>│
   │                                │  SET activo = false       │
   │                                │ (Token Rotation!)         │
   │                                │<────────────────────────┤
   │                                │                           │
   │                                ├─ Generate New Tokens     │
   │                                │ ├─ Access (15m)           │
   │                                │ └─ Refresh (7d)           │
   │                                │                           │
   │                                ├─ INSERT new refresh ────>│
   │                                │<────────────────────────┤
   │                                │                           │
   │<─ 200 { token, refreshToken }─┤                           │
   │                                │                           │
   ├─ Update tokens                 │                           │
   ├─ Restart auto-refresh          │                           │
   └─ Continue operation            │                           │
```

**Seguridad:**
- Refresh token antiguo invalidado (Token Rotation)
- Nuevo refresh token generado
- Auto-refresh se reinicia

---

### Flujo 4: Logout

```
FRONTEND                          BACKEND                    DATABASE
   │                                │                           │
   ├─ POST /auth/logout ──────────>│                           │
   │  (Authorization header)        │ Extract usuario_id        │
   │                                │ from token                │
   │                                │                           │
   │                                ├─ Add to blacklist        │
   │                                │ (in-memory Set)           │
   │                                │                           │
   │                                ├─ UPDATE refresh_tokens ──>│
   │                                │  SET activo = false       │
   │                                │  WHERE usuario_id = ...   │
   │                                │<────────────────────────┤
   │                                │                           │
   │<─ 200 { mensaje }─────────────┤                           │
   │                                │                           │
   ├─ Clear localStorage            │                           │
   ├─ Stop auto-refresh             │                           │
   └─ Redirect to login page        │                           │
```

**Seguridad:**
- Token agregado a blacklist (prevenir reutilización)
- Todos los refresh tokens del usuario invalidados
- localStorage limpiado en frontend

---

### Flujo 5: Verificar Token (Protected Route)

```
FRONTEND                          BACKEND                    MIDDLEWARE
   │                                │                           │
   ├─ GET /api/inventario ────────>│ authMiddleware()          │
   │  (Authorization header)        │ ├─ Extract token          │
   │                                │ ├─ Verify signature       │
   │                                │ └─ Check blacklist        │
   │                                │                           │
   │<───────────────────────────────┤                           │
   │ ✓ Token valid                  │ ├─ req.usuario = decoded  │
   │ Proceeding...                  │ └─ next()                 │
   │                                │                           │
   │                                ├─ Route handler           │
   │                                │ (can access usuario_id)   │
   │<─ 200 { data }───────────────┤                           │
```

**En caso de token inválido/expirado:**
```json
{
  "error": "No autorizado",
  "message": "Token expirado",
  "code": "TOKEN_EXPIRED"
}
```

Frontend maneja: intenta auto-refresh → si falla → redirige a login

---

## Token Management

### JWT Estructura

**Access Token (15 minutos):**
```javascript
{
  usuario_id: "uuid-...",
  email: "user@example.com",
  rol: "user",
  type: "access",
  iat: 1234567890,
  exp: 1234568790,
  iss: "maya-autopartes",
  aud: "maya-autopartes-api"
}
```

**Refresh Token (7 días):**
```javascript
{
  usuario_id: "uuid-...",
  email: "user@example.com",
  type: "refresh",
  jti: "uuid-...",  // Unique JWT ID para invalidación
  iat: 1234567890,
  exp: 1234648890,
  iss: "maya-autopartes",
  aud: "maya-autopartes-api"
}
```

### Token Storage

**Backend:**
- Access Token: En memoria (con blacklist)
- Refresh Token: En Supabase `refresh_tokens` tabla

**Frontend:**
- Access Token: localStorage → `ma_auth_token`
- Refresh Token: localStorage → `ma_refresh_token`
- User Info: localStorage → `ma_user_info`
- Expiry Time: localStorage → `ma_token_expiry`

### Token Lifecycle

```
1. LOGIN/REGISTER
   ├─ Generate Access Token (15m)
   ├─ Generate Refresh Token (7d)
   └─ Store Refresh Token in DB

2. REQUEST (with Access Token)
   ├─ Verify signature
   ├─ Check expiration
   └─ Check blacklist

3. TOKEN ABOUT TO EXPIRE (5 min before)
   ├─ AUTO-REFRESH triggers
   ├─ Invalidate old Refresh Token
   ├─ Generate new Access Token
   ├─ Generate new Refresh Token
   └─ Restart auto-refresh timer

4. LOGOUT
   ├─ Add Access Token to blacklist
   ├─ Invalidate all Refresh Tokens for user
   └─ Clear localStorage

5. REFRESH TOKEN EXPIRES (7 days)
   ├─ User must LOGIN again
   └─ No silent refresh possible
```

---

## Seguridad

### Mejores Prácticas Implementadas

✅ **Password Hashing:**
- Algoritmo: bcryptjs
- Salt rounds: 12 (configurable)
- Nunca almacenar password plano

✅ **Token Signing:**
- Algoritmo: HS256 (HMAC-SHA256)
- Secret: Variable de entorno
- Verificación en cada request

✅ **Token Rotation:**
- Refresh token invalidado después de usar
- Nuevo refresh token generado
- Previene token reuse attacks

✅ **Rate Limiting:**
- Max 5 intentos / 15 minutos
- Por usuario (email) o IP
- Previene brute force

✅ **Auditoría:**
- Logging de login/logout
- Timestamp de último login
- Intentos fallidos registrados

✅ **Validación:**
- Email format validation
- Password strength requirements
- Input sanitization

✅ **HTTPS:**
- Tokens transportados solo en HTTPS (en producción)
- Secure flag en cookies (si se usan)

### Variables de Entorno

```bash
# .env (Backend)
JWT_SECRET=tu-secreto-super-seguro-cambiar-en-produccion
REFRESH_TOKEN_SECRET=tu-secreto-refresh-cambiar-en-produccion
NODE_ENV=production
SUPABASE_URL=https://...
SUPABASE_KEY=...
```

---

## Integración

### Uso en Backend Express

```javascript
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { createAuthRoutes } = require('./routes/auth-routes');
const { authMiddleware, rateLimitMiddleware } = require('./middleware/auth-middleware');

const app = express();
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Rutas de autenticación
app.use('/api/auth', createAuthRoutes(supabase));

// Proteger rutas con middleware
app.get('/api/usuarios/:usuario_id', 
  authMiddleware(supabase),
  (req, res) => {
    // req.usuario = { usuario_id, email, rol }
    // req.token = JWT token
  }
);

// Validar rol
app.delete('/api/usuarios/:usuario_id',
  authMiddleware(supabase),
  roleMiddleware('admin'),
  (req, res) => {
    // Solo admin puede acceder
  }
);

// Validar propiedad
app.put('/api/usuarios/:usuario_id/perfil',
  authMiddleware(supabase),
  ownershipMiddleware('usuario_id'),
  (req, res) => {
    // Usuario solo puede actualizar su perfil
  }
);
```

### Uso en Frontend

```javascript
// Inicializar cliente
const auth = new AuthClient('http://localhost:3000/api');

// Registrar
const result = await auth.register({
  email: 'user@example.com',
  password: 'SecurePass123',
  nombre: 'Juan Pérez',
  empresa: 'Mi Empresa'
});

// Login
const result = await auth.login('user@example.com', 'SecurePass123');

// Auto-refresh: automático cada 5 minutos

// Verificar autenticación
if (auth.isAuthenticated()) {
  const user = auth.getUserInfo();
  console.log(`Bienvenido ${user.nombre}`);
}

// Hacer request autenticado
const headers = {
  'Authorization': `Bearer ${auth.getToken()}`
};
fetch('/api/inventario', { headers })

// Logout
await auth.logout();

// Redirigir a login si no autenticado
if (!auth.isAuthenticated()) {
  auth.redirectToLogin(window.location.href);
}

// Callback si se pierde autenticación
auth.onUnauthorized((message) => {
  console.log('Se perdió la autenticación:', message);
  auth.redirectToLogin();
});
```

### HTML Login Page

```html
<!DOCTYPE html>
<html>
<head>
  <title>Login - Maya Autopartes</title>
  <script src="auth/auth-client.js"></script>
</head>
<body>
  <form id="loginForm">
    <input type="email" id="email" placeholder="Email" required>
    <input type="password" id="password" placeholder="Password" required>
    <button type="submit">Login</button>
  </form>

  <script>
    const auth = new AuthClient();
    const returnUrl = new URLSearchParams(location.search).get('returnUrl');

    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        
        await auth.login(email, password);
        
        // Redirect to dashboard or returnUrl
        window.location.href = returnUrl || '/index.html';
      } catch (error) {
        alert('Error: ' + error.message);
      }
    });
  </script>
</body>
</html>
```

---

## Casos de Uso Comunes

### 1. Proteger ruta backend
```javascript
app.get('/api/datos-privados', authMiddleware(supabase), (req, res) => {
  // Solo usuario autenticado puede acceder
  res.json({ usuario_id: req.usuario.usuario_id });
});
```

### 2. Verificar rol
```javascript
app.delete('/api/usuarios/:id', 
  authMiddleware(supabase),
  roleMiddleware('admin', 'moderador'),
  (req, res) => {
    // Solo admin o moderador
  }
);
```

### 3. Auto-refresh en frontend
```javascript
// Automático: AuthClient refresca 5 min antes de expiración
// No requiere código adicional
```

### 4. Cambiar contraseña
```javascript
const auth = new AuthClient();
await auth.changePassword('OldPassword123', 'NewPassword456');
// Todos los tokens se invalidan - requiere nuevo login
```

### 5. Manejar sesión expirada
```javascript
auth.onUnauthorized((message) => {
  showModal('Sesión expirada', message);
  setTimeout(() => auth.redirectToLogin(), 2000);
});
```

---

## Troubleshooting

| Problema | Causa | Solución |
|----------|-------|----------|
| Token inválido | Secret incorrecto | Verificar JWT_SECRET en .env |
| Token expirado | 15 min sin usar | Auto-refresh debe manejar |
| Refresh falla | Refresh token expirado | Usuario debe hacer login |
| CORS error | Origen no permitido | Configurar CORS en backend |
| Rate limit | Muchos intentos | Esperar 15 minutos |

---

## Próximos Pasos (Phase 2)

1. **Google OAuth** - Login con Google
2. **Two-Factor Auth (2FA)** - SMS o TOTP
3. **Social Logins** - GitHub, MercadoLibre
4. **Redis para Blacklist** - En lugar de in-memory Set
5. **Session Management** - Logout de todos los dispositivos
6. **Password Reset** - Email con link de reset

Consultar `OAUTH_NEXTPHASE.md` para más detalles.

---

**Documentado por:** Sistema de Autenticación JWT  
**Última actualización:** 2026-04-22
