// ═════════════════════════════════════════════════════════════════
// MAYA AUTOPARTES - UTILS.JS
// Utility Functions: DOM, Events, Helpers
// ═════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════
// KEYBOARD & MODAL EVENTS
// ═════════════════════════════════════════════════════════════════

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.overlay.on').forEach(o => o.classList.remove('on'));
  }
});

// ═════════════════════════════════════════════════════════════════
// CLOCK / TIME
// ═════════════════════════════════════════════════════════════════

setInterval(() => {
  const n = new Date();
  const clkEl = document.getElementById('clkEl');
  if (clkEl) {
    clkEl.textContent =
      n.toLocaleDateString('es-MX', { weekday: 'short', day: '2-digit', month: 'short' }) + ' ' +
      n.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
  }
}, 1000);

// ═════════════════════════════════════════════════════════════════
// RESPONSIVE MENU BUTTON
// ═════════════════════════════════════════════════════════════════

if (window.innerWidth < 900) {
  const menuBtn = document.getElementById('menuBtn');
  if (menuBtn) menuBtn.style.display = 'flex';
}

window.addEventListener('resize', () => {
  const menuBtn = document.getElementById('menuBtn');
  if (menuBtn) menuBtn.style.display = window.innerWidth < 900 ? 'flex' : 'none';
});

// ═════════════════════════════════════════════════════════════════
// SIDEBAR TOGGLE (Mobile)
// ═════════════════════════════════════════════════════════════════

function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const overlay = document.getElementById('sideOverlay');

  if (sb) sb.style.transform = sb.style.transform === 'translateX(0px)' ? 'translateX(-100%)' : 'translateX(0px)';
  if (overlay) overlay.classList.toggle('show');
}

function closeSidebar() {
  const sb = document.getElementById('sidebar');
  const overlay = document.getElementById('sideOverlay');

  if (sb) sb.style.transform = 'translateX(-100%)';
  if (overlay) overlay.classList.remove('show');
}

// Close sidebar when overlay is clicked
const overlay = document.getElementById('sideOverlay');
if (overlay) {
  overlay.addEventListener('click', closeSidebar);
}

// Close sidebar when navigation item is clicked
document.querySelectorAll('.ni').forEach(item => {
  item.addEventListener('click', closeSidebar);
});

// ═════════════════════════════════════════════════════════════════
// NAVIGATION TABS / PAGE SWITCHING
// ═════════════════════════════════════════════════════════════════

function switchTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('[data-tab]').forEach(el => {
    el.style.display = 'none';
  });

  // Show selected tab
  const selectedTab = document.querySelector(`[data-tab="${tabName}"]`);
  if (selectedTab) {
    selectedTab.style.display = 'block';
  }

  // Update nav indicators
  document.querySelectorAll('.ni').forEach(el => {
    el.classList.remove('on');
  });

  const activeNav = document.querySelector(`.ni[data-nav="${tabName}"]`);
  if (activeNav) {
    activeNav.classList.add('on');
  }
}

// ═════════════════════════════════════════════════════════════════
// CONFIG TABS
// ═════════════════════════════════════════════════════════════════

function switchCfgTab(tabName) {
  const empresaTab = document.getElementById('cfg-empresa-tab');
  const integracionesTab = document.getElementById('cfg-integraciones-tab');

  if (empresaTab) empresaTab.style.display = tabName === 'empresa' ? 'block' : 'none';
  if (integracionesTab) integracionesTab.style.display = tabName === 'integraciones' ? 'block' : 'none';

  document.querySelectorAll('.cfg-tab').forEach(tab => {
    tab.style.color = 'var(--muted)';
    tab.style.borderBottom = 'none';
    tab.style.marginBottom = '0';
  });

  if (event && event.target) {
    event.target.style.color = 'var(--navy)';
    event.target.style.borderBottom = '3px solid var(--teal)';
    event.target.style.marginBottom = '-0.5rem';
  }
}

// ═════════════════════════════════════════════════════════════════
// LOGO UPLOAD HANDLER
// ═════════════════════════════════════════════════════════════════

function setupLogoUpload(logoInputId, previewId) {
  const logoInput = document.getElementById(logoInputId);
  const preview = document.getElementById(previewId);

  if (!logoInput || !preview) return;

  logoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      preview.innerHTML = `<img src="${base64}" style="max-width:100%;height:auto">`;

      // Store in global (handled by main app)
      window.logoBase64Cfg = base64;
    };

    reader.readAsDataURL(file);
  });
}

// ═════════════════════════════════════════════════════════════════
// DOCUMENT GENERATION (PDF, Invoice)
// ═════════════════════════════════════════════════════════════════

function generarNotaPDF(ventaId, cfg) {
  // This function should be called from main with proper context
  // Placeholder for integration with html2pdf
  console.log('📄 Generating PDF for venta:', ventaId);
}

function generarFacturaPDF(ventaId, cfg) {
  // This function should be called from main with proper context
  console.log('📄 Generating Invoice PDF for venta:', ventaId);
}

// ═════════════════════════════════════════════════════════════════
// SEARCH & FILTER HELPERS
// ═════════════════════════════════════════════════════════════════

