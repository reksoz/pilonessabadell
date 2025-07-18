// usuarios-mejorado.js - Gestión mejorada de usuarios con todas las funcionalidades corregidas

// Variables globales
let usuariosCargados = [];
let usuariosFiltrados = [];
let filtrosActivos = { rol: '', estado: '', busqueda: '' };

// ================================================================================
// FUNCIONES GLOBALES EXPUESTAS INMEDIATAMENTE
// ================================================================================

// Función simple y directa para eliminar usuarios - EXPUESTA GLOBALMENTE
window.eliminarUsuarioDirecto = async function(usuarioId) {
  console.log('Eliminando usuario ID:', usuarioId);
  
  // Verificar si usuariosCargados está disponible
  if (!usuariosCargados || !Array.isArray(usuariosCargados)) {
    console.error('usuariosCargados no está disponible');
    alert('Error: No se pueden cargar los datos de usuarios');
    return;
  }
  
  const usuario = usuariosCargados.find(u => u.ID === usuarioId);
  if (!usuario) {
    alert('Usuario no encontrado');
    return;
  }
  
  // No permitir eliminar administradores
  if (usuario.ROL === 'administrador') {
    alert('No se puede eliminar un usuario administrador');
    return;
  }
  
  // Confirmar eliminación
  if (!confirm(`¿Está seguro de que desea eliminar al usuario "${usuario.NOMBRE}"?\n\nEsta acción no se puede deshacer.`)) {
    return;
  }
  
  try {
    // Mostrar loading
    const loading = document.getElementById('loading');
    if (loading) loading.classList.remove('hidden');
    
    // Hacer petición DELETE
    const response = await fetch(`/api/usuarios/${usuarioId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error ${response.status}`);
    }
    
    // Mostrar mensaje de éxito
    alert('Usuario eliminado correctamente');
    
    // Recargar usuarios
    if (typeof cargarUsuariosMejorado === 'function') {
      await cargarUsuariosMejorado();
    } else {
      location.reload();
    }
    
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    alert('Error al eliminar usuario: ' + error.message);
  } finally {
    // Ocultar loading
    const loading = document.getElementById('loading');
    if (loading) loading.classList.add('hidden');
  }
}

// Función para agregar event listeners a los botones de la tabla
function agregarEventListenersTablaUsuarios() {
  console.log('Agregando event listeners a botones de usuarios...');
  
  // Botones de editar
  document.querySelectorAll('.btn-editar-usuario').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const usuarioId = parseInt(this.getAttribute('data-usuario-id'));
      console.log('Editando usuario:', usuarioId);
      if (usuarioId) {
        editarUsuario(usuarioId);
      }
    });
  });
  
  // Botones de gestionar zonas
  document.querySelectorAll('.btn-gestionar-zonas').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const usuarioId = parseInt(this.getAttribute('data-usuario-id'));
      console.log('Gestionando zonas para usuario:', usuarioId);
      if (usuarioId) {
        gestionarZonasDeUsuario(usuarioId);
      }
    });
  });
  
  // Botones de eliminar
  document.querySelectorAll('.btn-eliminar-usuario').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const usuarioId = parseInt(this.getAttribute('data-usuario-id'));
      console.log('Eliminando usuario:', usuarioId);
      if (usuarioId && !this.disabled) {
        eliminarUsuarioDirecto(usuarioId);
      }
    });
  });
  
  console.log('Event listeners agregados correctamente');
};

console.log('eliminarUsuarioDirecto definida:', typeof window.eliminarUsuarioDirecto);

// ================================================================================
// INICIALIZACIÓN
// ================================================================================

function initUsuariosMejorado() {
  console.log('Inicializando gestión mejorada de usuarios...');
  
  // Cargar usuarios al inicializar si estamos en la página de usuarios
  const paginaUsuarios = document.getElementById('page-usuarios');
  if (paginaUsuarios && !paginaUsuarios.classList.contains('hidden')) {
    console.log('Página de usuarios visible, cargando usuarios...');
    cargarUsuariosMejorado();
  }
  
  // Eventos para botones principales
  const btnNuevoUsuario = document.getElementById('btn-nuevo-usuario');
  if (btnNuevoUsuario) {
    btnNuevoUsuario.addEventListener('click', mostrarModalNuevoUsuario);
  }
  
  const btnGestionarZonas = document.getElementById('btn-gestionar-zonas');
  if (btnGestionarZonas) {
    btnGestionarZonas.addEventListener('click', mostrarGestionZonas);
  }
  
  const btnGuardarUsuario = document.getElementById('btn-guardar-usuario');
  if (btnGuardarUsuario) {
    btnGuardarUsuario.addEventListener('click', guardarUsuarioMejorado);
  }
  
  // Eventos para filtros
  const filtroRol = document.getElementById('filtro-rol');
  const filtroEstado = document.getElementById('filtro-estado');
  const btnLimpiarFiltros = document.getElementById('btn-limpiar-filtros');
  const inputBusqueda = document.getElementById('busqueda-usuarios');
  
  if (filtroRol) {
    filtroRol.addEventListener('change', aplicarFiltros);
  }
  
  if (filtroEstado) {
    filtroEstado.addEventListener('change', aplicarFiltros);
  }
  
  if (btnLimpiarFiltros) {
    btnLimpiarFiltros.addEventListener('click', limpiarFiltros);
  }
  
  if (inputBusqueda) {
    inputBusqueda.addEventListener('input', aplicarFiltros);
  }
  
  // Eventos para formulario de usuario
  const passwordConfirm = document.getElementById('usuario-password-confirm');
  if (passwordConfirm) {
    passwordConfirm.addEventListener('input', validarPasswordsEnTiempoReal);
  }
  
  // Eventos para gestión de zonas de usuario
  const formAsignarZona = document.getElementById('form-asignar-zona');
  if (formAsignarZona) {
    formAsignarZona.addEventListener('submit', asignarZonaAUsuario);
  }
  
  console.log('Gestión mejorada de usuarios inicializada correctamente');
}

// ================================================================================
// GESTIÓN DE USUARIOS - CARGA Y VISUALIZACIÓN
// ================================================================================

