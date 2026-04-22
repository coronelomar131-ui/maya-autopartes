// ═════════════════════════════════════════════════════════════════
// MAYA AUTOPARTES - UI.JS
// Render Layer: Actualización dinámica del DOM
// ═════════════════════════════════════════════════════════════════

import {
  ventas, almacen, clientes, vPg, vSC, vSD, almView, PG,
  debounce, sv, fmt, toast, closeOv, filtV, filtA, stockClass,
  eVId, eAId, eCId, today, dl, cfg
} from './core.js';

// ═════════════════════════════════════════════════════════════════
// RENDER VENTAS
// ═════════════════════════════════════════════════════════════════

function renderV() {
  const data = filtV();
  const pg = Math.max(1, Math.ceil(data.length / PG));

  if (vPg > pg) vPg = 1;

  const sl = data.slice((vPg - 1) * PG, vPg * PG);
  const sb = { A: 'ba', B: 'bb', C: 'bc2' };

  document.getElementById('v-tb').innerHTML = !sl.length
    ? `<tr><td colspan="15" style="text-align:center;padding:2.5rem;color:var(--muted2);font-family:var(--fm);font-size:.7rem">Sin ventas registradas. Usa "+ Nueva Venta" para comenzar.</td></tr>`
    : sl.map(v => {
      const u = v.total - v.costo;
      return `<tr>
        <td class="mono" style="color:var(--muted)">${v.reporte || '—'}</td>
        <td class="mono">${v.fecha || '—'}</td>
        <td style="font-weight:600;max-width:140px;overflow:hidden;text-overflow:ellipsis">${v.cliente || '—'}</td>
        <td style="max-width:110px;overflow:hidden;text-overflow:ellipsis">${v.responsable || '—'}</td>
        <td class="mono" style="text-align:center">${v.cantidad || 1}</td>
        <td><span class="badge ${sb[v.status] || 'bb'}">${v.status}</span></td>
        <td><span class="badge ${v.factura === 'con' ? 'b-fac' : 'b-sin'}">${v.factura === 'con' ? 'Con' : 'Sin'}</span></td>
        <td class="mono" style="font-weight:700;color:var(--navy)">${fmt(v.total)}</td>
        <td class="mono" style="color:var(--muted)">${v.guia || '—'}</td>
        <td><span class="badge ${v.cobro === 'cobrado' ? 'b-cob' : 'b-pen'}">${v.cobro === 'cobrado' ? 'Cobrado' : 'Pendiente'}</span></td>
        <td class="mono" style="color:var(--muted)">${v.fechaFactura || '—'}</td>
        <td class="${v.diasVencidos > 0 ? 'bvenc' : 'bok'}">${v.diasVencidos > 0 ? v.diasVencidos + ' días' : 'Al día'}</td>
        <td class="mono" style="color:var(--muted)">${fmt(v.costo)}</td>
        <td class="${u >= 0 ? 'upos' : 'uneg'}">${fmt(u)}</td>
        <td><div class="row-acts">
          <button class="btn btn-ghost btn-xs" onclick="editV(${v.id})" title="Editar">✏</button>
          <button class="btn btn-danger btn-xs" onclick="delV(${v.id})" title="Eliminar esta venta">🗑</button>
        </div></td></tr>`;
    }).join('');

  let ft = `<span>${sl.length} de ${data.length} registros</span><div class="pbtns">`;
  ft += `<button class="pb" onclick="vgp(${vPg - 1})" ${vPg === 1 ? 'disabled' : ''}>‹</button>`;

  for (let p = 1; p <= pg; p++) {
    if (pg <= 6 || Math.abs(p - vPg) <= 1 || p === 1 || p === pg)
      ft += `<button class="pb ${p === vPg ? 'on' : ''}" onclick="vgp(${p})">${p}</button>`;
    else if (Math.abs(p - vPg) === 2)
      ft += `<span style="padding:0 .2rem;color:var(--muted)">…</span>`;
  }

  ft += `<button class="pb" onclick="vgp(${vPg + 1})" ${vPg === pg ? 'disabled' : ''}>›</button></div>`;
  document.getElementById('v-ft').innerHTML = ft;
  badges();
}

