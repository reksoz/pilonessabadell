// test-connection.js - Módulo mejorado para pruebas de conexión en tiempo real con modo Realtime

class PilonaTestManager {
  constructor() {
    this.currentTest = null;
    this.isConnected = false;
    this.testInterval = null;
    this.realtimeMode = false;
    this.initializeEventListeners();
  }

  initializeEventListeners() {
    // Botón de modo Realtime
    document.getElementById('btn-toggle-realtime')?.addEventListener('click', () => {
      this.toggleRealtimeMode();
    });
    
    // Botón de probar conexión
    document.getElementById('btn-probar-conexion')?.addEventListener('click', () => {
      this.testConnection();
    });

    // Botones de escritura
    document.querySelectorAll('.test-btn-write').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const coil = e.currentTarget.dataset.coil;
        this.writeCoil(coil);
      });
    });
    
    // Botones de lectura individual
    document.querySelectorAll('.test-btn-read').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const coil = e.currentTarget.dataset.coil;
        this.readCoil(coil);
      });
    });

    // Actualizar direcciones cuando cambian los campos
    const updateAddresses = () => {
      this.updateTestAddresses();
    };

    // Para Modbus genérico
    ['pilona-coil-subir', 'pilona-coil-bajar', 'pilona-coil-estado', 'pilona-coil-bloqueo', 'pilona-coil-puntual'].forEach(id => {
      document.getElementById(id)?.addEventListener('input', updateAddresses);
    });

    // Para LOGO
    document.querySelectorAll('.logo-function').forEach(select => {
      select.addEventListener('change', updateAddresses);
    });

    document.querySelectorAll('.logo-mode').forEach(select => {
      select.addEventListener('change', updateAddresses);
    });

    // Cambio de tipo de dispositivo
    document.getElementById('pilona-tipo-dispositivo')?.addEventListener('change', () => {
      this.resetTest();
      updateAddresses();
    });
  }
  
  async toggleRealtimeMode() {
    const btn = document.getElementById('btn-toggle-realtime');
    const pilonaId = document.getElementById('pilona-id')?.value;
    
    if (!this.realtimeMode) {
      // Activar modo Realtime
      this.realtimeMode = true;
      btn.classList.remove('btn-outline-warning');
      btn.classList.add('btn-warning');
      btn.innerHTML = '<i class="fas fa-pause me-2"></i>Detener Realtime';
      
      // Pausar monitoreo si hay ID de pilona
      if (pilonaId) {
        try {
          await fetch('/api/pilonas/pause-monitoring', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ pilonaId })
          });
          
          mostrarNotificacion('info', 'Modo Realtime activado - Monitoreo pausado');
        } catch (error) {
          console.error('Error pausando monitoreo:', error);
        }
      }
      
      // Habilitar botones de prueba
      document.getElementById('btn-probar-conexion').disabled = false;
      
    } else {
      // Desactivar modo Realtime
      this.realtimeMode = false;
      btn.classList.remove('btn-warning');
      btn.classList.add('btn-outline-warning');
      btn.innerHTML = '<i class="fas fa-play me-2"></i>Activar Realtime';
      
      // Detener cualquier prueba activa
      this.resetTest();
      
      // Reanudar monitoreo si hay ID de pilona
      if (pilonaId) {
        try {
          await fetch('/api/pilonas/resume-monitoring', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            },
            body: JSON.stringify({ pilonaId })
          });
          
          mostrarNotificacion('info', 'Modo Realtime desactivado - Monitoreo reanudado');
        } catch (error) {
          console.error('Error reanudando monitoreo:', error);
        }
      }
      
      // Deshabilitar botones de prueba
      document.getElementById('btn-probar-conexion').disabled = true;
    }
  }

  updateTestAddresses() {
    const tipoDispositivo = document.getElementById('pilona-tipo-dispositivo').value;
    
    if (tipoDispositivo === 'LOGO') {
      // Actualizar direcciones desde configuración LOGO
      const functions = ['subir', 'bajar', 'estado', 'bloqueo', 'puntual'];
      functions.forEach(func => {
        const select = document.querySelector(`.logo-function[data-function="${func}"]`);
        const modeSelect = document.querySelector(`.logo-mode[data-function="${func}"]`);
        const elemento = select?.value || '-';
        const modo = modeSelect?.value || 'write';
        const addressSpan = document.getElementById(`test-addr-${func}`);
        const row = document.querySelector(`tr[data-function="${func}"]`);
        
        if (addressSpan) {
          if (elemento && elemento !== '-' && elemento !== '') {
            const address = this.getLogoAddress(elemento);
            addressSpan.textContent = `${elemento} (${address})`;
          } else {
            addressSpan.textContent = '-';
          }
        }
        
        // Actualizar tipo de botón según el modo
        if (row) {
          const readBtn = row.querySelector('.test-btn-read');
          const writeBtn = row.querySelector('.test-btn-write');
          
          if (modo === 'read') {
            // Modo lectura: solo botón de leer
            if (readBtn) readBtn.style.display = 'inline-block';
            if (writeBtn) writeBtn.style.display = 'none';
          } else {
            // Modo escritura: botón de escribir
            if (readBtn) readBtn.style.display = 'none';
            if (writeBtn) writeBtn.style.display = 'inline-block';
          }
        }
      });
    } else {
      // Actualizar direcciones desde campos Modbus
      const coilMappings = {
        'subir': 'pilona-coil-subir',
        'bajar': 'pilona-coil-bajar',
        'estado': 'pilona-coil-estado',
        'bloqueo': 'pilona-coil-bloqueo',
        'puntual': 'pilona-coil-puntual'
      };
      
      Object.entries(coilMappings).forEach(([func, fieldId]) => {
        const value = document.getElementById(fieldId)?.value || '-';
        const addressSpan = document.getElementById(`test-addr-${func}`);
        if (addressSpan) {
          addressSpan.textContent = value;
        }
        
        // Para Modbus genérico, estado siempre es lectura, otros son escritura
        const row = document.querySelector(`tr[data-function="${func}"]`);
        if (row) {
          const readBtn = row.querySelector('.test-btn-read');
          const writeBtn = row.querySelector('.test-btn-write');
          
          if (func === 'estado') {
            // Estado es solo lectura
            if (readBtn) readBtn.style.display = 'inline-block';
            if (writeBtn) writeBtn.style.display = 'none';
          } else {
            // Otros son escritura
            if (readBtn) readBtn.style.display = 'none';
            if (writeBtn) writeBtn.style.display = 'inline-block';
          }
        }
      });
    }
  }

  getLogoAddress(elemento) {
    // Simplificado - en producción usaría el mapeo completo
    const tipo = elemento.charAt(0);
    const num = parseInt(elemento.substring(1));
    
    if (tipo === 'I') return num;
    if (tipo === 'Q') return 8192 + num;
    if (tipo === 'M') return 8256 + num;
    if (tipo === 'V') return parseInt(elemento.split('.')[1]);
    
    return 0;
  }

  async testConnection() {
    if (!this.realtimeMode) {
      mostrarNotificacion('warning', 'Primero active el modo Realtime');
      return;
    }
    
    const btnTest = document.getElementById('btn-probar-conexion');
    const ledConexion = document.getElementById('led-conexion');
    const textoEstado = document.getElementById('texto-estado-conexion');
    const panelCoils = document.getElementById('panel-pruebas-coils');
    
    // Validar datos mínimos
    const ip = document.getElementById('pilona-direccion-ip').value;
    const puerto = document.getElementById('pilona-puerto').value;
    
    if (!ip || !puerto) {
      mostrarNotificacion('error', 'Por favor ingrese la dirección IP y puerto');
      return;
    }
    
    // Actualizar UI - Probando
    btnTest.disabled = true;
    btnTest.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Probando...';
    ledConexion.className = 'led led-yellow';
    textoEstado.textContent = 'Probando...';
    textoEstado.className = 'ms-2 text-warning';
    
    try {
      // Crear objeto temporal de pilona para la prueba
      const pilonaTest = this.buildTestPilona();
      
      // Probar conexión
      const response = await fetch('/api/pilonas/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(pilonaTest)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Conexión exitosa
        this.isConnected = true;
        ledConexion.className = 'led led-green';
        textoEstado.textContent = 'Conectado';
        textoEstado.className = 'ms-2 text-success';
        panelCoils.style.display = 'block';
        
        // Habilitar botones de prueba
        document.querySelectorAll('.test-btn-write, .test-btn-read').forEach(btn => {
          btn.disabled = false;
        });
        
        // Iniciar lectura automática de estados
        this.startAutoRead();
        
        mostrarNotificacion('success', 'Conexión establecida correctamente');
      } else {
        throw new Error(result.message || 'Error de conexión');
      }
    } catch (error) {
      // Error de conexión
      this.isConnected = false;
      ledConexion.className = 'led led-red';
      textoEstado.textContent = 'Error';
      textoEstado.className = 'ms-2 text-danger';
      panelCoils.style.display = 'none';
      
      mostrarNotificacion('error', `Error de conexión: ${error.message}`);
    } finally {
      // Restaurar botón
      btnTest.disabled = false;
      btnTest.innerHTML = '<i class="fas fa-plug me-2"></i>Probar Conexión';
    }
  }

  buildTestPilona() {
    const tipoDispositivo = document.getElementById('pilona-tipo-dispositivo').value;
    const pilona = {
      ID: document.getElementById('pilona-id')?.value || null, // Incluir ID si existe
      DIRECCION_IP: document.getElementById('pilona-direccion-ip').value,
      PUERTO: parseInt(document.getElementById('pilona-puerto').value),
      UNIT_ID: parseInt(document.getElementById('pilona-unit-id').value),
      TIPO_DISPOSITIVO: tipoDispositivo
    };
    
    if (tipoDispositivo === 'LOGO') {
      // Construir configuración LOGO
      pilona.LOGO_CONFIG = window.LOGOConfig ? window.LOGOConfig.getConfig() : {};
    } else {
      // Configuración Modbus genérica
      pilona.COIL_SUBIR = parseInt(document.getElementById('pilona-coil-subir').value) || 0;
      pilona.COIL_BAJAR = parseInt(document.getElementById('pilona-coil-bajar').value) || 0;
      pilona.COIL_ESTADO = parseInt(document.getElementById('pilona-coil-estado').value) || 0;
      pilona.COIL_BLOQUEO = parseInt(document.getElementById('pilona-coil-bloqueo').value) || 0;
      pilona.COIL_PUNTUAL = parseInt(document.getElementById('pilona-coil-puntual').value) || 0;
    }
    
    return pilona;
  }

  async writeCoil(coilType) {
    if (!this.isConnected) {
      mostrarNotificacion('warning', 'Primero debe probar la conexión');
      return;
    }
    
    const btn = document.querySelector(`.test-btn-write[data-coil="${coilType}"]`);
    const originalText = btn.innerHTML;
    
    try {
      // Actualizar UI
      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Escribiendo...';
      
      const pilonaTest = this.buildTestPilona();
      
      // Enviar comando de escritura
      const response = await fetch('/api/pilonas/test-write-coil', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          pilona: pilonaTest,
          coilType: coilType,
          value: true
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Actualizar LED temporalmente
        const led = document.getElementById(`test-led-${coilType}`);
        led.className = 'led led-small led-green';
        
        mostrarNotificacion('success', `Coil ${coilType} activado`);
        
        // Revertir después de 1 segundo
        setTimeout(async () => {
          try {
            await fetch('/api/pilonas/test-write-coil', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              },
              body: JSON.stringify({
                pilona: pilonaTest,
                coilType: coilType,
                value: false
              })
            });
            
            led.className = 'led led-small led-gray';
          } catch (error) {
            console.error('Error al revertir coil:', error);
          }
        }, 1000);
      } else {
        throw new Error(result.message || 'Error al escribir coil');
      }
    } catch (error) {
      mostrarNotificacion('error', `Error: ${error.message}`);
    } finally {
      // Restaurar botón
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  }

  async readCoil(coilType) {
    if (!this.isConnected) return;
    
    try {
      const pilonaTest = this.buildTestPilona();
      
      const response = await fetch('/api/pilonas/test-read-coil', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          pilona: pilonaTest,
          coilType: coilType
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
        const led = document.getElementById(`test-led-${coilType}`);
        // Para el LED: 0 = verde (bajada), 1 = rojo (subida)
        if (coilType === 'estado') {
          led.className = `led led-small ${result.value ? 'led-red' : 'led-green'}`;
        } else {
          led.className = `led led-small ${result.value ? 'led-green' : 'led-gray'}`;
        }
      }
    } catch (error) {
      console.error('Error leyendo coil:', error);
    }
  }

  startAutoRead() {
    // Detener lectura anterior si existe
    this.stopAutoRead();
    
    // Leer estados cada 2 segundos
    this.testInterval = setInterval(() => {
      if (this.isConnected && this.realtimeMode) {
        ['subir', 'bajar', 'estado', 'bloqueo', 'puntual'].forEach(coil => {
          // Solo leer si el elemento existe y está configurado
          const addressSpan = document.getElementById(`test-addr-${coil}`);
          if (addressSpan && addressSpan.textContent !== '-') {
            this.readCoil(coil);
          }
        });
      }
    }, 2000);
    
    // Lectura inicial inmediata
    ['subir', 'bajar', 'estado', 'bloqueo', 'puntual'].forEach(coil => {
      const addressSpan = document.getElementById(`test-addr-${coil}`);
      if (addressSpan && addressSpan.textContent !== '-') {
        this.readCoil(coil);
      }
    });
  }

  stopAutoRead() {
    if (this.testInterval) {
      clearInterval(this.testInterval);
      this.testInterval = null;
    }
  }

  resetTest() {
    this.isConnected = false;
    this.stopAutoRead();
    
    // Resetear UI
    document.getElementById('led-conexion').className = 'led led-gray';
    document.getElementById('texto-estado-conexion').textContent = 'Sin probar';
    document.getElementById('texto-estado-conexion').className = 'ms-2 text-muted';
    document.getElementById('panel-pruebas-coils').style.display = 'none';
    
    // Deshabilitar botones
    document.querySelectorAll('.test-btn-write, .test-btn-read').forEach(btn => {
      btn.disabled = true;
    });
    
    // Resetear LEDs
    ['subir', 'bajar', 'estado', 'bloqueo', 'puntual'].forEach(coil => {
      const led = document.getElementById(`test-led-${coil}`);
      if (led) led.className = 'led led-small led-gray';
    });
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  // Solo inicializar si estamos en la página de configuración
  if (document.getElementById('modal-pilona')) {
    window.pilonaTestManager = new PilonaTestManager();
    
    // Limpiar al cerrar el modal
    const modalPilona = document.getElementById('modal-pilona');
    modalPilona?.addEventListener('hidden.bs.modal', () => {
      // Si el modo realtime está activo, desactivarlo
      if (window.pilonaTestManager.realtimeMode) {
        window.pilonaTestManager.toggleRealtimeMode();
      }
      window.pilonaTestManager.resetTest();
    });
  }
});
