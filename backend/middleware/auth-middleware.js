/**
 * @file auth-middleware.js
 * @description Middleware de autenticación para proteger rutas y extraer usuario_id
 * Verifica JWT en headers Authorization: Bearer <token>
 * @version 1.0.0
 */

const { AuthManager } = require('../auth/auth');

/**
 * Middleware para verificar JWT token
 * Extrae usuario_id del token y lo adjunta a req.usuario
 * Retorna 401 si no es válido
 *
 * @param {Object} supabaseClient - Cliente de Supabase inicializado
 * @returns {Function} Express middleware
 */
function authMiddleware(supabaseClient) {
  const authManager = new AuthManager(supabaseClient);

  return (req, res, next) => {
    try {
      // Extraer token del header
      const authHeader = req.headers.authorization;

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          error: 'No autorizado',
          message: 'Token no proporcionado o formato incorrecto',
          code: 'MISSING_TOKEN',
        });
      }

      const token = authHeader.substring(7); // Remover "Bearer "

      // Verificar token
      const decoded = authManager.verifyToken(token);

      // Adjuntar información a request
      req.usuario = {
        usuario_id: decoded.usuario_id,
        email: decoded.email,
        rol: decoded.rol,
      };

      req.token = token;

      next();
    } catch (error) {
      return res.status(401).json({
        error: 'No autorizado',
        message: error.message,
        code: error.message.includes('expirado') ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN',
      });
    }
  };
}

/**
 * Middleware para verificar rol de usuario
 * Se usa después de authMiddleware
 *
 * @param {...string} rolesPermitidos - Roles que pueden acceder
 * @returns {Function} Express middleware
 */
function roleMiddleware(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        error: 'No autorizado',
        message: 'Autenticación requerida',
      });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: `Se requiere uno de estos roles: ${rolesPermitidos.join(', ')}`,
        code: 'INSUFFICIENT_PERMISSIONS',
      });
    }

    next();
  };
}

/**
 * Middleware para verificar que el usuario accede a sus propios datos
 * Se usa después de authMiddleware
 *
 * @param {string} paramName - Nombre del parámetro en req.params (default: 'usuario_id')
 * @returns {Function} Express middleware
 */
function ownershipMiddleware(paramName = 'usuario_id') {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({
        error: 'No autorizado',
        message: 'Autenticación requerida',
      });
    }

    const targetUserId = req.params[paramName];

    if (req.usuario.usuario_id !== targetUserId && req.usuario.rol !== 'admin') {
      return res.status(403).json({
        error: 'Acceso denegado',
        message: 'No tienes permisos para acceder a estos datos',
        code: 'NOT_OWNER',
      });
    }

    next();
  };
}

/**
 * Middleware para logging de autenticación (auditoría)
 * Registra intentos de acceso y cambios sensibles
 *
 * @returns {Function} Express middleware
 */
function auditMiddleware() {
  return (req, res, next) => {
    const startTime = Date.now();

    // Interceptar response para loguear después
    const originalSend = res.send;
    res.send = function (data) {
      const duration = Date.now() - startTime;
      const auditLog = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: req.path,
        usuario_id: req.usuario?.usuario_id || 'ANÓNIMO',
        status: res.statusCode,
        duration: `${duration}ms`,
      };

      // Solo loguear rutas sensibles o errores
      if (res.statusCode >= 400 || req.path.includes('/auth/')) {
        console.log('[AUDIT]', JSON.stringify(auditLog));
      }

      return originalSend.call(this, data);
    };

    next();
  };
}

/**
 * Middleware para rate limiting básico por usuario
 * En producción usar redis/express-rate-limit
 *
 * @returns {Function} Express middleware
 */
function rateLimitMiddleware() {
  const attempts = new Map(); // { usuario_id: { count, resetTime } }
  const MAX_ATTEMPTS = 5;
  const WINDOW_MS = 15 * 60 * 1000; // 15 minutos

  return (req, res, next) => {
    // Solo aplicar a auth routes
    if (!req.path.includes('/auth/')) {
      return next();
    }

    const usuario_id = req.usuario?.usuario_id || req.body?.email || req.ip;
    const now = Date.now();

    let userAttempts = attempts.get(usuario_id);

    if (!userAttempts || now > userAttempts.resetTime) {
      attempts.set(usuario_id, {
        count: 1,
        resetTime: now + WINDOW_MS,
      });
      return next();
    }

    userAttempts.count++;

    if (userAttempts.count > MAX_ATTEMPTS) {
      return res.status(429).json({
        error: 'Demasiados intentos',
        message: `Máximo ${MAX_ATTEMPTS} intentos en ${WINDOW_MS / 60000} minutos`,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.ceil((userAttempts.resetTime - now) / 1000),
      });
    }

    next();
  };
}

/**
 * Middleware para manejo centralizado de errores de autenticación
 *
 * @returns {Function} Express error middleware
 */
function authErrorHandler() {
  return (err, req, res, next) => {
    if (!err.isAuthError) {
      return next(err);
    }

    const statusCode = err.statusCode || 401;
    const response = {
      error: err.name || 'Error de autenticación',
      message: err.message,
      code: err.code || 'AUTH_ERROR',
    };

    if (process.env.NODE_ENV === 'development') {
      response.stack = err.stack;
    }

    res.status(statusCode).json(response);
  };
}

module.exports = {
  authMiddleware,
  roleMiddleware,
  ownershipMiddleware,
  auditMiddleware,
  rateLimitMiddleware,
  authErrorHandler,
};