function vgp(p) {
  const pg = Math.ceil(filtV().length / PG);
  if (p < 1 || p > pg) return;
  vPg = p;
  renderV();
}

function vs2(c) {
  vSD = vSC === c ? -vSD : 1;
  vSC = c;
  renderV();
}

// ═════════════════════════════════════════════════════════════════
// RENDER ALMACÉN
// ═════════════════════════════════════════════════════════════════

function renderA() {
  // Refresh categories
  const cats = [...new Set(almacen.map(p => p.categoria).filter(Boolean))];
  const ce = document.getElementById('alm-cat');
  const cur = ce?.value;

  if (ce) ce.innerHTML = '<option value="">Todas las categorías</option>' + cats.map(c => `<option value="${c}" ${c === cur ? 'selected' : ''}>${c}</option>`).join('');

  const data = filtA();
  const hasAny = almacen.length > 0;

  const emptyEl = document.getElementById('alm-empty');
  if (emptyEl) emptyEl.style.display = hasAny ? 'none' : 'flex';

  // Summary bar
  const total_prod = almacen.length;
  const stock_ok = almacen.filter(p => p.stock > p.min).length;
  const stock_low = almacen.filter(p => p.stock > 0 && p.stock <= p.min).length;
  const stock_zero = almacen.filter(p => p.stock <= 0).length;
  const val_inv = almacen.reduce((s, p) => s + (p.stock || 0) * (p.costo || 0), 0);

  const almSum = document.getElementById('almSum');
  if (almSum) {
    almSum.innerHTML = `
      <div class="alm-sum"><div class="as-v">${total_prod}</div><div class="as-l">Total Productos</div></div>
      <div class="alm-sum sg"><div class="as-v" style="color:var(--grn)">${stock_ok}</div><div class="as-l">Stock OK</div></div>
      <div class="alm-sum sa"><div class="as-v" style="color:var(--amb)">${stock_low}</div><div class="as-l">Stock Bajo</div></div>
      <div class="alm-sum sr"><div class="as-v" style="color:var(--red)">${stock_zero}</div><div class="as-l">Sin Stock</div></div>`;
  }

  if (almView === 'cards') {
    const tview = document.getElementById('alm-tview');
    if (tview) tview.style.display = 'none';

    const cardsEl = document.getElementById('alm-cards');
    if (cardsEl) {
      cardsEl.innerHTML = data.length === 0 && hasAny
        ? `<div style="text-align:center;padding:2rem;color:var(--muted2);font-family:var(--fm);font-size:.7rem">Sin resultados para el filtro aplicado.</div>`
        : data.map(p => {
          const cls = stockClass(p);
          const pct = p.max > 0 ? Math.min(100, p.stock / p.max * 100) : 0;
          const bc = cls === 'ok' ? 'var(--grn)' : cls === 'low' ? 'var(--amb)' : 'var(--red)';
          const mrg = p.precio > 0 && p.costo > 0 ? ((p.precio - p.costo) / p.precio * 100).toFixed(0) : 0;

          return `<div class="alm-card ${cls === 'zero' ? 'stock-zero' : cls === 'low' ? 'stock-low' : ''}">
            <div class="stock-badge ${cls}">${p.stock}</div>
            <div class="alm-sku">${p.sku || 'Sin SKU'}</div>
            <div class="alm-name">${p.nombre}</div>
            <div class="alm-cat">${p.categoria || 'Sin categoría'}${p.notas ? ' · ' + p.notas : ''}</div>
            <div class="stock-bar-wrap">
              <div style="display:flex;justify-content:space-between;font-family:var(--fm);font-size:.55rem;color:var(--muted2);margin-bottom:.25rem">
                <span>Stock: ${p.stock} uds.</span><span>Mín: ${p.min} · Máx: ${p.max}</span>
              </div>
              <div class="stock-bar-track"><div class="stock-bar-fill" style="width:${pct}%;background:${bc}"></div></div>
            </div>
            <div class="alm-meta-row">
              <div class="alm-prices">
                <div class="alm-price"><span class="alm-price-lbl">Costo</span><span class="alm-price-val">${fmt(p.costo || 0)}</span></div>
                <div class="alm-price"><span class="alm-price-lbl">Precio</span><span class="alm-price-val">${fmt(p.precio || 0)}</span></div>
                <div class="alm-price"><span class="alm-price-lbl">Margen</span><span class="alm-price-val" style="color:var(--grn)">${mrg}%</span></div>
              </div>
              <div class="stock-adj">
                <button class="adj-btn" onclick="adjS(${p.id},-5)" title="-5">«</button>
                <button class="adj-btn" onclick="adjS(${p.id},-1)" title="-1">−</button>
                <input class="adj-input" type="number" value="${p.stock}" min="0"
                  onchange="setS(${p.id},this.value)" onclick="this.select()">
                <button class="adj-btn" onclick="adjS(${p.id},1)" title="+1">+</button>
                <button class="adj-btn" onclick="adjS(${p.id},5)" title="+5">»</button>
              </div>
            </div>
            <div class="alm-actions">
              <button class="btn btn-ghost btn-xs" onclick="editA(${p.id})">✏ Editar</button>
              <button class="btn btn-danger btn-xs" onclick="delA(${p.id})">✕ Eliminar</button>
            </div>
          </div>`;
        }).join('');
    }
  } else {
    const cardsEl = document.getElementById('alm-cards');
    if (cardsEl) cardsEl.innerHTML = '';

    const tview = document.getElementById('alm-tview');
    if (tview) tview.style.display = 'block';

    const tbEl = document.getElementById('alm-tb');
    if (tbEl) {
      tbEl.innerHTML = !data.length
        ? `<tr><td colspan="11" style="text-align:center;padding:2rem;color:var(--muted2);font-family:var(--fm);font-size:.7rem">Sin resultados.</td></tr>`
        : data.map(p => {
          const cls = stockClass(p);
          const clsLabel = {
            ok: '<span class="badge bc2">OK</span>',
            low: '<span class="badge bb">Bajo</span>',
            zero: '<span class="badge ba">Sin stock</span>'
          }[cls];
          const mrg = p.precio > 0 && p.costo > 0 ? ((p.precio - p.costo) / p.precio * 100).toFixed(1) + '%' : '—';

          return `<tr>
            <td class="mono" style="color:var(--muted)">${p.sku || '—'}</td>
            <td style="font-weight:600">${p.nombre}</td>
            <td style="color:var(--muted2)">${p.categoria || '—'}</td>
            <td class="mono" style="font-weight:700;color:${cls === 'ok' ? 'var(--grn)' : cls === 'low' ? 'var(--amb)' : 'var(--red)'}">${p.stock}</td>
            <td class="mono">${p.min}</td><td class="mono">${p.max}</td>
            <td class="mono">${fmt(p.costo || 0)}</td>
            <td class="mono">${fmt(p.precio || 0)}</td>
            <td class="mono" style="color:var(--grn)">${mrg}</td>
            <td>${clsLabel}</td>
            <td><div class="row-acts">
              <button class="btn btn-ghost btn-xs" onclick="editA(${p.id})">✏</button>
              <button class="btn btn-success btn-xs" onclick="adjS(${p.id},1)">+1</button>
              <button class="btn btn-ghost btn-xs" onclick="adjS(${p.id},-1)">-1</button>
              <button class="btn btn-danger btn-xs" onclick="delA(${p.id})">✕</button>
            </div></td>
          </tr>`;
        }).join('');
    }
  }
  badges();
}

