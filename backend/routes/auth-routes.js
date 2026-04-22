/**
 * @file auth-routes.js
 * @description Rutas de autenticación para registro, login, refresh, logout y verificación
 * @version 1.0.0
 */

const express = require('express');
const { body, validationResult } = require('express-validator');
const { AuthManager } = require('../auth/auth');
const { authMiddleware, ownershipMiddleware, rateLimitMiddleware } = require('../middleware/auth-middleware');

/**
 * Factory para crear rutas de autenticación
 * @param {Object} supabaseClient - Cliente de Supabase inicializado
 * @returns {express.Router} Router con rutas de auth
 */
function createAuthRoutes(supabaseClient) {
  const router = express.Router();
  const authManager = new AuthManager(supabaseClient);

  /**
   * POST /auth/register
   * Registra nuevo usuario
   * Body: { email, password, nombre, empresa }
   */
  router.post(
    '/register',
    rateLimitMiddleware(),
    [
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email válido requerido'),
      body('password')
        .isLength({ min: 8 })
        .withMessage('Contraseña mínimo 8 caracteres')
        .matches(/[A-Z]/)
        .withMessage('Debe contener al menos una mayúscula')
        .matches(/[0-9]/)
        .withMessage('Debe contener al menos un número'),
      body('nombre')
        .trim()
        .notEmpty()
        .withMessage('Nombre requerido')
        .isLength({ min: 2 })
        .withMessage('Nombre mínimo 2 caracteres'),
      body('empresa')
        .optional()
        .trim()
        .isLength({ min: 2 })
        .withMessage('Empresa mínimo 2 caracteres'),
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            error: 'Validación fallida',
            details: errors.array(),
            code: 'VALIDATION_ERROR',
          });
        }

        const result = await authManager.register(req.body);

        res.status(201).json({
          mensaje: 'Usuario registrado exitosamente',
          data: {
            usuario_id: result.usuario_id,
            email: result.email,
            nombre: result.nombre,
            token: result.token,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
          },
        });
      } catch (error) {
        res.status(400).json({
          error: 'Error en registro',
          message: error.message,
          code: 'REGISTRATION_ERROR',
        });
      }
    }
  );

  /**
   * POST /auth/login
   * Login con email y contraseña
   * Body: { email, password }
   */
  router.post(
    '/login',
    rateLimitMiddleware(),
    [
      body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Email válido requerido'),
      body('password')
        .notEmpty()
        .withMessage('Contraseña requerida'),
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            error: 'Validación fallida',
            details: errors.array(),
            code: 'VALIDATION_ERROR',
          });
        }

        const { email, password } = req.body;
        const result = await authManager.login(email, password);

        res.json({
          mensaje: 'Login exitoso',
          data: {
            usuario_id: result.usuario_id,
            email: result.email,
            nombre: result.nombre,
            rol: result.rol,
            empresa: result.empresa,
            token: result.token,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
          },
        });
      } catch (error) {
        res.status(401).json({
          error: 'Error en login',
          message: error.message,
          code: 'LOGIN_ERROR',
        });
      }
    }
  );

  /**
   * POST /auth/refresh
   * Refrescar access token usando refresh token
   * Body: { refreshToken }
   */
  router.post(
    '/refresh',
    [
      body('refreshToken')
        .notEmpty()
        .withMessage('Refresh token requerido'),
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            error: 'Validación fallida',
            details: errors.array(),
          });
        }

        const result = await authManager.refreshAccessToken(req.body.refreshToken);

        res.json({
          mensaje: 'Token refrescado exitosamente',
          data: {
            token: result.token,
            refreshToken: result.refreshToken,
            expiresIn: result.expiresIn,
          },
        });
      } catch (error) {
        res.status(401).json({
          error: 'Error refrescando token',
          message: error.message,
          code: 'REFRESH_ERROR',
        });
      }
    }
  );

  /**
   * POST /auth/logout
   * Logout - invalida el token
   * Headers: Authorization: Bearer <token>
   */
  router.post(
    '/logout',
    authMiddleware(supabaseClient),
    async (req, res) => {
      try {
        await authManager.logout(req.token);

        res.json({
          mensaje: 'Logout exitoso',
        });
      } catch (error) {
        res.status(400).json({
          error: 'Error en logout',
          message: error.message,
        });
      }
    }
  );

  /**
   * POST /auth/verify
   * Verifica si un token es válido
   * Headers: Authorization: Bearer <token>
   */
  router.post(
    '/verify',
    authMiddleware(supabaseClient),
    async (req, res) => {
      try {
        const usuarioInfo = await authManager.getUserInfo(req.usuario.usuario_id);

        res.json({
          mensaje: 'Token válido',
          data: {
            usuario_id: usuarioInfo.usuario_id,
            email: usuarioInfo.email,
            nombre: usuarioInfo.nombre,
            rol: usuarioInfo.rol,
            empresa: usuarioInfo.empresa,
            activo: usuarioInfo.activo,
            created_at: usuarioInfo.created_at,
            last_login: usuarioInfo.last_login,
          },
        });
      } catch (error) {
        res.status(401).json({
          error: 'Error verificando token',
          message: error.message,
        });
      }
    }
  );

  /**
   * POST /auth/change-password
   * Cambiar contraseña de usuario
   * Headers: Authorization: Bearer <token>
   * Body: { currentPassword, newPassword }
   */
  router.post(
    '/change-password',
    authMiddleware(supabaseClient),
    [
      body('currentPassword')
        .notEmpty()
        .withMessage('Contraseña actual requerida'),
      body('newPassword')
        .isLength({ min: 8 })
        .withMessage('Nueva contraseña mínimo 8 caracteres')
        .matches(/[A-Z]/)
        .withMessage('Debe contener al menos una mayúscula')
        .matches(/[0-9]/)
        .withMessage('Debe contener al menos un número'),
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            error: 'Validación fallida',
            details: errors.array(),
          });
        }

        const { currentPassword, newPassword } = req.body;
        const result = await authManager.changePassword(
          req.usuario.usuario_id,
          currentPassword,
          newPassword
        );

        res.json({
          mensaje: result.mensaje,
        });
      } catch (error) {
        res.status(400).json({
          error: 'Error cambiando contraseña',
          message: error.message,
        });
      }
    }
  );

  /**
   * GET /auth/me
   * Obtiene información del usuario autenticado
   * Headers: Authorization: Bearer <token>
   */
  router.get(
    '/me',
    authMiddleware(supabaseClient),
    async (req, res) => {
      try {
        const usuarioInfo = await authManager.getUserInfo(req.usuario.usuario_id);

        res.json({
          data: usuarioInfo,
        });
      } catch (error) {
        res.status(404).json({
          error: 'Usuario no encontrado',
          message: error.message,
        });
      }
    }
  );

  /**
   * PUT /auth/profile/:usuario_id
   * Actualiza perfil del usuario
   * Headers: Authorization: Bearer <token>
   * Body: { nombre, empresa }
   */
  router.put(
    '/profile/:usuario_id',
    authMiddleware(supabaseClient),
    ownershipMiddleware('usuario_id'),
    [
      body('nombre')
        .optional()
        .trim()
        .isLength({ min: 2 })
        .withMessage('Nombre mínimo 2 caracteres'),
      body('empresa')
        .optional()
        .trim()
        .isLength({ min: 2 })
        .withMessage('Empresa mínimo 2 caracteres'),
    ],
    async (req, res) => {
      try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({
            error: 'Validación fallida',
            details: errors.array(),
          });
        }

        const { usuario_id } = req.params;
        const updateData = {
          ...req.body,
          updated_at: new Date().toISOString(),
        };

        const { data, error } = await supabaseClient
          .from('usuarios')
          .update(updateData)
          .eq('usuario_id', usuario_id)
          .select();

        if (error) {
          throw error;
        }

        res.json({
          mensaje: 'Perfil actualizado exitosamente',
          data: data[0],
        });
      } catch (error) {
        res.status(400).json({
          error: 'Error actualizando perfil',
          message: error.message,
        });
      }
    }
  );

  return router;
}

module.exports = { createAuthRoutes };
