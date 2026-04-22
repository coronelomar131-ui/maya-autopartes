# BEST PRACTICES - Seguridad en Maya Autopartes
**Última actualización:** 2026-04-22  
**Versión:** 1.0.0  
**Nivel:** Producción  

---

## 📋 Tabla de Contenidos
1. [Principios Fundamentales](#principios-fundamentales)
2. [Seguridad del Cliente](#seguridad-del-cliente)
3. [Seguridad del Servidor](#seguridad-del-servidor)
4. [Gestión de Credenciales](#gestión-de-credenciales)
5. [Validación de Datos](#validación-de-datos)
6. [Gestión de Sesiones](#gestión-de-sesiones)
7. [Auditoría y Logging](#auditoría-y-logging)
8. [Incidentes de Seguridad](#incidentes-de-seguridad)
9. [Checklist Mensual](#checklist-mensual)

---

## 🔐 Principios Fundamentales

### 1. Defense in Depth (Defensa en Profundidad)

No confíes en una sola capa de seguridad. Implementa múltiples capas:

```
┌─────────────────────────────────┐
│   1. Client-Side Validation     │ (Primera línea)
├─────────────────────────────────┤
│   2. CSRF Token Validation      │
├─────────────────────────────────┤
│   3. Data Sanitization          │
├─────────────────────────────────┤
│   4. Authentication             │
├─────────────────────────────────┤
│   5. Authorization              │
├─────────────────────────────────┤
│   6. Server-Side Validation     │ (Si tienes backend)
├─────────────────────────────────┤
│   7. Database Encryption        │
├─────────────────────────────────┤
│   8. Logging & Monitoring       │ (Última línea)
└─────────────────────────────────┘
```

### 2. Principio del Menor Privilegio

Cada usuario/componente debe tener solo los permisos mínimos necesarios:

```javascript
// ✅ BIEN: Roles específicos con permisos limitados
const roles = {
  admin: ['read', 'write', 'delete', 'users', 'reports'],
  gerente: ['read', 'write', 'reports'],
  vendedor: ['read', 'write:own'],
  usuario: ['read:own']
};

// ❌ MAL: Usuario puede hacer todo
const user = {
  rol: 'user',
  canDoAnything: true // ❌ NO hacer esto
};
```

### 3. Zero Trust

No confíes en nada. Valida todo, siempre:

```javascript
// ✅ BIEN: Valida incluso datos que parecen seguros
async function updateCliente(id, data) {
  // Valida ID
  if (!validatePositiveNumber(id).valid) {
    throw new Error('Invalid ID');
  }

  // Valida datos
  const validation = validateCliente(data);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors}`);
  }

  // Valida sesión
  if (!isSessionValid()) {
    throw new Error('Session expired');
  }

  // Valida CSRF
  if (!validateCSRFToken(data.csrf_token)) {
    throw new Error('CSRF token invalid');
  }

  // Recién entonces procesa
  updateClienteInDB(id, data);
}

// ❌ MAL: Confía en el cliente
function updateCliente(id, data) {
  // Asume que todo es válido y seguro
  db.clientes[id] = data; // ❌ NO hacer esto
}
```

### 4. Fail Secure

En caso de error, rehúsa la operación (en lugar de fallar abierto):

```javascript
// ✅ BIEN: Rechaza si algo falla
async function processPayment(amount, creditCard) {
  try {
    const validated = validateCreditCard(creditCard);
    if (!validated.valid) {
      throw new Error('Invalid card');
    }

    const encrypted = await encryptCard(creditCard);
    if (!encrypted) {
      throw new Error('Encryption failed');
    }

    return processWithPaymentGateway(encrypted);

  } catch (error) {
    // REHÚSA la operación
    logSecurityEvent('Payment processing failed', 'critical', {error});
    return {success: false, message: 'Unable to process payment'};
  }
}

// ❌ MAL: Continúa aunque falle
function processPayment(amount, creditCard) {
  try {
    encrypt(creditCard);
  } catch (e) {
    // Procesa sin encriptación ❌
    processWithPaymentGateway(creditCard);
  }
}
```

---

## 🖥️ Seguridad del Cliente

### 1. Sanitización de Inputs

**Regla:** Todo input es hostil hasta que se demuestre lo contrario.

```javascript
// Función universal para procesar inputs
function processUserInput(input, type = 'text') {
  // 1. Sanitiza
  let sanitized = sanitizeInput(input);

  // 2. Valida según tipo
  let validation;
  switch (type) {
    case 'email':
      validation = validateEmail(sanitized);
      break;
    case 'phone':
      validation = validatePhoneMX(sanitized);
      break;
    case 'rfc':
      validation = validateRFC(sanitized);
      break;
    case 'number':
      validation = validateNumber(sanitized);
      break;
    default:
      validation = validateRequired(sanitized);
  }

  if (!validation.valid) {
    return {valid: false, message: validation.message};
  }

  // 3. Escapa para mostrar en HTML
  const escaped = escapeHTML(sanitized);

  return {
    valid: true,
    sanitized: sanitized,
    escaped: escaped,
    validation: validation
  };
}

// Uso:
const userInput = '<img src=x onerror="alert(1)">';
const result = processUserInput(userInput, 'text');
// result.sanitized = '<img src=x onerror="alert(1)">' (limpio)
// result.escaped = '&lt;img src=x onerror="alert(1)"&gt;' (escapado)
```

### 2. Protección contra XSS

**Nunca** insertes input de usuario directamente en HTML:

```javascript
// ❌ MAL: XSS vulnerability
function displayCliente(cliente) {
  document.getElementById('cliente-name').innerHTML = cliente.nombre; // ❌
}

// ✅ BIEN: Usa textContent o DOMPurify
function displayCliente(cliente) {
  // Opción 1: textContent (mejor para texto simple)
  document.getElementById('cliente-name').textContent = cliente.nombre;

  // Opción 2: DOMPurify (mejor para HTML complejo)
  if (typeof DOMPurify !== 'undefined') {
    const safe = DOMPurify.sanitize(cliente.nombre);
    document.getElementById('cliente-name').innerHTML = safe;
  }
}
```

### 3. Content Security Policy

Implementa CSP headers en tu servidor:

```html
<!-- En HTML (fallback si servidor no lo soporta) -->
<meta http-equiv="Content-Security-Policy" 
      content="default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;">

<!-- O en servidor (MEJOR) -->
<!-- Apache: .htaccess -->
Header set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"

<!-- Nginx: nginx.conf -->
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'";

<!-- Express (Node.js) -->
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'");
  next();
});
```

### 4. HTTPS Obligatorio

```javascript
// Detecta si estamos en HTTP y advierte
if (window.location.protocol !== 'https:' && !window.location.hostname.includes('localhost')) {
  console.warn('⚠️ No estás en HTTPS. Algunos features de seguridad pueden no funcionar.');
  logSecurityEvent('HTTP detected', 'warning', {
    url: window.location.href
  });
}
```

---

## 🔧 Seguridad del Servidor (Backend)

### 1. Validación en Servidor (CRÍTICO)

**NUNCA** confíes solo en validación del cliente.

```javascript
// SERVIDOR - Ejemplo con Node.js/Express
app.post('/api/clientes', (req, res) => {
  // 1. Valida CSRF token
  const token = req.headers['x-csrf-token'];
  if (!validateCSRFToken(token, req.session)) {
    return res.status(403).json({error: 'CSRF validation failed'});
  }

  // 2. Valida datos (NUEVAMENTE en servidor)
  const validation = validateCliente(req.body);
  if (!validation.valid) {
    return res.status(400).json({errors: validation.errors});
  }

  // 3. Sanitiza
  const sanitized = sanitizeClienteData(req.body);

  // 4. Verifica autorización
  if (!canUserCreateCliente(req.user)) {
    return res.status(403).json({error: 'Not authorized'});
  }

  // 5. Guarda en base de datos
  const cliente = createCliente(sanitized);

  // 6. Log
  logAudit('cliente_created', {
    userId: req.user.id,
    clienteId: cliente.id,
    timestamp: new Date()
  });

  res.json({success: true, cliente});
});
```

### 2. Headers de Seguridad

Configura estos headers en tu servidor:

```javascript
// Express middleware
app.use((req, res, next) => {
  // Previene clickjacking
  res.setHeader('X-Frame-Options', 'DENY');

  // Previene MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // XSS protection (navegadores antiguos)
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // HSTS (para HTTPS)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');

  // Permisos de features
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  next();
});
```

### 3. Rate Limiting (Servidor)

```javascript
// Implementar rate limiting en servidor
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo 100 requests por ventana
  message: 'Too many requests, please try again later'
});

// Stricter limiter for login
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Máximo 5 intentos de login
  skipSuccessfulRequests: true // No cuenta si login fue exitoso
});

