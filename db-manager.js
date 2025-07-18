// db-manager.js - Gestor mejorado de conexiones a SQLite para el sistema de pilonas (con soporte para zonas)
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');
const path = require('path');

class DatabaseManager {
  constructor() {
    // Ruta a la base de datos SQLite
    this.dbPath = path.join(__dirname, 'pilona.db');
    this.db = null;
    this.isConnected = false;
    this.connectionPromise = null;
  }

  // Conectar a la base de datos
  async connect() {
    // Si ya hay una conexión activa, devolverla
    if (this.isConnected && this.db) {
      return this.db;
    }

    // Si hay una conexión en progreso, esperar a que termine
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    // Crear nueva promesa de conexión
    console.log('Conectando a la base de datos SQLite...');
    this.connectionPromise = new Promise(async (resolve, reject) => {
      try {
        this.db = await open({
          filename: this.dbPath,
          driver: sqlite3.Database
        });
        
        // Habilitar claves foráneas
        await this.db.run('PRAGMA foreign_keys = ON');
        
        // Verificar que las claves foráneas están habilitadas
        const fkStatus = await this.db.get('PRAGMA foreign_keys');
        if (fkStatus.foreign_keys === 1) {
          console.log('✅ Claves foráneas habilitadas correctamente');
        } else {
          console.warn('⚠️  ADVERTENCIA: Las claves foráneas NO están habilitadas');
        }
        
        this.isConnected = true;
        console.log('Conexión a SQLite establecida correctamente');
        resolve(this.db);
      } catch (error) {
        this.isConnected = false;
        this.db = null;
        console.error('Error al conectar con SQLite:', error);
        reject(error);
      } finally {
        this.connectionPromise = null;
      }
    });

    return this.connectionPromise;
  }

