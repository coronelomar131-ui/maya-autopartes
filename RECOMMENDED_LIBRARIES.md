# 📦 Librerías Recomendadas - OneDrive Excel Sync

**Última actualización**: 2026-04-22  
**Estado**: Investigación + Recomendaciones

---

## Tabla Resumen

### Core (Esenciales)

| Librería | Versión | Tamaño | Propósito | Rating | Install |
|----------|---------|--------|----------|--------|---------|
| **@microsoft/msal-browser** | ^3.19.0 | 150 KB | OAuth 2.0 Microsoft | ⭐⭐⭐⭐⭐ | `npm i @microsoft/msal-browser` |
| **exceljs** | ^4.4.0 | 500 KB | Leer/escribir Excel | ⭐⭐⭐⭐⭐ | `npm i exceljs` |
| **xlsx** | ^0.18.5 | 450 KB | Parse Excel rápido | ⭐⭐⭐⭐⭐ | `npm i xlsx` |
| **axios** | ^1.6.0+ | 50 KB | HTTP client | ⭐⭐⭐⭐⭐ | `npm i axios` |
| **date-fns** | ^2.30.0+ | 30 KB | Date utilities | ⭐⭐⭐⭐ | `npm i date-fns` |

### Seguridad (Recomendado)

| Librería | Versión | Propósito | Rating | Install |
|----------|---------|----------|--------|---------|
| **tweetnacl-js** | ^1.1.2 | Encripción de credenciales | ⭐⭐⭐⭐ | `npm i tweetnacl-js` |
| **base64-js** | ^1.5.1 | Base64 encoding | ⭐⭐⭐⭐ | `npm i base64-js` |
| **crypto-js** | ^4.2.0 | Encripción simétrica | ⭐⭐⭐ | `npm i crypto-js` |

### Monitoreo & Logging

| Librería | Versión | Propósito | Rating | Install |
|----------|---------|----------|--------|---------|
| **sentry/browser** | ^7.0.0+ | Error tracking | ⭐⭐⭐⭐⭐ | `npm i @sentry/browser` |
| **pino** | ^8.14.0+ | Logging | ⭐⭐⭐⭐ | `npm i pino` |
| **winston** | ^3.11.0+ | Logging con transports | ⭐⭐⭐⭐ | `npm i winston` |

### State Management (Si usas React)

| Librería | Versión | Propósito | Rating | Install |
|----------|---------|----------|--------|---------|
| **zustand** | ^4.4.0+ | Estado global ligero | ⭐⭐⭐⭐⭐ | `npm i zustand` |
| **react-query** | ^5.0.0+ | Cache + sync datos | ⭐⭐⭐⭐⭐ | `npm i @tanstack/react-query` |
| **recoil** | ^0.7.7+ | Estado atómico | ⭐⭐⭐⭐ | `npm i recoil` |
| **jotai** | ^2.6.0+ | Primitivos atómicos | ⭐⭐⭐⭐ | `npm i jotai` |

### Testing

| Librería | Versión | Propósito | Rating | Install |
|----------|---------|----------|--------|---------|
| **vitest** | ^0.34.0+ | Test runner (Vite) | ⭐⭐⭐⭐⭐ | `npm i -D vitest` |
| **jest** | ^29.7.0+ | Test runner estándar | ⭐⭐⭐⭐⭐ | `npm i -D jest` |
| **@testing-library/react** | ^14.0.0+ | Testing componentes | ⭐⭐⭐⭐⭐ | `npm i -D @testing-library/react` |

---

## Análisis Detallado

### 1️⃣ OAuth 2.0 & Autenticación

#### @microsoft/msal-browser ^3.19.0 ✅ RECOMENDADO

**¿Por qué MSAL?**
- Oficial de Microsoft
- Maneja automáticamente token refresh
- Soporta PKCE natively
- Manejo de errores robusto

**Alternativas comparadas:**

| Librería | Ventajas | Desventajas | Tamaño |
|----------|----------|-------------|--------|
| **@microsoft/msal-browser** | Oficial, completo, PKCE | Grande (~150KB) | 150 KB |
| **simple-oauth2** | Simple, ligero | No es oficial, menos features | 30 KB |
| **oidc-client** | Estándar OpenID | Puede ser overhead para solo OAuth | 100 KB |
| **passport.js** | Muy flexible | Requiere backend | 200 KB |

