# QUICK SECURITY SETUP - Maya Autopartes
**Tiempo estimado:** 15 minutos  
**Nivel:** Rápido & Fácil  

---

## 🚀 3 Pasos para Implementar Seguridad

### PASO 1: Agregar Scripts a HTML (2 min)

En tu `index.html`, antes de cerrar `</body>`:

```html
<!-- 1. Librerías de seguridad externas (opcional pero recomendado) -->
<script src="https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/tweetnacl@1.0.3/nacl-fast.min.js"></script>

<!-- 2. Módulos de seguridad de Maya -->
<script src="security.js"></script>
<script src="validators.js"></script>

<!-- 3. Inicialización -->
<script>
  document.addEventListener('DOMContentLoaded', () => {
    // Inicializa seguridad
    initializeSecurity();
    console.log('✅ Security initialized');
  });
</script>
```

---

### PASO 2: Validar Inputs en Formularios (5 min)

**Ejemplo: Crear Cliente**

```javascript
// En tu handlers de formularios
async function handleCreateCliente(formData) {
  try {
    // 1. Sanitiza todos los inputs
    const sanitized = {
      nombre: sanitizeInput(formData.nombre),
      email: sanitizeInput(formData.email || ''),
      telefono: sanitizeInput(formData.telefono || ''),
      rfc: sanitizeInput(formData.rfc || '')
    };

    // 2. Valida datos
    const validation = validateCliente(sanitized);
    if (!validation.valid) {
      // Muestra errores claros
      validation.errors.forEach(error => {
        showFieldError(error.field, error.message);
      });
      return;
    }

    // 3. Verifica CSRF token
    const token = sessionStorage.getItem('csrf_token');
    if (!validateCSRFToken(token)) {
      throw new Error('CSRF validation failed');
    }

    // 4. Guarda (si usas función local)
    saveCliente(validation.sanitized || sanitized);

    // 5. Feedback
    showToast('✅ Cliente guardado exitosamente');

    // 6. Log
    logSecurityEvent('Cliente created', 'info', {
      clienteName: sanitized.nombre
    });

  } catch (error) {
    console.error('Error:', error);
    showToast('❌ Error al guardar');
  }
}
```

**Copiar-Pegar para otros formularios:**

```javascript
// PRODUCTO
async function handleCreateProducto(formData) {
  const validation = validateProducto(formData);
  if (!validation.valid) {
    showErrors(validation.errors);
    return;
  }
  saveProducto(formData);
  showToast('✅ Producto guardado');
}

// VENTA
async function handleCreateVenta(formData) {
  const validation = validateVenta(formData);
  if (!validation.valid) {
    showErrors(validation.errors);
    return;
  }
  saveVenta(formData);
  showToast('✅ Venta registrada');
}
```

---

### PASO 3: Proteger Login (3 min)

```javascript
async function handleLogin(email, password) {
  try {
    // 1. Valida formato
    const emailVal = validateEmail(email);
    if (!emailVal.valid) {
      showToast('📧 Email inválido');
      return;
    }

    // 2. Rate limiting
    const attempt = recordLoginAttempt(email);
    if (!attempt.allowed) {
      showToast(`🔒 ${attempt.message}`);
      return;
    }

    // 3. Verifica credenciales (ejemplo)
    // En producción, esto sería contra un servidor
    const usuario = findUserByEmail(email);
    
    if (!usuario) {
      showToast('❌ Usuario no encontrado');
      return;
    }

    // 4. Verifica contraseña (hasheada)
    const isCorrect = await verifyPassword(password, usuario.passwordHash);
    
    if (!isCorrect) {
      showToast('❌ Credenciales incorrectas');
      logSecurityEvent('Failed login', 'warning', {email});
      return;
    }

    // 5. Login exitoso
    resetLoginAttempts(email);
    const session = createSession(usuario);

    logSecurityEvent('User logged in', 'info', {
      userId: usuario.id,
      email: email
    });

    // 6. Redirige
    redirectToDashboard();

  } catch (error) {
    showToast('❌ Error en login');
  }
}
```

---

## 🔑 Manejo de Credenciales Sensibles

### Guardar API Keys de Forma Segura

```javascript
// Cuando el usuario configura integración:
async function saveSupabaseCredentials(url, key) {
  // Encripta
  const encrypted = await encryptSensitiveData(
    JSON.stringify({url, key}),
    cfg.masterPassword || prompt('Contraseña maestra:')
  );

  // Almacena
  cfg.supabaseEncrypted = encrypted;
  saveCfg();

  logSecurityEvent('Supabase credentials saved', 'info');
}

// Cuando necesites usar:
async function getSupabaseCredentials() {
  const masterPassword = sessionStorage.getItem('masterPassword') || 
                        prompt('Contraseña maestra:');

  const decrypted = await decryptSensitiveData(
    cfg.supabaseEncrypted,
    masterPassword
  );

  return JSON.parse(decrypted);
}
```

