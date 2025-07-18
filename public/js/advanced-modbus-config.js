// advanced-modbus-config.js - Configuración avanzada de tipos de registro Modbus

// Configuración de tipos de registro y modos de operación
const MODBUS_REGISTER_TYPES = {
  'COIL': { name: 'Coil (FC01/FC05)', readFunc: 'FC01', writeFunc: 'FC05' },
  'DISCRETE_INPUT': { name: 'Discrete Input (FC02)', readFunc: 'FC02', writeFunc: null },
  'INPUT_REGISTER': { name: 'Input Register (FC04)', readFunc: 'FC04', writeFunc: null },
  'HOLDING_REGISTER': { name: 'Holding Register (FC03/FC06)', readFunc: 'FC03', writeFunc: 'FC06' }
};

const MODBUS_MODES = {
  'R': 'Solo lectura',
  'W': 'Solo escritura',
  'RW': 'Lectura/Escritura'
};

// Función para inicializar la configuración avanzada de Modbus
function initAdvancedModbusConfig() {
  console.log('Inicializando configuración avanzada de Modbus...');
  
  // Crear controles para configuración avanzada si no existen
  const configContainer = document.getElementById('config-modbus-generico');
  if (!configContainer) {
    console.error('Contenedor de configuración Modbus no encontrado');
    return;
  }
  
  // Buscar o crear la sección de configuración avanzada
  let advancedSection = document.getElementById('advanced-modbus-config');
  if (!advancedSection) {
    advancedSection = createAdvancedConfigSection();
    configContainer.appendChild(advancedSection);
  }
  
  // Agregar listeners para el cambio de tipo de dispositivo
  const tipoDispositivo = document.getElementById('pilona-tipo-dispositivo');
  if (tipoDispositivo) {
    tipoDispositivo.addEventListener('change', handleTipoDispositivoChange);
  }
}

