# 🚀 OneDrive Sync - Setup Rápido (15 minutos)

**Objetivo**: Conectar tu Excel en OneDrive a la app de Facturas

---

## 1️⃣ Configurar Microsoft Azure App (5 min)

### A. Ir a Azure Portal
```
1. Abre: https://portal.azure.com
2. Inicia sesión con tu cuenta Microsoft/Office 365
3. Busca "App registrations" en el buscador
```

### B. Crear nueva app
```
1. Click en "New registration"
2. Completa:
   Name: "Maya Autopartes Sync"
   Account types: "Accounts in any organizational directory (Any Azure AD directory - Multitenant)"
   Redirect URI (Web): https://tu-sitio.com/auth-callback
   
   ℹ️ Si está en desarrollo local:
   Redirect URI: http://localhost:5173/auth-callback (Vite)
   Redirect URI: http://localhost:3000/auth-callback (React/Next)
```

### C. Copiar Client ID
```
1. En la página de la app, busca "Application (client) ID"
2. Copia el valor (xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
3. Guardalo en variable de entorno: VITE_MS_CLIENT_ID
```

### D. Agregar permisos
```
1. En el menú izquierdo: "API permissions"
2. Click "Add a permission"
3. Busca "Microsoft Graph"
4. Selecciona "Delegated permissions"
5. Busca y selecciona:
   - Files.ReadWrite.All
   - offline_access
6. Click "Add permissions"
7. Click "Grant admin consent" (si tienes permiso)
```

---

## 2️⃣ Instalar Librerías (3 min)

```bash
# En la carpeta del proyecto
cd C:\Users\omar\maya-autopartes-working

# Instalar dependencias
npm install axios@^1.6.0 exceljs@^4.4.0 xlsx@^0.18.5 date-fns@^2.30.0

# Opcional: Monitoreo en producción
npm install @sentry/browser@^7.0.0
```

**Verificar instalación:**
```bash
npm list | grep -E "axios|exceljs|xlsx|date-fns"
```

---

## 3️⃣ Variables de Entorno (2 min)

### Crear archivo .env.local

```bash
# En la raíz del proyecto
cat > .env.local << 'EOF'
VITE_MS_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_MS_TENANT_ID=common
VITE_APP_NAME=Maya Autopartes Sync
EOF
```

**Dónde obtener VITE_MS_CLIENT_ID:**
- Azure Portal → App registrations → Tu app → "Application (client) ID"

---

## 4️⃣ Importar Módulo en tu App (3 min)

### En tu archivo principal (index.html o main.js)

```html
<!-- index.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Maya Autopartes</title>
</head>
<body>
  <!-- Tu HTML aquí -->
  
  <!-- Botón para conectar OneDrive -->
  <button id="connect-onedrive">🔗 Conectar OneDrive</button>
  <span id="onedrive-status"></span>

  <!-- Cargar librería XLSX (para parsing) -->
  <script src="https://cdn.jsdelivr.net/npm/xlsx@latest/dist/xlsx.full.min.js"></script>

  <!-- Tu módulo -->
  <script type="module">
    import {
      initOneDriveAuth,
      monitorExcelChanges,
      stopMonitorExcelChanges,
      CONFIG
    } from './api/onedrive-sync.js';

    // Botón conectar
    document.getElementById('connect-onedrive').addEventListener('click', async () => {
      const btn = event.target;
      btn.disabled = true;
      btn.textContent = '⏳ Conectando...';

      const success = await initOneDriveAuth();
      if (success) {
        // Mostrar que está conectado
        document.body.classList.add('onedrive-connected');
        document.getElementById('onedrive-status').textContent = '✅ Conectado';
        btn.textContent = '✅ Conectado';

        // Iniciar monitoreo automático
        monitorExcelChanges();
        console.log('📡 Sincronización iniciada');
      } else {
        btn.disabled = false;
        btn.textContent = '🔗 Conectar OneDrive';
        alert('Error al conectar. Intenta de nuevo.');
      }
    });

    // Escuchar cambios desde OneDrive
    window.addEventListener('onedrive:sync', (e) => {
      console.log('✅ Sincronizado:', e.detail.facturas.length, 'facturas');
      console.log('Cambios:', e.detail.changes);

      // AQUÍ: Refrescar tu UI con las nuevas facturas
      // Ejemplo:
      // renderVentas(e.detail.facturas);
      // actualizarTabla(e.detail.facturas);
    });

    // Escuchar errores de sync
    window.addEventListener('onedrive:sync-error', (e) => {
      console.error('❌ Error de sincronización:', e.detail.error);
      // Mostrar notificación al usuario
      // toast('Error: ' + e.detail.error);
    });

    // Limpiar cuando salga
    window.addEventListener('beforeunload', () => {
      stopMonitorExcelChanges();
    });
  </script>
</body>
</html>
```

