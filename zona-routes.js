// zona-routes.js - Rutas para la gestión de zonas y permisos de acceso
const express = require('express');
const router = express.Router();
const dbManager = require('./db-manager');

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

// Obtener todas las zonas
router.get('/', requireAuth, async (req, res) => {
  try {
    const zonas = await dbManager.getZonas();
    res.json(zonas);
  } catch (error) {
    console.error('Error obteniendo zonas:', error);
    res.status(500).json({ error: 'Error del servidor al obtener zonas' });
  }
});

// Obtener una zona específica
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const zona = await dbManager.get('SELECT * FROM ZONAS WHERE ID = ?', [req.params.id]);
    
    if (!zona) {
      return res.status(404).json({ error: 'Zona no encontrada' });
    }
    
    res.json(zona);
  } catch (error) {
    console.error('Error obteniendo zona:', error);
    res.status(500).json({ error: 'Error del servidor al obtener la zona' });
  }
});

// Crear una nueva zona
router.post('/', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre de la zona es obligatorio' });
    }
    
    const result = await dbManager.run(
      'INSERT INTO ZONAS (NOMBRE, DESCRIPCION) VALUES (?, ?)',
      [nombre, descripcion || '']
    );
    
    const nuevaZona = await dbManager.get(
      'SELECT * FROM ZONAS WHERE ID = ?',
      [result.lastID]
    );
    
    res.status(201).json({ 
      mensaje: 'Zona creada correctamente',
      zona: nuevaZona
    });
  } catch (error) {
    console.error('Error creando zona:', error);
    res.status(500).json({ error: 'Error del servidor al crear la zona' });
  }
});

// Actualizar una zona existente
router.put('/:id', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    const { nombre, descripcion } = req.body;
    
    if (!nombre) {
      return res.status(400).json({ error: 'El nombre de la zona es obligatorio' });
    }
    
    // Verificar si la zona existe
    const zona = await dbManager.get('SELECT * FROM ZONAS WHERE ID = ?', [req.params.id]);
    
    if (!zona) {
      return res.status(404).json({ error: 'Zona no encontrada' });
    }
    
    await dbManager.run(
      'UPDATE ZONAS SET NOMBRE = ?, DESCRIPCION = ? WHERE ID = ?',
      [nombre, descripcion || '', req.params.id]
    );
    
    const zonaActualizada = await dbManager.get(
      'SELECT * FROM ZONAS WHERE ID = ?',
      [req.params.id]
    );
    
    res.json({ 
      mensaje: 'Zona actualizada correctamente',
      zona: zonaActualizada
    });
  } catch (error) {
    console.error('Error actualizando zona:', error);
    res.status(500).json({ error: 'Error del servidor al actualizar la zona' });
  }
});

// Eliminar una zona
router.delete('/:id', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    // Verificar si la zona existe
    const zona = await dbManager.get('SELECT * FROM ZONAS WHERE ID = ?', [req.params.id]);
    
    if (!zona) {
      return res.status(404).json({ error: 'Zona no encontrada' });
    }
    
    // Verificar si la zona está siendo utilizada
    const pilonas = await dbManager.query(
      'SELECT COUNT(*) as count FROM PILONA_ZONA WHERE ZONA_ID = ?',
      [req.params.id]
    );
    
    if (pilonas[0].count > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar la zona porque tiene pilonas asignadas' 
      });
    }
    
    await dbManager.run('DELETE FROM ZONAS WHERE ID = ?', [req.params.id]);
    
    res.json({ mensaje: 'Zona eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando zona:', error);
    res.status(500).json({ error: 'Error del servidor al eliminar la zona' });
  }
});

// Obtener pilonas de una zona
router.get('/:id/pilonas', requireAuth, async (req, res) => {
  try {
    const pilonas = await dbManager.query(`
      SELECT p.* 
      FROM PILONAS p
      JOIN PILONA_ZONA pz ON p.ID = pz.PILONA_ID
      WHERE pz.ZONA_ID = ?
      ORDER BY p.NOMBRE
    `, [req.params.id]);
    
    res.json(pilonas);
  } catch (error) {
    console.error('Error obteniendo pilonas de zona:', error);
    res.status(500).json({ error: 'Error del servidor al obtener pilonas de zona' });
  }
});

