# Quick Start: Trabajar con Módulos ES6

**v2.3.0** | 2026-04-22

---

## 🚀 Inicio Rápido

### Opción 1: Desarrollo Local (Recomendado)
```bash
# Terminal 1: Servir archivos
cd C:\Users\omar\maya-autopartes-working
python -m http.server 8000

# O con Node.js
npx http-server

# Terminal 2: Abrir en navegador
http://localhost:8000
```

### Opción 2: VS Code Live Server
```
1. Click derecho en index.html
2. "Open with Live Server"
3. Se abre automáticamente en navegador
```

---

## 📂 Estructura de Módulos

```
main.js (Entry point)
  ├── core.js (Data & State)
  ├── ui.js (Rendering)
  ├── api.js (Integrations)
  └── utils.js (Helpers)
```

---

## 💻 Cómo Agregar Funciones Nuevas

### Paso 1: Crear función en módulo apropiado

**Ejemplo: Función nueva en core.js**
```javascript
// core.js
export function miNuevaFuncion() {
  console.log('Mi nueva función');
  return true;
}
```

### Paso 2: Importar en main.js
```javascript
// main.js
import { miNuevaFuncion } from './core.js';

// Exponer en window si necesita onclick
window.miNuevaFuncion = miNuevaFuncion;
```

### Paso 3: Usar en HTML
```html
<button onclick="miNuevaFuncion()">Click Me</button>
```

---

## 🔄 Flujos Comunes

### Agregar Campo a Formulario

**1. En ui.js (renderizar campo)**
```javascript
export function renderVForm() {
  return `
    <div class="field">
      <label>Mi Campo</label>
      <input type="text" id="mi-campo">
    </div>
  `;
}
```

**2. En core.js (guardar dato)**
```javascript
export function saveVenta() {
  const miCampo = document.getElementById('mi-campo').value;
  // ... procesar dato ...
  sv(); // Guardar a localStorage
}
```

**3. En main.js (exponer)**
```javascript
window.saveVenta = saveVenta;
```

### Integración con API Nueva

**1. En api.js (crear función)**
```javascript
export async function syncMiAPI() {
  try {
    const response = await fetch('https://api.example.com/data');
    return await response.json();
  } catch(e) {
    console.error('Error:', e);
  }
}
```

**2. En main.js (inicializar)**
```javascript
import { syncMiAPI } from './api.js';

async function initializeApp() {
  await syncMiAPI().catch(e => console.warn(e));
}
```

---

## 🐛 Debugging Tips

### Ver Módulos Cargados
```javascript
// En DevTools Console
import.meta // Ver info del módulo actual
```

### Ver qué está en window
```javascript
// En DevTools Console
Object.keys(window).filter(k => !k.startsWith('webkit'));
```

### Trace de Función
```javascript
// En DevTools, en el módulo
console.log('Mi función llamada', { ventas, almacen });
```

### Network Tab
Abrir DevTools → Network tab
- Ver cada módulo cargado
- Ver tamaño de cada archivo
- Ver tiempo de carga

---

## ⚠️ Errores Comunes

### Error: "Module not found"
```
❌ Causa: import de archivo que no existe
✅ Solución: Verificar ruta exacta y que archivo existe
```

### Error: "Function is not defined"
```
❌ Causa: Función no expuesta en window
✅ Solución: Agregar en main.js: window.miFunc = miFunc;
```

### Error: "CORS error"
```
❌ Causa: Intentando cargar módulos con file://
✅ Solución: Usar servidor local (http-server, python, etc.)
```

### Error: "Circular dependency"
```
❌ Causa: Módulo A importa B, B importa A
✅ Solución: Reorganizar código para evitar ciclos
```

---

## 📦 Módulo por Módulo

### core.js
**Qué va aquí:**
- Variables de estado (ventas, almacen, etc.)
- Funciones de data (filtros, búsquedas)
- Funciones de render (renderV, renderA, etc.)
- localStorage persistence

**Ejemplo:**
```javascript
export let ventas = [];
export function filtV() { return ventas.filter(...); }
export function renderV() { return HTML; }
```

