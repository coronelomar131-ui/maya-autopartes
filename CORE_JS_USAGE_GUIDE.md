# core.js Usage Guide - Phase 2.2

## Quick Start

### 1. Incluir en HTML

El archivo `core.js` se incluye automáticamente en `index.html` y todas sus funciones están disponibles en el scope global.

```html
<!-- En index.html, debajo de styles.css -->
<script src="core.js"></script>
```

### 2. Usar Funciones

Todas las funciones son accesibles directamente:

```javascript
// Optimización
const miDebouncedFn = debounce(miFunction, 500);
const cached = getCached('key', () => calcularAlgo());

// Búsqueda
const cliente = findClienteByNombre('García');
const resultados = filterByQuery(clientes, 'búsqueda', ['nombre', 'email']);

// Persistencia
sv();  // Guardar todos los datos

// Utilidades
fmt(1234.5);  // "$1,234.50"
today();      // "2026-04-22"
```

---

## Core Functions Reference

### STATE MANAGEMENT

#### Datos globales
```javascript
let ventas;      // Array de ventas
let almacen;     // Array de productos
let clientes;    // Array de clientes
let usuarios;    // Array de usuarios
let sesionActual;// Usuario actual o null
let cfg;         // Configuración de empresa
```

#### Variables de UI
```javascript
let vPg;        // Página actual de ventas
let vSC;        // Columna de sort
let vSD;        // Dirección de sort
let almView;    // Vista de almacén ('cards' o 'table')
let eVId;       // ID de venta en edición
let eAId;       // ID de producto en edición
let eCId;       // ID de cliente en edición
```

---

### OPTIMIZATION

#### debounce(fn, delay = 300)
Retrasa la ejecución de una función hasta que pase el tiempo sin llamadas.

**Usar para**: búsquedas, input events, resize handlers

```javascript
// Sin debounce: renderiza 100+ veces al escribir rápido
input.addEventListener('input', (e) => renderResults(e.target.value));

// Con debounce: renderiza solo 3-5 veces (95% menos)
const renderDebounced = debounce((query) => renderResults(query), 300);
input.addEventListener('input', (e) => renderDebounced(e.target.value));
```

**Performance**: Reduce renders de 100+ a 3-5 en búsquedas rápidas

#### getCached(key, fn)
Cachea el resultado de una función cara.

**Usar para**: estadísticas, dashboards, cálculos complejos

```javascript
// Calcula solo una vez, luego retorna del cache
const stats = getCached('dashboard-stats', () => ({
  totalVentas: ventas.reduce((s, v) => s + v.total, 0),
  ventasHoy: ventas.filter(v => v.fecha === today()).length,
  clientesActivos: clientes.length
}));
```

**Performance**: O(1) después de primer cálculo

#### clearCache()
Borra todo el cache. Se llama automáticamente en `sv()`.

```javascript
clearCache();  // Limpia manual si es necesario
```

#### memoize(fn)
Cachea resultados de funciones puras con múltiples argumentos.

**Usar para**: búsquedas repetidas, transformaciones de datos

```javascript
const buscarCliente = memoize((nombre) =>
  clientes.find(c => c.nombre === nombre)
);

buscarCliente('García');  // 1st call: O(n) búsqueda
buscarCliente('García');  // 2nd call: O(1) desde cache
```

**Performance**: 
- Primera llamada: O(n)
- Llamadas posteriores: O(1)
- Cache automático por argumentos

---

### SEARCH & FILTERING

#### findClienteByNombre(nombre)
Busca cliente por nombre (memoizado).

```javascript
const cliente = findClienteByNombre('Taller García');
if (!cliente) console.log('No encontrado');
```

#### findVentaById(id)
Busca venta por ID.

```javascript
const venta = findVentaById(12345);
```

#### findProductoById(id)
Busca producto por ID.

```javascript
const producto = findProductoById('AMORTIGUADOR-001');
```

#### filterByQuery(array, query, fields)
Búsqueda genérica multi-campo.

```javascript
// Buscar en clientes por nombre, RFC o email
const resultados = filterByQuery(clientes, 'García', ['nombre', 'rfc', 'email']);

// Buscar en productos
const productos = filterByQuery(almacen, 'amort', ['nombre', 'sku', 'categoria']);
```

**Performance**: O(n*m) donde m = número de campos

#### filtV()
Filtro de ventas (usa elementos del DOM).

```javascript
// Filtra por búsqueda, status y factura
const ventasFiltradas = filtV();
```

#### filtA()
Filtro de almacén (usa elementos del DOM).

```javascript
// Filtra por búsqueda, categoría y estado de stock
const productosFiltrados = filtA();
```

---

### VALIDATION

#### validateVenta(data)
Valida estructura de venta.

