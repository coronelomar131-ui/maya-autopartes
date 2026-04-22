/**
 * Excel Mapper Test Suite
 * Pruebas para validar mapeo bidireccional Excel ↔ App
 *
 * Uso: node test-mapper.js
 */

import ExcelMapper from './excel-mapper.js';

// ════════════════════════════════════════════════════════════════
// TEST UTILITIES
// ════════════════════════════════════════════════════════════════

let testsRun = 0;
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEquals(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`Expected ${expected}, got ${actual}. ${message || ''}`);
  }
}

function test(name, fn) {
  testsRun++;
  try {
    fn();
    testsPassed++;
    console.log(`✅ ${name}`);
  } catch (error) {
    testsFailed++;
    console.error(`❌ ${name}`);
    console.error(`   ${error.message}`);
  }
}

// ════════════════════════════════════════════════════════════════
// TESTS: MAPEO BÁSICO
// ════════════════════════════════════════════════════════════════

console.log('\n📋 TESTS: MAPEO BÁSICO\n');

test('Mapear fila Excel válida', () => {
  const excelRow = {
    'ID': 'ma_123',
    'Número Factura': 'F001',
    'Cliente': 'Cliente A',
    'Fecha': '2026-04-22',
    'Neto': '1000',
    'IVA': '160',
    'Total': '1160'
  };

  const appData = ExcelMapper.mapFromExcel(excelRow);

  assertEquals(appData.id, 'ma_123', 'ID debe mapear');
  assertEquals(appData.numero, 'F001', 'Número debe mapear');
  assertEquals(appData.cliente, 'Cliente A', 'Cliente debe mapear');
  assertEquals(appData.neto, 1000, 'Neto debe ser número');
  assertEquals(appData.total, 1160, 'Total debe ser número');
  assert(appData.createdAt instanceof Date, 'Debe tener createdAt');
  assert(appData.updatedAt instanceof Date, 'Debe tener updatedAt');
});

test('Mapear fila Excel a formato Excel inverso', () => {
  const appData = {
    id: 'ma_123',
    numero: 'F001',
    cliente: 'Cliente A',
    fecha: new Date('2026-04-22'),
    neto: 1000,
    iva: 160,
    total: 1160
  };

  const excelRow = ExcelMapper.mapToExcel(appData);

  assertEquals(excelRow['ID'], 'ma_123', 'ID debe mapear');
  assertEquals(excelRow['Número Factura'], 'F001', 'Número debe mapear');
  assertEquals(excelRow['Cliente'], 'Cliente A', 'Cliente debe mapear');
  assertEquals(excelRow['Neto'], 1000, 'Neto debe ser número');
  assertEquals(excelRow['Fecha'], '2026-04-22', 'Fecha debe ser ISO string');
});

// ════════════════════════════════════════════════════════════════
// TESTS: CONVERSIÓN DE TIPOS
// ════════════════════════════════════════════════════════════════

console.log('\n🔄 TESTS: CONVERSIÓN DE TIPOS\n');

test('Convertir string a número', () => {
  const result = ExcelMapper.convertValue('1000.50', 'number');
  assertEquals(result, 1000.50, 'Debe convertir a número');
});

test('Convertir currency con formato especial', () => {
  const result = ExcelMapper.convertValue('$1,000.50', 'currency');
  assertEquals(result, 1000.50, 'Debe quitar símbolo y comas');
});

test('Convertir a integer (descartar decimales)', () => {
  const result = ExcelMapper.convertValue('5.9', 'integer');
  assertEquals(result, 5, 'Debe truncar decimales');
});

test('Convertir fecha a Date', () => {
  const result = ExcelMapper.convertValue('2026-04-22', 'date');
  assert(result instanceof Date, 'Debe ser Date');
  assert(!isNaN(result.getTime()), 'Debe ser Date válida');
});

test('Convertir boolean de string', () => {
  assertEquals(ExcelMapper.convertValue('Sí', 'boolean'), true, 'Sí = true');
  assertEquals(ExcelMapper.convertValue('true', 'boolean'), true, 'true = true');
  assertEquals(ExcelMapper.convertValue('1', 'boolean'), true, '1 = true');
  assertEquals(ExcelMapper.convertValue('No', 'boolean'), false, 'No = false');
  assertEquals(ExcelMapper.convertValue('false', 'boolean'), false, 'false = false');
});

test('Formatear para Excel', () => {
  assertEquals(ExcelMapper.formatForExcel(1500.99, 'currency'), '1500.99', 'Currency');
  assertEquals(ExcelMapper.formatForExcel(true, 'boolean'), 'Sí', 'Boolean true');
  assertEquals(ExcelMapper.formatForExcel(false, 'boolean'), 'No', 'Boolean false');
  assertEquals(ExcelMapper.formatForExcel(5.9, 'integer'), 5, 'Integer');
  assertEquals(ExcelMapper.formatForExcel(new Date('2026-04-22'), 'date'), '2026-04-22', 'Date');
});

