// zonas-usuario.js - Funcionalidades para gestionar zonas de usuario con campos adicionales de control de acceso
// Versión mejorada y corregida

// Variables globales para las zonas
let zonasUsuario = [];
let zonasDisponibles = [];
let usuarioSeleccionado = null;

// Ejecutar cuando el documento esté listo
document.addEventListener('DOMContentLoaded', function() {
  console.log('Inicializando módulo de gestión de zonas de usuario...');
  
  // Crear el modal de zonas de usuario
  crearModalZonasUsuario();
  
  // Actualizar estructura de usuario para datos adicionales
  actualizarEstructuraUsuario();
  
  // Integrar con sistema existente
  integrarConSistema();
  
  // Modificar la interfaz para añadir botones de zonas
  setTimeout(() => {
    agregarBotonesZonaEnTablaUsuarios();
  }, 1000);

  console.log('Módulo de gestión de zonas inicializado correctamente');
});

// Función para crear el modal de zonas usuario (asegurando que tiene todos los campos necesarios)
function crearModalZonasUsuario() {
  // Verificar si el modal ya existe
  if (document.getElementById('modal-zonas-usuario')) {
    console.log('Modal de zonas de usuario ya existe');
    return;
  }
  
  console.log('Creando modal de zonas de usuario...');
  
  const modalHtml = `
  <div class="modal fade" id="modal-zonas-usuario" tabindex="-1">
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header bg-primary text-white">
          <h5 class="modal-title" id="zonas-usuario-titulo">Zonas asignadas al usuario</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <!-- Información del usuario -->
          <div class="card mb-3">
            <div class="card-header bg-light">
              <h6 class="mb-0"><i class="fas fa-user me-2"></i>Información del usuario</h6>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-6">
                  <p><strong>Nombre:</strong> <span id="zonas-usuario-nombre"></span></p>
                  <p><strong>Email:</strong> <span id="zonas-usuario-email"></span></p>
                  <p><strong>DNI/NIE:</strong> <span id="zonas-usuario-dni"></span></p>
                </div>
                <div class="col-md-6">
                  <p><strong>Rol:</strong> <span id="zonas-usuario-rol"></span></p>
                  <p><strong>Matrícula:</strong> <span id="zonas-usuario-matricula"></span></p>
                  <p><strong>Estado:</strong> <span id="zonas-usuario-estado"></span></p>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Zonas asignadas -->
          <div class="card mb-4">
            <div class="card-header bg-light">
              <div class="d-flex justify-content-between align-items-center">
                <h6 class="mb-0"><i class="fas fa-map-marked-alt me-2"></i>Zonas asignadas</h6>
                <span class="badge bg-primary" id="contador-zonas">0 zonas</span>
              </div>
            </div>
            <div class="card-body">
              <div class="table-responsive">
                <table class="table table-hover">
                  <thead class="table-light">
                    <tr>
                      <th>ID</th>
                      <th>Nombre</th>
                      <th>Descripción</th>
                      <th>Permisos</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody id="tabla-zonas-usuario">
                    <!-- Se llenará con JavaScript -->
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <!-- Asignar nueva zona -->
          <div class="card">
            <div class="card-header bg-light">
              <h6 class="mb-0"><i class="fas fa-plus-circle me-2"></i>Asignar nueva zona</h6>
            </div>
            <div class="card-body">
              <form id="form-asignar-zona" class="row g-3">
                <div class="col-md-6">
                  <label for="select-zonas-disponibles" class="form-label">Zona</label>
                  <select class="form-select" id="select-zonas-disponibles" required>
                    <option value="">Seleccionar zona...</option>
                    <!-- Se llenará con JavaScript -->
                  </select>
                </div>
                <div class="col-md-4">
                  <label for="select-permisos-zona" class="form-label">Permisos</label>
                  <select class="form-select" id="select-permisos-zona" required>
                    <option value="bajar">Solo bajar</option>
                    <option value="subir,bajar">Subir y bajar</option>
                    <option value="completo">Control completo</option>
                  </select>
                </div>
                <div class="col-md-2 d-flex align-items-end">
                  <button type="submit" class="btn btn-primary w-100" id="btn-asignar-zona">
                    <i class="fas fa-plus me-1"></i> Asignar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
        </div>
      </div>
    </div>
  </div>
  `;
  
  // Crear un div para contener el modal y añadirlo al body
  const modalContainer = document.createElement('div');
  modalContainer.innerHTML = modalHtml;
  document.body.appendChild(modalContainer.firstElementChild);
  
  console.log('Modal de zonas de usuario creado correctamente');
  
  // Añadir event listener al formulario de asignar zona
  document.getElementById('form-asignar-zona')?.addEventListener('submit', function(e) {
    e.preventDefault();
    asignarZonaUsuario();
  });
}