async function cargarUsuariosMejorado() {
  console.log('Cargando usuarios...');
  
  try {
    mostrarCargando(true);
    
    const response = await fetch('/api/usuarios', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    usuariosCargados = await response.json();
    console.log(`Usuarios cargados: ${usuariosCargados.length}`);
    
    // SOLUCIÓN DIRECTA: Actualizar la tabla inmediatamente
    const tbody = document.getElementById('tabla-usuarios');
    if (!tbody) {
      console.error('No se encontró el elemento tabla-usuarios');
      return;
    }
    
    if (usuariosCargados.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center text-muted py-4">
            <i class="fas fa-users fa-2x mb-2"></i><br>
            <strong>No hay usuarios registrados</strong>
          </td>
        </tr>
      `;
      return;
    }
    
    // Generar el HTML directamente
    let html = '';
    usuariosCargados.forEach(usuario => {
      const badgeRol = usuario.ROL === 'administrador' ? 
        '<span class="badge bg-danger">Administrador</span>' : 
        usuario.ROL === 'operador' ? 
        '<span class="badge bg-warning">Operador</span>' : 
        '<span class="badge bg-info">Cliente</span>';
      
      const badgeEstado = usuario.ACTIVO ? 
        '<span class="badge bg-success">Activo</span>' : 
        '<span class="badge bg-secondary">Inactivo</span>';
      
      html += `
        <tr>
          <td><strong>${usuario.ID}</strong></td>
          <td>
            <div class="d-flex align-items-center">
              <div class="avatar-sm bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" style="width: 32px; height: 32px;">
                <i class="fas fa-user"></i>
              </div>
              <div>
                <strong>${usuario.NOMBRE}</strong>
                ${usuario.TELEFONO ? `<br><small class="text-muted">${usuario.TELEFONO}</small>` : ''}
              </div>
            </div>
          </td>
          <td>
            ${usuario.EMAIL}
            ${usuario.DIRECCION ? `<br><small class="text-muted">${usuario.DIRECCION}</small>` : ''}
          </td>
          <td>${badgeRol}</td>
          <td>${badgeEstado}</td>
          <td>
            ${usuario.MATRICULA || '<span class="text-muted">-</span>'}
          </td>
          <td>
            ${usuario.DNI || '<span class="text-muted">-</span>'}
          </td>
          <td>
            <div class="btn-group btn-group-sm" role="group">
              <button class="btn btn-outline-info btn-editar-usuario" data-usuario-id="${usuario.ID}" title="Editar usuario">
                <i class="fas fa-edit"></i>
              </button>
              <button class="btn btn-outline-primary btn-gestionar-zonas" data-usuario-id="${usuario.ID}" title="Gestionar zonas">
                <i class="fas fa-map-signs"></i>
              </button>
              <button class="btn btn-outline-danger btn-eliminar-usuario" data-usuario-id="${usuario.ID}" title="Eliminar usuario" ${usuario.ROL === 'administrador' ? 'disabled' : ''}>
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    });
    
    tbody.innerHTML = html;
    console.log('Tabla actualizada con', usuariosCargados.length, 'usuarios');
    
    // Agregar event listeners a los botones
    agregarEventListenersTablaUsuarios();
    
  } catch (error) {
    console.error('Error cargando usuarios:', error);
    mostrarMensajeError('Error al cargar usuarios: ' + error.message);
  } finally {
    mostrarCargando(false);
  }
}

function mostrarUsuariosEnTabla(usuarios) {
  console.log('mostrarUsuariosEnTabla llamada con', usuarios?.length || 0, 'usuarios');
  
  const tbody = document.getElementById('tabla-usuarios');
  if (!tbody) {
    console.error('Tabla de usuarios no encontrada');
    return;
  }
  
  console.log('tbody encontrado:', tbody);
  
  if (!usuarios || usuarios.length === 0) {
    console.log('No hay usuarios para mostrar');
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">
          <i class="fas fa-users fa-2x mb-2"></i><br>
          <strong>No hay usuarios que mostrar</strong><br>
          <small>No se encontraron usuarios con los filtros aplicados</small>
        </td>
      </tr>
    `;
    return;
  }
  
  console.log('Generando filas para', usuarios.length, 'usuarios');
  console.log('Primer usuario:', usuarios[0]);
  
  const filas = usuarios.map(usuario => {
    const badgeRol = obtenerBadgeRol(usuario.ROL);
    const badgeEstado = usuario.ACTIVO ? 
      '<span class="badge bg-success">Activo</span>' : 
      '<span class="badge bg-secondary">Inactivo</span>';
    
    return `
      <tr>
        <td><strong>${usuario.ID}</strong></td>
        <td>
          <div class="d-flex align-items-center">
            <div class="avatar-sm bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" style="width: 32px; height: 32px;">
              <i class="fas fa-user"></i>
            </div>
            <div>
              <strong>${usuario.NOMBRE}</strong>
              ${usuario.TELEFONO ? `<br><small class="text-muted">${usuario.TELEFONO}</small>` : ''}
            </div>
          </div>
        </td>
        <td>
          ${usuario.EMAIL}
          ${usuario.DIRECCION ? `<br><small class="text-muted">${usuario.DIRECCION}</small>` : ''}
        </td>
        <td>${badgeRol}</td>
        <td>${badgeEstado}</td>
        <td>
          ${usuario.MATRICULA || '<span class="text-muted">-</span>'}
        </td>
        <td>
          ${usuario.DNI || '<span class="text-muted">-</span>'}
        </td>
        <td>
          <div class="btn-group btn-group-sm" role="group">
            <button class="btn btn-outline-info btn-editar-usuario" 
                    data-usuario-id="${usuario.ID}" 
                    title="Editar usuario">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-outline-primary btn-gestionar-zonas" 
                    data-usuario-id="${usuario.ID}" 
                    title="Gestionar zonas">
              <i class="fas fa-map-signs"></i>
            </button>
            <button class="btn btn-outline-danger btn-eliminar-usuario" 
                    data-usuario-id="${usuario.ID}" 
                    title="Eliminar usuario"
                    ${usuario.ROL === 'administrador' ? 'disabled' : ''}>
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });
  
  console.log('Filas generadas:', filas.length);
  console.log('Contenido HTML a insertar:', filas.join('').substring(0, 200) + '...');
  
  tbody.innerHTML = filas.join('');
  
  console.log('Contenido insertado en la tabla');
  
  // Los botones de editar y gestionar zonas siguen usando delegación
  if (!tbody.hasAttribute('data-eventos-configurados')) {
    tbody.setAttribute('data-eventos-configurados', 'true');
    
    tbody.addEventListener('click', function(e) {
      const target = e.target;
      const button = target.closest('button');
      
      if (!button) return;
      
      const usuarioId = parseInt(button.getAttribute('data-usuario-id'));
      
      // Botón editar usuario
      if (button.classList.contains('btn-editar-usuario')) {
        e.preventDefault();
        if (usuarioId) {
          editarUsuario(usuarioId);
        }
      }
      // Botón gestionar zonas
      else if (button.classList.contains('btn-gestionar-zonas')) {
        e.preventDefault();
        if (usuarioId) {
          gestionarZonasDeUsuario(usuarioId);
        }
      }
      // Botón eliminar usuario
      else if (button.classList.contains('btn-eliminar-usuario')) {
        e.preventDefault();
        if (usuarioId && !button.disabled) {
          // Usar la función global que ya está definida
          window.eliminarUsuarioDirecto(usuarioId);
        }
      }
    });
  }
}

function obtenerBadgeRol(rol) {
  const roles = {
    'administrador': '<span class="badge bg-danger">Administrador</span>',
    'operador': '<span class="badge bg-warning">Operador</span>',
    'cliente': '<span class="badge bg-info">Cliente</span>'
  };
  return roles[rol] || `<span class="badge bg-secondary">${rol}</span>`;
}

