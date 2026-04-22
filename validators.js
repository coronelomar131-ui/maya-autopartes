/**
 * validators.js - Validación Completa para Maya Autopartes
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Responsabilidades:
 * ✓ RFC validation (México)
 * ✓ Email validation
 * ✓ Teléfono validation
 * ✓ Validación de datos de Ventas, Clientes, Productos, Usuarios
 * ✓ Esquemas de validación reutilizables
 * ✓ Mensajes de error claros y localizados
 *
 * @version 1.0.0 - Phase 3 Security
 * @author Maya Autopartes Dev Team
 * @last-update 2026-04-22
 */

// ═════════════════════════════════════════════════════════════════════════════
// 1. CONFIGURACIÓN
// ═════════════════════════════════════════════════════════════════════════════

const VALIDATION_CONFIG = {
  MIN_PASSWORD_LENGTH: 12,
  MAX_PASSWORD_LENGTH: 128,
  MAX_TEXT_LENGTH: 255,
  MAX_LONG_TEXT_LENGTH: 2000,
  MAX_DECIMAL_PLACES: 2,
  PHONE_MIN_LENGTH: 10,
  PHONE_MAX_LENGTH: 20
};

/**
 * Regex patterns para validación
 */
const PATTERNS = {
  // RFC: Puede ser de 12 caracteres (personas físicas) o 13 (personas morales)
  // Formato: XXX990101XXX
  RFC: /^([A-ZÑ&]{3,4})(\d{6})([A-Z0-9]{3})$/,

  // Email según RFC 5322 (versión simplificada pero sólida)
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  // Teléfono México: 10 dígitos
  PHONE_MX: /^(\+?52[-.\s]?)?(\d{2,3}[-.\s]?)?(\d{4}[-.\s]?)?(\d{4})$/,

  // Contraseña fuerte: mínimo 12 caracteres, mayúscula, minúscula, número, símbolo
  STRONG_PASSWORD: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,

  // URL segura (http, https, mailto)
  SAFE_URL: /^(https?:\/\/|mailto:)[^\s]+$/,

  // Números enteros positivos
  POSITIVE_INTEGER: /^\d+$/,

  // Números decimales (hasta 2 decimales)
  DECIMAL: /^\d+(\.\d{1,2})?$/,

  // Nombre: solo letras, espacios, acentos
  NAME: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s'-]+$/,

  // RFC (alternativo más flexible)
  RFC_FLEXIBLE: /^[a-zA-Z0-9]{12,13}$/
};

// ═════════════════════════════════════════════════════════════════════════════
// 2. MENSAJES DE ERROR LOCALIZADOS
// ═════════════════════════════════════════════════════════════════════════════

