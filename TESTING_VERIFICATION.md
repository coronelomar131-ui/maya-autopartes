# 🧪 TESTING & VERIFICATION GUIDE

## Cómo verificar que los módulos funcionan correctamente

---

## 1️⃣ VERIFICACIÓN BÁSICA (5 minutos)

### Paso 1: Abrir el navegador
1. Abrir `index.html` en el navegador
2. Presionar `F12` para abrir Developer Tools
3. Ir a la tab `Console`

### Paso 2: Verificar que los módulos cargaron
En la consola, escribir:
```javascript
typeof renderV
```

Esperado: `"function"` ✅

Si dice `"undefined"` ❌ → Los módulos no se importaron correctamente

### Paso 3: Verificar estado global
```javascript
import { ventas, almacen, clientes } from './core.js';
console.log({ ventas, almacen, clientes });
```

Esperado: Un objeto con tres arrays (aunque vacíos es ok)

---

## 2️⃣ TESTING DE FUNCIONALIDAD (15 minutos)

### Test 1: Renderizar tabla de ventas
```javascript
renderV();
```
✅ Debería aparecer tabla con columnas: Reporte, Fecha, Cliente, etc.

### Test 2: Renderizar almacén
```javascript
renderA();
```
✅ Debería aparecer grid de productos (o cards)

### Test 3: Renderizar clientes
```javascript
renderC();
```
✅ Debería aparecer cards de clientes

### Test 4: Renderizar facturas
```javascript
renderF();
```
✅ Debería aparecer lista de facturas (con filtros)

### Test 5: Actualizar badges
```javascript
badges();
```
✅ Debería actualizar números en la sidebar

---

## 3️⃣ TESTING DE ALMACENAMIENTO (10 minutos)

### Verificar localStorage
En la consola:
```javascript
localStorage.getItem('ma4_v')  // Ventas
localStorage.getItem('ma4_a')  // Almacén
localStorage.getItem('ma4_c')  // Clientes
localStorage.getItem('ma4_cfg') // Config
```

Esperado: JSON strings (aunque vacío es ok)

### Verificar que se persiste
1. Agregar una venta desde UI
2. Recargar página (F5)
3. Verificar que la venta sigue ahí

```javascript
import { ventas } from './core.js';
console.log(ventas); // Debería mostrar la venta que agregaste
```

---

## 4️⃣ TESTING DE FUNCIONES CORE (10 minutos)

### Test debounce
```javascript
import { debounce } from './core.js';

const log = debounce(() => console.log('Ejecutado!'), 300);
log();
log();
log();
// Esperado: solo se ejecuta UNA VEZ después de 300ms
```

### Test memoize
```javascript
import { findClienteByNombre, clientes } from './core.js';

// Agregar cliente
clientes.push({ nombre: 'Test', id: 1 });

// Primera búsqueda (lenta, O(n))
console.time('primera');
const c1 = findClienteByNombre('Test');
console.timeEnd('primera');

// Segunda búsqueda (rápida, O(1) desde cache)
console.time('segunda');
const c2 = findClienteByNombre('Test');
console.timeEnd('segunda');

// c2 debería ser más rápida
```

### Test filtrado
```javascript
import { filtV } from './core.js';

// Set search input
document.getElementById('v-s').value = 'Juan';
const filtered = filtV();
console.log(filtered); // Debería filtrar ventas
```

---

## 5️⃣ TESTING DE API.JS (10 minutos)

### Test Supabase (si está configurado)
```javascript
import { syncVentasToSupabase } from './api.js';

await syncVentasToSupabase();
// Esperado: logs en consola diciendo ✅ Ventas sincronizadas
```

### Test Exportación Excel
```javascript
import { exportarFacturasExcel } from './api.js';

exportarFacturasExcel();
// Esperado: descarga un archivo Excel
```

### Test Exportación CSV
```javascript
import { exportCSV } from './api.js';

exportCSV();
// Esperado: descarga archivo .csv
```

