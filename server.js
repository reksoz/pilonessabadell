// server.js - Servidor principal mejorado para sistema de control de pilonas (versión SQLite)
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const bodyParser = require('body-parser');
const session = require('express-session');
const bcrypt = require('bcrypt'); // Solo para crear usuarios iniciales en BD
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Cargar módulos personalizados mejorados
const dbManager = require('./db-manager');
const authRoutes = require('./auth-routes');
const { requireAuth, checkRole } = require('./auth-middleware');
// Usar sistema optimizado de monitoreo
console.log('\n=== USANDO SISTEMA DE MONITOREO OPTIMIZADO ===\n');
const modbusControllers = require('./modbus-controllers');
const pilonaRoutes = require('./pilona-routes');
const zonaRoutes = require('./zona-routes');
const usuarioRoutes = require('./usuario-routes');
const calendarioRoutes = require('./calendario/calendario-routes');
const calendarioDB = require('./calendario/calendario-db');
const calendarioScheduler = require('./calendario/calendario-scheduler');

// Inicialización de la aplicación
const app = express();

// Configuración del servidor HTTP
let server;
const PORT = process.env.PORT || 9008; // Puerto 9008 por defecto

// Usar siempre HTTP sin certificados
server = http.createServer(app);
console.log('Servidor HTTP configurado en puerto ' + PORT);

const io = socketIo(server);

// Hacer accesible io en los controladores
global.io = io;

// Configuración de seguridad básica
app.use(helmet({
  contentSecurityPolicy: false // Desactivar CSP para simplificar
}));

// Limitar peticiones para prevenir ataques de fuerza bruta
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200 // límite aumentado a 200 peticiones por ventana (antes era 100)
});
app.use('/api/', limiter);

// Rate limiter más permisivo para rutas de solo lectura
const readOnlyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 500, // límite de 500 peticiones para rutas de solo lectura
  message: 'Demasiadas peticiones. Por favor, espere unos minutos.'
});

// Aplicar rate limiter más permisivo a rutas de solo lectura
app.use('/api/pilonas/todas', readOnlyLimiter);
app.use('/api/zonas', readOnlyLimiter);
app.use('/api/usuarios', readOnlyLimiter);

// Configuración de la sesión - DEBE IR ANTES DE LAS RUTAS
app.use(session({
  secret: 'sistema_pilonas_secreto',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // Siempre false para HTTP
    httpOnly: true,
    maxAge: 3600000 // 1 hora
  }
}));

// Parsear solicitudes
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware de depuración
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  console.log('Sesión ID:', req.sessionID);
  console.log('Usuario en sesión:', req.session.usuario ? req.session.usuario.EMAIL : 'Sin sesión');
  next();
});

// Ruta específica para la raíz - DEBE ir ANTES de express.static
app.get('/', (req, res) => {
  console.log('=== Acceso a la raíz / ===');
  console.log('Sesión completa:', req.session);
  
  if (!req.session || !req.session.usuario) {
    console.log('Sin sesión válida, redirigiendo a /login.html');
    return res.redirect('/login.html');
  } else {
    console.log('Con sesión válida, sirviendo index.html');
    return res.sendFile(path.join(__dirname, 'public', 'index.html'));
  }
});

// Middleware para proteger index.html específicamente
app.get('/index.html', (req, res, next) => {
  console.log('=== Acceso directo a /index.html ===');
  if (!req.session || !req.session.usuario) {
    console.log('Sin sesión, redirigiendo a /login.html');
    return res.redirect('/login.html');
  }
  console.log('Con sesión, permitiendo acceso');
  next();
});

// AHORA servir archivos estáticos
// Esto permite acceder a login.html y recursos sin autenticación
app.use(express.static(path.join(__dirname, 'public')));

// Middleware adicional para verificar que todo esté funcionando
app.use((req, res, next) => {
  console.log(`Después de static - Path: ${req.path}`);
  next();
});

// Inicializar estructura de zonas en la base de datos
async function initZonas() {
  try {
    await dbManager.initZonas();
    console.log('Esquema de zonas inicializado correctamente');
  } catch (error) {
    console.error('Error inicializando esquema de zonas:', error);
    throw error;
  }
}

