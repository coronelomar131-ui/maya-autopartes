/**
 * meli-mapper.js - Mapeo de Productos Local ↔ MercadoLibre
 * ═════════════════════════════════════════════════════════════════
 *
 * Responsabilidades:
 * ✓ Convertir producto local al formato MercadoLibre
 * ✓ Convertir respuesta MELI al formato local
 * ✓ Mapeo automático de categorías
 * ✓ Mapeo de atributos y variantes
 * ✓ Validación de datos
 * ✓ Manejo de imágenes
 * ✓ Caché de categorías MELI
 *
 * MercadoLibre Product Specification:
 * https://developers.mercadolibre.com/es_mx/items-and-listings
 *
 * @version 1.0.0
 * @last-update 2026-04-22
 */

// ═════════════════════════════════════════════════════════════════
// CATEGORÍAS: Mapeo Local → MercadoLibre
// ═════════════════════════════════════════════════════════════════

const CATEGORY_MAP = {
  // Puertas de Autos (Primary category for Maya Autopartes)
  'puertas_autos': 'MLM6055',        // Puertas para Auto - MX
  'cristales': 'MLM6056',              // Cristales y Vidrios
  'marcos_puertas': 'MLM6057',         // Marcos y Herrería
  'espejos': 'MLM6058',                // Espejos Laterales
  'manijas': 'MLM6059',                // Manijas y Cerraduras
  'accesorios_puertas': 'MLM6060',     // Accesorios Generales

  // Alternativas
  'autopartes': 'MLM6054',             // Autopartes General
  'carroceria': 'MLM6200',             // Carrocería
  'repuestos': 'MLM6055',              // Repuestos Auto
};

// ─── Atributos MELI por Categoría ───
const CATEGORY_ATTRIBUTES = {
  'MLM6055': {
    // Puertas
    attributes: ['BRAND', 'MODEL', 'YEAR', 'COLOR', 'POSITION'],
    brand: 'Genérica',
    model: 'Estándar',
    year: 2020,
    color: 'Sin Color',
    position: 'Delantera Izquierda',
  },
  'MLM6056': {
    // Cristales
    attributes: ['BRAND', 'COLOR', 'POSITION'],
    brand: 'Genérica',
    color: 'Transparente',
    position: 'Delantera Izquierda',
  },
};

// ═════════════════════════════════════════════════════════════════
// CACHE DE CATEGORÍAS
// ═════════════════════════════════════════════════════════════════

const STORAGE_KEY_CATS = 'ma4_meli_categories';

let categoryCache = {
  data: {},
  lastUpdate: 0,
  expiresIn: 24 * 60 * 60 * 1000, // 24 horas
};

/**
 * Cargar categorías desde caché local
 */
function loadCategoryCache() {
  try {
    const cached = localStorage.getItem(STORAGE_KEY_CATS);
    if (cached) {
      categoryCache = JSON.parse(cached);
    }
  } catch (e) {
    console.error('Error loading category cache:', e);
  }
}

/**
 * Guardar caché de categorías
 */
function saveCategoryCache() {
  try {
    localStorage.setItem(STORAGE_KEY_CATS, JSON.stringify(categoryCache));
  } catch (e) {
    console.error('Error saving category cache:', e);
  }
}

/**
 * Obtener ID de categoría MELI para categoría local
 */
function getMeliCategoryId(localCategory) {
  const categoryKey = (localCategory || 'puertas_autos').toLowerCase().replace(/\s+/g, '_');

  return CATEGORY_MAP[categoryKey] || CATEGORY_MAP['puertas_autos'];
}

/**
 * Obtener atributos requeridos para una categoría MELI
 */
function getAttributesForCategory(meliCategoryId) {
  return CATEGORY_ATTRIBUTES[meliCategoryId] || {};
}

// ═════════════════════════════════════════════════════════════════
// MAPEO: LOCAL → MERCADOLIBRE
// ═════════════════════════════════════════════════════════════════

