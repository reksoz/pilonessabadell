// limpiar-sesion.js - Script para limpiar completamente la sesión y caché
(function() {
  console.log('=== LIMPIEZA DE SESIÓN Y CACHÉ ===');
  
  // 1. Limpiar localStorage
  console.log('1. Limpiando localStorage...');
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    console.log(`   - Eliminando: ${key}`);
    localStorage.removeItem(key);
  });
  
  // 2. Limpiar sessionStorage
  console.log('\n2. Limpiando sessionStorage...');
  sessionStorage.clear();
  
  // 3. Limpiar cookies (si las hay)
  console.log('\n3. Limpiando cookies...');
  document.cookie.split(";").forEach(function(c) { 
    document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
  });
  
  // 4. Limpiar variables globales
  console.log('\n4. Limpiando variables globales...');
  if (typeof window.usuario !== 'undefined') {
    window.usuario = null;
    console.log('   - window.usuario limpiado');
  }
  
  if (typeof usuario !== 'undefined') {
    try {
      usuario = null;
      console.log('   - variable usuario limpiada');
    } catch (e) {
      console.log('   - No se pudo limpiar variable usuario (es constante)');
    }
  }
  
  if (typeof window.socket !== 'undefined' && window.socket) {
    try {
      window.socket.disconnect();
      window.socket = null;
      console.log('   - Socket desconectado');
    } catch (e) {
      console.log('   - Error desconectando socket:', e);
    }
  }
  
  // 5. Mostrar resultado
  console.log('\n✅ LIMPIEZA COMPLETADA');
  console.log('\nAhora puede:');
  console.log('1. Recargar la página con Ctrl+F5');
  console.log('2. Intentar iniciar sesión nuevamente');
  console.log('\nCredenciales:');
  console.log('   Email: admin@pilonas.com');
  console.log('   Contraseña: 1234');
  
  // Mostrar alerta al usuario
  if (typeof mostrarAlerta === 'function') {
    mostrarAlerta('success', 'Sesión y caché limpiados. Por favor, recargue la página.');
  } else {
    alert('Sesión y caché limpiados. Por favor, recargue la página con Ctrl+F5');
  }
})();
