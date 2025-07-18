// pilona-test-panel-fixed.js - Panel de pruebas corregido para pilonas con soporte LOGO!

// Estado del panel de pruebas
let testPanelState = {
  conexionActiva: false,
  pilonaId: null,
  tipoDispositivo: 'MODBUS_GENERICO',
  intervalId: null,
  autoRefreshEnabled: false
};

// Inicializar panel de pruebas
function initTestPanel() {
  console.log('Inicializando panel de pruebas de pilona corregido...');
  
  // Event listeners para el botón de probar conexión
  const btnProbarConexion = document.getElementById('btn-probar-conexion');
  if (btnProbarConexion) {
    btnProbarConexion.addEventListener('click', probarConexion);
  }
  
  // Event listener para el checkbox modo pruebas
  const modoPruebasCheckbox = document.getElementById('modo-pruebas-activo');
  if (modoPruebasCheckbox) {
    modoPruebasCheckbox.addEventListener('change', function() {
      actualizarModoPruebas(this.checked);
    });
  }
  
  // Event listener para auto-refresh
  const autoRefreshCheckbox = document.getElementById('test-auto-refresh');
  if (autoRefreshCheckbox) {
    autoRefreshCheckbox.addEventListener('change', function() {
      testPanelState.autoRefreshEnabled = this.checked;
      if (this.checked && testPanelState.conexionActiva) {
        iniciarLecturaPeriodica();
      } else if (!this.checked && testPanelState.intervalId) {
        clearInterval(testPanelState.intervalId);
        testPanelState.intervalId = null;
      }
    });
  }
  
  // Event listeners para los botones de prueba de coils
  document.querySelectorAll('.test-btn-write').forEach(btn => {
    btn.addEventListener('click', function() {
      const coil = this.getAttribute('data-coil');
      escribirCoil(coil);
    });
  });
  
  // Event listeners para los botones de toggle
  document.querySelectorAll('.test-btn-toggle').forEach(btn => {
    btn.addEventListener('click', function() {
      const coil = this.getAttribute('data-coil');
      toggleCoil(coil);
    });
  });
  
  // Botón para leer todos los estados
  const btnReadAll = document.getElementById('test-btn-read-all');
  if (btnReadAll) {
    btnReadAll.addEventListener('click', leerTodosLosEstados);
  }
  
  // Listener para cambio de tipo de dispositivo
  const selectTipo = document.getElementById('pilona-tipo-dispositivo');
  if (selectTipo) {
    selectTipo.addEventListener('change', function() {
      testPanelState.tipoDispositivo = this.value;
      resetearPanelPruebas();
    });
  }
  
  console.log('Panel de pruebas corregido inicializado');
}

