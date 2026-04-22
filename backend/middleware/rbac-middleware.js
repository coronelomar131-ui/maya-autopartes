/**
 * backend/middleware/rbac-middleware.js - Middleware de Control de Acceso
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Middleware Express.js para:
 * - Verificación automática de permisos en rutas
 * - Rechazo de requests no autorizados
 * - Logging de accesos denegados
 * - Manejo de errores de autorización
 *
 * @version 1.0.0
 * @author Maya Autopartes Dev Team
 * @last-update 2026-04-22
 */

const { checkPermission, logAccessEvent } = require('./rbac/roles');

// ═════════════════════════════════════════════════════════════════════════════
// 1. MIDDLEWARE PRINCIPAL DE AUTENTICACIÓN
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Verifica que el usuario esté autenticado
 * Extrae el usuario de la sesión/token y lo adjunta a req.user
 */
function requireAuth(req, res, next) {
  // Simulación: en producción, verificar JWT o sesión
  const usuario = req.session?.usuario || req.user;

  if (!usuario || !usuario.id) {
    return res.status(401).json({
      success: false,
      error: 'No autenticado',
      message: 'Debe iniciar sesión para acceder a este recurso'
    });
  }

  req.usuario = usuario;
  next();
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. MIDDLEWARE DE VERIFICACIÓN DE PERMISOS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Factory function: crea un middleware de verificación de permisos
 * @param {String} recurso - Nombre del recurso (ej: 'venta', 'cliente')
 * @param {String} accion - Acción a verificar (ej: 'crear', 'editar')
 * @param {Boolean} logDenial - Si debe loguear accesos denegados (default: true)
 * @returns {Function} Middleware Express
 */
function requirePermission(recurso, accion, logDenial = true) {
  return (req, res, next) => {
    const usuario = req.usuario;

    // Verificar autenticación primero
    if (!usuario) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado',
        message: 'Debe iniciar sesión'
      });
    }

    // Verificar permiso
    if (!checkPermission(usuario, recurso, accion)) {
      if (logDenial) {
        logAccessEvent(usuario, recurso, accion, false, {
          ip: req.ip,
          userAgent: req.get('user-agent'),
          method: req.method,
          path: req.path
        });
      }

      return res.status(403).json({
        success: false,
        error: 'Acceso denegado',
        message: `No tiene permiso para: ${accion} en ${recurso}`,
        usuario_role: usuario.role,
        recurso,
        accion
      });
    }

    // Permiso verificado, continuar
    next();
  };
}

/**
 * Middleware para verificar permisos múltiples (OR logic)
 * @param {Array<{recurso, accion}>} permisos - Array de permisos a verificar
 * @returns {Function} Middleware Express
 */
function requireAnyPermission(permisos) {
  return (req, res, next) => {
    const usuario = req.usuario;

    if (!usuario) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado',
        message: 'Debe iniciar sesión'
      });
    }

    // Verificar si tiene al menos uno de los permisos
    const tienePermiso = permisos.some(p =>
      checkPermission(usuario, p.recurso, p.accion)
    );

    if (!tienePermiso) {
      logAccessEvent(usuario, 'multiple', 'anyPermission', false, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        permisos_requeridos: permisos
      });

      return res.status(403).json({
        success: false,
        error: 'Acceso denegado',
        message: 'No tiene permiso para realizar esta acción',
        usuario_role: usuario.role,
        permisos_requeridos: permisos
      });
    }

    next();
  };
}

/**
 * Middleware para verificar permisos múltiples (AND logic)
 * @param {Array<{recurso, accion}>} permisos - Array de permisos a verificar
 * @returns {Function} Middleware Express
 */
function requireAllPermissions(permisos) {
  return (req, res, next) => {
    const usuario = req.usuario;

    if (!usuario) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado'
      });
    }

    // Verificar si tiene todos los permisos
    const tienePermisos = permisos.every(p =>
      checkPermission(usuario, p.recurso, p.accion)
    );

    if (!tienePermisos) {
      logAccessEvent(usuario, 'multiple', 'allPermissions', false, {
        ip: req.ip,
        userAgent: req.get('user-agent'),
        permisos_requeridos: permisos
      });

      return res.status(403).json({
        success: false,
        error: 'Acceso denegado',
        message: 'No tiene todos los permisos requeridos',
        usuario_role: usuario.role
      });
    }

    next();
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. MIDDLEWARE PARA ROLES ESPECÍFICOS
// ═════════════════════════════════════════════════════════════════════════════

const { ROLES } = require('../rbac/roles');

/**
 * Middleware para verificar que el usuario tenga un rol específico
 * @param {String|Array} rolesPermitidos - Rol o array de roles permitidos
 * @returns {Function} Middleware Express
 */
function requireRole(rolesPermitidos) {
  return (req, res, next) => {
    const usuario = req.usuario;

    if (!usuario) {
      return res.status(401).json({
        success: false,
        error: 'No autenticado'
      });
    }

    const rolesArray = Array.isArray(rolesPermitidos)
      ? rolesPermitidos
      : [rolesPermitidos];

    if (!rolesArray.includes(usuario.role)) {
      logAccessEvent(usuario, 'rol', 'verificacion', false, {
        ip: req.ip,
        rolesPermitidos: rolesArray
      });

      return res.status(403).json({
        success: false,
        error: 'Acceso denegado',
        message: `Se requiere uno de estos roles: ${rolesArray.join(', ')}`,
        usuario_role: usuario.role
      });
    }

    next();
  };
}