// ═════════════════════════════════════════════════════════════════
// RENDER CLIENTES
// ═════════════════════════════════════════════════════════════════

function renderC() {
  const q = (document.getElementById('cl-s')?.value || '').toLowerCase();
  const ti = document.getElementById('cl-ti')?.value || '';

  const data = clientes.filter(c => {
    if (q && !`${c.nombre}${c.rfc}${c.tel}`.toLowerCase().includes(q)) return false;
    if (ti && c.tipo !== ti) return false;
    return true;
  });

  const emptyEl = document.getElementById('cl-empty');
  if (emptyEl) emptyEl.style.display = !clientes.length ? 'flex' : 'none';

  const gridEl = document.getElementById('cl-g');
  if (gridEl) {
    gridEl.innerHTML = data.map(c => {
      const cvs = ventas.filter(v => v.cliente === c.nombre);
      const tot = cvs.reduce((s, v) => s + v.total, 0);
      const pen = cvs.filter(v => v.cobro === 'pendiente').length;
      const ini = c.nombre.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() || '').join('');

      return `<div class="cl-card">
        <div class="cl-head">
          <div class="cl-av">${ini || '?'}</div>
          <div><div class="cl-name">${c.nombre}</div><div class="cl-rfc">${c.rfc || 'Sin RFC'}</div></div>
        </div>
        <div class="cl-stats">
          <div class="cs"><div class="cs-v">${cvs.length}</div><div class="cs-l">Ventas</div></div>
          <div class="cs"><div class="cs-v">${fmt(tot)}</div><div class="cs-l">Facturado</div></div>
          <div class="cs"><div class="cs-v" style="color:${pen > 0 ? 'var(--red)' : 'var(--grn)'}">${pen}</div><div class="cs-l">Pendientes</div></div>
        </div>
        <div class="cl-tags">
          <span class="badge ${c.tipo === 'con' ? 'b-fac' : 'b-sin'}">${c.tipo === 'con' ? 'Con Factura' : 'Sin Factura'}</span>
          ${c.responsable ? `<span class="badge" style="background:rgba(30,79,122,.08);color:var(--navy);border:1px solid rgba(30,79,122,.15)">${c.responsable}</span>` : ''}
          ${c.tel ? `<span class="badge bok">📞 ${c.tel}</span>` : ''}
        </div>
        <div class="cl-foot">
          <button class="btn btn-ghost btn-xs" onclick="editC(${c.id})" title="Editar cliente">✏ Editar</button>
          <button class="btn btn-danger btn-xs" onclick="delC(${c.id})" title="Eliminar este cliente">🗑 Borrar</button>
        </div>
      </div>`;
    }).join('');
  }
  badges();
}

