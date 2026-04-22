# Database Schema - Maya Autopartes

## Descripción General

Schema PostgreSQL diseñado para un sistema multi-usuario de gestión de inventario y ventas de autopartes. Incluye soporte para:
- Autenticación y gestión de usuarios con roles
- Gestión de inventario por usuario
- Registro de ventas y facturas
- Auditoría completa con RLS (Row Level Security)
- Movimientos de inventario y trazabilidad

**Versión:** 1.0.0  
**Última actualización:** 2026-04-22

---

## Diagrama ER (Entity-Relationship)

```
┌─────────────────┐
│    USUARIOS     │
├─────────────────┤
│ id (PK)         │
│ email (UNIQUE)  │◄──────────┐
│ password_hash   │           │
│ nombre          │           │
│ apellido        │           │
│ rol             │           │
│ estado          │           │
│ telefono        │           │
│ departamento    │           │
│ empresa_id      │           │
│ ultimo_acceso   │           │
│ created_at      │           │
│ updated_at      │           │
│ deleted_at      │           │
└─────────────────┘           │
         │                    │
         │ (FK)               │
         │                    │
    ┌────┴────┬───────────┬──┴──────────┬──────────────┐
    │          │           │             │              │
    │          ▼           ▼             ▼              ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌──────────┐
│ CLIENTES │ │ ALMACEN  │ │  VENTAS  │ │ FACTURAS   │ │SESIONES  │
├──────────┤ ├──────────┤ ├──────────┤ ├────────────┤ ├──────────┤
│ id       │ │ id       │ │ id       │ │ id         │ │ id       │
│ user_id  │ │ user_id  │ │ user_id  │ │ user_id    │ │ user_id  │
│ nombre   │ │ codigo   │ │ numero   │ │ numero     │ │ token    │
│ rfc      │ │ nombre   │ │ cliente  │ │ venta_id   │ │ activo   │
│ email    │ │ stock    │ │ tipo     │ │ estado     │ │ expira   │
│ telefono │ │ precio   │ │ total    │ │ folio      │ │ created  │
│ direccion│ │ ubicacion│ │ metodo   │ │ total      │ └──────────┘
│ activo   │ │ estado   │ │ estado   │ │ fecha      │
└──────────┘ └──────────┘ │ created  │ │ created    │
       │           │       │ updated  │ │ updated    │
       │           │       └──────────┘ └────────────┘
       │           │             │
       │           │ (FK)        │ (FK)
       │           │             │
       │           ▼             ▼
       │      ┌───────────────────────┐
       │      │  DETALLES_VENTA       │
       │      ├───────────────────────┤
       │      │ id                    │
       │      │ venta_id (FK)         │
       │      │ almacen_id (FK)       │
       │      │ cantidad              │
       │      │ precio_unitario       │
       │      │ subtotal_linea        │
       │      │ created_at            │
       │      └───────────────────────┘
       │
       ▼
┌──────────────────────────┐
│ MOVIMIENTOS_INVENTARIO   │
├──────────────────────────┤
│ id                       │
│ user_id (FK)             │
│ almacen_id (FK)          │
│ tipo_movimiento          │
│ cantidad_movida          │
│ stock_anterior           │
│ stock_nuevo              │
│ razon_movimiento         │
│ created_at               │
└──────────────────────────┘

┌──────────────────┐
│  ACTIVIDAD_LOG   │
├──────────────────┤
│ id               │
│ user_id (FK)     │
│ accion           │
│ tabla_afectada   │
│ registro_id      │
│ detalles (JSONB) │
│ resultado        │
│ timestamp        │
└──────────────────┘

┌────────────────────────┐
│ CONFIGURACION_EMPRESA  │
├────────────────────────┤
│ id                     │
│ user_id (FK)           │
│ clave (UNIQUE)         │
│ valor                  │
│ tipo_dato              │
│ created_at             │
└────────────────────────┘
```

---

## Tablas Detalladas