// Migrar estructura de pilonas para soportar puertos independientes
async function migrarEstructuraPilonas(db) {
  try {
    console.log('Verificando si es necesario migrar estructura de pilonas...');
    
    // Verificar si las columnas de puertos independientes ya existen
    const tableInfo = await db.all("PRAGMA table_info(PILONAS)");
    const columnNames = tableInfo.map(col => col.name);
    
    const columnasNecesarias = [
      'PUERTO_COIL_SUBIR',
      'PUERTO_COIL_BAJAR', 
      'PUERTO_COIL_ESTADO',
      'PUERTO_COIL_BLOQUEO',
      'PUERTO_COIL_PUNTUAL',
      'UNIT_ID_COIL_SUBIR',
      'UNIT_ID_COIL_BAJAR',
      'UNIT_ID_COIL_ESTADO', 
      'UNIT_ID_COIL_BLOQUEO',
      'UNIT_ID_COIL_PUNTUAL'
    ];
    
    const columnasFaltantes = columnasNecesarias.filter(col => !columnNames.includes(col));
    
    if (columnasFaltantes.length > 0) {
      console.log(`Añadiendo ${columnasFaltantes.length} columnas faltantes a la tabla PILONAS...`);
      
      for (const columna of columnasFaltantes) {
        try {
          await db.run(`ALTER TABLE PILONAS ADD COLUMN ${columna} INTEGER`);
          console.log(`Columna ${columna} añadida correctamente`);
        } catch (error) {
          if (!error.message.includes('duplicate column name')) {
            console.error(`Error añadiendo columna ${columna}:`, error);
          }
        }
      }
      
      console.log('Migración de estructura de pilonas completada');
    } else {
      console.log('Estructura de pilonas ya está actualizada');
    }
  } catch (error) {
    console.error('Error migrando estructura de pilonas:', error);
    // No lanzar error para no interrumpir la inicialización
  }
}

