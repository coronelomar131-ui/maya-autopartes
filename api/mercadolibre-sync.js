/**
 * mercadolibre-sync.js - MercadoLibre API Integration
 * ═════════════════════════════════════════════════════════════════
 *
 * Responsabilidades:
 * ✓ OAuth 2.0 Authentication con MercadoLibre
 * ✓ Sincronización bidireccional de inventario (app ↔ MELI)
 * ✓ Polling automático cada 30 minutos
 * ✓ Crear/actualizar productos en MercadoLibre
 * ✓ Sincronización automática de precios y stock
 * ✓ Manejo de variantes y atributos
 * ✓ Caché de datos MELI para optimizar requests
 * ✓ Historial de cambios y logs de sincronización
 *
 * API Reference: MercadoLibre REST API v2
 * Base URL: https://api.mercadolibre.com
 * Rate Limits: 600 requests/minute per user
 *
 * @version 1.0.0
 * @last-update 2026-04-22
 */

// ═════════════════════════════════════════════════════════════════
// CONFIG & CONSTANTS
// ═════════════════════════════════════════════════════════════════

const MELI_CONFIG = {
  clientId: 'YOUR_MELI_CLIENT_ID',       // Configurar desde UI
  clientSecret: 'YOUR_MELI_CLIENT_SECRET', // Configurar desde UI
  redirectUri: 'https://maya-autopartes.vercel.app/auth/meli-callback',
  apiBase: 'https://api.mercadolibre.com',
  authUrl: 'https://auth.mercadolibre.com.mx/authorization',
  tokenUrl: 'https://api.mercadolibre.com.mx/oauth/token',
  syncInterval: 30 * 60 * 1000, // 30 minutos
  maxRetries: 3,
  requestTimeout: 10000,
  rateLimit: 600, // requests/minute
};

// ─── Storage Keys ───
const STORAGE_KEYS = {
  token: 'ma4_meli_token',
  userId: 'ma4_meli_user_id',
  syncLog: 'ma4_meli_sync_log',
  lastSync: 'ma4_meli_last_sync',
  cache: 'ma4_meli_cache',
  listings: 'ma4_meli_listings', // Mapeo local ID → MELI ID
};

// ─── Sync States ───
const SYNC_STATE = {
  IDLE: 'idle',
  SYNCING: 'syncing',
  ERROR: 'error',
  SUCCESS: 'success',
};

// ═════════════════════════════════════════════════════════════════
// STATE & INITIALIZATION
// ═════════════════════════════════════════════════════════════════

let meliState = {
  isAuthenticated: false,
  userId: null,
  accessToken: null,
  expiresAt: null,
  syncState: SYNC_STATE.IDLE,
  lastSyncTime: null,
  syncLogs: [],
  listings: {}, // { localId: meliId }
  cache: new Map(),
  syncIntervalId: null,
};

/**
 * Inicializar MercadoLibre Sync
 * Cargar tokens, configuración y establecer listeners
 */
function initMercadoLibreSync() {
  console.log('🚀 Inicializando MercadoLibre Sync...');

  try {
    // Cargar estado persistido
    const savedToken = localStorage.getItem(STORAGE_KEYS.token);
    const savedUserId = localStorage.getItem(STORAGE_KEYS.userId);
    const savedListings = localStorage.getItem(STORAGE_KEYS.listings);

    if (savedToken && savedUserId) {
      meliState.accessToken = JSON.parse(savedToken).access_token;
      meliState.expiresAt = JSON.parse(savedToken).expires_at;
      meliState.userId = savedUserId;
      meliState.listings = JSON.parse(savedListings || '{}');

      // Verificar si token no expiró
      if (meliState.expiresAt > Date.now()) {
        meliState.isAuthenticated = true;
        console.log('✅ Sesión MercadoLibre restaurada');

        // Cargar logs y cache
        meliState.syncLogs = JSON.parse(localStorage.getItem(STORAGE_KEYS.syncLog) || '[]');
        meliState.cache = new Map(JSON.parse(localStorage.getItem(STORAGE_KEYS.cache) || '[]'));

        // Iniciar polling
        startSyncInterval();
      } else {
        console.log('⚠ Token expirado');
        clearMeliAuth();
      }
    }

    return meliState.isAuthenticated;
  } catch (e) {
    console.error('❌ Error inicializando MELI:', e);
    return false;
  }
}

// ═════════════════════════════════════════════════════════════════
// OAUTH 2.0 AUTHENTICATION
// ═════════════════════════════════════════════════════════════════

