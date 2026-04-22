# JWT_SECURITY.md - Mejores Prácticas de Seguridad

**Versión:** 1.0.0  
**Fecha:** 2026-04-22  
**Tipo:** Guía de Seguridad para Autenticación JWT

---

## 📋 Contenido

1. [JWT Fundamentals](#jwt-fundamentals)
2. [Seguridad de Contraseñas](#seguridad-de-contraseñas)
3. [Token Management](#token-management)
4. [Almacenamiento](#almacenamiento)
5. [Transporte](#transporte)
6. [Validación](#validación)
7. [Protección contra Ataques](#protección-contra-ataques)
8. [Checklist de Producción](#checklist-de-producción)
9. [Monitoreo y Alertas](#monitoreo-y-alertas)

---

## JWT Fundamentals

### ¿Qué es JWT?

JWT (JSON Web Token) es un estándar (RFC 7519) para transmitir información de forma segura entre partes.

**Estructura:**
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U
│                                           │                                       │
│─────────────────────────────────────────│─────────────────────────────────────│
        Header (Base64URL)              Payload (Base64URL)                   Signature
```

**Header:**
```json
{
  "alg": "HS256",      // Algoritmo de firma
  "typ": "JWT"         // Tipo de token
}
```

**Payload:**
```json
{
  "usuario_id": "uuid-123",
  "email": "user@example.com",
  "rol": "user",
  "iat": 1234567890,   // Emitido en (issued at)
  "exp": 1234568790,   // Expira en (expiration time)
  "iss": "maya-autopartes"  // Emisor
}
```

**Signature:**
```
HMACSHA256(
  base64UrlEncode(header) + "." + base64UrlEncode(payload),
  "secret-key"
)
```

### ¿Por qué JWT?

✅ **Stateless** - No requiere almacenar sesiones en servidor  
✅ **Escalable** - Funciona con múltiples servidores  
✅ **Seguro** - Firmado y verificable  
✅ **Auto-contenido** - Toda info en el token  
✅ **CORS-friendly** - Funciona bien con CORS  

⚠️ **Limitaciones:**
- No revocable inmediatamente (por eso tenemos blacklist)
- Tamaño mayor que cookies
- Requiere HTTPS en producción

---

## Seguridad de Contraseñas

### Hashing con bcrypt

**Implementado en:** `backend/auth/auth.js`

```javascript
const bcrypt = require('bcryptjs');

// Hash con 12 salt rounds
const passwordHash = await bcrypt.hash(password, 12);

// Verificar
const matches = await bcrypt.compare(userInput, passwordHash);
```

### ¿Por qué bcrypt?

✅ **Adaptativo** - Se ajusta según capacidad computacional  
✅ **Lento** - Imposibilita ataques por fuerza bruta  
✅ **Salts** - Genera random salt para cada hash  
✅ **Industria-estándar** - Ampliamente auditado  

### Requisitos de Contraseña

Implementados en validación de registro:

```javascript
// Mínimo 8 caracteres
password.length >= 8

// Al menos una mayúscula
/[A-Z]/.test(password)

// Al menos un número
/[0-9]/.test(password)
```

**Ejemplo fuerte:** `SecurePass123`  
**Ejemplo débil:** `password123` (sin mayúscula)

### Nunca:
❌ Almacenar contraseñas en texto plano  
❌ Usar SHA256 para passwords (usarlo para hashes de tokens)  
❌ Usar mismo password para múltiples servicios  
❌ Enviar password por email  

---

## Token Management

### Expiración de Tokens

**Access Token:** 15 minutos
```javascript
const expiryMs = 15 * 60 * 1000;
```

**Refresh Token:** 7 días
```javascript
const expiryMs = 7 * 24 * 60 * 60 * 1000;
```

### ¿Por qué esta duración?

| Token | Duración | Razón |
|-------|----------|-------|
| Access | 15 min | Minimiza ventana de compromiso si se roba |
| Refresh | 7 días | Balance entre comodidad y seguridad |
| Session | Usuario | En navegador, persiste login |

### Token Rotation

**Implementado en:** `authManager.refreshAccessToken()`

```javascript
// Cuando se refrescar token:
1. Validar refresh token antiguo
2. Invalidar refresh token antiguo en BD
3. Generar nuevo access token
4. Generar nuevo refresh token
5. Guardar nuevo refresh token en BD
```

**Ventajas:**
- Si refresh token se roba, es válido solo una vez
- Compromiso detectado cuando se intenta reusar

### Token Revocation (Blacklist)

**Implementado en:** `backend/auth/auth.js`

```javascript
// In-memory blacklist
const tokenBlacklist = new Set();

// Logout añade a blacklist
tokenBlacklist.add(token);

// Verificación en middleware
if (tokenBlacklist.has(token)) {
  throw new Error('Token ha sido invalidado');
}
```

⚠️ **En Producción:** Usar Redis en lugar de Set en memoria

```javascript
// redis-ejemplo.js
const redis = require('redis');
const client = redis.createClient();

// Logout
await client.setex(`blacklist:${token}`, 900, 'true'); // 15 min TTL

// Verificar
const isBlacklisted = await client.exists(`blacklist:${token}`);
```

---

## Almacenamiento

### Frontend Storage

**localStorage vs sessionStorage vs Cookies**

| Tipo | Duración | XSS | CSRF | Recomendación |
|------|----------|-----|------|-----------------|
| localStorage | Hasta borrar | ⚠️ Riesgo | ✓ Inmune | ✓ Usamos esto |
| sessionStorage | Hasta cerrar tab | ⚠️ Riesgo | ✓ Inmune | Alternativa |
| Cookies Secure | Configurable | ✓ Seguro | ⚠️ Riesgo | Para cookies |

**Implementado:** localStorage con nombres seguros
```javascript
const TOKEN_KEY = 'ma_auth_token';      // Nombre descriptivo
const REFRESH_TOKEN_KEY = 'ma_refresh_token';
const USER_INFO_KEY = 'ma_user_info';
```

### Backend Storage

**Tabla `usuarios`:**
```sql
CREATE TABLE usuarios (
  usuario_id UUID PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,  -- Nunca plano!
  nombre VARCHAR(255) NOT NULL,
  empresa VARCHAR(255),
  rol VARCHAR(50) DEFAULT 'user',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP,
  last_login TIMESTAMP
);
```

**Tabla `refresh_tokens`:**
```sql
CREATE TABLE refresh_tokens (
  token_id UUID PRIMARY KEY,
  usuario_id UUID REFERENCES usuarios(usuario_id),
  token_hash VARCHAR(255) NOT NULL,    -- Hash del token, no el token!
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL,
  
  INDEX idx_usuario_id (usuario_id),
  INDEX idx_expires_at (expires_at)
);
```

**Importante:** Guardar `token_hash`, no el token completo

```javascript
// backend/auth/auth.js
_hashToken(token) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(token).digest('hex');
}
```

---

## Transporte

### HTTPS Obligatorio

✅ **En producción:** HTTPS con TLS 1.2+

```javascript
// Forzar HTTPS en Express
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.header('x-forwarded-proto') !== 'https') {
    res.redirect(`https://${req.header('host')}${req.url}`);
  } else {
    next();
  }
});
```

### Headers Seguros

```javascript
const helmet = require('helmet');
app.use(helmet());

// Específicamente:
app.use(helmet.strictTransportSecurity({
  maxAge: 31536000,  // 1 año
  includeSubDomains: true,
  preload: true
}));

// CSP para prevenir XSS
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
  }
}));
```

### CORS Configuración

```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
```

---

## Validación

### Validación en Register

```javascript
// backend/routes/auth-routes.js
[
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email válido requerido'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Mínimo 8 caracteres')
    .matches(/[A-Z]/)
    .withMessage('Debe contener mayúscula')
    .matches(/[0-9]/)
    .withMessage('Debe contener número'),
  
  body('nombre')
    .trim()
    .notEmpty()
    .isLength({ min: 2 })
    .withMessage('Nombre mínimo 2 caracteres')
]
```

### Validación en Login

```javascript
[
  body('email')
    .isEmail()
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Contraseña requerida')
    // No validar fuerza (ya está registrada)
]
```

### JWT Verification

```javascript
// backend/auth/auth.js
verifyToken(token) {
  if (!token) {
    throw new Error('Token requerido');
  }

  // Check blacklist
  if (tokenBlacklist.has(token)) {
    throw new Error('Token ha sido invalidado');
  }

  try {
    const decoded = jwt.verify(token, this.jwtSecret);
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Token expirado');
    }
    if (error.name === 'JsonWebTokenError') {
      throw new Error('Token inválido');
    }
    throw error;
  }
}
```

---

## Protección contra Ataques

### 1. Brute Force Attack

**Ataque:** Intentar múltiples contraseñas

**Protección - Rate Limiting:**
```javascript
// backend/middleware/auth-middleware.js
const rateLimitMiddleware = () => {
  const MAX_ATTEMPTS = 5;
  const WINDOW_MS = 15 * 60 * 1000;
  
  return (req, res, next) => {
    // 5 intentos máximo en 15 minutos
  }
}
```

**En producción:** Usar `express-rate-limit` con Redis

```javascript
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

