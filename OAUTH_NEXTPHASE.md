# OAUTH_NEXTPHASE.md - Autenticación Avanzada (Phase 2)

**Versión:** 1.0.0  
**Fecha:** 2026-04-22  
**Estado:** Roadmap para futuras iteraciones

---

## 📋 Próximas Fases de Autenticación

### Phase 1 - ✅ COMPLETADO
- [x] JWT autenticación básica
- [x] Login/Register con email/password
- [x] Token refresh automático
- [x] Logout y blacklist
- [x] Rate limiting
- [x] Auditoría

### Phase 2 - PRÓXIMA (3-4 semanas)
- [ ] OAuth 2.0 con Google
- [ ] Autenticación de Microsoft
- [ ] Two-Factor Authentication (2FA)

### Phase 3 - FUTURO
- [ ] OAuth con MercadoLibre
- [ ] OAuth con Facebook
- [ ] Biometría (WebAuthn)

---

## Phase 2: Detalles de Implementación

### 1. Google OAuth 2.0

#### 1.1 Setup en Google Cloud Console

```bash
# Pasos:
1. Ir a https://console.cloud.google.com
2. Crear nuevo proyecto: "Maya Autopartes"
3. Habilitar API: Google Sign-In API
4. OAuth consent screen
   - App name: "Maya Autopartes"
   - User support email: contacto@mayaautopartes.com
   - Scopes: openid, email, profile
5. Crear credenciales OAuth 2.0
   - Tipo: Web application
   - Authorized redirect URIs: 
     - http://localhost:3000/auth/google/callback
     - https://app.mayaautopartes.com/auth/google/callback
6. Guardar Client ID y Client Secret
```

#### 1.2 Dependencias

```bash
npm install --save google-auth-library passport passport-google-oauth20
npm install --save @types/passport-google-oauth20 --save-dev
```

#### 1.3 Backend Implementation

**Archivo:** `backend/auth/google-oauth.js`

```javascript
/**
 * Google OAuth 2.0 Authentication
 */
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const { v4: uuidv4 } = require('uuid');

function setupGoogleOAuth(supabaseClient) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL,
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const { id: googleId, emails, displayName, photos } = profile;
          const email = emails[0].value;

          // Buscar usuario existente
          const { data: usuario } = await supabaseClient
            .from('usuarios')
            .select('*')
            .eq('google_id', googleId)
            .single();

          if (usuario) {
            // Usuario existente - actualizar último login
            await supabaseClient
              .from('usuarios')
              .update({
                last_login: new Date().toISOString(),
                google_refresh_token: refreshToken,
              })
              .eq('usuario_id', usuario.usuario_id);

            return done(null, usuario);
          }

          // Crear nuevo usuario
          const usuario_id = uuidv4();
          const nuevoUsuario = {
            usuario_id,
            email,
            nombre: displayName,
            google_id: googleId,
            google_refresh_token: refreshToken,
            avatar_url: photos[0]?.value,
            rol: 'user',
            activo: true,
            password_hash: null, // No aplica para OAuth
            created_at: new Date().toISOString(),
            last_login: new Date().toISOString(),
          };

          const { data: created, error } = await supabaseClient
            .from('usuarios')
            .insert([nuevoUsuario])
            .select();

          if (error) {
            throw error;
          }

          return done(null, created[0]);
        } catch (error) {
          done(error, null);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.usuario_id);
  });

  passport.deserializeUser(async (usuario_id, done) => {
    try {
      const { data: user } = await supabaseClient
        .from('usuarios')
        .select('*')
        .eq('usuario_id', usuario_id)
        .single();

      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
}

module.exports = { setupGoogleOAuth };
```

#### 1.4 Rutas OAuth

**Archivo:** `backend/routes/oauth-routes.js`