**Implementación con onedrive-sync.js:**
```javascript
// Ya implementado en onedrive-sync.js
// Usa OAuth manual sin MSAL library (más ligero)
// ✅ MSAL es opcional si quieres abstracción

// Opción A: Sin MSAL (actual)
await initOneDriveAuth(); // ~200 líneas de código propio

// Opción B: Con MSAL
import * as msal from '@microsoft/msal-browser';
const msalInstance = new msal.PublicClientApplication(config);
const response = await msalInstance.loginPopup(loginRequest);
```

**Recommendation**: 
- **MVP**: No usar MSAL, código manual es suficiente (onedrive-sync.js ya lo hace)
- **Producción**: Considerar MSAL para manejo automático de tokens

---

### 2️⃣ Lectura & Manipulación de Excel

#### xlsx ^0.18.5 (SheetJS) ✅ MEJOR PARA LECTURA

**¿Por qué xlsx?**
- Más rápido parsing (~2x que exceljs)
- Soporte para formatos múltiples (XLS, XLSX, CSV, etc)
- Menos dependencias
- Ampliamente usado (90k+ stars en GitHub)

**Características:**
```javascript
// Leer Excel
const workbook = XLSX.read(buffer, { type: 'buffer' });
const worksheet = workbook.Sheets['Facturas'];
const data = XLSX.utils.sheet_to_json(worksheet);

// Escribir Excel
const newSheet = XLSX.utils.json_to_sheet(data);
XLSX.writeFile(newSheet, 'output.xlsx');

// Streaming (archivos grandes)
const reader = new FileReader();
reader.onload = (e) => {
  const wb = XLSX.read(e.target.result);
};
```

**Ventajas:**
- ✅ Pequeño y rápido
- ✅ Parsing robusto
- ✅ Soporte para múltiples formatos
- ✅ Amplia documentación

**Desventajas:**
- ❌ Formatos no preserva (estilos, colores se pierden)
- ❌ Fórmulas se convierten a valores
- ❌ Versión gratuita tiene límites

**Tamaño:**
```
xlsx full: 450 KB
xlsx mini: 180 KB (suficiente para este caso)

Instalación:
npm install xlsx

// O importar de CDN
<script src="https://cdn.jsdelivr.net/npm/xlsx@latest/dist/xlsx.full.min.js"></script>
```

---

#### exceljs ^4.4.0 ✅ MEJOR PARA ESCRITURA

**¿Por qué exceljs?**
- Manipulación granular de Excel (estilos, formato)
- Crear Excel desde cero
- Mejor para escribir datos complejos

**Comparativa xlsx vs exceljs:**

| Operación | xlsx | exceljs |
|-----------|------|---------|
| Leer Excel rápido | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Escribir simple | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ |
| Preservar estilos | ❌ | ✅ |
| Formulas | ❌ (valores) | ✅ |
| Charts | ❌ | ✅ |
| Performance | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |
| Tamaño | 450 KB | 500 KB |

**Recomendación:**
```javascript
// Mejor: Hybrid approach
// 1. Leer con XLSX (rápido)
const buffer = downloadedFile;
const workbook = XLSX.read(buffer);
const data = XLSX.utils.sheet_to_json(worksheet);

// 2. Escribir con exceljs (control fino)
const ExcelJS = require('exceljs');
const wb = new ExcelJS.Workbook();
const ws = wb.addWorksheet('Facturas');
ws.columns = [
  { header: 'Número', key: 'numero' },
  { header: 'Cliente', key: 'cliente' },
  // ...
];
data.forEach(row => ws.addRow(row));
await wb.xlsx.writeFile('output.xlsx');
```

**Tamaño:**
```
exceljs: 500 KB
exceljs (minified): 180 KB
```

---

### 3️⃣ HTTP Client

#### axios ^1.6.0+ ✅ RECOMENDADO

**¿Por qué axios?**
- Manejo de errores robusto
- Interceptors (para refresh tokens)
- Cancellable requests
- Timeout management

**Alternativas:**

| Librería | Ventajas | Desventajas |
|----------|----------|-------------|
| **axios** | Completo, versátil | 50 KB |
| **fetch API** | Nativo (sin librería) | Manejo de errores más verboso |
| **got** | Ligero, rápido | Más para Node.js |
| **superagent** | Simple API | Menos usado |

