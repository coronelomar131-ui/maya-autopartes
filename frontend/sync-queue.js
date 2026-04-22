/**
 * sync-queue.js - Offline Sync Queue Manager
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Responsabilidades:
 * ✓ Encolar cambios cuando estás offline
 * ✓ Sincronizar automáticamente al reconectar
 * ✓ Mostrar estado de sync en UI
 * ✓ Manejar conflictos de sincronización
 * ✓ Reintentos inteligentes con backoff
 * ✓ Persistencia en localStorage
 *
 * Uso:
 * - syncQueue.add('POST', '/api/ventas', { cliente: 'X' })
 * - syncQueue.getStatus() -> { queued: 5, syncing: false, online: true }
 * - syncQueue.onStatusChange(status => console.log(status))
 * - syncQueue.clearQueue()
 *
 * @version 1.0.0
 * @author Maya Autopartes Dev Team
 */

// ═══════════════════════════════════════════════════════════════════════════════
// 1. CONFIGURACIÓN
// ═══════════════════════════════════════════════════════════════════════════════

const SYNC_CONFIG = {
  storageKey: 'maya_sync_queue',
  maxRetries: 3,
  retryDelay: 2000,           // 2 segundos
  retryBackoff: 2,            // Multiplica delay por 2 cada reintento
  maxQueueSize: 100,
  persistInterval: 1000       // Guardar estado cada 1 segundo
};

// ═══════════════════════════════════════════════════════════════════════════════
// 2. STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════════

