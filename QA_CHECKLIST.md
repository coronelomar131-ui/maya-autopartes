# ✅ QA CHECKLIST - Maya Autopartes

**Checklist completo para Quality Assurance antes de producción.**

**Estado:** Version 1.0 - Completo
**Fecha:** 2026-04-22
**Responsable:** QA Team

---

## 📋 Tabla de Contenidos

1. [Checklist Funcional](#checklist-funcional)
2. [Checklist de Seguridad](#checklist-de-seguridad)
3. [Checklist de Performance](#checklist-de-performance)
4. [Checklist de Compatibilidad de Navegadores](#checklist-de-compatibilidad-de-navegadores)
5. [Checklist de Responsiveness](#checklist-de-responsiveness)
6. [Checklist de Accesibilidad](#checklist-de-accesibilidad)
7. [Checklist Antes de Producción](#checklist-antes-de-producción)

---

## Checklist Funcional

### Módulo: Ventas

- [ ] Crear nueva venta con todos los datos
- [ ] Editar venta existente
- [ ] Eliminar venta con confirmación
- [ ] Buscar venta por cliente
- [ ] Filtrar ventas por fecha
- [ ] Filtrar ventas por estado (Pendiente, Completada, Cancelada)
- [ ] Ver detalle de venta
- [ ] Venta muestra monto total correcto
- [ ] Venta guarda cliente asociado
- [ ] Badge de "Ventas" actualiza al agregar/eliminar
- [ ] Historial de ventas se mantiene al recargar
- [ ] Búsqueda es case-insensitive
- [ ] Búsqueda parcial funciona (ej: "Jua" encuentra "Juan")
- [ ] Tabla ordena por columnas (si aplica)
- [ ] Exportar ventas a Excel
- [ ] Exportar ventas a CSV
- [ ] Exportar ventas a JSON
- [ ] Importar ventas desde Excel

### Módulo: Almacén

- [ ] Crear nuevo producto con nombre, precio, cantidad
- [ ] Editar producto existente
- [ ] Eliminar producto con confirmación
- [ ] Buscar producto por nombre
- [ ] Filtrar por rango de stock
- [ ] Filtrar por rango de precio
- [ ] Producto con stock bajo muestra en color rojo
- [ ] Producto con stock normal muestra en color verde
- [ ] Cantidad de stock es precisa
- [ ] Precio se muestra con 2 decimales
- [ ] Badge de "Almacén" actualiza
- [ ] Historial persiste en localStorage
- [ ] Imagen/Foto de producto se carga correctamente (si aplica)
- [ ] SKU o código de producto funciona
- [ ] Descripción de producto se guarda
- [ ] Categoría de producto se asigna
- [ ] Exportar almacén completo
- [ ] Grid o vista de productos es responsive

### Módulo: Clientes

- [ ] Crear nuevo cliente con nombre, teléfono, email
- [ ] Editar cliente existente
- [ ] Eliminar cliente con confirmación
- [ ] Buscar cliente por nombre
- [ ] Buscar cliente por teléfono
- [ ] Buscar cliente por email
- [ ] Ver historial de compras del cliente
- [ ] Crédito/Deuda del cliente se calcula
- [ ] Contacto del cliente es válido (email/teléfono)
- [ ] Badge de "Clientes" actualiza
- [ ] Datos de cliente persisten
- [ ] Duplicado de cliente se detecta/avisa
- [ ] Notas de cliente se guardan
- [ ] Dirección de cliente se registra
- [ ] RUC o documento se valida (si aplica)
- [ ] Foto/Avatar de cliente se carga (si aplica)

### Módulo: Facturas

- [ ] Crear nueva factura desde venta
- [ ] Asignar número de factura automático o manual
- [ ] Factura asocia cliente y productos correctamente
- [ ] Total de factura se calcula automáticamente
- [ ] Impuestos se calculan correctamente (IVA si aplica)
- [ ] Descuentos se aplican correctamente
- [ ] Ver factura generada
- [ ] Imprimir factura (formato PDF o papel)
- [ ] Factura tiene todos los datos legales
- [ ] Firma y sello (si aplica)
- [ ] Fecha y número de factura son únicos
- [ ] Historial de facturas se mantiene
- [ ] Búsqueda de factura por número
- [ ] Filtrar facturas por fecha
- [ ] Filtrar facturas por cliente
- [ ] Cancelar factura (marcar como anulada)
- [ ] Resumen financiero desde facturas

### Módulo: Usuarios

- [ ] Crear nuevo usuario con email y contraseña
- [ ] Asignar rol (Admin, Vendedor, Gerente)
- [ ] Editar usuario existente
- [ ] Eliminar usuario con confirmación
- [ ] Cambiar contraseña propia
- [ ] Admin puede cambiar contraseña de otros
- [ ] Roles se enforcan en permisos (Vendedor no accede a Usuarios)
- [ ] Sesión persiste al recargar
- [ ] Logout funciona correctamente
- [ ] Login con credenciales inválidas falla
- [ ] Login con credenciales válidas funciona
- [ ] 2FA (si aplica)
- [ ] Cuenta bloqueada tras intentos fallidos (si aplica)

### Módulo: Dashboard

- [ ] KPI de Ventas Totales muestra
- [ ] KPI de Cantidad de Ventas muestra
- [ ] KPI de Clientes Activos muestra
- [ ] KPI de Inventario Total muestra
- [ ] Gráfico de ventas por mes
- [ ] Gráfico de productos más vendidos
- [ ] Gráfico de inventario por categoría
- [ ] Datos en dashboard se actualizan en tiempo real
- [ ] Filtro de fecha funciona en dashboard

### Módulo: Exportar

- [ ] Opción de exportar está visible
- [ ] Exportar a Excel funciona
- [ ] Exportar a CSV funciona
- [ ] Exportar a JSON funciona
- [ ] Exportar a Compac funciona
- [ ] Archivos descargados tienen nombres correctos
- [ ] Archivos tienen los datos correctos
- [ ] Importar desde Excel funciona
- [ ] Mapeo de columnas en importación
- [ ] Validación durante importación
- [ ] Confirmación antes de importar

---

## Checklist de Seguridad

### Autenticación & Autorización

- [ ] Password se almacena con hash (no plaintext)
- [ ] Roles limitan acceso a módulos correctamente
- [ ] Admin accede a Usuarios
- [ ] Vendedor NO accede a Usuarios
- [ ] Gerente NO accede a config de Usuarios
- [ ] Login requiere email y contraseña
- [ ] Tokens de sesión se validan
- [ ] Sesión expira tras inactividad (si aplica)
- [ ] Logout limpia sesión completamente
- [ ] Password reset funciona correctamente
- [ ] Password recovery email se envía (si aplica)

### Input Validation & Injection Prevention

- [ ] XSS bloqueado: `<img src=x onerror="alert('XSS')">` NO se ejecuta
- [ ] HTML injection escapado: `<script>alert('xss')</script>` se guarda como texto
- [ ] SQL injection simulado: `' OR '1'='1` no afecta búsqueda
- [ ] Campos de número no aceptan letras
- [ ] Campos de email validan formato
- [ ] Campos de teléfono solo aceptan dígitos
- [ ] Campos de fecha validan formato
- [ ] Búsqueda sanitiza input
- [ ] Campos requeridos se validan
- [ ] Valores se escapan antes de mostrar en DOM

### Data Protection

- [ ] localStorage no contiene datos sensibles (ej: passwords)
- [ ] Datos en localStorage están validados
- [ ] localStorage corrupto no crashea app
- [ ] No hay logs de datos sensibles en consola
- [ ] Datos de cliente protegidos (si GDPR aplica)
- [ ] Datos de pago se tratan securely (si aplica)
- [ ] Backups de data son seguros

### API Security

- [ ] Conexión a Supabase usa HTTPS
- [ ] API keys no están en JavaScript visible
- [ ] CORS está configurado correctamente
- [ ] Rate limiting en sincronización (si aplica)
- [ ] Tokens expiran y se refreshan

### Browser Security

- [ ] No hay warnings en consola (security related)
- [ ] CSP headers configurados (si servidor aplica)
- [ ] No hay mixed content (HTTPS + HTTP)
- [ ] Cookies seguras (HttpOnly, Secure si aplica)

---

## Checklist de Performance

### Loading Performance

- [ ] Initial page load < 2 segundos
- [ ] DOMContentLoaded < 1 segundo
- [ ] First Contentful Paint < 0.8 segundos
- [ ] Largest Contentful Paint < 2.5 segundos
- [ ] Cumulative Layout Shift < 0.1
- [ ] Time to Interactive < 3 segundos
- [ ] Lighthouse score >= 85
- [ ] Lighthouse Performance >= 75

### Runtime Performance

- [ ] Búsqueda en 1000+ registros < 200ms
- [ ] Búsqueda con caché < 10ms
- [ ] Render de tabla con 500 items < 500ms
- [ ] Scroll en almacén grid es smooth (60 FPS)
- [ ] No hay lag al escribir en búsqueda
- [ ] No hay freezing de UI durante operaciones
- [ ] localStorage.setItem < 100ms incluso con muchos datos
- [ ] Cambio de vista (Ventas → Almacén) < 300ms

### Memory & Resources

- [ ] Sin memory leaks detectables
- [ ] Memoria vuelve aproximadamente a normal después de GC
- [ ] Uso de memoria base < 50MB
- [ ] Con 10000 registros, memoria < 150MB
- [ ] Sin warnings en DevTools Performance
- [ ] Network requests son mínimos

### Asset Optimization

- [ ] HTML/CSS/JS optimizado y minificado
- [ ] Imágenes comprimidas
- [ ] Sin recursos no usados
- [ ] Payloads de API son comprimidos
- [ ] Lazy loading donde aplica
- [ ] Cache headers configurados correctamente

---

## Checklist de Compatibilidad de Navegadores

### Chrome/Chromium

- [ ] Versión 90+ soportada
- [ ] Última versión funciona perfectamente
- [ ] Sin console warnings
- [ ] Sin console errors
- [ ] localStorage funciona
- [ ] Exportación descarga correctamente
- [ ] Impresión de factura funciona
- [ ] Zoom funciona (100-200%)

### Firefox

- [ ] Versión 88+ soportada
- [ ] Última versión funciona
- [ ] Sin errors en consola
- [ ] localStorage funciona
- [ ] Todas las features funcionan
- [ ] Performance similar a Chrome

### Safari (macOS/iOS)

- [ ] Versión 14+ soportada
- [ ] Descargas funcionan
- [ ] localStorage funciona
- [ ] Modales se abren correctamente
- [ ] Teclado virtual en móvil no rompe layout
- [ ] Touch events funcionan

### Edge

- [ ] Versión 90+ soportada
- [ ] Compatibilidad con Chrome features
- [ ] localStorage funciona
- [ ] Sin issues de rendering

### Mobile Browsers

- [ ] Chrome Mobile funciona
- [ ] Firefox Mobile funciona
- [ ] Safari Mobile (iOS) funciona
- [ ] Samsung Internet funciona
- [ ] Edge Mobile funciona

---

## Checklist de Responsiveness

### Desktop (1920x1080)

- [ ] Sidebar visible y funcional
- [ ] Tabla completa visible
- [ ] No hay overflow horizontal
- [ ] Modales centrados
- [ ] Botones accesibles
- [ ] Campos de entrada adecuados
- [ ] Gridde almacén muestra 4+ columnas

### Tablet (iPad - 768x1024)

- [ ] Sidebar se colapsa (hamburger menu si aplica)
- [ ] Tabla scrollable horizontalmente si es necesario
- [ ] Touch targets son >= 44x44 px
- [ ] Modales ocupan 90% del ancho
- [ ] Zoom funciona correctamente
- [ ] No hay content overflow

### Móvil Pequeño (iPhone - 375x667)

- [ ] Sidebar colapsado por default
- [ ] Tabla scrollable (horizontal y vertical)
- [ ] Botones espaciados (no se clickean juntos)
- [ ] Inputs ocupan todo el ancho (casi)
- [ ] Modales en full-screen o 95% ancho
- [ ] Sin texto truncado importante
- [ ] Teclado no oculta completamente el contenido
- [ ] Pueden completarse todas las operaciones en móvil

### Móvil Mediano (iPhone Plus - 414x896)

- [ ] Similar a móvil pequeño
- [ ] Mejor distribución de espacio
- [ ] Grid de almacén puede mostrar 2-3 columnas

### Móvil Landscape (cualquier orientación horizontal)

- [ ] Layout se ajusta correctamente
- [ ] Sidebar visible o colapsado según espacio
- [ ] Tabla funcional en horizontal
- [ ] Modales se redimensionan

### General Responsiveness

- [ ] No hay hardcoded width/height en elementos
- [ ] Breakpoints están correctamente configurados
- [ ] Media queries se aplican correctamente
- [ ] Imágenes se escalan
- [ ] Texto legible en todos los tamaños
- [ ] No hay elementos escondidos sin razón

---

## Checklist de Accesibilidad

### Keyboard Navigation

- [ ] Tab navega todos los elementos interactivos
- [ ] Tab order es lógico
- [ ] Shift+Tab navega hacia atrás
- [ ] Enter abre modales
- [ ] Escape cierra modales
- [ ] Arrow keys funcionan en selects y listas
- [ ] No hay tabindex negativo innecesario

### Screen Readers

- [ ] Aria-labels en botones sin texto
- [ ] Aria-labels en inputs
- [ ] Tablas tienen <thead> y <tbody>
- [ ] Encabezados semánticos (h1, h2, h3)
- [ ] Links describen destino claramente
- [ ] Alt text en imágenes (si aplica)
- [ ] Aria-live para contenido dinámico

### Visual Accessibility

- [ ] Colores tienen suficiente contraste (4.5:1 para texto)
- [ ] No depende solo de color (ej: rojo para error + icono)
- [ ] Texto es redimensionable (sin overflow en 200%)
- [ ] Focus states visibles (outline alrededor de botones)
- [ ] No hay flash/parpadeo > 3 veces por segundo

### Forms Accessibility

- [ ] Labels asociadas con inputs (for/id)
- [ ] Error messages visibles y accesibles
- [ ] Placeholder no reemplaza label
- [ ] Campos requeridos indicados de forma accesible
- [ ] Form submit accesible por Enter o botón

---

## Checklist Antes de Producción

### Code Quality

- [ ] No hay console.log() de debug
- [ ] No hay commented code
- [ ] No hay TODO/FIXME sin resolver
- [ ] Code está minificado (producción)
- [ ] Source maps configurados (si aplica)
- [ ] No hay unused variables
- [ ] Variables tienen nombres significativos
- [ ] Funciones tienen un propósito claro

### Documentation

- [ ] README.md está actualizado
- [ ] INSTALLATION.md existe
- [ ] API documentation existe
- [ ] Known issues documentados
- [ ] Changelog existe
- [ ] Comments en código complejo

### Environment

- [ ] Environment variables correctos
- [ ] API keys no están en código
- [ ] Supabase URL y key configuradas
- [ ] MercadoLibre tokens correctamente almacenados
- [ ] Drive API key en lugar seguro
- [ ] Database migrations ejecutadas (si aplica)

### Testing

- [ ] Todos los test cases de TEST_SUITE.md pasaron
- [ ] Manual testing completado
- [ ] Smoke tests pasaron
- [ ] Regression testing realizado
- [ ] Edge cases probados
- [ ] Performance benchmarks cumplidos

### Deployment

- [ ] Build process automatizado
- [ ] Deployment sin errores
- [ ] Database migrations ejecutadas
- [ ] Cache cleared en servidor
- [ ] CDN actualizado (si aplica)
- [ ] DNS propagado (si nuevo dominio)
- [ ] SSL certificate válido
- [ ] HTTPS funciona

### Monitoring

- [ ] Error tracking configurado (Sentry, etc)
- [ ] Analytics configurado (Google Analytics, etc)
- [ ] Logs se escriben correctamente
- [ ] Alertas configuradas para errores críticos
- [ ] Uptime monitoring activo
- [ ] Performance monitoring activo

### Data & Backup

- [ ] Datos production backed up
- [ ] Backup strategy documentada
- [ ] Restore procedure probada
- [ ] Data migration completada (si aplica)
- [ ] Histórico de datos preservado
- [ ] GDPR compliance si aplica

### User Communication

- [ ] Usuarios notificados del launch
- [ ] Tutorial/onboarding preparado
- [ ] Support team entrenado
- [ ] FAQ documentado
- [ ] Contact support funciona
- [ ] Error messages son claros

### Final Checks

- [ ] Product Owner aprueba QA
- [ ] Team lead aprueba deployment
- [ ] Backup plan existe en caso de rollback
- [ ] Runbook para deployment creado
- [ ] Equipo on-call disponible primeras 24h
- [ ] Versión en control de versiones tagged
- [ ] Git history limpio y organizado

---

## Sign-Off

| Rol | Nombre | Firma | Fecha |
|-----|--------|-------|-------|
| QA Lead | _____________ | _____________ | _______ |
| Dev Lead | _____________ | _____________ | _______ |
| Product Owner | _____________ | _____________ | _______ |
| DevOps/Deploy | _____________ | _____________ | _______ |

---

## Como Usar Esta Checklist

### Para cada test:
1. Leer la descripción
2. Ejecutar el test/verificación
3. Marcar [ ] si pasa
4. Si NO pasa, documentar:
   - [ ] Test que falló
   - [ ] Pasos para reproducir
   - [ ] Error/Comportamiento esperado vs actual
   - [ ] Severidad (Critical/High/Medium/Low)
   - [ ] Reportar en KNOWN_ISSUES.md

### Escalation:
- **Critical**: Bloquea producción, fix antes de deploy
- **High**: Funcionalidad importante, resolver ASAP
- **Medium**: Mejorar experiencia, puede esperar próxima versión
- **Low**: Nice to have, resolver cuando sea posible

### Aprobación:
- Todas las Critical y High deben estar resueltas
- Medium puede ser deferred con aprobación Product Owner
- Low puede ser deferred sin problemas
- QA Lead debe firmar cuando todo está green

---

**Versión:** 1.0 | **Última actualización:** 2026-04-22 | **Próxima revisión:** 2026-05-06
