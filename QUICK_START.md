# 🚀 QUICK START - Maya Autopartes en 5 Pasos

**Tiempo estimado**: 5 minutos  
**Nivel**: Principiante  
**Resultado**: Sistema funcionando y listo usar

---

## 📋 PASO 1: ABRIR LA APLICACIÓN (30 segundos)

### Opción A: En línea (recomendado)
```
1. Abre tu navegador (Chrome, Firefox, Safari)
2. Ve a: https://maya-autopartes.vercel.app
3. ¡Listo! La aplicación carga automáticamente
```

### Opción B: Descargar localmente
```
1. Descarga el archivo: index.html
2. Haz doble-click
3. Se abre automáticamente en tu navegador
```

### Opción C: Desde repositorio Git
```bash
git clone https://github.com/coronelomar131-ui/maya-autopartes.git
cd maya-autopartes-working
# Abre index.html en navegador (doble-click o Live Server)
```

---

## 🔐 PASO 2: INGRESA CON TUS CREDENCIALES (1 minuto)

### Demo Credentials (Para Prueba)
```
Selecciona tu rol:

👨‍💼 ADMINISTRADOR
Usuario:     admin@maya.com
Contraseña:  admin123
Acceso:      Total (todos los módulos)

🛍️ VENDEDOR
Usuario:     vendedor@maya.com
Contraseña:  vendor123
Acceso:      Crear ventas, ver clientes

👔 GERENTE
Usuario:     gerente@maya.com
Contraseña:  manager123
Acceso:      Ver reportes y almacén
```

### Tutorial
1. Ingresa email en campo "Usuario"
2. Ingresa contraseña en campo "Contraseña"
3. Click en botón "Ingresar"
4. ¡Bienvenido al Dashboard!

---

## 📊 PASO 3: EXPLORA EL DASHBOARD (1 minuto)

Una vez adentro verás:

### En la parte superior
```
┌─────────────────────────────────────┐
│  MAYA AUTOPARTES          👤 Perfil │
│  Dashboard                      ⚙️ │
└─────────────────────────────────────┘
```

### En el lado izquierdo (Menú)
```
📊 Dashboard      ← Estás aquí
💰 Ventas
📦 Almacén
👥 Clientes
👤 Usuarios
📄 Facturas
📤 Exportar
```

### En el centro (KPIs principales)
```
Total Ventas:      $45,230 MXN
Total Productos:   1,245
Total Clientes:    342
Bajo Stock:        23 alertas
Margen Ganancia:   18.5%
```

### En la parte inferior
```
Últimas Transacciones:
• Venta - Juan García - $2,500
• Venta - María López - $1,800
• Almacén - Stock Ajustado
```

---

## 💰 PASO 4: CREA TU PRIMERA VENTA (2 minutos)

### Tutorial paso a paso

**1. Click en el menú "Ventas"**
```
Se abre el módulo de Ventas
Verás una tabla con ventas anteriores
```

**2. Click en botón "➕ NUEVA VENTA"**
```
Se abre un formulario modal para crear venta
```

**3. Completa los campos**
```
Cliente:      [Escribe o selecciona un cliente]
              (ej: "Juan García")
              → Si no existe, se crea automáticamente

Producto:     [Selecciona producto del almacén]
              (ej: "Puerta Delantera")

Cantidad:     [Escribe cantidad]
              (ej: 2)

Precio:       $2,500 MXN
              (Se completa automáticamente)
```

**4. Verifica el cálculo**
```
Subtotal:     $5,000 MXN  (2 × $2,500)
IVA (16%):    $800 MXN    (Automático)
TOTAL:        $5,800 MXN  (Automático)
```

**5. Click en "Guardar"**
```
✅ ¡Venta guardada!
La venta aparece en la tabla
Se sincroniza en tiempo real (si Supabase activo)
```

---

## 🧾 PASO 5: GENERA TU PRIMERA FACTURA (1 minuto)

### Tutorial

**1. Ve al módulo "Facturas"**
```
Click en menú → "Facturas"
Verás las facturas emitidas
```