```javascript
const express = require('express');
const passport = require('passport');
const { AuthManager } = require('../auth/auth');

function createOAuthRoutes(supabaseClient) {
  const router = express.Router();
  const authManager = new AuthManager(supabaseClient);

  /**
   * GET /oauth/google
   * Inicia flujo de Google OAuth
   */
  router.get(
    '/google',
    passport.authenticate('google', {
      scope: ['openid', 'email', 'profile'],
    })
  );

  /**
   * GET /oauth/google/callback
   * Callback después de autorización de Google
   */
  router.get(
    '/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    async (req, res) => {
      try {
        const usuario = req.user;

        // Generar JWT tokens
        const { token, refreshToken } = authManager._generateTokens(
          usuario.usuario_id,
          usuario.email,
          usuario.rol
        );

        // Guardar refresh token
        await authManager._saveRefreshToken(usuario.usuario_id, refreshToken);

        // Redirigir con token en query (o usar cookie segura)
        res.redirect(
          `/dashboard?token=${token}&refreshToken=${refreshToken}`
        );
      } catch (error) {
        res.redirect(`/login?error=${encodeURIComponent(error.message)}`);
      }
    }
  );

  return router;
}

module.exports = { createOAuthRoutes };
```

#### 1.5 Frontend Integration

**Archivo:** `frontend/auth/auth-google.js`

```javascript
/**
 * Google OAuth Client
 */
class GoogleAuthClient {
  constructor() {
    this.clientId = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
    this.redirectUri = `${window.location.origin}/oauth/google/callback`;
  }

  /**
   * Inicia Google Sign-In
   */
  initiateGoogleSignIn() {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', this.clientId);
    authUrl.searchParams.set('redirect_uri', this.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'openid email profile');
    authUrl.searchParams.set('prompt', 'select_account');

    window.location.href = authUrl.toString();
  }

  /**
   * Manejar callback de OAuth
   */
  async handleGoogleCallback() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const refreshToken = params.get('refreshToken');
    const error = params.get('error');

    if (error) {
      throw new Error(`OAuth error: ${error}`);
    }

    if (token && refreshToken) {
      localStorage.setItem('ma_auth_token', token);
      localStorage.setItem('ma_refresh_token', refreshToken);
      return true;
    }

    return false;
  }
}
```

#### 1.6 HTML Button

```html
<button onclick="googleAuth.initiateGoogleSignIn()">
  <img src="google-logo.svg" alt="Google">
  Sign in with Google
</button>

<script src="auth/auth-google.js"></script>
<script>
  const googleAuth = new GoogleAuthClient();
</script>
```

#### 1.7 Schema SQL

```sql
-- Agregar columnas a usuarios tabla
ALTER TABLE usuarios ADD COLUMN (
  google_id VARCHAR(255),
  google_refresh_token TEXT,
  avatar_url VARCHAR(255),
  UNIQUE(google_id)
);
```

---

### 2. Two-Factor Authentication (2FA)

#### 2.1 Opciones

| Método | Ventajas | Desventajas |
|--------|----------|-------------|
| SMS | Fácil, sin app | Costo, vulnerable a SIM swap |
| TOTP | Seguro, libre | Requiere app (Google Authenticator) |
| Email | Gratis, sin app | Más lento |
| Push | Muy seguro | Requiere app |

**Implementaremos:** TOTP (Time-based One-Time Password)

#### 2.2 Dependencias

```bash
npm install --save speakeasy qrcode
npm install --save @types/speakeasy --save-dev
```

#### 2.3 Backend Implementation

**Archivo:** `backend/auth/2fa.js`

