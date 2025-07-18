// gestión-zonas.js - Gestión completa de zonas
console.log('Cargando módulo de gestión de zonas...');

// Variables globales para gestión de zonas
let zonasData = [];
let zonasFiltradas = [];
let zonaSeleccionada = null;
let filtroBusquedaZonas = '';

// Inicialización
document.addEventListener('DOMContentLoaded', function() {
  console.log('Inicializando gestión de zonas...');
  initGestionZonas();
});

function initGestionZonas() {
  // Eventos para botones principales de zonas
  const btnNuevaZona = document.getElementById('btn-nueva-zona');
  if (btnNuevaZona) {
    btnNuevaZona.addEventListener('click', mostrarModalNuevaZona);
  }
  
  const btnGuardarZona = document.getElementById('btn-guardar-zona');
  if (btnGuardarZona) {
    btnGuardarZona.addEventListener('click', guardarZona);
  }
  
  // Evento para búsqueda de zonas
  const inputBusquedaZonas = document.getElementById('busqueda-zonas');
  if (inputBusquedaZonas) {
    inputBusquedaZonas.addEventListener('input', function(e) {
      filtroBusquedaZonas = e.target.value.toLowerCase();
      aplicarFiltrosZonas();
    });
  }
  
  // Eventos para formularios de pilonas en zona
  const formAsignarPilonaZona = document.getElementById('form-asignar-pilona-zona');
  if (formAsignarPilonaZona) {
    formAsignarPilonaZona.addEventListener('submit', function(e) {
      e.preventDefault();
      asignarPilonaAZona();
    });
  }
  
  console.log('Gestión de zonas inicializada correctamente');
}

// ================================================================================
// GESTIÓN DE ZONAS
// ================================================================================

