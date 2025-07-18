// alertas-utils.js - Utilidades para mostrar alertas y mensajes en el sistema

// Función principal para mostrar alertas
function mostrarAlerta(tipo, mensaje, esHTML = false) {
    console.log(`Alerta ${tipo}:`, mensaje);
    
    // Crear elemento de alerta
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${tipo === 'error' ? 'danger' : tipo} alert-dismissible fade show fixed-top`;
    alertDiv.style.cssText = 'position: fixed; top: 70px; left: 50%; transform: translateX(-50%); z-index: 9999; max-width: 500px; width: 90%;';
    
    // Crear contenido del mensaje
    const iconos = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle',
        danger: 'fas fa-exclamation-circle'
    };
    
    const icono = iconos[tipo] || iconos.info;
    
    if (esHTML) {
        alertDiv.innerHTML = `
            <i class="${icono} me-2"></i>
            ${mensaje}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
    } else {
        alertDiv.innerHTML = `
            <i class="${icono} me-2"></i>
            ${escapeHtml(mensaje)}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
    }
    
    // Añadir al DOM
    document.body.appendChild(alertDiv);
    
    // Auto-eliminar después de 5 segundos
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
    
    return alertDiv;
}

// Función para escapar HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// Funciones específicas para diferentes tipos de alertas
function mostrarAlertaExito(mensaje) {
    return mostrarAlerta('success', mensaje);
}

function mostrarAlertaError(mensaje) {
    return mostrarAlerta('error', mensaje);
}

function mostrarAlertaAdvertencia(mensaje) {
    return mostrarAlerta('warning', mensaje);
}

function mostrarAlertaInfo(mensaje) {
    return mostrarAlerta('info', mensaje);
}

// Función para mostrar confirmación personalizada
function mostrarConfirmacionPersonalizada(titulo, mensaje) {
    return new Promise((resolve) => {
        // Crear modal de confirmación dinámico
        const modalHtml = `
            <div class="modal fade" id="modal-confirmacion-temp" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header bg-warning text-dark">
                            <h5 class="modal-title">${escapeHtml(titulo)}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <p>${escapeHtml(mensaje)}</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="btn-cancelar-temp">Cancelar</button>
                            <button type="button" class="btn btn-primary" id="btn-confirmar-temp">Confirmar</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Insertar modal en el DOM
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        const modal = document.getElementById('modal-confirmacion-temp');
        const bootstrapModal = new bootstrap.Modal(modal);
        
        // Event listeners para los botones
        document.getElementById('btn-confirmar-temp').addEventListener('click', () => {
            bootstrapModal.hide();
            resolve(true);
        });
        
        document.getElementById('btn-cancelar-temp').addEventListener('click', () => {
            bootstrapModal.hide();
            resolve(false);
        });
        
        // Limpiar modal cuando se cierre
        modal.addEventListener('hidden.bs.modal', () => {
            modal.remove();
        });
        
        // Mostrar modal
        bootstrapModal.show();
    });
}

// Función para limpiar todas las alertas
function limpiarAlertas() {
    document.querySelectorAll('.alert.fixed-top').forEach(alert => {
        alert.remove();
    });
}

// Exponer funciones globalmente
window.mostrarAlerta = mostrarAlerta;
window.mostrarAlertaExito = mostrarAlertaExito;
window.mostrarAlertaError = mostrarAlertaError;
window.mostrarAlertaAdvertencia = mostrarAlertaAdvertencia;
window.mostrarAlertaInfo = mostrarAlertaInfo;
window.mostrarConfirmacionPersonalizada = mostrarConfirmacionPersonalizada;
window.limpiarAlertas = limpiarAlertas;
window.escapeHtml = escapeHtml;

console.log('Utilidades de alertas cargadas correctamente');
