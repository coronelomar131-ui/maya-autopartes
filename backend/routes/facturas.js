/**
 * Rutas para Gestión de Facturas
 * CRUD endpoints para facturas y documentos fiscales
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// ============================================================================
// GET - Obtener todas las facturas
// ============================================================================

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, estado, mes, anio } = req.query;
    const offset = (page - 1) * limit;

    let query = req.supabase.from('facturas').select('*');

    if (estado) {
      query = query.eq('estado', estado);
    }

    if (mes && anio) {
      const startDate = new Date(anio, mes - 1, 1).toISOString();
      const endDate = new Date(anio, mes, 0).toISOString();
      query = query.gte('fecha_emision', startDate).lte('fecha_emision', endDate);
    }

    const { data, error, count } = await query
      .order('fecha_emision', { ascending: false })
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
    console.error('Error fetching facturas:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener facturas',
      message: error.message
    });
  }
});

// ============================================================================
// GET - Obtener factura por ID
// ============================================================================

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await req.supabase
      .from('facturas')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Factura no encontrada'
      });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener factura',
      message: error.message
    });
  }
});

// ============================================================================
// POST - Crear nueva factura
// ============================================================================

router.post('/', async (req, res) => {
  try {
    const {
      venta_id,
      cliente_id,
      numero_folio,
      subtotal,
      impuesto = 0,
      descuento = 0,
      total,
      estado = 'pendiente',
      metodo_pago = 'efectivo',
      notas = ''
    } = req.body;

    // Validaciones
    if (!venta_id || !cliente_id || !numero_folio || !total) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos faltantes',
        required: ['venta_id', 'cliente_id', 'numero_folio', 'total']
      });
    }

    // Validar que el folio sea único
    const { data: existing } = await req.supabase
      .from('facturas')
      .select('id')
      .eq('numero_folio', numero_folio);

    if (existing && existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'El número de folio ya existe'
      });
    }

    const nuevaFactura = {
      id: uuidv4(),
      venta_id,
      cliente_id,
      numero_folio,
      subtotal: parseFloat(subtotal),
      impuesto: parseFloat(impuesto),
      descuento: parseFloat(descuento),
      total: parseFloat(total),
      estado,
      metodo_pago,
      notas,
      fecha_emision: new Date().toISOString(),
      fecha_vencimiento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      fecha_pago: null,
      serie: 'FAC',
      created_at: new Date().toISOString()
    };

    const { data, error } = await req.supabase
      .from('facturas')
      .insert([nuevaFactura])
      .select();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Factura creada exitosamente',
      data: data[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear factura',
      message: error.message
    });
  }
});

// ============================================================================
// PUT - Actualizar factura
// ============================================================================

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {
      ...req.body,
      updated_at: new Date().toISOString()
    };

    // Si se marca como pagada, actualizar fecha de pago
    if (updates.estado === 'pagada' && !updates.fecha_pago) {
      updates.fecha_pago = new Date().toISOString();
    }

    const { data, error } = await req.supabase
      .from('facturas')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Factura no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Factura actualizada exitosamente',
      data: data[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar factura',
      message: error.message
    });
  }
});

// ============================================================================
// DELETE - Eliminar factura
// ============================================================================

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await req.supabase
      .from('facturas')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'Factura eliminada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar factura',
      message: error.message
    });
  }
});

// ============================================================================
// GET - Obtener facturas por venta
// ============================================================================

router.get('/venta/:ventaId', async (req, res) => {
  try {
    const { ventaId } = req.params;

    const { data, error } = await req.supabase
      .from('facturas')
      .select('*')
      .eq('venta_id', ventaId)
      .order('fecha_emision', { ascending: false });

    if (error) throw error;

    res.status(200).json({
      success: true,
      data,
      count: data.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener facturas de venta',
      message: error.message
    });
  }
});

// ============================================================================
// GET - Estadísticas de facturas
// ============================================================================

router.get('/stats/general', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('facturas')
      .select('*');

    if (error) throw error;

    const stats = {
      total_facturas: data.length,
      facturas_pagadas: data.filter(f => f.estado === 'pagada').length,
      facturas_pendientes: data.filter(f => f.estado === 'pendiente').length,
      facturas_canceladas: data.filter(f => f.estado === 'cancelada').length,
      ingresos_totales: data.reduce((sum, f) => sum + f.total, 0),
      ingresos_pendientes: data
        .filter(f => f.estado === 'pendiente')
        .reduce((sum, f) => sum + f.total, 0),
      promedio_factura: (data.reduce((sum, f) => sum + f.total, 0) / data.length).toFixed(2)
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

// ============================================================================
// PATCH - Marcar factura como pagada
// ============================================================================

router.patch('/:id/pagar', async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha_pago } = req.body;

    const { data, error } = await req.supabase
      .from('facturas')
      .update({
        estado: 'pagada',
        fecha_pago: fecha_pago || new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Factura no encontrada'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Factura marcada como pagada',
      data: data[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar estado de pago',
      message: error.message
    });
  }
});

module.exports = router;
