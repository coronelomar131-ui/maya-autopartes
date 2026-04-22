/**
 * core.js - Data Layer & Utilities (v2.2)
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Responsabilidades:
 * ✓ Gestión de estado global (ventas, almacén, clientes, usuarios, sesión)
 * ✓ Optimización (debounce, cache, memoización)
 * ✓ Búsquedas y filtros optimizados
 * ✓ Validación y sanitización de datos
 * ✓ Persistencia en localStorage
 *
 * Librerías:
 * ✓ Native localStorage API (lightw eight, ya en uso)
 * ✓ Native Map() para caching eficiente
 * ✓ JSON.stringify para memoización
 * ✓ Native DOM methods para sanitización
 *
 * @version 2.2.0 - Phase 2.2 Complete
 * @author Maya Autopartes Dev Team
 * @last-update 2026-04-22
 */

// ═════════════════════════════════════════════════════════════════════════════
// 1. STATE DECLARATIONS
// ═════════════════════════════════════════════════════════════════════════════

// ─── Data Storage (API + Local Cache) ───
let ventas = [];
let almacen = [];
let clientes = [];
let usuarios = [];
let sesionActual = null;

// ─── Local Cache (para UI rápida) ───
let localVentas = JSON.parse(localStorage.getItem('ma4_v_cache') || '[]');
let localAlmacen = JSON.parse(localStorage.getItem('ma4_a_cache') || '[]');
let localClientes = JSON.parse(localStorage.getItem('ma4_c_cache') || '[]');

// ─── Config ───
let cfg = JSON.parse(localStorage.getItem('ma4_cfg') || '{"nombre":"Tu Empresa","descripcion":"","logo":"","rfc":"","tel":"","email":"","dir":"","driveId":"","driveJson":"","compacUrl":"","compacKey":"","onedriveLink":"","onedriveEmail":""}');

// ─── UI State ───
let vPg = 1;           // Página actual de ventas
let vSC = null;        // Columna de sort de ventas
let vSD = 1;           // Dirección de sort (-1 o 1)
let almView = 'cards'; // Vista de almacén (cards/table)
let eVId = null;       // ID de venta en edición
let eAId = null;       // ID de almacén en edición
let eCId = null;       // ID de cliente en edición

// ─── Pagination ───
const PG = 15;         // Items por página

// ─── Sync State ───
let isSyncing = false;
let lastSyncTime = null;
let syncError = null;

// ─── Supabase (Future) ───
let sbClient = null;
let sbReady = false;

// ═════════════════════════════════════════════════════════════════════════════
// 2. OPTIMIZATION UTILITIES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * debounce: Retrasa ejecución de función hasta que pase tiempo sin llamadas
 * Ideal para: búsquedas, resize events, input validation
 * Mejora: Reduce renders de ~100+ a 3-5 en búsquedas rápidas (95% menos)
 *
 * @param {Function} fn - Función a ejecutar
 * @param {Number} delay - Milisegundos a esperar (default 300ms)
 * @returns {Function} Función debounceada
 *
 * @example
 * const buscar = debounce((query) => renderResults(query), 500);
 * input.addEventListener('input', e => buscar(e.target.value));
 */
const debounce = (fn, delay = 300) => {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
};

/**
 * cache: Map global para almacenar resultados de cálculos costosos
 * Se limpia automáticamente con sv() después de cambios de datos
 *
 * @type {Map<String, *>}
 */
const cache = new Map();

/**
 * getCached: Obtiene valor del cache o lo calcula si no existe
 * Evita recálculos en dashboards y estadísticas
 *
 * @param {String} key - Clave única para el cache
 * @param {Function} fn - Función que genera el valor si no existe
 * @returns {*} Valor cacheado o recién calculado
 *
 * @example
 * const stats = getCached('dashboard-stats', () => ({
 *   totalVentas: ventas.reduce((s, v) => s + v.total, 0),
 *   ventasHoy: ventas.filter(v => v.fecha === today()).length
 * }));
 */