/**
 * Generar URL de autorización MercadoLibre
 * El usuario será redirigido a MELI para otorgar permisos
 */
function getMeliAuthUrl() {
  const state = Math.random().toString(36).substring(7);
  localStorage.setItem('ma4_meli_auth_state', state);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: MELI_CONFIG.clientId,
    redirect_uri: MELI_CONFIG.redirectUri,
    state: state,
  });

  return `${MELI_CONFIG.authUrl}?${params.toString()}`;
}

/**
 * Manejar callback OAuth de MercadoLibre
 * Intercambiar authorization code por access token
 */
async function handleMeliCallback(code, state) {
  try {
    // Verificar state para prevenir CSRF
    const savedState = localStorage.getItem('ma4_meli_auth_state');
    if (state !== savedState) {
      throw new Error('Invalid state parameter - CSRF attack detected');
    }

    console.log('🔄 Intercambiando código por token...');

    // Intercambiar code por token
    const response = await fetch(`${MELI_CONFIG.tokenUrl}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: MELI_CONFIG.clientId,
        client_secret: MELI_CONFIG.clientSecret,
        code: code,
        redirect_uri: MELI_CONFIG.redirectUri,
      }),
    });

    if (!response.ok) {
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    const tokenData = await response.json();

    // Obtener información del usuario
    const userResponse = await fetch(`${MELI_CONFIG.apiBase}/users/me`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user info');
    }

    const userData = await userResponse.json();

    // Guardar credenciales
    meliState.accessToken = tokenData.access_token;
    meliState.expiresAt = Date.now() + (tokenData.expires_in * 1000);
    meliState.userId = userData.id;
    meliState.isAuthenticated = true;

    const tokenObj = {
      access_token: tokenData.access_token,
      expires_at: meliState.expiresAt,
      refresh_token: tokenData.refresh_token,
    };

    localStorage.setItem(STORAGE_KEYS.token, JSON.stringify(tokenObj));
    localStorage.setItem(STORAGE_KEYS.userId, meliState.userId);

    console.log('✅ Autenticación exitosa! Usuario ID:', meliState.userId);

    // Iniciar sincronización automática
    startSyncInterval();

    return true;
  } catch (e) {
    console.error('❌ Error en callback OAuth:', e);
    return false;
  }
}

/**
 * Refrescar access token si expiró
 */
async function refreshMeliToken() {
  try {
    const tokenObj = JSON.parse(localStorage.getItem(STORAGE_KEYS.token));
    if (!tokenObj.refresh_token) return false;

    const response = await fetch(MELI_CONFIG.tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'refresh_token',
        client_id: MELI_CONFIG.clientId,
        client_secret: MELI_CONFIG.clientSecret,
        refresh_token: tokenObj.refresh_token,
      }),
    });

    if (!response.ok) throw new Error('Token refresh failed');

    const newTokenData = await response.json();
    meliState.accessToken = newTokenData.access_token;
    meliState.expiresAt = Date.now() + (newTokenData.expires_in * 1000);

    const updatedToken = {
      ...tokenObj,
      access_token: newTokenData.access_token,
      expires_at: meliState.expiresAt,
      refresh_token: newTokenData.refresh_token,
    };

    localStorage.setItem(STORAGE_KEYS.token, JSON.stringify(updatedToken));
    console.log('✅ Token refrescado');
    return true;
  } catch (e) {
    console.error('❌ Error refrescando token:', e);
    clearMeliAuth();
    return false;
  }
}

/**
 * Limpiar autenticación
 */
function clearMeliAuth() {
  meliState.isAuthenticated = false;
  meliState.accessToken = null;
  meliState.userId = null;
  localStorage.removeItem(STORAGE_KEYS.token);
  localStorage.removeItem(STORAGE_KEYS.userId);
  stopSyncInterval();
  console.log('🔴 Autenticación MercadoLibre limpiada');
}

// ═════════════════════════════════════════════════════════════════
// API REQUESTS
// ═════════════════════════════════════════════════════════════════

/**
 * Request genérico a API MercadoLibre con reintentos
 */
async function meliRequest(endpoint, options = {}) {
  if (!meliState.isAuthenticated) {
    throw new Error('No MELI authentication');
  }

  // Verificar y refrescar token si está próximo a expirar
  if (meliState.expiresAt - Date.now() < 60000) {
    await refreshMeliToken();
  }

  const url = `${MELI_CONFIG.apiBase}${endpoint}`;
  const headers = {
    Authorization: `Bearer ${meliState.accessToken}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  let lastError;
  for (let attempt = 0; attempt < MELI_CONFIG.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), MELI_CONFIG.requestTimeout);

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Rate limit handling
      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '60');
        console.log(`⏳ Rate limited, esperando ${retryAfter}s...`);
        await sleep(retryAfter * 1000);
        continue;
      }

      if (!response.ok) {
        throw new Error(`MELI API error: ${response.status}`);
      }

      return await response.json();
    } catch (e) {
      lastError = e;
      console.log(`⚠ Intento ${attempt + 1}/${MELI_CONFIG.maxRetries} falló:`, e.message);

      if (attempt < MELI_CONFIG.maxRetries - 1) {
        await sleep(Math.pow(2, attempt) * 1000); // Exponential backoff
      }
    }
  }

  throw lastError;
}

