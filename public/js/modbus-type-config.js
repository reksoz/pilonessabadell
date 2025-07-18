// modbus-type-config.js - Configuración de tipos de registro Modbus y modos de operación

// Tipos de registro Modbus disponibles
const MODBUS_REGISTER_TYPES = {
  COIL: {
    name: 'Coil',
    description: 'Registro de bobina (1 bit)',
    readFunction: 'FC01',
    writeFunction: 'FC05/FC15',
    icon: 'fas fa-circle'
  },
  DISCRETE_INPUT: {
    name: 'Discrete Input',
    description: 'Entrada discreta (1 bit, solo lectura)',
    readFunction: 'FC02',
    writeFunction: null,
    icon: 'fas fa-toggle-on'
  },
  INPUT_REGISTER: {
    name: 'Input Register',
    description: 'Registro de entrada (16 bits, solo lectura)',
    readFunction: 'FC04',
    writeFunction: null,
    icon: 'fas fa-tachometer-alt'
  },
  HOLDING_REGISTER: {
    name: 'Holding Register',
    description: 'Registro de retención (16 bits)',
    readFunction: 'FC03',
    writeFunction: 'FC06/FC16',
    icon: 'fas fa-memory'
  }
};

// Modos de operación
const OPERATION_MODES = {
  R: {
    name: 'Solo Lectura',
    description: 'Solo permite operaciones de lectura',
    icon: 'fas fa-eye',
    class: 'text-info'
  },
  W: {
    name: 'Solo Escritura',
    description: 'Solo permite operaciones de escritura',
    icon: 'fas fa-pen',
    class: 'text-warning'
  },
  RW: {
    name: 'Lectura/Escritura',
    description: 'Permite ambas operaciones',
    icon: 'fas fa-exchange-alt',
    class: 'text-success'
  }
};

