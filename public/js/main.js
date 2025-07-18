// main.js - Código principal del cliente para el sistema de control de pilonas

// Variables globales
let usuario = null;
let pilonas = [];
let mapaP = null;
let mapaControl = null;
let mapaSeleccion = null;
let markers = {};
let socket = null;
let pilonaSeleccionada = null;
let paginaAuditoria = {
  pagina: 1,
  porPagina: 20,
  total: 0
};

// Variable para detectar si estamos en proceso de redirección
let redirigiendo = false;

// Variable para controlar reintentos de obtener pilonas
let intentosObtenerPilonas = 0;
const MAX_INTENTOS_PILONAS = 3;

// Exponer la variable usuario globalmente para que otros módulos puedan acceder
window.usuario = usuario;

// Colores y estados de las pilonas
const estadoColores = {
  'subida': '#ff4444',
  'bajada': '#00C851',
  'bloqueada_arriba': '#CC0000',
  'bloqueada_abajo': '#007E33',
  'error': '#9e9e9e',
  'desconocido': '#808080',  // Gris para estado desconocido
  'sin_comunicacion': '#9C27B0',  // Morado/Lila para sin comunicación
  'fallo_arriba': '#FFA500'  // Naranja para fallo (se usará con animación)
};

const estadoTexto = {
  'subida': 'Subida',
  'bajada': 'Bajada',
  'bloqueada_arriba': 'Bloqueada arriba',
  'bloqueada_abajo': 'Bloqueada abajo',
  'error': 'Error',
  'desconocido': 'Desconocido',
  'sin_comunicacion': 'Sin comunicación',
  'fallo_arriba': 'Fallo pilona - Revisión'
};

const estadoClases = {
  'subida': 'bg-danger',
  'bajada': 'bg-success',
  'bloqueada_arriba': 'bg-danger text-white',
  'bloqueada_abajo': 'bg-success text-white',
  'error': 'bg-secondary text-white',
  'desconocido': 'bg-secondary',
  'sin_comunicacion': 'bg-purple text-white',
  'fallo_arriba': 'badge-fallo-intermitente'
};

// Timestamps de última comunicación para cada pilona
const ultimaComunicacion = {};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
  console.log('Inicializando aplicación...');
  console.log('Pathname actual:', window.location.pathname);
  
  // Si estamos en la página de login, no ejecutar el resto del código
  if (window.location.pathname === '/login.html' || window.location.pathname.endsWith('login.html')) {
    console.log('Estamos en la página de login, no se ejecuta main.js');
    return;
  }
  
  // Verificar que estamos en la página correcta (index.html)
  // Si el body no tiene el navbar o no tiene ninguna página del dashboard, salir
  const navbar = document.querySelector('.navbar');
  const pageDashboard = document.getElementById('page-dashboard');
  const containerFluid = document.querySelector('.container-fluid.my-4');
  
  // Si no hay navbar Y no hay elementos del dashboard, no estamos en index.html
  if (!navbar && !pageDashboard && !containerFluid) {
    console.log('No se encontraron elementos del dashboard, parece que no estamos en index.html');
    return;
  }
  
  // Si estamos siendo redirigidos, detener ejecución
  if (window.location.pathname === '/' && !navbar) {
    console.log('Posible redirección en progreso, deteniendo ejecución de main.js');
    return;
  }
  
  // Verificación adicional: si hay elementos de login presentes, no ejecutar
  if (document.getElementById('page-login') ||
      document.getElementById('form-login') || 
      document.getElementById('login-email') || 
      document.getElementById('login-password')) {
    console.log('Elementos de login detectados, deteniendo ejecución de main.js');
    return;
  }
  
  // No verificar elementos si estamos en index.html
  // Los elementos de login solo existen en login.html
  console.log('Aplicación iniciada correctamente en index.html');

  // Inicializar el gestor de usuarios y zonas
  if (typeof initUsuariosZonasManager === 'function') {
    initUsuariosZonasManager();
  } else {
    console.warn('Gestor de usuarios y zonas no disponible');
  }
  
  // Inicializar el gestor mejorado de usuarios
  if (typeof initUsuariosMejorado === 'function') {
    initUsuariosMejorado();
  } else {
    console.warn('Gestor mejorado de usuarios no disponible');
  }
  
  // Inicializar configuración avanzada de tipos Modbus
  if (window.ModbusTypeConfig && window.ModbusTypeConfig.init) {
    window.ModbusTypeConfig.init();
    console.log('Configuración avanzada de Modbus inicializada');
  } else {
    console.warn('Módulo de configuración avanzada de Modbus no disponible');
  }
  
  // Eventos de formularios
  document.getElementById('form-cambiar-password')?.addEventListener('submit', event => {
    event.preventDefault();
    cambiarPassword();
  });
  document.getElementById('form-pilona')?.addEventListener('submit', event => {
    event.preventDefault();
    guardarPilona();
  });

  document.getElementById('form-filtros-auditoria')?.addEventListener('submit', event => {
    event.preventDefault();
    cargarAuditoria();
  });
  document.getElementById('form-recuperar-password')?.addEventListener('submit', event => {
    event.preventDefault();
    recuperarPassword();
  });
  
  // Eventos de botones
  document.getElementById('btn-logout')?.addEventListener('click', logout);
  document.getElementById('btn-guardar-password')?.addEventListener('click', cambiarPassword);
  document.getElementById('btn-guardar-pilona')?.addEventListener('click', guardarPilona);

  document.getElementById('btn-confirmar-eliminar')?.addEventListener('click', confirmarEliminar);
  document.getElementById('btn-nueva-pilona')?.addEventListener('click', () => mostrarModalPilona());

  document.getElementById('btn-cambiar-password')?.addEventListener('click', mostrarModalCambiarPassword);
  document.getElementById('btn-reset-filtros')?.addEventListener('click', resetFiltrosAuditoria);
  document.getElementById('btn-exportar-csv')?.addEventListener('click', exportarAuditoriaCSV);
  document.getElementById('btn-perfil')?.addEventListener('click', mostrarModalPerfil);
  document.getElementById('btn-editar-perfil')?.addEventListener('click', editarPerfil);
  
  // Eventos de control de pilonas
  document.getElementById('btn-bajar')?.addEventListener('click', () => controlarPilona('bajar'));
  document.getElementById('btn-subir')?.addEventListener('click', () => controlarPilona('subir'));
  document.getElementById('btn-bloquear-arriba')?.addEventListener('click', () => controlarPilona('bloquear', 'arriba'));
  document.getElementById('btn-bloquear-abajo')?.addEventListener('click', () => controlarPilona('bloquear', 'abajo'));
  document.getElementById('btn-desbloquear')?.addEventListener('click', () => controlarPilona('desbloquear'));
  
  // Navegación
  const navLinks = document.querySelectorAll('.nav-link[data-page]');
  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      cambiarPagina(link.getAttribute('data-page'));
    });
  });
  
  // Comprobar si hay sesión guardada
  const sesion = localStorage.getItem('sesion');
  if (sesion) {
    try {
      usuario = JSON.parse(sesion);
      // IMPORTANTE: Exponer globalmente para otros módulos
      window.usuario = usuario;
      console.log('Sesión recuperada, usuario:', usuario);
      iniciarSesion();
      
      // Disparar evento de usuario autenticado para el caché global
      window.dispatchEvent(new Event('usuario-autenticado'));
    } catch (e) {
      console.error('Error recuperando sesión:', e);
      localStorage.removeItem('sesion');
      // No ejecutar mostrarLogin si ya estamos redirigiendo
      if (!redirigiendo) {
        mostrarLogin();
      }
    }
  } else {
    // No ejecutar mostrarLogin si ya estamos redirigiendo
    if (!redirigiendo) {
      mostrarLogin();
    }
  }
});

// ===== Funciones de autenticación =====

// Cerrar sesión
async function logout() {
  // Si ya estamos redirigiendo, no hacer nada
  if (redirigiendo) return;
  
  redirigiendo = true;
  mostrarCargando();
  
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    // Desconectar socket
    if (window.wsManager) {
      window.wsManager.desconectar();
    } else if (socket) {
      socket.disconnect();
      socket = null;
    }
    
    // Limpiar datos de sesión
    usuario = null;
    window.usuario = null;
    localStorage.removeItem('sesion');
    localStorage.removeItem('sessionID');
    
    // Disparar evento de usuario desconectado para el caché global
    window.dispatchEvent(new Event('usuario-desconectado'));
    
    // Redirigir inmediatamente al login
    window.location.replace('/login.html');
    
    // NO ejecutar más código después de la redirección
    return;
  } catch (error) {
    console.error('Error en logout:', error);
    // En caso de error, intentar redirigir de todos modos
    window.location.replace('/login.html');
  }
}



// Mostrar modal para cambiar contraseña
function mostrarModalCambiarPassword() {
  const formElement = document.getElementById('form-cambiar-password');
  if (formElement) {
    formElement.reset();
  }
  
  const modalElement = document.getElementById('modal-cambiar-password');
  if (!modalElement) {
    console.error('Modal de cambio de contraseña no encontrado');
    return;
  }
  
  const modal = new bootstrap.Modal(modalElement);
  modal.show();
}

// Cambiar contraseña
async function cambiarPassword() {
  const passwordActual = document.getElementById('password-actual').value;
  const passwordNueva = document.getElementById('password-nueva').value;
  const passwordConfirmar = document.getElementById('password-confirmar').value;
  
  if (!passwordActual || !passwordNueva || !passwordConfirmar) {
    mostrarAlerta('error', 'Por favor, complete todos los campos');
    return;
  }
  
  if (passwordNueva !== passwordConfirmar) {
    mostrarAlerta('error', 'Las contraseñas no coinciden');
    return;
  }
  
  mostrarCargando();
  
  try {
    const response = await fetch('/api/auth/cambiar-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        passwordActual, 
        passwordNueva 
      }),
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (response.ok) {
      mostrarAlerta('success', data.mensaje || 'Contraseña cambiada correctamente');
      
      // Cerrar modal
      const modalElement = document.getElementById('modal-cambiar-password');
      if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
          modal.hide();
        }
      }
    } else {
      mostrarAlerta('error', data.error || 'Error al cambiar la contraseña');
    }
  } catch (error) {
    console.error('Error en cambiarPassword:', error);
    mostrarAlerta('error', 'Error de conexión con el servidor');
  } finally {
    ocultarCargando();
  }
}

// Mostrar modal de perfil
function mostrarModalPerfil() {
  if (!usuario) {
    console.error('No hay usuario para mostrar perfil');
    return;
  }
  
  // Llenar datos del perfil
  document.getElementById('perfil-nombre').textContent = usuario.NOMBRE || '';
  document.getElementById('perfil-email').textContent = usuario.EMAIL || '';
  document.getElementById('perfil-rol').textContent = formatRol(usuario.ROL || '');
  document.getElementById('perfil-fecha-inicio').textContent = formatFecha(usuario.FECHA_INICIO || '');
  
  // Mostrar modal
  const modalElement = document.getElementById('modal-perfil');
  if (!modalElement) {
    console.error('Modal de perfil no encontrado');
    return;
  }
  
  const modal = new bootstrap.Modal(modalElement);
  modal.show();
}

// Editar perfil
function editarPerfil() {
  // Aquí podrías implementar la edición del perfil
  // Por ahora, simplemente cerramos el modal y mostramos el de cambio de contraseña
  const modalPerfil = document.getElementById('modal-perfil');
  if (modalPerfil) {
    const modalInstance = bootstrap.Modal.getInstance(modalPerfil);
    if (modalInstance) {
      modalInstance.hide();
    }
  }
  
  setTimeout(() => {
    mostrarModalCambiarPassword();
  }, 500);
}

// ===== Funciones de gestión de pilonas =====

// Función mejorada para obtener pilonas
async function obtenerPilonas() {
  // Si estamos redirigiendo, no ejecutar
  if (redirigiendo) return;
  
  console.log('Obteniendo pilonas del servidor...');
  mostrarCargando();
  
  try {
    // Verificar si hay una sesión activa
    if (!usuario) {
      console.error('No hay sesión activa para obtener pilonas');
      mostrarAlerta('error', 'No hay sesión activa. Inicie sesión nuevamente.');
      mostrarLogin();
      return;
    }
    
    const response = await fetch('/api/pilonas', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      credentials: 'include' // Importante para incluir cookies de sesión
    });
    
    // Verificar si la respuesta es exitosa
    if (response.ok) {
      const data = await response.json();
      console.log('Pilonas obtenidas:', data);
      
      // Normalizar el formato de los datos recibidos
      pilonas = normalizarPilonas(data);
      
      // Verificar si se recibieron pilonas
      if (pilonas.length === 0) {
        console.warn('No se recibieron pilonas del servidor');
      } else {
        console.log(`Se han cargado ${pilonas.length} pilonas correctamente`);
      }
      
      // Actualizar todas las vistas
      actualizarVistaPilonas();
      
      // Resetear contador de intentos ya que fue exitoso
      intentosObtenerPilonas = 0;
    } else {
      // Manejar errores HTTP
      let errorMsg = 'Error al obtener pilonas del servidor';
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorMsg;
        console.error('Error de servidor:', errorData);
      } catch (e) {
        console.error('Error al procesar respuesta de error:', e);
      }
      
      // Si es un error de autorización, volver al login
      if (response.status === 401) {
        mostrarAlerta('error', 'Sesión expirada. Inicie sesión nuevamente.');
        localStorage.removeItem('sesion');
        mostrarLogin();
      } else {
        mostrarAlerta('error', errorMsg);
      }
    }
  } catch (error) {
    console.error('Error crítico en obtenerPilonas:', error);
    
    // Verificar si es un error de red o de sesión
    if (error.name === 'TypeError' && error.message.includes('NetworkError')) {
      // Error de red, intentar reintentar
      intentosObtenerPilonas++;
      console.warn(`Error de red al obtener pilonas (intento ${intentosObtenerPilonas}/${MAX_INTENTOS_PILONAS})`);
      
      if (intentosObtenerPilonas < MAX_INTENTOS_PILONAS) {
        // Reintentar después de un tiempo
        setTimeout(() => {
          console.log('Reintentando obtener pilonas...');
          obtenerPilonas();
        }, 2000 * intentosObtenerPilonas); // Aumentar el tiempo entre reintentos
      } else {
        console.error('Se alcanzó el número máximo de reintentos');
        intentosObtenerPilonas = 0; // Resetear contador
      }
    } else if (!usuario) {
      // Si no hay usuario, redirigir al login
      mostrarLogin();
    } else {
      // Solo mostrar alerta para otros tipos de errores
      mostrarAlerta('error', 'Error de conexión con el servidor. Verifique su conexión a Internet.');
      intentosObtenerPilonas = 0; // Resetear contador
    }
  } finally {
    ocultarCargando();
  }
}

// Normalizar formato de pilonas (para manejar inconsistencias en la API)
function normalizarPilonas(data) {
  if (!Array.isArray(data)) {
    console.error('Los datos de pilonas no son un array:', data);
    return [];
  }
  
  return data.map(pilona => {
    const pilonaId = pilona.ID || pilona.id || 0;
    
    // Si no tenemos registro de comunicación previa, es la primera vez
    if (!ultimaComunicacion[pilonaId]) {
      ultimaComunicacion[pilonaId] = null; // Nunca se ha comunicado
    }
    
    // Determinar el estado inicial
    let estadoInicial = pilona.ESTADO || pilona.estado;
    
    // Si el estado es 'error' o no existe, establecer como 'desconocido'
    if (!estadoInicial || estadoInicial === 'error') {
      estadoInicial = 'desconocido';
    }
    
    // Crear un objeto normalizado con propiedades estándar
    const pilonaStd = {
      id: pilonaId,
      nombre: pilona.NOMBRE || pilona.nombre || 'Sin nombre',
      direccionIP: pilona.DIRECCION_IP || pilona.direccionIP || 'desconocida',
      puerto: pilona.PUERTO || pilona.puerto || 502,
      unitId: pilona.UNIT_ID || pilona.unitId || 1,
      coilSubir: pilona.COIL_SUBIR || pilona.coilSubir || 0,
      coilBajar: pilona.COIL_BAJAR || pilona.coilBajar || 0,
      coilEstado: pilona.COIL_ESTADO || pilona.coilEstado || 0,
      coilBloqueo: pilona.COIL_BLOQUEO || pilona.coilBloqueo || 0,
      coilPuntual: pilona.COIL_PUNTUAL || pilona.coilPuntual || null,
      latitud: parseFloat(pilona.LATITUD || pilona.latitud || 0),
      longitud: parseFloat(pilona.LONGITUD || pilona.longitud || 0),
      estado: estadoInicial
    };
    
    // Mantener también las propiedades originales
    return {...pilona, ...pilonaStd};
  });
}