class SyncQueue {
  constructor() {
    this.queue = [];
    this.syncing = false;
    this.online = navigator.onLine;
    this.listeners = new Set();
    this.lastSyncTime = null;
    this.failedRequests = new Map();

    // Cargar queue desde localStorage
    this.loadFromStorage();

    // Setup listeners
    this.setupConnectionListeners();
    this.setupPersistence();
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Queue Management
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * add: Agrega request a la queue
   */
  add(method, endpoint, data, options = {}) {
    if (this.queue.length >= SYNC_CONFIG.maxQueueSize) {
      console.error('❌ Sync queue is full');
      this.notifyListeners({
        event: 'queueFull',
        queue: this.queue.length
      });
      return false;
    }

    const request = {
      id: this.generateId(),
      method,
      endpoint,
      data,
      timestamp: Date.now(),
      retries: 0,
      lastError: null,
      priority: options.priority || 0,
      optimisticUpdate: options.optimisticUpdate || null
    };

    this.queue.push(request);
    this.queue.sort((a, b) => (b.priority - a.priority)); // Ordenar por prioridad

    console.log(`📋 Request queued: ${method} ${endpoint} (Queue: ${this.queue.length})`);

    this.notifyListeners({
      event: 'requestQueued',
      request,
      queueLength: this.queue.length
    });

    // Si estamos online, intentar sincronizar inmediatamente
    if (this.online && !this.syncing) {
      this.sync();
    }

    return request.id;
  }

  /**
   * remove: Remueve request de la queue
   */
  remove(requestId) {
    this.queue = this.queue.filter(r => r.id !== requestId);
    this.notifyListeners({
      event: 'requestRemoved',
      requestId,
      queueLength: this.queue.length
    });
  }

  /**
   * get: Obtiene todos los requests en queue
   */
  getQueue() {
    return [...this.queue];
  }

  /**
   * getStatus: Retorna estado actual de sync
   */
  getStatus() {
    return {
      queued: this.queue.length,
      syncing: this.syncing,
      online: this.online,
      lastSync: this.lastSyncTime,
      failedCount: this.failedRequests.size,
      nextRetryIn: this.getNextRetryTime()
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Synchronization
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * sync: Sincroniza todos los requests en queue
   */
  async sync() {
    if (!this.online || this.syncing || this.queue.length === 0) {
      return { success: false, reason: 'Not ready to sync' };
    }

    this.syncing = true;
    console.log(`📤 Starting sync (${this.queue.length} requests)...`);

    this.notifyListeners({
      event: 'syncStarted',
      queueLength: this.queue.length
    });

    let synced = 0;
    const failed = [];
    const toProcess = [...this.queue];

    for (const request of toProcess) {
      try {
        await this.syncRequest(request);
        synced++;
        this.remove(request.id);
      } catch (error) {
        console.error(`❌ Sync failed for ${request.endpoint}:`, error);
        request.lastError = error.message;
        request.retries++;

        if (request.retries < SYNC_CONFIG.maxRetries) {
          console.log(`🔄 Will retry (${request.retries}/${SYNC_CONFIG.maxRetries})`);
          failed.push(request);
        } else {
          console.error(`❌ Max retries exceeded for ${request.endpoint}`);
          this.failedRequests.set(request.id, request);
          this.remove(request.id);

          this.notifyListeners({
            event: 'syncFailed',
            request,
            reason: 'Max retries exceeded'
          });
        }
      }
    }

    this.syncing = false;
    this.lastSyncTime = Date.now();

    const result = {
      success: failed.length === 0,
      synced,
      failed: failed.length,
      failedRequests: failed
    };

    console.log(`✅ Sync complete: ${synced} synced, ${failed.length} failed`);

    this.notifyListeners({
      event: 'syncCompleted',
      result
    });

    return result;
  }

  /**
   * syncRequest: Sincroniza un request individual
   */
  async syncRequest(request) {
    const headers = {
      'Content-Type': 'application/json'
    };

    const token = localStorage.getItem('maya_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`http://localhost:3000/api${request.endpoint}`, {
        method: request.method,
        headers,
        body: request.data ? JSON.stringify(request.data) : null,
        signal: controller.signal
      });

      clearTimeout(timeout);

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`HTTP ${response.status}: ${error}`);
      }

      console.log(`✅ Synced: ${request.method} ${request.endpoint}`);
      return await response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * retrySyncRequest: Reintenta sincronizar un request fallido
   */
  async retrySyncRequest(requestId) {
    const request = this.queue.find(r => r.id === requestId);
    if (!request) return false;

    request.retries++;
    const delay = SYNC_CONFIG.retryDelay * Math.pow(SYNC_CONFIG.retryBackoff, request.retries - 1);

    console.log(`🔄 Retrying ${request.endpoint} in ${delay}ms...`);

    await new Promise(resolve => setTimeout(resolve, delay));

    try {
      await this.syncRequest(request);
      this.remove(requestId);
      return true;
    } catch (error) {
      request.lastError = error.message;
      if (request.retries >= SYNC_CONFIG.maxRetries) {
        this.failedRequests.set(requestId, request);
        this.remove(requestId);
      }
      return false;
    }
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Failed Requests Management
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * getFailedRequests: Retorna requests que fallaron
   */
  getFailedRequests() {
    return Array.from(this.failedRequests.values());
  }

  /**
   * retryFailedRequest: Reintenta un request fallido
   */
  async retryFailedRequest(requestId) {
    const request = this.failedRequests.get(requestId);
    if (!request) return false;

    // Reiniciar contador de retries
    request.retries = 0;
    this.failedRequests.delete(requestId);

    // Agregar back a la queue
    this.queue.push(request);

    console.log(`🔄 Retrying failed request: ${request.endpoint}`);

    if (this.online && !this.syncing) {
      await this.sync();
    }

    return true;
  }

  /**
   * clearFailed: Limpia requests fallidos
   */
  clearFailed() {
    const count = this.failedRequests.size;
    this.failedRequests.clear();
    console.log(`✓ Cleared ${count} failed requests`);
    this.notifyListeners({
      event: 'failedCleared',
      count
    });
  }

  /**
   * getNextRetryTime: Calcula cuándo será el próximo reintento
   */
  getNextRetryTime() {
    if (this.queue.length === 0) return null;

    const oldestRequest = this.queue.reduce((oldest, current) =>
      current.timestamp < oldest.timestamp ? current : oldest
    );

    if (oldestRequest.retries === 0) return 0; // Asap

    const delay = SYNC_CONFIG.retryDelay * Math.pow(SYNC_CONFIG.retryBackoff, oldestRequest.retries);
    return delay;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Connection Management
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * setupConnectionListeners: Escucha cambios de conexión
   */
  setupConnectionListeners() {
    window.addEventListener('online', () => {
      this.online = true;
      console.log('✅ Connection restored');
      this.notifyListeners({ event: 'online' });

      // Sincronizar automáticamente al reconectar
      if (this.queue.length > 0 && !this.syncing) {
        setTimeout(() => this.sync(), 500);
      }
    });

    window.addEventListener('offline', () => {
      this.online = false;
      console.warn('⚠️ Connection lost');
      this.notifyListeners({ event: 'offline' });
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Persistence
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * setupPersistence: Guarda estado en localStorage periódicamente
   */
  setupPersistence() {
    setInterval(() => {
      if (this.queue.length > 0) {
        this.saveToStorage();
      }
    }, SYNC_CONFIG.persistInterval);
  }

  /**
   * saveToStorage: Guarda queue en localStorage
   */
  saveToStorage() {
    try {
      const data = {
        queue: this.queue,
        lastSyncTime: this.lastSyncTime,
        failed: Array.from(this.failedRequests.entries()).map(([id, req]) => req)
      };
      localStorage.setItem(SYNC_CONFIG.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving sync queue:', error);
    }
  }

  /**
   * loadFromStorage: Carga queue desde localStorage
   */
  loadFromStorage() {
    try {
      const data = JSON.parse(localStorage.getItem(SYNC_CONFIG.storageKey) || '{}');

      if (data.queue && Array.isArray(data.queue)) {
        this.queue = data.queue;
        console.log(`📋 Loaded ${this.queue.length} queued requests`);
      }

      if (data.lastSyncTime) {
        this.lastSyncTime = data.lastSyncTime;
      }

      if (data.failed && Array.isArray(data.failed)) {
        data.failed.forEach(req => {
          this.failedRequests.set(req.id, req);
        });
        console.log(`⚠️ Loaded ${data.failed.length} failed requests`);
      }
    } catch (error) {
      console.error('Error loading sync queue:', error);
    }
  }

  /**
   * clearQueue: Borra toda la queue
   */
  clearQueue() {
    const count = this.queue.length;
    this.queue = [];
    this.failedRequests.clear();
    localStorage.removeItem(SYNC_CONFIG.storageKey);
    console.log(`✓ Cleared ${count} queued requests`);
    this.notifyListeners({
      event: 'queueCleared',
      count
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Event Listeners
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * onStatusChange: Escucha cambios de estado
   */
  onStatusChange(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * notifyListeners: Notifica a todos los listeners
   */
  notifyListeners(event) {
    this.listeners.forEach(callback => {
      try {
        callback({
          ...event,
          status: this.getStatus(),
          timestamp: Date.now()
        });
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Utility
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * generateId: Genera ID único para request
   */
  generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════════════════════

const syncQueue = new SyncQueue();

// ═══════════════════════════════════════════════════════════════════════════════
// 4. EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

// Para ES6 Modules
// export { syncQueue, SyncQueue, SYNC_CONFIG };

// Para script tradicional
window.syncQueue = syncQueue;
window.SyncQueue = SyncQueue;
window.SYNC_CONFIG = SYNC_CONFIG;