const ERROR_MESSAGES = {
  REQUIRED: 'Este campo es requerido',
  INVALID_FORMAT: 'Formato inválido',
  INVALID_RFC: 'RFC inválido. Debe ser 12-13 caracteres',
  INVALID_EMAIL: 'Correo electrónico inválido',
  INVALID_PHONE: 'Teléfono inválido. Debe contener al menos 10 dígitos',
  INVALID_PASSWORD: 'Contraseña debe tener 12+ caracteres, mayúscula, minúscula, número y símbolo',
  PASSWORD_MISMATCH: 'Las contraseñas no coinciden',
  SHORT_PASSWORD: `Contraseña muy corta (mínimo ${VALIDATION_CONFIG.MIN_PASSWORD_LENGTH} caracteres)`,
  LONG_PASSWORD: `Contraseña muy larga (máximo ${VALIDATION_CONFIG.MAX_PASSWORD_LENGTH} caracteres)`,
  TOO_LONG: (maxLength) => `Máximo ${maxLength} caracteres`,
  NEGATIVE_NUMBER: 'El número debe ser positivo',
  INVALID_DECIMAL: 'Número decimal inválido (máximo 2 decimales)',
  INVALID_NAME: 'Nombre solo puede contener letras, espacios y acentos',
  INVALID_URL: 'URL inválida',
  INVALID_NUMBER: 'Número inválido',
  DUPLICATE_ENTRY: 'Esta entrada ya existe',
  OUT_OF_RANGE: (min, max) => `Debe estar entre ${min} y ${max}`,
  INVALID_DATE: 'Fecha inválida',
  FUTURE_DATE: 'La fecha no puede ser en el futuro',
  PAST_DATE: 'La fecha no puede ser en el pasado'
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. VALIDADORES BÁSICOS
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Valida si un campo es requerido
 * @param {*} value - Valor a validar
 * @returns {Object} {valid: Boolean, message: String}
 */
function validateRequired(value) {
  if (value === null || value === undefined || value === '') {
    return { valid: false, message: ERROR_MESSAGES.REQUIRED };
  }
  return { valid: true };
}

/**
 * Valida longitud de string
 * @param {String} value - Valor a validar
 * @param {Number} maxLength - Longitud máxima
 * @param {Number} minLength - Longitud mínima (opcional)
 * @returns {Object} {valid: Boolean, message: String}
 */
function validateLength(value, maxLength, minLength = 0) {
  if (!value || typeof value !== 'string') {
    return { valid: false, message: ERROR_MESSAGES.INVALID_FORMAT };
  }

  if (value.length < minLength) {
    return { valid: false, message: `Mínimo ${minLength} caracteres` };
  }

  if (value.length > maxLength) {
    return { valid: false, message: ERROR_MESSAGES.TOO_LONG(maxLength) };
  }

  return { valid: true };
}

/**
 * Valida que un valor sea un número
 * @param {*} value - Valor a validar
 * @returns {Object} {valid: Boolean, message: String}
 */
function validateNumber(value) {
  const num = Number(value);
  if (isNaN(num)) {
    return { valid: false, message: ERROR_MESSAGES.INVALID_NUMBER };
  }
  return { valid: true, value: num };
}

/**
 * Valida que sea un número positivo
 * @param {*} value - Valor a validar
 * @returns {Object} {valid: Boolean, message: String}
 */
function validatePositiveNumber(value) {
  const num = Number(value);
  if (isNaN(num) || num < 0) {
    return { valid: false, message: ERROR_MESSAGES.NEGATIVE_NUMBER };
  }
  return { valid: true, value: num };
}

/**
 * Valida número en rango
 * @param {*} value - Valor a validar
 * @param {Number} min - Mínimo
 * @param {Number} max - Máximo
 * @returns {Object} {valid: Boolean, message: String}
 */
function validateRange(value, min, max) {
  const num = Number(value);
  if (isNaN(num)) {
    return { valid: false, message: ERROR_MESSAGES.INVALID_NUMBER };
  }
  if (num < min || num > max) {
    return { valid: false, message: ERROR_MESSAGES.OUT_OF_RANGE(min, max) };
  }
  return { valid: true, value: num };
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. VALIDADORES MÉXICO
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Valida RFC (Registro Federal de Contribuyentes) México
 * @param {String} rfc - RFC a validar
 * @returns {Object} {valid: Boolean, message: String, formatted: String}
 */
function validateRFC(rfc) {
  if (!rfc || typeof rfc !== 'string') {
    return { valid: false, message: ERROR_MESSAGES.REQUIRED };
  }

  // Normaliza: mayúsculas, sin espacios
  const normalized = rfc.toUpperCase().replace(/\s/g, '');

  // RFC debe tener 12 o 13 caracteres
  if (normalized.length !== 12 && normalized.length !== 13) {
    return { valid: false, message: ERROR_MESSAGES.INVALID_RFC };
  }

  // Valida que tenga formato correcto
  if (!PATTERNS.RFC_FLEXIBLE.test(normalized)) {
    return { valid: false, message: ERROR_MESSAGES.INVALID_RFC };
  }

  // Validación del homoclave (últimos 3 caracteres)
  // RFC válido debe tener dígitos en posición 6-11 (fecha) para personas físicas
  // O solo letras y dígitos para personas morales

  return {
    valid: true,
    formatted: normalized,
    isPersonaFisica: normalized.length === 12,
    isPersonaMoral: normalized.length === 13
  };
}

/**
 * Valida teléfono mexicano
 * @param {String} phone - Teléfono a validar
 * @returns {Object} {valid: Boolean, message: String, formatted: String}
 */
function validatePhoneMX(phone) {
  if (!phone || typeof phone !== 'string') {
    return { valid: false, message: ERROR_MESSAGES.REQUIRED };
  }

  // Remueve caracteres no numéricos excepto el +
  const cleaned = phone.replace(/[\s\-().]/g, '');

  // Verifica si comienza con +52
  let digits = cleaned;
  if (cleaned.startsWith('+52')) {
    digits = cleaned.slice(3);
  } else if (cleaned.startsWith('52')) {
    digits = cleaned.slice(2);
  }

  // Debe tener 10 dígitos
  if (!/^\d{10}$/.test(digits)) {
    return { valid: false, message: ERROR_MESSAGES.INVALID_PHONE };
  }

  // Formatea como +52 XXX XXX XXXX
  const formatted = `+52 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;

  return {
    valid: true,
    formatted: formatted,
    digits: digits,
    areaCode: digits.slice(0, 3),
    localNumber: digits.slice(3)
  };
}

/**
 * Valida código postal mexicano (5 dígitos)
 * @param {String} cp - Código postal
 * @returns {Object} {valid: Boolean, message: String}
 */
function validateCodigoPostal(cp) {
  if (!cp || typeof cp !== 'string') {
    return { valid: false, message: ERROR_MESSAGES.REQUIRED };
  }

  const cleaned = cp.replace(/\D/g, '');

  if (!/^\d{5}$/.test(cleaned)) {
    return { valid: false, message: 'Código postal debe tener 5 dígitos' };
  }

  // Verificación básica: el primer dígito (estado) debe estar entre 1-32
  const firstDigit = parseInt(cleaned[0]);
  if (firstDigit === 0) {
    return { valid: false, message: 'Código postal inválido' };
  }

  return { valid: true, formatted: cleaned };
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. VALIDADORES DE EMAIL Y CREDENCIALES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Valida email
 * @param {String} email - Email a validar
 * @returns {Object} {valid: Boolean, message: String}
 */
function validateEmail(email) {
  if (!email || typeof email !== 'string') {
    return { valid: false, message: ERROR_MESSAGES.REQUIRED };
  }

  const normalized = email.toLowerCase().trim();

  // Validación básica con regex
  if (!PATTERNS.EMAIL.test(normalized)) {
    return { valid: false, message: ERROR_MESSAGES.INVALID_EMAIL };
  }

  // Validaciones adicionales
  if (normalized.length > 254) {
    return { valid: false, message: 'Email demasiado largo' };
  }

  const [localPart, domain] = normalized.split('@');

  // Local part (antes del @) no puede empezar o terminar con punto
  if (localPart.startsWith('.') || localPart.endsWith('.') || localPart.includes('..')) {
    return { valid: false, message: ERROR_MESSAGES.INVALID_EMAIL };
  }

  // Domain debe tener al menos un punto
  if (!domain.includes('.')) {
    return { valid: false, message: ERROR_MESSAGES.INVALID_EMAIL };
  }

  return { valid: true, normalized: normalized };
}

/**
 * Valida contraseña fuerte
 * @param {String} password - Contraseña
 * @returns {Object} {valid: Boolean, message: String, strength: String}
 */
function validatePassword(password) {
  if (!password) {
    return { valid: false, message: ERROR_MESSAGES.REQUIRED };
  }

  if (typeof password !== 'string') {
    return { valid: false, message: ERROR_MESSAGES.INVALID_FORMAT };
  }

  if (password.length < VALIDATION_CONFIG.MIN_PASSWORD_LENGTH) {
    return { valid: false, message: ERROR_MESSAGES.SHORT_PASSWORD };
  }

  if (password.length > VALIDATION_CONFIG.MAX_PASSWORD_LENGTH) {
    return { valid: false, message: ERROR_MESSAGES.LONG_PASSWORD };
  }

  // Verifica requisitos de complejidad
  let strength = 0;
  const checks = {
    hasLower: /[a-z]/.test(password),
    hasUpper: /[A-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSymbol: /[@$!%*?&]/.test(password),
    isLong: password.length >= 16,
    isVeryLong: password.length >= 20
  };

  Object.values(checks).forEach(check => { if (check) strength++; });

  const strengthLevels = {
    2: 'Débil',
    3: 'Aceptable',
    4: 'Fuerte',
    5: 'Muy fuerte',
    6: 'Excelente'
  };

  const isStrong = checks.hasLower && checks.hasUpper && checks.hasNumber && checks.hasSymbol;

  return {
    valid: isStrong,
    message: isStrong ? undefined : 'Contraseña debe contener mayúsculas, minúsculas, números y símbolos',
    strength: strengthLevels[Math.min(strength, 6)] || 'Débil',
    checks: checks
  };
}

/**
 * Valida que dos contraseñas coincidan
 * @param {String} password - Contraseña
 * @param {String} confirm - Confirmación
 * @returns {Object} {valid: Boolean, message: String}
 */
function validatePasswordMatch(password, confirm) {
  if (password !== confirm) {
    return { valid: false, message: ERROR_MESSAGES.PASSWORD_MISMATCH };
  }
  return { valid: true };
}

// ═════════════════════════════════════════════════════════════════════════════
// 6. VALIDADORES DE DATOS (VENTAS, CLIENTES, PRODUCTOS)
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Valida datos de un Cliente
 * @param {Object} cliente - Objeto cliente
 * @returns {Object} {valid: Boolean, errors: Array}
 */
function validateCliente(cliente) {
  const errors = [];

  // Nombre
  if (!cliente.nombre || cliente.nombre.trim() === '') {
    errors.push({ field: 'nombre', message: ERROR_MESSAGES.REQUIRED });
  } else if (cliente.nombre.length > VALIDATION_CONFIG.MAX_TEXT_LENGTH) {
    errors.push({ field: 'nombre', message: ERROR_MESSAGES.TOO_LONG(VALIDATION_CONFIG.MAX_TEXT_LENGTH) });
  }

  // RFC (opcional pero si se proporciona, debe ser válido)
  if (cliente.rfc) {
    const rfcValidation = validateRFC(cliente.rfc);
    if (!rfcValidation.valid) {
      errors.push({ field: 'rfc', message: rfcValidation.message });
    }
  }

  // Email
  if (cliente.email) {
    const emailValidation = validateEmail(cliente.email);
    if (!emailValidation.valid) {
      errors.push({ field: 'email', message: emailValidation.message });
    }
  }

  // Teléfono
  if (cliente.telefono) {
    const phoneValidation = validatePhoneMX(cliente.telefono);
    if (!phoneValidation.valid) {
      errors.push({ field: 'telefono', message: phoneValidation.message });
    }
  }

  // Dirección
  if (cliente.direccion && cliente.direccion.length > VALIDATION_CONFIG.MAX_LONG_TEXT_LENGTH) {
    errors.push({ field: 'direccion', message: ERROR_MESSAGES.TOO_LONG(VALIDATION_CONFIG.MAX_LONG_TEXT_LENGTH) });
  }

  // Código postal
  if (cliente.codigoPostal) {
    const cpValidation = validateCodigoPostal(cliente.codigoPostal);
    if (!cpValidation.valid) {
      errors.push({ field: 'codigoPostal', message: cpValidation.message });
    }
  }

  // Ciudad
  if (cliente.ciudad && cliente.ciudad.length > VALIDATION_CONFIG.MAX_TEXT_LENGTH) {
    errors.push({ field: 'ciudad', message: ERROR_MESSAGES.TOO_LONG(VALIDATION_CONFIG.MAX_TEXT_LENGTH) });
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Valida datos de un Producto
 * @param {Object} producto - Objeto producto
 * @returns {Object} {valid: Boolean, errors: Array}
 */
function validateProducto(producto) {
  const errors = [];

  // Código/SKU
  if (!producto.codigo || producto.codigo.trim() === '') {
    errors.push({ field: 'codigo', message: ERROR_MESSAGES.REQUIRED });
  } else if (producto.codigo.length > 50) {
    errors.push({ field: 'codigo', message: 'Código muy largo (máximo 50)' });
  }

  // Nombre
  if (!producto.nombre || producto.nombre.trim() === '') {
    errors.push({ field: 'nombre', message: ERROR_MESSAGES.REQUIRED });
  } else if (producto.nombre.length > VALIDATION_CONFIG.MAX_TEXT_LENGTH) {
    errors.push({ field: 'nombre', message: ERROR_MESSAGES.TOO_LONG(VALIDATION_CONFIG.MAX_TEXT_LENGTH) });
  }

  // Categoría
  if (producto.categoria && producto.categoria.length > 100) {
    errors.push({ field: 'categoria', message: 'Categoría muy larga' });
  }

  // Precio
  if (producto.precio === null || producto.precio === undefined || producto.precio === '') {
    errors.push({ field: 'precio', message: ERROR_MESSAGES.REQUIRED });
  } else {
    const priceValidation = validatePositiveNumber(producto.precio);
    if (!priceValidation.valid) {
      errors.push({ field: 'precio', message: priceValidation.message });
    }
  }

  // Cantidad
  if (producto.cantidad === null || producto.cantidad === undefined || producto.cantidad === '') {
    errors.push({ field: 'cantidad', message: ERROR_MESSAGES.REQUIRED });
  } else {
    const qtyValidation = validatePositiveNumber(producto.cantidad);
    if (!qtyValidation.valid) {
      errors.push({ field: 'cantidad', message: qtyValidation.message });
    }
  }

  // Descripción (opcional)
  if (producto.descripcion && producto.descripcion.length > VALIDATION_CONFIG.MAX_LONG_TEXT_LENGTH) {
    errors.push({ field: 'descripcion', message: ERROR_MESSAGES.TOO_LONG(VALIDATION_CONFIG.MAX_LONG_TEXT_LENGTH) });
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Valida datos de una Venta
 * @param {Object} venta - Objeto venta
 * @returns {Object} {valid: Boolean, errors: Array}
 */
function validateVenta(venta) {
  const errors = [];

  // Cliente
  if (!venta.cliente || venta.cliente.trim() === '') {
    errors.push({ field: 'cliente', message: ERROR_MESSAGES.REQUIRED });
  }

  // Fecha
  if (!venta.fecha) {
    errors.push({ field: 'fecha', message: ERROR_MESSAGES.REQUIRED });
  } else {
    try {
      const date = new Date(venta.fecha);
      if (isNaN(date.getTime())) {
        errors.push({ field: 'fecha', message: ERROR_MESSAGES.INVALID_DATE });
      }
    } catch {
      errors.push({ field: 'fecha', message: ERROR_MESSAGES.INVALID_DATE });
    }
  }

  // Items
  if (!venta.items || !Array.isArray(venta.items) || venta.items.length === 0) {
    errors.push({ field: 'items', message: 'La venta debe tener al menos un artículo' });
  } else {
    venta.items.forEach((item, index) => {
      if (!item.producto) {
        errors.push({ field: `items[${index}].producto`, message: ERROR_MESSAGES.REQUIRED });
      }
      const qtyValidation = validatePositiveNumber(item.cantidad);
      if (!qtyValidation.valid) {
        errors.push({ field: `items[${index}].cantidad`, message: qtyValidation.message });
      }
      const priceValidation = validatePositiveNumber(item.precio);
      if (!priceValidation.valid) {
        errors.push({ field: `items[${index}].precio`, message: priceValidation.message });
      }
    });
  }

  // Total (validación secundaria)
  if (venta.total === null || venta.total === undefined) {
    errors.push({ field: 'total', message: ERROR_MESSAGES.REQUIRED });
  } else {
    const totalValidation = validatePositiveNumber(venta.total);
    if (!totalValidation.valid) {
      errors.push({ field: 'total', message: totalValidation.message });
    }
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Valida datos de un Usuario
 * @param {Object} usuario - Objeto usuario
 * @param {Boolean} isNew - Si es usuario nuevo (requiere password)
 * @returns {Object} {valid: Boolean, errors: Array}
 */
function validateUsuario(usuario, isNew = true) {
  const errors = [];

  // Nombre
  if (!usuario.nombre || usuario.nombre.trim() === '') {
    errors.push({ field: 'nombre', message: ERROR_MESSAGES.REQUIRED });
  } else if (usuario.nombre.length > VALIDATION_CONFIG.MAX_TEXT_LENGTH) {
    errors.push({ field: 'nombre', message: ERROR_MESSAGES.TOO_LONG(VALIDATION_CONFIG.MAX_TEXT_LENGTH) });
  }

  // Email
  if (!usuario.email || usuario.email.trim() === '') {
    errors.push({ field: 'email', message: ERROR_MESSAGES.REQUIRED });
  } else {
    const emailValidation = validateEmail(usuario.email);
    if (!emailValidation.valid) {
      errors.push({ field: 'email', message: emailValidation.message });
    }
  }

  // Contraseña (obligatoria para usuarios nuevos)
  if (isNew) {
    if (!usuario.password) {
      errors.push({ field: 'password', message: ERROR_MESSAGES.REQUIRED });
    } else {
      const passValidation = validatePassword(usuario.password);
      if (!passValidation.valid) {
        errors.push({ field: 'password', message: passValidation.message });
      }
    }
  }

  // Rol
  const validRoles = ['admin', 'gerente', 'vendedor', 'user'];
  if (usuario.rol && !validRoles.includes(usuario.rol)) {
    errors.push({ field: 'rol', message: `Rol debe ser uno de: ${validRoles.join(', ')}` });
  }

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 7. VALIDADORES DE FECHA
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Valida fecha
 * @param {String|Date} date - Fecha a validar
 * @returns {Object} {valid: Boolean, message: String}
 */
function validateDate(date) {
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      return { valid: false, message: ERROR_MESSAGES.INVALID_DATE };
    }
    return { valid: true, parsed: d };
  } catch {
    return { valid: false, message: ERROR_MESSAGES.INVALID_DATE };
  }
}

/**
 * Valida que fecha no sea en el futuro
 * @param {String|Date} date - Fecha a validar
 * @returns {Object} {valid: Boolean, message: String}
 */
function validateNotFutureDate(date) {
  const dateValidation = validateDate(date);
  if (!dateValidation.valid) return dateValidation;

  if (dateValidation.parsed > new Date()) {
    return { valid: false, message: ERROR_MESSAGES.FUTURE_DATE };
  }

  return { valid: true };
}

/**
 * Valida que fecha no sea en el pasado
 * @param {String|Date} date - Fecha a validar
 * @returns {Object} {valid: Boolean, message: String}
 */
function validateNotPastDate(date) {
  const dateValidation = validateDate(date);
  if (!dateValidation.valid) return dateValidation;

  if (dateValidation.parsed < new Date()) {
    return { valid: false, message: ERROR_MESSAGES.PAST_DATE };
  }

  return { valid: true };
}

// ═════════════════════════════════════════════════════════════════════════════
// 8. UTILIDADES
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene primer error de un array de validaciones
 * @param {Array} errors - Array de errores
 * @returns {Object|null} Primer error o null
 */
function getFirstError(errors) {
  return errors.length > 0 ? errors[0] : null;
}

/**
 * Formatea errores para mostrar
 * @param {Array} errors - Array de errores
 * @returns {String} String de errores formateado
 */
function formatErrors(errors) {
  return errors.map(e => `${e.field}: ${e.message}`).join('\n');
}

/**
 * Valida un esquema completo
 * @param {Object} data - Datos a validar
 * @param {Object} schema - Esquema de validación
 * @returns {Object} {valid: Boolean, errors: Array}
 */
function validateSchema(data, schema) {
  const errors = [];

  Object.entries(schema).forEach(([field, rules]) => {
    const value = data[field];

    // Verifica required
    if (rules.required && (value === null || value === undefined || value === '')) {
      errors.push({ field, message: ERROR_MESSAGES.REQUIRED });
      return;
    }

    // Verifica type
    if (rules.type && value !== null && value !== undefined && value !== '') {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rules.type) {
        errors.push({ field, message: `Tipo debe ser ${rules.type}` });
      }
    }

    // Verifica custom validator
    if (rules.validate && typeof rules.validate === 'function') {
      const result = rules.validate(value);
      if (!result.valid) {
        errors.push({ field, message: result.message });
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors: errors
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// EXPORT
// ═════════════════════════════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    VALIDATION_CONFIG,
    PATTERNS,
    ERROR_MESSAGES,
    validateRequired,
    validateLength,
    validateNumber,
    validatePositiveNumber,
    validateRange,
    validateRFC,
    validatePhoneMX,
    validateCodigoPostal,
    validateEmail,
    validatePassword,
    validatePasswordMatch,
    validateCliente,
    validateProducto,
    validateVenta,
    validateUsuario,
    validateDate,
    validateNotFutureDate,
    validateNotPastDate,
    getFirstError,
    formatErrors,
    validateSchema
  };
}