/**
 * Convertir producto local a formato MercadoLibre
 * @param {Object} localProduct - Producto del app local
 * @returns {Object} Producto formateado para API MELI
 */
function mapLocalToMeli(localProduct) {
  if (!localProduct) throw new Error('Invalid product');

  const meliCategoryId = getMeliCategoryId(localProduct.categoria);
  const attributes = getAttributesForCategory(meliCategoryId);

  const meliProduct = {
    // Información básica
    title: normalizeTitle(localProduct.nombre),
    category_id: meliCategoryId,
    official_store_id: localProduct.official_store_id || undefined,

    // Precio y disponibilidad
    price: parseFloat(localProduct.precio) || 0,
    currency_id: 'MXN',
    available_quantity: parseInt(localProduct.stock) || 0,
    buying_mode: 'buy_it_now',
    listing_type_id: 'gold_special',

    // Descripción
    description: formatDescription(localProduct),

    // SKU y referencias
    seller_sku: localProduct.sku || generateSku(localProduct),

    // Atributos
    attributes: buildAttributes(localProduct, attributes),

    // Imágenes
    pictures: buildPictures(localProduct),

    // Configuración
    condition: 'new',
    sale_terms: [
      {
        id: 'SHIPPING',
        name: 'Envío',
        value_name: localProduct.envio_gratis ? 'Gratis' : 'A cargo del comprador',
      },
      {
        id: 'RETURNS',
        name: 'Devoluciones',
        value_name: '7 días',
      },
    ],

    // Metadatos
    tags: ['mejor_precio', 'auto_repuesto'],
  };

  // Limpiar undefined
  return cleanObject(meliProduct);
}

/**
 * Normalizar título para MELI
 * - Máximo 60 caracteres
 * - Sin caracteres especiales
 * - Formato: "Nombre - Atributos"
 */
function normalizeTitle(title) {
  if (!title) return 'Producto Sin Nombre';

  const cleaned = title
    .replace(/[^\w\s\-áéíóú]/gi, '')
    .trim();

  // Limitar a 60 caracteres
  return cleaned.substring(0, 60);
}

/**
 * Construir descripción para MELI
 */
function formatDescription(product) {
  const parts = [];

  if (product.nombre) {
    parts.push(`**${product.nombre}**\n`);
  }

  if (product.notas) {
    parts.push(`${product.notas}\n`);
  }

  // Especificaciones
  const specs = [];
  if (product.sku) specs.push(`SKU: ${product.sku}`);
  if (product.categoria) specs.push(`Categoría: ${product.categoria}`);
  if (product.costo) specs.push(`Costo: $${product.costo}`);
  if (product.min) specs.push(`Stock Mínimo: ${product.min}`);
  if (product.max) specs.push(`Stock Máximo: ${product.max}`);

  if (specs.length > 0) {
    parts.push('\nEspecificaciones:\n');
    parts.push(specs.join('\n'));
  }

  parts.push('\n\nCompra con confianza en Maya Autopartes - Venta de puertas y accesorios de auto');

  return parts.join('').substring(0, 4000); // Máximo de MELI
}

/**
 * Construir array de atributos MELI
 */
function buildAttributes(product, categoryAttrs) {
  const attributes = [];

  // Atributos estándar por categoría
  if (categoryAttrs.attributes) {
    for (const attrName of categoryAttrs.attributes) {
      const value = categoryAttrs[attrName.toLowerCase()] || getDefaultAttributeValue(attrName);

      attributes.push({
        id: attrName,
        name: formatAttributeName(attrName),
        value_id: String(value).toUpperCase(),
        value_name: String(value),
      });
    }
  }

  // Atributos adicionales del producto
  if (product.variantes && Array.isArray(product.variantes)) {
    for (const variant of product.variantes) {
      attributes.push({
        id: variant.atributo_id || 'CUSTOM',
        name: variant.nombre || 'Atributo Personalizado',
        value_name: variant.valor,
      });
    }
  }

  return attributes;
}

/**
 * Construir array de imágenes para MELI
 */
