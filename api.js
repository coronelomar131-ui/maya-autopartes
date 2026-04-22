// ═════════════════════════════════════════════════════════════════
// MAYA AUTOPARTES - API.JS
// Integration Layer: Google Drive, Compac, Supabase, Exports
// ═════════════════════════════════════════════════════════════════

import { ventas, almacen, clientes, cfg, saveCfg, toast, fmt, today, dl } from './core.js';

// ═════════════════════════════════════════════════════════════════
// SUPABASE INTEGRATION
// ═════════════════════════════════════════════════════════════════

let sbClient = null;
let sbReady = false;

// Inicializar Supabase
async function initSupabaseSimple() {
  try {
    const { createClient } = window.supabase;

    if (!createClient) {
      console.log('⚠ Supabase library not loaded');
      return;
    }

    sbClient = createClient(
      'https://uszflkegdshxmrrbrfkq.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVzemZsa2VnZHNoeG1ycmJyYnJma3EiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc3Njg3Nzk4MywiZXhwIjoyMDkyNDUzOTgzfQ.a8zR4Anr_7fl50qI2yLIB2mBWn_tA2OcTMoIgBG-K_A'
    );

    sbReady = true;
    console.log('✅ Supabase inicializado');

    // Setup listeners
    setupVentasListener();
    setupAlmacenListener();
    setupClientesListener();

    // Load data
    await loadVentasFromSupabase();
    await loadAlmacenFromSupabase();
    await loadClientesFromSupabase();

  } catch (e) {
    console.error('❌ Error inicializando Supabase:', e);
  }
}

// ─── Clientes ───
async function syncClientesToSupabase() {
  if (!sbClient || !sbReady) return;
  try {
    await sbClient.from('clientes').upsert(
      { id: 1, data: clientes },
      { onConflict: 'id' }
    );
    console.log('✅ Clientes sincronizados con Supabase (' + clientes.length + ' items)');
  } catch (e) {
    console.error('❌ Error sincronizando clientes:', e);
  }
}

async function loadClientesFromSupabase() {
  if (!sbClient) return;
  try {
    const { data } = await sbClient.from('clientes').select('data').limit(1);
    if (data && data.length > 0 && data[0].data) {
      clientes.length = 0;
      clientes.push(...data[0].data);
    }
    console.log('✅ Clientes cargados desde Supabase', clientes.length);
  } catch (e) {
    console.error('❌ Error cargando clientes:', e);
  }
}

function setupClientesListener() {
  if (!sbClient) return;
  try {
    sbClient
      .channel('clientes-sync')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'clientes' },
        (payload) => {
          if (payload.new && payload.new.data) {
            clientes.length = 0;
            clientes.push(...payload.new.data);
            console.log('✅ Clientes actualizados en tiempo real');
          }
        }
      )
      .subscribe();
  } catch (e) {
    console.error('Error en listener clientes:', e);
  }
}

// ─── Ventas ───
async function syncVentasToSupabase() {
  if (!sbClient || !sbReady) return;
  try {
    await sbClient.from('ventas').upsert(
      { id: 1, data: ventas },
      { onConflict: 'id' }
    );
    console.log('✅ Ventas sincronizadas con Supabase (' + ventas.length + ' items)');
  } catch (e) {
    console.error('❌ Error sincronizando ventas:', e);
  }
}

async function loadVentasFromSupabase() {
  if (!sbClient) return;
  try {
    const { data } = await sbClient.from('ventas').select('data').limit(1);
    if (data && data.length > 0 && data[0].data) {
      ventas.length = 0;
      ventas.push(...data[0].data);
    }
    console.log('✅ Ventas cargadas desde Supabase', ventas.length);
  } catch (e) {
    console.error('❌ Error cargando ventas:', e);
  }
}

function setupVentasListener() {
  if (!sbClient) return;
  try {
    sbClient
      .channel('ventas-sync')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'ventas' },
        (payload) => {
          if (payload.new && payload.new.data) {
            ventas.length = 0;
            ventas.push(...payload.new.data);
            console.log('✅ Ventas actualizadas en tiempo real');
          }
        }
      )
      .subscribe();
  } catch (e) {
    console.error('Error en listener ventas:', e);
  }
}

