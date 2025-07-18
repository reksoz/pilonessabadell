// modal-pilona-handler.js - Manejador del modal de pilonas con nueva estructura de coils

// Función para inicializar el modal de pilonas
function initModalPilona() {
    // Elementos del DOM
    const modal = document.getElementById('modal-pilona');
    const form = document.getElementById('form-pilona');
    const btnGuardar = document.getElementById('btn-guardar-pilona');
    const btnProbarConexion = document.getElementById('btn-probar-conexion');
    const tipoDispositivo = document.getElementById('pilona-tipo-dispositivo');
    
    // Cambiar visibilidad según tipo de dispositivo
    if (tipoDispositivo) {
        tipoDispositivo.addEventListener('change', function() {
            const configModbus = document.getElementById('config-modbus-generico');
            const configLogo = document.getElementById('config-logo');
            
            if (this.value === 'LOGO') {
                if (configModbus) configModbus.style.display = 'none';
                if (configLogo) configLogo.style.display = 'block';
            } else {
                if (configModbus) configModbus.style.display = 'block';
                if (configLogo) configLogo.style.display = 'none';
            }
        });
    }
    
    // Manejador para guardar pilona
    if (btnGuardar) {
        btnGuardar.addEventListener('click', async function() {
            if (!form.checkValidity()) {
                form.reportValidity();
                return;
            }
            
            const pilonaData = {
                nombre: document.getElementById('pilona-nombre').value,
                direccionIP: document.getElementById('pilona-direccion-ip').value,
                puerto: parseInt(document.getElementById('pilona-puerto').value) || 502,
                unitId: parseInt(document.getElementById('pilona-unit-id').value) || 1,
                tipoDispositivo: document.getElementById('pilona-tipo-dispositivo').value,
                
                // Nueva estructura de coils
                coilEstadoSubidaBajada: parseInt(document.getElementById('pilona-coil-estado-subida-bajada').value) || null,
                coilBajadaPuntual: parseInt(document.getElementById('pilona-coil-bajada-puntual').value) || null,
                coilForzadaAbajo: parseInt(document.getElementById('pilona-coil-forzada-abajo').value) || null,
                coilForzadaArriba: parseInt(document.getElementById('pilona-coil-forzada-arriba').value) || null,
                coilElectrovalvula: parseInt(document.getElementById('pilona-coil-electrovalvula').value) || null,
                
                // Tiempo puntual
                tiempoPuntual: parseInt(document.getElementById('pilona-tiempo-puntual').value) || 3000,
                
                // Tipos de registro
                tipoCoilEstadoSubidaBajada: document.getElementById('pilona-tipo-coil-estado').value || 'COIL',
                tipoCoilBajadaPuntual: document.getElementById('pilona-tipo-coil-bajada-puntual').value || 'COIL',
                tipoCoilForzadaAbajo: document.getElementById('pilona-tipo-coil-forzada-abajo').value || 'COIL',
                tipoCoilForzadaArriba: document.getElementById('pilona-tipo-coil-forzada-arriba').value || 'COIL',
                tipoCoilElectrovalvula: document.getElementById('pilona-tipo-coil-electrovalvula').value || 'COIL',
                
                // Modos de operación
                modoCoilEstadoSubidaBajada: document.getElementById('pilona-modo-coil-estado').value || 'RW',
                modoCoilBajadaPuntual: 'W', // Siempre solo escritura
                modoCoilForzadaAbajo: document.getElementById('pilona-modo-coil-forzada-abajo').value || 'RW',
                modoCoilForzadaArriba: document.getElementById('pilona-modo-coil-forzada-arriba').value || 'RW',
                
                // Configuración avanzada (puertos específicos)
                puertoCoilEstadoSubidaBajada: parseInt(document.getElementById('pilona-puerto-coil-estado').value) || null,
                puertoCoilBajadaPuntual: parseInt(document.getElementById('pilona-puerto-coil-bajada-puntual').value) || null,
                puertoCoilForzadaAbajo: parseInt(document.getElementById('pilona-puerto-coil-forzada-abajo').value) || null,
                puertoCoilForzadaArriba: parseInt(document.getElementById('pilona-puerto-coil-forzada-arriba').value) || null,
                
                // Configuración avanzada (unit IDs específicos)
                unitIdCoilEstadoSubidaBajada: parseInt(document.getElementById('pilona-unitid-coil-estado').value) || null,
                unitIdCoilBajadaPuntual: parseInt(document.getElementById('pilona-unitid-coil-bajada-puntual').value) || null,
                unitIdCoilForzadaAbajo: parseInt(document.getElementById('pilona-unitid-coil-forzada-abajo').value) || null,
                unitIdCoilForzadaArriba: parseInt(document.getElementById('pilona-unitid-coil-forzada-arriba').value) || null,
                
                // Ubicación
                latitud: parseFloat(document.getElementById('pilona-latitud').value),
                longitud: parseFloat(document.getElementById('pilona-longitud').value)
            };
            
            // Si es LOGO, procesar configuración especial
            if (pilonaData.tipoDispositivo === 'LOGO') {
                pilonaData.logoConfig = obtenerConfiguracionLOGO();
            }
            
            try {
                const pilonaId = document.getElementById('pilona-id').value;
                const url = pilonaId ? `/api/pilonas/${pilonaId}` : '/api/pilonas';
                const method = pilonaId ? 'PUT' : 'POST';
                
                const response = await fetch(url, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(pilonaData)
                });
                
                if (response.ok) {
                    // Cerrar modal
                    const modalInstance = bootstrap.Modal.getInstance(modal);
                    modalInstance.hide();
                    
                    // Recargar lista de pilonas
                    if (typeof cargarPilonas === 'function') {
                        cargarPilonas();
                    }
                    
                    // Mostrar mensaje de éxito
                    mostrarAlerta('Pilona guardada correctamente', 'success');
                } else {
                    const error = await response.json();
                    mostrarAlerta(error.message || 'Error al guardar pilona', 'danger');
                }
            } catch (error) {
                console.error('Error:', error);
                mostrarAlerta('Error de conexión', 'danger');
            }
        });
    }
    
    // Manejador para probar conexión
    if (btnProbarConexion) {
        btnProbarConexion.addEventListener('click', async function() {
            const ledConexion = document.getElementById('led-conexion');
            const textoEstado = document.getElementById('texto-estado-conexion');
            
            // Cambiar estado a probando
            ledConexion.className = 'led led-yellow';
            textoEstado.textContent = 'Probando...';
            
            try {
                const response = await fetch('/api/pilonas/test-connection', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        direccionIP: document.getElementById('pilona-direccion-ip').value,
                        puerto: parseInt(document.getElementById('pilona-puerto').value) || 502,
                        unitId: parseInt(document.getElementById('pilona-unit-id').value) || 1
                    })
                });
                
                if (response.ok) {
                    ledConexion.className = 'led led-green';
                    textoEstado.textContent = 'Conexión exitosa';
                    textoEstado.className = 'ms-2 text-success';
                } else {
                    ledConexion.className = 'led led-red';
                    textoEstado.textContent = 'Error de conexión';
                    textoEstado.className = 'ms-2 text-danger';
                }
            } catch (error) {
                ledConexion.className = 'led led-red';
                textoEstado.textContent = 'Error de red';
                textoEstado.className = 'ms-2 text-danger';
            }
        });
    }
}