// ════════════════════════════════════════════════════════════════
// TESTS: VALIDACIÓN
// ════════════════════════════════════════════════════════════════

console.log('\n✅ TESTS: VALIDACIÓN\n');

test('Validar datos válidos', () => {
  const appData = {
    id: 'ma_123',
    numero: 'F001',
    cliente: 'Cliente A',
    fecha: new Date('2026-04-22'),
    neto: 1000,
    total: 1160
  };

  const result = ExcelMapper.validateAppData(appData);
  assertEquals(result, true, 'Debe ser válido');
});

test('Rechazar datos sin campos requeridos', () => {
  const invalidData = {
    numero: 'F001',
    // Falta id, cliente, fecha, neto, total
  };

  try {
    ExcelMapper.validateAppData(invalidData);
    throw new Error('Debería haber lanzado error');
  } catch (error) {
    assert(
      error.message.includes('requerido'),
      'Error debe mencionar campo requerido'
    );
  }
});

test('Validar formato Excel correcto', () => {
  const excelData = [
    {
      'ID': 'ma_1',
      'Número Factura': 'F001',
      'Cliente': 'A',
      'Fecha': '2026-04-22',
      'Neto': '1000',
      'Total': '1160'
    }
  ];

  const result = ExcelMapper.validateExcelFormat(excelData);
  assertEquals(result, true, 'Debe ser formato válido');
});

test('Rechazar Excel vacío', () => {
  try {
    ExcelMapper.validateExcelFormat([]);
    throw new Error('Debería haber lanzado error');
  } catch (error) {
    assert(error.message.includes('vacío'), 'Error debe mencionar Excel vacío');
  }
});

// ════════════════════════════════════════════════════════════════
// TESTS: DETECCIÓN DE CAMBIOS
// ════════════════════════════════════════════════════════════════

console.log('\n🔍 TESTS: DETECCIÓN DE CAMBIOS\n');

test('Detectar cambios en campos', () => {
  const oldData = { cliente: 'A', total: 1000 };
  const newData = { cliente: 'B', total: 1200 };

  const changes = ExcelMapper.detectFieldChanges(oldData, newData);

  assert('cliente' in changes, 'Debe detectar cambio en cliente');
  assert('total' in changes, 'Debe detectar cambio en total');
  assertEquals(changes.cliente.old, 'A', 'Debe guardar valor anterior');
  assertEquals(changes.cliente.new, 'B', 'Debe guardar valor nuevo');
});

test('Detectar cambios en lote', () => {
  const oldArray = [
    { id: '1', cliente: 'A' },
    { id: '2', cliente: 'B' }
  ];

  const newArray = [
    { id: '1', cliente: 'A' },  // Sin cambios
    { id: '2', cliente: 'B-MODIFIED' },  // Modificado
    { id: '3', cliente: 'C' }  // Nuevo
  ];

  const changes = ExcelMapper.detectBatchChanges(oldArray, newArray);

  assertEquals(changes.created.length, 1, 'Debe detectar 1 creado');
  assertEquals(changes.updated.length, 1, 'Debe detectar 1 actualizado');
  assertEquals(changes.deleted.length, 0, 'Debe detectar 0 eliminados');
});

test('Detectar datos eliminados', () => {
  const oldArray = [
    { id: '1', cliente: 'A' },
    { id: '2', cliente: 'B' }
  ];

  const newArray = [
    { id: '1', cliente: 'A' }
    // id: 2 eliminado
  ];

  const changes = ExcelMapper.detectBatchChanges(oldArray, newArray);

  assertEquals(changes.deleted.length, 1, 'Debe detectar 1 eliminado');
  assertEquals(changes.deleted[0].id, '2', 'Debe identificar el correcto');
});

// ════════════════════════════════════════════════════════════════
// TESTS: CASOS ESPECIALES
// ════════════════════════════════════════════════════════════════

console.log('\n🎯 TESTS: CASOS ESPECIALES\n');

test('Manejar campos opcionales con defaults', () => {
  const excelRow = {
    'ID': 'ma_123',
    'Número Factura': 'F001',
    'Cliente': 'Cliente A',
    'Fecha': '2026-04-22',
    'Neto': '1000',
    'IVA': '',  // Vacío
    'Total': '1160'
  };

  const appData = ExcelMapper.mapFromExcel(excelRow);
  assertEquals(appData.iva, 0, 'IVA debe usar default 0');
});

test('Trimear strings automáticamente', () => {
  const excelRow = {
    'ID': '  ma_123  ',
    'Número Factura': 'F001',
    'Cliente': '  Cliente A  ',
    'Fecha': '2026-04-22',
    'Neto': '1000',
    'Total': '1160'
  };

  const appData = ExcelMapper.mapFromExcel(excelRow);
  assertEquals(appData.id, 'ma_123', 'ID debe estar trimmed');
  assertEquals(appData.cliente, 'Cliente A', 'Cliente debe estar trimmed');
});

