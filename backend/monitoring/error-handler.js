/**
 * Maya Autopartes - Error Handler y Logger
 * Manejo centralizado de errores con logging estructurado y Sentry
 * Versión: 1.0.0
 *
 * Características:
 * - Logging estructurado (error, warn, info)
 * - Integración con Winston para persistencia
 * - Envío de errores críticos a Sentry
 * - Stack traces detallados en desarrollo
 * - Contexto de usuario en errores
 * - Deduplicación de errores repetidos
 */

const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURACIÓN DE WINSTON LOGGER
// ============================================================================

let winston;
try {
  winston = require('winston');
} catch (e) {
  console.warn('Winston no está instalado. Use: npm install winston');
  winston = null;
}

const NODE_ENV = process.env.NODE_ENV || 'development';
const LOG_DIR = process.env.LOG_DIR || path.join(__dirname, '../../logs');

// Crear directorio de logs si no existe
if (winston && !fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Configurar Winston logger
const createWinstonLogger = () => {
  if (!winston) return null;

  const transports = [
    // Logs de error
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    // Logs combinados
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      maxsize: 10485760, // 10MB
      maxFiles: 10
    })
  ];

  // Logs en consola en desarrollo
  if (NODE_ENV === 'development') {
    transports.push(
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'HH:mm:ss' }),
          winston.format.printf(({ level, message, timestamp, ...meta }) => {
            const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
            return `${timestamp} [${level}]: ${message} ${metaStr}`;
          })
        )
      })
    );
  }

  return winston.createLogger({
    level: NODE_ENV === 'production' ? 'info' : 'debug',
    transports
  });
};

const logger = createWinstonLogger();

// ============================================================================
// SENTRY CONFIGURATION
// ============================================================================

let Sentry;
try {
  Sentry = require('@sentry/node');
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: NODE_ENV,
    tracesSampleRate: NODE_ENV === 'production' ? 0.1 : 1.0,
    integrations: [
      new Sentry.Integrations.Http({ tracing: true }),
      new Sentry.Integrations.Express({
        app: true,
        request: true,
        serverName: true,
        transaction: true,
        user: true
      })
    ],
    beforeSend(event, hint) {
      // Filtrar ciertos errores
      if (event.exception) {
        const error = hint.originalException;
        // No enviar errores de validación simples
        if (error.statusCode === 400) {
          return null;
        }
      }
      return event;
    }
  });
} catch (e) {
  console.warn('Sentry no está configurado. Use: npm install @sentry/node');
  Sentry = null;
}

// ============================================================================
// ERROR DEDUPLICATION (Para evitar spam de errores repetidos)
// ============================================================================

const errorCache = new Map();
const ERROR_CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

const isErrorDuplicate = (errorKey) => {
  const cached = errorCache.get(errorKey);
  if (cached && Date.now() - cached < ERROR_CACHE_DURATION) {
    cached.count = (cached.count || 1) + 1;
    return true;
  }
  errorCache.set(errorKey, { timestamp: Date.now(), count: 1 });
  return false;
};

// Limpiar cache cada 10 minutos
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of errorCache.entries()) {
    if (now - value.timestamp > ERROR_CACHE_DURATION) {
      errorCache.delete(key);
    }
  }
}, 10 * 60 * 1000);

// ============================================================================
// ERROR FORMATTER
// ============================================================================

const formatError = (error, req = null, context = {}) => {
  return {
    timestamp: new Date().toISOString(),
    message: error.message || 'Unknown error',
    statusCode: error.statusCode || error.status || 500,
    errorType: error.name || 'Error',
    stack: NODE_ENV === 'development' ? error.stack : undefined,
    context: {
      method: req?.method,
      url: req?.originalUrl,
      ip: req?.ip,
      userId: req?.user?.id || req?.supabaseUser?.id,
      userEmail: req?.user?.email || req?.supabaseUser?.email,
      ...context
    },
    details: {
      code: error.code,
      statusMessage: error.statusMessage,
      detail: error.detail
    }
  };
};

// ============================================================================
// LOGGING FUNCTIONS
// ============================================================================