// Controlar pilona desde el mapa
function controlarPilonaMapa(id, accion) {
  console.log(`Controlando pilona ${id}, acción: ${accion}`);
  pilonaSeleccionada = id;
  controlarPilona(accion);
}

// Función mejorada para controlar una pilona
async function controlarPilona(accion, posicion = null) {
  if (!pilonaSeleccionada) {
    mostrarAlerta('error', 'No hay pilona seleccionada. Seleccione una pilona primero.');
    return;
  }
  
  if (!usuario) {
    mostrarAlerta('error', 'No hay sesión activa. Inicie sesión nuevamente.');
    mostrarLogin();
    return;
  }
  
  mostrarCargando();
  console.log(`Enviando comando ${accion} a pilona ${pilonaSeleccionada}...`);
  
  try {
    let url = '';
    let body = {};
    
    // Construir la URL y el cuerpo de la petición
    switch (accion) {
      case 'subir':
        url = `/api/pilonas/${pilonaSeleccionada}/subir`;
        break;
      case 'bajar':
        url = `/api/pilonas/${pilonaSeleccionada}/bajar`;
        break;
      case 'bloquear':
        url = `/api/pilonas/${pilonaSeleccionada}/bloquear`;
        body = { posicion };
        break;
      case 'desbloquear':
        url = `/api/pilonas/${pilonaSeleccionada}/desbloquear`;
        break;
      default:
        throw new Error(`Acción desconocida: ${accion}`);
    }
    
    // Realizar la petición
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify(body)
    });
    
    // Procesar la respuesta
    if (response.ok) {
      const data = await response.json();
      mostrarAlerta('success', data.mensaje || `Acción ${accion} realizada correctamente`);
      
      // Actualizar estado de la pilona inmediatamente sin esperar al socket
      actualizarEstadoPilona(pilonaSeleccionada, data.estado);
      
      console.log(`Comando ${accion} ejecutado correctamente:`, data);
    } else {
      // Manejar errores HTTP
      let errorMsg = `Error al ${accion} la pilona`;
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorMsg;
      } catch (e) {
        console.error('Error procesando respuesta de error:', e);
      }
      
      // Si es un error de autorización, volver al login
      if (response.status === 401) {
        mostrarAlerta('error', 'Sesión expirada. Inicie sesión nuevamente.');
        localStorage.removeItem('sesion');
        mostrarLogin();
      } else {
        mostrarAlerta('error', errorMsg);
      }
      
      console.error(`Error en comando ${accion}:`, response.status, errorMsg);
    }
  } catch (error) {
    console.error(`Error crítico en controlarPilona (${accion}):`, error);
    mostrarAlerta('error', `Error de conexión: ${error.message}`);
  } finally {
    ocultarCargando();
  }
}

// Mostrar modal para crear/editar pilona
function mostrarModalPilona(id = null) {
  // Resetear formulario
  const formElement = document.getElementById('form-pilona');
  if (formElement) {
    formElement.reset();
  }
  
  const idElement = document.getElementById('pilona-id');
  if (idElement) {
    idElement.value = '';
  }
  
  // Actualizar título del modal
  const titulo = id ? 'Editar Pilona' : 'Nueva Pilona';
  const tituloElement = document.getElementById('modal-pilona-titulo');
  if (tituloElement) {
    tituloElement.textContent = titulo;
  }
  
  if (id) {
    // Editar pilona existente
    if (idElement) {
      idElement.value = id;
    }
    
    const pilona = pilonas.find(p => p.id == id || p.ID == id);
    if (pilona) {
      // Llenar formulario con datos de la pilona
      document.getElementById('pilona-nombre').value = pilona.nombre || pilona.NOMBRE || '';
      document.getElementById('pilona-direccion-ip').value = pilona.direccionIP || pilona.DIRECCION_IP || '';
      document.getElementById('pilona-puerto').value = pilona.puerto || pilona.PUERTO || 502;
      document.getElementById('pilona-unit-id').value = pilona.unitId || pilona.UNIT_ID || 1;
      
      // Verificar tipo de dispositivo
      const tipoDispositivo = pilona.tipoDispositivo || pilona.TIPO_DISPOSITIVO || 'MODBUS_GENERICO';
      const tipoDispositivoSelect = document.getElementById('pilona-tipo-dispositivo');
      if (tipoDispositivoSelect) {
        tipoDispositivoSelect.value = tipoDispositivo;
        // Disparar evento de cambio para actualizar la interfaz
        tipoDispositivoSelect.dispatchEvent(new Event('change'));
      }
      
      // Obtener configuración LOGO si existe
      const logoConfig = pilona.logoConfig || pilona.LOGO_CONFIG;
      
      if (tipoDispositivo === 'LOGO' && logoConfig) {
        // Cargar configuración LOGO
        setTimeout(() => {
          if (window.LOGOConfig && window.LOGOConfig.loadConfig) {
            try {
              const config = typeof logoConfig === 'string' ? 
                JSON.parse(logoConfig) : logoConfig;
              window.LOGOConfig.loadConfig(config);
              // Crear botones de control después de cargar la configuración
              if (window.LOGOConfig.crearBotonesControl) {
                setTimeout(() => {
                  window.LOGOConfig.crearBotonesControl();
                }, 200);
              }
            } catch (e) {
              console.error('Error cargando configuración LOGO:', e);
            }
          }
        }, 100);
      } else {
        // Cargar configuración Modbus genérico con nueva estructura
        const coilEstadoElement = document.getElementById('pilona-coil-estado-subida-bajada');
        if (coilEstadoElement) {
          coilEstadoElement.value = pilona.coilEstadoSubidaBajada || pilona.COIL_ESTADO_SUBIDA_BAJADA || pilona.coilEstado || pilona.COIL_ESTADO || 0;
        }
        
        const coilBajadaPuntualElement = document.getElementById('pilona-coil-bajada-puntual');
        if (coilBajadaPuntualElement) {
          coilBajadaPuntualElement.value = pilona.coilBajadaPuntual || pilona.COIL_BAJADA_PUNTUAL || pilona.coilPuntual || pilona.COIL_PUNTUAL || 0;
        }
        
        const coilForzadaAbajoElement = document.getElementById('pilona-coil-forzada-abajo');
        if (coilForzadaAbajoElement) {
          coilForzadaAbajoElement.value = pilona.coilForzadaAbajo || pilona.COIL_FORZADA_ABAJO || pilona.coilBajar || pilona.COIL_BAJAR || 0;
        }
        
        const coilForzadaArribaElement = document.getElementById('pilona-coil-forzada-arriba');
        if (coilForzadaArribaElement) {
          coilForzadaArribaElement.value = pilona.coilForzadaArriba || pilona.COIL_FORZADA_ARRIBA || pilona.coilBloqueo || pilona.COIL_BLOQUEO || 0;
        }

        // Cargar campo de electroválvula
        const coilElectrovalvulaElement = document.getElementById('pilona-coil-electrovalvula');
        if (coilElectrovalvulaElement) {
          coilElectrovalvulaElement.value = pilona.coilElectrovalvula || pilona.COIL_ELECTROVALVULA || '';
        }
        
        // Cargar configuración avanzada de Modbus si está disponible
        if (window.ModbusTypeConfig && window.ModbusTypeConfig.setConfig) {
          window.ModbusTypeConfig.setConfig(pilona);
        }
      }
      
      document.getElementById('pilona-latitud').value = pilona.latitud || pilona.LATITUD || 41.3851;
      document.getElementById('pilona-longitud').value = pilona.longitud || pilona.LONGITUD || 2.1734;
      
      // Cargar tiempo puntual
      const tiempoPuntualElement = document.getElementById('pilona-tiempo-puntual');
      if (tiempoPuntualElement) {
        tiempoPuntualElement.value = pilona.tiempoPuntual || pilona.TIEMPO_PUNTUAL || 3000;
      }
    } else {
      console.error(`No se encontró la pilona con ID ${id}`);
    }
  } else {
    // Valores por defecto para nueva pilona
    document.getElementById('pilona-puerto').value = 502;
    document.getElementById('pilona-unit-id').value = 1;
    // Coordenadas por defecto en Barcelona
    document.getElementById('pilona-latitud').value = 41.3851;
    document.getElementById('pilona-longitud').value = 2.1734;
    
    // Valores por defecto para los nuevos coils
    const coilEstadoElement = document.getElementById('pilona-coil-estado-subida-bajada');
    if (coilEstadoElement) coilEstadoElement.value = 0;
    
    const coilBajadaPuntualElement = document.getElementById('pilona-coil-bajada-puntual');
    if (coilBajadaPuntualElement) coilBajadaPuntualElement.value = 1;
    
    const coilForzadaAbajoElement = document.getElementById('pilona-coil-forzada-abajo');
    if (coilForzadaAbajoElement) coilForzadaAbajoElement.value = 2;
    
    const coilForzadaArribaElement = document.getElementById('pilona-coil-forzada-arriba');
    if (coilForzadaArribaElement) coilForzadaArribaElement.value = 3;
    
    // Valor por defecto para tiempo puntual
    const tiempoPuntualElement = document.getElementById('pilona-tiempo-puntual');
    if (tiempoPuntualElement) tiempoPuntualElement.value = 3000;
    
    // Valor por defecto para electroválvula
    const coilElectrovalvulaElement = document.getElementById('pilona-coil-electrovalvula');
    if (coilElectrovalvulaElement) coilElectrovalvulaElement.value = '';
  }
  
  // Mostrar modal
  const modalElement = document.getElementById('modal-pilona');
  if (!modalElement) {
    console.error('Modal de pilona no encontrado');
    return;
  }
  
  const modal = new bootstrap.Modal(modalElement);
  modal.show();
  
  // Habilitar el botón de Realtime cuando se abre el modal
  const btnRealtime = document.getElementById('btn-toggle-realtime');
  if (btnRealtime) {
    btnRealtime.disabled = false;
  }
  
  // Inicializar mapa de selección después de mostrar el modal
  setTimeout(() => {
    inicializarMapaSeleccion();
  }, 500);
}

// Inicializar mapa para selección de ubicación
function inicializarMapaSeleccion() {
  const mapaElement = document.getElementById('mapa-seleccion');
  if (!mapaElement) {
    console.error('Elemento de mapa de selección no encontrado');
    return;
  }
  
  try {
    // Obtener coordenadas actuales del formulario
    const latitud = parseFloat(document.getElementById('pilona-latitud').value) || 41.3851;
    const longitud = parseFloat(document.getElementById('pilona-longitud').value) || 2.1734;
    
    // Si ya hay un mapa, solo actualizar
    if (mapaSeleccion) {
      mapaSeleccion.setView([latitud, longitud], 13);
      if (mapaSeleccion._marcador) {
        mapaSeleccion._marcador.setLatLng([latitud, longitud]);
      } else {
        mapaSeleccion._marcador = L.marker([latitud, longitud], { draggable: true })
          .addTo(mapaSeleccion)
          .on('dragend', actualizarCoordenadas);
      }
      
      // Invalidar tamaño para asegurar renderizado correcto
      setTimeout(() => {
        mapaSeleccion.invalidateSize();
      }, 100);
      
      return;
    }
    
    // Crear nuevo mapa
    mapaSeleccion = L.map('mapa-seleccion').setView([latitud, longitud], 13);
    
    // Añadir capa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapaSeleccion);
    
    // Añadir marcador arrastrable
    mapaSeleccion._marcador = L.marker([latitud, longitud], { draggable: true })
      .addTo(mapaSeleccion)
      .on('dragend', actualizarCoordenadas);
    
    // Permitir clic en el mapa para colocar el marcador
    mapaSeleccion.on('click', (e) => {
      mapaSeleccion._marcador.setLatLng(e.latlng);
      actualizarCoordenadas();
    });
    
    // Invalidar tamaño para asegurar renderizado correcto
    setTimeout(() => {
      mapaSeleccion.invalidateSize();
    }, 100);
    
    console.log('Mapa de selección inicializado correctamente');
  } catch (error) {
    console.error('Error al inicializar mapa de selección:', error);
    mostrarAlerta('error', 'Error al inicializar el mapa de selección');
  }
}

// Actualizar coordenadas cuando se mueve el marcador
function actualizarCoordenadas() {
  if (!mapaSeleccion || !mapaSeleccion._marcador) {
    console.error('Mapa de selección o marcador no inicializado');
    return;
  }
  
  try {
    const latlng = mapaSeleccion._marcador.getLatLng();
    
    const latitudElement = document.getElementById('pilona-latitud');
    const longitudElement = document.getElementById('pilona-longitud');
    
    if (latitudElement && longitudElement) {
      latitudElement.value = latlng.lat.toFixed(6);
      longitudElement.value = latlng.lng.toFixed(6);
    } else {
      console.error('Elementos de coordenadas no encontrados');
    }
  } catch (error) {
    console.error('Error al actualizar coordenadas:', error);
  }
}

// Función para obtener direcciones LOGO desde la configuración
function obtenerDireccionesLOGO(logoConfig) {
  const direcciones = {
    subir: null,
    bajar: null,
    estado: null,
    bloqueo: null,
    puntual: null
  };
  
  console.log('Procesando configuración LOGO para obtener direcciones:', logoConfig);
  
  // Buscar en todas las secciones de la configuración
  ['entradas', 'salidas', 'marcas', 'registros'].forEach(seccion => {
    if (logoConfig[seccion]) {
      Object.entries(logoConfig[seccion]).forEach(([elemento, datos]) => {
        if (datos.funcion && datos.direccion) {
          console.log(`Mapeando ${datos.funcion} -> ${elemento} (dirección: ${datos.direccion})`);
          direcciones[datos.funcion] = datos.direccion;
        }
      });
    }
  });
  
  console.log('Direcciones LOGO finales:', direcciones);
  return direcciones;
}

// Función para validar formulario LOGO
function validarFormularioLOGO() {
  console.log('Validando formulario LOGO...');
  
  // Obtener valores básicos
  const nombre = document.getElementById('pilona-nombre')?.value?.trim();
  const direccionIP = document.getElementById('pilona-direccion-ip')?.value?.trim();
  const puerto = document.getElementById('pilona-puerto')?.value;
  const unitId = document.getElementById('pilona-unit-id')?.value;
  const latitud = document.getElementById('pilona-latitud')?.value;
  const longitud = document.getElementById('pilona-longitud')?.value;
  
  const errores = [];
  
  // Validar campos básicos
  if (!nombre) errores.push('El nombre es obligatorio');
  if (!direccionIP) errores.push('La dirección IP es obligatoria');
  if (!latitud) errores.push('La latitud es obligatoria');
  if (!longitud) errores.push('La longitud es obligatoria');
  
  // Validar formato de IP
  if (direccionIP && !validarIP(direccionIP)) {
    errores.push('El formato de la dirección IP no es válido');
  }
  
  // Validar coordenadas
  if (latitud && isNaN(parseFloat(latitud))) {
    errores.push('La latitud debe ser un número');
  }
  
  if (longitud && isNaN(parseFloat(longitud))) {
    errores.push('La longitud debe ser un número');
  }
  
  // Validar configuración LOGO
  const funcionesRequeridas = ['subir', 'bajar', 'estado', 'bloqueo'];
  const funcionesAsignadas = [];
  
  document.querySelectorAll('.logo-function').forEach(select => {
    if (select.value) {
      funcionesAsignadas.push(select.dataset.function);
    }
  });
  
  console.log('Funciones asignadas en LOGO:', funcionesAsignadas);
  
  funcionesRequeridas.forEach(funcion => {
    if (!funcionesAsignadas.includes(funcion)) {
      errores.push(`La función '${funcion}' debe ser asignada a un elemento LOGO`);
    }
  });
  
  // Mostrar errores si existen
  if (errores.length > 0) {
    mostrarErroresFormulario(errores);
    return false;
  }
  
  console.log('Validación LOGO exitosa');
  return true;
}