// Función para actualizar la estructura del usuario con campos adicionales para control de acceso
function actualizarEstructuraUsuario() {
  console.log('Actualizando estructura de usuario con campos adicionales...');
  
  // Verificar si se debe modificar el modal de usuario para añadir campos
  if (document.getElementById('modal-usuario') && !document.getElementById('usuario-dni')) {
    console.log('Añadiendo campos adicionales al modal de usuario...');
    
    // Obtener el formulario de usuario
    const formUsuario = document.getElementById('form-usuario');
    if (!formUsuario) {
      console.error('No se encontró el formulario de usuario');
      return;
    }
    
    // Encontrar la última fila del formulario
    const ultimaFila = formUsuario.querySelector('.form-check').closest('.mb-3');
    
    // Crear contenedor para nuevos campos
    const nuevaSeccion = document.createElement('div');
    nuevaSeccion.className = 'border-top pt-3 mt-3';
    nuevaSeccion.innerHTML = `
      <h6 class="mb-3">Datos adicionales para control de acceso</h6>
      <div class="row mb-3">
        <div class="col-md-6">
          <label for="usuario-dni" class="form-label">DNI/NIE</label>
          <input type="text" class="form-control" id="usuario-dni" placeholder="12345678A">
        </div>
        <div class="col-md-6">
          <label for="usuario-telefono" class="form-label">Teléfono</label>
          <input type="tel" class="form-control" id="usuario-telefono" placeholder="612345678">
        </div>
      </div>
      <div class="row mb-3">
        <div class="col-md-12">
          <label for="usuario-direccion" class="form-label">Dirección</label>
          <input type="text" class="form-control" id="usuario-direccion" placeholder="Calle, número, ciudad">
        </div>
      </div>
      <div class="row mb-3">
        <div class="col-md-6">
          <label for="usuario-matricula" class="form-label">Matrícula Vehículo</label>
          <input type="text" class="form-control" id="usuario-matricula" placeholder="1234ABC">
        </div>
        <div class="col-md-6">
          <label for="usuario-tipo-acceso" class="form-label">Tipo de Acceso</label>
          <select class="form-select" id="usuario-tipo-acceso">
            <option value="residente">Residente</option>
            <option value="comerciante">Comerciante</option>
            <option value="servicios">Servicios</option>
            <option value="temporal">Acceso Temporal</option>
          </select>
        </div>
      </div>
      <div class="row mb-3">
        <div class="col-md-6">
          <label for="usuario-comentarios" class="form-label">Comentarios</label>
          <textarea class="form-control" id="usuario-comentarios" rows="2"></textarea>
        </div>
        <div class="col-md-6">
          <label for="usuario-fecha-renovacion" class="form-label">Fecha Renovación Permiso</label>
          <input type="date" class="form-control" id="usuario-fecha-renovacion">
        </div>
      </div>
    `;
    
    // Insertar antes del último elemento del formulario
    formUsuario.insertBefore(nuevaSeccion, ultimaFila.nextSibling);
    
    console.log('Campos adicionales añadidos correctamente al formulario de usuario');
  } else {
    console.log('Los campos adicionales ya existen o no se encontró el modal de usuario');
  }
}