test('Generar ID único si no existe', () => {
  const excelRow = {
    'ID': '',  // Vacío
    'Número Factura': 'F001',
    'Cliente': 'Cliente A',
    'Fecha': '2026-04-22',
    'Neto': '1000',
    'Total': '1160'
  };

  const appData = ExcelMapper.mapFromExcel(excelRow);
  assert(appData.id, 'ID debe generarse automáticamente');
  assert(appData.id.startsWith('ma_'), 'ID debe tener prefijo ma_');
});

test('Manejar fechas en diferentes formatos', () => {
  const formats = [
    '2026-04-22',
    '2026/04/22',
    '22-04-2026'
  ];

  for (const format of formats) {
    const result = ExcelMapper.convertValue(format, 'date');
    assert(result instanceof Date, `Debe parsear ${format}`);
  }
});

test('Sanitizar datos peligrosos', () => {
  const dirty = '<script>alert("xss")</script>Cliente';
  const clean = ExcelMapper.sanitizeData(dirty);
  assert(!clean.includes('<'), 'Debe quitar caracteres peligrosos');
  assert(!clean.includes('>'), 'Debe quitar caracteres peligrosos');
});

// ════════════════════════════════════════════════════════════════
// TESTS: MAPEO MÚLTIPLE
// ════════════════════════════════════════════════════════════════

console.log('\n📦 TESTS: MAPEO MÚLTIPLE\n');

test('Mapear múltiples filas de Excel', () => {
  const excelRows = [
    {
      'ID': 'ma_1',
      'Número Factura': 'F001',
      'Cliente': 'A',
      'Fecha': '2026-04-22',
      'Neto': '1000',
      'Total': '1160'
    },
    {
      'ID': 'ma_2',
      'Número Factura': 'F002',
      'Cliente': 'B',
      'Fecha': '2026-04-22',
      'Neto': '2000',
      'Total': '2320'
    }
  ];

  const mapped = ExcelMapper.mapMultipleFromExcel(excelRows);
  assertEquals(mapped.length, 2, 'Debe mapear 2 filas');
  assertEquals(mapped[0].id, 'ma_1', 'Primer ID correcto');
  assertEquals(mapped[1].id, 'ma_2', 'Segundo ID correcto');
});

test('Manejar filas inválidas en batch', () => {
  const excelRows = [
    {
      'ID': 'ma_1',
      'Número Factura': 'F001',
      'Cliente': 'A',
      'Fecha': '2026-04-22',
      'Neto': '1000',
      'Total': '1160'
    },
    {
      'ID': '',  // Inválida
      'Número Factura': 'F002'
      // Faltan campos requeridos
    },
    {
      'ID': 'ma_3',
      'Número Factura': 'F003',
      'Cliente': 'C',
      'Fecha': '2026-04-22',
      'Neto': '3000',
      'Total': '3480'
    }
  ];

  const mapped = ExcelMapper.mapMultipleFromExcel(excelRows);
  assertEquals(mapped.length, 2, 'Debe filtrar filas inválidas');
  assertEquals(mapped[0].numero, 'F001', 'Primera fila correcta');
  assertEquals(mapped[1].numero, 'F003', 'Segunda fila correcta');
});

// ════════════════════════════════════════════════════════════════
// TESTS: EXPORTACIÓN
// ════════════════════════════════════════════════════════════════

console.log('\n💾 TESTS: EXPORTACIÓN\n');

test('Exportar a CSV', () => {
  const appData = [
    {
      id: 'ma_1',
      numero: 'F001',
      cliente: 'Cliente A',
      fecha: new Date('2026-04-22'),
      neto: 1000,
      total: 1160
    }
  ];

  const csv = ExcelMapper.exportAsCSV(appData);
  assert(csv.includes('ma_1'), 'CSV debe contener datos');
  assert(csv.includes('F001'), 'CSV debe contener todos los campos');
  assert(csv.includes('\n'), 'CSV debe tener saltos de línea');
});

// ════════════════════════════════════════════════════════════════
// RESULTS
// ════════════════════════════════════════════════════════════════

console.log('\n' + '═'.repeat(50));
console.log(`
📊 RESULTADOS DE PRUEBAS

Total:   ${testsRun}
✅ Pasadas:  ${testsPassed}
❌ Fallidas: ${testsFailed}

${testsFailed === 0 ? '🎉 ¡TODAS LAS PRUEBAS PASARON!' : '⚠️ ALGUNAS PRUEBAS FALLARON'}
`);
console.log('═'.repeat(50) + '\n');

// Exit code
process.exit(testsFailed > 0 ? 1 : 0);
