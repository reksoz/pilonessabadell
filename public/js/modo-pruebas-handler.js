// modo-pruebas-handler.js - Manejador del checkbox modo pruebas

(function() {
  'use strict';
  
  console.log('Inicializando manejador de modo pruebas...');
  
  // Función para inicializar el manejador
  function initModoPruebas() {
    // Buscar el checkbox del modo pruebas
    const checkboxModoPruebas = document.getElementById('modo-pruebas-activo');
    const panelPruebasCoils = document.getElementById('panel-pruebas-coils');
    const estadoModoPruebas = document.getElementById('estado-modo-pruebas');
    
    if (!checkboxModoPruebas) {
      console.warn('Checkbox modo-pruebas-activo no encontrado');
      return;
    }
    
    if (!panelPruebasCoils) {
      console.warn('Panel panel-pruebas-coils no encontrado');
      return;
    }
    
    console.log('Elementos del modo pruebas encontrados, agregando listener...');
    
    // Agregar event listener al checkbox
    checkboxModoPruebas.addEventListener('change', function(e) {
      const activo = e.target.checked;
      console.log('Modo pruebas cambiado a:', activo);
      
      if (activo) {
        // Activar modo pruebas
        panelPruebasCoils.style.display = 'block';
        if (estadoModoPruebas) {
          estadoModoPruebas.textContent = 'ACTIVO';
          estadoModoPruebas.classList.remove('bg-warning');
          estadoModoPruebas.classList.add('bg-success');
        }
        
        // Habilitar botones de prueba si hay conexión activa
        const ledConexion = document.getElementById('led-conexion');
        if (ledConexion && ledConexion.classList.contains('led-green')) {
          habilitarBotonesPrueba(true);
        }
        
        console.log('Modo pruebas activado');
      } else {
        // Desactivar modo pruebas
        panelPruebasCoils.style.display = 'none';
        if (estadoModoPruebas) {
          estadoModoPruebas.textContent = 'INACTIVO';
          estadoModoPruebas.classList.remove('bg-success');
          estadoModoPruebas.classList.add('bg-warning');
        }
        
        // Deshabilitar botones de prueba
        habilitarBotonesPrueba(false);
        
        console.log('Modo pruebas desactivado');
      }
    });
    
    // Estado inicial: desactivado
    checkboxModoPruebas.checked = false;
    panelPruebasCoils.style.display = 'none';
    
    console.log('Manejador de modo pruebas inicializado correctamente');
  }
  
  // Función para habilitar/deshabilitar botones de prueba
  function habilitarBotonesPrueba(habilitar) {
    const botones = document.querySelectorAll('.test-btn-write, .test-btn-toggle, #test-btn-read-all, #test-auto-refresh');
    
    botones.forEach(btn => {
      btn.disabled = !habilitar;
    });
    
    console.log('Botones de prueba', habilitar ? 'habilitados' : 'deshabilitados');
  }
  
  // Inicializar cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initModoPruebas);
  } else {
    // El DOM ya está listo
    initModoPruebas();
  }
  
  // También reinicializar cuando se muestre el modal
  document.addEventListener('shown.bs.modal', function(event) {
    if (event.target.id === 'modal-pilona') {
      console.log('Modal de pilona mostrado, reinicializando modo pruebas...');
      // Dar un pequeño delay para asegurar que el DOM esté actualizado
      setTimeout(initModoPruebas, 100);
    }
  });
  
  // Exponer funciones globalmente si es necesario
  window.ModoPruebasHandler = {
    init: initModoPruebas,
    habilitarBotones: habilitarBotonesPrueba
  };
  
})();
