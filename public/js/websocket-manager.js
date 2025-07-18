// websocket-manager.js - Gestor mejorado de WebSocket con reconexión automática

class WebSocketManager {
  constructor() {
    this.socket = null;
    this.usuario = null;
    this.intentosReconexion = 0;
    this.maxIntentosReconexion = 10;
    this.tiempoReconexion = 1000; // Comenzar con 1 segundo
    this.conectado = false;
    this.listeners = new Map();
    this.debug = true; // Activar logs de debug
  }

  log(...args) {
    if (this.debug) {
      console.log('[WebSocketManager]', ...args);
    }
  }

  inicializar(usuario) {
    this.usuario = usuario;
    this.conectar();
  }

  conectar() {
    try {
      // Si ya hay una conexión, desconectar primero
      if (this.socket) {
        this.log('Desconectando socket existente...');
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }

      // Determinar la URL del servidor
      const protocol = window.location.protocol;
      const hostname = window.location.hostname;
      const port = window.location.port || (protocol === 'https:' ? '443' : '80');
      const socketUrl = `${protocol}//${hostname}:${port}`;
      
      this.log('Conectando a:', socketUrl);

      // Configurar opciones de conexión
      const socketOptions = {
        transports: ['websocket', 'polling'],
        query: {
          sessionID: localStorage.getItem('sessionID') || ''
        },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: this.maxIntentosReconexion,
        timeout: 20000,
        forceNew: true // Forzar nueva conexión
      };

      // Crear conexión
      this.socket = io(socketUrl, socketOptions);

      // Configurar eventos
      this.configurarEventos();
      
    } catch (error) {
      console.error('[WebSocketManager] Error al conectar:', error);
      this.programarReconexion();
    }
  }