---

## 5️⃣ Crear Página de Callback (1 min)

### Crear auth-callback.html

```html
<!-- auth-callback.html -->
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Autenticando con OneDrive...</title>
  <style>
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      background: #f0f0f0;
      font-family: Arial, sans-serif;
    }
    .container {
      text-align: center;
      background: white;
      padding: 40px;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="spinner"></div>
    <p>Procesando autenticación con Microsoft OneDrive...</p>
    <p><small>Esta página se cerrará automáticamente</small></p>
  </div>

  <script type="module">
    import { handleOAuthCallback } from './api/onedrive-sync.js';

    // Obtener código de autorización de la URL
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    if (error) {
      console.error('OAuth Error:', error, errorDescription);
      alert('❌ Error de autenticación:\n' + (errorDescription || error));
      window.location.href = '/';
    } else if (code) {
      // Procesar callback
      handleOAuthCallback(code)
        .then((success) => {
          if (success) {
            console.log('✅ Autenticación exitosa');
            // Volver a la página principal
            window.location.href = '/?onedrive=connected';
          } else {
            throw new Error('Falló el procesamiento');
          }
        })
        .catch((err) => {
          console.error('Error procesando callback:', err);
          alert('❌ Error procesando la autenticación');
          window.location.href = '/';
        });
    } else {
      alert('Código de autorización no encontrado');
      window.location.href = '/';
    }
  </script>
</body>
</html>
```

---

## 6️⃣ Preparar Excel en OneDrive (2 min)

### Estructura esperada

```
Excel file: "Facturas_Maya_Autopartes.xlsx"
Sheet name: "Facturas"

Columnas requeridas:
┌─────────────┬──────────┬────────┬───────┬─────┬────┐
│ Número      │ Cliente  │ Fecha  │ Neto  │ IVA │... │
├─────────────┼──────────┼────────┼───────┼─────┼────┤
│ 001-2026... │ Cliente1 │ ...    │ 1000  │ 160 │... │
│ 001-2026... │ Cliente2 │ ...    │ 2000  │ 320 │... │
└─────────────┴──────────┴────────┴───────┴─────┴────┘
```

### Crear archivo de ejemplo

Si no tienes el Excel:

```javascript
// En consola del navegador, después de instalación
// Para crear Excel de ejemplo

const XLSX = window.XLSX;

const data = [
  {
    'Número': '001-2026-0001',
    'Cliente': 'Cliente Test',
    'Fecha': '2026-04-22',
    'Neto': 1000,
    'IVA': 160,
    'Total': 1160,
    'Saldo': 1160,
    'Producto': 'Producto Test',
    'Marca': 'Marca Test',
    'Piezas': '10',
    'OC': 'OC-123',
    'Estatus': 'Pendiente',
    'Vendedor': 'Estefanya'
  }
];

const ws = XLSX.utils.json_to_sheet(data);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
XLSX.writeFile(wb, 'Facturas_Maya_Autopartes.xlsx');
```

### Subir a OneDrive

1. Abre OneDrive: https://onedrive.live.com
2. Sube el archivo "Facturas_Maya_Autopartes.xlsx"
3. Debe estar en la raíz (root) de tu OneDrive

---

## 7️⃣ Probar Sincronización (1 min)

### Verificar en consola

```javascript
// Abre DevTools (F12) → Consola

// 1. Verificar autenticación
console.log('Estado:', window.STATE);
// Debe mostrar: accessToken, userId, etc.

// 2. Verificar que se detectan cambios
window.addEventListener('onedrive:sync', (e) => {
  console.log('✅ Sync completado:', e.detail);
});

// 3. Verificar almacenamiento local
console.log('Facturas en localStorage:', JSON.parse(localStorage.getItem('ma4_v')));
```

### Test manual

1. Haz un cambio en el Excel en OneDrive
2. Espera máximo 1 minuto
3. Revisa la consola → debería ver "✅ Sync completado"
4. Revisa localStorage → debería ver los datos actualizados

