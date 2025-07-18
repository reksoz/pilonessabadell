// correcciones-finales.js - Correcciones finales para el sistema de gestión de usuarios
// Este archivo contiene las correcciones adicionales necesarias

// Función para corregir la función mostrarModalZonasUsuario que está referenciada pero no definida
function mostrarModalZonasUsuario(usuarioId) {
  console.log('Mostrando modal de zonas para usuario:', usuarioId);
  
  // Usar la función correcta del nuevo sistema
  if (typeof gestionarZonasDeUsuario === 'function') {
    gestionarZonasDeUsuario(usuarioId);
  } else if (typeof gestionarZonasUsuario === 'function') {
    gestionarZonasUsuario(usuarioId);
  } else {
    console.error('Las funciones de gestión de zonas no están disponibles');
    // Intentar llamar directamente al modal si existe
    const modal = document.getElementById('modal-zonas-usuario');
    if (modal) {
      const bootstrapModal = new bootstrap.Modal(modal);
      bootstrapModal.show();
    } else {
      alert('Error: Sistema de gestión de zonas no disponible');
    }
  }
}

// Funciones adicionales para compatibilidad
function mostrarZonasUsuario(usuarioId) {
  mostrarModalZonasUsuario(usuarioId);
}

// Función para asegurar que el botón de nuevo usuario funcione
function asegurarBotonNuevoUsuario() {
  const btnNuevoUsuario = document.getElementById('btn-nuevo-usuario');
  if (btnNuevoUsuario) {
    // Limpiar eventos anteriores
    btnNuevoUsuario.replaceWith(btnNuevoUsuario.cloneNode(true));
    
    // Añadir nuevo evento
    const newBtn = document.getElementById('btn-nuevo-usuario');
    newBtn.addEventListener('click', function() {
      console.log('Botón nuevo usuario clickeado');
      if (typeof mostrarModalNuevoUsuario === 'function') {
        mostrarModalNuevoUsuario();
      } else {
        console.error('Función mostrarModalNuevoUsuario no disponible');
      }
    });
    
    console.log('Botón nuevo usuario configurado correctamente');
  } else {
    console.error('Botón nuevo usuario no encontrado');
  }
}

// Función para corregir la actualización de la tabla de usuarios en main.js
function actualizarTablaUsuariosCorregida(usuarios) {
  const tabla = document.getElementById('tabla-usuarios');
  if (!tabla) {
    console.error('Tabla de usuarios no encontrada');
    return;
  }
  
  tabla.innerHTML = '';
  
  if (!usuarios || usuarios.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="8" class="text-center">No hay usuarios registrados</td>`;
    tabla.appendChild(tr);
    return;
  }
  
  usuarios.forEach(usuario => {
    const tr = document.createElement('tr');
    
    tr.innerHTML = `
      <td>${usuario.ID || ''}</td>
      <td>${usuario.NOMBRE || ''}</td>
      <td>${usuario.EMAIL || ''}</td>
      <td><span class="badge bg-info">${formatRol(usuario.ROL || '')}</span></td>
      <td>${usuario.ACTIVO ? '<span class="badge bg-success">Activo</span>' : '<span class="badge bg-danger">Inactivo</span>'}</td>
      <td>${usuario.MATRICULA || '-'}</td>
      <td>${usuario.DNI || '-'}</td>
      <td>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-info btn-editar-usuario" data-id="${usuario.ID}" title="Editar usuario">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-outline-primary btn-zonas-usuario" data-id="${usuario.ID}" title="Gestionar zonas">
            <i class="fas fa-map-marker-alt"></i>
          </button>
          <button class="btn btn-outline-danger btn-eliminar-usuario" data-id="${usuario.ID}" title="Eliminar usuario">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    
    tabla.appendChild(tr);
  });
  
  // Agregar listeners a los botones de acciones
  tabla.querySelectorAll('.btn-editar-usuario').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (typeof editarUsuario === 'function') {
        editarUsuario(id);
      } else {
        console.error('Función editarUsuario no disponible');
      }
    });
  });
  
  tabla.querySelectorAll('.btn-eliminar-usuario').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (typeof eliminarUsuario === 'function') {
        eliminarUsuario(id);
      } else {
        console.error('Función eliminarUsuario no disponible');
      }
    });
  });
  
  tabla.querySelectorAll('.btn-zonas-usuario').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      mostrarModalZonasUsuario(id);
    });
  });
}

// Función para inicializar todas las correcciones
function inicializarCorreccionesFinales() {
  console.log('Aplicando correcciones finales al sistema de usuarios...');
  
  // Esperar a que el DOM esté completamente cargado
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', aplicarCorrecciones);
  } else {
    aplicarCorrecciones();
  }
}

function aplicarCorrecciones() {
  // Corregir botón de nuevo usuario
  setTimeout(() => {
    asegurarBotonNuevoUsuario();
  }, 1000);
  
  // Sobrescribir la función de actualización de tabla de usuarios en main.js
  if (typeof window.actualizarTablaUsuarios !== 'undefined') {
    window.actualizarTablaUsuarios = actualizarTablaUsuariosCorregida;
  }
  
  console.log('Correcciones aplicadas correctamente');
}

// Función auxiliar para formatear rol
function formatRol(rol) {
  switch(rol) {
    case 'administrador': return 'Administrador';
    case 'operador': return 'Operador';
    case 'cliente': return 'Cliente';
    default: return rol || 'Sin rol';
  }
}

// Exponer funciones globalmente
window.mostrarModalZonasUsuario = mostrarModalZonasUsuario;
window.mostrarZonasUsuario = mostrarZonasUsuario;
window.actualizarTablaUsuariosCorregida = actualizarTablaUsuariosCorregida;
window.formatRol = formatRol;

// Inicializar correcciones
inicializarCorreccionesFinales();

console.log('Archivo de correcciones finales cargado correctamente');