// Función para validar el formulario de pilona
function validarFormularioPilona() {
  console.log('Validando formulario de pilona...');
  
  // Obtener valores de los campos
  const nombre = document.getElementById('pilona-nombre')?.value?.trim();
  const direccionIP = document.getElementById('pilona-direccion-ip')?.value?.trim();
  const puerto = document.getElementById('pilona-puerto')?.value;
  const unitId = document.getElementById('pilona-unit-id')?.value;
  const coilEstadoSubidaBajada = document.getElementById('pilona-coil-estado-subida-bajada')?.value;
  const coilBajadaPuntual = document.getElementById('pilona-coil-bajada-puntual')?.value;
  const coilForzadaAbajo = document.getElementById('pilona-coil-forzada-abajo')?.value;
  const coilForzadaArriba = document.getElementById('pilona-coil-forzada-arriba')?.value;
  const latitud = document.getElementById('pilona-latitud')?.value;
  const longitud = document.getElementById('pilona-longitud')?.value;
  
  // Crear array para almacenar errores
  const errores = [];
  
  // Validar campos obligatorios
  if (!nombre) errores.push('El nombre es obligatorio');
  if (!direccionIP) errores.push('La dirección IP es obligatoria');
  if (!coilEstadoSubidaBajada) errores.push('El coil de estado subida/bajada es obligatorio');
  if (!coilBajadaPuntual) errores.push('El coil de bajada puntual es obligatorio');
  if (!coilForzadaAbajo) errores.push('El coil de forzada abajo es obligatorio');
  if (!coilForzadaArriba) errores.push('El coil de forzada arriba es obligatorio');
  if (!latitud) errores.push('La latitud es obligatoria');
  if (!longitud) errores.push('La longitud es obligatoria');
  
  // Validar formato de IP
  if (direccionIP && !validarIP(direccionIP)) {
    errores.push('El formato de la dirección IP no es válido');
  }
  
  // Validar que las coordenadas son números
  if (latitud && isNaN(parseFloat(latitud))) {
    errores.push('La latitud debe ser un número');
  }
  
  if (longitud && isNaN(parseFloat(longitud))) {
    errores.push('La longitud debe ser un número');
  }
  
  // Validar que los coils son números enteros
  const coils = [
    { valor: coilEstadoSubidaBajada, nombre: 'Coil Estado Subida/Bajada' },
    { valor: coilBajadaPuntual, nombre: 'Coil Bajada Puntual' },
    { valor: coilForzadaAbajo, nombre: 'Coil Forzada Abajo' },
    { valor: coilForzadaArriba, nombre: 'Coil Forzada Arriba' }
  ];
  
  coils.forEach(coil => {
    if (coil.valor && (!Number.isInteger(Number(coil.valor)) || Number(coil.valor) < 0)) {
      errores.push(`${coil.nombre} debe ser un número entero no negativo`);
    }
  });
  
  // Mostrar errores si existen
  if (errores.length > 0) {
    mostrarErroresFormulario(errores);
    return false;
  }
  
  // Si no hay errores, el formulario es válido
  return true;
}

// Función para guardar pilona (crear/actualizar)
async function guardarPilona() {
  // Obtener el tipo de dispositivo
  const tipoDispositivo = document.getElementById('pilona-tipo-dispositivo')?.value || 'MODBUS_GENERICO';
  
  // Primero validar el formulario según el tipo
  if (tipoDispositivo === 'LOGO') {
    if (!validarFormularioLOGO()) {
      return;
    }
  } else {
    if (!validarFormularioPilona()) {
      return;
    }
  }
  
  const id = document.getElementById('pilona-id').value;
  const nombre = document.getElementById('pilona-nombre').value;
  const direccionIP = document.getElementById('pilona-direccion-ip').value;
  const puerto = document.getElementById('pilona-puerto').value;
  const unitId = document.getElementById('pilona-unit-id').value;
  const latitud = document.getElementById('pilona-latitud').value;
  const longitud = document.getElementById('pilona-longitud').value;
  const tiempoPuntual = document.getElementById('pilona-tiempo-puntual')?.value || 3000;
  
  // Crear objeto base de la pilona
  const pilona = {
    nombre,
    direccionIP,
    puerto: parseInt(puerto) || 502,
    unitId: parseInt(unitId) || 1,
    latitud: parseFloat(latitud),
    longitud: parseFloat(longitud),
    tipoDispositivo,
    tiempoPuntual: parseInt(tiempoPuntual) || 3000
  };
  
  // Agregar campos específicos según el tipo
  if (tipoDispositivo === 'LOGO') {
    // Obtener configuración LOGO
    if (window.LOGOConfig) {
      const logoConfig = window.LOGOConfig.getConfig();
      pilona.logoConfig = logoConfig; // No stringify aquí, dejar como objeto
      
      // Mapear las direcciones LOGO a los coils estándar
      const direcciones = obtenerDireccionesLOGO(logoConfig);
      pilona.coilSubir = direcciones.subir || 0;
      pilona.coilBajar = direcciones.bajar || 0;
      pilona.coilEstado = direcciones.estado || 0;
      pilona.coilBloqueo = direcciones.bloqueo || 0;
      pilona.coilPuntual = direcciones.puntual || null;
      
      // Log para depuración
      console.log('Configuración LOGO obtenida:', logoConfig);
      console.log('Direcciones mapeadas:', direcciones);
      console.log('Datos finales de pilona LOGO:', pilona);
    } else {
      mostrarAlerta('error', 'Error al obtener la configuración LOGO');
      return;
    }
  } else {
    // Modbus genérico con nueva estructura
    const coilEstadoElement = document.getElementById('pilona-coil-estado-subida-bajada');
    const coilBajadaPuntualElement = document.getElementById('pilona-coil-bajada-puntual');
    const coilForzadaAbajoElement = document.getElementById('pilona-coil-forzada-abajo');
    const coilForzadaArribaElement = document.getElementById('pilona-coil-forzada-arriba');
    const coilElectrovalvulaElement = document.getElementById('pilona-coil-electrovalvula');
    
    // Usar nueva estructura de coils
    pilona.coilEstadoSubidaBajada = coilEstadoElement ? parseInt(coilEstadoElement.value) || 0 : 0;
    pilona.coilBajadaPuntual = coilBajadaPuntualElement ? parseInt(coilBajadaPuntualElement.value) || 0 : 0;
    pilona.coilForzadaAbajo = coilForzadaAbajoElement ? parseInt(coilForzadaAbajoElement.value) || 0 : 0;
    pilona.coilForzadaArriba = coilForzadaArribaElement ? parseInt(coilForzadaArribaElement.value) || 0 : 0;
    pilona.coilElectrovalvula = coilElectrovalvulaElement && coilElectrovalvulaElement.value !== '' ? parseInt(coilElectrovalvulaElement.value) || null : null;
    
    // Mantener compatibilidad con estructura antigua
    pilona.coilEstado = pilona.coilEstadoSubidaBajada;
    pilona.coilPuntual = pilona.coilBajadaPuntual;
    pilona.coilBajar = pilona.coilForzadaAbajo;
    pilona.coilBloqueo = pilona.coilForzadaArriba;
    pilona.coilSubir = 0; // Ya no se usa
    
    // Agregar configuración avanzada de Modbus si está disponible
    if (window.ModbusTypeConfig && window.ModbusTypeConfig.getConfig) {
      const advancedConfig = window.ModbusTypeConfig.getConfig();
      console.log('Configuración avanzada de Modbus:', advancedConfig);
      
      // Mapear la configuración avanzada a los campos de la pilona
      const signals = ['subir', 'bajar', 'estado', 'bloqueo', 'puntual', 'electrovalvula'];
      signals.forEach(signal => {
        const signalUpper = signal.toUpperCase();
        const config = advancedConfig[signal];
        
        if (config) {
          // Tipo de registro
          pilona[`tipoCoil${signal.charAt(0).toUpperCase() + signal.slice(1)}`] = config.tipo;
          
          // Modo de operación
          pilona[`modoCoil${signal.charAt(0).toUpperCase() + signal.slice(1)}`] = config.modo;
          
          // Puerto específico (si existe)
          if (config.puerto) {
            pilona[`puertoCoil${signal.charAt(0).toUpperCase() + signal.slice(1)}`] = parseInt(config.puerto);
          }
          
          // Unit ID específico (si existe)
          if (config.unitId) {
            pilona[`unitIdCoil${signal.charAt(0).toUpperCase() + signal.slice(1)}`] = parseInt(config.unitId);
          }
        }
      });
    }
  }
  
  // Registrar los datos para depuración
  console.log('Datos de pilona a guardar:', pilona);
  
  mostrarCargando();
  
  try {
    const url = id ? `/api/pilonas/${id}` : '/api/pilonas';
    const method = id ? 'PUT' : 'POST';
    
    console.log(`Enviando petición ${method} a ${url}`);
    
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(pilona),
      credentials: 'include'
    });
    
    // Verificar si la respuesta es exitosa
    if (!response.ok) {
      let errorMsg = `Error al guardar la pilona: ${response.status} ${response.statusText}`;
      
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorMsg;
      } catch (parseError) {
        console.error('Error al parsear respuesta de error:', parseError);
      }
      
      throw new Error(errorMsg);
    }
    
    const data = await response.json();
    
    mostrarAlerta('success', data.mensaje || (id ? 'Pilona actualizada correctamente' : 'Pilona creada correctamente'));
    
    // Cerrar modal
    const modalElement = document.getElementById('modal-pilona');
    if (modalElement) {
      const modal = bootstrap.Modal.getInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    }
    
    // Recargar pilonas
    await obtenerPilonas();
  } catch (error) {
    console.error('Error en guardarPilona:', error);
    mostrarAlerta('error', error.message || 'Error de conexión con el servidor');
  } finally {
    ocultarCargando();
  }
}

// Eliminar pilona
function eliminarPilona(id) {
  if (!id) {
    console.error('ID de pilona no válido para eliminar');
    return;
  }
  
  const confirmarIdElement = document.getElementById('confirmar-id');
  const confirmarTipoElement = document.getElementById('confirmar-tipo');
  
  if (confirmarIdElement && confirmarTipoElement) {
    confirmarIdElement.value = id;
    confirmarTipoElement.value = 'pilona';
  } else {
    console.error('Elementos de confirmación no encontrados');
    return;
  }
  
  const pilona = pilonas.find(p => p.id == id || p.ID == id);
  const nombre = pilona ? (pilona.nombre || pilona.NOMBRE || `ID: ${id}`) : `ID: ${id}`;
  
  const mensajeElement = document.getElementById('mensaje-confirmar');
  if (mensajeElement) {
    mensajeElement.textContent = `¿Estás seguro de que deseas eliminar la pilona "${nombre}"? Esta acción no se puede deshacer.`;
  }
  
  const modalElement = document.getElementById('modal-confirmar');
  if (!modalElement) {
    console.error('Modal de confirmación no encontrado');
    return;
  }
  
  const modal = new bootstrap.Modal(modalElement);
  modal.show();
}

// ===== Funciones de gestión de usuarios =====

// Obtener todos los usuarios
async function obtenerUsuarios() {
  mostrarCargando();
  
  try {
    const response = await fetch('/api/usuarios', {
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (response.ok) {
      const usuarios = await response.json();
      console.log('Usuarios obtenidos:', usuarios);
      actualizarTablaUsuarios(usuarios);
    } else {
      // Manejar errores HTTP
      let errorMsg = 'Error al obtener usuarios';
      try {
        const data = await response.json();
        errorMsg = data.error || errorMsg;
      } catch (e) {
        console.error('Error procesando respuesta de error:', e);
      }
      
      // Si es un error de autorización, volver al login
      if (response.status === 401) {
        mostrarAlerta('error', 'Sesión expirada. Inicie sesión nuevamente.');
        localStorage.removeItem('sesion');
        mostrarLogin();
      } else {
        mostrarAlerta('error', errorMsg);
      }
    }
  } catch (error) {
    console.error('Error en obtenerUsuarios:', error);
    mostrarAlerta('error', 'Error de conexión con el servidor');
  } finally {
    ocultarCargando();
  }
}

// Actualizar tabla de usuarios
function actualizarTablaUsuarios(usuarios) {
  const tabla = document.getElementById('tabla-usuarios');
  if (!tabla) {
    console.error('Tabla de usuarios no encontrada');
    return;
  }
  
  tabla.innerHTML = '';
  
  if (!usuarios || usuarios.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="6" class="text-center">No hay usuarios registrados</td>`;
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
      <td>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-danger btn-eliminar-usuario" data-id="${usuario.ID}">
            <i class="fas fa-trash"></i>
          </button>
          <button class="btn btn-outline-info btn-zonas-usuario" data-id="${usuario.ID}">
            <i class="fas fa-map-marker-alt"></i>
          </button>
        </div>
      </td>
    `;
    
    tabla.appendChild(tr);
  });
  
  // Agregar listeners a los botones de acciones
  // Botones de edición eliminados - solo se permite crear usuarios
  
  tabla.querySelectorAll('.btn-eliminar-usuario').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      eliminarUsuario(id);
    });
  });
  
  tabla.querySelectorAll('.btn-zonas-usuario').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      if (typeof mostrarModalZonasUsuario === 'function') {
        mostrarModalZonasUsuario(id);
      } else {
        console.error('Función mostrarModalZonasUsuario no encontrada');
      }
    });
  });
}