### 1. USUARIOS
Tabla central de autenticación y gestión de usuarios.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|----------------|-------------|
| `id` | UUID | PK | ID único del usuario |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Email del usuario |
| `password_hash` | VARCHAR(255) | NOT NULL | Hash de contraseña (bcrypt) |
| `nombre` | VARCHAR(150) | NOT NULL | Nombre del usuario |
| `apellido` | VARCHAR(150) | NULL | Apellido del usuario |
| `rol` | VARCHAR(20) | CHECK, DEFAULT 'vendedor' | admin, vendedor, gerente, contador |
| `estado` | VARCHAR(20) | CHECK, DEFAULT 'activo' | activo, inactivo, suspendido |
| `telefono` | VARCHAR(20) | NULL | Teléfono de contacto |
| `departamento` | VARCHAR(100) | NULL | Departamento del usuario |
| `empresa_id` | UUID | NULL | FK a empresa (multi-tenant) |
| `ultimo_acceso` | TIMESTAMP | NULL | Último login |
| `created_at` | TIMESTAMP | DEFAULT NOW | Fecha de creación |
| `updated_at` | TIMESTAMP | DEFAULT NOW | Fecha de actualización |
| `deleted_at` | TIMESTAMP | NULL | Soft delete |

**Índices:**
- `idx_usuarios_email` - Búsqueda rápida por email
- `idx_usuarios_rol` - Filtrado por rol
- `idx_usuarios_estado` - Filtrado por estado
- `idx_usuarios_created_at` - Ordenamiento por fecha

**RLS Policies:**
- SELECT: Usuario solo ve su perfil, admins ven todos
- UPDATE: Usuario solo actualiza su perfil, admins todo
- INSERT: Solo admins pueden crear usuarios

---

### 2. CLIENTES
Información de clientes registrados por cada vendedor.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|----------------|-------------|
| `id` | UUID | PK | ID único del cliente |
| `usuario_id` | UUID | FK NOT NULL | Usuario propietario del cliente |
| `nombre` | VARCHAR(200) | NOT NULL | Nombre del cliente |
| `rfc` | VARCHAR(13) | UNIQUE | RFC (México) |
| `razon_social` | VARCHAR(300) | NULL | Razón social (empresas) |
| `email` | VARCHAR(255) | NULL | Email del cliente |
| `telefono` | VARCHAR(20) | NULL | Teléfono principal |
| `celular` | VARCHAR(20) | NULL | Celular |
| `calle` | VARCHAR(255) | NULL | Calle de domicilio |
| `numero` | VARCHAR(50) | NULL | Número exterior |
| `colonia` | VARCHAR(150) | NULL | Colonia |
| `ciudad` | VARCHAR(150) | NULL | Ciudad |
| `estado` | VARCHAR(150) | NULL | Estado/Provincia |
| `codigo_postal` | VARCHAR(10) | NULL | CP |
| `pais` | VARCHAR(100) | DEFAULT 'México' | País |
| `tipo_cliente` | VARCHAR(20) | DEFAULT 'regular' | regular, mayorista, distribuidor, empresa |
| `limite_credito` | DECIMAL(12,2) | DEFAULT 0 | Límite de crédito |
| `saldo_actual` | DECIMAL(12,2) | DEFAULT 0 | Saldo pendiente |
| `activo` | BOOLEAN | DEFAULT TRUE | Estado del cliente |
| `notas` | TEXT | NULL | Notas adicionales |
| `created_at` | TIMESTAMP | DEFAULT NOW | Fecha de creación |
| `updated_at` | TIMESTAMP | DEFAULT NOW | Fecha de actualización |
| `deleted_at` | TIMESTAMP | NULL | Soft delete |

**Índices:**
- `idx_clientes_usuario_id` - Buscar clientes de un usuario
- `idx_clientes_rfc` - Búsqueda por RFC
- `idx_clientes_email` - Búsqueda por email
- `idx_clientes_activo` - Filtrado por estado

**RLS Policies:**
- SELECT: Usuario ve sus clientes, gerentes/admins ven todos
- INSERT/UPDATE: Usuario solo gestiona sus clientes

---