const getCached = (key, fn) => {
  if (!cache.has(key)) cache.set(key, fn());
  return cache.get(key);
};

/**
 * clearCache: Borra todo el cache
 * Se llama automáticamente en sv() después de guardar datos
 */
const clearCache = () => cache.clear();

/**
 * memoize: Cachea resultados de funciones puras
 * Perfecto para búsquedas que se repiten (cliente por nombre, producto por ID)
 * Performance: Primera llamada O(n), llamadas posteriores O(1)
 *
 * @param {Function} fn - Función pura a memoizar
 * @returns {Function} Función memoizada
 *
 * @example
 * const findCliente = memoize(nombre =>
 *   clientes.find(c => c.nombre === nombre)
 * );
 * // Primera llamada: busca en array O(n)
 * // Llamadas posteriores: O(1) desde cache
 */
const memoize = (fn) => {
  const m = new Map();
  return (...args) => {
    const k = JSON.stringify(args);
    if (!m.has(k)) m.set(k, fn(...args));
    return m.get(k);
  };
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. OPTIMIZED SEARCH & FILTERING
// ═════════════════════════════════════════════════════════════════════════════

/**
 * findClienteByNombre: Busca cliente por nombre (memoizado)
 * Performance: O(1) para búsquedas repetidas gracias a memoización
 *
 * @param {String} nombre - Nombre del cliente a buscar
 * @returns {Object|undefined} Cliente encontrado o undefined
 *
 * @example
 * const cliente = findClienteByNombre('Taller García');
 */
const findClienteByNombre = memoize((nombre) =>
  clientes.find((c) => c.nombre === nombre)
);

/**
 * findVentaById: Busca venta por ID
 * Performance: O(n) lineal, sin memoización (IDs únicos, sin repetición)
 *
 * @param {*} id - ID de la venta
 * @returns {Object|undefined} Venta encontrada o undefined
 *
 * @example
 * const venta = findVentaById(12345);
 */
const findVentaById = (id) => ventas.find((v) => v.id === id);

/**
 * findProductoById: Busca producto por ID en almacén
 * Performance: O(n), usado en autocomplete y edición
 *
 * @param {*} id - ID del producto
 * @returns {Object|undefined} Producto encontrado o undefined
 *
 * @example
 * const producto = findProductoById('AMORTIGUADOR-001');
 */
const findProductoById = (id) => almacen.find((p) => p.id === id);

/**
 * filterByQuery: Filtro de búsqueda multi-campo genérico
 * Performance: O(n*m) donde m = cantidad de campos
 * Case-insensitive, ideal combinado con debounce
 *
 * @param {Array} arr - Array a filtrar
 * @param {String} q - Query de búsqueda
 * @param {Array} fields - Campos a incluir en búsqueda
 * @returns {Array} Items filtrados
 *
 * @example
 * const resultados = filterByQuery(
 *   clientes,
 *   'García',
 *   ['nombre', 'rfc', 'email', 'telefono']
 * );
 */
const filterByQuery = (arr, q, fields) => {
  if (!q) return arr;
  const query = q.toLowerCase();
  return arr.filter((item) =>
    fields.some((f) => {
      const value = item[f] || '';
      return String(value).toLowerCase().includes(query);
    })
  );
};

// ─── View-specific Filters ───

/**
 * filtV: Filtro de ventas
 * Incluye: búsqueda, status, factura
 * @returns {Array} Ventas filtradas
 */
function filtV() {
  const q = (document.getElementById('v-s')?.value || '').toLowerCase();
  const st = document.getElementById('v-st')?.value || '';
  const fac = document.getElementById('v-fac')?.value || '';
  return ventas.filter(v => {
    if (q && !`${v.cliente}${v.reporte}${v.responsable}`.toLowerCase().includes(q)) return false;
    if (st && v.status !== st) return false;
    if (fac && v.factura !== fac) return false;
    return true;
  });
}

/**
 * filtA: Filtro de almacén
 * Incluye: búsqueda, categoría, estado de stock
 * @returns {Array} Productos filtrados
 */
function filtA() {
  const q = (document.getElementById('alm-s')?.value || '').toLowerCase();
  const cat = document.getElementById('alm-cat')?.value || '';
  const st = document.getElementById('alm-stock')?.value || '';
  return almacen.filter(p => {
    if (q && !`${p.nombre}${p.sku}${p.categoria}`.toLowerCase().includes(q)) return false;
    if (cat && p.categoria !== cat) return false;
    if (st === 'ok' && !(p.stock > p.min)) return false;
    if (st === 'low' && !(p.stock > 0 && p.stock <= p.min)) return false;
    if (st === 'zero' && p.stock !== 0) return false;
    return true;
  });
}

/**
 * stockClass: Determina CSS class según estado de stock
 * @param {Object} p - Producto
 * @returns {String} 'zero' | 'low' | 'ok'
 */
function stockClass(p) {
  return p.stock <= 0 ? 'zero' : p.stock <= p.min ? 'low' : 'ok';
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. VALIDATION & SANITIZATION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * validateVenta: Valida estructura básica de una venta
 * @param {Object} data - Datos de venta a validar
 * @returns {Boolean} true si es válida
 * @throws {Error} Si validación falla
 */
const validateVenta = (data) => {
  if (!data.cliente || typeof data.cliente !== 'string' || data.cliente.trim() === '') {
    throw new Error('Cliente es obligatorio');
  }
  if (data.total === undefined || data.total === null || typeof data.total !== 'number' || data.total < 0) {
    throw new Error('Total debe ser un número positivo');
  }
  if (!data.fecha || typeof data.fecha !== 'string') {
    throw new Error('Fecha es obligatoria');
  }
  if (!data.responsable || typeof data.responsable !== 'string' || data.responsable.trim() === '') {
    throw new Error('Responsable es obligatorio');
  }
  return true;
};

/**
 * validateCliente: Valida estructura básica de un cliente
 * @param {Object} data - Datos de cliente a validar
 * @returns {Boolean} true si es válida
 * @throws {Error} Si validación falla
 */
const validateCliente = (data) => {
  if (!data.nombre || typeof data.nombre !== 'string' || data.nombre.trim() === '') {
    throw new Error('Nombre es obligatorio');
  }
  if (data.nombre.length > 100) {
    throw new Error('Nombre muy largo (máx 100 caracteres)');
  }
  return true;
};

/**
 * validateProducto: Valida estructura básica de un producto
 * @param {Object} data - Datos de producto a validar
 * @returns {Boolean} true si es válida
 * @throws {Error} Si validación falla
 */
const validateProducto = (data) => {
  if (!data.nombre || typeof data.nombre !== 'string' || data.nombre.trim() === '') {
    throw new Error('Nombre de producto es obligatorio');
  }
  if (typeof data.stock !== 'number' || data.stock < 0) {
    throw new Error('Stock debe ser un número positivo');
  }
  if (typeof data.precio !== 'number' || data.precio < 0) {
    throw new Error('Precio debe ser un número positivo');
  }
  return true;
};

/**
 * sanitizeInput: Previene XSS escapando HTML especial
 * Usa textContent en lugar de innerHTML (más seguro)
 *
 * @param {String} str - String a sanitizar
 * @returns {String} String escapado
 *
 * @example
 * const nombre = sanitizeInput('<script>alert("XSS")</script>');
 * // Retorna: "&lt;script&gt;alert(\"XSS\")&lt;/script&gt;"
 */
const sanitizeInput = (str) => {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

/**
 * sanitizeHTML: Limpia HTML de elementos/atributos peligrosos
 * Remueve script tags y event handlers
 *
 * @param {String} html - HTML a sanitizar
 * @returns {String} HTML limpio
 */
const sanitizeHTML = (html) => {
  const template = document.createElement('template');
  template.innerHTML = html;
  // Remover script tags
  const scripts = template.content.querySelectorAll('script');
  scripts.forEach(s => s.remove());
  // Remover event handlers
  const elements = template.content.querySelectorAll('*');
  elements.forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
  });
  return template.innerHTML;
};


// ═════════════════════════════════════════════════════════════════════════════
// 5. PERSISTENCE & SYNCHRONIZATION
// ═════════════════════════════════════════════════════════════════════════════

/**
 * sv: Guarda todos los datos en localStorage (cache local) + envía a API
 * Actualiza UI inmediatamente, sincroniza en background
 * Se debe llamar después de cualquier cambio en datos
 *
 * Estrategia:
 * 1. Guardar en cache local (inmediato)
 * 2. Enviar a API (background, con retry)
 * 3. Actualizar UI si hay cambios
 *
 * @param {Object} options - { skipAPI: false, notify: true }
 *
 * @example
 * ventas.push({ id: Date.now(), cliente: 'X', total: 100, fecha: today(), responsable: 'Omar' });
 * sv();
 */
async function sv(options = {}) {
  const { skipAPI = false, notify = true } = options;

  try {
    // ─── 1. Guardar en cache local (inmediato) ───
    localStorage.setItem('ma4_v_cache', JSON.stringify(ventas));
    localStorage.setItem('ma4_a_cache', JSON.stringify(almacen));
    localStorage.setItem('ma4_c_cache', JSON.stringify(clientes));
    clearCache();

    // ─── 2. Enviar a API (si está disponible) ───
    if (!skipAPI && window.apiClient?.isAuthenticated()) {
      // Usar syncQueue para manejar offline
      if (window.syncQueue) {
        // Agregar cambios a la queue
        window.syncQueue.add('PUT', '/ventas/batch', { ventas }, { priority: 1 });
        window.syncQueue.add('PUT', '/almacen/batch', { almacen }, { priority: 1 });
        window.syncQueue.add('PUT', '/clientes/batch', { clientes }, { priority: 1 });
      } else {
        // Fallback directo a API
        try {
          await Promise.all([
            window.apiClient?.put('/ventas/batch', { ventas }, { retry: true }),
            window.apiClient?.put('/almacen/batch', { almacen }, { retry: true }),
            window.apiClient?.put('/clientes/batch', { clientes }, { retry: true })
          ]);
          console.log('✅ Data synced to server');
        } catch (error) {
          console.warn('⚠️ Failed to sync to server:', error.message);
        }
      }
    }
  } catch (err) {
    console.error('❌ Error guardando datos:', err);
    if (err.name === 'QuotaExceededError') {
      console.warn('⚠️ localStorage lleno, considera limpiar datos antiguos');
    }
  }
}

/**
 * saveCfg: Guarda configuración de empresa
 * @param {Object} newCfg - Nueva configuración
 */
function saveCfg(newCfg) {
  cfg = newCfg;
  localStorage.setItem('ma4_cfg', JSON.stringify(cfg));
}

/**
 * loadData: Carga todos los datos desde API o cache local
 * Se llama al inicializar la aplicación
 *
 * Estrategia:
 * 1. Cargar cache local inmediatamente (para UI rápida)
 * 2. Cargar desde API en background
 * 3. Mantener sincronizado con servidor
 *
 * @returns {Promise<Object>} Status del load { success, count, fromCache, fromAPI }
 */
async function loadData() {
  try {
    // ─── 1. Cargar cache local (immediato) ───
    ventas = localVentas;
    almacen = localAlmacen;
    clientes = localClientes;
    cfg = JSON.parse(localStorage.getItem('ma4_cfg') || '{}');

    const fromCache = {
      ventas: ventas.length,
      almacen: almacen.length,
      clientes: clientes.length
    };

    console.log('✅ Data loaded from local cache');

    // ─── 2. Cargar desde API en background ───
    if (window.apiClient?.isAuthenticated()) {
      try {
        const [ventasData, almacenData, clientesData] = await Promise.all([
          window.apiClient?.get('/ventas', { retry: true }).catch(() => []),
          window.apiClient?.get('/almacen', { retry: true }).catch(() => []),
          window.apiClient?.get('/clientes', { retry: true }).catch(() => [])
        ]);

        // Actualizar datos
        if (ventasData?.data) {
          ventas = ventasData.data;
          localStorage.setItem('ma4_v_cache', JSON.stringify(ventas));
        }
        if (almacenData?.data) {
          almacen = almacenData.data;
          localStorage.setItem('ma4_a_cache', JSON.stringify(almacen));
        }
        if (clientesData?.data) {
          clientes = clientesData.data;
          localStorage.setItem('ma4_c_cache', JSON.stringify(clientes));
        }

        lastSyncTime = Date.now();
        console.log('✅ Data synced from server');

        return {
          success: true,
          fromCache,
          fromAPI: {
            ventas: ventas.length,
            almacen: almacen.length,
            clientes: clientes.length
          }
        };
      } catch (apiError) {
        console.warn('⚠️ Could not load from API, using cache:', apiError.message);
        syncError = apiError.message;
        return {
          success: true,
          count: fromCache,
          warning: 'Using cached data only'
        };
      }
    } else {
      console.log('⚠️ Not authenticated, using cached data');
      return {
        success: true,
        count: fromCache,
        warning: 'Not authenticated, using cached data'
      };
    }
  } catch (err) {
    console.error('❌ Error cargando datos:', err);
    return { success: false, error: err.message };
  }
}

/**
 * clearAllData: Borra TODOS los datos (requiere confirmación)
 * ⚠️ PELIGROSO - Usar solo en testing
 */
function clearAllData() {
  if (!confirm('⚠️ ADVERTENCIA: Esto borrará TODOS los datos. ¿Estás seguro?')) {
    return false;
  }
  localStorage.removeItem('ma4_v_cache');
  localStorage.removeItem('ma4_a_cache');
  localStorage.removeItem('ma4_c_cache');
  localStorage.removeItem('ma4_u');
  localStorage.removeItem('ma4_cfg');
  ventas = [];
  almacen = [];
  clientes = [];
  usuarios = [];
  clearCache();
  console.log('✓ Todos los datos han sido borrados');
  return true;
}

// ═════════════════════════════════════════════════════════════════════════════
// API Integration Functions
// ═════════════════════════════════════════════════════════════════════════════

/**
 * addVenta: Agrega nueva venta a API
 * @param {Object} venta - Datos de venta a crear
 * @returns {Promise<Object>} Venta creada
 */
async function addVenta(venta) {
  try {
    validateVenta(venta);

    // Guardar en local primero (optimistic update)
    venta.id = venta.id || Date.now();
    ventas.push(venta);
    sv({ skipAPI: true, notify: false });

    // Enviar a API
    if (window.apiClient?.isAuthenticated()) {
      const result = await window.apiClient.post('/ventas', venta);
      console.log('✅ Venta creada:', result);
      return result;
    }

    return venta;
  } catch (error) {
    console.error('❌ Error adding venta:', error);
    throw error;
  }
}

/**
 * updateVenta: Actualiza venta existente
 * @param {*} id - ID de venta
 * @param {Object} data - Datos a actualizar
 * @returns {Promise<Object>} Venta actualizada
 */
async function updateVenta(id, data) {
  try {
    const index = ventas.findIndex(v => v.id === id);
    if (index === -1) throw new Error('Venta no encontrada');

    // Actualizar en local (optimistic update)
    ventas[index] = { ...ventas[index], ...data };
    sv({ skipAPI: true, notify: false });

    // Enviar a API
    if (window.apiClient?.isAuthenticated()) {
      const result = await window.apiClient.put(`/ventas/${id}`, data);
      console.log('✅ Venta actualizada:', result);
      return result;
    }

    return ventas[index];
  } catch (error) {
    console.error('❌ Error updating venta:', error);
    throw error;
  }
}

/**
 * deleteVenta: Elimina venta
 * @param {*} id - ID de venta a eliminar
 * @returns {Promise<Boolean>} true si se eliminó
 */
async function deleteVenta(id) {
  try {
    const index = ventas.findIndex(v => v.id === id);
    if (index === -1) throw new Error('Venta no encontrada');

    // Eliminar en local (optimistic update)
    ventas.splice(index, 1);
    sv({ skipAPI: true, notify: false });

    // Enviar a API
    if (window.apiClient?.isAuthenticated()) {
      await window.apiClient.delete(`/ventas/${id}`);
      console.log('✅ Venta eliminada');
    }

    return true;
  } catch (error) {
    console.error('❌ Error deleting venta:', error);
    throw error;
  }
}

/**
 * addProducto: Agrega nuevo producto a almacén
 */
async function addProducto(producto) {
  try {
    validateProducto(producto);

    producto.id = producto.id || Date.now().toString();
    almacen.push(producto);
    sv({ skipAPI: true, notify: false });

    if (window.apiClient?.isAuthenticated()) {
      const result = await window.apiClient.post('/almacen', producto);
      console.log('✅ Producto creado:', result);
      return result;
    }

    return producto;
  } catch (error) {
    console.error('❌ Error adding producto:', error);
    throw error;
  }
}

/**
 * updateProducto: Actualiza producto existente
 */
async function updateProducto(id, data) {
  try {
    const index = almacen.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Producto no encontrado');

    almacen[index] = { ...almacen[index], ...data };
    sv({ skipAPI: true, notify: false });

    if (window.apiClient?.isAuthenticated()) {
      const result = await window.apiClient.put(`/almacen/${id}`, data);
      console.log('✅ Producto actualizado:', result);
      return result;
    }

    return almacen[index];
  } catch (error) {
    console.error('❌ Error updating producto:', error);
    throw error;
  }
}

/**
 * deleteProducto: Elimina producto
 */
async function deleteProducto(id) {
  try {
    const index = almacen.findIndex(p => p.id === id);
    if (index === -1) throw new Error('Producto no encontrado');

    almacen.splice(index, 1);
    sv({ skipAPI: true, notify: false });

    if (window.apiClient?.isAuthenticated()) {
      await window.apiClient.delete(`/almacen/${id}`);
      console.log('✅ Producto eliminado');
    }

    return true;
  } catch (error) {
    console.error('❌ Error deleting producto:', error);
    throw error;
  }
}

/**
 * addCliente: Agrega nuevo cliente
 */
async function addCliente(cliente) {
  try {
    validateCliente(cliente);

    cliente.id = cliente.id || Date.now().toString();
    clientes.push(cliente);
    sv({ skipAPI: true, notify: false });

    if (window.apiClient?.isAuthenticated()) {
      const result = await window.apiClient.post('/clientes', cliente);
      console.log('✅ Cliente creado:', result);
      return result;
    }

    return cliente;
  } catch (error) {
    console.error('❌ Error adding cliente:', error);
    throw error;
  }
}

/**
 * updateCliente: Actualiza cliente existente
 */
async function updateCliente(id, data) {
  try {
    const index = clientes.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Cliente no encontrado');

    clientes[index] = { ...clientes[index], ...data };
    sv({ skipAPI: true, notify: false });

    if (window.apiClient?.isAuthenticated()) {
      const result = await window.apiClient.put(`/clientes/${id}`, data);
      console.log('✅ Cliente actualizado:', result);
      return result;
    }

    return clientes[index];
  } catch (error) {
    console.error('❌ Error updating cliente:', error);
    throw error;
  }
}

/**
 * deleteCliente: Elimina cliente
 */
async function deleteCliente(id) {
  try {
    const index = clientes.findIndex(c => c.id === id);
    if (index === -1) throw new Error('Cliente no encontrado');

    clientes.splice(index, 1);
    sv({ skipAPI: true, notify: false });

    if (window.apiClient?.isAuthenticated()) {
      await window.apiClient.delete(`/clientes/${id}`);
      console.log('✅ Cliente eliminado');
    }

    return true;
  } catch (error) {
    console.error('❌ Error deleting cliente:', error);
    throw error;
  }
}

/**
 * getSyncStatus: Retorna estado de sincronización
 */
function getSyncStatus() {
  return {
    lastSync: lastSyncTime,
    isSyncing,
    error: syncError,
    queuedChanges: window.syncQueue?.getStatus() || { queued: 0 },
    isOnline: window.apiClient?.isOnline() || navigator.onLine,
    isAuthenticated: window.apiClient?.isAuthenticated() || false
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. UTILITY FUNCTIONS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * fmt: Formatea número como moneda (MXN)
 * @param {Number} n - Número a formatear
 * @returns {String} Número formateado como "$1,234.56"
 *
 * @example
 * fmt(1234.5) // "$1,234.50"
 */
function fmt(n) {
  return '$' + Number(n).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * today: Retorna fecha de hoy en formato ISO (YYYY-MM-DD)
 * @returns {String} Fecha actual
 */
function today() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * toast: Muestra notificación temporal
 * @param {String} m - Mensaje a mostrar
 */
function toast(m) {
  const e = document.getElementById('toast');
  if (e) {
    e.textContent = m;
    e.classList.add('show');
    setTimeout(() => e.classList.remove('show'), 3000);
  }
}

/**
 * closeOv: Cierra overlay/modal por ID
 * @param {String} id - ID del elemento a cerrar
 */
function closeOv(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('on');
}

/**
 * clsOv: Cierra overlay si se hace click fuera (para usar en eventos)
 * @param {String} id - ID del overlay
 * @param {Event} e - Evento de click
 */
function clsOv(id, e) {
  if (e.target === document.getElementById(id)) closeOv(id);
}

/**
 * dl: Descarga archivo (blob o string) con nombre especificado
 * @param {String|Blob} c - Contenido a descargar
 * @param {String} f - Nombre del archivo
 * @param {String} t - Tipo MIME (ej: 'application/json')
 *
 * @example
 * dl(JSON.stringify(data), 'export.json', 'application/json');
 */
function dl(c, f, t) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([c], { type: t }));
  a.download = f;
  a.click();
}

/**
 * getStorageSize: Calcula tamaño de localStorage en MB
 * Útil para monitorear límite de storage
 * @returns {String} Size en MB (ej: "0.15")
 */
function getStorageSize() {
  let total = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length + key.length;
    }
  }
  return (total / 1024 / 1024).toFixed(2);
}

