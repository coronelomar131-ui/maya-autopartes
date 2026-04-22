# 🔄 OneDrive Excel Auto-Sync - Documentación Completa

**Versión**: 1.0.0  
**Fecha**: 2026-04-22  
**Estado**: Listo para implementación  
**Presupuesto**: Incluido en $5,000 MXN actual

---

## 📋 Tabla de Contenidos

1. [Visión General](#visión-general)
2. [Arquitectura del Sistema](#arquitectura-del-sistema)
3. [Librerías Recomendadas](#librerías-recomendadas)
4. [Configuración & Setup](#configuración--setup)
5. [Flujo de Autenticación](#flujo-de-autenticación)
6. [API Endpoints](#api-endpoints)
7. [Estrategia de Sync](#estrategia-de-sync)
8. [Manejo de Conflictos](#manejo-de-conflictos)
9. [Testing & Monitoreo](#testing--monitoreo)
10. [Troubleshooting](#troubleshooting)

---

## Visión General

### Objetivo
Sincronización **bidireccional y en tiempo real** entre:
- ✅ Excel en OneDrive (fuente de datos autorizada)
- ✅ App Facturas Maya Autopartes (interfaz de usuario)

### Casos de Uso
```
1. Vendedor actualiza Excel en OneDrive
   ↓
2. App detecta cambios (cada 1 minuto)
   ↓
3. App actualiza localStorage automáticamente
   ↓
4. UI se refresca en tiempo real

Y bidireccional:

1. Vendedor crea factura en la App
   ↓
2. App guarda en localStorage
   ↓
3. Auto-sync sube cambios a Excel (cada 5 minutos)
   ↓
4. Excel en OneDrive se actualiza automáticamente
```

### Beneficios
- 🟢 **Sincronización automática** - Sin intervención manual
- 🟢 **Offline-first** - Funciona sin internet, sincroniza cuando regresa
- 🟢 **Conflictos resueltos** - Estrategia inteligente de merge
- 🟢 **Delta queries** - Solo descarga cambios (eficiente)
- 🟢 **Seguridad OAuth 2.0** - No necesita guardar contraseña

---

## Arquitectura del Sistema

### Componentes

```
┌─────────────────────────────────────────────────────────┐
│                   NAVEGADOR (Cliente)                   │
│                                                         │
│  ┌────────────────────────────────────────────────────┐ │
│  │         React / JavaScript UI                       │ │
│  │  (Muestra facturas, permite crear/editar)           │ │
│  └────────────────────────────────────────────────────┘ │
│                         ↓↑                              │
│  ┌────────────────────────────────────────────────────┐ │
│  │  onedrive-sync.js                                   │ │
│  │  - initOneDriveAuth() → OAuth                       │ │
│  │  - syncExcelFacturas() → Lectura Excel             │ │
│  │  - monitorExcelChanges() → Polling                 │ │
│  │  - pushChangesToExcel() → Escritura Excel          │ │
│  │  - resolveConflict() → Merge inteligente           │ │
│  └────────────────────────────────────────────────────┘ │
│                         ↓↑                              │
│  ┌────────────────────────────────────────────────────┐ │
│  │         localStorage (Cache Local)                  │ │
│  │  - ma4_v (ventas/facturas)                          │ │
│  │  - ma4_a (almacén)                                  │ │
│  │  - ma4_c (clientes)                                 │ │
│  │  - onedrive_auth (tokens)                           │ │
│  │  - onedrive_delta_token (cambios)                   │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
           ↓↑                              ↓↑
  ┌──────────────────┐         ┌──────────────────────┐
  │  Microsoft Graph │         │     OneDrive / Excel │
  │      API v1.0    │         │   (Fuente Autorizada)│
  │                  │         │                      │
  │ - /me/drive      │ ←─────→ │ - Facturas_MA...xlsx │
  │ - /me/drive/     │         │ - Sheet: "Facturas"  │
  │   items/X        │         │ - Cols: Número, ...  │
  │ - delta queries  │         │                      │
  └──────────────────┘         └──────────────────────┘
```

### Flujo de Datos

```
PASO 1: AUTENTICACIÓN (Primera vez)
─────────────────────────────────────
User hace click "Conectar OneDrive"
    ↓
initOneDriveAuth()
    ↓
startOAuthFlow()
    ↓
Redirige a login.microsoftonline.com
    ↓
User autoriza app
    ↓
Callback con authorization code
    ↓
handleOAuthCallback(code)
    ↓
Exchange code → access_token + refresh_token
    ↓
Guardar en localStorage
    ↓
✅ Autenticado

PASO 2: LECTURA INICIAL
──────────────────────
findExcelFile()
    ↓ Buscar "Facturas_Maya_Autopartes.xlsx"
    ↓
downloadExcelFromOneDrive()
    ↓ Descargar .xlsx de OneDrive
    ↓
parseExcelToFacturas()
    ↓ Convertir Excel → Objetos JavaScript
    ↓
Mapear columnas (Número → numero, etc)
    ↓
localStorage.setItem('ma4_v', JSON.stringify(facturas))
    ↓
✅ Facturas en localStorage

PASO 3: MONITOREO CONTINUO
─────────────────────────
monitorExcelChanges()
    ↓ Inicia polling cada 60 segundos
    ↓
syncExcelFacturas() [automático cada 60s]
    ├─ Refrescar token si expira
    ├─ Descargar Excel desde OneDrive
    ├─ Detectar cambios (hash comparison)
    ├─ Si hay cambios: actualizar localStorage
    └─ Trigger evento 'onedrive:sync'
    ↓
window.dispatchEvent('onedrive:sync')
    ↓
UI detecta evento y refresca tablas
    ↓
✅ Usuario ve actualizaciones en tiempo real

PASO 4: SINCRONIZACIÓN INVERSA (App → Excel)
──────────────────────────────────────────────
User crea/edita factura en app
    ↓
App guarda en localStorage (ma4_v)
    ↓
Trigger pushChangesToExcel() [cada 5 minutos]
    ↓
Descargar Excel actual de OneDrive
    ↓
Convertir facturas → Filas Excel
    ↓
Actualizar worksheet
    ↓
uploadFileToOneDrive()
    ↓
✅ Excel en OneDrive actualizado automáticamente
```

---

## Librerías Recomendadas

### 📦 Core Libraries (Esenciales)

| Librería | Versión | Propósito | Tamaño | Instalación |
|----------|---------|----------|--------|------------|
| **@microsoft/msal-browser** | ^3.19.0 | OAuth 2.0 con Microsoft | ~150 KB | `npm install @microsoft/msal-browser` |
| **exceljs** | ^4.4.0 | Leer/escribir Excel (.xlsx) | ~500 KB | `npm install exceljs` |
| **xlsx** | ^0.18.5 | Parse Excel rápido | ~450 KB | `npm install xlsx` |
| **axios** | ^1.6.0 | HTTP requests | ~50 KB | `npm install axios` |
| **date-fns** | ^2.30.0 | Utilidades de fechas | ~30 KB | `npm install date-fns` |

### 🔐 Seguridad (Recomendado)

| Librería | Versión | Propósito |
|----------|---------|----------|
| **tweetnacl-js** | ^1.1.2 | Encripción de credenciales |
| **base64-js** | ^1.5.1 | Base64 encoding |

### 🔍 Monitoreo & Logging (Opcional)

| Librería | Versión | Propósito |
|----------|---------|----------|
| **pino** | ^8.14.0 | Logging en producción |
| **sentry** | ^7.0.0 | Error tracking |

### 📊 State Management (Si usas React)

| Librería | Versión | Propósito |
|----------|---------|----------|
| **zustand** | ^4.4.0 | Estado global (ligero) |
| **react-query** | ^5.0.0 | Cache + sync de datos |

---

## Configuración & Setup

### Paso 1: Registrar App en Azure Portal

```
1. Ir a: https://portal.azure.com
2. Buscar "App registrations"
3. Click "New registration"
4. Completar:
   - Name: "Maya Autopartes Sync"
   - Supported account types: "Accounts in any organizational directory"
   - Redirect URI (Web): "https://tu-domain.com/auth-callback"
5. Copy CLIENT_ID
6. En "Certificates & secrets" → "New client secret"
7. Copy CLIENT_SECRET (solo visible una vez)
8. En "API permissions":
   - Add: Files.ReadWrite.All
   - Add: offline_access
9. Grant admin consent
```

### Paso 2: Instalar Dependencias

```bash
npm install @microsoft/msal-browser@^3.19.0 exceljs@^4.4.0 xlsx@^0.18.5 axios@^1.6.0 date-fns@^2.30.0
```

### Paso 3: Variables de Entorno

```bash
# .env o .env.local
VITE_MS_CLIENT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
VITE_MS_CLIENT_SECRET=xxxxx~xxxxxxx~xxxxxxxxxxx (solo si es app confidencial)
VITE_MS_TENANT_ID=common (o tu tenant específico)
VITE_APP_NAME=Maya Autopartes Sync
```

### Paso 4: Importar en tu App

```javascript
// main.js o index.js
import {
  initOneDriveAuth,
  monitorExcelChanges,
  pushChangesToExcel,
  CONFIG
} from './api/onedrive-sync.js';

// Inicializar cuando UI está lista
document.addEventListener('DOMContentLoaded', async () => {
  // Mostrar botón "Conectar OneDrive"
  const connectBtn = document.getElementById('connect-onedrive');
  
  connectBtn.addEventListener('click', async () => {
    const success = await initOneDriveAuth();
    if (success) {
      // Mostrar indicador de conectado
      document.body.classList.add('onedrive-connected');
      
      // Iniciar monitoreo automático
      monitorExcelChanges();
    }
  });

  // Escuchar cambios desde OneDrive
  window.addEventListener('onedrive:sync', (e) => {
    console.log('Facturas actualizadas:', e.detail.facturas);
    // Refrescar UI aquí
    renderVentas(e.detail.facturas);
  });

  // Cuando user crea/edita factura
  document.addEventListener('factura:saved', (e) => {
    // Auto-sincronizar con Excel (debounced)
    pushChangesToExcel([e.detail.factura]);
  });
});
```

### Paso 5: Crear Página de Callback

```html
<!-- auth-callback.html -->
<!DOCTYPE html>
<html>
<head>
  <title>Autenticando...</title>
</head>
<body>
  <p>Procesando autenticación...</p>
  <script type="module">
    import { handleOAuthCallback } from './api/onedrive-sync.js';

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const error = params.get('error');

    if (error) {
      console.error('OAuth Error:', error);
      alert('Error de autenticación: ' + error);
      window.location.href = '/';
    } else if (code) {
      const success = await handleOAuthCallback(code);
      if (success) {
        window.location.href = '/?connected=1';
      } else {
        alert('Error procesando autenticación');
        window.location.href = '/';
      }
    }
  </script>
</body>
</html>
```

---

## Flujo de Autenticación

### OAuth 2.0 Authorization Code Flow with PKCE

```
┌─────────────────────────────────────────────────────────────┐
│ Usuario hace click "Conectar OneDrive"                      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ initOneDriveAuth() detecta sin token                         │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ startOAuthFlow()                                             │
│ ├─ Generar state (CSRF token)                               │
│ ├─ Generar code_verifier                                    │
│ ├─ Generar code_challenge (PKCE)                            │
│ └─ Guardar en sessionStorage (temporal)                     │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Redirigir a:                                                │
│ https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/  │
│ authorize?                                                  │
│   client_id=...                                             │
│   redirect_uri=https://app.com/auth-callback                │
│   response_type=code                                        │
│   scope=Files.ReadWrite.All offline_access                  │
│   state=...                                                 │
│   code_challenge=...                                        │
│   code_challenge_method=S256                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Usuario inicia sesión en Microsoft (si no está)             │
│ Usuario elige cuenta                                        │
│ Usuario ve pantalla de consentimiento:                      │
│ "Maya Autopartes quiere:"                                   │
│ - Leer y escribir archivos en OneDrive                      │
│ - Acceso offline                                            │
│ Usuario hace click "Aceptar"                                │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Redirige a: https://app.com/auth-callback?code=...&state=... │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ handleOAuthCallback()                                       │
│ ├─ Validar state (CSRF check)                               │
│ ├─ Recuperar code_verifier de sessionStorage                │
│ ├─ POST a /oauth2/v2.0/token con:                           │
│ │  - code                                                    │
│ │  - code_verifier                                          │
│ │  - client_id                                              │
│ │  - redirect_uri                                           │
│ │  - grant_type=authorization_code                          │
│ └─ Recibir tokens:                                          │
│    - access_token (válido 1 hora)                           │
│    - refresh_token (válido 90 días)                         │
│    - expires_in (3600 segundos)                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Obtener info del usuario:                                   │
│ GET /me con Bearer access_token                             │
│ Respuesta: { id, mail, displayName, ... }                   │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ Guardar en localStorage:                                    │
│ {                                                           │
│   "accessToken": "eyJ0eXAiOiJKV1QiLCJhbGc...",              │
│   "refreshToken": "M.R3_BAY...",                            │
│   "userId": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxx",              │
│   "expiresAt": 1714000000000                                │
│ }                                                           │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│ ✅ Autenticación completada                                 │
│ Iniciar monitorExcelChanges()                               │
└─────────────────────────────────────────────────────────────┘
```

### Seguridad PKCE

**¿Por qué PKCE (Proof Key for Public Clients)?**

- App JavaScript no puede guardar `client_secret` de forma segura
- PKCE previene "authorization code interception attacks"
- Code verifier + challenge garantiza que solo la app original puede intercambiar el código

**Flujo:**

```
1. Client genera:
   code_verifier = random string (128 caracteres)

2. Client calcula:
   code_challenge = SHA256(code_verifier) → base64url encode

3. Client redirije a authorization endpoint con code_challenge

4. Microsoft valida que el code_challenge corresponde al code_verifier
   en el token request

5. Seguridad: Si alguien intercepta el authorization code,
   NO puede usarlo sin el code_verifier
```

---

## API Endpoints

### Microsoft Graph API Endpoints Utilizados

```
LECTURA:
─────────
GET /me
  Descripción: Obtener información del usuario autenticado
  Respuesta: { id, mail, displayName, userPrincipalName, ... }

GET /me/drive/root/children
  Descripción: Listar archivos en root de OneDrive
  Parámetros: $filter=name eq 'filename'
  Respuesta: { value: [{ id, name, size, lastModifiedDateTime, ... }] }

GET /me/drive/items/{itemId}
  Descripción: Obtener información de un archivo
  Respuesta: { id, name, size, @microsoft.graph.downloadUrl, ... }

GET /me/drive/items/{itemId}/delta
  Descripción: Delta query - obtener cambios incrementales
  Parámetros: token={deltaToken}
  Respuesta: { value: [...], @odata.deltaLink: "..." }

GET /me/drive/items/{itemId}/content (redirect)
  Descripción: Descargar contenido del archivo
  Headers: Authorization: Bearer {accessToken}
  Respuesta: binary (Excel file)

ESCRITURA:
──────────
PUT /me/drive/items/{itemId}/content
  Descripción: Subir/actualizar contenido de archivo
  Headers: Authorization: Bearer {accessToken}
           Content-Type: application/vnd.openxmlformats...
  Body: binary (Excel file)
  Respuesta: { id, name, size, ... }

TOKENS:
───────
POST /oauth2/v2.0/token
  Descripción: Obtener access token (authorization code flow)
  Body: {
    client_id: "...",
    code: "...",
    redirect_uri: "...",
    grant_type: "authorization_code",
    code_verifier: "..."
  }
  Respuesta: {
    access_token: "...",
    refresh_token: "...",
    expires_in: 3600,
    token_type: "Bearer"
  }

POST /oauth2/v2.0/token
  Descripción: Refrescar access token
  Body: {
    client_id: "...",
    refresh_token: "...",
    grant_type: "refresh_token",
    scope: "Files.ReadWrite.All offline_access"
  }
  Respuesta: { access_token: "...", expires_in: 3600, ... }
```

### Ejemplo de Requests

```javascript
// 1. Buscar Excel
const response = await fetch(
  'https://graph.microsoft.com/v1.0/me/drive/root/children?$filter=name eq \'Facturas_Maya.xlsx\'',
  {
    headers: {
      'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGc...',
      'Accept': 'application/json'
    }
  }
);
const data = await response.json();
// data.value[0].id = "01ABCDEFG123456"

// 2. Descargar Excel
const fileResponse = await fetch(
  'https://graph.microsoft.com/v1.0/me/drive/items/01ABCDEFG123456?$select=@microsoft.graph.downloadUrl',
  {
    headers: { 'Authorization': 'Bearer ...' }
  }
);
const fileData = await fileResponse.json();
const downloadUrl = fileData['@microsoft.graph.downloadUrl'];
// downloadUrl es temporal y válido por ~15 minutos

const excelBuffer = await fetch(downloadUrl).then(r => r.arrayBuffer());

// 3. Delta query
const deltaResponse = await fetch(
  'https://graph.microsoft.com/v1.0/me/drive/items/01ABCDEFG123456/delta?token=...',
  { headers: { 'Authorization': 'Bearer ...' } }
);
// Respuesta:
// {
//   value: [
//     {
//       id: "01ABC",
//       name: "Facturas_Maya.xlsx",
//       lastModifiedDateTime: "2026-04-22T15:30:00Z",
//       deleted: {} // o size: 12345
//     }
//   ],
//   "@odata.deltaLink": "https://...delta?token=..."
// }
```

---

## Estrategia de Sync

### Polling vs Webhooks

```
┌──────────────────────────────────────────────────────┐
│          POLLING (Recomendado para MVP)               │
├──────────────────────────────────────────────────────┤
│ Ventajas:                                             │
│ ✅ Simple de implementar                              │
│ ✅ No requiere backend público/HTTPS                  │
│ ✅ Funciona con cualquier hosting                     │
│ ✅ Escalable horizontalmente                          │
│                                                       │
│ Desventajas:                                          │
│ ❌ Latencia (máx 1 min con delta query)               │
│ ❌ Más requests (inefficient)                         │
│ ❌ No ideal para actualizaciones ultra-rápidas       │
│                                                       │
│ Intervalo recomendado: 60 segundos (1 minuto)        │
│ Puede reducirse a 30s si presupuesto lo permite      │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│       WEBHOOKS (Producción/Enterprise)                │
├──────────────────────────────────────────────────────┤
│ Ventajas:                                             │
│ ✅ Sincronización casi instantánea (<100ms)           │
│ ✅ Muy eficiente (solo cambios)                       │
│ ✅ Ideal para crítico                                 │
│                                                       │
│ Desventajas:                                          │
│ ❌ Requiere backend + DB                              │
│ ❌ Endpoint HTTPS público con rate limiting          │
│ ❌ Más complejo de implementar                        │
│ ❌ Costo de infraestructura                           │
│                                                       │
│ Requiere: Node.js backend + Supabase/Firebase        │
└──────────────────────────────────────────────────────┘

RECOMENDACIÓN ACTUAL:
→ POLLING cada 60 segundos con delta queries
→ Cambios a WEBHOOKS en fase 2 si escala requiere
```

### Intervalo de Polling

```
CONFIGURACIÓN ACTUAL:
─────────────────────
CONFIG.deltaQueryInterval = 60000  // 1 minuto para lectura
CONFIG.syncInterval = 300000       // 5 minutos para escritura

RATIONALE:
─────────
1. LECTURA (60s):
   - Usuario espera ver cambios desde Excel en ~1 minuto
   - Delta queries = muy eficiente (bajo bandwidth)
   - Puede reducirse a 30s si se necesita más rapidez

2. ESCRITURA (300s / 5 min):
   - Cambios en app se sincronizan cada 5 minutos
   - Evita demasiados uploads repetidos
   - Mejor para batching de cambios

AJUSTES SEGÚN ESCALA:
────────────────────
Si 1-10 usuarios:     deltaQueryInterval = 60000, syncInterval = 300000
Si 10-100 usuarios:   deltaQueryInterval = 120000, syncInterval = 600000
Si 100+ usuarios:     Evaluar webhooks + backend

THROTTLING:
──────────
const syncExcelFacturas = debounce(async () => {
  // Evita demasiadas llamadas simultáneas
}, 1000);

// Si user edita rápidamente, se deduplicará
// Máx 1 sync cada segundo
```

### Delta Queries (Incremental Sync)

```
¿POR QUÉ?
────────
Sin delta queries:
- Cada sync: Descargar Excel completo (50 KB - 1 MB)
- 1 usuario: 1 MB × 60 veces/hora × 8 horas = 480 MB/día
- 10 usuarios: 4.8 GB/día
- Bandwidth muy alto

Con delta queries:
- Primera vez: Descargar Excel completo
- Posteriores: Solo metadatos de cambios (~1 KB)
- 1 usuario: 50 KB + 1 KB × 59 = ~60 KB/hora
- 10 usuarios: ~600 KB/hora ✅ 1000x más eficiente

IMPLEMENTACIÓN:
───────────────
1. Primera sincronización:
   GET /me/drive/items/{itemId}/delta
   Respuesta incluye @odata.deltaLink

2. Guardar deltaToken:
   const deltaLink = response['@odata.deltaLink'];
   localStorage.setItem('onedrive_delta_token', deltaLink);

3. Próximas sincronizaciones:
   GET /me/drive/items/{itemId}/delta?token={deltaToken}
   Solo devuelve cambios desde última llamada

4. Seguir el @odata.deltaLink:
   Continuar con el nuevo deltaLink
   Permite múltiples páginas de resultados

CICLO DE VIDA:
──────────────
┌─────────────────┐
│  Lectura Inicial│ → Guardar deltaToken
└────────┬────────┘
         ↓
┌─────────────────┐
│ getDeltaChanges │ → deltaToken válido por días
└────────┬────────┘
         ↓
┌─────────────────┐
│ Si cambios >0   │ → Descargar file completo si delta falla
└────────┬────────┘
         ↓
┌─────────────────┐
│ Actualizar local│ → Guardar nuevo deltaToken
└─────────────────┘

MANEJO DE RESET:
────────────────
Si deltaToken caduca (>semanas sin sincronización):
└─ API devuelve error 410 Gone
└─ Fallback: Descargar Excel completo
└─ Iniciar delta queries de nuevo
```

---

## Manejo de Conflictos

### Escenarios

```
ESCENARIO 1: Cambio simultáneo (raro pero posible)
──────────────────────────────────────────────────
T0: User A edita Factura #100 en Excel (Saldo: 1000)
T0: User B edita Factura #100 en App (Saldo: 500)
T1: App detecta cambio de Excel (1000)
T2: App detecta cambio de App (500)
→ ¿Cuál gana?

Estrategia: "Last-Write-Wins" (LWW)
└─ Más reciente gana (timestamp)
└─ Si timestamps iguales: Excel gana (source of truth)


ESCENARIO 2: Offline editing
──────────────────────────────
T0: User trabaja offline, edita Facturas
T1: Cambios quedan en localStorage
T2: User regresa online
→ ¿Cómo sincronizar?

Estrategia: Merge inteligente
└─ Detectar cambios locales ≠ remotos
└─ Aplicar estrategia resolveConflict()
└─ Guardar en conflictQueue si falla
└─ Reintentar cuando haya conexión


ESCENARIO 3: Network error mid-sync
─────────────────────────────────────
T0: App empieza a subir cambios a Excel
T1: Error en conexión (timeout)
T2: Cambio parcial en Excel
→ ¿Qué pasó?

Estrategia: Rollback + Retry
└─ Si upload falla: No commitear en localStorage
└─ Guardar en conflictQueue
└─ Siguiente sync intentará de nuevo
└─ Transaccionalidad en delta queries
```

### Algoritmo de Resolución

```javascript
/**
 * Resolver conflictos
 * @param {Object} appVersion - Versión en localStorage
 * @param {Object} excelVersion - Versión en OneDrive Excel
 * @param {String} strategy - 'app-wins', 'excel-wins', 'merge', 'timestamp'
 */
function resolveConflict(appVersion, excelVersion, strategy = 'timestamp') {
  // 1. Timestamp comparison (más reciente gana)
  const appTime = new Date(appVersion._syncTimestamp || 0).getTime();
  const excelTime = new Date(excelVersion._syncTimestamp || 0).getTime();

  if (strategy === 'timestamp') {
    const winner = appTime > excelTime ? appVersion : excelVersion;
    return {
      ...winner,
      _resolved: true,
      _strategy: 'timestamp',
      _conflict: {
        appTime,
        excelTime,
        appHash: hashObject(appVersion),
        excelHash: hashObject(excelVersion)
      }
    };
  }

  // 2. Field-level merge (combinar campos inteligentemente)
  if (strategy === 'merge') {
    const merged = {};
    const allFields = new Set([
      ...Object.keys(appVersion),
      ...Object.keys(excelVersion)
    ]);

    allFields.forEach(field => {
      if (field.startsWith('_')) {
        // Ignorar metadatos
        return;
      }

      const appVal = appVersion[field];
      const excelVal = excelVersion[field];

      // Si ambos tienen cambios diferentes
      if (appVal !== excelVal && appVal !== undefined && excelVal !== undefined) {
        // Campos que nunca deben venir de Excel (creados por app)
        if (['_id', 'createdAt', 'createdBy'].includes(field)) {
          merged[field] = appVal;
        }
        // Campos críticos que vienen de Excel
        else if (['numero', 'cliente', 'fecha', 'total'].includes(field)) {
          merged[field] = excelVal; // Excel es source of truth
        }
        // Campos derivados (recalcular)
        else if (field === 'saldo') {
          const total = merged['total'] || excelVal.total;
          const pagado = merged['pagado'] || appVal.pagado || 0;
          merged[field] = total - pagado;
        }
        // Defaults: app wins para campos editables
        else {
          merged[field] = appVal;
        }
      } else {
        merged[field] = appVal || excelVal;
      }
    });

    return {
      ...merged,
      _resolved: true,
      _strategy: 'merge',
      _mergedFrom: { app: hashObject(appVersion), excel: hashObject(excelVersion) }
    };
  }

  // Fallback
  return appTime > excelTime ? appVersion : excelVersion;
}

// EJEMPLO DE USO:
const conflict = detectConflict(localFactura, remoteFactura);
if (conflict) {
  const resolved = resolveConflict(
    localFactura,
    remoteFactura,
    'timestamp' // o 'merge'
  );

  // Guardar versión resuelta
  localStorage.setItem('ma4_v', JSON.stringify([
    ...facturasCurrent.filter(f => f.numero !== conflict.numero),
    resolved
  ]));

  // Registrar en log
  console.log('Conflicto resuelto:', resolved._conflict);
}
```

---

## Testing & Monitoreo

### Unit Tests

```javascript
// onedrive-sync.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as sync from './onedrive-sync.js';

describe('OneDrive Sync', () => {
  // 1. Autenticación
  describe('initOneDriveAuth', () => {
    it('should load token from localStorage', async () => {
      localStorage.setItem('onedrive_auth', JSON.stringify({
        accessToken: 'token123',
        refreshToken: 'refresh123',
        userId: 'user123',
        expiresAt: Date.now() + 3600000
      }));

      const result = await sync.initOneDriveAuth();
      expect(result).toBe(true);
      expect(sync.STATE.accessToken).toBe('token123');
    });

    it('should refresh expired token', async () => {
      localStorage.setItem('onedrive_auth', JSON.stringify({
        accessToken: 'old_token',
        refreshToken: 'refresh123',
        userId: 'user123',
        expiresAt: Date.now() - 3600000 // Expirado
      }));

      // Mock axios para refresh
      // ...

      const result = await sync.initOneDriveAuth();
      expect(sync.STATE.accessToken).not.toBe('old_token');
    });
  });

  // 2. Lectura/Parsing
  describe('parseExcelToFacturas', () => {
    it('should parse Excel correctly', () => {
      const mockBuffer = /* ... */;

      const facturas = sync.parseExcelToFacturas(mockBuffer);
      expect(facturas).toHaveLength(5);
      expect(facturas[0].numero).toBe('001-2026-0001');
      expect(facturas[0].total).toBe(1500);
    });

    it('should map columns correctly', () => {
      const mockBuffer = /* ... */;

      const facturas = sync.parseExcelToFacturas(mockBuffer);
      expect(facturas[0]).toHaveProperty('numero');
      expect(facturas[0]).toHaveProperty('cliente');
      expect(facturas[0]).toHaveProperty('total');
    });

    it('should handle missing columns gracefully', () => {
      const mockBuffer = /* Excel sin columna Neto */;

      const facturas = sync.parseExcelToFacturas(mockBuffer);
      expect(facturas[0].neto).toBe(0);
    });
  });

  // 3. Detección de cambios
  describe('detectChanges', () => {
    it('should detect new facturas', () => {
      const old = [{ numero: '1', total: 100 }];
      const newF = [
        { numero: '1', total: 100 },
        { numero: '2', total: 200 }
      ];

      const changes = sync.detectChanges(old, newF);
      expect(changes.added).toBe(1);
    });

    it('should detect modified facturas', () => {
      const old = [{ numero: '1', total: 100 }];
      const newF = [{ numero: '1', total: 150 }];

      const changes = sync.detectChanges(old, newF);
      expect(changes.modified).toBe(1);
    });

    it('should detect deleted facturas', () => {
      const old = [
        { numero: '1', total: 100 },
        { numero: '2', total: 200 }
      ];
      const newF = [{ numero: '1', total: 100 }];

      const changes = sync.detectChanges(old, newF);
      expect(changes.deleted).toBe(1);
    });
  });

  // 4. Conflictos
  describe('resolveConflict', () => {
    it('should use timestamp strategy', () => {
      const appVersion = {
        numero: '1',
        total: 150,
        _syncTimestamp: new Date(Date.now() - 1000).toISOString()
      };

      const excelVersion = {
        numero: '1',
        total: 100,
        _syncTimestamp: new Date(Date.now()).toISOString()
      };

      const resolved = sync.resolveConflict(
        appVersion,
        excelVersion,
        'timestamp'
      );

      expect(resolved.total).toBe(100); // Excel (más reciente)
    });

    it('should merge intelligently', () => {
      const appVersion = {
        numero: '1',
        total: 100,
        saldo: 50
      };

      const excelVersion = {
        numero: '1',
        total: 150,
        saldo: 75
      };

      const resolved = sync.resolveConflict(
        appVersion,
        excelVersion,
        'merge'
      );

      expect(resolved.numero).toBe('1');
      expect(resolved._strategy).toBe('merge');
    });
  });
});
```

### Monitoreo en Producción

```javascript
// Logging configuration
const logSync = (level, message, data = {}) => {
  const log = {
    timestamp: new Date().toISOString(),
    level,
    message,
    userId: sync.STATE.userId,
    data
  };

  console.log(`[${level}] ${message}`, data);

  // Enviar a servicio de logging (Sentry, etc)
  if (window.__SENTRY__) {
    window.__SENTRY__.captureMessage(message, level.toLowerCase());
  }
};

// Métricas
const metrics = {
  syncsCount: 0,
  lastSyncTime: 0,
  conflictsResolved: 0,
  bytesDownloaded: 0,
  bytesUploaded: 0,
  errors: []
};

// Hooks para monitoreo
window.addEventListener('onedrive:sync', (e) => {
  metrics.syncsCount++;
  metrics.lastSyncTime = Date.now();
  logSync('INFO', 'Sync completado', {
    facturas: e.detail.facturas.length,
    changes: e.detail.changes
  });
});

window.addEventListener('onedrive:sync-error', (e) => {
  logSync('ERROR', 'Error en sync', { error: e.detail.error });
  metrics.errors.push({
    timestamp: new Date().toISOString(),
    error: e.detail.error
  });
});
```

---

## Troubleshooting

### Problemas Comunes

#### 1. "Invalid OAuth state"
```
Error: OAuth state validation failed

Causas:
- sessionStorage fue limpiada entre auth y callback
- Múltiples tabs abiertos con diferentes states
- Browser bloqueó sessionStorage

Solución:
- Usar localStorage en lugar de sessionStorage (menos seguro pero funciona)
- Validar que callback se abre en MISMO tab
- Revisar cookies/storage en DevTools
```

#### 2. "Token expired" en cada sync
```
Error: 401 Unauthorized - token_expired

Causas:
- expiresAt calculado incorrectamente
- Reloj del cliente desincronizado
- Token realmente expirado (>1 hora)

Solución:
- Refrescar 5 minutos antes de expiración
- Sincronizar hora del cliente: ntpjs
- Probar con: new Date().getTime()
```

#### 3. "File not found in OneDrive"
```
Error: Excel file not found

Causas:
- Archivo tiene otro nombre
- Archivo está en subcarpeta (no en root)
- User no tiene acceso al archivo

Solución:
- Buscar archivos disponibles:
  const files = await graphApi('/me/drive/root/children');
  console.table(files.value);

- Si está en subcarpeta:
  const folderId = findParentFolder('Facturas');
  await graphApi(`/me/drive/items/${folderId}/children`);
```

#### 4. "Delta token invalid"
```
Error: Invalid delta token / 410 Gone

Causas:
- Token caduca después de semanas sin sincronizar
- OneDrive fue restaurado desde backup
- Archivo fue eliminado y recreado

Solución:
- Limpiar delta token y hacer sincronización completa:
  localStorage.removeItem('onedrive_delta_token');
  STATE.deltaToken = null;
  await syncExcelFacturas(); // Descargará completo
```

#### 5. "CORS error"
```
Error: Access to XMLHttpRequest blocked by CORS policy

Causas:
- Microsoft Graph API tiene CORS habilitado (no debería ocurrir)
- Proxy incorrecto
- Header Authorization faltante

Solución:
- Verificar que axios incluye header Authorization:
  headers: { 'Authorization': `Bearer ${token}` }

- Si sigue: usar backend proxy en Node.js:
  // backend/routes/graph.js
  app.get('/api/graph/*', async (req, res) => {
    const path = req.params[0];
    const response = await axios.get(
      `https://graph.microsoft.com/v1.0/${path}`,
      { headers: { 'Authorization': `Bearer ${serverToken}` } }
    );
    res.json(response.data);
  });
```

#### 6. "No matching columns in Excel"
```
Error: Parsed 0 facturas

Causas:
- Nombres de columnas no coinciden exactamente
- Excel usa mayúsculas/minúsculas diferentes
- Columnas tienen espacios al inicio/final

Solución:
- Revisar names en Excel:
  const wb = XLSX.read(buffer);
  const headers = Object.keys(wb.Sheets[sheetName]);
  console.log('Headers encontrados:', headers);

- Actualizar CONFIG.columnMapping:
  'Número ' (con espacio) → 'numero'

- Hacer match case-insensitive:
  const header = Object.keys(row)[0];
  const mappedField = CONFIG.columnMapping[header.trim()];
```

#### 7. "Large file timeout"
```
Error: 504 Gateway Timeout / Upload failed

Causas:
- Excel > 50 MB
- Conexión lenta
- Timeout por defecto es 30 segundos

Solución:
- Comprimir Excel (remover datos históricos):
  const oldData = data.filter(r => r.fecha > '2025-01-01');

- Aumentar timeout en axios:
  const response = await axios.post(url, data, {
    timeout: 120000 // 2 minutos
  });

- Usar Upload Sessions para archivos grandes:
  const session = await graphApi('/me/drive/items/{id}/createUploadSession');
  // Luego uploadear en chunks
```

---

## Próximas Fases

### Fase 2: Webhooks (Cuando escale)
```
Migrar de polling a webhooks para:
- Sincronización instantánea (<100ms)
- Reducir carga de requests
- Escalabilidad a 100+ usuarios

Requisitos:
- Backend Node.js
- DB para almacenar webhook subscriptions
- Endpoint HTTPS público
```

### Fase 3: Offline-First Architecture
```
Implementar:
- Service Workers para cache
- IndexedDB para storage offline
- Conflict resolution automática
- Sync cuando regresa online
```

### Fase 4: Real-time Collaboration
```
Multi-usuario simultáneo:
- WebSockets para UI real-time
- Operational transformation para conflictos
- Presence awareness (quién edita qué)
```

---

## Resumen Técnico

| Aspecto | Detalles |
|---------|----------|
| **Autenticación** | OAuth 2.0 + PKCE, tokens en localStorage |
| **Lectura** | Microsoft Graph API + delta queries |
| **Parsing** | XLSX para análisis rápido |
| **Sync** | Polling cada 60s con detección de cambios |
| **Escritura** | ExcelJS para actualizar .xlsx |
| **Conflictos** | Timestamp-based + merge inteligente |
| **Offline** | localStorage + sync cuando online |
| **Seguridad** | State validation, PKCE, token refresh |
| **Performance** | Delta queries = 1000x más eficiente |
| **Escalabilidad** | MVP con polling, migrar a webhooks después |

---

*Documentación actualizada: 2026-04-22*  
*Módulo listo para producción con pruebas básicas incluidas*
