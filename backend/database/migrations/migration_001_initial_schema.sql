-- ============================================================================
-- Migration 001: Initial Schema
-- Descripción: Crear todas las tablas principales del sistema
-- Versión: 1.0.0
-- ============================================================================

BEGIN;

-- Crear extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tabla: usuarios
CREATE TABLE usuarios (
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

-- Tabla: clientes
CREATE TABLE clientes (
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

-- Tabla: almacen
CREATE TABLE almacen (
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

-- Tabla: ventas
CREATE TABLE ventas (
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

-- Tabla: detalles_venta
CREATE TABLE detalles_venta (
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

-- Tabla: facturas
CREATE TABLE facturas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  venta_id UUID REFERENCES ventas(id) ON DELETE SET NULL,
  numero_factura VARCHAR(50) UNIQUE NOT NULL,
  folio_fiscal VARCHAR(100),
  cliente_id UUID REFERENCES clientes(id) ON DELETE SET NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  impuesto DECIMAL(12, 2) NOT NULL,
  descuesto DECIMAL(12, 2) DEFAULT 0,
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

-- Tabla: movimientos_inventario
CREATE TABLE movimientos_inventario (
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

-- Tabla: actividad_log
CREATE TABLE actividad_log (
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

-- Tabla: configuracion_empresa
CREATE TABLE configuracion_empresa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  clave_configuracion VARCHAR(100) UNIQUE NOT NULL,
  valor_configuracion TEXT NOT NULL,
  tipo_dato VARCHAR(20) DEFAULT 'texto',
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: sesiones
CREATE TABLE sesiones (
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

COMMIT;