// Función para integrar con el sistema existente
function integrarConSistema() {
  console.log('Integrando módulo de zonas con el sistema existente...');
  
  // Guardar referencia a la función original mostrarModalUsuario si no se ha hecho ya
  if (typeof window.mostrarModalUsuarioOriginal === 'undefined' && typeof window.mostrarModalUsuario === 'function') {
    console.log('Configurando integración con mostrarModalUsuario...');
    
    window.mostrarModalUsuarioOriginal = window.mostrarModalUsuario;
    
    // Sobrescribir la función para añadir el botón de zonas
    window.mostrarModalUsuario = function(id = null) {
      // Llamar a la función original
      window.mostrarModalUsuarioOriginal(id);
      
      // Si estamos editando un usuario existente, añadir botón de zonas
      if (id) {
        setTimeout(() => {
          agregarBotonZonasUsuario();
        }, 300);
      }
    };
  }
  
  // Integrar con guardarUsuario de forma segura
  if (typeof window.guardarUsuarioOriginal === 'undefined' && typeof window.guardarUsuario === 'function') {
    console.log('Configurando integración con guardarUsuario...');
    
    // Guardar referencia a la función original o actual
    window.guardarUsuarioOriginal = window.guardarUsuario;
    
    // Reemplazar con versión que respeta la validación y añade los campos adicionales
    window.guardarUsuario = async function() {
      console.log('Ejecutando guardarUsuario mejorado desde zonas...');
      
      // Utilizar la validación del módulo de validación si está disponible
      if (window.formValidation && typeof window.formValidation.validarFormularioUsuario === 'function') {
        if (!window.formValidation.validarFormularioUsuario()) {
          return false;
        }
      } else if (typeof validarFormularioUsuario === 'function') {
        // Fallback a la función local si existe
        if (!validarFormularioUsuario()) {
          return false;
        }
      }
      
      // Obtener valores de los campos con validación adicional
      const idElement = document.getElementById('usuario-id');
      const nombreElement = document.getElementById('usuario-nombre');
      const emailElement = document.getElementById('usuario-email');
      const passwordElement = document.getElementById('usuario-password');
      const rolElement = document.getElementById('usuario-rol');
      const fechaInicioElement = document.getElementById('usuario-fecha-inicio');
      const fechaFinalElement = document.getElementById('usuario-fecha-final');
      const activoElement = document.getElementById('usuario-activo');
      
      // Verificar existencia de elementos críticos
      if (!nombreElement || !emailElement || !rolElement) {
        console.error('Elementos del formulario no encontrados');
        mostrarAlerta('error', 'Error en el formulario. Por favor, recargue la página.');
        return false;
      }
      
      // Obtener valores
      const id = idElement ? idElement.value : '';
      const nombre = nombreElement.value.trim();
      const email = emailElement.value.trim();
      const password = passwordElement ? passwordElement.value : '';
      const rol = rolElement.value;
      const fechaInicio = fechaInicioElement ? fechaInicioElement.value : '';
      const fechaFinal = fechaFinalElement ? fechaFinalElement.value : '';
      const activo = activoElement ? activoElement.checked : true;
      
      // Crear objeto base con campos en AMBOS formatos
      const usuario = {
        // Campos en mayúsculas (para el backend SQLite)
        NOMBRE: nombre,
        EMAIL: email,
        ROL: rol,
        FECHA_INICIO: fechaInicio,
        FECHA_FINAL: fechaFinal || null,
        ACTIVO: activo ? 1 : 0,
        
        // Campos en minúsculas (para compatibilidad)
        nombre: nombre,
        email: email,
        rol: rol,
        fechaInicio: fechaInicio,
        fechaFinal: fechaFinal || null,
        activo: activo
      };
      
      // Añadir contraseña solo si se proporciona
      if (password) {
        usuario.PASSWORD = password;
        usuario.password = password;
      }
      
      // Añadir campos adicionales del módulo de zonas si existen
      const tieneCamposAdicionales = !!document.getElementById('usuario-dni');
      if (tieneCamposAdicionales) {
        const campos = [
          'dni', 'telefono', 'direccion', 'matricula', 
          'tipoAcceso', 'comentarios', 'fechaRenovacion'
        ];
        
        campos.forEach(campo => {
          const element = document.getElementById(`usuario-${campo}`);
          if (element) {
            // Guardar en ambos formatos
            const valor = campo === 'fechaRenovacion' ? (element.value || null) : (element.value || '');
            usuario[campo] = valor;
            usuario[campo.toUpperCase()] = valor;
          }
        });
      }
      
      console.log('Datos completos de usuario a guardar:', usuario);
      mostrarCargando();
      
      try {
        const url = id ? `/api/usuarios/${id}` : '/api/usuarios';
        const method = id ? 'PUT' : 'POST';
        
        // Imprimir URL y método para depuración
        console.log(`Enviando petición ${method} a ${url}`);
        
        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(usuario),
          credentials: 'include'
        });
        
        // Controlar errores no JSON
        let data;
        try {
          data = await response.json();
        } catch (e) {
          console.error('Respuesta no es JSON válido:', e);
          throw new Error('El servidor respondió con un formato inválido');
        }
        
        if (response.ok) {
          console.log('Usuario guardado correctamente:', data);
          mostrarAlerta('success', data.mensaje || (id ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente'));
          
          // Cerrar modal
          const modalElement = document.getElementById('modal-usuario');
          if (modalElement) {
            const modal = bootstrap.Modal.getInstance(modalElement);
            if (modal) {
              modal.hide();
            }
          }
          
          // Recargar usuarios
          if (typeof obtenerUsuarios === 'function') {
            await obtenerUsuarios();
          }
          
          return true;
        } else {
          console.error('Error guardando usuario:', data);
          mostrarAlerta('error', data.error || 'Error al guardar el usuario');
          return false;
        }
      } catch (error) {
        console.error('Error en guardarUsuario:', error);
        mostrarAlerta('error', 'Error de conexión con el servidor: ' + error.message);
        return false;
      } finally {
        ocultarCargando();
      }
    };
    
    console.log('Función guardarUsuario integrada para asegurar compatibilidad');
  }
  
  // Actualizar la función obtenerUsuarios para mostrar los campos adicionales
  if (typeof window.actualizarTablaUsuariosOriginal === 'undefined' && typeof window.actualizarTablaUsuarios === 'function') {
    console.log('Configurando integración con actualizarTablaUsuarios...');
    
    window.actualizarTablaUsuariosOriginal = window.actualizarTablaUsuarios;
    
    // Sobrescribir la función para mostrar los campos adicionales
    window.actualizarTablaUsuarios = function(usuarios) {
      console.log('🟢 EJECUTANDO actualizarTablaUsuarios desde zonas-usuario.js');
      // Llamar a la función original primero
      window.actualizarTablaUsuariosOriginal(usuarios);
      
      // Añadir botones de gestión de zonas a la tabla
      setTimeout(() => {
        console.log('🟢 Agregando botones de zona a la tabla');
        agregarBotonesZonaEnTablaUsuarios();
      }, 100);
    };
  }
  
  // Mejorar la integración con el formulario de usuario
  const formUsuario = document.getElementById('form-usuario');
  if (formUsuario && !formUsuario.hasAttribute('data-zonas-attached')) {
    console.log('Configurando formulario de usuario para mejor integración...');
    
    // Marcar el formulario para evitar duplicación
    formUsuario.setAttribute('data-zonas-attached', 'true');
    
    // Agregar evento al formulario de usuario
    formUsuario.addEventListener('submit', function(e) {
      e.preventDefault();
      console.log('Formulario de usuario enviado, llamando a guardarUsuario()');
      window.guardarUsuario();
    });
  }
  
  console.log('Integración del módulo de zonas completada correctamente');
}

