// usuario-routes.js - Rutas para la gestión de usuarios y sus permisos de zonas
const express = require('express');
const router = express.Router();
const dbManager = require('./db-manager');
const bcrypt = require('bcrypt');

// Middleware para verificar autenticación
function requireAuth(req, res, next) {
  if (req.session.usuario) {
    next();
  } else {
    res.status(401).json({ error: 'No autorizado. Inicie sesión.' });
  }
}

// Middleware para verificar roles
function checkRole(roles) {
  return (req, res, next) => {
    if (req.session.usuario && roles.includes(req.session.usuario.ROL)) {
      next();
    } else {
      res.status(403).json({ error: 'Acceso prohibido. No tiene permisos suficientes.' });
    }
  };
}

// Obtener todos los usuarios
router.get('/', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    const usuarios = await dbManager.query(
      'SELECT ID, NOMBRE, EMAIL, ROL, FECHA_INICIO, FECHA_FINAL, ACTIVO, MATRICULA, DNI, TELEFONO, DIRECCION, TIPO_ACCESO, COMENTARIOS, FECHA_RENOVACION FROM USUARIOS ORDER BY NOMBRE'
    );
    
    res.json(usuarios);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ error: 'Error del servidor al obtener usuarios' });
  }
});

// Obtener usuario individual por ID
router.get('/:id', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    const usuario = await dbManager.get(
      'SELECT ID, NOMBRE, EMAIL, ROL, FECHA_INICIO, FECHA_FINAL, ACTIVO, MATRICULA, DNI, TELEFONO, DIRECCION, TIPO_ACCESO, COMENTARIOS, FECHA_RENOVACION FROM USUARIOS WHERE ID = ?',
      [req.params.id]
    );
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    res.json(usuario);
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ error: 'Error del servidor al obtener usuario' });
  }
});

