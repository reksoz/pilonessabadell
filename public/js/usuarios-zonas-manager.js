// usuarios-zonas-manager.js - Gestión completa de usuarios y zonas (Continuación)
// ================================================================================

// Variables globales para el manejo de usuarios y zonas
let usuariosData = [];
let zonasManagerData = []; // Cambiado de zonasData para evitar conflicto con gestion-zonas.js
let usuarioSeleccionadoZonas = null;
let zonaSeleccionadaManager = null; // Cambiado de zonaSeleccionada para evitar conflicto

// ================================================================================
// GESTIÓN DE USUARIOS
// ================================================================================

// Inicializar eventos para usuarios
function initUsuariosEvents() {
  console.log('Inicializando eventos de usuarios...');
  
  // Botón para crear nuevo usuario
  const btnNuevoUsuario = document.getElementById('btn-nuevo-usuario');
  if (btnNuevoUsuario) {
    btnNuevoUsuario.addEventListener('click', mostrarModalNuevoUsuario);
  }
  
  // Botón para guardar usuario
  const btnGuardarUsuario = document.getElementById('btn-guardar-usuario');
  if (btnGuardarUsuario) {
    btnGuardarUsuario.addEventListener('click', guardarUsuario);
  }
  
  // Validación de contraseñas en tiempo real
  const passwordConfirm = document.getElementById('usuario-password-confirm');
  if (passwordConfirm) {
    passwordConfirm.addEventListener('input', validarPasswordsUsuario);
  }
  
  // Evento para asignar zona
  const formAsignarZona = document.getElementById('form-asignar-zona');
  if (formAsignarZona) {
    formAsignarZona.addEventListener('submit', asignarZonaUsuario);
  }
}

// Mostrar modal para crear nuevo usuario
function mostrarModalNuevoUsuario() {
  console.log('Mostrando modal para nuevo usuario');
  
  // Limpiar formulario
  limpiarFormularioUsuario();
  
  // Configurar modal para nuevo usuario
  document.getElementById('modal-usuario-titulo').textContent = 'Nuevo Usuario';
  document.getElementById('usuario-id').value = '';
  
  // Establecer fecha de inicio por defecto
  const fechaActual = new Date().toISOString().split('T')[0];
  document.getElementById('usuario-fecha-inicio').value = fechaActual;
  
  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById('modal-usuario'));
  modal.show();
}

// Validar que las contraseñas coincidan
function validarPasswordsUsuario() {
  const password = document.getElementById('usuario-password').value;
  const passwordConfirm = document.getElementById('usuario-password-confirm').value;
  const btnGuardar = document.getElementById('btn-guardar-usuario');
  
  if (password && passwordConfirm) {
    if (password === passwordConfirm) {
      document.getElementById('usuario-password-confirm').classList.remove('is-invalid');
      document.getElementById('usuario-password-confirm').classList.add('is-valid');
      btnGuardar.disabled = false;
    } else {
      document.getElementById('usuario-password-confirm').classList.remove('is-valid');
      document.getElementById('usuario-password-confirm').classList.add('is-invalid');
      btnGuardar.disabled = true;
    }
  }
}

// Limpiar formulario de usuario
function limpiarFormularioUsuario() {
  const form = document.getElementById('form-usuario');
  if (form) {
    form.reset();
    
    // Restablecer el estado activo por defecto
    document.getElementById('usuario-activo').checked = true;
    
    // Limpiar clases de validación
    const campos = form.querySelectorAll('.form-control, .form-select');
    campos.forEach(campo => {
      campo.classList.remove('is-valid', 'is-invalid');
    });
    
    // Habilitar botón guardar
    document.getElementById('btn-guardar-usuario').disabled = false;
  }
}

// Guardar usuario (crear o editar)
async function guardarUsuario() {
  console.log('Guardando usuario...');
  
  try {
    // Validar formulario
    if (!validarFormularioUsuario()) {
      return;
    }
    
    // Recopilar datos del formulario
    const datos = recopilarDatosUsuario();
    
    // Determinar si es creación o edición
    const usuarioId = document.getElementById('usuario-id').value;
    const esEdicion = usuarioId && usuarioId !== '';
    
    // Realizar petición al servidor
    const url = esEdicion ? `/api/usuarios/${usuarioId}` : '/api/usuarios';
    const method = esEdicion ? 'PUT' : 'POST';
    
    mostrarCargando(true);
    
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(datos)
    });
    
    const resultado = await response.json();
    
    if (response.ok) {
      mostrarMensaje('success', esEdicion ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
      
      // Cerrar modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('modal-usuario'));
      modal.hide();
      
      // Recargar lista de usuarios
      await cargarUsuarios();
    } else {
      mostrarMensaje('error', resultado.error || 'Error al guardar usuario');
    }
  } catch (error) {
    console.error('Error guardando usuario:', error);
    mostrarMensaje('error', 'Error de conexión al guardar usuario');
  } finally {
    mostrarCargando(false);
  }
}

