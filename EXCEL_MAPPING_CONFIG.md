# Excel Mapping Configuration

## Overview
Configuración del mapeo bidireccional entre columnas Excel y campos de la aplicación Maya Autopartes.

---

## Mapeo Actual de Columnas

### Tabla de Mapeo Completo

| Excel Column | App Field | Tipo | Requerido | Default | Descripción |
|--------------|-----------|------|-----------|---------|-------------|
| ID | id | string | ✓ | auto | Identificador único |
| Número Factura | numero | string | ✓ | - | Número de factura |
| Cliente | cliente | string | ✓ | - | Nombre del cliente |
| Fecha | fecha | date | ✓ | - | Fecha de factura (YYYY-MM-DD) |
| Neto | neto | currency | ✓ | - | Monto neto |
| IVA | iva | currency | - | 0 | Impuesto (16% típicamente) |
| Total | total | currency | ✓ | - | Neto + IVA |
| Saldo | saldo | currency | - | 0 | Monto pendiente de pago |
| Producto | producto | string | - | - | Descripción del producto |
| Marca | marca | string | - | - | Marca del producto |
| Piezas | piezas | integer | - | 0 | Cantidad de piezas |
| OC | oc | string | - | - | Orden de compra |
| Reporte | reporte | string | - | - | Número de reporte |
| Guía | guia | string | - | - | Número de guía de envío |
| Link | link | string | - | - | URL de referencia |
| Estatus | estatus | string | - | pendiente | Estado (pendiente/pagado/cancelado) |
| Días Vencidos | diasVencidos | integer | - | 0 | Días después de vencimiento |
| Fecha Pago | fechaPago | date | - | - | Fecha del pago |
| Vendedor | vendedor | string | - | - | Nombre del vendedor |
| Notas | notas | string | - | - | Notas adicionales |
| Activo | activo | boolean | - | true | Si está activo en sistema |

---

## Tipos de Datos Soportados

### string
Texto simple, se aplica `trim()` automáticamente.

```javascript
// Excel → App
'  Cliente A  ' → 'Cliente A'

// App → Excel
'Cliente A' → 'Cliente A'
```

### number
Números decimales, con conversión de string si es necesario.

```javascript
// Excel → App
'1500.50' → 1500.50
'1500' → 1500

// App → Excel
1500.50 → 1500.50
0 → 0
```

### currency
Números monetarios con precisión de 2 decimales.

```javascript
// Excel → App
'$1,500.99' → 1500.99
'1500.99' → 1500.99
'1500' → 1500.00

// App → Excel
1500.99 → 1500.99
1500 → 1500.00
```

### integer
Números enteros, descarta decimales.

```javascript
// Excel → App
'5.9' → 5
'5' → 5
'-3' → -3

// App → Excel
5.9 → 5
5 → 5
```

### date
Fechas en formato ISO (YYYY-MM-DD).

```javascript
// Excel → App
'2026-04-22' → Date(2026-04-22)
'2026/04/22' → Date(2026-04-22)
'22-04-2026' → Date(2026-04-22)

// App → Excel
Date(2026-04-22) → '2026-04-22'
'2026-04-22' → '2026-04-22'
```

### boolean
Valores lógicos (Sí/No, true/false, 1/0).

```javascript
// Excel → App
'Sí' → true
'true' → true
'1' → true
'No' → false
'false' → false
'0' → false

// App → Excel
true → 'Sí'
false → 'No'
```

---

## Personalizar Mapeo

### Cambiar Nombre de Columna Excel

Si quieres renombrar una columna en Excel:

```javascript
import ExcelMapper from './api/excel-mapper.js';

// Cambiar "Número Factura" a "Factura No."
ExcelMapper.updateColumnMapping({
  'Factura No.': 'numero',
  'Nombre Cliente': 'cliente'
});

// Ahora el Excel esperará estas columnas
```

### Agregar Campos Nuevos

Para agregar un nuevo campo (ej: "Descuento"):

#### 1. Actualizar COLUMN_MAPPING en excel-mapper.js

```javascript
const COLUMN_MAPPING = {
  // ... campos existentes ...
  'Descuento': 'descuento'  // Nuevo
};
```

#### 2. Agregar especificación de campo

```javascript
const FIELD_SPECS = {
  // ... campos existentes ...
  descuento: { 
    type: 'currency', 
    required: false, 
    default: 0 
  }
};
```

#### 3. Usar en la app

```javascript
// Ahora el mapeo funciona automáticamente
const data = ExcelMapper.mapFromExcel({
  'ID': 'ma_123',
  'Número Factura': 'F001',
  'Descuento': '100.00',
  // ... otros campos ...
});

console.log(data.descuento); // 100.00
```

### Eliminar Campos

