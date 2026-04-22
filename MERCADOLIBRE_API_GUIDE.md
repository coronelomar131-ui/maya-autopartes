# MercadoLibre API Guide - Referencia Técnica

**Documento Técnico para Desarrolladores**

## 📋 Tabla de Contenidos

1. [Overview API](#overview-api)
2. [Autenticación OAuth 2.0](#autenticación-oauth-20)
3. [Endpoints Principales](#endpoints-principales)
4. [Rate Limits y Cuotas](#rate-limits-y-cuotas)
5. [Estructura de Datos](#estructura-de-datos)
6. [Manejo de Errores](#manejo-de-errores)
7. [Ejemplos de Código](#ejemplos-de-código)
8. [Best Practices](#best-practices)

---

## Overview API

### URLs Base

```
API REST: https://api.mercadolibre.com
Auth (México): https://auth.mercadolibre.com.mx
Token URL: https://api.mercadolibre.com.mx/oauth/token
```

### Versión

- **v2** (Actual, recomendada)
- Docs: https://developers.mercadolibre.com/es_mx/items-and-listings

### Headers Estándar

```http
Authorization: Bearer {access_token}
Content-Type: application/json
Accept: application/json
```

---

## Autenticación OAuth 2.0

### Flow: Authorization Code

```
┌─────────────┐                          ┌──────────────┐
│   App       │                          │ MercadoLibre │
│ (Browser)   │                          │   OAuth      │
└──────┬──────┘                          └──────┬───────┘
       │                                        │
       │ 1. Redirigir a /authorization        │
       ├───────────────────────────────────────>│
       │                                        │
       │                2. Usuario autoriza
       │                                        │
       │  3. Redirigir a callback + code    │
       │<───────────────────────────────────────┤
       │                                        │
       │ 4. POST /oauth/token con code       │
       ├───────────────────────────────────────>│
       │                                        │
       │<──────── 5. Retorna access_token ──────┤
       │
```

### 1. Generar URL de Autorización

```javascript
const authUrl = new URL('https://auth.mercadolibre.com.mx/authorization');
authUrl.searchParams.append('response_type', 'code');
authUrl.searchParams.append('client_id', CLIENT_ID);
authUrl.searchParams.append('redirect_uri', REDIRECT_URI);
authUrl.searchParams.append('state', STATE_TOKEN); // Para CSRF prevention

window.location.href = authUrl.toString();
// Ejemplo:
// https://auth.mercadolibre.com.mx/authorization?response_type=code&client_id=xxx&redirect_uri=https://...&state=abc123
```

### 2. Interceptar Callback y Obtener Token

```javascript
// En callback URL: https://maya-autopartes.vercel.app/auth/meli-callback?code=ABC123&state=abc123

const urlParams = new URLSearchParams(window.location.search);
const code = urlParams.get('code');
const state = urlParams.get('state');

// Verificar state (prevenir CSRF)
if (state !== localStorage.getItem('auth_state')) {
  throw new Error('Invalid state - CSRF attack detected');
}

// Intercambiar code por token (en backend/serverless)
const response = await fetch('https://api.mercadolibre.com.mx/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'authorization_code',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code: code,
    redirect_uri: REDIRECT_URI,
  }),
});

const tokenData = await response.json();
// {
//   "access_token": "APP_USR-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
//   "token_type": "bearer",
//   "expires_in": 21600,
//   "scope": "read write",
//   "user_id": 123456789,
//   "refresh_token": "TG-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
// }
```

### 3. Usar Access Token

```javascript
// Token expira en 21600 segundos (6 horas)
// Guardar expires_at = Date.now() + (expires_in * 1000)

// Para requests autenticados:
const response = await fetch('https://api.mercadolibre.com/users/me', {
  headers: {
    'Authorization': `Bearer ${access_token}`,
  },
});
```

### 4. Refrescar Token

```javascript
// Cuando falta menos de 1 minuto para expirar:
const response = await fetch('https://api.mercadolibre.com.mx/oauth/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    grant_type: 'refresh_token',
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    refresh_token: refresh_token,
  }),
});

// Retorna nuevo access_token y refresh_token
```

---

## Endpoints Principales

### Usuarios

#### GET /users/me
Obtener información del usuario autenticado

```javascript
// Request
GET https://api.mercadolibre.com/users/me
Authorization: Bearer {token}

// Response 200 OK
{
  "id": 123456789,
  "nickname": "mayaautopartes",
  "registration_date": "2020-01-15T10:00:00.000-04:00",
  "country_id": "MX",
  "email": "info@mayaautopartes.com",
  "phone": { "number": "5512345678" }
}
```

### Publicaciones

#### GET /users/{user_id}/listings
Obtener todas las publicaciones del usuario

```javascript
// Request
GET https://api.mercadolibre.com/users/123456789/listings
Authorization: Bearer {token}

// Response 200 OK
[
  {
    "id": "MLM1234567890",
    "title": "Puerta Delantera Izquierda Auto",
    "price": 1250.00,
    "currency_id": "MXN",
    "available_quantity": 3,
    "status": "active",
    "seller_id": 123456789
  },
  ...
]

// Parámetros opcionales
?offset=0&limit=50&search=puerta
```

#### GET /items/{item_id}
Obtener detalles de una publicación específica

```javascript
// Request
GET https://api.mercadolibre.com/items/MLM1234567890
Authorization: Bearer {token}

// Response 200 OK
{
  "id": "MLM1234567890",
  "title": "Puerta Delantera Izquierda Auto",
  "category_id": "MLM6055",
  "official_store_id": null,
  "price": 1250.00,
  "currency_id": "MXN",
  "available_quantity": 3,
  "sold_quantity": 5,
  "condition": "new",
  "listing_type_id": "gold_special",
  "description": "...",
  "seller_sku": "MA-H1C1R1-42XYZQ",
  "attributes": [...],
  "pictures": [...]
}
```

#### POST /items
Crear nueva publicación

```javascript
// Request
POST https://api.mercadolibre.com/items
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Puerta Delantera Izquierda Auto",
  "category_id": "MLM6055",
  "price": 1250.00,
  "currency_id": "MXN",
  "available_quantity": 10,
  "buying_mode": "buy_it_now",
  "listing_type_id": "gold_special",
  "condition": "new",
  "description": "Descripción del producto...",
  "seller_sku": "MA-XXXXX",
  "attributes": [
    {
      "id": "BRAND",
      "value_name": "Genérica"
    }
  ],
  "pictures": [
    {
      "source": "https://..."
    }
  ]
}

// Response 201 Created
{
  "id": "MLM9876543210",
  "title": "Puerta Delantera Izquierda Auto",
  "permalink": "https://www.mercadolibre.com.mx/...",
  ...
}
```

#### PUT /items/{item_id}
Actualizar publicación existente

```javascript
// Request
PUT https://api.mercadolibre.com/items/MLM1234567890
Authorization: Bearer {token}
Content-Type: application/json

{
  "title": "Puerta Delantera Izquierda Auto - Nueva Versión",
  "price": 1350.00,
  "description": "Descripción actualizada..."
}

// Response 200 OK
```

#### PUT /items/{item_id}/available_quantity
Actualizar disponibilidad (stock)

```javascript
// Request
PUT https://api.mercadolibre.com/items/MLM1234567890/available_quantity
Authorization: Bearer {token}
Content-Type: application/json

{
  "available_quantity": 5
}

// Response 200 OK
{
  "id": "MLM1234567890",
  "available_quantity": 5
}
```

#### DELETE /items/{item_id}
Cerrar una publicación

```javascript
// Request
DELETE https://api.mercadolibre.com/items/MLM1234567890
Authorization: Bearer {token}

// Response 200 OK
```

### Categorías

#### GET /categories/{category_id}
Obtener información de categoría (incluye atributos)

```javascript
// Request
GET https://api.mercadolibre.com/categories/MLM6055
Authorization: Bearer {token}

// Response 200 OK
{
  "id": "MLM6055",
  "name": "Puertas para Auto",
  "attributes": [
    {
      "id": "BRAND",
      "name": "Marca",
      "type": "list",
      "values": [...],
      "tags": {
        "required": true,
        "multiple": false
      }
    }
  ]
}
```

---

## Rate Limits y Cuotas

### Límites Globales

| Límite | Valor | Período |
|--------|-------|---------|
| Requests por usuario | 600 | 1 minuto |
| Requests por app | 5000 | 1 minuto |
| Requests por IP | 10000 | 1 minuto |

### Headers de Rate Limit

Cada response incluye:

```
X-RateLimit-Limit: 600
X-RateLimit-Remaining: 585
X-RateLimit-Reset: 1640000000
```

### Manejo de 429 (Too Many Requests)

```javascript
if (response.status === 429) {
  const retryAfter = parseInt(
    response.headers.get('Retry-After') || '60'
  );
  
  console.log(`Rate limited. Retry after ${retryAfter}s`);
  await sleep(retryAfter * 1000);
  
  // Reintentar request
}
```

### Cálculo de Requests en Sync Automático

Por cada sincronización:
- **GET /users/me**: 1 request
- **GET /users/{id}/listings**: 1 request (máx 50 resultados)
- **GET /items/{id}** × N productos: N requests
- **PUT /items/{id}** × M updates: M requests
- **PUT /items/{id}/available_quantity** × K stocks: K requests

**Total estimado**: ~1 + 1 + N + M + K = 2-50 requests por sync

Con sync cada 30 minutos y 63 productos:
```
Estimado: ~70 requests/hora = 1.17 requests/minuto
✅ BIEN por debajo del límite de 600/minuto
```

---

## Estructura de Datos

### Item (Producto)

```javascript
{
  // Identificadores
  "id": "MLM1234567890",              // ID único en MELI
  "seller_sku": "MA-XXXXX",           // SKU del vendedor
  
  // Información básica
  "title": "Puerta Delantera Izquierda",
  "category_id": "MLM6055",           // Categoría
  "listing_type_id": "gold_special",  // Tipo de publicación
  "condition": "new",                 // new | used
  
  // Precios
  "price": 1250.00,
  "currency_id": "MXN",
  "original_price": null,
  
  // Stock
  "available_quantity": 5,            // Stock disponible
  "sold_quantity": 10,                // Vendidos
  
  // Descripciones
  "description": "Descripción larga...",
  
  // Atributos (variantes)
  "attributes": [
    {
      "id": "BRAND",
      "name": "Marca",
      "value_id": "123",
      "value_name": "Genérica"
    }
  ],
  
  // Imágenes
  "pictures": [
    {
      "id": "1",
      "url": "https://...",
      "source": "https://..."
    }
  ],
  
  // Metadatos
  "status": "active",                 // active | paused | closed | banned
  "permalink": "https://www.mercadolibre.com.mx/...",
  "seller_id": 123456789,
  "created_on": "2020-01-15T10:00:00Z",
  "last_updated": "2026-04-22T14:30:00Z"
}
```

### Atributos Comunes para Puertas

```javascript
{
  "id": "BRAND",
  "name": "Marca",
  "value_name": "Genérica"
}

{
  "id": "COLOR",
  "name": "Color",
  "value_name": "Transparente"
}

{
  "id": "MODEL",
  "name": "Modelo",
  "value_name": "Estándar"
}

{
  "id": "YEAR",
  "name": "Año",
  "value_name": 2020
}

{
  "id": "POSITION",
  "name": "Posición",
  "value_name": "Delantera Izquierda"
}
```

---

## Manejo de Errores

### Códigos de Error Comunes

| Código | Descripción | Solución |
|--------|-----------|----------|
| 400 | Bad Request | Validar datos enviados |
| 401 | Unauthorized | Token expirado o inválido |
| 403 | Forbidden | Permisos insuficientes |
| 404 | Not Found | Recurso no existe |
| 429 | Too Many Requests | Rate limited, esperar |
| 500 | Server Error | Reintentar después |
| 503 | Service Unavailable | Mantenimiento, reintentar |

### Estructura de Error

```javascript
{
  "message": "Invalid fields",
  "error": "bad_request",
  "status": 400,
  "cause": [
    {
      "code": "items.invalid_price",
      "message": "price cannot be negative",
      "data": {
        "attribute": "price"
      }
    }
  ]
}
```

### Manejo con Reintentos

```javascript
async function meliRequest(endpoint, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(endpoint, options);
      
      if (response.ok) {
        return await response.json();
      }
      
      if (response.status === 429) {
        const retryAfter = parseInt(
          response.headers.get('Retry-After') || '60'
        );
        await sleep(retryAfter * 1000);
        continue; // Reintentar
      }
      
      if (response.status >= 500) {
        if (i < maxRetries - 1) {
          await sleep(Math.pow(2, i) * 1000); // Exponential backoff
          continue;
        }
      }
      
      throw new Error(`MELI API error: ${response.status}`);
    } catch (e) {
      if (i === maxRetries - 1) throw e;
      await sleep(Math.pow(2, i) * 1000);
    }
  }
}
```

---

## Ejemplos de Código

### Crear Producto Completo

```javascript
async function createProductInMeli(product, token) {
  const meliProduct = {
    title: product.nombre.substring(0, 60),
    category_id: 'MLM6055', // Puertas para Auto
    price: product.precio,
    currency_id: 'MXN',
    available_quantity: product.stock,
    buying_mode: 'buy_it_now',
    listing_type_id: 'gold_special',
    condition: 'new',
    
    description: `${product.nombre}
    
${product.notas || ''}

Producto de calidad en Maya Autopartes`,

    seller_sku: product.sku,
    
    attributes: [
      {
        id: 'BRAND',
        value_name: 'Genérica',
      },
    ],
    
    pictures: [
      {
        source: product.imagen || 'https://via.placeholder.com/500',
      },
    ],
  };

  const response = await fetch('https://api.mercadolibre.com/items', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(meliProduct),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Error: ${error.message}`);
  }

  return await response.json();
}
```

### Actualizar Stock

```javascript
async function updateStockInMeli(meliId, newStock, token) {
  const response = await fetch(
    `https://api.mercadolibre.com/items/${meliId}/available_quantity`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        available_quantity: newStock,
      }),
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to update stock: ${response.status}`);
  }

  return await response.json();
}
```

### Sincronización Bidireccional

```javascript
async function syncBidirectional(localAlmacen, meliListings, token) {
  const changes = {
    created: 0,
    updated: 0,
    conflicts: [],
  };

  // 1. Actualizar productos locales que existan en MELI
  for (const listing of meliListings) {
    const detail = await getItemDetail(listing.id, token);
    
    const localProduct = localAlmacen.find(
      p => p.meliId === listing.id
    );
    
    if (localProduct) {
      // Detectar conflictos
      if (localProduct.stock !== detail.available_quantity) {
        changes.conflicts.push({
          product: localProduct.nombre,
          local: localProduct.stock,
          meli: detail.available_quantity,
        });
      }
    }
  }

  // 2. Crear/actualizar productos locales en MELI
  for (const product of localAlmacen) {
    if (product.meliId) {
      // Actualizar
      await updateProductInMeli(product.meliId, product, token);
      changes.updated++;
    } else {
      // Crear
      const result = await createProductInMeli(product, token);
      product.meliId = result.id;
      changes.created++;
    }
  }

  return changes;
}
```

---

## Best Practices

### 1. Autenticación Segura

✅ **Hacer**:
```javascript
// Guardar token con expiración
const tokenData = {
  access_token: '...',
  refresh_token: '...',
  expires_at: Date.now() + (expires_in * 1000),
};

localStorage.setItem('meli_token', JSON.stringify(tokenData));
```

❌ **No hacer**:
```javascript
// Guardar Client Secret en frontend
localStorage.setItem('client_secret', clientSecret); // ¡PELIGROSO!
```

### 2. Reintentos con Exponential Backoff

```javascript
async function retryWithBackoff(fn, maxAttempts = 3) {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt === maxAttempts - 1) throw e;
      const delay = Math.pow(2, attempt) * 1000;
      await sleep(delay);
    }
  }
}
```

### 3. Caching de Datos

```javascript
const cache = new Map();

function getCached(key, fn, maxAge = 5 * 60 * 1000) {
  const cached = cache.get(key);
  
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  
  const data = fn();
  cache.set(key, {
    data,
    expiresAt: Date.now() + maxAge,
  });
  
  return data;
}
```

### 4. Limitación de Rate Limit

```javascript
class RateLimiter {
  constructor(maxPerMinute = 600) {
    this.maxPerMinute = maxPerMinute;
    this.requests = [];
  }

  async wait() {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    
    // Limpiar requests antiguos
    this.requests = this.requests.filter(t => t > oneMinuteAgo);
    
    if (this.requests.length >= this.maxPerMinute) {
      const oldestRequest = this.requests[0];
      const waitTime = 60000 - (now - oldestRequest);
      await sleep(waitTime);
      this.requests = [];
    }
    
    this.requests.push(now);
  }
}
```

### 5. Logging y Monitoreo

```javascript
async function logSyncEvent(event) {
  const log = {
    timestamp: new Date().toISOString(),
    operation: event.operation,
    status: event.status,
    itemsAffected: event.itemsAffected,
    duration: event.duration,
    errors: event.errors || [],
  };

  // Guardar localmente
  const logs = JSON.parse(localStorage.getItem('meli_sync_logs') || '[]');
  logs.unshift(log);
  localStorage.setItem('meli_sync_logs', JSON.stringify(logs.slice(0, 100)));

  // Opcionalmente, enviar a servidor
  if (typeof fetch !== 'undefined') {
    await fetch('/api/logs/meli-sync', {
      method: 'POST',
      body: JSON.stringify(log),
    });
  }
}
```

---

## Referencias

- [MercadoLibre Developers](https://developers.mercadolibre.com/es_mx)
- [API Docs - Items](https://developers.mercadolibre.com/es_mx/items-and-listings)
- [OAuth 2.0 Flow](https://developers.mercadolibre.com/es_mx/authentication-and-authorization)
- [Error Codes](https://developers.mercadolibre.com/es_mx/docs/errors)

---

**Última actualización**: 2026-04-22