### 3. ALMACEN
Inventario de productos disponibles.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|----------------|-------------|
| `id` | UUID | PK | ID único del producto |
| `usuario_id` | UUID | FK NOT NULL | Usuario propietario del producto |
| `codigo_producto` | VARCHAR(50) | UNIQUE NOT NULL | SKU o código |
| `nombre_producto` | VARCHAR(300) | NOT NULL | Nombre del producto |
| `descripcion` | TEXT | NULL | Descripción detallada |
| `categoria` | VARCHAR(100) | NULL | Categoría |
| `subcategoria` | VARCHAR(100) | NULL | Subcategoría |
| `marca` | VARCHAR(100) | NULL | Marca/Fabricante |
| `stock_actual` | DECIMAL(10,2) | NOT NULL DEFAULT 0 | Cantidad en stock |
| `stock_minimo` | DECIMAL(10,2) | DEFAULT 5 | Stock mínimo para alerta |
| `stock_maximo` | DECIMAL(10,2) | NULL | Stock máximo recomendado |
| `precio_costo` | DECIMAL(10,2) | NOT NULL | Precio de costo |
| `precio_venta` | DECIMAL(10,2) | NOT NULL | Precio de venta |
| `porcentaje_margen` | DECIMAL(5,2) | NULL | % margen (calculado) |
| `unidad_medida` | VARCHAR(20) | DEFAULT 'unidad' | unidad, caja, paquete, etc |
| `ubicacion_almacen` | VARCHAR(100) | NULL | Pasillo/Estante/Ubicación |
| `sku_alterno` | VARCHAR(100) | NULL | SKU alterno del proveedor |
| `peso_kg` | DECIMAL(8,3) | NULL | Peso en kg |
| `dimensiones_cm` | VARCHAR(100) | NULL | Dimensiones |
| `proveedor_id` | UUID | NULL | FK a proveedor |
| `estado_producto` | VARCHAR(20) | DEFAULT 'activo' | activo, inactivo, descontinuado |
| `created_at` | TIMESTAMP | DEFAULT NOW | Fecha de creación |
| `updated_at` | TIMESTAMP | DEFAULT NOW | Fecha de actualización |
| `deleted_at` | TIMESTAMP | NULL | Soft delete |

**Índices:**
- `idx_almacen_usuario_id` - Buscar productos de un usuario
- `idx_almacen_codigo_producto` - Búsqueda rápida por código
- `idx_almacen_categoria` - Filtrado por categoría
- `idx_almacen_stock_actual` - Alertas de stock bajo
- `idx_almacen_usuario_categoria` - Combinado para reportes

**RLS Policies:**
- SELECT: Usuario ve su inventario, gerentes/admins ven todos
- INSERT/UPDATE: Usuario solo gestiona su inventario

---

### 4. VENTAS
Registro de transacciones de venta.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|----------------|-------------|
| `id` | UUID | PK | ID único de la venta |
| `usuario_id` | UUID | FK NOT NULL | Usuario que realizó la venta |
| `cliente_id` | UUID | FK NULL | Cliente de la venta |
| `numero_venta` | VARCHAR(50) | UNIQUE NOT NULL | Número secuencial |
| `tipo_venta` | VARCHAR(20) | DEFAULT 'contado' | contado, credito, mixto |
| `subtotal` | DECIMAL(12,2) | DEFAULT 0 | Subtotal sin impuestos |
| `impuesto` | DECIMAL(12,2) | DEFAULT 0 | IVA/Impuesto |
| `descuento` | DECIMAL(12,2) | DEFAULT 0 | Descuento total |
| `total` | DECIMAL(12,2) | NOT NULL | Total final |
| `metodo_pago` | VARCHAR(50) | DEFAULT 'efectivo' | efectivo, tarjeta, transferencia, cheque, credito |
| `estado_venta` | VARCHAR(20) | DEFAULT 'pendiente' | pendiente, confirmada, completada, cancelada |
| `observaciones` | TEXT | NULL | Notas de la venta |
| `referencia_pago` | VARCHAR(100) | NULL | Referencia de pago |
| `created_at` | TIMESTAMP | DEFAULT NOW | Fecha de creación |
| `updated_at` | TIMESTAMP | DEFAULT NOW | Fecha de actualización |
| `completada_at` | TIMESTAMP | NULL | Fecha de completación |
| `deleted_at` | TIMESTAMP | NULL | Soft delete |

**Índices:**
- `idx_ventas_usuario_id` - Ventas de un usuario
- `idx_ventas_cliente_id` - Ventas de un cliente
- `idx_ventas_numero_venta` - Búsqueda por número
- `idx_ventas_estado` - Filtrado por estado
- `idx_ventas_created_at` - Ordenamiento cronológico
- `idx_ventas_usuario_created` - Ventas recientes por usuario