```javascript
// En excel-mapper.js, comentar o eliminar:
// 'Link': 'link',

// La columna ya no se sincronizará
```

---

## Validación de Datos

### Reglas de Validación Automática

El módulo valida automáticamente:

1. **Campos requeridos**
   - Si falta `numero`, `cliente`, `fecha`, `total` → Error
   - Se rechaza la fila

2. **Tipos de datos**
   - Convierte automáticamente tipos
   - Si falla conversión → Valor default o error

3. **Integridad de totales**
   - Verifica: neto + iva = total
   - Si no coincide → Advertencia (no bloquea)

4. **Timestamps**
   - Agrega `createdAt` y `updatedAt` automáticamente
   - Los actualiza en cada sync

### Validación Personalizada

Para agregar reglas de validación:

```javascript
// En excel-mapper.js, extender validateAppData()

function validateAppData(appData) {
  // Validaciones predeterminadas...
  
  // Validación personalizada
  if (appData.cliente && appData.cliente.length > 100) {
    throw new Error('Cliente no puede exceder 100 caracteres');
  }
  
  if (appData.neto > 1000000) {
    console.warn('⚠️ Neto muy alto:', appData.neto);
  }
  
  if (appData.diasVencidos < 0) {
    throw new Error('Días vencidos no puede ser negativo');
  }
  
  return true;
}
```

---

## Manejo de Valores Vacíos

### Campos Requeridos
Si está vacío → Error en validación

```javascript
// Excel fila:
{ 'ID': '', 'Número Factura': 'F001', ... }

// Resultado:
❌ Error: Campo requerido faltante: ID
```

### Campos Opcionales
Si está vacío → Usa valor por defecto

```javascript
// Excel fila:
{ 'ID': 'ma_123', 'Número Factura': 'F001', 'IVA': '' }

// Resultado:
{ id: 'ma_123', numero: 'F001', iva: 0 }  // IVA = default (0)
```

### Valores Explícitos NULL
Usar celda vacía para omitir un campo:

```javascript
// Excel (celda vacía)
{ 'Nota': '' }

// App (omitido, no en objeto)
{ /* Sin campo 'notas' */ }
```

---

## Casos de Uso Especiales

### Caso 1: Sincronizar Precio Base y Descuentos

**Estructura:**
```
Neto = Precio Base - Descuento
IVA = Neto * 0.16
Total = Neto + IVA
```

**Mapeo:**
```javascript
FIELD_SPECS = {
  precioBase: { type: 'currency', required: true },
  descuento: { type: 'currency', required: false, default: 0 },
  neto: { type: 'currency', required: true },
  iva: { type: 'currency', required: false },
  total: { type: 'currency', required: true }
};

// En validación, calcular:
appData.neto = appData.precioBase - appData.descuento;
appData.iva = appData.neto * 0.16;
appData.total = appData.neto + appData.iva;
```

### Caso 2: Categorizar Estatus Automáticamente

**Valores Excel:** Pagado / Pendiente / Cancelado
**Valores App:** paid / pending / cancelled

```javascript
TYPE_VALIDATORS.estatus = (val) => {
  const mapping = {
    'Pagado': 'paid',
    'Pendiente': 'pending',
    'Cancelado': 'cancelled',
    'paid': 'paid',
    'pending': 'pending',
    'cancelled': 'cancelled'
  };
  return mapping[val] || 'pending';
};

// Inverso para Excel
function formatForExcel(value, type) {
  if (type === 'estatus') {
    const mapping = {
      'paid': 'Pagado',
      'pending': 'Pendiente',
      'cancelled': 'Cancelado'
    };
    return mapping[value] || value;
  }
  // ... otros tipos ...
}
```

### Caso 3: Fecha Automática

```javascript
// Si no viene fecha, usar hoy
if (!appData.fecha) {
  appData.fecha = new Date();
}

// Si no viene fechaPago pero estatus = paid
if (appData.estatus === 'paid' && !appData.fechaPago) {
  appData.fechaPago = new Date();
}
```

### Caso 4: Campos Calculados

```javascript
// Calcular días vencidos automáticamente
const daysOverdue = (fechaVencimiento) => {
  const vencimiento = new Date(fechaVencimiento);
  const today = new Date();
  const diff = today - vencimiento;
  return Math.floor(diff / (1000 * 60 * 60 * 24));
};

// Usar en mapeo
appData.diasVencidos = Math.max(0, daysOverdue(appData.fecha));
```

---

## Testing del Mapeo

### Test 1: Verificar Mapeo Básico