// Función para añadir botones de zonas a la tabla de usuarios
function agregarBotonesZonaEnTablaUsuarios() {
  console.log('Añadiendo botones de gestión de zonas a la tabla de usuarios...');
  
  // Buscar todas las filas de la tabla de usuarios
  const tablaUsuarios = document.getElementById('tabla-usuarios');
  if (!tablaUsuarios) {
    console.error('Tabla de usuarios no encontrada');
    return;
  }
  
  // Buscar todas las filas que tengan grupo de botones
  const filas = tablaUsuarios.querySelectorAll('tr');
  
  let botonesAgregados = 0;
  
  filas.forEach(fila => {
    // Obtener el ID del usuario de la primera celda (si existe)
    const idCell = fila.querySelector('td:first-child');
    if (!idCell) return; // Si no hay celda (como en el encabezado), saltar
    
    const usuarioId = idCell.textContent.trim();
    if (!usuarioId || isNaN(parseInt(usuarioId))) return; // Si no hay ID válido, saltar
    
    // Buscar la celda de acciones (última columna)
    const accionesCell = fila.querySelector('td:last-child');
    if (!accionesCell) return;
    
    // Buscar el grupo de botones existente
    const btnGroup = accionesCell.querySelector('.btn-group');
    if (!btnGroup) return;
    
    // Verificar si ya existe el botón de zonas
    if (btnGroup.querySelector('.btn-zonas-usuario')) return;
    
    // Arreglar el problema de duplicación de iconos
    // Verificar si hay botones con el mismo icono
    const btnMapa = btnGroup.querySelector('.fa-map-marker-alt');
    if (btnMapa) {
      btnMapa.closest('button').remove();
    }
    
// Añadir botón de zonas al grupo existente
    const btnZonas = document.createElement('button');
    btnZonas.className = 'btn btn-outline-info btn-zonas-usuario';
    btnZonas.title = 'Gestionar zonas';
    btnZonas.innerHTML = '<i class="fas fa-map-marker-alt"></i>';
    btnZonas.setAttribute('data-id', usuarioId);
    
    // Añadir evento de clic
    btnZonas.addEventListener('click', function(e) {
      e.preventDefault();
      const id = this.getAttribute('data-id');
      mostrarModalZonasUsuario(id);
    });
    
    btnGroup.appendChild(btnZonas);
    botonesAgregados++;
  });
  
  console.log(`Botones de gestión de zonas añadidos correctamente: ${botonesAgregados}`);
}