// Probar conexión con la pilona
async function probarConexion() {
  console.log('Probando conexión...');
  
  // Obtener datos del formulario
  const direccionIP = document.getElementById('pilona-direccion-ip').value;
  const puerto = document.getElementById('pilona-puerto').value;
  const unitId = document.getElementById('pilona-unit-id').value;
  const tipoDispositivo = document.getElementById('pilona-tipo-dispositivo').value;
  
  if (!direccionIP) {
    mostrarAlerta('error', 'Por favor ingrese la dirección IP');
    return;
  }
  
  // Validar configuración según tipo de dispositivo
  if (tipoDispositivo === 'LOGO') {
    if (!validarConfiguracionLOGO()) {
      return;
    }
  } else {
    if (!validarConfiguracionModbus()) {
      return;
    }
  }
  
  // Actualizar UI
  const btnProbar = document.getElementById('btn-probar-conexion');
  const ledConexion = document.getElementById('led-conexion');
  const textoEstado = document.getElementById('texto-estado-conexion');
  
  // Estado: probando
  btnProbar.disabled = true;
  btnProbar.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Probando...';
  ledConexion.className = 'led led-yellow';
  textoEstado.textContent = 'Probando...';
  textoEstado.className = 'ms-2 text-warning';
  
  try {
    // Preparar datos de conexión
    const datosConexion = {
      direccionIP,
      puerto: parseInt(puerto) || 502,
      unitId: parseInt(unitId) || 1,
      tipoDispositivo
    };
    
    // Si es LOGO, agregar la configuración
    if (tipoDispositivo === 'LOGO' && window.LOGOConfig) {
      datosConexion.logoConfig = window.LOGOConfig.getConfig();
    } else {
      // Modbus genérico - obtener direcciones de coils
      datosConexion.coilSubir = parseInt(document.getElementById('pilona-coil-subir').value) || 0;
      datosConexion.coilBajar = parseInt(document.getElementById('pilona-coil-bajar').value) || 0;
      datosConexion.coilEstado = parseInt(document.getElementById('pilona-coil-estado').value) || 0;
      datosConexion.coilBloqueo = parseInt(document.getElementById('pilona-coil-bloqueo').value) || 0;
      datosConexion.coilPuntual = document.getElementById('pilona-coil-puntual').value || '';
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
      ledConexion.className = 'led led-green';
      textoEstado.textContent = 'Conectado';
      textoEstado.className = 'ms-2 text-success';
      btnProbar.innerHTML = '<i class="fas fa-check me-2"></i>Conectado';
      btnProbar.classList.remove('btn-primary');
      btnProbar.classList.add('btn-success');
      
      // Marcar conexión como activa
      testPanelState.conexionActiva = true;
      
      // Actualizar direcciones en la tabla según el tipo
      actualizarTablaPruebas(datosConexion);
      
      // Habilitar controles de prueba
      habilitarControlesPrueba(true);
      
      // Verificar si el modo pruebas ya está activo y mostrar panel si es necesario
      const modoPruebasCheckbox = document.getElementById('modo-pruebas-activo');
      if (modoPruebasCheckbox && modoPruebasCheckbox.checked) {
        mostrarPanelPruebas(true);
        
        // Si auto-refresh está habilitado, iniciar lectura
        const autoRefreshCheckbox = document.getElementById('test-auto-refresh');
        if (autoRefreshCheckbox && autoRefreshCheckbox.checked) {
          iniciarLecturaPeriodica();
        }
      }
      
      mostrarAlerta('success', 'Conexión establecida correctamente');
    } else {
      // Error de conexión
      throw new Error(result.error || 'Error de conexión');
    }
  } catch (error) {
    console.error('Error probando conexión:', error);
    
    // Estado: error
    ledConexion.className = 'led led-red';
    textoEstado.textContent = 'Error';
    textoEstado.className = 'ms-2 text-danger';
    btnProbar.innerHTML = '<i class="fas fa-times me-2"></i>Error';
    btnProbar.classList.remove('btn-primary', 'btn-success');
    btnProbar.classList.add('btn-danger');
    
    // Ocultar panel de pruebas y deshabilitar controles
    mostrarPanelPruebas(false);
    testPanelState.conexionActiva = false;
    habilitarControlesPrueba(false);
    
    mostrarAlerta('error', 'Error de conexión: ' + error.message);
  } finally {
    // Rehabilitar botón después de 2 segundos
    setTimeout(() => {
      btnProbar.disabled = false;
      if (testPanelState.conexionActiva) {
        btnProbar.innerHTML = '<i class="fas fa-sync me-2"></i>Actualizar';
      } else {
        btnProbar.innerHTML = '<i class="fas fa-plug me-2"></i>Probar Conexión';
        btnProbar.classList.remove('btn-success', 'btn-danger');
        btnProbar.classList.add('btn-primary');
      }
    }, 2000);
  }
}

// Validar configuración LOGO
function validarConfiguracionLOGO() {
  if (!window.LOGOConfig) {
    mostrarAlerta('error', 'Configuración LOGO no disponible');
    return false;
  }
  
  const config = window.LOGOConfig.getConfig();
  const funcionesRequeridas = ['subir', 'bajar', 'estado', 'bloqueo'];
  
  for (const funcion of funcionesRequeridas) {
    if (!config[funcion] || !config[funcion].elemento) {
      mostrarAlerta('error', `Por favor configure la función ${funcion.toUpperCase()} en la configuración LOGO`);
      return false;
    }
  }
  
  return true;
}

