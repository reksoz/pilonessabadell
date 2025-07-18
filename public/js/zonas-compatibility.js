// zonas-compatibility.js - Compatibilidad entre los diferentes módulos de zonas

// Este archivo asegura que las funciones de gestión de zonas estén disponibles
// independientemente del módulo que se esté usando

console.log('Cargando capa de compatibilidad para gestión de zonas...');

// Función para gestionar pilonas de una zona
window.gestionarPilonasZona = function(zonaId) {
  console.log('gestionarPilonasZona llamado con ID:', zonaId);
  
  // Intentar usar la función del módulo principal si existe
  if (typeof window.mostrarPilonasDeZona === 'function') {
    return window.mostrarPilonasDeZona(zonaId);
  }
  
  // Si no, intentar cargar la función del manager
  if (typeof window.gestionarPilonasZonaManager === 'function') {
    return window.gestionarPilonasZonaManager(zonaId);
  }
  
  // Función de respaldo
  console.error('No se encontró ninguna función para gestionar pilonas de zona');
  alert('Error: La función de gestión de pilonas no está disponible');
};

// Función para editar zona
window.editarZona = function(zonaId) {
  console.log('editarZona llamado con ID:', zonaId);
  
  // Intentar usar la función del módulo principal
  if (typeof window.editarZonaGestion === 'function') {
    return window.editarZonaGestion(zonaId);
  }
  
  // Si está disponible en el contexto global, usarla
  const editarOriginal = window.__editarZona || window.editarZonaOriginal;
  if (typeof editarOriginal === 'function') {
    return editarOriginal(zonaId);
  }
  
  // Implementación de respaldo
  const zona = (window.zonasData || window.zonasManagerData || []).find(z => z.ID === zonaId);
  if (!zona) {
    alert('Zona no encontrada');
    return;
  }
  
  // Llenar formulario
  const zonaIdInput = document.getElementById('zona-id');
  const zonaNombre = document.getElementById('zona-nombre');
  const zonaDescripcion = document.getElementById('zona-descripcion');
  
  if (zonaIdInput) zonaIdInput.value = zona.ID;
  if (zonaNombre) zonaNombre.value = zona.NOMBRE || '';
  if (zonaDescripcion) zonaDescripcion.value = zona.DESCRIPCION || '';
  
  // Configurar modal para edición
  const modalTitulo = document.getElementById('modal-zona-titulo');
  if (modalTitulo) {
    modalTitulo.textContent = `Editar Zona: ${zona.NOMBRE}`;
  }
  
  // Mostrar modal
  const modalElement = document.getElementById('modal-zona');
  if (modalElement) {
    const modal = new bootstrap.Modal(modalElement);
    modal.show();
  }
};

// Función para eliminar zona
window.eliminarZona = function(zonaId) {
  console.log('eliminarZona llamado con ID:', zonaId);
  
  // Intentar usar la función del módulo principal
  if (typeof window.eliminarZonaGestion === 'function') {
    return window.eliminarZonaGestion(zonaId);
  }
  
  // Si está disponible en el contexto global, usarla
  const eliminarOriginal = window.__eliminarZona || window.eliminarZonaOriginal;
  if (typeof eliminarOriginal === 'function') {
    return eliminarOriginal(zonaId);
  }
  
  // Implementación de respaldo
  const zona = (window.zonasData || window.zonasManagerData || []).find(z => z.ID === zonaId);
  if (!zona) {
    alert('Zona no encontrada');
    return;
  }
  
  if (!confirm(`¿Está seguro de que desea eliminar la zona "${zona.NOMBRE}"?`)) {
    return;
  }
  
  // Hacer la petición de eliminación
  fetch(`/api/zonas/${zonaId}`, {
    method: 'DELETE',
    credentials: 'include'
  })
  .then(response => {
    if (response.ok) {
      alert('Zona eliminada correctamente');
      // Recargar zonas si la función existe
      if (typeof window.cargarZonas === 'function') {
        window.cargarZonas();
      } else {
        location.reload();
      }
    } else {
      return response.json().then(error => {
        throw new Error(error.error || 'Error al eliminar zona');
      });
    }
  })
  .catch(error => {
    console.error('Error eliminando zona:', error);
    alert('Error al eliminar zona: ' + error.message);
  });
};

// Asegurar que las funciones estén disponibles después de que se carguen los módulos
document.addEventListener('DOMContentLoaded', function() {
  console.log('Verificando disponibilidad de funciones de zonas...');
  
  // Guardar referencias a las funciones originales si existen
  if (typeof window.editarZona === 'function' && !window.__editarZona) {
    window.__editarZona = window.editarZona;
  }
  if (typeof window.eliminarZona === 'function' && !window.__eliminarZona) {
    window.__eliminarZona = window.eliminarZona;
  }
  
  // Re-exponer las funciones
  setTimeout(() => {
    // Si gestion-zonas.js está cargado, exponer sus funciones con los nombres correctos
    if (typeof window.mostrarPilonasDeZona === 'function') {
      window.gestionarPilonasZona = window.mostrarPilonasDeZona;
    }
    
    console.log('Funciones de zonas disponibles:');
    console.log('- gestionarPilonasZona:', typeof window.gestionarPilonasZona);
    console.log('- editarZona:', typeof window.editarZona);
    console.log('- eliminarZona:', typeof window.eliminarZona);
  }, 1000);
});

console.log('Capa de compatibilidad para zonas cargada');
