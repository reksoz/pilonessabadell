// calendario-ui.js - Interfaz de usuario para el calendario
let calendarioActual = {
  año: new Date().getFullYear(),
  mes: new Date().getMonth(),
  festivos: [],
  programaciones: []
};

// Inicializar el calendario cuando se carga la página
function initCalendario() {
  console.log('=== INICIANDO CALENDARIO ===');
  
  // Usar la variable usuario global que ya está definida en main.js
  const usuarioActual = window.usuario || window.usuarioActual;
  
  if (!usuarioActual) {
    console.error('No hay usuario en sesión');
    return;
  }
  
  const rolUsuario = (usuarioActual.ROL || usuarioActual.rol || '').toLowerCase();
  console.log('Rol del usuario:', rolUsuario);
  
  if (rolUsuario !== 'administrador') {
    console.error('Usuario no autorizado para ver el calendario');
    return;
  }
  
  // Asegurar que window.usuarioActual esté definido para compatibilidad
  window.usuarioActual = usuarioActual;
  
  console.log('Inicializando calendario para usuario:', usuarioActual.NOMBRE || usuarioActual.nombre);
  
  // Cargar datos iniciales
  Promise.all([cargarFestivos(), cargarProgramaciones()]).then(() => {
    console.log('Datos cargados, renderizando calendario...');
    renderizarCalendario();
  }).catch(error => {
    console.error('Error cargando datos del calendario:', error);
  });
  
  // Event listeners con verificación de existencia
  const btnMesAnterior = document.getElementById('btn-mes-anterior');
  const btnMesSiguiente = document.getElementById('btn-mes-siguiente');
  const btnNuevoFestivo = document.getElementById('btn-nuevo-festivo');
  const btnNuevaProgramacion = document.getElementById('btn-nueva-programacion');
  
  if (btnMesAnterior) btnMesAnterior.addEventListener('click', mesAnterior);
  if (btnMesSiguiente) btnMesSiguiente.addEventListener('click', mesSiguiente);
  if (btnNuevoFestivo) btnNuevoFestivo.addEventListener('click', () => mostrarModalFestivo());
  if (btnNuevaProgramacion) btnNuevaProgramacion.addEventListener('click', () => mostrarModalProgramacion());
  
  // Formularios con verificación de existencia
  const formFestivo = document.getElementById('form-festivo');
  const formProgramacion = document.getElementById('form-programacion');
  
  if (formFestivo) formFestivo.addEventListener('submit', guardarFestivo);
  if (formProgramacion) formProgramacion.addEventListener('submit', guardarProgramacion);
  
  // Cambios en el tipo de programación con verificación
  const selectTipoProgramacion = document.getElementById('programacion-tipo');
  if (selectTipoProgramacion) {
    selectTipoProgramacion.addEventListener('change', function() {
      actualizarCamposProgramacion(this.value);
    });
  }
  
  // Botón de ejecución manual - lo eliminamos porque no existe en el HTML
  // document.getElementById('btn-ejecutar-manual').addEventListener('click', ejecutarProgramacionManual);
  
  // Event listener para filtro de límite de logs
  const filtroLimiteLogs = document.getElementById('filtro-limite-logs');
  if (filtroLimiteLogs) {
    filtroLimiteLogs.addEventListener('change', filtrarLogsProgramacion);
  }
  
  // Configurar delegación de eventos para las tablas
  configurarDelegacionEventos();
}

