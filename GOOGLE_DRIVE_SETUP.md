# Google Drive Setup - Guía Rápida (15 minutos)

## Objetivo
Configurar sincronización automática entre Google Drive (Excel) y Maya Autopartes en **15 minutos**.

## Requisitos Previos
- Cuenta Google activa
- Acceso a Google Cloud Console
- Node.js 16+
- Maya Autopartes app instalado

---

## Paso 1: Crear Proyecto en Google Cloud Console (3 min)

### 1.1 Acceder a Google Cloud Console
```
https://console.cloud.google.com
```

### 1.2 Crear Nuevo Proyecto
1. Haz clic en el selector de proyectos (arriba a la izquierda)
2. Haz clic en "**NEW PROJECT**"
3. Nombre: `Maya Autopartes Sync`
4. Haz clic en **CREATE**
5. Espera 1-2 minutos a que se cree

### 1.3 Habilitar APIs Necesarias
1. En el menú lateral, ve a **APIs & Services** → **Library**
2. Busca y habilita estos 2 APIs:

**API 1: Google Drive API**
- Busca "Google Drive API"
- Haz clic en el resultado
- Haz clic en **ENABLE**

**API 2: Google Sheets API**
- Busca "Google Sheets API"
- Haz clic en el resultado
- Haz clic en **ENABLE**

---

## Paso 2: Crear Credenciales OAuth 2.0 (5 min)

### 2.1 Crear Pantalla de Consentimiento
1. Ve a **APIs & Services** → **OAuth consent screen**
2. Selecciona **External** como tipo de usuario
3. Haz clic en **CREATE**

**Completa el formulario:**
- **App name:** Maya Autopartes Sync
- **User support email:** Tu email
- **Developer contact:** Tu email
- Haz clic en **SAVE AND CONTINUE**

4. En "Scopes":
   - Haz clic en **ADD OR REMOVE SCOPES**
   - Busca y selecciona:
     - `https://www.googleapis.com/auth/drive.file`
     - `https://www.googleapis.com/auth/spreadsheets`
   - Haz clic en **UPDATE**
   - Haz clic en **SAVE AND CONTINUE**

5. En "Test users":
   - Haz clic en **ADD USERS**
   - Agrega tu email de Google
   - Haz clic en **SAVE AND CONTINUE**

6. Haz clic en **BACK TO DASHBOARD**

### 2.2 Crear Credenciales Cliente OAuth 2.0
1. Ve a **APIs & Services** → **Credentials**
2. Haz clic en **+ CREATE CREDENTIALS**
3. Selecciona **OAuth client ID**
4. Selecciona **Web application**

**Completa:**
- **Name:** Maya Autopartes Web Client
- **Authorized redirect URIs:** Agrega:
  - `http://localhost:5173/auth-callback`
  - `http://localhost:3000/auth-callback` (si usas otro puerto)
  - `https://tu-dominio.com/auth-callback` (producción)

5. Haz clic en **CREATE**

### 2.3 Guardar Credenciales
1. Se abre una ventana con tus credenciales
2. **IMPORTANTE:** Descarga el JSON haciendo clic en el icono de descargar
3. Copia estos valores:
   - **Client ID**
   - **Client Secret**

---

## Paso 3: Configurar Variables de Entorno (2 min)

### 3.1 Crear archivo `.env.local`
En la raíz del proyecto `maya-autopartes-working/`:

```env
# Google Drive OAuth
VITE_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID_HERE
VITE_GOOGLE_CLIENT_SECRET=YOUR_CLIENT_SECRET_HERE
VITE_GOOGLE_REDIRECT_URI=http://localhost:5173/auth-callback

# Feature Flags
VITE_ENABLE_GOOGLE_DRIVE_SYNC=true
```

### 3.2 Reemplazar valores
- Reemplaza `YOUR_CLIENT_ID_HERE` con el Client ID de Paso 2.3
- Reemplaza `YOUR_CLIENT_SECRET_HERE` con el Client Secret de Paso 2.3

---

## Paso 4: Instalar Dependencias (2 min)

```bash
cd api/
npm install
```

Si `googleapis` y `axios` no estén en `package.json`, agrégalos:

```bash
npm install googleapis@118.0.0 axios@1.6.0 xlsx@0.18.5
```

---

## Paso 5: Integrar en la App (3 min)

### 5.1 Importar en tu HTML principal
En `index.html` o el archivo principal de la app:

```html
<script type="module">
  import GoogleDriveSync from './api/google-drive-sync.js';
  
  // Inicializar después de cargar la app
  window.GOOGLE_DRIVE_SYNC = GoogleDriveSync;
  
  // Esperar a que la app esté lista (ajusta según tu estructura)
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      await GoogleDriveSync.init();
      console.log('✅ Google Drive Sync iniciado');
    } catch (error) {
      console.error('❌ Error iniciando sync:', error);
    }
  });
</script>
```

### 5.2 Agregar Elementos UI en HTML
En donde quieras mostrar el estado:

```html
<div class="google-drive-sync-panel">
  <button id="sync-button" class="btn btn-primary">
    🔄 Sincronizar Ahora
  </button>
  
  <div id="sync-status" class="status-indicator status-ok">
    ✓ Último sync hace 2m
  </div>
  
  <div id="sync-error" class="error-panel" style="display:none;"></div>
</div>
```

### 5.3 Registrar elementos UI en JavaScript

```javascript
GoogleDriveSync.registerUIElements({
  syncButton: document.getElementById('sync-button'),
  statusIndicator: document.getElementById('sync-status'),
  lastSyncLabel: document.getElementById('sync-status'),
  errorPanel: document.getElementById('sync-error')
});

GoogleDriveSync.registerCallbacks({
  onSyncStart: () => console.log('🔄 Sync iniciado'),
  onSyncComplete: (data) => console.log('✅ Sync completado:', data),
  onSyncError: (error) => console.error('❌ Error:', error)
});

// Iniciar sync automático cada 60 segundos
GoogleDriveSync.startAutoSync(60000);

// Detectar conexión/desconexión
GoogleDriveSync.setupOfflineDetection();
```

---

## Paso 6: Probar la Integración (1 min)

### 6.1 Iniciar la aplicación
```bash
npm run dev
```

### 6.2 Verificar logs
En la consola del navegador (F12):
- Deberías ver: `🚀 Inicializando Google Drive Sync...`
- Si no hay tokens guardados, verás: `🔐 Iniciando flujo OAuth 2.0...`

### 6.3 Completar OAuth
1. Se redirige a Google
2. Haz clic en "Permitir" para dar acceso
3. Se redirige de vuelta a la app
4. Deberías ver: `✅ Sesión restaurada` o `✅ Tokens obtenidos exitosamente`

### 6.4 Verificar sincronización
- Deberías ver: `✅ Archivo Excel listo: Maya_Autopartes_Inventario.xlsx`
- En Google Drive, busca la carpeta "Maya Autopartes" con el archivo Excel

---

## Troubleshooting

### Error: "invalid_client"
- Verifica que Client ID y Client Secret sean correctos
- Verifica que los APIs estén habilitados (Drive + Sheets)

### Error: "redirect_uri_mismatch"
- Verifica que el redirect URI en `.env.local` coincida con el de Google Cloud Console
- No olvides agregar `http://` o `https://`

### No aparece botón "Sincronizar Ahora"
- Verifica que los elementos HTML tengan los IDs correctos
- Abre la consola (F12) y verifica que no haya errores de JavaScript

### Excel no se sincroniza
- Verifica que haya conexión a internet
- Abre el archivo Excel en Google Drive manualmente
- Comprueba que el formato de columnas coincida con `GOOGLE_DRIVE_API_GUIDE.md`

### Error: "The caller does not have permission to access the resource"
- En Google Cloud Console, ve a APIs & Services → Credentials
- Verifica que OAuth consent screen esté configurado como "External"
- Agrega tu email en "Test users"

---

## Próximos Pasos

1. **Personalizar mapeo de columnas** → Ver `EXCEL_MAPPING_CONFIG.md`
2. **Configurar intervalo de sync** → Ver `GOOGLE_DRIVE_API_GUIDE.md`
3. **Entender manejo de conflictos** → Ver `GOOGLE_DRIVE_API_GUIDE.md`
4. **Desplegar a producción** → Ver `DEPLOY_VERCEL.md`

---

## Verificación Final

Completa esta checklist:

- [ ] Proyecto creado en Google Cloud Console
- [ ] Drive API habilitado
- [ ] Sheets API habilitado
- [ ] OAuth consent screen configurado
- [ ] Credenciales OAuth creadas
- [ ] `.env.local` con Client ID y Secret
- [ ] Dependencias npm instaladas
- [ ] Módulos importados en HTML/JS
- [ ] Elementos UI agregados
- [ ] App inicia sin errores
- [ ] OAuth flujo funciona
- [ ] Archivo Excel creado en Drive
- [ ] Sincronización automática activa

¡Si todo está verde, estás listo! 🎉

---

**Tiempo total:** ~15 minutos
**Soporte:** Revisa `GOOGLE_DRIVE_API_GUIDE.md` para detalles técnicos