// Inicialización de la base de datos
// Inicialización de la base de datos
async function initDatabase() {
  try {
    console.log('Iniciando inicialización de la base de datos...');
    const db = await dbManager.getDatabase();
    
    // Primero verificar qué tabla tiene datos
    let tablaUsuarios = 'USUARIOS';
    try {
      const countUsuarios = await dbManager.get('SELECT COUNT(*) as count FROM USUARIOS');
      const countBackup = await dbManager.get('SELECT COUNT(*) as count FROM USUARIOS_BACKUP');
      
      console.log(`Registros en USUARIOS: ${countUsuarios ? countUsuarios.count : 0}`);
      console.log(`Registros en USUARIOS_BACKUP: ${countBackup ? countBackup.count : 0}`);
      
      // Si USUARIOS_BACKUP tiene datos y USUARIOS no, usar USUARIOS_BACKUP
      if (countBackup && countBackup.count > 0 && (!countUsuarios || countUsuarios.count === 0)) {
        console.log('Migrando datos de USUARIOS_BACKUP a USUARIOS...');
        // Copiar datos de USUARIOS_BACKUP a USUARIOS
        await db.exec(`
          INSERT OR IGNORE INTO USUARIOS 
          SELECT * FROM USUARIOS_BACKUP
        `);
        console.log('Datos migrados correctamente');
      }
    } catch (e) {
      console.log('Creando tablas de usuarios por primera vez...');
    }
    
    // Crear tabla de usuarios
    await db.exec(`
      CREATE TABLE IF NOT EXISTS USUARIOS (
        ID INTEGER PRIMARY KEY AUTOINCREMENT,
        NOMBRE TEXT NOT NULL,
        EMAIL TEXT NOT NULL UNIQUE,
        PASSWORD TEXT NOT NULL,
        ROL TEXT NOT NULL,
        FECHA_INICIO TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FECHA_FINAL TIMESTAMP,
        ACTIVO INTEGER DEFAULT 1 NOT NULL,
        RESET_TOKEN TEXT,
        RESET_TOKEN_EXPIRA TIMESTAMP,
        MATRICULA TEXT,
        DNI TEXT,
        TELEFONO TEXT,
        DIRECCION TEXT,
        TIPO_ACCESO TEXT,
        COMENTARIOS TEXT,
        FECHA_RENOVACION TIMESTAMP
      )
    `);
    
    // Crear tabla de respaldo de usuarios (para compatibilidad con la estructura existente)
    await db.exec(`
      CREATE TABLE IF NOT EXISTS USUARIOS_BACKUP (
        ID INTEGER PRIMARY KEY AUTOINCREMENT,
        NOMBRE TEXT NOT NULL,
        EMAIL TEXT NOT NULL UNIQUE,
        PASSWORD TEXT NOT NULL,
        ROL TEXT NOT NULL,
        FECHA_INICIO TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        FECHA_FINAL TIMESTAMP,
        ACTIVO INTEGER DEFAULT 1 NOT NULL,
        RESET_TOKEN TEXT,
        RESET_TOKEN_EXPIRA TIMESTAMP,
        MATRICULA TEXT,
        DNI TEXT,
        TELEFONO TEXT,
        DIRECCION TEXT,
        TIPO_ACCESO TEXT,
        COMENTARIOS TEXT,
        FECHA_RENOVACION TIMESTAMP
      )
    `)
    
    // Crear tabla de pilonas con soporte para puertos independientes por coil
    await db.exec(`
      CREATE TABLE IF NOT EXISTS PILONAS (
        ID INTEGER PRIMARY KEY AUTOINCREMENT,
        NOMBRE TEXT NOT NULL,
        DIRECCION_IP TEXT NOT NULL,
        PUERTO INTEGER DEFAULT 502 NOT NULL,
        UNIT_ID INTEGER DEFAULT 1 NOT NULL,
        COIL_SUBIR INTEGER NOT NULL,
        COIL_BAJAR INTEGER NOT NULL,
        COIL_ESTADO INTEGER NOT NULL,
        COIL_BLOQUEO INTEGER NOT NULL,
        COIL_PUNTUAL INTEGER,
        -- Puertos independientes para cada coil (opcional, usar puerto por defecto si es NULL)
        PUERTO_COIL_SUBIR INTEGER,
        PUERTO_COIL_BAJAR INTEGER,
        PUERTO_COIL_ESTADO INTEGER,
        PUERTO_COIL_BLOQUEO INTEGER,
        PUERTO_COIL_PUNTUAL INTEGER,
        -- Unit IDs independientes para cada coil (opcional, usar unit_id por defecto si es NULL)
        UNIT_ID_COIL_SUBIR INTEGER,
        UNIT_ID_COIL_BAJAR INTEGER,
        UNIT_ID_COIL_ESTADO INTEGER,
        UNIT_ID_COIL_BLOQUEO INTEGER,
        UNIT_ID_COIL_PUNTUAL INTEGER,
        LATITUD REAL,
        LONGITUD REAL,
        ESTADO TEXT DEFAULT 'error' NOT NULL
      )
    `);
    
    // Crear tabla de auditoría
    await db.exec(`
      CREATE TABLE IF NOT EXISTS AUDITORIA (
        ID INTEGER PRIMARY KEY AUTOINCREMENT,
        USUARIO_ID INTEGER,
        ACCION TEXT NOT NULL,
        PILONA_ID INTEGER,
        FECHA TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        IP TEXT,
        FOREIGN KEY (USUARIO_ID) REFERENCES USUARIOS(ID) ON DELETE SET NULL,
        FOREIGN KEY (PILONA_ID) REFERENCES PILONAS(ID) ON DELETE SET NULL
      )
    `);
    
    // Crear índices
    await db.exec(`
      CREATE INDEX IF NOT EXISTS IDX_AUDITORIA_FECHA ON AUDITORIA(FECHA);
      CREATE INDEX IF NOT EXISTS IDX_AUDITORIA_USUARIO ON AUDITORIA(USUARIO_ID);
      CREATE INDEX IF NOT EXISTS IDX_AUDITORIA_PILONA ON AUDITORIA(PILONA_ID);
    `);
    
    // Inicializar estructura de zonas
    await initZonas();
  
  // Inicializar estructura de calendario
  await calendarioDB.initCalendario();
    
    // Migrar estructura de pilonas para soporte de puertos independientes
    await migrarEstructuraPilonas(db);
    
    // Primero eliminar cualquier usuario administrador duplicado excepto admin@pilonas.com
    await dbManager.run(
      `DELETE FROM USUARIOS 
       WHERE EMAIL != 'admin@pilonas.com' 
       AND ROL = 'administrador' 
       AND EMAIL LIKE '%admin%'`
    );
    
    // Verificar si existe el usuario administrador solicitado (admin@pilonas.com)
    const adminPilonasExiste = await dbManager.get('SELECT COUNT(*) as count FROM USUARIOS WHERE EMAIL = ?', ['admin@pilonas.com']);
    
    // Crear o actualizar usuario administrador principal
    const hashedPassword = await bcrypt.hash('1234', 10);
    
    if (adminPilonasExiste.count === 0) {
      await dbManager.run(
        `INSERT INTO USUARIOS (NOMBRE, EMAIL, PASSWORD, ROL, FECHA_INICIO, ACTIVO)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
        ['Administrador', 'admin@pilonas.com', hashedPassword, 'administrador', 1]
      );
      
      console.log('Usuario administrador creado:');
      console.log('  Email: admin@pilonas.com');
      console.log('  Contraseña: 1234');
    } else {
      // Si el usuario existe, asegurar que tiene la contraseña correcta y está activo
      await dbManager.run(
        `UPDATE USUARIOS 
         SET PASSWORD = ?, ROL = 'administrador', ACTIVO = 1, NOMBRE = 'Administrador'
         WHERE EMAIL = ?`,
        [hashedPassword, 'admin@pilonas.com']
      );
      
      console.log('Usuario administrador actualizado:');
      console.log('  Email: admin@pilonas.com');
      console.log('  Contraseña: 1234');
    }
    
    // Verificar si existen pilonas
    const pilonasCount = await dbManager.get('SELECT COUNT(*) as count FROM PILONAS');
    
    // Crear pilonas de ejemplo si no existen
    if (pilonasCount.count === 0) {
      // Definir 5 pilonas con ubicaciones en Barcelona (ejemplo)
      const pilonasEjemplo = [
        {
          nombre: 'Pilona Acceso Principal',
          direccionIP: '192.168.1.101',
          puerto: 502,
          unitId: 1,
          coilSubir: 0,
          coilBajar: 1,
          coilEstado: 2,
          coilBloqueo: 3,
          coilPuntual: 4,  // Añadido coilPuntual
          latitud: 41.387306,
          longitud: 2.169843,
          estado: 'subida'
        },
        {
          nombre: 'Pilona Acceso Secundario',
          direccionIP: '192.168.1.102',
          puerto: 502,
          unitId: 2,
          coilSubir: 10,
          coilBajar: 11,
          coilEstado: 12,
          coilBloqueo: 13,
          coilPuntual: 14,  // Añadido coilPuntual
          latitud: 41.403706,
          longitud: 2.174210,
          estado: 'bajada'
        },
        {
          nombre: 'Pilona Zona Peatonal',
          direccionIP: '192.168.1.103',
          puerto: 502,
          unitId: 3,
          coilSubir: 20,
          coilBajar: 21,
          coilEstado: 22,
          coilBloqueo: 23,
          coilPuntual: 21,  // Mismo que coilBajar
          latitud: 41.380896,
          longitud: 2.122861,
          estado: 'subida'
        },
        {
          nombre: 'Pilona Acceso Parking',
          direccionIP: '192.168.1.104',
          puerto: 502,
          unitId: 4,
          coilSubir: 30,
          coilBajar: 31,
          coilEstado: 32,
          coilBloqueo: 33,
          coilPuntual: 31,  // Mismo que coilBajar
          latitud: 41.393460,
          longitud: 2.164474,
          estado: 'bajada'
        },
        {
          nombre: 'Pilona Zona Comercial',
          direccionIP: '192.168.1.105',
          puerto: 502,
          unitId: 5,
          coilSubir: 40,
          coilBajar: 41,
          coilEstado: 42,
          coilBloqueo: 43,
          coilPuntual: 44,  // Añadido coilPuntual
          latitud: 41.385063,
          longitud: 2.173404,
          estado: 'bloqueada_arriba'
        }
      ];
      
      // Insertar las pilonas de ejemplo
      for (const pilona of pilonasEjemplo) {
        await dbManager.run(
          `INSERT INTO PILONAS (
            NOMBRE, DIRECCION_IP, PUERTO, UNIT_ID, 
            COIL_SUBIR, COIL_BAJAR, COIL_ESTADO, COIL_BLOQUEO, COIL_PUNTUAL,
            LATITUD, LONGITUD, ESTADO
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            pilona.nombre,
            pilona.direccionIP,
            pilona.puerto,
            pilona.unitId,
            pilona.coilSubir,
            pilona.coilBajar,
            pilona.coilEstado,
            pilona.coilBloqueo,
            pilona.coilPuntual,
            pilona.latitud,
            pilona.longitud,
            pilona.estado
          ]
        );
      }
      
      console.log('5 pilonas de ejemplo creadas correctamente');
      
      // Asignar pilonas a zonas
      await db.exec(`
        INSERT OR IGNORE INTO PILONA_ZONA (PILONA_ID, ZONA_ID) VALUES 
        (1, 1), -- Pilona Acceso Principal a Zona Centro
        (2, 2), -- Pilona Acceso Secundario a Zona Norte
        (3, 3), -- Pilona Zona Peatonal a Zona Comercial
        (4, 4), -- Pilona Acceso Parking a Zona Residencial
        (5, 3); -- Pilona Zona Comercial a Zona Comercial
      `);
      
      // Crear un usuario cliente de ejemplo con permisos
      const clientePassword = await bcrypt.hash('cliente123', 10);
      
      const clienteResult = await dbManager.run(
        `INSERT INTO USUARIOS (NOMBRE, EMAIL, PASSWORD, ROL, FECHA_INICIO, ACTIVO)
         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
        ['Cliente Ejemplo', 'cliente@sistema-pilonas.com', clientePassword, 'cliente', 1]
      );
      
      // Asignar permisos al cliente para algunas zonas
      await db.exec(`
        INSERT INTO USUARIO_ZONA (USUARIO_ID, ZONA_ID, PERMISOS) VALUES 
        (${clienteResult.lastID}, 1, 'bajar'),
        (${clienteResult.lastID}, 3, 'bajar');
      `);
      
      console.log('Usuario cliente de ejemplo creado:');
      console.log('  Email: cliente@sistema-pilonas.com');
      console.log('  Contraseña: cliente123');
      console.log('  Permisos: Zona Centro y Zona Comercial (bajar)');
    }
    
    console.log('Base de datos inicializada correctamente');
    return true;
  } catch (error) {
    console.error('Error al inicializar la base de datos:', error);
    throw error;
  }
}

// ===== Rutas de autenticación =====
// Usar rutas de autenticación desde el módulo separado
app.use('/api/auth', authRoutes);

// ===== Rutas de usuarios =====
// Todas las rutas de usuarios se manejan desde usuario-routes.js
// No definir rutas duplicadas aquí


// ===== Rutas de auditoría =====

app.get('/api/auditoria', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    const { fechaInicio, fechaFin, usuario: usuarioId } = req.query;
    const pagina = parseInt(req.query.pagina) || 1;
    const porPagina = parseInt(req.query.porPagina) || 20;
    
    let query = `
      SELECT 
        a.ID, 
        a.ACCION, 
        a.FECHA, 
        a.IP,
        u.ID as USUARIO_ID, 
        u.NOMBRE as USUARIO_NOMBRE, 
        u.EMAIL as USUARIO_EMAIL,
        p.ID as PILONA_ID, 
        p.NOMBRE as PILONA_NOMBRE
      FROM AUDITORIA a
      LEFT JOIN USUARIOS u ON a.USUARIO_ID = u.ID
      LEFT JOIN PILONAS p ON a.PILONA_ID = p.ID
      WHERE 1=1
    `;
    
    const params = [];
    
    if (fechaInicio) {
      query += ' AND a.FECHA >= ?';
      params.push(fechaInicio);
    }
    
    if (fechaFin) {
      query += ' AND a.FECHA <= ?';
      const fechaFinAjustada = new Date(fechaFin);
      fechaFinAjustada.setHours(23, 59, 59, 999);
      params.push(fechaFinAjustada.toISOString());
    }
    
    if (usuarioId) {
      query += ' AND a.USUARIO_ID = ?';
      params.push(usuarioId);
    }
    
    // Contar total de registros para paginación
    const countQuery = `SELECT COUNT(*) as total FROM AUDITORIA a WHERE 1=1`;
    let countParams = [];
    
    if (fechaInicio) countParams.push(fechaInicio);
    if (fechaFin) {
      const fechaFinAjustada = new Date(fechaFin);
      fechaFinAjustada.setHours(23, 59, 59, 999);
      countParams.push(fechaFinAjustada.toISOString());
    }
    if (usuarioId) countParams.push(usuarioId);
    
    const countResult = await dbManager.get(countQuery, countParams);
    const total = countResult ? countResult.total : 0;
    
    // Agregar ordenación y paginación
    query += ' ORDER BY a.FECHA DESC LIMIT ? OFFSET ?';
    params.push(porPagina, (pagina - 1) * porPagina);
    
    const registros = await dbManager.query(query, params);
    
    // Formatear los datos para la respuesta
    const registrosFormateados = registros.map(registro => ({
      ID: registro.ID,
      ACCION: registro.ACCION,
      FECHA: registro.FECHA,
      IP: registro.IP,
      USUARIO: registro.USUARIO_ID ? {
        ID: registro.USUARIO_ID,
        NOMBRE: registro.USUARIO_NOMBRE,
        EMAIL: registro.USUARIO_EMAIL
      } : null,
      PILONA: registro.PILONA_ID ? {
        ID: registro.PILONA_ID,
        NOMBRE: registro.PILONA_NOMBRE
      } : null
    }));
    
    res.json({
      registros: registrosFormateados || [], // Asegurar que siempre sea un array
      total,
      pagina,
      porPagina
    });
  } catch (error) {
    console.error('Error obteniendo auditoría:', error);
    res.status(500).json({ 
      error: 'Error del servidor al obtener registros de auditoría',
      registros: [],
      total: 0
    });
  }
});

// Endpoint para exportar registros de auditoría a CSV
app.get('/api/auditoria/exportar', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    const { fechaInicio, fechaFin, usuario: usuarioId } = req.query;
    
    let query = `
      SELECT 
        a.ID, 
        a.ACCION, 
        a.FECHA, 
        a.IP,
        u.NOMBRE as USUARIO_NOMBRE, 
        u.EMAIL as USUARIO_EMAIL,
        p.NOMBRE as PILONA_NOMBRE
      FROM AUDITORIA a
      LEFT JOIN USUARIOS u ON a.USUARIO_ID = u.ID
      LEFT JOIN PILONAS p ON a.PILONA_ID = p.ID
      WHERE 1=1
    `;
    
    const params = [];
    
    if (fechaInicio) {
      query += ' AND a.FECHA >= ?';
      params.push(fechaInicio);
    }
    
    if (fechaFin) {
      query += ' AND a.FECHA <= ?';
      const fechaFinAjustada = new Date(fechaFin);
      fechaFinAjustada.setHours(23, 59, 59, 999);
      params.push(fechaFinAjustada.toISOString());
    }
    
    if (usuarioId) {
      query += ' AND a.USUARIO_ID = ?';
      params.push(usuarioId);
    }
    
    // Ordenar por fecha descendente
    query += ' ORDER BY a.FECHA DESC';
    
    const registros = await dbManager.query(query, params);
    
    // Generar CSV
    let csv = 'ID,Fecha,Usuario,Email,Acción,Pilona,IP\n';
    
    registros.forEach(registro => {
      const fecha = registro.FECHA || '';
      const usuario = registro.USUARIO_NOMBRE || 'Sistema';
      const email = registro.USUARIO_EMAIL || '';
      const accion = registro.ACCION || '';
      const pilona = registro.PILONA_NOMBRE || '';
      const ip = registro.IP || '';
      
      // Escapar comillas en los campos
      const escapar = (campo) => {
        if (typeof campo !== 'string') return campo;
        if (campo.includes(',') || campo.includes('"') || campo.includes('\n')) {
          return `"${campo.replace(/"/g, '""')}"`;
        }
        return campo;
      };
      
      csv += `${registro.ID},${escapar(fecha)},${escapar(usuario)},${escapar(email)},${escapar(accion)},${escapar(pilona)},${escapar(ip)}\n`;
    });
    
    // Enviar CSV como descarga
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=auditoria-${new Date().toISOString().slice(0, 10)}.csv`);
    res.send(csv);
  } catch (error) {
    console.error('Error exportando auditoría:', error);
    res.status(500).json({ error: 'Error del servidor' });
  }
});

// ===== Rutas de pilonas =====

// Endpoint adicional para obtener todas las pilonas (para administradores)
// IMPORTANTE: Esta ruta debe estar ANTES del router general de pilonas
app.get('/api/pilonas/todas', requireAuth, checkRole(['administrador']), async (req, res) => {
  try {
    console.log('Obteniendo todas las pilonas para calendario...');
    const pilonas = await dbManager.getPilonas(); // Obtener todas sin filtrar por permisos
    console.log(`Se encontraron ${pilonas.length} pilonas`);
    res.json(pilonas);
  } catch (error) {
    console.error('Error obteniendo todas las pilonas:', error);
    res.status(500).json({ error: 'Error del servidor al obtener pilonas' });
  }
});

// Endpoint para obtener el estado de todos los coils en tiempo real
app.get('/api/pilonas/coils/estados', requireAuth, async (req, res) => {
  try {
    const estados = modbusControllers.obtenerTodosLosEstados();
    res.json({
      monitoreoContinuo: true,
      estados: estados
    });
  } catch (error) {
    console.error('Error obteniendo estados de coils:', error);
    res.status(500).json({ error: 'Error del servidor al obtener estados de coils' });
  }
});

// Usar rutas de pilonas desde el módulo mejorado
app.use('/api/pilonas', pilonaRoutes.router);

// ===== Rutas de zonas =====

// Usar rutas de zonas
app.use('/api/zonas', zonaRoutes);

// ===== Rutas de usuarios =====

// Usar rutas de usuarios
app.use('/api/usuarios', usuarioRoutes);

// Usar rutas de calendario
app.use('/api/calendario', calendarioRoutes);

// ===== Gestión de WebSockets =====

// Configuración de Socket.IO
io.use(async (socket, next) => {
  // Middleware para autenticación de sockets
  const sessionID = socket.handshake.query.sessionID;
  
  if (!sessionID) {
    return next(new Error('No autorizado'));
  }
  
  try {
    // Aquí idealmente verificaríamos la sesión en la base de datos
    // Simplemente aceptamos la conexión por ahora
    socket.handshake.time = new Date();
    next();
  } catch (error) {
    console.error('Error en autenticación de socket:', error);
    next(new Error('Error de autenticación'));
  }
});

io.on('connection', socket => {
  console.log('Cliente conectado:', socket.id);
  
  // Establecer usuario del socket (cuando se autentique)
  socket.on('autenticar', (usuario) => {
    socket.usuario = usuario;
    console.log(`Usuario autenticado en socket: ${usuario.NOMBRE || 'Usuario'}`);
  });
  
  // Eventos para pausar/reanudar monitorización por IP
  socket.on('pausar-monitorizacion-pilona', async (data) => {
    const { ip } = data;
    if (ip) {
      console.log(`Solicitud de pausar monitorización para IP: ${ip}`);
      const count = await modbusControllers.pausarMonitoreoPilonaPorIP(ip, dbManager);
      socket.emit('monitorizacion-pausada', { ip, count });
    }
  });
  
  socket.on('reanudar-monitorizacion-pilona', async (data) => {
    const { ip } = data;
    if (ip) {
      console.log(`Solicitud de reanudar monitorización para IP: ${ip}`);
      const count = await modbusControllers.reanudarMonitoreoPilonaPorIP(ip, dbManager);
      socket.emit('monitorizacion-reanudada', { ip, count });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// ===== Monitoreo continuo de estados =====

// El monitoreo continuo ahora se maneja desde modbus-controllers.js
// con el sistema ContinuousMonitor que lee todos los coils secuencialmente

// ===== Iniciar servidor =====

// Iniciar el servidor después de conectar a la base de datos
async function iniciarServidor() {
  try {
    // Inicializar la base de datos
    await initDatabase();
    
    // Iniciar el scheduler del calendario
    calendarioScheduler.init(io);
    
    // Iniciar el servidor HTTP
    server.listen(PORT, () => {
      console.log(`Servidor escuchando en puerto ${PORT}`);
      
      // Iniciar monitoreo continuo de todos los coils
      console.log('Iniciando monitoreo continuo de coils...');
      modbusControllers.iniciarMonitoreoContinuo(dbManager, io);
      
      // Monitor optimizado iniciado correctamente
    });
  } catch (error) {
    console.error('Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Manejar cierre limpio del servidor
process.on('SIGINT', async () => {
  console.log('Cerrando servidor...');
  
  // Detener monitoreo continuo y cerrar conexiones Modbus
  await modbusControllers.cerrarConexiones();
  
  // Cerrar conexión a la base de datos
  await dbManager.close();
  
  console.log('Conexiones cerradas correctamente');
  process.exit(0);
});

// Iniciar el servidor
iniciarServidor();