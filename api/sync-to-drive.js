/**
 * Vercel Serverless Function: Sync Compac Files to Google Drive
 *
 * Deploy to Vercel:
 * 1. npm install googleapis dotenv
 * 2. Add environment variables in Vercel dashboard:
 *    - COMPAC_API_URL
 *    - COMPAC_API_KEY
 * 3. Deploy: vercel
 *
 * Usage:
 * POST /api/sync-to-drive
 * Body: { compacFileUrl, compacAuth, driveServiceAccount, driveFolderId, fileName }
 *
 * Response: { success: boolean, driveFileId: string, error?: string }
 */

const { google } = require('googleapis');
const fetch = require('node-fetch');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Solo POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      compacFileUrl,      // URL para descargar archivo de Compac
      compacAuth,         // Headers de autenticación para Compac
      driveServiceAccount, // JSON string de Google Service Account
      driveFolderId,      // ID de carpeta en Google Drive
      fileName            // Nombre del archivo a guardar
    } = req.body;

    // Validar inputs
    if (!compacFileUrl || !driveServiceAccount || !driveFolderId || !fileName) {
      return res.status(400).json({
        error: 'Missing required fields: compacFileUrl, driveServiceAccount, driveFolderId, fileName'
      });
    }

    // 1. Descargar archivo de Compac
    console.log(`⬇️ Descargando archivo de Compac: ${compacFileUrl}`);

    const compacHeaders = {
      'Content-Type': 'application/json',
      ...JSON.parse(compacAuth || '{}')
    };

    const fileResponse = await fetch(compacFileUrl, {
      method: 'GET',
      headers: compacHeaders
    });

    if (!fileResponse.ok) {
      throw new Error(`Compac API error: ${fileResponse.status} ${fileResponse.statusText}`);
    }

    const fileBuffer = await fileResponse.buffer();
    console.log(`✅ Archivo descargado: ${fileBuffer.length} bytes`);

    // 2. Autenticar con Google Drive
    console.log('🔐 Autenticando con Google Drive...');

    const serviceAccount = JSON.parse(driveServiceAccount);
    const auth = new google.auth.GoogleAuth({
      credentials: serviceAccount,
      scopes: ['https://www.googleapis.com/auth/drive.file']
    });

    const drive = google.drive({ version: 'v3', auth });
    console.log('✅ Autenticación exitosa');

    // 3. Subir archivo a Google Drive
    console.log(`📤 Subiendo archivo a Google Drive: ${fileName}`);

    const fileMetadata = {
      name: fileName,
      parents: [driveFolderId]
    };

    const media = {
      mimeType: 'application/pdf', // Ajustar según tipo de archivo
      body: require('stream').Readable.from(fileBuffer)
    };

    const uploadResponse = await drive.files.create({
      resource: fileMetadata,
      media: media,
      fields: 'id, webViewLink'
    });

    const driveFileId = uploadResponse.data.id;
    const driveLink = uploadResponse.data.webViewLink;

    console.log(`✅ Archivo subido exitosamente: ${driveFileId}`);

    return res.status(200).json({
      success: true,
      driveFileId: driveFileId,
      driveLink: driveLink,
      fileName: fileName,
      message: `✅ Archivo sincronizado a Google Drive: ${driveLink}`
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unknown error occurred'
    });
  }
};
