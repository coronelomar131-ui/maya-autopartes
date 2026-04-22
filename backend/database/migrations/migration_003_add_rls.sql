-- ============================================================================
-- Migration 003: Add Row Level Security (RLS)
-- Descripción: Implementar RLS policies para seguridad multi-usuario
-- Versión: 1.0.0
-- ============================================================================

BEGIN;

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE almacen ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;
ALTER TABLE detalles_venta ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos_inventario ENABLE ROW LEVEL SECURITY;
ALTER TABLE actividad_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_empresa ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USUARIOS - RLS POLICIES
-- ============================================================================
-- Usuarios solo pueden ver su propio perfil, administradores ven todos
CREATE POLICY "usuarios_read_policy" ON usuarios
  FOR SELECT
  USING (
    auth.uid() = id OR
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'admin'
  );

-- Solo administradores pueden actualizar roles y estados
CREATE POLICY "usuarios_update_policy" ON usuarios
  FOR UPDATE
  USING (
    auth.uid() = id OR
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'admin'
  );

-- Solo administradores pueden insertar usuarios
CREATE POLICY "usuarios_insert_policy" ON usuarios
  FOR INSERT
  WITH CHECK (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================================
-- CLIENTES - RLS POLICIES
-- ============================================================================
-- Cada vendedor solo ve sus propios clientes, gerentes y admins ven todos
CREATE POLICY "clientes_read_policy" ON clientes
  FOR SELECT
  USING (
    usuario_id = auth.uid() OR
    (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('admin', 'gerente')
  );

-- Cada usuario solo puede modificar sus propios clientes
CREATE POLICY "clientes_update_policy" ON clientes
  FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- Cada usuario solo puede insertar clientes para sí mismo
CREATE POLICY "clientes_insert_policy" ON clientes
  FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

-- ============================================================================
-- ALMACEN - RLS POLICIES
-- ============================================================================
-- Cada vendedor puede ver su inventario, gerentes ven todo
CREATE POLICY "almacen_read_policy" ON almacen
  FOR SELECT
  USING (
    usuario_id = auth.uid() OR
    (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('admin', 'gerente')
  );

-- Cada usuario solo puede modificar su inventario
CREATE POLICY "almacen_update_policy" ON almacen
  FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- Cada usuario solo puede insertar productos en su inventario
CREATE POLICY "almacen_insert_policy" ON almacen
  FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

-- ============================================================================
-- VENTAS - RLS POLICIES
-- ============================================================================
-- Cada vendedor ve sus ventas, gerentes ven todo, contadores solo leen
CREATE POLICY "ventas_read_policy" ON ventas
  FOR SELECT
  USING (
    usuario_id = auth.uid() OR
    (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('admin', 'gerente', 'contador')
  );

-- Cada usuario solo puede crear/modificar sus propias ventas
CREATE POLICY "ventas_update_policy" ON ventas
  FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

-- Cada usuario solo puede crear ventas para sí mismo
CREATE POLICY "ventas_insert_policy" ON ventas
  FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

-- Solo admins pueden eliminar ventas
CREATE POLICY "ventas_delete_policy" ON ventas
  FOR DELETE
  USING ((SELECT rol FROM usuarios WHERE id = auth.uid()) = 'admin');

-- ============================================================================
-- DETALLES_VENTA - RLS POLICIES
-- ============================================================================
-- Los detalles se heredan de las ventas
CREATE POLICY "detalles_venta_read_policy" ON detalles_venta
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM ventas
      WHERE ventas.id = detalles_venta.venta_id
      AND (
        ventas.usuario_id = auth.uid() OR
        (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('admin', 'gerente', 'contador')
      )
    )
  );

CREATE POLICY "detalles_venta_insert_policy" ON detalles_venta
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM ventas
      WHERE ventas.id = detalles_venta.venta_id
      AND ventas.usuario_id = auth.uid()
    )
  );

-- ============================================================================
-- FACTURAS - RLS POLICIES
-- ============================================================================
-- Similar a ventas, con acceso adicional para contadores
CREATE POLICY "facturas_read_policy" ON facturas
  FOR SELECT
  USING (
    usuario_id = auth.uid() OR
    (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('admin', 'gerente', 'contador')
  );

CREATE POLICY "facturas_update_policy" ON facturas
  FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

CREATE POLICY "facturas_insert_policy" ON facturas
  FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

-- ============================================================================
-- MOVIMIENTOS_INVENTARIO - RLS POLICIES
-- ============================================================================
-- Cada usuario ve sus movimientos, gerentes ven todo
CREATE POLICY "movimientos_read_policy" ON movimientos_inventario
  FOR SELECT
  USING (
    usuario_id = auth.uid() OR
    (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('admin', 'gerente')
  );

CREATE POLICY "movimientos_insert_policy" ON movimientos_inventario
  FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

-- ============================================================================
-- ACTIVIDAD_LOG - RLS POLICIES
-- ============================================================================
-- Cada usuario puede ver su propio log, admins y gerentes ven todo
CREATE POLICY "actividad_log_read_policy" ON actividad_log
  FOR SELECT
  USING (
    usuario_id = auth.uid() OR
    (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('admin', 'gerente')
  );

-- Inserciones de auditoría son automáticas
CREATE POLICY "actividad_log_insert_policy" ON actividad_log
  FOR INSERT
  WITH CHECK (TRUE);

-- ============================================================================
-- CONFIGURACION_EMPRESA - RLS POLICIES
-- ============================================================================
-- Solo admins pueden ver y modificar configuraciones
CREATE POLICY "configuracion_read_policy" ON configuracion_empresa
  FOR SELECT
  USING (
    (SELECT rol FROM usuarios WHERE id = auth.uid()) IN ('admin', 'gerente')
  );

CREATE POLICY "configuracion_update_policy" ON configuracion_empresa
  FOR UPDATE
  USING ((SELECT rol FROM usuarios WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT rol FROM usuarios WHERE id = auth.uid()) = 'admin');

CREATE POLICY "configuracion_insert_policy" ON configuracion_empresa
  FOR INSERT
  WITH CHECK ((SELECT rol FROM usuarios WHERE id = auth.uid()) = 'admin');

-- ============================================================================
-- SESIONES - RLS POLICIES
-- ============================================================================
-- Cada usuario solo ve sus propias sesiones
CREATE POLICY "sesiones_read_policy" ON sesiones
  FOR SELECT
  USING (usuario_id = auth.uid());

-- Solo se puede insertar la sesión propia
CREATE POLICY "sesiones_insert_policy" ON sesiones
  FOR INSERT
  WITH CHECK (usuario_id = auth.uid());

-- Solo se puede actualizar la propia sesión
CREATE POLICY "sesiones_update_policy" ON sesiones
  FOR UPDATE
  USING (usuario_id = auth.uid())
  WITH CHECK (usuario_id = auth.uid());

COMMIT;