**RLS Policies:**
- SELECT: Usuario ve sus ventas, gerentes/admins/contadores ven todo
- INSERT/UPDATE: Usuario solo crea/modifica sus ventas
- DELETE: Solo admins

---

### 5. DETALLES_VENTA
Líneas de detalle de cada venta (relación muchos-a-muchos entre VENTAS y ALMACEN).

| Campo | Tipo | Restricciones | Descripción |
|-------|------|----------------|-------------|
| `id` | UUID | PK | ID único del detalle |
| `venta_id` | UUID | FK NOT NULL | Venta que pertenece |
| `almacen_id` | UUID | FK NOT NULL | Producto vendido |
| `cantidad` | DECIMAL(10,2) | NOT NULL | Cantidad vendida |
| `precio_unitario` | DECIMAL(10,2) | NOT NULL | Precio por unidad |
| `descuento_linea` | DECIMAL(10,2) | DEFAULT 0 | Descuento en línea |
| `subtotal_linea` | DECIMAL(12,2) | NOT NULL | Cantidad × Precio |
| `impuesto_linea` | DECIMAL(12,2) | DEFAULT 0 | Impuesto de la línea |
| `total_linea` | DECIMAL(12,2) | NOT NULL | Subtotal + Impuesto |
| `numero_lote` | VARCHAR(100) | NULL | Lote/Batch del producto |
| `fecha_vencimiento` | DATE | NULL | Fecha de vencimiento |
| `created_at` | TIMESTAMP | DEFAULT NOW | Fecha de creación |
| `updated_at` | TIMESTAMP | DEFAULT NOW | Fecha de actualización |

**Índices:**
- `idx_detalles_venta_venta_id` - Líneas de una venta
- `idx_detalles_venta_almacen_id` - Producto en detalle

**RLS Policies:**
- Heredadas de VENTAS
- Usuario solo ve detalles de sus ventas

---

### 6. FACTURAS
Gestión de facturas electrónicas (CFDI en México).

| Campo | Tipo | Restricciones | Descripción |
|-------|------|----------------|-------------|
| `id` | UUID | PK | ID único de factura |
| `usuario_id` | UUID | FK NOT NULL | Usuario que emite |
| `venta_id` | UUID | FK NULL | Venta asociada |
| `numero_factura` | VARCHAR(50) | UNIQUE NOT NULL | Número secuencial |
| `folio_fiscal` | VARCHAR(100) | NULL | UUID del SAT (CFDI) |
| `cliente_id` | UUID | FK NULL | Cliente de factura |
| `subtotal` | DECIMAL(12,2) | NOT NULL | Subtotal |
| `impuesto` | DECIMAL(12,2) | NOT NULL | IVA |
| `descuento` | DECIMAL(12,2) | DEFAULT 0 | Descuento |
| `total` | DECIMAL(12,2) | NOT NULL | Total |
| `estado_factura` | VARCHAR(20) | DEFAULT 'borrador' | borrador, emitida, cancelada, devuelta |
| `fecha_emision` | DATE | NOT NULL DEFAULT TODAY | Fecha de emisión |
| `fecha_vencimiento` | DATE | NULL | Fecha de vencimiento |
| `metodo_pago_factura` | VARCHAR(50) | NULL | Método de pago SAT |
| `forma_pago` | VARCHAR(50) | NULL | Forma de pago SAT |
| `observaciones` | TEXT | NULL | Notas |
| `xml_contenido` | TEXT | NULL | XML del CFDI |
| `pdf_url` | VARCHAR(500) | NULL | URL del PDF |
| `created_at` | TIMESTAMP | DEFAULT NOW | Fecha de creación |
| `updated_at` | TIMESTAMP | DEFAULT NOW | Fecha de actualización |
| `cancelada_at` | TIMESTAMP | NULL | Fecha de cancelación |
| `deleted_at` | TIMESTAMP | NULL | Soft delete |

**Índices:**
- `idx_facturas_usuario_id` - Facturas de un usuario
- `idx_facturas_venta_id` - Factura de una venta
- `idx_facturas_numero` - Búsqueda por número
- `idx_facturas_estado` - Filtrado por estado
- `idx_facturas_cliente_id` - Facturas de un cliente