  // Inicializar estructura de zonas
  async initZonas() {
    const db = await this.connect();
    
    try {
      // Crear la tabla de zonas
      await db.exec(`
        CREATE TABLE IF NOT EXISTS ZONAS (
          ID INTEGER PRIMARY KEY AUTOINCREMENT,
          NOMBRE TEXT NOT NULL,
          DESCRIPCION TEXT,
          CREATED_AT TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Crear la tabla de relación entre pilonas y zonas
      await db.exec(`
        CREATE TABLE IF NOT EXISTS PILONA_ZONA (
          PILONA_ID INTEGER NOT NULL,
          ZONA_ID INTEGER NOT NULL,
          PRIMARY KEY (PILONA_ID, ZONA_ID),
          FOREIGN KEY (PILONA_ID) REFERENCES PILONAS(ID) ON DELETE CASCADE,
          FOREIGN KEY (ZONA_ID) REFERENCES ZONAS(ID) ON DELETE CASCADE
        )
      `);
      
      // Crear la tabla de permisos de acceso de usuario a zonas
      await db.exec(`
        CREATE TABLE IF NOT EXISTS USUARIO_ZONA (
          USUARIO_ID INTEGER NOT NULL,
          ZONA_ID INTEGER NOT NULL,
          PERMISOS TEXT DEFAULT 'bajar',
          PRIMARY KEY (USUARIO_ID, ZONA_ID),
          FOREIGN KEY (USUARIO_ID) REFERENCES USUARIOS(ID) ON DELETE CASCADE,
          FOREIGN KEY (ZONA_ID) REFERENCES ZONAS(ID) ON DELETE CASCADE
        )
      `);
      
      // Crear índices para mejorar rendimiento
      await db.exec(`CREATE INDEX IF NOT EXISTS IDX_PILONA_ZONA_PILONA ON PILONA_ZONA(PILONA_ID)`);
      await db.exec(`CREATE INDEX IF NOT EXISTS IDX_PILONA_ZONA_ZONA ON PILONA_ZONA(ZONA_ID)`);
      await db.exec(`CREATE INDEX IF NOT EXISTS IDX_USUARIO_ZONA_USUARIO ON USUARIO_ZONA(USUARIO_ID)`);
      await db.exec(`CREATE INDEX IF NOT EXISTS IDX_USUARIO_ZONA_ZONA ON USUARIO_ZONA(ZONA_ID)`);
      
      // Verificar si ya existen zonas
      const zonasCount = await this.get('SELECT COUNT(*) as count FROM ZONAS');
      
      // Insertar zonas predeterminadas si no existen
      if (zonasCount.count === 0) {
        await db.exec(`
          INSERT INTO ZONAS (ID, NOMBRE, DESCRIPCION) VALUES 
          (1, 'Zona Centro', 'Zona céntrica de la ciudad'),
          (2, 'Zona Norte', 'Área norte de la ciudad'),
          (3, 'Zona Comercial', 'Distrito comercial'),
          (4, 'Zona Residencial', 'Área residencial')
        `);
        
        console.log('Zonas predeterminadas creadas correctamente');
      }
      
      // Verificar si existen relaciones entre pilonas y zonas
      const pilonasZonasCount = await this.get('SELECT COUNT(*) as count FROM PILONA_ZONA');
      
      // Añadir relaciones iniciales si es necesario y existen pilonas
      if (pilonasZonasCount.count === 0) {
        // Verificar si existen al menos 5 pilonas
        const pilonasCount = await this.get('SELECT COUNT(*) as count FROM PILONAS');
        
        if (pilonasCount.count >= 5) {
          await db.exec(`
            INSERT INTO PILONA_ZONA (PILONA_ID, ZONA_ID) VALUES 
            (1, 1), -- Pilona Acceso Principal a Zona Centro
            (2, 2), -- Pilona Acceso Secundario a Zona Norte
            (3, 3), -- Pilona Zona Peatonal a Zona Comercial
            (4, 4), -- Pilona Acceso Parking a Zona Residencial
            (5, 3)  -- Pilona Zona Comercial a Zona Comercial
          `);
          
          console.log('Relaciones iniciales pilona-zona creadas correctamente');
        }
      }
      
      console.log('Esquema de zonas inicializado correctamente');
    } catch (error) {
      console.error('Error inicializando esquema de zonas:', error);
      throw error;
    }
  }

  // Obtener la conexión a la base de datos
  async getDatabase() {
    return this.connect();
  }
  // Verificar si un usuario tiene permiso para controlar una pilona
async verificarPermisoPilona(usuarioId, pilonaId, accion = 'bajar') {
  // Administradores y operadores siempre tienen permiso para cualquier acción (excepto puntual que es solo para clientes)
  const usuario = await this.get('SELECT ROL FROM USUARIOS WHERE ID = ?', [usuarioId]);
  
  if (accion === 'puntual' && usuario.ROL !== 'cliente') {
    return false; // Solo clientes pueden hacer acciones puntuales
  }
  
  if (usuario && (usuario.ROL === 'administrador' || usuario.ROL === 'operador')) {
    // Operadores no pueden bloquear pilonas
    if (usuario.ROL === 'operador' && (accion.includes('bloquear') || accion === 'desbloquear')) {
      return false;
    }
    return true;
  }
  
  // Para clientes, verificar permisos específicos por zona
  const permiso = await this.get(`
    SELECT uz.PERMISOS
    FROM PILONA_ZONA pz
    JOIN USUARIO_ZONA uz ON pz.ZONA_ID = uz.ZONA_ID
    WHERE pz.PILONA_ID = ? AND uz.USUARIO_ID = ?
    LIMIT 1
  `, [pilonaId, usuarioId]);
  
  if (!permiso) {
    return false;
  }
  
  // Verificar si la acción está permitida
  if ((accion === 'bajar' || accion === 'puntual') && permiso.PERMISOS.includes('bajar')) {
    return true; // La acción puntual usa los mismos permisos que bajar
  }
  
  if (accion === 'subir' && permiso.PERMISOS.includes('subir')) {
    return true;
  }
  
  if (accion.includes('bloquear') && permiso.PERMISOS === 'completo') {
    return true;
  }
  
  return false;
}

  // Ejecutar una consulta con parámetros
  async query(sql, params = []) {
    const db = await this.connect();
    try {
      return await db.all(sql, params);
    } catch (error) {
      console.error(`Error ejecutando consulta: ${sql}`, error);
      throw error;
    }
  }

  // Ejecutar una consulta que devuelve una única fila
  async get(sql, params = []) {
    const db = await this.connect();
    try {
      return await db.get(sql, params);
    } catch (error) {
      console.error(`Error ejecutando get: ${sql}`, error);
      throw error;
    }
  }

  // Ejecutar una consulta que no devuelve resultados
  async run(sql, params = []) {
    const db = await this.connect();
    try {
      return await db.run(sql, params);
    } catch (error) {
      console.error(`Error ejecutando run: ${sql}`, error);
      throw error;
    }
  }

  // Ejecutar múltiples consultas en una transacción
  async transaction(callback) {
    const db = await this.connect();
    try {
      await db.run('BEGIN TRANSACTION');
      const result = await callback(db);
      await db.run('COMMIT');
      return result;
    } catch (error) {
      await db.run('ROLLBACK');
      console.error('Error en transacción:', error);
      throw error;
    }
  }

  // Cerrar la conexión a la base de datos
  async close() {
    if (this.isConnected && this.db) {
      try {
        await this.db.close();
        console.log('Conexión a SQLite cerrada correctamente');
      } catch (error) {
        console.error('Error al cerrar la conexión a SQLite:', error);
      } finally {
        this.isConnected = false;
        this.db = null;
      }
    }
  }

  // ===== Métodos específicos para usuarios =====

  // Crear un nuevo usuario
  async createUser(userData) {
    console.log("Creando nuevo usuario con datos:", userData);
    
    // Validar campos obligatorios
    if (!userData.NOMBRE && !userData.nombre) {
      throw new Error('El nombre es obligatorio');
    }
    
    if (!userData.EMAIL && !userData.email) {
      throw new Error('El email es obligatorio');
    }
    
    if (!userData.PASSWORD && !userData.password) {
      throw new Error('La contraseña es obligatoria');
    }
    
    if (!userData.ROL && !userData.rol) {
      throw new Error('El rol es obligatorio');
    }
    
    // Utilizar campos en formato correcto (preferir MAYÚSCULAS para la DB)
    const nombre = userData.NOMBRE || userData.nombre;
    const email = userData.EMAIL || userData.email;
    const password = userData.PASSWORD || userData.password;
    const rol = userData.ROL || userData.rol;
    const fechaInicio = userData.FECHA_INICIO || userData.fechaInicio || new Date().toISOString();
    const fechaFinal = userData.FECHA_FINAL || userData.fechaFinal || null;
    const activo = userData.ACTIVO !== undefined ? userData.ACTIVO : 
                  (userData.activo !== undefined ? userData.activo : 1);
    
    // Insertar usuario
    try {
      const result = await this.run(
        `INSERT INTO USUARIOS (NOMBRE, EMAIL, PASSWORD, ROL, FECHA_INICIO, FECHA_FINAL, ACTIVO)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [nombre, email, password, rol, fechaInicio, fechaFinal, activo ? 1 : 0]
      );
      
      console.log("Usuario creado con éxito, ID:", result.lastID);
      
      // Devolver el usuario creado
      return await this.getUserById(result.lastID);
    } catch (error) {
      console.error("Error creando usuario:", error);
      throw error;
    }
  }
  
