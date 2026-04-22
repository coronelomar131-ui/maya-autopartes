/**
 * OneDrive Excel Auto-Sync Module
 * ════════════════════════════════════════════════════════════════
 * Sincronización bidireccional: Excel (OneDrive) ↔ App Facturas
 * Incluye: OAuth, delta queries, polling, mapeo de columnas
 *
 * Requisitos:
 * - @microsoft/msal-browser: ^3.0.0 (OAuth)
 * - exceljs: ^4.4.0 (Lectura/escritura Excel)
 * - axios: ^1.6.0 (HTTP requests)
 * - date-fns: ^2.30.0 (Date utilities)
 */

import axios from 'axios';
import XLSX from 'xlsx';

// ════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ════════════════════════════════════════════════════════════════

const CONFIG = {
  // Microsoft App Registration (Azure Portal)
  clientId: process.env.VITE_MS_CLIENT_ID || 'YOUR_CLIENT_ID_HERE',
  tenantId: 'common', // o tu tenant específico
  redirectUri: window.location.origin + '/auth-callback',

  // OneDrive
  oneDriveScope: 'Files.ReadWrite.All offline_access',

  // Excel Sync
  excelFileName: 'Facturas_Maya_Autopartes.xlsx',
  excelSheetName: 'Facturas',
  syncInterval: 300000, // 5 minutos
  deltaQueryInterval: 60000, // 1 minuto para cambios

  // Mapeo de columnas: Excel → App
  columnMapping: {
    'Número': 'numero',
    'Cliente': 'cliente',
    'Fecha': 'fecha',
    'Neto': 'neto',
    'IVA': 'iva',
    'Total': 'total',
    'Saldo': 'saldo',
    'Producto': 'producto',
    'Marca': 'marca',
    'Piezas': 'piezas',
    'OC': 'oc',
    'Reporte': 'reporte',
    'Guía': 'guia',
    'Link': 'link',
    'Estatus': 'estatus',
    'Días Vencidos': 'diasVencidos',
    'Fecha Pago': 'fechaPago',
    'Vendedor': 'vendedor'
  },

  // Inverso para actualizar Excel desde App
  reverseMapping: null // Se calcula en init()
};

// Calcular mapeo inverso
CONFIG.reverseMapping = Object.fromEntries(
  Object.entries(CONFIG.columnMapping).map(([k, v]) => [v, k])
);

// ════════════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ════════════════════════════════════════════════════════════════

const STATE = {
  accessToken: null,
  refreshToken: null,
  userId: null,
  driveItemId: null, // ID del archivo Excel en OneDrive
  deltaToken: null, // Para delta queries incremental
  lastSyncTime: null,
  syncInProgress: false,
  isOnline: navigator.onLine,
  pollIntervals: [],
  conflictQueue: []
};

// ════════════════════════════════════════════════════════════════
// 1. INICIALIZACIÓN & AUTENTICACIÓN
// ════════════════════════════════════════════════════════════════

/**
 * Inicializar autenticación OAuth 2.0 con Microsoft
 * Usa MSAL (Microsoft Authentication Library)
 */
async function initOneDriveAuth() {
  try {
    console.log('🔐 Iniciando autenticación Microsoft...');

    // Cargar tokens de storage
    const stored = localStorage.getItem('onedrive_auth');
    if (stored) {
      const auth = JSON.parse(stored);
      STATE.accessToken = auth.accessToken;
      STATE.refreshToken = auth.refreshToken;
      STATE.userId = auth.userId;

      // Validar si token expirado
      if (isTokenExpired(auth.expiresAt)) {
        console.log('⏰ Token expirado, refrescando...');
        await refreshAccessToken();
      } else {
        console.log('✅ Token válido cargado de storage');
        return true;
      }
    }

    // Si no hay token, iniciar OAuth flow
    return await startOAuthFlow();

  } catch (error) {
    console.error('❌ Error en autenticación:', error);
    return false;
  }
}

