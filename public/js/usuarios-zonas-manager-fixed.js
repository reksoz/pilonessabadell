// usuarios-zonas-manager.js - Gestión completa de usuarios y zonas (VERSION CORREGIDA)
// VERSION CORREGIDA - Sin redeclaraciones

// Verificar si ya está cargado para evitar redeclaraciones
if (typeof window.USUARIOS_ZONAS_MANAGER_LOADED === 'undefined') {
  window.USUARIOS_ZONAS_MANAGER_LOADED = true;

  console.log('Cargando usuarios-zonas-manager (versión fija)...');

  // Variables globales para el manejo de usuarios y zonas
  window.usuariosDataManager = [];
  window.zonasManagerData = [];
  window.usuarioSeleccionadoZonas = null;
  window.zonaSeleccionadaManager = null;

  // Función principal de inicialización
  function initUsuariosZonasManager() {
    console.log('Inicializando gestor de usuarios y zonas...');
    
    // Inicializar eventos
    initUsuariosEvents();
    initZonasEvents();
    
    console.log('Gestor de usuarios y zonas inicializado correctamente');
  }

  // ================================================================================
  // GESTIÓN DE USUARIOS
  // ================================================================================

  // Inicializar eventos para usuarios
  function initUsuariosEvents() {
    console.log('Inicializando eventos de usuarios...');
    
    // Botón para crear nuevo usuario
    var btnNuevoUsuario = document.getElementById('btn-nuevo-usuario');
    if (btnNuevoUsuario && !btnNuevoUsuario.hasAttribute('data-listener-added')) {
      btnNuevoUsuario.addEventListener('click', mostrarModalNuevoUsuario);
      btnNuevoUsuario.setAttribute('data-listener-added', 'true');
    }
    
    // Botón para guardar usuario
    var btnGuardarUsuario = document.getElementById('btn-guardar-usuario');
    if (btnGuardarUsuario && !btnGuardarUsuario.hasAttribute('data-listener-added')) {
      btnGuardarUsuario.addEventListener('click', guardarUsuario);
      btnGuardarUsuario.setAttribute('data-listener-added', 'true');
    }
    
    // Validación de contraseñas en tiempo real
    var passwordConfirm = document.getElementById('usuario-password-confirm');
    if (passwordConfirm && !passwordConfirm.hasAttribute('data-listener-added')) {
      passwordConfirm.addEventListener('input', validarPasswordsUsuario);
      passwordConfirm.setAttribute('data-listener-added', 'true');
    }
    
    // Evento para asignar zona
    var formAsignarZona = document.getElementById('form-asignar-zona');
    if (formAsignarZona && !formAsignarZona.hasAttribute('data-listener-added')) {
      formAsignarZona.addEventListener('submit', asignarZonaUsuario);
      formAsignarZona.setAttribute('data-listener-added', 'true');
    }
  }

  // Mostrar modal para crear nuevo usuario
  function mostrarModalNuevoUsuario() {
    console.log('Mostrando modal para nuevo usuario');
    
    // Limpiar formulario
    limpiarFormularioUsuario();
    
    // Configurar modal para nuevo usuario
    var modalTitulo = document.getElementById('modal-usuario-titulo');
    var usuarioIdField = document.getElementById('usuario-id');
    var fechaInicioField = document.getElementById('usuario-fecha-inicio');
    
    if (modalTitulo) modalTitulo.textContent = 'Nuevo Usuario';
    if (usuarioIdField) usuarioIdField.value = '';
    
    // Establecer fecha de inicio por defecto
    if (fechaInicioField) {
      var fechaActual = new Date().toISOString().split('T')[0];
      fechaInicioField.value = fechaActual;
    }
    
    // Mostrar modal
    var modalElement = document.getElementById('modal-usuario');
    if (modalElement && typeof bootstrap !== 'undefined') {
      var modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  // Validar que las contraseñas coincidan
  function validarPasswordsUsuario() {
    var passwordField = document.getElementById('usuario-password');
    var passwordConfirmField = document.getElementById('usuario-password-confirm');
    var btnGuardar = document.getElementById('btn-guardar-usuario');
    
    if (!passwordField || !passwordConfirmField) return;
    
    var password = passwordField.value;
    var passwordConfirm = passwordConfirmField.value;
    
    if (password && passwordConfirm) {
      if (password === passwordConfirm) {
        passwordConfirmField.classList.remove('is-invalid');
        passwordConfirmField.classList.add('is-valid');
        if (btnGuardar) btnGuardar.disabled = false;
      } else {
        passwordConfirmField.classList.remove('is-valid');
        passwordConfirmField.classList.add('is-invalid');
        if (btnGuardar) btnGuardar.disabled = true;
      }
    }
  }

  // Limpiar formulario de usuario
  function limpiarFormularioUsuario() {
    var form = document.getElementById('form-usuario');
    if (form) {
      form.reset();
      
      // Restablecer el estado activo por defecto
      var usuarioActivoField = document.getElementById('usuario-activo');
      if (usuarioActivoField) usuarioActivoField.checked = true;
      
      // Limpiar clases de validación
      var campos = form.querySelectorAll('.form-control, .form-select');
      campos.forEach(function(campo) {
        campo.classList.remove('is-valid', 'is-invalid');
      });
      
      // Habilitar botón guardar
      var btnGuardar = document.getElementById('btn-guardar-usuario');
      if (btnGuardar) btnGuardar.disabled = false;
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
      var datos = recopilarDatosUsuario();
      
      // Determinar si es creación o edición
      var usuarioIdField = document.getElementById('usuario-id');
      var usuarioId = usuarioIdField ? usuarioIdField.value : '';
      var esEdicion = usuarioId && usuarioId !== '';
      
      // Realizar petición al servidor
      var url = esEdicion ? '/api/usuarios/' + usuarioId : '/api/usuarios';
      var method = esEdicion ? 'PUT' : 'POST';
      
      mostrarCargando(true);
      
      var response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(datos)
      });
      
      if (response.ok) {
        var resultado = await response.json();
        mostrarMensaje('success', esEdicion ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente');
        
        // Cerrar modal
        var modalElement = document.getElementById('modal-usuario');
        if (modalElement && typeof bootstrap !== 'undefined') {
          var modal = bootstrap.Modal.getInstance(modalElement);
          if (modal) modal.hide();
        }
        
        // Recargar lista de usuarios
        await cargarUsuarios();
      } else {
        var resultado = await response.json();
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
    var campos = [
      { id: 'usuario-nombre', nombre: 'Nombre' },
      { id: 'usuario-email', nombre: 'Email' },
      { id: 'usuario-password', nombre: 'Contraseña' },
      { id: 'usuario-password-confirm', nombre: 'Confirmación de contraseña' },
      { id: 'usuario-rol', nombre: 'Rol' }
    ];
    
    var esValido = true;
    
    // Validar campos obligatorios
    campos.forEach(function(campo) {
      var elemento = document.getElementById(campo.id);
      if (!elemento || !elemento.value.trim()) {
        if (elemento) elemento.classList.add('is-invalid');
        mostrarMensaje('warning', 'El campo ' + campo.nombre + ' es obligatorio');
        esValido = false;
      } else {
        elemento.classList.remove('is-invalid');
        elemento.classList.add('is-valid');
      }
    });
    
    // Validar coincidencia de contraseñas
    var passwordField = document.getElementById('usuario-password');
    var passwordConfirmField = document.getElementById('usuario-password-confirm');
    
    if (passwordField && passwordConfirmField) {
      var password = passwordField.value;
      var passwordConfirm = passwordConfirmField.value;
      
      if (password !== passwordConfirm) {
        passwordConfirmField.classList.add('is-invalid');
        mostrarMensaje('error', 'Las contraseñas no coinciden');
        esValido = false;
      }
      
      // Validar longitud de contraseña
      if (password.length < 6) {
        passwordField.classList.add('is-invalid');
        mostrarMensaje('error', 'La contraseña debe tener al menos 6 caracteres');
        esValido = false;
      }
    }
    
    // Validar formato de email
    var emailField = document.getElementById('usuario-email');
    if (emailField) {
      var email = emailField.value;
      var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        emailField.classList.add('is-invalid');
        mostrarMensaje('error', 'El formato del email no es válido');
        esValido = false;
      }
    }
    
    return esValido;
  }

  // Recopilar datos del formulario de usuario
  function recopilarDatosUsuario() {
    function getFieldValue(id) {
      var field = document.getElementById(id);
      return field ? field.value.trim() : '';
    }
    
    function getCheckboxValue(id) {
      var field = document.getElementById(id);
      return field ? field.checked : false;
    }
    
    return {
      nombre: getFieldValue('usuario-nombre'),
      email: getFieldValue('usuario-email'),
      password: getFieldValue('usuario-password'),
      rol: getFieldValue('usuario-rol'),
      activo: getCheckboxValue('usuario-activo'),
      dni: getFieldValue('usuario-dni') || null,
      matricula: getFieldValue('usuario-matricula') || null,
      telefono: getFieldValue('usuario-telefono') || null,
      direccion: getFieldValue('usuario-direccion') || null,
      tipoAcceso: getFieldValue('usuario-tipo-acceso') || null,
      fechaInicio: getFieldValue('usuario-fecha-inicio') || null,
      fechaFinal: getFieldValue('usuario-fecha-final') || null,
      fechaRenovacion: getFieldValue('usuario-fecha-renovacion') || null,
      comentarios: getFieldValue('usuario-comentarios') || null
    };
  }

  // Cargar y mostrar usuarios
  async function cargarUsuarios() {
    console.log('Cargando usuarios...');
    
    try {
      mostrarCargando(true);
      
      var response = await fetch('/api/usuarios', {
        credentials: 'include'
      });
      
      if (response.ok) {
        window.usuariosDataManager = await response.json();
        mostrarUsuariosEnTabla();
      } else {
        var error = await response.json();
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
    var tbody = document.getElementById('tabla-usuarios');
    if (!tbody) return;
    
    if (window.usuariosDataManager.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">' +
        '<i class="fas fa-users fa-2x mb-2"></i><br>No hay usuarios registrados</td></tr>';
      return;
    }
    
    tbody.innerHTML = window.usuariosDataManager.map(function(usuario) {
      return '<tr>' +
        '<td>' + usuario.ID + '</td>' +
        '<td>' + usuario.NOMBRE + '</td>' +
        '<td>' + usuario.EMAIL + '</td>' +
        '<td><span class="badge bg-' + obtenerColorRol(usuario.ROL) + '">' + usuario.ROL + '</span></td>' +
        '<td><span class="badge bg-' + (usuario.ACTIVO ? 'success' : 'secondary') + '">' +
        (usuario.ACTIVO ? 'Activo' : 'Inactivo') + '</span></td>' +
        '<td>' + (usuario.MATRICULA || '-') + '</td>' +
        '<td>' + (usuario.DNI || '-') + '</td>' +
        '<td>' +
        '<div class="btn-group btn-group-sm" role="group">' +
        '<button class="btn btn-outline-primary" onclick="gestionarZonasUsuario(' + usuario.ID + ')" title="Gestionar zonas">' +
        '<i class="fas fa-map-signs"></i></button>' +
        '<button class="btn btn-outline-danger" onclick="eliminarUsuario(' + usuario.ID + ')" title="Eliminar usuario">' +
        '<i class="fas fa-trash"></i></button>' +
        '</div>' +
        '</td>' +
        '</tr>';
    }).join('');
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
    window.usuarioSeleccionadoZonas = usuarioId;
    
    // Encontrar usuario
    var usuario = window.usuariosDataManager.find(function(u) { return u.ID === usuarioId; });
    if (!usuario) {
      mostrarMensaje('error', 'Usuario no encontrado');
      return;
    }
    
    // Configurar modal
    var tituloElement = document.getElementById('zonas-usuario-titulo');
    if (tituloElement) {
      tituloElement.textContent = 'Zonas asignadas a: ' + usuario.NOMBRE;
    }
    
    // Cargar zonas del usuario
    await cargarZonasUsuario(usuarioId);
    await cargarZonasDisponiblesParaUsuario(usuarioId);
    
    // Mostrar modal
    var modalElement = document.getElementById('modal-zonas-usuario');
    if (modalElement && typeof bootstrap !== 'undefined') {
      var modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  // Cargar zonas asignadas a un usuario
  async function cargarZonasUsuario(usuarioId) {
    try {
      var response = await fetch('/api/usuarios/' + usuarioId + '/zonas', {
        credentials: 'include'
      });
      
      if (response.ok) {
        var data = await response.json();
        mostrarZonasUsuarioEnTabla(data.zonas || []);
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
    var tbody = document.getElementById('tabla-zonas-usuario');
    var contador = document.getElementById('contador-zonas');
    
    if (!tbody || !contador) return;
    
    contador.textContent = zonas.length + ' zonas';
    
    if (zonas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">' +
        '<i class="fas fa-map-signs fa-2x mb-2"></i><br>No hay zonas asignadas a este usuario</td></tr>';
      return;
    }
    
    tbody.innerHTML = zonas.map(function(zona) {
      return '<tr>' +
        '<td>' + zona.ID + '</td>' +
        '<td>' + zona.NOMBRE + '</td>' +
        '<td>' + (zona.DESCRIPCION || '-') + '</td>' +
        '<td><span class="badge bg-' + obtenerColorPermisos(zona.PERMISOS) + '">' +
        formatearPermisos(zona.PERMISOS) + '</span></td>' +
        '<td>' +
        '<div class="btn-group btn-group-sm" role="group">' +
        '<button class="btn btn-outline-warning" onclick="editarPermisosZonaUsuario(' + zona.ID + ')" title="Editar permisos">' +
        '<i class="fas fa-edit"></i></button>' +
        '<button class="btn btn-outline-danger" onclick="eliminarZonaUsuario(' + zona.ID + ')" title="Eliminar zona">' +
        '<i class="fas fa-times"></i></button>' +
        '</div>' +
        '</td>' +
        '</tr>';
    }).join('');
  }

  // Cargar zonas disponibles para asignar a usuario
  async function cargarZonasDisponiblesParaUsuario(usuarioId) {
    try {
      var response = await fetch('/api/usuarios/' + usuarioId + '/zonas-disponibles', {
        credentials: 'include'
      });
      
      if (response.ok) {
        var zonas = await response.json();
        var select = document.getElementById('select-zonas-disponibles');
        
        if (select) {
          select.innerHTML = '<option value="">Seleccionar zona...</option>';
          zonas.forEach(function(zona) {
            select.innerHTML += '<option value="' + zona.ID + '">' + zona.NOMBRE + '</option>';
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
    
    var zonaSelect = document.getElementById('select-zonas-disponibles');
    var permisosSelect = document.getElementById('select-permisos-zona');
    
    var zonaId = zonaSelect ? zonaSelect.value : '';
    var permisos = permisosSelect ? permisosSelect.value : '';
    
    if (!zonaId || !permisos) {
      mostrarMensaje('warning', 'Por favor seleccione una zona y los permisos');
      return;
    }
    
    try {
      mostrarCargando(true);
      
      var response = await fetch('/api/usuarios/' + window.usuarioSeleccionadoZonas + '/zonas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ zonaId: zonaId, permisos: permisos })
      });
      
      if (response.ok) {
        var resultado = await response.json();
        mostrarMensaje('success', 'Zona asignada correctamente');
        
        // Recargar zonas del usuario
        await cargarZonasUsuario(window.usuarioSeleccionadoZonas);
        await cargarZonasDisponiblesParaUsuario(window.usuarioSeleccionadoZonas);
        
        // Limpiar formulario
        var form = document.getElementById('form-asignar-zona');
        if (form) form.reset();
      } else {
        var resultado = await response.json();
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
    var confirmacion = confirm('¿Está seguro de que desea eliminar esta zona del usuario?');
    
    if (!confirmacion) return;
    
    try {
      mostrarCargando(true);
      
      var response = await fetch('/api/usuarios/' + window.usuarioSeleccionadoZonas + '/zonas/' + zonaId, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        var resultado = await response.json();
        mostrarMensaje('success', 'Zona eliminada correctamente');
        
        // Recargar zonas del usuario
        await cargarZonasUsuario(window.usuarioSeleccionadoZonas);
        await cargarZonasDisponiblesParaUsuario(window.usuarioSeleccionadoZonas);
      } else {
        var resultado = await response.json();
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
    var usuario = window.usuariosDataManager.find(function(u) { return u.ID === usuarioId; });
    if (!usuario) {
      mostrarMensaje('error', 'Usuario no encontrado');
      return;
    }
    
    // Confirmar eliminación
    var confirmacion = confirm('¿Está seguro de que desea eliminar al usuario "' + usuario.NOMBRE + '"?');
    
    if (!confirmacion) return;
    
    try {
      mostrarCargando(true);
      
      var response = await fetch('/api/usuarios/' + usuarioId, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        var resultado = await response.json();
        mostrarMensaje('success', 'Usuario eliminado correctamente');
        await cargarUsuarios();
      } else {
        var resultado = await response.json();
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
    var btnNuevaZona = document.getElementById('btn-nueva-zona');
    if (btnNuevaZona && !btnNuevaZona.hasAttribute('data-listener-added')) {
      btnNuevaZona.addEventListener('click', mostrarModalNuevaZona);
      btnNuevaZona.setAttribute('data-listener-added', 'true');
    }
    
    // Botón para guardar zona
    var btnGuardarZona = document.getElementById('btn-guardar-zona');
    if (btnGuardarZona && !btnGuardarZona.hasAttribute('data-listener-added')) {
      btnGuardarZona.addEventListener('click', guardarZona);
      btnGuardarZona.setAttribute('data-listener-added', 'true');
    }
    
    // Evento para asignar pilona a zona
    var formAsignarPilonaZona = document.getElementById('form-asignar-pilona-zona');
    if (formAsignarPilonaZona && !formAsignarPilonaZona.hasAttribute('data-listener-added')) {
      formAsignarPilonaZona.addEventListener('submit', asignarPilonaZona);
      formAsignarPilonaZona.setAttribute('data-listener-added', 'true');
    }
  }

  // Mostrar modal para crear nueva zona
  function mostrarModalNuevaZona() {
    console.log('Mostrando modal para nueva zona');
    
    // Limpiar formulario
    limpiarFormularioZona();
    
    // Configurar modal para nueva zona
    var modalTitulo = document.getElementById('modal-zona-titulo');
    var zonaIdField = document.getElementById('zona-id');
    
    if (modalTitulo) modalTitulo.textContent = 'Nueva Zona';
    if (zonaIdField) zonaIdField.value = '';
    
    // Mostrar modal
    var modalElement = document.getElementById('modal-zona');
    if (modalElement && typeof bootstrap !== 'undefined') {
      var modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  // Limpiar formulario de zona
  function limpiarFormularioZona() {
    var form = document.getElementById('form-zona');
    if (form) {
      form.reset();
      
      // Limpiar clases de validación
      var campos = form.querySelectorAll('.form-control, .form-select');
      campos.forEach(function(campo) {
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
      var zonaNombreField = document.getElementById('zona-nombre');
      var zonaDescripcionField = document.getElementById('zona-descripcion');
      
      var datos = {
        nombre: zonaNombreField ? zonaNombreField.value.trim() : '',
        descripcion: zonaDescripcionField ? zonaDescripcionField.value.trim() : ''
      };
      
      // Determinar si es creación o edición
      var zonaIdField = document.getElementById('zona-id');
      var zonaId = zonaIdField ? zonaIdField.value : '';
      var esEdicion = zonaId && zonaId !== '';
      
      // Realizar petición al servidor
      var url = esEdicion ? '/api/zonas/' + zonaId : '/api/zonas';
      var method = esEdicion ? 'PUT' : 'POST';
      
      mostrarCargando(true);
      
      var response = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(datos)
      });
      
      if (response.ok) {
        var resultado = await response.json();
        mostrarMensaje('success', esEdicion ? 'Zona actualizada correctamente' : 'Zona creada correctamente');
        
        // Cerrar modal
        var modalElement = document.getElementById('modal-zona');
        if (modalElement && typeof bootstrap !== 'undefined') {
          var modal = bootstrap.Modal.getInstance(modalElement);
          if (modal) modal.hide();
        }
        
        // Recargar lista de zonas
        await cargarZonas();
      } else {
        var resultado = await response.json();
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
    var nombreField = document.getElementById('zona-nombre');
    
    if (!nombreField || !nombreField.value.trim()) {
      if (nombreField) nombreField.classList.add('is-invalid');
      mostrarMensaje('error', 'El nombre de la zona es obligatorio');
      return false;
    }
    
    nombreField.classList.remove('is-invalid');
    nombreField.classList.add('is-valid');
    return true;
  }

  // Cargar y mostrar zonas
  async function cargarZonas() {
    console.log('Cargando zonas...');
    
    try {
      mostrarCargando(true);
      
      var response = await fetch('/api/zonas', {
        credentials: 'include'
      });
      
      if (response.ok) {
        window.zonasManagerData = await response.json();
        mostrarZonasEnTabla();
      } else {
        var error = await response.json();
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
    var tbody = document.getElementById('tabla-zonas');
    if (!tbody) return;
    
    if (window.zonasManagerData.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">' +
        '<i class="fas fa-map-signs fa-2x mb-2"></i><br>No hay zonas registradas</td></tr>';
      return;
    }
    
    tbody.innerHTML = window.zonasManagerData.map(function(zona) {
      return '<tr>' +
        '<td>' + zona.ID + '</td>' +
        '<td>' + zona.NOMBRE + '</td>' +
        '<td>' + (zona.DESCRIPCION || '-') + '</td>' +
        '<td>' +
        '<span class="badge bg-info" id="pilonas-zona-' + zona.ID + '">' +
        '<i class="fas fa-spinner fa-spin"></i>' +
        '</span>' +
        '</td>' +
        '<td>' +
        '<span class="badge bg-success" id="usuarios-zona-' + zona.ID + '">' +
        '<i class="fas fa-spinner fa-spin"></i>' +
        '</span>' +
        '</td>' +
        '<td>' +
        '<div class="btn-group btn-group-sm" role="group">' +
        '<button class="btn btn-outline-info" onclick="gestionarPilonasZona(' + zona.ID + ')" title="Gestionar pilonas">' +
        '<i class="fas fa-traffic-light"></i></button>' +
        '<button class="btn btn-outline-primary" onclick="editarZona(' + zona.ID + ')" title="Editar zona">' +
        '<i class="fas fa-edit"></i></button>' +
        '<button class="btn btn-outline-danger" onclick="eliminarZona(' + zona.ID + ')" title="Eliminar zona">' +
        '<i class="fas fa-trash"></i></button>' +
        '</div>' +
        '</td>' +
        '</tr>';
    }).join('');
    
    // Cargar contadores de pilonas y usuarios para cada zona
    window.zonasManagerData.forEach(function(zona) {
      cargarContadoresZona(zona.ID);
    });
  }

  // Cargar contadores de pilonas y usuarios por zona
  async function cargarContadoresZona(zonaId) {
    try {
      // Cargar pilonas de la zona
      var responsePilonas = await fetch('/api/zonas/' + zonaId + '/pilonas', {
        credentials: 'include'
      });
      if (responsePilonas.ok) {
        var pilonas = await responsePilonas.json();
        var badgePilonas = document.getElementById('pilonas-zona-' + zonaId);
        if (badgePilonas) {
          badgePilonas.innerHTML = pilonas.length + ' pilonas';
        }
      }
      
      // Cargar usuarios de la zona
      var responseUsuarios = await fetch('/api/zonas/' + zonaId + '/usuarios', {
        credentials: 'include'
      });
      if (responseUsuarios.ok) {
        var usuarios = await responseUsuarios.json();
        var badgeUsuarios = document.getElementById('usuarios-zona-' + zonaId);
        if (badgeUsuarios) {
          badgeUsuarios.innerHTML = usuarios.length + ' usuarios';
        }
      }
    } catch (error) {
      console.error('Error cargando contadores de zona:', error);
    }
  }

  // Gestionar pilonas de una zona
  async function gestionarPilonasZona(zonaId) {
    window.zonaSeleccionadaManager = zonaId;
    
    // Encontrar zona
    var zona = window.zonasManagerData.find(function(z) { return z.ID === zonaId; });
    if (!zona) {
      mostrarMensaje('error', 'Zona no encontrada');
      return;
    }
    
    // Configurar modal
    var tituloElement = document.getElementById('pilonas-zona-titulo');
    if (tituloElement) {
      tituloElement.textContent = 'Pilonas asignadas a: ' + zona.NOMBRE;
    }
    
    // Cargar pilonas de la zona
    await cargarPilonasZona(zonaId);
    await cargarPilonasDisponiblesParaZona(zonaId);
    
    // Mostrar modal
    var modalElement = document.getElementById('modal-pilonas-zona');
    if (modalElement && typeof bootstrap !== 'undefined') {
      var modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  // Cargar pilonas asignadas a una zona
  async function cargarPilonasZona(zonaId) {
    try {
      var response = await fetch('/api/zonas/' + zonaId + '/pilonas', {
        credentials: 'include'
      });
      
      if (response.ok) {
        var pilonas = await response.json();
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
    var tbody = document.getElementById('tabla-pilonas-zona');
    var contador = document.getElementById('contador-pilonas-zona');
    
    if (!tbody || !contador) return;
    
    contador.textContent = pilonas.length + ' pilonas';
    
    if (pilonas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">' +
        '<i class="fas fa-traffic-light fa-2x mb-2"></i><br>No hay pilonas asignadas a esta zona</td></tr>';
      return;
    }
    
    tbody.innerHTML = pilonas.map(function(pilona) {
      return '<tr>' +
        '<td>' + pilona.ID + '</td>' +
        '<td>' + pilona.NOMBRE + '</td>' +
        '<td>' + pilona.DIRECCION_IP + '</td>' +
        '<td>' +
        '<span class="badge bg-' + obtenerColorEstado(pilona.ESTADO) + '">' +
        pilona.ESTADO +
        '</span>' +
        '</td>' +
        '<td>' +
        '<button class="btn btn-outline-danger btn-sm" onclick="eliminarPilonaZona(' + pilona.ID + ')" title="Eliminar pilona">' +
        '<i class="fas fa-times"></i>' +
        '</button>' +
        '</td>' +
        '</tr>';
    }).join('');
  }

  // Cargar pilonas disponibles para asignar a zona
  async function cargarPilonasDisponiblesParaZona(zonaId) {
    try {
      // Obtener todas las pilonas
      var response = await fetch('/api/pilonas', {
        credentials: 'include'
      });
      if (!response.ok) return;
      
      var todasPilonas = await response.json();
      
      // Obtener pilonas ya asignadas a la zona
      var responseAsignadas = await fetch('/api/zonas/' + zonaId + '/pilonas', {
        credentials: 'include'
      });
      var pilonasAsignadas = responseAsignadas.ok ? await responseAsignadas.json() : [];
      
      // Filtrar pilonas disponibles
      var idsAsignadas = pilonasAsignadas.map(function(p) { return p.ID; });
      var pilonasDisponibles = todasPilonas.filter(function(p) { return !idsAsignadas.includes(p.ID); });
      
      var select = document.getElementById('select-pilonas-disponibles');
      if (select) {
        select.innerHTML = '<option value="">Seleccionar pilona...</option>';
        pilonasDisponibles.forEach(function(pilona) {
          var nombre = pilona.NOMBRE || pilona.nombre;
          var ip = pilona.DIRECCION_IP || pilona.direccionIP;
          select.innerHTML += '<option value="' + pilona.ID + '">' + nombre + ' (' + ip + ')</option>';
        });
      }
    } catch (error) {
      console.error('Error cargando pilonas disponibles:', error);
    }
  }

  // Asignar pilona a zona
  async function asignarPilonaZona(e) {
    e.preventDefault();
    
    var select = document.getElementById('select-pilonas-disponibles');
    var pilonaId = select ? select.value : '';
    
    if (!pilonaId) {
      mostrarMensaje('warning', 'Por favor seleccione una pilona');
      return;
    }
    
    try {
      mostrarCargando(true);
      
      var response = await fetch('/api/zonas/' + window.zonaSeleccionadaManager + '/pilonas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ pilonaId: pilonaId })
      });
      
      if (response.ok) {
        var resultado = await response.json();
        mostrarMensaje('success', 'Pilona asignada correctamente');
        
        // Recargar pilonas de la zona
        await cargarPilonasZona(window.zonaSeleccionadaManager);
        await cargarPilonasDisponiblesParaZona(window.zonaSeleccionadaManager);
        
        // Limpiar formulario
        var form = document.getElementById('form-asignar-pilona-zona');
        if (form) form.reset();
        
        // Actualizar tabla principal de zonas
        await cargarZonas();
      } else {
        var resultado = await response.json();
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
    var confirmacion = confirm('¿Está seguro de que desea eliminar esta pilona de la zona?');
    
    if (!confirmacion) return;
    
    try {
      mostrarCargando(true);
      
      var response = await fetch('/api/zonas/' + window.zonaSeleccionadaManager + '/pilonas/' + pilonaId, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        var resultado = await response.json();
        mostrarMensaje('success', 'Pilona eliminada correctamente');
        
        // Recargar pilonas de la zona
        await cargarPilonasZona(window.zonaSeleccionadaManager);
        await cargarPilonasDisponiblesParaZona(window.zonaSeleccionadaManager);
        
        // Actualizar tabla principal de zonas
        await cargarZonas();
      } else {
        var resultado = await response.json();
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
    var zona = window.zonasManagerData.find(function(z) { return z.ID === zonaId; });
    if (!zona) {
      mostrarMensaje('error', 'Zona no encontrada');
      return;
    }
    
    // Llenar formulario
    var zonaIdField = document.getElementById('zona-id');
    var zonaNombreField = document.getElementById('zona-nombre');
    var zonaDescripcionField = document.getElementById('zona-descripcion');
    var modalTitulo = document.getElementById('modal-zona-titulo');
    
    if (zonaIdField) zonaIdField.value = zona.ID;
    if (zonaNombreField) zonaNombreField.value = zona.NOMBRE;
    if (zonaDescripcionField) zonaDescripcionField.value = zona.DESCRIPCION || '';
    if (modalTitulo) modalTitulo.textContent = 'Editar Zona';
    
    // Mostrar modal
    var modalElement = document.getElementById('modal-zona');
    if (modalElement && typeof bootstrap !== 'undefined') {
      var modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  // Eliminar zona
  async function eliminarZona(zonaId) {
    // Encontrar zona
    var zona = window.zonasManagerData.find(function(z) { return z.ID === zonaId; });
    if (!zona) {
      mostrarMensaje('error', 'Zona no encontrada');
      return;
    }
    
    // Confirmar eliminación
    var confirmacion = confirm('¿Está seguro de que desea eliminar la zona "' + zona.NOMBRE + '"?');
    
    if (!confirmacion) return;
    
    try {
      mostrarCargando(true);
      
      var response = await fetch('/api/zonas/' + zonaId, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (response.ok) {
        var resultado = await response.json();
        mostrarMensaje('success', 'Zona eliminada correctamente');
        await cargarZonas();
      } else {
        var resultado = await response.json();
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

  // Función para mostrar mensajes
  function mostrarMensaje(tipo, mensaje) {
    // Crear elemento de mensaje
    var alertDiv = document.createElement('div');
    var iconClass = tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-circle' : 'info-circle';
    var alertClass = tipo === 'error' ? 'danger' : tipo;
    
    alertDiv.className = 'alert alert-' + alertClass + ' alert-dismissible fade show';
    alertDiv.innerHTML = '<i class="fas fa-' + iconClass + ' me-2"></i>' + mensaje +
      '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>';
    
    // Insertar en la parte superior del contenido
    var container = document.querySelector('.container-fluid');
    if (container) {
      container.insertBefore(alertDiv, container.firstChild);
      
      // Auto-eliminar después de 5 segundos
      setTimeout(function() {
        if (alertDiv.parentNode) {
          alertDiv.remove();
        }
      }, 5000);
    }
  }

  // Función para mostrar/ocultar cargando
  function mostrarCargando(mostrar) {
    var loading = document.getElementById('loading');
    if (loading) {
      if (mostrar) {
        loading.classList.remove('hidden');
      } else {
        loading.classList.add('hidden');
      }
    }
  }

  // Función placeholder para editar permisos (implementar según necesidades)
  function editarPermisosZonaUsuario(zonaId) {
    console.log('Editar permisos para zona:', zonaId);
    mostrarMensaje('info', 'Función de edición de permisos en desarrollo');
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

  // Auto-inicializar cuando se carga el DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUsuariosZonasManager);
  } else {
    initUsuariosZonasManager();
  }

  console.log('Módulo usuarios-zonas-manager.js cargado correctamente (versión fija)');
}