  // Actualizar un usuario existente
  async updateUser(id, userData) {
    console.log(`Actualizando usuario ID ${id} con datos:`, userData);
    
    // Verificar que el usuario exista
    const existingUser = await this.getUserById(id);
    if (!existingUser) {
      throw new Error(`Usuario con ID ${id} no encontrado`);
    }
    
    // Construir conjunto de campos a actualizar
    const updates = [];
    const params = [];
    
    // Evaluar cada campo posible (aceptando tanto mayúsculas como minúsculas)
    if (userData.NOMBRE || userData.nombre) {
      updates.push('NOMBRE = ?');
      params.push(userData.NOMBRE || userData.nombre);
    }
    
    if (userData.EMAIL || userData.email) {
      updates.push('EMAIL = ?');
      params.push(userData.EMAIL || userData.email);
    }
    
    if (userData.PASSWORD || userData.password) {
      updates.push('PASSWORD = ?');
      params.push(userData.PASSWORD || userData.password);
    }
    
    if (userData.ROL || userData.rol) {
      updates.push('ROL = ?');
      params.push(userData.ROL || userData.rol);
    }
    
    if (userData.FECHA_INICIO || userData.fechaInicio) {
      updates.push('FECHA_INICIO = ?');
      params.push(userData.FECHA_INICIO || userData.fechaInicio);
    }
    
    // Fecha final puede ser null
    if (userData.FECHA_FINAL !== undefined || userData.fechaFinal !== undefined) {
      const fechaFinal = userData.FECHA_FINAL || userData.fechaFinal;
      if (fechaFinal === null || fechaFinal === '') {
        updates.push('FECHA_FINAL = NULL');
      } else {
        updates.push('FECHA_FINAL = ?');
        params.push(fechaFinal);
      }
    }
    
    // Activo es booleano o número
    if (userData.ACTIVO !== undefined || userData.activo !== undefined) {
      updates.push('ACTIVO = ?');
      const isActive = userData.ACTIVO !== undefined ? !!userData.ACTIVO : !!userData.activo;
      params.push(isActive ? 1 : 0);
    }
    
    // Si no hay campos para actualizar
    if (updates.length === 0) {
      return existingUser;
    }
    
    // Ejecutar la actualización
    params.push(id); // Para la condición WHERE
    const sql = `UPDATE USUARIOS SET ${updates.join(', ')} WHERE ID = ?`;
    
    try {
      await this.run(sql, params);
      console.log(`Usuario ID ${id} actualizado correctamente`);
      
      // Devolver el usuario actualizado
      return await this.getUserById(id);
    } catch (error) {
      console.error(`Error actualizando usuario ID ${id}:`, error);
      throw error;
    }
  }
  
