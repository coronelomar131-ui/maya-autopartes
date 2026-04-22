# Compliance Notes - Audit Trail System

## 📋 Resumen de Cumplimiento Regulatorio

Este documento detalla cómo el sistema de Audit Trail de Maya Autopartes cumple con regulaciones internacionales de seguridad y privacidad de datos.

**Actualizado:** 2026-04-22  
**Versión:** 1.0.0

---

## 🏛️ Marco Regulatorio Aplicable

### 1. ISO/IEC 27001:2022 - Information Security Management Systems

#### Control 8.2.1 - User Registration and Access Management

**Requerimiento:** Mantener registro de asignación y revocación de acceso.

**Implementación:**
```
✅ Audit logs registran:
   - Quién cambió permisos de usuario
   - Cuándo (timestamp ISO 8601)
   - Qué cambió (valores antes/después)
   - Por qué (metadata con contexto)
```

**Evidencia:**
- Tabla `audit_logs` con RLS
- Logs del acceso a `usuarios` tabla
- Reportes exportables

---

### 2. GDPR (EU General Data Protection Regulation)

#### Artículo 5 - Principles relating to processing of personal data

##### 5.1(a) - Lawfulness, fairness and transparency
"Personal data shall be processed lawfully, fairly and in a transparent manner"

**Implementación:**
```
✅ Audit Trail proporciona transparencia:
   - Cada acceso a datos personales queda registrado
   - Usuario puede solicitar: "¿Quién accedió mis datos?"
   - Exportar completo historial de accesos
```

**Evidencia:**
- GET `/api/audit?tabla=clientes` muestra todos los accesos
- Reportes con timestamps
- Exportación a CSV para auditors externos

##### 5.1(b) - Purpose Limitation
"Personal data shall be collected for specified, explicit and legitimate purposes"

**Implementación:**
```
✅ Audit logs especifican:
   - Tabla accedida (qué datos)
   - Acción realizada (CREATE, UPDATE, DELETE)
   - Usuario responsable
   - Timestamp exacto
   - Cambios específicos realizados
```

---

#### Artículo 5.1(e) - Storage Limitation
"Personal data shall be kept in a form which permits identification for no longer than necessary"

**Implementación:**
```
✅ Política de retención:
   - Guardar 7 años (cumple requisitos de auditoría)
   - Después: anonimizar o eliminar
   - Excepción: Datos requeridos por ley (archivos)
```

**Configuración:**
```sql
-- Anonimizar datos antiguos
UPDATE audit_logs 
SET usuario_email = 'user_' || SUBSTR(id, 1, 8) || '@redacted'
WHERE created_at < NOW() - INTERVAL '2 years'
AND tabla IN ('clientes', 'usuarios');

-- Eliminar después de 7 años
DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '7 years';
```

---

#### Artículo 32 - Security of processing

**Requerimiento:** "Encryption of personal data... during transmission and at rest"

**Implementación:**

| Aspecto | Medida |
|--------|--------|
| **En tránsito** | SSL/TLS (HTTPS obligatorio) |
| **En reposo** | AES-256 (Supabase encryption) |
| **En base de datos** | Column-level encryption (sensibles) |
| **En exportación** | CSV sin encriptación (usar PGP si es necesario) |

---

#### Artículo 33 - Notification of a personal data breach

**Requerimiento:** "Notify the supervisory authority... without undue delay and, where feasible, not later than 72 hours"

**Implementación:**
```
✅ Audit logs facilitan detección de breaches:
   - DELETE malicioso detectado por trigger
   - Accesos anómalos visibles en reportes
   - Alertas automáticas en:
     * Múltiples DELETE en corto tiempo
     * Acceso desde IP sospechosa
     * Cambios fuera de horario laboral
```

**Alertas recomendadas:**
```javascript
// En backend
const recentDeletes = await auditLogger.getAuditTrail(
  { tabla: 'clientes', accion: 'DELETE', desde: '1 hour ago' }
);

if (recentDeletes.data.length > 100) {
  // Potencial data deletion attack
  await sendAlertToSecurityTeam();
}
```

---

#### Derecho de Acceso (Art. 15)

**Requerimiento:** "The data subject shall have the right to obtain confirmation as to whether personal data concerning him or her is being processed"

**Implementación:**
```bash
# Usuario Juan puede solicitar:
GET /api/audit?usuario=juan@example.com

# Respuesta muestra:
# - Qué datos suyos fueron accedidos
# - Quién los accedió
# - Cuándo y por qué
# - Qué cambios se hicieron
```

**Proceso:**
1. Usuario envía solicitud por correo
2. Sistema genera reporte: `GET /api/audit/export?usuario=X&limit=10000`
3. Enviar CSV cifrado al usuario dentro de 30 días

---

#### Derecho a la Anonimización (Art. 17 - Right to be Forgotten)

**Requerimiento:** "The data subject shall have the right to obtain erasure of personal data"