**2. Click en "➕ NUEVA FACTURA"**
```
Se abre el formulario
```

**3. Completa datos**
```
Venta:          [Selecciona venta creada]
                (Se completa automáticamente)

Cliente:        Juan García (Automático)
Dirección:      Se obtiene de datos del cliente
RFC:            se usa para facturación
```

**4. Click en "Generar Factura"**
```
✅ Factura generada
Le asigna folio automático
Incluye fecha y hora
```

**5. Imprime o exporta**
```
Opciones disponibles:
🖨️  Imprimir (Print)
📥 Descargar PDF
📤 Enviar a Google Drive
```

---

## 📱 PRÓXIMAS ACCIONES RECOMENDADAS

### Después de los 5 pasos (5 minutos adicionales)

**Paso 6: Agrega productos a tu Almacén** (Opcional)
```
1. Ve a módulo "Almacén"
2. Click "➕ NUEVO PRODUCTO"
3. Completa: Nombre, Código, Precio, Stock
4. Click "Guardar"
```

**Paso 7: Agrega clientes** (Opcional)
```
1. Ve a módulo "Clientes"
2. Click "➕ NUEVO CLIENTE"
3. Completa: Nombre, RFC, Email, Teléfono
4. Click "Guardar"
```

**Paso 8: Cambia tu contraseña** (IMPORTANTE)
```
1. Click en tu perfil (arriba a la derecha)
2. Click "Cambiar Contraseña"
3. Ingresa contraseña actual y nueva
4. Click "Guardar"
```

**Paso 9: Invita a otros usuarios** (Si eres Admin)
```
1. Ve a módulo "Usuarios"
2. Click "➕ NUEVO USUARIO"
3. Completa: Email, Contraseña, Rol
4. Click "Guardar"
```

**Paso 10: Exporta tus datos** (Backup)
```
1. Ve a módulo "Exportar"
2. Selecciona qué exportar
3. Elige formato (Excel, CSV, JSON)
4. Click "Descargar"
```

---

## 🎯 FLUJOS RÁPIDOS POR ROL

### 👨‍💼 Si eres ADMINISTRADOR
```
1. Dashboard → Ver KPIs
2. Usuarios → Crear/editar usuarios
3. Almacén → Agregar productos
4. Clientes → Agregar clientes
5. Facturas → Monitorear facturación
6. Exportar → Hacer backups
```

### 🛍️ Si eres VENDEDOR
```
1. Dashboard → Ver últimas ventas
2. Ventas → Crear nueva venta
3. Clientes → Ver datos de cliente
4. Facturas → Generar factura
5. Almacén → Ver stock disponible
```

### 👔 Si eres GERENTE
```
1. Dashboard → Ver KPIs principales
2. Ventas → Filtrar por fecha/cliente
3. Almacén → Monitorear stock bajo
4. Facturas → Ver historial
5. Exportar → Generar reportes
```

---

## ❓ PREGUNTAS FRECUENTES RÁPIDAS

### P: ¿Se pierden mis datos si cierro el navegador?
R: **No.** Los datos se guardan en localStorage. Persisten entre sesiones.

### P: ¿Funciona sin internet?
R: **Sí.** Funciona 100% offline. Sincroniza cuando hay conexión (si activas Supabase).

### P: ¿Puedo usar en múltiples dispositivos?
R: **Sí.** Con Supabase activo. Los cambios se sincronizan en tiempo real.

### P: ¿Cómo hago backup de mis datos?
R: Ve a módulo "Exportar" → Descarga en Excel, CSV o JSON.

### P: ¿Cuántos usuarios puedo crear?
R: Ilimitados. Sistema soporta 100+ usuarios simultáneos.

### P: ¿Se pueden editar datos después de guardar?
R: **Sí.** Cada módulo permite editar registros. Click en el ícono "✏️".

### P: ¿Se pueden eliminar datos?
R: **Sí.** Cada módulo permite eliminar. Click en "🗑️" (cuidado, no hay undo).