  // Obtener un usuario por ID
  async getUserById(id) {
    console.log(`Buscando usuario con ID: ${id}`);
    try {
      const user = await this.get('SELECT * FROM USUARIOS WHERE ID = ?', [id]);
      if (user) {
        console.log(`Usuario encontrado:`, {
          ID: user.ID,
          NOMBRE: user.NOMBRE,
          EMAIL: user.EMAIL,
          ROL: user.ROL,
          ACTIVO: user.ACTIVO
        });
      } else {
        console.log(`Usuario con ID ${id} no encontrado`);
      }
      return user;
    } catch (error) {
      console.error(`Error al buscar usuario con ID ${id}:`, error);
      throw error;
    }
  }
  
  // Obtener todos los usuarios
  async getUsers() {
    try {
      return await this.query('SELECT * FROM USUARIOS ORDER BY NOMBRE');
    } catch (error) {
      console.error('Error al obtener usuarios:', error);
      throw error;
    }
  }
  
  // Eliminar un usuario
  async deleteUser(id) {
    try {
      const result = await this.run('DELETE FROM USUARIOS WHERE ID = ?', [id]);
      return result.changes > 0;
    } catch (error) {
      console.error(`Error al eliminar usuario con ID ${id}:`, error);
      throw error;
    }
  }

  // Métodos específicos para pilonas
  
  // Obtener todas las pilonas
  async getPilonas() {
    return this.query('SELECT * FROM PILONAS ORDER BY NOMBRE');
  }

