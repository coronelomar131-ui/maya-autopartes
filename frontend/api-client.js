/**
 * api-client.js - HTTP API Client con Autenticación, Manejo de Errores y Caching
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Responsabilidades:
 * ✓ Fetch wrapper con headers de autenticación
 * ✓ Manejo de JWT token (login, refresh, logout)
 * ✓ Error handling (401 logout, 403 permission denied, network retry)
 * ✓ Retry logic con exponential backoff
 * ✓ Caching local temporal (TTL configurable)
 * ✓ Request deduplication
 * ✓ Request queuing para offline mode
 *
 * Uso:
 * - apiClient.get('/api/ventas')
 * - apiClient.post('/api/ventas', { cliente: 'X', total: 100 })
 * - apiClient.put('/api/ventas/123', { status: 'completada' })
 * - apiClient.delete('/api/ventas/123')
 *
 * @version 1.0.0
 * @author Maya Autopartes Dev Team
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 1. CONFIGURACIÓN GLOBAL
// ═══════════════════════════════════════════════════════════════════════════════

const API_CONFIG = {
  baseURL: 'http://localhost:3000/api',  // Cambiar en producción
  timeout: 10000,                         // 10 segundos
  retryAttempts: 3,                       // Intentos de reconexión
  retryDelay: 1000,                       // Delay inicial en ms
  cacheExpiry: 5 * 60 * 1000,            // Cache por 5 minutos
  tokenStorageKey: 'maya_token',
  userStorageKey: 'maya_user',
  requestQueueKey: 'maya_request_queue'
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. STATE GLOBAL
// ═══════════════════════════════════════════════════════════════════════════════

let jwtToken = localStorage.getItem(API_CONFIG.tokenStorageKey);
let currentUser = JSON.parse(localStorage.getItem(API_CONFIG.userStorageKey) || 'null');
let isOnline = navigator.onLine;

// Cache: { key: { data, expiry } }
const requestCache = new Map();

// Request deduplication: { key: promise }
const pendingRequests = new Map();

// Listeners para cambios de estado
const listeners = new Set();

// ═══════════════════════════════════════════════════════════════════════════════
// 3. CORE FETCH WRAPPER
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * request: Realiza HTTP request con retry, cache y autenticación
 * @param {String} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {String} endpoint - API endpoint (/ventas, /almacen, etc)
 * @param {Object} data - Body data (solo para POST/PUT)
 * @param {Object} options - Opciones adicionales
 * @returns {Promise<Object>} Response data
 */
