// global-cache-manager.js - Sistema de caché global para evitar peticiones excesivas

// Namespace para el caché global
window.GlobalCache = {
    // Datos cacheados
    pilonas: null,
    zonas: null,
    usuarios: null,
    
    // Timestamps de última carga
    timestamps: {
        pilonas: 0,
        zonas: 0,
        usuarios: 0
    },
    
    // Promesas en curso para evitar peticiones duplicadas
    promises: {
        pilonas: null,
        zonas: null,
        usuarios: null
    },
    
    // Duración del caché (5 minutos por defecto)
    CACHE_DURATION: 5 * 60 * 1000,
    
    // Estado de inicialización
    initialized: false,
    initPromise: null,
    
    // Inicializar el caché global (cargar datos iniciales)
    async init() {
        if (this.initPromise) {
            console.log('GlobalCache: Esperando inicialización en curso...');
            return this.initPromise;
        }
        
        if (this.initialized) {
            console.log('GlobalCache: Ya inicializado');
            return true;
        }
        
        console.log('GlobalCache: Iniciando caché global...');
        
        this.initPromise = (async () => {
            try {
                // Verificar si el usuario es administrador
                const usuario = JSON.parse(localStorage.getItem('sesion') || '{}');
                
                if (!usuario || !usuario.ID) {
                    console.log('GlobalCache: No hay usuario autenticado');
                    return false;
                }
                
                // Cargar datos según el rol
                const promesas = [];
                
                // Todos los usuarios pueden ver zonas
                promesas.push(this.loadZonas());
                
                // Solo administradores cargan todas las pilonas
                if (usuario.ROL === 'administrador') {
                    promesas.push(this.loadPilonas());
                    promesas.push(this.loadUsuarios());
                }
                
                // Esperar con un timeout para evitar bloqueos
                await Promise.race([
                    Promise.all(promesas),
                    new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Timeout en carga inicial')), 10000)
                    )
                ]);
                
                this.initialized = true;
                console.log('GlobalCache: Inicialización completada');
                return true;
                
            } catch (error) {
                console.error('GlobalCache: Error en inicialización:', error);
                // No marcar como inicializado para permitir reintentos
                return false;
            } finally {
                this.initPromise = null;
            }
        })();
        
        return this.initPromise;
    },
    
    // Cargar pilonas (con control de peticiones)
    async loadPilonas() {
        // Si hay una petición en curso, devolver esa promesa
        if (this.promises.pilonas) {
            console.log('GlobalCache: Reutilizando petición de pilonas en curso');
            return this.promises.pilonas;
        }
        
        // Si el caché es válido, devolver los datos
        if (this.isCacheValid('pilonas')) {
            console.log('GlobalCache: Usando caché válido de pilonas');
            return this.pilonas;
        }
        
        console.log('GlobalCache: Cargando pilonas del servidor...');
        
        // Crear nueva promesa de carga
        this.promises.pilonas = (async () => {
            try {
                const response = await fetch('/api/pilonas/todas', {
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Error ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                // Guardar en caché
                this.pilonas = data;
                this.timestamps.pilonas = Date.now();
                
                console.log(`GlobalCache: ${data.length} pilonas cargadas y cacheadas`);
                return data;
                
            } catch (error) {
                console.error('GlobalCache: Error cargando pilonas:', error);
                throw error;
            } finally {
                // Limpiar promesa
                this.promises.pilonas = null;
            }
        })();
        
        return this.promises.pilonas;
    },
    
    // Cargar zonas (con control de peticiones)
    async loadZonas() {
        // Si hay una petición en curso, devolver esa promesa
        if (this.promises.zonas) {
            console.log('GlobalCache: Reutilizando petición de zonas en curso');
            return this.promises.zonas;
        }
        
        // Si el caché es válido, devolver los datos
        if (this.isCacheValid('zonas')) {
            console.log('GlobalCache: Usando caché válido de zonas');
            return this.zonas;
        }
        
        console.log('GlobalCache: Cargando zonas del servidor...');
        
        // Crear nueva promesa de carga
        this.promises.zonas = (async () => {
            try {
                const response = await fetch('/api/zonas', {
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Error ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                // Guardar en caché
                this.zonas = data;
                this.timestamps.zonas = Date.now();
                
                console.log(`GlobalCache: ${data.length} zonas cargadas y cacheadas`);
                return data;
                
            } catch (error) {
                console.error('GlobalCache: Error cargando zonas:', error);
                throw error;
            } finally {
                // Limpiar promesa
                this.promises.zonas = null;
            }
        })();
        
        return this.promises.zonas;
    },
    
    // Cargar usuarios (con control de peticiones)
    async loadUsuarios() {
        // Si hay una petición en curso, devolver esa promesa
        if (this.promises.usuarios) {
            console.log('GlobalCache: Reutilizando petición de usuarios en curso');
            return this.promises.usuarios;
        }
        
        // Si el caché es válido, devolver los datos
        if (this.isCacheValid('usuarios')) {
            console.log('GlobalCache: Usando caché válido de usuarios');
            return this.usuarios;
        }
        
        console.log('GlobalCache: Cargando usuarios del servidor...');
        
        // Crear nueva promesa de carga
        this.promises.usuarios = (async () => {
            try {
                const response = await fetch('/api/usuarios', {
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Error ${response.status}: ${response.statusText}`);
                }
                
                const data = await response.json();
                
                // Guardar en caché
                this.usuarios = data;
                this.timestamps.usuarios = Date.now();
                
                console.log(`GlobalCache: ${data.length} usuarios cargados y cacheados`);
                return data;
                
            } catch (error) {
                console.error('GlobalCache: Error cargando usuarios:', error);
                throw error;
            } finally {
                // Limpiar promesa
                this.promises.usuarios = null;
            }
        })();
        
        return this.promises.usuarios;
    },
    
    // Obtener pilonas (usa caché si es válido)
    async getPilonas() {
        if (this.isCacheValid('pilonas')) {
            console.log('GlobalCache: Devolviendo pilonas desde caché');
            return this.pilonas;
        }
        
        return this.loadPilonas();
    },
    
    // Obtener zonas (usa caché si es válido)
    async getZonas() {
        if (this.isCacheValid('zonas')) {
            console.log('GlobalCache: Devolviendo zonas desde caché');
            return this.zonas;
        }
        
        return this.loadZonas();
    },
    
    // Obtener usuarios (usa caché si es válido)
    async getUsuarios() {
        if (this.isCacheValid('usuarios')) {
            console.log('GlobalCache: Devolviendo usuarios desde caché');
            return this.usuarios;
        }
        
        return this.loadUsuarios();
    },
    
    // Verificar si el caché es válido
    isCacheValid(tipo) {
        const ahora = Date.now();
        const timestamp = this.timestamps[tipo];
        const data = this[tipo];
        
        return data && (ahora - timestamp) < this.CACHE_DURATION;
    },
    
    // Invalidar caché específico
    invalidate(tipo) {
        console.log(`GlobalCache: Invalidando caché de ${tipo}`);
        this[tipo] = null;
        this.timestamps[tipo] = 0;
        
        // Si hay una promesa en curso, esperar a que termine
        if (this.promises[tipo]) {
            this.promises[tipo] = null;
        }
    },
    
    // Invalidar todo el caché
    invalidateAll() {
        console.log('GlobalCache: Invalidando todo el caché');
        this.pilonas = null;
        this.zonas = null;
        this.usuarios = null;
        
        this.timestamps = {
            pilonas: 0,
            zonas: 0,
            usuarios: 0
        };
        
        this.promises = {
            pilonas: null,
            zonas: null,
            usuarios: null
        };
        
        this.initialized = false;
    },
    
    // Refrescar caché específico
    async refresh(tipo) {
        this.invalidate(tipo);
        
        switch(tipo) {
            case 'pilonas':
                return this.loadPilonas();
            case 'zonas':
                return this.loadZonas();
            case 'usuarios':
                return this.loadUsuarios();
            default:
                throw new Error(`Tipo de caché desconocido: ${tipo}`);
        }
    },
    
    // Refrescar todo el caché
    async refreshAll() {
        this.invalidateAll();
        return this.init();
    }
};

// Inicializar automáticamente cuando el usuario esté autenticado
document.addEventListener('DOMContentLoaded', function() {
    // Esperar un poco para asegurar que la sesión esté establecida
    setTimeout(() => {
        const usuario = JSON.parse(localStorage.getItem('sesion') || '{}');
        if (usuario && usuario.ID) {
            console.log('GlobalCache: Iniciando caché automáticamente...');
            GlobalCache.init().catch(err => {
                console.error('GlobalCache: Error en inicialización automática:', err);
            });
        }
    }, 500);
});

// Escuchar eventos de login para inicializar el caché
window.addEventListener('usuario-autenticado', function() {
    console.log('GlobalCache: Usuario autenticado, iniciando caché...');
    GlobalCache.init();
});

// Escuchar eventos de logout para limpiar el caché
window.addEventListener('usuario-desconectado', function() {
    console.log('GlobalCache: Usuario desconectado, limpiando caché...');
    GlobalCache.invalidateAll();
});

console.log('global-cache-manager.js cargado correctamente');
