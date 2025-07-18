// pilona-routes.js - Rutas mejoradas para el control de pilonas con verificación de zonas
const express = require('express');
const router = express.Router();
const dbManager = require('./db-manager');
const { conectarPilona, obtenerEstadoPilona, controlarPilona, ejecutarAccionPuntual, pausarMonitoreoPilona, reanudarMonitoreoPilona } = require('./modbus-controllers');

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

// Crear una nueva pilona
router.post('/', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    // Obtener datos de la pilona incluyendo configuración LOGO
    const { 
      nombre, 
      direccionIP, 
      puerto, 
      unitId,
      tipoDispositivo, // 'MODBUS_GENERICO' o 'LOGO'
      // Configuración para MODBUS genérico
      coilSubir, 
      coilBajar, 
      coilEstado, 
      coilBloqueo, 
      coilPuntual,
      coilElectrovalvula, // Para detección de fallos
      tiempoPuntual, // Tiempo de activación para acción puntual
      // Configuración específica de LOGO
      logoConfig,
      latitud, 
      longitud 
    } = req.body;
    
    // Si es LOGO, procesar la configuración
    let coilValues = {};
    if (tipoDispositivo === 'LOGO' && logoConfig) {
      console.log('Procesando configuración LOGO para nueva pilona...');
      // Mapear automáticamente las direcciones LOGO a los coils
      const config = typeof logoConfig === 'string' ? JSON.parse(logoConfig) : logoConfig;
      console.log('Configuración LOGO parseada:', JSON.stringify(config, null, 2));
      
      // Buscar las funciones asignadas en la configuración
      Object.entries(config).forEach(([seccion, elementos]) => {
        // Solo procesar secciones que contienen elementos (no 'version' u otros campos)
        if (typeof elementos === 'object' && elementos !== null && seccion !== 'version') {
          console.log(`Procesando sección: ${seccion}`);
          Object.entries(elementos).forEach(([key, value]) => {
            if (value && value.funcion !== undefined && value.direccion !== undefined) {
              console.log(`  Encontrada función ${value.funcion} en ${key} con dirección ${value.direccion}`);
              switch (value.funcion) {
                case 'subir':
                  coilValues.coilSubir = value.direccion;
                  break;
                case 'bajar':
                  coilValues.coilBajar = value.direccion;
                  break;
                case 'estado':
                  coilValues.coilEstado = value.direccion;
                  break;
                case 'bloqueo':
                  coilValues.coilBloqueo = value.direccion;
                  break;
                case 'puntual':
                  coilValues.coilPuntual = value.direccion;
                  break;
              }
            }
          });
        }
      });
      console.log('Valores de coils extraídos:', coilValues);
    }
    
    // Construir query con todos los campos
    const query = `
      INSERT INTO PILONAS (
        NOMBRE, 
        DIRECCION_IP, 
        PUERTO, 
        UNIT_ID,
        TIPO_DISPOSITIVO,
        LOGO_CONFIG,
        COIL_SUBIR,
        COIL_BAJAR,
        COIL_ESTADO,
        COIL_BLOQUEO,
        COIL_PUNTUAL,
        COIL_ELECTROVALVULA,
        TIEMPO_PUNTUAL,
        TIPO_COIL_SUBIR,
        MODO_COIL_SUBIR,
        TIPO_COIL_BAJAR,
        MODO_COIL_BAJAR,
        TIPO_COIL_ESTADO,
        MODO_COIL_ESTADO,
        TIPO_COIL_BLOQUEO,
        MODO_COIL_BLOQUEO,
        TIPO_COIL_PUNTUAL,
        MODO_COIL_PUNTUAL,
        TIPO_COIL_ELECTROVALVULA,
        MODO_COIL_ELECTROVALVULA,
        LATITUD,
        LONGITUD,
        ESTADO
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'error')
    `;
    
    const params = [
      nombre,
      direccionIP,
      puerto || 502,
      unitId || 1,
      tipoDispositivo || 'MODBUS_GENERICO',
      tipoDispositivo === 'LOGO' ? JSON.stringify(logoConfig) : null,
      coilValues.coilSubir !== undefined ? coilValues.coilSubir : (coilSubir || 0),
      coilValues.coilBajar !== undefined ? coilValues.coilBajar : (coilBajar || 0),
      coilValues.coilEstado !== undefined ? coilValues.coilEstado : (coilEstado || 0),
      coilValues.coilBloqueo !== undefined ? coilValues.coilBloqueo : (coilBloqueo || 0),
      coilValues.coilPuntual !== undefined ? coilValues.coilPuntual : (coilPuntual || null),
      coilElectrovalvula || null,
      tiempoPuntual || 3000,
      // Tipos y modos por defecto
      'COIL', // TIPO_COIL_SUBIR
      'RW',   // MODO_COIL_SUBIR
      'COIL', // TIPO_COIL_BAJAR
      'RW',   // MODO_COIL_BAJAR
      'COIL', // TIPO_COIL_ESTADO
      'R',    // MODO_COIL_ESTADO
      'COIL', // TIPO_COIL_BLOQUEO
      'RW',   // MODO_COIL_BLOQUEO
      'COIL', // TIPO_COIL_PUNTUAL
      'W',    // MODO_COIL_PUNTUAL
      'COIL', // TIPO_COIL_ELECTROVALVULA
      'R',    // MODO_COIL_ELECTROVALVULA (Solo lectura)
      latitud,
      longitud
    ];
    
    // Registrar datos para depuración
    console.log('Creando nueva pilona con los siguientes datos:');
    console.log({
      NOMBRE: nombre,
      DIRECCION_IP: direccionIP,
      PUERTO: puerto || 502,
      UNIT_ID: unitId || 1,
      TIPO_DISPOSITIVO: tipoDispositivo || 'MODBUS_GENERICO',
      ES_LOGO: tipoDispositivo === 'LOGO'
    });
    
    // Insertar en la base de datos
    const result = await dbManager.run(query, params);
    const pilonaId = result.lastID;
    
    // Registrar en auditoría
    await dbManager.logAction(
      req.session.usuario.ID,
      'crear_pilona',
      pilonaId,
      req.ip
    );
    
    // Obtener la pilona creada
    const pilonaCreada = await dbManager.getPilonaById(pilonaId);
    
    res.json({
      mensaje: 'Pilona creada correctamente',
      pilona: pilonaCreada
    });
  } catch (error) {
    console.error('Error creando pilona:', error);
    res.status(500).json({ error: 'Error del servidor al crear la pilona: ' + error.message });
  }
});

// Eliminar una pilona
router.delete('/:id', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    const pilonaId = req.params.id;
    
    // Verificar que la pilona existe
    const pilona = await dbManager.getPilonaById(pilonaId);
    if (!pilona) {
      return res.status(404).json({ error: 'Pilona no encontrada' });
    }
    
    // Eliminar la pilona
    const query = 'DELETE FROM PILONAS WHERE ID = ?';
    await dbManager.run(query, [pilonaId]);
    
    // Registrar en auditoría
    await dbManager.logAction(
      req.session.usuario.ID,
      'eliminar_pilona',
      pilonaId,
      req.ip
    );
    
    res.json({ mensaje: 'Pilona eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando pilona:', error);
    res.status(500).json({ error: 'Error del servidor al eliminar la pilona: ' + error.message });
  }
});