// ═════════════════════════════════════════════════════════════════
// LECTURA DE INVENTARIO DESDE MERCADOLIBRE
// ═════════════════════════════════════════════════════════════════

/**
 * Obtener todas las publicaciones del usuario
 */
async function getMeliListings() {
  try {
    const listings = await meliRequest(`/users/${meliState.userId}/listings`, {
      method: 'GET',
    });

    return listings || [];
  } catch (e) {
    console.error('❌ Error obteniendo listings:', e);
    return [];
  }
}

/**
 * Obtener detalle de una publicación (incluyendo stock y precio)
 */
async function getMeliListingDetail(listingId) {
  try {
    const cached = meliState.cache.get(`listing_${listingId}`);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    const detail = await meliRequest(`/items/${listingId}`, { method: 'GET' });

    // Cachear por 5 minutos
    meliState.cache.set(`listing_${listingId}`, {
      data: detail,
      expiresAt: Date.now() + (5 * 60 * 1000),
    });

    return detail;
  } catch (e) {
    console.error(`❌ Error obteniendo detalle ${listingId}:`, e);
    return null;
  }
}

/**
 * Obtener stock actual de MELI
 */
async function getMeliStock(listingId) {
  try {
    const listing = await getMeliListingDetail(listingId);
    if (!listing) return 0;

    return listing.available_quantity || 0;
  } catch (e) {
    console.error(`❌ Error obteniendo stock ${listingId}:`, e);
    return 0;
  }
}

// ═════════════════════════════════════════════════════════════════
// CREAR/ACTUALIZAR PRODUCTOS EN MERCADOLIBRE
// ═════════════════════════════════════════════════════════════════

/**
 * Crear nuevo producto en MercadoLibre
 * @param {Object} localProduct - Producto del app local
 */
async function createMeliListing(localProduct) {
  try {
    // Mapear producto local a formato MELI
    const meliProduct = mapLocalToMeli(localProduct);

    console.log('📤 Creando producto en MELI:', meliProduct.title);

    const response = await meliRequest(`/items`, {
      method: 'POST',
      body: JSON.stringify(meliProduct),
    });

    if (!response.id) {
      throw new Error('No ID en respuesta de MELI');
    }

    // Guardar mapping
    meliState.listings[localProduct.id] = response.id;
    localStorage.setItem(STORAGE_KEYS.listings, JSON.stringify(meliState.listings));

    addSyncLog('create', localProduct.id, response.id, 'success');
    console.log('✅ Producto creado en MELI ID:', response.id);

    return response.id;
  } catch (e) {
    console.error('❌ Error creando producto:', e);
    addSyncLog('create', localProduct.id, null, 'error', e.message);
    return null;
  }
}

/**
 * Actualizar producto en MercadoLibre
 * @param {Object} localProduct - Producto local actualizado
 */
async function updateMeliListing(localProduct) {
  try {
    const meliId = meliState.listings[localProduct.id];
    if (!meliId) {
      console.log('⚠ Producto no sincronizado con MELI');
      return false;
    }

    const meliProduct = mapLocalToMeli(localProduct);

    console.log('📝 Actualizando producto MELI:', meliId);

    await meliRequest(`/items/${meliId}`, {
      method: 'PUT',
      body: JSON.stringify(meliProduct),
    });

    // Actualizar stock usando endpoint específico
    await meliRequest(`/items/${meliId}/available_quantity`, {
      method: 'PUT',
      body: JSON.stringify({ available_quantity: localProduct.stock || 0 }),
    });

    addSyncLog('update', localProduct.id, meliId, 'success');
    console.log('✅ Producto actualizado en MELI');

    return true;
  } catch (e) {
    console.error('❌ Error actualizando producto:', e);
    addSyncLog('update', localProduct.id, meliId, 'error', e.message);
    return false;
  }
}