const limiter = rateLimit({
  store: new RedisStore({
    client: redis.createClient(),
    prefix: 'rl:'
  }),
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Demasiados intentos fallidos'
});

app.post('/auth/login', limiter, loginHandler);
```

### 2. Token Theft

**Ataque:** Robar token del localStorage

**Protección:**
1. **XSS Prevention** - Content Security Policy
2. **Token Rotation** - Refresh token invalida al usar
3. **Short Expiry** - Token dura solo 15 minutos
4. **HTTPS** - En tránsito no se puede interceptar

```javascript
// Content Security Policy
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"],  // No inline scripts!
    styleSrc: ["'self'", "'unsafe-inline'"],
  }
}));
```

### 3. Token Tampering

**Ataque:** Modificar payload del JWT

**Protección:** Validación de firma
```javascript
// Se valida automáticamente en verifyToken()
// Si signature es inválida → error de verificación
const decoded = jwt.verify(token, secret); // Falla si modificado
```

### 4. CSRF (Cross-Site Request Forgery)

**Ataque:** Hacer request en nombre del usuario

**Protección:** No usar cookies, usar Authorization header
```javascript
// Nuestro sistema no es vulnerable porque:
// 1. Usamos Authorization header (no cookies)
// 2. CORS valida origen
// 3. Tokens muy corta duración
```

### 5. Man-in-the-Middle (MITM)

**Ataque:** Interceptar token en tránsito

**Protección:**
1. **HTTPS obligatorio** - En producción
2. **HSTS** - Force HTTPS
3. **No HTTP fallback**

```javascript
// Force HTTPS
app.use((req, res, next) => {
  if (req.header('x-forwarded-proto') !== 'https') {
    return res.redirect(`https://${req.header('host')}${req.url}`);
  }
  next();
});

