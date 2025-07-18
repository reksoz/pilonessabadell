// modbus-controllers-with-frame-logging.js - Versión con logging de tramas Modbus
const ModbusRTU = require('modbus-serial');

// Configuración global
const CONFIG = {
  CONNECTION_TIMEOUT: 5000,    // 5 segundos para establecer conexión
  OPERATION_TIMEOUT: 2000,     // 2 segundos para operaciones
  READ_INTERVAL: 3000,         // 3 segundos entre lecturas
  WRITE_RETRIES: 3,           // 3 reintentos para escritura
  CONNECTION_RETRY_DELAY: 5000, // 5 segundos entre reintentos de conexión
  USE_MULTIPLE_COIL_READ: true  // Usar lectura múltiple de coils (false para lectura individual)
};

// Función para formatear bytes en hexadecimal
function formatHex(buffer) {
  if (!buffer) return '';
  return Array.from(buffer).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
}

// Hook para interceptar tramas Modbus
function setupModbusLogging(client, pilonaId) {
  // Buffer para acumular datos RX
  let rxBuffer = Buffer.alloc(0);
  
  // Interceptar escrituras (TX)
  const originalWrite = client._port.write;
  client._port.write = function(data, encoding, callback) {
    const txId = data[0] << 8 | data[1]; // Transaction ID
    const funcCode = data[7]; // Function code
    const address = data[8] << 8 | data[9]; // Address
    
    console.log(`[${pilonaId}] TX > ID:${txId} FC:0x${funcCode.toString(16).padStart(2, '0')} Addr:${address} | ${formatHex(data)}`);
    
    // Decodificar función específica
    switch(funcCode) {
      case 0x01:
        console.log(`[${pilonaId}]      Read Coils - Start:${address} Count:${data[10] << 8 | data[11]}`);
        break;
      case 0x05:
        const value = data[10] << 8 | data[11];
        console.log(`[${pilonaId}]      Write Single Coil - Addr:${address} Value:${value === 0xFF00 ? 'ON' : 'OFF'}`);
        break;
      case 0x0F:
        console.log(`[${pilonaId}]      Write Multiple Coils - Start:${address} Count:${data[10] << 8 | data[11]}`);
        break;
    }
    
    return originalWrite.call(this, data, encoding, callback);
  };
  
  // Interceptar el evento 'data' del socket
  const socket = client._port._client || client._port.socket || client._port;
  
  if (socket && socket.on) {
    const originalEmit = socket.emit;
    socket.emit = function(event, data) {
      if (event === 'data' && data) {
        // Acumular datos en el buffer
        rxBuffer = Buffer.concat([rxBuffer, data]);
        
        // Verificar si tenemos una trama Modbus completa
        while (rxBuffer.length >= 8) {
          // Verificar si es una trama Modbus válida
          if (rxBuffer[2] === 0x00 && rxBuffer[3] === 0x00) {
            const length = (rxBuffer[4] << 8) | rxBuffer[5];
            const totalLength = 6 + length;
            
            if (rxBuffer.length >= totalLength) {
              // Extraer trama completa
              const frame = rxBuffer.slice(0, totalLength);
              rxBuffer = rxBuffer.slice(totalLength);
              
              // Log de la trama RX
              const rxId = frame[0] << 8 | frame[1];
              const funcCode = frame[7];
              console.log(`[${pilonaId}] RX < ID:${rxId} FC:0x${funcCode.toString(16).padStart(2, '0')} | ${formatHex(frame)}`);
              
              // Decodificar respuesta según función
              if (funcCode === 0x01 && frame.length > 8) {
                const byteCount = frame[8];
                console.log(`[${pilonaId}]      Read Coils Response - Bytes:${byteCount} Data:${formatHex(frame.slice(9, 9 + byteCount))}`);
              } else if (funcCode === 0x05) {
                const addr = (frame[8] << 8) | frame[9];
                const val = (frame[10] << 8) | frame[11];
                console.log(`[${pilonaId}]      Write Single Coil Response - Addr:${addr} Value:${val === 0xFF00 ? 'ON' : 'OFF'}`);
              }
            } else {
              break; // Esperar más datos
            }
          } else {
            // No es una trama válida, limpiar buffer
            rxBuffer = Buffer.alloc(0);
            break;
          }
        }
      }
      return originalEmit.apply(this, arguments);
    };
  }
}

