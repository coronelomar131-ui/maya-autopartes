# 👥 USER GUIDE - Maya Autopartes

**Versión**: 3.0.0  
**Fecha**: 2026-04-22  
**Idioma**: Español  

---

## 📖 TABLA DE CONTENIDOS

1. [Inicio Rápido](#inicio-rápido)
2. [Primeros Pasos](#primeros-pasos)
3. [Módulo Dashboard](#módulo-dashboard)
4. [Módulo Ventas](#módulo-ventas)
5. [Módulo Almacén](#módulo-almacén)
6. [Módulo Clientes](#módulo-clientes)
7. [Módulo Usuarios](#módulo-usuarios)
8. [Módulo Facturas](#módulo-facturas)
9. [Exportación de Datos](#exportación-de-datos)
10. [FAQ y Troubleshooting](#faq-y-troubleshooting)

---

## 🚀 INICIO RÁPIDO

### Opción 1: Abrir archivo localmente
1. Descargar `maya-autopartes.html`
2. Abrir archivo en navegador (Ctrl+O o Cmd+O)
3. ¡Listo! La app carga automáticamente

### Opción 2: Abrir en la nube
1. Ir a [sitio deployado](https://maya-autopartes.netlify.app)
2. Usar con credenciales de demo (ver abajo)

### Credenciales de Demo

Prueba la app con estas credenciales:

| Usuario | Contraseña | Rol | Acceso |
|---------|-----------|-----|--------|
| `admin@maya.com` | `admin123` | Admin | Todo |
| `vendedor@maya.com` | `vendor123` | Vendedor | Ventas, Almacén, Clientes, Facturas |
| `gerente@maya.com` | `manager123` | Gerente | Dashboard, Reportes |

---

## 📱 PRIMEROS PASOS

### 1. Pantalla de Login
```
┌─────────────────────────────────────┐
│       🚗 MAYA AUTOPARTES           │
│                                     │
│  Usuario: [________________]       │
│                                     │
│  Contraseña: [________________]    │
│                                     │
│  [      INGRESAR      ]            │
│                                     │
│  Demo: admin@maya.com / admin123   │
└─────────────────────────────────────┘
```

**Pasos:**
1. Ingresa tu usuario (email)
2. Ingresa tu contraseña
3. Click en "INGRESAR"
4. ¡Bienvenido al dashboard!

### 2. Interface Principal

```
┌─────────────────────────────────────────────────────┐
│ 🚗 MAYA AUTOPARTES  |  👤 Usuario  |  🔓 Salir    │
├──────────┬─────────────────────────────────────────┤
│ Dashboard│  [Contenido dinámico]                   │
│ 📊      │                                          │
│ Ventas   │                                          │
│ 💰      │                                          │
│ Almacén  │                                          │
│ 📦      │                                          │
│ Clientes │                                          │
│ 👥      │                                          │
│ Usuarios │                                          │
│ 🔐      │                                          │
│ Facturas │                                          │
│ 📄      │                                          │
│ Exportar │                                          │
│ 📥      │                                          │
└──────────┴─────────────────────────────────────────┘
```

### 3. Menú de Navegación

| Ícono | Nombre | Acceso | Descripción |
|-------|--------|--------|-------------|
| 📊 | Dashboard | Todos | Resumen y KPIs |
| 💰 | Ventas | Admin, Vendedor | Registro de ventas |
| 📦 | Almacén | Admin, Vendedor | Gestión de inventario |
| 👥 | Clientes | Admin, Vendedor | Base de datos de clientes |
| 🔐 | Usuarios | Admin | Gestión de usuarios |
| 📄 | Facturas | Admin, Vendedor | Historial de facturas |
| 📥 | Exportar | Admin | Descargar datos |

---

## 📊 MÓDULO DASHBOARD

### Vista General
El dashboard muestra un resumen en tiempo real de tu negocio:

```
┌─────────────────────────────────────────────┐
│              📊 DASHBOARD                  │
├─────────────────────────────────────────────┤
│                                             │
│  Estadísticas                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │ Ventas   │  │ Ingresos │  │ Promedio │ │
│  │   25     │  │ $15,340  │  │ $614     │ │
│  └──────────┘  └──────────┘  └──────────┘ │
│                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
│  │Productos │  │ Stock $  │  │ Margen   │ │
│  │   127    │  │ $45,200  │  │ 35%      │ │
│  └──────────┘  └──────────┘  └──────────┘ │
│                                             │
│  Últimas Ventas                             │
│  ┌─────────────────────────────────────┐  │
│  │ Cliente | Productos | Total | Fecha  │  │
│  ├─────────────────────────────────────┤  │
│  │ Juan Pérez | 3 | $2,450 | Hoy     │  │
│  │ Maria López | 2 | $1,200 | Hoy    │  │
│  │ Carlos Ruiz | 5 | $3,100 | Ayer   │  │
│  └─────────────────────────────────────┘  │
│                                             │
└─────────────────────────────────────────────┘
```

### Información Mostrada

**KPIs (Indicadores Clave)**
- 📈 Total de ventas (últimos 30 días)
- 💵 Ingresos acumulados
- 📊 Venta promedio
- 📦 Productos en stock
- 💰 Valor total del inventario
- 📈 Margen de ganancia promedio

**Últimas Transacciones**
- Últimas 5 ventas realizadas
- Información del cliente
- Cantidad de productos vendidos
- Total de cada venta
- Fecha de la transacción

### Acciones Disponibles
- 🔄 Actualizar datos (F5)
- 📊 Ver detalles de venta
- ➕ Nueva venta rápida

---

## 💰 MÓDULO VENTAS

### Vista de Ventas

```
┌──────────────────────────────────────────────┐
│          💰 VENTAS                           │
│                                              │
│  [🔍 Buscar...] [➕ Nueva Venta] [Ver...]  │
│                                              │
│  Filtrar: [Mes] [Semana] [Hoy] [Todos]    │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ Folio│Cliente│Productos│Total │Fecha  │ │
│  ├────────────────────────────────────────┤ │
│  │ 001  │Juan   │ 3       │$2,450│Hoy    │ │
│  │ 002  │Maria  │ 2       │$1,200│Hoy    │ │
│  │ 003  │Carlos │ 5       │$3,100│Ayer   │ │
│  │ ... (paginada)                        │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  Página 1 de 5 | [< >]                    │
└──────────────────────────────────────────────┘
```

### Crear Nueva Venta

**Paso 1: Abrir formulario**
1. Click en botón "➕ Nueva Venta"
2. Se abre modal de entrada

**Paso 2: Llenar cliente**
```
┌─────────────────────────────────┐
│    ➕ NUEVA VENTA                │
├─────────────────────────────────┤
│                                 │
│ Cliente: [Buscar...]           │
│          ▼ (Autocompletar)      │
│          - Juan Pérez           │
│          - Maria López          │
│          - Carlos Ruiz          │
│                                 │
│ RFC: [________________]         │
│ Empresa: [________________]    │
│                                 │
│ [Siguiente]                    │
└─────────────────────────────────┘
```

**Paso 3: Agregar productos**
```
│ Producto: [Buscar...]          │
│           ▼ (Autocompletar)    │
│           - Batería 12V         │
│           - Aceite 5L           │
│           - Filtro aire         │
│                                 │
│ Cantidad: [1] +-              │
│ Precio: $450.00               │
│ Subtotal: $450.00             │
│                                 │
│ [Agregar producto]            │
│                                 │
│ Productos agregados:           │
│ - Batería 12V  x2  $900       │
│ - Filtro aire  x1  $150       │
└─────────────────────────────────┘
```

**Paso 4: Revisar totales**
```
│ Subtotal:        $1,050.00    │
│ IVA (16%):       $  168.00    │
│ ────────────────────────────── │
│ TOTAL:           $1,218.00    │
│                                 │
│ [Confirmar venta] [Cancelar]   │
└─────────────────────────────────┘
```

### Editar Venta Existente

1. Localiza la venta en la tabla
2. Click en la fila o en icono ✏️
3. Modal se abre con datos
4. Realiza cambios
5. Click en "Guardar cambios"

### Eliminar Venta

1. Click en icono 🗑️ de la venta
2. Confirmar eliminación
3. Venta se elimina del registro

### Detalles de Venta

**Información mostrada:**
- Folio único (numerado automático)
- Nombre del cliente y RFC
- Lista de productos con cantidad y precio
- Subtotal
- Cálculo automático de IVA (16%)
- Total con impuestos
- Fecha y hora de registro
- Usuario que registró

**Acciones:**
- 👁️ Ver detalles completos
- 📄 Generar factura
- ✏️ Editar
- 🗑️ Eliminar
- 🖨️ Imprimir
- 📋 Copiar

---

## 📦 MÓDULO ALMACÉN

### Vista de Almacén

```
┌──────────────────────────────────────────────┐
│        📦 ALMACÉN (Ver: Grid/Tabla)          │
│                                              │
│ [🔍 Buscar...] [➕ Nuevo] [Vista Grid/Tab] │
│                                              │
│ Vista Grid (default):                        │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│ │Batería  │  │ Filtro  │  │Aceite 5L│     │
│ │12V      │  │ aire    │  │         │     │
│ │$450     │  │$150     │  │$85      │     │
│ │Stock: 8 │  │Stock: 15│  │Stock: 23│     │
│ └─────────┘  └─────────┘  └─────────┘     │
│ ┌─────────┐  ┌─────────┐  ┌─────────┐     │
│ │Tubo...  │  │Pastilla │  │Correa...│     │
│ └─────────┘  └─────────┘  └─────────┘     │
│                                              │
│ Vista Tabla (alternativa):                   │
│ ┌────────────────────────────────────────┐  │
│ │Código│Producto│Precio│Stock│Valor   │  │
│ ├────────────────────────────────────────┤  │
│ │BAT01 │Batería │$450  │ 8   │$3,600  │  │
│ │FIL02 │Filtro  │$150  │ 15  │$2,250  │  │
│ └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

### Agregar Producto

1. Click "➕ Nuevo"
2. Llenar formulario:
   ```
   Código: [BAT001]
   Producto: [Batería 12V 600A]
   Precio: [$450.00]
   Stock: [10]
   Categoría: [Baterías ▼]
   ```
3. Click "Guardar"

### Editar Stock

**Opción 1: Mediante tarjeta (Grid)**
1. Click en producto
2. Botones ➕ y ➖ para ajustar
3. Cambio se guarda automático

**Opción 2: Mediante tabla**
1. Click en ✏️ del producto
2. Editar cantidad
3. Click "Guardar"

### Búsqueda en Almacén

**Búsqueda rápida:**
```
[🔍 Buscar "Batería"]  (Se filtra en tiempo real)
```

**Busca por:**
- 📝 Nombre del producto
- 🔢 Código
- 🏷️ Categoría
- 📊 Stock

**Ejemplo:**
- Buscar "bat" → Muestra todas las baterías
- Buscar "5l" → Muestra aceites de 5L

### Alertas de Stock

Los productos con stock bajo se marcan con color rojo:

```
┌─────────────┐
│Tubo escape  │  ← Rojo (Stock bajo)
│$180         │
│Stock: 2     │
└─────────────┘
```

**Interpretación de colores:**
- 🟢 Verde: Stock normal (más de 5 unidades)
- 🟡 Amarillo: Stock bajo (3-5 unidades)
- 🔴 Rojo: Crítico (menos de 3 unidades)

---

## 👥 MÓDULO CLIENTES

### Vista de Clientes

```
┌──────────────────────────────────────────────┐
│       👥 CLIENTES                            │
│                                              │
│ [🔍 Buscar...] [➕ Nuevo Cliente]           │
│                                              │
│ ┌─────────────────────────────────────────┐ │
│ │   JUAN PÉREZ GARCÍA                     │ │
│ │   RFC: JPG8604175A5                    │ │
│ │   Empresa: Autopartes JP                │ │
│ │   Teléfono: 555-123-4567               │ │
│ │   Email: juan@ejemplo.com              │ │
│ │   Ubicación: México, CDMX              │ │
│ │   Compras: 12 | Total: $25,340        │ │
│ │   [👁️ Ver] [✏️ Editar] [🗑️ Eliminar]   │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ ┌─────────────────────────────────────────┐ │
│ │   MARIA LOPEZ RUIZ                      │ │
│ │   RFC: MLR9203150B9                    │ │
│ │   ...                                   │ │
│ └─────────────────────────────────────────┘ │
│                                              │
└──────────────────────────────────────────────┘
```

### Agregar Cliente

1. Click "➕ Nuevo Cliente"
2. Llenar información:
   ```
   Nombre: [Juan Pérez García]
   RFC: [JPG8604175A5]
   Empresa: [Autopartes JP]
   Teléfono: [555-123-4567]
   Email: [juan@ejemplo.com]
   Ubicación: [México, CDMX]
   ```
3. Click "Guardar cliente"

### Ver Historial de Cliente

1. Click en cliente
2. Ver panel con:
   - Información personal
   - **Últimas 5 compras**
   - **Total gastado**
   - **Promedio por compra**
   - **Frecuencia de compra**

### Editar Cliente

1. Click ✏️ en cliente
2. Modificar datos necesarios
3. Click "Guardar cambios"

---

## 🔐 MÓDULO USUARIOS

### Gestión de Usuarios (Solo Admin)

```
┌──────────────────────────────────────────────┐
│    🔐 USUARIOS & ROLES                       │
│                                              │
│ [➕ Nuevo Usuario]                          │
│                                              │
│ ┌─────────────────────────────────────────┐ │
│ │ admin@maya.com                          │ │
│ │ Rol: ADMIN                              │ │
│ │ ✓ Acceso total al sistema              │ │
│ │ [👁️ Ver] [✏️ Editar] [🗑️ Eliminar]      │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ ┌─────────────────────────────────────────┐ │
│ │ vendedor@maya.com                       │ │
│ │ Rol: VENDEDOR                           │ │
│ │ ✓ Crear ventas                         │ │
│ │ ✓ Ver almacén                          │ │
│ │ ✓ Crear facturas                       │ │
│ │ ✗ Eliminar datos                       │ │
│ │ ✗ Gestionar usuarios                   │ │
│ └─────────────────────────────────────────┘ │
│                                              │
└──────────────────────────────────────────────┘
```

### Crear Nuevo Usuario

1. Click "➕ Nuevo Usuario"
2. Llenar:
   ```
   Email: [nuevo@maya.com]
   Contraseña: [••••••••]
   Rol: [VENDEDOR ▼]
   ```
3. Click "Crear usuario"

### Roles Disponibles

| Rol | Dashboard | Ventas | Almacén | Clientes | Usuarios | Facturas | Exportar |
|-----|-----------|--------|---------|----------|----------|----------|----------|
| Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Vendedor | ✓ | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ |
| Gerente | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

### Cambiar Contraseña

1. Click en tu nombre (arriba derecha)
2. Click "Cambiar contraseña"
3. Ingresar:
   ```
   Contraseña actual: [••••••••]
   Nueva contraseña: [••••••••]
   Confirmar: [••••••••]
   ```
4. Click "Actualizar"

---

## 📄 MÓDULO FACTURAS

### Vista de Facturas

```
┌──────────────────────────────────────────────┐
│      📄 FACTURAS                             │
│                                              │
│ Historial de todas las facturas emitidas     │
│                                              │
│ ┌─────────────────────────────────────────┐ │
│ │ Folio: 001                              │ │
│ │ Cliente: Juan Pérez García              │ │
│ │ Fecha: 22/04/2026                       │ │
│ │ Total: $1,218.00                        │ │
│ │ Estado: ✓ Emitida                      │ │
│ │ [👁️ Ver] [🖨️ Imprimir] [🗑️ Eliminar]  │ │
│ └─────────────────────────────────────────┘ │
│                                              │
│ ┌─────────────────────────────────────────┐ │
│ │ Folio: 002                              │ │
│ │ ... (más facturas)                      │ │
│ └─────────────────────────────────────────┘ │
│                                              │
└──────────────────────────────────────────────┘
```

### Generar Factura desde Venta

1. Ir a módulo "Ventas"
2. Localizar venta deseada
3. Click en icono "📄 Factura"
4. Se genera automáticamente
5. Aparece en módulo "Facturas"

### Ver Factura Completa

```
┌──────────────────────────────────────────────┐
│     MAYA AUTOPARTES - FACTURA                │
│     RFC: MAY20260422001                      │
│                                              │
│  FOLIO: 001                                  │
│  FECHA: 22 de Abril de 2026                  │
│                                              │
│  CLIENTE:                                    │
│  Nombre: Juan Pérez García                   │
│  RFC: JPG8604175A5                          │
│  Empresa: Autopartes JP                      │
│                                              │
│  ─────────────────────────────────────────   │
│  Cantidad │ Concepto    │ P. Unitario │ Total│
│  ─────────────────────────────────────────   │
│    2      │ Batería 12V │ $450.00     │$900 │
│    1      │ Filtro aire │ $150.00     │$150 │
│                                              │
│  SUBTOTAL:               $1,050.00          │
│  IVA (16%):             $  168.00          │
│  ─────────────────────────────────────────  │
│  TOTAL:                 $1,218.00          │
│                                              │
│  Pagado: ☐ No  ☑ Sí                       │
│                                              │
│  [🖨️ Imprimir] [📥 Descargar PDF] [✏️ Edit │
└──────────────────────────────────────────────┘
```

### Imprimir Factura

1. Click en icono "🖨️ Imprimir"
2. Se abre vista de impresión
3. Ajusta tamaño de papel (A4 recomendado)
4. Click "Imprimir" en navegador
5. Selecciona impresora

### Descargar como PDF

1. Click en factura
2. Click en botón "📥 Descargar PDF"
3. Se descarga en carpeta Descargas

---

## 📥 EXPORTACIÓN DE DATOS

### Vista de Exportación

```
┌──────────────────────────────────────────────┐
│     📥 EXPORTAR DATOS                        │
│                                              │
│  Selecciona el formato deseado:              │
│                                              │
│  [📊 Excel (.xlsx)]                         │
│     Para abrir en Excel/Calc                │
│     Incluye: Facturas con formato           │
│                                              │
│  [📋 CSV (.csv)]                            │
│     Para bases de datos                     │
│     Incluye: Todas las tablas               │
│                                              │
│  [📑 JSON (.json)]                          │
│     Para sistemas/APIs                      │
│     Incluye: Estructura completa            │
│                                              │
│  [💼 Compac (.txt)]                         │
│     Para software contable                  │
│     Incluye: Formato Compac TSV             │
│                                              │
└──────────────────────────────────────────────┘
```

### Exportar a Excel

1. Click "📊 Excel (.xlsx)"
2. Selecciona qué exportar:
   - ☑️ Facturas
   - ☑️ Ventas
   - ☐ Almacén
   - ☐ Clientes
3. Click "Descargar Excel"
4. Se descarga en Descargas/

**Archivo descargado contiene:**
- Hoja 1: Facturas (con formato profesional)
- Hoja 2: Datos brutos
- Hoja 3: Resumen estadístico

### Exportar a CSV

1. Click "📋 CSV (.csv)"
2. Se descarga automáticamente
3. Abre con Excel, Calc, Notepad, etc.

**Uso común:**
```
- Importar a bases de datos
- Procesar con scripts
- Compartir con colegas
```

### Exportar a JSON

1. Click "📑 JSON (.json)"
2. Se descarga backup completo
3. Útil para:
   - Respaldar datos
   - Sincronizar entre dispositivos
   - Integrar con aplicaciones

### Exportar a Compac

1. Click "💼 Compac (.txt)"
2. Se descarga en formato TSV
3. Compatible con:
   - Sistemas contables
   - SAT
   - Software de facturación

---

## ❓ FAQ Y TROUBLESHOOTING

### Preguntas Frecuentes

#### ¿Dónde se guardan mis datos?
**R:** En la memoria del navegador (localStorage). Los datos persisten cuando cierras y reabres el navegador.

#### ¿Puedo usar en múltiples dispositivos?
**R:** Depende:
- Mismo dispositivo: ✓ Sí, automático
- Dispositivos diferentes: Usa exportar/importar o Supabase

#### ¿Puedo conectar con Supabase?
**R:** Sí, requiere setup técnico. Ver `DEPLOYMENT_GUIDE.md`.

#### ¿Pierdo datos si limpio el navegador?
**R:** Sí. Exporta regularmente como backup. Ver "Exportación de Datos" arriba.

#### ¿Cuántos registros puedo tener?
**R:** Hasta 50,000 sin problemas. Performance se degrada con más.

#### ¿Funciona sin internet?
**R:** Sí, 100% offline. Pero no puedes sincronizar con Supabase sin internet.

---

### Problemas Comunes

#### "Olvidé mi contraseña"
**Solución:**
1. No hay recuperación automática (por seguridad)
2. Contacta al administrador
3. Admin debe crear nuevo usuario

#### "Los datos no se guardan"
**Comprobaciones:**
1. ✓ ¿Navegador permite localStorage? (Incógnito a veces lo deshabilita)
2. ✓ ¿Hay espacio en disco? (localStorage tiene límite)
3. ✓ ¿Completaste el formulario? (Campos obligatorios)

**Solución:**
- Abre en navegador normal (no incógnito)
- Exporta datos antiguos para liberar espacio
- Recarga la página (Ctrl+Shift+R)

#### "La búsqueda es lenta"
**Comprobaciones:**
1. ¿Tienes muchos registros? (>10,000)
2. ¿El navegador es antiguo?

**Solución:**
- Filtra por rango de fechas primero
- Usa navegador más reciente (Chrome, Firefox, Edge)
- Limpia cache del navegador

#### "No puedo abrir PDF"
**Comprobaciones:**
1. ¿Tienes un visor PDF instalado?
2. ¿El archivo se descargó completo?

**Solución:**
- Instala lector PDF (Acrobat Reader)
- Intenta descargar de nuevo
- Usa navegador diferente

#### "No puedo crear facturas"
**Comprobaciones:**
1. ¿Has creado una venta primero?
2. ¿Tienes rol de Vendedor o Admin?

**Solución:**
- Crear venta → Generar factura desde venta
- Contacta admin para permisos

---

### Accesos de Teclado

| Tecla | Acción |
|-------|--------|
| `Ctrl+N` | Nueva venta |
| `Ctrl+S` | Guardar |
| `Ctrl+E` | Exportar |
| `Ctrl+P` | Imprimir |
| `Escape` | Cerrar modal |
| `Enter` | Confirmar |
| `F5` | Actualizar página |
| `Ctrl+Shift+R` | Limpiar cache y recargar |

---

### Consejos de Uso

#### ✅ HACER:
1. ✓ Exportar datos regularmente (diario)
2. ✓ Cambiar contraseña cada 3 meses
3. ✓ Usar nombres descriptivos en productos
4. ✓ Revisar stock semanalmente
5. ✓ Mantener datos de clientes actualizados

#### ❌ NO HACER:
1. ✗ Compartir credenciales (excepto gerentes)
2. ✗ Limpiar historial sin backup
3. ✗ Usar navegador incógnito
4. ✗ Dejar sesión abierta en computadora compartida
5. ✗ Escribir contraseñas en notas

---

### Mejores Prácticas

#### Organización
- Mantén códigos de productos cortos y memorables
- Agrupa productos por categoría
- Usa convención de nombres consistente

#### Seguridad
- Contraseña mínimo 8 caracteres
- Alfanumérica (números + letras)
- Cambia regularmente
- No uses contraseña personal

#### Backup
- Exporta datos cada viernes
- Guarda en nube (Drive, Dropbox)
- Mantén histórico de 6 meses

#### Performance
- Archivo no debe exceder 5 MB
- Limpia datos antiguos (>1 año)
- Usa filtros para búsquedas grandes

---

### Soporte Técnico

**Si el problema persiste:**

1. **Intenta:**
   - Recargar página (F5)
   - Limpiar cache (Ctrl+Shift+Del)
   - Usar navegador diferente
   - Reiniciar dispositivo

2. **Si sigue sin funcionar:**
   - Exporta tus datos
   - Contacta al administrador
   - Incluye screenshot del error
   - Describe qué intentabas hacer

3. **Información útil para reportar:**
   - Navegador (Chrome, Firefox, etc.)
   - Sistema operativo (Windows, Mac, Linux)
   - ¿Cuándo empezó el problema?
   - ¿Qué estabas haciendo?
   - Screenshot del error

---

## 📚 DOCUMENTACIÓN RELACIONADA

- 🔧 **Para técnicos:** Ver `DEVELOPER_GUIDE.md`
- 🚀 **Para deploy:** Ver `DEPLOYMENT_GUIDE.md`
- 📊 **Resumen proyecto:** Ver `PROJECT_SUMMARY.md`

---

## 🎓 TUTORIALES VIDEO (Recomendados)

### Intro (5 min)
1. Acceso al sistema
2. Navegación básica
3. Primeras acciones

### Ventas (10 min)
1. Crear venta nueva
2. Autocompletar cliente
3. Generar factura
4. Imprimir

### Almacén (8 min)
1. Agregar producto
2. Ajustar stock
3. Búsqueda
4. Alertas

### Reportes (7 min)
1. Dashboard
2. Exportar datos
3. Análisis básico

---

## 📞 CONTACTO

**Soporte Usuario**: coronelomar131@gmail.com  
**Documentación**: Ver archivos .md en proyecto  
**Reporte bugs**: Crear issue en GitHub  

---

**Última actualización**: 2026-04-22  
**Versión**: 3.0.0  
**Estado**: Completa y verificada
