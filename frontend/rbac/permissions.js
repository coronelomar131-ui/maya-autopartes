/**
 * frontend/rbac/permissions.js - Control de Permisos en Cliente
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Sistema de control de UI basado en permisos:
 * - Mostrar/ocultar botones según rol
 * - Deshabilitar acciones no permitidas
 * - Validación optimista en cliente
 * - Sincronización con servidor
 *
 * @version 1.0.0
 * @author Maya Autopartes Dev Team
 * @last-update 2026-04-22
 */

// ═════════════════════════════════════════════════════════════════════════════
// 1. ESTADO GLOBAL DE USUARIO Y PERMISOS
// ═════════════════════════════════════════════════════════════════════════════

let usuarioActual = null;
let permisosUsuario = {};
let permisosCache = {};

/**
 * Inicializa el sistema de permisos del cliente
 * @param {Object} usuario - Usuario actual con rol
 */
function initializePermissions(usuario) {
  if (!usuario || !usuario.role) {
    console.warn('Usuario inválido para inicializar permisos');
    return false;
  }

  usuarioActual = usuario;

  // Calcular permisos localmente (validación optimista)
  calculateLocalPermissions(usuario);

  console.log('✅ Sistema de permisos inicializado para:', usuario.nombre, `(${usuario.role})`);
  return true;
}

/**
 * Establece el usuario actual
 * @param {Object} usuario - Objeto usuario
 */
function setCurrentUser(usuario) {
  usuarioActual = usuario;
  if (usuario) {
    calculateLocalPermissions(usuario);
  }
}

/**
 * Obtiene el usuario actual
 * @returns {Object|null} Usuario actual
 */
function getCurrentUser() {
  return usuarioActual;
}

/**
 * Obtiene el rol del usuario actual
 * @returns {String|null} Rol del usuario
 */
function getCurrentUserRole() {
  return usuarioActual?.role || null;
}

// ═════════════════════════════════════════════════════════════════════════════
// 2. CÁLCULO LOCAL DE PERMISOS (VALIDACIÓN OPTIMISTA)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Calcula localmente los permisos de un usuario
 * Basado en la matriz de permisos definida en el cliente
 */
function calculateLocalPermissions(usuario) {
  if (!usuario) return {};

  permisosUsuario = {};
  const MATRIZ = getPermissionsMatrix();

  for (const [recurso, acciones] of Object.entries(MATRIZ)) {
    permisosUsuario[recurso] = {};
    for (const [accion, rolesPermitidos] of Object.entries(acciones)) {
      permisosUsuario[recurso][accion] = rolesPermitidos.includes(usuario.role);
    }
  }

  return permisosUsuario;
}

/**
 * Obtiene la matriz de permisos (sincronizada desde servidor)
 * Esta función debería cargar desde el servidor, pero aquí está hardcodeada
 * para compatibilidad con el frontend
 */
