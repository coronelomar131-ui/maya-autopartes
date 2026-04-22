-- ============================================================================
-- 001-auth-schema.sql
-- Esquema de base de datos para autenticación JWT
-- Fecha: 2026-04-22
-- ============================================================================

-- ============================================================================
-- Tabla: usuarios
-- Descripción: Almacena información de usuarios del sistema
-- ============================================================================
CREATE TABLE IF NOT EXISTS usuarios (
  usuario_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Credenciales
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255),  -- NULL si usa OAuth

  -- Información personal
  nombre VARCHAR(255) NOT NULL,
  empresa VARCHAR(255),
  avatar_url VARCHAR(255),

  -- Permisos
  rol VARCHAR(50) DEFAULT 'user' CHECK (rol IN ('user', 'admin', 'moderador')),
  activo BOOLEAN DEFAULT true,

  -- OAuth
  google_id VARCHAR(255) UNIQUE,
  google_refresh_token TEXT,
  microsoft_id VARCHAR(255) UNIQUE,
  microsoft_refresh_token TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP,

  -- Índices
  CONSTRAINT email_format CHECK (email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_google_id ON usuarios(google_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_microsoft_id ON usuarios(microsoft_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo);
CREATE INDEX IF NOT EXISTS idx_usuarios_created_at ON usuarios(created_at);

-- ============================================================================
-- Tabla: refresh_tokens
-- Descripción: Almacena refresh tokens para validación y rotación
-- ============================================================================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  token_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(usuario_id) ON DELETE CASCADE,

  -- Token almacenado como hash SHA256 (por seguridad)
  token_hash VARCHAR(64) NOT NULL,

  -- Estado
  activo BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP NOT NULL,

  -- Índices
  CONSTRAINT expires_at_in_future CHECK (expires_at > CURRENT_TIMESTAMP)
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_usuario_id ON refresh_tokens(usuario_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_activo ON refresh_tokens(activo);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- ============================================================================
-- Tabla: audit_log
-- Descripción: Logging de actividades de autenticación para auditoría
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(usuario_id) ON DELETE SET NULL,

  -- Información de evento
  evento VARCHAR(100) NOT NULL,  -- LOGIN_SUCCESS, LOGIN_FAILED, LOGOUT, TOKEN_REFRESH, etc.
  descripcion TEXT,
  resultado VARCHAR(20) CHECK (resultado IN ('SUCCESS', 'FAILED', 'BLOCKED')),

  -- Información técnica
  ip_address INET,
  user_agent TEXT,
  dispositivo VARCHAR(100),  -- Mobile, Desktop, Tablet

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_audit_log_usuario_id ON audit_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_evento ON audit_log(evento);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_resultado ON audit_log(resultado);

-- ============================================================================
-- Tabla: usuarios_2fa (Two-Factor Authentication)
-- Descripción: Configuración de autenticación de dos factores
-- ============================================================================
CREATE TABLE IF NOT EXISTS usuarios_2fa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL UNIQUE REFERENCES usuarios(usuario_id) ON DELETE CASCADE,

  -- Secret TOTP
  secret VARCHAR(255) NOT NULL,  -- Base32 encoded secret

  -- Estado
  verified BOOLEAN DEFAULT false,
  enabled BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  verified_at TIMESTAMP,
  disabled_at TIMESTAMP
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_usuarios_2fa_usuario_id ON usuarios_2fa(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_2fa_enabled ON usuarios_2fa(enabled);

-- ============================================================================
-- Tabla: usuarios_2fa_backup_codes
-- Descripción: Códigos de recuperación para 2FA
-- ============================================================================
CREATE TABLE IF NOT EXISTS usuarios_2fa_backup_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES usuarios(usuario_id) ON DELETE CASCADE,

  -- Código almacenado como hash SHA256
  code_hash VARCHAR(64) NOT NULL,

  -- Estado
  used BOOLEAN DEFAULT false,

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  used_at TIMESTAMP
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_usuarios_2fa_backup_usuario_id ON usuarios_2fa_backup_codes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_2fa_backup_used ON usuarios_2fa_backup_codes(used);

-- ============================================================================
-- Tabla: login_attempts
-- Descripción: Registro de intentos de login para rate limiting y seguridad
-- ============================================================================
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,

  -- Información técnica
  ip_address INET,
  user_agent TEXT,

  -- Estado
  exitoso BOOLEAN,
  razon_fallo VARCHAR(100),  -- invalid_email, invalid_password, account_locked, etc.

  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices
CREATE INDEX IF NOT EXISTS idx_login_attempts_email ON login_attempts(email);
CREATE INDEX IF NOT EXISTS idx_login_attempts_ip_address ON login_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_login_attempts_created_at ON login_attempts(created_at);
CREATE INDEX IF NOT EXISTS idx_login_attempts_exitoso ON login_attempts(exitoso);

-- ============================================================================
-- Funciones: Auto-update de updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para usuarios
CREATE TRIGGER trigger_usuarios_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Políticas Row Level Security (RLS) - Si usas Supabase Auth
-- ============================================================================
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE usuarios_2fa ENABLE ROW LEVEL SECURITY;

-- Policy: Usuarios solo pueden ver/editar su propia info
CREATE POLICY "usuarios_select_policy"
ON usuarios FOR SELECT
USING (auth.uid()::text = usuario_id::text OR rol = 'admin');

CREATE POLICY "usuarios_update_policy"
ON usuarios FOR UPDATE
USING (auth.uid()::text = usuario_id::text OR rol = 'admin')
WITH CHECK (auth.uid()::text = usuario_id::text OR rol = 'admin');

-- Policy: Refresh tokens - usuarios solo ven los suyos
CREATE POLICY "refresh_tokens_select_policy"
ON refresh_tokens FOR SELECT
USING (usuario_id = auth.uid());

-- Policy: Audit log - solo admin puede ver
CREATE POLICY "audit_log_select_policy"
ON audit_log FOR SELECT
USING (role() = 'admin');

-- ============================================================================
-- Vistas útiles
-- ============================================================================

-- Vista: Usuarios activos
CREATE OR REPLACE VIEW usuarios_activos AS
SELECT
  usuario_id,
  email,
  nombre,
  empresa,
  rol,
  created_at,
  last_login
FROM usuarios
WHERE activo = true;

-- Vista: Usuarios que nunca han hecho login
CREATE OR REPLACE VIEW usuarios_sin_primer_login AS
SELECT
  usuario_id,
  email,
  nombre,
  empresa,
  created_at
FROM usuarios
WHERE last_login IS NULL;

-- Vista: Tokens refresh expirados
CREATE OR REPLACE VIEW refresh_tokens_expirados AS
SELECT
  token_id,
  usuario_id,
  created_at,
  expires_at
FROM refresh_tokens
WHERE expires_at < CURRENT_TIMESTAMP;

-- Vista: Intentos fallidos últimas 24 horas
CREATE OR REPLACE VIEW login_attempts_fallidos_24h AS
SELECT
  email,
  COUNT(*) as intentos,
  MIN(created_at) as primer_intento,
  MAX(created_at) as ultimo_intento,
  ip_address
FROM login_attempts
WHERE
  exitoso = false
  AND created_at > CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY email, ip_address
HAVING COUNT(*) > 3
ORDER BY intentos DESC;

-- ============================================================================
-- Datos iniciales (opcional)
-- ============================================================================

-- Usuario de prueba (contraseña: AdminTest123)
-- Hash generado con bcryptjs (12 rounds)
-- INSERT INTO usuarios (email, password_hash, nombre, empresa, rol)
-- VALUES (
--   'admin@mayaautopartes.com',
--   '$2a$12$...hash...',  -- Generar con bcryptjs en applicación
--   'Administrador',
--   'Maya Autopartes',
--   'admin'
-- );

-- ============================================================================
-- Limpieza: Borrar tokens expirados (ejecutar periódicamente)
-- ============================================================================

-- DELETE FROM refresh_tokens WHERE expires_at < CURRENT_TIMESTAMP;
-- DELETE FROM login_attempts WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days';

-- ============================================================================
-- Fin de Schema
-- ============================================================================