// ═════════════════════════════════════════════════════════════════
// RENDER FACTURAS
// ═════════════════════════════════════════════════════════════════

function renderF() {
  const q = (document.getElementById('f-s')?.value || '').toLowerCase();
  const est = document.getElementById('f-estado')?.value || '';

  const data = ventas.filter(v => {
    if (v.factura !== 'con') return false;
    if (q && !`${v.cliente}`.toLowerCase().includes(q)) return false;
    if (est && v.cobro !== est) return false;
    return true;
  }).sort((a, b) => new Date(b.fechaFactura || b.fecha) - new Date(a.fechaFactura || a.fecha));

  const emptyEl = document.getElementById('f-empty');
  if (emptyEl) emptyEl.style.display = !ventas.some(v => v.factura === 'con') ? 'flex' : 'none';

  const gridEl = document.getElementById('f-g');
  if (gridEl) {
    gridEl.innerHTML = data.length === 0 && ventas.some(v => v.factura === 'con')
      ? `<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--muted2)">Sin resultados</div>`
      : data.map(v => {
        const est = v.cobro === 'cobrado' ? 'pagada' : 'pendiente';
        const col = est === 'pagada' ? 'var(--grn)' : 'var(--red)';

        return `<div class="f-card">
          <div class="fc-hd">
            <div class="fc-num">#${String(v.id).slice(-6)}</div>
            <span class="badge" style="color:${col};background:${est === 'pagada' ? 'rgba(25,135,84,.1)' : 'rgba(220,53,69,.1)'};border:1px solid ${est === 'pagada' ? 'rgba(25,135,84,.2)' : 'rgba(220,53,69,.2)'};">${est}</span>
          </div>
          <div class="fc-info">
            <div class="fci"><span class="fcl">Cliente</span><span class="fcv">${v.cliente}</span></div>
            <div class="fci"><span class="fcl">Fecha</span><span class="fcv">${v.fecha}</span></div>
          </div>
          <div class="fc-amt">${fmt(v.total)}</div>
          <div class="fc-acts">
            <button class="btn btn-ghost btn-xs" onclick="viewFactura(${v.id})">Ver</button>
            <button class="btn btn-primary btn-xs" onclick="printFactura(${v.id})">Imprimir</button>
            <button class="btn btn-teal btn-xs" onclick="generarNotaPDF(${v.id})">📥 PDF</button>
            <button class="btn btn-ghost btn-xs" onclick="deleteNota(${v.id})" style="color:var(--red)" title="Eliminar esta nota">🗑 Borrar</button>
          </div>
        </div>`;
      }).join('');
  }
}

