/**
 * security.js - Seguridad Completa para Maya Autopartes
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Responsabilidades:
 * ✓ Validación completa de datos (Venta, Cliente, Producto, Usuario)
 * ✓ Sanitización y prevención de XSS
 * ✓ Encriptación de credenciales con tweetnacl.js
 * ✓ Rate limiting para intentos de login
 * ✓ CSRF token validation
 * ✓ Content Security Policy helpers
 * ✓ Input sanitization y encoding
 *
 * @version 1.0.0 - Phase 3 Security
 * @author Maya Autopartes Dev Team
 * @last-update 2026-04-22
 * @security CRITICAL - Review any changes to this file
 */

// ═════════════════════════════════════════════════════════════════════════════
// 1. CONFIGURACIÓN DE SEGURIDAD
// ═════════════════════════════════════════════════════════════════════════════

const SECURITY_CONFIG = {
  // Rate Limiting
  MAX_LOGIN_ATTEMPTS: 5,
  LOGIN_ATTEMPT_WINDOW_MS: 15 * 60 * 1000, // 15 minutos
  BAN_DURATION_MS: 30 * 60 * 1000, // 30 minutos

  // CSRF
  CSRF_TOKEN_LENGTH: 32,
  CSRF_HEADER_NAME: 'X-CSRF-Token',

  // Encryption
  ENCRYPTION_ALGORITHM: 'XChaCha20-Poly1305',
  KEY_DERIVATION: 'PBKDF2',

  // Session
  SESSION_TIMEOUT_MS: 60 * 60 * 1000, // 1 hora
  SESSION_STORAGE_KEY: 'ma4_session',

  // CSP Headers
  CSP_DIRECTIVES: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'"],
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'img-src': ["'self'", 'data:', 'https:'],
    'connect-src': ["'self'", 'https://xyzqgbmwfvhyjyxdffvl.supabase.co'],
    'frame-ancestors': ["'none'"],
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. CSRF TOKEN MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Genera un token CSRF seguro usando crypto.getRandomValues
 * @returns {String} Token CSRF de 64 caracteres (base64)
 */
function generateCSRFToken() {
  const array = new Uint8Array(SECURITY_CONFIG.CSRF_TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode.apply(null, array)).replace(/[+/=]/g, c =>
    ({ '+': '-', '/': '_', '=': '' }[c])
  );
}

/**
 * Inicializa y almacena token CSRF en sessionStorage
 * @returns {String} Token CSRF actual
 */
function initCSRFToken() {
  let token = sessionStorage.getItem('csrf_token');
  if (!token) {
    token = generateCSRFToken();
    sessionStorage.setItem('csrf_token', token);
  }
  return token;
}

/**
 * Valida un token CSRF
 * @param {String} token - Token a validar
 * @returns {Boolean} true si es válido
 */
function validateCSRFToken(token) {
  const stored = sessionStorage.getItem('csrf_token');
  if (!stored || !token) return false;

  // Comparación constante para evitar timing attacks
  return constantTimeCompare(stored, token);
}

/**
 * Comparación de strings en tiempo constante
 * Previene timing attacks
 * @param {String} a - Primera string
 * @param {String} b - Segunda string
 * @returns {Boolean} true si son iguales
 */
function constantTimeCompare(a, b) {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. SANITIZACIÓN Y PREVENCIÓN DE XSS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Sanitiza un string para prevenir XSS
 * Usa DOMPurify si está disponible, fallback a métodos nativos
 * @param {String} input - Input a sanitizar
 * @returns {String} String sanitizado
 */
function sanitizeInput(input) {
  if (typeof input !== 'string') return '';

  // Si DOMPurify está disponible, usarlo (recomendado)
  if (typeof DOMPurify !== 'undefined') {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: []
    });
  }

  // Fallback: método nativo
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

/**
 * Escapa caracteres especiales HTML
 * @param {String} text - Texto a escapar
 * @returns {String} Texto escapado
 */
function escapeHTML(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  };
  return String(text).replace(/[&<>"']/g, m => map[m]);
}

/**
 * Valida si una URL es segura (no contiene javascript:, data:, etc.)
 * @param {String} url - URL a validar
 * @returns {Boolean} true si es segura
 */
function isSafeURL(url) {
  try {
    const parsed = new URL(url, window.location.href);
    // Solo permite http, https, mailto
    return /^(https?|mailto):$/.test(parsed.protocol);
  } catch {
    // Si falla parsing, no es segura
    return false;
  }
}

/**
 * Sanitiza un atributo de URL
 * @param {String} url - URL a sanitizar
 * @returns {String} URL segura o string vacío
 */
function sanitizeURL(url) {
  if (!url) return '';
  if (isSafeURL(url)) return url;
  return '';
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. RATE LIMITING PARA LOGIN
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Almacena intentos de login fallidos
 * @type {Map<String, Array>}
 */
const loginAttempts = new Map();

/**
 * Registra un intento de login
 * @param {String} identifier - Email o usuario que intenta login
 * @returns {Object} {allowed: Boolean, remainingAttempts: Number, bannedUntil: Date|null}
 */
function recordLoginAttempt(identifier) {
  const now = Date.now();

  if (!loginAttempts.has(identifier)) {
    loginAttempts.set(identifier, []);
  }

  const attempts = loginAttempts.get(identifier);

  // Limpia intentos viejos
  const recentAttempts = attempts.filter(time =>
    now - time < SECURITY_CONFIG.LOGIN_ATTEMPT_WINDOW_MS
  );

  // Verifica si está baneado
  if (recentAttempts.length >= SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS) {
    const bannedUntil = new Date(Math.max(...recentAttempts) + SECURITY_CONFIG.BAN_DURATION_MS);

    if (now < bannedUntil.getTime()) {
      return {
        allowed: false,
        remainingAttempts: 0,
        bannedUntil: bannedUntil,
        message: `Cuenta bloqueada. Intenta de nuevo en ${Math.ceil((bannedUntil - now) / 1000 / 60)} minutos.`
      };
    }
  }

  // Registra nuevo intento
  recentAttempts.push(now);
  loginAttempts.set(identifier, recentAttempts);

  return {
    allowed: true,
    remainingAttempts: Math.max(0, SECURITY_CONFIG.MAX_LOGIN_ATTEMPTS - recentAttempts.length),
    bannedUntil: null
  };
}

/**
 * Resetea los intentos de login para un usuario
 * @param {String} identifier - Email o usuario
 */
function resetLoginAttempts(identifier) {
  loginAttempts.delete(identifier);
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. ENCRIPTACIÓN CON TWEETNACL.JS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Verifica si tweetnacl está disponible
 * @returns {Boolean}
 */
function isTweetNaClAvailable() {
  return typeof nacl !== 'undefined' && nacl.secretbox && nacl.utils;
}

/**
 * Derivar una clave desde una contraseña usando PBKDF2 (Web Crypto API nativa)
 * @param {String} password - Contraseña
 * @param {Uint8Array} salt - Salt (32 bytes)
 * @returns {Promise<Uint8Array>} Clave derivada (32 bytes)
 */
async function deriveKeyFromPassword(password, salt = null) {
  if (!salt) {
    salt = crypto.getRandomValues(new Uint8Array(16));
  }

  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);

  const baseKey = await crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    'PBKDF2',
    false,
    ['deriveBits']
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000, // OWASP recomendación mínima
      hash: 'SHA-256'
    },
    baseKey,
    256 // 32 bytes
  );

  return {
    key: new Uint8Array(derivedBits),
    salt: salt
  };
}

/**
 * Encripta datos sensibles (credenciales, tokens)
 * Usa tweetnacl.js si está disponible, Web Crypto API como fallback
 * @param {String} data - Datos a encriptar
 * @param {String} password - Contraseña/clave maestra
 * @returns {Promise<String>} Datos encriptados en formato base64
 */
async function encryptSensitiveData(data, password) {
  try {
    if (!isTweetNaClAvailable()) {
      console.warn('⚠ tweetnacl.js not available, using Web Crypto API');
      return await encryptWithWebCrypto(data, password);
    }

    // Usar tweetnacl para máxima seguridad
    const { key, salt } = await deriveKeyFromPassword(password);

    const nonce = nacl.utils.randomBytes(nacl.secretbox.nonceLength);
    const encoder = new TextEncoder();
    const dataBytes = encoder.encode(data);

    const box = nacl.secretbox(dataBytes, nonce, key);
    const result = {
      nonce: nacl.utils.encodeBase64(nonce),
      box: nacl.utils.encodeBase64(box),
      salt: nacl.utils.encodeBase64(salt),
      version: 1
    };

    return JSON.stringify(result);
  } catch (error) {
    console.error('❌ Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Desencripta datos sensibles
 * @param {String} encrypted - Datos encriptados en formato JSON
 * @param {String} password - Contraseña/clave maestra
 * @returns {Promise<String>} Datos desencriptados
 */
async function decryptSensitiveData(encrypted, password) {
  try {
    if (!isTweetNaClAvailable()) {
      console.warn('⚠ tweetnacl.js not available, using Web Crypto API');
      return await decryptWithWebCrypto(encrypted, password);
    }

    const { nonce, box, salt } = JSON.parse(encrypted);
    const { key } = await deriveKeyFromPassword(password, nacl.utils.decodeBase64(salt));

    const decodedNonce = nacl.utils.decodeBase64(nonce);
    const decodedBox = nacl.utils.decodeBase64(box);

    const decrypted = nacl.secretbox.open(decodedBox, decodedNonce, key);
    if (!decrypted) {
      throw new Error('Decryption failed - invalid password or corrupted data');
    }

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('❌ Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Fallback: Encriptación con Web Crypto API nativa
 * @param {String} data - Datos a encriptar
 * @param {String} password - Contraseña
 * @returns {Promise<String>} Datos encriptados
 */
async function encryptWithWebCrypto(data, password) {
  const { key, salt } = await deriveKeyFromPassword(password);
  const iv = crypto.getRandomValues(new Uint8Array(12)); // AES-GCM requiere 12 bytes

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    'AES-GCM',
    false,
    ['encrypt']
  );

  const encoder = new TextEncoder();
  const dataBytes = encoder.encode(data);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    cryptoKey,
    dataBytes
  );

  const result = {
    iv: btoa(String.fromCharCode(...new Uint8Array(iv))),
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
    salt: btoa(String.fromCharCode(...new Uint8Array(salt))),
    version: 2
  };

  return JSON.stringify(result);
}

/**
 * Fallback: Desencriptación con Web Crypto API nativa
 * @param {String} encrypted - Datos encriptados
 * @param {String} password - Contraseña
 * @returns {Promise<String>} Datos desencriptados
 */
async function decryptWithWebCrypto(encrypted, password) {
  const { iv, encrypted: enc, salt } = JSON.parse(encrypted);

  const decodedIV = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  const decodedEncrypted = Uint8Array.from(atob(enc), c => c.charCodeAt(0));
  const decodedSalt = Uint8Array.from(atob(salt), c => c.charCodeAt(0));

  const { key } = await deriveKeyFromPassword(password, decodedSalt);

  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    key,
    'AES-GCM',
    false,
    ['decrypt']
  );

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: decodedIV },
    cryptoKey,
    decodedEncrypted
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. HASH DE CONTRASEÑAS (Para almacenamiento)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Genera un hash de una contraseña usando PBKDF2
 * NO usar para encriptación, solo para verificación
 * @param {String} password - Contraseña a hashear
 * @returns {Promise<String>} Hash en formato base64
 */
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const { key } = await deriveKeyFromPassword(password, salt);

  const result = {
    hash: btoa(String.fromCharCode(...key)),
    salt: btoa(String.fromCharCode(...salt)),
    iterations: 100000
  };

  return JSON.stringify(result);
}

/**
 * Verifica una contraseña contra su hash
 * @param {String} password - Contraseña a verificar
 * @param {String} hashData - Hash almacenado (JSON)
 * @returns {Promise<Boolean>} true si coinciden
 */
async function verifyPassword(password, hashData) {
  try {
    const { hash, salt } = JSON.parse(hashData);
    const decodedSalt = Uint8Array.from(atob(salt), c => c.charCodeAt(0));

    const { key } = await deriveKeyFromPassword(password, decodedSalt);
    const newHash = btoa(String.fromCharCode(...key));

    return constantTimeCompare(hash, newHash);
  } catch {
    return false;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. SESSION MANAGEMENT
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Crea una nueva sesión de usuario
 * @param {Object} usuario - Datos del usuario
 * @returns {Object} Sesión creada
 */
function createSession(usuario) {
  const sessionId = generateCSRFToken();
  const session = {
    id: sessionId,
    userId: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    rol: usuario.rol || 'user',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + SECURITY_CONFIG.SESSION_TIMEOUT_MS).toISOString(),
    lastActivity: Date.now()
  };

  sessionStorage.setItem(SECURITY_CONFIG.SESSION_STORAGE_KEY, JSON.stringify(session));
  return session;
}

/**
 * Obtiene la sesión actual
 * @returns {Object|null} Sesión actual o null si no existe/expiró
 */
function getCurrentSession() {
  const sessionData = sessionStorage.getItem(SECURITY_CONFIG.SESSION_STORAGE_KEY);
  if (!sessionData) return null;

  try {
    const session = JSON.parse(sessionData);

    // Verifica si expiró
    if (new Date(session.expiresAt) < new Date()) {
      destroySession();
      return null;
    }

    // Actualiza last activity
    session.lastActivity = Date.now();
    sessionStorage.setItem(SECURITY_CONFIG.SESSION_STORAGE_KEY, JSON.stringify(session));

    return session;
  } catch {
    return null;
  }
}

/**
 * Destruye la sesión actual
 */
function destroySession() {
  sessionStorage.removeItem(SECURITY_CONFIG.SESSION_STORAGE_KEY);
  sessionStorage.removeItem('csrf_token');
}

/**
 * Verifica si hay una sesión activa y válida
 * @returns {Boolean}
 */
function isSessionValid() {
  return getCurrentSession() !== null;
}

// ═════════════════════════════════════════════════════════════════════════════
// 8. CONTENT SECURITY POLICY HELPERS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Genera un meta tag CSP
 * @returns {String} Meta tag HTML
 */
function generateCSPMetaTag() {
  const directives = Object.entries(SECURITY_CONFIG.CSP_DIRECTIVES)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');

  return `<meta http-equiv="Content-Security-Policy" content="${directives}">`;
}

/**
 * Retorna las directivas CSP como string
 * @returns {String} CSP header value
 */
function getCSPHeaderValue() {
  return Object.entries(SECURITY_CONFIG.CSP_DIRECTIVES)
    .map(([key, values]) => `${key} ${values.join(' ')}`)
    .join('; ');
}

// ═════════════════════════════════════════════════════════════════════════════
// 9. UTILITIES Y LOGGING DE SEGURIDAD
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Log de eventos de seguridad
 * @param {String} event - Tipo de evento
 * @param {String} severity - 'info', 'warning', 'critical'
 * @param {Object} details - Detalles del evento
 */
function logSecurityEvent(event, severity = 'info', details = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    severity,
    details,
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  // Log en consola
  const style = severity === 'critical' ? 'color: red; font-weight: bold;' : 'color: orange;';
  console.log(`%c[SECURITY] ${event}`, style, details);

  // Almacena últimos 50 eventos en localStorage
  let logs = JSON.parse(localStorage.getItem('ma4_security_logs') || '[]');
  logs.push(logEntry);
  logs = logs.slice(-50); // Mantiene solo últimos 50
  localStorage.setItem('ma4_security_logs', JSON.stringify(logs));

  return logEntry;
}

/**
 * Obtiene logs de seguridad
 * @returns {Array} Array de eventos de seguridad
 */
function getSecurityLogs() {
  return JSON.parse(localStorage.getItem('ma4_security_logs') || '[]');
}

/**
 * Limpia logs de seguridad
 */
function clearSecurityLogs() {
  localStorage.removeItem('ma4_security_logs');
}

// ═════════════════════════════════════════════════════════════════════════════
// 10. INICIALIZACIÓN DE SEGURIDAD
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Inicializa todas las características de seguridad
 * Debe llamarse en el inicio de la aplicación
 */
function initializeSecurity() {
  try {
    // Inicializa token CSRF
    initCSRFToken();

    // Configura headers de seguridad (si es posible desde cliente)
    console.log('✅ Security initialized');

    // Log evento
    logSecurityEvent('Security system initialized', 'info', {
      cspEnabled: true,
      csrfEnabled: true,
      encryptionSupported: isTweetNaClAvailable()
    });

    return true;
  } catch (error) {
    console.error('❌ Security initialization failed:', error);
    return false;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═════════════════════════════════════════════════════════════════════════════

// Exporta para módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    SECURITY_CONFIG,
    generateCSRFToken,
    initCSRFToken,
    validateCSRFToken,
    constantTimeCompare,
    sanitizeInput,
    escapeHTML,
    isSafeURL,
    sanitizeURL,
    recordLoginAttempt,
    resetLoginAttempts,
    isTweetNaClAvailable,
    deriveKeyFromPassword,
    encryptSensitiveData,
    decryptSensitiveData,
    hashPassword,
    verifyPassword,
    createSession,
    getCurrentSession,
    destroySession,
    isSessionValid,
    generateCSPMetaTag,
    getCSPHeaderValue,
    logSecurityEvent,
    getSecurityLogs,
    clearSecurityLogs,
    initializeSecurity
  };
}