// Función para controlar la pilona en modo puntual
function controlarPilonaPuntual(id) {
  console.log(`Controlando pilona ${id} en modo puntual`);
  
  if (!usuario) {
    mostrarAlerta('error', 'No hay sesión activa. Inicie sesión nuevamente.');
    mostrarLogin();
    return;
  }
  
  // Verificar que el usuario sea cliente
  if ((usuario.ROL || usuario.rol || '').toLowerCase() !== 'cliente') {
    mostrarAlerta('error', 'Esta función solo está disponible para clientes');
    return;
  }
  
  mostrarCargando();
  console.log(`Enviando comando puntual a pilona ${id}...`);
  
  // Mostrar confirmación
  if (confirm('¿Confirma que desea activar el modo puntual en esta pilona?')) {
    // Simular carga de botón
    const botones = document.querySelectorAll(`.btn[onclick*="${id}"]`);
    botones.forEach(btn => {
      btn.disabled = true;
      if (btn.textContent.includes('Puntual')) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-1"></i> Procesando...';
      }
    });
    
    // Realizar la petición
    fetch(`/api/pilonas/${id}/puntual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(data => {
          throw new Error(data.error || 'Error en el servidor');
        });
      }
      return response.json();
    })
    .then(data => {
      mostrarAlerta('success', data.mensaje || 'Acción puntual ejecutada correctamente');
      
      // Actualizar estado de la pilona
      if (data.estado) {
        actualizarEstadoPilona(id, data.estado);
      }
    })
    .catch(error => {
      console.error('Error en acción puntual:', error);
      mostrarAlerta('error', error.message || 'Error al ejecutar acción puntual');
    })
    .finally(() => {
      ocultarCargando();
      
      // Restaurar botones después de un tiempo
      setTimeout(() => {
        botones.forEach(btn => {
          btn.disabled = false;
          if (btn.textContent.includes('Procesando')) {
            btn.innerHTML = '<i class="fas fa-bolt me-1"></i> Puntual';
          }
        });
      }, 2000);
    });
  } else {
    ocultarCargando();
  }
}

// Exponer función para que sea accesible desde la interfaz
window.controlarPilonaPuntual = controlarPilonaPuntual;

// Funciones adicionales necesarias

// Función para mostrar login y ocultar navbar
function mostrarLogin() {
  // Si ya estamos redirigiendo, no hacer nada
  if (redirigiendo) return;
  
  redirigiendo = true;
  console.log('Redirigiendo a login...');
  
  // Limpiar sesión local
  localStorage.removeItem('sesion');
  localStorage.removeItem('sessionID');
  usuario = null;
  window.usuario = null;
  
  // Usar location.replace para evitar que el código continúe ejecutándose
  window.location.replace('/login.html');
}

// Función auxiliar para verificar si hay elementos de login en la página
function hayElementosLogin() {
  return document.getElementById('page-login') ||
         document.getElementById('form-login') || 
         document.getElementById('login-email') || 
         document.getElementById('login-password');
}

// Función para verificar elementos necesarios
function verificarElementosNecesarios() {
  // Si estamos en la página de login o siendo redirigidos, no verificar
  if (window.location.pathname === '/login.html' || window.location.pathname.endsWith('login.html')) {
    return true;
  }
  
  // Primero verificar que estamos en la página correcta
  const navbar = document.querySelector('.navbar');
  if (!navbar) {
    console.log('No se encontró el navbar, probablemente no estamos en index.html');
    return false;
  }
  
  const elementosRequeridos = [
    'page-dashboard',
    'tabla-pilonas',
    'mapa'
  ];
  
  let todosExisten = true;
  
  elementosRequeridos.forEach(id => {
    if (!document.getElementById(id)) {
      console.error(`Elemento requerido no encontrado: ${id}`);
      todosExisten = false;
    }
  });
  
  return todosExisten;
}

// Función para formatear fecha
function formatFecha(fecha) {
  if (!fecha) return '-';
  try {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES');
  } catch (e) {
    return fecha;
  }
}

// Función para formatear fecha y hora
function formatFechaHora(fecha) {
  if (!fecha) return '-';
  try {
    const date = new Date(fecha);
    return date.toLocaleString('es-ES');
  } catch (e) {
    return fecha;
  }
}

// Función para formatear rol
function formatRol(rol) {
  const roles = {
    'administrador': 'Administrador',
    'operador': 'Operador',
    'cliente': 'Cliente'
  };
  return roles[rol.toLowerCase()] || rol;
}

// Función para formatear acción
function formatAccion(accion) {
  const acciones = {
    'subir': 'Subir pilona',
    'bajar': 'Bajar pilona',
    'bloquear': 'Bloquear pilona',
    'desbloquear': 'Desbloquear pilona',
    'login': 'Inicio de sesión',
    'logout': 'Cierre de sesión'
  };
  return acciones[accion.toLowerCase()] || accion;
}

// Función para formatear coordenadas
function formatCoordenadas(lat, lng) {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

// Función para validar IP
function validarIP(ip) {
  const regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  return regex.test(ip);
}

// Función para mostrar errores de formulario
function mostrarErroresFormulario(errores) {
  const mensaje = errores.join('<br>');
  mostrarAlerta('error', mensaje);
}

// Función para cargar Leaflet y crear mapa
function cargarLeafletYCrearMapa() {
  // Cargar Leaflet dinámicamente si no está disponible
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  script.onload = function() {
    console.log('Leaflet cargado correctamente');
    
    // Crear el mapa una vez cargado Leaflet
    mapaP = L.map('mapa').setView([41.38, 2.16], 13);
    
    // Añadir capa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapaP);
    
    // Añadir marcadores
    actualizarMarcadores();
  };
  
  // Cargar también el CSS de Leaflet
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  
  document.head.appendChild(link);
  document.head.appendChild(script);
}

// Función para mostrar/ocultar cargando
function mostrarCargando() {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.remove('hidden');
  }
}

function ocultarCargando() {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.add('hidden');
  }
}

// Función para mostrar alertas
function mostrarAlerta(tipo, mensaje, autoDismiss = true) {
  // Si estamos redirigiendo, no mostrar alertas
  if (redirigiendo) return;
  
  // Buscar contenedor de alertas o crearlo
  let alertContainer = document.getElementById('alert-container');
  if (!alertContainer) {
    alertContainer = document.createElement('div');
    alertContainer.id = 'alert-container';
    alertContainer.style.position = 'fixed';
    alertContainer.style.top = '70px';
    alertContainer.style.right = '20px';
    alertContainer.style.zIndex = '9999';
    alertContainer.style.maxWidth = '350px';
    document.body.appendChild(alertContainer);
  }
  
  // Crear alerta
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${tipo === 'error' ? 'danger' : tipo} alert-dismissible fade show`;
  alertDiv.innerHTML = `
    ${mensaje}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `;
  
  alertContainer.appendChild(alertDiv);
  
  // Auto cerrar después de 5 segundos si autoDismiss es true
  if (autoDismiss) {
    setTimeout(() => {
      alertDiv.classList.remove('show');
      setTimeout(() => {
        alertDiv.remove();
      }, 150);
    }, 5000);
  }
}

// Función para verificar y mantener la conexión WebSocket
let intentosReconexion = 0;
const MAX_INTENTOS = 3;

function verificarConexionSocket() {
  if (!socket || !socket.connected) {
    if (intentosReconexion < MAX_INTENTOS) {
      intentosReconexion++;
      console.warn(`WebSocket no conectado, intento ${intentosReconexion}/${MAX_INTENTOS}`);
      
      if (!socket) {
        // Si no existe el socket, inicializarlo
        inicializarSocket();
      } else {
        // Si existe pero no está conectado, reconectar
        socket.connect();
      }
    }
  } else {
    // Si está conectado, resetear contador
    if (intentosReconexion > 0) {
      console.log('✅ Conexión WebSocket restaurada');
      intentosReconexion = 0;
    }
  }
}

// Verificar conexión cada 5 segundos
setInterval(verificarConexionSocket, 5000);

// Exponer funciones globalmente
window.controlarPilonaMapa = controlarPilonaMapa;
window.eliminarPilona = eliminarPilona;
window.mostrarModalPilona = mostrarModalPilona;
window.mostrarModalCambiarPassword = mostrarModalCambiarPassword;
window.mostrarModalPerfil = mostrarModalPerfil;

// Eliminar usuario
async function eliminarUsuario(id) {
  if (!id) {
    console.error('ID de usuario no válido para eliminar');
    return;
  }
  
  const confirmarIdElement = document.getElementById('confirmar-id');
  const confirmarTipoElement = document.getElementById('confirmar-tipo');
  
  if (confirmarIdElement && confirmarTipoElement) {
    confirmarIdElement.value = id;
    confirmarTipoElement.value = 'usuario';
  } else {
    console.error('Elementos de confirmación no encontrados');
    return;
  }
  
  const mensajeElement = document.getElementById('mensaje-confirmar');
  if (!mensajeElement) {
    console.error('Elemento de mensaje de confirmación no encontrado');
    return;
  }
  
  // Obtener información del usuario para mostrar en la confirmación
  try {
    const response = await fetch(`/api/usuarios/${id}`, {
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (response.ok) {
      const usuario = await response.json();
      if (usuario) {
        mensajeElement.textContent = `¿Estás seguro de que deseas eliminar el usuario "${usuario.NOMBRE} (${usuario.EMAIL})"? Esta acción no se puede deshacer.`;
      } else {
        mensajeElement.textContent = `¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.`;
      }
    } else {
      mensajeElement.textContent = `¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.`;
    }
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    mensajeElement.textContent = `¿Estás seguro de que deseas eliminar este usuario? Esta acción no se puede deshacer.`;
  }
  
  // Mostrar modal de confirmación
  const modalElement = document.getElementById('modal-confirmar');
  if (!modalElement) {
    console.error('Modal de confirmación no encontrado');
    return;
  }
  
  const modal = new bootstrap.Modal(modalElement);
  modal.show();
}

// Confirmar eliminación (usuario o pilona)
async function confirmarEliminar() {
  const idElement = document.getElementById('confirmar-id');
  const tipoElement = document.getElementById('confirmar-tipo');
  
  if (!idElement || !tipoElement) {
    mostrarAlerta('error', 'Error al procesar la solicitud');
    return;
  }
  
  const id = idElement.value;
  const tipo = tipoElement.value;
  
  if (!id || !tipo) {
    mostrarAlerta('error', 'Error al procesar la solicitud');
    return;
  }
  
  mostrarCargando();
  
  try {
    let url = '';
    if (tipo === 'usuario') {
      url = `/api/usuarios/${id}`;
    } else if (tipo === 'pilona') {
      url = `/api/pilonas/${id}`;
    } else {
      throw new Error('Tipo de eliminación no válido');
    }
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    const data = await response.json();
    
    if (response.ok) {
      mostrarAlerta('success', data.mensaje || 'Elemento eliminado correctamente');
      
      // Cerrar modal
      const modalElement = document.getElementById('modal-confirmar');
      if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
          modal.hide();
        }
      }
      
      // Recargar datos según el tipo
      if (tipo === 'usuario') {
        await obtenerUsuarios();
      } else if (tipo === 'pilona') {
        await obtenerPilonas();
      }
    } else {
      mostrarAlerta('error', data.error || 'Error al eliminar el elemento');
    }
  } catch (error) {
    console.error('Error en confirmarEliminar:', error);
    mostrarAlerta('error', 'Error de conexión con el servidor');
  } finally {
    ocultarCargando();
  }
}

// ===== Funciones de auditoría =====

// Función corregida para cargar registros de auditoría
async function cargarAuditoria() {
  mostrarCargando();
  
  try {
    // Construir parámetros de consulta
    const fechaInicio = document.getElementById('filtro-fecha-inicio')?.value || '';
    const fechaFin = document.getElementById('filtro-fecha-fin')?.value || '';
    const usuario = document.getElementById('filtro-usuario')?.value || '';
    
    let params = new URLSearchParams();
    if (fechaInicio) params.append('fechaInicio', fechaInicio);
    if (fechaFin) params.append('fechaFin', fechaFin);
    if (usuario) params.append('usuario', usuario);
    params.append('pagina', paginaAuditoria.pagina);
    params.append('porPagina', paginaAuditoria.porPagina);
    
    const response = await fetch(`/api/auditoria?${params.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('Registros de auditoría recibidos:', data);
      
      // Si la respuesta es un objeto con propiedad registros
      if (data && data.registros) {
        actualizarTablaAuditoria(data.registros);
        actualizarPaginacionAuditoria(data.total || data.registros.length);
      } 
      // Si la respuesta es un array directo
      else if (Array.isArray(data)) {
        actualizarTablaAuditoria(data);
        actualizarPaginacionAuditoria(data.length);
      }
      // Si la respuesta tiene otro formato, crear un array vacío
      else {
        console.error('Formato de respuesta de auditoría no reconocido:', data);
        actualizarTablaAuditoria([]);
        actualizarPaginacionAuditoria(0);
        mostrarAlerta('error', 'Error en el formato de datos de auditoría');
      }
    } else {
      // Manejar errores HTTP
      let errorMsg = 'Error al obtener registros de auditoría';
      try {
        const error = await response.json();
        errorMsg = error.error || errorMsg;
      } catch (e) {
        console.error('Error procesando respuesta de error:', e);
      }
      
      console.error('Error de respuesta:', response.status, errorMsg);
      actualizarTablaAuditoria([]);
      actualizarPaginacionAuditoria(0);
      mostrarAlerta('error', errorMsg);
    }
  } catch (error) {
    console.error('Error en cargarAuditoria:', error);
    actualizarTablaAuditoria([]);
    actualizarPaginacionAuditoria(0);
    mostrarAlerta('error', 'Error de conexión con el servidor');
  } finally {
    ocultarCargando();
  }
}

// Actualizar tabla de auditoría
function actualizarTablaAuditoria(registros) {
  const tabla = document.getElementById('tabla-auditoria');
  if (!tabla) {
    console.error('Tabla de auditoría no encontrada');
    return;
  }
  
  tabla.innerHTML = '';
  
  if (!registros || registros.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="5" class="text-center">No hay registros de auditoría</td>`;
    tabla.appendChild(tr);
    return;
  }
  
  registros.forEach(registro => {
    const tr = document.createElement('tr');
    
    tr.innerHTML = `
      <td>${formatFechaHora(registro.FECHA || registro.fecha || '')}</td>
      <td>${registro.USUARIO ? registro.USUARIO.NOMBRE : (registro.USUARIO_NOMBRE || '<span class="text-muted">Sistema</span>')}</td>
      <td>${formatAccion(registro.ACCION || registro.accion || '')}</td>
      <td>${registro.PILONA ? registro.PILONA.NOMBRE : (registro.PILONA_NOMBRE || '-')}</td>
      <td>${registro.IP || '-'}</td>
    `;
    
    tabla.appendChild(tr);
  });
}

// Actualizar paginación de auditoría
function actualizarPaginacionAuditoria(total) {
  const paginacion = document.getElementById('paginacion-auditoria');
  if (!paginacion) {
    console.error('Elemento de paginación no encontrado');
    return;
  }
  
  paginacion.innerHTML = '';
  
  paginaAuditoria.total = total;
  const totalPaginas = Math.ceil(total / paginaAuditoria.porPagina);
  
  if (totalPaginas <= 1) return;
  
  // Botón anterior
  const liAnterior = document.createElement('li');
  liAnterior.className = `page-item ${paginaAuditoria.pagina === 1 ? 'disabled' : ''}`;
  liAnterior.innerHTML = `<a class="page-link" href="#" data-pagina="${paginaAuditoria.pagina - 1}">Anterior</a>`;
  paginacion.appendChild(liAnterior);
  
  // Números de página
  let inicio = Math.max(1, paginaAuditoria.pagina - 2);
  let fin = Math.min(totalPaginas, inicio + 4);
  if (fin - inicio < 4) {
    inicio = Math.max(1, fin - 4);
  }
  
  for (let i = inicio; i <= fin; i++) {
    const li = document.createElement('li');
    li.className = `page-item ${paginaAuditoria.pagina === i ? 'active' : ''}`;
    li.innerHTML = `<a class="page-link" href="#" data-pagina="${i}">${i}</a>`;
    paginacion.appendChild(li);
  }
  
  // Botón siguiente
  const liSiguiente = document.createElement('li');
  liSiguiente.className = `page-item ${paginaAuditoria.pagina === totalPaginas ? 'disabled' : ''}`;
  liSiguiente.innerHTML = `<a class="page-link" href="#" data-pagina="${paginaAuditoria.pagina + 1}">Siguiente</a>`;
  paginacion.appendChild(liSiguiente);
  
  // Añadir eventos a los enlaces de paginación
  document.querySelectorAll('#paginacion-auditoria .page-link').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const pagina = parseInt(link.getAttribute('data-pagina'));
      if (pagina !== paginaAuditoria.pagina && pagina > 0 && pagina <= totalPaginas) {
        paginaAuditoria.pagina = pagina;
        cargarAuditoria();
      }
    });
  });
}

// Resetear filtros de auditoría
function resetFiltrosAuditoria() {
  const fechaInicioElement = document.getElementById('filtro-fecha-inicio');
  const fechaFinElement = document.getElementById('filtro-fecha-fin');
  const usuarioElement = document.getElementById('filtro-usuario');
  
  if (fechaInicioElement) fechaInicioElement.value = '';
  if (fechaFinElement) fechaFinElement.value = '';
  if (usuarioElement) usuarioElement.value = '';
  
  paginaAuditoria.pagina = 1;
  cargarAuditoria();
}

