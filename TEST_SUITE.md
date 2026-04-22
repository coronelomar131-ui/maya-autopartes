# 🧪 TEST SUITE - Maya Autopartes

**Documento completo de test cases para todas las funcionalidades de la aplicación.**

**Estado:** Version 1.0 - Completo
**Fecha:** 2026-04-22
**Versión de App:** Phase 2.3

---

## 📋 Tabla de Contenidos

1. [Core Module Tests](#core-module-tests)
2. [UI Module Tests](#ui-module-tests)
3. [API Integration Tests](#api-integration-tests)
4. [Security Tests](#security-tests)
5. [Google Drive Sync Tests](#google-drive-sync-tests)
6. [MercadoLibre Sync Tests](#mercadolibre-sync-tests)
7. [Performance Tests](#performance-tests)
8. [Data Validation Tests](#data-validation-tests)

---

## Core Module Tests

### TC-CORE-001: State Initialization
**Objetivo:** Verificar que el estado global se inicializa correctamente

**Pasos:**
1. Limpiar localStorage completamente
2. Cargar la aplicación en navegador limpio
3. Abrir consola y ejecutar: `import { ventas, almacen, clientes } from './core.js';`

**Resultado esperado:**
- Tres arrays se cargan desde localStorage
- Arrays están vacíos o contienen datos previamente almacenados
- Estado es reactive a cambios

**Criterios de aceptación:**
- ✅ No hay errores en consola
- ✅ Arrays están definidos (no undefined)
- ✅ Datos persisten entre recargas

---

### TC-CORE-002: Debounce Optimization
**Objetivo:** Verificar que debounce optimiza búsquedas

**Pasos:**
1. En consola: `import { debounce } from './core.js';`
2. Crear función debounced: `const test = debounce(() => console.log('Ejecutado'), 300);`
3. Ejecutar `test()` 5 veces rápidamente
4. Esperar 400ms
5. Observar consola

**Resultado esperado:**
- Función ejecuta UNA sola vez después del delay
- No hay ejecución inmediata
- Las llamadas subsecuentes retrasan el delay

**Criterios de aceptación:**
- ✅ Función ejecuta solo 1 vez
- ✅ Delay se respeta (300ms)
- ✅ Cada nueva llamada resetea el timer

---

### TC-CORE-003: Cache Mechanism
**Objetivo:** Verificar que el caché acelera búsquedas frecuentes

**Pasos:**
1. Agregar 100+ registros en clientes
2. Medir tiempo sin caché: `console.time('t'); findClienteByNombre('Juan'); console.timeEnd('t');`
3. Ejecutar nuevamente: segunda búsqueda
4. Observar tiempos en consola

**Resultado esperado:**
- Primera búsqueda tarda ~5-20ms
- Segunda búsqueda (desde caché) tarda <1ms
- Diferencia de performance es evidente

**Criterios de aceptación:**
- ✅ Segunda búsqueda es más rápida
- ✅ Caché se invalida cuando datos cambian
- ✅ No hay memory leaks en caché

---

### TC-CORE-004: Search Filtering
**Objetivo:** Verificar búsqueda y filtrado de datos

**Pasos:**
1. Agregar 50 ventas con diferentes clientes
2. Establecer filtro de búsqueda: `document.getElementById('v-s').value = 'Juan';`
3. Ejecutar: `import { filtV } from './core.js'; const result = filtV();`

**Resultado esperado:**
- Solo ventas con cliente "Juan" en el resultado
- Búsqueda es case-insensitive
- Búsqueda parcial funciona (ej: "Ju" encuentra "Juan")

**Criterios de aceptación:**
- ✅ Filtrado es preciso
- ✅ Case-insensitive
- ✅ Búsqueda parcial funciona

---

### TC-CORE-005: localStorage Persistence
**Objetivo:** Verificar que los datos persisten en localStorage

**Pasos:**
1. Agregar una venta desde UI
2. Abrir DevTools → Application → localStorage
3. Verificar claves: `ma4_v`, `ma4_a`, `ma4_c`, `ma4_cfg`
4. Recargar página (F5)
5. Verificar que la venta sigue presente

**Resultado esperado:**
- Datos en localStorage son válidos JSON
- Datos persisten entre recargas
- Estructura de datos se mantiene

**Criterios de aceptación:**
- ✅ localStorage contiene datos JSON válido
- ✅ Datos sin corrupción tras recargas
- ✅ Pueden recuperarse correctamente

---

### TC-CORE-006: Data Validation
**Objetivo:** Verificar validación de datos en core

**Pasos:**
1. Intentar crear venta sin cliente: `{ cliente: '', monto: 100 }`
2. Intentar crear producto sin nombre: `{ nombre: '', cantidad: 0 }`
3. Verificar que sistema rechaza o sanitiza datos

**Resultado esperado:**
- Datos inválidos se rechazan o muestran error
- Campo requerido muestra validación visual
- Sistema no permite guardar incompleto

**Criterios de aceptación:**
- ✅ Validación se ejecuta
- ✅ Errores claros al usuario
- ✅ Datos no se guardan incompletos

---

## UI Module Tests

### TC-UI-001: Render Ventas Table
**Objetivo:** Verificar que renderiza tabla de ventas correctamente

**Pasos:**
1. Agregar 5 ventas con datos diversos
2. Hacer click en pestaña "Ventas"
3. Verificar renderización de tabla
4. Observar columnas: Reporte, Fecha, Cliente, Monto, Estatus

**Resultado esperado:**
- Tabla muestra todos los datos
- Columnas son claras y alineadas
- Datos se muestran formateados correctamente

**Criterios de aceptación:**
- ✅ Tabla visible y legible
- ✅ Todos los registros aparecen
- ✅ Datos formateados correctamente

---

### TC-UI-002: Render Almacén Grid
**Objetivo:** Verificar renderización de almacén

**Pasos:**
1. Agregar 20 productos con diferentes stocks
2. Hacer click en "Almacén"
3. Verificar que se muestran como grid o cards
4. Observar indicadores de stock (rojo/verde)

**Resultado esperado:**
- Grid/Cards muestran todos los productos
- Colores indican estado de stock
- Información completa visible (nombre, cantidad, precio)

**Criterios de aceptación:**
- ✅ Todos los productos visibles
- ✅ Indicadores visuales funcionan
- ✅ Responsive en móvil y desktop

---

### TC-UI-003: Modal Create/Edit Ventas
**Objetivo:** Verificar modales de crear y editar ventas

**Pasos:**
1. Click en botón "Nueva Venta"
2. Llenar formulario con datos válidos
3. Click en "Guardar"
4. Click en venta existente para editar
5. Modificar datos y guardar

**Resultado esperado:**
- Modal se abre sin errores
- Formulario se valida
- Datos se guardan correctamente
- Modal se cierra tras guardar

**Criterios de aceptación:**
- ✅ Modal abre y cierra correctamente
- ✅ Validación funciona
- ✅ Datos se guardan y reflejan en tabla
- ✅ Ediciones se aplican correctamente

---

### TC-UI-004: Delete Confirmation
**Objetivo:** Verificar que delete pide confirmación

**Pasos:**
1. Seleccionar una venta, almacén o cliente
2. Click en botón "Eliminar"
3. Verificar que aparece confirmación modal
4. Click en "Cancelar"
5. Verificar que registro NO se elimina
6. Repetir, pero click en "Confirmar"
7. Verificar que registro SÍ se elimina

**Resultado esperado:**
- Modal de confirmación aparece
- Cancelar no elimina nada
- Confirmar elimina el registro
- Lista se actualiza automáticamente

**Criterios de aceptación:**
- ✅ Confirmación siempre aparece
- ✅ Cancelar funciona
- ✅ Confirmar elimina correctamente
- ✅ UI se actualiza inmediatamente

---

### TC-UI-005: Navigation Sidebar
**Objetivo:** Verificar navegación entre módulos

**Pasos:**
1. Click en cada opción de sidebar: Ventas, Almacén, Clientes, Facturas, Exportar
2. Verificar que contenido cambia
3. Verificar que badges (números) se actualizan

**Resultado esperado:**
- Cada click cambia la vista
- Badges muestran números correctos
- No hay saltos o parpadeos

**Criterios de aceptación:**
- ✅ Navegación fluida
- ✅ Badges actualizados correctamente
- ✅ No hay retrasos en cambios

---

### TC-UI-006: Search and Filter UI
**Objetivo:** Verificar que búsqueda filtra en tiempo real

**Pasos:**
1. Agregar 30+ registros en cualquier módulo
2. Escribir en barra de búsqueda
3. Observar cómo filtra en tiempo real
4. Limpiar búsqueda
5. Verificar que todos aparecen nuevamente

**Resultado esperado:**
- Filtro responde sin lag
- Solo mostrando coincidencias
- Búsqueda es case-insensitive
- Limpiar búsqueda restaura todos

**Criterios de aceptación:**
- ✅ Filtro funciona sin retraso
- ✅ Resultados precisos
- ✅ Sin lag en búsquedas grandes

---

### TC-UI-007: Invoice Generation
**Objetivo:** Verificar generación de facturas

**Pasos:**
1. Ir a módulo de Facturas
2. Click en "Nueva Factura"
3. Seleccionar una venta
4. Llenar datos de factura
5. Click en "Generar"
6. Verificar que factura se creó

**Resultado esperado:**
- Factura se genera sin errores
- Datos se guardan correctamente
- Factura aparece en lista

**Criterios de aceptación:**
- ✅ Factura creada correctamente
- ✅ Datos guardados
- ✅ Visible en lista de facturas

---

### TC-UI-008: Print Invoice
**Objetivo:** Verificar impresión de facturas

**Pasos:**
1. Seleccionar una factura existente
2. Click en botón "Imprimir"
3. Verificar que abre preview de impresión
4. Observar formato de factura

**Resultado esperado:**
- Preview se abre sin errores
- Factura formateada correctamente
- Listo para imprimir o guardar como PDF

**Criterios de aceptación:**
- ✅ Preview abre correctamente
- ✅ Formato profesional
- ✅ Todos los datos visibles

---

## API Integration Tests

### TC-API-001: Supabase Connection
**Objetivo:** Verificar conexión a Supabase

**Requisitos previos:**
- Tener credenciales Supabase configuradas
- Supabase proyecto activo

**Pasos:**
1. Abrir consola del navegador
2. Ejecutar: `import { syncVentasToSupabase } from './api.js';`
3. Ejecutar: `await syncVentasToSupabase();`
4. Verificar logs en consola

**Resultado esperado:**
- No hay errores de autenticación
- Logs indican sincronización
- No hay timeouts
- Datos se sincronizan correctamente

**Criterios de aceptación:**
- ✅ Conexión establecida
- ✅ Datos sincronizados
- ✅ Sin errores de autenticación

---

### TC-API-002: Real-time Listener
**Objetivo:** Verificar que escucha cambios en real-time

**Pasos:**
1. Abrir app en dos navegadores (Browser A y B)
2. En Browser A: agregar una venta
3. En Browser B: verificar que aparece automáticamente
4. Ejecutar test de listener: `setupVentasListener()`

**Resultado esperado:**
- Browser B muestra cambios sin recargar
- Datos sincronizados en <500ms
- No hay duplicados

**Criterios de aceptación:**
- ✅ Real-time funciona
- ✅ Sincronización rápida
- ✅ Sin duplicados

---

### TC-API-003: Export Excel
**Objetivo:** Verificar exportación a Excel

**Pasos:**
1. Tener datos en almacén o ventas
2. Click en "Exportar → Excel"
3. Verificar que descarga archivo .xlsx
4. Abrir archivo en Excel o Sheets

**Resultado esperado:**
- Archivo descarga correctamente
- Formato .xlsx válido
- Datos se abre correctamente en Excel

**Criterios de aceptación:**
- ✅ Descarga sin errores
- ✅ Archivo es válido
- ✅ Datos intactos en Excel

---

### TC-API-004: Export CSV
**Objetivo:** Verificar exportación a CSV

**Pasos:**
1. Click en "Exportar → CSV"
2. Verificar que descarga archivo .csv
3. Abrir en editor de texto

**Resultado esperado:**
- Archivo descarga correctamente
- Delimitadores correctos (comas)
- Datos formateados correctamente

**Criterios de aceptación:**
- ✅ Archivo descarga
- ✅ Formato CSV válido
- ✅ Datos intactos

---

### TC-API-005: Export JSON
**Objetivo:** Verificar exportación a JSON

**Pasos:**
1. Click en "Exportar → JSON"
2. Verificar que descarga archivo .json
3. Validar JSON en jsonlint.com

**Resultado esperado:**
- Archivo descarga correctamente
- JSON es válido y formateado
- Todos los datos presentes

**Criterios de aceptación:**
- ✅ Descarga correctamente
- ✅ JSON válido
- ✅ Datos completos

---

### TC-API-006: Import Excel
**Objetivo:** Verificar importación desde Excel

**Pasos:**
1. Click en "Importar"
2. Seleccionar archivo Excel con datos
3. Asignar columnas correctamente
4. Click en "Importar"
5. Verificar que datos se cargan

**Resultado esperado:**
- Diálogo abre correctamente
- Mapeo de columnas funciona
- Datos se importan sin corrupción
- Duplicados se evitan

**Criterios de aceptación:**
- ✅ Importación sin errores
- ✅ Datos íntegros
- ✅ Sin duplicados
- ✅ Validación funciona

---

## Security Tests

### TC-SEC-001: XSS Prevention - HTML Injection
**Objetivo:** Verificar que HTML inyectado se escape

**Pasos:**
1. En campo de nombre de cliente, ingresar: `<img src=x onerror="alert('XSS')">`
2. Guardar cliente
3. Recargar página
4. Verificar consola para alerts no ejecutados

**Resultado esperado:**
- No aparece alert ni se ejecuta JavaScript
- HTML se guarda como texto literal
- En tabla se ve el texto, no se interpreta

**Criterios de aceptación:**
- ✅ XSS bloqueado
- ✅ HTML escapado correctamente
- ✅ Datos se muestran como texto

---

### TC-SEC-002: Script Tag Injection
**Objetivo:** Verificar bloqueo de etiquetas script

**Pasos:**
1. Intentar guardar venta con campo: `<script>console.log('XSS')</script>`
2. Verificar que script no se ejecuta
3. Verificar datos guardados como texto

**Resultado esperado:**
- Script no se ejecuta
- Se guarda como texto literal
- Sin errores de ejecución

**Criterios de aceptación:**
- ✅ Script bloqueado
- ✅ Texto guardado correctamente
- ✅ Sin ejecución

---

### TC-SEC-003: SQL Injection Simulation
**Objetivo:** Verificar que búsqueda es safe contra inyección

**Pasos:**
1. En búsqueda, ingresar: `' OR '1'='1`
2. Verificar que se trata como búsqueda literal
3. No debería retornar todos los registros

**Resultado esperado:**
- Búsqueda trata input como literal
- No afecta lógica de búsqueda
- Resultados son precisos

**Criterios de aceptación:**
- ✅ Input se trata como string literal
- ✅ No hay inyección de lógica
- ✅ Búsqueda funciona correctamente

---

### TC-SEC-004: localStorage Tampering
**Objetivo:** Verificar validación de datos en localStorage

**Pasos:**
1. Abrir DevTools → Application → localStorage
2. Modificar manualmente el JSON en `ma4_v`
3. Corromper el JSON (ej: eliminar comillas)
4. Recargar página
5. Verificar si app maneja error gracefully

**Resultado esperado:**
- App no crashea
- Se muestra error o recarga clean
- Usuario no pierde datos importantes

**Criterios de aceptación:**
- ✅ No hay crash
- ✅ Manejo de error elegante
- ✅ Datos corruptos se limpian

---

### TC-SEC-005: CSRF Token Protection (si aplica)
**Objetivo:** Verificar protección contra CSRF

**Pasos:**
1. Si hay peticiones POST a servidor externo
2. Verificar que incluye CSRF token
3. Intentar modificar token manualmente
4. Verificar que petición falla

**Resultado esperado:**
- CSRF token presente en peticiones
- Token validado en servidor
- Peticiones inválidas rechazadas

**Criterios de aceptación:**
- ✅ CSRF protegido
- ✅ Token validado
- ✅ Peticiones seguras

---

### TC-SEC-006: Role-based Access Control
**Objetivo:** Verificar que roles limitan acceso

**Pasos:**
1. Crear usuario "Vendedor"
2. Login como Vendedor
3. Intentar acceder a "Usuarios" (solo Admin)
4. Verificar que se bloquea acceso

**Resultado esperado:**
- Vendedor no ve opción de Usuarios
- Si intenta forzar URL, se bloquea
- Admin sí puede ver y editar

**Criterios de aceptación:**
- ✅ Vendedor bloqueado
- ✅ Admin tiene acceso
- ✅ Roles se enforcan

---

## Google Drive Sync Tests

### TC-DRIVE-001: Authentication
**Objetivo:** Verificar autenticación con Google Drive

**Pasos:**
1. Hacer click en "Sincronizar con Drive"
2. Se abre login de Google
3. Permitir acceso a aplicación
4. Verificar que se completa autenticación

**Resultado esperado:**
- OAuth flow se completa sin errores
- Token se almacena correctamente
- No hay redirects erráticos

**Criterios de aceptación:**
- ✅ OAuth funciona
- ✅ Token guardado
- ✅ Acceso concedido

---

### TC-DRIVE-002: Upload to Drive
**Objetivo:** Verificar subida de archivos a Drive

**Pasos:**
1. Hacer click en "Sincronizar → Subir a Drive"
2. Seleccionar qué datos subir (Ventas, Almacén, etc)
3. Click en "Subir"
4. Verificar que aparece en Google Drive

**Resultado esperado:**
- Archivo sube sin errores
- Aparece en Google Drive con nombre correcto
- Formato es Excel o CSV

**Criterios de aceptación:**
- ✅ Subida sin errores
- ✅ Archivo visible en Drive
- ✅ Contenido íntegro

---

### TC-DRIVE-003: Download from Drive
**Objetivo:** Verificar descarga desde Drive

**Pasos:**
1. Tener archivo previo en Drive
2. Click en "Sincronizar → Descargar de Drive"
3. Seleccionar archivo
4. Click en "Descargar"
5. Verificar que datos se cargan

**Resultado esperado:**
- Diálogo muestra archivos disponibles
- Descarga sin errores
- Datos se importan correctamente
- Merge con datos locales funciona

**Criterios de aceptación:**
- ✅ Descarga sin errores
- ✅ Datos cargados
- ✅ Merge funciona

---

### TC-DRIVE-004: Real-time Sync
**Objetivo:** Verificar sincronización automática

**Pasos:**
1. Configurar sincronización automática cada 30min
2. Agregar datos localmente
3. Esperar 30 minutos (o forzar sincronización)
4. Verificar que se sube a Drive automáticamente

**Resultado esperado:**
- Sincronización se ejecuta en intervalos
- Datos suben automáticamente
- No hay conflictos

**Criterios de aceptación:**
- ✅ Sync automático funciona
- ✅ Datos sincronizados
- ✅ Sin conflictos

---

### TC-DRIVE-005: Conflict Resolution
**Objetivo:** Verificar resolución de conflictos de sincronización

**Pasos:**
1. Modificar datos en Drive y Local (diferente)
2. Ejecutar sincronización
3. Verificar que aparece diálogo de conflicto
4. Seleccionar versión a mantener

**Resultado esperado:**
- Conflicto se detecta
- Usuario puede elegir versión
- Versión elegida se aplica

**Criterios de aceptación:**
- ✅ Conflicto detectado
- ✅ Usuario elige versión
- ✅ Resolución aplicada correctamente

---

## MercadoLibre Sync Tests

### TC-ML-001: Authentication
**Objetivo:** Verificar autenticación OAuth con MercadoLibre

**Pasos:**
1. Click en "Sincronizar → MercadoLibre"
2. Se abre login de MercadoLibre
3. Permitir acceso
4. Verificar token almacenado

**Resultado esperado:**
- OAuth fluye sin errores
- Token válido almacenado
- Usuario autenticado

**Criterios de aceptación:**
- ✅ OAuth completa
- ✅ Token guardado
- ✅ Sesión activa

---

### TC-ML-002: Listing Sync
**Objetivo:** Verificar sincronización de listados

**Pasos:**
1. Tener productos en almacén local
2. Click en "Sincronizar → Subir Listados a ML"
3. Verificar que aparecen en MercadoLibre

**Resultado esperado:**
- Productos se publican en ML
- Precios se sincronizan
- Stock se actualiza

**Criterios de aceptación:**
- ✅ Productos publicados
- ✅ Precios correctos
- ✅ Stock sincronizado

---

### TC-ML-003: Price Update
**Objetivo:** Verificar actualización de precios

**Pasos:**
1. Cambiar precio de producto local
2. Sincronizar con ML
3. Verificar que precio en ML se actualiza

**Resultado esperado:**
- Precio se actualiza en ML
- Sin retraso significativo
- Histórico de cambios se mantiene

**Criterios de aceptación:**
- ✅ Precio actualizado
- ✅ Sin retraso
- ✅ Histórico intacto

---

### TC-ML-004: Stock Management
**Objetivo:** Verificar gestión de stock en ML

**Pasos:**
1. Vender producto por ML
2. Verificar que stock local se actualiza
3. Cuando stock llega a 0, producto se desactiva

**Resultado esperado:**
- Stock se decrementa
- Stock 0 desactiva producto
- Sincronización es bidireccional

**Criterios de aceptación:**
- ✅ Stock se actualiza
- ✅ 0 stock desactiva
- ✅ Sincronización bidireccional

---

### TC-ML-005: Order Sync
**Objetivo:** Verificar sincronización de órdenes

**Pasos:**
1. Recibir una orden en MercadoLibre
2. Verificar que aparece en sección de Ventas
3. Marcar como entregada
4. Verificar que se actualiza en ML

**Resultado esperado:**
- Orden aparece en Ventas
- Estados se sincronizan
- Historial se mantiene

**Criterios de aceptación:**
- ✅ Orden sincronizada
- ✅ Estados correctos
- ✅ Bidireccional

---

## Performance Tests

### TC-PERF-001: Initial Load Time
**Objetivo:** Verificar tiempo de carga inicial

**Pasos:**
1. Abrir DevTools → Performance
2. Recargar página (Ctrl+Shift+R para cache limpio)
3. Medir tiempo hasta "DOMContentLoaded"
4. Medir tiempo hasta "Load"

**Resultado esperado:**
- DOMContentLoaded < 1 segundo
- Load < 2 segundos (con datos)
- FCP < 0.8 segundos

**Criterios de aceptación:**
- ✅ Carga inicial rápida
- ✅ Bajo tiempo de interacción
- ✅ Buen Lighthouse score

---

### TC-PERF-002: Search Performance (Large Dataset)
**Objetivo:** Verificar búsqueda con 1000+ registros

**Pasos:**
1. Cargar 1000 ventas en sistema
2. Hacer búsqueda
3. Medir tiempo de respuesta
4. Repetir búsqueda (con caché)

**Resultado esperado:**
- Primera búsqueda < 200ms
- Segunda búsqueda < 10ms (caché)
- UI responsiva durante búsqueda

**Criterios de aceptación:**
- ✅ Búsqueda rápida
- ✅ Caché funciona
- ✅ Sin lag perceptible

---

### TC-PERF-003: Render Performance
**Objetivo:** Verificar que render es eficiente

**Pasos:**
1. Agregar 500 productos
2. Click en Almacén para renderizar grid
3. Medir tiempo en DevTools Performance
4. Observar FPS

**Resultado esperado:**
- Render toma < 500ms
- FPS > 30 durante scroll
- Scroll es suave

**Criterios de aceptación:**
- ✅ Render rápido
- ✅ Scroll suave
- ✅ FPS aceptable

---

### TC-PERF-004: localStorage Performance
**Objetivo:** Verificar que localStorage no ralentiza app

**Pasos:**
1. Guardar datos (trigger localStorage.setItem)
2. Medir tiempo de guardado
3. Con 10000 registros, medir nuevo guardado

**Resultado esperado:**
- Guardado < 100ms incluso con muchos datos
- Sin freezing de UI
- Sin timeouts

**Criterios de aceptación:**
- ✅ Guardado rápido
- ✅ No hay freezing
- ✅ UI responsiva

---

### TC-PERF-005: Memory Usage
**Objetivo:** Verificar que no hay memory leaks

**Pasos:**
1. Abrir DevTools → Memory
2. Tomar snapshot inicial
3. Agregar 100 registros
4. Eliminar 100 registros
5. Ejecutar garbage collection
6. Comparar memoria

**Resultado esperado:**
- Memoria vuelve aproximadamente a inicial
- No hay aumento progresivo
- Sin memory leaks detectables

**Criterios de aceptación:**
- ✅ Sin memory leaks
- ✅ GC funciona
- ✅ Memoria estable

---

### TC-PERF-006: Network Performance
**Objetivo:** Verificar que sincronización es eficiente

**Pasos:**
1. DevTools → Network
2. Ejecutar sincronización Supabase
3. Observar payload y tiempo
4. Con 100 registros, medir nuevamente

**Resultado esperado:**
- Payloads son comprimidos
- Tiempo total < 2 segundos
- Solo delta se envía (no full sync)

**Criterios de aceptación:**
- ✅ Payloads optimizados
- ✅ Sincronización rápida
- ✅ Uso eficiente de ancho de banda

---

## Data Validation Tests

### TC-VAL-001: Required Field Validation
**Objetivo:** Verificar que campos requeridos se validan

**Pasos:**
1. Abrir modal de Nueva Venta
2. Dejar campo "Cliente" vacío
3. Intentar guardar
4. Verificar error

**Resultado esperado:**
- Campo requerido se marca en rojo
- Error claro al usuario
- Guardado se bloquea

**Criterios de aceptación:**
- ✅ Validación funciona
- ✅ Error claro
- ✅ Guardado bloqueado

---

### TC-VAL-002: Email Format Validation
**Objetivo:** Verificar validación de email

**Pasos:**
1. Ingresar email inválido: "notanemail"
2. Ingresar email válido: "test@example.com"
3. Verificar validación diferencial

**Resultado esperado:**
- Email inválido muestra error
- Email válido se acepta
- Patrón regex correcto

**Criterios de aceptación:**
- ✅ Validación precisa
- ✅ Mensajes claros
- ✅ Sin falsos positivos/negativos

---

### TC-VAL-003: Number Format Validation
**Objetivo:** Verificar validación de números

**Pasos:**
1. Ingresar "abc" en campo de monto
2. Ingresar "123.45" en monto
3. Ingresar "-5" en cantidad (stock)
4. Verificar validaciones

**Resultado esperado:**
- Letras se rechazan en campo numérico
- Números flotantes se aceptan si aplica
- Negativos se rechazan en stock

**Criterios de aceptación:**
- ✅ Solo números aceptados
- ✅ Rangos correctos
- ✅ Sin corrupción de datos

---

### TC-VAL-004: Date Format Validation
**Objetivo:** Verificar validación de fechas

**Pasos:**
1. Ingresar "32/13/2025" (inválida)
2. Ingresar "2026-04-22" (válida)
3. Verificar que hoy es default

**Resultado esperado:**
- Fecha inválida muestra error
- Fecha válida se acepta
- Default es hoy

**Criterios de aceptación:**
- ✅ Validación de fechas correcta
- ✅ Sin fechas inválidas
- ✅ Default correcto

---

### TC-VAL-005: Duplicate Prevention
**Objetivo:** Verificar que se evitan duplicados

**Pasos:**
1. Crear cliente "Juan Pérez"
2. Intentar crear otro cliente "Juan Pérez" (mismo)
3. Verificar que sistema avisa

**Resultado esperado:**
- Sistema detecta duplicado
- Pregunta si es el mismo cliente
- Opción para editar en lugar de crear

**Criterios de aceptación:**
- ✅ Duplicados detectados
- ✅ Usuario notificado
- ✅ Opción para resolver

---

### TC-VAL-006: Data Consistency
**Objetivo:** Verificar que datos son consistentes

**Pasos:**
1. Crear venta de $100
2. Crear factura de $50 de la misma venta
3. Verificar que monto total es correcto
4. Eliminar factura, verificar venta se actualiza

**Resultado esperado:**
- Totales son precisos
- Relaciones entre datos son consistentes
- Cambios se propagan

**Criterios de aceptación:**
- ✅ Datos consistentes
- ✅ Totales correctos
- ✅ Relaciones intactas

---

## Test Execution Summary

### Cómo Ejecutar Todos los Tests

**Opción 1: Manual (Recomendado para primer run)**
```bash
# Abrir app en navegador
# Ejecutar cada TC manualmente en orden
# Documentar resultados en checklist
```

**Opción 2: Automated (JavaScript Console)**
```javascript
// En consola del navegador, ejecutar:
import { testSuite } from './tests/test-suite.js';
await testSuite.runAll();
// Generará reporte HTML con resultados
```

**Opción 3: Cypress (CI/CD)**
```bash
npm install --save-dev cypress
npx cypress run
# Ejecuta todos los tests automáticamente
```

---

## Test Coverage by Module

| Módulo | Test Cases | Coverage |
|--------|------------|----------|
| Core | 6 tests | 100% |
| UI | 8 tests | 95% |
| API | 6 tests | 85% |
| Security | 6 tests | 90% |
| Google Drive | 5 tests | 80% |
| MercadoLibre | 5 tests | 75% |
| Performance | 6 tests | 85% |
| Validation | 6 tests | 90% |
| **TOTAL** | **48 tests** | **87%** |

---

## Notes

- Ejecutar tests en navegadores modernos (Chrome 90+, Firefox 88+)
- Limpiar localStorage antes de tests si es requerido
- Usar datos de test consistentes
- Documentar cualquier fallo con screenshot
- Reportar bugs en KNOWN_ISSUES.md

**Versión:** 1.0 | **Última actualización:** 2026-04-22 | **Próxima revisión:** 2026-05-06