// Función para inicializar la configuración avanzada de Modbus
function initModbusTypeConfig() {
  // Agregar botón para mostrar/ocultar configuración avanzada
  const advancedConfigBtn = $(`
    <button type="button" class="btn btn-sm btn-outline-primary mt-2" id="btn-toggle-advanced-modbus">
      <i class="fas fa-cog me-2"></i>Configuración Avanzada de Tipos Modbus
    </button>
  `);
  
  // Insertar el botón después de la configuración básica de coils
  $('#config-modbus-generico').append(advancedConfigBtn);
  
  // Crear el panel de configuración avanzada
  const advancedConfigPanel = $(`
    <div id="advanced-modbus-config" class="card mt-3 border-info" style="display: none;">
      <div class="card-header bg-info text-white">
        <h6 class="mb-0"><i class="fas fa-microchip me-2"></i>Configuración Avanzada - Tipos de Registro y Modos</h6>
      </div>
      <div class="card-body">
        <div class="alert alert-warning">
          <i class="fas fa-exclamation-triangle me-2"></i>
          <strong>Advertencia:</strong> Esta configuración es para usuarios avanzados. 
          Los valores por defecto funcionan para la mayoría de dispositivos Modbus estándar.
        </div>
        
        <!-- Tabla de configuración por señal -->
        <table class="table table-sm table-bordered">
          <thead>
            <tr>
              <th>Señal</th>
              <th>Tipo de Registro</th>
              <th>Modo de Operación</th>
              <th>Puerto Específico</th>
              <th>Unit ID Específico</th>
            </tr>
          </thead>
          <tbody>
            <tr data-signal="subir">
              <td><i class="fas fa-arrow-up text-danger me-2"></i>Subir</td>
              <td>
                <select class="form-select form-select-sm modbus-type" data-signal="subir">
                  <option value="COIL" selected>Coil (FC01/05)</option>
                  <option value="DISCRETE_INPUT">Discrete Input (FC02)</option>
                  <option value="INPUT_REGISTER">Input Register (FC04)</option>
                  <option value="HOLDING_REGISTER">Holding Register (FC03/06)</option>
                </select>
              </td>
              <td>
                <select class="form-select form-select-sm modbus-mode" data-signal="subir">
                  <option value="RW" selected>Lectura/Escritura</option>
                  <option value="R">Solo Lectura</option>
                  <option value="W">Solo Escritura</option>
                </select>
              </td>
              <td>
                <input type="number" class="form-control form-control-sm modbus-port" data-signal="subir" placeholder="Heredar">
              </td>
              <td>
                <input type="number" class="form-control form-control-sm modbus-unitid" data-signal="subir" placeholder="Heredar">
              </td>
            </tr>
            <tr data-signal="bajar">
              <td><i class="fas fa-arrow-down text-success me-2"></i>Bajar</td>
              <td>
                <select class="form-select form-select-sm modbus-type" data-signal="bajar">
                  <option value="COIL" selected>Coil (FC01/05)</option>
                  <option value="DISCRETE_INPUT">Discrete Input (FC02)</option>
                  <option value="INPUT_REGISTER">Input Register (FC04)</option>
                  <option value="HOLDING_REGISTER">Holding Register (FC03/06)</option>
                </select>
              </td>
              <td>
                <select class="form-select form-select-sm modbus-mode" data-signal="bajar">
                  <option value="RW" selected>Lectura/Escritura</option>
                  <option value="R">Solo Lectura</option>
                  <option value="W">Solo Escritura</option>
                </select>
              </td>
              <td>
                <input type="number" class="form-control form-control-sm modbus-port" data-signal="bajar" placeholder="Heredar">
              </td>
              <td>
                <input type="number" class="form-control form-control-sm modbus-unitid" data-signal="bajar" placeholder="Heredar">
              </td>
            </tr>
            <tr data-signal="estado">
              <td><i class="fas fa-info-circle text-info me-2"></i>Estado</td>
              <td>
                <select class="form-select form-select-sm modbus-type" data-signal="estado">
                  <option value="COIL" selected>Coil (FC01/05)</option>
                  <option value="DISCRETE_INPUT">Discrete Input (FC02)</option>
                  <option value="INPUT_REGISTER">Input Register (FC04)</option>
                  <option value="HOLDING_REGISTER">Holding Register (FC03/06)</option>
                </select>
              </td>
              <td>
                <select class="form-select form-select-sm modbus-mode" data-signal="estado">
                  <option value="R" selected>Solo Lectura</option>
                  <option value="RW">Lectura/Escritura</option>
                  <option value="W">Solo Escritura</option>
                </select>
              </td>
              <td>
                <input type="number" class="form-control form-control-sm modbus-port" data-signal="estado" placeholder="Heredar">
              </td>
              <td>
                <input type="number" class="form-control form-control-sm modbus-unitid" data-signal="estado" placeholder="Heredar">
              </td>
            </tr>
            <tr data-signal="bloqueo">
              <td><i class="fas fa-lock text-warning me-2"></i>Bloqueo</td>
              <td>
                <select class="form-select form-select-sm modbus-type" data-signal="bloqueo">
                  <option value="COIL" selected>Coil (FC01/05)</option>
                  <option value="DISCRETE_INPUT">Discrete Input (FC02)</option>
                  <option value="INPUT_REGISTER">Input Register (FC04)</option>
                  <option value="HOLDING_REGISTER">Holding Register (FC03/06)</option>
                </select>
              </td>
              <td>
                <select class="form-select form-select-sm modbus-mode" data-signal="bloqueo">
                  <option value="RW" selected>Lectura/Escritura</option>
                  <option value="R">Solo Lectura</option>
                  <option value="W">Solo Escritura</option>
                </select>
              </td>
              <td>
                <input type="number" class="form-control form-control-sm modbus-port" data-signal="bloqueo" placeholder="Heredar">
              </td>
              <td>
                <input type="number" class="form-control form-control-sm modbus-unitid" data-signal="bloqueo" placeholder="Heredar">
              </td>
            </tr>
            <tr data-signal="puntual">
              <td><i class="fas fa-hand-pointer text-primary me-2"></i>Puntual</td>
              <td>
                <select class="form-select form-select-sm modbus-type" data-signal="puntual">
                  <option value="COIL" selected>Coil (FC01/05)</option>
                  <option value="DISCRETE_INPUT">Discrete Input (FC02)</option>
                  <option value="INPUT_REGISTER">Input Register (FC04)</option>
                  <option value="HOLDING_REGISTER">Holding Register (FC03/06)</option>
                </select>
              </td>
              <td>
                <select class="form-select form-select-sm modbus-mode" data-signal="puntual">
                  <option value="W" selected>Solo Escritura</option>
                  <option value="RW">Lectura/Escritura</option>
                  <option value="R">Solo Lectura</option>
                </select>
              </td>
              <td>
                <input type="number" class="form-control form-control-sm modbus-port" data-signal="puntual" placeholder="Heredar">
              </td>
              <td>
                <input type="number" class="form-control form-control-sm modbus-unitid" data-signal="puntual" placeholder="Heredar">
              </td>
            </tr>
          </tbody>
        </table>
        
        <div class="row mt-3">
          <div class="col-12">
            <div class="alert alert-info mb-0">
              <h6 class="alert-heading"><i class="fas fa-info-circle me-2"></i>Información sobre Tipos de Registro:</h6>
              <ul class="mb-0">
                <li><strong>Coil (FC01/05):</strong> Registro de 1 bit, ideal para señales digitales ON/OFF</li>
                <li><strong>Discrete Input (FC02):</strong> Entrada digital de solo lectura</li>
                <li><strong>Input Register (FC04):</strong> Registro de 16 bits de solo lectura</li>
                <li><strong>Holding Register (FC03/06):</strong> Registro de 16 bits de lectura/escritura</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  `);
  
  // Insertar el panel después del botón
  advancedConfigBtn.after(advancedConfigPanel);
  
  // Evento para mostrar/ocultar panel
  $('#btn-toggle-advanced-modbus').on('click', function() {
    $('#advanced-modbus-config').slideToggle();
    const icon = $(this).find('i');
    if (icon.hasClass('fa-cog')) {
      icon.removeClass('fa-cog').addClass('fa-cog fa-spin');
      setTimeout(() => {
        icon.removeClass('fa-spin').addClass('fa-cogs');
      }, 300);
    } else {
      icon.removeClass('fa-cogs').addClass('fa-cog');
    }
  });
  
  // Validar cambios de tipo según el modo seleccionado
  $('.modbus-type').on('change', function() {
    const signal = $(this).data('signal');
    const type = $(this).val();
    const modeSelect = $(`.modbus-mode[data-signal="${signal}"]`);
    
    // Si es un tipo de solo lectura, ajustar el modo
    if (type === 'DISCRETE_INPUT' || type === 'INPUT_REGISTER') {
      modeSelect.val('R').prop('disabled', true);
    } else {
      modeSelect.prop('disabled', false);
    }
  });
  
  // Inicializar estados según los tipos por defecto
  $('.modbus-type').trigger('change');
}