function setupSearchInputs() {
  // Auto-trigger render on search input with debounce
  const searchInputs = document.querySelectorAll('[data-search]');

  searchInputs.forEach(input => {
    const target = input.dataset.search;
    const renderFunc = window[`render${target}`];

    if (renderFunc) {
      let timeout;
      input.addEventListener('input', () => {
        clearTimeout(timeout);
        timeout = setTimeout(renderFunc, 300);
      });
    }
  });
}

// ═════════════════════════════════════════════════════════════════
// FORM HELPERS
// ═════════════════════════════════════════════════════════════════

function resetForm(formId) {
  const form = document.getElementById(formId);
  if (form) form.reset();
}

function focusFirstInput(containerId) {
  const container = document.getElementById(containerId);
  if (container) {
    const input = container.querySelector('input, textarea, select');
    if (input) input.focus();
  }
}

// ═════════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═════════════════════════════════════════════════════════════════

function isValidEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

function isValidPhone(phone) {
  const re = /^(\+?\d{1,3})?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}$/;
  return re.test(phone);
}

function isValidRFC(rfc) {
  // Mexican RFC: 12 or 13 characters
  const re = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/;
  return re.test(rfc.toUpperCase());
}

// ═════════════════════════════════════════════════════════════════
// CURRENCY & NUMBER FORMATTING
// ═════════════════════════════════════════════════════════════════

function formatCurrency(amount) {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function formatNumber(num, decimals = 2) {
  return Number(num).toLocaleString('es-MX', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function formatPercent(value) {
  return Number(value).toLocaleString('es-MX', {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

// ═════════════════════════════════════════════════════════════════
// DATE HELPERS
// ═════════════════════════════════════════════════════════════════

function formatDate(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function daysUntilDue(dueDate) {
  const today = new Date();
  const due = new Date(dueDate);
  const diff = due - today;
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return days;
}

function isOverdue(dueDate) {
  return daysUntilDue(dueDate) < 0;
}

// ═════════════════════════════════════════════════════════════════
// TABLE SORTING
// ═════════════════════════════════════════════════════════════════

function sortTableByColumn(tableId, columnIndex, order = 'asc') {
  const table = document.getElementById(tableId);
  if (!table) return;

  const tbody = table.querySelector('tbody');
  if (!tbody) return;

  const rows = Array.from(tbody.querySelectorAll('tr'));

  rows.sort((a, b) => {
    const aVal = a.querySelectorAll('td')[columnIndex]?.textContent || '';
    const bVal = b.querySelectorAll('td')[columnIndex]?.textContent || '';

    // Try numeric comparison first
    const aNum = parseFloat(aVal);
    const bNum = parseFloat(bVal);

    if (!isNaN(aNum) && !isNaN(bNum)) {
      return order === 'asc' ? aNum - bNum : bNum - aNum;
    }

    // Fall back to string comparison
    return order === 'asc'
      ? aVal.localeCompare(bVal, 'es')
      : bVal.localeCompare(aVal, 'es');
  });

  rows.forEach(row => tbody.appendChild(row));
}

// ═════════════════════════════════════════════════════════════════
// PRINT HELPERS
// ═════════════════════════════════════════════════════════════════

function printElement(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return;

  const printWindow = window.open('', '', 'width=800,height=600');
  printWindow.document.write(element.innerHTML);
  printWindow.document.close();
  printWindow.print();
}

function printTable(tableId, title = '') {
  const table = document.getElementById(tableId);
  if (!table) return;

  const printWindow = window.open('', '', 'width=900,height=1000');
  const html = `
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Arial; margin: 20px; }
        h1 { text-align: center; color: #1E4F7A; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background: #1E4F7A; color: white; padding: 10px; text-align: left; }
        td { padding: 8px; border-bottom: 1px solid #ddd; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      ${table.outerHTML}
      <p style="margin-top: 30px; text-align: center; color: #999; font-size: 12px;">
        Impreso el ${new Date().toLocaleString('es-MX')}
      </p>
    </body>
    </html>
  `;

  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.print();
}

// ═════════════════════════════════════════════════════════════════
// CLIPBOARD HELPERS
// ═════════════════════════════════════════════════════════════════

async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (err) {
    console.error('Failed to copy:', err);
    return false;
  }
}

async function copyElementToClipboard(elementId) {
  const element = document.getElementById(elementId);
  if (!element) return false;

  return copyToClipboard(element.textContent);
}

// ═════════════════════════════════════════════════════════════════
// EXPORT
// ═════════════════════════════════════════════════════════════════

export {
  toggleSidebar, closeSidebar, switchTab, switchCfgTab, setupLogoUpload,
  setupSearchInputs, resetForm, focusFirstInput,
  isValidEmail, isValidPhone, isValidRFC,
  formatCurrency, formatNumber, formatPercent,
  formatDate, daysUntilDue, isOverdue,
  sortTableByColumn,
  printElement, printTable,
  copyToClipboard, copyElementToClipboard,
  generarNotaPDF, generarFacturaPDF
};