// Clase para gestionar una pilona con logging de tramas
class OptimizedPilonaManager {
  constructor(pilona) {
    this.pilonaId = pilona.ID || pilona.id;
    this.pilonaName = pilona.NOMBRE || pilona.nombre;
    this.ip = pilona.DIRECCION_IP || pilona.direccionIP;
    this.puerto = parseInt(pilona.PUERTO || pilona.puerto || 502);
    this.unitId = parseInt(pilona.UNIT_ID || pilona.unitId || 1);
    
    // Mapear coils
    this.coilEstado = this._getCoilInfo('estado_subida_bajada', pilona);
    this.coilBajadaPuntual = this._getCoilInfo('bajada_puntual', pilona);
    this.coilForzadaAbajo = this._getCoilInfo('forzada_abajo', pilona);
    this.coilForzadaArriba = this._getCoilInfo('forzada_arriba', pilona);
    this.coilElectrovalvula = this._getCoilInfo('electrovalvula', pilona);
    
    // PARCHE TEMPORAL: Corregir dirección de electroválvula si es 8191
    if (this.coilElectrovalvula.address === 8191) {
      console.log(`[${this.pilonaId}] CORRECCIÓN TEMPORAL: Cambiando dirección electroválvula de 8191 a 8192`);
      this.coilElectrovalvula.address = 8192;
    }
    
    // Debug: mostrar direcciones configuradas
    console.log(`[${this.pilonaId}] Direcciones configuradas:`);
    console.log(`[${this.pilonaId}]   - Estado (Q3): ${this.coilEstado.address}`);
    console.log(`[${this.pilonaId}]   - Electroválvula (Q1): ${this.coilElectrovalvula.address}`);
    if (this.coilBajadaPuntual.address) console.log(`[${this.pilonaId}]   - Bajada Puntual: ${this.coilBajadaPuntual.address}`);
    if (this.coilForzadaArriba.address) console.log(`[${this.pilonaId}]   - Forzada Arriba: ${this.coilForzadaArriba.address}`);
    if (this.coilForzadaAbajo.address) console.log(`[${this.pilonaId}]   - Forzada Abajo: ${this.coilForzadaAbajo.address}`);
    
    // Estado de conexión
    this.lastError = null;
    this.errorTimestamp = null;
  }
  
  _getCoilInfo(tipo, pilona) {
    switch(tipo) {
      case 'estado_subida_bajada':
        return {
          address: parseInt(pilona.COIL_ESTADO_SUBIDA_BAJADA || pilona.coilEstadoSubidaBajada || 
                           pilona.COIL_ESTADO || pilona.coilEstado),
          tipo: pilona.TIPO_COIL_ESTADO_SUBIDA_BAJADA || 'COIL',
          modo: pilona.MODO_COIL_ESTADO_SUBIDA_BAJADA || 'R'
        };
      
      case 'bajada_puntual':
        return {
          address: parseInt(pilona.COIL_BAJADA_PUNTUAL || pilona.coilBajadaPuntual || 
                           pilona.COIL_PUNTUAL || pilona.coilPuntual ||
                           pilona.COIL_BAJAR || pilona.coilBajar),
          tipo: pilona.TIPO_COIL_BAJADA_PUNTUAL || pilona.TIPO_COIL_BAJAR || 'COIL',
          modo: pilona.MODO_COIL_BAJADA_PUNTUAL || 'W'
        };
        
      case 'forzada_abajo':
        return {
          address: parseInt(pilona.COIL_FORZADA_ABAJO || pilona.coilForzadaAbajo),
          tipo: pilona.TIPO_COIL_FORZADA_ABAJO || 'COIL',
          modo: pilona.MODO_COIL_FORZADA_ABAJO || 'RW'
        };
        
      case 'forzada_arriba':
        return {
          address: parseInt(pilona.COIL_FORZADA_ARRIBA || pilona.coilForzadaArriba),
          tipo: pilona.TIPO_COIL_FORZADA_ARRIBA || 'COIL',
          modo: pilona.MODO_COIL_FORZADA_ARRIBA || 'RW'
        };
        
      case 'electrovalvula':
        return {
          address: parseInt(pilona.COIL_ELECTROVALVULA || pilona.coilElectrovalvula || 0),
          tipo: pilona.TIPO_COIL_ELECTROVALVULA || 'COIL',
          modo: 'R' // Siempre solo lectura
        };
    }
  }
  
  async createConnection() {
    const client = new ModbusRTU();
    
    try {
      console.log(`[${this.pilonaId}] Conectando a ${this.ip}:${this.puerto} (Unit ID: ${this.unitId})`);
      
      client.setTimeout(CONFIG.OPERATION_TIMEOUT);
      
      await client.connectTCP(this.ip, { 
        port: this.puerto,
        timeout: CONFIG.CONNECTION_TIMEOUT
      });
      
      client.setID(this.unitId);
      
      // Configurar logging de tramas
      setupModbusLogging(client, this.pilonaId);
      
      console.log(`[${this.pilonaId}] Conexión establecida`);
      
      // Conexión exitosa
      this.lastError = null;
      this.errorTimestamp = null;
      
      return client;
    } catch (error) {
      this.lastError = error.message;
      this.errorTimestamp = Date.now();
      console.error(`[${this.pilonaId}] Error de conexión: ${error.message}`);
      throw error;
    }
  }
  
  async closeConnection(client) {
    if (client && client.isOpen) {
      try {
        client.close(() => {
          console.log(`[${this.pilonaId}] Conexión cerrada`);
        });
        // Esperar un poco para asegurar que se cierre
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.warn(`[${this.pilonaId}] Error cerrando conexión:`, error.message);
      }
    }
  }
  
