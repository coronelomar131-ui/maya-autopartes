-- ============================================================================
-- Seed Data - Maya Autopartes
-- Descripción: Datos de ejemplo para desarrollo y testing
-- NOTA: Solo para desarrollo. NO ejecutar en producción
-- ============================================================================

BEGIN;

-- ============================================================================
-- DATOS DE EJEMPLO: USUARIOS
-- ============================================================================

INSERT INTO usuarios (id, email, password_hash, nombre, apellido, rol, estado, telefono, departamento, ultimo_acceso, created_at)
VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'admin@mayaautopartes.com', '$2a$10$QIj3RWfsnd9R2LJJuTbPpe0W8g8xNWXwYVYWGCvBLeWEAhSdZR2LS', 'Omar', 'Contreras', 'admin', 'activo', '5555555555', 'Dirección', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('550e8400-e29b-41d4-a716-446655440001', 'juan.vendedor@mayaautopartes.com', '$2a$10$QIj3RWfsnd9R2LJJuTbPpe0W8g8xNWXwYVYWGCvBLeWEAhSdZR2LS', 'Juan', 'García', 'vendedor', 'activo', '5512345678', 'Ventas', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP - INTERVAL '30 days'),
  ('550e8400-e29b-41d4-a716-446655440002', 'maria.gerente@mayaautopartes.com', '$2a$10$QIj3RWfsnd9R2LJJuTbPpe0W8g8xNWXwYVYWGCvBLeWEAhSdZR2LS', 'María', 'López', 'gerente', 'activo', '5598765432', 'Gerencia', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP - INTERVAL '7 days'),
  ('550e8400-e29b-41d4-a716-446655440003', 'pedro.vendedor@mayaautopartes.com', '$2a$10$QIj3RWfsnd9R2LJJuTbPpe0W8g8xNWXwYVYWGCvBLeWEAhSdZR2LS', 'Pedro', 'Rodríguez', 'vendedor', 'activo', '5512345679', 'Ventas', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP - INTERVAL '15 days'),
  ('550e8400-e29b-41d4-a716-446655440004', 'contador@mayaautopartes.com', '$2a$10$QIj3RWfsnd9R2LJJuTbPpe0W8g8xNWXwYVYWGCvBLeWEAhSdZR2LS', 'Laura', 'Martínez', 'contador', 'activo', '5512345680', 'Contabilidad', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP - INTERVAL '3 days');

-- ============================================================================
-- DATOS DE EJEMPLO: CLIENTES
-- ============================================================================

INSERT INTO clientes (id, usuario_id, nombre, rfc, razon_social, email, telefono, celular, ciudad, estado, codigo_postal, tipo_cliente, limite_credito, saldo_actual, activo, created_at)
VALUES
  ('550e8400-e29b-41d4-a716-446655440100', '550e8400-e29b-41d4-a716-446655440001', 'Taller Juan Pérez', 'JUA870101ABC', 'Taller Juan Pérez S.A.', 'info@tallerjuan.com', '5512340001', '5598760001', 'México', 'Ciudad de México', '06000', 'mayorista', 50000, 15000, TRUE, CURRENT_TIMESTAMP - INTERVAL '60 days'),
  ('550e8400-e29b-41d4-a716-446655440101', '550e8400-e29b-41d4-a716-446655440001', 'Refaccionaria El Centro', 'REC900215DEF', 'Refaccionaria El Centro', 'contacto@refacciones.com', '5512340002', '5598760002', 'Guadalajara', 'Jalisco', '44100', 'distribuidor', 100000, 45000, TRUE, CURRENT_TIMESTAMP - INTERVAL '45 days'),
  ('550e8400-e29b-41d4-a716-446655440102', '550e8400-e29b-41d4-a716-446655440003', 'Mecánica Rápida', 'MEC880520GHI', 'Mecánica Rápida S.A.', 'mecanica@rapidaservicio.com', '5512340003', '5598760003', 'Monterrey', 'Nuevo León', '64000', 'regular', 20000, 5000, TRUE, CURRENT_TIMESTAMP - INTERVAL '30 days'),
  ('550e8400-e29b-41d4-a716-446655440103', '550e8400-e29b-41d4-a716-446655440003', 'Auto Partes Norte', 'APN850101JKL', 'Auto Partes Norte S.A.', 'ventas@autopartesnorte.com', '5512340004', '5598760004', 'Monterrey', 'Nuevo León', '64500', 'empresa', 150000, 80000, TRUE, CURRENT_TIMESTAMP - INTERVAL '20 days'),
  ('550e8400-e29b-41d4-a716-446655440104', '550e8400-e29b-41d4-a716-446655440001', 'Cliente Independiente', NULL, NULL, 'cliente@email.com', '5512340005', '5598760005', 'Querétaro', 'Querétaro', '76000', 'regular', 0, 0, TRUE, CURRENT_TIMESTAMP - INTERVAL '10 days');