// Actualizar una pilona existente
router.put('/:id', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    // Obtener datos de la pilona incluyendo configuración LOGO
    const { 
      nombre, 
      direccionIP, 
      puerto, 
      unitId,
      tipoDispositivo, // 'MODBUS_GENERICO' o 'LOGO'
      // Configuración para MODBUS genérico
      coilSubir, 
      coilBajar, 
      coilEstado, 
      coilBloqueo, 
      coilPuntual,
      coilElectrovalvula, // Para detección de fallos
      tiempoPuntual, // Tiempo de activación para acción puntual
      // Puertos independientes por coil (opcionales)
      puertoCoilSubir,
      puertoCoilBajar,
      puertoCoilEstado,
      puertoCoilBloqueo,
      puertoCoilPuntual,
      puertoCoilElectrovalvula,
      // Unit IDs independientes por coil (opcionales)
      unitIdCoilSubir,
      unitIdCoilBajar,
      unitIdCoilEstado,
      unitIdCoilBloqueo,
      unitIdCoilPuntual,
      unitIdCoilElectrovalvula,
      // Tipos de registro Modbus (COIL, DISCRETE_INPUT, INPUT_REGISTER, HOLDING_REGISTER)
      tipoCoilSubir,
      tipoCoilBajar,
      tipoCoilEstado,
      tipoCoilBloqueo,
      tipoCoilPuntual,
      tipoCoilElectrovalvula,
      // Modos de operación (R, W, RW)
      modoCoilSubir,
      modoCoilBajar,
      modoCoilEstado,
      modoCoilBloqueo,
      modoCoilPuntual,
      modoCoilElectrovalvula,
      // Configuración específica de LOGO
      logoConfig,
      latitud, 
      longitud 
    } = req.body;
    
    // Verificar que la pilona existe
    const pilona = await dbManager.getPilonaById(req.params.id);
    if (!pilona) {
      return res.status(404).json({ error: 'Pilona no encontrada' });
    }
    
    // Si es LOGO, procesar la configuración
    let coilValues = {};
    if (tipoDispositivo === 'LOGO' && logoConfig) {
      console.log('Procesando configuración LOGO...');
      // Mapear automáticamente las direcciones LOGO a los coils
      const config = typeof logoConfig === 'string' ? JSON.parse(logoConfig) : logoConfig;
      console.log('Configuración LOGO parseada:', JSON.stringify(config, null, 2));
      
      // Buscar las funciones asignadas en la configuración
      Object.entries(config).forEach(([seccion, elementos]) => {
        // Solo procesar secciones que contienen elementos (no 'version' u otros campos)
        if (typeof elementos === 'object' && elementos !== null && seccion !== 'version') {
          console.log(`Procesando sección: ${seccion}`);
          Object.entries(elementos).forEach(([key, value]) => {
            if (value && value.funcion !== undefined && value.direccion !== undefined) {
              console.log(`  Encontrada función ${value.funcion} en ${key} con dirección ${value.direccion}`);
              switch (value.funcion) {
                case 'subir':
                  coilValues.coilSubir = value.direccion;
                  break;
                case 'bajar':
                  coilValues.coilBajar = value.direccion;
                  break;
                case 'estado':
                  coilValues.coilEstado = value.direccion;
                  break;
                case 'bloqueo':
                  coilValues.coilBloqueo = value.direccion;
                  break;
                case 'puntual':
                  coilValues.coilPuntual = value.direccion;
                  break;
              }
            }
          });
        }
      });
      console.log('Valores de coils extraídos:', coilValues);
    }
    
    // Construir query con todos los campos
    const query = `
      UPDATE PILONAS SET 
        NOMBRE = ?, 
        DIRECCION_IP = ?, 
        PUERTO = ?, 
        UNIT_ID = ?,
        TIPO_DISPOSITIVO = ?,
        LOGO_CONFIG = ?,
        COIL_SUBIR = ?,
        COIL_BAJAR = ?,
        COIL_ESTADO = ?,
        COIL_BLOQUEO = ?,
        COIL_PUNTUAL = ?,
        COIL_ELECTROVALVULA = ?,
        TIEMPO_PUNTUAL = ?,
        PUERTO_COIL_SUBIR = ?,
        PUERTO_COIL_BAJAR = ?,
        PUERTO_COIL_ESTADO = ?,
        PUERTO_COIL_BLOQUEO = ?,
        PUERTO_COIL_PUNTUAL = ?,
        PUERTO_COIL_ELECTROVALVULA = ?,
        UNIT_ID_COIL_SUBIR = ?,
        UNIT_ID_COIL_BAJAR = ?,
        UNIT_ID_COIL_ESTADO = ?,
        UNIT_ID_COIL_BLOQUEO = ?,
        UNIT_ID_COIL_PUNTUAL = ?,
        UNIT_ID_COIL_ELECTROVALVULA = ?,
        TIPO_COIL_SUBIR = ?,
        MODO_COIL_SUBIR = ?,
        TIPO_COIL_BAJAR = ?,
        MODO_COIL_BAJAR = ?,
        TIPO_COIL_ESTADO = ?,
        MODO_COIL_ESTADO = ?,
        TIPO_COIL_BLOQUEO = ?,
        MODO_COIL_BLOQUEO = ?,
        TIPO_COIL_PUNTUAL = ?,
        MODO_COIL_PUNTUAL = ?,
        TIPO_COIL_ELECTROVALVULA = ?,
        MODO_COIL_ELECTROVALVULA = ?,
        LATITUD = ?,
        LONGITUD = ?
      WHERE ID = ?
    `;
    
    const params = [
      nombre,
      direccionIP,
      puerto || 502,
      unitId || 1,
      tipoDispositivo || 'MODBUS_GENERICO',
      tipoDispositivo === 'LOGO' ? JSON.stringify(logoConfig) : null,
      coilValues.coilSubir !== undefined ? coilValues.coilSubir : coilSubir,
      coilValues.coilBajar !== undefined ? coilValues.coilBajar : coilBajar,
      coilValues.coilEstado !== undefined ? coilValues.coilEstado : coilEstado,
      coilValues.coilBloqueo !== undefined ? coilValues.coilBloqueo : coilBloqueo,
      coilValues.coilPuntual !== undefined ? coilValues.coilPuntual : coilPuntual,
      coilElectrovalvula || null,
      tiempoPuntual || 3000,
      // Puertos independientes (pueden ser null)
      puertoCoilSubir || null,
      puertoCoilBajar || null,
      puertoCoilEstado || null,
      puertoCoilBloqueo || null,
      puertoCoilPuntual || null,
      puertoCoilElectrovalvula || null,
      // Unit IDs independientes (pueden ser null)
      unitIdCoilSubir || null,
      unitIdCoilBajar || null,
      unitIdCoilEstado || null,
      unitIdCoilBloqueo || null,
      unitIdCoilPuntual || null,
      unitIdCoilElectrovalvula || null,
      // Tipos de registro Modbus
      tipoCoilSubir || 'COIL',
      modoCoilSubir || 'RW',
      tipoCoilBajar || 'COIL',
      modoCoilBajar || 'RW',
      tipoCoilEstado || 'COIL',
      modoCoilEstado || 'R',
      tipoCoilBloqueo || 'COIL',
      modoCoilBloqueo || 'RW',
      tipoCoilPuntual || 'COIL',
      modoCoilPuntual || 'W',
      tipoCoilElectrovalvula || 'COIL', // TIPO_COIL_ELECTROVALVULA
      modoCoilElectrovalvula || 'R',    // MODO_COIL_ELECTROVALVULA (Solo lectura)
      latitud,
      longitud,
      req.params.id
    ];
    
    // Registrar datos para depuración
    console.log('Actualizando pilona con los siguientes datos:');
    console.log({
      ID: req.params.id,
      NOMBRE: nombre,
      DIRECCION_IP: direccionIP,
      PUERTO: puerto || 502,
      UNIT_ID: unitId || 1,
      TIPO_DISPOSITIVO: tipoDispositivo || 'MODBUS_GENERICO',
      ES_LOGO: tipoDispositivo === 'LOGO'
    });
    
    // Actualizar en la base de datos
    await dbManager.run(query, params);
    
    // Registrar en auditoría
    await dbManager.logAction(
      req.session.usuario.ID,
      'actualizar_pilona',
      req.params.id,
      req.ip
    );
    
    // Obtener la pilona actualizada
    const pilonaActualizada = await dbManager.getPilonaById(req.params.id);
    
    res.json({
      mensaje: 'Pilona actualizada correctamente',
      pilona: pilonaActualizada
    });
  } catch (error) {
    console.error('Error actualizando pilona:', error);
    res.status(500).json({ error: 'Error del servidor al actualizar la pilona: ' + error.message });
  }
});