  isOffline() {
    if (!this.errorTimestamp) return false;
    return (Date.now() - this.errorTimestamp) < 10000;
  }
  
  // Leer estado de la pilona (estado, electroválvula y forzados)
  async leerEstado(usarLecturaMultiple = true) {
    if (!this.coilEstado || isNaN(this.coilEstado.address)) {
      console.warn(`[${this.pilonaId}] Sin coil de estado configurado`);
      return null;
    }
    
    let client = null;
    
    try {
      // CONEXIÓN
      client = await this.createConnection();
      
      // Determinar rango de coils a leer
      const coilsToRead = [];
      
      // Agregar coil de estado
      coilsToRead.push({ tipo: 'estado', address: this.coilEstado.address });
      
      // Agregar otros coils si están configurados
      if (this.coilElectrovalvula && !isNaN(this.coilElectrovalvula.address)) {
        coilsToRead.push({ tipo: 'electrovalvula', address: this.coilElectrovalvula.address });
      }
      if (this.coilForzadaArriba && !isNaN(this.coilForzadaArriba.address)) {
        coilsToRead.push({ tipo: 'forzada_arriba', address: this.coilForzadaArriba.address });
      }
      if (this.coilForzadaAbajo && !isNaN(this.coilForzadaAbajo.address)) {
        coilsToRead.push({ tipo: 'forzada_abajo', address: this.coilForzadaAbajo.address });
      }
      
      // Inicializar estado
      const estado = {
        estado_subida_bajada: null,
        electrovalvula: null,
        forzada_arriba: null,
        forzada_abajo: null
      };
      
      if (usarLecturaMultiple && coilsToRead.length > 1) {
        // MODO LECTURA MÚLTIPLE: Leer todos los coils en una operación
        const addresses = coilsToRead.map(c => c.address);
        const minAddress = Math.min(...addresses);
        const maxAddress = Math.max(...addresses);
        const numCoils = maxAddress - minAddress + 1;
        
        console.log(`[${this.pilonaId}] === LEYENDO MÚLTIPLES COILS (${minAddress}-${maxAddress}) ===`);
        console.log(`[${this.pilonaId}] Coils a leer: ${coilsToRead.map(c => `${c.tipo}(${c.address})`).join(', ')}`);
        console.log(`[${this.pilonaId}] Número de coils a leer: ${numCoils}`);
        
        try {
          const result = await client.readCoils(minAddress, numCoils);
          
          // Debug: mostrar todos los bits recibidos
          console.log(`[${this.pilonaId}] Bits recibidos (${result.data.length} bits):`);
          for (let i = 0; i < result.data.length && i < numCoils; i++) {
            console.log(`[${this.pilonaId}]   Dirección ${minAddress + i}: ${result.data[i] ? '1' : '0'}`);
          }
          
          // Mapear valores leídos a cada coil
          for (const coil of coilsToRead) {
            const offset = coil.address - minAddress;
            const valor = result.data[offset];
            
            console.log(`[${this.pilonaId}] Mapeando ${coil.tipo} - Dirección: ${coil.address}, Offset: ${offset}, Valor: ${valor}`);
            
            switch(coil.tipo) {
              case 'estado':
                estado.estado_subida_bajada = valor;
                break;
              case 'electrovalvula':
                estado.electrovalvula = valor;
                break;
              case 'forzada_arriba':
                estado.forzada_arriba = valor;
                break;
              case 'forzada_abajo':
                estado.forzada_abajo = valor;
                break;
            }
          }
        } catch (error) {
          console.error(`[${this.pilonaId}] Error en lectura múltiple, intentando lectura individual:`, error.message);
          // Si falla la lectura múltiple, intentar individual
          return this.leerEstado(false);
        }
      } else {
        // MODO LECTURA INDIVIDUAL: Leer cada coil por separado
        console.log(`[${this.pilonaId}] === LEYENDO COILS INDIVIDUALMENTE ===`);
        
        for (const coil of coilsToRead) {
          try {
            console.log(`[${this.pilonaId}] Leyendo ${coil.tipo} en dirección ${coil.address}`);
            const result = await client.readCoils(coil.address, 1);
            const valor = result.data[0];
            
            switch(coil.tipo) {
              case 'estado':
                estado.estado_subida_bajada = valor;
                console.log(`[${this.pilonaId}] Estado (Q3): ${valor ? 'ARRIBA' : 'ABAJO'}`);
                break;
              case 'electrovalvula':
                estado.electrovalvula = valor;
                console.log(`[${this.pilonaId}] Electroválvula (Q1): ${valor ? 'ACTIVA' : 'INACTIVA'}`);
                break;
              case 'forzada_arriba':
                estado.forzada_arriba = valor;
                console.log(`[${this.pilonaId}] Forzada Arriba: ${valor ? 'ACTIVA' : 'INACTIVA'}`);
                break;
              case 'forzada_abajo':
                estado.forzada_abajo = valor;
                console.log(`[${this.pilonaId}] Forzada Abajo: ${valor ? 'ACTIVA' : 'INACTIVA'}`);
                break;
            }
          } catch (error) {
            console.warn(`[${this.pilonaId}] Error leyendo ${coil.tipo}:`, error.message);
          }
        }
      }
      
      // Detectar fallo: Q3=1 (arriba) pero Q1=0 (no hay electroválvula)
      // IMPORTANTE: Solo es fallo si Q3=1 Y Q1=0
      estado.fallo_arriba = (estado.estado_subida_bajada === true && estado.electrovalvula === false);
      
      console.log(`[${this.pilonaId}] Detección de fallo: Q3=${estado.estado_subida_bajada}, Q1=${estado.electrovalvula}, Fallo=${estado.fallo_arriba}`);
      
      console.log(`[${this.pilonaId}] Estado completo: Q3=${estado.estado_subida_bajada ? 'ARRIBA' : 'ABAJO'}, Q1=${estado.electrovalvula === null ? 'N/A' : (estado.electrovalvula ? 'ACTIVA' : 'INACTIVA')}, Forzada Arriba=${estado.forzada_arriba === null ? 'N/A' : (estado.forzada_arriba ? 'SI' : 'NO')}, Forzada Abajo=${estado.forzada_abajo === null ? 'N/A' : (estado.forzada_abajo ? 'SI' : 'NO')}, Fallo=${estado.fallo_arriba ? 'SI' : 'NO'}`);
      
      // IMPORTANTE: Cerrar conexión inmediatamente después de leer
      await this.closeConnection(client);
      client = null;
      
      return estado;
      
    } catch (error) {
      console.error(`[${this.pilonaId}] Error leyendo estado:`, error.message);
      throw error;
    } finally {
      // Asegurar que la conexión se cierre siempre
      if (client) {
        await this.closeConnection(client);
      }
    }
  }
  
