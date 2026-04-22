/**
 * Rutas para Gestión de Almacén
 * CRUD endpoints para inventario y productos
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// ============================================================================
// GET - Obtener todo el inventario
// ============================================================================

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, categoria, bajo_stock } = req.query;
    const offset = (page - 1) * limit;

    let query = req.supabase.from('almacen').select('*');

    if (categoria) {
      query = query.eq('categoria', categoria);
    }

    if (bajo_stock === 'true') {
      query = query.lt('cantidad', 10); // Productos con stock bajo
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
    console.error('Error fetching almacen:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener inventario',
      message: error.message
    });
  }
});

// ============================================================================
// GET - Obtener producto por ID
// ============================================================================

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await req.supabase
      .from('almacen')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    res.status(200).json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener producto',
      message: error.message
    });
  }
});

// ============================================================================
// POST - Crear nuevo producto
// ============================================================================

router.post('/', async (req, res) => {
  try {
    const {
      nombre,
      codigo,
      categoria,
      cantidad,
      precio_costo,
      precio_venta,
      descripcion = '',
      proveedores = []
    } = req.body;

    // Validaciones
    if (!nombre || !codigo || !cantidad || !precio_venta) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos faltantes',
        required: ['nombre', 'codigo', 'cantidad', 'precio_venta']
      });
    }

    const nuevoProducto = {
      id: uuidv4(),
      nombre,
      codigo: codigo.toUpperCase(),
      categoria: categoria || 'General',
      cantidad: parseInt(cantidad),
      precio_costo: parseFloat(precio_costo || 0),
      precio_venta: parseFloat(precio_venta),
      margen: ((precio_venta - (precio_costo || 0)) / precio_venta * 100).toFixed(2),
      descripcion,
      proveedores,
      activo: true,
      fecha_creacion: new Date().toISOString()
    };

    const { data, error } = await req.supabase
      .from('almacen')
      .insert([nuevoProducto])
      .select();

    if (error) throw error;

    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      data: data[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear producto',
      message: error.message
    });
  }
});

// ============================================================================
// PUT - Actualizar producto
// ============================================================================

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {
      ...req.body,
      fecha_actualizacion: new Date().toISOString()
    };

    // Recalcular margen si es necesario
    if (updates.precio_venta || updates.precio_costo) {
      const venta = updates.precio_venta || 0;
      const costo = updates.precio_costo || 0;
      updates.margen = ((venta - costo) / venta * 100).toFixed(2);
    }

    const { data, error } = await req.supabase
      .from('almacen')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Producto actualizado exitosamente',
      data: data[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar producto',
      message: error.message
    });
  }
});

// ============================================================================
// DELETE - Eliminar producto
// ============================================================================

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await req.supabase
      .from('almacen')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'Producto eliminado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar producto',
      message: error.message
    });
  }
});

// ============================================================================
// GET - Estadísticas de inventario
// ============================================================================

router.get('/stats/inventory', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('almacen')
      .select('*');

    if (error) throw error;

    const stats = {
      total_productos: data.length,
      total_items: data.reduce((sum, p) => sum + p.cantidad, 0),
      valor_inventario: data.reduce((sum, p) => sum + (p.cantidad * p.precio_costo), 0),
      productos_bajo_stock: data.filter(p => p.cantidad < 10).length,
      categoria_mas_grande: data.reduce((max, p) => {
        const count = data.filter(x => x.categoria === p.categoria).length;
        return count > max.count ? { categoria: p.categoria, count } : max;
      }, { categoria: 'N/A', count: 0 })
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
// PATCH - Actualizar cantidad
// ============================================================================

router.patch('/:id/cantidad', async (req, res) => {
  try {
    const { id } = req.params;
    const { cantidad, operacion = 'set' } = req.body;

    if (cantidad === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Campo cantidad es requerido'
      });
    }

    const { data: producto, error: fetchError } = await req.supabase
      .from('almacen')
      .select('cantidad')
      .eq('id', id)
      .single();

    if (fetchError || !producto) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }

    let nuevaCantidad = cantidad;
    if (operacion === 'add') {
      nuevaCantidad = producto.cantidad + cantidad;
    } else if (operacion === 'subtract') {
      nuevaCantidad = producto.cantidad - cantidad;
    }

    if (nuevaCantidad < 0) {
      return res.status(400).json({
        success: false,
        error: 'Stock no puede ser negativo'
      });
    }

    const { data, error } = await req.supabase
      .from('almacen')
      .update({ cantidad: nuevaCantidad })
      .eq('id', id)
      .select();

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'Cantidad actualizada exitosamente',
      data: data[0]
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar cantidad',
      message: error.message
    });
  }
});

module.exports = router;