// ================================================================================
// FILTROS DE USUARIOS
// ================================================================================

function aplicarFiltros() {
  console.log('aplicarFiltros: Iniciando...');
  
  const filtroRolElement = document.getElementById('filtro-rol');
  const filtroEstadoElement = document.getElementById('filtro-estado');
  const busquedaElement = document.getElementById('busqueda-usuarios');
  
  if (!filtroRolElement || !filtroEstadoElement) {
    console.error('aplicarFiltros: Elementos de filtro no encontrados');
    // Si no hay elementos de filtro, mostrar todos los usuarios
    mostrarUsuariosEnTabla(usuariosCargados);
    return;
  }
  
  const filtroRol = filtroRolElement.value;
  const filtroEstado = filtroEstadoElement.value;
  const busqueda = busquedaElement ? busquedaElement.value.toLowerCase() : '';
  
  filtrosActivos = { rol: filtroRol, estado: filtroEstado, busqueda: busqueda };
  
  usuariosFiltrados = usuariosCargados;
  
  // Filtrar por búsqueda
  if (busqueda) {
    usuariosFiltrados = usuariosFiltrados.filter(usuario => {
      return (
        usuario.NOMBRE.toLowerCase().includes(busqueda) ||
        usuario.EMAIL.toLowerCase().includes(busqueda) ||
        (usuario.DNI && usuario.DNI.toLowerCase().includes(busqueda)) ||
        (usuario.MATRICULA && usuario.MATRICULA.toLowerCase().includes(busqueda)) ||
        (usuario.TELEFONO && usuario.TELEFONO.toLowerCase().includes(busqueda))
      );
    });
  }
  
  // Filtrar por rol
  if (filtroRol) {
    usuariosFiltrados = usuariosFiltrados.filter(usuario => 
      usuario.ROL === filtroRol
    );
  }
  
  // Filtrar por estado
  if (filtroEstado !== '') {
    const estadoFiltro = filtroEstado === '1';
    usuariosFiltrados = usuariosFiltrados.filter(usuario => 
      Boolean(usuario.ACTIVO) === estadoFiltro
    );
  }
  
  console.log(`Aplicando filtros: ${usuariosFiltrados.length} usuarios de ${usuariosCargados.length}`);
  
  // Actualizar la tabla directamente
  const tbody = document.getElementById('tabla-usuarios');
  if (!tbody) {
    console.error('No se encontró el elemento tabla-usuarios');
    return;
  }
  
  if (usuariosFiltrados.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted py-4">
          <i class="fas fa-users fa-2x mb-2"></i><br>
          <strong>No hay usuarios que mostrar</strong><br>
          <small>No se encontraron usuarios con los filtros aplicados</small>
        </td>
      </tr>
    `;
    return;
  }
  
  // Generar el HTML
  let html = '';
  usuariosFiltrados.forEach(usuario => {
    const badgeRol = usuario.ROL === 'administrador' ? 
      '<span class="badge bg-danger">Administrador</span>' : 
      usuario.ROL === 'operador' ? 
      '<span class="badge bg-warning">Operador</span>' : 
      '<span class="badge bg-info">Cliente</span>';
    
    const badgeEstado = usuario.ACTIVO ? 
      '<span class="badge bg-success">Activo</span>' : 
      '<span class="badge bg-secondary">Inactivo</span>';
    
    html += `
      <tr>
        <td><strong>${usuario.ID}</strong></td>
        <td>
          <div class="d-flex align-items-center">
            <div class="avatar-sm bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" style="width: 32px; height: 32px;">
              <i class="fas fa-user"></i>
            </div>
            <div>
              <strong>${usuario.NOMBRE}</strong>
              ${usuario.TELEFONO ? `<br><small class="text-muted">${usuario.TELEFONO}</small>` : ''}
            </div>
          </div>
        </td>
        <td>
          ${usuario.EMAIL}
          ${usuario.DIRECCION ? `<br><small class="text-muted">${usuario.DIRECCION}</small>` : ''}
        </td>
        <td>${badgeRol}</td>
        <td>${badgeEstado}</td>
        <td>
          ${usuario.MATRICULA || '<span class="text-muted">-</span>'}
        </td>
        <td>
          ${usuario.DNI || '<span class="text-muted">-</span>'}
        </td>
        <td>
          <div class="btn-group btn-group-sm" role="group">
            <button class="btn btn-outline-info btn-editar-usuario" data-usuario-id="${usuario.ID}" title="Editar usuario">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-outline-primary btn-gestionar-zonas" data-usuario-id="${usuario.ID}" title="Gestionar zonas">
              <i class="fas fa-map-signs"></i>
            </button>
            <button class="btn btn-outline-danger btn-eliminar-usuario" data-usuario-id="${usuario.ID}" title="Eliminar usuario" ${usuario.ROL === 'administrador' ? 'disabled' : ''}>
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
  
  // Agregar event listeners
  agregarEventListenersTablaUsuarios();
}

function limpiarFiltros() {
  document.getElementById('filtro-rol').value = '';
  document.getElementById('filtro-estado').value = '';
  const inputBusqueda = document.getElementById('busqueda-usuarios');
  if (inputBusqueda) {
    inputBusqueda.value = '';
  }
  filtrosActivos = { rol: '', estado: '', busqueda: '' };
  aplicarFiltros();
}

// ================================================================================
// CREAR/EDITAR USUARIOS
// ================================================================================

function mostrarModalNuevoUsuario() {
  console.log('Mostrando modal para nuevo usuario');
  
  // Limpiar formulario
  limpiarFormularioUsuario();
  
  // Configurar modal para creación
  document.getElementById('modal-usuario-titulo').textContent = 'Nuevo Usuario';
  document.getElementById('usuario-id').value = '';
  
  // Establecer fecha de inicio por defecto
  const fechaHoy = new Date().toISOString().split('T')[0];
  document.getElementById('usuario-fecha-inicio').value = fechaHoy;
  
  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById('modal-usuario'));
  modal.show();
}