// Exportar registros de auditoría a CSV
async function exportarAuditoriaCSV() {
  mostrarCargando();
  
  try {
    // Construir parámetros de consulta para obtener todos los registros
    const fechaInicio = document.getElementById('filtro-fecha-inicio')?.value || '';
    const fechaFin = document.getElementById('filtro-fecha-fin')?.value || '';
    const usuario = document.getElementById('filtro-usuario')?.value || '';
    
    let params = new URLSearchParams();
    if (fechaInicio) params.append('fechaInicio', fechaInicio);
    if (fechaFin) params.append('fechaFin', fechaFin);
    if (usuario) params.append('usuario', usuario);
    params.append('formato', 'csv');
    
    const response = await fetch(`/api/auditoria/exportar?${params.toString()}`, {
      credentials: 'include'
    });
    
    if (!response.ok) {
      throw new Error(`Error al exportar CSV: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    // Crear un enlace de descarga
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    
    // Añadir al documento y hacer clic
    document.body.appendChild(a);
    a.click();
    
    // Limpiar
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 100);
    
    mostrarAlerta('success', 'CSV exportado correctamente');
  } catch (error) {
    console.error('Error exportando CSV:', error);
    mostrarAlerta('error', 'Error al exportar los datos');
  } finally {
    ocultarCargando();
  }
}

// Cargar usuarios para el filtro de auditoría
async function cargarUsuariosParaFiltro() {
  try {
    const response = await fetch('/api/usuarios', {
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (response.ok) {
      const usuarios = await response.json();
      const select = document.getElementById('filtro-usuario');
      
      if (!select) {
        console.error('Elemento select de filtro de usuario no encontrado');
        return;
      }
      
      // Mantener la opción "Todos"
      select.innerHTML = '<option value="">Todos</option>';
      
      usuarios.forEach(usuario => {
        const option = document.createElement('option');
        option.value = usuario.ID;
        option.textContent = usuario.NOMBRE;
        select.appendChild(option);
      });
    }
  } catch (error) {
    console.error('Error cargando usuarios para filtro:', error);
  }
}

// ===== Funciones de interfaz =====

// Inicializar conexión WebSocket
function inicializarSocket() {
  console.log('Inicializando conexión WebSocket...');
  
  // Si ya hay una conexión, desconectar primero
  if (socket) {
    console.log('Desconectando socket existente...');
    socket.disconnect();
    socket = null;
  }
  
  // Determinar la URL del servidor
  const protocol = window.location.protocol;
  const hostname = window.location.hostname;
  const port = window.location.port || (protocol === 'https:' ? '443' : '80');
  const socketUrl = `${protocol}//${hostname}:${port}`;
  
  console.log('Conectando a:', socketUrl);
  
  // Conectar al servidor de WebSocket
  socket = io(socketUrl, {
    transports: ['websocket', 'polling'],
    query: {
      sessionID: localStorage.getItem('sessionID') || ''
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: 10,
    timeout: 20000
  });
  
  // Evento de conexión exitosa
  socket.on('connect', () => {
    console.log('✅ WebSocket conectado correctamente');
    console.log('Socket ID:', socket.id);
    
    // Autenticar el socket con los datos del usuario
    if (usuario) {
      socket.emit('autenticar', usuario);
      console.log('Usuario autenticado en socket:', usuario.NOMBRE || usuario.nombre);
    }
  });
  
  // Evento de desconexión
  socket.on('disconnect', (reason) => {
    console.log('❌ WebSocket desconectado:', reason);
    
    // Si la desconexión no fue intencional, Socket.io intentará reconectar automáticamente
    if (reason === 'io server disconnect') {
      // El servidor forzó la desconexión, reconectar manualmente
      console.log('Servidor forzó desconexión, reconectando...');
      socket.connect();
    }
  });
  
  // Evento de error de conexión
  socket.on('connect_error', (error) => {
    console.error('Error de conexión WebSocket:', error.message);
    console.error('Tipo de error:', error.type);
    
    // Si es un error de CORS o similar, intentar con polling
    if (error.message.includes('CORS') || error.message.includes('xhr')) {
      console.log('Intentando con transporte polling...');
      socket.io.opts.transports = ['polling'];
    }
  });
  
  // Evento de error
  socket.on('error', (error) => {
    console.error('Error en WebSocket:', error);
  });
  
  // Evento de reconnect
  socket.on('reconnect', (attemptNumber) => {
    console.log(`✅ Reconectado después de ${attemptNumber} intentos`);
  });
  
  socket.on('reconnect_attempt', (attemptNumber) => {
    console.log(`Intento de reconexión #${attemptNumber}`);
  });
  
  socket.on('reconnect_failed', () => {
    console.error('❌ Falló la reconexión después de todos los intentos');
  });
  
  // IMPORTANTE: Evento de actualización de estado de pilona
  socket.on('actualizacion_pilona', (data) => {
    console.log('📡 Recibida actualización de pilona por WebSocket:', data);
    
    if (data && data.id && data.estado) {
      // Actualizar el estado de la pilona en el frontend
      const actualizado = actualizarEstadoPilona(data.id, data.estado);
      
      if (actualizado) {
        console.log(`✅ Estado de pilona ${data.id} actualizado a ${data.estado} desde WebSocket`);
        
        // Si hay información adicional de coils, mostrarla
        if (data.coils) {
          console.log('Información adicional de coils:', data.coils);
        }
      } else {
        console.warn(`⚠️ No se pudo actualizar pilona ${data.id} desde WebSocket`);
      }
    } else {
      console.error('Datos de actualización de pilona incompletos:', data);
    }
  });
  
  // Evento de monitorización pausada
  socket.on('monitorizacion-pausada', (data) => {
    console.log('Monitorización pausada para IP:', data.ip);
    mostrarAlerta('info', `Monitorización pausada temporalmente para pilonas en IP ${data.ip}`);
  });
  
  // Evento de monitorización reanudada
  socket.on('monitorizacion-reanudada', (data) => {
    console.log('Monitorización reanudada para IP:', data.ip);
    mostrarAlerta('info', `Monitorización reanudada para pilonas en IP ${data.ip}`);
  });
  
  console.log('Listeners de WebSocket configurados correctamente');
  
  // Verificar estado de conexión después de configurar
  setTimeout(() => {
    console.log('Estado del socket:', socket.connected ? 'Conectado' : 'Desconectado');
    if (!socket.connected) {
      console.log('Forzando conexión...');
      socket.connect();
    }
  }, 100);
}

// Función mejorada para iniciar sesión
function iniciarSesion() {
  console.log('Iniciando sesión con usuario:', usuario);
  
  // Verificar que tenemos datos de usuario
  if (!usuario) {
    console.error('No hay datos de usuario para iniciar sesión');
    mostrarLogin();
    return;
  }
  
  try {
    // Siempre asegurarse de que no hay clases que oculten elementos cuando hay sesión
    document.body.classList.remove('login-page');
    
    // Asegurarse de que el navbar esté visible
    const navbar = document.querySelector('.navbar');
    if (navbar) {
      navbar.classList.remove('hidden');
      navbar.style.display = 'flex';
      navbar.style.visibility = 'visible';
    }
    
    // Mostrar nombre de usuario en el navbar
    const usuarioNavbarElement = document.getElementById('usuario-nombre-navbar');
    if (usuarioNavbarElement) {
      const nombreMostrar = usuario.NOMBRE || usuario.nombre || 'Usuario';
      usuarioNavbarElement.textContent = nombreMostrar;
      console.log('Nombre de usuario establecido en la interfaz:', nombreMostrar);
    } else {
      console.error('Elemento usuario-nombre-navbar no encontrado en navbar');
    }
    
    // Configurar elementos según el rol
    configurarInterfazSegunRol();
    
    // Usar el nuevo WebSocket Manager si está disponible
    if (window.wsManager) {
      console.log('Usando WebSocket Manager mejorado');
      
      // Configurar listeners
      window.wsManager.on('connect', (data) => {
        console.log('WebSocket conectado, ID:', data.socketId);
      });
      
      window.wsManager.on('disconnect', (data) => {
        console.log('WebSocket desconectado:', data.reason);
        mostrarAlerta('warning', 'Conexión perdida. Intentando reconectar...', false);
      });
      
      window.wsManager.on('reconnect', (data) => {
        console.log('WebSocket reconectado');
        mostrarAlerta('success', 'Conexión restaurada');
      });
      
      window.wsManager.on('actualizacion_pilona', (data) => {
        console.log('📡 Actualización de pilona:', data);
        if (data && data.id && data.estado) {
          actualizarEstadoPilona(data.id, data.estado);
        }
      });
      
      window.wsManager.on('monitorizacion-pausada', (data) => {
        console.log('Monitorización pausada para IP:', data.ip);
        mostrarAlerta('info', `Monitorización pausada temporalmente para pilonas en IP ${data.ip}`);
      });
      
      window.wsManager.on('monitorizacion-reanudada', (data) => {
        console.log('Monitorización reanudada para IP:', data.ip);
        mostrarAlerta('info', `Monitorización reanudada para pilonas en IP ${data.ip}`);
      });
      
      // Inicializar conexión
      window.wsManager.inicializar(usuario);
      
      // Hacer accesible globalmente para compatibilidad
      socket = window.wsManager.socket;
    } else {
      // Fallback al sistema anterior
      console.log('WebSocket Manager no disponible, usando sistema anterior');
      inicializarSocket();
    }
    
    // Obtener datos iniciales
    console.log('Obteniendo datos iniciales de pilonas...');
    obtenerPilonas();
    
    // Cambiar a la página de dashboard
    cambiarPagina('dashboard');
    
    console.log('Sesión iniciada correctamente');
  } catch (error) {
    console.error('Error general iniciando sesión:', error);
    mostrarAlerta('error', 'Error iniciando sesión. Por favor, recargue la página.');
  }
}

// Configurar interfaz según el rol del usuario
function configurarInterfazSegunRol() {
  if (!usuario) {
    console.error('No hay usuario para configurar interfaz');
    return;
  }
  
  // Ocultar todos los elementos específicos de rol
  document.querySelectorAll('.admin-only, .operator-only').forEach(el => {
    el.classList.add('hidden');
  });
  
  // Mostrar elementos según el rol
  // Normalizar el nombre del rol (mayúsculas/minúsculas)
  const rol = (usuario.ROL || usuario.rol || '').toLowerCase();
  
  if (rol === 'administrador') {
    document.querySelectorAll('.admin-only').forEach(el => {
      el.classList.remove('hidden');
    });
    
    document.querySelectorAll('.operator-only').forEach(el => {
      el.classList.remove('hidden');
    });
  } else if (rol === 'operador') {
    document.querySelectorAll('.operator-only').forEach(el => {
      el.classList.remove('hidden');
    });
  }
  
  console.log('Interfaz configurada para rol:', rol);
}

// Cambiar de página
function cambiarPagina(pagina) {
  console.log('Cambiando a página:', pagina);
  
  // Si estamos en la página de login, no hacer nada
  if (window.location.pathname === '/login.html') {
    console.log('Estamos en login.html, no se puede cambiar de página');
    return;
  }
  
  // Limpiar cualquier modal abierto antes de cambiar de página
  if (typeof window.limpiarModales === 'function') {
    window.limpiarModales();
  }
  
  // Ocultar todas las páginas
  document.querySelectorAll('[id^="page-"]').forEach(el => {
    el.classList.add('hidden');
  });
  
  // Mostrar la página solicitada
  const paginaElement = document.getElementById(`page-${pagina}`);
  if (paginaElement) {
    paginaElement.classList.remove('hidden');
  } else {
    console.error(`No se encontró la página: page-${pagina}`);
    return;
  }
  
  // Marcar la pestaña activa
  document.querySelectorAll('.nav-link').forEach(el => {
    el.classList.remove('active');
  });
  
  const activeTab = document.querySelector(`.nav-link[data-page="${pagina}"]`);
  if (activeTab) {
    activeTab.classList.add('active');
  }
  
  // Acciones específicas según la página
  switch (pagina) {
    case 'dashboard':
      console.log('Inicializando dashboard...');
      setTimeout(() => {
        inicializarMapa();
      }, 100);
      break;
    case 'control':
      setTimeout(() => {
        inicializarMapaControl();
        actualizarTablaControlPilonas();
      }, 100);
      break;
    case 'pilonas':
      obtenerPilonas();
      // La función obtenerPilonas ya actualiza la tabla
      break;
    case 'usuarios':
      console.log('Cargando página de usuarios...');
      if (typeof cargarUsuariosMejorado === 'function') {
        console.log('Llamando a cargarUsuariosMejorado...');
        cargarUsuariosMejorado();
      } else if (typeof cargarUsuarios === 'function') {
        console.log('Llamando a cargarUsuarios...');
        cargarUsuarios();
      } else {
        console.log('Llamando a obtenerUsuarios...');
        obtenerUsuarios();
      }
      break;
    case 'zonas':
      if (typeof cargarZonas === 'function') {
        cargarZonas();
      }
      break;
    case 'auditoria':
      cargarAuditoria();
      cargarUsuariosParaFiltro();
      break;
    case 'calendario':
      console.log('Cambiando a página de calendario...');
      
      // Asegurar que el caché global esté inicializado antes de cargar el calendario
      if (window.GlobalCache && !window.GlobalCache.initialized) {
        console.log('Inicializando caché global antes de cargar calendario...');
        window.GlobalCache.init().then(() => {
          console.log('Caché global inicializado, cargando calendario...');
          cargarCalendarioUI();
        }).catch(err => {
          console.error('Error inicializando caché global:', err);
          cargarCalendarioUI(); // Cargar de todos modos
        });
      } else {
        cargarCalendarioUI();
      }
      break;
  }
  
  // Función auxiliar para cargar el calendario UI
  function cargarCalendarioUI() {
    if (typeof window.calendarioUI !== 'undefined' && window.calendarioUI.init) {
      // Esperar un poco para asegurar que el DOM esté listo
      setTimeout(() => {
        console.log('Inicializando calendario UI...');
        window.calendarioUI.init();
        
        // Agregar event listeners para las pestañas del calendario
        const tabLogs = document.querySelector('button[data-bs-target="#tab-logs"]');
        if (tabLogs) {
          tabLogs.addEventListener('shown.bs.tab', () => {
            if (window.calendarioUI.cargarLogsProgramacion) {
              window.calendarioUI.cargarLogsProgramacion();
            }
          });
        }
      }, 200);
    } else {
      console.error('Módulo de calendario no cargado');
      console.log('window.calendarioUI:', window.calendarioUI);
    }
  }
}

// Función mejorada para actualizar la vista de pilonas
function actualizarVistaPilonas() {
  console.log('Actualizando vista de pilonas. Total:', pilonas?.length || 0);
  
  // Verificar que existen pilonas antes de actualizar
  if (!pilonas || pilonas.length === 0) {
    console.warn('No hay pilonas para mostrar');
    
    // Mostrar mensajes de "no hay pilonas" en todas las tablas
    const mensaje = '<tr><td colspan="6" class="text-center">No hay pilonas disponibles</td></tr>';
    
    const tablaPilonas = document.getElementById('tabla-pilonas');
    if (tablaPilonas) tablaPilonas.innerHTML = mensaje;
    
    const tablaControlPilonas = document.getElementById('tabla-control-pilonas');
    if (tablaControlPilonas) tablaControlPilonas.innerHTML = mensaje;
    
    const tablaConfigPilonas = document.getElementById('tabla-config-pilonas');
    if (tablaConfigPilonas) tablaConfigPilonas.innerHTML = mensaje;
    
    // Actualizar estadísticas con ceros
    actualizarEstadisticasVacias();
    return;
  }
  
  try {
    // Actualizar cada componente con manejo de errores para cada uno
    try { actualizarTablaPilonas(); } 
    catch (e) { console.error('Error actualizando tabla pilonas:', e); }
    
    try { 
      if (mapaP) {
        actualizarMarcadores();
      } else {
        console.warn('Mapa principal no inicializado para actualizar marcadores');
      }
    } catch (e) { 
      console.error('Error actualizando marcadores:', e); 
    }
    
    if (mapaControl) {
      try { actualizarMarcadoresControl(); } 
      catch (e) { console.error('Error actualizando marcadores de control:', e); }
      
      try { actualizarTablaControlPilonas(); } 
      catch (e) { console.error('Error actualizando tabla control pilonas:', e); }
    }
    
    try { actualizarTablaConfigPilonas(); } 
    catch (e) { console.error('Error actualizando tabla config pilonas:', e); }
    
    try { actualizarEstadisticas(); } 
    catch (e) { console.error('Error actualizando estadísticas:', e); }
    
    console.log('Vistas de pilonas actualizadas correctamente');
  } catch (error) {
    console.error('Error general actualizando vistas:', error);
  }
}

// Función para actualizar estadísticas cuando no hay pilonas
function actualizarEstadisticasVacias() {
  const countSubidas = document.getElementById('count-subidas');
  const countBajadas = document.getElementById('count-bajadas');
  const countBloqueadas = document.getElementById('count-bloqueadas');
  const countError = document.getElementById('count-error');
  
  if (countSubidas) countSubidas.textContent = '0';
  if (countBajadas) countBajadas.textContent = '0';
  if (countBloqueadas) countBloqueadas.textContent = '0';
  if (countError) countError.textContent = '0';
}

// Actualizar tabla de pilonas en el dashboard
function actualizarTablaPilonas() {
  const tabla = document.getElementById('tabla-pilonas');
  if (!tabla) {
    console.error('No se encontró la tabla de pilonas');
    return;
  }
  
  tabla.innerHTML = '';
  
  if (!pilonas || pilonas.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="3" class="text-center">No hay pilonas configuradas</td>`;
    tabla.appendChild(tr);
    return;
  }
  
  pilonas.forEach(pilona => {
    const tr = document.createElement('tr');
    const nombre = pilona.nombre || pilona.NOMBRE || 'Sin nombre';
    const estado = pilona.estado || pilona.ESTADO || 'error';
    const id = pilona.id || pilona.ID || 0;
    const rol = usuario.ROL || usuario.rol || '';
    
    tr.innerHTML = `
      <td>
        <div class="d-flex align-items-center">
          <div class="pilona-icon" style="background-color: ${estadoColores[estado]};">${nombre.substring(0, 1)}</div>
          ${nombre}
        </div>
      </td>
      <td><span class="badge ${estadoClases[estado]}">${estadoTexto[estado]}</span></td>
      <td>
        <div class="btn-group btn-group-sm">
          <button class="btn-bajar-pilona btn btn-success" data-id="${id}" ${estado === 'bajada' || estado.includes('bloqueada') ? 'disabled' : ''}>
            <i class="fas fa-arrow-down"></i>
          </button>
          ${rol.toLowerCase() !== 'cliente' ? `
            <button class="btn-subir-pilona btn btn-danger" data-id="${id}" ${estado === 'subida' || estado.includes('bloqueada') ? 'disabled' : ''}>
              <i class="fas fa-arrow-up"></i>
            </button>
          ` : ''}
        </div>
      </td>
    `;
    
    tabla.appendChild(tr);
  });
  
  // Añadir event listeners a los botones
  tabla.querySelectorAll('.btn-bajar-pilona').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      controlarPilonaMapa(id, 'bajar');
    });
  });
  
  tabla.querySelectorAll('.btn-subir-pilona').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      controlarPilonaMapa(id, 'subir');
    });
  });
}

// Actualizar estadísticas
function actualizarEstadisticas() {
  if (!pilonas) return;
  
  // Elementos de contador
  const countSubidas = document.getElementById('count-subidas');
  const countBajadas = document.getElementById('count-bajadas');
  const countBloqueadas = document.getElementById('count-bloqueadas');
  const countError = document.getElementById('count-error');
  
  if (!countSubidas || !countBajadas || !countBloqueadas || !countError) {
    console.warn('No se encontraron todos los contadores de estadísticas');
    return;
  }
  
  // Contar pilonas por estado
  const contadores = {
    subidas: 0,
    bajadas: 0,
    bloqueadas: 0,
    error: 0
  };
  
  pilonas.forEach(pilona => {
    const estado = pilona.estado || pilona.ESTADO || 'error';
    if (estado === 'subida') {
      contadores.subidas++;
    } else if (estado === 'bajada') {
      contadores.bajadas++;
    } else if (estado.includes('bloqueada')) {
      contadores.bloqueadas++;
    } else {
      contadores.error++;
    }
  });
  
  // Actualizar contadores en la interfaz
  countSubidas.textContent = contadores.subidas;
  countBajadas.textContent = contadores.bajadas;
  countBloqueadas.textContent = contadores.bloqueadas;
  countError.textContent = contadores.error;
}

// Función mejorada para actualizar el estado de una pilona
function actualizarEstadoPilona(id, nuevoEstado) {
  console.log(`Actualizando estado de pilona ${id} a: ${nuevoEstado}`);
  
  // Verificar parámetros
  if (!id || !nuevoEstado) {
    console.error('ID o estado no válidos para actualizar pilona');
    return false;
  }
  
  // Verificar que pilonas es un array
  if (!Array.isArray(pilonas)) {
    console.error('No hay pilonas cargadas para actualizar');
    return false;
  }
  
  // Actualizar en el array de pilonas
  const index = pilonas.findIndex(p => {
    const pilonaId = p.id || p.ID;
    return pilonaId == id; // Usar == para comparar string con number si es necesario
  });
  
  if (index !== -1) {
    console.log(`Pilona encontrada en índice ${index}, actualizando estado de ${pilonas[index].estado || pilonas[index].ESTADO} a ${nuevoEstado}`);
    
    // Actualizar el estado usando ambas propiedades para compatibilidad
    pilonas[index].estado = nuevoEstado;
    pilonas[index].ESTADO = nuevoEstado;
    
    // Actualizar vistas después de cambio de estado
    try {
      actualizarVistaPilonas();
    } catch (error) {
      console.error('Error actualizando vistas después de cambio de estado:', error);
    }
    
    // Si es la pilona seleccionada, actualizar panel de control
    if (pilonaSeleccionada == id) {
      try {
        seleccionarPilona(id);
      } catch (error) {
        console.error('Error actualizando panel de control:', error);
      }
    }
    
    console.log(`Estado de pilona ${id} actualizado correctamente a ${nuevoEstado}`);
    return true;
  } else {
    console.error(`No se encontró la pilona con ID ${id} para actualizar estado`);
    return false;
  }
}

// Inicializar mapa principal
function inicializarMapa() {
  console.log('Inicializando mapa principal...');
  
  const mapaElement = document.getElementById('mapa');
  if (!mapaElement) {
    console.error('No se encontró el elemento del mapa');
    return;
  }
  
  try {
    if (mapaP) {
      // Si el mapa ya existe, solo actualizar tamaño y marcadores
      mapaP.invalidateSize();
      actualizarMarcadores();
      return;
    }
    
    // Verificar que Leaflet está disponible
    if (typeof L === 'undefined') {
      console.error('Leaflet no está disponible. Cargando dinámicamente...');
      cargarLeafletYCrearMapa();
      return;
    }
    
    // Crear nuevo mapa centrado en Barcelona
    mapaP = L.map('mapa').setView([41.38, 2.16], 13);
    
    // Añadir capa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapaP);
    
    console.log('Mapa principal inicializado');
    
    // Añadir marcadores después de un pequeño retraso
    setTimeout(() => {
      actualizarMarcadores();
    }, 200);
  } catch (error) {
    console.error('Error al inicializar mapa principal:', error);
    mostrarAlerta('error', 'Error al inicializar el mapa. Por favor, recargue la página.');
  }
}

// Cargar Leaflet y crear mapa de control
function cargarLeafletYCrearMapaControl() {
  // Cargar Leaflet dinámicamente si no está disponible
  const script = document.createElement('script');
  script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
  script.onload = function() {
    console.log('Leaflet cargado correctamente');
    
    // Crear el mapa una vez cargado Leaflet
    mapaControl = L.map('mapa-control').setView([41.38, 2.16], 13);
    
    // Añadir capa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapaControl);
    
    // Añadir marcadores
    actualizarMarcadoresControl();
  };
  
  // Cargar también el CSS de Leaflet
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
  
  document.head.appendChild(link);
  document.head.appendChild(script);
}

// Actualizar marcadores en el mapa principal
function actualizarMarcadores() {
  console.log('Actualizando marcadores en el mapa...');
  
  if (!mapaP) {
    console.error('El mapa principal no está inicializado');
    return;
  }
  
  // Limpiar marcadores existentes
  try {
    Object.values(markers).forEach(marker => {
      if (mapaP.hasLayer(marker)) {
        mapaP.removeLayer(marker);
      }
    });
    markers = {};
  } catch (error) {
    console.error('Error limpiando marcadores:', error);
  }
  
  // Comprobar si hay pilonas
  if (!pilonas || pilonas.length === 0) {
    console.warn('No hay pilonas para mostrar en el mapa');
    return;
  }
  
  console.log(`Agregando ${pilonas.length} marcadores al mapa principal`);
  
  // Crear nuevos marcadores
  const bounds = [];
  let marcadoresAgregados = 0;
  
  pilonas.forEach(pilona => {
    // Convertir a número si viene como string
    const lat = parseFloat(pilona.latitud || pilona.LATITUD);
    const lng = parseFloat(pilona.longitud || pilona.LONGITUD);
    
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      console.warn(`Pilona ${pilona.nombre || pilona.NOMBRE || 'Sin nombre'} no tiene coordenadas válidas:`, lat, lng);
      return;
    }
    
    try {
      const estado = pilona.estado || pilona.ESTADO || 'error';
      const nombre = pilona.nombre || pilona.NOMBRE || 'Sin nombre';
      const id = pilona.id || pilona.ID;
      
      // Añadir icono de candado para estados bloqueados
      const estaBloqueada = estado.includes('bloqueada');
      const esDesconocido = estado === 'desconocido';
      const sinComunicacion = estado === 'sin_comunicacion';
      
      // Determinar el contenido del marcador
      let contenidoMarcador = nombre.substring(0, 1);
      if (esDesconocido || sinComunicacion) {
        contenidoMarcador = '?';
      }
      
      // Determinar si hay fallo
      const esFallo = estado === 'fallo_arriba';
      const claseAdicional = esFallo ? 'pilona-marker-fallo' : '';
      
      const iconHtml = `
        <div class="pilona-marker ${claseAdicional}" style="background-color: ${estadoColores[estado]};">
          ${contenidoMarcador}
          ${estaBloqueada ? '<i class="fas fa-lock" style="position:absolute; top:-5px; right:-5px; font-size:10px; background:white; border-radius:50%; padding:2px; color:black;"></i>' : ''}
          ${esFallo ? '<i class="fas fa-exclamation-triangle" style="position:absolute; bottom:-5px; right:-5px; font-size:10px; background:yellow; border-radius:50%; padding:2px; color:red;"></i>' : ''}
        </div>
      `;
      
      const pilonaIcon = L.divIcon({
        html: iconHtml,
        className: '',
        iconSize: [32, 32]
      });
      
      const isClienteRole = (usuario.rol || usuario.ROL || '').toLowerCase() === 'cliente';
      
      let popupContent = `
        <strong>${nombre}</strong><br>
        Estado: <span class="${estadoClases[estado]} badge">${estadoTexto[estado]}${estaBloqueada ? ' <i class="fas fa-lock ml-1"></i>' : ''}</span><br>
        ${!isClienteRole ? `IP: ${pilona.direccionIP || pilona.DIRECCION_IP || 'desconocida'}<br>` : ''}
      `;
      
      // Añadir botones según el rol
      if (isClienteRole) {
        popupContent += `
          <button class="btn btn-success mt-2 btn-bajar-popup" data-id="${id}"${estaBloqueada ? ' disabled' : ''}>
            <i class="fas fa-arrow-down"></i> Bajar Pilona
          </button>
        `;
      } else {
        popupContent += `
          <div class="btn-group mt-2">
            <button class="btn btn-success btn-bajar-popup" data-id="${id}" ${estado === 'bajada' || estado.includes('bloqueada') ? 'disabled' : ''}>
              <i class="fas fa-arrow-down"></i>
            </button>
            <button class="btn btn-danger btn-subir-popup" data-id="${id}" ${estado === 'subida' || estado.includes('bloqueada') ? 'disabled' : ''}>
              <i class="fas fa-arrow-up"></i>
            </button>
          </div>
        `;
      }
      
      const marker = L.marker([lat, lng], { icon: pilonaIcon })
        .addTo(mapaP)
        .bindPopup(popupContent);
      
      // Añadir event listeners cuando se abre el popup
      marker.on('popupopen', (e) => {
        const popup = e.target.getPopup();
        const container = popup.getElement();
        
        const btnBajar = container.querySelector('.btn-bajar-popup');
        if (btnBajar) {
          btnBajar.addEventListener('click', () => {
            const id = btnBajar.getAttribute('data-id');
            controlarPilonaMapa(id, 'bajar');
          });
        }
        
        const btnSubir = container.querySelector('.btn-subir-popup');
        if (btnSubir) {
          btnSubir.addEventListener('click', () => {
            const id = btnSubir.getAttribute('data-id');
            controlarPilonaMapa(id, 'subir');
          });
        }
      });
      
      markers[id] = marker;
      bounds.push([lat, lng]);
      marcadoresAgregados++;
    } catch (error) {
      console.error(`Error creando marcador para pilona ${pilona.nombre || pilona.NOMBRE || 'Sin nombre'}:`, error);
    }
  });
  
  console.log(`Se agregaron ${marcadoresAgregados} marcadores al mapa principal`);
  
  // Ajustar vista si hay marcadores
  if (bounds.length > 0) {
    try {
      mapaP.fitBounds(bounds);
      console.log('Vista del mapa principal ajustada a los marcadores');
    } catch (error) {
      console.error('Error ajustando vista del mapa:', error);
      // En caso de error, centrar en Barcelona
      mapaP.setView([41.38, 2.16], 13);
    }
  } else {
    console.warn('No se pudieron añadir marcadores con coordenadas válidas');
    // Centrar en Barcelona
    mapaP.setView([41.38, 2.16], 13);
  }
}
function inicializarMapaControl() {
  console.log('Inicializando mapa de control...');
  
  const mapaElement = document.getElementById('mapa-control');
  if (!mapaElement) {
    console.error('No se encontró el elemento del mapa de control');
    return;
  }
  
  try {
    if (mapaControl) {
      // Si el mapa ya existe, solo actualizar
      mapaControl.invalidateSize();
      actualizarMarcadoresControl();
      return;
    }
    
    // Verificar que Leaflet está disponible
    if (typeof L === 'undefined') {
      console.error('Leaflet no está disponible. Cargando dinámicamente...');
      cargarLeafletYCrearMapaControl();
      return;
    }
    
    // Crear mapa
    mapaControl = L.map('mapa-control').setView([41.38, 2.16], 13);
    
    // Añadir capa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapaControl);
    
    console.log('Mapa de control inicializado');
    
    // Añadir marcadores
    setTimeout(() => {
      actualizarMarcadoresControl();
    }, 200);
  } catch (error) {
    console.error('Error al inicializar mapa de control:', error);
    mostrarAlerta('error', 'Error al inicializar el mapa de control');
  }
}

// Inicializar mapa para selección de ubicación
function inicializarMapaSeleccion() {
  const mapaElement = document.getElementById('mapa-seleccion');
  if (!mapaElement) {
    console.error('Elemento de mapa de selección no encontrado');
    return;
  }
  
  try {
    // Obtener coordenadas actuales del formulario
    const latitud = parseFloat(document.getElementById('pilona-latitud').value) || 41.3851;
    const longitud = parseFloat(document.getElementById('pilona-longitud').value) || 2.1734;
    
    // Si ya hay un mapa, solo actualizar
    if (mapaSeleccion) {
      mapaSeleccion.setView([latitud, longitud], 13);
      if (mapaSeleccion._marcador) {
        mapaSeleccion._marcador.setLatLng([latitud, longitud]);
      } else {
        // Crear un icono personalizado más visible
        const pilonaIcon = L.divIcon({
          html: `<div style="background-color: #ff4444; color: white; border: 3px solid white; border-radius: 50%; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 0 5px rgba(0,0,0,0.3);">P</div>`,
          className: '',
          iconSize: [35, 35],
          iconAnchor: [17, 17]
        });
        
        mapaSeleccion._marcador = L.marker([latitud, longitud], { 
          draggable: true,
          icon: pilonaIcon
        })
        .addTo(mapaSeleccion)
        .on('dragend', actualizarCoordenadas);
      }
      
      // Invalidar tamaño para asegurar renderizado correcto
      setTimeout(() => {
        mapaSeleccion.invalidateSize();
      }, 100);
      
      return;
    }
    
    // Crear nuevo mapa
    mapaSeleccion = L.map('mapa-seleccion').setView([latitud, longitud], 13);
    
    // Añadir capa de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(mapaSeleccion);
    
    // Crear un icono personalizado más visible
    const pilonaIcon = L.divIcon({
      html: `<div style="background-color: #ff4444; color: white; border: 3px solid white; border-radius: 50%; width: 35px; height: 35px; display: flex; align-items: center; justify-content: center; font-weight: bold; box-shadow: 0 0 5px rgba(0,0,0,0.3);">P</div>`,
      className: '',
      iconSize: [35, 35],
      iconAnchor: [17, 17]
    });
    
    // Añadir marcador arrastrable con icono personalizado
    mapaSeleccion._marcador = L.marker([latitud, longitud], { 
      draggable: true,
      icon: pilonaIcon
    })
    .addTo(mapaSeleccion)
    .on('dragend', actualizarCoordenadas);
    
    // Permitir clic en el mapa para colocar el marcador
    mapaSeleccion.on('click', (e) => {
      mapaSeleccion._marcador.setLatLng(e.latlng);
      actualizarCoordenadas();
    });
    
    // Invalidar tamaño para asegurar renderizado correcto
    setTimeout(() => {
      mapaSeleccion.invalidateSize();
    }, 100);
    
    console.log('Mapa de selección inicializado correctamente');
  } catch (error) {
    console.error('Error al inicializar mapa de selección:', error);
    mostrarAlerta('error', 'Error al inicializar el mapa de selección');
  }
}

// Actualizar marcadores en el mapa de control
function actualizarMarcadoresControl() {
  console.log('Actualizando marcadores en el mapa de control...');
  
  if (!mapaControl) {
    console.error('Mapa de control no inicializado');
    return;
  }
  
  // Limpiar marcadores existentes
  try {
    mapaControl.eachLayer(layer => {
      if (layer instanceof L.Marker) {
        mapaControl.removeLayer(layer);
      }
    });
  } catch (error) {
    console.error('Error limpiando marcadores de control:', error);
  }
  
  // Comprobar si hay pilonas
  if (!pilonas || pilonas.length === 0) {
    console.warn('No hay pilonas para mostrar en el mapa de control');
    return;
  }
  
  console.log(`Agregando ${pilonas.length} marcadores al mapa de control`);
  
  // Crear nuevos marcadores
  const bounds = [];
  let marcadoresAgregados = 0;
  
  pilonas.forEach(pilona => {
    // Convertir a número si viene como string
    const lat = parseFloat(pilona.latitud || pilona.LATITUD);
    const lng = parseFloat(pilona.longitud || pilona.LONGITUD);
    
    if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
      console.warn(`Pilona ${pilona.nombre || pilona.NOMBRE || 'Sin nombre'} no tiene coordenadas válidas para mapa de control:`, lat, lng);
      return;
    }
    
    try {
      const estado = pilona.estado || pilona.ESTADO || 'error';
      const nombre = pilona.nombre || pilona.NOMBRE || 'Sin nombre';
      const id = pilona.id || pilona.ID;
      
      // Añadir icono de candado para estados bloqueados
      const estaBloqueada = estado.includes('bloqueada');
      const esFallo = estado === 'fallo_arriba';
      const claseAdicional = esFallo ? 'pilona-marker-fallo' : '';
      
      const iconHtml = `
        <div class="pilona-marker ${claseAdicional}" style="background-color: ${estadoColores[estado]};">
          ${nombre.substring(0, 1)}
          ${estaBloqueada ? '<i class="fas fa-lock" style="position:absolute; top:-5px; right:-5px; font-size:10px; background:white; border-radius:50%; padding:2px; color:black;"></i>' : ''}
          ${esFallo ? '<i class="fas fa-exclamation-triangle" style="position:absolute; bottom:-5px; right:-5px; font-size:10px; background:yellow; border-radius:50%; padding:2px; color:red;"></i>' : ''}
        </div>
      `;
      
      const pilonaIcon = L.divIcon({
        html: iconHtml,
        className: '',
        iconSize: [32, 32]
      });
      
      const marker = L.marker([lat, lng], { icon: pilonaIcon })
        .addTo(mapaControl)
        .on('click', () => {
          seleccionarPilona(id);
        });
        
      bounds.push([lat, lng]);
      marcadoresAgregados++;
    } catch (error) {
      console.error(`Error creando marcador de control para pilona ${pilona.nombre || pilona.NOMBRE || 'Sin nombre'}:`, error);
    }
  });
  
  console.log(`Se agregaron ${marcadoresAgregados} marcadores al mapa de control`);
  
  // Ajustar vista si hay marcadores
  if (bounds.length > 0) {
    try {
      mapaControl.fitBounds(bounds);
      console.log('Vista del mapa de control ajustada a los marcadores');
    } catch (error) {
      console.error('Error ajustando vista del mapa de control:', error);
      // En caso de error, centrar en Barcelona
      mapaControl.setView([41.38, 2.16], 13);
    }
  } else {
    console.warn('No se pudieron añadir marcadores con coordenadas válidas al mapa de control');
    // Centrar en Barcelona
    mapaControl.setView([41.38, 2.16], 13);
  }
}

// Actualizar tabla de control de pilonas
function actualizarTablaControlPilonas() {
  const tabla = document.getElementById('tabla-control-pilonas');
  if (!tabla) {
    console.error('Tabla de control de pilonas no encontrada');
    return;
  }
  
  tabla.innerHTML = '';
  
  if (!pilonas || pilonas.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="5" class="text-center">No hay pilonas configuradas</td>`;
    tabla.appendChild(tr);
    return;
  }
  
  pilonas.forEach(pilona => {
    const tr = document.createElement('tr');
    const id = pilona.id || pilona.ID;
    tr.setAttribute('data-id', id);
    
    const nombre = pilona.nombre || pilona.NOMBRE || 'Sin nombre';
    const estado = pilona.estado || pilona.ESTADO || 'error';
    const lat = parseFloat(pilona.latitud || pilona.LATITUD);
    const lng = parseFloat(pilona.longitud || pilona.LONGITUD);
    const ip = pilona.direccionIP || pilona.DIRECCION_IP || 'desconocida';
    
    tr.innerHTML = `
      <td>
        <div class="d-flex align-items-center">
         <div class="pilona-icon" style="background-color: ${estadoColores[estado]};">${nombre.substring(0, 1)}</div>
          ${nombre}
        </div>
      </td>
      <td>${lat && lng && !isNaN(lat) && !isNaN(lng) ? formatCoordenadas(lat, lng) : 'No definida'}</td>
      <td><span class="badge ${estadoClases[estado]}">${estadoTexto[estado]}</span></td>
      <td>${ip}</td>
      <td>
        <button class="btn btn-sm btn-primary btn-control-pilona" data-id="${id}">
          <i class="fas fa-sliders-h"></i> Control
        </button>
      </td>
    `;
    
    tabla.appendChild(tr);
  });
  
  // Añadir event listeners
  tabla.querySelectorAll('.btn-control-pilona').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      seleccionarPilona(id);
    });
  });
  
  // Si hay una pilona seleccionada, marcar su fila
  if (pilonaSeleccionada) {
    const filaSeleccionada = tabla.querySelector(`tr[data-id="${pilonaSeleccionada}"]`);
    if (filaSeleccionada) {
      filaSeleccionada.classList.add('table-active');
    }
  }
}

