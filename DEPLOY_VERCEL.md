# 🚀 Deploy en Vercel (Backend Helper)

Este documento te guía paso a paso para desplegar la función serverless en Vercel.

## Requisitos Previos

- Cuenta de Vercel (gratis en [vercel.com](https://vercel.com))
- Cuenta de GitHub (Vercel se integra con GitHub)
- Credenciales de Compac API
- Credenciales de Google Service Account (de SETUP_INTEGRACIONES.md)

## Paso 1: Preparar el Repositorio

### Opción A: Si tienes el proyecto en GitHub

```bash
# Navega a la carpeta del proyecto
cd /c/Users/omar/maya-autopartes

# Inicializar git si no lo has hecho
git init
git add .
git commit -m "Initial commit with Compac + Drive integration"

# Crear repo en GitHub y push
git remote add origin https://github.com/tu-usuario/maya-autopartes.git
git push -u origin main
```

### Opción B: Si prefieres desplegar solo la carpeta `/api`

1. Crea una carpeta nueva: `maya-autopartes-backend`
2. Copia los archivos:
   - `api/sync-to-drive.js`
   - `api/package.json`
3. Crea un nuevo repositorio en GitHub con estos archivos

## Paso 2: Conectar GitHub con Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Haz login o crea una cuenta (gratis)
3. Haz clic en **"New Project"**
4. Selecciona **"Import Git Repository"**
5. Busca tu repositorio `maya-autopartes` (o `maya-autopartes-backend`)
6. Haz clic en **"Import"**

## Paso 3: Configurar Environment Variables

En la página de importación, verás una sección de **Environment Variables**:

### Configuración para Compac + Google Drive

No es necesario agregar las credenciales de Compac/Google aquí si solo harás testing local. Sin embargo, puedes agregarlas si quieres que el backend tenga valores por defecto:

```
COMPAC_API_URL = https://api.compac.com/v1/
COMPAC_API_KEY = tu_api_key_aqui (OPCIONAL)
```

**IMPORTANTE:** Las credenciales principales (Service Account JSON y API Key real) se pasan desde la app, no desde Vercel.

## Paso 4: Deploy

1. Haz clic en **"Deploy"**
2. Espera 1-2 minutos mientras Vercel construye y despliega
3. Cuando termine, verás un URL como:
   ```
   https://maya-autopartes.vercel.app
   ```

## Paso 5: Verificar el Deploy

### Probar la función en la consola del navegador

1. Ve a tu app de Maya Autopartes
2. Abre DevTools (F12)
3. En la consola, copia y pega:

```javascript
fetch('https://tu-proyecto.vercel.app/api/sync-to-drive', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    compacFileUrl: 'https://ejemplo.com/archivo.pdf',
    compacAuth: '{}',
    driveServiceAccount: '{"project_id":"test"}',
    driveFolderId: 'test123',
    fileName: 'test.pdf'
  })
})
.then(r => r.json())
.then(d => console.log(d))
```

Deberías ver una respuesta (error o éxito).

## Paso 6: Actualizar la App

Ahora necesitas actualizar la URL en `index.html`:

1. Abre `index.html`
2. Busca esta línea:
   ```javascript
   const backendUrl = 'https://tu-vercel-domain.vercel.app/api/sync-to-drive';
   ```
3. Reemplaza `tu-vercel-domain` con tu proyecto (ej: `maya-autopartes`)
4. Guarda el archivo
5. Commit y push:
   ```bash
   git add index.html
   git commit -m "Update backend URL to Vercel"
   git push
   ```

## Paso 7: Configurar la App

1. Abre **Configuración > Integraciones**
2. Completa:
   - **Google Drive Folder ID**: Tu ID de carpeta
   - **Google Service Account JSON**: Tu JSON completo
   - **Compac API URL**: Tu URL (ej: `https://api.compac.com/v1/`)
   - **Compac API Key**: Tu API Key
3. Haz clic en **🔗 Probar Compac** y **🔗 Probar Drive**
4. Si ves ✅, todo está bien!
5. Haz clic en **💾 Guardar**

## Paso 8: Probar la Sincronización

1. Ve a **Facturas**
2. Busca una factura
3. Haz clic en **📤 Drive**
4. Deberías ver:
   - ⏳ "Syncing..." (mientras se procesa)
   - ✅ "Sincronizado a Drive: ..." (éxito)
   - ❌ Mensaje de error (si falla)

5. Abre tu carpeta en Google Drive y verifica que aparezca el archivo

## 🔧 Troubleshooting

### Error: "Method not allowed" (405)
- La función espera un POST, asegúrate de usar el método correcto

### Error: CORS
- Vercel debería manejar CORS automáticamente
- Si persiste, revisa los headers en `sync-to-drive.js`

### Error: "Missing required fields"
- Verifica que estés mandando todos los parámetros:
  - `compacFileUrl`
  - `compacAuth`
  - `driveServiceAccount`
  - `driveFolderId`
  - `fileName`

### Error: "Invalid service account JSON"
- El JSON debe ser válido
- Debe tener `project_id` y `private_key`
- No debe tener espacios extra o caracteres de escape incorrectos

### Error: "Compac API error"
- Verifica que la URL de Compac sea correcta
- Verifica que el API Key sea válido
- Revisa los logs en el dashboard de Vercel

### Error: "Drive authentication failed"
- Verifica que el JSON del Service Account sea completo
- Verifica que hayas compartido la carpeta con el email del Service Account

## 📊 Ver Logs de la Función

1. Ve a tu proyecto en Vercel
2. Haz clic en **"Functions"**
3. Selecciona **"sync-to-drive"**
4. Verás los logs de cada invocación
5. Busca **"⏳ Descargando"**, **"✅"**, o **"❌"** para ver qué pasó

## 🎯 Próximos Pasos

Una vez que todo está funcionando:

1. ✅ Prueba sincronizar varias facturas
2. ✅ Verifica que los archivos aparezcan en Google Drive
3. ✅ Comparte el enlace de Drive con otros usuarios
4. ✅ Considera agregar notificaciones o alertas

## ⚠️ Notas de Seguridad

- Las credenciales viajan cifradas por HTTPS
- Vercel proporciona SSL automáticamente
- Considera agregar autenticación en la función (API Key extra)
- No dejes las credenciales en el código fuente

## 💡 Consejos

- Usa un nombre de proyecto claro: `maya-autopartes-sync`
- Monitorea los costos en el dashboard de Vercel (debería ser gratis)
- Actualiza los permisos del Service Account solo si es necesario
- Realiza backups de tus credenciales en un lugar seguro

---

**¡Listo!** 🎉 Tu backend está desplegado y funcionando.

Si tienes problemas, consulta:
- [Documentación de Vercel](https://vercel.com/docs)
- [Documentación de Google Drive API](https://developers.google.com/drive/api)
- [Documentación de Compac](https://tucompac.com/api/docs)