// Función alternativa de edición sin setTimeout
function editarUsuarioAlternativo(usuarioId) {
  console.log('Editando usuario (método alternativo):', usuarioId);
  
  const usuario = usuariosCargados.find(u => u.ID === usuarioId);
  if (!usuario) {
    mostrarMensajeError('Usuario no encontrado');
    return;
  }
  
  console.log('Datos del usuario a editar:', usuario);
  
  // No limpiar el formulario, directamente llenar los campos
  try {
    // Campos básicos
    const usuarioId_elem = document.getElementById('usuario-id');
    const usuarioNombre_elem = document.getElementById('usuario-nombre');
    const usuarioEmail_elem = document.getElementById('usuario-email');
    const usuarioRol_elem = document.getElementById('usuario-rol');
    const usuarioActivo_elem = document.getElementById('usuario-activo');
    
    if (usuarioId_elem) usuarioId_elem.value = usuario.ID || '';
    if (usuarioNombre_elem) usuarioNombre_elem.value = usuario.NOMBRE || '';
    if (usuarioEmail_elem) usuarioEmail_elem.value = usuario.EMAIL || '';
    if (usuarioRol_elem) usuarioRol_elem.value = usuario.ROL || '';
    if (usuarioActivo_elem) usuarioActivo_elem.checked = Boolean(usuario.ACTIVO);
    
    // Campos de información personal
    const usuarioDni_elem = document.getElementById('usuario-dni');
    const usuarioMatricula_elem = document.getElementById('usuario-matricula');
    const usuarioTelefono_elem = document.getElementById('usuario-telefono');
    const usuarioDireccion_elem = document.getElementById('usuario-direccion');
    
    if (usuarioDni_elem) usuarioDni_elem.value = usuario.DNI || '';
    if (usuarioMatricula_elem) usuarioMatricula_elem.value = usuario.MATRICULA || '';
    if (usuarioTelefono_elem) usuarioTelefono_elem.value = usuario.TELEFONO || '';
    if (usuarioDireccion_elem) usuarioDireccion_elem.value = usuario.DIRECCION || '';
    
    // Campos de control de acceso
    const usuarioTipoAcceso_elem = document.getElementById('usuario-tipo-acceso');
    const usuarioFechaInicio_elem = document.getElementById('usuario-fecha-inicio');
    const usuarioFechaFinal_elem = document.getElementById('usuario-fecha-final');
    const usuarioFechaRenovacion_elem = document.getElementById('usuario-fecha-renovacion');
    const usuarioComentarios_elem = document.getElementById('usuario-comentarios');
    
    if (usuarioTipoAcceso_elem) usuarioTipoAcceso_elem.value = usuario.TIPO_ACCESO || '';
    if (usuarioFechaInicio_elem) usuarioFechaInicio_elem.value = usuario.FECHA_INICIO ? usuario.FECHA_INICIO.split('T')[0] : '';
    if (usuarioFechaFinal_elem) usuarioFechaFinal_elem.value = usuario.FECHA_FINAL ? usuario.FECHA_FINAL.split('T')[0] : '';
    if (usuarioFechaRenovacion_elem) usuarioFechaRenovacion_elem.value = usuario.FECHA_RENOVACION ? usuario.FECHA_RENOVACION.split('T')[0] : '';
    if (usuarioComentarios_elem) usuarioComentarios_elem.value = usuario.COMENTARIOS || '';
    
    // Campos de contraseña - limpiar y hacer opcionales
    const passwordField = document.getElementById('usuario-password');
    const passwordConfirmField = document.getElementById('usuario-password-confirm');
    if (passwordField) {
      passwordField.value = '';
      passwordField.removeAttribute('required');
      passwordField.classList.remove('is-invalid', 'is-valid');
    }
    if (passwordConfirmField) {
      passwordConfirmField.value = '';
      passwordConfirmField.removeAttribute('required');
      passwordConfirmField.classList.remove('is-invalid', 'is-valid');
    }
    
    // Configurar título del modal
    const modalTitulo = document.getElementById('modal-usuario-titulo');
    if (modalTitulo) {
      modalTitulo.textContent = `Editar Usuario: ${usuario.NOMBRE}`;
    }
    
    // Texto de ayuda para contraseña
    const passwordHelp = passwordField ? passwordField.parentNode.querySelector('.text-muted') : null;
    if (passwordHelp) {
      passwordHelp.textContent = 'Dejar vacío para mantener la contraseña actual';
    }
    
    // Log de verificación
    console.log('Valores asignados:');
    console.log('- ID:', usuarioId_elem ? usuarioId_elem.value : 'NO ENCONTRADO');
    console.log('- Nombre:', usuarioNombre_elem ? usuarioNombre_elem.value : 'NO ENCONTRADO');
    console.log('- Email:', usuarioEmail_elem ? usuarioEmail_elem.value : 'NO ENCONTRADO');
    console.log('- Rol:', usuarioRol_elem ? usuarioRol_elem.value : 'NO ENCONTRADO');
    
    // Mostrar modal
    const modal = new bootstrap.Modal(document.getElementById('modal-usuario'));
    modal.show();
    
    console.log('Modal de edición mostrado (método alternativo)');
    
  } catch (error) {
    console.error('Error en editarUsuarioAlternativo:', error);
    mostrarMensajeError('Error al preparar el formulario de edición');
  }
}

// Exponer función alternativa
window.editarUsuarioAlternativo = editarUsuarioAlternativo;

function editarUsuario(usuarioId) {
  // Usar la función alternativa que funciona mejor
  return editarUsuarioAlternativo(usuarioId);
}

// Función de debug para verificar el estado del formulario
function debugFormularioUsuario() {
  console.log('=== DEBUG: Estado del formulario de usuario ===');
  
  const campos = [
    'usuario-id', 'usuario-nombre', 'usuario-email', 'usuario-password', 
    'usuario-password-confirm', 'usuario-rol', 'usuario-dni', 'usuario-matricula',
    'usuario-telefono', 'usuario-direccion', 'usuario-tipo-acceso', 
    'usuario-fecha-inicio', 'usuario-fecha-final', 'usuario-fecha-renovacion',
    'usuario-comentarios'
  ];
  
  campos.forEach(campoId => {
    const elemento = document.getElementById(campoId);
    if (elemento) {
      console.log(`${campoId}: "${elemento.value}" (requerido: ${elemento.hasAttribute('required')})`);
    } else {
      console.log(`${campoId}: ELEMENTO NO ENCONTRADO`);
    }
  });
  
  const checkboxActivo = document.getElementById('usuario-activo');
  if (checkboxActivo) {
    console.log(`usuario-activo: ${checkboxActivo.checked}`);
  }
  
  console.log('=== FIN DEBUG ===');
}

// Exponer función de debug globalmente
window.debugFormularioUsuario = debugFormularioUsuario;