// Actualizar tabla de configuración de pilonas (admin)
function actualizarTablaConfigPilonas() {
  const tabla = document.getElementById('tabla-config-pilonas');
  if (!tabla) {
    console.error('Tabla de configuración de pilonas no encontrada');
    return;
  }
  
  tabla.innerHTML = '';
  
  if (!pilonas || pilonas.length === 0) {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td colspan="6" class="text-center">No hay pilonas configuradas</td>`;
    tabla.appendChild(tr);
    return;
  }
  
  pilonas.forEach(pilona => {
    const tr = document.createElement('tr');
    
    const id = pilona.id || pilona.ID;
    const nombre = pilona.nombre || pilona.NOMBRE || 'Sin nombre';
    const estado = pilona.estado || pilona.ESTADO || 'error';
    const ip = pilona.direccionIP || pilona.DIRECCION_IP || 'desconocida';
    const lat = parseFloat(pilona.latitud || pilona.LATITUD);
    const lng = parseFloat(pilona.longitud || pilona.LONGITUD);
    
    tr.innerHTML = `
      <td>${id}</td>
      <td>
        <div class="d-flex align-items-center">
          <div class="pilona-icon" style="background-color: ${estadoColores[estado]};">${nombre.substring(0, 1)}</div>
          ${nombre}
        </div>
      </td>
      <td>${ip}</td>
      <td><span class="badge ${estadoClases[estado]}">${estadoTexto[estado]}</span></td>
      <td>${lat && lng && !isNaN(lat) && !isNaN(lng) ? formatCoordenadas(lat, lng) : 'No definida'}</td>
      <td>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-primary btn-editar-pilona" data-id="${id}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-outline-danger btn-eliminar-pilona" data-id="${id}">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </td>
    `;
    
    tabla.appendChild(tr);
  });
  
  // Añadir event listeners
  tabla.querySelectorAll('.btn-editar-pilona').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      mostrarModalPilona(id);
    });
  });
  
  tabla.querySelectorAll('.btn-eliminar-pilona').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      eliminarPilona(id);
    });
  });
}

// Eliminar pilona
async function eliminarPilona(id) {
  if (!id) {
    console.error('ID de pilona no válido para eliminar');
    return;
  }
  
  // Buscar la pilona para mostrar su nombre
  const pilona = pilonas.find(p => (p.id == id || p.ID == id));
  const nombre = pilona ? (pilona.nombre || pilona.NOMBRE || 'Sin nombre') : 'ID ' + id;
  
  // Confirmar eliminación
  if (!confirm(`¿Está seguro de que desea eliminar la pilona "${nombre}"?\n\nEsta acción no se puede deshacer.`)) {
    return;
  }
  
  mostrarCargando();
  
  try {
    const response = await fetch(`/api/pilonas/${id}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (response.ok) {
      const data = await response.json();
      mostrarAlerta('success', data.mensaje || 'Pilona eliminada correctamente');
      
      // Recargar lista de pilonas
      await obtenerPilonas();
    } else {
      let errorMsg = 'Error al eliminar la pilona';
      try {
        const errorData = await response.json();
        errorMsg = errorData.error || errorMsg;
      } catch (e) {
        console.error('Error procesando respuesta de error:', e);
      }
      
      mostrarAlerta('error', errorMsg);
    }
  } catch (error) {
    console.error('Error eliminando pilona:', error);
    mostrarAlerta('error', 'Error de conexión con el servidor');
  } finally {
    ocultarCargando();
  }
}