/**
 * Middleware para permitir acceso solo a Admin
 */
function requireAdmin(req, res, next) {
  return requireRole(ROLES.ADMIN)(req, res, next);
}

/**
 * Middleware para permitir acceso a Admin o Gerente
 */
function requireAdminOrGerente(req, res, next) {
  return requireRole([ROLES.ADMIN, ROLES.GERENTE])(req, res, next);
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. MIDDLEWARE DE AUDITORÍA Y LOGGING
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Middleware para loguear todos los accesos a recursos sensibles
 * @param {String} descripcion - Descripción de la acción
 */
function auditLog(descripcion) {
  return (req, res, next) => {
    const usuario = req.usuario;

    // Log antes de procesar
    const inicio = Date.now();

    // Hook en res.json para loguear después
    const originalJson = res.json.bind(res);
    res.json = function(data) {
      const duracion = Date.now() - inicio;
      const codigoExito = res.statusCode >= 200 && res.statusCode < 300;

      console.log(`[AUDIT] ${usuario?.nombre || 'Unknown'} - ${descripcion}`, {
        usuario_id: usuario?.id,
        usuario_role: usuario?.role,
        metodo: req.method,
        ruta: req.path,
        codigo: res.statusCode,
        duracion_ms: duracion,
        timestamp: new Date().toISOString()
      });

      return originalJson(data);
    };

    next();
  };
}

/**
 * Middleware para loguear cambios importantes
 * @param {String} recurso - Recurso que se está modificando
 */
function logResourceChange(recurso) {
  return (req, res, next) => {
    const usuario = req.usuario;
    const metodo = req.method;

    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(metodo)) {
      const idRecurso = req.params.id || req.body?.id || 'N/A';

      const originalJson = res.json.bind(res);
      res.json = function(data) {
        if (res.statusCode < 300) {
          console.log(`[CHANGE LOG] ${usuario?.nombre} - ${metodo} ${recurso}/${idRecurso}`, {
            usuario_id: usuario?.id,
            recurso,
            id_recurso: idRecurso,
            metodo,
            timestamp: new Date().toISOString()
          });
        }
        return originalJson(data);
      };
    }

    next();
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. MIDDLEWARE DE MANEJO DE ERRORES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Middleware de error para capturar errores de autorización
 */
function handleAuthError(err, req, res, next) {
  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'No autenticado',
      message: err.message
    });
  }

  if (err.name === 'ForbiddenError') {
    logAccessEvent(req.usuario, 'error', 'forbidden', false, {
      error: err.message,
      ip: req.ip
    });

    return res.status(403).json({
      success: false,
      error: 'Acceso denegado',
      message: err.message
    });
  }

  next(err);
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. UTILIDADES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Extrae el usuario del request (desde sesión, JWT, etc.)
 * Esta función debe ser personalizada según tu sistema de autenticación
 */
function extractUsuario(req) {
  // Opción 1: Desde sesión (Express session)
  if (req.session?.usuario) {
    return req.session.usuario;
  }

  // Opción 2: Desde JWT header Authorization
  if (req.headers.authorization) {
    const token = req.headers.authorization.split(' ')[1];
    // Aquí decodificar el JWT (usar jsonwebtoken package)
    // const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // return decoded.usuario;
  }

  // Opción 3: Desde custom header
  if (req.headers['x-usuario']) {
    try {
      return JSON.parse(req.headers['x-usuario']);
    } catch (e) {
      // Ignorar si no es JSON válido
    }
  }

  return null;
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. EJEMPLO DE USO EN EXPRESS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Ejemplo de cómo usar estos middlewares en Express:
 *
 * const express = require('express');
 * const app = express();
 *
 * // Middleware global para extraer usuario
 * app.use((req, res, next) => {
 *   req.usuario = extractUsuario(req);
 *   next();
 * });
 *
 * // Rutas protegidas
 * app.post('/api/ventas',
 *   requireAuth,
 *   requirePermission('venta', 'crear'),
 *   auditLog('Crear venta'),
 *   logResourceChange('ventas'),
 *   (req, res) => {
 *     // Crear venta
 *     res.json({ success: true, data: venta });
 *   }
 * );
 *
 * app.get('/api/admin/usuarios',
 *   requireAuth,
 *   requireAdmin,
 *   auditLog('Listar usuarios'),
 *   (req, res) => {
 *     res.json({ success: true, data: usuarios });
 *   }
 * );
 *
 * // Middleware de error (debe estar al final)
 * app.use(handleAuthError);
 */

// ═════════════════════════════════════════════════════════════════════════════
// 8. EXPORTACIÓN
// ═════════════════════════════════════════════════════════════════════════════

module.exports = {
  // Middlewares de autenticación
  requireAuth,

  // Middlewares de permisos
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,

  // Middlewares de roles
  requireRole,
  requireAdmin,
  requireAdminOrGerente,

  // Middlewares de auditoría
  auditLog,
  logResourceChange,

  // Manejo de errores
  handleAuthError,

  // Utilidades
  extractUsuario
};