### ui.js
**Qué va aquí:**
- Funciones que devuelven HTML
- Renderizado de formularios
- Generación de componentes visuales
- Estilos condicionales

**Ejemplo:**
```javascript
export function renderVForm() {
  return `<form>...</form>`;
}
```

### api.js
**Qué va aquí:**
- Llamadas a APIs externas
- Supabase sync
- Google Drive, MercadoLibre, OneDrive
- Funciones async

**Ejemplo:**
```javascript
export async function syncToSupabase() {
  await supabase.from('ventas').insert(ventas);
}
```

### utils.js
**Qué va aquí:**
- Funciones auxiliares pequeñas
- Event listeners globales
- DOM utilities
- Helpers generales

**Ejemplo:**
```javascript
export function toast(msg) {
  document.getElementById('toast').textContent = msg;
}
```

---

## 🔗 Importar y Exportar

### Named Exports (Recomendado)
```javascript
// core.js
export function miFunc() { }
export let miVariable = [];

// main.js
import { miFunc, miVariable } from './core.js';
```

### Default Export (Raro)
```javascript
// config.js
export default { api: 'url', key: 'secret' };

// main.js
import config from './config.js';
```

### Export All From
```javascript
// index.js
export * from './core.js';
export * from './ui.js';

// main.js
import * as app from './index.js';
```

---

## 🚀 Deploy a Producción

### Con Vite (Recomendado)
```bash
# Install
npm install -D vite

# Build
npx vite build

# Output en dist/ (lista para subir)
```

### Manual (Simple)
```bash
# Copiar files a servidor web
/index.html
/main.js
/core.js
/ui.js
/api.js
/utils.js
/styles.css
/logo.jpg
```

---

## 📝 Checklist para Cambios

Antes de hacer un cambio:

- [ ] ¿Cuál módulo debe tener la función?
- [ ] ¿Necesita exportarse?
- [ ] ¿Necesita exponerse en window?
- [ ] ¿Tengo que importar algo nuevo en main.js?
- [ ] ¿Probé en DevTools que funciona?
- [ ] ¿Verifiqué localStorage?

---

## 🎯 Muestras de Código

### Sample 1: Agregar botón con onclick
```html
<button onclick="miFunc()" class="btn btn-primary">Click</button>

<script type="module">
  import { miFunc } from './core.js';
  window.miFunc = miFunc; // ← Necesario para onclick
</script>
```

### Sample 2: Actualizar estado
```javascript
// core.js
export let ventas = [];

export function addVenta(venta) {
  ventas.push(venta);
  sv(); // Save to localStorage
  return true;
}

// main.js
window.saveVenta = () => {
  const newVenta = { /* ... */ };
  addVenta(newVenta);
  renderV();
  toast('✅ Venta guardada');
};
```

### Sample 3: Fetch de API
```javascript
// api.js
export async function fetchData() {
  try {
    const response = await fetch('https://api.example.com/data');
    if (!response.ok) throw new Error(response.statusText);
    return await response.json();
  } catch(e) {
    console.error('API Error:', e);
    return null;
  }
}

// main.js
import { fetchData } from './api.js';

async function initializeApp() {
  const data = await fetchData();
  if (data) console.log('✅ Data loaded:', data);
}
```

---

## 📚 Documentación Relacionada

- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - Cambios en detalle
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura completa
- [REFACTORING_SUMMARY.md](./REFACTORING_SUMMARY.md) - Resumen ejecutivo

---

## 🆘 Soporte

### Console Errors
Abre DevTools (F12) → Console
Busca errores rojo
Lee el mensaje completo

### Network Errors
DevTools → Network tab
Ver qué archivos fallan
Verificar URLs y paths

### Logic Bugs
Agregá `console.log()` en tu código
Inspeccioná variables en DevTools
Usa debugger: `debugger;`

---

## ✅ Status: Production Ready

- ✅ Módulos funcionan perfectamente
- ✅ Documentación completa
- ✅ Ejemplos de código
- ✅ Error handling
- ✅ Performance optimizado

**Versión:** 2.3.0  
**Última actualización:** 2026-04-22  
**Estado:** ✅ LISTO PARA USAR