// ═════════════════════════════════════════════════════════════════
// DEBOUNCED VERSIONS
// ═════════════════════════════════════════════════════════════════

const renderVDebounced = debounce(renderV);
const renderADebounced = debounce(renderA);
const renderCDebounced = debounce(renderC);
const renderFDebounced = debounce(renderF);

// ═════════════════════════════════════════════════════════════════
// MODAL HANDLERS - VENTAS
// ═════════════════════════════════════════════════════════════════

function openVentaModal(data) {
  eVId = data ? data.id : null;
  const titleEl = document.getElementById('vm-t');
  if (titleEl) titleEl.textContent = data ? 'Editar Venta' : 'Nueva Venta';

  const sel = document.getElementById('vv-csel');
  if (sel) sel.innerHTML = '<option value="">— Seleccionar cliente —</option>' + clientes.map(c => `<option value="${c.nombre}">${c.nombre}${c.rfc ? ' (' + c.rfc + ')' : ''}</option>`).join('');

  const f = (id, v) => {
    const e = document.getElementById(id);
    if (e) e.value = v ?? '';
  };

  f('vv-fecha', data ? data.fecha : today());
  f('vv-rep', data ? data.reporte : '');
  f('vv-cl', data ? data.cliente : '');
  f('vv-csel', '');
  f('vv-resp', data ? data.responsable : '');
  f('vv-cant', data ? data.cantidad : 1);
  f('vv-st', data ? data.status : 'A');
  f('vv-fac', data ? data.factura : 'con');
  f('vv-tot', data ? data.total : '');
  f('vv-cos', data ? data.costo : '');
  f('vv-gui', data ? data.guia : '');
  f('vv-cob', data ? data.cobro : 'cobrado');
  f('vv-ffac', data ? data.fechaFactura : '');
  f('vv-dias', data ? data.diasVencidos : 0);

  cUtil();
  const ovEl = document.getElementById('ov-v');
  if (ovEl) ovEl.classList.add('on');
}

function autoCl() {
  const n = document.getElementById('vv-csel')?.value;
  if (n) {
    const clEl = document.getElementById('vv-cl');
    if (clEl) clEl.value = n;
  }
  const c = clientes.find(x => x.nombre === n);
  if (c) {
    const facEl = document.getElementById('vv-fac');
    const respEl = document.getElementById('vv-resp');
    if (facEl) facEl.value = c.tipo || 'con';
    if (respEl) respEl.value = c.responsable || '';
  }
}

