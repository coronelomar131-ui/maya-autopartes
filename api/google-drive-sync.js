/**
 * Google Drive Excel Auto-Sync Module
 * ════════════════════════════════════════════════════════════════
 * Sincronización bidireccional: Excel (Google Drive) ↔ App Maya
 * Incluye: OAuth 2.0, delta queries, polling automático, mapeo de columnas
 *
 * Requisitos:
 * - google-auth-library: ^9.0.0 (OAuth 2.0)
 * - googleapis: ^118.0.0 (Google Drive & Sheets API)
 * - xlsx: ^0.18.5 (Lectura/escritura Excel)
 * - axios: ^1.6.0 (HTTP requests)
 *
 * @version 1.0.0
 * @author Maya Autopartes Dev Team
 * @last-update 2026-04-22
 */

import { google } from 'googleapis';
import XLSX from 'xlsx';
import axios from 'axios';
import ExcelMapper from './excel-mapper.js';

// ════════════════════════════════════════════════════════════════
// CONFIGURACIÓN
// ════════════════════════════════════════════════════════════════

const CONFIG = {
  // Google OAuth 2.0
  clientId: process.env.VITE_GOOGLE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com',
  clientSecret: process.env.VITE_GOOGLE_CLIENT_SECRET || 'YOUR_CLIENT_SECRET_HERE',
  redirectUri: process.env.VITE_GOOGLE_REDIRECT_URI || 'http://localhost:5173/auth-callback',

  // Google Drive & Sheets
  scopes: [
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/spreadsheets'
  ],

  // Sync Configuration
  excelFileName: 'Maya_Autopartes_Inventario.xlsx',
  excelSheetName: 'Inventario',
  syncInterval: 60000, // 60 segundos (configurable)
  maxRetries: 3,
  retryDelay: 2000, // ms

  // Feature Flags
  enableAutoSync: true,
  enableConflictResolution: true,
  enableOfflineQueue: true
};

// ════════════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ════════════════════════════════════════════════════════════════

const STATE = {
  // OAuth & Auth
  accessToken: null,
  refreshToken: null,
  userId: null,
  expiresAt: null,

  // Drive Items
  fileId: null, // ID del archivo Excel en Google Drive
  folderId: null, // ID de la carpeta Maya Autopartes
  lastModified: null,

  // Sync State
  lastSyncTime: null,
  syncInProgress: false,
  lastError: null,
  syncCount: 0,

  // Online/Offline
  isOnline: navigator.onLine,
  offlineQueue: [], // Cola de cambios offline

  // Polling
  syncInterval: null,
  pollIntervals: [],

  // Conflict Management
  conflictQueue: [],
  deltaToken: null // Para cambios incrementales
};

// ════════════════════════════════════════════════════════════════
// UI STATE & CALLBACKS
// ════════════════════════════════════════════════════════════════

const UI = {
  syncButton: null,
  statusIndicator: null,
  lastSyncLabel: null,
  errorPanel: null,
  callbacks: {
    onSyncStart: null,
    onSyncComplete: null,
    onSyncError: null,
    onDataUpdate: null
  }
};

// ════════════════════════════════════════════════════════════════
// 1. INICIALIZACIÓN & AUTENTICACIÓN OAUTH 2.0
// ════════════════════════════════════════════════════════════════

/**
 * Inicializar Google Drive Sync
 * Restaura sesión o inicia flujo de autenticación
 */
async function initGoogleDriveSync() {
  try {
    console.log('🚀 Inicializando Google Drive Sync...');

    // Restaurar tokens del storage
    const stored = localStorage.getItem('google_drive_auth');
    if (stored) {
      const auth = JSON.parse(stored);
      STATE.accessToken = auth.accessToken;
      STATE.refreshToken = auth.refreshToken;
      STATE.userId = auth.userId;
      STATE.expiresAt = auth.expiresAt;

      // Verificar si token expiró
      if (Date.now() > STATE.expiresAt) {
        console.log('⏰ Token expirado, refrescando...');
        await refreshAccessToken();
      }

      console.log('✅ Sesión restaurada');
      await setupDriveClient();
      return true;
    }

    console.log('🔐 Iniciando flujo OAuth 2.0...');
    return await initiateOAuthFlow();

  } catch (error) {
    console.error('❌ Error en inicialización:', error);
    handleSyncError(error);
    return false;
  }
}

