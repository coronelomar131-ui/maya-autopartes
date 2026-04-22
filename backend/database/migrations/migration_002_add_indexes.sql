-- ============================================================================
-- Migration 002: Add Indexes
-- Descripción: Crear índices para optimización de queries
-- Versión: 1.0.0
-- ============================================================================

BEGIN;

-- Índices: usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_estado ON usuarios(estado);
CREATE INDEX IF NOT EXISTS idx_usuarios_created_at ON usuarios(created_at);

-- Índices: clientes
CREATE INDEX IF NOT EXISTS idx_clientes_usuario_id ON clientes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_clientes_rfc ON clientes(rfc);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);
CREATE INDEX IF NOT EXISTS idx_clientes_activo ON clientes(activo);
CREATE INDEX IF NOT EXISTS idx_clientes_created_at ON clientes(created_at);

-- Índices: almacen
CREATE INDEX IF NOT EXISTS idx_almacen_usuario_id ON almacen(usuario_id);
CREATE INDEX IF NOT EXISTS idx_almacen_codigo_producto ON almacen(codigo_producto);
CREATE INDEX IF NOT EXISTS idx_almacen_categoria ON almacen(categoria);
CREATE INDEX IF NOT EXISTS idx_almacen_estado ON almacen(estado_producto);
CREATE INDEX IF NOT EXISTS idx_almacen_stock_actual ON almacen(stock_actual);

-- Índices: ventas
CREATE INDEX IF NOT EXISTS idx_ventas_usuario_id ON ventas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente_id ON ventas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ventas_numero_venta ON ventas(numero_venta);
CREATE INDEX IF NOT EXISTS idx_ventas_estado ON ventas(estado_venta);
CREATE INDEX IF NOT EXISTS idx_ventas_created_at ON ventas(created_at);
CREATE INDEX IF NOT EXISTS idx_ventas_tipo_venta ON ventas(tipo_venta);

-- Índices compuestos para queries comunes
CREATE INDEX IF NOT EXISTS idx_ventas_usuario_created ON ventas(usuario_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_almacen_usuario_categoria ON almacen(usuario_id, categoria);

-- Índices: detalles_venta
CREATE INDEX IF NOT EXISTS idx_detalles_venta_venta_id ON detalles_venta(venta_id);
CREATE INDEX IF NOT EXISTS idx_detalles_venta_almacen_id ON detalles_venta(almacen_id);

-- Índices: facturas
CREATE INDEX IF NOT EXISTS idx_facturas_usuario_id ON facturas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_facturas_venta_id ON facturas(venta_id);
CREATE INDEX IF NOT EXISTS idx_facturas_numero ON facturas(numero_factura);
CREATE INDEX IF NOT EXISTS idx_facturas_estado ON facturas(estado_factura);
CREATE INDEX IF NOT EXISTS idx_facturas_cliente_id ON facturas(cliente_id);

-- Índices: movimientos_inventario
CREATE INDEX IF NOT EXISTS idx_movimientos_usuario_id ON movimientos_inventario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_almacen_id ON movimientos_inventario(almacen_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos_inventario(tipo_movimiento);
CREATE INDEX IF NOT EXISTS idx_movimientos_created_at ON movimientos_inventario(created_at);

-- Índices compuestos para auditoría
CREATE INDEX IF NOT EXISTS idx_movimientos_usuario_almacen ON movimientos_inventario(usuario_id, almacen_id);

-- Índices: actividad_log
CREATE INDEX IF NOT EXISTS idx_actividad_usuario_id ON actividad_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_actividad_tabla ON actividad_log(tabla_afectada);
CREATE INDEX IF NOT EXISTS idx_actividad_timestamp ON actividad_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_actividad_resultado ON actividad_log(resultado);

-- Índice compuesto para queries de auditoría
CREATE INDEX IF NOT EXISTS idx_actividad_usuario_tabla ON actividad_log(usuario_id, tabla_afectada, timestamp DESC);

-- Índices: sesiones
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario_id ON sesiones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_token ON sesiones(token);
CREATE INDEX IF NOT EXISTS idx_sesiones_activo ON sesiones(activo);

-- Índice compuesto para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario_activo ON sesiones(usuario_id, activo);

COMMIT;