async function request(method, endpoint, data = null, options = {}) {
  const {
    skipCache = false,
    retry = true,
    cacheTTL = API_CONFIG.cacheExpiry,
    timeout = API_CONFIG.timeout,
    queue = false
  } = options;

  const url = API_CONFIG.baseURL + endpoint;
  const cacheKey = `${method}:${endpoint}`;

  // ─── Estrategia de Cache ───
  if (method === 'GET' && !skipCache) {
    const cached = getCachedResponse(cacheKey);
    if (cached) {
      console.log(`📦 Cache hit: ${endpoint}`);
      return cached;
    }
  }

  // ─── Deduplicación de Requests ───
  if (pendingRequests.has(cacheKey)) {
    console.log(`🔄 Pending request deduplication: ${endpoint}`);
    return pendingRequests.get(cacheKey);
  }

  // ─── Crear Promise de Request ───
  const requestPromise = (async () => {
    try {
      const response = await fetchWithRetry(url, {
        method,
        headers: buildHeaders(),
        body: data ? JSON.stringify(data) : null,
        timeout,
      }, retry);

      // ─── Manejo de Errores HTTP ───
      if (!response.ok) {
        const error = await handleHTTPError(response, endpoint);
        throw error;
      }

      const responseData = await response.json();

      // ─── Cachear solo GET ───
      if (method === 'GET') {
        setCachedResponse(cacheKey, responseData, cacheTTL);
      }

      // ─── Invalidar cache relacionado en mutaciones ───
      if (['POST', 'PUT', 'DELETE'].includes(method)) {
        invalidateRelatedCache(endpoint);
      }

      notifyListeners('response', { method, endpoint, data: responseData });
      return responseData;

    } catch (error) {
      // ─── Si está offline y es GET, usar cache antiguo ───
      if (!isOnline && method === 'GET') {
        const staleCache = getStaleCache(cacheKey);
        if (staleCache) {
          console.warn(`⚠️ Using stale cache (offline): ${endpoint}`);
          return staleCache;
        }
      }

      // ─── Si está offline, encolar request ───
      if (!isOnline && queue && ['POST', 'PUT', 'DELETE'].includes(method)) {
        console.log(`📋 Queueing request (offline): ${endpoint}`);
        enqueueRequest({ method, endpoint, data });
        return { queued: true, message: 'Request queued, will sync when online' };
      }

      notifyListeners('error', { method, endpoint, error: error.message });
      throw error;
    }
  })();

  // ─── Guardar pending request ───
  if (!pendingRequests.has(cacheKey)) {
    pendingRequests.set(cacheKey, requestPromise);
    requestPromise
      .catch(() => {}) // Suprimir error log doble
      .finally(() => pendingRequests.delete(cacheKey));
  }

  return requestPromise;
}

/**
 * fetchWithRetry: Fetch con retry logic exponencial
 */
