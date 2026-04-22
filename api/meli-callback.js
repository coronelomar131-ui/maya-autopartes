/**
 * api/meli-callback.js - Serverless Function for MercadoLibre OAuth Callback
 * ═════════════════════════════════════════════════════════════════
 *
 * Endpoint: /api/meli-callback
 * Métodos: POST (recibe authorization code desde MELI)
 *
 * Flujo:
 * 1. MELI redirige a: https://maya-autopartes.vercel.app/api/meli-callback?code=ABC&state=xyz
 * 2. Frontend intercepta y llama a esta función
 * 3. Function intercambia code por access_token
 * 4. Retorna token al frontend (que lo guarda en localStorage)
 *
 * NOTA: Este archivo es OPCIONAL. El módulo mercadolibre-sync.js puede
 * hacer el intercambio desde el frontend directamente (CORS está habilitado).
 *
 * Para seguridad adicional en producción, usar este endpoint en backend.
 *
 * @version 1.0.0
 * @last-update 2026-04-22
 */

// Variables de entorno requeridas (configurar en Vercel):
// MELI_CLIENT_ID=tu_client_id
// MELI_CLIENT_SECRET=tu_client_secret
// MELI_REDIRECT_URI=https://maya-autopartes.vercel.app/api/meli-callback

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', 'https://maya-autopartes.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, state } = req.body;

    // Validar parámetros
    if (!code) {
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    if (!state) {
      return res.status(400).json({ error: 'Missing state parameter' });
    }

    // Obtener credenciales desde variables de entorno
    const clientId = process.env.MELI_CLIENT_ID;
    const clientSecret = process.env.MELI_CLIENT_SECRET;
    const redirectUri = process.env.MELI_REDIRECT_URI || 'https://maya-autopartes.vercel.app/api/meli-callback';

    if (!clientId || !clientSecret) {
      console.error('❌ Missing MELI credentials in environment variables');
      return res.status(500).json({
        error: 'Server configuration error',
        message: 'MELI_CLIENT_ID or MELI_CLIENT_SECRET not set',
      });
    }

    // Intercambiar code por token
    console.log('🔄 Intercambiando code por token...');

    const tokenResponse = await fetch('https://api.mercadolibre.com.mx/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      console.error('❌ Token exchange failed:', error);

      return res.status(tokenResponse.status).json({
        error: 'Token exchange failed',
        details: error,
      });
    }

    const tokenData = await tokenResponse.json();

    // Obtener información del usuario
    console.log('👤 Obteniendo información del usuario...');

    const userResponse = await fetch('https://api.mercadolibre.com/users/me', {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userResponse.ok) {
      console.error('❌ Failed to fetch user info');

      return res.status(userResponse.status).json({
        error: 'Failed to fetch user information',
      });
    }

    const userData = await userResponse.json();

    console.log('✅ Autenticación exitosa!');
    console.log('User ID:', userData.id);
    console.log('Nickname:', userData.nickname);

    // Retornar datos al frontend
    return res.status(200).json({
      success: true,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_in: tokenData.expires_in,
      user_id: userData.id,
      nickname: userData.nickname,
      email: userData.email,
    });

  } catch (e) {
    console.error('❌ Error en callback:', e);

    return res.status(500).json({
      error: 'Internal server error',
      message: e.message,
    });
  }
}

/**
 * ═════════════════════════════════════════════════════════════════
 * CÓMO USAR ESTE ENDPOINT
 * ═════════════════════════════════════════════════════════════════
 *
 * 1. Configurar en Vercel:
 *    - Ir a Vercel Dashboard → Settings → Environment Variables
 *    - Agregar:
 *      MELI_CLIENT_ID=tu_client_id
 *      MELI_CLIENT_SECRET=tu_client_secret
 *      MELI_REDIRECT_URI=https://maya-autopartes.vercel.app/api/meli-callback
 *
 * 2. Configurar en MercadoLibre Developers:
 *    - Redirect URI: https://maya-autopartes.vercel.app/api/meli-callback
 *
 * 3. En el frontend (mercadolibre-sync.js):
 *    - Modificar handleMeliCallback() para llamar a este endpoint:
 *
 *    const response = await fetch('/api/meli-callback', {
 *      method: 'POST',
 *      headers: { 'Content-Type': 'application/json' },
 *      body: JSON.stringify({ code, state }),
 *    });
 *
 *    const tokenData = await response.json();
 *    // Guardar tokenData.access_token, etc
 *
 * ═════════════════════════════════════════════════════════════════
 * ALTERNATIVA: OAuth desde Frontend (sin este endpoint)
 * ═════════════════════════════════════════════════════════════════
 *
 * Si prefieres no usar backend:
 * 1. Cliente Secret se expone en frontend (menos seguro)
 * 2. El módulo mercadolibre-sync.js ya puede hacerlo directamente
 * 3. Es más rápido pero menos seguro
 *
 * Para producción, se recomienda usar este endpoint en backend.
 * ═════════════════════════════════════════════════════════════════
 */
