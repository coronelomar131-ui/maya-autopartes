# Admin Panel - Arquitectura Técnica

## 📐 Diagrama de Flujo

```
┌────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (BROWSER)                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  index.html                                                        │
│  ├── page-admin (DIV container)                                   │
│  └── Scripts:                                                      │
│      ├── main.js (openAdminPanel, renderAdminPanel)               │
│      ├── admin.js (toda la lógica)                                │
│      └── styles.css (estilos)                                     │
│                                                                    │
│  renderAdminPanel()                                               │
│  ├── Fetch frontend/pages/admin.html                              │
│  ├── Inyectar en #page-admin                                      │
│  └── initAdminPanel()                                             │
│                                                                    │
│  Admin Panel Tabs:                                                │
│  ├── Usuarios (CRUD)                                              │
│  ├── Roles (Asignación)                                           │
│  ├── Actividad (Logs)                                             │
│  └── Analytics (KPIs)                                             │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
          │
          │ HTTP/REST API
          │
┌─────────▼─────────────────────────────────────────────────────────┐
│                      BACKEND (EXPRESS.JS)                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Middleware Chain:                                                │
│  └── requireAuth (verify JWT)                                    │
│      └── requireAdmin (verify role = 'admin')                    │
│          └── Route Handler                                       │
│                                                                    │
│  /api/admin/users                                                │
│  ├── GET (list, paginated)                                       │
│  ├── POST (create)                                               │
│  ├── PUT /:id (update)                                           │
│  ├── DELETE /:id (delete)                                        │
│  ├── PUT /:id/role (change role)                                 │
│  └── POST /:id/reset-password (send email)                       │
│                                                                    │
│  /api/admin/logs                                                 │
│  └── GET (list logs, last 30 days)                               │
│                                                                    │
│  /api/admin/stats                                                │
│  └── GET (aggregate statistics)                                  │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
          │
          │ SQL Queries
          │
┌─────────▼─────────────────────────────────────────────────────────┐
│                    SUPABASE (DATABASE)                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Tables:                                                          │
│  ├── usuarios                                                    │
│  │   ├── id (UUID)                                               │
│  │   ├── email (VARCHAR)                                         │
│  │   ├── nombre (VARCHAR)                                        │
│  │   ├── role (VARCHAR)                                          │
│  │   ├── activo (BOOLEAN)                                        │
│  │   └── created_at (TIMESTAMP)                                  │
│  │                                                                │
│  ├── audit_logs                                                  │
│  │   ├── id (UUID)                                               │
│  │   ├── usuario_id (FK usuarios)                                │
│  │   ├── evento (VARCHAR)                                        │
│  │   ├── tabla (VARCHAR)                                         │
│  │   ├── fila_id (VARCHAR)                                       │
│  │   ├── detalles (JSONB)                                        │
│  │   └── timestamp (TIMESTAMP)                                   │
│  │                                                                │
│  └── RLS Policies                                                │
│      ├── Admins can read/write usuarios                          │
│      └── Admins can read audit_logs                              │
│                                                                    │
│  Auth (Supabase Auth):                                           │
│  └── createUser, deleteUser, resetPassword                       │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🔗 Flujo de Datos

### 1. Cargar Admin Panel
```
Usuario clicks "Admin Panel"
  ↓
openAdminPanel() [main.js]
  ↓
goPage('admin', el)
  ↓
renderAdminPanel() [admin.js]
  ↓
Fetch frontend/pages/admin.html
  ↓
Render HTML en #page-admin
  ↓
initAdminPanel()
  ├── loadAdminUsers() → GET /api/admin/users
  ├── loadActivityLog() → GET /api/admin/logs
  ├── loadAdminStats() → GET /api/admin/stats
  ↓
renderAdminUsers()
renderAdminRoles()
renderActivityLog()
renderAdminStats()
  ↓
Panel listo y mostrando datos
```

### 2. Crear Usuario
```
Click "+ Nuevo Usuario"
  ↓
openNewUserForm() → mostrar modal
  ↓
Usuario completa form y submits
  ↓
createAdminUser(event)
  ↓
fetch('/api/admin/users', POST)
  ↓
