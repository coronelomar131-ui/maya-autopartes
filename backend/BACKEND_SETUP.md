# Maya Autopartes Backend - Setup Guide

## Descripción General

Backend API Core para Maya Autopartes con Express.js y Supabase. Proporciona endpoints CRUD para gestión de:
- Ventas
- Almacén (Inventario)
- Clientes
- Usuarios
- Facturas

---

## Requisitos Previos

- **Node.js:** v16.0.0 o superior
- **npm:** v8.0.0 o superior
- **Supabase Account:** Para base de datos
- **Git:** Para control de versiones

---

## Instalación

### 1. Clonar el Repositorio

```bash
cd C:\Users\omar\maya-autopartes-working
git clone <repo-url>
cd backend
```

### 2. Instalar Dependencias

```bash
npm install
```

Esto instalará:
- Express.js (framework web)
- @supabase/supabase-js (cliente Supabase)
- dotenv (variables de entorno)
- cors (habilitación de CORS)
- morgan (logging HTTP)
- helmet (headers de seguridad)
- express-validator (validación)
- compression (compresión de respuestas)
- uuid (generación de IDs)
- Otras dependencias de desarrollo

### 3. Configurar Variables de Entorno

Copiar el archivo de ejemplo:

```bash
cp .env.example .env
```

Editar `.env` con tus credenciales:

```env
NODE_ENV=development
PORT=5000
API_URL=http://localhost:5000

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# CORS
CORS_ORIGIN=http://localhost:3000,http://localhost:5000

# Database (opcional)
DB_USER=postgres
DB_PASSWORD=your_password
DB_HOST=localhost
DB_PORT=5432
DB_NAME=maya_autopartes
```

**Cómo obtener credenciales de Supabase:**
1. Ir a https://supabase.com
2. Crear nuevo proyecto
3. En Configuración > API, copiar:
   - Project URL (SUPABASE_URL)
   - Anon Key (SUPABASE_KEY)

---

## Estructura del Proyecto

```
backend/
├── server.js                 # Servidor principal (400+ líneas)
├── package.json             # Dependencias
├── .env.example             # Variables de entorno
├── .env                      # Configuración (no commitear)
├── routes/
│   ├── ventas.js           # Endpoints de ventas (70 líneas)
│   ├── almacen.js          # Endpoints de almacén (80 líneas)
│   ├── clientes.js         # Endpoints de clientes (70 líneas)
│   ├── usuarios.js         # Endpoints de usuarios (75 líneas)
│   └── facturas.js         # Endpoints de facturas (75 líneas)
├── API_ENDPOINTS.md        # Documentación de endpoints
├── BACKEND_SETUP.md        # Esta guía
└── logs/                   # Archivos de log (generado)
```

---

## Iniciar el Servidor

### Modo Desarrollo

```bash
npm run dev
```

Requiere `nodemon` instalado. El servidor se reiniciará automáticamente con cambios.

### Modo Producción

```bash
npm start
```

---

## Verificar que Funciona

### 1. Health Check

```bash
curl http://localhost:5000/api/health
```

**Respuesta esperada:**
```json
{
  "status": "OK",
  "timestamp": "2024-04-22T12:00:00.000Z",
  "environment": "development",
  "uptime": 1.234,
  "database": "CONNECTED"
}
```

### 2. Información del API

```bash
curl http://localhost:5000/api/info
```

### 3. Documentación

```bash
curl http://localhost:5000/api/docs
```

---

## Endpoints Principales

### Ventas
- `POST /api/v1/ventas` - Crear venta
- `GET /api/v1/ventas` - Listar ventas
- `GET /api/v1/ventas/:id` - Obtener venta
- `PUT /api/v1/ventas/:id` - Actualizar venta
- `DELETE /api/v1/ventas/:id` - Eliminar venta

### Almacén
- `POST /api/v1/almacen` - Crear producto
- `GET /api/v1/almacen` - Listar productos
- `GET /api/v1/almacen/:id` - Obtener producto
- `PUT /api/v1/almacen/:id` - Actualizar producto
- `DELETE /api/v1/almacen/:id` - Eliminar producto
- `GET /api/v1/almacen/stats/inventory` - Estadísticas
- `PATCH /api/v1/almacen/:id/cantidad` - Actualizar cantidad

### Clientes
- `POST /api/v1/clientes` - Crear cliente
- `GET /api/v1/clientes` - Listar clientes
- `GET /api/v1/clientes/:id` - Obtener cliente
- `PUT /api/v1/clientes/:id` - Actualizar cliente
- `DELETE /api/v1/clientes/:id` - Eliminar cliente
- `GET /api/v1/clientes/search/:query` - Buscar clientes
- `GET /api/v1/clientes/stats/general` - Estadísticas

