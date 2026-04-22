/**
 * backend/rbac/roles.js - RBAC System: Roles y Permisos
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Define los 4 roles principales y su matriz de permisos:
 * - Admin: Acceso completo
 * - Gerente: Gestión de ventas, reportes, usuarios
 * - Vendedor: Creación de ventas, consulta de inventario
 * - Viewer: Solo lectura (reportes, consultas)
 *
 * @version 1.0.0
 * @author Maya Autopartes Dev Team
 * @last-update 2026-04-22
 */

// ═════════════════════════════════════════════════════════════════════════════
// 1. DEFINICIÓN DE ROLES
// ═════════════════════════════════════════════════════════════════════════════

const ROLES = {
  ADMIN: 'admin',
  GERENTE: 'gerente',
  VENDEDOR: 'vendedor',
  VIEWER: 'viewer'
};

const ROLE_DESCRIPTIONS = {
  [ROLES.ADMIN]: {
    name: 'Administrador',
    description: 'Acceso total al sistema, gestión de usuarios y configuración',
    level: 4,
    color: '#d32f2f'
  },
  [ROLES.GERENTE]: {
    name: 'Gerente',
    description: 'Gestión de ventas, reportes, usuarios y auditoría',
    level: 3,
    color: '#f57c00'
  },
  [ROLES.VENDEDOR]: {
    name: 'Vendedor',
    description: 'Creación de ventas, consulta de inventario y clientes',
    level: 2,
    color: '#388e3c'
  },
  [ROLES.VIEWER]: {
    name: 'Visor',
    description: 'Solo lectura: reportes y consultas',
    level: 1,
    color: '#1976d2'
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. MATRIZ DE PERMISOS POR RECURSO Y ACCIÓN
// ═════════════════════════════════════════════════════════════════════════════

const PERMISSIONS_MATRIX = {
  // ─── VENTAS ───
  venta: {
    crear: [ROLES.ADMIN, ROLES.GERENTE, ROLES.VENDEDOR],
    editar: [ROLES.ADMIN, ROLES.GERENTE, ROLES.VENDEDOR],
    eliminar: [ROLES.ADMIN, ROLES.GERENTE],
    ver: [ROLES.ADMIN, ROLES.GERENTE, ROLES.VENDEDOR, ROLES.VIEWER],
    aprobar: [ROLES.ADMIN, ROLES.GERENTE],
    cancelar: [ROLES.ADMIN, ROLES.GERENTE, ROLES.VENDEDOR],
    exportar: [ROLES.ADMIN, ROLES.GERENTE, ROLES.VIEWER],
    cambiar_vendedor: [ROLES.ADMIN, ROLES.GERENTE],
    cambiar_estado_pago: [ROLES.ADMIN, ROLES.GERENTE]
  },

  // ─── ALMACÉN ───
  almacen: {
    ver: [ROLES.ADMIN, ROLES.GERENTE, ROLES.VENDEDOR, ROLES.VIEWER],
    crear_producto: [ROLES.ADMIN, ROLES.GERENTE],
    editar_producto: [ROLES.ADMIN, ROLES.GERENTE],
    eliminar_producto: [ROLES.ADMIN],
    actualizar_stock: [ROLES.ADMIN, ROLES.GERENTE, ROLES.VENDEDOR],
    ver_costo: [ROLES.ADMIN, ROLES.GERENTE],
    importar: [ROLES.ADMIN, ROLES.GERENTE],
    exportar: [ROLES.ADMIN, ROLES.GERENTE, ROLES.VIEWER]
  },

  // ─── CLIENTES ───
  cliente: {
    crear: [ROLES.ADMIN, ROLES.GERENTE, ROLES.VENDEDOR],
    editar: [ROLES.ADMIN, ROLES.GERENTE, ROLES.VENDEDOR],
    eliminar: [ROLES.ADMIN, ROLES.GERENTE],
    ver: [ROLES.ADMIN, ROLES.GERENTE, ROLES.VENDEDOR, ROLES.VIEWER],
    ver_credito: [ROLES.ADMIN, ROLES.GERENTE],
    cambiar_credito: [ROLES.ADMIN, ROLES.GERENTE],
    exportar: [ROLES.ADMIN, ROLES.GERENTE, ROLES.VIEWER]
  },

  // ─── USUARIOS ───
  usuario: {
    crear: [ROLES.ADMIN, ROLES.GERENTE],
    editar: [ROLES.ADMIN, ROLES.GERENTE],
    eliminar: [ROLES.ADMIN],
    ver_lista: [ROLES.ADMIN, ROLES.GERENTE],
    cambiar_rol: [ROLES.ADMIN],
    cambiar_contraseña_otro: [ROLES.ADMIN],
    desactivar: [ROLES.ADMIN, ROLES.GERENTE],
    ver_permisos: [ROLES.ADMIN, ROLES.GERENTE]
  },

  // ─── REPORTES ───
  reporte: {
    ver_ventas: [ROLES.ADMIN, ROLES.GERENTE, ROLES.VIEWER],
    ver_inventario: [ROLES.ADMIN, ROLES.GERENTE, ROLES.VIEWER],
    ver_clientes: [ROLES.ADMIN, ROLES.GERENTE, ROLES.VIEWER],
    ver_usuario: [ROLES.ADMIN, ROLES.GERENTE],
    generar_pdf: [ROLES.ADMIN, ROLES.GERENTE, ROLES.VIEWER],
    generar_excel: [ROLES.ADMIN, ROLES.GERENTE, ROLES.VIEWER],
    filtros_avanzados: [ROLES.ADMIN, ROLES.GERENTE]
  },

  // ─── SINCRONIZACIÓN ───
  sync: {
    google_drive: [ROLES.ADMIN, ROLES.GERENTE],
    supabase: [ROLES.ADMIN, ROLES.GERENTE],
    mercadolibre: [ROLES.ADMIN, ROLES.GERENTE],
    onedrive: [ROLES.ADMIN, ROLES.GERENTE],
    ver_historial: [ROLES.ADMIN, ROLES.GERENTE]
  },

  // ─── CONFIGURACIÓN ───
  configuracion: {
    editar_empresa: [ROLES.ADMIN],
    editar_integraciones: [ROLES.ADMIN],
    editar_permisos: [ROLES.ADMIN],
    ver_auditoria: [ROLES.ADMIN, ROLES.GERENTE],
    ver_logs: [ROLES.ADMIN],
    cambiar_idioma: [ROLES.ADMIN, ROLES.GERENTE, ROLES.VENDEDOR, ROLES.VIEWER],
    cambiar_tema: [ROLES.ADMIN, ROLES.GERENTE, ROLES.VENDEDOR, ROLES.VIEWER]
  },

  // ─── SEGURIDAD ───
  seguridad: {
    cambiar_contraseña: [ROLES.ADMIN, ROLES.GERENTE, ROLES.VENDEDOR, ROLES.VIEWER],
    activar_2fa: [ROLES.ADMIN, ROLES.GERENTE, ROLES.VENDEDOR, ROLES.VIEWER],
    ver_sesiones: [ROLES.ADMIN, ROLES.GERENTE, ROLES.VENDEDOR, ROLES.VIEWER],
    cerrar_sesiones: [ROLES.ADMIN]
  }
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. FUNCIONES PRINCIPALES DE VERIFICACIÓN
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Verifica si un usuario tiene un rol específico
 * @param {Object} usuario - Objeto usuario con propiedad 'role'
 * @param {String} rolRequerido - Rol a verificar (puede ser string o array)
 * @returns {Boolean} true si el usuario tiene el rol
 */
function checkRole(usuario, rolRequerido) {
  if (!usuario || !usuario.role) return false;

  if (Array.isArray(rolRequerido)) {
    return rolRequerido.includes(usuario.role);
  }

  return usuario.role === rolRequerido;
}

/**
 * Verifica si un usuario tiene permiso para una acción en un recurso
 * @param {Object} usuario - Objeto usuario con propiedad 'role'
 * @param {String} recurso - Nombre del recurso (ej: 'venta', 'cliente')
 * @param {String} accion - Acción a realizar (ej: 'crear', 'editar')
 * @returns {Boolean} true si tiene permiso
 */
function checkPermission(usuario, recurso, accion) {
  if (!usuario || !usuario.role) return false;

  // Admin tiene acceso a todo
  if (usuario.role === ROLES.ADMIN) return true;

  // Verificar en la matriz de permisos
  if (!PERMISSIONS_MATRIX[recurso]) {
    console.warn(`Recurso no definido: ${recurso}`);
    return false;
  }

  if (!PERMISSIONS_MATRIX[recurso][accion]) {
    console.warn(`Acción no definida: ${accion} para recurso ${recurso}`);
    return false;
  }

  const rolesPermitidos = PERMISSIONS_MATRIX[recurso][accion];
  return rolesPermitidos.includes(usuario.role);
}

/**
 * Obtiene todas las acciones permitidas para un usuario en un recurso
 * @param {Object} usuario - Objeto usuario
 * @param {String} recurso - Nombre del recurso
 * @returns {Array} Array de acciones permitidas
 */
function getPermittedActions(usuario, recurso) {
  if (!usuario || !usuario.role) return [];
  if (!PERMISSIONS_MATRIX[recurso]) return [];

  const acciones = [];
  const matriz = PERMISSIONS_MATRIX[recurso];

  for (const [accion, rolesPermitidos] of Object.entries(matriz)) {
    if (checkPermission(usuario, recurso, accion)) {
      acciones.push(accion);
    }
  }

  return acciones;
}

/**
 * Obtiene todos los permisos de un usuario
 * @param {Object} usuario - Objeto usuario
 * @returns {Object} Estructura de todos los permisos del usuario
 */
function getUserPermissions(usuario) {
  if (!usuario || !usuario.role) return {};

  const permisos = {};

  for (const [recurso, acciones] of Object.entries(PERMISSIONS_MATRIX)) {
    permisos[recurso] = {};
    for (const accion of Object.keys(acciones)) {
      permisos[recurso][accion] = checkPermission(usuario, recurso, accion);
    }
  }

  return permisos;
}

/**
 * Valida si un rol es válido
 * @param {String} rol - Rol a validar
 * @returns {Boolean} true si es un rol válido
 */
function isValidRole(rol) {
  return Object.values(ROLES).includes(rol);
}

/**
 * Obtiene información detallada de un rol
 * @param {String} rol - Rol a consultar
 * @returns {Object} Información del rol
 */
function getRoleInfo(rol) {
  return ROLE_DESCRIPTIONS[rol] || null;
}

/**
 * Obtiene todos los roles disponibles
 * @returns {Array} Array de todos los roles
 */
function getAllRoles() {
  return Object.values(ROLES);
}

/**
 * Obtiene la descripción de todos los roles
 * @returns {Object} Objeto con descripciones de roles
 */
function getAllRoleDescriptions() {
  return ROLE_DESCRIPTIONS;
}

/**
 * Compara niveles de rol (para verificar jerarquía)
 * @param {String} rol1 - Primer rol
 * @param {String} rol2 - Segundo rol
 * @returns {Number} Valor negativo si rol1 < rol2, 0 si igual, positivo si rol1 > rol2
 */
function compareRoles(rol1, rol2) {
  const nivel1 = ROLE_DESCRIPTIONS[rol1]?.level || 0;
  const nivel2 = ROLE_DESCRIPTIONS[rol2]?.level || 0;
  return nivel1 - nivel2;
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. FUNCIÓN DE AUDITORÍA Y LOGGING
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Registra un evento de acceso (permitido o denegado)
 * @param {Object} usuario - Usuario que realiza la acción
 * @param {String} recurso - Recurso accedido
 * @param {String} accion - Acción realizada
 * @param {Boolean} permitido - Si fue permitido o denegado
 * @param {Object} detalles - Información adicional
 * @returns {Object} Registro de auditoría
 */
function logAccessEvent(usuario, recurso, accion, permitido, detalles = {}) {
  const evento = {
    timestamp: new Date().toISOString(),
    usuario_id: usuario?.id || 'unknown',
    usuario_nombre: usuario?.nombre || 'unknown',
    usuario_role: usuario?.role || 'unknown',
    recurso,
    accion,
    permitido,
    ip: detalles.ip || null,
    user_agent: detalles.userAgent || null,
    ...detalles
  };

  // En producción, esto iría a una base de datos
  console.log(`[${permitido ? 'PERMIT' : 'DENY'}] ${usuario?.nombre || 'Unknown'} (${usuario?.role}) - ${recurso}.${accion}`, evento);

  return evento;
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. EXPORTACIÓN DE MÓDULO
// ═════════════════════════════════════════════════════════════════════════════

// Para Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    // Constantes
    ROLES,
    ROLE_DESCRIPTIONS,
    PERMISSIONS_MATRIX,

    // Funciones principales
    checkRole,
    checkPermission,
    getPermittedActions,
    getUserPermissions,
    isValidRole,
    getRoleInfo,
    getAllRoles,
    getAllRoleDescriptions,
    compareRoles,
    logAccessEvent
  };
}

// Para módulos ES6
if (typeof exports !== 'undefined') {
  Object.assign(exports, {
    ROLES,
    ROLE_DESCRIPTIONS,
    PERMISSIONS_MATRIX,
    checkRole,
    checkPermission,
    getPermittedActions,
    getUserPermissions,
    isValidRole,
    getRoleInfo,
    getAllRoles,
    getAllRoleDescriptions,
    compareRoles,
    logAccessEvent
  });
}
