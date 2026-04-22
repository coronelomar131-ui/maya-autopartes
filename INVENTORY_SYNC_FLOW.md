# Inventory Sync Flow - Flujo Completo de Sincronización

**Documentación del flujo de sincronización bidireccional entre Maya Autopartes y MercadoLibre**

## 📋 Tabla de Contenidos

1. [Overview del Flujo](#overview-del-flujo)
2. [Estados de Sincronización](#estados-de-sincronización)
3. [Flujos de Trabajo](#flujos-de-trabajo)
4. [Manejo de Conflictos](#manejo-de-conflictos)
5. [Recuperación de Errores](#recuperación-de-errores)
6. [Monitoring y Alertas](#monitoring-y-alertas)
7. [Diagrama Temporal](#diagrama-temporal)

---

## Overview del Flujo

### Componentes

```
┌──────────────────┐
│  Maya Autopartes │  App local + localStorage
│    (Frontend)    │  
└────────┬─────────┘
         │
         │ mercadolibre-sync.js
         │ meli-mapper.js
         │
         ▼
┌──────────────────────┐
│  MercadoLibre API    │  OAuth 2.0
│ (https://api.meli)   │  Polling cada 30 min
└──────────────────────┘
         │
         │
         ▼
┌──────────────────────┐
│   Historial de Sync  │  localStorage
│   + Cache de datos   │  Supabase (opcional)
└──────────────────────┘
```

### Ciclo Automático

```
INICIO
  ↓
[30 min]
  ↓
USER AUTORIZA MELI
  ↓
INICIAR POLLING
  ↓
┌─────────────────────────────┐
│ CADA 30 MINUTOS:            │
│ 1. Obtener listings de MELI │
│ 2. Comparar con local       │
│ 3. Detectar cambios         │
│ 4. Sincronizar diferencias  │
│ 5. Registrar historial      │
└─────────────────────────────┘
  ↓
REPETIR
```

---

## Estados de Sincronización

### Estados Globales

```
┌─────────────────────────────────────┐
│           OFFLINE                   │
│  • No hay token MELI                │
│  • Usuario no conectado             │
│  • Botón: "Conectar con MELI"      │
└────────────┬────────────────────────┘
             │
             │ Usuario hace click
             ▼
┌─────────────────────────────────────┐
│        AUTHENTICATING               │
│  • Redirigir a MELI OAuth           │
│  • Esperando autorización           │
│  • Spinner: "Conectando..."         │
└────────────┬────────────────────────┘
             │
             │ Token obtenido
             ▼
┌─────────────────────────────────────┐
│         IDLE (Conectado)            │
│  • Token válido                     │
│  • Esperando siguiente sync          │
│  • Contador: "Próx sync: 28 min"    │
└────────────┬────────────────────────┘
             │
             │ 30 min o click "Sincronizar"
             ▼
┌─────────────────────────────────────┐
│        SYNCING (En Progreso)        │
│  • Descargando datos de MELI        │
│  • Comparando cambios               │
│  • Actualizando...                  │
│  • Progreso: 25/63 productos        │
└────────────┬────────────────────────┘
             │
             ▼
    ┌────────────────┐
    │ ¿Éxito?        │
    └────────────────┘
         │        │
    YES ▼        ▼ NO
        │        │
        │        └─────────────────────┐
        │                              │
        ▼                              ▼
┌──────────────────┐      ┌──────────────────────┐
│ SUCCESS          │      │ ERROR                │
│ • ✅ Completado  │      │ • ❌ Error ocurrido  │
│ • Datos sync'ed  │      │ • Retry: próx sync   │
│ • Log guardado   │      │ • Alert a usuario    │
└─────────┬────────┘      └──────────┬───────────┘
          │                          │
          └──────────────┬───────────┘
                         │
                         ▼
                    ┌─────────────┐
                    │ IDLE AGAIN  │
                    │ Esperando   │
                    └─────────────┘
```

### Estados de Producto Individual

```
┌───────────────────────────────┐
│ PRODUCTO LOCAL (App)          │
├───────────────────────────────┤
│ SYNC_PENDING                  │
│ • Creado/modificado localmente│
│ • Aún no sincronizado con MELI│
├───────────────────────────────┤
│ SYNC_IN_PROGRESS              │
│ • Enviando a MELI             │
│ • Esperando respuesta          │
├───────────────────────────────┤
│ SYNC_SUCCESS                  │
│ • Creado/actualizado en MELI  │
│ • meliId populado             │
│ • Stock sincronizado          │
├───────────────────────────────┤
│ SYNC_ERROR                    │
│ • Error en última sync         │
│ • Retry automático próximo    │
│ • Alert visual en UI          │
├───────────────────────────────┤
│ SYNC_CONFLICT                 │
│ • Stock/precio diferentes     │
│ • Requiere decisión manual    │
│ • Mostrar modal de resolución │
└───────────────────────────────┘
```

---

## Flujos de Trabajo

### 1. Usuario Nuevo Conecta con MELI

```
Usuario en Home > Click "⚙️ Configuración"
                        │
                        ▼
             Click "Integraciones"
                        │
                        ▼
        Ver sección "MercadoLibre"
                        │
                        ▼
   [Client ID] [_____] [Pegar ID]
   [Client Secret] [_____] [Pegar Secret]
                        │
                        ▼
         Click "🔗 Conectar con MELI"
                        │
                        ▼
     Se abre login.mercadolibre.com
                        │
                        ▼
    Usuario autoriza acceso (da permisos)
                        │
                        ▼
   Redirigir a /auth/meli-callback?code=ABC
                        │
                        ▼
   intercambiar code por access_token
                        │
                        ▼
   GET /users/me para obtener user_id
                        │
                        ▼
   Guardar en localStorage:
   - ma4_meli_token: {access_token, refresh, expires}
   - ma4_meli_user_id: 123456789
                        │
                        ▼
   Estado → IDLE (Conectado)
                        │
                        ▼
   Iniciar polling cada 30 minutos
                        │
                        ▼
   Ejecutar SYNC AUTOMÁTICO ahora
                        │
                        ▼
   Mostrar modal: "Sincronizando..."
   Proceso:
   1. GET /users/me → Validar usuario
   2. GET /users/{id}/listings → Listar productos
   3. Para cada producto:
      - GET /items/{id} → Obtener detalle
      - Comparar con local
      - Detectar cambios
   4. Procesar diferencias
   5. Actualizar stocks/precios
                        │
                        ▼
   Resultado: ✅ 15 productos sincronizados
   - Creados: 0 (primera sincronización)
   - Actualizados: 15 (pull desde MELI)
   - Errores: 0
```

### 2. Cambio de Stock en App → MELI

```
Usuario en Almacén
                │
                ▼
   Click producto > "Editar"
                │
                ▼
   Stock: [50] → cambiar a [45]
                │
                ▼
        Click "Guardar"
                │
                ▼
   Guardar en local:
   - almacen[].stock = 45
   - producto.syncMeli = true (marcado)
                │
                ▼
   Opcional: Usuario click "📤 Sync MELI ahora"
                │
                ▼
   O esperar 30 min para polling automático
                │
                ▼
   SYNC TRIGGER (automático o manual)
                │
                ▼
   PUT /items/{meliId}/available_quantity: 45
                │
                ▼
   Log: "stock_update: 50 → 45 ✅"
                │
                ▼
   En MELI se actualiza al instante
```

### 3. Cambio de Precio en App → MELI

```
Usuario en Almacén
                │
                ▼
   Click producto > "Editar"
                │
                ▼
   Precio: [1250] → cambiar a [1350]
                │
                ▼
        Click "Guardar"
                │
                ▼
   En siguiente SYNC (máximo 30 min):
                │
                ▼
   PUT /items/{meliId}: {price: 1350}
                │
                ▼
   Log: "price_update: 1250 → 1350 ✅"
```

### 4. Detectar Conflicto: Stock Diferente

```
LOCAL: Stock = 50
MELI:  Stock = 35  (alguien vendió)
                │
                ▼
   SYNC Detecta diferencia
                │
                ▼
   ¿Qué hacer?
   
   Opciones:
   A) Confiar MELI (cliente compró en MELI)
      → Actualizar local a 35
   
   B) Confiar LOCAL (error en MELI)
      → Actualizar MELI a 50
   
   C) Manual (usuario decide)
      → Mostrar modal de conflicto
                │
                ▼
   Registrar conflicto en historial:
   {
     type: "stock_conflict",
     product: "Puerta Delantera Izquierda",
     local: 50,
     meli: 35,
     timestamp: "2026-04-22T14:30:00Z",
     resolution: "pending" | "local_wins" | "meli_wins"
   }
```

### 5. Crear Producto Local → Sincronizar a MELI

```
Usuario en Almacén
                │
                ▼
   Click "➕ Nuevo Producto"
                │
                ▼
   Llenar formulario:
   - Nombre: "Marco Puerta Delantera"
   - Precio: 450.00
   - Stock: 20
   - SKU: MA-MARCO-1234
                │
                ▼
        Click "Guardar"
                │
                ▼
   Guardar en almacen[] local
   - id: "prod_123456"
   - meliId: null (sin sincronizar aún)
   - syncMeli: true (marcado por defecto)
                │
                ▼
   En siguiente SYNC:
                │
                ▼
   Detectar: meliId == null && syncMeli == true
                │
                ▼
   Mapear producto:
   {
     title: "Marco Puerta Delantera",
     price: 450,
     available_quantity: 20,
     category_id: "MLM6055",
     seller_sku: "MA-MARCO-1234",
     attributes: [...],
     pictures: [...]
   }
                │
                ▼
   POST /items
                │
                ▼
   Obtener meliId de respuesta
                │
                ▼
   Guardar mapping:
   listings["prod_123456"] = "MLM9876543210"
                │
                ▼
   Log: "create: prod_123456 → MLM9876543210 ✅"
                │
                ▼
   Producto AHORA visible en MELI
```

---

## Manejo de Conflictos

### Tipo 1: Stock Diferente

```
LOCAL:   50 unidades
MELI:    35 unidades
DIFERENCIA: -15

Probable causa:
✓ Cliente compró en MELI (mejor fuente de verdad)
✗ Error en MELI API
✗ Desfase temporal

Resolución:
1. Mostrar CONFLICTO al usuario
2. Opciones:
   A) "Usar MELI como verdad" (recomendar) → Local = 35
   B) "Usar LOCAL como verdad" → MELI = 50
   C) "Revisar después" → Ignorar por ahora
3. Guardar decisión en historial
```

### Tipo 2: Precio Diferente

```
LOCAL:   1250
MELI:    1350
DIFERENCIA: +100 (8%)

Probable causa:
✓ Usuario modificó en MELI directamente
✗ Desfase de sincronización
✗ Promoción activa en MELI

Resolución:
1. ADVERTENCIA: "Precio en MELI es diferente"
2. Si diferencia > 10%:
   - Mostrar confirmación antes de sync
   - Sugerir: "¿Usar LOCAL o MELI?"
3. Si diferencia < 10%:
   - Silencioso, seguir con LOCAL
```

### Tipo 3: Producto Existe en MELI pero No en LOCAL

```
Producto en MELI: "Espejo Lateral Auto"
Producto en LOCAL: No existe

Probable causa:
✓ Cliente creó en MELI directamente
✗ Producto eliminado del local
✗ Error de sincronización

Acción:
1. OFRECER IMPORTAR: "¿Importar producto de MELI?"
2. Si acepta → mapMeliToLocal() → agregar a almacen[]
3. Si rechaza → solo log de observación
```

---

## Recuperación de Errores

### Error: Token Expirado (401)

```
PROBLEMA: GET /items/123 → 401 Unauthorized

DETECCIÓN:
if (response.status === 401) {
  // Token expirado (6 horas de vida)
}

RECUPERACIÓN:
1. Llamar refreshMeliToken()
2. POST /oauth/token con refresh_token
3. Guardar nuevo access_token
4. REINTENTAR request original
5. Si sigue fallando → estado OFFLINE

USUARIO VE:
"Token expirado. Reconectando..."
[Spinner]
"✅ Reconectado"
```

### Error: Rate Limited (429)

```
PROBLEMA: Demasiadas requests en muy poco tiempo

DETECCIÓN:
if (response.status === 429) {
  const retryAfter = response.headers.get('Retry-After');
}

RECUPERACIÓN:
1. Extraer Retry-After (ej: 60 segundos)
2. Esperar X segundos
3. REINTENTAR request
4. Máximo 3 intentos totales

USUARIO VE:
"⏳ Rate limited. Esperando 60 segundos..."
[Contador: 59... 58... 57...]
"✅ Reintentando..."
```

### Error: Red Caída (timeout)

```
PROBLEMA: No hay respuesta de MELI API en 10 segundos

DETECCIÓN:
AbortController timeout → fetch rejects

RECUPERACIÓN:
1. Exponential backoff: 1s, 2s, 4s
2. Máximo 3 reintentos
3. Si persiste → estado ERROR
4. Siguiente sync: automático en 30 min

USUARIO VE:
"❌ Conexión perdida (intento 1/3)"
"Reintentando en 2 segundos..."
"❌ Error de conexión"
"Próxima sincronización: en 30 minutos"
```

### Error: Datos Inválidos (400)

```
PROBLEMA: Producto tiene datos incorrectos

DETECCIÓN:
response.status === 400
response.error === "invalid_price"

CAUSA COMÚN:
- Precio negativo
- Stock negativo
- Título vacío
- Categoría inválida

RECUPERACIÓN:
1. Parsear error.cause[]
2. MARKEAR producto como SYNC_ERROR
3. NO reintentar automáticamente
4. Mostrar error específico al usuario
5. Usuario debe corregir datos manualmente

USUARIO VE:
"❌ Error al sincronizar 'Puerta Delantera'"
Error: "Precio debe ser mayor a 0"
[Botón: "Editar Producto"]
```

---

## Monitoring y Alertas

### Dashboard de Sincronización

```
┌─────────────────────────────────────────────┐
│ 📊 Estado de Sincronización                 │
├─────────────────────────────────────────────┤
│                                             │
│ Estado: ✅ Conectado                        │
│ Usuario: mayaautopartes (ID: 123456789)    │
│                                             │
│ Último Sync: hace 5 minutos                 │
│ Próximo Sync: en 25 minutos                 │
│                                             │
│ ├─ Productos Locales: 63                   │
│ ├─ Productos en MELI: 58                   │
│ ├─ Pendientes: 5                           │
│ └─ Conflictos: 1                           │
│                                             │
│ Estadísticas:                               │
│ • Creados hoy: 3                           │
│ • Actualizados hoy: 12                     │
│ • Errores hoy: 0                           │
│                                             │
│ [🔄 Sincronizar Ahora]  [📋 Ver Historial] │
│                                             │
└─────────────────────────────────────────────┘
```

### Historial de Cambios

```
┌──────────────────────────────────────────────────┐
│ 📜 Historial de Sincronización                   │
├──────────────────────────────────────────────────┤
│                                                  │
│ 14:30  ✅  FULL SYNC       Completado           │
│           Creados: 0, Actualizados: 5            │
│           Duración: 12.3s                        │
│                                                  │
│ 14:29  ✅  STOCK UPDATE     Puerta Delantera     │
│           50 → 45 unidades                       │
│                                                  │
│ 14:15  ⚠️  CONFLICT        Marco Puerta          │
│           LOCAL: 20, MELI: 18 (Revisar)         │
│                                                  │
│ 14:00  ✅  PRICE UPDATE    Espejo Lateral       │
│           1200 → 1250                            │
│                                                  │
│ 13:30  ✅  FULL SYNC       Completado           │
│           Creados: 1, Actualizados: 4            │
│           Duración: 8.7s                         │
│                                                  │
│ [← Anterior]                    [Siguiente →]    │
│                                                  │
└──────────────────────────────────────────────────┘
```

### Alertas

```
Tipo 1: ERROR CRÍTICO
┌─────────────────────────────────┐
│ ❌ Error de Sincronización       │
│                                 │
│ Token expirado o inválido       │
│ Última sincronización: 2 horas  │
│                                 │
│ [Reconectar]                    │
└─────────────────────────────────┘

Tipo 2: CONFLICTO
┌─────────────────────────────────┐
│ ⚠️ Conflicto Detectado           │
│                                 │
│ Stock diferente en "Puerta"     │
│ LOCAL: 50 | MELI: 35            │
│                                 │
│ [Usar MELI] [Usar LOCAL]        │
└─────────────────────────────────┘

Tipo 3: PENDIENTE
┌─────────────────────────────────┐
│ 📌 Productos Pendientes          │
│                                 │
│ 5 productos no sincronizados    │
│ Próximo sync: en 15 minutos     │
│                                 │
│ [Sincronizar Ahora]             │
└─────────────────────────────────┘
```

---

## Diagrama Temporal

### Día Típico de Operación

```
00:00 ┼──────────────────────────────────────────────────────────┐
      │                                                           │
06:00 │ [1] SYNC AUTOMÁTICO ✅                                   │
      │     Creados: 0, Actualizados: 2, Errores: 0            │
      │                                                           │
12:30 │ [2] Usuario modifica PRECIO                             │
      │     Precio: 1200 → 1350                                 │
      │                                                           │
13:00 │ [3] SYNC AUTOMÁTICO ✅                                   │
      │     Actualiza precio en MELI                            │
      │                                                           │
14:15 │ [4] Usuario modifica STOCK                              │
      │     Stock: 50 → 42                                      │
      │                                                           │
14:30 │ [5] Usuario hace SYNC MANUAL                            │
      │     (no esperar 30 min)                                 │
      │                                                           │
14:31 │ [6] SYNC COMPLETA ✅                                     │
      │     Actualiza stock en MELI                             │
      │                                                           │
15:00 │ [7] SYNC AUTOMÁTICO ✅                                   │
      │     Creados: 0, Actualizados: 0, Errores: 0            │
      │                                                           │
18:00 │ [8] Cliente compra en MELI (3 unidades)                 │
      │     Stock en MELI ahora: 39                             │
      │                                                           │
18:30 │ [9] SYNC AUTOMÁTICO ✅                                   │
      │     ⚠️ DETECTA CONFLICTO                                │
      │     LOCAL: 42, MELI: 39                                 │
      │     → Mostrar modal de resolución                       │
      │                                                           │
18:31 │ [10] Usuario resuelve: "Usar MELI" (verdad de ventas)  │
      │      Stock LOCAL actualizado a 39                       │
      │                                                           │
24:00 └──────────────────────────────────────────────────────────┘

Resumen diario:
- 6 syncs automáticas (1 cada 4 horas)
- 1 sync manual (usuario)
- 1 conflicto detectado y resuelto
- 0 errores críticos
- 100% uptime de conexión
```

---

## Resumen de Flujo

```
┌────────────────────┐
│  USUARIO ABRE APP  │
└────────┬───────────┘
         │
         ▼
    ¿CONECTADO?
    ├─ NO → Mostrar "Conectar con MELI"
    │        Usuario hace OAuth flow
    │        │
    │        ▼
    │    ✅ Conectado
    │
    └─ SÍ → Iniciar polling cada 30 min
             │
             ▼
         CADA 30 MIN:
         1. Obtener datos MELI
         2. Comparar con local
         3. Sincronizar cambios
         4. Registrar historial
             │
             ▼
         ¿Conflictos?
         ├─ SÍ → Mostrar para revisar
         └─ NO → Silencioso
             │
             ▼
         Mostrar dashboard:
         - Estado: ✅ Sincronizado
         - Últimas changes
         - Próximo sync: X min
```

---

**Última actualización**: 2026-04-22