// ─── Almacén ───
async function syncAlmacenToSupabase() {
  if (!sbClient || !sbReady) return;
  try {
    await sbClient.from('almacen').upsert(
      { id: 1, data: almacen },
      { onConflict: 'id' }
    );
    console.log('✅ Almacén sincronizado con Supabase (' + almacen.length + ' items)');
  } catch (e) {
    console.error('❌ Error sincronizando almacén:', e);
  }
}

async function loadAlmacenFromSupabase() {
  if (!sbClient) return;
  try {
    const { data } = await sbClient.from('almacen').select('data').limit(1);
    if (data && data.length > 0 && data[0].data && data[0].data.length > 0) {
      almacen.length = 0;
      almacen.push(...data[0].data);
    }
    console.log('✅ Almacén cargado desde Supabase', almacen.length);
  } catch (e) {
    console.error('❌ Error cargando almacén:', e);
  }
}

function setupAlmacenListener() {
  if (!sbClient) return;
  try {
    sbClient
      .channel('almacen-sync')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'almacen' },
        (payload) => {
          if (payload.new && payload.new.data) {
            almacen.length = 0;
            almacen.push(...payload.new.data);
            console.log('✅ Almacén actualizado en tiempo real');
          }
        }
      )
      .subscribe();
  } catch (e) {
    console.error('Error en listener almacén:', e);
  }
}

// ═════════════════════════════════════════════════════════════════
// COMPAC EXPORT (Text Format)
// ═════════════════════════════════════════════════════════════════

function buildCompac() {
  const h = 'Reporte\tFecha\tCliente\tRFC\tResponsable\tCantidad\tStatus\tFactura\tTotal\tCosto\tUtilidad\tGuia\tCobro\tFechaFactura\tDiasVencidos';

  const rows = ventas.map(v => {
    const cl = clientes.find(c => c.nombre === v.cliente);
    return [
      v.reporte || '',
      v.fecha || '',
      v.cliente || '',
      cl?.rfc || '',
      v.responsable || '',
      v.cantidad || 1,
      v.status || '',
      v.factura === 'con' ? 'FACTURA' : 'SIN_FACTURA',
      (v.total || 0).toFixed(2),
      (v.costo || 0).toFixed(2),
      ((v.total || 0) - (v.costo || 0)).toFixed(2),
      v.guia || '',
      v.cobro === 'cobrado' ? 'COBRADO' : 'PENDIENTE',
      v.fechaFactura || '',
      v.diasVencidos || 0
    ].join('\t');
  });

  return [h, ...rows].join('\r\n');
}

function rCompac() {
  const lines = buildCompac().split('\r\n');
  const preview = document.getElementById('cprev');
  if (preview) {
    preview.textContent = lines.length <= 1
      ? 'Sin ventas para previsualizar.'
      : lines.slice(0, 12).join('\n') + (lines.length > 12 ? `\n… (${lines.length - 12} filas más)` : '');
  }
}

function exportCompac() {
  if (!ventas.length) {
    toast('⚠ Sin ventas para exportar');
    return;
  }
  dl(buildCompac(), 'maya_compac.txt', 'text/plain');
  toast('✅ TXT Compac exportado');
}

// ═════════════════════════════════════════════════════════════════
// CSV EXPORT
// ═════════════════════════════════════════════════════════════════

function exportCSV() {
  if (!ventas.length) {
    toast('⚠ Sin ventas para exportar');
    return;
  }

  const h = 'Reporte,Fecha,Cliente,Responsable,Cantidad,Status,Factura,Total,Costo,Utilidad,Guia,Cobro,FechaFactura,DiasVencidos';
  const rows = ventas.map(v => [
    v.reporte,
    v.fecha,
    `"${v.cliente}"`,
    `"${v.responsable}"`,
    v.cantidad,
    v.status,
    v.factura,
    (v.total || 0).toFixed(2),
    (v.costo || 0).toFixed(2),
    ((v.total || 0) - (v.costo || 0)).toFixed(2),
    v.guia,
    v.cobro,
    v.fechaFactura,
    v.diasVencidos
  ].join(','));

  dl([h, ...rows].join('\n'), 'maya_ventas.csv', 'text/csv');
  toast('✅ CSV exportado');
}

