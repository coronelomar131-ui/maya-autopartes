# Monitoreo en Producción - Maya Autopartes

## 🚀 Guía Completa para Monitoreo, Alertas y Escalada en Producción

---

## 1. Configuración Inicial

### 1.1 Variables de Entorno (Production)

```bash
# Backend .env (Producción)
NODE_ENV=production
PORT=5000
LOG_DIR=/var/log/maya-autopartes
SENTRY_DSN=https://<key>@sentry.io/<projectId>

# Frontend .env.production
REACT_APP_SENTRY_DSN=https://<key>@sentry.io/<projectId>
REACT_APP_API_URL=https://api.mayaautopartes.com
```

### 1.2 Infraestructura Recomendada

```
┌─────────────────────────────────────────┐
│         Load Balancer (Vercel)          │
├─────────────────────────────────────────┤
│    Frontend (Next.js) × N instancias    │
├─────────────────────────────────────────┤
│    Backend (Node.js) × 2-3 instancias   │
├─────────────────────────────────────────┤
│  Supabase PostgreSQL + Auto-failover    │
├─────────────────────────────────────────┤
│     Sentry + Logs + Alertas             │
└─────────────────────────────────────────┘
```

---

## 2. Monitoreo de Salud del Sistema

### 2.1 Health Check Endpoints

Configurar monitoreo externo para verificar cada 60 segundos:

```bash
# Salud general
GET https://api.mayaautopartes.com/health

# Base de datos
GET https://api.mayaautopartes.com/health/db

# Memoria
GET https://api.mayaautopartes.com/health/memory

# Estado simple (para uptime monitors)
GET https://api.mayaautopartes.com/health/status → "OK"
```

### 2.2 Uptime Monitoring Services

**UptimeRobot** (Gratuito):
1. Login en uptimerobot.com
2. Crear monitor HTTP
3. URL: `https://api.mayaautopartes.com/health/status`
4. Intervalo: 5 minutos
5. Alert: Email + Slack

**Vercel Analytics**:
- Automático en Vercel
- Dashboard de disponibilidad
- Alertas por región

### 2.3 Interpretar Response Health Check

```json
{
  "status": "healthy",      // OK: todo funciona
  "status": "degraded",     // WARNING: parcialmente funcional
  "status": "unhealthy"     // CRITICAL: servicio caído
}
```

**Acciones por Status**:
- **healthy**: Continuar monitoreo normal
- **degraded**: Investigar qué servicio está lento
- **unhealthy**: Alerta P1 - Escalación inmediata

---

## 3. Monitoreo de Errores

### 3.1 Sentry Dashboard

**Acceso**: https://sentry.io/organizations/maya-autopartes/issues/

**Métricas Importantes**:
- **Issues**: Número de problemas únicos
- **Events**: Número total de ocurrencias
- **Users Affected**: Usuarios impactados
- **Crash-free Rate**: % sin errores

**Puntos de Atención**:
- Crash-free rate < 99% → Investigar
- Nuevos issues críticos → Escalación
- Spike de errores → Análisis

### 3.2 Error Patterns

```
Monitor cada 15 minutos:
- Tasa de errores 5xx (target: < 1%)
- Tasa de errores 4xx (target: < 5%)
- Usuarios únicos afectados (target: 0)
- Issues críticos no resueltas (target: 0)
```

### 3.3 Escalación por Severidad

| Severidad | Síntoma | Acción | Tiempo |
|-----------|---------|--------|--------|
| **P0** | Sistema down | Escalación inmediata | 15 min |
| **P1** | Error crítico > 100 events | Slack + Llamada | 1 hora |
| **P2** | Error crítico < 100 events | Slack notification | 4 horas |
| **P3** | Error menor | Email diario | 24 horas |

**P0 - Sistema Down**:
```
1. Verificar /health/status
2. Slack: @channel Sistema caído
3. Llamar al lead
4. Revert último deploy
5. Investigar en paralelo
```

**P1 - Error Crítico**:
```
1. Slack: @team Issue crítico
2. Abrir Sentry → Ver breadcrumbs
3. Identificar patrón
4. Hotfix o rollback
5. Post-mortem en 24h
```

---

## 4. Monitoreo de Rendimiento

### 4.1 Métricas de Rendimiento

