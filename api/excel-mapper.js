/**
 * Excel Mapper Module
 * ════════════════════════════════════════════════════════════════
 * Mapeo bidireccional entre estructuras Excel y datos de App
 * Incluye: validación de formato, conversión de tipos, mapeo de columnas
 *
 * @version 1.0.0
 * @author Maya Autopartes Dev Team
 * @last-update 2026-04-22
 */

// ════════════════════════════════════════════════════════════════
// CONFIGURACIÓN DE MAPEO
// ════════════════════════════════════════════════════════════════

const COLUMN_MAPPING = {
  // Excel → App
  'ID': 'id',
  'Número Factura': 'numero',
  'Cliente': 'cliente',
  'Fecha': 'fecha',
  'Neto': 'neto',
  'IVA': 'iva',
  'Total': 'total',
  'Saldo': 'saldo',
  'Producto': 'producto',
  'Marca': 'marca',
  'Piezas': 'piezas',
  'OC': 'oc',
  'Reporte': 'reporte',
  'Guía': 'guia',
  'Link': 'link',
  'Estatus': 'estatus',
  'Días Vencidos': 'diasVencidos',
  'Fecha Pago': 'fechaPago',
  'Vendedor': 'vendedor',
  'Notas': 'notas',
  'Activo': 'activo'
};

// Mapeo inverso (App → Excel)
const REVERSE_MAPPING = Object.fromEntries(
  Object.entries(COLUMN_MAPPING).map(([excel, app]) => [app, excel])
);

// ════════════════════════════════════════════════════════════════
// TIPOS DE DATOS Y VALIDADORES
// ════════════════════════════════════════════════════════════════

const TYPE_VALIDATORS = {
  string: (val) => typeof val === 'string' ? val.trim() : String(val),
  number: (val) => isNaN(val) ? 0 : Number(val),
  date: (val) => {
    if (!val) return null;
    const date = new Date(val);
    return isNaN(date.getTime()) ? null : date;
  },
  boolean: (val) => {
    if (typeof val === 'boolean') return val;
    if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1';
    return Boolean(val);
  },
  currency: (val) => {
    const num = parseFloat(String(val).replace(/[^0-9.-]/g, ''));
    return isNaN(num) ? 0 : Math.round(num * 100) / 100;
  },
  integer: (val) => Math.floor(Number(val)) || 0
};

// Especificación de campos
const FIELD_SPECS = {
  id: { type: 'string', required: true, unique: true },
  numero: { type: 'string', required: true },
  cliente: { type: 'string', required: true },
  fecha: { type: 'date', required: true },
  neto: { type: 'currency', required: true },
  iva: { type: 'currency', required: false, default: 0 },
  total: { type: 'currency', required: true },
  saldo: { type: 'currency', required: false, default: 0 },
  producto: { type: 'string', required: false },
  marca: { type: 'string', required: false },
  piezas: { type: 'integer', required: false, default: 0 },
  oc: { type: 'string', required: false },
  reporte: { type: 'string', required: false },
  guia: { type: 'string', required: false },
  link: { type: 'string', required: false },
  estatus: { type: 'string', required: false, default: 'pendiente' },
  diasVencidos: { type: 'integer', required: false, default: 0 },
  fechaPago: { type: 'date', required: false },
  vendedor: { type: 'string', required: false },
  notas: { type: 'string', required: false },
  activo: { type: 'boolean', required: false, default: true },
  createdAt: { type: 'date', required: false },
  updatedAt: { type: 'date', required: false }
};

// ════════════════════════════════════════════════════════════════
// MAPEO EXCEL → APP
// ════════════════════════════════════════════════════════════════

/**
 * Mapear fila de Excel a objeto de app
 * @param {Object} excelRow - Fila del Excel
 * @returns {Object} Objeto con estructura de app
 */