async function fetchWithRetry(url, options, retry = true) {
  let lastError;

  for (let attempt = 0; attempt < (retry ? API_CONFIG.retryAttempts : 1); attempt++) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeout);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        clearTimeout(timeout);
        return response;
      } catch (fetchError) {
        clearTimeout(timeout);
        throw fetchError;
      }
    } catch (error) {
      lastError = error;

      // Exponential backoff: 1s, 2s, 4s...
      if (attempt < (retry ? API_CONFIG.retryAttempts - 1 : 0)) {
        const delay = API_CONFIG.retryDelay * Math.pow(2, attempt);
        console.warn(`🔄 Retry attempt ${attempt + 1}/${API_CONFIG.retryAttempts} en ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  throw lastError || new Error('Network request failed');
}

/**
 * buildHeaders: Construye headers con JWT token y content-type
 */
function buildHeaders() {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (jwtToken) {
    headers['Authorization'] = `Bearer ${jwtToken}`;
  }

  return headers;
}

/**
 * handleHTTPError: Maneja errores HTTP específicos
 */
async function handleHTTPError(response, endpoint) {
  const statusCode = response.status;
  const errorBody = await response.text();

  switch (statusCode) {
    case 401:
      // Token inválido o expirado
      console.error('❌ Unauthorized - Logging out');
      logout();
      return new Error('Tu sesión expiró. Por favor inicia sesión de nuevo.');

    case 403:
      // Permisos insuficientes
      console.error('❌ Forbidden - Permission denied');
      return new Error('No tienes permisos para acceder a este recurso.');

    case 404:
      // Recurso no encontrado
      console.error('❌ Not found:', endpoint);
      return new Error(`Recurso no encontrado: ${endpoint}`);

    case 422:
      // Validation error
      try {
        const errors = JSON.parse(errorBody);
        const message = errors.errors?.[0]?.message || 'Error de validación';
        return new Error(message);
      } catch (e) {
        return new Error('Error de validación en los datos');
      }

    case 429:
      // Rate limited
      console.warn('⚠️ Rate limited - waiting...');
      return new Error('Demasiadas solicitudes. Intenta de nuevo más tarde.');

    case 500:
    case 502:
    case 503:
      return new Error('Servidor no disponible. Intenta de nuevo más tarde.');

    default:
      return new Error(`Error HTTP ${statusCode}: ${errorBody || 'Unknown error'}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. CACHE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * getCachedResponse: Obtiene response del cache si no ha expirado
 */
function getCachedResponse(key) {
  if (!requestCache.has(key)) return null;

  const { data, expiry } = requestCache.get(key);
  if (Date.now() > expiry) {
    requestCache.delete(key);
    return null;
  }

  return data;
}

/**
 * getStaleCache: Obtiene cache expirado (para offline mode)
 */
function getStaleCache(key) {
  if (!requestCache.has(key)) return null;
  const { data } = requestCache.get(key);
  return data;
}

/**
 * setCachedResponse: Guarda response en cache con TTL
 */
function setCachedResponse(key, data, ttl) {
  requestCache.set(key, {
    data,
    expiry: Date.now() + ttl
  });
}

/**
 * invalidateRelatedCache: Invalida cache relacionado después de mutaciones
 */
function invalidateRelatedCache(endpoint) {
  const patterns = {
    '/ventas': ['GET:/ventas'],
    '/almacen': ['GET:/almacen'],
    '/clientes': ['GET:/clientes'],
    '/usuarios': ['GET:/usuarios'],
    '/dashboard': ['GET:/dashboard']
  };

  // Extraer recurso principal
  const resource = endpoint.split('/')[1];
  const keysToInvalidate = patterns[`/${resource}`] || [];

  keysToInvalidate.forEach(key => {
    requestCache.delete(key);
    console.log(`🗑️ Cache invalidated: ${key}`);
  });
}

/**
 * clearCache: Borra todo el cache
 */
function clearCache() {
  requestCache.clear();
  console.log('✓ Cache cleared');
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. AUTHENTICATION
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * login: Autentica usuario y guarda JWT token
 */
async function login(email, password) {
  try {
    const response = await request('POST', '/auth/login', { email, password }, {
      skipCache: true,
      queue: false
    });

    jwtToken = response.token;
    currentUser = response.user;

    localStorage.setItem(API_CONFIG.tokenStorageKey, jwtToken);
    localStorage.setItem(API_CONFIG.userStorageKey, JSON.stringify(currentUser));

    notifyListeners('login', currentUser);
    return response;
  } catch (error) {
    notifyListeners('loginError', error.message);
    throw error;
  }
}

/**
 * logout: Limpia token y cierra sesión
 */
function logout() {
  jwtToken = null;
  currentUser = null;

  localStorage.removeItem(API_CONFIG.tokenStorageKey);
  localStorage.removeItem(API_CONFIG.userStorageKey);

  clearCache();
  clearRequestQueue();

  notifyListeners('logout', null);
}

/**
 * refreshToken: Refresca JWT token
 */
async function refreshToken() {
  try {
    const response = await request('POST', '/auth/refresh', {}, {
      skipCache: true,
      queue: false
    });

    jwtToken = response.token;
    localStorage.setItem(API_CONFIG.tokenStorageKey, jwtToken);
    return response;
  } catch (error) {
    logout();
    throw error;
  }
}

/**
 * getCurrentUser: Retorna usuario actual autenticado
 */
function getCurrentUser() {
  return currentUser;
}

/**
 * isAuthenticated: Verifica si hay usuario autenticado
 */
function isAuthenticated() {
  return !!jwtToken && !!currentUser;
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. PUBLIC API METHODS
// ═══════════════════════════════════════════════════════════════════════════════

const apiClient = {
  // ─── GET ───
  async get(endpoint, options = {}) {
    return request('GET', endpoint, null, options);
  },

  // ─── POST ───
  async post(endpoint, data, options = {}) {
    return request('POST', endpoint, data, { ...options, queue: true });
  },

  // ─── PUT ───
  async put(endpoint, data, options = {}) {
    return request('PUT', endpoint, data, { ...options, queue: true });
  },

  // ─── DELETE ───
  async delete(endpoint, options = {}) {
    return request('DELETE', endpoint, null, { ...options, queue: true });
  },

  // ─── Autenticación ───
  login,
  logout,
  refreshToken,
  getCurrentUser,
  isAuthenticated,

  // ─── Cache ───
  clearCache,
  getCachedResponse,

  // ─── Listeners ───
  addListener: (callback) => listeners.add(callback),
  removeListener: (callback) => listeners.delete(callback),

  // ─── Connection Status ───
  isOnline: () => isOnline,
  getConnectionStatus: () => ({
    online: isOnline,
    authenticated: isAuthenticated(),
    user: currentUser,
    pendingRequests: pendingRequests.size,
    queuedRequests: getRequestQueueLength()
  })
};

// ═══════════════════════════════════════════════════════════════════════════════
// 7. OFFLINE MODE & REQUEST QUEUE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * enqueueRequest: Encola request para sincronizar cuando se reconecte
 */
function enqueueRequest(requestData) {
  const queue = JSON.parse(localStorage.getItem(API_CONFIG.requestQueueKey) || '[]');
  queue.push({
    ...requestData,
    timestamp: Date.now(),
    id: Math.random().toString(36).substr(2, 9)
  });
  localStorage.setItem(API_CONFIG.requestQueueKey, JSON.stringify(queue));
  notifyListeners('queuedRequest', requestData);
}

/**
 * getRequestQueue: Obtiene requests encolados
 */
function getRequestQueue() {
  return JSON.parse(localStorage.getItem(API_CONFIG.requestQueueKey) || '[]');
}

/**
 * getRequestQueueLength: Retorna cantidad de requests encolados
 */
function getRequestQueueLength() {
  return getRequestQueue().length;
}

/**
 * clearRequestQueue: Borra todos los requests encolados
 */
function clearRequestQueue() {
  localStorage.removeItem(API_CONFIG.requestQueueKey);
}

/**
 * processRequestQueue: Sincroniza requests encolados cuando vuelve online
 */
async function processRequestQueue() {
  const queue = getRequestQueue();
  if (queue.length === 0) return { success: true, synced: 0 };

  console.log(`📤 Processing ${queue.length} queued requests...`);
  let synced = 0;
  const failed = [];

  for (const req of queue) {
    try {
      await request(req.method, req.endpoint, req.data, { queue: false });
      synced++;
    } catch (error) {
      console.error(`❌ Failed to sync ${req.endpoint}:`, error);
      failed.push(req);
    }
  }

  // Guardar solo los que fallaron
  if (failed.length > 0) {
    localStorage.setItem(API_CONFIG.requestQueueKey, JSON.stringify(failed));
  } else {
    clearRequestQueue();
  }

  notifyListeners('queueProcessed', { synced, failed: failed.length });
  return { success: failed.length === 0, synced, failed: failed.length };
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. CONNECTION LISTENERS
// ═══════════════════════════════════════════════════════════════════════════════

window.addEventListener('online', () => {
  console.log('✅ Connection restored');
  isOnline = true;
  notifyListeners('online', null);
  // Procesar queue automáticamente
  processRequestQueue();
});

window.addEventListener('offline', () => {
  console.warn('⚠️ Connection lost');
  isOnline = false;
  notifyListeners('offline', null);
});

// ═══════════════════════════════════════════════════════════════════════════════
// 9. EVENT LISTENERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * notifyListeners: Notifica a todos los listeners de eventos
 */
function notifyListeners(event, data) {
  listeners.forEach(callback => {
    try {
      callback({ event, data, timestamp: Date.now() });
    } catch (error) {
      console.error('Error in listener:', error);
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// 10. UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * sleep: Promise-based delay
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ═══════════════════════════════════════════════════════════════════════════════
// 11. EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

// Para ES6 Modules
// export { apiClient, API_CONFIG };

// Para script tradicional - global namespace
window.apiClient = apiClient;
window.API_CONFIG = API_CONFIG;
