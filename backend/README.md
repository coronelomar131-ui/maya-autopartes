# Maya Autopartes Backend API

Backend API Core modular para el sistema de gestión de inventario y ventas Maya Autopartes.

## Descripción Rápida

API REST construida con **Express.js** y **Supabase** que proporciona endpoints para:
- Gestión de Ventas
- Gestión de Almacén (Inventario)
- Gestión de Clientes
- Gestión de Usuarios
- Gestión de Facturas

**Estado:** Funcional y listo para uso  
**Versión:** 1.0.0  
**Líneas de Código:** ~600 (modular)

---

## Quick Start

### 1. Instalación

```bash
cd backend
npm install
```

### 2. Configuración

```bash
cp .env.example .env
# Editar .env con tus credenciales de Supabase
```

### 3. Iniciar Servidor

```bash
npm start          # Producción
npm run dev        # Desarrollo con auto-reload
```

### 4. Verificar

```bash
curl http://localhost:5000/api/health
```

---

## Estructura del Proyecto

```
backend/
├── server.js                 # Express server principal
├── routes/                   # Rutas modulares
│   ├── ventas.js            # CRUD Ventas
│   ├── almacen.js           # CRUD Productos
│   ├── clientes.js          # CRUD Clientes
│   ├── usuarios.js          # CRUD Usuarios + Auth
│   └── facturas.js          # CRUD Facturas
├── package.json
├── .env.example
├── API_ENDPOINTS.md         # Documentación de endpoints
└── BACKEND_SETUP.md         # Guía de instalación
```

---

## Endpoints Principales

### Ventas `/api/v1/ventas`
```
POST   /                      # Crear venta
GET    /                      # Listar ventas
GET    /:id                   # Obtener venta
PUT    /:id                   # Actualizar venta
DELETE /:id                   # Eliminar venta
GET    /cliente/:clienteId    # Ventas del cliente
```

### Almacén `/api/v1/almacen`
```
POST   /                      # Crear producto
GET    /                      # Listar productos
GET    /:id                   # Obtener producto
PUT    /:id                   # Actualizar producto
DELETE /:id                   # Eliminar producto
GET    /stats/inventory       # Estadísticas
PATCH  /:id/cantidad          # Actualizar stock
```

### Clientes `/api/v1/clientes`
```
POST   /                      # Crear cliente
GET    /                      # Listar clientes
GET    /:id                   # Obtener cliente
PUT    /:id                   # Actualizar cliente
DELETE /:id                   # Eliminar cliente
GET    /search/:query         # Buscar clientes
GET    /stats/general         # Estadísticas
```

### Usuarios `/api/v1/usuarios`
```
POST   /                      # Crear usuario
GET    /                      # Listar usuarios
GET    /:id                   # Obtener usuario
PUT    /:id                   # Actualizar usuario
DELETE /:id                   # Eliminar usuario
POST   /auth/login            # Login
```

### Facturas `/api/v1/facturas`
```
POST   /                      # Crear factura
GET    /                      # Listar facturas
GET    /:id                   # Obtener factura
PUT    /:id                   # Actualizar factura
DELETE /:id                   # Eliminar factura
GET    /venta/:ventaId        # Facturas por venta
GET    /stats/general         # Estadísticas
PATCH  /:id/pagar             # Marcar como pagada
```

---

## Dependencias

### Principales
- **express** - Framework web
- **@supabase/supabase-js** - Cliente Supabase
- **cors** - Cross-Origin Resource Sharing
- **helmet** - Headers de seguridad
- **morgan** - HTTP logging
- **compression** - Compresión de respuestas
- **dotenv** - Variables de entorno
- **uuid** - Generación de IDs

### Desarrollo
- **nodemon** - Auto-reload
- **jest** - Testing
- **supertest** - API testing

---

## Requisitos Previos