// Validar configuración Modbus
function validarConfiguracionModbus() {
  const campos = [
    'pilona-coil-subir',
    'pilona-coil-bajar', 
    'pilona-coil-estado',
    'pilona-coil-bloqueo'
  ];
  
  for (const campoId of campos) {
    const campo = document.getElementById(campoId);
    if (!campo || !campo.value || campo.value.trim() === '') {
      mostrarAlerta('error', `Por favor complete el campo ${campo.previousElementSibling.textContent || campoId}`);
      return false;
    }
  }
  
  return true;
}

// Actualizar tabla de pruebas con las direcciones
function actualizarTablaPruebas(datosConexion) {
  console.log('Actualizando tabla de pruebas para tipo:', datosConexion.tipoDispositivo);
  
  const { tipoDispositivo } = datosConexion;
  
  if (tipoDispositivo === 'LOGO') {
    // Para LOGO, mostrar los elementos configurados
    if (datosConexion.logoConfig) {
      // Buscar configuraciones en todas las secciones
      const todasLasConfiguraciones = {};
      
      Object.keys(datosConexion.logoConfig).forEach(seccion => {
        if (typeof datosConexion.logoConfig[seccion] === 'object' && seccion !== 'version') {
          Object.keys(datosConexion.logoConfig[seccion]).forEach(elemento => {
            const config = datosConexion.logoConfig[seccion][elemento];
            if (config && config.funcion) {
              todasLasConfiguraciones[config.funcion] = elemento;
            }
          });
        }
      });
      
      // Actualizar direcciones mostradas
      document.getElementById('test-addr-subir').textContent = todasLasConfiguraciones.subir || '-';
      document.getElementById('test-addr-bajar').textContent = todasLasConfiguraciones.bajar || '-';
      document.getElementById('test-addr-estado').textContent = todasLasConfiguraciones.estado || '-';
      document.getElementById('test-addr-bloqueo').textContent = todasLasConfiguraciones.bloqueo || '-';
      document.getElementById('test-addr-puntual').textContent = todasLasConfiguraciones.puntual || '-';
    }
  } else {
    // Para Modbus genérico, mostrar las direcciones de coils
    document.getElementById('test-addr-subir').textContent = datosConexion.coilSubir || '0';
    document.getElementById('test-addr-bajar').textContent = datosConexion.coilBajar || '0';
    document.getElementById('test-addr-estado').textContent = datosConexion.coilEstado || '0';
    document.getElementById('test-addr-bloqueo').textContent = datosConexion.coilBloqueo || '0';
    document.getElementById('test-addr-puntual').textContent = datosConexion.coilPuntual || '-';
  }
}

// Habilitar/deshabilitar controles de prueba
function habilitarControlesPrueba(habilitar) {
  // Habilitar checkbox de modo pruebas
  const modoPruebasCheckbox = document.getElementById('modo-pruebas-activo');
  if (modoPruebasCheckbox) {
    modoPruebasCheckbox.disabled = !habilitar;
  }
  
  // Habilitar/deshabilitar botones de prueba
  document.querySelectorAll('.test-btn-write, .test-btn-toggle, #test-btn-read-all').forEach(btn => {
    btn.disabled = !habilitar;
  });
  
  // Habilitar checkbox de auto-refresh
  const autoRefreshCheckbox = document.getElementById('test-auto-refresh');
  if (autoRefreshCheckbox) {
    autoRefreshCheckbox.disabled = !habilitar;
  }
}

// Mostrar/ocultar panel de pruebas
function mostrarPanelPruebas(mostrar) {
  const panelCoils = document.getElementById('panel-pruebas-coils');
  if (panelCoils) {
    panelCoils.style.display = mostrar ? 'block' : 'none';
  }
}

