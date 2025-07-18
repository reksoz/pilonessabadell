// form-validation.js - Validación de formularios para el sistema de control de pilonas

// Función para validar el formulario de usuario
function validarFormularioUsuario() {
  console.log('Validando formulario de usuario...');
  
  // Obtener elementos del formulario de manera segura
  const elementos = {
    id: document.getElementById('usuario-id'),
    nombre: document.getElementById('usuario-nombre'),
    email: document.getElementById('usuario-email'),
    password: document.getElementById('usuario-password'),
    rol: document.getElementById('usuario-rol'),
    fechaInicio: document.getElementById('usuario-fecha-inicio')
  };
  
  // Verificar que los elementos críticos existen
  const elementosCriticos = ['nombre', 'email', 'rol'];
  for (const campo of elementosCriticos) {
    if (!elementos[campo]) {
      console.error(`Elemento ${campo} no encontrado en el formulario`);
      if (typeof mostrarAlerta === 'function') {
        mostrarAlerta('error', 'Error en el formulario. Por favor, recargue la página.');
      }
      return false;
    }
  }
  
  // Obtener valores de manera segura
  const valores = {
    id: elementos.id ? elementos.id.value.trim() : '',
    nombre: elementos.nombre.value ? elementos.nombre.value.trim() : '',
    email: elementos.email.value ? elementos.email.value.trim() : '',
    password: elementos.password ? elementos.password.value : '',
    rol: elementos.rol.value,
    fechaInicio: elementos.fechaInicio ? elementos.fechaInicio.value : ''
  };
  
  console.log('Valores del formulario:', {
    id: valores.id || '(nuevo)',
    nombre: valores.nombre || '(vacío)',
    email: valores.email || '(vacío)',
    password: valores.password ? '(presente)' : '(vacío)',
    rol: valores.rol || '(vacío)',
    fechaInicio: valores.fechaInicio || '(vacío)'
  });
  
  // Array para almacenar errores
  const errores = [];
  
  // Validar campos obligatorios
  if (!valores.nombre) {
    errores.push('El nombre es obligatorio');
    elementos.nombre.classList.add('is-invalid');
    elementos.nombre.focus();
  } else {
    elementos.nombre.classList.remove('is-invalid');
    elementos.nombre.classList.add('is-valid');
  }
  
  if (!valores.email) {
    errores.push('El email es obligatorio');
    elementos.email.classList.add('is-invalid');
  } else if (!validarEmail(valores.email)) {
    errores.push('El formato del email no es válido');
    elementos.email.classList.add('is-invalid');
  } else {
    elementos.email.classList.remove('is-invalid');
    elementos.email.classList.add('is-valid');
  }
  
  if (!valores.rol) {
    errores.push('El rol es obligatorio');
    elementos.rol.classList.add('is-invalid');
  } else {
    elementos.rol.classList.remove('is-invalid');
    elementos.rol.classList.add('is-valid');
  }
  
  // Para usuarios nuevos, la contraseña es obligatoria
  if (!valores.id && !valores.password) {
    errores.push('La contraseña es obligatoria para nuevos usuarios');
    if (elementos.password) {
      elementos.password.classList.add('is-invalid');
    }
  }
  
  // Si hay errores, mostrarlos y devolver false
  if (errores.length > 0) {
    console.error('Errores de validación:', errores);
    mostrarErroresFormulario(errores);
    return false;
  }
  
  console.log('Validación de formulario de usuario exitosa');
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
  const coilSubir = document.getElementById('pilona-coil-subir')?.value;
  const coilBajar = document.getElementById('pilona-coil-bajar')?.value;
  const coilEstado = document.getElementById('pilona-coil-estado')?.value;
  const coilBloqueo = document.getElementById('pilona-coil-bloqueo')?.value;
  const latitud = document.getElementById('pilona-latitud')?.value;
  const longitud = document.getElementById('pilona-longitud')?.value;
  
  // Crear array para almacenar errores
  const errores = [];
  
  // Validar campos obligatorios
  if (!nombre) errores.push('El nombre es obligatorio');
  if (!direccionIP) errores.push('La dirección IP es obligatoria');
  if (!coilSubir) errores.push('El coil de subir es obligatorio');
  if (!coilBajar) errores.push('El coil de bajar es obligatorio');
  if (!coilEstado) errores.push('El coil de estado es obligatorio');
  if (!coilBloqueo) errores.push('El coil de bloqueo es obligatorio');
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
  
  // Mostrar errores si existen
  if (errores.length > 0) {
    mostrarErroresFormulario(errores);
    return false;
  }
  
  // Si no hay errores, el formulario es válido
  return true;
}