  // Escribir en un coil específico
  async escribirCoil(tipo, valor) {
    const coilInfo = this[`coil${tipo.charAt(0).toUpperCase() + tipo.slice(1).replace(/_/g, '')}`];
    
    if (!coilInfo || isNaN(coilInfo.address)) {
      throw new Error(`Coil ${tipo} no configurado o dirección inválida`);
    }
    
    if (coilInfo.modo === 'R') {
      throw new Error(`Coil ${tipo} es de solo lectura`);
    }
    
    console.log(`[${this.pilonaId}] === ESCRIBIENDO COIL ${tipo.toUpperCase()} ===`);
    console.log(`[${this.pilonaId}] Dirección: ${coilInfo.address}, Valor: ${valor}`);
    
    let lastError = null;
    
    for (let intento = 0; intento < CONFIG.WRITE_RETRIES; intento++) {
      let client = null;
      
      try {
        // CONEXIÓN
        client = await this.createConnection();
        
        // ESCRITURA
        console.log(`[${this.pilonaId}] Enviando Write Single Coil (FC 0x05)`);
        await client.writeCoil(coilInfo.address, !!valor);
        
        // IMPORTANTE: Cerrar conexión inmediatamente después de escribir
        await this.closeConnection(client);
        client = null;
        
        console.log(`[${this.pilonaId}] Escritura exitosa`);
        return true;
        
      } catch (error) {
        lastError = error;
        console.error(`[${this.pilonaId}] Error escribiendo ${tipo} (intento ${intento + 1}/${CONFIG.WRITE_RETRIES}):`, error.message);
        
        if (intento < CONFIG.WRITE_RETRIES - 1) {
          console.log(`[${this.pilonaId}] Esperando 500ms antes de reintentar...`);
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      } finally {
        // Asegurar que la conexión se cierre siempre
        if (client) {
          await this.closeConnection(client);
        }
      }
    }
    
    throw lastError || new Error('Error escribiendo coil después de todos los reintentos');
  }
  
  // Leer un coil específico
  async leerCoilEspecifico(address) {
    let client = null;
    
    try {
      // CONEXIÓN
      client = await this.createConnection();
      
      // LECTURA
      console.log(`[${this.pilonaId}] Leyendo coil específico en dirección ${address}`);
      const result = await client.readCoils(address, 1);
      const valor = result.data[0];
      
      console.log(`[${this.pilonaId}] Valor leído: ${valor}`);
      
      // IMPORTANTE: Cerrar conexión
      await this.closeConnection(client);
      client = null;
      
      return valor;
      
    } catch (error) {
      throw error;
    } finally {
      if (client) {
        await this.closeConnection(client);
      }
    }
  }
  
  determinarEstadoTextual(estado) {
    console.log(`[${this.pilonaId}] Determinando estado textual con:`, JSON.stringify(estado));
    
    if (!estado || estado.estado_subida_bajada === null || estado.estado_subida_bajada === undefined) {
      console.log(`[${this.pilonaId}] Sin comunicación (estado null o sin estado_subida_bajada)`);
      return 'sin_comunicacion';
    }
    
    // IMPORTANTE: Si Q3=1 Y Q1=1, la pilona está ARRIBA (no hay fallo)
    // Solo es fallo si Q3=1 Y Q1=0
    if (estado.estado_subida_bajada === true && estado.electrovalvula === false) {
      console.log(`[${this.pilonaId}] FALLO DETECTADO: Q3=1 (arriba) pero Q1=0 (sin electroválvula)`);
      return 'fallo_arriba';
    }
    
    if (estado.forzada_arriba) {
      console.log(`[${this.pilonaId}] Estado determinado: bloqueada_arriba`);
      return 'bloqueada_arriba';
    }
    
    if (estado.forzada_abajo) {
      console.log(`[${this.pilonaId}] Estado determinado: bloqueada_abajo`);
      return 'bloqueada_abajo';
    }
    
    // Estado normal: Q3=1 significa SUBIDA, Q3=0 significa BAJADA
    const estadoFinal = estado.estado_subida_bajada ? 'subida' : 'bajada';
    console.log(`[${this.pilonaId}] Estado determinado: ${estadoFinal} (Q3=${estado.estado_subida_bajada ? '1' : '0'}, Q1=${estado.electrovalvula === null ? 'N/A' : (estado.electrovalvula ? '1' : '0')})`);
    return estadoFinal;
  }
}

// Monitor continuo optimizado
class OptimizedContinuousMonitor {
  constructor() {
    this.running = false;
    this.pilonaManagers = new Map();
    this.pilonaStates = new Map();
    this.pausedPilonas = new Set();
    this.readInterval = null;
    this.lastUpdateTime = new Map(); // Para rastrear cuándo se actualizó cada pilona
  }
  
