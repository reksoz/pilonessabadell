// logo-config.js - Manejo de configuración LOGO! en la interfaz

// Mapeo completo de direcciones LOGO!
const LOGO_ADDRESS_MAP = {
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

// Inicialización cuando el DOM está listo
document.addEventListener('DOMContentLoaded', function() {
  // Cambio de tipo de dispositivo
  const tipoDispositivoSelect = document.getElementById('pilona-tipo-dispositivo');
  const configModbusDiv = document.getElementById('config-modbus-generico');
  const configLogoDiv = document.getElementById('config-logo');
  
  if (tipoDispositivoSelect) {
    tipoDispositivoSelect.addEventListener('change', function() {
      if (this.value === 'LOGO') {
        configModbusDiv.style.display = 'none';
        configLogoDiv.style.display = 'block';
        // Desactivar validación required para campos Modbus
        setModbusFieldsRequired(false);
      } else {
        configModbusDiv.style.display = 'block';
        configLogoDiv.style.display = 'none';
        // Activar validación required para campos Modbus
        setModbusFieldsRequired(true);
      }
    });
  }
});

// Función para cambiar el estado required de los campos Modbus
function setModbusFieldsRequired(required) {
  const modbusFields = ['pilona-coil-subir', 'pilona-coil-bajar', 'pilona-coil-estado', 'pilona-coil-bloqueo'];
  modbusFields.forEach(fieldId => {
    const field = document.getElementById(fieldId);
    if (field) {
      if (required) {
        field.setAttribute('required', '');
        // Asegurarse de que los campos sean visibles
        field.closest('.row')?.classList.remove('d-none');
      } else {
        field.removeAttribute('required');
        // Limpiar los valores cuando no son requeridos
        field.value = '';
      }
    }
  });
}

// Función para obtener la configuración LOGO desde el formulario
function getLogoConfigFromForm() {
  const config = {
    version: '8.3',
    entradas: {},
    salidas: {},
    marcas: {},
    registros: {}
  };
  
  console.log('Obteniendo configuración LOGO del formulario...');
  
  // Leer todas las funciones asignadas
  document.querySelectorAll('.logo-function').forEach(select => {
    const funcion = select.dataset.function;
    const valor = select.value;
    
    console.log(`Procesando función ${funcion}: valor = ${valor}`);
    
    if (valor) {
      const tipo = valor.charAt(0); // I, Q, M, o V
      const elemento = valor;
      
      // Obtener el modo (lectura/escritura) para esta función
      const modeSelect = document.querySelector(`.logo-mode[data-function="${funcion}"]`);
      const modo = modeSelect ? modeSelect.value : 'write';
      
      // Determinar la sección correcta
      let seccion;
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
        const direccion = getLogoAddress(elemento);
        console.log(`Asignando ${elemento} (dirección: ${direccion}) a sección ${seccion} para función ${funcion}`);
        
        config[seccion][elemento] = {
          descripcion: `${funcion.charAt(0).toUpperCase() + funcion.slice(1)}`,
          tipo: 'digital',
          funcion: funcion,
          direccion: direccion,
          modo: modo // Agregar el modo de lectura/escritura
        };
      }
    }
  });
  
  console.log('Configuración LOGO final:', config);
  return config;
}

// Función para obtener la dirección Modbus de un elemento LOGO
function getLogoAddress(elemento) {
  const tipo = elemento.charAt(0);
  
  if (tipo === 'I') {
    return LOGO_ADDRESS_MAP.inputs[elemento] || 0;
  } else if (tipo === 'Q') {
    return LOGO_ADDRESS_MAP.outputs[elemento] || 0;
  } else if (tipo === 'M') {
    return LOGO_ADDRESS_MAP.marks[elemento] || 0;
  } else if (tipo === 'V') {
    return LOGO_ADDRESS_MAP.vRegisters[elemento] || 0;
  }
  
  return 0;
}

// Función para cargar la configuración LOGO en el formulario
function loadLogoConfigToForm(logoConfig) {
  if (!logoConfig) return;
  
  const config = typeof logoConfig === 'string' ? JSON.parse(logoConfig) : logoConfig;
  
  // Limpiar selecciones actuales
  document.querySelectorAll('.logo-function').forEach(select => {
    select.value = '';
  });
  
  // Resetear modos a valores por defecto
  document.querySelectorAll('.logo-mode').forEach(select => {
    const funcion = select.dataset.function;
    if (funcion === 'estado') {
      select.value = 'read'; // Estado normalmente es lectura
    } else {
      select.value = 'write'; // Las demás funciones normalmente son escritura
    }
  });
  
  // Cargar las funciones desde la configuración
  Object.entries(config).forEach(([seccion, elementos]) => {
    if (elementos && typeof elementos === 'object' && seccion !== 'version') {
      Object.entries(elementos).forEach(([elemento, datos]) => {
        if (datos.funcion) {
          // Buscar el select correspondiente a esta función
          const select = document.querySelector(`.logo-function[data-function="${datos.funcion}"]`);
          if (select) {
            select.value = elemento;
          }
          
          // Cargar el modo si existe
          if (datos.modo) {
            const modeSelect = document.querySelector(`.logo-mode[data-function="${datos.funcion}"]`);
            if (modeSelect) {
              modeSelect.value = datos.modo;
            }
          }
        }
      });
    }
  });
}

// Integrar con el guardado de pilonas existente
window.LOGOConfig = {
  getConfig: getLogoConfigFromForm,
  loadConfig: loadLogoConfigToForm,
  setModbusFieldsRequired: setModbusFieldsRequired
};