function limpiarFormularioUsuario() {
  console.log('Limpiando formulario de usuario...');
  
  const form = document.getElementById('form-usuario');
  if (!form) {
    console.error('Formulario de usuario no encontrado');
    return;
  }
  
  // Limpiar todos los campos del formulario
  const campos = [
    'usuario-id', 'usuario-nombre', 'usuario-email', 'usuario-password', 
    'usuario-password-confirm', 'usuario-rol', 'usuario-dni', 'usuario-matricula',
    'usuario-telefono', 'usuario-direccion', 'usuario-tipo-acceso', 
    'usuario-fecha-inicio', 'usuario-fecha-final', 'usuario-fecha-renovacion',
    'usuario-comentarios'
  ];
  
  campos.forEach(campoId => {
    const elemento = document.getElementById(campoId);
    if (elemento) {
      elemento.value = '';
      elemento.classList.remove('is-valid', 'is-invalid');
    }
  });
  
  // Restablecer checkbox de usuario activo
  const checkboxActivo = document.getElementById('usuario-activo');
  if (checkboxActivo) {
    checkboxActivo.checked = true;
  }
  
  // Restablecer campos de contraseña como requeridos (para usuarios nuevos)
  const passwordField = document.getElementById('usuario-password');
  const passwordConfirmField = document.getElementById('usuario-password-confirm');
  if (passwordField) {
    passwordField.setAttribute('required', 'required');
  }
  if (passwordConfirmField) {
    passwordConfirmField.setAttribute('required', 'required');
  }
  
  // Restablecer texto de ayuda de contraseña
  const passwordHelp = passwordField ? passwordField.parentNode.querySelector('.text-muted') : null;
  if (passwordHelp) {
    passwordHelp.textContent = 'Mínimo 6 caracteres';
  }
  
  console.log('Formulario de usuario limpiado correctamente');
}

function validarPasswordsEnTiempoReal() {
  const password = document.getElementById('usuario-password').value;
  const passwordConfirm = document.getElementById('usuario-password-confirm').value;
  const passwordConfirmField = document.getElementById('usuario-password-confirm');
  
  if (password && passwordConfirm) {
    if (password === passwordConfirm) {
      passwordConfirmField.classList.remove('is-invalid');
      passwordConfirmField.classList.add('is-valid');
    } else {
      passwordConfirmField.classList.remove('is-valid');
      passwordConfirmField.classList.add('is-invalid');
    }
  }
}

async function guardarUsuarioMejorado() {
  console.log('Guardando usuario...');
  
  try {
    // Validar formulario
    if (!validarFormularioUsuario()) {
      return;
    }
    
    // Obtener datos del formulario
    const datos = obtenerDatosFormularioUsuario();
    
    // DEBUG: Mostrar exactamente qué se está enviando
    console.log('Datos que se enviarán al servidor:', JSON.stringify(datos, null, 2));
    
    // Determinar si es creación o edición
    const usuarioId = document.getElementById('usuario-id').value;
    const esEdicion = usuarioId && usuarioId !== '';
    
    // En edición, si no hay contraseña, no incluirla
    if (esEdicion && !datos.password) {
      delete datos.password;
    }
    
    mostrarCargando(true);
    
    const url = esEdicion ? `/api/usuarios/${usuarioId}` : '/api/usuarios';
    const method = esEdicion ? 'PUT' : 'POST';
    
    console.log(`Enviando petición ${method} a ${url}`);
    
    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(datos)
    });
    
    if (!response.ok) {
      const error = await response.json();
      console.error('Error del servidor:', error);
      throw new Error(error.error || `Error ${response.status}`);
    }
    
    const resultado = await response.json();
    
    mostrarMensajeExito(esEdicion ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
    
    // Cerrar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('modal-usuario'));
    if (modal) {
      modal.hide();
    }
    
    // Recargar usuarios
    await cargarUsuariosMejorado();
    
  } catch (error) {
    console.error('Error guardando usuario:', error);
    mostrarMensajeError('Error al guardar usuario: ' + error.message);
  } finally {
    mostrarCargando(false);
  }
}

function validarFormularioUsuario() {
  const usuarioId = document.getElementById('usuario-id').value;
  const esEdicion = usuarioId && usuarioId !== '';
  
  // Limpiar mensajes de error previos
  document.querySelectorAll('.is-invalid').forEach(el => {
    el.classList.remove('is-invalid');
  });
  
  let errores = [];
  
  // Validar nombre
  const nombreElement = document.getElementById('usuario-nombre');
  const nombreValor = nombreElement ? nombreElement.value.trim() : '';
  console.log('Validando nombre:', nombreValor);
  
  if (!nombreValor) {
    errores.push('El campo Nombre es obligatorio');
    if (nombreElement) {
      nombreElement.classList.add('is-invalid');
      // Añadir mensaje de error específico debajo del campo
      let feedback = nombreElement.nextElementSibling;
      if (!feedback || !feedback.classList.contains('invalid-feedback')) {
        feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';
        nombreElement.parentNode.appendChild(feedback);
      }
      feedback.textContent = 'Por favor, ingrese el nombre del usuario';
    }
  } else {
    if (nombreElement) {
      nombreElement.classList.remove('is-invalid');
      nombreElement.classList.add('is-valid');
    }
  }
  
  // Validar email
  const emailElement = document.getElementById('usuario-email');
  const emailValor = emailElement ? emailElement.value.trim() : '';
  console.log('Validando email:', emailValor);
  
  if (!emailValor) {
    errores.push('El campo Email es obligatorio');
    if (emailElement) {
      emailElement.classList.add('is-invalid');
    }
  } else {
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailValor)) {
      errores.push('El formato del email no es válido');
      if (emailElement) {
        emailElement.classList.add('is-invalid');
      }
    } else {
      if (emailElement) {
        emailElement.classList.remove('is-invalid');
        emailElement.classList.add('is-valid');
      }
    }
  }
  
  // Validar rol
  const rolElement = document.getElementById('usuario-rol');
  const rolValor = rolElement ? rolElement.value : '';
  console.log('Validando rol:', rolValor);
  
  if (!rolValor) {
    errores.push('El campo Rol es obligatorio');
    if (rolElement) {
      rolElement.classList.add('is-invalid');
    }
  } else {
    if (rolElement) {
      rolElement.classList.remove('is-invalid');
      rolElement.classList.add('is-valid');
    }
  }
  
  // Validar contraseñas si se proporcionan
  const passwordElement = document.getElementById('usuario-password');
  const passwordConfirmElement = document.getElementById('usuario-password-confirm');
  const passwordValor = passwordElement ? passwordElement.value : '';
  const passwordConfirmValor = passwordConfirmElement ? passwordConfirmElement.value : '';
  
  // Si es creación, la contraseña es obligatoria
  if (!esEdicion && !passwordValor) {
    errores.push('La contraseña es obligatoria para usuarios nuevos');
    if (passwordElement) {
      passwordElement.classList.add('is-invalid');
    }
  } else if (passwordValor) {
    // Si hay contraseña, validar longitud
    if (passwordValor.length < 6) {
      errores.push('La contraseña debe tener al menos 6 caracteres');
      if (passwordElement) {
        passwordElement.classList.add('is-invalid');
      }
    } else {
      if (passwordElement) {
        passwordElement.classList.remove('is-invalid');
        passwordElement.classList.add('is-valid');
      }
    }
    
    // Validar confirmación de contraseña
    if (passwordValor !== passwordConfirmValor) {
      errores.push('Las contraseñas no coinciden');
      if (passwordConfirmElement) {
        passwordConfirmElement.classList.add('is-invalid');
      }
    } else if (passwordConfirmValor) {
      if (passwordConfirmElement) {
        passwordConfirmElement.classList.remove('is-invalid');
        passwordConfirmElement.classList.add('is-valid');
      }
    }
  }
  
  // Mostrar errores si existen
  if (errores.length > 0) {
    console.error('Errores de validación:', errores);
    // Mostrar el primer error
    mostrarMensajeError(errores[0]);
    // Hacer scroll al primer campo con error
    const primerError = document.querySelector('.is-invalid');
    if (primerError) {
      primerError.focus();
      primerError.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return false;
  }
  
  console.log('Validación exitosa');
  return true;
}