  async start(dbManager, io) {
    if (this.running) return;
    
    this.running = true;
    console.log('=== Iniciando monitoreo continuo con logging de tramas ===');
    
    // Crear managers para cada pilona
    const pilonas = await dbManager.getPilonas();
    for (const pilona of pilonas) {
      const pilonaId = pilona.ID || pilona.id;
      this.pilonaManagers.set(pilonaId, new OptimizedPilonaManager(pilona));
    }
    
    console.log(`Creados ${this.pilonaManagers.size} gestores de pilonas`);
    
    // Función de polling
    const poll = async () => {
      if (!this.running) return;
      
      const startTime = Date.now();
      console.log('\n--- Iniciando ciclo de lectura ---');
      
      try {
        // Procesar pilonas secuencialmente
        for (const [pilonaId, manager] of this.pilonaManagers) {
          if (!this.pausedPilonas.has(pilonaId) && !manager.isOffline()) {
            await this.processPilona(pilonaId, manager, dbManager, io);
          }
        }
        
      } catch (error) {
        console.error('Error en ciclo de monitoreo:', error);
      }
      
      const elapsed = Date.now() - startTime;
      console.log(`--- Ciclo completado en ${elapsed}ms ---\n`);
      
      // Programar siguiente lectura
      if (this.running) {
        this.readInterval = setTimeout(poll, CONFIG.READ_INTERVAL);
      }
    };
    
    // Primera lectura después de 1 segundo
    setTimeout(poll, 1000);
  }
  