function cUtil() {
  const t = parseFloat(document.getElementById('vv-tot')?.value) || 0;
  const c = parseFloat(document.getElementById('vv-cos')?.value) || 0;
  const u = document.getElementById('vv-uti');
  if (u) u.value = fmt(t - c);
}

function editV(id) {
  const v = ventas.find(x => x.id === id);
  if (v) openVentaModal(v);
}

function saveVenta() {
  const g = id => (document.getElementById(id)?.value || '').trim();
  const cliente = g('vv-cl') || g('vv-csel');

  if (!g('vv-fecha') || !cliente || !g('vv-resp')) {
    toast('⚠ Completa los campos obligatorios');
    return;
  }

  const v = {
    id: eVId || Date.now(),
    fecha: g('vv-fecha'),
    reporte: g('vv-rep'),
    cliente,
    responsable: g('vv-resp'),
    cantidad: parseInt(g('vv-cant')) || 1,
    status: g('vv-st'),
    factura: g('vv-fac'),
    total: parseFloat(g('vv-tot')) || 0,
    costo: parseFloat(g('vv-cos')) || 0,
    guia: g('vv-gui'),
    cobro: g('vv-cob'),
    fechaFactura: g('vv-ffac'),
    diasVencidos: parseInt(g('vv-dias')) || 0
  };

  if (eVId) {
    ventas = ventas.map(x => x.id === eVId ? v : x);
    toast('✅ Venta actualizada');
  } else {
    ventas.unshift(v);
    toast('✅ Venta registrada');
  }

  if (!clientes.find(c => c.nombre === cliente)) {
    clientes.push({
      id: Date.now() + 1,
      nombre: cliente,
      tipo: g('vv-fac'),
      responsable: g('vv-resp'),
      rfc: '',
      tel: '',
      email: '',
      credito: 0,
      diasCred: 30,
      direccion: '',
      notas: ''
    });
  }

  sv();
  closeOv('ov-v');
  renderV();
}

function delV(id) {
  if (!confirm('¿Eliminar esta venta?')) return;
  ventas = ventas.filter(v => v.id !== id);
  sv();
  toast('🗑 Venta eliminada');
  renderV();
}

// ═════════════════════════════════════════════════════════════════
// MODAL HANDLERS - ALMACÉN
// ═════════════════════════════════════════════════════════════════

function setView(v) {
  almView = v;
  const cardsEl = document.getElementById('vt-cards');
  const tableEl = document.getElementById('vt-table');
  if (cardsEl) cardsEl.classList.toggle('on', v === 'cards');
  if (tableEl) tableEl.classList.toggle('on', v === 'table');
  renderA();
}

function openAlmModal(data) {
  eAId = data ? data.id : null;
  const titleEl = document.getElementById('am-t');
  if (titleEl) titleEl.textContent = data ? 'Editar Producto' : 'Nuevo Producto';

  const f = (id, v) => {
    const e = document.getElementById(id);
    if (e) e.value = v ?? '';
  };

  f('aa-nom', data?.nombre || '');
  f('aa-sku', data?.sku || '');
  f('aa-cat', data?.categoria || '');
  f('aa-stk', data?.stock ?? 0);
  f('aa-min', data?.min ?? 5);
  f('aa-max', data?.max ?? 100);
  f('aa-cos', data?.costo || '');
  f('aa-pre', data?.precio || '');
  f('aa-not', data?.notas || '');

  const ovEl = document.getElementById('ov-a');
  if (ovEl) ovEl.classList.add('on');
}

function editA(id) {
  const p = almacen.find(x => x.id === id);
  if (p) openAlmModal(p);
}