### Usuarios
- `POST /api/v1/usuarios` - Crear usuario
- `GET /api/v1/usuarios` - Listar usuarios
- `GET /api/v1/usuarios/:id` - Obtener usuario
- `PUT /api/v1/usuarios/:id` - Actualizar usuario
- `DELETE /api/v1/usuarios/:id` - Eliminar usuario
- `POST /api/v1/usuarios/auth/login` - Login

### Facturas
- `POST /api/v1/facturas` - Crear factura
- `GET /api/v1/facturas` - Listar facturas
- `GET /api/v1/facturas/:id` - Obtener factura
- `PUT /api/v1/facturas/:id` - Actualizar factura
- `DELETE /api/v1/facturas/:id` - Eliminar factura
- `GET /api/v1/facturas/venta/:ventaId` - Facturas por venta
- `GET /api/v1/facturas/stats/general` - Estadísticas
- `PATCH /api/v1/facturas/:id/pagar` - Marcar como pagada

Ver `API_ENDPOINTS.md` para documentación completa.

---

## Características Implementadas

### Seguridad
- ✓ Helmet.js para headers de seguridad
- ✓ CORS configurado
- ✓ Compresión de respuestas
- ✓ Validación de entrada
- ✓ Manejo de errores global

### Funcionalidad
- ✓ CRUD completo para 5 módulos
- ✓ Paginación en listados
- ✓ Búsqueda y filtrado
- ✓ Estadísticas y análisis
- ✓ Endpoints de salud y info

### Logging
- ✓ Morgan HTTP request logging
- ✓ Manejo de errores detallado
- ✓ Logs estructurados

### Escalabilidad
- ✓ Modular routing
- ✓ Error handling centralizado
- ✓ Compresión automática
- ✓ Graceful shutdown

---

## Configuración Avanzada

### Cambiar Puerto

```env
PORT=3000
```

### Configurar CORS

```env
CORS_ORIGIN=http://localhost:3000,https://example.com
```

### Cambiar Ambiente

```env
NODE_ENV=production
```

### Logging Personalizado

Editar en `server.js`:
```javascript
const morganFormat = NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat));
```

---

## Testing

### Crear Usuario

```bash
curl -X POST http://localhost:5000/api/v1/usuarios \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Juan García",
    "email": "juan@maya.com",
    "password": "secure123",
    "rol": "vendedor",
    "departamento": "Ventas"
  }'
```

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

---

## Troubleshooting

### Error: "Cannot find module 'express'"
```bash
npm install
```

### Error: "SUPABASE_URL is not configured"
Verificar que `.env` tenga SUPABASE_URL y SUPABASE_KEY.

### Error: "Port 5000 is already in use"
```bash
# Cambiar puerto en .env
PORT=5001
```

### Error: "CORS policy"
Verificar CORS_ORIGIN en `.env` incluye tu frontend.

### Database Connection Failed
- Verificar credenciales de Supabase
- Verificar conexión a internet
- Verificar que el proyecto Supabase esté activo

---

## Production Deployment

### Preparación

1. Configurar variables en `.env.production`
2. Establecer `NODE_ENV=production`
3. Instalar solo dependencias de producción:
   ```bash
   npm ci --only=production
   ```

### Deploying a Vercel

```bash
# Instalar Vercel CLI
npm install -g vercel

# Deploy
vercel
```

### Deploying a Heroku

```bash
# Instalar Heroku CLI
npm install -g heroku

# Login y deploy
heroku login
heroku create
git push heroku main
```

### Deploying con Docker

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 5000
CMD ["npm", "start"]
```

---

## Monitoreo

### Logs en Tiempo Real

```bash
npm start 2>&1 | tee logs/app.log
```

### Health Check Automático

```bash
# Bash script para verificar health cada minuto
while true; do
  curl -s http://localhost:5000/api/health | jq .
  sleep 60
done
```

---

## Siguientes Pasos

1. **Autenticación:** Implementar JWT en lugar de base64
2. **Rate Limiting:** Agregar protección contra abuso
3. **Caching:** Implementar Redis
4. **Testing:** Crear suite de tests con Jest
5. **API Documentation:** Agregar Swagger/OpenAPI
6. **Monitoring:** Integrar con Sentry o similar

---

## Soporte

Para problemas o preguntas:
- Revisar `API_ENDPOINTS.md` para documentación de endpoints
- Verificar logs en consola
- Revisar variables de entorno

---

**Última Actualización:** 22 de Abril, 2024  
**Mantenido por:** Maya Autopartes Development Team
