// Diagnóstico mejorado de WebSocket para ejecutar en el navegador
// Copia y pega este código en la consola (F12)

console.log('%c=== DIAGNÓSTICO WEBSOCKET MEJORADO ===', 'color: blue; font-weight: bold');

// 1. Verificar que Socket.IO está cargado
if (typeof io === 'undefined') {
    console.error('❌ Socket.IO NO está cargado');
} else {
    console.log('✅ Socket.IO está cargado correctamente');
}

// 2. Verificar WebSocket Manager
if (window.wsManager) {
    console.log('✅ WebSocket Manager disponible');
    console.log('Estado del manager:', window.wsManager.obtenerInfo());
} else {
    console.log('⚠️ WebSocket Manager no encontrado');
}

// 3. Verificar socket actual
if (typeof socket !== 'undefined' && socket) {
    console.log('✅ Variable socket existe');
    console.log('Socket conectado:', socket.connected);
    console.log('Socket ID:', socket.id);
} else {
    console.log('⚠️ Variable socket no existe o es null');
}

// 4. Función para probar conexión manual
window.testConexionManual = async function() {
    console.log('\n%c=== PRUEBA DE CONEXIÓN MANUAL ===', 'color: green; font-weight: bold');
    
    const socketUrl = `${window.location.protocol}//${window.location.hostname}:${window.location.port || (window.location.protocol === 'https:' ? '443' : '80')}`;
    console.log('URL de conexión:', socketUrl);
    
    const testSocket = io(socketUrl, {
        transports: ['websocket', 'polling'],
        reconnection: false,
        timeout: 5000
    });
    
    return new Promise((resolve, reject) => {
        testSocket.on('connect', () => {
            console.log('✅ Conexión exitosa!');
            console.log('Socket ID:', testSocket.id);
            console.log('Transporte usado:', testSocket.io.engine.transport.name);
            testSocket.disconnect();
            resolve(true);
        });
        
        testSocket.on('connect_error', (error) => {
            console.error('❌ Error de conexión:', error.message);
            reject(error);
        });
        
        setTimeout(() => {
            testSocket.disconnect();
            reject(new Error('Timeout de conexión'));
        }, 5000);
    });
};

// 5. Verificar endpoint check-session
window.testCheckSession = async function() {
    console.log('\n%c=== PROBANDO ENDPOINT CHECK-SESSION ===', 'color: purple; font-weight: bold');
    
    try {
        const response = await fetch('/api/auth/check-session', {
            credentials: 'include'
        });
        
        console.log('Status:', response.status);
        const data = await response.json();
        console.log('Respuesta:', data);
        
        if (data.autenticado) {
            console.log('✅ Usuario autenticado:', data.usuario);
        } else {
            console.log('⚠️ No hay sesión activa');
        }
    } catch (error) {
        console.error('❌ Error al verificar sesión:', error);
    }
};

// 6. Monitor de eventos del socket
window.monitorearSocket = function() {
    console.log('\n%c=== MONITOREANDO EVENTOS DEL SOCKET ===', 'color: orange; font-weight: bold');
    
    if (!socket) {
        console.error('No hay socket para monitorear');
        return;
    }
    
    // Eventos principales
    const eventos = ['connect', 'disconnect', 'error', 'connect_error', 'reconnect', 'actualizacion_pilona'];
    
    eventos.forEach(evento => {
        socket.on(evento, (...args) => {
            console.log(`📡 Evento [${evento}]:`, args);
        });
    });
    
    console.log('Monitoreando eventos:', eventos.join(', '));
};

// 7. Reconectar usando el manager
window.reconectarWS = function() {
    console.log('\n%c=== RECONECTANDO WEBSOCKET ===', 'color: teal; font-weight: bold');
    
    if (window.wsManager) {
        window.wsManager.reconectar();
        console.log('Reconexión iniciada vía WebSocket Manager');
    } else if (socket) {
        socket.connect();
        console.log('Reconexión iniciada vía socket directo');
    } else {
        console.error('No hay forma de reconectar');
    }
};

// Ejecutar diagnóstico automático
(async function() {
    console.log('\n📊 Ejecutando diagnóstico automático...\n');
    
    // Test 1: Check session
    await testCheckSession();
    
    // Test 2: Conexión manual
    try {
        await testConexionManual();
    } catch (error) {
        console.error('Fallo en conexión manual:', error.message);
    }
    
    console.log('\n%c=== DIAGNÓSTICO COMPLETADO ===', 'color: blue; font-weight: bold');
    console.log('Funciones disponibles:');
    console.log('- testConexionManual() : Probar conexión WebSocket');
    console.log('- testCheckSession() : Verificar sesión');
    console.log('- monitorearSocket() : Monitorear eventos del socket');
    console.log('- reconectarWS() : Forzar reconexión');
    
    if (window.wsManager) {
        console.log('- wsManager.obtenerInfo() : Ver estado del manager');
        console.log('- wsManager.reconectar() : Reconectar vía manager');
    }
})();