function saveAlm() {
  const g = id => (document.getElementById(id)?.value || '').trim();

  if (!g('aa-nom')) {
    toast('⚠ El nombre es obligatorio');
    return;
  }

  const p = {
    id: eAId || Date.now(),
    nombre: g('aa-nom'),
    sku: g('aa-sku'),
    categoria: g('aa-cat'),
    stock: parseFloat(g('aa-stk')) || 0,
    min: parseFloat(g('aa-min')) || 5,
    max: parseFloat(g('aa-max')) || 100,
    costo: parseFloat(g('aa-cos')) || 0,
    precio: parseFloat(g('aa-pre')) || 0,
    notas: g('aa-not')
  };

  if (eAId) {
    almacen = almacen.map(x => x.id === eAId ? p : x);
    toast('✅ Producto actualizado');
  } else {
    almacen.unshift(p);
    toast('✅ Producto agregado');
  }

  sv();
  closeOv('ov-a');
  renderA();
}

function adjS(id, d) {
  almacen = almacen.map(p => p.id === id ? { ...p, stock: Math.max(0, (p.stock || 0) + d) } : p);
  sv();
  renderA();
}

function setS(id, val) {
  const n = Math.max(0, parseInt(val) || 0);
  almacen = almacen.map(p => p.id === id ? { ...p, stock: n } : p);
  sv();
  renderA();
}

function delA(id) {
  if (!confirm('¿Eliminar producto?')) return;
  almacen = almacen.filter(p => p.id !== id);
  sv();
  toast('🗑 Eliminado');
  renderA();
}

// ═════════════════════════════════════════════════════════════════
// MODAL HANDLERS - CLIENTES
// ═════════════════════════════════════════════════════════════════

function openClienteModal(data) {
  eCId = data ? data.id : null;
  const titleEl = document.getElementById('cm-t');
  if (titleEl) titleEl.textContent = data ? 'Editar Cliente' : 'Nuevo Cliente';

  const f = (id, v) => {
    const e = document.getElementById(id);
    if (e) e.value = v ?? '';
  };

  f('cc-nom', data?.nombre || '');
  f('cc-rfc', data?.rfc || '');
  f('cc-tel', data?.tel || '');
  f('cc-em', data?.email || '');
  f('cc-ti', data?.tipo || 'con');
  f('cc-cred', data?.credito || '');
  f('cc-dc', data?.diasCred || 30);
  f('cc-resp', data?.responsable || '');
  f('cc-dir', data?.direccion || '');
  f('cc-not', data?.notas || '');

  const ovEl = document.getElementById('ov-c');
  if (ovEl) ovEl.classList.add('on');
}

function editC(id) {
  const c = clientes.find(x => x.id === id);
  if (c) openClienteModal(c);
}

function saveCliente() {
  const g = id => (document.getElementById(id)?.value || '').trim();

  if (!g('cc-nom')) {
    toast('⚠ El nombre es obligatorio');
    return;
  }

  const c = {
    id: eCId || Date.now(),
    nombre: g('cc-nom'),
    rfc: g('cc-rfc'),
    tel: g('cc-tel'),
    email: g('cc-em'),
    tipo: g('cc-ti'),
    credito: parseFloat(g('cc-cred')) || 0,
    diasCred: parseInt(g('cc-dc')) || 30,
    responsable: g('cc-resp'),
    direccion: g('cc-dir'),
    notas: g('cc-not')
  };

  if (eCId) {
    clientes = clientes.map(x => x.id === eCId ? c : x);
    toast('✅ Cliente actualizado');
  } else {
    clientes.unshift(c);
    toast('✅ Cliente registrado');
  }

  sv();
  closeOv('ov-c');
  renderC();
}

function delC(id) {
  if (!confirm('¿Eliminar cliente?')) return;
  clientes = clientes.filter(c => c.id !== id);
  sv();
  toast('🗑 Eliminado');
  renderC();
}

// ═════════════════════════════════════════════════════════════════
// FACTURAS - VER Y ELIMINAR
// ═════════════════════════════════════════════════════════════════