// Middleware para verificar permisos de pilona por zona
async function checkPilonaPermission(req, res, next) {
  try {
    const pilonaId = req.params.id;
    const accion = req.originalUrl.split('/').pop(); // Obtener la acción del final de la URL
    const usuarioId = req.session.usuario.ID;
    
    // Verificar si el usuario tiene permiso para esta pilona y acción
    const tienePermiso = await dbManager.verificarPermisoPilona(usuarioId, pilonaId, accion);
    
    if (tienePermiso) {
      next();
    } else {
      res.status(403).json({ 
        error: 'No tiene permiso para controlar esta pilona en esta zona' 
      });
    }
  } catch (error) {
    console.error('Error verificando permisos de pilona:', error);
    res.status(500).json({ error: 'Error del servidor al verificar permisos' });
  }
}

// Obtener configuración de mapeo de LOGO
router.get('/logo/mapping', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    // Devolver el mapeo de direcciones de LOGO
    res.json({
      entradas: {
        digitales: [
          { nombre: 'I1', direccion: 1, descripcion: 'Entrada digital 1' },
          { nombre: 'I2', direccion: 2, descripcion: 'Entrada digital 2' },
          { nombre: 'I3', direccion: 3, descripcion: 'Entrada digital 3' },
          { nombre: 'I4', direccion: 4, descripcion: 'Entrada digital 4' },
          { nombre: 'I5', direccion: 5, descripcion: 'Entrada digital 5' },
          { nombre: 'I6', direccion: 6, descripcion: 'Entrada digital 6' },
          { nombre: 'I7', direccion: 7, descripcion: 'Entrada digital 7' },
          { nombre: 'I8', direccion: 8, descripcion: 'Entrada digital 8' },
          { nombre: 'I9', direccion: 9, descripcion: 'Entrada digital 9' },
          { nombre: 'I10', direccion: 10, descripcion: 'Entrada digital 10' },
          { nombre: 'I11', direccion: 11, descripcion: 'Entrada digital 11' },
          { nombre: 'I12', direccion: 12, descripcion: 'Entrada digital 12' },
          { nombre: 'I13', direccion: 13, descripcion: 'Entrada digital 13' },
          { nombre: 'I14', direccion: 14, descripcion: 'Entrada digital 14' },
          { nombre: 'I15', direccion: 15, descripcion: 'Entrada digital 15' },
          { nombre: 'I16', direccion: 16, descripcion: 'Entrada digital 16' },
          { nombre: 'I17', direccion: 17, descripcion: 'Entrada digital 17' },
          { nombre: 'I18', direccion: 18, descripcion: 'Entrada digital 18' },
          { nombre: 'I19', direccion: 19, descripcion: 'Entrada digital 19' },
          { nombre: 'I20', direccion: 20, descripcion: 'Entrada digital 20' },
          { nombre: 'I21', direccion: 21, descripcion: 'Entrada digital 21' },
          { nombre: 'I22', direccion: 22, descripcion: 'Entrada digital 22' },
          { nombre: 'I23', direccion: 23, descripcion: 'Entrada digital 23' },
          { nombre: 'I24', direccion: 24, descripcion: 'Entrada digital 24' }
        ],
        analogicas: [
          { nombre: 'AI1', direccion: 1, descripcion: 'Entrada analógica 1' },
          { nombre: 'AI2', direccion: 2, descripcion: 'Entrada analógica 2' },
          { nombre: 'AI3', direccion: 3, descripcion: 'Entrada analógica 3' },
          { nombre: 'AI4', direccion: 4, descripcion: 'Entrada analógica 4' },
          { nombre: 'AI5', direccion: 5, descripcion: 'Entrada analógica 5' },
          { nombre: 'AI6', direccion: 6, descripcion: 'Entrada analógica 6' },
          { nombre: 'AI7', direccion: 7, descripcion: 'Entrada analógica 7' },
          { nombre: 'AI8', direccion: 8, descripcion: 'Entrada analógica 8' }
        ]
      },
      salidas: {
        digitales: [
          { nombre: 'Q1', direccion: 8193, descripcion: 'Salida digital 1' },
          { nombre: 'Q2', direccion: 8194, descripcion: 'Salida digital 2' },
          { nombre: 'Q3', direccion: 8195, descripcion: 'Salida digital 3' },
          { nombre: 'Q4', direccion: 8196, descripcion: 'Salida digital 4' },
          { nombre: 'Q5', direccion: 8197, descripcion: 'Salida digital 5' },
          { nombre: 'Q6', direccion: 8198, descripcion: 'Salida digital 6' },
          { nombre: 'Q7', direccion: 8199, descripcion: 'Salida digital 7' },
          { nombre: 'Q8', direccion: 8200, descripcion: 'Salida digital 8' },
          { nombre: 'Q9', direccion: 8201, descripcion: 'Salida digital 9' },
          { nombre: 'Q10', direccion: 8202, descripcion: 'Salida digital 10' },
          { nombre: 'Q11', direccion: 8203, descripcion: 'Salida digital 11' },
          { nombre: 'Q12', direccion: 8204, descripcion: 'Salida digital 12' },
          { nombre: 'Q13', direccion: 8205, descripcion: 'Salida digital 13' },
          { nombre: 'Q14', direccion: 8206, descripcion: 'Salida digital 14' },
          { nombre: 'Q15', direccion: 8207, descripcion: 'Salida digital 15' },
          { nombre: 'Q16', direccion: 8208, descripcion: 'Salida digital 16' },
          { nombre: 'Q17', direccion: 8209, descripcion: 'Salida digital 17' },
          { nombre: 'Q18', direccion: 8210, descripcion: 'Salida digital 18' },
          { nombre: 'Q19', direccion: 8211, descripcion: 'Salida digital 19' },
          { nombre: 'Q20', direccion: 8212, descripcion: 'Salida digital 20' }
        ],
        analogicas: [
          { nombre: 'AQ1', direccion: 513, descripcion: 'Salida analógica 1' },
          { nombre: 'AQ2', direccion: 514, descripcion: 'Salida analógica 2' },
          { nombre: 'AQ3', direccion: 515, descripcion: 'Salida analógica 3' },
          { nombre: 'AQ4', direccion: 516, descripcion: 'Salida analógica 4' },
          { nombre: 'AQ5', direccion: 517, descripcion: 'Salida analógica 5' },
          { nombre: 'AQ6', direccion: 518, descripcion: 'Salida analógica 6' },
          { nombre: 'AQ7', direccion: 519, descripcion: 'Salida analógica 7' },
          { nombre: 'AQ8', direccion: 520, descripcion: 'Salida analógica 8' }
        ]
      },
      marcas: {
        digitales: [
          { nombre: 'M1', direccion: 8257, descripcion: 'Marca digital 1' },
          { nombre: 'M2', direccion: 8258, descripcion: 'Marca digital 2' },
          { nombre: 'M3', direccion: 8259, descripcion: 'Marca digital 3' },
          { nombre: 'M4', direccion: 8260, descripcion: 'Marca digital 4' },
          { nombre: 'M5', direccion: 8261, descripcion: 'Marca digital 5' },
          { nombre: 'M6', direccion: 8262, descripcion: 'Marca digital 6' },
          { nombre: 'M7', direccion: 8263, descripcion: 'Marca digital 7' },
          { nombre: 'M8', direccion: 8264, descripcion: 'Marca digital 8' },
          { nombre: 'M9', direccion: 8265, descripcion: 'Marca digital 9' },
          { nombre: 'M10', direccion: 8266, descripcion: 'Marca digital 10' },
          { nombre: 'M11', direccion: 8267, descripcion: 'Marca digital 11' },
          { nombre: 'M12', direccion: 8268, descripcion: 'Marca digital 12' },
          { nombre: 'M13', direccion: 8269, descripcion: 'Marca digital 13' },
          { nombre: 'M14', direccion: 8270, descripcion: 'Marca digital 14' },
          { nombre: 'M15', direccion: 8271, descripcion: 'Marca digital 15' },
          { nombre: 'M16', direccion: 8272, descripcion: 'Marca digital 16' },
          { nombre: 'M17', direccion: 8273, descripcion: 'Marca digital 17' },
          { nombre: 'M18', direccion: 8274, descripcion: 'Marca digital 18' },
          { nombre: 'M19', direccion: 8275, descripcion: 'Marca digital 19' },
          { nombre: 'M20', direccion: 8276, descripcion: 'Marca digital 20' },
          { nombre: 'M21', direccion: 8277, descripcion: 'Marca digital 21' },
          { nombre: 'M22', direccion: 8278, descripcion: 'Marca digital 22' },
          { nombre: 'M23', direccion: 8279, descripcion: 'Marca digital 23' },
          { nombre: 'M24', direccion: 8280, descripcion: 'Marca digital 24' },
          { nombre: 'M25', direccion: 8281, descripcion: 'Marca digital 25' },
          { nombre: 'M26', direccion: 8282, descripcion: 'Marca digital 26' },
          { nombre: 'M27', direccion: 8283, descripcion: 'Marca digital 27' },
          { nombre: 'M28', direccion: 8284, descripcion: 'Marca digital 28' },
          { nombre: 'M29', direccion: 8285, descripcion: 'Marca digital 29' },
          { nombre: 'M30', direccion: 8286, descripcion: 'Marca digital 30' },
          { nombre: 'M31', direccion: 8287, descripcion: 'Marca digital 31' },
          { nombre: 'M32', direccion: 8288, descripcion: 'Marca digital 32' }
          // ... hasta M64
        ],
        analogicas: [
          { nombre: 'AM1', direccion: 529, descripcion: 'Marca analógica 1' },
          { nombre: 'AM2', direccion: 530, descripcion: 'Marca analógica 2' },
          { nombre: 'AM3', direccion: 531, descripcion: 'Marca analógica 3' },
          { nombre: 'AM4', direccion: 532, descripcion: 'Marca analógica 4' },
          { nombre: 'AM5', direccion: 533, descripcion: 'Marca analógica 5' },
          { nombre: 'AM6', direccion: 534, descripcion: 'Marca analógica 6' },
          { nombre: 'AM7', direccion: 535, descripcion: 'Marca analógica 7' },
          { nombre: 'AM8', direccion: 536, descripcion: 'Marca analógica 8' }
          // ... hasta AM64
        ]
      },
      funciones: [
        { nombre: 'subir', descripcion: 'Acción para subir la pilona' },
        { nombre: 'bajar', descripcion: 'Acción para bajar la pilona' },
        { nombre: 'estado', descripcion: 'Estado actual de la pilona (arriba/abajo)' },
        { nombre: 'bloqueo', descripcion: 'Estado de bloqueo de la pilona' },
        { nombre: 'puntual', descripcion: 'Acción puntual o temporal' }
      ]
    });
  } catch (error) {
    console.error('Error obteniendo mapeo de LOGO:', error);
    res.status(500).json({ error: 'Error del servidor al obtener mapeo de LOGO' });
  }
});