// Función para validar un email
function validarEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

// Función para validar una dirección IP
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

// Función para mostrar errores en un formulario
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

// Exponer funciones para su uso por otros módulos
window.formValidation = {
  validarFormularioUsuario,
  validarFormularioPilona,
  validarEmail,
  validarIP,
  mostrarErroresFormulario
};

// Inicializar validación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  console.log('Inicializando validación de formularios...');
  
  // TEMPORALMENTE DESACTIVADO PARA DEBUGGING
  /*
  // Guardar referencia a las funciones originales sin sobrescribirlas completamente
  if (typeof window.guardarUsuarioOriginal === 'undefined' && typeof window.guardarUsuario === 'function') {
    console.log('Integrando validación con guardarUsuario...');
    
    window.guardarUsuarioOriginal = window.guardarUsuario;
    
    // Sobrescribir la función para incluir validación
    window.guardarUsuario = function() {
      if (validarFormularioUsuario()) {
        return window.guardarUsuarioOriginal();
      }
      return false;
    };
  }
  */
  
  if (typeof window.guardarPilonaOriginal === 'undefined' && typeof window.guardarPilona === 'function') {
    console.log('Integrando validación con guardarPilona...');
    
    window.guardarPilonaOriginal = window.guardarPilona;
    
    // Sobrescribir la función para incluir validación
    window.guardarPilona = function() {
      if (validarFormularioPilona()) {
        return window.guardarPilonaOriginal();
      }
      return false;
    };
  }
  
  // TEMPORALMENTE DESACTIVADO PARA DEBUGGING
  /*
  // Añadir validación a los botones de guardar si existen, evitando duplicar eventos
  const btnGuardarUsuario = document.getElementById('btn-guardar-usuario');
  if (btnGuardarUsuario && !btnGuardarUsuario.hasAttribute('data-validation-attached')) {
    console.log('Añadiendo validación al botón de guardar usuario...');
    
    // Marcar el botón para evitar duplicar eventos
    btnGuardarUsuario.setAttribute('data-validation-attached', 'true');
    
    // No clonar para no perder otros eventos, solo añadir uno nuevo
    btnGuardarUsuario.addEventListener('click', function(e) {
      if (!validarFormularioUsuario()) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }
  */
  
  const btnGuardarPilona = document.getElementById('btn-guardar-pilona');
  if (btnGuardarPilona && !btnGuardarPilona.hasAttribute('data-validation-attached')) {
    console.log('Añadiendo validación al botón de guardar pilona...');
    
    // Marcar el botón para evitar duplicar eventos
    btnGuardarPilona.setAttribute('data-validation-attached', 'true');
    
    // No clonar para no perder otros eventos, solo añadir uno nuevo
    btnGuardarPilona.addEventListener('click', function(e) {
      if (!validarFormularioPilona()) {
        e.preventDefault();
        e.stopPropagation();
      }
    });
  }
  
  console.log('Validación de formularios inicializada correctamente');
});

// Exponer funciones para debugging
window.formValidationDebug = {
  validarFormularioUsuario,
  validarFormularioPilona,
  validarEmail,
  validarIP,
  mostrarErroresFormulario
};