```javascript
try {
  const venta = {
    cliente: 'Taller X',
    total: 500,
    fecha: '2026-04-22',
    responsable: 'Omar'
  };
  validateVenta(venta);  // OK
  ventas.push(venta);
  sv();
} catch (err) {
  toast('❌ ' + err.message);
}
```

**Valida**:
- cliente: string requerido, no vacío
- total: número > 0
- fecha: string requerido
- responsable: string requerido, no vacío

#### validateCliente(data)
Valida estructura de cliente.

```javascript
try {
  validateCliente({ nombre: 'García Automotriz' });
  // OK - agregar a array
} catch (err) {
  console.error(err.message);
}
```

**Valida**:
- nombre: string requerido, no vacío, max 100 caracteres

#### validateProducto(data)
Valida estructura de producto.

```javascript
validateProducto({
  nombre: 'Amortiguador',
  stock: 10,
  precio: 500
});
```

**Valida**:
- nombre: string requerido, no vacío
- stock: número >= 0
- precio: número >= 0

---

### SANITIZATION

#### sanitizeInput(string)
Previene XSS escapando caracteres HTML.

**Usar para**: valores de input de usuarios

```javascript
const nombre = sanitizeInput(userInput);  // "<script>alert('x')</script>" → escaped
document.getElementById('display').innerHTML = nombre;  // Seguro
```

#### sanitizeHTML(html)
Limpia HTML peligroso (remueve scripts y event handlers).

**Usar para**: renderizar contenido HTML de usuarios

```javascript
const html = sanitizeHTML(userContent);
document.getElementById('content').innerHTML = html;
```

---

### PERSISTENCE

#### sv()
Guarda TODOS los datos en localStorage.

**Se debe llamar después de cualquier cambio**:

```javascript
// Agregar venta
ventas.push(nuevaVenta);
sv();

// Editar cliente
clientes[index].nombre = 'Nuevo nombre';
sv();

// Eliminar producto
almacen.splice(index, 1);
sv();
```

**Automático**:
- Limpia cache después de guardar
- Maneja errores de localStorage lleno

#### saveCfg(newCfg)
Guarda configuración de empresa.

```javascript
saveCfg({
  nombre: 'Mi Empresa',
  rfc: 'ABC123456XYZ',
  email: 'info@empresa.com',
  // ... más campos
});
```

#### loadData()
Carga todos los datos desde localStorage (usar al inicializar).

```javascript
const result = loadData();
if (result.success) {
  console.log('Datos cargados:', result.count);
} else {
  console.error('Error:', result.error);
}
```

#### clearAllData()
⚠️ Borra TODOS los datos (requiere confirmación).

```javascript
clearAllData();  // Pide confirmación del usuario
```

---

### UTILITIES

#### fmt(number)
Formatea número como moneda MXN.

```javascript
fmt(1234.56);    // "$1,234.56"
fmt(1000);       // "$1,000.00"
```

#### today()
Retorna fecha de hoy en formato ISO (YYYY-MM-DD).

```javascript
const hoy = today();  // "2026-04-22"
```

#### toast(message)
Muestra notificación temporal (3 segundos).

```javascript
toast('✓ Guardado exitosamente');
toast('❌ Error al guardar');
toast('⚠️ Advertencia importante');
```

#### closeOv(id)
Cierra overlay/modal por ID.

```javascript
closeOv('modal-ventas');  // Elimina clase 'on'
```

#### clsOv(id, event)
Cierra overlay si se hace click fuera (para usar en onclick).

```html
<div id="modal" class="overlay" onclick="clsOv('modal', event)">
  <div class="modal-content" onclick="event.stopPropagation()">
    Contenido...
  </div>
</div>
```

#### dl(content, filename, type)
Descarga archivo.

```javascript
// Descargar JSON
dl(JSON.stringify(ventas), 'ventas.json', 'application/json');

// Descargar CSV
dl(csvContent, 'export.csv', 'text/csv');

// Descargar PDF
dl(pdfBlob, 'factura.pdf', 'application/pdf');
```

#### getStorageSize()
Retorna tamaño de localStorage en MB.

```javascript
console.log('Storage usado:', getStorageSize(), 'MB');
// Output: "Storage usado: 0.35 MB"
```

#### logStats()
Imprime estadísticas en consola (para debugging).

```javascript
logStats();
// Output:
// 📊 Maya Autopartes Stats
// Ventas: 245
// Almacén: 63
// Clientes: 18
// Cache entries: 5
// Storage used: 0.35 MB
```

---

## Common Patterns

### Pattern 1: Buscar y validar antes de guardar