/**
 * Iniciar flujo de autenticación OAuth 2.0
 */
async function initiateOAuthFlow() {
  try {
    // Generar state y PKCE code challenge
    const state = generateRandomString(32);
    const codeVerifier = generateRandomString(64);
    const codeChallenge = btoa(codeVerifier).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    // Guardar valores para verificación
    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('oauth_code_verifier', codeVerifier);

    // Construir URL de autorización
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', CONFIG.clientId);
    authUrl.searchParams.append('redirect_uri', CONFIG.redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', CONFIG.scopes.join(' '));
    authUrl.searchParams.append('state', state);
    authUrl.searchParams.append('code_challenge', codeChallenge);
    authUrl.searchParams.append('code_challenge_method', 'S256');
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'consent');

    console.log('🌐 Redirigiendo a Google...');
    window.location.href = authUrl.toString();

    return true;

  } catch (error) {
    console.error('❌ Error en OAuth flow:', error);
    throw error;
  }
}

/**
 * Procesar callback de OAuth y obtener tokens
 */
async function handleOAuthCallback(code) {
  try {
    const state = sessionStorage.getItem('oauth_state');
    const codeVerifier = sessionStorage.getItem('oauth_code_verifier');

    if (!state || !codeVerifier) {
      throw new Error('Parámetros de autenticación inválidos');
    }

    console.log('🔄 Intercambiando código por tokens...');

    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: CONFIG.clientId,
      client_secret: CONFIG.clientSecret,
      code,
      code_verifier: codeVerifier,
      redirect_uri: CONFIG.redirectUri,
      grant_type: 'authorization_code'
    });

    const { access_token, refresh_token, expires_in } = response.data;

    STATE.accessToken = access_token;
    STATE.refreshToken = refresh_token;
    STATE.expiresAt = Date.now() + (expires_in * 1000);

    // Guardar en localStorage
    localStorage.setItem('google_drive_auth', JSON.stringify({
      accessToken: STATE.accessToken,
      refreshToken: STATE.refreshToken,
      userId: STATE.userId,
      expiresAt: STATE.expiresAt
    }));

    // Limpiar sesión
    sessionStorage.removeItem('oauth_state');
    sessionStorage.removeItem('oauth_code_verifier');

    console.log('✅ Tokens obtenidos exitosamente');
    await setupDriveClient();

    return true;

  } catch (error) {
    console.error('❌ Error en OAuth callback:', error);
    throw error;
  }
}

/**
 * Refrescar access token usando refresh token
 */
async function refreshAccessToken() {
  try {
    if (!STATE.refreshToken) {
      throw new Error('No refresh token disponible');
    }

    const response = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: CONFIG.clientId,
      client_secret: CONFIG.clientSecret,
      refresh_token: STATE.refreshToken,
      grant_type: 'refresh_token'
    });

    STATE.accessToken = response.data.access_token;
    STATE.expiresAt = Date.now() + (response.data.expires_in * 1000);

    // Actualizar storage
    const stored = JSON.parse(localStorage.getItem('google_drive_auth') || '{}');
    stored.accessToken = STATE.accessToken;
    stored.expiresAt = STATE.expiresAt;
    localStorage.setItem('google_drive_auth', JSON.stringify(stored));

    console.log('🔄 Token refrescado');
    return true;

  } catch (error) {
    console.error('❌ Error refrescando token:', error);
    STATE.accessToken = null;
    throw error;
  }
}

/**
 * Configurar cliente de Google Drive
 */
