// fix-login-errors.js - Parche para prevenir errores de elementos de login cuando no estamos en la página de login

(function() {
  // Guardar console.error original
  const originalConsoleError = console.error;
  
  // Filtrar mensajes específicos de error sobre elementos de login
  console.error = function(...args) {
    const message = args[0];
    
    // Si el mensaje contiene referencias a elementos de login y no estamos en login.html, ignorarlo
    if (typeof message === 'string' && 
        !window.location.pathname.includes('login.html') &&
        (message.includes('page-login') || 
         message.includes('form-login') || 
         message.includes('login-email') || 
         message.includes('login-password') ||
         message.includes('Faltan elementos en el HTML'))) {
      // Cambiar a console.log para debug si es necesario
      console.log('[Login Elements Check] Ignorado - no estamos en página de login:', message);
      return;
    }
    
    // Para todos los otros mensajes, usar el console.error original
    originalConsoleError.apply(console, args);
  };
  
  // Verificar si algún script está intentando buscar elementos de login cuando no debe
  const checkRequiredElementsOriginal = window.checkRequiredElements;
  if (checkRequiredElementsOriginal) {
    window.checkRequiredElements = function(elementIds) {
      // Si no estamos en login.html, filtrar elementos de login
      if (!window.location.pathname.includes('login.html')) {
        const filteredIds = elementIds.filter(id => 
          !['page-login', 'form-login', 'login-email', 'login-password'].includes(id)
        );
        return checkRequiredElementsOriginal(filteredIds);
      }
      return checkRequiredElementsOriginal(elementIds);
    };
  }
})();
