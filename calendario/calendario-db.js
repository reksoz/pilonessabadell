// calendario-db.js - Gestión de base de datos para el módulo de calendario
const dbManager = require('../db-manager');

// Inicializar las tablas necesarias para el calendario
async function initCalendario() {
  try {
    const db = await dbManager.getDatabase();
    
    // Crear tabla de festivos
    await db.exec(`
      CREATE TABLE IF NOT EXISTS FESTIVOS (
        ID INTEGER PRIMARY KEY AUTOINCREMENT,
        FECHA DATE NOT NULL UNIQUE,
        NOMBRE TEXT NOT NULL,
        TIPO TEXT DEFAULT 'local', -- local, nacional, personalizado
        DESCRIPCION TEXT,
        CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Crear tabla de programaciones
    await db.exec(`
      CREATE TABLE IF NOT EXISTS PROGRAMACIONES (
        ID INTEGER PRIMARY KEY AUTOINCREMENT,
        NOMBRE TEXT NOT NULL,
        TIPO TEXT NOT NULL, -- diaria, semanal, fecha_especifica, festivos
        HORA_INICIO TIME NOT NULL,
        HORA_FIN TIME,
        ACCION TEXT NOT NULL, -- subir, bajar, bloquear_arriba, bloquear_abajo, desbloquear
        ACTIVA INTEGER DEFAULT 1,
        PRIORIDAD INTEGER DEFAULT 0,
        CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UPDATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Crear tabla de relación programación-pilonas
    await db.exec(`
      CREATE TABLE IF NOT EXISTS PROGRAMACION_PILONA (
        PROGRAMACION_ID INTEGER NOT NULL,
        PILONA_ID INTEGER NOT NULL,
        PRIMARY KEY (PROGRAMACION_ID, PILONA_ID),
        FOREIGN KEY (PROGRAMACION_ID) REFERENCES PROGRAMACIONES(ID) ON DELETE CASCADE,
        FOREIGN KEY (PILONA_ID) REFERENCES PILONAS(ID) ON DELETE CASCADE
      )
    `);
    
    // Crear tabla de relación programación-zonas
    await db.exec(`
      CREATE TABLE IF NOT EXISTS PROGRAMACION_ZONA (
        PROGRAMACION_ID INTEGER NOT NULL,
        ZONA_ID INTEGER NOT NULL,
        PRIMARY KEY (PROGRAMACION_ID, ZONA_ID),
        FOREIGN KEY (PROGRAMACION_ID) REFERENCES PROGRAMACIONES(ID) ON DELETE CASCADE,
        FOREIGN KEY (ZONA_ID) REFERENCES ZONAS(ID) ON DELETE CASCADE
      )
    `);
    
    // Crear tabla de días de la semana para programaciones semanales
    await db.exec(`
      CREATE TABLE IF NOT EXISTS PROGRAMACION_DIAS_SEMANA (
        PROGRAMACION_ID INTEGER NOT NULL,
        DIA_SEMANA INTEGER NOT NULL, -- 0=Domingo, 1=Lunes, ..., 6=Sábado
        PRIMARY KEY (PROGRAMACION_ID, DIA_SEMANA),
        FOREIGN KEY (PROGRAMACION_ID) REFERENCES PROGRAMACIONES(ID) ON DELETE CASCADE
      )
    `);
    
    // Crear tabla de fechas específicas para programaciones
    await db.exec(`
      CREATE TABLE IF NOT EXISTS PROGRAMACION_FECHAS (
        PROGRAMACION_ID INTEGER NOT NULL,
        FECHA DATE NOT NULL,
        PRIMARY KEY (PROGRAMACION_ID, FECHA),
        FOREIGN KEY (PROGRAMACION_ID) REFERENCES PROGRAMACIONES(ID) ON DELETE CASCADE
      )
    `);
    
    // Crear tabla de excepciones (fechas donde no aplica la programación)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS PROGRAMACION_EXCEPCIONES (
        PROGRAMACION_ID INTEGER NOT NULL,
        FECHA DATE NOT NULL,
        PRIMARY KEY (PROGRAMACION_ID, FECHA),
        FOREIGN KEY (PROGRAMACION_ID) REFERENCES PROGRAMACIONES(ID) ON DELETE CASCADE
      )
    `);
    
    // Crear tabla de log de ejecuciones
    await db.exec(`
      CREATE TABLE IF NOT EXISTS PROGRAMACION_LOG (
        ID INTEGER PRIMARY KEY AUTOINCREMENT,
        PROGRAMACION_ID INTEGER NOT NULL,
        FECHA_EJECUCION TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ESTADO TEXT NOT NULL, -- ejecutado, error, omitido
        MENSAJE TEXT,
        PILONAS_AFECTADAS INTEGER DEFAULT 0,
        FOREIGN KEY (PROGRAMACION_ID) REFERENCES PROGRAMACIONES(ID) ON DELETE CASCADE
      )
    `);
    
    // Crear índices para mejorar el rendimiento
    await db.exec(`
      CREATE INDEX IF NOT EXISTS IDX_FESTIVOS_FECHA ON FESTIVOS(FECHA);
      CREATE INDEX IF NOT EXISTS IDX_PROGRAMACIONES_TIPO ON PROGRAMACIONES(TIPO);
      CREATE INDEX IF NOT EXISTS IDX_PROGRAMACIONES_ACTIVA ON PROGRAMACIONES(ACTIVA);
      CREATE INDEX IF NOT EXISTS IDX_PROGRAMACION_LOG_FECHA ON PROGRAMACION_LOG(FECHA_EJECUCION);
    `);
    
    console.log('Esquema de calendario inicializado correctamente');
  } catch (error) {
    console.error('Error inicializando esquema de calendario:', error);
    throw error;
  }
}

// Funciones para gestión de festivos
async function getFestivos(año = null) {
  try {
    let query = 'SELECT * FROM FESTIVOS';
    let params = [];
    
    if (año) {
      query += ' WHERE strftime("%Y", FECHA) = ?';
      params.push(año.toString());
    }
    
    query += ' ORDER BY FECHA';
    
    return await dbManager.query(query, params);
  } catch (error) {
    console.error('Error obteniendo festivos:', error);
    throw error;
  }
}

async function createFestivo(data) {
  try {
    const { fecha, nombre, tipo, descripcion } = data;
    
    const result = await dbManager.run(
      `INSERT INTO FESTIVOS (FECHA, NOMBRE, TIPO, DESCRIPCION) 
       VALUES (?, ?, ?, ?)`,
      [fecha, nombre, tipo || 'local', descripcion || null]
    );
    
    return result;
  } catch (error) {
    console.error('Error creando festivo:', error);
    throw error;
  }
}

async function updateFestivo(id, data) {
  try {
    const { fecha, nombre, tipo, descripcion } = data;
    
    await dbManager.run(
      `UPDATE FESTIVOS SET FECHA = ?, NOMBRE = ?, TIPO = ?, DESCRIPCION = ?
       WHERE ID = ?`,
      [fecha, nombre, tipo || 'local', descripcion || null, id]
    );
    
    return true;
  } catch (error) {
    console.error('Error actualizando festivo:', error);
    throw error;
  }
}

async function deleteFestivo(id) {
  try {
    await dbManager.run('DELETE FROM FESTIVOS WHERE ID = ?', [id]);
    return true;
  } catch (error) {
    console.error('Error eliminando festivo:', error);
    throw error;
  }
}

// Funciones para gestión de programaciones
async function getProgramaciones(filtros = {}) {
  try {
    let query = `
      SELECT p.*, 
             GROUP_CONCAT(DISTINCT pp.PILONA_ID) as pilonas,
             GROUP_CONCAT(DISTINCT pz.ZONA_ID) as zonas
      FROM PROGRAMACIONES p
      LEFT JOIN PROGRAMACION_PILONA pp ON p.ID = pp.PROGRAMACION_ID
      LEFT JOIN PROGRAMACION_ZONA pz ON p.ID = pz.PROGRAMACION_ID
      WHERE 1=1
    `;
    
    let params = [];
    
    if (filtros.activa !== undefined) {
      query += ' AND p.ACTIVA = ?';
      params.push(filtros.activa);
    }
    
    if (filtros.tipo) {
      query += ' AND p.TIPO = ?';
      params.push(filtros.tipo);
    }
    
    query += ' GROUP BY p.ID ORDER BY p.PRIORIDAD DESC, p.HORA_INICIO';
    
    const programaciones = await dbManager.query(query, params);
    
    // Para cada programación, obtener información adicional según el tipo
    for (let prog of programaciones) {
      prog.pilonas = prog.pilonas ? prog.pilonas.split(',').map(Number) : [];
      prog.zonas = prog.zonas ? prog.zonas.split(',').map(Number) : [];
      
      if (prog.TIPO === 'semanal') {
        const dias = await dbManager.query(
          'SELECT DIA_SEMANA FROM PROGRAMACION_DIAS_SEMANA WHERE PROGRAMACION_ID = ?',
          [prog.ID]
        );
        prog.diasSemana = dias.map(d => d.DIA_SEMANA);
      } else if (prog.TIPO === 'fecha_especifica') {
        const fechas = await dbManager.query(
          'SELECT FECHA FROM PROGRAMACION_FECHAS WHERE PROGRAMACION_ID = ?',
          [prog.ID]
        );
        prog.fechas = fechas.map(f => f.FECHA);
      }
      
      // Obtener excepciones
      const excepciones = await dbManager.query(
        'SELECT FECHA FROM PROGRAMACION_EXCEPCIONES WHERE PROGRAMACION_ID = ?',
        [prog.ID]
      );
      prog.excepciones = excepciones.map(e => e.FECHA);
    }
    
    return programaciones;
  } catch (error) {
    console.error('Error obteniendo programaciones:', error);
    throw error;
  }
}

async function createProgramacion(data) {
  const db = await dbManager.getDatabase();
  
  try {
    await db.run('BEGIN TRANSACTION');
    
    const {
      nombre, tipo, horaInicio, horaFin, accion, activa,
      prioridad, pilonas, zonas, diasSemana, fechas, excepciones
    } = data;
    
    // Insertar programación principal
    const result = await db.run(
      `INSERT INTO PROGRAMACIONES 
       (NOMBRE, TIPO, HORA_INICIO, HORA_FIN, ACCION, ACTIVA, PRIORIDAD)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nombre, tipo, horaInicio, horaFin, accion, activa ? 1 : 0, prioridad || 0]
    );
    
    const programacionId = result.lastID;
    
    // Insertar pilonas asociadas
    if (pilonas && pilonas.length > 0) {
      for (const pilonaId of pilonas) {
        await db.run(
          'INSERT INTO PROGRAMACION_PILONA (PROGRAMACION_ID, PILONA_ID) VALUES (?, ?)',
          [programacionId, pilonaId]
        );
      }
    }
    
    // Insertar zonas asociadas
    if (zonas && zonas.length > 0) {
      for (const zonaId of zonas) {
        await db.run(
          'INSERT INTO PROGRAMACION_ZONA (PROGRAMACION_ID, ZONA_ID) VALUES (?, ?)',
          [programacionId, zonaId]
        );
      }
    }
    
    // Insertar días de la semana (para programaciones semanales)
    if (tipo === 'semanal' && diasSemana && diasSemana.length > 0) {
      for (const dia of diasSemana) {
        await db.run(
          'INSERT INTO PROGRAMACION_DIAS_SEMANA (PROGRAMACION_ID, DIA_SEMANA) VALUES (?, ?)',
          [programacionId, dia]
        );
      }
    }
    
    // Insertar fechas específicas
    if (tipo === 'fecha_especifica' && fechas && fechas.length > 0) {
      for (const fecha of fechas) {
        await db.run(
          'INSERT INTO PROGRAMACION_FECHAS (PROGRAMACION_ID, FECHA) VALUES (?, ?)',
          [programacionId, fecha]
        );
      }
    }
    
    // Insertar excepciones
    if (excepciones && excepciones.length > 0) {
      for (const excepcion of excepciones) {
        await db.run(
          'INSERT INTO PROGRAMACION_EXCEPCIONES (PROGRAMACION_ID, FECHA) VALUES (?, ?)',
          [programacionId, excepcion]
        );
      }
    }
    
    await db.run('COMMIT');
    return { id: programacionId };
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Error creando programación:', error);
    throw error;
  }
}