**RLS Policies:**
- SELECT: Usuario ve sus facturas, gerentes/admins/contadores ven todo
- INSERT/UPDATE: Usuario solo gestiona sus facturas

---

### 7. MOVIMIENTOS_INVENTARIO
Historial de cambios en el stock (auditoría de inventario).

| Campo | Tipo | Restricciones | Descripción |
|-------|------|----------------|-------------|
| `id` | UUID | PK | ID único del movimiento |
| `usuario_id` | UUID | FK NOT NULL | Usuario que realiza movimiento |
| `almacen_id` | UUID | FK NOT NULL | Producto afectado |
| `tipo_movimiento` | VARCHAR(20) | CHECK NOT NULL | entrada, salida, ajuste, devolucion, transferencia |
| `cantidad_movida` | DECIMAL(10,2) | NOT NULL | Cantidad movida |
| `stock_anterior` | DECIMAL(10,2) | NOT NULL | Stock antes del movimiento |
| `stock_nuevo` | DECIMAL(10,2) | NOT NULL | Stock después del movimiento |
| `referencia_documento` | VARCHAR(100) | NULL | Número de compra/venta |
| `razon_movimiento` | TEXT | NULL | Razón del movimiento |
| `numero_referencia` | VARCHAR(50) | NULL | Referencia interna |
| `created_at` | TIMESTAMP | DEFAULT NOW | Fecha del movimiento |
| `updated_at` | TIMESTAMP | DEFAULT NOW | Fecha de actualización |

**Índices:**
- `idx_movimientos_usuario_id` - Movimientos de un usuario
- `idx_movimientos_almacen_id` - Historial de un producto
- `idx_movimientos_tipo` - Filtrado por tipo
- `idx_movimientos_created_at` - Ordenamiento cronológico
- `idx_movimientos_usuario_almacen` - Combinado para reportes

**RLS Policies:**
- SELECT: Usuario ve sus movimientos, gerentes/admins ven todos
- INSERT: Usuario solo crea movimientos de sus productos

**Nota:** Los movimientos se crean automáticamente cuando hay:
- Venta (CREATE salida)
- Devolución (CREATE entrada)
- Ajuste de stock (CREATE ajuste)

---

### 8. ACTIVIDAD_LOG
Registro de auditoría de todas las acciones del sistema.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|----------------|-------------|
| `id` | UUID | PK | ID único del log |
| `usuario_id` | UUID | FK NULL | Usuario que realiza acción |
| `accion` | VARCHAR(100) | NOT NULL | CREATE, READ, UPDATE, DELETE, etc |
| `tabla_afectada` | VARCHAR(100) | NULL | Nombre de tabla |
| `registro_id` | UUID | NULL | ID del registro afectado |
| `detalles` | JSONB | NULL | Cambios en formato JSON |
| `direccion_ip` | VARCHAR(45) | NULL | IP del cliente |
| `user_agent` | TEXT | NULL | User-Agent del navegador |
| `resultado` | VARCHAR(20) | DEFAULT 'exitoso' | exitoso, error, bloqueado |
| `mensaje_error` | TEXT | NULL | Descripción del error |
| `timestamp` | TIMESTAMP | DEFAULT NOW | Momento exacto |
| `created_at` | TIMESTAMP | DEFAULT NOW | Fecha de registro |

**Índices:**
- `idx_actividad_usuario_id` - Actividad de un usuario
- `idx_actividad_tabla` - Cambios en una tabla
- `idx_actividad_timestamp` - Ordenamiento cronológico
- `idx_actividad_resultado` - Filtrado por resultado
- `idx_actividad_usuario_tabla` - Combinado para reportes

**RLS Policies:**
- SELECT: Usuario ve su actividad, gerentes/admins ven todo
- INSERT: Automático (no requiere usuario)

**Nota:** Se registra automáticamente:
- Cada INSERT/UPDATE/DELETE en tablas principales
- Accesos denegados por RLS
- Errores de validación
- Cambios de sesión

---

### 9. CONFIGURACION_EMPRESA
Configuraciones globales del sistema (IVA, impuestos, términos, etc).

