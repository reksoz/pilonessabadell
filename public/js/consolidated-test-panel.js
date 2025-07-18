// consolidated-test-panel.js - Panel de pruebas consolidado y corregido

// Estado global del panel de pruebas
window.testPanelState = {
  conexionActiva: false,
  pilonaId: null,
  tipoDispositivo: 'MODBUS_GENERICO',
  intervalId: null,
  autoRefreshEnabled: false
};

// Función para mostrar alertas (compatibilidad)
function mostrarNotificacion(tipo, mensaje) {
  if (typeof mostrarAlerta === 'function') {
    mostrarAlerta(tipo, mensaje);
  } else {
    console.log(`${tipo.toUpperCase()}: ${mensaje}`);
    alert(`${tipo.toUpperCase()}: ${mensaje}`);
  }
}

// Función para mostrar alertas (principal)
function mostrarAlerta(tipo, mensaje) {
  console.log(`Alerta ${tipo}: ${mensaje}`);
  
  // Crear elemento toast
  const toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
  toastContainer.style.zIndex = '9999';
  
  const toast = document.createElement('div');
  toast.className = `toast ${tipo === 'error' ? 'bg-danger' : tipo === 'success' ? 'bg-success' : 'bg-info'} text-white`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  
  toast.innerHTML = `
    <div class="toast-header">
      <strong class="me-auto">${tipo === 'error' ? 'Error' : tipo === 'success' ? 'Éxito' : 'Información'}</strong>
      <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Cerrar"></button>
    </div>
    <div class="toast-body">
      ${mensaje}
    </div>
  `;
  
  toastContainer.appendChild(toast);
  document.body.appendChild(toastContainer);
  
  // Mostrar toast
  try {
    const bsToast = new bootstrap.Toast(toast, { autohide: true, delay: 5000 });
    bsToast.show();
  } catch (error) {
    console.error('Error mostrando toast:', error);
    alert(`${tipo.toUpperCase()}: ${mensaje}`);
  }
  
  // Eliminar después de ocultarse
  toast.addEventListener('hidden.bs.toast', () => {
    toastContainer.remove();
  });
}

// Inicializar panel de pruebas consolidado
function initConsolidatedTestPanel() {
  console.log('Inicializando panel de pruebas consolidado...');
  
  // Limpiar listeners existentes para evitar duplicados
  document.querySelectorAll('.test-listener-added').forEach(el => {
    el.classList.remove('test-listener-added');
  });
  
  // Event listener para el botón de probar conexión
  const btnProbarConexion = document.getElementById('btn-probar-conexion');
  if (btnProbarConexion && !btnProbarConexion.classList.contains('test-listener-added')) {
    btnProbarConexion.addEventListener('click', probarConexionConsolidada);
    btnProbarConexion.classList.add('test-listener-added');
  }
  
  // Event listener para el checkbox modo pruebas
  const modoPruebasCheckbox = document.getElementById('modo-pruebas-activo');
  if (modoPruebasCheckbox && !modoPruebasCheckbox.classList.contains('test-listener-added')) {
    modoPruebasCheckbox.addEventListener('change', function() {
      actualizarModoPruebasConsolidado(this.checked);
    });
    modoPruebasCheckbox.classList.add('test-listener-added');
  }
  
  // Event listener para auto-refresh
  const autoRefreshCheckbox = document.getElementById('test-auto-refresh');
  if (autoRefreshCheckbox && !autoRefreshCheckbox.classList.contains('test-listener-added')) {
    autoRefreshCheckbox.addEventListener('change', function() {
      window.testPanelState.autoRefreshEnabled = this.checked;
      if (this.checked && window.testPanelState.conexionActiva) {
        iniciarLecturaPeriodicaConsolidada();
      } else if (!this.checked && window.testPanelState.intervalId) {
        clearInterval(window.testPanelState.intervalId);
        window.testPanelState.intervalId = null;
      }
    });
    autoRefreshCheckbox.classList.add('test-listener-added');
  }
  
  // Event listeners para botones de escritura
  document.querySelectorAll('.test-btn-write').forEach(btn => {
    if (!btn.classList.contains('test-listener-added')) {
      btn.addEventListener('click', function() {
        const coil = this.getAttribute('data-coil');
        escribirCoilConsolidado(coil);
      });
      btn.classList.add('test-listener-added');
    }
  });
  
  // Event listeners para botones de toggle
  document.querySelectorAll('.test-btn-toggle').forEach(btn => {
    if (!btn.classList.contains('test-listener-added')) {
      btn.addEventListener('click', function() {
        const coil = this.getAttribute('data-coil');
        toggleCoilConsolidado(coil);
      });
      btn.classList.add('test-listener-added');
    }
  });
  
  // Botón para leer todos los estados
  const btnReadAll = document.getElementById('test-btn-read-all');
  if (btnReadAll && !btnReadAll.classList.contains('test-listener-added')) {
    btnReadAll.addEventListener('click', leerTodosLosEstadosConsolidado);
    btnReadAll.classList.add('test-listener-added');
  }
  
  // Listener para cambio de tipo de dispositivo
  const selectTipo = document.getElementById('pilona-tipo-dispositivo');
  if (selectTipo && !selectTipo.classList.contains('test-listener-added')) {
    selectTipo.addEventListener('change', function() {
      window.testPanelState.tipoDispositivo = this.value;
      resetearPanelPruebasConsolidado();
    });
    selectTipo.classList.add('test-listener-added');
  }
  
  console.log('Panel de pruebas consolidado inicializado');
}