// Seleccionar pilona para control
function seleccionarPilona(id) {
  if (!id) {
    console.error('ID de pilona no válido para seleccionar');
    return;
  }
  
  console.log(`Seleccionando pilona ${id} para control`);
  pilonaSeleccionada = id;
  
  // Mostrar panel de control
  const infoElement = document.getElementById('control-info');
  const panelElement = document.getElementById('control-panel');
  
  if (infoElement) infoElement.classList.add('hidden');
  if (panelElement) panelElement.classList.remove('hidden');
  
  // Obtener datos de la pilona
  const pilona = pilonas.find(p => (p.id == id || p.ID == id));
  
  if (!pilona) {
    console.error(`No se encontró la pilona con ID ${id}`);
    return;
  }
  
  const nombre = pilona.nombre || pilona.NOMBRE || 'Sin nombre';
  const estado = pilona.estado || pilona.ESTADO || 'error';
  const direccionIP = pilona.direccionIP || pilona.DIRECCION_IP || 'desconocida';
  
  // Actualizar interfaz
  const nombreElement = document.getElementById('control-nombre');
  const estadoElement = document.getElementById('control-estado');
  const idElement = document.getElementById('control-id');
  const ipElement = document.getElementById('control-ip');
  
  if (nombreElement) nombreElement.textContent = nombre;
  if (estadoElement) {
    estadoElement.textContent = estadoTexto[estado];
    estadoElement.className = `badge ${estadoClases[estado]}`;
  }
  if (idElement) idElement.textContent = id;
  if (ipElement) ipElement.textContent = direccionIP;
  
  // Resaltar fila en la tabla
  const tabla = document.getElementById('tabla-control-pilonas');
  if (tabla) {
    // Quitar selección de todas las filas
    tabla.querySelectorAll('tr').forEach(row => {
      row.classList.remove('table-active');
    });
    
    // Seleccionar la fila actual
    const filaSeleccionada = tabla.querySelector(`tr[data-id="${id}"]`);
    if (filaSeleccionada) {
      filaSeleccionada.classList.add('table-active');
    }
  }
  
  // Habilitar/deshabilitar botones según el estado
  actualizarBotonesControl(estado);
}

// Actualizar botones de control según el estado de la pilona
function actualizarBotonesControl(estado) {
  const btnBajar = document.getElementById('btn-bajar');
  const btnSubir = document.getElementById('btn-subir');
  const btnBloquearArriba = document.getElementById('btn-bloquear-arriba');
  const btnBloquearAbajo = document.getElementById('btn-bloquear-abajo');
  const btnDesbloquear = document.getElementById('btn-desbloquear');
  
  if (!btnBajar || !btnSubir || !btnBloquearArriba || !btnBloquearAbajo || !btnDesbloquear) {
    console.warn('No se encontraron todos los botones de control');
    return;
  }
  
  // Resetear todos los botones
  [btnBajar, btnSubir, btnBloquearArriba, btnBloquearAbajo, btnDesbloquear].forEach(btn => {
    btn.disabled = false;
  });
  
  // Configurar según el estado
  switch (estado) {
    case 'subida':
      btnSubir.disabled = true;
      btnBloquearAbajo.disabled = true;
      btnDesbloquear.disabled = true;
      break;
    case 'bajada':
      btnBajar.disabled = true;
      btnBloquearArriba.disabled = true;
      btnDesbloquear.disabled = true;
      break;
    case 'bloqueada_arriba':
      btnSubir.disabled = true;
      btnBajar.disabled = true;
      btnBloquearArriba.disabled = true;
      btnBloquearAbajo.disabled = true;
      break;
    case 'bloqueada_abajo':
      btnSubir.disabled = true;
      btnBajar.disabled = true;
      btnBloquearArriba.disabled = true;
      btnBloquearAbajo.disabled = true;
      break;
    case 'error':
      // En caso de error, permitir todas las acciones para intentar recuperarla
      break;
  }
}

// ===== Funciones de Socket.IO =====