// Obtener todas las pilonas
router.get('/', requireAuth, async (req, res) => {
  try {
    // Filtrar pilonas según permisos del usuario
    const pilonas = await dbManager.getPilonasPermitidas(req.session.usuario.ID);
    
    // Si el rol permite, actualizar estados de pilonas en tiempo real
    if (['operador', 'administrador'].includes(req.session.usuario.ROL)) {
      for (const pilona of pilonas) {
        try {
          pilona.ESTADO = await obtenerEstadoPilona(pilona);
          // Actualizar en la base de datos
          await dbManager.updatePilonaEstado(pilona.ID, pilona.ESTADO);
        } catch (error) {
          console.error(`Error actualizando estado de pilona ${pilona.ID}:`, error);
          // No fallar toda la respuesta por un error en una pilona
        }
      }
    }
    
    res.json(pilonas);
  } catch (error) {
    console.error('Error obteniendo pilonas:', error);
    res.status(500).json({ error: 'Error del servidor al obtener pilonas' });
  }
});

// Obtener una pilona por ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const pilona = await dbManager.getPilonaById(req.params.id);
    
    if (!pilona) {
      return res.status(404).json({ error: 'Pilona no encontrada' });
    }
    
    // Verificar si el usuario tiene acceso a esta pilona
    const tieneAcceso = await dbManager.verificarPermisoPilona(
      req.session.usuario.ID, 
      pilona.ID, 
      'bajar'
    );
    
    if (!tieneAcceso && req.session.usuario.ROL === 'cliente') {
      return res.status(403).json({ error: 'No tiene acceso a esta pilona' });
    }
    
    // Actualizar estado en tiempo real
    if (['operador', 'administrador'].includes(req.session.usuario.ROL)) {
      pilona.ESTADO = await obtenerEstadoPilona(pilona);
      // Actualizar en la base de datos
      await dbManager.updatePilonaEstado(pilona.ID, pilona.ESTADO);
    }
    
    res.json(pilona);
  } catch (error) {
    console.error('Error obteniendo pilona:', error);
    res.status(500).json({ error: 'Error del servidor al obtener la pilona' });
  }
});