// Probar conexión consolidada
async function probarConexionConsolidada() {
  console.log('Probando conexión consolidada...');
  
  // Obtener datos del formulario
  const direccionIP = document.getElementById('pilona-direccion-ip')?.value;
  const puerto = document.getElementById('pilona-puerto')?.value;
  const unitId = document.getElementById('pilona-unit-id')?.value;
  const tipoDispositivo = document.getElementById('pilona-tipo-dispositivo')?.value;
  
  if (!direccionIP) {
    mostrarAlerta('error', 'Por favor ingrese la dirección IP');
    return;
  }
  
  // Validar configuración según tipo
  if (tipoDispositivo === 'LOGO') {
    if (!validarConfiguracionLOGOConsolidada()) {
      return;
    }
  } else {
    if (!validarConfiguracionModbusConsolidada()) {
      return;
    }
  }
  
  // Actualizar UI
  const btnProbar = document.getElementById('btn-probar-conexion');
  const ledConexion = document.getElementById('led-conexion');
  const textoEstado = document.getElementById('texto-estado-conexion');
  
  if (btnProbar) {
    btnProbar.disabled = true;
    btnProbar.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Probando...';
  }
  
  if (ledConexion) ledConexion.className = 'led led-yellow';
  if (textoEstado) {
    textoEstado.textContent = 'Probando...';
    textoEstado.className = 'ms-2 text-warning';
  }
  
  try {
    // Preparar datos de conexión
    const datosConexion = {
      direccionIP,
      puerto: parseInt(puerto) || 502,
      unitId: parseInt(unitId) || 1,
      tipoDispositivo
    };
    
    // Agregar configuración específica
    if (tipoDispositivo === 'LOGO' && window.LOGOConfig) {
      datosConexion.logoConfig = window.LOGOConfig.getConfig();
    } else {
      datosConexion.coilSubir = parseInt(document.getElementById('pilona-coil-subir')?.value) || 0;
      datosConexion.coilBajar = parseInt(document.getElementById('pilona-coil-bajar')?.value) || 0;
      datosConexion.coilEstado = parseInt(document.getElementById('pilona-coil-estado')?.value) || 0;
      datosConexion.coilBloqueo = parseInt(document.getElementById('pilona-coil-bloqueo')?.value) || 0;
      datosConexion.coilPuntual = document.getElementById('pilona-coil-puntual')?.value || '';
    }
    
    // Hacer petición de prueba
    const response = await fetch('/api/pilonas/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(datosConexion),
      credentials: 'include'
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      // Conexión exitosa
      if (ledConexion) ledConexion.className = 'led led-green';
      if (textoEstado) {
        textoEstado.textContent = 'Conectado';
        textoEstado.className = 'ms-2 text-success';
      }
      if (btnProbar) {
        btnProbar.innerHTML = '<i class="fas fa-check me-2"></i>Conectado';
        btnProbar.classList.remove('btn-primary');
        btnProbar.classList.add('btn-success');
      }
      
      // Marcar conexión como activa
      window.testPanelState.conexionActiva = true;
      
      // Actualizar tabla de pruebas
      actualizarTablaPruebasConsolidada(datosConexion);
      
      // Habilitar controles
      habilitarControlesPruebaConsolidados(true);
      
      // Verificar si modo pruebas ya está activo
      const modoPruebasCheckbox = document.getElementById('modo-pruebas-activo');
      if (modoPruebasCheckbox && modoPruebasCheckbox.checked) {
        mostrarPanelPruebasConsolidado(true);
      }
      
      mostrarAlerta('success', 'Conexión establecida correctamente');
    } else {
      throw new Error(result.error || 'Error de conexión');
    }
  } catch (error) {
    console.error('Error probando conexión:', error);
    
    // Estado: error
    if (ledConexion) ledConexion.className = 'led led-red';
    if (textoEstado) {
      textoEstado.textContent = 'Error';
      textoEstado.className = 'ms-2 text-danger';
    }
    if (btnProbar) {
      btnProbar.innerHTML = '<i class="fas fa-times me-2"></i>Error';
      btnProbar.classList.remove('btn-primary', 'btn-success');
      btnProbar.classList.add('btn-danger');
    }
    
    // Ocultar panel y deshabilitar controles
    mostrarPanelPruebasConsolidado(false);
    window.testPanelState.conexionActiva = false;
    habilitarControlesPruebaConsolidados(false);
    
    mostrarAlerta('error', 'Error de conexión: ' + error.message);
  } finally {
    // Rehabilitar botón después de 2 segundos
    setTimeout(() => {
      if (btnProbar) {
        btnProbar.disabled = false;
        if (window.testPanelState.conexionActiva) {
          btnProbar.innerHTML = '<i class="fas fa-sync me-2"></i>Actualizar';
        } else {
          btnProbar.innerHTML = '<i class="fas fa-plug me-2"></i>Probar Conexión';
          btnProbar.classList.remove('btn-success', 'btn-danger');
          btnProbar.classList.add('btn-primary');
        }
      }
    }, 2000);
  }
}

