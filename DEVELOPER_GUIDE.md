# 🔧 DEVELOPER GUIDE - Maya Autopartes

**Versión**: 3.0.0  
**Fecha**: 2026-04-22  
**Audiencia**: Desarrolladores JavaScript/Full-Stack  

---

## 📖 TABLA DE CONTENIDOS

1. [Introducción](#introducción)
2. [Arquitectura de Código](#arquitectura-de-código)
3. [Módulos JavaScript](#módulos-javascript)
4. [Cómo Extender Funcionalidad](#cómo-extender-funcionalidad)
5. [Mejores Prácticas](#mejores-prácticas)
6. [Convenciones de Código](#convenciones-de-código)
7. [Setup de Desarrollo](#setup-de-desarrollo)
8. [Testing](#testing)
9. [Debugging](#debugging)
10. [API de Integraciones](#api-de-integraciones)

---

## 🎯 INTRODUCCIÓN

### Stack Tecnológico
```
Frontend:
├── HTML5 (Estructura semántica)
├── CSS3 (Responsive, Grid, Flexbox)
├── Vanilla JavaScript (ES6 Modules)
└── localStorage (Persistencia local)

Integraciones (Opcionales):
├── Supabase (Base de datos real-time)
├── Google Drive API (Backup)
├── Excel Export (SheetJS library)
└── Compac API (Contabilidad)

DevTools:
├── Git/GitHub (Control versiones)
├── VS Code (Editor)
├── Chrome DevTools (Debugging)
└── Vercel (Deploy)
```

### Estructura del Proyecto
```
maya-autopartes-working/
├── index.html              (Aplicación principal)
├── styles.css              (Estilos (1,468 líneas))
├── core.js                 (Data layer ~370 líneas)
├── ui.js                   (Render layer ~600 líneas)
├── api.js                  (Integration layer ~210 líneas)
├── utils.js                (Utilities ~320 líneas)
├── README.md               (Overview)
├── PROJECT_SUMMARY.md      (Resumen ejecutivo)
├── USER_GUIDE.md           (Guía de usuario)
├── DEVELOPER_GUIDE.md      (Este archivo)
├── DEPLOYMENT_GUIDE.md     (Deploy a producción)
└── DOCUMENTACION_INDEX.md  (Índice de docs)
```

### Características Principales
- ✅ 100% client-side (sin backend)
- ✅ ES6 modules
- ✅ Persistencia en localStorage
- ✅ Opcional: Sync en tiempo real con Supabase
- ✅ Completamente modular y extensible
- ✅ Sin dependencias npm (vanilla JS)

---

## 🏗️ ARQUITECTURA DE CÓDIGO

### Diagrama de Flujo

```
User Input (DOM)
    ↓
Event Listener (ui.js)
    ↓
Validación (utils.js)
    ↓
Modificar Estado (core.js)
    ↓
Guardar (localStorage)
    ↓
Supabase Sync (api.js) [Opcional]
    ↓
Re-render (ui.js)
    ↓
DOM Update
```

### Separación de Responsabilidades

| Módulo | Responsabilidad | Líneas | Exports |
|--------|-----------------|--------|---------|
| **core.js** | Estado global, optimizaciones, persistencia | 370 | 25+ |
| **ui.js** | Renderización, event handlers, modales | 600 | 20+ |
| **api.js** | Integraciones externas (Supabase, Export) | 210 | 15+ |
| **utils.js** | Funciones de utilidad, formateo, validación | 320 | 20+ |

### Ciclo de Datos

```
1. User Input
   ↓
2. Event Handler (en ui.js)
   → Validar con utils.js
   → Actualizar core.js
   → Guardar con sv()
   → Supabase sync (si habilitado)
   ↓
3. Re-render (renderV, renderA, etc)
   ↓
4. Display Updated (Usuario ve cambios)
```

---

## 📦 MÓDULOS JAVASCRIPT

### 1. CORE.JS - Data & Optimization Layer

**Responsabilidades:**
- Gestionar estado global (ventas, almacén, clientes)
- Persistencia en localStorage
- Optimizaciones (debounce, cache, memoize)
- Búsqueda optimizada

**Estructura:**
```javascript
// ═══════════════════════════════════════════════
// 1. STATE MANAGEMENT
// ═══════════════════════════════════════════════

let ventas = [];        // Array de ventas
let almacen = [];       // Array de productos
let clientes = [];      // Array de clientes
let usuarios = null;    // Data de usuarios
let sesionActual = null; // Usuario logueado

// ═══════════════════════════════════════════════
// 2. OPTIMIZATIONS
// ═══════════════════════════════════════════════

// Debounce: Retrasar ejecución
const debounce = (fn, delay = 300) => { ... }

// Cache: Almacenar resultados
const cache = new Map();
const getCached = (key, fn) => { ... }

// Memoization: Para funciones puras
const memoize = (fn) => { ... }

// ═══════════════════════════════════════════════
// 3. OPTIMIZED SEARCH
// ═══════════════════════════════════════════════

const findClienteByNombre = memoize((nombre) => 
  clientes.find(c => c.nombre === nombre)
);

const findVentaById = (id) => 
  ventas.find(v => v.id === id);

const filterByQuery = (arr, q, fields) => { ... }

// ═══════════════════════════════════════════════
// 4. PERSISTENCE
// ═══════════════════════════════════════════════

function sv() {  // Save function
  localStorage.setItem('ma4_v', JSON.stringify(ventas));
  localStorage.setItem('ma4_a', JSON.stringify(almacen));
  localStorage.setItem('ma4_c', JSON.stringify(clientes));
  localStorage.setItem('ma4_u', JSON.stringify(usuarios));
  clearCache();
}

// ═══════════════════════════════════════════════
// 5. UTILITIES
// ═══════════════════════════════════════════════

const fmt = (num) => new Intl.NumberFormat(...).format(num);
const today = () => new Date().toISOString().split('T')[0];
const toast = (msg) => { ... };  // Notifications

// ═══════════════════════════════════════════════
// 6. EXPORTS
// ═══════════════════════════════════════════════

export { ventas, almacen, clientes, usuarios, ... };
```

**Funciones Principales:**
```javascript
// Estado
ventas, almacen, clientes, usuarios, sesionActual

// Optimización
debounce(fn, delay)     // Retrasar ejecución
cache                   // Map para caching
getCached(key, fn)      // Obtener del cache
clearCache()            // Limpiar cache
memoize(fn)            // Memoization

// Búsqueda
findClienteByNombre(nombre)
findVentaById(id)
findProductoById(id)
filterByQuery(arr, q, fields)
filtV(q)               // Filtrar ventas
filtA(q)               // Filtrar almacén

// Persistencia
sv()                   // Guardar a localStorage
saveCfg()              // Guardar configuración

// Utilidades
fmt(numero)            // Formatear moneda
today()                // Fecha actual
toast(mensaje)         // Notificación
closeOv()              // Cerrar overlay
dl(data, filename)     // Descargar archivo
```

**Ejemplo de Uso:**
```javascript
import { ventas, almacen, sv, debounce } from './core.js';

// Agregar venta
ventas.push({
  id: Date.now(),
  cliente: 'Juan',
  total: 1000,
  fecha: today()
});

// Guardar
sv();  // Persiste a localStorage

// Búsqueda optimizada
const cliente = findClienteByNombre('Juan');

// Debounce en búsqueda
const handleSearch = debounce((query) => {
  const results = filterByQuery(almacen, query, ['nombre', 'codigo']);
}, 300);
```

---

### 2. UI.JS - Render & Event Layer

**Responsabilidades:**
- Renderizar vistas (ventas, almacén, clientes, facturas)
- Manejar eventos de usuario
- Gestionar modales
- Actualizar DOM dinámicamente

**Estructura:**
```javascript
// ═══════════════════════════════════════════════
// 1. RENDER FUNCTIONS (Main)
// ═══════════════════════════════════════════════

function renderV() { /* Renderizar tabla ventas */ }
function renderA() { /* Renderizar almacén */ }
function renderC() { /* Renderizar clientes */ }
function renderF() { /* Renderizar facturas */ }

// Versiones debounced (para optimización)
const renderVDebounced = debounce(renderV, 300);
const renderADebounced = debounce(renderA, 300);
const renderCDebounced = debounce(renderC, 300);
const renderFDebounced = debounce(renderF, 300);

// ═══════════════════════════════════════════════
// 2. MODAL HANDLERS
// ═══════════════════════════════════════════════

function openVentaModal() { /* Abrir modal venta */ }
function openAlmModal() { /* Abrir modal almacén */ }
function openClienteModal() { /* Abrir modal cliente */ }

// ═══════════════════════════════════════════════
// 3. EVENT HANDLERS
// ═══════════════════════════════════════════════

// Ventas
function autoCl(input) { /* Autocompletar cliente */ }
function cUtil(inputEl) { /* Custom utils */ }
function saveVenta() { /* Guardar venta */ }
function editV(id) { /* Editar venta */ }
function delV(id) { /* Eliminar venta */ }

// Almacén
function setView(type) { /* Cambiar vista */ }
function saveAlm() { /* Guardar producto */ }
function editA(id) { /* Editar producto */ }
function delA(id) { /* Eliminar producto */ }

// Clientes
function saveCliente() { /* Guardar cliente */ }
function editC(id) { /* Editar cliente */ }
function delC(id) { /* Eliminar cliente */ }

// Facturas
function viewFactura(id) { /* Ver factura */ }
function printFactura(id) { /* Imprimir */ }
function deleteNota(id) { /* Eliminar */ }

// ═══════════════════════════════════════════════
// 4. UI UTILITIES
// ═══════════════════════════════════════════════

function badges() { /* Actualizar estadísticas */ }
function setView(type) { /* Grid o Tabla */ }

// ═══════════════════════════════════════════════
// 5. EXPORTS
// ═══════════════════════════════════════════════

export { 
  renderV, renderA, renderC, renderF,
  renderVDebounced, renderADebounced, renderCDebounced, renderFDebounced,
  openVentaModal, openAlmModal, openClienteModal,
  saveVenta, editV, delV,
  saveAlm, editA, delA,
  saveCliente, editC, delC,
  viewFactura, printFactura, deleteNota,
  badges, setView, autoCl, cUtil
};
```

**Ejemplo de Render Function:**
```javascript
function renderV() {
  const container = document.getElementById('ventas-container');
  const html = ventas.map((v, i) => `
    <tr>
      <td>${v.id}</td>
      <td>${v.cliente}</td>
      <td>${v.productos.length}</td>
      <td>$${fmt(v.total)}</td>
      <td>${v.fecha}</td>
      <td>
        <button onclick="editV(${v.id})">✏️</button>
        <button onclick="delV(${v.id})">🗑️</button>
      </td>
    </tr>
  `).join('');
  container.innerHTML = html;
}
```

**Ejemplo de Event Handler:**
```javascript
function saveVenta() {
  const cliente = document.getElementById('venta-cliente').value;
  const productos = [...]; // obtener productos
  
  // Validar
  if (!cliente) return toast('Cliente requerido');
  
  // Crear
  const venta = {
    id: Date.now(),
    cliente,
    productos,
    total: calcTotal(),
    fecha: today()
  };
  
  // Guardar
  ventas.push(venta);
  sv();
  
  // Re-render
  renderVDebounced();
  toast('Venta guardada');
}
```

---

### 3. API.JS - Integration Layer

**Responsabilidades:**
- Integración Supabase (sync, listeners)
- Exportación de datos (Excel, CSV, JSON, Compac)
- Importación de datos
- APIs externas

**Estructura:**
```javascript
// ═══════════════════════════════════════════════
// 1. SUPABASE INTEGRATION
// ═══════════════════════════════════════════════

async function initSupabaseSimple() { /* Setup */ }

async function syncVentasToSupabase() { /* Sync ventas */ }
async function loadVentasFromSupabase() { /* Load */ }
function setupVentasListener() { /* Real-time */ }

async function syncAlmacenToSupabase() { /* Sync almacén */ }
async function loadAlmacenFromSupabase() { /* Load */ }
function setupAlmacenListener() { /* Real-time */ }

async function syncClientesToSupabase() { /* Sync clientes */ }
async function loadClientesFromSupabase() { /* Load */ }
function setupClientesListener() { /* Real-time */ }

// ═══════════════════════════════════════════════
// 2. EXPORT FUNCTIONS
// ═══════════════════════════════════════════════

function buildCompac() { /* Generar Compac TSV */ }
function exportCompac() { /* Descargar Compac */ }
function exportCSV() { /* Descargar CSV */ }
function exportJSON() { /* Descargar JSON */ }
function exportarFacturasExcel() { /* Descargar Excel */ }

// ═══════════════════════════════════════════════
// 3. IMPORT FUNCTIONS
// ═══════════════════════════════════════════════

function importarExcel() { /* Importar productos */ }

// ═══════════════════════════════════════════════
// 4. EXTERNAL APIs
// ═══════════════════════════════════════════════

async function testCompacConnection() { /* Test */ }
async function syncVentasToCompac() { /* Sync */ }
function syncFacturaToGoogleDrive() { /* Drive */ }

// ═══════════════════════════════════════════════
// 5. EXPORTS
// ═══════════════════════════════════════════════

export {
  initSupabaseSimple,
  syncVentasToSupabase, loadVentasFromSupabase, setupVentasListener,
  syncAlmacenToSupabase, loadAlmacenFromSupabase, setupAlmacenListener,
  syncClientesToSupabase, loadClientesFromSupabase, setupClientesListener,
  buildCompac, rCompac, exportCompac, exportCSV, exportJSON,
  exportarFacturasExcel, importarExcel,
  testCompacConnection, syncVentasToCompac,
  syncFacturaToGoogleDrive
};
```

**Ejemplo Supabase:**
```javascript
// Setup
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js';

const supabase = createClient(URL, KEY);

// Sincronizar
async function syncVentasToSupabase() {
  const { error } = await supabase
    .from('ventas')
    .upsert(ventas);
  if (error) console.error(error);
}

// Real-time listener
function setupVentasListener() {
  supabase
    .from('ventas')
    .on('*', payload => {
      console.log('Cambio en ventas:', payload);
      renderVDebounced();
    })
    .subscribe();
}
```

**Ejemplo Export CSV:**
```javascript
function exportCSV() {
  const headers = ['ID', 'Cliente', 'Total', 'Fecha'];
  const rows = ventas.map(v => 
    [v.id, v.cliente, v.total, v.fecha].join(',')
  );
  
  const csv = [headers.join(','), ...rows].join('\n');
  dl(csv, 'ventas.csv');
}
```

---

### 4. UTILS.JS - Utility Layer

**Responsabilidades:**
- Validación (RFC, email, teléfono)
- Formateo (moneda, números, fechas)
- DOM utilities
- Eventos
- Print y clipboard

**Estructura:**
```javascript
// ═══════════════════════════════════════════════
// 1. VALIDATION
// ═══════════════════════════════════════════════

function validRFC(rfc) { /* Validar RFC */ }
function validEmail(email) { /* Validar email */ }
function validPhone(phone) { /* Validar teléfono */ }

// ═══════════════════════════════════════════════
// 2. FORMATTING
// ═══════════════════════════════════════════════

function fmtMoneda(num) { /* Formatear dinero */ }
function fmtNumero(num) { /* Formatear número */ }
function fmtFecha(date) { /* Formatear fecha */ }

// ═══════════════════════════════════════════════
// 3. DOM UTILITIES
// ═══════════════════════════════════════════════

function getElementById(id) { /* Get element */ }
function setHTML(el, html) { /* Set HTML */ }
function addClass(el, className) { /* Add class */ }

// ═══════════════════════════════════════════════
// 4. EVENTS
// ═══════════════════════════════════════════════

function onKeyDown(el, callback) { /* On key */ }
function onClick(el, callback) { /* On click */ }

// ═══════════════════════════════════════════════
// 5. PRINT & COPY
// ═══════════════════════════════════════════════

function printElement(elementId) { /* Imprimir */ }
function copyToClipboard(text) { /* Copiar */ }

// ═══════════════════════════════════════════════
// 6. TABLE UTILITIES
// ═══════════════════════════════════════════════

function sortTable(tableId, colIndex) { /* Sort */ }
function filterRows(tableId, query) { /* Filter */ }
```

**Ejemplo Validación:**
```javascript
function validRFC(rfc) {
  // RFC: 13 o 16 caracteres, alpanumérico
  const pattern = /^[A-ZÑ&]{3,4}\d{6}[A-V0-9]{3}$/;
  return pattern.test(rfc.toUpperCase());
}

// Uso
if (!validRFC(rfc)) {
  toast('RFC inválido');
  return;
}
```

**Ejemplo Formato:**
```javascript
function fmtMoneda(num) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(num);
}

// Resultado: $1,234.56
```

---

## 🚀 CÓMO EXTENDER FUNCIONALIDAD

### Agregar Nuevo Módulo

**Ejemplo: Agregar módulo "Reportes"**

#### 1. Crear archivo `reports.js`
```javascript
// reports.js
import { ventas, almacen, clientes } from './core.js';
import { fmtMoneda } from './utils.js';

function generateSalesReport(startDate, endDate) {
  const filtered = ventas.filter(v => 
    v.fecha >= startDate && v.fecha <= endDate
  );
  
  return {
    total: filtered.reduce((sum, v) => sum + v.total, 0),
    count: filtered.length,
    average: filtered.length ? filtered[0].total / filtered.length : 0,
    topClients: [...filtered]
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  };
}

export { generateSalesReport };
```

#### 2. Importar en `ui.js`
```javascript
import { generateSalesReport } from './reports.js';

function renderReports() {
  const report = generateSalesReport('2026-01-01', '2026-04-22');
  console.log('Report:', report);
  // Renderizar en DOM
}
```

#### 3. Agregar a HTML
```html
<nav>
  <li onclick="setView('reports')">📊 Reportes</li>
</nav>

<div id="reports-view" style="display:none;">
  <!-- Contenido de reportes -->
</div>
```

### Agregar Nueva Feature

**Ejemplo: Descuentos en ventas**

#### 1. Actualizar `core.js`
```javascript
// Agregar campo a venta
ventas.push({
  id: Date.now(),
  cliente: 'Juan',
  productos: [...],
  subtotal: 1000,
  descuento: 10,  // ← Nuevo campo
  total: 900,
  fecha: today()
});
```

#### 2. Actualizar `ui.js`
```javascript
function openVentaModal() {
  // Agregar input de descuento
  const html = `
    <input id="descuento" type="number" 
           min="0" max="100" placeholder="% descuento" />
  `;
  // ...
}

function saveVenta() {
  // Calcular con descuento
  const subtotal = calcSubtotal();
  const descuento = parseFloat(document.getElementById('descuento').value) || 0;
  const descuentoMonto = subtotal * (descuento / 100);
  const total = subtotal - descuentoMonto + impuesto;
  // ...
}
```

#### 3. Actualizar `ui.js` renderizar
```javascript
function renderV() {
  // Mostrar descuento en tabla
  html += `<td>${v.descuento}%</td>`;
  html += `<td>$${fmt(v.total)}</td>`;
}
```

---

## 📝 MEJORES PRÁCTICAS

### Rendimiento

#### ✅ HACER:
```javascript
// Debounce en búsquedas
const handleSearch = debounce((query) => {
  const results = filterByQuery(almacen, query, ['nombre']);
  renderADebounced();
}, 300);

// Memoization para funciones puras
const findClient = memoize((name) => 
  clientes.find(c => c.nombre === name)
);

// Caching de resultados costosos
const getCached = (key, fn) => {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
};

// Event delegation en listas grandes
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('btn-delete')) {
    const id = e.target.dataset.id;
    delV(id);
  }
});
```

#### ❌ EVITAR:
```javascript
// ❌ Sin debounce
input.addEventListener('input', () => {
  const results = filterByQuery(almacen, input.value, ['nombre']);
  renderA();  // Se ejecuta en CADA tecla
});

// ❌ Búsqueda sin optimización
const findInArray = (arr, value) => {
  return arr.filter(item => 
    item.nombre.includes(value) || 
    item.codigo.includes(value)
  );
};

// ❌ Recalcular todo
function renderTable() {
  const sorted = almacen.sort(...);  // ¡Cambia array!
  const formatted = sorted.map(formatItem);  // Costo O(n)
  document.innerHTML = formatted.join('');  // Redraw todo
}
```

### Mantenibilidad

#### ✅ HACER:
```javascript
// Nombres descriptivos
const calcularTotalConImpuesto = (subtotal) => {
  const impuesto = subtotal * 0.16;
  return subtotal + impuesto;
};

// Comentarios para lógica compleja
// Debounce: Retrasar búsqueda 300ms para optimización
const handleSearch = debounce(performSearch, 300);

// Modular y testeable
function isValidEmail(email) {
  return email.match(/^[^@]+@[^@]+\.[^@]+$/);
}

// Single Responsibility
function saveVenta() {
  validateInput();  // Responsabilidad: validar
  updateState();    // Responsabilidad: actualizar estado
  persistData();    // Responsabilidad: persistir
  updateUI();       // Responsabilidad: renderizar
}
```

#### ❌ EVITAR:
```javascript
// ❌ Nombres ambiguos
const calc = (a) => a * 1.16;

// ❌ Lógica sin comentarios
const x = arr.filter(i => new Date(i.f) > new Date(new Date().setDate(new Date().getDate()-30)));

// ❌ Validación inline
if (e.value && e.value.length > 0 && e.value.match(/^[^@]+@[^@]+\./)) { ... }

// ❌ Múltiples responsabilidades
function saveVenta() {
  // Validar
  // Guardar
  // Renderizar
  // Sincronizar
  // Notificar
  // Imprime debug
}
```

### Seguridad

#### ✅ HACER:
```javascript
// Validar entrada
function sanitizeInput(input) {
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
}

// Escapar HTML
const escapeHTML = (str) => 
  str.replace(/&/g, '&amp;')
     .replace(/</g, '&lt;')
     .replace(/>/g, '&gt;');

// Validar antes de procesar
function saveVenta() {
  if (!validEmail(cliente.email)) return toast('Email inválido');
  if (!validPhone(cliente.phone)) return toast('Teléfono inválido');
  if (!validRFC(cliente.rfc)) return toast('RFC inválido');
}

// Usar HTTPS en APIs
const url = 'https://api.ejemplo.com/datos';  // ✓
```

#### ❌ EVITAR:
```javascript
// ❌ Insertar HTML directo (XSS)
element.innerHTML = userInput;

// ❌ Eval (NUNCA usar)
eval(userInput);

// ❌ Sin validación
ventas.push({
  cliente: userInput.cliente,  // Sin sanitizar
  total: userInput.total,      // Sin validar
  notes: userInput.notes       // Sin escapar
});

// ❌ HTTP en APIs sensibles
const url = 'http://api.ejemplo.com/datos';  // ✗
```

---

## 🎨 CONVENCIONES DE CÓDIGO

### Nombres de Variables
```javascript
// Arrays (plural)
const ventas = [];
const clientes = [];
const productos = [];

// Booleanos (is/has/should)
const isValid = true;
const hasError = false;
const shouldRender = true;

// Funciones (verbo + sustantivo)
const calcularTotal = () => {};
const validarEmail = () => {};
const renderVentas = () => {};
const deleteVenta = () => {};

// Constantes (UPPER_SNAKE_CASE)
const MAX_RETRIES = 3;
const API_URL = 'https://api.ejemplo.com';
const DEBOUNCE_DELAY = 300;

// Privadas (guion bajo)
const _cache = new Map();
const _filteredResults = [];
```

### Comentarios
```javascript
// Comentario simple para línea
const delay = 300;  // Debounce delay en ms

// Comentario de bloque para funciones
/**
 * Calcula el total de una venta
 * @param {Array} productos - Array de productos
 * @param {Number} impuesto - Porcentaje de impuesto
 * @returns {Number} Total con impuesto
 */
function calcularTotal(productos, impuesto) { ... }

// TODO para tareas pendientes
const syncData = () => {
  // TODO: Implementar retry logic
  supabase.from('ventas').insert(ventas);
};

// FIXME para bugs conocidos
const renderTable = () => {
  // FIXME: Lento con >5000 registros
  ventas.forEach(v => createElement(v));
};
```

### Estructura de Módulos
```javascript
// Imports (al inicio)
import { ventas, almacen } from './core.js';
import { fmtMoneda } from './utils.js';

// ═════════════════════════════════════════════════
// CONSTANTS
// ═════════════════════════════════════════════════
const DEBOUNCE_DELAY = 300;

// ═════════════════════════════════════════════════
// UTILITIES
// ═════════════════════════════════════════════════
const helper = () => {};

// ═════════════════════════════════════════════════
// MAIN FUNCTIONS
// ═════════════════════════════════════════════════
function renderData() { ... }

// ═════════════════════════════════════════════════
// EVENT HANDLERS
// ═════════════════════════════════════════════════
function handleSave() { ... }

// ═════════════════════════════════════════════════
// EXPORTS
// ═════════════════════════════════════════════════
export { renderData, handleSave };
```

---

## 🛠️ SETUP DE DESARROLLO

### Ambiente Local

#### Requisitos
- Navegador moderno (Chrome, Firefox, Safari, Edge)
- Editor (VS Code recomendado)
- Git (para control de versiones)
- Optional: Node.js (para herramientas)

#### Pasos
1. Clonar repositorio
   ```bash
   git clone https://github.com/usuario/maya-autopartes.git
   cd maya-autopartes-working
   ```

2. Abrir en editor
   ```bash
   code .
   ```

3. Abrir en navegador
   ```
   Abrir index.html en navegador
   O usar Live Server (extensión VS Code)
   ```

### Estructura de Carpetas Recomendada
```
maya-autopartes-working/
├── index.html              (Principal)
├── styles.css              (Estilos)
├── js/
│   ├── core.js
│   ├── ui.js
│   ├── api.js
│   └── utils.js
├── assets/
│   ├── images/
│   └── fonts/
├── docs/
│   ├── README.md
│   ├── USER_GUIDE.md
│   └── DEVELOPER_GUIDE.md
└── tests/
    └── test.html
```

---

## ✅ TESTING

### Testing Manual

#### Checklist Básico
```
□ Dashboard carga correctamente
□ CRUD de ventas funciona (Create, Read, Update, Delete)
□ CRUD de almacén funciona
□ CRUD de clientes funciona
□ Búsqueda rápida (<100ms)
□ Facturas se generan correctamente
□ Exportación a Excel funciona
□ Exportación a CSV funciona
□ Roles y permisos se aplican
□ localStorage persiste datos
```

#### Testing de Performance
```javascript
// En Console del navegador
console.time('render');
renderV();
console.timeEnd('render');
// Resultado: render: 45.23ms
```

#### Testing de Memory
```javascript
// En Chrome DevTools → Memory → Heap snapshot
// Verificar no hay memory leaks después de:
// - Crear 100 ventas
// - Renderizar 5 veces
// - Limpiar datos
```

### Testing con Browser DevTools

#### Chrome DevTools
```
F12 → Elementos
      - Inspeccionar DOM
      - Editar estilos
      
F12 → Console
      - Ejecutar comandos JS
      - Ver logs
      
F12 → Network
      - Ver requests (si hay Supabase)
      - Verificar tamaño de archivos
      
F12 → Performance
      - Grabar uso de CPU
      - Identificar cuellos
      
F12 → Memory
      - Heap snapshots
      - Detectar memory leaks
```

---

## 🐛 DEBUGGING

### Técnicas Comunes

#### 1. Console.log
```javascript
function saveVenta() {
  console.log('Cliente:', cliente);
  console.log('Productos:', productos);
  console.log('Total:', total);
  
  ventas.push({...});
  console.log('Venta guardada:', ventas);
}
```

#### 2. Breakpoints
```
1. Abrir DevTools (F12)
2. Ir a pestaña "Sources"
3. Click en número de línea para agregar breakpoint
4. Ejecutar código
5. Se pausa en breakpoint
6. Inspeccionar variables
```

#### 3. Debugger Statement
```javascript
function saveVenta() {
  debugger;  // Se pausa aquí si DevTools está abierto
  ventas.push({...});
}
```

#### 4. Stack Trace
```javascript
function a() { b(); }
function b() { c(); }
function c() { console.trace(); }  // Muestra stack completo
```

### Problemas Comunes

#### "localStorage es undefined"
```javascript
// ❌ Problema: Navegador incógnito deshabilita localStorage
if (typeof Storage !== "undefined") {
  localStorage.setItem('key', 'value');
}

// ✓ Solución: Verificar disponibilidad
```

#### "Datos no persisten"
```javascript
// ✓ Verificar
1. ¿Navegador soporta localStorage?
2. ¿Hay espacio disponible? (límite ~5-10MB)
3. ¿Se llamó a sv() para guardar?
4. ¿Datos están en el array antes de guardar?
```

#### "Búsqueda lenta"
```javascript
// ❌ Problema: Búsqueda en cada tecla
input.addEventListener('input', () => {
  renderA();  // O(n) en cada tecla
});

// ✓ Solución: Debounce
input.addEventListener('input', debounce(() => {
  renderA();  // O(n) una vez cada 300ms
}, 300));
```

---

## 🔗 API DE INTEGRACIONES

### Supabase Integration

#### Setup
```javascript
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js';

const supabase = createClient(
  'https://your-project.supabase.co',
  'your-anon-key'
);
```

#### Sincronizar
```javascript
async function syncToSupabase() {
  // Insert o update
  const { data, error } = await supabase
    .from('ventas')
    .upsert(ventas);
  
  if (error) console.error('Error:', error);
  else console.log('Sincronizado:', data);
}
```

#### Real-time Listener
```javascript
function setupListener() {
  supabase
    .from('ventas')
    .on('*', payload => {
      console.log('Cambio:', payload);
      ventas = payload.new;
      renderVDebounced();
    })
    .subscribe();
}
```

### Excel Export

#### Usando SheetJS
```html
<script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>
```

```javascript
function exportToExcel() {
  const ws = XLSX.utils.json_to_sheet(ventas);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
  XLSX.writeFile(wb, 'ventas.xlsx');
}
```

### Google Drive Integration
```javascript
// Ver api.js para implementación completa
async function uploadToDrive(file) {
  // Requiere Google OAuth token
  // Implementación en api.js
}
```

---

## 📚 RECURSOS ÚTILES

### Documentación Oficial
- [MDN Web Docs](https://developer.mozilla.org)
- [JavaScript.info](https://javascript.info)
- [HTML5 Spec](https://html.spec.whatwg.org)
- [CSS Tricks](https://css-tricks.com)

### Librerías Recomendadas
- **SheetJS** - Excel export
- **Chart.js** - Gráficos
- **Moment.js** - Fechas
- **Lodash** - Utilidades JS

### Herramientas
- **VS Code** - Editor
- **Chrome DevTools** - Debugging
- **Lighthouse** - Performance audit
- **Git** - Control de versiones

---

## 🚀 NEXT STEPS

1. **Leer el código** - Revisar core.js, ui.js, api.js, utils.js
2. **Entender flujo** - Seguir una venta desde creación hasta renderizar
3. **Modificar** - Cambiar color, agregar campo, ajustar búsqueda
4. **Extender** - Agregar nuevo módulo o feature
5. **Optimizar** - Medir performance, identificar cuellos
6. **Desplegar** - Ver DEPLOYMENT_GUIDE.md

---

## 📞 SOPORTE

- 📖 Documentación completa en repo
- 🐛 Bugs: Reportar en GitHub issues
- 💡 Features: Crear discussion en GitHub
- 📧 Email: coronelomar131@gmail.com

---

**Versión**: 3.0.0  
**Última actualización**: 2026-04-22  
**Mantenedor**: Omar Corona