// Inicializar conexión de socket
function inicializarSocket() {
  // Desconectar socket existente si hay
  if (socket) {
    try {
      socket.disconnect();
      console.log('Socket existente desconectado');
    } catch (error) {
      console.error('Error al desconectar socket existente:', error);
    }
  }
  
  try {
    console.log('Inicializando conexión de socket...');
    
    // Conectar con sesión
    socket = io({
      query: {
        sessionID: localStorage.getItem('sessionID') || 'temp-session'
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000
    });
    
    // Función para actualizar LED de conexión
    function actualizarLEDConexion(estado) {
      const ledElement = document.getElementById('led-conexion-backend');
      const textoElement = document.getElementById('texto-conexion-backend');
      
      if (ledElement && textoElement) {
        switch(estado) {
          case 'conectado':
            ledElement.className = 'led led-green';
            ledElement.title = 'Conectado al servidor';
            textoElement.textContent = 'Conectado';
            break;
          case 'conectando':
            ledElement.className = 'led led-yellow';
            ledElement.title = 'Conectando...';
            textoElement.textContent = 'Conectando...';
            break;
          case 'desconectado':
          default:
            ledElement.className = 'led led-red';
            ledElement.title = 'Sin conexión';
            textoElement.textContent = 'Desconectado';
            break;
        }
      }
    }
    
    // Estado inicial: conectando
    actualizarLEDConexion('conectando');
    
    // Evento de conexión
    socket.on('connect', () => {
      console.log('Socket conectado:', socket.id);
      localStorage.setItem('sessionID', socket.id);
      actualizarLEDConexion('conectado');
      
      // Autenticar socket
      if (usuario) {
        socket.emit('autenticar', usuario);
        console.log('Socket autenticado con usuario:', usuario.NOMBRE || usuario.nombre);
      }
    });
    
    // Evento de error de conexión
    socket.on('connect_error', (error) => {
      console.error('Error de conexión del socket:', error);
      actualizarLEDConexion('desconectado');
    });
    
    // Evento de desconexión
    socket.on('disconnect', (reason) => {
      console.log('Socket desconectado:', reason);
      actualizarLEDConexion('desconectado');
    });
    
    // Evento de reconexión
    socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconectado después de ${attemptNumber} intentos`);
      actualizarLEDConexion('conectado');
      
      // Reautenticar
      if (usuario) {
        socket.emit('autenticar', usuario);
      }
    });
    
    // Evento de intento de reconexión
    socket.on('reconnect_attempt', () => {
      actualizarLEDConexion('conectando');
    });
    
    // Evento de actualización de pilona
    socket.on('actualizacion_pilona', data => {
      console.log('Actualización de pilona recibida:', data);
      
      if (data && data.id && data.estado) {
        // Verificar que la pilona existe antes de actualizar
        const pilonaExiste = pilonas.some(p => (p.id == data.id || p.ID == data.id));
        
        if (pilonaExiste) {
          // Actualizar timestamp de última comunicación
          ultimaComunicacion[data.id] = Date.now();
          
          // Si el estado era 'sin_comunicacion' o 'desconocido' y ahora tenemos datos válidos
          if (data.estado && data.estado !== 'error') {
            actualizarEstadoPilona(data.id, data.estado);
          } else {
            // Si recibimos error, mantener como estado desconocido pero con comunicación
            actualizarEstadoPilona(data.id, 'desconocido');
          }
        } else {
          console.warn(`Se recibió actualización para pilona ${data.id} pero no existe en el sistema`);
        }
      } else {
        console.error('Datos de actualización de pilona incompletos:', data);
      }
    });
    
    // Evento de actualización de actividad
    socket.on('nueva_actividad', data => {
      console.log('Nueva actividad recibida:', data);
      actualizarActividadReciente(data);
    });
    
    console.log('Eventos de socket configurados');
  } catch (error) {
    console.error('Error al inicializar socket:', error);
    mostrarAlerta('error', 'Error de comunicación con el servidor');
    // Actualizar LED a desconectado en caso de error
    const ledElement = document.getElementById('led-conexion-backend');
    const textoElement = document.getElementById('texto-conexion-backend');
    if (ledElement && textoElement) {
      ledElement.className = 'led led-red';
      textoElement.textContent = 'Desconectado';
    }
  }
}

// Actualizar lista de actividad reciente
function actualizarActividadReciente(actividad) {
  const lista = document.getElementById('lista-actividad');
  if (!lista) {
    console.error('Lista de actividad no encontrada');
    return;
  }
  
  try {
    // Crear nuevo elemento
    const li = document.createElement('li');
    li.className = 'list-group-item';
    
    li.innerHTML = `
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <strong>${actividad.usuario || 'Sistema'}</strong> ${formatAccion(actividad.accion || '')}
          ${actividad.pilona ? `<em>${actividad.pilona}</em>` : ''}
        </div>
        <small class="text-muted">${formatHora(actividad.fecha || new Date().toISOString())}</small>
      </div>
    `;
    
    // Añadir al principio de la lista
    lista.insertBefore(li, lista.firstChild);
    
    // Limitar a 5 elementos
    while (lista.children.length > 5) {
      lista.removeChild(lista.lastChild);
    }
  } catch (error) {
    console.error('Error actualizando actividad reciente:', error);
  }
}

// ===== Funciones de utilidad =====

// Función para validar formato de dirección IP
function validarIP(ip) {
  // Patrón para IPv4
  const patronIPv4 = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // También aceptar hostname o dominio
  const patronHostname = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9](?:\.[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9])*$/;
  
  return patronIPv4.test(ip) || patronHostname.test(ip);
}

// Mostrar login
function mostrarLogin() {
  // Ocultar todas las páginas
  document.querySelectorAll('[id^="page-"]').forEach(el => {
    el.classList.add('hidden');
  });
  
  // Mostrar página de login
  const loginPage = document.getElementById('page-login');
  if (loginPage) {
    loginPage.classList.remove('hidden');
  } else {
    console.error('Página de login no encontrada');
  }
  
  // Ocultar navbar
  const navbar = document.querySelector('.navbar-collapse');
  if (navbar) {
    navbar.classList.remove('show');
  }
  
  console.log('Pantalla de login mostrada');
}

// Mostrar cargando
function mostrarCargando() {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.remove('hidden');
  } else {
    console.warn('Elemento de carga no encontrado');
  }
}

// Ocultar cargando
function ocultarCargando() {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.add('hidden');
  }
}

// Mostrar alerta (usando Bootstrap Toast)
function mostrarAlerta(tipo, mensaje, isHTML = false) {
  console.log(`Alerta ${tipo}: ${mensaje}`);
  
  // Crear elemento toast
  const toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
  toastContainer.style.zIndex = '9999';
  
  const toast = document.createElement('div');
  toast.className = `toast ${tipo === 'error' ? 'bg-danger' : tipo === 'success' ? 'bg-success' : 'bg-info'} text-white`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  
  toast.innerHTML = `
    <div class="toast-header">
      <strong class="me-auto">${tipo === 'error' ? 'Error' : tipo === 'success' ? 'Éxito' : 'Información'}</strong>
      <button type="button" class="btn-close btn-close-white" data-bs-dismiss="toast" aria-label="Cerrar"></button>
    </div>
    <div class="toast-body">
      ${isHTML ? mensaje : document.createTextNode(mensaje).textContent}
    </div>
  `;
  
  toastContainer.appendChild(toast);
  document.body.appendChild(toastContainer);
  
  // Mostrar toast
  try {
    const bsToast = new bootstrap.Toast(toast, { autohide: true, delay: 5000 });
    bsToast.show();
  } catch (error) {
    console.error('Error mostrando toast:', error);
    // Mostrar alerta nativa como fallback
    alert(`${tipo === 'error' ? 'Error' : tipo === 'success' ? 'Éxito' : 'Información'}: ${mensaje}`);
  }
  
  // Eliminar después de ocultarse
  toast.addEventListener('hidden.bs.toast', () => {
    toastContainer.remove();
  });
}

// Mostrar errores de formulario
function mostrarErroresFormulario(errores) {
  console.error('Errores en formulario:', errores);
  
  // Crear mensaje de alerta con todos los errores
  const mensaje = `
    <strong>Por favor, corrija los siguientes errores:</strong>
    <ul class="mb-0 pl-3">
      ${errores.map(error => `<li>${error}</li>`).join('')}
    </ul>
  `;
  
  // Mostrar alerta con los errores
  mostrarAlerta('error', mensaje, true);
}

// Formato de acción de auditoría
function formatAccion(accion) {
  if (!accion) return '';
  
  switch (accion.toLowerCase()) {
    case 'iniciar_sesion':
      return 'inició sesión';
    case 'cerrar_sesion':
      return 'cerró sesión';
    case 'crear_usuario':
      return 'creó un usuario';
    case 'actualizar_usuario':
      return 'actualizó un usuario';
    case 'eliminar_usuario':
      return 'eliminó un usuario';
    case 'crear_pilona':
      return 'creó una pilona';
    case 'actualizar_pilona':
      return 'actualizó una pilona';
    case 'eliminar_pilona':
      return 'eliminó una pilona';
    case 'subir':
      return 'subió la pilona';
    case 'bajar':
      return 'bajó la pilona';
    case 'bloquear_arriba':
      return 'bloqueó la pilona arriba';
    case 'bloquear_abajo':
      return 'bloqueó la pilona abajo';
    case 'desbloquear':
      return 'desbloqueó la pilona';
    default:
      return accion.replace(/_/g, ' ');
  }
}

// Formato de rol
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

// Formato de coordenadas
function formatCoordenadas(lat, lng) {
  if (!lat || !lng) return 'No definida';
  
  lat = parseFloat(lat);
  lng = parseFloat(lng);
  
  if (isNaN(lat) || isNaN(lng)) return 'No definida';
  
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

// Formato de fecha
function formatFecha(fecha) {
  if (!fecha) return '';
  
  try {
    const f = new Date(fecha);
    if (isNaN(f.getTime())) {
      return 'Fecha inválida';
    }
    
    return f.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  } catch (e) {
    console.error('Error formateando fecha:', e);
    return fecha.toString();
  }
}

// Formato de hora
function formatHora(fecha) {
  if (!fecha) return '';
  
  try {
    const f = new Date(fecha);
    if (isNaN(f.getTime())) {
      return 'Hora inválida';
    }
    
    return f.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    console.error('Error formateando hora:', e);
    return fecha.toString();
  }
}

// Formato de fecha y hora
function formatFechaHora(fecha) {
  if (!fecha) return '';
  
  try {
    const f = new Date(fecha);
    if (isNaN(f.getTime())) {
      return 'Fecha/hora inválida';
    }
    
    return f.toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  } catch (e) {
    console.error('Error formateando fecha y hora:', e);
    return fecha.toString();
  }
}

// Validar formato de correo
function validarEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Validar formato de dirección IP
function validarIP(ip) {
  // Validación simple de IP
  const re = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  if (!re.test(ip)) return false;
  
  // Validar que cada octeto está entre 0 y 255
  const octetos = ip.split('.');
  for (let i = 0; i < octetos.length; i++) {
    const num = parseInt(octetos[i]);
    if (num < 0 || num > 255) return false;
  }
  
  return true;
}

// Función para validar el formulario LOGO
function validarFormularioLOGO() {
  console.log('Validando formulario LOGO...');
  
  // Obtener valores básicos
  const nombre = document.getElementById('pilona-nombre')?.value?.trim();
  const direccionIP = document.getElementById('pilona-direccion-ip')?.value?.trim();
  const latitud = document.getElementById('pilona-latitud')?.value;
  const longitud = document.getElementById('pilona-longitud')?.value;
  
  const errores = [];
  
  // Validar campos obligatorios
  if (!nombre) errores.push('El nombre es obligatorio');
  if (!direccionIP) errores.push('La dirección IP es obligatoria');
  if (!latitud) errores.push('La latitud es obligatoria');
  if (!longitud) errores.push('La longitud es obligatoria');
  
  // Validar formato de IP
  if (direccionIP && !validarIP(direccionIP)) {
    errores.push('El formato de la dirección IP no es válido');
  }
  
  // Validar coordenadas
  if (latitud && isNaN(parseFloat(latitud))) {
    errores.push('La latitud debe ser un número');
  }
  if (longitud && isNaN(parseFloat(longitud))) {
    errores.push('La longitud debe ser un número');
  }
  
  // Validar que al menos las funciones básicas estén asignadas
  const funcionesAsignadas = document.querySelectorAll('.logo-function');
  let tieneSubir = false;
  let tieneBajar = false;
  let tieneEstado = false;
  let tieneBloqueo = false;
  
  funcionesAsignadas.forEach(select => {
    const funcion = select.dataset.function;
    const valor = select.value;
    
    if (valor) {
      switch (funcion) {
        case 'subir': tieneSubir = true; break;
        case 'bajar': tieneBajar = true; break;
        case 'estado': tieneEstado = true; break;
        case 'bloqueo': tieneBloqueo = true; break;
      }
    }
  });
  
  if (!tieneSubir) errores.push('Debe asignar un elemento LOGO para la función SUBIR');
  if (!tieneBajar) errores.push('Debe asignar un elemento LOGO para la función BAJAR');
  if (!tieneEstado) errores.push('Debe asignar un elemento LOGO para la función ESTADO');
  if (!tieneBloqueo) errores.push('Debe asignar un elemento LOGO para la función BLOQUEO');
  
  // Mostrar errores si existen
  if (errores.length > 0) {
    mostrarErroresFormulario(errores);
    return false;
  }
  
  return true;
}

// Función para obtener las direcciones LOGO mapeadas
function obtenerDireccionesLOGO(logoConfig) {
  const direcciones = {
    subir: 0,
    bajar: 0,
    estado: 0,
    bloqueo: 0,
    puntual: 0
  };
  
  // Mapeo completo de direcciones LOGO según la documentación
  const LOGO_MAP = {
    // Entradas digitales
    'I1': 1, 'I2': 2, 'I3': 3, 'I4': 4, 'I5': 5, 'I6': 6, 'I7': 7, 'I8': 8,
    'I9': 9, 'I10': 10, 'I11': 11, 'I12': 12, 'I13': 13, 'I14': 14, 'I15': 15, 'I16': 16,
    'I17': 17, 'I18': 18, 'I19': 19, 'I20': 20, 'I21': 21, 'I22': 22, 'I23': 23, 'I24': 24,
    // Salidas digitales
    'Q1': 8193, 'Q2': 8194, 'Q3': 8195, 'Q4': 8196, 'Q5': 8197, 'Q6': 8198, 'Q7': 8199, 'Q8': 8200,
    'Q9': 8201, 'Q10': 8202, 'Q11': 8203, 'Q12': 8204, 'Q13': 8205, 'Q14': 8206, 'Q15': 8207, 'Q16': 8208,
    'Q17': 8209, 'Q18': 8210, 'Q19': 8211, 'Q20': 8212,
    // Marcas digitales
    'M1': 8257, 'M2': 8258, 'M3': 8259, 'M4': 8260, 'M5': 8261, 'M6': 8262, 'M7': 8263, 'M8': 8264,
    'M9': 8265, 'M10': 8266, 'M11': 8267, 'M12': 8268, 'M13': 8269, 'M14': 8270, 'M15': 8271, 'M16': 8272,
    'M17': 8273, 'M18': 8274, 'M19': 8275, 'M20': 8276, 'M21': 8277, 'M22': 8278, 'M23': 8279, 'M24': 8280,
    'M25': 8281, 'M26': 8282, 'M27': 8283, 'M28': 8284, 'M29': 8285, 'M30': 8286, 'M31': 8287, 'M32': 8288,
    'M33': 8289, 'M34': 8290, 'M35': 8291, 'M36': 8292, 'M37': 8293, 'M38': 8294, 'M39': 8295, 'M40': 8296,
    'M41': 8297, 'M42': 8298, 'M43': 8299, 'M44': 8300, 'M45': 8301, 'M46': 8302, 'M47': 8303, 'M48': 8304,
    'M49': 8305, 'M50': 8306, 'M51': 8307, 'M52': 8308, 'M53': 8309, 'M54': 8310, 'M55': 8311, 'M56': 8312,
    'M57': 8313, 'M58': 8314, 'M59': 8315, 'M60': 8316, 'M61': 8317, 'M62': 8318, 'M63': 8319, 'M64': 8320,
    // Registros V (bits)
    'V0.0': 0, 'V0.1': 1, 'V0.2': 2, 'V0.3': 3, 'V0.4': 4, 'V0.5': 5, 'V0.6': 6, 'V0.7': 7,
    'V1.0': 8, 'V1.1': 9, 'V1.2': 10, 'V1.3': 11, 'V1.4': 12, 'V1.5': 13, 'V1.6': 14, 'V1.7': 15,
    'V2.0': 16, 'V2.1': 17, 'V2.2': 18, 'V2.3': 19, 'V2.4': 20, 'V2.5': 21, 'V2.6': 22, 'V2.7': 23
  };
  
  // Almacenar también la información del modo (lectura/escritura)
  const modos = {};
  
  // Buscar las funciones en la configuración
  Object.keys(logoConfig).forEach(seccion => {
    if (typeof logoConfig[seccion] === 'object' && seccion !== 'version') {
      Object.keys(logoConfig[seccion]).forEach(elemento => {
        const datos = logoConfig[seccion][elemento];
        if (datos && datos.funcion) {
          const direccion = LOGO_MAP[elemento] || 0;
          switch (datos.funcion) {
            case 'subir': 
              direcciones.subir = direccion; 
              modos.subir = datos.modo || 'write';
              break;
            case 'bajar': 
              direcciones.bajar = direccion; 
              modos.bajar = datos.modo || 'write';
              break;
            case 'estado': 
              direcciones.estado = direccion; 
              modos.estado = datos.modo || 'read';
              break;
            case 'bloqueo': 
              direcciones.bloqueo = direccion; 
              modos.bloqueo = datos.modo || 'write';
              break;
            case 'puntual': 
              direcciones.puntual = direccion; 
              modos.puntual = datos.modo || 'write';
              break;
          }
        }
      });
    }
  });
  
  // Agregar los modos a las direcciones para uso posterior
  direcciones.modos = modos;
  
  return direcciones;
}

// Inicializar conexión de Socket.IO
function inicializarSocket() {
  console.log('Inicializando conexión Socket.IO...');
  
  try {
    // Crear conexión socket
    socket = io({
      transports: ['websocket', 'polling'],
      query: {
        sessionID: localStorage.getItem('sessionID') || ''
      }
    });
    
    // Evento de conexión exitosa
    socket.on('connect', () => {
      console.log('Socket conectado:', socket.id);
      
      // Autenticar usuario
      if (usuario) {
        socket.emit('autenticar', usuario);
      }
    });
    
    // Evento de desconexión
    socket.on('disconnect', (reason) => {
      console.log('Socket desconectado:', reason);
    });
    
    // Evento de actualización de pilona
    socket.on('actualizacion_pilona', (data) => {
      console.log('Actualización de pilona recibida:', data);
      
      if (data && data.id && data.estado) {
        // Actualizar el estado de la pilona
        actualizarEstadoPilona(data.id, data.estado);
        
        // Si vienen datos de coils, actualizarlos también
        if (data.coils) {
          const pilona = pilonas.find(p => (p.id || p.ID) == data.id);
          if (pilona) {
            pilona.coils = data.coils;
            console.log(`Coils actualizados para pilona ${data.id}:`, data.coils);
          }
        }
      }
    });
    
    // Evento de error
    socket.on('error', (error) => {
      console.error('Error en socket:', error);
    });
    
    // Evento de reconexión
    socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconectado después de', attemptNumber, 'intentos');
      // Recargar pilonas después de reconectar
      obtenerPilonas();
    });
    
  } catch (error) {
    console.error('Error inicializando socket:', error);
  }
}

// Cargar Leaflet dinámicamente si no está disponible
function cargarLeaflet() {
  return new Promise((resolve, reject) => {
    if (typeof L !== 'undefined') {
      console.log('Leaflet ya está cargado');
      resolve();
      return;
    }
    
    console.log('Cargando Leaflet dinámicamente...');
    
    // Cargar CSS
    const linkCss = document.createElement('link');
    linkCss.rel = 'stylesheet';
    linkCss.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
    document.head.appendChild(linkCss);
    
    // Cargar JavaScript
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.onload = () => {
      console.log('Leaflet cargado correctamente');
      resolve();
    };
    script.onerror = (error) => {
      console.error('Error cargando Leaflet:', error);
      reject(error);
    };
    
    document.head.appendChild(script);
  });
}

// Verificar que la página tiene todos los elementos necesarios al cargar
function verificarElementosNecesarios() {
  // Esta función ya no es necesaria porque los elementos de login están en login.html
  // Los elementos del dashboard están verificados implícitamente cuando se usan
  return true;
}

// ===== Programa principal =====

// Verificar que el DOM está cargado
document.addEventListener('DOMContentLoaded', () => {
  console.log('Documento cargado. Iniciando aplicación...');
  
  try {
    // Si existe la función crearModalZonasUsuario (del módulo de zonas)
    if (typeof window.crearModalZonasUsuario === 'function') {
      window.crearModalZonasUsuario();
    }
    
    // Resto de la inicialización está en el evento DOMContentLoaded al principio del archivo
  } catch (error) {
    console.error('Error crítico al inicializar aplicación:', error);
    alert('Error crítico al inicializar la aplicación. Por favor, recargue la página o contacte al administrador.');
  }
});

// ===== Funciones para pruebas =====

// Función para probar la comunicación con el servidor
async function probarConexion() {
  try {
    const response = await fetch('/api/pilonas', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      credentials: 'include'
    });
    
    const exitoso = response.ok;
    const status = response.status;
    let mensaje = '';
    
    try {
      const data = await response.json();
      mensaje = exitoso ? `Conexión exitosa: ${data.length} pilonas recibidas` : `Error: ${data.error || 'Desconocido'}`;
    } catch (e) {
      mensaje = exitoso ? 'Conexión exitosa pero respuesta inválida' : `Error (${status})`;
    }
    
    console.log('Prueba de conexión:', mensaje);
    mostrarAlerta(exitoso ? 'success' : 'error', mensaje);
    
    return exitoso;
  } catch (error) {
    console.error('Error en prueba de conexión:', error);
    mostrarAlerta('error', 'Error de conexión con el servidor');
    return false;
  }
}

// Función para simular cambio de estado de una pilona (solo para pruebas)
function simularCambioEstado(id, nuevoEstado) {
  console.log(`Simulando cambio de estado de pilona ${id} a ${nuevoEstado}`);
  
  if (!pilonas || pilonas.length === 0) {
    console.error('No hay pilonas cargadas para simular cambio');
    return false;
  }
  
  // Buscar la pilona
  const pilona = pilonas.find(p => (p.id == id || p.ID == id));
  if (!pilona) {
    console.error(`No se encontró la pilona con ID ${id}`);
    return false;
  }
  
  // Actualizar estado
  pilona.estado = nuevoEstado;
  pilona.ESTADO = nuevoEstado;
  
  // Actualizar vista
  actualizarVistaPilonas();
  
  // Si es la pilona seleccionada, actualizar panel de control
  if (pilonaSeleccionada == id) {
    seleccionarPilona(id);
  }
  
  return true;
}

// Exponer funciones para debugging en consola
window.debugging = {
  probarConexion,
  simularCambioEstado,
  obtenerPilonas,
  actualizarVistaPilonas,
  inicializarMapa,
  pilonas
};