function obtenerDatosFormularioUsuario() {
  // El servidor espera los campos en minúsculas (formato camelCase)
  return {
    nombre: document.getElementById('usuario-nombre').value.trim(),
    email: document.getElementById('usuario-email').value.trim(),
    password: document.getElementById('usuario-password').value,
    rol: document.getElementById('usuario-rol').value,
    activo: document.getElementById('usuario-activo').checked ? 1 : 0,
    dni: document.getElementById('usuario-dni').value.trim() || null,
    matricula: document.getElementById('usuario-matricula').value.trim() || null,
    telefono: document.getElementById('usuario-telefono').value.trim() || null,
    direccion: document.getElementById('usuario-direccion').value.trim() || null,
    tipoAcceso: document.getElementById('usuario-tipo-acceso').value || null,
    fechaInicio: document.getElementById('usuario-fecha-inicio').value || null,
    fechaFinal: document.getElementById('usuario-fecha-final').value || null,
    fechaRenovacion: document.getElementById('usuario-fecha-renovacion').value || null,
    comentarios: document.getElementById('usuario-comentarios').value.trim() || null
  };
}

// ================================================================================
// ELIMINAR USUARIOS
// ================================================================================

// La función eliminarUsuarioDirecto ya está definida al principio del archivo

async function eliminarUsuario(usuarioId) {
  const usuario = usuariosCargados.find(u => u.ID === usuarioId);
  if (!usuario) {
    mostrarMensajeError('Usuario no encontrado');
    return;
  }
  
  // No permitir eliminar administradores
  if (usuario.ROL === 'administrador') {
    mostrarMensajeError('No se puede eliminar un usuario administrador');
    return;
  }
  
  const confirmacion = await mostrarConfirmacion(
    'Eliminar Usuario',
    `¿Está seguro de que desea eliminar al usuario "${usuario.NOMBRE}"?\n\nEsta acción no se puede deshacer.`
  );
  
  if (!confirmacion) return;
  
  try {
    mostrarCargando(true);
    
    const response = await fetch(`/api/usuarios/${usuarioId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error ${response.status}`);
    }
    
    mostrarMensajeExito('Usuario eliminado correctamente');
    await cargarUsuariosMejorado();
    
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    mostrarMensajeError('Error al eliminar usuario: ' + error.message);
  } finally {
    mostrarCargando(false);
  }
}

// ================================================================================
// GESTIÓN DE ZONAS DE USUARIO
// ================================================================================

async function gestionarZonasDeUsuario(usuarioId) {
  const usuario = usuariosCargados.find(u => u.ID === usuarioId);
  if (!usuario) {
    mostrarMensajeError('Usuario no encontrado');
    return;
  }
  
  // Configurar modal
  document.getElementById('zonas-usuario-titulo').textContent = 
    `Zonas asignadas a: ${usuario.NOMBRE}`;
  
  // Cargar datos
  await cargarZonasDeUsuario(usuarioId);
  await cargarZonasDisponiblesParaUsuario(usuarioId);
  
  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById('modal-zonas-usuario'));
  modal.show();
  
  // Guardar usuario seleccionado para otros métodos
  window.usuarioSeleccionadoParaZonas = usuarioId;
}

async function cargarZonasDeUsuario(usuarioId) {
  try {
    const response = await fetch(`/api/usuarios/${usuarioId}/zonas`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      mostrarZonasDeUsuarioEnTabla(data.zonas || []);
    } else {
      mostrarZonasDeUsuarioEnTabla([]);
    }
  } catch (error) {
    console.error('Error cargando zonas del usuario:', error);
    mostrarZonasDeUsuarioEnTabla([]);
  }
}