// Función para añadir botón de gestión de zonas al modal de edición de usuario
function agregarBotonZonasUsuario() {
  console.log('Añadiendo botón de gestión de zonas al modal de usuario...');
  
  // Obtener el id del usuario
  const usuarioId = document.getElementById('usuario-id')?.value;
  
  // Si no hay ID de usuario, es un nuevo usuario y no se puede gestionar zonas
  if (!usuarioId) {
    console.log('No hay ID de usuario, no se añade botón de zonas');
    return;
  }
  
  // Buscar el footer del modal
  const footerDiv = document.querySelector('#modal-usuario .modal-footer');
  if (!footerDiv) {
    console.error('Footer del modal no encontrado');
    return;
  }
  
  // Verificar si ya existe el botón
  if (document.getElementById('btn-gestionar-zonas')) {
    console.log('El botón de gestión de zonas ya existe');
    return;
  }
  
  // Crear botón
  const btnZonas = document.createElement('button');
  btnZonas.type = 'button';
  btnZonas.className = 'btn btn-info me-2';
  btnZonas.id = 'btn-gestionar-zonas';
  btnZonas.innerHTML = '<i class="fas fa-map-marker-alt me-1"></i> Gestionar Zonas';
  
  // Asignar evento al botón
  btnZonas.addEventListener('click', function() {
    // Cerrar modal de usuario
    const modalUsuario = bootstrap.Modal.getInstance(document.getElementById('modal-usuario'));
    if (modalUsuario) {
      modalUsuario.hide();
    }
    
    // Mostrar modal de zonas después de un breve retraso
    setTimeout(() => {
      mostrarModalZonasUsuario(usuarioId);
    }, 500);
  });
  
  // Insertar el botón antes del último botón (normalmente "Guardar")
  const ultimoBoton = footerDiv.querySelector('button:last-child');
  if (ultimoBoton) {
    footerDiv.insertBefore(btnZonas, ultimoBoton);
  } else {
    footerDiv.appendChild(btnZonas);
  }
  
  console.log('Botón de gestión de zonas añadido correctamente');
}