```javascript
/**
 * Two-Factor Authentication (2FA) con TOTP
 */
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

class TwoFactorAuth {
  constructor(supabaseClient) {
    this.supabase = supabaseClient;
  }

  /**
   * Generar secret TOTP y QR code
   */
  async generateTOTPSecret(usuario_id, email) {
    const secret = speakeasy.generateSecret({
      name: `Maya Autopartes (${email})`,
      issuer: 'Maya Autopartes',
      length: 32,
    });

    // Generar QR code
    const qrCode = await qrcode.toDataURL(secret.otpauth_url);

    // Guardar secret temporal (no verificado aún)
    await this.supabase
      .from('usuarios_2fa')
      .insert([
        {
          usuario_id,
          secret: secret.base32,
          verified: false,
          created_at: new Date().toISOString(),
        },
      ]);

    return {
      secret: secret.base32,
      qrCode,
      manualKey: secret.base32,
    };
  }

  /**
   * Verificar código TOTP
   */
  async verifyTOTPCode(usuario_id, code) {
    // Obtener secret
    const { data: twoFa } = await this.supabase
      .from('usuarios_2fa')
      .select('*')
      .eq('usuario_id', usuario_id)
      .single();

    if (!twoFa) {
      throw new Error('2FA no configurado');
    }

    // Verificar código
    const isValid = speakeasy.totp.verify({
      secret: twoFa.secret,
      encoding: 'base32',
      token: code,
      window: 2, // Permitir 2 intervalos (±30 segundos)
    });

    if (!isValid) {
      throw new Error('Código TOTP inválido');
    }

    // Marcar como verificado
    await this.supabase
      .from('usuarios_2fa')
      .update({
        verified: true,
        verified_at: new Date().toISOString(),
      })
      .eq('usuario_id', usuario_id);

    return true;
  }

  /**
   * Generar backup codes (para recuperación)
   */
  async generateBackupCodes(usuario_id) {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }

    // Guardar hash de codes (no los codes en texto plano)
    const codeHashes = codes.map(code => ({
      usuario_id,
      code_hash: require('crypto')
        .createHash('sha256')
        .update(code)
        .digest('hex'),
      used: false,
    }));

    await this.supabase
      .from('usuarios_2fa_backup_codes')
      .insert(codeHashes);

    return codes; // Mostrar una sola vez al usuario
  }

  /**
   * Verificar backup code
   */
  async verifyBackupCode(usuario_id, code) {
    const codeHash = require('crypto')
      .createHash('sha256')
      .update(code)
      .digest('hex');

    const { data: backup } = await this.supabase
      .from('usuarios_2fa_backup_codes')
      .select('*')
      .eq('usuario_id', usuario_id)
      .eq('code_hash', codeHash)
      .eq('used', false)
      .single();

    if (!backup) {
      throw new Error('Código de backup inválido');
    }

    // Marcar como usado
    await this.supabase
      .from('usuarios_2fa_backup_codes')
      .update({ used: true, used_at: new Date().toISOString() })
      .eq('id', backup.id);

    return true;
  }

  /**
   * Desactivar 2FA
   */
  async disable2FA(usuario_id) {
    await this.supabase
      .from('usuarios_2fa')
      .delete()
      .eq('usuario_id', usuario_id);

    await this.supabase
      .from('usuarios_2fa_backup_codes')
      .delete()
      .eq('usuario_id', usuario_id);
  }
}

module.exports = { TwoFactorAuth };
```

#### 2.4 Rutas 2FA

**Archivo:** `backend/routes/2fa-routes.js`

```javascript
const express = require('express');
const { authMiddleware } = require('../middleware/auth-middleware');
const { TwoFactorAuth } = require('../auth/2fa');

function create2FARoutes(supabaseClient) {
  const router = express.Router();
  const twoFA = new TwoFactorAuth(supabaseClient);

  /**
   * POST /2fa/setup
   * Generar secret TOTP
   */
  router.post('/setup', authMiddleware(supabaseClient), async (req, res) => {
    try {
      const result = await twoFA.generateTOTPSecret(
        req.usuario.usuario_id,
        req.usuario.email
      );

      res.json({
        mensaje: 'Secret generado. Escanea el QR con tu app de autenticador.',
        data: {
          qrCode: result.qrCode,
          manualKey: result.manualKey,
        },
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  /**
   * POST /2fa/verify
   * Verificar código TOTP
   */
  router.post(
    '/verify',
    authMiddleware(supabaseClient),
    async (req, res) => {
      try {
        const { code } = req.body;

        await twoFA.verifyTOTPCode(req.usuario.usuario_id, code);

        const backupCodes = await twoFA.generateBackupCodes(
          req.usuario.usuario_id
        );

        res.json({
          mensaje: '2FA activado exitosamente',
          data: {
            backupCodes, // Mostrar una sola vez
            message: 'Guarda estos códigos en un lugar seguro',
          },
        });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  /**
   * POST /2fa/disable
   * Desactivar 2FA
   */
  router.post(
    '/disable',
    authMiddleware(supabaseClient),
    async (req, res) => {
      try {
        await twoFA.disable2FA(req.usuario.usuario_id);

        res.json({ mensaje: '2FA desactivado' });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    }
  );

  /**
   * POST /2fa/verify-backup-code
   * Usar código de backup
   */
  router.post('/verify-backup-code', async (req, res) => {
    try {
      const { usuario_id, code } = req.body;

      await twoFA.verifyBackupCode(usuario_id, code);

      res.json({ mensaje: 'Código de backup válido' });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  });

  return router;
}

module.exports = { create2FARoutes };
```

