// safe-element-finder.js - Utilidades para buscar elementos de forma segura

// Función para buscar elementos de forma segura sin generar errores
function findElementSafe(selector) {
  try {
    return document.querySelector(selector);
  } catch (e) {
    return null;
  }
}

function findElementByIdSafe(id) {
  try {
    return document.getElementById(id);
  } catch (e) {
    return null;
  }
}

// Función para verificar si estamos en la página correcta
function isOnPage(pageName) {
  const pathname = window.location.pathname;
  
  if (pageName === 'login') {
    return pathname === '/login.html';
  } else if (pageName === 'dashboard') {
    return pathname === '/' || pathname === '/index.html';
  }
  
  return false;
}

// Función para verificar múltiples elementos
function checkRequiredElements(elementIds) {
  const missing = [];
  
  elementIds.forEach(id => {
    if (!document.getElementById(id)) {
      missing.push(id);
    }
  });
  
  if (missing.length > 0) {
    console.warn(`Elementos faltantes: ${missing.join(', ')}`);
    return false;
  }
  
  return true;
}

// Exportar funciones globalmente
window.findElementSafe = findElementSafe;
window.findElementByIdSafe = findElementByIdSafe;
window.isOnPage = isOnPage;
window.checkRequiredElements = checkRequiredElements;