**Implementación con interceptors:**
```javascript
// Refresh automático de tokens
axios.interceptors.response.use(
  response => response,
  async error => {
    if (error.response?.status === 401) {
      // Token expirado
      await refreshAccessToken();
      // Reintentar request original
      return axios(error.config);
    }
    return Promise.reject(error);
  }
);
```

**Instalación:**
```bash
npm install axios@^1.6.0
```

---

### 4️⃣ Utilidades de Fecha

#### date-fns ^2.30.0+ ✅ RECOMENDADO

**¿Por qué date-fns?**
- Funcional, no mutante (immutable)
- Más pequeño que moment.js
- Mejor tree-shaking (solo incluye lo que usas)
- Más moderno

**Alternativas:**

| Librería | Ventajas | Desventajas | Tamaño |
|----------|----------|-------------|--------|
| **date-fns** | Funcional, modern | Curva aprendizaje | 30 KB |
| **dayjs** | Pequeño, lightweight | Menos features | 2 KB |
| **moment.js** | Muy usado, completo | Pesado, mutable | 70 KB |
| **luxon** | Powerful, time zones | Grande | 60 KB |

**Uso en onedrive-sync.js:**
```javascript
import { format, parseISO, isAfter } from 'date-fns';

// Formatear fecha
const formatted = format(new Date(), 'yyyy-MM-dd');

// Parsear
const date = parseISO('2026-04-22');

// Comparar
if (isAfter(date1, date2)) { /* */ }
```

**Instalación:**
```bash
npm install date-fns@^2.30.0
```

---

### 5️⃣ Seguridad & Encripción

#### tweetnacl-js ^1.1.2 ✅ PARA CREDENCIALES

**Cuándo usar:**
- Encriptar access_token antes de guardar en localStorage
- Encriptar credenciales del usuario
- Generar keys de encripción

**Alternativas:**

| Librería | Propósito | Ventajas | Tamaño |
|----------|----------|----------|--------|
| **tweetnacl-js** | Encripción asimétrica | Seguro, auditado | 12 KB |
| **crypto-js** | Encripción simétrica | Simple, popular | 80 KB |
| **libsodium.js** | Criptografía moderna | Completo, seguro | 100 KB |

**Implementación:**
```javascript
import nacl from 'tweetnacl-js';
import { encode, decode } from 'js-base64';

// Generar keypair
const keypair = nacl.box.keyPair();

// Encriptar token
const message = encode(accessToken);
const encrypted = nacl.box(
  message,
  nonce,
  keypair.publicKey,
  keypair.secretKey
);

// Almacenar
localStorage.setItem('token_encrypted', encode(encrypted));

// Desencriptar
const decrypted = nacl.box.open(encrypted, nonce, pk, sk);
```

**Instalación:**
```bash
npm install tweetnacl-js base64-js
```

---

### 6️⃣ Monitoreo & Error Tracking

#### @sentry/browser ^7.0.0+ ✅ RECOMENDADO

**Por qué:**
- Captura errores automáticamente
- Breadcrumbs (historial de acciones)
- Source maps
- Alertas en tiempo real

**Uso:**
```javascript
import * as Sentry from "@sentry/browser";

Sentry.init({
  dsn: "https://key@sentry.io/project",
  environment: "production",
  tracesSampleRate: 1.0,
});

// Capturar error
try {
  await syncExcelFacturas();
} catch (error) {
  Sentry.captureException(error);
}
```

**Alternativas:**
- **Rollbar** - Similar, enterprise
- **LogRocket** - Incluye replay de sesión
- **Datadog** - Enterprise monitoring

---

### 7️⃣ State Management (React)

#### zustand ^4.4.0+ ✅ RECOMENDADO PARA MVP

**¿Por qué zustand?**
- Minimal boilerplate
- No necesita provider
- TypeScript-friendly
- Perfecto para sync state

```javascript
import { create } from 'zustand';

const useSyncStore = create((set) => ({
  facturas: [],
  lastSync: null,
  isSyncing: false,

  setFacturas: (facturas) => set({ facturas }),
  setLastSync: (time) => set({ lastSync: time }),
  setSyncing: (syncing) => set({ isSyncing: syncing }),
}));

// Usar en componente
const { facturas, isSyncing } = useSyncStore();
```

**Alternativas:**

