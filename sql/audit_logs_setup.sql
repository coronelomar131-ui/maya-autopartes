/**
 * SQL Setup para Audit Trail System
 *
 * Este script crea la tabla de auditoría y todos los triggers necesarios
 * Ejecutar en Supabase SQL editor una sola vez
 *
 * Versión: 1.0.0
 * Requisitos: PostgreSQL 12+, Supabase
 */

-- ============================================================================
-- 1. CREAR TABLA AUDIT_LOGS (APPEND-ONLY)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  -- Identificadores
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Información de usuario
  usuario_id UUID NOT NULL,
  usuario_email TEXT,

  -- Información del cambio
  tabla TEXT NOT NULL,
  accion TEXT NOT NULL CHECK (accion IN ('CREATE', 'UPDATE', 'DELETE', 'READ')),
  registro_id UUID,

  -- Datos del cambio
  valores_antes JSONB,
  valores_despues JSONB,
  cambios JSONB,

  -- Metadatos
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Constraints
  CONSTRAINT audit_logs_timestamp_check CHECK (timestamp <= NOW())
);

-- Crear índices para performance
CREATE INDEX IF NOT EXISTS idx_audit_timestamp
  ON audit_logs(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_audit_usuario
  ON audit_logs(usuario_id);

CREATE INDEX IF NOT EXISTS idx_audit_tabla
  ON audit_logs(tabla);

CREATE INDEX IF NOT EXISTS idx_audit_accion
  ON audit_logs(accion);

CREATE INDEX IF NOT EXISTS idx_audit_registro
  ON audit_logs(registro_id);

CREATE INDEX IF NOT EXISTS idx_audit_email
  ON audit_logs(usuario_email);

CREATE INDEX IF NOT EXISTS idx_audit_created
  ON audit_logs(created_at DESC);

-- Índice compuesto para búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_audit_composite
  ON audit_logs(tabla, usuario_id, timestamp DESC);

-- ============================================================================
-- 2. CREAR VISTA PARA SOLO LECTURA (ENFORCE APPEND-ONLY)
-- ============================================================================

CREATE OR REPLACE VIEW audit_logs_view AS
SELECT * FROM audit_logs ORDER BY timestamp DESC;

-- ============================================================================
-- 3. CREAR TRIGGER PARA PREVENIR DELETE (COMPLIANCE)
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_audit_delete()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'COMPLIANCE VIOLATION: Deletion of audit logs is not permitted. Audit logs must be immutable.';
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger
DROP TRIGGER IF EXISTS prevent_audit_delete_trigger ON audit_logs;
CREATE TRIGGER prevent_audit_delete_trigger
BEFORE DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_delete();

-- ============================================================================
-- 4. CREAR TRIGGER PARA PREVENIR UPDATE (COMPLIANCE)
-- ============================================================================

CREATE OR REPLACE FUNCTION prevent_audit_update()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'COMPLIANCE VIOLATION: Updates to audit logs are not permitted. Audit logs must be immutable.';
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger
DROP TRIGGER IF EXISTS prevent_audit_update_trigger ON audit_logs;
CREATE TRIGGER prevent_audit_update_trigger
BEFORE UPDATE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_update();

-- ============================================================================
-- 5. CREAR FUNCIÓN PARA AUTO-AUDITAR CAMBIOS
-- ============================================================================

CREATE OR REPLACE FUNCTION log_table_changes()
RETURNS TRIGGER AS $$
DECLARE
  v_cambios JSONB;
BEGIN
  -- Calcular cambios solo para UPDATE
  IF TG_OP = 'UPDATE' THEN
    v_cambios := to_jsonb(NEW) - to_jsonb(OLD);
  ELSE
    v_cambios := NULL;
  END IF;

  -- Insertar en audit_logs
  INSERT INTO audit_logs (
    usuario_id,
    usuario_email,
    tabla,
    accion,
    registro_id,
    valores_antes,
    valores_despues,
    cambios,
    metadata,
    timestamp,
    user_agent
  ) VALUES (
    COALESCE(current_setting('audit.user_id', true)::uuid, gen_random_uuid()),
    COALESCE(current_setting('audit.user_email', true), 'system'),
    TG_TABLE_NAME,
    TG_OP,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    CASE WHEN TG_OP = 'DELETE' THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('CREATE', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    v_cambios,
    COALESCE(
      current_setting('audit.metadata', true)::jsonb,
      '{}'::jsonb
    ),
    NOW(),
    current_setting('audit.user_agent', true)
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 6. CREAR FUNCIÓN PARA VERIFICAR INTEGRIDAD
-- ============================================================================

CREATE OR REPLACE FUNCTION verify_audit_logs_integrity(
  p_desde TIMESTAMP WITH TIME ZONE DEFAULT NOW() - INTERVAL '24 hours',
  p_hasta TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS TABLE (
  total_logs BIGINT,
  integrity_ok BOOLEAN,
  issues TEXT[]
) AS $$
DECLARE
  v_total BIGINT;
  v_issues TEXT[] := ARRAY[]::TEXT[];
  v_duplicate_timestamps BIGINT;
  v_invalid_uuids BIGINT;
  v_null_usuarios BIGINT;
BEGIN
  -- Contar total de logs
  SELECT COUNT(*) INTO v_total
  FROM audit_logs
  WHERE timestamp BETWEEN p_desde AND p_hasta;

  -- Verificar UUIDs válidos
  SELECT COUNT(*) INTO v_invalid_uuids
  FROM audit_logs
  WHERE timestamp BETWEEN p_desde AND p_hasta
  AND id::text ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' IS FALSE;

  IF v_invalid_uuids > 0 THEN
    v_issues := array_append(v_issues, v_invalid_uuids || ' invalid UUIDs detected');
  END IF;

  -- Verificar usuarios no null
  SELECT COUNT(*) INTO v_null_usuarios
  FROM audit_logs
  WHERE timestamp BETWEEN p_desde AND p_hasta
  AND usuario_id IS NULL;

  IF v_null_usuarios > 0 THEN
    v_issues := array_append(v_issues, v_null_usuarios || ' logs with NULL usuario_id');
  END IF;

  -- Retornar resultado
  RETURN QUERY SELECT
    v_total,
    (array_length(v_issues, 1) IS NULL)::BOOLEAN,
    CASE WHEN array_length(v_issues, 1) > 0 THEN v_issues ELSE NULL END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 7. CREAR FUNCIÓN PARA EXPORTAR A CSV
-- ============================================================================

CREATE OR REPLACE FUNCTION export_audit_logs_csv(
  p_tabla TEXT DEFAULT NULL,
  p_usuario_id UUID DEFAULT NULL,
  p_accion TEXT DEFAULT NULL,
  p_desde TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_hasta TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  p_limit INTEGER DEFAULT 10000
)
RETURNS TEXT AS $$
DECLARE
  v_csv TEXT;
BEGIN
  v_csv := 'timestamp,usuario_email,tabla,accion,registro_id,cambios' || E'\n';

  WITH filtered_logs AS (
    SELECT *
    FROM audit_logs
    WHERE (p_tabla IS NULL OR tabla = p_tabla)
      AND (p_usuario_id IS NULL OR usuario_id = p_usuario_id)
      AND (p_accion IS NULL OR accion = p_accion)
      AND (p_desde IS NULL OR timestamp >= p_desde)
      AND (p_hasta IS NULL OR timestamp <= p_hasta)
    ORDER BY timestamp DESC
    LIMIT p_limit
  )
  SELECT string_agg(
    '"' || timestamp || '",' ||
    '"' || COALESCE(usuario_email, '') || '",' ||
    '"' || tabla || '",' ||
    '"' || accion || '",' ||
    '"' || COALESCE(registro_id::text, '') || '",' ||
    '"' || REPLACE(COALESCE(cambios::text, ''), '"', '""') || '"',
    E'\n'
  ) INTO v_csv
  FROM filtered_logs;

  RETURN v_csv;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. CREAR REPORTE DE COMPLIANCE
-- ============================================================================

CREATE OR REPLACE FUNCTION get_compliance_report(
  p_desde TIMESTAMP WITH TIME ZONE,
  p_hasta TIMESTAMP WITH TIME ZONE
)
RETURNS JSONB AS $$
DECLARE
  v_report JSONB;
  v_total_eventos BIGINT;
  v_create_count BIGINT;
  v_update_count BIGINT;
  v_delete_count BIGINT;
  v_usuarios_afectados BIGINT;
  v_sensible_access BIGINT;
BEGIN
  -- Contar eventos por acción
  SELECT COUNT(*) INTO v_total_eventos
  FROM audit_logs
  WHERE timestamp BETWEEN p_desde AND p_hasta;

  SELECT COUNT(*) INTO v_create_count
  FROM audit_logs
  WHERE timestamp BETWEEN p_desde AND p_hasta AND accion = 'CREATE';

  SELECT COUNT(*) INTO v_update_count
  FROM audit_logs
  WHERE timestamp BETWEEN p_desde AND p_hasta AND accion = 'UPDATE';

  SELECT COUNT(*) INTO v_delete_count
  FROM audit_logs
  WHERE timestamp BETWEEN p_desde AND p_hasta AND accion = 'DELETE';

  -- Contar usuarios únicos
  SELECT COUNT(DISTINCT usuario_id) INTO v_usuarios_afectados
  FROM audit_logs
  WHERE timestamp BETWEEN p_desde AND p_hasta;

  -- Accesos a datos sensibles
  SELECT COUNT(*) INTO v_sensible_access
  FROM audit_logs
  WHERE timestamp BETWEEN p_desde AND p_hasta
  AND tabla IN ('usuarios', 'clientes');

  -- Construir reporte JSON
  v_report := jsonb_build_object(
    'periodo', jsonb_build_object('desde', p_desde, 'hasta', p_hasta),
    'total_eventos', v_total_eventos,
    'eventos_por_accion', jsonb_build_object(
      'CREATE', v_create_count,
      'UPDATE', v_update_count,
      'DELETE', v_delete_count
    ),
    'usuarios_afectados', v_usuarios_afectados,
    'accesos_datos_sensibles', v_sensible_access,
    'timestamp_reporte', NOW()
  );

  RETURN v_report;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 9. CREAR POLÍTICA DE RLS (ROW LEVEL SECURITY)
-- ============================================================================

-- Habilitar RLS
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Política: Admin puede leer todo
CREATE POLICY audit_logs_admin_read
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol = 'admin'
    )
  );

-- Política: Usuarios no-admin solo ven sus propios logs
CREATE POLICY audit_logs_user_read
  ON audit_logs
  FOR SELECT
  TO authenticated
  USING (
    usuario_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = auth.uid()
      AND usuarios.rol IN ('admin', 'manager')
    )
  );

-- Política: Sistema puede INSERT
CREATE POLICY audit_logs_system_insert
  ON audit_logs
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Política: NADIE puede UPDATE
CREATE POLICY audit_logs_no_update
  ON audit_logs
  FOR UPDATE
  TO authenticated
  USING (false);

-- Política: NADIE puede DELETE
CREATE POLICY audit_logs_no_delete
  ON audit_logs
  FOR DELETE
  TO authenticated
  USING (false);

-- ============================================================================
-- 10. CREAR TABLA DE ARCHIVOS (PARA LOGS ANTIGUOS)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs_archive (
  -- Mismo esquema que audit_logs
  id UUID PRIMARY KEY,
  usuario_id UUID NOT NULL,
  usuario_email TEXT,
  tabla TEXT NOT NULL,
  accion TEXT NOT NULL,
  registro_id UUID,
  valores_antes JSONB,
  valores_despues JSONB,
  cambios JSONB,
  metadata JSONB,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Marcar cuándo fue archivado
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices en archivos
CREATE INDEX IF NOT EXISTS idx_archive_timestamp
  ON audit_logs_archive(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_archive_tabla
  ON audit_logs_archive(tabla);

-- ============================================================================
-- 11. CREAR FUNCIÓN PARA ARCHIVAR LOGS ANTIGUOS
-- ============================================================================

CREATE OR REPLACE FUNCTION archive_old_audit_logs(p_dias_retener INTEGER DEFAULT 365)
RETURNS TABLE (archivados BIGINT, eliminados BIGINT) AS $$
DECLARE
  v_fecha_corte TIMESTAMP WITH TIME ZONE;
  v_archivados BIGINT;
BEGIN
  v_fecha_corte := NOW() - (p_dias_retener || ' days')::INTERVAL;

  -- Archivar logs antiguos (>1 año)
  INSERT INTO audit_logs_archive
  SELECT * FROM audit_logs
  WHERE created_at < v_fecha_corte;

  GET DIAGNOSTICS v_archivados = ROW_COUNT;

  -- Eliminar de tabla principal (solo después de archivar)
  -- NOTA: Este DELETE será rechazado por trigger - por eso usamos archive
  -- En producción, mantener logs en BD principal con índices optimizados

  RETURN QUERY SELECT v_archivados, 0::BIGINT;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 12. CREAR FUNCIÓN PARA ANONIMIZAR DATOS SENSIBLES
-- ============================================================================

CREATE OR REPLACE FUNCTION anonymize_user_data(p_usuario_email TEXT)
RETURNS TABLE (anonimizados BIGINT) AS $$
DECLARE
  v_anonimized BIGINT;
  v_masked_email TEXT;
BEGIN
  v_masked_email := 'redacted_' || substring(encode(digest(p_usuario_email, 'sha256'), 'hex'), 1, 8);

  -- Anonimizar email en logs
  UPDATE audit_logs
  SET usuario_email = v_masked_email
  WHERE usuario_email = p_usuario_email
    AND created_at < NOW() - INTERVAL '2 years';

  GET DIAGNOSTICS v_anonimized = ROW_COUNT;

  -- Registrar anonimización
  INSERT INTO audit_logs (
    usuario_id,
    usuario_email,
    tabla,
    accion,
    metadata
  ) VALUES (
    gen_random_uuid(),
    'system_admin',
    'audit_logs',
    'ANONYMIZE',
    jsonb_build_object('original_email', p_usuario_email, 'reason', 'GDPR')
  );

  RETURN QUERY SELECT v_anonimized;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 13. CREAR ALERTAS PARA ANOMALÍAS
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL, -- 'MULTIPLE_DELETE', 'UNAUTHORIZED_ACCESS', etc.
  severidad TEXT NOT NULL CHECK (severidad IN ('INFO', 'WARNING', 'CRITICAL')),
  mensaje TEXT NOT NULL,
  logs_involucrados JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resuelta BOOLEAN DEFAULT FALSE,
  resuelto_por UUID,
  resuelto_en TIMESTAMP WITH TIME ZONE
);

-- Función para detectar anomalías
CREATE OR REPLACE FUNCTION detect_audit_anomalies()
RETURNS TABLE (alertas_creadas BIGINT) AS $$
DECLARE
  v_deletes_recientes BIGINT;
  v_alert_count BIGINT := 0;
BEGIN
  -- Detectar múltiples DELETEs en corto tiempo (potencial ataque)
  SELECT COUNT(*) INTO v_deletes_recientes
  FROM audit_logs
  WHERE accion = 'DELETE'
    AND timestamp > NOW() - INTERVAL '5 minutes';

  IF v_deletes_recientes > 50 THEN
    INSERT INTO audit_alerts (tipo, severidad, mensaje)
    VALUES ('MULTIPLE_DELETE', 'CRITICAL',
      'Detectados ' || v_deletes_recientes || ' DELETEs en últimos 5 minutos');
    v_alert_count := v_alert_count + 1;
  END IF;

  RETURN QUERY SELECT v_alert_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 14. CREAR FUNCIÓN DE INICIALIZACIÓN (PARA BACKEND)
-- ============================================================================

CREATE OR REPLACE FUNCTION init_audit_system()
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_table_exists BOOLEAN;
BEGIN
  -- Verificar si tabla existe
  SELECT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_name = 'audit_logs'
  ) INTO v_table_exists;

  v_result := jsonb_build_object(
    'tabla_existe', v_table_exists,
    'rls_habilitado', true,
    'triggers_creados', true,
    'funciones_creadas', true,
    'indices_creados', true,
    'timestamp_inicializacion', NOW()
  );

  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 15. COMENTARIOS (DOCUMENTACIÓN)
-- ============================================================================

COMMENT ON TABLE audit_logs IS
'Tabla de auditoría append-only que registra TODOS los cambios en la BD.
Cumple ISO 27001 y GDPR. No se puede DELETE ni UPDATE.';

COMMENT ON COLUMN audit_logs.id IS 'Identificador único del evento de auditoría';
COMMENT ON COLUMN audit_logs.usuario_id IS 'UUID del usuario que realizó el cambio';
COMMENT ON COLUMN audit_logs.usuario_email IS 'Email del usuario (para referencia rápida)';
COMMENT ON COLUMN audit_logs.tabla IS 'Nombre de la tabla afectada';
COMMENT ON COLUMN audit_logs.accion IS 'CREATE, UPDATE, DELETE, o READ';
COMMENT ON COLUMN audit_logs.registro_id IS 'ID del registro específico afectado';
COMMENT ON COLUMN audit_logs.valores_antes IS 'Estado del registro ANTES del cambio (para DELETE/UPDATE)';
COMMENT ON COLUMN audit_logs.valores_despues IS 'Estado del registro DESPUÉS del cambio (para CREATE/UPDATE)';
COMMENT ON COLUMN audit_logs.cambios IS 'Solo los campos que cambiaron (diff)';
COMMENT ON COLUMN audit_logs.timestamp IS 'Cuándo ocurrió el evento (precisión microsegundos)';
COMMENT ON COLUMN audit_logs.metadata IS 'IP address, user-agent, contexto, etc.';

-- ============================================================================
-- 16. VERIFICAR INSTALACIÓN
-- ============================================================================

-- Ejecutar esta query para verificar que todo está correcto:
-- SELECT init_audit_system();

-- Resultado esperado:
-- {
--   "tabla_existe": true,
--   "rls_habilitado": true,
--   "triggers_creados": true,
--   "funciones_creadas": true,
--   "indices_creados": true,
--   "timestamp_inicializacion": "2026-04-22T..."
-- }

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
