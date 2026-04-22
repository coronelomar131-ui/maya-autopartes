# 🚀 Guía de Deployment a Producción - Maya Autopartes

**Tiempo estimado: 5-10 minutos**

Esta guía te llevará paso a paso para deployar la app a Vercel en menos de 10 minutos.

---

## 📋 Checklist Pre-Deployment

Antes de hacer deploy, verifica estos puntos:

- [ ] Todos los tests pasan: `npm test`
- [ ] No hay errores de linting: `npm run lint`
- [ ] La aplicación construye sin errores: `npm run build`
- [ ] Tienes cuenta en Vercel (https://vercel.com)
- [ ] Tienes acceso a todas las credenciales en `.env.production`
- [ ] Las variables de entorno están configuradas en Vercel
- [ ] La rama `main` está limpia y actualizada

---

## 🔑 Paso 1: Preparar Variables de Entorno (2 min)

### Opción A: Configurar en Vercel Dashboard (Recomendado)

1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto `maya-autopartes`
3. Ve a **Settings** > **Environment Variables**
4. Añade todas las variables de `.env.production`:

```
SUPABASE_URL=your_value
SUPABASE_KEY=your_value
SUPABASE_SECRET_KEY=your_value
JWT_SECRET=your_value
REDIS_URL=your_value
SENTRY_DSN=your_value
...
```

**IMPORTANTE:** Usa "Production" environment para las variables críticas.

### Opción B: Usar CLI de Vercel

```bash
vercel env add SUPABASE_URL
vercel env add SUPABASE_KEY
vercel env add JWT_SECRET
# ... repite para cada variable
```

---

## ✅ Paso 2: Verificar Configuración Local (1 min)

```bash
# Clona o descarga el proyecto
cd C:\Users\omar\maya-autopartes-working

# Instala dependencias
npm install

# Verifica que todo está bien
npm run verify
```

---

## 🔨 Paso 3: Hacer Push a la Rama Main (1 min)

```bash
# Asegúrate de estar en main
git checkout main
git pull origin main

# Verifica que tienes cambios
git status

# Haz commit si hay cambios
git add .
git commit -m "chore: prepare for production deployment"

# Push a main
git push origin main
```

**Nota:** El deploy automático se activará al hacer push a `main`.

---

## 🚢 Paso 4: Deploy Automático (GitHub Actions)

### Flujo Automático (Recomendado)

1. **GitHub Actions** ejecutará automáticamente:
   - ✅ Linting
   - ✅ Tests
   - ✅ Build verification
   - ✅ Security scan
   - ✅ Deploy a Vercel
   - ✅ Health check
   - ✅ Slack notification

2. **Ver estado del deployment:**
   - Ve a tu repositorio > **Actions**
   - Busca el workflow "CI/CD Pipeline - Deploy to Vercel"
   - Espera a que terminen todos los jobs
   - Verifica que el health check pasó ✅

### Flujo Manual (si lo necesitas)

```bash
# Login a Vercel
vercel login

# Deploy a producción
vercel --prod

# Verifica el health de la app
curl https://maya-api.vercel.app/api/health
```

---

## 🔍 Paso 5: Verificar que todo funciona (2 min)

### Test del Endpoint Health

```bash
# En Windows PowerShell
Invoke-WebRequest -Uri "https://maya-api.vercel.app/api/health" -Method GET

# O en cualquier terminal
curl https://maya-api.vercel.app/api/health
```

**Respuesta esperada:**
```json
{
  "status": "ok",
  "timestamp": "2026-04-22T...",
  "uptime": "...",
  "version": "1.0.0"
}
```

### Test de Sincronización

```bash
# Verifica que Supabase está conectado
curl https://maya-api.vercel.app/api/v1/health

# Si usas Google Drive Sync
curl https://maya-api.vercel.app/sync/status
```

---

## 📊 Paso 6: Monitorear Producción (Continuo)

### Dashboard de Vercel

1. Ve a https://vercel.com/dashboard
2. Abre tu proyecto `maya-autopartes`
3. Monitorea:
   - **Deployments**: Estado de cada deployment
   - **Analytics**: Performance, Uptime
   - **Logs**: Errores y eventos
   - **Monitoring**: CPU, Memory, Requests

### Alertas Automáticas

- **Slack**: Si configuraste webhook, recibirás notificaciones
- **GitHub**: Los issues se crean automáticamente si algo falla
- **Email**: Vercel envía notificaciones a tu email

---

## 🐛 Troubleshooting

### El deployment falló

1. **Ver logs detallados:**
   ```bash
   vercel logs
   # o en Vercel Dashboard > Deployments > Click en el deployment fallido
   ```

2. **Errores comunes:**

   | Error | Solución |
   |-------|----------|
   | `SUPABASE_URL is not defined` | Verifica que las variables estén en Settings > Env Variables |
   | `Cannot find module` | Ejecuta `npm install` y `npm run build` localmente |
   | `Health check failed` | Espera 30-60 segundos y luego reinicia el health check |
   | `Port 5000 already in use` | Es normal en Vercel, ignora. El puerto se asigna automáticamente |

3. **Rollback de emergencia:**
   ```bash
   # Ve a Vercel Dashboard > Deployments
   # Selecciona el deployment anterior exitoso
   # Click en "Promote to Production"
   ```

### La app está lenta

1. Verifica **Analytics** en Vercel Dashboard
2. Revisa **Function Logs** para errores
3. Aumenta memoria en `vercel.json`:
   ```json
   "functions": {
     "backend/**/*.js": {
       "memory": 2048
     }
   }
   ```

### No se sincroniza con Supabase

1. Verifica las credenciales en `.env.production`:
   ```bash
   # Debe contener URL y KEY correctas
   SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_KEY=eyJhbGc...
   ```

2. Test manual:
   ```bash
   curl -H "Authorization: Bearer YOUR_JWT" \
        https://maya-api.vercel.app/api/v1/inventory
   ```

---

## 📝 Checklist Post-Deployment

Después de hacer deploy, verifica:

- [ ] ✅ Health check pasó: `https://maya-api.vercel.app/api/health`
- [ ] ✅ Frontend carga: `https://maya-autopartes.vercel.app`
- [ ] ✅ Login funciona
- [ ] ✅ Puedes crear/editar inventario
- [ ] ✅ Sync con Google Drive funciona
- [ ] ✅ No hay errores en Sentry
- [ ] ✅ No hay alertas en Slack
- [ ] ✅ Analytics muestran traffic normal
- [ ] ✅ Base de datos está accesible
- [ ] ✅ Credenciales están seguras (no en código, solo en Vercel)

---

## 🔐 Seguridad en Producción

**IMPORTANTE:** Verifica que:

1. **Nunca commites `.env.production` o `.env.local`**
   ```bash
   # Verifica .gitignore
   cat .gitignore | grep env
   ```

2. **Las credenciales sensibles están SOLO en Vercel**, no en el código

3. **CORS está configurado correctamente** en `vercel.json`:
   ```json
   "Access-Control-Allow-Origin": "https://maya-autopartes.vercel.app"
   ```

4. **Headers de seguridad están activos:**
   - CSP: Content-Security-Policy ✅
   - HSTS: Strict-Transport-Security ✅
   - X-Frame-Options: SAMEORIGIN ✅

---

## 🎯 Próximos Pasos

Después del primer deployment exitoso:

1. **Configurar monitoring:**
   - [ ] Sentry para error tracking
   - [ ] Slack para notificaciones
   - [ ] Uptime monitoring (pingdom, statuspage)

2. **Optimizaciones:**
   - [ ] Añadir CDN para assets estáticos
   - [ ] Configurar caching estratégico
   - [ ] Implementar rate limiting en endpoints

3. **Documentación:**
   - [ ] API docs en Swagger/OpenAPI
   - [ ] Runbooks para emergencias
   - [ ] Proceso de rollback documentado

---

## 📞 Soporte

Si algo no funciona:

1. **Ver logs:**
   - Vercel Dashboard > Deployments > Logs
   - GitHub Actions > Workflow Run > Logs

2. **Contactar:**
   - Email: coronelomar131@gmail.com
   - Slack: #deployments channel (si existe)

3. **Recursos útiles:**
   - [Vercel Docs](https://vercel.com/docs)
   - [Supabase Docs](https://supabase.com/docs)
   - [Express.js Guide](https://expressjs.com/)

---

**¡Listo! Tu app está en producción.** 🎉

Monitorea los primeros 30 minutos para asegurar que todo funciona correctamente.