// Validar formulario de usuario
function validarFormularioUsuario() {
  const campos = [
    { id: 'usuario-nombre', nombre: 'Nombre' },
    { id: 'usuario-email', nombre: 'Email' },
    { id: 'usuario-password', nombre: 'Contraseña' },
    { id: 'usuario-password-confirm', nombre: 'Confirmación de contraseña' },
    { id: 'usuario-rol', nombre: 'Rol' }
  ];
  
  let esValido = true;
  
  // Validar campos obligatorios
  campos.forEach(campo => {
    const elemento = document.getElementById(campo.id);
    if (!elemento.value.trim()) {
      elemento.classList.add('is-invalid');
      mostrarMensaje('warning', `El campo ${campo.nombre} es obligatorio`);
      esValido = false;
    } else {
      elemento.classList.remove('is-invalid');
      elemento.classList.add('is-valid');
    }
  });
  
  // Validar coincidencia de contraseñas
  const password = document.getElementById('usuario-password').value;
  const passwordConfirm = document.getElementById('usuario-password-confirm').value;
  
  if (password !== passwordConfirm) {
    document.getElementById('usuario-password-confirm').classList.add('is-invalid');
    mostrarMensaje('error', 'Las contraseñas no coinciden');
    esValido = false;
  }
  
  // Validar longitud de contraseña
  if (password.length < 6) {
    document.getElementById('usuario-password').classList.add('is-invalid');
    mostrarMensaje('error', 'La contraseña debe tener al menos 6 caracteres');
    esValido = false;
  }
  
  // Validar formato de email
  const email = document.getElementById('usuario-email').value;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    document.getElementById('usuario-email').classList.add('is-invalid');
    mostrarMensaje('error', 'El formato del email no es válido');
    esValido = false;
  }
  
  return esValido;
}