### Test Exportación Compac
```javascript
import { exportCompac, buildCompac } from './api.js';

const compacData = buildCompac();
console.log(compacData);
// Esperado: formato TSV con datos de ventas
```

---

## 6️⃣ TESTING DE UTILS.JS (10 minutos)

### Test validación RFC
```javascript
import { isValidRFC } from './utils.js';

console.log(isValidRFC('ABC123456XYZ'));      // true ✅
console.log(isValidRFC('INVALIDO'));          // false ✅
```

### Test validación email
```javascript
import { isValidEmail } from './utils.js';

console.log(isValidEmail('test@example.com')); // true ✅
console.log(isValidEmail('invalid'));         // false ✅
```

### Test formateo de moneda
```javascript
import { formatCurrency, formatNumber } from './utils.js';

console.log(formatCurrency(1500.50));  // $1,500.50 MXN
console.log(formatNumber(1000.123, 2)); // 1,000.12
```

### Test formateo de fecha
```javascript
import { formatDate, daysUntilDue } from './utils.js';

console.log(formatDate('2026-04-30')); // "30 de abril de 2026"
console.log(daysUntilDue('2026-05-10')); // Número de días
```

---

## 7️⃣ TESTING DE UI INTERACTIVO

### Test: Abrir modal de venta
```javascript
window.openVentaModal();
```
✅ Debería aparecer overlay con formulario

### Test: Guardar venta
1. Llenar formulario (obligatorio: fecha, cliente, responsable)
2. Click "Guardar"
3. Verificar que aparece en tabla
```javascript
import { ventas } from './core.js';
console.log(ventas); // Nueva venta debería estar aquí
```

### Test: Editar venta
1. Click en botón "✏" en una venta
2. Cambiar datos
3. Click "Guardar"
4. Verificar cambios en tabla

### Test: Eliminar venta
1. Click en botón "🗑"
2. Confirmar eliminación
3. Verificar que desaparece de tabla

### Test: Buscar (con debounce)
1. Ir a Ventas
2. Escribir en "Buscar ventas..."
3. Ver que filtra en tiempo real (pero sin lag)
4. Verificar que debounce funciona (no hace 100 renders)

---

## 8️⃣ TESTING DE PERFORMANCE (opcional)

### Medir tiempo de render
```javascript
console.time('render');
renderV();
console.timeEnd('render');
// Esperado: < 100ms
```

### Medir tamaño de memoria
```javascript
// En DevTools → Memory tab
// Take heap snapshot antes y después de operaciones
// Buscar memory leaks
```

### Test con datos grandes
```javascript
import { ventas } from './core.js';

// Agregar 1000 ventas de prueba
for (let i = 0; i < 1000; i++) {
  ventas.push({
    id: Date.now() + i,
    fecha: '2026-04-22',
    cliente: `Cliente ${i}`,
    total: Math.random() * 10000,
    // ... otros campos
  });
}

// Medir render time
console.time('render 1000');
renderV();
console.timeEnd('render 1000');
// Esperado: Aún < 500ms (con debounce funciona)
```

---

## 9️⃣ TESTING DE RESPONSIVENESS

### Mobile (pequeñas pantallas)
1. Presionar F12
2. Ir a Device Emulation (Ctrl+Shift+M)
3. Seleccionar "iPhone 12"
4. Verificar que:
   - Sidebar se oculta
   - Botón "☰" aparece
   - Tablas son scrollables
   - Modales se adaptan

### Tablet
1. Device Emulation → iPad
2. Verificar que layout funciona

---

## 🔟 TESTING COMPLETO (Checklist)