// Función para obtener la configuración avanzada
function getAdvancedModbusConfig() {
  const config = {};
  const signals = ['subir', 'bajar', 'estado', 'bloqueo', 'puntual'];
  
  signals.forEach(signal => {
    config[signal] = {
      tipo: $(`.modbus-type[data-signal="${signal}"]`).val() || 'COIL',
      modo: $(`.modbus-mode[data-signal="${signal}"]`).val() || 'RW',
      puerto: $(`.modbus-port[data-signal="${signal}"]`).val() || null,
      unitId: $(`.modbus-unitid[data-signal="${signal}"]`).val() || null
    };
  });
  
  return config;
}

// Función para establecer la configuración avanzada
function setAdvancedModbusConfig(pilona) {
  const signals = ['subir', 'bajar', 'estado', 'bloqueo', 'puntual'];
  
  signals.forEach(signal => {
    const signalUpper = signal.toUpperCase();
    
    // Tipo de registro
    const tipo = pilona[`TIPO_COIL_${signalUpper}`] || 'COIL';
    $(`.modbus-type[data-signal="${signal}"]`).val(tipo);
    
    // Modo de operación
    const modo = pilona[`MODO_COIL_${signalUpper}`] || (signal === 'estado' ? 'R' : signal === 'puntual' ? 'W' : 'RW');
    $(`.modbus-mode[data-signal="${signal}"]`).val(modo);
    
    // Puerto específico
    const puerto = pilona[`PUERTO_COIL_${signalUpper}`] || '';
    $(`.modbus-port[data-signal="${signal}"]`).val(puerto);
    
    // Unit ID específico
    const unitId = pilona[`UNIT_ID_COIL_${signalUpper}`] || '';
    $(`.modbus-unitid[data-signal="${signal}"]`).val(unitId);
  });
  
  // Actualizar estados según los tipos
  $('.modbus-type').trigger('change');
}

// Función para resetear la configuración avanzada
function resetAdvancedModbusConfig() {
  // Tipos por defecto
  $('.modbus-type').val('COIL');
  
  // Modos por defecto
  $('.modbus-mode[data-signal="subir"]').val('RW');
  $('.modbus-mode[data-signal="bajar"]').val('RW');
  $('.modbus-mode[data-signal="estado"]').val('R');
  $('.modbus-mode[data-signal="bloqueo"]').val('RW');
  $('.modbus-mode[data-signal="puntual"]').val('W');
  
  // Limpiar puertos y unit IDs específicos
  $('.modbus-port, .modbus-unitid').val('');
  
  // Actualizar estados
  $('.modbus-type').trigger('change');
  
  // Ocultar panel si está visible
  $('#advanced-modbus-config').slideUp();
}

// Exportar funciones para uso global
window.ModbusTypeConfig = {
  init: initModbusTypeConfig,
  getConfig: getAdvancedModbusConfig,
  setConfig: setAdvancedModbusConfig,
  reset: resetAdvancedModbusConfig,
  TYPES: MODBUS_REGISTER_TYPES,
  MODES: OPERATION_MODES
};