// Cargar zonas asignadas a un usuario (versión segura)
async function cargarZonasUsuario(usuarioId) {
  console.log(`Cargando zonas del usuario ID: ${usuarioId}...`);
  
  // Mostrar indicador de carga solo si existe la función
  if (typeof mostrarCargando === 'function') {
    mostrarCargando();
  }
  
  try {
    // Primero obtener los datos del usuario
    const responseUsuario = await fetch(`/api/usuarios/${usuarioId}`, {
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!responseUsuario.ok) {
      throw new Error(`Error al cargar datos del usuario: ${responseUsuario.status}`);
    }
    
    const dataUsuario = await responseUsuario.json();
    usuarioSeleccionado = dataUsuario;
    
    console.log('Datos del usuario cargados:', dataUsuario);
    
    // Actualizar interfaz de forma segura
    function actualizarElementoSiExiste(id, valor) {
      const elemento = document.getElementById(id);
      if (elemento) {
        elemento.textContent = valor;
      } else {
        console.warn(`Elemento ${id} no encontrado en el DOM`);
      }
    }
    
    // Actualizar elementos del modal con manejo seguro
    // Título del modal
    actualizarElementoSiExiste('zonas-usuario-titulo', 
      `Zonas asignadas a ${dataUsuario.NOMBRE || dataUsuario.nombre || 'Usuario'}`);
    
    // Información del usuario
    actualizarElementoSiExiste('zonas-usuario-nombre', 
      dataUsuario.NOMBRE || dataUsuario.nombre || '');
    actualizarElementoSiExiste('zonas-usuario-email', 
      dataUsuario.EMAIL || dataUsuario.email || '');
    actualizarElementoSiExiste('zonas-usuario-rol', 
      formatRol(dataUsuario.ROL || dataUsuario.rol || ''));
    actualizarElementoSiExiste('zonas-usuario-estado', 
      dataUsuario.ACTIVO || dataUsuario.activo ? 'Activo' : 'Inactivo');
    
    // Campos adicionales (que podrían no existir)
    actualizarElementoSiExiste('zonas-usuario-dni', 
      dataUsuario.DNI || dataUsuario.dni || 'No especificado');
    actualizarElementoSiExiste('zonas-usuario-matricula', 
      dataUsuario.MATRICULA || dataUsuario.matricula || 'No especificado');
    
    // Cargar zonas del usuario
    console.log('Obteniendo zonas asignadas al usuario...');
    const responseZonas = await fetch(`/api/usuarios/${usuarioId}/zonas`, {
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!responseZonas.ok) {
      throw new Error(`Error al cargar zonas del usuario: ${responseZonas.status}`);
    }
    
    const dataZonas = await responseZonas.json();
    console.log('Zonas del usuario obtenidas:', dataZonas);
    
    // Guardar zonas del usuario
    zonasUsuario = dataZonas.zonas || [];
    
    // Actualizar contador de zonas
    actualizarElementoSiExiste('contador-zonas', 
      `${zonasUsuario.length} zona${zonasUsuario.length !== 1 ? 's' : ''}`);
    
    // Actualizar tabla de zonas con manejo de errores
    try {
      actualizarTablaZonasUsuario();
    } catch (err) {
      console.error('Error actualizando tabla de zonas:', err);
    }
    
    // Cargar zonas disponibles con manejo de errores
    try {
      await cargarZonasDisponibles(usuarioId);
    } catch (err) {
      console.error('Error cargando zonas disponibles:', err);
    }
    
    return true;
  } catch (error) {
    console.error('Error en cargarZonasUsuario:', error);
    // Mostrar alerta solo si existe la función
    if (typeof mostrarAlerta === 'function') {
      mostrarAlerta('error', `Error al cargar las zonas: ${error.message}`);
    } else {
      alert(`Error al cargar las zonas: ${error.message}`);
    }
    return false;
  } finally {
    // Ocultar indicador de carga solo si existe la función
    if (typeof ocultarCargando === 'function') {
      ocultarCargando();
    }
  }
}

// Cargar zonas disponibles para asignar
async function cargarZonasDisponibles(usuarioId) {
  console.log(`Cargando zonas disponibles para usuario ID: ${usuarioId}...`);
  
  try {
    const response = await fetch(`/api/usuarios/${usuarioId}/zonas-disponibles`, {
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Zonas disponibles obtenidas:', data);
    
    zonasDisponibles = data || [];
    
    // Actualizar el select de zonas disponibles
    actualizarSelectZonasDisponibles();
    
    return true;
  } catch (error) {
    console.error('Error en cargarZonasDisponibles:', error);
    mostrarAlerta('error', `Error al cargar zonas disponibles: ${error.message}`);
    return false;
  }
}

// Actualizar tabla de zonas asignadas
function actualizarTablaZonasUsuario() {
  console.log('Actualizando tabla de zonas de usuario...');
  
  const tabla = document.getElementById('tabla-zonas-usuario');
  if (!tabla) {
    console.error('Tabla de zonas de usuario no encontrada');
    return;
  }
  
  // Limpiar tabla
  tabla.innerHTML = '';
  
  // Actualizar título del modal si hay usuario seleccionado
  const tituloElement = document.getElementById('zonas-usuario-titulo');
  if (tituloElement && usuarioSeleccionado) {
    tituloElement.textContent = `Zonas asignadas a ${usuarioSeleccionado.NOMBRE || usuarioSeleccionado.nombre || 'Usuario'}`;
  }
  
  // Verificar si hay zonas asignadas
  if (!zonasUsuario || zonasUsuario.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="5" class="text-center">Este usuario no tiene zonas asignadas</td>`;
    tabla.appendChild(tr);
    return;
  }
  
  // Agregar cada zona a la tabla
  zonasUsuario.forEach(zona => {
    const tr = document.createElement('tr');
    
    // Asegurar que tenemos un ID para la zona
    const zonaId = zona.ID || zona.id;
    
    tr.innerHTML = `
      <td>${zonaId}</td>
      <td>${zona.NOMBRE || zona.nombre || ''}</td>
      <td>${zona.DESCRIPCION || zona.descripcion || '-'}</td>
      <td>
        <select class="form-select form-select-sm permisos-zona" data-zona-id="${zonaId}">
          <option value="bajar" ${(zona.PERMISOS || zona.permisos) === 'bajar' ? 'selected' : ''}>Solo bajar</option>
          <option value="subir,bajar" ${(zona.PERMISOS || zona.permisos) === 'subir,bajar' ? 'selected' : ''}>Subir y bajar</option>
          <option value="completo" ${(zona.PERMISOS || zona.permisos) === 'completo' ? 'selected' : ''}>Control completo</option>
        </select>
      </td>
      <td>
        <button class="btn btn-sm btn-danger eliminar-zona" data-zona-id="${zonaId}">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    
    tabla.appendChild(tr);
  });
  
  // Añadir eventos para cambiar permisos
  document.querySelectorAll('.permisos-zona').forEach(select => {
    select.addEventListener('change', (e) => {
      const zonaId = e.target.getAttribute('data-zona-id');
      const permisos = e.target.value;
      actualizarPermisosZona(zonaId, permisos);
    });
  });
  
  // Añadir eventos para eliminar zona
  document.querySelectorAll('.eliminar-zona').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const zonaId = e.currentTarget.getAttribute('data-zona-id');
      eliminarZonaUsuario(zonaId);
    });
  });
  
  console.log('Tabla de zonas actualizada correctamente');
}