-- ============================================================================
-- DATOS DE EJEMPLO: ALMACEN (PRODUCTOS)
-- ============================================================================

INSERT INTO almacen (id, usuario_id, codigo_producto, nombre_producto, descripcion, categoria, subcategoria, marca, stock_actual, stock_minimo, stock_maximo, precio_costo, precio_venta, porcentaje_margen, unidad_medida, estado_producto, created_at)
VALUES
  -- Productos de Juan Vendedor
  ('550e8400-e29b-41d4-a716-446655440200', '550e8400-e29b-41d4-a716-446655440001', 'MOT-001-2024', 'Motor 1.6L Gasolina', 'Motor completamente reacondicionado con garantía de 1 año', 'Motores', 'Gasolina', 'Nissan', 25, 5, 50, 8500, 12000, 41.18, 'unidad', 'activo', CURRENT_TIMESTAMP - INTERVAL '90 days'),
  ('550e8400-e29b-41d4-a716-446655440201', '550e8400-e29b-41d4-a716-446655440001', 'BAT-001-2024', 'Batería 12V 100Ah', 'Batería de alto rendimiento para vehículos de carga', 'Baterías', 'Automotrices', 'AC Delco', 150, 20, 200, 1200, 1800, 33.33, 'unidad', 'activo', CURRENT_TIMESTAMP - INTERVAL '60 days'),
  ('550e8400-e29b-41d4-a716-446655440202', '550e8400-e29b-41d4-a716-446655440001', 'ALT-001-2024', 'Alternador 120A', 'Alternador para sistemas de carga de 12V', 'Alternadores', 'Eléctricos', 'Bosch', 45, 10, 100, 2000, 3200, 37.5, 'unidad', 'activo', CURRENT_TIMESTAMP - INTERVAL '45 days'),
  ('550e8400-e29b-41d4-a716-446655440203', '550e8400-e29b-41d4-a716-446655440001', 'FLT-001-2024', 'Filtro de Aceite', 'Filtro de aceite de motor para vehículos 1.6L', 'Filtros', 'Aceite', 'Fram', 300, 50, 500, 80, 150, 46.67, 'unidad', 'activo', CURRENT_TIMESTAMP - INTERVAL '30 days'),

  -- Productos de Pedro Vendedor
  ('550e8400-e29b-41d4-a716-446655440204', '550e8400-e29b-41d4-a716-446655440003', 'BRK-001-2024', 'Pastillas de Freno Delanteras', 'Kit de pastillas de freno para ejes delanteros', 'Frenos', 'Pastillas', 'Bosch', 200, 30, 300, 600, 1000, 40, 'unidad', 'activo', CURRENT_TIMESTAMP - INTERVAL '50 days'),
  ('550e8400-e29b-41d4-a716-446655440205', '550e8400-e29b-41d4-a716-446655440003', 'TIR-001-2024', 'Llanta 185/65R15', 'Llanta de alto rendimiento para vehículos compactos', 'Llantas', 'Radiales', 'Michelin', 80, 15, 150, 1500, 2500, 40, 'unidad', 'activo', CURRENT_TIMESTAMP - INTERVAL '35 days'),
  ('550e8400-e29b-41d4-a716-446655440206', '550e8400-e29b-41d4-a716-446655440003', 'CAB-001-2024', 'Cables de Batería', 'Cables de cobre con conectores para batería', 'Cables', 'Eléctricos', 'Genérico', 500, 100, 1000, 150, 300, 50, 'unidad', 'activo', CURRENT_TIMESTAMP - INTERVAL '25 days'),

  -- Productos bajo stock (alerta)
  ('550e8400-e29b-41d4-a716-446655440207', '550e8400-e29b-41d4-a716-446655440001', 'CMP-001-2024', 'Compresor de Aire Acondicionado', 'Compresor reparado para A/C automotriz', 'A/C', 'Compresores', 'Generic', 3, 5, 20, 3000, 5000, 40, 'unidad', 'activo', CURRENT_TIMESTAMP - INTERVAL '15 days');