app.post('/api/login', loginLimiter, (req, res) => {
  // Procesa login
});
```

### 4. SQL Injection Prevention

```javascript
// ❌ MAL: SQL injection vulnerable
const query = `SELECT * FROM clientes WHERE nombre = '${req.body.nombre}'`;
db.query(query);

// ✅ BIEN: Usa prepared statements
const query = 'SELECT * FROM clientes WHERE nombre = ?';
db.query(query, [req.body.nombre]);

// ✅ MEJOR: Con ORM (Sequelize, TypeORM, etc)
const cliente = await Cliente.findOne({
  where: {nombre: req.body.nombre}
});

// ✅ O con validación estricta
const {valid, errors} = validateCliente(req.body);
if (!valid) {
  return res.status(400).json({errors});
}
// Recién entonces procesa los datos
```

---

## 🔑 Gestión de Credenciales

### 1. Contraseñas de Usuario

```javascript
// ✅ BIEN: Validación y hash
async function registerUser(email, password) {
  // Valida contraseña
  const validation = validatePassword(password);
  if (!validation.valid) {
    return {error: validation.message};
  }

  // Hashea (irreversible)
  const passwordHash = await hashPassword(password);

  // Almacena SOLO el hash
  const user = await User.create({
    email: email,
    passwordHash: passwordHash
    // NUNCA: password: password ❌
  });

  return {success: true, userId: user.id};
}