// Actualizar el estado de una pilona en la base de datos
async function actualizarEstadoPilona(pilonaId) {
  try {
    // Obtener datos de la pilona
    const pilona = await dbManager.getPilonaById(pilonaId);
    
    if (!pilona) {
      console.error(`Pilona con ID ${pilonaId} no encontrada`);
      return 'error';
    }
    
    // Obtener estado actual desde el dispositivo
    const nuevoEstado = await obtenerEstadoPilona(pilona);
    
    // Actualizar estado en la base de datos
    await dbManager.updatePilonaEstado(pilonaId, nuevoEstado);
    
    // Emitir actualización a todos los clientes conectados mediante sockets
    if (global.io) {
      global.io.emit('actualizacion_pilona', { 
        id: pilona.ID, 
        estado: nuevoEstado 
      });
    }
    
    return nuevoEstado;
  } catch (error) {
    console.error(`Error actualizando estado de pilona ${pilonaId}:`, error);
    return 'error';
  }
}

// Ruta de bajar (para todos los roles, pero con diferentes funcionalidades)
router.post('/:id/bajar', requireAuth, checkPilonaPermission, async (req, res) => {
  try {
    // Obtener la pilona
    const pilona = await dbManager.getPilonaById(req.params.id);
    
    if (!pilona) {
      return res.status(404).json({ error: 'Pilona no encontrada' });
    }
    
    // Verificar conectividad antes de intentar control
    const conectado = await conectarPilona(pilona);
    if (!conectado) {
      return res.status(500).json({ error: 'No se pudo conectar con la pilona. Verifique la configuración.' });
    }
    
    // Determinar si es cliente o no
    const esCliente = req.session.usuario.ROL === 'cliente';
    let resultado = false;
    
    try {
      if (esCliente) {
        console.log(`Usuario cliente (${req.session.usuario.NOMBRE}) ejecutando acción puntual en pilona ${pilona.ID}`);
        // Usar la función específica para clientes
        resultado = await ejecutarAccionPuntual(pilona, req.session.usuario, req);
        
        // Registrar acción en auditoría como 'puntual'
        if (resultado) {
          await dbManager.logAction(req.session.usuario.ID, 'puntual', pilona.ID, req.ip);
        }
      } else {
        console.log(`Usuario no-cliente (${req.session.usuario.NOMBRE}) ejecutando acción bajar normal en pilona ${pilona.ID}`);
        // Usar la función normal para otros roles - ahora con verificación de estado
        resultado = await controlarPilona(pilona, 'bajar', req.session.usuario, req);
        
        // Registrar acción en auditoría
        if (resultado) {
          await dbManager.logAction(req.session.usuario.ID, 'bajar', pilona.ID, req.ip);
        }
      }
      
      if (resultado) {
        // Actualizar estado y devolver respuesta
        const nuevoEstado = await actualizarEstadoPilona(pilona.ID);
        
        res.json({ 
          mensaje: esCliente ? 'Acción puntual ejecutada correctamente' : 'Pilona bajada correctamente', 
          estado: nuevoEstado
        });
      } else {
        res.status(500).json({ error: 'Error al bajar la pilona. Intente nuevamente.' });
      }
    } catch (error) {
      console.error('Error controlando pilona:', error);
      // Si el error es porque la pilona no respondió
      if (error.message.includes('no respondió al comando')) {
        res.status(500).json({ 
          error: 'La pilona no respondió al comando. Verifique que el dispositivo esté operativo.',
          detalles: error.message
        });
      } else {
        res.status(500).json({ error: `Error del servidor: ${error.message}` });
      }
    }
  } catch (error) {
    console.error('Error bajando pilona:', error);
    res.status(500).json({ error: `Error del servidor: ${error.message}` });
  }
});

// Rutas de control de pilonas (Operador y Administrador)
router.post('/:id/subir', requireAuth, checkRole(['operador', 'administrador']), checkPilonaPermission, async (req, res) => {
  try {
    // Obtener la pilona
    const pilona = await dbManager.getPilonaById(req.params.id);
    
    if (!pilona) {
      return res.status(404).json({ error: 'Pilona no encontrada' });
    }
    
    // Verificar conectividad antes de intentar control
    const conectado = await conectarPilona(pilona);
    if (!conectado) {
      return res.status(500).json({ error: 'No se pudo conectar con la pilona. Verifique la configuración.' });
    }
    
    try {
      const resultado = await controlarPilona(pilona, 'subir', req.session.usuario, req);
      
      if (resultado) {
        // Registrar acción en auditoría
        await dbManager.logAction(req.session.usuario.ID, 'subir', pilona.ID, req.ip);
        
        // Actualizar estado y devolver respuesta
        const nuevoEstado = await actualizarEstadoPilona(pilona.ID);
        
        res.json({ 
          mensaje: 'Pilona subida correctamente', 
          estado: nuevoEstado
        });
      } else {
        res.status(500).json({ error: 'Error al subir la pilona. Intente nuevamente.' });
      }
    } catch (error) {
      console.error('Error controlando pilona:', error);
      // Si el error es porque la pilona no respondió
      if (error.message.includes('no respondió al comando')) {
        res.status(500).json({ 
          error: 'La pilona no respondió al comando. Verifique que el dispositivo esté operativo.',
          detalles: error.message
        });
      } else {
        res.status(500).json({ error: `Error del servidor: ${error.message}` });
      }
    }
  } catch (error) {
    console.error('Error subiendo pilona:', error);
    res.status(500).json({ error: `Error del servidor: ${error.message}` });
  }
});