/**
 * logStats: Imprime estadísticas en consola
 * Útil para debugging y performance monitoring
 */
function logStats() {
  console.group('📊 Maya Autopartes Stats');
  console.log('Ventas:', ventas.length);
  console.log('Almacén:', almacen.length);
  console.log('Clientes:', clientes.length);
  console.log('Cache entries:', cache.size);
  console.log('Storage used:', getStorageSize(), 'MB');
  console.groupEnd();
}


// ═════════════════════════════════════════════════════════════════════════════
// 7. EXPORTS (ES6 Modules)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Descomenta los exports si usas type="module" en HTML:
 *
 * export {
 *   // Estado global
 *   ventas, almacen, clientes, usuarios, sesionActual, cfg,
 *   // Variables UI
 *   vPg, vSC, vSD, almView, eVId, eAId, eCId, PG,
 *   // Supabase (Future)
 *   sbClient, sbReady,
 *   // Optimización
 *   debounce, cache, getCached, clearCache, memoize,
 *   // Búsqueda & Filtrado
 *   findClienteByNombre, findVentaById, findProductoById, filterByQuery,
 *   filtV, filtA, stockClass,
 *   // Validación & Sanitización
 *   validateVenta, validateCliente, validateProducto,
 *   sanitizeInput, sanitizeHTML,
 *   // Persistencia
 *   sv, saveCfg, loadData, clearAllData,
 *   // Utilidades
 *   fmt, today, toast, closeOv, clsOv, dl,
 *   getStorageSize, logStats
 * };
 */

// Para script tradicional, todas las funciones están en scope global
// Disponibles directamente: debounce(), sv(), fmt(), etc.