// Validar configuración LOGO
function validarConfiguracionLOGOConsolidada() {
  if (!window.LOGOConfig) {
    mostrarAlerta('error', 'Configuración LOGO no disponible');
    return false;
  }
  
  const config = window.LOGOConfig.getConfig();
  const funcionesRequeridas = ['subir', 'bajar', 'estado', 'bloqueo'];
  
  // Buscar funciones en todas las secciones del config
  const funcionesEncontradas = {};
  Object.keys(config).forEach(seccion => {
    if (typeof config[seccion] === 'object' && seccion !== 'version') {
      Object.keys(config[seccion]).forEach(elemento => {
        const configElemento = config[seccion][elemento];
        if (configElemento && configElemento.funcion) {
          funcionesEncontradas[configElemento.funcion] = elemento;
        }
      });
    }
  });
  
  for (const funcion of funcionesRequeridas) {
    if (!funcionesEncontradas[funcion]) {
      mostrarAlerta('error', `Por favor configure la función ${funcion.toUpperCase()} en la configuración LOGO`);
      return false;
    }
  }
  
  return true;
}

// Validar configuración Modbus
function validarConfiguracionModbusConsolidada() {
  const campos = ['pilona-coil-subir', 'pilona-coil-bajar', 'pilona-coil-estado', 'pilona-coil-bloqueo'];
  
  for (const campoId of campos) {
    const campo = document.getElementById(campoId);
    if (!campo || !campo.value || campo.value.trim() === '') {
      const label = campo?.previousElementSibling?.textContent || campoId;
      mostrarAlerta('error', `Por favor complete el campo ${label}`);
      return false;
    }
  }
  
  return true;
}