router.post('/:id/bloquear', requireAuth, checkRole(['administrador']), checkPilonaPermission, async (req, res) => {
  try {
    const { posicion } = req.body; // 'arriba' o 'abajo'
    
    if (!posicion || !['arriba', 'abajo'].includes(posicion)) {
      return res.status(400).json({ error: 'Posición no válida. Debe ser "arriba" o "abajo".' });
    }
    
    // Obtener la pilona
    const pilona = await dbManager.getPilonaById(req.params.id);
    
    if (!pilona) {
      return res.status(404).json({ error: 'Pilona no encontrada' });
    }
    
    // Verificar conectividad antes de intentar control
    const conectado = await conectarPilona(pilona);
    if (!conectado) {
      return res.status(500).json({ error: 'No se pudo conectar con la pilona. Verifique la configuración.' });
    }
    
    try {
      const accion = posicion === 'arriba' ? 'bloquear_arriba' : 'bloquear_abajo';
      const resultado = await controlarPilona(pilona, accion, req.session.usuario, req);
      
      if (resultado) {
        // Registrar acción en auditoría
        await dbManager.logAction(req.session.usuario.ID, accion, pilona.ID, req.ip);
        
        // Actualizar estado y devolver respuesta
        const nuevoEstado = await actualizarEstadoPilona(pilona.ID);
        
        res.json({ 
          mensaje: `Pilona bloqueada ${posicion} correctamente`, 
          estado: nuevoEstado
        });
      } else {
        res.status(500).json({ error: `Error al bloquear la pilona ${posicion}. Intente nuevamente.` });
      }
    } catch (error) {
      console.error('Error controlando pilona:', error);
      // Si el error es porque la pilona no respondió
      if (error.message.includes('no respondió al comando')) {
        res.status(500).json({ 
          error: 'La pilona no respondió al comando. Verifique que el dispositivo esté operativo.',
          detalles: error.message
        });
      } else {
        res.status(500).json({ error: `Error del servidor: ${error.message}` });
      }
    }
  } catch (error) {
    console.error('Error bloqueando pilona:', error);
    res.status(500).json({ error: `Error del servidor: ${error.message}` });
  }
});

router.post('/:id/desbloquear', requireAuth, checkRole(['administrador']), checkPilonaPermission, async (req, res) => {
  try {
    // Obtener la pilona
    const pilona = await dbManager.getPilonaById(req.params.id);
    
    if (!pilona) {
      return res.status(404).json({ error: 'Pilona no encontrada' });
    }
    
    // Verificar conectividad antes de intentar control
    const conectado = await conectarPilona(pilona);
    if (!conectado) {
      return res.status(500).json({ error: 'No se pudo conectar con la pilona. Verifique la configuración.' });
    }
    
    try {
      const resultado = await controlarPilona(pilona, 'desbloquear', req.session.usuario, req);
      
      if (resultado) {
        // Registrar acción en auditoría
        await dbManager.logAction(req.session.usuario.ID, 'desbloquear', pilona.ID, req.ip);
        
        // Actualizar estado y devolver respuesta
        const nuevoEstado = await actualizarEstadoPilona(pilona.ID);
        
        res.json({ 
          mensaje: 'Pilona desbloqueada correctamente', 
          estado: nuevoEstado
        });
      } else {
        res.status(500).json({ error: 'Error al desbloquear la pilona. Intente nuevamente.' });
      }
    } catch (error) {
      console.error('Error controlando pilona:', error);
      // Si el error es porque la pilona no respondió
      if (error.message.includes('no respondió al comando')) {
        res.status(500).json({ 
          error: 'La pilona no respondió al comando. Verifique que el dispositivo esté operativo.',
          detalles: error.message
        });
      } else {
        res.status(500).json({ error: `Error del servidor: ${error.message}` });
      }
    }
  } catch (error) {
    console.error('Error desbloqueando pilona:', error);
    res.status(500).json({ error: `Error del servidor: ${error.message}` });
  }
});

// Ruta para pausar monitoreo de una pilona
router.post('/pause-monitoring', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    const { pilonaId } = req.body;
    
    if (pilonaId) {
      pausarMonitoreoPilona(parseInt(pilonaId));
      res.json({ success: true, message: 'Monitoreo pausado' });
    } else {
      res.json({ success: false, message: 'ID de pilona no proporcionado' });
    }
  } catch (error) {
    console.error('Error pausando monitoreo:', error);
    res.json({ success: false, message: error.message });
  }
});

// Ruta para reanudar monitoreo de una pilona
router.post('/resume-monitoring', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    const { pilonaId } = req.body;
    
    if (pilonaId) {
      reanudarMonitoreoPilona(parseInt(pilonaId));
      res.json({ success: true, message: 'Monitoreo reanudado' });
    } else {
      res.json({ success: false, message: 'ID de pilona no proporcionado' });
    }
  } catch (error) {
    console.error('Error reanudando monitoreo:', error);
    res.json({ success: false, message: error.message });
  }
});

// Rutas de prueba para configuración de pilonas

// Activar/desactivar modo de prueba
router.post('/test-mode', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    const { pilonaId, testMode } = req.body;
    
    if (!pilonaId) {
      return res.status(400).json({ error: 'ID de pilona requerido' });
    }
    
    console.log(`Modo de prueba ${testMode ? 'activado' : 'desactivado'} para pilona ${pilonaId}`);
    
    if (testMode) {
      pausarMonitoreoPilona(parseInt(pilonaId));
    } else {
      reanudarMonitoreoPilona(parseInt(pilonaId));
    }
    
    res.json({ 
      success: true, 
      message: `Modo de prueba ${testMode ? 'activado' : 'desactivado'}` 
    });
  } catch (error) {
    console.error('Error configurando modo de prueba:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

router.post('/test-connection', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    const pilona = req.body;
    
    console.log('Probando conexión con pilona:', {
      ip: pilona.DIRECCION_IP,
      puerto: pilona.PUERTO,
      unitId: pilona.UNIT_ID
    });
    
    // Si la pilona tiene ID, pausar su monitoreo temporalmente
    if (pilona.ID) {
      pausarMonitoreoPilona(pilona.ID);
    }
    
    // Esperar un momento para asegurar que cualquier operación en curso termine
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Intentar conectar
    const conectado = await conectarPilona(pilona);
    
    // Reanudar monitoreo si la pilona tenía ID
    if (pilona.ID) {
      setTimeout(() => reanudarMonitoreoPilona(pilona.ID), 5000); // Reanudar después de 5 segundos
    }
    
    if (conectado) {
      res.json({ success: true, message: 'Conexión establecida correctamente' });
    } else {
      res.json({ success: false, message: 'No se pudo establecer conexión con el dispositivo' });
    }
  } catch (error) {
    console.error('Error en prueba de conexión:', error);
    // Reanudar monitoreo en caso de error
    if (req.body.ID) {
      reanudarMonitoreoPilona(req.body.ID);
    }
    res.json({ success: false, message: error.message });
  }
});