  async processPilona(pilonaId, manager, dbManager, io) {
    try {
      console.log(`[${pilonaId}] Procesando pilona...`);
      const currentState = await manager.leerEstado(CONFIG.USE_MULTIPLE_COIL_READ);
      
      if (currentState) {
        // Comparar con estado anterior
        const previousState = this.pilonaStates.get(pilonaId);
        
        if (this.hasStateChanged(previousState, currentState)) {
          console.log(`[${pilonaId}] CAMBIO DE ESTADO DETECTADO`);
          console.log(`[${pilonaId}] Estado anterior:`, previousState);
          console.log(`[${pilonaId}] Estado actual:`, currentState);
          
          // Determinar estado textual
          const estadoTextual = manager.determinarEstadoTextual(currentState);
          console.log(`[${pilonaId}] Estado textual determinado: ${estadoTextual}`);
          
          // Actualizar BD
          if (dbManager) {
            console.log(`[${pilonaId}] Actualizando BD con estado: ${estadoTextual}`);
            await dbManager.updatePilonaEstado(pilonaId, estadoTextual);
          }
          
          // Emitir por WebSocket
          if (io) {
            const payload = {
              id: parseInt(pilonaId), // Asegurar que el ID sea número
              estado: estadoTextual,
              coils: currentState
            };
            
            // También enviar con ID como string para compatibilidad
            const payloadString = {
              id: String(pilonaId),
              estado: estadoTextual,
              coils: currentState
            };
            console.log(`[${pilonaId}] Emitiendo actualización por WebSocket:`, JSON.stringify(payload));
            
            // Verificar que io es válido y tiene el método emit
            if (typeof io.emit === 'function') {
              // Emitir con ID como número
              io.emit('actualizacion_pilona', payload);
              console.log(`[${pilonaId}] Emisión WebSocket exitosa con ID numérico`);
              
              // También emitir con ID como string para compatibilidad
              setTimeout(() => {
                io.emit('actualizacion_pilona', payloadString);
                console.log(`[${pilonaId}] Emisión WebSocket exitosa con ID string`);
              }, 100);
            } else {
              console.error(`[${pilonaId}] ERROR: io.emit no es una función`, typeof io, io);
            }
          } else {
            console.error(`[${pilonaId}] ERROR: io no está definido para emitir actualización`);
          }
        }
        
        // Guardar estado actual
        this.pilonaStates.set(pilonaId, currentState);
        
        // FORZAR actualización del estado aunque no haya cambio
        // Esto es para casos donde el frontend no se actualiza correctamente
        if (!this.hasStateChanged(previousState, currentState)) {
          // Si han pasado más de 3 segundos desde la última actualización, forzar emisión
          const lastUpdate = this.lastUpdateTime.get(pilonaId) || 0;
          const now = Date.now();
          
          if (now - lastUpdate > 3000) { // Reducido a 3 segundos para respuesta más rápida
            console.log(`[${pilonaId}] Forzando actualización periódica del estado`);
            
            const estadoTextual = manager.determinarEstadoTextual(currentState);
            
            if (io && typeof io.emit === 'function') {
              const payloadNumerico = {
                id: parseInt(pilonaId),
                estado: estadoTextual,
                coils: currentState,
                forzada: true,
                timestamp: now
              };
              
              const payloadString = {
                id: String(pilonaId),
                estado: estadoTextual,
                coils: currentState,
                forzada: true,
                timestamp: now
              };
              
              // Emitir inmediatamente con ambos formatos de ID
              io.emit('actualizacion_pilona', payloadNumerico);
              io.emit('actualizacion_pilona', payloadString);
              
              console.log(`[${pilonaId}] Actualización forzada emitida (ambos formatos de ID)`);
            }
            
            this.lastUpdateTime.set(pilonaId, now);
          }
        } else {
          // Si hubo cambio, actualizar tiempo y asegurar que se emite también con ambos formatos
          this.lastUpdateTime.set(pilonaId, Date.now());
          
          // IMPORTANTE: También emitir con formato string cuando hay cambio
          const estadoTextual = manager.determinarEstadoTextual(currentState);
          if (io && typeof io.emit === 'function') {
            const payloadString = {
              id: String(pilonaId),
              estado: estadoTextual,
              coils: currentState,
              cambio: true
            };
            
            // Emitir el payload string inmediatamente después del numérico
            setTimeout(() => {
              io.emit('actualizacion_pilona', payloadString);
              console.log(`[${pilonaId}] Actualización de cambio emitida también con ID string`);
            }, 50);
          }
        }
      }
      
    } catch (error) {
      // Solo loguear si no es un error ya conocido
      if (!manager.isOffline()) {
        console.error(`[${pilonaId}] Error en monitoreo:`, error.message);
      }
      
      // Marcar como sin comunicación
      if (dbManager) {
        await dbManager.updatePilonaEstado(pilonaId, 'sin_comunicacion');
      }
    }
  }
  
  hasStateChanged(previous, current) {
    if (!previous) {
      console.log('No hay estado previo, es un cambio');
      return true;
    }
    
    console.log(`Comparando estados - Previo: Q3=${previous.estado_subida_bajada}, Q1=${previous.electrovalvula}, Actual: Q3=${current.estado_subida_bajada}, Q1=${current.electrovalvula}`);
    
    // Comparar estado principal
    if (previous.estado_subida_bajada !== current.estado_subida_bajada) {
      console.log('Cambio detectado en estado_subida_bajada');
      return true;
    }
    
    // Comparar electroválvula si está presente
    if (previous.electrovalvula !== current.electrovalvula) {
      console.log('Cambio detectado en electrovalvula');
      return true;
    }
    
    // Comparar estados de forzado si están presentes
    if (previous.forzada_arriba !== current.forzada_arriba) {
      console.log('Cambio detectado en forzada_arriba');
      return true;
    }
    if (previous.forzada_abajo !== current.forzada_abajo) {
      console.log('Cambio detectado en forzada_abajo');
      return true;
    }
    
    // Comparar estado de fallo
    if (previous.fallo_arriba !== current.fallo_arriba) {
      console.log('Cambio detectado en fallo_arriba');
      return true;
    }
    
    console.log('No se detectaron cambios');
    return false;
  }
  
  pausePilona(pilonaId) {
    console.log(`[${pilonaId}] Pausando monitoreo`);
    this.pausedPilonas.add(pilonaId);
  }
  
  resumePilona(pilonaId) {
    console.log(`[${pilonaId}] Reanudando monitoreo`);
    this.pausedPilonas.delete(pilonaId);
  }
  
  stop() {
    this.running = false;
    if (this.readInterval) {
      clearTimeout(this.readInterval);
      this.readInterval = null;
    }
    console.log('=== Monitoreo continuo detenido ===');
  }
  
  getManager(pilonaId) {
    return this.pilonaManagers.get(pilonaId);
  }
}

// Controlador principal
class PilonaController {
  constructor() {
    this.monitor = new OptimizedContinuousMonitor();
  }
  
