# Setup MercadoLibre Integration - Maya Autopartes

**Tiempo estimado: 20-30 minutos**

## 📋 Tabla de Contenidos

1. [Requisitos Previos](#requisitos-previos)
2. [Crear Aplicación en MercadoLibre](#crear-aplicación-en-mercadolibre)
3. [Configurar en Maya Autopartes](#configurar-en-maya-autopartes)
4. [Probar Conexión](#probar-conexión)
5. [Solucionar Problemas](#solucionar-problemas)
6. [FAQ](#faq)

---

## Requisitos Previos

✅ Cuenta en MercadoLibre (vendedor o normal)
✅ Acceso a https://maya-autopartes.vercel.app
✅ Browser actualizado (Chrome, Firefox, Safari)
✅ Conexión a internet estable

---

## Crear Aplicación en MercadoLibre

### Paso 1: Ir a Developers

1. Entrar a **https://www.mercadolibre.com.mx** con tu cuenta
2. Click en tu perfil (arriba a la derecha)
3. Seleccionar **"Aplicaciones"** o ir directo a **https://developers.mercadolibre.com.mx/dashboard**

> **Si no ves opción "Aplicaciones":**
> - Ir directo a: https://developers.mercadolibre.com.mx/dashboard
> - Usar tu usuario/contraseña de MercadoLibre

### Paso 2: Crear Nueva Aplicación

1. Click en **"Crear aplicación"** (botón azul)
2. Rellenar formulario:
   - **Nombre**: `Maya Autopartes Sync`
   - **Descripción**: `Sincronización automática de inventario entre Maya Autopartes y MercadoLibre`
   - **Tipo**: Seleccionar tipo de aplicación (ej. "Herramienta de Gestión")
   - **URL**: `https://maya-autopartes.vercel.app`

3. Click en **"Crear"**

### Paso 3: Obtener Credenciales

Una vez creada la aplicación:

1. **Copiar Client ID** (mínimo de caracteres)
2. **Copiar Client Secret** (proteger como contraseña)
3. **Configurar Redirect URI**: 
   - Ir a sección "Configuración" o "OAuth"
   - Agregar Redirect URI: `https://maya-autopartes.vercel.app/auth/meli-callback`
   - Guardar

> ⚠️ **IMPORTANTE**: Client Secret nunca debe exponerse públicamente. Está guardado en `localStorage` del navegador (se considera seguro para MVP).

---

## Configurar en Maya Autopartes

### Paso 1: Abrir Modal de Integraciones

1. En Maya Autopartes, ir a **⚙️ Configuración**
2. Click en pestaña **"Integraciones"** o **"MercadoLibre"**
3. Buscar sección **"MercadoLibre"**

### Paso 2: Agregar Credenciales

Llenar los campos:
- **Client ID**: Pegar el Client ID de MELI
- **Client Secret**: Pegar el Client Secret (se encripta localmente)
- **Estado**: Mostrar estado de conexión

```
┌─────────────────────────────────────┐
│ MercadoLibre Integration            │
├─────────────────────────────────────┤
│ Client ID: [________________]       │
│ Client Secret: [______________]    │
│ [🔗 Conectar con MercadoLibre]    │
│                                     │
│ Estado: ❌ No conectado             │
└─────────────────────────────────────┘
```

### Paso 3: Conectar con MercadoLibre

1. Click en **"🔗 Conectar con MercadoLibre"**
2. Se abrirá ventana de login de MELI
3. Confirmar con tu usuario
4. Permitir acceso a tus datos y publicaciones
5. Se cerrará automáticamente y volverás a Maya Autopartes

Resultado esperado:
```
Estado: ✅ Conectado (Usuario: 123456789)
Último sincronización: hace 2 minutos
Productos sincronizados: 15 / 63
```

---

## Probar Conexión

### Test 1: Validar Credenciales

En modal de configuración:
1. Click en **"✓ Probar conexión"** o similar
2. Debe mostrar: `✅ Credenciales válidas` o `✅ Conectado como: [nombre_usuario]`

### Test 2: Sincronizar Ahora

1. En modal o en tabla de inventario
2. Click en **"🔄 Sincronizar ahora"** o **"📤 Sync MELI"**
3. Esperar 10-30 segundos
4. Ver resultado:
   - Productos creados: X
   - Productos actualizados: Y
   - Errores: 0

Ejemplo:
```
Sincronización completada ✅
- Productos creados: 5
- Productos actualizados: 10
- Errores: 0
- Tiempo: 15.3s
```

### Test 3: Verificar en MercadoLibre

1. Ir a **https://www.mercadolibre.com.mx** → Mis publicaciones
2. Buscar productos con nombre que empiece con "Puerta" o similar
3. Verificar:
   - ✅ Título visible
   - ✅ Precio correcto
   - ✅ Stock disponible
   - ✅ Descripción con notas

---

## Solucionar Problemas

### ❌ Error: "Cliente ID o Secret inválido"

**Causa**: Credenciales mal copiadas o generadas incorrectamente

**Solución**:
1. Ir a https://developers.mercadolibre.com.mx/dashboard
2. Seleccionar aplicación "Maya Autopartes Sync"
3. Copiar nuevamente Client ID y Secret
4. Borrar valores en Maya Autopartes y pegar correctos
5. Click "Probar conexión" nuevamente

### ❌ Error: "Redirect URI no coincide"

**Causa**: URL de callback no está registrada en MELI

**Solución**:
1. En https://developers.mercadolibre.com.mx
2. Ir a configuración de aplicación
3. En sección "OAuth" o "Redirect URI"
4. Verificar que está: `https://maya-autopartes.vercel.app/auth/meli-callback`
5. Si no está, agregar y guardar

### ❌ Error: "No se puede acceder a tus publicaciones"

**Causa**: Permisos insuficientes en la aplicación

**Solución**:
1. En MELI Developers, revisar permisos de aplicación
2. Debe tener:
   - `items:read` - Leer tus publicaciones
   - `items:write` - Crear/editar publicaciones
3. Si falta, agregar y guardar

### ❌ Error: "Token expirado"

**Causa**: Token de sesión expiró después de cierto tiempo

**Solución**:
1. Click en "Conectar con MercadoLibre" nuevamente
2. El nuevo token se guardará automáticamente

### ⚠️ Stock no sincroniza

**Causa**: Puede ser retraso en polling o conexión

**Solución**:
1. Click "🔄 Sincronizar ahora" para forzar sync
2. Esperar 30 segundos (intervalo de polling)
3. Verificar conexión a internet
4. Si persiste, revisar logs en navegador (F12 → Console)

---

## Verificar en Logs

1. Abrir Developer Tools: **F12** o **Ctrl+Shift+I**
2. Ir a pestaña **"Console"**
3. Buscar mensajes con "MELI" o "Sincronización"

Ejemplo de log correcto:
```
✅ Supabase inicializado
✅ Sesión MercadoLibre restaurada
🔄 Sincronizando inventario con MELI...
📋 15 productos en MELI
✅ Sincronización completada en 12.45s
```

---

## FAQ

### P: ¿Dónde se guardan las credenciales?
**R**: Se guardan en `localStorage` del navegador. Aunque se considera seguro para MVP, para producción se recomienda usar un backend para encriptarlas.

### P: ¿Qué pasó si pierdo acceso a mi app MELI?
**R**: 
1. Borrar credenciales de Maya Autopartes
2. Eliminar app en https://developers.mercadolibre.com.mx
3. Crear nueva app siguiendo pasos arriba

### P: ¿Puedo tener múltiples apps?
**R**: Sí. Puedes crear varias aplicaciones para diferentes propósitos. Cada una tiene su propio Client ID/Secret.

### P: ¿Cuáles son los límites de rate limit?
**R**: MercadoLibre permite **600 requests/minuto**. Maya Autopartes usa polling cada 30 minutos con ~10-20 requests, muy por debajo del límite.

### P: ¿Necesito pagar por usar la API?
**R**: No. MercadoLibre API es gratis para vendedores. No hay costos adicionales.

### P: ¿Qué pasa con productos que creo en MELI directamente?
**R**: Maya Autopartes solo sincroniza productos creados desde la app. Productos creados en MELI se pueden importar (feature futura).

### P: ¿Se sincroniza precio automáticamente?
**R**: Sí. Cuando cambias precio en app, se actualiza en MELI en siguiente sync (máximo 30 minutos).

### P: ¿Y si cambio stock en MELI directamente?
**R**: Maya Autopartes detectará el cambio y lo registrará en "Historial de cambios" para revisión.

---

## Próximos Pasos

✅ Completaste setup de MercadoLibre  
→ Ir a **MERCADOLIBRE_API_GUIDE.md** para detalles técnicos  
→ Ir a **INVENTORY_SYNC_FLOW.md** para flujo completo de sincronización

---

## Soporte

Si encuentras problemas:
1. Revisar sección "Solucionar Problemas" arriba
2. Revisar logs (F12 → Console)
3. Verificar README_PHASE_2_3.md

Email: coronelomar131@gmail.com