const logError = (error, req = null, context = {}) => {
  const formatted = formatError(error, req, context);
  const errorKey = `${error.name}:${error.message}`;

  // Verificar si es un error duplicado
  if (isErrorDuplicate(errorKey)) {
    return;
  }

  if (logger) {
    logger.error('Application Error', formatted);
  } else {
    console.error('[ERROR]', formatted);
  }

  // Enviar a Sentry si está configurado y es error crítico
  if (Sentry && formatted.statusCode >= 500) {
    Sentry.captureException(error, {
      contexts: { request: formatted.context },
      tags: {
        errorType: formatted.errorType,
        statusCode: formatted.statusCode
      }
    });
  }
};

const logWarn = (message, req = null, context = {}) => {
  const formatted = {
    timestamp: new Date().toISOString(),
    message,
    context: {
      method: req?.method,
      url: req?.originalUrl,
      ip: req?.ip,
      userId: req?.user?.id || req?.supabaseUser?.id,
      ...context
    }
  };

  if (logger) {
    logger.warn(message, formatted);
  } else {
    console.warn('[WARN]', formatted);
  }
};

const logInfo = (message, context = {}) => {
  const formatted = {
    timestamp: new Date().toISOString(),
    message,
    ...context
  };

  if (logger) {
    logger.info(message, formatted);
  } else {
    console.log('[INFO]', formatted);
  }
};

// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================

class AppError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

class DatabaseError extends AppError {
  constructor(message, details = {}) {
    super(message, 500, details);
    this.name = 'DatabaseError';
  }
}

class AuthenticationError extends AppError {
  constructor(message = 'Autenticación requerida', details = {}) {
    super(message, 401, details);
    this.name = 'AuthenticationError';
  }
}

class AuthorizationError extends AppError {
  constructor(message = 'Acceso denegado', details = {}) {
    super(message, 403, details);
    this.name = 'AuthorizationError';
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Recurso', details = {}) {
    super(`${resource} no encontrado`, 404, details);
    this.name = 'NotFoundError';
  }
}

// ============================================================================
// EXPRESS MIDDLEWARE FACTORY
// ============================================================================

/**
 * Wrapper para rutas async que captura errores automáticamente
 * Uso: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/**
 * Middleware global de error handling
 */
const errorHandlingMiddleware = (err, req, res, next) => {
  // Logging del error
  logError(err, req, { route: req.route?.path });

  // Determinar status code
  const statusCode = err.statusCode || err.status || 500;

  // Response estructura
  const response = {
    success: false,
    error: {
      type: err.name || 'InternalError',
      message: err.message || 'Algo salió mal',
      statusCode
    },
    timestamp: new Date().toISOString()
  };

  // Agregar detalles en desarrollo
  if (NODE_ENV === 'development') {
    response.error.stack = err.stack;
    response.error.details = err.details || {};
  }

  // Agregar ID de error para tracking en Sentry
  if (Sentry) {
    response.error.sentryId = Sentry.lastEventId?.();
  }

  res.status(statusCode).json(response);
};

/**
 * Middleware para capturar errores 404
 */
const notFoundMiddleware = (req, res, next) => {
  const error = new NotFoundError('Ruta');
  logWarn('Ruta no encontrada', req, { route: req.originalUrl });
  errorHandlingMiddleware(error, req, res, next);
};

/**
 * Middleware para agregar ID de transacción para tracking
 */
const requestContextMiddleware = (req, res, next) => {
  req.transactionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  req.startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - req.startTime;
    if (res.statusCode >= 400) {
      logWarn(`${req.method} ${req.originalUrl}`, req, {
        statusCode: res.statusCode,
        duration: `${duration}ms`,
        transactionId: req.transactionId
      });
    }
  });

  next();
};

/**
 * Middleware para agregar información de usuario al contexto
 */
const setUserContextMiddleware = (req, res, next) => {
  if (req.user || req.supabaseUser) {
    const user = req.user || req.supabaseUser;
    if (Sentry) {
      Sentry.setUser({
        id: user.id,
        email: user.email,
        username: user.username
      });
    }
  }
  next();
};

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Logger functions
  logError,
  logWarn,
  logInfo,

  // Error classes
  AppError,
  ValidationError,
  DatabaseError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,

  // Middleware
  errorHandlingMiddleware,
  notFoundMiddleware,
  requestContextMiddleware,
  setUserContextMiddleware,
  asyncHandler,

  // Winston instance
  logger: logger,

  // Sentry instance
  Sentry: Sentry,

  // Format utilities
  formatError
};
