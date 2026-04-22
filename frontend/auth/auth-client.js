/**
 * @file auth-client.js
 * @description Cliente de autenticación frontend para gestionar JWT y refresh tokens
 * Auto-refresh 5 minutos antes de expiración
 * @version 1.0.0
 */

class AuthClient {
  constructor(apiBaseUrl = 'http://localhost:3000/api') {
    this.apiBaseUrl = apiBaseUrl;
    this.authBaseUrl = `${apiBaseUrl}/auth`;

    // Keys para localStorage
    this.TOKEN_KEY = 'ma_auth_token';
    this.REFRESH_TOKEN_KEY = 'ma_refresh_token';
    this.USER_INFO_KEY = 'ma_user_info';
    this.TOKEN_EXPIRY_KEY = 'ma_token_expiry';

    // Tiempo en segundos antes de expiración para refrescar
    this.REFRESH_BEFORE_EXPIRY = 5 * 60; // 5 minutos

    // ID del intervalo de auto-refresh
    this.autoRefreshInterval = null;

    // Callback de desautenticación
    this.onUnauthorizedCallback = null;
  }

  /**
   * Registra nuevo usuario
   * @param {Object} userData - { email, password, nombre, empresa }
   * @returns {Promise<{usuario_id, email, nombre, token, refreshToken}>}
   */
  async register(userData) {
    try {
      const response = await fetch(`${this.authBaseUrl}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error en registro');
      }

      const result = await response.json();
      const authData = result.data;

      // Guardar tokens y usuario
      this._saveAuthData(authData);

      // Iniciar auto-refresh
      this._startAutoRefresh(authData.expiresIn);

      return authData;
    } catch (error) {
      console.error('Error en registro:', error);
      throw error;
    }
  }

  /**
   * Login con email y contraseña
   * @param {string} email
   * @param {string} password
   * @returns {Promise<{usuario_id, email, nombre, rol, enterprise, token, refreshToken}>}
   */
  async login(email, password) {
    try {
      const response = await fetch(`${this.authBaseUrl}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error en login');
      }

      const result = await response.json();
      const authData = result.data;

      // Guardar tokens y usuario
      this._saveAuthData(authData);

      // Iniciar auto-refresh
      this._startAutoRefresh(authData.expiresIn);

      return authData;
    } catch (error) {
      console.error('Error en login:', error);
      throw error;
    }
  }

  /**
   * Refrescar access token
   * @returns {Promise<{token, refreshToken, expiresIn}>}
   */
  async refreshToken() {
    try {
      const refreshToken = this.getRefreshToken();

      if (!refreshToken) {
        throw new Error('No refresh token disponible');
      }

      const response = await fetch(`${this.authBaseUrl}/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!response.ok) {
        // Token de refresh expirado - requiere nuevo login
        this.logout();
        if (this.onUnauthorizedCallback) {
          this.onUnauthorizedCallback('Sesión expirada. Por favor, inicie sesión nuevamente.');
        }
        throw new Error('Sesión expirada');
      }

      const result = await response.json();
      const authData = result.data;

      // Actualizar tokens
      this._saveAuthData(authData);

      // Reiniciar auto-refresh
      this._startAutoRefresh(authData.expiresIn);

      return authData;
    } catch (error) {
      console.error('Error refrescando token:', error);
      throw error;
    }
  }

  /**
   * Logout - invalida token y limpia localStorage
   * @returns {Promise<{mensaje: string}>}
   */
  async logout() {
    try {
      const token = this.getToken();

      if (token) {
        // Notificar al servidor (best effort - no fallar si hay error)
        try {
          await fetch(`${this.authBaseUrl}/logout`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
        } catch (error) {
          console.warn('Error notificando logout al servidor:', error);
        }
      }

      // Limpiar localStorage
      this._clearAuthData();

      // Detener auto-refresh
      this._stopAutoRefresh();

      return { mensaje: 'Logout exitoso' };
    } catch (error) {
      console.error('Error en logout:', error);
      // Igual limpiar datos locales
      this._clearAuthData();
      this._stopAutoRefresh();
      throw error;
    }
  }

  /**
   * Verifica si existe un token válido
   * @returns {Promise<{usuario_id, email, nombre, rol}>}
   */
  async verifyToken() {
    try {
      const token = this.getToken();

      if (!token) {
        throw new Error('No token disponible');
      }

      const response = await fetch(`${this.authBaseUrl}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Token expirado - intentar refresh
          return this._handleTokenExpired();
        }
        throw new Error('Error verificando token');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error verificando token:', error);
      throw error;
    }
  }