/**
 * Actualizar solo el stock en MELI
 */
async function updateMeliStock(localId, newStock) {
  try {
    const meliId = meliState.listings[localId];
    if (!meliId) return false;

    await meliRequest(`/items/${meliId}/available_quantity`, {
      method: 'PUT',
      body: JSON.stringify({ available_quantity: newStock }),
    });

    addSyncLog('stock_update', localId, meliId, 'success');
    return true;
  } catch (e) {
    console.error('❌ Error actualizando stock:', e);
    addSyncLog('stock_update', localId, meliId, 'error', e.message);
    return false;
  }
}

/**
 * Actualizar solo el precio en MELI
 */
async function updateMeliPrice(localId, newPrice) {
  try {
    const meliId = meliState.listings[localId];
    if (!meliId) return false;

    await meliRequest(`/items/${meliId}`, {
      method: 'PUT',
      body: JSON.stringify({ price: newPrice }),
    });

    addSyncLog('price_update', localId, meliId, 'success');
    return true;
  } catch (e) {
    console.error('❌ Error actualizando precio:', e);
    addSyncLog('price_update', localId, meliId, 'error', e.message);
    return false;
  }
}

// ═════════════════════════════════════════════════════════════════
// SINCRONIZACIÓN BIDIRECCIONAL
// ═════════════════════════════════════════════════════════════════

/**
 * Sincronizar inventario completo (app ↔ MELI)
 * 1. Obtener datos de MELI
 * 2. Comparar con datos locales
 * 3. Actualizar lo que cambió
 * 4. Registrar en historial
 */
