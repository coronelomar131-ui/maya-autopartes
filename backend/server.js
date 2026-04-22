/**
 * Maya Autopartes Backend - Express Server
 * API Core para gestión de inventario, ventas, clientes, usuarios y facturas
 * Versión: 1.0.0
 *
 * Dependencias:
 * - Express: Framework web
 * - Supabase: Base de datos y autenticación
 * - CORS: Cross-Origin Resource Sharing
 * - Morgan: HTTP request logging
 * - Helmet: Security headers
 * - Express Validator: Validación de datos
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');

// Cargar variables de entorno
dotenv.config();

// Importar rutas modulares
const ventasRoutes = require('./routes/ventas');
const almacenRoutes = require('./routes/almacen');
const clientesRoutes = require('./routes/clientes');
const usuariosRoutes = require('./routes/usuarios');
const facturasRoutes = require('./routes/facturas');

// ============================================================================
// CONFIGURACIÓN INICIAL
// ============================================================================

const app = express();
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Inicializar Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('ERROR: Variables SUPABASE_URL y SUPABASE_KEY no están configuradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ============================================================================
// MIDDLEWARES GLOBALES
// ============================================================================

// Seguridad con Helmet
app.use(helmet());

// Compresión de respuestas
app.use(compression());

// CORS configurado
const corsOptions = {
  origin: process.env.CORS_ORIGIN || ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));

// Parseo de JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Morgan logging - Formato personalizado según ambiente
const morganFormat = NODE_ENV === 'production' ? 'combined' : 'dev';
app.use(morgan(morganFormat));

// Middleware para agregar Supabase al request
app.use((req, res, next) => {
  req.supabase = supabase;
  next();
});

// ============================================================================
// RUTAS MODULARES
// ============================================================================

// API Routes v1
app.use('/api/v1/ventas', ventasRoutes);
app.use('/api/v1/almacen', almacenRoutes);
app.use('/api/v1/clientes', clientesRoutes);
app.use('/api/v1/usuarios', usuariosRoutes);
app.use('/api/v1/facturas', facturasRoutes);

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
    uptime: process.uptime(),
    database: supabase ? 'CONNECTED' : 'DISCONNECTED'
  });
});

// ============================================================================
// RUTAS DE INFORMACIÓN
// ============================================================================

app.get('/api/info', (req, res) => {
  res.status(200).json({
    name: 'Maya Autopartes API',
    version: '1.0.0',
    description: 'Backend API Core para gestión de inventario',
    endpoints: {
      ventas: '/api/v1/ventas',
      almacen: '/api/v1/almacen',
      clientes: '/api/v1/clientes',
      usuarios: '/api/v1/usuarios',
      facturas: '/api/v1/facturas',
      health: '/api/health'
    },
    docs: '/api/docs'
  });
});

// ============================================================================
// DOCUMENTACIÓN DE API
// ============================================================================

app.get('/api/docs', (req, res) => {
  res.status(200).json({
    title: 'Maya Autopartes API Documentation',
    version: '1.0.0',
    baseUrl: process.env.API_URL || 'http://localhost:5000',
    endpoints: {
      ventas: {
        create: 'POST /api/v1/ventas',
        read: 'GET /api/v1/ventas',
        readById: 'GET /api/v1/ventas/:id',
        update: 'PUT /api/v1/ventas/:id',
        delete: 'DELETE /api/v1/ventas/:id',
        getByCliente: 'GET /api/v1/ventas/cliente/:clienteId'
      },
      almacen: {
        create: 'POST /api/v1/almacen',
        read: 'GET /api/v1/almacen',
        readById: 'GET /api/v1/almacen/:id',
        update: 'PUT /api/v1/almacen/:id',
        delete: 'DELETE /api/v1/almacen/:id',
        inventory: 'GET /api/v1/almacen/stats/inventory'
      },
      clientes: {
        create: 'POST /api/v1/clientes',
        read: 'GET /api/v1/clientes',
        readById: 'GET /api/v1/clientes/:id',
        update: 'PUT /api/v1/clientes/:id',
        delete: 'DELETE /api/v1/clientes/:id',
        search: 'GET /api/v1/clientes/search/:query'
      },
      usuarios: {
        create: 'POST /api/v1/usuarios',
        read: 'GET /api/v1/usuarios',
        readById: 'GET /api/v1/usuarios/:id',
        update: 'PUT /api/v1/usuarios/:id',
        delete: 'DELETE /api/v1/usuarios/:id',
        login: 'POST /api/v1/usuarios/auth/login'
      },
      facturas: {
        create: 'POST /api/v1/facturas',
        read: 'GET /api/v1/facturas',
        readById: 'GET /api/v1/facturas/:id',
        update: 'PUT /api/v1/facturas/:id',
        delete: 'DELETE /api/v1/facturas/:id',
        byVenta: 'GET /api/v1/facturas/venta/:ventaId'
      }
    }
  });
});

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

// Manejo de rutas no encontradas (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    message: `${req.method} ${req.originalUrl}`,
    timestamp: new Date().toISOString()
  });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error('ERROR:', {
    message: err.message,
    stack: err.stack,
    timestamp: new Date().toISOString()
  });

  // Errores de validación
  if (err.status === 400 || err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validación fallida',
      message: err.message || 'Datos inválidos proporcionados',
      details: err.details || null,
      timestamp: new Date().toISOString()
    });
  }

  // Errores de autenticación
  if (err.status === 401 || err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      error: 'No autorizado',
      message: 'Autenticación requerida',
      timestamp: new Date().toISOString()
    });
  }

  // Errores de base de datos
  if (err.message.includes('database') || err.message.includes('supabase')) {
    return res.status(500).json({
      success: false,
      error: 'Error de base de datos',
      message: NODE_ENV === 'production' ? 'Error interno del servidor' : err.message,
      timestamp: new Date().toISOString()
    });
  }

  // Error genérico
  res.status(err.status || 500).json({
    success: false,
    error: 'Error interno del servidor',
    message: NODE_ENV === 'production' ? 'Algo salió mal' : err.message,
    timestamp: new Date().toISOString()
  });
});

// ============================================================================
// INICIAR SERVIDOR
// ============================================================================

const server = app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════╗
║     Maya Autopartes Backend API - INICIADO             ║
╚════════════════════════════════════════════════════════╝

  Servidor:     ${NODE_ENV.toUpperCase()}
  Puerto:       ${PORT}
  URL Base:     http://localhost:${PORT}

  Rutas disponibles:
  - /api/health           Health check
  - /api/info             Información del API
  - /api/docs             Documentación completa

  Módulos cargados:
  - /api/v1/ventas        Gestión de ventas
  - /api/v1/almacen       Gestión de almacén
  - /api/v1/clientes      Gestión de clientes
  - /api/v1/usuarios      Gestión de usuarios
  - /api/v1/facturas      Gestión de facturas

  Base de datos: ${supabaseUrl ? 'CONECTADA' : 'ERROR'}

  Presiona Ctrl+C para detener
════════════════════════════════════════════════════════
  `);
});

// Manejo de errores en la inicialización del servidor
server.on('error', (err) => {
  console.error('Error al iniciar servidor:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM recibido, cerrando servidor gracefully...');
  server.close(() => {
    console.log('Servidor cerrado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nSIGINT recibido, cerrando servidor...');
  server.close(() => {
    console.log('Servidor cerrado');
    process.exit(0);
  });
});

module.exports = { app, supabase };
