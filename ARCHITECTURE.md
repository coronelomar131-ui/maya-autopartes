# Arquitectura de Maya Autopartes v2.3

**Versión:** 2.3.0  
**Fecha:** 2026-04-22  
**Patrón:** Modular Architecture con ES6 Modules

---

## 📐 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        BROWSER (Frontend)                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              index.html (160 líneas)                   │    │
│  │   - DOM Structure                                      │    │
│  │   - Stylesheet link: styles.css                        │    │
│  │   - Module import: main.js                             │    │
│  └────────────────────────────────────────────────────────┘    │
│                           ↓                                      │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              main.js (200 líneas)                      │    │
│  │   - Entry point única                                  │    │
│  │   - Importa todos los módulos                          │    │
│  │   - Expone funciones en window                         │    │
│  │   - Inicializa la aplicación                           │    │
│  └────────────────────────────────────────────────────────┘    │
│         ↙         ↓         ↓         ↘                         │
│        ┌──────────────────────────────┐                        │
│        │ ┌────────────────────────┐  │                        │
│        │ │    core.js             │  │                        │
│        │ ├────────────────────────┤  │                        │
│        │ │ • State Management     │  │                        │
│        │ │ • localStorage Persist │  │                        │
│        │ │ • Optimizations        │  │                        │
│        │ │ • Search/Filter funcs  │  │                        │
│        │ │ • Rendering functions  │  │                        │
│        │ └────────────────────────┘  │                        │
│        │                               │                        │
│        │ ┌────────────────────────┐  │                        │
│        │ │    ui.js               │  │                        │
│        │ ├────────────────────────┤  │                        │
│        │ │ • Form rendering       │  │                        │
│        │ │ • Component rendering  │  │                        │
│        │ │ • Table generation     │  │                        │
│        │ │ • Modal content        │  │                        │
│        │ └────────────────────────┘  │                        │
│        │                               │                        │
│        │ ┌────────────────────────┐  │                        │
│        │ │    api.js              │  │                        │
│        │ ├────────────────────────┤  │                        │
│        │ │ • Supabase Sync        │  │                        │
│        │ │ • Google Drive API     │  │                        │
│        │ │ • MercadoLibre API     │  │                        │
│        │ │ • OneDrive API         │  │                        │
│        │ │ • Compac Export        │  │                        │
│        │ └────────────────────────┘  │                        │
│        │                               │                        │
│        │ ┌────────────────────────┐  │                        │
│        │ │    utils.js            │  │                        │
│        │ ├────────────────────────┤  │                        │
│        │ │ • DOM utilities        │  │                        │
│        │ │ • Event handlers       │  │                        │
│        │ │ • Modal management     │  │                        │
│        │ │ • Responsive helpers   │  │                        │
│        │ └────────────────────────┘  │                        │
│        │                               │                        │
│        │ ┌────────────────────────┐  │                        │
│        │ │    styles.css          │  │                        │
│        │ ├────────────────────────┤  │                        │
│        │ │ • Layout CSS           │  │                        │
│        │ │ • Component styles     │  │                        │
│        │ │ • Theme variables      │  │                        │
│        │ │ • Responsive rules     │  │                        │
│        │ └────────────────────────┘  │                        │
│        └──────────────────────────────┘                        │
│                                                                 │
│  ┌────────────────────────────────────────────────────────┐    │
│  │         localStorage (Persistence Layer)              │    │
│  │  - ma4_v (ventas)                                     │    │
│  │  - ma4_a (almacén)                                    │    │
│  │  - ma4_c (clientes)                                   │    │
│  │  - ma4_u (usuarios)                                   │    │
│  │  - ma4_cfg (configuración)                            │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│              External APIs (Integrations)                        │
├─────────────────────────────────────────────────────────────────┤
│  • Supabase (Real-time DB)                                      │
│  • Google Drive (Backup/Export)                                 │
│  • MercadoLibre (Catalog Sync)                                  │
│  • OneDrive (Sync/Backup)                                       │
│  • Compac (Specialized Export)                                  │
│  • XLSX Library (Excel import/export)                           │
│  • html2pdf Library (PDF generation)                            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Estructura de Archivos

```
maya-autopartes-working/
├── index.html                    (160 líneas)   - Punto de entrada HTML
├── main.js                       (200 líneas)   - Entry point principal
├── core.js                       (600+ líneas)  - Data layer
├── ui.js                         (800+ líneas)  - Rendering layer
├── api.js                        (900+ líneas)  - Integraciones
├── utils.js                      (400+ líneas)  - Utilidades
├── styles.css                    (1,468 líneas) - Estilos globales
│
├── api/                                         - API integrations directory
│   ├── onedrive-sync.js
│   ├── read-onedrive-excel.js
│   └── sync-to-drive.js
│
├── MIGRATION_GUIDE.md                          - Guía de cambios
├── ARCHITECTURE.md                             - Este archivo
├── QUICK_REFERENCE.md                          - Referencia rápida
├── README.md                                   - Documentación general
│
└── logo.jpg                                    - Logo de empresa
```

---

## 🏗️ Módulos Detallados

