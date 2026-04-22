# Maya Autopartes Backend - Ejemplos de Testing

Ejemplos de uso de los endpoints del API con curl y JavaScript.

---

## Configuración Inicial

### Variables Base
```bash
BASE_URL="http://localhost:5000"
API_URL="$BASE_URL/api/v1"
```

---

## Pruebas de Salud

### 1. Health Check
```bash
curl "$BASE_URL/api/health" | jq
```

### 2. Info del API
```bash
curl "$BASE_URL/api/info" | jq
```

### 3. Documentación
```bash
curl "$BASE_URL/api/docs" | jq
```

---

## Usuarios - Ejemplos

### 1. Crear Usuario
```bash
curl -X POST "$API_URL/usuarios" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan García",
    "email": "juan@maya.com",
    "password": "secure123",
    "rol": "vendedor",
    "departamento": "Ventas",
    "telefono": "5551234567",
    "activo": true
  }' | jq
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Usuario creado exitosamente",
  "data": {
    "id": "uuid-1234",
    "nombre": "Juan García",
    "email": "juan@maya.com",
    "rol": "vendedor",
    "departamento": "Ventas",
    "activo": true,
    "fecha_creacion": "2024-04-22T12:00:00Z"
  }
}
```

### 2. Listar Usuarios
```bash
curl "$API_URL/usuarios?page=1&limit=10" | jq
```

### 3. Obtener Usuario por ID
```bash
curl "$API_URL/usuarios/{id}" | jq
```

### 4. Login
```bash
curl -X POST "$API_URL/usuarios/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan@maya.com",
    "password": "secure123"
  }' | jq
```

### 5. Actualizar Usuario
```bash
curl -X PUT "$API_URL/usuarios/{id}" \
  -H "Content-Type: application/json" \
  -d '{
    "rol": "gerente",
    "departamento": "Gerencia de Ventas"
  }' | jq
```

### 6. Eliminar Usuario
```bash
curl -X DELETE "$API_URL/usuarios/{id}"
```

---

## Clientes - Ejemplos

### 1. Crear Cliente
```bash
curl -X POST "$API_URL/clientes" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "telefono": "5551234567",
    "tipo": "particulares",
    "empresa": "",
    "rfc": "JPE850123ABC",
    "direccion": "Calle Principal 123",
    "ciudad": "Mexico City",
    "estado": "CDMX",
    "notas": "Cliente frecuente"
  }' | jq
```

### 2. Listar Clientes
```bash
curl "$API_URL/clientes?page=1&limit=20&tipo=particulares&activo=true" | jq
```

### 3. Buscar Cliente por RFC/Email
```bash
curl "$API_URL/clientes/search/JPE850123ABC" | jq
```

### 4. Obtener Estadísticas
```bash
curl "$API_URL/clientes/stats/general" | jq
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "total_clientes": 50,
    "clientes_activos": 48,
    "clientes_inactivos": 2,
    "tipos": {
      "particulares": 35,
      "empresas": 15
    },
    "total_compras": 250000,
    "promedio_compra": "5000.00"
  }
}
```

---

## Almacén (Productos) - Ejemplos

### 1. Crear Producto
```bash
curl -X POST "$API_URL/almacen" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Motor Eléctrico 2HP",
    "codigo": "MOT001",
    "categoria": "Motores",
    "cantidad": 50,
    "precio_costo": 500,
    "precio_venta": 1000,
    "descripcion": "Motor de alta eficiencia",
    "proveedores": ["Proveedor A", "Proveedor B"]
  }' | jq
```

### 2. Listar Productos
```bash
curl "$API_URL/almacen?page=1&limit=20&categoria=Motores" | jq
```

### 3. Productos con Stock Bajo
```bash
curl "$API_URL/almacen?bajo_stock=true" | jq
```

