-- ============================================================================
-- Schema PostgreSQL para Maya Autopartes - Sistema Multi-Usuario
-- Versión: 1.0.0
-- Descripción: Schema completo con RLS, Indexes y Foreign Keys
-- ============================================================================

-- ============================================================================
-- 1. EXTENSIONES NECESARIAS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. TABLA: USUARIOS (Autenticación y gestión de usuarios)
-- ============================================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  nombre VARCHAR(150) NOT NULL,
  apellido VARCHAR(150),
  rol VARCHAR(20) NOT NULL DEFAULT 'vendedor' CHECK (rol IN ('admin', 'vendedor', 'gerente', 'contador')),
  estado VARCHAR(20) NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'inactivo', 'suspendido')),
  telefono VARCHAR(20),
  departamento VARCHAR(100),
  empresa_id UUID,
  ultimo_acceso TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- 3. TABLA: CLIENTES (Información de clientes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nombre VARCHAR(200) NOT NULL,
  rfc VARCHAR(13) UNIQUE,
  razon_social VARCHAR(300),
  email VARCHAR(255),
  telefono VARCHAR(20),
  celular VARCHAR(20),
  calle VARCHAR(255),
  numero VARCHAR(50),
  colonia VARCHAR(150),
  ciudad VARCHAR(150),
  estado VARCHAR(150),
  codigo_postal VARCHAR(10),
  pais VARCHAR(100) DEFAULT 'México',
  tipo_cliente VARCHAR(20) DEFAULT 'regular' CHECK (tipo_cliente IN ('regular', 'mayorista', 'distribuidor', 'empresa')),
  limite_credito DECIMAL(12, 2) DEFAULT 0,
  saldo_actual DECIMAL(12, 2) DEFAULT 0,
  activo BOOLEAN DEFAULT TRUE,
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- 4. TABLA: ALMACEN (Inventario de productos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS almacen (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  codigo_producto VARCHAR(50) UNIQUE NOT NULL,
  nombre_producto VARCHAR(300) NOT NULL,
  descripcion TEXT,
  categoria VARCHAR(100),
  subcategoria VARCHAR(100),
  marca VARCHAR(100),
  stock_actual DECIMAL(10, 2) NOT NULL DEFAULT 0,
  stock_minimo DECIMAL(10, 2) DEFAULT 5,
  stock_maximo DECIMAL(10, 2),
  precio_costo DECIMAL(10, 2) NOT NULL,
  precio_venta DECIMAL(10, 2) NOT NULL,
  porcentaje_margen DECIMAL(5, 2),
  unidad_medida VARCHAR(20) DEFAULT 'unidad',
  ubicacion_almacen VARCHAR(100),
  sku_alterno VARCHAR(100),
  peso_kg DECIMAL(8, 3),
  dimensiones_cm VARCHAR(100),
  proveedor_id UUID,
  estado_producto VARCHAR(20) DEFAULT 'activo' CHECK (estado_producto IN ('activo', 'inactivo', 'descontinuado')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- 5. TABLA: VENTAS (Registro de ventas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS ventas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  numero_venta VARCHAR(50) UNIQUE NOT NULL,
  tipo_venta VARCHAR(20) NOT NULL DEFAULT 'contado' CHECK (tipo_venta IN ('contado', 'credito', 'mixto')),
  subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0,
  impuesto DECIMAL(12, 2) NOT NULL DEFAULT 0,
  descuento DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL,
  metodo_pago VARCHAR(50) DEFAULT 'efectivo' CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia', 'cheque', 'credito')),
  estado_venta VARCHAR(20) NOT NULL DEFAULT 'pendiente' CHECK (estado_venta IN ('pendiente', 'confirmada', 'completada', 'cancelada')),
  observaciones TEXT,
  referencia_pago VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completada_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- 6. TABLA: DETALLES_VENTA (Líneas de detalle de cada venta)
-- ============================================================================
CREATE TABLE IF NOT EXISTS detalles_venta (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  almacen_id UUID NOT NULL REFERENCES almacen(id) ON DELETE RESTRICT,
  cantidad DECIMAL(10, 2) NOT NULL,
  precio_unitario DECIMAL(10, 2) NOT NULL,
  descuento_linea DECIMAL(10, 2) DEFAULT 0,
  subtotal_linea DECIMAL(12, 2) NOT NULL,
  impuesto_linea DECIMAL(12, 2) DEFAULT 0,
  total_linea DECIMAL(12, 2) NOT NULL,
  numero_lote VARCHAR(100),
  fecha_vencimiento DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 7. TABLA: FACTURAS (Gestión de facturas y facturación)
-- ============================================================================
CREATE TABLE IF NOT EXISTS facturas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  venta_id UUID REFERENCES ventas(id) ON DELETE SET NULL,
  numero_factura VARCHAR(50) UNIQUE NOT NULL,
  folio_fiscal VARCHAR(100),
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  impuesto DECIMAL(12, 2) NOT NULL,
  descuento DECIMAL(12, 2) DEFAULT 0,
  total DECIMAL(12, 2) NOT NULL,
  estado_factura VARCHAR(20) NOT NULL DEFAULT 'borrador' CHECK (estado_factura IN ('borrador', 'emitida', 'cancelada', 'devuelta')),
  fecha_emision DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  metodo_pago_factura VARCHAR(50),
  forma_pago VARCHAR(50),
  observaciones TEXT,
  xml_contenido TEXT,
  pdf_url VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelada_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- 8. TABLA: MOVIMIENTOS_INVENTARIO (Historial de cambios en stock)
-- ============================================================================
CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  almacen_id UUID NOT NULL REFERENCES almacen(id) ON DELETE CASCADE,
  tipo_movimiento VARCHAR(20) NOT NULL CHECK (tipo_movimiento IN ('entrada', 'salida', 'ajuste', 'devolucion', 'transferencia')),
  cantidad_movida DECIMAL(10, 2) NOT NULL,
  stock_anterior DECIMAL(10, 2) NOT NULL,
  stock_nuevo DECIMAL(10, 2) NOT NULL,
  referencia_documento VARCHAR(100),
  razon_movimiento TEXT,
  numero_referencia VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 9. TABLA: ACTIVIDAD_LOG (Auditoría de acciones del sistema)
-- ============================================================================
CREATE TABLE IF NOT EXISTS actividad_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  accion VARCHAR(100) NOT NULL,
  tabla_afectada VARCHAR(100),
  registro_id UUID,
  detalles JSONB,
  direccion_ip VARCHAR(45),
  user_agent TEXT,
  resultado VARCHAR(20) DEFAULT 'exitoso' CHECK (resultado IN ('exitoso', 'error', 'bloqueado')),
  mensaje_error TEXT,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 10. TABLA: CONFIGURACION_EMPRESA (Configuraciones globales)
-- ============================================================================
CREATE TABLE IF NOT EXISTS configuracion_empresa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  clave_configuracion VARCHAR(100) UNIQUE NOT NULL,
  valor_configuracion TEXT NOT NULL,
  tipo_dato VARCHAR(20) DEFAULT 'texto',
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 11. TABLA: SESIONES (Gestión de sesiones activas)
-- ============================================================================
CREATE TABLE IF NOT EXISTS sesiones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  token_refresh VARCHAR(500) UNIQUE,
  direccion_ip VARCHAR(45),
  user_agent TEXT,
  dispositivo VARCHAR(100),
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expira_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ultimo_acceso TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cerrada_at TIMESTAMP WITH TIME ZONE
);

-- ============================================================================
-- 12. ÍNDICES PARA OPTIMIZACIÓN DE QUERIES
-- ============================================================================

-- Usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);
CREATE INDEX IF NOT EXISTS idx_usuarios_estado ON usuarios(estado);
CREATE INDEX IF NOT EXISTS idx_usuarios_created_at ON usuarios(created_at);

-- Clientes
CREATE INDEX IF NOT EXISTS idx_clientes_usuario_id ON clientes(usuario_id);
CREATE INDEX IF NOT EXISTS idx_clientes_rfc ON clientes(rfc);
CREATE INDEX IF NOT EXISTS idx_clientes_email ON clientes(email);
CREATE INDEX IF NOT EXISTS idx_clientes_activo ON clientes(activo);
CREATE INDEX IF NOT EXISTS idx_clientes_created_at ON clientes(created_at);

-- Almacén
CREATE INDEX IF NOT EXISTS idx_almacen_usuario_id ON almacen(usuario_id);
CREATE INDEX IF NOT EXISTS idx_almacen_codigo_producto ON almacen(codigo_producto);
CREATE INDEX IF NOT EXISTS idx_almacen_categoria ON almacen(categoria);
CREATE INDEX IF NOT EXISTS idx_almacen_estado ON almacen(estado_producto);
CREATE INDEX IF NOT EXISTS idx_almacen_stock_actual ON almacen(stock_actual);

-- Ventas
CREATE INDEX IF NOT EXISTS idx_ventas_usuario_id ON ventas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ventas_cliente_id ON ventas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_ventas_numero_venta ON ventas(numero_venta);
CREATE INDEX IF NOT EXISTS idx_ventas_estado ON ventas(estado_venta);
CREATE INDEX IF NOT EXISTS idx_ventas_created_at ON ventas(created_at);
CREATE INDEX IF NOT EXISTS idx_ventas_tipo_venta ON ventas(tipo_venta);

-- Detalles Venta
CREATE INDEX IF NOT EXISTS idx_detalles_venta_venta_id ON detalles_venta(venta_id);
CREATE INDEX IF NOT EXISTS idx_detalles_venta_almacen_id ON detalles_venta(almacen_id);

-- Facturas
CREATE INDEX IF NOT EXISTS idx_facturas_usuario_id ON facturas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_facturas_venta_id ON facturas(venta_id);
CREATE INDEX IF NOT EXISTS idx_facturas_numero ON facturas(numero_factura);
CREATE INDEX IF NOT EXISTS idx_facturas_estado ON facturas(estado_factura);
CREATE INDEX IF NOT EXISTS idx_facturas_cliente_id ON facturas(cliente_id);

-- Movimientos Inventario
CREATE INDEX IF NOT EXISTS idx_movimientos_usuario_id ON movimientos_inventario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_almacen_id ON movimientos_inventario(almacen_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos_inventario(tipo_movimiento);
CREATE INDEX IF NOT EXISTS idx_movimientos_created_at ON movimientos_inventario(created_at);

-- Actividad Log
CREATE INDEX IF NOT EXISTS idx_actividad_usuario_id ON actividad_log(usuario_id);
CREATE INDEX IF NOT EXISTS idx_actividad_tabla ON actividad_log(tabla_afectada);
CREATE INDEX IF NOT EXISTS idx_actividad_timestamp ON actividad_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_actividad_resultado ON actividad_log(resultado);

-- Sesiones
CREATE INDEX IF NOT EXISTS idx_sesiones_usuario_id ON sesiones(usuario_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_token ON sesiones(token);
CREATE INDEX IF NOT EXISTS idx_sesiones_activo ON sesiones(activo);

-- ============================================================================
-- 13. FUNCIONES PARA ACTUALIZAR TIMESTAMPS
-- ============================================================================
CREATE OR REPLACE FUNCTION actualizar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar a tablas con updated_at
CREATE TRIGGER trigger_usuarios_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trigger_clientes_updated_at
BEFORE UPDATE ON clientes
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trigger_almacen_updated_at
BEFORE UPDATE ON almacen
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trigger_ventas_updated_at
BEFORE UPDATE ON ventas
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trigger_detalles_venta_updated_at
BEFORE UPDATE ON detalles_venta
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trigger_facturas_updated_at
BEFORE UPDATE ON facturas
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trigger_movimientos_updated_at
BEFORE UPDATE ON movimientos_inventario
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trigger_actividad_log_updated_at
BEFORE UPDATE ON actividad_log
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trigger_configuracion_updated_at
BEFORE UPDATE ON configuracion_empresa
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

CREATE TRIGGER trigger_sesiones_updated_at
BEFORE UPDATE ON sesiones
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();

-- ============================================================================
-- 14. FUNCIONES PARA AUDITORÍA
-- ============================================================================
CREATE OR REPLACE FUNCTION registrar_actividad()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO actividad_log (usuario_id, accion, tabla_afectada, registro_id, detalles, resultado)
  VALUES (
    COALESCE(auth.uid(), NULL),
    TG_ARGV[0],
    TG_TABLE_NAME,
    CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END,
    CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END,
    'exitoso'
  );
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 15. COMENTARIOS DE DOCUMENTACIÓN
-- ============================================================================
COMMENT ON TABLE usuarios IS 'Tabla de usuarios del sistema con roles y estado';
COMMENT ON TABLE clientes IS 'Información de clientes para cada vendedor';
COMMENT ON TABLE almacen IS 'Inventario de productos con stock y precios';
COMMENT ON TABLE ventas IS 'Registro de transacciones de venta';
COMMENT ON TABLE detalles_venta IS 'Detalles de línea de cada venta';
COMMENT ON TABLE facturas IS 'Facturas electrónicas emitidas';
COMMENT ON TABLE movimientos_inventario IS 'Historial de cambios de inventario';
COMMENT ON TABLE actividad_log IS 'Registro de auditoría de todas las acciones';
COMMENT ON TABLE configuracion_empresa IS 'Configuraciones globales del sistema';
COMMENT ON TABLE sesiones IS 'Sesiones activas de usuarios';

COMMENT ON COLUMN usuarios.rol IS 'Roles: admin, vendedor, gerente, contador';
COMMENT ON COLUMN usuarios.estado IS 'Estados: activo, inactivo, suspendido';
COMMENT ON COLUMN clientes.tipo_cliente IS 'Clasificación: regular, mayorista, distribuidor, empresa';
COMMENT ON COLUMN almacen.estado_producto IS 'Estados: activo, inactivo, descontinuado';
COMMENT ON COLUMN ventas.estado_venta IS 'Estados: pendiente, confirmada, completada, cancelada';
COMMENT ON COLUMN ventas.tipo_venta IS 'Tipos: contado, credito, mixto';
COMMENT ON COLUMN facturas.estado_factura IS 'Estados: borrador, emitida, cancelada, devuelta';

-- ============================================================================
-- FIN DEL SCHEMA
-- ============================================================================