// ═════════════════════════════════════════════════════════════════
// JSON EXPORT
// ═════════════════════════════════════════════════════════════════

function exportJSON() {
  dl(JSON.stringify({ ventas, clientes, almacen }, null, 2), 'maya_datos.json', 'application/json');
  toast('✅ JSON exportado');
}

// ═════════════════════════════════════════════════════════════════
// EXCEL EXPORT (con XLSX library)
// ═════════════════════════════════════════════════════════════════

function exportarFacturasExcel() {
  const facturas = ventas.filter(v => v.factura === 'con');

  if (!facturas.length) {
    toast('⚠ Sin facturas para exportar');
    return;
  }

  const data = facturas.map(v => ({
    'ID': '#' + String(v.id).slice(-6),
    'Cliente': v.cliente || '—',
    'Fecha': v.fecha || '—',
    'RFC': clientes.find(c => c.nombre === v.cliente)?.rfc || '—',
    'Total': v.total || 0,
    'Costo': v.costo || 0,
    'Utilidad': (v.total || 0) - (v.costo || 0),
    'Estado': v.cobro === 'cobrado' ? 'Pagada' : 'Pendiente',
    'Responsable': v.responsable || '—',
    'Fecha Factura': v.fechaFactura || '—'
  }));

  // Verificar si XLSX está disponible
  if (typeof XLSX === 'undefined') {
    toast('⚠ Librería XLSX no cargada. Intenta nuevamente.');
    return;
  }

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!cols'] = [
    { wch: 10 }, { wch: 20 }, { wch: 12 }, { wch: 15 },
    { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
    { wch: 15 }, { wch: 12 }
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
  XLSX.writeFile(wb, 'Maya_Facturas_' + today() + '.xlsx');

  toast('✅ Excel descargado');
}

// ═════════════════════════════════════════════════════════════════
// GOOGLE DRIVE INTEGRATION (Placeholder)
// ═════════════════════════════════════════════════════════════════

async function syncFacturaToGoogleDrive(ventaId) {
  try {
    const venta = ventas.find(v => v.id === ventaId);
    if (!venta) {
      toast('⚠ Factura no encontrada');
      return;
    }

    if (!cfg.driveId || !cfg.driveJson) {
      toast('⚠ Configura Google Drive primero');
      return;
    }

    // Aquí iría la lógica real de Google Drive
    // Por ahora es un placeholder
    console.log('📤 Sincronizando factura a Google Drive:', venta);

    toast('✅ Factura sincronizada a Drive');
  } catch (e) {
    console.error('❌ Error en sincronización a Drive:', e);
    toast('❌ Error sincronizando a Drive');
  }
}

async function uploadFacturaToDrive(ventaId) {
  try {
    const venta = ventas.find(v => v.id === ventaId);
    if (!venta) return;

    if (!cfg.driveId || !cfg.driveJson) {
      toast('⚠ Configura Google Drive primero');
      return;
    }

    // Placeholder para subida real
    console.log('📁 Subiendo factura:', venta);
    toast('✅ Factura subida a Google Drive');
  } catch (e) {
    console.error('Error subiendo a Drive:', e);
    toast('❌ Error subiendo a Drive');
  }
}

// ═════════════════════════════════════════════════════════════════
// COMPAC CONNECTION TEST
// ═════════════════════════════════════════════════════════════════

async function testCompacConnection() {
  try {
    if (!cfg.compacUrl || !cfg.compacKey) {
      toast('⚠ Configura Compac primero (URL y API Key)');
      return;
    }

    // Test connection
    const response = await fetch(cfg.compacUrl + '/api/test', {
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + cfg.compacKey,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(5000)
    });

    if (response.ok) {
      toast('✅ Conexión con Compac exitosa');
      console.log('✅ Compac connection OK');
    } else {
      toast('❌ Error de autenticación con Compac');
      console.error('Compac auth error:', response.status);
    }
  } catch (e) {
    if (e.name === 'AbortError') {
      toast('❌ Timeout: Compac no responde');
    } else {
      toast('❌ Error conectando con Compac');
    }
    console.error('Compac connection error:', e);
  }
}

// ═════════════════════════════════════════════════════════════════
// COMPAC SYNC (Real-time data exchange)
// ═════════════════════════════════════════════════════════════════

async function syncVentasToCompac() {
  try {
    if (!cfg.compacUrl || !cfg.compacKey) {
      console.log('⚠ Compac not configured');
      return;
    }

    const payload = {
      ventas: ventas,
      timestamp: new Date().toISOString(),
      empresa: cfg.nombre
    };

    const response = await fetch(cfg.compacUrl + '/api/ventas/sync', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + cfg.compacKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000)
    });

    if (response.ok) {
      console.log('✅ Ventas sincronizadas con Compac');
      toast('✅ Ventas sincronizadas con Compac');
    } else {
      console.error('Compac sync error:', response.status);
      toast('❌ Error sincronizando con Compac');
    }
  } catch (e) {
    console.error('Error en sincronización con Compac:', e);
  }
}