// ❌ MAL: Almacena contraseña en texto plano
async function registerUserBad(email, password) {
  const user = await User.create({
    email: email,
    password: password // ❌ NUNCA HACER ESTO
  });
}
```

### 2. API Keys / Tokens

```javascript
// ✅ BIEN: Encriptar y almacenar seguro
async function saveAPIKey(serviceName, apiKey) {
  // Valida formato básico
  if (!apiKey || apiKey.length < 20) {
    throw new Error('Invalid API key format');
  }

  // Encripta
  const encrypted = await encryptSensitiveData(
    JSON.stringify({service: serviceName, key: apiKey}),
    cfg.masterPassword
  );

  // Almacena encriptado
  cfg.encryptedKeys = cfg.encryptedKeys || {};
  cfg.encryptedKeys[serviceName] = encrypted;
  saveCfg();

  // LOG del acceso
  logSecurityEvent('API key saved', 'info', {
    service: serviceName,
    timestamp: new Date()
  });

  return {success: true};
}

// ❌ MAL: Guardar sin encriptar
async function saveAPIKeyBad(serviceName, apiKey) {
  cfg.apiKeys = cfg.apiKeys || {};
  cfg.apiKeys[serviceName] = apiKey; // ❌ Sin encriptar
  saveCfg();
}
```

### 3. Master Password

```javascript
// NUNCA almacenes la contraseña maestra de forma permanente

// ✅ BIEN: Pedir en cada sesión
function requestMasterPassword() {
  return new Promise((resolve) => {
    const password = prompt('Ingresa tu contraseña maestra:');
    
    if (!password) {
      logSecurityEvent('Master password prompt cancelled', 'warning');
      resolve(null);
      return;
    }

    // Valida que sea la correcta (verificar contra hash almacenado)
    if (!verifyMasterPassword(password)) {
      logSecurityEvent('Invalid master password', 'critical');
      alert('❌ Contraseña maestra incorrecta');
      resolve(null);
      return;
    }

    resolve(password);
  });
}

// Uso:
const masterPassword = await requestMasterPassword();
if (masterPassword) {
  const decrypted = await decryptSensitiveData(encrypted, masterPassword);
}

// ❌ MAL: Guardar en localStorage
localStorage.setItem('masterPassword', password); // ❌ NUNCA
sessionStorage.setItem('masterPassword', password); // ❌ NUNCA (bueno, pero mejor pedirla)
```

---

## ✅ Validación de Datos

### 1. Validación en Todos los Puntos

```javascript
// Arquitectura de validación en capas

// CAPA 1: Input del usuario
const userInput = sanitizeInput(formData.nombre);

// CAPA 2: Validación específica
const validation = validateRequired(userInput);
if (!validation.valid) {
  showError(validation.message);
  return;
}

// CAPA 3: Validación de negocio
const duplicate = findClienteByNombre(userInput);
if (duplicate) {
  showError('Este cliente ya existe');
  return;
}

// CAPA 4: Validación CSRF
const token = document.querySelector('[name="csrf"]').value;
if (!validateCSRFToken(token)) {
  throw new Error('CSRF failed');
}