async function syncFullInventory(localAlmacen) {
  if (!meliState.isAuthenticated) {
    console.log('⚠ No hay autenticación MELI');
    return { status: 'error', message: 'No MELI auth' };
  }

  meliState.syncState = SYNC_STATE.SYNCING;
  const startTime = Date.now();
  const result = {
    status: 'success',
    timestamp: new Date().toISOString(),
    changes: {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
    },
    details: [],
  };

  try {
    console.log('🔄 Sincronizando inventario con MELI...');

    // 1. Obtener todas las publicaciones de MELI
    const meliListings = await getMeliListings();
    console.log(`📋 ${meliListings.length} productos en MELI`);

    // 2. Actualizar stocks de MELI en nuestro mapeo
    for (const listing of meliListings) {
      const detail = await getMeliListingDetail(listing.id);
      if (detail) {
        // Buscar producto local correspondiente
        const localProduct = localAlmacen.find(
          p => meliState.listings[p.id] === listing.id
        );

        if (localProduct) {
          // Detectar cambios de stock en MELI
          const meliStock = detail.available_quantity || 0;
          if (localProduct.stock !== meliStock) {
            console.log(`📊 Stock diferente para ${localProduct.nombre}: LOCAL=${localProduct.stock} vs MELI=${meliStock}`);
            result.details.push({
              type: 'stock_conflict',
              product: localProduct.nombre,
              local: localProduct.stock,
              meli: meliStock,
              action: 'logged_for_review', // Usuario decide qué hacer
            });
          }
        }
      }
    }

    // 3. Procesar productos locales
    for (const product of localAlmacen) {
      try {
        const meliId = meliState.listings[product.id];

        if (meliId) {
          // Actualizar producto existente
          const success = await updateMeliListing(product);
          if (success) {
            result.changes.updated++;
          } else {
            result.changes.errors++;
          }
        } else {
          // Crear nuevo producto si está marcado para sync
          if (product.syncMeli !== false) {
            const newMeliId = await createMeliListing(product);
            if (newMeliId) {
              result.changes.created++;
            } else {
              result.changes.errors++;
            }
          } else {
            result.changes.skipped++;
          }
        }
      } catch (e) {
        console.error(`❌ Error sincronizando ${product.nombre}:`, e);
        result.changes.errors++;
      }
    }

    meliState.lastSyncTime = new Date().toISOString();
    meliState.syncState = SYNC_STATE.SUCCESS;

    addSyncLog('full_sync', null, null, 'success', JSON.stringify(result.changes));

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Sincronización completada en ${duration}s`, result.changes);

    return result;
  } catch (e) {
    console.error('❌ Error en sincronización:', e);
    meliState.syncState = SYNC_STATE.ERROR;
    addSyncLog('full_sync', null, null, 'error', e.message);
    return { status: 'error', message: e.message };
  }
}

// ═════════════════════════════════════════════════════════════════
// POLLING AUTOMÁTICO
// ═════════════════════════════════════════════════════════════════

function startSyncInterval() {
  if (meliState.syncIntervalId) return;

  console.log(`⏰ Iniciando polling cada ${MELI_CONFIG.syncInterval / 1000 / 60} minutos`);

  meliState.syncIntervalId = setInterval(async () => {
    // Obtener almacén local (desde core.js si está disponible)
    if (typeof almacen !== 'undefined') {
      await syncFullInventory(almacen);
    }
  }, MELI_CONFIG.syncInterval);

  // También sincronizar ahora
  if (typeof almacen !== 'undefined') {
    syncFullInventory(almacen).catch(console.error);
  }
}

function stopSyncInterval() {
  if (meliState.syncIntervalId) {
    clearInterval(meliState.syncIntervalId);
    meliState.syncIntervalId = null;
    console.log('⏸ Polling pausado');
  }
}

// ═════════════════════════════════════════════════════════════════
// LOGGING & HISTORIAL
// ═════════════════════════════════════════════════════════════════

/**
 * Registrar evento de sincronización
 */
function addSyncLog(operation, localId, meliId, status, details = '') {
  const log = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    operation, // create, update, stock_update, price_update, full_sync, etc
    localId,
    meliId,
    status, // success, error, pending
    details,
  };

  meliState.syncLogs.unshift(log);

  // Guardar últimos 100 logs
  meliState.syncLogs = meliState.syncLogs.slice(0, 100);
  localStorage.setItem(STORAGE_KEYS.syncLog, JSON.stringify(meliState.syncLogs));

  return log;
}

/**
 * Obtener historial de sincronización
 */
function getSyncLogs(limit = 50) {
  return meliState.syncLogs.slice(0, limit);
}

/**
 * Obtener estadísticas de sincronización
 */
function getSyncStats() {
  const stats = {
    totalLogs: meliState.syncLogs.length,
    successCount: 0,
    errorCount: 0,
    lastSync: meliState.lastSyncTime,
    uptime: meliState.isAuthenticated ? 'online' : 'offline',
  };

  for (const log of meliState.syncLogs) {
    if (log.status === 'success') stats.successCount++;
    if (log.status === 'error') stats.errorCount++;
  }

  return stats;
}

// ═════════════════════════════════════════════════════════════════
// UTILIDADES
// ═════════════════════════════════════════════════════════════════

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getState() {
  return {
    isAuthenticated: meliState.isAuthenticated,
    userId: meliState.userId,
    syncState: meliState.syncState,
    lastSyncTime: meliState.lastSyncTime,
    stats: getSyncStats(),
  };
}

// ═════════════════════════════════════════════════════════════════
// EXPORTAR FUNCIONES
// ═════════════════════════════════════════════════════════════════

// Para uso en HTML/UI
if (typeof window !== 'undefined') {
  window.MELI = {
    init: initMercadoLibreSync,
    getAuthUrl: getMeliAuthUrl,
    handleCallback: handleMeliCallback,
    sync: syncFullInventory,
    updateStock: updateMeliStock,
    updatePrice: updateMeliPrice,
    getLogs: getSyncLogs,
    getStats: getSyncStats,
    getState: getState,
    logout: clearMeliAuth,
    startPolling: startSyncInterval,
    stopPolling: stopSyncInterval,
  };
}

// Para uso en Node.js/módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initMercadoLibreSync,
    getMeliAuthUrl,
    handleMeliCallback,
    syncFullInventory,
    updateMeliStock,
    updateMeliPrice,
    getMeliListings,
    getMeliListingDetail,
    createMeliListing,
    updateMeliListing,
    getSyncLogs,
    getSyncStats,
    getState,
    clearMeliAuth,
    startSyncInterval,
    stopSyncInterval,
    addSyncLog,
    MELI_CONFIG,
    STORAGE_KEYS,
    SYNC_STATE,
  };
}

export {
  initMercadoLibreSync,
  getMeliAuthUrl,
  handleMeliCallback,
  syncFullInventory,
  updateMeliStock,
  updateMeliPrice,
  getMeliListings,
  getMeliListingDetail,
  createMeliListing,
  updateMeliListing,
  getSyncLogs,
  getSyncStats,
  getState,
  clearMeliAuth,
  startSyncInterval,
  stopSyncInterval,
  addSyncLog,
  MELI_CONFIG,
  STORAGE_KEYS,
  SYNC_STATE,
};