/**
 * Iniciar flujo OAuth 2.0 (Authorization Code Flow)
 */
async function startOAuthFlow() {
  try {
    console.log('🔄 Iniciando OAuth 2.0 flow...');

    // Generar state y PKCE code_challenge
    const state = generateRandomString(32);
    const codeVerifier = generateRandomString(64);
    const codeChallenge = await generatePKCEChallenge(codeVerifier);

    // Guardar en sessionStorage (temporal)
    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('oauth_code_verifier', codeVerifier);

    // URL de autorización
    const authUrl = new URL('https://login.microsoftonline.com/' + CONFIG.tenantId + '/oauth2/v2.0/authorize');
    authUrl.searchParams.set('client_id', CONFIG.clientId);
    authUrl.searchParams.set('redirect_uri', CONFIG.redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', CONFIG.oneDriveScope);
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('prompt', 'select_account');

    // Redirigir al login
    window.location.href = authUrl.toString();
    return false; // No continuar hasta que regrese del callback

  } catch (error) {
    console.error('❌ Error en OAuth flow:', error);
    return false;
  }
}

/**
 * Procesar callback después del login
 * Debe llamarse desde la página de callback (auth-callback.html)
 */
async function handleOAuthCallback(code) {
  try {
    console.log('🔄 Procesando OAuth callback...');

    // Validar state
    const state = new URLSearchParams(window.location.search).get('state');
    const savedState = sessionStorage.getItem('oauth_state');

    if (state !== savedState) {
      throw new Error('❌ OAuth state validation failed (CSRF attack?)');
    }

    const codeVerifier = sessionStorage.getItem('oauth_code_verifier');

    // Intercambiar código por token
    const response = await axios.post(
      `https://login.microsoftonline.com/${CONFIG.tenantId}/oauth2/v2.0/token`,
      {
        client_id: CONFIG.clientId,
        code,
        redirect_uri: CONFIG.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: codeVerifier,
        // client_secret: process.env.VITE_MS_CLIENT_SECRET // Solo si es app confidencial
      },
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    // Guardar tokens
    STATE.accessToken = response.data.access_token;
    STATE.refreshToken = response.data.refresh_token;
    const expiresIn = response.data.expires_in; // segundos
    const expiresAt = Date.now() + (expiresIn * 1000);

    // Obtener info del usuario
    const userInfo = await axios.get(
      'https://graph.microsoft.com/v1.0/me',
      { headers: { 'Authorization': `Bearer ${STATE.accessToken}` } }
    );
    STATE.userId = userInfo.data.id;

    // Guardar en localStorage
    localStorage.setItem('onedrive_auth', JSON.stringify({
      accessToken: STATE.accessToken,
      refreshToken: STATE.refreshToken,
      userId: STATE.userId,
      expiresAt
    }));

    // Limpiar sessionStorage
    sessionStorage.removeItem('oauth_state');
    sessionStorage.removeItem('oauth_code_verifier');

    console.log('✅ Autenticación exitosa:', STATE.userId);
    return true;

  } catch (error) {
    console.error('❌ Error en callback:', error);
    return false;
  }
}

/**
 * Refrescar access token usando refresh token
 */
async function refreshAccessToken() {
  try {
    if (!STATE.refreshToken) throw new Error('No refresh token available');

    const response = await axios.post(
      `https://login.microsoftonline.com/${CONFIG.tenantId}/oauth2/v2.0/token`,
      {
        client_id: CONFIG.clientId,
        refresh_token: STATE.refreshToken,
        grant_type: 'refresh_token',
        scope: CONFIG.oneDriveScope
      }
    );

    STATE.accessToken = response.data.access_token;
    const expiresAt = Date.now() + (response.data.expires_in * 1000);

    // Actualizar storage
    const auth = JSON.parse(localStorage.getItem('onedrive_auth'));
    auth.accessToken = STATE.accessToken;
    auth.expiresAt = expiresAt;
    localStorage.setItem('onedrive_auth', JSON.stringify(auth));

    console.log('✅ Token refrescado');
    return true;

  } catch (error) {
    console.error('❌ Error refrescando token:', error);
    // Limpiar auth y pedir login nuevamente
    localStorage.removeItem('onedrive_auth');
    STATE.accessToken = null;
    return false;
  }
}

// ════════════════════════════════════════════════════════════════
// 2. LECTURA DE EXCEL (OneDrive → App)
// ════════════════════════════════════════════════════════════════

/**
 * Encontrar archivo Excel en OneDrive
 */
async function findExcelFile() {
  try {
    console.log('🔍 Buscando Excel en OneDrive...');

    // Buscar por nombre
    const response = await graphApi(
      `/me/drive/root/children?$filter=name eq '${CONFIG.excelFileName}'`
    );

    if (!response.value || response.value.length === 0) {
      console.warn('⚠️ Archivo Excel no encontrado en OneDrive');
      return null;
    }

    STATE.driveItemId = response.value[0].id;
    console.log('✅ Excel encontrado:', STATE.driveItemId);
    return STATE.driveItemId;

  } catch (error) {
    console.error('❌ Error buscando Excel:', error);
    return null;
  }
}

/**
 * Descargar Excel completo desde OneDrive
 */
async function downloadExcelFromOneDrive() {
  try {
    if (!STATE.driveItemId) {
      STATE.driveItemId = await findExcelFile();
    }
    if (!STATE.driveItemId) throw new Error('Excel file not found');

    console.log('📥 Descargando Excel desde OneDrive...');

    // Obtener URL de descarga
    const response = await graphApi(
      `/me/drive/items/${STATE.driveItemId}?$select=@microsoft.graph.downloadUrl`
    );

    if (!response['@microsoft.graph.downloadUrl']) {
      throw new Error('No download URL available');
    }

    // Descargar archivo
    const fileResponse = await axios.get(
      response['@microsoft.graph.downloadUrl'],
      { responseType: 'arraybuffer' }
    );

    console.log('✅ Excel descargado:', fileResponse.data.length, 'bytes');
    return fileResponse.data;

  } catch (error) {
    console.error('❌ Error descargando Excel:', error);
    return null;
  }
}

/**
 * Parsear Excel y convertir a facturas
 */
function parseExcelToFacturas(buffer) {
  try {
    console.log('📖 Parseando Excel...');

    // Leer Excel
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[CONFIG.excelSheetName];
    if (!worksheet) throw new Error(`Sheet "${CONFIG.excelSheetName}" not found`);

    const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    // Convertir filas a facturas mapeando columnas
    const facturas = rows.map(row => {
      const factura = {};

      Object.entries(CONFIG.columnMapping).forEach(([excelCol, appField]) => {
        const value = row[excelCol] || '';

        // Conversión de tipos
        if (['neto', 'iva', 'total', 'saldo'].includes(appField)) {
          factura[appField] = parseFloat(value) || 0;
        } else if (['fecha', 'fechaPago'].includes(appField)) {
          factura[appField] = formatDate(value);
        } else if (appField === 'diasVencidos') {
          factura[appField] = parseInt(value) || 0;
        } else {
          factura[appField] = String(value).trim();
        }
      });

      // Agregar timestamp y hash para detección de cambios
      factura._syncTimestamp = new Date().toISOString();
      factura._hash = hashObject(factura);

      return factura;
    });

    console.log('✅ Parseadas', facturas.length, 'facturas');
    return facturas;

  } catch (error) {
    console.error('❌ Error parseando Excel:', error);
    return [];
  }
}

// ════════════════════════════════════════════════════════════════
// 3. DELTA SYNC (Cambios Incrementales)
// ════════════════════════════════════════════════════════════════

/**
 * Obtener cambios desde último sync usando delta queries
 * Microsoft Graph API permite obtener solo lo que cambió
 */
async function getDeltaChanges() {
  try {
    if (!STATE.driveItemId) {
      STATE.driveItemId = await findExcelFile();
    }

    console.log('🔄 Consultando cambios delta...');

    // Primera vez: sin deltaToken
    let url = `/me/drive/items/${STATE.driveItemId}/delta`;
    if (STATE.deltaToken) {
      url += `?token=${STATE.deltaToken}`;
    }

    const response = await graphApi(url);

    // Guardar nuevo delta token para próxima consulta
    if (response['@odata.deltaLink']) {
      STATE.deltaToken = response['@odata.deltaLink'];
      localStorage.setItem('onedrive_delta_token', STATE.deltaToken);
    }

    // Extraer cambios
    const changes = response.value || [];
    console.log('📊 Cambios detectados:', changes.length);

    return changes;

  } catch (error) {
    console.error('❌ Error en delta query:', error);
    return [];
  }
}

// ════════════════════════════════════════════════════════════════
// 4. SINCRONIZACIÓN PRINCIPAL
// ════════════════════════════════════════════════════════════════

/**
 * Sincronización principal: Excel → App (OneDrive → LocalStorage)
 */
async function syncExcelFacturas() {
  try {
    if (STATE.syncInProgress) {
      console.log('⏳ Sync ya en progreso, ignorando...');
      return;
    }

    STATE.syncInProgress = true;
    console.log('🔄 Iniciando sync Excel → App...');

    // Verificar autenticación
    if (!STATE.accessToken) {
      console.log('🔐 Requiere autenticación');
      const authenticated = await initOneDriveAuth();
      if (!authenticated) return;
    }

    // Refrescar token si está por expirar
    const auth = JSON.parse(localStorage.getItem('onedrive_auth'));
    if (auth && isTokenExpired(auth.expiresAt)) {
      await refreshAccessToken();
    }

    // Descargar Excel
    const buffer = await downloadExcelFromOneDrive();
    if (!buffer) throw new Error('Failed to download Excel');

    // Parsear a facturas
    const newFacturas = parseExcelToFacturas(buffer);
    if (newFacturas.length === 0) throw new Error('No facturas parsed');

    // Obtener facturas actuales de storage
    const currentFacturas = JSON.parse(localStorage.getItem('ma4_v') || '[]');

    // Detectar cambios y aplicar
    const changes = detectChanges(currentFacturas, newFacturas);
    if (changes.added > 0 || changes.modified > 0 || changes.deleted > 0) {
      console.log('📝 Cambios detectados:', changes);

      // Actualizar storage
      localStorage.setItem('ma4_v', JSON.stringify(newFacturas));

      // Notificar a la UI que hay cambios
      window.dispatchEvent(new CustomEvent('onedrive:sync', {
        detail: { facturas: newFacturas, changes }
      }));
    }

    STATE.lastSyncTime = new Date().toISOString();
    localStorage.setItem('onedrive_last_sync', STATE.lastSyncTime);

    console.log('✅ Sync completado:', STATE.lastSyncTime);

  } catch (error) {
    console.error('❌ Error en sync:', error);
    window.dispatchEvent(new CustomEvent('onedrive:sync-error', {
      detail: { error: error.message }
    }));
  } finally {
    STATE.syncInProgress = false;
  }
}

/**
 * Monitorear cambios en Excel con polling
 */
function monitorExcelChanges() {
  try {
    console.log('👁️  Iniciando monitor de cambios...');

    // Poll a intervalo regular
    const pollInterval = setInterval(async () => {
      if (!STATE.isOnline) {
        console.log('📡 Offline, saltando sync');
        return;
      }

      await syncExcelFacturas();
    }, CONFIG.deltaQueryInterval);

    STATE.pollIntervals.push(pollInterval);

    // Monitorear cambios de conectividad
    window.addEventListener('online', () => {
      STATE.isOnline = true;
      console.log('📡 Online - sincronizando...');
      syncExcelFacturas();
    });

    window.addEventListener('offline', () => {
      STATE.isOnline = false;
      console.log('📡 Offline - en espera de conexión');
    });

    // First sync inmediato
    syncExcelFacturas();

  } catch (error) {
    console.error('❌ Error iniciando monitor:', error);
  }
}

/**
 * Detener monitoreo
 */
function stopMonitorExcelChanges() {
  STATE.pollIntervals.forEach(id => clearInterval(id));
  STATE.pollIntervals = [];
  console.log('⏹️  Monitor detenido');
}

// ════════════════════════════════════════════════════════════════
// 5. SINCRONIZACIÓN INVERSA (App → Excel)
// ════════════════════════════════════════════════════════════════

/**
 * Subir cambios a Excel en OneDrive (App → Excel)
 */
async function pushChangesToExcel(facturasModificadas) {
  try {
    console.log('📤 Subiendo cambios a Excel...');

    if (!STATE.driveItemId) {
      STATE.driveItemId = await findExcelFile();
    }
    if (!STATE.driveItemId) throw new Error('Excel file not found');

    // Descargar Excel actual
    const buffer = await downloadExcelFromOneDrive();
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const worksheet = workbook.Sheets[CONFIG.excelSheetName];

    // Convertir facturas a filas
    const excelRows = facturasModificadas.map(factura => {
      const row = {};
      Object.entries(CONFIG.reverseMapping).forEach(([appField, excelCol]) => {
        row[excelCol] = factura[appField] || '';
      });
      return row;
    });

    // Actualizar hoja
    const newSheet = XLSX.utils.json_to_sheet(excelRows);
    workbook.Sheets[CONFIG.excelSheetName] = newSheet;

    // Convertir a buffer
    const updatedBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Subir a OneDrive
    await uploadFileToOneDrive(STATE.driveItemId, updatedBuffer);

    console.log('✅ Cambios subidos a Excel');

  } catch (error) {
    console.error('❌ Error subiendo cambios:', error);
    STATE.conflictQueue.push({
      facturas: facturasModificadas,
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
}

/**
 * Subir archivo a OneDrive
 */
async function uploadFileToOneDrive(driveItemId, buffer) {
  try {
    const response = await graphApi(
      `/me/drive/items/${driveItemId}/content`,
      'PUT',
      buffer,
      { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
    );

    console.log('✅ Archivo subido');
    return response;

  } catch (error) {
    console.error('❌ Error subiendo archivo:', error);
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════
// 6. MANEJO DE CONFLICTOS
// ════════════════════════════════════════════════════════════════

/**
 * Resolver conflictos de sincronización
 * Estrategia: Last-Write-Wins (LWW) o puede ser customizada
 */
function resolveConflict(appVersion, excelVersion, strategy = 'app-wins') {
  console.log('⚔️  Resolviendo conflicto...');

  if (strategy === 'app-wins') {
    return appVersion;
  } else if (strategy === 'excel-wins') {
    return excelVersion;
  } else if (strategy === 'merge') {
    // Fusionar inteligentemente
    return {
      ...excelVersion,
      ...appVersion,
      _conflict: true,
      _merged: true
    };
  } else if (strategy === 'timestamp') {
    // Más reciente gana
    const appTime = new Date(appVersion._syncTimestamp || 0).getTime();
    const excelTime = new Date(excelVersion._syncTimestamp || 0).getTime();
    return appTime > excelTime ? appVersion : excelVersion;
  }
}

/**
 * Procesar cola de conflictos cuando hay conexión
 */
async function processConflictQueue() {
  while (STATE.conflictQueue.length > 0) {
    const conflict = STATE.conflictQueue.shift();

    try {
      console.log('🔄 Reintentando sync de conflicto...');
      await pushChangesToExcel(conflict.facturas);
    } catch (error) {
      console.error('❌ Conflicto aún sin resolver:', error);
      STATE.conflictQueue.push(conflict); // Re-añadir a la cola
      break;
    }
  }
}

// ════════════════════════════════════════════════════════════════
// 7. UTILIDADES HELPERS
// ════════════════════════════════════════════════════════════════

/**
 * Llamar Microsoft Graph API
 */
async function graphApi(endpoint, method = 'GET', data = null, headers = {}) {
  try {
    // Refrescar token si expira pronto
    const auth = JSON.parse(localStorage.getItem('onedrive_auth'));
    if (auth && isTokenExpired(auth.expiresAt, 300000)) { // 5 min antes
      await refreshAccessToken();
    }

    const config = {
      method,
      url: 'https://graph.microsoft.com/v1.0' + endpoint,
      headers: {
        'Authorization': `Bearer ${STATE.accessToken}`,
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) config.data = data;

    const response = await axios(config);
    return response.data;

  } catch (error) {
    if (error.response?.status === 401) {
      // Token expirado
      await refreshAccessToken();
      return graphApi(endpoint, method, data, headers); // Reintentar
    }
    throw error;
  }
}

/**
 * Detectar cambios entre dos arrays de facturas
 */
function detectChanges(oldFacturas, newFacturas) {
  const oldMap = new Map(oldFacturas.map(f => [f.numero, f]));
  const newMap = new Map(newFacturas.map(f => [f.numero, f]));

  let added = 0, modified = 0, deleted = 0;

  // Nuevas
  newMap.forEach((factura, numero) => {
    if (!oldMap.has(numero)) added++;
    else if (hashObject(oldMap.get(numero)) !== hashObject(factura)) modified++;
  });

  // Eliminadas
  oldMap.forEach((factura, numero) => {
    if (!newMap.has(numero)) deleted++;
  });

  return { added, modified, deleted };
}

/**
 * Generar hash de objeto para comparación
 */
function hashObject(obj) {
  const str = JSON.stringify(obj);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

/**
 * Validar si token está expirado
 */
function isTokenExpired(expiresAt, buffer = 0) {
  return !expiresAt || (Date.now() + buffer) > expiresAt;
}

/**
 * Generar string aleatorio para OAuth
 */
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  let result = '';
  const values = new Uint8Array(length);
  crypto.getRandomValues(values);
  for (let i = 0; i < length; i++) {
    result += chars[values[i] % chars.length];
  }
  return result;
}

/**
 * Generar PKCE challenge
 */
async function generatePKCEChallenge(codeVerifier) {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hash));
  const hashString = hashArray.map(b => String.fromCharCode(b)).join('');
  return btoa(hashString).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Formatear fecha
 */
function formatDate(dateInput) {
  if (!dateInput) return '';
  try {
    const date = new Date(dateInput);
    return date.toISOString().split('T')[0]; // YYYY-MM-DD
  } catch (e) {
    return String(dateInput);
  }
}

/**
 * Logout (limpiar tokens)
 */
function logout() {
  localStorage.removeItem('onedrive_auth');
  localStorage.removeItem('onedrive_delta_token');
  localStorage.removeItem('onedrive_last_sync');
  STATE.accessToken = null;
  STATE.refreshToken = null;
  STATE.userId = null;
  stopMonitorExcelChanges();
  console.log('🚪 Sesión cerrada');
}

// ════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════

export {
  // Auth
  initOneDriveAuth,
  startOAuthFlow,
  handleOAuthCallback,
  refreshAccessToken,
  logout,

  // Lectura
  findExcelFile,
  downloadExcelFromOneDrive,
  parseExcelToFacturas,

  // Sync
  syncExcelFacturas,
  monitorExcelChanges,
  stopMonitorExcelChanges,
  getDeltaChanges,

  // Escritura
  pushChangesToExcel,
  uploadFileToOneDrive,

  // Conflictos
  resolveConflict,
  processConflictQueue,

  // Utilities
  CONFIG,
  STATE
};