  async conectarPilona(pilona) {
    try {
      const manager = new OptimizedPilonaManager(pilona);
      const client = await manager.createConnection();
      await manager.closeConnection(client);
      return true;
    } catch (error) {
      console.error('Error conectando:', error.message);
      return false;
    }
  }
  
  async obtenerEstadoPilona(pilona) {
    const pilonaId = pilona.ID || pilona.id;
    
    try {
      const manager = new OptimizedPilonaManager(pilona);
      const estado = await manager.leerEstado();
      return manager.determinarEstadoTextual(estado);
    } catch (error) {
      return 'error';
    }
  }
  
  async controlarPilona(pilona, accion, usuario, req) {
    const pilonaId = pilona.ID || pilona.id;
    console.log(`\n[${pilonaId}] ========== CONTROL: ${accion.toUpperCase()} ==========`);
    
    // Pausar monitoreo
    this.monitor.pausePilona(pilonaId);
    
    try {
      const manager = this.monitor.getManager(pilonaId) || new OptimizedPilonaManager(pilona);
      
      switch(accion) {
        case 'subir':
          await manager.escribirCoil('estadoSubidaBajada', true);
          break;
          
        case 'bajar':
          // Para todos los usuarios, intentar usar bajada puntual si está configurada
          const tienePuntual = manager.coilBajadaPuntual && !isNaN(manager.coilBajadaPuntual.address);
          
          if (tienePuntual) {
            console.log(`[${pilonaId}] Usando protocolo de bajada puntual`);
            return await this.ejecutarAccionPuntual(pilona, usuario, req);
          } else {
            console.log(`[${pilonaId}] Cambiando estado directamente (sin coil puntual)`);
            await manager.escribirCoil('estadoSubidaBajada', false);
          }
          break;
          
        case 'bloquear_arriba':
        case 'forzar_arriba':
          await manager.escribirCoil('forzadaAbajo', false);
          await manager.escribirCoil('forzadaArriba', true);
          break;
          
        case 'bloquear_abajo':
        case 'forzar_abajo':
          await manager.escribirCoil('forzadaArriba', false);
          await manager.escribirCoil('forzadaAbajo', true);
          break;
          
        case 'desbloquear':
        case 'quitar_forzado':
          await manager.escribirCoil('forzadaArriba', false);
          await manager.escribirCoil('forzadaAbajo', false);
          break;
          
        default:
          throw new Error(`Acción desconocida: ${accion}`);
      }
      
      console.log(`[${pilonaId}] Control completado exitosamente`);
      return true;
      
    } catch (error) {
      console.error(`[${pilonaId}] ERROR EN CONTROL:`, error.message);
      throw error;
    } finally {
      // Reanudar monitoreo después de 1 segundo para respuesta más rápida
      setTimeout(() => {
        this.monitor.resumePilona(pilonaId);
        console.log(`[${pilonaId}] Monitoreo reanudado después del control`);
        
        // Forzar una lectura inmediata después de reanudar
        setTimeout(async () => {
          try {
            const manager = this.monitor.getManager(pilonaId);
            if (manager) {
              console.log(`[${pilonaId}] Forzando lectura inmediata post-control`);
              await this.monitor.processPilona(pilonaId, manager, global.dbManager, global.io);
            }
          } catch (error) {
            console.error(`[${pilonaId}] Error en lectura forzada post-control:`, error.message);
          }
        }, 500);
      }, 1000);
    }
  }
  