// Escribir valor en un coil
async function escribirCoil(coil) {
  if (!testPanelState.conexionActiva) {
    mostrarAlerta('error', 'No hay conexión activa');
    return;
  }
  
  console.log(`Escribiendo en coil: ${coil}`);
  
  const btn = document.querySelector(`.test-btn-write[data-coil="${coil}"]`);
  const led = document.getElementById(`test-led-${coil}`);
  const valueSpan = document.getElementById(`test-value-${coil}`);
  
  // Obtener datos de conexión actuales
  const datosConexion = obtenerDatosConexionActuales();
  datosConexion.coil = coil;
  datosConexion.valor = 1; // Siempre escribir 1 para pruebas
  
  // Estado: escribiendo
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Escribiendo...';
  
  try {
    const response = await fetch('/api/pilonas/test-write', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(datosConexion),
      credentials: 'include'
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      // Escritura exitosa
      led.className = 'led led-small led-green';
      if (valueSpan) valueSpan.textContent = '1';
      btn.innerHTML = '<i class="fas fa-check"></i> OK';
      btn.classList.remove('btn-outline-danger', 'btn-outline-success', 'btn-outline-warning', 'btn-outline-primary');
      btn.classList.add('btn-success');
      
      mostrarAlerta('success', `Valor 1 escrito en ${coil}`);
      
      // Revertir a 0 después de 1 segundo si no es un coil de estado
      if (coil !== 'estado') {
        setTimeout(async () => {
          datosConexion.valor = 0;
          try {
            await fetch('/api/pilonas/test-write', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(datosConexion),
              credentials: 'include'
            });
            
            led.className = 'led led-small led-gray';
            if (valueSpan) valueSpan.textContent = '0';
            console.log(`Coil ${coil} revertido a 0`);
          } catch (error) {
            console.error('Error revertiendo coil:', error);
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
    // Restaurar botón después de 2 segundos
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-pen-square"></i> Escribir 1';
      btn.classList.remove('btn-success', 'btn-danger');
      
      // Restaurar clase según el tipo de coil
      if (coil === 'subir') btn.classList.add('btn-outline-danger');
      else if (coil === 'bajar') btn.classList.add('btn-outline-success');
      else if (coil === 'bloqueo') btn.classList.add('btn-outline-warning');
      else if (coil === 'puntual') btn.classList.add('btn-outline-primary');
    }, 2000);
  }
}

// Toggle de un coil (alternar entre 0 y 1)
async function toggleCoil(coil) {
  if (!testPanelState.conexionActiva) {
    mostrarAlerta('error', 'No hay conexión activa');
    return;
  }
  
  console.log(`Haciendo toggle en coil: ${coil}`);
  
  const btn = document.querySelector(`.test-btn-toggle[data-coil="${coil}"]`);
  const led = document.getElementById(`test-led-${coil}`);
  const valueSpan = document.getElementById(`test-value-${coil}`);
  
  // Determinar valor actual (0 si está gris/rojo, 1 si está verde)
  const valorActual = led.classList.contains('led-green') ? 1 : 0;
  const nuevoValor = valorActual === 0 ? 1 : 0;
  
  // Obtener datos de conexión actuales
  const datosConexion = obtenerDatosConexionActuales();
  datosConexion.coil = coil;
  datosConexion.valor = nuevoValor;
  
  // Estado: escribiendo
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Toggle...';
  
  try {
    const response = await fetch('/api/pilonas/test-write', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(datosConexion),
      credentials: 'include'
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      // Escritura exitosa
      if (nuevoValor === 1) {
        led.className = 'led led-small led-green';
      } else {
        led.className = 'led led-small led-gray';
      }
      
      if (valueSpan) valueSpan.textContent = nuevoValor.toString();
      
      btn.innerHTML = '<i class="fas fa-check"></i> OK';
      btn.classList.remove('btn-outline-info', 'btn-outline-warning');
      btn.classList.add('btn-success');
      
      mostrarAlerta('success', `Valor ${nuevoValor} escrito en ${coil}`);
      
    } else {
      throw new Error(result.error || 'Error al escribir');
    }
  } catch (error) {
    console.error('Error haciendo toggle:', error);
    led.className = 'led led-small led-red';
    btn.innerHTML = '<i class="fas fa-times"></i> Error';
    btn.classList.add('btn-danger');
    mostrarAlerta('error', 'Error al escribir: ' + error.message);
  } finally {
    // Restaurar botón después de 2 segundos
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-exchange-alt"></i> Toggle';
      btn.classList.remove('btn-success', 'btn-danger');
      
      // Restaurar clase según el tipo de coil
      if (coil === 'estado') btn.classList.add('btn-outline-info');
      else if (coil === 'bloqueo') btn.classList.add('btn-outline-warning');
    }, 2000);
  }
}

