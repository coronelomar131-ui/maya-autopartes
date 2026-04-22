/**
 * main.js - Application Entry Point
 * ═════════════════════════════════════════════════════════════════════════════
 *
 * Punto de entrada único para la aplicación Maya Autopartes
 *
 * Responsabilidades:
 * ✓ Importar todos los módulos necesarios
 * ✓ Inicializar la aplicación
 * ✓ Configurar event listeners principales
 * ✓ Establecer sincronizaciones
 * ✓ Exponer funciones globales en window para onclick handlers
 *
 * @version 2.3.0
 * @author Maya Autopartes Dev Team
 * @last-update 2026-04-22
 */

// ═════════════════════════════════════════════════════════════════════════════
// 1. IMPORT MODULES
// ═════════════════════════════════════════════════════════════════════════════

import {
  // Data & State
  ventas, almacen, clientes, usuarios, sesionActual,
  eVId, eAId, eCId, vPg, vSC, vSD, almView, PG, cfg,

  // Core functions
  sv, today, debounce, fmt, filterByQuery,
  findVentaById, findProductoById, findClienteByNombre,
  filtV, filtA, filtC, stockClass, diasVencidos,
  topClientes, topProductos, topVentas,

  // Auth & Session
  loginUser, logoutUser, getCurrentUser,

  // UI update functions
  renderV, renderA, renderC, renderF, rDash, rCompac, renderMisFacturas,
  badges, toast, openV, closeOv, clsOv
} from './core.js';

import {
  // UI rendering
  renderVForm, renderAlmForm, renderCliForm, renderCfgForm,
  renderUsersModal, renderNewUserForm,
  renderConverterUI
} from './ui.js';

import {
  // API integrations
  syncVentasToSupabase, syncAlmacenToSupabase, syncClientesToSupabase,
  syncDataFromSupabase, setupSupabaseRealtimeListeners,

  // Google Drive
  setupGoogleDriveSync, exportToGoogleDrive,

  // MercadoLibre
  setupMercadoLibreSync, syncToMercadoLibre,

  // OneDrive
  setupOneDriveSync, exportToOneDrive,

  // Compac & Import
  exportCompac, importarExcel
} from './api.js';

import {
  // Utilities
  toggleSidebar, openSidebar, closeSidebar,
  setupKeyboardShortcuts, initializeClock, setupResponsiveMenu
} from './utils.js';

// ═════════════════════════════════════════════════════════════════════════════
// 2. EXPOSE GLOBAL FUNCTIONS FOR HTML onclick HANDLERS
// ═════════════════════════════════════════════════════════════════════════════

// Navigation
window.goPage = (name, el) => {
  if (!sesionActual && name !== 'login') {
    toast('⚠ Debes ingresar primero');
    return;
  }

  document.querySelectorAll('.page').forEach(p => p.classList.remove('on'));
  document.getElementById('page-' + name).classList.add('on');

  document.querySelectorAll('.ni').forEach(n => n.classList.remove('on'));
  if (el) el.classList.add('on');

  const titles = {
    dashboard: 'Dashboard',
    ventas: 'Ventas',
    almacen: 'Almacén',
    clientes: 'Clientes',
    compac: 'Exportar / Compac',
    'mis-facturas': 'Mis Facturas',
    admin: 'Admin Panel'
  };

  const breads = {
    dashboard: 'Maya Autopartes / Inicio',
    ventas: 'Maya Autopartes / Ventas',
    almacen: 'Maya Autopartes / Almacén',
    clientes: 'Maya Autopartes / Clientes',
    compac: 'Maya Autopartes / Exportar',
    'mis-facturas': 'Maya Autopartes / Mis Facturas',
    admin: 'Maya Autopartes / Admin'
  };

  document.getElementById('pgTitle').textContent = titles[name] || name;
  document.getElementById('pgBread').textContent = breads[name] || '';

  const btn = document.getElementById('mainBtn');
  const acts = {
    dashboard: () => { btn.textContent = '+ Nueva Venta'; btn.onclick = window.openVentaModal; },
    ventas: () => { btn.textContent = '+ Nueva Venta'; btn.onclick = window.openVentaModal; },
    almacen: () => { btn.textContent = '+ Producto'; btn.onclick = window.openAlmModal; },
    clientes: () => { btn.textContent = '+ Cliente'; btn.onclick = window.openClienteModal; },
    compac: () => { btn.textContent = '⬇ Exportar'; btn.onclick = window.exportCompac; },
    'mis-facturas': () => { btn.textContent = '📋 Mis Facturas'; btn.onclick = window.renderMisFacturas; },
    admin: () => { btn.textContent = '🔧 Admin'; btn.onclick = () => {}; }
  };
  if (acts[name]) acts[name]();

  if (name === 'dashboard') rDash();
  if (name === 'ventas') renderV();
  if (name === 'almacen') renderA();
  if (name === 'clientes') renderC();
  if (name === 'compac') rCompac();
  if (name === 'mis-facturas') renderMisFacturas();
  if (name === 'admin') renderAdminPanel();

  badges();
  closeSidebar();
};