---

## 📊 Monitorear Seguridad

### Dashboard Simple

```html
<!-- Agregar en tu UI -->
<div id="security-status" style="display: none; background: #fffacd; padding: 10px; border-radius: 5px; margin: 10px 0;">
  <strong>🔒 Estado de Seguridad:</strong>
  <ul id="security-checks" style="margin-top: 5px; padding-left: 20px;"></ul>
</div>

<script>
// Mostrar estado
function updateSecurityStatus() {
  const checks = {
    'CSRF Token': sessionStorage.getItem('csrf_token') ? '✅' : '❌',
    'DOMPurify': typeof DOMPurify !== 'undefined' ? '✅' : '⚠️',
    'TweetNaCl': isTweetNaClAvailable() ? '✅' : '⚠️ (WebCrypto)',
    'Sesión activa': isSessionValid() ? '✅' : '❌',
    'Logs guardados': getSecurityLogs().length + ' eventos'
  };

  const html = Object.entries(checks)
    .map(([key, value]) => `<li>${key}: ${value}</li>`)
    .join('');

  document.getElementById('security-checks').innerHTML = html;
  document.getElementById('security-status').style.display = 'block';
}

// Ejecutar cada 5 minutos
setInterval(updateSecurityStatus, 5 * 60 * 1000);

// O llamar manualmente
// updateSecurityStatus();
</script>
```

---

## ✅ Checklist de Integración

- [ ] Scripts agregados a HTML
- [ ] `security.js` funciona (verifica console)
- [ ] `validators.js` funciona (verifica console)
- [ ] Formularios validan inputs
- [ ] Login tiene rate limiting
- [ ] CSRF token generado (`initCSRFToken()`)
- [ ] Logs aparecen en console
- [ ] Session se crea/destruye correctamente
- [ ] Encriptación funciona

---

## 🧪 Test Rápido en Console

```javascript
// Copiar y pegar en Developer Tools (F12) mientras app está abierta

// 1. Test validación
console.log('📧 Email test:', validateEmail('user@example.com'));
console.log('📞 Phone test:', validatePhoneMX('5551234567'));
console.log('🆔 RFC test:', validateRFC('ABC123456XYZ'));

// 2. Test CSRF
console.log('🔐 CSRF token:', sessionStorage.getItem('csrf_token'));
console.log('Validate:', validateCSRFToken(sessionStorage.getItem('csrf_token')));

// 3. Test encriptación
encryptSensitiveData('test data', 'password123').then(enc => {
  console.log('✅ Encryption works');
  decryptSensitiveData(enc, 'password123').then(dec => {
    console.log('✅ Decryption works:', dec);
  });
});

// 4. Test rate limiting
recordLoginAttempt('test@test.com');
recordLoginAttempt('test@test.com');
recordLoginAttempt('test@test.com');
recordLoginAttempt('test@test.com');
recordLoginAttempt('test@test.com');
console.log('Bloquear usuario:', recordLoginAttempt('test@test.com').allowed); // false

// 5. Test sanitización
console.log('Sanitizar XSS:', sanitizeInput('<img src=x onerror="alert(1)">'));

// 6. Ver logs de seguridad
console.table(getSecurityLogs());
```

---

## 🐛 Troubleshooting

### "ReferenceError: sanitizeInput is not defined"
```
→ Asegúrate que security.js está cargado antes
```

### "TweetNaCl is not defined"
```
→ Está bien, usa Web Crypto API automáticamente
```

### "Validation fails pero los datos parecen correctos"
```
→ Verifica error específico: 
console.log(validateCliente(data).errors);
```

### "CSRF token validation failed"
```
→ Regenera token: initCSRFToken()
→ O deshabilita CSRF en desarrollo (NO EN PRODUCCIÓN):
// const skipCSRF = true; // Solo para testing
```

---

## 📚 Próximos Pasos

**Después de implementar esto, lee:**

1. `SECURITY_IMPLEMENTATION.md` - Documentación completa
2. `ENCRYPTION_GUIDE.md` - Cómo encriptar datos
3. `BEST_PRACTICES_SECURITY.md` - Mejores prácticas
4. `SECURITY_LIBRARIES_RESEARCH.md` - Librerías recomendadas

---

## 🆘 Soporte

Si tienes problemas:

1. Abre Developer Tools (F12)
2. Busca errores en console
3. Ejecuta tests en console (arriba)
4. Revisa los archivos de documentación
5. Contacta al equipo de seguridad

---

**¡Listo!** Tu app ahora tiene seguridad de nivel enterprise. 🎉

Tiempo total: ~15 minutos  
Nivel de complejidad: Bajo  
Impacto en UX: Positivo (validación en cliente es más rápida)