// HSTS Header
app.use(helmet.strictTransportSecurity({
  maxAge: 31536000,
  includeSubDomains: true
}));
```

### 6. Token Replay Attack

**Ataque:** Reusar refresh token después de expiración

**Protección:**
1. **Token Rotation** - Refresh token se invalida
2. **BD Storage** - Validar que existe en BD
3. **TTL** - Token expira en BD después de 7 días

```javascript
// En refreshAccessToken():
const { data: storedToken } = await supabase
  .from('refresh_tokens')
  .select('*')
  .eq('token_hash', tokenHash)
  .single();

if (!storedToken || !storedToken.activo) {
  throw new Error('Refresh token inválido');
}
```

---

## Checklist de Producción

### Antes de Deploy

- [ ] **Variables de Entorno**
  - [ ] `JWT_SECRET` - Mínimo 32 caracteres aleatorios
  - [ ] `REFRESH_TOKEN_SECRET` - Diferente de JWT_SECRET
  - [ ] `NODE_ENV=production`
  
- [ ] **Base de Datos**
  - [ ] Tabla `usuarios` creada con índices
  - [ ] Tabla `refresh_tokens` creada
  - [ ] Backups automáticos configurados
  - [ ] Acceso restringido a datos sensibles
  
- [ ] **HTTPS**
  - [ ] Certificado SSL/TLS válido
  - [ ] TLS 1.2 mínimo
  - [ ] HSTS header configurado
  
- [ ] **Rate Limiting**
  - [ ] Redis configurado (si usamos)
  - [ ] Rate limits en `/auth/login` y `/auth/register`
  - [ ] IP blocking para ataques DDoS
  
- [ ] **Logging y Monitoreo**
  - [ ] Logs de login/logout
  - [ ] Alertas para intentos fallidos
  - [ ] Monitoreo de performance
  
- [ ] **Seguridad de Aplicación**
  - [ ] Helmet.js activado
  - [ ] CORS correctamente configurado
  - [ ] No revelar detalles en errores
  - [ ] Input validation en todas las rutas
  
- [ ] **Token Blacklist**
  - [ ] Redis configurado para blacklist
  - [ ] TTL configurado (15 minutos)
  
- [ ] **Cookies (si se usan)**
  - [ ] HttpOnly flag
  - [ ] Secure flag (HTTPS solo)
  - [ ] SameSite=Strict

### Después de Deploy

- [ ] Monitoreo de login/logout en tiempo real
- [ ] Alertas para intentos de ataque
- [ ] Auditoría de acceso periódica
- [ ] Rotación de secrets cada 90 días
- [ ] Pruebas de seguridad regulares

---

## Monitoreo y Alertas

### Logging Crítico

```javascript
// Successful login
console.log({
  event: 'LOGIN_SUCCESS',
  usuario_id,
  email,
  ip: req.ip,
  timestamp: new Date()
});

