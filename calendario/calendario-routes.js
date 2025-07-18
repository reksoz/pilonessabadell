// calendario-routes.js - Rutas para el módulo de calendario
const express = require('express');
const router = express.Router();
const calendarioDB = require('./calendario-db');
const dbManager = require('../db-manager');

// Middleware para verificar autenticación
function requireAuth(req, res, next) {
  if (req.session && req.session.usuario) {
    next();
  } else {
    res.status(401).json({ error: 'No autorizado' });
  }
}

// Middleware para verificar rol de administrador
function checkAdmin(req, res, next) {
  if (req.session && req.session.usuario && req.session.usuario.ROL === 'administrador') {
    next();
  } else {
    res.status(403).json({ error: 'Acceso prohibido - Se requiere rol de administrador' });
  }
}

// ===== RUTAS DE FESTIVOS =====

// Obtener todos los festivos
router.get('/festivos', requireAuth, async (req, res) => {
  try {
    const año = req.query.año || new Date().getFullYear();
    const festivos = await calendarioDB.getFestivos(año);
    res.json(festivos);
  } catch (error) {
    console.error('Error obteniendo festivos:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Crear nuevo festivo
router.post('/festivos', requireAuth, checkAdmin, async (req, res) => {
  try {
    const { fecha, nombre, tipo, descripcion } = req.body;
    
    if (!fecha || !nombre) {
      return res.status(400).json({ error: 'Fecha y nombre son obligatorios' });
    }
    
    const result = await calendarioDB.createFestivo({
      fecha,
      nombre,
      tipo,
      descripcion
    });
    
    // Registrar en auditoría
    await dbManager.logAction(
      req.session.usuario.ID,
      'crear_festivo',
      null,
      req.ip
    );
    
    res.status(201).json({ 
      mensaje: 'Festivo creado correctamente', 
      id: result.lastID 
    });
  } catch (error) {
    console.error('Error creando festivo:', error);
    if (error.code === 'SQLITE_CONSTRAINT') {
      res.status(400).json({ error: 'Ya existe un festivo en esta fecha' });
    } else {
      res.status(500).json({ error: 'Error del servidor' });
    }
  }
});

// Actualizar festivo
router.put('/festivos/:id', requireAuth, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { fecha, nombre, tipo, descripcion } = req.body;
    
    if (!fecha || !nombre) {
      return res.status(400).json({ error: 'Fecha y nombre son obligatorios' });
    }
    
    await calendarioDB.updateFestivo(id, {
      fecha,
      nombre,
      tipo,
      descripcion
    });
    
    // Registrar en auditoría
    await dbManager.logAction(
      req.session.usuario.ID,
      'actualizar_festivo',
      null,
      req.ip
    );
    
    res.json({ mensaje: 'Festivo actualizado correctamente' });
  } catch (error) {
    console.error('Error actualizando festivo:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Eliminar festivo
router.delete('/festivos/:id', requireAuth, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await calendarioDB.deleteFestivo(id);
    
    // Registrar en auditoría
    await dbManager.logAction(
      req.session.usuario.ID,
      'eliminar_festivo',
      null,
      req.ip
    );
    
    res.json({ mensaje: 'Festivo eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando festivo:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ===== RUTAS DE PROGRAMACIONES =====

// Obtener todas las programaciones
router.get('/programaciones', requireAuth, async (req, res) => {
  try {
    const filtros = {
      activa: req.query.activa !== undefined ? parseInt(req.query.activa) : undefined,
      tipo: req.query.tipo
    };
    
    const programaciones = await calendarioDB.getProgramaciones(filtros);
    res.json(programaciones);
  } catch (error) {
    console.error('Error obteniendo programaciones:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Crear nueva programación
router.post('/programaciones', requireAuth, checkAdmin, async (req, res) => {
  try {
    const {
      nombre, tipo, horaInicio, horaFin, accion, activa,
      prioridad, pilonas, zonas, diasSemana, fechas, excepciones
    } = req.body;
    
    // Validaciones básicas
    if (!nombre || !tipo || !horaInicio || !accion) {
      return res.status(400).json({ 
        error: 'Nombre, tipo, hora de inicio y acción son obligatorios' 
      });
    }
    
    // Validar que tenga al menos una pilona o zona
    if ((!pilonas || pilonas.length === 0) && (!zonas || zonas.length === 0)) {
      return res.status(400).json({ 
        error: 'Debe seleccionar al menos una pilona o zona' 
      });
    }
    
    // Validar según el tipo
    if (tipo === 'semanal' && (!diasSemana || diasSemana.length === 0)) {
      return res.status(400).json({ 
        error: 'Debe seleccionar al menos un día de la semana' 
      });
    }
    
    if (tipo === 'fecha_especifica' && (!fechas || fechas.length === 0)) {
      return res.status(400).json({ 
        error: 'Debe especificar al menos una fecha' 
      });
    }
    
    const result = await calendarioDB.createProgramacion({
      nombre,
      tipo,
      horaInicio,
      horaFin,
      accion,
      activa,
      prioridad,
      pilonas,
      zonas,
      diasSemana,
      fechas,
      excepciones
    });
    
    // Registrar en auditoría
    await dbManager.logAction(
      req.session.usuario.ID,
      'crear_programacion',
      null,
      req.ip
    );
    
    res.status(201).json({ 
      mensaje: 'Programación creada correctamente', 
      id: result.id 
    });
  } catch (error) {
    console.error('Error creando programación:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Actualizar programación
router.put('/programaciones/:id', requireAuth, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre, tipo, horaInicio, horaFin, accion, activa,
      prioridad, pilonas, zonas, diasSemana, fechas, excepciones
    } = req.body;
    
    // Validaciones básicas
    if (!nombre || !tipo || !horaInicio || !accion) {
      return res.status(400).json({ 
        error: 'Nombre, tipo, hora de inicio y acción son obligatorios' 
      });
    }
    
    // Validar que tenga al menos una pilona o zona
    if ((!pilonas || pilonas.length === 0) && (!zonas || zonas.length === 0)) {
      return res.status(400).json({ 
        error: 'Debe seleccionar al menos una pilona o zona' 
      });
    }
    
    await calendarioDB.updateProgramacion(id, {
      nombre,
      tipo,
      horaInicio,
      horaFin,
      accion,
      activa,
      prioridad,
      pilonas,
      zonas,
      diasSemana,
      fechas,
      excepciones
    });
    
    // Registrar en auditoría
    await dbManager.logAction(
      req.session.usuario.ID,
      'actualizar_programacion',
      null,
      req.ip
    );
    
    res.json({ mensaje: 'Programación actualizada correctamente' });
  } catch (error) {
    console.error('Error actualizando programación:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Activar/desactivar programación
router.patch('/programaciones/:id/toggle', requireAuth, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { activa } = req.body;
    
    await calendarioDB.toggleProgramacion(id, activa);
    
    // Registrar en auditoría
    await dbManager.logAction(
      req.session.usuario.ID,
      activa ? 'activar_programacion' : 'desactivar_programacion',
      null,
      req.ip
    );
    
    res.json({ 
      mensaje: `Programación ${activa ? 'activada' : 'desactivada'} correctamente` 
    });
  } catch (error) {
    console.error('Error cambiando estado de programación:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Eliminar programación
router.delete('/programaciones/:id', requireAuth, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await calendarioDB.deleteProgramacion(id);
    
    // Registrar en auditoría
    await dbManager.logAction(
      req.session.usuario.ID,
      'eliminar_programacion',
      null,
      req.ip
    );
    
    res.json({ mensaje: 'Programación eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando programación:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Obtener logs de programaciones
router.get('/programaciones/logs', requireAuth, checkAdmin, async (req, res) => {
  try {
    const programacionId = req.query.programacionId || null;
    const limite = parseInt(req.query.limite) || 100;
    
    const logs = await calendarioDB.getProgramacionLogs(programacionId, limite);
    res.json(logs);
  } catch (error) {
    console.error('Error obteniendo logs:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// Ejecutar programación manualmente
router.post('/programaciones/:id/ejecutar', requireAuth, checkAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Ejecutar la programación manualmente a través del scheduler
    const scheduler = require('./calendario-scheduler');
    await scheduler.ejecutarManual(parseInt(id));
    
    res.json({ mensaje: 'Programación ejecutada manualmente' });
  } catch (error) {
    console.error('Error ejecutando programación manual:', error);
    res.status(500).json({ error: error.message || 'Error al ejecutar programación' });
  }
});

// Obtener estado del calendario para un día específico
router.get('/estado-dia', requireAuth, async (req, res) => {
  try {
    const { fecha } = req.query;
    
    if (!fecha) {
      return res.status(400).json({ error: 'La fecha es obligatoria' });
    }
    
    // Verificar si es festivo
    const festivos = await dbManager.query(
      'SELECT * FROM FESTIVOS WHERE FECHA = ?',
      [fecha]
    );
    
    // Obtener programaciones activas que aplican para esta fecha
    const programacionesActivas = await calendarioDB.getProgramaciones({ activa: 1 });
    
    const fechaObj = new Date(fecha);
    const diaSemana = fechaObj.getDay();
    
    const programacionesDelDia = programacionesActivas.filter(prog => {
      // Verificar excepciones
      if (prog.excepciones && prog.excepciones.includes(fecha)) {
        return false;
      }
      
      switch (prog.TIPO) {
        case 'diaria':
          return true;
        case 'semanal':
          return prog.diasSemana && prog.diasSemana.includes(diaSemana);
        case 'fecha_especifica':
          return prog.fechas && prog.fechas.includes(fecha);
        case 'festivos':
          return festivos.length > 0;
        default:
          return false;
      }
    });
    
    res.json({
      fecha,
      esFestivo: festivos.length > 0,
      festivo: festivos[0] || null,
      programaciones: programacionesDelDia
    });
  } catch (error) {
    console.error('Error obteniendo estado del día:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

module.exports = router;