  configurarEventos() {
    // Evento de conexión exitosa
    this.socket.on('connect', () => {
      this.log('✅ Conectado correctamente');
      this.log('Socket ID:', this.socket.id);
      this.conectado = true;
      this.intentosReconexion = 0;
      this.tiempoReconexion = 1000;

      // Autenticar el socket
      if (this.usuario) {
        this.socket.emit('autenticar', this.usuario);
        this.log('Usuario autenticado:', this.usuario.NOMBRE || this.usuario.nombre);
      }

      // Notificar a los listeners
      this.notificar('connect', { socketId: this.socket.id });
    });

    // Evento de desconexión
    this.socket.on('disconnect', (reason) => {
      this.log('❌ Desconectado:', reason);
      this.conectado = false;

      // Notificar a los listeners
      this.notificar('disconnect', { reason });

      // Si la desconexión no fue intencional, intentar reconectar
      if (reason === 'io server disconnect') {
        this.log('Servidor forzó desconexión, reconectando...');
        this.programarReconexion();
      } else if (reason === 'transport close' || reason === 'transport error') {
        this.log('Error de transporte, reconectando...');
        this.programarReconexion();
      }
    });

    // Error de conexión
    this.socket.on('connect_error', (error) => {
      console.error('[WebSocketManager] Error de conexión:', error.message);
      this.conectado = false;

      // Incrementar intentos
      this.intentosReconexion++;

      if (this.intentosReconexion >= this.maxIntentosReconexion) {
        console.error('[WebSocketManager] Máximo de intentos alcanzado');
        this.notificar('max_reconnect_attempts', { attempts: this.intentosReconexion });
      }
    });

    // Reconexión exitosa
    this.socket.on('reconnect', (attemptNumber) => {
      this.log(`✅ Reconectado después de ${attemptNumber} intentos`);
      this.notificar('reconnect', { attempts: attemptNumber });
    });

    // Intento de reconexión
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      this.log(`Intento de reconexión #${attemptNumber}`);
      this.notificar('reconnect_attempt', { attempt: attemptNumber });
    });

    // Fallo en reconexión
    this.socket.on('reconnect_failed', () => {
      console.error('[WebSocketManager] Falló la reconexión después de todos los intentos');
      this.notificar('reconnect_failed', {});
      
      // Intentar reconexión manual después de un tiempo
      setTimeout(() => {
        this.log('Iniciando reconexión manual...');
        this.intentosReconexion = 0;
        this.conectar();
      }, 10000); // Esperar 10 segundos antes de intentar manualmente
    });

    // Actualización de pilona
    this.socket.on('actualizacion_pilona', (data) => {
      this.log('📡 Actualización de pilona recibida:', data);
      this.notificar('actualizacion_pilona', data);
    });

    // Monitorización pausada
    this.socket.on('monitorizacion-pausada', (data) => {
      this.log('Monitorización pausada para IP:', data.ip);
      this.notificar('monitorizacion-pausada', data);
    });

    // Monitorización reanudada
    this.socket.on('monitorizacion-reanudada', (data) => {
      this.log('Monitorización reanudada para IP:', data.ip);
      this.notificar('monitorizacion-reanudada', data);
    });

    // Ping/Pong personalizado para mantener la conexión viva
    this.configurarHeartbeat();
  }

  configurarHeartbeat() {
    // Enviar ping cada 25 segundos
    setInterval(() => {
      if (this.conectado && this.socket) {
        this.socket.emit('ping');
      }
    }, 25000);

    // Responder a pong
    if (this.socket) {
      this.socket.on('pong', () => {
        this.log('Pong recibido - conexión activa');
      });
    }
  }

  programarReconexion() {
    if (this.intentosReconexion >= this.maxIntentosReconexion) {
      console.error('[WebSocketManager] No se programará reconexión, máximo de intentos alcanzado');
      return;
    }

    // Calcular tiempo de espera con backoff exponencial
    const tiempoEspera = Math.min(this.tiempoReconexion * Math.pow(2, this.intentosReconexion), 30000);
    
    this.log(`Reconexión programada en ${tiempoEspera}ms (intento ${this.intentosReconexion + 1}/${this.maxIntentosReconexion})`);
    
    setTimeout(() => {
      this.conectar();
    }, tiempoEspera);
  }

  // Método para registrar listeners
  on(evento, callback) {
    if (!this.listeners.has(evento)) {
      this.listeners.set(evento, []);
    }
    this.listeners.get(evento).push(callback);

    // Si el socket ya existe, registrar también el evento directamente
    if (this.socket && !['connect', 'disconnect', 'reconnect', 'reconnect_attempt', 'reconnect_failed', 'max_reconnect_attempts'].includes(evento)) {
      this.socket.on(evento, callback);
    }
  }

  // Método para eliminar listeners
  off(evento, callback) {
    if (this.listeners.has(evento)) {
      const callbacks = this.listeners.get(evento);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }

    // Eliminar también del socket si existe
    if (this.socket) {
      this.socket.off(evento, callback);
    }
  }

  // Notificar a todos los listeners de un evento
  notificar(evento, data) {
    if (this.listeners.has(evento)) {
      this.listeners.get(evento).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[WebSocketManager] Error en listener de ${evento}:`, error);
        }
      });
    }
  }

  // Emitir evento al servidor
  emit(evento, data, callback) {
    if (!this.socket || !this.conectado) {
      console.warn('[WebSocketManager] No hay conexión activa para emitir:', evento);
      if (callback) {
        callback(new Error('No hay conexión activa'));
      }
      return;
    }

    if (callback) {
      this.socket.emit(evento, data, callback);
    } else {
      this.socket.emit(evento, data);
    }
  }

  // Verificar estado de conexión
  estaConectado() {
    return this.conectado && this.socket && this.socket.connected;
  }

  // Reconectar manualmente
  reconectar() {
    this.log('Reconexión manual solicitada');
    this.intentosReconexion = 0;
    this.conectar();
  }

  // Desconectar
  desconectar() {
    if (this.socket) {
      this.log('Desconectando...');
      this.socket.disconnect();
      this.socket = null;
      this.conectado = false;
    }
  }

  // Obtener información de conexión
  obtenerInfo() {
    return {
      conectado: this.conectado,
      socketId: this.socket ? this.socket.id : null,
      intentosReconexion: this.intentosReconexion,
      maxIntentosReconexion: this.maxIntentosReconexion
    };
  }
}

// Crear instancia global
window.wsManager = new WebSocketManager();