  /**
   * Obtiene información del usuario actual
   * @returns {Promise<{usuario_id, email, nombre, rol, empresa}>}
   */
  async getCurrentUser() {
    try {
      const token = this.getToken();

      if (!token) {
        return null;
      }

      const response = await fetch(`${this.authBaseUrl}/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 401) {
          await this._handleTokenExpired();
          return null;
        }
        throw new Error('Error obteniendo usuario actual');
      }

      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Error obteniendo usuario actual:', error);
      return null;
    }
  }

  /**
   * Cambiar contraseña
   * @param {string} currentPassword
   * @param {string} newPassword
   * @returns {Promise<{mensaje: string}>}
   */
  async changePassword(currentPassword, newPassword) {
    try {
      const token = this.getToken();

      if (!token) {
        throw new Error('No autenticado');
      }

      const response = await fetch(`${this.authBaseUrl}/change-password`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error cambiando contraseña');
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error cambiando contraseña:', error);
      throw error;
    }
  }

  /**
   * Actualizar perfil de usuario
   * @param {Object} profileData - { nombre, empresa }
   * @returns {Promise<{mensaje: string, data: Object}>}
   */
  async updateProfile(profileData) {
    try {
      const token = this.getToken();
      const usuario_id = this.getUserId();

      if (!token || !usuario_id) {
        throw new Error('No autenticado');
      }

      const response = await fetch(`${this.authBaseUrl}/profile/${usuario_id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error actualizando perfil');
      }

      const result = await response.json();

      // Actualizar info de usuario en localStorage
      if (result.data) {
        const userInfo = this.getUserInfo();
        const updatedInfo = { ...userInfo, ...result.data };
        localStorage.setItem(this.USER_INFO_KEY, JSON.stringify(updatedInfo));
      }

      return result;
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      throw error;
    }
  }

  /**
   * Obtiene token actual
   * @returns {string|null}
   */
  getToken() {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Obtiene refresh token
   * @returns {string|null}
   */
  getRefreshToken() {
    return localStorage.getItem(this.REFRESH_TOKEN_KEY);
  }

  /**
   * Obtiene información de usuario guardada
   * @returns {Object|null}
   */
  getUserInfo() {
    const data = localStorage.getItem(this.USER_INFO_KEY);
    return data ? JSON.parse(data) : null;
  }

  /**
   * Obtiene usuario_id
   * @returns {string|null}
   */
  getUserId() {
    const userInfo = this.getUserInfo();
    return userInfo?.usuario_id || null;
  }

  /**
   * Verifica si está autenticado
   * @returns {boolean}
   */
  isAuthenticated() {
    const token = this.getToken();
    return !!token;
  }

  /**
   * Registra callback para cuando se pierda la autenticación
   * @param {Function} callback
   */
  onUnauthorized(callback) {
    this.onUnauthorizedCallback = callback;
  }

  /**
   * Redirige a página de login
   * @param {string} returnUrl - URL para redireccionar después de login
   */
  redirectToLogin(returnUrl = null) {
    this._stopAutoRefresh();
    this._clearAuthData();

    let loginUrl = '/login.html';
    if (returnUrl) {
      loginUrl += `?returnUrl=${encodeURIComponent(returnUrl)}`;
    }

    window.location.href = loginUrl;
  }

  // ============== MÉTODOS PRIVADOS ==============

  /**
   * Guarda tokens y info de usuario en localStorage
   * @private
   */
  _saveAuthData(authData) {
    localStorage.setItem(this.TOKEN_KEY, authData.token);
    localStorage.setItem(this.REFRESH_TOKEN_KEY, authData.refreshToken);

    // Guardar info de usuario (email, nombre, rol, etc.)
    const userInfo = {
      usuario_id: authData.usuario_id,
      email: authData.email,
      nombre: authData.nombre,
      rol: authData.rol,
      empresa: authData.empresa,
    };
    localStorage.setItem(this.USER_INFO_KEY, JSON.stringify(userInfo));

    // Guardar tiempo de expiración
    if (authData.expiresIn) {
      const expiryTime = new Date().getTime() + this._parseExpiry(authData.expiresIn);
      localStorage.setItem(this.TOKEN_EXPIRY_KEY, expiryTime.toString());
    }
  }

  /**
   * Limpia datos de autenticación de localStorage
   * @private
   */
  _clearAuthData() {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.REFRESH_TOKEN_KEY);
    localStorage.removeItem(this.USER_INFO_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRY_KEY);
  }

  /**
   * Inicia auto-refresh de token
   * Refresca 5 minutos antes de expiración
   * @private
   */
  _startAutoRefresh(expiresIn) {
    this._stopAutoRefresh();

    // Calcular tiempo hasta expiración en ms
    const expiryMs = this._parseExpiry(expiresIn);
    const refreshDelay = Math.max(expiryMs - this.REFRESH_BEFORE_EXPIRY * 1000, 10000);

    this.autoRefreshInterval = setTimeout(async () => {
      try {
        await this.refreshToken();
        console.log('Token refrescado automáticamente');
      } catch (error) {
        console.error('Error en auto-refresh:', error);
        // El error handler en refreshToken ya maneja el logout
      }
    }, refreshDelay);
  }

  /**
   * Detiene auto-refresh
   * @private
   */
  _stopAutoRefresh() {
    if (this.autoRefreshInterval) {
      clearTimeout(this.autoRefreshInterval);
      this.autoRefreshInterval = null;
    }
  }

  /**
   * Parsea tiempo de expiración (ej: "15m", "7d") a milisegundos
   * @private
   */
  _parseExpiry(expiresIn) {
    if (typeof expiresIn === 'number') {
      return expiresIn * 1000;
    }

    if (typeof expiresIn === 'string') {
      const match = expiresIn.match(/^(\d+)([smhd])$/);
      if (!match) {
        return 15 * 60 * 1000; // Default 15 minutos
      }

      const value = parseInt(match[1]);
      const unit = match[2];

      const multipliers = {
        s: 1000,
        m: 60 * 1000,
        h: 60 * 60 * 1000,
        d: 24 * 60 * 60 * 1000,
      };

      return value * (multipliers[unit] || 1000);
    }

    return 15 * 60 * 1000; // Default
  }

  /**
   * Maneja token expirado - intenta refresh
   * @private
   */
  async _handleTokenExpired() {
    try {
      await this.refreshToken();
      return this.getUserInfo();
    } catch (error) {
      this.logout();
      if (this.onUnauthorizedCallback) {
        this.onUnauthorizedCallback('Sesión expirada. Por favor, inicie sesión nuevamente.');
      }
      throw error;
    }
  }
}

// Exportar globalmente en navegador
if (typeof window !== 'undefined') {
  window.AuthClient = AuthClient;
}

// Exportar para Node.js/bundlers
if (typeof module !== 'undefined' && module.exports) {
  module.exports = AuthClient;
}
