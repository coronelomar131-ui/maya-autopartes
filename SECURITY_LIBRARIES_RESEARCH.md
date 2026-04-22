# SECURITY LIBRARIES RESEARCH & RECOMMENDATIONS
**Última actualización:** 2026-04-22  
**Versión:** 1.0.0  
**Autor:** Maya Autopartes Security Team  

---

## 📋 Tabla de Contenidos
1. [Validación](#validación)
2. [Encriptación](#encriptación)
3. [Sanitización XSS](#sanitización-xss)
4. [Autenticación](#autenticación)
5. [Rate Limiting](#rate-limiting)
6. [Comparativa Final](#comparativa-final)
7. [Recomendaciones](#recomendaciones)

---

## ✅ Validación

### 1. Zod (Recomendado para TypeScript)

**Link:** https://zod.dev/  
**NPM:** `npm install zod`  
**Tamaño:** 20KB (minified)  
**Mantenimiento:** ⭐⭐⭐⭐⭐ Activo

**Ventajas:**
- TypeScript-first
- Runtime validation
- Composable schemas
- Excelente para APIs

**Desventajas:**
- Requiere TypeScript
- Un poco más pesado
- Aprendizaje inicial

**Ejemplo:**
```javascript
import {z} from 'zod';

const ClienteSchema = z.object({
  nombre: z.string().min(1).max(255),
  email: z.string().email().optional(),
  telefono: z.string().regex(/^\d{10}$/).optional(),
  rfc: z.string().length(12).or(z.string().length(13)).optional()
});

// Validar
const result = ClienteSchema.safeParse(data);
if (!result.success) {
  console.log(result.error.issues);
} else {
  console.log(result.data);
}
```

**Verdict:** ⭐⭐⭐⭐⭐ Excelente para nuevos proyectos TypeScript

---

### 2. Joi (Alternativa empresarial)

**Link:** https://joi.dev/  
**NPM:** `npm install joi`  
**Tamaño:** 76KB  
**Mantenimiento:** ⭐⭐⭐⭐⭐ Muy activo

**Ventajas:**
- No requiere TypeScript
- Muy flexible
- Excelente documentación
- Usado por empresas grandes

**Desventajas:**
- Más pesado
- Sintaxis más verbosa
- Overkill para proyectos pequeños

**Ejemplo:**
```javascript
const Joi = require('joi');

const schema = Joi.object({
  nombre: Joi.string().min(1).max(255).required(),
  email: Joi.string().email().optional(),
  telefono: Joi.string().pattern(/^\d{10}$/).optional()
});

const result = schema.validate(data);
if (result.error) {
  console.log(result.error.details);
}
```

**Verdict:** ⭐⭐⭐⭐ Excelente pero probablemente overkill para Maya

---

### 3. Validators.js (Librería simple)

**Link:** https://github.com/chriso/validator.js  
**NPM:** `npm install validator`  
**Tamaño:** 8KB  
**Mantenimiento:** ⭐⭐⭐⭐ Activo

**Ventajas:**
- Muy ligero
- Funciones individuales
- Sin dependencias
- Fácil de entender

**Desventajas:**
- No maneja esquemas complejos
- Validaciones más básicas
- Menos flexible

**Ejemplo:**
```javascript
const validator = require('validator');

if (!validator.isEmail(data.email)) {
  throw new Error('Invalid email');
}

if (!validator.isMobilePhone(data.phone, 'es-MX')) {
  throw new Error('Invalid phone');
}
```

**Verdict:** ⭐⭐⭐⭐ **RECOMENDADO PARA MAYA** - Simple, ligero, completo

---

## 🔐 Encriptación

### 1. TweetNaCl.js (Recomendado - Implementado)

**Link:** https://tweetnacl.js.org/  
**NPM:** `npm install tweetnacl`  
**Tamaño:** 7KB (minified)  
**Algoritmo:** XChaCha20-Poly1305  
**Mantenimiento:** ⭐⭐⭐⭐⭐ Gold standard

**Ventajas:**
- Moderno (XChaCha20)
- Muy rápido
- Resistente a ataques conocidos
- Usado por Signal, WhatsApp
- Mínimo overhead

**Desventajas:**
- Dependencia externa
- Librería específica para crypto

**Implementación en Maya:** ✅ Ya incluido

**Verdict:** ⭐⭐⭐⭐⭐ **ESTÁNDAR DE ORO PARA ENCRIPTACIÓN**

---

### 2. TweetNaCl.js vs libsodium.js

**libsodium.js**

Link: https://libsodium.gitbook.io/doc/  
NPM: `npm install libsodium.js`  
Tamaño: 40KB (mucho más pesado)

**Comparativa:**
| Aspecto | TweetNaCl | libsodium.js |
|---------|-----------|--------------|
| Tamaño | 7KB | 40KB |
| Velocidad | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| Seguridad | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Complejidad | Simple | Media |
| Casos de uso | Básicos/Intermedios | Avanzados |

**Verdict:** Para Maya, TweetNaCl.js es suficiente. libsodium para casos muy avanzados.

---

### 3. TweetNaCl.js vs crypto-js

**crypto-js**

Link: https://cryptojs.gitbook.io/docs/  
NPM: `npm install crypto-js`  
Tamaño: 30KB

**ADVERTENCIA:** Tiene vulnerabilidades conocidas. **NO USAR para producción**.

---

## 🧼 Sanitización XSS

### 1. DOMPurify (Recomendado - Implementado)

**Link:** https://isIncluded.github.io/DOMPurify/  
**NPM:** `npm install dompurify`  
**Tamaño:** 8KB (minified)  
**Mantenimiento:** ⭐⭐⭐⭐⭐ Muy activo

**Ventajas:**
- Estándar de la industria
- XSS protection muy efectiva
- Configurable
- Usado por Angular, Fastmail, etc

**Desventajas:**
- Dependencia externa
- Requiere que DOM esté disponible

**Uso:**
```html
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"></script>

<script>
  const userInput = '<img src=x onerror="alert(1)">';
  const clean = DOMPurify.sanitize(userInput);
  // Resultado: '<img src="x">' (sin el onerror)
</script>
```

**Verdict:** ⭐⭐⭐⭐⭐ **MEJOR EN SU CLASE**

---

### 2. html-escaper (Alternativa simple)

**Link:** https://github.com/WebReflection/html-escaper  
**NPM:** `npm install html-escaper`  
**Tamaño:** 0.5KB

**Ventajas:**
- Extremadamente ligero
- Solo escapa caracteres HTML
- Sin dependencias

**Desventajas:**
- Solo escapa, no sanitiza completamente
- No maneja eventos como `onerror`

**Verdict:** ⭐⭐⭐ Para casos simples, usa `textContent` nativo

---

## 👤 Autenticación

### 1. Argon2 (Hash de contraseñas)

**Link:** https://github.com/phc/phc-winner-argon2  
**Para servidor:** `npm install argon2` (mejor en Node.js)  
**Para cliente:** No es práctico (muy lento)  

**Nota:** En cliente, usamos PBKDF2 (Web Crypto API). Para servidor backend, Argon2 es mejor.

```javascript
// SERVIDOR (Node.js)
const argon2 = require('argon2');

// Hash
const hashedPassword = await argon2.hash(password);

// Verify
const match = await argon2.verify(hashedPassword, password);
```

**Verdict:** ⭐⭐⭐⭐⭐ **Para servidor backend**

---

### 2. PBKDF2 (Implementado en Maya)

Nativo en Web Crypto API.

```javascript
// CLIENTE (navegador)
const derivedKey = await crypto.subtle.deriveBits(
  {
    name: 'PBKDF2',
    salt: salt,
    iterations: 100000,
    hash: 'SHA-256'
  },
  baseKey,
  256
);
```

**Ventajas:**
- ✅ Nativo en navegadores
- ✅ Sin dependencias
- ✅ OWASP recomendado (100K+ iteraciones)

**Desventajas:**
- ❌ Más lento que Argon2
- ❌ Menos resistente a GPU attacks

**Verdict:** ⭐⭐⭐⭐ **Bueno para cliente. Argon2 mejor para servidor.**

---

## ⏱️ Rate Limiting

### 1. express-rate-limit (Para servidor)

**Link:** https://github.com/nfriedly/express-rate-limit  
**NPM:** `npm install express-rate-limit`  
**Tamaño:** 3KB

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por ventana
  message: 'Too many requests',
  standardHeaders: true,
  legacyHeaders: false
});

app.use(limiter);
```

**Verdict:** ⭐⭐⭐⭐⭐ **Gold standard para servidor Express**

---

### 2. Client-Side (Implementado en Maya)

En `security.js` implementamos rate limiting en cliente:

```javascript
const loginAttempts = new Map(); // Almacena intentos

function recordLoginAttempt(identifier) {
  // Limita 5 intentos en 15 minutos
  // Bloquea por 30 minutos si se excede
}
```

**Ventajas:**
- ✅ Nativo, sin dependencias
- ✅ Feedback inmediato al usuario
- ✅ Reduce carga en servidor

**Desventajas:**
- ❌ Puede ser bypasseado
- ❌ Requiere validación servidor

**Verdict:** ⭐⭐⭐⭐ **Implementado correctamente en Maya**

---

## 📊 Comparativa Final

### Validación
| Librería | Tamaño | Complejidad | Recomendación |
|----------|--------|------------|---------------|
| **validators.js** | 8KB | Baja | ✅ **ELEGIDA PARA MAYA** |
| Zod | 20KB | Alta | Para TypeScript |
| Joi | 76KB | Alta | Demasiado para Maya |

**Recomendación:** Usar `validators.js` + validadores custom de Maya = Ligero + Específico

---

### Encriptación
| Librería | Algoritmo | Tamaño | Mantenimiento | Recomendación |
|----------|-----------|--------|--------------|---------------|
| **TweetNaCl.js** | XChaCha20 | 7KB | ⭐⭐⭐⭐⭐ | ✅ **ELEGIDA PARA MAYA** |
| libsodium.js | Múltiples | 40KB | ⭐⭐⭐⭐⭐ | Para casos avanzados |
| Web Crypto API | AES-GCM | 0KB | Nativa | ✅ **FALLBACK** |
| crypto-js | Varias | 30KB | ⚠️ Vulnerabilidades | ❌ **NO USAR** |

**Recomendación:** TweetNaCl.js + Web Crypto API (fallback) = Seguro + Robusto

---

### Sanitización XSS
| Librería | Tamaño | Efectividad | Recomendación |
|----------|--------|-------------|---------------|
| **DOMPurify** | 8KB | ⭐⭐⭐⭐⭐ | ✅ **ELEGIDA PARA MAYA** |
| html-escaper | 0.5KB | ⭐⭐⭐ | Solo texto |
| Nativo (textContent) | 0KB | ⭐⭐⭐⭐ | Para texto plano |

**Recomendación:** DOMPurify + fallback nativo = Balance perfecto

---

## 🎯 Recomendaciones Finales

### Para Maya Autopartes (IMPLEMENTACIÓN ACTUAL)

**Stack de seguridad recomendado:**

```
┌──────────────────────────────────────────┐
│         MAYA AUTOPARTES SECURITY          │
├──────────────────────────────────────────┤
│ VALIDACIÓN:                              │
│  ✅ validators.js (custom para México)   │
│  ✅ Esquemas de validación locales       │
│                                          │
│ ENCRIPTACIÓN:                            │
│  ✅ TweetNaCl.js (primario)              │
│  ✅ Web Crypto API (fallback)            │
│  ✅ PBKDF2 para PBKDF2 (hashing)         │
│                                          │
│ SANITIZACIÓN:                            │
│  ✅ DOMPurify (si disponible)            │
│  ✅ textContent (nativo)                 │
│                                          │
│ ANTI-CSRF:                               │
│  ✅ Token en sessionStorage              │
│  ✅ Validación en cada operación         │
│                                          │
│ RATE LIMITING:                           │
│  ✅ Cliente (feedback inmediato)         │
│  ✅ Servidor (validación real)           │
│                                          │
│ LOGGING:                                 │
│  ✅ localStorage (últimos 100 eventos)   │
│  ✅ Audit trail de cambios               │
└──────────────────────────────────────────┘
```

---

### Instalación Recomendada

```bash
# Cliente (esencial)
npm install tweetnacl
npm install dompurify

# Servidor (si usas Node.js)
npm install argon2
npm install express-rate-limit
npm install helmet
npm install cors
npm install bcrypt
```

---

### CDN Recomendados (para desarrollo rápido)

```html
<!-- Encriptación -->
<script src="https://cdn.jsdelivr.net/npm/tweetnacl@1.0.3/nacl-fast.min.js"></script>

<!-- Sanitización -->
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"></script>

<!-- Validación (opcional, usamos custom) -->
<script src="https://cdn.jsdelivr.net/npm/validator@13.11.0/index.min.js"></script>
```

---

### Medidas de Seguridad Adicionales (Recomendadas)

**Si tienes backend Node.js:**

```javascript
// Instala dependencias de seguridad
npm install helmet cors express-rate-limit express-validator argon2

// En tu servidor:
const helmet = require('helmet');
const cors = require('cors');

app.use(helmet()); // Headers de seguridad
app.use(cors({
  origin: 'https://mayaautopartes.com',
  credentials: true
}));
```

---

### Para Máxima Seguridad (Enterprise)

1. **WAF (Web Application Firewall)**
   - Cloudflare
   - AWS WAF
   - ModSecurity

2. **SIEM (Security Information & Event Management)**
   - Splunk
   - ELK Stack
   - Datadog

3. **Scanning Automático**
   - OWASP ZAP
   - Burp Suite (Community)
   - npm audit

4. **Certificados SSL/TLS**
   - Let's Encrypt (gratis)
   - DigiCert (enterprise)

---

## 📈 Roadmap de Seguridad

### Fase 3 (ACTUAL - COMPLETADA)
- ✅ Validación completa
- ✅ Encriptación de credenciales
- ✅ Sanitización XSS
- ✅ CSRF protection
- ✅ Rate limiting
- ✅ Session management
- ✅ Security logging

### Fase 4 (Próxima - RECOMENDADA)
- [ ] Implementar backend seguro
- [ ] Two-factor authentication (2FA)
- [ ] JWT tokens seguros
- [ ] Database encryption
- [ ] Backup encriptado automático
- [ ] Security audit externo
- [ ] Penetration testing

### Fase 5 (Futuro - NICE-TO-HAVE)
- [ ] Blockchain para auditoría (opcional)
- [ ] Machine Learning para detección de anomalías
- [ ] Certificación de seguridad (ISO 27001)
- [ ] Bug bounty program

---

## 🔗 Referencias

### Estándares
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [CWE Top 25](https://cwe.mitre.org/top25/)

### Herramientas
- [npm audit](https://docs.npmjs.com/cli/v8/commands/npm-audit)
- [OWASP ZAP](https://www.zaproxy.org/)
- [Burp Suite Community](https://portswigger.net/burp/communitydownload)

### Cursos
- [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/)
- [PortSwigger Academy](https://portswigger.net/web-security)

---

**Documento creado:** 2026-04-22  
**Última revisión:** 2026-04-22  
**Próxima revisión:** 2026-05-22  
**Responsable:** Security Team