function viewFactura(id) {
  const v = ventas.find(x => x.id === id);
  if (!v) return;

  const html = `<html><head><style>
    body{font-family:Arial;padding:20px;background:#f5f5f5}
    .fac{background:white;padding:40px;margin:0 auto;max-width:900px;box-shadow:0 0 20px rgba(0,0,0,0.1)}
    h1{color:#1E4F7A;margin:0}
    p{color:#666;font-size:12px;margin:2px 0}
    .hd{display:flex;justify-content:space-between;border-bottom:3px solid #1E4F7A;padding-bottom:20px;margin-bottom:20px}
    table{width:100%;border-collapse:collapse;margin:20px 0}
    th{background:#1E4F7A;color:white;padding:10px;text-align:left}
    td{padding:8px;border-bottom:1px solid #ddd}
    .tot{text-align:right;font-size:18px;font-weight:bold;color:#1E4F7A;margin-top:20px}
    @media print{body{background:white}.fac{box-shadow:none;padding:0}}
  </style></head><body><div class="fac"><div class="hd"><div><h1>${cfg.nombre}</h1><p>RFC: ${cfg.rfc}</p><p>${cfg.tel} | ${cfg.email}</p><p>${cfg.dir}</p></div><div style="text-align:right"><h2>FACTURA</h2><p>#${String(v.id).slice(-6)}</p><p>Fecha: ${v.fecha}</p></div></div><div><h3>Cliente</h3><p><strong>${v.cliente}</strong></p></div><table><tr><th>Concepto</th><th>Cantidad</th><th>Precio</th><th>Total</th></tr><tr><td>Venta</td><td>${v.cantidad}</td><td>${fmt(v.total / v.cantidad)}</td><td>${fmt(v.total)}</td></tr></table><div class="tot">TOTAL: ${fmt(v.total)}</div><p style="margin-top:30px;color:#999;font-size:11px">Estado: ${v.cobro === 'cobrado' ? 'PAGADA' : 'PENDIENTE'}</p></div></body></html>`;

  const w = window.open('', '', 'width=900,height=1000');
  w.document.write(html);
  w.document.close();
}

function printFactura(id) {
  viewFactura(id);
  setTimeout(() => { window.print(); }, 500);
}

function deleteNota(id) {
  if (!confirm('¿Estás seguro que quieres eliminar esta nota?\n\nEsta acción no se puede deshacer.')) {
    return;
  }
  ventas = ventas.filter(v => v.id !== id);
  sv();
  renderF();
  toast('✅ Nota eliminada');
}

// ═════════════════════════════════════════════════════════════════
// BADGES / STATS
// ═════════════════════════════════════════════════════════════════

function badges() {
  const vTotal = ventas.length;
  const aTotal = almacen.length;
  const cTotal = clientes.length;
  const ventasHoy = ventas.filter(v => v.fecha === today()).length;
  const stockBajo = almacen.filter(p => p.stock > 0 && p.stock <= p.min).length;
  const facPendientes = ventas.filter(v => v.factura === 'con' && v.cobro === 'pendiente').length;

  const setBadge = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setBadge('v-badge', vTotal);
  setBadge('a-badge', aTotal);
  setBadge('c-badge', cTotal);
  setBadge('f-badge', facPendientes);
}

// ═════════════════════════════════════════════════════════════════
// EXPORTAR FUNCIONES PÚBLICAS
// ═════════════════════════════════════════════════════════════════

export {
  renderV, renderA, renderC, renderF,
  renderVDebounced, renderADebounced, renderCDebounced, renderFDebounced,
  openVentaModal, autoCl, cUtil, editV, saveVenta, delV, vgp, vs2,
  setView, openAlmModal, editA, saveAlm, adjS, setS, delA,
  openClienteModal, editC, saveCliente, delC,
  viewFactura, printFactura, deleteNota,
  badges
};