// Leer todos los estados
async function leerTodosLosEstados() {
  if (!testPanelState.conexionActiva) {
    mostrarAlerta('error', 'No hay conexión activa');
    return;
  }
  
  const btn = document.getElementById('test-btn-read-all');
  const datosConexion = obtenerDatosConexionActuales();
  
  // Estado: leyendo
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Leyendo...';
  
  try {
    const response = await fetch('/api/pilonas/test-read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(datosConexion),
      credentials: 'include'
    });
    
    const result = await response.json();
    
    if (response.ok && result.success) {
      // Actualizar LEDs según los valores leídos
      actualizarLEDs(result.valores);
      
      btn.innerHTML = '<i class="fas fa-check me-1"></i> Leído';
      btn.classList.remove('btn-outline-secondary');
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
    // Restaurar botón
    setTimeout(() => {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-sync-alt me-1"></i> Leer Todos los Estados';
      btn.classList.remove('btn-success', 'btn-danger');
      btn.classList.add('btn-outline-secondary');
    }, 2000);
  }
}

// Actualizar LEDs según valores leídos
function actualizarLEDs(valores) {
  if (!valores) return;
  
  // Actualizar cada LED según su valor
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

// Obtener datos de conexión actuales del formulario
function obtenerDatosConexionActuales() {
  const tipoDispositivo = document.getElementById('pilona-tipo-dispositivo').value;
  
  const datos = {
    direccionIP: document.getElementById('pilona-direccion-ip').value,
    puerto: parseInt(document.getElementById('pilona-puerto').value) || 502,
    unitId: parseInt(document.getElementById('pilona-unit-id').value) || 1,
    tipoDispositivo
  };
  
  if (tipoDispositivo === 'LOGO' && window.LOGOConfig) {
    datos.logoConfig = window.LOGOConfig.getConfig();
  } else {
    datos.coilSubir = parseInt(document.getElementById('pilona-coil-subir').value) || 0;
    datos.coilBajar = parseInt(document.getElementById('pilona-coil-bajar').value) || 0;
    datos.coilEstado = parseInt(document.getElementById('pilona-coil-estado').value) || 0;
    datos.coilBloqueo = parseInt(document.getElementById('pilona-coil-bloqueo').value) || 0;
    datos.coilPuntual = document.getElementById('pilona-coil-puntual').value || '';
  }
  
  return datos;
}

// Iniciar lectura periódica de estados
function iniciarLecturaPeriodica() {
  // Detener lectura anterior si existe
  if (testPanelState.intervalId) {
    clearInterval(testPanelState.intervalId);
  }
  
  const datosConexion = obtenerDatosConexionActuales();
  
  // Leer estados cada 1 segundo
  testPanelState.intervalId = setInterval(async () => {
    if (!testPanelState.conexionActiva || !testPanelState.autoRefreshEnabled) {
      clearInterval(testPanelState.intervalId);
      testPanelState.intervalId = null;
      return;
    }
    
    try {
      const response = await fetch('/api/pilonas/test-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(datosConexion),
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.valores) {
          actualizarLEDs(result.valores);
        }
      }
    } catch (error) {
      console.error('Error en lectura periódica:', error);
    }
  }, 1000);
}