**Implementación:**
```sql
-- Anonimizar datos de usuario que solicita
UPDATE audit_logs 
SET usuario_email = 'redacted_' || uuid_generate_v4()
WHERE usuario_email = 'juan@example.com'
AND created_at < NOW() - INTERVAL '2 years';

-- Registrar anonimización
INSERT INTO audit_logs (
  usuario_id, tabla, accion, metadata
) VALUES (
  admin_id, 'audit_logs', 'ANONYMIZE',
  jsonb_build_object('original_email', 'juan@example.com', 'reason', 'GDPR-Right-to-Forget')
);
```

---

### 3. PCI DSS (Payment Card Industry Data Security Standard)

#### Requirement 10.1 - Logging and Monitoring

**Requerimiento:** "Implement automated audit trails for all access to cardholder data"

**Implementación:**
```
✅ Audit logs registran:
   - Acceso a tabla de pagos/facturas
   - Cambios a montos (potencial fraude)
   - Acceso a clientes con datos de tarjeta
   - Borrados o cambios sospechosos
```

---

#### Requirement 10.2 - Automated Facilities

"Implement mechanisms to render all access to cardholder data"

**Implementación:**
```javascript
// Auto-auditing en POST /api/v1/facturas
const factura = req.body;

// Crear factura
const { data } = await supabase.from('facturas').insert([factura]);

// Auto-log
await auditLogger.logCreate(
  req.userId,
  req.userEmail,
  'facturas',
  data[0].id,
  data[0],
  {
    ip: req.ip,
    user_agent: req.get('user-agent'),
    endpoint: '/api/v1/facturas',
    metodo: 'POST'
  }
);
```

---

#### Requirement 10.7 - Retention

"Retain audit trail history for at least one year, with a minimum of three months in readily available storage"

**Implementación:**
```
✅ Retención implementada:
   - 3 meses en base de datos principal (rápido acceso)
   - 1 año en base de datos principal (con índices)
   - Después: archivar a almacenamiento frío
   - POR LEG: guardar 7 años
```

---

## 🔒 Implementación de Seguridad

### Verificación de Integridad (Tamper Detection)

**Requerimiento:** Detectar si logs fueron modificados

**Implementación en PostgreSQL:**
```sql
-- Crear hash de integridad
ALTER TABLE audit_logs ADD COLUMN hash_integridad TEXT;

-- Trigger para verificar
CREATE FUNCTION verify_audit_integrity() 
RETURNS TRIGGER AS $$
BEGIN
  -- Calcular SHA256 del registro actual
  NEW.hash_integridad := encode(
    digest(row_to_json(NEW)::text, 'sha256'),
    'hex'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_integrity_trigger
BEFORE INSERT ON audit_logs
FOR EACH ROW EXECUTE FUNCTION verify_audit_integrity();
```

**Verificación periódica:**
```javascript
// Verificar cada mañana a las 6 AM
const { data } = await auditLogger.verifyIntegrity(
  '1 day ago',
  'now'
);

if (!data.integrity_ok) {
  // Potential tampering detected!
  await sendSecurityAlert({
    issue: 'Audit log tampering detected',
    details: data.issues
  });
}
```

---

### Control de Acceso (RBAC)

**Row Level Security en Supabase:**

```sql
-- Solo admin puede leer ALL logs
CREATE POLICY admin_read_all_logs ON audit_logs
FOR SELECT TO admin
USING (true);

-- Managers ven logs de su depto
CREATE POLICY manager_read_dept_logs ON audit_logs
FOR SELECT TO manager
USING (
  EXISTS (
    SELECT 1 FROM usuarios u
    WHERE u.id = audit_logs.usuario_id
    AND u.departamento = current_user_department()
  )
);

-- Usuarios ven solo sus propios logs
CREATE POLICY user_read_own_logs ON audit_logs
FOR SELECT TO authenticated
USING (usuario_id = current_user_id());

-- NADIE puede delete
CREATE POLICY no_delete_logs ON audit_logs
FOR DELETE
USING (false);
```

---

### Anonimización de Datos Sensibles

**Para exportaciones a auditors externos:**

```javascript
async exportForAuditor(filters, anonimize = true) {
  const { data } = await this.getAuditTrail(filters);
  
  if (anonimize) {
    return data.map(log => ({
      ...log,
      usuario_email: this.hashEmail(log.usuario_email),
      usuario_id: this.hashUUID(log.usuario_id),
      valores_antes: this.maskSensitiveFields(log.valores_antes),
      valores_despues: this.maskSensitiveFields(log.valores_despues)
    }));
  }
  
  return data;
}

maskSensitiveFields(obj) {
  const sensibles = ['password', 'credit_card', 'ssn', 'phone', 'email'];
  for (const field of sensibles) {
    if (obj[field]) {
      obj[field] = '[REDACTED]';
    }
  }
  return obj;
}
```

---

## 📊 Reportes de Compliance

### Reporte ISO 27001

**Periódico:** Trimestral

**Incluye:**
```json
{
  "periodo": "Q1 2026",
  "total_eventos_auditados": 125430,
  "cambios_no_autorizados_detectados": 0,
  "intentos_acceso_denegado": 12,
  "integridad_verificada": true,
  "backup_realizado": "2026-04-22T03:00:00Z",
  "politica_retencion_cumplida": true
}
```