function mostrarZonasDeUsuarioEnTabla(zonas) {
  const tbody = document.getElementById('tabla-zonas-usuario');
  const contador = document.getElementById('contador-zonas');
  
  if (!tbody || !contador) return;
  
  contador.textContent = `${zonas.length} zonas`;
  
  if (zonas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted py-4">
          <i class="fas fa-map-signs fa-2x mb-2"></i><br>
          No hay zonas asignadas a este usuario
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = zonas.map(zona => {
    const badgePermisos = obtenerBadgePermisos(zona.PERMISOS);
    
    return `
      <tr>
        <td><strong>${zona.ID}</strong></td>
        <td><strong>${zona.NOMBRE}</strong></td>
        <td>${zona.DESCRIPCION || '<span class="text-muted">-</span>'}</td>
        <td>${badgePermisos}</td>
        <td>
          <div class="btn-group btn-group-sm" role="group">
            <button class="btn btn-outline-warning btn-editar-permisos-zona" 
                    data-zona-id="${zona.ID}" 
                    data-usuario-id="${window.usuarioSeleccionadoParaZonas}" 
                    data-permisos="${zona.PERMISOS}"
                    title="Editar permisos">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-outline-danger btn-eliminar-zona-usuario" 
                    data-zona-id="${zona.ID}" 
                    data-usuario-id="${window.usuarioSeleccionadoParaZonas}" 
                    title="Eliminar zona">
              <i class="fas fa-times"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
  
  // Configurar event listeners después de actualizar la tabla
  configurarEventListenersZonasUsuarioMejorado();
}

function obtenerBadgePermisos(permisos) {
  const badges = {
    'bajar': '<span class="badge bg-success">Solo bajar</span>',
    'subir,bajar': '<span class="badge bg-warning">Subir y bajar</span>',
    'completo': '<span class="badge bg-danger">Control completo</span>'
  };
  return badges[permisos] || `<span class="badge bg-secondary">${permisos}</span>`;
}

async function cargarZonasDisponiblesParaUsuario(usuarioId) {
  try {
    const response = await fetch(`/api/usuarios/${usuarioId}/zonas-disponibles`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const zonas = await response.json();
      const select = document.getElementById('select-zonas-disponibles');
      
      if (select) {
        select.innerHTML = '<option value="">Seleccionar zona...</option>';
        zonas.forEach(zona => {
          select.innerHTML += `<option value="${zona.ID}">${zona.NOMBRE}</option>`;
        });
      }
    }
  } catch (error) {
    console.error('Error cargando zonas disponibles:', error);
  }
}

async function asignarZonaAUsuario(e) {
  e.preventDefault();
  
  const zonaId = document.getElementById('select-zonas-disponibles').value;
  const permisos = document.getElementById('select-permisos-zona').value;
  const usuarioId = window.usuarioSeleccionadoParaZonas;
  
  if (!zonaId || !permisos) {
    mostrarMensajeError('Por favor seleccione una zona y los permisos');
    return;
  }
  
  try {
    mostrarCargando(true);
    
    const response = await fetch(`/api/usuarios/${usuarioId}/zonas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ zonaId, permisos })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error ${response.status}`);
    }
    
    mostrarMensajeExito('Zona asignada correctamente');
    
    // Recargar datos
    await cargarZonasDeUsuario(usuarioId);
    await cargarZonasDisponiblesParaUsuario(usuarioId);
    
    // Limpiar formulario
    document.getElementById('form-asignar-zona').reset();
    
  } catch (error) {
    console.error('Error asignando zona:', error);
    mostrarMensajeError('Error al asignar zona: ' + error.message);
  } finally {
    mostrarCargando(false);
  }
}

async function eliminarZonaDeUsuario(zonaId) {
  const usuarioId = window.usuarioSeleccionadoParaZonas;
  
  const confirmacion = await mostrarConfirmacion(
    'Eliminar Zona',
    '¿Está seguro de que desea eliminar esta zona del usuario?'
  );
  
  if (!confirmacion) return;
  
  try {
    mostrarCargando(true);
    
    const response = await fetch(`/api/usuarios/${usuarioId}/zonas/${zonaId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error ${response.status}`);
    }
    
    mostrarMensajeExito('Zona eliminada correctamente');
    
    // Recargar datos
    await cargarZonasDeUsuario(usuarioId);
    await cargarZonasDisponiblesParaUsuario(usuarioId);
    
  } catch (error) {
    console.error('Error eliminando zona:', error);
    mostrarMensajeError('Error al eliminar zona: ' + error.message);
  } finally {
    mostrarCargando(false);
  }
}

// Función para configurar event listeners en los botones de zonas de usuario
function configurarEventListenersZonasUsuarioMejorado() {
  console.log('Configurando event listeners para botones de zonas...');
  
  // Event listeners para editar permisos
  document.querySelectorAll('.btn-editar-permisos-zona').forEach(btn => {
    btn.addEventListener('click', async function(e) {
      e.preventDefault();
      const zonaId = parseInt(this.getAttribute('data-zona-id'));
      const usuarioId = parseInt(this.getAttribute('data-usuario-id'));
      const permisosActuales = this.getAttribute('data-permisos');
      await editarPermisosZonaUsuarioMejorado(zonaId, usuarioId, permisosActuales);
    });
  });
  
  // Event listeners para eliminar zona
  document.querySelectorAll('.btn-eliminar-zona-usuario').forEach(btn => {
    btn.addEventListener('click', async function(e) {
      e.preventDefault();
      const zonaId = parseInt(this.getAttribute('data-zona-id'));
      await eliminarZonaDeUsuario(zonaId);
    });
  });
}

// Función mejorada para editar permisos
async function editarPermisosZonaUsuarioMejorado(zonaId, usuarioId, permisosActuales) {
  console.log('Editar permisos para zona:', zonaId, 'usuario:', usuarioId, 'permisos actuales:', permisosActuales);
  
  // Crear un modal simple para cambiar permisos
  const modalHtml = `
    <div class="modal fade" id="modal-editar-permisos-zona-temp" tabindex="-1">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">Editar Permisos de Zona</h5>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <label for="select-nuevos-permisos-zona" class="form-label">Seleccione los permisos:</label>
            <select class="form-select" id="select-nuevos-permisos-zona">
              <option value="bajar" ${permisosActuales === 'bajar' ? 'selected' : ''}>Solo bajar</option>
              <option value="subir,bajar" ${permisosActuales === 'subir,bajar' ? 'selected' : ''}>Subir y bajar</option>
              <option value="completo" ${permisosActuales === 'completo' ? 'selected' : ''}>Control completo</option>
            </select>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" id="btn-guardar-permisos-zona-temp">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Agregar el modal al DOM temporalmente
  const existingModal = document.getElementById('modal-editar-permisos-zona-temp');
  if (existingModal) {
    existingModal.remove();
  }
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  const modalElement = document.getElementById('modal-editar-permisos-zona-temp');
  const modal = new bootstrap.Modal(modalElement);
  
  // Mostrar el modal
  modal.show();
  
  // Manejar el botón guardar
  const btnGuardar = document.getElementById('btn-guardar-permisos-zona-temp');
  const selectPermisos = document.getElementById('select-nuevos-permisos-zona');
  
  btnGuardar.addEventListener('click', async () => {
    const nuevosPermisos = selectPermisos.value;
    modal.hide();
    
    try {
      mostrarCargando(true);
      
      const response = await fetch(`/api/usuarios/${usuarioId}/zonas/${zonaId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ permisos: nuevosPermisos })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Error ${response.status}`);
      }
      
      mostrarMensajeExito('Permisos actualizados correctamente');
      // Recargar zonas del usuario
      await cargarZonasDeUsuario(usuarioId);
      
    } catch (error) {
      console.error('Error actualizando permisos:', error);
      mostrarMensajeError('Error al actualizar permisos: ' + error.message);
    } finally {
      mostrarCargando(false);
    }
  });
  
  // Limpiar el modal cuando se cierre
  modalElement.addEventListener('hidden.bs.modal', () => {
    modalElement.remove();
  });
}

function editarPermisosZonaUsuario(zonaId) {
  // Usar la nueva función mejorada
  const usuarioId = window.usuarioSeleccionadoParaZonas;
  if (usuarioId) {
    editarPermisosZonaUsuarioMejorado(zonaId, usuarioId, 'bajar');
  } else {
    mostrarMensajeError('No se ha seleccionado ningún usuario');
  }
}

// ================================================================================
// GESTIÓN DE ZONAS (INTEGRADA)
// ================================================================================

function mostrarGestionZonas() {
  // Cambiar a la página de zonas si existe, o mostrar modal
  const paginaZonas = document.getElementById('page-zonas');
  if (paginaZonas) {
    // Cambiar a la página de zonas
    if (typeof cambiarPagina === 'function') {
      cambiarPagina('zonas');
    } else {
      // Método alternativo si cambiarPagina no está disponible
      document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
      });
      document.querySelectorAll('[id^="page-"]').forEach(page => {
        page.classList.add('hidden');
      });
      paginaZonas.classList.remove('hidden');
      const linkZonas = document.querySelector('[data-page="zonas"]');
      if (linkZonas) {
        linkZonas.classList.add('active');
      }
      // Cargar zonas si la función existe
      if (typeof cargarZonas === 'function') {
        cargarZonas();
      }
    }
  } else {
    mostrarMensajeInfo('Gestión de zonas integrada - funcionalidad en desarrollo');
  }
}

// ================================================================================
// UTILIDADES Y HELPERS
// ================================================================================

