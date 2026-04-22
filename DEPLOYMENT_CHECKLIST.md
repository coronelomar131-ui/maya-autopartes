# 🚀 DEPLOYMENT CHECKLIST - Maya Autopartes

**Checklist exhaustivo para despliegue a producción.**

**Estado:** Version 1.0 - Completo
**Fecha:** 2026-04-22
**Responsables:** DevOps, Tech Lead, Product Owner

---

## 📋 Tabla de Contenidos

1. [Pre-Deployment Verification](#pre-deployment-verification)
2. [Code Quality Checklist](#code-quality-checklist)
3. [Security Checklist](#security-checklist)
4. [Performance Checklist](#performance-checklist)
5. [Testing Checklist](#testing-checklist)
6. [Database & Data Checklist](#database--data-checklist)
7. [Infrastructure Checklist](#infrastructure-checklist)
8. [Deployment Steps](#deployment-steps)
9. [Post-Deployment Verification](#post-deployment-verification)
10. [Rollback Plan](#rollback-plan)

---

## Pre-Deployment Verification

### 48 Horas Antes del Deploy

- [ ] **Congelamiento de cambios**
  - No hacer cambios 48h antes
  - Solo bugfixes críticos permitidos

- [ ] **Comunicación al equipo**
  - Notificar fecha/hora del deploy
  - Avisar time window (ej: 2h downtime)

- [ ] **Backup de datos**
  ```bash
  # Hacer backup completo de Supabase/database
  # Guardar en ubicación segura
  # Verificar que backup es restorable
  ```

- [ ] **Notificación a usuarios**
  - Email: "Mantenimiento programado..."
  - Aviso en app (si aplica)
  - Avisar horario aproximado

---

## Code Quality Checklist

### Pre-Merge (Antes de hacer merge a main)

- [ ] **Code review completado**
  - [ ] Mínimo 2 reviewers aprobaron
  - [ ] Todos los comentarios resueltos
  - [ ] No hay "Approve with comments" sin resolver

- [ ] **Linting & Formatting**
  ```bash
  # Ejecutar linter
  npm run lint
  
  # Ejecutar prettier (si aplica)
  npm run format
  
  # Resultado: 0 errors, warnings aceptables solo si documentados
  ```

- [ ] **No hay console.log() de debug**
  - [ ] Buscar en código: `console.log`
  - [ ] Todos removidos o comentados para producción

- [ ] **No hay commented code**
  - [ ] Buscar bloques comentados
  - [ ] Remover código muerto

- [ ] **No hay TODO/FIXME sin resolver**
  - [ ] Buscar `TODO` y `FIXME`
  - [ ] Resolver o documentar en KNOWN_ISSUES.md

- [ ] **Variables y funciones con nombres significativos**
  - [ ] `x`, `f1`, `temp` → ❌ No aceptable
  - [ ] `clientName`, `calculateTotal()` → ✅ Aceptable

- [ ] **Sin console warnings/errors**
  ```bash
  # Abrir DevTools
  # F12 → Console
  # Verificar que no hay errores rojos
  ```

- [ ] **Sin unused imports o variables**
  ```bash
  # Si tienes linter que lo detecta
  npm run lint
  # Revisar y remover
  ```

---

### Build & Compilation

- [ ] **Build exitoso**
  ```bash
  npm run build
  # Resultado: 0 errors
  ```

- [ ] **Build optimizado**
  - [ ] Archivos minificados
  - [ ] Source maps generados (si aplica)
  - [ ] Assets comprimidos

- [ ] **Dist folder limpio**
  - [ ] No hay archivos innecesarios
  - [ ] Solo archivos finales

- [ ] **File size aceptable**
  - [ ] HTML/CSS/JS < 500KB combinado (idealmente)
  - [ ] Sin assets grandes innecesarios

---

## Security Checklist

### Autenticación & Autorización

- [ ] **No hay passwords en código**
  ```bash
  # Buscar en archivo: "password =", "pwd =", "pass ="
  # Resultado: 0 matches (excepto comentarios)
  ```

- [ ] **API keys en environment variables**
  - [ ] Supabase URL: `process.env.VITE_SUPABASE_URL`
  - [ ] Supabase Key: `process.env.VITE_SUPABASE_KEY`
  - [ ] MercadoLibre: `process.env.ML_TOKEN` (o similiar)
  - [ ] Nunca hardcodeados

- [ ] **Environment variables configurados**
  - [ ] `.env.production` existe (no en git)
  - [ ] Todas las claves necesarias presentes
  - [ ] Valores correctos para producción
  - [ ] No hay valores de desarrollo

- [ ] **No hay secrets en git history**
  ```bash
  # Buscar en git log
  git log -p --all -S "password" 
  git log -p --all -S "API_KEY"
  # Resultado: 0 matches en commits
  
  # Si hay, hacer git rewrite o crear nuevo repo
  ```

- [ ] **Roles y permisos testeados**
  - [ ] Admin accede a todo
  - [ ] Vendedor no accede a Usuarios
  - [ ] Gerente tiene permisos correctos
  - [ ] Logout funciona correctamente

### Validación & Sanitización

- [ ] **Inputs validados**
  - [ ] Campos requeridos se validan
  - [ ] Formato de email validado
  - [ ] Números no aceptan letras
  - [ ] XSS previsto

- [ ] **Output escapado**
  - [ ] HTML escapado antes de mostrar
  - [ ] Sin inyección de HTML/Script
  - [ ] User input nunca ejecutado como código

- [ ] **CORS configurado correctamente**
  ```javascript
  // Verificar que solo dominios permitidos pueden acceder
  // Si Supabase: verificar CORS en dashboard
  ```

### Data Protection

- [ ] **HTTPS en producción**
  - [ ] Certificado SSL válido
  - [ ] Todas las requests son HTTPS (no HTTP)
  - [ ] No hay mixed content (HTTPS + HTTP)

- [ ] **localStorage asegurado**
  - [ ] Sin datos de pago plaintext
  - [ ] Sin contraseñas almacenadas
  - [ ] Datos validados al cargar

- [ ] **Datos sensibles no en logs**
  - [ ] Búsqueda en logs: no encontrar passwords/tokens
  - [ ] Error messages no revelan detalles internos

- [ ] **Data retention policy**
  - [ ] Logs rotados (máximo 90 días)
  - [ ] Datos antiguos (> 1 año) archivados
  - [ ] GDPR compliance si aplica

---

## Performance Checklist

### Antes de Deploy

- [ ] **Lighthouse score >= 80 en mobile**
  ```bash
  # Ejecutar audit
  npm run lighthouse
  # O usar herramienta online
  
  # Resultado:
  # Performance: >= 75
  # Accessibility: >= 90
  # Best Practices: >= 80
  # SEO: >= 90
  ```

- [ ] **Load time aceptable**
  - [ ] Initial load < 2.5 segundos
  - [ ] TTI < 3 segundos
  - [ ] LCP < 2.5 segundos

- [ ] **Memory usage aceptable**
  - [ ] Base memory < 10MB
  - [ ] Con datos < 50MB
  - [ ] Sin memory leaks

- [ ] **Network optimizado**
  - [ ] Payloads comprimidos (gzip)
  - [ ] Lazy loading implementado
  - [ ] Cache headers configurados

- [ ] **No hay breaking changes en performance**
  - [ ] Comparar con baseline anterior
  - [ ] No regresiones > 10%
  - [ ] Si hay regresión, documentar razón

---

## Testing Checklist

### Manual Testing Completo

- [ ] **Funcionalidad core**
  - [ ] Login funciona
  - [ ] Crear venta funciona
  - [ ] Editar venta funciona
  - [ ] Eliminar venta funciona
  - [ ] Búsqueda funciona
  - [ ] Filtros funcionan

- [ ] **Todos los módulos**
  - [ ] Ventas: CRUD, búsqueda, filtros ✅
  - [ ] Almacén: CRUD, búsqueda, filtros ✅
  - [ ] Clientes: CRUD, búsqueda, filtros ✅
  - [ ] Facturas: Crear, imprimir, eliminar ✅
  - [ ] Usuarios: Crear, editar, roles ✅
  - [ ] Dashboard: KPIs cargan ✅
  - [ ] Exportar: Excel, CSV, JSON ✅

- [ ] **Integraciones**
  - [ ] Supabase sync funciona ✅
  - [ ] Google Drive sync funciona ✅
  - [ ] MercadoLibre sync funciona ✅

- [ ] **Responsiveness (mobile, tablet, desktop)**
  - [ ] Mobile 375px: todo funciona ✅
  - [ ] Tablet 768px: todo funciona ✅
  - [ ] Desktop 1920px: todo funciona ✅
  - [ ] Touch targets >= 44px ✅

- [ ] **Navegadores**
  - [ ] Chrome últimas 3 versiones ✅
  - [ ] Firefox últimas 3 versiones ✅
  - [ ] Safari 14+ ✅
  - [ ] Edge últimas 2 versiones ✅
  - [ ] Mobile browsers ✅

- [ ] **Edge cases**
  - [ ] Crear sin datos opcionales ✅
  - [ ] Búsqueda con caracteres especiales ✅
  - [ ] Exportar sin datos ✅
  - [ ] Importar archivo corrupto (graceful error) ✅

### Automated Testing

- [ ] **Unit tests**
  ```bash
  npm run test
  # Resultado: All tests pass
  # Coverage: >= 80% idealmente
  ```

- [ ] **E2E tests (si aplica)**
  ```bash
  npm run test:e2e
  # Resultado: All tests pass
  ```

- [ ] **Visual regression tests (si aplica)**
  ```bash
  npm run test:visual
  # Resultado: No unexpected diffs
  ```

---

## Database & Data Checklist

### Supabase / Servidor Database

- [ ] **Backup completo realizado**
  - [ ] Backup de todas las tablas
  - [ ] Guardado en ubicación segura
  - [ ] Timestamp documentado
  - [ ] Verificar que es restorable

- [ ] **Migrations aplicadas**
  ```bash
  # Si hay cambios de schema
  npm run db:migrate:prod
  # Verificar exitoso
  ```

- [ ] **Índices creados (si necesarios)**
  ```sql
  -- Crear índices en campos de búsqueda frecuente
  CREATE INDEX idx_clientes_nombre ON clientes(nombre);
  ```

- [ ] **Data integrity verificada**
  - [ ] Sin registros huérfanos
  - [ ] Sin datos duplicados
  - [ ] Relaciones intactas

- [ ] **Limpieza de datos de test**
  - [ ] Remover datos de testing
  - [ ] Limpiar registros temporales
  - [ ] Tabla está en estado limpio

---

## Infrastructure Checklist

### Hosting & Deployment

- [ ] **Hosting elegido**
  - [ ] Netlify
  - [ ] Vercel
  - [ ] GitHub Pages
  - [ ] Self-hosted
  - [ ] Otro: _______

- [ ] **Dominio registrado**
  - [ ] Dominio apunta a hosting
  - [ ] DNS propagado (puede tomar 24h)
  - [ ] Verificar con ping/nslookup

- [ ] **SSL/TLS configurado**
  - [ ] Certificado válido
  - [ ] HTTPS funciona
  - [ ] Redirect HTTP → HTTPS automático
  - [ ] Certificate expira > 30 días

- [ ] **CDN (si aplica)**
  - [ ] Configurado
  - [ ] Assets cacheados
  - [ ] Purgar cache post-deploy

- [ ] **Environment variables configurados**
  - [ ] En hosting dashboard
  - [ ] En `.env.production` local
  - [ ] Todas las claves presentes
  - [ ] No hay valores de desarrollo

- [ ] **Logs configurados**
  - [ ] Error tracking (Sentry/similar)
  - [ ] Application logs disponibles
  - [ ] Access logs habilitados
  - [ ] Retention policy (90 días mínimo)

- [ ] **Monitoring configurado**
  - [ ] Uptime monitoring activo
  - [ ] Alert emails configuradas
  - [ ] Performance monitoring
  - [ ] Error alerting

---

## Deployment Steps

### Pre-Deployment (1 hora antes)

```bash
# 1. Asegurar que estamos en rama main/production
git status
git branch

# 2. Hacer pull de cambios más recientes
git pull origin main

# 3. Instalar dependencias (si hay cambios)
npm install

# 4. Runear tests finales
npm run test
npm run test:e2e (si aplica)

# 5. Build final
npm run build

# 6. Verificar build
ls -la dist/
# Verificar que archivos están presentes

# 7. Crear tag/release
git tag v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

### During Deployment

**Opción A: Netlify**
```bash
# 1. Hacer push a rama main
git push origin main

# 2. Netlify automáticamente:
#    - Detecta push
#    - Inicia build
#    - Deploy a preview primero
#    - Deploy a producción si todo ok

# 3. Monitorear en Netlify dashboard
# Verificar que build es exitoso
```

**Opción B: Vercel**
```bash
# 1. Hacer push a rama main
git push origin main

# 2. Vercel automáticamente:
#    - Detecta push
#    - Inicia build
#    - Deploy a preview
#    - Deploy a producción

# 3. Monitorear en Vercel dashboard
```

**Opción C: Manual Deploy**
```bash
# 1. Build localmente
npm run build

# 2. Copiar dist/ a servidor
scp -r dist/ user@server:/var/www/maya-autopartes/

# 3. Reiniciar servidor (si needed)
ssh user@server "systemctl restart nginx"

# 4. Verificar que sitio carga
curl https://maya-autopartes.com
```

### During Deployment - Monitoring

```bash
# Terminal 1: Watch logs
tail -f /var/log/app.log

# Terminal 2: Health check
while true; do
  curl -I https://maya-autopartes.com
  sleep 10
done

# Terminal 3: Browser
# Abrir https://maya-autopartes.com
# Probar funcionalidad básica
# Verificar no hay errors en DevTools
```

---

## Post-Deployment Verification

### Inmediatamente después del Deploy (< 30 min)

#### Critical Path Testing

- [ ] **Sitio carga**
  ```
  Abrir https://maya-autopartes.com
  Resultado: Página carga, no blank page
  ```

- [ ] **Login funciona**
  - [ ] Ingresar credenciales correctas → OK
  - [ ] Ingresar credenciales incorrectas → Error

- [ ] **Core functionality**
  - [ ] Click en "Ventas" → Carga tabla
  - [ ] Click en "Nueva Venta" → Abre modal
  - [ ] Guardar venta → Se refleja en tabla
  - [ ] Buscar venta → Filtra correctamente

- [ ] **Integración Supabase**
  - [ ] Sync con Supabase funciona
  - [ ] No hay errores en consola
  - [ ] Datos se sincronizan

- [ ] **Sin errors en consola**
  ```
  DevTools → Console
  Resultado: Sin errores rojos
  Solo warnings aceptables
  ```

#### Performance Verification

- [ ] **Carga rápida**
  - [ ] Load time < 3 segundos
  - [ ] TTI < 3 segundos
  - [ ] Sin lag en búsqueda

- [ ] **Lighthouse score**
  ```bash
  npm run lighthouse
  # Performance >= 75
  # Overall >= 80
  ```

- [ ] **Network requests**
  - [ ] DevTools → Network
  - [ ] Payloads razonables
  - [ ] Sin 404s

#### Data Verification

- [ ] **Datos intactos**
  - [ ] Datos previousos se cargan
  - [ ] Números son correctos
  - [ ] Sin corrupción visible

- [ ] **Backups accesibles**
  - [ ] Backup pre-deploy es recoverable
  - [ ] Guardar copia de backup en lugar seguro

---

### 24 Horas Después del Deploy

- [ ] **Monitoreo de errores**
  - [ ] Revisar error tracking (Sentry, etc)
  - [ ] Verificar error rate bajo
  - [ ] Investigar cualquier spike

- [ ] **User feedback**
  - [ ] Verificar que no hay reportes críticos
  - [ ] Responder queries de users
  - [ ] Documentar feedback

- [ ] **Performance metrics**
  - [ ] Revisar Lighthouse scores
  - [ ] Revisar user session duration
  - [ ] Revisar bounce rate
  - [ ] Comparar con baseline anterior

- [ ] **Data sync validation**
  - [ ] Verificar que sincronización es correcta
  - [ ] Revisar logs de sync
  - [ ] Sin conflicts detectables

- [ ] **Security scan (opcional pero recomendado)**
  ```bash
  # Usar herramienta como OWASP ZAP, Burp Suite
  # Ejecutar basic security scan
  # Revisar resultados
  ```

---

### 1 Semana Después del Deploy

- [ ] **Stabilidad verificada**
  - [ ] Aplicación corre sin errores
  - [ ] Sin memory leaks
  - [ ] Sin performance degradation

- [ ] **User adoption**
  - [ ] Usuarios usando new features
  - [ ] No major complaints
  - [ ] Engagement metrics up

- [ ] **Update documentation (si hay cambios)**
  - [ ] README.md actualizado
  - [ ] CHANGELOG.md actualizado
  - [ ] User guides actualizado

---

## Rollback Plan

**Si algo falla FATALMENTE después de deploy:**

### Immediate Actions (Primeros 5 minutos)

- [ ] **Comunicar el issue**
  - [ ] Notificar a Slack/equipo
  - [ ] Avisar a users: "We're investigating"
  - [ ] No panic, hay plan

- [ ] **Assess severity**
  - [ ] ¿Es critical (app no funciona)?
  - [ ] ¿Es major (features no trabajan)?
  - [ ] ¿Es minor (UI issue)?

### Rollback Decision

**ROLLBACK INMEDIATAMENTE SI:**
- ❌ Aplicación no carga
- ❌ Login no funciona
- ❌ Data corruption
- ❌ Security breach
- ❌ Error rate > 5%

**ROLLBACK SÍ pero con análisis SI:**
- ⚠️ Feature específica rota
- ⚠️ Performance degraded (10-20%)
- ⚠️ UI issue mayor

**NO ROLLBACK SI:**
- ✅ Bug menor
- ✅ Typo en UI
- ✅ Performance issue < 10%
- ✅ Feature que pocos usan

### Rollback Execution (< 15 min objetivo)

**Opción A: Revert Deploy en Netlify/Vercel**
```
1. Ir a Netlify/Vercel dashboard
2. Ver deploy history
3. Click en "Rollback to previous deploy"
4. Confirmar
5. Esperar a que redeploy completado (~3 min)
```

**Opción B: Revert en Git**
```bash
# Revert el commit
git revert HEAD --no-edit
git push origin main

# Hosting automáticamente redeploy
# O

# Revert a versión anterior
git checkout v1.0.0-previous
git push --force origin main
# CUIDADO con force push
```

**Opción C: Restore from Backup (Último recurso)**
```bash
# Restore database desde backup pre-deploy
psql < backup-2026-04-22-14-00.sql

# Restore files desde backup
rsync -avz backup/www/ /var/www/maya-autopartes/

# Reiniciar services
systemctl restart nginx
systemctl restart app-service
```

### After Rollback

- [ ] **Verificar sitio funciona**
  - [ ] Abrir https://maya-autopartes.com
  - [ ] Login funciona
  - [ ] Core features funcionan
  - [ ] Datos están ok

- [ ] **Comunicar a users**
  ```
  "Hemos revertido los cambios. El sitio está de vuelta a normal.
  Disculpas por el inconveniente. Investigaremos el issue."
  ```

- [ ] **Post-mortem**
  - [ ] ¿Qué salió mal?
  - [ ] ¿Cómo lo detectamos?
  - [ ] ¿Cómo prevenimos en futuro?
  - [ ] Documentar en KNOWN_ISSUES.md
  - [ ] Juntar equipo en 24h para discussión

---

## Sign-Off

| Rol | Nombre | Email | Firma | Fecha |
|-----|--------|-------|-------|-------|
| DevOps Lead | ____________ | __________ | ______ | ______ |
| Tech Lead | ____________ | __________ | ______ | ______ |
| QA Lead | ____________ | __________ | ______ | ______ |
| Product Owner | ____________ | __________ | ______ | ______ |
| VP Engineering | ____________ | __________ | ______ | ______ |

---

## Communication Template

**Email a enviar 48h antes del deploy:**

```
Subject: Planned Maintenance - Maya Autopartes [Date/Time]

Hi Team,

We're performing a scheduled deployment on:
Date: [DATE]
Time: [TIME] - [TIME] EST
Duration: [MINUTES] downtime expected
Impact: Application may be unavailable briefly

What's being deployed:
- [List main features/fixes]
- [List main features/fixes]

What you should do:
- If doing important transactions, do them before [TIME]
- System will be back online by [TIME]
- Contact support@example.com if any issues

Questions? Reach out to [DevOps Team]

Thanks,
[Name]
```

**Slack notification during deployment:**

```
🚀 DEPLOYMENT STARTED

Deploying: v1.0.0
Deployer: [Name]
Start time: [TIME]
Expected duration: 30 min

Team:
- #🟡 Status: IN PROGRESS
- Monitoring logs...
- Will update in 10 min
```

**Slack notification post-deployment:**

```
✅ DEPLOYMENT COMPLETE

Version: v1.0.0
Status: SUCCESS
Duration: 25 min
Tests: ALL PASS
Errors: 0

New features:
- [Feature]
- [Feature]

Bugs fixed:
- [Bug]
- [Bug]

All systems nominal! 🎉
```

---

## Checklists en Archivo

### Guardar documentos necesarios:

- [ ] Backup pre-deploy guardado
- [ ] Rollback plan impreso/accesible
- [ ] Emergency contacts a mano
- [ ] Deployment log guardado

---

**Versión:** 1.0 | **Última actualización:** 2026-04-22 | **Próxima revisión:** 2026-05-06

**IMPORTANTE:** Este checklist debe ser completado en cada deployment.
No skippear items sin aprobación del Tech Lead.
