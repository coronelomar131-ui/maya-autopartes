/**
 * Rutas para Gestión de Usuarios
 * CRUD endpoints para usuarios y autenticación básica
 */

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// ============================================================================
// GET - Obtener todos los usuarios
// ============================================================================

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, rol, activo } = req.query;
    const offset = (page - 1) * limit;

    let query = req.supabase.from('usuarios').select('*');

    if (rol) {
      query = query.eq('rol', rol);
    }

    if (activo) {
      query = query.eq('activo', activo === 'true');
    }

    const { data, error, count } = await query
      .order('nombre', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    // No devolver contraseñas
    const usuariosSeguro = data.map(({ password, ...rest }) => rest);

    res.status(200).json({
      success: true,
      data: usuariosSeguro,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching usuarios:', error);
    res.status(500).json({
      success: false,
      error: 'Error al obtener usuarios',
      message: error.message
    });
  }
});

// ============================================================================
// GET - Obtener usuario por ID
// ============================================================================

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await req.supabase
      .from('usuarios')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // No devolver contraseña
    const { password, ...usuarioSeguro } = data;
    res.status(200).json({ success: true, data: usuarioSeguro });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al obtener usuario',
      message: error.message
    });
  }
});

// ============================================================================
// POST - Crear nuevo usuario
// ============================================================================

router.post('/', async (req, res) => {
  try {
    const {
      nombre,
      email,
      password,
      rol = 'vendedor',
      departamento = '',
      telefono = '',
      activo = true
    } = req.body;

    // Validaciones
    if (!nombre || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Campos requeridos faltantes',
        required: ['nombre', 'email', 'password']
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

    // Validar contraseña (mínimo 6 caracteres)
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'La contraseña debe tener al menos 6 caracteres'
      });
    }

    // Verificar si email ya existe
    const { data: existing } = await req.supabase
      .from('usuarios')
      .select('id')
      .eq('email', email);

    if (existing && existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'El email ya está registrado'
      });
    }

    const nuevoUsuario = {
      id: uuidv4(),
      nombre,
      email,
      password: Buffer.from(password).toString('base64'), // Hash básico
      rol,
      departamento,
      telefono,
      activo,
      fecha_creacion: new Date().toISOString(),
      ultimo_acceso: null,
      intentos_fallidos: 0
    };

    const { data, error } = await req.supabase
      .from('usuarios')
      .insert([nuevoUsuario])
      .select();

    if (error) throw error;

    // No devolver contraseña
    const { password: _, ...usuarioSeguro } = data[0];

    res.status(201).json({
      success: true,
      message: 'Usuario creado exitosamente',
      data: usuarioSeguro
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al crear usuario',
      message: error.message
    });
  }
});

// ============================================================================
// PUT - Actualizar usuario
// ============================================================================

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {
      ...req.body,
      fecha_actualizacion: new Date().toISOString()
    };

    // No permitir cambiar email así nomás
    if (updates.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updates.email)) {
        return res.status(400).json({
          success: false,
          error: 'Email inválido'
        });
      }
    }

    // Si se cambia contraseña
    if (updates.password) {
      if (updates.password.length < 6) {
        return res.status(400).json({
          success: false,
          error: 'La contraseña debe tener al menos 6 caracteres'
        });
      }
      updates.password = Buffer.from(updates.password).toString('base64');
    }

    const { data, error } = await req.supabase
      .from('usuarios')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;

    if (!data || data.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Usuario no encontrado'
      });
    }

    // No devolver contraseña
    const { password: _, ...usuarioSeguro } = data[0];

    res.status(200).json({
      success: true,
      message: 'Usuario actualizado exitosamente',
      data: usuarioSeguro
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al actualizar usuario',
      message: error.message
    });
  }
});

// ============================================================================
// DELETE - Eliminar usuario
// ============================================================================

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await req.supabase
      .from('usuarios')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.status(200).json({
      success: true,
      message: 'Usuario eliminado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al eliminar usuario',
      message: error.message
    });
  }
});

// ============================================================================
// POST - Login básico
// ============================================================================

router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Email y contraseña requeridos'
      });
    }

    const { data, error } = await req.supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    // Comparar contraseña (hash básico)
    const passwordHash = Buffer.from(password).toString('base64');
    if (data.password !== passwordHash) {
      return res.status(401).json({
        success: false,
        error: 'Credenciales inválidas'
      });
    }

    // Actualizar último acceso
    await req.supabase
      .from('usuarios')
      .update({ ultimo_acceso: new Date().toISOString() })
      .eq('id', data.id);

    // No devolver contraseña
    const { password: _, ...usuarioSeguro } = data;

    res.status(200).json({
      success: true,
      message: 'Login exitoso',
      data: usuarioSeguro,
      token: Buffer.from(`${email}:${Date.now()}`).toString('base64')
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Error al autenticar',
      message: error.message
    });
  }
});

module.exports = router;