### P: ¿Cómo cambio de usuario?
R: Click en tu perfil (arriba) → "Cerrar Sesión" → Ingresa con otro usuario.

### P: ¿Dónde está el archivo de ayuda?
R: Click en "❓" (esquina superior derecha) → Ver USER_GUIDE.md.

### P: ¿A quién contacto si tengo problemas?
R: Email: coronelomar131@gmail.com o ve a USER_GUIDE.md.

---

## 🔒 SEGURIDAD - IMPORTANTE

### Después de empezar
```
1. CAMBIA TUS CREDENCIALES INMEDIATAMENTE
   ⚠️ Las credenciales demo son públicas

2. HABILITA 2FA (Si disponible)
   → Módulo Usuarios → Tu perfil → 2FA

3. EXPORTA DATOS REGULARMENTE
   → Módulo Exportar → Descarga JSON

4. NO COMPARTAS CREDENCIALES
   → Cada usuario debe tener su cuenta
```

---

## 🚀 DESPLIEGUE EN PRODUCCIÓN

### Si quieres tu propio dominio
```
1. Tu sitio está en: https://maya-autopartes.vercel.app
2. Para dominio personalizado:
   a) Ve a https://vercel.com
   b) Conecta tu GitHub
   c) Configura tu dominio
   d) ¡Listo en 5 minutos!
```

### Si quieres hosting propio
```
1. Descarga los archivos
2. Copia a tu servidor
3. Abre index.html
4. ¡Listo! (Es un SPA, funciona en cualquier lado)
```

---

## 📞 SOPORTE RÁPIDO

### Documentos importantes
```
📖 USER_GUIDE.md         → Guía completa para usuarios
🔧 DEVELOPER_GUIDE.md    → Para desarrolladores
🚀 DEPLOYMENT_GUIDE.md   → Para desplegar
📊 FINAL_PROJECT_SUMMARY.md → Resumen técnico
```

### En línea
```
🌐 GitHub Issues        → Para reportar bugs
💬 GitHub Discussions   → Para preguntas
📧 Email: coronelomar131@gmail.com
```

---

## ✅ CHECKLIST - ¿LO LOGRASTE?

```
□ Abriste la aplicación
□ Ingresaste con credenciales demo
□ Viste el Dashboard
□ Creaste una venta
□ Generaste una factura
□ Exportaste datos
□ Cambiaste tu contraseña
□ Agregaste un producto
□ Agregaste un cliente
□ Invitaste otro usuario

Si tachaste TODO: ¡Felicitaciones! 🎉
Ya sabes usar Maya Autopartes
```

---

## 🎓 SIGUIENTE NIVEL

### Después de dominar lo básico

**Para Usuarios**:
- Lee USER_GUIDE.md (30 minutos)
- Descubre features avanzadas
- Usa todas las exportaciones

**Para Administradores**:
- Lee DEVELOPER_GUIDE.md (1 hora)
- Aprende a customizar
- Configura integraciones (Supabase, Google Drive)

**Para Desarrolladores**:
- Lee ARCHITECTURE.md
- Modifica el código
- Crea tus propias features

---

## 🎯 RESUMEN

```
5 PASOS = 5 MINUTOS = SISTEMA FUNCIONANDO

1️⃣  Abre la aplicación (30s)
2️⃣  Ingresa credenciales (1 min)
3️⃣  Explora Dashboard (1 min)
4️⃣  Crea venta (2 min)
5️⃣  Genera factura (1 min)

LISTO PARA USAR 🚀
```

---

## 📞 PRÓXIMO PASO

**Opción 1**: Abre https://maya-autopartes.vercel.app y sigue los 5 pasos.

**Opción 2**: Descarga index.html y abre en tu navegador.

**Opción 3**: Si tienes problemas, lee USER_GUIDE.md (soluciona 99% de dudas).

---

**Versión**: 3.0.0  
**Fecha**: 2026-04-22  
**Status**: ✅ Listo para usar  

**¡Bienvenido a Maya Autopartes!** 🚗

Cualquier duda, revisa la documentación completa incluida.
