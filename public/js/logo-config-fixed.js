// logo-config.js - Manejo de configuración LOGO! en la interfaz
// VERSION CORREGIDA - Sin redeclaraciones

// Verificar si ya está cargado para evitar redeclaraciones
if (typeof window.LOGO_CONFIG_LOADED === 'undefined') {
  window.LOGO_CONFIG_LOADED = true;

  // Mapeo completo de direcciones LOGO!
  window.LOGO_ADDRESS_MAP = {
    // Entradas digitales (I1-I24) - Function Code 02
    inputs: {
      'I1': 1, 'I2': 2, 'I3': 3, 'I4': 4, 'I5': 5, 'I6': 6, 'I7': 7, 'I8': 8,
      'I9': 9, 'I10': 10, 'I11': 11, 'I12': 12, 'I13': 13, 'I14': 14, 'I15': 15, 'I16': 16,
      'I17': 17, 'I18': 18, 'I19': 19, 'I20': 20, 'I21': 21, 'I22': 22, 'I23': 23, 'I24': 24
    },
    // Salidas digitales (Q1-Q20) - Function Code 01/05
    outputs: {
      'Q1': 8193, 'Q2': 8194, 'Q3': 8195, 'Q4': 8196, 'Q5': 8197, 'Q6': 8198, 'Q7': 8199, 'Q8': 8200,
      'Q9': 8201, 'Q10': 8202, 'Q11': 8203, 'Q12': 8204, 'Q13': 8205, 'Q14': 8206, 'Q15': 8207, 'Q16': 8208,
      'Q17': 8209, 'Q18': 8210, 'Q19': 8211, 'Q20': 8212
    },
    // Marcas digitales (M1-M64) - Function Code 01/05
    marks: {
      'M1': 8257, 'M2': 8258, 'M3': 8259, 'M4': 8260, 'M5': 8261, 'M6': 8262, 'M7': 8263, 'M8': 8264,
      'M9': 8265, 'M10': 8266, 'M11': 8267, 'M12': 8268, 'M13': 8269, 'M14': 8270, 'M15': 8271, 'M16': 8272,
      'M17': 8273, 'M18': 8274, 'M19': 8275, 'M20': 8276, 'M21': 8277, 'M22': 8278, 'M23': 8279, 'M24': 8280,
      'M25': 8281, 'M26': 8282, 'M27': 8283, 'M28': 8284, 'M29': 8285, 'M30': 8286, 'M31': 8287, 'M32': 8288,
      'M33': 8289, 'M34': 8290, 'M35': 8291, 'M36': 8292, 'M37': 8293, 'M38': 8294, 'M39': 8295, 'M40': 8296,
      'M41': 8297, 'M42': 8298, 'M43': 8299, 'M44': 8300, 'M45': 8301, 'M46': 8302, 'M47': 8303, 'M48': 8304,
      'M49': 8305, 'M50': 8306, 'M51': 8307, 'M52': 8308, 'M53': 8309, 'M54': 8310, 'M55': 8311, 'M56': 8312,
      'M57': 8313, 'M58': 8314, 'M59': 8315, 'M60': 8316, 'M61': 8317, 'M62': 8318, 'M63': 8319, 'M64': 8320
    },
    // Registros V (bits) - Para acceso a bits individuales
    vRegisters: {
      'V0.0': 0, 'V0.1': 1, 'V0.2': 2, 'V0.3': 3, 'V0.4': 4, 'V0.5': 5, 'V0.6': 6, 'V0.7': 7,
      'V1.0': 8, 'V1.1': 9, 'V1.2': 10, 'V1.3': 11, 'V1.4': 12, 'V1.5': 13, 'V1.6': 14, 'V1.7': 15,
      'V2.0': 16, 'V2.1': 17, 'V2.2': 18, 'V2.3': 19, 'V2.4': 20, 'V2.5': 21, 'V2.6': 22, 'V2.7': 23
    }
  };

  // Función para cambiar el estado required de los campos Modbus
  function setModbusFieldsRequired(required) {
    var modbusFields = ['pilona-coil-subir', 'pilona-coil-bajar', 'pilona-coil-estado', 'pilona-coil-bloqueo'];
    modbusFields.forEach(function(fieldId) {
      var field = document.getElementById(fieldId);
      if (field) {
        if (required) {
          field.setAttribute('required', '');
        } else {
          field.removeAttribute('required');
        }
      }
    });
  }

  // Función para obtener la configuración LOGO desde el formulario
  function getLogoConfigFromForm() {
    var config = {
      version: '8.3',
      entradas: {},
      salidas: {},
      marcas: {},
      registros: {}
    };
    
    // Leer todas las funciones asignadas
    document.querySelectorAll('.logo-function').forEach(function(select) {
      var funcion = select.dataset.function;
      var valor = select.value;
      
      if (valor) {
        var tipo = valor.charAt(0); // I, Q, M, o V
        var elemento = valor;
        
        // Obtener el modo (lectura/escritura) para esta función
        var modeSelect = document.querySelector('.logo-mode[data-function="' + funcion + '"]');
        var modo = modeSelect ? modeSelect.value : 'write';
        
        // Determinar la sección correcta
        var seccion;
        if (tipo === 'I') {
          seccion = 'entradas';
        } else if (tipo === 'Q') {
          seccion = 'salidas';
        } else if (tipo === 'M') {
          seccion = 'marcas';
        } else if (tipo === 'V') {
          seccion = 'registros';
        }
        
        if (seccion) {
          config[seccion][elemento] = {
            descripcion: funcion.charAt(0).toUpperCase() + funcion.slice(1),
            tipo: 'digital',
            funcion: funcion,
            direccion: getLogoAddress(elemento),
            modo: modo // Agregar el modo de lectura/escritura
          };
        }
      }
    });
    
    return config;
  }

  // Función para obtener la dirección Modbus de un elemento LOGO
  function getLogoAddress(elemento) {
    var tipo = elemento.charAt(0);
    
    if (tipo === 'I') {
      return window.LOGO_ADDRESS_MAP.inputs[elemento] || 0;
    } else if (tipo === 'Q') {
      return window.LOGO_ADDRESS_MAP.outputs[elemento] || 0;
    } else if (tipo === 'M') {
      return window.LOGO_ADDRESS_MAP.marks[elemento] || 0;
    } else if (tipo === 'V') {
      return window.LOGO_ADDRESS_MAP.vRegisters[elemento] || 0;
    }
    
    return 0;
  }

  // Función para cargar la configuración LOGO en el formulario
  function loadLogoConfigToForm(logoConfig) {
    if (!logoConfig) return;
    
    var config = typeof logoConfig === 'string' ? JSON.parse(logoConfig) : logoConfig;
    
    // Limpiar selecciones actuales
    document.querySelectorAll('.logo-function').forEach(function(select) {
      select.value = '';
    });
    
    // Resetear modos a valores por defecto
    document.querySelectorAll('.logo-mode').forEach(function(select) {
      var funcion = select.dataset.function;
      if (funcion === 'estado') {
        select.value = 'read'; // Estado normalmente es lectura
      } else {
        select.value = 'write'; // Las demás funciones normalmente son escritura
      }
    });
    
    // Cargar las funciones desde la configuración
    Object.entries(config).forEach(function(entry) {
      var seccion = entry[0];
      var elementos = entry[1];
      
      if (elementos && typeof elementos === 'object' && seccion !== 'version') {
        Object.entries(elementos).forEach(function(elementEntry) {
          var elemento = elementEntry[0];
          var datos = elementEntry[1];
          
          if (datos.funcion) {
            // Buscar el select correspondiente a esta función
            var select = document.querySelector('.logo-function[data-function="' + datos.funcion + '"]');
            if (select) {
              select.value = elemento;
            }
            
            // Cargar el modo si existe
            if (datos.modo) {
              var modeSelect = document.querySelector('.logo-mode[data-function="' + datos.funcion + '"]');
              if (modeSelect) {
                modeSelect.value = datos.modo;
              }
            }
          }
        });
      }
    });
  }

  // Función para crear botones de control para LOGO
  function crearBotonesControlLOGO() {
    // Buscar todos los selects de función LOGO
    document.querySelectorAll('.logo-function').forEach(function(select) {
      var funcion = select.dataset.function;
      var modeSelect = document.querySelector('.logo-mode[data-function="' + funcion + '"]');
      
      // Verificar si ya tiene botones
      var contenedorBotones = select.parentElement.querySelector('.logo-control-buttons');
      if (!contenedorBotones) {
        // Crear contenedor de botones
        contenedorBotones = document.createElement('div');
        contenedorBotones.className = 'logo-control-buttons mt-2';
        contenedorBotones.style.display = 'none';
        
        // Crear botón de lectura
        var btnLeer = document.createElement('button');
        btnLeer.type = 'button';
        btnLeer.className = 'btn btn-sm btn-info me-2';
        btnLeer.innerHTML = '<i class="fas fa-eye"></i> Leer';
        btnLeer.onclick = function() {
          leerElementoLOGO(select.value, funcion);
        };
        
        // Crear LED indicador
        var ledIndicador = document.createElement('span');
        ledIndicador.className = 'led-indicator me-2';
        ledIndicador.id = 'led-' + funcion;
        ledIndicador.innerHTML = '<i class="fas fa-circle text-secondary"></i>';
        
        // Crear botón de escritura/toggle
        var btnEscribir = document.createElement('button');
        btnEscribir.type = 'button';
        btnEscribir.className = 'btn btn-sm btn-warning';
        btnEscribir.innerHTML = '<i class="fas fa-pen"></i> Escribir';
        btnEscribir.onclick = function() {
          escribirElementoLOGO(select.value, funcion, modeSelect ? modeSelect.value : 'write');
        };
        
        // Añadir elementos al contenedor
        contenedorBotones.appendChild(btnLeer);
        contenedorBotones.appendChild(ledIndicador);
        if (modeSelect && modeSelect.value === 'write') {
          contenedorBotones.appendChild(btnEscribir);
        }
        
        // Insertar después del select padre
        select.parentElement.appendChild(contenedorBotones);
      }
      
      // Actualizar visibilidad de botones según selección
      actualizarVisibilidadBotones(select, modeSelect);
    });
  }
  
  // Función para actualizar visibilidad de botones
  function actualizarVisibilidadBotones(selectFuncion, selectModo) {
    var contenedorBotones = selectFuncion.parentElement.querySelector('.logo-control-buttons');
    if (contenedorBotones) {
      if (selectFuncion.value) {
        contenedorBotones.style.display = 'block';
        
        // Actualizar botón de escritura según el modo
        var btnEscribir = contenedorBotones.querySelector('.btn-warning');
        if (btnEscribir) {
          if (selectModo && selectModo.value === 'write') {
            btnEscribir.style.display = 'inline-block';
          } else {
            btnEscribir.style.display = 'none';
          }
        }
      } else {
        contenedorBotones.style.display = 'none';
      }
    }
  }
  
  // Función para leer elemento LOGO
  function leerElementoLOGO(elemento, funcion) {
    if (!elemento) {
      alert('Por favor seleccione un elemento primero');
      return;
    }
    
    // Obtener datos de la pilona
    var pilonaId = document.getElementById('pilona-id').value;
    var ip = document.getElementById('pilona-direccion-ip').value;
    var puerto = document.getElementById('pilona-puerto').value;
    var unitId = document.getElementById('pilona-unit-id').value;
    
    if (!ip) {
      alert('Por favor ingrese la dirección IP de la pilona');
      return;
    }
    
    // Obtener dirección Modbus del elemento
    var direccion = getLogoAddress(elemento);
    
    console.log('Leyendo elemento LOGO:', elemento, 'Dirección:', direccion);
    
    // Hacer petición al servidor
    fetch('/api/pilonas/test/read-coil', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        ip: ip,
        puerto: parseInt(puerto) || 502,
        unitId: parseInt(unitId) || 1,
        direccion: direccion,
        tipoDispositivo: 'LOGO'
      })
    })
    .then(function(response) {
      if (!response.ok) throw new Error('Error en la respuesta');
      return response.json();
    })
    .then(function(data) {
      console.log('Valor leído:', data);
      actualizarLEDIndicador(funcion, data.valor);
      alert('Valor leído: ' + (data.valor ? 'ON (1)' : 'OFF (0)'));
    })
    .catch(function(error) {
      console.error('Error leyendo elemento:', error);
      alert('Error al leer el elemento: ' + error.message);
    });
  }
  
  // Función para escribir elemento LOGO
  function escribirElementoLOGO(elemento, funcion, modo) {
    if (!elemento) {
      alert('Por favor seleccione un elemento primero');
      return;
    }
    
    if (modo !== 'write') {
      alert('Este elemento está configurado como solo lectura');
      return;
    }
    
    // Confirmar acción
    if (!confirm('¿Está seguro de que desea escribir en ' + elemento + '?')) {
      return;
    }
    
    // Obtener datos de la pilona
    var pilonaId = document.getElementById('pilona-id').value;
    var ip = document.getElementById('pilona-direccion-ip').value;
    var puerto = document.getElementById('pilona-puerto').value;
    var unitId = document.getElementById('pilona-unit-id').value;
    
    if (!ip) {
      alert('Por favor ingrese la dirección IP de la pilona');
      return;
    }
    
    // Obtener dirección Modbus del elemento
    var direccion = getLogoAddress(elemento);
    
    // Para funciones de subir/bajar/puntual, escribir 1
    // Para otras funciones, alternar
    var valor = 1;
    if (funcion === 'estado' || funcion === 'bloqueo') {
      // Primero leer el valor actual para hacer toggle
      valor = confirm('¿Activar (OK) o Desactivar (Cancelar)?') ? 1 : 0;
    }
    
    console.log('Escribiendo en elemento LOGO:', elemento, 'Dirección:', direccion, 'Valor:', valor);
    
    // Hacer petición al servidor
    fetch('/api/pilonas/test/write-coil', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        ip: ip,
        puerto: parseInt(puerto) || 502,
        unitId: parseInt(unitId) || 1,
        direccion: direccion,
        valor: valor,
        tipoDispositivo: 'LOGO'
      })
    })
    .then(function(response) {
      if (!response.ok) throw new Error('Error en la respuesta');
      return response.json();
    })
    .then(function(data) {
      console.log('Escritura exitosa:', data);
      alert('Valor escrito correctamente');
      // Leer el valor después de escribir
      setTimeout(function() {
        leerElementoLOGO(elemento, funcion);
      }, 500);
    })
    .catch(function(error) {
      console.error('Error escribiendo elemento:', error);
      alert('Error al escribir el elemento: ' + error.message);
    });
  }
  
  // Función para actualizar LED indicador
  function actualizarLEDIndicador(funcion, valor) {
    var led = document.getElementById('led-' + funcion);
    if (led) {
      var icono = led.querySelector('i');
      if (icono) {
        if (valor) {
          icono.className = 'fas fa-circle text-success';
        } else {
          icono.className = 'fas fa-circle text-danger';
        }
      }
    }
  }
  
  // Inicialización cuando el DOM está listo
  function initLogoConfig() {
    // Cambio de tipo de dispositivo
    var tipoDispositivoSelect = document.getElementById('pilona-tipo-dispositivo');
    var configModbusDiv = document.getElementById('config-modbus-generico');
    var configLogoDiv = document.getElementById('config-logo');
    
    if (tipoDispositivoSelect) {
      tipoDispositivoSelect.addEventListener('change', function() {
        if (this.value === 'LOGO') {
          if (configModbusDiv) configModbusDiv.style.display = 'none';
          if (configLogoDiv) {
            configLogoDiv.style.display = 'block';
            // Crear botones de control cuando se muestra la configuración LOGO
            setTimeout(crearBotonesControlLOGO, 100);
          }
          // Desactivar validación required para campos Modbus
          setModbusFieldsRequired(false);
        } else {
          if (configModbusDiv) configModbusDiv.style.display = 'block';
          if (configLogoDiv) configLogoDiv.style.display = 'none';
          // Activar validación required para campos Modbus
          setModbusFieldsRequired(true);
        }
      });
    }
    
    // Añadir eventos a los selects de función
    document.addEventListener('change', function(e) {
      if (e.target.classList.contains('logo-function')) {
        var funcion = e.target.dataset.function;
        var modeSelect = document.querySelector('.logo-mode[data-function="' + funcion + '"]');
        actualizarVisibilidadBotones(e.target, modeSelect);
      }
      if (e.target.classList.contains('logo-mode')) {
        var funcion = e.target.dataset.function;
        var functionSelect = document.querySelector('.logo-function[data-function="' + funcion + '"]');
        actualizarVisibilidadBotones(functionSelect, e.target);
      }
    });
  }

  // Integrar con el guardado de pilonas existente
  window.LOGOConfig = {
    getConfig: getLogoConfigFromForm,
    loadConfig: loadLogoConfigToForm,
    setModbusFieldsRequired: setModbusFieldsRequired,
    init: initLogoConfig,
    crearBotonesControl: crearBotonesControlLOGO
  };

  // Auto-inicializar cuando se carga el DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLogoConfig);
  } else {
    initLogoConfig();
  }

  console.log('Logo config cargado correctamente (versión fija)');
}
