/**
 * Rutas para Gestión de Clientes
 * CRUD endpoints para clientes y operaciones relacionadas
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// ============================================================================
// GET - Obtener todos los clientes
// ============================================================================

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, tipo, activo } = req.query;
    const offset = (page - 1) * limit;

    let query = req.supabase.from('clientes').select('*');

    if (tipo) {
      query = query.eq('tipo', tipo);
    }

    if (activo) {
      query = query.eq('activo', activo === 'true');
    }

    const { data, error, count } = await query
      .order('nombre', { ascending: true })
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
    console.error('Error fetching clientes:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener clientes',
      message: error.message
    });
  }
});

// ============================================================================
// GET - Obtener cliente por ID
// ============================================================================

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await req.supabase
      .from('clientes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener cliente',
      message: error.message
    });
  }
});

// ============================================================================
// POST - Crear nuevo cliente
// ============================================================================

router.post('/', async (req, res) => {
  try {
    const {
      nombre,
      email,
      telefono,
      tipo = 'particulares',
      empresa = '',
      rfc = '',
      direccion = '',
      ciudad = '',
      estado = '',
      notas = ''
    } = req.body;

    // Validaciones
    if (!nombre || !email || !telefono) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos faltantes',
        required: ['nombre', 'email', 'telefono']
      });
    }

    // Validar email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Email inválido'
      });
    }

    const nuevoCliente = {
      id: uuidv4(),
      nombre,
      email,
      telefono,
      tipo,
      empresa,
      rfc: rfc.toUpperCase(),
      direccion,
      ciudad,
      estado,
      notas,
      activo: true,
      fecha_creacion: new Date().toISOString(),
      total_compras: 0,
      promedio_compra: 0
    };

    const { data, error } = await req.supabase
      .from('clientes')
      .insert([nuevoCliente])
      .select();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Cliente creado exitosamente',
      data: data[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear cliente',
      message: error.message
    });
  }
});

// ============================================================================
// PUT - Actualizar cliente
// ============================================================================

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {
      ...req.body,
      fecha_actualizacion: new Date().toISOString()
    };

    // Validar email si es proporcionado
    if (updates.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.email)) {
        return res.status(400).json({
          success: false,
          error: 'Email inválido'
        });
      }
    }

    const { data, error } = await req.supabase
      .from('clientes')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Cliente no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Cliente actualizado exitosamente',
      data: data[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar cliente',
      message: error.message
    });
  }
});

// ============================================================================
// DELETE - Eliminar cliente
// ============================================================================

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await req.supabase
      .from('clientes')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'Cliente eliminado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar cliente',
      message: error.message
    });
  }
});

// ============================================================================
// GET - Buscar clientes por nombre o RFC
// ============================================================================

router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const searchTerm = `%${query}%`;

    const { data, error } = await req.supabase
      .from('clientes')
      .select('*')
      .or(`nombre.ilike.${searchTerm},rfc.ilike.${searchTerm},email.ilike.${searchTerm}`)
      .order('nombre', { ascending: true });

    if (error) throw error;

    res.status(200).json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al buscar clientes',
      message: error.message
    });
  }
});

// ============================================================================
// GET - Estadísticas de clientes
// ============================================================================

router.get('/stats/general', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('clientes')
      .select('*');

    if (error) throw error;

    const stats = {
      total_clientes: data.length,
      clientes_activos: data.filter(c => c.activo).length,
      clientes_inactivos: data.filter(c => !c.activo).length,
      tipos: {
        particulares: data.filter(c => c.tipo === 'particulares').length,
        empresas: data.filter(c => c.tipo === 'empresas').length
      },
      total_compras: data.reduce((sum, c) => sum + (c.total_compras || 0), 0),
      promedio_compra: (data.reduce((sum, c) => sum + (c.promedio_compra || 0), 0) / data.length).toFixed(2)
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener estadísticas',
      message: error.message
    });
  }
});

module.exports = router;