**Backend**:
```bash
GET /health/memory
{
  "heapUsed": 256,      // MB - target: < 512
  "heapTotal": 512      // MB
}

Response times:
- p50 (mediana): < 200ms
- p95 (95 percentil): < 1s
- p99 (99 percentil): < 5s
```

**Frontend**:
```javascript
// Core Web Vitals (via Sentry)
- LCP (Largest Contentful Paint): < 2.5s
- FID (First Input Delay): < 100ms
- CLS (Cumulative Layout Shift): < 0.1
```

### 4.2 Performance Degradation

**Síntoma**: Response time promedio > 1s

**Investigación**:
```bash
# Ver requests más lentos en logs
grep "duration" logs/combined.log | \
  grep -oE '[0-9]{4,}ms' | \
  sort -rn | head -10

# Ver si hay query lenta
grep "DatabaseError\|connection timeout" logs/error.log

# Verificar memoria
curl https://api.mayaautopartes.com/health/memory
```

**Soluciones**:
1. Implementar caching (Redis)
2. Optimizar queries (indexes en BD)
3. Paginación en listados grandes
4. Escalado horizontal (más instancias)

### 4.3 Dashboard de Rendimiento

Usar **New Relic** o **Datadog**:

```
New Relic Setup:
1. npm install newrelic
2. require('newrelic') en server.js
3. Configurar license key en .env
4. Ver dashboard: https://one.newrelic.com/
```

---

## 5. Alertas Automatizadas

### 5.1 Configuración de Alertas en Sentry

**Alert Rule 1: Spike de Errores**
```
Condición: if events >= 10 in 1h
Filtro: environment:production
Acción: Slack #errors channel
```

**Alert Rule 2: Error Crítico**
```
Condición: if error.statusCode >= 500
Filtro: is:unresolved
Acción: Slack @on-call + Email
```

**Alert Rule 3: DatabaseError**
```
Condición: if error.type == DatabaseError
Acción: Slack @dba + PagerDuty
```

### 5.2 Configuración de Slack

**En Sentry** → Settings → Integrations → Slack

Canales:
- `#errors-critical`: P0, P1
- `#errors-warning`: P2
- `#errors-info`: P3, logs informativos

**Comando en Slack**:
```
/sentry assign @user
/sentry resolve
/sentry ignore
/sentry open-in-app
```

### 5.3 PagerDuty Integration

Para on-call escalation:
```
Sentry → Integrations → PagerDuty
→ Crear Alert Rule
→ Acción: "Trigger PagerDuty incident"
```

---

## 6. Logs y Auditoría

### 6.1 Rotación de Logs

```bash
# Configurar en logrotate (Linux)
cat /etc/logrotate.d/maya-autopartes
/var/log/maya-autopartes/*.log {
  daily
  rotate 7
  compress
  delaycompress
  notifempty
  create 0640 app app
  sharedscripts
  postrotate
    systemctl reload maya-autopartes
  endscript
}
```

### 6.2 Logs Centralizados

Usar **ELK Stack** o **Splunk**:

```
Logs → Supabase/S3 → Elasticsearch
→ Kibana (búsqueda y análisis)
```

### 6.3 Búsquedas Útiles en Logs

```bash
# Errores en última hora
grep "$(date -u -d '1 hour ago' +%Y-%m-%d)" logs/error.log | tail -50

# Errores por tipo
grep "errorType" logs/error.log | \
  sort | uniq -c | sort -rn

# Usuarios con más errores
grep "userId" logs/error.log | \
  sed -n 's/.*"userId":"\([^"]*\)".*/\1/p' | \
  sort | uniq -c | sort -rn

# Endpoints con más errores
grep "url" logs/error.log | \
  sed -n 's/.*"url":"\([^"]*\)".*/\1/p' | \
  sort | uniq -c | sort -rn
```

---

## 7. Respuesta a Incidentes

### 7.1 Procedimiento de Escalación

```
Nivel 1 (0-15 min): Verificación automática
├─ Monitoreo detecta anomalía
├─ Sentry alerta automática
└─ Slack notificación

Nivel 2 (15-60 min): Análisis inicial
├─ On-call engineer se conecta
├─ Revisa Sentry → Logs → Health
├─ Identifica causa raíz
└─ Inicia fix o rollback

Nivel 3 (60+ min): Escalación ejecutiva
├─ Manager notificado
├─ Equipo de desarrollo completo
├─ Llamada de emergencia
└─ Comunicación con clientes

Nivel 4: Post-mortem
├─ Documentar timeline
├─ Identificar root cause
├─ Implementar prevención
└─ Compartir learnings
```