| Campo | Tipo | Restricciones | Descripción |
|-------|------|----------------|-------------|
| `id` | UUID | PK | ID único |
| `usuario_id` | UUID | FK NOT NULL | Admin que configura |
| `clave_configuracion` | VARCHAR(100) | UNIQUE NOT NULL | Clave única (ej: IVA_RATE) |
| `valor_configuracion` | TEXT | NOT NULL | Valor de configuración |
| `tipo_dato` | VARCHAR(20) | DEFAULT 'texto' | texto, numero, booleano, json |
| `descripcion` | TEXT | NULL | Descripción de la configuración |
| `created_at` | TIMESTAMP | DEFAULT NOW | Fecha de creación |
| `updated_at` | TIMESTAMP | DEFAULT NOW | Fecha de actualización |

**Configuraciones Predefinidas:**
- `IVA_RATE`: Tasa de IVA (ej: 0.16)
- `EMPRESA_RFC`: RFC de la empresa
- `EMPRESA_RAZON_SOCIAL`: Razón social
- `EMPRESA_REGIMEN_FISCAL`: Régimen fiscal SAT
- `EMPRESA_LOGO_URL`: URL del logo

**RLS Policies:**
- SELECT: Solo gerentes/admins
- INSERT/UPDATE: Solo admins

---

### 10. SESIONES
Gestión de sesiones activas de usuarios.

| Campo | Tipo | Restricciones | Descripción |
|-------|------|----------------|-------------|
| `id` | UUID | PK | ID único de sesión |
| `usuario_id` | UUID | FK NOT NULL | Usuario de sesión |
| `token` | VARCHAR(500) | UNIQUE NOT NULL | JWT token |
| `token_refresh` | VARCHAR(500) | UNIQUE NULL | Token de refresco |
| `direccion_ip` | VARCHAR(45) | NULL | IP del cliente |
| `user_agent` | TEXT | NULL | User-Agent |
| `dispositivo` | VARCHAR(100) | NULL | Tipo dispositivo |
| `activo` | BOOLEAN | DEFAULT TRUE | Sesión activa |
| `created_at` | TIMESTAMP | DEFAULT NOW | Inicio de sesión |
| `expira_at` | TIMESTAMP | NOT NULL | Expiración del token |
| `ultimo_acceso` | TIMESTAMP | DEFAULT NOW | Último acceso |
| `cerrada_at` | TIMESTAMP | NULL | Cierre de sesión |

**Índices:**
- `idx_sesiones_usuario_id` - Sesiones de un usuario
- `idx_sesiones_token` - Validación de token
- `idx_sesiones_activo` - Sesiones activas
- `idx_sesiones_usuario_activo` - Sesiones activas por usuario

**RLS Policies:**
- SELECT/INSERT/UPDATE: Usuario solo accede sus sesiones
- No hay DELETE (solo soft-close con cerrada_at)

---

## Triggers y Funciones

### Trigger: actualizar_updated_at()
Actualiza automáticamente el campo `updated_at` en cada modificación.

```sql
CREATE TRIGGER trigger_usuarios_updated_at
BEFORE UPDATE ON usuarios
FOR EACH ROW
EXECUTE FUNCTION actualizar_updated_at();
-- ... (igual para todas las tablas con updated_at)
```

### Trigger: registrar_actividad()
Registra automáticamente cambios en `actividad_log` (puede ser opcional por tabla).

```sql
CREATE TRIGGER trigger_ventas_audit
AFTER INSERT OR UPDATE OR DELETE ON ventas
FOR EACH ROW
EXECUTE FUNCTION registrar_actividad('UPDATE');
```

---

## Restricciones CHECK

```sql
-- USUARIOS
rol IN ('admin', 'vendedor', 'gerente', 'contador')
estado IN ('activo', 'inactivo', 'suspendido')

-- CLIENTES
tipo_cliente IN ('regular', 'mayorista', 'distribuidor', 'empresa')

-- ALMACEN
estado_producto IN ('activo', 'inactivo', 'descontinuado')

-- VENTAS
tipo_venta IN ('contado', 'credito', 'mixto')
metodo_pago IN ('efectivo', 'tarjeta', 'transferencia', 'cheque', 'credito')
estado_venta IN ('pendiente', 'confirmada', 'completada', 'cancelada')

-- MOVIMIENTOS_INVENTARIO
tipo_movimiento IN ('entrada', 'salida', 'ajuste', 'devolucion', 'transferencia')

-- FACTURAS
estado_factura IN ('borrador', 'emitida', 'cancelada', 'devuelta')

-- ACTIVIDAD_LOG
resultado IN ('exitoso', 'error', 'bloqueado')
```