| Librería | Ventajas | Desventajas |
|----------|----------|-------------|
| **zustand** | Minimal, simple | Menos ecosystem |
| **react-query** | Caching automático | Más pesado |
| **recoil** | Atoms, performance | Más complejo |
| **Redux** | Muy establecido | Boilerplate |

---

### 8️⃣ Testing

#### vitest ^0.34.0+ ✅ RECOMENDADO (Vite)

**Instalación:**
```bash
npm install -D vitest @vitest/ui happy-dom
```

**Configuración vitest.config.ts:**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    globals: true,
    coverage: {
      provider: 'v8',
    },
  },
});
```

**Tests para onedrive-sync.js:**
```bash
npm test
```

---

## 🎯 Recomendación de Stack

### MVP (Minimal Viable Product) - $5,000 MXN Actual

```json
{
  "name": "maya-autopartes-sync",
  "version": "1.0.0",
  "dependencies": {
    "@microsoft/msal-browser": "^3.19.0",
    "exceljs": "^4.4.0",
    "xlsx": "^0.18.5",
    "axios": "^1.6.0",
    "date-fns": "^2.30.0"
  },
  "devDependencies": {
    "vitest": "^0.34.0",
    "@vitest/ui": "^0.34.0",
    "happy-dom": "^12.0.0"
  }
}
```

**Tamaño total:** ~1.1 MB  
**Instalación:** `npm install`  
**Tiempo setup:** ~10 minutos  

### Producción (Fase 2)

```json
{
  "dependencies": {
    "@microsoft/msal-browser": "^3.19.0",
    "exceljs": "^4.4.0",
    "xlsx": "^0.18.5",
    "axios": "^1.6.0",
    "date-fns": "^2.30.0",
    "zustand": "^4.4.0",
    "@sentry/browser": "^7.0.0",
    "tweetnacl-js": "^1.1.2"
  },
  "devDependencies": {
    "vitest": "^0.34.0",
    "@vitest/ui": "^0.34.0",
    "@testing-library/react": "^14.0.0",
    "typescript": "^5.0.0"
  }
}
```

**Tamaño total:** ~2.5 MB  
**Features adicionales:** Monitoreo, seguridad, testing  

---

## 📝 Checklist de Instalación

### Paso 1: Core Libraries
```bash
npm install axios@^1.6.0 exceljs@^4.4.0 xlsx@^0.18.5 date-fns@^2.30.0
```

### Paso 2: Seguridad (Opcional para MVP)
```bash
npm install tweetnacl-js@^1.1.2 base64-js@^1.5.1
```

### Paso 3: Monitoreo (Opcional para MVP)
```bash
npm install @sentry/browser@^7.0.0
```

### Paso 4: Dev Tools
```bash
npm install -D vitest@^0.34.0 @vitest/ui@^0.34.0 happy-dom@^12.0.0
```

### Paso 5: Verificar
```bash
npm list
npm audit
```

---

## 🔗 Enlaces de Referencia

### Documentación Oficial

- [Microsoft Graph API Docs](https://learn.microsoft.com/en-us/graph/)
- [MSAL Browser](https://github.com/AzureAD/microsoft-authentication-library-for-js)
- [ExcelJS](https://github.com/exceljs/exceljs)
- [SheetJS (XLSX)](https://sheetjs.com/)
- [date-fns Docs](https://date-fns.org/)

### Comparativas & Benchmarks

- [OAuth 2.0 Libraries Benchmark](https://auth0.com/docs/get-started/authentication-and-authorization-flow)
- [Excel Libraries Performance](https://github.com/SheetJS/sheetjs/wiki/Comparing-Spreadsheet-Libraries)
- [JavaScript State Management 2026](https://statemanagement.dev/)

---

## ⚡ Performance Tips

### Bundle Size Optimization

```javascript
// ❌ Evitar
import XLSX from 'xlsx'; // 450 KB

// ✅ Preferir
import XLSX from 'xlsx/dist/xlsx.mini.js'; // 180 KB
```

### Lazy Loading

```javascript
// Cargar sync module solo cuando se necesita
const oneDriveSync = await import('./api/onedrive-sync.js');
```

### Tree Shaking

```javascript
// ✅ date-fns permite tree-shaking
import { format } from 'date-fns'; // Solo incluye format()

// ❌ moment.js no permite tree-shaking
import moment from 'moment'; // Todo se incluye
```

---

*Documento actualizado: 2026-04-22*  
*Recomendaciones basadas en análisis de rendimiento y adopción comunitaria*
