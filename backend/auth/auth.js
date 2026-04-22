/**
 * @file auth.js
 * @description Sistema de autenticación JWT seguro para Maya Autopartes
 * Maneja registro, login, refresh de tokens, logout y verificación de JWT
 * @version 1.0.0
 */

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/**
 * Token blacklist para logout - En producción usar Redis
 * @type {Set<string>}
 */
const tokenBlacklist = new Set();

/**
 * Configuración de tokens
 */
const TOKEN_CONFIG = {
  // JWT Access Token - válido 15 minutos
  ACCESS_TOKEN_EXPIRY: '15m',
  ACCESS_TOKEN_EXPIRY_SECONDS: 900,

  // JWT Refresh Token - válido 7 días
  REFRESH_TOKEN_EXPIRY: '7d',
  REFRESH_TOKEN_EXPIRY_SECONDS: 604800,

  // Hash salt rounds para bcrypt
  SALT_ROUNDS: 12,
};

/**
 * Clase para manejo centralizado de autenticación
 */
class AuthManager {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
    this.jwtSecret = process.env.JWT_SECRET || 'tu-secreto-muy-seguro-cambiar-en-produccion';
    this.refreshSecret = process.env.REFRESH_TOKEN_SECRET || 'tu-secreto-refresh-cambiar-en-produccion';
  }

  /**
   * Registra un nuevo usuario
   * @param {Object} userData - { email, password, nombre, empresa }
   * @returns {Promise<{usuario_id, email, token, refreshToken}>}
   */
  async register(userData) {
    const { email, password, nombre, empresa } = userData;

    // Validaciones básicas
    if (!email || !password || !nombre) {
      throw new Error('Email, contraseña y nombre son requeridos');
    }

    if (password.length < 8) {
      throw new Error('La contraseña debe tener al menos 8 caracteres');
    }

    if (!this._isValidEmail(email)) {
      throw new Error('Email no válido');
    }

    try {
      // Verificar si el usuario ya existe
      const { data: existingUser } = await this.supabase
        .from('usuarios')
        .select('usuario_id')
        .eq('email', email)
        .single();

      if (existingUser) {
        throw new Error('Este email ya está registrado');
      }
    } catch (error) {
      if (error.code !== 'PGRST116') { // PGRST116 = no rows returned (expected)
        throw error;
      }
    }

    // Hash de la contraseña
    const passwordHash = await bcrypt.hash(password, TOKEN_CONFIG.SALT_ROUNDS);

    // Crear usuario
    const usuario_id = uuidv4();
    const usuario = {
      usuario_id,
      email,
      password_hash: passwordHash,
      nombre,
      empresa: empresa || null,
      rol: 'user',
      activo: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Insertar en base de datos
    const { data, error } = await this.supabase
      .from('usuarios')
      .insert([usuario])
      .select();

    if (error) {
      throw new Error(`Error al crear usuario: ${error.message}`);
    }

    // Generar tokens
    const { token, refreshToken } = this._generateTokens(usuario_id, email, 'user');

    // Guardar refresh token en BD para validación
    await this._saveRefreshToken(usuario_id, refreshToken);

    return {
      usuario_id,
      email,
      nombre,
      token,
      refreshToken,
      expiresIn: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY,
    };
  }

  /**
   * Login de usuario con validación de credenciales
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{usuario_id, email, nombre, token, refreshToken}>}
   */
  async login(email, password) {
    if (!email || !password) {
      throw new Error('Email y contraseña requeridos');
    }

    // Buscar usuario
    const { data: usuario, error } = await this.supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !usuario) {
      // No revelar si existe el email por seguridad
      throw new Error('Credenciales inválidas');
    }

    // Verificar si está activo
    if (!usuario.activo) {
      throw new Error('La cuenta está desactivada');
    }

    // Comparar contraseña
    const passwordMatch = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordMatch) {
      // Log para auditoría (en producción usar servicio de logging)
      console.warn(`Intento fallido de login para: ${email}`);
      throw new Error('Credenciales inválidas');
    }

    // Generar tokens
    const { token, refreshToken } = this._generateTokens(
      usuario.usuario_id,
      usuario.email,
      usuario.rol
    );

    // Guardar refresh token
    await this._saveRefreshToken(usuario.usuario_id, refreshToken);

    // Actualizar last_login
    await this.supabase
      .from('usuarios')
      .update({ last_login: new Date().toISOString() })
      .eq('usuario_id', usuario.usuario_id);

    return {
      usuario_id: usuario.usuario_id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
      empresa: usuario.empresa,
      token,
      refreshToken,
      expiresIn: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY,
    };
  }

  /**
   * Refrescar token expirado usando refresh token
   * @param {string} refreshToken
   * @returns {Promise<{token, refreshToken, expiresIn}>}
   */
  async refreshAccessToken(refreshToken) {
    if (!refreshToken) {
      throw new Error('Refresh token requerido');
    }

    try {
      // Verificar refresh token
      const decoded = jwt.verify(refreshToken, this.refreshSecret);

      // Validar que existe en BD
      const { data: storedToken, error } = await this.supabase
        .from('refresh_tokens')
        .select('*')
        .eq('token_hash', this._hashToken(refreshToken))
        .eq('usuario_id', decoded.usuario_id)
        .single();

      if (error || !storedToken || !storedToken.activo) {
        throw new Error('Refresh token inválido o expirado');
      }

      // Obtener usuario
      const { data: usuario } = await this.supabase
        .from('usuarios')
        .select('*')
        .eq('usuario_id', decoded.usuario_id)
        .single();

      if (!usuario || !usuario.activo) {
        throw new Error('Usuario no válido');
      }

      // Generar nuevo access token y nuevo refresh token (rotation)
      const { token: newToken, refreshToken: newRefreshToken } = this._generateTokens(
        usuario.usuario_id,
        usuario.email,
        usuario.rol
      );

      // Invalidar refresh token anterior
      await this.supabase
        .from('refresh_tokens')
        .update({ activo: false })
        .eq('token_id', storedToken.token_id);

      // Guardar nuevo refresh token
      await this._saveRefreshToken(usuario.usuario_id, newRefreshToken);

      return {
        token: newToken,
        refreshToken: newRefreshToken,
        expiresIn: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY,
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expirado. Por favor, login nuevamente');
      }
      throw new Error(`Error al refrescar token: ${error.message}`);
    }
  }

  /**
   * Logout - invalida el token
   * @param {string} token - JWT token
   * @returns {Promise<{mensaje: string}>}
   */
  async logout(token) {
    if (!token) {
      throw new Error('Token requerido para logout');
    }

    try {
      const decoded = jwt.verify(token, this.jwtSecret);

      // Agregar a blacklist
      tokenBlacklist.add(token);

      // Invalidar refresh tokens del usuario
      await this.supabase
        .from('refresh_tokens')
        .update({ activo: false })
        .eq('usuario_id', decoded.usuario_id);

      return { mensaje: 'Logout exitoso' };
    } catch (error) {
      throw new Error(`Error al logout: ${error.message}`);
    }
  }

  /**
   * Verifica y decodifica un JWT token
   * @param {string} token - JWT token
   * @returns {Object} Payload decodificado
   */
  verifyToken(token) {
    if (!token) {
      throw new Error('Token requerido');
    }

    // Validar que no está en blacklist
    if (tokenBlacklist.has(token)) {
      throw new Error('Token ha sido invalidado (logout previo)');
    }

    try {
      const decoded = jwt.verify(token, this.jwtSecret);
      return decoded;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Token expirado');
      }
      if (error.name === 'JsonWebTokenError') {
        throw new Error('Token inválido');
      }
      throw new Error(`Error al verificar token: ${error.message}`);
    }
  }

  /**
   * Cambiar contraseña de usuario
   * @param {string} usuario_id
   * @param {string} currentPassword
   * @param {string} newPassword
   * @returns {Promise<{mensaje: string}>}
   */
  async changePassword(usuario_id, currentPassword, newPassword) {
    if (!currentPassword || !newPassword) {
      throw new Error('Contraseñas requeridas');
    }

    if (newPassword.length < 8) {
      throw new Error('Nueva contraseña debe tener al menos 8 caracteres');
    }

    // Obtener usuario
    const { data: usuario, error } = await this.supabase
      .from('usuarios')
      .select('password_hash')
      .eq('usuario_id', usuario_id)
      .single();

    if (error || !usuario) {
      throw new Error('Usuario no encontrado');
    }

    // Verificar contraseña actual
    const passwordMatch = await bcrypt.compare(currentPassword, usuario.password_hash);
    if (!passwordMatch) {
      throw new Error('Contraseña actual incorrecta');
    }

    // Hash de nueva contraseña
    const newPasswordHash = await bcrypt.hash(newPassword, TOKEN_CONFIG.SALT_ROUNDS);

    // Actualizar
    const { error: updateError } = await this.supabase
      .from('usuarios')
      .update({
        password_hash: newPasswordHash,
        updated_at: new Date().toISOString(),
      })
      .eq('usuario_id', usuario_id);

    if (updateError) {
      throw new Error(`Error al cambiar contraseña: ${updateError.message}`);
    }

    // Invalidar todos los refresh tokens (fuerza re-login)
    await this.supabase
      .from('refresh_tokens')
      .update({ activo: false })
      .eq('usuario_id', usuario_id);

    return { mensaje: 'Contraseña actualizada correctamente. Por favor, inicie sesión nuevamente.' };
  }

  /**
   * Obtiene información del usuario desde token
   * @param {string} usuario_id
   * @returns {Promise<{usuario_id, email, nombre, rol, empresa, activo}>}
   */
  async getUserInfo(usuario_id) {
    const { data: usuario, error } = await this.supabase
      .from('usuarios')
      .select('usuario_id, email, nombre, rol, empresa, activo, created_at, last_login')
      .eq('usuario_id', usuario_id)
      .single();

    if (error || !usuario) {
      throw new Error('Usuario no encontrado');
    }

    return usuario;
  }

  // ============== MÉTODOS PRIVADOS ==============

  /**
   * Genera access token y refresh token
   * @private
   */
  _generateTokens(usuario_id, email, rol) {
    const accessTokenPayload = {
      usuario_id,
      email,
      rol,
      type: 'access',
    };

    const refreshTokenPayload = {
      usuario_id,
      email,
      type: 'refresh',
      jti: uuidv4(), // JWT ID único para invalidación
    };

    const token = jwt.sign(accessTokenPayload, this.jwtSecret, {
      expiresIn: TOKEN_CONFIG.ACCESS_TOKEN_EXPIRY,
      issuer: 'maya-autopartes',
      audience: 'maya-autopartes-api',
    });

    const refreshToken = jwt.sign(refreshTokenPayload, this.refreshSecret, {
      expiresIn: TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY,
      issuer: 'maya-autopartes',
      audience: 'maya-autopartes-api',
    });

    return { token, refreshToken };
  }

  /**
   * Guarda refresh token en BD
   * @private
   */
  async _saveRefreshToken(usuario_id, token) {
    const tokenHash = this._hashToken(token);
    const expiresAt = new Date();
    expiresAt.setSeconds(expiresAt.getSeconds() + TOKEN_CONFIG.REFRESH_TOKEN_EXPIRY_SECONDS);

    const { error } = await this.supabase
      .from('refresh_tokens')
      .insert([
        {
          token_id: uuidv4(),
          usuario_id,
          token_hash: tokenHash,
          activo: true,
          created_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
        },
      ]);

    if (error) {
      console.error('Error guardando refresh token:', error);
      // No fallar el login si no se guarda el token (puede ser temporal)
    }
  }

  /**
   * Hash simple para almacenar tokens de forma segura
   * @private
   */
  _hashToken(token) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Valida formato de email
   * @private
   */
  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
}

module.exports = { AuthManager, TOKEN_CONFIG, tokenBlacklist };