// Renderizar el calendario
function renderizarCalendario() {
  const año = calendarioActual.año;
  const mes = calendarioActual.mes;
  
  // Actualizar título
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  document.getElementById('calendario-mes-año').textContent = `${meses[mes]} ${año}`;
  
  // Obtener primer día y días del mes
  const primerDia = new Date(año, mes, 1).getDay();
  const diasEnMes = new Date(año, mes + 1, 0).getDate();
  
  // Limpiar calendario
  const tbody = document.getElementById('calendario-dias');
  tbody.innerHTML = '';
  
  let dia = 1;
  
  // Generar semanas
  for (let semana = 0; semana < 6; semana++) {
    if (dia > diasEnMes) break;
    
    const tr = document.createElement('tr');
    
    // Generar días
    for (let diaSemana = 0; diaSemana < 7; diaSemana++) {
      const td = document.createElement('td');
      td.className = 'calendario-dia';
      
      if (semana === 0 && diaSemana < primerDia || dia > diasEnMes) {
        // Días vacíos
        td.classList.add('dia-vacio');
      } else {
        // Día con contenido
        const fecha = `${año}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
        td.dataset.fecha = fecha;
        
        // Número del día
        const numeroDia = document.createElement('div');
        numeroDia.className = 'numero-dia';
        numeroDia.textContent = dia;
        td.appendChild(numeroDia);
        
        // Verificar si es hoy
        const hoy = new Date();
        if (año === hoy.getFullYear() && mes === hoy.getMonth() && dia === hoy.getDate()) {
          td.classList.add('dia-hoy');
        }
        
        // Verificar si es festivo
        const festivo = calendarioActual.festivos.find(f => f.FECHA === fecha);
        if (festivo) {
          td.classList.add('dia-festivo');
          const festivoDiv = document.createElement('div');
          festivoDiv.className = 'festivo-nombre';
          festivoDiv.textContent = festivo.NOMBRE;
          festivoDiv.title = festivo.DESCRIPCION || festivo.NOMBRE;
          td.appendChild(festivoDiv);
        }
        
        // Verificar programaciones para este día
        const programacionesDelDia = obtenerProgramacionesDelDia(fecha);
        if (programacionesDelDia.length > 0) {
          const programacionesDiv = document.createElement('div');
          programacionesDiv.className = 'programaciones-dia';
          
          programacionesDelDia.forEach(prog => {
            const progDiv = document.createElement('div');
            progDiv.className = `programacion-item programacion-${prog.ACCION}`;
            progDiv.textContent = `${prog.HORA_INICIO} - ${prog.NOMBRE}`;
            progDiv.title = `${prog.NOMBRE} (${prog.ACCION})`;
            programacionesDiv.appendChild(progDiv);
          });
          
          td.appendChild(programacionesDiv);
        }
        
        // Click handler
        td.addEventListener('click', () => mostrarDetallesDia(fecha));
        
        dia++;
      }
      
      tr.appendChild(td);
    }
    
    tbody.appendChild(tr);
  }
}

// Obtener programaciones para un día específico
function obtenerProgramacionesDelDia(fecha) {
  const fechaObj = new Date(fecha);
  const diaSemana = fechaObj.getDay();
  
  return calendarioActual.programaciones.filter(prog => {
    if (!prog.ACTIVA) return false;
    
    // Verificar excepciones
    if (prog.excepciones && prog.excepciones.includes(fecha)) {
      return false;
    }
    
    switch (prog.TIPO) {
      case 'diaria':
        return true;
        
      case 'semanal':
        return prog.diasSemana && prog.diasSemana.includes(diaSemana);
        
      case 'fecha_especifica':
        return prog.fechas && prog.fechas.includes(fecha);
        
      case 'festivos':
        return calendarioActual.festivos.some(f => f.FECHA === fecha);
        
      default:
        return false;
    }
  });
}

// Navegar al mes anterior
function mesAnterior() {
  calendarioActual.mes--;
  if (calendarioActual.mes < 0) {
    calendarioActual.mes = 11;
    calendarioActual.año--;
  }
  cargarFestivos();
  renderizarCalendario();
}

// Navegar al mes siguiente
function mesSiguiente() {
  calendarioActual.mes++;
  if (calendarioActual.mes > 11) {
    calendarioActual.mes = 0;
    calendarioActual.año++;
  }
  cargarFestivos();
  renderizarCalendario();
}

// Cargar festivos del año actual
async function cargarFestivos() {
  try {
    const response = await fetch(`/api/calendario/festivos?año=${calendarioActual.año}`, {
      credentials: 'include'
    });
    if (response.ok) {
      calendarioActual.festivos = await response.json();
      actualizarTablaFestivos();
    }
  } catch (error) {
    console.error('Error cargando festivos:', error);
  }
}

// Actualizar tabla de festivos
function actualizarTablaFestivos() {
  console.log('Actualizando tabla de festivos...');
  const tbody = document.getElementById('tabla-festivos');
  if (!tbody) {
    console.error('Elemento tabla-festivos no encontrado');
    return;
  }
  tbody.innerHTML = '';
  
  calendarioActual.festivos
    .sort((a, b) => a.FECHA.localeCompare(b.FECHA))
    .forEach(festivo => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${formatearFecha(festivo.FECHA)}</td>
        <td>${festivo.NOMBRE}</td>
        <td><span class="badge bg-${festivo.TIPO === 'nacional' ? 'primary' : 'secondary'}">${festivo.TIPO}</span></td>
        <td>${festivo.DESCRIPCION || ''}</td>
        <td>
          <button class="btn btn-sm btn-primary btn-editar-festivo" data-id="${festivo.ID}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger btn-eliminar-festivo" data-id="${festivo.ID}">
            <i class="fas fa-trash"></i>
          </button>
        </td>
      `;
      tbody.appendChild(tr);
    });
}

// Cargar programaciones
async function cargarProgramaciones() {
  try {
    const response = await fetch('/api/calendario/programaciones', {
      credentials: 'include'
    });
    if (response.ok) {
      calendarioActual.programaciones = await response.json();
      actualizarTablaProgramaciones();
      renderizarCalendario(); // Re-renderizar para mostrar programaciones
    }
  } catch (error) {
    console.error('Error cargando programaciones:', error);
  }
}

// Actualizar tabla de programaciones
function actualizarTablaProgramaciones() {
  console.log('Actualizando tabla de programaciones...');
  const tbody = document.getElementById('tabla-programaciones');
  if (!tbody) {
    console.error('Elemento tabla-programaciones no encontrado');
    return;
  }
  tbody.innerHTML = '';
  
  calendarioActual.programaciones.forEach(prog => {
    const tr = document.createElement('tr');
    
    let tipoTexto = '';
    switch (prog.TIPO) {
      case 'diaria': tipoTexto = 'Diaria'; break;
      case 'semanal': tipoTexto = 'Semanal'; break;
      case 'fecha_especifica': tipoTexto = 'Fechas específicas'; break;
      case 'festivos': tipoTexto = 'Días festivos'; break;
    }
    
    let detalles = '';
    if (prog.TIPO === 'semanal' && prog.diasSemana) {
      const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      detalles = prog.diasSemana.map(d => dias[d]).join(', ');
    }
    
    tr.innerHTML = `
      <td>${prog.NOMBRE}</td>
      <td>${tipoTexto}</td>
      <td>${prog.HORA_INICIO}${prog.HORA_FIN ? ' - ' + prog.HORA_FIN : ''}</td>
      <td><span class="badge bg-${getColorAccion(prog.ACCION)}">${formatearAccion(prog.ACCION)}</span></td>
      <td>${detalles}</td>
      <td>
        <div class="form-check form-switch">
          <input class="form-check-input switch-programacion" type="checkbox" ${prog.ACTIVA ? 'checked' : ''} 
                 data-id="${prog.ID}">
        </div>
      </td>
      <td>
        <button class="btn btn-sm btn-info btn-ejecutar-programacion" data-id="${prog.ID}" title="Ejecutar ahora">
          <i class="fas fa-play"></i>
        </button>
        <button class="btn btn-sm btn-primary btn-editar-programacion" data-id="${prog.ID}">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger btn-eliminar-programacion" data-id="${prog.ID}">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Mostrar modal de festivo
function mostrarModalFestivo(festivo = null) {
  console.log('Mostrando modal de festivo...');
  
  const modalElement = document.getElementById('modal-festivo');
  if (!modalElement) {
    console.error('Elemento modal-festivo no encontrado');
    return;
  }
  
  let modal;
  try {
    modal = new bootstrap.Modal(modalElement);
  } catch (error) {
    console.error('Error creando modal de Bootstrap:', error);
    return;
  }
  
  if (festivo) {
    document.getElementById('modal-festivo-titulo').textContent = 'Editar Festivo';
    document.getElementById('festivo-id').value = festivo.ID;
    document.getElementById('festivo-fecha').value = festivo.FECHA;
    document.getElementById('festivo-nombre').value = festivo.NOMBRE;
    document.getElementById('festivo-tipo').value = festivo.TIPO;
    document.getElementById('festivo-descripcion').value = festivo.DESCRIPCION || '';
  } else {
    document.getElementById('modal-festivo-titulo').textContent = 'Nuevo Festivo';
    document.getElementById('form-festivo').reset();
    document.getElementById('festivo-id').value = '';
  }
  
  modal.show();
}

// Guardar festivo
async function guardarFestivo(event) {
  event.preventDefault();
  
  const id = document.getElementById('festivo-id').value;
  const data = {
    fecha: document.getElementById('festivo-fecha').value,
    nombre: document.getElementById('festivo-nombre').value,
    tipo: document.getElementById('festivo-tipo').value,
    descripcion: document.getElementById('festivo-descripcion').value
  };
  
  try {
    const url = id ? `/api/calendario/festivos/${id}` : '/api/calendario/festivos';
    const method = id ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    
    if (response.ok) {
      // Obtener instancia del modal y ocultarlo correctamente
      const modalElement = document.getElementById('modal-festivo');
      const modalInstance = bootstrap.Modal.getInstance(modalElement);
      if (modalInstance) {
        modalInstance.hide();
      }
      
      // Limpiar cualquier backdrop residual
      setTimeout(() => {
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('padding-right');
        document.body.style.overflow = '';
      }, 300);
      
      await cargarFestivos();
      renderizarCalendario();
      mostrarAlerta('Festivo guardado correctamente', 'success');
    } else {
      const error = await response.json();
      mostrarAlerta(error.error || 'Error al guardar festivo', 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarAlerta('Error al guardar festivo', 'danger');
  }
}

// Editar festivo
async function editarFestivo(id) {
  console.log('Editando festivo con ID:', id);
  const festivo = calendarioActual.festivos.find(f => f.ID === id);
  if (festivo) {
    console.log('Festivo encontrado:', festivo);
    mostrarModalFestivo(festivo);
  } else {
    console.error('No se encontró el festivo con ID:', id);
    console.log('Festivos disponibles:', calendarioActual.festivos);
  }
}

// Eliminar festivo
async function eliminarFestivo(id) {
  console.log('Eliminando festivo con ID:', id);
  if (!confirm('¿Estás seguro de eliminar este festivo?')) return;
  
  try {
    const response = await fetch(`/api/calendario/festivos/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (response.ok) {
      await cargarFestivos();
      renderizarCalendario();
      mostrarAlerta('Festivo eliminado correctamente', 'success');
    } else {
      mostrarAlerta('Error al eliminar festivo', 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarAlerta('Error al eliminar festivo', 'danger');
  }
}

// Mostrar modal de programación
async function mostrarModalProgramacion(programacion = null) {
  console.log('Mostrando modal de programación...');
  
  const modalElement = document.getElementById('modal-programacion');
  if (!modalElement) {
    console.error('Elemento modal-programacion no encontrado');
    return;
  }
  
  let modal;
  try {
    modal = new bootstrap.Modal(modalElement);
  } catch (error) {
    console.error('Error creando modal de Bootstrap:', error);
    return;
  }
  
  // Cargar pilonas y zonas disponibles
  await cargarPilonasDisponibles();
  await cargarZonasDisponibles();
  
  if (programacion) {
    document.getElementById('modal-programacion-titulo').textContent = 'Editar Programación';
    document.getElementById('programacion-id').value = programacion.ID;
    document.getElementById('programacion-nombre').value = programacion.NOMBRE;
    document.getElementById('programacion-tipo').value = programacion.TIPO;
    document.getElementById('programacion-hora-inicio').value = programacion.HORA_INICIO;
    document.getElementById('programacion-hora-fin').value = programacion.HORA_FIN || '';
    document.getElementById('programacion-accion').value = programacion.ACCION;
    document.getElementById('programacion-prioridad').value = programacion.PRIORIDAD;
    document.getElementById('programacion-activa').checked = programacion.ACTIVA;
    
    // Seleccionar pilonas
    if (programacion.pilonas) {
      programacion.pilonas.forEach(pilonaId => {
        const checkbox = document.querySelector(`#programacion-pilonas input[value="${pilonaId}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }
    
    // Seleccionar zonas
    if (programacion.zonas) {
      programacion.zonas.forEach(zonaId => {
        const checkbox = document.querySelector(`#programacion-zonas input[value="${zonaId}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }
    
    // Actualizar campos según el tipo
    actualizarCamposProgramacion(programacion.TIPO);
    
    // Cargar datos específicos del tipo
    if (programacion.TIPO === 'semanal' && programacion.diasSemana) {
      programacion.diasSemana.forEach(dia => {
        const checkbox = document.querySelector(`#dias-semana input[value="${dia}"]`);
        if (checkbox) checkbox.checked = true;
      });
    } else if (programacion.TIPO === 'fecha_especifica' && programacion.fechas) {
      document.getElementById('fechas-especificas').value = programacion.fechas.join('\n');
    }
    
    if (programacion.excepciones && programacion.excepciones.length > 0) {
      document.getElementById('fechas-excepcion').value = programacion.excepciones.join('\n');
    }
  } else {
    document.getElementById('modal-programacion-titulo').textContent = 'Nueva Programación';
    document.getElementById('form-programacion').reset();
    document.getElementById('programacion-id').value = '';
    actualizarCamposProgramacion('diaria');
  }
  
  modal.show();
}

// Actualizar campos según el tipo de programación
function actualizarCamposProgramacion(tipo) {
  // Ocultar todos los campos específicos
  document.getElementById('campo-dias-semana').style.display = 'none';
  document.getElementById('campo-fechas-especificas').style.display = 'none';
  
  // Mostrar campos según el tipo
  switch (tipo) {
    case 'semanal':
      document.getElementById('campo-dias-semana').style.display = 'block';
      break;
    case 'fecha_especifica':
      document.getElementById('campo-fechas-especificas').style.display = 'block';
      break;
  }
}

// Cargar pilonas disponibles
async function cargarPilonasDisponibles() {
  try {
    const response = await fetch('/api/pilonas/todas', {
      credentials: 'include'
    });
    if (response.ok) {
      const pilonas = await response.json();
      const container = document.getElementById('programacion-pilonas');
      container.innerHTML = '';
      
      pilonas.forEach(pilona => {
        const div = document.createElement('div');
        div.className = 'form-check';
        div.innerHTML = `
          <input class="form-check-input" type="checkbox" value="${pilona.ID}" id="pilona-${pilona.ID}">
          <label class="form-check-label" for="pilona-${pilona.ID}">
            ${pilona.NOMBRE} (${pilona.DIRECCION_IP})
          </label>
        `;
        container.appendChild(div);
      });
    }
  } catch (error) {
    console.error('Error cargando pilonas:', error);
  }
}

// Cargar zonas disponibles
async function cargarZonasDisponibles() {
  try {
    const response = await fetch('/api/zonas', {
      credentials: 'include'
    });
    if (response.ok) {
      const zonas = await response.json();
      const container = document.getElementById('programacion-zonas');
      container.innerHTML = '';
      
      zonas.forEach(zona => {
        const div = document.createElement('div');
        div.className = 'form-check';
        div.innerHTML = `
          <input class="form-check-input" type="checkbox" value="${zona.ID}" id="zona-${zona.ID}">
          <label class="form-check-label" for="zona-${zona.ID}">
            ${zona.NOMBRE}
          </label>
        `;
        container.appendChild(div);
      });
    }
  } catch (error) {
    console.error('Error cargando zonas:', error);
  }
}

// Guardar programación
async function guardarProgramacion(event) {
  event.preventDefault();
  
  const id = document.getElementById('programacion-id').value;
  const tipo = document.getElementById('programacion-tipo').value;
  
  // Recopilar pilonas seleccionadas
  const pilonas = Array.from(document.querySelectorAll('#programacion-pilonas input:checked'))
    .map(cb => parseInt(cb.value));
  
  // Recopilar zonas seleccionadas
  const zonas = Array.from(document.querySelectorAll('#programacion-zonas input:checked'))
    .map(cb => parseInt(cb.value));
  
  const data = {
    nombre: document.getElementById('programacion-nombre').value,
    tipo: tipo,
    horaInicio: document.getElementById('programacion-hora-inicio').value,
    horaFin: document.getElementById('programacion-hora-fin').value || null,
    accion: document.getElementById('programacion-accion').value,
    activa: document.getElementById('programacion-activa').checked,
    prioridad: parseInt(document.getElementById('programacion-prioridad').value) || 0,
    pilonas: pilonas,
    zonas: zonas
  };
  
  // Datos específicos del tipo
  if (tipo === 'semanal') {
    data.diasSemana = Array.from(document.querySelectorAll('#dias-semana input:checked'))
      .map(cb => parseInt(cb.value));
  } else if (tipo === 'fecha_especifica') {
    const fechasTexto = document.getElementById('fechas-especificas').value;
    data.fechas = fechasTexto.split('\n').filter(f => f.trim());
  }
  
  // Excepciones
  const excepcionesTexto = document.getElementById('fechas-excepcion').value;
  if (excepcionesTexto) {
    data.excepciones = excepcionesTexto.split('\n').filter(f => f.trim());
  }
  
  try {
    const url = id ? `/api/calendario/programaciones/${id}` : '/api/calendario/programaciones';
    const method = id ? 'PUT' : 'POST';
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include'
    });
    
    if (response.ok) {
      // Obtener instancia del modal y ocultarlo correctamente
      const modalElement = document.getElementById('modal-programacion');
      const modalInstance = bootstrap.Modal.getInstance(modalElement);
      if (modalInstance) {
        modalInstance.hide();
      }
      
      // Limpiar cualquier backdrop residual
      setTimeout(() => {
        const backdrops = document.querySelectorAll('.modal-backdrop');
        backdrops.forEach(backdrop => backdrop.remove());
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('padding-right');
        document.body.style.overflow = '';
      }, 300);
      
      await cargarProgramaciones();
      mostrarAlerta('Programación guardada correctamente', 'success');
    } else {
      const error = await response.json();
      mostrarAlerta(error.error || 'Error al guardar programación', 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarAlerta('Error al guardar programación', 'danger');
  }
}

// Editar programación
async function editarProgramacion(id) {
  console.log('Editando programación con ID:', id);
  const programacion = calendarioActual.programaciones.find(p => p.ID === id);
  if (programacion) {
    console.log('Programación encontrada:', programacion);
    mostrarModalProgramacion(programacion);
  } else {
    console.error('No se encontró la programación con ID:', id);
    console.log('Programaciones disponibles:', calendarioActual.programaciones);
  }
}

// Eliminar programación
async function eliminarProgramacion(id) {
  console.log('Eliminando programación con ID:', id);
  if (!confirm('¿Estás seguro de eliminar esta programación?')) return;
  
  try {
    const response = await fetch(`/api/calendario/programaciones/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    });
    
    if (response.ok) {
      await cargarProgramaciones();
      mostrarAlerta('Programación eliminada correctamente', 'success');
    } else {
      mostrarAlerta('Error al eliminar programación', 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarAlerta('Error al eliminar programación', 'danger');
  }
}

// Toggle activar/desactivar programación
async function toggleProgramacion(id, activa) {
  console.log(`Cambiando estado de programación ${id} a ${activa ? 'activa' : 'inactiva'}`);
  try {
    const response = await fetch(`/api/calendario/programaciones/${id}/toggle`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activa }),
      credentials: 'include'
    });
    
    if (response.ok) {
      mostrarAlerta(`Programación ${activa ? 'activada' : 'desactivada'}`, 'success');
    } else {
      mostrarAlerta('Error al cambiar estado de programación', 'danger');
      // Revertir el cambio en la UI
      await cargarProgramaciones();
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarAlerta('Error al cambiar estado de programación', 'danger');
    await cargarProgramaciones();
  }
}

// Ejecutar programación manualmente
async function ejecutarProgramacionManual(id) {
  // Si no se pasa ID, intentar obtenerlo del contexto
  if (!id && event && event.target) {
    const btn = event.target.closest('button');
    if (btn && btn.dataset.id) {
      id = btn.dataset.id;
    }
  }
  
  if (!id) {
    console.error('No se proporcionó ID de programación');
    mostrarAlerta('error', 'Error: ID de programación no válido');
    return;
  }
  
  if (!confirm('¿Ejecutar esta programación ahora?')) return;
  
  try {
    const response = await fetch(`/api/calendario/programaciones/${id}/ejecutar`, {
      method: 'POST',
      credentials: 'include'
    });
    
    if (response.ok) {
      mostrarAlerta('Programación ejecutada correctamente', 'success');
    } else {
      mostrarAlerta('Error al ejecutar programación', 'danger');
    }
  } catch (error) {
    console.error('Error:', error);
    mostrarAlerta('Error al ejecutar programación', 'danger');
  }
}

// Mostrar detalles de un día
function mostrarDetallesDia(fecha) {
  const modal = new bootstrap.Modal(document.getElementById('modal-dia-detalle'));
  
  // Formatear fecha
  const fechaObj = new Date(fecha + 'T00:00:00');
  const opciones = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  document.getElementById('dia-detalle-fecha').textContent = fechaObj.toLocaleDateString('es-ES', opciones);
  
  // Buscar festivo
  const festivo = calendarioActual.festivos.find(f => f.FECHA === fecha);
  const festivoDiv = document.getElementById('dia-detalle-festivo');
  if (festivo) {
    festivoDiv.innerHTML = `
      <div class="alert alert-info">
        <h6><i class="fas fa-calendar-day me-2"></i>Día Festivo</h6>
        <p class="mb-0"><strong>${festivo.NOMBRE}</strong></p>
        ${festivo.DESCRIPCION ? `<small>${festivo.DESCRIPCION}</small>` : ''}
      </div>
    `;
  } else {
    festivoDiv.innerHTML = '';
  }
  
  // Buscar programaciones
  const programaciones = obtenerProgramacionesDelDia(fecha);
  const programacionesDiv = document.getElementById('dia-detalle-programaciones');
  
  if (programaciones.length > 0) {
    let html = '<h6><i class="fas fa-clock me-2"></i>Programaciones del día</h6>';
    html += '<ul class="list-group">';
    
    programaciones.forEach(prog => {
      html += `
        <li class="list-group-item">
          <div class="d-flex justify-content-between align-items-center">
            <div>
              <strong>${prog.NOMBRE}</strong><br>
              <small>${prog.HORA_INICIO}${prog.HORA_FIN ? ' - ' + prog.HORA_FIN : ''}</small>
            </div>
            <span class="badge bg-${getColorAccion(prog.ACCION)}">${formatearAccion(prog.ACCION)}</span>
          </div>
        </li>
      `;
    });
    
    html += '</ul>';
    programacionesDiv.innerHTML = html;
  } else {
    programacionesDiv.innerHTML = '<p class="text-muted">No hay programaciones para este día</p>';
  }
  
  modal.show();
}

// Funciones auxiliares
function formatearFecha(fecha) {
  const [año, mes, dia] = fecha.split('-');
  return `${dia}/${mes}/${año}`;
}

function getColorAccion(accion) {
  const colores = {
    'subir': 'danger',
    'bajar': 'success',
    'bloquear_arriba': 'warning',
    'bloquear_abajo': 'warning',
    'desbloquear': 'info'
  };
  return colores[accion] || 'secondary';
}

function formatearAccion(accion) {
  const acciones = {
    'subir': 'Subir',
    'bajar': 'Bajar',
    'bloquear_arriba': 'Bloquear Arriba',
    'bloquear_abajo': 'Bloquear Abajo',
    'desbloquear': 'Desbloquear'
  };
  return acciones[accion] || accion;
}

function mostrarAlerta(mensaje, tipo = 'info') {
  // Intentar usar la función mostrarAlerta global si existe
  if (typeof window.mostrarAlerta === 'function' && window.mostrarAlerta !== mostrarAlerta) {
    window.mostrarAlerta(tipo === 'success' ? 'success' : tipo === 'danger' ? 'error' : 'info', mensaje);
    return;
  }
  
  const alertasContainer = document.getElementById('alertas-container') || document.body;
  const alerta = document.createElement('div');
  alerta.className = `alert alert-${tipo} alert-dismissible fade show position-fixed top-0 end-0 m-3`;
  alerta.style.zIndex = '9999';
  alerta.innerHTML = `
    ${mensaje}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  alertasContainer.appendChild(alerta);
  
  setTimeout(() => {
    alerta.remove();
  }, 5000);
}

// Cargar logs de programación
async function cargarLogsProgramacion() {
  try {
    const response = await fetch('/api/calendario/programaciones/logs', {
      credentials: 'include'
    });
    if (response.ok) {
      const logs = await response.json();
      actualizarTablaLogs(logs);
    } else {
      console.error('Error cargando logs');
      mostrarAlerta('error', 'Error al cargar logs de programación');
    }
  } catch (error) {
    console.error('Error cargando logs:', error);
    mostrarAlerta('error', 'Error al cargar logs de programación');
  }
}

// Actualizar tabla de logs
function actualizarTablaLogs(logs) {
  const tbody = document.getElementById('tabla-logs-programacion');
  if (!tbody) {
    console.error('Tabla de logs no encontrada');
    return;
  }
  
  tbody.innerHTML = '';
  
  if (!logs || logs.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = '<td colspan="5" class="text-center text-muted">No hay logs de ejecución</td>';
    tbody.appendChild(tr);
    return;
  }
  
  logs.forEach(log => {
    const tr = document.createElement('tr');
    const fecha = new Date(log.FECHA_EJECUCION || log.fecha_ejecucion);
    const estado = log.ESTADO || log.estado || 'desconocido';
    
    let badgeClass = 'secondary';
    if (estado === 'ejecutado') badgeClass = 'success';
    else if (estado === 'error') badgeClass = 'danger';
    else if (estado === 'omitido') badgeClass = 'warning';
    
    tr.innerHTML = `
      <td>${fecha.toLocaleString('es-ES')}</td>
      <td>${log.PROGRAMACION_NOMBRE || '-'}</td>
      <td><span class="badge bg-${badgeClass}">${estado}</span></td>
      <td>${log.PILONAS_AFECTADAS || 0}</td>
      <td>${log.MENSAJE || '-'}</td>
    `;
    
    tbody.appendChild(tr);
  });
  
  // Actualizar selector de filtro de programaciones
  actualizarFiltroLogsProgramacion(logs);
}

// Actualizar filtro de programaciones en logs
function actualizarFiltroLogsProgramacion(logs) {
  const select = document.getElementById('filtro-programacion-log');
  if (!select) return;
  
  // Obtener programaciones únicas de los logs
  const programaciones = new Map();
  logs.forEach(log => {
    if (log.PROGRAMACION_ID && log.PROGRAMACION_NOMBRE) {
      programaciones.set(log.PROGRAMACION_ID, log.PROGRAMACION_NOMBRE);
    }
  });
  
  // Limpiar y llenar el select
  select.innerHTML = '<option value="">Todas las programaciones</option>';
  
  Array.from(programaciones.entries())
    .sort((a, b) => a[1].localeCompare(b[1]))
    .forEach(([id, nombre]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = nombre;
      select.appendChild(option);
    });
  
  // Event listener para filtrar
  select.removeEventListener('change', filtrarLogsProgramacion);
  select.addEventListener('change', filtrarLogsProgramacion);
}

// Filtrar logs por programación
async function filtrarLogsProgramacion() {
  const programacionId = document.getElementById('filtro-programacion-log')?.value || '';
  const limite = document.getElementById('filtro-limite-logs')?.value || '100';
  
  try {
    let url = '/api/calendario/programaciones/logs?';
    if (programacionId) url += `programacionId=${programacionId}&`;
    url += `limite=${limite}`;
    
    const response = await fetch(url, {
      credentials: 'include'
    });
    if (response.ok) {
      const logs = await response.json();
      actualizarTablaLogs(logs);
    }
  } catch (error) {
    console.error('Error filtrando logs:', error);
    mostrarAlerta('error', 'Error al filtrar logs');
  }
}

// Exportar funciones para uso global
window.calendarioUI = {
  init: initCalendario,
  editarFestivo,
  eliminarFestivo,
  editarProgramacion,
  eliminarProgramacion,
  toggleProgramacion,
  ejecutarProgramacionManual,
  cargarLogsProgramacion
};

// Configurar delegación de eventos para manejar clicks en elementos dinámicos
function configurarDelegacionEventos() {
  console.log('Configurando delegación de eventos...');
  
  // Usar el contenedor padre para evitar problemas con elementos dinámicos
  const calendarioContainer = document.getElementById('page-calendario');
  if (!calendarioContainer) {
    console.error('Contenedor de calendario no encontrado');
    return;
  }
  
  // Event listener único para todos los clicks en el calendario
  calendarioContainer.addEventListener('click', function(e) {
    // Verificar si es un botón o un elemento dentro de un botón
    const btn = e.target.closest('button');
    if (!btn || !btn.dataset.id) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    const id = parseInt(btn.dataset.id);
    console.log('Click en botón:', btn.className, 'ID:', id);
    
    // Manejar festivos
    if (btn.classList.contains('btn-editar-festivo')) {
      console.log('Editando festivo ID:', id);
      editarFestivo(id);
    } else if (btn.classList.contains('btn-eliminar-festivo')) {
      console.log('Eliminando festivo ID:', id);
      eliminarFestivo(id);
    }
    // Manejar programaciones
    else if (btn.classList.contains('btn-ejecutar-programacion')) {
      console.log('Ejecutando programación ID:', id);
      ejecutarProgramacionManual(id);
    } else if (btn.classList.contains('btn-editar-programacion')) {
      console.log('Editando programación ID:', id);
      editarProgramacion(id);
    } else if (btn.classList.contains('btn-eliminar-programacion')) {
      console.log('Eliminando programación ID:', id);
      eliminarProgramacion(id);
    }
  });
  
  // Event listener para switches
  calendarioContainer.addEventListener('change', function(e) {
    if (e.target.classList.contains('switch-programacion')) {
      const id = parseInt(e.target.dataset.id);
      console.log('Toggle programación ID:', id, 'Estado:', e.target.checked);
      toggleProgramacion(id, e.target.checked);
    }
  });
}

// También exponer las funciones directamente en window para compatibilidad con onclick
window.editarFestivo = editarFestivo;
window.eliminarFestivo = eliminarFestivo;
window.editarProgramacion = editarProgramacion;
window.eliminarProgramacion = eliminarProgramacion;
window.toggleProgramacion = toggleProgramacion;
window.ejecutarProgramacionManual = ejecutarProgramacionManual;