### 4. Obtener Estadísticas de Inventario
```bash
curl "$API_URL/almacen/stats/inventory" | jq
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "total_productos": 100,
    "total_items": 5000,
    "valor_inventario": 250000,
    "productos_bajo_stock": 15,
    "categoria_mas_grande": {
      "categoria": "Motores",
      "count": 45
    }
  }
}
```

### 5. Actualizar Cantidad de Stock
```bash
# Agregar stock
curl -X PATCH "$API_URL/almacen/{id}/cantidad" \
  -H "Content-Type: application/json" \
  -d '{
    "cantidad": 10,
    "operacion": "add"
  }' | jq

# Restar stock
curl -X PATCH "$API_URL/almacen/{id}/cantidad" \
  -H "Content-Type: application/json" \
  -d '{
    "cantidad": 5,
    "operacion": "subtract"
  }' | jq

# Establecer cantidad exacta
curl -X PATCH "$API_URL/almacen/{id}/cantidad" \
  -H "Content-Type: application/json" \
  -d '{
    "cantidad": 100,
    "operacion": "set"
  }' | jq
```

---

## Ventas - Ejemplos

### 1. Crear Venta
```bash
curl -X POST "$API_URL/ventas" \
  -H "Content-Type: application/json" \
  -d '{
    "cliente_id": "uuid-cliente",
    "producto_id": "uuid-producto",
    "cantidad": 5,
    "precio_unitario": 1000,
    "descuento": 100,
    "estado": "pendiente",
    "notas": "Entrega el viernes"
  }' | jq
```

### 2. Listar Ventas
```bash
curl "$API_URL/ventas?page=1&limit=20&estado=pendiente" | jq
```

### 3. Ventas de un Cliente
```bash
curl "$API_URL/ventas/cliente/{cliente_id}" | jq
```

### 4. Obtener Venta Específica
```bash
curl "$API_URL/ventas/{id}" | jq
```

### 5. Actualizar Venta
```bash
curl -X PUT "$API_URL/ventas/{id}" \
  -H "Content-Type: application/json" \
  -d '{
    "estado": "completada",
    "notas": "Entregado correctamente"
  }' | jq
```

### 6. Eliminar Venta
```bash
curl -X DELETE "$API_URL/ventas/{id}"
```

---

## Facturas - Ejemplos

### 1. Crear Factura
```bash
curl -X POST "$API_URL/facturas" \
  -H "Content-Type: application/json" \
  -d '{
    "venta_id": "uuid-venta",
    "cliente_id": "uuid-cliente",
    "numero_folio": "FAC001",
    "subtotal": 5000,
    "impuesto": 800,
    "descuento": 100,
    "total": 5700,
    "estado": "pendiente",
    "metodo_pago": "efectivo",
    "notas": "Factura de venta"
  }' | jq
```

### 2. Listar Facturas
```bash
curl "$API_URL/facturas?page=1&limit=20&estado=pendiente" | jq
```

### 3. Facturas de Mes Específico
```bash
curl "$API_URL/facturas?mes=4&anio=2024" | jq
```

### 4. Facturas de una Venta
```bash
curl "$API_URL/facturas/venta/{venta_id}" | jq
```

### 5. Obtener Estadísticas
```bash
curl "$API_URL/facturas/stats/general" | jq
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "total_facturas": 150,
    "facturas_pagadas": 120,
    "facturas_pendientes": 25,
    "facturas_canceladas": 5,
    "ingresos_totales": 50000,
    "ingresos_pendientes": 5000,
    "promedio_factura": "333.33"
  }
}
```

### 6. Marcar Factura como Pagada
```bash
curl -X PATCH "$API_URL/facturas/{id}/pagar" \
  -H "Content-Type: application/json" \
  -d '{
    "fecha_pago": "2024-04-22T12:00:00Z"
  }' | jq
```

---

## Testing con JavaScript/Fetch

### Ejemplo: Crear Cliente

```javascript
async function crearCliente() {
  const response = await fetch('http://localhost:5000/api/v1/clientes', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      nombre: 'Juan Pérez',
      email: 'juan@example.com',
      telefono: '5551234567',
      tipo: 'particulares'
    })
  });

  const data = await response.json();
  console.log(data);
  return data;
}

crearCliente();
```