-- ============================================================================
-- DATOS DE EJEMPLO: VENTAS
-- ============================================================================

INSERT INTO ventas (id, usuario_id, cliente_id, numero_venta, tipo_venta, subtotal, impuesto, descuento, total, metodo_pago, estado_venta, created_at, completada_at)
VALUES
  ('550e8400-e29b-41d4-a716-446655440300', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440100', 'V-2024-000001', 'contado', 12000, 1920, 0, 13920, 'efectivo', 'completada', CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days'),
  ('550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440101', 'V-2024-000002', 'credito', 25000, 4000, 2500, 26500, 'transferencia', 'completada', CURRENT_TIMESTAMP - INTERVAL '3 days', CURRENT_TIMESTAMP - INTERVAL '3 days'),
  ('550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440102', 'V-2024-000003', 'contado', 5400, 864, 0, 6264, 'efectivo', 'completada', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days'),
  ('550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440103', 'V-2024-000004', 'credito', 35000, 5600, 3500, 37100, 'cheque', 'completada', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day'),
  ('550e8400-e29b-41d4-a716-446655440304', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440104', 'V-2024-000005', 'contado', 4350, 696, 0, 5046, 'efectivo', 'pendiente', CURRENT_TIMESTAMP, NULL);

-- ============================================================================
-- DATOS DE EJEMPLO: DETALLES_VENTA
-- ============================================================================

INSERT INTO detalles_venta (id, venta_id, almacen_id, cantidad, precio_unitario, descuento_linea, subtotal_linea, impuesto_linea, total_linea, created_at)
VALUES
  -- Venta 1
  ('550e8400-e29b-41d4-a716-446655440400', '550e8400-e29b-41d4-a716-446655440300', '550e8400-e29b-41d4-a716-446655440200', 1, 12000, 0, 12000, 1920, 13920, CURRENT_TIMESTAMP - INTERVAL '5 days'),

  -- Venta 2
  ('550e8400-e29b-41d4-a716-446655440401', '550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440201', 10, 1800, 0, 18000, 2880, 20880, CURRENT_TIMESTAMP - INTERVAL '3 days'),
  ('550e8400-e29b-41d4-a716-446655440402', '550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440202', 1, 3200, 2500, 700, 112, 812, CURRENT_TIMESTAMP - INTERVAL '3 days'),
  ('550e8400-e29b-41d4-a716-446655440403', '550e8400-e29b-41d4-a716-446655440301', '550e8400-e29b-41d4-a716-446655440203', 30, 150, 0, 4500, 720, 5220, CURRENT_TIMESTAMP - INTERVAL '3 days'),

  -- Venta 3
  ('550e8400-e29b-41d4-a716-446655440404', '550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440204', 3, 1000, 0, 3000, 480, 3480, CURRENT_TIMESTAMP - INTERVAL '2 days'),
  ('550e8400-e29b-41d4-a716-446655440405', '550e8400-e29b-41d4-a716-446655440302', '550e8400-e29b-41d4-a716-446655440206', 4, 300, 600, 600, 96, 696, CURRENT_TIMESTAMP - INTERVAL '2 days'),

  -- Venta 4
  ('550e8400-e29b-41d4-a716-446655440406', '550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440205', 10, 2500, 0, 25000, 4000, 29000, CURRENT_TIMESTAMP - INTERVAL '1 day'),
  ('550e8400-e29b-41d4-a716-446655440407', '550e8400-e29b-41d4-a716-446655440303', '550e8400-e29b-41d4-a716-446655440206', 40, 300, 3500, 8500, 1360, 9860, CURRENT_TIMESTAMP - INTERVAL '1 day'),

  -- Venta 5
  ('550e8400-e29b-41d4-a716-446655440408', '550e8400-e29b-41d4-a716-446655440304', '550e8400-e29b-41d4-a716-446655440203', 29, 150, 0, 4350, 696, 5046, CURRENT_TIMESTAMP);

-- ============================================================================
-- DATOS DE EJEMPLO: FACTURAS
-- ============================================================================

INSERT INTO facturas (id, usuario_id, venta_id, numero_factura, folio_fiscal, cliente_id, subtotal, impuesto, descuento, total, estado_factura, fecha_emision, fecha_vencimiento, metodo_pago_factura, forma_pago, created_at)
VALUES
  ('550e8400-e29b-41d4-a716-446655440500', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440300', 'F-2024-000001', NULL, '550e8400-e29b-41d4-a716-446655440100', 12000, 1920, 0, 13920, 'emitida', CURRENT_DATE - INTERVAL '5 days', CURRENT_DATE + INTERVAL '25 days', 'efectivo', 'efectivo', CURRENT_TIMESTAMP - INTERVAL '5 days'),
  ('550e8400-e29b-41d4-a716-446655440501', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440301', 'F-2024-000002', NULL, '550e8400-e29b-41d4-a716-446655440101', 25000, 4000, 2500, 26500, 'emitida', CURRENT_DATE - INTERVAL '3 days', CURRENT_DATE + INTERVAL '27 days', 'transferencia', 'transferencia', CURRENT_TIMESTAMP - INTERVAL '3 days'),
  ('550e8400-e29b-41d4-a716-446655440502', '550e8400-e29b-41d4-a716-446655440003', '550e8400-e29b-41d4-a716-446655440302', 'F-2024-000003', NULL, '550e8400-e29b-41d4-a716-446655440102', 5400, 864, 0, 6264, 'emitida', CURRENT_DATE - INTERVAL '2 days', CURRENT_DATE + INTERVAL '28 days', 'efectivo', 'efectivo', CURRENT_TIMESTAMP - INTERVAL '2 days');

-- ============================================================================
-- DATOS DE EJEMPLO: MOVIMIENTOS_INVENTARIO
-- ============================================================================

INSERT INTO movimientos_inventario (id, usuario_id, almacen_id, tipo_movimiento, cantidad_movida, stock_anterior, stock_nuevo, referencia_documento, razon_movimiento, created_at)
VALUES
  ('550e8400-e29b-41d4-a716-446655440600', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440200', 'entrada', 50, 0, 50, 'COMP-2024-001', 'Compra inicial', CURRENT_TIMESTAMP - INTERVAL '90 days'),
  ('550e8400-e29b-41d4-a716-446655440601', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440200', 'salida', 25, 50, 25, 'V-2024-000001', 'Venta a cliente', CURRENT_TIMESTAMP - INTERVAL '5 days'),
  ('550e8400-e29b-41d4-a716-446655440602', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440201', 'entrada', 500, 0, 500, 'COMP-2024-002', 'Compra a distribuidor', CURRENT_TIMESTAMP - INTERVAL '60 days'),
  ('550e8400-e29b-41d4-a716-446655440603', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440201', 'salida', 10, 500, 490, 'V-2024-000002', 'Venta a cliente', CURRENT_TIMESTAMP - INTERVAL '3 days'),
  ('550e8400-e29b-41d4-a716-446655440604', '550e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440207', 'ajuste', 2, 5, 3, 'ADJ-2024-001', 'Ajuste por inventario físico', CURRENT_TIMESTAMP - INTERVAL '1 day');

-- ============================================================================
-- DATOS DE EJEMPLO: CONFIGURACION_EMPRESA
-- ============================================================================

INSERT INTO configuracion_empresa (usuario_id, clave_configuracion, valor_configuracion, tipo_dato, descripcion, created_at)
VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'IVA_RATE', '0.16', 'numero', 'Tasa de IVA del 16%', CURRENT_TIMESTAMP),
  ('550e8400-e29b-41d4-a716-446655440000', 'EMPRESA_RFC', 'MAY850101ABC', 'texto', 'RFC de la empresa', CURRENT_TIMESTAMP),
  ('550e8400-e29b-41d4-a716-446655440000', 'EMPRESA_RAZON_SOCIAL', 'Maya Autopartes S.A. de C.V.', 'texto', 'Razón social registrada', CURRENT_TIMESTAMP),
  ('550e8400-e29b-41d4-a716-446655440000', 'EMPRESA_REGIMEN_FISCAL', 'PFE', 'texto', 'Régimen fiscal SAT', CURRENT_TIMESTAMP);

-- ============================================================================
-- DATOS DE EJEMPLO: ACTIVIDAD_LOG
-- ============================================================================

INSERT INTO actividad_log (usuario_id, accion, tabla_afectada, registro_id, detalles, resultado, timestamp, created_at)
VALUES
  ('550e8400-e29b-41d4-a716-446655440001', 'INSERT', 'clientes', '550e8400-e29b-41d4-a716-446655440100', '{"nombre":"Taller Juan Pérez","tipo":"mayorista"}', 'exitoso', CURRENT_TIMESTAMP - INTERVAL '60 days', CURRENT_TIMESTAMP - INTERVAL '60 days'),
  ('550e8400-e29b-41d4-a716-446655440001', 'INSERT', 'almacen', '550e8400-e29b-41d4-a716-446655440200', '{"codigo":"MOT-001-2024","nombre":"Motor 1.6L"}', 'exitoso', CURRENT_TIMESTAMP - INTERVAL '90 days', CURRENT_TIMESTAMP - INTERVAL '90 days'),
  ('550e8400-e29b-41d4-a716-446655440001', 'INSERT', 'ventas', '550e8400-e29b-41d4-a716-446655440300', '{"numero":"V-2024-000001","total":13920}', 'exitoso', CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days'),
  ('550e8400-e29b-41d4-a716-446655440001', 'UPDATE', 'almacen', '550e8400-e29b-41d4-a716-446655440200', '{"stock_anterior":50,"stock_nuevo":25}', 'exitoso', CURRENT_TIMESTAMP - INTERVAL '5 days', CURRENT_TIMESTAMP - INTERVAL '5 days');

COMMIT;

-- ============================================================================
-- Resumen de datos insertados
-- ============================================================================
-- Usuarios: 5 (1 admin, 2 vendedores, 1 gerente, 1 contador)
-- Clientes: 5 (distribuidos entre vendedores)
-- Productos: 9 (con diferentes niveles de stock)
-- Ventas: 5 (con diferentes estados)
-- Facturas: 3
-- Movimientos: 5
-- Configuraciones: 4
-- Logs de auditoría: 4

-- Contraseña por defecto para todos los usuarios de ejemplo: 'password123'
-- (Bcrypt hash: $2a$10$QIj3RWfsnd9R2LJJuTbPpe0W8g8xNWXwYVYWGCvBLeWEAhSdZR2LS)
