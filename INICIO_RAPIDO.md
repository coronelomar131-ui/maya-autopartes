# ⚡ Inicio Rápido: Compac + Google Drive

¿Tienes prisa? Aquí está el resumen en 3 pasos.

## 🎯 ¿Qué hace esta integración?

Cuando hagas clic en **📤 Drive** en una factura → Se guarda automáticamente en Google Drive ✅

---

## 📋 Pasos (30-45 minutos)

### Paso 1️⃣: Preparar Google Drive (10 minutos)

1. **Crear carpeta**
   - Ve a [drive.google.com](https://drive.google.com)
   - Nueva carpeta: "Maya Autopartes Facturas"
   - Copia el ID de la URL: `...folders/[ESTE_ID]`

2. **Crear Service Account**
   - Ve a [console.cloud.google.com](https://console.cloud.google.com)
   - Nuevo proyecto: "Maya Autopartes Sync"
   - APIs & Services > Credentials > Service Account
   - Descarga JSON
   - Comparte la carpeta con el email del Service Account (está en el JSON)

3. **Guarda estos datos:**
   ```
   📌 Google Drive Folder ID: 1A2B3C4D5E6F...
   📌 Google Service Account JSON: (archivo descargado)
   ```

### Paso 2️⃣: Obtener credenciales de Compac (5 minutos)

1. Accede a Compac
2. Configuración > Integraciones > API
3. Copia tu API URL (ej: `https://api.compac.com/v1/`)
4. Copia tu API Key

   ```
   📌 Compac API URL: https://api.compac.com/...
   📌 Compac API Key: tu_api_key_aqui
   ```

**⚠️ Aún no tienes acceso a Compac?**
- Salta este paso por ahora
- Puedes configurarlo después cuando tengas acceso

### Paso 3️⃣: Desplegar Backend en Vercel (15 minutos)

1. Ve a [vercel.com](https://vercel.com) > New Project
2. Importa tu repo de GitHub (`maya-autopartes`)
3. Deploy (1-2 minutos)
4. Copia la URL: `https://tu-proyecto.vercel.app`

**Nota:** Ver guía completa en `DEPLOY_VERCEL.md` si necesitas más detalles

### Paso 4️⃣: Configurar en la App (5 minutos)

1. Abre **Configuración > Integraciones**
2. Completa los campos:
   - **Google Drive Folder ID**: Tu ID
   - **Google Service Account JSON**: Todo el JSON
   - **Compac API URL**: Tu URL
   - **Compac API Key**: Tu Key
3. Haz clic en **🔗 Probar Drive** y **🔗 Probar Compac**
4. Si ves ✅, ¡perfecto!
5. Haz clic en **💾 Guardar**

### Paso 5️⃣: Usar

1. Ve a **Facturas**
2. Busca una factura
3. Haz clic en **📤 Drive**
4. Espera ✅ "Sincronizado..."
5. Abre Google Drive y verifica

---

## 🎓 Si Algo Sale Mal

| Problema | Solución |
|----------|----------|
| ❌ "Falta configurar integraciones" | Vuelve al Paso 4️⃣, completa todos los campos |
| ❌ Error en Google Drive | Verifica que el JSON sea válido, copia todo sin espacios extra |
| ❌ Error en Compac | Verifica que la URL y Key sean correctas |
| ❌ Error de backend | Verifica logs en Vercel dashboard |

---

## 📚 Guías Completas

Si necesitas más detalles:

- **SETUP_INTEGRACIONES.md** - Guía paso a paso completa
- **DEPLOY_VERCEL.md** - Cómo desplegar el backend
- **CAMBIOS_RESUMEN.md** - Qué se cambió en el código

---

## ✅ Listo

Cuando todo esté configurado:
1. ✅ Puedes sincronizar facturas a Drive
2. ✅ Aparecen automáticamente en la carpeta
3. ✅ Puedes compartir la carpeta con otros usuarios
4. ✅ Todos ven las facturas en tiempo real

---

**¿Preguntas?** Lee **SETUP_INTEGRACIONES.md** sección FAQ.

🚀 **¡Adelante!**
