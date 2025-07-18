// client-interface.js - Mejoras de interfaz para usuarios tipo "cliente"

// Variables globales
let clientMode = false;
let zonasPilonasCliente = new Map(); // Mapa para almacenar relaciones entre zonas y pilonas
let clientCheckRetries = 0;
const MAX_CLIENT_RETRIES = 3;

// Ejecutar cuando el documento esté listo
document.addEventListener('DOMContentLoaded', function() {
  console.log('Inicializando módulo de interfaz para cliente...');
  
  // Detectar si el usuario es cliente una vez que inicie sesión
  // Usamos setTimeout en lugar de setInterval para tener más control
  setTimeout(checkUserAndActivateClientMode, 1000);
  
  // Variable para evitar aplicar estilos múltiples veces
  let estilosAplicados = false;
  
  // Observar cambios en la tabla de pilonas para aplicar estilo cliente
  const observerConfig = { childList: true, subtree: true };
  const targetNode = document.getElementById('tabla-pilonas');
  
  if (targetNode) {
    const observer = new MutationObserver((mutationsList) => {
      // Solo aplicar estilos si es modo cliente y no se han aplicado ya
      if (clientMode && !estilosAplicados) {
        estilosAplicados = true;
        aplicarEstiloCliente();
        // Desconectar el observer después de aplicar los estilos
        observer.disconnect();
      }
    });
    
    observer.observe(targetNode, observerConfig);
  }
  
  console.log('Módulo de interfaz para cliente inicializado correctamente');
});

// Función para verificar usuario y activar el modo cliente con límite de reintentos
function checkUserAndActivateClientMode() {
  // Incrementar contador de reintentos
  clientCheckRetries++;
  
  // Verificar si el usuario está disponible
  if (!window.usuario) {
    // Si superamos el máximo de reintentos, detenemos
    if (clientCheckRetries < MAX_CLIENT_RETRIES) {
      console.log(`Usuario no disponible aún, reintentando... (intento ${clientCheckRetries}/${MAX_CLIENT_RETRIES})`);
      setTimeout(checkUserAndActivateClientMode, 1000);
    } else {
      console.warn(`Máximo de reintentos alcanzado (${MAX_CLIENT_RETRIES}). Cancelando inicialización de modo cliente.`);
      
      // Intentar recuperar la aplicación
      if (typeof ocultarCargando === 'function') {
        ocultarCargando();
      }
    }
    return;
  }
  
  // Si llegamos aquí, el usuario está disponible
  console.log('Usuario encontrado después de', clientCheckRetries, 'reintentos');
  
  // Verificar el rol del usuario
  const userRole = (window.usuario.ROL || window.usuario.rol || '').toLowerCase();
  if (userRole === 'cliente') {
    // Activar modo cliente
    activarModoCliente();
    
    // Modificar comportamiento de bajada de pilonas
    modificarBajadaPilonasCliente();
  } else {
    console.log(`Usuario con rol ${userRole}, no se activa el modo cliente`);
  }
}

// Función para activar el modo cliente
function activarModoCliente() {
  console.log('Activando modo de interfaz para cliente...');
  
  // Verificar si el usuario es de tipo cliente
  if (!usuario || (usuario.ROL || usuario.rol || '').toLowerCase() !== 'cliente') {
    console.log('El usuario no es de tipo cliente, no se activa el modo cliente');
    clientMode = false;
    return false;
  }
  
  console.log('Usuario de tipo cliente detectado, activando modo cliente');
  clientMode = true;
  
  // Cargar zonas asignadas al cliente para filtrar pilonas
  cargarZonasCliente();
  
  // Modificar la interfaz para el modo cliente
  setTimeout(() => {
    aplicarEstiloCliente();
  }, 500);
  
  return true;
}