async function updateProgramacion(id, data) {
  const db = await dbManager.getDatabase();
  
  try {
    await db.run('BEGIN TRANSACTION');
    
    const {
      nombre, tipo, horaInicio, horaFin, accion, activa,
      prioridad, pilonas, zonas, diasSemana, fechas, excepciones
    } = data;
    
    // Actualizar programación principal
    await db.run(
      `UPDATE PROGRAMACIONES SET 
       NOMBRE = ?, TIPO = ?, HORA_INICIO = ?, HORA_FIN = ?, 
       ACCION = ?, ACTIVA = ?, PRIORIDAD = ?, UPDATED_AT = CURRENT_TIMESTAMP
       WHERE ID = ?`,
      [nombre, tipo, horaInicio, horaFin, accion, activa ? 1 : 0, prioridad || 0, id]
    );
    
    // Limpiar relaciones existentes
    await db.run('DELETE FROM PROGRAMACION_PILONA WHERE PROGRAMACION_ID = ?', [id]);
    await db.run('DELETE FROM PROGRAMACION_ZONA WHERE PROGRAMACION_ID = ?', [id]);
    await db.run('DELETE FROM PROGRAMACION_DIAS_SEMANA WHERE PROGRAMACION_ID = ?', [id]);
    await db.run('DELETE FROM PROGRAMACION_FECHAS WHERE PROGRAMACION_ID = ?', [id]);
    await db.run('DELETE FROM PROGRAMACION_EXCEPCIONES WHERE PROGRAMACION_ID = ?', [id]);
    
    // Reinsertar pilonas
    if (pilonas && pilonas.length > 0) {
      for (const pilonaId of pilonas) {
        await db.run(
          'INSERT INTO PROGRAMACION_PILONA (PROGRAMACION_ID, PILONA_ID) VALUES (?, ?)',
          [id, pilonaId]
        );
      }
    }
    
    // Reinsertar zonas
    if (zonas && zonas.length > 0) {
      for (const zonaId of zonas) {
        await db.run(
          'INSERT INTO PROGRAMACION_ZONA (PROGRAMACION_ID, ZONA_ID) VALUES (?, ?)',
          [id, zonaId]
        );
      }
    }
    
    // Reinsertar días de la semana
    if (tipo === 'semanal' && diasSemana && diasSemana.length > 0) {
      for (const dia of diasSemana) {
        await db.run(
          'INSERT INTO PROGRAMACION_DIAS_SEMANA (PROGRAMACION_ID, DIA_SEMANA) VALUES (?, ?)',
          [id, dia]
        );
      }
    }
    
    // Reinsertar fechas específicas
    if (tipo === 'fecha_especifica' && fechas && fechas.length > 0) {
      for (const fecha of fechas) {
        await db.run(
          'INSERT INTO PROGRAMACION_FECHAS (PROGRAMACION_ID, FECHA) VALUES (?, ?)',
          [id, fecha]
        );
      }
    }
    
    // Reinsertar excepciones
    if (excepciones && excepciones.length > 0) {
      for (const excepcion of excepciones) {
        await db.run(
          'INSERT INTO PROGRAMACION_EXCEPCIONES (PROGRAMACION_ID, FECHA) VALUES (?, ?)',
          [id, excepcion]
        );
      }
    }
    
    await db.run('COMMIT');
    return true;
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Error actualizando programación:', error);
    throw error;
  }
}