// Actualizar tabla de pruebas
function actualizarTablaPruebasConsolidada(datosConexion) {
  console.log('Actualizando tabla de pruebas consolidada');
  
  const { tipoDispositivo } = datosConexion;
  
  if (tipoDispositivo === 'LOGO') {
    if (datosConexion.logoConfig) {
      const funcionesEncontradas = {};
      Object.keys(datosConexion.logoConfig).forEach(seccion => {
        if (typeof datosConexion.logoConfig[seccion] === 'object' && seccion !== 'version') {
          Object.keys(datosConexion.logoConfig[seccion]).forEach(elemento => {
            const config = datosConexion.logoConfig[seccion][elemento];
            if (config && config.funcion) {
              funcionesEncontradas[config.funcion] = elemento;
            }
          });
        }
      });
      
      ['subir', 'bajar', 'estado', 'bloqueo', 'puntual'].forEach(funcion => {
        const elem = document.getElementById(`test-addr-${funcion}`);
        if (elem) elem.textContent = funcionesEncontradas[funcion] || '-';
      });
    }
  } else {
    // Modbus genérico
    const mappings = {
      'subir': datosConexion.coilSubir || '0',
      'bajar': datosConexion.coilBajar || '0',
      'estado': datosConexion.coilEstado || '0',
      'bloqueo': datosConexion.coilBloqueo || '0',
      'puntual': datosConexion.coilPuntual || '-'
    };
    
    Object.keys(mappings).forEach(funcion => {
      const elem = document.getElementById(`test-addr-${funcion}`);
      if (elem) elem.textContent = mappings[funcion];
    });
  }
}

// Habilitar/deshabilitar controles de prueba
function habilitarControlesPruebaConsolidados(habilitar) {
  // Habilitar checkbox de modo pruebas
  const modoPruebasCheckbox = document.getElementById('modo-pruebas-activo');
  if (modoPruebasCheckbox) modoPruebasCheckbox.disabled = !habilitar;
  
  // Habilitar botones de prueba
  document.querySelectorAll('.test-btn-write, .test-btn-toggle, #test-btn-read-all').forEach(btn => {
    btn.disabled = !habilitar;
  });
  
  // Habilitar checkbox de auto-refresh
  const autoRefreshCheckbox = document.getElementById('test-auto-refresh');
  if (autoRefreshCheckbox) autoRefreshCheckbox.disabled = !habilitar;
}

// Mostrar/ocultar panel de pruebas
function mostrarPanelPruebasConsolidado(mostrar) {
  const panelCoils = document.getElementById('panel-pruebas-coils');
  if (panelCoils) {
    panelCoils.style.display = mostrar ? 'block' : 'none';
    console.log(`Panel de pruebas ${mostrar ? 'mostrado' : 'ocultado'}`);
  }
}

// Actualizar modo pruebas
function actualizarModoPruebasConsolidado(activo) {
  console.log('Actualizando modo pruebas consolidado:', activo);
  
  const estadoModoPruebas = document.getElementById('estado-modo-pruebas');
  
  if (activo) {
    if (!window.testPanelState.conexionActiva) {
      mostrarAlerta('warning', 'Primero debe probar la conexión para activar el modo pruebas');
      const modoPruebasCheckbox = document.getElementById('modo-pruebas-activo');
      if (modoPruebasCheckbox) modoPruebasCheckbox.checked = false;
      return;
    }
    
    if (estadoModoPruebas) {
      estadoModoPruebas.textContent = 'ACTIVO';
      estadoModoPruebas.classList.remove('bg-warning');
      estadoModoPruebas.classList.add('bg-success');
    }
    
    mostrarPanelPruebasConsolidado(true);
  } else {
    if (estadoModoPruebas) {
      estadoModoPruebas.textContent = 'INACTIVO';
      estadoModoPruebas.classList.remove('bg-success');
      estadoModoPruebas.classList.add('bg-warning');
    }
    
    mostrarPanelPruebasConsolidado(false);
    
    // Detener auto-refresh
    const autoRefreshCheckbox = document.getElementById('test-auto-refresh');
    if (autoRefreshCheckbox && autoRefreshCheckbox.checked) {
      autoRefreshCheckbox.checked = false;
      window.testPanelState.autoRefreshEnabled = false;
      if (window.testPanelState.intervalId) {
        clearInterval(window.testPanelState.intervalId);
        window.testPanelState.intervalId = null;
      }
    }
  }
}

