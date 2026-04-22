# SECURITY IMPLEMENTATION - Maya Autopartes Phase 3
**Última actualización:** 2026-04-22  
**Versión:** 1.0.0  
**Estado:** ✅ Implementado  

---

## 📋 Tabla de Contenidos
1. [Visión General](#visión-general)
2. [Módulos de Seguridad](#módulos-de-seguridad)
3. [Protecciones Implementadas](#protecciones-implementadas)
4. [Guía de Integración](#guía-de-integración)
5. [Testing y Verificación](#testing-y-verificación)
6. [Logs de Seguridad](#logs-de-seguridad)

---

## 🔒 Visión General

Maya Autopartes incluye ahora un sistema completo de seguridad que protege contra:
- **XSS (Cross-Site Scripting)**: Sanitización de inputs y outputs
- **CSRF (Cross-Site Request Forgery)**: Token validation en cada acción sensible
- **SQL Injection**: Validación estricta de datos de entrada
- **Password Attacks**: Rate limiting, hashing fuerte, requisitos de complejidad
- **Session Hijacking**: SessionStorage seguro con expiración automática
- **Man-in-the-Middle**: Encriptación end-to-end de credenciales

---

## 🛠️ Módulos de Seguridad

### 1. `security.js` (300+ líneas)
**Responsabilidades:**
- Gestión de CSRF tokens
- Sanitización de inputs (XSS prevention)
- Encriptación con tweetnacl.js
- Rate limiting para login
- Session management
- Content Security Policy helpers
- Security logging

**Funciones principales:**

#### CSRF Token Management
```javascript
// Genera token seguro
const token = generateCSRFToken();

// Inicializa token en sesión
initCSRFToken();

// Valida token en operaciones sensibles
if (!validateCSRFToken(userToken)) {
  throw new Error('CSRF validation failed');
}
```

#### Sanitización XSS
```javascript
// Sanitiza inputs de usuario
const safe = sanitizeInput(userInput);

// Escapa HTML
const escaped = escapeHTML(userText);

// Valida URLs
if (isSafeURL(url)) {
  redirectTo(url);
}
```

#### Encriptación de Credenciales
```javascript
// Encripta contraseña/credencial
const encrypted = await encryptSensitiveData(
  JSON.stringify(credentials),
  masterPassword
);

// Desencripta cuando sea necesario
const decrypted = await decryptSensitiveData(
  encrypted,
  masterPassword
);
```

#### Rate Limiting
```javascript
// Registra intento de login
const attempt = recordLoginAttempt(email);

if (!attempt.allowed) {
  // Muestra tiempo de bloqueo
  showError(`Bloqueado: ${attempt.message}`);
} else {
  // Procesa login
  processLogin(email, password);
}

// Reset después de login exitoso
resetLoginAttempts(email);
```

#### Session Management
```javascript
// Crea sesión después de login
const session = createSession(userData);

// Obtiene sesión actual
const currentSession = getCurrentSession();

// Valida sesión
if (!isSessionValid()) {
  redirectToLogin();
}

// Logout
destroySession();
```

### 2. `validators.js` (200+ líneas)
**Responsabilidades:**
- RFC validation (México)
- Email validation
- Teléfono validation (formato mexicano)
- Validación de datos complejos
- Mensajes de error localizados
- Esquemas de validación

**Validadores por tipo:**

#### RFC (Registro Federal de Contribuyentes)
```javascript
const rfcValidation = validateRFC('ABC123456XYZ');
// Retorna: {valid: true, formatted: 'ABC123456XYZ', isPersonaFisica: true}
```

#### Teléfono Mexicano
```javascript
const phoneValidation = validatePhoneMX('5551234567');
// Retorna: {
//   valid: true,
//   formatted: '+52 555 123 4567',
//   digits: '5551234567',
//   areaCode: '555'
// }
```

#### Email
```javascript
const emailValidation = validateEmail('user@example.com');
// Retorna: {valid: true, normalized: 'user@example.com'}
```

#### Contraseña
```javascript
const passwordValidation = validatePassword(password);
// Verifica: minúsculas, mayúsculas, números, símbolos, 12+ caracteres
// Retorna: {
//   valid: true,
//   strength: 'Muy fuerte',
//   checks: {hasLower: true, hasUpper: true, ...}
// }
```

#### Validadores de Datos Complejos
```javascript
// Cliente
const clienteValidation = validateCliente({
  nombre: 'Taller García',
  rfc: 'TAL123456XYZ',
  telefono: '5551234567',
  email: 'contact@taller.com'
});

// Producto
const productoValidation = validateProducto({
  codigo: 'ALT-001',
  nombre: 'Alternador',
  precio: 450.50,
  cantidad: 10
});

// Venta
const ventaValidation = validateVenta({
  cliente: 'Taller García',
  fecha: '2026-04-22',
  items: [{producto: 'ALT-001', cantidad: 1, precio: 450.50}],
  total: 450.50
});

// Usuario
const usuarioValidation = validateUsuario({
  nombre: 'Juan',
  email: 'juan@maya.com',
  password: 'SecurePass123!@#',
  rol: 'vendedor'
}, isNew=true);
```

---

## 🔐 Protecciones Implementadas

### 1. XSS (Cross-Site Scripting)

**Método:** DOMPurify + Sanitización Nativa

```javascript
// Todos los inputs de usuario pasan por:
const safeInput = sanitizeInput(userInput);

// Ejemplo: Previene <script>alert('hack')</script>
// Resultado: "&lt;script&gt;alert('hack')&lt;/script&gt;"
```

**Integración:**
```html
<!-- Agregar DOMPurify en index.html (RECOMENDADO) -->
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"></script>
```

### 2. CSRF (Cross-Site Request Forgery)

**Método:** Token Validation en Operaciones Sensibles

```javascript
// 1. Inicializa token al cargar la app
initCSRFToken();

// 2. En cada operación sensible (crear venta, agregar cliente, etc):
function createVenta(ventaData) {
  const token = sessionStorage.getItem('csrf_token');
  
  if (!validateCSRFToken(token)) {
    throw new Error('CSRF validation failed');
  }
  
  // Procesa venta...
}

// 3. Token se almacena en sessionStorage (no accesible vía JavaScript desde otras pestañas)
```

### 3. SQL Injection

**Método:** Validación Estricta + Sanitización

```javascript
// Ejemplo de validación antes de cualquier operación:
const clienteValidation = validateCliente(userInput);

if (!clienteValidation.valid) {
  // Rechaza si no cumple esquema
  showErrors(clienteValidation.errors);
  return;
}

// Solo procesa datos validados
saveCliente(clienteValidation.data);
```

**Tipos de validación:**
- RFC: Solo letras y dígitos en formato específico
- Email: Validación con regex strict
- Teléfono: Solo dígitos y caracteres especiales permitidos
- Nombres: Solo letras, espacios, acentos
- Números: Solo dígitos con decimales permitidos

### 4. Password Security

**Implementación:**

```javascript
// 1. Validación de complejidad
const strength = validatePassword(password);
// Requiere: mayúscula, minúscula, número, símbolo, 12+ caracteres

// 2. Hashing seguro (PBKDF2)
const hashedPassword = await hashPassword(password);
// Almacena hash en base de datos, NUNCA la contraseña en texto plano

// 3. Verificación
const isCorrect = await verifyPassword(userInput, storedHash);

// 4. Rate limiting después de intentos fallidos
const attempt = recordLoginAttempt(email);
if (!attempt.allowed) {
  // Bloquea por 30 minutos después de 5 intentos
  blockUser(email, attempt.bannedUntil);
}
```

### 5. Session Security

**Características:**
- ID único generado con `crypto.getRandomValues()`
- Expiración automática (1 hora por defecto)
- Almacenado en sessionStorage (no accesible entre pestañas)
- Último acceso trackeado automáticamente

```javascript
// Sesión se destruye automáticamente:
// - Al cerrar navegador (sessionStorage)
// - Después de 1 hora de inactividad
// - Al hacer logout

destroySession(); // Manual logout
```

### 6. Data Encryption

**Métodos disponibles:**

1. **TweetNaCl.js (Recomendado para máxima seguridad)**
   - Algorithm: XChaCha20-Poly1305
   - Propiedades: Modern, resistant a ataques, 256-bit

2. **Web Crypto API (Fallback nativo)**
   - Algorithm: AES-GCM
   - Propiedades: Nativa en navegadores modernos, 256-bit

**Uso:**
```javascript
// Encriptación
const encrypted = await encryptSensitiveData(
  JSON.stringify({apiKey: 'secret123', token: 'xyz'}),
  masterPassword
);

// Almacena encrypted en localStorage o cookie
localStorage.setItem('encrypted_creds', encrypted);

// Desencriptación cuando se necesita
const decrypted = await decryptSensitiveData(
  localStorage.getItem('encrypted_creds'),
  masterPassword
);

const credentials = JSON.parse(decrypted);
```

---

## 📚 Guía de Integración

### 1. Inicialización en `index.html`

```html
<!-- Al final del body, antes de cerrar -->
<script src="security.js"></script>
<script src="validators.js"></script>
<script>
  // Inicializa seguridad al cargar
  document.addEventListener('DOMContentLoaded', () => {
    initializeSecurity();
  });
</script>
```

### 2. Integración en `core.js`

```javascript
// Importar funciones de seguridad
import {
  sanitizeInput,
  validateCSRFToken,
  getCurrentSession,
  isSessionValid
} from './security.js';

import {
  validateCliente,
  validateProducto,
  validateVenta
} from './validators.js';

// En la función de guardar:
export function saveCliente(cliente) {
  // Sanitiza inputs
  const sanitized = {
    ...cliente,
    nombre: sanitizeInput(cliente.nombre),
    email: sanitizeInput(cliente.email || ''),
    telefono: sanitizeInput(cliente.telefono || '')
  };

  // Valida datos
  const validation = validateCliente(sanitized);
  if (!validation.valid) {
    throw new Error(`Validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
  }

  // Procesa con CSRF token
  const token = sessionStorage.getItem('csrf_token');
  if (!validateCSRFToken(token)) {
    throw new Error('CSRF validation failed');
  }

  // Guarda
  clientes.push(sanitized);
  sv();
}
```

### 3. Integración en `ui.js`

```javascript
// En handlers de formularios
function handleCreateCliente(formData) {
  try {
    // Validar
    const validation = validateCliente(formData);
    
    if (!validation.valid) {
      // Mostrar errores claros
      validation.errors.forEach(error => {
        showFieldError(error.field, error.message);
      });
      return;
    }

    // Guardar
    saveCliente(formData);
    showToast('✅ Cliente guardado exitosamente');
    
    // Resetear formulario
    resetForm();
    
  } catch (error) {
    console.error('Error:', error);
    showToast('❌ Error al guardar cliente');
  }
}

// En handlers de login
async function handleLogin(email, password) {
  try {
    // Validar inputs
    const emailValidation = validateEmail(email);
    const passwordValidation = validatePassword(password);
    
    if (!emailValidation.valid || !passwordValidation.valid) {
      showToast('Email o contraseña inválidos');
      return;
    }

    // Rate limiting
    const attempt = recordLoginAttempt(email);
    if (!attempt.allowed) {
      showToast(`❌ ${attempt.message}`);
      return;
    }

    // Verifica credenciales (ejemplo)
    const usuario = findUserByEmail(email);
    const isCorrect = await verifyPassword(password, usuario.passwordHash);
    
    if (!isCorrect) {
      showToast('Credenciales inválidas');
      return;
    }

    // Crea sesión
    const session = createSession(usuario);
    
    // Redirige a dashboard
    redirectToDashboard();
    
  } catch (error) {
    logSecurityEvent('Login error', 'warning', {error: error.message});
    showToast('Error en login');
  }
}
```

### 4. Variables de Configuración

En `security.js`, puedes ajustar:

```javascript
SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS = 5;           // Intentos antes de bloqueo
SECURITY_CONFIG.LOGIN_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;  // Ventana de tiempo
SECURITY_CONFIG.BAN_DURATION_MS = 30 * 60 * 1000; // Duración del bloqueo
SECURITY_CONFIG.SESSION_TIMEOUT_MS = 60 * 60 * 1000;  // Timeout de sesión
```

En `validators.js`:

```javascript
VALIDATION_CONFIG.MIN_PASSWORD_LENGTH = 12;
VALIDATION_CONFIG.MAX_PASSWORD_LENGTH = 128;
VALIDATION_CONFIG.MAX_TEXT_LENGTH = 255;
VALIDATION_CONFIG.PHONE_MIN_LENGTH = 10;
```

---

## 🧪 Testing y Verificación

### Test en Console

```javascript
// 1. Test CSRF
initCSRFToken();
console.log('CSRF Token:', sessionStorage.getItem('csrf_token'));
console.log('Validate:', validateCSRFToken(sessionStorage.getItem('csrf_token')));

// 2. Test Sanitización
console.log(sanitizeInput('<script>alert("xss")</script>'));
// Output: "&lt;script&gt;alert(\"xss\")&lt;/script&gt;"

// 3. Test Rate Limiting
recordLoginAttempt('test@example.com');
recordLoginAttempt('test@example.com');
recordLoginAttempt('test@example.com');
recordLoginAttempt('test@example.com');
recordLoginAttempt('test@example.com');
const attempt = recordLoginAttempt('test@example.com');
console.log('Blocked:', !attempt.allowed);

// 4. Test Validadores
console.log(validateRFC('ABC123456XYZ'));
console.log(validatePhoneMX('5551234567'));
console.log(validateEmail('user@example.com'));
console.log(validatePassword('SecurePass123!@#'));
```

### Checklist de Seguridad

- [ ] CSRF tokens generados y validados
- [ ] Inputs sanitizados antes de mostrarse
- [ ] Rate limiting en login funcional
- [ ] Session expira después de 1 hora
- [ ] Logs de seguridad en localStorage
- [ ] RFC validados correctamente
- [ ] Contraseñas hasheadas con PBKDF2
- [ ] Encriptación disponible (tweetnacl o WebCrypto)

---

## 📊 Logs de Seguridad

La aplicación registra automáticamente eventos de seguridad:

```javascript
// Acceder a logs
const logs = getSecurityLogs();
logs.forEach(log => {
  console.log(`[${log.timestamp}] ${log.event} (${log.severity})`);
  console.log(log.details);
});

// Limpiar logs (cuando sea necesario)
clearSecurityLogs();
```

**Eventos registrados automáticamente:**
- Security system initialized
- Login attempts (exitosos y fallidos)
- Failed validations
- CSRF token mismatches
- Session expirations
- Encryption/Decryption errors

---

## 📦 Dependencias Externas

### Recomendadas:
- **DOMPurify** (v3.0+): https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js
  - Para sanitización avanzada de HTML/DOM
  - Fallback nativo disponible si no se carga

- **TweetNaCl.js** (v1.0+): https://cdn.jsdelivr.net/npm/tweetnacl@1.0.3/nacl-fast.min.js
  - Para encriptación moderna (XChaCha20-Poly1305)
  - Fallback a WebCrypto API si no se carga

### Nativas (sin dependencias):
- `crypto.subtle` (Web Crypto API)
- `crypto.getRandomValues()`
- `sessionStorage` / `localStorage`
- `TextEncoder` / `TextDecoder`

---

## 🚀 Próximos Pasos Recomendados

1. **Implementar en servidor:**
   - Content-Security-Policy headers
   - X-Frame-Options: DENY
   - X-Content-Type-Options: nosniff
   - Strict-Transport-Security

2. **Backend validation:**
   - Repetir todas las validaciones en servidor
   - Nunca confiar solo en validación cliente

3. **Auditoría:**
   - Revisar logs de seguridad regularmente
   - Monitorear intentos de login fallidos

4. **Actualización de dependencias:**
   - Mantener DOMPurify actualizado
   - Mantener TweetNaCl.js actualizado
   - Monitorear CVEs

---

**Documento creado:** 2026-04-22  
**Última revisión:** 2026-04-22  
**Siguiente revisión:** 2026-05-22