async function cargarZonas() {
  console.log('Cargando zonas...');
  
  try {
    mostrarCargando(true);
    
    const response = await fetch('/api/zonas', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Error ${response.status}: ${response.statusText}`);
    }
    
    zonasData = await response.json();
    console.log(`Zonas cargadas: ${zonasData.length}`);
    
    aplicarFiltrosZonas();
  } catch (error) {
    console.error('Error cargando zonas:', error);
    mostrarMensajeError('Error al cargar zonas: ' + error.message);
  } finally {
    mostrarCargando(false);
  }
}

function mostrarZonasEnTabla(zonas) {
  const tbody = document.getElementById('tabla-zonas');
  if (!tbody) {
    console.error('Tabla de zonas no encontrada');
    return;
  }
  
  if (!zonas || zonas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-muted py-4">
          <i class="fas fa-map-signs fa-2x mb-2"></i><br>
          <strong>No hay zonas configuradas</strong><br>
          <small>Haga clic en "Nueva Zona" para crear la primera zona</small>
        </td>
      </tr>
    `;
    return;
  }
  
  const filas = zonas.map(zona => {
    return `
      <tr>
        <td><strong>${zona.ID}</strong></td>
        <td><strong>${zona.NOMBRE}</strong></td>
        <td>${zona.DESCRIPCION || '<span class="text-muted">Sin descripción</span>'}</td>
        <td>
          <span class="badge bg-info" id="count-pilonas-${zona.ID}">Cargando...</span>
        </td>
        <td>
          <span class="badge bg-success" id="count-usuarios-${zona.ID}">Cargando...</span>
        </td>
        <td>
          <div class="btn-group btn-group-sm" role="group">
            <button class="btn btn-outline-primary btn-ver-pilonas" 
                    data-zona-id="${zona.ID}" 
                    title="Ver pilonas">
              <i class="fas fa-traffic-light"></i>
            </button>
            <button class="btn btn-outline-info btn-editar-zona" 
                    data-zona-id="${zona.ID}" 
                    title="Editar zona">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-outline-danger btn-eliminar-zona" 
                    data-zona-id="${zona.ID}" 
                    title="Eliminar zona">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });
  
  tbody.innerHTML = filas.join('');
  
  // Usar delegación de eventos en el tbody para mejor rendimiento y fiabilidad
  if (!tbody.hasAttribute('data-eventos-configurados')) {
    tbody.setAttribute('data-eventos-configurados', 'true');
    
    tbody.addEventListener('click', function(e) {
      const target = e.target;
      const button = target.closest('button');
      
      if (!button) return;
      
      e.preventDefault();
      e.stopPropagation();
      
      const zonaId = parseInt(button.getAttribute('data-zona-id'));
      
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
  zonas.forEach(zona => {
    cargarContadoresZona(zona.ID);
  });
}

async function cargarContadoresZona(zonaId) {
  try {
    // Cargar pilonas de la zona
    const responsePilonas = await fetch(`/api/zonas/${zonaId}/pilonas`, {
      credentials: 'include'
    });
    
    if (responsePilonas.ok) {
      const pilonas = await responsePilonas.json();
      const countElement = document.getElementById(`count-pilonas-${zonaId}`);
      if (countElement) {
        countElement.textContent = `${pilonas.length} pilona${pilonas.length !== 1 ? 's' : ''}`;
        countElement.className = pilonas.length > 0 ? 'badge bg-info' : 'badge bg-secondary';
      }
    }
    
    // Cargar usuarios de la zona
    const responseUsuarios = await fetch(`/api/zonas/${zonaId}/usuarios`, {
      credentials: 'include'
    });
    
    if (responseUsuarios.ok) {
      const usuarios = await responseUsuarios.json();
      const countElement = document.getElementById(`count-usuarios-${zonaId}`);
      if (countElement) {
        countElement.textContent = `${usuarios.length} usuario${usuarios.length !== 1 ? 's' : ''}`;
        countElement.className = usuarios.length > 0 ? 'badge bg-success' : 'badge bg-secondary';
      }
    }
  } catch (error) {
    console.error(`Error cargando contadores para zona ${zonaId}:`, error);
  }
}

function mostrarModalNuevaZona() {
  console.log('Mostrando modal para nueva zona');
  
  // Limpiar formulario
  limpiarFormularioZona();
  
  // Configurar modal para creación
  document.getElementById('modal-zona-titulo').textContent = 'Nueva Zona';
  document.getElementById('zona-id').value = '';
  
  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById('modal-zona'));
  modal.show();
}

function editarZona(zonaId) {
  console.log('Editando zona:', zonaId);
  
  const zona = zonasData.find(z => z.ID === zonaId);
  if (!zona) {
    mostrarMensajeError('Zona no encontrada');
    return;
  }
  
  // Llenar formulario
  document.getElementById('zona-id').value = zona.ID;
  document.getElementById('zona-nombre').value = zona.NOMBRE || '';
  document.getElementById('zona-descripcion').value = zona.DESCRIPCION || '';
  
  // Configurar modal para edición
  document.getElementById('modal-zona-titulo').textContent = `Editar Zona: ${zona.NOMBRE}`;
  
  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById('modal-zona'));
  modal.show();
}

async function guardarZona() {
  console.log('Guardando zona...');
  
  try {
    // Validar formulario
    const nombre = document.getElementById('zona-nombre').value.trim();
    if (!nombre) {
      mostrarMensajeError('El nombre de la zona es obligatorio');
      return;
    }
    
    // Obtener datos del formulario
    const zonaId = document.getElementById('zona-id').value;
    const descripcion = document.getElementById('zona-descripcion').value.trim();
    
    const datos = {
      nombre: nombre,
      descripcion: descripcion || null
    };
    
    // Determinar si es creación o edición
    const esEdicion = zonaId && zonaId !== '';
    
    mostrarCargando(true);
    
    const url = esEdicion ? `/api/zonas/${zonaId}` : '/api/zonas';
    const method = esEdicion ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method: method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(datos)
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error ${response.status}`);
    }
    
    const resultado = await response.json();
    
    mostrarMensajeExito(esEdicion ? 'Zona actualizada correctamente' : 'Zona creada correctamente');
    
    // Cerrar modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('modal-zona'));
    if (modal) {
      modal.hide();
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
  const zona = zonasData.find(z => z.ID === zonaId);
  if (!zona) {
    mostrarMensajeError('Zona no encontrada');
    return;
  }
  
  const confirmacion = await mostrarConfirmacion(
    'Eliminar Zona',
    `¿Está seguro de que desea eliminar la zona "${zona.NOMBRE}"?\\n\\nEsta acción no se puede deshacer y eliminará todas las asignaciones de pilonas y usuarios a esta zona.`
  );
  
  if (!confirmacion) return;
  
  try {
    mostrarCargando(true);
    
    const response = await fetch(`/api/zonas/${zonaId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error ${response.status}`);
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
  
  const form = document.getElementById('form-zona');
  if (form) {
    form.reset();
  }
  
  // Limpiar validación visual
  ['zona-nombre', 'zona-descripcion'].forEach(campoId => {
    const elemento = document.getElementById(campoId);
    if (elemento) {
      elemento.classList.remove('is-valid', 'is-invalid');
    }
  });
  
  console.log('Formulario de zona limpiado correctamente');
}

// ================================================================================
// FILTROS Y BÚSQUEDA
// ================================================================================

function aplicarFiltrosZonas() {
  zonasFiltradas = zonasData;
  
  // Aplicar filtro de búsqueda
  if (filtroBusquedaZonas) {
    zonasFiltradas = zonasFiltradas.filter(zona => {
      return (
        zona.NOMBRE.toLowerCase().includes(filtroBusquedaZonas) ||
        (zona.DESCRIPCION && zona.DESCRIPCION.toLowerCase().includes(filtroBusquedaZonas))
      );
    });
  }
  
  console.log(`Aplicando filtros: ${zonasFiltradas.length} zonas de ${zonasData.length}`);
  mostrarZonasEnTabla(zonasFiltradas);
}

function limpiarBusquedaZonas() {
  const inputBusqueda = document.getElementById('busqueda-zonas');
  if (inputBusqueda) {
    inputBusqueda.value = '';
    filtroBusquedaZonas = '';
    aplicarFiltrosZonas();
  }
}

// ================================================================================
// GESTIÓN DE PILONAS EN ZONAS
// ================================================================================

async function mostrarPilonasDeZona(zonaId) {
  const zona = zonasData.find(z => z.ID === zonaId);
  if (!zona) {
    mostrarMensajeError('Zona no encontrada');
    return;
  }
  
  zonaSeleccionada = zonaId;
  
  // Configurar modal
  document.getElementById('pilonas-zona-titulo').textContent = 
    `Pilonas asignadas a: ${zona.NOMBRE}`;
  
  // Cargar datos
  await cargarPilonasDeZona(zonaId);
  await cargarPilonasDisponiblesParaZona(zonaId);
  
  // Mostrar modal
  const modal = new bootstrap.Modal(document.getElementById('modal-pilonas-zona'));
  modal.show();
}

async function cargarPilonasDeZona(zonaId) {
  try {
    const response = await fetch(`/api/zonas/${zonaId}/pilonas`, {
      credentials: 'include'
    });
    
    if (response.ok) {
      const pilonas = await response.json();
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
  const tbody = document.getElementById('tabla-pilonas-zona');
  const contador = document.getElementById('contador-pilonas-zona');
  
  if (!tbody || !contador) return;
  
  contador.textContent = `${pilonas.length} pilona${pilonas.length !== 1 ? 's' : ''}`;
  
  if (pilonas.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted py-4">
          <i class="fas fa-traffic-light fa-2x mb-2"></i><br>
          No hay pilonas asignadas a esta zona
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = pilonas.map(pilona => {
    const badgeEstado = obtenerBadgeEstado(pilona.ESTADO);
    
    return `
      <tr>
        <td><strong>${pilona.ID}</strong></td>
        <td><strong>${pilona.NOMBRE}</strong></td>
        <td><code>${pilona.DIRECCION_IP}:${pilona.PUERTO}</code></td>
        <td>${badgeEstado}</td>
        <td>
          <button class="btn btn-outline-danger btn-sm btn-eliminar-pilona-zona" 
                  data-pilona-id="${pilona.ID}" 
                  data-zona-id="${zonaSeleccionada}" 
                  title="Eliminar de zona">
            <i class="fas fa-times"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');
  
  // Configurar event listeners para los botones de eliminar
  document.querySelectorAll('.btn-eliminar-pilona-zona').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const pilonaId = parseInt(this.getAttribute('data-pilona-id'));
      if (pilonaId) {
        eliminarPilonaDeZona(pilonaId);
      }
    });
  });
}

function obtenerBadgeEstado(estado) {
  const estados = {
    'bajada': '<span class="badge bg-success">Bajada</span>',
    'subida': '<span class="badge bg-danger">Subida</span>',
    'bloqueada_arriba': '<span class="badge bg-warning">Bloqueada Arriba</span>',
    'bloqueada_abajo': '<span class="badge bg-info">Bloqueada Abajo</span>',
    'error': '<span class="badge bg-secondary">Error</span>'
  };
  return estados[estado] || `<span class="badge bg-dark">${estado}</span>`;
}

async function cargarPilonasDisponiblesParaZona(zonaId) {
  try {
    // Obtener todas las pilonas
    const responsePilonas = await fetch('/api/pilonas', {
      credentials: 'include'
    });
    
    if (!responsePilonas.ok) return;
    
    const todasPilonas = await responsePilonas.json();
    
    // Obtener pilonas ya asignadas a la zona
    const responsePilonasZona = await fetch(`/api/zonas/${zonaId}/pilonas`, {
      credentials: 'include'
    });
    
    const pilonasAsignadas = responsePilonasZona.ok ? await responsePilonasZona.json() : [];
    const idsAsignados = pilonasAsignadas.map(p => p.ID);
    
    // Filtrar pilonas disponibles
    const pilonasDisponibles = todasPilonas.filter(p => !idsAsignados.includes(p.ID));
    
    const select = document.getElementById('select-pilonas-disponibles');
    if (select) {
      select.innerHTML = '<option value="">Seleccionar pilona...</option>';
      pilonasDisponibles.forEach(pilona => {
        select.innerHTML += `<option value="${pilona.ID}">${pilona.NOMBRE} (${pilona.DIRECCION_IP})</option>`;
      });
    }
  } catch (error) {
    console.error('Error cargando pilonas disponibles:', error);
  }
}

async function asignarPilonaAZona() {
  const pilonaId = document.getElementById('select-pilonas-disponibles').value;
  
  if (!pilonaId) {
    mostrarMensajeError('Por favor seleccione una pilona');
    return;
  }
  
  if (!zonaSeleccionada) {
    mostrarMensajeError('No hay zona seleccionada');
    return;
  }
  
  try {
    mostrarCargando(true);
    
    const response = await fetch(`/api/zonas/${zonaSeleccionada}/pilonas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ pilonaId })
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error ${response.status}`);
    }
    
    mostrarMensajeExito('Pilona asignada correctamente');
    
    // Recargar datos
    await cargarPilonasDeZona(zonaSeleccionada);
    await cargarPilonasDisponiblesParaZona(zonaSeleccionada);
    
    // Limpiar formulario
    document.getElementById('form-asignar-pilona-zona').reset();
    
  } catch (error) {
    console.error('Error asignando pilona:', error);
    mostrarMensajeError('Error al asignar pilona: ' + error.message);
  } finally {
    mostrarCargando(false);
  }
}

async function eliminarPilonaDeZona(pilonaId) {
  if (!zonaSeleccionada) {
    mostrarMensajeError('No hay zona seleccionada');
    return;
  }
  
  const confirmacion = await mostrarConfirmacion(
    'Eliminar Pilona de Zona',
    '¿Está seguro de que desea eliminar esta pilona de la zona?'
  );
  
  if (!confirmacion) return;
  
  try {
    mostrarCargando(true);
    
    const response = await fetch(`/api/zonas/${zonaSeleccionada}/pilonas/${pilonaId}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error ${response.status}`);
    }
    
    mostrarMensajeExito('Pilona eliminada de la zona correctamente');
    
    // Recargar datos
    await cargarPilonasDeZona(zonaSeleccionada);
    await cargarPilonasDisponiblesParaZona(zonaSeleccionada);
    
  } catch (error) {
    console.error('Error eliminando pilona de zona:', error);
    mostrarMensajeError('Error al eliminar pilona de zona: ' + error.message);
  } finally {
    mostrarCargando(false);
  }
}

// ================================================================================
// UTILIDADES
// ================================================================================

function mostrarConfirmacion(titulo, mensaje) {
  return new Promise((resolve) => {
    if (confirm(`${titulo}\\n\\n${mensaje}`)) {
      resolve(true);
    } else {
      resolve(false);
    }
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

// ================================================================================
// EXPOSICIÓN GLOBAL DE FUNCIONES
// ================================================================================

// Exponer funciones para uso global
window.initGestionZonas = initGestionZonas;
window.cargarZonas = cargarZonas;
window.eliminarPilonaDeZona = eliminarPilonaDeZona;

// Exponer funciones con los nombres esperados en el HTML
window.gestionarPilonasZona = mostrarPilonasDeZona;
window.editarZona = editarZona;
window.eliminarZona = eliminarZona;

// También exponer con nombres alternativos para evitar conflictos
window.mostrarPilonasDeZona = mostrarPilonasDeZona;
window.editarZonaGestion = editarZona;
window.eliminarZonaGestion = eliminarZona;

console.log('Módulo gestión-zonas.js cargado correctamente');