// Cargar zonas asignadas al cliente
async function cargarZonasCliente() {
  console.log('Cargando zonas asignadas al cliente...');
  
  if (!usuario || !usuario.ID) {
    console.error('No hay usuario válido para cargar zonas');
    return;
  }
  
  try {
    const response = await fetch('/api/zonas/mis-zonas', {
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error ${response.status}: ${response.statusText}`);
    }
    
    const zonas = await response.json();
    console.log('Zonas del cliente obtenidas:', zonas);
    
    // Por cada zona, cargar sus pilonas
    for (const zona of zonas) {
      await cargarPilonasZona(zona.ID || zona.id);
    }
    
    // Filtrar pilonas según zonas asignadas
    filtrarPilonasCliente();
    
  } catch (error) {
    console.error('Error cargando zonas del cliente:', error);
    mostrarAlerta('error', `Error al cargar zonas: ${error.message}`);
  }
}

// Variable global para controlar si los estilos ya se aplicaron
let estilosClienteAplicados = false;

// Función para aplicar estilo cliente
function aplicarEstiloCliente() {
  console.log('Aplicando estilo de interfaz para cliente...');
  
  if (!clientMode) {
    console.log('No se aplica estilo cliente porque no está en modo cliente');
    return;
  }
  
  // Evitar aplicar los estilos múltiples veces
  if (estilosClienteAplicados) {
    console.log('Los estilos de cliente ya fueron aplicados anteriormente');
    return;
  }
  
  estilosClienteAplicados = true;
  
  // 1. Modificar botones en la tabla de pilonas en dashboard
  const tablaPilonas = document.getElementById('tabla-pilonas');
  if (tablaPilonas) {
    const filas = tablaPilonas.querySelectorAll('tr');
    filas.forEach(fila => {
      const celdaAcciones = fila.querySelector('td:last-child');
      if (!celdaAcciones) return;
      
      // Reemplazar botones por un botón grande para bajada puntual
      const botonOriginal = celdaAcciones.querySelector('button');
      if (botonOriginal) {
        const pilonaId = botonOriginal.getAttribute('onclick')?.match(/'([^']+)'/)?.[1] || 
                         botonOriginal.getAttribute('data-id');
        if (!pilonaId) return;
        
        // Crear nuevo botón grande
        celdaAcciones.innerHTML = `
          <button class="btn btn-success btn-lg w-100" onclick="controlarPilonaMapa('${pilonaId}', 'bajar')" data-id="${pilonaId}">
            <i class="fas fa-arrow-down me-2"></i> Bajar Pilona
          </button>
        `;
      }
    });
  }
  
  // 2. Modificar los popups de los marcadores en el mapa
  if (markers && Object.keys(markers).length > 0) {
    for (const marker of Object.values(markers)) {
      // Obtener ID de la pilona
      const pilonaId = Object.keys(markers).find(key => markers[key] === marker);
      if (!pilonaId) continue;
      
      // Modificar el popup solo si existe
      if (marker._popup && marker._popup._content) {
        // Extraer información necesaria
        const nombreMatch = marker._popup._content.match(/<strong>(.*?)<\/strong>/);
        const estadoMatch = marker._popup._content.match(/class="([^"]+)"[^>]*>(.*?)<\/span>/);
        
        const nombre = nombreMatch ? nombreMatch[1] : 'Pilona';
        const estadoClass = estadoMatch ? estadoMatch[1] : '';
        const estadoTexto = estadoMatch ? estadoMatch[2] : 'Estado desconocido';
        
        // Crear nuevo contenido
        marker.setPopupContent(`
          <div class="text-center">
            <strong>${nombre}</strong><br>
            <span class="${estadoClass}">${estadoTexto}</span><br>
            <button class="btn btn-success btn-lg mt-2" onclick="controlarPilonaMapa('${pilonaId}', 'bajar')" data-id="${pilonaId}">
              <i class="fas fa-arrow-down me-2"></i> Bajar Pilona
            </button>
          </div>
        `);
      }
    }
  }
  
  // 3. Agregar clase CSS para estilo cliente
  document.body.classList.add('client-mode');
  
  // 4. Añadir estilos CSS para usuarios cliente
  agregarEstilosCliente();
  
  console.log('Estilos y cambios para interfaz de cliente aplicados correctamente');
}

// Cargar pilonas de una zona
async function cargarPilonasZona(zonaId) {
  console.log(`Cargando pilonas de la zona ${zonaId}...`);
  
  try {
    const response = await fetch(`/api/zonas/${zonaId}/pilonas`, {
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || `Error ${response.status}: ${response.statusText}`);
    }
    
    const pilonasZona = await response.json();
    console.log(`Pilonas de zona ${zonaId} obtenidas:`, pilonasZona);
    
    // Almacenar en el mapa
    zonasPilonasCliente.set(zonaId, pilonasZona);
    
  } catch (error) {
    console.error(`Error cargando pilonas de zona ${zonaId}:`, error);
    mostrarAlerta('error', `Error al cargar pilonas de zona: ${error.message}`);
  }
}

// Filtrar pilonas según zonas asignadas al cliente
function filtrarPilonasCliente() {
  console.log('Filtrando pilonas para cliente...');
  
  if (!clientMode) {
    console.log('No se filtran pilonas porque no está en modo cliente');
    return;
  }
  
  // Crear un set con todos los IDs de pilonas permitidas
  const pilonasPermitidas = new Set();
  
  for (const pilonasZona of zonasPilonasCliente.values()) {
    for (const pilona of pilonasZona) {
      pilonasPermitidas.add(pilona.ID || pilona.id);
    }
  }
  
  console.log('IDs de pilonas permitidas:', Array.from(pilonasPermitidas));
  
  // Filtrar la lista global de pilonas si es necesario
  if (pilonas && pilonas.length > 0) {
    // Crear una copia de la lista original
    const pilonasOriginales = [...pilonas];
    
    // Filtrar y mantener solo las pilonas permitidas
    pilonas = pilonasOriginales.filter(pilona => {
      const pilonaId = pilona.ID || pilona.id;
      return pilonasPermitidas.has(pilonaId);
    });
    
    console.log(`Filtradas ${pilonasOriginales.length - pilonas.length} pilonas, quedan ${pilonas.length}`);
    
    // Actualizar las vistas con las pilonas filtradas
    if (typeof actualizarVistaPilonas === 'function') {
      actualizarVistaPilonas();
    } else {
      console.warn('Función actualizarVistaPilonas no disponible');
    }
  }
}

// Añadir estilos CSS para la interfaz de cliente
function agregarEstilosCliente() {
  // Verificar si ya existe el estilo
  if (document.getElementById('client-mode-styles')) {
    return;
  }
  
  // Crear elemento style
  const style = document.createElement('style');
  style.id = 'client-mode-styles';
  style.textContent = `
    .client-mode .btn-success {
      font-size: 1.1rem;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      transition: all 0.3s ease;
    }
    
    .client-mode .btn-primary {
      font-size: 1.1rem;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      transition: all 0.3s ease;
      background-color: #6c5ce7;
      border-color: #6c5ce7;
    }
    
    .client-mode .btn-primary:hover {
      background-color: #5b47d1;
      border-color: #5b47d1;
      transform: scale(1.05);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }
    
    .client-mode .btn-success:hover {
      transform: scale(1.05);
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
    }
    
    .client-mode .btn-group {
      width: 100%;
      display: flex;
      gap: 5px;
    }
    
    .client-mode .pilona-marker {
      font-size: 18px !important;
      width: 40px !important;
      height: 40px !important;
      border-width: 3px !important;
    }
    
    .client-mode .leaflet-popup-content {
      min-width: 220px;
      text-align: center;
    }
    
    @media (max-width: 768px) {
      .client-mode .btn-success,
      .client-mode .btn-primary {
        font-size: 1rem;
        padding: 0.5rem 0.8rem;
      }
      
      .client-mode #mapa {
        height: 400px !important;
      }
      
      .client-mode .card-dashboard {
        margin-bottom: 15px;
      }
    }
  `;
  
  // Añadir al head
  document.head.appendChild(style);
  
  console.log('Estilos para modo cliente añadidos');
}

// Función para modificar la bajada de pilonas en modo cliente
function modificarBajadaPilonasCliente() {
  console.log('Modificando comportamiento de bajada de pilonas para cliente...');
  
  if (!clientMode) {
    console.log('No se modifica comportamiento porque no está en modo cliente');
    return;
  }
  
  // Sobrescribir solo si no se ha hecho ya
  if (typeof window.controlarPilonaMapaOriginal === 'undefined' && typeof window.controlarPilonaMapa === 'function') {
    window.controlarPilonaMapaOriginal = window.controlarPilonaMapa;
    
    // Sobrescribir la función para añadir confirmación y feedback
    window.controlarPilonaMapa = function(id, accion) {
      // Solo para clientes y acción "bajar"
      if (clientMode && accion === 'bajar') {
        // Mostrar confirmación más amigable
        if (confirm('¿Confirma que desea bajar esta pilona de forma puntual?')) {
          // Dar feedback inmediato
          mostrarAlerta('info', 'Enviando comando para bajar la pilona...', false);
          
          // Simular carga de botón
          const botones = document.querySelectorAll(`.btn[onclick*="${id}"]`);
          botones.forEach(btn => {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Bajando...';
          });
          
          // Llamar a la función original después de un breve retraso
          setTimeout(() => {
            window.controlarPilonaMapaOriginal(id, accion);
            
            // Restaurar botones después de un tiempo
            setTimeout(() => {
              botones.forEach(btn => {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-arrow-down me-2"></i> Bajar Pilona';
              });
            }, 3000);
          }, 500);
        }
      } else {
        // Para otras acciones o usuarios no cliente, comportamiento normal
        window.controlarPilonaMapaOriginal(id, accion);
      }
    };
  }
  
  console.log('Comportamiento de bajada de pilonas modificado para cliente');
}

// Exponer funciones para debugging
window.clientInterfaceDebug = {
  activarModoCliente,
  cargarZonasCliente,
  filtrarPilonasCliente,
  aplicarEstiloCliente,
  clientMode,
  clientCheckRetries
};

// Funciones adicionales de depuración para el problema del usuario
window.debugUsuarioCompleto = function() {
  console.log('=== DEBUG COMPLETO DEL USUARIO ===');
  console.log('1. Variable usuario local:', window.usuario);
  console.log('2. LocalStorage sesion:', localStorage.getItem('sesion'));
  
  try {
    const sesionParsed = JSON.parse(localStorage.getItem('sesion') || '{}');
    console.log('3. Sesión parseada:', sesionParsed);
  } catch (e) {
    console.log('3. Error parseando sesión:', e);
  }
  
  console.log('4. Elemento usuario-nombre existe:', !!document.getElementById('usuario-nombre'));
  console.log('5. Contenido usuario-nombre:', document.getElementById('usuario-nombre')?.textContent);
  console.log('6. Navbar visible:', !document.getElementById('navbar')?.classList.contains('hidden'));
  console.log('7. Página activa:', document.querySelector('[id^="page-"]:not(.hidden)')?.id);
  console.log('================================');
  
  // Intentar actualizar el nombre manualmente
  if (window.usuario && document.getElementById('usuario-nombre')) {
    const nombre = window.usuario.NOMBRE || window.usuario.nombre || 'Usuario';
    document.getElementById('usuario-nombre').textContent = nombre;
    console.log('Nombre actualizado manualmente a:', nombre);
  }
};

// Auto-ejecutar depuración después de 2 segundos
setTimeout(() => {
  if (window.usuario) {
    console.log('Auto-depuración: Usuario detectado');
    window.debugUsuarioCompleto();
  }
}, 2000);