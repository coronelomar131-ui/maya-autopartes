# Maya Autopartes Backend - Quick Start

Inicia el backend en 5 minutos.

---

## Opción 1: Setup Automático (Recomendado)

### Windows
```bash
# 1. Navegar al directorio
cd C:\Users\omar\maya-autopartes-working\backend

# 2. Copiar variables de entorno
copy .env.example .env

# 3. Editar .env con tus credenciales Supabase
# Abre .env en tu editor favorito

# 4. Instalar dependencias
npm install

# 5. Iniciar servidor
npm start
```

### macOS/Linux
```bash
# 1. Navegar
cd ~/maya-autopartes-working/backend

# 2. Copiar config
cp .env.example .env

# 3. Editar .env
nano .env

# 4. Instalar
npm install

# 5. Iniciar
npm start
```

---

## Opción 2: Desarrollo con Auto-Reload

```bash
npm install -g nodemon
npm run dev
```

El servidor se reiniciará automáticamente cuando cambies archivos.

---

## Verificar que Funciona

Abre en tu navegador o terminal:

```bash
curl http://localhost:5000/api/health
```

Respuesta esperada:
```json
{
  "status": "OK",
  "database": "CONNECTED"
}
```

---

## Configurar Supabase (Si no lo hiciste)

1. Ir a https://supabase.com
2. Crear nuevo proyecto
3. Esperar a que se cree
4. Ir a Settings > API
5. Copiar:
   - **Project URL** → SUPABASE_URL
   - **Anon Key** → SUPABASE_KEY
6. Pegar en .env

---

## Probar Endpoints

### Listar todos los usuarios
```bash
curl http://localhost:5000/api/v1/usuarios
```

### Crear cliente
```bash
curl -X POST http://localhost:5000/api/v1/clientes \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Test",
    "email": "test@example.com",
    "telefono": "1234567890",
    "tipo": "particulares"
  }'
```

### Ver estadísticas de inventario
```bash
curl http://localhost:5000/api/v1/almacen/stats/inventory
```

---

## Troubleshooting Rápido

### Error: "Cannot find module"
```bash
npm install
```

### Error: "Port 5000 already in use"
```bash
# Cambiar puerto
set PORT=5001
npm start
```

### Error: "SUPABASE_URL is not configured"
Verificar que .env tenga SUPABASE_URL y SUPABASE_KEY

### Error: "Database connection failed"
- Verificar credenciales Supabase
- Verificar conexión a internet
- Verificar que proyecto Supabase esté activo

---

## Estructura de Carpetas

```
backend/
├── server.js              ← Servidor principal
├── routes/
│   ├── ventas.js         ← Rutas de ventas
│   ├── almacen.js        ← Rutas de productos
│   ├── clientes.js       ← Rutas de clientes
│   ├── usuarios.js       ← Rutas de usuarios
│   └── facturas.js       ← Rutas de facturas
├── package.json
└── .env                  ← Configuración (copia de .env.example)
```

---

## Usar API desde Frontend

```javascript
// En tu frontend (HTML/React/Vue)
const response = await fetch('http://localhost:5000/api/v1/clientes', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    nombre: 'Juan',
    email: 'juan@example.com',
    telefono: '1234567890',
    tipo: 'particulares'
  })
});

const data = await response.json();
console.log(data);
```

---

## URLs Importantes

| Endpoint | URL |
|----------|-----|
| Health Check | http://localhost:5000/api/health |
| Info API | http://localhost:5000/api/info |
| Documentación | http://localhost:5000/api/docs |
| Usuarios | http://localhost:5000/api/v1/usuarios |
| Clientes | http://localhost:5000/api/v1/clientes |
| Almacén | http://localhost:5000/api/v1/almacen |
| Ventas | http://localhost:5000/api/v1/ventas |
| Facturas | http://localhost:5000/api/v1/facturas |

---

## Documentación Completa

- **README.md** - Descripción general
- **BACKEND_SETUP.md** - Instalación detallada
- **API_ENDPOINTS.md** - Referencia de endpoints
- **TESTING_EXAMPLES.md** - Ejemplos de uso

---

## Variables de Entorno Clave

```env
# Obligatorias
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key

# Opcionales (tienen valores por defecto)
NODE_ENV=development       # o "production"
PORT=5000                  # Puerto del servidor
CORS_ORIGIN=http://localhost:3000,http://localhost:5000
```

---

## Siguiente Paso

Una vez que el servidor esté corriendo:

1. Visita **API_ENDPOINTS.md** para ver todos los endpoints
2. Abre **TESTING_EXAMPLES.md** para ver ejemplos
3. Crea tu primer usuario: `POST /api/v1/usuarios`
4. Crea tu primer cliente: `POST /api/v1/clientes`
5. Integra con tu frontend

---

## Soporte Rápido

### Revisar logs
Mira la consola donde ejecutaste `npm start`

### Revisar configuración
Abre el archivo `.env` y verifica las variables

### Ver todos los usuarios
```bash
curl http://localhost:5000/api/v1/usuarios | jq
```

### Ver documentación de endpoints
```bash
curl http://localhost:5000/api/docs | jq
```

---

**¡Listo! El backend está funcionando.**

Para más detalles, ver README.md o BACKEND_SETUP.md
