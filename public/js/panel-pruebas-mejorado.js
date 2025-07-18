// panel-pruebas-mejorado.js - Sistema mejorado de pruebas con controles individuales

(function() {
  'use strict';
  
  // Estado del panel
  let panelState = {
    realtimeActive: false,
    connectionActive: false,
    autoRefresh: false,
    autoRevert: true,
    refreshInterval: null,
    pilonaId: null,
    pilonaConfig: {},
    logEntries: []
  };
  
  // Inicializar panel
  window.PanelPruebasMejorado = {
    
    init: function() {
      console.log('Inicializando Panel de Pruebas Mejorado...');
      
      // Verificar si los elementos necesarios existen
      const elementosRequeridos = [
        'btn-toggle-realtime',
        'btn-probar-conexion',
        'panel-pruebas-coils'
      ];
      
      let todosPresentes = true;
      for (const id of elementosRequeridos) {
        if (!document.getElementById(id)) {
          console.warn(`Panel de Pruebas: Elemento requerido no encontrado: ${id}`);
          todosPresentes = false;
        }
      }
      
      // Si faltan elementos, no inicializar
      if (!todosPresentes) {
        console.warn('Panel de Pruebas: No se puede inicializar, faltan elementos');
        return;
      }
      
      // Evento del botón Realtime
      const btnRealtime = document.getElementById('btn-toggle-realtime');
      if (btnRealtime) {
        btnRealtime.addEventListener('click', this.toggleRealtime.bind(this));
      }
      
      // Evento del botón Probar Conexión
      const btnProbar = document.getElementById('btn-probar-conexion');
      if (btnProbar) {
        btnProbar.addEventListener('click', this.probarConexion.bind(this));
      }
      
      // Eventos de botones individuales
      document.addEventListener('click', (e) => {
        // Botón Leer
        if (e.target.closest('.test-btn-read')) {
          const btn = e.target.closest('.test-btn-read');
          const coil = btn.getAttribute('data-coil');
          this.leerCoil(coil);
        }
        
        // Botón Escribir
        if (e.target.closest('.test-btn-write')) {
          const btn = e.target.closest('.test-btn-write');
          const coil = btn.getAttribute('data-coil');
          const value = parseInt(btn.getAttribute('data-value'));
          this.escribirCoil(coil, value);
        }
        
        // Botón Toggle
        if (e.target.closest('.test-btn-toggle')) {
          const btn = e.target.closest('.test-btn-toggle');
          const coil = btn.getAttribute('data-coil');
          this.toggleCoil(coil);
        }
        
        // Botón Pulso
        if (e.target.closest('.test-btn-pulse')) {
          const btn = e.target.closest('.test-btn-pulse');
          const coil = btn.getAttribute('data-coil');
          this.pulsoCoil(coil);
        }
      });
      
      // Botón Leer Todos
      const btnReadAll = document.getElementById('test-btn-read-all');
      if (btnReadAll) {
        btnReadAll.addEventListener('click', this.leerTodos.bind(this));
      }
      
      // Auto refresh
      const chkAutoRefresh = document.getElementById('test-auto-refresh');
      if (chkAutoRefresh) {
        chkAutoRefresh.addEventListener('change', (e) => {
          this.toggleAutoRefresh(e.target.checked);
        });
      }
      
      // Auto revert
      const chkAutoRevert = document.getElementById('test-revert-writes');
      if (chkAutoRevert) {
        chkAutoRevert.addEventListener('change', (e) => {
          panelState.autoRevert = e.target.checked;
          this.addLog('info', `Auto-revertir ${e.target.checked ? 'activado' : 'desactivado'}`);
        });
      }
      
      // Limpiar al cerrar modal
      const modalPilona = document.getElementById('modal-pilona');
      if (modalPilona) {
        modalPilona.addEventListener('hidden.bs.modal', () => {
          // Verificar si el panel existe antes de limpiar
          if (document.getElementById('panel-pruebas-coils')) {
            this.limpiar();
          }
        });
        
        // Habilitar botón Realtime al abrir modal
        modalPilona.addEventListener('shown.bs.modal', () => {
          if (btnRealtime) {
            btnRealtime.disabled = false;
          }
        });
      }
    },
    
    // Toggle modo Realtime
    toggleRealtime: function() {
      const btn = document.getElementById('btn-toggle-realtime');
      const btnProbar = document.getElementById('btn-probar-conexion');
      
      if (!panelState.realtimeActive) {
        // Activar Realtime
        panelState.realtimeActive = true;
        btn.classList.add('active');
        btn.innerHTML = '<i class="fas fa-pause me-2"></i>Detener Realtime';
        btnProbar.disabled = false;
        
        // Pausar monitoreo si hay ID de pilona
        const pilonaId = document.getElementById('pilona-id').value;
        if (pilonaId) {
          this.pausarMonitoreo(pilonaId);
        }
        
        this.addLog('info', 'Modo Realtime activado');
        mostrarAlerta('success', 'Modo Realtime activado. Puede probar la conexión.');
        
      } else {
        // Desactivar Realtime
        this.desactivarRealtime();
      }
    },
    
    // Desactivar modo Realtime
    desactivarRealtime: function() {
      const btn = document.getElementById('btn-toggle-realtime');
      const btnProbar = document.getElementById('btn-probar-conexion');
      
      panelState.realtimeActive = false;
      btn.classList.remove('active');
      btn.innerHTML = '<i class="fas fa-play me-2"></i>Activar Modo Realtime';
      btnProbar.disabled = true;
      
      // Reanudar monitoreo
      const pilonaId = document.getElementById('pilona-id').value;
      if (pilonaId) {
        this.reanudarMonitoreo(pilonaId);
      }
      
      // Limpiar estados
      this.resetearPanel();
      
      this.addLog('info', 'Modo Realtime desactivado');
      mostrarAlerta('info', 'Modo Realtime desactivado. Monitoreo reanudado.');
    },
    
    // Probar conexión
    probarConexion: async function() {
      const ip = document.getElementById('pilona-direccion-ip').value;
      const puerto = document.getElementById('pilona-puerto').value;
      const unitId = document.getElementById('pilona-unit-id').value;
      const tipo = document.getElementById('pilona-tipo-dispositivo').value;
      
      if (!ip) {
        mostrarAlerta('error', 'Por favor ingrese la dirección IP');
        return;
      }
      
      // UI: Estado probando
      const btnProbar = document.getElementById('btn-probar-conexion');
      const ledConexion = document.getElementById('led-conexion');
      const textoEstado = document.getElementById('texto-estado-conexion');
      
      btnProbar.disabled = true;
      btnProbar.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Probando...';
      ledConexion.className = 'led led-yellow';
      textoEstado.textContent = 'Probando...';
      textoEstado.className = 'ms-2 text-warning';
      
      this.addLog('info', 'Probando conexión...');
      
      try {
        // Obtener configuración según tipo
        const config = this.obtenerConfiguracion(tipo);
        
        const response = await fetch('/api/pilonas/test-connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ip,
            puerto: parseInt(puerto) || 502,
            unitId: parseInt(unitId) || 1,
            tipo,
            ...config
          }),
          credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
          // Conexión exitosa
          panelState.connectionActive = true;
          panelState.pilonaConfig = { ip, puerto, unitId, tipo, ...config };
          
          ledConexion.className = 'led led-green';
          textoEstado.textContent = 'Conectado';
          textoEstado.className = 'ms-2 text-success';
          btnProbar.innerHTML = '<i class="fas fa-check me-2"></i>Conectado';
          
          // Mostrar panel y actualizar direcciones
          document.getElementById('panel-pruebas-coils').style.display = 'block';
          this.actualizarDirecciones(tipo, config);
          this.habilitarControles(true);
          
          this.addLog('success', 'Conexión establecida correctamente');
          mostrarAlerta('success', 'Conexión establecida. Puede realizar pruebas.');
          
          // Leer estados iniciales
          setTimeout(() => this.leerTodos(), 500);
          
        } else {
          throw new Error(result.error || 'Error de conexión');
        }
        
      } catch (error) {
        console.error('Error:', error);
        
        ledConexion.className = 'led led-red';
        textoEstado.textContent = 'Sin conexión';
        textoEstado.className = 'ms-2 text-danger';
        btnProbar.innerHTML = '<i class="fas fa-times me-2"></i>Error';
        
        this.addLog('error', `Error de conexión: ${error.message}`);
        mostrarAlerta('error', 'No se pudo conectar: ' + error.message);
        
      } finally {
        setTimeout(() => {
          btnProbar.disabled = false;
          btnProbar.innerHTML = '<i class="fas fa-plug me-2"></i>Probar Conexión';
        }, 2000);
      }
    },
    
    // Leer un coil específico
    leerCoil: async function(coil) {
      if (!panelState.connectionActive) return;
      
      const btn = document.querySelector(`.test-btn-read[data-coil="${coil}"]`);
      if (!btn || btn.disabled) return;
      
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      
      try {
        const response = await fetch('/api/pilonas/test-read-single', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...panelState.pilonaConfig,
            coil
          }),
          credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
          this.actualizarEstadoCoil(coil, result.value);
          this.addLog('success', `Lectura ${coil}: ${result.value}`);
        } else {
          throw new Error(result.error);
        }
        
      } catch (error) {
        this.addLog('error', `Error leyendo ${coil}: ${error.message}`);
        mostrarAlerta('error', `Error leyendo ${coil}`);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sync"></i> Leer';
      }
    },
    
    // Escribir en un coil
    escribirCoil: async function(coil, value) {
      if (!panelState.connectionActive) return;
      
      const btn = document.querySelector(`.test-btn-write[data-coil="${coil}"][data-value="${value}"]`);
      if (!btn || btn.disabled) return;
      
      // Deshabilitar botones de escritura temporalmente
      const writeButtons = document.querySelectorAll(`.test-btn-write[data-coil="${coil}"]`);
      writeButtons.forEach(b => b.disabled = true);
      
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
      
      try {
        const response = await fetch('/api/pilonas/test-write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...panelState.pilonaConfig,
            coil,
            value: value === 1
          }),
          credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
          this.actualizarEstadoCoil(coil, value === 1);
          this.addLog('success', `Escritura ${coil}: ${value}`);
          
          // Auto-revertir si está activado
          if (panelState.autoRevert && value === 1) {
            setTimeout(() => {
              this.addLog('info', `Auto-revirtiendo ${coil} a 0`);
              this.escribirCoil(coil, 0);
            }, 2000);
          }
        } else {
          throw new Error(result.error);
        }
        
      } catch (error) {
        this.addLog('error', `Error escribiendo ${coil}: ${error.message}`);
        mostrarAlerta('error', `Error escribiendo en ${coil}`);
      } finally {
        // Rehabilitar botones
        setTimeout(() => {
          writeButtons.forEach(b => {
            b.disabled = false;
            const val = b.getAttribute('data-value');
            b.innerHTML = val === '1' ? '<i class="fas fa-pen"></i> ON' : '<i class="fas fa-pen"></i> OFF';
          });
        }, 500);
      }
    },
    
    // Toggle de un coil
    toggleCoil: async function(coil) {
      if (!panelState.connectionActive) return;
      
      // Primero leer el estado actual
      try {
        const response = await fetch('/api/pilonas/test-read-single', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...panelState.pilonaConfig,
            coil
          }),
          credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success) {
          // Escribir el valor opuesto
          const newValue = result.value ? 0 : 1;
          this.escribirCoil(coil, newValue);
        }
        
      } catch (error) {
        this.addLog('error', `Error en toggle ${coil}: ${error.message}`);
      }
    },
    
    // Pulso en un coil
    pulsoCoil: async function(coil) {
      if (!panelState.connectionActive) return;
      
      const btn = document.querySelector(`.test-btn-pulse[data-coil="${coil}"]`);
      if (!btn || btn.disabled) return;
      
      btn.disabled = true;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Pulso';
      
      this.addLog('info', `Iniciando pulso en ${coil}`);
      
      try {
        // Escribir 1
        await this.escribirCoil(coil, 1);
        
        // Esperar 1 segundo
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Escribir 0
        await this.escribirCoil(coil, 0);
        
        this.addLog('success', `Pulso completado en ${coil}`);
        
      } catch (error) {
        this.addLog('error', `Error en pulso ${coil}: ${error.message}`);
      } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-hand-pointer"></i> Pulso';
      }
    },
    
    // Leer todos los estados
    leerTodos: async function() {
      if (!panelState.connectionActive) return;
      
      const btn = document.getElementById('test-btn-read-all');
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Leyendo...';
      }
      
      try {
        const response = await fetch('/api/pilonas/test-read-all', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(panelState.pilonaConfig),
          credentials: 'include'
        });
        
        const result = await response.json();
        
        if (result.success && result.states) {
          Object.entries(result.states).forEach(([coil, value]) => {
            this.actualizarEstadoCoil(coil, value);
          });
          this.addLog('success', 'Lectura completa realizada');
        }
        
      } catch (error) {
        this.addLog('error', `Error leyendo todos: ${error.message}`);
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-sync-alt me-1"></i> Leer Todos';
        }
      }
    },
    
    // Actualizar estado visual de un coil
    actualizarEstadoCoil: function(coil, value) {
      const led = document.getElementById(`test-led-${coil}`);
      const valueSpan = document.getElementById(`test-value-${coil}`);
      
      if (led) {
        if (value) {
          // LED encendido según el tipo de coil
          if (coil === 'subir') led.className = 'led led-red';
          else if (coil === 'bajar') led.className = 'led led-green';
          else if (coil === 'estado') led.className = 'led led-blue';
          else if (coil === 'bloqueo') led.className = 'led led-yellow';
          else if (coil === 'puntual') led.className = 'led led-blue';
        } else {
          led.className = 'led led-gray';
        }
      }
      
      if (valueSpan) {
        valueSpan.textContent = value ? '1' : '0';
        valueSpan.className = value ? 'badge bg-success' : 'badge bg-secondary';
      }
    },
    
    // Actualizar direcciones mostradas
    actualizarDirecciones: function(tipo, config) {
      if (tipo === 'LOGO') {
        // Para LOGO, mostrar elementos seleccionados
        ['subir', 'bajar', 'estado', 'bloqueo', 'puntual'].forEach(funcion => {
          const elemento = config.logoConfig?.[funcion]?.elemento || '-';
          const span = document.getElementById(`test-addr-${funcion}`);
          if (span) span.textContent = elemento;
        });
      } else {
        // Para Modbus genérico, mostrar direcciones
        ['subir', 'bajar', 'estado', 'bloqueo', 'puntual'].forEach(funcion => {
          const addr = config[`coil${funcion.charAt(0).toUpperCase() + funcion.slice(1)}`] || '-';
          const span = document.getElementById(`test-addr-${funcion}`);
          if (span) span.textContent = addr;
        });
      }
    },
    
    // Obtener configuración según tipo
    obtenerConfiguracion: function(tipo) {
      const config = {};
      
      if (tipo === 'LOGO') {
        // Configuración LOGO
        config.logoConfig = {};
        ['subir', 'bajar', 'estado', 'bloqueo', 'puntual'].forEach(funcion => {
          const select = document.querySelector(`.logo-function[data-function="${funcion}"]`);
          const mode = document.querySelector(`.logo-mode[data-function="${funcion}"]`);
          if (select && select.value) {
            config.logoConfig[funcion] = {
              elemento: select.value,
              modo: mode ? mode.value : 'write'
            };
          }
        });
      } else {
        // Modbus genérico
        config.coilSubir = parseInt(document.getElementById('pilona-coil-subir').value) || 0;
        config.coilBajar = parseInt(document.getElementById('pilona-coil-bajar').value) || 0;
        config.coilEstado = parseInt(document.getElementById('pilona-coil-estado').value) || 0;
        config.coilBloqueo = parseInt(document.getElementById('pilona-coil-bloqueo').value) || 0;
        config.coilPuntual = document.getElementById('pilona-coil-puntual').value || '';
      }
      
      return config;
    },
    
    // Habilitar/deshabilitar controles
    habilitarControles: function(habilitar) {
      const controles = document.querySelectorAll(
        '.test-btn-read, .test-btn-write, .test-btn-toggle, .test-btn-pulse, #test-btn-read-all, #test-auto-refresh'
      );
      
      controles.forEach(control => {
        control.disabled = !habilitar;
      });
    },
    
    // Toggle auto refresh
    toggleAutoRefresh: function(activar) {
      panelState.autoRefresh = activar;
      
      if (activar) {
        this.addLog('info', 'Auto-refresh activado (2s)');
        panelState.refreshInterval = setInterval(() => {
          this.leerTodos();
        }, 2000);
      } else {
        this.addLog('info', 'Auto-refresh desactivado');
        if (panelState.refreshInterval) {
          clearInterval(panelState.refreshInterval);
          panelState.refreshInterval = null;
        }
      }
    },
    
    // Pausar monitoreo
    pausarMonitoreo: async function(pilonaId) {
      try {
        const response = await fetch('/api/pilonas/pause-monitoring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pilonaId }),
          credentials: 'include'
        });
        
        if (response.ok) {
          console.log('Monitoreo pausado para pilona', pilonaId);
        }
      } catch (error) {
        console.error('Error pausando monitoreo:', error);
      }
    },
    
    // Reanudar monitoreo
    reanudarMonitoreo: async function(pilonaId) {
      try {
        const response = await fetch('/api/pilonas/resume-monitoring', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pilonaId }),
          credentials: 'include'
        });
        
        if (response.ok) {
          console.log('Monitoreo reanudado para pilona', pilonaId);
        }
      } catch (error) {
        console.error('Error reanudando monitoreo:', error);
      }
    },
    
    // Agregar entrada al log
    addLog: function(type, message) {
      const now = new Date();
      const time = now.toTimeString().split(' ')[0];
      const logContainer = document.getElementById('test-log-container');
      
      if (!logContainer) {
        // Si no existe el contenedor, solo loguear en consola
        console.log(`[Panel Pruebas ${type}] ${time}: ${message}`);
        return;
      }
      
      // Crear entrada
      const entry = document.createElement('div');
      entry.className = 'log-entry';
      entry.innerHTML = `
        <span class="log-time">${time}</span>
        <span class="log-${type}">${message}</span>
      `;
      
      // Agregar al inicio
      if (logContainer.firstChild?.classList?.contains('text-muted')) {
        logContainer.innerHTML = '';
      }
      logContainer.insertBefore(entry, logContainer.firstChild);
      
      // Limitar a 50 entradas
      while (logContainer.children.length > 50) {
        logContainer.removeChild(logContainer.lastChild);
      }
      
      // Guardar en el estado
      panelState.logEntries.unshift({ time, type, message });
      if (panelState.logEntries.length > 50) {
        panelState.logEntries = panelState.logEntries.slice(0, 50);
      }
    },
    
    // Resetear panel
    resetearPanel: function() {
      panelState.connectionActive = false;
      panelState.pilonaConfig = {};
      
      // Ocultar panel
      const panelPruebas = document.getElementById('panel-pruebas-coils');
      if (panelPruebas) {
        panelPruebas.style.display = 'none';
      }
      
      // Resetear LEDs y valores
      document.querySelectorAll('[id^="test-led-"]').forEach(led => {
        if (led) led.className = 'led led-gray';
      });
      
      document.querySelectorAll('[id^="test-value-"]').forEach(span => {
        if (span) {
          span.textContent = '-';
          span.className = 'badge bg-info';
        }
      });
      
      // Resetear estado conexión
      const ledConexion = document.getElementById('led-conexion');
      if (ledConexion) {
        ledConexion.className = 'led led-gray';
      }
      
      const textoEstado = document.getElementById('texto-estado-conexion');
      if (textoEstado) {
        textoEstado.textContent = 'Sin probar';
        textoEstado.className = 'ms-2 text-muted';
      }
      
      // Deshabilitar controles
      this.habilitarControles(false);
      
      // Detener auto refresh
      this.toggleAutoRefresh(false);
      const autoRefreshChk = document.getElementById('test-auto-refresh');
      if (autoRefreshChk) {
        autoRefreshChk.checked = false;
      }
    },
    
    // Limpiar todo
    limpiar: function() {
      // Desactivar Realtime si está activo
      if (panelState.realtimeActive) {
        this.desactivarRealtime();
      }
      
      // Resetear panel
      this.resetearPanel();
      
      // Limpiar log - verificar que el elemento existe
      const logContainer = document.getElementById('test-log-container');
      if (logContainer) {
        logContainer.innerHTML = '<div class="text-muted">Esperando acciones...</div>';
      }
      panelState.logEntries = [];
    }
  };
  
  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      window.PanelPruebasMejorado.init();
    });
  } else {
    window.PanelPruebasMejorado.init();
  }
  
})();