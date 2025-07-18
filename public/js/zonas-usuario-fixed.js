// zonas-usuario.js - VERSION CORREGIDA - Sin redeclaraciones
// VERSION CORREGIDA - Sin redeclaraciones

// Verificar si ya está cargado para evitar redeclaraciones
if (typeof window.ZONAS_USUARIO_LOADED === 'undefined') {
  window.ZONAS_USUARIO_LOADED = true;

  console.log('Cargando zonas-usuario (versión fija)...');

  // Variables globales para las zonas
  window.zonasUsuario = [];
  window.zonasDisponibles = [];
  window.usuarioSeleccionado = null;

  // Auto-inicializar cuando se carga el DOM
  function initZonasUsuario() {
    console.log('Inicializando módulo de gestión de zonas de usuario...');
    
    // Crear el modal de zonas de usuario
    crearModalZonasUsuario();
    
    // Actualizar estructura de usuario para datos adicionales
    actualizarEstructuraUsuario();
    
    // Integrar con sistema existente
    integrarConSistema();
    
    // Modificar la interfaz para añadir botones de zonas
    setTimeout(function() {
      agregarBotonesZonaEnTablaUsuarios();
    }, 1000);

    console.log('Módulo de gestión de zonas inicializado correctamente');
  }

  // Función para crear el modal de zonas usuario
  function crearModalZonasUsuario() {
    // Verificar si el modal ya existe
    if (document.getElementById('modal-zonas-usuario')) {
      console.log('Modal de zonas de usuario ya existe');
      return;
    }
    
    console.log('Creando modal de zonas de usuario...');
    
    var modalHtml = '<div class="modal fade" id="modal-zonas-usuario" tabindex="-1">' +
      '<div class="modal-dialog modal-lg">' +
        '<div class="modal-content">' +
          '<div class="modal-header bg-primary text-white">' +
            '<h5 class="modal-title" id="zonas-usuario-titulo">Zonas asignadas al usuario</h5>' +
            '<button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>' +
          '</div>' +
          '<div class="modal-body">' +
            '<div class="card mb-3">' +
              '<div class="card-header bg-light">' +
                '<h6 class="mb-0"><i class="fas fa-user me-2"></i>Información del usuario</h6>' +
              '</div>' +
              '<div class="card-body">' +
                '<div class="row">' +
                  '<div class="col-md-6">' +
                    '<p><strong>Nombre:</strong> <span id="zonas-usuario-nombre"></span></p>' +
                    '<p><strong>Email:</strong> <span id="zonas-usuario-email"></span></p>' +
                    '<p><strong>DNI/NIE:</strong> <span id="zonas-usuario-dni"></span></p>' +
                  '</div>' +
                  '<div class="col-md-6">' +
                    '<p><strong>Rol:</strong> <span id="zonas-usuario-rol"></span></p>' +
                    '<p><strong>Matrícula:</strong> <span id="zonas-usuario-matricula"></span></p>' +
                    '<p><strong>Estado:</strong> <span id="zonas-usuario-estado"></span></p>' +
                  '</div>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="card mb-4">' +
              '<div class="card-header bg-light">' +
                '<div class="d-flex justify-content-between align-items-center">' +
                  '<h6 class="mb-0"><i class="fas fa-map-marked-alt me-2"></i>Zonas asignadas</h6>' +
                  '<span class="badge bg-primary" id="contador-zonas">0 zonas</span>' +
                '</div>' +
              '</div>' +
              '<div class="card-body">' +
                '<div class="table-responsive">' +
                  '<table class="table table-hover">' +
                    '<thead class="table-light">' +
                      '<tr>' +
                        '<th>ID</th>' +
                        '<th>Nombre</th>' +
                        '<th>Descripción</th>' +
                        '<th>Permisos</th>' +
                        '<th>Acciones</th>' +
                      '</tr>' +
                    '</thead>' +
                    '<tbody id="tabla-zonas-usuario">' +
                    '</tbody>' +
                  '</table>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<div class="card">' +
              '<div class="card-header bg-light">' +
                '<h6 class="mb-0"><i class="fas fa-plus-circle me-2"></i>Asignar nueva zona</h6>' +
              '</div>' +
              '<div class="card-body">' +
                '<form id="form-asignar-zona" class="row g-3">' +
                  '<div class="col-md-6">' +
                    '<label for="select-zonas-disponibles" class="form-label">Zona</label>' +
                    '<select class="form-select" id="select-zonas-disponibles" required>' +
                      '<option value="">Seleccionar zona...</option>' +
                    '</select>' +
                  '</div>' +
                  '<div class="col-md-4">' +
                    '<label for="select-permisos-zona" class="form-label">Permisos</label>' +
                    '<select class="form-select" id="select-permisos-zona" required>' +
                      '<option value="bajar">Solo bajar</option>' +
                      '<option value="subir,bajar">Subir y bajar</option>' +
                      '<option value="completo">Control completo</option>' +
                    '</select>' +
                  '</div>' +
                  '<div class="col-md-2 d-flex align-items-end">' +
                    '<button type="submit" class="btn btn-primary w-100" id="btn-asignar-zona">' +
                      '<i class="fas fa-plus me-1"></i> Asignar' +
                    '</button>' +
                  '</div>' +
                '</form>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<div class="modal-footer">' +
            '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</div>';
    
    var modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    document.body.appendChild(modalContainer.firstElementChild);
    
    console.log('Modal de zonas de usuario creado correctamente');
    
    // Añadir event listener al formulario de asignar zona
    var formAsignarZona = document.getElementById('form-asignar-zona');
    if (formAsignarZona) {
      formAsignarZona.addEventListener('submit', function(e) {
        e.preventDefault();
        asignarZonaUsuario();
      });
    }
  }

  // Función para actualizar la estructura del usuario con campos adicionales
  function actualizarEstructuraUsuario() {
    console.log('Actualizando estructura de usuario con campos adicionales...');
    
    var modalUsuario = document.getElementById('modal-usuario');
    var usuarioDniField = document.getElementById('usuario-dni');
    
    if (modalUsuario && !usuarioDniField) {
      console.log('Añadiendo campos adicionales al modal de usuario...');
      
      var formUsuario = document.getElementById('form-usuario');
      if (!formUsuario) {
        console.error('No se encontró el formulario de usuario');
        return;
      }
      
      var ultimaFila = formUsuario.querySelector('.form-check');
      if (ultimaFila) {
        ultimaFila = ultimaFila.closest('.mb-3');
      }
      
      var nuevaSeccion = document.createElement('div');
      nuevaSeccion.className = 'border-top pt-3 mt-3';
      nuevaSeccion.innerHTML = '<h6 class="mb-3">Datos adicionales para control de acceso</h6>' +
        '<div class="row mb-3">' +
          '<div class="col-md-6">' +
            '<label for="usuario-dni" class="form-label">DNI/NIE</label>' +
            '<input type="text" class="form-control" id="usuario-dni" placeholder="12345678A">' +
          '</div>' +
          '<div class="col-md-6">' +
            '<label for="usuario-telefono" class="form-label">Teléfono</label>' +
            '<input type="tel" class="form-control" id="usuario-telefono" placeholder="612345678">' +
          '</div>' +
        '</div>' +
        '<div class="row mb-3">' +
          '<div class="col-md-12">' +
            '<label for="usuario-direccion" class="form-label">Dirección</label>' +
            '<input type="text" class="form-control" id="usuario-direccion" placeholder="Calle, número, ciudad">' +
          '</div>' +
        '</div>' +
        '<div class="row mb-3">' +
          '<div class="col-md-6">' +
            '<label for="usuario-matricula" class="form-label">Matrícula Vehículo</label>' +
            '<input type="text" class="form-control" id="usuario-matricula" placeholder="1234ABC">' +
          '</div>' +
          '<div class="col-md-6">' +
            '<label for="usuario-tipo-acceso" class="form-label">Tipo de Acceso</label>' +
            '<select class="form-select" id="usuario-tipo-acceso">' +
              '<option value="residente">Residente</option>' +
              '<option value="comerciante">Comerciante</option>' +
              '<option value="servicios">Servicios</option>' +
              '<option value="temporal">Acceso Temporal</option>' +
            '</select>' +
          '</div>' +
        '</div>' +
        '<div class="row mb-3">' +
          '<div class="col-md-6">' +
            '<label for="usuario-comentarios" class="form-label">Comentarios</label>' +
            '<textarea class="form-control" id="usuario-comentarios" rows="2"></textarea>' +
          '</div>' +
          '<div class="col-md-6">' +
            '<label for="usuario-fecha-renovacion" class="form-label">Fecha Renovación Permiso</label>' +
            '<input type="date" class="form-control" id="usuario-fecha-renovacion">' +
          '</div>' +
        '</div>';
      
      if (ultimaFila && ultimaFila.nextSibling) {
        formUsuario.insertBefore(nuevaSeccion, ultimaFila.nextSibling);
      } else {
        formUsuario.appendChild(nuevaSeccion);
      }
      
      console.log('Campos adicionales añadidos correctamente al formulario de usuario');
    }
  }

  // Función para integrar con el sistema existente
  function integrarConSistema() {
    console.log('Integrando módulo de zonas con el sistema existente...');
    
    // Guardar referencia a la función original mostrarModalUsuario si existe
    if (typeof window.mostrarModalUsuarioOriginal === 'undefined' && typeof window.mostrarModalUsuario === 'function') {
      console.log('Configurando integración con mostrarModalUsuario...');
      
      window.mostrarModalUsuarioOriginal = window.mostrarModalUsuario;
      
      window.mostrarModalUsuario = function(id) {
        window.mostrarModalUsuarioOriginal(id);
        
        if (id) {
          setTimeout(function() {
            agregarBotonZonasUsuario();
          }, 300);
        }
      };
    }
    
    console.log('Integración del módulo de zonas completada correctamente');
  }

  // Función para añadir botones de zonas a la tabla de usuarios
  function agregarBotonesZonaEnTablaUsuarios() {
    console.log('Añadiendo botones de gestión de zonas a la tabla de usuarios...');
    
    var tablaUsuarios = document.getElementById('tabla-usuarios');
    if (!tablaUsuarios) {
      console.error('Tabla de usuarios no encontrada');
      return;
    }
    
    var filas = tablaUsuarios.querySelectorAll('tr');
    var botonesAgregados = 0;
    
    filas.forEach(function(fila) {
      var idCell = fila.querySelector('td:first-child');
      if (!idCell) return;
      
      var usuarioId = idCell.textContent.trim();
      if (!usuarioId || isNaN(parseInt(usuarioId))) return;
      
      var accionesCell = fila.querySelector('td:last-child');
      if (!accionesCell) return;
      
      var btnGroup = accionesCell.querySelector('.btn-group');
      if (!btnGroup) return;
      
      if (btnGroup.querySelector('.btn-zonas-usuario')) return;
      
      var btnMapa = btnGroup.querySelector('.fa-map-marker-alt');
      if (btnMapa) {
        btnMapa.closest('button').remove();
      }
      
      var btnZonas = document.createElement('button');
      btnZonas.className = 'btn btn-outline-info btn-zonas-usuario';
      btnZonas.title = 'Gestionar zonas';
      btnZonas.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
      btnZonas.setAttribute('data-id', usuarioId);
      
      btnZonas.addEventListener('click', function(e) {
        e.preventDefault();
        var id = this.getAttribute('data-id');
        mostrarModalZonasUsuario(id);
      });
      
      btnGroup.appendChild(btnZonas);
      botonesAgregados++;
    });
    
    console.log('Botones de gestión de zonas añadidos correctamente: ' + botonesAgregados);
  }

  // Función para añadir botón de gestión de zonas al modal de edición de usuario
  function agregarBotonZonasUsuario() {
    console.log('Añadiendo botón de gestión de zonas al modal de usuario...');
    
    var usuarioIdField = document.getElementById('usuario-id');
    var usuarioId = usuarioIdField ? usuarioIdField.value : '';
    
    if (!usuarioId) {
      console.log('No hay ID de usuario, no se añade botón de zonas');
      return;
    }
    
    var footerDiv = document.querySelector('#modal-usuario .modal-footer');
    if (!footerDiv) {
      console.error('Footer del modal no encontrado');
      return;
    }
    
    if (document.getElementById('btn-gestionar-zonas')) {
      console.log('El botón de gestión de zonas ya existe');
      return;
    }
    
    var btnZonas = document.createElement('button');
    btnZonas.type = 'button';
    btnZonas.className = 'btn btn-info me-2';
    btnZonas.id = 'btn-gestionar-zonas';
    btnZonas.innerHTML = '<i class="fas fa-map-marker-alt me-1"></i> Gestionar Zonas';
    
    btnZonas.addEventListener('click', function() {
      var modalUsuario = bootstrap.Modal.getInstance(document.getElementById('modal-usuario'));
      if (modalUsuario) {
        modalUsuario.hide();
      }
      
      setTimeout(function() {
        mostrarModalZonasUsuario(usuarioId);
      }, 500);
    });
    
    var ultimoBoton = footerDiv.querySelector('button:last-child');
    if (ultimoBoton) {
      footerDiv.insertBefore(btnZonas, ultimoBoton);
    } else {
      footerDiv.appendChild(btnZonas);
    }
    
    console.log('Botón de gestión de zonas añadido correctamente');
  }

  // Cargar zonas asignadas a un usuario
  async function cargarZonasUsuario(usuarioId) {
    console.log('Cargando zonas del usuario ID: ' + usuarioId + '...');
    
    mostrarCargando(true);
    
    try {
      // Obtener datos del usuario
      var responseUsuario = await fetch('/api/usuarios/' + usuarioId, {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!responseUsuario.ok) {
        throw new Error('Error al cargar datos del usuario: ' + responseUsuario.status);
      }
      
      var dataUsuario = await responseUsuario.json();
      window.usuarioSeleccionado = dataUsuario;
      
      console.log('Datos del usuario cargados:', dataUsuario);
      
      // Actualizar elementos del modal
      function actualizarElementoSiExiste(id, valor) {
        var elemento = document.getElementById(id);
        if (elemento) {
          elemento.textContent = valor;
        } else {
          console.warn('Elemento ' + id + ' no encontrado en el DOM');
        }
      }
      
      actualizarElementoSiExiste('zonas-usuario-titulo', 
        'Zonas asignadas a ' + (dataUsuario.NOMBRE || dataUsuario.nombre || 'Usuario'));
      actualizarElementoSiExiste('zonas-usuario-nombre', 
        dataUsuario.NOMBRE || dataUsuario.nombre || '');
      actualizarElementoSiExiste('zonas-usuario-email', 
        dataUsuario.EMAIL || dataUsuario.email || '');
      actualizarElementoSiExiste('zonas-usuario-rol', 
        formatRol(dataUsuario.ROL || dataUsuario.rol || ''));
      actualizarElementoSiExiste('zonas-usuario-estado', 
        dataUsuario.ACTIVO || dataUsuario.activo ? 'Activo' : 'Inactivo');
      actualizarElementoSiExiste('zonas-usuario-dni', 
        dataUsuario.DNI || dataUsuario.dni || 'No especificado');
      actualizarElementoSiExiste('zonas-usuario-matricula', 
        dataUsuario.MATRICULA || dataUsuario.matricula || 'No especificado');
      
      // Cargar zonas del usuario
      console.log('Obteniendo zonas asignadas al usuario...');
      var responseZonas = await fetch('/api/usuarios/' + usuarioId + '/zonas', {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!responseZonas.ok) {
        throw new Error('Error al cargar zonas del usuario: ' + responseZonas.status);
      }
      
      var dataZonas = await responseZonas.json();
      console.log('Zonas del usuario obtenidas:', dataZonas);
      
      window.zonasUsuario = dataZonas.zonas || [];
      
      actualizarElementoSiExiste('contador-zonas', 
        window.zonasUsuario.length + ' zona' + (window.zonasUsuario.length !== 1 ? 's' : ''));
      
      actualizarTablaZonasUsuario();
      await cargarZonasDisponibles(usuarioId);
      
      return true;
    } catch (error) {
      console.error('Error en cargarZonasUsuario:', error);
      mostrarMensaje('error', 'Error al cargar las zonas: ' + error.message);
      return false;
    } finally {
      mostrarCargando(false);
    }
  }

  // Cargar zonas disponibles para asignar
  async function cargarZonasDisponibles(usuarioId) {
    console.log('Cargando zonas disponibles para usuario ID: ' + usuarioId + '...');
    
    try {
      var response = await fetch('/api/usuarios/' + usuarioId + '/zonas-disponibles', {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        var error = await response.json();
        throw new Error(error.error || 'Error ' + response.status + ': ' + response.statusText);
      }
      
      var data = await response.json();
      console.log('Zonas disponibles obtenidas:', data);
      
      window.zonasDisponibles = data || [];
      actualizarSelectZonasDisponibles();
      
      return true;
    } catch (error) {
      console.error('Error en cargarZonasDisponibles:', error);
      mostrarMensaje('error', 'Error al cargar zonas disponibles: ' + error.message);
      return false;
    }
  }

  // Actualizar tabla de zonas asignadas
  function actualizarTablaZonasUsuario() {
    console.log('Actualizando tabla de zonas de usuario...');
    
    var tabla = document.getElementById('tabla-zonas-usuario');
    if (!tabla) {
      console.error('Tabla de zonas de usuario no encontrada');
      return;
    }
    
    tabla.innerHTML = '';
    
    var tituloElement = document.getElementById('zonas-usuario-titulo');
    if (tituloElement && window.usuarioSeleccionado) {
      tituloElement.textContent = 'Zonas asignadas a ' + (window.usuarioSeleccionado.NOMBRE || window.usuarioSeleccionado.nombre || 'Usuario');
    }
    
    if (!window.zonasUsuario || window.zonasUsuario.length === 0) {
      var tr = document.createElement('tr');
      tr.innerHTML = '<td colspan="5" class="text-center">Este usuario no tiene zonas asignadas</td>';
      tabla.appendChild(tr);
      return;
    }
    
    window.zonasUsuario.forEach(function(zona) {
      var tr = document.createElement('tr');
      var zonaId = zona.ID || zona.id;
      
      tr.innerHTML = '<td>' + zonaId + '</td>' +
        '<td>' + (zona.NOMBRE || zona.nombre || '') + '</td>' +
        '<td>' + (zona.DESCRIPCION || zona.descripcion || '-') + '</td>' +
        '<td>' +
          '<select class="form-select form-select-sm permisos-zona" data-zona-id="' + zonaId + '">' +
            '<option value="bajar"' + ((zona.PERMISOS || zona.permisos) === 'bajar' ? ' selected' : '') + '>Solo bajar</option>' +
            '<option value="subir,bajar"' + ((zona.PERMISOS || zona.permisos) === 'subir,bajar' ? ' selected' : '') + '>Subir y bajar</option>' +
            '<option value="completo"' + ((zona.PERMISOS || zona.permisos) === 'completo' ? ' selected' : '') + '>Control completo</option>' +
          '</select>' +
        '</td>' +
        '<td>' +
          '<button class="btn btn-sm btn-danger eliminar-zona" data-zona-id="' + zonaId + '">' +
            '<i class="fas fa-trash"></i>' +
          '</button>' +
        '</td>';
      
      tabla.appendChild(tr);
    });
    
    // Añadir eventos para cambiar permisos
    document.querySelectorAll('.permisos-zona').forEach(function(select) {
      select.addEventListener('change', function(e) {
        var zonaId = e.target.getAttribute('data-zona-id');
        var permisos = e.target.value;
        actualizarPermisosZona(zonaId, permisos);
      });
    });
    
    // Añadir eventos para eliminar zona
    document.querySelectorAll('.eliminar-zona').forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        var zonaId = e.currentTarget.getAttribute('data-zona-id');
        eliminarZonaUsuario(zonaId);
      });
    });
    
    console.log('Tabla de zonas actualizada correctamente');
  }

  // Actualizar select de zonas disponibles
  function actualizarSelectZonasDisponibles() {
    console.log('Actualizando select de zonas disponibles...');
    
    var select = document.getElementById('select-zonas-disponibles');
    if (!select) {
      console.error('Select de zonas disponibles no encontrado');
      return;
    }
    
    select.innerHTML = '';
    
    var optionDefault = document.createElement('option');
    optionDefault.value = '';
    optionDefault.textContent = 'Seleccionar zona...';
    select.appendChild(optionDefault);
    
    if (!window.zonasDisponibles || window.zonasDisponibles.length === 0) {
      var option = document.createElement('option');
      option.value = '';
      option.textContent = 'No hay zonas disponibles';
      option.disabled = true;
      select.appendChild(option);
      select.disabled = true;
      
      var btnAsignar = document.getElementById('btn-asignar-zona');
      if (btnAsignar) {
        btnAsignar.disabled = true;
      }
      
      console.log('No hay zonas disponibles para asignar');
      return;
    }
    
    select.disabled = false;
    var btnAsignar = document.getElementById('btn-asignar-zona');
    if (btnAsignar) {
      btnAsignar.disabled = false;
    }
    
    window.zonasDisponibles.forEach(function(zona) {
      var option = document.createElement('option');
      option.value = zona.ID || zona.id;
      option.textContent = (zona.NOMBRE || zona.nombre) + (zona.DESCRIPCION || zona.descripcion ? ' - ' + (zona.DESCRIPCION || zona.descripcion) : '');
      select.appendChild(option);
    });
    
    console.log('Se han añadido ' + window.zonasDisponibles.length + ' zonas al select');
  }

  // Asignar una zona al usuario
  async function asignarZonaUsuario() {
    console.log('Intentando asignar zona a usuario...');
    
    if (!window.usuarioSeleccionado) {
      mostrarMensaje('error', 'No hay usuario seleccionado');
      return false;
    }
    
    var select = document.getElementById('select-zonas-disponibles');
    var selectPermisos = document.getElementById('select-permisos-zona');
    
    if (!select || !selectPermisos) {
      console.error('Select de zonas o permisos no encontrado');
      return false;
    }
    
    var zonaId = select.value;
    var permisos = selectPermisos.value;
    
    if (!zonaId) {
      mostrarMensaje('error', 'Seleccione una zona');
      return false;
    }
    
    mostrarCargando(true);
    
    try {
      var response = await fetch('/api/usuarios/' + (window.usuarioSeleccionado.ID || window.usuarioSeleccionado.id) + '/zonas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          zonaId: zonaId,
          permisos: permisos
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        var error = await response.json();
        throw new Error(error.error || 'Error ' + response.status + ': ' + response.statusText);
      }
      
      var data = await response.json();
      mostrarMensaje('success', data.mensaje || 'Zona asignada correctamente');
      
      await cargarZonasUsuario(window.usuarioSeleccionado.ID || window.usuarioSeleccionado.id);
      
      return true;
    } catch (error) {
      console.error('Error en asignarZonaUsuario:', error);
      mostrarMensaje('error', 'Error al asignar zona: ' + error.message);
      return false;
    } finally {
      mostrarCargando(false);
    }
  }

  // Actualizar permisos de una zona
  async function actualizarPermisosZona(zonaId, permisos) {
    console.log('Actualizando permisos de zona ' + zonaId + ' a ' + permisos + '...');
    
    if (!window.usuarioSeleccionado) {
      mostrarMensaje('error', 'No hay usuario seleccionado');
      return false;
    }
    
    mostrarCargando(true);
    
    try {
      var response = await fetch('/api/usuarios/' + (window.usuarioSeleccionado.ID || window.usuarioSeleccionado.id) + '/zonas/' + zonaId, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          permisos: permisos
        }),
        credentials: 'include'
      });
      
      if (!response.ok) {
        var error = await response.json();
        throw new Error(error.error || 'Error ' + response.status + ': ' + response.statusText);
      }
      
      var data = await response.json();
      mostrarMensaje('success', data.mensaje || 'Permisos actualizados correctamente');
      
      var index = window.zonasUsuario.findIndex(function(z) { return (z.ID || z.id) == zonaId; });
      if (index !== -1) {
        window.zonasUsuario[index].PERMISOS = permisos;
        window.zonasUsuario[index].permisos = permisos;
      }
      
      return true;
    } catch (error) {
      console.error('Error en actualizarPermisosZona:', error);
      mostrarMensaje('error', 'Error al actualizar permisos: ' + error.message);
      
      await cargarZonasUsuario(window.usuarioSeleccionado.ID || window.usuarioSeleccionado.id);
      
      return false;
    } finally {
      mostrarCargando(false);
    }
  }

  // Eliminar una zona asignada a un usuario
  async function eliminarZonaUsuario(zonaId) {
    console.log('Intentando eliminar zona ' + zonaId + ' del usuario...');
    
    if (!window.usuarioSeleccionado) {
      mostrarMensaje('error', 'No hay usuario seleccionado');
      return false;
    }
    
    if (!confirm('¿Está seguro de eliminar esta zona del usuario?')) {
      return false;
    }
    
    mostrarCargando(true);
    
    try {
      var response = await fetch('/api/usuarios/' + (window.usuarioSeleccionado.ID || window.usuarioSeleccionado.id) + '/zonas/' + zonaId, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      if (!response.ok) {
        var error = await response.json();
        throw new Error(error.error || 'Error ' + response.status + ': ' + response.statusText);
      }
      
      var data = await response.json();
      mostrarMensaje('success', data.mensaje || 'Zona eliminada correctamente');
      
      await cargarZonasUsuario(window.usuarioSeleccionado.ID || window.usuarioSeleccionado.id);
      
      return true;
    } catch (error) {
      console.error('Error en eliminarZonaUsuario:', error);
      mostrarMensaje('error', 'Error al eliminar zona: ' + error.message);
      return false;
    } finally {
      mostrarCargando(false);
    }
  }

  // Mostrar modal para gestionar zonas de un usuario
  function mostrarModalZonasUsuario(usuarioId) {
    console.log('Mostrando modal de zonas para usuario ID: ' + usuarioId + '...');
    
    if (!document.getElementById('modal-zonas-usuario')) {
      console.log('El modal de zonas no existe, creándolo...');
      crearModalZonasUsuario();
    }
    
    var modalElement = document.getElementById('modal-zonas-usuario');
    if (!modalElement) {
      console.error('Modal de zonas de usuario no encontrado después de intento de creación');
      mostrarMensaje('error', 'Error al abrir el modal de zonas. Intente refrescar la página.');
      return;
    }
    
    cargarZonasUsuario(usuarioId).then(function(success) {
      if (success) {
        var modal = new bootstrap.Modal(modalElement);
        modal.show();
      }
    });
  }

  // Formatear rol para mostrar
  function formatRol(rol) {
    if (!rol) return '';
    
    switch (rol.toLowerCase()) {
      case 'administrador':
        return 'Administrador';
      case 'operador':
        return 'Operador';
      case 'cliente':
        return 'Cliente';
      default:
        return rol;
    }
  }

  // Funciones auxiliares
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

  function mostrarMensaje(tipo, mensaje) {
    // Crear elemento de mensaje
    var alertDiv = document.createElement('div');
    var iconClass = tipo === 'success' ? 'check-circle' : tipo === 'error' ? 'exclamation-circle' : 'info-circle';
    var alertClass = tipo === 'error' ? 'danger' : tipo;
    
    alertDiv.className = 'alert alert-' + alertClass + ' alert-dismissible fade show';
    alertDiv.innerHTML = '<i class="fas fa-' + iconClass + ' me-2"></i>' + mensaje +
      '<button type="button" class="btn-close" data-bs-dismiss="alert"></button>';
    
    var container = document.querySelector('.container-fluid');
    if (container) {
      container.insertBefore(alertDiv, container.firstChild);
      
      setTimeout(function() {
        if (alertDiv.parentNode) {
          alertDiv.remove();
        }
      }, 5000);
    }
  }

  // Exponer funciones para uso global
  window.mostrarModalZonasUsuario = mostrarModalZonasUsuario;
  window.cargarZonasUsuario = cargarZonasUsuario;
  window.asignarZonaUsuario = asignarZonaUsuario;
  window.eliminarZonaUsuario = eliminarZonaUsuario;
  window.actualizarPermisosZona = actualizarPermisosZona;

  // Auto-inicializar cuando se carga el DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initZonasUsuario);
  } else {
    initZonasUsuario();
  }

  console.log('Módulo zonas-usuario.js cargado correctamente (versión fija)');
}