---

## RLS (Row Level Security) - Resumen

### Jerarquía de Roles

1. **ADMIN**: Acceso total a todo el sistema
2. **GERENTE**: Acceso de lectura a todos los usuarios, edición de configuraciones
3. **VENDEDOR**: Acceso solo a sus propios datos
4. **CONTADOR**: Acceso de lectura a facturas y reportes financieros

### Políticas Clave

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| usuarios | Propio + Admin | Admin | Propio + Admin | - |
| clientes | Usuario + Gerente/Admin | Usuario | Usuario | - |
| almacen | Usuario + Gerente/Admin | Usuario | Usuario | - |
| ventas | Usuario + Gerente/Admin/Contador | Usuario | Usuario | Admin |
| facturas | Usuario + Gerente/Admin/Contador | Usuario | Usuario | Admin |
| movimientos | Usuario + Gerente/Admin | Usuario | - | - |
| actividad_log | Usuario + Gerente/Admin | Sistema | - | - |
| configuracion | Gerente/Admin | Admin | Admin | - |
| sesiones | Usuario | Usuario | Usuario | - |

---

## Índices por Propósito

### Búsqueda Rápida
- `idx_usuarios_email`
- `idx_clientes_rfc`
- `idx_almacen_codigo_producto`
- `idx_ventas_numero_venta`
- `idx_facturas_numero`

### Filtrado
- `idx_usuarios_rol`
- `idx_clientes_activo`
- `idx_almacen_estado`
- `idx_ventas_estado`
- `idx_facturas_estado`

### Ordenamiento
- `idx_usuarios_created_at`
- `idx_ventas_created_at`
- `idx_movimientos_created_at`
- `idx_actividad_timestamp`

### Queries Complejas
- `idx_ventas_usuario_created` (Ventas recientes de un usuario)
- `idx_almacen_usuario_categoria` (Categorías de un usuario)
- `idx_actividad_usuario_tabla` (Auditoría por usuario y tabla)

---

## Guía de Uso

### Para Desarrolladores Backend

1. **Crear Usuario:**
```sql
INSERT INTO usuarios (email, password_hash, nombre, rol)
VALUES ('user@example.com', '$2a$...' , 'Juan', 'vendedor');
```

2. **Registrar Venta:**
```sql
BEGIN;
INSERT INTO ventas (usuario_id, cliente_id, numero_venta, total, ...)
VALUES (...);
INSERT INTO detalles_venta (venta_id, almacen_id, cantidad, ...)
VALUES (...);
-- El movimiento_inventario se crea automáticamente
COMMIT;
```

3. **Actualizar Stock:**
```sql
UPDATE almacen SET stock_actual = stock_actual - $1
WHERE id = $2;
-- El movimiento se crea automáticamente
```

### Para Admins

1. **Ver auditoría completa:**
```sql
SELECT * FROM actividad_log
ORDER BY timestamp DESC
LIMIT 100;
```

2. **Reportes de ventas:**
```sql
SELECT usuario_id, COUNT(*) as total_ventas, SUM(total) as monto
FROM ventas
WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY usuario_id;
```

---

## Mejoras Futuras

- [ ] Tabla `PROVEEDORES` para gestión de compras
- [ ] Tabla `CUENTAS_POR_COBRAR` para mejor seguimiento de crédito
- [ ] Tabla `DEVOLUCIONES` para manejo de cambios
- [ ] Tabla `PROMOCIONES` para descuentos y ofertas
- [ ] Tabla `REPORTES_PERSONALIZADOS` para reportes del usuario
- [ ] Implementar soft-delete automático
- [ ] Auditoría de cambios de campos específicos
- [ ] Historial de precios

---

**Última actualización:** 2026-04-22  
**Autor:** Maya Autopartes Development Team
