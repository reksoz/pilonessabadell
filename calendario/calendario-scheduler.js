// calendario-scheduler.js - Programador de tareas para el calendario
const cron = require('node-cron');
const calendarioDB = require('./calendario-db');
const dbManager = require('../db-manager');
const pilonaRoutes = require('../pilona-routes');

class CalendarioScheduler {
  constructor() {
    this.tareas = new Map();
    this.io = null;
  }

  // Inicializar el scheduler
  init(io) {
    this.io = io;
    this.cargarProgramaciones();
    
    // Recargar programaciones cada 5 minutos
    cron.schedule('*/5 * * * *', () => {
      this.cargarProgramaciones();
    });
    
    console.log('Calendario Scheduler inicializado');
  }

  // Cargar todas las programaciones activas
  async cargarProgramaciones() {
    try {
      const programaciones = await calendarioDB.getProgramaciones({ activa: 1 });
      
      // Detener tareas existentes
      this.detenerTodasLasTareas();
      
      // Crear nuevas tareas
      for (const prog of programaciones) {
        this.crearTarea(prog);
      }
      
      console.log(`${programaciones.length} programaciones cargadas`);
    } catch (error) {
      console.error('Error cargando programaciones:', error);
    }
  }

  // Crear tarea cron para una programación
  crearTarea(programacion) {
    try {
      const { ID, TIPO, HORA_INICIO, HORA_FIN } = programacion;
      
      // Parsear hora de inicio
      const [horaInicio, minutoInicio] = HORA_INICIO.split(':').map(Number);
      
      let cronExpression;
      
      switch (TIPO) {
        case 'diaria':
          cronExpression = `${minutoInicio} ${horaInicio} * * *`;
          break;
          
        case 'semanal':
          if (programacion.diasSemana && programacion.diasSemana.length > 0) {
            const diasCron = programacion.diasSemana.join(',');
            cronExpression = `${minutoInicio} ${horaInicio} * * ${diasCron}`;
          }
          break;
          
        case 'fecha_especifica':
          // Para fechas específicas, verificamos en cada ejecución
          cronExpression = `${minutoInicio} ${horaInicio} * * *`;
          break;
          
        case 'festivos':
          // Para festivos, verificamos en cada ejecución
          cronExpression = `${minutoInicio} ${horaInicio} * * *`;
          break;
      }
      
      if (cronExpression) {
        const tarea = cron.schedule(cronExpression, () => {
          this.ejecutarProgramacion(programacion);
        });
        
        this.tareas.set(ID, tarea);
        
        // Si tiene hora de fin, programar tarea de reversión
        if (HORA_FIN) {
          const [horaFin, minutoFin] = HORA_FIN.split(':').map(Number);
          let cronExpressionFin;
          
          switch (TIPO) {
            case 'diaria':
              cronExpressionFin = `${minutoFin} ${horaFin} * * *`;
              break;
              
            case 'semanal':
              if (programacion.diasSemana && programacion.diasSemana.length > 0) {
                const diasCron = programacion.diasSemana.join(',');
                cronExpressionFin = `${minutoFin} ${horaFin} * * ${diasCron}`;
              }
              break;
              
            case 'fecha_especifica':
            case 'festivos':
              cronExpressionFin = `${minutoFin} ${horaFin} * * *`;
              break;
          }
          
          if (cronExpressionFin) {
            const tareaFin = cron.schedule(cronExpressionFin, () => {
              this.revertirProgramacion(programacion);
            });
            
            this.tareas.set(`${ID}_fin`, tareaFin);
          }
        }
      }
    } catch (error) {
      console.error(`Error creando tarea para programación ${programacion.ID}:`, error);
    }
  }