// Resetear panel de pruebas
function resetearPanelPruebas() {
  console.log('Reseteando panel de pruebas...');
  
  // Detener lectura periódica
  if (testPanelState.intervalId) {
    clearInterval(testPanelState.intervalId);
    testPanelState.intervalId = null;
  }
  
  // Resetear estado
  testPanelState.conexionActiva = false;
  testPanelState.autoRefreshEnabled = false;
  
  // Resetear checkbox de modo pruebas
  const modoPruebasCheckbox = document.getElementById('modo-pruebas-activo');
  if (modoPruebasCheckbox) {
    modoPruebasCheckbox.checked = false;
    modoPruebasCheckbox.disabled = true;
  }
  
  // Resetear checkbox de auto-refresh
  const autoRefreshCheckbox = document.getElementById('test-auto-refresh');
  if (autoRefreshCheckbox) {
    autoRefreshCheckbox.checked = false;
    autoRefreshCheckbox.disabled = true;
  }
  
  // Actualizar estado del modo pruebas
  actualizarModoPruebas(false);
  
  // Resetear UI
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
  
  // Ocultar panel de pruebas
  mostrarPanelPruebas(false);
  
  // Resetear LEDs y valores
  document.querySelectorAll('[id^="test-led-"]').forEach(led => {
    led.className = 'led led-small led-gray';
  });
  
  document.querySelectorAll('[id^="test-value-"]').forEach(valueSpan => {
    valueSpan.textContent = '-';
  });
  
  // Resetear direcciones mostradas
  document.querySelectorAll('[id^="test-addr-"]').forEach(addrSpan => {
    addrSpan.textContent = '-';
  });
  
  // Deshabilitar controles
  habilitarControlesPrueba(false);
}

// Función para actualizar el estado del modo pruebas
function actualizarModoPruebas(activo) {
  console.log('Actualizando modo pruebas:', activo);
  
  const estadoModoPruebas = document.getElementById('estado-modo-pruebas');
  
  if (activo) {
    // Activar modo pruebas
    if (estadoModoPruebas) {
      estadoModoPruebas.textContent = 'ACTIVO';
      estadoModoPruebas.classList.remove('bg-warning');
      estadoModoPruebas.classList.add('bg-success');
    }
    
    // Mostrar panel si hay conexión
    if (testPanelState.conexionActiva) {
      mostrarPanelPruebas(true);
    } else {
      mostrarAlerta('warning', 'Primero debe probar la conexión para activar el modo pruebas');
      // Revertir el checkbox
      const modoPruebasCheckbox = document.getElementById('modo-pruebas-activo');
      if (modoPruebasCheckbox) {
        modoPruebasCheckbox.checked = false;
      }
      return;
    }
  } else {
    // Desactivar modo pruebas
    if (estadoModoPruebas) {
      estadoModoPruebas.textContent = 'INACTIVO';
      estadoModoPruebas.classList.remove('bg-success');
      estadoModoPruebas.classList.add('bg-warning');
    }
    
    // Ocultar panel
    mostrarPanelPruebas(false);
    
    // Detener auto-refresh si está activo
    const autoRefreshCheckbox = document.getElementById('test-auto-refresh');
    if (autoRefreshCheckbox && autoRefreshCheckbox.checked) {
      autoRefreshCheckbox.checked = false;
      testPanelState.autoRefreshEnabled = false;
      if (testPanelState.intervalId) {
        clearInterval(testPanelState.intervalId);
        testPanelState.intervalId = null;
      }
    }
  }
}

// Limpiar recursos cuando se cierra el modal
function limpiarRecursosPruebas() {
  resetearPanelPruebas();
}

// Exponer funciones globalmente
window.pilonaTestPanel = {
  init: initTestPanel,
  limpiar: limpiarRecursosPruebas,
  resetear: resetearPanelPruebas
};

// Reemplazar la función global
window.actualizarModoPruebas = actualizarModoPruebas;

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTestPanel);
} else {
  initTestPanel();
}

console.log('Módulo pilona-test-panel-fixed.js cargado correctamente');
