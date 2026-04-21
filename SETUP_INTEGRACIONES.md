# 🔗 Setup de Integraciones: Compac + Google Drive

## ¿Qué hace?

Esta integración sincroniza automáticamente tus facturas de Compac a Google Drive, de modo que:
- ✅ Las facturas se guardan en una carpeta compartida en Drive
- ✅ Todos pueden acceder y ver las facturas en tiempo real
- ✅ Quedan organizadas por fecha/cliente

## Pasos de Configuración

### Fase 1: Google Drive Setup (10 minutos)

#### 1.1 Crear Carpeta en Google Drive
1. Ve a [Google Drive](https://drive.google.com)
2. Crea una carpeta: **"Maya Autopartes Facturas"** (o el nombre que prefieras)
3. Copia el ID de la carpeta de la URL:
   ```
   https://drive.google.com/drive/folders/[ESTE_ES_TU_ID]
   ```
4. Guarda este ID para más adelante

#### 1.2 Crear Google Service Account
1. Ve a [Google Cloud Console](https://console.cloud.google.com)
2. Crea un nuevo proyecto: **"Maya Autopartes Sync"**
3. Ve a **APIs & Services > Credentials**
4. Haz clic en **+ Create Credentials > Service Account**
5. Completa los detalles:
   - Name: `maya-sync`
   - Email se genera automáticamente
6. Dale estos permisos (no son obligatorios para esta función):
   - Editor
7. Ve a la sección **Keys** de la Service Account
8. Haz clic en **Add Key > Create new key > JSON**
9. Se descargará un archivo JSON - **GUARDA ESTO EN LUGAR SEGURO**
10. Copia el contenido completo del JSON

#### 1.3 Compartir Carpeta con Service Account
1. Abre el archivo JSON que descargaste
2. Busca el campo `client_email` (ej: `maya-sync@xxxxx.iam.gserviceaccount.com`)
3. Ve a tu carpeta en Google Drive
4. Comparte la carpeta y agrega ese email como **Editor**

### Fase 2: Compac Setup (10 minutos)

#### 2.1 Obtener Credenciales de Compac
1. Accede a tu cuenta de Compac
2. Ve a **Configuración > Integraciones > API**
3. Busca o genera una **API Key** (También llamada "Token" o "Access Key")
4. Copia la URL base de tu API (ej: `https://api.compac.com/v1/` o `https://tu-compac.com/api/`)
5. **GUARDA ESTAS CREDENCIALES**

**Nota:** Si aún no tienes acceso a Compac, salta este paso por ahora. Puedes configurarlo más adelante cuando tengas acceso.

### Fase 3: Desplegar Backend Helper (5 minutos)

El backend helper es una función serverless que descarga archivos de Compac y los sube a Google Drive (bypass CORS).

#### 3.1 Opción A: Desplegar en Vercel (Recomendado)

1. Ve a [Vercel.com](https://vercel.com) y crea una cuenta (gratis)
2. Importa tu repositorio de GitHub o la carpeta `/api` del proyecto
3. Durante el setup, agrega estas **Environment Variables** en Vercel:
   ```
   COMPAC_API_URL = https://tu-compac-url/api/
   COMPAC_API_KEY = tu_api_key_aqui
   ```
4. Haz deploy
5. Tu función estará en: `https://tu-proyecto.vercel.app/api/sync-to-drive`

#### 3.2 Opción B: Firebase Cloud Functions
1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Crea un nuevo proyecto
3. Ve a **Build > Functions**
4. Despliega la función desde `/api/sync-to-drive.js`
5. Tu función estará en: `https://region-tu-proyecto.cloudfunctions.net/syncToDrive`

#### 3.3 Opción C: Supabase Edge Functions
1. Ve a tu proyecto en Supabase
2. Ve a **Edge Functions**
3. Crea una nueva función
4. Copia el código de `api/sync-to-drive.js` (adaptar imports si es necesario)

### Fase 4: Configurar en la App (5 minutos)

1. Abre Maya Autopartes
2. Ve a **Configuración > Integraciones**
3. Completa estos campos:

#### Google Drive
- **Folder ID**: (obtenido en Fase 1.1)
  ```
  Ejemplo: 1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P
  ```
- **Service Account JSON**: (JSON completo de Fase 1.2)
  ```
  {
    "type": "service_account",
    "project_id": "xxxxx",
    ...
    "private_key": "-----BEGIN PRIVATE KEY-----\n....\n-----END PRIVATE KEY-----\n"
  }
  ```

#### Compac
- **API URL**: (de Fase 2.1)
  ```
  https://api.compac.com/v1/
  ```
- **API Key/Token**: (de Fase 2.1)
  ```
  tuApiKeyAqui1234567890
  ```

4. Haz clic en **🔗 Probar Compac** - deberías ver ✅
5. Haz clic en **🔗 Probar Drive** - deberías ver ✅
6. Haz clic en **💾 Guardar**

### Fase 5: Usar la Sincronización

#### Manual (Ya disponible)
1. Ve a **Ventas**
2. Busca una venta
3. Haz clic en **📤 Sincronizar a Drive**
4. Deberías ver un mensaje: ✅ Sincronizado a Google Drive
5. Ve a tu carpeta en Google Drive y verifica que aparezca el archivo

#### Automática (Próximamente)
- Cuando generes una factura en Compac, se sincronizará automáticamente
- Esto requiere un webhook en Compac que notifique a tu backend

---

## ⚠️ Preguntas Frecuentes

### "¿Dónde guardo mis credenciales de forma segura?"
- **Nunca** compartas tus JSON o API Keys en emails/mensajes
- En Vercel/Firebase, están encriptadas en variables de entorno
- En la app, se guardan en localStorage (considera usar HTTPS en producción)

### "¿Puedo compartir la carpeta de Drive con otros usuarios?"
- Sí, después de configurar la integración, comparte la carpeta normalmente en Drive
- Todos los usuarios que tengan acceso a la carpeta verán las facturas sincronizadas

### "¿Qué pasa si la sincronización falla?"
- Revisa los logs en Vercel/Firebase
- Verifica que las credenciales sean válidas
- Asegúrate de que la carpeta de Drive tenga permisos para el Service Account

### "¿Puedo cambiar la carpeta de destino?"
- Sí, solo cambia el Folder ID en Configuración > Integraciones
- Las facturas futuras irán a la nueva carpeta

### "¿Se sincronizan las facturas antiguas?"
- No, solo las facturas nuevas o que sincronices manualmente
- Puedes sincronizar facturas antiguas una por una

---

## 📝 Próximos Pasos

Después de configurar las integraciones, puedes:
1. **Webhook automático** - Configura Compac para notificar cuando hay nuevas facturas
2. **Organización mejorada** - Crear subcarpetas por cliente/mes
3. **Notificaciones** - Recibir alertas cuando se sincronice una factura

¡Cualquier pregunta, contáctame! 📧

---

## 🔐 Checklist de Seguridad

- [ ] Google Service Account creado
- [ ] Carpeta compartida con Service Account email
- [ ] API Key de Compac guardada de forma segura
- [ ] Backend desplegado en Vercel/Firebase
- [ ] Credenciales probadas en la app
- [ ] No compartes tus JSON o Keys en mensajes/emails
