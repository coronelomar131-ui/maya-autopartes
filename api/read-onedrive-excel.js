import fetch from 'node-fetch';
import XLSX from 'xlsx';

export default async function handler(req, res) {
  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  const { oneDriveLink } = req.body;

  if (!oneDriveLink) {
    return res.status(400).json({ error: 'oneDriveLink requerido' });
  }

  try {
    // Convertir link compartido a URL descargable
    // link: https://1drv.ms/x/c/XXXXXX/YYYYYYY?e=ZZZZZZ
    // Para OneDrive, agregar download=1
    let downloadUrl = oneDriveLink;
    if (oneDriveLink.includes('?')) {
      downloadUrl = oneDriveLink.replace('?', '?download=1&');
    } else {
      downloadUrl = oneDriveLink + '?download=1';
    }

    console.log('Descargando Excel desde:', downloadUrl);

    // Descargar el archivo
    let response = await fetch(downloadUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      },
      redirect: 'follow'
    });

    if (!response.ok) {
      console.error('Error al descargar (con download=1):', response.status, response.statusText);

      // Intentar sin download=1
      console.log('Intentando sin download=1...');
      response = await fetch(oneDriveLink, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`Error al descargar: ${response.status}`);
      }
    }

    const buffer = await response.buffer();
    return parseAndReturn(buffer, res);

  } catch (error) {
    console.error('Error:', error.message);
    return res.status(500).json({
      error: 'Error al leer Excel de OneDrive',
      details: error.message
    });
  }
}

function parseAndReturn(buffer, res) {
  try {
    // Verificar que sea un archivo válido (mínimo 100 bytes)
    if (!buffer || buffer.length < 100) {
      throw new Error('Archivo muy pequeño o vacío. Verifica que el link sea un Excel válido.');
    }

    // Verificar si parece HTML (comienza con <)
    const firstChar = String.fromCharCode(buffer[0]);
    if (firstChar === '<') {
      console.error('Archivo descargado es HTML, no Excel');
      throw new Error('El link descargó HTML en lugar de un archivo Excel. Verifica que sea un link de descarga directo.');
    }

    // Parsear Excel
    let workbook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer', cellFormula: false });
    } catch (xlsxError) {
      console.error('Error al parsear Excel:', xlsxError.message);
      throw new Error(`Error al parsear Excel: ${xlsxError.message}. Verifica que sea un archivo Excel válido (.xlsx o .xls)`);
    }

    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
      throw new Error('El archivo Excel no tiene hojas. Verifica el archivo.');
    }

    const sheetName = workbook.SheetNames[0]; // Primera hoja
    const worksheet = workbook.Sheets[sheetName];

    // Convertir a JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    console.log(`Leído ${data.length} filas del Excel`);

    // Agrupar por VENDEDOR
    const facturasPorVendedor = {
      'Estefanya': [],
      'Josué': [],
      'Otros': []
    };

    data.forEach(row => {
      // Normalizar vendedor
      const vendedor = (row.VENDEDOR || '').trim();

      // Crear objeto de factura
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

      // Distribuir por vendedor
      if (vendedor.includes('Estefanya') || vendedor.includes('estefanya')) {
        facturasPorVendedor['Estefanya'].push(factura);
      } else if (vendedor.includes('Josué') || vendedor.includes('josue') || vendedor.includes('Josue')) {
        facturasPorVendedor['Josué'].push(factura);
      } else {
        facturasPorVendedor['Otros'].push(factura);
      }
    });

    return res.status(200).json({
      success: true,
      total: data.length,
      facturas: facturasPorVendedor,
      rawData: data // Para debug
    });

  } catch (error) {
    console.error('Error al parsear Excel:', error.message);
    return res.status(500).json({
      error: 'Error al parsear Excel',
      details: error.message
    });
  }
}