// Ruta de prueba para leer todos los coils
router.post('/test-read', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    const datosConexion = req.body;
    
    console.log('Leyendo estados de coils:', datosConexion);
    
    // Pausar monitoreo si es una pilona existente
    if (datosConexion.pilonaId) {
      pausarMonitoreoPilona(parseInt(datosConexion.pilonaId));
    }
    
    // Importar el manager de modbus
    const ModbusRTU = require('modbus-serial');
    const client = new ModbusRTU();
    
    // Conectar
    await client.connectTCP(datosConexion.direccionIP, { 
      port: parseInt(datosConexion.puerto) || 502,
      timeout: 5000
    });
    
    client.setID(parseInt(datosConexion.unitId) || 1);
    
    // Leer valores de todos los coils
    const valores = {};
    
    const coils = ['subir', 'bajar', 'estado', 'bloqueo', 'puntual'];
    for (const coilName of coils) {
      try {
        let address;
        
        if (datosConexion.tipoDispositivo === 'LOGO' && datosConexion.logoConfig) {
          // Buscar dirección en configuración LOGO
          const config = datosConexion.logoConfig;
          if (config[coilName] && config[coilName].direccion !== undefined) {
            address = config[coilName].direccion;
          }
        } else {
          // Modbus genérico
          const coilKey = 'coil' + coilName.charAt(0).toUpperCase() + coilName.slice(1);
          address = parseInt(datosConexion[coilKey]);
        }
        
        if (address !== undefined && !isNaN(address)) {
          const result = await client.readCoils(address, 1);
          valores[coilName] = result.data[0];
        }
      } catch (error) {
        console.error(`Error leyendo coil ${coilName}:`, error);
        valores[coilName] = false;
      }
    }
    
    // Cerrar conexión
    client.close();
    
    // Reanudar monitoreo
    if (datosConexion.pilonaId) {
      setTimeout(() => reanudarMonitoreoPilona(parseInt(datosConexion.pilonaId)), 2000);
    }
    
    res.json({ success: true, valores });
  } catch (error) {
    console.error('Error leyendo estados:', error);
    if (req.body.pilonaId) {
      reanudarMonitoreoPilona(parseInt(req.body.pilonaId));
    }
    res.json({ success: false, error: error.message });
  }
});

// Ruta de prueba para escribir en un coil
router.post('/test-write', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    const { coil, valor, ...datosConexion } = req.body;
    
    console.log(`Escribiendo ${valor} en coil ${coil}`);
    
    // Pausar monitoreo si es una pilona existente
    if (datosConexion.pilonaId) {
      pausarMonitoreoPilona(parseInt(datosConexion.pilonaId));
    }
    
    // Importar el manager de modbus
    const ModbusRTU = require('modbus-serial');
    const client = new ModbusRTU();
    
    // Conectar
    await client.connectTCP(datosConexion.direccionIP, { 
      port: parseInt(datosConexion.puerto) || 502,
      timeout: 5000
    });
    
    client.setID(parseInt(datosConexion.unitId) || 1);
    
    // Obtener dirección del coil
    let address;
    
    if (datosConexion.tipoDispositivo === 'LOGO' && datosConexion.logoConfig) {
      // Buscar dirección en configuración LOGO
      const config = datosConexion.logoConfig;
      if (config[coil] && config[coil].direccion !== undefined) {
        address = config[coil].direccion;
      }
    } else {
      // Modbus genérico
      const coilKey = 'coil' + coil.charAt(0).toUpperCase() + coil.slice(1);
      address = parseInt(datosConexion[coilKey]);
    }
    
    if (address === undefined || isNaN(address)) {
      throw new Error(`Dirección no válida para coil ${coil}`);
    }
    
    // Escribir el valor
    await client.writeCoil(address, valor === 1 || valor === true);
    
    // Cerrar conexión
    client.close();
    
    // Reanudar monitoreo
    if (datosConexion.pilonaId) {
      setTimeout(() => reanudarMonitoreoPilona(parseInt(datosConexion.pilonaId)), 2000);
    }
    
    res.json({ success: true, message: `Valor ${valor} escrito en ${coil}` });
  } catch (error) {
    console.error('Error escribiendo coil:', error);
    if (req.body.pilonaId) {
      reanudarMonitoreoPilona(parseInt(req.body.pilonaId));
    }
    res.json({ success: false, error: error.message });
  }
});

// Nueva ruta para leer un solo coil (usada por toggle)
router.post('/test-read-single', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    const { ip, puerto, unitId, tipoDispositivo, coilType, coilAddress } = req.body;
    
    console.log(`Leyendo coil ${coilType} en dirección ${coilAddress}`);
    
    // Importar el manager de modbus
    const ModbusRTU = require('modbus-serial');
    const client = new ModbusRTU();
    
    // Conectar
    await client.connectTCP(ip, { 
      port: parseInt(puerto) || 502,
      timeout: 5000
    });
    
    client.setID(parseInt(unitId) || 1);
    
    // Obtener dirección del coil
    let address;
    if (tipoDispositivo === 'LOGO') {
      // Para LOGO, el coilAddress ya viene con el formato correcto (ej: 'Q1', 'M1', etc)
      // Necesitamos convertirlo a dirección Modbus
      if (coilAddress.startsWith('Q')) {
        // Salidas digitales Q1-Q20 -> 8193-8212
        const num = parseInt(coilAddress.replace('Q', ''));
        address = 8192 + num;
      } else if (coilAddress.startsWith('M')) {
        // Marcas digitales M1-M64 -> 8257-8320
        const num = parseInt(coilAddress.replace('M', ''));
        address = 8256 + num;
      } else if (coilAddress.startsWith('I')) {
        // Entradas digitales I1-I24 -> 1-24 (solo lectura)
        const num = parseInt(coilAddress.replace('I', ''));
        address = num;
      } else if (coilAddress.includes('.')) {
        // Registros V (ej: V0.0, V1.5)
        const [vReg, bit] = coilAddress.replace('V', '').split('.');
        const baseAddr = 1024 + (parseInt(vReg) * 2);
        address = baseAddr * 8 + parseInt(bit);
      } else {
        // Si es un número directo
        address = parseInt(coilAddress);
      }
    } else {
      address = parseInt(coilAddress);
    }
    
    // Leer el coil
    const result = await client.readCoils(address, 1);
    const value = result.data[0];
    
    // Cerrar conexión
    client.close();
    
    res.json({ success: true, value: value });
  } catch (error) {
    console.error('Error leyendo coil individual:', error);
    res.json({ success: false, error: error.message });
  }
});

