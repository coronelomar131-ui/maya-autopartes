# 🔐 Configuración de GitHub Secrets y Vercel

**Importante:** Este documento describe qué variables se necesitan para que el CI/CD funcione correctamente.

---

## 📋 Paso 1: Obtener credenciales de Vercel

### A. Obtener VERCEL_TOKEN

1. Ve a https://vercel.com/account/tokens
2. Click en "Create" 
3. Dale un nombre descriptivo: `maya-autopartes-github-actions`
4. Scope: Full Account
5. Click en "Create Token"
6. **Copia el token** (solo se mostrará una vez)

### B. Obtener VERCEL_ORG_ID y VERCEL_PROJECT_ID

1. Ve a tu proyecto en Vercel: https://vercel.com/dashboard
2. Selecciona el proyecto `maya-autopartes`
3. Settings > General
4. Busca:
   - **Project ID**: Cópialo
   - **Organization ID**: Cópialo

---

## 🔑 Paso 2: Configurar GitHub Secrets

### Ubicación en GitHub

1. Ve a tu repositorio en GitHub
2. Settings > Secrets and variables > Actions
3. Click en "New repository secret"

### Secrets a Configurar

#### 1. VERCEL_TOKEN
- **Name:** `VERCEL_TOKEN`
- **Value:** [Pega el token de Vercel]
- Click "Add secret"

#### 2. VERCEL_ORG_ID
- **Name:** `VERCEL_ORG_ID`
- **Value:** [Pega tu Organization ID]
- Click "Add secret"

#### 3. VERCEL_PROJECT_ID
- **Name:** `VERCEL_PROJECT_ID`
- **Value:** [Pega tu Project ID]
- Click "Add secret"

#### 4. SNYK_TOKEN (Opcional - para security scan)
Si quieres scans de seguridad automáticos:

1. Ve a https://snyk.io
2. Sign up / Login
3. Settings > Auth Token
4. Copy token
5. Añade en GitHub como `SNYK_TOKEN`

#### 5. SLACK_WEBHOOK_URL (Opcional - para notificaciones)
Si quieres notificaciones en Slack:

1. Ve a tu Slack workspace
2. Incoming Webhooks > Create New Webhook
3. Selecciona el canal (ej: #deployments)
4. Copia la URL del webhook
5. Añade en GitHub como `SLACK_WEBHOOK_URL`

#### 6. SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS (Opcional - para email)
Para notificaciones por email (requiere cuenta SMTP):

- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=587`
- `SMTP_USER=[tu_email@gmail.com]`
- `SMTP_PASS=[app_password_de_gmail]`

---

## 🔐 Paso 3: Configurar Variables de Entorno en Vercel

### Ubicación en Vercel

1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto `maya-autopartes`
3. Settings > Environment Variables
4. Click en "Add New"

### Variables Críticas a Configurar

Estas son las variables que Vercel necesita en producción:

```
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu_clave_publica
SUPABASE_SECRET_KEY=tu_clave_secreta
JWT_SECRET=tu_jwt_secret_muy_seguro_32_caracteres_minimo
JWT_EXPIRATION=24h
REDIS_URL=redis://tu-host:6379
REDIS_PASSWORD=tu_password_redis
SENTRY_DSN=https://xxx@sentry.io/xxx
SENTRY_ENVIRONMENT=production
SENTRY_TRACES_SAMPLE_RATE=0.1
API_URL=https://maya-api.vercel.app
CORS_ORIGIN=https://maya-autopartes.vercel.app
NODE_ENV=production
LOG_LEVEL=info
LOG_FORMAT=json
```

### Pasos para cada variable:

1. Click "Add New"
2. **Name:** (nombre de la variable)
3. **Value:** (valor real - ojo con espacios)
4. **Environment:** Selecciona "Production"
5. Click "Save"
6. Repite para cada variable

---

## ✅ Verificación

### Después de configurar los secrets en GitHub

```bash
# Ver que los secrets están configurados
# Settings > Secrets and variables > Actions

Debe mostrar:
✅ VERCEL_TOKEN
✅ VERCEL_ORG_ID
✅ VERCEL_PROJECT_ID
✅ (Otros secrets opcionales)
```

### Después de configurar env vars en Vercel

```bash
# Ver variables configuradas
# Settings > Environment Variables

Debe mostrar:
✅ SUPABASE_URL
✅ SUPABASE_KEY
✅ JWT_SECRET
✅ (Resto de variables)
```

### Test: Ejecutar GitHub Actions

1. Ve a tu repositorio
2. Actions > CI/CD Pipeline - Deploy to Vercel
3. Click "Run workflow"
4. Selecciona "main" branch
5. Click "Run workflow"

Observa los logs para confirmar:
- ✅ Secrets se cargan correctamente
- ✅ Tests pasan
- ✅ Build es exitoso
- ✅ Deploy se completa
- ✅ Health check pasa

---

## 🔒 Seguridad - Mejores Prácticas

### 1. No Commites Secrets
```bash
# ✅ Correcto
SUPABASE_URL=https://xxx.supabase.co  # En Vercel Dashboard

# ❌ Incorrecto - NUNCA hagas esto
SUPABASE_URL=https://xxx.supabase.co  # En archivo .env commitado
```

### 2. Rotación de Tokens
- [ ] Cambiar VERCEL_TOKEN cada 3 meses
- [ ] Cambiar JWT_SECRET cuando sea necesario
- [ ] Revocar tokens si hay sospechas

### 3. Revisar Acceso
- [ ] Solo dev team tiene acceso a secrets
- [ ] Logs no muestran valores de secrets

### 4. Monitoreo
- [ ] Verificar que solo GitHub Actions usa los secrets
- [ ] Alertas si alguien intenta acceder

---

## 🚀 Próximo Paso

Cuando todo esté configurado:

```bash
# Haz push a main para trigger del workflow
git commit -m "chore: setup production deployment"
git push origin main

# Monitorea el deployment
# GitHub: Actions > CI/CD Pipeline
# Vercel: Dashboard > Deployments
```

---

## 📞 Ayuda

Si algo falla:

1. **Ver logs en GitHub Actions:**
   - Tu repo > Actions > CI/CD Pipeline
   - Click en el workflow fallido
   - Expande los jobs para ver detalles

2. **Ver logs en Vercel:**
   - Vercel Dashboard > Deployments
   - Click en el deployment
   - Ver "Logs" y "Function Logs"

3. **Errores comunes:**

| Error | Causa | Solución |
|-------|-------|----------|
| `Error: VERCEL_TOKEN not found` | Secret no configurado en GitHub | Añade VERCEL_TOKEN en Settings > Secrets |
| `Unauthorized` | Token expirado o inválido | Genera nuevo token en Vercel |
| `Environment variable not found` | Var no configurada en Vercel | Añade en Vercel > Settings > Env Variables |
| `Authentication failed` | Credenciales incorrectas | Verifica valores en Vercel Dashboard |

---

## 📚 Documentación Relacionada

- **DEPLOY_PRODUCTION.md** - Guía completa de deployment
- **PRODUCTION_READY_CHECKLIST.md** - Checklist final antes de producción
- **README.md** - Descripción general del proyecto

---

**Configuración completada:** Ahora tu CI/CD está listo para producción ✅