// Actualizar select de zonas disponibles
function actualizarSelectZonasDisponibles() {
  console.log('Actualizando select de zonas disponibles...');
  
  const select = document.getElementById('select-zonas-disponibles');
  if (!select) {
    console.error('Select de zonas disponibles no encontrado');
    return;
  }
  
  // Limpiar select
  select.innerHTML = '';
  
  // Opción por defecto
  const optionDefault = document.createElement('option');
  optionDefault.value = '';
  optionDefault.textContent = 'Seleccionar zona...';
  select.appendChild(optionDefault);
  
  // Verificar si hay zonas disponibles
  if (!zonasDisponibles || zonasDisponibles.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No hay zonas disponibles';
    option.disabled = true;
    select.appendChild(option);
    select.disabled = true;
    
    // Deshabilitar botón de asignar
    const btnAsignar = document.getElementById('btn-asignar-zona');
    if (btnAsignar) {
      btnAsignar.disabled = true;
    }
    
    console.log('No hay zonas disponibles para asignar');
    return;
  }
  
  // Habilitar select y botón
  select.disabled = false;
  const btnAsignar = document.getElementById('btn-asignar-zona');
  if (btnAsignar) {
    btnAsignar.disabled = false;
  }
  
  // Agregar cada zona al select
  zonasDisponibles.forEach(zona => {
    const option = document.createElement('option');
    option.value = zona.ID || zona.id;
    option.textContent = `${zona.NOMBRE || zona.nombre} ${zona.DESCRIPCION || zona.descripcion ? `- ${zona.DESCRIPCION || zona.descripcion}` : ''}`;
    select.appendChild(option);
  });
  
  console.log(`Se han añadido ${zonasDisponibles.length} zonas al select`);
}

// Asignar una zona al usuario
async function asignarZonaUsuario() {
  console.log('Intentando asignar zona a usuario...');
  
  if (!usuarioSeleccionado) {
    mostrarAlerta('error', 'No hay usuario seleccionado');
    return false;
  }
  
  const select = document.getElementById('select-zonas-disponibles');
  const selectPermisos = document.getElementById('select-permisos-zona');
  
  if (!select || !selectPermisos) {
    console.error('Select de zonas o permisos no encontrado');
    return false;
  }
  
  const zonaId = select.value;
  const permisos = selectPermisos.value;
  
  if (!zonaId) {
    mostrarAlerta('error', 'Seleccione una zona');
    return false;
  }
  
  mostrarCargando();
  
  try {
    const response = await fetch(`/api/usuarios/${usuarioSeleccionado.ID || usuarioSeleccionado.id}/zonas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        zonaId,
        permisos
      }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    mostrarAlerta('success', data.mensaje || 'Zona asignada correctamente');
    
    // Recargar zonas
    await cargarZonasUsuario(usuarioSeleccionado.ID || usuarioSeleccionado.id);
    
    return true;
  } catch (error) {
    console.error('Error en asignarZonaUsuario:', error);
    mostrarAlerta('error', `Error al asignar zona: ${error.message}`);
    return false;
  } finally {
    ocultarCargando();
  }
}

// Actualizar permisos de una zona
async function actualizarPermisosZona(zonaId, permisos) {
  console.log(`Actualizando permisos de zona ${zonaId} a ${permisos}...`);
  
  if (!usuarioSeleccionado) {
    mostrarAlerta('error', 'No hay usuario seleccionado');
    return false;
  }
  
  mostrarCargando();
  
  try {
    const response = await fetch(`/api/usuarios/${usuarioSeleccionado.ID || usuarioSeleccionado.id}/zonas/${zonaId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        permisos
      }),
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    mostrarAlerta('success', data.mensaje || 'Permisos actualizados correctamente');
    
    // Actualizar la zona en la lista local
    const index = zonasUsuario.findIndex(z => (z.ID || z.id) == zonaId);
    if (index !== -1) {
      zonasUsuario[index].PERMISOS = permisos;
      zonasUsuario[index].permisos = permisos;
    }
    
    return true;
  } catch (error) {
    console.error('Error en actualizarPermisosZona:', error);
    mostrarAlerta('error', `Error al actualizar permisos: ${error.message}`);
    
    // Recargar zonas para restablecer estado correcto
    await cargarZonasUsuario(usuarioSeleccionado.ID || usuarioSeleccionado.id);
    
    return false;
  } finally {
    ocultarCargando();
  }
}

