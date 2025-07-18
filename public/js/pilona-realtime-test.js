// pilona-realtime-test.js - Sistema de pruebas en tiempo real para pilonas

(function() {
  let testMode = false;
  let testInterval = null;
  let originalMonitoringState = null;
  let autoRefreshInterval = null;
  
  // Configuración del panel de pruebas
  window.PilonaRealtimeTest = {
    
    // Inicializar el sistema de pruebas
    init: function() {
      console.log('Inicializando sistema de pruebas en tiempo real...');
      
      // Event listeners para botones de prueba
      document.addEventListener('click', function(e) {
        // Botón de probar conexión
        if (e.target.id === 'btn-probar-conexion' || e.target.closest('#btn-probar-conexion')) {
          e.preventDefault();
          PilonaRealtimeTest.probarConexion();
        }
        
        // Botones de escritura
        if (e.target.classList.contains('test-btn-write') || e.target.closest('.test-btn-write')) {
          e.preventDefault();
          const btn = e.target.closest('.test-btn-write');
          const coilType = btn.getAttribute('data-coil');
          if (coilType) {
            PilonaRealtimeTest.escribirCoil(coilType);
          }
        }
        
        // Botones toggle
        if (e.target.classList.contains('test-btn-toggle') || e.target.closest('.test-btn-toggle')) {
          e.preventDefault();
          const btn = e.target.closest('.test-btn-toggle');
          const coilType = btn.getAttribute('data-coil');
          if (coilType) {
            PilonaRealtimeTest.toggleCoil(coilType);
          }
        }
        
        // Botón leer todos
        if (e.target.id === 'test-btn-read-all' || e.target.closest('#test-btn-read-all')) {
          e.preventDefault();
          PilonaRealtimeTest.leerEstados();
        }
      });
      
      // Checkbox modo pruebas
      const modoPruebas = document.getElementById('modo-pruebas-activo');
      if (modoPruebas) {
        modoPruebas.addEventListener('change', function() {
          PilonaRealtimeTest.toggleModoPruebas(this.checked);
        });
      }
      
      // Checkbox auto refresh
      const autoRefresh = document.getElementById('test-auto-refresh');
      if (autoRefresh) {
        autoRefresh.addEventListener('change', function() {
          PilonaRealtimeTest.toggleAutoRefresh(this.checked);
        });
      }
      
      // Limpiar al cerrar el modal
      const modalPilona = document.getElementById('modal-pilona');
      if (modalPilona) {
        modalPilona.addEventListener('hidden.bs.modal', function() {
          PilonaRealtimeTest.detenerPruebas();
        });
      }
    },
    
    // Probar conexión con la pilona
    probarConexion: async function() {
      const ip = document.getElementById('pilona-direccion-ip').value;
      const puerto = document.getElementById('pilona-puerto').value;
      const unitId = document.getElementById('pilona-unit-id').value;
      
      if (!ip) {
        alert('Por favor, ingrese una dirección IP');
        return;
      }
      
      // Actualizar UI
      const ledConexion = document.getElementById('led-conexion');
      const textoEstado = document.getElementById('texto-estado-conexion');
      const btnProbar = document.getElementById('btn-probar-conexion');
      
      // Estado: probando
      ledConexion.className = 'led led-yellow';
      textoEstado.textContent = 'Probando...';
      textoEstado.className = 'ms-2 text-warning';
      btnProbar.disabled = true;
      
      try {
        // Pausar monitorización si está activa
        if (window.socket && !testMode) {
          testMode = true;
          originalMonitoringState = true;
          window.socket.emit('pausar-monitorizacion', { ip });
        }
        
        const response = await fetch('/api/pilonas/test-connection', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ ip, puerto, unitId })
        });
        
        const result = await response.json();
        
        if (result.success) {
          // Conexión exitosa
          ledConexion.className = 'led led-green';
          textoEstado.textContent = 'Conectado';
          textoEstado.className = 'ms-2 text-success';
          
          // Mostrar panel de pruebas
          document.getElementById('panel-pruebas-coils').style.display = 'block';
          
          // Actualizar direcciones según el tipo de dispositivo
          this.actualizarDirecciones();
          
          // Habilitar botones de prueba
          document.querySelectorAll('.test-btn-write, .test-btn-toggle, #test-btn-read-all').forEach(btn => {
            btn.disabled = false;
          });
          
          // Habilitar checkboxes
          document.getElementById('modo-pruebas-activo').disabled = false;
          document.getElementById('test-auto-refresh').disabled = false;
          
          // Iniciar lectura periódica
          this.iniciarLecturaPeriodica();
          
        } else {
          // Error de conexión
          ledConexion.className = 'led led-red';
          textoEstado.textContent = 'Sin conexión';
          textoEstado.className = 'ms-2 text-danger';
          alert('No se pudo conectar: ' + (result.error || 'Error desconocido'));
        }
        
      } catch (error) {
        console.error('Error probando conexión:', error);
        ledConexion.className = 'led led-red';
        textoEstado.textContent = 'Error';
        textoEstado.className = 'ms-2 text-danger';
        alert('Error al probar conexión: ' + error.message);
      } finally {
        btnProbar.disabled = false;
      }
    },
    
    // Actualizar direcciones mostradas según configuración
    actualizarDirecciones: function() {
      const tipoDispositivo = document.getElementById('pilona-tipo-dispositivo').value;
      
      if (tipoDispositivo === 'LOGO') {
        // Para LOGO, mostrar las direcciones de los elementos seleccionados
        ['subir', 'bajar', 'estado', 'bloqueo', 'puntual'].forEach(funcion => {
          const select = document.querySelector(`.logo-function[data-function="${funcion}"]`);
          const addrElement = document.getElementById(`test-addr-${funcion}`);
          if (select && addrElement) {
            addrElement.textContent = select.value || '-';
          }
        });
      } else {
        // Para Modbus genérico, mostrar los números de coil
        document.getElementById('test-addr-subir').textContent = 
          document.getElementById('pilona-coil-subir').value || '-';
        document.getElementById('test-addr-bajar').textContent = 
          document.getElementById('pilona-coil-bajar').value || '-';
        document.getElementById('test-addr-estado').textContent = 
          document.getElementById('pilona-coil-estado').value || '-';
        document.getElementById('test-addr-bloqueo').textContent = 
          document.getElementById('pilona-coil-bloqueo').value || '-';
        document.getElementById('test-addr-puntual').textContent = 
          document.getElementById('pilona-coil-puntual').value || '-';
      }
    },
    
    // Escribir en un coil
    escribirCoil: async function(coilType) {
      const btn = document.querySelector(`.test-btn-write[data-coil="${coilType}"]`);
      if (!btn || btn.disabled) return;
      
      const ip = document.getElementById('pilona-direccion-ip').value;
      const puerto = document.getElementById('pilona-puerto').value;
      const unitId = document.getElementById('pilona-unit-id').value;
      const tipoDispositivo = document.getElementById('pilona-tipo-dispositivo').value;
      
      let coilAddress;
      if (tipoDispositivo === 'LOGO') {
        const select = document.querySelector(`.logo-function[data-function="${coilType}"]`);
        coilAddress = select ? select.value : null;
      } else {
        const coilElement = document.getElementById(`pilona-coil-${coilType}`);
        coilAddress = coilElement ? coilElement.value : null;
      }
      
      if (!coilAddress) {
        alert(`No se ha configurado el coil para ${coilType}`);
        return;
      }
      
      // Deshabilitar botón temporalmente
      btn.disabled = true;
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Escribiendo...';
      
      try {
        const response = await fetch('/api/pilonas/test-write', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ip,
            puerto,
            unitId,
            tipoDispositivo,
            coilType,
            coilAddress,
            value: true
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          // Actualizar LED temporalmente
          const led = document.getElementById(`test-led-${coilType}`);
          if (led) {
            led.className = 'led led-small led-green';
            setTimeout(() => {
              this.leerEstados(); // Actualizar con el estado real
            }, 1500);
          }
          
          // Si es escritura, revertir después de 1 segundo
          if (['subir', 'bajar', 'bloqueo', 'puntual'].includes(coilType)) {
            setTimeout(async () => {
              try {
                await fetch('/api/pilonas/test-write', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  credentials: 'include',
                  body: JSON.stringify({
                    ip,
                    puerto,
                    unitId,
                    tipoDispositivo,
                    coilType,
                    coilAddress,
                    value: false
                  })
                });
              } catch (err) {
                console.error('Error revirtiendo coil:', err);
              }
            }, 1000);
          }
        } else {
          alert('Error al escribir: ' + (result.error || 'Error desconocido'));
        }
        
      } catch (error) {
        console.error('Error escribiendo coil:', error);
        alert('Error al escribir: ' + error.message);
      } finally {
        setTimeout(() => {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }, 1500);
      }
    },
    
    // Toggle de un coil (cambiar estado)
    toggleCoil: async function(coilType) {
      const btn = document.querySelector(`.test-btn-toggle[data-coil="${coilType}"]`);
      if (!btn || btn.disabled) return;
      
      const ip = document.getElementById('pilona-direccion-ip').value;
      const puerto = document.getElementById('pilona-puerto').value;
      const unitId = document.getElementById('pilona-unit-id').value;
      const tipoDispositivo = document.getElementById('pilona-tipo-dispositivo').value;
      
      let coilAddress;
      if (tipoDispositivo === 'LOGO') {
        const select = document.querySelector(`.logo-function[data-function="${coilType}"]`);
        coilAddress = select ? select.value : null;
      } else {
        const coilElement = document.getElementById(`pilona-coil-${coilType}`);
        coilAddress = coilElement ? coilElement.value : null;
      }
      
      if (!coilAddress) {
        alert(`No se ha configurado el coil para ${coilType}`);
        return;
      }
      
      // Deshabilitar botón temporalmente
      btn.disabled = true;
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Toggle...';
      
      try {
        // Primero leer el estado actual
        const readResponse = await fetch('/api/pilonas/test-read-single', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ip,
            puerto,
            unitId,
            tipoDispositivo,
            coilType,
            coilAddress
          })
        });
        
        const readResult = await readResponse.json();
        
        if (readResult.success) {
          // Cambiar al estado opuesto
          const newValue = !readResult.value;
          
          const writeResponse = await fetch('/api/pilonas/test-write', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              ip,
              puerto,
              unitId,
              tipoDispositivo,
              coilType,
              coilAddress,
              value: newValue
            })
          });
          
          const writeResult = await writeResponse.json();
          
          if (writeResult.success) {
            // Actualizar LED inmediatamente
            const led = document.getElementById(`test-led-${coilType}`);
            const valueSpan = document.getElementById(`test-value-${coilType}`);
            if (led) {
              led.className = `led led-small ${newValue ? 'led-green' : 'led-gray'}`;
            }
            if (valueSpan) {
              valueSpan.textContent = newValue ? '1' : '0';
            }
          } else {
            alert('Error al cambiar estado: ' + (writeResult.error || 'Error desconocido'));
          }
        } else {
          alert('Error al leer estado actual: ' + (readResult.error || 'Error desconocido'));
        }
        
      } catch (error) {
        console.error('Error en toggle:', error);
        alert('Error al cambiar estado: ' + error.message);
      } finally {
        setTimeout(() => {
          btn.disabled = false;
          btn.innerHTML = originalText;
        }, 500);
      }
    },
    
    // Leer estados de todos los coils
    leerEstados: async function() {
      const ip = document.getElementById('pilona-direccion-ip').value;
      const puerto = document.getElementById('pilona-puerto').value;
      const unitId = document.getElementById('pilona-unit-id').value;
      const tipoDispositivo = document.getElementById('pilona-tipo-dispositivo').value;
      
      const coils = {};
      
      if (tipoDispositivo === 'LOGO') {
        ['subir', 'bajar', 'estado', 'bloqueo', 'puntual'].forEach(funcion => {
          const select = document.querySelector(`.logo-function[data-function="${funcion}"]`);
          if (select && select.value) {
            coils[funcion] = select.value;
          }
        });
      } else {
        ['subir', 'bajar', 'estado', 'bloqueo', 'puntual'].forEach(funcion => {
          const element = document.getElementById(`pilona-coil-${funcion}`);
          if (element && element.value) {
            coils[funcion] = element.value;
          }
        });
      }
      
      try {
        const response = await fetch('/api/pilonas/test-read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            ip,
            puerto,
            unitId,
            tipoDispositivo,
            coils
          })
        });
        
        const result = await response.json();
        
        if (result.success && result.states) {
          // Actualizar LEDs según los estados
          Object.entries(result.states).forEach(([coilType, state]) => {
            const led = document.getElementById(`test-led-${coilType}`);
            const valueSpan = document.getElementById(`test-value-${coilType}`);
            if (led) {
              led.className = `led led-small ${state ? 'led-green' : 'led-gray'}`;
            }
            if (valueSpan) {
              valueSpan.textContent = state ? '1' : '0';
            }
          });
        }
        
      } catch (error) {
        console.error('Error leyendo estados:', error);
      }
    },
    
    // Iniciar lectura periódica de estados
    iniciarLecturaPeriodica: function() {
      // Detener cualquier lectura anterior
      this.detenerLecturaPeriodica();
      
      // Leer estados cada 2 segundos
      testInterval = setInterval(() => {
        this.leerEstados();
      }, 2000);
      
      // Leer inmediatamente
      this.leerEstados();
    },
    
    // Detener lectura periódica
    detenerLecturaPeriodica: function() {
      if (testInterval) {
        clearInterval(testInterval);
        testInterval = null;
      }
    },
    
    // Detener todas las pruebas
    detenerPruebas: function() {
      this.detenerLecturaPeriodica();
      
      // Restaurar monitorización si estaba activa
      if (testMode && originalMonitoringState && window.socket) {
        const ip = document.getElementById('pilona-direccion-ip').value;
        if (ip) {
          window.socket.emit('reanudar-monitorizacion', { ip });
        }
        testMode = false;
        originalMonitoringState = null;
      }
      
      // Ocultar panel de pruebas
      const panel = document.getElementById('panel-pruebas-coils');
      if (panel) {
        panel.style.display = 'none';
      }
      
      // Resetear LEDs
      document.querySelectorAll('.led').forEach(led => {
        led.className = 'led led-gray';
      });
      
      // Resetear texto de estado
      const textoEstado = document.getElementById('texto-estado-conexion');
      if (textoEstado) {
        textoEstado.textContent = 'Sin probar';
        textoEstado.className = 'ms-2 text-muted';
      }
      
      // Deshabilitar botones de prueba
      document.querySelectorAll('.test-btn-write, .test-btn-toggle, #test-btn-read-all').forEach(btn => {
        btn.disabled = true;
      });
      
      // Deshabilitar y resetear checkboxes
      const modoPruebas = document.getElementById('modo-pruebas-activo');
      const autoRefresh = document.getElementById('test-auto-refresh');
      if (modoPruebas) {
        modoPruebas.checked = false;
        modoPruebas.disabled = true;
      }
      if (autoRefresh) {
        autoRefresh.checked = false;
        autoRefresh.disabled = true;
      }
      
      // Detener auto refresh si está activo
      this.toggleAutoRefresh(false);
    },
    
    // Toggle modo pruebas
    toggleModoPruebas: function(activo) {
      const badge = document.getElementById('estado-modo-pruebas');
      const ip = document.getElementById('pilona-direccion-ip').value;
      
      if (activo) {
        testMode = true;
        badge.textContent = 'ACTIVO';
        badge.className = 'badge bg-success ms-1';
        
        // Pausar monitorización
        if (window.socket && ip) {
          window.socket.emit('pausar-monitorizacion-pilona', { ip });
        }
      } else {
        testMode = false;
        badge.textContent = 'INACTIVO';
        badge.className = 'badge bg-warning text-dark ms-1';
        
        // Reanudar monitorización
        if (window.socket && ip) {
          window.socket.emit('reanudar-monitorizacion-pilona', { ip });
        }
      }
    },
    
    // Toggle actualización automática
    toggleAutoRefresh: function(activo) {
      if (activo) {
        // Detener cualquier intervalo anterior
        if (autoRefreshInterval) {
          clearInterval(autoRefreshInterval);
        }
        
        // Iniciar nuevo intervalo de 1 segundo
        autoRefreshInterval = setInterval(() => {
          this.leerEstados();
        }, 1000);
        
        // Leer inmediatamente
        this.leerEstados();
      } else {
        // Detener intervalo
        if (autoRefreshInterval) {
          clearInterval(autoRefreshInterval);
          autoRefreshInterval = null;
        }
      }
    }
  };
  
  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      window.PilonaRealtimeTest.init();
    });
  } else {
    window.PilonaRealtimeTest.init();
  }
  
})();