// Escribir coil
async function escribirCoilConsolidado(coil) {
  if (!window.testPanelState.conexionActiva) {
    mostrarAlerta('error', 'No hay conexión activa');
    return;
  }
  
  const btn = document.querySelector(`.test-btn-write[data-coil="${coil}"]`);
  const led = document.getElementById(`test-led-${coil}`);
  const valueSpan = document.getElementById(`test-value-${coil}`);
  
  if (!btn || !led) {
    console.error('Elementos de UI no encontrados para coil:', coil);
    return;
  }
  
  const datosConexion = obtenerDatosConexionActualesConsolidados();
  datosConexion.coil = coil;
  datosConexion.valor = 1;
  
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Escribiendo...';
  
  try {
    const response = await fetch('/api/pilonas/test-write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosConexion),
      credentials: 'include'
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      led.className = 'led led-small led-green';
      if (valueSpan) valueSpan.textContent = '1';
      btn.innerHTML = '<i class="fas fa-check"></i> OK';
      btn.classList.add('btn-success');
      
      mostrarAlerta('success', `Valor 1 escrito en ${coil}`);
      
      // Revertir a 0 después de 1 segundo para comandos
      if (coil !== 'estado') {
        setTimeout(async () => {
          try {
            datosConexion.valor = 0;
            await fetch('/api/pilonas/test-write', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(datosConexion),
              credentials: 'include'
            });
            led.className = 'led led-small led-gray';
            if (valueSpan) valueSpan.textContent = '0';
          } catch (e) {
            console.error('Error revertiendo:', e);
          }
        }, 1000);
      }
    } else {
      throw new Error(result.error || 'Error al escribir');
    }
  } catch (error) {
    console.error('Error escribiendo coil:', error);
    led.className = 'led led-small led-red';
    btn.innerHTML = '<i class="fas fa-times"></i> Error';
    btn.classList.add('btn-danger');
    mostrarAlerta('error', 'Error al escribir: ' + error.message);
  } finally {
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-pen-square"></i> Escribir 1';
      btn.classList.remove('btn-success', 'btn-danger');
    }, 2000);
  }
}

// Toggle coil
async function toggleCoilConsolidado(coil) {
  if (!window.testPanelState.conexionActiva) {
    mostrarAlerta('error', 'No hay conexión activa');
    return;
  }
  
  const btn = document.querySelector(`.test-btn-toggle[data-coil="${coil}"]`);
  const led = document.getElementById(`test-led-${coil}`);
  const valueSpan = document.getElementById(`test-value-${coil}`);
  
  if (!btn || !led) {
    console.error('Elementos de UI no encontrados para toggle coil:', coil);
    return;
  }
  
  const valorActual = led.classList.contains('led-green') ? 1 : 0;
  const nuevoValor = valorActual === 0 ? 1 : 0;
  
  const datosConexion = obtenerDatosConexionActualesConsolidados();
  datosConexion.coil = coil;
  datosConexion.valor = nuevoValor;
  
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Toggle...';
  
  try {
    const response = await fetch('/api/pilonas/test-write', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosConexion),
      credentials: 'include'
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      if (nuevoValor === 1) {
        led.className = 'led led-small led-green';
      } else {
        led.className = 'led led-small led-gray';
      }
      
      if (valueSpan) valueSpan.textContent = nuevoValor.toString();
      btn.innerHTML = '<i class="fas fa-check"></i> OK';
      btn.classList.add('btn-success');
      
      mostrarAlerta('success', `Valor ${nuevoValor} escrito en ${coil}`);
    } else {
      throw new Error(result.error || 'Error al escribir');
    }
  } catch (error) {
    console.error('Error toggle coil:', error);
    led.className = 'led led-small led-red';
    btn.innerHTML = '<i class="fas fa-times"></i> Error';
    btn.classList.add('btn-danger');
    mostrarAlerta('error', 'Error al escribir: ' + error.message);
  } finally {
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-exchange-alt"></i> Toggle';
      btn.classList.remove('btn-success', 'btn-danger');
    }, 2000);
  }
}