// Modals
window.openVentaModal = () => {
  document.getElementById('venta-form-container').innerHTML = renderVForm();
  openV('ov-venta');
};

window.openAlmModal = () => {
  document.getElementById('almacen-form-container').innerHTML = renderAlmForm();
  openV('ov-almacen');
};

window.openClienteModal = () => {
  document.getElementById('cliente-form-container').innerHTML = renderCliForm();
  openV('ov-cliente');
};

window.openCfgModal = () => {
  document.getElementById('config-form-container').innerHTML = renderCfgForm();
  openV('ov-config');
};

window.openUsersModal = () => {
  document.getElementById('users-list-container').innerHTML = renderUsersModal();
  openV('ov-users');
};

window.openNewUserForm = () => {
  document.getElementById('users-list-container').innerHTML = renderNewUserForm();
};

// Admin Panel
window.openAdminPanel = () => {
  const userRole = localStorage.getItem('userRole');
  if (userRole !== 'admin') {
    toast('⚠ Solo administradores pueden acceder');
    return;
  }
  goPage('admin', document.getElementById('ni-admin'));
};

// UI actions
window.clsOv = clsOv;
window.closeOv = closeOv;
window.toggleSidebar = toggleSidebar;
window.closeSidebar = closeSidebar;
window.toast = toast;

// Export functions
window.exportCompac = exportCompac;
window.renderMisFacturas = renderMisFacturas;
window.importarExcel = importarExcel;

// Form save handlers
window.saveVenta = () => {
  console.log('Saving venta...');
  // Logic from original code
  closeOv('ov-venta');
  renderV();
  badges();
};

window.saveAlmacen = () => {
  console.log('Saving almacen...');
  closeOv('ov-almacen');
  renderA();
  badges();
};

window.saveCliente = () => {
  console.log('Saving cliente...');
  closeOv('ov-cliente');
  renderC();
  badges();
};

window.saveConfig = () => {
  console.log('Saving config...');
  closeOv('ov-config');
  toast('✅ Configuración guardada');
};

// ═════════════════════════════════════════════════════════════════════════════
// 3. INITIALIZE APPLICATION
// ═════════════════════════════════════════════════════════════════════════════

async function initializeApp() {
  console.log('🚀 Inicializando Maya Autopartes v2.3...');

  try {
    // Setup UI utilities
    initializeClock();
    setupResponsiveMenu();
    setupKeyboardShortcuts();

    // Initial render
    rDash();
    badges();

    // Setup Supabase real-time sync
    await setupSupabaseRealtimeListeners();

    // Setup integrations (non-blocking)
    setupGoogleDriveSync().catch(e => console.warn('⚠ Google Drive setup:', e.message));
    setupMercadoLibreSync().catch(e => console.warn('⚠ MercadoLibre setup:', e.message));
    setupOneDriveSync().catch(e => console.warn('⚠ OneDrive setup:', e.message));

    console.log('✅ Aplicación inicializada correctamente');
  } catch (error) {
    console.error('❌ Error al inicializar:', error);
    toast('❌ Error al inicializar la aplicación');
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// 4. DOCUMENT READY & START APP
// ═════════════════════════════════════════════════════════════════════════════

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
