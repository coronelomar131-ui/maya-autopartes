# Ejemplos de Queries - Maya Autopartes Database

Colección de ejemplos SQL para operaciones comunes en el sistema.

**Versión:** 1.0.0  
**Última actualización:** 2026-04-22

---

## Tabla de Contenidos

1. [Gestión de Usuarios](#gestión-de-usuarios)
2. [Gestión de Clientes](#gestión-de-clientes)
3. [Gestión de Inventario](#gestión-de-inventario)
4. [Gestión de Ventas](#gestión-de-ventas)
5. [Gestión de Facturas](#gestión-de-facturas)
6. [Reportes](#reportes)
7. [Auditoría y Logs](#auditoría-y-logs)
8. [Consultas Complejas](#consultas-complejas)

---

## Gestión de Usuarios

### Crear usuario (Admin)
```sql
INSERT INTO usuarios (email, password_hash, nombre, apellido, rol, estado, departamento)
VALUES (
  'vendedor@example.com',
  '$2a$10$...', -- bcrypt hash
  'Juan',
  'García',
  'vendedor',
  'activo',
  'Ventas'
)
RETURNING id, email, nombre, rol, created_at;
```

### Obtener usuario por email
```sql
SELECT id, email, nombre, apellido, rol, estado, departamento, created_at, ultimo_acceso
FROM usuarios
WHERE email = 'vendedor@example.com'
  AND deleted_at IS NULL;
```

### Listar todos los usuarios (Admin)
```sql
SELECT id, email, nombre, apellido, rol, estado, ultimo_acceso, created_at
FROM usuarios
WHERE deleted_at IS NULL
ORDER BY created_at DESC;
```

### Actualizar último acceso
```sql
UPDATE usuarios
SET ultimo_acceso = CURRENT_TIMESTAMP
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

### Cambiar rol de usuario (Admin)
```sql
UPDATE usuarios
SET rol = 'gerente'
WHERE id = '550e8400-e29b-41d4-a716-446655440000'
RETURNING id, email, rol;
```

### Suspender usuario (Admin)
```sql
UPDATE usuarios
SET estado = 'suspendido'
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

### Contar usuarios activos por rol
```sql
SELECT rol, COUNT(*) as total
FROM usuarios
WHERE estado = 'activo'
  AND deleted_at IS NULL
GROUP BY rol
ORDER BY total DESC;
```

### Soft delete (usuario inactivo)
```sql
UPDATE usuarios
SET estado = 'inactivo', deleted_at = CURRENT_TIMESTAMP
WHERE id = '550e8400-e29b-41d4-a716-446655440000';
```

---

## Gestión de Clientes

### Crear cliente
```sql
INSERT INTO clientes (
  usuario_id, nombre, rfc, email, telefono, celular,
  calle, numero, colonia, ciudad, estado, codigo_postal,
  tipo_cliente, limite_credito
)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',  -- usuario_id
  'Taller Juan Pérez',
  'JUA870101ABC',
  'info@tallerjuan.com',
  '5512345678',
  '5598765432',
  'Avenida Principal 123',
  '123',
  'Centro',
  'México',
  'Ciudad de México',
  '06000',
  'mayorista',
  50000.00
)
RETURNING id, nombre, rfc, email, created_at;
```

### Obtener clientes de un vendedor
```sql
SELECT id, nombre, rfc, email, telefono, tipo_cliente, saldo_actual, limite_credito, activo
FROM clientes
WHERE usuario_id = '550e8400-e29b-41d4-a716-446655440000'
  AND activo = TRUE
  AND deleted_at IS NULL
ORDER BY nombre ASC;
```

### Buscar cliente por RFC
```sql
SELECT id, nombre, rfc, email, tipo_cliente, saldo_actual
FROM clientes
WHERE rfc = 'JUA870101ABC'
  AND deleted_at IS NULL;
```

### Actualizar saldo de cliente
```sql
UPDATE clientes
SET saldo_actual = saldo_actual + 5000.00  -- suma el monto
WHERE id = '550e8400-e29b-41d4-a716-446655440001'
RETURNING id, nombre, saldo_actual;
```

### Listar clientes con saldo pendiente
```sql
SELECT id, nombre, email, saldo_actual, limite_credito, (limite_credito - saldo_actual) as credito_disponible
FROM clientes
WHERE usuario_id = '550e8400-e29b-41d4-a716-446655440000'
  AND saldo_actual > 0
  AND activo = TRUE
ORDER BY saldo_actual DESC;
```

### Contar clientes por tipo
```sql
SELECT tipo_cliente, COUNT(*) as total, SUM(saldo_actual) as saldo_total
FROM clientes
WHERE usuario_id = '550e8400-e29b-41d4-a716-446655440000'
  AND deleted_at IS NULL
GROUP BY tipo_cliente
ORDER BY total DESC;
```

### Clientes sin transacciones en 90 días
```sql
SELECT c.id, c.nombre, c.email, MAX(v.created_at) as ultima_venta
FROM clientes c
LEFT JOIN ventas v ON c.id = v.cliente_id
WHERE c.usuario_id = '550e8400-e29b-41d4-a716-446655440000'
  AND c.activo = TRUE
GROUP BY c.id, c.nombre, c.email
HAVING MAX(v.created_at) < CURRENT_TIMESTAMP - INTERVAL '90 days'
  OR MAX(v.created_at) IS NULL
ORDER BY ultima_venta DESC NULLS LAST;
```

---

## Gestión de Inventario

### Crear producto en almacén
```sql
INSERT INTO almacen (
  usuario_id, codigo_producto, nombre_producto, descripcion,
  categoria, marca, stock_actual, stock_minimo,
  precio_costo, precio_venta, unidad_medida
)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'MOT-001-2024',
  'Motor 1.6L Gasolina',
  'Motor completamente reacondicionado con garantía de 1 año',
  'Motores',
  'Nissan',
  25,
  5,
  8500.00,
  12000.00,
  'unidad'
)
RETURNING id, codigo_producto, nombre_producto, stock_actual, precio_venta;
```

### Obtener inventario completo de vendedor
```sql
SELECT 
  id, codigo_producto, nombre_producto, categoria, marca,
  stock_actual, stock_minimo, stock_maximo,
  precio_costo, precio_venta, porcentaje_margen,
  CASE 
    WHEN stock_actual <= stock_minimo THEN 'BAJO'
    WHEN stock_actual > stock_maximo THEN 'ALTO'
    ELSE 'OK'
  END as estado_stock
FROM almacen
WHERE usuario_id = '550e8400-e29b-41d4-a716-446655440000'
  AND estado_producto = 'activo'
  AND deleted_at IS NULL
ORDER BY categoria, nombre_producto;
```

### Búsqueda de producto por código
```sql
SELECT id, codigo_producto, nombre_producto, categoria, stock_actual, precio_venta
FROM almacen
WHERE codigo_producto ILIKE '%MOT%'
  AND estado_producto = 'activo'
  AND deleted_at IS NULL
LIMIT 20;
```

### Productos con stock bajo
```sql
SELECT id, codigo_producto, nombre_producto, stock_actual, stock_minimo
FROM almacen
WHERE usuario_id = '550e8400-e29b-41d4-a716-446655440000'
  AND stock_actual <= stock_minimo
  AND estado_producto = 'activo'
ORDER BY stock_actual ASC;
```

### Calcular valor total del inventario
```sql
SELECT 
  COUNT(*) as total_productos,
  SUM(stock_actual * precio_costo) as valor_costo_total,
  SUM(stock_actual * precio_venta) as valor_venta_total,
  SUM(stock_actual * (precio_venta - precio_costo)) as utilidad_potencial
FROM almacen
WHERE usuario_id = '550e8400-e29b-41d4-a716-446655440000'
  AND estado_producto = 'activo'
  AND deleted_at IS NULL;
```

### Actualizar stock después de venta
```sql
UPDATE almacen
SET stock_actual = stock_actual - 5  -- cantidad vendida
WHERE id = '550e8400-e29b-41d4-a716-446655440002'
  AND stock_actual >= 5
RETURNING id, nombre_producto, stock_actual;
```

### Marcar producto como descontinuado
```sql
UPDATE almacen
SET estado_producto = 'descontinuado'
WHERE id = '550e8400-e29b-41d4-a716-446655440002'
RETURNING id, nombre_producto, estado_producto;
```

### Productos más vendidos (últimos 30 días)
```sql
SELECT 
  a.id, a.codigo_producto, a.nombre_producto,
  COUNT(dv.id) as veces_vendido,
  SUM(dv.cantidad) as cantidad_total_vendida,
  SUM(dv.total_linea) as monto_total
FROM almacen a
JOIN detalles_venta dv ON a.id = dv.almacen_id
JOIN ventas v ON dv.venta_id = v.id
WHERE a.usuario_id = '550e8400-e29b-41d4-a716-446655440000'
  AND v.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY a.id, a.codigo_producto, a.nombre_producto
ORDER BY cantidad_total_vendida DESC
LIMIT 10;
```

---

## Gestión de Ventas

### Crear venta (con detalles)
```sql
-- Iniciar transacción
BEGIN;

-- Insertar venta
INSERT INTO ventas (usuario_id, cliente_id, numero_venta, tipo_venta, subtotal, impuesto, total, metodo_pago, estado_venta)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440001',
  'V-2024-001234',
  'contado',
  12000.00,
  1920.00,  -- 16% IVA
  13920.00,
  'efectivo',
  'confirmada'
)
RETURNING id;
-- Guardar el id de venta en variable (en tu app)

-- Insertar detalles de venta
INSERT INTO detalles_venta (venta_id, almacen_id, cantidad, precio_unitario, subtotal_linea, impuesto_linea, total_linea)
VALUES (
  '550e8400-e29b-41d4-a716-446655440010',  -- venta_id retornado
  '550e8400-e29b-41d4-a716-446655440002',  -- almacen_id
  1,
  12000.00,
  12000.00,
  1920.00,
  13920.00
);

-- Actualizar stock
UPDATE almacen
SET stock_actual = stock_actual - 1
WHERE id = '550e8400-e29b-41d4-a716-446655440002';

COMMIT;
```

### Obtener ventas de un vendedor
```sql
SELECT 
  id, numero_venta, cliente_id, subtotal, impuesto, descuento, total,
  tipo_venta, metodo_pago, estado_venta, created_at, updated_at
FROM ventas
WHERE usuario_id = '550e8400-e29b-41d4-a716-446655440000'
  AND deleted_at IS NULL
ORDER BY created_at DESC
LIMIT 50;
```

### Obtener detalles de una venta
```sql
SELECT 
  dv.id, dv.cantidad, dv.precio_unitario, dv.descuento_linea, dv.total_linea,
  a.codigo_producto, a.nombre_producto, a.categoria
FROM detalles_venta dv
JOIN almacen a ON dv.almacen_id = a.id
WHERE dv.venta_id = '550e8400-e29b-41d4-a716-446655440010'
ORDER BY dv.created_at;
```

### Ventas completadas hoy
```sql
SELECT 
  v.numero_venta, v.total, c.nombre as cliente,
  u.nombre as vendedor, v.estado_venta, v.created_at
FROM ventas v
JOIN usuarios u ON v.usuario_id = u.id
LEFT JOIN clientes c ON v.cliente_id = c.id
WHERE DATE(v.created_at) = CURRENT_DATE
  AND v.estado_venta = 'completada'
ORDER BY v.created_at DESC;
```

### Total de ventas por vendedor (mes actual)
```sql
SELECT 
  u.id, u.nombre, u.departamento,
  COUNT(v.id) as total_ventas,
  SUM(v.total) as monto_total,
  AVG(v.total) as ticket_promedio
FROM usuarios u
LEFT JOIN ventas v ON u.id = v.usuario_id
  AND DATE_TRUNC('month', v.created_at) = DATE_TRUNC('month', CURRENT_DATE)
WHERE u.estado = 'activo'
  AND u.rol = 'vendedor'
GROUP BY u.id, u.nombre, u.departamento
ORDER BY monto_total DESC;
```

### Ventas por tipo
```sql
SELECT tipo_venta, COUNT(*) as total, SUM(total) as monto
FROM ventas
WHERE usuario_id = '550e8400-e29b-41d4-a716-446655440000'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY tipo_venta
ORDER BY monto DESC;
```

### Cambiar estado de venta
```sql
UPDATE ventas
SET estado_venta = 'completada', completada_at = CURRENT_TIMESTAMP
WHERE id = '550e8400-e29b-41d4-a716-446655440010'
RETURNING numero_venta, estado_venta, completada_at;
```

---

## Gestión de Facturas

### Crear factura desde venta
```sql
INSERT INTO facturas (
  usuario_id, venta_id, numero_factura, cliente_id,
  subtotal, impuesto, descuento, total,
  estado_factura, fecha_emision, metodo_pago_factura
)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  '550e8400-e29b-41d4-a716-446655440010',
  'F-2024-001234',
  '550e8400-e29b-41d4-a716-446655440001',
  12000.00,
  1920.00,
  0,
  13920.00,
  'emitida',
  CURRENT_DATE,
  'transferencia'
)
RETURNING id, numero_factura, estado_factura;
```

### Obtener facturas emitidas
```sql
SELECT 
  f.numero_factura, f.folio_fiscal, c.nombre as cliente, f.total,
  f.estado_factura, f.fecha_emision, f.fecha_vencimiento
FROM facturas f
LEFT JOIN clientes c ON f.cliente_id = c.id
WHERE f.usuario_id = '550e8400-e29b-41d4-a716-446655440000'
  AND f.estado_factura != 'borrador'
  AND f.deleted_at IS NULL
ORDER BY f.fecha_emision DESC;
```

### Facturas pendientes de pago
```sql
SELECT 
  f.numero_factura, c.nombre as cliente, f.total,
  f.fecha_vencimiento,
  CURRENT_DATE - f.fecha_emision as dias_emitida,
  CASE 
    WHEN f.fecha_vencimiento < CURRENT_DATE THEN 'VENCIDA'
    WHEN f.fecha_vencimiento <= CURRENT_DATE + INTERVAL '7 days' THEN 'POR VENCER'
    ELSE 'AL DÍA'
  END as estado_cobro
FROM facturas f
LEFT JOIN clientes c ON f.cliente_id = c.id
WHERE f.estado_factura = 'emitida'
ORDER BY f.fecha_vencimiento ASC;
```

### Cancelar factura
```sql
UPDATE facturas
SET estado_factura = 'cancelada', cancelada_at = CURRENT_TIMESTAMP
WHERE id = '550e8400-e29b-41d4-a716-446655440011'
RETURNING numero_factura, estado_factura, cancelada_at;
```

---

## Reportes

### Reporte: Resumen de ventas diarias
```sql
SELECT 
  DATE(created_at) as fecha,
  COUNT(*) as num_transacciones,
  SUM(total) as venta_total,
  AVG(total) as ticket_promedio,
  MIN(total) as venta_minima,
  MAX(total) as venta_maxima
FROM ventas
WHERE usuario_id = '550e8400-e29b-41d4-a716-446655440000'
  AND estado_venta = 'completada'
  AND created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(created_at)
ORDER BY fecha DESC;
```

### Reporte: Top 10 clientes por monto
```sql
SELECT 
  c.id, c.nombre, c.tipo_cliente,
  COUNT(v.id) as num_compras,
  SUM(v.total) as monto_total,
  AVG(v.total) as compra_promedio,
  MAX(v.created_at) as ultima_compra
FROM clientes c
LEFT JOIN ventas v ON c.id = v.cliente_id
WHERE c.usuario_id = '550e8400-e29b-41d4-a716-446655440000'
  AND c.deleted_at IS NULL
GROUP BY c.id, c.nombre, c.tipo_cliente
ORDER BY monto_total DESC
LIMIT 10;
```

### Reporte: Desempeño de vendedores (mes)
```sql
SELECT 
  u.nombre, u.departamento,
  COUNT(DISTINCT v.id) as num_ventas,
  COUNT(DISTINCT v.cliente_id) as clientes_atendidos,
  SUM(v.total) as venta_total,
  AVG(v.total) as ticket_promedio
FROM usuarios u
LEFT JOIN ventas v ON u.id = v.usuario_id
  AND DATE_TRUNC('month', v.created_at) = DATE_TRUNC('month', CURRENT_DATE)
WHERE u.rol = 'vendedor'
  AND u.estado = 'activo'
GROUP BY u.id, u.nombre, u.departamento
ORDER BY venta_total DESC;
```

### Reporte: Margen de ganancia
```sql
SELECT 
  a.categoria,
  a.nombre_producto,
  SUM(dv.cantidad) as cantidad_vendida,
  SUM(dv.cantidad * a.precio_costo) as costo_total,
  SUM(dv.total_linea) as venta_total,
  SUM(dv.total_linea) - SUM(dv.cantidad * a.precio_costo) as ganancia,
  ROUND(
    ((SUM(dv.total_linea) - SUM(dv.cantidad * a.precio_costo)) / SUM(dv.total_linea) * 100)::numeric,
    2
  ) as margen_porcentaje
FROM almacen a
JOIN detalles_venta dv ON a.id = dv.almacen_id
JOIN ventas v ON dv.venta_id = v.id
WHERE a.usuario_id = '550e8400-e29b-41d4-a716-446655440000'
  AND v.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY a.id, a.categoria, a.nombre_producto
ORDER BY ganancia DESC;
```

---

## Auditoría y Logs

### Ver actividad reciente de un usuario
```sql
SELECT 
  accion, tabla_afectada, resultado,
  DATE_FORMAT(timestamp, '%Y-%m-%d %H:%i:%s') as fecha_hora,
  detalles
FROM actividad_log
WHERE usuario_id = '550e8400-e29b-41d4-a716-446655440000'
ORDER BY timestamp DESC
LIMIT 50;
```

### Auditoría de cambios en tabla específica
```sql
SELECT 
  al.usuario_id, u.nombre as usuario,
  al.accion, al.registro_id,
  al.detalles, al.timestamp
FROM actividad_log al
LEFT JOIN usuarios u ON al.usuario_id = u.id
WHERE al.tabla_afectada = 'ventas'
  AND al.timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
ORDER BY al.timestamp DESC;
```

### Intentos de acceso fallidos
```sql
SELECT 
  usuario_id, accion, COUNT(*) as intentos_fallidos,
  MAX(timestamp) as ultimo_intento
FROM actividad_log
WHERE resultado = 'bloqueado'
  AND timestamp >= CURRENT_TIMESTAMP - INTERVAL '24 hours'
GROUP BY usuario_id, accion
ORDER BY intentos_fallidos DESC;
```

---

## Consultas Complejas

### Dashboard: Vista general
```sql
-- Ventas del día
SELECT 
  (SELECT COUNT(*) FROM ventas WHERE DATE(created_at) = CURRENT_DATE) as ventas_hoy,
  (SELECT SUM(total) FROM ventas WHERE DATE(created_at) = CURRENT_DATE) as monto_hoy,
  (SELECT COUNT(*) FROM clientes WHERE DATE(created_at) = CURRENT_DATE) as clientes_nuevos,
  (SELECT COUNT(*) FROM usuarios WHERE estado = 'activo') as usuarios_activos,
  (SELECT COUNT(*) FROM almacen WHERE stock_actual <= stock_minimo AND estado_producto = 'activo') as productos_bajo_stock;
```

### Búsqueda global (clientes + productos)
```sql
SELECT 
  'cliente' as tipo,
  c.id, c.nombre, c.email, NULL as codigo
FROM clientes c
WHERE c.usuario_id = $1
  AND (c.nombre ILIKE $2 OR c.email ILIKE $2)
  
UNION ALL

SELECT 
  'producto' as tipo,
  a.id, a.nombre_producto as nombre, NULL as email, a.codigo_producto
FROM almacen a
WHERE a.usuario_id = $1
  AND (a.nombre_producto ILIKE $2 OR a.codigo_producto ILIKE $2)

ORDER BY tipo, nombre
LIMIT 50;
```

### Histórico completo de transacciones de un cliente
```sql
SELECT 
  v.numero_venta as numero,
  'Venta' as tipo,
  v.total as monto,
  v.estado_venta as estado,
  v.created_at as fecha
FROM ventas v
WHERE v.cliente_id = $1

UNION ALL

SELECT 
  f.numero_factura as numero,
  'Factura' as tipo,
  f.total as monto,
  f.estado_factura as estado,
  f.fecha_emision as fecha
FROM facturas f
WHERE f.cliente_id = $1

ORDER BY fecha DESC;
```

---

## Notas Importantes

1. **RLS está activo**: Estas queries asumen que RLS está habilitado. Los usuarios solo verán sus propios datos.

2. **Variables de parámetro**: En el código reemplaza `$1`, `$2`, etc. con los valores reales o usa prepared statements:
   ```javascript
   const { data } = await supabase
     .from('ventas')
     .select('*')
     .eq('usuario_id', userId)
     .limit(50);
   ```

3. **Índices**: Los índices están optimizados para las queries más comunes.

4. **Performance**: Para grandes volúmenes de datos, considera:
   - Usar LIMIT y OFFSET para paginación
   - Agregar filtros de fecha (últimos 30/90 días)
   - Materializar vistas para reportes complejos

---

**Última actualización:** 2026-04-22  
**Versión:** 1.0.0