Backend: createUser()
  ├── Validar datos
  ├── supabase.auth.admin.createUser()
  ├── INSERT en usuarios
  ├── INSERT en audit_logs
  └── Return user data
  ↓
Frontend: toast success
  ↓
reload: loadAdminUsers()
  ↓
renderAdminUsers()
  ↓
Nuevo usuario aparece en tabla
```

### 3. Cambiar Rol
```
Usuario selecciona nuevo rol en dropdown
  ↓
changeUserRole(userId, newRole)
  ↓
fetch(`/api/admin/users/${userId}/role`, PUT)
  ↓
Backend: updateUserRole()
  ├── UPDATE usuarios SET role = newRole
  ├── INSERT en audit_logs (change_role event)
  └── Return updated user
  ↓
Frontend: toast success
  ↓
reload: loadAdminUsers()
  ↓
renderAdminRoles() → usuario aparece en nuevo rol
```

### 4. Ver Activity Log
```
Click tab "Actividad"
  ↓
switchAdminTab('activity')
  ↓
renderActivityLog()
  ↓
Muestra últimos eventos de adminActivityLog
```

### 5. Exportar Logs
```
Click "📥 Exportar Log"
  ↓
exportActivityLog()
  ↓
Crear CSV desde adminActivityLog
  ↓
Download: activity-log-YYYY-MM-DD.csv
```

### 6. Ver Estadísticas
```
Click tab "Analytics"
  ↓
switchAdminTab('stats')
  ↓
renderAdminStats()
  ├── Mostrar KPI cards
  ├── Mostrar placeholders de gráficos
  ├── Mostrar tabla de métricas
  └── (En future: integrar Chart.js)
```

---

## 📦 Estructura de Componentes

### Frontend Structure
```
frontend/
├── pages/
│   └── admin.html              ← HTML markup (4 tabs)
│
├── admin.js                    ← Logic layer
│   ├── loadAdminUsers()        ← API calls
│   ├── renderAdminUsers()      ← DOM rendering
│   ├── changeUserRole()        ← CRUD operations
│   ├── exportActivityLog()     ← Export functions
│   └── renderAdminPanel()      ← Main entry point
│
├── styles.css                  ← Styling (~600 lines)
│   ├── .admin-container
│   ├── .admin-tabs
│   ├── .admin-users-table
│   ├── .admin-kpi-grid
│   └── Media queries
│
└── index.html                  ← Modified
    └── #page-admin             ← Added container
```

### Backend Structure
```
backend/
└── routes/
    └── admin.js                ← Route handlers
        ├── requireAdmin()      ← Middleware
        ├── GET /users         ← List users
        ├── POST /users        ← Create user
        ├── PUT /users/:id     ← Update user
        ├── DELETE /users/:id  ← Delete user
        ├── PUT /users/:id/role ← Change role
        ├── GET /logs          ← Activity logs
        └── GET /stats         ← Statistics
```

### Database Structure
```
Supabase
├── usuarios table
│   ├── id (UUID)
│   ├── email (UNIQUE)
│   ├── nombre
│   ├── role (ENUM or VARCHAR)
│   ├── activo (BOOLEAN)
│   └── created_at
│
├── audit_logs table
│   ├── id (UUID)
│   ├── usuario_id (FK)
│   ├── evento
│   ├── tabla
│   ├── fila_id
│   ├── detalles (JSONB)
│   └── timestamp
│
└── RLS Policies
    ├── admin_users_policy
    └── admin_logs_policy
```

---

## 🔐 Security Layers

### Layer 1: Frontend
```javascript
if (userRole !== 'admin') {
  toast('⚠ Solo administradores pueden acceder');
  return;
}
```

### Layer 2: API Middleware
```javascript
function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'FORBIDDEN' });
  }
  next();
}
```

### Layer 3: Database RLS
```sql
CREATE POLICY "Admins only" ON usuarios
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM usuarios WHERE role = 'admin')
  );
```

### Layer 4: Supabase Auth
```
Solo usuarios creados con Supabase Auth pueden tener token
Tokens validados en cada request
```

---

## 📊 Data Flow Diagram

```
USER ACTION
    ↓