### Ejemplo: Listar Productos

```javascript
async function listarProductos() {
  const response = await fetch('http://localhost:5000/api/v1/almacen?page=1&limit=20');
  const data = await response.json();
  console.log(data.data);
  return data;
}

listarProductos();
```

### Ejemplo: Login

```javascript
async function login(email, password) {
  const response = await fetch('http://localhost:5000/api/v1/usuarios/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ email, password })
  });

  const data = await response.json();
  if (data.success) {
    // Guardar token
    localStorage.setItem('token', data.token);
    console.log('Login exitoso');
  }
  return data;
}

login('juan@maya.com', 'secure123');
```

---

## Testing con Postman

1. Importar en Postman:
   - URL base: `http://localhost:5000`
   - Crear carpetas para cada módulo
   - Usar variables para IDs

2. Ejemplo de variable:
   ```
   {{BASE_URL}}/api/v1/clientes/{{clienteId}}
   ```

3. Pre-requisito para Update/Delete:
   ```javascript
   if (pm.response.code === 201) {
     const data = pm.response.json();
     pm.environment.set('clienteId', data.data.id);
   }
   ```

---

## Flujo Completo: Crear Venta

### 1. Crear Cliente
```bash
CLIENTE=$(curl -s -X POST "$API_URL/clientes" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Cliente Test",
    "email": "test@example.com",
    "telefono": "1234567890",
    "tipo": "particulares"
  }' | jq -r '.data.id')

echo "Cliente creado: $CLIENTE"
```

### 2. Crear Producto
```bash
PRODUCTO=$(curl -s -X POST "$API_URL/almacen" \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Producto Test",
    "codigo": "TEST001",
    "categoria": "Testing",
    "cantidad": 100,
    "precio_costo": 100,
    "precio_venta": 200
  }' | jq -r '.data.id')

echo "Producto creado: $PRODUCTO"
```

### 3. Crear Venta
```bash
VENTA=$(curl -s -X POST "$API_URL/ventas" \
  -H "Content-Type: application/json" \
  -d "{
    \"cliente_id\": \"$CLIENTE\",
    \"producto_id\": \"$PRODUCTO\",
    \"cantidad\": 5,
    \"precio_unitario\": 200,
    \"descuento\": 0,
    \"estado\": \"pendiente\"
  }" | jq -r '.data.id')

echo "Venta creada: $VENTA"
```

### 4. Crear Factura
```bash
curl -s -X POST "$API_URL/facturas" \
  -H "Content-Type: application/json" \
  -d "{
    \"venta_id\": \"$VENTA\",
    \"cliente_id\": \"$CLIENTE\",
    \"numero_folio\": \"FAC001\",
    \"subtotal\": 1000,
    \"impuesto\": 160,
    \"descuento\": 0,
    \"total\": 1160,
    \"estado\": \"pendiente\",
    \"metodo_pago\": \"efectivo\"
  }" | jq
```

---

## Tips de Testing

1. **Guardar IDs:** Usar variables para reutilizar IDs en siguientes requests
2. **Validar Respuestas:** Verificar siempre el campo `success`
3. **Usar jq:** Para filtrar y formatear respuestas JSON
4. **Variables de Entorno:** Guardar valores dinámicos para flujos
5. **Logs:** Revisar console del servidor para debugging

---

## Comandos Útiles

### Limpiar Base de Datos (Cuidado!)
```bash
# Eliminar todas las facturas
curl -X DELETE "$API_URL/facturas" 2>/dev/null || true
```

### Ver todos los Usuarios
```bash
curl "$API_URL/usuarios?limit=100" | jq '.data[] | {nombre, email, rol}'
```

### Filtrar por Estado
```bash
curl "$API_URL/ventas?estado=pendiente" | jq '.data | length'
```

---

**Última Actualización:** 22 de Abril, 2024