function mostrarConfirmacion(titulo, mensaje) {
  // Usar la función personalizada si está disponible
  if (typeof mostrarConfirmacionPersonalizada === 'function') {
    return mostrarConfirmacionPersonalizada(titulo, mensaje);
  }
  
  // Guardar referencia al modal activo actual
  const activeModal = document.querySelector('.modal.show');
  let activeModalInstance = null;
  if (activeModal) {
    activeModalInstance = bootstrap.Modal.getInstance(activeModal);
  }
  
  // Crear un modal de confirmación con z-index alto
  return new Promise((resolve) => {
    const modalHtml = `
      <div class="modal fade" id="modal-confirmar-usuario-temp" tabindex="-1" style="z-index: 9999 !important;">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-header bg-danger text-white">
              <h5 class="modal-title">${titulo}</h5>
              <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
            </div>
            <div class="modal-body">
              <p>${mensaje}</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
              <button type="button" class="btn btn-danger" id="btn-confirmar-usuario-temp">Eliminar</button>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Eliminar modal previo si existe
    const existingModal = document.getElementById('modal-confirmar-usuario-temp');
    if (existingModal) {
      existingModal.remove();
    }
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    const modalElement = document.getElementById('modal-confirmar-usuario-temp');
    
    // Crear modal con backdrop estático
    const modal = new bootstrap.Modal(modalElement, {
      backdrop: 'static',
      keyboard: false
    });
    
    // Ajustar z-index del backdrop cuando se muestre
    modalElement.addEventListener('shown.bs.modal', () => {
      const backdrops = document.querySelectorAll('.modal-backdrop');
      // Buscar el último backdrop (el más reciente)
      if (backdrops.length > 0) {
        const lastBackdrop = backdrops[backdrops.length - 1];
        lastBackdrop.style.zIndex = '9998';
      }
    });
    
    modal.show();
    
    // Configurar eventos
    const btnConfirmar = document.getElementById('btn-confirmar-usuario-temp');
    const btnCancelar = modalElement.querySelector('.btn-secondary');
    
    const handleClose = (result) => {
      modal.hide();
      
      // Esperar a que se complete la animación de cierre
      modalElement.addEventListener('hidden.bs.modal', () => {
        modalElement.remove();
        
        // Restaurar el foco al modal anterior si existe
        if (activeModalInstance && activeModal) {
          // Asegurar que el body mantenga la clase modal-open
          document.body.classList.add('modal-open');
          
          // Reactivar el modal anterior
          activeModal.classList.add('show');
          activeModal.style.display = 'block';
          
          // Asegurar que el backdrop del modal anterior esté visible
          const remainingBackdrops = document.querySelectorAll('.modal-backdrop');
          if (remainingBackdrops.length > 0) {
            remainingBackdrops[remainingBackdrops.length - 1].style.zIndex = '';
          }
          
          // Restaurar el foco
          setTimeout(() => {
            const focusableElement = activeModal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusableElement) {
              focusableElement.focus();
            }
          }, 100);
        }
        
        resolve(result);
      }, { once: true });
    };
    
    btnConfirmar.addEventListener('click', () => handleClose(true));
    btnCancelar.addEventListener('click', () => handleClose(false));
  });
}

function mostrarCargando(mostrar) {
  const loading = document.getElementById('loading');
  if (loading) {
    if (mostrar) {
      loading.classList.remove('hidden');
    } else {
      loading.classList.add('hidden');
    }
  }
}

function mostrarMensajeExito(mensaje) {
  console.log('✅ Éxito:', mensaje);
  if (typeof mostrarAlertaExito === 'function') {
    mostrarAlertaExito(mensaje);
  } else if (typeof mostrarAlerta === 'function') {
    mostrarAlerta('success', mensaje);
  } else {
    alert('Éxito: ' + mensaje);
  }
}

function mostrarMensajeError(mensaje) {
  console.error('❌ Error:', mensaje);
  if (typeof mostrarAlertaError === 'function') {
    mostrarAlertaError(mensaje);
  } else if (typeof mostrarAlerta === 'function') {
    mostrarAlerta('error', mensaje);
  } else {
    alert('Error: ' + mensaje);
  }
}

function mostrarMensajeInfo(mensaje) {
  console.log('ℹ️ Info:', mensaje);
  if (typeof mostrarAlertaInfo === 'function') {
    mostrarAlertaInfo(mensaje);
  } else if (typeof mostrarAlerta === 'function') {
    mostrarAlerta('info', mensaje);
  } else {
    alert('Info: ' + mensaje);
  }
}

// ================================================================================
// EXPOSICIÓN GLOBAL DE FUNCIONES
// ================================================================================

// Exponer funciones para uso global
window.initUsuariosMejorado = initUsuariosMejorado;
window.cargarUsuariosMejorado = cargarUsuariosMejorado;
window.editarUsuario = editarUsuario;
window.eliminarUsuario = eliminarUsuario;
window.gestionarZonasDeUsuario = gestionarZonasDeUsuario;
window.eliminarZonaDeUsuario = eliminarZonaDeUsuario;
window.editarPermisosZonaUsuario = editarPermisosZonaUsuario;
window.editarPermisosZonaUsuarioMejorado = editarPermisosZonaUsuarioMejorado;
window.configurarEventListenersZonasUsuarioMejorado = configurarEventListenersZonasUsuarioMejorado;

// Exponer funciones adicionales para depuración
window.mostrarUsuariosEnTabla = mostrarUsuariosEnTabla;
window.aplicarFiltros = aplicarFiltros;

// Función auxiliar para cargar usuarios cuando se muestre la página
window.addEventListener('load', () => {
  // Verificar si estamos en la página de usuarios al cargar
  setTimeout(() => {
    const paginaUsuarios = document.getElementById('page-usuarios');
    if (paginaUsuarios && !paginaUsuarios.classList.contains('hidden')) {
      console.log('Página de usuarios activa al cargar, llamando a cargarUsuariosMejorado...');
      cargarUsuariosMejorado();
    }
  }, 1000);
});

// Función de depuración para verificar el estado del módulo de usuarios
window.debugUsuarios = function() {
  console.log('=== DEBUG: Estado del módulo de usuarios ===');
  console.log('usuariosCargados:', usuariosCargados);
  console.log('usuariosFiltrados:', usuariosFiltrados);
  console.log('filtrosActivos:', filtrosActivos);
  
  const tbody = document.getElementById('tabla-usuarios');
  console.log('tbody encontrado:', tbody);
  console.log('Contenido actual del tbody:', tbody ? tbody.innerHTML.substring(0, 200) + '...' : 'NO ENCONTRADO');
  
  const paginaUsuarios = document.getElementById('page-usuarios');
  console.log('Página usuarios visible:', paginaUsuarios && !paginaUsuarios.classList.contains('hidden'));
  
  console.log('\nPara forzar la carga, ejecute: cargarUsuariosMejorado()');
  console.log('=== FIN DEBUG ===');
};

console.log('Módulo usuarios-mejorado.js cargado correctamente');
console.log('Para depurar el estado de usuarios, ejecute: debugUsuarios()');