function buildPictures(product) {
  const pictures = [];

  // Imagen por defecto
  if (product.imagen) {
    pictures.push({
      source: product.imagen,
    });
  }

  // Imágenes adicionales
  if (product.imagenes && Array.isArray(product.imagenes)) {
    for (const img of product.imagenes) {
      if (img) {
        pictures.push({
          source: img,
        });
      }
    }
  }

  // Imagen por defecto si no hay ninguna
  if (pictures.length === 0) {
    pictures.push({
      source: 'https://via.placeholder.com/500?text=Sin+Imagen',
    });
  }

  return pictures;
}

/**
 * Generar SKU automático si no existe
 */
function generateSku(product) {
  const date = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();

  return `MA-${date}-${random}`;
}

/**
 * Obtener valor por defecto para atributo
 */
function getDefaultAttributeValue(attrName) {
  const defaults = {
    BRAND: 'Genérica',
    COLOR: 'Transparente',
    YEAR: 2020,
    CONDITION: 'Nuevo',
    MODEL: 'Estándar',
    POSITION: 'Delantera Izquierda',
  };

  return defaults[attrName] || 'N/A';
}

/**
 * Formatear nombre de atributo para lectura
 */
function formatAttributeName(attrId) {
  const names = {
    BRAND: 'Marca',
    COLOR: 'Color',
    YEAR: 'Año',
    MODEL: 'Modelo',
    POSITION: 'Posición',
    CONDITION: 'Condición',
  };

  return names[attrId] || attrId;
}

// ═════════════════════════════════════════════════════════════════
// MAPEO: MERCADOLIBRE → LOCAL
// ═════════════════════════════════════════════════════════════════

/**
 * Convertir producto MELI a formato local
 * @param {Object} meliProduct - Producto de respuesta MELI
 * @returns {Object} Producto en formato local
 */
function mapMeliToLocal(meliProduct) {
  if (!meliProduct) throw new Error('Invalid MELI product');

  const localProduct = {
    id: generateLocalId(meliProduct.id),
    nombre: meliProduct.title || 'Sin Nombre',
    sku: meliProduct.seller_sku || meliProduct.id,
    precio: meliProduct.price || 0,
    stock: meliProduct.available_quantity || 0,
    costo: 0, // MELI no proporciona costo
    categoria: reverseCategoryMap(meliProduct.category_id),
    min: 0,
    max: 999,
    notas: extractNotesFromDescription(meliProduct.description),
    imagen: getFirstImageUrl(meliProduct.pictures),
    imagenes: getAllImageUrls(meliProduct.pictures),
    variantes: extractVariantes(meliProduct.attributes),
    meliId: meliProduct.id,
    meliSyncedAt: new Date().toISOString(),
    syncMeli: true,
  };

  return localProduct;
}

/**
 * Generar ID local único basado en ID MELI
 */
function generateLocalId(meliId) {
  return `meli_${meliId}_${Date.now()}`;
}

/**
 * Mapeo inverso: MELI Category → Local Category
 */
function reverseCategoryMap(meliCategoryId) {
  for (const [local, meli] of Object.entries(CATEGORY_MAP)) {
    if (meli === meliCategoryId) {
      return local.replace(/_/g, ' ').toUpperCase();
    }
  }

  return 'Accesorios Auto';
}

/**
 * Extraer notas de la descripción MELI
 */
function extractNotesFromDescription(description) {
  if (!description) return '';

  // Tomar primeras 2 líneas
  const lines = description.split('\n').slice(0, 2);

  return lines.join(' ').substring(0, 200);
}

/**
 * Obtener primera imagen
 */
function getFirstImageUrl(pictures) {
  if (!pictures || pictures.length === 0) return '';

  const first = pictures[0];
  return first.url || first.source || '';
}

/**
 * Obtener todas las URLs de imágenes
 */
function getAllImageUrls(pictures) {
  if (!pictures) return [];

  return pictures
    .map(p => p.url || p.source)
    .filter(url => url);
}

/**
 * Extraer variantes de atributos MELI
 */