  // Ejecutar una programación
  async ejecutarProgramacion(programacion) {
    try {
      const hoy = new Date().toISOString().split('T')[0];
      
      // Verificar excepciones
      if (programacion.excepciones && programacion.excepciones.includes(hoy)) {
        await calendarioDB.logProgramacionEjecucion(
          programacion.ID,
          'omitido',
          'Fecha en excepciones'
        );
        return;
      }
      
      // Verificar si aplica según el tipo
      let debeEjecutar = false;
      
      switch (programacion.TIPO) {
        case 'diaria':
          debeEjecutar = true;
          break;
          
        case 'semanal':
          const diaSemana = new Date().getDay();
          debeEjecutar = programacion.diasSemana && programacion.diasSemana.includes(diaSemana);
          break;
          
        case 'fecha_especifica':
          debeEjecutar = programacion.fechas && programacion.fechas.includes(hoy);
          break;
          
        case 'festivos':
          const festivos = await calendarioDB.getFestivos();
          debeEjecutar = festivos.some(f => f.FECHA === hoy);
          break;
      }
      
      if (!debeEjecutar) {
        return;
      }
      
      // Obtener pilonas afectadas
      let pilonasIds = [];
      
      // Pilonas directas
      if (programacion.pilonas && programacion.pilonas.length > 0) {
        pilonasIds = [...programacion.pilonas];
      }
      
      // Pilonas por zonas
      if (programacion.zonas && programacion.zonas.length > 0) {
        for (const zonaId of programacion.zonas) {
          const pilonasPorZona = await dbManager.query(
            'SELECT PILONA_ID FROM PILONA_ZONA WHERE ZONA_ID = ?',
            [zonaId]
          );
          pilonasIds.push(...pilonasPorZona.map(p => p.PILONA_ID));
        }
      }
      
      // Eliminar duplicados
      pilonasIds = [...new Set(pilonasIds)];
      
      if (pilonasIds.length === 0) {
        await calendarioDB.logProgramacionEjecucion(
          programacion.ID,
          'error',
          'No hay pilonas asociadas'
        );
        return;
      }
      
      // Ejecutar acción en cada pilona
      let pilonasEjecutadas = 0;
      let errores = [];
      
      for (const pilonaId of pilonasIds) {
        try {
          await this.ejecutarAccionEnPilona(pilonaId, programacion.ACCION);
          pilonasEjecutadas++;
        } catch (error) {
          errores.push(`Pilona ${pilonaId}: ${error.message}`);
        }
      }
      
      // Registrar resultado
      if (errores.length === 0) {
        await calendarioDB.logProgramacionEjecucion(
          programacion.ID,
          'ejecutado',
          `Acción ${programacion.ACCION} ejecutada correctamente`,
          pilonasEjecutadas
        );
      } else {
        await calendarioDB.logProgramacionEjecucion(
          programacion.ID,
          'error',
          `Errores: ${errores.join(', ')}`,
          pilonasEjecutadas
        );
      }
      
      // Emitir evento por WebSocket
      if (this.io) {
        this.io.emit('programacion-ejecutada', {
          programacion: programacion.NOMBRE,
          accion: programacion.ACCION,
          pilonas: pilonasEjecutadas,
          fecha: new Date()
        });
      }
      
    } catch (error) {
      console.error(`Error ejecutando programación ${programacion.ID}:`, error);
      await calendarioDB.logProgramacionEjecucion(
        programacion.ID,
        'error',
        error.message
      );
    }
  }

  // Revertir una programación (cuando tiene hora de fin)
  async revertirProgramacion(programacion) {
    try {
      // Determinar acción de reversión
      let accionReversion;
      
      switch (programacion.ACCION) {
        case 'bajar':
          accionReversion = 'subir';
          break;
        case 'subir':
          accionReversion = 'bajar';
          break;
        case 'bloquear_arriba':
        case 'bloquear_abajo':
          accionReversion = 'desbloquear';
          break;
        default:
          return; // No hay reversión para desbloquear
      }
      
      // Crear programación temporal con la acción de reversión
      const programacionReversion = {
        ...programacion,
        ACCION: accionReversion,
        NOMBRE: `${programacion.NOMBRE} (Reversión)`
      };
      
      await this.ejecutarProgramacion(programacionReversion);
    } catch (error) {
      console.error(`Error revirtiendo programación ${programacion.ID}:`, error);
    }
  }

  // Ejecutar acción en una pilona específica
  async ejecutarAccionEnPilona(pilonaId, accion) {
    try {
      // Obtener información de la pilona
      const pilona = await dbManager.get(
        'SELECT * FROM PILONAS WHERE ID = ?',
        [pilonaId]
      );
      
      if (!pilona) {
        throw new Error('Pilona no encontrada');
      }
      
      // Usuario del sistema para registrar en auditoría
      const usuarioSistema = { ID: 0, NOMBRE: 'Sistema (Calendario)' };
      
      switch (accion) {
        case 'subir':
          await pilonaRoutes.subirPilona(pilona, usuarioSistema, '0.0.0.0');
          break;
        case 'bajar':
          await pilonaRoutes.bajarPilona(pilona, usuarioSistema, '0.0.0.0');
          break;
        case 'bloquear_arriba':
          await pilonaRoutes.bloquearPilona(pilona, 'arriba', usuarioSistema, '0.0.0.0');
          break;
        case 'bloquear_abajo':
          await pilonaRoutes.bloquearPilona(pilona, 'abajo', usuarioSistema, '0.0.0.0');
          break;
        case 'desbloquear':
          await pilonaRoutes.desbloquearPilona(pilona, usuarioSistema, '0.0.0.0');
          break;
      }
    } catch (error) {
      console.error(`Error ejecutando acción ${accion} en pilona ${pilonaId}:`, error);
      throw error;
    }
  }

  // Detener todas las tareas
  detenerTodasLasTareas() {
    for (const [id, tarea] of this.tareas) {
      tarea.stop();
    }
    this.tareas.clear();
  }

  // Detener una tarea específica
  detenerTarea(programacionId) {
    const tarea = this.tareas.get(programacionId);
    if (tarea) {
      tarea.stop();
      this.tareas.delete(programacionId);
    }
    
    // También detener tarea de fin si existe
    const tareaFin = this.tareas.get(`${programacionId}_fin`);
    if (tareaFin) {
      tareaFin.stop();
      this.tareas.delete(`${programacionId}_fin`);
    }
  }

  // Ejecutar programación manualmente (para pruebas)
  async ejecutarManual(programacionId) {
    try {
      const programaciones = await calendarioDB.getProgramaciones();
      const programacion = programaciones.find(p => p.ID === programacionId);
      
      if (!programacion) {
        throw new Error('Programación no encontrada');
      }
      
      await this.ejecutarProgramacion(programacion);
      return true;
    } catch (error) {
      console.error('Error ejecutando programación manual:', error);
      throw error;
    }
  }
}

// Crear instancia singleton
const scheduler = new CalendarioScheduler();

module.exports = scheduler;