  // Obtener pilonas permitidas para un usuario
  async getPilonasPermitidas(usuarioId) {
    // Si es administrador u operador, devolver todas las pilonas
    const usuario = await this.get('SELECT ROL FROM USUARIOS WHERE ID = ?', [usuarioId]);
    
    if (usuario && (usuario.ROL === 'administrador' || usuario.ROL === 'operador')) {
      return this.getPilonas();
    }
    
    // Para clientes normales, devolver solo las pilonas a las que tienen acceso por zona
    return this.query(`
      SELECT DISTINCT p.* 
      FROM PILONAS p
      JOIN PILONA_ZONA pz ON p.ID = pz.PILONA_ID
      JOIN USUARIO_ZONA uz ON pz.ZONA_ID = uz.ZONA_ID
      WHERE uz.USUARIO_ID = ?
      ORDER BY p.NOMBRE
    `, [usuarioId]);
  }

  // Verificar si un usuario tiene permiso para controlar una pilona
  async verificarPermisoPilona(usuarioId, pilonaId, accion = 'bajar') {
    // Administradores y operadores siempre tienen permiso para cualquier acción
    const usuario = await this.get('SELECT ROL FROM USUARIOS WHERE ID = ?', [usuarioId]);
    
    if (usuario && (usuario.ROL === 'administrador' || usuario.ROL === 'operador')) {
      // Operadores no pueden bloquear pilonas
      if (usuario.ROL === 'operador' && (accion.includes('bloquear') || accion === 'desbloquear')) {
        return false;
      }
      return true;
    }
    
    // Para clientes, verificar permisos específicos por zona
    const permiso = await this.get(`
      SELECT uz.PERMISOS
      FROM PILONA_ZONA pz
      JOIN USUARIO_ZONA uz ON pz.ZONA_ID = uz.ZONA_ID
      WHERE pz.PILONA_ID = ? AND uz.USUARIO_ID = ?
      LIMIT 1
    `, [pilonaId, usuarioId]);
    
    if (!permiso) {
      return false;
    }
    
    // Verificar si la acción está permitida
    if (accion === 'bajar' && permiso.PERMISOS.includes('bajar')) {
      return true;
    }
    
    if (accion === 'subir' && permiso.PERMISOS.includes('subir')) {
      return true;
    }
    
    if (accion.includes('bloquear') && permiso.PERMISOS === 'completo') {
      return true;
    }
    
    return false;
  }

  // Obtener una pilona por ID
  async getPilonaById(id) {
    return this.get('SELECT * FROM PILONAS WHERE ID = ?', [id]);
  }

  // Actualizar el estado de una pilona
  async updatePilonaEstado(id, estado) {
    return this.run('UPDATE PILONAS SET ESTADO = ? WHERE ID = ?', [estado, id]);
  }

  // Registrar una acción en la auditoría
  async logAction(usuarioId, accion, pilonaId = null, ip = null) {
    return this.run(
      `INSERT INTO AUDITORIA (USUARIO_ID, ACCION, PILONA_ID, FECHA, IP) 
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?)`,
      [usuarioId, accion, pilonaId, ip]
    );
  }
  
  // Métodos específicos para zonas
  
  // Obtener todas las zonas
  async getZonas() {
    return this.query('SELECT * FROM ZONAS ORDER BY NOMBRE');
  }
  
  // Obtener zonas de una pilona
  async getZonasByPilona(pilonaId) {
    return this.query(`
      SELECT z.* 
      FROM ZONAS z
      JOIN PILONA_ZONA pz ON z.ID = pz.ZONA_ID
      WHERE pz.PILONA_ID = ?
      ORDER BY z.NOMBRE
    `, [pilonaId]);
  }
  