function extractVariantes(attributes) {
  if (!attributes) return [];

  // Filtrar atributos que podrían ser variantes
  const variantAttributes = ['COLOR', 'YEAR', 'MODEL', 'SIZE'];

  const variantes = [];
  for (const attr of attributes) {
    if (variantAttributes.includes(attr.id)) {
      variantes.push({
        atributo_id: attr.id,
        nombre: attr.name,
        valor: attr.value_name,
      });
    }
  }

  return variantes;
}

// ═════════════════════════════════════════════════════════════════
// VALIDACIÓN
// ═════════════════════════════════════════════════════════════════

/**
 * Validar que producto local sea sincronizable
 */
function validateLocalProduct(product) {
  const errors = [];

  if (!product.nombre || product.nombre.trim().length === 0) {
    errors.push('Nombre requerido');
  }

  if (typeof product.precio !== 'number' || product.precio <= 0) {
    errors.push('Precio debe ser número positivo');
  }

  if (typeof product.stock !== 'number' || product.stock < 0) {
    errors.push('Stock debe ser número >= 0');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validar que producto MELI sea importable
 */
function validateMeliProduct(product) {
  const errors = [];

  if (!product.id) {
    errors.push('ID MELI requerido');
  }

  if (!product.title) {
    errors.push('Título requerido');
  }

  if (product.price === undefined || product.price === null) {
    errors.push('Precio requerido');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

// ═════════════════════════════════════════════════════════════════
// UTILIDADES
// ═════════════════════════════════════════════════════════════════

/**
 * Limpiar objeto de propiedades undefined
 */
function cleanObject(obj) {
  const cleaned = {};

  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined && value !== null && value !== '') {
      if (typeof value === 'object' && !Array.isArray(value)) {
        cleaned[key] = cleanObject(value);
      } else if (Array.isArray(value)) {
        cleaned[key] = value.map(item =>
          typeof item === 'object' ? cleanObject(item) : item
        );
      } else {
        cleaned[key] = value;
      }
    }
  }

  return cleaned;
}

/**
 * Detectar cambios entre dos productos
 */
function detectChanges(oldProduct, newProduct) {
  const changes = {};

  const fieldsToCheck = ['nombre', 'precio', 'stock', 'categoria', 'sku', 'notas'];

  for (const field of fieldsToCheck) {
    if (oldProduct[field] !== newProduct[field]) {
      changes[field] = {
        old: oldProduct[field],
        new: newProduct[field],
      };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}

/**
 * Calcular diferencia de precios (para alertas)
 */
function getPriceWarning(localPrice, meliPrice) {
  if (!localPrice || !meliPrice) return null;

  const diff = Math.abs(localPrice - meliPrice);
  const percentDiff = (diff / localPrice) * 100;

  if (percentDiff > 10) {
    return {
      severity: percentDiff > 25 ? 'high' : 'medium',
      message: `Diferencia de precio: ${percentDiff.toFixed(1)}%`,
      localPrice,
      meliPrice,
    };
  }

  return null;
}

// ═════════════════════════════════════════════════════════════════
// EXPORTAR FUNCIONES
// ═════════════════════════════════════════════════════════════════

if (typeof window !== 'undefined') {
  window.MELI_MAPPER = {
    mapLocalToMeli,
    mapMeliToLocal,
    getMeliCategoryId,
    validateLocalProduct,
    validateMeliProduct,
    detectChanges,
    getPriceWarning,
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    mapLocalToMeli,
    mapMeliToLocal,
    getMeliCategoryId,
    validateLocalProduct,
    validateMeliProduct,
    detectChanges,
    getPriceWarning,
    CATEGORY_MAP,
    generateSku,
    cleanObject,
  };
}

export {
  mapLocalToMeli,
  mapMeliToLocal,
  getMeliCategoryId,
  validateLocalProduct,
  validateMeliProduct,
  detectChanges,
  getPriceWarning,
  CATEGORY_MAP,
  generateSku,
  cleanObject,
  loadCategoryCache,
  saveCategoryCache,
};