// Eliminar una zona asignada a un usuario
async function eliminarZonaUsuario(zonaId) {
  console.log(`Intentando eliminar zona ${zonaId} del usuario...`);
  
  if (!usuarioSeleccionado) {
    mostrarAlerta('error', 'No hay usuario seleccionado');
    return false;
  }
  
  if (!confirm('¿Está seguro de eliminar esta zona del usuario?')) {
    return false;
  }
  
  mostrarCargando();
  
  try {
    const response = await fetch(`/api/usuarios/${usuarioSeleccionado.ID || usuarioSeleccionado.id}/zonas/${zonaId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    mostrarAlerta('success', data.mensaje || 'Zona eliminada correctamente');
    
    // Recargar zonas
    await cargarZonasUsuario(usuarioSeleccionado.ID || usuarioSeleccionado.id);
    
    return true;
  } catch (error) {
    console.error('Error en eliminarZonaUsuario:', error);
    mostrarAlerta('error', `Error al eliminar zona: ${error.message}`);
    return false;
  } finally {
    ocultarCargando();
  }
}

// Mostrar modal para gestionar zonas de un usuario
function mostrarModalZonasUsuario(usuarioId) {
  console.log(`Mostrando modal de zonas para usuario ID: ${usuarioId}...`);
  
  // Asegurar que el modal existe
  if (!document.getElementById('modal-zonas-usuario')) {
    console.log('El modal de zonas no existe, creándolo...');
    crearModalZonasUsuario();
  } else {
    console.log('Modal de zonas ya existe en el DOM');
  }
  
  // Verificar elementos clave del modal
  const elementosNecesarios = [
    'zonas-usuario-titulo',
    'zonas-usuario-nombre',
    'zonas-usuario-email',
    'zonas-usuario-rol',
    'zonas-usuario-estado',
    'contador-zonas',
    'tabla-zonas-usuario',
    'select-zonas-disponibles',
    'select-permisos-zona'
  ];
  
  let elementosFaltantes = [];
  elementosNecesarios.forEach(id => {
    if (!document.getElementById(id)) {
      elementosFaltantes.push(id);
    }
  });
  
  if (elementosFaltantes.length > 0) {
    console.error('Elementos faltantes en el modal:', elementosFaltantes);
    // Intentar reparar el modal recreándolo
    console.log('Recreando el modal para corregir elementos faltantes...');
    const modalExistente = document.getElementById('modal-zonas-usuario');
    if (modalExistente) {
      modalExistente.remove();
    }
    crearModalZonasUsuario();
  }
  
  // Preparar el modal
  const modalElement = document.getElementById('modal-zonas-usuario');
  if (!modalElement) {
    console.error('Modal de zonas de usuario no encontrado después de intento de creación');
    mostrarAlerta('error', 'Error al abrir el modal de zonas. Intente refrescar la página.');
    return;
  }
  
  // Cargar las zonas del usuario
  cargarZonasUsuario(usuarioId).then(success => {
    if (success) {
      // Mostrar el modal
      const modal = new bootstrap.Modal(modalElement);
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

// Exponer funciones para debugging y uso externo
window.zonasUsuarioDebug = {
  crearModalZonasUsuario,
  cargarZonasUsuario,
  mostrarModalZonasUsuario,
  agregarBotonZonasUsuario,
  agregarBotonesZonaEnTablaUsuarios,
  actualizarEstructuraUsuario
};