// Crear sección de configuración avanzada
function createAdvancedConfigSection() {
  const section = document.createElement('div');
  section.id = 'advanced-modbus-config';
  section.className = 'mt-4';
  
  section.innerHTML = `
    <div class="accordion" id="accordionModbusAdvanced">
      <div class="accordion-item">
        <h2 class="accordion-header" id="headingAdvanced">
          <button class="accordion-button collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapseAdvanced">
            <i class="fas fa-cog me-2"></i>Configuración Avanzada de Registros Modbus
          </button>
        </h2>
        <div id="collapseAdvanced" class="accordion-collapse collapse" data-bs-parent="#accordionModbusAdvanced">
          <div class="accordion-body">
            <div class="alert alert-info mb-3">
              <i class="fas fa-info-circle me-2"></i>
              Configure el tipo de registro Modbus y el modo de operación para cada función.
            </div>
            
            <!-- Configuración para cada coil -->
            <div class="table-responsive">
              <table class="table table-sm table-bordered">
                <thead class="table-light">
                  <tr>
                    <th>Función</th>
                    <th>Dirección</th>
                    <th>Tipo de Registro</th>
                    <th>Modo</th>
                    <th>Puerto (opcional)</th>
                    <th>Unit ID (opcional)</th>
                  </tr>
                </thead>
                <tbody>
                  <!-- Subir -->
                  <tr>
                    <td><strong>Subir</strong></td>
                    <td><span id="addr-display-subir">-</span></td>
                    <td>
                      <select class="form-select form-select-sm" id="tipo-coil-subir">
                        <option value="COIL">Coil (FC01/FC05)</option>
                        <option value="DISCRETE_INPUT">Discrete Input (FC02)</option>
                        <option value="INPUT_REGISTER">Input Register (FC04)</option>
                        <option value="HOLDING_REGISTER">Holding Register (FC03/FC06)</option>
                      </select>
                    </td>
                    <td>
                      <select class="form-select form-select-sm" id="modo-coil-subir">
                        <option value="RW">Lectura/Escritura</option>
                        <option value="R">Solo lectura</option>
                        <option value="W">Solo escritura</option>
                      </select>
                    </td>
                    <td>
                      <input type="number" class="form-control form-control-sm" id="puerto-coil-subir" placeholder="502">
                    </td>
                    <td>
                      <input type="number" class="form-control form-control-sm" id="unitid-coil-subir" placeholder="1">
                    </td>
                  </tr>
                  
                  <!-- Bajar -->
                  <tr>
                    <td><strong>Bajar</strong></td>
                    <td><span id="addr-display-bajar">-</span></td>
                    <td>
                      <select class="form-select form-select-sm" id="tipo-coil-bajar">
                        <option value="COIL">Coil (FC01/FC05)</option>
                        <option value="DISCRETE_INPUT">Discrete Input (FC02)</option>
                        <option value="INPUT_REGISTER">Input Register (FC04)</option>
                        <option value="HOLDING_REGISTER">Holding Register (FC03/FC06)</option>
                      </select>
                    </td>
                    <td>
                      <select class="form-select form-select-sm" id="modo-coil-bajar">
                        <option value="RW">Lectura/Escritura</option>
                        <option value="R">Solo lectura</option>
                        <option value="W">Solo escritura</option>
                      </select>
                    </td>
                    <td>
                      <input type="number" class="form-control form-control-sm" id="puerto-coil-bajar" placeholder="502">
                    </td>
                    <td>
                      <input type="number" class="form-control form-control-sm" id="unitid-coil-bajar" placeholder="1">
                    </td>
                  </tr>
                  
                  <!-- Estado -->
                  <tr>
                    <td><strong>Estado</strong></td>
                    <td><span id="addr-display-estado">-</span></td>
                    <td>
                      <select class="form-select form-select-sm" id="tipo-coil-estado">
                        <option value="COIL">Coil (FC01/FC05)</option>
                        <option value="DISCRETE_INPUT">Discrete Input (FC02)</option>
                        <option value="INPUT_REGISTER">Input Register (FC04)</option>
                        <option value="HOLDING_REGISTER">Holding Register (FC03/FC06)</option>
                      </select>
                    </td>
                    <td>
                      <select class="form-select form-select-sm" id="modo-coil-estado">
                        <option value="R">Solo lectura</option>
                        <option value="RW">Lectura/Escritura</option>
                        <option value="W">Solo escritura</option>
                      </select>
                    </td>
                    <td>
                      <input type="number" class="form-control form-control-sm" id="puerto-coil-estado" placeholder="502">
                    </td>
                    <td>
                      <input type="number" class="form-control form-control-sm" id="unitid-coil-estado" placeholder="1">
                    </td>
                  </tr>
                  
                  <!-- Bloqueo -->
                  <tr>
                    <td><strong>Bloqueo</strong></td>
                    <td><span id="addr-display-bloqueo">-</span></td>
                    <td>
                      <select class="form-select form-select-sm" id="tipo-coil-bloqueo">
                        <option value="COIL">Coil (FC01/FC05)</option>
                        <option value="DISCRETE_INPUT">Discrete Input (FC02)</option>
                        <option value="INPUT_REGISTER">Input Register (FC04)</option>
                        <option value="HOLDING_REGISTER">Holding Register (FC03/FC06)</option>
                      </select>
                    </td>
                    <td>
                      <select class="form-select form-select-sm" id="modo-coil-bloqueo">
                        <option value="RW">Lectura/Escritura</option>
                        <option value="R">Solo lectura</option>
                        <option value="W">Solo escritura</option>
                      </select>
                    </td>
                    <td>
                      <input type="number" class="form-control form-control-sm" id="puerto-coil-bloqueo" placeholder="502">
                    </td>
                    <td>
                      <input type="number" class="form-control form-control-sm" id="unitid-coil-bloqueo" placeholder="1">
                    </td>
                  </tr>
                  
                  <!-- Puntual -->
                  <tr>
                    <td><strong>Puntual</strong></td>
                    <td><span id="addr-display-puntual">-</span></td>
                    <td>
                      <select class="form-select form-select-sm" id="tipo-coil-puntual">
                        <option value="COIL">Coil (FC01/FC05)</option>
                        <option value="DISCRETE_INPUT">Discrete Input (FC02)</option>
                        <option value="INPUT_REGISTER">Input Register (FC04)</option>
                        <option value="HOLDING_REGISTER">Holding Register (FC03/FC06)</option>
                      </select>
                    </td>
                    <td>
                      <select class="form-select form-select-sm" id="modo-coil-puntual">
                        <option value="W">Solo escritura</option>
                        <option value="RW">Lectura/Escritura</option>
                        <option value="R">Solo lectura</option>
                      </select>
                    </td>
                    <td>
                      <input type="number" class="form-control form-control-sm" id="puerto-coil-puntual" placeholder="502">
                    </td>
                    <td>
                      <input type="number" class="form-control form-control-sm" id="unitid-coil-puntual" placeholder="1">
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div class="alert alert-warning mt-3">
              <i class="fas fa-exclamation-triangle me-2"></i>
              <strong>Nota:</strong> Los tipos Discrete Input (FC02) e Input Register (FC04) son de solo lectura por definición del protocolo Modbus.
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  return section;
}

// Manejar cambio de tipo de dispositivo
function handleTipoDispositivoChange(event) {
  const tipo = event.target.value;
  const advancedConfig = document.getElementById('advanced-modbus-config');
  
  if (tipo === 'MODBUS_GENERICO') {
    // Mostrar configuración avanzada para Modbus genérico
    if (advancedConfig) {
      advancedConfig.style.display = 'block';
    }
    
    // Actualizar displays de direcciones
    updateAddressDisplays();
    
    // Agregar listeners a los campos de dirección
    addAddressListeners();
    
    // Agregar validación a los selectores de tipo
    addTypeValidation();
  } else {
    // Ocultar configuración avanzada para otros tipos
    if (advancedConfig) {
      advancedConfig.style.display = 'none';
    }
  }
}

// Actualizar displays de direcciones
function updateAddressDisplays() {
  const coils = ['subir', 'bajar', 'estado', 'bloqueo', 'puntual'];
  
  coils.forEach(coil => {
    const input = document.getElementById(`pilona-coil-${coil}`);
    const display = document.getElementById(`addr-display-${coil}`);
    
    if (input && display) {
      const updateDisplay = () => {
        display.textContent = input.value || '-';
      };
      
      updateDisplay();
      input.addEventListener('input', updateDisplay);
    }
  });
}

// Agregar listeners a los campos de dirección
function addAddressListeners() {
  const coils = ['subir', 'bajar', 'estado', 'bloqueo', 'puntual'];
  
  coils.forEach(coil => {
    const addrInput = document.getElementById(`pilona-coil-${coil}`);
    const tipoSelect = document.getElementById(`tipo-coil-${coil}`);
    const modoSelect = document.getElementById(`modo-coil-${coil}`);
    
    if (addrInput && tipoSelect && modoSelect) {
      // Listener para actualizar el modo según el tipo
      tipoSelect.addEventListener('change', () => {
        const tipo = tipoSelect.value;
        
        // Si es un tipo de solo lectura, forzar el modo
        if (tipo === 'DISCRETE_INPUT' || tipo === 'INPUT_REGISTER') {
          modoSelect.value = 'R';
          modoSelect.disabled = true;
        } else {
          modoSelect.disabled = false;
        }
      });
    }
  });
}

// Agregar validación a los selectores de tipo
function addTypeValidation() {
  const coils = ['subir', 'bajar', 'estado', 'bloqueo', 'puntual'];
  
  coils.forEach(coil => {
    const tipoSelect = document.getElementById(`tipo-coil-${coil}`);
    
    if (tipoSelect) {
      // Disparar el evento change para establecer el estado inicial
      tipoSelect.dispatchEvent(new Event('change'));
    }
  });
}

// Obtener configuración avanzada de Modbus
function getAdvancedModbusConfig() {
  const config = {};
  const coils = ['subir', 'bajar', 'estado', 'bloqueo', 'puntual'];
  
  coils.forEach(coil => {
    const tipo = document.getElementById(`tipo-coil-${coil}`)?.value;
    const modo = document.getElementById(`modo-coil-${coil}`)?.value;
    const puerto = document.getElementById(`puerto-coil-${coil}`)?.value;
    const unitId = document.getElementById(`unitid-coil-${coil}`)?.value;
    
    // Convertir el nombre del coil a formato de base de datos
    const dbFieldPrefix = coil.toUpperCase();
    
    if (tipo) config[`tipoCoil${capitalize(coil)}`] = tipo;
    if (modo) config[`modoCoil${capitalize(coil)}`] = modo;
    if (puerto) config[`puertoCoil${capitalize(coil)}`] = parseInt(puerto);
    if (unitId) config[`unitIdCoil${capitalize(coil)}`] = parseInt(unitId);
  });
  
  return config;
}

// Cargar configuración avanzada de Modbus
function loadAdvancedModbusConfig(pilona) {
  const coils = ['subir', 'bajar', 'estado', 'bloqueo', 'puntual'];
  
  coils.forEach(coil => {
    const dbFieldPrefix = coil.toUpperCase();
    const camelCase = capitalize(coil);
    
    // Cargar tipo de registro
    const tipoField = `TIPO_COIL_${dbFieldPrefix}`;
    const tipoFieldCamel = `tipoCoil${camelCase}`;
    const tipoValue = pilona[tipoField] || pilona[tipoFieldCamel] || 'COIL';
    const tipoSelect = document.getElementById(`tipo-coil-${coil}`);
    if (tipoSelect) {
      tipoSelect.value = tipoValue;
    }
    
    // Cargar modo
    const modoField = `MODO_COIL_${dbFieldPrefix}`;
    const modoFieldCamel = `modoCoil${camelCase}`;
    const modoValue = pilona[modoField] || pilona[modoFieldCamel] || (coil === 'estado' ? 'R' : 'RW');
    const modoSelect = document.getElementById(`modo-coil-${coil}`);
    if (modoSelect) {
      modoSelect.value = modoValue;
      // Deshabilitar si es un tipo de solo lectura
      if (tipoValue === 'DISCRETE_INPUT' || tipoValue === 'INPUT_REGISTER') {
        modoSelect.disabled = true;
      }
    }
    
    // Cargar puerto opcional
    const puertoField = `PUERTO_COIL_${dbFieldPrefix}`;
    const puertoFieldCamel = `puertoCoil${camelCase}`;
    const puertoValue = pilona[puertoField] || pilona[puertoFieldCamel] || '';
    const puertoInput = document.getElementById(`puerto-coil-${coil}`);
    if (puertoInput) {
      puertoInput.value = puertoValue;
    }
    
    // Cargar Unit ID opcional
    const unitIdField = `UNIT_ID_COIL_${dbFieldPrefix}`;
    const unitIdFieldCamel = `unitIdCoil${camelCase}`;
    const unitIdValue = pilona[unitIdField] || pilona[unitIdFieldCamel] || '';
    const unitIdInput = document.getElementById(`unitid-coil-${coil}`);
    if (unitIdInput) {
      unitIdInput.value = unitIdValue;
    }
  });
  
  // Actualizar displays
  updateAddressDisplays();
}

// Función auxiliar para capitalizar
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Exportar funciones para uso global
window.advancedModbusConfig = {
  init: initAdvancedModbusConfig,
  getConfig: getAdvancedModbusConfig,
  loadConfig: loadAdvancedModbusConfig
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  initAdvancedModbusConfig();
});
