// verificar-rutas-calendario.js - Script para verificar las rutas del calendario

console.log('=== VERIFICACIÓN DE RUTAS DEL CALENDARIO ===\n');

// Función para hacer peticiones
async function verificarRuta(url, opciones = {}) {
    try {
        console.log(`Verificando: ${url}`);
        const response = await fetch(url, {
            credentials: 'include',
            ...opciones
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log(`✅ OK - Status: ${response.status}`);
            console.log(`   Datos recibidos:`, Array.isArray(data) ? `Array con ${data.length} elementos` : 'Objeto');
            return { ok: true, data };
        } else {
            console.log(`❌ ERROR - Status: ${response.status}`);
            try {
                const error = await response.json();
                console.log(`   Mensaje:`, error.error || error.message || 'Error desconocido');
            } catch (e) {
                console.log(`   No se pudo parsear la respuesta de error`);
            }
            return { ok: false, status: response.status };
        }
    } catch (error) {
        console.log(`❌ ERROR DE RED:`, error.message);
        return { ok: false, error: error.message };
    }
}

// Función principal de verificación
async function verificarTodasLasRutas() {
    console.log('1. Verificando estado de autenticación...');
    
    // Verificar si hay usuario en sesión
    const usuario = window.usuario || window.usuarioActual;
    if (usuario) {
        console.log(`✅ Usuario autenticado: ${usuario.NOMBRE} (${usuario.ROL})`);
    } else {
        console.log('❌ No hay usuario autenticado');
        console.log('\nPor favor, inicie sesión primero.');
        return;
    }
    
    console.log('\n2. Verificando rutas de pilonas...');
    
    // Verificar /api/pilonas/todas
    const pilonasResult = await verificarRuta('/api/pilonas/todas');
    
    console.log('\n3. Verificando rutas de zonas...');
    
    // Verificar /api/zonas
    const zonasResult = await verificarRuta('/api/zonas');
    
    console.log('\n4. Verificando rutas del calendario...');
    
    // Verificar festivos
    const festivosResult = await verificarRuta('/api/calendario/festivos');
    
    // Verificar programaciones
    const programacionesResult = await verificarRuta('/api/calendario/programaciones');
    
    // Verificar logs
    const logsResult = await verificarRuta('/api/calendario/programaciones/logs');
    
    // Resumen
    console.log('\n=== RESUMEN ===');
    const resultados = {
        'Pilonas (/api/pilonas/todas)': pilonasResult.ok,
        'Zonas (/api/zonas)': zonasResult.ok,
        'Festivos': festivosResult.ok,
        'Programaciones': programacionesResult.ok,
        'Logs': logsResult.ok
    };
    
    let todoOk = true;
    for (const [nombre, ok] of Object.entries(resultados)) {
        console.log(`${ok ? '✅' : '❌'} ${nombre}`);
        if (!ok) todoOk = false;
    }
    
    if (todoOk) {
        console.log('\n✅ ¡Todas las rutas funcionan correctamente!');
    } else {
        console.log('\n⚠️ Algunas rutas no funcionan. Revisa el servidor.');
        console.log('\nPosibles soluciones:');
        console.log('1. Reinicia el servidor Node.js');
        console.log('2. Verifica que el usuario tiene rol de administrador');
        console.log('3. Revisa los logs del servidor para más detalles');
    }
    
    return {
        pilonas: pilonasResult.data,
        zonas: zonasResult.data,
        todoOk
    };
}

// Función para reintentar la carga de datos del modal
async function reintentarCargaDatos() {
    console.log('\n=== REINTENTANDO CARGA DE DATOS ===');
    
    try {
        // Cargar pilonas
        console.log('Cargando pilonas...');
        await cargarPilonasDisponiblesOptimizado();
        console.log('✅ Pilonas cargadas');
        
        // Cargar zonas
        console.log('Cargando zonas...');
        await cargarZonasDisponiblesOptimizado();
        console.log('✅ Zonas cargadas');
        
        console.log('\n✅ Datos cargados correctamente. El modal debería funcionar ahora.');
    } catch (error) {
        console.error('❌ Error al cargar datos:', error);
    }
}

// Exponer funciones globalmente
window.verificarRutasCalendario = verificarTodasLasRutas;
window.reintentarCargaDatos = reintentarCargaDatos;

console.log('\n📋 INSTRUCCIONES:');
console.log('1. Para verificar todas las rutas: verificarRutasCalendario()');
console.log('2. Para reintentar la carga de datos: reintentarCargaDatos()');
console.log('3. Para limpiar caché: limpiarCacheProgramacion()');

// Auto-ejecutar si estamos en la página del calendario
if (document.getElementById('page-calendario') && !document.getElementById('page-calendario').classList.contains('hidden')) {
    console.log('\n🚀 Auto-ejecutando verificación...');
    setTimeout(verificarTodasLasRutas, 1000);
}