router.post('/test-read-coil', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    const { pilona, coilType } = req.body;
    
    console.log(`Leyendo coil ${coilType} de pilona`);
    
    // Si la pilona tiene ID, pausar su monitoreo temporalmente
    if (pilona.ID) {
      pausarMonitoreoPilona(pilona.ID);
    }
    
    // Esperar un momento para asegurar que cualquier operación en curso termine
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Importar el manager de modbus
    const ModbusRTU = require('modbus-serial');
    const client = new ModbusRTU();
    
    // Conectar
    await client.connectTCP(pilona.DIRECCION_IP, { 
      port: parseInt(pilona.PUERTO),
      timeout: 5000
    });
    
    client.setID(parseInt(pilona.UNIT_ID));
    
    // Obtener dirección del coil
    let address;
    if (pilona.TIPO_DISPOSITIVO === 'LOGO' && pilona.LOGO_CONFIG) {
      // Lógica para LOGO
      const config = typeof pilona.LOGO_CONFIG === 'string' ? 
        JSON.parse(pilona.LOGO_CONFIG) : pilona.LOGO_CONFIG;
      
      // Buscar la dirección según la función
      Object.entries(config).forEach(([seccion, elementos]) => {
        Object.entries(elementos || {}).forEach(([key, value]) => {
          if (value.funcion === coilType) {
            address = value.direccion;
          }
        });
      });
    } else {
      // Lógica para Modbus genérico
      const coilMapping = {
        'subir': pilona.COIL_SUBIR,
        'bajar': pilona.COIL_BAJAR,
        'estado': pilona.COIL_ESTADO,
        'bloqueo': pilona.COIL_BLOQUEO,
        'puntual': pilona.COIL_PUNTUAL || pilona.COIL_BAJAR
      };
      address = parseInt(coilMapping[coilType]);
    }
    
    // Leer el coil
    const result = await client.readCoils(address, 1);
    const value = result.data[0];
    
    // Cerrar conexión
    client.close();
    
    // Reanudar monitoreo si la pilona tenía ID
    if (pilona.ID) {
      setTimeout(() => reanudarMonitoreoPilona(pilona.ID), 2000); // Reanudar después de 2 segundos
    }
    
    res.json({ success: true, value: value });
  } catch (error) {
    console.error('Error leyendo coil:', error);
    // Reanudar monitoreo en caso de error
    if (req.body.pilona && req.body.pilona.ID) {
      reanudarMonitoreoPilona(req.body.pilona.ID);
    }
    res.json({ success: false, message: error.message });
  }
});

router.post('/test-write-coil', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    const { pilona, coilType, value } = req.body;
    
    console.log(`Escribiendo coil ${coilType} = ${value} en pilona`);
    
    // Si la pilona tiene ID, pausar su monitoreo temporalmente
    if (pilona.ID) {
      pausarMonitoreoPilona(pilona.ID);
    }
    
    // Esperar un momento para asegurar que cualquier operación en curso termine
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Importar el manager de modbus
    const ModbusRTU = require('modbus-serial');
    const client = new ModbusRTU();
    
    // Conectar
    await client.connectTCP(pilona.DIRECCION_IP, { 
      port: parseInt(pilona.PUERTO),
      timeout: 5000
    });
    
    client.setID(parseInt(pilona.UNIT_ID));
    
    // Obtener dirección del coil
    let address;
    if (pilona.TIPO_DISPOSITIVO === 'LOGO' && pilona.LOGO_CONFIG) {
      // Lógica para LOGO
      const config = typeof pilona.LOGO_CONFIG === 'string' ? 
        JSON.parse(pilona.LOGO_CONFIG) : pilona.LOGO_CONFIG;
      
      // Buscar la dirección según la función
      Object.entries(config).forEach(([seccion, elementos]) => {
        Object.entries(elementos || {}).forEach(([key, value]) => {
          if (value.funcion === coilType) {
            address = value.direccion;
          }
        });
      });
    } else {
      // Lógica para Modbus genérico
      const coilMapping = {
        'subir': pilona.COIL_SUBIR,
        'bajar': pilona.COIL_BAJAR,
        'estado': pilona.COIL_ESTADO,
        'bloqueo': pilona.COIL_BLOQUEO,
        'puntual': pilona.COIL_PUNTUAL || pilona.COIL_BAJAR
      };
      address = parseInt(coilMapping[coilType]);
    }
    
    // Escribir el coil
    await client.writeCoil(address, value);
    
    // Cerrar conexión
    client.close();
    
    // Reanudar monitoreo si la pilona tenía ID
    if (pilona.ID) {
      setTimeout(() => reanudarMonitoreoPilona(pilona.ID), 2000); // Reanudar después de 2 segundos
    }
    
    res.json({ success: true, message: `Coil ${coilType} escrito correctamente` });
  } catch (error) {
    console.error('Error escribiendo coil:', error);
    // Reanudar monitoreo en caso de error
    if (req.body.pilona && req.body.pilona.ID) {
      reanudarMonitoreoPilona(req.body.pilona.ID);
    }
    res.json({ success: false, message: error.message });
  }
});

// Rutas simplificadas para los botones de control LOGO
router.post('/test/read-coil', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    const { ip, puerto, unitId, direccion, tipoDispositivo } = req.body;
    
    console.log(`Leyendo coil en dirección ${direccion} desde ${ip}`);
    
    const ModbusRTU = require('modbus-serial');
    const client = new ModbusRTU();
    
    // Conectar
    await client.connectTCP(ip, { 
      port: parseInt(puerto) || 502,
      timeout: 5000
    });
    
    client.setID(parseInt(unitId) || 1);
    
    // Leer el coil
    const result = await client.readCoils(parseInt(direccion), 1);
    const valor = result.data[0];
    
    // Cerrar conexión
    client.close();
    
    res.json({ success: true, valor: valor });
  } catch (error) {
    console.error('Error leyendo coil:', error);
    res.json({ success: false, error: error.message });
  }
});

router.post('/test/write-coil', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    const { ip, puerto, unitId, direccion, valor, tipoDispositivo } = req.body;
    
    console.log(`Escribiendo ${valor} en coil dirección ${direccion} en ${ip}`);
    
    const ModbusRTU = require('modbus-serial');
    const client = new ModbusRTU();
    
    // Conectar
    await client.connectTCP(ip, { 
      port: parseInt(puerto) || 502,
      timeout: 5000
    });
    
    client.setID(parseInt(unitId) || 1);
    
    // Escribir el coil
    await client.writeCoil(parseInt(direccion), valor === 1 || valor === true);
    
    // Cerrar conexión
    client.close();
    
    res.json({ success: true, message: 'Valor escrito correctamente' });
  } catch (error) {
    console.error('Error escribiendo coil:', error);
    res.json({ success: false, error: error.message });
  }
});

// Rutas para gestión de zonas
router.get('/zonas/todas', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    const zonas = await dbManager.getZonas();
    res.json(zonas);
  } catch (error) {
    console.error('Error obteniendo zonas:', error);
    res.status(500).json({ error: 'Error del servidor al obtener zonas' });
  }
});

router.get('/:id/zonas', requireAuth, async (req, res) => {
  try {
    const zonas = await dbManager.getZonasByPilona(req.params.id);
    res.json(zonas);
  } catch (error) {
    console.error('Error obteniendo zonas de pilona:', error);
    res.status(500).json({ error: 'Error del servidor al obtener zonas de pilona' });
  }
});

router.post('/:id/zonas/:zonaId', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    await dbManager.asignarPilonaZona(req.params.id, req.params.zonaId);
    res.json({ mensaje: 'Pilona asignada a zona correctamente' });
  } catch (error) {
    console.error('Error asignando pilona a zona:', error);
    res.status(500).json({ error: 'Error del servidor al asignar pilona a zona' });
  }
});

router.delete('/:id/zonas/:zonaId', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    await dbManager.eliminarPilonaZona(req.params.id, req.params.zonaId);
    res.json({ mensaje: 'Pilona eliminada de zona correctamente' });
  } catch (error) {
    console.error('Error eliminando pilona de zona:', error);
    res.status(500).json({ error: 'Error del servidor al eliminar pilona de zona' });
  }
});

module.exports = {
  router,
  actualizarEstadoPilona
};