  async ejecutarAccionPuntual(pilona, usuario, req) {
    const pilonaId = pilona.ID || pilona.id;
    const tiempoPuntual = parseInt(pilona.TIEMPO_PUNTUAL || pilona.tiempoPuntual || 3000);
    
    console.log(`\n[${pilonaId}] ========== PROTOCOLO BAJADA PUNTUAL ==========`);
    console.log(`[${pilonaId}] Tiempo configurado: ${tiempoPuntual}ms`);
    
    this.monitor.pausePilona(pilonaId);
    
    try {
      const manager = this.monitor.getManager(pilonaId) || new OptimizedPilonaManager(pilona);
      
      // Verificar configuración
      if (!manager.coilBajadaPuntual || isNaN(manager.coilBajadaPuntual.address)) {
        throw new Error('Coil de bajada puntual no configurado');
      }
      
      console.log(`[${pilonaId}] Coil puntual configurado en dirección: ${manager.coilBajadaPuntual.address}`);
      
      // PROTOCOLO DE BAJADA PUNTUAL
      
      // PASO 1: Escribir 1 (ON)
      console.log(`\n[${pilonaId}] PASO 1/5: Escribir 1 (ON) en coil bajada puntual`);
      await manager.escribirCoil('bajadaPuntual', true);
      
      // PASO 2: Esperar confirmación (lectura de 1)
      console.log(`\n[${pilonaId}] PASO 2/5: Esperando confirmación (máx 10s)`);
      const timeout = Date.now() + 10000;
      let confirmado = false;
      let intentosLectura = 0;
      
      while (!confirmado && Date.now() < timeout) {
        try {
          intentosLectura++;
          const valor = await manager.leerCoilEspecifico(manager.coilBajadaPuntual.address);
          if (valor) {
            confirmado = true;
            console.log(`[${pilonaId}] ✓ Confirmación recibida después de ${intentosLectura} intentos`);
          }
        } catch (e) {
          console.log(`[${pilonaId}] Intento ${intentosLectura} sin respuesta`);
        }
        
        if (!confirmado) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      if (!confirmado) {
        throw new Error(`No se recibió confirmación después de ${intentosLectura} intentos`);
      }
      
      // PASO 3: Esperar tiempo configurado
      console.log(`\n[${pilonaId}] PASO 3/5: Esperando ${tiempoPuntual}ms`);
      await new Promise(resolve => setTimeout(resolve, tiempoPuntual));
      
      // PASO 4: Escribir 0 (OFF)
      console.log(`\n[${pilonaId}] PASO 4/5: Escribir 0 (OFF) en coil bajada puntual`);
      await manager.escribirCoil('bajadaPuntual', false);
      
      // PASO 5: Verificar procesamiento
      console.log(`\n[${pilonaId}] PASO 5/5: Verificando procesamiento`);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log(`\n[${pilonaId}] ✓ BAJADA PUNTUAL COMPLETADA EXITOSAMENTE`);
      return true;
      
    } catch (error) {
      console.error(`\n[${pilonaId}] ✗ ERROR EN BAJADA PUNTUAL:`, error.message);
      
      // Intentar limpiar el coil
      try {
        const manager = this.monitor.getManager(pilonaId) || new OptimizedPilonaManager(pilona);
        console.log(`[${pilonaId}] Intentando limpiar coil puntual...`);
        await manager.escribirCoil('bajadaPuntual', false);
      } catch (e) {
        console.error(`[${pilonaId}] Error limpiando coil:`, e.message);
      }
      
      throw error;
    } finally {
      // Reanudar monitoreo después de 1 segundo para respuesta más rápida
      setTimeout(() => {
        this.monitor.resumePilona(pilonaId);
        console.log(`[${pilonaId}] Monitoreo reanudado después de acción puntual`);
        
        // Forzar una lectura inmediata después de reanudar
        setTimeout(async () => {
          try {
            const manager = this.monitor.getManager(pilonaId);
            if (manager) {
              console.log(`[${pilonaId}] Forzando lectura inmediata post-puntual`);
              await this.monitor.processPilona(pilonaId, manager, global.dbManager, global.io);
            }
          } catch (error) {
            console.error(`[${pilonaId}] Error en lectura forzada post-puntual:`, error.message);
          }
        }, 500);
      }, 1000);
    }
  }
  
  iniciarMonitoreoContinuo(dbManager, io) {
    return this.monitor.start(dbManager, io);
  }
  
  detenerMonitoreoContinuo() {
    return this.monitor.stop();
  }
  
  cerrarConexiones() {
    this.monitor.stop();
  }
}

// Crear instancia única
const pilonaController = new PilonaController();

// Exportar API compatible
module.exports = {
  conectarPilona: (pilona) => pilonaController.conectarPilona(pilona),
  obtenerEstadoPilona: (pilona) => pilonaController.obtenerEstadoPilona(pilona),
  controlarPilona: (pilona, accion, usuario, req) => pilonaController.controlarPilona(pilona, accion, usuario, req),
  ejecutarAccionPuntual: (pilona, usuario, req) => pilonaController.ejecutarAccionPuntual(pilona, usuario, req),
  cerrarConexiones: () => pilonaController.cerrarConexiones(),
  iniciarMonitoreoContinuo: (dbManager, io) => pilonaController.iniciarMonitoreoContinuo(dbManager, io),
  detenerMonitoreoContinuo: () => pilonaController.detenerMonitoreoContinuo(),
  obtenerTodosLosEstados: () => Object.fromEntries(pilonaController.monitor.pilonaStates),
  pausarMonitoreoPilona: (pilonaId) => pilonaController.monitor.pausePilona(pilonaId),
  reanudarMonitoreoPilona: (pilonaId) => pilonaController.monitor.resumePilona(pilonaId),
  pausarMonitoreoPilonaPorIP: async (ip, dbManager) => {
    const pilonas = await dbManager.getPilonas();
    const afectadas = pilonas.filter(p => (p.DIRECCION_IP === ip || p.direccionIP === ip));
    afectadas.forEach(p => pilonaController.monitor.pausePilona(p.ID || p.id));
    return afectadas.length;
  },
  reanudarMonitoreoPilonaPorIP: async (ip, dbManager) => {
    const pilonas = await dbManager.getPilonas();
    const afectadas = pilonas.filter(p => (p.DIRECCION_IP === ip || p.direccionIP === ip));
    afectadas.forEach(p => pilonaController.monitor.resumePilona(p.ID || p.id));
    return afectadas.length;
  }
};