### 1. **core.js** - Data Layer & State Management

**Responsabilidad Principal:**
Gestión centralizada de estado y persistencia de datos.

**Secciones:**

#### 1.1 State Declarations
```javascript
// Global Data
let ventas = [];      // Array de ventas
let almacen = [];     // Array de productos
let clientes = [];    // Array de clientes
let usuarios = [];    // Array de usuarios
let sesionActual = null;  // Usuario logueado

// Config
let cfg = { ... };    // Configuración de empresa

// UI State
let vPg = 1;          // Página actual (ventas)
let vSC = null;       // Columna de sort
let vSD = 1;          // Dirección de sort (-1 o 1)
let almView = 'cards'; // Vista almacén (cards/table)
let eVId = null;      // ID de venta en edición
```

#### 1.2 Optimization Functions
```javascript
// Debounce para rate-limiting
debounce(fn, delay)

// Cache en memoria
cache = new Map()
getCached(key, fn)

// Memoization
memoize(fn)
```

#### 1.3 Search & Filter Functions
```javascript
findVentaById(id)
findProductoById(id)
findClienteByNombre(nombre)
filterByQuery(arr, q, fields)
filtV()    // Filter ventas
filtA()    // Filter almacén
filtC()    // Filter clientes
```

#### 1.4 Rendering Functions
```javascript
renderV()   // Render tabla ventas
renderA()   // Render almacén
renderC()   // Render clientes
renderF()   // Render facturas
rDash()     // Render dashboard
rCompac()   // Render compac
```

#### 1.5 Persistence
```javascript
sv()        // Save all to localStorage
today()     // Get today's date
```

---

### 2. **ui.js** - Rendering & Components

**Responsabilidad Principal:**
Generar HTML dinámico para componentes y formularios.

**Secciones:**

#### 2.1 Form Rendering
```javascript
renderVForm()     // Formulario de venta
renderAlmForm()   // Formulario de producto
renderCliForm()   // Formulario de cliente
renderCfgForm()   // Formulario de configuración
```

#### 2.2 Modal Content
```javascript
renderUsersModal()        // Lista de usuarios
renderNewUserForm()       // Formulario nuevo usuario
renderConverterUI()       // UI del convertidor Excel
```

#### 2.3 Table Rendering
```javascript
// Generación dinámica de tablas con:
// - Paginación
// - Sorting
// - Filtrado
// - Styled cells
```

#### 2.4 Component Helpers
```javascript
// Formato de números, fechas, etc.
// Colores y estilos condicionales
// Badge generation
// Stats rendering
```

---

### 3. **api.js** - External Integrations

**Responsabilidad Principal:**
Comunicación con APIs externas y sincronización de datos.

**Integraciones:**

#### 3.1 Supabase (Real-time DB)
```javascript
// Setup real-time listeners
setupSupabaseRealtimeListeners()

// Sync functions
syncVentasToSupabase()
syncAlmacenToSupabase()
syncClientesToSupabase()
syncDataFromSupabase()
```

#### 3.2 Google Drive
```javascript
setupGoogleDriveSync()
exportToGoogleDrive()
importFromGoogleDrive()
```

#### 3.3 MercadoLibre
```javascript
setupMercadoLibreSync()
syncToMercadoLibre()
syncFromMercadoLibre()
```

#### 3.4 OneDrive
```javascript
setupOneDriveSync()
exportToOneDrive()
importFromOneDrive()
```

#### 3.5 Compac (Specialized Export)
```javascript
exportCompac()
generateCompacFormat()
```

---

### 4. **utils.js** - Utilities & Helpers

**Responsabilidad Principal:**
Funciones auxiliares, eventos globales y helpers de DOM.

**Secciones:**

#### 4.1 UI Utilities
```javascript
toggleSidebar()
openSidebar()
closeSidebar()
openV(id)      // Open overlay
closeOv(id)    // Close overlay
clsOv(id, event) // Close on click outside
```

#### 4.2 Event Setup
```javascript
setupKeyboardShortcuts()  // ESC, etc.
initializeClock()         // Time display
setupResponsiveMenu()     // Responsive breakpoints
```

#### 4.3 DOM Helpers
```javascript
toast(message)           // Notification
formatDate(date)
formatCurrency(num)
sanitizeInput(string)
```

---

### 5. **styles.css** - Global Styles

**Responsabilidad Principal:**
Estilos visuales y responsive design.

**Secciones:**

#### 5.1 CSS Variables (Theme)
```css
:root {
  --navy: #1a3a52;
  --teal: #ff8c00;
  --bg: #0f1419;
  --txt: #b8c0d0;
  /* ... más variables */
}
```

#### 5.2 Layout
```css
/* Sidebar layout */
.sb { }
.main { }

/* Grid system */
.row2 { grid-template-columns: 1fr 1fr; }
.row3 { grid-template-columns: 1fr 1fr 1fr; }
```

#### 5.3 Components
```css
.btn { }          /* Buttons */
.panel { }        /* Cards/Panels */
.kpi { }          /* KPI Cards */
.table { }        /* Tables */
.modal { }        /* Modals */
.overlay { }      /* Overlays */
```

