// test-mode-manager.js - Gestor del modo de prueba para pilonas
// Evita conflictos entre el monitoreo automático y las pruebas manuales

class TestModeManager {
    constructor() {
        this.testModeActive = false;
        this.suspendedMonitoring = new Set();
        this.originalMonitoringState = new Map();
        console.log('TestModeManager inicializado');
    }
    
    // Activar modo de prueba para una pilona específica
    activateTestMode(pilonaId) {
        console.log(`Activando modo de prueba para pilona ${pilonaId}`);
        
        this.testModeActive = true;
        this.suspendedMonitoring.add(pilonaId);
        
        // Notificar al servidor que se suspenda el monitoreo
        this.notifyServerTestMode(pilonaId, true);
        
        // Desactivar actualizaciones de socket para esta pilona
        this.suspendSocketUpdates(pilonaId);
        
        // Mostrar indicador visual
        this.showTestModeIndicator(pilonaId);
    }
    
    // Desactivar modo de prueba
    deactivateTestMode(pilonaId) {
        console.log(`Desactivando modo de prueba para pilona ${pilonaId}`);
        
        this.suspendedMonitoring.delete(pilonaId);
        if (this.suspendedMonitoring.size === 0) {
            this.testModeActive = false;
        }
        
        // Notificar al servidor que reanude el monitoreo
        this.notifyServerTestMode(pilonaId, false);
        
        // Reactivar actualizaciones de socket
        this.resumeSocketUpdates(pilonaId);
        
        // Ocultar indicador visual
        this.hideTestModeIndicator(pilonaId);
    }
    
    // Verificar si una pilona está en modo de prueba
    isInTestMode(pilonaId) {
        return this.suspendedMonitoring.has(pilonaId);
    }
    
    // Notificar al servidor sobre el cambio de modo
    async notifyServerTestMode(pilonaId, activate) {
        try {
            const response = await fetch('/api/pilonas/test-mode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    pilonaId,
                    testMode: activate
                }),
                credentials: 'include'
            });
            
            if (!response.ok) {
                console.error('Error notificando modo de prueba al servidor');
            } else {
                console.log(`Servidor notificado: modo de prueba ${activate ? 'activado' : 'desactivado'} para pilona ${pilonaId}`);
            }
        } catch (error) {
            console.error('Error comunicando con servidor:', error);
        }
    }
    
    // Suspender actualizaciones de socket
    suspendSocketUpdates(pilonaId) {
        if (window.socket) {
            // Guardar el estado original del listener
            const originalListener = window.socket._callbacks?.$actualizacion_pilona;
            this.originalMonitoringState.set(pilonaId, originalListener);
            
            // Reemplazar el listener con uno filtrado
            window.socket.off('actualizacion_pilona');
            window.socket.on('actualizacion_pilona', (data) => {
                // Solo procesar si no es la pilona en prueba
                if (data && data.id !== pilonaId) {
                    if (typeof actualizarEstadoPilona === 'function') {
                        actualizarEstadoPilona(data.id, data.estado);
                    }
                }
            });
        }
    }
    
    // Reanudar actualizaciones de socket
    resumeSocketUpdates(pilonaId) {
        if (window.socket) {
            // Restaurar el listener original
            window.socket.off('actualizacion_pilona');
            window.socket.on('actualizacion_pilona', (data) => {
                if (typeof actualizarEstadoPilona === 'function') {
                    actualizarEstadoPilona(data.id, data.estado);
                }
            });
        }
    }
    
    // Mostrar indicador visual de modo de prueba
    showTestModeIndicator(pilonaId) {
        // Añadir clase CSS a elementos relacionados con la pilona
        document.querySelectorAll(`[data-pilona-id="${pilonaId}"]`).forEach(el => {
            el.classList.add('test-mode-active');
        });
        
        // Crear badge de modo prueba si no existe
        const badge = document.createElement('span');
        badge.className = 'badge bg-warning test-mode-badge';
        badge.innerHTML = '<i class="fas fa-vial"></i> Modo Prueba';
        badge.id = `test-mode-badge-${pilonaId}`;
        
        // Añadir badge al panel de pruebas
        const panelHeader = document.querySelector('.card-header.bg-warning');
        if (panelHeader && !document.getElementById(badge.id)) {
            panelHeader.appendChild(badge);
        }
    }
    
    // Ocultar indicador visual
    hideTestModeIndicator(pilonaId) {
        // Quitar clase CSS
        document.querySelectorAll(`[data-pilona-id="${pilonaId}"]`).forEach(el => {
            el.classList.remove('test-mode-active');
        });
        
        // Eliminar badge
        const badge = document.getElementById(`test-mode-badge-${pilonaId}`);
        if (badge) {
            badge.remove();
        }
    }
    
    // Limpiar todos los modos de prueba activos
    clearAllTestModes() {
        console.log('Limpiando todos los modos de prueba');
        
        const pilonas = Array.from(this.suspendedMonitoring);
        pilonas.forEach(pilonaId => {
            this.deactivateTestMode(pilonaId);
        });
    }
}

// Crear instancia global
window.testModeManager = new TestModeManager();

// Integrar con el panel de pruebas existente
const originalProbarConexion = window.probarConexion;
if (originalProbarConexion) {
    window.probarConexion = async function() {
        // Obtener ID de la pilona si está editando
        const pilonaId = document.getElementById('pilona-id')?.value;
        
        // Activar modo de prueba si hay ID
        if (pilonaId) {
            window.testModeManager.activateTestMode(pilonaId);
        }
        
        // Llamar a la función original
        return originalProbarConexion.apply(this, arguments);
    };
}

// Limpiar modo de prueba cuando se cierra el modal
document.addEventListener('DOMContentLoaded', () => {
    const modalPilona = document.getElementById('modal-pilona');
    if (modalPilona) {
        modalPilona.addEventListener('hidden.bs.modal', () => {
            // Limpiar todos los modos de prueba
            window.testModeManager.clearAllTestModes();
            
            // Resetear panel de pruebas si existe
            if (window.pilonaTestPanel?.resetear) {
                window.pilonaTestPanel.resetear();
            }
        });
    }
});

// Añadir estilos CSS para el modo de prueba
const style = document.createElement('style');
style.textContent = `
    .test-mode-active {
        border: 2px solid #ffc107 !important;
        box-shadow: 0 0 10px rgba(255, 193, 7, 0.3);
    }
    
    .test-mode-badge {
        margin-left: 10px;
        animation: pulse 1s infinite;
    }
    
    @keyframes pulse {
        0% { opacity: 1; }
        50% { opacity: 0.7; }
        100% { opacity: 1; }
    }
    
    /* Deshabilitar animaciones de estado durante modo prueba */
    .test-mode-active .pilona-icon,
    .test-mode-active .pilona-marker {
        animation: none !important;
    }
`;
document.head.appendChild(style);

console.log('Test Mode Manager cargado y configurado');
