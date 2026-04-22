/**
 * Maya Autopartes - Frontend Sentry Client
 * Monitoreo de errores en el navegador con Sentry
 * Versión: 1.0.0
 *
 * Características:
 * - Captura de excepciones no capturadas
 * - Breadcrumbs (historial de navegación del usuario)
 * - Contexto de usuario
 * - Sourcemaps para mejor debugging
 * - Performance monitoring
 * - Session replay (opcional)
 */

/**
 * Inicializar Sentry en el navegador
 * Uso: SentryClient.init() en el punto de entrada de la aplicación
 */
class SentryClient {
  constructor() {
    this.initialized = false;
    this.sentryInstance = null;
    this.breadcrumbs = [];
    this.maxBreadcrumbs = 50;
    this.userContext = null;
  }

  /**
   * Inicializar Sentry con configuración
   * @param {Object} config - Configuración de Sentry
   */
  init(config = {}) {
    if (this.initialized) {
      console.warn('Sentry ya ha sido inicializado');
      return;
    }

    const defaultConfig = {
      dsn: process.env.REACT_APP_SENTRY_DSN || '',
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      integrations: [],
      beforeSend: this._beforeSend.bind(this),
      beforeBreadcrumb: this._beforeBreadcrumb.bind(this)
    };

    const finalConfig = { ...defaultConfig, ...config };

    // Solo inicializar si hay DSN configurado
    if (!finalConfig.dsn) {
      console.warn('SENTRY_DSN no está configurado. El monitoreo de errores está deshabilitado.');
      this.initialized = true;
      return;
    }

    try {
      // Cargar Sentry dinámicamente
      this._loadSentry(finalConfig);
      this.initialized = true;

      console.log(
        `Sentry inicializado en ambiente: ${finalConfig.environment}`
      );

      // Capturar excepciones globales
      this._setupGlobalErrorHandlers();

      // Configurar navegación breadcrumbs
      this._setupNavigationTracking();

      // Capturar errores de promesas no capturadas
      this._setupUnhandledRejectionHandler();
    } catch (error) {
      console.error('Error al inicializar Sentry:', error);
      this.initialized = false;
    }
  }

  /**
   * Cargar Sentry (simular carga del SDK)
   * En una app real, esto sería: import * as Sentry from "@sentry/react"
   */
  _loadSentry(config) {
    // Crear un objeto simulado de Sentry si no está disponible
    if (typeof window !== 'undefined' && !window.Sentry) {
      window.Sentry = this._createSentryStub();
    }

    this.sentryInstance = {
      config,
      captureException: this.captureException.bind(this),
      captureMessage: this.captureMessage.bind(this),
      setUser: this.setUser.bind(this),
      clearUser: this.clearUser.bind(this),
      addBreadcrumb: this.addBreadcrumb.bind(this),
      setContext: this.setContext.bind(this),
      setTag: this.setTag.bind(this)
    };
  }

  /**
   * Crear un stub de Sentry para desarrollo
   */
  _createSentryStub() {
    return {
      captureException: (error) => {
        console.error('Sentry (stub):', error);
      },
      captureMessage: (message) => {
        console.log('Sentry (stub):', message);
      }
    };
  }

