// modal-cleanup.js - Limpieza de modales Bootstrap para evitar fondos oscuros residuales

(function() {
  'use strict';
  
  // Función para limpiar todos los modales y backdrops
  function limpiarModales() {
    // Cerrar todos los modales abiertos
    const modalesAbiertos = document.querySelectorAll('.modal.show');
    modalesAbiertos.forEach(modal => {
      const modalInstance = bootstrap.Modal.getInstance(modal);
      if (modalInstance) {
        modalInstance.hide();
      }
    });
    
    // Eliminar todos los backdrops
    setTimeout(() => {
      const backdrops = document.querySelectorAll('.modal-backdrop');
      backdrops.forEach(backdrop => {
        backdrop.remove();
      });
      
      // Limpiar clases del body
      document.body.classList.remove('modal-open');
      document.body.style.removeProperty('padding-right');
      document.body.style.overflow = '';
    }, 300); // Esperar a que termine la animación
  }
  
  // Interceptar el método hide de Bootstrap Modal para asegurar limpieza completa
  if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
    const originalHide = bootstrap.Modal.prototype.hide;
    
    bootstrap.Modal.prototype.hide = function() {
      const modal = this;
      
      // Llamar al método original
      originalHide.call(this);
      
      // Agregar limpieza adicional después de ocultar
      setTimeout(() => {
        // Verificar si quedan backdrops huérfanos
        const backdrops = document.querySelectorAll('.modal-backdrop');
        const modalesVisibles = document.querySelectorAll('.modal.show');
        
        // Si no hay modales visibles pero hay backdrops, eliminarlos
        if (modalesVisibles.length === 0 && backdrops.length > 0) {
          backdrops.forEach(backdrop => {
            backdrop.remove();
          });
          document.body.classList.remove('modal-open');
          document.body.style.removeProperty('padding-right');
          document.body.style.overflow = '';
        }
      }, 500); // Esperar un poco más que la animación estándar
    };
  }
  
  // Escuchar cambios de página para limpiar modales
  window.addEventListener('pagechange', limpiarModales);
  
  // Limpiar al hacer click en el navbar
  document.addEventListener('click', function(e) {
    if (e.target.closest('.nav-link[data-page]')) {
      limpiarModales();
    }
  });
  
  // Exportar función para uso manual si es necesario
  window.limpiarModales = limpiarModales;
  
  console.log('Sistema de limpieza de modales inicializado');
})();