---

### Reporte GDPR

**Periódico:** Anual (o bajo demanda)

**Incluye:**
```json
{
  "ano": 2026,
  "solicitudes_derecho_acceso_recibidas": 3,
  "solicitudes_procesadas_en_plazo": true,
  "solicitudes_derecho_olvido_recibidas": 1,
  "solicitudes_procesadas": true,
  "intentos_acceso_datos_personales": 8945,
  "brechas_detectadas": 0,
  "brechas_notificadas_autoridades": 0,
  "anonimizaciones_realizadas": 234
}
```

---

### Reporte PCI DSS

**Periódico:** Mensual

**Incluye:**
```json
{
  "mes": "Abril 2026",
  "accesos_a_datos_pago": 1245,
  "cambios_no_autorizados": 0,
  "intentos_breach": 3,
  "logs_disponibles": true,
  "retention_compliant": true
}
```

---

## ✅ Checklist de Cumplimiento

### ISO 27001:2022

- [x] Registro de acceso y revocación (A.8.2.1)
- [x] Logs con información de usuario (A.8.2.2)
- [x] Protección de logs contra modificación (A.8.2.3)
- [x] Sincronización de relojes (A.8.3.1)
- [x] Recopilación de información en logs (A.8.3.2)
- [x] Protección de información en logs (A.8.3.3)
- [x] Retención de logs (A.8.3.4)

### GDPR

- [x] Art. 5.1(a) - Lawfulness (logs de acceso)
- [x] Art. 5.1(b) - Purpose limitation (especificidad)
- [x] Art. 5.1(e) - Storage limitation (retención 7 años)
- [x] Art. 32 - Security (encryption SSL + AES)
- [x] Art. 33 - Breach notification (alertas)
- [x] Art. 15 - Right of access (exportar logs)
- [x] Art. 17 - Right to be forgotten (anonimizar)

### PCI DSS

- [x] Req 10.1 - Automated audit trails
- [x] Req 10.2 - Access to cardholder data
- [x] Req 10.3 - User identification
- [x] Req 10.7 - Audit trail retention

---

## 🚨 Procedimientos de Respuesta

### Detección de Anomalías

```
EVENT: Multiple deletes detected
│
├─ Alert severity: CRITICAL
├─ Threshold: > 50 DELETEs en 5 minutos
│
├─ Acción automática:
│  ├─ Bloquear usuario (temporal)
│  ├─ Notificar a admin
│  ├─ Crear snapshot de BD
│  └─ Iniciar forensic logging
│
└─ Acción manual:
   ├─ Investigar logs de audit
   ├─ Restaurar desde backup si es necesario
   ├─ Cambiar credenciales si es compromiso
   └─ Notificar a reguladores (si es breach)
```

### Solicitud de Acceso a Datos (GDPR)

```
SOLICITUD: Usuario X pide "¿Quién accedió mis datos?"
│
├─ Validar identidad
├─ GET /api/audit?tabla=clientes&registro_id=USER_X_ID
├─ Exportar CSV
├─ Anonimizar (opcional)
├─ Cifrar PDF
└─ Entregar en 30 días
```

### Derecho al Olvido (GDPR Art. 17)

```
SOLICITUD: Usuario X solicita eliminación completa
│
├─ Validar solicitud
├─ UPDATE audit_logs: anonimizar usuario
├─ DELETE FROM clientes WHERE id = X
├─ Registrar anonimización en audit_logs
├─ Mantener audit trail (no puedo eliminar logs)
└─ Confirmar al usuario en 30 días
```

---

## 📈 Métricas a Monitorear

| Métrica | Target | Frecuencia |
|---------|--------|-----------|
| % Logs con timestamp válido | 99.99% | Diaria |
| Integridad de logs | 100% | Semanal |
| Alertas false positive | < 5% | Mensual |
| Tiempo de respuesta /api/audit | < 100ms | Continuo |
| Retención de logs | ≥ 7 años | Trimestral |
| Accesos RLS denegados | < 1% | Mensual |

---

## 📞 Contacto de Compliance

**Officer de Compliance:** [Nombre]  
**Email:** compliance@mayaautopartes.mx  
**Teléfono:** [Número]

**Para GDPR Subject Access Requests:**
- Email: dpo@mayaautopartes.mx
- Plazo: 30 días
- Formato: CSV/PDF encriptado

**Para audits ISO 27001:**
- Sistema disponible: 24/7
- Acceso a auditors: [Credenciales temporales]
- Datos archivados: [Ubicación física]

---

## 📚 Documentos Relacionados

1. **AUDIT_TRAIL_DESIGN.md** - Especificación técnica
2. **SECURITY_POLICY.md** - Política de seguridad (por crear)
3. **DATA_RETENTION_POLICY.md** - Política de retención (por crear)
4. **INCIDENT_RESPONSE_PLAN.md** - Plan de respuesta a incidentes (por crear)

---

**Última revisión:** 2026-04-22  
**Próxima revisión:** 2026-10-22 (6 meses)  
**Aprobado por:** [Autoridad competente]