// Leer todos los estados
async function leerTodosLosEstadosConsolidado() {
  if (!window.testPanelState.conexionActiva) {
    mostrarAlerta('error', 'No hay conexión activa');
    return;
  }
  
  const btn = document.getElementById('test-btn-read-all');
  if (!btn) return;
  
  const datosConexion = obtenerDatosConexionActualesConsolidados();
  
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Leyendo...';
  
  try {
    const response = await fetch('/api/pilonas/test-read', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(datosConexion),
      credentials: 'include'
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      actualizarLEDsConsolidados(result.valores);
      btn.innerHTML = '<i class="fas fa-check me-1"></i> Leído';
      btn.classList.add('btn-success');
      mostrarAlerta('success', 'Estados leídos correctamente');
    } else {
      throw new Error(result.error || 'Error al leer');
    }
  } catch (error) {
    console.error('Error leyendo estados:', error);
    btn.innerHTML = '<i class="fas fa-times me-1"></i> Error';
    btn.classList.add('btn-danger');
    mostrarAlerta('error', 'Error al leer: ' + error.message);
  } finally {
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sync-alt me-1"></i> Leer Todos los Estados';
      btn.classList.remove('btn-success', 'btn-danger');
    }, 2000);
  }
}

// Actualizar LEDs
function actualizarLEDsConsolidados(valores) {
  if (!valores) return;
  
  Object.keys(valores).forEach(coil => {
    const led = document.getElementById(`test-led-${coil}`);
    const valueSpan = document.getElementById(`test-value-${coil}`);
    
    if (led && valueSpan) {
      const valor = valores[coil];
      valueSpan.textContent = valor ? '1' : '0';
      
      if (valor) {
        led.className = 'led led-small led-green';
      } else {
        led.className = 'led led-small led-gray';
      }
    }
  });
}

// Obtener datos de conexión actuales
function obtenerDatosConexionActualesConsolidados() {
  const tipoDispositivo = document.getElementById('pilona-tipo-dispositivo')?.value || 'MODBUS_GENERICO';
  
  const datos = {
    direccionIP: document.getElementById('pilona-direccion-ip')?.value,
    puerto: parseInt(document.getElementById('pilona-puerto')?.value) || 502,
    unitId: parseInt(document.getElementById('pilona-unit-id')?.value) || 1,
    tipoDispositivo
  };
  
  if (tipoDispositivo === 'LOGO' && window.LOGOConfig) {
    datos.logoConfig = window.LOGOConfig.getConfig();
  } else {
    datos.coilSubir = parseInt(document.getElementById('pilona-coil-subir')?.value) || 0;
    datos.coilBajar = parseInt(document.getElementById('pilona-coil-bajar')?.value) || 0;
    datos.coilEstado = parseInt(document.getElementById('pilona-coil-estado')?.value) || 0;
    datos.coilBloqueo = parseInt(document.getElementById('pilona-coil-bloqueo')?.value) || 0;
    datos.coilPuntual = document.getElementById('pilona-coil-puntual')?.value || '';
  }
  
  return datos;
}