### 7.2 Ejemplo: Base de Datos No Responde

**Síntoma**: `/health/db` retorna status: "unhealthy"

**Respuesta**:
```bash
# 1. Confirmar problema (inmediato)
curl https://api.mayaautopartes.com/health/db

# 2. Verificar estado en Supabase
# Ir a: https://app.supabase.com/project/[project]/logs

# 3. Revisar en Sentry
# Issues → DatabaseError
# Ver stack trace y breadcrumbs

# 4. Opciones de mitigación
# a) Reintento (retry logic ya implementado)
# b) Rollback a versión anterior
# c) Failover a replica (si está configurado)

# 5. Comunicación
# Slack: "Database connection issue detected, investigating..."
# Después: "Issue resolved, investigating root cause"

# 6. Post-mortem
# ¿Por qué falló?
# ¿Cómo prevenirlo?
# ¿Cómo detectarlo más rápido?
```

### 7.3 Ejemplo: Memory Leak

**Síntoma**: `/health/memory` heapUsed crece continuamente

**Respuesta**:
```bash
# 1. Confirmar leak
for i in {1..10}; do
  curl https://api.mayaautopartes.com/health/memory
  sleep 60
done

# Si heapUsed crece: LEAK CONFIRMADO

# 2. Investigación
grep "heapUsed" logs/combined.log | \
  awk '{print substr($0,1,19), $NF}' | \
  tail -20

# 3. Identificar causa (revisar último cambio)
git log --oneline -5

# 4. Solución temporal
# Aumentar límite de memoria: node --max-old-space-size=2048

# 5. Fix permanente
# Revisar código: listeners no removidos, referencias circulares
```

---

## 8. Runbooks (Guías de Operación)

### 8.1 Runbook: Sistema Caído (P0)

```markdown
# Sistema Caído - Runbook

## Detección
- UptimeRobot/Vercel reporta error
- /health/status retorna error

## Respuesta Inmediata (0-5 min)
1. [ ] Slack: #errors-critical "Sistema caído, investigando..."
2. [ ] Llamar al lead
3. [ ] Abrir Vercel Dashboard
4. [ ] Verificar recent deployments

## Investigación (5-15 min)
1. [ ] Abrir Sentry → último evento
2. [ ] Revisar logs backend
3. [ ] Verificar status Supabase
4. [ ] Revisar network/DNS

## Remediación
- [ ] Opción A: Rollback deploy anterior
  ```bash
  vercel rollback
  ```
- [ ] Opción B: Hotfix (si rollback no suficiente)
  ```bash
  git revert [bad-commit]
  git push
  vercel deploy --prod
  ```

## Validación (15-20 min)
- [ ] /health retorna "healthy"
- [ ] Frontend carga sin errores
- [ ] DB responde correctamente
- [ ] Sentry no reporta nuevos errores

## Comunicación (20 min)
- [ ] Slack: "Sistema restaurado"
- [ ] Email a clientes (si fue > 15 min)
- [ ] Schedule post-mortem para 24h

## Post-Mortem (24h)
- [ ] Timeline completo
- [ ] Root cause analysis
- [ ] Prevención para futuro
- [ ] Acción items
```

### 8.2 Runbook: Error Rate Alto (P1)

```markdown
# Error Rate Alto - Runbook

## Criterio de Activación
- Error rate > 5% en últimos 15 min
- Sentry: 100+ eventos nuevos en 1h

## Respuesta (0-5 min)
1. [ ] Slack: @team notificación
2. [ ] Abrir Sentry Issues
3. [ ] Identificar error patrón
4. [ ] Revisar último deploy

## Análisis (5-15 min)
1. [ ] ¿Nuevo error o error conocido?
2. [ ] ¿Cuándo comenzó?
3. [ ] ¿Afecta a todos o solo algunos?
4. [ ] ¿Relacionado a cambio de código?

## Decisión
### Si es nuevo bug:
- Hotfix → test → deploy
### Si es error conocido:
- Rollback deploy anterior
### Si es problema infraestructura:
- Verificar health endpoints
- Escalar a DevOps

## Comunicación
- [ ] Slack updates cada 10 min
- [ ] Resolución confirmada
- [ ] Postmortem 24h después
```