#### 5.4 Responsive
```css
@media (max-width: 900px) {
  /* Mobile adjustments */
  .menu-btn { display: flex; }
  .sb { transform: translateX(-100%); }
}
```

---

## 🔄 Data Flow

### Ciclo de Escritura (Write)

```
User Action (onclick, form submit)
    ↓
Handler function (saveVenta, saveAlmacen, etc.)
    ↓
Validate input
    ↓
Update state (ventas[], almacen[], etc.)
    ↓
sv() - Persist to localStorage
    ↓
syncToSupabase() - Sync to cloud (async)
    ↓
Render updated UI
    ↓
toast() - User notification
```

### Ciclo de Lectura (Read)

```
Page load / goPage()
    ↓
filtV() / filtA() / filtC() - Get filtered data
    ↓
renderV() / renderA() / renderC() - Generate HTML
    ↓
Insert into DOM
    ↓
badges() - Update counters
```

### Ciclo de Sincronización (Sync)

```
App init / setupSupabaseRealtimeListeners()
    ↓
Subscribe to real-time channels
    ↓
Database change detected
    ↓
Update local state
    ↓
Re-render affected components
    ↓
User sees changes instantly
```

---

## 🔐 Security Considerations

### 1. Input Validation
- Todo input del usuario se valida antes de persistir
- `filterByQuery()` sanitiza strings de búsqueda
- Validación de tipos en `core.js`

### 2. Data Persistence
- localStorage es local al usuario
- No almacenar datos sensitivos sin encripción
- Implementar auth en Supabase

### 3. API Keys
- Guardar en variables de entorno
- Nunca commitear keys en código
- Usar `.env` local (ignorado en git)

### 4. XSS Prevention
- innerHTML solo con datos internos generados
- Sanitización de inputs del usuario
- Content Security Policy en headers

---

## 🚀 Performance Optimizations

### 1. Memory
```javascript
// Debounce rate-limiting
const debouncedSearch = debounce(search, 300);

// Memoization para búsquedas
const findClienteByNombre = memoize(nombre => ...);

// Cache invalidation
clearCache();
```

### 2. DOM
```javascript
// Batch updates
document.querySelectorAll('.page').forEach(p => ...);

// Use className for bulk style changes
el.classList.add('on');
```

### 3. Network
```javascript
// Async operations non-blocking
setupGoogleDriveSync().catch(e => console.warn(e));

// Real-time push updates instead of polling
setupSupabaseRealtimeListeners();
```

---

## 🧪 Testing Strategy

### Unit Tests (por módulo)

**core.js:**
- State management
- Filter functions
- Format functions

**ui.js:**
- Render functions output
- Form generation correctness

**api.js:**
- API call handling
- Error responses

**utils.js:**
- DOM manipulation
- Event handling

### Integration Tests

- Complete write cycle: action → storage → render
- Multi-module interactions
- External API syncing

### E2E Tests

- Full user workflows
- Cross-browser compatibility
- Responsive design on mobile

---

## 📈 Escalability Path

### Phase 1 (Current - v2.3)
✅ Modular ES6 architecture
✅ Local state management
✅ External API integrations

### Phase 2 (Recommended - v3.0)
- [ ] TypeScript migration
- [ ] Vite build tool
- [ ] Unit/Integration tests
- [ ] Component library

### Phase 3 (Advanced - v3.5)
- [ ] Backend API (Node.js/Express)
- [ ] Database (PostgreSQL)
- [ ] Multi-user support
- [ ] Advanced auth (JWT)

### Phase 4 (Enterprise - v4.0)
- [ ] Microservices architecture
- [ ] Docker deployment
- [ ] CI/CD pipeline
- [ ] Advanced monitoring

---

## 🔍 Module Dependencies

```
main.js
├── core.js
├── ui.js
│   └── core.js
├── api.js
│   ├── core.js
│   └── (external: XLSX, html2pdf, Supabase)
└── utils.js

Imports by module:
- core.js: localStorage, Date
- ui.js: core.js
- api.js: core.js, external APIs
- utils.js: DOM API only
- styles.css: independent
```

**No hay importaciones circulares** ✅

---

## 🎯 Best Practices Implemented

### 1. Single Responsibility
- Cada módulo tiene una responsabilidad clara
- core.js → data, ui.js → render, api.js → integraciones

### 2. DRY (Don't Repeat Yourself)
- Funciones de utilidad centralizadas
- Reutilización de componentes

### 3. ES6 Standards
- Import/export modules
- Arrow functions
- Template literals
- Destructuring

### 4. Code Organization
- Estructura clara de archivos
- Funciones agrupadas por responsabilidad
- Nombres descriptivos

### 5. Documentation
- Comments claros
- Docstrings para funciones
- Architectural documentation

---

## 🔗 Related Documents

- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Cambios detallados de v2.2 a v2.3
- [QUICK_REFERENCE.md](./QUICK_REFERENCE.md) - Referencia rápida de funciones
- [README.md](./README.md) - Documentación general del proyecto

---

**Versión:** 2.3.0  
**Última actualización:** 2026-04-22  
**Status:** Completado ✅
