// config.js - Configuración centralizada del cliente
const config = {
  // Configuración del servidor
  getApiUrl: function() {
    return ''; // Usar URLs relativas, el navegador usará el mismo protocolo/host/puerto
  },
  
  // Configuración de fetch con manejo de errores
  fetchWithConfig: async function(url, options = {}) {
    const defaultOptions = {
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    
    try {
      const response = await fetch(url, finalOptions);
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.error || error.message || `Error ${response.status}`);
        } else {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
      }
      
      return response;
    } catch (error) {
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        throw new Error('Error de conexión con el servidor. Verifique que el servidor esté ejecutándose.');
      }
      throw error;
    }
  }
};

// Hacer config global
window.appConfig = config;
