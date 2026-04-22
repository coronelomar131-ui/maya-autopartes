/**
 * Rutas para Gestión de Ventas
 * CRUD endpoints para ventas y operaciones relacionadas
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// ============================================================================
// GET - Obtener todas las ventas
// ============================================================================

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, estado, clienteId } = req.query;
    const offset = (page - 1) * limit;

    let query = req.supabase.from('ventas').select('*');

    if (estado) {
      query = query.eq('estado', estado);
    }

    if (clienteId) {
      query = query.eq('cliente_id', clienteId);
    }

    const { data, error, count } = await query
      .order('fecha_venta', { ascending: false })
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
    console.error('Error fetching ventas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener ventas',
      message: error.message
    });
  }
});

// ============================================================================
// GET - Obtener venta por ID
// ============================================================================

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await req.supabase
      .from('ventas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Venta no encontrada'
      });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener venta',
      message: error.message
    });
  }
});

// ============================================================================
// POST - Crear nueva venta
// ============================================================================

router.post('/', async (req, res) => {
  try {
    const {
      cliente_id,
      producto_id,
      cantidad,
      precio_unitario,
      descuento = 0,
      estado = 'pendiente',
      notas = ''
    } = req.body;

    // Validaciones
    if (!cliente_id || !producto_id || !cantidad || !precio_unitario) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos faltantes',
        required: ['cliente_id', 'producto_id', 'cantidad', 'precio_unitario']
      });
    }

    const nuevaVenta = {
      id: uuidv4(),
      cliente_id,
      producto_id,
      cantidad: parseInt(cantidad),
      precio_unitario: parseFloat(precio_unitario),
      subtotal: cantidad * precio_unitario,
      descuento: parseFloat(descuento),
      total: (cantidad * precio_unitario) - parseFloat(descuento),
      estado,
      notas,
      fecha_venta: new Date().toISOString(),
      fecha_creacion: new Date().toISOString()
    };

    const { data, error } = await req.supabase
      .from('ventas')
      .insert([nuevaVenta])
      .select();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Venta creada exitosamente',
      data: data[0]
    });
  } catch (error) {
    console.error('Error creating venta:', error);
    res.status(500).json({
      success: false,
      error: 'Error al crear venta',
      message: error.message
    });
  }
});

// ============================================================================
// PUT - Actualizar venta
// ============================================================================

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {
      ...req.body,
      fecha_actualizacion: new Date().toISOString()
    };

    // Recalcular total si es necesario
    if (updates.cantidad || updates.precio_unitario || updates.descuento) {
      const cantidad = updates.cantidad || 0;
      const precio = updates.precio_unitario || 0;
      const descuento = updates.descuento || 0;

      updates.subtotal = cantidad * precio;
      updates.total = (cantidad * precio) - descuento;
    }

    const { data, error } = await req.supabase
      .from('ventas')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Venta no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Venta actualizada exitosamente',
      data: data[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar venta',
      message: error.message
    });
  }
});

// ============================================================================
// DELETE - Eliminar venta
// ============================================================================

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await req.supabase
      .from('ventas')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'Venta eliminada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar venta',
      message: error.message
    });
  }
});

// ============================================================================
// GET - Obtener ventas por cliente
// ============================================================================

router.get('/cliente/:clienteId', async (req, res) => {
  try {
    const { clienteId } = req.params;
    const { estado } = req.query;

    let query = req.supabase
      .from('ventas')
      .select('*')
      .eq('cliente_id', clienteId);

    if (estado) {
      query = query.eq('estado', estado);
    }

    const { data, error } = await query.order('fecha_venta', { ascending: false });

    if (error) throw error;

    res.status(200).json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener ventas del cliente',
      message: error.message
    });
  }
});

module.exports = router;