```javascript
function agregarVenta(ventaData) {
  try {
    // Validar
    validateVenta(ventaData);
    
    // Sanitizar inputs
    ventaData.cliente = sanitizeInput(ventaData.cliente);
    ventaData.responsable = sanitizeInput(ventaData.responsable);
    
    // Agregar ID único
    ventaData.id = Date.now();
    
    // Guardar
    ventas.push(ventaData);
    sv();
    
    toast('✓ Venta registrada');
  } catch (err) {
    toast('❌ ' + err.message);
  }
}
```

### Pattern 2: Búsqueda con debounce

```javascript
const buscarClientesDebounced = debounce((query) => {
  const resultados = filterByQuery(clientes, query, ['nombre', 'rfc', 'email']);
  renderSearchResults(resultados);
}, 300);

document.getElementById('search-input').addEventListener('input', (e) => {
  buscarClientesDebounced(e.target.value);
});
```

### Pattern 3: Caché de estadísticas

```javascript
function obtenerEstadisticas() {
  return getCached('stats-dashboard', () => {
    const totalVentas = ventas.reduce((s, v) => s + v.total, 0);
    const ventasHoy = ventas.filter(v => v.fecha === today()).length;
    const productosBajos = almacen.filter(p => p.stock <= p.min).length;
    
    return {
      totalVentas: fmt(totalVentas),
      ventasHoy,
      productosBajos,
      timestamp: Date.now()
    };
  });
}

// Primera llamada: calcula todo
const stats = obtenerEstadisticas();

// Llamadas posteriores: retorna del cache
const stats2 = obtenerEstadisticas();  // Instantáneo
```

### Pattern 4: Validación y sanitización en formulario

```javascript
function guardarCliente(formData) {
  try {
    // Sanitizar todos los inputs
    const cliente = {
      nombre: sanitizeInput(formData.nombre),
      rfc: sanitizeInput(formData.rfc),
      email: sanitizeInput(formData.email),
      telefono: sanitizeInput(formData.telefono)
    };
    
    // Validar
    validateCliente(cliente);
    
    // Guardar
    clientes.push(cliente);
    sv();
    
    toast('✓ Cliente guardado');
    closeOv('modal-cliente');
  } catch (err) {
    toast('❌ ' + err.message);
  }
}
```

---

## Performance Tips

### 1. Usa memoize para búsquedas repetidas
```javascript
// ❌ Malo: O(n) cada llamada
const cliente1 = clientes.find(c => c.nombre === 'García');
const cliente2 = clientes.find(c => c.nombre === 'García');  // O(n) again

// ✅ Bien: O(1) después de la primera
const findCliente = memoize(nombre => 
  clientes.find(c => c.nombre === nombre)
);
const cliente1 = findCliente('García');  // O(n)
const cliente2 = findCliente('García');  // O(1)
```

### 2. Usa debounce para input events
```javascript
// ❌ Malo: Renderiza 100+ veces al escribir rápido
input.addEventListener('input', e => render(e.target.value));

// ✅ Bien: Renderiza solo 3-5 veces
const renderDebounced = debounce(render, 300);
input.addEventListener('input', e => renderDebounced(e.target.value));
```

### 3. Cachea cálculos costosos
```javascript
// ❌ Malo: Recalcula cada vez
function getDashboardStats() {
  return {
    total: ventas.reduce((s, v) => s + v.total, 0),
    promedio: ventas.reduce((s, v) => s + v.total, 0) / ventas.length
  };
}

// ✅ Bien: Cachea el resultado
function getDashboardStats() {
  return getCached('dashboard-stats', () => ({
    total: ventas.reduce((s, v) => s + v.total, 0),
    promedio: ventas.reduce((s, v) => s + v.total, 0) / ventas.length
  }));
}
```

---

## Testing in Console

```javascript
// Ver datos
console.log(ventas);
console.log(almacen);
console.log(clientes);

// Probar búsqueda
findClienteByNombre('García');
filterByQuery(clientes, 'García', ['nombre', 'email']);

// Ver estadísticas
logStats();
getStorageSize();

// Probar validación
validateVenta({ cliente: '', total: 0, fecha: '', responsable: '' });  // Error

// Probar sanitización
sanitizeInput('<script>alert("x")</script>');

// Probar cache
const fn = memoize(x => x * 2);
console.time('first');
fn(5);  // Calcula
console.timeEnd('first');
console.time('second');
fn(5);  // Usa cache
console.timeEnd('second');
```

---

## Next Steps

- Phase 2.3: Extract ui.js (render functions)
- Phase 2.4: Extract api.js (integrations)
- Phase 3: Add Zod for type-safe validation
- Phase 3: Add DOMPurify for enterprise security

---

**Document Version**: 1.0  
**Last Updated**: 2026-04-22  
**Status**: Complete ✅