#### 2.5 Login con 2FA

```javascript
// Modificar flujo de login:
async login(email, password, totp_code = null) {
  // 1. Verificar email/password (como antes)
  const usuario = await this._verifyCredentials(email, password);

  // 2. Si 2FA habilitado, requerir código TOTP
  const { data: twoFA } = await this.supabase
    .from('usuarios_2fa')
    .select('*')
    .eq('usuario_id', usuario.usuario_id)
    .single();

  if (twoFA && twoFA.verified) {
    if (!totp_code) {
      // Devolver estado de "esperando 2FA"
      return {
        status: 'REQUIRE_2FA',
        usuario_id: usuario.usuario_id,
        message: 'Por favor ingresa tu código TOTP',
      };
    }

    // Verificar TOTP
    const isValid = await this._verifyTOTP(usuario.usuario_id, totp_code);
    if (!isValid) {
      throw new Error('Código TOTP inválido');
    }
  }

  // 3. Generar tokens como siempre
  return this._generateTokens(usuario.usuario_id, usuario.email, usuario.rol);
}
```

#### 2.6 Schema SQL

```sql
-- Tabla de 2FA
CREATE TABLE usuarios_2fa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(usuario_id),
  secret TEXT NOT NULL,
  verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de backup codes
CREATE TABLE usuarios_2fa_backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(usuario_id),
  code_hash VARCHAR(255) NOT NULL,
  used BOOLEAN DEFAULT false,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 3. Microsoft OAuth

Similar a Google pero con:

```bash
npm install --save passport-microsoft
```

**Variables de entorno:**
```
MICROSOFT_CLIENT_ID=...
MICROSOFT_CLIENT_SECRET=...
MICROSOFT_CALLBACK_URL=https://app.mayaautopartes.com/oauth/microsoft/callback
```

---

## Variables de Entorno (Phase 2)

```bash
# Google OAuth
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_CALLBACK_URL=https://app.mayaautopartes.com/oauth/google/callback

# Microsoft OAuth
MICROSOFT_CLIENT_ID=xxx
MICROSOFT_CLIENT_SECRET=xxx
MICROSOFT_CALLBACK_URL=https://app.mayaautopartes.com/oauth/microsoft/callback

# 2FA
TOTP_ISSUER=Maya Autopartes
```

---

## Timeline Estimado

| Fase | Duración | Tareas |
|------|----------|--------|
| Google OAuth | 1 semana | Setup Cloud, backend, frontend |
| Microsoft OAuth | 5 días | Similar a Google (reutilizar code) |
| 2FA/TOTP | 1 semana | Setup, QR generation, backup codes |
| Testing | 3 días | E2E, seguridad, UX |
| Deployment | 2 días | Staging → Production |
| **Total** | **4 semanas** | |

---

## Testing Checklist

- [ ] OAuth flow completo (Google)
- [ ] OAuth flow completo (Microsoft)
- [ ] 2FA setup y verificación
- [ ] Backup codes funcionan
- [ ] TOTP con Google Authenticator
- [ ] TOTP con Authy
- [ ] Login fallido con código 2FA incorrecto
- [ ] Rate limiting en verificación 2FA
- [ ] Logout invalida 2FA session
- [ ] Cuenta sin 2FA todavía funciona

---

## Security Considerations

✅ **Google OAuth:**
- Usar HTTPS en callback URL
- Validar state parameter
- No almacenar access token sin necesidad

✅ **2FA:**
- Límite de intentos (3 intentos, esperar 5 minutos)
- Backup codes guardados con hash
- Sessión separada para 2FA (no dar JWT completo)
- Logout invalida todos los tokens

✅ **Rate Limiting:**
- 5 intentos de TOTP por minuto
- 10 intentos de backup code por hora

---

## Referencias

- [Google OAuth 2.0](https://developers.google.com/identity/protocols/oauth2)
- [Speakeasy - TOTP Library](https://www.npmjs.com/package/speakeasy)
- [RFC 6238 - TOTP](https://tools.ietf.org/html/rfc6238)
- [OWASP - Multi-Factor Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html)

---

**Documentado por:** Equipo de Desarrollo  
**Próxima revisión:** 2026-07-22
