import axios from 'axios';
import XLSX from 'xlsx';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { oneDriveLink } = req.body;

  if (!oneDriveLink) {
    return res.status(400).json({ error: 'oneDriveLink requerido' });
  }

  try {
    console.log('📥 Descargando desde OneDrive:', oneDriveLink.substring(0, 50) + '...');

    // Agregar download=1 para forzar descarga
    let downloadUrl = oneDriveLink;
    if (oneDriveLink.includes('?')) {
      downloadUrl = oneDriveLink.replace('?', '?download=1&');
    } else {
      downloadUrl = oneDriveLink + '?download=1';
    }

    // Descargar con axios
    const response = await axios.get(downloadUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 30000,
      maxRedirects: 10
    });

    const buffer = response.data;
    console.log('✅ Archivo descargado:', buffer.length, 'bytes');

    return parseAndReturn(buffer, res);

  } catch (error) {
    console.error('❌ Error descargando:', error.message);
    return res.status(500).json({
      error: 'Error al descargar Excel de OneDrive',
      details: error.message
    });
  }
}

function parseAndReturn(buffer, res) {
  try {
    // Validar buffer
    if (!buffer || buffer.length < 100) {
      throw new Error('Archivo vacío o muy pequeño');
    }

    // Verificar si es HTML
    const text = buffer.toString('utf8', 0, 100);
    if (text.includes('<html') || text.includes('<!DOCTYPE')) {
      throw new Error('El link retornó HTML en lugar de Excel. Verifica que sea un link válido.');
    }

    console.log('📖 Parseando Excel...');

    // Parsear Excel
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    console.log('✅ Leído:', data.length, 'filas');

    // Agrupar por vendedor
    const facturasPorVendedor = {
      'Estefanya': [],
      'Josué': [],
      'Otros': []
    };

    data.forEach(row => {
      const vendedor = (row.VENDEDOR || '').trim();
      const vendedorLower = vendedor.toLowerCase();

      const factura = {
        numero: row.FACTURA || '',
        cliente: row.Cliente || '',
        fecha: row.Fecha || '',
        neto: parseFloat(row.Neto) || 0,
        iva: parseFloat(row.IVA) || 0,
        total: parseFloat(row.Total) || 0,
        saldo: parseFloat(row.Saldo) || 0,
        producto: row.PRODUCTO || '',
        marca: row.MARCA || '',
        piezas: row.Piezas || '',
        oc: row.OC || '',
        reporte: row.REPORTE || '',
        guia: row.GUIA || '',
        link: row.LINK || '',
        estatus: row.ESTATUS || '',
        diasVencidos: row['DIAS VENCIDOS'] || '',
        fechaPago: row['FECHA DE PAGO'] || '',
        vendedor: vendedor
      };

      // Clasificar por vendedor
      if (vendedorLower.includes('estefan') || vendedorLower.includes('estefañ')) {
        facturasPorVendedor['Estefanya'].push(factura);
      } else if (vendedorLower.includes('josue') || vendedorLower.includes('josu') || vendedorLower.includes('josé')) {
        facturasPorVendedor['Josué'].push(factura);
      } else if (vendedor) {
        facturasPorVendedor['Otros'].push(factura);
      }
    });

    console.log(`📊 Facturas: Estefanya=${facturasPorVendedor['Estefanya'].length}, Josué=${facturasPorVendedor['Josué'].length}`);

    return res.status(200).json({
      success: true,
      total: data.length,
      facturas: facturasPorVendedor
    });

  } catch (error) {
    console.error('❌ Error parseando:', error.message);
    return res.status(500).json({
      error: 'Error al parsear Excel',
      details: error.message
    });
  }
}
