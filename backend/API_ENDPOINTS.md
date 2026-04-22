# Maya Autopartes - API Endpoints Documentation

**Version:** 1.0.0  
**Base URL:** `http://localhost:5000`  
**API Version:** v1

---

## Table of Contents

1. [General Endpoints](#general-endpoints)
2. [Ventas (Sales)](#ventas-sales)
3. [Almacén (Inventory)](#almacén-inventory)
4. [Clientes (Customers)](#clientes-customers)
5. [Usuarios (Users)](#usuarios-users)
6. [Facturas (Invoices)](#facturas-invoices)

---

## General Endpoints

### Health Check
```
GET /api/health
```
Verifica el estado del servidor y la conexión a base de datos.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-04-22T12:00:00.000Z",
  "environment": "development",
  "uptime": 3600,
  "database": "CONNECTED"
}
```

### API Information
```
GET /api/info
```
Obtiene información general del API.

**Response:**
```json
{
  "name": "Maya Autopartes API",
  "version": "1.0.0",
  "endpoints": { ... }
}
```

### API Documentation
```
GET /api/docs
```
Obtiene documentación completa de todos los endpoints.

---

## Ventas (Sales)

### Get All Sales
```
GET /api/v1/ventas
```

**Query Parameters:**
- `page` (int, default: 1) - Número de página
- `limit` (int, default: 20) - Elementos por página
- `estado` (string) - Filtrar por estado (pendiente, completada, cancelada)
- `clienteId` (string) - Filtrar por ID de cliente

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "cliente_id": "uuid",
      "producto_id": "uuid",
      "cantidad": 5,
      "precio_unitario": 100,
      "subtotal": 500,
      "descuento": 0,
      "total": 500,
      "estado": "pendiente",
      "notas": "",
      "fecha_venta": "2024-04-22T12:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

### Get Sale by ID
```
GET /api/v1/ventas/:id
```

**Path Parameters:**
- `id` (string) - ID de la venta

### Create Sale
```
POST /api/v1/ventas
```

**Request Body:**
```json
{
  "cliente_id": "uuid",
  "producto_id": "uuid",
  "cantidad": 5,
  "precio_unitario": 100,
  "descuento": 0,
  "estado": "pendiente",
  "notas": "Notas opcionales"
}
```

### Update Sale
```
PUT /api/v1/ventas/:id
```

### Delete Sale
```
DELETE /api/v1/ventas/:id
```

### Get Sales by Customer
```
GET /api/v1/ventas/cliente/:clienteId
```

---

## Almacén (Inventory)

### Get All Inventory
```
GET /api/v1/almacen
```

**Query Parameters:**
- `page` (int, default: 1)
- `limit` (int, default: 20)
- `categoria` (string)
- `bajo_stock` (boolean)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nombre": "Producto",
      "codigo": "PRO001",
      "categoria": "Motor",
      "cantidad": 50,
      "precio_costo": 50,
      "precio_venta": 100,
      "margen": "50.00",
      "descripcion": "",
      "activo": true,
      "fecha_creacion": "2024-04-22T12:00:00Z"
    }
  ],
  "pagination": { ... }
}
```

### Get Product by ID
```
GET /api/v1/almacen/:id
```

### Create Product
```
POST /api/v1/almacen
```

**Request Body:**
```json
{
  "nombre": "Producto",
  "codigo": "PRO001",
  "categoria": "Motor",
  "cantidad": 50,
  "precio_costo": 50,
  "precio_venta": 100,
  "descripcion": "Descripción opcional",
  "proveedores": []
}
```

### Update Product
```
PUT /api/v1/almacen/:id
```

### Delete Product
```
DELETE /api/v1/almacen/:id
```

### Get Inventory Statistics
```
GET /api/v1/almacen/stats/inventory
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total_productos": 100,
    "total_items": 5000,
    "valor_inventario": 250000,
    "productos_bajo_stock": 15,
    "categoria_mas_grande": { "categoria": "Motor", "count": 45 }
  }
}
```

### Update Product Quantity
```
PATCH /api/v1/almacen/:id/cantidad
```

**Request Body:**
```json
{
  "cantidad": 10,
  "operacion": "add"
}
```

---

## Clientes (Customers)

### Get All Customers
```
GET /api/v1/clientes
```

**Query Parameters:**
- `page` (int)
- `limit` (int)
- `tipo` (string) - "particulares" o "empresas"
- `activo` (boolean)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "nombre": "Juan Pérez",
      "email": "juan@example.com",
      "telefono": "1234567890",
      "tipo": "particulares",
      "empresa": "",
      "rfc": "",
      "direccion": "Calle 123",
      "ciudad": "Mexico City",
      "estado": "CDMX",
      "notas": "",
      "activo": true,
      "fecha_creacion": "2024-04-22T12:00:00Z",
      "total_compras": 5000,
      "promedio_compra": 1000
    }
  ],
  "pagination": { ... }
}
```

### Get Customer by ID
```
GET /api/v1/clientes/:id
```

### Create Customer
```
POST /api/v1/clientes
```

**Request Body:**
```json
{
  "nombre": "Juan Pérez",
  "email": "juan@example.com",
  "telefono": "1234567890",
  "tipo": "particulares",
  "empresa": "",
  "rfc": "",
  "direccion": "Calle 123",
  "ciudad": "Mexico City",
  "estado": "CDMX",
  "notas": ""
}
```

### Update Customer
```
PUT /api/v1/clientes/:id
```

### Delete Customer
```
DELETE /api/v1/clientes/:id
```

### Search Customers
```
GET /api/v1/clientes/search/:query
```

### Get Customer Statistics
```
GET /api/v1/clientes/stats/general
```

---

## Usuarios (Users)

### Get All Users
```
GET /api/v1/usuarios
```

**Query Parameters:**
- `page` (int)
- `limit` (int)
- `rol` (string) - "admin", "gerente", "vendedor"
- `activo` (boolean)

### Get User by ID
```
GET /api/v1/usuarios/:id
```

### Create User
```
POST /api/v1/usuarios
```

**Request Body:**
```json
{
  "nombre": "Juan García",
  "email": "juan@maya.com",
  "password": "secure123",
  "rol": "vendedor",
  "departamento": "Ventas",
  "telefono": "1234567890",
  "activo": true
}
```

### Update User
```
PUT /api/v1/usuarios/:id
```

### Delete User
```
DELETE /api/v1/usuarios/:id
```

### Login
```
POST /api/v1/usuarios/auth/login
```

**Request Body:**
```json
{
  "email": "juan@maya.com",
  "password": "secure123"
}
```

---

## Facturas (Invoices)

### Get All Invoices
```
GET /api/v1/facturas
```

**Query Parameters:**
- `page` (int)
- `limit` (int)
- `estado` (string)
- `mes` (int)
- `anio` (int)

### Get Invoice by ID
```
GET /api/v1/facturas/:id
```

### Create Invoice
```
POST /api/v1/facturas
```

**Request Body:**
```json
{
  "venta_id": "uuid",
  "cliente_id": "uuid",
  "numero_folio": "FAC001",
  "subtotal": 500,
  "impuesto": 80,
  "descuento": 0,
  "total": 580,
  "estado": "pendiente",
  "metodo_pago": "efectivo",
  "notas": ""
}
```

### Update Invoice
```
PUT /api/v1/facturas/:id
```

### Delete Invoice
```
DELETE /api/v1/facturas/:id
```

### Get Invoices by Sale
```
GET /api/v1/facturas/venta/:ventaId
```

### Get Invoice Statistics
```
GET /api/v1/facturas/stats/general
```

### Mark Invoice as Paid
```
PATCH /api/v1/facturas/:id/pagar
```

---

## Error Handling

All endpoints return consistent error responses:

```json
{
  "success": false,
  "error": "Error message",
  "message": "Detailed error description",
  "timestamp": "2024-04-22T12:00:00.000Z"
}
```

### HTTP Status Codes
- `200` - OK
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `500` - Internal Server Error

---

**Last Updated:** April 22, 2024