async function deleteProgramacion(id) {
  try {
    await dbManager.run('DELETE FROM PROGRAMACIONES WHERE ID = ?', [id]);
    return true;
  } catch (error) {
    console.error('Error eliminando programación:', error);
    throw error;
  }
}

async function toggleProgramacion(id, activa) {
  try {
    await dbManager.run(
      'UPDATE PROGRAMACIONES SET ACTIVA = ?, UPDATED_AT = CURRENT_TIMESTAMP WHERE ID = ?',
      [activa ? 1 : 0, id]
    );
    return true;
  } catch (error) {
    console.error('Error cambiando estado de programación:', error);
    throw error;
  }
}

// Función para registrar ejecución de programación
async function logProgramacionEjecucion(programacionId, estado, mensaje, pilonasAfectadas = 0) {
  try {
    await dbManager.run(
      `INSERT INTO PROGRAMACION_LOG 
       (PROGRAMACION_ID, ESTADO, MENSAJE, PILONAS_AFECTADAS)
       VALUES (?, ?, ?, ?)`,
      [programacionId, estado, mensaje, pilonasAfectadas]
    );
  } catch (error) {
    console.error('Error registrando log de programación:', error);
    // No lanzar error para no interrumpir la ejecución
  }
}

// Función para obtener logs de programación
async function getProgramacionLogs(programacionId = null, limite = 100) {
  try {
    let query = `
      SELECT pl.*, p.NOMBRE as PROGRAMACION_NOMBRE
      FROM PROGRAMACION_LOG pl
      JOIN PROGRAMACIONES p ON pl.PROGRAMACION_ID = p.ID
    `;
    
    let params = [];
    
    if (programacionId) {
      query += ' WHERE pl.PROGRAMACION_ID = ?';
      params.push(programacionId);
    }
    
    query += ' ORDER BY pl.FECHA_EJECUCION DESC LIMIT ?';
    params.push(limite);
    
    return await dbManager.query(query, params);
  } catch (error) {
    console.error('Error obteniendo logs de programación:', error);
    throw error;
  }
}

module.exports = {
  initCalendario,
  getFestivos,
  createFestivo,
  updateFestivo,
  deleteFestivo,
  getProgramaciones,
  createProgramacion,
  updateProgramacion,
  deleteProgramacion,
  toggleProgramacion,
  logProgramacionEjecucion,
  getProgramacionLogs
};
