// gestion-zonas.js - Gestión completa de zonas
// VERSION CORREGIDA - Sin redeclaraciones

// Verificar si ya está cargado para evitar redeclaraciones
if (typeof window.GESTION_ZONAS_LOADED === 'undefined') {
  window.GESTION_ZONAS_LOADED = true;

  console.log('Cargando módulo de gestión de zonas (versión fija)...');

  // Variables globales para gestión de zonas
  window.zonasDataGlobal = [];
  window.zonasFiltradas = [];
  window.zonaSeleccionada = null;
  window.filtroBusquedaZonas = '';

  // Función de inicialización
  function initGestionZonas() {
    console.log('Inicializando gestión de zonas...');
    
    // Eventos para botones principales de zonas
    var btnNuevaZona = document.getElementById('btn-nueva-zona');
    if (btnNuevaZona && !btnNuevaZona.hasAttribute('data-listener-added')) {
      btnNuevaZona.addEventListener('click', mostrarModalNuevaZona);
      btnNuevaZona.setAttribute('data-listener-added', 'true');
    }
    
    var btnGuardarZona = document.getElementById('btn-guardar-zona');
    if (btnGuardarZona && !btnGuardarZona.hasAttribute('data-listener-added')) {
      btnGuardarZona.addEventListener('click', guardarZona);
      btnGuardarZona.setAttribute('data-listener-added', 'true');
    }
    
    // Evento para búsqueda de zonas
    var inputBusquedaZonas = document.getElementById('busqueda-zonas');
    if (inputBusquedaZonas && !inputBusquedaZonas.hasAttribute('data-listener-added')) {
      inputBusquedaZonas.addEventListener('input', function(e) {
        window.filtroBusquedaZonas = e.target.value.toLowerCase();
        aplicarFiltrosZonas();
      });
      inputBusquedaZonas.setAttribute('data-listener-added', 'true');
    }
    
    // Eventos para formularios de pilonas en zona
    var formAsignarPilonaZona = document.getElementById('form-asignar-pilona-zona');
    if (formAsignarPilonaZona && !formAsignarPilonaZona.hasAttribute('data-listener-added')) {
      formAsignarPilonaZona.addEventListener('submit', function(e) {
        e.preventDefault();
        asignarPilonaAZona();
      });
      formAsignarPilonaZona.setAttribute('data-listener-added', 'true');
    }
    
    console.log('Gestión de zonas inicializada correctamente');
  }

  // Función para cargar zonas
  async function cargarZonas() {
    console.log('Cargando zonas...');
    
    try {
      mostrarCargando(true);
      
      var response = await fetch('/api/zonas', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Error ' + response.status + ': ' + response.statusText);
      }
      
      window.zonasDataGlobal = await response.json();
      console.log('Zonas cargadas: ' + window.zonasDataGlobal.length);
      
      aplicarFiltrosZonas();
    } catch (error) {
      console.error('Error cargando zonas:', error);
      mostrarMensajeError('Error al cargar zonas: ' + error.message);
    } finally {
      mostrarCargando(false);
    }
  }

  function mostrarZonasEnTabla(zonas) {
    var tbody = document.getElementById('tabla-zonas');
    if (!tbody) {
      console.error('Tabla de zonas no encontrada');
      return;
    }
    
    if (!zonas || zonas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-4">' +
        '<i class="fas fa-map-signs fa-2x mb-2"></i><br>' +
        '<strong>No hay zonas configuradas</strong><br>' +
        '<small>Haga clic en "Nueva Zona" para crear la primera zona</small>' +
        '</td></tr>';
      return;
    }
    
    var filas = zonas.map(function(zona) {
      return '<tr>' +
        '<td><strong>' + zona.ID + '</strong></td>' +
        '<td><strong>' + zona.NOMBRE + '</strong></td>' +
        '<td>' + (zona.DESCRIPCION || '<span class="text-muted">Sin descripción</span>') + '</td>' +
        '<td><span class="badge bg-info" id="count-pilonas-' + zona.ID + '">Cargando...</span></td>' +
        '<td><span class="badge bg-success" id="count-usuarios-' + zona.ID + '">Cargando...</span></td>' +
        '<td>' +
        '<div class="btn-group btn-group-sm" role="group">' +
        '<button class="btn btn-outline-primary btn-ver-pilonas" data-zona-id="' + zona.ID + '" title="Ver pilonas">' +
        '<i class="fas fa-traffic-light"></i></button>' +
        '<button class="btn btn-outline-info btn-editar-zona" data-zona-id="' + zona.ID + '" title="Editar zona">' +
        '<i class="fas fa-edit"></i></button>' +
        '<button class="btn btn-outline-danger btn-eliminar-zona" data-zona-id="' + zona.ID + '" title="Eliminar zona">' +
        '<i class="fas fa-trash"></i></button>' +
        '</div>' +
        '</td>' +
        '</tr>';
    });
    
    tbody.innerHTML = filas.join('');
    
    // Usar delegación de eventos en el tbody para mejor rendimiento y fiabilidad
    if (!tbody.hasAttribute('data-eventos-configurados')) {
      tbody.setAttribute('data-eventos-configurados', 'true');
      
      tbody.addEventListener('click', function(e) {
        var target = e.target;
        var button = target.closest('button');
        
        if (!button) return;
        
        e.preventDefault();
        e.stopPropagation();
        
        var zonaId = parseInt(button.getAttribute('data-zona-id'));
        
        // Botón ver pilonas
        if (button.classList.contains('btn-ver-pilonas')) {
          console.log('Click en ver pilonas:', zonaId);
          if (zonaId) {
            mostrarPilonasDeZona(zonaId);
          }
        }
        // Botón editar zona
        else if (button.classList.contains('btn-editar-zona')) {
          console.log('Click en editar zona:', zonaId);
          if (zonaId) {
            editarZona(zonaId);
          }
        }
        // Botón eliminar zona
        else if (button.classList.contains('btn-eliminar-zona')) {
          console.log('Click en eliminar zona:', zonaId);
          if (zonaId) {
            eliminarZona(zonaId);
          }
        }
      });
    }
    
    // Cargar contadores de pilonas y usuarios para cada zona
    zonas.forEach(function(zona) {
      cargarContadoresZona(zona.ID);
    });
  }

  async function cargarContadoresZona(zonaId) {
    try {
      // Cargar pilonas de la zona
      var responsePilonas = await fetch('/api/zonas/' + zonaId + '/pilonas', {
        credentials: 'include'
      });
      
      if (responsePilonas.ok) {
        var pilonas = await responsePilonas.json();
        var countElement = document.getElementById('count-pilonas-' + zonaId);
        if (countElement) {
          countElement.textContent = pilonas.length + ' pilona' + (pilonas.length !== 1 ? 's' : '');
          countElement.className = pilonas.length > 0 ? 'badge bg-info' : 'badge bg-secondary';
        }
      }
      
      // Cargar usuarios de la zona
      var responseUsuarios = await fetch('/api/zonas/' + zonaId + '/usuarios', {
        credentials: 'include'
      });
      
      if (responseUsuarios.ok) {
        var usuarios = await responseUsuarios.json();
        var countElement = document.getElementById('count-usuarios-' + zonaId);
        if (countElement) {
          countElement.textContent = usuarios.length + ' usuario' + (usuarios.length !== 1 ? 's' : '');
          countElement.className = usuarios.length > 0 ? 'badge bg-success' : 'badge bg-secondary';
        }
      }
    } catch (error) {
      console.error('Error cargando contadores para zona ' + zonaId + ':', error);
    }
  }

  function mostrarModalNuevaZona() {
    console.log('Mostrando modal para nueva zona');
    
    // Limpiar formulario
    limpiarFormularioZona();
    
    // Configurar modal para creación
    var modalTitulo = document.getElementById('modal-zona-titulo');
    if (modalTitulo) modalTitulo.textContent = 'Nueva Zona';
    
    var zonaIdField = document.getElementById('zona-id');
    if (zonaIdField) zonaIdField.value = '';
    
    // Mostrar modal
    var modalElement = document.getElementById('modal-zona');
    if (modalElement && typeof bootstrap !== 'undefined') {
      var modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  function editarZona(zonaId) {
    console.log('Editando zona:', zonaId);
    
    var zona = window.zonasDataGlobal.find(function(z) { return z.ID === zonaId; });
    if (!zona) {
      mostrarMensajeError('Zona no encontrada');
      return;
    }
    
    // Llenar formulario
    var zonaIdField = document.getElementById('zona-id');
    var zonaNombreField = document.getElementById('zona-nombre');
    var zonaDescripcionField = document.getElementById('zona-descripcion');
    
    if (zonaIdField) zonaIdField.value = zona.ID;
    if (zonaNombreField) zonaNombreField.value = zona.NOMBRE || '';
    if (zonaDescripcionField) zonaDescripcionField.value = zona.DESCRIPCION || '';
    
    // Configurar modal para edición
    var modalTitulo = document.getElementById('modal-zona-titulo');
    if (modalTitulo) modalTitulo.textContent = 'Editar Zona: ' + zona.NOMBRE;
    
    // Mostrar modal
    var modalElement = document.getElementById('modal-zona');
    if (modalElement && typeof bootstrap !== 'undefined') {
      var modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  async function guardarZona() {
    console.log('Guardando zona...');
    
    try {
      // Validar formulario
      var nombreField = document.getElementById('zona-nombre');
      var nombre = nombreField ? nombreField.value.trim() : '';
      if (!nombre) {
        mostrarMensajeError('El nombre de la zona es obligatorio');
        return;
      }
      
      // Obtener datos del formulario
      var zonaIdField = document.getElementById('zona-id');
      var descripcionField = document.getElementById('zona-descripcion');
      
      var zonaId = zonaIdField ? zonaIdField.value : '';
      var descripcion = descripcionField ? descripcionField.value.trim() : '';
      
      var datos = {
        nombre: nombre,
        descripcion: descripcion || null
      };
      
      // Determinar si es creación o edición
      var esEdicion = zonaId && zonaId !== '';
      
      mostrarCargando(true);
      
      var url = esEdicion ? '/api/zonas/' + zonaId : '/api/zonas';
      var method = esEdicion ? 'PUT' : 'POST';
      
      var response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(datos)
      });
      
      if (!response.ok) {
        var error = await response.json();
        throw new Error(error.error || 'Error ' + response.status);
      }
      
      var resultado = await response.json();
      
      mostrarMensajeExito(esEdicion ? 'Zona actualizada correctamente' : 'Zona creada correctamente');
      
      // Cerrar modal
      var modalElement = document.getElementById('modal-zona');
      if (modalElement && typeof bootstrap !== 'undefined') {
        var modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
          modal.hide();
        }
      }
      
      // Recargar zonas
      await cargarZonas();
      
    } catch (error) {
      console.error('Error guardando zona:', error);
      mostrarMensajeError('Error al guardar zona: ' + error.message);
    } finally {
      mostrarCargando(false);
    }
  }

  async function eliminarZona(zonaId) {
    var zona = window.zonasDataGlobal.find(function(z) { return z.ID === zonaId; });
    if (!zona) {
      mostrarMensajeError('Zona no encontrada');
      return;
    }
    
    var confirmacion = confirm('¿Está seguro de que desea eliminar la zona "' + zona.NOMBRE + '"?\n\nEsta acción no se puede deshacer y eliminará todas las asignaciones de pilonas y usuarios a esta zona.');
    
    if (!confirmacion) return;
    
    try {
      mostrarCargando(true);
      
      var response = await fetch('/api/zonas/' + zonaId, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        var error = await response.json();
        throw new Error(error.error || 'Error ' + response.status);
      }
      
      mostrarMensajeExito('Zona eliminada correctamente');
      await cargarZonas();
      
    } catch (error) {
      console.error('Error eliminando zona:', error);
      mostrarMensajeError('Error al eliminar zona: ' + error.message);
    } finally {
      mostrarCargando(false);
    }
  }

  function limpiarFormularioZona() {
    console.log('Limpiando formulario de zona...');
    
    var form = document.getElementById('form-zona');
    if (form) {
      form.reset();
    }
    
    // Limpiar validación visual
    ['zona-nombre', 'zona-descripcion'].forEach(function(campoId) {
      var elemento = document.getElementById(campoId);
      if (elemento) {
        elemento.classList.remove('is-valid', 'is-invalid');
      }
    });
    
    console.log('Formulario de zona limpiado correctamente');
  }

  // Filtros y búsqueda
  function aplicarFiltrosZonas() {
    window.zonasFiltradas = window.zonasDataGlobal;
    
    // Aplicar filtro de búsqueda
    if (window.filtroBusquedaZonas) {
      window.zonasFiltradas = window.zonasFiltradas.filter(function(zona) {
        return (
          zona.NOMBRE.toLowerCase().includes(window.filtroBusquedaZonas) ||
          (zona.DESCRIPCION && zona.DESCRIPCION.toLowerCase().includes(window.filtroBusquedaZonas))
        );
      });
    }
    
    console.log('Aplicando filtros: ' + window.zonasFiltradas.length + ' zonas de ' + window.zonasDataGlobal.length);
    mostrarZonasEnTabla(window.zonasFiltradas);
  }

  function limpiarBusquedaZonas() {
    var inputBusqueda = document.getElementById('busqueda-zonas');
    if (inputBusqueda) {
      inputBusqueda.value = '';
      window.filtroBusquedaZonas = '';
      aplicarFiltrosZonas();
    }
  }

  // Gestión de pilonas en zonas
  async function mostrarPilonasDeZona(zonaId) {
    var zona = window.zonasDataGlobal.find(function(z) { return z.ID === zonaId; });
    if (!zona) {
      mostrarMensajeError('Zona no encontrada');
      return;
    }
    
    window.zonaSeleccionada = zonaId;
    
    // Configurar modal
    var tituloElement = document.getElementById('pilonas-zona-titulo');
    if (tituloElement) {
      tituloElement.textContent = 'Pilonas asignadas a: ' + zona.NOMBRE;
    }
    
    // Cargar datos
    await cargarPilonasDeZona(zonaId);
    await cargarPilonasDisponiblesParaZona(zonaId);
    
    // Mostrar modal
    var modalElement = document.getElementById('modal-pilonas-zona');
    if (modalElement && typeof bootstrap !== 'undefined') {
      var modal = new bootstrap.Modal(modalElement);
      modal.show();
    }
  }

  async function cargarPilonasDeZona(zonaId) {
    try {
      var response = await fetch('/api/zonas/' + zonaId + '/pilonas', {
        credentials: 'include'
      });
      
      if (response.ok) {
        var pilonas = await response.json();
        mostrarPilonasDeZonaEnTabla(pilonas || []);
      } else {
        mostrarPilonasDeZonaEnTabla([]);
      }
    } catch (error) {
      console.error('Error cargando pilonas de la zona:', error);
      mostrarPilonasDeZonaEnTabla([]);
    }
  }

  function mostrarPilonasDeZonaEnTabla(pilonas) {
    var tbody = document.getElementById('tabla-pilonas-zona');
    var contador = document.getElementById('contador-pilonas-zona');
    
    if (!tbody || !contador) return;
    
    contador.textContent = pilonas.length + ' pilona' + (pilonas.length !== 1 ? 's' : '');
    
    if (pilonas.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">' +
        '<i class="fas fa-traffic-light fa-2x mb-2"></i><br>' +
        'No hay pilonas asignadas a esta zona</td></tr>';
      return;
    }
    
    tbody.innerHTML = pilonas.map(function(pilona) {
      var badgeEstado = obtenerBadgeEstado(pilona.ESTADO);
      
      return '<tr>' +
        '<td><strong>' + pilona.ID + '</strong></td>' +
        '<td><strong>' + pilona.NOMBRE + '</strong></td>' +
        '<td><code>' + pilona.DIRECCION_IP + ':' + pilona.PUERTO + '</code></td>' +
        '<td>' + badgeEstado + '</td>' +
        '<td>' +
        '<button class="btn btn-outline-danger btn-sm btn-eliminar-pilona-zona" ' +
        'data-pilona-id="' + pilona.ID + '" data-zona-id="' + window.zonaSeleccionada + '" title="Eliminar de zona">' +
        '<i class="fas fa-times"></i></button>' +
        '</td>' +
        '</tr>';
    }).join('');
  }

  function obtenerBadgeEstado(estado) {
    var estados = {
      'bajada': '<span class="badge bg-success">Bajada</span>',
      'subida': '<span class="badge bg-danger">Subida</span>',
      'bloqueada_arriba': '<span class="badge bg-warning">Bloqueada Arriba</span>',
      'bloqueada_abajo': '<span class="badge bg-info">Bloqueada Abajo</span>',
      'error': '<span class="badge bg-secondary">Error</span>'
    };
    return estados[estado] || '<span class="badge bg-dark">' + estado + '</span>';
  }

  async function cargarPilonasDisponiblesParaZona(zonaId) {
    try {
      // Obtener todas las pilonas
      var responsePilonas = await fetch('/api/pilonas', {
        credentials: 'include'
      });
      
      if (!responsePilonas.ok) return;
      
      var todasPilonas = await responsePilonas.json();
      
      // Obtener pilonas ya asignadas a la zona
      var responsePilonasZona = await fetch('/api/zonas/' + zonaId + '/pilonas', {
        credentials: 'include'
      });
      
      var pilonasAsignadas = responsePilonasZona.ok ? await responsePilonasZona.json() : [];
      var idsAsignados = pilonasAsignadas.map(function(p) { return p.ID; });
      
      // Filtrar pilonas disponibles
      var pilonasDisponibles = todasPilonas.filter(function(p) { return !idsAsignados.includes(p.ID); });
      
      var select = document.getElementById('select-pilonas-disponibles');
      if (select) {
        select.innerHTML = '<option value="">Seleccionar pilona...</option>';
        pilonasDisponibles.forEach(function(pilona) {
          select.innerHTML += '<option value="' + pilona.ID + '">' + pilona.NOMBRE + ' (' + pilona.DIRECCION_IP + ')</option>';
        });
      }
    } catch (error) {
      console.error('Error cargando pilonas disponibles:', error);
    }
  }

  async function asignarPilonaAZona() {
    var selectPilona = document.getElementById('select-pilonas-disponibles');
    var pilonaId = selectPilona ? selectPilona.value : '';
    
    if (!pilonaId) {
      mostrarMensajeError('Por favor seleccione una pilona');
      return;
    }
    
    if (!window.zonaSeleccionada) {
      mostrarMensajeError('No hay zona seleccionada');
      return;
    }
    
    try {
      mostrarCargando(true);
      
      var response = await fetch('/api/zonas/' + window.zonaSeleccionada + '/pilonas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ pilonaId: pilonaId })
      });
      
      if (!response.ok) {
        var error = await response.json();
        throw new Error(error.error || 'Error ' + response.status);
      }
      
      mostrarMensajeExito('Pilona asignada correctamente');
      
      // Recargar datos
      await cargarPilonasDeZona(window.zonaSeleccionada);
      await cargarPilonasDisponiblesParaZona(window.zonaSeleccionada);
      
      // Limpiar formulario
      var form = document.getElementById('form-asignar-pilona-zona');
      if (form) form.reset();
      
    } catch (error) {
      console.error('Error asignando pilona:', error);
      mostrarMensajeError('Error al asignar pilona: ' + error.message);
    } finally {
      mostrarCargando(false);
    }
  }

  async function eliminarPilonaDeZona(pilonaId) {
    if (!window.zonaSeleccionada) {
      mostrarMensajeError('No hay zona seleccionada');
      return;
    }
    
    var confirmacion = confirm('¿Está seguro de que desea eliminar esta pilona de la zona?');
    
    if (!confirmacion) return;
    
    try {
      mostrarCargando(true);
      
      var response = await fetch('/api/zonas/' + window.zonaSeleccionada + '/pilonas/' + pilonaId, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        var error = await response.json();
        throw new Error(error.error || 'Error ' + response.status);
      }
      
      mostrarMensajeExito('Pilona eliminada de la zona correctamente');
      
      // Recargar datos
      await cargarPilonasDeZona(window.zonaSeleccionada);
      await cargarPilonasDisponiblesParaZona(window.zonaSeleccionada);
      
    } catch (error) {
      console.error('Error eliminando pilona de zona:', error);
      mostrarMensajeError('Error al eliminar pilona de zona: ' + error.message);
    } finally {
      mostrarCargando(false);
    }
  }

  // Utilidades
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

  // Exponer funciones para uso global
  window.initGestionZonas = initGestionZonas;
  window.cargarZonas = cargarZonas;
  window.eliminarPilonaDeZona = eliminarPilonaDeZona;

  // Auto-inicializar cuando se carga el DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGestionZonas);
  } else {
    initGestionZonas();
  }

  console.log('Módulo gestión-zonas.js cargado correctamente (versión fija)');
}