// Failed login attempt
console.log({
  event: 'LOGIN_FAILED',
  email,
  reason: 'invalid_password',
  ip: req.ip,
  timestamp: new Date()
});

// Token refresh
console.log({
  event: 'TOKEN_REFRESH',
  usuario_id,
  old_token_jti,
  new_token_jti,
  timestamp: new Date()
});

// Logout
console.log({
  event: 'LOGOUT',
  usuario_id,
  email,
  session_duration: duration_ms,
  timestamp: new Date()
});
```

### Alertas Automáticas

```javascript
// Demasiados intentos fallidos
if (failedAttempts[email] > 5 in 15mins) {
  alertAdmin(`Brute force attempt: ${email}`);
}

// Token inusual
if (token.issued_from_new_ip && user.sensitive_data_access) {
  requireUserVerification();
}

// Tasa anormal de refresh
if (refreshCount > 100 per hour) {
  suspendAccount();
  alertUser('Suspicious activity detected');
}
```

### Métricas a Monitorear

| Métrica | Normal | Alerta |
|---------|--------|--------|
| Login failures/min | < 1 | > 5 |
| Token refresh rate | 1 per 10min | > 10 per min |
| Unique IPs per user | 1-3 | > 10 |
| Logout ratio | 80-90% | < 50% |

---

## Referencias

- [JWT.io](https://jwt.io) - Debugger y documentación
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [bcrypt.js Documentation](https://www.npmjs.com/package/bcryptjs)
- [jsonwebtoken Documentation](https://www.npmjs.com/package/jsonwebtoken)
- [Helmet.js Security Middleware](https://helmetjs.github.io/)

---

**Documentado por:** Equipo de Seguridad Maya Autopartes  
**Última revisión:** 2026-04-22  
**Próxima revisión:** 2026-07-22