- Node.js >= 16.0.0
- npm >= 8.0.0
- Cuenta Supabase (gratuita en https://supabase.com)

---

## Configuración

### Variables de Entorno (.env)

```env
NODE_ENV=development
PORT=5000
API_URL=http://localhost:5000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5000
```

---

## Ejemplo de Uso

### Crear Cliente

```bash
curl -X POST http://localhost:5000/api/v1/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "telefono": "1234567890",
    "tipo": "particulares"
  }'
```

### Crear Producto

```bash
curl -X POST http://localhost:5000/api/v1/almacen \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Motor Eléctrico",
    "codigo": "MOT001",
    "categoria": "Motores",
    "cantidad": 50,
    "precio_costo": 500,
    "precio_venta": 1000
  }'
```

### Obtener Estadísticas

```bash
curl http://localhost:5000/api/v1/almacen/stats/inventory
```

---

## Características

- ✓ CRUD completo para 5 módulos
- ✓ Paginación en listados
- ✓ Búsqueda y filtrado
- ✓ Estadísticas y análisis
- ✓ Manejo de errores global
- ✓ Validación de datos
- ✓ CORS configurado
- ✓ Logging con Morgan
- ✓ Compresión de respuestas
- ✓ Headers de seguridad

---

## Health Check

```bash
curl http://localhost:5000/api/health
```

**Respuesta:**
```json
{
  "status": "OK",
  "timestamp": "2024-04-22T12:00:00.000Z",
  "environment": "development",
  "uptime": 1.234,
  "database": "CONNECTED"
}
```

---

## Scripts

```bash
npm start          # Iniciar en producción
npm run dev        # Iniciar en desarrollo
npm test           # Ejecutar tests
```

---

## Documentación Completa

- **API_ENDPOINTS.md** - Documentación detallada de todos los endpoints
- **BACKEND_SETUP.md** - Guía de instalación y configuración

---

## Módulos Incluidos

### 1. Ventas (ventas.js)
Gestión de operaciones de venta. Incluye:
- Crear/actualizar/eliminar ventas
- Listado con paginación
- Filtrado por cliente y estado
- Cálculo automático de totales

### 2. Almacén (almacen.js)
Gestión de inventario. Incluye:
- CRUD de productos
- Listado con categorías
- Cálculo de márgenes
- Estadísticas de inventario
- Actualización de cantidades

### 3. Clientes (clientes.js)
Gestión de clientes. Incluye:
- CRUD de clientes
- Tipos (particulares/empresas)
- Búsqueda por nombre/RFC/email
- Estadísticas de clientes
- Validación de email

### 4. Usuarios (usuarios.js)
Gestión de usuarios y autenticación. Incluye:
- CRUD de usuarios
- Roles (admin/gerente/vendedor)
- Login básico
- Validación de contraseña
- Seguimiento de accesos

### 5. Facturas (facturas.js)
Gestión de facturas fiscales. Incluye:
- CRUD de facturas
- Generación de folios únicos
- Registro de pagos
- Estadísticas financieras
- Filtrado por mes/año

---

## Manejo de Errores

Todos los endpoints retornan respuestas consistentes:

**Éxito (200):**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operación exitosa"
}
```

**Error (400/500):**
```json
{
  "success": false,
  "error": "Tipo de error",
  "message": "Descripción del error",
  "timestamp": "2024-04-22T12:00:00.000Z"
}
```

---

## Seguridad

- ✓ Helmet.js para headers de seguridad
- ✓ CORS configurado whitelist
- ✓ Validación de entrada
- ✓ Compresión para mitigar ataques
- ✓ No expone contraseñas en respuestas
- ✓ Graceful error handling

---

## Performance

- Compresión automática de respuestas
- Paginación eficiente
- Índices en base de datos (via Supabase)
- Logging de bajo overhead
- Manejo eficiente de memoria

---

## Próximas Mejoras

1. Implementar JWT en lugar de autenticación básica
2. Agregar rate limiting
3. Implementar caching con Redis
4. Suite completa de tests
5. Swagger/OpenAPI documentation
6. Webhooks para eventos
7. Sistema de permisos granular

---

## Troubleshooting

### Puerto en uso
```bash
PORT=5001 npm start
```

### Problemas de conexión Supabase
- Verificar SUPABASE_URL y SUPABASE_KEY en .env
- Verificar conexión a internet
- Verificar que el proyecto esté activo

### CORS errors
- Verificar CORS_ORIGIN incluye tu dominio
- Revisar configuración en server.js

---

## Licencia

MIT

---

**Versión:** 1.0.0  
**Última Actualización:** 22 de Abril, 2024  
**Mantenido por:** Maya Autopartes Development Team