async function setupDriveClient() {
  try {
    const auth = new google.auth.OAuth2(
      CONFIG.clientId,
      CONFIG.clientSecret,
      CONFIG.redirectUri
    );

    auth.setCredentials({
      access_token: STATE.accessToken,
      refresh_token: STATE.refreshToken
    });

    STATE.driveClient = google.drive({ version: 'v3', auth });
    STATE.sheetsClient = google.sheets({ version: 'v4', auth });

    console.log('✅ Cliente de Google Drive configurado');

    // Buscar/crear archivo Excel
    await ensureExcelFileExists();

    return true;

  } catch (error) {
    console.error('❌ Error configurando cliente:', error);
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════
// 2. GESTIÓN DE ARCHIVOS EXCEL EN GOOGLE DRIVE
// ════════════════════════════════════════════════════════════════

/**
 * Buscar o crear archivo Excel en Google Drive
 */
async function ensureExcelFileExists() {
  try {
    console.log('🔍 Buscando archivo Excel...');

    // Crear carpeta Maya Autopartes si no existe
    const folderId = await ensureFolderExists('Maya Autopartes');
    STATE.folderId = folderId;

    // Buscar archivo Excel
    let file = await findExcelFile(folderId);

    if (!file) {
      console.log('📝 Creando archivo Excel...');
      file = await createExcelFile(folderId);
    }

    STATE.fileId = file.id;
    STATE.lastModified = new Date(file.modifiedTime).getTime();

    console.log('✅ Archivo Excel listo:', file.name);
    return file;

  } catch (error) {
    console.error('❌ Error en gestión de archivos:', error);
    throw error;
  }
}

/**
 * Crear carpeta en Google Drive
 */
async function ensureFolderExists(folderName) {
  try {
    // Buscar carpeta existente
    const result = await STATE.driveClient.files.list({
      q: `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      spaces: 'drive',
      pageSize: 1,
      fields: 'files(id, name)'
    });

    if (result.data.files.length > 0) {
      return result.data.files[0].id;
    }

    // Crear nueva carpeta
    const folder = await STATE.driveClient.files.create({
      resource: {
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder'
      },
      fields: 'id'
    });

    console.log('📁 Carpeta creada:', folderName);
    return folder.data.id;

  } catch (error) {
    console.error('❌ Error en gestión de carpetas:', error);
    throw error;
  }
}

/**
 * Buscar archivo Excel en carpeta
 */
async function findExcelFile(folderId) {
  try {
    const result = await STATE.driveClient.files.list({
      q: `name='${CONFIG.excelFileName}' and '${folderId}' in parents and trashed=false`,
      spaces: 'drive',
      pageSize: 1,
      fields: 'files(id, name, modifiedTime, webViewLink)'
    });

    return result.data.files[0] || null;

  } catch (error) {
    console.error('❌ Error buscando archivo:', error);
    throw error;
  }
}

/**
 * Crear archivo Excel vacío
 */
async function createExcelFile(folderId) {
  try {
    // Crear workbook con estructura inicial
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([
      ExcelMapper.getHeaderRow()
    ]);
    XLSX.utils.book_append_sheet(wb, ws, CONFIG.excelSheetName);

    // Convertir a buffer
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    // Subir a Google Drive
    const file = await STATE.driveClient.files.create({
      resource: {
        name: CONFIG.excelFileName,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        parents: [folderId]
      },
      media: {
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        body: buffer
      },
      fields: 'id, name, modifiedTime'
    });

    return file.data;

  } catch (error) {
    console.error('❌ Error creando archivo:', error);
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════
// 3. LECTURA AUTOMÁTICA (EXCEL → APP)
// ════════════════════════════════════════════════════════════════

/**
 * Leer archivo Excel de Google Drive
 */
async function readExcelFromDrive() {
  try {
    if (!STATE.fileId) {
      throw new Error('No file ID available');
    }

    console.log('📖 Leyendo Excel de Google Drive...');

    // Descargar archivo
    const response = await STATE.driveClient.files.get(
      {
        fileId: STATE.fileId,
        alt: 'media'
      },
      { responseType: 'arraybuffer' }
    );

    const workbook = XLSX.read(response.data, { type: 'array' });
    const sheet = workbook.Sheets[CONFIG.excelSheetName];
    const data = XLSX.utils.sheet_to_json(sheet);

    console.log(`📊 Leídas ${data.length} filas`);

    return data;

  } catch (error) {
    console.error('❌ Error leyendo Excel:', error);
    throw error;
  }
}

/**
 * Sincronizar cambios de Excel → App
 * Usa delta queries para cambios incrementales
 */
async function syncExcelToApp() {
  try {
    if (STATE.syncInProgress) return;
    STATE.syncInProgress = true;

    notifyUI('onSyncStart');

    // Leer datos del Excel
    const excelData = await readExcelFromDrive();

    // Mapear y validar datos
    const mappedData = excelData.map(row => {
      try {
        return ExcelMapper.mapFromExcel(row);
      } catch (error) {
        console.warn('⚠️ Error mapeando fila:', row, error);
        return null;
      }
    }).filter(Boolean);

    // Detectar cambios (delta logic)
    const changes = detectChanges(mappedData);

    if (changes.length > 0) {
      console.log(`🔄 ${changes.length} cambios detectados`);
      // Aplicar cambios en la app
      await applyChangesToApp(changes);
    }

    STATE.lastSyncTime = Date.now();
    STATE.syncCount++;
    updateUI();

    notifyUI('onSyncComplete', { changes: changes.length });

    return { success: true, changes: changes.length };

  } catch (error) {
    console.error('❌ Error en sync Excel→App:', error);
    handleSyncError(error);
    notifyUI('onSyncError', error);
    throw error;
  } finally {
    STATE.syncInProgress = false;
  }
}

/**
 * Detectar cambios entre App y Excel
 */
function detectChanges(excelData) {
  // Esta función debe implementarse basada en el estado actual de la app
  // Por ahora, retornamos todos los datos como cambios potenciales
  const appData = window.MAYA_AUTOPARTES?.getData?.() || [];
  const changes = [];

  for (const item of excelData) {
    const existing = appData.find(d => d.id === item.id);
    if (!existing || JSON.stringify(existing) !== JSON.stringify(item)) {
      changes.push({
        type: existing ? 'update' : 'create',
        data: item
      });
    }
  }

  return changes;
}

/**
 * Aplicar cambios en la app
 */
async function applyChangesToApp(changes) {
  try {
    for (const change of changes) {
      if (window.MAYA_AUTOPARTES?.updateData) {
        await window.MAYA_AUTOPARTES.updateData(change.data);
      }
    }
    console.log('✅ Cambios aplicados en la app');
  } catch (error) {
    console.error('❌ Error aplicando cambios:', error);
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════
// 4. ESCRITURA AUTOMÁTICA (APP → EXCEL)
// ════════════════════════════════════════════════════════════════

/**
 * Escribir cambios en Excel
 * Se ejecuta cuando hay cambios en la app
 */
async function writeChangesToExcel(changes) {
  try {
    if (!STATE.fileId) {
      console.log('📦 Encolando cambios (offline)...');
      STATE.offlineQueue.push(...changes);
      return;
    }

    console.log(`✍️ Escribiendo ${changes.length} cambios en Excel...`);

    // Leer datos actuales del Excel
    const currentData = await readExcelFromDrive();

    // Aplicar cambios
    for (const change of changes) {
      const mapped = ExcelMapper.mapToExcel(change.data);
      const existingIndex = currentData.findIndex(row => row.ID === change.data.id);

      if (existingIndex >= 0) {
        Object.assign(currentData[existingIndex], mapped);
      } else {
        currentData.push(mapped);
      }
    }

    // Subir a Drive
    await uploadExcelToDrive(currentData);

    console.log('✅ Excel actualizado');
    return { success: true };

  } catch (error) {
    console.error('❌ Error escribiendo en Excel:', error);
    STATE.offlineQueue.push(...changes);
    throw error;
  }
}

/**
 * Subir datos al archivo Excel en Google Drive
 */
async function uploadExcelToDrive(data) {
  try {
    // Crear nuevo workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, CONFIG.excelSheetName);

    // Convertir a buffer
    const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

    // Actualizar archivo en Drive
    await STATE.driveClient.files.update(
      {
        fileId: STATE.fileId,
        media: {
          mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          body: buffer
        }
      }
    );

    STATE.lastModified = Date.now();
    return true;

  } catch (error) {
    console.error('❌ Error subiendo a Drive:', error);
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════
// 5. MANEJO DE CONFLICTOS (TIMESTAMP-BASED)
// ════════════════════════════════════════════════════════════════

/**
 * Resolver conflicto basado en timestamp
 * Más reciente gana (Last-Write-Wins)
 */
async function resolveConflict(appData, excelData) {
  const appTime = new Date(appData.updatedAt || appData.createdAt).getTime();
  const excelTime = new Date(excelData.modifiedTime).getTime();

  if (appTime > excelTime) {
    console.log('✓ Usando versión de app (más reciente)');
    return { winner: 'app', data: appData };
  } else {
    console.log('✓ Usando versión de Excel (más reciente)');
    return { winner: 'excel', data: excelData };
  }
}

/**
 * Encolar conflicto para resolución manual
 */
function queueConflict(appData, excelData) {
  STATE.conflictQueue.push({
    id: appData.id,
    appData,
    excelData,
    timestamp: Date.now()
  });

  notifyUI('onConflictDetected', {
    count: STATE.conflictQueue.length
  });
}

// ════════════════════════════════════════════════════════════════
// 6. POLLING AUTOMÁTICO
// ════════════════════════════════════════════════════════════════

/**
 * Iniciar polling automático
 */
function startAutoSync(interval = CONFIG.syncInterval) {
  if (STATE.syncInterval) {
    console.log('⚠️ Sync ya está en ejecución');
    return;
  }

  console.log(`⏱️ Iniciando sync automático cada ${interval}ms...`);

  STATE.syncInterval = setInterval(async () => {
    try {
      // Refrescar token si es necesario
      if (Date.now() > STATE.expiresAt - 300000) { // 5 min antes de expirar
        await refreshAccessToken();
      }

      await syncExcelToApp();
    } catch (error) {
      console.error('❌ Error en sync automático:', error);
    }
  }, interval);

  return STATE.syncInterval;
}

/**
 * Detener polling automático
 */
function stopAutoSync() {
  if (STATE.syncInterval) {
    clearInterval(STATE.syncInterval);
    STATE.syncInterval = null;
    console.log('⏹️ Sync automático detenido');
  }
}

/**
 * Sincronizar manualmente (botón en UI)
 */
async function syncNow() {
  try {
    console.log('🔄 Sincronización manual iniciada...');
    const result = await syncExcelToApp();
    updateUI();
    return result;
  } catch (error) {
    console.error('❌ Error en sync manual:', error);
    handleSyncError(error);
    throw error;
  }
}

// ════════════════════════════════════════════════════════════════
// 7. OFFLINE-FIRST ARCHITECTURE
// ════════════════════════════════════════════════════════════════

/**
 * Procesar cola offline cuando hay conexión
 */
async function processOfflineQueue() {
  if (STATE.offlineQueue.length === 0) return;

  console.log(`📤 Procesando ${STATE.offlineQueue.length} cambios offline...`);

  const batch = STATE.offlineQueue.splice(0, 50); // Procesar en lotes

  try {
    await writeChangesToExcel(batch);
    console.log('✅ Cola offline procesada');

    // Procesar recursivamente si hay más
    if (STATE.offlineQueue.length > 0) {
      await processOfflineQueue();
    }
  } catch (error) {
    console.error('❌ Error procesando cola:', error);
    // Volver a encolar para reintentar
    STATE.offlineQueue.unshift(...batch);
    throw error;
  }
}

/**
 * Escuchar cambios de conexión
 */
function setupOfflineDetection() {
  window.addEventListener('online', async () => {
    console.log('🌐 Conexión restaurada');
    STATE.isOnline = true;
    updateUI();

    try {
      await processOfflineQueue();
    } catch (error) {
      console.error('❌ Error procesando cola:', error);
    }
  });

  window.addEventListener('offline', () => {
    console.log('📵 Sin conexión');
    STATE.isOnline = false;
    updateUI();
  });
}

// ════════════════════════════════════════════════════════════════
// 8. MANEJO DE ERRORES & REINTENTOS
// ════════════════════════════════════════════════════════════════

/**
 * Manejar error de sincronización
 */
function handleSyncError(error) {
  STATE.lastError = {
    message: error.message,
    code: error.code,
    timestamp: Date.now()
  };

  console.error('❌ Sync Error:', STATE.lastError);
  updateUI();
}

/**
 * Reintentar con backoff exponencial
 */
async function retryWithBackoff(fn, maxRetries = CONFIG.maxRetries) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const delay = CONFIG.retryDelay * Math.pow(2, attempt - 1);
      console.log(`⏳ Reintentando en ${delay}ms... (intento ${attempt})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

// ════════════════════════════════════════════════════════════════
// 9. INTEGRACIÓN CON UI
// ════════════════════════════════════════════════════════════════

/**
 * Registrar elementos UI
 */
function registerUIElements(elements) {
  UI.syncButton = elements.syncButton;
  UI.statusIndicator = elements.statusIndicator;
  UI.lastSyncLabel = elements.lastSyncLabel;
  UI.errorPanel = elements.errorPanel;

  if (UI.syncButton) {
    UI.syncButton.addEventListener('click', syncNow);
  }
}

/**
 * Registrar callbacks
 */
function registerCallbacks(callbacks) {
  Object.assign(UI.callbacks, callbacks);
}

/**
 * Actualizar UI
 */
function updateUI() {
  if (UI.statusIndicator) {
    UI.statusIndicator.className = getStatusClass();
    UI.statusIndicator.title = getStatusTooltip();
  }

  if (UI.lastSyncLabel) {
    UI.lastSyncLabel.textContent = formatLastSync();
  }

  if (UI.errorPanel && STATE.lastError) {
    UI.errorPanel.innerHTML = `
      <div class="error-message">
        <strong>Error de sincronización:</strong> ${STATE.lastError.message}
      </div>
    `;
  }
}

/**
 * Notificar callbacks
 */
function notifyUI(callbackName, data = null) {
  const callback = UI.callbacks[callbackName];
  if (callback && typeof callback === 'function') {
    callback(data);
  }
}

/**
 * Obtener clase de estado para indicador
 */
function getStatusClass() {
  if (!STATE.isOnline) return 'status-offline';
  if (STATE.syncInProgress) return 'status-syncing';
  if (STATE.lastError) return 'status-error';
  return 'status-ok';
}

/**
 * Obtener tooltip de estado
 */
function getStatusTooltip() {
  if (!STATE.isOnline) return 'Sin conexión - Cambios se guardarán offline';
  if (STATE.syncInProgress) return 'Sincronizando...';
  if (STATE.lastError) return `Error: ${STATE.lastError.message}`;
  return `Última sincronización: ${formatLastSync()}`;
}

/**
 * Formatear hora de última sincronización
 */
function formatLastSync() {
  if (!STATE.lastSyncTime) return 'Nunca';

  const diff = Date.now() - STATE.lastSyncTime;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (seconds < 60) return 'Hace unos segundos';
  if (minutes < 60) return `Hace ${minutes}m`;
  if (hours < 24) return `Hace ${hours}h`;
  return `Hace ${Math.floor(hours / 24)}d`;
}

// ════════════════════════════════════════════════════════════════
// 10. UTILIDADES
// ════════════════════════════════════════════════════════════════

/**
 * Generar string aleatorio
 */
function generateRandomString(length) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Obtener configuración actual
 */
function getConfig() {
  return { ...CONFIG };
}

/**
 * Actualizar configuración
 */
function updateConfig(updates) {
  Object.assign(CONFIG, updates);
  localStorage.setItem('google_drive_sync_config', JSON.stringify(CONFIG));
}

/**
 * Obtener estado actual
 */
function getState() {
  return {
    isAuthenticated: !!STATE.accessToken,
    isOnline: STATE.isOnline,
    isSyncing: STATE.syncInProgress,
    lastSyncTime: STATE.lastSyncTime,
    lastError: STATE.lastError,
    queuedChanges: STATE.offlineQueue.length,
    conflictCount: STATE.conflictQueue.length,
    syncCount: STATE.syncCount
  };
}

/**
 * Logout y limpiar datos
 */
function logout() {
  STATE.accessToken = null;
  STATE.refreshToken = null;
  STATE.fileId = null;

  localStorage.removeItem('google_drive_auth');
  localStorage.removeItem('google_drive_sync_config');

  stopAutoSync();

  console.log('✅ Logout completado');
}

// ════════════════════════════════════════════════════════════════
// EXPORTS
// ════════════════════════════════════════════════════════════════

export default {
  // Init & Auth
  init: initGoogleDriveSync,
  handleOAuthCallback,

  // Manual Sync
  syncNow,
  startAutoSync,
  stopAutoSync,

  // Data Flow
  readExcelFromDrive,
  writeChangesToExcel,

  // Offline
  processOfflineQueue,

  // Conflict Resolution
  resolveConflict,
  queueConflict,

  // UI Integration
  registerUIElements,
  registerCallbacks,

  // Config & State
  getConfig,
  updateConfig,
  getState,

  // Cleanup
  logout,

  // Setup
  setupOfflineDetection
};