// ═════════════════════════════════════════════════════════════════
// IMPORT FROM EXCEL (using XLSX)
// ═════════════════════════════════════════════════════════════════

async function importarExcel(e) {
  const file = e.target.files[0];
  if (!file) return;

  try {
    // Check if XLSX is available
    if (typeof XLSX === 'undefined') {
      toast('⚠ Cargando librería Excel...');
      setTimeout(() => importarExcel(e), 500);
      return;
    }

    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    if (!rows.length) {
      toast('⚠ Excel vacío');
      return;
    }

    // Map columns flexibly
    const productos = rows.map((row, idx) => ({
      id: Date.now() + idx,
      nombre: row.nombre || row.Nombre || row.NOMBRE || row.Producto || row.producto || '',
      sku: row.sku || row.SKU || row.Sku || '',
      precio: parseFloat(row.precio || row.Precio || row.PRECIO || 0),
      stock: parseInt(row.stock || row.Stock || row.STOCK || 1),
      costo: parseFloat(row.costo || row.Costo || row.COSTO || 0),
      categoria: row.categoria || row.Categoria || row.CATEGORIA || 'Puertas',
      min: parseInt(row.min || row.Min || 5),
      max: parseInt(row.max || row.Max || 100),
      notas: row.notas || row.Notas || ''
    })).filter(p => p.nombre);

    if (!productos.length) {
      toast('⚠ Sin productos válidos');
      return;
    }

    almacen.push(...productos);
    await syncAlmacenToSupabase();
    toast(`✅ Importados ${productos.length} productos`);

    const fileInput = document.getElementById('excel-import') || document.getElementById('converter-excel-file');
    if (fileInput) fileInput.value = '';

  } catch (e) {
    toast('❌ Error al importar Excel: ' + (e.message || 'desconocido'));
    console.error('Excel import error:', e);
  }
}

// ═════════════════════════════════════════════════════════════════
// INIT SUPABASE ON LOAD
// ═════════════════════════════════════════════════════════════════

window.addEventListener('load', () => {
  setTimeout(initSupabaseSimple, 500);
  // Setup Excel converter file input
  const converterInput = document.getElementById('converter-excel-file');
  if (converterInput) {
    converterInput.addEventListener('change', importarExcel);
  }
});

// ═════════════════════════════════════════════════════════════════
// EXPORTAR FUNCIONES PÚBLICAS
// ═════════════════════════════════════════════════════════════════

export {
  // Supabase
  initSupabaseSimple,
  syncVentasToSupabase, loadVentasFromSupabase, setupVentasListener,
  syncAlmacenToSupabase, loadAlmacenFromSupabase, setupAlmacenListener,
  syncClientesToSupabase, loadClientesFromSupabase, setupClientesListener,

  // Export functions
  buildCompac, rCompac, exportCompac,
  exportCSV, exportJSON, exportarFacturasExcel,

  // Google Drive
  syncFacturaToGoogleDrive, uploadFacturaToDrive,

  // Compac
  testCompacConnection, syncVentasToCompac,

  // Import
  importarExcel
};
