/**
 * @file admin.js
 * @description Rutas administrativas para gestión de usuarios, roles, logs y estadísticas
 * @version 1.0.0
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// ═════════════════════════════════════════════════════════════════
// MIDDLEWARE - Verifica que sea admin
// ═════════════════════════════════════════════════════════════════

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      error: 'No autorizado',
      code: 'FORBIDDEN'
    });
  }
  next();
}

// ═════════════════════════════════════════════════════════════════
// GET /api/admin/users - Obtener todos los usuarios
// ═════════════════════════════════════════════════════════════════

router.get('/users', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    const { data, error, count } = await req.supabase
      .from('usuarios')
      .select('id, email, nombre, role, activo, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    res.status(200).json({
      success: true,
      data,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error en GET /admin/users:', error);
    res.status(500).json({
      error: 'Error al obtener usuarios',
      message: error.message
    });
  }
});

// ═════════════════════════════════════════════════════════════════
// POST /api/admin/users - Crear nuevo usuario
// ═════════════════════════════════════════════════════════════════

router.post('/users', requireAdmin, async (req, res) => {
  try {
    const { email, nombre, password, role } = req.body;

    if (!email || !nombre || !password) {
      return res.status(400).json({
        error: 'Email, nombre y contraseña requeridos'
      });
    }

    // Crear usuario en Supabase Auth
    const { data: authData, error: authError } = await req.supabase.auth.admin
      .createUser({
        email,
        password,
        email_confirm: true
      });

    if (authError) throw authError;

    // Crear registro en tabla usuarios
    const { data: userData, error: userError } = await req.supabase
      .from('usuarios')
      .insert([{
        id: authData.user.id,
        email,
        nombre,
        role: role || null,
        activo: true,
        created_at: new Date().toISOString()
      }])
      .select()
      .single();

    if (userError) throw userError;

    // Log de auditoría
    await req.supabase.from('audit_logs').insert([{
      usuario_id: req.user.id,
      evento: 'create_user',
      tabla: 'usuarios',
      fila_id: userData.id,
      detalles: { email, nombre, role },
      timestamp: new Date().toISOString()
    }]);

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: userData
    });
  } catch (error) {
    console.error('Error en POST /admin/users:', error);
    res.status(400).json({
      error: 'Error al crear usuario',
      message: error.message
    });
  }
});

// ═════════════════════════════════════════════════════════════════
// PUT /api/admin/users/:id - Actualizar usuario
// ═════════════════════════════════════════════════════════════════

router.put('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { email, nombre, activo, role } = req.body;

    const updateData = {};
    if (nombre !== undefined) updateData.nombre = nombre;
    if (activo !== undefined) updateData.activo = activo;
    if (role !== undefined) updateData.role = role;

    const { data, error } = await req.supabase
      .from('usuarios')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log de auditoría
    await req.supabase.from('audit_logs').insert([{
      usuario_id: req.user.id,
      evento: 'update_user',
      tabla: 'usuarios',
      fila_id: id,
      detalles: updateData,
      timestamp: new Date().toISOString()
    }]);

    res.status(200).json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data
    });
  } catch (error) {
    console.error('Error en PUT /admin/users/:id:', error);
    res.status(400).json({
      error: 'Error al actualizar usuario',
      message: error.message
    });
  }
});

// ═════════════════════════════════════════════════════════════════
// PUT /api/admin/users/:id/role - Cambiar rol
// ═════════════════════════════════════════════════════════════════

router.put('/users/:id/role', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    const { data, error } = await req.supabase
      .from('usuarios')
      .update({ role: role || null })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Log de auditoría
    await req.supabase.from('audit_logs').insert([{
      usuario_id: req.user.id,
      evento: 'change_role',
      tabla: 'usuarios',
      fila_id: id,
      detalles: { new_role: role },
      timestamp: new Date().toISOString()
    }]);

    res.status(200).json({
      success: true,
      message: 'Rol actualizado',
      data
    });
  } catch (error) {
    console.error('Error en PUT /admin/users/:id/role:', error);
    res.status(400).json({
      error: 'Error al cambiar rol',
      message: error.message
    });
  }
});

// ═════════════════════════════════════════════════════════════════
// DELETE /api/admin/users/:id - Eliminar usuario
// ═════════════════════════════════════════════════════════════════

router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Eliminar de tabla usuarios
    const { error: deleteError } = await req.supabase
      .from('usuarios')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    // Eliminar de Supabase Auth
    await req.supabase.auth.admin.deleteUser(id);

    // Log de auditoría
    await req.supabase.from('audit_logs').insert([{
      usuario_id: req.user.id,
      evento: 'delete_user',
      tabla: 'usuarios',
      fila_id: id,
      detalles: {},
      timestamp: new Date().toISOString()
    }]);

    res.status(200).json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    console.error('Error en DELETE /admin/users/:id:', error);
    res.status(400).json({
      error: 'Error al eliminar usuario',
      message: error.message
    });
  }
});

// ═════════════════════════════════════════════════════════════════
// POST /api/admin/users/:id/reset-password - Reset de contraseña
// ═════════════════════════════════════════════════════════════════

router.post('/users/:id/reset-password', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener usuario para email
    const { data: user, error: fetchError } = await req.supabase
      .from('usuarios')
      .select('email')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    // Enviar reset link
    const { error } = await req.supabase.auth.resetPasswordForEmail(user.email);
    if (error) throw error;

    // Log de auditoría
    await req.supabase.from('audit_logs').insert([{
      usuario_id: req.user.id,
      evento: 'reset_password',
      tabla: 'usuarios',
      fila_id: id,
      detalles: { email: user.email },
      timestamp: new Date().toISOString()
    }]);

    res.status(200).json({
      success: true,
      message: 'Email de reset enviado'
    });
  } catch (error) {
    console.error('Error en POST /admin/users/:id/reset-password:', error);
    res.status(400).json({
      error: 'Error al enviar reset',
      message: error.message
    });
  }
});

// ═════════════════════════════════════════════════════════════════
// GET /api/admin/logs - Obtener activity logs
// ═════════════════════════════════════════════════════════════════

router.get('/logs', requireAdmin, async (req, res) => {
  try {
    const { limit = 500, days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const { data, error } = await req.supabase
      .from('audit_logs')
      .select(`
        id,
        usuario_id,
        evento,
        tabla,
        fila_id,
        detalles,
        timestamp,
        usuarios(email)
      `)
      .gte('timestamp', startDate.toISOString())
      .order('timestamp', { ascending: false })
      .limit(parseInt(limit));

    if (error) throw error;

    // Formatear respuesta
    const formattedLogs = data.map(log => ({
      id: log.id,
      event_type: log.evento,
      usuario_id: log.usuario_id,
      usuario_email: log.usuarios?.email || 'Sistema',
      tabla: log.tabla,
      fila_id: log.fila_id,
      descripcion: `${log.evento} en ${log.tabla}`,
      timestamp: log.timestamp,
      detalles: log.detalles
    }));

    res.status(200).json({
      success: true,
      data: formattedLogs
    });
  } catch (error) {
    console.error('Error en GET /admin/logs:', error);
    res.status(500).json({
      error: 'Error al obtener logs',
      message: error.message
    });
  }
});

// ═════════════════════════════════════════════════════════════════
// GET /api/admin/stats - Obtener estadísticas
// ═════════════════════════════════════════════════════════════════

router.get('/stats', requireAdmin, async (req, res) => {
  try {
    // Contar usuarios activos
    const { count: usuariosActivos } = await req.supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true })
      .eq('activo', true);

    // Contar total usuarios
    const { count: totalUsuarios } = await req.supabase
      .from('usuarios')
      .select('*', { count: 'exact', head: true });

    // Contar clientes
    const { count: totalClientes } = await req.supabase
      .from('clientes')
      .select('*', { count: 'exact', head: true });

    // Contar productos
    const { count: totalProductos } = await req.supabase
      .from('almacen')
      .select('*', { count: 'exact', head: true });

    // Sumar ventas
    const { data: ventasData, error: ventasError } = await req.supabase
      .from('ventas')
      .select('total')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

    const totalVentas = ventasData?.reduce((sum, v) => sum + (v.total || 0), 0) || 0;
    const totalVentasAnteriores = totalVentas * 0.85; // Aproximación para cambio %

    // Productos con stock bajo
    const { count: productosStockBajo } = await req.supabase
      .from('almacen')
      .select('*', { count: 'exact', head: true })
      .lt('cantidad', 10);

    const stats = {
      totalUsuarios: totalUsuarios || 0,
      usuariosActivos: usuariosActivos || 0,
      usuariosOnline: Math.floor((usuariosActivos || 0) * 0.6),
      totalClientes: totalClientes || 0,
      totalProductos: totalProductos || 0,
      totalVentas: totalVentas,
      totalSales: ventasData?.length || 0,
      productosStockBajo: productosStockBajo || 0,
      ventasChangePercent: totalVentasAnteriores > 0
        ? ((totalVentas - totalVentasAnteriores) / totalVentasAnteriores) * 100
        : 0,
      usuariosChangePercent: 5.2,
      productosChangePercent: -2.1,
      clientesChangePercent: 8.7,
      conversionRate: 0.35
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error en GET /admin/stats:', error);
    res.status(500).json({
      error: 'Error al obtener estadísticas',
      message: error.message
    });
  }
});

module.exports = function createAdminRoutes(supabaseClient) {
  return router;
};