function mapFromExcel(excelRow) {
  if (!excelRow || typeof excelRow !== 'object') {
    throw new Error('Fila de Excel inválida');
  }

  const appData = {};

  // Mapear cada columna
  for (const [excelCol, appField] of Object.entries(COLUMN_MAPPING)) {
    const value = excelRow[excelCol];
    const spec = FIELD_SPECS[appField];

    if (value === undefined || value === null || value === '') {
      // Usar valor por defecto si existe
      if (spec?.default !== undefined) {
        appData[appField] = spec.default;
      } else if (spec?.required) {
        throw new Error(`Campo requerido faltante: ${excelCol}`);
      }
    } else {
      // Convertir tipo
      try {
        appData[appField] = convertValue(value, spec?.type);
      } catch (error) {
        throw new Error(`Error en campo ${excelCol}: ${error.message}`);
      }
    }
  }

  // Validar estructura
  validateAppData(appData);

  // Agregar timestamps si no existen
  if (!appData.createdAt) {
    appData.createdAt = new Date();
  }
  appData.updatedAt = new Date();

  return appData;
}

/**
 * Mapear múltiples filas de Excel
 */
function mapMultipleFromExcel(excelRows) {
  return excelRows
    .map((row, index) => {
      try {
        return mapFromExcel(row);
      } catch (error) {
        console.warn(`⚠️ Error en fila ${index + 2}:`, error.message);
        return null;
      }
    })
    .filter(Boolean);
}

// ════════════════════════════════════════════════════════════════
// MAPEO APP → EXCEL
// ════════════════════════════════════════════════════════════════

/**
 * Mapear objeto de app a fila de Excel
 * @param {Object} appData - Objeto con datos de app
 * @returns {Object} Fila de Excel
 */
function mapToExcel(appData) {
  if (!appData || typeof appData !== 'object') {
    throw new Error('Datos de app inválidos');
  }

  const excelRow = {};

  // Mapear cada campo
  for (const [appField, excelCol] of Object.entries(REVERSE_MAPPING)) {
    const value = appData[appField];

    if (value !== undefined && value !== null) {
      try {
        excelRow[excelCol] = formatForExcel(value, FIELD_SPECS[appField]?.type);
      } catch (error) {
        console.warn(`⚠️ Error formateando ${appField}:`, error.message);
      }
    }
  }

  return excelRow;
}

/**
 * Mapear múltiples objetos de app
 */
function mapMultipleToExcel(appDataArray) {
  return appDataArray.map(data => mapToExcel(data));
}

// ════════════════════════════════════════════════════════════════
// CONVERSIÓN Y VALIDACIÓN DE TIPOS
// ════════════════════════════════════════════════════════════════

/**
 * Convertir valor al tipo especificado
 */
function convertValue(value, type) {
  if (!type || !TYPE_VALIDATORS[type]) {
    return value;
  }

  return TYPE_VALIDATORS[type](value);
}

/**
 * Formatear valor para Excel
 */
function formatForExcel(value, type) {
  if (value === null || value === undefined) {
    return '';
  }

  switch (type) {
    case 'date':
      return value instanceof Date
        ? value.toISOString().split('T')[0]
        : String(value);

    case 'currency':
      return Number(value).toFixed(2);

    case 'boolean':
      return value ? 'Sí' : 'No';

    case 'integer':
      return Math.floor(Number(value));

    default:
      return String(value);
  }
}

/**
 * Validar datos de app
 */
function validateAppData(appData) {
  // Validar campos requeridos
  for (const [field, spec] of Object.entries(FIELD_SPECS)) {
    if (spec.required && !appData[field]) {
      throw new Error(`Campo requerido: ${field}`);
    }
  }

  // Validar ID único (en contexto de app)
  if (!appData.id) {
    appData.id = generateId();
  }

  // Validar totales
  if (appData.neto && appData.iva && appData.total) {
    const calculated = parseFloat(appData.neto) + parseFloat(appData.iva);
    const expected = parseFloat(appData.total);
    const diff = Math.abs(calculated - expected);

    if (diff > 0.01) {
      console.warn(`⚠️ Total no coincide: ${calculated} vs ${expected}`);
    }
  }

  return true;
}

/**
 * Validar formato de Excel
 */
function validateExcelFormat(excelData) {
  if (!Array.isArray(excelData)) {
    throw new Error('Excel debe contener un array de datos');
  }

  if (excelData.length === 0) {
    throw new Error('Excel está vacío');
  }

  // Validar que tiene las columnas requeridas
  const requiredColumns = Object.keys(COLUMN_MAPPING);
  const firstRow = excelData[0];

  const missingColumns = requiredColumns.filter(col => !(col in firstRow));
  if (missingColumns.length > 0) {
    throw new Error(`Columnas faltantes: ${missingColumns.join(', ')}`);
  }

  return true;
}