```
MÓDULOS
├─ [ ] core.js carga sin errores
├─ [ ] ui.js carga sin errores
├─ [ ] api.js carga sin errores
└─ [ ] utils.js carga sin errores

FUNCIONALIDAD BÁSICA
├─ [ ] Renderizar ventas
├─ [ ] Renderizar almacén
├─ [ ] Renderizar clientes
├─ [ ] Renderizar facturas
└─ [ ] Badges actualizan

CRUD OPERATIONS
├─ [ ] Crear venta
├─ [ ] Leer/editar venta
├─ [ ] Actualizar venta
├─ [ ] Eliminar venta
├─ [ ] Crear almacén
├─ [ ] Crear cliente
└─ [ ] Crear factura

BÚSQUEDA Y FILTRADO
├─ [ ] Búsqueda ventas
├─ [ ] Búsqueda almacén
├─ [ ] Búsqueda clientes
├─ [ ] Filtro por status
├─ [ ] Filtro por categoría
└─ [ ] Filtro por stock

EXPORTACIÓN
├─ [ ] Exportar Excel
├─ [ ] Exportar CSV
├─ [ ] Exportar JSON
├─ [ ] Exportar Compac
└─ [ ] Descargar PDF

ALMACENAMIENTO
├─ [ ] LocalStorage persiste
├─ [ ] Recargar mantiene datos
└─ [ ] Supabase sync (si configurado)

VALIDACIÓN
├─ [ ] RFC válido/inválido
├─ [ ] Email válido/inválido
├─ [ ] Teléfono válido/inválido
└─ [ ] Campos obligatorios

MOBILE
├─ [ ] Sidebar responde
├─ [ ] Botón ☰ funciona
├─ [ ] Tablas scrollean
└─ [ ] Modales se adaptan

PERFORMANCE
├─ [ ] Render < 100ms
├─ [ ] Búsqueda sin lag
├─ [ ] Sin memory leaks
└─ [ ] 1000+ registros OK

INTEGRACIÓN
├─ [ ] Todas funciones exportadas a window
├─ [ ] onclick handlers funcionan
├─ [ ] No hay errores en console
└─ [ ] Todo se ve correcto
```

---

## 🐛 TROUBLESHOOTING

### "Cannot find module ./core.js"
```
Solución:
- Verificar que core.js está en la misma carpeta que index.html
- Verificar path: "./core.js" no "core.js"
```

### "ReferenceError: renderV is not defined"
```
Solución:
- Verificar que renderV se importó en <script type="module">
- Verificar que se exportó: Object.assign(window, { renderV, ... })
```

### "localStorage is null"
```
Solución:
- localStorage solo funciona en http:// o https://
- No funciona en file:// local
- Usar local dev server: python3 -m http.server 8000
```

### "XLSX is not defined"
```
Solución:
- Incluir en <head>:
  <script src="https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js"></script>
```

### Supabase no sincroniza
```
Solución:
- Verificar credenciales en api.js
- Abrir DevTools → Network tab
- Ver si la request se envía
- Revisar respuesta de servidor
```

---

## 📊 EJEMPLO DE OUTPUT ESPERADO

Al cargar por primera vez, en la consola deberías ver:

```
✅ Maya Autopartes cargado correctamente
✅ Módulos inicializados
   - core.js: Data layer
   - ui.js: Render layer
   - api.js: Integration layer
   - utils.js: Utilities

[Opcional] ✅ Supabase inicializado
[Opcional] ✅ Ventas sincronizadas con Supabase
[Opcional] ✅ Almacén sincronizado con Supabase
[Opcional] ✅ Clientes sincronizados con Supabase
```

Si ves errores de módulos no encontrados ❌, revisar:
1. Que los archivos existen en la carpeta
2. Que los paths son correctos (./core.js no core.js)
3. Que el servidor está sirviendo archivos correctamente

---

## ✅ VALIDACIÓN FINAL

Si pasas todos estos tests, los módulos están listos para:
1. Deploy a producción
2. Actualizar versión
3. Comunicar a usuarios
4. Continuar con Phase 3 (Seguridad)

---

*Generado: 2026-04-22*
*Parte de: PHASE_2_3_COMPLETION*