// Obtener usuarios con acceso a una zona
router.get('/:id/usuarios', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    const usuarios = await dbManager.query(`
      SELECT u.ID, u.NOMBRE, u.EMAIL, u.ROL, uz.PERMISOS
      FROM USUARIOS u
      JOIN USUARIO_ZONA uz ON u.ID = uz.USUARIO_ID
      WHERE uz.ZONA_ID = ?
      ORDER BY u.NOMBRE
    `, [req.params.id]);
    
    res.json(usuarios);
  } catch (error) {
    console.error('Error obteniendo usuarios de zona:', error);
    res.status(500).json({ error: 'Error del servidor al obtener usuarios de zona' });
  }
});

// Asignar permiso a usuario para una zona
router.post('/:id/usuarios/:usuarioId', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    const { permisos } = req.body;
    
    // Validar permisos
    if (!permisos || !['bajar', 'subir,bajar', 'completo'].includes(permisos)) {
      return res.status(400).json({ 
        error: 'Permisos no válidos. Use "bajar", "subir,bajar" o "completo"' 
      });
    }
    
    // Verificar que la zona existe
    const zona = await dbManager.get('SELECT * FROM ZONAS WHERE ID = ?', [req.params.id]);
    if (!zona) {
      return res.status(404).json({ error: 'Zona no encontrada' });
    }
    
    // Verificar que el usuario existe
    const usuario = await dbManager.get('SELECT * FROM USUARIOS WHERE ID = ?', [req.params.usuarioId]);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Asignar permiso
    await dbManager.asignarUsuarioZona(req.params.usuarioId, req.params.id, permisos);
    
    res.json({ mensaje: 'Permiso asignado correctamente' });
  } catch (error) {
    console.error('Error asignando permiso:', error);
    res.status(500).json({ error: 'Error del servidor al asignar permiso' });
  }
});

// Eliminar permiso de usuario para una zona
router.delete('/:id/usuarios/:usuarioId', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    await dbManager.eliminarUsuarioZona(req.params.usuarioId, req.params.id);
    
    res.json({ mensaje: 'Permiso eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando permiso:', error);
    res.status(500).json({ error: 'Error del servidor al eliminar permiso' });
  }
});

// Asignar pilona a zona
router.post('/:id/pilonas', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    const { pilonaId } = req.body;
    
    if (!pilonaId) {
      return res.status(400).json({ error: 'ID de pilona requerido' });
    }
    
    // Verificar si la zona existe
    const zona = await dbManager.get('SELECT * FROM ZONAS WHERE ID = ?', [req.params.id]);
    if (!zona) {
      return res.status(404).json({ error: 'Zona no encontrada' });
    }
    
    // Verificar si la pilona existe
    const pilona = await dbManager.get('SELECT * FROM PILONAS WHERE ID = ?', [pilonaId]);
    if (!pilona) {
      return res.status(404).json({ error: 'Pilona no encontrada' });
    }
    
    // Asignar pilona a zona
    await dbManager.asignarPilonaZona(pilonaId, req.params.id);
    
    res.json({ mensaje: 'Pilona asignada correctamente' });
  } catch (error) {
    console.error('Error asignando pilona a zona:', error);
    res.status(500).json({ error: 'Error del servidor al asignar pilona' });
  }
});

// Eliminar pilona de zona
router.delete('/:id/pilonas/:pilonaId', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    await dbManager.eliminarPilonaZona(req.params.pilonaId, req.params.id);
    
    res.json({ mensaje: 'Pilona eliminada de la zona correctamente' });
  } catch (error) {
    console.error('Error eliminando pilona de zona:', error);
    res.status(500).json({ error: 'Error del servidor al eliminar pilona de zona' });
  }
});

module.exports = router;