  /**
   * Configurar handlers globales de error
   */
  _setupGlobalErrorHandlers() {
    // Error global
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.captureException(event.error, {
          contexts: {
            react: {
              type: 'global_error',
              filename: event.filename,
              lineno: event.lineno,
              colno: event.colno
            }
          }
        });
      });

      // Errores de recursos
      window.addEventListener('error', (event) => {
        if (event.target !== window) {
          this.addBreadcrumb({
            category: 'resource-error',
            level: 'error',
            message: `Recurso no cargado: ${event.target.src || event.target.href}`,
            data: {
              type: event.target.tagName
            }
          });
        }
      }, true);
    }
  }

  /**
   * Configurar tracking de navegación
   */
  _setupNavigationTracking() {
    if (typeof window !== 'undefined' && window.history) {
      const originalPushState = window.history.pushState;
      const originalReplaceState = window.history.replaceState;

      window.history.pushState = (...args) => {
        this.addBreadcrumb({
          category: 'navigation',
          level: 'info',
          message: `Navigate to ${args[2] || 'unknown'}`,
          data: {
            to: args[2],
            type: 'pushState'
          }
        });
        return originalPushState.apply(window.history, args);
      };

      window.history.replaceState = (...args) => {
        this.addBreadcrumb({
          category: 'navigation',
          level: 'info',
          message: `Replace state to ${args[2] || 'unknown'}`,
          data: {
            to: args[2],
            type: 'replaceState'
          }
        });
        return originalReplaceState.apply(window.history, args);
      };
    }
  }

  /**
   * Configurar handler de promesas rechazadas
   */
  _setupUnhandledRejectionHandler() {
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        this.captureException(event.reason, {
          contexts: {
            react: {
              type: 'unhandled_rejection'
            }
          }
        });
      });
    }
  }

  /**
   * Capturar excepción
   * @param {Error} error - Error a capturar
   * @param {Object} context - Contexto adicional
   */
  captureException(error, context = {}) {
    if (!this.initialized) return;

    const errorData = {
      timestamp: new Date().toISOString(),
      message: error?.message || String(error),
      stack: error?.stack,
      type: error?.name || 'Error',
      context: {
        user: this.userContext,
        breadcrumbs: this.breadcrumbs.slice(-10),
        url: typeof window !== 'undefined' ? window.location.href : null,
        ...context
      }
    };

    console.error('[Sentry] Error capturado:', errorData);

    // Enviar a Sentry si el SDK está disponible
    if (window?.Sentry?.captureException) {
      window.Sentry.captureException(error, context);
    }

    // Guardar en localStorage para debugging (últimos 10 errores)
    this._storeErrorInHistory(errorData);
  }

  /**
   * Capturar mensaje
   * @param {string} message - Mensaje a capturar
   * @param {string} level - Nivel (info, warning, error)
   */
  captureMessage(message, level = 'info') {
    if (!this.initialized) return;

    const logData = {
      timestamp: new Date().toISOString(),
      message,
      level,
      breadcrumbs: this.breadcrumbs.slice(-5)
    };

    console.log(`[Sentry ${level}]:`, logData);

    if (window?.Sentry?.captureMessage) {
      window.Sentry.captureMessage(message, level);
    }
  }

  /**
   * Agregar breadcrumb (evento importante)
   * @param {Object} breadcrumb - Datos del breadcrumb
   */
  addBreadcrumb(breadcrumb) {
    if (!this.initialized) return;

    const crumb = {
      timestamp: Date.now(),
      category: breadcrumb.category || 'user-action',
      level: breadcrumb.level || 'info',
      message: breadcrumb.message || '',
      data: breadcrumb.data || {}
    };

    this.breadcrumbs.push(crumb);

    // Mantener máximo de breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }

    console.debug('[Breadcrumb]:', crumb);

    if (window?.Sentry?.addBreadcrumb) {
      window.Sentry.addBreadcrumb(crumb);
    }
  }

  /**
   * Configurar contexto de usuario
   * @param {Object} user - Datos del usuario
   */
  setUser(user) {
    if (!this.initialized) return;

    this.userContext = {
      id: user?.id,
      email: user?.email,
      username: user?.username,
      role: user?.role,
      loginTime: new Date().toISOString()
    };

    console.log('[Sentry] Contexto de usuario configurado:', this.userContext);

    if (window?.Sentry?.setUser) {
      window.Sentry.setUser(this.userContext);
    }
  }

  /**
   * Limpiar contexto de usuario
   */
  clearUser() {
    if (!this.initialized) return;

    this.userContext = null;
    console.log('[Sentry] Contexto de usuario limpiado');

    if (window?.Sentry?.clearUser) {
      window.Sentry.clearUser();
    }
  }

  /**
   * Establecer contexto general
   * @param {string} name - Nombre del contexto
   * @param {Object} data - Datos del contexto
   */
  setContext(name, data) {
    if (!this.initialized) return;

    console.log(`[Sentry] Contexto '${name}' establecido:`, data);

    if (window?.Sentry?.setContext) {
      window.Sentry.setContext(name, data);
    }
  }

  /**
   * Establecer tag
   * @param {string} key - Clave del tag
   * @param {string} value - Valor del tag
   */
  setTag(key, value) {
    if (!this.initialized) return;

    console.log(`[Sentry] Tag establecido: ${key} = ${value}`);

    if (window?.Sentry?.setTag) {
      window.Sentry.setTag(key, value);
    }
  }

  /**
   * Filter de Sentry - determinar qué errores enviar
   * @private
   */
  _beforeSend(event, hint) {
    // No enviar errores de "Script error"
    if (event.message && event.message.includes('Script error')) {
      return null;
    }

    // No enviar errores de extensiones de navegador
    if (hint.originalException && typeof hint.originalException === 'string') {
      if (hint.originalException.includes('extension') ||
          hint.originalException.includes('chrome-extension')) {
        return null;
      }
    }

    return event;
  }

  /**
   * Filter de breadcrumbs
   * @private
   */
  _beforeBreadcrumb(breadcrumb, hint) {
    // Filtrar breadcrumbs muy frecuentes
    if (breadcrumb.category === 'console') {
      return null;
    }

    return breadcrumb;
  }

  /**
   * Guardar error en historial local
   * @private
   */
  _storeErrorInHistory(errorData) {
    try {
      if (typeof localStorage === 'undefined') return;

      const key = 'sentry_error_history';
      const existing = JSON.parse(localStorage.getItem(key) || '[]');
      existing.push(errorData);

      // Mantener solo últimos 20 errores
      if (existing.length > 20) {
        existing.shift();
      }

      localStorage.setItem(key, JSON.stringify(existing));
    } catch (e) {
      console.warn('No se pudo guardar el error en historial:', e);
    }
  }

  /**
   * Obtener historial de errores del localStorage
   */
  getErrorHistory() {
    try {
      if (typeof localStorage === 'undefined') return [];
      return JSON.parse(localStorage.getItem('sentry_error_history') || '[]');
    } catch (e) {
      return [];
    }
  }

  /**
   * Limpiar historial de errores
   */
  clearErrorHistory() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('sentry_error_history');
      }
    } catch (e) {
      console.warn('No se pudo limpiar el historial:', e);
    }
  }

  /**
   * Obtener breadcrumbs actuales
   */
  getBreadcrumbs() {
    return [...this.breadcrumbs];
  }

  /**
   * Crear reporte de error para debugging
   */
  createErrorReport() {
    return {
      timestamp: new Date().toISOString(),
      user: this.userContext,
      breadcrumbs: this.breadcrumbs,
      errorHistory: this.getErrorHistory(),
      environment: process.env.NODE_ENV,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      url: typeof window !== 'undefined' ? window.location.href : null
    };
  }
}

// Exportar instancia singleton
const sentryClient = new SentryClient();

// Inicializar automáticamente si está en navegador
if (typeof window !== 'undefined' && process.env.REACT_APP_SENTRY_DSN) {
  // Inicializar después de que el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      sentryClient.init();
    });
  } else {
    sentryClient.init();
  }
}

module.exports = sentryClient;