// CAPA 5: Envío con seguridad
const response = await fetch('/api/clientes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': token
  },
  body: JSON.stringify({nombre: userInput})
});
```

### 2. Schema Validation

```javascript
// Definir esquemas reutilizables
const schemas = {
  cliente: {
    nombre: {
      required: true,
      type: 'string',
      validate: (v) => validateLength(v, 255)
    },
    email: {
      required: false,
      type: 'string',
      validate: (v) => validateEmail(v)
    },
    telefono: {
      required: false,
      type: 'string',
      validate: (v) => validatePhoneMX(v)
    },
    rfc: {
      required: false,
      type: 'string',
      validate: (v) => validateRFC(v)
    }
  },

  producto: {
    codigo: {
      required: true,
      type: 'string',
      validate: (v) => validateLength(v, 50)
    },
    nombre: {
      required: true,
      type: 'string',
      validate: (v) => validateLength(v, 255)
    },
    precio: {
      required: true,
      type: 'number',
      validate: (v) => validatePositiveNumber(v)
    },
    cantidad: {
      required: true,
      type: 'number',
      validate: (v) => validatePositiveNumber(v)
    }
  }
};

// Usar schemas
const result = validateSchema(data, schemas.cliente);
if (!result.valid) {
  return {error: formatErrors(result.errors)};
}
```

---

## 👤 Gestión de Sesiones

### 1. Session Lifecycle

```javascript
// 1. LOGIN
async function handleLogin(email, password) {
  // Rate limiting
  const attempt = recordLoginAttempt(email);
  if (!attempt.allowed) {
    showToast(attempt.message);
    return;
  }

  // Validación
  const emailVal = validateEmail(email);
  const passVal = validatePassword(password);
  
  if (!emailVal.valid || !passVal.valid) {
    showToast('Email o contraseña inválidos');
    return;
  }

  // Verificación
  const user = findUserByEmail(email);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    showToast('Credenciales incorrectas');
    logSecurityEvent('Failed login', 'warning', {email});
    return;
  }

  // Login exitoso
  resetLoginAttempts(email);
  const session = createSession(user);

  logSecurityEvent('User logged in', 'info', {
    userId: user.id,
    email: email
  });

  // Redirige
  window.location.href = '/dashboard';
}

// 2. USAGE (durante sesión activa)
function handleCreateCliente(formData) {
  // Verifica sesión
  if (!isSessionValid()) {
    showToast('Tu sesión expiró');
    redirectToLogin();
    return;
  }

  // Procesa normalmente
  const validation = validateCliente(formData);
  // ...
}

// 3. LOGOUT
function handleLogout() {
  logSecurityEvent('User logged out', 'info', {
    userId: getCurrentSession()?.userId
  });

  destroySession();
  window.location.href = '/login';
}

// 4. AUTO-LOGOUT (después de inactividad)
let inactivityTimer;

function resetInactivityTimer() {
  clearTimeout(inactivityTimer);

  inactivityTimer = setTimeout(() => {
    logSecurityEvent('Session timeout due to inactivity', 'info');
    destroySession();
    showToast('Tu sesión expiró por inactividad');
    redirectToLogin();
  }, SECURITY_CONFIG.SESSION_TIMEOUT_MS);
}

// Listeners para actividad
document.addEventListener('mousemove', resetInactivityTimer);
document.addEventListener('keypress', resetInactivityTimer);
document.addEventListener('click', resetInactivityTimer);
```

### 2. Session Storage vs LocalStorage

```javascript
// NUNCA guardes datos sensibles en localStorage
// ❌ localStorage persiste incluso después de cerrar navegador

// ✅ sessionStorage se borra al cerrar navegador
// Ideal para: token CSRF, session ID, datos temporales

// ✅ BIEN: Token CSRF en sessionStorage
sessionStorage.setItem('csrf_token', generateCSRFToken());

// ✅ BIEN: Session ID en sessionStorage
sessionStorage.setItem('session_id', session.id);

// ❌ MAL: Contraseña en localStorage
localStorage.setItem('password', password); // ❌

// ❌ MAL: API key en localStorage
localStorage.setItem('apiKey', apiKey); // ❌