// Lectura periódica
function iniciarLecturaPeriodicaConsolidada() {
  if (window.testPanelState.intervalId) {
    clearInterval(window.testPanelState.intervalId);
  }
  
  const datosConexion = obtenerDatosConexionActualesConsolidados();
  
  window.testPanelState.intervalId = setInterval(async () => {
    if (!window.testPanelState.conexionActiva || !window.testPanelState.autoRefreshEnabled) {
      clearInterval(window.testPanelState.intervalId);
      window.testPanelState.intervalId = null;
      return;
    }
    
    try {
      const response = await fetch('/api/pilonas/test-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datosConexion),
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.valores) {
          actualizarLEDsConsolidados(result.valores);
        }
      }
    } catch (error) {
      console.error('Error en lectura periódica:', error);
    }
  }, 1000);
}

// Resetear panel
function resetearPanelPruebasConsolidado() {
  console.log('Reseteando panel de pruebas consolidado...');
  
  if (window.testPanelState.intervalId) {
    clearInterval(window.testPanelState.intervalId);
    window.testPanelState.intervalId = null;
  }
  
  window.testPanelState.conexionActiva = false;
  window.testPanelState.autoRefreshEnabled = false;
  
  // Resetear checkboxes
  const modoPruebasCheckbox = document.getElementById('modo-pruebas-activo');
  if (modoPruebasCheckbox) {
    modoPruebasCheckbox.checked = false;
    modoPruebasCheckbox.disabled = true;
  }
  
  const autoRefreshCheckbox = document.getElementById('test-auto-refresh');
  if (autoRefreshCheckbox) {
    autoRefreshCheckbox.checked = false;
    autoRefreshCheckbox.disabled = true;
  }
  
  actualizarModoPruebasConsolidado(false);
  
  // Resetear UI de conexión
  const ledConexion = document.getElementById('led-conexion');
  const textoEstado = document.getElementById('texto-estado-conexion');
  const btnProbar = document.getElementById('btn-probar-conexion');
  
  if (ledConexion) ledConexion.className = 'led led-gray';
  if (textoEstado) {
    textoEstado.textContent = 'Sin probar';
    textoEstado.className = 'ms-2 text-muted';
  }
  if (btnProbar) {
    btnProbar.innerHTML = '<i class="fas fa-plug me-2"></i>Probar Conexión';
    btnProbar.classList.remove('btn-success', 'btn-danger');
    btnProbar.classList.add('btn-primary');
    btnProbar.disabled = false;
  }
  
  mostrarPanelPruebasConsolidado(false);
  
  // Resetear LEDs y valores
  document.querySelectorAll('[id^="test-led-"]').forEach(led => {
    led.className = 'led led-small led-gray';
  });
  
  document.querySelectorAll('[id^="test-value-"]').forEach(valueSpan => {
    valueSpan.textContent = '-';
  });
  
  document.querySelectorAll('[id^="test-addr-"]').forEach(addrSpan => {
    addrSpan.textContent = '-';
  });
  
  habilitarControlesPruebaConsolidados(false);
}

// Limpiar recursos
function limpiarRecursosPruebasConsolidado() {
  resetearPanelPruebasConsolidado();
}

// Exponer funciones globalmente
window.consolidatedTestPanel = {
  init: initConsolidatedTestPanel,
  limpiar: limpiarRecursosPruebasConsolidado,
  resetear: resetearPanelPruebasConsolidado
};

// Reemplazar funciones globales
window.actualizarModoPruebas = actualizarModoPruebasConsolidado;

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  console.log('Inicializando panel de pruebas consolidado al cargar DOM...');
  initConsolidatedTestPanel();
});

// Reinicializar cuando se abra el modal
document.addEventListener('shown.bs.modal', function(event) {
  const modalId = event.target.id;
  if (modalId === 'modal-pilona') {
    console.log('Modal pilona mostrado, reinicializando panel...');
    setTimeout(() => {
      initConsolidatedTestPanel();
    }, 100);
  }
});

console.log('Módulo consolidated-test-panel.js cargado correctamente');