function getPermissionsMatrix() {
  return {
    venta: {
      crear: ['admin', 'gerente', 'vendedor'],
      editar: ['admin', 'gerente', 'vendedor'],
      eliminar: ['admin', 'gerente'],
      ver: ['admin', 'gerente', 'vendedor', 'viewer'],
      aprobar: ['admin', 'gerente'],
      cancelar: ['admin', 'gerente', 'vendedor'],
      exportar: ['admin', 'gerente', 'viewer'],
      cambiar_vendedor: ['admin', 'gerente'],
      cambiar_estado_pago: ['admin', 'gerente']
    },
    almacen: {
      ver: ['admin', 'gerente', 'vendedor', 'viewer'],
      crear_producto: ['admin', 'gerente'],
      editar_producto: ['admin', 'gerente'],
      eliminar_producto: ['admin'],
      actualizar_stock: ['admin', 'gerente', 'vendedor'],
      ver_costo: ['admin', 'gerente'],
      importar: ['admin', 'gerente'],
      exportar: ['admin', 'gerente', 'viewer']
    },
    cliente: {
      crear: ['admin', 'gerente', 'vendedor'],
      editar: ['admin', 'gerente', 'vendedor'],
      eliminar: ['admin', 'gerente'],
      ver: ['admin', 'gerente', 'vendedor', 'viewer'],
      ver_credito: ['admin', 'gerente'],
      cambiar_credito: ['admin', 'gerente'],
      exportar: ['admin', 'gerente', 'viewer']
    },
    usuario: {
      crear: ['admin', 'gerente'],
      editar: ['admin', 'gerente'],
      eliminar: ['admin'],
      ver_lista: ['admin', 'gerente'],
      cambiar_rol: ['admin'],
      cambiar_contraseña_otro: ['admin'],
      desactivar: ['admin', 'gerente'],
      ver_permisos: ['admin', 'gerente']
    },
    reporte: {
      ver_ventas: ['admin', 'gerente', 'viewer'],
      ver_inventario: ['admin', 'gerente', 'viewer'],
      ver_clientes: ['admin', 'gerente', 'viewer'],
      ver_usuario: ['admin', 'gerente'],
      generar_pdf: ['admin', 'gerente', 'viewer'],
      generar_excel: ['admin', 'gerente', 'viewer'],
      filtros_avanzados: ['admin', 'gerente']
    },
    sync: {
      google_drive: ['admin', 'gerente'],
      supabase: ['admin', 'gerente'],
      mercadolibre: ['admin', 'gerente'],
      onedrive: ['admin', 'gerente'],
      ver_historial: ['admin', 'gerente']
    },
    configuracion: {
      editar_empresa: ['admin'],
      editar_integraciones: ['admin'],
      editar_permisos: ['admin'],
      ver_auditoria: ['admin', 'gerente'],
      ver_logs: ['admin'],
      cambiar_idioma: ['admin', 'gerente', 'vendedor', 'viewer'],
      cambiar_tema: ['admin', 'gerente', 'vendedor', 'viewer']
    },
    seguridad: {
      cambiar_contraseña: ['admin', 'gerente', 'vendedor', 'viewer'],
      activar_2fa: ['admin', 'gerente', 'vendedor', 'viewer'],
      ver_sesiones: ['admin', 'gerente', 'vendedor', 'viewer'],
      cerrar_sesiones: ['admin']
    }
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. FUNCIONES DE VERIFICACIÓN DE PERMISOS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Verifica si el usuario actual tiene permiso para una acción
 * @param {String} recurso - Nombre del recurso
 * @param {String} accion - Acción a verificar
 * @returns {Boolean} true si tiene permiso
 */
function hasPermission(recurso, accion) {
  if (!usuarioActual) return false;

  // Admin tiene acceso a todo
  if (usuarioActual.role === 'admin') return true;

  // Consultar caché de permisos
  return permisosUsuario?.[recurso]?.[accion] || false;
}

/**
 * Verifica si el usuario tiene alguno de varios permisos
 * @param {Array} permisos - Array de {recurso, accion}
 * @returns {Boolean} true si tiene al menos uno
 */
function hasAnyPermission(permisos) {
  return permisos.some(p => hasPermission(p.recurso, p.accion));
}

/**
 * Verifica si el usuario tiene todos los permisos
 * @param {Array} permisos - Array de {recurso, accion}
 * @returns {Boolean} true si tiene todos
 */
function hasAllPermissions(permisos) {
  return permisos.every(p => hasPermission(p.recurso, p.accion));
}

/**
 * Verifica si el usuario tiene un rol específico
 * @param {String|Array} roles - Rol o array de roles
 * @returns {Boolean}
 */
function hasRole(roles) {
  if (!usuarioActual) return false;
  const rolesArray = Array.isArray(roles) ? roles : [roles];
  return rolesArray.includes(usuarioActual.role);
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. MANIPULACIÓN DEL DOM BASADA EN PERMISOS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Muestra/oculta un elemento basado en permisos
 * @param {String|HTMLElement} selector - Selector CSS o elemento
 * @param {Boolean} permitido - Si debe mostrarse
 */
function showIfPermitted(selector, permitido) {
  const elemento = typeof selector === 'string'
    ? document.querySelector(selector)
    : selector;

  if (elemento) {
    elemento.style.display = permitido ? '' : 'none';
  }

  return elemento;
}

/**
 * Habilita/deshabilita un botón basado en permisos
 * @param {String|HTMLElement} selector - Selector CSS o elemento
 * @param {Boolean} permitido - Si debe habilitarse
 */
function enableIfPermitted(selector, permitido) {
  const elemento = typeof selector === 'string'
    ? document.querySelector(selector)
    : selector;

  if (elemento) {
    elemento.disabled = !permitido;

    // Agregar clase visual
    if (!permitido) {
      elemento.classList.add('disabled', 'no-permission');
      elemento.title = 'No tiene permiso para esta acción';
    } else {
      elemento.classList.remove('disabled', 'no-permission');
    }
  }

  return elemento;
}

/**
 * Aplica visibilidad basada en permiso a múltiples elementos
 * @param {String} selector - Selector CSS (usará querySelectorAll)
 * @param {String} recurso - Recurso
 * @param {String} accion - Acción
 */
function applyPermissionToElements(selector, recurso, accion) {
  const tiene = hasPermission(recurso, accion);
  const elementos = document.querySelectorAll(selector);

  elementos.forEach(el => {
    if (el.tagName === 'BUTTON' || el.tagName === 'INPUT') {
      enableIfPermitted(el, tiene);
    } else {
      showIfPermitted(el, tiene);
    }
  });

  return elementos.length;
}

/**
 * Actualiza la visibilidad de todos los elementos con atributo data-rbac
 * Uso en HTML: <button data-rbac-recurso="venta" data-rbac-accion="crear">
 */
function applyRBACToPage() {
  const elementos = document.querySelectorAll('[data-rbac-recurso][data-rbac-accion]');

  elementos.forEach(elemento => {
    const recurso = elemento.getAttribute('data-rbac-recurso');
    const accion = elemento.getAttribute('data-rbac-accion');
    const tiene = hasPermission(recurso, accion);

    if (elemento.tagName === 'BUTTON' || elemento.tagName === 'INPUT') {
      enableIfPermitted(elemento, tiene);
    } else {
      showIfPermitted(elemento, tiene);
    }
  });

  console.log(`✅ RBAC aplicado a ${elementos.length} elementos`);
  return elementos.length;
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. VALIDACIÓN DE ACCIONES SENSIBLES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Verifica permiso antes de una acción sensible
 * Si no tiene permiso, muestra alerta
 * @param {String} recurso - Recurso
 * @param {String} accion - Acción
 * @param {String} mensaje - Mensaje personalizado
 * @returns {Boolean} true si tiene permiso
 */
function checkPermissionWithAlert(recurso, accion, mensaje = null) {
  if (hasPermission(recurso, accion)) {
    return true;
  }

  const msgDefault = `No tiene permiso para: ${accion} en ${recurso}`;
  const msg = mensaje || msgDefault;

  console.warn(`[PERMISSION DENIED] ${msg}`, {
    usuario: usuarioActual?.nombre,
    role: usuarioActual?.role,
    recurso,
    accion
  });

  if (typeof toast !== 'undefined') {
    toast(msg, 'warning');
  } else {
    alert(msg);
  }

  return false;
}

/**
 * Wrapper para funciones que requieren permisos
 * @param {String} recurso - Recurso
 * @param {String} accion - Acción
 * @param {Function} callback - Función a ejecutar si tiene permiso
 * @param {String} mensaje - Mensaje de error personalizado
 * @returns {*} Resultado de callback o null
 */
function withPermissionCheck(recurso, accion, callback, mensaje = null) {
  if (!checkPermissionWithAlert(recurso, accion, mensaje)) {
    return null;
  }

  try {
    return callback();
  } catch (error) {
    console.error('Error en operación protegida:', error);
    throw error;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. SINCRONIZACIÓN DE PERMISOS CON SERVIDOR
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Sincroniza permisos con el servidor
 * Útil para refrescar permisos después de cambios en el backend
 * @returns {Promise<Boolean>}
 */
async function syncPermissionsFromServer() {
  try {
    const response = await fetch('/api/usuario/permisos', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      console.warn('Error sincronizando permisos:', response.status);
      return false;
    }

    const data = await response.json();

    if (data.permisos) {
      permisosUsuario = data.permisos;
      console.log('✅ Permisos sincronizados desde servidor');
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error en sincronización de permisos:', error);
    return false;
  }
}

/**
 * Refresca los permisos del usuario actual
 * Útil después de cambios de rol
 * @returns {Promise<Boolean>}
 */
async function refreshPermissions() {
  try {
    const response = await fetch('/api/usuario/actual', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) return false;

    const data = await response.json();

    if (data.usuario) {
      initializePermissions(data.usuario);
      applyRBACToPage();
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error refrescando permisos:', error);
    return false;
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. UTILITIES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene todos los permisos del usuario actual
 * @returns {Object} Estructura de permisos
 */
function getAllUserPermissions() {
  return permisosUsuario;
}

/**
 * Obtiene todas las acciones permitidas para un recurso
 * @param {String} recurso - Nombre del recurso
 * @returns {Array} Array de acciones permitidas
 */
function getPermittedActionsForResource(recurso) {
  if (!permisosUsuario[recurso]) return [];

  return Object.keys(permisosUsuario[recurso])
    .filter(accion => permisosUsuario[recurso][accion]);
}

/**
 * Obtiene información sobre los permisos de un recurso
 * @param {String} recurso - Nombre del recurso
 * @returns {Object} Detalles de permisos
 */
function getResourcePermissionInfo(recurso) {
  return {
    recurso,
    accionesPermitidas: getPermittedActionsForResource(recurso),
    tieneAcceso: getPermittedActionsForResource(recurso).length > 0
  };
}

/**
 * Exporta un reporte de permisos del usuario actual
 * @returns {Object} Reporte completo
 */
function generatePermissionReport() {
  return {
    usuario: usuarioActual,
    fecha: new Date().toISOString(),
    permisos: permisosUsuario,
    resumen: Object.keys(permisosUsuario).reduce((acc, recurso) => {
      const acciones = getPermittedActionsForResource(recurso);
      acc[recurso] = acciones.length;
      return acc;
    }, {})
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 8. EXPORTACIÓN
// ═════════════════════════════════════════════════════════════════════════════

// Para navegador (global)
if (typeof window !== 'undefined') {
  window.PermissionSystem = {
    // Inicialización
    initialize: initializePermissions,
    setCurrentUser,
    getCurrentUser,
    getCurrentUserRole,

    // Verificación
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,

    // Manipulación DOM
    showIfPermitted,
    enableIfPermitted,
    applyPermissionToElements,
    applyRBACToPage,

    // Validación
    checkPermissionWithAlert,
    withPermissionCheck,

    // Sincronización
    syncPermissionsFromServer,
    refreshPermissions,

    // Utilidades
    getAllUserPermissions,
    getPermittedActionsForResource,
    getResourcePermissionInfo,
    generatePermissionReport,
    getPermissionsMatrix
  };

  // Alias corto
  window.perms = window.PermissionSystem;
}

// Para Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializePermissions,
    setCurrentUser,
    getCurrentUser,
    getCurrentUserRole,
    calculateLocalPermissions,
    getPermissionsMatrix,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasRole,
    showIfPermitted,
    enableIfPermitted,
    applyPermissionToElements,
    applyRBACToPage,
    checkPermissionWithAlert,
    withPermissionCheck,
    syncPermissionsFromServer,
    refreshPermissions,
    getAllUserPermissions,
    getPermittedActionsForResource,
    getResourcePermissionInfo,
    generatePermissionReport
  };
}
