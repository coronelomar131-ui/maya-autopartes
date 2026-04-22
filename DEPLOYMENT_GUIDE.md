# 🚀 DEPLOYMENT GUIDE - Maya Autopartes

**Versión**: 3.0.0  
**Fecha**: 2026-04-22  
**Plataformas**: Vercel, GitHub Pages, Netlify  

---

## 📖 TABLA DE CONTENIDOS

1. [Preparación para Producción](#preparación-para-producción)
2. [Deploy a Vercel](#deploy-a-vercel)
3. [Deploy a GitHub Pages](#deploy-a-github-pages)
4. [Deploy a Netlify](#deploy-a-netlify)
5. [Configuración de Dominio](#configuración-de-dominio)
6. [Variables de Entorno](#variables-de-entorno)
7. [Monitoreo en Producción](#monitoreo-en-producción)
8. [Optimizaciones](#optimizaciones)
9. [Seguridad](#seguridad)
10. [Troubleshooting](#troubleshooting)

---

## 🔍 PREPARACIÓN PARA PRODUCCIÓN

### Checklist Pre-Deploy

```
ANTES DE DESPLEGAR:

Funcionalidad
□ Todas las features funcionan localmente
□ No hay console errors o warnings
□ Búsqueda es rápida (<100ms)
□ Facturas se generan correctamente
□ Exportación funciona en todos formatos

Performance
□ Lighthouse score > 90
□ Time to interactive < 1s
□ Tamaño total < 500KB

Seguridad
□ Contraseñas no están en código
□ No hay datos sensibles en localStorage sin encriptar
□ HTTPS habilitado
□ Rate limiting configurado (opcional)

Datos
□ Backup de todos los datos
□ Plan de migración si aplica
□ Usuarios de demo actualizados

Testing
□ Probado en Chrome, Firefox, Safari, Edge
□ Responsive en móvil, tablet, desktop
□ Probado en conexiones lentas
```

### Optimizaciones Previas

#### 1. Minificar Código
```bash
# Opción 1: Online
Ir a https://minifier.org
Copiar-pegar código JS/CSS
Descargar versión minificada

# Opción 2: Con Node.js
npm install -g uglify-js
uglifyjs core.js -c -m -o core.min.js
```

#### 2. Optimizar Imágenes
```bash
# Convertir a WebP (más pequeño)
ffmpeg -i imagen.png -c:v libwebp imagen.webp

# Comprimir
pngquant --quality 70-90 imagen.png -o imagen.min.png
```

#### 3. Limpiar Código
```javascript
// Remover console.log en producción
// ❌ No dejar esto
console.log('Debug info');

// ✓ O usar variable de debug
const DEBUG = false;
if (DEBUG) console.log('Debug info');
```

#### 4. Verificar Performance
```
1. Abrir DevTools (F12)
2. Ir a Lighthouse
3. Click "Analyze page load"
4. Revisar resultados
5. Objetivo: > 90 en Performance
```

---

## 🎯 DEPLOY A VERCEL

### Opción 1: Deploy Automático (Recomendado)

#### Paso 1: Preparar Repositorio
```bash
# Crear repositorio en GitHub (si no existe)
git init
git add .
git commit -m "Initial commit: Maya Autopartes"
git branch -M main
git remote add origin https://github.com/usuario/maya-autopartes.git
git push -u origin main
```

#### Paso 2: Conectar con Vercel
1. Ir a [https://vercel.com](https://vercel.com)
2. Click "Sign up" (o "Log in" si tienes cuenta)
3. Click "Continue with GitHub"
4. Autorizar Vercel a acceder a tus repos
5. Click "Import Project"
6. Seleccionar tu repositorio `maya-autopartes`
7. Click "Import"

#### Paso 3: Configuración
```
Project name: maya-autopartes
Framework: Other (es Vanilla JS)
Build command: (dejar en blanco)
Output directory: (dejar en blanco)
Environment variables: (ver sección abajo)
```

#### Paso 4: Deploy
1. Click "Deploy"
2. Esperar (30-60 segundos)
3. ¡Tu sitio está online!

**URL resultante**: `https://maya-autopartes.vercel.app`

### Opción 2: Deploy Manual

#### Usar Vercel CLI
```bash
# Instalar Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd /path/to/maya-autopartes-working
vercel

# Seguir prompts interactivas
```

### Actualizar Deploy en Vercel

Después de hacer cambios:

```bash
# 1. Commit cambios
git add .
git commit -m "Update: [descripción]"

# 2. Push a GitHub
git push origin main

# 3. Vercel se actualiza automáticamente
# (Ver en https://vercel.com/dashboard)
```

### Dominio Personalizado en Vercel

#### Agregar dominio
1. Vercel Dashboard → Tu proyecto
2. Settings → Domains
3. Agregar dominio (ej: `maya-autopartes.com`)
4. Vercel proporciona nameservers
5. Configurar en registrador de dominio

---

## 🐙 DEPLOY A GITHUB PAGES

### Opción 1: Repositorio Usuario (Recomendado)

#### Paso 1: Crear Repositorio
En GitHub:
```
Crear nuevo repositorio: [USUARIO].github.io
(donde USUARIO es tu username de GitHub)
```

#### Paso 2: Push código
```bash
cd maya-autopartes-working
git init
git add .
git commit -m "Initial: Maya Autopartes"
git branch -M main
git remote add origin https://github.com/USUARIO/USUARIO.github.io.git
git push -u origin main
```

#### Paso 3: Habilitación automática
GitHub Pages se habilita automáticamente para repositorio `USUARIO.github.io`.

**Tu sitio estará en**: `https://USUARIO.github.io`

### Opción 2: Repositorio Proyecto

#### Paso 1: Crear Repositorio
```
Nombre: maya-autopartes
```

#### Paso 2: Habilitar Pages
1. GitHub → Tu repositorio
2. Settings → Pages
3. Source: main branch
4. Folder: / (root)
5. Click Save

#### Paso 3: Actualizar `index.html`
```html
<!-- Si usas rutas relativas, debes ajustar -->
<!-- Para repo: github.com/usuario/maya-autopartes -->

<!-- Cambiar todos los imports a rutas relativas -->
<script type="module">
  import { ... } from './core.js';  // ✓ Relativo
  // NO: import { ... } from '/core.js';  // ✗ Absoluto
</script>
```

#### Paso 4: Push código
```bash
git add .
git commit -m "Initial: Maya Autopartes"
git push origin main
```

**Tu sitio estará en**: `https://USUARIO.github.io/maya-autopartes`

### Actualizar en GitHub Pages

```bash
# 1. Hacer cambios locales
# 2. Commit
git add .
git commit -m "Update: [descripción]"

# 3. Push
git push origin main

# 4. GitHub Pages se actualiza automáticamente (2-5 min)
```

---

## 🎨 DEPLOY A NETLIFY

### Método 1: Drag & Drop (Más Fácil)

#### Paso 1: Preparar
1. Comprime la carpeta del proyecto:
   ```
   maya-autopartes-working.zip
   ```

#### Paso 2: Subir
1. Ir a [https://netlify.com](https://netlify.com)
2. Click "Log in" o "Sign up"
3. Sin moverse de home, **arrastra el ZIP**
4. O click "Browse to upload"
5. Selecciona tu ZIP

#### Paso 3: Deploy automático
Netlify despliega en segundos.

**URL resultante**: `https://random-name.netlify.app`

### Método 2: GitHub Integration (Más Profesional)

#### Paso 1: Conectar GitHub
1. [https://netlify.com](https://netlify.com)
2. Click "New site from Git"
3. Click "GitHub"
4. Autorizar Netlify

#### Paso 2: Seleccionar repositorio
1. Buscar `maya-autopartes`
2. Click para seleccionar

#### Paso 3: Configuración
```
Build command: (dejar vacío para Vanilla JS)
Publish directory: . (carpeta raíz)
```

#### Paso 4: Deploy
Click "Deploy site"

### Dominio en Netlify

#### Opción 1: Cambiar nombre Netlify
1. Dashboard → Tu sitio
2. Site settings → General
3. Change site name: `maya-autopartes`
4. Nueva URL: `maya-autopartes.netlify.app`

#### Opción 2: Dominio personalizado
1. Domain settings
2. Add domain
3. Agregar tu dominio
4. Seguir instrucciones para DNS

---

## 🔐 CONFIGURACIÓN DE DOMINIO

### Comprar Dominio
Registradores recomendados:
- **GoDaddy** - Más barato
- **Namecheap** - Privacidad incluida
- **Google Domains** - Integrado con Google

### Configurar DNS

#### Ejemplo: Para Vercel
```
Registrador (ej: GoDaddy):
1. Ir a Mis dominios
2. Seleccionar dominio
3. Gestionar DNS
4. Agregar registros:

Type: A
Name: @
Value: 76.76.19.165  (IP de Vercel)

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

Cambios DNS tardan 24-48 horas en propagar.

#### Verificar DNS
```bash
# En terminal
nslookup maya-autopartes.com
# Debe mostrar IP de Vercel
```

---

## 🔑 VARIABLES DE ENTORNO

### En Vercel

#### Paso 1: Crear archivo
NO incluir en repositorio:
```
.env.local (gitignored)
```

Contenido:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_KEY=your-anon-key
VITE_API_KEY=your-api-key
```

#### Paso 2: Agregar a Vercel
1. Vercel Dashboard → Tu proyecto
2. Settings → Environment Variables
3. Agregar cada variable:
   - Name: `VITE_SUPABASE_URL`
   - Value: `https://...`
   - Environments: ✓ Production, ✓ Preview

#### Paso 3: Usar en código
```javascript
// core.js
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = process.env.VITE_SUPABASE_KEY;
```

### En GitHub Pages

GitHub Pages no soporta variables de entorno tradicionales.
**Alternativa**: Crear archivo de configuración:

```javascript
// config.js (NO incluir en git si tiene secretos)
export const CONFIG = {
  SUPABASE_URL: 'https://...',
  SUPABASE_KEY: '...'
};
```

Luego importar:
```javascript
import { CONFIG } from './config.js';
const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
```

### Secretos en GitHub Actions

Para CI/CD:
```yaml
# .github/workflows/deploy.yml
name: Deploy
on: [push]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Build
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_KEY: ${{ secrets.SUPABASE_KEY }}
        run: npm run build
```

---

## 📊 MONITOREO EN PRODUCCIÓN

### Monitoreo de Performance

#### Google Analytics
```html
<!-- En index.html -->
<script async src="https://www.googletagmanager.com/gtag/js?id=GA_MEASUREMENT_ID"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'GA_MEASUREMENT_ID');
</script>
```

#### Lighthouse CI
```bash
npm install -g @lhci/cli
lhci autorun

# Genera reportes de performance
```

### Error Tracking

#### Sentry
```html
<script src="https://browser.sentry-cdn.com/7.0.0/bundle.min.js"></script>
<script>
  Sentry.init({
    dsn: "https://[email protected]/...",
    environment: "production"
  });
</script>
```

### Logs en Producción

```javascript
// Reemplazar console.log en producción
function log(msg, data) {
  if (typeof gtag !== 'undefined') {
    gtag('event', 'log', { message: msg, data: JSON.stringify(data) });
  }
  console.log(msg, data);
}
```

### Uptime Monitoring

Servicios gratuitos:
- **UptimeRobot** - Verifica disponibilidad cada 5 min
- **Pingdom** - Monitoreo básico
- **StatusPage** - Dashboard público

---

## ⚡ OPTIMIZACIONES

### Compresión Gzip

#### En Vercel (Automático)
Vercel comprime automáticamente archivos > 1KB.

#### En GitHub Pages (No soportado nativamente)
Considera Cloudflare:
1. Crear cuenta en cloudflare.com
2. Agregar dominio
3. Cambiar nameservers
4. Cloudflare activa Gzip automáticamente

### Caché Browser

```javascript
// Agregar headers en vercel.json
{
  "headers": [
    {
      "source": "/static/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### CDN para Assets

```html
<!-- CDN para librerías -->
<script src="https://cdn.jsdelivr.net/npm/xlsx@latest/dist/xlsx.min.js"></script>
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js"></script>

<!-- CSS desde CDN -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5/dist/css/bootstrap.min.css">
```

---

## 🔒 SEGURIDAD

### HTTPS
Todos los servicios (Vercel, GitHub Pages, Netlify) incluyen HTTPS gratis.

### Encriptación de Datos Sensibles

```javascript
// Instalar librería
// <script src="https://cdn.jsdelivr.net/npm/crypto-js@4.1.0/crypto-js.min.js"></script>

function encryptPassword(password) {
  return CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
}

function decryptPassword(encrypted) {
  return CryptoJS.AES.decrypt(encrypted, SECRET_KEY).toString(CryptoJS.enc.Utf8);
}
```

### Content Security Policy (CSP)

```
Vercel vercel.json:
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "Content-Security-Policy",
          "value": "default-src 'self'; script-src 'self' 'unsafe-inline' cdn.jsdelivr.net"
        }
      ]
    }
  ]
}
```

### Ocultar Variables Sensibles

```javascript
// ❌ NO HACER
const API_KEY = 'sk_live_abc123xyz';  // ¡Público!

// ✓ HACER
const API_KEY = process.env.VITE_API_KEY;  // Desde env var
```

### Rate Limiting

Para proteger de abuso:

```javascript
// Simple rate limiter
const requests = {};

function rateLimit(key, maxRequests = 10, timeWindow = 60000) {
  const now = Date.now();
  if (!requests[key]) requests[key] = [];
  
  requests[key] = requests[key].filter(t => now - t < timeWindow);
  
  if (requests[key].length >= maxRequests) {
    throw new Error('Rate limit exceeded');
  }
  
  requests[key].push(now);
}
```

---

## 🐛 TROUBLESHOOTING

### Problema: "Page not found" después de deploy

**Causa**: Rutas relativas incorrectas

**Solución**:
```html
<!-- En index.html, usar rutas relativas -->
<link rel="stylesheet" href="./styles.css">
<script type="module" src="./core.js"></script>

<!-- NO usar raíz absoluta -->
<!-- <link rel="stylesheet" href="/styles.css">  ✗ -->
```

### Problema: localStorage no funciona

**Causa**: Navegador incógnito o sin permisos

**Solución**:
```javascript
// Verificar disponibilidad
function isStorageAvailable(type) {
  try {
    const storage = window[type];
    storage.setItem('test', 'test');
    storage.removeItem('test');
    return true;
  } catch(e) {
    return false;
  }
}

if (isStorageAvailable('localStorage')) {
  // Usar localStorage
} else {
  // Usar alternativa (memoria)
}
```

### Problema: Supabase no sincroniza

**Causa**: Credenciales inválidas o red

**Solución**:
```javascript
// Verificar conexión
async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('ventas')
      .select('count(*)')
      .limit(1);
    
    if (error) throw error;
    console.log('✓ Supabase conectado');
  } catch (err) {
    console.error('✗ Error Supabase:', err.message);
  }
}
```

### Problema: Actualizaciones no aparecen

**Causa**: Cache del navegador

**Solución**:
```bash
# En navegador:
Ctrl+Shift+Delete (abrir Clean Cache)
O Ctrl+Shift+R (hard refresh)

# En terminal:
npm install -g surge
surge --domain maya-autopartes.surge.sh --project ./ --no-cache
```

### Problema: PDF no se descarga

**Causa**: Headers Content-Disposition no configurados

**Solución**:
```javascript
function downloadFile(content, filename) {
  const blob = new Blob([content], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
```

### Problema: Lentitud en producción

**Causa**: Código sin optimizar

**Solución**:
```javascript
// Usar Lighthouse
1. DevTools → Lighthouse
2. Analizar
3. Seguir recomendaciones

// Minificar
uglifyjs core.js -c -m -o core.min.js

// Usar CDN
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/...">
```

---

## 🔄 CI/CD AUTOMÁTICO

### GitHub Actions

Crear archivo `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Vercel

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
```

### Testing Antes de Deploy

```yaml
- name: Test
  run: npm test

- name: Lighthouse
  run: |
    npm install -g @lhci/cli
    lhci autorun
```

---

## 📋 CHECKLIST DE DEPLOY

```
□ Código está en GitHub
□ Ningún console.log en código
□ Variables sensibles en .env
□ Lighthouse score > 90
□ Probado en móvil
□ Probado en navegadores principales
□ Backup de datos realizados
□ README actualizado
□ Documentación completa
□ Dominio configurado (si aplica)
□ SSL/HTTPS verificado
□ Monitoreo configurado
□ Plan de rollback preparado
```

---

## 📞 SOPORTE DEPLOY

### Vercel
- Documentación: https://vercel.com/docs
- Soporte: support@vercel.com

### GitHub Pages
- Documentación: https://pages.github.com
- Issues: GitHub Community

### Netlify
- Documentación: https://docs.netlify.com
- Support: support@netlify.com

---

## 🎯 SIGUIENTES PASOS

1. **Antes de deploy**
   - Revisar checklist
   - Hacer backup de datos
   - Optimizar código

2. **Deploy**
   - Elegir plataforma (Vercel recomendado)
   - Seguir pasos específicos
   - Verificar URL funcionando

3. **Post-deploy**
   - Configurar dominio
   - Agregar analytics
   - Configurar monitoreo
   - Entrenar usuarios

4. **Mantenimiento**
   - Revisar logs regularmente
   - Actualizar dependencias
   - Backup automático
   - Performance monitoring

---

**Versión**: 3.0.0  
**Última actualización**: 2026-04-22  
**Siguiente paso**: Elegir plataforma y desplegar