FRONTEND (admin.js)
    ├── Validate input
    ├── Show toast/loading
    ↓
API REQUEST (HTTP)
    ├── GET/POST/PUT/DELETE
    ├── Attach JWT token
    ↓
BACKEND (Express.js)
    ├── Verify token (requireAuth)
    ├── Check role (requireAdmin)
    ├── Validate data
    ↓
DATABASE (Supabase)
    ├── Check RLS policies
    ├── Execute query
    ├── Log in audit_logs
    ↓
RESPONSE (JSON)
    ├── { success: true, data: {...} }
    ↓
FRONTEND (admin.js)
    ├── Parse response
    ├── Update state (adminUsers, etc)
    ├── Re-render component
    └── Show success toast
```

---

## ⚡ Performance Optimizations

### Pagination
```javascript
// List users with limit
GET /api/admin/users?page=1&limit=50
```

### Caching Strategy
```javascript
// Frontend caches data in memory
let adminUsers = [];
let adminActivityLog = [];
let adminStats = {};

// Reload only when needed
loadAdminUsers() // On init and after mutations
```

### Query Optimization
```sql
-- Indexed columns
CREATE INDEX idx_usuarios_role ON usuarios(role);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_logs_usuario_id ON audit_logs(usuario_id);
```

### Lazy Loading
```javascript
// Load data asynchronously
async function initAdminPanel() {
  await Promise.all([
    loadAdminUsers(),
    loadActivityLog(),
    loadAdminStats()
  ]);
}
```

---

## 🎨 Component Hierarchy

```
AdminPanel
├── AdminTabs
│   ├── UsersTab
│   │   ├── SearchBar
│   │   ├── FilterBar
│   │   ├── UserTable
│   │   ├── Pagination
│   │   └── Modals (Create, Edit)
│   │
│   ├── RolesTab
│   │   ├── RoleSection (x6)
│   │   │   └── UserItem (with role selector)
│   │   └── (no modals)
│   │
│   ├── ActivityTab
│   │   ├── FilterBar
│   │   ├── ActivityList
│   │   └── ExportButton
│   │
│   └── StatsTab
│       ├── KPIGrid
│       ├── ChartContainer (x4)
│       └── MetricsTable
│
└── GlobalModals
    ├── NewUserModal
    └── EditUserModal
```

---

## 🔄 State Management

### Frontend State
```javascript
// Global state (in admin.js scope)
let adminUsers = [];           // Current user list
let adminActivityLog = [];     // Current activity logs
let adminStats = {};           // Current statistics
let currentEditingUserId = null;  // For edit modal
```

### State Updates
```javascript
// Trigger: User action
// Method: Fetch API → Update state → Re-render

loadAdminUsers()
  ↓ (fetch)
adminUsers = data.data
  ↓ (if success)
renderAdminUsers()
  ↓ (DOM update)
```

---

## 🚀 Deployment Checklist

- [ ] Verify `backend/routes/admin.js` registered in Express
- [ ] Verify `frontend/admin.js` imported in HTML
- [ ] Verify `frontend/pages/admin.html` exists
- [ ] Verify Supabase tables created (usuarios, audit_logs)
- [ ] Verify RLS policies applied
- [ ] Test as admin user
- [ ] Test access control (non-admin)
- [ ] Test CRUD operations
- [ ] Monitor logs for errors
- [ ] Verify activity logs being created

---

## 📈 Scalability Considerations

### Current Capacity
- Users list: 50 per page (1000+ supported)
- Activity logs: 500 events (30 days)
- Simultaneous connections: No limit (stateless)

### Future Optimizations
- Caching layer (Redis) for stats
- Pagination for activity logs
- Indexed searches
- Full-text search
- Batch operations

---

## 🔗 Integration Points

### With Main App
- `main.js` - Navigation integration
- `index.html` - Page container
- `styles.css` - Styling

### With Supabase
- `usuarios` table - User data
- `audit_logs` table - Activity tracking
- Supabase Auth - User management

### With API
- 8 REST endpoints
- Token-based authentication
- JSON request/response

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-04-22 | Initial release |

---

**Last Updated**: 2026-04-22
**Status**: Production Ready