  // Obtener zonas permitidas para un usuario
  async getZonasByUsuario(usuarioId) {
    return this.query(`
      SELECT z.*, uz.PERMISOS
      FROM ZONAS z
      JOIN USUARIO_ZONA uz ON z.ID = uz.ZONA_ID
      WHERE uz.USUARIO_ID = ?
      ORDER BY z.NOMBRE
    `, [usuarioId]);
  }
  
  // Asignar pilona a zona
  async asignarPilonaZona(pilonaId, zonaId) {
    return this.run(
      'INSERT OR REPLACE INTO PILONA_ZONA (PILONA_ID, ZONA_ID) VALUES (?, ?)',
      [pilonaId, zonaId]
    );
  }
  
  // Asignar permiso de usuario a zona
  async asignarUsuarioZona(usuarioId, zonaId, permisos = 'bajar') {
    try {
      console.log(`Asignando zona: Usuario ID ${usuarioId} -> Zona ID ${zonaId} con permisos '${permisos}'`);
      
      // Verificar que el usuario existe
      const usuario = await this.get('SELECT ID, NOMBRE, EMAIL FROM USUARIOS WHERE ID = ?', [usuarioId]);
      if (!usuario) {
        throw new Error(`Usuario con ID ${usuarioId} no encontrado`);
      }
      
      // Verificar que la zona existe
      const zona = await this.get('SELECT ID, NOMBRE FROM ZONAS WHERE ID = ?', [zonaId]);
      if (!zona) {
        throw new Error(`Zona con ID ${zonaId} no encontrada`);
      }
      
      console.log(`✓ Usuario encontrado: ${usuario.NOMBRE} (${usuario.EMAIL})`);
      console.log(`✓ Zona encontrada: ${zona.NOMBRE}`);
      
      // Ejecutar la asignación
      const result = await this.run(
        'INSERT OR REPLACE INTO USUARIO_ZONA (USUARIO_ID, ZONA_ID, PERMISOS) VALUES (?, ?, ?)',
        [usuarioId, zonaId, permisos]
      );
      
      console.log(`✓ Asignación completada exitosamente`);
      
      return result;
    } catch (error) {
      console.error(`Error al asignar usuario ${usuarioId} a zona ${zonaId}:`, error);
      
      // Proporcionar información más detallada del error
      if (error.message.includes('FOREIGN KEY constraint failed')) {
        // Verificar específicamente qué clave foránea falló
        const usuarioExiste = await this.get('SELECT COUNT(*) as count FROM USUARIOS WHERE ID = ?', [usuarioId]);
        const zonaExiste = await this.get('SELECT COUNT(*) as count FROM ZONAS WHERE ID = ?', [zonaId]);
        
        if (usuarioExiste.count === 0) {
          throw new Error(`Error de clave foránea: Usuario con ID ${usuarioId} no existe en la tabla USUARIOS`);
        }
        
        if (zonaExiste.count === 0) {
          throw new Error(`Error de clave foránea: Zona con ID ${zonaId} no existe en la tabla ZONAS`);
        }
        
        // Si ambos existen, el problema puede ser la estructura de la tabla
        throw new Error('Error de clave foránea: Posible problema con la estructura de la tabla USUARIO_ZONA. Ejecute el script de corrección de claves foráneas.');
      }
      
      throw error;
    }
  }
  
  // Eliminar relación pilona-zona
  async eliminarPilonaZona(pilonaId, zonaId) {
    return this.run(
      'DELETE FROM PILONA_ZONA WHERE PILONA_ID = ? AND ZONA_ID = ?',
      [pilonaId, zonaId]
    );
  }
  
  // Eliminar permiso usuario-zona
  async eliminarUsuarioZona(usuarioId, zonaId) {
    return this.run(
      'DELETE FROM USUARIO_ZONA WHERE USUARIO_ID = ? AND ZONA_ID = ?',
      [usuarioId, zonaId]
    );
  }
}

// Crear y exportar una instancia única
const dbManager = new DatabaseManager();

module.exports = dbManager;