// Crear nuevo usuario
router.post('/', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    console.log('Creando nuevo usuario:', req.body);
    
    const {
      nombre, email, password, rol,
      fechaInicio, fechaFinal, activo,
      matricula, dni, telefono, direccion,
      tipoAcceso, comentarios, fechaRenovacion
    } = req.body;
    
    // Validaciones básicas
    if (!nombre || !email || !password || !rol) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, email, password, rol' });
    }
    
    // Validar email único
    const usuarioExistente = await dbManager.get('SELECT ID FROM USUARIOS WHERE EMAIL = ?', [email]);
    if (usuarioExistente) {
      return res.status(400).json({ error: 'Ya existe un usuario con este email' });
    }
    
    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Valores por defecto
    const fechaInicioFinal = fechaInicio || new Date().toISOString();
    const activoFinal = activo !== undefined ? (activo ? 1 : 0) : 1;
    
    // Crear usuario
    const result = await dbManager.run(
      `INSERT INTO USUARIOS (
        NOMBRE, EMAIL, PASSWORD, ROL, FECHA_INICIO, FECHA_FINAL, ACTIVO,
        MATRICULA, DNI, TELEFONO, DIRECCION, TIPO_ACCESO, COMENTARIOS, FECHA_RENOVACION
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre, email, hashedPassword, rol, fechaInicioFinal, fechaFinal || null, activoFinal,
        matricula || null, dni || null, telefono || null, direccion || null,
        tipoAcceso || null, comentarios || null, fechaRenovacion || null
      ]
    );
    
    // Registrar en auditoría
    await dbManager.logAction(
      req.session.usuario.ID,
      'crear_usuario',
      null,
      req.ip
    );
    
    // Obtener usuario creado
    const nuevoUsuario = await dbManager.get(
      'SELECT ID, NOMBRE, EMAIL, ROL, FECHA_INICIO, FECHA_FINAL, ACTIVO, MATRICULA, DNI, TELEFONO, DIRECCION, TIPO_ACCESO, COMENTARIOS, FECHA_RENOVACION FROM USUARIOS WHERE ID = ?',
      [result.lastID]
    );
    
    res.status(201).json({ mensaje: 'Usuario creado correctamente', usuario: nuevoUsuario });
  } catch (error) {
    console.error('Error creando usuario:', error);
    res.status(500).json({ error: 'Error del servidor al crear usuario: ' + error.message });
  }
});

// Actualizar usuario existente
router.put('/:id', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    console.log('Actualizando usuario:', req.params.id, req.body);
    
    const usuarioId = req.params.id;
    const {
      nombre, email, password, rol,
      fechaInicio, fechaFinal, activo,
      matricula, dni, telefono, direccion,
      tipoAcceso, comentarios, fechaRenovacion
    } = req.body;
    
    // Verificar que el usuario existe
    const usuarioExistente = await dbManager.get('SELECT * FROM USUARIOS WHERE ID = ?', [usuarioId]);
    if (!usuarioExistente) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Validaciones básicas
    if (!nombre || !email || !rol) {
      return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, email, rol' });
    }
    
    // Validar email único (excepto para el mismo usuario)
    const otroUsuarioConEmail = await dbManager.get(
      'SELECT ID FROM USUARIOS WHERE EMAIL = ? AND ID != ?',
      [email, usuarioId]
    );
    if (otroUsuarioConEmail) {
      return res.status(400).json({ error: 'Ya existe otro usuario con este email' });
    }
    
    // Preparar campos para actualizar
    const campos = [
      'NOMBRE = ?', 'EMAIL = ?', 'ROL = ?',
      'FECHA_INICIO = ?', 'FECHA_FINAL = ?', 'ACTIVO = ?',
      'MATRICULA = ?', 'DNI = ?', 'TELEFONO = ?', 'DIRECCION = ?',
      'TIPO_ACCESO = ?', 'COMENTARIOS = ?', 'FECHA_RENOVACION = ?'
    ];
    
    const valores = [
      nombre, email, rol,
      fechaInicio || usuarioExistente.FECHA_INICIO,
      fechaFinal || null,
      activo !== undefined ? (activo ? 1 : 0) : usuarioExistente.ACTIVO,
      matricula || null, dni || null, telefono || null, direccion || null,
      tipoAcceso || null, comentarios || null, fechaRenovacion || null
    ];
    
    // Si se proporciona nueva contraseña, incluirla
    if (password && password.trim() !== '') {
      const hashedPassword = await bcrypt.hash(password, 10);
      campos.push('PASSWORD = ?');
      valores.push(hashedPassword);
    }
    
    // Añadir ID al final para la condición WHERE
    valores.push(usuarioId);
    
    // Ejecutar actualización
    await dbManager.run(
      `UPDATE USUARIOS SET ${campos.join(', ')} WHERE ID = ?`,
      valores
    );
    
    // Registrar en auditoría
    await dbManager.logAction(
      req.session.usuario.ID,
      'actualizar_usuario',
      null,
      req.ip
    );
    
    // Obtener usuario actualizado
    const usuarioActualizado = await dbManager.get(
      'SELECT ID, NOMBRE, EMAIL, ROL, FECHA_INICIO, FECHA_FINAL, ACTIVO, MATRICULA, DNI, TELEFONO, DIRECCION, TIPO_ACCESO, COMENTARIOS, FECHA_RENOVACION FROM USUARIOS WHERE ID = ?',
      [usuarioId]
    );
    
    res.json({ mensaje: 'Usuario actualizado correctamente', usuario: usuarioActualizado });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ error: 'Error del servidor al actualizar usuario: ' + error.message });
  }
});

// Eliminar un usuario
router.delete('/:id', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    // Verificar si el usuario existe
    const usuario = await dbManager.get('SELECT * FROM USUARIOS WHERE ID = ?', [req.params.id]);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // No permitir eliminar al propio usuario
    if (usuario.ID === req.session.usuario.ID) {
      return res.status(400).json({ error: 'No puede eliminar su propio usuario' });
    }
    
    // Eliminar usuario
    await dbManager.run('DELETE FROM USUARIOS WHERE ID = ?', [req.params.id]);
    
    res.json({ mensaje: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ error: 'Error del servidor al eliminar usuario' });
  }
});

// ===== Rutas para gestión de zonas de usuario =====

// Obtener zonas asignadas a un usuario
router.get('/:id/zonas', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    // Verificar si el usuario existe
    const usuario = await dbManager.get(
      'SELECT ID, NOMBRE, EMAIL, ROL FROM USUARIOS WHERE ID = ?',
      [req.params.id]
    );
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Obtener zonas asignadas al usuario
    const zonas = await dbManager.query(`
      SELECT z.*, uz.PERMISOS
      FROM ZONAS z
      JOIN USUARIO_ZONA uz ON z.ID = uz.ZONA_ID
      WHERE uz.USUARIO_ID = ?
      ORDER BY z.NOMBRE
    `, [req.params.id]);
    
    res.json({
      usuario,
      zonas
    });
  } catch (error) {
    console.error('Error obteniendo zonas del usuario:', error);
    res.status(500).json({ error: 'Error del servidor al obtener zonas del usuario' });
  }
});

// Obtener zonas disponibles para asignar a un usuario
router.get('/:id/zonas-disponibles', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    // Verificar si el usuario existe
    const usuario = await dbManager.get('SELECT ID FROM USUARIOS WHERE ID = ?', [req.params.id]);
    
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Obtener zonas que no están asignadas al usuario
    const zonas = await dbManager.query(`
      SELECT z.*
      FROM ZONAS z
      WHERE z.ID NOT IN (
        SELECT uz.ZONA_ID
        FROM USUARIO_ZONA uz
        WHERE uz.USUARIO_ID = ?
      )
      ORDER BY z.NOMBRE
    `, [req.params.id]);
    
    res.json(zonas);
  } catch (error) {
    console.error('Error obteniendo zonas disponibles:', error);
    res.status(500).json({ error: 'Error del servidor al obtener zonas disponibles' });
  }
});

// Asignar zona a un usuario
router.post('/:id/zonas', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    const { zonaId, permisos } = req.body;
    
    // Validar datos
    if (!zonaId) {
      return res.status(400).json({ error: 'ID de zona requerido' });
    }
    
    if (!permisos || !['bajar', 'subir,bajar', 'completo'].includes(permisos)) {
      return res.status(400).json({ error: 'Permisos no válidos. Use "bajar", "subir,bajar" o "completo"' });
    }
    
    // Verificar si el usuario existe
    const usuario = await dbManager.get('SELECT ID FROM USUARIOS WHERE ID = ?', [req.params.id]);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Verificar si la zona existe
    const zona = await dbManager.get('SELECT ID FROM ZONAS WHERE ID = ?', [zonaId]);
    if (!zona) {
      return res.status(404).json({ error: 'Zona no encontrada' });
    }
    
    // Asignar zona al usuario
    await dbManager.asignarUsuarioZona(req.params.id, zonaId, permisos);
    
    res.json({ mensaje: 'Zona asignada correctamente' });
  } catch (error) {
    console.error('Error asignando zona a usuario:', error);
    res.status(500).json({ error: 'Error del servidor al asignar zona' });
  }
});

// Actualizar permisos de una zona asignada a un usuario
router.put('/:id/zonas/:zonaId', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    const { permisos } = req.body;
    
    // Validar permisos
    if (!permisos || !['bajar', 'subir,bajar', 'completo'].includes(permisos)) {
      return res.status(400).json({ error: 'Permisos no válidos. Use "bajar", "subir,bajar" o "completo"' });
    }
    
    // Verificar si el usuario existe
    const usuario = await dbManager.get('SELECT ID FROM USUARIOS WHERE ID = ?', [req.params.id]);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Verificar si la zona existe
    const zona = await dbManager.get('SELECT ID FROM ZONAS WHERE ID = ?', [req.params.zonaId]);
    if (!zona) {
      return res.status(404).json({ error: 'Zona no encontrada' });
    }
    
    // Verificar si la relación usuario-zona existe
    const relacion = await dbManager.get(
      'SELECT * FROM USUARIO_ZONA WHERE USUARIO_ID = ? AND ZONA_ID = ?',
      [req.params.id, req.params.zonaId]
    );
    
    if (!relacion) {
      return res.status(404).json({ error: 'El usuario no tiene asignada esta zona' });
    }
    
    // Actualizar permisos
    await dbManager.run(
      'UPDATE USUARIO_ZONA SET PERMISOS = ? WHERE USUARIO_ID = ? AND ZONA_ID = ?',
      [permisos, req.params.id, req.params.zonaId]
    );
    
    res.json({ mensaje: 'Permisos actualizados correctamente' });
  } catch (error) {
    console.error('Error actualizando permisos:', error);
    res.status(500).json({ error: 'Error del servidor al actualizar permisos' });
  }
});

// Eliminar zona asignada a un usuario
router.delete('/:id/zonas/:zonaId', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    // Verificar si el usuario existe
    const usuario = await dbManager.get('SELECT ID FROM USUARIOS WHERE ID = ?', [req.params.id]);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Verificar si la zona existe
    const zona = await dbManager.get('SELECT ID FROM ZONAS WHERE ID = ?', [req.params.zonaId]);
    if (!zona) {
      return res.status(404).json({ error: 'Zona no encontrada' });
    }
    
    // Eliminar relación
    await dbManager.eliminarUsuarioZona(req.params.id, req.params.zonaId);
    
    res.json({ mensaje: 'Zona eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando zona de usuario:', error);
    res.status(500).json({ error: 'Error del servidor al eliminar zona' });
  }
});

module.exports = router;