// Recopilar datos del formulario de usuario
function recopilarDatosUsuario() {
  return {
    nombre: document.getElementById('usuario-nombre').value.trim(),
    email: document.getElementById('usuario-email').value.trim(),
    password: document.getElementById('usuario-password').value,
    rol: document.getElementById('usuario-rol').value,
    activo: document.getElementById('usuario-activo').checked,
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

// Cargar y mostrar usuarios
async function cargarUsuarios() {
  console.log('Cargando usuarios...');
  
  try {
    mostrarCargando(true);
    
    const response = await fetch('/api/usuarios');
    
    if (response.ok) {
      usuariosData = await response.json();
      mostrarUsuariosEnTabla();
    } else {
      const error = await response.json();
      mostrarMensaje('error', error.error || 'Error al cargar usuarios');
    }
  } catch (error) {
    console.error('Error cargando usuarios:', error);
    mostrarMensaje('error', 'Error de conexión al cargar usuarios');
  } finally {
    mostrarCargando(false);
  }
}

// Mostrar usuarios en la tabla
function mostrarUsuariosEnTabla() {
  const tbody = document.getElementById('tabla-usuarios');
  if (!tbody) return;
  
  if (usuariosData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center text-muted">
          <i class="fas fa-users fa-2x mb-2"></i><br>
          No hay usuarios registrados
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = usuariosData.map(usuario => `
    <tr>
      <td>${usuario.ID}</td>
      <td>${usuario.NOMBRE}</td>
      <td>${usuario.EMAIL}</td>
      <td>
        <span class="badge bg-${obtenerColorRol(usuario.ROL)}">
          ${usuario.ROL}
        </span>
      </td>
      <td>
        <span class="badge bg-${usuario.ACTIVO ? 'success' : 'secondary'}">
          ${usuario.ACTIVO ? 'Activo' : 'Inactivo'}
        </span>
      </td>
      <td>${usuario.MATRICULA || '-'}</td>
      <td>${usuario.DNI || '-'}</td>
      <td>
        <div class="btn-group btn-group-sm" role="group">
          <button class="btn btn-outline-primary" onclick="gestionarZonasUsuario(${usuario.ID})"
                  title="Gestionar zonas">
            <i class="fas fa-map-signs"></i>
          </button>
          <button class="btn btn-outline-danger" onclick="eliminarUsuario(${usuario.ID})"
                  title="Eliminar usuario">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

// Obtener color según el rol
function obtenerColorRol(rol) {
  switch(rol) {
    case 'administrador': return 'danger';
    case 'operador': return 'warning';
    case 'cliente': return 'info';
    default: return 'secondary';
  }
}

// Gestionar zonas de un usuario
async function gestionarZonasUsuario(usuarioId) {
  usuarioSeleccionadoZonas = usuarioId;
  
  // Encontrar usuario
  const usuario = usuariosData.find(u => u.ID === usuarioId);
  if (!usuario) {
    mostrarMensaje('error', 'Usuario no encontrado');
    return;
  }
  
  // Configurar modal
  document.getElementById('zonas-usuario-titulo').textContent = 
    `Zonas asignadas a: ${usuario.NOMBRE}`;
  
  // Cargar zonas del usuario
  await cargarZonasUsuario(usuarioId);
  await cargarZonasDisponiblesParaUsuario(usuarioId);
  
  // Configurar event listeners para los botones
  configurarEventListenersZonasUsuario();
  
  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById('modal-zonas-usuario'));
  modal.show();
}

// Cargar zonas asignadas a un usuario
async function cargarZonasUsuario(usuarioId) {
  try {
    const response = await fetch(`/api/usuarios/${usuarioId}/zonas`);
    
    if (response.ok) {
      const data = await response.json();
      mostrarZonasUsuarioEnTabla(data.zonas || []);
      // Se llama a configurarEventListenersZonasUsuario() directamente desde mostrarZonasUsuarioEnTabla
    } else {
      console.error('Error cargando zonas del usuario');
      mostrarZonasUsuarioEnTabla([]);
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarZonasUsuarioEnTabla([]);
  }
}

// Mostrar zonas del usuario en tabla
function mostrarZonasUsuarioEnTabla(zonas) {
  const tbody = document.getElementById('tabla-zonas-usuario');
  const contador = document.getElementById('contador-zonas');
  
  if (!tbody || !contador) return;
  
  contador.textContent = `${zonas.length} zonas`;
  
  if (zonas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted">
          <i class="fas fa-map-signs fa-2x mb-2"></i><br>
          No hay zonas asignadas a este usuario
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = zonas.map(zona => `
    <tr>
      <td>${zona.ID}</td>
      <td>${zona.NOMBRE}</td>
      <td>${zona.DESCRIPCION || '-'}</td>
      <td>
        <span class="badge bg-${obtenerColorPermisos(zona.PERMISOS)}">
          ${formatearPermisos(zona.PERMISOS)}
        </span>
      </td>
      <td>
        <div class="btn-group btn-group-sm" role="group">
          <button class="btn btn-outline-warning btn-editar-permisos-zona" 
                  data-zona-id="${zona.ID}" 
                  data-usuario-id="${usuarioSeleccionadoZonas}"
                  data-permisos="${zona.PERMISOS}"
                  title="Editar permisos">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-outline-danger btn-eliminar-zona-usuario" 
                  data-zona-id="${zona.ID}"
                  title="Eliminar zona">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  // Llamar a configurar listeners DESPUÉS de que el innerHTML se haya actualizado
  configurarEventListenersZonasUsuario();
}

// Cargar zonas disponibles para asignar a usuario
async function cargarZonasDisponiblesParaUsuario(usuarioId) {
  try {
    const response = await fetch(`/api/usuarios/${usuarioId}/zonas-disponibles`);
    
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

// Asignar zona a usuario
async function asignarZonaUsuario(e) {
  e.preventDefault();
  
  const zonaId = document.getElementById('select-zonas-disponibles').value;
  const permisos = document.getElementById('select-permisos-zona').value;
  
  if (!zonaId || !permisos) {
    mostrarMensaje('warning', 'Por favor seleccione una zona y los permisos');
    return;
  }
  
  try {
    mostrarCargando(true);
    
    const response = await fetch(`/api/usuarios/${usuarioSeleccionadoZonas}/zonas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ zonaId, permisos })
    });
    
    const resultado = await response.json();
    
    if (response.ok) {
      mostrarMensaje('success', 'Zona asignada correctamente');
      
      // Recargar zonas del usuario
      await cargarZonasUsuario(usuarioSeleccionadoZonas);
      await cargarZonasDisponiblesParaUsuario(usuarioSeleccionadoZonas);
      
      // Limpiar formulario
      document.getElementById('form-asignar-zona').reset();
    } else {
      mostrarMensaje('error', resultado.error || 'Error al asignar zona');
    }
  } catch (error) {
    console.error('Error asignando zona:', error);
    mostrarMensaje('error', 'Error de conexión al asignar zona');
  } finally {
    mostrarCargando(false);
  }
}

// Eliminar zona de usuario
async function eliminarZonaUsuario(zonaId) {
  const confirmacion = await mostrarConfirmacion(
    'Eliminar Zona',
    '¿Está seguro de que desea eliminar esta zona del usuario?'
  );
  
  if (!confirmacion) return;
  
  try {
    mostrarCargando(true);
    
    const response = await fetch(`/api/usuarios/${usuarioSeleccionadoZonas}/zonas/${zonaId}`, {
      method: 'DELETE'
    });
    
    const resultado = await response.json();
    
    if (response.ok) {
      mostrarMensaje('success', 'Zona eliminada correctamente');
      
      // Recargar zonas del usuario
      await cargarZonasUsuario(usuarioSeleccionadoZonas);
      await cargarZonasDisponiblesParaUsuario(usuarioSeleccionadoZonas);
    } else {
      mostrarMensaje('error', resultado.error || 'Error al eliminar zona');
    }
  } catch (error) {
    console.error('Error eliminando zona:', error);
    mostrarMensaje('error', 'Error de conexión al eliminar zona');
  } finally {
    mostrarCargando(false);
  }
}

// Obtener color según permisos
function obtenerColorPermisos(permisos) {
  switch(permisos) {
    case 'bajar': return 'success';
    case 'subir,bajar': return 'warning';
    case 'completo': return 'danger';
    default: return 'secondary';
  }
}

// Formatear permisos para mostrar
function formatearPermisos(permisos) {
  switch(permisos) {
    case 'bajar': return 'Solo bajar';
    case 'subir,bajar': return 'Subir y bajar';
    case 'completo': return 'Control completo';
    default: return permisos;
  }
}

// Eliminar usuario
async function eliminarUsuario(usuarioId) {
  // Encontrar usuario
  const usuario = usuariosData.find(u => u.ID === usuarioId);
  if (!usuario) {
    mostrarMensaje('error', 'Usuario no encontrado');
    return;
  }
  
  // Confirmar eliminación
  const confirmacion = await mostrarConfirmacion(
    'Eliminar Usuario',
    `¿Está seguro de que desea eliminar al usuario "${usuario.NOMBRE}"?`
  );
  
  if (!confirmacion) return;
  
  try {
    mostrarCargando(true);
    
    const response = await fetch(`/api/usuarios/${usuarioId}`, {
      method: 'DELETE'
    });
    
    const resultado = await response.json();
    
    if (response.ok) {
      mostrarMensaje('success', 'Usuario eliminado correctamente');
      await cargarUsuarios();
    } else {
      mostrarMensaje('error', resultado.error || 'Error al eliminar usuario');
    }
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    mostrarMensaje('error', 'Error de conexión al eliminar usuario');
  } finally {
    mostrarCargando(false);
  }
}

// ================================================================================
// GESTIÓN DE ZONAS
// ================================================================================

// Inicializar eventos para zonas
function initZonasEvents() {
  console.log('Inicializando eventos de zonas...');
  
  // Botón para crear nueva zona
  const btnNuevaZona = document.getElementById('btn-nueva-zona');
  if (btnNuevaZona) {
    btnNuevaZona.addEventListener('click', mostrarModalNuevaZona);
  }
  
  // Botón para guardar zona
  const btnGuardarZona = document.getElementById('btn-guardar-zona');
  if (btnGuardarZona) {
    btnGuardarZona.addEventListener('click', guardarZona);
  }
  
  // Evento para asignar pilona a zona
  const formAsignarPilonaZona = document.getElementById('form-asignar-pilona-zona');
  if (formAsignarPilonaZona) {
    formAsignarPilonaZona.addEventListener('submit', asignarPilonaZona);
  }
}

// Mostrar modal para crear nueva zona
function mostrarModalNuevaZona() {
  console.log('Mostrando modal para nueva zona');
  
  // Limpiar formulario
  limpiarFormularioZona();
  
  // Configurar modal para nueva zona
  document.getElementById('modal-zona-titulo').textContent = 'Nueva Zona';
  document.getElementById('zona-id').value = '';
  
  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById('modal-zona'));
  modal.show();
}

// Limpiar formulario de zona
function limpiarFormularioZona() {
  const form = document.getElementById('form-zona');
  if (form) {
    form.reset();
    
    // Limpiar clases de validación
    const campos = form.querySelectorAll('.form-control, .form-select');
    campos.forEach(campo => {
      campo.classList.remove('is-valid', 'is-invalid');
    });
  }
}

// Guardar zona (crear o editar)
async function guardarZona() {
  console.log('Guardando zona...');
  
  try {
    // Validar formulario
    if (!validarFormularioZona()) {
      return;
    }
    
    // Recopilar datos del formulario
    const datos = {
      nombre: document.getElementById('zona-nombre').value.trim(),
      descripcion: document.getElementById('zona-descripcion').value.trim() || ''
    };
    
    // Determinar si es creación o edición
    const zonaId = document.getElementById('zona-id').value;
    const esEdicion = zonaId && zonaId !== '';
    
    // Realizar petición al servidor
    const url = esEdicion ? `/api/zonas/${zonaId}` : '/api/zonas';
    const method = esEdicion ? 'PUT' : 'POST';
    
    mostrarCargando(true);
    
    const response = await fetch(url, {
      method: method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(datos)
    });
    
    const resultado = await response.json();
    
    if (response.ok) {
      mostrarMensaje('success', esEdicion ? 'Zona actualizada correctamente' : 'Zona creada correctamente');
      
      // Cerrar modal
      const modal = bootstrap.Modal.getInstance(document.getElementById('modal-zona'));
      modal.hide();
      
      // Recargar lista de zonas
      await cargarZonas();
    } else {
      mostrarMensaje('error', resultado.error || 'Error al guardar zona');
    }
  } catch (error) {
    console.error('Error guardando zona:', error);
    mostrarMensaje('error', 'Error de conexión al guardar zona');
  } finally {
    mostrarCargando(false);
  }
}

// Validar formulario de zona
function validarFormularioZona() {
  const nombre = document.getElementById('zona-nombre');
  
  if (!nombre.value.trim()) {
    nombre.classList.add('is-invalid');
    mostrarMensaje('error', 'El nombre de la zona es obligatorio');
    return false;
  }
  
  nombre.classList.remove('is-invalid');
  nombre.classList.add('is-valid');
  return true;
}

// Cargar y mostrar zonas
async function cargarZonas() {
  console.log('Cargando zonas...');
  
  try {
    mostrarCargando(true);
    
    const response = await fetch('/api/zonas');
    
    if (response.ok) {
      zonasManagerData = await response.json();
      mostrarZonasEnTabla();
    } else {
      const error = await response.json();
      mostrarMensaje('error', error.error || 'Error al cargar zonas');
    }
  } catch (error) {
    console.error('Error cargando zonas:', error);
    mostrarMensaje('error', 'Error de conexión al cargar zonas');
  } finally {
    mostrarCargando(false);
  }
}

// Mostrar zonas en la tabla
function mostrarZonasEnTabla() {
  const tbody = document.getElementById('tabla-zonas');
  if (!tbody) return;
  
  if (zonasManagerData.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted">
          <i class="fas fa-map-signs fa-2x mb-2"></i><br>
          No hay zonas registradas
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = zonasManagerData.map(zona => `
    <tr>
      <td>${zona.ID}</td>
      <td>${zona.NOMBRE}</td>
      <td>${zona.DESCRIPCION || '-'}</td>
      <td>
        <span class="badge bg-info" id="pilonas-zona-${zona.ID}">
          <i class="fas fa-spinner fa-spin"></i>
        </span>
      </td>
      <td>
        <span class="badge bg-success" id="usuarios-zona-${zona.ID}">
          <i class="fas fa-spinner fa-spin"></i>
        </span>
      </td>
      <td>
        <div class="btn-group btn-group-sm" role="group">
          <button class="btn btn-outline-info" onclick="gestionarPilonasZona(${zona.ID})"
                  title="Gestionar pilonas">
            <i class="fas fa-traffic-light"></i>
          </button>
          <button class="btn btn-outline-primary" onclick="editarZona(${zona.ID})"
                  title="Editar zona">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-outline-danger" onclick="eliminarZona(${zona.ID})"
                  title="Eliminar zona">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
  
  // Cargar contadores de pilonas y usuarios para cada zona
  zonasManagerData.forEach(zona => {
    cargarContadoresZona(zona.ID);
  });
}

// Cargar contadores de pilonas y usuarios por zona
async function cargarContadoresZona(zonaId) {
  try {
    // Cargar pilonas de la zona
    const responsePilonas = await fetch(`/api/zonas/${zonaId}/pilonas`);
    if (responsePilonas.ok) {
      const pilonas = await responsePilonas.json();
      const badgePilonas = document.getElementById(`pilonas-zona-${zonaId}`);
      if (badgePilonas) {
        badgePilonas.innerHTML = `${pilonas.length} pilonas`;
      }
    }
    
    // Cargar usuarios de la zona
    const responseUsuarios = await fetch(`/api/zonas/${zonaId}/usuarios`);
    if (responseUsuarios.ok) {
      const usuarios = await responseUsuarios.json();
      const badgeUsuarios = document.getElementById(`usuarios-zona-${zonaId}`);
      if (badgeUsuarios) {
        badgeUsuarios.innerHTML = `${usuarios.length} usuarios`;
      }
    }
  } catch (error) {
    console.error('Error cargando contadores de zona:', error);
  }
}

// Gestionar pilonas de una zona
async function gestionarPilonasZona(zonaId) {
  zonaSeleccionadaManager = zonaId;
  
  // Encontrar zona
  const zona = zonasManagerData.find(z => z.ID === zonaId);
  if (!zona) {
    mostrarMensaje('error', 'Zona no encontrada');
    return;
  }
  
  // Configurar modal
  document.getElementById('pilonas-zona-titulo').textContent = 
    `Pilonas asignadas a: ${zona.NOMBRE}`;
  
  // Cargar pilonas de la zona
  await cargarPilonasZona(zonaId);
  await cargarPilonasDisponiblesParaZona(zonaId);
  
  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById('modal-pilonas-zona'));
  modal.show();
}

// Cargar pilonas asignadas a una zona
async function cargarPilonasZona(zonaId) {
  try {
    const response = await fetch(`/api/zonas/${zonaId}/pilonas`);
    
    if (response.ok) {
      const pilonas = await response.json();
      mostrarPilonasZonaEnTabla(pilonas || []);
    } else {
      console.error('Error cargando pilonas de la zona');
      mostrarPilonasZonaEnTabla([]);
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarPilonasZonaEnTabla([]);
  }
}

// Mostrar pilonas de la zona en tabla
function mostrarPilonasZonaEnTabla(pilonas) {
  const tbody = document.getElementById('tabla-pilonas-zona');
  const contador = document.getElementById('contador-pilonas-zona');
  
  if (!tbody || !contador) return;
  
  contador.textContent = `${pilonas.length} pilonas`;
  
  if (pilonas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted">
          <i class="fas fa-traffic-light fa-2x mb-2"></i><br>
          No hay pilonas asignadas a esta zona
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = pilonas.map(pilona => `
    <tr>
      <td>${pilona.ID}</td>
      <td>${pilona.NOMBRE}</td>
      <td>${pilona.DIRECCION_IP}</td>
      <td>
        <span class="badge bg-${obtenerColorEstado(pilona.ESTADO)}">
          ${pilona.ESTADO}
        </span>
      </td>
      <td>
        <button class="btn btn-outline-danger btn-sm" onclick="eliminarPilonaZona(${pilona.ID})"
                title="Eliminar pilona">
          <i class="fas fa-times"></i>
        </button>
      </td>
    </tr>
  `).join('');
}

// Cargar pilonas disponibles para asignar a zona
async function cargarPilonasDisponiblesParaZona(zonaId) {
  try {
    // Obtener todas las pilonas usando el endpoint correcto
    const response = await fetch('/api/pilonas');
    if (!response.ok) return;
    
    const todasPilonas = await response.json();
    
    // Obtener pilonas ya asignadas a la zona
    const responseAsignadas = await fetch(`/api/zonas/${zonaId}/pilonas`);
    const pilonasAsignadas = responseAsignadas.ok ? await responseAsignadas.json() : [];
    
    // Filtrar pilonas disponibles
    const idsAsignadas = pilonasAsignadas.map(p => p.ID);
    const pilonasDisponibles = todasPilonas.filter(p => !idsAsignadas.includes(p.ID));
    
    const select = document.getElementById('select-pilonas-disponibles');
    if (select) {
      select.innerHTML = '<option value="">Seleccionar pilona...</option>';
      pilonasDisponibles.forEach(pilona => {
        const nombre = pilona.NOMBRE || pilona.nombre;
        const ip = pilona.DIRECCION_IP || pilona.direccionIP;
        select.innerHTML += `<option value="${pilona.ID}">${nombre} (${ip})</option>`;
      });
    }
  } catch (error) {
    console.error('Error cargando pilonas disponibles:', error);
  }
}

// Asignar pilona a zona
async function asignarPilonaZona(e) {
  e.preventDefault();
  
  const pilonaId = document.getElementById('select-pilonas-disponibles').value;
  
  if (!pilonaId) {
    mostrarMensaje('warning', 'Por favor seleccione una pilona');
    return;
  }
  
  try {
    mostrarCargando(true);
    
    const response = await fetch(`/api/zonas/${zonaSeleccionadaManager}/pilonas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ pilonaId })
    });
    
    const resultado = await response.json();
    
    if (response.ok) {
      mostrarMensaje('success', 'Pilona asignada correctamente');
      
      // Recargar pilonas de la zona
      await cargarPilonasZona(zonaSeleccionadaManager);
      await cargarPilonasDisponiblesParaZona(zonaSeleccionadaManager);
      
      // Limpiar formulario
      document.getElementById('form-asignar-pilona-zona').reset();
      
      // Actualizar tabla principal de zonas
      await cargarZonas();
    } else {
      mostrarMensaje('error', resultado.error || 'Error al asignar pilona');
    }
  } catch (error) {
    console.error('Error asignando pilona:', error);
    mostrarMensaje('error', 'Error de conexión al asignar pilona');
  } finally {
    mostrarCargando(false);
  }
}

// Eliminar pilona de zona
async function eliminarPilonaZona(pilonaId) {
  const confirmacion = await mostrarConfirmacion(
    'Eliminar Pilona',
    '¿Está seguro de que desea eliminar esta pilona de la zona?'
  );
  
  if (!confirmacion) return;
  
  try {
    mostrarCargando(true);
    
    const response = await fetch(`/api/zonas/${zonaSeleccionadaManager}/pilonas/${pilonaId}`, {
      method: 'DELETE'
    });
    
    const resultado = await response.json();
    
    if (response.ok) {
      mostrarMensaje('success', 'Pilona eliminada correctamente');
      
      // Recargar pilonas de la zona
      await cargarPilonasZona(zonaSeleccionadaManager);
      await cargarPilonasDisponiblesParaZona(zonaSeleccionadaManager);
      
      // Actualizar tabla principal de zonas
      await cargarZonas();
    } else {
      mostrarMensaje('error', resultado.error || 'Error al eliminar pilona');
    }
  } catch (error) {
    console.error('Error eliminando pilona:', error);
    mostrarMensaje('error', 'Error de conexión al eliminar pilona');
  } finally {
    mostrarCargando(false);
  }
}

// Editar zona
async function editarZona(zonaId) {
  // Encontrar zona
  const zona = zonasManagerData.find(z => z.ID === zonaId);
  if (!zona) {
    mostrarMensaje('error', 'Zona no encontrada');
    return;
  }
  
  // Llenar formulario
  document.getElementById('zona-id').value = zona.ID;
  document.getElementById('zona-nombre').value = zona.NOMBRE;
  document.getElementById('zona-descripcion').value = zona.DESCRIPCION || '';
  
  // Configurar modal para edición
  document.getElementById('modal-zona-titulo').textContent = 'Editar Zona';
  
  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById('modal-zona'));
  modal.show();
}

// Eliminar zona
async function eliminarZona(zonaId) {
  // Encontrar zona
  const zona = zonasManagerData.find(z => z.ID === zonaId);
  if (!zona) {
    mostrarMensaje('error', 'Zona no encontrada');
    return;
  }
  
  // Confirmar eliminación
  const confirmacion = await mostrarConfirmacion(
    'Eliminar Zona',
    `¿Está seguro de que desea eliminar la zona "${zona.NOMBRE}"?`
  );
  
  if (!confirmacion) return;
  
  try {
    mostrarCargando(true);
    
    const response = await fetch(`/api/zonas/${zonaId}`, {
      method: 'DELETE'
    });
    
    const resultado = await response.json();
    
    if (response.ok) {
      mostrarMensaje('success', 'Zona eliminada correctamente');
      await cargarZonas();
    } else {
      mostrarMensaje('error', resultado.error || 'Error al eliminar zona');
    }
  } catch (error) {
    console.error('Error eliminando zona:', error);
    mostrarMensaje('error', 'Error de conexión al eliminar zona');
  } finally {
    mostrarCargando(false);
  }
}

// Obtener color según estado de pilona
function obtenerColorEstado(estado) {
  switch(estado) {
    case 'subida': return 'danger';
    case 'bajada': return 'success';
    case 'bloqueada_arriba': return 'warning';
    case 'bloqueada_abajo': return 'warning';
    case 'error': return 'secondary';
    default: return 'secondary';
  }
}

// ================================================================================
// FUNCIONES AUXILIARES Y UTILIDADES
// ================================================================================

// Función para mostrar confirmación
function mostrarConfirmacion(titulo, mensaje) {
  return new Promise((resolve) => {
    // Buscar el modal existente o crear uno nuevo
    let modalElement = document.getElementById('modal-confirmar');
    
    // Guardar referencia al modal activo actual
    const activeModal = document.querySelector('.modal.show');
    let activeModalInstance = null;
    if (activeModal) {
      activeModalInstance = bootstrap.Modal.getInstance(activeModal);
    }
    
    if (!modalElement) {
      // Si no existe el modal, crear uno temporal
      const modalHtml = `
        <div class="modal fade" id="modal-confirmar-temp" tabindex="-1" style="z-index: 9999 !important;">
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
                <button type="button" class="btn btn-danger" id="btn-confirmar-temp">Eliminar</button>
              </div>
            </div>
          </div>
        </div>
      `;
      
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      modalElement = document.getElementById('modal-confirmar-temp');
      
      // Asegurar que el backdrop también tenga un z-index alto
      const modal = new bootstrap.Modal(modalElement, {
        backdrop: 'static',
        keyboard: false
      });
      
      // Ajustar z-index del backdrop cuando se muestre
      modalElement.addEventListener('shown.bs.modal', () => {
        const backdrops = document.querySelectorAll('.modal-backdrop');
        if (backdrops.length > 1) {
          // Si hay múltiples backdrops, ajustar el último
          backdrops[backdrops.length - 1].style.zIndex = '9998';
        }
      });
      
      modal.show();
      
      // Configurar eventos
      const btnConfirmar = document.getElementById('btn-confirmar-temp');
      const btnCancelar = modalElement.querySelector('.btn-secondary');
      
      const handleClose = (result) => {
        modal.hide();
        
        // Esperar a que se complete la animación de cierre
        modalElement.addEventListener('hidden.bs.modal', () => {
          modalElement.remove();
          
          // Restaurar el foco al modal anterior si existe
          if (activeModalInstance) {
            // Forzar la reactivación del modal anterior
            activeModal.classList.add('show');
            activeModal.style.display = 'block';
            document.body.classList.add('modal-open');
            
            // Buscar y enfocar el primer elemento enfocable
            const focusableElement = activeModal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusableElement) {
              focusableElement.focus();
            }
          }
          
          resolve(result);
        }, { once: true });
      };
      
      btnConfirmar.addEventListener('click', () => handleClose(true));
      btnCancelar.addEventListener('click', () => handleClose(false));
      
    } else {
      // Si existe el modal, usarlo con z-index alto
      modalElement.style.zIndex = '9999';
      
      document.getElementById('modal-confirmar').querySelector('.modal-title').textContent = titulo;
      document.getElementById('mensaje-confirmar').textContent = mensaje;
      
      const modal = new bootstrap.Modal(modalElement, {
        backdrop: 'static',
        keyboard: false
      });
      
      // Ajustar z-index del backdrop cuando se muestre
      modalElement.addEventListener('shown.bs.modal', () => {
        const backdrops = document.querySelectorAll('.modal-backdrop');
        if (backdrops.length > 1) {
          backdrops[backdrops.length - 1].style.zIndex = '9998';
        }
      });
      
      // Eventos para los botones
      const btnConfirmar = document.getElementById('btn-confirmar-eliminar');
      const btnCancelar = modalElement.querySelector('.btn-secondary');
      
      const handleClose = (result) => {
        modal.hide();
        
        // Esperar a que se complete la animación de cierre
        modalElement.addEventListener('hidden.bs.modal', () => {
          // Restaurar el foco al modal anterior si existe
          if (activeModalInstance) {
            // Forzar la reactivación del modal anterior
            activeModal.classList.add('show');
            activeModal.style.display = 'block';
            document.body.classList.add('modal-open');
            
            // Buscar y enfocar el primer elemento enfocable
            const focusableElement = activeModal.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
            if (focusableElement) {
              focusableElement.focus();
            }
          }
          
          resolve(result);
        }, { once: true });
      };
      
      // Limpiar eventos anteriores
      btnConfirmar.replaceWith(btnConfirmar.cloneNode(true));
      const newBtnConfirmar = document.getElementById('btn-confirmar-eliminar');
      
      // Asignar nuevos eventos
      newBtnConfirmar.addEventListener('click', () => handleClose(true));
      btnCancelar.addEventListener('click', () => handleClose(false));
      
      modal.show();
    }
  });
}

// Función para mostrar mensajes
function mostrarMensaje(tipo, mensaje) {
  // Crear elemento de mensaje
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${tipo === 'error' ? 'danger' : tipo} alert-dismissible fade show`;
  alertDiv.innerHTML = `
    <i class="fas fa-${tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-circle' : 'info-circle'} me-2"></i>
    ${mensaje}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  // Insertar en la parte superior del contenido
  const container = document.querySelector('.container-fluid');
  if (container) {
    container.insertBefore(alertDiv, container.firstChild);
    
    // Auto-eliminar después de 5 segundos
    setTimeout(() => {
      if (alertDiv.parentNode) {
        alertDiv.remove();
      }
    }, 5000);
  }
}

// Función para mostrar/ocultar cargando
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

// ================================================================================
// INICIALIZACIÓN
// ================================================================================

// Función principal de inicialización
function initUsuariosZonasManager() {
  console.log('Inicializando gestor de usuarios y zonas...');
  
  // Inicializar eventos
  initUsuariosEvents();
  initZonasEvents();
  
  console.log('Gestor de usuarios y zonas inicializado correctamente');
}

// Funciones para exponer globalmente
window.cargarUsuarios = cargarUsuarios;
window.cargarZonas = cargarZonas;
window.gestionarZonasUsuario = gestionarZonasUsuario;
window.gestionarPilonasZona = gestionarPilonasZona;
window.eliminarUsuario = eliminarUsuario;
window.eliminarZona = eliminarZona;
window.editarZona = editarZona;
window.eliminarZonaUsuario = eliminarZonaUsuario;
window.eliminarPilonaZona = eliminarPilonaZona;
window.editarPermisosZonaUsuario = editarPermisosZonaUsuario;
window.initUsuariosZonasManager = initUsuariosZonasManager;

// Configurar event listeners para los botones de zonas de usuario
function configurarEventListenersZonasUsuario() {
  console.log('[configurarEventListenersZonasUsuario] Configurando listeners...');
  const tablaZonasUsuario = document.getElementById('tabla-zonas-usuario');
  if (!tablaZonasUsuario) {
    console.error('[configurarEventListenersZonasUsuario] No se encontró la tabla #tabla-zonas-usuario');
    return;
  }

  // Event listeners para editar permisos
  const btnsEditar = tablaZonasUsuario.querySelectorAll('.btn-editar-permisos-zona');
  console.log(`[configurarEventListenersZonasUsuario] Botones de editar permisos encontrados: ${btnsEditar.length}`);
  btnsEditar.forEach(btn => {
    // Remover listener anterior para evitar duplicados si se llama múltiples veces
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', async (e) => {
      console.log('[Event] Click en editar permisos zona:', newBtn.dataset.zonaId, 'para usuario:', newBtn.dataset.usuarioId);
      const zonaId = parseInt(newBtn.getAttribute('data-zona-id'));
      const usuarioId = parseInt(newBtn.getAttribute('data-usuario-id'));
      const permisosActuales = newBtn.getAttribute('data-permisos');
      await editarPermisosZonaUsuario(zonaId, usuarioId, permisosActuales);
    });
  });
  
  // Event listeners para eliminar zona
  const btnsEliminar = tablaZonasUsuario.querySelectorAll('.btn-eliminar-zona-usuario');
  console.log(`[configurarEventListenersZonasUsuario] Botones de eliminar zona encontrados: ${btnsEliminar.length}`);
  btnsEliminar.forEach(btn => {
    // Remover listener anterior para evitar duplicados
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    newBtn.addEventListener('click', async (e) => {
      console.log('[Event] Click en eliminar zona de usuario:', newBtn.dataset.zonaId);
      const zonaId = parseInt(newBtn.getAttribute('data-zona-id'));
      await eliminarZonaUsuario(zonaId);
    });
  });
}

// Función para editar permisos de zona para un usuario
async function editarPermisosZonaUsuario(zonaId, usuarioId, permisosActuales) {
  console.log('Editar permisos para zona:', zonaId, 'usuario:', usuarioId);
  
  // Crear un prompt simple usando window.confirm y select
  const modalHtml = `
    <div class="modal fade" id="modal-editar-permisos-temp" tabindex="-1">
      <div class="modal-dialog modal-sm">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Editar Permisos</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body">
            <label for="select-nuevos-permisos" class="form-label">Seleccione los permisos:</label>
            <select class="form-select" id="select-nuevos-permisos">
              <option value="bajar" ${permisosActuales === 'bajar' ? 'selected' : ''}>Solo bajar</option>
              <option value="subir,bajar" ${permisosActuales === 'subir,bajar' ? 'selected' : ''}>Subir y bajar</option>
              <option value="completo" ${permisosActuales === 'completo' ? 'selected' : ''}>Control completo</option>
            </select>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancelar</button>
            <button type="button" class="btn btn-primary" id="btn-guardar-permisos-temp">Guardar</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Agregar el modal al DOM temporalmente
  document.body.insertAdjacentHTML('beforeend', modalHtml);
  
  const modalElement = document.getElementById('modal-editar-permisos-temp');
  const modal = new bootstrap.Modal(modalElement);
  
  // Mostrar el modal
  modal.show();
  
  // Esperar la decisión del usuario
  return new Promise((resolve) => {
    const btnGuardar = document.getElementById('btn-guardar-permisos-temp');
    const selectPermisos = document.getElementById('select-nuevos-permisos');
    
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
          body: JSON.stringify({ permisos: nuevosPermisos })
        });
        
        const resultado = await response.json();
        
        if (response.ok) {
          mostrarMensaje('success', 'Permisos actualizados correctamente');
          // Recargar zonas del usuario
          await cargarZonasUsuario(usuarioId);
          // Reconfigurar event listeners
          configurarEventListenersZonasUsuario();
        } else {
          mostrarMensaje('error', resultado.error || 'Error al actualizar permisos');
        }
      } catch (error) {
        console.error('Error actualizando permisos:', error);
        mostrarMensaje('error', 'Error de conexión al actualizar permisos');
      } finally {
        mostrarCargando(false);
        resolve();
      }
    });
    
    // Limpiar el modal cuando se cierre
    modalElement.addEventListener('hidden.bs.modal', () => {
      modalElement.remove();
      resolve();
    });
  });
}