// ✅ BIEN: Preferencias UI en localStorage (no sensible)
localStorage.setItem('theme', 'dark');
localStorage.setItem('language', 'es');
```

---

## 📊 Auditoría y Logging

### 1. Security Logging

```javascript
// Función centralizada para logs de seguridad
function logSecurityEvent(event, severity = 'info', details = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event: event,
    severity: severity, // 'info', 'warning', 'critical'
    details: details,
    userAgent: navigator.userAgent,
    url: window.location.href,
    userId: getCurrentSession()?.userId || null
  };

  // 1. Log en consola
  const colors = {
    info: 'color: blue;',
    warning: 'color: orange;',
    critical: 'color: red; font-weight: bold;'
  };
  console.log(`%c[${severity.toUpperCase()}]`, colors[severity], event, details);

  // 2. Almacena en localStorage (últimos 100 eventos)
  let logs = JSON.parse(localStorage.getItem('security_logs') || '[]');
  logs.push(logEntry);
  logs = logs.slice(-100);
  localStorage.setItem('security_logs', JSON.stringify(logs));

  // 3. Si es crítico, considera enviar al servidor
  if (severity === 'critical') {
    sendToSecurityServer(logEntry).catch(e => {
      console.error('Error sending security log:', e);
    });
  }

  return logEntry;
}

// Eventos a loguear
logSecurityEvent('CSRF token generated', 'info');
logSecurityEvent('Failed login attempt', 'warning', {email, attempts: 3});
logSecurityEvent('Possible XSS attack blocked', 'critical', {input: '...'});
logSecurityEvent('Session timeout', 'info');
logSecurityEvent('Decryption failed', 'critical', {reason: 'Invalid password'});
```

### 2. Auditoría de Cambios

```javascript
// Log de todas las operaciones CRUD
function logAuditTrail(operation, entity, entityId, changes) {
  const session = getCurrentSession();

  const auditLog = {
    timestamp: new Date().toISOString(),
    operation: operation, // 'CREATE', 'READ', 'UPDATE', 'DELETE'
    entity: entity, // 'cliente', 'producto', 'venta'
    entityId: entityId,
    userId: session?.userId,
    userEmail: session?.email,
    changes: changes, // {before: {...}, after: {...}}
    ipAddress: getClientIPAddress(),
    userAgent: navigator.userAgent
  };

  // Almacena
  let auditLogs = JSON.parse(localStorage.getItem('audit_logs') || '[]');
  auditLogs.push(auditLog);
  auditLogs = auditLogs.slice(-500); // Últimas 500
  localStorage.setItem('audit_logs', JSON.stringify(auditLogs));

  // Envía al servidor si es importante
  if (['DELETE', 'UPDATE'].includes(operation)) {
    sendAuditToServer(auditLog);
  }
}

// Uso:
function updateCliente(id, newData) {
  const oldData = findClienteById(id);

  // Actualiza
  Object.assign(oldData, newData);
  sv();

  // Logue cambio
  logAuditTrail('UPDATE', 'cliente', id, {
    before: oldData,
    after: newData
  });
}
```

### 3. Monitoreo de Seguridad

```javascript
// Dashboard de seguridad
function getSecurityDashboard() {
  const logs = getSecurityLogs();
  const auditLogs = JSON.parse(localStorage.getItem('audit_logs') || '[]');

  const failedLogins = logs.filter(l => l.event.includes('login')).length;
  const criticalEvents = logs.filter(l => l.severity === 'critical').length;
  const dataChanges = auditLogs.filter(l => ['UPDATE', 'DELETE'].includes(l.operation)).length;

  return {
    failedLogins: failedLogins,
    criticalEvents: criticalEvents,
    dataChanges: dataChanges,
    lastLogin: logs.find(l => l.event === 'User logged in')?.timestamp,
    recentEvents: logs.slice(-10)
  };
}

// Mostrar en UI
const dashboard = getSecurityDashboard();
console.table(dashboard);
```

---

## 🚨 Incidentes de Seguridad

### 1. Plan de Respuesta

```javascript
// Si detectas un incidente de seguridad:

async function handleSecurityIncident(incident) {
  // 1. LOG INMEDIATAMENTE
  logSecurityEvent('SECURITY INCIDENT', 'critical', {
    type: incident.type,
    severity: incident.severity,
    description: incident.description
  });

  // 2. NOTIFICA AL ADMINISTRADOR
  notifySecurityAdmin(incident);

  // 3. TOMA ACCIONES SEGÚN TIPO
  switch (incident.type) {
    case 'POSSIBLE_XSS':
      // Limpia localStorage
      localStorage.clear();
      // Redirige
      window.location.href = '/security-alert';
      break;

    case 'CSRF_FAILED':
      // Regenera CSRF token
      initCSRFToken();
      // Notifica usuario
      showToast('Por seguridad, por favor reinicia tu sesión');
      // Logout
      destroySession();
      break;

    case 'BRUTE_FORCE':
      // Bloquea usuario
      blockUser(incident.userId);
      // Resetea intentos
      resetLoginAttempts(incident.email);
      break;

    case 'ENCRYPTION_FAILURE':
      // No proceses datos sensibles
      showToast('Error de seguridad. Por favor contacta soporte.');
      break;
  }

  // 4. CREA BACKUP DE LOGS
  backupSecurityLogs();
}

// Detectar incidentes
try {
  const decrypted = await decryptSensitiveData(encrypted, password);
} catch (error) {
  handleSecurityIncident({
    type: 'ENCRYPTION_FAILURE',
    severity: 'critical',
    description: error.message
  });
}
```

### 2. Escalation Procedure

```javascript
// Si es incidente crítico:

async function escalateIncident(incident) {
  // 1. Notifica por todos los canales
  await notifySecurityTeam(incident);
  await sendEmailAlert(incident);
  await logToExternalService(incident);

  // 2. Puede hacer logout a todos los usuarios
  if (incident.severity === 'critical') {
    // Invalida todas las sesiones
    invalidateAllSessions();

    // Muestra mensaje en app
    showBanner('La aplicación está en mantenimiento de seguridad. Por favor vuelve a iniciar sesión.');
  }

  // 3. Preserva evidencia
  preserveForensics(incident);
}
```

---

## 📋 Checklist Mensual

Ejecuta este checklist cada mes:

```javascript
// SECURITY_CHECKLIST.js

async function runMonthlySecurityCheck() {
  console.log('=== MONTHLY SECURITY CHECKLIST ===\n');

  const checks = {
    // 1. ENCRYPTION
    encryptionWorking: await testEncryption(),
    tweetnacl: isTweetNaClAvailable(),
    dompurify: typeof DOMPurify !== 'undefined',

    // 2. AUTHENTICATION
    sessionExpirationWorks: testSessionExpiration(),
    passwordHashingWorks: await testPasswordHashing(),
    csrf: testCSRF(),

    // 3. LOGGING
    securityLogsActive: getSecurityLogs().length > 0,
    auditLogsActive: JSON.parse(localStorage.getItem('audit_logs') || '[]').length > 0,

    // 4. DATA
    noPlaintextPasswords: !checkPlaintextPasswords(),
    noExposedCredentials: !checkExposedCredentials(),

    // 5. DEPENDENCIES
    librariesUpdated: checkLibraryVersions(),

    // 6. CONFIGURATION
    cspHeaders: checkCSP(),
    httpsEnabled: window.location.protocol === 'https:' || window.location.hostname === 'localhost'
  };

  // Report
  console.table(checks);

  // Identifica issues
  const issues = Object.entries(checks)
    .filter(([_, value]) => value === false)
    .map(([key, _]) => key);

  if (issues.length > 0) {
    console.warn('❌ ISSUES FOUND:', issues);
    notifySecurityAdmin({
      type: 'MONTHLY_CHECK_FAILED',
      issues: issues
    });
  } else {
    console.log('✅ ALL CHECKS PASSED');
  }

  return checks;
}

// Ejecuta mensualmente
// En desarrollo: runMonthlySecurityCheck()
// En producción: Configurar cron job en servidor
```

### Items del Checklist:

- [ ] Encriptación funciona (TweetNaCl o WebCrypto)
- [ ] DOMPurify está cargado
- [ ] CSRF token generado y validado
- [ ] Sesiones expiran correctamente
- [ ] Logs de seguridad están activos
- [ ] No hay contraseñas en texto plano
- [ ] No hay API keys expuestas
- [ ] Validación ocurre en cliente Y servidor
- [ ] Rate limiting funciona
- [ ] Headers de seguridad configurados
- [ ] HTTPS habilitado (producción)
- [ ] Dependencias actualizadas
- [ ] Backup de logs
- [ ] Permisos de archivos correctos
- [ ] Sesiones de otros navegadores funcional

---

## 🔗 Referencias Externas

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE Top 25](https://cwe.mitre.org/top25/)

---

**Documento creado:** 2026-04-22  
**Última revisión:** 2026-04-22  
**Frecuencia de revisión:** Mensual  
**Siguiente revisión:** 2026-05-22