// Función para cargar datos de pilona en el modal
function cargarPilonaEnModal(pilona) {
    // Información básica
    document.getElementById('pilona-id').value = pilona.ID || '';
    document.getElementById('pilona-nombre').value = pilona.NOMBRE || '';
    document.getElementById('pilona-direccion-ip').value = pilona.DIRECCION_IP || '';
    document.getElementById('pilona-puerto').value = pilona.PUERTO || 502;
    document.getElementById('pilona-unit-id').value = pilona.UNIT_ID || 1;
    document.getElementById('pilona-tipo-dispositivo').value = pilona.TIPO_DISPOSITIVO || 'MODBUS_GENERICO';
    
    // Mapeo de campos antiguos a nueva estructura de coils
    // Si tiene los campos nuevos, usarlos directamente
    if (pilona.COIL_ESTADO_SUBIDA_BAJADA !== undefined) {
        document.getElementById('pilona-coil-estado-subida-bajada').value = pilona.COIL_ESTADO_SUBIDA_BAJADA || '';
    } else {
        // Si no, usar el campo antiguo COIL_ESTADO
        document.getElementById('pilona-coil-estado-subida-bajada').value = pilona.COIL_ESTADO || '';
    }
    
    if (pilona.COIL_BAJADA_PUNTUAL !== undefined) {
        document.getElementById('pilona-coil-bajada-puntual').value = pilona.COIL_BAJADA_PUNTUAL || '';
    } else {
        // Si no, usar el campo antiguo COIL_PUNTUAL
        document.getElementById('pilona-coil-bajada-puntual').value = pilona.COIL_PUNTUAL || '';
    }
    
    if (pilona.COIL_FORZADA_ABAJO !== undefined) {
        document.getElementById('pilona-coil-forzada-abajo').value = pilona.COIL_FORZADA_ABAJO || '';
    } else {
        // Si no, usar el campo antiguo COIL_BAJAR
        document.getElementById('pilona-coil-forzada-abajo').value = pilona.COIL_BAJAR || '';
    }
    
    if (pilona.COIL_FORZADA_ARRIBA !== undefined) {
        document.getElementById('pilona-coil-forzada-arriba').value = pilona.COIL_FORZADA_ARRIBA || '';
    } else {
        // Si no, usar el campo antiguo COIL_BLOQUEO
        document.getElementById('pilona-coil-forzada-arriba').value = pilona.COIL_BLOQUEO || '';
    }
    
    // Cargar electroválvula si existe
    if (document.getElementById('pilona-coil-electrovalvula')) {
        document.getElementById('pilona-coil-electrovalvula').value = pilona.COIL_ELECTROVALVULA || '';
    }
    
    // Tiempo puntual
    document.getElementById('pilona-tiempo-puntual').value = pilona.TIEMPO_PUNTUAL || 3000;
    
    // Tipos de registro (simplificados para la nueva estructura)
    const tipoEstado = document.getElementById('pilona-tipo-coil-estado');
    if (tipoEstado) tipoEstado.value = pilona.TIPO_COIL_ESTADO_SUBIDA_BAJADA || 'COIL';
    
    const tipoBajada = document.getElementById('pilona-tipo-coil-bajada-puntual');
    if (tipoBajada) tipoBajada.value = pilona.TIPO_COIL_BAJADA_PUNTUAL || 'COIL';
    
    const tipoForzadaAbajo = document.getElementById('pilona-tipo-coil-forzada-abajo');
    if (tipoForzadaAbajo) tipoForzadaAbajo.value = pilona.TIPO_COIL_FORZADA_ABAJO || 'COIL';
    
    const tipoForzadaArriba = document.getElementById('pilona-tipo-coil-forzada-arriba');
    if (tipoForzadaArriba) tipoForzadaArriba.value = pilona.TIPO_COIL_FORZADA_ARRIBA || 'COIL';
    
    // Ubicación
    document.getElementById('pilona-latitud').value = pilona.LATITUD || '';
    document.getElementById('pilona-longitud').value = pilona.LONGITUD || '';
    
    // Actualizar tipo de dispositivo y mostrar configuración correspondiente
    const tipoDispositivo = document.getElementById('pilona-tipo-dispositivo');
    tipoDispositivo.dispatchEvent(new Event('change'));
    
    // Si es LOGO, cargar su configuración
    if (pilona.TIPO_DISPOSITIVO === 'LOGO' && pilona.LOGO_CONFIG) {
        cargarConfiguracionLOGO(pilona.LOGO_CONFIG);
    }
}

// Función auxiliar para mostrar alertas
function mostrarAlerta(mensaje, tipo) {
    // Implementar según el sistema de alertas usado en la aplicación
    console.log(`[${tipo}] ${mensaje}`);
    // Por ejemplo, usando Bootstrap:
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${tipo} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${mensaje}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    document.querySelector('.container-fluid').insertBefore(alertDiv, document.querySelector('.container-fluid').firstChild);
    
    // Auto-cerrar después de 5 segundos
    setTimeout(() => {
        alertDiv.remove();
    }, 5000);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', initModalPilona);