// ════════════════════════════════════════════════════════════════
// DETECCIÓN DE CAMBIOS
// ════════════════════════════════════════════════════════════════

/**
 * Comparar dos objetos y detectar cambios
 */
function detectFieldChanges(oldData, newData) {
  const changes = {};
  const fields = new Set([
    ...Object.keys(oldData || {}),
    ...Object.keys(newData || {})
  ]);

  for (const field of fields) {
    const oldValue = oldData?.[field];
    const newValue = newData?.[field];

    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      changes[field] = {
        old: oldValue,
        new: newValue
      };
    }
  }

  return changes;
}

/**
 * Detectar cambios en múltiples registros
 */
function detectBatchChanges(oldArray, newArray) {
  const changes = {
    created: [],
    updated: [],
    deleted: []
  };

  const oldMap = new Map((oldArray || []).map(item => [item.id, item]));
  const newMap = new Map((newArray || []).map(item => [item.id, item]));

  // Detectar creados
  for (const [id, newItem] of newMap) {
    if (!oldMap.has(id)) {
      changes.created.push(newItem);
    }
  }

  // Detectar eliminados
  for (const [id, oldItem] of oldMap) {
    if (!newMap.has(id)) {
      changes.deleted.push(oldItem);
    }
  }

  // Detectar actualizados
  for (const [id, newItem] of newMap) {
    const oldItem = oldMap.get(id);
    if (oldItem && JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
      changes.updated.push({
        id,
        oldItem,
        newItem,
        fields: detectFieldChanges(oldItem, newItem)
      });
    }
  }

  return changes;
}

// ════════════════════════════════════════════════════════════════
// UTILIDADES
// ════════════════════════════════════════════════════════════════

/**
 * Generar ID único
 */
function generateId() {
  return `ma_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Obtener fila de encabezados Excel
 */
function getHeaderRow() {
  return Object.keys(COLUMN_MAPPING);
}

/**
 * Obtener mapeo actual
 */
function getColumnMapping() {
  return { ...COLUMN_MAPPING };
}

/**
 * Actualizar mapeo
 */
function updateColumnMapping(customMapping) {
  Object.assign(COLUMN_MAPPING, customMapping);
  // Recalcular mapeo inverso
  Object.assign(REVERSE_MAPPING, Object.fromEntries(
    Object.entries(COLUMN_MAPPING).map(([excel, app]) => [app, excel])
  ));
}

/**
 * Sanitizar datos
 */
function sanitizeData(data) {
  if (typeof data === 'string') {
    return data
      .trim()
      .replace(/[<>]/g, '') // Evitar XSS
      .slice(0, 1000); // Limitar longitud
  }

  if (Array.isArray(data)) {
    return data.map(item => sanitizeData(item));
  }

  if (typeof data === 'object' && data !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeData(value);
    }
    return sanitized;
  }

  return data;
}

/**
 * Exportar datos a formato CSV
 */
function exportAsCSV(appDataArray) {
  const headers = getHeaderRow();
  const rows = mapMultipleToExcel(appDataArray);

  const csv = [
    headers.join(','),
    ...rows.map(row =>
      headers.map(header =>
        formatCSVValue(row[header])
      ).join(',')
    )
  ].join('\n');

  return csv;
}

/**
 * Formatear valor para CSV
 */
function formatCSVValue(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

// ════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════

export default {
  // Mapeo
  mapFromExcel,
  mapToExcel,
  mapMultipleFromExcel,
  mapMultipleToExcel,

  // Validación
  validateAppData,
  validateExcelFormat,

  // Detección de cambios
  detectFieldChanges,
  detectBatchChanges,

  // Conversión
  convertValue,
  formatForExcel,

  // Headers
  getHeaderRow,

  // Configuración
  getColumnMapping,
  updateColumnMapping,

  // Utilidades
  generateId,
  sanitizeData,
  exportAsCSV,

  // Constantes
  COLUMN_MAPPING,
  REVERSE_MAPPING,
  FIELD_SPECS
};