```javascript
import ExcelMapper from './api/excel-mapper.js';

// Crear fila Excel de ejemplo
const excelRow = {
  'ID': 'ma_123',
  'Número Factura': 'F001',
  'Cliente': 'Cliente A',
  'Fecha': '2026-04-22',
  'Neto': '1000',
  'IVA': '160',
  'Total': '1160',
  'Saldo': '0',
  'Estatus': 'Pagado'
};

// Mapear
const appData = ExcelMapper.mapFromExcel(excelRow);

// Verificar
console.assert(appData.id === 'ma_123');
console.assert(appData.numero === 'F001');
console.assert(appData.cliente === 'Cliente A');
console.assert(appData.neto === 1000);
console.assert(appData.total === 1160);
```

### Test 2: Verificar Mapeo Inverso

```javascript
// Usar datos del app
const appData = {
  id: 'ma_123',
  numero: 'F001',
  cliente: 'Cliente A',
  fecha: new Date('2026-04-22'),
  neto: 1000,
  iva: 160,
  total: 1160
};

// Mapear a Excel
const excelRow = ExcelMapper.mapToExcel(appData);

// Verificar
console.assert(excelRow['ID'] === 'ma_123');
console.assert(excelRow['Número Factura'] === 'F001');
console.assert(excelRow['Fecha'] === '2026-04-22');
```

### Test 3: Validación

```javascript
// Fila incompleta
const invalidRow = {
  'ID': '',  // Requerido
  'Número Factura': 'F001'
};

try {
  ExcelMapper.mapFromExcel(invalidRow);
  console.error('Debería haber lanzado error');
} catch (error) {
  console.log('✓ Validación correcta:', error.message);
}
```

---

## Troubleshooting

### Problema: Columnas no se reconocen

**Causa:** Nombres exactos no coinciden

**Solución:** Verificar Excel tiene exactamente:
- `ID`
- `Número Factura`
- `Cliente`
- etc.

```javascript
// Verificar mapeo actual
import ExcelMapper from './api/excel-mapper.js';
console.log(ExcelMapper.getColumnMapping());
```

### Problema: Fechas en formato incorrecto

**Causa:** Excel guarda en formato local (DD/MM/YYYY)

**Solución:** Formatea como ISO (YYYY-MM-DD)

```javascript
// En app, antes de enviar a Excel
const date = new Date('2026-04-22');
const isoDate = date.toISOString().split('T')[0]; // '2026-04-22'
```

### Problema: Números con comas

**Causa:** Separador decimal regional

**Solución:** El módulo lo maneja automáticamente

```javascript
// Ambos funcionan:
'1000.50' // formato US
'1000,50' // formato ES

// Se convierten a número automáticamente
```

### Problema: Campos adicionales ignorados

**Causa:** Columnas en Excel que no están en COLUMN_MAPPING

**Solución:** Agregar al mapeo si son necesarias, o dejarlas como está

```javascript
// Las columnas no mapeadas se ignoran silenciosamente
// Para incluirlas, agrega a COLUMN_MAPPING
```

---

## Performance Tips

1. **Usar tipos correctos**
   - `currency` vs `number`: currency es más preciso
   - `integer` para conteos

2. **Limitar campos opcionales**
   - Menos campos = más rápido
   - Usa defaults efectivos

3. **Batch operations**
   - Validar múltiples filas = más eficiente que una por una

4. **Cache de mapeo**
   - El módulo cachea el mapeo internamente
   - Cambios de mapeo requieren reload

---

## Migración de Datos Existentes

Si tienes Excel existente con estructura diferente:

### Step 1: Mapear Columnas Antiguas

```javascript
// Antes de sync, convertir
const oldExcelData = [
  { 'Fact#': 'F001', 'Cli': 'A', ... }
];

const converted = oldExcelData.map(row => ({
  'ID': generateId(),
  'Número Factura': row['Fact#'],
  'Cliente': row['Cli'],
  // ... mapeo de todos los campos
}));
```

### Step 2: Validar

```javascript
const mapped = converted.map(row => {
  try {
    return ExcelMapper.mapFromExcel(row);
  } catch (error) {
    console.warn('Fila inválida:', row, error);
    return null;
  }
}).filter(Boolean);
```

### Step 3: Crear Nuevo Excel

```javascript
import XLSX from 'xlsx';

const wb = XLSX.utils.book_new();
const ws = XLSX.utils.json_to_sheet(
  ExcelMapper.mapMultipleToExcel(mapped)
);
XLSX.utils.book_append_sheet(wb, ws, 'Inventario');
XLSX.writeFile(wb, 'Maya_Autopartes_Inventario.xlsx');
```

---

## Changelog

### v1.0.0 (2026-04-22)
- Inicial: Mapeo de 20 campos
- Validación automática
- Conversión de tipos
- Detección de cambios

---

**Versión:** 1.0.0  
**Última actualización:** 2026-04-22  
**Mantenedor:** Maya Autopartes Dev Team
