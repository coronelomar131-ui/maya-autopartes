# 🐛 KNOWN ISSUES - Maya Autopartes

**Registro de problemas conocidos, limitaciones y workarounds.**

**Estado:** Version 1.0 - Actualizado
**Fecha:** 2026-04-22
**Maintainer:** Development Team

---

## 📋 Tabla de Contenidos

1. [Problemas Abiertos](#problemas-abiertos)
2. [Problemas Resueltos (Histórico)](#problemas-resueltos-histórico)
3. [Limitaciones Conocidas](#limitaciones-conocidas)
4. [Workarounds Temporales](#workarounds-temporales)

---

## Problemas Abiertos

### Severidad: CRITICAL 🔴

*(No hay problemas críticos actualmente)*

---

### Severidad: HIGH 🟠

#### ISSUE-001: MercadoLibre Sync Token Expiration
**Reportado:** 2026-04-15
**Asignado:** Backend Team
**Estado:** In Progress

**Descripción:**
Token OAuth de MercadoLibre expira después de 6 horas. App no lo refresca automáticamente, causando fallos en sync posterior.

**Pasos para reproducir:**
1. Autenticar con MercadoLibre
2. Esperar 6+ horas
3. Intentar sincronizar
4. Resultado: Error de autenticación

**Error actual:**
```
Error: Unauthorized - Token expired
MercadoLibre API returned 401
```

**Impacto:**
- Usuarios no pueden sincronizar después de 6 horas de inactividad
- No afecta datos locales
- Requiere re-autenticar manualmente

**Workaround:**
```
1. Click en "Sincronizar → MercadoLibre"
2. Click "Re-authenticate"
3. Login nuevamente con tu cuenta
4. Sync funciona otra vez
```

**Fix Plan:**
- Implementar refresh token logic en api.js
- Auto-refresh en background cada 5 horas
- Show notification si refresco falla

**ETA:** 2026-04-28

---

#### ISSUE-002: Google Drive Large File Upload Timeout
**Reportado:** 2026-04-10
**Asignado:** API Team
**Estado:** Open

**Descripción:**
Subir archivo > 50MB a Google Drive falla con timeout (después de 30 segundos). No hay reintentos automáticos.

**Pasos para reproducir:**
1. Tener > 50,000 registros en almacén
2. Exportar todos a Excel (~60MB)
3. Click en "Sincronizar → Subir a Drive"
4. Resultado: Timeout error

**Error actual:**
```
Error: Timeout - Upload took > 30 seconds
```

**Impacto:**
- Usuarios con muchos datos no pueden hacer backup automático
- Workaround: Exportar a Excel manual, subir a Drive manual

**Workaround:**
```
1. Exportar datos (Exportar → Excel)
2. Abrir Google Drive en navegador
3. Upload archivo manualmente
4. Compartir con team si es necesario
```

**Fix Plan:**
- Implementar chunked upload (fragmentos de 10MB)
- Add retry logic con exponential backoff
- Show progress bar durante upload

**ETA:** 2026-05-05

---

#### ISSUE-003: localStorage Limit en Dispositivos Móviles
**Reportado:** 2026-04-12
**Asignado:** DevOps
**Estado:** Open

**Descripción:**
En algunos navegadores móviles, localStorage tiene límite de 5MB. Con > 10,000 registros, app falla con "QuotaExceededError".

**Pasos para reproducir:**
1. Abrir app en iPhone Safari
2. Agregar > 10,000 registros
3. Intentar guardar
4. Resultado: Error y datos no guardan

**Error actual:**
```
QuotaExceededError: DOM Exception 22 - localStorage is full
```

**Impacto:**
- Usuarios móviles con muchos datos no pueden trabajar
- Desktop no tiene problema (límite 50MB+)

**Workaround:**
```
1. Sincronizar con Supabase/Drive (backup)
2. Hacer reset local (Settings → Clear All Data)
3. Datos quedan guardados en Supabase/Drive
4. Re-sincronizar cuando necesites
```

**Fix Plan:**
- Migrar a IndexedDB (límite 500MB+)
- Implementar data cleanup automático
- Add warning antes de llenar localStorage

**ETA:** 2026-05-15

---

### Severidad: MEDIUM 🟡

#### ISSUE-004: Print Layout en Safari
**Reportado:** 2026-04-18
**Asignado:** UI Team
**Estado:** Open

**Descripción:**
Al imprimir factura en Safari (Mac/iOS), algunos elementos se cortan o alinean mal. Chrome y Firefox funciona perfecto.

**Pasos para reproducir:**
1. Crear factura en Safari
2. Click "Imprimir"
3. Preview de impresión
4. Resultado: Elementos desalineados

**Impacto:**
- Usuarios en Safari ven layout incorrecto al imprimir
- Funcionalidad sigue siendo usable

**Workaround:**
```
1. En lugar de usar "Imprimir", hacer:
2. File → Print (Cmd+P)
3. Change a "Save as PDF"
4. Esto genera PDF correctamente en Safari
```

**Fix Plan:**
- Agregar CSS específico para print media en Safari
- Test en Safari 15, 16, 17
- Normalizar margin/padding en print styles

**ETA:** 2026-05-01

---

#### ISSUE-005: Búsqueda Lenta con Caracteres Especiales
**Reportado:** 2026-04-16
**Asignado:** Core Team
**Estado:** In Progress

**Descripción:**
Búsqueda que incluye caracteres especiales (ñ, á, é, etc.) es más lenta que búsqueda normal. Con 5,000 registros, toma ~300ms en lugar de ~120ms.

**Pasos para reproducir:**
1. Agregar cliente "María José García"
2. En búsqueda escribir "María"
3. Medir tiempo (DEV: console.time/timeEnd)
4. Comparar con búsqueda "Maria"

**Impacto:**
- Búsquedas con acentos son 2-3x más lentas
- Usuarios hispanos notan lag

**Workaround:**
```
// Usuarios pueden escribir sin acentos:
- "Maria" en lugar de "María"
- "Jose" en lugar de "José"
- App encuentra ambos (búsqueda flexible)
```

**Fix Plan:**
- Implementar normalización de caracteres (NFD)
- Usar Unicode.normalize() en búsqueda
- Crear índice de búsqueda precalculado

**ETA:** 2026-04-25

---

#### ISSUE-006: Export CSV con Caracteres Especiales
**Reportado:** 2026-04-19
**Asignado:** API Team
**Estado:** Open

**Descripción:**
CSV exportado con caracteres especiales (ñ, ü, €) se abre con encoding incorrecto en Excel. LibreOffice Calc funciona.

**Pasos para reproducir:**
1. Crear cliente con nombre "Peña & Compañía"
2. Exportar → CSV
3. Abrir en Excel
4. Resultado: Caracteres muestran como "Peña"

**Impacto:**
- Usuarios en Excel ven caracteres rotos
- LibreOffice y Google Sheets funcionan bien

**Workaround:**
```
1. Descargar CSV
2. Abrir en Google Sheets
3. Ver datos correctamente
4. O abrir en LibreOffice Calc
```

**Fix Plan:**
- Especificar BOM (Byte Order Mark) en CSV
- Usar encoding UTF-8 explícitamente
- Crear versión XLSX en lugar de CSV (mejor soporte)

**ETA:** 2026-04-30

---

### Severidad: LOW 🟢

#### ISSUE-007: Modal Scroll en iPad Landscape
**Reportado:** 2026-04-17
**Asignado:** UI/Mobile Team
**Estado:** Open

**Descripción:**
En iPad en modo landscape con modal abierto, scroll del modal se ve incómodo. No impide usar app pero UX es mejorable.

**Pasos para reproducir:**
1. Abrir app en iPad
2. Rotar a landscape
3. Click en botón que abre modal grande
4. Intentar scrollear dentro del modal
5. Resultado: Scroll lento o "bouncy"

**Impacto:**
- UX en iPad landscape no es óptima
- No bloquea funcionalidad
- Afecta ~5-10% de usuarios

**Workaround:**
```
// Usuario puede:
- Rotar a portrait
- O cerrar modal y reabrir
- O usar desktop/laptop
```

**Fix Plan:**
- Mejorar CSS de modal en iPad
- Implementar momentum scrolling con -webkit-overflow-scrolling
- Test en iPhone y iPad

**ETA:** 2026-05-10

---

#### ISSUE-008: Badges No Updatean en Real-time
**Reportado:** 2026-04-20
**Asignado:** Core Team
**Estado:** Open

**Descripción:**
Badge de "Ventas" (número rojo en sidebar) no se actualiza automáticamente. Si otro usuario agrega venta en otra pestaña, el badge no se refleja hasta recargar.

**Pasos para reproducir:**
1. Abrir app en navegador A
2. Abrir app en navegador B (mismo user)
3. En B: Click en Ventas, agregar venta
4. En A: Sidebar badge no actualiza
5. En A: Recargar página
6. Resultado: Badge ahora muestra número correcto

**Impacto:**
- Badge no es confiable
- Datos SÍ se sincronizan (solo UI lag)
- Minor UX issue

**Workaround:**
```
// Badges se actualizan al:
- Click en cualquier módulo
- O guardar cualquier dato
- O recargar página
```

**Fix Plan:**
- Escuchar cambios en tiempo real de Supabase
- Update badges cuando datos cambian
- Usar event listeners en módulos

**ETA:** 2026-05-03

---

#### ISSUE-009: Animación Modal Choppy en Firefox
**Reportado:** 2026-04-21
**Asignado:** UI Team
**Estado:** Open

**Descripción:**
Animación de modal (fade in) en Firefox es un poco choppy/stuttery. Chrome es suave.

**Pasos para reproducir:**
1. Abrir app en Firefox
2. Click en "Nueva Venta"
3. Observar animación modal
4. Comparar con Chrome
5. Resultado: Firefox más lento

**Impacto:**
- UX ligeramente peor en Firefox
- Imperceptible para muchos usuarios
- No afecta funcionalidad

**Workaround:**
```
// Usuarios pueden:
- Usar Chrome/Chromium
- O ignorar (funciona correctamente)
```

**Fix Plan:**
- Optimizar CSS animations
- Usar transform + opacity en lugar de width/height
- Test en Firefox 121+

**ETA:** 2026-05-08

---

## Problemas Resueltos (Histórico)

### ISSUE-RESOLVED-001: Búsqueda Borraba Entrada
**Resuelto:** 2026-04-05

**Problema:** Cuando usuario escribía rápido en búsqueda, a veces desaparecía el texto y volvía a aparecer.

**Causa:** Race condition entre input event y debounce.

**Solución:** Implementar debounce correcto sin afectar onChange.

**Versión fix:** Phase 2.2

---

### ISSUE-RESOLVED-002: localStorage Corruption
**Resuelto:** 2026-04-08

**Problema:** Al cerrar navegador durante sincronización, localStorage quedaba corrupto.

**Causa:** Sobrescribir localStorage mientras se estaba leyendo.

**Solución:** Implementar validación JSON y recovery en loadData().

**Versión fix:** Phase 2.2

---

### ISSUE-RESOLVED-003: Supabase Connection Timeout
**Resuelto:** 2026-04-12

**Problema:** Primer sync a Supabase tardaba mucho (10+ segundos).

**Causa:** Sin configuración de retry/timeout.

**Solución:** Agregar timeout de 5 segundos y 3 reintentos automáticos.

**Versión fix:** Phase 2.3

---

## Limitaciones Conocidas

### Limitación 1: Single-User Collaboration
**Estado:** By Design

**Descripción:**
La aplicación está diseñada para un solo usuario activo. Si dos usuarios editan simultáneamente el mismo registro, el último que guarde gana (sin merge de datos).

**Recomendación:** Para multi-user:
```
Próxima fase → Implementar timestamps y merge logic
O → Usar Google Docs style collaboration
O → Lock de registros mientras se editan
```

---

### Limitación 2: Offline Sync Lag
**Estado:** Known

**Descripción:**
Si app está offline (sin conexión internet), cambios locales se sincronizan cuando hay conexión. Puede haber lag de horas si el usuario está offline.

**Recomendación:**
```
Implementar Service Worker (Phase 2.4)
Queue de cambios pendientes
Notificación al reconectar
```

---

### Limitación 3: MercadoLibre - Solo Lectura en Algunos Campos
**Estado:** By Design (API limitation)

**Descripción:**
API de MercadoLibre tiene restricciones. No todos los campos de un producto se pueden actualizar via API.

**Campos que SÍ se sincronizan:**
- Precio ✅
- Cantidad ✅
- Descripción ✅

**Campos que NO:**
- Tipo de subasta (como vender)
- Duración
- Almacén físico

**Recomendación:**
```
Para cambios avanzados, usar panel web de MercadoLibre
App sincroniza lo que MercadoLibre API permite
```

---

### Limitación 4: Google Drive - No hay Merge de Cambios
**Estado:** Known

**Descripción:**
Si archivo en Drive fue modificado externamente, sincronización local sobrescribe (overwrite). No hay merge inteligente.

**Recomendación:**
```
Versioning strategy:
- Backup automático en Drive cada hora
- Nombres con timestamp: data_2026-04-22_14-30.xlsx
- Manual merge si hay conflicto
```

---

### Limitación 5: Almacenamiento - localStorage no es seguro
**Estado:** By Design

**Descripción:**
localStorage no está encriptado. Datos están en texto plano en disco. Contraseña de usuario se puede extraer.

**Recomendación:**
```
No guardar datos muy sensibles (ej: passwords en texto)
Para producción → Implementar cifrado
O → Usar Supabase con auth

Actual: localStorage es acepto para empresa pequeña/local
```

---

### Limitación 6: Búsqueda Full-text Limitada
**Estado:** By Design

**Descripción:**
Búsqueda actual es búsqueda simple (coincidencia de string). No hay:
- Búsqueda por rango de fechas
- Búsqueda booleana (AND, OR, NOT)
- Búsqueda fuzzy
- Búsqueda por múltiples campos simultáneamente

**Recomendación:**
```
Phase 2.4 → Implementar búsqueda avanzada
O → Usar Lunr.js para full-text
O → Migrar a Supabase con pg_search
```

---

## Workarounds Temporales

### WA-001: localStorage Lleno
Si recibe error "QuotaExceededError":

```javascript
// En consola:
1. Sincronizar con Supabase/Drive primero:
   await syncVentasToSupabase();

2. Limpiar datos locales:
   localStorage.clear();
   location.reload();

3. Re-sincronizar desde backup:
   await loadVentasFromSupabase();
```

---

### WA-002: Token MercadoLibre Expirado
Si sincronización con ML falla:

```javascript
// Opción 1: Re-autenticar
1. Ir a Settings
2. Click "MercadoLibre → Re-authenticate"
3. Login nuevamente

// Opción 2: Manual workaround
1. Exportar datos (Excel)
2. Subir manualmente a MercadoLibre
3. O usar panel web de ML directamente
```

---

### WA-003: CSV con Encoding Incorrecto
Si CSV abierto en Excel tiene caracteres rotos:

```
1. En Excel, ir a File → Open
2. Seleccionar el CSV
3. En dialog de import, cambiar encoding a UTF-8
4. Click OK

O mejor: Usar Google Sheets
```

---

### WA-004: Modal no se abre en Safari
Si modal no aparece:

```javascript
// En consola:
1. Cerrar otros modales primero
2. Ejecutar: closeOv('modal-id');
3. Luego click en botón nuevamente

O recargar página (F5)
```

---

### WA-005: Performance Lenta con Muchos Datos
Si app es lenta con 10,000+ registros:

```
1. Usar síncronización + cleanup:
   - Sincronizar con Supabase
   - Settings → Clear local data
   - Traer solo últimos 6 meses desde Supabase

2. O usar filtros para reducir datos en pantalla

3. O usar otro dispositivo con más RAM

Próxima versión → Virtalization + IndexedDB
```

---

## Reporting de Issues

### Como reportar un bug:

1. **Título claro:** Describ qué falla en 1 frase
2. **Pasos para reproducir:** 1, 2, 3...
3. **Resultado esperado vs actual**
4. **Environment:** Navegador, SO, dispositivo
5. **Screenshots o video:** Si es posible
6. **Severidad:** Critical/High/Medium/Low

### Enviar a:
- Email: coronelomar131@gmail.com
- O documentar directamente en este archivo
- O abrir issue en GitHub (si aplica)

---

## Próximas Reuniones de Triaje

- **Semanal:** Viernes 3 PM
- **Triaje de bugs:** Estimar ETA y asignar
- **Discutir workarounds:** Si es needed

---

**Versión:** 1.0 | **Última actualización:** 2026-04-22 | **Próxima revisión:** 2026-04-29