---

## ✅ Checklist de Verificación

- [ ] Azure App creada con Client ID
- [ ] Variables de entorno configuradas (.env.local)
- [ ] Librerías instaladas (npm list)
- [ ] Módulo onedrive-sync.js en `/api/`
- [ ] auth-callback.html creado
- [ ] Botón "Conectar OneDrive" en HTML
- [ ] Event listeners configurados
- [ ] Excel preparado en OneDrive
- [ ] Puedes hacer click en "Conectar OneDrive" → Redirige a Microsoft
- [ ] Después de autenticación → Vuelve a tu app
- [ ] localStorage tiene tokens guardados
- [ ] El sync se ejecuta cada minuto (verifica consola)

---

## 🐛 Troubleshooting Rápido

### Problema: "Invalid Client ID"
```
Solución:
1. Abre Azure Portal → App registrations
2. Copia el "Application (client) ID" exacto
3. Pégalo en .env.local como VITE_MS_CLIENT_ID
4. Recarga la página
```

### Problema: "Redirect URI mismatch"
```
Solución:
1. Azure Portal → App registration → Authentication
2. Verifica que "Redirect URIs" incluye: https://tu-sitio.com/auth-callback
3. O http://localhost:5173/auth-callback (desarrollo)
4. Haz que coincida exactamente
```

### Problema: "File not found"
```
Solución:
1. Verifica que el Excel se llama exactamente: "Facturas_Maya_Autopartes.xlsx"
2. Está en la raíz de OneDrive (no en carpeta)
3. La hoja se llama "Facturas"
4. En consola: console.log(localStorage.getItem('onedrive_auth'))
   Debe tener token
```

### Problema: "CORS error"
```
Solución:
Esto NO debería ocurrir con Microsoft Graph API
Si ocurre: Verifica que headers incluyen:
'Authorization': `Bearer ${accessToken}`
```

### Problema: "No cambios detectados"
```
Solución:
1. Espera 60 segundos (intervalo de polling)
2. Revisa DevTools → Network → Ver requests a graph.microsoft.com
3. En consola: console.log(STATE.deltaToken) 
   Debe haber deltaToken guardado
```

---

## 📊 Monitoreo

### Logs en Consola

```javascript
// Habilitar logs detallados
localStorage.setItem('DEBUG', 'onedrive:*');

// Ver cambios
window.addEventListener('onedrive:sync', (e) => {
  console.table(e.detail.facturas);
});

// Ver errores
window.addEventListener('onedrive:sync-error', (e) => {
  console.error(e.detail.error);
});
```

### Verificar Storage

```javascript
// Facturas sincronizadas
console.log(JSON.parse(localStorage.getItem('ma4_v')));

// Token de autenticación
console.log(JSON.parse(localStorage.getItem('onedrive_auth')));

// Timestamp del último sync
console.log(localStorage.getItem('onedrive_last_sync'));

// Delta token para cambios incrementales
console.log(localStorage.getItem('onedrive_delta_token'));
```

---

## 🎯 Próximos Pasos

### Después del setup:

1. **Integrar en tu UI**
   ```javascript
   window.addEventListener('onedrive:sync', (e) => {
     // Actualizar tu tabla de facturas
     renderVentas(e.detail.facturas);
   });
   ```

2. **Capturar cambios de la app**
   ```javascript
   document.addEventListener('factura:saved', async (e) => {
     // Cuando crees una factura, subirla a Excel
     await pushChangesToExcel([e.detail.factura]);
   });
   ```

3. **Agregar UI de estado**
   ```html
   <div id="sync-status">
     <span class="dot pulse"></span> Sincronizando...
   </div>
   ```

4. **Monitoreo (Fase 2)**
   - Agregar Sentry para error tracking
   - Logging centralizado
   - Alertas en tiempo real

---

## 📞 Soporte

Si tienes problemas:

1. Revisa la **Consola del navegador** (F12)
2. Verifica **localStorage** (F12 → Application → Storage)
3. Busca en **ONEDRIVE_SYNC_DOCUMENTATION.md**
4. Revisa **Troubleshooting** más arriba

---

*Guía de setup: 2026-04-22*  
*Tiempo estimado: 15 minutos*  
*Después: Sincronización automática en tiempo real ✅*