---

## 9. Capacitación del Equipo

### 9.1 On-Call Training

Todos los engineers deben saber:
- [ ] Acceder a Sentry
- [ ] Leer stack traces
- [ ] Revisar breadcrumbs
- [ ] Acceso a logs
- [ ] Acceso a Vercel
- [ ] Acceso a Supabase
- [ ] Ejecutar rollback
- [ ] Crear hotfix

### 9.2 Checklists Semanales

```
Lunes:
- [ ] Revisar Sentry issues no resueltos
- [ ] Analizar error trends
- [ ] Revisar alertas de fin de semana

Miércoles:
- [ ] Performance review
- [ ] Log analysis
- [ ] Database health check

Viernes:
- [ ] Preparación para fin de semana
- [ ] Verificar on-call coverage
- [ ] Documentar lecciones aprendidas
```

---

## 10. Dashboards Recomendados

### 10.1 Sentry Dashboard Personalizado

Crear vista personalizada con:
```
- Issue Trends (últimos 7 días)
- Top Errors (últimas 24h)
- Error by Environment
- Error by Release
- Crash-free Rate
```

### 10.2 Grafana (Opcional)

Paneles:
- Request Rate (req/s)
- Error Rate (%)
- Response Time (ms)
- CPU Usage (%)
- Memory Usage (%)
- Database Connections

### 10.3 Status Page

Usar **Statuspage.io** para transparencia:
```
Public: https://status.mayaautopartes.com
Mostrar:
- Service health
- Incident history
- Maintenance schedule
- Subscribe to updates
```

---

## 11. SLA y Métricas

### 11.1 Service Level Agreement

```
Uptime Target: 99.5% (43.2 min downtime/mes)
Response Time: p95 < 1s
Error Rate: < 0.5%
Database Availability: 99.9%
```

### 11.2 Tracking Uptime

```bash
# Calculador de uptime
uptime_seconds = total_seconds - downtime_seconds
uptime_percent = (uptime_seconds / total_seconds) * 100

# Exemplo
# En 30 días = 2,592,000 segundos
# Downtime permitido = 2,592,000 * 0.005 = 12,960 segundos = 3.6 horas
```

### 11.3 Reporting

**Reporte Mensual**:
- Uptime: 99.7%
- Total Incidents: 2 (P2, P3)
- MTTR (Mean Time to Recovery): 15 min
- User Impact: 0.02%
- Top Issue: [Description]
- Preventive Action: [Action]

---

## 12. Disaster Recovery

### 12.1 Backup Strategy

```
Database:
- Automatizado: Supabase autobackup
- Frecuencia: Diario
- Retención: 30 días

Código:
- Git principal source
- Deploy reproducible desde commit

Datos críticos:
- Monthly snapshots a S3
```

### 12.2 Recovery Procedures

**Database Recovery**:
```bash
# 1. Entrar a Supabase
# 2. Backups → Seleccionar backup fecha
# 3. Restore → Confirmar
# 4. Verificar /health/db
# 5. Validar datos críticos
```

**Code Recovery**:
```bash
# 1. Identificar último commit bueno
# 2. git revert [bad-commits]
# 3. git push
# 4. Vercel redeploy automático
# 5. Validar en Sentry
```

---

## 13. Contactos y Escalación

```
On-Call Engineer: [Name/Phone]
Lead Engineer: [Name/Phone]
DevOps: [Name/Phone]
Manager: [Name/Phone]
Executive: [Name/Phone]

Slack: #on-call
PagerDuty: [Link]
Runbooks: [Link]
```

---

## 14. Checklist de Implementación

- [ ] Sentry configurado en producción
- [ ] Health endpoints probados
- [ ] Alertas en Slack configuradas
- [ ] UptimeRobot setup
- [ ] Team capacitado
- [ ] Runbooks documentados
- [ ] On-call schedule
- [ ] Post-mortem template
- [ ] Dashboard de Sentry
- [ ] Status page público

---

**Última actualización**: Abril 2024
**Versión**: 1.0.0

Para soporte: [Email] | [Slack]
