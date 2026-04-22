# ENCRYPTION GUIDE - Maya Autopartes
**Última actualización:** 2026-04-22  
**Versión:** 1.0.0  

---

## 📋 Tabla de Contenidos
1. [Visión General de Encriptación](#visión-general)
2. [Métodos Disponibles](#métodos-disponibles)
3. [Casos de Uso](#casos-de-uso)
4. [Guía Paso a Paso](#guía-paso-a-paso)
5. [Mejores Prácticas](#mejores-prácticas)
6. [Troubleshooting](#troubleshooting)

---

## 🔐 Visión General

Maya Autopartes implementa **encriptación end-to-end** para proteger credenciales, tokens y datos sensibles. Ofrece dos métodos:

| Método | Ventajas | Desventajas | Cuándo Usar |
|--------|----------|-------------|-----------|
| **TweetNaCl.js** | Seguridad moderna, XChaCha20, Fast | Dependencia externa | Máxima seguridad |
| **Web Crypto API** | Nativo, sin dependencias, AES-GCM | Requiere HTTPS | Aplicaciones simples |

---

## 🛠️ Métodos Disponibles

### 1. TweetNaCl.js (RECOMENDADO)

**Algorithm:** XChaCha20-Poly1305  
**Key Size:** 256 bits  
**Nonce Size:** 192 bits (24 bytes)  
**Overhead:** 16 bytes (Poly1305 authentication tag)  

**Ventajas:**
- ✅ Resistant to known attacks
- ✅ Modern AEAD cipher
- ✅ Fast implementation
- ✅ Proven in production systems (Signal, etc.)

**Instalación:**
```html
<script src="https://cdn.jsdelivr.net/npm/tweetnacl@1.0.3/nacl-fast.min.js"></script>
```

**Ejemplo:**
```javascript
// Encriptación
const encrypted = await encryptSensitiveData(
  JSON.stringify({apiKey: 'sk_live_abc123'}),
  'masterPasswordSegura123!@#'
);

// Desencriptación
const decrypted = await decryptSensitiveData(
  encrypted,
  'masterPasswordSegura123!@#'
);

const creds = JSON.parse(decrypted);
```

### 2. Web Crypto API (FALLBACK)

**Algorithm:** AES-GCM  
**Key Size:** 256 bits  
**IV Size:** 96 bits (12 bytes)  
**Overhead:** 16 bytes (authentication tag)  

**Ventajas:**
- ✅ Nativo en navegadores
- ✅ Sin dependencias externas
- ✅ Soportado en todos los navegadores modernos

**Requerimientos:**
- ⚠️ HTTPS obligatorio (algunos navegadores requieren)
- ⚠️ Performance ligeramente menor que TweetNaCl

**Ejemplo:**
```javascript
// Funciona automáticamente si TweetNaCl no está disponible
const encrypted = await encryptSensitiveData(data, password);
console.log('Using:', isTweetNaClAvailable() ? 'TweetNaCl' : 'WebCrypto');
```

---

## 💼 Casos de Uso

### Caso 1: Almacenar Credenciales de Integración

**Escenario:** Guardar API keys de Supabase, Google Drive, etc.

```javascript
// 1. Usuario configura integración
async function saveIntegrationCredentials(serviceName, apiKey) {
  // Valida que no esté vacío
  if (!apiKey || apiKey.trim() === '') {
    throw new Error('API Key requerida');
  }

  // Encripta credencial
  const encrypted = await encryptSensitiveData(
    JSON.stringify({
      service: serviceName,
      apiKey: apiKey,
      savedAt: new Date().toISOString()
    }),
    cfg.masterPassword // O pedir nueva contraseña
  );

  // Almacena encriptado
  cfg.encryptedCredentials = cfg.encryptedCredentials || {};
  cfg.encryptedCredentials[serviceName] = encrypted;
  saveCfg();

  logSecurityEvent('Integration credentials saved', 'info', {
    service: serviceName
  });
}

// 2. Recupera credencial cuando se necesita
async function getIntegrationCredential(serviceName) {
  const encrypted = cfg.encryptedCredentials?.[serviceName];
  
  if (!encrypted) {
    throw new Error(`No credentials found for ${serviceName}`);
  }

  try {
    const decrypted = await decryptSensitiveData(
      encrypted,
      cfg.masterPassword
    );

    const creds = JSON.parse(decrypted);
    
    logSecurityEvent('Integration credentials accessed', 'info', {
      service: serviceName
    });

    return creds;
  } catch (error) {
    logSecurityEvent('Credential decryption failed', 'critical', {
      service: serviceName,
      error: error.message
    });
    throw new Error('Unable to decrypt credentials - wrong master password');
  }
}
```

### Caso 2: Backup Encriptado de Base de Datos

**Escenario:** Crear backup encriptado de ventas, clientes, etc.

```javascript
// 1. Crea backup encriptado
async function createEncryptedBackup() {
  const backupData = {
    ventas: ventas,
    almacen: almacen,
    clientes: clientes,
    usuarios: usuarios,
    config: cfg,
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };

  const encrypted = await encryptSensitiveData(
    JSON.stringify(backupData),
    cfg.masterPassword
  );

  const backup = {
    encrypted: encrypted,
    hash: await hashData(encrypted), // Para verificar integridad
    createdAt: new Date().toISOString()
  };

  // Descarga como archivo
  const dataStr = JSON.stringify(backup, null, 2);
  const dataBlob = new Blob([dataStr], {type: 'application/json'});
  const url = URL.createObjectURL(dataBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `maya-backup-${new Date().getTime()}.encrypted.json`;
  link.click();
  URL.revokeObjectURL(url);

  logSecurityEvent('Backup created', 'info', {
    size: dataStr.length,
    itemsCount: {
      ventas: ventas.length,
      clientes: clientes.length,
      almacen: almacen.length
    }
  });
}

// 2. Restaura desde backup encriptado
async function restoreEncryptedBackup(file) {
  try {
    const content = await file.text();
    const backup = JSON.parse(content);

    // Desencripta
    const decrypted = await decryptSensitiveData(
      backup.encrypted,
      cfg.masterPassword
    );

    const backupData = JSON.parse(decrypted);

    // Valida versión
    if (backupData.version !== '1.0.0') {
      throw new Error('Incompatible backup version');
    }

    // Restaura (CUIDADO: sobrescribe datos actuales)
    if (confirm('⚠️ ¿Estás seguro? Esto sobrescribirá todos los datos.')) {
      ventas.length = 0;
      ventas.push(...backupData.ventas);
      
      almacen.length = 0;
      almacen.push(...backupData.almacen);
      
      clientes.length = 0;
      clientes.push(...backupData.clientes);
      
      usuarios = backupData.usuarios;
      
      sv();

      logSecurityEvent('Backup restored', 'info', {
        backupDate: backupData.timestamp
      });

      showToast('✅ Backup restaurado exitosamente');
    }
  } catch (error) {
    logSecurityEvent('Backup restore failed', 'critical', {
      error: error.message
    });
    showToast('❌ Error al restaurar backup');
  }
}
```

### Caso 3: Contraseña de Usuario Hasheada

**Escenario:** Almacenar contraseña de usuario de forma segura (NO encriptada, hasheada)

```javascript
// Diferencia importante:
// - ENCRIPTACIÓN: reversible, para datos que necesitamos recuperar
// - HASHING: irreversible, para contraseñas (nunca necesitamos recuperar)

// 1. Al crear usuario (registro)
async function registerUser(email, password) {
  // Valida contraseña
  const pwValidation = validatePassword(password);
  if (!pwValidation.valid) {
    throw new Error(pwValidation.message);
  }

  // HASHEA la contraseña (NO encripta)
  const passwordHash = await hashPassword(password);

  // Almacena usuario con hash
  const newUser = {
    id: generateUUID(),
    email: email,
    passwordHash: passwordHash, // Nunca guardar el password en texto plano
    createdAt: new Date().toISOString()
  };

  usuarios.push(newUser);
  saveCfg();

  logSecurityEvent('User registered', 'info', {
    email: email
  });

  return newUser;
}

// 2. Al hacer login (verificación)
async function loginUser(email, password) {
  const user = usuarios.find(u => u.email === email);

  if (!user) {
    logSecurityEvent('Login failed', 'warning', {
      email: email,
      reason: 'User not found'
    });
    throw new Error('User not found');
  }

  // VERIFICA el hash (compara, no desencripta)
  const isCorrect = await verifyPassword(password, user.passwordHash);

  if (!isCorrect) {
    // Rate limiting
    const attempt = recordLoginAttempt(email);
    
    logSecurityEvent('Failed login attempt', 'warning', {
      email: email,
      remaining: attempt.remainingAttempts
    });
    
    throw new Error('Incorrect password');
  }

  // Login exitoso
  resetLoginAttempts(email);
  const session = createSession(user);

  logSecurityEvent('User logged in', 'info', {
    email: email,
    sessionId: session.id
  });

  return session;
}
```

---

## 🔄 Guía Paso a Paso

### Setup Inicial

```javascript
// 1. En HTML, agrega DOMPurify y TweetNaCl:
// <script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"></script>
// <script src="https://cdn.jsdelivr.net/npm/tweetnacl@1.0.3/nacl-fast.min.js"></script>
// <script src="security.js"></script>

// 2. Al inicializar app:
document.addEventListener('DOMContentLoaded', () => {
  // Verifica si tenemos los módulos necesarios
  console.log('DOMPurify:', typeof DOMPurify !== 'undefined' ? '✅' : '❌');
  console.log('TweetNaCl:', isTweetNaClAvailable() ? '✅' : '❌ (usando WebCrypto)');
  
  initializeSecurity();
});
```

### Flujo de Encriptación de Datos Sensibles

```javascript
// PASO 1: Preparar datos
const sensitiveData = {
  apiKey: 'sk_live_xyz123',
  token: 'tok_abc456',
  secret: 'shh_secret_value'
};

// PASO 2: Convertir a string JSON
const jsonString = JSON.stringify(sensitiveData);

// PASO 3: Encriptar
const masterPassword = cfg.masterPassword || prompt('Ingresa contraseña maestra:');
const encrypted = await encryptSensitiveData(jsonString, masterPassword);

// PASO 4: Guardar encriptado
localStorage.setItem('encrypted_data_key', encrypted);
console.log('✅ Datos guardados encriptados');

// PASO 5: Cuando necesites recuperar
const retrievedEncrypted = localStorage.getItem('encrypted_data_key');
const decryptedString = await decryptSensitiveData(
  retrievedEncrypted,
  masterPassword
);

// PASO 6: Parsear de vuelta a objeto
const recoveredData = JSON.parse(decryptedString);
console.log('Recovered:', recoveredData);
```

### Flujo de Hashing de Contraseñas

```javascript
// IMPORTANTE: Usar HASH para contraseñas, NO encriptación

// PASO 1: Usuario ingresa contraseña
const userPassword = document.getElementById('password').value;

// PASO 2: Validar complejidad
const validation = validatePassword(userPassword);
if (!validation.valid) {
  showError(validation.message);
  return;
}

// PASO 3: Generar HASH (irreversible)
const passwordHash = await hashPassword(userPassword);

// PASO 4: Almacenar HASH en base de datos
const user = {
  email: userEmail,
  passwordHash: passwordHash, // NO la contraseña
  createdAt: new Date().toISOString()
};

users.push(user);
saveCfg();

// PASO 5: En login, verificar contraseña contra hash
const loginPassword = document.getElementById('loginPassword').value;
const isCorrect = await verifyPassword(loginPassword, user.passwordHash);

if (isCorrect) {
  console.log('✅ Contraseña correcta');
  createSession(user);
} else {
  console.log('❌ Contraseña incorrecta');
  recordLoginAttempt(user.email);
}
```

---

## 🎯 Mejores Prácticas

### DO ✅

```javascript
// 1. Usar TweetNaCl cuando sea posible
if (isTweetNaClAvailable()) {
  const encrypted = await encryptSensitiveData(data, password);
}

// 2. HASHEAR contraseñas, NO encriptarlas
const hash = await hashPassword(userPassword);
// Nunca: const encrypted = await encryptSensitiveData(userPassword, ...);

// 3. Sanitizar antes de encriptar
const sanitized = sanitizeInput(userInput);
const encrypted = await encryptSensitiveData(sanitized, password);

// 4. Usar HTTPS en producción
// Algunos navegadores requieren HTTPS para Web Crypto API

// 5. Almacenar contraseña maestra de forma segura
// Usar sessionStorage, no localStorage
// Pedir al usuario cada sesión, no guardarla permanentemente

// 6. Validar antes de desencriptar
try {
  const decrypted = await decryptSensitiveData(encrypted, password);
  const data = JSON.parse(decrypted);
  // Validar estructura de data
} catch (error) {
  logSecurityEvent('Decryption failed', 'critical', {error});
}

// 7. Usar CSRF token en operaciones que desencriptan
if (!validateCSRFToken(token)) {
  throw new Error('CSRF validation failed');
}
```

### DON'T ❌

```javascript
// 1. NO guardar contraseña maestra en localStorage
localStorage.setItem('masterPassword', password); // ❌

// 2. NO encriptar contraseñas (usar hash)
const encrypted = await encryptSensitiveData(password, ...); // ❌

// 3. NO guardar datos encriptados sin respaldo
// Siempre ten backup de clave/contraseña maestra

// 4. NO ignorar errores de encriptación
try {
  const decrypted = await decryptSensitiveData(encrypted, password);
} catch (e) {
  console.log('Error:', e); // ❌ Insuficiente
  // Hacer: logSecurityEvent('Decryption error', 'critical', {...})
}

// 5. NO cambiar algoritmos sin migración
// Si cambias de TweetNaCl a WebCrypto, los datos viejos no se desencriptarán

// 6. NO usar contraseñas débiles para master password
const masterPassword = 'password123'; // ❌ Demasiado débil

// 7. NO desencriptar datos innecesariamente
// Desencripta solo cuando sea necesario usar el valor
```

---

## 🐛 Troubleshooting

### Problema: "TweetNaCl is not defined"

**Causa:** Script no se cargó o está bloqueado

**Solución:**
```html
<!-- Asegúrate de que está en el HTML antes de security.js -->
<script src="https://cdn.jsdelivr.net/npm/tweetnacl@1.0.3/nacl-fast.min.js"></script>
<script src="security.js"></script>

<!-- Verifica en console: -->
<script>
  if (typeof nacl === 'undefined') {
    console.warn('TweetNaCl no disponible, usando WebCrypto');
  } else {
    console.log('✅ TweetNaCl cargado');
  }
</script>
```

### Problema: "Failed to decrypt data - invalid password or corrupted data"

**Causa:** 
- Contraseña incorrecta
- Datos están corruptos
- Formato incorrecto

**Solución:**
```javascript
try {
  const decrypted = await decryptSensitiveData(encrypted, password);
  console.log('✅ Desencriptado correctamente');
} catch (error) {
  console.error('Error:', error.message);
  
  // Opciones:
  // 1. Pedir que ingrese contraseña de nuevo
  // 2. Restaurar desde backup
  // 3. Regenerar datos
}
```

### Problema: "HTTPS required" (WebCrypto API)

**Causa:** Algunos navegadores requieren HTTPS para Web Crypto

**Solución:**
```javascript
// En desarrollo, usar localhost (se considera seguro)
// En producción, SIEMPRE usar HTTPS

// Para testing local:
// http://localhost:3000 ✅ OK
// http://192.168.1.x:3000 ❌ Fallará
// https://example.com ✅ OK
```

### Problema: "Key derivation too slow"

**Causa:** PBKDF2 con 100,000 iteraciones en navegador lento

**Solución:**
```javascript
// Reducir iteraciones (NO recomendado, pero a veces necesario):
// En security.js, línea ~280:
const derivedBits = await crypto.subtle.deriveBits(
  {
    name: 'PBKDF2',
    salt: salt,
    iterations: 50000, // De 100000 a 50000 (compromiso)
    hash: 'SHA-256'
  },
  baseKey,
  256
);

// Mejor: Usar Web Worker para no bloquear UI
// const worker = new Worker('crypto-worker.js');
// worker.postMessage({encrypt, data, password});
```

### Problema: "LocalStorage quota exceeded"

**Causa:** Datos encriptados son grandes

**Solución:**
```javascript
// Usar IndexedDB en lugar de localStorage
// Ejemplo:
async function saveEncryptedWithIndexedDB(key, encrypted) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('MayaAutopartes', 1);
    
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(['encrypted'], 'readwrite');
      const store = tx.objectStore('encrypted');
      store.put({key, data: encrypted});
      resolve();
    };
  });
}

// O dividir datos en partes más pequeñas
const chunks = largeData.match(/.{1,50000}/g); // 50KB chunks
chunks.forEach((chunk, i) => {
  localStorage.setItem(`encrypted_${key}_${i}`, chunk);
});
```

---

## 📊 Comparativa de Seguridad

| Aspecto | TweetNaCl | WebCrypto |
|--------|-----------|-----------|
| **Algoritmo** | XChaCha20-Poly1305 | AES-GCM |
| **Seguridad** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Velocidad** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Dependencias** | 1 | 0 |
| **HTTPS requerido** | No | Sí (algunos navegadores) |
| **Navegadores** | 95%+ | 98%+ |
| **Recomendación** | ✅ Usar primero | ⚠️ Fallback |

---

## 🔍 Verificación de Seguridad

```javascript
// Script para verificar status de encriptación

async function checkEncryptionStatus() {
  const status = {
    dompurify: typeof DOMPurify !== 'undefined',
    tweetnacl: isTweetNaClAvailable(),
    webcrypto: typeof crypto.subtle !== 'undefined',
    sessionStorage: typeof sessionStorage !== 'undefined',
    localStorage: typeof localStorage !== 'undefined'
  };

  console.log('=== ENCRYPTION STATUS ===');
  console.log('DOMPurify:', status.dompurify ? '✅' : '❌');
  console.log('TweetNaCl:', status.tweetnacl ? '✅' : '❌ (WebCrypto: ' + (status.webcrypto ? '✅' : '❌') + ')');
  console.log('SessionStorage:', status.sessionStorage ? '✅' : '❌');
  console.log('LocalStorage:', status.localStorage ? '✅' : '❌');

  // Test encriptación
  try {
    const test = await encryptSensitiveData('test', 'password123');
    console.log('Encryption test:', '✅');
  } catch (e) {
    console.log('Encryption test:', '❌', e.message);
  }

  return status;
}

// Ejecuta:
checkEncryptionStatus();
```

---

**Documento creado:** 2026-04-22  
**Última revisión:** 2026-04-22  
**Siguiente revisión:** 2026-05-22
